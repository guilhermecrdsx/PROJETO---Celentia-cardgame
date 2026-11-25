import React from 'react';
import { CardInstance } from '../types/game';
import { getCardArtCandidates, advanceCardArtFallback } from '../utils/cardVisuals';
import { Shield, Swords, Sparkles, Skull, Scroll, Layers, Gavel, CheckCircle } from 'lucide-react';
import { useVisualPreferences } from '../utils/visualTheme';

const CardArtImage: React.FC<{ card: CardInstance; className?: string }> = ({ card, className }) => {
  const candidates = getCardArtCandidates(card.templateId, {
    isLvl2: card.level === 2,
    isRevealedFaleziel: card.isRevealedFaleziel,
    isPack: card.templateId === 'pack_atormentador' || card.isPack,
    name: card.name,
  });
  const initialSrc = candidates[0];
  if (!initialSrc) return null;
  return (
    <img
      key={initialSrc}
      src={initialSrc}
      alt={card.name}
      className={className}
      onError={(e) => {
        if (!advanceCardArtFallback(e.currentTarget, candidates)) {
          e.currentTarget.style.display = 'none';
        }
      }}
    />
  );
};

export interface DrawAnimEvent {
  id: string;
  card: CardInstance;
  ownerId: 'player' | 'opponent';
  ownerName: string;
  hideFace?: boolean;
  delayMs?: number;
}

export interface DiscardAnimEvent {
  id: string;
  card: CardInstance;
  ownerId: 'player' | 'opponent';
  ownerName: string;
  reason: 'unit_eliminated' | 'skill_used' | 'hand_discard';
  delayMs?: number;
}

export interface FloatingSkillCard {
  id: string;
  card: CardInstance;
  ownerId: 'player' | 'opponent';
  ownerName: string;
  targetName?: string;
  stage: 'awaiting_resolution' | 'executing_effect';
}

export interface RoundCoinTransitionState {
  id: string;
  fromRole: 'attacker' | 'defender';
  toRole: 'attacker' | 'defender';
  nextRound: number;
  isNewRound: boolean;
  stage: 'waves' | 'consume_and_spin' | 'reveal';
  targetX: number;
  targetY: number;
}

export interface CounterResponseModalData {
  spellCard: CardInstance;
  casterName: string;
  defenderName: string;
  targetName?: string;
  canInteractiveDefenderRespond: boolean;
  onUseVeto: () => void;
  onLetResolve: () => void;
}

interface CardActionAnimationsOverlayProps {
  drawEvents: DrawAnimEvent[];
  discardEvents: DiscardAnimEvent[];
  floatingSkillCards?: FloatingSkillCard[];
  roundCoinTransition: RoundCoinTransitionState | null;
  counterResponseModal?: CounterResponseModalData | null;
  playerName: string;
  opponentName: string;
}

