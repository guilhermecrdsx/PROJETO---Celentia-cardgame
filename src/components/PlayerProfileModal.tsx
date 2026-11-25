import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Edit2,
  Check,
  Moon,
  Sun,
  LogOut,
  Coins,
  Trophy,
  Layers,
  Search,
  User,
  Users,
  Crown,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Lock,
  Gift,
  Image as ImageIcon,
} from 'lucide-react';
import { sound } from '../services/soundEffects';
import {
  getPlayerProfile,
  savePlayerProfile,
  savePlayerProfileAsync,
  getMatchHistory,
} from '../utils/matchHistory';
import { getRankInfo, loadRankPoints } from '../utils/rankSystem';
import { useRankPolicy } from '../services/rankPolicyService';
import { AvatarPortrait } from './AvatarPortrait';
import { CARD_AVATARS, FREE_AVATAR_IDS, DEFAULT_AVATAR_ID } from '../data/avatars';
import {
  ACCOUNT_LEVEL_MILESTONES,
  MAX_ACCOUNT_LEVEL,
  XP_PER_ACCOUNT_LEVEL,
} from '../data/levelProgression';
import {
  useCloudPlayerState,
  logoutPlayerAccount,
  getCollectibleCards,
  executeAdminActionInCloud,
  searchPlayersInCloud,
  getPublicPlayerProfileInCloud,
  type PublicPlayerSummaryDTO,
  type PublicPlayerProfileDTO,
} from '../services/accountApi';
import {
  formatHandleDisplay,
  sanitizeHandleDraft,
  validateHandle,
} from '../utils/nickname';

