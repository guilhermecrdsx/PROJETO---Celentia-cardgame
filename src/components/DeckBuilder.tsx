import React, { useState, useMemo, useEffect } from 'react';
import { CARD_TEMPLATES } from '../data/cards';
import { CardTemplate, KingdomType, TierType, ElementType } from '../types/game';
import { createCardInstance, DECK_PRESETS, DEFAULT_DECK_IDS } from '../logic/deckFactory';
import { CardView } from './CardView';
import { CardModal } from './CardModal';
import { FormattedCardDescription } from './FormattedCardDescription';
import { ELEMENT_CONFIG, TIER_CONFIG } from '../utils/cardVisuals';
import { sound } from '../services/soundEffects';
import {
  ArrowLeft,
  Check,
  Plus,
  Minus,
  Trash2,
  Layers,
  Search,
  Info,
  RotateCcw,
  X,
  Save,
  Lock,
  Sparkles,
  Gem,
} from 'lucide-react';
import {
  getCustomDeckSlots,
  saveCustomDeckSlot,
  resetCustomDeckSlot,
  getActiveSlotId,
  CustomDeckSlot,
} from '../utils/customDeckSlots';
import {
  useCloudPlayerState,
  isCardUnlocked,
  isEventExclusiveCard,
  getCardUnlockCost,
  getCollectibleCards,
} from '../services/accountApi';

interface DeckBuilderProps {
  initialCardIds?: string[];
  initialSlotId?: number;
  onSaveDeck: (deckCardIds: string[], deckName: string) => void;
  onBack: () => void;
}

const ELEMENT_FILTER_OPTIONS: Array<{
  id: 'all' | ElementType;
  label: string;
  icon?: string;
  activeClass: string;
}> = [
  { id: 'all', label: 'Todas', activeClass: 'bg-amber-500 text-stone-950' },
  { id: 'Fogo', label: 'Fogo', icon: '🔥', activeClass: 'bg-orange-600 text-white' },
  { id: 'Água', label: 'Água', icon: '💧', activeClass: 'bg-sky-600 text-white' },
  { id: 'Gelo', label: 'Gelo', icon: '❄️', activeClass: 'bg-cyan-700 text-white' },
  { id: 'Telúrico', label: 'Telúrico', icon: '🌿', activeClass: 'bg-emerald-600 text-white' },
  { id: 'Elétrico', label: 'Elétrico', icon: '⚡', activeClass: 'bg-amber-500 text-stone-950' },
  { id: 'Mágico', label: 'Mágico', icon: '✨', activeClass: 'bg-purple-600 text-white' },
  { id: 'Cósmico', label: 'Cósmico', icon: '🧬', activeClass: 'bg-indigo-600 text-white' },
  { id: 'Divino', label: 'Divino', icon: '⚜️', activeClass: 'bg-amber-300 text-stone-950' },
  { id: 'Sombrio', label: 'Sombrio', icon: '🌑', activeClass: 'bg-fuchsia-700 text-white' },
  { id: 'Neutro', label: 'Neutro', icon: '🧭', activeClass: 'bg-stone-600 text-white' },
];

