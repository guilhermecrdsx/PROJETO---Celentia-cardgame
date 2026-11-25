import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  ShoppingBag,
  Package,
  Palette,
  Search,
  Check,
  Lock,
  Layers,
  Sparkles,
  Info,
  UserCircle2,
  Coins,
} from 'lucide-react';
import { CARD_TEMPLATES } from '../data/cards';
import { CardTemplate, ElementType, KingdomType, TierType } from '../types/game';
import { createCardInstance } from '../logic/deckFactory';
import { CardView } from './CardView';
import { CardModal } from './CardModal';
import { AvatarPortrait } from './AvatarPortrait';
import {
  PackChestOpeningModal,
  type PackChestRevealResult,
} from './PackChestOpeningModal';
import {
  CARD_AVATARS,
  FREE_AVATAR_IDS,
  PAID_AVATARS,
  type CardAvatarEntry,
} from '../data/avatars';
import {
  DUPLICATE_CARD_GOLD_REFUND,
  LUCKY_PACK_TIER_WEIGHTS,
  PACK_DEFINITIONS,
  type PackDefinition,
  type PackType,
} from '../data/packs';
import {
  useCloudPlayerState,
  isCardUnlocked,
  isEventExclusiveCard,
  getCardUnlockCost,
  unlockCardWithGoldInCloud,
  openPackInCloud,
  unlockAvatarInCloud,
  syncProfileToCloud,
  getCollectibleCards,
  type PackDropItemDTO,
} from '../services/accountApi';
import {
  useVisualPreferences,
  PLAYMAT_OPTIONS,
  CARD_BACK_OPTIONS,
} from '../utils/visualTheme';
import { sound } from '../services/soundEffects';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'cards' | 'packs' | 'avatars' | 'themes';
}

type ShopTab = 'cards' | 'packs' | 'avatars' | 'themes';
type OwnershipFilter = 'available' | 'all' | 'owned' | 'exclusive';
type AvatarFilter = 'store' | 'available' | 'owned';

