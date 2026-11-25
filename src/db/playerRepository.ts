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
  DUPLICATE_CARD_GOLD_REFUND,
  PACK_MAP,
  type PackType,
  rollWeightedLuckyTier,
} from '../data/packs.ts';
import {
  MAX_ACCOUNT_LEVEL,
  XP_PER_ACCOUNT_LEVEL,
  applyAccountXpProgress,
  normalizeClaimedMilestones,
  type LevelMilestoneReward,
} from '../data/levelProgression.ts';
import { normalizeRankTierInput, type RankTier } from '../utils/rankMath.ts';
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
  xpEarned: number;
  opponentName: string;
  opponentRank: string;
  date: string;
  mode: 'pvp_normal' | 'pvp_ranked' | 'pvia';
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
  rankPoints: number;
  preferredSide: 'sol' | 'lua' | 'balance';
  avatarId: string;
  unlockedAvatarIds: string[];
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

export interface PublicPlayerProfileDTO extends PublicPlayerSummaryDTO {
  xp: number;
  recentMatches: CloudMatchRecordDTO[];
}

export interface AdminUserSummaryDTO extends PublicPlayerSummaryDTO {
  email: string;
  xp: number;
  gold: number;
  unlockedCardIds: string[];
  unlockedAvatarIds: string[];
  pendingCommonPacks: number;
  claimedLevelMilestones: number[];
  createdAt: string;
}

export interface PackDropItemDTO {
  cardId: string;
  tier: 1 | 2 | 3 | 4 | 5;
  isDuplicate: boolean;
  refundGold: number;
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

export const TIER_UNLOCK_COSTS: Record<number, number> = {
  1: 100,
  2: 200,
  3: 350,
  4: 550,
  5: 800,
  6: 1200,
};

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
    name: PRESET_FIRE_LIGHTNING.name,
    cardIds: [...PRESET_FIRE_LIGHTNING.cardIds],
    isActive: true,
  },
  {
    slotId: 2,
    name: PRESET_FIRE_LIGHTNING.name,
    cardIds: [...PRESET_FIRE_LIGHTNING.cardIds],
    isActive: false,
  },
  {
    slotId: 3,
    name: PRESET_FIRE_LIGHTNING.name,
    cardIds: [...PRESET_FIRE_LIGHTNING.cardIds],
    isActive: false,
  },
];

