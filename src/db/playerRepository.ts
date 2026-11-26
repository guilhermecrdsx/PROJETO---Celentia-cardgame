import { and, desc, eq, ilike, ne, or, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from './index.ts';
import { matchHistory, playerDecks, users } from './schema.ts';
import { PRESET_FIRE_LIGHTNING } from '../logic/deckFactory.ts';
import { CARD_TEMPLATES } from '../data/cards.ts';
import {
  CARD_AVATARS,
  DEFAULT_AVATAR_ID,
  FREE_AVATAR_IDS,
} from '../data/avatars.ts';
import {
  DUPLICATE_CARD_CRYSTAL_REFUND,
  PACK_MAP,
  type PackType,
  rollWeightedLuckyTier,
} from '../data/packs.ts';
import {
  ALL_CARD_BACK_IDS,
  ALL_PLAYMAT_IDS,
  DEFAULT_CARD_BACK_ID,
  DEFAULT_PLAYMAT_ID,
  FREE_CARD_BACK_IDS,
  FREE_PLAYMAT_IDS,
  TIER_GOLD_COSTS,
  calculateMatchCrystalReward,
  getCardBackPrice,
  getCardCrystalCostByTier,
  getCardGoldCostByTier,
  getPlaymatPrice,
  isValidCardBackId,
  isValidPlaymatId,
  type CardBackId,
  type CurrencyType,
  type PlaymatId,
} from '../data/economy.ts';
import {
  MAX_ACCOUNT_LEVEL,
  applyAccountXpProgress,
  calculateMatchXpReward,
  getXpRequiredForNextLevel,
  normalizeClaimedMilestones,
  type LevelMilestoneReward,
} from '../data/levelProgression.ts';
import {
  CELESTIAL_MIN_POINTS,
  calculateRankedRpDelta,
  normalizeRankTierInput,
  type RankTier,
} from '../utils/rankMath.ts';
import {
  buildBaseHandleFromRaw,
  formatHandleDisplay,
  validateHandle,
} from '../utils/nickname.ts';

export const NON_PURCHASABLE_ELEMENTS = new Set([
  'Divino',
  'Cósmico',
  'Sombrio',
  'Mágico',
]);

export function isEventOrAdminExclusiveCard(template: { element?: string }): boolean {
  return Boolean(template.element && NON_PURCHASABLE_ELEMENTS.has(template.element));
}

export interface CloudDeckSlotDTO {
  slotId: number;
  name: string;
  cardIds: string[];
  isActive: boolean;
  updatedAt: number;
}

export interface CloudMatchRecordDTO {
  id: string;
  result: 'victory' | 'defeat';
  deckName: string;
  deckCode: string;
  rpChange: number;
  goldEarned: number;
  crystalsEarned: number;
  xpEarned: number;
  opponentName: string;
  opponentRank: string;
  date: string;
  playedAtIso: string;
  mode: 'pvp_normal' | 'pvp_ranked' | 'pvia';
  playerHp: number | null;
  playerMaxHp: number | null;
  opponentHp: number | null;
  totalRounds: number | null;
  endReason: string | null;
  isPerfectVictory: boolean;
  lossStreakBonus: number;
}

export interface CloudPlayerStateDTO {
  uid: string;
  email: string;
  nickname: string;
  isAdmin: boolean;
  level: number;
  xp: number;
  xpForNextLevel: number;
  gold: number;
  crystals: number;
  rankPoints: number;
  rankedMatchesPlayed: number;
  rankedLossStreak: number;
  lastRankedWinRp: number;
  preferredSide: 'sol' | 'lua' | 'balance';
  avatarId: string;
  unlockedAvatarIds: string[];
  equippedPlaymat: PlaymatId;
  unlockedPlaymats: PlaymatId[];
  equippedCardBack: CardBackId;
  unlockedCardBacks: CardBackId[];
  pendingCommonPacks: number;
  claimedLevelMilestones: number[];
  rankBlockedTotal: boolean;
  rankBlockFromTier: RankTier | null;
  unlockedCardIds: string[];
  wins: number;
  losses: number;
  draws: number;
  tutorialRewardClaimed: boolean;
  decks: CloudDeckSlotDTO[];
  activeSlotId: number;
  matches: CloudMatchRecordDTO[];
}

export function isUserAdminAccount(email?: string, nickname?: string): boolean {
  const e = (email || '').trim().toLowerCase();
  const n = (nickname || '').trim().replace(/^@+/, '').toUpperCase();
  return (
    e === 'admin@celentia.com' ||
    e === 'guilhermecrds84@gmail.com' ||
    n === 'ADMIN'
  );
}

export interface PublicPlayerSummaryDTO {
  uid: string;
  nickname: string;
  level: number;
  rankPoints: number;
  rankedMatchesPlayed: number;
  preferredSide: 'sol' | 'lua' | 'balance';
  avatarId: string;
  rankBlockedTotal: boolean;
  rankBlockFromTier: RankTier | null;
  wins: number;
  losses: number;
  draws: number;
  unlockedCount: number;
  totalCollectible: number;
  isAdmin: boolean;
}

export interface LeaderboardEntryDTO extends PublicPlayerSummaryDTO {
  position: number;
}

export interface PublicPlayerProfileDTO extends PublicPlayerSummaryDTO {
  xp: number;
  xpForNextLevel: number;
  recentMatches: CloudMatchRecordDTO[];
}

export interface AdminUserSummaryDTO extends PublicPlayerSummaryDTO {
  email: string;
  xp: number;
  gold: number;
  crystals: number;
  unlockedCardIds: string[];
  unlockedAvatarIds: string[];
  unlockedPlaymats: PlaymatId[];
  unlockedCardBacks: CardBackId[];
  pendingCommonPacks: number;
  claimedLevelMilestones: number[];
  createdAt: string;
}

export interface PackDropItemDTO {
  cardId: string;
  tier: 1 | 2 | 3 | 4 | 5;
  isDuplicate: boolean;
  refundCrystals: number;
}

function resolveMergedAvatars(rawUnlocked: unknown): string[] {
  const validSet = new Set(CARD_AVATARS.map((a) => a.id));
  const extra = Array.isArray(rawUnlocked)
    ? rawUnlocked.filter((id): id is string => typeof id === 'string' && validSet.has(id))
    : [];
  return Array.from(new Set([...FREE_AVATAR_IDS, ...extra]));
}

function resolveValidAvatarId(rawAvatarId: unknown, mergedAvatars: string[]): string {
  if (typeof rawAvatarId === 'string' && mergedAvatars.includes(rawAvatarId)) {
    return rawAvatarId;
  }
  return DEFAULT_AVATAR_ID;
}

function resolveMergedPlaymats(rawUnlocked: unknown): PlaymatId[] {
  const extra = Array.isArray(rawUnlocked)
    ? rawUnlocked.filter((id): id is PlaymatId => isValidPlaymatId(id))
    : [];
  return Array.from(new Set([...FREE_PLAYMAT_IDS, ...extra]));
}

function resolveValidPlaymat(rawPlaymat: unknown, mergedPlaymats: PlaymatId[]): PlaymatId {
  if (isValidPlaymatId(rawPlaymat) && mergedPlaymats.includes(rawPlaymat)) {
    return rawPlaymat;
  }
  return DEFAULT_PLAYMAT_ID;
}

function resolveMergedCardBacks(rawUnlocked: unknown): CardBackId[] {
  const extra = Array.isArray(rawUnlocked)
    ? rawUnlocked.filter((id): id is CardBackId => isValidCardBackId(id))
    : [];
  return Array.from(new Set([...FREE_CARD_BACK_IDS, ...extra]));
}

function resolveValidCardBack(rawCardBack: unknown, mergedCardBacks: CardBackId[]): CardBackId {
  if (isValidCardBackId(rawCardBack) && mergedCardBacks.includes(rawCardBack)) {
    return rawCardBack;
  }
  return DEFAULT_CARD_BACK_ID;
}

export async function isHandleTaken(
  normalizedHandle: string,
  excludeUserId?: number
): Promise<boolean> {
  const lower = normalizedHandle.toLowerCase();
  const condition =
    excludeUserId !== undefined
      ? and(sql`lower(${users.nickname}) = ${lower}`, ne(users.id, excludeUserId))
      : sql`lower(${users.nickname}) = ${lower}`;

  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(condition)
    .limit(1);

  return rows.length > 0;
}

export async function generateUniqueHandle(
  rawBase: string,
  excludeUserId?: number
): Promise<string> {
  const base = buildBaseHandleFromRaw(rawBase);
  if (!(await isHandleTaken(base, excludeUserId))) {
    return base;
  }

  const body = base.slice(1);
  for (let i = 2; i <= 99; i++) {
    const suffix = String(i);
    const candidate = `@${body.slice(0, 17 - suffix.length)}${suffix}`;
    if (!(await isHandleTaken(candidate, excludeUserId))) {
      return candidate;
    }
  }

  const rand = crypto.randomBytes(2).toString('hex');
  return `@${body.slice(0, 13)}${rand}`;
}

export async function migrateExistingNicknamesToHandles(): Promise<void> {
  try {
    const allUsers = await db.select().from(users).orderBy(users.id);
    const usedLower = new Set<string>();

    for (const row of allUsers) {
      const check = validateHandle(row.nickname);
      let candidate = check.valid
        ? check.normalized
        : buildBaseHandleFromRaw(row.nickname || row.email.split('@')[0] || 'duelista');

      if (usedLower.has(candidate.toLowerCase())) {
        const body = candidate.slice(1);
        let counter = 2;
        while (usedLower.has(candidate.toLowerCase())) {
          const suffix = String(counter++);
          candidate = `@${body.slice(0, 17 - suffix.length)}${suffix}`;
        }
      }

      usedLower.add(candidate.toLowerCase());

      if (candidate !== row.nickname) {
        await db
          .update(users)
          .set({ nickname: candidate, updatedAt: new Date() })
          .where(eq(users.id, row.id));
      }
    }
  } catch (error) {
    console.error('Failed to migrate nicknames to @handles:', error);
  }
}

export const TIER_UNLOCK_COSTS: Record<number, number> = TIER_GOLD_COSTS;

export function getStarterUnlockedCardIds(): string[] {
  return Array.from(new Set(PRESET_FIRE_LIGHTNING.cardIds));
}

export function getCollectibleCardTemplates() {
  return CARD_TEMPLATES.filter(
    (c) =>
      !c.isSpecialSummon &&
      !c.isToken &&
      !c.isSecret &&
      !c.id.startsWith('token_') &&
      c.id !== 'm_tor' &&
      c.id !== 'm_men' &&
      c.id !== 'm_tador' &&
      c.id !== 'g_rochedo' &&
      c.id !== 'token_fagulha_estelar' &&
      c.id !== 'token_flecha_eletrica' &&
      c.id !== 'dummy_target'
  );
}

const INITIAL_DECK_SLOTS = [
  {
    slotId: 1,
    name: 'Espaço Vazio 1',
    cardIds: [] as string[],
    isActive: false,
  },
  {
    slotId: 2,
    name: 'Espaço Vazio 2',
    cardIds: [] as string[],
    isActive: false,
  },
  {
    slotId: 3,
    name: 'Espaço Vazio 3',
    cardIds: [] as string[],
    isActive: false,
  },
];

function formatDatePtBr(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function toCloudMatchRecordDTO(m: typeof matchHistory.$inferSelect): CloudMatchRecordDTO {
  const playedDate = new Date(m.playedAt);
  return {
    id: `match_${m.id}`,
    result: m.result === 'victory' ? 'victory' : 'defeat',
    deckName: m.deckName,
    deckCode: m.deckCode || '2/303',
    rpChange: m.rpChange,
    goldEarned: m.goldEarned,
    crystalsEarned: Math.max(0, m.crystalsEarned ?? 0),
    xpEarned: m.xpEarned,
    opponentName: m.opponentName,
    opponentRank: m.opponentRank,
    date: formatDatePtBr(playedDate),
    playedAtIso: playedDate.toISOString(),
    mode:
      m.mode === 'pvp_normal' || m.mode === 'pvp_ranked' || m.mode === 'pvia'
        ? m.mode
        : m.mode === 'pvp_local'
        ? 'pvp_normal'
        : 'pvp_ranked',
    playerHp: typeof m.playerHp === 'number' ? m.playerHp : null,
    playerMaxHp: typeof m.playerMaxHp === 'number' ? m.playerMaxHp : null,
    opponentHp: typeof m.opponentHp === 'number' ? m.opponentHp : null,
    totalRounds: typeof m.totalRounds === 'number' ? m.totalRounds : null,
    endReason: typeof m.endReason === 'string' && m.endReason.trim() ? m.endReason : null,
    isPerfectVictory: Boolean(m.isPerfectVictory),
    lossStreakBonus: Math.max(0, m.lossStreakBonus ?? 0),
  };
}

async function findUserByUidOrEmail(uid: string, email?: string) {
  const cleanEmail = email?.trim().toLowerCase();
  const rows = await db
    .select()
    .from(users)
    .where(cleanEmail ? or(eq(users.uid, uid), eq(users.email, cleanEmail)) : eq(users.uid, uid))
    .limit(1);
  return rows[0] || null;
}

async function ensureDefaultDecksForUser(userId: number) {
  try {
    const existing = await db
      .select()
      .from(playerDecks)
      .where(eq(playerDecks.userId, userId));

    if (existing.length === 0) {
      for (const slot of INITIAL_DECK_SLOTS) {
        await db
          .insert(playerDecks)
          .values({
            userId,
            slotId: slot.slotId,
            name: slot.name,
            cardIds: slot.cardIds,
            isActive: slot.isActive,
          })
          .onConflictDoNothing();
      }
      return await db
        .select()
        .from(playerDecks)
        .where(eq(playerDecks.userId, userId));
    }
    return existing;
  } catch (error) {
    console.error('Database query failed in ensureDefaultDecksForUser:', error);
    throw new Error('Falha ao inicializar os baralhos da conta.', { cause: error });
  }
}

export async function buildPlayerStateDTO(
  userRow: typeof users.$inferSelect
): Promise<CloudPlayerStateDTO> {
  try {
    const deckRows = await ensureDefaultDecksForUser(userRow.id);
    const matchRows = await db
      .select()
      .from(matchHistory)
      .where(eq(matchHistory.userId, userRow.id))
      .orderBy(desc(matchHistory.playedAt))
      .limit(30);

    const starterIds = getStarterUnlockedCardIds();
    const currentUnlocked = Array.isArray(userRow.unlockedCardIds) ? userRow.unlockedCardIds : [];
    const mergedUnlocked = Array.from(new Set([...starterIds, ...currentUnlocked]));

    const mergedAvatars = resolveMergedAvatars(userRow.unlockedAvatarIds);
    const validAvatarId = resolveValidAvatarId(userRow.avatarId, mergedAvatars);
    const mergedPlaymats = resolveMergedPlaymats(userRow.unlockedPlaymats);
    const validPlaymat = resolveValidPlaymat(userRow.equippedPlaymat, mergedPlaymats);
    const mergedCardBacks = resolveMergedCardBacks(userRow.unlockedCardBacks);
    const validCardBack = resolveValidCardBack(userRow.equippedCardBack, mergedCardBacks);
    const clampedLevel = Math.max(1, Math.min(MAX_ACCOUNT_LEVEL, userRow.level || 1));
    const xpNeeded = getXpRequiredForNextLevel(clampedLevel);
    const clampedXp =
      clampedLevel >= MAX_ACCOUNT_LEVEL
        ? 0
        : Math.max(0, Math.min(xpNeeded - 1, userRow.xp || 0));

    if (
      mergedUnlocked.length !== currentUnlocked.length ||
      validAvatarId !== userRow.avatarId ||
      validPlaymat !== userRow.equippedPlaymat ||
      validCardBack !== userRow.equippedCardBack ||
      clampedLevel !== userRow.level ||
      clampedXp !== userRow.xp
    ) {
      await db
        .update(users)
        .set({
          unlockedCardIds: mergedUnlocked,
          avatarId: validAvatarId,
          equippedPlaymat: validPlaymat,
          unlockedPlaymats: mergedPlaymats,
          equippedCardBack: validCardBack,
          unlockedCardBacks: mergedCardBacks,
          level: clampedLevel,
          xp: clampedXp,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userRow.id));
    }

    const sortedDecks: CloudDeckSlotDTO[] = [1, 2, 3].map((slotNum) => {
      const found = deckRows.find((d) => d.slotId === slotNum);
      const fallback = INITIAL_DECK_SLOTS[slotNum - 1];
      const validCards =
        Array.isArray(found?.cardIds) && found.cardIds.length === 20 ? found.cardIds : [];
      return {
        slotId: slotNum,
        name: validCards.length === 20 && found?.name ? found.name : fallback.name,
        cardIds: validCards,
        isActive: validCards.length === 20 && Boolean(found?.isActive),
        updatedAt:
          validCards.length === 20 && found?.updatedAt
            ? new Date(found.updatedAt).getTime()
            : 0,
      };
    });

    const activeSlot =
      sortedDecks.find((d) => d.isActive && d.cardIds.length === 20)?.slotId || 0;

    const formattedMatches: CloudMatchRecordDTO[] = matchRows.map(toCloudMatchRecordDTO);

    const side =
      userRow.preferredSide === 'sol' || userRow.preferredSide === 'lua'
        ? userRow.preferredSide
        : 'balance';

    const adminFlag = isUserAdminAccount(userRow.email, userRow.nickname);

    return {
      uid: userRow.uid,
      email: userRow.email,
      nickname: formatHandleDisplay(userRow.nickname),
      isAdmin: adminFlag,
      level: clampedLevel,
      xp: clampedXp,
      xpForNextLevel: xpNeeded,
      gold: Math.max(0, userRow.gold ?? 0),
      crystals: Math.max(0, userRow.crystals ?? 0),
      rankPoints: userRow.rankPoints,
      rankedMatchesPlayed: Math.max(0, userRow.rankedMatchesPlayed ?? 0),
      rankedLossStreak: Math.max(0, userRow.rankedLossStreak ?? 0),
      lastRankedWinRp: Math.max(0, userRow.lastRankedWinRp ?? 0),
      preferredSide: side,
      avatarId: validAvatarId,
      unlockedAvatarIds: mergedAvatars,
      equippedPlaymat: validPlaymat,
      unlockedPlaymats: mergedPlaymats,
      equippedCardBack: validCardBack,
      unlockedCardBacks: mergedCardBacks,
      pendingCommonPacks: Math.max(0, userRow.pendingCommonPacks ?? 0),
      claimedLevelMilestones: normalizeClaimedMilestones(userRow.claimedLevelMilestones),
      rankBlockedTotal: Boolean(userRow.rankBlockedTotal),
      rankBlockFromTier: normalizeRankTierInput(userRow.rankBlockFromTier),
      unlockedCardIds: mergedUnlocked,
      wins: userRow.wins,
      losses: userRow.losses,
      draws: userRow.draws,
      tutorialRewardClaimed: Boolean(userRow.tutorialRewardClaimed),
      decks: sortedDecks,
      activeSlotId: activeSlot,
      matches: formattedMatches,
    };
  } catch (error) {
    console.error('Database query failed in buildPlayerStateDTO:', error);
    throw new Error('Não foi possível carregar os dados de progresso do jogador.', { cause: error });
  }
}

export async function getOrCreateGoogleUser(
  uid: string,
  email: string,
  displayName?: string
): Promise<CloudPlayerStateDTO> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const starterCards = getStarterUnlockedCardIds();

    const existingByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (existingByEmail.length > 0) {
      return await buildPlayerStateDTO(existingByEmail[0]);
    }

    const uniqueHandle = await generateUniqueHandle(
      displayName || cleanEmail.split('@')[0] || 'duelista'
    );
    const isAdminEmail = isUserAdminAccount(cleanEmail, uniqueHandle);
    const initialCards = isAdminEmail
      ? getCollectibleCardTemplates().map((c) => c.id)
      : starterCards;
    const initialAvatars = isAdminEmail
      ? CARD_AVATARS.map((a) => a.id)
      : FREE_AVATAR_IDS;
    const initialPlaymats: PlaymatId[] = isAdminEmail
      ? [...ALL_PLAYMAT_IDS]
      : [...FREE_PLAYMAT_IDS];
    const initialCardBacks: CardBackId[] = isAdminEmail
      ? [...ALL_CARD_BACK_IDS]
      : [...FREE_CARD_BACK_IDS];

    const result = await db
      .insert(users)
      .values({
        uid,
        email: cleanEmail,
        nickname: uniqueHandle,
        level: isAdminEmail ? MAX_ACCOUNT_LEVEL : 1,
        xp: 0,
        gold: isAdminEmail ? 99999 : 0,
        crystals: isAdminEmail ? 99999 : 0,
        rankPoints: isAdminEmail ? CELESTIAL_MIN_POINTS : 0,
        rankedMatchesPlayed: isAdminEmail ? 1 : 0,
        preferredSide: 'balance',
        avatarId: DEFAULT_AVATAR_ID,
        unlockedAvatarIds: initialAvatars,
        equippedPlaymat: DEFAULT_PLAYMAT_ID,
        unlockedPlaymats: initialPlaymats,
        equippedCardBack: DEFAULT_CARD_BACK_ID,
        unlockedCardBacks: initialCardBacks,
        pendingCommonPacks: 0,
        claimedLevelMilestones: isAdminEmail ? [10, 20, 30, 40, 50] : [],
        rankBlockedTotal: false,
        rankBlockFromTier: null,
        unlockedCardIds: initialCards,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: cleanEmail,
          updatedAt: new Date(),
        },
      })
      .returning();

    return await buildPlayerStateDTO(result[0]);
  } catch (error) {
    console.error('Database query failed in getOrCreateGoogleUser:', error);
    throw new Error('Falha ao sincronizar conta Google com o banco de dados.', { cause: error });
  }
}

