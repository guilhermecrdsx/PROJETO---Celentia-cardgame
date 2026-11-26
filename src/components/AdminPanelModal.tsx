import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Coins,
  Crown,
  Gem,
  Gift,
  Layers,
  Lock,
  Power,
  RefreshCw,
  Save,
  Search,
  Shield,
  Sliders,
  Sparkles,
  Trophy,
  UserCircle2,
  Users,
  X,
} from 'lucide-react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  adminDeliverAvatarInCloud,
  adminDeliverCardInCloud,
  adminFetchUsersInCloud,
  adminGrantResourcesInCloud,
  adminRunActionOnUserInCloud,
  adminUpdateUserInCloud,
  getCollectibleCards,
  useCloudPlayerState,
  type AdminUserSummaryDTO,
} from '../services/accountApi';
import {
  GAME_MODE_QUEUE_META,
  saveModeQueuesConfig,
  useModeQueues,
  type GameModeQueueId,
  type ModeQueuesMap,
} from '../services/modeQueuesService';
import { saveRankPolicyConfig, useRankPolicy } from '../services/rankPolicyService';
import { isAdminUser, signInAdminWithGoogle } from '../services/patchNotesService';
import { sound } from '../services/soundEffects';
import {
  RANK_TIER_ORDER,
  getRankInfo,
  type RankTier,
} from '../utils/rankMath';
import { CARD_AVATARS } from '../data/avatars';
import { MAX_ACCOUNT_LEVEL } from '../data/levelProgression';
import { AvatarPortrait } from './AvatarPortrait';
import { formatHandleDisplay, sanitizeHandleDraft, validateHandle } from '../utils/nickname';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { playerState } = useCloudPlayerState();
  const { queues: liveQueues } = useModeQueues();
  const { rankPolicy: liveRankPolicy } = useRankPolicy();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [activeTab, setActiveTab] = useState<'queues' | 'users'>('queues');

  // --- Queues & Global Rank Lock state ---
  const [draftQueues, setDraftQueues] = useState<ModeQueuesMap>(liveQueues);
  const [draftGlobalBlockTier, setDraftGlobalBlockTier] = useState<RankTier | ''>(
    liveRankPolicy.blockedFromTier || ''
  );
  const [savingQueues, setSavingQueues] = useState(false);
  const [savingGlobalRank, setSavingGlobalRank] = useState(false);
  const [togglingQueueId, setTogglingQueueId] = useState<GameModeQueueId | null>(null);
  const [queueFeedback, setQueueFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // --- Users state ---
  const [userSearch, setUserSearch] = useState('');
  const [usersList, setUsersList] = useState<AdminUserSummaryDTO[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserSummaryDTO | null>(null);

  // Editable fields for selected user
  const [editNick, setEditNick] = useState('');
  const [editGold, setEditGold] = useState('0');
  const [editCrystals, setEditCrystals] = useState('0');
  const [editLevel, setEditLevel] = useState('1');
  const [editXp, setEditXp] = useState('0');
  const [editRp, setEditRp] = useState('0');
  const [editSide, setEditSide] = useState<'sol' | 'lua' | 'balance'>('balance');
  const [editRankBlockedTotal, setEditRankBlockedTotal] = useState(false);
  const [editRankBlockTier, setEditRankBlockTier] = useState<RankTier | ''>('');
  const [savingUser, setSavingUser] = useState(false);

  // Delivery tools for selected user
  const allCollectibleCards = useMemo(
    () =>
      [...getCollectibleCards()].sort(
        (a, b) => a.tier - b.tier || a.name.localeCompare(b.name)
      ),
    []
  );
  const [cardSearchFilter, setCardSearchFilter] = useState('');
  const [selectedDeliverCardId, setSelectedDeliverCardId] = useState<string>('');
  const [selectedDeliverAvatarId, setSelectedDeliverAvatarId] = useState<string>(
    CARD_AVATARS[0]?.id || 'av_g_hugo'
  );
  const [grantXpInput, setGrantXpInput] = useState('500');
  const [grantRpInput, setGrantRpInput] = useState('100');
  const [grantGoldInput, setGrantGoldInput] = useState('250');
  const [grantCrystalsInput, setGrantCrystalsInput] = useState('500');

  const [userFeedback, setUserFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const filteredDeliverCards = useMemo(() => {
    if (!cardSearchFilter.trim()) return allCollectibleCards;
    const q = cardSearchFilter.toLowerCase();
    return allCollectibleCards.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.element.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    );
  }, [allCollectibleCards, cardSearchFilter]);

  useEffect(() => {
    if (filteredDeliverCards.length > 0) {
      if (!filteredDeliverCards.some((c) => c.id === selectedDeliverCardId)) {
        setSelectedDeliverCardId(filteredDeliverCards[0].id);
      }
    }
  }, [filteredDeliverCards, selectedDeliverCardId]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setFirebaseUser(u));
    return unsub;
  }, []);

  useEffect(() => {
    setDraftQueues(liveQueues);
  }, [liveQueues, isOpen]);

  useEffect(() => {
    setDraftGlobalBlockTier(liveRankPolicy.blockedFromTier || '');
  }, [liveRankPolicy.blockedFromTier, isOpen]);

  const isAuthorizedAdmin = Boolean(
    playerState?.isAdmin || isAdminUser(firebaseUser)
  );
  const hasGoogleAdmin = isAdminUser(firebaseUser);

  const loadUsers = useCallback(async (query = '') => {
    try {
      setLoadingUsers(true);
      setUserFeedback(null);
      const list = await adminFetchUsersInCloud(query);
      setUsersList(list);
      setSelectedUser((prev) => {
        if (!prev) return list[0] || null;
        return list.find((u) => u.uid === prev.uid) || list[0] || null;
      });
    } catch (err: any) {
      setUserFeedback({
        type: 'error',
        text: err?.message || 'Erro ao carregar lista de jogadores.',
      });
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && isAuthorizedAdmin && activeTab === 'users') {
      void loadUsers(userSearch);
    }
  }, [isOpen, isAuthorizedAdmin, activeTab, loadUsers]);

  useEffect(() => {
    if (!selectedUser) return;
    setEditNick(formatHandleDisplay(selectedUser.nickname));
    setEditGold(String(selectedUser.gold));
    setEditCrystals(String(selectedUser.crystals ?? 0));
    setEditLevel(String(selectedUser.level));
    setEditXp(String(selectedUser.xp));
    setEditRp(String(selectedUser.rankPoints));
    setEditSide(selectedUser.preferredSide);
    setEditRankBlockedTotal(Boolean(selectedUser.rankBlockedTotal));
    setEditRankBlockTier(selectedUser.rankBlockFromTier || '');
  }, [selectedUser]);

  if (!isOpen) return null;

  const handleToggleQueue = async (id: GameModeQueueId) => {
    if (savingQueues || togglingQueueId) return;
    sound.playTick();
    setQueueFeedback(null);

    const meta = GAME_MODE_QUEUE_META.find((m) => m.id === id);
    const previousQueues = draftQueues;
    const nextEnabled = !previousQueues[id].enabled;
    const nextQueues: ModeQueuesMap = {
      ...previousQueues,
      [id]: {
        enabled: nextEnabled,
        reason:
          !nextEnabled && !previousQueues[id].reason.trim()
            ? meta?.defaultReason || 'Modo temporariamente indisponível.'
            : previousQueues[id].reason,
      },
    };

    setDraftQueues(nextQueues);
    setTogglingQueueId(id);
    try {
      const res = await saveModeQueuesConfig(nextQueues);
      setDraftQueues(res.queues);
      sound.playSpell();
      const label = meta?.label || id;
      setQueueFeedback({
        type: 'success',
        text: nextEnabled
          ? `${label} reativado (ONLINE)${res.syncedFirestore ? ' e sincronizado em tempo real!' : ' no servidor!'}`
          : `${label} marcado como [OFFLINE — DESABILITADO NO MOMENTO]${res.syncedFirestore ? ' e sincronizado em tempo real!' : ' no servidor!'}`,
      });
    } catch (err: any) {
      setDraftQueues(previousQueues);
      setQueueFeedback({
        type: 'error',
        text: err?.message || 'Falha ao atualizar status da fila.',
      });
    } finally {
      setTogglingQueueId(null);
    }
  };

  const handleChangeQueueReason = (id: GameModeQueueId, value: string) => {
    setDraftQueues((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        reason: value.slice(0, 140),
      },
    }));
  };

  const handleSaveQueues = async () => {
    try {
      setSavingQueues(true);
      setQueueFeedback(null);
      const res = await saveModeQueuesConfig(draftQueues);
      setDraftQueues(res.queues);
      sound.playSpell();
      setQueueFeedback({
        type: 'success',
        text: res.syncedFirestore
          ? 'Avisos e filas salvos e sincronizados em tempo real para todos os jogadores!'
          : 'Avisos e filas salvos no servidor!',
      });
    } catch (err: any) {
      setQueueFeedback({
        type: 'error',
        text: err?.message || 'Falha ao salvar configuração das filas.',
      });
    } finally {
      setSavingQueues(false);
    }
  };

  const handleSaveGlobalRankPolicy = async (nextTier: RankTier | null) => {
    try {
      setSavingGlobalRank(true);
      setQueueFeedback(null);
      const res = await saveRankPolicyConfig(nextTier);
      setDraftGlobalBlockTier(res.policy.blockedFromTier || '');
      sound.playSpell();
      setQueueFeedback({
        type: 'success',
        text: nextTier
          ? `Bloqueio Global de Rank ativado a partir de ${nextTier}! Pontos continuam acumulando nos ranks anteriores.`
          : 'Bloqueio Global de Rank removido! Todos os jogadores foram promovidos conforme seus RP acumulados.',
      });
    } catch (err: any) {
      setQueueFeedback({
        type: 'error',
        text: err?.message || 'Falha ao salvar política global de rank.',
      });
    } finally {
      setSavingGlobalRank(false);
    }
  };

  const handleConnectGoogleAdmin = async () => {
    try {
      sound.playDraw();
      await signInAdminWithGoogle();
      setQueueFeedback({
        type: 'success',
        text: 'Conta Google de Administrador conectada para sincronização global!',
      });
    } catch (err: any) {
      setQueueFeedback({
        type: 'error',
        text: err?.message || 'Não foi possível conectar a conta Google.',
      });
    }
  };

  const handleSearchUsersSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playDraw();
    void loadUsers(userSearch);
  };

  const syncUpdatedUser = (updated: AdminUserSummaryDTO) => {
    setUsersList((prev) => prev.map((u) => (u.uid === updated.uid ? updated : u)));
    setSelectedUser(updated);
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const nickCheck = validateHandle(editNick);
    if (!nickCheck.valid) {
      setUserFeedback({
        type: 'error',
        text: nickCheck.error || 'Formato de @nick inválido.',
      });
      return;
    }

    try {
      setSavingUser(true);
      setUserFeedback(null);
      const updated = await adminUpdateUserInCloud(selectedUser.uid, {
        nickname: nickCheck.normalized,
        gold: Number(editGold),
        crystals: Number(editCrystals),
        level: Math.min(MAX_ACCOUNT_LEVEL, Math.max(1, Number(editLevel) || 1)),
        xp: Number(editXp),
        rankPoints: Number(editRp),
        preferredSide: editSide,
        rankBlockedTotal: editRankBlockedTotal,
        rankBlockFromTier: editRankBlockTier || null,
      });
      sound.playSpell();
      syncUpdatedUser(updated);
      setUserFeedback({
        type: 'success',
        text: `Perfil ${updated.nickname} atualizado com sucesso!`,
      });
    } catch (err: any) {
      setUserFeedback({
        type: 'error',
        text: err?.message || 'Erro ao salvar alterações do perfil.',
      });
    } finally {
      setSavingUser(false);
    }
  };

  const handleTargetUserAction = async (
    action:
      | 'unlock_all_cards'
      | 'grant_event_classes'
      | 'reset_starter_cards'
      | 'add_gold_5000'
      | 'add_crystals_5000'
      | 'unlock_all_cosmetics'
      | 'max_level_rank',
    successLabel: string
  ) => {
    if (!selectedUser) return;
    try {
      setSavingUser(true);
      setUserFeedback(null);
      const updated = await adminRunActionOnUserInCloud(selectedUser.uid, action);
      sound.playSpell();
      syncUpdatedUser(updated);
      setUserFeedback({
        type: 'success',
        text: `${updated.nickname}: ${successLabel}`,
      });
    } catch (err: any) {
      setUserFeedback({
        type: 'error',
        text: err?.message || 'Falha ao executar ação no perfil.',
      });
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeliverSpecificCard = async () => {
    if (!selectedUser || !selectedDeliverCardId) return;
    const card = allCollectibleCards.find((c) => c.id === selectedDeliverCardId);
    try {
      setSavingUser(true);
      setUserFeedback(null);
      const res = await adminDeliverCardInCloud(selectedUser.uid, selectedDeliverCardId);
      sound.playSpell();
      syncUpdatedUser(res.user);
      setUserFeedback({
        type: 'success',
        text: res.alreadyOwned
          ? `${res.user.nickname} já possuía a carta "${card?.name || res.deliveredCardId}".`
          : `Carta "${card?.name || res.deliveredCardId}" entregue para ${res.user.nickname}!`,
      });
    } catch (err: any) {
      setUserFeedback({
        type: 'error',
        text: err?.message || 'Falha ao entregar carta.',
      });
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeliverAvatar = async (avatarId: string | 'ALL') => {
    if (!selectedUser) return;
    try {
      setSavingUser(true);
      setUserFeedback(null);
      const res = await adminDeliverAvatarInCloud(selectedUser.uid, avatarId);
      sound.playSpell();
      syncUpdatedUser(res.user);
      setUserFeedback({
        type: 'success',
        text:
          avatarId === 'ALL'
            ? `Todos os ${CARD_AVATARS.length} avatares foram liberados para ${res.user.nickname}!`
            : `Avatar liberado para ${res.user.nickname}!`,
      });
    } catch (err: any) {
      setUserFeedback({
        type: 'error',
        text: err?.message || 'Falha ao liberar avatar.',
      });
    } finally {
      setSavingUser(false);
    }
  };

  const handleGrantResources = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const addXp = Math.max(0, Math.floor(Number(grantXpInput) || 0));
    const addRankPoints = Math.floor(Number(grantRpInput) || 0);
    const addGold = Math.floor(Number(grantGoldInput) || 0);
    const addCrystals = Math.floor(Number(grantCrystalsInput) || 0);

    try {
      setSavingUser(true);
      setUserFeedback(null);
      const res = await adminGrantResourcesInCloud(selectedUser.uid, {
        addXp,
        addRankPoints,
        addGold,
        addCrystals,
      });
      sound.playSpell();
      syncUpdatedUser(res.user);
      const milestoneNote =
        res.milestoneRewards.length > 0
          ? ` | Marcos Nv.${res.milestoneRewards.map((m) => m.level).join(', ')}: +${res.milestoneRewards.length * 100} Ouro e +${res.milestoneRewards.length} Pacote(s) Comum(ns)!`
          : '';
      setUserFeedback({
        type: 'success',
        text: `Entregue a ${res.user.nickname}: +${res.xpAdded} XP (Nv.${res.newLevel}), ${res.rpAdded >= 0 ? `+${res.rpAdded}` : res.rpAdded} RP, ${res.crystalsAdded >= 0 ? `+${res.crystalsAdded}` : res.crystalsAdded} Cristais, ${res.goldAdded >= 0 ? `+${res.goldAdded}` : res.goldAdded} Ouro${milestoneNote}`,
      });
    } catch (err: any) {
      setUserFeedback({
        type: 'error',
        text: err?.message || 'Falha ao entregar recursos.',
      });
    } finally {
      setSavingUser(false);
    }
  };

  const disabledCount = GAME_MODE_QUEUE_META.filter(
    (m) => !draftQueues[m.id]?.enabled
  ).length;

  const globalCapPreviewInfo = draftGlobalBlockTier
    ? getRankInfo(99999, { globalBlockedFromTier: draftGlobalBlockTier })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-black/88 backdrop-blur-md animate-fadeIn select-none"
      onClick={onClose}
    >
      <div
        className="relative z-10 w-full max-w-6xl max-h-[94dvh] flex flex-col rounded-3xl bg-[#070a15]/98 border-2 border-amber-500/65 shadow-[0_24px_90px_rgba(0,0,0,0.95),0_0_45px_rgba(245,158,11,0.18)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 inset-x-12 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent"
        />

        {/* Header */}
        <header className="shrink-0 px-4 sm:px-6 py-3.5 border-b border-stone-800 bg-gradient-to-r from-amber-950/35 via-stone-950 to-stone-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/25 via-rose-950/80 to-stone-950 border border-amber-400/70 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)] shrink-0">
              <Crown size={22} className="text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-serif font-black tracking-[0.14em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500">
                  Painel Administrativo
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/50 text-[10px] font-mono font-bold text-amber-300 uppercase">
                  Acesso Restrito
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-400 truncate">
                Controle global de filas, travas de rank e entregas diretas aos duelistas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthorizedAdmin && (
              <div className="flex items-center p-1 rounded-xl bg-stone-900 border border-stone-700/90">
                <button
                  type="button"
                  onClick={() => {
                    sound.playDraw();
                    setActiveTab('queues');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'queues'
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-950 shadow'
                      : 'text-stone-300 hover:text-amber-200'
                  }`}
                >
                  <Sliders size={13} />
                  <span>Filas & Rank Global</span>
                  {disabledCount > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-black ${
                        activeTab === 'queues'
                          ? 'bg-stone-950 text-amber-300'
                          : 'bg-rose-500/25 text-rose-300'
                      }`}
                    >
                      {disabledCount} OFF
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playDraw();
                    setActiveTab('users');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'users'
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-950 shadow'
                      : 'text-stone-300 hover:text-amber-200'
                  }`}
                >
                  <Users size={13} />
                  <span>Perfis & Entregas</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                sound.playDraw();
                onClose();
              }}
              className="w-10 h-10 rounded-xl bg-stone-900 hover:bg-rose-950/90 border border-stone-700 hover:border-rose-400/75 text-stone-300 hover:text-rose-200 flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Fechar Painel Admin"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Body */}
        {!isAuthorizedAdmin ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-rose-950/70 border border-rose-500/60 flex items-center justify-center text-rose-300">
              <Lock size={28} />
            </div>
            <h3 className="text-lg font-serif font-black text-rose-200 uppercase tracking-wider">
              Acesso Exclusivo de Administrador
            </h3>
            <p className="text-xs sm:text-sm text-stone-400 max-w-md">
              Apenas contas de administrador autorizadas podem controlar filas de jogo ou editar perfis de usuários.
            </p>
          </div>
        ) : activeTab === 'queues' ? (
          /* ================================================================ */
          /* TAB 1: CONTROLE DE FILAS & BLOQUEIO GLOBAL DE RANKS              */
          /* ================================================================ */
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
            {queueFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  queueFeedback.type === 'success'
                    ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
                    : 'bg-rose-950/80 border-rose-500/60 text-rose-200'
                }`}
              >
                {queueFeedback.type === 'success' ? (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle size={16} className="text-rose-400 shrink-0" />
                )}
                <span>{queueFeedback.text}</span>
              </div>
            )}

            {/* Global Rank Progression Lock Section */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/45 via-stone-900/95 to-amber-950/35 border-2 border-amber-500/45 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-serif font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
                    <Trophy size={16} className="text-amber-400" />
                    <span>Bloqueio Global de Progressão de Rank</span>
                  </h3>
                  <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
                    Bloqueia o avanço de todo o servidor a partir de um elo (ex.: bloquear <strong>Ouro</strong> limita jogadores em <strong>Prata I</strong>). Os pontos continuam acumulando infinitamente e sobem automaticamente quando o elo for liberado.
                  </p>
                </div>

                <span
                  className={`px-3 py-1 rounded-xl text-[11px] font-mono font-black border ${
                    liveRankPolicy.blockedFromTier
                      ? 'bg-amber-500/20 border-amber-400/70 text-amber-200'
                      : 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300'
                  }`}
                >
                  {liveRankPolicy.blockedFromTier
                    ? `TRAVADO ANTES DE ${liveRankPolicy.blockedFromTier.toUpperCase()}`
                    : 'PROGRESSÃO LIBERADA ATÉ CELESTIAL'}
                </span>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[240px]">
                  <label className="block text-[11px] font-mono text-stone-400 mb-1">
                    Bloquear acesso global a partir do Elo:
                  </label>
                  <select
                    value={draftGlobalBlockTier}
                    onChange={(e) => setDraftGlobalBlockTier(e.target.value as RankTier | '')}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-700 focus:border-amber-400 text-sm font-mono text-amber-100 focus:outline-none"
                  >
                    <option value="">Sem Bloqueio Global (Liberado até Celestial)</option>
                    {RANK_TIER_ORDER.map((tier) => (
                      <option key={tier} value={tier}>
                        Bloquear a partir de {tier}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  disabled={savingGlobalRank}
                  onClick={() =>
                    void handleSaveGlobalRankPolicy(draftGlobalBlockTier || null)
                  }
                  className="min-h-[42px] px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 disabled:opacity-50 text-stone-950 font-serif font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <Lock size={14} />
                  <span>{savingGlobalRank ? 'Salvando...' : 'Aplicar Política Global'}</span>
                </button>
              </div>

              {globalCapPreviewInfo && (
                <p className="text-[11px] font-mono text-amber-200/90">
                  Efeito da seleção: jogadores atingem no máximo <strong>{globalCapPreviewInfo.label}</strong> e continuam somando RP normalmente.
                </p>
              )}
            </div>

            {/* Queues Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-stone-900/90 border border-stone-700/80">
              <div className="space-y-0.5">
                <p className="text-xs sm:text-sm font-serif font-bold text-amber-100">
                  Disponibilidade das Filas de Jogo
                </p>
                <p className="text-[11px] sm:text-xs text-stone-400">
                  Clicar em <strong>Desativar</strong> ou <strong>Ativar</strong> aplica imediatamente no menu de modos com a tag <span className="text-rose-300 font-mono font-bold">[OFFLINE]</span> / <span className="text-rose-300 font-mono font-bold">[DESABILITADO NO MOMENTO]</span>.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!hasGoogleAdmin && (
                  <button
                    type="button"
                    onClick={handleConnectGoogleAdmin}
                    className="px-3 py-2 rounded-xl bg-stone-950 hover:bg-stone-800 border border-cyan-500/50 text-cyan-200 text-[11px] font-bold cursor-pointer transition-colors"
                    title="Vincule sua conta Google Admin para sincronização em tempo real via Firestore"
                  >
                    Vincular Google Admin
                  </button>
                )}
                <button
                  type="button"
                  disabled={savingQueues || Boolean(togglingQueueId)}
                  onClick={handleSaveQueues}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 disabled:opacity-50 text-stone-950 font-serif font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.35)] cursor-pointer transition-all"
                >
                  <Save size={15} />
                  <span>{savingQueues ? 'Salvando...' : 'Salvar Avisos'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {GAME_MODE_QUEUE_META.map((mode) => {
                const status = draftQueues[mode.id] ?? { enabled: true, reason: '' };
                const isOn = status.enabled;
                const isThisToggling = togglingQueueId === mode.id;

                return (
                  <div
                    key={mode.id}
                    className={`rounded-2xl p-4 border-2 transition-all flex flex-col gap-3 ${
                      isOn
                        ? 'bg-stone-900/90 border-stone-700/90 hover:border-amber-400/50'
                        : 'bg-rose-950/25 border-rose-500/70 shadow-[0_0_24px_rgba(244,63,94,0.16)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-serif font-black text-sm sm:text-base text-amber-100 uppercase tracking-wide">
                            {mode.label}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-black uppercase border flex items-center gap-1.5 ${
                              isOn
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/50'
                                : 'bg-rose-600/30 text-rose-100 border-rose-400/80'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isOn ? 'bg-emerald-400' : 'bg-rose-400'
                              }`}
                            />
                            {isOn ? 'ONLINE' : 'OFFLINE · DESABILITADO'}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-1 leading-snug">
                          {mode.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={savingQueues || Boolean(togglingQueueId)}
                        onClick={() => void handleToggleQueue(mode.id)}
                        className={`shrink-0 min-h-[40px] px-3.5 py-1.5 rounded-xl border-2 font-serif font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 ${
                          isOn
                            ? 'bg-emerald-600/25 hover:bg-rose-900/70 border-emerald-400/70 hover:border-rose-400 text-emerald-200 hover:text-rose-100'
                            : 'bg-rose-600/35 hover:bg-emerald-700/70 border-rose-400 hover:border-emerald-400 text-rose-100 hover:text-emerald-100'
                        }`}
                      >
                        <Power size={14} className={isThisToggling ? 'animate-spin' : ''} />
                        <span>
                          {isThisToggling ? 'Aplicando...' : isOn ? 'Desativar' : 'Ativar'}
                        </span>
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400">
                        Aviso exibido quando desabilitado
                      </label>
                      <input
                        type="text"
                        maxLength={140}
                        value={status.reason}
                        onChange={(e) => handleChangeQueueReason(mode.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleSaveQueues();
                          }
                        }}
                        placeholder={mode.defaultReason}
                        className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 focus:border-amber-400 text-xs text-stone-100 placeholder-stone-600 focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ================================================================ */
          /* TAB 2: PERFIS, ENTREGAS DE CARTAS/AVATARES/RECURSOS E BLOQUEIOS  */
          /* ================================================================ */
          <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
            {/* Left List: Search & Roster */}
            <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-stone-800 flex flex-col min-h-0 max-h-[34dvh] lg:max-h-none">
              <form
                onSubmit={handleSearchUsersSubmit}
                className="p-3.5 border-b border-stone-800 flex items-center gap-2 shrink-0 bg-stone-950/60"
              >
                <div className="relative flex-1">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500"
                  />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Filtrar por @nick ou e-mail..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-900 border border-stone-700 focus:border-amber-400 text-xs text-stone-100 placeholder-stone-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loadingUsers}
                  className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-serif font-black text-xs uppercase cursor-pointer disabled:opacity-50"
                >
                  Buscar
                </button>
                <button
                  type="button"
                  onClick={() => void loadUsers(userSearch)}
                  disabled={loadingUsers}
                  className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 cursor-pointer"
                  title="Atualizar lista"
                >
                  <RefreshCw size={15} className={loadingUsers ? 'animate-spin' : ''} />
                </button>
              </form>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {loadingUsers && usersList.length === 0 ? (
                  <p className="text-center text-xs text-stone-400 py-8">
                    Carregando perfis do banco de dados...
                  </p>
                ) : usersList.length === 0 ? (
                  <p className="text-center text-xs text-stone-500 py-8">
                    Nenhum perfil encontrado para este filtro.
                  </p>
                ) : (
                  usersList.map((u) => {
                    const isSelected = selectedUser?.uid === u.uid;
                    const rank = getRankInfo(u.rankPoints, {
                      globalBlockedFromTier: liveRankPolicy.blockedFromTier,
                      playerBlockedTotal: u.rankBlockedTotal,
                      playerBlockedFromTier: u.rankBlockFromTier,
                      hasPlayedRanked: (u.rankedMatchesPlayed ?? 0) > 0,
                    });
                    return (
                      <button
                        key={u.uid}
                        type="button"
                        onClick={() => {
                          sound.playTick();
                          setSelectedUser(u);
                          setUserFeedback(null);
                        }}
                        className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                          isSelected
                            ? 'bg-amber-950/35 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.18)]'
                            : 'bg-stone-900/75 border-stone-800 hover:border-stone-600'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <AvatarPortrait avatarId={u.avatarId} size="sm" isAdmin={u.isAdmin} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-serif font-black text-sm text-amber-100 truncate">
                                {u.nickname}
                              </span>
                              {u.isAdmin && (
                                <Crown size={12} className="text-amber-400 shrink-0" />
                              )}
                              {(u.rankBlockedTotal || u.rankBlockFromTier) && (
                                <span title="Bloqueio individual de rank" className="inline-flex shrink-0">
                                  <Lock size={11} className="text-rose-400" />
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-stone-400 truncate">
                              {u.email}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono text-stone-400 flex-wrap">
                              <span className="text-cyan-300 font-bold">Nv.{u.level}</span>
                              <span>·</span>
                              <span className="text-amber-300">{rank.label} ({u.rankPoints} RP)</span>
                              <span>·</span>
                              <span className="text-cyan-200">💎 {u.crystals ?? 0}</span>
                              <span>·</span>
                              <span className="text-yellow-300">🪙 {u.gold}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 text-[10px] font-mono text-stone-400">
                          <div className="text-emerald-300 font-bold">
                            {u.wins}V / {u.losses}D
                          </div>
                          <div>
                            {u.unlockedCount}/{u.totalCollectible} cartas
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Panel: Selected User Inspector, Deliveries & Rank Locks */}
            <div className="lg:col-span-7 overflow-y-auto p-4 sm:p-6">
              {!selectedUser ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-stone-500 gap-2 py-12">
                  <Users size={30} className="text-stone-600" />
                  <p className="text-sm font-serif text-stone-300">
                    Selecione um jogador na lista para gerenciar seu perfil.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Target User Summary Header */}
                  {(() => {
                    const targetRank = getRankInfo(selectedUser.rankPoints, {
                      globalBlockedFromTier: liveRankPolicy.blockedFromTier,
                      playerBlockedTotal: selectedUser.rankBlockedTotal,
                      playerBlockedFromTier: selectedUser.rankBlockFromTier,
                      hasPlayedRanked: (selectedUser.rankedMatchesPlayed ?? 0) > 0,
                    });
                    return (
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-stone-900 via-[#121626] to-stone-900 border border-stone-700 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <AvatarPortrait
                            avatarId={selectedUser.avatarId}
                            size="md"
                            isAdmin={selectedUser.isAdmin}
                            showFrameGem
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-lg sm:text-xl font-serif font-black text-amber-200">
                                {selectedUser.nickname}
                              </h3>
                              {selectedUser.isAdmin && (
                                <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/60 text-[10px] font-mono font-bold text-amber-300">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-mono text-stone-400 mt-0.5">
                              {targetRank.label} ({selectedUser.rankPoints} RP
                              {targetRank.isCapped ? ` · Real: ${targetRank.rawLabel}` : ''})
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="px-2.5 py-1 rounded-xl bg-stone-950 border border-cyan-500/40 text-cyan-300 flex items-center gap-1">
                            <Trophy size={13} />
                            {selectedUser.wins}V / {selectedUser.losses}D
                          </span>
                          <span className="px-2.5 py-1 rounded-xl bg-stone-950 border border-purple-500/40 text-purple-300 flex items-center gap-1">
                            <Layers size={13} />
                            {selectedUser.unlockedCount}/{selectedUser.totalCollectible}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {userFeedback && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                        userFeedback.type === 'success'
                          ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
                          : 'bg-rose-950/80 border-rose-500/60 text-rose-200'
                      }`}
                    >
                      {userFeedback.type === 'success' ? (
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle size={16} className="text-rose-400 shrink-0" />
                      )}
                      <span>{userFeedback.text}</span>
                    </div>
                  )}

                  {/* 1. Deliver Specific Card & Avatars */}
                  <div className="p-4 rounded-2xl bg-stone-900/80 border border-emerald-500/40 space-y-3">
                    <h4 className="text-xs font-serif font-black uppercase tracking-widest text-emerald-300 flex items-center gap-1.5">
                      <Gift size={14} />
                      <span>Entregar Carta Específica ou Avatar</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <input
                        type="text"
                        value={cardSearchFilter}
                        onChange={(e) => setCardSearchFilter(e.target.value)}
                        placeholder="Filtrar carta..."
                        className="sm:col-span-4 px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 focus:border-emerald-400 text-xs text-stone-100 focus:outline-none"
                      />
                      <select
                        value={selectedDeliverCardId}
                        onChange={(e) => setSelectedDeliverCardId(e.target.value)}
                        className="sm:col-span-5 px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 focus:border-emerald-400 text-xs text-stone-100 focus:outline-none"
                      >
                        {filteredDeliverCards.map((c) => {
                          const owned = selectedUser.unlockedCardIds.includes(c.id);
                          return (
                            <option key={c.id} value={c.id}>
                              T{c.tier} · {c.name} ({c.element}){owned ? ' [JÁ TEM]' : ''}
                            </option>
                          );
                        })}
                      </select>
                      <button
                        type="button"
                        disabled={savingUser || !selectedDeliverCardId}
                        onClick={() => void handleDeliverSpecificCard()}
                        className="sm:col-span-3 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-stone-950 font-serif font-black text-xs uppercase cursor-pointer"
                      >
                        Entregar Carta
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t border-stone-800">
                      <select
                        value={selectedDeliverAvatarId}
                        onChange={(e) => setSelectedDeliverAvatarId(e.target.value)}
                        className="sm:col-span-6 px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 focus:border-fuchsia-400 text-xs text-stone-100 focus:outline-none"
                      >
                        {CARD_AVATARS.map((av) => {
                          const hasAv = av.isFree || selectedUser.unlockedAvatarIds.includes(av.id);
                          return (
                            <option key={av.id} value={av.id}>
                              {av.name} ({av.isFree ? 'Padrão' : `${av.crystalCost}💎 / ${av.cost}g`}){hasAv ? ' [LIBERADO]' : ''}
                            </option>
                          );
                        })}
                      </select>
                      <button
                        type="button"
                        disabled={savingUser}
                        onClick={() => void handleDeliverAvatar(selectedDeliverAvatarId)}
                        className="sm:col-span-3 px-3 py-2 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 disabled:opacity-50 text-stone-950 font-serif font-black text-xs uppercase flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <UserCircle2 size={13} />
                        <span>Liberar Avatar</span>
                      </button>
                      <button
                        type="button"
                        disabled={savingUser}
                        onClick={() => void handleDeliverAvatar('ALL')}
                        className="sm:col-span-3 px-3 py-2 rounded-xl bg-fuchsia-950/70 hover:bg-fuchsia-600 border border-fuchsia-400/60 text-fuchsia-200 hover:text-stone-950 font-mono font-bold text-[11px] cursor-pointer"
                      >
                        Liberar Todos (60)
                      </button>
                    </div>
                  </div>

                  {/* 2. Grant Incremental XP, Rank Points, Crystals & Gold */}
                  <form
                    onSubmit={handleGrantResources}
                    className="p-4 rounded-2xl bg-stone-900/80 border border-cyan-500/40 space-y-3"
                  >
                    <h4 className="text-xs font-serif font-black uppercase tracking-widest text-cyan-300 flex items-center gap-1.5">
                      <Coins size={14} />
                      <span>Entregar XP, RP, Cristais e Ouro</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-end">
                      <div>
                        <label className="block text-[10px] font-mono text-stone-400 mb-1">
                          +XP de Nível
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100000}
                          value={grantXpInput}
                          onChange={(e) => setGrantXpInput(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-xs font-mono text-cyan-200 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-stone-400 mb-1">
                          +Rank (RP)
                        </label>
                        <input
                          type="number"
                          min={-5000}
                          max={20000}
                          value={grantRpInput}
                          onChange={(e) => setGrantRpInput(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-xs font-mono text-amber-200 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-stone-400 mb-1">
                          +Cristais
                        </label>
                        <input
                          type="number"
                          min={-100000}
                          max={1000000}
                          value={grantCrystalsInput}
                          onChange={(e) => setGrantCrystalsInput(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-xs font-mono text-cyan-200 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-stone-400 mb-1">
                          +Ouro
                        </label>
                        <input
                          type="number"
                          min={-100000}
                          max={1000000}
                          value={grantGoldInput}
                          onChange={(e) => setGrantGoldInput(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-xs font-mono text-yellow-200 focus:outline-none"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={savingUser}
                        className="py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:brightness-110 disabled:opacity-50 text-stone-950 font-serif font-black text-xs uppercase cursor-pointer"
                      >
                        Entregar
                      </button>
                    </div>
                  </form>

                  {/* 3. Edit Profile Data & Individual Rank Locks */}
                  <form
                    onSubmit={handleSaveUserEdit}
                    className="p-4 rounded-2xl bg-stone-900/80 border border-stone-700/80 space-y-3.5"
                  >
                    <h4 className="text-xs font-serif font-black uppercase tracking-widest text-amber-300 flex items-center gap-1.5">
                      <Shield size={14} />
                      <span>Editar Dados & Bloqueios Individuais de Rank</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-mono text-stone-400 mb-1">
                          Nick Único (@nick)
                        </label>
                        <input
                          type="text"
                          maxLength={18}
                          value={editNick}
                          onChange={(e) => setEditNick(sanitizeHandleDraft(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 focus:border-amber-400 text-sm font-mono font-bold text-amber-100 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-stone-400 mb-1">
                          Lado Preferido
                        </label>
                        <select
                          value={editSide}
                          onChange={(e) =>
                            setEditSide(e.target.value as 'sol' | 'lua' | 'balance')
                          }
                          className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 focus:border-amber-400 text-sm text-stone-100 focus:outline-none"
                        >
                          <option value="balance">Equilíbrio (Sol & Lua)</option>
                          <option value="sol">Sol</option>
                          <option value="lua">Lua</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-stone-400 mb-1 flex items-center gap-1">
                          <Gem size={12} className="text-cyan-300" />
                          <span>Cristais</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={9999999}
                          value={editCrystals}
                          onChange={(e) => setEditCrystals(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 focus:border-cyan-400 text-sm font-mono text-cyan-200 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-stone-400 mb-1 flex items-center gap-1">
                          <Coins size={12} className="text-amber-400" />
                          <span>Ouro</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={9999999}
                          value={editGold}
                          onChange={(e) => setEditGold(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 focus:border-amber-400 text-sm font-mono text-amber-200 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-stone-400 mb-1">
                          Pontos de Rank (RP)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={99999}
                          value={editRp}
                          onChange={(e) => setEditRp(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 focus:border-amber-400 text-sm font-mono text-amber-200 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-stone-400 mb-1">
                          Nível (1–{MAX_ACCOUNT_LEVEL})
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={MAX_ACCOUNT_LEVEL}
                          value={editLevel}
                          onChange={(e) => setEditLevel(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 focus:border-cyan-400 text-sm font-mono text-cyan-200 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-stone-400 mb-1">
                          XP no Nível Atual (0–499)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={499}
                          value={editXp}
                          onChange={(e) => setEditXp(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 focus:border-cyan-400 text-sm font-mono text-cyan-200 focus:outline-none"
                        />
                      </div>

                      {/* Individual Rank Locks */}
                      <div>
                        <label className="block text-[11px] font-mono text-stone-400 mb-1">
                          Bloquear Rank Individual a partir de:
                        </label>
                        <select
                          value={editRankBlockTier}
                          onChange={(e) => setEditRankBlockTier(e.target.value as RankTier | '')}
                          className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 focus:border-rose-400 text-xs font-mono text-stone-100 focus:outline-none"
                        >
                          <option value="">Sem bloqueio individual por elo</option>
                          {RANK_TIER_ORDER.map((t) => (
                            <option key={t} value={t}>
                              Bloquear a partir de {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-end">
                        <label className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-stone-950 border border-stone-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editRankBlockedTotal}
                            onChange={(e) => setEditRankBlockedTotal(e.target.checked)}
                            className="w-4 h-4 accent-rose-500"
                          />
                          <span className="text-xs font-mono text-rose-200 leading-tight">
                            Bloquear Rank Totalmente (0 RP no Ranqueado)
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="pt-1 flex justify-end">
                      <button
                        type="submit"
                        disabled={savingUser}
                        className="min-h-[42px] px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 disabled:opacity-50 text-stone-950 font-serif font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg"
                      >
                        <Save size={15} />
                        <span>{savingUser ? 'Salvando...' : 'Salvar Alterações'}</span>
                      </button>
                    </div>
                  </form>

                  {/* 4. Quick Admin Actions on Target User */}
                  <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/40 space-y-2.5">
                    <h4 className="text-xs font-serif font-black uppercase tracking-widest text-amber-300 flex items-center gap-1.5">
                      <Sparkles size={14} />
                      <span>Ações Rápidas em {selectedUser.nickname}</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono font-bold">
                      <button
                        type="button"
                        disabled={savingUser}
                        onClick={() =>
                          handleTargetUserAction(
                            'grant_event_classes',
                            'Classes de Evento premiadas!'
                          )
                        }
                        className="sm:col-span-2 py-2 px-3 rounded-xl bg-fuchsia-600/25 hover:bg-fuchsia-500 text-fuchsia-200 hover:text-stone-950 border border-fuchsia-400/50 transition-all cursor-pointer disabled:opacity-50"
                      >
                        Premiar Classes de Evento (Divino / Cósmico / Sombrio / Mágico)
                      </button>
                      <button
                        type="button"
                        disabled={savingUser}
                        onClick={() =>
                          handleTargetUserAction(
                            'unlock_all_cards',
                            '100% das cartas desbloqueadas!'
                          )
                        }
                        className="py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-200 hover:text-stone-950 border border-amber-400/50 transition-all cursor-pointer disabled:opacity-50"
                      >
                        Liberar 100% Cartas
                      </button>
                      <button
                        type="button"
                        disabled={savingUser}
                        onClick={() =>
                          handleTargetUserAction('add_gold_5000', '+5.000 Ouro creditados!')
                        }
                        className="py-2 px-3 rounded-xl bg-yellow-500/20 hover:bg-yellow-500 text-yellow-200 hover:text-stone-950 border border-yellow-400/50 transition-all cursor-pointer disabled:opacity-50"
                      >
                        +5.000 Ouro
                      </button>
                      <button
                        type="button"
                        disabled={savingUser}
                        onClick={() =>
                          handleTargetUserAction('add_crystals_5000', '+5.000 Cristais creditados!')
                        }
                        className="py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-400 text-cyan-200 hover:text-stone-950 border border-cyan-400/50 transition-all cursor-pointer disabled:opacity-50"
                      >
                        +5.000 Cristais
                      </button>
                      <button
                        type="button"
                        disabled={savingUser}
                        onClick={() =>
                          handleTargetUserAction(
                            'unlock_all_cosmetics',
                            'Todos os tapetes, versos e avatares desbloqueados!'
                          )
                        }
                        className="py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-400 text-emerald-200 hover:text-stone-950 border border-emerald-400/50 transition-all cursor-pointer disabled:opacity-50"
                      >
                        Liberar Todos Cosméticos
                      </button>
                      <button
                        type="button"
                        disabled={savingUser}
                        onClick={() =>
                          handleTargetUserAction(
                            'max_level_rank',
                            'Promovido para Nv.50 & Celestial!'
                          )
                        }
                        className="py-2 px-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-400 text-indigo-200 hover:text-stone-950 border border-indigo-400/50 transition-all cursor-pointer disabled:opacity-50"
                      >
                        Nv.50 & Celestial
                      </button>
                      <button
                        type="button"
                        disabled={savingUser}
                        onClick={() =>
                          handleTargetUserAction(
                            'reset_starter_cards',
                            'Resetado para conta inicial!'
                          )
                        }
                        className="py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-200 hover:text-white border border-rose-400/50 transition-all cursor-pointer disabled:opacity-50"
                      >
                        Resetar p/ Deck Inicial
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