function formatDatePtBr(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
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
    const clampedLevel = Math.max(1, Math.min(MAX_ACCOUNT_LEVEL, userRow.level || 1));
    const clampedXp = clampedLevel >= MAX_ACCOUNT_LEVEL ? 0 : Math.max(0, userRow.xp || 0);

    if (
      mergedUnlocked.length !== currentUnlocked.length ||
      validAvatarId !== userRow.avatarId ||
      clampedLevel !== userRow.level ||
      clampedXp !== userRow.xp
    ) {
      await db
        .update(users)
        .set({
          unlockedCardIds: mergedUnlocked,
          avatarId: validAvatarId,
          level: clampedLevel,
          xp: clampedXp,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userRow.id));
    }

    const sortedDecks: CloudDeckSlotDTO[] = [1, 2, 3].map((slotNum) => {
      const found = deckRows.find((d) => d.slotId === slotNum);
      const fallback = INITIAL_DECK_SLOTS[slotNum - 1];
      return {
        slotId: slotNum,
        name: found?.name || fallback.name,
        cardIds:
          Array.isArray(found?.cardIds) && found.cardIds.length === 20
            ? found.cardIds
            : fallback.cardIds,
        isActive: Boolean(found?.isActive),
        updatedAt: found?.updatedAt ? new Date(found.updatedAt).getTime() : Date.now(),
      };
    });

    const activeSlot = sortedDecks.find((d) => d.isActive)?.slotId || 1;

    const formattedMatches: CloudMatchRecordDTO[] = matchRows.map((m) => ({
      id: `match_${m.id}`,
      result: m.result === 'victory' ? 'victory' : 'defeat',
      deckName: m.deckName,
      deckCode: m.deckCode || '2/303',
      rpChange: m.rpChange,
      goldEarned: m.goldEarned,
      xpEarned: m.xpEarned,
      opponentName: m.opponentName,
      opponentRank: m.opponentRank,
      date: formatDatePtBr(new Date(m.playedAt)),
      mode:
        m.mode === 'pvp_normal' || m.mode === 'pvp_ranked' || m.mode === 'pvia'
          ? m.mode
          : m.mode === 'pvp_local'
          ? 'pvp_normal'
          : 'pvp_ranked',
    }));

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
      xpForNextLevel: XP_PER_ACCOUNT_LEVEL,
      gold: userRow.gold,
      rankPoints: userRow.rankPoints,
      preferredSide: side,
      avatarId: validAvatarId,
      unlockedAvatarIds: mergedAvatars,
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

    const result = await db
      .insert(users)
      .values({
        uid,
        email: cleanEmail,
        nickname: uniqueHandle,
        level: isAdminEmail ? MAX_ACCOUNT_LEVEL : 1,
        xp: 0,
        gold: isAdminEmail ? 99999 : 1000,
        rankPoints: isAdminEmail ? 1700 : 0,
        preferredSide: 'balance',
        avatarId: DEFAULT_AVATAR_ID,
        unlockedAvatarIds: initialAvatars,
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
        gold: 1000,
        rankPoints: 0,
        preferredSide: 'balance',
        avatarId: DEFAULT_AVATAR_ID,
        unlockedAvatarIds: FREE_AVATAR_IDS,
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

    const updated = await db
      .update(users)
      .set({
        nickname: nextNick,
        preferredSide: nextSide,
        avatarId: nextAvatarId,
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
  email?: string,
  equipAfterUnlock = true
): Promise<{ state: CloudPlayerStateDTO; unlockedAvatarId: string; costPaid: number }> {
  try {
    const userRow = await findUserByUidOrEmail(uid, email);
    if (!userRow) {
      throw new Error('Conta não localizada.');
    }

    const avatar = CARD_AVATARS.find((a) => a.id === avatarId);
    if (!avatar) {
      throw new Error('AVATAR_NOT_FOUND');
    }

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
        };
      }
      return {
        state: await buildPlayerStateDTO(userRow),
        unlockedAvatarId: avatarId,
        costPaid: 0,
      };
    }

    if (userRow.gold < avatar.cost) {
      throw new Error('INSUFFICIENT_GOLD');
    }

    mergedAvatars.add(avatarId);
    const updated = await db
      .update(users)
      .set({
        gold: userRow.gold - avatar.cost,
        unlockedAvatarIds: Array.from(mergedAvatars),
        ...(equipAfterUnlock ? { avatarId } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userRow.id))
      .returning();

    return {
      state: await buildPlayerStateDTO(updated[0]),
      unlockedAvatarId: avatarId,
      costPaid: avatar.cost,
    };
  } catch (error: any) {
    if (error?.message === 'AVATAR_NOT_FOUND' || error?.message === 'INSUFFICIENT_GOLD') {
      throw error;
    }
    console.error('Database query failed in unlockAvatarByUid:', error);
    throw new Error('Não foi possível desbloquear este avatar.', { cause: error });
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
    const slotId = Math.min(3, Math.max(1, Number(payload.slotId) || 1));
    const cleanName = (payload.name || `Baralho Personalizado ${slotId}`).trim().slice(0, 40);

    await ensureDefaultDecksForUser(userRow.id);

    if (payload.setActive) {
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
        cardIds: payload.cardIds,
        isActive: Boolean(payload.setActive),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [playerDecks.userId, playerDecks.slotId],
        set: {
          name: cleanName,
          cardIds: payload.cardIds,
          ...(payload.setActive !== undefined ? { isActive: Boolean(payload.setActive) } : {}),
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
  email?: string
): Promise<{ state: CloudPlayerStateDTO; unlockedCardId: string; costPaid: number }> {
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

    const currentUnlocked = new Set<string>([
      ...getStarterUnlockedCardIds(),
      ...(Array.isArray(userRow.unlockedCardIds) ? userRow.unlockedCardIds : []),
    ]);

    if (currentUnlocked.has(cardId)) {
      return {
        state: await buildPlayerStateDTO(userRow),
        unlockedCardId: cardId,
        costPaid: 0,
      };
    }

    const cost = TIER_UNLOCK_COSTS[template.tier] || 200;
    if (userRow.gold < cost) {
      throw new Error('INSUFFICIENT_GOLD');
    }

    currentUnlocked.add(cardId);
    const updatedList = Array.from(currentUnlocked);

    const updated = await db
      .update(users)
      .set({
        gold: userRow.gold - cost,
        unlockedCardIds: updatedList,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userRow.id))
      .returning();

    return {
      state: await buildPlayerStateDTO(updated[0]),
      unlockedCardId: cardId,
      costPaid: cost,
    };
  } catch (error: any) {
    if (
      error?.message === 'INSUFFICIENT_GOLD' ||
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
  totalRefundGold: number;
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
    let totalRefundGold = 0;

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
      const refundGold = isDuplicate ? DUPLICATE_CARD_GOLD_REFUND[effectiveTier] : 0;
      if (!isDuplicate) {
        currentUnlocked.add(chosen.id);
      } else {
        totalRefundGold += refundGold;
      }

      drops.push({
        cardId: chosen.id,
        tier: effectiveTier,
        isDuplicate,
        refundGold,
      });
    }

    const nextPending = useFree ? Math.max(0, currentPending - 1) : currentPending;
    const nextGold = Math.min(9999999, Math.max(0, userRow.gold - costPaid + totalRefundGold));

    const updated = await db
      .update(users)
      .set({
        gold: nextGold,
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
      totalRefundGold,
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
    rpChange: number;
    opponentName: string;
    opponentRank?: string;
    mode?: 'pvp_normal' | 'pvp_ranked' | 'pvia';
  },
  email?: string
): Promise<{
  state: CloudPlayerStateDTO;
  rewards: {
    goldEarned: number;
    xpEarned: number;
    leveledUp: boolean;
    newLevel: number;
    rpDeltaApplied: number;
    milestoneRewards: LevelMilestoneReward[];
    commonPacksGained: number;
  };
}> {
  try {
    const userRow = await findUserByUidOrEmail(uid, email);
    if (!userRow) {
      throw new Error('Conta não localizada.');
    }

    const isVictory = payload.result === 'victory';
    const matchGold = isVictory ? 150 : 50;
    const xpEarned = isVictory ? 120 : 40;
    const requestedRpDelta = Number(payload.rpChange) || 0;
    const effectiveRpDelta = userRow.rankBlockedTotal ? 0 : requestedRpDelta;

    const xpProg = applyAccountXpProgress({
      currentLevel: userRow.level,
      currentXp: userRow.xp,
      claimedMilestones: normalizeClaimedMilestones(userRow.claimedLevelMilestones),
      addedXp: xpEarned,
    });

    const totalGoldEarned = matchGold + xpProg.goldGained;
    const nextGold = Math.min(9999999, userRow.gold + totalGoldEarned);
    const nextPendingPacks = Math.min(
      999,
      Math.max(0, (userRow.pendingCommonPacks ?? 0) + xpProg.commonPacksGained)
    );
    const nextRankPoints = Math.max(0, userRow.rankPoints + effectiveRpDelta);
    const nextWins = isVictory ? userRow.wins + 1 : userRow.wins;
    const nextLosses = !isVictory ? userRow.losses + 1 : userRow.losses;

    const updatedUsers = await db
      .update(users)
      .set({
        level: xpProg.level,
        xp: xpProg.xp,
        gold: nextGold,
        pendingCommonPacks: nextPendingPacks,
        claimedLevelMilestones: xpProg.claimedMilestones,
        rankPoints: nextRankPoints,
        wins: nextWins,
        losses: nextLosses,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userRow.id))
      .returning();

    await db.insert(matchHistory).values({
      userId: userRow.id,
      result: isVictory ? 'victory' : 'defeat',
      deckName: payload.deckName || PRESET_FIRE_LIGHTNING.name,
      deckCode: '2/303',
      rpChange: effectiveRpDelta,
      goldEarned: totalGoldEarned,
      xpEarned,
      opponentName: payload.opponentName || 'Guardião de Celentia',
      opponentRank: payload.opponentRank || 'Bronze III',
      mode: payload.mode || 'pvp_ranked',
      playedAt: new Date(),
    });

    return {
      state: await buildPlayerStateDTO(updatedUsers[0]),
      rewards: {
        goldEarned: totalGoldEarned,
        xpEarned,
        leveledUp: xpProg.levelsGained > 0,
        newLevel: xpProg.level,
        rpDeltaApplied: effectiveRpDelta,
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

    // 1. Seed ADMIN Profile (All cards & avatars unlocked, 99,999 Gold, Level 50, Rank Celestial I = 1700 RP)
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
        rankPoints: 1700,
        preferredSide: 'sol',
        avatarId: 'av_n_helio',
        unlockedAvatarIds: allAvatarIds,
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
          updatedAt: new Date(),
        },
      })
      .returning();

    if (adminRows[0]) {
      await ensureDefaultDecksForUser(adminRows[0].id);
    }

    // 2. Seed NOVATO Profile (Starter cards & 10 free avatars, 1,000 Gold, Level 1, Rank Bronze III 0 RP)
    const starterRows = await db
      .insert(users)
      .values({
        uid: 'seed_novato_starter',
        email: 'novato@celentia.com',
        nickname: '@novato',
        passwordHash: starterPasswordHash,
        level: 1,
        xp: 0,
        gold: 1000,
        rankPoints: 0,
        preferredSide: 'balance',
        avatarId: DEFAULT_AVATAR_ID,
        unlockedAvatarIds: FREE_AVATAR_IDS,
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
      patch.gold = 1000;
      patch.level = 1;
      patch.xp = 0;
      patch.pendingCommonPacks = 0;
      patch.claimedLevelMilestones = [];
      patch.rankPoints = 0;
    } else if (action === 'add_gold_5000') {
      patch.gold = Math.min(9999999, userRow.gold + 5000);
    } else if (action === 'max_level_rank') {
      patch.level = MAX_ACCOUNT_LEVEL;
      patch.xp = 0;
      patch.claimedLevelMilestones = [10, 20, 30, 40, 50];
      patch.rankPoints = Math.max(1700, userRow.rankPoints);
      patch.gold = Math.max(99999, userRow.gold);
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
    gold: row.gold,
    unlockedCardIds: unlockedCards,
    unlockedAvatarIds: resolveMergedAvatars(row.unlockedAvatarIds),
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

    const recentMatches: CloudMatchRecordDTO[] = matchRows.map((m) => ({
      id: `match_${m.id}`,
      result: m.result === 'victory' ? 'victory' : 'defeat',
      deckName: m.deckName,
      deckCode: m.deckCode || '2/303',
      rpChange: m.rpChange,
      goldEarned: m.goldEarned,
      xpEarned: m.xpEarned,
      opponentName: m.opponentName,
      opponentRank: m.opponentRank,
      date: formatDatePtBr(new Date(m.playedAt)),
      mode:
        m.mode === 'pvp_normal' || m.mode === 'pvp_ranked' || m.mode === 'pvia'
          ? m.mode
          : m.mode === 'pvp_local'
          ? 'pvp_normal'
          : 'pvp_ranked',
    }));

    const totalCollectible = getCollectibleCardTemplates().length;
    const summary = toPublicSummaryDTO(row, totalCollectible);
    return {
      ...summary,
      xp: summary.level >= MAX_ACCOUNT_LEVEL ? 0 : row.xp,
      recentMatches,
    };
  } catch (error) {
    console.error('Database query failed in getPublicPlayerProfileByIdentifier:', error);
    throw new Error('Não foi possível carregar o perfil do jogador.', { cause: error });
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
    let nextLevel = target.level;
    if (updates.level !== undefined && Number.isFinite(Number(updates.level))) {
      nextLevel = Math.max(1, Math.min(MAX_ACCOUNT_LEVEL, Math.floor(Number(updates.level))));
      patch.level = nextLevel;
    }
    if (updates.xp !== undefined && Number.isFinite(Number(updates.xp))) {
      patch.xp = nextLevel >= MAX_ACCOUNT_LEVEL ? 0 : Math.max(0, Math.min(499, Math.floor(Number(updates.xp))));
    } else if (nextLevel >= MAX_ACCOUNT_LEVEL) {
      patch.xp = 0;
    }
    if (updates.rankPoints !== undefined && Number.isFinite(Number(updates.rankPoints))) {
      patch.rankPoints = Math.max(0, Math.min(99999, Math.floor(Number(updates.rankPoints))));
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
  }
): Promise<{
  user: AdminUserSummaryDTO;
  updatedCallerState?: CloudPlayerStateDTO;
  granted: {
    xpAdded: number;
    goldAdded: number;
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

    const xpProg = applyAccountXpProgress({
      currentLevel: target.level,
      currentXp: target.xp,
      claimedMilestones: normalizeClaimedMilestones(target.claimedLevelMilestones),
      addedXp: safeAddXp,
    });

    const nextGold = Math.min(9999999, target.gold + safeAddGold + xpProg.goldGained);
    const nextPendingPacks = Math.min(
      999,
      Math.max(0, (target.pendingCommonPacks ?? 0) + xpProg.commonPacksGained)
    );
    const nextRankPoints = Math.min(99999, Math.max(0, target.rankPoints + safeAddRp));

    const updatedRows = await db
      .update(users)
      .set({
        level: xpProg.level,
        xp: xpProg.xp,
        gold: nextGold,
        pendingCommonPacks: nextPendingPacks,
        claimedLevelMilestones: xpProg.claimedMilestones,
        rankPoints: nextRankPoints,
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
      patch.gold = 1000;
      patch.level = 1;
      patch.xp = 0;
      patch.pendingCommonPacks = 0;
      patch.claimedLevelMilestones = [];
      patch.rankPoints = 0;
    } else if (action === 'add_gold_5000') {
      patch.gold = Math.min(9999999, target.gold + 5000);
    } else if (action === 'max_level_rank') {
      patch.level = MAX_ACCOUNT_LEVEL;
      patch.xp = 0;
      patch.claimedLevelMilestones = [10, 20, 30, 40, 50];
      patch.rankPoints = Math.max(1700, target.rankPoints);
      patch.gold = Math.max(99999, target.gold);
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

export async function claimTutorialRewardByUid(
  uid: string,
  email?: string
): Promise<{
  state: CloudPlayerStateDTO;
  claimedNow: boolean;
  goldAwarded: number;
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
      };
    }

    // Already claimed previously — return fresh state without awarding gold again
    const freshRow = await findUserByUidOrEmail(uid, email);
    return {
      state: await buildPlayerStateDTO(freshRow || userRow),
      claimedNow: false,
      goldAwarded: 0,
    };
  } catch (error: any) {
    if (error?.message === 'PLAYER_NOT_FOUND') {
      throw error;
    }
    console.error('Database query failed in claimTutorialRewardByUid:', error);
    throw new Error('Falha ao resgatar recompensa do tutorial.', { cause: error });
  }
}