export async function registerUserWithPassword(
  email: string,
  nickname: string,
  passwordHash: string
): Promise<CloudPlayerStateDTO> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const nickCheck = validateHandle(nickname);
    if (!nickCheck.valid) {
      throw new Error(`INVALID_NICKNAME:${nickCheck.error || 'Nick inválido.'}`);
    }
    const cleanNick = nickCheck.normalized;

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (existing.length > 0) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    if (await isHandleTaken(cleanNick)) {
      throw new Error('NICKNAME_ALREADY_EXISTS');
    }

    const uid = `local_${crypto.randomUUID()}`;
    const starterCards = getStarterUnlockedCardIds();

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email: cleanEmail,
        nickname: cleanNick,
        passwordHash,
        level: 1,
        xp: 0,
        gold: 0,
        crystals: 0,
        rankPoints: 0,
        rankedMatchesPlayed: 0,
        preferredSide: 'balance',
        avatarId: DEFAULT_AVATAR_ID,
        unlockedAvatarIds: FREE_AVATAR_IDS,
        equippedPlaymat: DEFAULT_PLAYMAT_ID,
        unlockedPlaymats: [...FREE_PLAYMAT_IDS],
        equippedCardBack: DEFAULT_CARD_BACK_ID,
        unlockedCardBacks: [...FREE_CARD_BACK_IDS],
        pendingCommonPacks: 0,
        claimedLevelMilestones: [],
        rankBlockedTotal: false,
        rankBlockFromTier: null,
        unlockedCardIds: starterCards,
      })
      .returning();

    return await buildPlayerStateDTO(inserted[0]);
  } catch (error: any) {
    if (
      error?.message === 'EMAIL_ALREADY_EXISTS' ||
      error?.message === 'NICKNAME_ALREADY_EXISTS' ||
      (typeof error?.message === 'string' && error.message.startsWith('INVALID_NICKNAME:'))
    ) {
      throw error;
    }
    console.error('Database query failed in registerUserWithPassword:', error);
    throw new Error('Erro ao registrar nova conta no servidor.', { cause: error });
  }
}

