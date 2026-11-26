import React, { useState, useMemo } from 'react';
import { CardInstance, ElementType, TierType } from '../types/game';
import { CARD_TEMPLATES } from '../data/cards';
import { createCardInstance } from '../logic/deckFactory';
import { CardView } from './CardView';
import { FormattedCardDescription } from './FormattedCardDescription';
import {
  X,
  Search,
  Sparkles,
  Plus,
  RefreshCw,
  Trash2,
  Layers,
  FlaskConical,
  Flame,
  Droplets,
  Mountain,
  Zap,
  Compass,
  Crown,
  Atom,
  Snowflake,
  ArrowUpToLine,
  Sun,
} from 'lucide-react';
import { sound } from '../services/soundEffects';

interface TestingArenaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCardToHand: (card: CardInstance) => void;
  onAddCardToEnemyHand?: (card: CardInstance) => void;
  onSummonCardToBoard: (card: CardInstance) => void;
  onSummonCardToEnemyBoard?: (card: CardInstance) => void;
  onCastSkillCard?: (card: CardInstance) => void;
  onClearPlayerBoard: () => void;
  onClearEnemyBoard: () => void;
  onClearHand: () => void;
  onClearEnemyHand?: () => void;
  onRespawnDummies: () => void;
  onSummonDummy?: () => void;
  onPutCardOnTopOfDeck?: (card: CardInstance) => void;
  currentTopCardName?: string;
  deckCount?: number;
}

const ELEMENTS: { label: string; value: ElementType | 'all'; icon: React.ReactNode; color: string }[] = [
  { label: 'Todos', value: 'all', icon: <Layers size={14} />, color: 'text-stone-300' },
  { label: 'Cósmico', value: 'Cósmico', icon: <Atom size={14} />, color: 'text-purple-400' },
  { label: 'Mágico', value: 'Mágico', icon: <Crown size={14} />, color: 'text-yellow-400' },
  { label: 'Fogo', value: 'Fogo', icon: <Flame size={14} />, color: 'text-red-400' },
  { label: 'Água', value: 'Água', icon: <Droplets size={14} />, color: 'text-blue-400' },
  { label: 'Gelo', value: 'Gelo', icon: <Snowflake size={14} />, color: 'text-cyan-300' },
  { label: 'Telúrico', value: 'Telúrico', icon: <Mountain size={14} />, color: 'text-emerald-400' },
  { label: 'Elétrico', value: 'Elétrico', icon: <Zap size={14} />, color: 'text-amber-400' },
  { label: 'Divino', value: 'Divino', icon: <Sun size={14} />, color: 'text-amber-300' },
  { label: 'Sombrio', value: 'Sombrio', icon: <Sparkles size={14} />, color: 'text-fuchsia-400' },
  { label: 'Neutro', value: 'Neutro', icon: <Compass size={14} />, color: 'text-stone-400' },
];

