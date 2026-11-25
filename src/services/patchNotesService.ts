import { signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  ADMIN_EMAIL,
  auth,
  db,
  googleAuthProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';

export type PatchCategory = 'feature' | 'balance' | 'ui_mobile' | 'fix';

export interface PatchNoteEntry {
  id: string;
  category: PatchCategory;
  text: string;
}

export interface PatchNoteRelease {
  id: string;
  version: string;
  title: string;
  summary: string;
  releaseDate: string;
  isCurrent: boolean;
  isPublished: boolean;
  entries: PatchNoteEntry[];
  publishedAtMs: number;
  updatedAtMs: number;
  updatedBy: string;
  isLocalFallback?: boolean;
}

export interface PatchNoteDraft {
  version: string;
  title: string;
  summary: string;
  releaseDate: string;
  entries: PatchNoteEntry[];
  updatedAtMs?: number;
  updatedBy?: string;
}

export const PATCH_CATEGORY_META: Record<
  PatchCategory,
  { label: string; shortLabel: string; badgeClass: string; dotClass: string }
> = {
  feature: {
    label: 'Novidade',
    shortLabel: 'Novo',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
    dotClass: 'bg-emerald-400',
  },
  balance: {
    label: 'Balanceamento',
    shortLabel: 'Balance',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
    dotClass: 'bg-amber-400',
  },
  ui_mobile: {
    label: 'Visual & Mobile',
    shortLabel: 'UI / Mobile',
    badgeClass: 'bg-sky-950/80 text-sky-300 border-sky-500/40',
    dotClass: 'bg-sky-400',
  },
  fix: {
    label: 'Correção',
    shortLabel: 'Fix',
    badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
    dotClass: 'bg-rose-400',
  },
};

export const VERSION_REGEX = /^[vV]?[0-9]+\.[0-9]+(\.[0-9]+)?(-[a-zA-Z0-9.]+)?$/;

export function getTodayBrDate(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export const DEFAULT_INITIAL_PATCH_DRAFT: PatchNoteDraft = {
  version: 'v1.4.0',
  title: 'Arena Mobile Reformulada, Tutorial Interativo & Modo Estático',
  summary:
    'Grande atualização focada em fluidez, leitura clara no celular, aprendizado prático direto no campo de batalha e ajustes importantes de combate nos Arcanjos.',
  releaseDate: getTodayBrDate(),
  entries: [
    {
      id: 'entry_tutorial_guided',
      category: 'feature',
      text: 'Novo Tutorial Interativo no menu de Modos de Jogo: aprenda compra de cartas, invocação, ataque, bloqueio e habilidades rápidas em uma partida prática guiada sobre o campo real.',
    },
    {
      id: 'entry_patch_notes_tab',
      category: 'feature',
      text: 'Nova aba Versão & Patch Notes integrada ao Manual de Regras, exibindo a versão atual e o histórico de atualizações em tempo real para todos os jogadores.',
    },
    {
      id: 'entry_static_animations',
      category: 'feature',
      text: 'Adicionadas versões estáticas das animações e novas opções de desempenho nas Configurações (Completas, Estáticas ou Desativadas) para deixar o jogo mais leve.',
    },
    {
      id: 'entry_mobile_arena',
      category: 'ui_mobile',
      text: 'Arena de combate Mobile completamente reconstruída com cartas dedicadas de alta legibilidade, visualização imediata de atributos e acesso rápido ao registro de Crônicas.',
    },
    {
      id: 'entry_menu_modes_visual',
      category: 'ui_mobile',
      text: 'Menu inicial ampliado com logotipo Celentia em maior destaque, cartas laterais extras em tela cheia, novo botão Jogar e modal de seleção de modos reformulado.',
    },
    {
      id: 'entry_archangel_damage_fix',
      category: 'balance',
      text: 'Arcanjos agora causam exatamente 1 de dano direto à vida do jogador em ataques diretos por padrão, salvo quando modificados por efeitos ou habilidades específicas.',
    },
    {
      id: 'entry_levelup_ready',
      category: 'balance',
      text: 'Cartas geradas pela subida de nível de um Arcanjo agora chegam prontas para serem jogadas ainda na mesma rodada.',
    },
  ],
};

export const DEFAULT_PUBLISHED_FALLBACK: PatchNoteRelease = {
  id: 'baseline-v1-3-0',
  version: 'v1.3.0',
  title: 'Celentia: Crônicas Celestiais',
  summary:
    'Versão base das notas de atualização. Assim que o administrador publicar a próxima versão, o histórico oficial aparecerá automaticamente aqui para todos os jogadores.',
  releaseDate: '2026',
  isCurrent: true,
  isPublished: true,
  entries: [
    {
      id: 'base_1',
      category: 'feature',
      text: 'Modos Treino contra IA, Duelo Online em Salas Privadas, Modo Ranqueado e Arena de Teste de Cartas disponíveis.',
    },
    {
      id: 'base_2',
      category: 'balance',
      text: 'Sistema completo de Ascensão de Arcanjos, funções alternadas de Atacante/Defensor e habilidades Rápidas, Lentas e Fugazes.',
    },
    {
      id: 'base_3',
      category: 'ui_mobile',
      text: 'Suporte a desktop e dispositivos móveis em modo paisagem com temas visuais configuráveis.',
    },
  ],
  publishedAtMs: 0,
  updatedAtMs: 0,
  updatedBy: 'system',
  isLocalFallback: true,
};

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user || !user.email) return false;
  return user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && user.emailVerified === true;
}