export async function findUserForLogin(identifier: string) {
  try {
    const clean = identifier.trim();
    const cleanLower = clean.toLowerCase();
    const withAtLower = cleanLower.startsWith('@') ? cleanLower : `@${cleanLower}`;
    const rows = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.email, cleanLower),
          sql`lower(${users.nickname}) = ${cleanLower}`,
          sql`lower(${users.nickname}) = ${withAtLower}`
        )
      )
      .limit(1);
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in findUserForLogin:', error);
    throw new Error('Erro ao consultar credenciais do jogador.', { cause: error });
  }
}

export async function getPlayerStateByUidOrEmail(
  uid: string,
  email?: string,
  nickname?: string
): Promise<CloudPlayerStateDTO> {
  try {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);

    if (rows.length > 0) {
      return await buildPlayerStateDTO(rows[0]);
    }

    if (email) {
      return await getOrCreateGoogleUser(uid, email, nickname);
    }

    throw new Error('USER_NOT_FOUND');
  } catch (error) {
    console.error('Database query failed in getPlayerStateByUidOrEmail:', error);
    throw new Error('Não foi possível localizar o perfil do jogador.', { cause: error });
  }
}

export async function updatePlayerProfileByUid(
  uid: string,
  updates: {
    nickname?: string;
    preferredSide?: 'sol' | 'lua' | 'balance';
    avatarId?: string;
    equippedPlaymat?: string;
    equippedCardBack?: string;
  },
  email?: string
): Promise<CloudPlayerStateDTO> {
  try {
    const current = await findUserByUidOrEmail(uid, email);
    if (!current) {
      throw new Error('Conta não localizada.');
    }

    let nextNick = formatHandleDisplay(current.nickname);
    if (updates.nickname !== undefined) {
      const nickCheck = validateHandle(updates.nickname);
      if (!nickCheck.valid) {
        throw new Error(`INVALID_NICKNAME:${nickCheck.error || 'Nick inválido.'}`);
      }
      if (await isHandleTaken(nickCheck.normalized, current.id)) {
        throw new Error('NICKNAME_ALREADY_EXISTS');
      }
      nextNick = nickCheck.normalized;
    }

    const nextSide =
      updates.preferredSide === 'sol' ||
      updates.preferredSide === 'lua' ||
      updates.preferredSide === 'balance'
        ? updates.preferredSide
        : current.preferredSide;

    const mergedAvatars = resolveMergedAvatars(current.unlockedAvatarIds);
    let nextAvatarId = resolveValidAvatarId(current.avatarId, mergedAvatars);
    if (updates.avatarId !== undefined) {
      const existsInCatalog = CARD_AVATARS.some((a) => a.id === updates.avatarId);
      if (!existsInCatalog) {
        throw new Error('AVATAR_NOT_FOUND');
      }
      if (!mergedAvatars.includes(updates.avatarId)) {
        throw new Error('AVATAR_LOCKED');
      }
      nextAvatarId = updates.avatarId;
    }

    const mergedPlaymats = resolveMergedPlaymats(current.unlockedPlaymats);
    let nextPlaymat = resolveValidPlaymat(current.equippedPlaymat, mergedPlaymats);
    if (updates.equippedPlaymat !== undefined) {
      if (!isValidPlaymatId(updates.equippedPlaymat)) {
        throw new Error('PLAYMAT_NOT_FOUND');
      }
      if (!mergedPlaymats.includes(updates.equippedPlaymat)) {
        throw new Error('PLAYMAT_LOCKED');
      }
      nextPlaymat = updates.equippedPlaymat;
    }

    const mergedCardBacks = resolveMergedCardBacks(current.unlockedCardBacks);
    let nextCardBack = resolveValidCardBack(current.equippedCardBack, mergedCardBacks);
    if (updates.equippedCardBack !== undefined) {
      if (!isValidCardBackId(updates.equippedCardBack)) {
        throw new Error('CARD_BACK_NOT_FOUND');
      }
      if (!mergedCardBacks.includes(updates.equippedCardBack)) {
        throw new Error('CARD_BACK_LOCKED');
      }
      nextCardBack = updates.equippedCardBack;
    }

    const updated = await db
      .update(users)
      .set({
        nickname: nextNick,
        preferredSide: nextSide,
        avatarId: nextAvatarId,
        equippedPlaymat: nextPlaymat,
        equippedCardBack: nextCardBack,
        updatedAt: new Date(),
      })
      .where(eq(users.id, current.id))
      .returning();

    return await buildPlayerStateDTO(updated[0]);
  } catch (error: any) {
    if (
      error?.message === 'NICKNAME_ALREADY_EXISTS' ||
      error?.message === 'AVATAR_NOT_FOUND' ||
      error?.message === 'AVATAR_LOCKED' ||
      error?.message === 'PLAYMAT_NOT_FOUND' ||
      error?.message === 'PLAYMAT_LOCKED' ||
      error?.message === 'CARD_BACK_NOT_FOUND' ||
      error?.message === 'CARD_BACK_LOCKED' ||
      (typeof error?.message === 'string' && error.message.startsWith('INVALID_NICKNAME:'))
    ) {
      throw error;
    }
    console.error('Database query failed in updatePlayerProfileByUid:', error);
    throw new Error('Erro ao salvar alterações do perfil.', { cause: error });
  }
}