export const DeckBuilder: React.FC<DeckBuilderProps> = ({
  initialCardIds,
  initialSlotId,
  onSaveDeck,
  onBack,
}) => {
  const { playerState } = useCloudPlayerState();
  const [slots, setSlots] = useState<CustomDeckSlot[]>(() => getCustomDeckSlots());
  const [activeSlotId, setActiveSlotState] = useState<number>(() => {
    if (initialSlotId && initialSlotId >= 1 && initialSlotId <= 3) return initialSlotId;
    const active = getActiveSlotId();
    return active >= 1 && active <= 3 ? active : 1;
  });

  const activeSlot = slots.find((s) => s.slotId === activeSlotId) || slots[0];
  const [deckName, setDeckName] = useState<string>(activeSlot?.name || `Espaço Vazio ${activeSlotId}`);
  const [saveFeedback, setSaveFeedback] = useState<{ text: string; tone: 'success' | 'warn' } | null>(null);

  const [selectedCardIds, setSelectedCardIds] = useState<string[]>(() => {
    if (activeSlot && Array.isArray(activeSlot.cardIds) && activeSlot.cardIds.length === 20) {
      return [...activeSlot.cardIds];
    }
    return [];
  });

  // Reset slots immediately if the authenticated account changes (zero cross-account bleed)
  useEffect(() => {
    const accountSlots = getCustomDeckSlots();
    setSlots(accountSlots);
    const targetId =
      initialSlotId && initialSlotId >= 1 && initialSlotId <= 3
        ? initialSlotId
        : activeSlotId >= 1 && activeSlotId <= 3
        ? activeSlotId
        : 1;
    const slot = accountSlots.find((s) => s.slotId === targetId) || accountSlots[0];
    setActiveSlotState(slot.slotId);
    setDeckName(slot.name);
    setSelectedCardIds(slot.cardIds.length === 20 ? [...slot.cardIds] : []);
  }, [playerState?.uid]);

  // Filters
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'owned'>('all');
  const [kingdomFilter, setKingdomFilter] = useState<'all' | KingdomType>('all');
  const [tierFilter, setTierFilter] = useState<'all' | TierType>('all');
  const [elementFilter, setElementFilter] = useState<'all' | ElementType>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'unit' | 'skill'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Inspected Card
  const [inspectedTemplate, setInspectedTemplate] = useState<CardTemplate | null>(null);
  const [expandedCardTemplate, setExpandedCardTemplate] = useState<CardTemplate | null>(null);

  const showNotice = (text: string, tone: 'success' | 'warn' = 'success', ms = 2600) => {
    setSaveFeedback({ text, tone });
    window.setTimeout(() => {
      setSaveFeedback((curr) => (curr?.text === text ? null : curr));
    }, ms);
  };

  // Available collectible cards
  const collectibleCards = useMemo(() => getCollectibleCards(), []);

  const ownedCollectibleCount = useMemo(
    () => collectibleCards.filter((c) => isCardUnlocked(c.id)).length,
    [collectibleCards, playerState?.unlockedCardIds]
  );

  const filteredCards = useMemo(() => {
    const list = collectibleCards.filter((card) => {
      if (ownershipFilter === 'owned' && !isCardUnlocked(card.id)) return false;
      if (kingdomFilter !== 'all' && card.kingdom !== kingdomFilter) return false;
      if (tierFilter !== 'all') {
        if (tierFilter === 5) {
          if (card.tier !== 5 && card.tier !== 6) return false;
        } else if (card.tier !== tierFilter) {
          return false;
        }
      }
      if (elementFilter !== 'all') {
        if (elementFilter === 'Telúrico' || elementFilter === 'Terra') {
          if (card.element !== 'Telúrico' && card.element !== 'Terra') return false;
        } else if (card.element !== elementFilter) {
          return false;
        }
      }
      if (typeFilter !== 'all' && card.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = card.name.toLowerCase().includes(q);
        const matchEffect = card.effectDescription?.toLowerCase().includes(q) || false;
        if (!matchName && !matchEffect) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      if (kingdomFilter !== 'all' && a.kingdom !== b.kingdom) {
        return a.kingdom.localeCompare(b.kingdom);
      }
      return a.name.localeCompare(b.name);
    });
  }, [
    collectibleCards,
    ownershipFilter,
    kingdomFilter,
    tierFilter,
    elementFilter,
    typeFilter,
    searchQuery,
    playerState?.unlockedCardIds,
  ]);

  const cardCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const id of selectedCardIds) {
      counts[id] = (counts[id] || 0) + 1;
    }
    return counts;
  }, [selectedCardIds]);

  const deckStats = useMemo(() => {
    const templates = selectedCardIds
      .map((id) => CARD_TEMPLATES.find((t) => t.id === id))
      .filter((t): t is CardTemplate => Boolean(t));

    const tierCount: Record<TierType, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    let units = 0;
    let spells = 0;

    for (const t of templates) {
      tierCount[t.tier] += 1;
      if (t.type === 'unit') units += 1;
      else spells += 1;
    }

    return { tierCount, units, spells };
  }, [selectedCardIds]);

  const handleAddCard = (templateId: string) => {
    if (!isCardUnlocked(templateId)) {
      sound.playTick();
      showNotice(
        isEventExclusiveCard(templateId)
          ? 'Carta indisponível: exclusiva de Passe de Evento ou Admin.'
          : 'Carta indisponível: adquira na Loja do menu inicial.',
        'warn',
        3200
      );
      return;
    }
    if (selectedCardIds.length >= 20) {
      sound.playTick();
      return;
    }
    const currentCount = cardCounts[templateId] || 0;
    const maxCopies = templateId === 'pack_atormentador' ? 1 : 2;
    if (currentCount >= maxCopies) {
      sound.playTick();
      return;
    }

    sound.playDraw();
    setSelectedCardIds((prev) => [...prev, templateId]);
  };

  const handleRemoveCard = (templateId: string) => {
    const idx = selectedCardIds.lastIndexOf(templateId);
    if (idx !== -1) {
      sound.playDraw();
      setSelectedCardIds((prev) => {
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      });
    }
  };

  const handleLoadPreset = (presetCardIds: string[], presetName?: string) => {
    sound.playSummon();
    setSelectedCardIds(presetCardIds);
    if (presetName) {
      setDeckName(`Espaço ${activeSlotId}: ${presetName}`);
    }
  };

  const handleClearDeck = () => {
    sound.playDraw();
    setSelectedCardIds([]);
  };

  const handleSwitchSlot = (newSlotId: number) => {
    if (newSlotId === activeSlotId) return;

    if (selectedCardIds.length === 20) {
      saveCustomDeckSlot(activeSlotId, deckName, selectedCardIds, false);
    }

    setActiveSlotState(newSlotId);
    const updatedSlots = getCustomDeckSlots();
    setSlots(updatedSlots);

    const nextSlot = updatedSlots.find((s) => s.slotId === newSlotId) || updatedSlots[0];
    setDeckName(nextSlot.name);
    setSelectedCardIds(nextSlot.cardIds.length === 20 ? [...nextSlot.cardIds] : []);
    sound.playDraw();
  };

  const handleSaveSlot = () => {
    if (selectedCardIds.length !== 20) {
      sound.playTick();
      showNotice(`Adicione exatamente 20 cartas para salvar (${selectedCardIds.length}/20).`, 'warn');
      return;
    }
    const cleanName =
      deckName.trim() && !deckName.trim().startsWith('Espaço Vazio')
        ? deckName.trim()
        : `Baralho Personalizado ${activeSlotId}`;
    const updated = saveCustomDeckSlot(activeSlotId, cleanName, selectedCardIds, true);
    setDeckName(cleanName);
    setSlots(updated);
    onSaveDeck(selectedCardIds, cleanName);
    sound.playSpell();
    showNotice(`Espaço ${activeSlotId} salvo na conta e ativado!`);
  };

  const handleResetSlot = () => {
    sound.playTick();
    const wasActive = playerState?.activeSlotId === activeSlotId;
    const updated = resetCustomDeckSlot(activeSlotId);
    setSlots(updated);
    const restored = updated.find((s) => s.slotId === activeSlotId) || updated[0];
    setDeckName(restored.name);
    setSelectedCardIds([]);
    if (wasActive) {
      onSaveDeck(
        DEFAULT_DECK_IDS,
        DECK_PRESETS[0]?.name || 'Tríade Elemental: Fogo, Raiz & Trovão'
      );
    }
    showNotice(`Espaço ${activeSlotId} esvaziado.`, 'success', 2000);
  };

  const isDeckComplete = selectedCardIds.length === 20;
  const hasActiveFilters =
    ownershipFilter !== 'all' ||
    kingdomFilter !== 'all' ||
    tierFilter !== 'all' ||
    elementFilter !== 'all' ||
    typeFilter !== 'all' ||
    searchQuery.trim().length > 0;

  return (
    <div className="relative w-screen h-dvh overflow-hidden bg-[#050814] flex flex-col text-stone-200 select-none">
      {/* Subtle Cosmic Sanctuary Backdrop */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#111936] via-[#070b18] to-[#03050c]" />
        <div className="absolute -top-24 left-1/3 w-[680px] h-[340px] bg-amber-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[620px] h-[320px] bg-indigo-500/10 rounded-full blur-[140px]" />
      </div>

      {/* ============================================================== */}
      {/* TOP BAR: BRANDING + STATUS + ONLY "SALVAR" AND "VOLTAR"        */}
      {/* ============================================================== */}
      <header className="relative z-20 shrink-0 px-4 sm:px-6 py-3 border-b border-amber-500/25 bg-slate-950/90 backdrop-blur-md shadow-[0_6px_28px_rgba(0,0,0,0.7)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-950 via-slate-900 to-stone-950 border border-amber-400/60 flex items-center justify-center shadow-[0_0_16px_rgba(245,158,11,0.28)] shrink-0">
            <Layers size={19} className="text-amber-300" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-serif font-black tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-yellow-500 truncate">
              Forja de Baralhos
            </h1>
            <p className="text-[11px] text-stone-400 truncate">
              Monte exatamente 20 cartas (máximo 2 cópias por carta · 1 cópia para mini-pacote)
            </p>
          </div>
        </div>

        {/* Status Indicators & Primary Top Actions (ONLY Salvar & Voltar) */}
        <div className="flex items-center gap-2.5 ml-auto">
          {/* Save Feedback Toast */}
          {saveFeedback && (
            <div
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold animate-in fade-in duration-150 ${
                saveFeedback.tone === 'success'
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                  : 'bg-amber-950/80 border-amber-500/50 text-amber-200'
              }`}
            >
              {saveFeedback.tone === 'success' ? <Check size={14} /> : <Lock size={13} />}
              <span>{saveFeedback.text}</span>
            </div>
          )}

          {/* Crystals & Gold Counters */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-950/90 border border-cyan-500/35 font-mono tabular-nums text-xs text-cyan-300 font-bold">
            <Gem size={13} className="text-cyan-400" />
            <span>{playerState?.crystals ?? 0}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-950/90 border border-amber-500/35 font-mono tabular-nums text-xs text-amber-300 font-bold">
            <span>🪙</span>
            <span>{playerState?.gold ?? 0}</span>
          </div>

          {/* 20-Card Completion Gauge */}
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border font-mono tabular-nums text-xs ${
              isDeckComplete
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : 'bg-stone-950/90 border-stone-700 text-amber-300'
            }`}
          >
            <span className="text-stone-400 font-sans text-[11px]">Cartas:</span>
            <span className="font-black text-sm">{selectedCardIds.length}/20</span>
          </div>

          {/* ONLY Action Button 1: SALVAR */}
          <button
            type="button"
            onClick={handleSaveSlot}
            disabled={!isDeckComplete}
            className={`min-h-[42px] px-4 sm:px-5 rounded-xl font-serif font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 border ${
              isDeckComplete
                ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 border-amber-200 text-stone-950 shadow-[0_0_22px_rgba(245,158,11,0.35)] cursor-pointer active:scale-95'
                : 'bg-stone-900 text-stone-500 border-stone-800 cursor-not-allowed'
            }`}
            title={
              isDeckComplete
                ? 'Salvar este baralho no espaço ativo'
                : 'Complete 20 cartas para habilitar o salvamento'
            }
          >
            <Save size={15} />
            <span>Salvar</span>
          </button>

          {/* ONLY Action Button 2: VOLTAR */}
          <button
            type="button"
            onClick={() => {
              sound.playDraw();
              onBack();
            }}
            className="min-h-[42px] px-4 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-amber-400/60 text-stone-200 hover:text-white font-serif font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Voltar à tela anterior"
          >
            <ArrowLeft size={15} />
            <span>Voltar</span>
          </button>
        </div>
      </header>

      {/* Mobile Feedback Banner */}
      {saveFeedback && (
        <div
          className={`md:hidden relative z-20 px-4 py-1.5 text-center text-xs font-semibold border-b ${
            saveFeedback.tone === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
              : 'bg-amber-950/90 border-amber-500/40 text-amber-200'
          }`}
        >
          {saveFeedback.text}
        </div>
      )}

      {/* ============================================================== */}
      {/* MAIN SPLIT WORKSPACE                                           */}
      {/* ============================================================== */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden p-3 sm:p-4 gap-3 sm:gap-4">
        {/* LEFT COLUMN: ACTIVE DECK RELIQUARY & CURVE */}
        <aside className="w-full lg:w-[340px] xl:w-[360px] shrink-0 max-h-[38vh] lg:max-h-none flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-slate-950/85 p-3.5 sm:p-4 shadow-[0_12px_36px_rgba(0,0,0,0.65)] overflow-hidden">
          {/* 3 Custom Slots Selector */}
          <div className="space-y-2 border-b border-stone-800 pb-3">
            <div className="flex items-center justify-between text-[10px] font-serif font-bold uppercase tracking-widest text-amber-300/90">
              <span>Espaços de Baralho</span>
              <span className="font-mono text-stone-400">3 Slots</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-stone-950 border border-stone-800">
              {[1, 2, 3].map((slotId) => (
                <button
                  key={slotId}
                  type="button"
                  onClick={() => handleSwitchSlot(slotId)}
                  className={`py-1.5 rounded-lg text-xs font-serif font-bold transition-all cursor-pointer ${
                    activeSlotId === slotId
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-950 shadow'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                  }`}
                >
                  Espaço {slotId}
                </button>
              ))}
            </div>

            {/* Deck Name & Utility Tools */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <input
                type="text"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder="Nome do Baralho..."
                maxLength={32}
                className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 focus:border-amber-400 text-xs text-amber-100 font-semibold placeholder-stone-500 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={handleResetSlot}
                title="Restaurar padrão inicial deste Espaço"
                className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-amber-200 border border-stone-700 transition-colors cursor-pointer"
              >
                <RotateCcw size={14} />
              </button>
              <button
                type="button"
                onClick={handleClearDeck}
                title="Limpar todas as cartas do baralho"
                className="p-2 rounded-xl bg-stone-900 hover:bg-rose-950/70 text-stone-400 hover:text-rose-300 border border-stone-700 hover:border-rose-500/50 transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Preset Importer */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-serif font-bold uppercase tracking-widest text-stone-400">
              <span>Sinergias Prontas</span>
              <span className="text-amber-400/90 font-mono">{DECK_PRESETS.length} Modelos</span>
            </div>
            <div className="flex flex-col gap-1 max-h-28 overflow-y-auto pr-1">
              {DECK_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleLoadPreset(preset.cardIds, preset.name)}
                  className="px-2.5 py-1.5 rounded-lg bg-stone-900/90 hover:bg-stone-800 text-[11px] text-stone-300 hover:text-amber-200 border border-stone-800 hover:border-amber-500/40 transition-colors text-left flex items-center justify-between gap-2 shrink-0 cursor-pointer"
                  title={preset.description}
                >
                  <span className="font-semibold truncate">{preset.name}</span>
                  <span className="text-[10px] text-stone-500 shrink-0 font-mono">20</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tier Curve Breakdown */}
          <div className="p-2.5 rounded-xl bg-stone-950/90 border border-stone-800 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-serif font-bold uppercase tracking-wider text-stone-400">
              <span>Curva de Tiers</span>
              <span className="font-mono text-stone-300">
                {deckStats.units} Unid · {deckStats.spells} Hab
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1 text-center font-mono tabular-nums font-bold text-xs">
              {[
                { t: 1 as TierType, cls: 'bg-slate-900 border-slate-700 text-slate-300' },
                { t: 2 as TierType, cls: 'bg-sky-950/70 border-sky-700/70 text-sky-300' },
                { t: 3 as TierType, cls: 'bg-amber-950/70 border-amber-700/70 text-amber-300' },
                { t: 4 as TierType, cls: 'bg-purple-950/70 border-purple-700/70 text-purple-300' },
                { t: 5 as TierType, cls: 'bg-amber-500/15 border-amber-400/60 text-amber-200' },
                { t: 6 as TierType, cls: 'bg-fuchsia-500/15 border-fuchsia-400/60 text-fuchsia-200' },
              ].map((item) => (
                <div key={item.t} className={`py-1 rounded-lg border ${item.cls}`}>
                  <span className="text-[9px] block opacity-70 leading-none mb-0.5">T{item.t}</span>
                  <span>{deckStats.tierCount[item.t]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Cards List */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
            {selectedCardIds.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-6 px-3 rounded-xl border border-dashed border-stone-800 bg-stone-950/50 text-xs text-stone-500">
                <Sparkles size={20} className="text-stone-600 mb-2" />
                <p>Seu baralho está vazio.</p>
                <p className="text-[11px] mt-1">
                  Adicione cartas pelo acervo ao lado ou importe uma sinergia pronta.
                </p>
              </div>
            ) : (
              Array.from(new Set(selectedCardIds)).map((id) => {
                const template = CARD_TEMPLATES.find((t) => t.id === id);
                if (!template) return null;
                const count = cardCounts[id] || 0;
                const tier = TIER_CONFIG[template.tier];
                const element = ELEMENT_CONFIG[template.element];
                const maxCopies = id === 'pack_atormentador' ? 1 : 2;

                return (
                  <div
                    key={id}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-stone-900/80 border border-stone-800 hover:border-amber-500/40 text-xs transition-colors"
                  >
                    <button
                      type="button"
                      className="flex items-center gap-2 cursor-pointer flex-1 min-w-0 text-left"
                      onClick={() => setInspectedTemplate(template)}
                    >
                      <span className="text-xs shrink-0">{element.icon}</span>
                      <span
                        className="font-mono font-bold text-[10px] shrink-0"
                        style={{ color: tier.color }}
                      >
                        T{template.tier}
                      </span>
                      <span className="font-medium text-stone-100 truncate" title={template.name}>
                        {template.name}
                      </span>
                    </button>

                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRemoveCard(id)}
                        className="w-6 h-6 rounded-md bg-stone-800 hover:bg-rose-900/70 text-stone-300 hover:text-rose-200 flex items-center justify-center transition-colors cursor-pointer"
                        title="Remover 1 cópia"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-5 text-center font-mono tabular-nums font-bold text-amber-300 text-xs">
                        {count}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddCard(id)}
                        disabled={count >= maxCopies || selectedCardIds.length >= 20}
                        className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                          count < maxCopies && selectedCardIds.length < 20
                            ? 'bg-stone-800 hover:bg-emerald-900/70 text-stone-200 hover:text-emerald-200 cursor-pointer'
                            : 'bg-stone-950 text-stone-700 cursor-not-allowed'
                        }`}
                        title={`Adicionar mais 1 cópia (máx ${maxCopies})`}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN: ROYAL CARD CATALOG & FILTERS */}
        <section className="flex-1 min-w-0 flex flex-col rounded-2xl border border-amber-500/20 bg-slate-950/75 p-3.5 sm:p-4 shadow-[0_12px_36px_rgba(0,0,0,0.65)] overflow-hidden">
          {/* Modernized Filter Console */}
          <div className="shrink-0 flex flex-col gap-2.5 border-b border-stone-800 pb-3 mb-3">
            {/* Search & Count */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar carta por nome ou efeito..."
                  className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-700 focus:border-amber-400 rounded-xl text-xs text-stone-100 placeholder-stone-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-stone-400 font-mono tabular-nums">
                  {filteredCards.length} / {collectibleCards.length} cartas
                </span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setOwnershipFilter('all');
                      setKingdomFilter('all');
                      setTierFilter('all');
                      setElementFilter('all');
                      setTypeFilter('all');
                      setSearchQuery('');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-amber-200 text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    <RotateCcw size={12} /> Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Segmented Filter Groups */}
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              {/* Ownership Filter: All vs Owned Only */}
              <div className="flex items-center gap-0.5 bg-stone-950 p-1 rounded-xl border border-stone-800">
                <button
                  type="button"
                  onClick={() => {
                    sound.playTick();
                    setOwnershipFilter('all');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    ownershipFilter === 'all'
                      ? 'bg-stone-200 text-stone-950'
                      : 'text-stone-400 hover:text-stone-100'
                  }`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playTick();
                    setOwnershipFilter('owned');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1 tabular-nums ${
                    ownershipFilter === 'owned'
                      ? 'bg-emerald-500 text-stone-950'
                      : 'text-emerald-300/85 hover:text-emerald-200'
                  }`}
                  title="Mostrar apenas as cartas que você possui desbloqueadas"
                >
                  <Check size={12} />
                  <span>Minhas ({ownedCollectibleCount})</span>
                </button>
              </div>

              {/* Kingdom */}
              <div className="flex items-center gap-0.5 bg-stone-950 p-1 rounded-xl border border-stone-800">
                {(
                  [
                    { id: 'all', label: 'Reinos', active: 'bg-amber-500 text-stone-950' },
                    { id: 'granty', label: '🦁 Granty', active: 'bg-amber-500 text-stone-950' },
                    { id: 'musmo', label: '⚡ Musmo', active: 'bg-purple-500 text-stone-950' },
                    { id: 'naneya', label: '🐉 Naneya', active: 'bg-emerald-500 text-stone-950' },
                  ] as const
                ).map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setKingdomFilter(k.id)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                      kingdomFilter === k.id ? k.active : 'text-stone-400 hover:text-stone-100'
                    }`}
                  >
                    {k.label}
                  </button>
                ))}
              </div>

              {/* Tier */}
              <div className="flex items-center gap-0.5 bg-stone-950 p-1 rounded-xl border border-stone-800 font-mono">
                {(
                  [
                    { id: 'all', label: 'Tiers' },
                    { id: 1, label: 'T1' },
                    { id: 2, label: 'T2' },
                    { id: 3, label: 'T3' },
                    { id: 4, label: 'T4' },
                    { id: 5, label: 'T5★' },
                  ] as const
                ).map((t) => (
                  <button
                    key={String(t.id)}
                    type="button"
                    onClick={() => setTierFilter(t.id)}
                    className={`px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                      tierFilter === t.id
                        ? 'bg-amber-500 text-stone-950'
                        : 'text-stone-400 hover:text-stone-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Type */}
              <div className="flex items-center gap-0.5 bg-stone-950 p-1 rounded-xl border border-stone-800">
                {(
                  [
                    { id: 'all', label: 'Tipos' },
                    { id: 'unit', label: '🛡️ Unidades' },
                    { id: 'skill', label: '📜 Habilidades' },
                  ] as const
                ).map((tp) => (
                  <button
                    key={tp.id}
                    type="button"
                    onClick={() => setTypeFilter(tp.id)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                      typeFilter === tp.id
                        ? 'bg-amber-500 text-stone-950'
                        : 'text-stone-400 hover:text-stone-100'
                    }`}
                  >
                    {tp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Element Class Strip */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
              {ELEMENT_FILTER_OPTIONS.map((el) => {
                const isActive =
                  elementFilter === el.id ||
                  (el.id === 'Telúrico' && elementFilter === 'Terra');
                return (
                  <button
                    key={el.id}
                    type="button"
                    onClick={() => setElementFilter(el.id)}
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors flex items-center gap-1 cursor-pointer ${
                      isActive
                        ? `${el.activeClass} border-transparent shadow`
                        : 'bg-stone-950/90 border-stone-800 text-stone-400 hover:text-stone-100 hover:border-stone-600'
                    }`}
                  >
                    {el.icon && <span>{el.icon}</span>}
                    <span>{el.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cards Catalog Grid */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {filteredCards.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-16 text-stone-500 text-xs">
                Nenhuma carta encontrada para os filtros aplicados.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredCards.map((template) => {
                  const count = cardCounts[template.id] || 0;
                  const isPack = template.id === 'pack_atormentador' || Boolean(template.isPack);
                  const maxAllowed = isPack ? 1 : 2;
                  const unlocked = isCardUnlocked(template.id);
                  const isEventOnly = isEventExclusiveCard(template.id);
                  const unlockCost = getCardUnlockCost(template.id);
                  const canAdd = unlocked && count < maxAllowed && selectedCardIds.length < 20;
                  const cardInstance = createCardInstance(template);

                  return (
                    <div
                      key={template.id}
                      className={`flex flex-col items-center p-2.5 rounded-xl bg-stone-950/85 border transition-all relative group ${
                        unlocked
                          ? count > 0
                            ? 'border-amber-400/60 shadow-[0_0_16px_rgba(245,158,11,0.12)]'
                            : 'border-stone-800 hover:border-amber-500/40'
                          : isEventOnly
                          ? 'border-fuchsia-500/35 opacity-90'
                          : 'border-stone-800/90 opacity-90'
                      }`}
                    >
                      {!unlocked && (
                        <div
                          className={`absolute top-3 left-3 z-20 px-2 py-0.5 rounded-md bg-stone-950/95 border text-[10px] font-mono font-bold shadow ${
                            isEventOnly
                              ? 'border-fuchsia-400/60 text-fuchsia-300'
                              : 'border-amber-400/50 text-amber-300'
                          }`}
                        >
                          {isEventOnly ? '🎟️ Evento' : `🔒 ${unlockCost} 🪙`}
                        </div>
                      )}

                      <CardView
                        card={cardInstance}
                        size="sm"
                        isPlayable={unlocked}
                        onClick={isPack ? () => setInspectedTemplate(template) : undefined}
                        onInspect={() => setInspectedTemplate(template)}
                      />

                      <div className="mt-2.5 w-full flex items-center justify-between gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setInspectedTemplate(template)}
                          className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-400 hover:text-amber-200 transition-colors cursor-pointer"
                          title="Ver detalhes completos da carta"
                        >
                          <Info size={13} />
                        </button>

                        {!unlocked ? (
                          <div
                            className={`flex-1 py-1 px-2 rounded-lg border font-mono font-bold text-[10px] text-center select-none ${
                              isEventOnly
                                ? 'bg-fuchsia-950/45 text-fuchsia-300 border-fuchsia-500/35'
                                : 'bg-stone-900 text-stone-400 border-stone-700'
                            }`}
                            title={
                              isEventOnly
                                ? 'Indisponível — exclusiva de Passe de Evento ou Admin'
                                : `Indisponível — adquira na Loja do menu inicial por ${unlockCost} Ouro`
                            }
                          >
                            {isEventOnly ? '🔒 Evento' : '🔒 Loja'}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleRemoveCard(template.id)}
                              disabled={count === 0}
                              className={`w-6 h-6 rounded-md font-bold flex items-center justify-center transition-colors ${
                                count > 0
                                  ? 'bg-rose-950/80 hover:bg-rose-800 text-rose-200 cursor-pointer'
                                  : 'bg-stone-900 text-stone-700 cursor-not-allowed'
                              }`}
                              title="Remover 1 cópia do baralho"
                            >
                              <Minus size={12} />
                            </button>

                            <span
                              className={`font-mono tabular-nums text-xs font-bold px-1.5 py-0.5 rounded-md min-w-[34px] text-center ${
                                count > 0
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'text-stone-500'
                              }`}
                            >
                              {count}/{maxAllowed}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleAddCard(template.id)}
                              disabled={!canAdd}
                              className={`w-6 h-6 rounded-md font-bold flex items-center justify-center transition-colors ${
                                canAdd
                                  ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer'
                                  : 'bg-stone-900 text-stone-700 cursor-not-allowed'
                              }`}
                              title={
                                count >= maxAllowed
                                  ? isPack
                                    ? 'Limite de 1 cópia atingido para o mini-pacote'
                                    : 'Limite de 2 cópias atingido'
                                  : selectedCardIds.length >= 20
                                  ? 'Baralho já possui 20 cartas'
                                  : 'Adicionar ao baralho'
                              }
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Card Detail Modal / Pack Preview Modal */}
      {inspectedTemplate && inspectedTemplate.id === 'pack_atormentador' ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setInspectedTemplate(null)}
        >
          <div
            className="relative my-auto w-full max-w-4xl max-h-[94dvh] overflow-y-auto rounded-3xl border-2 border-purple-500/80 bg-gradient-to-b from-[#1c1228] via-[#120b1c] to-[#08040f] p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] text-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-purple-500/30 pb-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📦</span>
                  <h3 className="text-lg sm:text-xl font-serif font-black text-white tracking-wide">
                    Pacote Atormentador (Tor, Men, Tador)
                  </h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    Mini-Pacote 3 em 1 (1 Slot)
                  </span>
                </div>
                <p className="text-xs text-stone-300 mt-1 max-w-2xl leading-relaxed">
                  Este mini-pacote ocupa <strong className="text-amber-400">apenas 1 espaço (1/20)</strong> na montagem do baralho. Ao entrar na partida, se desdobra em 3 cartas separadas no seu baralho. Se as três peças estiverem simultaneamente em campo, fundem-se em <strong className="text-fuchsia-400">O Atormentador</strong>!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedTemplate(null)}
                className="p-1.5 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-2">
              {['m_tor', 'm_men', 'm_tador', 'm_atormentador'].map((cardId) => {
                const t = CARD_TEMPLATES.find((tpl) => tpl.id === cardId);
                if (!t) return null;
                const inst = createCardInstance(t);
                const isFusion = cardId === 'm_atormentador';
                return (
                  <div
                    key={cardId}
                    onClick={() => setExpandedCardTemplate(t)}
                    className="flex flex-col items-center p-2 rounded-2xl bg-stone-900/60 hover:bg-stone-800 border border-stone-800 hover:border-purple-400/60 transition-all hover:scale-105 cursor-pointer group/packcard shadow-lg"
                    title="Clique para expandir e ver detalhes completos desta carta"
                  >
                    <div className="text-[11px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      {isFusion ? (
                        <span className="text-fuchsia-400 font-black">⚡ Fusão Especial</span>
                      ) : (
                        <span className="text-purple-300">Peça Elemental</span>
                      )}
                    </div>
                    <CardView card={inst} size="sm" isPlayable={false} />
                    <div className="mt-2 w-full p-2 rounded-xl bg-black/50 border border-stone-800/80">
                      <FormattedCardDescription text={t.effectDescription} variant="compact" />
                    </div>
                    <div className="mt-2 text-center text-[10px] text-stone-400 group-hover/packcard:text-amber-300 flex items-center justify-center gap-1 font-semibold transition-colors">
                      <Info size={11} />
                      <span>Expandir Carta</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-stone-800 flex items-center justify-between">
              <div className="text-xs text-stone-400">
                No seu baralho atual:{' '}
                <span className="text-amber-400 font-bold font-mono">
                  {cardCounts['pack_atormentador'] || 0}/1
                </span>
              </div>
              <div className="flex items-center gap-2">
                {(cardCounts['pack_atormentador'] || 0) > 0 ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveCard('pack_atormentador')}
                    className="px-4 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Remover do Baralho
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAddCard('pack_atormentador')}
                    disabled={selectedCardIds.length >= 20}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Adicionar Pacote (+1 Slot)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setInspectedTemplate(null)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : inspectedTemplate ? (
        <CardModal
          card={createCardInstance(inspectedTemplate)}
          onClose={() => setInspectedTemplate(null)}
        />
      ) : null}

      {expandedCardTemplate && (
        <CardModal
          card={createCardInstance(expandedCardTemplate)}
          onClose={() => setExpandedCardTemplate(null)}
        />
      )}
    </div>
  );
};