export function createNewPatchEntry(category: PatchCategory = 'feature'): PatchNoteEntry {
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return {
    id: `entry_${Date.now().toString(36)}_${randomSuffix}`,
    category,
    text: '',
  };
}

export function sanitizeEntries(entries: PatchNoteEntry[]): PatchNoteEntry[] {
  const allowedCategories: PatchCategory[] = ['feature', 'balance', 'ui_mobile', 'fix'];
  return entries
    .map((item, idx) => {
      const cleanId = String(item.id || `entry_${idx + 1}`)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 64);
      const cleanCategory: PatchCategory = allowedCategories.includes(item.category)
        ? item.category
        : 'feature';
      const cleanText = String(item.text || '').trim().slice(0, 280);
      return {
        id: cleanId || `entry_${idx + 1}`,
        category: cleanCategory,
        text: cleanText,
      };
    })
    .filter((item) => item.text.length > 0)
    .slice(0, 40);
}

export function validatePatchDraft(draft: PatchNoteDraft): string | null {
  const version = draft.version.trim();
  const title = draft.title.trim();
  const summary = draft.summary.trim();
  const releaseDate = draft.releaseDate.trim();
  const entries = sanitizeEntries(draft.entries);

  if (!version || version.length > 24 || !VERSION_REGEX.test(version)) {
    return 'Informe uma versão válida (ex: v1.4.0 ou 1.4.1-beta).';
  }
  if (!title || title.length > 120) {
    return 'O título da atualização é obrigatório (máximo 120 caracteres).';
  }
  if (summary.length > 800) {
    return 'O resumo deve ter no máximo 800 caracteres.';
  }
  if (!releaseDate || releaseDate.length > 32) {
    return 'Informe a data da versão (ex: 21/11/2026).';
  }
  if (entries.length === 0) {
    return 'Adicione pelo menos um item na lista de mudanças.';
  }
  if (entries.length > 40) {
    return 'O limite máximo é de 40 itens por atualização.';
  }
  return null;
}

function timestampToMs(ts: unknown): number {
  if (ts instanceof Timestamp) return ts.toMillis();
  if (ts && typeof ts === 'object' && 'seconds' in ts && typeof (ts as { seconds: number }).seconds === 'number') {
    return (ts as { seconds: number }).seconds * 1000;
  }
  return 0;
}

function parseEntries(raw: unknown): PatchNoteEntry[] {
  if (!Array.isArray(raw)) return [];
  const allowedCategories: PatchCategory[] = ['feature', 'balance', 'ui_mobile', 'fix'];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, idx) => ({
      id: typeof item.id === 'string' && item.id ? item.id : `entry_${idx}`,
      category: allowedCategories.includes(item.category as PatchCategory)
        ? (item.category as PatchCategory)
        : 'feature',
      text: typeof item.text === 'string' ? item.text : '',
    }))
    .filter((item) => item.text.trim().length > 0);
}

export function subscribePublishedPatchNotes(
  onData: (releases: PatchNoteRelease[]) => void,
  onError?: (errorMessage: string) => void
): Unsubscribe {
  const path = 'patch_notes';
  const q = query(collection(db, path), where('isPublished', '==', true));

  return onSnapshot(
    q,
    (snapshot) => {
      const releases: PatchNoteRelease[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          version: typeof data.version === 'string' ? data.version : 'v1.0.0',
          title: typeof data.title === 'string' ? data.title : 'Atualização Celentia',
          summary: typeof data.summary === 'string' ? data.summary : '',
          releaseDate: typeof data.releaseDate === 'string' ? data.releaseDate : '',
          isCurrent: Boolean(data.isCurrent),
          isPublished: true,
          entries: parseEntries(data.entries),
          publishedAtMs: timestampToMs(data.publishedAt),
          updatedAtMs: timestampToMs(data.updatedAt),
          updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : '',
        };
      });

      releases.sort((a, b) => {
        if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
        return b.publishedAtMs - a.publishedAtMs;
      });

      onData(releases);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped.message : 'Erro ao carregar notas de atualização.');
      }
    }
  );
}