export const TestingArenaDrawer: React.FC<TestingArenaDrawerProps> = ({
  isOpen,
  onClose,
  onAddCardToHand,
  onAddCardToEnemyHand,
  onSummonCardToBoard,
  onSummonCardToEnemyBoard,
  onCastSkillCard,
  onClearPlayerBoard,
  onClearEnemyBoard,
  onClearHand,
  onClearEnemyHand,
  onRespawnDummies,
  onSummonDummy,
  onPutCardOnTopOfDeck,
  currentTopCardName,
  deckCount,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'all' | 'unit' | 'skill'>('all');
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<'all' | 'rapida' | 'lenta' | 'fugaz'>('all');
  const [selectedElement, setSelectedElement] = useState<ElementType | 'all'>('all');
  const [selectedTier, setSelectedTier] = useState<TierType | 'all'>('all');

  const filteredCards = useMemo(() => {
    return CARD_TEMPLATES.filter((template) => {
      if (template.id === 'pack_atormentador' || template.id === 'dummy_target' || template.isSecret) return false;

      if (selectedType === 'unit' && template.type !== 'unit') return false;
      if (selectedType === 'skill' && template.type !== 'skill') return false;

      if (selectedSkillFilter !== 'all') {
        if (template.type !== 'skill') return false;
        if (selectedSkillFilter === 'fugaz') {
          const isTokenFugaz =
            template.id === 'g_rochedo' ||
            template.id === 'token_fagulha_estelar' ||
            template.id === 'token_flecha_eletrica' ||
            template.id === 'token_centelha' ||
            template.id === 'token_filho_da_luz';
          if (!isTokenFugaz) return false;
        } else if (selectedSkillFilter === 'rapida') {
          if (template.speed !== 'rapida') return false;
        } else if (selectedSkillFilter === 'lenta') {
          if (template.speed !== 'lenta') return false;
        }
      }

      if (selectedElement !== 'all') {
        if (selectedElement === 'Telúrico') {
          if (template.element !== 'Telúrico' && template.element !== 'Terra') return false;
        } else if (template.element !== selectedElement) {
          return false;
        }
      }
      if (selectedTier !== 'all') {
        if (selectedTier === 5) {
          if (template.tier !== 5 && template.tier !== 6) return false;
        } else if (template.tier !== selectedTier) {
          return false;
        }
      }
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchesName = template.name.toLowerCase().includes(query);
        const matchesEffect = template.effectDescription?.toLowerCase().includes(query) || false;
        return matchesName || matchesEffect;
      }
      return true;
    });
  }, [searchTerm, selectedType, selectedSkillFilter, selectedElement, selectedTier]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl h-full bg-stone-950 border-l border-amber-500/40 shadow-2xl flex flex-col text-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-amber-500/20 bg-stone-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-stone-950 border border-amber-500/40 text-amber-300">
              <FlaskConical size={20} />
            </div>
            <div>
              <h2 className="text-base font-serif font-black text-amber-300 flex items-center gap-1.5">
                Grimório da Arena de Testes
              </h2>
              <p className="text-[11px] text-stone-400">
                Puxe qualquer carta para a mão ou invoque na mesa respeitando os requisitos de invocação.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 transition-colors cursor-pointer"
            title="Fechar Grimório"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Testing Actions Toolbar (Aligned & Synchronized Pairs) */}
        <div className="px-4 py-2.5 bg-stone-900/50 border-b border-white/10 grid grid-cols-2 gap-2 text-xs">
          {/* Par 1: Dummies */}
          <button
            onClick={() => {
              onRespawnDummies();
              sound.playSummon();
            }}
            className="w-full px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-200 border border-amber-500/40 font-serif font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            title="Recria 3 bonecos de teste (Dummies) no campo oponente"
          >
            <RefreshCw size={12} className="text-amber-400 shrink-0" /> Restaurar Dummies
          </button>
          <button
            onClick={() => {
              if (onSummonDummy) {
                onSummonDummy();
              } else {
                onRespawnDummies();
              }
            }}
            className="w-full px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-200 border border-amber-500/40 font-serif font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            title="Invoca 1 boneco de teste (Dummy) na mesa inimiga"
          >
            <Plus size={12} className="text-amber-400 shrink-0" /> Invocar Dummy
          </button>

          {/* Par 2: Limpar Minha Mesa & Limpar Minha Mão */}
          <button
            onClick={() => {
              onClearPlayerBoard();
              sound.playDiscard();
            }}
            className="w-full px-2.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-500/40 font-serif font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            title="Limpa todas as suas cartas na mesa"
          >
            <Trash2 size={12} className="text-rose-300 shrink-0" /> Limpar Minha Mesa
          </button>
          <button
            onClick={() => {
              onClearHand();
            }}
            className="w-full px-2.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-500/40 font-serif font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            title="Remove todas as cartas da sua mão atual"
          >
            <Trash2 size={12} className="text-rose-300 shrink-0" /> Limpar Minha Mão
          </button>

          {/* Par 3: Limpar Mesa Inimiga & Limpar Mão Inimiga */}
          <button
            onClick={() => {
              onClearEnemyBoard();
              sound.playDiscard();
            }}
            className="w-full px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-600/70 font-serif font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            title="Elimina todos os inimigos da mesa"
          >
            <Trash2 size={12} className="text-stone-400 shrink-0" /> Limpar Mesa Inimiga
          </button>
          {onClearEnemyHand && (
            <button
              onClick={() => {
                onClearEnemyHand();
              }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-600/70 font-serif font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              title="Remove todas as cartas da mão inimiga"
            >
              <Trash2 size={12} className="text-stone-400 shrink-0" /> Limpar Mão Inimiga
            </button>
          )}
        </div>

        {/* Top of Deck Status Banner */}
        {currentTopCardName && (
          <div className="mx-4 mt-2.5 px-3 py-1.5 rounded-xl bg-stone-900/90 border border-amber-500/35 flex items-center justify-between text-xs shadow-md">
            <div className="flex items-center gap-2 min-w-0">
              <ArrowUpToLine size={15} className="text-amber-400 shrink-0" />
              <span className="text-[11px] text-stone-300 truncate">
                Topo do baralho: <strong className="text-amber-200">{currentTopCardName}</strong>
              </span>
            </div>
            {deckCount !== undefined && (
              <span className="text-[10px] font-mono tabular-nums text-stone-400 shrink-0 ml-2">
                {deckCount} cartas
              </span>
            )}
          </div>
        )}

        {/* Interactive Toast Message */}
        {toastMessage && (
          <div className="mx-4 mt-2 px-3.5 py-1.5 rounded-xl bg-amber-950/95 border border-amber-400/80 text-amber-200 text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in duration-150">
            <Sparkles size={14} className="text-amber-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Filter bar */}
        <div className="p-3 border-b border-white/10 flex flex-col gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-stone-500" />
            <input
              type="text"
              placeholder="Buscar por nome ou efeito da carta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-stone-900 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Card Type & Skill Speed Filters */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-semibold text-stone-500 mr-0.5">Categoria:</span>
            <button
              onClick={() => {
                setSelectedType('all');
                setSelectedSkillFilter('all');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                selectedType === 'all' && selectedSkillFilter === 'all'
                  ? 'bg-amber-500 text-stone-950 shadow'
                  : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-white/10'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => {
                setSelectedType('unit');
                setSelectedSkillFilter('all');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                selectedType === 'unit'
                  ? 'bg-amber-500 text-stone-950 shadow'
                  : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-white/10'
              }`}
            >
              ⚔️ Unidades
            </button>
            <button
              onClick={() => {
                setSelectedType('skill');
                setSelectedSkillFilter('all');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                selectedType === 'skill' && selectedSkillFilter === 'all'
                  ? 'bg-amber-500 text-stone-950 shadow'
                  : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-white/10'
              }`}
            >
              ✨ Habilidades
            </button>
            <button
              onClick={() => {
                setSelectedType('skill');
                setSelectedSkillFilter('rapida');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                selectedSkillFilter === 'rapida'
                  ? 'bg-amber-500 text-stone-950 shadow'
                  : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-white/10'
              }`}
            >
              ⚡ Rápidas
            </button>
            <button
              onClick={() => {
                setSelectedType('skill');
                setSelectedSkillFilter('lenta');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                selectedSkillFilter === 'lenta'
                  ? 'bg-amber-500 text-stone-950 shadow'
                  : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-white/10'
              }`}
            >
              🔮 Lentas
            </button>
            <button
              onClick={() => {
                setSelectedType('skill');
                setSelectedSkillFilter('fugaz');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                selectedSkillFilter === 'fugaz'
                  ? 'bg-amber-500 text-stone-950 shadow'
                  : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-white/10'
              }`}
            >
              ⏳ Fugazes
            </button>
          </div>

          {/* Element filters */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            {ELEMENTS.map((el) => (
              <button
                key={el.value}
                onClick={() => setSelectedElement(el.value)}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0 transition-colors cursor-pointer ${
                  selectedElement === el.value
                    ? 'bg-amber-500 text-stone-950 font-bold shadow'
                    : 'bg-stone-900 hover:bg-stone-800 text-stone-400 border border-white/5'
                }`}
              >
                {el.icon} {el.label}
              </button>
            ))}
          </div>

          {/* Tier filters */}
          <div className="flex items-center gap-1 text-[11px] text-stone-400">
            <span className="font-semibold text-stone-500 mr-1">Tier:</span>
            {(['all', 1, 2, 3, 4, 5] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTier(t)}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  selectedTier === t
                    ? 'bg-amber-400 text-stone-950 font-bold'
                    : 'bg-stone-900 hover:bg-stone-800 text-stone-400'
                }`}
              >
                {t === 'all' ? 'Todos' : `T${t}`}
              </button>
            ))}
            <span className="ml-auto text-stone-500 tabular-nums">{filteredCards.length} cartas</span>
          </div>
        </div>

        {/* Card catalog grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredCards.map((template) => {
            const previewCard = createCardInstance(template);
            return (
              <div
                key={template.id}
                className="p-3 rounded-2xl bg-stone-900/75 border border-white/10 hover:border-amber-500/50 transition-all flex flex-col justify-between gap-2 shadow-md group"
              >
                <div className="flex items-center justify-center py-1">
                  <CardView card={previewCard} size="sm" isPlayable={false} />
                </div>

                <div className="text-center">
                  <div className="font-bold text-xs text-amber-200 line-clamp-1">{template.name}</div>
                  <div className="text-[10px] text-stone-400 font-mono">
                    Tier {template.tier} · {template.element} · {template.type === 'unit' ? 'Unidade' : 'Habilidade'}
                  </div>
                  {template.effectDescription && (
                    <div className="mt-1.5 p-2 rounded-xl bg-stone-950/70 border border-stone-800/80">
                      <FormattedCardDescription
                        text={template.effectDescription}
                        variant="compact"
                        hideLevelRequirement={true}
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 mt-1 pt-2 border-t border-white/5">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        const newInst = createCardInstance(template);
                        onAddCardToHand(newInst);
                      }}
                      className="py-1.5 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus size={12} /> Para a Mão
                    </button>
                    {template.type === 'unit' ? (
                      <button
                        onClick={() => {
                          const newInst = createCardInstance(template);
                          onSummonCardToBoard(newInst);
                        }}
                        className="py-1.5 px-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-200 border border-amber-500/35 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Sparkles size={12} className="text-amber-400" /> Invocar Aliado
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const newInst = createCardInstance(template);
                          if (onCastSkillCard) {
                            onCastSkillCard(newInst);
                          } else {
                            onAddCardToHand(newInst);
                          }
                        }}
                        className="py-1.5 px-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-cyan-200 border border-cyan-500/40 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Sparkles size={12} className="text-cyan-400" /> Usar na Mesa
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {onAddCardToEnemyHand && (
                      <button
                        onClick={() => {
                          const newInst = createCardInstance(template);
                          onAddCardToEnemyHand(newInst);
                        }}
                        className="py-1.5 px-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus size={11} /> Mão Inimiga
                      </button>
                    )}
                    {template.type === 'unit' && onSummonCardToEnemyBoard && (
                      <button
                        onClick={() => {
                          const newInst = createCardInstance(template);
                          onSummonCardToEnemyBoard(newInst);
                        }}
                        className="py-1.5 px-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 text-rose-200 border border-rose-500/40 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Sparkles size={11} /> Mesa Inimiga
                      </button>
                    )}
                  </div>
                  {onPutCardOnTopOfDeck && (
                    <button
                      onClick={() => {
                        const newInst = createCardInstance(template);
                        onPutCardOnTopOfDeck(newInst);
                        setToastMessage(`⭐ "${template.name}" foi colocada no TOPO do seu baralho!`);
                        setTimeout(() => setToastMessage(null), 3500);
                      }}
                      className="w-full py-1.5 px-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-200 border border-amber-500/35 text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                      title="Coloca esta carta no TOPO do seu baralho. Ela será a próxima carta puxada ao comprar!"
                    >
                      <ArrowUpToLine size={12} className="text-amber-400" />
                      <span>Topo do Baralho (Próxima Compra)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
