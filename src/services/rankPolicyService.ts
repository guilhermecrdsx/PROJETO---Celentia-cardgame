import { useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { isAdminUser } from './patchNotesService';
import { getInMemoryAuthToken } from './accountApi';
import {
  normalizeRankTierInput,
  type RankPolicyConfig,
  type RankTier,
} from '../utils/rankMath';

const DEFAULT_RANK_POLICY: RankPolicyConfig = {
  blockedFromTier: null,
};

function sanitizeRankPolicy(raw: unknown): RankPolicyConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_RANK_POLICY };
  const obj = raw as Record<string, unknown>;
  const rawVal = obj.blockedFromTier;
  if (rawVal === null || rawVal === undefined || rawVal === 'none' || rawVal === '') {
    return { blockedFromTier: null };
  }
  return {
    blockedFromTier: normalizeRankTierInput(rawVal),
  };
}

let cachedRankPolicy: RankPolicyConfig = { ...DEFAULT_RANK_POLICY };
let cachedUpdatedAtMs = 0;
const policyListeners = new Set<(policy: RankPolicyConfig) => void>();

function notifyPolicyListeners(next: RankPolicyConfig, incomingUpdatedAtMs?: number) {
  if (
    typeof incomingUpdatedAtMs === 'number' &&
    incomingUpdatedAtMs > 0 &&
    cachedUpdatedAtMs > 0 &&
    incomingUpdatedAtMs < cachedUpdatedAtMs
  ) {
    return;
  }
  if (typeof incomingUpdatedAtMs === 'number' && incomingUpdatedAtMs > cachedUpdatedAtMs) {
    cachedUpdatedAtMs = incomingUpdatedAtMs;
  }
  cachedRankPolicy = sanitizeRankPolicy(next);
  policyListeners.forEach((cb) => cb(cachedRankPolicy));
}

export function getCachedRankPolicy(): RankPolicyConfig {
  return cachedRankPolicy;
}

export async function fetchServerRankPolicy(): Promise<RankPolicyConfig> {
  try {
    const res = await fetch('/api/config/rank-policy', { cache: 'no-store' });
    if (!res.ok) return cachedRankPolicy;
    const data = await res.json();
    const serverUpdatedAtMs =
      typeof data?.updatedAtMs === 'number' ? data.updatedAtMs : 0;
    if (serverUpdatedAtMs > 0 || cachedUpdatedAtMs === 0) {
      const parsed = sanitizeRankPolicy(data?.policy);
      notifyPolicyListeners(parsed, serverUpdatedAtMs);
      return parsed;
    }
    return cachedRankPolicy;
  } catch {
    return cachedRankPolicy;
  }
}

async function resolveAdminAuthToken(forceRefresh = false): Promise<string | null> {
  const storedJwt =
    typeof window !== 'undefined'
      ? window.localStorage?.getItem('celentia_jwt_token')
      : null;
  if (auth.currentUser && (!storedJwt || forceRefresh)) {
    try {
      return await auth.currentUser.getIdToken(forceRefresh);
    } catch {
      // fallback
    }
  }
  const memToken = getInMemoryAuthToken() || storedJwt;
  if (memToken) return memToken;
  if (auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken(forceRefresh);
    } catch {
      return null;
    }
  }
  return null;
}

export async function saveRankPolicyConfig(
  blockedFromTier: RankTier | null
): Promise<{ policy: RankPolicyConfig; syncedFirestore: boolean }> {
  const sendSaveRequest = async (forceRefreshToken: boolean) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = await resolveAdminAuthToken(forceRefreshToken);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch('/api/admin/rank-policy', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ blockedFromTier: blockedFromTier ?? 'none' }),
    });
  };

  let res = await sendSaveRequest(false);
  if (res.status === 401 && auth.currentUser) {
    res = await sendSaveRequest(true);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Não foi possível salvar a política global de rank.');
  }

  const savedPolicy = sanitizeRankPolicy(data.policy ?? { blockedFromTier });
  const savedUpdatedAtMs =
    typeof data.updatedAtMs === 'number' ? data.updatedAtMs : Date.now();
  notifyPolicyListeners(savedPolicy, savedUpdatedAtMs);

  let syncedFirestore = false;
  const firebaseUser = auth.currentUser;
  if (isAdminUser(firebaseUser) && firebaseUser) {
    const path = 'game_config/rank_policy';
    try {
      await setDoc(doc(db, 'game_config', 'rank_policy'), {
        blockedFromTier: savedPolicy.blockedFromTier ?? 'none',
        updatedAt: serverTimestamp(),
        updatedBy: firebaseUser.uid,
      });
      syncedFirestore = true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  return { policy: savedPolicy, syncedFirestore };
}

export function useRankPolicy() {
  const [policy, setPolicy] = useState<RankPolicyConfig>(cachedRankPolicy);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;

    const handleCacheUpdate = (next: RankPolicyConfig) => {
      if (active) setPolicy(next);
    };
    policyListeners.add(handleCacheUpdate);

    void fetchServerRankPolicy().finally(() => {
      if (active) setLoading(false);
    });

    const configRef = doc(db, 'game_config', 'rank_policy');
    const unsubscribe = onSnapshot(
      configRef,
      (snap) => {
        if (!active) return;
        if (snap.exists()) {
          const snapData = snap.data();
          const snapUpdatedAtMs =
            typeof snapData?.updatedAt?.toMillis === 'function'
              ? snapData.updatedAt.toMillis()
              : 0;
          const parsed = sanitizeRankPolicy(snapData);
          notifyPolicyListeners(parsed, snapUpdatedAtMs || Date.now());
        }
        setLoading(false);
      },
      () => {
        if (active) setLoading(false);
      }
    );

    return () => {
      active = false;
      policyListeners.delete(handleCacheUpdate);
      unsubscribe();
    };
  }, []);

  return { policy, rankPolicy: policy, loading };
}
