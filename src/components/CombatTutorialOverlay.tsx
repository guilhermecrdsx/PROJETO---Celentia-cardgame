import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Sparkles,
  BookOpen,
  Swords,
  Shield,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  GraduationCap,
  Heart,
  Zap,
  Compass,
  Clock,
  Coins,
  X,
  Eye,
  EyeOff,
  SkipForward,
  Hand,
  RotateCcw,
} from 'lucide-react';
import { sound } from '../services/soundEffects';

export type TutorialStepId =
  | 'step_1_dial'
  | 'step_1_2_role'
  | 'step_1_3_coin'
  | 'step_2_deck'
  | 'step_3_hand'
  | 'step_4_board'
  | 'step_5_hp'
  | 'step_6_orb'
  | 'step_7_finish';

export interface CombatTutorialOverlayProps {
  isActive: boolean;
  mode: 'tutorial' | 'guided_pvia';
  round: number;
  turnPlayer: 'player' | 'opponent';
  attackerRole: 'player' | 'opponent';
  playerBoardCount: number;
  opponentBoardCount: number;
  selectedAttackerCount: number;
  isDefendingPhase: boolean;
  assignedBlocksCount: number;
  isCombatAnimating: boolean;
  hasPlayerAttackedThisRound: boolean;
  summonsThisRound: number;
  maxAllowedSummons: number;
  hasPlayableUnitInHand: boolean;
  hasPlayableSkillInHand: boolean;
  canDeclareAttackNow: boolean;
  willPassEndRound: boolean;
  isPostAttackFinalTurn: boolean;
  attackerConsecutivePasses: number;
  turnTimeLeft: number;
  playerOrbActionCount: number;
  playerDefenseCompletedCount: number;
  playerAttackCompletedCount: number;
  opponentHp: number;
  playerHp: number;
  winner: 'player' | 'opponent' | 'draw' | null;
  onDismissGuided?: () => void;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const TUTORIAL_STEP_ORDER: TutorialStepId[] = [
  'step_1_dial',
  'step_1_2_role',
  'step_1_3_coin',
  'step_2_deck',
  'step_3_hand',
  'step_4_board',
  'step_5_hp',
  'step_6_orb',
  'step_7_finish',
];

const TUTORIAL_STEP_LABEL: Record<TutorialStepId, string> = {
  step_1_dial: 'Passo 1 de 7',
  step_1_2_role: 'Passo 1.2 de 7',
  step_1_3_coin: 'Passo 1.3 de 7',
  step_2_deck: 'Passo 2 de 7',
  step_3_hand: 'Passo 3 de 7',
  step_4_board: 'Passo 4 de 7',
  step_5_hp: 'Passo 5 de 7',
  step_6_orb: 'Passo 6 de 7',
  step_7_finish: 'Passo 7 de 7',
};

function findVisibleTargetElement(selector: string | null): HTMLElement | null {
  if (!selector) return null;
  const parts = selector
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const part of parts) {
    const matches = Array.from(document.querySelectorAll(part)) as HTMLElement[];
    for (const el of matches) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 4 && rect.height > 4) {
        return el;
      }
    }
  }
  return null;
}

