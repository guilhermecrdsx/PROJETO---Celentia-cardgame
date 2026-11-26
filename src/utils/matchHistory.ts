import {
  getInMemoryPlayerState,
  syncCompletedMatchToCloud,
  syncProfileToCloud,
  type CloudPlayerStateDTO,
  type MatchCompletionRewardsDTO,
} from '../services/accountApi';
import { calculateMatchXpReward } from '../data/levelProgression';
import { calculateMatchCrystalReward } from '../data/economy';
import { getRankInfo } from './rankSystem';
import { formatHandleDisplay } from './nickname';

export interface MatchRecord {
  id: string;
  result: 'victory' | 'defeat';
  deckName: string;
  deckCode: string;
  rpChange: number;
  goldEarned?: number;
  crystalsEarned?: number;
  xpEarned?: number;
  opponentName: string;
  opponentRank: string;
  date: string;
  playedAtIso?: string;
  mode: 'pvp_normal' | 'pvp_ranked' | 'pvia';
  playerHp?: number | null;
  playerMaxHp?: number | null;
  opponentHp?: number | null;
  totalRounds?: number | null;
  endReason?: string | null;
  isPerfectVictory?: boolean;
  lossStreakBonus?: number;
}

export interface MatchRecordExtras {
  playerHp?: number | null;
  playerMaxHp?: number | null;
  opponentHp?: number | null;
  totalRounds?: number | null;
  endReason?: string | null;
}

const STORAGE_KEY = 'celentia_match_history';
const PROFILE_KEY = 'celentia_player_profile';

export interface PlayerProfileData {
  nickname: string;
  level: number;
  xp: number;
  gold: number;
  crystals: number;
  preferredSide: 'sol' | 'lua' | 'balance';
  avatarId: string;
  rankTier: string;
}

const DEFAULT_PROFILE: PlayerProfileData = {
  nickname: '@duelista',
  level: 1,
  xp: 0,
  gold: 0,
  crystals: 0,
  preferredSide: 'balance',
  avatarId: 'av_g_hugo',
  rankTier: 'Sem rank',
};

const DEFAULT_MATCHES: MatchRecord[] = [];

export function getPlayerProfile(): PlayerProfileData {
  const cloudState = getInMemoryPlayerState();
  if (cloudState) {
    const rankInfo = getRankInfo(cloudState.rankPoints, {
      playerBlockedTotal: cloudState.rankBlockedTotal,
      playerBlockedFromTier: cloudState.rankBlockFromTier,
      hasPlayedRanked: (cloudState.rankedMatchesPlayed ?? 0) > 0,
    });
    return {
      nickname: formatHandleDisplay(cloudState.nickname),
      level: cloudState.level,
      xp: cloudState.xp,
      gold: cloudState.gold,
      crystals: cloudState.crystals ?? 0,
      preferredSide: cloudState.preferredSide,
      avatarId: cloudState.avatarId || 'av_g_hugo',
      rankTier: rankInfo.label,
    };
  }

  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
      return {
        ...parsed,
        nickname: formatHandleDisplay(parsed.nickname),
      };
    }
  } catch (e) {
    console.warn('Erro ao carregar perfil:', e);
  }
  return DEFAULT_PROFILE;
}

export async function savePlayerProfileAsync(
  data: Partial<PlayerProfileData>
): Promise<PlayerProfileData> {
  const current = getPlayerProfile();
  if (
    data.nickname !== undefined ||
    data.preferredSide !== undefined ||
    data.avatarId !== undefined
  ) {
    const cloudResult = await syncProfileToCloud({
      nickname: data.nickname,
      preferredSide: data.preferredSide,
      avatarId: data.avatarId,
    });
    if (cloudResult) {
      const rankInfo = getRankInfo(cloudResult.rankPoints, {
        playerBlockedTotal: cloudResult.rankBlockedTotal,
        playerBlockedFromTier: cloudResult.rankBlockFromTier,
        hasPlayedRanked: (cloudResult.rankedMatchesPlayed ?? 0) > 0,
      });
      const synced: PlayerProfileData = {
        nickname: formatHandleDisplay(cloudResult.nickname),
        level: cloudResult.level,
        xp: cloudResult.xp,
        gold: cloudResult.gold,
        crystals: cloudResult.crystals ?? 0,
        preferredSide: cloudResult.preferredSide,
        avatarId: cloudResult.avatarId || 'av_g_hugo',
        rankTier: rankInfo.label,
      };
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(synced));
      } catch {
        // ignore
      }
      return synced;
    }
  }

  const updated = {
    ...current,
    ...data,
    ...(data.nickname ? { nickname: formatHandleDisplay(data.nickname) } : {}),
  };
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Erro ao salvar perfil:', e);
  }
  return updated;
}

