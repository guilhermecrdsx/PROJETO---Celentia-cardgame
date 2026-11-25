import { useState, useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { PRESET_FIRE_LIGHTNING } from '../logic/deckFactory';
import { CARD_TEMPLATES } from '../data/cards';

import type { RankTier } from '../utils/rankMath';
import type { PackType } from '../data/packs';
import type { LevelMilestoneReward } from '../data/levelProgression';

export const NON_PURCHASABLE_ELEMENTS = new Set([
  'Divino',
  'Cósmico',
  'Sombrio',
  'Mágico',
]);

export function isEventExclusiveCard(cardId: string): boolean {
  const card = CARD_TEMPLATES.find((c) => c.id === cardId);
  if (!card) return false;
  return NON_PURCHASABLE_ELEMENTS.has(card.element);
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
  isAdmin?: boolean;
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
  tutorialRewardClaimed?: boolean;
  decks: CloudDeckSlotDTO[];
  activeSlotId: number;
  matches: CloudMatchRecordDTO[];
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

export const TIER_GOLD_COSTS: Record<number, number> = {
  1: 100,
  2: 200,
  3: 350,
  4: 550,
  5: 800,
  6: 1200,
};

export function getStarterCardIds(): string[] {
  return Array.from(new Set(PRESET_FIRE_LIGHTNING.cardIds));
}

export function getCollectibleCards() {
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

export function getCardUnlockCost(cardId: string): number {
  const card = CARD_TEMPLATES.find((c) => c.id === cardId);
  if (!card) return 200;
  return TIER_GOLD_COSTS[card.tier] ?? 200;
}

const AUTH_TOKEN_STORAGE_KEY = 'celentia_jwt_token';

function readStoredAuthToken(): string | null {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveStoredAuthToken(token: string) {
  try {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

function clearStoredAuthToken() {
  try {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

let memoryAuthToken: string | null = null;
let memoryPlayerState: CloudPlayerStateDTO | null = null;
let authInitializing = true;

type PlayerStateListener = (
  state: CloudPlayerStateDTO | null,
  initializing: boolean
) => void;
const listeners = new Set<PlayerStateListener>();

function notifyListeners() {
  listeners.forEach((listener) => listener(memoryPlayerState, authInitializing));
}

export function getInMemoryPlayerState(): CloudPlayerStateDTO | null {
  return memoryPlayerState;
}

export function getInMemoryAuthToken(): string | null {
  return memoryAuthToken;
}

export function isAuthInitializing(): boolean {
  return authInitializing;
}

export function setInMemoryPlayerState(nextState: CloudPlayerStateDTO | null) {
  memoryPlayerState = nextState;
  notifyListeners();
}

export function isCardUnlocked(cardId: string): boolean {
  if (!memoryPlayerState) {
    return getStarterCardIds().includes(cardId);
  }
  return memoryPlayerState.unlockedCardIds.includes(cardId);
}

export function subscribeToPlayerState(listener: PlayerStateListener): () => void {
  listeners.add(listener);
  listener(memoryPlayerState, authInitializing);
  return () => {
    listeners.delete(listener);
  };
}

export function useCloudPlayerState() {
  const [state, setState] = useState<CloudPlayerStateDTO | null>(memoryPlayerState);
  const [initializing, setInitializing] = useState<boolean>(authInitializing);

  useEffect(() => {
    return subscribeToPlayerState((nextState, nextInit) => {
      setState(nextState ? { ...nextState } : null);
      setInitializing(nextInit);
    });
  }, []);

  return { playerState: state, initializing };
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (!readStoredAuthToken() && auth.currentUser) {
    try {
      memoryAuthToken = await auth.currentUser.getIdToken();
    } catch {
      // Fall back to existing token
    }
  }

  if (memoryAuthToken) {
    headers['Authorization'] = `Bearer ${memoryAuthToken}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Erro na comunicação com o servidor (${response.status})`);
  }
  return data as T;
}

export async function registerWithCredentials(
  email: string,
  nickname: string,
  password: string
): Promise<CloudPlayerStateDTO> {
  const res = await apiRequest<{ token: string; player: CloudPlayerStateDTO }>(
    '/api/auth/register',
    {
      method: 'POST',
      body: JSON.stringify({ email, nickname, password }),
    }
  );
  memoryAuthToken = res.token;
  saveStoredAuthToken(res.token);
  authInitializing = false;
  setInMemoryPlayerState(res.player);
  return res.player;
}

export async function loginWithCredentials(
  identifier: string,
  password: string
): Promise<CloudPlayerStateDTO> {
  const res = await apiRequest<{ token: string; player: CloudPlayerStateDTO }>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }
  );
  memoryAuthToken = res.token;
  saveStoredAuthToken(res.token);
  authInitializing = false;
  setInMemoryPlayerState(res.player);
  return res.player;
}

export async function loginWithGooglePopup(): Promise<CloudPlayerStateDTO> {
  const credential = await signInWithPopup(auth, googleAuthProvider);
  const idToken = await credential.user.getIdToken();
  clearStoredAuthToken();
  memoryAuthToken = idToken;

  const res = await apiRequest<{ player: CloudPlayerStateDTO }>(
    '/api/auth/google',
    {
      method: 'POST',
      body: JSON.stringify({
        displayName: credential.user.displayName || undefined,
      }),
    }
  );
  authInitializing = false;
  setInMemoryPlayerState(res.player);
  return res.player;
}

let listenerInitialized = false;

export function initAuthSessionListener() {
  if (listenerInitialized) return;
  listenerInitialized = true;

  const restoreSession = async () => {
    const savedToken = readStoredAuthToken();
    if (savedToken) {
      memoryAuthToken = savedToken;
      try {
        const res = await apiRequest<{ player: CloudPlayerStateDTO }>('/api/player/state');
        authInitializing = false;
        setInMemoryPlayerState(res.player);
      } catch {
        memoryAuthToken = null;
        clearStoredAuthToken();
      }
    }

    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && !memoryPlayerState) {
        try {
          const idToken = await firebaseUser.getIdToken();
          memoryAuthToken = idToken;
          const res = await apiRequest<{ player: CloudPlayerStateDTO }>(
            '/api/auth/google',
            {
              method: 'POST',
              body: JSON.stringify({
                displayName: firebaseUser.displayName || undefined,
              }),
            }
          );
          authInitializing = false;
          setInMemoryPlayerState(res.player);
        } catch (err) {
          console.error('Falha ao restaurar sessão Google:', err);
          authInitializing = false;
          notifyListeners();
        }
      } else {
        authInitializing = false;
        notifyListeners();
      }
    });
  };

  void restoreSession();
}

export async function logoutPlayerAccount(): Promise<void> {
  memoryAuthToken = null;
  clearStoredAuthToken();
  setInMemoryPlayerState(null);
  try {
    if (auth.currentUser) {
      await signOut(auth);
    }
  } catch (err) {
    console.error('Erro ao encerrar sessão Firebase:', err);
  }
}

export async function syncProfileToCloud(input: {
  nickname?: string;
  preferredSide?: 'sol' | 'lua' | 'balance';
  avatarId?: string;
}): Promise<CloudPlayerStateDTO | null> {
  if (!memoryAuthToken || !memoryPlayerState) return null;

  const previousState = memoryPlayerState;
  memoryPlayerState = {
    ...memoryPlayerState,
    ...(input.nickname ? { nickname: input.nickname } : {}),
    ...(input.preferredSide ? { preferredSide: input.preferredSide } : {}),
    ...(input.avatarId ? { avatarId: input.avatarId } : {}),
  };
  notifyListeners();

  try {
    const res = await apiRequest<{ player: CloudPlayerStateDTO }>(
      '/api/player/profile',
      {
        method: 'PUT',
        body: JSON.stringify(input),
      }
    );
    setInMemoryPlayerState(res.player);
    return res.player;
  } catch (err) {
    // Roll back optimistic state and surface the exact validation/uniqueness error
    setInMemoryPlayerState(previousState);
    throw err;
  }
}

export async function syncDeckSlotToCloud(input: {
  slotId: number;
  name: string;
  cardIds: string[];
  setActive?: boolean;
}): Promise<CloudPlayerStateDTO | null> {
  if (!memoryAuthToken || !memoryPlayerState) return null;

  const updatedDecks = memoryPlayerState.decks.map((d) =>
    d.slotId === input.slotId
      ? {
          ...d,
          name: input.name,
          cardIds: [...input.cardIds],
          isActive: input.setActive ? true : d.isActive,
          updatedAt: Date.now(),
        }
      : input.setActive
        ? { ...d, isActive: false }
        : d
  );

  memoryPlayerState = {
    ...memoryPlayerState,
    decks: updatedDecks,
    ...(input.setActive ? { activeSlotId: input.slotId } : {}),
  };
  notifyListeners();

  try {
    const res = await apiRequest<{ player: CloudPlayerStateDTO }>(
      '/api/player/decks',
      {
        method: 'PUT',
        body: JSON.stringify(input),
      }
    );
    setInMemoryPlayerState(res.player);
    return res.player;
  } catch (err) {
    console.error('Erro ao salvar baralho na nuvem:', err);
    return memoryPlayerState;
  }
}

export async function unlockCardWithGoldInCloud(
  cardId: string
): Promise<{
  player: CloudPlayerStateDTO;
  unlockedCardId: string;
  costPaid: number;
}> {
  const res = await apiRequest<{
    player: CloudPlayerStateDTO;
    unlockedCardId: string;
    costPaid: number;
  }>('/api/player/unlock-card', {
    method: 'POST',
    body: JSON.stringify({ cardId }),
  });
  setInMemoryPlayerState(res.player);
  return res;
}

export async function unlockAvatarInCloud(
  avatarId: string,
  equip = true
): Promise<{
  player: CloudPlayerStateDTO;
  unlockedAvatarId: string;
  costPaid: number;
}> {
  const res = await apiRequest<{
    player: CloudPlayerStateDTO;
    unlockedAvatarId: string;
    costPaid: number;
  }>('/api/player/unlock-avatar', {
    method: 'POST',
    body: JSON.stringify({ avatarId, equip }),
  });
  setInMemoryPlayerState(res.player);
  return res;
}

export async function openPackInCloud(
  packType: PackType,
  useFreeCommonPack = false
): Promise<{
  player: CloudPlayerStateDTO;
  packType: PackType;
  costPaid: number;
  usedFreePack: boolean;
  drops: PackDropItemDTO[];
  totalRefundGold: number;
}> {
  const res = await apiRequest<{
    player: CloudPlayerStateDTO;
    packType: PackType;
    costPaid: number;
    usedFreePack: boolean;
    drops: PackDropItemDTO[];
    totalRefundGold: number;
  }>('/api/player/open-pack', {
    method: 'POST',
    body: JSON.stringify({ packType, useFreeCommonPack }),
  });
  setInMemoryPlayerState(res.player);
  return res;
}

export async function syncCompletedMatchToCloud(input: {
  result: 'victory' | 'defeat';
  deckName: string;
  rpChange: number;
  opponentName: string;
  opponentRank?: string;
  mode?: 'pvp_normal' | 'pvp_ranked' | 'pvia';
}): Promise<{
  player: CloudPlayerStateDTO;
  rewards: {
    goldEarned: number;
    xpEarned: number;
    leveledUp: boolean;
    newLevel: number;
    rpDeltaApplied?: number;
    milestoneRewards?: LevelMilestoneReward[];
    commonPacksGained?: number;
  };
} | null> {
  if (!memoryAuthToken || !memoryPlayerState) return null;

  try {
    const res = await apiRequest<{
      player: CloudPlayerStateDTO;
      rewards: {
        goldEarned: number;
        xpEarned: number;
        leveledUp: boolean;
        newLevel: number;
        rpDeltaApplied?: number;
        milestoneRewards?: LevelMilestoneReward[];
        commonPacksGained?: number;
      };
    }>('/api/player/match-complete', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setInMemoryPlayerState(res.player);
    return res;
  } catch (err) {
    console.error('Erro ao salvar resultado da partida na nuvem:', err);
    return null;
  }
}

export async function executeAdminActionInCloud(
  action:
    | 'unlock_all_cards'
    | 'grant_event_classes'
    | 'reset_starter_cards'
    | 'add_gold_5000'
    | 'max_level_rank'
): Promise<CloudPlayerStateDTO> {
  const res = await apiRequest<{ player: CloudPlayerStateDTO }>(
    '/api/player/admin-action',
    {
      method: 'POST',
      body: JSON.stringify({ action }),
    }
  );
  setInMemoryPlayerState(res.player);
  return res.player;
}

export async function searchPlayersInCloud(
  query: string
): Promise<PublicPlayerSummaryDTO[]> {
  const encoded = encodeURIComponent(query.trim());
  const res = await apiRequest<{ players: PublicPlayerSummaryDTO[] }>(
    `/api/players/search?q=${encoded}`
  );
  return res.players || [];
}

export async function getPublicPlayerProfileInCloud(
  identifier: string
): Promise<PublicPlayerProfileDTO> {
  const encoded = encodeURIComponent(identifier.trim());
  const res = await apiRequest<{ profile: PublicPlayerProfileDTO }>(
    `/api/players/profile/${encoded}`
  );
  return res.profile;
}

export async function adminFetchUsersInCloud(
  query = ''
): Promise<AdminUserSummaryDTO[]> {
  const encoded = encodeURIComponent(query.trim());
  const res = await apiRequest<{ users: AdminUserSummaryDTO[] }>(
    `/api/admin/users?q=${encoded}`
  );
  return res.users || [];
}

export async function adminUpdateUserInCloud(
  targetUid: string,
  patch: {
    nickname?: string;
    gold?: number;
    level?: number;
    xp?: number;
    rankPoints?: number;
    preferredSide?: 'sol' | 'lua' | 'balance';
    rankBlockedTotal?: boolean;
    rankBlockFromTier?: RankTier | null;
  }
): Promise<AdminUserSummaryDTO> {
  const res = await apiRequest<{
    user: AdminUserSummaryDTO;
    updatedCallerState?: CloudPlayerStateDTO;
  }>(`/api/admin/users/${encodeURIComponent(targetUid)}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
  if (res.updatedCallerState) {
    setInMemoryPlayerState(res.updatedCallerState);
  }
  return res.user;
}

export async function adminRunActionOnUserInCloud(
  targetUid: string,
  action:
    | 'unlock_all_cards'
    | 'grant_event_classes'
    | 'reset_starter_cards'
    | 'add_gold_5000'
    | 'max_level_rank'
): Promise<AdminUserSummaryDTO> {
  const res = await apiRequest<{
    user: AdminUserSummaryDTO;
    updatedCallerState?: CloudPlayerStateDTO;
  }>(`/api/admin/users/${encodeURIComponent(targetUid)}/action`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
  if (res.updatedCallerState) {
    setInMemoryPlayerState(res.updatedCallerState);
  }
  return res.user;
}

export async function adminDeliverCardInCloud(
  targetUid: string,
  cardId: string
): Promise<{
  user: AdminUserSummaryDTO;
  deliveredCardId: string;
  alreadyOwned: boolean;
}> {
  const res = await apiRequest<{
    user: AdminUserSummaryDTO;
    deliveredCardId: string;
    alreadyOwned: boolean;
    updatedCallerState?: CloudPlayerStateDTO;
  }>(`/api/admin/users/${encodeURIComponent(targetUid)}/deliver-card`, {
    method: 'POST',
    body: JSON.stringify({ cardId }),
  });
  if (res.updatedCallerState) {
    setInMemoryPlayerState(res.updatedCallerState);
  }
  return {
    user: res.user,
    deliveredCardId: res.deliveredCardId,
    alreadyOwned: res.alreadyOwned,
  };
}

export async function adminDeliverAvatarInCloud(
  targetUid: string,
  avatarId: string | 'ALL'
): Promise<{
  user: AdminUserSummaryDTO;
  grantedAvatarIds: string[];
}> {
  const res = await apiRequest<{
    user: AdminUserSummaryDTO;
    grantedAvatarIds: string[];
    updatedCallerState?: CloudPlayerStateDTO;
  }>(`/api/admin/users/${encodeURIComponent(targetUid)}/deliver-avatar`, {
    method: 'POST',
    body: JSON.stringify({ avatarId }),
  });
  if (res.updatedCallerState) {
    setInMemoryPlayerState(res.updatedCallerState);
  }
  return {
    user: res.user,
    grantedAvatarIds: res.grantedAvatarIds,
  };
}

export async function adminGrantResourcesInCloud(
  targetUid: string,
  payload: {
    addXp?: number;
    addRankPoints?: number;
    addGold?: number;
  }
): Promise<{
  user: AdminUserSummaryDTO;
  xpAdded: number;
  rpAdded: number;
  goldAdded: number;
  leveledUp: boolean;
  newLevel: number;
  milestoneRewards: LevelMilestoneReward[];
}> {
  const res = await apiRequest<{
    user: AdminUserSummaryDTO;
    xpAdded: number;
    rpAdded: number;
    goldAdded: number;
    leveledUp: boolean;
    newLevel: number;
    milestoneRewards: LevelMilestoneReward[];
    updatedCallerState?: CloudPlayerStateDTO;
  }>(`/api/admin/users/${encodeURIComponent(targetUid)}/grant-resources`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res.updatedCallerState) {
    setInMemoryPlayerState(res.updatedCallerState);
  }
  return {
    user: res.user,
    xpAdded: res.xpAdded,
    rpAdded: res.rpAdded,
    goldAdded: res.goldAdded,
    leveledUp: res.leveledUp,
    newLevel: res.newLevel,
    milestoneRewards: res.milestoneRewards || [],
  };
}

export async function claimTutorialRewardInCloud(): Promise<{
  player: CloudPlayerStateDTO;
  claimedNow: boolean;
  goldAwarded: number;
}> {
  const res = await apiRequest<{
    player: CloudPlayerStateDTO;
    claimedNow: boolean;
    goldAwarded: number;
  }>('/api/player/claim-tutorial-reward', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  setInMemoryPlayerState(res.player);
  return res;
}