export const CombatTutorialOverlay: React.FC<CombatTutorialOverlayProps> = ({
  isActive,
  mode,
  round,
  turnPlayer,
  attackerRole,
  playerBoardCount,
  selectedAttackerCount,
  isDefendingPhase,
  assignedBlocksCount,
  isCombatAnimating,
  hasPlayerAttackedThisRound,
  summonsThisRound,
  maxAllowedSummons,
  hasPlayableUnitInHand,
  hasPlayableSkillInHand,
  canDeclareAttackNow,
  willPassEndRound,
  isPostAttackFinalTurn,
  attackerConsecutivePasses,
  turnTimeLeft,
  playerOrbActionCount,
  playerDefenseCompletedCount,
  playerAttackCompletedCount,
  opponentHp,
  winner,
  onDismissGuided,
}) => {
  // Separate real mandatory progress from the currently viewed step (allows re-reading earlier steps freely without repeating actions)
  const [progressStep, setProgressStep] = useState<TutorialStepId>('step_1_dial');
  const [viewingStep, setViewingStep] = useState<TutorialStepId>('step_1_dial');
  const [expandedDetail, setExpandedDetail] = useState<boolean>(false);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [guidedMinimized, setGuidedMinimized] = useState<boolean>(false);
  const [guidedSpotlightOn, setGuidedSpotlightOn] = useState<boolean>(true);
  const [step6EntryOrbCount, setStep6EntryOrbCount] = useState<number>(0);

  const prevViewingStepRef = useRef<TutorialStepId>(viewingStep);
  const prevProgressStepRef = useRef<TutorialStepId>(progressStep);

  const progressIndex = TUTORIAL_STEP_ORDER.indexOf(progressStep);
  const viewingIndex = TUTORIAL_STEP_ORDER.indexOf(viewingStep);
  const isReviewingPastStep = viewingIndex < progressIndex;

  // Collapse expandable rule drawer when switching viewed step
  useEffect(() => {
    if (prevViewingStepRef.current !== viewingStep) {
      prevViewingStepRef.current = viewingStep;
      setExpandedDetail(false);
    }
  }, [viewingStep]);

  // Capture orb action baseline when reaching Step 6
  useEffect(() => {
    if (prevProgressStepRef.current !== progressStep) {
      prevProgressStepRef.current = progressStep;
      if (progressStep === 'step_6_orb') {
        setStep6EntryOrbCount(playerOrbActionCount);
      }
    }
  }, [progressStep, playerOrbActionCount]);

  // Mandatory automatic progression for interactive steps in Tutorial mode
  useEffect(() => {
    if (!isActive || mode !== 'tutorial' || winner) return;

    // Step 3 (Hand): MUST summon at least 1 unit onto the table
    if (progressStep === 'step_3_hand' && playerBoardCount >= 1) {
      sound.playDraw();
      setProgressStep('step_4_board');
      setViewingStep('step_4_board');
      return;
    }

    // Step 4 (Board — Attack & Defense simulation):
    // Requires completing 1 real attack AND 1 real defense (or reaching Round 3 after attacking)
    if (progressStep === 'step_4_board') {
      const attacked = playerAttackCompletedCount >= 1;
      const defended = playerDefenseCompletedCount >= 1 || (attacked && round >= 3);
      if (attacked && defended && !isCombatAnimating && !isDefendingPhase) {
        sound.playDraw();
        setProgressStep('step_5_hp');
        setViewingStep('step_5_hp');
        return;
      }
    }

    // Step 6 (Action Orb / Pass Turn): MUST press the Action Orb once on your turn
    if (progressStep === 'step_6_orb' && playerOrbActionCount > step6EntryOrbCount) {
      sound.playDraw();
      setProgressStep('step_7_finish');
      setViewingStep('step_7_finish');
    }
  }, [
    isActive,
    mode,
    winner,
    progressStep,
    playerBoardCount,
    playerAttackCompletedCount,
    playerDefenseCompletedCount,
    round,
    isCombatAnimating,
    isDefendingPhase,
    playerOrbActionCount,
    step6EntryOrbCount,
  ]);

  // Compute Guided PvIA recommendation dynamically
  const guidedHint = (() => {
    if (mode !== 'guided_pvia') return null;

    if (winner) {
      return {
        title: 'Partida Encerrada',
        body: 'Confira o resultado da partida contra a IA!',
        targetSelector: null as string | null,
        urgency: 'neutral' as 'neutral' | 'action' | 'danger' | 'timer',
        badge: 'Modo Guiado',
      };
    }

    if (isCombatAnimating) {
      return {
        title: 'Resolvendo Combate',
        body: 'Acompanhe os choques das cartas na mesa e os efeitos desencadeados.',
        targetSelector: '[data-tutorial-target="player-board"]',
        urgency: 'neutral' as const,
        badge: 'Combate em Curso',
      };
    }

    if (isDefendingPhase) {
      if (assignedBlocksCount === 0 && playerBoardCount > 0) {
        return {
          title: 'Defesa Necessária! Bloqueie o Ataque',
          body: 'Clique em uma unidade sua na mesa e depois no atacante inimigo para bloquear. Confirmar DEFENDER sem bloqueadores causa 1 de dano direto à sua Vida por atacante livre!',
          targetSelector: '[data-tutorial-target="player-board"]',
          urgency: 'danger' as const,
          badge: 'Fase de Defesa',
        };
      }
      if (playerBoardCount === 0) {
        return {
          title: 'Sem Unidades para Bloquear',
          body: 'Você não tem unidades em campo. Clique em DEFENDER no botão central para receber o impacto e avançar.',
          targetSelector: '[data-tutorial-target="action-orb"]',
          urgency: 'danger' as const,
          badge: 'Confirmar Defesa',
        };
      }
      return {
        title: 'Confirme sua Defesa',
        body: `Você já posicionou ${assignedBlocksCount} bloqueador(es). Clique no botão DEFENDER para resolver o combate!`,
        targetSelector: '[data-tutorial-target="action-orb"]',
        urgency: 'action' as const,
        badge: 'Confirmar Bloqueio',
      };
    }

    if (turnPlayer !== 'player') {
      return {
        title: 'Turno do Oponente',
        body: 'Aguarde a jogada da IA. Observe a borda iluminada no lado superior da mesa e prepare sua resposta.',
        targetSelector: null as string | null,
        urgency: 'neutral' as const,
        badge: 'Aguardando IA',
      };
    }

    // Player's turn!
    const timerWarning = turnTimeLeft > 0 && turnTimeLeft <= 10;

    if (selectedAttackerCount > 0) {
      return {
        title: timerWarning ? `Tempo Curto (${turnTimeLeft}s)! Confirme o Ataque` : 'Confirmar Ataque Agora',
        body: `${selectedAttackerCount} unidade(s) pronta(s) para atacar. Pressione o botão ATACAR no centro para iniciar o confronto.`,
        targetSelector: '[data-tutorial-target="action-orb"]',
        urgency: timerWarning ? ('timer' as const) : ('action' as const),
        badge: timerWarning ? `Relógio: ${turnTimeLeft}s` : 'Confirmar Ataque',
      };
    }

    if (summonsThisRound < maxAllowedSummons && hasPlayableUnitInHand) {
      const remaining = Math.max(1, maxAllowedSummons - summonsThisRound);
      return {
        title: timerWarning
          ? `Atenção ao Contador (${turnTimeLeft}s)! Invoque uma Unidade`
          : 'Invoque uma Unidade da sua Mão',
        body: `Você ainda pode invocar ${remaining} unidade(s) nesta rodada. Passe o mouse sobre uma carta na mão para ver o efeito e clique (ou arraste) para colocá-la na mesa.`,
        targetSelector: '[data-hand-zone="player"]',
        urgency: timerWarning ? ('timer' as const) : ('action' as const),
        badge: timerWarning ? `Relógio: ${turnTimeLeft}s` : `Invocações: ${summonsThisRound}/${maxAllowedSummons}`,
      };
    }

    if (attackerRole === 'player' && !hasPlayerAttackedThisRound && canDeclareAttackNow) {
      return {
        title: timerWarning ? `Tempo (${turnTimeLeft}s)! Declare seu Ataque` : 'Hora de Atacar!',
        body: 'Você é o Atacante desta rodada e tem unidades prontas na mesa. Clique em suas cartas aliadas para selecioná-las e depois pressione ATACAR.',
        targetSelector: '[data-tutorial-target="player-board"]',
        urgency: timerWarning ? ('timer' as const) : ('action' as const),
        badge: timerWarning ? `Relógio: ${turnTimeLeft}s` : 'Atacante da Rodada',
      };
    }

    if (hasPlayableSkillInHand) {
      return {
        title: timerWarning ? `Relógio (${turnTimeLeft}s)! Habilidade Disponível` : 'Você tem uma Habilidade Jogável',
        body: 'Habilidades não gastam seu limite de invocações. Use uma Habilidade da sua mão se fizer sentido tático — ou passe a vez para economizá-la.',
        targetSelector: '[data-hand-zone="player"]',
        urgency: timerWarning ? ('timer' as const) : ('action' as const),
        badge: timerWarning ? `Relógio: ${turnTimeLeft}s` : 'Habilidade Pronta',
      };
    }

    // No playable action left — instruct player to Pass Turn!
    return {
      title: timerWarning ? `Relógio (${turnTimeLeft}s)! Passe a Vez Agora` : 'Sem Ações Disponíveis — Passe a Vez',
      body: isPostAttackFinalTurn
        ? 'Este é o Turno Extra Pós-Ataque e não há mais jogadas disponíveis. Clique em PASSAR A VEZ para encerrar a rodada.'
        : willPassEndRound
        ? 'Você não tem ações restantes. Como já passou 1 vez como Atacante (1/2), clicar em PASSAR A VEZ agora encerrará a rodada (2/2).'
        : 'Você não tem cartas jogáveis ou ataques disponíveis neste turno. Clique simplesmente em PASSAR A VEZ no botão central.',
      targetSelector: '[data-tutorial-target="action-orb"]',
      urgency: timerWarning ? ('timer' as const) : ('action' as const),
      badge: timerWarning ? `Relógio: ${turnTimeLeft}s` : 'Passar a Vez',
    };
  })();

  // Determine active DOM selector to spotlight based on viewingStep
  const currentTargetSelector: string | null = (() => {
    if (!isActive || winner) return null;

    if (mode === 'guided_pvia') {
      if (guidedMinimized || !guidedSpotlightOn) return null;
      return guidedHint?.targetSelector ?? null;
    }

    // Tutorial mode
    switch (viewingStep) {
      case 'step_1_dial':
        return '[data-tutorial-target="round-dial-core"], [data-tutorial-target="round-dial"]';
      case 'step_1_2_role':
        return '[data-tutorial-target="role-crest"], [data-tutorial-target="round-dial"]';
      case 'step_1_3_coin':
        return '[data-tutorial-target="magic-coin"], [data-tutorial-target="role-crest"], [data-tutorial-target="round-dial"]';
      case 'step_2_deck':
        return '[data-deck-zone="player"]';
      case 'step_3_hand':
        return '[data-hand-zone="player"]';
      case 'step_4_board': {
        if (isReviewingPastStep) {
          return '[data-tutorial-target="player-board"]';
        }
        if (isDefendingPhase) {
          return assignedBlocksCount > 0 || playerBoardCount === 0
            ? '[data-tutorial-target="action-orb"]'
            : '[data-tutorial-target="player-board"]';
        }
        if (playerAttackCompletedCount === 0) {
          return selectedAttackerCount > 0
            ? '[data-tutorial-target="action-orb"]'
            : '[data-tutorial-target="player-board"]';
        }
        return turnPlayer === 'player' ? '[data-tutorial-target="action-orb"]' : null;
      }
      case 'step_5_hp':
        return '[data-hp-bar="player"]';
      case 'step_6_orb':
        return '[data-tutorial-target="action-orb"]';
      case 'step_7_finish':
        return null;
      default:
        return null;
    }
  })();

  // Measure target element continuously for crisp spotlight tracking
  const measureSpotlight = useCallback(() => {
    if (!isActive || !currentTargetSelector) {
      setSpotlightRect(null);
      return;
    }
    const targetEl = findVisibleTargetElement(currentTargetSelector);
    if (!targetEl) {
      setSpotlightRect(null);
      return;
    }
    const rect = targetEl.getBoundingClientRect();
    const pad = 8;
    setSpotlightRect({
      top: Math.max(4, rect.top - pad),
      left: Math.max(4, rect.left - pad),
      width: Math.min(window.innerWidth - 8, rect.width + pad * 2),
      height: Math.min(window.innerHeight - 8, rect.height + pad * 2),
    });
  }, [isActive, currentTargetSelector]);

  useEffect(() => {
    if (!isActive) return;
    measureSpotlight();
    const timer = window.setInterval(measureSpotlight, 260);
    window.addEventListener('resize', measureSpotlight);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('resize', measureSpotlight);
    };
  }, [isActive, measureSpotlight]);

  if (!isActive || winner) return null;

  // =========================================================================
  // RENDER MODE 2: GUIDED PvIA (Skippable & Closable Tactical Coach)
  // =========================================================================
  if (mode === 'guided_pvia' && guidedHint) {
    const borderColor =
      guidedHint.urgency === 'timer'
        ? 'border-rose-400/90 shadow-[0_0_28px_rgba(244,63,94,0.45)]'
        : guidedHint.urgency === 'danger'
        ? 'border-amber-400/90 shadow-[0_0_28px_rgba(245,158,11,0.4)]'
        : guidedHint.urgency === 'action'
        ? 'border-emerald-400/80 shadow-[0_0_26px_rgba(16,185,129,0.35)]'
        : 'border-sky-400/55 shadow-[0_0_20px_rgba(56,189,248,0.22)]';

    const spotlightBorderColor =
      guidedHint.urgency === 'timer'
        ? 'border-rose-400 shadow-[0_0_0_9999px_rgba(2,6,23,0.42),0_0_28px_rgba(244,63,94,0.75)]'
        : guidedHint.urgency === 'danger'
        ? 'border-amber-400 shadow-[0_0_0_9999px_rgba(2,6,23,0.42),0_0_28px_rgba(245,158,11,0.75)]'
        : 'border-emerald-400 shadow-[0_0_0_9999px_rgba(2,6,23,0.42),0_0_28px_rgba(16,185,129,0.72)]';

    return (
      <>
        {spotlightRect && !guidedMinimized && guidedSpotlightOn && (
          <div
            aria-hidden="true"
            className={`fixed z-[88] pointer-events-none rounded-2xl border-2 transition-all duration-300 ease-out ${spotlightBorderColor}`}
            style={{
              top: spotlightRect.top,
              left: spotlightRect.left,
              width: spotlightRect.width,
              height: spotlightRect.height,
            }}
          />
        )}

        <div className="fixed top-14 right-2 sm:right-4 z-[95] pointer-events-none max-w-[330px] sm:max-w-[360px] w-[calc(100vw-1rem)]">
          {guidedMinimized ? (
            <div className="pointer-events-auto flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => {
                  sound.playDraw();
                  setGuidedMinimized(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/95 border border-emerald-400/70 text-emerald-200 text-xs font-serif font-bold shadow-xl cursor-pointer hover:bg-emerald-950/80 transition-colors"
              >
                <Compass size={14} className="text-emerald-300" />
                <span>Abrir Guia PvIA</span>
              </button>
              {onDismissGuided && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playDraw();
                    onDismissGuided();
                  }}
                  className="p-1.5 rounded-xl bg-stone-950/95 border border-stone-700 text-stone-400 hover:text-white cursor-pointer"
                  title="Fechar Modo Guiado"
                  aria-label="Fechar Modo Guiado"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ) : (
            <div
              className={`pointer-events-auto rounded-2xl border bg-gradient-to-br from-[#08131d]/96 via-[#0a0f1c]/96 to-[#050811]/97 p-3 sm:p-3.5 text-stone-100 ${borderColor}`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  {guidedHint.urgency === 'timer' ? (
                    <Clock size={14} className="text-rose-400 shrink-0 animate-pulse" />
                  ) : guidedHint.urgency === 'danger' ? (
                    <ShieldAlert size={14} className="text-amber-300 shrink-0" />
                  ) : (
                    <Compass size={14} className="text-emerald-300 shrink-0" />
                  )}
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-300 truncate">
                    Modo Guiado · {guidedHint.badge}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setGuidedSpotlightOn((v) => !v)}
                    className="p-1 rounded-lg bg-stone-900/90 hover:bg-stone-800 border border-stone-700/80 text-stone-300 hover:text-emerald-200 cursor-pointer"
                    title={guidedSpotlightOn ? 'Ocultar destaque visual' : 'Mostrar destaque visual'}
                    aria-label="Alternar destaque visual"
                  >
                    {guidedSpotlightOn ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuidedMinimized(true)}
                    className="px-1.5 py-0.5 rounded-lg bg-stone-900/90 hover:bg-stone-800 border border-stone-700/80 text-[10px] text-stone-300 hover:text-white cursor-pointer"
                    title="Minimizar guia"
                  >
                    Minimizar
                  </button>
                  {onDismissGuided && (
                    <button
                      type="button"
                      onClick={() => {
                        sound.playDraw();
                        onDismissGuided();
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-950/75 hover:bg-rose-900/90 border border-rose-500/50 text-[10px] font-bold text-rose-200 cursor-pointer"
                      title="Pular e fechar Modo Guiado"
                    >
                      <SkipForward size={11} />
                      <span>Fechar</span>
                    </button>
                  )}
                </div>
              </div>

              <h4 className="text-xs sm:text-sm font-serif font-black text-amber-100 leading-snug">
                {guidedHint.title}
              </h4>
              <p className="mt-1 text-[11px] sm:text-xs text-stone-300 leading-relaxed">
                {guidedHint.body}
              </p>

              <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-stone-400 tabular-nums">
                <span>
                  R{round} · {attackerRole === 'player' ? 'Atacante' : 'Defensor'}
                </span>
                <span className={turnTimeLeft <= 10 && turnPlayer === 'player' ? 'text-rose-300 font-bold' : 'text-stone-400'}>
                  Tempo: {turnTimeLeft}s · Invoc.: {summonsThisRound}/{maxAllowedSummons}
                </span>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  // =========================================================================
  // RENDER MODE 1: MANDATORY INTERACTIVE TUTORIAL (CRISP FOCUS + RE-READ NAV)
  // =========================================================================
  const progressPct = Math.round(((progressIndex + 1) / TUTORIAL_STEP_ORDER.length) * 100);

  const handleGoBack = () => {
    if (viewingIndex <= 0) return;
    sound.playDraw();
    setViewingStep(TUTORIAL_STEP_ORDER[viewingIndex - 1]);
  };

  const handleStepForwardInReview = () => {
    if (viewingIndex >= progressIndex) return;
    sound.playDraw();
    setViewingStep(TUTORIAL_STEP_ORDER[viewingIndex + 1]);
  };

  const handleResumeCurrentStep = () => {
    sound.playSummon();
    setViewingStep(progressStep);
  };

  const handleAdvanceReadingStep = (nextStep: TutorialStepId) => {
    sound.playSummon();
    setProgressStep(nextStep);
    setViewingStep(nextStep);
  };

  // Step 7: Compact non-blocking mission banner with "Rever" button to re-read any earlier step
  if (viewingStep === 'step_7_finish') {
    const liveTip = isDefendingPhase
      ? assignedBlocksCount === 0 && playerBoardCount > 0
        ? 'O Instrutor atacou! Clique em uma carta aliada para bloquear e confirme em DEFENDER.'
        : 'Clique em DEFENDER no botão central para resolver o bloqueio!'
      : turnPlayer !== 'player'
      ? 'Aguarde o turno do Instrutor Celentia.'
      : selectedAttackerCount > 0
      ? 'Clique em ATACAR no botão central para atacar o Instrutor!'
      : summonsThisRound < maxAllowedSummons && hasPlayableUnitInHand
      ? 'Invoque mais uma unidade da sua mão para ampliar sua vantagem na mesa!'
      : attackerRole === 'player' && !hasPlayerAttackedThisRound && canDeclareAttackNow
      ? 'Você é o Atacante! Clique nas suas unidades na mesa para atacar e reduzir a vida do Instrutor.'
      : hasPlayableSkillInHand
      ? 'Você pode usar uma Habilidade da mão ou clicar em PASSAR A VEZ.'
      : 'Sem ações restantes — clique em PASSAR A VEZ no botão central.';

    return (
      <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[94] pointer-events-none w-[min(95vw,600px)]">
        <div className="pointer-events-auto rounded-2xl border border-emerald-400/75 bg-gradient-to-r from-[#071e16]/96 via-[#0a1322]/96 to-[#161209]/96 px-3.5 py-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.85),0_0_24px_rgba(16,185,129,0.28)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-950/90 border border-emerald-400/60 flex items-center justify-center text-emerald-300 shrink-0">
            <GraduationCap size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
              <span className="font-black uppercase tracking-wider text-emerald-300">
                Passo 7 de 7 · Conclua a Partida
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-amber-300 tabular-nums">
                <Coins size={11} />
                +250 Ouro ao vencer
              </span>
            </div>
            <p className="text-xs font-semibold text-amber-100 leading-snug mt-0.5">
              Vença o Instrutor Celentia (Vida inimiga: {opponentHp}) — {liveTip}
            </p>
          </div>
          <button
            type="button"
            onClick={handleGoBack}
            className="shrink-0 min-h-[34px] px-2.5 py-1.5 rounded-lg bg-stone-900/95 hover:bg-stone-800 border border-stone-600/80 text-stone-200 hover:text-amber-200 text-[11px] font-serif font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap transition-colors"
            title="Voltar para reler passos anteriores"
          >
            <ChevronLeft size={13} />
            <span>Rever</span>
          </button>
        </div>
      </div>
    );
  }

  // Build step content dynamically for the currently viewed step (1 -> 6)
  const stepMeta = (() => {
    switch (viewingStep) {
      case 'step_1_dial':
        return {
          icon: <Compass size={17} className="text-amber-300" />,
          title: 'Barra Esquerda: Tiers, Rodada, Turno e Sinais na Mesa',
          body: (
            <div className="space-y-1.5">
              <p>
                No <strong>topo</strong> da barra esquerda você vê os <strong>Tiers liberados</strong> nesta rodada — cartas só podem ser invocadas quando o Tier delas estiver livre:
              </p>
              <div className="grid grid-cols-3 gap-1 text-[10px] font-mono tabular-nums bg-black/45 border border-amber-400/25 rounded-lg p-1.5 text-amber-100">
                <span>T1: Rodada 1</span>
                <span>T2: Rodada 3</span>
                <span>T3: Rodada 5</span>
                <span>T4: Rodada 7</span>
                <span>T5: Rodada 9</span>
                <span>T6: Rodada 10</span>
              </div>
              <p>
                No <strong>centro da esfera</strong> aparece a <strong>Rodada atual</strong> e, nas <strong>bordas</strong> da esfera, o <strong>Turno</strong> dentro da rodada. Logo abaixo, o texto mostra de quem é a vez.
              </p>
              <p className="text-emerald-200/95">
                <strong>Novidade visual na mesa:</strong> a <strong>borda luminosa da mesa</strong> brilha permanentemente até a metade do lado de quem possui a vez! Ao trocar de turno, o brilho percorre toda a borda e se desloca para o lado do próximo jogador, junto ao aviso central de troca de turno.
              </p>
            </div>
          ),
          expandLabel: 'Como funciona o sistema de Rodadas e Turnos?',
          expandContent: (
            <div className="space-y-1.5 text-[11px] text-stone-200 leading-relaxed">
              <p>
                • Uma <strong>Rodada</strong> representa um ciclo completo do combate. No início de cada rodada, ambos os jogadores compram <strong>1 carta automaticamente</strong> e o limite de invocações é restaurado (até 2 unidades por rodada).
              </p>
              <p>
                • Dentro da rodada, os jogadores alternam <strong>Turnos</strong> um de cada vez. Cada ação lenta (invocar unidade, usar habilidade lenta ou atacar) encerra seu turno e passa a vez ao oponente.
              </p>
              <p>
                • <strong>A rodada termina</strong> quando: (1) o <strong>Atacante passa a vez 2 vezes seguidas</strong> sem agir, ou (2) após o combate ser resolvido e o Defensor finalizar seu <strong>Turno Extra Pós-Ataque</strong>. Ao mudar a rodada, quem atacou vira Defensor e vice-versa!
              </p>
              <p className="text-amber-200/90">
                • <em>Curva Divina:</em> cartas do elemento Divino liberam mais cedo (T1 R1, T2 R2, T3 R4, T4 R5, T5/T6 R7).
              </p>
            </div>
          ),
          requiresBoardAction: false,
          actionHint: 'Leia os detalhes e avance para o Passo 1.2.',
          nextStep: 'step_1_2_role' as TutorialStepId,
          nextButtonLabel: 'Avançar (1.2)',
        };

      case 'step_1_2_role':
        return {
          icon: <Swords size={17} className="text-amber-300" />,
          title: 'Sua Função na Rodada: Atacante ou Defensor',
          body: (
            <p>
              Logo abaixo do mostrador fica o emblema da <strong>SUA função nesta rodada</strong>:{' '}
              <strong className="text-amber-300">Atacante</strong> (espadas douradas — pode declarar ataque) ou{' '}
              <strong className="text-sky-300">Defensor</strong> (escudo azul — protege sua vida bloqueando os ataques inimigos). Os papéis trocam automaticamente a cada nova rodada!
            </p>
          ),
          expandLabel: 'Como funciona Ataque, Defesa e Turno Pós-Ataque?',
          expandContent: (
            <div className="space-y-1.5 text-[11px] text-stone-200 leading-relaxed">
              <p>
                • <strong>Ataque:</strong> Apenas o <strong>Atacante da rodada</strong> pode declarar 1 ataque por rodada. Ele seleciona suas unidades na mesa e pressiona <strong>ATACAR</strong>.
              </p>
              <p>
                • <strong>Defesa:</strong> Ao sofrer um ataque, o <strong>Defensor</strong> escolhe quais unidades aliadas vão bloquear cada atacante (1 bloqueador por atacante) e confirma em <strong>DEFENDER</strong>. Atacantes sem bloqueador causam <strong>1 de dano direto na Vida do Líder</strong>.
              </p>
              <p>
                • <strong>Turno Pós-Ataque:</strong> Logo depois que o combate termina, o <strong>Defensor ganha 1 Turno Extra final</strong> nesta rodada para invocar reforços ou usar habilidades antes da rodada encerrar! Quando o Defensor age (ação lenta) ou passa a vez nesse turno extra, a rodada acaba.
              </p>
            </div>
          ),
          requiresBoardAction: false,
          actionHint: 'Você pode expandir a explicação ou avançar para o Passo 1.3.',
          nextStep: 'step_1_3_coin' as TutorialStepId,
          nextButtonLabel: 'Avançar (1.3)',
        };

      case 'step_1_3_coin':
        return {
          icon: <Coins size={17} className="text-amber-300" />,
          title: 'A Moeda de Sorteio Inicial (Sol e Lua)',
          body: (
            <p>
              Na parte inferior da barra esquerda fica a <strong>Moeda de Sorteio</strong> da partida. Antes da Rodada 1 começar, a moeda é lançada entre <strong>Sol</strong> e <strong>Lua</strong> para sortear quem inicia a partida como <strong>Atacante</strong>! Neste treinamento você começa atacando para testar o combate primeiro.
            </p>
          ),
          expandLabel: null,
          expandContent: null,
          requiresBoardAction: false,
          actionHint: 'Avance para conhecer o seu Baralho (Passo 2).',
          nextStep: 'step_2_deck' as TutorialStepId,
          nextButtonLabel: 'Baralho (Passo 2)',
        };

      case 'step_2_deck':
        return {
          icon: <BookOpen size={17} className="text-sky-300" />,
          title: 'Seu Baralho (Compra 100% Automática!)',
          body: (
            <div className="space-y-1.5">
              <p>
                Este é o seu <strong>Baralho de 20 cartas</strong>. Você inicia a partida com 4 cartas na mão + <strong>1 compra automática</strong> da Rodada 1 (5 cartas ao todo).
              </p>
              <p className="text-emerald-200 font-medium">
                A compra de cartas é totalmente <strong>AUTOMÁTICA</strong> no início de cada nova rodada — você não precisa clicar no baralho para comprar!
              </p>
              <p className="text-stone-300">
                O número exibido mostra quantas cartas ainda restam no grimório. Se o baralho acabar, você não perde na hora: continua lutando enquanto tiver ao menos uma unidade viva em campo.
              </p>
            </div>
          ),
          expandLabel: null,
          expandContent: null,
          requiresBoardAction: false,
          actionHint: 'Avance para aprender sobre suas cartas na mão (Passo 3).',
          nextStep: 'step_3_hand' as TutorialStepId,
          nextButtonLabel: 'Mão (Passo 3)',
        };

      case 'step_3_hand':
        return {
          icon: <Hand size={17} className="text-emerald-300" />,
          title: 'Cartas na Mão, Invocação e Tipos de Habilidades',
          body: (
            <div className="space-y-1.5">
              <p>
                <strong>Passe o mouse em cima</strong> de qualquer carta (na mão ou na mesa) para abrir ao lado todas as informações essenciais dela: efeito, nível e ícones de passivas! Para jogar, basta <strong>clicar na carta</strong> (ou <strong>arrastar no mobile</strong>) para a mesa no seu turno.
              </p>
              <p>
                • <strong>Unidades:</strong> você pode invocar até <strong>2 unidades por rodada</strong> (respeitando os Tiers liberados).
                <br />• <strong>Habilidades:</strong> têm <strong>uso livre</strong> (não gastam seu limite de 2 unidades!), divididas em 3 tipos:
              </p>
              <div className="grid grid-cols-1 gap-1 text-[10.5px] bg-black/45 border border-emerald-400/25 rounded-lg p-2">
                <div>
                  <strong className="text-emerald-300">Rápidas:</strong> resolvem na hora e <strong>não consomem sua vez</strong>.
                </div>
                <div>
                  <strong className="text-amber-300">Lentas:</strong> consomem sua vez e abrem janela de resposta ao oponente.
                </div>
                <div>
                  <strong className="text-fuchsia-300">Fugazes:</strong> rápidas e temporárias — não consomem sua vez, mas somem no fim da rodada se não forem usadas.
                </div>
              </div>
            </div>
          ),
          expandLabel: null,
          expandContent: null,
          requiresBoardAction: true,
          actionHint: 'AÇÃO OBRIGATÓRIA: Clique (ou arraste) em uma UNIDADE da sua mão para invocá-la na mesa agora!',
          nextStep: null,
          nextButtonLabel: null,
        };

      case 'step_4_board': {
        const attackedOnce = playerAttackCompletedCount >= 1;
        if (isReviewingPastStep) {
          return {
            icon: <Swords size={17} className="text-amber-300" />,
            title: 'A Mesa · Ataque e Defesa',
            body: (
              <p>
                Na <strong>Mesa de Combate</strong>, clicar em uma unidade aliada designa ela para <strong>Ataque</strong> (quando você for o Atacante) ou para <strong>Defesa/Bloqueio</strong> (quando você for o Defensor). Depois basta confirmar no botão central.
              </p>
            ),
            expandLabel: null,
            expandContent: null,
            requiresBoardAction: false,
            actionHint: 'Você já concluiu a prática de ataque e defesa.',
            nextStep: null,
            nextButtonLabel: null,
          };
        }

        if (isDefendingPhase) {
          return {
            icon: <Shield size={17} className="text-sky-300" />,
            title: 'Prática na Mesa · Fase de Defesa!',
            body: (
              <p>
                Agora é a <strong>simulação de Defesa</strong>! O Instrutor atacou você. Para designar uma carta sua para defender, <strong>basta clicar nela na mesa</strong> (e no atacante inimigo) e depois confirmar em <strong>DEFENDER</strong> no botão central!
              </p>
            ),
            expandLabel: null,
            expandContent: null,
            requiresBoardAction: true,
            actionHint:
              assignedBlocksCount > 0 || playerBoardCount === 0
                ? 'AÇÃO OBRIGATÓRIA: Agora clique no botão DEFENDER para confirmar o bloqueio!'
                : 'AÇÃO OBRIGATÓRIA: Clique na sua unidade na mesa para designá-la como bloqueadora!',
            nextStep: null,
            nextButtonLabel: null,
          };
        }

        if (!attackedOnce) {
          return {
            icon: <Swords size={17} className="text-amber-300" />,
            title: 'A Mesa · Prática de Ataque e Defesa',
            body: (
              <p>
                Esta é a <strong>Mesa de Combate</strong>. Para designar uma carta sua para <strong>Ataque</strong>, basta <strong>clicar nela</strong> — e para <strong>Defesa</strong> funciona exatamente da mesma forma! Vamos praticar um ataque real agora: clique na unidade que você invocou e confirme o ataque.
              </p>
            ),
            expandLabel: null,
            expandContent: null,
            requiresBoardAction: true,
            actionHint:
              selectedAttackerCount > 0
                ? 'AÇÃO OBRIGATÓRIA: Unidade marcada! Clique em ATACAR no botão central agora.'
                : turnPlayer === 'player'
                ? 'AÇÃO OBRIGATÓRIA: Clique na sua unidade na mesa para designá-la para o ataque!'
                : 'Aguarde o Instrutor concluir o turno dele...',
            nextStep: null,
            nextButtonLabel: null,
          };
        }

        return {
          icon: <Shield size={17} className="text-sky-300" />,
          title: 'Excelente Ataque! Prepare-se para Defender',
          body: (
            <p>
              Você concluiu o cenário de <strong>Ataque</strong>! Agora vamos para o cenário de <strong>Defesa</strong> na Rodada 2, onde o Instrutor Celentia irá atacar você.
            </p>
          ),
          expandLabel: null,
          expandContent: null,
          requiresBoardAction: true,
          actionHint:
            turnPlayer === 'player'
              ? 'AÇÃO OBRIGATÓRIA: Clique em PASSAR A VEZ (ou invoque mais uma unidade) para avançar à Rodada 2 e receber o ataque do Instrutor!'
              : 'Aguarde o Instrutor preparar e declarar o ataque dele...',
          nextStep: null,
          nextButtonLabel: null,
        };
      }

      case 'step_5_hp':
        return {
          icon: <Heart size={17} className="text-rose-400" />,
          title: 'A Vida do Jogador (5 Pontos de Vida)',
          body: (
            <div className="space-y-1.5">
              <p>
                Esta barra exibe a <strong>Vida do seu Líder</strong> (máximo de <strong>5 pontos</strong>). Sempre que um atacante inimigo passar sem ser bloqueado, ele causa <strong>1 ponto de dano direto</strong> aqui.
              </p>
              <p className="text-stone-300">
                Quem reduzir a barra de vida do adversário a <strong>0</strong> vence a partida! Proteja sua vida com bloqueadores sempre que estiver na função de Defensor.
              </p>
            </div>
          ),
          expandLabel: null,
          expandContent: null,
          requiresBoardAction: false,
          actionHint: 'Avance para o Passo 6 e domine o Botão de Passar a Vez!',
          nextStep: 'step_6_orb' as TutorialStepId,
          nextButtonLabel: 'Botão de Ação (6)',
        };

      case 'step_6_orb':
      default:
        return {
          icon: <Zap size={17} className="text-amber-300" />,
          title: 'O Botão Central: Atacar, Defender e Passar a Vez',
          body: (
            <div className="space-y-1.5">
              <p>
                É <strong>neste botão</strong> que toda decisão se concretiza: ao atacar você pressiona <strong>ATACAR</strong>; ao defender você precisa confirmar em <strong>DEFENDER</strong>.
              </p>
              <p className="text-rose-200 bg-rose-950/55 border border-rose-500/40 rounded-lg px-2 py-1">
                <strong>Atenção na Defesa:</strong> clicar em <strong>DEFENDER</strong> sem designar nenhuma carta bloqueadora resulta em <strong>dano direto na sua Vida</strong>!
              </p>
              <p>
                Quando <strong>não houver nenhuma ação</strong> para fazer no turno, clique manualmente em <strong>PASSAR A VEZ</strong>.
              </p>
              <div className="bg-black/45 border border-amber-400/25 rounded-lg p-2 text-[10.5px] space-y-1 text-stone-200">
                <div>
                  • <strong className="text-amber-300">Como Atacante:</strong> passar a vez <strong>1 vez</strong> entrega o turno ao Defensor (1/2). Passar pela <strong>2ª vez seguida</strong> sem agir encerra a rodada (2/2)!
                </div>
                <div>
                  • <strong className="text-sky-300">Como Defensor:</strong> passar a vez <strong>nunca</strong> encerra a rodada (sempre devolve ao Atacante) — <strong>exceto</strong> no <em>Turno Extra Pós-Ataque</em>, onde passar encerra a rodada.
                </div>
              </div>
            </div>
          ),
          expandLabel: null,
          expandContent: null,
          requiresBoardAction: true,
          actionHint:
            turnPlayer === 'player'
              ? `AÇÃO OBRIGATÓRIA: Pressione o botão central agora (${
                  isDefendingPhase
                    ? 'DEFENDER'
                    : selectedAttackerCount > 0
                    ? 'ATACAR'
                    : 'PASSAR A VEZ'
                }) para confirmar que dominou o comando!${
                  attackerConsecutivePasses === 1 && attackerRole === 'player' ? ' (Passar agora encerra a rodada 2/2)' : ''
                }`
              : 'Aguarde o Instrutor finalizar o turno dele para você pressionar o botão central!',
          nextStep: null,
          nextButtonLabel: null,
        };
    }
  })();

  const isBoardInteractionEnabled = stepMeta.requiresBoardAction && !isReviewingPastStep;

  // Smart coach panel placement so it never hides the spotlighted element
  const coachPositionClass = (() => {
    switch (viewingStep) {
      case 'step_1_dial':
      case 'step_1_2_role':
      case 'step_1_3_coin':
        return 'top-1/2 -translate-y-1/2 right-3 sm:right-6';
      case 'step_2_deck':
        return 'top-16 left-3 sm:left-24';
      case 'step_3_hand':
        return 'top-14 left-1/2 -translate-x-1/2';
      case 'step_4_board':
        return 'top-12 right-3 sm:right-5';
      case 'step_5_hp':
        return 'top-1/2 -translate-y-1/2 right-3 sm:right-6';
      case 'step_6_orb':
        return 'top-16 left-3 sm:left-24';
      default:
        return 'top-16 right-4';
    }
  })();

  return (
    <>
      {/* Transparent click-blocker during reading/review steps — ZERO blur so focused elements stay 100% razor-sharp! */}
      {!isBoardInteractionEnabled && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[85] bg-transparent"
        />
      )}

      {/* Crisp Cutout Spotlight Ring: darkens ONLY outside the target rectangle, with zero blur on the highlighted element */}
      {spotlightRect && (
        <div
          aria-hidden="true"
          className="fixed z-[88] pointer-events-none rounded-2xl border-2 border-emerald-300 shadow-[0_0_0_9999px_rgba(2,6,23,0.62),0_0_26px_rgba(52,211,153,0.85)] transition-all duration-300 ease-out"
          style={{
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
          }}
        >
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-emerald-400 text-stone-950 text-[9px] font-mono font-black uppercase tracking-wider shadow-lg whitespace-nowrap">
            {isBoardInteractionEnabled
              ? 'Interaja Aqui'
              : isReviewingPastStep
              ? 'Releitura'
              : 'Foco do Passo'}
          </span>
        </div>
      )}

      {/* Mandatory Tutorial Coach Card — ZERO Skip / ZERO Close buttons, WITH Back & Resume Re-read Navigation */}
      <div
        className={`fixed z-[96] w-[min(92vw,430px)] max-h-[82dvh] overflow-y-auto rounded-2xl border-2 border-emerald-400/80 bg-gradient-to-b from-[#0a211b]/98 via-[#09121e]/98 to-[#050912]/98 p-3.5 sm:p-4 text-stone-100 shadow-[0_20px_60px_rgba(0,0,0,0.92),0_0_32px_rgba(16,185,129,0.28)] ${coachPositionClass}`}
      >
        {/* Top Progress Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-400/60 flex items-center justify-center shrink-0">
              {stepMeta.icon}
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-mono font-black uppercase tracking-wider text-emerald-300">
                {TUTORIAL_STEP_LABEL[viewingStep]}
                {' · '}
                {isReviewingPastStep ? 'Modo de Releitura' : 'Treinamento'}
              </span>
              <div className="w-28 h-1.5 rounded-full bg-stone-800 overflow-hidden mt-0.5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-amber-300 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-200 tabular-nums shrink-0">
            <Sparkles size={11} className="text-amber-300" /> +250 Ouro
          </span>
        </div>

        {/* Title & Body */}
        <h3 className="text-sm sm:text-base font-serif font-black text-amber-100 leading-snug mb-1.5">
          {stepMeta.title}
        </h3>
        <div className="text-xs text-stone-200/95 leading-relaxed">
          {stepMeta.body}
        </div>

        {/* Optional Expandable Deep-Dive Rule Button (Steps 1 & 1.2) */}
        {stepMeta.expandLabel && stepMeta.expandContent && (
          <div className="mt-2.5">
            <button
              type="button"
              onClick={() => {
                sound.playDraw();
                setExpandedDetail((prev) => !prev);
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-500/12 hover:bg-amber-500/20 border border-amber-400/45 text-amber-200 text-xs font-serif font-bold transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5 text-left">
                <BookOpen size={13} className="shrink-0" />
                {stepMeta.expandLabel}
              </span>
              {expandedDetail ? (
                <ChevronUp size={15} className="shrink-0" />
              ) : (
                <ChevronDown size={15} className="shrink-0" />
              )}
            </button>
            {expandedDetail && (
              <div className="mt-1.5 p-2.5 rounded-xl bg-black/55 border border-amber-400/30 animate-in fade-in duration-200">
                {stepMeta.expandContent}
              </div>
            )}
          </div>
        )}

        {/* Action Callout OR Re-read Status Banner */}
        <div
          className={`mt-3 px-2.5 py-2 rounded-xl border text-[11px] font-semibold leading-snug flex items-start gap-2 ${
            isReviewingPastStep
              ? 'bg-sky-950/60 border-sky-400/45 text-sky-100'
              : stepMeta.requiresBoardAction
              ? 'bg-emerald-950/75 border-emerald-400/60 text-emerald-100'
              : 'bg-stone-900/80 border-white/10 text-stone-300'
          }`}
        >
          <CheckCircle2
            size={14}
            className={`shrink-0 mt-0.5 ${
              isReviewingPastStep
                ? 'text-sky-300'
                : stepMeta.requiresBoardAction
                ? 'text-emerald-300 animate-pulse'
                : 'text-amber-300'
            }`}
          />
          <span>
            {isReviewingPastStep
              ? `Você está relendo este passo sem precisar repetir ações. Seu passo ativo é ${TUTORIAL_STEP_LABEL[progressStep]}.`
              : stepMeta.actionHint}
          </span>
        </div>

        {/* Footer Controls: Back (Re-read) + Forward / Resume Current Step */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          {viewingIndex > 0 ? (
            <button
              type="button"
              onClick={handleGoBack}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-stone-900/95 hover:bg-stone-800 border border-stone-600/80 text-stone-200 hover:text-amber-100 font-serif font-bold text-xs cursor-pointer flex items-center gap-1 whitespace-nowrap transition-colors"
            >
              <ChevronLeft size={14} />
              <span>Voltar</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 ml-auto">
            {isReviewingPastStep ? (
              <>
                {viewingIndex + 1 < progressIndex && (
                  <button
                    type="button"
                    onClick={handleStepForwardInReview}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-stone-900/95 hover:bg-stone-800 border border-stone-600/80 text-stone-200 hover:text-emerald-200 font-serif font-bold text-xs cursor-pointer flex items-center gap-1 whitespace-nowrap transition-colors"
                  >
                    <span>Próximo</span>
                    <ChevronRight size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleResumeCurrentStep}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 hover:brightness-110 text-stone-950 font-serif font-black text-xs uppercase tracking-wider shadow-[0_6px_18px_rgba(16,185,129,0.38)] cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                >
                  <RotateCcw size={13} />
                  <span>Retomar passo atual</span>
                </button>
              </>
            ) : (
              !stepMeta.requiresBoardAction &&
              stepMeta.nextStep && (
                <button
                  type="button"
                  onClick={() => handleAdvanceReadingStep(stepMeta.nextStep!)}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 hover:brightness-110 text-stone-950 font-serif font-black text-xs uppercase tracking-wider shadow-[0_6px_20px_rgba(16,185,129,0.4)] cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <span>{stepMeta.nextButtonLabel}</span>
                  <ChevronRight size={15} />
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </>
  );
};