export const CardActionAnimationsOverlay: React.FC<CardActionAnimationsOverlayProps> = ({
  drawEvents,
  discardEvents,
  floatingSkillCards = [],
  roundCoinTransition,
  counterResponseModal,
  playerName,
  opponentName,
}) => {
  const { animationMode, combatAnimations } = useVisualPreferences();
  const isOff = animationMode === 'off' || !combatAnimations;
  const isStatic = !isOff && animationMode === 'static';

  if (isOff) {
    // Always preserve interactive Veto do Indômito Counter-Response Modal even when animations are off!
    if (!counterResponseModal) return null;
    return (
      <div className="fixed inset-0 z-[57] flex flex-col items-center justify-center bg-black/70 pointer-events-auto p-4">
        <div className="relative z-30 w-full max-w-md rounded-2xl border-2 border-amber-400 bg-stone-950 p-4 shadow-2xl text-center">
          <div className="flex items-center justify-center gap-2 text-amber-300 font-serif font-black text-xs uppercase tracking-widest mb-1">
            <Gavel size={15} className="text-amber-300" />
            <span>Janela de Contra-Resposta · Veto do Indômito</span>
          </div>
          <p className="text-xs text-stone-200 leading-relaxed">
            <strong className="text-amber-300">{counterResponseModal.casterName}</strong> ativou a habilidade{' '}
            <strong className="text-cyan-300">[{counterResponseModal.spellCard.name}]</strong>
            {counterResponseModal.targetName ? ` (${counterResponseModal.targetName})` : ''}.{' '}
            {counterResponseModal.canInteractiveDefenderRespond
              ? `${counterResponseModal.defenderName} possui Veto do Indômito na mão! Deseja vetar esta habilidade ou deixar resolver?`
              : `Aguardando resposta de ${counterResponseModal.defenderName}...`}
          </p>
          {counterResponseModal.canInteractiveDefenderRespond && (
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={counterResponseModal.onUseVeto}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 border-2 border-amber-200 text-white font-serif font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <Gavel size={14} />
                <span>Usar Veto do Indômito</span>
              </button>
              <button
                type="button"
                onClick={counterResponseModal.onLetResolve}
                className="px-4 py-2 rounded-xl bg-stone-800 border border-emerald-400/60 text-emerald-200 font-serif font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <CheckCircle size={14} />
                <span>Deixar Resolver</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes reg-draw-player-flight {
          0% {
            transform: translate(-36vw, 24vh) scale(0.42) rotateY(180deg) rotateZ(-14deg);
            opacity: 0;
          }
          18% {
            transform: translate(-24vw, 12vh) scale(0.75) rotateY(140deg) rotateZ(-6deg);
            opacity: 1;
          }
          48% {
            transform: translate(0vw, 2vh) scale(1.06) rotateY(0deg) rotateZ(0deg);
            opacity: 1;
          }
          78% {
            transform: translate(0vw, 4vh) scale(1.02) rotateY(0deg) rotateZ(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(8vw, 34vh) scale(0.55) rotateY(0deg) rotateZ(6deg);
            opacity: 0;
          }
        }

        @keyframes reg-draw-opponent-flight {
          0% {
            transform: translate(-36vw, -26vh) scale(0.4) rotateY(180deg) rotateZ(12deg);
            opacity: 0;
          }
          22% {
            transform: translate(-18vw, -18vh) scale(0.82) rotateY(30deg) rotateZ(4deg);
            opacity: 1;
          }
          55% {
            transform: translate(0vw, -16vh) scale(0.95) rotateY(0deg) rotateZ(0deg);
            opacity: 1;
          }
          82% {
            transform: translate(4vw, -22vh) scale(0.85) rotateY(0deg) rotateZ(-3deg);
            opacity: 0.95;
          }
          100% {
            transform: translate(12vw, -36vh) scale(0.45) rotateY(0deg) rotateZ(-8deg);
            opacity: 0;
          }
        }

        @keyframes reg-discard-unit-player {
          0% {
            transform: translate(4vw, 8vh) scale(0.95) rotate(0deg);
            opacity: 0;
            filter: brightness(1.6) saturate(1.4);
          }
          15% {
            transform: translate(4vw, 6vh) scale(1.06) rotate(-3deg);
            opacity: 1;
            filter: brightness(1.3) drop-shadow(0 0 25px rgba(244, 63, 94, 0.9));
          }
          42% {
            transform: translate(2vw, 6vh) scale(1.0) rotate(4deg);
            opacity: 1;
          }
          72% {
            transform: translate(-18vw, 14vh) scale(0.72) rotate(-14deg);
            opacity: 0.9;
          }
          100% {
            transform: translate(-38vw, 20vh) scale(0.24) rotate(-38deg);
            opacity: 0;
          }
        }

        @keyframes reg-discard-unit-opponent {
          0% {
            transform: translate(4vw, -10vh) scale(0.95) rotate(0deg);
            opacity: 0;
            filter: brightness(1.6) saturate(1.4);
          }
          15% {
            transform: translate(4vw, -10vh) scale(1.06) rotate(3deg);
            opacity: 1;
            filter: brightness(1.3) drop-shadow(0 0 25px rgba(244, 63, 94, 0.9));
          }
          42% {
            transform: translate(2vw, -10vh) scale(1.0) rotate(-4deg);
            opacity: 1;
          }
          72% {
            transform: translate(-18vw, -18vh) scale(0.72) rotate(14deg);
            opacity: 0.9;
          }
          100% {
            transform: translate(-38vw, -24vh) scale(0.24) rotate(38deg);
            opacity: 0;
          }
        }

        @keyframes reg-discard-skill-player {
          0% {
            transform: translate(0vw, 0vh) scale(1.0) rotate(0deg);
            opacity: 1;
            filter: drop-shadow(0 0 30px rgba(168, 85, 247, 0.95));
          }
          38% {
            transform: translate(-10vw, 6vh) scale(0.88) rotate(-6deg);
            opacity: 0.95;
          }
          100% {
            transform: translate(-38vw, 20vh) scale(0.22) rotate(-28deg);
            opacity: 0;
          }
        }

        @keyframes reg-discard-skill-opponent {
          0% {
            transform: translate(0vw, 0vh) scale(1.0) rotate(0deg);
            opacity: 1;
            filter: drop-shadow(0 0 30px rgba(168, 85, 247, 0.95));
          }
          38% {
            transform: translate(-10vw, -10vh) scale(0.88) rotate(6deg);
            opacity: 0.95;
          }
          100% {
            transform: translate(-38vw, -24vh) scale(0.22) rotate(28deg);
            opacity: 0;
          }
        }

        @keyframes reg-slash-cut {
          0% {
            transform: scaleX(0) rotate(-32deg);
            opacity: 0;
          }
          25% {
            transform: scaleX(1.25) rotate(-32deg);
            opacity: 1;
          }
          65% {
            transform: scaleX(1.35) rotate(-32deg);
            opacity: 0.85;
          }
          100% {
            transform: scaleX(1.5) rotate(-32deg);
            opacity: 0;
          }
        }

        @keyframes reg-skill-float-enter {
          0% {
            transform: translateY(22vh) scale(0.55) rotateX(24deg);
            opacity: 0;
          }
          100% {
            transform: translateY(0vh) scale(1) rotateX(0deg);
            opacity: 1;
          }
        }

        @keyframes reg-skill-levitate {
          0%, 100% {
            transform: translateY(-5px) rotate(-0.8deg) scale(1.02);
          }
          50% {
            transform: translateY(6px) rotate(0.8deg) scale(1.05);
          }
        }

        @keyframes reg-golden-wave-flow {
          0% {
            stroke-dasharray: 0 2200;
            stroke-dashoffset: 0;
            opacity: 0.2;
          }
          20% {
            opacity: 1;
          }
          75% {
            stroke-dasharray: 2200 2200;
            stroke-dashoffset: 0;
            opacity: 1;
          }
          100% {
            stroke-dasharray: 2200 2200;
            stroke-dashoffset: -1900;
            opacity: 0;
          }
        }

        @keyframes reg-coin-consume-burst {
          0% {
            transform: translate(-50%, -50%) scale(2.8);
            opacity: 0;
          }
          35% {
            transform: translate(-50%, -50%) scale(0.35);
            opacity: 1;
          }
          70% {
            transform: translate(-50%, -50%) scale(1.9);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.6);
            opacity: 0;
          }
        }

        @keyframes reg-role-coin-3d-spin {
          0% {
            transform: perspective(700px) rotateY(0deg) scale(1);
            filter: brightness(1.1) drop-shadow(0 0 18px #fbbf24);
          }
          30% {
            transform: perspective(700px) rotateY(360deg) scale(1.55);
            filter: brightness(2.2) drop-shadow(0 0 55px #fef08a);
          }
          70% {
            transform: perspective(700px) rotateY(900deg) scale(1.65);
            filter: brightness(2.4) drop-shadow(0 0 70px #fde047);
          }
          100% {
            transform: perspective(700px) rotateY(1080deg) scale(1.22);
            filter: brightness(1.25) drop-shadow(0 0 32px #f59e0b);
          }
        }

        @keyframes reg-round-ribbon-reveal {
          0% {
            transform: translateY(-50%) scaleX(0.15);
            opacity: 0;
          }
          22% {
            transform: translateY(-50%) scaleX(1.03);
            opacity: 1;
          }
          82% {
            transform: translateY(-50%) scaleX(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-50%) scaleX(0.95);
            opacity: 0;
          }
        }
      `}</style>

      {/* ==================================================================== */}
      {/* 0. FLOATING SKILL CARD IN THE CENTER OF THE ARENA + VETO MODAL       */}
      {/* ==================================================================== */}
      {floatingSkillCards.length > 0 && (
        <div
          className={`fixed inset-0 z-[57] flex flex-col items-center justify-center overflow-hidden ${
            counterResponseModal ? 'bg-black/55 backdrop-blur-[2px] pointer-events-auto' : 'pointer-events-none'
          }`}
        >
          <div className="flex items-center justify-center">
            {floatingSkillCards.map((entry, idx) => {
              const isPlayer = entry.ownerId === 'player';
              const isExecuting = entry.stage === 'executing_effect';
              const offsetX = floatingSkillCards.length > 1 ? (idx === 0 ? -115 : 115) : 0;

              return (
                <div
                  key={entry.id}
                  style={{
                    animation: isStatic
                      ? undefined
                      : 'reg-skill-float-enter 0.38s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                    marginLeft: `${offsetX}px`,
                  }}
                  className="relative flex flex-col items-center select-none pointer-events-none"
                >
                  <div
                    style={{
                      animation: isStatic ? undefined : 'reg-skill-levitate 2.1s ease-in-out infinite',
                    }}
                    className="relative flex flex-col items-center"
                  >
                    {/* Rotating Arcane Sigil Behind Floating Skill Card (only in full mode) */}
                    {!isStatic && (
                      <>
                        <div
                          className={`absolute -inset-6 rounded-full border-2 border-dashed animate-spin pointer-events-none ${
                            isExecuting
                              ? 'border-amber-300/60 shadow-[0_0_45px_rgba(251,191,36,0.45)]'
                              : 'border-cyan-400/50 shadow-[0_0_35px_rgba(56,189,248,0.35)]'
                          }`}
                          style={{ animationDuration: isExecuting ? '4s' : '8s' }}
                        />
                        <div
                          className={`absolute -inset-3 rounded-3xl blur-xl pointer-events-none ${
                            isExecuting ? 'bg-amber-500/25' : 'bg-purple-500/25'
                          }`}
                        />
                      </>
                    )}

                    {/* Status Header Pill */}
                    <div
                      className={`relative z-20 mb-2 px-3.5 py-1 rounded-xl border-2 text-[10px] font-serif font-black uppercase tracking-widest flex items-center gap-1.5 shadow-xl ${
                        isExecuting
                          ? 'bg-gradient-to-r from-amber-950/95 via-purple-950/95 to-amber-950/95 border-amber-300 text-amber-200 shadow-amber-500/40'
                          : 'bg-gradient-to-r from-indigo-950/95 via-stone-950/95 to-purple-950/95 border-cyan-300 text-cyan-200 shadow-cyan-500/40'
                      }`}
                    >
                      <Sparkles size={13} className={`text-amber-300 ${isStatic ? '' : 'animate-spin'}`} />
                      <span>
                        {isExecuting
                          ? `⚡ ${entry.card.name} · Aplicando Efeito!`
                          : `📜 ${entry.ownerName} ativou ${entry.card.name}`}
                      </span>
                    </div>

                    {/* Floating Skill Card Body in Center of Arena */}
                    <div
                      className={`relative z-10 w-44 h-64 rounded-2xl border-2 p-2.5 flex flex-col justify-between overflow-hidden backdrop-blur-md transition-all ${
                        isExecuting
                          ? 'bg-gradient-to-b from-purple-950/95 via-stone-950/95 to-indigo-950/95 border-amber-300 shadow-[0_0_55px_rgba(251,191,36,0.75)]'
                          : 'bg-gradient-to-b from-indigo-950/95 via-stone-950/95 to-purple-950/95 border-cyan-300 shadow-[0_0_45px_rgba(56,189,248,0.65)]'
                      }`}
                    >
                      {/* Top Row: Speed / Fugaz & Tier */}
                      <div className="relative z-10 flex items-center justify-between">
                        <span
                          className={`px-1.5 py-0.5 rounded border text-[8px] font-mono font-black uppercase ${
                            entry.card.isFugaz
                              ? 'bg-amber-900/90 border-amber-300 text-amber-200'
                              : entry.card.speed === 'rapida'
                              ? 'bg-sky-900/90 border-sky-300 text-sky-200'
                              : 'bg-purple-900/90 border-purple-300 text-purple-200'
                          }`}
                        >
                          {entry.card.isFugaz
                            ? '⚡💨 Fugaz'
                            : entry.card.speed === 'rapida'
                            ? '🌪️ Rápida'
                            : '⏳ Lenta'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-black/80 border border-amber-400/60 text-[9px] font-mono font-black text-amber-300">
                          Tier {entry.card.tier}
                        </span>
                      </div>

                      <div className="relative my-1.5 flex-1 rounded-xl overflow-hidden border border-white/25 bg-stone-950 flex items-center justify-center shadow-inner">
                        <CardArtImage card={entry.card} className="w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent p-1.5 text-center">
                          <div className="text-xs font-serif font-black text-white leading-tight truncate drop-shadow">
                            {entry.card.name}
                          </div>
                        </div>
                      </div>

                      {/* Skill Effect Summary Footer */}
                      <div className="relative z-10 rounded-lg bg-black/75 border border-purple-400/35 px-2 py-1 text-center">
                        <p className="text-[8px] text-stone-200 line-clamp-2 leading-snug">
                          {entry.card.effectDescription || 'Habilidade em execução no centro da arena.'}
                        </p>
                      </div>
                    </div>

                    {/* Target Pill Below Card */}
                    {entry.targetName && (
                      <div
                        className={`relative z-20 mt-2 px-3 py-0.5 rounded-lg border text-[9px] font-mono font-bold uppercase tracking-wider shadow-lg ${
                          isPlayer
                            ? 'bg-stone-950/95 border-amber-400/60 text-amber-200'
                            : 'bg-stone-950/95 border-purple-400/60 text-purple-200'
                        }`}
                      >
                        🎯 Alvo: {entry.targetName}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Counter-Response Modal (Activated ONLY when Defender has Veto do Indômito in Hand) */}
          {counterResponseModal && (
            <div className="relative z-30 mt-4 w-full max-w-md mx-4 rounded-2xl border-2 border-amber-400 bg-gradient-to-b from-stone-950/98 via-purple-950/95 to-stone-950/98 p-4 shadow-[0_0_50px_rgba(245,158,11,0.55)] text-center pointer-events-auto animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-center gap-2 text-amber-300 font-serif font-black text-xs uppercase tracking-widest mb-1">
                <Gavel size={15} className="text-amber-300 animate-bounce" />
                <span>Janela de Contra-Resposta · Veto do Indômito</span>
              </div>
              <p className="text-xs text-stone-200 leading-relaxed">
                <strong className="text-amber-300">{counterResponseModal.casterName}</strong> ativou a habilidade{' '}
                <strong className="text-cyan-300">[{counterResponseModal.spellCard.name}]</strong>
                {counterResponseModal.targetName ? ` (${counterResponseModal.targetName})` : ''}.{' '}
                {counterResponseModal.canInteractiveDefenderRespond
                  ? `${counterResponseModal.defenderName} possui Veto do Indômito na mão! Deseja vetar esta habilidade ou deixar resolver?`
                  : `Aguardando resposta de ${counterResponseModal.defenderName}...`}
              </p>

              {counterResponseModal.canInteractiveDefenderRespond && (
                <div className="mt-3.5 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={counterResponseModal.onUseVeto}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 border-2 border-amber-200 text-white font-serif font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(244,63,94,0.6)] flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95"
                  >
                    <Gavel size={14} />
                    <span>Usar Veto do Indômito</span>
                  </button>
                  <button
                    type="button"
                    onClick={counterResponseModal.onLetResolve}
                    className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-emerald-400/60 text-emerald-200 font-serif font-black text-xs uppercase tracking-wider shadow flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95"
                  >
                    <CheckCircle size={14} />
                    <span>Deixar Resolver</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 1. FLOATING CARD DRAW ANIMATIONS (GRIMÓRIO ➔ MÃO)                    */}
      {/* ==================================================================== */}
      {drawEvents.length > 0 && (
        <div className="fixed inset-0 z-[58] pointer-events-none flex items-center justify-center overflow-hidden">
          {drawEvents.map((ev, idx) => {
            const isPlayer = ev.ownerId === 'player';
            const showCardDetails = isPlayer || !ev.hideFace;
            const offsetX = (idx % 3 - 1) * 26;

            if (isStatic) {
              return (
                <div
                  key={ev.id}
                  className="fixed bottom-20 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-xl bg-stone-950/95 border border-amber-400/80 shadow-xl text-[11px] font-serif font-black text-amber-200 flex items-center gap-2 select-none"
                >
                  <Sparkles size={12} className="text-amber-300" />
                  <span>
                    {isPlayer
                      ? `Comprou: ${ev.card.name} (T${ev.card.tier})`
                      : `${ev.ownerName} comprou 1 carta`}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={ev.id}
                style={{
                  animation: `${
                    isPlayer ? 'reg-draw-player-flight' : 'reg-draw-opponent-flight'
                  } 1.25s cubic-bezier(0.22, 1, 0.36, 1) forwards`,
                  animationDelay: `${ev.delayMs || 0}ms`,
                  marginLeft: `${offsetX}px`,
                }}
                className="absolute flex flex-col items-center select-none"
              >
                {/* Top Header Pill */}
                <div
                  className={`mb-2 px-3 py-1 rounded-lg border text-[10px] font-serif font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg ${
                    isPlayer
                      ? 'bg-amber-950/95 border-amber-300 text-amber-200 shadow-amber-500/40'
                      : 'bg-purple-950/95 border-purple-300 text-purple-200 shadow-purple-500/40'
                  }`}
                >
                  <Sparkles size={12} className="text-amber-300 animate-spin" />
                  <span>{isPlayer ? 'Carta Comprada!' : `${ev.ownerName} Comprou`}</span>
                </div>

                {/* 3D Animated Card Body */}
                {showCardDetails ? (
                  <div
                    className={`relative w-40 h-56 rounded-2xl border-2 p-2.5 flex flex-col justify-between overflow-hidden shadow-[0_0_40px_rgba(251,191,36,0.65)] ${
                      ev.card.type === 'skill'
                        ? 'bg-gradient-to-b from-purple-950 via-stone-950 to-indigo-950 border-purple-300'
                        : 'bg-gradient-to-b from-amber-950 via-stone-950 to-stone-900 border-amber-300'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-amber-200/20 to-transparent pointer-events-none" />

                    <div className="relative z-10 flex items-center justify-between">
                      <span className="px-1.5 py-0.5 rounded bg-black/75 border border-amber-400/50 text-[9px] font-mono font-black text-amber-300">
                        T{ev.card.tier}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-black/75 border border-white/20 text-[9px] font-serif font-bold text-stone-200">
                        {ev.card.element}
                      </span>
                    </div>

                    <div className="relative my-1.5 flex-1 rounded-xl overflow-hidden border border-white/20 bg-stone-950 flex items-center justify-center">
                      <CardArtImage card={ev.card} className="w-full h-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-1.5 text-center">
                        <div className="text-xs font-serif font-black text-white leading-tight truncate">
                          {ev.card.name}
                        </div>
                      </div>
                    </div>

                    <div className="relative z-10 flex items-center justify-between text-[10px] font-mono font-bold">
                      {ev.card.type === 'unit' ? (
                        <>
                          <span className="px-1.5 py-0.5 rounded bg-amber-950/90 border border-amber-400/50 text-amber-300">
                            ⚔️ {ev.card.power}
                          </span>
                          <span className="text-[9px] font-serif uppercase tracking-wider text-amber-200/80">
                            Unidade
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-400/50 text-emerald-300">
                            ❤️ {ev.card.hp}
                          </span>
                        </>
                      ) : (
                        <span className="w-full text-center py-0.5 rounded bg-purple-950/90 border border-purple-400/50 text-purple-200 font-serif uppercase tracking-wider text-[9px]">
                          📜 Carta de Habilidade
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="relative w-36 h-52 rounded-2xl border-2 border-purple-300 bg-gradient-to-br from-[#231542] via-[#120b24] to-[#080510] p-3 flex flex-col items-center justify-between shadow-[0_0_35px_rgba(168,85,247,0.65)]">
                    <span className="text-[9px] font-mono tracking-widest text-purple-300/80">
                      ᚱ ᚦ ᚠ ᛊ
                    </span>
                    <div className="w-16 h-16 rounded-full border-2 border-purple-300/60 bg-black/50 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                      <Sparkles size={24} className="text-purple-300 animate-pulse" />
                    </div>
                    <span className="text-[10px] font-serif font-bold uppercase tracking-widest text-purple-200">
                      Grimório Secreto
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. FLOATING CARD DISCARD ANIMATIONS (ELIMINADA / HABILIDADE ➔ CRIPTA)*/}
      {/* ==================================================================== */}
      {discardEvents.length > 0 && (
        <div className="fixed inset-0 z-[59] pointer-events-none flex items-center justify-center overflow-hidden">
          {discardEvents.map((ev, idx) => {
            const isPlayer = ev.ownerId === 'player';
            const isSkill = ev.reason === 'skill_used' || ev.card.type === 'skill';
            const isUnitEliminated = ev.reason === 'unit_eliminated' && ev.card.type === 'unit';
            const offsetX = (idx % 3 - 1) * 32;

            const animName = isSkill
              ? isPlayer
                ? 'reg-discard-skill-player'
                : 'reg-discard-skill-opponent'
              : isPlayer
              ? 'reg-discard-unit-player'
              : 'reg-discard-unit-opponent';

            if (isStatic) {
              return (
                <div
                  key={ev.id}
                  className={`fixed top-14 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-xl bg-stone-950/95 border shadow-xl text-[11px] font-serif font-black flex items-center gap-2 select-none ${
                    isSkill
                      ? 'border-purple-400 text-purple-200'
                      : 'border-rose-400 text-rose-200'
                  }`}
                >
                  {isSkill ? <Scroll size={12} /> : <Skull size={12} />}
                  <span>
                    {ev.card.name} ➔ Cripta ({isPlayer ? playerName : opponentName})
                  </span>
                </div>
              );
            }

            return (
              <div
                key={ev.id}
                style={{
                  animation: `${animName} 1.25s cubic-bezier(0.22, 1, 0.36, 1) forwards`,
                  animationDelay: `${ev.delayMs || 0}ms`,
                  marginLeft: `${offsetX}px`,
                }}
                className="absolute flex flex-col items-center select-none"
              >
                <div
                  className={`mb-2 px-3 py-1 rounded-lg border text-[10px] font-serif font-black uppercase tracking-widest flex items-center gap-1.5 shadow-xl ${
                    isSkill
                      ? 'bg-purple-950/95 border-purple-400 text-purple-200 shadow-purple-600/50'
                      : isUnitEliminated
                      ? 'bg-rose-950/95 border-rose-400 text-rose-200 shadow-rose-600/50'
                      : 'bg-stone-900/95 border-amber-500/60 text-amber-200 shadow-black/70'
                  }`}
                >
                  {isSkill ? (
                    <>
                      <Scroll size={12} className="text-purple-300" />
                      <span>Habilidade Usada ➔ Cripta</span>
                    </>
                  ) : isUnitEliminated ? (
                    <>
                      <Skull size={12} className="text-rose-400 animate-bounce" />
                      <span>Unidade Eliminada ➔ Cripta</span>
                    </>
                  ) : (
                    <>
                      <Layers size={12} className="text-amber-300" />
                      <span>Descartada ➔ Cripta</span>
                    </>
                  )}
                </div>

                <div
                  className={`relative w-40 h-56 rounded-2xl border-2 p-2.5 flex flex-col justify-between overflow-hidden ${
                    isSkill
                      ? 'bg-gradient-to-b from-purple-950 via-indigo-950 to-stone-950 border-purple-400 shadow-[0_0_45px_rgba(168,85,247,0.8)]'
                      : 'bg-gradient-to-b from-rose-950 via-red-950 to-stone-950 border-rose-500 shadow-[0_0_45px_rgba(244,63,94,0.85)]'
                  }`}
                >
                  {isUnitEliminated && (
                    <div
                      style={{ animation: 'reg-slash-cut 0.85s ease-out forwards' }}
                      className="absolute inset-x-[-25%] top-1/2 h-1.5 bg-gradient-to-r from-transparent via-rose-300 to-transparent shadow-[0_0_18px_#f43f5e] z-30 pointer-events-none"
                    />
                  )}

                  {isSkill && (
                    <div className="absolute inset-2 rounded-xl border border-dashed border-purple-300/60 animate-spin pointer-events-none z-20" />
                  )}

                  <div className="relative z-10 flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded bg-black/80 border border-white/20 text-[9px] font-mono font-black text-stone-200">
                      T{ev.card.tier}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-serif font-black uppercase ${
                        isSkill
                          ? 'bg-purple-900/90 text-purple-200 border border-purple-400/50'
                          : 'bg-rose-900/90 text-rose-200 border border-rose-400/50'
                      }`}
                    >
                      {isSkill ? 'Consumida' : 'Abatida'}
                    </span>
                  </div>

                  <div className="relative my-1.5 flex-1 rounded-xl overflow-hidden border border-white/20 bg-stone-950 flex items-center justify-center">
                    <CardArtImage
                      card={ev.card}
                      className={`w-full h-full object-cover ${
                        isUnitEliminated ? 'grayscale contrast-125 brightness-75' : 'brightness-90'
                      }`}
                    />

                    <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                      <div
                        className={`w-11 h-11 rounded-full border-2 flex items-center justify-center shadow-lg ${
                          isSkill
                            ? 'bg-purple-950/85 border-purple-300 text-purple-200'
                            : 'bg-rose-950/85 border-rose-400 text-rose-300'
                        }`}
                      >
                        {isSkill ? <Sparkles size={20} /> : <Skull size={20} />}
                      </div>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-1.5 text-center">
                      <div
                        className={`text-xs font-serif font-black leading-tight truncate ${
                          isUnitEliminated ? 'text-rose-200 line-through' : 'text-purple-100'
                        }`}
                      >
                        {ev.card.name}
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 text-center text-[9px] font-mono uppercase tracking-wider text-stone-300 bg-black/60 py-0.5 rounded border border-white/10">
                    Cripta de {isPlayer ? playerName : opponentName}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. MOEDA DA FUNÇÃO: ANIMAÇÃO LOCALIZADA NA ÁREA DA MOEDA             */}
      {/* (Anéis de implosão, giro 3D e onda de choque sem feixes ou tela cheia)*/}
      {/* ==================================================================== */}
      {roundCoinTransition && (() => {
        const isConsume = roundCoinTransition.stage === 'consume_and_spin';
        const isReveal = roundCoinTransition.stage === 'reveal';
        const activeFaceIsAttacker = isReveal
          ? roundCoinTransition.toRole === 'attacker'
          : roundCoinTransition.fromRole === 'attacker';
        const isTargetAttacker = roundCoinTransition.toRole === 'attacker';

        const localShards = [
          '-translate-x-14 -translate-y-12 rotate-12',
          'translate-x-14 -translate-y-14 -rotate-45',
          '-translate-x-16 translate-y-8 rotate-45',
          'translate-x-16 translate-y-10 -rotate-12',
          '-translate-x-6 -translate-y-16 rotate-90',
          'translate-x-8 translate-y-14 -rotate-90',
        ];

        if (isStatic) {
          return (
            <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[65] pointer-events-none select-none">
              <div
                className={`px-4 py-1.5 rounded-xl border-2 shadow-xl flex items-center gap-2 text-xs font-serif font-black uppercase tracking-wider ${
                  isTargetAttacker
                    ? 'bg-rose-950/95 border-amber-300 text-amber-200'
                    : 'bg-sky-950/95 border-cyan-300 text-cyan-200'
                }`}
              >
                {isTargetAttacker ? <Swords size={14} /> : <Shield size={14} />}
                <span>
                  {roundCoinTransition.isNewRound ? `Rodada ${roundCoinTransition.nextRound} · ` : ''}
                  {isTargetAttacker ? 'Função: Atacante' : 'Função: Defensor'}
                </span>
              </div>
            </div>
          );
        }

        return (
          <div
            style={{
              left: `${roundCoinTransition.targetX}px`,
              top: `${roundCoinTransition.targetY}px`,
            }}
            className="fixed -translate-x-1/2 -translate-y-1/2 z-[65] pointer-events-none select-none flex items-center justify-center"
          >
            {/* Stage 1 & 2: Concentric Inward-Sucking Rings & Golden Core localized on the Coin Area */}
            {!isReveal ? (
              <div className="relative flex items-center justify-center w-28 h-28">
                <div
                  className={`absolute w-28 h-28 rounded-full border-2 border-dashed border-amber-300/95 shadow-[0_0_24px_#fbbf24] ${
                    isConsume ? 'animate-energy-ring-suck-fast' : 'animate-energy-ring-suck'
                  }`}
                />
                <div
                  className={`absolute w-36 h-36 rounded-full border-2 border-yellow-200/90 shadow-[0_0_28px_#fde047] [animation-delay:200ms] ${
                    isConsume ? 'animate-energy-ring-suck-fast' : 'animate-energy-ring-suck'
                  }`}
                />
                <div
                  className={`absolute w-24 h-24 rounded-full border-2 border-white/85 shadow-[0_0_25px_rgba(255,255,255,0.85)] [animation-delay:420ms] ${
                    isConsume ? 'animate-energy-ring-suck-fast' : 'animate-energy-ring-suck'
                  }`}
                />

                {/* Localized Golden Core Aura */}
                <div
                  className={`absolute rounded-full animate-accumulator-core ${
                    isConsume
                      ? 'w-24 h-24 bg-radial from-white via-amber-300/80 to-transparent'
                      : 'w-20 h-20 bg-radial from-amber-300/75 via-amber-500/35 to-transparent'
                  }`}
                />

                {/* 3D Role Coin Spinning Right Over Its Own HUD Area */}
                <div
                  style={{
                    animation: isConsume
                      ? 'reg-role-coin-3d-spin 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards'
                      : undefined,
                  }}
                  className={`relative z-20 w-14 h-14 rounded-full border-2 flex items-center justify-center ${
                    isConsume ? 'animate-hp-critical-shake' : 'animate-hp-vibrate'
                  } ${
                    activeFaceIsAttacker
                      ? 'border-amber-200 bg-gradient-to-br from-amber-300 via-rose-700 to-red-950 text-amber-100 shadow-[0_0_32px_rgba(251,191,36,0.9)]'
                      : 'border-amber-200 bg-gradient-to-br from-amber-200 via-sky-700 to-blue-950 text-cyan-100 shadow-[0_0_32px_rgba(56,189,248,0.9)]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full border border-dashed border-amber-200/80 flex items-center justify-center bg-black/25">
                    {activeFaceIsAttacker ? (
                      <Swords size={22} className="text-amber-100 drop-shadow-[0_0_8px_rgba(251,191,36,0.95)]" />
                    ) : (
                      <Shield size={22} className="text-cyan-100 drop-shadow-[0_0_8px_rgba(56,189,248,0.95)]" />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Stage 3: Localized Shockwave & Role Lock Right Over the Coin Area */
              <div className="relative flex items-center justify-center w-28 h-28">
                <div
                  className={`absolute w-36 h-36 rounded-full border-4 animate-explosion-shockwave ${
                    isTargetAttacker
                      ? 'border-amber-200 bg-rose-500/35 shadow-[0_0_65px_#fbbf24]'
                      : 'border-cyan-200 bg-sky-500/35 shadow-[0_0_65px_#38bdf8]'
                  }`}
                />
                <div className="absolute w-24 h-24 rounded-full border-2 border-white bg-yellow-200/55 animate-ping" />

                {/* Local Shatter Shards Around Coin */}
                {localShards.map((posClass, idx) => (
                  <div
                    key={idx}
                    className={`absolute w-3 h-3 rotate-45 border border-white shadow-[0_0_12px_#fbbf24] transition-all duration-500 ${posClass} ${
                      isTargetAttacker
                        ? 'bg-gradient-to-tr from-rose-500 via-amber-300 to-white'
                        : 'bg-gradient-to-tr from-sky-500 via-amber-200 to-white'
                    }`}
                  />
                ))}

                {/* Locked-in Coin Result */}
                <div
                  className={`relative z-20 w-16 h-16 rounded-full border-2 flex items-center justify-center animate-victory-badge ${
                    isTargetAttacker
                      ? 'border-amber-200 bg-gradient-to-br from-amber-300 via-rose-700 to-red-950 text-amber-100 shadow-[0_0_38px_rgba(251,191,36,0.95)]'
                      : 'border-amber-200 bg-gradient-to-br from-amber-200 via-sky-700 to-blue-950 text-cyan-100 shadow-[0_0_38px_rgba(56,189,248,0.95)]'
                  }`}
                >
                  <div className="w-11 h-11 rounded-full border border-dashed border-amber-200/80 flex items-center justify-center bg-black/25">
                    {isTargetAttacker ? (
                      <Swords size={24} className="text-amber-100 drop-shadow-[0_0_10px_rgba(251,191,36,0.95)]" />
                    ) : (
                      <Shield size={24} className="text-cyan-100 drop-shadow-[0_0_10px_rgba(56,189,248,0.95)]" />
                    )}
                  </div>
                </div>

                {/* Compact Local Badge Directly Under the Coin */}
                <div
                  className={`absolute top-22 whitespace-nowrap px-2.5 py-0.5 rounded-full border text-[10px] font-serif font-black uppercase tracking-wider shadow-lg animate-in zoom-in-75 duration-200 ${
                    isTargetAttacker
                      ? 'bg-rose-950/95 border-amber-300 text-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.6)]'
                      : 'bg-sky-950/95 border-cyan-300 text-cyan-200 shadow-[0_0_18px_rgba(56,189,248,0.6)]'
                  }`}
                >
                  {roundCoinTransition.isNewRound ? `R${roundCoinTransition.nextRound} · ` : ''}
                  {isTargetAttacker ? '⚔️ Atacante' : '🛡️ Defensor'}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </>
  );
};
