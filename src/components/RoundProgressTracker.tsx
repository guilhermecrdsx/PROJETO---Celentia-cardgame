import React from 'react';
import { Swords, Shield, Flame, Flag, Sparkles } from 'lucide-react';

interface RoundProgressTrackerProps {
  round: number;
  roundTurnNumber: number;
  attackerRole: 'player' | 'opponent';
  turnPlayer: 'player' | 'opponent';
  playerName: string;
  opponentName: string;
  attackerConsecutivePasses: number;
  hasAttackedThisRound: boolean;
  isDefendingPhase: boolean;
  isAttackTransitioning: boolean;
  hasPendingSpell: boolean;
  isCombatResolving: boolean;
  isPostAttackFinalTurn: boolean;
  isMobileView: boolean;
}

export const RoundProgressTracker: React.FC<RoundProgressTrackerProps> = ({
  round,
  roundTurnNumber,
  attackerRole,
  turnPlayer,
  playerName,
  opponentName,
  attackerConsecutivePasses,
  hasAttackedThisRound,
  isDefendingPhase,
  isAttackTransitioning,
  hasPendingSpell,
  isCombatResolving,
  isPostAttackFinalTurn,
  isMobileView,
}) => {
  const maxTier =
    round >= 10 ? 6 : round >= 9 ? 5 : round >= 7 ? 4 : round >= 5 ? 3 : round >= 3 ? 2 : 1;

  const attackerName = attackerRole === 'player' ? playerName : opponentName;
  const defenderName = attackerRole === 'player' ? opponentName : playerName;

  const isAttackerTurn = turnPlayer === attackerRole;
  const isCombatStage = isDefendingPhase || isAttackTransitioning || isCombatResolving;
  const willPassEndRound =
    !isCombatStage &&
    !hasPendingSpell &&
    (isPostAttackFinalTurn || (isAttackerTurn && attackerConsecutivePasses >= 1));

  const activeName = turnPlayer === 'player' ? playerName : opponentName;
  const turnBadgeText = isPostAttackFinalTurn ? 'Extra' : `T${roundTurnNumber}`;
  const nextLabel = isCombatStage
    ? isDefendingPhase
      ? 'Resolução'
      : 'Turno Extra Def.'
    : hasPendingSpell
    ? 'Resolver Magia'
    : willPassEndRound
    ? 'Passar = Fim'
    : isAttackerTurn
    ? defenderName
    : attackerName;

  const stages = [
    {
      id: 'attacker',
      shortLabel: 'Atq',
      label: attackerName,
      icon: <Swords size={isMobileView ? 10 : 12} />,
      isCurrent: !isCombatStage && !hasPendingSpell && isAttackerTurn,
      isNext: !isCombatStage && !hasPendingSpell && !isAttackerTurn && !isPostAttackFinalTurn,
      isDone: hasAttackedThisRound && !isAttackerTurn && !isCombatStage,
      accentActive:
        'bg-rose-500/25 border-rose-400 text-rose-100 shadow-[0_0_12px_rgba(244,63,94,0.45)]',
      accentIdle: 'bg-stone-900/90 border-stone-700/80 text-stone-400',
    },
    {
      id: 'defender',
      shortLabel: isPostAttackFinalTurn ? 'Extra' : 'Def',
      label: isPostAttackFinalTurn ? `${defenderName} (Extra)` : defenderName,
      icon: <Shield size={isMobileView ? 10 : 12} />,
      isCurrent: !isCombatStage && !hasPendingSpell && !isAttackerTurn,
      isNext: !isCombatStage && !hasPendingSpell && isAttackerTurn && !willPassEndRound,
      isDone: false,
      accentActive: isPostAttackFinalTurn
        ? 'bg-purple-500/30 border-purple-400 text-purple-100 shadow-[0_0_12px_rgba(168,85,247,0.5)]'
        : 'bg-sky-500/25 border-sky-400 text-sky-100 shadow-[0_0_12px_rgba(56,189,248,0.45)]',
      accentIdle: 'bg-stone-900/90 border-stone-700/80 text-stone-400',
    },
    {
      id: 'combat',
      shortLabel: 'Comb.',
      label: isDefendingPhase ? 'Defesa' : hasPendingSpell ? 'Resposta' : 'Combate',
      icon: hasPendingSpell ? (
        <Sparkles size={isMobileView ? 10 : 12} />
      ) : (
        <Flame size={isMobileView ? 10 : 12} />
      ),
      isCurrent: isCombatStage || hasPendingSpell,
      isNext: false,
      isDone: hasAttackedThisRound && !isCombatStage,
      accentActive:
        'bg-amber-500/30 border-amber-300 text-amber-100 shadow-[0_0_14px_rgba(245,158,11,0.55)]',
      accentIdle: hasAttackedThisRound
        ? 'bg-emerald-950/60 border-emerald-500/45 text-emerald-300'
        : 'bg-stone-900/90 border-stone-700/80 text-stone-500',
    },
    {
      id: 'end',
      shortLabel: willPassEndRound ? 'Fim!' : 'Fim',
      label: willPassEndRound
        ? 'Passar = Fim'
        : attackerConsecutivePasses >= 1
        ? 'Atq 1/2'
        : 'Fim Rodada',
      icon: <Flag size={isMobileView ? 10 : 12} />,
      isCurrent: willPassEndRound,
      isNext: willPassEndRound,
      isDone: false,
      accentActive:
        'bg-rose-500/25 border-rose-400 text-rose-100 shadow-[0_0_12px_rgba(244,63,94,0.5)] animate-pulse',
      accentIdle:
        attackerConsecutivePasses >= 1
          ? 'bg-amber-950/50 border-amber-500/45 text-amber-300'
          : 'bg-stone-900/90 border-stone-800 text-stone-500',
    },
  ];

  return (
    <div
      className={`flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-stone-950/90 border shadow-[inset_0_0_16px_rgba(0,0,0,0.85)] ${
        willPassEndRound ? 'border-rose-400/60' : 'border-amber-500/35'
      } ${isMobileView ? 'px-2 py-0.5' : 'px-3 py-1'}`}
      title={`Rodada ${round} · ${isPostAttackFinalTurn ? 'Turno Extra Pós-Ataque' : `Turno ${roundTurnNumber}`} (Tier até ${maxTier}) · Vez atual: ${activeName}${willPassEndRound ? ' · ATENÇÃO: Passar a vez encerra a rodada!' : ` · Próximo: ${nextLabel}`}`}
    >
      {/* Round, Turn & Tier Badge */}
      <div className="flex items-center gap-1 pr-1.5 sm:pr-2 border-r border-stone-800 shrink-0">
        <span className="font-serif font-black text-amber-300 text-[10px] sm:text-xs tracking-wider tabular-nums whitespace-nowrap">
          R{round}
        </span>
        <span
          className={`text-[9px] sm:text-[10px] font-mono font-bold px-1 py-0.2 rounded tabular-nums whitespace-nowrap ${
            isPostAttackFinalTurn
              ? 'bg-purple-500/25 text-purple-200 border border-purple-400/40'
              : 'bg-amber-500/15 text-amber-200 border border-amber-500/30'
          }`}
        >
          {turnBadgeText}
        </span>
        <span className="text-[9px] sm:text-[10px] font-mono text-stone-400 tabular-nums whitespace-nowrap">
          ≤T{maxTier}
        </span>
      </div>

      {/* Connected Stage Nodes */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        {stages.map((stage, idx) => (
          <React.Fragment key={stage.id}>
            <div
              className={`relative flex items-center gap-1 rounded-lg border transition-all duration-200 whitespace-nowrap ${
                isMobileView ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
              } ${stage.isCurrent ? `${stage.accentActive} font-black` : `${stage.accentIdle} font-medium`}`}
            >
              {stage.icon}
              <span className="max-w-[74px] sm:max-w-[92px] truncate">
                {isMobileView ? stage.shortLabel : stage.label}
              </span>
              {stage.isCurrent && !isMobileView && stage.id !== 'end' && (
                <span className="text-[8px] font-mono uppercase tracking-wider text-amber-300/95 ml-0.5">
                  · Agora
                </span>
              )}
              {!stage.isCurrent && stage.isNext && !isMobileView && stage.id !== 'end' && (
                <span className="text-[8px] font-mono uppercase tracking-wider text-stone-400 ml-0.5">
                  · Próx.
                </span>
              )}
            </div>

            {idx < stages.length - 1 && (
              <div
                className={`h-[2px] rounded-full transition-colors ${
                  isMobileView ? 'w-1.5' : 'w-2.5'
                } ${stage.isCurrent || stage.isDone ? 'bg-amber-400/70' : 'bg-stone-800'}`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Compact Next-Up readout on desktop */}
      {!isMobileView && (
        <div className="hidden xl:flex items-center gap-1.5 pl-2 border-l border-stone-800 text-[10px] text-stone-400 whitespace-nowrap shrink-0">
          <span>Vez:</span>
          <span className={`font-bold ${turnPlayer === 'player' ? 'text-cyan-300' : 'text-rose-300'}`}>
            {activeName}
          </span>
          <span aria-hidden="true">→</span>
          <span className={`font-semibold ${willPassEndRound ? 'text-rose-300' : 'text-amber-300/90'}`}>
            {nextLabel}
          </span>
        </div>
      )}
    </div>
  );
};