export function savePlayerProfile(data: Partial<PlayerProfileData>): PlayerProfileData {
  const current = getPlayerProfile();
  const updated = {
    ...current,
    ...data,
    ...(data.nickname ? { nickname: formatHandleDisplay(data.nickname) } : {}),
  };

  if (
    data.nickname !== undefined ||
    data.preferredSide !== undefined ||
    data.avatarId !== undefined
  ) {
    void syncProfileToCloud({
      nickname: data.nickname,
      preferredSide: data.preferredSide,
      avatarId: data.avatarId,
    }).catch((err) => {
      console.warn('Erro ao sincronizar perfil na nuvem:', err);
    });
  }

  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Erro ao salvar perfil:', e);
  }
  return updated;
}

export function getMatchHistory(): MatchRecord[] {
  const cloudState = getInMemoryPlayerState();
  if (cloudState) {
    return cloudState.matches;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Erro ao carregar histórico:', e);
  }
  return DEFAULT_MATCHES;
}

export function recordMatchResult(
  result: 'victory' | 'defeat',
  deckName: string,
  _rpChangeHint: number,
  opponentName: string,
  mode: 'pvp_normal' | 'pvp_ranked' | 'pvia' = 'pvia',
  opponentRank: string = 'Sem rank',
  extras?: MatchRecordExtras
): Promise<{
  player: CloudPlayerStateDTO;
  rewards: MatchCompletionRewardsDTO;
} | null> {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();

  const cloudState = getInMemoryPlayerState();
  const currentLevel = cloudState?.level ?? 1;
  const isVictory = result === 'victory';
  const expectedXp = calculateMatchXpReward(mode, isVictory, currentLevel);
  const expectedCrystals = calculateMatchCrystalReward(mode, isVictory);
  const safeRp = mode === 'pvp_ranked' ? _rpChangeHint : 0;
  const isPerfectVictory =
    isVictory &&
    typeof extras?.playerHp === 'number' &&
    typeof extras?.playerMaxHp === 'number' &&
    extras.playerHp >= extras.playerMaxHp;

  const newRecord: MatchRecord = {
    id: `match_${Date.now()}`,
    result,
    deckName,
    deckCode: '2/303',
    rpChange: safeRp,
    goldEarned: 0,
    crystalsEarned: expectedCrystals,
    xpEarned: expectedXp,
    opponentName,
    opponentRank,
    date: `${day}/${month}/${year}`,
    playedAtIso: now.toISOString(),
    mode,
    playerHp: extras?.playerHp ?? null,
    playerMaxHp: extras?.playerMaxHp ?? null,
    opponentHp: extras?.opponentHp ?? null,
    totalRounds: extras?.totalRounds ?? null,
    endReason: extras?.endReason ?? null,
    isPerfectVictory,
    lossStreakBonus: 0,
  };

  // Trigger authoritative Cloud Save (XP & Ranked RP computed on the server)
  const syncPromise = syncCompletedMatchToCloud({
    result,
    deckName,
    opponentName,
    opponentRank,
    mode,
    playerHp: extras?.playerHp ?? null,
    playerMaxHp: extras?.playerMaxHp ?? null,
    opponentHp: extras?.opponentHp ?? null,
    totalRounds: extras?.totalRounds ?? null,
    endReason: extras?.endReason ?? null,
  });

  const current = getMatchHistory();
  const updated = [newRecord, ...current.filter((m) => m.id !== newRecord.id)].slice(0, 30);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Erro ao salvar histórico de partida:', e);
  }

  return syncPromise;
}
