import React, { useState } from 'react';
import { CardInstance } from '../types/game';
import { CardView } from './CardView';
import { FormattedCardDescription } from './FormattedCardDescription';
import { Sparkles, CheckCircle2, Orbit } from 'lucide-react';
import { sound } from '../services/soundEffects';

interface RevealSelectionModalProps {
  isOpen: boolean;
  cards: CardInstance[];
  onSelectCard: (card: CardInstance) => void;
  title?: string;
  description?: string;
  mode?: 'revelar' | 'retorno';
}

export const RevealSelectionModal: React.FC<RevealSelectionModalProps> = ({
  isOpen,
  cards,
  onSelectCard,
  title = 'Efeito Situacional: REVELAR',
  description = 'O Portal Místico em espiral se abriu revelando as 5 primeiras cartas do topo do seu baralho. Escolha 1 carta para ir à sua mão:',
  mode = 'revelar',
}) => {
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);

  if (!isOpen || cards.length === 0) return null;

  const selectedCard = cards.find((c) => c.instanceId === selectedInstanceId);

  const handleConfirm = () => {
    if (!selectedCard) return;
    sound.playSpell();
    onSelectCard(selectedCard);
    setSelectedInstanceId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl max-h-[94dvh] overflow-y-auto rounded-3xl border-2 border-sky-400/80 bg-gradient-to-b from-slate-950 via-sky-950/40 to-slate-950 p-4 sm:p-6 shadow-[0_0_60px_rgba(56,189,248,0.4)] text-stone-100 flex flex-col items-center">
        {/* Portal Místico em Espiral de Fundo */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30 select-none overflow-hidden"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 600 600"
            className="w-[140%] h-[140%] max-w-none animate-[spin_20s_linear_infinite]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <radialGradient id="portalGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                <stop offset="35%" stopColor="#0284c7" stopOpacity="0.4" />
                <stop offset="70%" stopColor="#0f172a" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="spiralStroke1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7dd3fc" />
                <stop offset="50%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
            <circle cx="300" cy="300" r="280" fill="url(#portalGrad)" />
            {/* Espirais Místicas Concéntricas */}
            {[40, 80, 120, 160, 200, 240].map((r, i) => (
              <circle
                key={r}
                cx="300"
                cy="300"
                r={r}
                stroke="url(#spiralStroke1)"
                strokeWidth={i % 2 === 0 ? '1.5' : '1'}
                strokeDasharray={`${12 + i * 8} ${8 + i * 4}`}
                opacity={0.6 - i * 0.08}
              />
            ))}
            {/* Braços de vórtice espiral */}
            <path
              d="M300 300 Q360 220 440 260 T520 380"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.7"
            />
            <path
              d="M300 300 Q240 380 160 340 T80 220"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.7"
            />
            <path
              d="M300 300 Q380 360 340 440 T220 520"
              stroke="#7dd3fc"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.5"
            />
            <path
              d="M300 300 Q220 240 260 160 T380 80"
              stroke="#7dd3fc"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.5"
            />
          </svg>
        </div>

        {/* Header */}
        <div className="relative text-center mb-5 z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-500/20 border border-sky-400/60 text-sky-300 font-extrabold text-xs uppercase tracking-wider mb-2 shadow-[0_0_15px_rgba(56,189,248,0.4)]">
            <Orbit size={15} className="animate-spin text-sky-300" style={{ animationDuration: '6s' }} />
            <span>Condição Situacional (Azul Claro)</span>
            <Sparkles size={14} className="text-sky-300" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-white tracking-wide drop-shadow-[0_0_10px_rgba(56,189,248,0.5)]">
            {mode === 'retorno' ? '🕊️' : '🔮'} {title}
          </h2>
          <p className="text-xs sm:text-sm text-sky-100/90 mt-1.5 max-w-xl leading-relaxed text-pretty">
            {description}
          </p>
        </div>

        {/* Revealed Cards Display Grid (5 do topo do baralho) */}
        <div className="relative flex flex-wrap items-center justify-center gap-4 my-2 max-w-full overflow-x-auto p-3 z-10">
          {cards.map((card, idx) => {
            const isSelected = card.instanceId === selectedInstanceId;
            return (
              <div
                key={card.instanceId}
                onClick={() => {
                  sound.playDraw();
                  setSelectedInstanceId(card.instanceId);
                }}
                className={`transition-all duration-200 transform cursor-pointer relative ${
                  isSelected
                    ? 'scale-105 ring-4 ring-sky-400 rounded-2xl shadow-[0_0_30px_rgba(56,189,248,0.8)]'
                    : 'hover:scale-102 hover:brightness-110 opacity-90 hover:opacity-100'
                }`}
              >
                <div className="absolute -top-2 left-2 z-30 px-2 py-0.5 rounded-full bg-sky-950/90 border border-sky-400/80 text-[10px] font-mono font-bold text-sky-300 shadow">
                  {mode === 'retorno' ? `#${idx + 1} Cripta` : `#${idx + 1} do Topo`}
                </div>
                <CardView card={card} size="sm" isPlayable={true} />
                {isSelected && (
                  <div className="absolute -top-2 -right-2 bg-sky-400 text-stone-950 rounded-full p-1 shadow-lg z-30 animate-bounce">
                    <CheckCircle2 size={18} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Card Info & Harmonious Description Box */}
        <div className="relative min-h-[52px] my-3 w-full max-w-2xl z-10">
          {selectedCard ? (
            <div className="bg-sky-950/60 border border-sky-400/50 px-4 py-2.5 rounded-2xl space-y-1.5 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
              <div className="text-xs font-mono text-sky-300 flex items-center justify-between border-b border-sky-400/30 pb-1">
                <div className="flex items-center gap-2">
                  <span className="text-stone-300">Carta Selecionada:</span>
                  <strong className="text-white font-bold font-serif text-sm">{selectedCard.name}</strong>
                </div>
                <span>Tier {selectedCard.tier} · {selectedCard.element}</span>
              </div>
              <FormattedCardDescription
                text={selectedCard.effectDescription}
                variant="compact"
              />
            </div>
          ) : (
            <div className="text-center text-xs text-sky-300/80 italic py-2 bg-sky-950/30 rounded-xl border border-sky-500/20">
              {mode === 'retorno'
                ? 'Clique em uma das cartas descartadas acima para selecioná-la e retorná-la à sua mão.'
                : 'Clique em uma das 5 cartas do topo acima para inspecionar seus poderes e selecioná-la.'}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="relative mt-2 z-10">
          <button
            onClick={handleConfirm}
            disabled={!selectedCard}
            className={`px-8 py-3 rounded-2xl font-bold text-sm tracking-wide transition-all shadow-xl flex items-center gap-2 ${
              selectedCard
                ? 'bg-gradient-to-r from-sky-600 via-cyan-600 to-sky-600 hover:from-sky-500 hover:to-cyan-500 text-white shadow-sky-500/40 cursor-pointer active:scale-95 ring-2 ring-sky-300'
                : 'bg-stone-900 text-stone-500 cursor-not-allowed border border-white/5'
            }`}
          >
            <CheckCircle2 size={18} />
            <span>{mode === 'retorno' ? 'Retornar Carta Escolhida à Mão' : 'Adicionar Carta Escolhida à Mão'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
