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
  version: 'v1.5.0',
  title: 'Tapetes Animados, Novo Modal de Cartas, Padronização & Animações Tier 1',
  summary:
    'Grande atualização visual e sistêmica trazendo tapetes exclusivos animados, isolamento de baralhos por conta, novo modal expandido de cartas, padronização global de condições, ajustes em Cristalys, Finn e Fanael e animações modernizadas para cartas de Tier 1.',
  releaseDate: getTodayBrDate(),
  entries: [
    {
      id: 'v150_playmats_animated',
      category: 'feature',
      text: 'Tapetes de arena receberam animações exclusivas e distintas, predominantes no lado do jogador que o equipa, além de novos efeitos rúnicos no Astrolábio Rúnico.',
    },
    {
      id: 'v150_default_playmat_cardback',
      category: 'feature',
      text: 'Adicionados Tapete Padrão e Verso de Carta Inicial sem animações como opções iniciais limpas para todos os duelistas.',
    },
    {
      id: 'v150_card_modal_redesign',
      category: 'ui_mobile',
      text: 'Modal expandido de informações das cartas reformulado com dimensões fixas, abas Descrição/História, alternador direto de nível (Tier 5/6) e barras de Dano e Defesa com fórmula detalhada no hover.',
    },
    {
      id: 'v150_passives_overlay_cleanup',
      category: 'ui_mobile',
      text: 'Painel detalhado de Passivas e Efeitos agora abre sobreposto à direita em qualquer tela, com legenda de Origem limpa (sem nomes de cores entre parênteses) e remoção do texto redundante de Corte das Fadas mantendo seu ícone dourado.',
    },
    {
      id: 'v150_neutral_icon_and_enemy_deck',
      category: 'ui_mobile',
      text: 'Novo ícone visual exclusivo para a classe Neutro e reposicionamento mais recuado do baralho inimigo oculto na arena de combate.',
    },
    {
      id: 'v150_deck_account_isolation',
      category: 'fix',
      text: 'Corrigida falha de sincronização de baralhos entre contas: decks agora são estritamente isolados por conta, iniciando com espaços vazios e apenas o deck padrão selecionado.',
    },
    {
      id: 'v150_conditions_standardization',
      category: 'balance',
      text: 'Padronização global de efeitos de condição entregues entre unidades: regras, rastreamento de origem e visual padrão unificados preservando as animações próprias de cada carta.',
    },
    {
      id: 'v150_cristalys_rework',
      category: 'balance',
      text: 'Cristalys, a Fada reformulada: ao ser invocada aplica CURA por 2 rodadas em uma unidade aliada ou si mesma com ativação instantânea (+9 de Vida na invocação + 1 rodada restante) e nova animação de banho mágico d’água.',
    },
    {
      id: 'v150_finn_rework',
      category: 'balance',
      text: 'Finn, o Fada atualizado: na primeira vez que atingir a vida do jogador inimigo, aumenta permanentemente +1 na Vida Máxima e concede +1 de Vida atual, com segmento especial verde-rosa na barra de vida.',
    },
    {
      id: 'v150_fanael_rename_vfx',
      category: 'feature',
      text: 'Fanx foi renomeado oficialmente para Fanael, o Arcanjo e recebeu uma nova animação cinematográfica de bênção angelical com asas luminosas, halo celestial e fitas d’água cristalina.',
    },
    {
      id: 'v150_elemental_orbs_vfx',
      category: 'ui_mobile',
      text: 'Modernizada a integração das orbes elementais de Fernando (ígnea), Glauco (gélida), Mara (elétrica) e Nulio (divina) com voo curvo, espiral de absorção e brilho fluido fundindo-se à unidade escolhida.',
    },
    {
      id: 'v150_celia_vilma_vfx',
      category: 'feature',
      text: 'Celia (Gelo) e Vilma (Fogo) ganharam animações temáticas ao ativarem seus bônus de compra, barreiras mágicas exclusivas ao bloquearem dano de seus elementos e nova onda de chamas para Vilma.',
    },
    {
      id: 'v150_gough_uhr_philio_vfx',
      category: 'ui_mobile',
      text: 'Animações modernizadas e adicionadas no Tier 1: arco e flecha elétrica de Gough, magia arcana de compra no Mago Uhr, vórtice de absorção cósmica em Philio, baforada negra em Targor e vida extra em Mipo.',
    },
    {
      id: 'v150_reveal_capture_standard',
      category: 'ui_mobile',
      text: 'Animação padrão do efeito REVELAR completamente modernizada e aplicada em Vanusa; Bia passou a utilizar exclusivamente a animação padrão de CAPTURAR.',
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
