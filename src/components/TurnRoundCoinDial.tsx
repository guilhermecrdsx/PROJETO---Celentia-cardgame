import React, { useEffect, useRef, useState } from 'react';
import { FastForward, RotateCw, Shield, Sparkles, Swords } from 'lucide-react';
import type { TierType } from '../types/game';
import { isTierAllowedInRound } from '../logic/combat';
import { sound } from '../services/soundEffects';
import { useVisualPreferences } from '../utils/visualTheme';

interface TurnRoundCoinDialProps {
  round: number;
  roundTurnNumber: number;
  turnPlayer: 'player' | 'opponent';
  attackerRole: 'player' | 'opponent';
  activeCombatAttackerRole: 'player' | 'opponent';
  attackerConsecutivePasses: number;
  isDefendingPhase: boolean;
  isPostAttackFinalTurn: boolean;
  hasPendingSpell: boolean;
  willPassEndRound: boolean;
  freeActionHint: string | null;
  newlyUnlockedTier: TierType | null;
  roundCoinFlipAnim: boolean;
  isTestingArena: boolean;
  compact?: boolean;
  onTestingNextRound?: () => void;
  onTestingSwapTurn?: () => void;
}

const CX = 80;
const CY = 80;
const RING_RADIUS = 61;

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function describeArcPath(
  cx: number,
  cy: number,
  radius: number,
  startDeg: number,
  endDeg: number
): string {
  const start = polarToCartesian(cx, cy, radius, startDeg);
  const end = polarToCartesian(cx, cy, radius, endDeg);
  const largeArc = endDeg - startDeg <= 180 ? '0' : '1';
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

const TURN_SEGMENTS: Array<{
  slot: number;
  shortLabel: string;
  title: string;
  startDeg: number;
  endDeg: number;
  isExtra?: boolean;
}> = [
  { slot: 1, shortLabel: '1', title: 'Turno 1 (Atacante)', startDeg: -85, endDeg: -35 },
  { slot: 2, shortLabel: '2', title: 'Turno 2 (Defensor)', startDeg: -25, endDeg: 25 },
  { slot: 3, shortLabel: '3', title: 'Turno 3 (Atacante)', startDeg: 35, endDeg: 85 },
  { slot: 4, shortLabel: '4', title: 'Turno 4 (Defensor)', startDeg: 95, endDeg: 145 },
  { slot: 5, shortLabel: '5', title: 'Turno 5+ (Atacante)', startDeg: 155, endDeg: 205 },
  {
    slot: 6,
    shortLabel: 'E',
    title: 'Turno Extra Pós-Ataque (Defensor)',
    startDeg: 215,
    endDeg: 265,
    isExtra: true,
  },
];

// 24 micro-engraved astrolabe dial ticks around the inner golden track
const COMPASS_TICKS = Array.from({ length: 24 }, (_, idx) => {
  const angle = idx * 15;
  const isCardinal = idx % 6 === 0;
  const inner = polarToCartesian(CX, CY, isCardinal ? 43.5 : 46.5, angle);
  const outer = polarToCartesian(CX, CY, 50.2, angle);
  return { idx, inner, outer, isCardinal };
});

export const TurnRoundCoinDial: React.FC<TurnRoundCoinDialProps> = ({
  round,
  roundTurnNumber,
  turnPlayer,
  attackerRole,
  activeCombatAttackerRole,
  attackerConsecutivePasses,
  isDefendingPhase,
  isPostAttackFinalTurn,
  hasPendingSpell,
  willPassEndRound,
  freeActionHint,
  newlyUnlockedTier,
  roundCoinFlipAnim,
  isTestingArena,
  compact = false,
  onTestingNextRound,
  onTestingSwapTurn,
}) => {
  const { animationMode, ambientAnimations } = useVisualPreferences();
  const isFullAnim = animationMode === 'full' && ambientAnimations;
  const [manualCoinSpin, setManualCoinSpin] = useState(false);
  const [turnPulseKey, setTurnPulseKey] = useState(0);
  const [roundBurstKey, setRoundBurstKey] = useState(0);
  const [isRoundBursting, setIsRoundBursting] = useState(false);
  const [isTurnPulsing, setIsTurnPulsing] = useState(false);

  const prevRoundRef = useRef(round);
  const prevTurnSigRef = useRef(`${roundTurnNumber}-${turnPlayer}-${isPostAttackFinalTurn}-${isDefendingPhase}-${hasPendingSpell}`);

  // Determine which side currently must act (top = opponent, bottom = player)
  const activeSide: 'player' | 'opponent' = isDefendingPhase
    ? activeCombatAttackerRole === 'player'
      ? 'opponent'
      : 'player'
    : turnPlayer;

  const isOpponentActive = activeSide === 'opponent';
  const isPlayerActive = activeSide === 'player';
  const isActiveSideAttacker = activeSide === attackerRole;

  // Trigger dramatic solar shockwave & number pop whenever the round advances
  useEffect(() => {
    if (prevRoundRef.current !== round) {
      prevRoundRef.current = round;
      setRoundBurstKey((k) => k + 1);
      setIsRoundBursting(true);
      const t = window.setTimeout(() => setIsRoundBursting(false), 1100);
      return () => window.clearTimeout(t);
    }
  }, [round]);

  // Trigger crisp energy shockwave & segment ignite whenever turn/phase shifts
  useEffect(() => {
    const nextSig = `${roundTurnNumber}-${turnPlayer}-${isPostAttackFinalTurn}-${isDefendingPhase}-${hasPendingSpell}`;
    if (prevTurnSigRef.current !== nextSig) {
      prevTurnSigRef.current = nextSig;
      setTurnPulseKey((k) => k + 1);
      setIsTurnPulsing(true);
      const t = window.setTimeout(() => setIsTurnPulsing(false), 760);
      return () => window.clearTimeout(t);
    }
  }, [roundTurnNumber, turnPlayer, isPostAttackFinalTurn, isDefendingPhase, hasPendingSpell]);

  const tierNumbers: TierType[] = round >= 10 ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
  const unlockedMaxTier =
    round >= 10 ? 6 : round >= 9 ? 5 : round >= 7 ? 4 : round >= 5 ? 3 : round >= 3 ? 2 : 1;
  const isTierUnlocking = newlyUnlockedTier !== null;

  const activeSlot = isPostAttackFinalTurn ? 6 : Math.min(Math.max(roundTurnNumber, 1), 5);
  const completedRegularLimit = isPostAttackFinalTurn
    ? Math.min(Math.max(roundTurnNumber, 1), 5)
    : activeSlot - 1;

  const activeArcColor = freeActionHint
    ? '#22d3ee'
    : isDefendingPhase || hasPendingSpell
    ? '#fbbf24'
    : isPostAttackFinalTurn
    ? '#c084fc'
    : willPassEndRound
    ? '#fb7185'
    : isPlayerActive
    ? '#34d399'
    : '#fb7185';

  const activeArcGlow = freeActionHint
    ? 'drop-shadow(0 0 6px rgba(34,211,238,0.92))'
    : isDefendingPhase || hasPendingSpell
    ? 'drop-shadow(0 0 6px rgba(251,191,36,0.92))'
    : isPostAttackFinalTurn
    ? 'drop-shadow(0 0 7px rgba(192,132,252,0.95))'
    : willPassEndRound
    ? 'drop-shadow(0 0 7px rgba(251,113,133,0.95))'
    : isPlayerActive
    ? 'drop-shadow(0 0 7px rgba(52,211,153,0.9))'
    : 'drop-shadow(0 0 7px rgba(251,113,133,0.9))';

  const shockwaveBorderClass = freeActionHint
    ? 'border-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.85)]'
    : isDefendingPhase || hasPendingSpell
    ? 'border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.85)]'
    : isPostAttackFinalTurn
    ? 'border-purple-300 shadow-[0_0_22px_rgba(192,132,252,0.85)]'
    : isPlayerActive
    ? 'border-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.85)]'
    : 'border-rose-400 shadow-[0_0_20px_rgba(251,113,133,0.85)]';

  const frameBorderClass = isTierUnlocking
    ? 'border-emerald-400/90 shadow-[0_0_28px_rgba(52,211,153,0.42)]'
    : isDefendingPhase || hasPendingSpell
    ? 'border-amber-400/85 shadow-[0_0_24px_rgba(251,191,36,0.32)]'
    : isPostAttackFinalTurn
    ? 'border-purple-400/85 shadow-[0_0_26px_rgba(168,85,247,0.36)]'
    : willPassEndRound
    ? 'border-rose-400/90 shadow-[0_0_26px_rgba(244,63,94,0.38)]'
    : isPlayerActive
    ? 'border-emerald-400/70 shadow-[0_0_22px_rgba(16,185,129,0.28)]'
    : 'border-rose-500/65 shadow-[0_0_22px_rgba(244,63,94,0.26)]';

  const bannerConfig = isDefendingPhase
    ? {
        label: isPlayerActive ? 'Defesa · Você' : 'Defesa · Oponente',
        icon: <Shield size={11} className="shrink-0 text-amber-300" />,
        boxClass: 'bg-amber-950/80 border-amber-400/70 text-amber-200',
      }
    : hasPendingSpell
    ? {
        label: isPlayerActive ? 'Resposta · Você' : 'Resposta · Oponente',
        icon: <Sparkles size={11} className="shrink-0 text-amber-300" />,
        boxClass: 'bg-amber-950/80 border-amber-400/70 text-amber-200',
      }
    : isPostAttackFinalTurn
    ? {
        label: isPlayerActive ? 'Seu Turno Extra' : 'Extra · Oponente',
        icon: <Shield size={11} className="shrink-0 text-purple-200" />,
        boxClass: 'bg-purple-950/85 border-purple-400/75 text-purple-100',
      }
    : isPlayerActive
    ? {
        label: 'Sua Vez',
        icon: isActiveSideAttacker ? (
          <Swords size={11} className="shrink-0 text-emerald-300" />
        ) : (
          <Shield size={11} className="shrink-0 text-emerald-300" />
        ),
        boxClass: 'bg-emerald-950/85 border-emerald-400/75 text-emerald-200',
      }
    : {
        label: 'Turno Oponente',
        icon: isActiveSideAttacker ? (
          <Swords size={11} className="shrink-0 text-rose-300" />
        ) : (
          <Shield size={11} className="shrink-0 text-rose-300" />
        ),
        boxClass: 'bg-rose-950/85 border-rose-400/70 text-rose-200',
      };

  const handleCoinTap = () => {
    if (manualCoinSpin || roundCoinFlipAnim) return;
    sound.playTick();
    setManualCoinSpin(true);
    setTurnPulseKey((k) => k + 1);
    setIsTurnPulsing(true);
    window.setTimeout(() => setManualCoinSpin(false), 740);
    window.setTimeout(() => setIsTurnPulsing(false), 760);
  };

  const isSpinningNow = isFullAnim && (roundCoinFlipAnim || manualCoinSpin);

  if (compact) {
    return (
      <div
        className={`relative w-full rounded-xl border bg-gradient-to-b from-[#17112b]/95 via-stone-950/95 to-[#0b0815]/95 px-1 py-1 flex flex-col items-center gap-0.5 transition-all duration-200 select-none overflow-hidden ${frameBorderClass}`}
        title={`Rodada ${round} · ${
          isPostAttackFinalTurn ? 'Turno Extra Pós-Ataque' : `Turno ${roundTurnNumber}`
        } · Tiers liberados até ${unlockedMaxTier} · Passes do Atacante: ${attackerConsecutivePasses}/2`}
      >
        {/* Compact Tiers Row */}
        <div className="w-full flex items-center justify-between gap-0.5 px-1 py-0.5 rounded-md bg-black/70 border border-amber-500/40">
          <div className="flex items-center gap-1">
            {tierNumbers.map((t) => {
              const unlocked = isTierAllowedInRound(t, round);
              return (
                <span
                  key={t}
                  className={`text-[9px] font-mono font-black tabular-nums leading-none ${
                    unlocked ? 'text-emerald-400' : 'text-red-500/75'
                  }`}
                >
                  {t}
                </span>
              );
            })}
          </div>
          <span className="text-[8px] font-mono font-bold text-amber-300 tabular-nums leading-none">
            ≤T{unlockedMaxTier}
          </span>
        </div>

        {/* Top Pointer: Opponent */}
        <div
          className={`w-full flex items-center justify-center gap-1 text-[7.5px] font-serif font-black uppercase tracking-wider leading-none ${
            isOpponentActive
              ? isDefendingPhase || hasPendingSpell
                ? 'text-amber-300'
                : 'text-rose-300'
              : 'text-stone-600 opacity-50'
          }`}
        >
          <span>▲</span>
          <span>Rival</span>
        </div>

        {/* Compact Segmented Coin Dial */}
        <button
          type="button"
          onClick={handleCoinTap}
          className="relative w-[56px] h-[56px] sm:w-[64px] sm:h-[64px] flex items-center justify-center cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-300"
          aria-label={`Rodada ${round}, ${
            isPostAttackFinalTurn ? 'Turno Extra' : `Turno ${roundTurnNumber}`
          }`}
        >
          <svg
            viewBox="0 0 160 160"
            className="relative z-10 w-full h-full overflow-visible"
            aria-hidden="true"
          >
            <circle cx={CX} cy={CY} r={74} fill="none" stroke="rgba(245,158,11,0.35)" strokeWidth="1.5" />
            <circle cx={CX} cy={CY} r={RING_RADIUS} fill="none" stroke="rgba(24,20,38,0.92)" strokeWidth="18" />
            {TURN_SEGMENTS.map((seg) => {
              const isCurrent = seg.slot === activeSlot;
              const isCompleted = !seg.isExtra && seg.slot <= completedRegularLimit;
              const pathD = describeArcPath(CX, CY, RING_RADIUS, seg.startDeg, seg.endDeg);
              const labelPos = polarToCartesian(CX, CY, RING_RADIUS, (seg.startDeg + seg.endDeg) / 2);
              const strokeColor = isCurrent
                ? activeArcColor
                : isCompleted
                ? '#b45309'
                : seg.isExtra
                ? 'rgba(88,28,135,0.5)'
                : 'rgba(41,37,36,0.95)';
              const textColor = isCurrent ? '#0c0a09' : isCompleted ? '#fef3c7' : '#a8a29e';
              return (
                <g key={seg.slot}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isCurrent ? '15' : '12'}
                    strokeLinecap="butt"
                  />
                  <text
                    x={labelPos.x}
                    y={labelPos.y + 0.5}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={textColor}
                    fontSize="10"
                    fontWeight="900"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  >
                    {seg.shortLabel}
                  </text>
                </g>
              );
            })}
          </svg>

          <div
            className={`absolute z-20 w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] rounded-full border border-amber-400/95 bg-gradient-to-br from-amber-900/75 via-stone-950 to-black flex flex-col items-center justify-center shadow-inner ${
              isSpinningNow ? 'round-coin-spin' : ''
            }`}
          >
            <span className="text-[11px] sm:text-[12px] font-mono font-black text-amber-100 leading-none tabular-nums">
              R{round}
            </span>
            <span
              className={`text-[7.5px] font-mono font-black leading-none mt-0.5 tabular-nums ${
                freeActionHint
                  ? 'text-cyan-300'
                  : isPostAttackFinalTurn
                  ? 'text-purple-300'
                  : isPlayerActive
                  ? 'text-emerald-300'
                  : 'text-rose-300'
              }`}
            >
              {isPostAttackFinalTurn ? 'EXT' : `T${roundTurnNumber}`}
            </span>
          </div>
        </button>

        {/* Bottom Pointer: Player */}
        <div
          className={`w-full flex items-center justify-center gap-1 text-[7.5px] font-serif font-black uppercase tracking-wider leading-none ${
            isPlayerActive
              ? isDefendingPhase || hasPendingSpell
                ? 'text-amber-300'
                : 'text-emerald-300'
              : 'text-stone-600 opacity-50'
          }`}
        >
          <span>▼</span>
          <span>Você</span>
        </div>

        {/* Compact Status & Attacker Passes */}
        <div
          className={`w-full rounded-md border px-1 py-0.5 flex items-center justify-between gap-1 text-[8px] font-mono font-bold tabular-nums ${bannerConfig.boxClass}`}
        >
          <span className="truncate font-serif font-black uppercase tracking-tight">
            {bannerConfig.label}
          </span>
          <span className="shrink-0 opacity-90" title="Passes consecutivos do Atacante">
            {attackerConsecutivePasses}/2
          </span>
        </div>

        {willPassEndRound && (
          <div className="w-full px-1 py-[1px] rounded bg-rose-950/95 border border-rose-400/80 text-[7.5px] font-bold text-rose-200 text-center leading-tight">
            Passar = Fim Rod.
          </div>
        )}

        {freeActionHint && (
          <div
            className="w-full px-1 py-[1px] rounded bg-cyan-950/90 border border-cyan-400/65 text-[7.5px] font-semibold text-cyan-200 text-center truncate leading-tight"
            title={freeActionHint}
          >
            {freeActionHint}
          </div>
        )}

        {isTestingArena && (
          <div className="w-full grid grid-cols-2 gap-0.5 pt-0.5">
            <button
              type="button"
              onClick={onTestingNextRound}
              className="py-0.5 px-1 rounded bg-stone-900 hover:bg-stone-800 border border-amber-500/45 text-amber-200 font-serif font-bold text-[7.5px] uppercase cursor-pointer"
              title="Avançar para próxima rodada"
            >
              +1R
            </button>
            <button
              type="button"
              onClick={onTestingSwapTurn}
              className="py-0.5 px-1 rounded bg-stone-900 hover:bg-stone-800 border border-amber-500/45 text-amber-200 font-serif font-bold text-[7.5px] uppercase cursor-pointer"
              title="Alternar turno ativo"
            >
              ⇄T
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative w-full rounded-2xl border-2 bg-gradient-to-b from-[#17112b]/95 via-stone-950/95 to-[#0b0815]/95 px-2 py-2 flex flex-col items-center gap-1.5 transition-all duration-300 select-none overflow-hidden ${frameBorderClass}`}
      title={`Rodada ${round} · ${
        isPostAttackFinalTurn ? 'Turno Extra Pós-Ataque' : `Turno ${roundTurnNumber}`
      } · Tiers liberados até ${unlockedMaxTier} · Passes do Atacante: ${attackerConsecutivePasses}/2`}
    >
      {/* Subtle corner filigree rivets */}
      <span aria-hidden="true" className="pointer-events-none absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-amber-400/50" />
      <span aria-hidden="true" className="pointer-events-none absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400/50" />
      <span aria-hidden="true" className="pointer-events-none absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full bg-amber-400/50" />
      <span aria-hidden="true" className="pointer-events-none absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400/50" />

      {/* Top/Bottom ambient energy wash reflecting whose turn it is */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 h-16 transition-all duration-500 ${
          isOpponentActive
            ? 'top-0 bg-gradient-to-b from-rose-500/18 via-rose-500/5 to-transparent'
            : 'bottom-0 bg-gradient-to-t from-emerald-500/18 via-emerald-500/5 to-transparent'
        }`}
      />

      {/* 1. INTEGRATED TIERS CROWN */}
      <div className="relative z-10 w-full flex flex-col items-center gap-0.5">
        <div className="w-full flex items-center justify-between px-0.5 text-[8px] font-serif font-bold tracking-wider text-amber-300/90">
          <span>Tiers Liberados</span>
          <span className="font-mono tabular-nums text-stone-400">≤T{unlockedMaxTier}</span>
        </div>
        <div
          className={`relative w-full rounded-lg border px-1.5 py-0.5 flex items-center justify-evenly gap-0.5 shadow-inner transition-all duration-200 overflow-visible ${
            isTierUnlocking
              ? 'tier-box-unlock-glow border-emerald-400 bg-emerald-950/45'
              : 'border-amber-500/45 bg-black/65'
          }`}
        >
          {tierNumbers.map((t) => {
            const unlocked = isTierAllowedInRound(t, round);
            const isJustUnlocked = newlyUnlockedTier === t;
            return (
              <span
                key={t}
                className={`relative inline-flex items-center justify-center text-[11px] lg:text-xs font-mono font-black tabular-nums leading-none transition-colors duration-200 ${
                  isJustUnlocked
                    ? 'tier-unlock-pop text-emerald-300'
                    : unlocked
                    ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.65)]'
                    : 'text-red-500/80 opacity-80'
                }`}
                title={unlocked ? `Tier ${t}: Desbloqueado` : `Tier ${t}: Bloqueado na Rodada ${round}`}
              >
                {isJustUnlocked && (
                  <span
                    aria-hidden="true"
                    className="tier-unlock-ring absolute inset-[-4px] rounded-full border-2 border-emerald-300 pointer-events-none"
                  />
                )}
                {t}
              </span>
            );
          })}
        </div>
      </div>

      {/* 2. TOP DIRECTIONAL POINTER (OPPONENT SIDE) */}
      <div
        className={`relative z-10 w-full flex items-center justify-center gap-1 transition-all duration-300 ${
          isOpponentActive
            ? isDefendingPhase || hasPendingSpell
              ? 'text-amber-300 scale-105 drop-shadow-[0_0_8px_rgba(251,191,36,0.75)]'
              : 'text-rose-300 scale-105 drop-shadow-[0_0_8px_rgba(251,113,133,0.75)]'
            : 'text-stone-600 opacity-50'
        }`}
      >
        <svg
          width="10"
          height="7"
          viewBox="0 0 10 7"
          aria-hidden="true"
          className={`shrink-0 ${isOpponentActive ? 'animate-dial-pointer-up' : ''}`}
        >
          <path d="M5 0.5L9.5 6.5H0.5L5 0.5Z" fill="currentColor" />
        </svg>
        <span className="text-[9px] font-serif font-black uppercase tracking-widest leading-none whitespace-nowrap">
          Oponente
        </span>
        <svg
          width="10"
          height="7"
          viewBox="0 0 10 7"
          aria-hidden="true"
          className={`shrink-0 ${isOpponentActive ? 'animate-dial-pointer-up' : 'opacity-0'}`}
        >
          <path d="M5 0.5L9.5 6.5H0.5L5 0.5Z" fill="currentColor" />
        </svg>
      </div>

      {/* 3. SEGMENTED RELIC COIN DIAL (LIVING ASTROLABE CHRONOMETER) */}
      <button
        type="button"
        onClick={handleCoinTap}
        className="relative z-10 w-[114px] h-[114px] lg:w-[128px] lg:h-[128px] flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 rounded-full group"
        aria-label={`Rodada ${round}, ${
          isPostAttackFinalTurn ? 'Turno Extra Pós-Ataque' : `Turno ${roundTurnNumber}`
        }. ${bannerConfig.label}.`}
      >
        {/* Breathing ambient energy halo behind the coin */}
        <div
          aria-hidden="true"
          className={`absolute inset-1.5 rounded-full blur-md pointer-events-none animate-dial-breath transition-colors duration-300 ${
            freeActionHint
              ? 'bg-cyan-400/35'
              : isDefendingPhase || hasPendingSpell
              ? 'bg-amber-400/32'
              : isPostAttackFinalTurn
              ? 'bg-purple-500/38'
              : isPlayerActive
              ? 'bg-emerald-400/30'
              : 'bg-rose-500/30'
          }`}
        />

        {/* Reactive Turn-Shift Expanding Shockwave Ring */}
        {isTurnPulsing && (
          <div
            key={`turn-wave-${turnPulseKey}`}
            aria-hidden="true"
            className={`pointer-events-none absolute inset-3 rounded-full border-2 animate-dial-shockwave ${shockwaveBorderClass}`}
          />
        )}

        {/* Reactive Round-Change Solar Starburst Rays */}
        {(isRoundBursting || isSpinningNow) && (
          <div
            key={`round-burst-${roundBurstKey}-${manualCoinSpin ? 'm' : 'a'}`}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center animate-dial-solar-burst"
          >
            <div className="w-full h-full rounded-full border-2 border-amber-300/80 shadow-[0_0_28px_rgba(251,191,36,0.9)]" />
          </div>
        )}

        {/* SVG Precision Segmented Outer Coin Ring + Rotating Arcane Compass */}
        <svg
          viewBox="0 0 160 160"
          className="w-full h-full relative z-10 overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="relicCoinRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#d97706" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#fde047" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* Outer slowly revolving dashed arcane orbit ring */}
          <g className="animate-dial-orbit-slow origin-center" style={{ transformOrigin: '80px 80px' }}>
            <circle
              cx={CX}
              cy={CY}
              r="78.5"
              fill="none"
              stroke={activeArcColor}
              strokeOpacity="0.38"
              strokeWidth="1.2"
              strokeDasharray="6 9 2 9"
            />
            {/* Twin orbital comet sparks */}
            <circle cx={CX} cy={1.5} r="2.2" fill={activeArcColor} style={{ filter: activeArcGlow }} />
            <circle cx={CX} cy={158.5} r="1.6" fill="#fde047" opacity="0.8" />
          </g>

          {/* Metallic Coin Outer Lip & Recessed Track */}
          <circle
            cx={CX}
            cy={CY}
            r="75"
            fill="rgba(9,7,18,0.94)"
            stroke="url(#relicCoinRimGrad)"
            strokeWidth="2.1"
          />
          <circle
            cx={CX}
            cy={CY}
            r="71"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
          <circle
            cx={CX}
            cy={CY}
            r="51"
            fill="rgba(12,10,20,0.96)"
            stroke="rgba(251,191,36,0.52)"
            strokeWidth="1.5"
          />

          {/* Counter-rotating inner astrolabe micro-ticks */}
          <g className="animate-dial-orbit-reverse" style={{ transformOrigin: '80px 80px' }}>
            {COMPASS_TICKS.map((tick) => (
              <line
                key={tick.idx}
                x1={tick.inner.x}
                y1={tick.inner.y}
                x2={tick.outer.x}
                y2={tick.outer.y}
                stroke={tick.isCardinal ? activeArcColor : 'rgba(251,191,36,0.34)'}
                strokeWidth={tick.isCardinal ? '1.6' : '0.9'}
                strokeLinecap="round"
              />
            ))}
          </g>

          {/* Top & Bottom Cardinal Notch Markers (glow brightly for active player) */}
          <polygon
            points="80,1.5 85,8.5 75,8.5"
            fill={
              isOpponentActive
                ? isDefendingPhase || hasPendingSpell
                  ? '#fbbf24'
                  : '#fb7185'
                : 'rgba(120,113,108,0.4)'
            }
            style={
              isOpponentActive
                ? { filter: 'drop-shadow(0 0 6px rgba(251,113,133,0.95))' }
                : undefined
            }
          />
          <polygon
            points="80,158.5 85,151.5 75,151.5"
            fill={
              isPlayerActive
                ? isDefendingPhase || hasPendingSpell
                  ? '#fbbf24'
                  : '#34d399'
                : 'rgba(120,113,108,0.4)'
            }
            style={
              isPlayerActive
                ? { filter: 'drop-shadow(0 0 6px rgba(52,211,153,0.95))' }
                : undefined
            }
          />

          {/* 6 Segmented Turn Bars along the Coin Perimeter (T1..T5 + Extra) */}
          {TURN_SEGMENTS.map((seg) => {
            const isCurrent = seg.slot === activeSlot;
            const isCompleted = !seg.isExtra && seg.slot <= completedRegularLimit;
            const pathD = describeArcPath(CX, CY, RING_RADIUS, seg.startDeg, seg.endDeg);
            const midAngle = (seg.startDeg + seg.endDeg) / 2;
            const labelPos = polarToCartesian(CX, CY, RING_RADIUS, midAngle);

            const strokeColor = isCurrent
              ? activeArcColor
              : isCompleted
              ? '#b45309'
              : seg.isExtra
              ? 'rgba(88,28,135,0.48)'
              : 'rgba(41,37,36,0.95)';

            const textColor = isCurrent
              ? '#0c0a09'
              : isCompleted
              ? '#fef3c7'
              : seg.isExtra
              ? '#d8b4fe'
              : '#a8a29e';

            return (
              <g key={seg.slot}>
                <title>{seg.title}</title>
                {/* Crisp recessed channel underneath each bar */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="rgba(0,0,0,0.8)"
                  strokeWidth="15.5"
                  strokeLinecap="butt"
                />
                {/* Turn segment bar */}
                <path
                  key={isCurrent ? `active-seg-${turnPulseKey}` : `seg-${seg.slot}`}
                  d={pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isCurrent ? '14' : '12'}
                  strokeLinecap="butt"
                  className={isCurrent ? 'animate-dial-segment-ignite transition-all duration-300' : 'transition-all duration-300'}
                  style={isCurrent ? { filter: activeArcGlow, color: activeArcColor } : undefined}
                />
                {/* Animated flowing energy filament across the active turn segment */}
                {isCurrent && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="rgba(255,255,255,0.78)"
                    strokeWidth="2.4"
                    strokeDasharray="6 12"
                    strokeLinecap="round"
                    className="animate-dial-segment-flow"
                  />
                )}
                {/* Subtle inner gold highlight on completed bars */}
                {isCompleted && !isCurrent && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="rgba(254,243,199,0.42)"
                    strokeWidth="1.5"
                    strokeLinecap="butt"
                  />
                )}
                {/* Segment index digit (1..5 or E) */}
                <text
                  x={labelPos.x}
                  y={labelPos.y + 0.5}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={textColor}
                  fontSize="9"
                  fontWeight="900"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                >
                  {seg.shortLabel}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Central Spinning Coin Medallion: Total Round Number + Current Turn Sub-readout */}
        <div
          className={`absolute z-20 w-[66px] h-[66px] lg:w-[76px] lg:h-[76px] rounded-full border-2 border-amber-400/95 bg-gradient-to-br from-amber-900/65 via-stone-950 to-black shadow-[inset_0_0_14px_rgba(251,191,36,0.35),0_0_14px_rgba(0,0,0,0.92)] flex flex-col items-center justify-center [transform-style:preserve-3d] transition-transform duration-200 group-hover:scale-[1.05] overflow-hidden ${
            isSpinningNow ? 'round-coin-spin' : ''
          }`}
        >
          {/* Periodic metallic specular sheen sweeping across the gold medallion */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-7 bg-gradient-to-r from-transparent via-amber-200/35 to-transparent animate-dial-sheen"
          />
          {/* Fine inner engraved coin lip */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-[3px] rounded-full border border-amber-300/35"
          />
          <span className="relative z-10 text-[7px] lg:text-[8px] font-serif font-bold uppercase tracking-[0.16em] text-amber-300/95 leading-none">
            Rodada
          </span>
          <span
            key={`round-num-${round}`}
            className="relative z-10 text-xl lg:text-2xl font-mono font-black tabular-nums text-amber-100 leading-none my-0.5 drop-shadow-[0_1px_10px_rgba(251,191,36,0.6)] animate-dial-round-pop"
          >
            {round}
          </span>
          <span
            key={`turn-chip-${turnPulseKey}`}
            className={`relative z-10 text-[8px] lg:text-[9px] font-mono font-black tabular-nums leading-none tracking-wider animate-dial-turn-pop ${
              freeActionHint
                ? 'text-cyan-300'
                : isPostAttackFinalTurn
                ? 'text-purple-300'
                : isPlayerActive
                ? 'text-emerald-300'
                : 'text-rose-300'
            }`}
          >
            {isPostAttackFinalTurn ? 'EXTRA' : `T${roundTurnNumber}`}
          </span>
        </div>
      </button>

      {/* 4. BOTTOM DIRECTIONAL POINTER (PLAYER SIDE) */}
      <div
        className={`relative z-10 w-full flex items-center justify-center gap-1 transition-all duration-300 ${
          isPlayerActive
            ? isDefendingPhase || hasPendingSpell
              ? 'text-amber-300 scale-105 drop-shadow-[0_0_8px_rgba(251,191,36,0.75)]'
              : 'text-emerald-300 scale-105 drop-shadow-[0_0_8px_rgba(52,211,153,0.75)]'
            : 'text-stone-600 opacity-50'
        }`}
      >
        <svg
          width="10"
          height="7"
          viewBox="0 0 10 7"
          aria-hidden="true"
          className={`shrink-0 ${isPlayerActive ? 'animate-dial-pointer-down' : ''}`}
        >
          <path d="M5 6.5L0.5 0.5H9.5L5 6.5Z" fill="currentColor" />
        </svg>
        <span className="text-[9px] font-serif font-black uppercase tracking-widest leading-none whitespace-nowrap">
          Você
        </span>
        <svg
          width="10"
          height="7"
          viewBox="0 0 10 7"
          aria-hidden="true"
          className={`shrink-0 ${isPlayerActive ? 'animate-dial-pointer-down' : 'opacity-0'}`}
        >
          <path d="M5 6.5L0.5 0.5H9.5L5 6.5Z" fill="currentColor" />
        </svg>
      </div>

      {/* 5. HIGH-CONTRAST ACTIVE TURN BANNER WITH METALLIC SHIMMER */}
      <div
        key={`banner-${turnPulseKey}`}
        className={`relative z-10 w-full rounded-lg border px-2 py-1 flex items-center justify-center gap-1.5 transition-colors duration-200 overflow-hidden animate-dial-turn-pop ${bannerConfig.boxClass}`}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-dial-sheen"
        />
        {bannerConfig.icon}
        <span className="relative z-10 text-[10px] lg:text-[11px] font-serif font-black uppercase tracking-wider truncate">
          {bannerConfig.label}
        </span>
      </div>

      {/* Quiet metadata line: Current turn + Attacker consecutive passes (0..2) */}
      <div
        className="relative z-10 w-full flex items-center justify-between px-1 text-[9px] font-mono text-stone-300 tabular-nums"
        title="Passes consecutivos do Atacante sem ação obrigatória (2 passes encerram a rodada)"
      >
        <span className="truncate">
          {isPostAttackFinalTurn ? 'Turno Extra' : `Turno ${roundTurnNumber}`}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-stone-400">Atq {attackerConsecutivePasses}/2</span>
          <div className="flex items-center gap-0.5">
            {[0, 1].map((passIdx) => (
              <span
                key={passIdx}
                className={`w-2.5 h-1.5 rounded-xs transition-all duration-300 ${
                  attackerConsecutivePasses > passIdx
                    ? 'bg-rose-400 shadow-[0_0_6px_#fb7185] scale-110'
                    : 'bg-stone-800 border border-stone-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 6. CONDITIONAL WARNINGS (PASS ENDS ROUND / FREE ACTION HINT) */}
      {willPassEndRound && (
        <div className="relative z-10 w-full px-1.5 py-0.5 rounded-md bg-rose-950/90 border border-rose-400/80 text-[9px] font-bold text-rose-200 text-center animate-dial-danger-pulse">
          Passar encerra a rodada
        </div>
      )}

      {freeActionHint && (
        <div
          className="relative z-10 w-full px-1.5 py-0.5 rounded-md bg-cyan-950/85 border border-cyan-400/65 text-[9px] font-semibold text-cyan-200 text-center truncate shadow-[0_0_12px_rgba(34,211,238,0.28)]"
          title={freeActionHint}
        >
          {freeActionHint}
        </div>
      )}

      {/* 7. TESTING ARENA CONTROLS (COMPACT 2-COLUMN ROW) */}
      {isTestingArena && (
        <div className="relative z-10 w-full grid grid-cols-2 gap-1 pt-0.5">
          <button
            type="button"
            onClick={onTestingNextRound}
            className="py-1 px-1.5 rounded-lg bg-stone-900/95 hover:bg-stone-800 border border-amber-500/45 hover:border-amber-300 text-amber-200 font-serif font-bold text-[9px] uppercase tracking-wide flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
            title="Avançar manualmente para a próxima rodada"
          >
            <FastForward size={10} className="text-amber-400 shrink-0" />
            <span>+1 Rod.</span>
          </button>
          <button
            type="button"
            onClick={onTestingSwapTurn}
            className="py-1 px-1.5 rounded-lg bg-stone-900/95 hover:bg-stone-800 border border-amber-500/45 hover:border-amber-300 text-amber-200 font-serif font-bold text-[9px] uppercase tracking-wide flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
            title="Trocar imediatamente o turno ativo entre Você e a IA Controlável"
          >
            <RotateCw size={10} className="text-amber-400 shrink-0" />
            <span>Turno</span>
          </button>
        </div>
      )}
    </div>
  );
};
