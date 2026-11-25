import {
  getInMemoryPlayerState,
  syncCompletedMatchToCloud,
  syncProfileToCloud,
} from '../services/accountApi';
import { getRankInfo } from './rankSystem';
import { formatHandleDisplay } from './nickname';

export interface MatchRecord {
  id: string;
  result: 'victory' | 'defeat';
  deckName: string;
  deckCode: string;
  rpChange: number;
  goldEarned?: number;
  xpEarned?: number;
  opponentName: string;
  opponentRank: string;
  date: string;
  mode: 'pvp_normal' | 'pvp_ranked' | 'pvia';
}

const STORAGE_KEY = 'celentia_match_history';
const PROFILE_KEY = 'celentia_player_profile';

export interface PlayerProfileData {
  nickname: string;
  level: number;
  xp: number;
  gold: number;
  preferredSide: 'sol' | 'lua' | 'balance';
  avatarId: string;
  rankTier: string;
}

const DEFAULT_PROFILE: PlayerProfileData = {
  nickname: '@duelista',
  level: 1,
  xp: 0,
  gold: 1000,
  preferredSide: 'balance',
  avatarId: 'av_g_hugo',
  rankTier: 'Bronze III',
};

const DEFAULT_MATCHES: MatchRecord[] = [];

export function getPlayerProfile(): PlayerProfileData {
  const cloudState = getInMemoryPlayerState();
  if (cloudState) {
    const rankInfo = getRankInfo(cloudState.rankPoints, {
      playerBlockedTotal: cloudState.rankBlockedTotal,
      playerBlockedFromTier: cloudState.rankBlockFromTier,
    });
    return {
      nickname: formatHandleDisplay(cloudState.nickname),
      level: cloudState.level,
      xp: cloudState.xp,
      gold: cloudState.gold,
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
      });
      const synced: PlayerProfileData = {
        nickname: formatHandleDisplay(cloudResult.nickname),
        level: cloudResult.level,
        xp: cloudResult.xp,
        gold: cloudResult.gold,
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
  rpChange: number,
  opponentName: string,
  mode: 'pvp_normal' | 'pvp_ranked' | 'pvia' = 'pvp_ranked',
  opponentRank: string = 'Bronze III'
): MatchRecord[] {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();

  const newRecord: MatchRecord = {
    id: `match_${Date.now()}`,
    result,
    deckName,
    deckCode: '2/303',
    rpChange,
    goldEarned: result === 'victory' ? 150 : 50,
    xpEarned: result === 'victory' ? 120 : 40,
    opponentName,
    opponentRank,
    date: `${day}/${month}/${year}`,
    mode,
  };

  // Trigger Cloud Save (Save State at End of Match)
  void syncCompletedMatchToCloud({
    result,
    deckName,
    rpChange,
    opponentName,
    opponentRank,
    mode,
  });

  const current = getMatchHistory();
  const updated = [newRecord, ...current.filter((m) => m.id !== newRecord.id)].slice(0, 30);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Erro ao salvar histórico de partida:', e);
  }

  return updated;
}