export function subscribeAdminDraft(
  isAdmin: boolean,
  onData: (draft: PatchNoteDraft | null) => void,
  onError?: (errorMessage: string) => void
): Unsubscribe {
  if (!isAdmin) {
    return () => {};
  }
  const path = 'patch_drafts/current';
  const draftRef = doc(db, 'patch_drafts', 'current');

  return onSnapshot(
    draftRef,
    (docSnap) => {
      if (!docSnap.exists()) {
        onData(null);
        return;
      }
      const data = docSnap.data();
      onData({
        version: typeof data.version === 'string' ? data.version : DEFAULT_INITIAL_PATCH_DRAFT.version,
        title: typeof data.title === 'string' ? data.title : '',
        summary: typeof data.summary === 'string' ? data.summary : '',
        releaseDate: typeof data.releaseDate === 'string' ? data.releaseDate : getTodayBrDate(),
        entries: parseEntries(data.entries),
        updatedAtMs: timestampToMs(data.updatedAt),
        updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : undefined,
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped.message : 'Erro ao carregar rascunho privado.');
      }
    }
  );
}

export async function saveAdminDraft(draft: PatchNoteDraft): Promise<void> {
  const user = auth.currentUser;
  if (!isAdminUser(user) || !user) {
    throw new Error('Apenas a conta Google de administrador autorizada pode salvar rascunhos.');
  }

  const validationError = validatePatchDraft(draft);
  if (validationError) {
    throw new Error(validationError);
  }

  const path = 'patch_drafts/current';
  const payload = {
    version: draft.version.trim().slice(0, 24),
    title: draft.title.trim().slice(0, 120),
    summary: draft.summary.trim().slice(0, 800),
    releaseDate: draft.releaseDate.trim().slice(0, 32),
    entries: sanitizeEntries(draft.entries),
    updatedAt: serverTimestamp(),
    updatedBy: user.uid,
  };

  try {
    await setDoc(doc(db, 'patch_drafts', 'current'), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

function buildReleaseDocId(version: string): string {
  const slug = version
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return `rel-${slug || 'patch'}-${Date.now().toString(36)}`;
}

export async function publishDraftAsNewRelease(
  draft: PatchNoteDraft,
  existingReleases: PatchNoteRelease[]
): Promise<string> {
  const user = auth.currentUser;
  if (!isAdminUser(user) || !user) {
    throw new Error('Apenas a conta Google de administrador autorizada pode publicar notas.');
  }

  const validationError = validatePatchDraft(draft);
  if (validationError) {
    throw new Error(validationError);
  }

  const releaseId = buildReleaseDocId(draft.version);
  const cleanEntries = sanitizeEntries(draft.entries);
  const cleanVersion = draft.version.trim().slice(0, 24);
  const cleanTitle = draft.title.trim().slice(0, 120);
  const cleanSummary = draft.summary.trim().slice(0, 800);
  const cleanDate = draft.releaseDate.trim().slice(0, 32);

  try {
    const batch = writeBatch(db);

    for (const rel of existingReleases) {
      if (rel.isCurrent && !rel.isLocalFallback && rel.id !== releaseId) {
        batch.update(doc(db, 'patch_notes', rel.id), {
          isCurrent: false,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        });
      }
    }

    batch.set(doc(db, 'patch_notes', releaseId), {
      version: cleanVersion,
      title: cleanTitle,
      summary: cleanSummary,
      releaseDate: cleanDate,
      isCurrent: true,
      isPublished: true,
      entries: cleanEntries,
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    });

    batch.set(doc(db, 'patch_drafts', 'current'), {
      version: cleanVersion,
      title: cleanTitle,
      summary: cleanSummary,
      releaseDate: cleanDate,
      entries: cleanEntries,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    });

    await batch.commit();
    return releaseId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `patch_notes/${releaseId}`);
  }
}

export async function updatePublishedRelease(
  releaseId: string,
  draft: PatchNoteDraft,
  isCurrent: boolean
): Promise<void> {
  const user = auth.currentUser;
  if (!isAdminUser(user) || !user) {
    throw new Error('Apenas o administrador pode editar notas publicadas.');
  }
  const validationError = validatePatchDraft(draft);
  if (validationError) {
    throw new Error(validationError);
  }

  const path = `patch_notes/${releaseId}`;
  try {
    await updateDoc(doc(db, 'patch_notes', releaseId), {
      version: draft.version.trim().slice(0, 24),
      title: draft.title.trim().slice(0, 120),
      summary: draft.summary.trim().slice(0, 800),
      releaseDate: draft.releaseDate.trim().slice(0, 32),
      isCurrent,
      entries: sanitizeEntries(draft.entries),
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePublishedRelease(releaseId: string): Promise<void> {
  const user = auth.currentUser;
  if (!isAdminUser(user) || !user) {
    throw new Error('Apenas o administrador pode remover notas publicadas.');
  }
  const path = `patch_notes/${releaseId}`;
  try {
    await deleteDoc(doc(db, 'patch_notes', releaseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function signInAdminWithGoogle(): Promise<User> {
  googleAuthProvider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, googleAuthProvider);
  return result.user;
}

export async function signOutFirebaseAdmin(): Promise<void> {
  await signOut(auth);
}
