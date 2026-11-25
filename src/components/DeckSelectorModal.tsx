import React, { useState } from 'react';
import { CARD_TEMPLATES } from '../data/cards';
import { DECK_PRESETS } from '../logic/deckFactory';
import {
  getCustomDeckSlots,
  resetCustomDeckSlot,
  CustomDeckSlot,
  setActiveSlotId,
  getActiveSlotId,
} from '../utils/customDeckSlots';
import { Layers, Check, Edit3, X, Sparkles, Swords, RotateCcw, Flame, Wand2, Compass, Skull, Crown, Snowflake } from 'lucide-react';
import { sound } from '../services/soundEffects';

interface DeckSelectorModalProps {
  isOpen: boolean;
  activeDeckCardIds: string[];
  onSelectDeck: (cardIds: string[], deckName: string) => void;
  onOpenDeckBuilder: (slotId?: number) => void;
  onClose: () => void;
  hideBuilderActions?: boolean;
}

export const DeckSelectorModal: React.FC<DeckSelectorModalProps> = ({
  isOpen,
  activeDeckCardIds,
  onSelectDeck,
  onOpenDeckBuilder,
  onClose,
  hideBuilderActions = false,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [customSlots, setCustomSlots] = useState<CustomDeckSlot[]>(() => getCustomDeckSlots());

  if (!isOpen) return null;

  const isCurrentActive = (cardIds: string[]) => {
    if (cardIds.length !== activeDeckCardIds.length) return false;
    const sortedA = [...cardIds].sort();
    const sortedB = [...activeDeckCardIds].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
  };

  const handleResetSlot = (slotId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playTick();
    const updated = resetCustomDeckSlot(slotId);
    setCustomSlots(updated);
  };

  const getPresetIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Flame size={18} className="text-amber-400" />;
      case 1:
        return <Wand2 size={18} className="text-cyan-400" />;
      case 2:
        return <Compass size={18} className="text-emerald-400" />;
      case 3:
        return <Skull size={18} className="text-fuchsia-400" />;
      case 4:
        return <Crown size={18} className="text-yellow-300" />;
      case 5:
        return <Sparkles size={18} className="text-pink-400" />;
      case 6:
        return <Snowflake size={18} className="text-sky-300" />;
      default:
        return <Sparkles size={18} className="text-amber-400" />;
    }
  };

  const getPresetBadgeColor = (index: number) => {
    switch (index) {
      case 0:
        return 'border-orange-500/40 bg-orange-950/40 text-orange-300';
      case 1:
        return 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300';
      case 2:
        return 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300';
      case 3:
        return 'border-fuchsia-500/40 bg-fuchsia-950/40 text-fuchsia-300';
      case 4:
        return 'border-yellow-500/40 bg-yellow-950/40 text-yellow-200';
      case 5:
        return 'border-pink-500/40 bg-pink-950/40 text-pink-300';
      case 6:
        return 'border-sky-500/40 bg-sky-950/40 text-sky-300';
      default:
        return 'border-amber-500/40 bg-amber-950/40 text-amber-300';
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[94dvh] flex flex-col rounded-2xl border border-amber-500/40 bg-stone-950 shadow-2xl text-stone-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-stone-800 bg-stone-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Layers size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-amber-200">
                Seleção de Baralho para a Batalha
              </h2>
              <p className="text-xs text-stone-400">
                {DECK_PRESETS.length} Baralhos Padrões de Alta Sinergia + 3 Espaços Personalizados Salvos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-stone-800 bg-stone-900/30 px-5 pt-3 gap-2">
          <button
            onClick={() => {
              sound.playDraw();
              setActiveTab('presets');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t border-x ${
              activeTab === 'presets'
                ? 'bg-stone-950 border-amber-500/50 text-amber-300 border-b-transparent shadow-sm'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <Swords size={15} /> Baralhos Padrões ({DECK_PRESETS.length})
          </button>

          <button
            onClick={() => {
              sound.playDraw();
              setActiveTab('custom');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t border-x ${
              activeTab === 'custom'
                ? 'bg-stone-950 border-amber-500/50 text-amber-300 border-b-transparent shadow-sm'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <Edit3 size={15} /> Meus Espaços Salvos (3)
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200/90 leading-relaxed flex items-center gap-2.5">
                <Sparkles size={16} className="text-amber-400 shrink-0" />
                <span>
                  Baralhos pré-construídos combinando unidades, habilidades e passivas de classe com curvas balanceadas de Tier 1 ao Tier 6.
                </span>
              </div>

              {DECK_PRESETS.map((preset, idx) => {
                const isSelected = isCurrentActive(preset.cardIds);
                const templates = preset.cardIds
                  .map((id) => CARD_TEMPLATES.find((t) => t.id === id))
                  .filter(Boolean);
                const unitsCount = templates.filter((t) => t?.type === 'unit').length;
                const spellsCount = templates.filter((t) => t?.type === 'skill').length;

                return (
                  <div
                    key={`preset_${idx}`}
                    onClick={() => {
                      sound.playDraw();
                      onSelectDeck(preset.cardIds, preset.name);
                    }}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isSelected
                        ? 'border-amber-400 bg-amber-950/30 shadow-lg shadow-amber-500/15'
                        : 'border-stone-800 bg-stone-900/60 hover:border-amber-500/40 hover:bg-stone-900'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="p-1 rounded bg-stone-800 border border-stone-700">
                          {getPresetIcon(idx)}
                        </div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                          {preset.name}
                        </h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getPresetBadgeColor(idx)}`}>
                          {preset.subtitle}
                        </span>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-black uppercase tracking-wider">
                            Baralho Ativo
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-stone-300 mt-2 leading-relaxed">
                        {preset.description}
                      </p>

                      <div className="flex items-center gap-3 mt-2 text-[11px] text-stone-400 font-mono">
                        <span className="text-amber-300 font-semibold">20 Cartas</span>
                        <span>·</span>
                        <span>{unitsCount} Unidades</span>
                        <span>·</span>
                        <span>{spellsCount} Feitiços</span>
                        <span>·</span>
                        <span className="text-stone-500">Sinergia Avançada</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
                      {isSelected ? (
                        <div className="w-9 h-9 rounded-full bg-amber-500 text-black flex items-center justify-center font-bold shadow-md">
                          <Check size={20} />
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            sound.playDraw();
                            onSelectDeck(preset.cardIds, preset.name);
                          }}
                          className="px-4 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/40 text-xs font-bold transition-all shadow-sm"
                        >
                          Selecionar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/30 text-xs text-blue-200/90 leading-relaxed flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Edit3 size={16} className="text-cyan-400 shrink-0" />
                  <span>
                    Você possui <strong>3 espaços permanentes salvos</strong> para montar qualquer combinação de 20 cartas livremente.
                  </span>
                </div>
              </div>

              {customSlots.map((slot) => {
                const isSelected = isCurrentActive(slot.cardIds);
                const templates = slot.cardIds
                  .map((id) => CARD_TEMPLATES.find((t) => t.id === id))
                  .filter(Boolean);
                const unitsCount = templates.filter((t) => t?.type === 'unit').length;
                const spellsCount = templates.filter((t) => t?.type === 'skill').length;

                return (
                  <div
                    key={`slot_${slot.slotId}`}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isSelected
                        ? 'border-amber-400 bg-amber-950/30 shadow-lg shadow-amber-500/15'
                        : 'border-stone-800 bg-stone-900/60 hover:border-amber-500/40'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Espaço {slot.slotId}
                        </span>
                        <h3 className="text-sm font-bold text-white">
                          {slot.name}
                        </h3>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-black uppercase tracking-wider">
                            Baralho Ativo
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-2 text-[11px] text-stone-400 font-mono">
                        <span className="text-amber-300 font-semibold">{slot.cardIds.length} / 20 Cartas</span>
                        <span>·</span>
                        <span>{unitsCount} Unidades</span>
                        <span>·</span>
                        <span>{spellsCount} Feitiços</span>
                        <span>·</span>
                        <span className="text-stone-500">Salvo no Navegador</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={(e) => handleResetSlot(slot.slotId, e)}
                        title="Restaurar padrão deste espaço"
                        className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition-colors border border-stone-700"
                      >
                        <RotateCcw size={15} />
                      </button>

                      {!hideBuilderActions && (
                        <button
                          onClick={() => {
                            setActiveSlotId(slot.slotId);
                            onClose();
                            onOpenDeckBuilder(slot.slotId);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
                        >
                          <Edit3 size={14} /> Editar
                        </button>
                      )}

                      {isSelected ? (
                        <div className="w-8 h-8 rounded-full bg-amber-500 text-black flex items-center justify-center font-bold shadow-md">
                          <Check size={18} />
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            sound.playDraw();
                            setActiveSlotId(slot.slotId);
                            onSelectDeck(slot.cardIds, slot.name);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/40 text-xs font-bold transition-all"
                        >
                          Selecionar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-900/50 flex items-center justify-between gap-2">
          {!hideBuilderActions ? (
            <button
              onClick={() => {
                onClose();
                onOpenDeckBuilder(getActiveSlotId());
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Edit3 size={15} /> Abrir Montador de Baralhos Completo
            </button>
          ) : (
            <span className="text-xs text-stone-400">
              Escolha rapidamente um baralho para a revanche
            </span>
          )}

          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider transition-colors shadow-md cursor-pointer"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
};
