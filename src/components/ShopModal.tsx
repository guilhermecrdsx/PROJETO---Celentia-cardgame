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
  Gem,
} from 'lucide-react';
import { CARD_TEMPLATES } from '../data/cards';
import { CardTemplate, ElementType, KingdomType, TierType } from '../types/game';
import { createCardInstance } from '../logic/deckFactory';
import { CardView } from './CardView';
import { CardModal } from './CardModal';
import { AvatarPortrait } from './AvatarPortrait';
import { ArenaPlaymatBackdrop } from './ArenaPlaymatBackdrop';
import { CardBackArt } from './CardBackArt';
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
  DUPLICATE_CARD_CRYSTAL_REFUND,
  LUCKY_PACK_TIER_WEIGHTS,
  PACK_DEFINITIONS,
  type PackDefinition,
  type PackType,
} from '../data/packs';
import {
  FREE_PLAYMAT_IDS,
  FREE_CARD_BACK_IDS,
  getPlaymatPrice,
  getCardBackPrice,
  PLAYMAT_CRYSTAL_COST,
  PLAYMAT_GOLD_COST,
  CARD_BACK_CRYSTAL_COST,
  CARD_BACK_GOLD_COST,
  type CurrencyType,
  type PlaymatId,
  type CardBackId,
} from '../data/economy';
import {
  useCloudPlayerState,
  isCardUnlocked,
  isEventExclusiveCard,
  getCardUnlockCost,
  getCardCrystalCost,
  unlockCardWithGoldInCloud,
  openPackInCloud,
  unlockAvatarInCloud,
  unlockPlaymatInCloud,
  unlockCardBackInCloud,
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

  // Avatars & Themes state
  const [avatarFilter, setAvatarFilter] = useState<AvatarFilter>('store');
  const [avatarTierFilter, setAvatarTierFilter] = useState<'all' | 1 | 2 | 3 | 4 | 5>('all');
  const [avatarSearch, setAvatarSearch] = useState('');
  const [busyAvatarId, setBusyAvatarId] = useState<string | null>(null);
  const [busyPlaymatId, setBusyPlaymatId] = useState<string | null>(null);
  const [busyCardBackId, setBusyCardBackId] = useState<string | null>(null);

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

  const unlockedPlaymatSet = useMemo(() => {
    const set = new Set<PlaymatId>(FREE_PLAYMAT_IDS);
    for (const id of playerState?.unlockedPlaymats || []) {
      set.add(id);
    }
    return set;
  }, [playerState?.unlockedPlaymats]);

  const unlockedCardBackSet = useMemo(() => {
    const set = new Set<CardBackId>(FREE_CARD_BACK_IDS);
    for (const id of playerState?.unlockedCardBacks || []) {
      set.add(id);
    }
    return set;
  }, [playerState?.unlockedCardBacks]);

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

  const playerGold = playerState?.gold ?? 0;
  const playerCrystals = playerState?.crystals ?? 0;
  const pendingCommonPacks = playerState?.pendingCommonPacks ?? 0;
  const activePlaymat = playerState?.equippedPlaymat || playmat;
  const activeCardBack = playerState?.equippedCardBack || cardBack;

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

  const handleBuyCard = async (card: CardTemplate, currency: CurrencyType) => {
    try {
      setUnlockingCardId(`${card.id}_${currency}`);
      const res = await unlockCardWithGoldInCloud(card.id, currency);
      sound.playSpell();
      const unitLabel = res.currency === 'crystals' ? 'Cristais' : 'Ouro';
      showNotice(`${card.name} adicionada à sua coleção (-${res.costPaid} ${unitLabel})!`, 'success');
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
                totalRefundCrystals: res.totalRefundCrystals,
                usedFreePack: res.usedFreePack,
              },
            }
          : null
      );

      const newCount = resolvedDrops.filter((d) => !d.isDuplicate).length;
      const dupCount = resolvedDrops.length - newCount;
      const refundMsg =
        res.totalRefundCrystals > 0 ? ` (+${res.totalRefundCrystals} Cristais de repetidas)` : '';
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

  const handleBuyAvatar = async (av: CardAvatarEntry, currency: CurrencyType) => {
    try {
      setBusyAvatarId(`${av.id}_${currency}`);
      const res = await unlockAvatarInCloud(av.id, currency, true);
      sound.playSpell();
      const unitLabel = res.currency === 'crystals' ? 'Cristais' : 'Ouro';
      showNotice(
        `Avatar "${av.name}" desbloqueado e equipado (-${res.costPaid} ${unitLabel})!`,
        'success'
      );
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

  const handleBuyPlaymat = async (playmatId: PlaymatId, name: string, currency: CurrencyType) => {
    try {
      setBusyPlaymatId(`${playmatId}_${currency}`);
      const res = await unlockPlaymatInCloud(playmatId, currency, true);
      setPlaymat(playmatId);
      sound.playSpell();
      const unitLabel = res.currency === 'crystals' ? 'Cristais' : 'Ouro';
      showNotice(`Tapete "${name}" adquirido e equipado (-${res.costPaid} ${unitLabel})!`, 'success');
    } catch (err: any) {
      sound.playTick();
      showNotice(err?.message || 'Não foi possível comprar este tapete.', 'error');
    } finally {
      setBusyPlaymatId(null);
    }
  };

  const handleEquipPlaymat = async (playmatId: PlaymatId, name: string) => {
    try {
      setBusyPlaymatId(playmatId);
      await syncProfileToCloud({ equippedPlaymat: playmatId });
      setPlaymat(playmatId);
      sound.playTick();
      showNotice(`Tapete "${name}" equipado!`, 'success');
    } catch (err: any) {
      sound.playTick();
      showNotice(err?.message || 'Não foi possível equipar este tapete.', 'error');
    } finally {
      setBusyPlaymatId(null);
    }
  };

  const handleBuyCardBack = async (cardBackId: CardBackId, name: string, currency: CurrencyType) => {
    try {
      setBusyCardBackId(`${cardBackId}_${currency}`);
      const res = await unlockCardBackInCloud(cardBackId, currency, true);
      setCardBack(cardBackId);
      sound.playSpell();
      const unitLabel = res.currency === 'crystals' ? 'Cristais' : 'Ouro';
      showNotice(`Verso "${name}" adquirido e equipado (-${res.costPaid} ${unitLabel})!`, 'success');
    } catch (err: any) {
      sound.playTick();
      showNotice(err?.message || 'Não foi possível comprar este verso de carta.', 'error');
    } finally {
      setBusyCardBackId(null);
    }
  };

  const handleEquipCardBack = async (cardBackId: CardBackId, name: string) => {
    try {
      setBusyCardBackId(cardBackId);
      await syncProfileToCloud({ equippedCardBack: cardBackId });
      setCardBack(cardBackId);
      sound.playTick();
      showNotice(`Verso "${name}" equipado!`, 'success');
    } catch (err: any) {
      sound.playTick();
      showNotice(err?.message || 'Não foi possível equipar este verso de carta.', 'error');
    } finally {
      setBusyCardBackId(null);
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
                  <span>{shopStats.purchasableRemaining} cartas à venda</span>
                  <span aria-hidden="true">·</span>
                  <span>Avatares: {unlockedAvatarSet.size}/{CARD_AVATARS.length}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <div
                className="px-3.5 py-2 rounded-xl bg-stone-900 border border-cyan-500/50 font-mono tabular-nums text-sm font-black text-cyan-300 flex items-center gap-2 shadow-inner"
                title="Cristais conquistados em partidas e cartas repetidas"
              >
                <Gem size={15} className="text-cyan-400 shrink-0" />
                <span>{playerCrystals.toLocaleString('pt-BR')} Cristais</span>
              </div>

              <div
                className="px-3.5 py-2 rounded-xl bg-stone-900 border border-amber-500/50 font-mono tabular-nums text-sm font-black text-amber-300 flex items-center gap-2 shadow-inner"
                title="Ouro premium para pacotes, cartas T4+ e cosméticos"
              >
                <Coins size={15} className="text-amber-400 shrink-0" />
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

                  <div className="pt-1 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-400">
                    <span className="flex items-center gap-1.5">
                      <Gem size={12} className="text-cyan-400 shrink-0" />
                      <span>
                        Cartas <strong className="text-cyan-300">Tier 1 a 3</strong> aceitam Cristais (250 / 500 / 700) ou Ouro.
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Coins size={12} className="text-amber-400 shrink-0" />
                      <span>
                        Cartas <strong className="text-amber-300">Tier 4+</strong> são exclusivas de Ouro.
                      </span>
                    </span>
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
                      const goldCost = getCardUnlockCost(card.id);
                      const crystalCost = getCardCrystalCost(card.id);
                      const canAffordGold = playerGold >= goldCost;
                      const canAffordCrystals = crystalCost !== null && playerCrystals >= crystalCost;
                      const isBuyingThis =
                        unlockingCardId === `${card.id}_gold` ||
                        unlockingCardId === `${card.id}_crystals`;
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

                          <div className="w-full space-y-1.5">
                            {unlocked ? (
                              <div className="w-full flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setInspectedCard(card)}
                                  className="p-2 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
                                  title="Inspecionar Carta"
                                >
                                  <Info size={14} />
                                </button>
                                <div className="flex-1 py-2 px-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1 whitespace-nowrap">
                                  <Check size={13} />
                                  <span>Na Coleção</span>
                                </div>
                              </div>
                            ) : exclusive ? (
                              <div className="w-full flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setInspectedCard(card)}
                                  className="p-2 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
                                  title="Inspecionar Carta"
                                >
                                  <Info size={14} />
                                </button>
                                <div
                                  className="flex-1 py-2 px-2 rounded-xl bg-fuchsia-950/60 border border-fuchsia-500/40 text-fuchsia-200 text-[10px] font-bold flex items-center justify-center gap-1 whitespace-nowrap"
                                  title="Disponível em Passes de Evento ou Premiação Admin"
                                >
                                  <Lock size={12} />
                                  <span>Evento / Admin</span>
                                </div>
                              </div>
                            ) : crystalCost !== null ? (
                              <div className="w-full flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setInspectedCard(card)}
                                  className="p-2 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer shrink-0"
                                  title="Inspecionar Carta"
                                >
                                  <Info size={13} />
                                </button>
                                <button
                                  type="button"
                                  disabled={isBuyingThis || !canAffordCrystals}
                                  onClick={() => void handleBuyCard(card, 'crystals')}
                                  className={`flex-1 py-2 px-1.5 rounded-xl font-mono tabular-nums font-black text-[11px] transition-all flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer ${
                                    canAffordCrystals
                                      ? 'bg-gradient-to-r from-cyan-500 to-sky-500 hover:brightness-110 text-stone-950 shadow-md'
                                      : 'bg-stone-900 border border-stone-700 text-stone-500 cursor-not-allowed'
                                  }`}
                                  title={
                                    canAffordCrystals
                                      ? `Comprar ${card.name} por ${crystalCost} Cristais`
                                      : `Cristais insuficientes (precisa de ${crystalCost} Cristais)`
                                  }
                                >
                                  <Gem size={11} className="shrink-0" />
                                  <span>{unlockingCardId === `${card.id}_crystals` ? '...' : crystalCost}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isBuyingThis || !canAffordGold}
                                  onClick={() => void handleBuyCard(card, 'gold')}
                                  className={`flex-1 py-2 px-1.5 rounded-xl font-mono tabular-nums font-black text-[11px] transition-all flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer ${
                                    canAffordGold
                                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-stone-950 shadow-md'
                                      : 'bg-stone-900 border border-stone-700 text-stone-500 cursor-not-allowed'
                                  }`}
                                  title={
                                    canAffordGold
                                      ? `Comprar ${card.name} por ${goldCost} Ouro`
                                      : `Ouro insuficiente (precisa de ${goldCost} Ouro)`
                                  }
                                >
                                  <Coins size={11} className="shrink-0" />
                                  <span>{unlockingCardId === `${card.id}_gold` ? '...' : goldCost}</span>
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="w-full flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setInspectedCard(card)}
                                    className="p-2 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer shrink-0"
                                    title="Inspecionar Carta"
                                  >
                                    <Info size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isBuyingThis || !canAffordGold}
                                    onClick={() => void handleBuyCard(card, 'gold')}
                                    className={`flex-1 py-2 px-2.5 rounded-xl font-mono tabular-nums font-black text-xs transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                                      canAffordGold
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-stone-950 shadow-md'
                                        : 'bg-stone-900 border border-stone-700 text-stone-500 cursor-not-allowed'
                                    }`}
                                    title={
                                      canAffordGold
                                        ? `Comprar ${card.name} por ${goldCost} Ouro`
                                        : `Ouro insuficiente (precisa de ${goldCost} Ouro)`
                                    }
                                  >
                                    {unlockingCardId === `${card.id}_gold` ? (
                                      <span>Comprando...</span>
                                    ) : (
                                      <>
                                        <Coins size={12} className="shrink-0" />
                                        <span>{goldCost} Ouro</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <div className="text-[10px] font-mono text-amber-400/75 text-center">
                                  Exclusiva de Ouro (T4+)
                                </div>
                              </>
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
                    <Gem size={15} className="text-cyan-400 shrink-0" />
                    <span>
                      Cartas repetidas obtidas em pacotes são convertidas automaticamente em <strong className="text-cyan-300">Cristais</strong>:
                    </span>
                  </div>
                  <div className="font-mono tabular-nums text-[11px] text-cyan-300 font-bold">
                    T1: +{DUPLICATE_CARD_CRYSTAL_REFUND[1]} · T2: +{DUPLICATE_CARD_CRYSTAL_REFUND[2]} · T3: +{DUPLICATE_CARD_CRYSTAL_REFUND[3]} · T4: +{DUPLICATE_CARD_CRYSTAL_REFUND[4]} · T5: +{DUPLICATE_CARD_CRYSTAL_REFUND[5]} Cristais
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
                          { id: 'store', label: `Catálogo (${PAID_AVATARS.length})` },
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
                      1 avatar padrão inicial + {PAID_AVATARS.length} avatares compráveis com Cristais ou Ouro
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
                      const isBusy =
                        busyAvatarId === av.id ||
                        busyAvatarId === `${av.id}_crystals` ||
                        busyAvatarId === `${av.id}_gold`;
                      const canAffordCrystals = playerCrystals >= av.crystalCost;
                      const canAffordGold = playerGold >= av.cost;

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
                              <div className="text-[10px] font-mono text-stone-500 pt-0.5 tabular-nums">
                                Tier {av.tier} · {av.isFree ? 'Padrão' : `${av.crystalCost} Cristais / ${av.cost} Ouro`}
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
                            <div className="w-full grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                disabled={isBusy || !canAffordCrystals}
                                onClick={() => void handleBuyAvatar(av, 'crystals')}
                                className={`py-2 px-1.5 rounded-xl font-mono tabular-nums font-black text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                  canAffordCrystals
                                    ? 'bg-gradient-to-r from-cyan-500 to-sky-500 hover:brightness-110 text-stone-950 shadow-md'
                                    : 'bg-stone-950 border border-stone-800 text-stone-500 cursor-not-allowed'
                                }`}
                                title={
                                  canAffordCrystals
                                    ? `Comprar por ${av.crystalCost} Cristais`
                                    : `Precisa de ${av.crystalCost} Cristais`
                                }
                              >
                                <Gem size={11} className="shrink-0" />
                                <span>{busyAvatarId === `${av.id}_crystals` ? '...' : av.crystalCost}</span>
                              </button>
                              <button
                                type="button"
                                disabled={isBusy || !canAffordGold}
                                onClick={() => void handleBuyAvatar(av, 'gold')}
                                className={`py-2 px-1.5 rounded-xl font-mono tabular-nums font-black text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                  canAffordGold
                                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-stone-950 shadow-md'
                                    : 'bg-stone-950 border border-stone-800 text-stone-500 cursor-not-allowed'
                                }`}
                                title={
                                  canAffordGold
                                    ? `Comprar por ${av.cost} Ouro`
                                    : `Precisa de ${av.cost} Ouro`
                                }
                              >
                                <Coins size={11} className="shrink-0" />
                                <span>{busyAvatarId === `${av.id}_gold` ? '...' : av.cost}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: TEMAS (TAPETES & VERSOS PAGOS) */}
            {activeTab === 'themes' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="p-3.5 rounded-2xl bg-stone-900/70 border border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-300">
                  <span>
                    Personalize a arena com tapetes e versos exclusivos adquiridos com <strong className="text-cyan-300">Cristais</strong> ou <strong className="text-amber-300">Ouro</strong>.
                  </span>
                  <span className="font-mono text-[11px] text-stone-400 tabular-nums">
                    Tapetes: {PLAYMAT_CRYSTAL_COST} 💎 / {PLAYMAT_GOLD_COST} 🪙 · Versos: {CARD_BACK_CRYSTAL_COST} 💎 / {CARD_BACK_GOLD_COST} 🪙
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-serif font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                      <Palette size={16} className="text-amber-400" />
                      Tapete de Batalha (Arena)
                    </h3>
                    <span className="text-xs text-stone-400">
                      Ativo: {PLAYMAT_OPTIONS.find((p) => p.id === activePlaymat)?.name} · Possuídos: {unlockedPlaymatSet.size}/{PLAYMAT_OPTIONS.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {PLAYMAT_OPTIONS.map((opt) => {
                      const isOwned = unlockedPlaymatSet.has(opt.id);
                      const isEquipped = activePlaymat === opt.id;
                      const price = getPlaymatPrice(opt.id);
                      const isBusy =
                        busyPlaymatId === opt.id ||
                        busyPlaymatId === `${opt.id}_crystals` ||
                        busyPlaymatId === `${opt.id}_gold`;
                      const canAffordCrystals = playerCrystals >= price.crystalCost;
                      const canAffordGold = playerGold >= price.goldCost;

                      return (
                        <div
                          key={opt.id}
                          className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                            isEquipped
                              ? `bg-stone-900 border-2 ${opt.accentColor} shadow-lg`
                              : isOwned
                              ? 'bg-stone-900/65 border-stone-700 hover:border-stone-500'
                              : 'bg-stone-900/45 border-stone-800'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-sm font-bold text-stone-100">{opt.name}</span>
                              {isEquipped ? (
                                <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-stone-950 font-bold text-[10px] flex items-center gap-1 shrink-0">
                                  <Check size={11} /> Equipado
                                </span>
                              ) : isOwned ? (
                                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-bold text-[10px] shrink-0">
                                  {price.isDefaultFree ? 'Padrão' : 'Desbloqueado'}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-lg bg-stone-950 border border-stone-700 text-stone-400 font-mono font-bold text-[10px] flex items-center gap-1 shrink-0">
                                  <Lock size={10} /> Bloqueado
                                </span>
                              )}
                            </div>
                            {/* Live Playmat Preview */}
                            <div className="relative w-full h-24 rounded-xl overflow-hidden mb-2.5 border border-white/15 shadow-inner">
                              <ArenaPlaymatBackdrop
                                playmat={opt.id}
                                animated={opt.isAnimated}
                                variant="preview"
                              />
                              <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between gap-1 z-10">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-sm border ${
                                    opt.isAnimated
                                      ? 'bg-black/65 border-amber-400/40 text-amber-200'
                                      : 'bg-black/65 border-stone-600/60 text-stone-300'
                                  }`}
                                >
                                  {opt.isAnimated ? `✨ ${opt.animationLabel}` : opt.animationLabel}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-stone-400">{opt.subtitle}</p>
                          </div>

                          {isEquipped ? (
                            <div className="w-full py-2 px-3 rounded-xl bg-amber-500/15 border border-amber-400/50 text-amber-200 text-xs font-bold text-center">
                              Em uso na arena
                            </div>
                          ) : isOwned ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleEquipPlaymat(opt.id, opt.name)}
                              className="w-full py-2 px-3 rounded-xl bg-emerald-600/25 hover:bg-emerald-500 text-emerald-200 hover:text-stone-950 border border-emerald-400/60 text-xs font-bold transition-all cursor-pointer"
                            >
                              {isBusy ? 'Equipando...' : 'Equipar Tapete'}
                            </button>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                disabled={isBusy || !canAffordCrystals}
                                onClick={() => void handleBuyPlaymat(opt.id, opt.name, 'crystals')}
                                className={`py-2 px-2.5 rounded-xl font-mono tabular-nums font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                  canAffordCrystals
                                    ? 'bg-gradient-to-r from-cyan-500 to-sky-500 hover:brightness-110 text-stone-950 shadow-md'
                                    : 'bg-stone-950 border border-stone-800 text-stone-500 cursor-not-allowed'
                                }`}
                              >
                                <Gem size={12} className="shrink-0" />
                                <span>
                                  {busyPlaymatId === `${opt.id}_crystals`
                                    ? 'Comprando...'
                                    : `${price.crystalCost} Cristais`}
                                </span>
                              </button>
                              <button
                                type="button"
                                disabled={isBusy || !canAffordGold}
                                onClick={() => void handleBuyPlaymat(opt.id, opt.name, 'gold')}
                                className={`py-2 px-2.5 rounded-xl font-mono tabular-nums font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                  canAffordGold
                                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-stone-950 shadow-md'
                                    : 'bg-stone-950 border border-stone-800 text-stone-500 cursor-not-allowed'
                                }`}
                              >
                                <Coins size={12} className="shrink-0" />
                                <span>
                                  {busyPlaymatId === `${opt.id}_gold`
                                    ? 'Comprando...'
                                    : `${price.goldCost} Ouro`}
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-stone-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-serif font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                      <Layers size={16} className="text-amber-400" />
                      Verso de Carta do Baralho
                    </h3>
                    <span className="text-xs text-stone-400">
                      Ativo: {CARD_BACK_OPTIONS.find((c) => c.id === activeCardBack)?.name} · Possuídos: {unlockedCardBackSet.size}/{CARD_BACK_OPTIONS.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                    {CARD_BACK_OPTIONS.map((cb) => {
                      const isOwned = unlockedCardBackSet.has(cb.id);
                      const isEquipped = activeCardBack === cb.id;
                      const price = getCardBackPrice(cb.id);
                      const isBusy =
                        busyCardBackId === cb.id ||
                        busyCardBackId === `${cb.id}_crystals` ||
                        busyCardBackId === `${cb.id}_gold`;
                      const canAffordCrystals = playerCrystals >= price.crystalCost;
                      const canAffordGold = playerGold >= price.goldCost;

                      return (
                        <div
                          key={cb.id}
                          className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-between gap-3 ${
                            isEquipped
                              ? 'bg-stone-900 border-2 border-amber-400 shadow-lg'
                              : isOwned
                              ? 'bg-stone-900/65 border-stone-700'
                              : 'bg-stone-900/45 border-stone-800'
                          }`}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <div className="relative">
                              <CardBackArt
                                theme={cb.id}
                                context="preview"
                                animated={cb.isAnimated}
                                compact
                                className="w-16 h-24 rounded-xl shadow-lg"
                              />
                              {!isOwned && (
                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-stone-950 border border-stone-600 flex items-center justify-center text-stone-300 z-20">
                                  <Lock size={10} />
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-stone-100">{cb.name}</div>
                              <div className="text-[9px] text-amber-300/85 leading-tight mt-0.5">
                                {cb.isAnimated ? `✨ ${cb.animationLabel}` : 'Estático (Padrão)'}
                              </div>
                              <div className="text-[10px] font-mono text-stone-400 mt-1 tabular-nums">
                                {price.isDefaultFree
                                  ? 'Gratuito'
                                  : isOwned
                                  ? 'Desbloqueado'
                                  : `${price.crystalCost} Cristais / ${price.goldCost} Ouro`}
                              </div>
                            </div>
                          </div>

                          {isEquipped ? (
                            <div className="w-full py-1.5 px-2 rounded-xl bg-amber-400/20 border border-amber-400/70 text-amber-200 text-[11px] font-bold flex items-center justify-center gap-1">
                              <Check size={12} />
                              <span>Equipado</span>
                            </div>
                          ) : isOwned ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleEquipCardBack(cb.id, cb.name)}
                              className="w-full py-1.5 px-2 rounded-xl bg-emerald-600/25 hover:bg-emerald-500 text-emerald-200 hover:text-stone-950 border border-emerald-400/60 text-[11px] font-bold transition-all cursor-pointer"
                            >
                              {isBusy ? 'Equipando...' : 'Equipar'}
                            </button>
                          ) : (
                            <div className="w-full grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                disabled={isBusy || !canAffordCrystals}
                                onClick={() => void handleBuyCardBack(cb.id, cb.name, 'crystals')}
                                className={`py-1.5 px-1.5 rounded-xl font-mono tabular-nums font-black text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                  canAffordCrystals
                                    ? 'bg-gradient-to-r from-cyan-500 to-sky-500 hover:brightness-110 text-stone-950 shadow-md'
                                    : 'bg-stone-950 border border-stone-800 text-stone-500 cursor-not-allowed'
                                }`}
                                title={`Comprar por ${price.crystalCost} Cristais`}
                              >
                                <Gem size={10} className="shrink-0" />
                                <span>{busyCardBackId === `${cb.id}_crystals` ? '...' : price.crystalCost}</span>
                              </button>
                              <button
                                type="button"
                                disabled={isBusy || !canAffordGold}
                                onClick={() => void handleBuyCardBack(cb.id, cb.name, 'gold')}
                                className={`py-1.5 px-1.5 rounded-xl font-mono tabular-nums font-black text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                  canAffordGold
                                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-stone-950 shadow-md'
                                    : 'bg-stone-950 border border-stone-800 text-stone-500 cursor-not-allowed'
                                }`}
                                title={`Comprar por ${price.goldCost} Ouro`}
                              >
                                <Coins size={10} className="shrink-0" />
                                <span>{busyCardBackId === `${cb.id}_gold` ? '...' : price.goldCost}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