export async function unlockAvatarByUid(
  uid: string,
  avatarId: string,
  currency: CurrencyType = 'crystals',
  email?: string,
  equipAfterUnlock = true
): Promise<{
  state: CloudPlayerStateDTO;
  unlockedAvatarId: string;
  costPaid: number;
  currency: CurrencyType;
}> {
  try {
    const userRow = await findUserByUidOrEmail(uid, email);
    if (!userRow) {
      throw new Error('Conta não localizada.');
    }

    const avatar = CARD_AVATARS.find((a) => a.id === avatarId);
    if (!avatar) {
      throw new Error('AVATAR_NOT_FOUND');
    }

    const normalizedCurrency: CurrencyType = currency === 'gold' ? 'gold' : 'crystals';
    const mergedAvatars = new Set(resolveMergedAvatars(userRow.unlockedAvatarIds));
    if (mergedAvatars.has(avatarId)) {
      if (equipAfterUnlock && userRow.avatarId !== avatarId) {
        const equippedRows = await db
          .update(users)
          .set({ avatarId, updatedAt: new Date() })
          .where(eq(users.id, userRow.id))
          .returning();
        return {
          state: await buildPlayerStateDTO(equippedRows[0]),
          unlockedAvatarId: avatarId,
          costPaid: 0,
          currency: normalizedCurrency,
        };
      }
      return {
        state: await buildPlayerStateDTO(userRow),
        unlockedAvatarId: avatarId,
        costPaid: 0,
        currency: normalizedCurrency,
      };
    }

    const cost = normalizedCurrency === 'gold' ? avatar.cost : avatar.crystalCost;
    const currentBalance = normalizedCurrency === 'gold' ? userRow.gold : userRow.crystals;
    if (currentBalance < cost) {
      throw new Error(normalizedCurrency === 'gold' ? 'INSUFFICIENT_GOLD' : 'INSUFFICIENT_CRYSTALS');
    }

    mergedAvatars.add(avatarId);
    const updated = await db
      .update(users)
      .set({
        ...(normalizedCurrency === 'gold'
          ? { gold: userRow.gold - cost }
          : { crystals: userRow.crystals - cost }),
        unlockedAvatarIds: Array.from(mergedAvatars),
        ...(equipAfterUnlock ? { avatarId } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userRow.id))
      .returning();

    return {
      state: await buildPlayerStateDTO(updated[0]),
      unlockedAvatarId: avatarId,
      costPaid: cost,
      currency: normalizedCurrency,
    };
  } catch (error: any) {
    if (
      error?.message === 'AVATAR_NOT_FOUND' ||
      error?.message === 'INSUFFICIENT_GOLD' ||
      error?.message === 'INSUFFICIENT_CRYSTALS'
    ) {
      throw error;
    }
    console.error('Database query failed in unlockAvatarByUid:', error);
    throw new Error('Não foi possível desbloquear este avatar.', { cause: error });
  }
}

export async function unlockPlaymatByUid(
  uid: string,
  playmatId: string,
  currency: CurrencyType = 'crystals',
  email?: string,
  equipAfterUnlock = true
): Promise<{
  state: CloudPlayerStateDTO;
  unlockedPlaymatId: PlaymatId;
  costPaid: number;
  currency: CurrencyType;
}> {
  try {
    const userRow = await findUserByUidOrEmail(uid, email);
    if (!userRow) {
      throw new Error('Conta não localizada.');
    }
    if (!isValidPlaymatId(playmatId)) {
      throw new Error('PLAYMAT_NOT_FOUND');
    }

    const normalizedCurrency: CurrencyType = currency === 'gold' ? 'gold' : 'crystals';
    const mergedPlaymats = new Set(resolveMergedPlaymats(userRow.unlockedPlaymats));
    if (mergedPlaymats.has(playmatId)) {
      if (equipAfterUnlock && userRow.equippedPlaymat !== playmatId) {
        const equippedRows = await db
          .update(users)
          .set({ equippedPlaymat: playmatId, updatedAt: new Date() })
          .where(eq(users.id, userRow.id))
          .returning();
        return {
          state: await buildPlayerStateDTO(equippedRows[0]),
          unlockedPlaymatId: playmatId,
          costPaid: 0,
          currency: normalizedCurrency,
        };
      }
      return {
        state: await buildPlayerStateDTO(userRow),
        unlockedPlaymatId: playmatId,
        costPaid: 0,
        currency: normalizedCurrency,
      };
    }

    const price = getPlaymatPrice(playmatId);
    const cost = normalizedCurrency === 'gold' ? price.goldCost : price.crystalCost;
    const currentBalance = normalizedCurrency === 'gold' ? userRow.gold : userRow.crystals;
    if (currentBalance < cost) {
      throw new Error(normalizedCurrency === 'gold' ? 'INSUFFICIENT_GOLD' : 'INSUFFICIENT_CRYSTALS');
    }

    mergedPlaymats.add(playmatId);
    const updated = await db
      .update(users)
      .set({
        ...(normalizedCurrency === 'gold'
          ? { gold: userRow.gold - cost }
          : { crystals: userRow.crystals - cost }),
        unlockedPlaymats: Array.from(mergedPlaymats),
        ...(equipAfterUnlock ? { equippedPlaymat: playmatId } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userRow.id))
      .returning();

    return {
      state: await buildPlayerStateDTO(updated[0]),
      unlockedPlaymatId: playmatId,
      costPaid: cost,
      currency: normalizedCurrency,
    };
  } catch (error: any) {
    if (
      error?.message === 'PLAYMAT_NOT_FOUND' ||
      error?.message === 'INSUFFICIENT_GOLD' ||
      error?.message === 'INSUFFICIENT_CRYSTALS'
    ) {
      throw error;
    }
    console.error('Database query failed in unlockPlaymatByUid:', error);
    throw new Error('Não foi possível desbloquear este tapete.', { cause: error });
  }
}

export async function unlockCardBackByUid(
  uid: string,
  cardBackId: string,
  currency: CurrencyType = 'crystals',
  email?: string,
  equipAfterUnlock = true
): Promise<{
  state: CloudPlayerStateDTO;
  unlockedCardBackId: CardBackId;
  costPaid: number;
  currency: CurrencyType;
}> {
  try {
    const userRow = await findUserByUidOrEmail(uid, email);
    if (!userRow) {
      throw new Error('Conta não localizada.');
    }
    if (!isValidCardBackId(cardBackId)) {
      throw new Error('CARD_BACK_NOT_FOUND');
    }

    const normalizedCurrency: CurrencyType = currency === 'gold' ? 'gold' : 'crystals';
    const mergedCardBacks = new Set(resolveMergedCardBacks(userRow.unlockedCardBacks));
    if (mergedCardBacks.has(cardBackId)) {
      if (equipAfterUnlock && userRow.equippedCardBack !== cardBackId) {
        const equippedRows = await db
          .update(users)
          .set({ equippedCardBack: cardBackId, updatedAt: new Date() })
          .where(eq(users.id, userRow.id))
          .returning();
        return {
          state: await buildPlayerStateDTO(equippedRows[0]),
          unlockedCardBackId: cardBackId,
          costPaid: 0,
          currency: normalizedCurrency,
        };
      }
      return {
        state: await buildPlayerStateDTO(userRow),
        unlockedCardBackId: cardBackId,
        costPaid: 0,
        currency: normalizedCurrency,
      };
    }

    const price = getCardBackPrice(cardBackId);
    const cost = normalizedCurrency === 'gold' ? price.goldCost : price.crystalCost;
    const currentBalance = normalizedCurrency === 'gold' ? userRow.gold : userRow.crystals;
    if (currentBalance < cost) {
      throw new Error(normalizedCurrency === 'gold' ? 'INSUFFICIENT_GOLD' : 'INSUFFICIENT_CRYSTALS');
    }

    mergedCardBacks.add(cardBackId);
    const updated = await db
      .update(users)
      .set({
        ...(normalizedCurrency === 'gold'
          ? { gold: userRow.gold - cost }
          : { crystals: userRow.crystals - cost }),
        unlockedCardBacks: Array.from(mergedCardBacks),
        ...(equipAfterUnlock ? { equippedCardBack: cardBackId } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userRow.id))
      .returning();

    return {
      state: await buildPlayerStateDTO(updated[0]),
      unlockedCardBackId: cardBackId,
      costPaid: cost,
      currency: normalizedCurrency,
    };
  } catch (error: any) {
    if (
      error?.message === 'CARD_BACK_NOT_FOUND' ||
      error?.message === 'INSUFFICIENT_GOLD' ||
      error?.message === 'INSUFFICIENT_CRYSTALS'
    ) {
      throw error;
    }
    console.error('Database query failed in unlockCardBackByUid:', error);
    throw new Error('Não foi possível desbloquear este verso de carta.', { cause: error });
  }
}

export async function savePlayerDeckSlotByUid(
  uid: string,
  payload: { slotId: number; name: string; cardIds: string[]; setActive?: boolean },
  email?: string
): Promise<CloudPlayerStateDTO> {
  try {
    const userRow = await findUserByUidOrEmail(uid, email);
    if (!userRow) {
      throw new Error('Conta não localizada.');
    }

    await ensureDefaultDecksForUser(userRow.id);

    // slotId === 0 deactivates all custom slots so the starter/preset deck is active
    if (Number(payload.slotId) === 0) {
      await db
        .update(playerDecks)
        .set({ isActive: false })
        .where(eq(playerDecks.userId, userRow.id));
      return await buildPlayerStateDTO(userRow);
    }

    const slotId = Math.min(3, Math.max(1, Number(payload.slotId) || 1));
    const isEmpty = !Array.isArray(payload.cardIds) || payload.cardIds.length === 0;
    const cleanName = isEmpty
      ? `Espaço Vazio ${slotId}`
      : (payload.name || `Baralho Personalizado ${slotId}`).trim().slice(0, 40);
    const shouldActivate = !isEmpty && Boolean(payload.setActive);

    if (shouldActivate) {
      await db
        .update(playerDecks)
        .set({ isActive: false })
        .where(eq(playerDecks.userId, userRow.id));
    }

    await db
      .insert(playerDecks)
      .values({
        userId: userRow.id,
        slotId,
        name: cleanName,
        cardIds: isEmpty ? [] : payload.cardIds,
        isActive: shouldActivate,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [playerDecks.userId, playerDecks.slotId],
        set: {
          name: cleanName,
          cardIds: isEmpty ? [] : payload.cardIds,
          ...(isEmpty
            ? { isActive: false }
            : payload.setActive !== undefined
              ? { isActive: shouldActivate }
              : {}),
          updatedAt: new Date(),
        },
      });

    return await buildPlayerStateDTO(userRow);
  } catch (error) {
    console.error('Database query failed in savePlayerDeckSlotByUid:', error);
    throw new Error('Erro ao salvar baralho na nuvem.', { cause: error });
  }
}

export async function unlockCardByUid(
  uid: string,
  cardId: string,
  currency: CurrencyType = 'gold',
  email?: string
): Promise<{
  state: CloudPlayerStateDTO;
  unlockedCardId: string;
  costPaid: number;
  currency: CurrencyType;
}> {
  try {
    const userRow = await findUserByUidOrEmail(uid, email);
    if (!userRow) {
      throw new Error('Conta não localizada.');
    }
    const template = CARD_TEMPLATES.find((c) => c.id === cardId);
    if (!template) {
      throw new Error('CARD_NOT_FOUND');
    }

    if (isEventOrAdminExclusiveCard(template)) {
      throw new Error('EVENT_EXCLUSIVE_CARD');
    }

    const normalizedCurrency: CurrencyType = currency === 'crystals' ? 'crystals' : 'gold';
    const currentUnlocked = new Set<string>([
      ...getStarterUnlockedCardIds(),
      ...(Array.isArray(userRow.unlockedCardIds) ? userRow.unlockedCardIds : []),
    ]);

    if (currentUnlocked.has(cardId)) {
      return {
        state: await buildPlayerStateDTO(userRow),
        unlockedCardId: cardId,
        costPaid: 0,
        currency: normalizedCurrency,
      };
    }

    let cost: number;
    if (normalizedCurrency === 'crystals') {
      const crystalCost = getCardCrystalCostByTier(template.tier);
      if (crystalCost === null) {
        throw new Error('CRYSTALS_TIER_LIMIT_EXCEEDED');
      }
      cost = crystalCost;
      if (userRow.crystals < cost) {
        throw new Error('INSUFFICIENT_CRYSTALS');
      }
    } else {
      cost = getCardGoldCostByTier(template.tier);
      if (userRow.gold < cost) {
        throw new Error('INSUFFICIENT_GOLD');
      }
    }

    currentUnlocked.add(cardId);
    const updatedList = Array.from(currentUnlocked);

    const updated = await db
      .update(users)
      .set({
        ...(normalizedCurrency === 'crystals'
          ? { crystals: userRow.crystals - cost }
          : { gold: userRow.gold - cost }),
        unlockedCardIds: updatedList,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userRow.id))
      .returning();

    return {
      state: await buildPlayerStateDTO(updated[0]),
      unlockedCardId: cardId,
      costPaid: cost,
      currency: normalizedCurrency,
    };
  } catch (error: any) {
    if (
      error?.message === 'INSUFFICIENT_GOLD' ||
      error?.message === 'INSUFFICIENT_CRYSTALS' ||
      error?.message === 'CRYSTALS_TIER_LIMIT_EXCEEDED' ||
      error?.message === 'CARD_NOT_FOUND' ||
      error?.message === 'EVENT_EXCLUSIVE_CARD'
    ) {
      throw error;
    }
    console.error('Database query failed in unlockCardByUid:', error);
    throw new Error('Não foi possível desbloquear a carta no momento.', { cause: error });
  }
}

export async function openCardPackByUid(
  uid: string,
  packType: PackType,
  options?: { useFreeCommonPack?: boolean },
  email?: string
): Promise<{
  state: CloudPlayerStateDTO;
  packType: PackType;
  costPaid: number;
  usedFreePack: boolean;
  drops: PackDropItemDTO[];
  totalRefundCrystals: number;
}> {
  try {
    const packDef = PACK_MAP[packType];
    if (!packDef) {
      throw new Error('INVALID_PACK_TYPE');
    }

    const userRow = await findUserByUidOrEmail(uid, email);
    if (!userRow) {
      throw new Error('Conta não localizada.');
    }

    const currentPending = Math.max(0, userRow.pendingCommonPacks ?? 0);
    const useFree = Boolean(options?.useFreeCommonPack && packType === 'common');

    if (useFree && currentPending <= 0) {
      throw new Error('NO_FREE_PACKS_AVAILABLE');
    }

    const costPaid = useFree ? 0 : packDef.cost;
    if (!useFree && userRow.gold < costPaid) {
      throw new Error('INSUFFICIENT_GOLD');
    }

    const currentUnlocked = new Set<string>([
      ...getStarterUnlockedCardIds(),
      ...(Array.isArray(userRow.unlockedCardIds) ? userRow.unlockedCardIds : []),
    ]);

    const collectiblePool = getCollectibleCardTemplates().filter(
      (c) => !isEventOrAdminExclusiveCard(c) && c.tier >= 1 && c.tier <= 5
    );

    const drawCount =
      packDef.guaranteedCards +
      (packDef.extraCardChance > 0 && Math.random() < packDef.extraCardChance ? 1 : 0);

    const drops: PackDropItemDTO[] = [];
    let totalRefundCrystals = 0;

    for (let i = 0; i < drawCount; i++) {
      const targetTier: 1 | 2 | 3 | 4 | 5 =
        packDef.fixedTier ?? rollWeightedLuckyTier(Math.random());
      const tierCandidates = collectiblePool.filter((c) => c.tier === targetTier);
      const fallbackPool = tierCandidates.length > 0 ? tierCandidates : collectiblePool;
      const chosen = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
      if (!chosen) continue;

      const effectiveTier = (chosen.tier >= 1 && chosen.tier <= 5 ? chosen.tier : 1) as
        | 1
        | 2
        | 3
        | 4
        | 5;

      const isDuplicate = currentUnlocked.has(chosen.id);
      const refundCrystals = isDuplicate ? DUPLICATE_CARD_CRYSTAL_REFUND[effectiveTier] : 0;
      if (!isDuplicate) {
        currentUnlocked.add(chosen.id);
      } else {
        totalRefundCrystals += refundCrystals;
      }

      drops.push({
        cardId: chosen.id,
        tier: effectiveTier,
        isDuplicate,
        refundCrystals,
      });
    }

    const nextPending = useFree ? Math.max(0, currentPending - 1) : currentPending;
    const nextGold = Math.min(9999999, Math.max(0, userRow.gold - costPaid));
    const nextCrystals = Math.min(9999999, Math.max(0, userRow.crystals + totalRefundCrystals));

    const updated = await db
      .update(users)
      .set({
        gold: nextGold,
        crystals: nextCrystals,
        pendingCommonPacks: nextPending,
        unlockedCardIds: Array.from(currentUnlocked),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userRow.id))
      .returning();

    return {
      state: await buildPlayerStateDTO(updated[0]),
      packType,
      costPaid,
      usedFreePack: useFree,
      drops,
      totalRefundCrystals,
    };
  } catch (error: any) {
    if (
      error?.message === 'INVALID_PACK_TYPE' ||
      error?.message === 'INSUFFICIENT_GOLD' ||
      error?.message === 'NO_FREE_PACKS_AVAILABLE'
    ) {
      throw error;
    }
    console.error('Database query failed in openCardPackByUid:', error);
    throw new Error('Não foi possível abrir o pacote de cartas no momento.', { cause: error });
  }
}

export async function recordCompletedMatchByUid(
  uid: string,
  payload: {
    result: 'victory' | 'defeat';
    deckName: string;
    opponentName: string;
    opponentRank?: string;
    mode?: 'pvp_normal' | 'pvp_ranked' | 'pvia';
    playerHp?: number | null;
    playerMaxHp?: number | null;
    opponentHp?: number | null;
    totalRounds?: number | null;
    endReason?: string | null;
  },
  email?: string
): Promise<{
  state: CloudPlayerStateDTO;
  rewards: {
    goldEarned: number;
    crystalsEarned: number;
    xpEarned: number;
    leveledUp: boolean;
    newLevel: number;
    xpForNextLevel: number;
    rpDeltaApplied: number;
    isPerfectVictory: boolean;
    perfectVictoryBonus: number;
    lossStreakBrokenBonus: number;
    firstRankedPlacement: boolean;
    milestoneRewards: LevelMilestoneReward[];
    commonPacksGained: number;
  };
}> {
  try {
    const userRow = await findUserByUidOrEmail(uid, email);
    if (!userRow) {
      throw new Error('Conta não localizada.');
    }

    const mode: 'pvp_normal' | 'pvp_ranked' | 'pvia' =
      payload.mode === 'pvp_normal' || payload.mode === 'pvp_ranked' || payload.mode === 'pvia'
        ? payload.mode
        : 'pvia';
    const isVictory = payload.result === 'victory';
    const isRanked = mode === 'pvp_ranked';

    const safePlayerMaxHp =
      typeof payload.playerMaxHp === 'number' && Number.isFinite(payload.playerMaxHp)
        ? Math.max(1, Math.min(50, Math.floor(payload.playerMaxHp)))
        : null;
    const safePlayerHp =
      typeof payload.playerHp === 'number' && Number.isFinite(payload.playerHp)
        ? Math.max(0, Math.min(50, Math.floor(payload.playerHp)))
        : null;
    const safeOpponentHp =
      typeof payload.opponentHp === 'number' && Number.isFinite(payload.opponentHp)
        ? Math.max(0, Math.min(50, Math.floor(payload.opponentHp)))
        : null;
    const safeTotalRounds =
      typeof payload.totalRounds === 'number' && Number.isFinite(payload.totalRounds)
        ? Math.max(1, Math.min(200, Math.floor(payload.totalRounds)))
        : null;
    const safeEndReason =
      typeof payload.endReason === 'string' && payload.endReason.trim()
        ? payload.endReason.trim().slice(0, 140)
        : null;

    const isPerfectVictory =
      isVictory &&
      safePlayerHp !== null &&
      safePlayerMaxHp !== null &&
      safePlayerHp >= safePlayerMaxHp;

    // Matches NEVER award Gold; they reward Crystals (PvP: 20 win / 10 loss, PvIA: 5 win / 5 loss)
    const crystalsEarned = calculateMatchCrystalReward(mode, isVictory);
    const currentLevel = Math.max(1, Math.min(MAX_ACCOUNT_LEVEL, userRow.level || 1));
    const xpEarned = calculateMatchXpReward(mode, isVictory, currentLevel);

    // STRICT: ONLY PvP Ranked matches award or deduct Rank Points.
    // PvIA and PvP Normal ALWAYS yield 0 RP and never alter ranked placement/streaks.
    let effectiveRpDelta = 0;
    let perfectVictoryBonus = 0;
    let lossStreakBrokenBonus = 0;
    let firstRankedPlacement = false;
    let nextRankPoints = userRow.rankPoints;
    let nextRankedMatchesPlayed = Math.max(0, userRow.rankedMatchesPlayed ?? 0);
    let nextRankedLossStreak = Math.max(0, userRow.rankedLossStreak ?? 0);
    let nextLastRankedWinRp = Math.max(0, userRow.lastRankedWinRp ?? 0);

    if (isRanked) {
      const rpCalc = calculateRankedRpDelta({
        isVictory,
        isPerfectVictory,
        prevLossStreak: nextRankedLossStreak,
        lastRankedWinRp: nextLastRankedWinRp,
        isRankBlockedTotal: Boolean(userRow.rankBlockedTotal),
      });
      effectiveRpDelta = rpCalc.rpDelta;
      perfectVictoryBonus = rpCalc.perfectVictoryBonus;
      lossStreakBrokenBonus = rpCalc.lossStreakBrokenBonus;
      firstRankedPlacement = nextRankedMatchesPlayed === 0;
      nextRankedMatchesPlayed += 1;
      nextRankedLossStreak = rpCalc.nextLossStreak;
      nextLastRankedWinRp = rpCalc.nextLastWinRp;
      nextRankPoints = Math.max(0, userRow.rankPoints + effectiveRpDelta);
    }

    const xpProg = applyAccountXpProgress({
      currentLevel,
      currentXp: userRow.xp,
      claimedMilestones: normalizeClaimedMilestones(userRow.claimedLevelMilestones),
      addedXp: xpEarned,
    });

    // Level milestones (10, 20, 30, 40, 50) keep awarding Gold as special milestone bonuses; match itself gives 0 Gold.
    const milestoneGoldEarned = xpProg.goldGained;
    const nextGold = Math.min(9999999, userRow.gold + milestoneGoldEarned);
    const nextCrystals = Math.min(9999999, userRow.crystals + crystalsEarned);
    const nextPendingPacks = Math.min(
      999,
      Math.max(0, (userRow.pendingCommonPacks ?? 0) + xpProg.commonPacksGained)
    );
    const nextWins = isVictory ? userRow.wins + 1 : userRow.wins;
    const nextLosses = !isVictory ? userRow.losses + 1 : userRow.losses;

    const updatedUsers = await db
      .update(users)
      .set({
        level: xpProg.level,
        xp: xpProg.xp,
        gold: nextGold,
        crystals: nextCrystals,
        pendingCommonPacks: nextPendingPacks,
        claimedLevelMilestones: xpProg.claimedMilestones,
        rankPoints: nextRankPoints,
        rankedMatchesPlayed: nextRankedMatchesPlayed,
        rankedLossStreak: nextRankedLossStreak,
        lastRankedWinRp: nextLastRankedWinRp,
        wins: nextWins,
        losses: nextLosses,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userRow.id))
      .returning();

    const safeDeckName =
      typeof payload.deckName === 'string' && payload.deckName.trim()
        ? payload.deckName.trim().slice(0, 80)
        : PRESET_FIRE_LIGHTNING.name;
    const safeOpponentName =
      typeof payload.opponentName === 'string' && payload.opponentName.trim()
        ? payload.opponentName.trim().slice(0, 64)
        : 'Guardião de Celentia';
    const safeOpponentRank =
      typeof payload.opponentRank === 'string' && payload.opponentRank.trim()
        ? payload.opponentRank.trim().slice(0, 40)
        : mode === 'pvia'
        ? 'IA Tática'
        : 'Sem rank';

    await db.insert(matchHistory).values({
      userId: userRow.id,
      result: isVictory ? 'victory' : 'defeat',
      deckName: safeDeckName,
      deckCode: '2/303',
      rpChange: effectiveRpDelta,
      goldEarned: 0,
      crystalsEarned,
      xpEarned,
      opponentName: safeOpponentName,
      opponentRank: safeOpponentRank,
      mode,
      playerHp: safePlayerHp,
      playerMaxHp: safePlayerMaxHp,
      opponentHp: safeOpponentHp,
      totalRounds: safeTotalRounds,
      endReason: safeEndReason,
      isPerfectVictory,
      lossStreakBonus: lossStreakBrokenBonus,
      playedAt: new Date(),
    });

    return {
      state: await buildPlayerStateDTO(updatedUsers[0]),
      rewards: {
        goldEarned: milestoneGoldEarned,
        crystalsEarned,
        xpEarned,
        leveledUp: xpProg.levelsGained > 0,
        newLevel: xpProg.level,
        xpForNextLevel: xpProg.xpForNextLevel,
        rpDeltaApplied: effectiveRpDelta,
        isPerfectVictory,
        perfectVictoryBonus,
        lossStreakBrokenBonus,
        firstRankedPlacement,
        milestoneRewards: xpProg.newlyClaimedMilestones,
        commonPacksGained: xpProg.commonPacksGained,
      },
    };
  } catch (error) {
    console.error('Database query failed in recordCompletedMatchByUid:', error);
    throw new Error('Erro ao salvar resultado da partida no banco de dados.', { cause: error });
  }
}

export async function ensureSeededTestProfiles(
  adminPasswordHash: string,
  starterPasswordHash: string
): Promise<void> {
  try {
    const allCardIds = getCollectibleCardTemplates().map((c) => c.id);
    const allAvatarIds = CARD_AVATARS.map((a) => a.id);
    const starterCardIds = getStarterUnlockedCardIds();

    // 1. Seed ADMIN Profile (All cards & avatars unlocked, 99,999 Gold, Level 50, Rank Celestial = 1500+ RP)
    const adminRows = await db
      .insert(users)
      .values({
        uid: 'seed_admin_master',
        email: 'admin@celentia.com',
        nickname: '@admin',
        passwordHash: adminPasswordHash,
        level: MAX_ACCOUNT_LEVEL,
        xp: 0,
        gold: 99999,
        crystals: 99999,
        rankPoints: CELESTIAL_MIN_POINTS,
        rankedMatchesPlayed: 27,
        preferredSide: 'sol',
        avatarId: 'av_n_helio',
        unlockedAvatarIds: allAvatarIds,
        equippedPlaymat: DEFAULT_PLAYMAT_ID,
        unlockedPlaymats: [...ALL_PLAYMAT_IDS],
        equippedCardBack: DEFAULT_CARD_BACK_ID,
        unlockedCardBacks: [...ALL_CARD_BACK_IDS],
        pendingCommonPacks: 0,
        claimedLevelMilestones: [10, 20, 30, 40, 50],
        rankBlockedTotal: false,
        rankBlockFromTier: null,
        unlockedCardIds: allCardIds,
        wins: 25,
        losses: 2,
        draws: 0,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          passwordHash: adminPasswordHash,
          unlockedCardIds: allCardIds,
          unlockedAvatarIds: allAvatarIds,
          unlockedPlaymats: [...ALL_PLAYMAT_IDS],
          unlockedCardBacks: [...ALL_CARD_BACK_IDS],
          updatedAt: new Date(),
        },
      })
      .returning();

    if (adminRows[0]) {
      await ensureDefaultDecksForUser(adminRows[0].id);
    }

    // 2. Seed NOVATO Profile (Starter cards, only default cosmetics, 0 Gold, 0 Crystals, Level 1, Sem rank = 0 RP)
    const starterRows = await db
      .insert(users)
      .values({
        uid: 'seed_novato_starter',
        email: 'novato@celentia.com',
        nickname: '@novato',
        passwordHash: starterPasswordHash,
        level: 1,
        xp: 0,
        gold: 0,
        crystals: 0,
        rankPoints: 0,
        rankedMatchesPlayed: 0,
        preferredSide: 'balance',
        avatarId: DEFAULT_AVATAR_ID,
        unlockedAvatarIds: FREE_AVATAR_IDS,
        equippedPlaymat: DEFAULT_PLAYMAT_ID,
        unlockedPlaymats: [...FREE_PLAYMAT_IDS],
        equippedCardBack: DEFAULT_CARD_BACK_ID,
        unlockedCardBacks: [...FREE_CARD_BACK_IDS],
        pendingCommonPacks: 0,
        claimedLevelMilestones: [],
        rankBlockedTotal: false,
        rankBlockFromTier: null,
        unlockedCardIds: starterCardIds,
        wins: 0,
        losses: 0,
        draws: 0,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          passwordHash: starterPasswordHash,
          unlockedCardIds: starterCardIds,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (starterRows[0]) {
      await ensureDefaultDecksForUser(starterRows[0].id);
    }
  } catch (error) {
    console.error('Database query failed in ensureSeededTestProfiles:', error);
  }
}

export async function executeAdminActionByUid(
  uid: string,
  action:
    | 'unlock_all_cards'
    | 'grant_event_classes'
    | 'reset_starter_cards'
    | 'add_gold_5000'
    | 'add_crystals_5000'
    | 'unlock_all_cosmetics'
    | 'max_level_rank',
  email?: string
): Promise<CloudPlayerStateDTO> {
  try {
    const userRow = await findUserByUidOrEmail(uid, email);
    if (!userRow) {
      throw new Error('Conta não localizada.');
    }
    if (!isUserAdminAccount(userRow.email, userRow.nickname)) {
      throw new Error('FORBIDDEN_NOT_ADMIN');
    }

    const collectible = getCollectibleCardTemplates();
    const allCardIds = collectible.map((c) => c.id);
    const starterCardIds = getStarterUnlockedCardIds();

    const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
    if (action === 'unlock_all_cards') {
      patch.unlockedCardIds = allCardIds;
    } else if (action === 'grant_event_classes') {
      const eventCardIds = collectible
        .filter((c) => isEventOrAdminExclusiveCard(c))
        .map((c) => c.id);
      const currentUnlocked = Array.isArray(userRow.unlockedCardIds)
        ? userRow.unlockedCardIds
        : [];
      patch.unlockedCardIds = Array.from(
        new Set([...starterCardIds, ...currentUnlocked, ...eventCardIds])
      );
    } else if (action === 'reset_starter_cards') {
      patch.unlockedCardIds = starterCardIds;
      patch.unlockedAvatarIds = FREE_AVATAR_IDS;
      patch.avatarId = DEFAULT_AVATAR_ID;
      patch.unlockedPlaymats = [...FREE_PLAYMAT_IDS];
      patch.equippedPlaymat = DEFAULT_PLAYMAT_ID;
      patch.unlockedCardBacks = [...FREE_CARD_BACK_IDS];
      patch.equippedCardBack = DEFAULT_CARD_BACK_ID;
      patch.gold = 0;
      patch.crystals = 0;
      patch.level = 1;
      patch.xp = 0;
      patch.pendingCommonPacks = 0;
      patch.claimedLevelMilestones = [];
      patch.rankPoints = 0;
      patch.rankedMatchesPlayed = 0;
      patch.rankedLossStreak = 0;
      patch.lastRankedWinRp = 0;
      for (const slot of INITIAL_DECK_SLOTS) {
        await db
          .insert(playerDecks)
          .values({
            userId: userRow.id,
            slotId: slot.slotId,
            name: slot.name,
            cardIds: [],
            isActive: false,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [playerDecks.userId, playerDecks.slotId],
            set: { name: slot.name, cardIds: [], isActive: false, updatedAt: new Date() },
          });
      }
    } else if (action === 'add_gold_5000') {
      patch.gold = Math.min(9999999, userRow.gold + 5000);
    } else if (action === 'add_crystals_5000') {
      patch.crystals = Math.min(9999999, userRow.crystals + 5000);
    } else if (action === 'unlock_all_cosmetics') {
      patch.unlockedAvatarIds = CARD_AVATARS.map((a) => a.id);
      patch.unlockedPlaymats = [...ALL_PLAYMAT_IDS];
      patch.unlockedCardBacks = [...ALL_CARD_BACK_IDS];
    } else if (action === 'max_level_rank') {
      patch.level = MAX_ACCOUNT_LEVEL;
      patch.xp = 0;
      patch.claimedLevelMilestones = [10, 20, 30, 40, 50];
      patch.rankPoints = Math.max(CELESTIAL_MIN_POINTS, userRow.rankPoints);
      patch.rankedMatchesPlayed = Math.max(1, userRow.rankedMatchesPlayed ?? 0);
      patch.gold = Math.max(99999, userRow.gold);
      patch.crystals = Math.max(99999, userRow.crystals);
    }

    const updated = await db
      .update(users)
      .set(patch)
      .where(eq(users.id, userRow.id))
      .returning();

    return await buildPlayerStateDTO(updated[0]);
  } catch (error: any) {
    if (error?.message === 'FORBIDDEN_NOT_ADMIN') {
      throw error;
    }
    console.error('Database query failed in executeAdminActionByUid:', error);
    throw new Error('Falha ao executar ação administrativa.', { cause: error });
  }
}

function toPublicSummaryDTO(
  row: typeof users.$inferSelect,
  totalCollectible: number
): PublicPlayerSummaryDTO {
  const starterIds = getStarterUnlockedCardIds();
  const unlockedSet = new Set([
    ...starterIds,
    ...(Array.isArray(row.unlockedCardIds) ? row.unlockedCardIds : []),
  ]);
  const side =
    row.preferredSide === 'sol' || row.preferredSide === 'lua'
      ? row.preferredSide
      : 'balance';
  const mergedAvatars = resolveMergedAvatars(row.unlockedAvatarIds);

  return {
    uid: row.uid,
    nickname: formatHandleDisplay(row.nickname),
    level: Math.max(1, Math.min(MAX_ACCOUNT_LEVEL, row.level || 1)),
    rankPoints: row.rankPoints,
    rankedMatchesPlayed: Math.max(0, row.rankedMatchesPlayed ?? 0),
    preferredSide: side,
    avatarId: resolveValidAvatarId(row.avatarId, mergedAvatars),
    rankBlockedTotal: Boolean(row.rankBlockedTotal),
    rankBlockFromTier: normalizeRankTierInput(row.rankBlockFromTier),
    wins: row.wins,
    losses: row.losses,
    draws: row.draws,
    unlockedCount: unlockedSet.size,
    totalCollectible,
    isAdmin: isUserAdminAccount(row.email, row.nickname),
  };
}

function toAdminUserSummaryDTO(
  row: typeof users.$inferSelect,
  totalCollectible: number
): AdminUserSummaryDTO {
  const starterIds = getStarterUnlockedCardIds();
  const unlockedCards = Array.from(
    new Set([
      ...starterIds,
      ...(Array.isArray(row.unlockedCardIds) ? row.unlockedCardIds : []),
    ])
  );
  const clampedLevel = Math.max(1, Math.min(MAX_ACCOUNT_LEVEL, row.level || 1));
  return {
    ...toPublicSummaryDTO(row, totalCollectible),
    email: row.email,
    xp: clampedLevel >= MAX_ACCOUNT_LEVEL ? 0 : Math.max(0, row.xp || 0),
    gold: Math.max(0, row.gold ?? 0),
    crystals: Math.max(0, row.crystals ?? 0),
    unlockedCardIds: unlockedCards,
    unlockedAvatarIds: resolveMergedAvatars(row.unlockedAvatarIds),
    unlockedPlaymats: resolveMergedPlaymats(row.unlockedPlaymats),
    unlockedCardBacks: resolveMergedCardBacks(row.unlockedCardBacks),
    pendingCommonPacks: Math.max(0, row.pendingCommonPacks ?? 0),
    claimedLevelMilestones: normalizeClaimedMilestones(row.claimedLevelMilestones),
    createdAt: row.createdAt ? formatDatePtBr(new Date(row.createdAt)) : '',
  };
}

function escapeIlikePattern(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export async function searchPublicPlayers(
  queryText: string,
  limitCount = 15
): Promise<PublicPlayerSummaryDTO[]> {
  try {
    const clean = queryText.trim().slice(0, 32);
    const safeLimit = Math.min(30, Math.max(1, limitCount));
    const totalCollectible = getCollectibleCardTemplates().length;

    const rows = clean
      ? await db
          .select()
          .from(users)
          .where(ilike(users.nickname, `%${escapeIlikePattern(clean)}%`))
          .orderBy(desc(users.rankPoints), desc(users.level))
          .limit(safeLimit)
      : await db
          .select()
          .from(users)
          .orderBy(desc(users.rankPoints), desc(users.level))
          .limit(safeLimit);

    return rows.map((r) => toPublicSummaryDTO(r, totalCollectible));
  } catch (error) {
    console.error('Database query failed in searchPublicPlayers:', error);
    throw new Error('Não foi possível pesquisar jogadores no momento.', { cause: error });
  }
}

export async function getPublicPlayerProfileByIdentifier(
  identifier: string
): Promise<PublicPlayerProfileDTO | null> {
  try {
    const clean = identifier.trim().slice(0, 64);
    if (!clean) return null;
    const lower = clean.toLowerCase();
    const withAtLower = lower.startsWith('@') ? lower : `@${lower}`;

    const rows = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.uid, clean),
          sql`lower(${users.nickname}) = ${lower}`,
          sql`lower(${users.nickname}) = ${withAtLower}`
        )
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const matchRows = await db
      .select()
      .from(matchHistory)
      .where(eq(matchHistory.userId, row.id))
      .orderBy(desc(matchHistory.playedAt))
      .limit(15);

    const recentMatches: CloudMatchRecordDTO[] = matchRows.map(toCloudMatchRecordDTO);

    const totalCollectible = getCollectibleCardTemplates().length;
    const summary = toPublicSummaryDTO(row, totalCollectible);
    const xpForNextLevel = getXpRequiredForNextLevel(summary.level);
    return {
      ...summary,
      xp: summary.level >= MAX_ACCOUNT_LEVEL ? 0 : Math.min(xpForNextLevel - 1, Math.max(0, row.xp || 0)),
      xpForNextLevel,
      recentMatches,
    };
  } catch (error) {
    console.error('Database query failed in getPublicPlayerProfileByIdentifier:', error);
    throw new Error('Não foi possível carregar o perfil do jogador.', { cause: error });
  }
}

export async function getGlobalLeaderboard(limitCount = 50): Promise<LeaderboardEntryDTO[]> {
  try {
    const safeLimit = Math.min(100, Math.max(1, Math.floor(limitCount || 50)));
    const totalCollectible = getCollectibleCardTemplates().length;

    const rows = await db
      .select()
      .from(users)
      .orderBy(
        sql`CASE WHEN ${users.rankedMatchesPlayed} > 0 THEN 0 ELSE 1 END ASC`,
        desc(users.rankPoints),
        desc(users.wins),
        desc(users.level),
        users.id
      )
      .limit(safeLimit);

    return rows.map((row, idx) => ({
      ...toPublicSummaryDTO(row, totalCollectible),
      position: idx + 1,
    }));
  } catch (error) {
    console.error('Database query failed in getGlobalLeaderboard:', error);
    throw new Error('Não foi possível carregar o ranking geral de jogadores.', { cause: error });
  }
}

async function assertCallerIsAdmin(callerUid: string, callerEmail?: string) {
  const callerRow = await findUserByUidOrEmail(callerUid, callerEmail);
  const allowed =
    isUserAdminAccount(callerEmail) ||
    Boolean(callerRow && isUserAdminAccount(callerRow.email, callerRow.nickname));
  if (!allowed) {
    throw new Error('FORBIDDEN_NOT_ADMIN');
  }
  return callerRow;
}

export async function adminListUsers(
  callerUid: string,
  callerEmail?: string,
  searchQuery?: string
): Promise<AdminUserSummaryDTO[]> {
  try {
    await assertCallerIsAdmin(callerUid, callerEmail);
    const totalCollectible = getCollectibleCardTemplates().length;
    const clean = (searchQuery || '').trim().slice(0, 64);

    const rows = clean
      ? await db
          .select()
          .from(users)
          .where(
            or(
              ilike(users.nickname, `%${escapeIlikePattern(clean)}%`),
              ilike(users.email, `%${escapeIlikePattern(clean)}%`)
            )
          )
          .orderBy(desc(users.rankPoints), desc(users.level))
          .limit(100)
      : await db
          .select()
          .from(users)
          .orderBy(desc(users.rankPoints), desc(users.level))
          .limit(100);

    return rows.map((r) => toAdminUserSummaryDTO(r, totalCollectible));
  } catch (error: any) {
    if (error?.message === 'FORBIDDEN_NOT_ADMIN') throw error;
    console.error('Database query failed in adminListUsers:', error);
    throw new Error('Não foi possível listar os perfis de usuários.', { cause: error });
  }
}

export async function adminUpdateUserProfile(
  callerUid: string,
  callerEmail: string | undefined,
  targetUid: string,
  updates: {
    nickname?: string;
    gold?: number;
    crystals?: number;
    level?: number;
    xp?: number;
    rankPoints?: number;
    preferredSide?: 'sol' | 'lua' | 'balance';
    rankBlockedTotal?: boolean;
    rankBlockFromTier?: string | null;
  }
): Promise<{ user: AdminUserSummaryDTO; updatedCallerState?: CloudPlayerStateDTO }> {
  try {
    const callerRow = await assertCallerIsAdmin(callerUid, callerEmail);

    const targetRows = await db
      .select()
      .from(users)
      .where(eq(users.uid, targetUid))
      .limit(1);
    const target = targetRows[0];
    if (!target) {
      throw new Error('TARGET_USER_NOT_FOUND');
    }

    const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };

    if (updates.nickname !== undefined) {
      const nickCheck = validateHandle(updates.nickname);
      if (!nickCheck.valid) {
        throw new Error(`INVALID_NICKNAME:${nickCheck.error || 'Nick inválido.'}`);
      }
      if (await isHandleTaken(nickCheck.normalized, target.id)) {
        throw new Error('NICKNAME_ALREADY_EXISTS');
      }
      patch.nickname = nickCheck.normalized;
    }

    if (updates.gold !== undefined && Number.isFinite(Number(updates.gold))) {
      patch.gold = Math.max(0, Math.min(9999999, Math.floor(Number(updates.gold))));
    }
    if (updates.crystals !== undefined && Number.isFinite(Number(updates.crystals))) {
      patch.crystals = Math.max(0, Math.min(9999999, Math.floor(Number(updates.crystals))));
    }
    let nextLevel = target.level;
    if (updates.level !== undefined && Number.isFinite(Number(updates.level))) {
      nextLevel = Math.max(1, Math.min(MAX_ACCOUNT_LEVEL, Math.floor(Number(updates.level))));
      patch.level = nextLevel;
    }
    if (updates.xp !== undefined && Number.isFinite(Number(updates.xp))) {
      const maxXpForLevel = Math.max(0, getXpRequiredForNextLevel(nextLevel) - 1);
      patch.xp = nextLevel >= MAX_ACCOUNT_LEVEL ? 0 : Math.max(0, Math.min(maxXpForLevel, Math.floor(Number(updates.xp))));
    } else if (nextLevel >= MAX_ACCOUNT_LEVEL) {
      patch.xp = 0;
    }
    if (updates.rankPoints !== undefined && Number.isFinite(Number(updates.rankPoints))) {
      const nextRp = Math.max(0, Math.min(99999, Math.floor(Number(updates.rankPoints))));
      patch.rankPoints = nextRp;
      if (nextRp > 0 && (target.rankedMatchesPlayed ?? 0) === 0) {
        patch.rankedMatchesPlayed = 1;
      }
    }
    if (
      updates.preferredSide === 'sol' ||
      updates.preferredSide === 'lua' ||
      updates.preferredSide === 'balance'
    ) {
      patch.preferredSide = updates.preferredSide;
    }
    if (typeof updates.rankBlockedTotal === 'boolean') {
      patch.rankBlockedTotal = updates.rankBlockedTotal;
    }
    if (updates.rankBlockFromTier !== undefined) {
      patch.rankBlockFromTier =
        updates.rankBlockFromTier === null || updates.rankBlockFromTier === 'none' || updates.rankBlockFromTier === ''
          ? null
          : normalizeRankTierInput(updates.rankBlockFromTier);
    }

    const updatedRows = await db
      .update(users)
      .set(patch)
      .where(eq(users.id, target.id))
      .returning();

    const updated = updatedRows[0];
    const totalCollectible = getCollectibleCardTemplates().length;
    const isEditingSelf = Boolean(callerRow && callerRow.id === target.id);

    return {
      user: toAdminUserSummaryDTO(updated, totalCollectible),
      ...(isEditingSelf ? { updatedCallerState: await buildPlayerStateDTO(updated) } : {}),
    };
  } catch (error: any) {
    if (
      error?.message === 'FORBIDDEN_NOT_ADMIN' ||
      error?.message === 'TARGET_USER_NOT_FOUND' ||
      error?.message === 'NICKNAME_ALREADY_EXISTS' ||
      (typeof error?.message === 'string' && error.message.startsWith('INVALID_NICKNAME:'))
    ) {
      throw error;
    }
    console.error('Database query failed in adminUpdateUserProfile:', error);
    throw new Error('Não foi possível atualizar o perfil do usuário.', { cause: error });
  }
}

export async function adminDeliverCardToUser(
  callerUid: string,
  callerEmail: string | undefined,
  targetUid: string,
  cardId: string
): Promise<{
  user: AdminUserSummaryDTO;
  updatedCallerState?: CloudPlayerStateDTO;
  deliveredCardId: string;
  cardName: string;
  alreadyOwned: boolean;
}> {
  try {
    const callerRow = await assertCallerIsAdmin(callerUid, callerEmail);
    const collectible = getCollectibleCardTemplates();
    const cardTemplate = collectible.find((c) => c.id === cardId);
    if (!cardTemplate) {
      throw new Error('CARD_NOT_FOUND');
    }

    const targetRows = await db
      .select()
      .from(users)
      .where(eq(users.uid, targetUid))
      .limit(1);
    const target = targetRows[0];
    if (!target) {
      throw new Error('TARGET_USER_NOT_FOUND');
    }

    const currentUnlocked = new Set([
      ...getStarterUnlockedCardIds(),
      ...(Array.isArray(target.unlockedCardIds) ? target.unlockedCardIds : []),
    ]);
    const alreadyOwned = currentUnlocked.has(cardId);
    currentUnlocked.add(cardId);

    const updatedRows = await db
      .update(users)
      .set({
        unlockedCardIds: Array.from(currentUnlocked),
        updatedAt: new Date(),
      })
      .where(eq(users.id, target.id))
      .returning();

    const updated = updatedRows[0];
    const isEditingSelf = Boolean(callerRow && callerRow.id === target.id);

    return {
      user: toAdminUserSummaryDTO(updated, collectible.length),
      ...(isEditingSelf ? { updatedCallerState: await buildPlayerStateDTO(updated) } : {}),
      deliveredCardId: cardId,
      cardName: cardTemplate.name,
      alreadyOwned,
    };
  } catch (error: any) {
    if (
      error?.message === 'FORBIDDEN_NOT_ADMIN' ||
      error?.message === 'TARGET_USER_NOT_FOUND' ||
      error?.message === 'CARD_NOT_FOUND'
    ) {
      throw error;
    }
    console.error('Database query failed in adminDeliverCardToUser:', error);
    throw new Error('Falha ao entregar carta ao jogador.', { cause: error });
  }
}

export async function adminDeliverAvatarToUser(
  callerUid: string,
  callerEmail: string | undefined,
  targetUid: string,
  avatarId: string
): Promise<{
  user: AdminUserSummaryDTO;
  updatedCallerState?: CloudPlayerStateDTO;
  deliveredAvatarId: string;
  avatarName: string;
  alreadyOwned: boolean;
}> {
  try {
    const callerRow = await assertCallerIsAdmin(callerUid, callerEmail);
    const isAll = avatarId === 'all';
    const targetAvatar = isAll ? null : CARD_AVATARS.find((a) => a.id === avatarId);
    if (!isAll && !targetAvatar) {
      throw new Error('AVATAR_NOT_FOUND');
    }

    const targetRows = await db
      .select()
      .from(users)
      .where(eq(users.uid, targetUid))
      .limit(1);
    const target = targetRows[0];
    if (!target) {
      throw new Error('TARGET_USER_NOT_FOUND');
    }

    const currentSet = new Set(resolveMergedAvatars(target.unlockedAvatarIds));
    const alreadyOwned = isAll
      ? CARD_AVATARS.every((a) => currentSet.has(a.id))
      : currentSet.has(avatarId);

    if (isAll) {
      for (const a of CARD_AVATARS) currentSet.add(a.id);
    } else {
      currentSet.add(avatarId);
    }

    const updatedRows = await db
      .update(users)
      .set({
        unlockedAvatarIds: Array.from(currentSet),
        updatedAt: new Date(),
      })
      .where(eq(users.id, target.id))
      .returning();

    const updated = updatedRows[0];
    const totalCollectible = getCollectibleCardTemplates().length;
    const isEditingSelf = Boolean(callerRow && callerRow.id === target.id);

    return {
      user: toAdminUserSummaryDTO(updated, totalCollectible),
      ...(isEditingSelf ? { updatedCallerState: await buildPlayerStateDTO(updated) } : {}),
      deliveredAvatarId: avatarId,
      avatarName: isAll ? 'Todos os 60 Avatares' : targetAvatar!.name,
      alreadyOwned,
    };
  } catch (error: any) {
    if (
      error?.message === 'FORBIDDEN_NOT_ADMIN' ||
      error?.message === 'TARGET_USER_NOT_FOUND' ||
      error?.message === 'AVATAR_NOT_FOUND'
    ) {
      throw error;
    }
    console.error('Database query failed in adminDeliverAvatarToUser:', error);
    throw new Error('Falha ao liberar avatar para o jogador.', { cause: error });
  }
}

export async function adminGrantResourcesToUser(
  callerUid: string,
  callerEmail: string | undefined,
  targetUid: string,
  payload: {
    addXp?: number;
    addRankPoints?: number;
    addGold?: number;
    addCrystals?: number;
  }
): Promise<{
  user: AdminUserSummaryDTO;
  updatedCallerState?: CloudPlayerStateDTO;
  granted: {
    xpAdded: number;
    goldAdded: number;
    crystalsAdded: number;
    rpAdded: number;
    commonPacksAdded: number;
    levelsGained: number;
    newLevel: number;
    milestoneRewards: LevelMilestoneReward[];
  };
}> {
  try {
    const callerRow = await assertCallerIsAdmin(callerUid, callerEmail);
    const targetRows = await db
      .select()
      .from(users)
      .where(eq(users.uid, targetUid))
      .limit(1);
    const target = targetRows[0];
    if (!target) {
      throw new Error('TARGET_USER_NOT_FOUND');
    }

    const safeAddXp = Math.max(0, Math.min(250000, Math.floor(Number(payload.addXp) || 0)));
    const safeAddRp = Math.max(0, Math.min(50000, Math.floor(Number(payload.addRankPoints) || 0)));
    const safeAddGold = Math.max(0, Math.min(5000000, Math.floor(Number(payload.addGold) || 0)));
    const safeAddCrystals = Math.max(0, Math.min(5000000, Math.floor(Number(payload.addCrystals) || 0)));

    const xpProg = applyAccountXpProgress({
      currentLevel: target.level,
      currentXp: target.xp,
      claimedMilestones: normalizeClaimedMilestones(target.claimedLevelMilestones),
      addedXp: safeAddXp,
    });

    const nextGold = Math.min(9999999, target.gold + safeAddGold + xpProg.goldGained);
    const nextCrystals = Math.min(9999999, target.crystals + safeAddCrystals);
    const nextPendingPacks = Math.min(
      999,
      Math.max(0, (target.pendingCommonPacks ?? 0) + xpProg.commonPacksGained)
    );
    const nextRankPoints = Math.min(99999, Math.max(0, target.rankPoints + safeAddRp));
    const nextRankedMatchesPlayed =
      safeAddRp > 0 && (target.rankedMatchesPlayed ?? 0) === 0
        ? 1
        : Math.max(0, target.rankedMatchesPlayed ?? 0);

    const updatedRows = await db
      .update(users)
      .set({
        level: xpProg.level,
        xp: xpProg.xp,
        gold: nextGold,
        crystals: nextCrystals,
        pendingCommonPacks: nextPendingPacks,
        claimedLevelMilestones: xpProg.claimedMilestones,
        rankPoints: nextRankPoints,
        rankedMatchesPlayed: nextRankedMatchesPlayed,
        updatedAt: new Date(),
      })
      .where(eq(users.id, target.id))
      .returning();

    const updated = updatedRows[0];
    const totalCollectible = getCollectibleCardTemplates().length;
    const isEditingSelf = Boolean(callerRow && callerRow.id === target.id);

    return {
      user: toAdminUserSummaryDTO(updated, totalCollectible),
      ...(isEditingSelf ? { updatedCallerState: await buildPlayerStateDTO(updated) } : {}),
      granted: {
        xpAdded: safeAddXp,
        goldAdded: safeAddGold + xpProg.goldGained,
        crystalsAdded: safeAddCrystals,
        rpAdded: safeAddRp,
        commonPacksAdded: xpProg.commonPacksGained,
        levelsGained: xpProg.levelsGained,
        newLevel: xpProg.level,
        milestoneRewards: xpProg.newlyClaimedMilestones,
      },
    };
  } catch (error: any) {
    if (error?.message === 'FORBIDDEN_NOT_ADMIN' || error?.message === 'TARGET_USER_NOT_FOUND') {
      throw error;
    }
    console.error('Database query failed in adminGrantResourcesToUser:', error);
    throw new Error('Falha ao entregar recursos ao jogador.', { cause: error });
  }
}

export async function adminExecuteActionOnTargetUser(
  callerUid: string,
  callerEmail: string | undefined,
  targetUid: string,
  action:
    | 'unlock_all_cards'
    | 'grant_event_classes'
    | 'reset_starter_cards'
    | 'add_gold_5000'
    | 'add_crystals_5000'
    | 'unlock_all_cosmetics'
    | 'max_level_rank'
): Promise<{ user: AdminUserSummaryDTO; updatedCallerState?: CloudPlayerStateDTO }> {
  try {
    const callerRow = await assertCallerIsAdmin(callerUid, callerEmail);
    const targetRows = await db
      .select()
      .from(users)
      .where(eq(users.uid, targetUid))
      .limit(1);
    const target = targetRows[0];
    if (!target) {
      throw new Error('TARGET_USER_NOT_FOUND');
    }

    const collectible = getCollectibleCardTemplates();
    const allCardIds = collectible.map((c) => c.id);
    const starterCardIds = getStarterUnlockedCardIds();

    const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
    if (action === 'unlock_all_cards') {
      patch.unlockedCardIds = allCardIds;
    } else if (action === 'grant_event_classes') {
      const eventCardIds = collectible
        .filter((c) => isEventOrAdminExclusiveCard(c))
        .map((c) => c.id);
      const currentUnlocked = Array.isArray(target.unlockedCardIds)
        ? target.unlockedCardIds
        : [];
      patch.unlockedCardIds = Array.from(
        new Set([...starterCardIds, ...currentUnlocked, ...eventCardIds])
      );
    } else if (action === 'reset_starter_cards') {
      patch.unlockedCardIds = starterCardIds;
      patch.unlockedAvatarIds = FREE_AVATAR_IDS;
      patch.avatarId = DEFAULT_AVATAR_ID;
      patch.unlockedPlaymats = [...FREE_PLAYMAT_IDS];
      patch.equippedPlaymat = DEFAULT_PLAYMAT_ID;
      patch.unlockedCardBacks = [...FREE_CARD_BACK_IDS];
      patch.equippedCardBack = DEFAULT_CARD_BACK_ID;
      patch.gold = 0;
      patch.crystals = 0;
      patch.level = 1;
      patch.xp = 0;
      patch.pendingCommonPacks = 0;
      patch.claimedLevelMilestones = [];
      patch.rankPoints = 0;
      patch.rankedMatchesPlayed = 0;
      patch.rankedLossStreak = 0;
      patch.lastRankedWinRp = 0;
      for (const slot of INITIAL_DECK_SLOTS) {
        await db
          .insert(playerDecks)
          .values({
            userId: target.id,
            slotId: slot.slotId,
            name: slot.name,
            cardIds: [],
            isActive: false,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [playerDecks.userId, playerDecks.slotId],
            set: { name: slot.name, cardIds: [], isActive: false, updatedAt: new Date() },
          });
      }
    } else if (action === 'add_gold_5000') {
      patch.gold = Math.min(9999999, target.gold + 5000);
    } else if (action === 'add_crystals_5000') {
      patch.crystals = Math.min(9999999, target.crystals + 5000);
    } else if (action === 'unlock_all_cosmetics') {
      patch.unlockedAvatarIds = CARD_AVATARS.map((a) => a.id);
      patch.unlockedPlaymats = [...ALL_PLAYMAT_IDS];
      patch.unlockedCardBacks = [...ALL_CARD_BACK_IDS];
    } else if (action === 'max_level_rank') {
      patch.level = MAX_ACCOUNT_LEVEL;
      patch.xp = 0;
      patch.claimedLevelMilestones = [10, 20, 30, 40, 50];
      patch.rankPoints = Math.max(CELESTIAL_MIN_POINTS, target.rankPoints);
      patch.rankedMatchesPlayed = Math.max(1, target.rankedMatchesPlayed ?? 0);
      patch.gold = Math.max(99999, target.gold);
      patch.crystals = Math.max(99999, target.crystals);
    }

    const updatedRows = await db
      .update(users)
      .set(patch)
      .where(eq(users.id, target.id))
      .returning();

    const updated = updatedRows[0];
    const isEditingSelf = Boolean(callerRow && callerRow.id === target.id);

    return {
      user: toAdminUserSummaryDTO(updated, collectible.length),
      ...(isEditingSelf ? { updatedCallerState: await buildPlayerStateDTO(updated) } : {}),
    };
  } catch (error: any) {
    if (
      error?.message === 'FORBIDDEN_NOT_ADMIN' ||
      error?.message === 'TARGET_USER_NOT_FOUND'
    ) {
      throw error;
    }
    console.error('Database query failed in adminExecuteActionOnTargetUser:', error);
    throw new Error('Falha ao executar comando administrativo no perfil selecionado.', {
      cause: error,
    });
  }
}

export const TUTORIAL_COMPLETION_GOLD_REWARD = 250;
export const TUTORIAL_COMPLETION_FREE_COMMON_PACKS = 1;

export async function claimTutorialRewardByUid(
  uid: string,
  email?: string
): Promise<{
  state: CloudPlayerStateDTO;
  claimedNow: boolean;
  goldAwarded: number;
  freeCommonPacksAwarded: number;
}> {
  try {
    const userRow = await findUserByUidOrEmail(uid, email);
    if (!userRow) {
      throw new Error('PLAYER_NOT_FOUND');
    }

    // Atomic conditional update prevents double-claiming under concurrent requests
    const updatedRows = await db
      .update(users)
      .set({
        gold: sql`${users.gold} + ${TUTORIAL_COMPLETION_GOLD_REWARD}`,
        pendingCommonPacks: sql`${users.pendingCommonPacks} + ${TUTORIAL_COMPLETION_FREE_COMMON_PACKS}`,
        tutorialRewardClaimed: true,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, userRow.id), eq(users.tutorialRewardClaimed, false)))
      .returning();

    if (updatedRows.length > 0) {
      return {
        state: await buildPlayerStateDTO(updatedRows[0]),
        claimedNow: true,
        goldAwarded: TUTORIAL_COMPLETION_GOLD_REWARD,
        freeCommonPacksAwarded: TUTORIAL_COMPLETION_FREE_COMMON_PACKS,
      };
    }

    // Already claimed previously — return fresh state without awarding gold or pack again
    const freshRow = await findUserByUidOrEmail(uid, email);
    return {
      state: await buildPlayerStateDTO(freshRow || userRow),
      claimedNow: false,
      goldAwarded: 0,
      freeCommonPacksAwarded: 0,
    };
  } catch (error: any) {
    if (error?.message === 'PLAYER_NOT_FOUND') {
      throw error;
    }
    console.error('Database query failed in claimTutorialRewardByUid:', error);
    throw new Error('Falha ao resgatar recompensa do tutorial.', { cause: error });
  }
}