interface PlayerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAdminPanel?: () => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenAdminPanel,
}) => {
  const { playerState } = useCloudPlayerState();
  const { rankPolicy } = useRankPolicy();
  const [activeTab, setActiveTab] = useState<'my_profile' | 'search_players'>('my_profile');

  // Own profile state
  const [profile, setProfile] = useState(() => getPlayerProfile());
  const [isEditingNick, setIsEditingNick] = useState(false);
  const [nickInput, setNickInput] = useState(formatHandleDisplay(profile.nickname));
  const [nickSaving, setNickSaving] = useState(false);
  const [nickFeedback, setNickFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [savingAvatarId, setSavingAvatarId] = useState<string | null>(null);
  const [adminFeedback, setAdminFeedback] = useState<string | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);

  // Player search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PublicPlayerSummaryDTO[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [inspectedProfile, setInspectedProfile] =
    useState<PublicPlayerProfileDTO | null>(null);
  const [loadingInspected, setLoadingInspected] = useState(false);

  const handleAdminAction = async (
    action:
      | 'unlock_all_cards'
      | 'grant_event_classes'
      | 'reset_starter_cards'
      | 'add_gold_5000'
      | 'max_level_rank',
    label: string
  ) => {
    try {
      setAdminBusy(true);
      await executeAdminActionInCloud(action);
      sound.playSpell();
      setAdminFeedback(label);
      setTimeout(() => setAdminFeedback(null), 3000);
    } catch (err: any) {
      setAdminFeedback(err?.message || 'Erro ao executar comando Admin.');
      setTimeout(() => setAdminFeedback(null), 3000);
    } finally {
      setAdminBusy(false);
    }
  };

  useEffect(() => {
    const next = getPlayerProfile();
    setProfile(next);
    if (!isEditingNick) {
      setNickInput(formatHandleDisplay(next.nickname));
    }
  }, [playerState, isOpen, isEditingNick]);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('my_profile');
      setInspectedProfile(null);
      setNickFeedback(null);
      setSearchError(null);
    }
  }, [isOpen]);

  const runPlayerSearch = useCallback(async (queryText: string) => {
    try {
      setSearching(true);
      setSearchError(null);
      const list = await searchPlayersInCloud(queryText);
      setSearchResults(list);
    } catch (err: any) {
      setSearchError(err?.message || 'Não foi possível pesquisar jogadores.');
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && activeTab === 'search_players') {
      void runPlayerSearch(searchQuery);
    }
  }, [isOpen, activeTab, runPlayerSearch]);

  if (!isOpen) return null;

  const matches = playerState?.matches || getMatchHistory();
  const rankPoints = playerState?.rankPoints ?? loadRankPoints();
  const rankInfo = getRankInfo(rankPoints, {
    globalBlockedFromTier: rankPolicy.blockedFromTier,
    playerBlockedTotal: playerState?.rankBlockedTotal,
    playerBlockedFromTier: playerState?.rankBlockFromTier,
  });
  const totalCollectible = getCollectibleCards().length;
  const unlockedCount = playerState?.unlockedCardIds?.length || 0;
  const wins = playerState?.wins ?? matches.filter((m) => m.result === 'victory').length;
  const losses = playerState?.losses ?? matches.filter((m) => m.result === 'defeat').length;
  const currentLevel = Math.min(MAX_ACCOUNT_LEVEL, Math.max(1, profile.level));
  const isMaxLevel = currentLevel >= MAX_ACCOUNT_LEVEL;
  const xpProgressPct = isMaxLevel
    ? 100
    : Math.min(100, Math.round(((profile.xp % XP_PER_ACCOUNT_LEVEL) / XP_PER_ACCOUNT_LEVEL) * 100));
  const unlockedAvatarSet = new Set<string>([
    ...FREE_AVATAR_IDS,
    ...(playerState?.unlockedAvatarIds || []),
  ]);
  const ownedAvatars = CARD_AVATARS.filter((a) => unlockedAvatarSet.has(a.id));
  const currentAvatarId = playerState?.avatarId || profile.avatarId || DEFAULT_AVATAR_ID;
  const pendingCommonPacks = playerState?.pendingCommonPacks ?? 0;
  const claimedMilestones = playerState?.claimedLevelMilestones || [];

  const handleSelectAvatar = async (avatarId: string) => {
    try {
      setSavingAvatarId(avatarId);
      const updated = await savePlayerProfileAsync({ avatarId });
      setProfile(updated);
      sound.playSpell();
      setNickFeedback({
        type: 'success',
        text: 'Avatar equipado com sucesso!',
      });
      setTimeout(() => setNickFeedback(null), 2500);
    } catch (err: any) {
      setNickFeedback({
        type: 'error',
        text: err?.message || 'Não foi possível equipar este avatar.',
      });
    } finally {
      setSavingAvatarId(null);
    }
  };

  const handleSaveNick = async () => {
    setNickFeedback(null);
    const check = validateHandle(nickInput);
    if (!check.valid) {
      setNickFeedback({
        type: 'error',
        text: check.error || 'Formato de @nick inválido.',
      });
      return;
    }

    try {
      setNickSaving(true);
      const updated = await savePlayerProfileAsync({ nickname: check.normalized });
      setProfile(updated);
      setNickInput(formatHandleDisplay(updated.nickname));
      setIsEditingNick(false);
      sound.playSpell();
      setNickFeedback({
        type: 'success',
        text: `Seu @nick único foi atualizado para ${updated.nickname}!`,
      });
      setTimeout(() => setNickFeedback(null), 3500);
    } catch (err: any) {
      setNickFeedback({
        type: 'error',
        text: err?.message || 'Este @nick já está em uso ou é inválido.',
      });
    } finally {
      setNickSaving(false);
    }
  };

  const handleToggleSide = () => {
    const nextSide =
      profile.preferredSide === 'balance'
        ? 'sol'
        : profile.preferredSide === 'sol'
          ? 'lua'
          : 'balance';
    const updated = savePlayerProfile({ preferredSide: nextSide });
    setProfile(updated);
    sound.playSpell();
  };

  const handleLogout = async () => {
    sound.playDraw();
    await logoutPlayerAccount();
    onClose();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playDraw();
    setInspectedProfile(null);
    void runPlayerSearch(searchQuery);
  };

  const handleInspectPlayer = async (uidOrNick: string) => {
    try {
      setLoadingInspected(true);
      setSearchError(null);
      sound.playDraw();
      const details = await getPublicPlayerProfileInCloud(uidOrNick);
      setInspectedProfile(details);
    } catch (err: any) {
      setSearchError(err?.message || 'Não foi possível abrir o perfil deste jogador.');
    } finally {
      setLoadingInspected(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 lg:p-6 bg-black/85 backdrop-blur-md animate-fadeIn select-none"
      onClick={onClose}
    >
      {/* Background magical cosmos */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-cyan-700/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-700/15 rounded-full blur-[140px]" />
      </div>

      {/* Main Profile Modal Container */}
      <div
        className="relative z-10 w-full max-w-5xl max-h-[94dvh] flex flex-col rounded-3xl bg-slate-950/95 border-4 border-stone-700 shadow-[0_0_60px_rgba(0,0,0,0.95)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="relative w-full py-3.5 px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 border-b-2 border-stone-800 bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900">
          <div className="flex items-center gap-2 min-w-0">
            {playerState?.email && (
              <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-stone-900 border border-stone-700 text-[11px] font-mono text-stone-300 truncate max-w-[220px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="truncate">{playerState.email}</span>
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl lg:text-3xl font-serif font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)]">
            PERFIL DO JOGADOR
          </h2>

          <div className="flex justify-end items-center gap-2">
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-rose-950/80 border border-stone-700 hover:border-rose-500 text-stone-300 hover:text-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg"
              title="Encerrar sessão e trocar de conta"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Trocar Conta</span>
            </button>
            <button
              onClick={() => {
                sound.playDraw();
                onClose();
              }}
              className="p-2 rounded-xl bg-stone-900 hover:bg-rose-950/80 border border-stone-700 hover:border-rose-500 text-stone-400 hover:text-rose-200 transition-all cursor-pointer shadow-lg"
              title="Fechar Perfil"
              aria-label="Fechar Perfil"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Profile Sub-navigation Tabs: Meu Perfil | Pesquisar Jogadores */}
        <div className="shrink-0 px-4 sm:px-6 py-2.5 bg-stone-950/90 border-b border-stone-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                sound.playDraw();
                setActiveTab('my_profile');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-serif font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border ${
                activeTab === 'my_profile'
                  ? 'bg-gradient-to-r from-amber-500/25 to-amber-600/20 border-amber-400/80 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'bg-stone-900/80 border-stone-700/80 text-stone-400 hover:text-amber-100'
              }`}
            >
              <User size={14} />
              <span>Meu Perfil</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playDraw();
                setActiveTab('search_players');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-serif font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border ${
                activeTab === 'search_players'
                  ? 'bg-gradient-to-r from-cyan-500/25 to-blue-600/20 border-cyan-400/80 text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                  : 'bg-stone-900/80 border-stone-700/80 text-stone-400 hover:text-cyan-100'
              }`}
            >
              <Search size={14} />
              <span>Pesquisar Jogadores</span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-stone-400">
            Identidade única:{' '}
            <strong className="text-amber-300">{formatHandleDisplay(profile.nickname)}</strong>
          </span>
        </div>

        {/* Content Body */}
        {activeTab === 'my_profile' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* LEFT COLUMN: AVATAR PORTAL, BADGES, NICKNAME & ECONOMY (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="flex items-center justify-center gap-5 sm:gap-6 w-full">
                {/* Circular Stone Rune Portal with Card Art Miniature Avatar */}
                <div className="relative flex flex-col items-center gap-2">
                  <div className="relative w-44 h-44 sm:w-48 sm:h-48 rounded-full border-8 border-stone-700 bg-gradient-to-b from-stone-800 to-stone-950 p-3 shadow-[0_0_35px_rgba(56,189,248,0.4)] flex items-center justify-center">
                    <div className="absolute -top-3 w-5 h-5 bg-cyan-400 rotate-45 border-2 border-white shadow-[0_0_12px_#38bdf8]" />
                    <div className="absolute -bottom-3 w-5 h-5 bg-cyan-400 rotate-45 border-2 border-white shadow-[0_0_12px_#38bdf8]" />
                    <div className="absolute -left-3 w-5 h-5 bg-purple-400 rotate-45 border-2 border-white shadow-[0_0_12px_#c084fc]" />
                    <div className="absolute -right-3 w-5 h-5 bg-purple-400 rotate-45 border-2 border-white shadow-[0_0_12px_#c084fc]" />

                    <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-amber-400/60 bg-stone-950 shadow-inner flex items-center justify-center">
                      <AvatarPortrait
                        avatarId={currentAvatarId}
                        size="xl"
                        isAdmin={playerState?.isAdmin}
                        className="!w-full !h-full !rounded-full !border-0"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTick();
                      setShowAvatarPicker((prev) => !prev);
                    }}
                    className="px-3 py-1 rounded-xl bg-stone-900 hover:bg-stone-800 border border-amber-400/50 text-[11px] font-serif font-bold text-amber-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <ImageIcon size={12} />
                    <span>{showAvatarPicker ? 'Fechar Avatares' : `Trocar Avatar (${ownedAvatars.length})`}</span>
                  </button>
                </div>

                {/* Vertical Badges Stack Beside Portal */}
                <div className="flex flex-col items-center gap-3.5">
                  {/* 1. Lado Preferido */}
                  <div className="flex flex-col items-center">
                    <button
                      onClick={handleToggleSide}
                      className="relative w-16 h-16 rounded-2xl bg-gradient-to-b from-stone-800 to-stone-950 border-3 border-stone-600 hover:border-amber-400 shadow-[0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center p-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95 group"
                      title="Clique para alternar seu Lado Preferido (Sol / Lua)"
                    >
                      <div className="relative w-full h-full rounded-xl overflow-hidden flex items-center justify-center border border-white/10">
                        {profile.preferredSide === 'sol' ? (
                          <div className="w-full h-full bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-300 flex items-center justify-center text-stone-950 shadow-inner">
                            <Sun size={26} className="text-stone-950 fill-stone-950" />
                          </div>
                        ) : profile.preferredSide === 'lua' ? (
                          <div className="w-full h-full bg-gradient-to-tr from-cyan-900 via-blue-700 to-cyan-400 flex items-center justify-center text-white shadow-inner">
                            <Moon size={26} className="text-white fill-cyan-100" />
                          </div>
                        ) : (
                          <div className="relative w-full h-full flex">
                            <div className="w-1/2 h-full bg-gradient-to-b from-cyan-800 to-blue-900 flex items-center justify-end pr-0.5">
                              <span className="text-sm">🌙</span>
                            </div>
                            <div className="w-1/2 h-full bg-gradient-to-b from-amber-500 to-yellow-600 flex items-center justify-start pl-0.5">
                              <span className="text-sm">☀️</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                    <span className="text-[10px] uppercase font-serif tracking-wider text-amber-200/90 font-bold mt-1 text-center">
                      lado preferido
                    </span>
                  </div>

                  {/* 2. RANK */}
                  <div className="flex flex-col items-center">
                    <div className={`relative w-20 h-18 rounded-2xl bg-gradient-to-b ${rankInfo.badgeGradient} border-2 ${rankInfo.borderClass} shadow-[0_0_20px_rgba(245,158,11,0.35)] flex flex-col items-center justify-center p-1`}>
                      <span className="text-xl drop-shadow">
                        {rankInfo.icon}
                      </span>
                      <span className={`text-[9px] font-black tracking-wide uppercase mt-0.5 text-center leading-tight ${rankInfo.textColor}`}>
                        {rankInfo.label}
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-serif tracking-wider text-amber-300 font-bold mt-1 text-center tabular-nums">
                      {rankInfo.pointsInDivision}/100 RP
                    </span>
                  </div>

                  {/* 3. NÍVEL */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <div className="w-13 h-13 bg-gradient-to-tr from-cyan-600 via-blue-500 to-cyan-300 rotate-45 rounded-lg border-2 border-white shadow-[0_0_15px_#38bdf8] flex items-center justify-center">
                        <span className="-rotate-45 text-stone-950 font-black font-mono text-base tabular-nums">
                          {currentLevel}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-serif tracking-wider text-cyan-300 font-bold mt-1 text-center">
                      NÍVEL {isMaxLevel ? 'MAX' : `/ ${MAX_ACCOUNT_LEVEL}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Owned Avatar Quick Picker Drawer */}
              {showAvatarPicker && (
                <div className="mt-4 w-full max-w-sm p-3 rounded-2xl bg-stone-900/95 border border-amber-400/50 space-y-2.5 shadow-xl">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-amber-300 font-bold uppercase">
                      Avatares Desbloqueados ({ownedAvatars.length}/{CARD_AVATARS.length})
                    </span>
                    <span className="text-stone-400">Mais 50 na Loja</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 max-h-44 overflow-y-auto pr-1">
                    {ownedAvatars.map((av) => {
                      const active = av.id === currentAvatarId;
                      return (
                        <button
                          key={av.id}
                          type="button"
                          disabled={savingAvatarId === av.id}
                          onClick={() => void handleSelectAvatar(av.id)}
                          title={`${av.name} — ${av.title}`}
                          className={`relative rounded-xl p-0.5 transition-all cursor-pointer ${
                            active
                              ? 'ring-2 ring-amber-400 bg-amber-500/25 scale-105'
                              : 'hover:ring-1 hover:ring-cyan-400/70 opacity-85 hover:opacity-100'
                          }`}
                        >
                          <AvatarPortrait avatarId={av.id} size="md" className="!w-full !h-12" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Unique @Nick Plaque Below Avatar */}
              <div className="mt-5 w-full max-w-xs space-y-1.5">
                <div className="relative py-2.5 px-4 rounded-2xl bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border-2 border-stone-600 shadow-[0_4px_15px_rgba(0,0,0,0.8)] flex items-center justify-between gap-2">
                  {isEditingNick ? (
                    <div className="flex items-center gap-2 w-full">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-400 font-mono font-black text-sm">
                          @
                        </span>
                        <input
                          type="text"
                          maxLength={17}
                          disabled={nickSaving}
                          value={nickInput.replace(/^@+/, '')}
                          onChange={(e) =>
                            setNickInput(sanitizeHandleDraft(e.target.value))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void handleSaveNick();
                            if (e.key === 'Escape') {
                              setIsEditingNick(false);
                              setNickFeedback(null);
                              setNickInput(formatHandleDisplay(profile.nickname));
                            }
                          }}
                          className="w-full bg-stone-950 border border-amber-400/60 rounded-lg pl-7 pr-2.5 py-1 text-sm text-amber-100 font-mono font-bold focus:outline-none"
                          placeholder="seunick"
                          autoFocus
                        />
                      </div>
                      <button
                        type="button"
                        disabled={nickSaving}
                        onClick={() => void handleSaveNick()}
                        className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white cursor-pointer"
                        title="Salvar @nick único"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={nickSaving}
                        onClick={() => {
                          setIsEditingNick(false);
                          setNickFeedback(null);
                          setNickInput(formatHandleDisplay(profile.nickname));
                        }}
                        className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
                        title="Cancelar edição"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-lg sm:text-xl font-serif font-black tracking-wide text-amber-200 drop-shadow truncate">
                        {formatHandleDisplay(profile.nickname)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setNickFeedback(null);
                          setNickInput(formatHandleDisplay(profile.nickname));
                          setIsEditingNick(true);
                        }}
                        className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-amber-300 transition-colors cursor-pointer shrink-0"
                        title="Alterar @Nick único"
                      >
                        <Edit2 size={14} />
                      </button>
                    </>
                  )}
                </div>

                {isEditingNick && (
                  <p className="text-[10px] font-mono text-stone-400 text-center">
                    Formato obrigatório <span className="text-amber-300">@nick</span> · único no servidor (letras, números, . ou _)
                  </p>
                )}

                {nickFeedback && (
                  <div
                    className={`px-3 py-2 rounded-xl border text-[11px] flex items-center gap-2 ${
                      nickFeedback.type === 'success'
                        ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
                        : 'bg-rose-950/80 border-rose-500/60 text-rose-200'
                    }`}
                  >
                    {nickFeedback.type === 'success' ? (
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle size={14} className="text-rose-400 shrink-0" />
                    )}
                    <span>{nickFeedback.text}</span>
                  </div>
                )}
              </div>

              {/* Cloud Account Stats Summary (Gold, XP, Wins/Losses, Collection) */}
              <div className="mt-4 w-full max-w-xs space-y-2.5">
                {/* XP & Milestones Card */}
                <div className="p-3 rounded-2xl bg-stone-900/90 border border-stone-700 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-cyan-300 font-bold">
                      Nível {currentLevel} / {MAX_ACCOUNT_LEVEL}
                    </span>
                    <span className="text-stone-300 tabular-nums">
                      {isMaxLevel ? 'NÍVEL MÁXIMO' : `${profile.xp % XP_PER_ACCOUNT_LEVEL} / ${XP_PER_ACCOUNT_LEVEL} XP`}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-950 overflow-hidden border border-stone-800">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-300"
                      style={{ width: `${xpProgressPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    {ACCOUNT_LEVEL_MILESTONES.map((ms) => {
                      const done = claimedMilestones.includes(ms) || currentLevel >= ms;
                      return (
                        <div
                          key={ms}
                          title={`Nível ${ms}: +100 Ouro + 1 Pacote Comum`}
                          className={`flex-1 py-0.5 rounded text-center text-[9px] font-mono font-bold border ${
                            done
                              ? 'bg-emerald-950/70 border-emerald-400/60 text-emerald-300'
                              : 'bg-stone-950 border-stone-800 text-stone-500'
                          }`}
                        >
                          Nv.{ms}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-stone-400 leading-tight">
                    A cada 10 níveis: <strong className="text-amber-300">+100 Ouro</strong> e <strong className="text-emerald-300">+1 Pacote Comum</strong>.
                  </p>
                  {pendingCommonPacks > 0 && (
                    <div className="px-2.5 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-[10px] font-mono font-bold text-emerald-200 flex items-center gap-1.5">
                      <Gift size={12} className="text-emerald-300 shrink-0" />
                      <span>{pendingCommonPacks} Pacote(s) Comum(ns) grátis na Loja!</span>
                    </div>
                  )}
                </div>

                {/* Rank Lock Notice if Capped or Frozen */}
                {(rankInfo.isTotallyBlocked || rankInfo.isCapped) && (
                  <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/60 text-[11px] text-amber-200 flex items-start gap-2">
                    <Lock size={14} className="text-amber-300 shrink-0 mt-0.5" />
                    <div>
                      {rankInfo.isTotallyBlocked ? (
                        <span>Progressão ranqueada bloqueada pelo Admin (modo ranqueado segue jogável sem alterar RP).</span>
                      ) : (
                        <span>
                          Teto de rank ativo antes de <strong>{rankInfo.effectiveBlockedFromTier}</strong>: exibindo{' '}
                          <strong>{rankInfo.label}</strong>. Seus <strong>{rankPoints} RP</strong> continuam acumulando ({rankInfo.rawLabel} ao liberar).
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Gold, Win/Loss & Unlocked Cards */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-stone-900/90 border border-amber-500/40 flex flex-col items-center">
                    <div className="flex items-center gap-1 text-amber-300 font-mono font-black text-sm tabular-nums">
                      <Coins size={13} className="text-amber-400" />
                      <span>{profile.gold}</span>
                    </div>
                    <span className="text-[10px] text-stone-400 uppercase font-bold mt-0.5">Ouro</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-stone-900/90 border border-cyan-500/40 flex flex-col items-center">
                    <div className="flex items-center gap-1 text-cyan-300 font-mono font-black text-sm tabular-nums">
                      <Trophy size={13} className="text-cyan-400" />
                      <span>{wins}V/{losses}D</span>
                    </div>
                    <span className="text-[10px] text-stone-400 uppercase font-bold mt-0.5">Batalhas</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-stone-900/90 border border-purple-500/40 flex flex-col items-center">
                    <div className="flex items-center gap-1 text-purple-300 font-mono font-black text-sm tabular-nums">
                      <Layers size={13} className="text-purple-400" />
                      <span>
                        {unlockedCount}/{totalCollectible}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-400 uppercase font-bold mt-0.5">Cartas</span>
                  </div>
                </div>

                {/* Admin Permissions Panel */}
                {playerState?.isAdmin && (
                  <div className="p-3 rounded-2xl bg-amber-950/30 border-2 border-amber-500/60 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-serif font-black uppercase tracking-wider text-amber-300">
                        👑 Painel Admin
                      </span>
                      {adminFeedback && (
                        <span className="text-[10px] font-mono text-emerald-300 font-bold">
                          {adminFeedback}
                        </span>
                      )}
                    </div>

                    {onOpenAdminPanel && (
                      <button
                        type="button"
                        onClick={() => {
                          sound.playSpell();
                          onOpenAdminPanel();
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-stone-950 font-serif font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow"
                      >
                        <Crown size={14} />
                        <span>Abrir Painel Admin Completo</span>
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono font-bold">
                      <button
                        type="button"
                        disabled={adminBusy}
                        onClick={() =>
                          handleAdminAction(
                            'grant_event_classes',
                            'Classes de Evento Premiadas!'
                          )
                        }
                        className="col-span-2 py-1.5 px-2 rounded-lg bg-fuchsia-600/30 hover:bg-fuchsia-500 text-fuchsia-200 hover:text-stone-950 border border-fuchsia-400/60 transition-all cursor-pointer"
                      >
                        🏆 Premiar Classes de Evento
                      </button>
                      <button
                        type="button"
                        disabled={adminBusy}
                        onClick={() => handleAdminAction('unlock_all_cards', '100% Cartas Liberadas!')}
                        className="py-1.5 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-200 hover:text-stone-950 border border-amber-400/50 transition-all cursor-pointer"
                      >
                        🔓 100% Cartas
                      </button>
                      <button
                        type="button"
                        disabled={adminBusy}
                        onClick={() => handleAdminAction('add_gold_5000', '+5.000 Ouro!')}
                        className="py-1.5 px-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500 text-yellow-200 hover:text-stone-950 border border-yellow-400/50 transition-all cursor-pointer"
                      >
                        🪙 +5.000 Ouro
                      </button>
                      <button
                        type="button"
                        disabled={adminBusy}
                        onClick={() => handleAdminAction('max_level_rank', 'Nv.50 & Celestial I!')}
                        className="py-1.5 px-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 text-cyan-200 hover:text-stone-950 border border-cyan-400/50 transition-all cursor-pointer"
                      >
                        ⚡ Nv.50 & Celestial I
                      </button>
                      <button
                        type="button"
                        disabled={adminBusy}
                        onClick={() => handleAdminAction('reset_starter_cards', 'Resetado p/ Inicial!')}
                        className="py-1.5 px-2 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-200 hover:text-white border border-rose-400/50 transition-all cursor-pointer"
                      >
                        🔄 Resetar Conta
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: HISTÓRICO DE PARTIDAS TABLET (7 cols) */}
            <div className="lg:col-span-7 flex flex-col w-full">
              <div className="relative w-full rounded-3xl bg-stone-900/90 border-4 border-stone-700 p-4 sm:p-6 shadow-[0_0_35px_rgba(0,0,0,0.8)]">
                <div className="absolute -top-2 -left-2 w-4 h-4 bg-purple-400 rotate-45 border border-white shadow-[0_0_8px_#c084fc]" />
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-purple-400 rotate-45 border border-white shadow-[0_0_8px_#c084fc]" />
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-purple-400 rotate-45 border border-white shadow-[0_0_8px_#c084fc]" />
                <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-cyan-400 rotate-45 border border-white shadow-[0_0_8px_#38bdf8]" />

                <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-700/80">
                  <h3 className="text-xl sm:text-2xl font-serif font-black tracking-widest text-amber-200">
                    HISTÓRICO DE PARTIDAS
                  </h3>
                  <span className="text-xs font-mono text-stone-400">
                    {matches.length} partidas salvas na nuvem
                  </span>
                </div>

                <div className="flex flex-col gap-3 max-h-[440px] overflow-y-auto pr-1.5">
                  {matches.length === 0 ? (
                    <div className="py-16 text-center text-stone-400 text-xs sm:text-sm space-y-1">
                      <p className="font-serif font-bold text-amber-200/80">
                        Nenhuma batalha registrada nesta conta ainda
                      </p>
                      <p className="text-stone-500">
                        Dispute uma partida para ganhar +150 Ouro, +120 XP e salvar seu histórico na nuvem!
                      </p>
                    </div>
                  ) : (
                    matches.map((match) => {
                      const isVictory = match.result === 'victory';

                      return (
                        <div
                          key={match.id}
                          className={`relative w-full p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 shadow-md ${
                            isVictory
                              ? 'bg-gradient-to-r from-cyan-950/40 via-stone-950 to-stone-900 border-cyan-500/50 hover:border-cyan-400'
                              : 'bg-gradient-to-r from-rose-950/40 via-stone-950 to-stone-900 border-rose-500/50 hover:border-rose-400'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-[140px]">
                            {isVictory ? (
                              <div className="w-8 h-8 rounded-lg bg-cyan-400/20 border-2 border-cyan-300 rotate-45 flex items-center justify-center shadow-[0_0_10px_#38bdf8] shrink-0">
                                <span className="-rotate-45 text-cyan-200 text-xs">💎</span>
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-rose-500/20 border-2 border-rose-400 rotate-45 flex items-center justify-center shadow-[0_0_10px_#f43f5e] shrink-0">
                                <span className="-rotate-45 text-rose-200 text-xs">🛡️</span>
                              </div>
                            )}

                            <div className="flex flex-col">
                              <span
                                className={`font-serif font-black text-sm sm:text-base tracking-wider ${
                                  isVictory
                                    ? 'text-cyan-300 drop-shadow-[0_0_6px_#38bdf8]'
                                    : 'text-rose-400 drop-shadow-[0_0_6px_#f43f5e]'
                                }`}
                              >
                                {isVictory ? 'VITÓRIA' : 'DERROTA'}
                              </span>
                              <span className="text-[10px] text-stone-400 font-mono truncate max-w-[140px]">
                                {match.deckName}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-950 border border-amber-500/40 text-xs font-mono font-bold text-amber-300 shadow">
                              <span>🏆</span>
                              <span>{match.rpChange > 0 ? `+${match.rpChange}` : match.rpChange} RP</span>
                            </div>
                            {match.goldEarned !== undefined && match.goldEarned > 0 && (
                              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-950 border border-yellow-500/40 text-xs font-mono font-bold text-yellow-300 shadow">
                                <span>🪙</span>
                                <span>+{match.goldEarned}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2.5 text-right">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-stone-200 truncate max-w-[120px]">
                                {match.opponentName}
                              </span>
                              <span className="text-[10px] text-stone-400 font-mono">
                                {match.date}
                              </span>
                            </div>

                            <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-600 flex items-center justify-center text-xs shrink-0 shadow">
                              ⚔️
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ================================================================ */
          /* TAB 2: PESQUISAR PERFIS DE OUTROS JOGADORES                      */
          /* ================================================================ */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-5">
            {/* Search Form */}
            <form
              onSubmit={handleSearchSubmit}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-3.5 rounded-2xl bg-stone-900/90 border-2 border-cyan-500/35 shadow-lg"
            >
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Digite o @nick do duelista (ex: @arcanista)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-950 border border-stone-700 focus:border-cyan-400 text-sm font-mono text-stone-100 placeholder-stone-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 disabled:opacity-50 text-white font-serif font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                <Search size={15} />
                <span>{searching ? 'Buscando...' : 'Pesquisar'}</span>
              </button>
            </form>

            {searchError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="text-rose-400 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            {inspectedProfile ? (
              /* PUBLIC PROFILE INSPECTION VIEW */
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => {
                    sound.playDraw();
                    setInspectedProfile(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-cyan-400/60 text-xs font-serif font-bold uppercase tracking-wider text-cyan-200 flex items-center gap-2 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Voltar à Lista de Jogadores</span>
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  {/* Left: Public Identity & Stats */}
                  {(() => {
                    const inspectedRank = getRankInfo(inspectedProfile.rankPoints, {
                      globalBlockedFromTier: rankPolicy.blockedFromTier,
                      playerBlockedTotal: inspectedProfile.rankBlockedTotal,
                      playerBlockedFromTier: inspectedProfile.rankBlockFromTier,
                    });
                    return (
                  <div className="lg:col-span-5 rounded-3xl bg-stone-900/90 border-2 border-cyan-500/45 p-5 space-y-4 shadow-xl">
                    <div className="flex items-center gap-4">
                      <AvatarPortrait
                        avatarId={inspectedProfile.avatarId}
                        size="lg"
                        isAdmin={inspectedProfile.isAdmin}
                        showFrameGem
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl font-serif font-black text-amber-200 truncate">
                            {inspectedProfile.nickname}
                          </h3>
                          {inspectedProfile.isAdmin && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/60 text-[10px] font-mono font-bold text-amber-300">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-stone-400 mt-0.5">
                          Nível {inspectedProfile.level} · {inspectedRank.label} ({inspectedProfile.rankPoints} RP)
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-stone-950 border border-amber-500/40">
                        <div className="text-sm font-mono font-black text-amber-300">
                          {inspectedRank.label}
                        </div>
                        <div className="text-[10px] text-stone-400 uppercase font-bold mt-0.5">
                          {inspectedProfile.rankPoints} RP
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-stone-950 border border-cyan-500/40">
                        <div className="text-sm font-mono font-black text-cyan-300">
                          {inspectedProfile.wins}V/{inspectedProfile.losses}D
                        </div>
                        <div className="text-[10px] text-stone-400 uppercase font-bold mt-0.5">
                          Batalhas
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-stone-950 border border-purple-500/40">
                        <div className="text-sm font-mono font-black text-purple-300">
                          {inspectedProfile.unlockedCount}/{inspectedProfile.totalCollectible}
                        </div>
                        <div className="text-[10px] text-stone-400 uppercase font-bold mt-0.5">
                          Cartas
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-stone-950/90 border border-stone-800 flex items-center justify-between text-xs">
                      <span className="text-stone-400 font-serif uppercase tracking-wider">
                        Lado Preferido
                      </span>
                      <span className="font-serif font-black text-amber-200 flex items-center gap-1.5">
                        {inspectedProfile.preferredSide === 'sol' ? (
                          <>
                            <Sun size={14} className="text-amber-400" /> Sol
                          </>
                        ) : inspectedProfile.preferredSide === 'lua' ? (
                          <>
                            <Moon size={14} className="text-cyan-300" /> Lua
                          </>
                        ) : (
                          <span>🌙 Equilíbrio ☀️</span>
                        )}
                      </span>
                    </div>
                  </div>
                    );
                  })()}

                  {/* Right: Public Match History */}
                  <div className="lg:col-span-7 rounded-3xl bg-stone-900/90 border-2 border-stone-700 p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                      <h4 className="font-serif font-black text-base uppercase tracking-wider text-amber-200">
                        Partidas Recentes de {inspectedProfile.nickname}
                      </h4>
                      <span className="text-[11px] font-mono text-stone-400">
                        {inspectedProfile.recentMatches.length} registros
                      </span>
                    </div>

                    {inspectedProfile.recentMatches.length === 0 ? (
                      <p className="text-center text-xs text-stone-500 py-10">
                        Este duelista ainda não concluiu partidas registradas.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                        {inspectedProfile.recentMatches.map((m) => {
                          const isWin = m.result === 'victory';
                          return (
                            <div
                              key={m.id}
                              className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                                isWin
                                  ? 'bg-cyan-950/25 border-cyan-500/40'
                                  : 'bg-rose-950/25 border-rose-500/40'
                              }`}
                            >
                              <div className="min-w-0">
                                <span
                                  className={`font-serif font-black uppercase ${
                                    isWin ? 'text-cyan-300' : 'text-rose-400'
                                  }`}
                                >
                                  {isWin ? 'Vitória' : 'Derrota'}
                                </span>
                                <span className="text-stone-400 font-mono text-[10px] block truncate max-w-[180px]">
                                  {m.deckName}
                                </span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full bg-stone-950 border border-amber-500/40 font-mono text-amber-300 font-bold shrink-0">
                                {m.rpChange > 0 ? `+${m.rpChange}` : m.rpChange} RP
                              </span>
                              <div className="text-right min-w-0">
                                <span className="text-stone-200 font-bold block truncate max-w-[130px]">
                                  vs {m.opponentName}
                                </span>
                                <span className="text-[10px] font-mono text-stone-400">
                                  {m.date}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* SEARCH RESULTS GRID */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-serif font-black uppercase tracking-widest text-amber-200 flex items-center gap-2">
                    <Users size={15} className="text-cyan-400" />
                    <span>
                      {searchQuery.trim()
                        ? `Resultados para "${searchQuery.trim()}"`
                        : 'Duelistas em Destaque no Reino'}
                    </span>
                  </h3>
                  <span className="text-[11px] font-mono text-stone-400">
                    {searchResults.length} encontrados
                  </span>
                </div>

                {searching || loadingInspected ? (
                  <p className="text-center text-xs text-stone-400 py-12">
                    Consultando os registros do Santuário...
                  </p>
                ) : searchResults.length === 0 ? (
                  <div className="py-12 rounded-2xl bg-stone-900/60 border border-dashed border-stone-700 text-center space-y-1">
                    <p className="text-sm font-serif font-bold text-stone-300">
                      Nenhum jogador encontrado com esse @nick.
                    </p>
                    <p className="text-xs text-stone-500">
                      Verifique a grafia ou pesquise por parte do @nick.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {searchResults.map((p) => {
                      const rInfo = getRankInfo(p.rankPoints, {
                        globalBlockedFromTier: rankPolicy.blockedFromTier,
                        playerBlockedTotal: p.rankBlockedTotal,
                        playerBlockedFromTier: p.rankBlockFromTier,
                      });
                      const isMe = playerState?.uid === p.uid;
                      return (
                        <button
                          key={p.uid}
                          type="button"
                          onClick={() => void handleInspectPlayer(p.uid)}
                          className="group text-left p-4 rounded-2xl bg-stone-900/85 hover:bg-stone-800/95 border-2 border-stone-700/85 hover:border-cyan-400/75 transition-all cursor-pointer shadow-md flex flex-col justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <AvatarPortrait
                              avatarId={p.avatarId}
                              size="md"
                              isAdmin={p.isAdmin}
                              showFrameGem
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-serif font-black text-sm text-amber-100 group-hover:text-white truncate">
                                  {p.nickname}
                                </span>
                                {isMe && (
                                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-[9px] font-mono font-bold text-cyan-300">
                                    VOCÊ
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] font-mono text-stone-400">
                                Nv.{p.level} · {rInfo.label} ({p.rankPoints} RP)
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-mono pt-2 border-t border-stone-800">
                            <span className="text-cyan-300 font-bold">
                              {p.wins}V / {p.losses}D
                            </span>
                            <span className="text-purple-300">
                              {p.unlockedCount}/{p.totalCollectible} cartas
                            </span>
                            <span className="text-amber-300 font-serif font-bold uppercase text-[10px] group-hover:translate-x-0.5 transition-transform">
                              Ver Perfil →
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
