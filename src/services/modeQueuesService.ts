import { useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { isAdminUser } from './patchNotesService';
import { getInMemoryAuthToken } from './accountApi';

export type GameModeQueueId =
  | 'pvp_ranked'
  | 'pvp_normal'
  | 'pvia'
  | 'testing_arena'
  | 'tutorial';

export interface ModeQueueStatus {
  enabled: boolean;
  reason: string;
}

export type ModeQueuesMap = Record<GameModeQueueId, ModeQueueStatus>;

export const GAME_MODE_QUEUE_META: Array<{
  id: GameModeQueueId;
  label: string;
  shortLabel: string;
  description: string;
  defaultReason: string;
  accent: 'amber' | 'sky' | 'purple' | 'cyan' | 'emerald';
}> = [
  {
    id: 'pvp_ranked',
    label: 'PvP Ranqueado',
    shortLabel: 'Ranqueado',
    description: 'Fila competitiva oficial valendo Pontos de Rank (RP) e elos.',
    defaultReason: 'Fila Ranqueada temporariamente indisponível para manutenção.',
    accent: 'amber',
  },
  {
    id: 'pvp_normal',
    label: 'PvP Normal',
    shortLabel: 'PvP Normal',
    description: 'Salas online locais para duelos casuais sem risco de RP.',
    defaultReason: 'Salas PvP Normal temporariamente indisponíveis.',
    accent: 'sky',
  },
  {
    id: 'pvia',
    label: 'Modo PvIA',
    shortLabel: 'PvIA',
    description: 'Batalhas solo imediatas contra a inteligência tática.',
    defaultReason: 'Modo PvIA em manutenção temporária.',
    accent: 'purple',
  },
  {
    id: 'testing_arena',
    label: 'Arena de Testes',
    shortLabel: 'Arena Testes',
    description: 'Laboratório sandbox para testar combos e evoluções livremente.',
    defaultReason: 'Arena de Testes em manutenção temporária.',
    accent: 'cyan',
  },
  {
    id: 'tutorial',
    label: 'Tutorial Interativo',
    shortLabel: 'Tutorial',
    description: 'Partida prática guiada passo a passo sobre o campo real.',
    defaultReason: 'Tutorial Interativo temporariamente indisponível.',
    accent: 'emerald',
  },
];

export const DEFAULT_MODE_QUEUES: ModeQueuesMap = {
  pvp_ranked: { enabled: true, reason: '' },
  pvp_normal: { enabled: true, reason: '' },
  pvia: { enabled: true, reason: '' },
  testing_arena: { enabled: true, reason: '' },
  tutorial: { enabled: true, reason: '' },
};

const ALL_QUEUE_IDS: GameModeQueueId[] = [
  'pvp_ranked',
  'pvp_normal',
  'pvia',
  'testing_arena',
  'tutorial',
];

export function sanitizeModeQueues(raw: unknown): ModeQueuesMap {
  const result: ModeQueuesMap = {
    pvp_ranked: { ...DEFAULT_MODE_QUEUES.pvp_ranked },
    pvp_normal: { ...DEFAULT_MODE_QUEUES.pvp_normal },
    pvia: { ...DEFAULT_MODE_QUEUES.pvia },
    testing_arena: { ...DEFAULT_MODE_QUEUES.testing_arena },
    tutorial: { ...DEFAULT_MODE_QUEUES.tutorial },
  };

  if (!raw || typeof raw !== 'object') return result;
  const obj = raw as Record<string, unknown>;

  for (const id of ALL_QUEUE_IDS) {
    const entry = obj[id];
    if (entry && typeof entry === 'object') {
      const e = entry as Record<string, unknown>;
      result[id] = {
        enabled: typeof e.enabled === 'boolean' ? e.enabled : true,
        reason: typeof e.reason === 'string' ? e.reason.trim().slice(0, 140) : '',
      };
    }
  }

  return result;
}

// Local in-memory broadcast cache + freshness timestamp so Express & Firestore never overwrite newer updates
let cachedQueues: ModeQueuesMap = sanitizeModeQueues(DEFAULT_MODE_QUEUES);
let cachedUpdatedAtMs = 0;
const queueListeners = new Set<(queues: ModeQueuesMap) => void>();

function notifyQueueListeners(next: ModeQueuesMap, incomingUpdatedAtMs?: number) {
  if (
    typeof incomingUpdatedAtMs === 'number' &&
    incomingUpdatedAtMs > 0 &&
    cachedUpdatedAtMs > 0 &&
    incomingUpdatedAtMs < cachedUpdatedAtMs
  ) {
    // Ignore stale snapshots that are older than the latest applied config
    return;
  }
  if (typeof incomingUpdatedAtMs === 'number' && incomingUpdatedAtMs > cachedUpdatedAtMs) {
    cachedUpdatedAtMs = incomingUpdatedAtMs;
  }
  cachedQueues = sanitizeModeQueues(next);
  queueListeners.forEach((cb) => cb(cachedQueues));
}

export function getCachedModeQueues(): ModeQueuesMap {
  return cachedQueues;
}

export async function fetchServerModeQueues(): Promise<ModeQueuesMap> {
  try {
    const res = await fetch('/api/config/queues', { cache: 'no-store' });
    if (!res.ok) return cachedQueues;
    const data = await res.json();
    const serverUpdatedAtMs =
      typeof data?.updatedAtMs === 'number' ? data.updatedAtMs : 0;
    // Only apply server state if it has been updated at least once or we have no fresher Firestore snapshot
    if (serverUpdatedAtMs > 0 || cachedUpdatedAtMs === 0) {
      const parsed = sanitizeModeQueues(data?.queues);
      notifyQueueListeners(parsed, serverUpdatedAtMs);
      return parsed;
    }
    return cachedQueues;
  } catch {
    return cachedQueues;
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
      // Fallback to in-memory or stored token below
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

export async function saveModeQueuesConfig(
  nextQueues: ModeQueuesMap
): Promise<{ queues: ModeQueuesMap; syncedFirestore: boolean }> {
  const sanitized = sanitizeModeQueues(nextQueues);

  const sendSaveRequest = async (forceRefreshToken: boolean) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = await resolveAdminAuthToken(forceRefreshToken);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch('/api/admin/queues', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ queues: sanitized }),
    });
  };

  // 1. Always persist to Express server (enforces server-side PvP WebSocket & API guards + persists on disk)
  let res = await sendSaveRequest(false);
  if (res.status === 401 && auth.currentUser) {
    res = await sendSaveRequest(true);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Não foi possível salvar a configuração de filas.');
  }

  const savedQueues = sanitizeModeQueues(data.queues ?? sanitized);
  const savedUpdatedAtMs =
    typeof data.updatedAtMs === 'number' ? data.updatedAtMs : Date.now();
  notifyQueueListeners(savedQueues, savedUpdatedAtMs);

  // 2. Also sync to Firestore for real-time global push across all connected devices when Google Admin is authenticated
  let syncedFirestore = false;
  const firebaseUser = auth.currentUser;
  if (isAdminUser(firebaseUser) && firebaseUser) {
    const path = 'game_config/mode_queues';
    try {
      await setDoc(doc(db, 'game_config', 'mode_queues'), {
        pvp_ranked: savedQueues.pvp_ranked,
        pvp_normal: savedQueues.pvp_normal,
        pvia: savedQueues.pvia,
        testing_arena: savedQueues.testing_arena,
        tutorial: savedQueues.tutorial,
        updatedAt: serverTimestamp(),
        updatedBy: firebaseUser.uid,
      });
      syncedFirestore = true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  return { queues: savedQueues, syncedFirestore };
}

/**
 * React hook returning live game mode queue availability.
 * Subscribes to Firestore real-time updates AND fetches the server config on mount.
 */
export function useModeQueues() {
  const [queues, setQueues] = useState<ModeQueuesMap>(cachedQueues);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;

    const handleCacheUpdate = (next: ModeQueuesMap) => {
      if (active) setQueues(next);
    };
    queueListeners.add(handleCacheUpdate);

    void fetchServerModeQueues().finally(() => {
      if (active) setLoading(false);
    });

    const configRef = doc(db, 'game_config', 'mode_queues');
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
          const parsed = sanitizeModeQueues(snapData);
          notifyQueueListeners(parsed, snapUpdatedAtMs || Date.now());
        }
        setLoading(false);
      },
      () => {
        // Keep server/default queues if Firestore snapshot fails or is not yet seeded
        if (active) setLoading(false);
      }
    );

    return () => {
      active = false;
      queueListeners.delete(handleCacheUpdate);
      unsubscribe();
    };
  }, []);

  return { queues, loading };
}