const SHOP_ELEMENTS: ('all' | ElementType)[] = [
  'all',
  'Fogo',
  'Água',
  'Telúrico',
  'Elétrico',
  'Gelo',
  'Neutro',
  'Mágico',
  'Cósmico',
  'Sombrio',
  'Divino',
];

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'cards',
}) => {
  const { playerState } = useCloudPlayerState();
  const { playmat, cardBack, setPlaymat, setCardBack } = useVisualPreferences();

  const [activeTab, setActiveTab] = useState<ShopTab>(initialTab);
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('available');
  const [kingdomFilter, setKingdomFilter] = useState<'all' | KingdomType>('all');
  const [elementFilter, setElementFilter] = useState<'all' | ElementType>('all');
  const [tierFilter, setTierFilter] = useState<'all' | TierType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const [unlockingCardId, setUnlockingCardId] = useState<string | null>(null);

  // Packs state
  const [openingPackKey, setOpeningPackKey] = useState<string | null>(null);
  const [activePackChest, setActivePackChest] = useState<{
    packId: PackType;
    packName: string;
    packSubtitle?: string;
    usedFreePack: boolean;
    result: PackChestRevealResult | null;
  } | null>(null);

  // Avatars state
  const [avatarFilter, setAvatarFilter] = useState<AvatarFilter>('store');
  const [avatarTierFilter, setAvatarTierFilter] = useState<'all' | 1 | 2 | 3 | 4 | 5>('all');
  const [avatarSearch, setAvatarSearch] = useState('');
  const [busyAvatarId, setBusyAvatarId] = useState<string | null>(null);

  const [inspectedCard, setInspectedCard] = useState<CardTemplate | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const collectibleCards = useMemo(() => getCollectibleCards(), []);

  const shopStats = useMemo(() => {
    let owned = 0;
    let purchasableRemaining = 0;
    for (const c of collectibleCards) {
      if (isCardUnlocked(c.id)) {
        owned += 1;
      } else if (!isEventExclusiveCard(c.id)) {
        purchasableRemaining += 1;
      }
    }
    return {
      owned,
      total: collectibleCards.length,
      purchasableRemaining,
    };
  }, [collectibleCards, playerState?.unlockedCardIds]);

  const unlockedAvatarSet = useMemo(() => {
    const set = new Set<string>(FREE_AVATAR_IDS);
    for (const id of playerState?.unlockedAvatarIds || []) {
      set.add(id);
    }
    return set;
  }, [playerState?.unlockedAvatarIds]);

  const filteredCards = useMemo(() => {
    return collectibleCards
      .filter((card) => {
        const unlocked = isCardUnlocked(card.id);
        const exclusive = isEventExclusiveCard(card.id);

        if (ownershipFilter === 'available' && (unlocked || exclusive)) return false;
        if (ownershipFilter === 'owned' && !unlocked) return false;
        if (ownershipFilter === 'exclusive' && !exclusive) return false;

        if (kingdomFilter !== 'all' && card.kingdom !== kingdomFilter) return false;
        if (elementFilter !== 'all') {
          if (elementFilter === 'Telúrico') {
            if (card.element !== 'Telúrico' && card.element !== 'Terra') return false;
          } else if (card.element !== elementFilter) {
            return false;
          }
        }
        if (tierFilter !== 'all') {
          if (tierFilter === 5) {
            if (card.tier !== 5 && card.tier !== 6) return false;
          } else if (card.tier !== tierFilter) {
            return false;
          }
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = card.name.toLowerCase().includes(q);
          const matchDesc = (card.effectDescription || '').toLowerCase().includes(q);
          const matchElem = (card.element || '').toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchElem) return false;
        }
        return true;
      })
      .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
  }, [
    collectibleCards,
    ownershipFilter,
    kingdomFilter,
    elementFilter,
    tierFilter,
    searchQuery,
    playerState?.unlockedCardIds,
  ]);

  const filteredAvatars = useMemo(() => {
    const baseList: CardAvatarEntry[] =
      avatarFilter === 'owned'
        ? CARD_AVATARS.filter((a) => unlockedAvatarSet.has(a.id))
        : avatarFilter === 'available'
        ? PAID_AVATARS.filter((a) => !unlockedAvatarSet.has(a.id))
        : PAID_AVATARS;

    return baseList.filter((av) => {
      if (avatarTierFilter !== 'all' && av.tier !== avatarTierFilter) return false;
      if (avatarSearch.trim()) {
        const q = avatarSearch.toLowerCase();
        if (
          !av.name.toLowerCase().includes(q) &&
          !av.title.toLowerCase().includes(q) &&
          !av.kingdom.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [avatarFilter, avatarTierFilter, avatarSearch, unlockedAvatarSet]);

  const feedbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const playerGold = playerState?.gold ?? 1000;
  const pendingCommonPacks = playerState?.pendingCommonPacks ?? 0;

  const showNotice = (text: string, kind: 'success' | 'error' = 'success') => {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    setFeedback({ text, kind });
    feedbackTimerRef.current = window.setTimeout(() => {
      feedbackTimerRef.current = null;
      setFeedback(null);
    }, 4500);
  };

  const handleBuyCard = async (card: CardTemplate) => {
    try {
      setUnlockingCardId(card.id);
      const res = await unlockCardWithGoldInCloud(card.id);
      sound.playSpell();
      showNotice(`${card.name} adicionada à sua coleção (-${res.costPaid} Ouro)!`, 'success');
    } catch (err: any) {
      sound.playTick();
      showNotice(err?.message || 'Não foi possível comprar esta carta.', 'error');
    } finally {
      setUnlockingCardId(null);
    }
  };

  const handleOpenPack = async (pack: PackDefinition, useFree = false) => {
    const lockKey = `${pack.id}_${useFree ? 'free' : 'gold'}`;
    try {
      setOpeningPackKey(lockKey);
      setActivePackChest({
        packId: pack.id,
        packName: pack.name,
        packSubtitle: pack.subtitle,
        usedFreePack: useFree,
        result: null,
      });

      const res = await openPackInCloud(pack.id, useFree);

      const resolvedDrops = res.drops
        .map((d) => {
          const tpl = CARD_TEMPLATES.find((c) => c.id === d.cardId);
          return tpl ? { ...d, template: tpl } : null;
        })
        .filter((d): d is PackDropItemDTO & { template: CardTemplate } => Boolean(d));

      setActivePackChest((prev) =>
        prev
          ? {
              ...prev,
              usedFreePack: res.usedFreePack,
              result: {
                drops: resolvedDrops,
                totalRefundGold: res.totalRefundGold,
                usedFreePack: res.usedFreePack,
              },
            }
          : null
      );

      const newCount = resolvedDrops.filter((d) => !d.isDuplicate).length;
      const dupCount = resolvedDrops.length - newCount;
      const refundMsg = res.totalRefundGold > 0 ? ` (+${res.totalRefundGold} Ouro de repetidas)` : '';
      showNotice(
        `${pack.name} aberto: ${resolvedDrops.length} cartas (${newCount} nova(s), ${dupCount} repetida(s))${refundMsg}.`,
        'success'
      );
    } catch (err: any) {
      setActivePackChest(null);
      sound.playTick();
      showNotice(err?.message || 'Não foi possível abrir o pacote.', 'error');
    } finally {
      setOpeningPackKey(null);
    }
  };

  const handleBuyAvatar = async (av: CardAvatarEntry) => {
    try {
      setBusyAvatarId(av.id);
      const res = await unlockAvatarInCloud(av.id, true);
      sound.playSpell();
      showNotice(`Avatar "${av.name}" desbloqueado e equipado (-${res.costPaid} Ouro)!`, 'success');
    } catch (err: any) {
      sound.playTick();
      showNotice(err?.message || 'Não foi possível comprar este avatar.', 'error');
    } finally {
      setBusyAvatarId(null);
    }
  };

  const handleEquipAvatar = async (av: CardAvatarEntry) => {
    try {
      setBusyAvatarId(av.id);
      await syncProfileToCloud({ avatarId: av.id });
      sound.playSpell();
      showNotice(`Avatar "${av.name}" equipado!`, 'success');
    } catch (err: any) {
      sound.playTick();
      showNotice(err?.message || 'Não foi possível equipar este avatar.', 'error');
    } finally {
      setBusyAvatarId(null);
    }
  };

  const inspectedInstance = inspectedCard ? createCardInstance(inspectedCard) : null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/88 backdrop-blur-md animate-fadeIn select-none"
        onClick={onClose}
      >
        <div
          className="relative z-10 w-full max-w-6xl h-[92dvh] flex flex-col rounded-3xl bg-gradient-to-b from-[#151221] via-[#0e0c17] to-[#08070d] border-2 border-amber-500/45 shadow-[0_25px_75px_rgba(0,0,0,0.95)] text-stone-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 sm:px-7 py-4 border-b border-stone-800 bg-stone-950/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/25 via-amber-700/20 to-stone-950 border border-amber-400/60 flex items-center justify-center text-amber-300 shadow-inner">
                <ShoppingBag size={22} />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-serif font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500">
                  LOJA DE CELENTIA
                </h2>
                <div className="flex items-center gap-2 text-xs text-stone-400 flex-wrap">
                  <span>Coleção: {shopStats.owned}/{shopStats.total}</span>
                  <span aria-hidden="true">·</span>
                  <span>{shopStats.purchasableRemaining} disponíveis com Ouro</span>
                  <span aria-hidden="true">·</span>
                  <span>Avatares: {unlockedAvatarSet.size}/{CARD_AVATARS.length}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3.5 py-2 rounded-xl bg-stone-900 border border-amber-500/50 font-mono tabular-nums text-sm font-black text-amber-300 flex items-center gap-2 shadow-inner">
                <span>🪙</span>
                <span>{playerGold.toLocaleString('pt-BR')} Ouro</span>
              </div>

              <button
                onClick={onClose}
                className="p-2.5 rounded-xl bg-stone-900 hover:bg-rose-950/80 border border-stone-700 hover:border-rose-500/50 text-stone-300 hover:text-rose-200 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                title="Fechar Loja"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-5 sm:px-7 py-2.5 border-b border-stone-800/80 bg-stone-950/50 flex items-center gap-2 shrink-0 overflow-x-auto">
            <button
              onClick={() => {
                sound.playTick();
                setActiveTab('cards');
              }}
              className={`px-4 py-2 rounded-xl font-serif font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                activeTab === 'cards'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md'
                  : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              <ShoppingBag size={14} />
              <span>Cartas à Venda</span>
            </button>

            <button
              onClick={() => {
                sound.playTick();
                setActiveTab('packs');
              }}
              className={`px-4 py-2 rounded-xl font-serif font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                activeTab === 'packs'
                  ? 'bg-purple-500/20 border-purple-400 text-purple-200 shadow-md'
                  : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              <Package size={14} />
              <span>Pacotes</span>
              {pendingCommonPacks > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/25 border border-emerald-400/70 text-emerald-200 font-mono text-[10px] font-black">
                  {pendingCommonPacks} GRÁTIS
                </span>
              )}
            </button>

            <button
              onClick={() => {
                sound.playTick();
                setActiveTab('avatars');
              }}
              className={`px-4 py-2 rounded-xl font-serif font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                activeTab === 'avatars'
                  ? 'bg-fuchsia-500/20 border-fuchsia-400 text-fuchsia-200 shadow-md'
                  : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              <UserCircle2 size={14} />
              <span>Avatares ({PAID_AVATARS.length})</span>
            </button>

            <button
              onClick={() => {
                sound.playTick();
                setActiveTab('themes');
              }}
              className={`px-4 py-2 rounded-xl font-serif font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                activeTab === 'themes'
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-md'
                  : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              <Palette size={14} />
              <span>Temas</span>
            </button>

            {feedback && (
              <div
                className={`ml-auto px-3 py-1.5 rounded-xl text-xs font-bold border whitespace-nowrap ${
                  feedback.kind === 'success'
                    ? 'bg-emerald-950/90 border-emerald-400/60 text-emerald-200'
                    : 'bg-rose-950/90 border-rose-500/60 text-rose-200'
                }`}
              >
                {feedback.text}
              </div>
            )}
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-7">
            {/* TAB 1: CARTAS À VENDA */}
            {activeTab === 'cards' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-stone-900/70 border border-stone-800 space-y-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar carta por nome, classe ou efeito..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-950 border border-stone-700 focus:border-amber-400 text-xs text-stone-100 placeholder-stone-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-950 border border-stone-800">
                      {(
                        [
                          { id: 'available', label: 'À Venda' },
                          { id: 'all', label: 'Todas' },
                          { id: 'owned', label: 'Na Coleção' },
                          { id: 'exclusive', label: 'Eventos' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => {
                            sound.playTick();
                            setOwnershipFilter(opt.id);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                            ownershipFilter === opt.id
                              ? 'bg-amber-500 text-stone-950'
                              : 'text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-stone-400 font-semibold">Reino:</span>
                    {(['all', 'granty', 'musmo', 'naneya'] as const).map((k) => (
                      <button
                        key={k}
                        onClick={() => {
                          sound.playTick();
                          setKingdomFilter(k);
                        }}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer capitalize ${
                          kingdomFilter === k
                            ? 'bg-amber-500/25 border border-amber-400 text-amber-200'
                            : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {k === 'all' ? 'Todos' : k}
                      </button>
                    ))}

                    <span className="text-stone-600 mx-1">|</span>
                    <span className="text-stone-400 font-semibold">Tier:</span>
                    {(['all', 1, 2, 3, 4, 5] as const).map((t) => (
                      <button
                        key={String(t)}
                        onClick={() => {
                          sound.playTick();
                          setTierFilter(t);
                        }}
                        className={`px-2.5 py-1 rounded-lg font-mono font-bold transition-colors cursor-pointer ${
                          tierFilter === t
                            ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-200'
                            : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {t === 'all' ? 'Todos' : t === 5 ? 'T5–6' : `T${t}`}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-stone-400 font-semibold mr-1">Classe:</span>
                    {SHOP_ELEMENTS.map((el) => (
                      <button
                        key={el}
                        onClick={() => {
                          sound.playTick();
                          setElementFilter(el);
                        }}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                          elementFilter === el
                            ? 'bg-amber-400 text-stone-950'
                            : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {el === 'all' ? 'Todas' : el}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredCards.length === 0 ? (
                  <div className="py-16 text-center rounded-2xl bg-stone-900/40 border border-stone-800 text-stone-400 text-sm">
                    Nenhuma carta encontrada com os filtros selecionados.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredCards.map((card) => {
                      const unlocked = isCardUnlocked(card.id);
                      const exclusive = isEventExclusiveCard(card.id);
                      const cost = getCardUnlockCost(card.id);
                      const canAfford = playerGold >= cost;
                      const previewInst = createCardInstance(card);

                      return (
                        <div
                          key={card.id}
                          className="p-3 rounded-2xl bg-stone-900/75 border border-stone-800 hover:border-amber-500/45 transition-all flex flex-col items-center justify-between gap-2.5"
                        >
                          <div className="relative flex items-center justify-center">
                            <CardView
                              card={previewInst}
                              size="sm"
                              isPlayable={true}
                              onClick={() => setInspectedCard(card)}
                              onInspect={() => setInspectedCard(card)}
                            />
                          </div>

                          <div className="w-full text-center space-y-0.5">
                            <div className="text-xs font-serif font-bold text-amber-100 truncate">
                              {card.name}
                            </div>
                            <div className="text-[11px] text-stone-400">
                              Tier {card.tier} · {card.element}
                            </div>
                          </div>

                          <div className="w-full flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setInspectedCard(card)}
                              className="p-2 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
                              title="Inspecionar Carta"
                            >
                              <Info size={14} />
                            </button>

                            {unlocked ? (
                              <div className="flex-1 py-2 px-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1 whitespace-nowrap">
                                <Check size={13} />
                                <span>Na Coleção</span>
                              </div>
                            ) : exclusive ? (
                              <div
                                className="flex-1 py-2 px-2 rounded-xl bg-fuchsia-950/60 border border-fuchsia-500/40 text-fuchsia-200 text-[10px] font-bold flex items-center justify-center gap-1 whitespace-nowrap"
                                title="Disponível em Passes de Evento ou Premiação Admin"
                              >
                                <Lock size={12} />
                                <span>Evento / Admin</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={unlockingCardId === card.id || !canAfford}
                                onClick={() => handleBuyCard(card)}
                                className={`flex-1 py-2 px-2.5 rounded-xl font-mono tabular-nums font-black text-xs transition-all flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer ${
                                  canAfford
                                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-md'
                                    : 'bg-stone-900 border border-stone-700 text-stone-500 cursor-not-allowed'
                                }`}
                                title={
                                  canAfford
                                    ? `Comprar ${card.name} por ${cost} Ouro`
                                    : `Ouro insuficiente (precisa de ${cost} Ouro)`
                                }
                              >
                                {unlockingCardId === card.id ? (
                                  <span>Comprando...</span>
                                ) : (
                                  <>
                                    <span>Comprar</span>
                                    <span>{cost} 🪙</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PACOTES DE CARTAS POR RARIDADE & PACOTE DA SORTE */}
            {activeTab === 'packs' && (
              <div className="max-w-5xl mx-auto space-y-6">
                {/* Free Common Pack Banner (Earned every 10 levels) */}
                {pendingCommonPacks > 0 && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/85 via-stone-900 to-amber-950/75 border-2 border-emerald-400/75 shadow-[0_0_25px_rgba(16,185,129,0.2)] flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-300/70 flex items-center justify-center text-2xl shrink-0">
                        🎁
                      </div>
                      <div>
                        <h3 className="font-serif font-black text-sm sm:text-base text-emerald-200">
                          Recompensa de Nível Disponível: {pendingCommonPacks} Pacote(s) Comum(ns)
                        </h3>
                        <p className="text-xs text-stone-300">
                          Ganho a cada 10 níveis de conta! Contém 3 cartas aleatórias de Tier 1 sem custo de Ouro.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(openingPackKey)}
                      onClick={() => void handleOpenPack(PACK_DEFINITIONS[0], true)}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 hover:brightness-110 disabled:opacity-50 text-stone-950 font-serif font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg whitespace-nowrap"
                    >
                      {openingPackKey === 'common_free' ? 'Abrindo...' : 'Abrir Pacote Grátis'}
                    </button>
                  </div>
                )}

                {/* Duplicate Conversion Note */}
                <div className="p-3.5 rounded-2xl bg-stone-900/70 border border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-300">
                  <div className="flex items-center gap-2">
                    <Coins size={15} className="text-amber-400 shrink-0" />
                    <span>
                      Cartas repetidas obtidas em pacotes são convertidas automaticamente em reembolso de Ouro:
                    </span>
                  </div>
                  <div className="font-mono tabular-nums text-[11px] text-amber-300 font-bold">
                    T1: +{DUPLICATE_CARD_GOLD_REFUND[1]} · T2: +{DUPLICATE_CARD_GOLD_REFUND[2]} · T3: +{DUPLICATE_CARD_GOLD_REFUND[3]} · T4: +{DUPLICATE_CARD_GOLD_REFUND[4]} · T5: +{DUPLICATE_CARD_GOLD_REFUND[5]} 🪙
                  </div>
                </div>

                {/* 6 Packs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {PACK_DEFINITIONS.map((pack) => {
                    const isOpeningThis = openingPackKey === `${pack.id}_gold`;
                    const canAfford = playerGold >= pack.cost;
                    const isLucky = pack.id === 'lucky';

                    return (
                      <div
                        key={pack.id}
                        className={`rounded-3xl p-5 bg-gradient-to-b ${pack.accentGradient} border-2 ${pack.borderClass} flex flex-col justify-between gap-4 shadow-xl`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-black/45 border border-white/20 flex items-center justify-center text-3xl shadow-inner shrink-0">
                              {pack.icon}
                            </div>
                            <span className="px-2.5 py-1 rounded-lg bg-black/50 border border-white/15 text-[10px] font-mono font-black text-amber-200 uppercase">
                              {pack.badgeText}
                            </span>
                          </div>

                          <div>
                            <h3 className="text-lg font-serif font-black text-white">
                              {pack.name}
                            </h3>
                            <p className="text-xs font-bold text-amber-300 mt-0.5">
                              {pack.subtitle}
                            </p>
                            <p className="text-xs text-stone-300 mt-1.5 leading-relaxed">
                              {pack.description}
                            </p>
                          </div>

                          {isLucky && (
                            <div className="p-2.5 rounded-xl bg-black/45 border border-white/10 space-y-1 text-[11px] font-mono">
                              <div className="text-amber-300 font-bold text-[10px] uppercase">
                                Probabilidades por Carta
                              </div>
                              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-stone-200 tabular-nums">
                                {LUCKY_PACK_TIER_WEIGHTS.map((w) => (
                                  <div key={w.tier} className="flex justify-between">
                                    <span>TIER {w.tier}:</span>
                                    <span className="text-amber-200 font-bold">
                                      {String(w.weightPercent).replace('.', ',')}%
                                    </span>
                                  </div>
                                ))}
                                <div className="flex justify-between text-emerald-300 font-bold">
                                  <span>4ª Carta:</span>
                                  <span>10%</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={Boolean(openingPackKey) || !canAfford}
                          onClick={() => void handleOpenPack(pack, false)}
                          className={`w-full py-3 px-4 rounded-2xl font-serif font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer tabular-nums ${
                            canAfford
                              ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-stone-950 shadow-[0_0_20px_rgba(245,158,11,0.35)]'
                              : 'bg-stone-950/80 border border-stone-700 text-stone-500 cursor-not-allowed'
                          }`}
                        >
                          <Sparkles size={15} />
                          <span>
                            {isOpeningThis
                              ? 'Abrindo Pacote...'
                              : `Comprar Pacote · ${pack.cost} 🪙`}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: AVATARES (50 PAGOS NA LOJA + GESTÃO DOS MEUS AVATARES) */}
            {activeTab === 'avatars' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-stone-900/70 border border-stone-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                      <input
                        type="text"
                        value={avatarSearch}
                        onChange={(e) => setAvatarSearch(e.target.value)}
                        placeholder="Buscar avatar por nome, título ou reino..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-950 border border-stone-700 focus:border-fuchsia-400 text-xs text-stone-100 placeholder-stone-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-950 border border-stone-800">
                      {(
                        [
                          { id: 'store', label: 'Catálogo (50)' },
                          { id: 'available', label: 'Não Possuídos' },
                          { id: 'owned', label: `Meus (${unlockedAvatarSet.size})` },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => {
                            sound.playTick();
                            setAvatarFilter(opt.id);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                            avatarFilter === opt.id
                              ? 'bg-fuchsia-500 text-stone-950'
                              : 'text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-stone-400 font-semibold">Tier:</span>
                      {(['all', 1, 2, 3, 4, 5] as const).map((t) => (
                        <button
                          key={String(t)}
                          onClick={() => {
                            sound.playTick();
                            setAvatarTierFilter(t);
                          }}
                          className={`px-2.5 py-1 rounded-lg font-mono font-bold transition-colors cursor-pointer ${
                            avatarTierFilter === t
                              ? 'bg-fuchsia-500/25 border border-fuchsia-400 text-fuchsia-200'
                              : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          {t === 'all' ? 'Todos' : `Tier ${t}`}
                        </button>
                      ))}
                    </div>
                    <span className="text-[11px] text-stone-400">
                      10 avatares iniciais gratuitos + 50 avatares colecionáveis de cartas na loja
                    </span>
                  </div>
                </div>

                {filteredAvatars.length === 0 ? (
                  <div className="py-16 text-center rounded-2xl bg-stone-900/40 border border-stone-800 text-stone-400 text-sm">
                    Nenhum avatar encontrado com os filtros atuais.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                    {filteredAvatars.map((av) => {
                      const isOwned = unlockedAvatarSet.has(av.id);
                      const isEquipped = (playerState?.avatarId || 'av_g_hugo') === av.id;
                      const isBusy = busyAvatarId === av.id;
                      const canAfford = playerGold >= av.cost;

                      return (
                        <div
                          key={av.id}
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col items-center justify-between gap-3 ${
                            isEquipped
                              ? 'bg-fuchsia-950/35 border-fuchsia-400 shadow-[0_0_18px_rgba(217,70,239,0.22)]'
                              : 'bg-stone-900/75 border-stone-800 hover:border-amber-400/45'
                          }`}
                        >
                          <div className="flex flex-col items-center gap-2 text-center">
                            <AvatarPortrait
                              avatarId={av.id}
                              size="xl"
                              showFrameGem
                            />
                            <div className="space-y-0.5">
                              <div className="text-xs font-serif font-bold text-amber-100 leading-snug line-clamp-1">
                                {av.name}
                              </div>
                              <div className="text-[10px] text-stone-400 leading-none">
                                {av.title}
                              </div>
                              <div className="text-[10px] font-mono text-stone-500 pt-0.5">
                                Tier {av.tier} · {av.isFree ? 'Gratuito' : `${av.cost} Ouro`}
                              </div>
                            </div>
                          </div>

                          {isEquipped ? (
                            <div className="w-full py-2 px-2 rounded-xl bg-fuchsia-500/20 border border-fuchsia-400/70 text-fuchsia-200 text-[11px] font-bold flex items-center justify-center gap-1">
                              <Check size={13} />
                              <span>Equipado</span>
                            </div>
                          ) : isOwned ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleEquipAvatar(av)}
                              className="w-full py-2 px-2 rounded-xl bg-emerald-600/25 hover:bg-emerald-500 text-emerald-200 hover:text-stone-950 border border-emerald-400/60 text-[11px] font-bold transition-all cursor-pointer"
                            >
                              {isBusy ? 'Equipando...' : 'Equipar Avatar'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isBusy || !canAfford}
                              onClick={() => void handleBuyAvatar(av)}
                              className={`w-full py-2 px-2 rounded-xl font-mono tabular-nums font-black text-xs transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                canAfford
                                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-stone-950 shadow-md'
                                  : 'bg-stone-950 border border-stone-800 text-stone-500 cursor-not-allowed'
                              }`}
                            >
                              {isBusy ? (
                                <span>Comprando...</span>
                              ) : (
                                <>
                                  <span>Comprar</span>
                                  <span>{av.cost} 🪙</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: TEMAS (TAPETES & VERSOS) */}
            {activeTab === 'themes' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-serif font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                      <Palette size={16} className="text-amber-400" />
                      Tapete de Batalha (Arena)
                    </h3>
                    <span className="text-xs text-stone-400">
                      Ativo: {PLAYMAT_OPTIONS.find((p) => p.id === playmat)?.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PLAYMAT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          sound.playTick();
                          setPlaymat(opt.id);
                          showNotice(`Tapete "${opt.name}" equipado!`, 'success');
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          playmat === opt.id
                            ? `bg-stone-900 border-2 ${opt.accentColor} shadow-lg`
                            : 'bg-stone-900/50 border-stone-800 hover:border-stone-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-stone-100">{opt.name}</span>
                          {playmat === opt.id && (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-stone-950 font-bold text-[10px] flex items-center gap-1">
                              <Check size={11} /> Equipado
                            </span>
                          )}
                        </div>
                        <div className={`w-full h-3 rounded-full mb-2 ${opt.previewClass} border border-white/10`} />
                        <p className="text-xs text-stone-400">{opt.subtitle}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-stone-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-serif font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                      <Layers size={16} className="text-amber-400" />
                      Verso de Carta do Baralho
                    </h3>
                    <span className="text-xs text-stone-400">
                      Ativo: {CARD_BACK_OPTIONS.find((c) => c.id === cardBack)?.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {CARD_BACK_OPTIONS.map((cb) => (
                      <button
                        key={cb.id}
                        type="button"
                        onClick={() => {
                          sound.playTick();
                          setCardBack(cb.id);
                          showNotice(`Verso "${cb.name}" equipado!`, 'success');
                        }}
                        className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-2.5 cursor-pointer ${
                          cardBack === cb.id
                            ? 'bg-stone-900 border-2 border-amber-400 shadow-lg'
                            : 'bg-stone-900/50 border-stone-800 hover:border-stone-700'
                        }`}
                      >
                        <div
                          className={`w-12 h-16 rounded-xl bg-gradient-to-b ${cb.bgClass} border-2 ${cb.borderClass} flex items-center justify-center text-2xl shadow-inner`}
                        >
                          {cb.emblem}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-stone-100">{cb.name}</div>
                          <div className="text-[10px] text-amber-400 font-semibold mt-0.5">
                            {cardBack === cb.id ? 'Equipado' : 'Selecionar'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <PackChestOpeningModal
        isOpen={Boolean(activePackChest)}
        packId={activePackChest?.packId || 'common'}
        packName={activePackChest?.packName || ''}
        packSubtitle={activePackChest?.packSubtitle}
        usedFreePack={activePackChest?.usedFreePack}
        result={activePackChest?.result || null}
        onClose={() => setActivePackChest(null)}
        onInspectCard={(tpl) => setInspectedCard(tpl)}
      />

      {inspectedInstance && (
        <CardModal
          card={inspectedInstance}
          onClose={() => setInspectedCard(null)}
        />
      )}
    </>
  );
};
