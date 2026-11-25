import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { CardInstance, CombatResultDetail, ConditionEffect, ElementType, GameLogEntry, PlayerState, TierType } from '../types/game';
import {
  buildDeckFromTemplateIds,
  buildPlayerDeck,
  shuffleDeck,
  createAtormentadorInstance,
  createCardInstance,
  dealInitialHand,
  drawCardCurve,
  DEFAULT_DECK_IDS,
  getNextRotatingAiDeck,
  TUTORIAL_PLAYER_DECK_IDS,
  TUTORIAL_INSTRUCTOR_DECK_IDS,
  type AiDeckPreset,
} from '../logic/deckFactory';
import { CARD_TEMPLATES } from '../data/cards';
import {
  checkAtormentadorFusion,
  isTierAllowedInRound,
  calculateCombatDamage,
  resolveCombatPair,
  triggerKarloExplosion,
  triggerKoreDeath,
  hasAliancaAngiris,
  hasCelestialCouncilVictory,
  isArchangelCard,
  isOSolLevel2Immortal,
  isALuaLevel2Supreme,
  addDefensePoints,
  getBonusPowerValue,
  addPowerPoints,
  withAddedPowerPoints,
  syncScaledPower,
  syncClassPowerBonuses,
  hasCardClass,
  canReceiveMulticlass,
  addClassToCard,
  getCardClasses,
  isFairyCard,
  hasCorteDasFadas,
  hasCorrosao,
  applyPragaToUnit,
  removePragaFromUnit,
} from '../logic/combat';
import { decideAiDefense, decideAiTurnAction } from '../logic/aiPlayer';
import { sound } from '../services/soundEffects';
import { loadRankPoints, saveRankPoints, calculateRankDelta } from '../utils/rankSystem';
import { recordMatchResult } from '../utils/matchHistory';
import {
  claimTutorialRewardInCloud,
  getInMemoryPlayerState,
} from '../services/accountApi';
import {
  setCardConditionSource,
  removeCardConditionSource,
  withConditionSource,
  withoutConditionSource,
} from '../utils/conditionEffectsConfig';
import { CardView } from './CardView';
import { ArenaCardHoverPreview } from './ArenaCardHoverPreview';
import { TurnTransitionBanner, type TurnTransitionBannerData } from './TurnTransitionBanner';
import { TableTurnBorderGlow } from './TableTurnBorderGlow';
import { MobileBattleCard } from './MobileBattleCard';
import { UnitFloatingBuffs } from './UnitFloatingBuffs';
import { CardModal } from './CardModal';
import { RulesModal } from './RulesModal';
import { TargetSelectModal, DiscardSelectModal, ConfirmActionModal, ZykDiscardModal } from './ActionModals';
import { RevealSelectionModal } from './RevealSelectionModal';
import { GameOverModal, RematchRequestStatus } from './GameOverModal';
import { LevelUpCinematicOverlay } from './LevelUpCinematicOverlay';
import { getDefaultAwakenedPowerText } from '../utils/levelUpThemes';
import { RematchPrepModal } from './RematchPrepModal';
import { TurnRoundCoinDial } from './TurnRoundCoinDial';
import { RoleFunctionCrest } from './RoleFunctionCrest';
import { FinishingCannonOverlay } from './FinishingCannonOverlay';
import {
  CelestialCouncilVictoryOverlay,
  CelestialCouncilVictoryState,
} from './CelestialCouncilVictoryOverlay';
import { MagicCoinModal } from './MagicCoinModal';
import { TestingArenaDrawer } from './TestingArenaDrawer';
import { SettingsModal } from './SettingsModal';
import { CombatTutorialOverlay } from './CombatTutorialOverlay';
import { RoundProgressTracker } from './RoundProgressTracker';
import { ElementalParticleCanvas, ElementalVfxBurst } from './ElementalParticleCanvas';
import { CrioGeneseVfxOverlay, CrioGeneseVfxState } from './CrioGeneseVfxOverlay';
import { SkillAnimationsOverlay, SkillVfxState, SkillVfxType, DivineArchangelAura } from './SkillAnimationsOverlay';
import { ConditionVisualEffectsOverlay, ConditionVfxEvent, RectSnapshot } from './ConditionVisualEffectsOverlay';
import { resolveCardArtUrl } from '../utils/cardVisuals';
import {
  UnitAnimationsOverlay,
  UnitVfxEvent,
  BarelioBoardChainsOverlay,
} from './UnitAnimationsOverlay';
import {
  CardActionAnimationsOverlay,
  DrawAnimEvent,
  DiscardAnimEvent,
  FloatingSkillCard,
  RoundCoinTransitionState,
  CounterResponseModalData,
} from './CardActionAnimationsOverlay';
import { useVisualPreferences } from '../utils/visualTheme';
import {
  OnlineMatchBootstrap,
  OnlineMatchSnapshot,
  PvpRematchPrepDTO,
  hydrateCardInstance,
  hydratePlayerState,
  serializeCardInstance,
  serializePlayerState,
} from '../types/pvp';
import { pvpSocket } from '../services/pvpSocket';
import {
  Heart,
  Shield,
  Swords,
  Layers,
  ArrowRight,
  Flame,
  X,
  Sparkles,
  Compass,
  FlaskConical,
  Settings,
  Sun,
  Moon,
  Shuffle,
  HeartCrack,
  Skull,
  FastForward,
  Maximize2,
  Minimize2,
  ScrollText,
} from 'lucide-react';

interface GameBoardProps {
  gameMode: 'ai' | 'online_pvp';
  matchType?: 'normal' | 'ranked';
  activeDeckName?: string;
  customPlayerDeckCardIds?: string[];
  onlineMatchBootstrap?: OnlineMatchBootstrap | null;
  isTestingArena?: boolean;
  isTutorialMode?: boolean;
  isGuidedPviaMode?: boolean;
  onOpenDeckBuilder?: () => void;
  onOpenDeckSelector?: () => void;
  onOnlineRematchStarted?: (bootstrap: OnlineMatchBootstrap) => void;
  onGoToLobby?: () => void;
  onExitTutorialToModes?: () => void;
  onExitToTitle: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameMode,
  matchType = 'ranked',
  activeDeckName = 'Meu Baralho',
  customPlayerDeckCardIds,
  onlineMatchBootstrap = null,
  isTestingArena = false,
  isTutorialMode = false,
  isGuidedPviaMode = false,
  onOpenDeckBuilder: _onOpenDeckBuilder,
  onOpenDeckSelector,
  onOnlineRematchStarted,
  onGoToLobby,
  onExitTutorialToModes,
  onExitToTitle,
}) => {
  const isOnlinePvp = gameMode === 'online_pvp' && Boolean(onlineMatchBootstrap);
  // Helper to create 3 training dummy cards
  const createDummyTargetCards = (): CardInstance[] => {
    const dummyTemplate = CARD_TEMPLATES.find((t) => t.id === 'dummy_target') || {
      id: 'dummy_target',
      name: 'Boneco Alvo',
      kingdom: 'naneya' as const,
      tier: 1 as const,
      type: 'unit' as const,
      element: 'Neutro' as const,
      hp: 10,
      atk: 5,
      def: 5,
      power: 0,
      effectDescription: 'Boneco de testes com 10 de Vida, 5 de Ataque e 5 de Defesa.',
    };
    return [
      { ...createCardInstance(dummyTemplate), name: 'Boneco Alvo 1' },
      { ...createCardInstance(dummyTemplate), name: 'Boneco Alvo 2' },
      { ...createCardInstance(dummyTemplate), name: 'Boneco Alvo 3' },
    ];
  };

  // ----------------------------------------------------
  // GAME STATE
  // ----------------------------------------------------
  const [round, setRound] = useState<number>(() =>
    isOnlinePvp && onlineMatchBootstrap ? onlineMatchBootstrap.initialSnapshot.round : 1
  );
  const roundRef = useRef<number>(
    isOnlinePvp && onlineMatchBootstrap ? onlineMatchBootstrap.initialSnapshot.round : 1
  );
  const [attackerRole, setAttackerRole] = useState<'player' | 'opponent'>(() =>
    isOnlinePvp && onlineMatchBootstrap ? onlineMatchBootstrap.initialSnapshot.attackerRole : 'player'
  );
  const attackerRoleRef = useRef<'player' | 'opponent'>(
    isOnlinePvp && onlineMatchBootstrap ? onlineMatchBootstrap.initialSnapshot.attackerRole : 'player'
  );
  useEffect(() => {
    attackerRoleRef.current = attackerRole;
  }, [attackerRole]);
  const [turnPlayer, setTurnPlayer] = useState<'player' | 'opponent'>(() =>
    isOnlinePvp && onlineMatchBootstrap ? onlineMatchBootstrap.initialSnapshot.turnPlayer : 'player'
  );
  const [roundTurnNumber, setRoundTurnNumber] = useState<number>(() =>
    isOnlinePvp && onlineMatchBootstrap ? (onlineMatchBootstrap.initialSnapshot.roundTurnNumber ?? 1) : 1
  );
  const roundTurnNumberRef = useRef<number>(
    isOnlinePvp && onlineMatchBootstrap ? (onlineMatchBootstrap.initialSnapshot.roundTurnNumber ?? 1) : 1
  );
  useEffect(() => {
    roundTurnNumberRef.current = roundTurnNumber;
  }, [roundTurnNumber]);
  const [attackerConsecutivePasses, setAttackerConsecutivePasses] = useState<number>(() =>
    isOnlinePvp && onlineMatchBootstrap
      ? (onlineMatchBootstrap.initialSnapshot.attackerConsecutivePasses ??
          onlineMatchBootstrap.initialSnapshot.consecutivePasses ??
          0)
      : 0
  );
  const attackerConsecutivePassesRef = useRef<number>(
    isOnlinePvp && onlineMatchBootstrap
      ? (onlineMatchBootstrap.initialSnapshot.attackerConsecutivePasses ??
          onlineMatchBootstrap.initialSnapshot.consecutivePasses ??
          0)
      : 0
  );
  useEffect(() => {
    attackerConsecutivePassesRef.current = attackerConsecutivePasses;
  }, [attackerConsecutivePasses]);
  const [freeActionHint, setFreeActionHint] = useState<string | null>(null);
  const freeActionHintTimerRef = useRef<number | null>(null);
  const showFreeActionHint = useCallback((text: string) => {
    setFreeActionHint(text);
    if (freeActionHintTimerRef.current) {
      window.clearTimeout(freeActionHintTimerRef.current);
    }
    freeActionHintTimerRef.current = window.setTimeout(() => {
      setFreeActionHint(null);
      freeActionHintTimerRef.current = null;
    }, 3200);
  }, []);
  const isSpellTurnConsuming = useCallback((c: CardInstance): boolean => {
    return c.type === 'skill' && c.speed === 'lenta' && !c.isFugaz;
  }, []);
  const resetAttackerPasses = useCallback(() => {
    attackerConsecutivePassesRef.current = 0;
    setAttackerConsecutivePasses(0);
  }, []);
  const [isTurnTransitioning, setIsTurnTransitioning] = useState<boolean>(false);
  const isTurnTransitioningRef = useRef<boolean>(false);
  const [turnTransitionBanner, setTurnTransitionBanner] = useState<TurnTransitionBannerData | null>(null);
  const pendingTurnHandoffTimerRef = useRef<number | null>(null);
  const turnUnlockTimerRef = useRef<number | null>(null);
  const turnBannerTimerRef = useRef<number | null>(null);

  const clearPendingTurnTimers = useCallback(() => {
    if (pendingTurnHandoffTimerRef.current !== null) {
      window.clearTimeout(pendingTurnHandoffTimerRef.current);
      pendingTurnHandoffTimerRef.current = null;
    }
    if (turnUnlockTimerRef.current !== null) {
      window.clearTimeout(turnUnlockTimerRef.current);
      turnUnlockTimerRef.current = null;
    }
    if (turnBannerTimerRef.current !== null) {
      window.clearTimeout(turnBannerTimerRef.current);
      turnBannerTimerRef.current = null;
    }
    isTurnTransitioningRef.current = false;
    setIsTurnTransitioning(false);
    setTurnTransitionBanner(null);
  }, []);

  useEffect(() => {
    return () => {
      clearPendingTurnTimers();
    };
  }, [clearPendingTurnTimers]);

  const animationModeRef = useRef<'full' | 'static' | 'off'>('full');

  const advanceConsumedTurn = useCallback(
    (nextPlayer: 'player' | 'opponent') => {
      if (pendingTurnHandoffTimerRef.current !== null) {
        window.clearTimeout(pendingTurnHandoffTimerRef.current);
        pendingTurnHandoffTimerRef.current = null;
      }
      if (turnUnlockTimerRef.current !== null) {
        window.clearTimeout(turnUnlockTimerRef.current);
        turnUnlockTimerRef.current = null;
      }

      isTurnTransitioningRef.current = true;
      setIsTurnTransitioning(true);

      const mode = animationModeRef.current;
      const settleDelayMs = isTestingArena ? 240 : mode === 'off' ? 240 : mode === 'static' ? 420 : 620;
      const bannerHoldMs = isTestingArena ? 300 : mode === 'off' ? 260 : mode === 'static' ? 440 : 620;

      pendingTurnHandoffTimerRef.current = window.setTimeout(() => {
        pendingTurnHandoffTimerRef.current = null;
        const nextTurnNum = roundTurnNumberRef.current + 1;
        roundTurnNumberRef.current = nextTurnNum;
        setRoundTurnNumber(nextTurnNum);
        setTurnTimeLeft(30);
        setTurnPlayer(nextPlayer);

        turnUnlockTimerRef.current = window.setTimeout(() => {
          turnUnlockTimerRef.current = null;
          isTurnTransitioningRef.current = false;
          setIsTurnTransitioning(false);
        }, bannerHoldMs);
      }, settleDelayMs);
    },
    [isTestingArena]
  );
  const [consecutiveTimeouts, setConsecutiveTimeouts] = useState<{ player: number; opponent: number }>({ player: 0, opponent: 0 });
  const [woBanner, setWoBanner] = useState<{ winner: 'player' | 'opponent'; message: string } | null>(null);
  const [hasAttackedThisRound, setHasAttackedThisRound] = useState<boolean>(() =>
    isOnlinePvp && onlineMatchBootstrap ? onlineMatchBootstrap.initialSnapshot.hasAttackedThisRound : false
  );
  const hasAttackedThisRoundRef = useRef<boolean>(
    isOnlinePvp && onlineMatchBootstrap ? onlineMatchBootstrap.initialSnapshot.hasAttackedThisRound : false
  );
  useEffect(() => {
    hasAttackedThisRoundRef.current = hasAttackedThisRound;
  }, [hasAttackedThisRound]);
  const [votoSilencioActive, setVotoSilencioActive] = useState<boolean>(() =>
    isOnlinePvp && onlineMatchBootstrap ? onlineMatchBootstrap.initialSnapshot.votoSilencioActive : false
  );
  const [votoSilencioRoundsRemaining, setVotoSilencioRoundsRemaining] = useState<number>(() =>
    isOnlinePvp && onlineMatchBootstrap ? onlineMatchBootstrap.initialSnapshot.votoSilencioRoundsRemaining : 0
  );
  const votoSilencioRoundsRef = useRef<number>(
    isOnlinePvp && onlineMatchBootstrap ? onlineMatchBootstrap.initialSnapshot.votoSilencioRoundsRemaining : 0
  );
  const prevTurnTickKeyRef = useRef<string>(
    isOnlinePvp && onlineMatchBootstrap
      ? `${onlineMatchBootstrap.initialSnapshot.round}_${onlineMatchBootstrap.initialSnapshot.turnPlayer}`
      : '1_player'
  );

  // Turn Timer (30s fixed)
  const [turnTimeLeft, setTurnTimeLeft] = useState<number>(30);
  const handleDefenseTimeoutRef = useRef<() => void>(() => {});
  const handlePassTurnRef = useRef<(byTimeout?: boolean, isAiCall?: boolean) => void>(() => {});
  const triggerCelestialCouncilVictoryRef = useRef<(winner: 'player' | 'opponent', boardOverride?: CardInstance[]) => void>(() => {});

  // Moeda Mágica: interactive 3D coin toss at match start (skipped in Testing Arena, Online PvP, and Interactive Tutorial)
  const [isMagicCoinOpen, setIsMagicCoinOpen] = useState<boolean>(
    !isTestingArena && !isOnlinePvp && !isTutorialMode
  );
  const [tutorialOverlayActive, setTutorialOverlayActive] = useState<boolean>(
    isTutorialMode || isGuidedPviaMode
  );
  const [tutorialRewardResult, setTutorialRewardResult] = useState<{
    claimedNow: boolean;
    goldAwarded: number;
  } | null>(null);
  const tutorialRewardClaimAttemptedRef = useRef<boolean>(false);
  const [playerOrbActionCount, setPlayerOrbActionCount] = useState<number>(0);
  const [playerAttackCompletedCount, setPlayerAttackCompletedCount] = useState<number>(0);
  const [playerDefenseCompletedCount, setPlayerDefenseCompletedCount] = useState<number>(0);
  const [activeAiDeckPreset, setActiveAiDeckPreset] = useState<AiDeckPreset | null>(() =>
    !isOnlinePvp && !isTestingArena && !isTutorialMode ? getNextRotatingAiDeck() : null
  );
  const [playerCoinSide, setPlayerCoinSide] = useState<'sol' | 'lua'>(() =>
    isOnlinePvp && onlineMatchBootstrap ? onlineMatchBootstrap.initialSnapshot.playerCoinSide : 'sol'
  );
  const [isCoinBadgeSpinning, setIsCoinBadgeSpinning] = useState<boolean>(false);

  // Testing Lab Drawer state
  const [isTestingDrawerOpen, setIsTestingDrawerOpen] = useState<boolean>(false);

  // Players setup with 20-card deck and anti-brick initial hand (4 dealt + 1 auto-drawn = 5 cards start)
  const [player, setPlayer] = useState<PlayerState>(() => {
    if (isOnlinePvp && onlineMatchBootstrap) {
      return hydratePlayerState(onlineMatchBootstrap.initialSnapshot.player);
    }

    if (isTutorialMode) {
      const fullDeck = buildDeckFromTemplateIds(TUTORIAL_PLAYER_DECK_IDS);
      const pool = [...fullDeck];
      const pickCard = (predicate: (c: CardInstance) => boolean): CardInstance | null => {
        const idx = pool.findIndex(predicate);
        if (idx === -1) return null;
        return pool.splice(idx, 1)[0];
      };

      // Curated 5-card opening hand (4 initial + 1 automatic R1 draw): strong T1 units + quick & slow skills
      const tutorialHand: CardInstance[] = [];
      const t1UnitA = pickCard((c) => c.templateId === 'g_gael') || pickCard((c) => c.type === 'unit' && c.tier === 1);
      const t1UnitB = pickCard((c) => c.templateId === 'g_hugo') || pickCard((c) => c.type === 'unit' && c.tier === 1);
      const t1UnitC = pickCard((c) => c.templateId === 'm_vilma') || pickCard((c) => c.type === 'unit' && c.tier === 1);
      const quickSkill =
        pickCard((c) => c.type === 'skill' && c.tier === 1 && (c.speed === 'rapida' || Boolean(c.isFugaz))) ||
        pickCard((c) => c.type === 'skill' && c.tier === 1);
      const slowSkill =
        pickCard((c) => c.type === 'skill' && c.tier === 1 && c.speed === 'lenta') ||
        pickCard((c) => c.type === 'unit' && c.tier === 1);
      [t1UnitA, t1UnitB, t1UnitC, quickSkill, slowSkill].forEach((c) => {
        if (c) tutorialHand.push(c);
      });
      while (tutorialHand.length < 5 && pool.length > 0) {
        const nextCard = pool.shift();
        if (nextCard) tutorialHand.push(nextCard);
      }

      return {
        id: 'player',
        name: 'Aprendiz (Você)',
        isAi: false,
        hp: 5,
        maxHp: 5,
        deck: pool,
        hand: tutorialHand,
        board: [],
        graveyard: [],
        hasDrawnThisRound: true,
        drawsCountThisRound: 1,
        extraDrawAvailableThisRound: false,
        extraDrawNextRound: false,
        summonsThisRound: 0,
        borRevivedOnce: false,
        zaelUsed: false,
        purpleExtraHpSlots: 0,
      };
    }

    const cardIds = customPlayerDeckCardIds && customPlayerDeckCardIds.length === 20 ? customPlayerDeckCardIds : DEFAULT_DECK_IDS;
    const fullDeck = buildDeckFromTemplateIds(cardIds);
    const dealt = dealInitialHand(fullDeck);
    const { card: autoDrawn, remainingDeck } = drawCardCurve(dealt.remainingDeck, 1);
    const initialHand = autoDrawn ? [...dealt.hand, autoDrawn] : dealt.hand;
    return {
      id: 'player',
      name: isTestingArena ? 'Duelista de Testes' : 'Você (Duelista)',
      isAi: false,
      hp: isTestingArena ? 30 : 5,
      maxHp: isTestingArena ? 30 : 5,
      deck: remainingDeck,
      hand: initialHand,
      board: [],
      graveyard: [],
      hasDrawnThisRound: true,
      drawsCountThisRound: 1,
      extraDrawAvailableThisRound: false,
      extraDrawNextRound: false,
      summonsThisRound: 0,
      borRevivedOnce: false,
      zaelUsed: false,
      purpleExtraHpSlots: 0,
    };
  });

  const [opponent, setOpponent] = useState<PlayerState>(() => {
    if (isOnlinePvp && onlineMatchBootstrap) {
      return hydratePlayerState(onlineMatchBootstrap.initialSnapshot.opponent);
    }

    if (isTutorialMode) {
      const fullDeck = buildDeckFromTemplateIds(TUTORIAL_INSTRUCTOR_DECK_IDS);
      const pool = [...fullDeck];
      const pickCard = (predicate: (c: CardInstance) => boolean): CardInstance | null => {
        const idx = pool.findIndex(predicate);
        if (idx === -1) return null;
        return pool.splice(idx, 1)[0];
      };
      const instructorHand: CardInstance[] = [];
      const u1 = pickCard((c) => c.type === 'unit' && c.tier === 1);
      const u2 = pickCard((c) => c.type === 'unit' && c.tier === 1);
      if (u1) instructorHand.push(u1);
      if (u2) instructorHand.push(u2);
      while (instructorHand.length < 5 && pool.length > 0) {
        const nextCard = pool.shift();
        if (nextCard) instructorHand.push(nextCard);
      }

      return {
        id: 'opponent',
        name: 'Instrutor Celentia',
        isAi: true,
        hp: 4,
        maxHp: 4,
        deck: pool,
        hand: instructorHand,
        board: [],
        graveyard: [],
        hasDrawnThisRound: true,
        drawsCountThisRound: 1,
        extraDrawAvailableThisRound: false,
        extraDrawNextRound: false,
        summonsThisRound: 0,
        borRevivedOnce: false,
        zaelUsed: false,
        purpleExtraHpSlots: 0,
      };
    }

    const opponentDeckIds = isTestingArena
      ? DEFAULT_DECK_IDS
      : activeAiDeckPreset?.cardIds || DEFAULT_DECK_IDS;
    const fullDeck = buildDeckFromTemplateIds(opponentDeckIds);
    const dealt = dealInitialHand(fullDeck);
    const { card: autoDrawn, remainingDeck } = drawCardCurve(dealt.remainingDeck, 1);
    const initialHand = autoDrawn ? [...dealt.hand, autoDrawn] : dealt.hand;

    if (isTestingArena) {
      return {
        id: 'opponent',
        name: 'IA de Testes (Controlável)',
        isAi: false,
        hp: 999,
        maxHp: 999,
        deck: remainingDeck,
        hand: initialHand,
        board: createDummyTargetCards(),
        graveyard: [],
        hasDrawnThisRound: false,
        drawsCountThisRound: 0,
        extraDrawAvailableThisRound: false,
        extraDrawNextRound: false,
        summonsThisRound: 0,
        borRevivedOnce: false,
        zaelUsed: false,
        purpleExtraHpSlots: 0,
      };
    }
    return {
      id: 'opponent',
      name: activeAiDeckPreset ? `IA · ${activeAiDeckPreset.name}` : 'IA Estratégica',
      isAi: true,
      hp: 5,
      maxHp: 5,
      deck: remainingDeck,
      hand: initialHand,
      board: [],
      graveyard: [],
      hasDrawnThisRound: true,
      drawsCountThisRound: 1,
      extraDrawAvailableThisRound: false,
      extraDrawNextRound: false,
      summonsThisRound: 0,
      borRevivedOnce: false,
      zaelUsed: false,
      purpleExtraHpSlots: 0,
    };
  });

  // State refs to prevent stale closures during multi-step board mutations
  const playerRef = useRef<PlayerState>(player);
  const opponentRef = useRef<PlayerState>(opponent);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);
  useEffect(() => {
    opponentRef.current = opponent;
  }, [opponent]);

  // Combat selection states
  const [selectedAttackerIds, setSelectedAttackerIds] = useState<string[]>([]);
  const [declaredAttackers, setDeclaredAttackers] = useState<CardInstance[]>([]);
  const [assignedBlocks, setAssignedBlocks] = useState<Record<string, string>>({}); // attackerInstanceId -> defenderInstanceId
  const [assigningBlockForAttacker, setAssigningBlockForAttacker] = useState<CardInstance | null>(null);
  const [isDefendingPhase, setIsDefendingPhase] = useState<boolean>(false);
  const [activeCombatAttackerRole, setActiveCombatAttackerRole] = useState<'player' | 'opponent'>(() =>
    isOnlinePvp && onlineMatchBootstrap ? onlineMatchBootstrap.initialSnapshot.activeCombatAttackerRole : 'player'
  );
  const [combatResults, setCombatResults] = useState<CombatResultDetail[] | null>(null);
  const [tableCombatAnim, setTableCombatAnim] = useState<{
    stage: 'striking' | 'rebound' | 'death';
    results: CombatResultDetail[];
    attackerRole: 'player' | 'opponent';
    directDamageTotal: number;
    finalPlayerBoard: CardInstance[];
    finalOpponentBoard: CardInstance[];
    deadAttackers: CardInstance[];
    deadDefenders: CardInstance[];
    nextPlayerHp: number;
    nextOpponentHp: number;
    gameOverTrigger?: 'player' | 'opponent';
    gameOverReason?: string;
    resurrectedEvents?: Array<Omit<ConditionVfxEvent, 'id'>>;
    borPhoenixEvents?: Array<{ unitId: string; side: 'player' | 'opponent' }>;
  } | null>(null);

  // 3D Role Coin on left sidebar & golden wave beams round-transition state
  const roleCoinTargetRef = useRef<HTMLDivElement | null>(null);
  const [roundCoinTransition, setRoundCoinTransition] = useState<RoundCoinTransitionState | null>(null);
  const isRoundTransitioningRef = useRef<boolean>(false);
  const [isRoundTransitioning, setIsRoundTransitioning] = useState<boolean>(false);
  const [isRoleCoinManualSpin, setIsRoleCoinManualSpin] = useState<boolean>(false);

  // Round coin spin & new tier unlock highlight animations
  const prevRoundForBadgeRef = useRef<number>(round);
  const [roundCoinFlipAnim, setRoundCoinFlipAnim] = useState<boolean>(false);
  const [newlyUnlockedTier, setNewlyUnlockedTier] = useState<TierType | null>(null);

  useEffect(() => {
    const prev = prevRoundForBadgeRef.current;
    if (round === prev) return;
    prevRoundForBadgeRef.current = round;

    if (round <= 1 && prev > 1) {
      setRoundCoinFlipAnim(false);
      setNewlyUnlockedTier(null);
      return;
    }

    setRoundCoinFlipAnim(false);
    const rafId = requestAnimationFrame(() => {
      setRoundCoinFlipAnim(true);
    });
    const flipTimer = window.setTimeout(() => {
      setRoundCoinFlipAnim(false);
    }, 950);

    const getMaxTier = (r: number): TierType =>
      r >= 10 ? 6 : r >= 9 ? 5 : r >= 7 ? 4 : r >= 5 ? 3 : r >= 3 ? 2 : 1;
    const prevMaxTier = getMaxTier(prev);
    const nextMaxTier = getMaxTier(round);
    let unlockTimer: number | undefined;
    if (nextMaxTier > prevMaxTier) {
      setNewlyUnlockedTier(nextMaxTier);
      unlockTimer = window.setTimeout(() => {
        setNewlyUnlockedTier(null);
      }, 1500);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(flipTimer);
      if (unlockTimer !== undefined) window.clearTimeout(unlockTimer);
    };
  }, [round]);

  // Universal Level Up Cinematic FIFO Queue for all Tier 5 / Tier 6 progressive cards
  const [cinematicLevelUpQueue, setCinematicLevelUpQueue] = useState<
    Array<{
      id: string;
      card: CardInstance;
      awakenedPowerText: string;
    }>
  >([]);
  const cinematicLevelUp = cinematicLevelUpQueue[0] ?? null;

  // Umael summon modal: select ally to receive "Enfrentar"
  const [umaelModal, setUmaelModal] = useState<{
    umaelCard: CardInstance;
    allies: CardInstance[];
    ownerId?: 'player' | 'opponent';
  } | null>(null);

  // Enfrentar attack declaration modal
  const [enfrentarModal, setEnfrentarModal] = useState<{
    attackerQueue: CardInstance[];
    currentAttacker: CardInstance;
    attackingCards: CardInstance[];
    enemyCandidates: CardInstance[];
    forcedBlocks: Record<string, string>;
  } | null>(null);

  // Persistent record of locked blocks forced by Enfrentar
  const [enfrentarLockedBlocks, setEnfrentarLockedBlocks] = useState<Record<string, string>>({});

  // Card draw and discard visual animations
  const [drawingCardAnim, setDrawingCardAnim] = useState<{ card: CardInstance; ownerId: 'player' | 'opponent' } | null>(null);
  const [discardingCardAnim, setDiscardingCardAnim] = useState<{ card: CardInstance; ownerId: 'player' | 'opponent' } | null>(null);
  const [drawEvents, setDrawEvents] = useState<DrawAnimEvent[]>([]);
  const [discardEvents, setDiscardEvents] = useState<DiscardAnimEvent[]>([]);
  const [floatingSkillCards, setFloatingSkillCards] = useState<FloatingSkillCard[]>([]);

  // Efeitos visuais de partículas elementais na arena (Fogo, Gelo, Terra, etc.)
  const [elementalBurst, setElementalBurst] = useState<ElementalVfxBurst | null>(null);

  const {
    playmat,
    elementalParticles,
    isMobileView,
    animationMode,
    combatAnimations,
    ambientAnimations,
    turnIndicatorMode,
    reduceGpuBlur,
  } = useVisualPreferences();

  animationModeRef.current = animationMode;

  const effectiveTurnIndicatorMode: 'full' | 'static' | 'off' =
    turnIndicatorMode === 'off'
      ? 'off'
      : turnIndicatorMode === 'static' || animationMode !== 'full'
      ? 'static'
      : 'full';

  const triggerElementalBurst = useCallback(
    (card: CardInstance, type: 'summon' | 'power', position: 'player' | 'opponent' | 'center' = 'center') => {
      if (!elementalParticles || animationMode === 'off') return;
      setElementalBurst({
        id: `vfx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        element: card.element,
        cardName: card.name,
        type,
        position,
      });
      // Auto-limpeza após 2 segundos
      setTimeout(() => {
        setElementalBurst((curr) => (curr ? null : null));
      }, 2000);
    },
    [elementalParticles]
  );

  // Animação dedicada de Tornado de Gelo para a habilidade Crio-Gênese
  const [crioGeneseVfx, setCrioGeneseVfx] = useState<CrioGeneseVfxState | null>(null);

  const triggerCrioGeneseVfx = useCallback(
    (targetSide: 'opponent' | 'player' | 'center', enemyUnitCount = 5, targetLabel?: string) => {
      setCrioGeneseVfx({
        id: `crio_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        targetSide,
        enemyUnitCount: Math.max(3, enemyUnitCount),
        targetLabel,
      });
    },
    []
  );

  // Animações dedicadas das Cartas de Habilidade (Enganar, Levantar Moral, Labareda Solar, Desafio Real, etc.)
  const [skillVfx, setSkillVfx] = useState<SkillVfxState | null>(null);
  const [conditionVfxEvents, setConditionVfxEvents] = useState<ConditionVfxEvent[]>([]);
  const pendingRevealTurnNextRef = useRef<'player' | 'opponent' | null>(null);

  const getVisibleDomRect = useCallback((selector: string): RectSnapshot | null => {
    if (typeof document === 'undefined') return null;
    const nodes = document.querySelectorAll(selector);
    for (let i = 0; i < nodes.length; i++) {
      const r = nodes[i].getBoundingClientRect();
      if (r.width > 4 && r.height > 4) {
        return { left: r.left, top: r.top, width: r.width, height: r.height };
      }
    }
    return null;
  }, []);

  const [resurrectingUnitIds, setResurrectingUnitIds] = useState<Record<string, boolean>>({});

  const queueConditionVfx = useCallback((items: Array<Omit<ConditionVfxEvent, 'id'>>) => {
    if (items.length === 0) return;
    const stamp = Date.now();
    setConditionVfxEvents(
      items.map((item, idx) => ({
        ...item,
        id: `condvfx_${item.condition}_${stamp}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      }))
    );
  }, []);

  const triggerResurrectionVfx = useCallback(
    (
      items: Array<{
        unitId: string;
        unitName: string;
        side: 'player' | 'opponent';
        labelOverride?: string;
      }>,
      delayMs = 0
    ) => {
      if (items.length === 0) return;
      const run = () => {
        setResurrectingUnitIds((prev) => {
          const next = { ...prev };
          items.forEach((it) => {
            next[it.unitId] = true;
          });
          return next;
        });
        queueConditionVfx(
          items.map((it) => ({
            condition: 'ressurreicao' as const,
            targetUnitId: it.unitId,
            targetUnitName: it.unitName,
            targetSide: it.side,
            labelOverride: it.labelOverride || `🪽✨ RESSURREIÇÃO! ${it.unitName} RENASCEU!`,
          }))
        );
        window.setTimeout(() => {
          setResurrectingUnitIds((prev) => {
            const next = { ...prev };
            items.forEach((it) => {
              delete next[it.unitId];
            });
            return next;
          });
        }, 2150);
      };

      if (delayMs > 0) {
        window.setTimeout(run, delayMs);
      } else {
        run();
      }
    },
    [queueConditionVfx]
  );

  const triggerSkillVfx = useCallback(
    (
      skillType: SkillVfxType,
      targetSide: 'player' | 'opponent' | 'center',
      targetUnitId?: string,
      targetName?: string,
      isAuroraIce?: boolean
    ) => {
      setSkillVfx({
        id: `skillvfx_${skillType}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        skillType,
        targetSide,
        targetUnitId,
        targetName,
        isAuroraIce,
      });
    },
    []
  );

  // Fila sequencial de animações exclusivas de cartas de Unidade (Canvas 60fps)
  const [unitVfxQueue, setUnitVfxQueue] = useState<UnitVfxEvent[]>([]);
  const unitVfxQueueRef = useRef<UnitVfxEvent[]>([]);
  const [activeUnitVfx, setActiveUnitVfx] = useState<UnitVfxEvent | null>(null);
  const activeUnitVfxRef = useRef<UnitVfxEvent | null>(null);

  const queueUnitVfx = useCallback((event: Omit<UnitVfxEvent, 'id'>) => {
    const newEvent: UnitVfxEvent = {
      ...event,
      id: `uvfx_${event.type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    if (!activeUnitVfxRef.current) {
      activeUnitVfxRef.current = newEvent;
      setActiveUnitVfx(newEvent);
    } else {
      unitVfxQueueRef.current = [...unitVfxQueueRef.current, newEvent];
      setUnitVfxQueue(unitVfxQueueRef.current);
    }
  }, []);

  const [borPhoenixRevivingUnitIds, setBorPhoenixRevivingUnitIds] = useState<Record<string, boolean>>({});

  const triggerBorPhoenixVfx = useCallback(
    (unitId: string, side: 'player' | 'opponent', delayMs = 0) => {
      const run = () => {
        setBorPhoenixRevivingUnitIds((prev) => ({ ...prev, [unitId]: true }));
        queueUnitVfx({
          type: 'bor_phoenix_rebirth',
          sourceId: unitId,
          ownerSide: side,
          label: '🔥🦅 O MESOFÊNIX RENASCEU! +50% ATRIBUTOS · CURA',
        });
        window.setTimeout(() => {
          setBorPhoenixRevivingUnitIds((prev) => {
            const next = { ...prev };
            delete next[unitId];
            return next;
          });
        }, 2450);
      };

      if (delayMs > 0) {
        window.setTimeout(run, delayMs);
      } else {
        run();
      }
    },
    [queueUnitVfx]
  );

  const handleUnitVfxComplete = useCallback(() => {
    if (unitVfxQueueRef.current.length > 0) {
      const [next, ...rest] = unitVfxQueueRef.current;
      unitVfxQueueRef.current = rest;
      setUnitVfxQueue(rest);
      activeUnitVfxRef.current = next;
      setActiveUnitVfx(next);
    } else {
      activeUnitVfxRef.current = null;
      setActiveUnitVfx(null);
    }
  }, []);

  // Exclusive Divine Victory Animation for Aliança Angiris — Conselho Celestial
  const [celestialVictoryAnim, setCelestialVictoryAnim] = useState<CelestialCouncilVictoryState | null>(null);
  const celestialVictoryTriggeredRef = useRef<boolean>(false);

  const isBusyByAnimation = Boolean(
    activeUnitVfx ||
    unitVfxQueue.length > 0 ||
    skillVfx ||
    crioGeneseVfx ||
    conditionVfxEvents.length > 0 ||
    tableCombatAnim ||
    roundCoinTransition ||
    isRoundTransitioning ||
    Boolean(celestialVictoryAnim?.active)
  );

  // Modals & UI helpers
  const [inspectedCard, setInspectedCard] = useState<CardInstance | null>(null);
  const [hoveredArenaCard, setHoveredArenaCard] = useState<{
    instanceId: string;
    card: CardInstance;
    rect: DOMRect;
    hasAliancaAngiris: boolean;
    zone: 'board' | 'hand';
  } | null>(null);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isMobileLogOpen, setIsMobileLogOpen] = useState<boolean>(false);
  const [graveyardModalOwner, setGraveyardModalOwner] = useState<'player' | 'opponent' | null>(null);

  const [gameOverWinner, setGameOverWinner] = useState<'player' | 'opponent' | 'draw' | null>(null);
  const [gameOverReason, setGameOverReason] = useState<string | undefined>(undefined);
  const [currentRankPoints, setCurrentRankPoints] = useState<number>(() => loadRankPoints());
  const [rankDelta, setRankDelta] = useState<number | null>(null);
  const [rematchStatus, setRematchStatus] = useState<RematchRequestStatus>('idle');
  const [rematchStatusMessage, setRematchStatusMessage] = useState<string | null>(null);
  const [incomingRematchFrom, setIncomingRematchFrom] = useState<string | null>(null);
  const [onlineRematchPrep, setOnlineRematchPrep] = useState<PvpRematchPrepDTO | null>(null);
  const [localAiRematchDeadline, setLocalAiRematchDeadline] = useState<number | null>(null);

  // Finishing Cannon Strike Cinematic Animation
  const [finishingCannonAnim, setFinishingCannonAnim] = useState<{
    active: boolean;
    victor: 'player' | 'opponent';
    stage: 'aiming' | 'firing' | 'impact';
  } | null>(null);

  // Match-wide cards drawn tracker for Karcelios (+1 Power for every card drawn across the entire match)
  const matchDrawsTotalRef = useRef<number>(
    isOnlinePvp && onlineMatchBootstrap
      ? (onlineMatchBootstrap.initialSnapshot.player.totalCardsDrawnMatch ?? 14)
      : 14
  );

  // Online LAN PvP WebSocket synchronization refs
  const onlineSeqRef = useRef<number>(
    isOnlinePvp && onlineMatchBootstrap ? onlineMatchBootstrap.initialSnapshot.seq : 0
  );
  const isApplyingRemoteStateRef = useRef<boolean>(false);
  const remoteHasVetoRef = useRef<boolean>(
    Boolean(isOnlinePvp && onlineMatchBootstrap?.initialSnapshot.opponentHasVeto)
  );
  const lastSyncedSigRef = useRef<string>('');
  const pendingSpellExecutorRef = useRef<(() => void) | null>(null);
  const onlineMatchRecordedRef = useRef<boolean>(false);
  const [opponentDisconnectNotice, setOpponentDisconnectNotice] = useState<number | null>(null);

  // Projectile animation overlay for linked cards (Fagulha Estelar, Flecha Elétrica)
  const [projectileAnim, setProjectileAnim] = useState<{
    type: 'fagulhas' | 'flecha_eletrica';
    targetName: string;
  } | null>(null);

  // Target modal state
  const [targetModal, setTargetModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    candidates: CardInstance[];
    onSelect: (target: CardInstance) => void;
    getBadgeLabel?: (card: CardInstance) => string | undefined;
  }>({
    isOpen: false,
    title: '',
    description: '',
    candidates: [],
    onSelect: () => {},
  });

  // Fila de recaptura automática de Barelio no início de cada rodada (sem gastar o turno)
  const [pendingBarelioRecaptureQueue, setPendingBarelioRecaptureQueue] = useState<
    Array<{ barelioId: string; ownerSide: 'player' | 'opponent' }>
  >([]);

  // Discard full-board modal state
  const [discardModal, setDiscardModal] = useState<{
    isOpen: boolean;
    incomingCard: CardInstance | null;
    ownerId: 'player' | 'opponent';
  }>({
    isOpen: false,
    incomingCard: null,
    ownerId: 'player',
  });

  // Reveal Selection Modal state (Gohr or Revelar condition)
  const [revealModal, setRevealModal] = useState<{
    isOpen: boolean;
    cards: CardInstance[];
    ownerId: 'player' | 'opponent';
  }>({
    isOpen: false,
    cards: [],
    ownerId: 'player',
  });

  // Retornar Selection Modal state (Kamui / Krust / Reencarnação — escolhe 1 de até 3 cartas da cripta)
  const [retornarModal, setRetornarModal] = useState<{
    isOpen: boolean;
    cards: CardInstance[];
    bonusElement?: ElementType;
    bonusPower: number;
    sourceName: string;
    ownerId: 'player' | 'opponent';
  }>({
    isOpen: false,
    cards: [],
    bonusElement: undefined,
    bonusPower: 0,
    sourceName: '',
    ownerId: 'player',
  });
  const pendingRetornarTurnNextRef = useRef<'player' | 'opponent' | null>(null);
  const pendingTargetTurnNextRef = useRef<'player' | 'opponent' | null>(null);

  const flushPendingSummonTargetTurn = useCallback(() => {
    if (pendingTargetTurnNextRef.current) {
      const next = pendingTargetTurnNextRef.current;
      pendingTargetTurnNextRef.current = null;
      advanceConsumedTurn(next);
    }
  }, [advanceConsumedTurn]);

  // Fullscreen state & toggle (especially useful on Mobile Landscape)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  useEffect(() => {
    const syncFullscreen = () => {
      const doc = document as unknown as {
        fullscreenElement?: Element | null;
        webkitFullscreenElement?: Element | null;
      };
      setIsFullscreen(Boolean(doc.fullscreenElement || doc.webkitFullscreenElement));
    };
    syncFullscreen();
    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('webkitfullscreenchange', syncFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
      document.removeEventListener('webkitfullscreenchange', syncFullscreen);
    };
  }, []);

  const handleToggleFullscreen = async () => {
    sound.playTick();
    try {
      const doc = document as unknown as {
        fullscreenElement?: Element | null;
        webkitFullscreenElement?: Element | null;
        exitFullscreen?: () => Promise<void>;
        webkitExitFullscreen?: () => Promise<void>;
      };
      const root = document.documentElement as unknown as {
        requestFullscreen?: () => Promise<void>;
        webkitRequestFullscreen?: () => Promise<void>;
      };
      if (doc.fullscreenElement || doc.webkitFullscreenElement) {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
      } else {
        if (root.requestFullscreen) await root.requestFullscreen();
        else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
      }
    } catch {
      // Ignore fullscreen rejection if browser/iframe blocks it
    }
  };

  // Mobile Tap-to-Inspect + Drag-to-Summon state & pointer handlers
  const mobileBattlefieldDropRef = useRef<HTMLDivElement | null>(null);
  const [mobileDragCard, setMobileDragCard] = useState<{
    card: CardInstance;
    ownerId: 'player' | 'opponent';
    isPlayable: boolean;
    unplayableReason?: string;
    pointerId: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isDragging: boolean;
    isOverTable: boolean;
  } | null>(null);
  const mobileDragRef = useRef(mobileDragCard);
  mobileDragRef.current = mobileDragCard;
  const mobileDragSkipClickRef = useRef<boolean>(false);
  const handlePlayCardRef = useRef<(card: CardInstance, ownerId: 'player' | 'opponent') => void>(() => {});
  const addLogRef = useRef<(text: string, type?: GameLogEntry['type']) => void>(() => {});

  const handleArenaCardHoverEnter = useCallback(
    (
      e: React.MouseEvent<HTMLElement>,
      card: CardInstance,
      zone: 'board' | 'hand',
      hasAngiris: boolean = false
    ) => {
      if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) {
        return;
      }
      if (
        inspectedCard ||
        tableCombatAnim ||
        gameOverWinner ||
        graveyardModalOwner ||
        isSettingsOpen ||
        isRulesOpen ||
        mobileDragRef.current?.isDragging
      ) {
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      setHoveredArenaCard({
        instanceId: card.instanceId,
        card,
        rect,
        hasAliancaAngiris: hasAngiris,
        zone,
      });
    },
    [inspectedCard, tableCombatAnim, gameOverWinner, graveyardModalOwner, isSettingsOpen, isRulesOpen]
  );

  const handleArenaCardHoverLeave = useCallback((instanceId: string) => {
    setHoveredArenaCard((prev) => (prev && prev.instanceId === instanceId ? null : prev));
  }, []);

  useEffect(() => {
    setHoveredArenaCard(null);
  }, [inspectedCard, tableCombatAnim, gameOverWinner, round, graveyardModalOwner, isSettingsOpen, isRulesOpen]);

  useEffect(() => {
    if (!hoveredArenaCard) return;
    const clearHover = () => setHoveredArenaCard(null);
    window.addEventListener('scroll', clearHover, true);
    window.addEventListener('resize', clearHover);
    return () => {
      window.removeEventListener('scroll', clearHover, true);
      window.removeEventListener('resize', clearHover);
    };
  }, [hoveredArenaCard]);

  const resolvedHoveredArenaCard = useMemo(() => {
    if (!hoveredArenaCard || inspectedCard || tableCombatAnim || gameOverWinner) {
      return null;
    }
    const id = hoveredArenaCard.instanceId;
    const liveOpponentBoard = opponent.board.find((c) => c.instanceId === id);
    if (liveOpponentBoard) {
      return {
        ...hoveredArenaCard,
        card: liveOpponentBoard,
        hasAliancaAngiris: hasAliancaAngiris(liveOpponentBoard, opponent.board),
      };
    }
    const livePlayerBoard = player.board.find((c) => c.instanceId === id);
    if (livePlayerBoard) {
      return {
        ...hoveredArenaCard,
        card: livePlayerBoard,
        hasAliancaAngiris: hasAliancaAngiris(livePlayerBoard, player.board),
      };
    }
    const livePlayerHand = player.hand.find((c) => c.instanceId === id);
    if (livePlayerHand) {
      return {
        ...hoveredArenaCard,
        card: livePlayerHand,
        hasAliancaAngiris: hasAliancaAngiris(livePlayerHand, player.board),
      };
    }
    if (!opponent.isAi) {
      const liveOpponentHand = opponent.hand.find((c) => c.instanceId === id);
      if (liveOpponentHand) {
        return {
          ...hoveredArenaCard,
          card: liveOpponentHand,
          hasAliancaAngiris: hasAliancaAngiris(liveOpponentHand, opponent.board),
        };
      }
    }
    return null;
  }, [
    hoveredArenaCard,
    inspectedCard,
    tableCombatAnim,
    gameOverWinner,
    opponent.board,
    opponent.hand,
    opponent.isAi,
    player.board,
    player.hand,
  ]);

  useEffect(() => {
    if (!mobileDragCard) return;

    const handlePointerMove = (e: PointerEvent) => {
      const drag = mobileDragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;

      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      let isDragging = drag.isDragging;

      if (!isDragging) {
        if (Math.hypot(dx, dy) < 10) return;
        // Preserve smooth horizontal scrolling in the mobile hand tray unless dragging upward/vertically
        if (Math.abs(dx) > Math.abs(dy) * 1.25 && dy > -12) {
          setMobileDragCard(null);
          return;
        }
        isDragging = true;
        mobileDragSkipClickRef.current = true;
      }

      const rect = mobileBattlefieldDropRef.current?.getBoundingClientRect();
      const isOverTable = Boolean(
        rect &&
          e.clientX >= rect.left - 12 &&
          e.clientX <= rect.right + 12 &&
          e.clientY >= rect.top - 12 &&
          e.clientY <= rect.bottom + 12
      );

      setMobileDragCard((prev) =>
        prev && prev.pointerId === e.pointerId
          ? {
              ...prev,
              isDragging: true,
              currentX: e.clientX,
              currentY: e.clientY,
              isOverTable,
            }
          : prev
      );
    };

    const handlePointerUp = (e: PointerEvent) => {
      const drag = mobileDragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      setMobileDragCard(null);

      if (drag.isDragging) {
        mobileDragSkipClickRef.current = true;
        window.setTimeout(() => {
          mobileDragSkipClickRef.current = false;
        }, 120);
        if (drag.isOverTable) {
          if (drag.isPlayable) {
            handlePlayCardRef.current(drag.card, drag.ownerId);
          } else {
            sound.playDiscard();
            addLogRef.current(drag.unplayableReason || 'Esta carta não pode ser jogada agora.', 'info');
          }
        }
      } else {
        mobileDragSkipClickRef.current = true;
        window.setTimeout(() => {
          mobileDragSkipClickRef.current = false;
        }, 120);
        setInspectedCard(drag.card);
      }
    };

    const handlePointerCancel = (e: PointerEvent) => {
      const drag = mobileDragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      setMobileDragCard(null);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [Boolean(mobileDragCard)]);

  // Action Confirmation Modal (e.g., Voto do Silêncio)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  // Zyk Discard Modal (Tribute of 2 cards from board or hand)
  const [zykDiscardModal, setZykDiscardModal] = useState<{
    isOpen: boolean;
    zykCard: CardInstance;
    selectedCardIds: string[];
    ownerId?: 'player' | 'opponent';
  } | null>(null);

  // Nova Regra Global: Janela de Contra-Resposta de Cartas de Habilidade
  const [pendingSpell, setPendingSpell] = useState<{
    spellCard: CardInstance;
    casterId: 'player' | 'opponent';
    description: string;
    targetName?: string;
    targetUnitId?: string;
    accepted?: boolean;
    consumesTurn?: boolean;
    executeEffect: () => void;
  } | null>(() => {
    if (isOnlinePvp && onlineMatchBootstrap?.initialSnapshot.pendingSpell) {
      const sp = onlineMatchBootstrap.initialSnapshot.pendingSpell;
      return {
        spellCard: hydrateCardInstance(sp.spellCard),
        casterId: sp.casterId,
        description: sp.description,
        targetName: sp.targetName,
        targetUnitId: sp.targetUnitId,
        accepted: sp.accepted,
        consumesTurn: sp.consumesTurn,
        executeEffect: () => {},
      };
    }
    return null;
  });

  const triggerInteractiveReveal = (ownerId: 'player' | 'opponent') => {
    const currOwner = ownerId === 'player' ? playerRef.current : opponentRef.current;
    if (currOwner.deck.length === 0) {
      addLog(`🔮 Revelação: O baralho de ${currOwner.name} está vazio, nenhuma carta para revelar!`, 'info');
      if (pendingRevealTurnNextRef.current) {
        const next = pendingRevealTurnNextRef.current;
        pendingRevealTurnNextRef.current = null;
        setTimeout(() => {
          advanceConsumedTurn(next);
        }, 80);
      }
      return;
    }
    // Revela as 5 primeiras cartas do topo do baralho com portal místico em espiral
    const sample = currOwner.deck.slice(0, Math.min(5, currOwner.deck.length));
    sound.playSpell();
    queueConditionVfx([{ condition: 'revelar', targetSide: ownerId === 'player' ? 'center' : 'opponent' }]);
    setRevealModal({
      isOpen: true,
      cards: sample,
      ownerId,
    });
  };

  const handleSelectRevealedCard = (chosenCard: CardInstance) => {
    const ownerId = revealModal.ownerId;
    const setter = ownerId === 'player' ? setPlayer : setOpponent;
    const ownerName = ownerId === 'player' ? playerRef.current.name : opponentRef.current.name;
    sound.playDraw();
    setter((prev) => ({
      ...prev,
      deck: prev.deck.filter((c) => c.instanceId !== chosenCard.instanceId),
      hand: [...prev.hand, chosenCard],
    }));
    addLog(`🔮 REVELAÇÃO: ${ownerName} escolheu ${chosenCard.name} do baralho e a adicionou à sua mão!`, 'spell');
    setRevealModal({ isOpen: false, cards: [], ownerId: 'player' });
    if (pendingRevealTurnNextRef.current) {
      const next = pendingRevealTurnNextRef.current;
      pendingRevealTurnNextRef.current = null;
      advanceConsumedTurn(next);
    }
  };

  const applyRecoveredGraveyardCard = (
    chosenCard: CardInstance,
    ownerId: 'player' | 'opponent',
    bonusPower: number,
    sourceName: string,
    bonusElement?: ElementType
  ) => {
    const recovered: CardInstance = {
      ...chosenCard,
      conditions: new Set(chosenCard.conditions),
      conditionSources: chosenCard.conditionSources ? { ...chosenCard.conditionSources } : undefined,
      extraElements: chosenCard.extraElements ? [...chosenCard.extraElements] : undefined,
    };
    const isClassBonus = bonusPower > 0 && Boolean(bonusElement) && hasCardClass(recovered, bonusElement!);
    if (isClassBonus) {
      addPowerPoints(recovered, bonusPower);
    }
    const setter = ownerId === 'player' ? setPlayer : setOpponent;
    const ownerName = ownerId === 'player' ? playerRef.current.name : opponentRef.current.name;
    let addedToHand = false;
    setter((prev) => {
      if (prev.hand.length >= 8) {
        return prev;
      }
      addedToHand = true;
      return {
        ...prev,
        graveyard: prev.graveyard.filter((c) => c.instanceId !== chosenCard.instanceId),
        hand: [...prev.hand, recovered],
      };
    });
    if ((ownerId === 'player' ? playerRef.current.hand.length : opponentRef.current.hand.length) >= 8 && !addedToHand) {
      sound.playDiscard();
      addLog(
        `🕊️ [RETORNAR - ${sourceName}] Mão de ${ownerName} cheia (8/8): ${recovered.name} permaneceu no cemitério.`,
        'info'
      );
      return;
    }
    sound.playSpell();
    if (isClassBonus && bonusElement) {
      const bonusBadge = bonusElement === 'Água' ? '🌊✨' : bonusElement === 'Divino' ? '🕊️⚜️' : '🕊️✨';
      addLog(
        `${bonusBadge} [RETORNAR - ${sourceName}] ${ownerName} retornou ${recovered.name} para a mão! Por ser da classe ${bonusElement.toUpperCase()}, recebeu +${bonusPower} de Poder (Novo Poder: ${recovered.power})!`,
        'spell'
      );
    } else {
      addLog(
        `🕊️ [RETORNAR - ${sourceName}] ${ownerName} escolheu ${recovered.name} do cemitério e a retornou para a mão!`,
        'spell'
      );
    }
  };

  const triggerRetornarFlow = (
    ownerId: 'player' | 'opponent',
    bonusPower: number,
    sourceName: string,
    deferTurnTo?: 'player' | 'opponent' | null,
    bonusElement?: ElementType
  ) => {
    const ownerState = ownerId === 'player' ? playerRef.current : opponentRef.current;
    if (ownerState.graveyard.length === 0) {
      addLog(`🕊️ [RETORNAR - ${sourceName}] O cemitério de ${ownerState.name} está vazio — nenhuma carta para retornar.`, 'info');
      if (deferTurnTo) {
        pendingRetornarTurnNextRef.current = null;
        setTimeout(() => {
          advanceConsumedTurn(deferTurnTo);
        }, 80);
      }
      return;
    }
    const shuffled = [...ownerState.graveyard].sort(() => Math.random() - 0.5);
    const sample = shuffled.slice(0, Math.min(3, shuffled.length));

    if (!ownerState.isAi) {
      if (deferTurnTo) {
        pendingRetornarTurnNextRef.current = deferTurnTo;
      }
      sound.playSpell();
      queueConditionVfx([{ condition: 'retorno', targetSide: ownerId === 'player' ? 'center' : 'opponent' }]);
      setRetornarModal({
        isOpen: true,
        cards: sample,
        bonusElement,
        bonusPower,
        sourceName,
        ownerId,
      });
    } else {
      const classPick =
        bonusPower > 0 && bonusElement ? sample.find((c) => hasCardClass(c, bonusElement)) : undefined;
      const chosen =
        classPick ||
        [...sample].sort((a, b) => (b.tier * 100 + b.atk + b.power) - (a.tier * 100 + a.atk + a.power))[0];
      if (chosen) {
        queueConditionVfx([{ condition: 'retorno', targetSide: 'opponent' }]);
        applyRecoveredGraveyardCard(chosen, ownerId, bonusPower, sourceName, bonusElement);
      }
    }
  };

  const handleSelectRetornarCard = (chosenCard: CardInstance) => {
    const { bonusPower, bonusElement, sourceName, ownerId } = retornarModal;
    applyRecoveredGraveyardCard(chosenCard, ownerId, bonusPower, sourceName, bonusElement);
    setRetornarModal({
      isOpen: false,
      cards: [],
      bonusElement: undefined,
      bonusPower: 0,
      sourceName: '',
      ownerId: 'player',
    });
    if (pendingRetornarTurnNextRef.current) {
      const next = pendingRetornarTurnNextRef.current;
      pendingRetornarTurnNextRef.current = null;
      advanceConsumedTurn(next);
    }
  };

  const triggerAiReveal = () => {
    const currOpp = opponentRef.current;
    if (currOpp.deck.length === 0) return;
    // IA revela as 5 primeiras cartas do topo do baralho e escolhe a mais forte
    const sample = currOpp.deck.slice(0, Math.min(5, currOpp.deck.length));
    const best = [...sample].sort((a, b) => (b.tier * 100 + b.atk + b.def) - (a.tier * 100 + a.atk + a.def))[0];
    if (best) {
      sound.playSpell();
      queueConditionVfx([{ condition: 'revelar', targetSide: 'opponent' }]);
      addLog(`🔮 REVELAÇÃO: ${currOpp.name} revelou as cartas do topo do baralho e escolheu uma para sua mão!`, 'spell');
      setOpponent((prev) => ({
        ...prev,
        deck: prev.deck.filter((c) => c.instanceId !== best.instanceId),
        hand: [...prev.hand, best],
      }));
    }
  };

  // Game log ticker
  const [logs, setLogs] = useState<GameLogEntry[]>(() => {
    if (isOnlinePvp && onlineMatchBootstrap?.initialSnapshot.logs?.length) {
      return onlineMatchBootstrap.initialSnapshot.logs;
    }
    return [
      {
        id: 'init',
        text: 'Partida iniciada! Ambos os duelistas receberam 6 cartas. Você é o Atacante da Rodada 1.',
        type: 'info',
        timestamp: Date.now(),
      },
    ];
  });

  const addLog = useCallback((text: string, type: GameLogEntry['type'] = 'info') => {
    setLogs((prev) => [
      { id: `${Date.now()}_${Math.random()}`, text, type, timestamp: Date.now() },
      ...prev.slice(0, 19),
    ]);
  }, []);
  addLogRef.current = addLog;

  // Auxiliar compartilhado de captura de Barelio, o Carcereiro (invocação e recaptura automática de início de rodada)
  const executeBarelioCapture = useCallback(
    (barelioId: string, ownerSide: 'player' | 'opponent', target: CardInstance) => {
      const isOwnerPlayer = ownerSide === 'player';
      const setOwner = isOwnerPlayer ? setPlayer : setOpponent;
      const setOpposite = isOwnerPlayer ? setOpponent : setPlayer;
      const enemySide: 'player' | 'opponent' = isOwnerPlayer ? 'opponent' : 'player';

      sound.playSpell();
      const targetRect = getVisibleDomRect(`[data-unit-instance-id="${target.instanceId}"]`);
      const capturedTargetPoint = targetRect
        ? [
            {
              x: targetRect.left + targetRect.width / 2,
              y: targetRect.top + targetRect.height / 2,
              w: targetRect.width,
              h: targetRect.height,
            },
          ]
        : undefined;

      queueUnitVfx({
        type: 'barelio_chains_imprison',
        sourceId: barelioId,
        targetIds: [target.instanceId],
        targetPoints: capturedTargetPoint,
        ownerSide,
        label: `⛓️🌑 BARELIO · CAPTUROU ${target.name.toUpperCase()} EM SUAS CORRENTES!`,
      });
      queueConditionVfx([
        {
          condition: 'capturar',
          targetUnitId: barelioId,
          targetUnitName: target.name,
          targetSide: ownerSide,
        },
      ]);

      // Se a unidade capturada já mantinha outra unidade presa, liberta aquela de volta!
      const freedSubPrisoner = target.imprisonedUnit;
      const prisonerClone: CardInstance = {
        ...target,
        imprisonedUnit: undefined,
        imprisonedOriginalOwner: undefined,
        conditions: new Set(target.conditions),
        conditionSources: target.conditionSources ? { ...target.conditionSources } : undefined,
      };

      setOpposite((prev) => ({
        ...prev,
        board: prev.board.filter((u) => u.instanceId !== target.instanceId),
      }));

      setOwner((prev) => {
        const nextBoard = prev.board.map((u) =>
          u.instanceId === barelioId
            ? {
                ...u,
                imprisonedUnit: prisonerClone,
                imprisonedOriginalOwner: enemySide,
              }
            : u
        );
        if (freedSubPrisoner && freedSubPrisoner.hp > 0) {
          nextBoard.push({
            ...freedSubPrisoner,
            conditions: new Set(freedSubPrisoner.conditions),
          });
        }
        return {
          ...prev,
          board: nextBoard,
        };
      });

      addLog(
        `⛓️🌑 [Barelio, o Carcereiro] CAPTUROU ${target.name} da mesa inimiga e o prendeu em suas correntes (sofrerá 10 de dano por rodada preso até morrer ou ser salvo)!`,
        'spell'
      );
    },
    [addLog, queueConditionVfx, queueUnitVfx]
  );

  // Karcelios Universal Scaling: +1 Power for EVERY card drawn in the entire match (allied & enemy)
  const recordCardsDrawn = useCallback((count: number = 1) => {
    if (count <= 0) return;
    matchDrawsTotalRef.current += count;
    const currentTotal = matchDrawsTotalRef.current;
    const syncAllKarcelios = (cards: CardInstance[]) =>
      cards.map((c) => {
        if (c.templateId === 'n_karcelios' || c.name.toLowerCase().includes('karcelios')) {
          const calcPower = (c.basePower || 5) + currentTotal;
          return syncScaledPower(c, calcPower);
        }
        return c;
      });

    setPlayer((p) => ({
      ...p,
      deck: syncAllKarcelios(p.deck),
      hand: syncAllKarcelios(p.hand),
      board: syncAllKarcelios(p.board),
      totalCardsDrawnMatch: currentTotal,
    }));
    setOpponent((o) => ({
      ...o,
      deck: syncAllKarcelios(o.deck),
      hand: syncAllKarcelios(o.hand),
      board: syncAllKarcelios(o.board),
      totalCardsDrawnMatch: currentTotal,
    }));
  }, []);

  // Philio Universal Elimination Scaling: +2 Power permanently whenever an enemy unit is eliminated
  const triggerPhilioEliminationBonus = useCallback((eliminatedBy: 'player' | 'opponent', count: number = 1, victimIds?: string[]) => {
    if (count <= 0) return;
    const targetSetter = eliminatedBy === 'player' ? setPlayer : setOpponent;
    targetSetter((prev) => {
      let philioCount = 0;
      let finalPower = 0;
      let philioId: string | undefined;
      const updatedBoard = prev.board.map((c) => {
        if (
          (c.templateId === 'm_philio' || c.name.toLowerCase().includes('philio')) &&
          c.hp > 0 &&
          c.silencedRounds === 0
        ) {
          philioCount += 1;
          if (!philioId) philioId = c.instanceId;
          const bonus = 2 * count;
          const nextCard = withAddedPowerPoints(c, bonus);
          finalPower = nextCard.power;
          return nextCard;
        }
        return c;
      });

      if (philioCount > 0) {
        sound.playSpell();
        if (philioId) {
          queueUnitVfx({
            type: 'philio_soul_orb',
            sourceId: philioId,
            targetIds: victimIds,
            ownerSide: eliminatedBy,
          });
        }
        addLog(
          `🧬✨ [Philio] Unidade inimiga eliminada! Philio acumulou +${2 * count} de Poder permanente (Poder atual: ${finalPower})!`,
          'spell'
        );
      }
      return { ...prev, board: updatedBoard };
    });
  }, [addLog, queueUnitVfx]);

  // Universal cinematic level-up trigger (FIFO queue so simultaneous level-ups never overwrite each other)
  const triggerLevelUpCinematic = useCallback(
    (card: CardInstance, awakenedPowerText: string) => {
      const resolvedText =
        (awakenedPowerText && awakenedPowerText.trim()) ||
        getDefaultAwakenedPowerText(card);
      setCinematicLevelUpQueue((prev) => {
        if (prev.some((entry) => entry.card.instanceId === card.instanceId)) {
          return prev;
        }
        return [
          ...prev,
          {
            id: `${card.instanceId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            card: { ...card, level: 2 },
            awakenedPowerText: resolvedText,
          },
        ];
      });
    },
    []
  );

  const isAttackTransitioningRef = useRef<boolean>(false);
  const [isAttackTransitioning, setIsAttackTransitioning] = useState<boolean>(false);
  const isPostAttackFinalTurnRef = useRef<boolean>(
    Boolean(isOnlinePvp && onlineMatchBootstrap?.initialSnapshot.isPostAttackFinalTurn)
  );
  const [isPostAttackFinalTurn, setIsPostAttackFinalTurn] = useState<boolean>(() =>
    Boolean(isOnlinePvp && onlineMatchBootstrap?.initialSnapshot.isPostAttackFinalTurn)
  );
  const [postAttackRoundEndPending, setPostAttackRoundEndPending] = useState<boolean>(() =>
    Boolean(isOnlinePvp && onlineMatchBootstrap?.initialSnapshot.postAttackRoundEndPending)
  );

  // Build deterministic signature of current public+local match state to avoid redundant syncs
  const computeOnlineSyncSignature = useCallback(
    (snap: {
      round: number;
      roundTurnNumber: number;
      turnPlayer: 'player' | 'opponent';
      attackerRole: 'player' | 'opponent';
      activeCombatAttackerRole: 'player' | 'opponent';
      attackerConsecutivePasses: number;
      hasAttackedThisRound: boolean;
      isDefendingPhase: boolean;
      isPostAttackFinalTurn: boolean;
      postAttackRoundEndPending: boolean;
      declaredAttackers: CardInstance[];
      assignedBlocks: Record<string, string>;
      enfrentarLockedBlocks: Record<string, string>;
      pendingSpell: {
        spellCard: CardInstance;
        casterId: 'player' | 'opponent';
        accepted?: boolean;
        consumesTurn?: boolean;
      } | null;
      votoSilencioActive: boolean;
      votoSilencioRoundsRemaining: number;
      player: PlayerState;
      opponent: PlayerState;
      gameOverWinner: 'player' | 'opponent' | 'draw' | null;
    }) => {
      const cardSig = (c: CardInstance) =>
        `${c.instanceId}:${c.hp}:${c.maxHp}:${c.atk}:${c.def}:${c.power}:${c.level ?? 1}:${c.silencedRounds}:${Array.from(c.conditions).sort().join(',')}:${c.imprisonedUnit?.instanceId ?? ''}`;
      return JSON.stringify({
        r: snap.round,
        rtn: snap.roundTurnNumber,
        tp: snap.turnPlayer,
        ar: snap.attackerRole,
        aca: snap.activeCombatAttackerRole,
        acp: snap.attackerConsecutivePasses,
        ha: snap.hasAttackedThisRound,
        dp: snap.isDefendingPhase,
        paft: snap.isPostAttackFinalTurn,
        parep: snap.postAttackRoundEndPending,
        da: snap.declaredAttackers.map(cardSig),
        ab: snap.assignedBlocks,
        elb: snap.enfrentarLockedBlocks,
        ps: snap.pendingSpell
          ? `${snap.pendingSpell.spellCard.instanceId}:${snap.pendingSpell.casterId}:${Boolean(snap.pendingSpell.accepted)}:${snap.pendingSpell.consumesTurn !== false}`
          : null,
        vs: snap.votoSilencioActive,
        vsr: snap.votoSilencioRoundsRemaining,
        pHp: snap.player.hp,
        pMaxHp: snap.player.maxHp,
        pSum: snap.player.summonsThisRound,
        pDr: snap.player.drawsCountThisRound,
        pHand: snap.player.hand.map((c) => c.instanceId),
        pDeck: snap.player.deck.length,
        pBoard: snap.player.board.map(cardSig),
        pGrave: snap.player.graveyard.map((c) => c.instanceId),
        oHp: snap.opponent.hp,
        oMaxHp: snap.opponent.maxHp,
        oSum: snap.opponent.summonsThisRound,
        oDr: snap.opponent.drawsCountThisRound,
        oHandLen: snap.opponent.hand.length,
        oDeckLen: snap.opponent.deck.length,
        oBoard: snap.opponent.board.map(cardSig),
        oGrave: snap.opponent.graveyard.map((c) => c.instanceId),
        gw: snap.gameOverWinner,
      });
    },
    []
  );

  // Initialize signature once on mount for online PvP so initial snapshot is not re-sent
  useEffect(() => {
    if (!isOnlinePvp || !onlineMatchBootstrap) return;
    if (lastSyncedSigRef.current) return;
    lastSyncedSigRef.current = computeOnlineSyncSignature({
      round: onlineMatchBootstrap.initialSnapshot.round,
      roundTurnNumber: onlineMatchBootstrap.initialSnapshot.roundTurnNumber ?? 1,
      turnPlayer: onlineMatchBootstrap.initialSnapshot.turnPlayer,
      attackerRole: onlineMatchBootstrap.initialSnapshot.attackerRole,
      activeCombatAttackerRole: onlineMatchBootstrap.initialSnapshot.activeCombatAttackerRole,
      attackerConsecutivePasses:
        onlineMatchBootstrap.initialSnapshot.attackerConsecutivePasses ??
        onlineMatchBootstrap.initialSnapshot.consecutivePasses ??
        0,
      hasAttackedThisRound: onlineMatchBootstrap.initialSnapshot.hasAttackedThisRound,
      isDefendingPhase: onlineMatchBootstrap.initialSnapshot.isDefendingPhase,
      isPostAttackFinalTurn: onlineMatchBootstrap.initialSnapshot.isPostAttackFinalTurn,
      postAttackRoundEndPending: onlineMatchBootstrap.initialSnapshot.postAttackRoundEndPending,
      declaredAttackers: (onlineMatchBootstrap.initialSnapshot.declaredAttackers || []).map(hydrateCardInstance),
      assignedBlocks: onlineMatchBootstrap.initialSnapshot.assignedBlocks || {},
      enfrentarLockedBlocks: onlineMatchBootstrap.initialSnapshot.enfrentarLockedBlocks || {},
      pendingSpell: onlineMatchBootstrap.initialSnapshot.pendingSpell
        ? {
            spellCard: hydrateCardInstance(onlineMatchBootstrap.initialSnapshot.pendingSpell.spellCard),
            casterId: onlineMatchBootstrap.initialSnapshot.pendingSpell.casterId,
            accepted: onlineMatchBootstrap.initialSnapshot.pendingSpell.accepted,
            consumesTurn: onlineMatchBootstrap.initialSnapshot.pendingSpell.consumesTurn,
          }
        : null,
      votoSilencioActive: onlineMatchBootstrap.initialSnapshot.votoSilencioActive,
      votoSilencioRoundsRemaining: onlineMatchBootstrap.initialSnapshot.votoSilencioRoundsRemaining,
      player: hydratePlayerState(onlineMatchBootstrap.initialSnapshot.player),
      opponent: hydratePlayerState(onlineMatchBootstrap.initialSnapshot.opponent),
      gameOverWinner: onlineMatchBootstrap.initialSnapshot.gameOverWinner,
    });
  }, [isOnlinePvp, onlineMatchBootstrap, computeOnlineSyncSignature]);

  // Countdown helper when opponent temporarily disconnects
  useEffect(() => {
    if (opponentDisconnectNotice === null || opponentDisconnectNotice <= 0) return;
    const t = window.setInterval(() => {
      setOpponentDisconnectNotice((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
    }, 1000);
    return () => window.clearInterval(t);
  }, [opponentDisconnectNotice]);

  const getRoleCoinScreenCoords = useCallback((): { x: number; y: number } => {
    if (roleCoinTargetRef.current && typeof window !== 'undefined') {
      const rect = roleCoinTargetRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return {
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
        };
      }
    }
    if (typeof window !== 'undefined') {
      return {
        x: 96,
        y: Math.round(window.innerHeight * 0.25),
      };
    }
    return { x: 96, y: 220 };
  }, []);

  const canBoardDeclareAnyAttack = useCallback((board: CardInstance[]): boolean => {
    return board.some(
      (c) =>
        c.hp > 0 &&
        !c.conditions.has('atordoado') &&
        !c.conditions.has('dormindo') &&
        c.templateId !== 'm_lamina_inverno' &&
        c.templateId !== 'n_pedrinha'
    );
  }, []);

  const hasPendingZykAttack = useCallback(
    (
      state: PlayerState,
      ownerId: 'player' | 'opponent',
      boardOverride?: CardInstance[],
      includeZykOnBoard: boolean = false
    ): boolean => {
      const effectiveBoard = boardOverride ?? state.board;
      const hasAttackableUnit = includeZykOnBoard || canBoardDeclareAnyAttack(effectiveBoard);
      if (!hasAttackableUnit) return false;
      const isOwnerAttackerRole = attackerRoleRef.current === ownerId;
      if (isOwnerAttackerRole) {
        return Boolean(
          (state.extraAttackRound && !state.secondAttackDone) ||
            (state.secondAttackDone && !hasAttackedThisRoundRef.current)
        );
      }
      return Boolean(state.canAttackOnDefense);
    },
    [canBoardDeclareAnyAttack]
  );

  // ----------------------------------------------------
  // ROUND & TURN TRANSITIONS (RESPECTING GOLDEN WAVE & COIN TIMING)
  // ----------------------------------------------------
  const executeNewRoundCore = useCallback((nextRound: number, nextAttackerRole: 'player' | 'opponent') => {
    roundRef.current = nextRound;
    attackerRoleRef.current = nextAttackerRole;
    roundTurnNumberRef.current = 1;
    attackerConsecutivePassesRef.current = 0;

    setRound(nextRound);
    setRoundTurnNumber(1);
    setAttackerRole(nextAttackerRole);
    setActiveCombatAttackerRole(nextAttackerRole);
    setTurnPlayer(nextAttackerRole);

    isAttackTransitioningRef.current = false;
    setIsAttackTransitioning(false);
    isPostAttackFinalTurnRef.current = false;
    setIsPostAttackFinalTurn(false);
    setPostAttackRoundEndPending(false);
    setAttackerConsecutivePasses(0);
    setFreeActionHint(null);
    hasAttackedThisRoundRef.current = false;
    setHasAttackedThisRound(false);
    const prevVotoRounds = votoSilencioRoundsRef.current;
    const nextVotoRounds = Math.max(0, prevVotoRounds - 1);
    votoSilencioRoundsRef.current = nextVotoRounds;
    setVotoSilencioRoundsRemaining(nextVotoRounds);
    setVotoSilencioActive(nextVotoRounds > 0);
    if (prevVotoRounds > 0 && nextVotoRounds === 0) {
      addLog(
        '🔔✨ O efeito de Voto do Silêncio chegou ao fim após 2 rodadas! O Poder das unidades retornou exatamente como era antes de ser zerado.',
        'spell'
      );
    }
    setTurnTimeLeft(30);
    setSelectedAttackerIds([]);
    setDeclaredAttackers([]);
    setAssignedBlocks({});
    setEnfrentarLockedBlocks({});
    setIsDefendingPhase(false);
    setCombatResults(null);

      // Lunario Nível 2 presence check across the entire battlefield
      const hasAnyLunarioLvl2OnField =
        player.board.some((c) => (c.templateId === 'g_lunario' || c.name.toLowerCase().includes('lunario')) && c.level === 2 && c.hp > 0 && c.silencedRounds === 0) ||
        opponent.board.some((c) => (c.templateId === 'g_lunario' || c.name.toLowerCase().includes('lunario')) && c.level === 2 && c.hp > 0 && c.silencedRounds === 0);

      const updateBoardStartRound = (board: CardInstance[], isPlayerBoard: boolean): CardInstance[] => {
        const hasLiciaLvl2 = board.some(
          (c) => (c.templateId === 'm_licia' || c.name.toLowerCase().includes('licia')) && c.level === 2 && c.hp > 0 && c.silencedRounds === 0
        );

        return board
          .filter((c) => {
            // Zael, o Arcanjo exile logic:
            // "A passiva 'Irmãos' só fica ativa com Inariel, não com Seniel. Enquanto Inariel estiver em campo, Zael não sairá da batalha, apenas quando ele mesmo for abatido ou Inariel não estiver mais na mesa."
            const isZael = c.templateId === 'n_zael' || c.name.toLowerCase().includes('zael');
            if (isZael) {
              const hasInariel =
                c.silencedRounds === 0 &&
                board.some(
                  (other) =>
                    (other.templateId === 'm_inariel' || other.name.toLowerCase().includes('inariel')) &&
                    other.hp > 0 &&
                    other.silencedRounds === 0 &&
                    other.instanceId !== c.instanceId
                );
              if (hasInariel) {
                addLog(`🛡️ Passiva Irmãos: Zael, o Arcanjo permanece na batalha ao lado de Inariel em campo!`, 'spell');
                return true;
              }
              addLog(`${c.name} foi exilado da batalha ao final da rodada (Inariel não está em campo ou passiva silenciada)!`, 'info');
              queueUnitVfx({
                type: 'zael_exilio_crepusculo',
                sourceId: c.instanceId,
                ownerSide: isPlayerBoard ? 'player' : 'opponent',
              });
              return false;
            }

            // O Sol (Nível 2) - O Absoluto & A Lua (Nível 2) - A Eminente: IMORTAIS e com atributos em escala infinito (∞)
            if (isOSolLevel2Immortal(c) || isALuaLevel2Supreme(c)) {
              return true;
            }

            // Check Queimadura: 4 de dano diretamente na vida por rodada (Vilma não silenciada é imune a dano de Fogo)
            if (c.burnTurnsRemaining && c.burnTurnsRemaining > 0) {
              const isVilmaImmune =
                (c.templateId === 'm_vilma' || c.name.toLowerCase().includes('vilma')) &&
                c.silencedRounds === 0;
              if (isVilmaImmune) {
                c.burnTurnsRemaining = 0;
                c.conditions.delete('queimadura');
                removeCardConditionSource(c, 'queimadura');
              } else {
                c.hp = Math.max(0, c.hp - 4);
                c.burnTurnsRemaining -= 1;
                queueConditionVfx([
                  {
                    condition: 'queimadura',
                    targetUnitId: c.instanceId,
                    targetUnitName: c.name,
                    targetSide: isPlayerBoard ? 'player' : 'opponent',
                  },
                ]);
                addLog(`🔥 [Queimadura] ${c.name} sofreu 4 de dano diretamente na vida (${c.burnTurnsRemaining} rodada(s) restante(s))!`, 'spell');
                if (c.burnTurnsRemaining <= 0) {
                  c.conditions.delete('queimadura');
                  removeCardConditionSource(c, 'queimadura');
                }
                if (c.hp <= 0) {
                  sound.playDeath();
                  addLog(`💀 ${c.name} sucumbiu às queimaduras e pereceu!`, 'kill');
                  return false;
                }
              }
            }

            // Nova Regra de SONO: Ao despertar do SONO (quando duração chega a 0), se a unidade tiver 11 ou menos de VIDA ela é eliminada!
            if (c.templateId !== 'n_ilio' && c.conditions.has('dormindo') && !hasAnyLunarioLvl2OnField) {
              const currentSleep = c.sleepRoundsRemaining ?? 1;
              if (currentSleep - 1 <= 0 && c.hp <= 11) {
                sound.playDeath();
                addLog(`💤💀 [Despertar Letal] ${c.name} despertou do SONO com ${c.hp} de Vida (<= 11) e foi imediatamente eliminada!`, 'kill');
                return false;
              }
            }

            return true;
          })
          .map((c) => {
            const next: CardInstance = {
              ...c,
              conditionSources: c.conditionSources ? { ...c.conditionSources } : undefined,
            };
            // Clear temporary conditions (bravura, furtividade if temporary, ressurreicao)
            const conds = new Set(c.conditions);
            if (isOSolLevel2Immortal(next)) {
              conds.add('imunidade');
              conds.add('obliteracao');
              setCardConditionSource(next, 'imunidade', 'efeito_unico_proprio', next.name);
              setCardConditionSource(next, 'obliteracao', 'efeito_unico_proprio', next.name);
              return {
                ...next,
                hp: 999999,
                maxHp: 999999,
                atk: 999999,
                baseAtk: 999999,
                def: 999999,
                baseDef: 999999,
                power: 999999,
                basePower: 999999,
                peakPower: 999999,
                silencedRounds: 0,
                burnTurnsRemaining: 0,
                entorpecerRoundsRemaining: 0,
                sleepRoundsRemaining: 0,
                conditions: conds,
                canActThisRound: true,
              };
            }
            if (isALuaLevel2Supreme(next)) {
              conds.add('imunidade');
              conds.add('obliteracao');
              setCardConditionSource(next, 'imunidade', 'efeito_unico_proprio', next.name);
              setCardConditionSource(next, 'obliteracao', 'efeito_unico_proprio', next.name);
              return {
                ...next,
                hp: 999999,
                maxHp: 999999,
                sapience: 999999,
                baseSapience: 999999,
                atk: 0,
                baseAtk: 0,
                def: 0,
                baseDef: 0,
                power: 999999,
                basePower: 999999,
                peakPower: 999999,
                silencedRounds: 0,
                burnTurnsRemaining: 0,
                entorpecerRoundsRemaining: 0,
                sleepRoundsRemaining: 0,
                conditions: conds,
                canActThisRound: true,
              };
            }
            if (next.stunRoundsRemaining && next.stunRoundsRemaining > 0) {
              next.stunRoundsRemaining -= 1;
              conds.add('atordoado');
            } else {
              conds.delete('atordoado'); // stun expires after round
              removeCardConditionSource(next, 'atordoado');
            }
            if (!next.permanentRessurreicao) {
              conds.delete('ressurreicao'); // Ressurreição concedida por Zael dura apenas na rodada em que foi invocado
              removeCardConditionSource(next, 'ressurreicao');
            } else {
              conds.add('ressurreicao'); // Concessão Divina mantém Ressurreição ativa até ser consumida
            }

            // Crítico temporário concedido por Grão-mestre (dura 1 rodada)
            if (next.criticoRoundsRemaining && next.criticoRoundsRemaining > 0) {
              next.criticoRoundsRemaining -= 1;
              if (next.criticoRoundsRemaining <= 0) {
                if (next.templateId !== 'n_polus') {
                  conds.delete('critico');
                  removeCardConditionSource(next, 'critico');
                }
              }
            }

            // Buff temporário de Poder concedido por Fome insaciável (+10) ou Grão-mestre (+15)
            // Ao expirar, subtrai também os bônus de classe derivados do Poder momentâneo
            if (next.tempPowerBuffRoundsRemaining && next.tempPowerBuffRoundsRemaining > 0) {
              next.tempPowerBuffRoundsRemaining -= 1;
              if (next.tempPowerBuffRoundsRemaining <= 0 && next.tempPowerBuffAmount) {
                const buffAmt = next.tempPowerBuffAmount;
                if (next.votoSilencioSavedPower !== undefined || (next.votoSilencioRoundsRemaining ?? 0) > 0) {
                  next.votoSilencioSavedPower = Math.max(0, (next.votoSilencioSavedPower ?? 0) - buffAmt);
                  next.power = 0;
                  next.peakPower = next.votoSilencioSavedPower;
                } else {
                  next.power = Math.max(0, next.power - buffAmt);
                  next.peakPower = next.power;
                }
                next.basePower = Math.max(0, next.basePower - buffAmt);
                next.tempPowerBuffAmount = 0;
                syncClassPowerBonuses(next);
              }
            }

            // Tenacidade temporária concedida por Cavaleiro Sem Nome (dura 2 rodadas)
            if (next.tenacidadeRoundsRemaining && next.tenacidadeRoundsRemaining > 0) {
              next.tenacidadeRoundsRemaining -= 1;
              if (next.tenacidadeRoundsRemaining <= 0) {
                if (next.templateId !== 'm_cavaleiro_sem_nome' && next.templateId !== 'n_pedrinha') {
                  conds.delete('tenacidade');
                  removeCardConditionSource(next, 'tenacidade');
                  addLog(`🛡️ A Tenacidade temporária de ${c.name} expirou após 2 rodadas.`, 'info');
                }
              }
            }

            const isLegendarySaniel = c.templateId === 'n_seniel' || c.name.toLowerCase().includes('seniel') || c.name.toLowerCase().includes('saniel');
            if (c.templateId !== 'g_corcel' && !isLegendarySaniel) {
              conds.delete('furtividade');
              removeCardConditionSource(next, 'furtividade');
            }
            if (c.templateId !== 'n_ilio' && c.templateId !== 'm_juci' && !isLegendarySaniel) {
              conds.delete('bravura');
              removeCardConditionSource(next, 'bravura');
            }

            // Patch 1.1: Farren / Fome insaciável Roubo de Vida expires after 1 round
            if (next.lifeStealRoundsRemaining && next.lifeStealRoundsRemaining > 0) {
              next.lifeStealRoundsRemaining -= 1;
              if (next.lifeStealRoundsRemaining <= 0) {
                if (
                  next.templateId !== 'g_daniel' &&
                  next.templateId !== 'g_sebastian' &&
                  next.templateId !== 'g_gangnyr' &&
                  !(next.templateId === 'g_barao_well' && next.level === 2)
                ) {
                  conds.delete('roubo_de_vida');
                  removeCardConditionSource(next, 'roubo_de_vida');
                  next.hasLifeSteal = false;
                }
              }
            }

            // Patch 1.1: Destreza Ataque-Duplo expires after 1 round
            if (next.doubleAttackRoundsRemaining && next.doubleAttackRoundsRemaining > 0) {
              next.doubleAttackRoundsRemaining -= 1;
              if (next.doubleAttackRoundsRemaining <= 0) {
                const naturallyDoubleAttack =
                  next.templateId === 'm_moira' ||
                  next.templateId === 'm_titano' ||
                  next.templateId === 'g_sebastian';
                if (!naturallyDoubleAttack) {
                  conds.delete('ataque_duplo');
                  removeCardConditionSource(next, 'ataque_duplo');
                  next.hasDoubleAttack = false;
                }
              }
            }

            // Regra de SONO: Se houver Lunario Nível 2 na mesa, o Sono é preservado para ser devorado por Lunario!
            // Caso contrário, respeita a quantidade de rodadas de quem aplicou o efeito antes de despertar.
            if (c.templateId !== 'n_ilio' && conds.has('dormindo') && !hasAnyLunarioLvl2OnField) {
              const nextSleep = (next.sleepRoundsRemaining ?? 1) - 1;
              if (nextSleep > 0) {
                next.sleepRoundsRemaining = nextSleep;
                next.asleepState = true;
                conds.add('dormindo');
                addLog(`😴 [Sono] ${c.name} continua dormindo (${nextSleep} rodada(s) restante(s)).`, 'info');
              } else {
                conds.delete('dormindo');
                removeCardConditionSource(next, 'dormindo');
                next.asleepState = false;
                next.sleepRoundsRemaining = 0;
                addLog(`⚡ [Despertar] ${c.name} acordou do sono e agora pode agir nesta rodada!`, 'info');
              }
            }

            // Condition: Cura regenerates 9 HP each round (blocked if afflicted by Corrosão)
            if (conds.has('cura') && c.hp > 0) {
              if (hasCorrosao(c)) {
                addLog(`🧪🚫 [Corrosão] ${c.name} teve toda a regeneração de Cura cortada pela Corrosão!`, 'info');
              } else {
                const healed = Math.min(c.maxHp, c.hp + 9);
                next.hp = healed;
                queueConditionVfx([
                  {
                    condition: 'cura',
                    targetUnitId: c.instanceId,
                    targetUnitName: c.name,
                    targetSide: isPlayerBoard ? 'player' : 'opponent',
                  },
                ]);
                addLog(`💚 [Cura Ativa] ${c.name} regenerou +9 de Vida (Vida atual: ${next.hp}/${c.maxHp})!`, 'spell');
                const isCharmagonUnit =
                  (c.templateId === 'n_charmagon' || c.templateId === 'm_charmagon' || c.name.toLowerCase().includes('charmagon')) &&
                  c.silencedRounds === 0;
                if (isCharmagonUnit) {
                  next.atk += 3;
                  next.baseAtk += 3;
                  addPowerPoints(next, 3);
                  addLog(`🐉 [Charmagon] Recebeu Cura e ganhou +3 de Ataque e +3 de Poder (Atk: ${next.atk}, Poder: ${next.power})!`, 'spell');
                }
              }
              if (next.curaTurnsRemaining && next.curaTurnsRemaining > 0) {
                next.curaTurnsRemaining -= 1;
                if (
                  next.curaTurnsRemaining <= 0 &&
                  next.templateId !== 'g_bor' &&
                  !(next.templateId === 'g_barao_well' && next.level === 2)
                ) {
                  conds.delete('cura');
                  removeCardConditionSource(next, 'cura');
                  addLog(`💚 O efeito temporário de Cura sobre ${c.name} terminou.`, 'info');
                }
              }
            }

            // Ilio, o Colosso:
            // Ao final de cada rodada que Ilio passou dormindo recebe +5 em todos seus atributos.
            // Quando despertar recebe Bravura e Crítico.
            if (c.templateId === 'n_ilio' && c.silencedRounds === 0) {
              const isSleeping = conds.has('dormindo') || Boolean(c.asleepState) || (c.sleepRoundsRemaining ?? 0) > 0;
              const remaining = c.sleepRoundsRemaining ?? 0;

              if (isSleeping && remaining > 0) {
                // Ganha +5 em todos atributos ao final de cada rodada que passou dormindo
                next.hp += 5;
                next.maxHp += 5;
                next.atk += 5;
                next.baseAtk += 5;
                addDefensePoints(next, 5);
                addPowerPoints(next, 5);

                const newRemaining = remaining - 1;
                next.sleepRoundsRemaining = newRemaining;

                if (newRemaining > 0) {
                  next.asleepState = true;
                  conds.add('dormindo');
                  conds.delete('bravura');
                  conds.delete('critico');
                  removeCardConditionSource(next, 'bravura');
                  removeCardConditionSource(next, 'critico');
                  addLog(
                    `😴 [Sono Telúrico] Ilio, o Colosso encerrou a rodada dormindo e recebeu +5 em todos os atributos (Vida ${next.hp}/${next.maxHp}, Atk ${next.atk}, Def ${next.def}, Poder ${next.power})! Resta ${newRemaining} rodada de sono...`,
                    'spell'
                  );
                } else {
                  // Despertar!
                  next.asleepState = false;
                  conds.delete('dormindo');
                  removeCardConditionSource(next, 'dormindo');
                  conds.add('bravura');
                  conds.add('critico');
                  setCardConditionSource(next, 'bravura', 'efeito_unico_proprio', next.name);
                  setCardConditionSource(next, 'critico', 'efeito_unico_proprio', next.name);
                  sound.playSpell();
                  addLog(
                    `⚡ Ilio, o Colosso DESPERTOU com +5 em todos os atributos (Vida ${next.hp}/${next.maxHp}, Atk ${next.atk}, Def ${next.def}, Poder ${next.power}) e recebeu BRAVURA e CRÍTICO!`,
                    'spell'
                  );
                }
              } else {
                // Já desperto: mantém Bravura e Crítico
                next.asleepState = false;
                conds.delete('dormindo');
                removeCardConditionSource(next, 'dormindo');
                conds.add('bravura');
                conds.add('critico');
                setCardConditionSource(next, 'bravura', 'efeito_unico_proprio', next.name);
                setCardConditionSource(next, 'critico', 'efeito_unico_proprio', next.name);
              }
            }

            // General Bor: regens 5 HP if alive, not silenced, and not afflicted by Corrosão
            if (c.templateId === 'g_bor' && c.hp > 0 && c.silencedRounds === 0) {
              if (hasCorrosao(c)) {
                addLog(`🧪🚫 [Corrosão] General Bor teve sua regeneração do Mesofênix cortada pela Corrosão!`, 'info');
              } else {
                const healed = Math.min(c.maxHp, c.hp + 5);
                next.hp = healed;
                addLog(`General Bor regenerou +5 de Vida com a chama do Mesofênix!`, 'info');
              }
            }

            // Barão Well mechanics (only when not silenced)
            const isWell = c.templateId === 'g_barao_well' || c.name.toLowerCase().includes('well');
            if (isWell && c.hp > 0 && c.silencedRounds === 0) {
              const isAttackerRole = isPlayerBoard ? (nextAttackerRole === 'player') : (nextAttackerRole === 'opponent');
              if (c.level === 1) {
                if (isAttackerRole) {
                  conds.add('bravura');
                  setCardConditionSource(next, 'bravura', 'efeito_unico_proprio', next.name);
                  conds.delete('tenacidade');
                  removeCardConditionSource(next, 'tenacidade');
                  addLog(`⚡ Barão Well (Posição de Ataque): Recebeu Bravura para esta rodada!`, 'spell');
                } else {
                  conds.delete('bravura');
                  removeCardConditionSource(next, 'bravura');
                  conds.add('tenacidade');
                  setCardConditionSource(next, 'tenacidade', 'efeito_unico_proprio', next.name);
                  queueConditionVfx([
                    {
                      condition: 'tenacidade',
                      targetUnitId: c.instanceId,
                      targetUnitName: c.name,
                      targetSide: isPlayerBoard ? 'player' : 'opponent',
                    },
                  ]);
                  addLog(`🛡️ Barão Well (Posição de Defesa): Recebeu Tenacidade (-35% dano sofrido)!`, 'spell');
                }
              } else if (c.level === 2) {
                // Nível 2: Cura (+9/rodada tratado acima) e Roubo de Vida permanentes
                conds.add('cura');
                conds.add('roubo_de_vida');
                setCardConditionSource(next, 'cura', 'efeito_unico_proprio', next.name);
                setCardConditionSource(next, 'roubo_de_vida', 'efeito_unico_proprio', next.name);
                next.hasLifeSteal = true;
              }
            }

            // Licia, a Fada mechanics (only when not silenced)
            const isLicia = c.templateId === 'm_licia' || c.name.toLowerCase().includes('licia');
            if (isLicia && c.hp > 0 && c.silencedRounds === 0) {
              if (c.level === 2) {
                conds.add('furtividade');
                conds.add('etereo');
                setCardConditionSource(next, 'furtividade', 'efeito_unico_proprio', next.name);
                setCardConditionSource(next, 'etereo', 'efeito_unico_proprio', next.name);
              } else {
                const stealthAlly = board.find(
                  (other) => other.instanceId !== c.instanceId && other.hp > 0 && other.conditions.has('furtividade')
                );
                if (stealthAlly) {
                  conds.add('furtividade');
                  setCardConditionSource(next, 'furtividade', 'unidade_compartilhada', stealthAlly.name);
                } else {
                  conds.delete('furtividade');
                  removeCardConditionSource(next, 'furtividade');
                }
              }
            }

            // Voto do Silêncio: mantém o Poder zerado por 2 rodadas; ao fim das 2 rodadas, retorna ao valor original salvo
            if (next.votoSilencioSavedPower !== undefined || (next.votoSilencioRoundsRemaining ?? 0) > 0) {
              const currentRem = next.votoSilencioRoundsRemaining ?? (prevVotoRounds > 0 ? prevVotoRounds : 1);
              const nextRem = currentRem - 1;
              if (nextRem > 0) {
                next.votoSilencioRoundsRemaining = nextRem;
                next.power = 0;
                syncClassPowerBonuses(next);
              } else {
                if (next.votoSilencioSavedPower !== undefined) {
                  next.power = next.votoSilencioSavedPower;
                  next.peakPower = next.power;
                }
                next.votoSilencioSavedPower = undefined;
                next.votoSilencioRoundsRemaining = 0;
                syncClassPowerBonuses(next);
              }
            }

            // Licia Nível 2: Concede +10 de PODER a todas as unidades furtivas a cada nova rodada
            if (hasLiciaLvl2 && conds.has('furtividade') && c.hp > 0) {
              addPowerPoints(next, 10);
              addLog(`🧚‍♀️✨ [Licia Nível 2] Concedeu +10 de Poder à unidade furtiva ${next.name} (Poder: ${next.power})!`, 'spell');
            }

            // Decrement silence rounds and restore base class attributes when Jurisdição de Saniel expires
            if (next.silencedRounds > 0) {
              next.silencedRounds -= 1;
              if (next.silencedRounds === 0) {
                conds.delete('silencio');
                removeCardConditionSource(next, 'silencio');
                const tpl = CARD_TEMPLATES.find((t) => t.id === next.templateId);
                const xuryBonus =
                  next.templateId === 'n_xury' || next.name.toLowerCase().includes('xury')
                    ? (isPlayerBoard ? player.totalElectricUnitsSummonedMatch : opponent.totalElectricUnitsSummonedMatch) || 0
                    : 0;
                next.power = next.basePower + xuryBonus;
                next.peakPower = next.power;
                if (tpl) {
                  next.icePowerDefGranted = 0;
                  next.teluricoPowerHpGranted = 0;
                  next.teluricoPowerDefGranted = 0;
                  next.neutroPowerHpGranted = 0;
                  next.neutroPowerAtkGranted = 0;
                  next.neutroPowerDefGranted = 0;
                  next.votoSilencioTeluricoBonusRemoved = undefined;
                  next.votoSilencioTeluricoHpRemoved = undefined;
                  next.votoSilencioTeluricoDefBonusRemoved = undefined;
                  next.votoSilencioTeluricoDefRemoved = undefined;
                  next.votoSilencioGeloBonusRemoved = undefined;
                  next.votoSilencioGeloDefRemoved = undefined;
                  next.votoSilencioNeutroHpBonusRemoved = undefined;
                  next.votoSilencioNeutroHpRemoved = undefined;
                  next.votoSilencioNeutroAtkBonusRemoved = undefined;
                  next.votoSilencioNeutroAtkRemoved = undefined;
                  next.votoSilencioNeutroDefBonusRemoved = undefined;
                  next.votoSilencioNeutroDefRemoved = undefined;
                  syncClassPowerBonuses(next);
                  if (tpl.id === 'm_moira' || tpl.id === 'm_titano' || tpl.id === 'g_sebastian') {
                    conds.add('ataque_duplo');
                    setCardConditionSource(next, 'ataque_duplo', 'passiva_propria', next.name);
                    next.hasDoubleAttack = true;
                  }
                  if (tpl.id === 'g_daniel' || tpl.id === 'g_sebastian') {
                    conds.add('roubo_de_vida');
                    setCardConditionSource(next, 'roubo_de_vida', 'passiva_propria', next.name);
                    next.hasLifeSteal = true;
                  }
                  if (tpl.id === 'm_umael' || tpl.id === 'm_caspiem' || tpl.id === 'n_crisol' || tpl.id === 'n_wyr') {
                    conds.add('enfrentar');
                    setCardConditionSource(next, 'enfrentar', 'efeito_unico_proprio', next.name);
                  }
                  if (tpl.id === 'g_corcel') {
                    conds.add('furtividade');
                    setCardConditionSource(next, 'furtividade', 'passiva_propria', next.name);
                  }
                  if (tpl.id === 'n_polus') {
                    conds.add('critico');
                    setCardConditionSource(next, 'critico', 'efeito_unico_proprio', next.name);
                  }
                  if (tpl.id === 'm_cavaleiro_sem_nome' || tpl.id === 'n_pedrinha') {
                    conds.add('tenacidade');
                    setCardConditionSource(next, 'tenacidade', 'passiva_propria', next.name);
                  }
                  if (tpl.id === 'm_juci') {
                    conds.add('bravura');
                    setCardConditionSource(next, 'bravura', 'efeito_unico_proprio', next.name);
                  }
                }
                addLog(`🔊 O silenciamento da Jurisdição de Saniel sobre ${next.name} expirou!`, 'info');
              }
            }

            // Decrement freezeRoundsRemaining (Juci: 3 rodadas, Bonetrus: 1 rodada)
            if (next.freezeRoundsRemaining && next.freezeRoundsRemaining > 0) {
              next.freezeRoundsRemaining -= 1;
              if (next.freezeRoundsRemaining <= 0) {
                conds.delete('congelado');
                removeCardConditionSource(next, 'congelado');
                addLog(`❄️ O efeito de Congelamento sobre ${next.name} dissipou-se!`, 'info');
              } else {
                addLog(`❄️ ${next.name} continua Congelado (${next.freezeRoundsRemaining} rodada(s) restante(s))!`, 'info');
              }
            }

            // Decrement entorpecer / Torpor rounds
            if (next.entorpecerRoundsRemaining && next.entorpecerRoundsRemaining > 0) {
              next.entorpecerRoundsRemaining -= 1;
              if (next.entorpecerRoundsRemaining === 0) {
                conds.delete('entorpecer');
                removeCardConditionSource(next, 'entorpecer');
                addLog(`🌀 O efeito de Torpor (Entorpecer) sobre ${next.name} dissipou-se!`, 'info');
              } else {
                addLog(`🌀 ${next.name} continua sob Torpor (${next.entorpecerRoundsRemaining} rodada restante)!`, 'info');
              }
            }

            // Decrement Imunidade rounds (Herox)
            if (next.immunedRounds && next.immunedRounds > 0) {
              next.immunedRounds -= 1;
              if (next.immunedRounds <= 0) {
                conds.delete('imunidade');
                removeCardConditionSource(next, 'imunidade');
                addLog(`🌟 A Imunidade de ${next.name} expirou!`, 'info');
              } else {
                addLog(`🌟 ${next.name} mantém Imunidade absoluta (${next.immunedRounds} rodada(s) restante(s))!`, 'info');
              }
            }

            // Decrement Barreira rounds (Voto das Estrelas)
            if (next.barreiraRoundsRemaining && next.barreiraRoundsRemaining > 0) {
              next.barreiraRoundsRemaining -= 1;
              if (next.barreiraRoundsRemaining <= 0) {
                conds.delete('barreira');
                removeCardConditionSource(next, 'barreira');
              }
            }

            // Decrement temporary Tenacidade rounds (Cavaleiro Sem Nome)
            if (next.tenacidadeRoundsRemaining && next.tenacidadeRoundsRemaining > 0) {
              next.tenacidadeRoundsRemaining -= 1;
              if (next.tenacidadeRoundsRemaining <= 0) {
                conds.delete('tenacidade');
                removeCardConditionSource(next, 'tenacidade');
                addLog(`🛡️ O efeito temporário de Tenacidade sobre ${next.name} expirou!`, 'info');
              }
            }

            // Decrement Eletrificado rounds (Barão Well Nível 2)
            if (next.eletrificadoRoundsRemaining && next.eletrificadoRoundsRemaining > 0) {
              next.eletrificadoRoundsRemaining -= 1;
              if (next.eletrificadoRoundsRemaining <= 0) {
                conds.delete('eletrificado');
                removeCardConditionSource(next, 'eletrificado');
                addLog(`⚡ O efeito Eletrificado sobre ${next.name} expirou!`, 'info');
              }
            }

            next.conditions = conds;
            next.canActThisRound = true;
            return next;
          });
      };

      // Automatic draw for both players at the start of each round:
      // Default: 1 card auto-drawn. Mago Uhr effect: draws 2 cards automatically at round start while alive on board.
      setPlayer((p) => {
        let nextDeck = p.deck;
        // Patch 1.1: Cartas Fugazes expiram no fim da rodada
        const expiredFugaz = p.hand.filter((c) => c.isFugaz);
        if (expiredFugaz.length > 0) {
          expiredFugaz.forEach((c) => {
            addLog(`🌪️ [Fugaz] ${c.name} se dissipou por não ter sido utilizada nesta rodada!`, 'info');
          });
        }
        let nextHand = p.hand.filter((c) => !c.isFugaz);
        const drawnCards: CardInstance[] = [];

        const hasUhrAlive = p.board.some(
          (c) => c.templateId === 'g_uhr' && c.hp > 0 && c.silencedRounds === 0
        );
        const cardsToDraw = hasUhrAlive ? 2 : 1;

        for (let i = 0; i < cardsToDraw; i++) {
          if (nextDeck.length > 0) {
            const res = drawCardCurve(nextDeck, nextRound);
            if (res.card) {
              drawnCards.push(res.card);
              nextDeck = res.remainingDeck;
            }
          }
        }

        const updatedBoard = updateBoardStartRound(p.board, true);

        // Saniel Nível 2: A cada 2 rodadas gera uma "Jurisdição de Saniel" FUGAZ na mão
        updatedBoard.forEach((c) => {
          const isSaniel2 =
            (c.templateId === 'n_saniel' || c.templateId === 'n_seniel' || c.name.toLowerCase().includes('saniel') || c.name.toLowerCase().includes('seniel')) &&
            c.level === 2 &&
            c.hp > 0 &&
            c.silencedRounds === 0;
          if (isSaniel2) {
            c.sanielJurisdicaoCounter = (c.sanielJurisdicaoCounter || 0) + 1;
            if (c.sanielJurisdicaoCounter >= 2) {
              c.sanielJurisdicaoCounter = 0;
              const jurisTpl = CARD_TEMPLATES.find((t) => t.id === 'n_jurisdicao_de_saniel');
              if (jurisTpl) {
                const jurisInst = createCardInstance(jurisTpl);
                jurisInst.isFugaz = true;
                jurisInst.isGeneratedCard = true;
                drawnCards.push(jurisInst);
                sound.playSpell();
                addLog(`👑⚖️ [Saniel Nível 2] Gerou uma "Jurisdição de Saniel" (FUGAZ) em sua mão!`, 'spell');
              }
            }
          }
        });

        // Krust, o Feiticeiro: Cura 1 da vida do jogador a cada 2 rodadas
        let playerKrustHeal = 0;
        updatedBoard.forEach((c) => {
          const isKrust =
            (c.templateId === 'm_krust' || c.name.toLowerCase().includes('krust')) &&
            c.hp > 0 &&
            c.silencedRounds === 0 &&
            !c.conditions.has('silencio');
          if (isKrust) {
            c.krustHealCounter = (c.krustHealCounter || 0) + 1;
            if (c.krustHealCounter >= 2) {
              c.krustHealCounter = 0;
              playerKrustHeal += 1;
            }
          }
        });
        const nextPlayerHp = playerKrustHeal > 0 ? Math.min(p.maxHp, p.hp + playerKrustHeal) : p.hp;
        if (playerKrustHeal > 0) {
          sound.playSpell();
          const healedDelta = nextPlayerHp - p.hp;
          if (healedDelta > 0) {
            addLog(
              `🌊💚 [Krust, o Feiticeiro] Restaurou +${healedDelta} de Vida do jogador (${nextPlayerHp}/${p.maxHp})!`,
              'spell'
            );
          } else {
            addLog(
              `🌊💚 [Krust, o Feiticeiro] Bênção das marés ativada (Vida já está no máximo: ${p.hp}/${p.maxHp}).`,
              'info'
            );
          }
        }

        // Patch 1.2: Karyen gera Fagulha Estelar (Fugaz) na mão a cada início de rodada
        const hasKaryen = updatedBoard.some(
          (c) =>
            (c.templateId === 'g_karyen' || c.name.toLowerCase().includes('karyen')) &&
            c.hp > 0 &&
            c.silencedRounds === 0
        );
        if (hasKaryen) {
          const fagulhaTemplate = CARD_TEMPLATES.find((t) => t.id === 'token_fagulha_estelar');
          if (fagulhaTemplate) {
            const fagulhaInst = createCardInstance(fagulhaTemplate);
            fagulhaInst.isFugaz = true;
            fagulhaInst.isGeneratedCard = true;
            drawnCards.push(fagulhaInst);
            sound.playSpell();
            addLog(`✨ [Karyen] Gerou Fagulha Estelar (Fugaz) na mão!`, 'spell');
          }
        }

        const nextTotalDrawn = (p.totalCardsDrawnMatch || 0) + drawnCards.length;
        const syncKarcelios = (cards: CardInstance[]) =>
          cards.map((c) => {
            if ((c.templateId === 'n_karcelios' || c.name.toLowerCase().includes('karcelios')) && c.silencedRounds === 0) {
              const calcPower = (c.basePower || 5) + nextTotalDrawn;
              return syncScaledPower(c, calcPower);
            }
            return c;
          });

        if (drawnCards.length > 0) {
          nextHand = [...nextHand, ...drawnCards];
          setDrawingCardAnim({ card: drawnCards[0], ownerId: 'player' });
          if (hasUhrAlive) {
            addLog(
              `🧙‍♂️ Efeito Mágico do Mago Uhr ativo! Compra dupla automática: Você comprou ${drawnCards
                .map((c) => c.name)
                .join(' e ')}!`,
              'spell'
            );
          } else {
            addLog(`[Início da Rodada ${nextRound}] Compra automática: Você comprou ${drawnCards[0].name}!`, 'info');
          }
        } else {
          addLog(`[Início da Rodada ${nextRound}] Seu baralho está esgotado! Sobreviva até sua última unidade cair.`, 'info');
        }

        // Check scheduled Letargia Lunar reincidence for player
        let nextScheduledLetargia = (p.scheduledLetargia || []).map((s) => ({
          ...s,
          roundsRemaining: s.roundsRemaining - 1,
        }));
        const reinciding = nextScheduledLetargia.filter((s) => s.roundsRemaining <= 0);
        nextScheduledLetargia = nextScheduledLetargia.filter((s) => s.roundsRemaining > 0);

        if (reinciding.length > 0) {
          setTimeout(() => {
            setOpponent((prevEnemy) => {
              const alive = prevEnemy.board.filter((c) => c.hp > 0 && !c.conditions.has('imunidade'));
              if (alive.length === 0) return prevEnemy;
              reinciding.forEach((entry) => {
                let affected = 0;
                entry.targetIds.forEach((tId) => {
                  const target = alive.find((c) => c.instanceId === tId);
                  if (target) {
                    target.conditions.add('dormindo');
                    setCardConditionSource(target, 'dormindo', 'habilidade', 'Letargia Lunar');
                    target.sleepRoundsRemaining = 1;
                    affected += 1;
                    addLog(`🌙😴 [Letargia Lunar - Reincidência] O sono cósmico reincidiu sobre ${target.name} por 1 rodada!`, 'spell');
                  }
                });
                const remainingUnasleep = alive.filter((c) => !c.conditions.has('dormindo'));
                while (affected < 2 && remainingUnasleep.length > 0) {
                  const randomPick = remainingUnasleep.pop()!;
                  randomPick.conditions.add('dormindo');
                  setCardConditionSource(randomPick, 'dormindo', 'habilidade', 'Letargia Lunar');
                  randomPick.sleepRoundsRemaining = 1;
                  affected += 1;
                  addLog(`🌙😴 [Letargia Lunar - Reincidência] O alvo anterior pereceu: o sono cósmico recaiu sobre ${randomPick.name}!`, 'spell');
                }
              });
              return { ...prevEnemy };
            });
          }, 350);
        }

        return {
          ...p,
          hp: nextPlayerHp,
          board: syncKarcelios(updatedBoard),
          deck: nextDeck,
          hand: syncKarcelios(nextHand),
          hasDrawnThisRound: true,
          drawsCountThisRound: drawnCards.length,
          extraDrawAvailableThisRound: false,
          extraDrawNextRound: false,
          summonsThisRound: 0,
          atormentadorPieceSummonedThisRound: false,
          extraAttackRound: false,
          secondAttackDone: false,
          canAttackOnDefense: false,
          totalCardsDrawnMatch: nextTotalDrawn,
          scheduledLetargia: nextScheduledLetargia,
        };
      });

      setOpponent((o) => {
        let nextDeck = o.deck;
        // Patch 1.1: Cartas Fugazes expiram no fim da rodada para o oponente
        let nextHand = o.hand.filter((c) => !c.isFugaz);
        const drawnCards: CardInstance[] = [];

        const hasUhrAlive = o.board.some(
          (c) => c.templateId === 'g_uhr' && c.hp > 0 && c.silencedRounds === 0
        );
        const cardsToDraw = hasUhrAlive ? 2 : 1;

        for (let i = 0; i < cardsToDraw; i++) {
          if (nextDeck.length > 0) {
            const res = drawCardCurve(nextDeck, nextRound);
            if (res.card) {
              drawnCards.push(res.card);
              nextDeck = res.remainingDeck;
            }
          }
        }

        const updatedBoard = updateBoardStartRound(o.board, false);

        // Saniel Nível 2 oponente: A cada 2 rodadas gera uma "Jurisdição de Saniel" FUGAZ na mão
        updatedBoard.forEach((c) => {
          const isSaniel2 =
            (c.templateId === 'n_saniel' || c.templateId === 'n_seniel' || c.name.toLowerCase().includes('saniel') || c.name.toLowerCase().includes('seniel')) &&
            c.level === 2 &&
            c.hp > 0 &&
            c.silencedRounds === 0;
          if (isSaniel2) {
            c.sanielJurisdicaoCounter = (c.sanielJurisdicaoCounter || 0) + 1;
            if (c.sanielJurisdicaoCounter >= 2) {
              c.sanielJurisdicaoCounter = 0;
              const jurisTpl = CARD_TEMPLATES.find((t) => t.id === 'n_jurisdicao_de_saniel');
              if (jurisTpl) {
                const jurisInst = createCardInstance(jurisTpl);
                jurisInst.isFugaz = true;
                jurisInst.isGeneratedCard = true;
                drawnCards.push(jurisInst);
                addLog(`👑⚖️ [Saniel Nível 2] ${o.name} gerou uma "Jurisdição de Saniel" (FUGAZ) na mão!`, 'spell');
              }
            }
          }
        });

        // Krust, o Feiticeiro oponente: Cura 1 da vida do jogador a cada 2 rodadas
        let oppKrustHeal = 0;
        updatedBoard.forEach((c) => {
          const isKrust =
            (c.templateId === 'm_krust' || c.name.toLowerCase().includes('krust')) &&
            c.hp > 0 &&
            c.silencedRounds === 0 &&
            !c.conditions.has('silencio');
          if (isKrust) {
            c.krustHealCounter = (c.krustHealCounter || 0) + 1;
            if (c.krustHealCounter >= 2) {
              c.krustHealCounter = 0;
              oppKrustHeal += 1;
            }
          }
        });
        const nextOpponentHp = oppKrustHeal > 0 ? Math.min(o.maxHp, o.hp + oppKrustHeal) : o.hp;
        if (oppKrustHeal > 0) {
          const healedDelta = nextOpponentHp - o.hp;
          if (healedDelta > 0) {
            addLog(
              `🌊💚 [Krust, o Feiticeiro] Restaurou +${healedDelta} de Vida de ${o.name} (${nextOpponentHp}/${o.maxHp})!`,
              'spell'
            );
          } else {
            addLog(
              `🌊💚 [Krust, o Feiticeiro] Bênção das marés ativada em ${o.name} (Vida já está no máximo: ${o.hp}/${o.maxHp}).`,
              'info'
            );
          }
        }

        // Patch 1.2: Karyen oponente gera Fagulha Estelar (Fugaz)
        const hasKaryen = updatedBoard.some(
          (c) =>
            (c.templateId === 'g_karyen' || c.name.toLowerCase().includes('karyen')) &&
            c.hp > 0 &&
            c.silencedRounds === 0
        );
        if (hasKaryen) {
          const fagulhaTemplate = CARD_TEMPLATES.find((t) => t.id === 'token_fagulha_estelar');
          if (fagulhaTemplate) {
            const fagulhaInst = createCardInstance(fagulhaTemplate);
            fagulhaInst.isFugaz = true;
            fagulhaInst.isGeneratedCard = true;
            drawnCards.push(fagulhaInst);
            addLog(`✨ [Karyen] ${o.name} gerou Fagulha Estelar (Fugaz) na mão!`, 'spell');
          }
        }

        const nextTotalDrawn = (o.totalCardsDrawnMatch || 0) + drawnCards.length;
        const syncKarcelios = (cards: CardInstance[]) =>
          cards.map((c) => {
            if ((c.templateId === 'n_karcelios' || c.name.toLowerCase().includes('karcelios')) && c.silencedRounds === 0) {
              const calcPower = (c.basePower || 5) + nextTotalDrawn;
              return syncScaledPower(c, calcPower);
            }
            return c;
          });

        if (drawnCards.length > 0) {
          nextHand = [...nextHand, ...drawnCards];
          if (hasUhrAlive) {
            addLog(`🧙‍♂️ Efeito Mágico do Mago Uhr ativo: ${o.name} comprou 2 cartas automaticamente!`, 'spell');
          } else {
            addLog(`[Início da Rodada ${nextRound}] ${o.name} comprou 1 carta automaticamente do baralho.`, 'info');
          }
        }

        return {
          ...o,
          hp: nextOpponentHp,
          board: syncKarcelios(updatedBoard),
          deck: nextDeck,
          hand: syncKarcelios(nextHand),
          hasDrawnThisRound: true,
          drawsCountThisRound: drawnCards.length,
          extraDrawAvailableThisRound: false,
          extraDrawNextRound: false,
          summonsThisRound: 0,
          atormentadorPieceSummonedThisRound: false,
          extraAttackRound: false,
          secondAttackDone: false,
          canAttackOnDefense: false,
          totalCardsDrawnMatch: nextTotalDrawn,
        };
      });

      // Track round start auto-draws for Karcelios across the entire match
      const pUhr = player.board.some((c) => c.templateId === 'g_uhr' && c.hp > 0 && c.silencedRounds === 0);
      const oUhr = opponent.board.some((c) => c.templateId === 'g_uhr' && c.hp > 0 && c.silencedRounds === 0);
      const pCount = Math.min(player.deck.length, pUhr ? 2 : 1);
      const oCount = Math.min(opponent.deck.length, oUhr ? 2 : 1);
      recordCardsDrawn(pCount + oCount);

      // Patch 1.2 / 1.2.1 / 1.2.2: Lunario Nível 2 consome SONO de todas as unidades na mesa
      setTimeout(() => {
        const currP = playerRef.current;
        const currO = opponentRef.current;

        const pHasLunarioLvl2 = currP.board.some(
          (c) => (c.templateId === 'g_lunario' || c.name.toLowerCase().includes('lunario')) && c.level === 2 && c.hp > 0 && c.silencedRounds === 0
        );
        const oHasLunarioLvl2 = currO.board.some(
          (c) => (c.templateId === 'g_lunario' || c.name.toLowerCase().includes('lunario')) && c.level === 2 && c.hp > 0 && c.silencedRounds === 0
        );
        const pHasALuaLvl2 = currP.board.some(
          (c) => (c.templateId === 'g_a_lua' || c.name.trim().toLowerCase().startsWith('a lua')) && c.level === 2 && c.hp > 0 && c.silencedRounds === 0
        );
        const oHasALuaLvl2 = currO.board.some(
          (c) => (c.templateId === 'g_a_lua' || c.name.trim().toLowerCase().startsWith('a lua')) && c.level === 2 && c.hp > 0 && c.silencedRounds === 0
        );

        // A Lua (Nível 2) - A EMINENTE: "A cada rodada aplica SONO em todos os inimigos."
        const pALuaLvl2Early = currP.board.find(
          (c) => (c.templateId === 'g_a_lua' || c.name.trim().toLowerCase().startsWith('a lua')) && c.level === 2 && c.hp > 0 && c.silencedRounds === 0
        );
        const oALuaLvl2Early = currO.board.find(
          (c) => (c.templateId === 'g_a_lua' || c.name.trim().toLowerCase().startsWith('a lua')) && c.level === 2 && c.hp > 0 && c.silencedRounds === 0
        );

        let workingPBoard = currP.board.map((u) => ({ ...u, conditions: new Set(u.conditions) }));
        let workingOBoard = currO.board.map((u) => ({ ...u, conditions: new Set(u.conditions) }));

        if (pHasALuaLvl2) {
          const sleptIds: string[] = [];
          workingOBoard.forEach((u) => {
            if (u.hp > 0 && !u.conditions.has('imunidade')) {
              u.conditions.add('dormindo');
              setCardConditionSource(u, 'dormindo', 'unidade_inimiga', pALuaLvl2Early?.name || 'A Lua - A Eminente');
              u.asleepState = true;
              u.sleepRoundsRemaining = 1;
              sleptIds.push(u.instanceId);
            }
          });
          if (sleptIds.length > 0 && pALuaLvl2Early) {
            queueUnitVfx({
              type: 'a_lua_lvl2_sleep',
              sourceId: pALuaLvl2Early.instanceId,
              targetIds: sleptIds,
              ownerSide: 'player',
            });
          }
          sound.playSpell();
          addLog(`🌙😴 [A EMINENTE - A Lua Nível 2] Lançou Sono Cósmico Profundo em todos os inimigos!`, 'spell');
        }

        if (oHasALuaLvl2) {
          const sleptIds: string[] = [];
          workingPBoard.forEach((u) => {
            if (u.hp > 0 && !u.conditions.has('imunidade')) {
              u.conditions.add('dormindo');
              setCardConditionSource(u, 'dormindo', 'unidade_inimiga', oALuaLvl2Early?.name || 'A Lua - A Eminente');
              u.asleepState = true;
              u.sleepRoundsRemaining = 1;
              sleptIds.push(u.instanceId);
            }
          });
          if (sleptIds.length > 0 && oALuaLvl2Early) {
            queueUnitVfx({
              type: 'a_lua_lvl2_sleep',
              sourceId: oALuaLvl2Early.instanceId,
              targetIds: sleptIds,
              ownerSide: 'opponent',
            });
          }
          sound.playSpell();
          addLog(`🌙😴 [A EMINENTE - A Lua Inimiga Nível 2] Lançou Sono Cósmico Profundo em todas as suas unidades!`, 'spell');
        }

        let totalSleepConsumed = 0;
        const deadCardsPlayer: CardInstance[] = [];
        const deadCardsOpponent: CardInstance[] = [];
        const obliteratedByPlayerLuaIds: string[] = [];
        const obliteratedByOpponentLuaIds: string[] = [];
        const sleepConsumedPlayerTargets: string[] = [];
        const sleepConsumedOpponentTargets: string[] = [];

        // Function to process board and consume sleeping units for Lunario Nível 2
        // A Lua Nível 2 potencializa Lunario: se A Lua Nv 2 estiver na mesa, toda vez que Lunario consumir Sono de inimigos ele OBLITERA elas!
        const consumeBoardSleep = (board: CardInstance[], ownerName: string, isPlayerSide: boolean) => {
          const updated: CardInstance[] = [];
          board.forEach((card) => {
            const c = { ...card, conditions: new Set(card.conditions), conditionSources: card.conditionSources ? { ...card.conditionSources } : undefined };
            if (c.conditions.has('dormindo') && c.hp > 0) {
              totalSleepConsumed += 1;
              c.conditions.delete('dormindo');
              removeCardConditionSource(c, 'dormindo');
              c.asleepState = false;
              c.sleepRoundsRemaining = 0;
              if (isPlayerSide) sleepConsumedPlayerTargets.push(c.instanceId);
              else sleepConsumedOpponentTargets.push(c.instanceId);

              // Check if empowered by A Lua Nível 2
              const isObliteratedByEmpoweredLunario =
                (!isPlayerSide && pHasLunarioLvl2 && pHasALuaLvl2) ||
                (isPlayerSide && oHasLunarioLvl2 && oHasALuaLvl2);

              if (isObliteratedByEmpoweredLunario) {
                c.hp = 0;
                c.def = 0;
                if (c.sapience != null) c.sapience = 0;
                c.conditions.add('obliteracao');
                c.conditions.delete('ressurreicao');
                setCardConditionSource(c, 'obliteracao', 'unidade_inimiga', 'Lunario & A Lua (Nível 2)');
                removeCardConditionSource(c, 'ressurreicao');
                addLog(
                  `🌙🕳️ [LUNARIO POTENCIALIZADO POR A EMINENTE] Consumiu o Sono de ${c.name} (${ownerName}) e a OBLITEROU instantaneamente!`,
                  'kill'
                );
                if (isPlayerSide) {
                  deadCardsPlayer.push(c);
                  obliteratedByOpponentLuaIds.push(c.instanceId);
                } else {
                  deadCardsOpponent.push(c);
                  obliteratedByPlayerLuaIds.push(c.instanceId);
                }
                return;
              }

              // Normal Deal 7 damage to Resistance (Def first, then HP/Sapience)
              const dmg = 7;
              if (c.def >= dmg) {
                c.def -= dmg;
              } else {
                const rem = dmg - c.def;
                c.def = 0;
                c.hp = Math.max(0, c.hp - rem);
                if (c.sapience != null) {
                  c.sapience = Math.max(0, c.sapience - rem);
                }
              }

              if (c.hp <= 0) {
                addLog(
                  `🌙💀 [Lunario - Devorador de Sonhos] Consumiu o Sono de ${c.name} (${ownerName}) causando 7 de dano à Resistência e a unidade pereceu!`,
                  'kill'
                );
                if (isPlayerSide) {
                  deadCardsPlayer.push(c);
                } else {
                  deadCardsOpponent.push(c);
                }
              } else {
                updated.push(c);
                addLog(
                  `🌙 [Lunario - Devorador de Sonhos] Consumiu o Sono de ${c.name} (${ownerName}) causando 7 de dano à Resistência! (Vida/Def: ${c.hp}/${c.def})`,
                  'spell'
                );
              }
            } else {
              updated.push(c);
            }
          });
          return updated;
        };

        let nextPBoard = (pHasLunarioLvl2 || oHasLunarioLvl2)
          ? consumeBoardSleep(workingPBoard, currP.name, true)
          : workingPBoard;
        let nextOBoard = (pHasLunarioLvl2 || oHasLunarioLvl2)
          ? consumeBoardSleep(workingOBoard, currO.name, false)
          : workingOBoard;

        if (totalSleepConsumed > 0) {
          sound.playSpell();
          const statBonus = totalSleepConsumed * 5;

          // Buff Player's Lunario if present (+5 Sapiência / HP and +5 Poder por sono consumido)
          if (pHasLunarioLvl2) {
            const pLunario = nextPBoard.find(
              (c) => (c.templateId === 'g_lunario' || c.name.toLowerCase().includes('lunario')) && c.level === 2
            );
            if (pLunario) {
              pLunario.hp += statBonus;
              pLunario.maxHp += statBonus;
              pLunario.sapience = (pLunario.sapience ?? pLunario.hp) + statBonus;
              pLunario.baseSapience = (pLunario.baseSapience ?? pLunario.hp) + statBonus;
              addPowerPoints(pLunario, statBonus);
              if (obliteratedByPlayerLuaIds.length > 0 && pALuaLvl2Early) {
                queueUnitVfx({
                  type: 'a_lua_lunario_obliterate',
                  sourceId: pALuaLvl2Early.instanceId,
                  targetIds: obliteratedByPlayerLuaIds,
                  ownerSide: 'player',
                });
              } else if (sleepConsumedOpponentTargets.length + sleepConsumedPlayerTargets.length > 0) {
                queueUnitVfx({
                  type: 'lunario_lvl2_consume',
                  sourceId: pLunario.instanceId,
                  targetIds: [...sleepConsumedOpponentTargets, ...sleepConsumedPlayerTargets],
                  ownerSide: 'player',
                });
              }
              addLog(
                `🌙👑 [Lunario Supremo] Devorador de Sonhos! Absorveu ${totalSleepConsumed} Sono(s) na mesa! Ganhou +${statBonus} Sapiência e +${statBonus} Poder (Sapiência/HP: ${pLunario.hp}, Poder: ${pLunario.power})!`,
                'spell'
              );
            }
          }

          // Buff Opponent's Lunario if present
          if (oHasLunarioLvl2) {
            const oLunario = nextOBoard.find(
              (c) => (c.templateId === 'g_lunario' || c.name.toLowerCase().includes('lunario')) && c.level === 2
            );
            if (oLunario) {
              oLunario.hp += statBonus;
              oLunario.maxHp += statBonus;
              oLunario.sapience = (oLunario.sapience ?? oLunario.hp) + statBonus;
              oLunario.baseSapience = (oLunario.baseSapience ?? oLunario.hp) + statBonus;
              addPowerPoints(oLunario, statBonus);
              if (obliteratedByOpponentLuaIds.length > 0 && oALuaLvl2Early) {
                queueUnitVfx({
                  type: 'a_lua_lunario_obliterate',
                  sourceId: oALuaLvl2Early.instanceId,
                  targetIds: obliteratedByOpponentLuaIds,
                  ownerSide: 'opponent',
                });
              } else if (sleepConsumedPlayerTargets.length + sleepConsumedOpponentTargets.length > 0) {
                queueUnitVfx({
                  type: 'lunario_lvl2_consume',
                  sourceId: oLunario.instanceId,
                  targetIds: [...sleepConsumedPlayerTargets, ...sleepConsumedOpponentTargets],
                  ownerSide: 'opponent',
                });
              }
              addLog(
                `🌙👑 [Lunario Supremo Inimigo] Devorador de Sonhos! Absorveu ${totalSleepConsumed} Sono(s) na mesa! Ganhou +${statBonus} Sapiência e +${statBonus} Poder!`,
                'spell'
              );
            }
          }

          // Trigger Philio if any units died
          if (deadCardsOpponent.length > 0) {
            triggerPhilioEliminationBonus('player', deadCardsOpponent.length, deadCardsOpponent.map((d) => d.instanceId));
          }
          if (deadCardsPlayer.length > 0) {
            triggerPhilioEliminationBonus('opponent', deadCardsPlayer.length, deadCardsPlayer.map((d) => d.instanceId));
          }
        }

        // ----------------------------------------------------
        // BONETRUS & A LÂMINA DO INVERNO SYNERGY & LEVEL-UP
        // ----------------------------------------------------
        // Player side (only if Bonetrus is not silenced by Jurisdição de Saniel):
        const pBonetrus = nextPBoard.find(
          (c) => (c.templateId === 'm_bonetrus' || c.name.toLowerCase().includes('bonetrus')) && c.level === 1 && c.hp > 0 && c.silencedRounds === 0
        );
        const pLamina = nextPBoard.find((c) => c.templateId === 'm_lamina_inverno' && c.hp > 0 && c.silencedRounds === 0);
        if (pBonetrus && pLamina) {
          nextPBoard = nextPBoard.filter((c) => c.instanceId !== pLamina.instanceId);
          deadCardsPlayer.push(pLamina);
          pBonetrus.level = 2;
          pBonetrus.name = 'Bonetrus, Soberano do Inverno';
          pBonetrus.exclusiveName = 'Devastação Glacial';
          pBonetrus.effectDescription =
            'Lendária [Tier 5 - Nível 2 - Musmo]. Ao atacar inimigos afligidos por CONGELAR os executam caso tenha 12 ou menos de Vida. Se Bonetrus for designado sozinho para um ataque ele causa dano em TODAS as unidades da mesa inimiga além da carta que defende seu ataque (100% no defensor, 50% nas demais).';
          sound.playSpell();
          queueUnitVfx({
            type: 'bonetrus_lamina_attach',
            sourceId: pBonetrus.instanceId,
            secondarySourceId: pLamina.instanceId,
            ownerSide: 'player',
          });
          addLog(
            `❄️💀 [ASCENSÃO GLACIAL] Bonetrus empunhou A Lâmina do Inverno e subiu para o NÍVEL 2! A espada foi consumida pela essência de gelo!`,
            'spell'
          );
          triggerLevelUpCinematic(
            pBonetrus,
            '❄️💀 SOBERANO DO INVERNO DESPERTO! Bonetrus empunhou A Lâmina do Inverno e atingiu o Nível 2! Executa inimigos congelados com Vida <= 12 e desfere nevascas em área ao atacar sozinho!'
          );
        }

        // Opponent side (only if Bonetrus is not silenced by Jurisdição de Saniel):
        const oBonetrus = nextOBoard.find(
          (c) => (c.templateId === 'm_bonetrus' || c.name.toLowerCase().includes('bonetrus')) && c.level === 1 && c.hp > 0 && c.silencedRounds === 0
        );
        const oLamina = nextOBoard.find((c) => c.templateId === 'm_lamina_inverno' && c.hp > 0 && c.silencedRounds === 0);
        if (oBonetrus && oLamina) {
          nextOBoard = nextOBoard.filter((c) => c.instanceId !== oLamina.instanceId);
          deadCardsOpponent.push(oLamina);
          oBonetrus.level = 2;
          oBonetrus.name = 'Bonetrus, Soberano do Inverno';
          oBonetrus.exclusiveName = 'Devastação Glacial';
          oBonetrus.effectDescription =
            'Lendária [Tier 5 - Nível 2 - Musmo]. Ao atacar inimigos afligidos por CONGELAR os executam caso tenha 12 ou menos de Vida. Se Bonetrus for designado sozinho para um ataque ele causa dano em TODAS as unidades da mesa inimiga além da carta que defende seu ataque (100% no defensor, 50% nas demais).';
          queueUnitVfx({
            type: 'bonetrus_lamina_attach',
            sourceId: oBonetrus.instanceId,
            secondarySourceId: oLamina.instanceId,
            ownerSide: 'opponent',
          });
          addLog(
            `❄️💀 [ASCENSÃO DO INVERNO DO OPONENTE] ${currO.name}: Bonetrus empunhou A Lâmina do Inverno e subiu para o NÍVEL 2!`,
            'spell'
          );
          triggerLevelUpCinematic(
            oBonetrus,
            '❄️💀 SOBERANO DO INVERNO DESPERTO! Bonetrus empunhou A Lâmina do Inverno e atingiu o Nível 2!'
          );
        }

        // ----------------------------------------------------
        // A LÂMINA DO INVERNO ROUND TRIGGER:
        // A cada nova rodada aplica CONGELAR por 1 rodada em uma unidade inimiga aleatória que ainda não possua CONGELAR
        // ----------------------------------------------------
        const pLaminaSurviving = nextPBoard.find((c) => c.templateId === 'm_lamina_inverno' && c.hp > 0 && c.silencedRounds === 0);
        if (pLaminaSurviving) {
          const eligibleEnemies = nextOBoard.filter((c) => c.hp > 0 && !c.conditions.has('imunidade') && !c.conditions.has('congelado'));
          if (eligibleEnemies.length > 0) {
            const picked = eligibleEnemies[Math.floor(Math.random() * eligibleEnemies.length)];
            picked.conditions.add('congelado');
            setCardConditionSource(picked, 'congelado', 'unidade_inimiga', pLaminaSurviving.name);
            picked.freezeRoundsRemaining = 1;
            sound.playSpell();
            addLog(`❄️🗡️ [A Lâmina do Inverno] Uma ventania gélida congelou ${picked.name} do oponente por 1 rodada!`, 'spell');
          }
        }

        const oLaminaSurviving = nextOBoard.find((c) => c.templateId === 'm_lamina_inverno' && c.hp > 0 && c.silencedRounds === 0);
        if (oLaminaSurviving) {
          const eligibleEnemies = nextPBoard.filter((c) => c.hp > 0 && !c.conditions.has('imunidade') && !c.conditions.has('congelado'));
          if (eligibleEnemies.length > 0) {
            const picked = eligibleEnemies[Math.floor(Math.random() * eligibleEnemies.length)];
            picked.conditions.add('congelado');
            setCardConditionSource(picked, 'congelado', 'unidade_inimiga', oLaminaSurviving.name);
            picked.freezeRoundsRemaining = 1;
            addLog(`❄️🗡️ [A Lâmina do Inverno Inimiga] Uma ventania gélida congelou sua unidade ${picked.name} por 1 rodada!`, 'spell');
          }
        }

        // ----------------------------------------------------
        // O ATORMENTADOR ROUND TRIGGER:
        // Em toda rodada que estiver vivo, Atordoa a unidade inimiga mais forte na mesa inimiga por 1 rodada
        // ----------------------------------------------------
        const pAtormentador = nextPBoard.find(
          (c) => (c.templateId === 'm_atormentador' || c.name.toLowerCase().includes('atormentador')) && c.hp > 0 && c.silencedRounds === 0
        );
        if (pAtormentador) {
          const eligibleEnemies = nextOBoard.filter((c) => c.hp > 0 && !c.conditions.has('imunidade'));
          if (eligibleEnemies.length > 0) {
            const strongest = [...eligibleEnemies].sort((a, b) => (b.atk + b.power) - (a.atk + a.power))[0];
            strongest.conditions.add('atordoado');
            setCardConditionSource(strongest, 'atordoado', 'unidade_inimiga', pAtormentador.name);
            strongest.stunRoundsRemaining = 1;
            sound.playSpell();
            queueUnitVfx({
              type: 'atormentador_stun_bolt',
              sourceId: pAtormentador.instanceId,
              targetIds: [strongest.instanceId],
              ownerSide: 'player',
            });
            addLog(`⚡ [O Atormentador] Atordoou a unidade inimiga mais forte (${strongest.name}) nesta rodada!`, 'spell');
          }
        }

        const oAtormentador = nextOBoard.find(
          (c) => (c.templateId === 'm_atormentador' || c.name.toLowerCase().includes('atormentador')) && c.hp > 0 && c.silencedRounds === 0
        );
        if (oAtormentador) {
          const eligibleEnemies = nextPBoard.filter((c) => c.hp > 0 && !c.conditions.has('imunidade'));
          if (eligibleEnemies.length > 0) {
            const strongest = [...eligibleEnemies].sort((a, b) => (b.atk + b.power) - (a.atk + a.power))[0];
            strongest.conditions.add('atordoado');
            setCardConditionSource(strongest, 'atordoado', 'unidade_inimiga', oAtormentador.name);
            strongest.stunRoundsRemaining = 1;
            sound.playSpell();
            queueUnitVfx({
              type: 'atormentador_stun_bolt',
              sourceId: oAtormentador.instanceId,
              targetIds: [strongest.instanceId],
              ownerSide: 'opponent',
            });
            addLog(`⚡ [O Atormentador Inimigo] Atordoou sua unidade mais forte (${strongest.name}) nesta rodada!`, 'spell');
          }
        }

        // ----------------------------------------------------
        // BARÃO WELL (NÍVEL 2) ROUND TRIGGER:
        // A cada início de rodada, 2 inimigos aleatórios na mesa inimiga são atingidos por um raio,
        // causando 15 de dano e aplicando ELETRIFICADO por 1 rodada (+20% de dano ELÉTRICO recebido).
        // ----------------------------------------------------
        const pWellLvl2 = nextPBoard.find(
          (c) => (c.templateId === 'g_barao_well' || c.name.toLowerCase().includes('well')) && c.level === 2 && c.hp > 0 && c.silencedRounds === 0
        );
        if (pWellLvl2 && nextOBoard.length > 0) {
          const candidates = nextOBoard.filter((c) => c.hp > 0 && !c.conditions.has('imunidade'));
          const targets = [...candidates].sort(() => 0.5 - Math.random()).slice(0, 2);
          let wellKills = 0;
          const vfxBatch: Array<Omit<ConditionVfxEvent, 'id'>> = [];
          targets.forEach((t) => {
            if (t.conditions.has('barreira')) {
              t.conditions.delete('barreira');
              removeCardConditionSource(t, 'barreira');
              t.conditions.add('eletrificado');
              setCardConditionSource(t, 'eletrificado', 'unidade_inimiga', `${pWellLvl2.name} (Nível 2)`);
              t.eletrificadoRoundsRemaining = 1;
              vfxBatch.push({ condition: 'eletrificado', targetUnitId: t.instanceId, targetUnitName: t.name, targetSide: 'opponent' });
              addLog(`⚡🛡️ [Barão Well Nível 2] Raio atingiu ${t.name}: Barreira quebrada e aplicado ELETRIFICADO (+20% dano Elétrico)!`, 'spell');
              return;
            }
            let rawDmg = t.conditions.has('eletrificado') ? Math.round(15 * 1.20) : 15;
            if (t.conditions.has('congelado')) rawDmg = Math.round(rawDmg * 1.5);
            if (t.conditions.has('tenacidade')) rawDmg = Math.max(0, Math.round(rawDmg * 0.65));
            const defAbs = Math.min(t.def, rawDmg);
            t.def -= defAbs;
            const hpDmg = rawDmg - defAbs;
            t.hp = Math.max(0, t.hp - hpDmg);
            if (t.element === 'Cósmico' || t.sapience != null) t.sapience = t.hp;
            t.conditions.add('eletrificado');
            setCardConditionSource(t, 'eletrificado', 'unidade_inimiga', `${pWellLvl2.name} (Nível 2)`);
            t.eletrificadoRoundsRemaining = 1;
            vfxBatch.push({ condition: 'eletrificado', targetUnitId: t.instanceId, targetUnitName: t.name, targetSide: 'opponent' });
            if (t.hp <= 0) {
              wellKills += 1;
              addLog(`⚡💀 [Barão Well Nível 2] Raio fulminou ${t.name} (${rawDmg} de dano elétrico)!`, 'kill');
            } else {
              addLog(`⚡ [Barão Well Nível 2] Raio atingiu ${t.name} causando ${rawDmg} de dano e aplicando ELETRIFICADO (+20% dano Elétrico)!`, 'spell');
            }
          });
          if (vfxBatch.length > 0) queueConditionVfx(vfxBatch);
          if (targets.length > 0) {
            queueUnitVfx({
              type: 'barao_well_lvl2_bolts',
              sourceId: pWellLvl2.instanceId,
              targetIds: targets.map((t) => t.instanceId),
              ownerSide: 'player',
            });
          }
          if (wellKills > 0) {
            const killedWell = nextOBoard.filter((c) => c.hp <= 0);
            deadCardsOpponent.push(...killedWell);
            nextOBoard = nextOBoard.filter((c) => c.hp > 0);
            triggerPhilioEliminationBonus('player', wellKills, killedWell.map((d) => d.instanceId));
          }
          if (targets.length > 0) sound.playSpell();
        }

        const oWellLvl2 = nextOBoard.find(
          (c) => (c.templateId === 'g_barao_well' || c.name.toLowerCase().includes('well')) && c.level === 2 && c.hp > 0 && c.silencedRounds === 0
        );
        if (oWellLvl2 && nextPBoard.length > 0) {
          const candidates = nextPBoard.filter((c) => c.hp > 0 && !c.conditions.has('imunidade'));
          const targets = [...candidates].sort(() => 0.5 - Math.random()).slice(0, 2);
          let wellKills = 0;
          const vfxBatch: Array<Omit<ConditionVfxEvent, 'id'>> = [];
          targets.forEach((t) => {
            if (t.conditions.has('barreira')) {
              t.conditions.delete('barreira');
              removeCardConditionSource(t, 'barreira');
              t.conditions.add('eletrificado');
              setCardConditionSource(t, 'eletrificado', 'unidade_inimiga', `${oWellLvl2.name} (Nível 2)`);
              t.eletrificadoRoundsRemaining = 1;
              vfxBatch.push({ condition: 'eletrificado', targetUnitId: t.instanceId, targetUnitName: t.name, targetSide: 'player' });
              addLog(`⚡🛡️ [Barão Well Inimigo Nível 2] Raio atingiu ${t.name}: Barreira quebrada e aplicado ELETRIFICADO (+20% dano Elétrico)!`, 'spell');
              return;
            }
            let rawDmg = t.conditions.has('eletrificado') ? Math.round(15 * 1.20) : 15;
            if (t.conditions.has('congelado')) rawDmg = Math.round(rawDmg * 1.5);
            if (t.conditions.has('tenacidade')) rawDmg = Math.max(0, Math.round(rawDmg * 0.65));
            const defAbs = Math.min(t.def, rawDmg);
            t.def -= defAbs;
            const hpDmg = rawDmg - defAbs;
            t.hp = Math.max(0, t.hp - hpDmg);
            if (t.element === 'Cósmico' || t.sapience != null) t.sapience = t.hp;
            t.conditions.add('eletrificado');
            setCardConditionSource(t, 'eletrificado', 'unidade_inimiga', `${oWellLvl2.name} (Nível 2)`);
            t.eletrificadoRoundsRemaining = 1;
            vfxBatch.push({ condition: 'eletrificado', targetUnitId: t.instanceId, targetUnitName: t.name, targetSide: 'player' });
            if (t.hp <= 0) {
              wellKills += 1;
              addLog(`⚡💀 [Barão Well Inimigo Nível 2] Raio fulminou sua unidade ${t.name} (${rawDmg} de dano elétrico)!`, 'kill');
            } else {
              addLog(`⚡ [Barão Well Inimigo Nível 2] Raio atingiu ${t.name} causando ${rawDmg} de dano e aplicando ELETRIFICADO (+20% dano Elétrico)!`, 'spell');
            }
          });
          if (vfxBatch.length > 0) queueConditionVfx(vfxBatch);
          if (targets.length > 0) {
            queueUnitVfx({
              type: 'barao_well_lvl2_bolts',
              sourceId: oWellLvl2.instanceId,
              targetIds: targets.map((t) => t.instanceId),
              ownerSide: 'opponent',
            });
          }
          if (wellKills > 0) {
            const killedWell = nextPBoard.filter((c) => c.hp <= 0);
            deadCardsPlayer.push(...killedWell);
            nextPBoard = nextPBoard.filter((c) => c.hp > 0);
            triggerPhilioEliminationBonus('opponent', wellKills, killedWell.map((d) => d.instanceId));
          }
          if (targets.length > 0) sound.playSpell();
        }

        // ----------------------------------------------------
        // VILMA, A BRUXA DO FOGO ROUND TRIGGER:
        // "Enquanto estiver na mesa causa 2 de dano a todas unidades inimigas por rodada."
        // ----------------------------------------------------
        const pVilmas = nextPBoard.filter(
          (c) =>
            (c.templateId === 'm_vilma' || c.name.toLowerCase().includes('vilma')) &&
            c.hp > 0 &&
            c.silencedRounds === 0
        );
        if (pVilmas.length > 0 && nextOBoard.length > 0) {
          const totalVilmaDmg = 2 * pVilmas.length;
          const vilmaTargets = nextOBoard.map((c) => c.instanceId);
          let killsByPlayerVilma = 0;
          const updatedOBoard: CardInstance[] = [];
          const killedVilmaIds: string[] = [];
          nextOBoard.forEach((enemyUnit) => {
            const isImmortalSol =
              (enemyUnit.templateId === 'n_o_sol' || enemyUnit.name.trim().toLowerCase().startsWith('o sol')) &&
              enemyUnit.level === 2;
            const isEnemyVilmaImmune =
              (enemyUnit.templateId === 'm_vilma' || enemyUnit.name.toLowerCase().includes('vilma')) &&
              enemyUnit.silencedRounds === 0;
            if (enemyUnit.hp <= 0 || isImmortalSol || isEnemyVilmaImmune) {
              updatedOBoard.push(enemyUnit);
              return;
            }
            const u = { ...enemyUnit, conditions: new Set(enemyUnit.conditions) };
            let adjVilmaDmg = totalVilmaDmg;
            if (u.conditions.has('congelado')) adjVilmaDmg = Math.round(adjVilmaDmg * 1.5);
            if (u.conditions.has('tenacidade')) adjVilmaDmg = Math.max(0, Math.round(adjVilmaDmg * 0.65));
            const defAbs = Math.min(u.def, adjVilmaDmg);
            u.def -= defAbs;
            const hpDmg = adjVilmaDmg - defAbs;
            u.hp = Math.max(0, u.hp - hpDmg);
            if (u.element === 'Cósmico' || u.sapience != null) {
              u.sapience = u.hp;
            }
            if (u.hp <= 0) {
              deadCardsOpponent.push(u);
              killedVilmaIds.push(u.instanceId);
              killsByPlayerVilma += 1;
              addLog(
                `🔥🧙‍♀️ [Vilma, a Bruxa do Fogo] As chamas de Vilma consumiram ${u.name} (${totalVilmaDmg} de dano)!`,
                'kill'
              );
            } else {
              updatedOBoard.push(u);
            }
          });
          nextOBoard = updatedOBoard;
          sound.playSpell();
          queueUnitVfx({
            type: 'vilma_fire_wave',
            sourceId: pVilmas[0].instanceId,
            targetIds: vilmaTargets,
            ownerSide: 'player',
          });
          addLog(
            `🔥🧙‍♀️ [Vilma, a Bruxa do Fogo] Causou ${totalVilmaDmg} de dano de Fogo a todas as unidades inimigas na mesa!`,
            'spell'
          );
          if (killsByPlayerVilma > 0) {
            triggerPhilioEliminationBonus('player', killsByPlayerVilma, killedVilmaIds);
          }
        }

        const oVilmas = nextOBoard.filter(
          (c) =>
            (c.templateId === 'm_vilma' || c.name.toLowerCase().includes('vilma')) &&
            c.hp > 0 &&
            c.silencedRounds === 0
        );
        if (oVilmas.length > 0 && nextPBoard.length > 0) {
          const totalVilmaDmg = 2 * oVilmas.length;
          const vilmaTargets = nextPBoard.map((c) => c.instanceId);
          let killsByOpponentVilma = 0;
          const updatedPBoard: CardInstance[] = [];
          const killedVilmaIds: string[] = [];
          nextPBoard.forEach((playerUnit) => {
            const isImmortalSol =
              (playerUnit.templateId === 'n_o_sol' || playerUnit.name.trim().toLowerCase().startsWith('o sol')) &&
              playerUnit.level === 2;
            const isPlayerVilmaImmune =
              (playerUnit.templateId === 'm_vilma' || playerUnit.name.toLowerCase().includes('vilma')) &&
              playerUnit.silencedRounds === 0;
            if (playerUnit.hp <= 0 || isImmortalSol || isPlayerVilmaImmune) {
              updatedPBoard.push(playerUnit);
              return;
            }
            const u = { ...playerUnit, conditions: new Set(playerUnit.conditions) };
            const defAbs = Math.min(u.def, totalVilmaDmg);
            u.def -= defAbs;
            const hpDmg = totalVilmaDmg - defAbs;
            u.hp = Math.max(0, u.hp - hpDmg);
            if (u.element === 'Cósmico' || u.sapience != null) {
              u.sapience = u.hp;
            }
            if (u.hp <= 0) {
              deadCardsPlayer.push(u);
              killedVilmaIds.push(u.instanceId);
              killsByOpponentVilma += 1;
              addLog(
                `🔥🧙‍♀️ [Vilma Inimiga] As chamas de Vilma eliminaram sua unidade ${u.name} (${totalVilmaDmg} de dano)!`,
                'kill'
              );
            } else {
              updatedPBoard.push(u);
            }
          });
          nextPBoard = updatedPBoard;
          sound.playSpell();
          queueUnitVfx({
            type: 'vilma_fire_wave',
            sourceId: oVilmas[0].instanceId,
            targetIds: vilmaTargets,
            ownerSide: 'opponent',
          });
          addLog(
            `🔥🧙‍♀️ [Vilma Inimiga] Causou ${totalVilmaDmg} de dano de Fogo a todas as suas unidades na mesa!`,
            'spell'
          );
          if (killsByOpponentVilma > 0) {
            triggerPhilioEliminationBonus('opponent', killsByOpponentVilma, killedVilmaIds);
          }
        }

        // ----------------------------------------------------
        // O SOL & A LUA (NÍVEL 2) - DRENO DE VIDA AO JOGADOR INIMIGO:
        // "A cada rodada reduz a vida do jogador inimigo em 1. Ao chegar a ZERO o jogador inimigo é derrotado."
        // ----------------------------------------------------
        const pALuaLvl2 = nextPBoard.find(
          (c) =>
            (c.templateId === 'g_a_lua' || c.name.trim().toLowerCase().startsWith('a lua')) &&
            c.level === 2 &&
            c.hp > 0 &&
            c.silencedRounds === 0
        );
        const oALuaLvl2 = nextOBoard.find(
          (c) =>
            (c.templateId === 'g_a_lua' || c.name.trim().toLowerCase().startsWith('a lua')) &&
            c.level === 2 &&
            c.hp > 0 &&
            c.silencedRounds === 0
        );
        const pOSolLvl2 = nextPBoard.find(
          (c) =>
            (c.templateId === 'n_o_sol' || c.name.trim().toLowerCase().startsWith('o sol')) &&
            c.level === 2 &&
            c.hp > 0 &&
            c.silencedRounds === 0
        );
        const oOSolLvl2 = nextOBoard.find(
          (c) =>
            (c.templateId === 'n_o_sol' || c.name.trim().toLowerCase().startsWith('o sol')) &&
            c.level === 2 &&
            c.hp > 0 &&
            c.silencedRounds === 0
        );

        if (pOSolLvl2) {
          sound.playPlayerHit();
          queueUnitVfx({
            type: 'o_sol_lvl2_drain',
            sourceId: pOSolLvl2.instanceId,
            targetPlayerSide: 'opponent',
            ownerSide: 'player',
          });
          addLog(
            `🕳️☀️ [O ABSOLUTO - O Sol Nível 2] O Buraco Negro reduziu a vida de ${currO.name} em 1 ponto!`,
            'attack'
          );
        }
        if (pALuaLvl2) {
          sound.playPlayerHit();
          queueUnitVfx({
            type: 'a_lua_lvl2_drain',
            sourceId: pALuaLvl2.instanceId,
            targetPlayerSide: 'opponent',
            ownerSide: 'player',
          });
          addLog(
            `🌕🩸 [A EMINENTE - A Lua Nível 2] A presença aniquiladora drenou 1 de vida de ${currO.name}!`,
            'attack'
          );
        }
        if (oOSolLvl2) {
          sound.playPlayerHit();
          queueUnitVfx({
            type: 'o_sol_lvl2_drain',
            sourceId: oOSolLvl2.instanceId,
            targetPlayerSide: 'player',
            ownerSide: 'opponent',
          });
          addLog(
            `🕳️☀️ [O ABSOLUTO - O Sol Inimigo Nível 2] O Buraco Negro reduziu a sua Vida em 1 ponto!`,
            'attack'
          );
        }
        if (oALuaLvl2) {
          sound.playPlayerHit();
          queueUnitVfx({
            type: 'a_lua_lvl2_drain',
            sourceId: oALuaLvl2.instanceId,
            targetPlayerSide: 'player',
            ownerSide: 'opponent',
          });
          addLog(
            `🌕🩸 [A EMINENTE - A Lua Inimiga Nível 2] A presença aniquiladora drenou 1 da sua Vida!`,
            'attack'
          );
        }

        // ----------------------------------------------------
        // ATLAZIEL, O ARCANJO CAÍDO (TIER 2 - MUSMO - SOMBRIO):
        // "Ao encerrar a rodada em que Atlaziel estiver na mesa EXECUTA inimigos com 17 ou menos de Vida afetados por PRAGA."
        // ----------------------------------------------------
        const pAtlaziels = nextPBoard.filter(
          (c) => (c.templateId === 'm_atlaziel' || c.name.toLowerCase().includes('atlaziel')) && c.hp > 0 && c.silencedRounds === 0
        );
        if (pAtlaziels.length > 0 && nextOBoard.length > 0) {
          const executedTargetIds: string[] = [];
          const survivingOBoard: CardInstance[] = [];
          const conditionVfxBatch: Array<Omit<ConditionVfxEvent, 'id'>> = [];

          nextOBoard.forEach((enemyUnit) => {
            const hasPragaActive = enemyUnit.conditions.has('praga') || (enemyUnit.pragaRoundsRemaining ?? 0) > 0;
            const isImmortal = isOSolLevel2Immortal(enemyUnit) || isALuaLevel2Supreme(enemyUnit) || enemyUnit.conditions.has('imunidade');
            if (enemyUnit.hp > 0 && hasPragaActive && enemyUnit.hp <= 17 && !isImmortal) {
              // Check General Bor revival
              if (enemyUnit.templateId === 'g_bor' && !currO.borRevivedOnce && enemyUnit.silencedRounds === 0) {
                enemyUnit.hp = Math.round(enemyUnit.maxHp * 1.5);
                enemyUnit.maxHp = enemyUnit.hp;
                enemyUnit.atk = Math.round(enemyUnit.atk * 1.5);
                enemyUnit.def = Math.round(enemyUnit.def * 1.5);
                enemyUnit.icePeakDefense = Math.max(enemyUnit.icePeakDefense ?? 0, enemyUnit.def);
                addPowerPoints(enemyUnit, Math.max(0, Math.round(enemyUnit.power * 1.5) - enemyUnit.power), false);
                enemyUnit.conditions.add('cura');
                setCardConditionSource(enemyUnit, 'cura', 'passiva_propria', enemyUnit.name);
                setOpponent((prev) => ({ ...prev, borRevivedOnce: true }));
                survivingOBoard.push(enemyUnit);
                triggerBorPhoenixVfx(enemyUnit.instanceId, 'opponent', 350);
                addLog(`🔥 [O Mesofênix] General Bor foi executado por Atlaziel, mas renasceu das cinzas com +50% em atributos e Cura!`, 'spell');
                return;
              }
              // Check Ressurreição
              if (enemyUnit.conditions.has('ressurreicao')) {
                enemyUnit.conditions.delete('ressurreicao');
                removeCardConditionSource(enemyUnit, 'ressurreicao');
                enemyUnit.permanentRessurreicao = false;
                removePragaFromUnit(enemyUnit);
                enemyUnit.hp = enemyUnit.maxHp;
                enemyUnit.atk = enemyUnit.baseAtk;
                enemyUnit.def = enemyUnit.baseDef;
                enemyUnit.icePeakDefense = enemyUnit.baseDef;
                enemyUnit.power = enemyUnit.basePower;
                enemyUnit.peakPower = enemyUnit.basePower;
                syncClassPowerBonuses(enemyUnit);
                survivingOBoard.push(enemyUnit);
                triggerResurrectionVfx(
                  [{ unitId: enemyUnit.instanceId, unitName: enemyUnit.name, side: 'opponent' }],
                  350
                );
                addLog(`🪽 [Ressurreição] ${enemyUnit.name} foi executado por Atlaziel, mas ressuscitou com atributos restaurados!`, 'spell');
                return;
              }
              executedTargetIds.push(enemyUnit.instanceId);
              conditionVfxBatch.push({
                condition: 'executar',
                targetUnitId: enemyUnit.instanceId,
                targetUnitName: enemyUnit.name,
                targetSide: 'opponent',
              });
              // If executed enemy unit was Barelio holding a prisoner, free the prisoner to player's board!
              if (enemyUnit.imprisonedUnit && enemyUnit.imprisonedUnit.hp > 0) {
                const rescued = { ...enemyUnit.imprisonedUnit, conditions: new Set(enemyUnit.imprisonedUnit.conditions) };
                enemyUnit.imprisonedUnit = undefined;
                enemyUnit.imprisonedOriginalOwner = undefined;
                nextPBoard.push(rescued);
                addLog(`⛓️🔓 [LIBERTAÇÃO!] Com a execução de ${enemyUnit.name}, ${rescued.name} se libertou das correntes e retornou à sua mesa!`, 'spell');
              }
              deadCardsOpponent.push({ ...enemyUnit, hp: 0, def: 0 });
              addLog(`💀🌑 [Atlaziel, o Arcanjo Caído] EXECUTOU ${enemyUnit.name} (Vida ${enemyUnit.hp} <= 17 sob efeito de PRAGA)!`, 'kill');
            } else {
              survivingOBoard.push(enemyUnit);
            }
          });

          nextOBoard = survivingOBoard;
          if (executedTargetIds.length > 0) {
            sound.playDeath();
            queueUnitVfx({
              type: 'atlaziel_fallen_execute',
              sourceId: pAtlaziels[0].instanceId,
              targetIds: executedTargetIds,
              ownerSide: 'player',
            });
            queueConditionVfx(conditionVfxBatch);
            triggerPhilioEliminationBonus('player', executedTargetIds.length, executedTargetIds);
          }
        }

        const oAtlaziels = nextOBoard.filter(
          (c) => (c.templateId === 'm_atlaziel' || c.name.toLowerCase().includes('atlaziel')) && c.hp > 0 && c.silencedRounds === 0
        );
        if (oAtlaziels.length > 0 && nextPBoard.length > 0) {
          const executedTargetIds: string[] = [];
          const survivingPBoard: CardInstance[] = [];
          const conditionVfxBatch: Array<Omit<ConditionVfxEvent, 'id'>> = [];

          nextPBoard.forEach((playerUnit) => {
            const hasPragaActive = playerUnit.conditions.has('praga') || (playerUnit.pragaRoundsRemaining ?? 0) > 0;
            const isImmortal = isOSolLevel2Immortal(playerUnit) || isALuaLevel2Supreme(playerUnit) || playerUnit.conditions.has('imunidade');
            if (playerUnit.hp > 0 && hasPragaActive && playerUnit.hp <= 17 && !isImmortal) {
              if (playerUnit.templateId === 'g_bor' && !currP.borRevivedOnce && playerUnit.silencedRounds === 0) {
                playerUnit.hp = Math.round(playerUnit.maxHp * 1.5);
                playerUnit.maxHp = playerUnit.hp;
                playerUnit.atk = Math.round(playerUnit.atk * 1.5);
                playerUnit.def = Math.round(playerUnit.def * 1.5);
                playerUnit.icePeakDefense = Math.max(playerUnit.icePeakDefense ?? 0, playerUnit.def);
                addPowerPoints(playerUnit, Math.max(0, Math.round(playerUnit.power * 1.5) - playerUnit.power), false);
                playerUnit.conditions.add('cura');
                setCardConditionSource(playerUnit, 'cura', 'passiva_propria', playerUnit.name);
                setPlayer((prev) => ({ ...prev, borRevivedOnce: true }));
                survivingPBoard.push(playerUnit);
                triggerBorPhoenixVfx(playerUnit.instanceId, 'player', 350);
                addLog(`🔥 [O Mesofênix] General Bor foi executado por Atlaziel inimigo, mas renasceu das cinzas com +50% em atributos e Cura!`, 'spell');
                return;
              }
              if (playerUnit.conditions.has('ressurreicao')) {
                playerUnit.conditions.delete('ressurreicao');
                removeCardConditionSource(playerUnit, 'ressurreicao');
                playerUnit.permanentRessurreicao = false;
                removePragaFromUnit(playerUnit);
                playerUnit.hp = playerUnit.maxHp;
                playerUnit.atk = playerUnit.baseAtk;
                playerUnit.def = playerUnit.baseDef;
                playerUnit.icePeakDefense = playerUnit.baseDef;
                playerUnit.power = playerUnit.basePower;
                playerUnit.peakPower = playerUnit.basePower;
                syncClassPowerBonuses(playerUnit);
                survivingPBoard.push(playerUnit);
                triggerResurrectionVfx(
                  [{ unitId: playerUnit.instanceId, unitName: playerUnit.name, side: 'player' }],
                  350
                );
                addLog(`🪽 [Ressurreição] ${playerUnit.name} foi executado por Atlaziel inimigo, mas ressuscitou com atributos restaurados!`, 'spell');
                return;
              }
              executedTargetIds.push(playerUnit.instanceId);
              conditionVfxBatch.push({
                condition: 'executar',
                targetUnitId: playerUnit.instanceId,
                targetUnitName: playerUnit.name,
                targetSide: 'player',
              });
              if (playerUnit.imprisonedUnit && playerUnit.imprisonedUnit.hp > 0) {
                const rescued = { ...playerUnit.imprisonedUnit, conditions: new Set(playerUnit.imprisonedUnit.conditions) };
                playerUnit.imprisonedUnit = undefined;
                playerUnit.imprisonedOriginalOwner = undefined;
                nextOBoard.push(rescued);
                addLog(`⛓️🔓 [LIBERTAÇÃO!] Com a execução de ${playerUnit.name}, ${rescued.name} se libertou das correntes e retornou à mesa inimiga!`, 'spell');
              }
              deadCardsPlayer.push({ ...playerUnit, hp: 0, def: 0 });
              addLog(`💀🌑 [Atlaziel Inimigo] EXECUTOU sua unidade ${playerUnit.name} (Vida ${playerUnit.hp} <= 17 sob efeito de PRAGA)!`, 'kill');
            } else {
              survivingPBoard.push(playerUnit);
            }
          });

          nextPBoard = survivingPBoard;
          if (executedTargetIds.length > 0) {
            sound.playDeath();
            queueUnitVfx({
              type: 'atlaziel_fallen_execute',
              sourceId: oAtlaziels[0].instanceId,
              targetIds: executedTargetIds,
              ownerSide: 'opponent',
            });
            queueConditionVfx(conditionVfxBatch);
            triggerPhilioEliminationBonus('opponent', executedTargetIds.length, executedTargetIds);
          }
        }

        // ----------------------------------------------------
        // BARELIO, O CARCEREIRO (TIER 4 - NANEYA - SOMBRIO):
        // "Barelio usurpa a unidade presa até que ela morra causando 10 de dano por rodada preso;
        // caso Barelio mate a unidade presa ele recebe todos os valores de seus atributos."
        // ----------------------------------------------------
        const barelioKilledPrisonerThisTick = new Set<string>();
        nextPBoard.forEach((u) => {
          if (u.hp > 0 && u.silencedRounds === 0 && u.imprisonedUnit && u.imprisonedUnit.hp > 0) {
            const prisoner = { ...u.imprisonedUnit, conditions: new Set(u.imprisonedUnit.conditions) };
            prisoner.hp = Math.max(0, prisoner.hp - 10);
            if (prisoner.sapience != null) prisoner.sapience = prisoner.hp;
            queueUnitVfx({
              type: 'barelio_usurp_tick',
              sourceId: u.instanceId,
              targetIds: [prisoner.instanceId],
              ownerSide: 'player',
              label: `⛓️🩸 USURPAÇÃO DE BARELIO · -10 VIDA EM ${prisoner.name.toUpperCase()}!`,
            });
            if (prisoner.hp <= 0) {
              const gainHp = prisoner.maxHp + (prisoner.pragaReducedMaxHp ?? 0);
              const gainAtk = prisoner.atk + (prisoner.pragaReducedAtk ?? 0);
              const gainDef = Math.max(prisoner.def, prisoner.baseDef) + (prisoner.pragaReducedDef ?? 0);
              const gainPwr = prisoner.power + (prisoner.pragaReducedPower ?? 0);
              u.hp += gainHp;
              u.maxHp += gainHp;
              u.atk += gainAtk;
              u.baseAtk += gainAtk;
              addDefensePoints(u, gainDef);
              addPowerPoints(u, gainPwr);
              u.imprisonedUnit = undefined;
              u.imprisonedOriginalOwner = undefined;
              barelioKilledPrisonerThisTick.add(u.instanceId);
              deadCardsOpponent.push({ ...prisoner, hp: 0, def: 0 });
              triggerPhilioEliminationBonus('player', 1, [prisoner.instanceId]);
              sound.playDeath();
              addLog(
                `⛓️💀 [USURPAÇÃO DE BARELIO!] ${prisoner.name} morreu nas correntes de ${u.name}! Barelio absorveu todos os seus atributos (+${gainHp} Vida, +${gainAtk} Ataque, +${gainDef} Defesa, +${gainPwr} Poder)!`,
                'kill'
              );
            } else {
              u.imprisonedUnit = prisoner;
              sound.playSpell();
              addLog(
                `⛓️🩸 [Cárcere de Barelio] ${prisoner.name} sofreu 10 de dano nas correntes de ${u.name} (Vida restante: ${prisoner.hp}/${prisoner.maxHp})!`,
                'spell'
              );
            }
          }
        });

        nextOBoard.forEach((u) => {
          if (u.hp > 0 && u.silencedRounds === 0 && u.imprisonedUnit && u.imprisonedUnit.hp > 0) {
            const prisoner = { ...u.imprisonedUnit, conditions: new Set(u.imprisonedUnit.conditions) };
            prisoner.hp = Math.max(0, prisoner.hp - 10);
            if (prisoner.sapience != null) prisoner.sapience = prisoner.hp;
            queueUnitVfx({
              type: 'barelio_usurp_tick',
              sourceId: u.instanceId,
              targetIds: [prisoner.instanceId],
              ownerSide: 'opponent',
              label: `⛓️🩸 USURPAÇÃO DE BARELIO · -10 VIDA EM ${prisoner.name.toUpperCase()}!`,
            });
            if (prisoner.hp <= 0) {
              const gainHp = prisoner.maxHp + (prisoner.pragaReducedMaxHp ?? 0);
              const gainAtk = prisoner.atk + (prisoner.pragaReducedAtk ?? 0);
              const gainDef = Math.max(prisoner.def, prisoner.baseDef) + (prisoner.pragaReducedDef ?? 0);
              const gainPwr = prisoner.power + (prisoner.pragaReducedPower ?? 0);
              u.hp += gainHp;
              u.maxHp += gainHp;
              u.atk += gainAtk;
              u.baseAtk += gainAtk;
              addDefensePoints(u, gainDef);
              addPowerPoints(u, gainPwr);
              u.imprisonedUnit = undefined;
              u.imprisonedOriginalOwner = undefined;
              barelioKilledPrisonerThisTick.add(u.instanceId);
              deadCardsPlayer.push({ ...prisoner, hp: 0, def: 0 });
              triggerPhilioEliminationBonus('opponent', 1, [prisoner.instanceId]);
              sound.playDeath();
              addLog(
                `⛓️💀 [USURPAÇÃO DE BARELIO INIMIGO!] Sua unidade ${prisoner.name} morreu nas correntes de ${u.name}! Barelio absorveu todos os seus atributos (+${gainHp} Vida, +${gainAtk} Ataque, +${gainDef} Defesa, +${gainPwr} Poder)!`,
                'kill'
              );
            } else {
              u.imprisonedUnit = prisoner;
              sound.playSpell();
              addLog(
                `⛓️🩸 [Cárcere de Barelio Inimigo] Sua unidade ${prisoner.name} sofreu 10 de dano nas correntes de ${u.name} (Vida restante: ${prisoner.hp}/${prisoner.maxHp})!`,
                'spell'
              );
            }
          }
        });

        // ----------------------------------------------------
        // SANGRAMENTO (-2 VIDA/RODADA) & HEMORRAGIA (4 MARCAS -> 25% DA VIDA MÁXIMA + GANGNYR ROUBO DE VIDA):
        // "Causa 2 de dano a cada rodada ativo. Ao causar dano 4 vezes no mesmo inimigo, em sequência ou intercalando,
        // o sangramento se transforma em hemorragia e causa 25% da vida máxima da unidade afetada.
        // Após hemorragia ativar na unidade o contador de sangramento reseta para ela, podendo receber sangramento e hemorragia novamente ao completar as 4 marcas."
        // ----------------------------------------------------
        const bleedCondVfxBatch: Array<Omit<ConditionVfxEvent, 'id'>> = [];
        let hemorrhageOccurred = false;
        const hemorrhageVictimIds: string[] = [];

        const processBoardBleed = (
          board: CardInstance[],
          otherBoard: CardInstance[],
          side: 'player' | 'opponent',
          deadList: CardInstance[]
        ): CardInstance[] => {
          const surviving: CardInstance[] = [];
          const killedIds: string[] = [];

          board.forEach((u) => {
            const hasBleed =
              u.conditions.has('sangramento') || (u.sangramentoRoundsRemaining && u.sangramentoRoundsRemaining > 0);
            const isImmortal =
              isOSolLevel2Immortal(u) || isALuaLevel2Supreme(u) || u.conditions.has('imunidade');

            if (!hasBleed || u.hp <= 0 || isImmortal) {
              if (isImmortal && hasBleed) {
                u.conditions.delete('sangramento');
                u.sangramentoRoundsRemaining = 0;
                removeCardConditionSource(u, 'sangramento');
              }
              surviving.push(u);
              return;
            }

            // 1. Causa 2 de dano diretamente na Vida por rodada ativo
            u.hp = Math.max(0, u.hp - 2);
            if (u.sapience != null) u.sapience = u.hp;
            u.sangramentoRoundsRemaining = Math.max(0, (u.sangramentoRoundsRemaining ?? 1) - 1);
            u.sangramentoMarks = (u.sangramentoMarks || 0) + 1;

            if (u.sangramentoRoundsRemaining <= 0) {
              u.conditions.delete('sangramento');
              removeCardConditionSource(u, 'sangramento');
            }

            // 2. Verifica se completou 4 marcas (em sequência ou intercalando) -> transforma em Hemorragia!
            if (u.sangramentoMarks >= 4) {
              const hemoDmg = Math.max(1, Math.floor(u.maxHp * 0.25));
              u.hp = Math.max(0, u.hp - hemoDmg);
              if (u.sapience != null) u.sapience = u.hp;
              u.sangramentoMarks = 0;
              u.sangramentoRoundsRemaining = 0;
              u.conditions.delete('sangramento');
              removeCardConditionSource(u, 'sangramento');
              hemorrhageOccurred = true;
              hemorrhageVictimIds.push(u.instanceId);
              bleedCondVfxBatch.push({
                condition: 'hemorragia',
                targetUnitId: u.instanceId,
                targetUnitName: u.name,
                targetSide: side,
                labelOverride: `💔🩸 HEMORRAGIA! -${hemoDmg} VIDA (25% MÁX) + -2 SANGRAMENTO!`,
              });
              addLog(
                `💔🩸 [HEMORRAGIA!] ${u.name} atingiu a 4ª marca de Sangramento! Sofreu 2 de Sangramento + ${hemoDmg} de Hemorragia (25% da Vida Máxima) e teve o contador de marcas resetado (Vida: ${u.hp}/${u.maxHp})!`,
                'spell'
              );
            } else {
              bleedCondVfxBatch.push({
                condition: 'sangramento',
                targetUnitId: u.instanceId,
                targetUnitName: u.name,
                targetSide: side,
                labelOverride: `🩸 SANGRAMENTO (-2 VIDA · MARCAS ${u.sangramentoMarks}/4)`,
              });
              addLog(
                `🩸 [Sangramento] ${u.name} sofreu 2 de dano de Sangramento (Marcas: ${u.sangramentoMarks}/4 para Hemorragia · ${u.sangramentoRoundsRemaining}r restante(s))!`,
                'spell'
              );
            }

            if (u.hp <= 0) {
              const ownerState = side === 'player' ? currP : currO;
              const ownerSetter = side === 'player' ? setPlayer : setOpponent;
              if (u.templateId === 'g_bor' && !ownerState.borRevivedOnce && u.silencedRounds === 0) {
                u.hp = Math.round(u.maxHp * 1.5);
                u.maxHp = u.hp;
                u.atk = Math.round(u.atk * 1.5);
                u.def = Math.round(u.def * 1.5);
                u.icePeakDefense = Math.max(u.icePeakDefense ?? 0, u.def);
                addPowerPoints(u, Math.max(0, Math.round(u.power * 1.5) - u.power), false);
                u.conditions.add('cura');
                setCardConditionSource(u, 'cura', 'passiva_propria', u.name);
                ownerSetter((prev) => ({ ...prev, borRevivedOnce: true }));
                surviving.push(u);
                triggerBorPhoenixVfx(u.instanceId, side, 320);
                addLog(`🔥 [O Mesofênix] General Bor sucumbiu ao Sangramento, mas renasceu das cinzas!`, 'spell');
                return;
              }
              if (u.conditions.has('ressurreicao')) {
                u.conditions.delete('ressurreicao');
                removeCardConditionSource(u, 'ressurreicao');
                u.permanentRessurreicao = false;
                u.conditions.delete('sangramento');
                u.sangramentoRoundsRemaining = 0;
                u.sangramentoMarks = 0;
                u.hp = u.maxHp;
                u.atk = u.baseAtk;
                u.def = u.baseDef;
                u.power = u.basePower;
                u.peakPower = u.basePower;
                syncClassPowerBonuses(u);
                surviving.push(u);
                triggerResurrectionVfx(
                  [{ unitId: u.instanceId, unitName: u.name, side }],
                  320
                );
                addLog(`🪽 [Ressurreição] ${u.name} sucumbiu ao Sangramento, mas ressuscitou!`, 'spell');
                return;
              }
              if (u.imprisonedUnit && u.imprisonedUnit.hp > 0) {
                const rescued = { ...u.imprisonedUnit, conditions: new Set(u.imprisonedUnit.conditions) };
                u.imprisonedUnit = undefined;
                u.imprisonedOriginalOwner = undefined;
                otherBoard.push(rescued);
                addLog(`⛓️🔓 [LIBERTAÇÃO!] Com a morte de ${u.name}, ${rescued.name} se libertou das correntes!`, 'spell');
              }
              deadList.push({ ...u, hp: 0, def: 0 });
              killedIds.push(u.instanceId);
              sound.playDeath();
              addLog(`🩸💀 ${u.name} sucumbiu ao Sangramento/Hemorragia e foi eliminado!`, 'kill');
            } else {
              surviving.push(u);
            }
          });

          if (killedIds.length > 0) {
            triggerPhilioEliminationBonus(side === 'player' ? 'opponent' : 'player', killedIds.length, killedIds);
          }
          return surviving;
        };

        nextPBoard = processBoardBleed(nextPBoard, nextOBoard, 'player', deadCardsPlayer);
        nextOBoard = processBoardBleed(nextOBoard, nextPBoard, 'opponent', deadCardsOpponent);

        if (bleedCondVfxBatch.length > 0) {
          queueConditionVfx(bleedCondVfxBatch);
        }

        // Gangnyr: "Ver uma unidade sofrer hemorragia recebe Roubo de vida pelo resto do combate."
        if (hemorrhageOccurred) {
          const grantGangnyrLifeSteal = (board: CardInstance[], ownerSide: 'player' | 'opponent') => {
            board.forEach((g) => {
              if (
                (g.templateId === 'g_gangnyr' || g.name.toLowerCase().includes('gangnyr')) &&
                g.hp > 0 &&
                g.silencedRounds === 0
              ) {
                g.conditions.add('roubo_de_vida');
                g.hasLifeSteal = true;
                g.lifeStealRoundsRemaining = undefined;
                setCardConditionSource(g, 'roubo_de_vida', 'efeito_unico_proprio', g.name);
                sound.playSpell();
                queueUnitVfx({
                  type: 'gangnyr_hemorrhage_burst',
                  sourceId: g.instanceId,
                  targetIds: hemorrhageVictimIds,
                  ownerSide,
                });
                addLog(
                  `🩸🦇 [Gangnyr - Sede de Hemorragia] Gangnyr testemunhou uma unidade sofrer HEMORRAGIA e despertou ROUBO DE VIDA permanente pelo resto do combate!`,
                  'spell'
                );
              }
            });
          };
          grantGangnyrLifeSteal(nextPBoard, 'player');
          grantGangnyrLifeSteal(nextOBoard, 'opponent');
        }

        // ----------------------------------------------------
        // CONTAGEM DE DURAÇÃO DE PRAGA (-25% ATRIBUTOS) E CORROSÃO (-1 VIDA/TURNO + CORTA CURA):
        // Decrementa após a checagem de fim de rodada de Atlaziel
        // ----------------------------------------------------
        nextPBoard.forEach((u) => {
          if (u.pragaRoundsRemaining && u.pragaRoundsRemaining > 0) {
            u.pragaRoundsRemaining -= 1;
            if (u.pragaRoundsRemaining <= 0) {
              removePragaFromUnit(u);
              addLog(`☠️ O efeito de Praga sobre ${u.name} se dissipou e seus atributos foram restaurados!`, 'info');
            } else {
              addLog(`☠️ ${u.name} continua sob efeito de Praga (-25% atributos, ${u.pragaRoundsRemaining} rodada(s) restante(s))!`, 'info');
            }
          }
          if (u.corrosaoRoundsRemaining && u.corrosaoRoundsRemaining > 0) {
            u.corrosaoRoundsRemaining -= 1;
            if (u.corrosaoRoundsRemaining <= 0) {
              u.conditions.delete('corrosao');
              removeCardConditionSource(u, 'corrosao');
              addLog(`🧪 O efeito de Corrosão sobre ${u.name} se dissipou!`, 'info');
            } else {
              addLog(`🧪 ${u.name} continua sob efeito de Corrosão (-1 Vida/turno & corta cura, ${u.corrosaoRoundsRemaining} rodada(s) restante(s))!`, 'info');
            }
          }
        });

        nextOBoard.forEach((u) => {
          if (u.pragaRoundsRemaining && u.pragaRoundsRemaining > 0) {
            u.pragaRoundsRemaining -= 1;
            if (u.pragaRoundsRemaining <= 0) {
              removePragaFromUnit(u);
              addLog(`☠️ O efeito de Praga sobre ${u.name} se dissipou e seus atributos foram restaurados!`, 'info');
            } else {
              addLog(`☠️ ${u.name} continua sob efeito de Praga (-25% atributos, ${u.pragaRoundsRemaining} rodada(s) restante(s))!`, 'info');
            }
          }
          if (u.corrosaoRoundsRemaining && u.corrosaoRoundsRemaining > 0) {
            u.corrosaoRoundsRemaining -= 1;
            if (u.corrosaoRoundsRemaining <= 0) {
              u.conditions.delete('corrosao');
              removeCardConditionSource(u, 'corrosao');
              addLog(`🧪 O efeito de Corrosão sobre ${u.name} se dissipou!`, 'info');
            } else {
              addLog(`🧪 ${u.name} continua sob efeito de Corrosão (-1 Vida/turno & corta cura, ${u.corrosaoRoundsRemaining} rodada(s) restante(s))!`, 'info');
            }
          }
        });

        const totalPlayerDrain = (oOSolLvl2 ? 1 : 0) + (oALuaLvl2 ? 1 : 0);
        const totalOpponentDrain = (pOSolLvl2 ? 1 : 0) + (pALuaLvl2 ? 1 : 0);

        let nextPlayerHp = totalPlayerDrain > 0 ? Math.max(0, currP.hp - totalPlayerDrain) : currP.hp;
        let nextOpponentHp = totalOpponentDrain > 0 ? Math.max(0, currO.hp - totalOpponentDrain) : currO.hp;
        let playerSavedByFadas = false;
        let opponentSavedByFadas = false;

        if (totalPlayerDrain > 0 && nextPlayerHp <= 0 && !currP.corteDasFadasUsed && hasCorteDasFadas(nextPBoard)) {
          nextPlayerHp = 2;
          playerSavedByFadas = true;
          const fadaIds: string[] = [];
          nextPBoard.forEach((u) => {
            if (isFairyCard(u) && u.hp > 0) {
              const bonusPwr = Math.max(1, Math.round(u.power * 0.75));
              addPowerPoints(u, bonusPwr);
              fadaIds.push(u.instanceId);
            }
          });
          queueUnitVfx({
            type: 'corte_das_fadas_miracle',
            targetIds: fadaIds,
            targetPlayerSide: 'player',
            ownerSide: 'player',
          });
          addLog(
            `🧚💖 [CORTE DAS FADAS!] A Corte salvou você da morte! Você recebeu 2 pontos extras de Vida (na cor rosa) e todas as suas Fadas na mesa receberam +75% de PODER!`,
            'spell'
          );
        }

        if (totalOpponentDrain > 0 && nextOpponentHp <= 0 && !currO.corteDasFadasUsed && hasCorteDasFadas(nextOBoard)) {
          nextOpponentHp = 2;
          opponentSavedByFadas = true;
          const fadaIds: string[] = [];
          nextOBoard.forEach((u) => {
            if (isFairyCard(u) && u.hp > 0) {
              const bonusPwr = Math.max(1, Math.round(u.power * 0.75));
              addPowerPoints(u, bonusPwr);
              fadaIds.push(u.instanceId);
            }
          });
          queueUnitVfx({
            type: 'corte_das_fadas_miracle',
            targetIds: fadaIds,
            targetPlayerSide: 'opponent',
            ownerSide: 'opponent',
          });
          addLog(
            `🧚💖 [CORTE DAS FADAS!] A Corte salvou ${currO.name} da morte! Recebeu 2 pontos extras de Vida (na cor rosa) e todas as Fadas aliadas na mesa receberam +75% de PODER!`,
            'spell'
          );
        }

        setPlayer((p) => ({
          ...p,
          hp: playerSavedByFadas ? 2 : totalPlayerDrain > 0 ? Math.max(0, p.hp - totalPlayerDrain) : p.hp,
          ...(playerSavedByFadas ? { pinkExtraHpSlots: 2, corteDasFadasUsed: true } : {}),
          board: nextPBoard,
          graveyard: [...p.graveyard, ...deadCardsPlayer],
        }));

        setOpponent((o) => ({
          ...o,
          hp: opponentSavedByFadas ? 2 : totalOpponentDrain > 0 ? Math.max(0, o.hp - totalOpponentDrain) : o.hp,
          ...(opponentSavedByFadas ? { pinkExtraHpSlots: 2, corteDasFadasUsed: true } : {}),
          board: nextOBoard,
          graveyard: [...o.graveyard, ...deadCardsOpponent],
        }));

        // Barelio, o Carcereiro: se estiver vivo, livre (sem prisioneiro) e sem silenciamento
        // (após o fim de Jurisdição de Saniel ou na rodada seguinte após eliminar o prisioneiro anterior),
        // agenda nova captura automática para o início desta rodada (sem consumir o turno).
        const roundStartBarelioQueue: Array<{ barelioId: string; ownerSide: 'player' | 'opponent' }> = [];
        const hasVulnerableTarget = (enemyBoard: CardInstance[]) =>
          enemyBoard.some(
            (c) =>
              c.hp > 0 &&
              !c.conditions.has('imunidade') &&
              !isOSolLevel2Immortal(c) &&
              !isALuaLevel2Supreme(c)
          );
        nextPBoard.forEach((u) => {
          if (
            (u.templateId === 'n_barelio' || u.name.toLowerCase().includes('barelio')) &&
            u.hp > 0 &&
            u.silencedRounds === 0 &&
            !u.imprisonedUnit &&
            !barelioKilledPrisonerThisTick.has(u.instanceId) &&
            hasVulnerableTarget(nextOBoard)
          ) {
            roundStartBarelioQueue.push({ barelioId: u.instanceId, ownerSide: 'player' });
          }
        });
        nextOBoard.forEach((u) => {
          if (
            (u.templateId === 'n_barelio' || u.name.toLowerCase().includes('barelio')) &&
            u.hp > 0 &&
            u.silencedRounds === 0 &&
            !u.imprisonedUnit &&
            !barelioKilledPrisonerThisTick.has(u.instanceId) &&
            hasVulnerableTarget(nextPBoard)
          ) {
            roundStartBarelioQueue.push({ barelioId: u.instanceId, ownerSide: 'opponent' });
          }
        });
        if (roundStartBarelioQueue.length > 0) {
          setPendingBarelioRecaptureQueue((prev) => [...prev, ...roundStartBarelioQueue]);
        }

        if (totalOpponentDrain > 0 && nextOpponentHp <= 0 && !opponentSavedByFadas) {
          const cause =
            pOSolLvl2 && pALuaLvl2
              ? 'O Sol (O Absoluto) e A Lua (A Eminente) drenaram toda a vida do jogador inimigo!'
              : pOSolLvl2
              ? 'O Buraco Negro de O Sol (O Absoluto) reduziu a vida do jogador inimigo a ZERO!'
              : 'A energia aniquiladora de A Lua (A Eminente) reduziu a vida do jogador inimigo a ZERO!';
          triggerFinishingCannon('player', cause);
        } else if (totalPlayerDrain > 0 && nextPlayerHp <= 0 && !playerSavedByFadas) {
          const cause =
            oOSolLvl2 && oALuaLvl2
              ? 'O Sol (O Absoluto) e A Lua (A Eminente) drenaram toda a sua vida!'
              : oOSolLvl2
              ? 'O Buraco Negro de O Sol (O Absoluto) reduziu sua vida a ZERO!'
              : 'A energia aniquiladora de A Lua (A Eminente) reduziu sua vida a ZERO!';
          triggerFinishingCannon('opponent', cause);
        }
      }, 450);

    addLog(
      `=== Início da Rodada ${nextRound}! Papel: ${nextAttackerRole === 'player' ? 'Você é o Atacante' : `${opponent.name} é o Atacante`}! Tier liberado: ${nextRound >= 10 ? 'Todos (1 a 6 Supremo)' : nextRound >= 9 ? 'Até Tier 5 (Lendárias)' : nextRound >= 7 ? 'Até Tier 4 (Épicas)' : nextRound >= 5 ? 'Até Tier 3 (Raras)' : nextRound >= 3 ? 'Até Tier 2 (Incomuns)' : 'Tier 1 (Comuns)'}. ===`,
      'round'
    );
  }, [addLog, opponent.name, player.board, opponent.board]);

  // Orchestrates the 4-corner Golden Wave Beams -> Coin Consume & 3D Spin -> New Function Reveal & Round Start
  const startNewRound = useCallback(() => {
    if (isRoundTransitioningRef.current) return;

    // Aliança Angiris — Conselho Celestial: só ativa a vitória no fim da rodada em que todos os 5 Tiers de Arcanjos estiverem na mesa
    if (!gameOverWinner) {
      if (hasCelestialCouncilVictory(playerRef.current.board)) {
        sound.playRoundEnd();
        triggerCelestialCouncilVictoryRef.current('player', playerRef.current.board);
        return;
      }
      if (hasCelestialCouncilVictory(opponentRef.current.board)) {
        sound.playRoundEnd();
        triggerCelestialCouncilVictoryRef.current('opponent', opponentRef.current.board);
        return;
      }
    }

    clearPendingTurnTimers();
    isRoundTransitioningRef.current = true;
    setIsRoundTransitioning(true);
    setPostAttackRoundEndPending(false);

    const nextRound = roundRef.current + 1;
    const prevRole = attackerRoleRef.current;
    const nextAttackerRole: 'player' | 'opponent' = prevRole === 'player' ? 'opponent' : 'player';
    const fromRole: 'attacker' | 'defender' = prevRole === 'player' ? 'attacker' : 'defender';
    const toRole: 'attacker' | 'defender' = nextAttackerRole === 'player' ? 'attacker' : 'defender';
    const coords = getRoleCoinScreenCoords();
    const transitionId = `round_coin_${nextRound}_${Date.now()}`;

    sound.playRoundEnd();
    sound.playSpell();

    // Stage 1 (0ms - 1050ms): Pulls golden light beams from the 4 corners + radial vortex into the Role Coin
    setRoundCoinTransition({
      id: transitionId,
      nextRound,
      isNewRound: true,
      fromRole,
      toRole,
      targetX: coords.x,
      targetY: coords.y,
      stage: 'waves',
    });

    // Stage 2 (1050ms - 2000ms): Maximum compression — coin consumes beams, vibrates intensely and spins 3D
    setTimeout(() => {
      const updatedCoords = getRoleCoinScreenCoords();
      sound.playClash();
      setRoundCoinTransition((prev) =>
        prev && prev.id === transitionId
          ? {
              ...prev,
              targetX: updatedCoords.x,
              targetY: updatedCoords.y,
              stage: 'consume_and_spin',
            }
          : prev
      );
    }, 1050);

    // Stage 3 (2000ms - 3050ms): Supernova burst! Role Coin locks onto the new function and officially initiates the new round
    setTimeout(() => {
      const updatedCoords = getRoleCoinScreenCoords();
      sound.playFusion();
      executeNewRoundCore(nextRound, nextAttackerRole);
      setRoundCoinTransition((prev) =>
        prev && prev.id === transitionId
          ? {
              ...prev,
              targetX: updatedCoords.x,
              targetY: updatedCoords.y,
              stage: 'reveal',
            }
          : prev
      );
    }, 2000);

    // Stage 4 (3050ms): Complete animation and unlock game flow
    setTimeout(() => {
      setRoundCoinTransition((prev) => (prev && prev.id === transitionId ? null : prev));
      isRoundTransitioningRef.current = false;
      setIsRoundTransitioning(false);
    }, 3050);
  }, [executeNewRoundCore, getRoleCoinScreenCoords, gameOverWinner]);

  // Trigger Role Coin animation when manually toggling Attack/Defense in Testing Arena
  const triggerRoleSwapCoinAnimation = useCallback(
    (nextRole: 'player' | 'opponent') => {
      if (isRoundTransitioningRef.current) return;
      isRoundTransitioningRef.current = true;
      setIsRoundTransitioning(true);

      const prevRole = attackerRoleRef.current;
      const fromRole: 'attacker' | 'defender' = prevRole === 'player' ? 'attacker' : 'defender';
      const toRole: 'attacker' | 'defender' = nextRole === 'player' ? 'attacker' : 'defender';
      const coords = getRoleCoinScreenCoords();
      const transitionId = `manual_coin_${Date.now()}`;

      sound.playRoundEnd();
      sound.playSpell();
      setRoundCoinTransition({
        id: transitionId,
        nextRound: roundRef.current,
        isNewRound: false,
        fromRole,
        toRole,
        targetX: coords.x,
        targetY: coords.y,
        stage: 'waves',
      });

      setTimeout(() => {
        const updatedCoords = getRoleCoinScreenCoords();
        sound.playClash();
        setRoundCoinTransition((prev) =>
          prev && prev.id === transitionId
            ? { ...prev, targetX: updatedCoords.x, targetY: updatedCoords.y, stage: 'consume_and_spin' }
            : prev
        );
      }, 1050);

      setTimeout(() => {
        const updatedCoords = getRoleCoinScreenCoords();
        sound.playFusion();
        attackerRoleRef.current = nextRole;
        setAttackerRole(nextRole);
        setActiveCombatAttackerRole(nextRole);
        setTurnPlayer(nextRole);
        hasAttackedThisRoundRef.current = false;
        setHasAttackedThisRound(false);
        setSelectedAttackerIds([]);
        setIsDefendingPhase(false);
        setRoundCoinTransition((prev) =>
          prev && prev.id === transitionId
            ? { ...prev, targetX: updatedCoords.x, targetY: updatedCoords.y, stage: 'reveal' }
            : prev
        );
        addLog(
          `🔄 [Arena de Testes] Moeda da Função girou! Agora ${nextRole === 'player' ? player.name : opponent.name} é o ATACANTE e detém o turno ativo!`,
          'round'
        );
      }, 2000);

      setTimeout(() => {
        setRoundCoinTransition((prev) => (prev && prev.id === transitionId ? null : prev));
        isRoundTransitioningRef.current = false;
        setIsRoundTransitioning(false);
      }, 3050);
    },
    [getRoleCoinScreenCoords, addLog, player.name, opponent.name]
  );

  // Track cards that have already animated for Draw / Discard so every draw & discard animates once
  const animatedDrawIdsRef = useRef<Set<string>>(
    new Set([...player.hand.map((c) => c.instanceId), ...opponent.hand.map((c) => c.instanceId)])
  );
  const animatedDiscardIdsRef = useRef<Set<string>>(new Set());
  const everOnBoardIdsRef = useRef<Set<string>>(new Set());

  // Record units present on the board so we know when a card was on the field
  useEffect(() => {
    player.board.forEach((c) => everOnBoardIdsRef.current.add(c.instanceId));
    opponent.board.forEach((c) => everOnBoardIdsRef.current.add(c.instanceId));
  }, [player.board, opponent.board]);

  // Reset tracking sets when a brand-new match starts
  useEffect(() => {
    if (
      round === 1 &&
      player.graveyard.length === 0 &&
      opponent.graveyard.length === 0 &&
      player.board.length === 0 &&
      opponent.board.length === 0 &&
      player.drawsCountThisRound <= 1
    ) {
      animatedDiscardIdsRef.current.clear();
      everOnBoardIdsRef.current.clear();
      animatedDrawIdsRef.current = new Set([
        ...player.hand.map((c) => c.instanceId),
        ...opponent.hand.map((c) => c.instanceId),
      ]);
    }
  }, [
    round,
    player.graveyard.length,
    opponent.graveyard.length,
    player.board.length,
    opponent.board.length,
    player.drawsCountThisRound,
    player.hand,
    opponent.hand,
  ]);

  const enqueueDrawAnimation = useCallback(
    (cards: { card: CardInstance; ownerId: 'player' | 'opponent' }[]) => {
      const newEvents: DrawAnimEvent[] = [];
      cards.forEach(({ card, ownerId }, idx) => {
        if (!card || animatedDrawIdsRef.current.has(card.instanceId)) return;
        // Skip if this card was returned from the board to hand (e.g. Recuar)
        if (everOnBoardIdsRef.current.has(card.instanceId)) {
          animatedDrawIdsRef.current.add(card.instanceId);
          return;
        }
        animatedDrawIdsRef.current.add(card.instanceId);
        const eventId = `draw_${card.instanceId}_${Date.now()}_${idx}`;
        const delayMs = idx * 220;
        newEvents.push({
          id: eventId,
          card,
          ownerId,
          ownerName: ownerId === 'player' ? playerRef.current.name : opponentRef.current.name,
          hideFace: ownerId === 'opponent' && !isTestingArena,
          delayMs,
        });
        setTimeout(() => {
          setDrawEvents((prev) => prev.filter((e) => e.id !== eventId));
        }, 1300 + delayMs);
      });
      if (newEvents.length > 0) {
        setDrawEvents((prev) => [...prev, ...newEvents]);
      }
    },
    [gameMode, isTestingArena]
  );

  const enqueueDiscardAnimation = useCallback(
    (
      cards: {
        card: CardInstance;
        ownerId: 'player' | 'opponent';
        reason?: 'unit_eliminated' | 'skill_used' | 'hand_discard';
      }[]
    ) => {
      const newEvents: DiscardAnimEvent[] = [];
      cards.forEach(({ card, ownerId, reason }, idx) => {
        if (!card || animatedDiscardIdsRef.current.has(card.instanceId)) return;
        animatedDiscardIdsRef.current.add(card.instanceId);
        const resolvedReason: 'unit_eliminated' | 'skill_used' | 'hand_discard' =
          reason ||
          (card.type === 'skill'
            ? 'skill_used'
            : everOnBoardIdsRef.current.has(card.instanceId) || card.hp <= 0
            ? 'unit_eliminated'
            : 'unit_eliminated');
        const eventId = `discard_${card.instanceId}_${Date.now()}_${idx}`;
        const delayMs = idx * 240;
        newEvents.push({
          id: eventId,
          card,
          ownerId,
          ownerName: ownerId === 'player' ? playerRef.current.name : opponentRef.current.name,
          reason: resolvedReason,
          delayMs,
        });
        setTimeout(() => {
          setDiscardEvents((prev) => prev.filter((e) => e.id !== eventId));
        }, 1400 + delayMs);
      });
      if (newEvents.length > 0) {
        setDiscardEvents((prev) => [...prev, ...newEvents]);
      }
    },
    []
  );

  const finishFloatingSkillToGraveyard = useCallback(
    (card: CardInstance, ownerId: 'player' | 'opponent') => {
      setFloatingSkillCards((prev) => prev.filter((item) => item.card.instanceId !== card.instanceId));
      animatedDiscardIdsRef.current.delete(card.instanceId);
      enqueueDiscardAnimation([{ card, ownerId, reason: 'skill_used' }]);
      sound.playDiscard();
    },
    [enqueueDiscardAnimation]
  );

  const startFloatingSkillExecution = useCallback(
    (card: CardInstance, ownerId: 'player' | 'opponent', durationMs: number = 2250) => {
      setFloatingSkillCards((prev) => {
        const exists = prev.some((item) => item.card.instanceId === card.instanceId);
        if (exists) {
          return prev.map((item) =>
            item.card.instanceId === card.instanceId ? { ...item, stage: 'executing_effect' as const } : item
          );
        }
        return [
          ...prev,
          {
            id: `float_skill_${card.instanceId}_${Date.now()}`,
            card,
            ownerId,
            ownerName: ownerId === 'player' ? playerRef.current.name : opponentRef.current.name,
            stage: 'executing_effect' as const,
          },
        ];
      });
      setTimeout(() => {
        finishFloatingSkillToGraveyard(card, ownerId);
      }, durationMs);
    },
    [finishFloatingSkillToGraveyard]
  );

  // Bridge explicit drawingCardAnim state updates into the rich draw animation queue
  useEffect(() => {
    if (drawingCardAnim) {
      enqueueDrawAnimation([drawingCardAnim]);
      const timer = setTimeout(() => setDrawingCardAnim(null), 650);
      return () => clearTimeout(timer);
    }
  }, [drawingCardAnim, enqueueDrawAnimation]);

  // Bridge explicit discardingCardAnim state updates into the rich discard animation queue
  useEffect(() => {
    if (discardingCardAnim) {
      enqueueDiscardAnimation([
        {
          card: discardingCardAnim.card,
          ownerId: discardingCardAnim.ownerId,
          reason: discardingCardAnim.card.type === 'skill' ? 'skill_used' : 'unit_eliminated',
        },
      ]);
      const timer = setTimeout(() => setDiscardingCardAnim(null), 750);
      return () => clearTimeout(timer);
    }
  }, [discardingCardAnim, enqueueDiscardAnimation]);

  // Reactive watcher for any newly drawn cards added to player.hand or opponent.hand
  useEffect(() => {
    const newlyDrawn: { card: CardInstance; ownerId: 'player' | 'opponent' }[] = [];
    player.hand.forEach((c) => {
      if (!animatedDrawIdsRef.current.has(c.instanceId)) {
        newlyDrawn.push({ card: c, ownerId: 'player' });
      }
    });
    opponent.hand.forEach((c) => {
      if (!animatedDrawIdsRef.current.has(c.instanceId)) {
        newlyDrawn.push({ card: c, ownerId: 'opponent' });
      }
    });
    if (newlyDrawn.length > 0) {
      enqueueDrawAnimation(newlyDrawn);
    }
  }, [player.hand, opponent.hand, enqueueDrawAnimation]);

  // Reactive watcher for any eliminated units or used skills entering player.graveyard or opponent.graveyard
  useEffect(() => {
    const currentGraveIds = new Set([
      ...player.graveyard.map((c) => c.instanceId),
      ...opponent.graveyard.map((c) => c.instanceId),
    ]);
    // Clean up IDs of cards that were revived/removed from graveyard so they can animate if eliminated again
    Array.from(animatedDiscardIdsRef.current).forEach((id) => {
      if (!currentGraveIds.has(id)) {
        animatedDiscardIdsRef.current.delete(id);
      }
    });

    const newlyDiscarded: {
      card: CardInstance;
      ownerId: 'player' | 'opponent';
      reason: 'unit_eliminated' | 'skill_used';
    }[] = [];

    player.graveyard.forEach((c) => {
      if (!animatedDiscardIdsRef.current.has(c.instanceId)) {
        newlyDiscarded.push({
          card: c,
          ownerId: 'player',
          reason: c.type === 'skill' ? 'skill_used' : 'unit_eliminated',
        });
      }
    });
    opponent.graveyard.forEach((c) => {
      if (!animatedDiscardIdsRef.current.has(c.instanceId)) {
        newlyDiscarded.push({
          card: c,
          ownerId: 'opponent',
          reason: c.type === 'skill' ? 'skill_used' : 'unit_eliminated',
        });
      }
    });

    if (newlyDiscarded.length > 0) {
      enqueueDiscardAnimation(newlyDiscarded);

      // Se Barelio (ou qualquer unidade com prisioneiro em correntes) foi eliminado e enviado ao cemitério,
      // liberta imediatamente a unidade presa de volta para a mesa inimiga!
      newlyDiscarded.forEach(({ card, ownerId }) => {
        if (card.imprisonedUnit && card.imprisonedUnit.hp > 0) {
          const rescuedUnit: CardInstance = {
            ...card.imprisonedUnit,
            conditions: new Set(card.imprisonedUnit.conditions),
            conditionSources: card.imprisonedUnit.conditionSources
              ? { ...card.imprisonedUnit.conditionSources }
              : undefined,
          };
          const targetOwner = card.imprisonedOriginalOwner || (ownerId === 'player' ? 'opponent' : 'player');
          card.imprisonedUnit = undefined;
          card.imprisonedOriginalOwner = undefined;
          if (targetOwner === 'player') {
            setPlayer((prev) => ({
              ...prev,
              board: prev.board.some((b) => b.instanceId === rescuedUnit.instanceId)
                ? prev.board
                : [...prev.board, rescuedUnit],
            }));
          } else {
            setOpponent((prev) => ({
              ...prev,
              board: prev.board.some((b) => b.instanceId === rescuedUnit.instanceId)
                ? prev.board
                : [...prev.board, rescuedUnit],
            }));
          }
          sound.playSpell();
          addLog(
            `⛓️🔓 [LIBERTAÇÃO!] Com a eliminação de ${card.name}, ${rescuedUnit.name} se libertou das correntes e retornou viva à mesa!`,
            'spell'
          );
        }
      });
    }
  }, [player.graveyard, opponent.graveyard, enqueueDiscardAnimation, addLog]);

  // Role alternation & round transition are now handled by the 3D Role Coin & Golden Wave Beams choreography!

  // Trigger energy accumulator & explosion cinematic sequence before declaring victory/defeat
  const triggerFinishingCannon = useCallback(
    (winner: 'player' | 'opponent' | 'draw', reason: string, woMessage?: string) => {
      if (winner === 'draw') {
        sound.playDrawGame();
        setGameOverReason(reason);
        setGameOverWinner('draw');
        if (matchType === 'ranked') {
          const cloudState = getInMemoryPlayerState();
          if (cloudState?.rankBlockedTotal) {
            setRankDelta(0);
          } else {
            const delta = calculateRankDelta(false, true);
            setRankDelta(delta);
            const newPts = currentRankPoints + delta;
            setCurrentRankPoints(newPts);
            saveRankPoints(newPts);
          }
        }
        return;
      }

      const victimName = winner === 'player' ? opponent.name : player.name;

      // Step 1: Energy Accumulator Sucking Inward & Vibrating HP Bar
      sound.playSpell();
      setFinishingCannonAnim({
        active: true,
        victor: winner,
        stage: 'aiming',
      });
      addLog(
        `⚡ COLAPSO VITAL! A barra de vida de ${victimName} começou a acumular energia em volta e vibrar intensamente!`,
        'attack'
      );

      // Step 2: Critical Overload Compression
      setTimeout(() => {
        sound.playClash();
        setFinishingCannonAnim((prev) => (prev ? { ...prev, stage: 'firing' } : null));
      }, 1050);

      // Step 3: Cataclysmic HP Bar Explosion
      setTimeout(() => {
        sound.playCannonFire();
        sound.playDeath();
        setFinishingCannonAnim((prev) => (prev ? { ...prev, stage: 'impact' } : null));
        addLog(`💥 EXPLOSÃO VITAL! A barra de vida de ${victimName} explodiu completamente!`, 'kill');
      }, 2000);

      // Step 4: Show Victory / Defeat Modal (and W.O. banner if applicable) after explosion finishes
      setTimeout(() => {
        setFinishingCannonAnim(null);
        setGameOverReason(reason);
        setGameOverWinner(winner);
        if (woMessage) {
          setWoBanner({
            winner,
            message: woMessage,
          });
        }

        if (!onlineMatchRecordedRef.current && !isTutorialMode) {
          onlineMatchRecordedRef.current = true;
          const isPlayerWin = winner === 'player';
          let delta = 0;
          if (matchType === 'ranked') {
            const cloudState = getInMemoryPlayerState();
            if (cloudState?.rankBlockedTotal) {
              delta = 0;
              setRankDelta(0);
            } else {
              delta = calculateRankDelta(isPlayerWin, false);
              setRankDelta(delta);
              const newPts = Math.max(0, currentRankPoints + delta);
              setCurrentRankPoints(newPts);
              saveRankPoints(newPts);
            }
          } else {
            delta = isPlayerWin ? 20 : -10;
          }

          const modeKey = gameMode === 'ai' ? 'pvia' : matchType === 'ranked' ? 'pvp_ranked' : 'pvp_normal';
          recordMatchResult(
            isPlayerWin ? 'victory' : 'defeat',
            isOnlinePvp && onlineMatchBootstrap?.localDeckName ? onlineMatchBootstrap.localDeckName : 'Meu Baralho',
            delta,
            opponent.name,
            modeKey,
            isOnlinePvp && onlineMatchBootstrap?.opponentRank ? onlineMatchBootstrap.opponentRank : 'Bronze III'
          );
        }
      }, 3000);
    },
    [matchType, currentRankPoints, player.name, opponent.name, gameMode, isOnlinePvp, onlineMatchBootstrap, addLog]
  );

  // Check empty deck rule:
  // "se um dos oponentes zerar o seu deck ele só permanecerá vivo até sua ultima unidade morrer, caso ele fique sem nenhum carta e nenhuma unidade em campo o jogo é finalizado dando vitoria ao outro jogador."
  const checkEmptyDeckVictory = useCallback(
    (pState: PlayerState, oState: PlayerState) => {
      if (isTestingArena || gameOverWinner || finishingCannonAnim?.active || celestialVictoryAnim?.active) return false;

      if (pState.deck.length === 0 && oState.deck.length === 0) {
        const pHas = pState.board.length > 0 || pState.hand.some((c) => c.type === 'unit');
        const oHas = oState.board.length > 0 || oState.hand.some((c) => c.type === 'unit');
        if (!pHas && !oHas) {
          triggerFinishingCannon('draw', 'Ambos os reinos esgotaram seus baralhos e exércitos ao mesmo tempo!');
          return true;
        }
      }

      if (pState.deck.length === 0) {
        const hasUnitsOnBoard = pState.board.length > 0;
        const hasUnitsInHand = pState.hand.some((c) => c.type === 'unit');
        if (!hasUnitsOnBoard && (pState.hand.length === 0 || !hasUnitsInHand)) {
          triggerFinishingCannon(
            'opponent',
            'Seu baralho esgotou e sua última unidade foi derrotada sem reforços restantes!'
          );
          return true;
        }
      }

      if (oState.deck.length === 0) {
        const hasUnitsOnBoard = oState.board.length > 0;
        const hasUnitsInHand = oState.hand.some((c) => c.type === 'unit');
        if (!hasUnitsOnBoard && (oState.hand.length === 0 || !hasUnitsInHand)) {
          triggerFinishingCannon(
            'player',
            'O oponente esgotou seu baralho e sua última unidade em campo foi eliminada!'
          );
          return true;
        }
      }
      return false;
    },
    [isTestingArena, gameOverWinner, finishingCannonAnim, celestialVictoryAnim, triggerFinishingCannon]
  );

  // Trigger exclusive divine "Vitória do Conselho Celestial" when 1 Archangel of each Tier (1-5) is on the board simultaneously
  const triggerCelestialCouncilVictory = useCallback(
    (winner: 'player' | 'opponent', boardOverride?: CardInstance[]) => {
      if (
        gameOverWinner ||
        finishingCannonAnim?.active ||
        celestialVictoryAnim?.active ||
        celestialVictoryTriggeredRef.current
      ) {
        return;
      }
      celestialVictoryTriggeredRef.current = true;
      const victorName = winner === 'player' ? player.name : opponent.name;
      const sourceBoard =
        boardOverride || (winner === 'player' ? playerRef.current.board : opponentRef.current.board);
      const representativeArchangels: CardInstance[] = [1, 2, 3, 4, 5]
        .map((t) => sourceBoard.find((c) => c.tier === t && isArchangelCard(c) && c.hp > 0))
        .filter((c): c is CardInstance => Boolean(c));

      const reasonText =
        'Vitória do Conselho Celestial — Aliança Angiris: Pelo menos 1 Arcanjo de cada Tier (Tiers 1, 2, 3, 4 e 5) permaneceu na mesa até o fim da rodada, curando totalmente a Vida do jogador aliado e decretando a vitória!';

      const victorRefState = winner === 'player' ? playerRef.current : opponentRef.current;
      const victorPrevHp = victorRefState.hp;
      const victorMaxHp = victorRefState.maxHp;

      if (winner === 'player') {
        setPlayer((p) => ({ ...p, hp: Math.max(p.hp, p.maxHp) }));
        setOpponent((o) => ({ ...o, hp: 0 }));
      } else {
        setOpponent((o) => ({ ...o, hp: Math.max(o.hp, o.maxHp) }));
        setPlayer((p) => ({ ...p, hp: 0 }));
      }

      addLog(
        `🪽💚 [Conselho Celestial] Ao ativar o efeito do Conselho, a Vida de ${victorName} foi totalmente curada (${victorPrevHp} → ${Math.max(victorPrevHp, victorMaxHp)}/${victorMaxHp})!`,
        'spell'
      );
      addLog(
        `🪽👑 VITÓRIA DO CONSELHO CELESTIAL! [Aliança Angiris] ${victorName} manteve pelo menos 1 Arcanjo de cada Tier (Tiers 1, 2, 3, 4 e 5) na mesa até o fim da rodada e venceu a partida!`,
        'kill'
      );

      // Step 1: Convergência dos Cinco Arcanjos
      sound.playCelestialCouncilVictory();
      setCelestialVictoryAnim({
        active: true,
        victor: winner,
        stage: 'convergence',
        archangels: representativeArchangels,
      });

      // Step 2: Ascensão das Asas Seráficas e Mandala Sagrada
      setTimeout(() => {
        setCelestialVictoryAnim((prev) => (prev ? { ...prev, stage: 'ascension' } : null));
      }, 1200);

      // Step 3: Apoteose Divina — Pilar de Luz e Supernova Celestial
      setTimeout(() => {
        setCelestialVictoryAnim((prev) => (prev ? { ...prev, stage: 'apotheosis' } : null));
      }, 2450);

      // Step 4: Finaliza partida e exibe Modal de Vitória/Derrota
      setTimeout(() => {
        setCelestialVictoryAnim(null);
        setGameOverReason(reasonText);
        setGameOverWinner(winner);

        if (!onlineMatchRecordedRef.current && !isTutorialMode) {
          onlineMatchRecordedRef.current = true;
          const isPlayerWin = winner === 'player';
          let delta = 0;
          if (matchType === 'ranked') {
            const cloudState = getInMemoryPlayerState();
            if (cloudState?.rankBlockedTotal) {
              delta = 0;
              setRankDelta(0);
            } else {
              delta = calculateRankDelta(isPlayerWin, false);
              setRankDelta(delta);
              const newPts = Math.max(0, currentRankPoints + delta);
              setCurrentRankPoints(newPts);
              saveRankPoints(newPts);
            }
          } else {
            delta = isPlayerWin ? 20 : -10;
          }

          const modeKey =
            gameMode === 'ai'
              ? 'pvia'
              : matchType === 'ranked'
              ? 'pvp_ranked'
              : 'pvp_normal';
          recordMatchResult(
            isPlayerWin ? 'victory' : 'defeat',
            isOnlinePvp && onlineMatchBootstrap?.localDeckName ? onlineMatchBootstrap.localDeckName : 'Meu Baralho',
            delta,
            opponent.name,
            modeKey,
            isOnlinePvp && onlineMatchBootstrap?.opponentRank ? onlineMatchBootstrap.opponentRank : 'Bronze III'
          );
        }
      }, 4150);
    },
    [
      gameOverWinner,
      finishingCannonAnim,
      celestialVictoryAnim,
      player.name,
      opponent.name,
      addLog,
      matchType,
      currentRankPoints,
      gameMode,
      isOnlinePvp,
      onlineMatchBootstrap,
    ]
  );

  triggerCelestialCouncilVictoryRef.current = triggerCelestialCouncilVictory;

  useEffect(() => {
    if (!gameOverWinner) {
      checkEmptyDeckVictory(player, opponent);
    }
  }, [player, opponent, gameOverWinner, checkEmptyDeckVictory]);

  // 0 HP & OBLITERAÇÃO immediate death safeguard: ensures units that reach 0 HP or receive OBLITERAÇÃO die immediately
  // (Except O Sol & A Lua Level 2, which are IMMORTAL!)
  useEffect(() => {
    const isImmortalDeity = (c: CardInstance) =>
      ((c.templateId === 'n_o_sol' || c.name.trim().toLowerCase().startsWith('o sol')) && c.level === 2) ||
      ((c.templateId === 'g_a_lua' || c.name.trim().toLowerCase().startsWith('a lua')) && c.level === 2);

    const reviveGeneralBorPhoenix = (c: CardInstance): CardInstance => {
      const next: CardInstance = {
        ...c,
        conditions: new Set(c.conditions),
        conditionSources: c.conditionSources ? { ...c.conditionSources } : undefined,
        corrosaoRoundsRemaining: 0,
        sangramentoRoundsRemaining: 0,
        sangramentoMarks: 0,
      };
      next.hp = Math.round(next.maxHp * 1.5);
      next.maxHp = next.hp;
      next.atk = Math.round(next.atk * 1.5);
      next.def = Math.round(next.def * 1.5);
      next.icePeakDefense = Math.max(next.icePeakDefense ?? 0, next.def);
      const borPowerGain = Math.max(0, Math.round(next.power * 1.5) - next.power);
      addPowerPoints(next, borPowerGain, false);
      next.conditions.add('cura');
      setCardConditionSource(next, 'cura', 'passiva_propria', next.name);
      next.conditions.delete('atordoado');
      next.conditions.delete('dormindo');
      next.conditions.delete('corrosao');
      next.conditions.delete('sangramento');
      removeCardConditionSource(next, 'atordoado');
      removeCardConditionSource(next, 'dormindo');
      removeCardConditionSource(next, 'corrosao');
      removeCardConditionSource(next, 'sangramento');
      if (next.sapience != null) next.sapience = next.maxHp;
      return next;
    };

    const reviveWithRessurreicao = (c: CardInstance): CardInstance => {
      const next: CardInstance = {
        ...c,
        conditions: new Set(c.conditions),
        conditionSources: c.conditionSources ? { ...c.conditionSources } : undefined,
        permanentRessurreicao: false,
        hp: c.maxHp,
        atk: c.baseAtk,
        def: c.baseDef,
        icePeakDefense: c.baseDef,
        power: c.basePower,
        peakPower: c.basePower,
        corrosaoRoundsRemaining: 0,
        sangramentoRoundsRemaining: 0,
        sangramentoMarks: 0,
      };
      next.conditions.delete('ressurreicao');
      next.conditions.delete('atordoado');
      next.conditions.delete('dormindo');
      next.conditions.delete('corrosao');
      next.conditions.delete('sangramento');
      removeCardConditionSource(next, 'ressurreicao');
      removeCardConditionSource(next, 'atordoado');
      removeCardConditionSource(next, 'dormindo');
      removeCardConditionSource(next, 'corrosao');
      removeCardConditionSource(next, 'sangramento');
      if (next.sapience != null) next.sapience = next.maxHp;
      syncClassPowerBonuses(next);
      return next;
    };

    const deadP = player.board.filter(
      (c) => !isImmortalDeity(c) && (c.hp <= 0 || c.conditions.has('obliteracao'))
    );
    if (deadP.length > 0) {
      const borPhoenixP = !player.borRevivedOnce
        ? deadP.find(
            (c) =>
              c.templateId === 'g_bor' &&
              c.silencedRounds === 0 &&
              c.hp <= 0 &&
              !c.conditions.has('obliteracao')
          )
        : undefined;
      if (borPhoenixP) {
        addLog(`🔥 [O Mesofênix] General Bor sucumbiu, mas renasceu das cinzas com +50% em todos os atributos e Cura!`, 'spell');
        triggerBorPhoenixVfx(borPhoenixP.instanceId, 'player', 260);
      }
      const resurrectedP = deadP.filter(
        (c) =>
          c.instanceId !== borPhoenixP?.instanceId &&
          c.hp <= 0 &&
          !c.conditions.has('obliteracao') &&
          c.conditions.has('ressurreicao')
      );
      if (resurrectedP.length > 0) {
        resurrectedP.forEach((c) => {
          addLog(`🪽✨ [Ressurreição] ${c.name} sucumbiu, mas retornou à vida com seus atributos originais!`, 'spell');
        });
        triggerResurrectionVfx(
          resurrectedP.map((c) => ({ unitId: c.instanceId, unitName: c.name, side: 'player' as const })),
          260
        );
      }
      deadP.forEach((c) => {
        if (c.conditions.has('obliteracao') && c.hp > 0) {
          addLog(`🕳️ [OBLITERAÇÃO] ${c.name} foi eliminada instantaneamente!`, 'kill');
        }
      });
      setPlayer((p) => {
        const nextBoard: CardInstance[] = [];
        const dead: CardInstance[] = [];
        let borTriggered = false;
        p.board.forEach((c) => {
          if (isImmortalDeity(c) || (c.hp > 0 && !c.conditions.has('obliteracao'))) {
            nextBoard.push(c);
          } else if (
            !p.borRevivedOnce &&
            !borTriggered &&
            c.templateId === 'g_bor' &&
            c.silencedRounds === 0 &&
            c.hp <= 0 &&
            !c.conditions.has('obliteracao')
          ) {
            borTriggered = true;
            nextBoard.push(reviveGeneralBorPhoenix(c));
          } else if (c.hp <= 0 && !c.conditions.has('obliteracao') && c.conditions.has('ressurreicao')) {
            nextBoard.push(reviveWithRessurreicao(c));
          } else {
            dead.push({ ...c, hp: 0 });
          }
        });
        if (dead.length === 0 && resurrectedP.length === 0 && !borTriggered) return p;
        return {
          ...p,
          borRevivedOnce: p.borRevivedOnce || borTriggered,
          board: nextBoard,
          graveyard: [...p.graveyard, ...dead],
        };
      });
    }

    const deadO = opponent.board.filter(
      (c) => !isImmortalDeity(c) && (c.hp <= 0 || c.conditions.has('obliteracao'))
    );
    if (deadO.length > 0) {
      const borPhoenixO = !opponent.borRevivedOnce
        ? deadO.find(
            (c) =>
              c.templateId === 'g_bor' &&
              c.silencedRounds === 0 &&
              c.hp <= 0 &&
              !c.conditions.has('obliteracao')
          )
        : undefined;
      if (borPhoenixO) {
        addLog(`🔥 [O Mesofênix] General Bor inimigo sucumbiu, mas renasceu das cinzas com +50% em todos os atributos e Cura!`, 'spell');
        triggerBorPhoenixVfx(borPhoenixO.instanceId, 'opponent', 260);
      }
      const resurrectedO = deadO.filter(
        (c) =>
          c.instanceId !== borPhoenixO?.instanceId &&
          c.hp <= 0 &&
          !c.conditions.has('obliteracao') &&
          c.conditions.has('ressurreicao')
      );
      if (resurrectedO.length > 0) {
        resurrectedO.forEach((c) => {
          addLog(`🪽✨ [Ressurreição] ${c.name} sucumbiu, mas retornou à vida com seus atributos originais!`, 'spell');
        });
        triggerResurrectionVfx(
          resurrectedO.map((c) => ({ unitId: c.instanceId, unitName: c.name, side: 'opponent' as const })),
          260
        );
      }
      deadO.forEach((c) => {
        if (c.conditions.has('obliteracao') && c.hp > 0) {
          addLog(`🕳️ [OBLITERAÇÃO] ${c.name} foi eliminada instantaneamente!`, 'kill');
        }
      });
      setOpponent((o) => {
        const nextBoard: CardInstance[] = [];
        const dead: CardInstance[] = [];
        let borTriggered = false;
        o.board.forEach((c) => {
          if (isImmortalDeity(c) || (c.hp > 0 && !c.conditions.has('obliteracao'))) {
            nextBoard.push(c);
          } else if (
            !o.borRevivedOnce &&
            !borTriggered &&
            c.templateId === 'g_bor' &&
            c.silencedRounds === 0 &&
            c.hp <= 0 &&
            !c.conditions.has('obliteracao')
          ) {
            borTriggered = true;
            nextBoard.push(reviveGeneralBorPhoenix(c));
          } else if (c.hp <= 0 && !c.conditions.has('obliteracao') && c.conditions.has('ressurreicao')) {
            nextBoard.push(reviveWithRessurreicao(c));
          } else {
            dead.push({ ...c, hp: 0 });
          }
        });
        if (dead.length === 0 && resurrectedO.length === 0 && !borTriggered) return o;
        return {
          ...o,
          borRevivedOnce: o.borRevivedOnce || borTriggered,
          board: nextBoard,
          graveyard: [...o.graveyard, ...dead],
        };
      });
    }
  }, [player.board, opponent.board, player.borRevivedOnce, opponent.borRevivedOnce, addLog, triggerResurrectionVfx, triggerBorPhoenixVfx]);

  // O Sol Level-Up Watcher: "Requisito para subir de nível: Ver Lunario ser eliminado (aliado ou inimigo). O Sol precisa estar na mesa."
  const witnessedLunarioDeathsRef = useRef<Set<string>>(new Set());
  const prevBoardLunariosRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const allGraveyard = [...player.graveyard, ...opponent.graveyard];
    const currentBoardLunarios = new Set(
      [...player.board, ...opponent.board]
        .filter((c) => (c.templateId === 'g_lunario' || c.name.toLowerCase().includes('lunario')) && c.hp > 0)
        .map((c) => c.instanceId)
    );

    const newlyDeadInGraveyard = allGraveyard.filter(
      (c) =>
        (c.templateId === 'g_lunario' || c.name.toLowerCase().includes('lunario')) &&
        !witnessedLunarioDeathsRef.current.has(c.instanceId)
    );

    let eliminatedFromBoardCount = 0;
    prevBoardLunariosRef.current.forEach((id) => {
      if (!currentBoardLunarios.has(id) && !witnessedLunarioDeathsRef.current.has(id)) {
        witnessedLunarioDeathsRef.current.add(id);
        eliminatedFromBoardCount += 1;
      }
    });
    prevBoardLunariosRef.current = currentBoardLunarios;

    if (newlyDeadInGraveyard.length === 0 && eliminatedFromBoardCount === 0) return;

    newlyDeadInGraveyard.forEach((l) => witnessedLunarioDeathsRef.current.add(l.instanceId));

    // Check if Player has O Sol (Level 1) alive on the board
    const pOSol = player.board.find(
      (c) =>
        (c.templateId === 'n_o_sol' || c.name.trim().toLowerCase().startsWith('o sol')) &&
        c.level === 1 &&
        c.hp > 0 &&
        c.silencedRounds === 0
    );
    if (pOSol) {
      const nextConds = new Set(pOSol.conditions);
      nextConds.add('obliteracao');
      nextConds.add('imunidade');
      nextConds.delete('queimadura');
      nextConds.delete('atordoado');
      nextConds.delete('dormindo');
      nextConds.delete('entorpecer');
      nextConds.delete('congelado');
      const evolvedPlayerSol: CardInstance = {
        ...pOSol,
        level: 2,
        name: 'O Sol - O Absoluto',
        exclusiveName: 'O Absoluto (Buraco Negro · Imortal)',
        hp: 999999,
        maxHp: 999999,
        atk: 999999,
        baseAtk: 999999,
        def: 999999,
        baseDef: 999999,
        power: 999999,
        basePower: 999999,
        silencedRounds: 0,
        burnTurnsRemaining: 0,
        entorpecerRoundsRemaining: 0,
        sleepRoundsRemaining: 0,
        conditions: nextConds,
        effectDescription:
          'Supremo [Tier 6 - Nível 2]. O ABSOLUTO: O Sol mostra sua verdadeira forma de Buraco Negro, ficando com todos seus atributos em escala INFINITO (∞) e tornando-se IMORTAL. Em ataques (sozinho ou em mesa cheia) OBLITERA todas as unidades que defenderem. A cada rodada reduz a vida do jogador inimigo em 1. Ao chegar a ZERO o jogador inimigo é derrotado.',
      };
      setPlayer((prev) => ({
        ...prev,
        board: prev.board.map((c) => (c.instanceId === pOSol.instanceId ? evolvedPlayerSol : c)),
      }));
      sound.playFusion();
      addLog(
        `🕳️☀️ [ASCENSÃO CÓSMICA - O ABSOLUTO] O Sol presenciou Lunario ser eliminado! Todos os seus atributos subiram para ESCALA INFINITO (∞) e ele se tornou IMORTAL (NÍVEL 2)!`,
        'spell'
      );
      triggerLevelUpCinematic(
        evolvedPlayerSol,
        '🕳️☀️ O ABSOLUTO DESPERTO! O Sol revelou sua verdadeira forma de Buraco Negro! Seus atributos atingiram escala INFINITO (∞), tornou-se IMORTAL e OBLITERA todas as unidades que defenderem!'
      );
    }

    // Check if Opponent has O Sol (Level 1) alive on the board
    const oOSol = opponent.board.find(
      (c) =>
        (c.templateId === 'n_o_sol' || c.name.trim().toLowerCase().startsWith('o sol')) &&
        c.level === 1 &&
        c.hp > 0 &&
        c.silencedRounds === 0
    );
    if (oOSol) {
      const nextConds = new Set(oOSol.conditions);
      nextConds.add('obliteracao');
      nextConds.add('imunidade');
      nextConds.delete('queimadura');
      nextConds.delete('atordoado');
      nextConds.delete('dormindo');
      nextConds.delete('entorpecer');
      nextConds.delete('congelado');
      const evolvedOpponentSol: CardInstance = {
        ...oOSol,
        level: 2,
        name: 'O Sol - O Absoluto',
        exclusiveName: 'O Absoluto (Buraco Negro · Imortal)',
        hp: 999999,
        maxHp: 999999,
        atk: 999999,
        baseAtk: 999999,
        def: 999999,
        baseDef: 999999,
        power: 999999,
        basePower: 999999,
        silencedRounds: 0,
        burnTurnsRemaining: 0,
        entorpecerRoundsRemaining: 0,
        sleepRoundsRemaining: 0,
        conditions: nextConds,
        effectDescription:
          'Supremo [Tier 6 - Nível 2]. O ABSOLUTO: O Sol mostra sua verdadeira forma de Buraco Negro, ficando com todos seus atributos em escala INFINITO (∞) e tornando-se IMORTAL. Em ataques (sozinho ou em mesa cheia) OBLITERA todas as unidades que defenderem. A cada rodada reduz a vida do jogador inimigo em 1. Ao chegar a ZERO o jogador inimigo é derrotado.',
      };
      setOpponent((prev) => ({
        ...prev,
        board: prev.board.map((c) => (c.instanceId === oOSol.instanceId ? evolvedOpponentSol : c)),
      }));
      sound.playFusion();
      addLog(
        `🕳️☀️ [ASCENSÃO INIMIGA - O ABSOLUTO] O Sol de ${opponent.name} presenciou Lunario ser eliminado! Atributos em ESCALA INFINITO (∞) e IMORTAL (NÍVEL 2)!`,
        'spell'
      );
      triggerLevelUpCinematic(
        evolvedOpponentSol,
        '🕳️☀️ O ABSOLUTO DESPERTO! O Sol revelou sua verdadeira forma de Buraco Negro (Atributos ∞ · Imortal)!'
      );
    }
  }, [player.graveyard, opponent.graveyard, player.board, opponent.board, opponent.name, addLog, triggerLevelUpCinematic]);

  // A Lua Level-Up Watcher: "Requisito para subir de nível: Ver Hélio ser eliminado (aliado ou inimigo). A Lua precisa estar na mesa."
  const witnessedHelioDeathsRef = useRef<Set<string>>(new Set());
  const prevBoardHeliosRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const allGraveyard = [...player.graveyard, ...opponent.graveyard];
    const currentBoardHelios = new Set(
      [...player.board, ...opponent.board]
        .filter(
          (c) =>
            (c.templateId === 'n_helio' || c.name.toLowerCase().includes('helio') || c.name.toLowerCase().includes('hélio')) &&
            c.hp > 0
        )
        .map((c) => c.instanceId)
    );

    const newlyDeadInGraveyard = allGraveyard.filter(
      (c) =>
        (c.templateId === 'n_helio' || c.name.toLowerCase().includes('helio') || c.name.toLowerCase().includes('hélio')) &&
        !witnessedHelioDeathsRef.current.has(c.instanceId)
    );

    let eliminatedFromBoardCount = 0;
    prevBoardHeliosRef.current.forEach((id) => {
      if (!currentBoardHelios.has(id) && !witnessedHelioDeathsRef.current.has(id)) {
        witnessedHelioDeathsRef.current.add(id);
        eliminatedFromBoardCount += 1;
      }
    });
    prevBoardHeliosRef.current = currentBoardHelios;

    if (newlyDeadInGraveyard.length === 0 && eliminatedFromBoardCount === 0) return;

    newlyDeadInGraveyard.forEach((h) => witnessedHelioDeathsRef.current.add(h.instanceId));

    // Check if Player has A Lua (Level 1) alive on board
    const pALua = player.board.find(
      (c) =>
        (c.templateId === 'g_a_lua' || c.name.trim().toLowerCase().startsWith('a lua')) &&
        c.level === 1 &&
        c.hp > 0 &&
        c.silencedRounds === 0
    );
    if (pALua) {
      const nextConds = new Set(pALua.conditions);
      nextConds.add('obliteracao');
      nextConds.add('imunidade');
      nextConds.delete('queimadura');
      nextConds.delete('atordoado');
      nextConds.delete('dormindo');
      nextConds.delete('entorpecer');
      nextConds.delete('congelado');
      const evolvedPlayerLua: CardInstance = {
        ...pALua,
        level: 2,
        name: 'A Lua - A Eminente',
        exclusiveName: 'A Eminente (Monstruosidade Sanguinária · Imortal)',
        hp: 999999,
        maxHp: 999999,
        sapience: 999999,
        baseSapience: 999999,
        atk: 0,
        baseAtk: 0,
        def: 0,
        baseDef: 0,
        power: 999999,
        basePower: 999999,
        silencedRounds: 0,
        burnTurnsRemaining: 0,
        entorpecerRoundsRemaining: 0,
        sleepRoundsRemaining: 0,
        conditions: nextConds,
        effectDescription:
          'Supremo [Tier 6 - Nível 2]. A EMINENTE: A Lua mostra sua verdadeira forma, uma monstruosidade sanguinária e aniquiladora. A cada rodada aplica SONO em todos os inimigos. A Lua potencializa o efeito de Lunario, fazendo com que toda vez que Lunario consuma o SONO das unidades inimigas ele OBLITERA elas. A cada início de rodada A Lua drena 1 da vida do jogador inimigo, ao chegar a zero ele é derrotado.',
      };
      setPlayer((prev) => ({
        ...prev,
        board: prev.board.map((c) => (c.instanceId === pALua.instanceId ? evolvedPlayerLua : c)),
      }));
      sound.playFusion();
      addLog(
        `🌕🩸 [ASCENSÃO CÓSMICA - A EMINENTE] A Lua presenciou Hélio ser eliminado! Revelou sua verdadeira forma de Monstruosidade Sanguinária com atributos em ESCALA INFINITO (∞) e se tornou IMORTAL (NÍVEL 2)!`,
        'spell'
      );
      triggerLevelUpCinematic(
        evolvedPlayerLua,
        '🌕🩸 A EMINENTE DESPERTA! A Lua revelou sua verdadeira forma de Monstruosidade Sanguinária! Aplica SONO em massa, OBLITERA com Lunario e drena vida inimiga!'
      );
    }

    // Check if Opponent has A Lua (Level 1) alive on board
    const oALua = opponent.board.find(
      (c) =>
        (c.templateId === 'g_a_lua' || c.name.trim().toLowerCase().startsWith('a lua')) &&
        c.level === 1 &&
        c.hp > 0 &&
        c.silencedRounds === 0
    );
    if (oALua) {
      const nextConds = new Set(oALua.conditions);
      nextConds.add('obliteracao');
      nextConds.add('imunidade');
      nextConds.delete('queimadura');
      nextConds.delete('atordoado');
      nextConds.delete('dormindo');
      nextConds.delete('entorpecer');
      nextConds.delete('congelado');
      const evolvedOpponentLua: CardInstance = {
        ...oALua,
        level: 2,
        name: 'A Lua - A Eminente',
        exclusiveName: 'A Eminente (Monstruosidade Sanguinária · Imortal)',
        hp: 999999,
        maxHp: 999999,
        sapience: 999999,
        baseSapience: 999999,
        atk: 0,
        baseAtk: 0,
        def: 0,
        baseDef: 0,
        power: 999999,
        basePower: 999999,
        silencedRounds: 0,
        burnTurnsRemaining: 0,
        entorpecerRoundsRemaining: 0,
        sleepRoundsRemaining: 0,
        conditions: nextConds,
        effectDescription:
          'Supremo [Tier 6 - Nível 2]. A EMINENTE: A Lua mostra sua verdadeira forma, uma monstruosidade sanguinária e aniquiladora. A cada rodada aplica SONO em todos os inimigos. A Lua potencializa o efeito de Lunario, fazendo com que toda vez que Lunario consuma o SONO das unidades inimigas ele OBLITERA elas. A cada início de rodada A Lua drena 1 da vida do jogador inimigo, ao chegar a zero ele é derrotado.',
      };
      setOpponent((prev) => ({
        ...prev,
        board: prev.board.map((c) => (c.instanceId === oALua.instanceId ? evolvedOpponentLua : c)),
      }));
      sound.playFusion();
      addLog(
        `🌕🩸 [ASCENSÃO INIMIGA - A EMINENTE] A Lua de ${opponent.name} presenciou Hélio ser eliminado! Atributos em ESCALA INFINITO (∞) e IMORTAL (NÍVEL 2)!`,
        'spell'
      );
      triggerLevelUpCinematic(
        evolvedOpponentLua,
        '🌕🩸 A EMINENTE DESPERTA! A Lua revelou sua verdadeira forma de Monstruosidade Sanguinária (Atributos ∞ · Imortal)!'
      );
    }
  }, [player.graveyard, opponent.graveyard, player.board, opponent.board, opponent.name, addLog, triggerLevelUpCinematic]);

  // ----------------------------------------------------
  // PASSIVA SECRETA: O VAZIO
  // "Caso O Absoluto e A Eminente (apenas se ambos estiverem no nível 2) estejam juntos na mesa
  // o jogador é consumido pela anti-matéria cósmica e perde o jogo, duas divindades opostas não se ajudam na vitória,
  // elas se opõem e se destroem. ESSA PASSIVA DEVE SER SECRETA E SÓ FICA VISÍVEL CASO AMBOS ESTEJAM NA MESA NO NÍVEL 2."
  // ----------------------------------------------------
  const pHasOVazio = useMemo(() => {
    const hasSol2 = player.board.some(
      (c) =>
        (c.templateId === 'n_o_sol' || c.name.trim().toLowerCase().startsWith('o sol')) &&
        c.level === 2 &&
        c.hp > 0
    );
    const hasLua2 = player.board.some(
      (c) =>
        (c.templateId === 'g_a_lua' || c.name.trim().toLowerCase().startsWith('a lua')) &&
        c.level === 2 &&
        c.hp > 0
    );
    return hasSol2 && hasLua2;
  }, [player.board]);

  const oHasOVazio = useMemo(() => {
    const hasSol2 = opponent.board.some(
      (c) =>
        (c.templateId === 'n_o_sol' || c.name.trim().toLowerCase().startsWith('o sol')) &&
        c.level === 2 &&
        c.hp > 0
    );
    const hasLua2 = opponent.board.some(
      (c) =>
        (c.templateId === 'g_a_lua' || c.name.trim().toLowerCase().startsWith('a lua')) &&
        c.level === 2 &&
        c.hp > 0
    );
    return hasSol2 && hasLua2;
  }, [opponent.board]);

  const hasTriggeredOVazioRef = useRef(false);
  useEffect(() => {
    if (hasTriggeredOVazioRef.current || gameOverWinner) return;

    if (pHasOVazio) {
      hasTriggeredOVazioRef.current = true;
      sound.playSpell();
      addLog(
        `🌌💥 [PASSIVA SECRETA: O VAZIO] O Absoluto e A Eminente colidiram na sua mesa! A antimatéria cósmica consumiu você! Duas divindades opostas se destroem!`,
        'kill'
      );
      setTimeout(() => {
        setGameOverReason(
          '🌌 PASSIVA SECRETA: O VAZIO! Você colocou O Absoluto e A Eminente (Nível 2) juntos na sua mesa. Duas divindades cósmicas opostas colidiram e a antimatéria cósmica aniquilou seu reino, causando sua derrota imediata!'
        );
        setGameOverWinner('opponent');
        sound.playPlayerHit();
      }, 1500);
    } else if (oHasOVazio) {
      hasTriggeredOVazioRef.current = true;
      sound.playSpell();
      addLog(
        `🌌💥 [PASSIVA SECRETA: O VAZIO] O Absoluto e A Eminente colidiram na mesa de ${opponent.name}! A antimatéria cósmica consumiu o oponente!`,
        'kill'
      );
      setTimeout(() => {
        setGameOverReason(
          `🌌 PASSIVA SECRETA: O VAZIO! ${opponent.name} colocou O Absoluto e A Eminente (Nível 2) juntos na mesa. Duas divindades cósmicas opostas colidiram e a antimatéria aniquilou o jogador inimigo, concedendo sua vitória!`
        );
        setGameOverWinner('player');
        sound.playVictory();
      }, 1500);
    }
  }, [pHasOVazio, oHasOVazio, gameOverWinner, opponent.name, addLog]);

  // Vilma, a Bruxa do Fogo Death Watcher:
  // "Ao ser eliminada compre uma carta, se essa carta for da classe FOGO, dê a ela +5 de Poder."
  const witnessedVilmaDeathsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const newDeadPlayerVilmas = player.graveyard.filter(
      (c) =>
        (c.templateId === 'm_vilma' || c.name.toLowerCase().includes('vilma')) &&
        c.hp <= 0 &&
        (c.silencedRounds ?? 0) === 0 &&
        !witnessedVilmaDeathsRef.current.has(c.instanceId)
    );

    if (newDeadPlayerVilmas.length > 0) {
      newDeadPlayerVilmas.forEach((v) => witnessedVilmaDeathsRef.current.add(v.instanceId));
      setPlayer((prev) => {
        let currentDeck = prev.deck;
        const newlyDrawn: CardInstance[] = [];
        for (let i = 0; i < newDeadPlayerVilmas.length; i++) {
          if (currentDeck.length > 0) {
            const { card: drawn, remainingDeck } = drawCardCurve(currentDeck, roundRef.current);
            currentDeck = remainingDeck;
            if (drawn) {
              const drawnCopy: CardInstance = { ...drawn, conditions: new Set(drawn.conditions) };
              if (drawnCopy.element === 'Fogo') {
                addPowerPoints(drawnCopy, 5);
                addLog(
                  `🔥🧙‍♀️ [Vilma, a Bruxa do Fogo] Ao ser eliminada, comprou ${drawnCopy.name} (Classe FOGO) e concedeu a ela +5 de Poder (Poder: ${drawnCopy.power})!`,
                  'spell'
                );
              } else {
                addLog(
                  `🔥🧙‍♀️ [Vilma, a Bruxa do Fogo] Ao ser eliminada, comprou ${drawnCopy.name} automaticamente!`,
                  'spell'
                );
              }
              newlyDrawn.push(drawnCopy);
            }
          }
        }
        if (newlyDrawn.length === 0) return prev;
        setDrawingCardAnim({ card: newlyDrawn[0], ownerId: 'player' });
        sound.playSpell();
        return {
          ...prev,
          deck: currentDeck,
          hand: [...prev.hand, ...newlyDrawn],
        };
      });
    }

    const newDeadOpponentVilmas = opponent.graveyard.filter(
      (c) =>
        (c.templateId === 'm_vilma' || c.name.toLowerCase().includes('vilma')) &&
        c.hp <= 0 &&
        (c.silencedRounds ?? 0) === 0 &&
        !witnessedVilmaDeathsRef.current.has(c.instanceId)
    );

    if (newDeadOpponentVilmas.length > 0) {
      newDeadOpponentVilmas.forEach((v) => witnessedVilmaDeathsRef.current.add(v.instanceId));
      setOpponent((prev) => {
        let currentDeck = prev.deck;
        const newlyDrawn: CardInstance[] = [];
        for (let i = 0; i < newDeadOpponentVilmas.length; i++) {
          if (currentDeck.length > 0) {
            const { card: drawn, remainingDeck } = drawCardCurve(currentDeck, roundRef.current);
            currentDeck = remainingDeck;
            if (drawn) {
              const drawnCopy: CardInstance = { ...drawn, conditions: new Set(drawn.conditions) };
              if (drawnCopy.element === 'Fogo') {
                addPowerPoints(drawnCopy, 5);
                addLog(
                  `🔥🧙‍♀️ [Vilma Inimiga] Ao ser eliminada, ${prev.name} comprou uma carta de FOGO com +5 de Poder!`,
                  'spell'
                );
              } else {
                addLog(
                  `🔥🧙‍♀️ [Vilma Inimiga] Ao ser eliminada, ${prev.name} comprou uma carta automaticamente!`,
                  'spell'
                );
              }
              newlyDrawn.push(drawnCopy);
            }
          }
        }
        if (newlyDrawn.length === 0) return prev;
        sound.playSpell();
        return {
          ...prev,
          deck: currentDeck,
          hand: [...prev.hand, ...newlyDrawn],
        };
      });
    }
  }, [player.graveyard, opponent.graveyard, addLog]);

  // Falanx Death Watcher (Musmo - Tier 3 Divino):
  // "Ao ser invocado e morrer, Falanx emite uma luz que causa TORPOR em todos os inimigos por 2 rodadas."
  const witnessedFalanxDeathsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const applyFalanxDeathTorpor = (
      deadFalanxes: CardInstance[],
      enemySetter: React.Dispatch<React.SetStateAction<PlayerState>>,
      enemySide: 'player' | 'opponent',
      ownerLabel: string
    ) => {
      if (deadFalanxes.length === 0) return;
      deadFalanxes.forEach((f) => witnessedFalanxDeathsRef.current.add(f.instanceId));
      const falanxName = deadFalanxes[0].name;
      const casterSide: 'player' | 'opponent' = enemySide === 'opponent' ? 'player' : 'opponent';
      const enemyBoardNow = enemySide === 'opponent' ? opponentRef.current.board : playerRef.current.board;
      const affectedIds = enemyBoardNow.filter((u) => u.hp > 0 && !u.conditions.has('imunidade')).map((u) => u.instanceId);
      sound.playSpell();
      queueUnitVfx({
        type: 'falanx_onda_luz',
        sourceId: deadFalanxes[0].instanceId,
        targetIds: affectedIds,
        ownerSide: casterSide,
      });
      enemySetter((prevEnemy) => {
        const batch: Array<Omit<ConditionVfxEvent, 'id'>> = [];
        const nextBoard = prevEnemy.board.map((u) => {
          if (u.hp <= 0) return u;
          if (u.conditions.has('imunidade')) return u;
          const nextConds = new Set(u.conditions);
          nextConds.add('entorpecer');
          batch.push({
            condition: 'torpor',
            targetUnitId: u.instanceId,
            targetUnitName: u.name,
            targetSide: enemySide,
          });
          return {
            ...u,
            conditions: nextConds,
            conditionSources: withConditionSource(u.conditionSources, 'entorpecer', 'unidade_inimiga', falanxName),
            entorpecerRoundsRemaining: Math.max(u.entorpecerRoundsRemaining || 0, 2),
          };
        });
        if (batch.length > 0) queueConditionVfx(batch);
        return { ...prevEnemy, board: nextBoard };
      });
      addLog(
        `✨🌀 [${falanxName} - ${ownerLabel}] Ao morrer, emitiu sua luz sagrada aplicando TORPOR em todos os inimigos por 2 rodadas!`,
        'spell'
      );
    };

    const newDeadPlayerFalanxes = player.graveyard.filter(
      (c) =>
        (c.templateId === 'm_falanx' || c.name.toLowerCase() === 'falanx') &&
        c.hp <= 0 &&
        (c.silencedRounds ?? 0) === 0 &&
        !c.conditions.has('obliteracao') &&
        !witnessedFalanxDeathsRef.current.has(c.instanceId)
    );
    const newDeadOpponentFalanxes = opponent.graveyard.filter(
      (c) =>
        (c.templateId === 'm_falanx' || c.name.toLowerCase() === 'falanx') &&
        c.hp <= 0 &&
        (c.silencedRounds ?? 0) === 0 &&
        !c.conditions.has('obliteracao') &&
        !witnessedFalanxDeathsRef.current.has(c.instanceId)
    );

    applyFalanxDeathTorpor(newDeadPlayerFalanxes, setOpponent, 'opponent', playerRef.current.name);
    applyFalanxDeathTorpor(newDeadOpponentFalanxes, setPlayer, 'player', opponentRef.current.name);
  }, [player.graveyard, opponent.graveyard, addLog]);

  // Xeno Passive Watcher (Musmo - Tier 4 Divino):
  // "Sempre que Xeno vê uma unidade inimiga receber ATORDOADO, cria uma 'Centelha' na mão."
  const prevPlayerStunnedIdsRef = useRef<Set<string>>(new Set());
  const prevOpponentStunnedIdsRef = useRef<Set<string>>(new Set());

  const grantCentelhasForOwner = useCallback(
    (ownerId: 'player' | 'opponent', stunCount: number, minXenoIfJustSummoned = 0) => {
      if (stunCount <= 0) return;
      const centelhaTpl = CARD_TEMPLATES.find((t) => t.id === 'token_centelha');
      if (!centelhaTpl) return;
      const setter = ownerId === 'player' ? setPlayer : setOpponent;
      setter((prev) => {
        const boardXenos = prev.board.filter(
          (u) =>
            (u.templateId === 'm_xeno' || u.name.toLowerCase() === 'xeno') &&
            u.hp > 0 &&
            (u.silencedRounds ?? 0) === 0
        ).length;
        const xenoCount = Math.max(boardXenos, minXenoIfJustSummoned);
        if (xenoCount <= 0) return prev;
        const totalToCreate = xenoCount * stunCount;
        const space = Math.max(0, 8 - prev.hand.length);
        const createdCount = Math.min(space, totalToCreate);
        if (createdCount <= 0) {
          addLog(
            `⚡✨ [Xeno - ${prev.name}] Inimigo atordoado, mas a mão já está cheia (8/8) para gerar Centelha!`,
            'info'
          );
          return prev;
        }
        const newTokens = Array.from({ length: createdCount }, () => {
          const inst = createCardInstance(centelhaTpl);
          inst.isFugaz = true;
          inst.isGeneratedCard = true;
          return inst;
        });
        sound.playSpell();
        addLog(
          `⚡✨ [Xeno - ${prev.name}] Presenciou atordoamento inimigo e gerou ${createdCount}x Centelha (Fugaz) na mão!`,
          'spell'
        );
        return { ...prev, hand: [...prev.hand, ...newTokens] };
      });
    },
    [addLog]
  );

  useEffect(() => {
    if (gameOverWinner) return;

    const currentPlayerStunned = new Set(
      player.board.filter((c) => c.hp > 0 && c.conditions.has('atordoado')).map((c) => c.instanceId)
    );
    const currentOpponentStunned = new Set(
      opponent.board.filter((c) => c.hp > 0 && c.conditions.has('atordoado')).map((c) => c.instanceId)
    );

    let newOpponentStuns = 0;
    currentOpponentStunned.forEach((id) => {
      if (!prevOpponentStunnedIdsRef.current.has(id)) newOpponentStuns += 1;
    });
    let newPlayerStuns = 0;
    currentPlayerStunned.forEach((id) => {
      if (!prevPlayerStunnedIdsRef.current.has(id)) newPlayerStuns += 1;
    });

    prevPlayerStunnedIdsRef.current = currentPlayerStunned;
    prevOpponentStunnedIdsRef.current = currentOpponentStunned;

    grantCentelhasForOwner('player', newOpponentStuns);
    grantCentelhasForOwner('opponent', newPlayerStuns);
  }, [player.board, opponent.board, gameOverWinner, grantCentelhasForOwner]);

  // Kaliel, o Arcanjo Level-Up Watcher & Level 2 Comunhão Angiris Aura:
  // Sobe de nível quando vê "Aliança Angiris" ativa em 3 ou mais Arcanjos aliados simultaneamente na mesa.
  // No Nível 2: gera "Filho da Luz" FUGAZ na mão e compartilha os maiores valores atuais de cada atributo e todas as condições benéficas/combate entre Arcanjos aliados em mesa.
  useEffect(() => {
    if (gameOverWinner) return;

    const evaluateKalielSide = (
      board: CardInstance[],
      setter: React.Dispatch<React.SetStateAction<PlayerState>>,
      ownerName: string,
      ownerSide: 'player' | 'opponent'
    ) => {
      const aliveArchangels = board.filter((c) => isArchangelCard(c) && c.hp > 0);
      const unsilencedArchangels = aliveArchangels.filter((c) => (c.silencedRounds ?? 0) === 0);

      // 1. Check Level 1 -> Level 2 evolution (3+ allied Archangels with active Aliança Angiris simultaneously on board)
      const lvl1Kaliel = unsilencedArchangels.find(
        (c) => (c.templateId === 'g_kaliel' || c.name.toLowerCase().includes('kaliel')) && (c.level || 1) === 1
      );
      if (lvl1Kaliel && unsilencedArchangels.length >= 3) {
        const filhoTpl = CARD_TEMPLATES.find((t) => t.id === 'token_filho_da_luz');
        const evolvedSnapshot: CardInstance = {
          ...lvl1Kaliel,
          level: 2,
          exclusiveName: 'Comunhão Angiris',
          effectDescription:
            'Lendária [Tier 5 - Nível 2]. Ao subir de nível gera um "Filho da Luz" FUGAZ na mão. Enquanto Kaliel estiver na mesa, todos os Arcanjos aliados em campo compartilham entre si os maiores valores atuais de cada atributo e todas as suas condições benéficas e de combate!',
        };
        setter((prev) => {
          const stillLvl1 = prev.board.find(
            (c) => c.instanceId === lvl1Kaliel.instanceId && (c.level || 1) === 1 && c.hp > 0 && (c.silencedRounds ?? 0) === 0
          );
          if (!stillLvl1) return prev;
          const nextBoard = prev.board.map((c) => {
            if (c.instanceId !== lvl1Kaliel.instanceId) return c;
            return {
              ...c,
              level: 2 as const,
              exclusiveName: 'Comunhão Angiris',
              effectDescription: evolvedSnapshot.effectDescription,
            };
          });
          let nextHand = prev.hand;
          if (filhoTpl && prev.hand.length < 8) {
            const token = createCardInstance(filhoTpl);
            token.isFugaz = true;
            token.isGeneratedCard = true;
            nextHand = [...prev.hand, token];
          }
          return { ...prev, board: nextBoard, hand: nextHand };
        });
        sound.playFusion();
        queueUnitVfx({
          type: 'kaliel_comunhao_angiris',
          sourceId: lvl1Kaliel.instanceId,
          targetIds: unsilencedArchangels.map((a) => a.instanceId),
          ownerSide,
        });
        triggerLevelUpCinematic(
          evolvedSnapshot,
          'Comunhão Angiris Desperta! Gerou "Filho da Luz" (Fugaz) na mão e agora todos os Arcanjos aliados na mesa compartilham os maiores atributos e condições!'
        );
        addLog(
          `🪽👑 [ASCENSÃO ANGIRIS - ${ownerName}] Kaliel testemunhou 3+ Arcanjos unidos pela Aliança Angiris e ascendeu ao NÍVEL 2! Gerou "Filho da Luz" (Fugaz) na mão!`,
          'spell'
        );
        return;
      }

      // 2. Active Level 2 Aura: Share highest stats & conditions among alive allied Archangels
      const activeLvl2Kaliel = unsilencedArchangels.find(
        (c) => (c.templateId === 'g_kaliel' || c.name.toLowerCase().includes('kaliel')) && c.level === 2
      );
      if (!activeLvl2Kaliel || aliveArchangels.length < 2) return;

      const topHp = Math.max(...aliveArchangels.map((a) => a.hp));
      const topMaxHp = Math.max(topHp, ...aliveArchangels.map((a) => a.maxHp));
      const topAtk = Math.max(...aliveArchangels.map((a) => a.atk));
      const topDef = Math.max(...aliveArchangels.map((a) => a.def));
      const topPower = Math.max(...aliveArchangels.map((a) => a.power));

      const KALIEL_SHARED_CONDITIONS: ConditionEffect[] = [
        'cura',
        'tenacidade',
        'barreira',
        'imunidade',
        'ressurreicao',
        'bravura',
        'enfrentar',
        'furtividade',
        'etereo',
        'critico',
        'roubo_de_vida',
        'ataque_duplo',
      ];
      const sharedConds = KALIEL_SHARED_CONDITIONS.filter((cond) =>
        aliveArchangels.some((a) => a.conditions.has(cond))
      );

      let needsSync = false;
      for (const a of aliveArchangels) {
        const respectsSilencePower =
          votoSilencioActive && a.votoSilencioSavedPower !== undefined && !a.conditions.has('imunidade');
        if (
          a.hp < topHp ||
          a.maxHp < topMaxHp ||
          a.atk < topAtk ||
          a.def < topDef ||
          (!respectsSilencePower && a.power < topPower) ||
          (a.sapience != null && a.sapience < topHp) ||
          sharedConds.some((cond) => !a.conditions.has(cond))
        ) {
          needsSync = true;
          break;
        }
      }

      if (!needsSync) return;

      setter((prev) => {
        const currentArchangels = prev.board.filter((c) => isArchangelCard(c) && c.hp > 0);
        const kalielStillUp = currentArchangels.some(
          (c) =>
            (c.templateId === 'g_kaliel' || c.name.toLowerCase().includes('kaliel')) &&
            c.level === 2 &&
            (c.silencedRounds ?? 0) === 0
        );
        if (!kalielStillUp || currentArchangels.length < 2) return prev;

        const cTopHp = Math.max(...currentArchangels.map((a) => a.hp));
        const cTopMaxHp = Math.max(cTopHp, ...currentArchangels.map((a) => a.maxHp));
        const cTopAtk = Math.max(...currentArchangels.map((a) => a.atk));
        const cTopDef = Math.max(...currentArchangels.map((a) => a.def));
        const cTopPower = Math.max(...currentArchangels.map((a) => a.power));
        const cShared = KALIEL_SHARED_CONDITIONS.filter((cond) =>
          currentArchangels.some((a) => a.conditions.has(cond))
        );

        let changed = false;
        const nextBoard = prev.board.map((u) => {
          if (!isArchangelCard(u) || u.hp <= 0) return u;
          const nextConds = new Set(u.conditions);
          let nextSources = u.conditionSources ? { ...u.conditionSources } : undefined;
          let condChanged = false;
          cShared.forEach((cond) => {
            if (!nextConds.has(cond)) {
              nextConds.add(cond);
              nextSources = withConditionSource(nextSources, cond, 'unidade_compartilhada', 'Kaliel, o Arcanjo');
              condChanged = true;
            }
          });
          const respectsSilencePower =
            votoSilencioActive && u.votoSilencioSavedPower !== undefined && !nextConds.has('imunidade');
          const nextPower = respectsSilencePower ? u.power : Math.max(u.power, cTopPower);
          const nextHp = Math.max(u.hp, cTopHp);
          const nextMaxHp = Math.max(u.maxHp, cTopMaxHp);
          const nextAtk = Math.max(u.atk, cTopAtk);
          const nextDef = Math.max(u.def, cTopDef);
          const nextSapience = u.sapience != null ? Math.max(u.sapience, nextHp) : u.sapience;

          if (
            !condChanged &&
            nextHp === u.hp &&
            nextMaxHp === u.maxHp &&
            nextAtk === u.atk &&
            nextDef === u.def &&
            nextPower === u.power &&
            nextSapience === u.sapience
          ) {
            return u;
          }
          changed = true;
          return {
            ...u,
            hp: nextHp,
            maxHp: nextMaxHp,
            atk: nextAtk,
            def: nextDef,
            icePeakDefense: Math.max(u.icePeakDefense ?? 0, nextDef),
            power: nextPower,
            peakPower: Math.max(u.peakPower ?? 0, nextPower),
            ...(nextSapience !== undefined ? { sapience: nextSapience } : {}),
            conditions: nextConds,
            conditionSources: nextSources,
            hasDoubleAttack: u.hasDoubleAttack || nextConds.has('ataque_duplo'),
            hasLifeSteal: u.hasLifeSteal || nextConds.has('roubo_de_vida'),
            ...(nextConds.has('cura') ? { healingAmount: u.healingAmount ?? 9 } : {}),
          };
        });

        return changed ? { ...prev, board: nextBoard } : prev;
      });
    };

    evaluateKalielSide(player.board, setPlayer, player.name, 'player');
    evaluateKalielSide(opponent.board, setOpponent, opponent.name, 'opponent');
  }, [player.board, opponent.board, player.name, opponent.name, votoSilencioActive, gameOverWinner, addLog, queueUnitVfx]);

  // Claim one-time +250 Gold reward automatically when winning the Interactive Tutorial
  useEffect(() => {
    if (!isTutorialMode || gameOverWinner !== 'player') return;
    if (tutorialRewardClaimAttemptedRef.current) return;
    tutorialRewardClaimAttemptedRef.current = true;
    void claimTutorialRewardInCloud()
      .then((res) => {
        setTutorialRewardResult({
          claimedNow: res.claimedNow,
          goldAwarded: res.goldAwarded,
        });
      })
      .catch((err) => {
        console.error('Failed to claim tutorial reward:', err);
      });
  }, [isTutorialMode, gameOverWinner]);

  // Turn timer countdown (30s) — disabled in Testing Arena and Mandatory Tutorial (active in Guided PvIA!)
  useEffect(() => {
    if (
      isTestingArena ||
      (isTutorialMode && tutorialOverlayActive) ||
      isRoundTransitioning ||
      isTurnTransitioning ||
      isBusyByAnimation ||
      Boolean(roundCoinTransition) ||
      gameOverWinner ||
      finishingCannonAnim?.active ||
      combatResults ||
      revealModal?.isOpen ||
      retornarModal?.isOpen ||
      targetModal?.isOpen ||
      pendingBarelioRecaptureQueue.length > 0
    )
      return;

    const timer = setInterval(() => {
      setTurnTimeLeft((prev) => {
        if (prev <= 1) {
          if (isOnlinePvp) {
            const isLocalResponsible = isDefendingPhase
              ? activeCombatAttackerRole === 'opponent'
              : pendingSpell
              ? pendingSpell.casterId === 'opponent'
              : turnPlayer === 'player';
            if (!isLocalResponsible) {
              return 0;
            }
          }
          // Time expired! Forced action (Patch 1.3)
          sound.playTick();
          if (isDefendingPhase) {
            handleDefenseTimeoutRef.current?.();
            return 30;
          } else {
            handlePassTurnRef.current?.(true, true);
            return 30;
          }
        }
        if (prev <= 5) {
          sound.playTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    isTestingArena,
    tutorialOverlayActive,
    isOnlinePvp,
    activeCombatAttackerRole,
    pendingSpell,
    isRoundTransitioning,
    isTurnTransitioning,
    isBusyByAnimation,
    roundCoinTransition,
    gameOverWinner,
    finishingCannonAnim,
    combatResults,
    isDefendingPhase,
    turnPlayer,
    revealModal?.isOpen,
    retornarModal?.isOpen,
    targetModal?.isOpen,
    pendingBarelioRecaptureQueue.length,
  ]);

  // Clear visual & audio Turn Alternation Banner whenever active turn swaps between players
  const prevBannerTurnPlayerRef = useRef<'player' | 'opponent'>(turnPlayer);
  useEffect(() => {
    if (isRoundTransitioning || Boolean(roundCoinTransition) || Boolean(gameOverWinner)) {
      prevBannerTurnPlayerRef.current = turnPlayer;
      return;
    }

    if (prevBannerTurnPlayerRef.current === turnPlayer) {
      return;
    }
    prevBannerTurnPlayerRef.current = turnPlayer;

    sound.playTurnChange(turnPlayer);
    if (effectiveTurnIndicatorMode === 'off') {
      setTurnTransitionBanner(null);
      return;
    }

    const activeName =
      turnPlayer === 'player' ? playerRef.current.name : opponentRef.current.name;

    setTurnTransitionBanner({
      id: `turn_banner_${roundRef.current}_${roundTurnNumberRef.current}_${turnPlayer}_${Date.now()}`,
      nextPlayer: turnPlayer,
      activeName,
      round: roundRef.current,
      turnNumber: roundTurnNumberRef.current,
      isAttacker: attackerRoleRef.current === turnPlayer,
      isPostAttackExtra: isPostAttackFinalTurnRef.current,
      isCounterResponse: Boolean(pendingSpell),
    });

    if (turnBannerTimerRef.current !== null) {
      window.clearTimeout(turnBannerTimerRef.current);
    }
    turnBannerTimerRef.current = window.setTimeout(() => {
      turnBannerTimerRef.current = null;
      setTurnTransitionBanner(null);
    }, effectiveTurnIndicatorMode === 'static' ? 850 : 1200);
  }, [turnPlayer, isRoundTransitioning, roundCoinTransition, gameOverWinner, pendingSpell, effectiveTurnIndicatorMode]);

  // Processa a fila de recaptura automática de Barelio no início de cada rodada (sem gastar turno)
  useEffect(() => {
    if (pendingBarelioRecaptureQueue.length === 0) return;
    if (
      gameOverWinner ||
      isRoundTransitioning ||
      Boolean(roundCoinTransition) ||
      isBusyByAnimation ||
      targetModal.isOpen ||
      umaelModal ||
      revealModal.isOpen ||
      retornarModal.isOpen ||
      discardModal.isOpen ||
      Boolean(zykDiscardModal?.isOpen) ||
      Boolean(combatResults) ||
      Boolean(cinematicLevelUp)
    ) {
      return;
    }

    const [nextReq, ...restQueue] = pendingBarelioRecaptureQueue;
    const ownerState = nextReq.ownerSide === 'player' ? playerRef.current : opponentRef.current;
    const enemyState = nextReq.ownerSide === 'player' ? opponentRef.current : playerRef.current;

    const barelioUnit = ownerState.board.find(
      (u) =>
        u.instanceId === nextReq.barelioId &&
        (u.templateId === 'n_barelio' || u.name.toLowerCase().includes('barelio')) &&
        u.hp > 0 &&
        u.silencedRounds === 0 &&
        !u.imprisonedUnit
    );
    const validEnemies = enemyState.board.filter(
      (c) =>
        c.hp > 0 &&
        !c.conditions.has('imunidade') &&
        !isOSolLevel2Immortal(c) &&
        !isALuaLevel2Supreme(c)
    );

    if (!barelioUnit || validEnemies.length === 0) {
      if (barelioUnit && validEnemies.length === 0) {
        addLog(
          `⛓️🌑 [Barelio, o Carcereiro] Está livre para capturar novamente, mas não há unidades inimigas vulneráveis no campo.`,
          'info'
        );
      }
      setPendingBarelioRecaptureQueue(restQueue);
      return;
    }

    const isInteractiveOwner = isOnlinePvp
      ? nextReq.ownerSide === 'player'
      : nextReq.ownerSide === 'player' || (isTestingArena && !ownerState.isAi);

    if (isInteractiveOwner) {
      setPendingBarelioRecaptureQueue(restQueue);
      addLog(
        `⛓️🌑 [Barelio, o Carcereiro] ${barelioUnit.name} está livre! Selecione uma nova unidade inimiga para capturar (sem gastar seu turno).`,
        'spell'
      );
      setTargetModal({
        isOpen: true,
        title: 'Barelio, o Carcereiro - Nova Captura',
        description: `${barelioUnit.name} está com as correntes livres! Selecione uma nova unidade inimiga para CAPTURAR e prender (não consome seu turno de ação):`,
        candidates: validEnemies,
        onSelect: (target) => {
          setTargetModal((prev) => ({ ...prev, isOpen: false, getBadgeLabel: undefined }));
          executeBarelioCapture(barelioUnit.instanceId, nextReq.ownerSide, target);
        },
      });
    } else {
      setPendingBarelioRecaptureQueue(restQueue);
      const bestTarget = [...validEnemies].sort(
        (a, b) => (b.atk + b.power + b.hp) - (a.atk + a.power + a.hp)
      )[0];
      if (bestTarget) {
        executeBarelioCapture(barelioUnit.instanceId, nextReq.ownerSide, bestTarget);
      }
    }
  }, [
    pendingBarelioRecaptureQueue,
    gameOverWinner,
    isRoundTransitioning,
    roundCoinTransition,
    isBusyByAnimation,
    targetModal.isOpen,
    umaelModal,
    revealModal.isOpen,
    retornarModal.isOpen,
    discardModal.isOpen,
    zykDiscardModal,
    combatResults,
    cinematicLevelUp,
    gameMode,
    addLog,
    executeBarelioCapture,
  ]);

  // ----------------------------------------------------
  // CORROSÃO TURN TICK: "Unidades afetadas por corrosão recebem 1 de dano diretamente na sua vida a cada TURNO das rodadas que permanecer ativo."
  // ----------------------------------------------------
  useEffect(() => {
    const turnKey = `${round}_${turnPlayer}`;
    if (prevTurnTickKeyRef.current === turnKey) return;
    prevTurnTickKeyRef.current = turnKey;
    if (gameOverWinner || isMagicCoinOpen) return;

    const currP = playerRef.current;
    const currO = opponentRef.current;
    const hasAnyCorrosao =
      currP.board.some((u) => u.hp > 0 && hasCorrosao(u)) ||
      currO.board.some((u) => u.hp > 0 && hasCorrosao(u));

    if (!hasAnyCorrosao) return;

    const condVfxBatch: Array<Omit<ConditionVfxEvent, 'id'>> = [];
    const rescuedToPlayer: CardInstance[] = [];
    const rescuedToOpponent: CardInstance[] = [];
    const deadP: CardInstance[] = [];
    const deadO: CardInstance[] = [];

    const tickCorrosaoOnBoard = (
      board: CardInstance[],
      side: 'player' | 'opponent',
      deadArr: CardInstance[],
      rescuedOppositeArr: CardInstance[]
    ): CardInstance[] => {
      const surviving: CardInstance[] = [];
      board.forEach((card) => {
        if (card.hp <= 0 || !hasCorrosao(card) || isOSolLevel2Immortal(card) || isALuaLevel2Supreme(card) || card.conditions.has('imunidade')) {
          surviving.push(card);
          return;
        }
        const u: CardInstance = {
          ...card,
          conditions: new Set(card.conditions),
          conditionSources: card.conditionSources ? { ...card.conditionSources } : undefined,
          hp: Math.max(0, card.hp - 1),
        };
        if (u.sapience != null) u.sapience = u.hp;
        condVfxBatch.push({
          condition: 'corrosao',
          targetUnitId: u.instanceId,
          targetUnitName: u.name,
          targetSide: side,
        });

        if (u.hp <= 0) {
          const ownerState = side === 'player' ? currP : currO;
          const ownerSetter = side === 'player' ? setPlayer : setOpponent;
          if (u.templateId === 'g_bor' && !ownerState.borRevivedOnce && u.silencedRounds === 0) {
            u.hp = Math.round(u.maxHp * 1.5);
            u.maxHp = u.hp;
            u.atk = Math.round(u.atk * 1.5);
            u.def = Math.round(u.def * 1.5);
            u.icePeakDefense = Math.max(u.icePeakDefense ?? 0, u.def);
            addPowerPoints(u, Math.max(0, Math.round(u.power * 1.5) - u.power), false);
            u.conditions.add('cura');
            setCardConditionSource(u, 'cura', 'passiva_propria', u.name);
            ownerSetter((prev) => ({ ...prev, borRevivedOnce: true }));
            surviving.push(u);
            triggerBorPhoenixVfx(u.instanceId, side, 320);
            addLog(`🔥 [O Mesofênix] General Bor sucumbiu à Corrosão, mas renasceu das cinzas!`, 'spell');
            return;
          }
          if (u.conditions.has('ressurreicao')) {
            u.conditions.delete('ressurreicao');
            removeCardConditionSource(u, 'ressurreicao');
            u.permanentRessurreicao = false;
            u.conditions.delete('corrosao');
            u.corrosaoRoundsRemaining = 0;
            u.hp = u.maxHp;
            u.atk = u.baseAtk;
            u.def = u.baseDef;
            u.power = u.basePower;
            u.peakPower = u.basePower;
            syncClassPowerBonuses(u);
            surviving.push(u);
            triggerResurrectionVfx(
              [{ unitId: u.instanceId, unitName: u.name, side }],
              320
            );
            addLog(`🪽 [Ressurreição] ${u.name} sucumbiu à Corrosão, mas ressuscitou com atributos restaurados!`, 'spell');
            return;
          }
          if (u.imprisonedUnit && u.imprisonedUnit.hp > 0) {
            const rescued = { ...u.imprisonedUnit, conditions: new Set(u.imprisonedUnit.conditions) };
            u.imprisonedUnit = undefined;
            u.imprisonedOriginalOwner = undefined;
            rescuedOppositeArr.push(rescued);
            addLog(`⛓️🔓 [LIBERTAÇÃO!] Com a morte de ${u.name} pela Corrosão, ${rescued.name} se libertou das correntes!`, 'spell');
          }
          deadArr.push({ ...u, hp: 0, def: 0 });
          sound.playDeath();
          addLog(`🧪💀 [Corrosão] ${u.name} recebeu 1 de dano direto na Vida neste turno e sucumbiu à Corrosão!`, 'kill');
        } else {
          surviving.push(u);
          addLog(
            `🧪 [Corrosão - Turno] ${u.name} sofreu 1 de dano direto na Vida pela Corrosão (Vida: ${u.hp}/${u.maxHp})!`,
            'spell'
          );
        }
      });
      return surviving;
    };

    const nextPBoard = tickCorrosaoOnBoard(currP.board, 'player', deadP, rescuedToOpponent);
    const nextOBoard = tickCorrosaoOnBoard(currO.board, 'opponent', deadO, rescuedToPlayer);

    if (condVfxBatch.length > 0) {
      queueConditionVfx(condVfxBatch);
    }

    setPlayer((prev) => ({
      ...prev,
      board: [...nextPBoard, ...rescuedToPlayer],
      graveyard: deadP.length > 0 ? [...prev.graveyard, ...deadP] : prev.graveyard,
    }));
    setOpponent((prev) => ({
      ...prev,
      board: [...nextOBoard, ...rescuedToOpponent],
      graveyard: deadO.length > 0 ? [...prev.graveyard, ...deadO] : prev.graveyard,
    }));

    if (deadO.length > 0) {
      triggerPhilioEliminationBonus('player', deadO.length, deadO.map((d) => d.instanceId));
    }
    if (deadP.length > 0) {
      triggerPhilioEliminationBonus('opponent', deadP.length, deadP.map((d) => d.instanceId));
    }
  }, [
    turnPlayer,
    round,
    gameOverWinner,
    isMagicCoinOpen,
    addLog,
    queueConditionVfx,
    triggerPhilioEliminationBonus,
  ]);

  // ----------------------------------------------------
  // PASS TURN LOGIC
  // ----------------------------------------------------
  const handlePassTurn = useCallback((byTimeout: boolean = false, isAiCall: boolean = false) => {
    // Strictly forbid passing the turn during round transition animation, active VFX animations, attack declaration transition, defense phase, combat, or when modals are active
    if (
      isRoundTransitioningRef.current ||
      isRoundTransitioning ||
      isTurnTransitioningRef.current ||
      isTurnTransitioning ||
      isBusyByAnimation ||
      Boolean(activeUnitVfxRef.current) ||
      unitVfxQueueRef.current.length > 0 ||
      isAttackTransitioningRef.current ||
      isAttackTransitioning ||
      isDefendingPhase ||
      Boolean(assigningBlockForAttacker) ||
      Boolean(enfrentarModal) ||
      Boolean(combatResults) ||
      Boolean(finishingCannonAnim?.active) ||
      Boolean(gameOverWinner)
    ) {
      if (!byTimeout && !isAiCall && !isRoundTransitioningRef.current && !isBusyByAnimation) {
        addLog('Ação bloqueada: Não é permitido passar a vez durante a fase de combate ou defesa! Confirme sua defesa.', 'info');
      }
      return;
    }

    if (!byTimeout && !isAiCall && selectedAttackerIds.length > 0) {
      addLog('Ação bloqueada: Você possui unidades selecionadas para atacar! Confirme o ataque ou desmarque as unidades antes de passar a vez.', 'info');
      return;
    }

    // Only block manual clicks by player when it is not their turn in AI or Online PvP mode (outside Testing Arena)
    if (
      !byTimeout &&
      !isAiCall &&
      !isTestingArena &&
      turnPlayer !== 'player' &&
      !(isOnlinePvp && pendingSpell && pendingSpell.casterId === 'opponent')
    ) {
      return;
    }

    if (byTimeout && selectedAttackerIds.length > 0) {
      setSelectedAttackerIds([]);
    }

    // Se houver uma Habilidade aguardando na Janela de Contra-Resposta, passar a vez resolve o efeito da carta inimiga!
    if (pendingSpell) {
      if (isOnlinePvp) {
        if (pendingSpell.casterId !== 'opponent') {
          return;
        }
        const spellToAccept = pendingSpell;
        setPendingSpell({ ...spellToAccept, accepted: true });
        setTurnPlayer('opponent');
        setTurnTimeLeft(30);
        sound.playTick();
        addLog(
          `📜 [Contra-Resposta] ${player.name} deixou a habilidade ${spellToAccept.spellCard.name} resolver.`,
          'spell'
        );
        return;
      }
      const spellToResolve = pendingSpell;
      const spellConsumedTurn = spellToResolve.consumesTurn !== false;
      setPendingSpell(null);
      sound.playSpell();
      startFloatingSkillExecution(spellToResolve.spellCard, spellToResolve.casterId, 2250);
      spellToResolve.executeEffect();
      setPlayer((p) => ({ ...p, board: [...p.board] }));
      setOpponent((o) => ({ ...o, board: [...o.board] }));
      const casterName = spellToResolve.casterId === 'player' ? player.name : opponent.name;
      addLog(
        `📜 [Habilidade Executada] ${turnPlayer === 'player' ? player.name : opponent.name} deixou a habilidade resolver: ${spellToResolve.description}${
          !spellConsumedTurn ? ` (Ação livre — o turno continua com ${casterName}!)` : ''
        }`,
        'spell'
      );
      if (!spellConsumedTurn) {
        // Habilidade Rápida/Fugaz não consome o turno: após o oponente reagir/passar, o turno volta ao conjurador!
        setTurnTimeLeft(30);
        setTurnPlayer(spellToResolve.casterId);
        showFreeActionHint(`⚡ ${spellToResolve.spellCard.name} — Turno mantido (${casterName})`);
        return;
      }
      if (spellToResolve.casterId === attackerRoleRef.current) {
        resetAttackerPasses();
      }
      if (isPostAttackFinalTurnRef.current) {
        setTurnTimeLeft(30);
        const activeId = turnPlayer;
        const activeState = activeId === 'player' ? playerRef.current : opponentRef.current;
        const otherId: 'player' | 'opponent' = activeId === 'player' ? 'opponent' : 'player';
        const otherState = otherId === 'player' ? playerRef.current : opponentRef.current;
        if (hasPendingZykAttack(activeState, activeId)) {
          addLog(`🌌 [Zyk, o Eminente] Ataque extra de ${activeState.name} garantido antes do fim da rodada!`, 'spell');
        } else if (hasPendingZykAttack(otherState, otherId)) {
          setTurnPlayer(otherId);
          addLog(`🌌 [Zyk, o Eminente] Turno retornado para ${otherState.name} realizar o ataque extra garantido!`, 'spell');
        } else {
          setTimeout(() => {
            setPostAttackRoundEndPending(true);
          }, 280);
        }
      } else {
        advanceConsumedTurn(turnPlayer);
      }
      return;
    }

    sound.playDraw();
    setTurnTimeLeft(30);

    const currentActivePlayer = turnPlayer;
    if (!byTimeout && !isAiCall && currentActivePlayer === 'player') {
      setPlayerOrbActionCount((c) => c + 1);
    }

    // Verificação de Vitória por W.O. por inatividade (3 timeouts consecutivos do mesmo duelista)
    if (byTimeout) {
      const nextCount = (consecutiveTimeouts[currentActivePlayer] || 0) + 1;
      setConsecutiveTimeouts((prevTimeouts) => ({
        ...prevTimeouts,
        [currentActivePlayer]: nextCount,
      }));

      const otherPlayerId = currentActivePlayer === 'player' ? 'opponent' : 'player';

      if (nextCount >= 3) {
        const winnerName = otherPlayerId === 'player' ? player.name : opponent.name;
        const loserName = currentActivePlayer === 'player' ? player.name : opponent.name;
        const woMsg = `${loserName} ficou inativo por tempo limite (3 turnos consecutivos). Vitória por W.O. concedida a ${winnerName}!`;

        addLog(
          `🏆 VITÓRIA POR W.O.! ${loserName} ficou inativo por 3 turnos consecutivos. A barra de vida de ${loserName} entrou em colapso!`,
          'round'
        );

        if (currentActivePlayer === 'player') {
          setPlayer((p) => ({ ...p, hp: 0 }));
        } else {
          setOpponent((o) => ({ ...o, hp: 0 }));
        }

        triggerFinishingCannon(
          otherPlayerId,
          'Vitória por W.O. (Inatividade do Adversário)',
          woMsg
        );
        return;
      }
    } else {
      setConsecutiveTimeouts((prev) => ({ ...prev, [currentActivePlayer]: 0 }));
    }

    // Turno Extra Pós-Ataque do Defensor: passar a vez encerra a rodada (salvo ataque garantido de Zyk).
    if (isPostAttackFinalTurnRef.current) {
      const otherId: 'player' | 'opponent' = turnPlayer === 'player' ? 'opponent' : 'player';
      const otherState = otherId === 'player' ? playerRef.current : opponentRef.current;
      if (!byTimeout && hasPendingZykAttack(otherState, otherId)) {
        resetAttackerPasses();
        setTurnPlayer(otherId);
        addLog(
          `🌌 [Zyk, o Eminente] Antes de encerrar a rodada, ${otherState.name} recebeu seu turno garantido para o ataque extra de Zyk!`,
          'spell'
        );
        return;
      }
      addLog(
        `⏳ ${turnPlayer === 'player' ? player.name : opponent.name} encerrou o Turno Extra Pós-Ataque${byTimeout ? ' por tempo esgotado' : ''}. Iniciando próxima rodada...`,
        'round'
      );
      startNewRound();
      return;
    }

    const activeName = currentActivePlayer === 'player' ? player.name : opponent.name;
    const nextPlayer: 'player' | 'opponent' = currentActivePlayer === 'player' ? 'opponent' : 'player';
    const isAttackerPassing = currentActivePlayer === attackerRoleRef.current;

    if (isAttackerPassing) {
      const nextAttackerPasses = attackerConsecutivePassesRef.current + 1;
      if (nextAttackerPasses >= 2) {
        resetAttackerPasses();
        addLog(
          `⏳ ${activeName} (Atacante) passou a vez novamente sem ação obrigatória${byTimeout ? ' por tempo esgotado' : ''} (2/2). Encerrando a Rodada ${roundRef.current}...`,
          'round'
        );
        startNewRound();
        return;
      }

      attackerConsecutivePassesRef.current = nextAttackerPasses;
      setAttackerConsecutivePasses(nextAttackerPasses);
      addLog(
        `${activeName} (Atacante) passou a vez no Turno ${roundTurnNumberRef.current}${byTimeout ? ' por tempo esgotado' : ''}. Vez do Defensor — se o Atacante passar novamente sem agir ao retornar, a rodada encerrará!`,
        'info'
      );
      advanceConsumedTurn(nextPlayer);
    } else {
      // Defensor passar a vez nunca encerra a rodada — retorna sempre ao Atacante
      addLog(
        `${activeName} (Defensor) passou a vez no Turno ${roundTurnNumberRef.current}${byTimeout ? ' por tempo esgotado' : ''}. Turno retorna ao Atacante${
          attackerConsecutivePassesRef.current >= 1 ? ' (⚠️ passar novamente encerrará a rodada!)' : ''
        }.`,
        'info'
      );
      advanceConsumedTurn(nextPlayer);
    }
  }, [
    isDefendingPhase,
    assigningBlockForAttacker,
    enfrentarModal,
    combatResults,
    gameOverWinner,
    selectedAttackerIds.length,
    isOnlinePvp,
    isTestingArena,
    turnPlayer,
    player.name,
    opponent.name,
    consecutiveTimeouts,
    finishingCannonAnim,
    triggerFinishingCannon,
    addLog,
    startNewRound,
    pendingSpell,
    isRoundTransitioning,
    isTurnTransitioning,
    isBusyByAnimation,
    isAttackTransitioning,
    hasPendingZykAttack,
    advanceConsumedTurn,
    resetAttackerPasses,
    showFreeActionHint,
  ]);

  useEffect(() => {
    handlePassTurnRef.current = handlePassTurn;
  }, [handlePassTurn]);

  // ----------------------------------------------------
  // DRAW CARD
  // ----------------------------------------------------
  const handleDrawCard = (playerId: 'player' | 'opponent') => {
    if (isTurnTransitioningRef.current || isTurnTransitioning) {
      return;
    }
    if (isOnlinePvp && (playerId !== 'player' || turnPlayer !== 'player' || Boolean(pendingSpell) || isDefendingPhase)) {
      return;
    }
    const isPlayer = playerId === 'player';
    const targetState = isPlayer ? player : opponent;

    const maxDraws = targetState.extraDrawAvailableThisRound ? 2 : 1;
    // Em partidas normais, limita a 1 ou 2 compras manuais por rodada. Na arena de testes, a compra é infinita!
    if (!isTestingArena && targetState.drawsCountThisRound >= maxDraws) {
      if (!targetState.isAi) {
        addLog(
          maxDraws === 2
            ? `${targetState.name} já comprou todas as cartas manuais permitidas nesta rodada (incluindo o bônus do Mago Uhr).`
            : `${targetState.name} já realizou sua compra manual de carta nesta rodada (a 1ª foi comprada automaticamente no início).`,
          'info'
        );
      }
      return;
    }

    let activeDeck = targetState.deck;
    if (activeDeck.length === 0) {
      if (isTestingArena) {
        activeDeck = buildPlayerDeck();
        addLog(
          `⚔️ [Arena de Testes] Baralho de ${isPlayer ? 'testes' : targetState.name} reabastecido infinitamente com ${activeDeck.length} cartas!`,
          'info'
        );
      } else {
        if (!targetState.isAi) addLog(`O baralho de ${targetState.name} está esgotado! Sobreviva até sua última unidade cair.`, 'info');
        return;
      }
    }

    sound.playDraw();
    const { card: drawn, remainingDeck: newDeck } = drawCardCurve(activeDeck, round);
    if (!drawn) {
      if (!targetState.isAi) addLog('Nenhuma carta pôde ser puxada do baralho.', 'info');
      return;
    }

    // Trigger visual draw animation!
    setDrawingCardAnim({ card: drawn, ownerId: playerId });

    const newDrawCount = targetState.drawsCountThisRound + 1;
    const isNowMaxed = isTestingArena ? false : newDrawCount >= maxDraws;

    if (isPlayer) {
      setPlayer((p) => ({
        ...p,
        deck: newDeck,
        hand: [...p.hand, drawn],
        hasDrawnThisRound: isNowMaxed,
        drawsCountThisRound: newDrawCount,
      }));
      addLog(
        isTestingArena
          ? `[Compra de Testes] Você comprou: ${drawn.name} (Tier ${drawn.tier} · ${drawn.element}).`
          : `Você comprou sua 2ª carta da rodada: ${drawn.name} (Tier ${drawn.tier} · ${drawn.element})${
              maxDraws === 2 ? ` [Compra manual ${newDrawCount}/2]` : ''
            }.`,
        'info'
      );
    } else {
      setOpponent((o) => ({
        ...o,
        deck: newDeck,
        hand: [...o.hand, drawn],
        hasDrawnThisRound: isNowMaxed,
        drawsCountThisRound: newDrawCount,
      }));
      addLog(
        isTestingArena
          ? `[Compra de Testes] ${opponent.name} comprou: ${drawn.name}.`
          : `${opponent.name} comprou sua 2ª carta da rodada${
              maxDraws === 2 ? ` [Compra manual ${newDrawCount}/2]` : ''
            }.`,
        'info'
      );
    }

    recordCardsDrawn(1);
  };

  // ----------------------------------------------------
  // ON SUMMON CARD TRIGGER HANDLERS
  // ----------------------------------------------------
  const getSummonInteractiveModalKind = (
    card: CardInstance,
    ownerId: 'player' | 'opponent',
    allyBoard: CardInstance[],
    enemyBoard: CardInstance[],
    summonOrder?: number
  ): 'reveal' | 'retornar' | 'target' | null => {
    const ownerState = ownerId === 'player' ? playerRef.current : opponentRef.current;
    if (ownerState.isAi) return null;

    const isTorvyx = card.templateId === 'n_torvyx' || card.name.toLowerCase().includes('torvyx');
    const hasOtherArchangelOnTable = [...allyBoard, ...enemyBoard].some(
      (c) => isArchangelCard(c) && c.instanceId !== card.instanceId && c.hp > 0
    );
    if (
      ownerState.deck.length > 0 &&
      (card.templateId === 'n_gohr' ||
        (card.templateId === 'n_vanusa' && allyBoard.some((c) => c.element === 'Água' && c.instanceId !== card.instanceId && c.hp > 0)) ||
        (isTorvyx && hasOtherArchangelOnTable))
    ) {
      return 'reveal';
    }

    if (
      ownerState.graveyard.length > 0 &&
      (card.templateId === 'n_kamui' ||
        card.name.trim().toLowerCase() === 'kamui' ||
        card.templateId === 'm_krust' ||
        card.name.toLowerCase().includes('krust'))
    ) {
      return 'retornar';
    }

    const aliveAllies = allyBoard.filter((c) => c.hp > 0);
    const aliveEnemies = enemyBoard.filter((c) => c.hp > 0);
    const nonImmuneEnemies = aliveEnemies.filter((c) => !c.conditions.has('imunidade'));
    const vulnerableEnemies = nonImmuneEnemies.filter((c) => !isOSolLevel2Immortal(c) && !isALuaLevel2Supreme(c));
    const effectiveOrder = summonOrder ?? ownerState.summonsThisRound;

    if (card.templateId === 'g_rainha_liz' && aliveAllies.length > 1) return 'target';
    if (card.templateId === 'n_fernando' && aliveAllies.length > 0) return 'target';
    if ((card.templateId === 'g_guadan' || card.name.toLowerCase() === 'guadan') && aliveEnemies.length > 0) return 'target';
    if ((card.templateId === 'g_aurora' || card.name.toLowerCase() === 'aurora') && aliveAllies.length > 0) return 'target';
    if (card.templateId === 'n_cristalys' && aliveAllies.length > 0) return 'target';
    if ((card.templateId === 'm_mara' || card.name.toLowerCase() === 'mara') && aliveAllies.length > 0) return 'target';
    if ((card.templateId === 'g_glauco' || card.name.toLowerCase().includes('glauco')) && aliveAllies.length > 0) return 'target';
    if ((card.templateId === 'm_crizelia' || card.templateId === 'n_crizelia' || card.name.toLowerCase().includes('crizelia')) && aliveAllies.length > 0) return 'target';
    if (card.templateId === 'm_caspiem' && aliveAllies.length > 0) return 'target';
    if (card.templateId === 'n_mesmerino' && aliveAllies.length > 0) return 'target';
    if ((card.templateId === 'm_umael' || card.name.toLowerCase().includes('umael')) && aliveAllies.some((c) => c.instanceId !== card.instanceId)) return 'target';
    if ((card.templateId === 'm_fanx' || card.name.toLowerCase().includes('fanx')) && aliveAllies.length > 0) return 'target';
    if ((card.templateId === 'm_cavaleiro_sem_nome' || card.name.toLowerCase().includes('cavaleiro sem nome')) && aliveAllies.length > 0) return 'target';
    if ((card.templateId === 'n_nulio' || card.name.toLowerCase() === 'nulio') && aliveAllies.length > 0) return 'target';
    if ((card.templateId === 'g_vergor' || card.name.toLowerCase() === 'vergor') && aliveEnemies.length > 0) return 'target';
    if ((card.templateId === 'm_xeno' || card.name.toLowerCase() === 'xeno') && nonImmuneEnemies.length >= 2) return 'target';
    if ((card.templateId === 'g_targor' || card.name.toLowerCase().includes('targor')) && vulnerableEnemies.length >= 2) return 'target';
    if ((card.templateId === 'n_barelio' || card.name.toLowerCase().includes('barelio')) && vulnerableEnemies.length >= 1) return 'target';
    if ((card.templateId === 'm_hamelia' || card.name.toLowerCase().includes('hamelia')) && vulnerableEnemies.length >= 2) return 'target';
    if ((card.templateId === 'g_lunario' || card.name.toLowerCase().includes('lunario')) && effectiveOrder === 2 && nonImmuneEnemies.length >= 1) return 'target';
    if ((card.templateId === 'n_helio' || card.name.toLowerCase().includes('helio') || card.name.toLowerCase().includes('hélio')) && effectiveOrder === 1 && nonImmuneEnemies.length >= 1) return 'target';
    if ((card.templateId === 'g_salazar' || card.name.toLowerCase().includes('salazar')) && nonImmuneEnemies.length >= 2) return 'target';

    return null;
  };

  const triggerCardOnSummonEffects = (
    card: CardInstance,
    ownerId: 'player' | 'opponent',
    _isViaSkill: boolean = false,
    explicitBoard?: CardInstance[],
    summonOrder?: number
  ) => {
    const isPlayer = ownerId === 'player';
    const allySide: 'player' | 'opponent' = isPlayer ? 'player' : 'opponent';
    const enemySide: 'player' | 'opponent' = isPlayer ? 'opponent' : 'player';
    const activeState = isPlayer ? playerRef.current : opponentRef.current;
    const isInteractiveUser = !activeState.isAi;
    const setState = isPlayer ? setPlayer : setOpponent;

    // Dispara explosão visual de partículas quando a carta ativa seu poder único ao entrar
    if (card.exclusiveName || card.effectDescription) {
      triggerElementalBurst(card, 'power', isPlayer ? 'player' : 'opponent');
    }

    // Xury, o Fada - TIER 2 - Naneya (Elétrico):
    // "Toda unidade ELÉTRICA invocada na mesa aliada em toda partida soma +1 ao Poder de Xury."
    if (card.type === 'unit' && hasCardClass(card, 'Elétrico')) {
      setState((prev) => {
        const nextTotalElectric = (prev.totalElectricUnitsSummonedMatch || 0) + 1;
        const syncXury = (list: CardInstance[]) =>
          list.map((c) => {
            if (
              (c.templateId === 'n_xury' || c.name.toLowerCase().includes('xury')) &&
              c.silencedRounds === 0
            ) {
              const calcPower = (c.basePower ?? 12) + nextTotalElectric;
              return syncScaledPower(c, calcPower);
            }
            return c;
          });
        const hadXuryOnBoard = prev.board.some(
          (c) => (c.templateId === 'n_xury' || c.name.toLowerCase().includes('xury')) && c.silencedRounds === 0
        );
        if (hadXuryOnBoard) {
          addLog(
            `⚡🧚 [Xury, o Fada] Unidade Elétrica invocada (${card.name}): +1 de Poder para Xury (Total acumulado na partida: +${nextTotalElectric} Poder)!`,
            'spell'
          );
        }
        return {
          ...prev,
          totalElectricUnitsSummonedMatch: nextTotalElectric,
          board: syncXury(prev.board),
          hand: syncXury(prev.hand),
          deck: syncXury(prev.deck),
          graveyard: syncXury(prev.graveyard),
        };
      });
    }

    // PATCH 1.4 — Ambroz TIER 1 (Divino): Ao ser invocado recebe CRÍTICO por 1 rodada
    if (card.templateId === 'g_ambroz' || card.name.trim().toLowerCase() === 'ambroz') {
      card.conditions.add('critico');
      setCardConditionSource(card, 'critico', 'efeito_unico_proprio', card.name);
      card.criticoRoundsRemaining = 1;
      sound.playSpell();
      queueUnitVfx({
        type: 'ambroz_alvorada_crit',
        sourceId: card.instanceId,
        ownerSide: allySide,
      });
      addLog(`⚔️⚜️ [Ambroz] Foi invocado com CRÍTICO por 1 rodada!`, 'spell');
      setState((prev) => ({
        ...prev,
        board: prev.board.map((c) =>
          c.instanceId === card.instanceId
            ? {
                ...c,
                conditions: new Set(c.conditions).add('critico'),
                conditionSources: withConditionSource(c.conditionSources, 'critico', 'efeito_unico_proprio', card.name),
                criticoRoundsRemaining: 1,
              }
            : c
        ),
      }));
    }

    // PATCH 1.4 — Bia, a Fada TIER 1 (Divino): Ao ser invocada CAPTURA uma carta aleatória do baralho inimigo
    if (card.templateId === 'm_bia' || card.name.toLowerCase().includes('bia, a fada')) {
      const currentEnemy = isPlayer ? opponentRef.current : playerRef.current;
      if (currentEnemy.deck.length === 0) {
        addLog(`🧚⛓️ [Bia, a Fada] O baralho inimigo está vazio — nenhuma carta pôde ser capturada.`, 'info');
      } else {
        const randIdx = Math.floor(Math.random() * currentEnemy.deck.length);
        const capturedOrig = currentEnemy.deck[randIdx];
        const capturedCopy: CardInstance = {
          ...capturedOrig,
          conditions: new Set(capturedOrig.conditions),
          conditionSources: capturedOrig.conditionSources ? { ...capturedOrig.conditionSources } : undefined,
          extraElements: capturedOrig.extraElements ? [...capturedOrig.extraElements] : undefined,
        };
        const casterSide: 'player' | 'opponent' = isPlayer ? 'player' : 'opponent';
        const enemySideKey: 'player' | 'opponent' = isPlayer ? 'opponent' : 'player';
        const currentCaster = isPlayer ? playerRef.current : opponentRef.current;
        const isHandFull = currentCaster.hand.length >= 8;
        const sourceRect = getVisibleDomRect(`[data-deck-zone="${enemySideKey}"]`);
        const destRect = getVisibleDomRect(
          isHandFull ? `[data-graveyard="${casterSide}"]` : `[data-hand-zone="${casterSide}"]`
        );

        queueUnitVfx({
          type: 'bia_furto_feerico',
          sourceId: card.instanceId,
          ownerSide: allySide,
        });
        queueConditionVfx([
          {
            condition: 'capturar',
            targetSide: enemySideKey,
            targetUnitName: isPlayer ? capturedCopy.name : 'Carta do Baralho',
            captureData: {
              sourceSide: enemySideKey,
              destSide: casterSide,
              sourceKind: 'deck',
              sourceRect,
              destRect,
              isHandFull,
              isSubjugar: false,
              card: {
                name: capturedCopy.name,
                element: capturedCopy.element,
                tier: capturedCopy.tier,
                artUrl: resolveCardArtUrl(capturedCopy.templateId, capturedCopy.level === 2),
                hideFace: !isPlayer && !isTestingArena,
              },
            },
          },
        ]);

        const enemySetter = isPlayer ? setOpponent : setPlayer;
        enemySetter((prevEnemy) => ({
          ...prevEnemy,
          deck: prevEnemy.deck.filter((c) => c.instanceId !== capturedOrig.instanceId),
        }));
        if (isHandFull) {
          sound.playDiscard();
          setState((prev) => ({
            ...prev,
            graveyard: [...prev.graveyard, capturedCopy],
          }));
          addLog(
            `🧚⛓️ [CAPTURAR - Bia, a Fada] Capturou "${capturedCopy.name}" do baralho inimigo, mas a mão de ${currentCaster.name} está cheia (8/8) — carta enviada ao cemitério!`,
            'spell'
          );
        } else {
          setState((prev) => {
            if (prev.hand.length >= 8) {
              return { ...prev, graveyard: [...prev.graveyard, capturedCopy] };
            }
            return { ...prev, hand: [...prev.hand, capturedCopy] };
          });
          addLog(
            `🧚⛓️ [CAPTURAR - Bia, a Fada] ${currentCaster.name} capturou "${capturedCopy.name}" do baralho inimigo para sua mão!`,
            'spell'
          );
        }
      }
    }

    // PATCH 1.4 — Kamui TIER 3 (Divino): Ao ser invocado concede RETORNAR; se Divina, +10 Poder
    if (card.templateId === 'n_kamui' || card.name.trim().toLowerCase() === 'kamui') {
      queueUnitVfx({
        type: 'kamui_chamado_sagrado',
        sourceId: card.instanceId,
        ownerSide: allySide,
      });
      triggerRetornarFlow(ownerId, 10, card.name, null, 'Divino');
    }

    // Finn, o Fada - TIER 1 - Musmo (Telúrico):
    // "Ao ser invocado recebe FURTIVIDADE por 1 rodada. A PRIMEIRA VEZ que Finn atacar a vida do jogador inimigo aumenta +1 da vida máxima do jogador aliado."
    if (card.templateId === 'm_finn' || card.name.toLowerCase().includes('finn')) {
      card.conditions.add('furtividade');
      setCardConditionSource(card, 'furtividade', 'efeito_unico_proprio', card.name);
      sound.playSpell();
      addLog(`🧚🌿 [Finn, o Fada] Foi invocado sob FURTIVIDADE por 1 rodada!`, 'spell');
    }

    // Fafnyr - TIER 1 - Granty (Neutro):
    // "Ao ser invocado recebe ATAQUE-DUPLO por 1 rodada."
    if (card.templateId === 'g_fafnyr' || card.name.toLowerCase().includes('fafnyr')) {
      card.conditions.add('ataque_duplo');
      setCardConditionSource(card, 'ataque_duplo', 'efeito_unico_proprio', card.name);
      card.hasDoubleAttack = true;
      card.doubleAttackRoundsRemaining = 1;
      sound.playSpell();
      addLog(`⚔️ [Fafnyr] Foi invocado com ATAQUE-DUPLO por 1 rodada!`, 'spell');
    }

    // Bart - TIER 1 - Naneya (Elétrico):
    // "Ao ser invocado compre 1 carta, se ela for da classe ELÉTRICO, dê a ela +8 de Poder."
    if (card.templateId === 'n_bart' || card.name.toLowerCase() === 'bart') {
      setState((prev) => {
        if (prev.deck.length === 0) {
          addLog(`⚡ [Bart] O baralho está vazio, nenhuma carta pôde ser comprada.`, 'info');
          return prev;
        }
        const { card: drawn, remainingDeck } = drawCardCurve(prev.deck, round);
        if (!drawn) return prev;
        const drawnCopy: CardInstance = {
          ...drawn,
          conditions: new Set(drawn.conditions),
        };
        if (drawnCopy.element === 'Elétrico') {
          addPowerPoints(drawnCopy, 8);
          sound.playSpell();
          addLog(
            `⚡✨ [Bart] Comprou ${drawnCopy.name} e, por ser da classe ELÉTRICO, concedeu +8 de Poder a ela (Novo Poder: ${drawnCopy.power})!`,
            'spell'
          );
        } else {
          sound.playDraw();
          addLog(`⚡ [Bart] Comprou uma carta: ${drawnCopy.name}.`, 'spell');
        }
        setDrawingCardAnim({ card: drawnCopy, ownerId });
        return {
          ...prev,
          deck: remainingDeck,
          hand: [...prev.hand, drawnCopy],
        };
      });
      recordCardsDrawn(1);
    }

    // Mipo: +1 permanent Max HP (segmento ROXO especial)
    if (card.templateId === 'g_mipo') {
      setState((prev) => ({
        ...prev,
        maxHp: prev.maxHp + 1,
        hp: prev.hp + 1,
        purpleExtraHpSlots: (prev.purpleExtraHpSlots || 0) + 1,
      }));
      queueUnitVfx({
        type: 'mipo_purple_hp',
        sourceId: card.instanceId,
        targetPlayerSide: ownerId,
        ownerSide: allySide,
      });
      addLog(`${card.name} concedeu permanentemente +1 à Vida Máxima do líder (barra extra roxa)!`, 'spell');
    }

    // Mago Uhr: Ao ser invocado compra uma nova carta automaticamente
    if (card.templateId === 'g_uhr') {
      sound.playSpell();
      setState((prev) => {
        let nextDeck = prev.deck;
        let nextHand = prev.hand;
        if (prev.deck.length > 0) {
          const { card: autoDrawn, remainingDeck } = drawCardCurve(prev.deck, round);
          if (autoDrawn) {
            nextDeck = remainingDeck;
            nextHand = [...nextHand, autoDrawn];
            setDrawingCardAnim({ card: autoDrawn, ownerId });
            addLog(`🧙‍♂️ Mago Uhr foi invocado: comprou ${autoDrawn.name} automaticamente!`, 'spell');
          }
        } else {
          addLog(`🧙‍♂️ Mago Uhr foi invocado, mas o baralho está esgotado!`, 'info');
        }
        addLog(
          `🧙‍♂️ Efeito Mágico: Enquanto Mago Uhr permanecer vivo na mesa, ${
            isPlayer ? player.name : opponent.name
          } comprará 2 cartas automaticamente a cada nova rodada!`,
          'spell'
        );
        return {
          ...prev,
          deck: nextDeck,
          hand: nextHand,
        };
      });
    }

    // Rainha Liz: Aplica o efeito Cura a duas unidades à escolha por 2 rodadas (incluindo a si mesma)
    if (card.templateId === 'g_rainha_liz') {
      sound.playSpell();
      const currentBoard = explicitBoard || (isPlayer ? playerRef.current.board : opponentRef.current.board);
      const candidates = currentBoard.filter((c) => c.hp > 0);
      queueUnitVfx({
        type: 'rainha_liz_power_decree',
        sourceId: card.instanceId,
        targetIds: candidates.map((c) => c.instanceId),
        ownerSide: allySide,
      });
      
      const checkCharmagonBuff = (target: CardInstance) => {
        const isCharmagon =
          (target.templateId === 'n_charmagon' || target.templateId === 'm_charmagon' || target.name.toLowerCase().includes('charmagon')) &&
          target.silencedRounds === 0;
        if (isCharmagon) {
          target.atk += 3;
          target.baseAtk += 3;
          addPowerPoints(target, 3);
          addLog(`🐉 [Charmagon] Curado por Rainha Liz: +3 de Ataque e +3 de Poder (Atk: ${target.atk}, Poder: ${target.power})!`, 'spell');
        }
      };

      if (isInteractiveUser) {
        if (candidates.length <= 1) {
          card.conditions.add('cura');
          setCardConditionSource(card, 'cura', 'efeito_unico_proprio', card.name);
          card.curaTurnsRemaining = 2;
          card.hp = Math.min(card.maxHp, card.hp + 5);
          checkCharmagonBuff(card);
          addLog(`👑 Rainha Liz aplicou a condição Cura por 2 rodadas a si mesma!`, 'spell');
        } else {
          setTargetModal({
            isOpen: true,
            title: 'Rainha Liz - Decreto de Cura (1/2)',
            description: `Escolha a 1ª unidade de ${isPlayer ? player.name : opponent.name} para receber Cura por 2 rodadas (incluindo a própria Liz):`,
            candidates,
            onSelect: (firstTarget) => {
              const firstOriginKind = firstTarget.instanceId === card.instanceId ? 'efeito_unico_proprio' : 'unidade_compartilhada';
              firstTarget.conditions.add('cura');
              setCardConditionSource(firstTarget, 'cura', firstOriginKind, card.name);
              firstTarget.curaTurnsRemaining = 2;
              firstTarget.hp = Math.min(firstTarget.maxHp, firstTarget.hp + 5);
              checkCharmagonBuff(firstTarget);
              addLog(`👑 Rainha Liz concedeu a condição Cura por 2 rodadas para ${firstTarget.name}!`, 'spell');
              setTimeout(() => {
                setTargetModal({
                  isOpen: true,
                  title: 'Rainha Liz - Decreto de Cura (2/2)',
                  description: 'Escolha a 2ª unidade para receber a condição Cura por 2 rodadas:',
                  candidates,
                  onSelect: (secondTarget) => {
                    const secondOriginKind = secondTarget.instanceId === card.instanceId ? 'efeito_unico_proprio' : 'unidade_compartilhada';
                    secondTarget.conditions.add('cura');
                    setCardConditionSource(secondTarget, 'cura', secondOriginKind, card.name);
                    secondTarget.curaTurnsRemaining = 2;
                    secondTarget.hp = Math.min(secondTarget.maxHp, secondTarget.hp + 5);
                    checkCharmagonBuff(secondTarget);
                    addLog(`👑 Rainha Liz concedeu a condição Cura por 2 rodadas para ${secondTarget.name}!`, 'spell');
                    setTargetModal((prev) => ({ ...prev, isOpen: false }));
                    setState((prev) => ({
                      ...prev,
                      board: prev.board.map((c) => {
                        if (c.instanceId === firstTarget.instanceId) {
                          const conds = new Set(c.conditions);
                          conds.add('cura');
                          return {
                            ...c,
                            hp: firstTarget.hp,
                            maxHp: firstTarget.maxHp,
                            atk: firstTarget.atk,
                            baseAtk: firstTarget.baseAtk,
                            def: firstTarget.def,
                            baseDef: firstTarget.baseDef,
                            icePeakDefense: firstTarget.icePeakDefense,
                            icePowerDefGranted: firstTarget.icePowerDefGranted,
                            teluricoPowerHpGranted: firstTarget.teluricoPowerHpGranted,
                            teluricoPowerDefGranted: firstTarget.teluricoPowerDefGranted,
                            neutroPowerHpGranted: firstTarget.neutroPowerHpGranted,
                            neutroPowerAtkGranted: firstTarget.neutroPowerAtkGranted,
                            neutroPowerDefGranted: firstTarget.neutroPowerDefGranted,
                            power: firstTarget.power,
                            basePower: firstTarget.basePower,
                            peakPower: firstTarget.peakPower,
                            votoSilencioSavedPower: firstTarget.votoSilencioSavedPower,
                            curaTurnsRemaining: 2,
                            conditions: conds,
                            conditionSources: withConditionSource(c.conditionSources, 'cura', firstOriginKind, card.name),
                          };
                        }
                        if (c.instanceId === secondTarget.instanceId) {
                          const conds = new Set(c.conditions);
                          conds.add('cura');
                          return {
                            ...c,
                            hp: secondTarget.hp,
                            maxHp: secondTarget.maxHp,
                            atk: secondTarget.atk,
                            baseAtk: secondTarget.baseAtk,
                            def: secondTarget.def,
                            baseDef: secondTarget.baseDef,
                            icePeakDefense: secondTarget.icePeakDefense,
                            icePowerDefGranted: secondTarget.icePowerDefGranted,
                            teluricoPowerHpGranted: secondTarget.teluricoPowerHpGranted,
                            teluricoPowerDefGranted: secondTarget.teluricoPowerDefGranted,
                            neutroPowerHpGranted: secondTarget.neutroPowerHpGranted,
                            neutroPowerAtkGranted: secondTarget.neutroPowerAtkGranted,
                            neutroPowerDefGranted: secondTarget.neutroPowerDefGranted,
                            power: secondTarget.power,
                            basePower: secondTarget.basePower,
                            peakPower: secondTarget.peakPower,
                            votoSilencioSavedPower: secondTarget.votoSilencioSavedPower,
                            curaTurnsRemaining: 2,
                            conditions: conds,
                            conditionSources: withConditionSource(c.conditionSources, 'cura', secondOriginKind, card.name),
                          };
                        }
                        return c;
                      }),
                    }));
                    flushPendingSummonTargetTurn();
                  },
                });
              }, 200);
            },
          });
        }
      } else {
        const sorted = [...candidates].sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
        const t1 = sorted[0] || card;
        const t2 = sorted[1] || sorted[0] || card;
        t1.conditions.add('cura');
        setCardConditionSource(t1, 'cura', t1.instanceId === card.instanceId ? 'efeito_unico_proprio' : 'unidade_compartilhada', card.name);
        t1.curaTurnsRemaining = 2;
        t1.hp = Math.min(t1.maxHp, t1.hp + 5);
        checkCharmagonBuff(t1);
        if (t2 && t2 !== t1) {
          t2.conditions.add('cura');
          setCardConditionSource(t2, 'cura', t2.instanceId === card.instanceId ? 'efeito_unico_proprio' : 'unidade_compartilhada', card.name);
          t2.curaTurnsRemaining = 2;
          t2.hp = Math.min(t2.maxHp, t2.hp + 5);
          checkCharmagonBuff(t2);
        }
        addLog(`👑 Rainha Liz concedeu a condição Cura por 2 rodadas a 2 unidades aliadas!`, 'spell');
      }
    }

    // Gambeta: Ao ser invocado recebe CURA por 4 rodadas
    if (card.templateId === 'n_gambeta' || card.name.toLowerCase().includes('gambeta')) {
      card.conditions.add('cura');
      setCardConditionSource(card, 'cura', 'efeito_unico_proprio', card.name);
      card.curaTurnsRemaining = 4;
      sound.playSpell();
      addLog(`💚 [Gambeta] Foi invocado com a condição CURA por 4 rodadas!`, 'spell');
    }

    // Yuh: Ao ser invocado recebe CURA por 3 rodadas
    if (card.templateId === 'n_yuh' || card.name.toLowerCase() === 'yuh') {
      card.conditions.add('cura');
      setCardConditionSource(card, 'cura', 'efeito_unico_proprio', card.name);
      card.curaTurnsRemaining = 3;
      sound.playSpell();
      addLog(`💚 [Yuh] Foi invocado com a condição CURA por 3 rodadas!`, 'spell');
    }

    // Fernando: Ao ser invocado escolhe uma unidade ou si mesmo para receber +4 de Poder
    if (card.templateId === 'n_fernando') {
      const currentBoard = explicitBoard || (isPlayer ? playerRef.current.board : opponentRef.current.board);
      const candidates = currentBoard.filter((c) => c.hp > 0);
      if (isInteractiveUser && candidates.length > 0) {
        setTargetModal({
          isOpen: true,
          title: 'Fernando - Forja Flamejante',
          description: `Escolha uma unidade de ${isPlayer ? player.name : opponent.name} (ou Fernando) para receber +4 de Poder:`,
          candidates,
          onSelect: (target) => {
            addPowerPoints(target, 4);
            sound.playSpell();
            queueUnitVfx({
              type: 'fernando_ember',
              sourceId: card.instanceId,
              targetIds: [target.instanceId],
              ownerSide: allySide,
            });
            addLog(`🔥 Fernando concedeu +4 de Poder a ${target.name} (Novo Poder: ${target.power})!`, 'spell');
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            setState((prev) => ({
              ...prev,
              board: prev.board.map((c) =>
                c.instanceId === target.instanceId
                  ? {
                      ...c,
                      hp: target.hp,
                      maxHp: target.maxHp,
                      atk: target.atk,
                      baseAtk: target.baseAtk,
                      def: target.def,
                      baseDef: target.baseDef,
                      icePeakDefense: target.icePeakDefense,
                      icePowerDefGranted: target.icePowerDefGranted,
                      teluricoPowerHpGranted: target.teluricoPowerHpGranted,
                      teluricoPowerDefGranted: target.teluricoPowerDefGranted,
                      neutroPowerHpGranted: target.neutroPowerHpGranted,
                      neutroPowerAtkGranted: target.neutroPowerAtkGranted,
                      neutroPowerDefGranted: target.neutroPowerDefGranted,
                      power: target.power,
                      basePower: target.basePower,
                      peakPower: target.peakPower,
                      votoSilencioSavedPower: target.votoSilencioSavedPower,
                    }
                  : c
              ),
            }));
            flushPendingSummonTargetTurn();
          },
        });
      } else {
        const best = [...candidates].sort((a, b) => b.power - a.power)[0] || card;
        addPowerPoints(best, 4);
        sound.playSpell();
        queueUnitVfx({
          type: 'fernando_ember',
          sourceId: card.instanceId,
          targetIds: [best.instanceId],
          ownerSide: allySide,
        });
        addLog(`🔥 Fernando concedeu +4 de Poder a ${best.name}!`, 'spell');
        setState((prev) => ({
          ...prev,
          board: prev.board.map((c) =>
            c.instanceId === best.instanceId
              ? {
                  ...c,
                  hp: best.hp,
                  maxHp: best.maxHp,
                  atk: best.atk,
                  baseAtk: best.baseAtk,
                  def: best.def,
                  baseDef: best.baseDef,
                  icePeakDefense: best.icePeakDefense,
                  icePowerDefGranted: best.icePowerDefGranted,
                  teluricoPowerHpGranted: best.teluricoPowerHpGranted,
                  teluricoPowerDefGranted: best.teluricoPowerDefGranted,
                  neutroPowerHpGranted: best.neutroPowerHpGranted,
                  neutroPowerAtkGranted: best.neutroPowerAtkGranted,
                  neutroPowerDefGranted: best.neutroPowerDefGranted,
                  power: best.power,
                  basePower: best.basePower,
                  peakPower: best.peakPower,
                  votoSilencioSavedPower: best.votoSilencioSavedPower,
                }
              : c
          ),
        }));
      }
    }

    // Crisol: Ao ser invocado recebe ENFRENTAR
    if (card.templateId === 'n_crisol') {
      card.conditions.add('enfrentar');
      setCardConditionSource(card, 'enfrentar', 'efeito_unico_proprio', card.name);
      sound.playSpell();
      queueConditionVfx([
        {
          condition: 'enfrentar',
          targetUnitId: card.instanceId,
          targetUnitName: card.name,
          targetSide: isPlayer ? 'player' : 'opponent',
        },
      ]);
      addLog(`🗡️ [Crisol] Foi invocado e recebeu o efeito ENFRENTAR!`, 'spell');
    }

    // Pedrinha - TIER 1 (Telúrico):
    // "Pedrinha não pode ATACAR, apenas defender. Ao ser invocado recebe TENACIDADE permanentemente."
    if (card.templateId === 'n_pedrinha' || card.name.toLowerCase() === 'pedrinha') {
      card.conditions.add('tenacidade');
      setCardConditionSource(card, 'tenacidade', 'passiva_propria', card.name);
      sound.playSpell();
      queueConditionVfx([
        {
          condition: 'tenacidade',
          targetUnitId: card.instanceId,
          targetUnitName: card.name,
          targetSide: isPlayer ? 'player' : 'opponent',
        },
      ]);
      addLog(`🪨 [Pedrinha] Foi invocado com TENACIDADE permanente (não pode atacar, apenas defender)!`, 'spell');
    }

    // Celia, a Bruxa do Gelo - TIER 1 (Gelo):
    // "Imune a dano de GELO. Ao ser invocada compra uma carta se ela for da classe GELO, dê a ela +5 de poder."
    if (card.templateId === 'm_celia' || card.name.toLowerCase().includes('celia') || card.name.toLowerCase().includes('célia')) {
      setState((prev) => {
        if (prev.deck.length === 0) {
          addLog(`❄️ [Celia, a Bruxa do Gelo] O baralho está vazio, nenhuma carta pôde ser comprada.`, 'info');
          return prev;
        }
        const { card: drawn, remainingDeck } = drawCardCurve(prev.deck, round);
        if (!drawn) return prev;
        const drawnCopy: CardInstance = {
          ...drawn,
          conditions: new Set(drawn.conditions),
        };
        if (drawnCopy.element === 'Gelo') {
          addPowerPoints(drawnCopy, 5);
          sound.playSpell();
          addLog(
            `❄️✨ [Celia, a Bruxa do Gelo] Comprou ${drawnCopy.name} e, por ser da classe GELO, concedeu +5 de Poder a ela (Novo Poder: ${drawnCopy.power})!`,
            'spell'
          );
        } else {
          sound.playDraw();
          addLog(`❄️ [Celia, a Bruxa do Gelo] Comprou uma carta: ${drawnCopy.name}.`, 'spell');
        }
        setDrawingCardAnim({ card: drawnCopy, ownerId });
        return {
          ...prev,
          deck: remainingDeck,
          hand: [...prev.hand, drawnCopy],
        };
      });
      recordCardsDrawn(1);
    }

    // Guadan - TIER 3 - Granty (Água):
    // "Ao ser invocado selecione uma unidade inimiga para ser ATORDOADA por 1 rodada."
    if (card.templateId === 'g_guadan' || card.name.toLowerCase() === 'guadan') {
      const setOpposite = isPlayer ? setOpponent : setPlayer;
      const enemyBoard = isPlayer ? opponentRef.current.board : playerRef.current.board;
      const candidates = enemyBoard.filter((c) => c.hp > 0);
      if (candidates.length === 0) {
        addLog(`💧 [Guadan] Não há unidades inimigas na mesa para atordoar.`, 'info');
        flushPendingSummonTargetTurn();
      } else if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: 'Guadan - Maré Atordoante',
          description: 'Selecione uma unidade inimiga para ser ATORDOADA por 1 rodada:',
          candidates,
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            if (target.conditions.has('imunidade')) {
              sound.playDiscard();
              addLog(`🌟 [Imunidade] ${target.name} resistiu ao atordoamento de Guadan!`, 'info');
              flushPendingSummonTargetTurn();
              return;
            }
            target.conditions.add('atordoado');
            setCardConditionSource(target, 'atordoado', 'unidade_inimiga', card.name);
            sound.playSpell();
            addLog(`💧⚡ [Guadan] Atordoou ${target.name} por 1 rodada!`, 'spell');
            setOpposite((opp) => ({
              ...opp,
              board: opp.board.map((u) => {
                if (u.instanceId === target.instanceId) {
                  const conds = new Set(u.conditions);
                  conds.add('atordoado');
                  return {
                    ...u,
                    conditions: conds,
                    conditionSources: withConditionSource(u.conditionSources, 'atordoado', 'unidade_inimiga', card.name),
                  };
                }
                return u;
              }),
            }));
            flushPendingSummonTargetTurn();
          },
        });
      } else {
        const validEnemies = candidates.filter((c) => !c.conditions.has('imunidade'));
        const chosen = [...(validEnemies.length > 0 ? validEnemies : candidates)].sort((a, b) => (b.atk + b.power) - (a.atk + a.power))[0];
        if (chosen) {
          if (chosen.conditions.has('imunidade')) {
            addLog(`🌟 [Imunidade] ${chosen.name} resistiu ao atordoamento de Guadan!`, 'info');
          } else {
            chosen.conditions.add('atordoado');
            setCardConditionSource(chosen, 'atordoado', 'unidade_inimiga', card.name);
            sound.playSpell();
            addLog(`💧⚡ [Guadan] Atordoou ${chosen.name} por 1 rodada!`, 'spell');
            setOpposite((opp) => ({
              ...opp,
              board: opp.board.map((u) => {
                if (u.instanceId === chosen.instanceId) {
                  const conds = new Set(u.conditions);
                  conds.add('atordoado');
                  return {
                    ...u,
                    conditions: conds,
                    conditionSources: withConditionSource(u.conditionSources, 'atordoado', 'unidade_inimiga', card.name),
                  };
                }
                return u;
              }),
            }));
          }
        }
      }
    }

    // Aurora - TIER 3 - Granty (Gelo):
    // "Ao ser invocada selecione um aliado, ou si mesma, para receber BARREIRA. A barreira fica ativa até que seja quebrada."
    if (card.templateId === 'g_aurora' || card.name.toLowerCase() === 'aurora') {
      const currentBoard = explicitBoard || (isPlayer ? playerRef.current.board : opponentRef.current.board);
      const candidates = currentBoard.filter((c) => c.hp > 0);
      const allySide = isPlayer ? 'player' : 'opponent';
      if (isInteractiveUser && candidates.length > 0) {
        setTargetModal({
          isOpen: true,
          title: 'Aurora - Escudo Boreal',
          description: `Selecione um aliado de ${isPlayer ? player.name : opponent.name} (ou a própria Aurora) para receber BARREIRA DE GELO (ativa até ser quebrada):`,
          candidates,
          onSelect: (target) => {
            const originKind = target.instanceId === card.instanceId ? 'efeito_unico_proprio' : 'unidade_compartilhada';
            target.conditions.add('barreira');
            setCardConditionSource(target, 'barreira', originKind, card.name);
            target.barreiraRoundsRemaining = undefined;
            sound.playSpell();
            triggerSkillVfx('n_voto_estrelas', allySide, target.instanceId, target.name, true);
            addLog(`❄️🛡️ [Aurora] Concedeu BARREIRA DE GELO para ${target.name} (ativa até que seja quebrada)!`, 'spell');
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            setState((prev) => ({
              ...prev,
              board: prev.board.map((c) => {
                if (c.instanceId === target.instanceId) {
                  const conds = new Set(c.conditions);
                  conds.add('barreira');
                  return {
                    ...c,
                    conditions: conds,
                    conditionSources: withConditionSource(c.conditionSources, 'barreira', originKind, card.name),
                    barreiraRoundsRemaining: undefined,
                  };
                }
                return c;
              }),
            }));
            flushPendingSummonTargetTurn();
          },
        });
      } else if (candidates.length > 0) {
        const bestTarget = [...candidates].sort((a, b) => (b.atk + b.power) - (a.atk + a.power))[0] || card;
        const originKind = bestTarget.instanceId === card.instanceId ? 'efeito_unico_proprio' : 'unidade_compartilhada';
        bestTarget.conditions.add('barreira');
        setCardConditionSource(bestTarget, 'barreira', originKind, card.name);
        bestTarget.barreiraRoundsRemaining = undefined;
        sound.playSpell();
        triggerSkillVfx('n_voto_estrelas', allySide, bestTarget.instanceId, bestTarget.name, true);
        addLog(`❄️🛡️ [Aurora] Concedeu BARREIRA DE GELO para ${bestTarget.name} (ativa até que seja quebrada)!`, 'spell');
        setState((prev) => ({
          ...prev,
          board: prev.board.map((c) => {
            if (c.instanceId === bestTarget.instanceId) {
              const conds = new Set(c.conditions);
              conds.add('barreira');
              return {
                ...c,
                conditions: conds,
                conditionSources: withConditionSource(c.conditionSources, 'barreira', originKind, card.name),
                barreiraRoundsRemaining: undefined,
              };
            }
            return c;
          }),
        }));
      }
    }

    // Juci, a Dragoa - TIER 4 - Musmo (Gelo):
    // "Ao ser invocada recebe BRAVURA e bafora uma tempestade de gelo em todos os inimigos causando 9 de dano e aplicando CONGELAR."
    if (card.templateId === 'm_juci' || card.name.toLowerCase().includes('juci')) {
      card.conditions.add('bravura');
      setCardConditionSource(card, 'bravura', 'efeito_unico_proprio', card.name);
      sound.playSpell();
      addLog(`🐉❄️ [Juci, a Dragoa] Entrou em campo com BRAVURA e baforou uma tempestade de gelo em todos os inimigos!`, 'spell');

      const enemySetter = isPlayer ? setOpponent : setPlayer;
      const currentEnemies = (isPlayer ? opponentRef.current.board : playerRef.current.board).filter((c) => c.hp > 0);
      if (currentEnemies.length > 0) {
        queueUnitVfx({
          type: 'juci_dragon_breath',
          sourceId: card.instanceId,
          targetIds: currentEnemies.map((c) => c.instanceId),
          ownerSide: allySide,
        });
      }
      let killedCount = 0;
      const freezeBatch: Array<Omit<ConditionVfxEvent, 'id'>> = [];
      const killedJuciIds: string[] = [];
      enemySetter((prevEnemy) => {
        const surviving: CardInstance[] = [];
        const newlyDead: CardInstance[] = [];

        prevEnemy.board.forEach((u) => {
          const isCeliaImmune =
            (u.templateId === 'm_celia' || u.name.toLowerCase().includes('celia')) &&
            u.silencedRounds === 0;
          const isSolImmortal =
            (u.templateId === 'n_o_sol' || u.name.trim().toLowerCase().startsWith('o sol')) &&
            u.level === 2;

          if (u.conditions.has('imunidade') || isCeliaImmune || isSolImmortal) {
            surviving.push(u);
            if (isCeliaImmune) {
              addLog(`❄️🛡️ [Celia] Imune a dano de GELO: resistiu à tempestade de gelo de Juci!`, 'info');
            }
            return;
          }

          if (u.conditions.has('barreira')) {
            u.conditions.delete('barreira');
            removeCardConditionSource(u, 'barreira');
            addLog(`🛡️ [Barreira Quebrada] A barreira de ${u.name} absorveu a tempestade de gelo de Juci!`, 'spell');
          } else {
            let dmg = 9;
            if (u.conditions.has('congelado')) dmg = Math.round(dmg * 1.5);
            if (u.conditions.has('tenacidade')) dmg = Math.max(0, Math.round(dmg * 0.65));
            if (u.def >= dmg) {
              u.def -= dmg;
            } else {
              const rem = dmg - u.def;
              u.def = 0;
              u.hp = Math.max(0, u.hp - rem);
            }
            if (u.element === 'Cósmico' || u.sapience != null) {
              u.sapience = u.hp;
            }
          }

          u.conditions.add('congelado');
          setCardConditionSource(u, 'congelado', 'unidade_inimiga', card.name);
          u.freezeRoundsRemaining = Math.max(u.freezeRoundsRemaining || 0, 2);
          freezeBatch.push({ condition: 'congelado', targetUnitId: u.instanceId, targetUnitName: u.name, targetSide: enemySide });

          if (u.hp <= 0) {
            newlyDead.push(u);
            killedJuciIds.push(u.instanceId);
            killedCount += 1;
            addLog(`❄️💀 ${u.name} foi congelado e destruído pela tempestade de gelo de Juci!`, 'kill');
          } else {
            surviving.push(u);
            addLog(`❄️ ${u.name} recebeu a tempestade de gelo de Juci (9 de dano e Congelado)!`, 'spell');
          }
        });

        if (freezeBatch.length > 0) queueConditionVfx(freezeBatch);
        if (killedCount > 0) {
          triggerPhilioEliminationBonus(allySide, killedCount, killedJuciIds);
        }

        return {
          ...prevEnemy,
          board: surviving,
          graveyard: [...prevEnemy.graveyard, ...newlyDead],
        };
      });
    }

    // Vanusa: Ao ser invocada, se houver outra unidade de ÁGUA ativa Revelar
    if (card.templateId === 'n_vanusa') {
      const currentBoard = explicitBoard || (isPlayer ? playerRef.current.board : opponentRef.current.board);
      const hasOtherWater = currentBoard.some((c) => c.element === 'Água' && c.instanceId !== card.instanceId && c.hp > 0);
      if (hasOtherWater) {
        sound.playSpell();
        queueUnitVfx({
          type: 'vanusa_reveal',
          sourceId: card.instanceId,
          ownerSide: allySide,
        });
        addLog(`💧 Vanusa ativou REVELAR (sinergia com unidade de Água em campo)!`, 'spell');
        if (isInteractiveUser) {
          setTimeout(() => triggerInteractiveReveal(ownerId), 120);
        } else {
          triggerAiReveal();
        }
      }
    }

    // Cristalys: Ao ser invocada cura 6 de vida de um aliado a escolha (apenas vida)
    if (card.templateId === 'n_cristalys') {
      const currentBoard = explicitBoard || (isPlayer ? playerRef.current.board : opponentRef.current.board);
      const candidates = currentBoard.filter((c) => c.hp > 0);
      if (isInteractiveUser && candidates.length > 0) {
        setTargetModal({
          isOpen: true,
          title: 'Cristalys, a Fada - Orvalho Sagrado',
          description: `Escolha uma unidade aliada de ${isPlayer ? player.name : opponent.name} para restaurar 6 de Vida:`,
          candidates,
          onSelect: (target) => {
            if (hasCorrosao(target)) {
              sound.playSpell();
              addLog(`🧪🚫 [Corrosão] ${target.name} está sob efeito de Corrosão e teve toda a cura de Cristalys cortada!`, 'info');
              setTargetModal((prev) => ({ ...prev, isOpen: false }));
              flushPendingSummonTargetTurn();
              return;
            }
            target.hp = Math.min(target.maxHp, target.hp + 6);
            sound.playSpell();
            queueUnitVfx({
              type: 'cristalys_aqua_heal',
              sourceId: card.instanceId,
              targetIds: [target.instanceId],
              ownerSide: allySide,
            });
            queueConditionVfx([
              {
                condition: 'cura',
                targetUnitId: target.instanceId,
                targetUnitName: target.name,
                targetSide: allySide,
              },
            ]);
            addLog(`💧 Cristalys, a Fada restaurou 6 de Vida de ${target.name} (Vida: ${target.hp}/${target.maxHp})!`, 'spell');
            const isCharmagon =
              (target.templateId === 'n_charmagon' || target.templateId === 'm_charmagon' || target.name.toLowerCase().includes('charmagon')) &&
              target.silencedRounds === 0;
            if (isCharmagon) {
              target.atk += 3;
              target.baseAtk += 3;
              addPowerPoints(target, 3);
              addLog(`🐉 [Charmagon] Recebeu Cura de Cristalys, a Fada e ganhou +3 de Ataque e +3 de Poder (Atk: ${target.atk}, Poder: ${target.power})!`, 'spell');
            }
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            setState((prev) => ({
              ...prev,
              board: prev.board.map((c) =>
                c.instanceId === target.instanceId
                  ? {
                      ...c,
                      hp: target.hp,
                      maxHp: target.maxHp,
                      atk: target.atk,
                      baseAtk: target.baseAtk,
                      def: target.def,
                      baseDef: target.baseDef,
                      icePeakDefense: target.icePeakDefense,
                      icePowerDefGranted: target.icePowerDefGranted,
                      teluricoPowerHpGranted: target.teluricoPowerHpGranted,
                      teluricoPowerDefGranted: target.teluricoPowerDefGranted,
                      neutroPowerHpGranted: target.neutroPowerHpGranted,
                      neutroPowerAtkGranted: target.neutroPowerAtkGranted,
                      neutroPowerDefGranted: target.neutroPowerDefGranted,
                      power: target.power,
                      basePower: target.basePower,
                      peakPower: target.peakPower,
                      votoSilencioSavedPower: target.votoSilencioSavedPower,
                    }
                  : c
              ),
            }));
            flushPendingSummonTargetTurn();
          },
        });
      } else {
        const lowest = [...candidates].sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0] || card;
        if (hasCorrosao(lowest)) {
          addLog(`🧪🚫 [Corrosão] ${lowest.name} está sob efeito de Corrosão e teve toda a cura de Cristalys cortada!`, 'info');
        } else {
          lowest.hp = Math.min(lowest.maxHp, lowest.hp + 6);
          sound.playSpell();
          queueUnitVfx({
            type: 'cristalys_aqua_heal',
            sourceId: card.instanceId,
            targetIds: [lowest.instanceId],
            ownerSide: allySide,
          });
          addLog(`💧 Cristalys, a Fada restaurou 6 de Vida de ${lowest.name}!`, 'spell');
          const isCharmagon =
            (lowest.templateId === 'n_charmagon' || lowest.templateId === 'm_charmagon' || lowest.name.toLowerCase().includes('charmagon')) &&
            lowest.silencedRounds === 0;
          if (isCharmagon) {
            lowest.atk += 3;
            lowest.baseAtk += 3;
            addPowerPoints(lowest, 3);
            addLog(`🐉 [Charmagon] Recebeu Cura de Cristalys, a Fada e ganhou +3 de Ataque e +3 de Poder!`, 'spell');
          }
        }
        setState((prev) => ({
          ...prev,
          board: prev.board.map((c) =>
            c.instanceId === lowest.instanceId
              ? {
                  ...c,
                  hp: lowest.hp,
                  maxHp: lowest.maxHp,
                  atk: lowest.atk,
                  baseAtk: lowest.baseAtk,
                  def: lowest.def,
                  baseDef: lowest.baseDef,
                  icePeakDefense: lowest.icePeakDefense,
                  icePowerDefGranted: lowest.icePowerDefGranted,
                  teluricoPowerHpGranted: lowest.teluricoPowerHpGranted,
                  teluricoPowerDefGranted: lowest.teluricoPowerDefGranted,
                  neutroPowerHpGranted: lowest.neutroPowerHpGranted,
                  neutroPowerAtkGranted: lowest.neutroPowerAtkGranted,
                  neutroPowerDefGranted: lowest.neutroPowerDefGranted,
                  power: lowest.power,
                  basePower: lowest.basePower,
                  peakPower: lowest.peakPower,
                  votoSilencioSavedPower: lowest.votoSilencioSavedPower,
                }
              : c
          ),
        }));
      }
    }

    // Jasmim: Ao ser invocada recebe ENFRENTAR se houver unidade de FOGO na mesa inimiga
    if (card.templateId === 'm_jasmim') {
      const enemyBoard = isPlayer ? opponentRef.current.board : playerRef.current.board;
      const hasFireEnemy = enemyBoard.some((c) => c.element === 'Fogo' && c.hp > 0);
      if (hasFireEnemy) {
        card.conditions.add('enfrentar');
        setCardConditionSource(card, 'enfrentar', 'efeito_unico_proprio', card.name);
        sound.playSpell();
        queueConditionVfx([
          {
            condition: 'enfrentar',
            targetUnitId: card.instanceId,
            targetUnitName: card.name,
            targetSide: allySide,
          },
        ]);
        addLog(`🗡️ [Jasmim] Detectou unidades de Fogo inimigas e recebeu o efeito ENFRENTAR!`, 'spell');
      }
    }

    // Sacerdote Daniel: Ao ser invocado recebe Roubo de Vida
    if (card.templateId === 'g_daniel' || card.name.toLowerCase().includes('daniel')) {
      card.conditions.add('roubo_de_vida');
      setCardConditionSource(card, 'roubo_de_vida', 'passiva_propria', card.name);
      card.hasLifeSteal = true;
      sound.playSpell();
      addLog(`✨ Sacerdote Daniel foi invocado com ROUBO DE VIDA!`, 'spell');
    }

    // Mara: Efeito único: Ao ser invocada selecione uma carta, ou si mesma, para receber +6 de Poder.
    if (card.templateId === 'm_mara' || card.name.toLowerCase() === 'mara') {
      const currentBoard = explicitBoard || (isPlayer ? playerRef.current.board : opponentRef.current.board);
      const candidates = currentBoard.filter((c) => c.hp > 0);
      if (isInteractiveUser && candidates.length > 0) {
        setTargetModal({
          isOpen: true,
          title: 'Mara - Infusão Arcana',
          description: `Selecione uma unidade de ${isPlayer ? player.name : opponent.name} (ou a própria Mara) para receber +6 de Poder:`,
          candidates,
          onSelect: (target) => {
            addPowerPoints(target, 6);
            sound.playSpell();
            queueUnitVfx({
              type: 'mara_potion_power',
              sourceId: card.instanceId,
              targetIds: [target.instanceId],
              ownerSide: allySide,
            });
            addLog(`⚡ Mara ativou seu Efeito Único em ${target.name}: Concedeu +6 de Poder (Novo Poder: ${target.power})!`, 'spell');
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            setState((prev) => ({
              ...prev,
              board: prev.board.map((c) =>
                c.instanceId === target.instanceId
                  ? {
                      ...c,
                      hp: target.hp,
                      maxHp: target.maxHp,
                      atk: target.atk,
                      baseAtk: target.baseAtk,
                      def: target.def,
                      baseDef: target.baseDef,
                      icePeakDefense: target.icePeakDefense,
                      icePowerDefGranted: target.icePowerDefGranted,
                      teluricoPowerHpGranted: target.teluricoPowerHpGranted,
                      teluricoPowerDefGranted: target.teluricoPowerDefGranted,
                      neutroPowerHpGranted: target.neutroPowerHpGranted,
                      neutroPowerAtkGranted: target.neutroPowerAtkGranted,
                      neutroPowerDefGranted: target.neutroPowerDefGranted,
                      power: target.power,
                      basePower: target.basePower,
                      peakPower: target.peakPower,
                      votoSilencioSavedPower: target.votoSilencioSavedPower,
                    }
                  : c
              ),
            }));
            flushPendingSummonTargetTurn();
          },
        });
      } else {
        const bestTarget = [...candidates].sort((a, b) => (b.atk + b.power) - (a.atk + a.power))[0] || card;
        addPowerPoints(bestTarget, 6);
        sound.playSpell();
        queueUnitVfx({
          type: 'mara_potion_power',
          sourceId: card.instanceId,
          targetIds: [bestTarget.instanceId],
          ownerSide: allySide,
        });
        addLog(`⚡ Mara concedeu +6 de Poder para ${bestTarget.name} (Novo Poder: ${bestTarget.power})!`, 'spell');
        setState((prev) => ({
          ...prev,
          board: prev.board.map((c) =>
            c.instanceId === bestTarget.instanceId
              ? {
                  ...c,
                  hp: bestTarget.hp,
                  maxHp: bestTarget.maxHp,
                  atk: bestTarget.atk,
                  baseAtk: bestTarget.baseAtk,
                  def: bestTarget.def,
                  baseDef: bestTarget.baseDef,
                  icePeakDefense: bestTarget.icePeakDefense,
                  icePowerDefGranted: bestTarget.icePowerDefGranted,
                  teluricoPowerHpGranted: bestTarget.teluricoPowerHpGranted,
                  teluricoPowerDefGranted: bestTarget.teluricoPowerDefGranted,
                  neutroPowerHpGranted: bestTarget.neutroPowerHpGranted,
                  neutroPowerAtkGranted: bestTarget.neutroPowerAtkGranted,
                  neutroPowerDefGranted: bestTarget.neutroPowerDefGranted,
                  power: bestTarget.power,
                  basePower: bestTarget.basePower,
                  peakPower: bestTarget.peakPower,
                  votoSilencioSavedPower: bestTarget.votoSilencioSavedPower,
                }
              : c
          ),
        }));
      }
    }

    // Krust, o Feiticeiro - TIER 4 (Água):
    // "Ao ser invocado RETORNE uma carta da sua cripta, se ela for da classe ÁGUA, dê a ela +14 de Poder. Além disso Krust cura 1 da vida do jogador a cada 2 rodadas."
    if (card.templateId === 'm_krust' || card.name.toLowerCase().includes('krust')) {
      const activeGraveyard = isPlayer ? playerRef.current.graveyard : opponentRef.current.graveyard;
      if (activeGraveyard.length > 0) {
        queueUnitVfx({
          type: 'krust_crypt_reopen',
          sourceId: card.instanceId,
          ownerSide: allySide,
        });
      }
      triggerRetornarFlow(ownerId, 14, card.name, null, 'Água');
    }

    // Glauco TIER 1: Ao ser invocado escolha uma unidade ou si mesmo para receber +4 de Defesa
    if (card.templateId === 'g_glauco' || card.name.toLowerCase().includes('glauco')) {
      const currentBoard = explicitBoard || (isPlayer ? playerRef.current.board : opponentRef.current.board);
      const candidates = currentBoard.filter((c) => c.hp > 0);
      if (isInteractiveUser && candidates.length > 0) {
        setTargetModal({
          isOpen: true,
          title: 'Glauco - Baluarte Glacial',
          description: `Selecione uma unidade aliada (ou o próprio Glauco) para receber +4 de Defesa:`,
          candidates,
          onSelect: (target) => {
            addDefensePoints(target, 4);
            sound.playSpell();
            queueUnitVfx({
              type: 'glauco_snowflake_def',
              sourceId: card.instanceId,
              targetIds: [target.instanceId],
              ownerSide: allySide,
            });
            addLog(`❄️ Glauco concedeu +4 de Defesa para ${target.name} (Nova Defesa: ${target.def})!`, 'spell');
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            setState((prev) => ({
              ...prev,
              board: prev.board.map((c) =>
                c.instanceId === target.instanceId
                  ? { ...c, def: target.def, baseDef: target.baseDef, icePeakDefense: target.icePeakDefense }
                  : c
              ),
            }));
            flushPendingSummonTargetTurn();
          },
        });
      } else {
        const bestTarget = [...candidates].sort((a, b) => (a.hp + a.def) - (b.hp + b.def))[0] || card;
        addDefensePoints(bestTarget, 4);
        sound.playSpell();
        queueUnitVfx({
          type: 'glauco_snowflake_def',
          sourceId: card.instanceId,
          targetIds: [bestTarget.instanceId],
          ownerSide: allySide,
        });
        addLog(`❄️ Glauco concedeu +4 de Defesa para ${bestTarget.name} (Nova Defesa: ${bestTarget.def})!`, 'spell');
        setState((prev) => ({
          ...prev,
          board: prev.board.map((c) =>
            c.instanceId === bestTarget.instanceId
              ? { ...c, def: bestTarget.def, baseDef: bestTarget.baseDef, icePeakDefense: bestTarget.icePeakDefense }
              : c
          ),
        }));
      }
    }

    // Bonetrus TIER 5: Ao ser invocado congela todos os inimigos por 1 rodada
    if (card.templateId === 'm_bonetrus' || card.name.toLowerCase().includes('bonetrus')) {
      const setOpposite = isPlayer ? setOpponent : setPlayer;
      const currentEnemies = (isPlayer ? opponentRef.current.board : playerRef.current.board).filter((c) => c.hp > 0);
      sound.playSpell();
      if (currentEnemies.length > 0) {
        queueUnitVfx({
          type: 'bonetrus_frost_fog',
          sourceId: card.instanceId,
          targetIds: currentEnemies.map((c) => c.instanceId),
          ownerSide: allySide,
        });
      }
      addLog(`❄️💀 [Bonetrus] Uma nevasca glacial congelou TODAS as unidades inimigas por 1 rodada!`, 'spell');
      setOpposite((opp) => {
        const freezeBatch: Array<Omit<ConditionVfxEvent, 'id'>> = [];
        const nextBoard = opp.board.map((u) => {
          if (u.conditions.has('imunidade')) return u;
          const nextConds = new Set(u.conditions);
          nextConds.add('congelado');
          freezeBatch.push({ condition: 'congelado', targetUnitId: u.instanceId, targetUnitName: u.name, targetSide: enemySide });
          return {
            ...u,
            conditions: nextConds,
            conditionSources: withConditionSource(u.conditionSources, 'congelado', 'unidade_inimiga', card.name),
            freezeRoundsRemaining: Math.max(u.freezeRoundsRemaining || 0, 1),
          };
        });
        if (freezeBatch.length > 0) queueConditionVfx(freezeBatch);
        return { ...opp, board: nextBoard };
      });
    }

    // Crizelia TIER 3: Ao ser invocada recebe FURTIVIDADE. Além disso escolha um aliado, ou si mesmo, para receber Imunidade por 2 rodadas.
    if (card.templateId === 'm_crizelia' || card.templateId === 'n_crizelia' || card.name.toLowerCase().includes('crizelia')) {
      card.conditions.add('furtividade');
      setCardConditionSource(card, 'furtividade', 'efeito_unico_proprio', card.name);
      sound.playSpell();
      addLog(`❄️👤 [Crizelia] Entrou em campo sob FURTIVIDADE!`, 'spell');

      const currentBoard = explicitBoard || (isPlayer ? playerRef.current.board : opponentRef.current.board);
      const candidates = currentBoard.filter((c) => c.hp > 0);
      if (isInteractiveUser && candidates.length > 0) {
        setTargetModal({
          isOpen: true,
          title: 'Crizelia - Geleira Inviolável',
          description: 'Selecione uma unidade aliada (ou a própria Crizelia) para receber IMUNIDADE por 2 rodadas:',
          candidates,
          onSelect: (target) => {
            const originKind = target.instanceId === card.instanceId ? 'efeito_unico_proprio' : 'unidade_compartilhada';
            target.conditions.add('imunidade');
            setCardConditionSource(target, 'imunidade', originKind, card.name);
            target.immunedRounds = 2;
            sound.playSpell();
            addLog(`❄️🌟 [Crizelia] Concedeu IMUNIDADE por 2 rodadas para ${target.name}!`, 'spell');
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            setState((prev) => ({
              ...prev,
              board: prev.board.map((c) => {
                if (c.instanceId === target.instanceId) {
                  const conds = new Set(c.conditions);
                  conds.add('imunidade');
                  return {
                    ...c,
                    conditions: conds,
                    conditionSources: withConditionSource(c.conditionSources, 'imunidade', originKind, card.name),
                    immunedRounds: 2,
                  };
                }
                return c;
              }),
            }));
            flushPendingSummonTargetTurn();
          },
        });
      } else if (candidates.length > 0) {
        const bestTarget = [...candidates].sort((a, b) => (b.atk + b.def) - (a.atk + a.def))[0] || card;
        const originKind = bestTarget.instanceId === card.instanceId ? 'efeito_unico_proprio' : 'unidade_compartilhada';
        bestTarget.conditions.add('imunidade');
        setCardConditionSource(bestTarget, 'imunidade', originKind, card.name);
        bestTarget.immunedRounds = 2;
        sound.playSpell();
        addLog(`❄️🌟 [Crizelia] Concedeu IMUNIDADE por 2 rodadas para ${bestTarget.name}!`, 'spell');
        setState((prev) => ({
          ...prev,
          board: prev.board.map((c) => {
            if (c.instanceId === bestTarget.instanceId) {
              const conds = new Set(c.conditions);
              conds.add('imunidade');
              return {
                ...c,
                conditions: conds,
                conditionSources: withConditionSource(c.conditionSources, 'imunidade', originKind, card.name),
                immunedRounds: 2,
              };
            }
            return c;
          }),
        }));
      }
    }

    // Pólus, o Arcanjo TIER 4: Ao ser invocado recebe CRÍTICO. Passiva: Aliança Angiris
    if (card.templateId === 'n_polus' || card.name.toLowerCase().includes('polus') || card.name.toLowerCase().includes('pólus')) {
      card.conditions.add('critico');
      setCardConditionSource(card, 'critico', 'efeito_unico_proprio', card.name);
      card.isArchangel = true;
      sound.playSpell();
      queueUnitVfx({
        type: 'polus_golpe_penetrante',
        sourceId: card.instanceId,
        ownerSide: allySide,
      });
      addLog(`❄️🎯 [Pólus, o Arcanjo] Empunhou o Golpe Penetrante e recebeu CRÍTICO!`, 'spell');
    }

    // Caspiem: Efeito Mágico - Concede Furtivo a uma unidade ou a si mesmo. Recebe ENFRENTAR.
    if (card.templateId === 'm_caspiem') {
      card.conditions.add('enfrentar');
      setCardConditionSource(card, 'enfrentar', 'efeito_unico_proprio', card.name);
      queueConditionVfx([
        {
          condition: 'enfrentar',
          targetUnitId: card.instanceId,
          targetUnitName: card.name,
          targetSide: isPlayer ? 'player' : 'opponent',
        },
      ]);
      const currentBoard = explicitBoard || (isPlayer ? playerRef.current.board : opponentRef.current.board);
      const candidates = currentBoard.filter((c) => c.hp > 0);
      if (isInteractiveUser && candidates.length > 0) {
        setTargetModal({
          isOpen: true,
          title: 'Caspiem - Manto das Sombras',
          description: `Caspiem recebeu ENFRENTAR. Escolha uma unidade de ${isPlayer ? player.name : opponent.name} para conceder Furtivo (ou selecione Caspiem):`,
          candidates,
          onSelect: (target) => {
            const originKind = target.instanceId === card.instanceId ? 'efeito_unico_proprio' : 'unidade_compartilhada';
            target.conditions.add('furtividade');
            setCardConditionSource(target, 'furtividade', originKind, card.name);
            sound.playSpell();
            addLog(`👤 Caspiem concedeu a condição Furtivo a ${target.name} e recebeu Enfrentar!`, 'spell');
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            setState((prev) => ({
              ...prev,
              board: prev.board.map((c) => {
                if (c.instanceId === target.instanceId) {
                  const conds = new Set(c.conditions);
                  conds.add('furtividade');
                  return {
                    ...c,
                    conditions: conds,
                    conditionSources: withConditionSource(c.conditionSources, 'furtividade', originKind, card.name),
                  };
                }
                return c;
              }),
            }));
            flushPendingSummonTargetTurn();
          },
        });
      } else {
        card.conditions.add('furtividade');
        setCardConditionSource(card, 'furtividade', 'efeito_unico_proprio', card.name);
        sound.playSpell();
        addLog(`👤 Caspiem recebeu a condição Furtivo e Enfrentar!`, 'spell');
      }
    }

    // Mesmerino: Efeito Mágico - Dobra o Poder de uma unidade aliada 1x, mas reduz sua Vida Máxima em 40%
    if (card.templateId === 'n_mesmerino') {
      const currentBoard = explicitBoard || (isPlayer ? playerRef.current.board : opponentRef.current.board);
      const candidates = currentBoard.filter((c) => c.hp > 0);
      if (isInteractiveUser && candidates.length > 0) {
        setTargetModal({
          isOpen: true,
          title: 'Mesmerino - Amplificação Mágica',
          description: `Escolha uma unidade de ${isPlayer ? player.name : opponent.name} para DOBRAR o Poder (1x) e reduzir sua Vida Máxima em 40% (mantendo 60%):`,
          candidates,
          onSelect: (target) => {
            const origPower = target.votoSilencioSavedPower ?? target.power;
            target.doublePower = false;
            addPowerPoints(target, origPower);
            const newPower = target.votoSilencioSavedPower ?? target.power;
            const newMaxHp = Math.max(1, Math.round(target.maxHp * 0.6));
            const newHp = Math.min(newMaxHp, Math.max(1, Math.round(target.hp * 0.6)));
            target.maxHp = newMaxHp;
            target.hp = newHp;
            if (target.sapience != null) target.sapience = newHp;
            sound.playSpell();
            queueUnitVfx({
              type: 'mesmerino_mirror',
              sourceId: card.instanceId,
              targetIds: [target.instanceId],
              ownerSide: allySide,
            });
            addLog(`🪞⚡ Mesmerino dobrou o Poder de ${target.name} (${origPower} -> ${newPower}) e reduziu sua Vida Máxima em 40% (${newHp}/${newMaxHp})!`, 'spell');
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            setState((prev) => ({
              ...prev,
              board: prev.board.map((c) => {
                if (c.instanceId === target.instanceId) {
                  return {
                    ...c,
                    doublePower: false,
                    power: target.power,
                    basePower: target.basePower,
                    peakPower: target.peakPower,
                    votoSilencioSavedPower: target.votoSilencioSavedPower,
                    def: target.def,
                    baseDef: target.baseDef,
                    atk: target.atk,
                    baseAtk: target.baseAtk,
                    icePeakDefense: target.icePeakDefense,
                    icePowerDefGranted: target.icePowerDefGranted,
                    teluricoPowerHpGranted: target.teluricoPowerHpGranted,
                    teluricoPowerDefGranted: target.teluricoPowerDefGranted,
                    neutroPowerHpGranted: target.neutroPowerHpGranted,
                    neutroPowerAtkGranted: target.neutroPowerAtkGranted,
                    neutroPowerDefGranted: target.neutroPowerDefGranted,
                    maxHp: newMaxHp,
                    hp: newHp,
                    ...(c.sapience != null ? { sapience: newHp } : {}),
                  };
                }
                return c;
              }),
            }));
            flushPendingSummonTargetTurn();
          },
        });
      } else {
        const bestTarget = [...candidates].sort((a, b) => b.power - a.power)[0] || card;
        const origPower = bestTarget.votoSilencioSavedPower ?? bestTarget.power;
        bestTarget.doublePower = false;
        addPowerPoints(bestTarget, origPower);
        const newPower = bestTarget.votoSilencioSavedPower ?? bestTarget.power;
        const newMaxHp = Math.max(1, Math.round(bestTarget.maxHp * 0.6));
        const newHp = Math.min(newMaxHp, Math.max(1, Math.round(bestTarget.hp * 0.6)));
        bestTarget.maxHp = newMaxHp;
        bestTarget.hp = newHp;
        if (bestTarget.sapience != null) bestTarget.sapience = newHp;
        sound.playSpell();
        queueUnitVfx({
          type: 'mesmerino_mirror',
          sourceId: card.instanceId,
          targetIds: [bestTarget.instanceId],
          ownerSide: allySide,
        });
        addLog(`🪞⚡ Mesmerino dobrou o Poder de ${bestTarget.name} (${origPower} -> ${newPower}) e reduziu sua Vida Máxima em 40% (${newHp}/${newMaxHp})!`, 'spell');
        setState((prev) => ({
          ...prev,
          board: prev.board.map((c) => {
            if (c.instanceId === bestTarget.instanceId) {
              return {
                ...c,
                doublePower: false,
                power: bestTarget.power,
                basePower: bestTarget.basePower,
                peakPower: bestTarget.peakPower,
                votoSilencioSavedPower: bestTarget.votoSilencioSavedPower,
                def: bestTarget.def,
                baseDef: bestTarget.baseDef,
                atk: bestTarget.atk,
                baseAtk: bestTarget.baseAtk,
                icePeakDefense: bestTarget.icePeakDefense,
                icePowerDefGranted: bestTarget.icePowerDefGranted,
                teluricoPowerHpGranted: bestTarget.teluricoPowerHpGranted,
                teluricoPowerDefGranted: bestTarget.teluricoPowerDefGranted,
                neutroPowerHpGranted: bestTarget.neutroPowerHpGranted,
                neutroPowerAtkGranted: bestTarget.neutroPowerAtkGranted,
                neutroPowerDefGranted: bestTarget.neutroPowerDefGranted,
                maxHp: newMaxHp,
                hp: newHp,
                ...(c.sapience != null ? { sapience: newHp } : {}),
              };
            }
            return c;
          }),
        }));
      }
    }

    // Ilio, o Colosso: Rework
    // Ao ser invocado, Ilio dorme por 2 rodadas.
    // A cada fim de rodada que Ilio passar dormindo, recebe +5 em todos os seus atributos (não ao ser invocado).
    // Toda vez que ele despertar recebe Bravura e Crítico.
    if (card.templateId === 'n_ilio') {
      card.sleepRoundsRemaining = 2;
      card.asleepState = true;
      card.ilioJustSummoned = true;
      card.conditions.add('dormindo');
      setCardConditionSource(card, 'dormindo', 'efeito_unico_proprio', card.name);
      card.conditions.delete('bravura');
      card.conditions.delete('critico');
      card.conditions.delete('tenacidade');
      removeCardConditionSource(card, 'bravura');
      removeCardConditionSource(card, 'critico');
      removeCardConditionSource(card, 'tenacidade');

      sound.playSpell();
      addLog(
        `😴 Ilio, o Colosso foi invocado em sono profundo por 2 rodadas! A cada fim de rodada dormindo receberá +5 em todos os atributos e despertará com Bravura e Crítico!`,
        'spell'
      );
    }

    // Arcanjo Zael: Ao ser invocado cura 2 de vida do jogador e concede "Ressurreição" a todas as unidades aliadas apenas na rodada que foi invocado.
    if (card.templateId === 'n_zael') {
      sound.playSpell();
      card.conditions.add('ressurreicao');
      setCardConditionSource(card, 'ressurreicao', 'efeito_unico_proprio', card.name);
      const zaelAllyBoardIds = (explicitBoard || (isPlayer ? playerRef.current.board : opponentRef.current.board))
        .filter((u) => u.hp > 0)
        .map((u) => u.instanceId);
      queueUnitVfx({
        type: 'zael_bencao_ressurreicao',
        sourceId: card.instanceId,
        targetIds: zaelAllyBoardIds,
        ownerSide: allySide,
      });
      setState((prev) => {
        const nextHp = Math.min(prev.maxHp, prev.hp + 2);
        const nextBoard = prev.board.map((c) => {
          const updatedConds = new Set(c.conditions);
          updatedConds.add('ressurreicao');
          const kind = c.instanceId === card.instanceId ? 'efeito_unico_proprio' : 'unidade_compartilhada';
          return {
            ...c,
            conditions: updatedConds,
            conditionSources: withConditionSource(c.conditionSources, 'ressurreicao', kind, card.name),
          };
        });
        return {
          ...prev,
          hp: nextHp,
          board: nextBoard,
        };
      });
      addLog(`✨ Arcanjo Zael invocado! Curou +2 de Vida do líder e concedeu "Ressurreição" a todas as unidades aliadas nesta rodada!`, 'spell');
    }

    // Umael, o Arcanjo: Efeito Exclusivo
    // Ao ser invocado na mesa ele pode conceder o efeito de condição Enfrentar a uma unidade aliada a escolha.
    if (card.templateId === 'm_umael' || card.name.toLowerCase().includes('umael')) {
      card.conditions.add('enfrentar');
      setCardConditionSource(card, 'enfrentar', 'efeito_unico_proprio', card.name);
      queueConditionVfx([
        {
          condition: 'enfrentar',
          targetUnitId: card.instanceId,
          targetUnitName: card.name,
          targetSide: allySide,
        },
      ]);
      const otherAllies = (explicitBoard || (isPlayer ? playerRef.current.board : opponentRef.current.board)).filter(
        (c) => c.instanceId !== card.instanceId && c.hp > 0
      );
      if (isInteractiveUser) {
        if (otherAllies.length > 0) {
          setUmaelModal({ umaelCard: card, allies: otherAllies, ownerId });
          addLog(`🗡️ ${card.name} foi invocado e recebeu o efeito Enfrentar! Escolha uma unidade aliada de ${isPlayer ? player.name : opponent.name} para conceder Enfrentar!`, 'spell');
        } else {
          queueUnitVfx({
            type: 'umael_imposicao_duelo',
            sourceId: card.instanceId,
            ownerSide: allySide,
          });
          addLog(`🗡️ ${card.name} foi invocado e recebeu o efeito permanente Enfrentar!`, 'info');
        }
      } else {
        if (otherAllies.length > 0) {
          const strongest = [...otherAllies].sort((a, b) => (b.atk + b.power) - (a.atk + a.power))[0];
          strongest.conditions.add('enfrentar');
          setCardConditionSource(strongest, 'enfrentar', 'unidade_compartilhada', card.name);
          queueUnitVfx({
            type: 'umael_imposicao_duelo',
            sourceId: card.instanceId,
            targetIds: [strongest.instanceId],
            ownerSide: allySide,
          });
          queueConditionVfx([
            {
              condition: 'enfrentar',
              targetUnitId: strongest.instanceId,
              targetUnitName: strongest.name,
              targetSide: allySide,
            },
          ]);
          addLog(`🗡️ [Efeito Exclusivo] ${card.name} concedeu o efeito Enfrentar a ${strongest.name}!`, 'spell');
        } else {
          queueUnitVfx({
            type: 'umael_imposicao_duelo',
            sourceId: card.instanceId,
            ownerSide: allySide,
          });
        }
      }
    }

    // Wyr, o Dragão: Ao ser invocado recebe ENFRENTAR
    if (card.templateId === 'n_wyr' || card.name.toLowerCase().includes('wyr')) {
      card.conditions.add('enfrentar');
      setCardConditionSource(card, 'enfrentar', 'efeito_unico_proprio', card.name);
      sound.playSpell();
      queueConditionVfx([
        {
          condition: 'enfrentar',
          targetUnitId: card.instanceId,
          targetUnitName: card.name,
          targetSide: isPlayer ? 'player' : 'opponent',
        },
      ]);
      addLog(`🐉🗡️ [Wyr, o Dragão] Entrou em campo e recebeu o efeito ENFRENTAR! Se eliminar uma unidade desafiada, curará toda a sua Vida!`, 'spell');
    }

    // Passiva Exclusiva: Aliança Angiris (Zael, Inariel, Umael, Saniel, Pólus, Torvyx, Fanx)
    if (isArchangelCard(card)) {
      card.isArchangel = true;
      const activeBoard = explicitBoard || (isPlayer ? playerRef.current.board : opponentRef.current.board);
      const otherArchangel = activeBoard.find((c) => isArchangelCard(c) && c.hp > 0 && c.instanceId !== card.instanceId);
      if (otherArchangel) {
        sound.playSpell();
        addLog(
          `⚔️ ALIANÇA ANGIRIS ATIVADA! Os Arcanjos (${card.name} e ${otherArchangel.name}) estão juntos em campo! Ambos causam +50% de dano e recebem -50% de dano reduzido!`,
          'spell'
        );
      }
      if (hasCelestialCouncilVictory(activeBoard)) {
        addLog(
          `🪽✨ [CONSELHO CELESTIAL REUNIDO!] Todos os 5 Tiers de Arcanjos (1 a 5) estão na mesa! Se permanecerem até o fim da rodada, o Conselho curará totalmente a Vida e ativará a vitória!`,
          'spell'
        );
      }
    }

    // Torvyx, o Arcanjo TIER 2: Ao ser invocado se houver outro ARCANJO na mesa aciona REVELAR
    if (card.templateId === 'n_torvyx' || card.name.toLowerCase().includes('torvyx')) {
      card.isArchangel = true;
      const alliedBoard = explicitBoard || (isPlayer ? playerRef.current.board : opponentRef.current.board);
      const enemyBoard = isPlayer ? opponentRef.current.board : playerRef.current.board;
      const otherArchangel = [...alliedBoard, ...enemyBoard].find(
        (c) => isArchangelCard(c) && c.hp > 0 && c.instanceId !== card.instanceId
      );
      if (otherArchangel) {
        sound.playSpell();
        queueUnitVfx({
          type: 'torvyx_visao_celestial',
          sourceId: card.instanceId,
          secondarySourceId: otherArchangel.instanceId,
          ownerSide: allySide,
        });
        addLog(`🔮👼 [Torvyx, o Arcanjo] A presença de outro Arcanjo (${otherArchangel.name}) acionou o efeito REVELAR!`, 'spell');
        if (isInteractiveUser) {
          setTimeout(() => triggerInteractiveReveal(ownerId), 120);
        } else {
          triggerAiReveal();
        }
      } else {
        addLog(`🔮👼 [Torvyx, o Arcanjo] Foi invocado, mas não há outro Arcanjo na mesa para ativar REVELAR.`, 'info');
      }
    }

    // Fanx, o Arcanjo TIER 1: Ao ser invocado escolha uma unidade ou si mesmo para receber +10 a sua VIDA MÁXIMA
    if (card.templateId === 'm_fanx' || card.name.toLowerCase().includes('fanx')) {
      card.isArchangel = true;
      const currentBoard = explicitBoard || (isPlayer ? playerRef.current.board : opponentRef.current.board);
      const candidates = currentBoard.filter((c) => c.hp > 0);
      if (isInteractiveUser && candidates.length > 0) {
        setTargetModal({
          isOpen: true,
          title: 'Fanx, o Arcanjo - Bênção das Águas',
          description: 'Selecione uma unidade aliada (ou o próprio Fanx) para receber +10 de Vida Máxima:',
          candidates,
          onSelect: (target) => {
            target.maxHp += 10;
            target.hp += 10;
            if (target.sapience !== undefined) {
              target.sapience += 10;
              target.baseSapience = (target.baseSapience || 0) + 10;
            }
            sound.playSpell();
            queueUnitVfx({
              type: 'fanx_aqua_blessing',
              sourceId: card.instanceId,
              targetIds: [target.instanceId],
              ownerSide: allySide,
            });
            addLog(`🌊👼 Fanx, o Arcanjo concedeu +10 de Vida Máxima para ${target.name} (Vida Atual: ${target.hp}/${target.maxHp})!`, 'spell');
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            setState((prev) => ({
              ...prev,
              board: prev.board.map((c) => c.instanceId === target.instanceId ? {
                ...c,
                maxHp: target.maxHp,
                hp: target.hp,
                sapience: target.sapience,
                baseSapience: target.baseSapience,
              } : c),
            }));
            flushPendingSummonTargetTurn();
          },
        });
      } else {
        const bestTarget = [...candidates].sort((a, b) => a.hp - b.hp)[0] || card;
        bestTarget.maxHp += 10;
        bestTarget.hp += 10;
        if (bestTarget.sapience !== undefined) {
          bestTarget.sapience += 10;
          bestTarget.baseSapience = (bestTarget.baseSapience || 0) + 10;
        }
        sound.playSpell();
        queueUnitVfx({
          type: 'fanx_aqua_blessing',
          sourceId: card.instanceId,
          targetIds: [bestTarget.instanceId],
          ownerSide: allySide,
        });
        addLog(`🌊👼 Fanx, o Arcanjo concedeu +10 de Vida Máxima para ${bestTarget.name} (Vida Atual: ${bestTarget.hp}/${bestTarget.maxHp})!`, 'spell');
        setState((prev) => ({
          ...prev,
          board: prev.board.map((c) => c.instanceId === bestTarget.instanceId ? {
            ...c,
            maxHp: bestTarget.maxHp,
            hp: bestTarget.hp,
            sapience: bestTarget.sapience,
            baseSapience: bestTarget.baseSapience,
          } : c),
        }));
      }
    }

    // Cavaleiro Sem Nome: Ao ser invocado recebe TENACIDADE permanentemente. Além disso selecione uma unidade para receber TENACIDADE por 2 rodadas.
    if (card.templateId === 'm_cavaleiro_sem_nome' || card.name.toLowerCase().includes('cavaleiro sem nome')) {
      sound.playSpell();
      card.conditions.add('tenacidade');
      setCardConditionSource(card, 'tenacidade', 'passiva_propria', card.name);
      const allySide = isPlayer ? 'player' : 'opponent';
      queueConditionVfx([{ condition: 'tenacidade', targetUnitId: card.instanceId, targetUnitName: card.name, targetSide: allySide }]);
      addLog(`🛡️ [Cavaleiro sem Nome] Recebeu TENACIDADE permanentemente (-35% dano sofrido)!`, 'spell');

      const currentBoard = explicitBoard || (isPlayer ? playerRef.current.board : opponentRef.current.board);
      const candidates = currentBoard.filter((c) => c.hp > 0);
      if (isInteractiveUser && candidates.length > 0) {
        setTargetModal({
          isOpen: true,
          title: 'Cavaleiro sem Nome - Guarda de Ferro',
          description: 'Selecione uma unidade para receber TENACIDADE por 2 rodadas (-35% dano sofrido):',
          candidates,
          onSelect: (target) => {
            const originKind = target.instanceId === card.instanceId ? 'passiva_propria' : 'unidade_compartilhada';
            target.conditions.add('tenacidade');
            setCardConditionSource(target, 'tenacidade', originKind, card.name);
            target.tenacidadeRoundsRemaining = 2;
            sound.playSpell();
            queueConditionVfx([{ condition: 'tenacidade', targetUnitId: target.instanceId, targetUnitName: target.name, targetSide: allySide }]);
            addLog(`🛡️ [Cavaleiro sem Nome] Concedeu TENACIDADE a ${target.name} por 2 rodadas (-35% dano sofrido)!`, 'spell');
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            setState((prev) => ({
              ...prev,
              board: prev.board.map((c) => {
                if (c.instanceId === target.instanceId) {
                  const conds = new Set(c.conditions);
                  conds.add('tenacidade');
                  return {
                    ...c,
                    conditions: conds,
                    conditionSources: withConditionSource(c.conditionSources, 'tenacidade', originKind, card.name),
                    tenacidadeRoundsRemaining: 2,
                  };
                }
                return c;
              }),
            }));
            flushPendingSummonTargetTurn();
          },
        });
      } else if (candidates.length > 0) {
        const bestTarget = [...candidates].find((c) => c.instanceId !== card.instanceId && !c.conditions.has('tenacidade')) || candidates[0];
        const originKind = bestTarget.instanceId === card.instanceId ? 'passiva_propria' : 'unidade_compartilhada';
        bestTarget.conditions.add('tenacidade');
        setCardConditionSource(bestTarget, 'tenacidade', originKind, card.name);
        bestTarget.tenacidadeRoundsRemaining = 2;
        sound.playSpell();
        queueConditionVfx([{ condition: 'tenacidade', targetUnitId: bestTarget.instanceId, targetUnitName: bestTarget.name, targetSide: allySide }]);
        addLog(`🛡️ [Cavaleiro sem Nome] Concedeu TENACIDADE a ${bestTarget.name} por 2 rodadas (-35% dano sofrido)!`, 'spell');
        setState((prev) => ({
          ...prev,
          board: prev.board.map((c) => {
            if (c.instanceId === bestTarget.instanceId) {
              const conds = new Set(c.conditions);
              conds.add('tenacidade');
              return {
                ...c,
                conditions: conds,
                conditionSources: withConditionSource(c.conditionSources, 'tenacidade', originKind, card.name),
                tenacidadeRoundsRemaining: 2,
              };
            }
            return c;
          }),
        }));
      }
    }

    // Nulio (Naneya - Tier 1 - Divino): "Ao ser invocado, selecione uma unidade aliada para ganhar permanentemente +4 de Poder e o efeito CURA por 2 rodadas."
    if (card.templateId === 'n_nulio' || card.name.toLowerCase() === 'nulio') {
      const currentBoard = explicitBoard || (isPlayer ? playerRef.current.board : opponentRef.current.board);
      const candidates = currentBoard.filter((c) => c.hp > 0);
      const applyNulioBlessing = (target: CardInstance) => {
        const originKind = target.instanceId === card.instanceId ? 'efeito_unico_proprio' : 'unidade_compartilhada';
        addPowerPoints(target, 4);
        target.conditions.add('cura');
        setCardConditionSource(target, 'cura', originKind, card.name);
        target.curaTurnsRemaining = Math.max(target.curaTurnsRemaining || 0, 2);
        target.healingAmount = target.healingAmount ?? 9;
        sound.playSpell();
        queueUnitVfx({
          type: 'nulio_luz_revigorante',
          sourceId: card.instanceId,
          targetIds: [target.instanceId],
          ownerSide: allySide,
        });
        queueConditionVfx([{ condition: 'cura', targetUnitId: target.instanceId, targetUnitName: target.name, targetSide: allySide }]);
        addLog(`✨🌿 [Nulio] Concedeu +4 de Poder permanente e CURA por 2 rodadas para ${target.name} (Poder: ${target.power})!`, 'spell');
        setState((prev) => ({
          ...prev,
          board: prev.board.map((c) => {
            if (c.instanceId !== target.instanceId) return c;
            const conds = new Set(c.conditions);
            conds.add('cura');
            return {
              ...c,
              power: target.power,
              basePower: target.basePower,
              peakPower: target.peakPower,
              votoSilencioSavedPower: target.votoSilencioSavedPower,
              def: target.def,
              baseDef: target.baseDef,
              atk: target.atk,
              baseAtk: target.baseAtk,
              icePeakDefense: target.icePeakDefense,
              icePowerDefGranted: target.icePowerDefGranted,
              teluricoPowerHpGranted: target.teluricoPowerHpGranted,
              teluricoPowerDefGranted: target.teluricoPowerDefGranted,
              neutroPowerHpGranted: target.neutroPowerHpGranted,
              neutroPowerAtkGranted: target.neutroPowerAtkGranted,
              neutroPowerDefGranted: target.neutroPowerDefGranted,
              maxHp: target.maxHp,
              hp: target.hp,
              conditions: conds,
              conditionSources: withConditionSource(c.conditionSources, 'cura', originKind, card.name),
              curaTurnsRemaining: Math.max(c.curaTurnsRemaining || 0, 2),
              healingAmount: c.healingAmount ?? 9,
            };
          }),
        }));
      };

      if (isInteractiveUser && candidates.length > 0) {
        setTargetModal({
          isOpen: true,
          title: 'Nulio - Luz Benevolente',
          description: 'Selecione uma unidade aliada (ou o próprio Nulio) para ganhar +4 de Poder permanente e CURA por 2 rodadas:',
          candidates,
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            applyNulioBlessing(target);
            flushPendingSummonTargetTurn();
          },
        });
      } else if (candidates.length > 0) {
        const bestTarget = [...candidates].sort((a, b) => (b.power + b.atk) - (a.power + a.atk))[0] || card;
        applyNulioBlessing(bestTarget);
      }
    }

    // Falanx (Musmo - Tier 3 - Divino): "Ao ser invocado e morrer, Falanx emite uma luz que causa TORPOR em todos os inimigos por 2 rodadas."
    if (card.templateId === 'm_falanx' || card.name.toLowerCase() === 'falanx') {
      const setOpposite = isPlayer ? setOpponent : setPlayer;
      const enemyBoardNow = isPlayer ? opponentRef.current.board : playerRef.current.board;
      const affectedIds = enemyBoardNow.filter((u) => u.hp > 0 && !u.conditions.has('imunidade')).map((u) => u.instanceId);
      sound.playSpell();
      queueUnitVfx({
        type: 'falanx_onda_luz',
        sourceId: card.instanceId,
        targetIds: affectedIds,
        ownerSide: allySide,
      });
      addLog(`✨🌀 [Falanx] Emitiu uma luz sagrada aplicando TORPOR em todas as unidades inimigas por 2 rodadas!`, 'spell');
      setOpposite((opp) => {
        const batch: Array<Omit<ConditionVfxEvent, 'id'>> = [];
        const nextBoard = opp.board.map((u) => {
          if (u.hp <= 0 || u.conditions.has('imunidade')) return u;
          const nextConds = new Set(u.conditions);
          nextConds.add('entorpecer');
          batch.push({ condition: 'torpor', targetUnitId: u.instanceId, targetUnitName: u.name, targetSide: enemySide });
          return {
            ...u,
            conditions: nextConds,
            conditionSources: withConditionSource(u.conditionSources, 'entorpecer', 'unidade_inimiga', card.name),
            entorpecerRoundsRemaining: Math.max(u.entorpecerRoundsRemaining || 0, 2),
          };
        });
        if (batch.length > 0) queueConditionVfx(batch);
        return { ...opp, board: nextBoard };
      });
    }

    // Vergor (Granty - Tier 4 - Divino): "METAMORFO DIVINO: Ao ser invocado, escolhe uma unidade inimiga e se transforma em uma cópia dela mantendo a classe Divino."
    if (card.templateId === 'g_vergor' || card.name.toLowerCase() === 'vergor') {
      const enemyBoard = (isPlayer ? opponentRef.current.board : playerRef.current.board).filter((c) => c.hp > 0);
      const applyVergorTransform = (enemyTarget: CardInstance) => {
        const tpl = CARD_TEMPLATES.find((t) => t.id === enemyTarget.templateId);
        let transformed: CardInstance =
          enemyTarget.templateId === 'm_atormentador'
            ? createAtormentadorInstance()
            : tpl
            ? createCardInstance(tpl)
            : createCardInstance({
                id: enemyTarget.templateId,
                name: enemyTarget.name,
                kingdom: enemyTarget.kingdom,
                tier: enemyTarget.tier,
                type: 'unit',
                element: enemyTarget.element,
                hp: enemyTarget.maxHp,
                atk: enemyTarget.baseAtk,
                def: enemyTarget.baseDef,
                power: enemyTarget.basePower,
                sapience: enemyTarget.baseSapience,
                effectDescription: enemyTarget.effectDescription,
                exclusiveName: enemyTarget.exclusiveName,
                isArchangel: enemyTarget.isArchangel,
              });
        transformed = {
          ...transformed,
          instanceId: card.instanceId,
          conditions: new Set(transformed.conditions),
          extraElements: transformed.extraElements ? [...transformed.extraElements] : [],
        };
        if (transformed.element !== 'Divino' && !transformed.extraElements?.includes('Divino')) {
          transformed.extraElements = [...(transformed.extraElements || []), 'Divino'];
          syncClassPowerBonuses(transformed);
        }
        if (
          (votoSilencioActive || votoSilencioRoundsRef.current > 0) &&
          !transformed.conditions.has('imunidade') &&
          !(transformed.immunedRounds != null && transformed.immunedRounds > 0)
        ) {
          transformed.votoSilencioSavedPower = transformed.power;
          transformed.peakPower = transformed.power;
          transformed.votoSilencioRoundsRemaining = Math.max(1, votoSilencioRoundsRef.current);
          transformed.power = 0;
          syncClassPowerBonuses(transformed);
        }
        sound.playFusion();
        queueUnitVfx({
          type: 'vergor_metamorfo_divino',
          sourceId: card.instanceId,
          targetIds: [enemyTarget.instanceId],
          ownerSide: allySide,
        });
        triggerElementalBurst(transformed, 'power', allySide);
        addLog(
          `🪽🔄 [Metamorfo Divino - Vergor] Transformou-se em uma cópia de ${transformed.name} mantendo a classe DIVINO (${getCardClasses(transformed).join(' + ')})!`,
          'spell'
        );
        let nextBoardAfterTransform: CardInstance[] = [];
        setState((prev) => {
          nextBoardAfterTransform = prev.board.map((u) => (u.instanceId === card.instanceId ? transformed : u));
          return { ...prev, board: nextBoardAfterTransform };
        });
        if (transformed.templateId !== 'g_vergor') {
          const transformedModalKind = getSummonInteractiveModalKind(
            transformed,
            ownerId,
            nextBoardAfterTransform,
            isPlayer ? opponentRef.current.board : playerRef.current.board,
            summonOrder
          );
          if (transformedModalKind === 'reveal') {
            pendingRevealTurnNextRef.current = pendingTargetTurnNextRef.current;
            pendingTargetTurnNextRef.current = null;
          } else if (transformedModalKind === 'retornar') {
            pendingRetornarTurnNextRef.current = pendingTargetTurnNextRef.current;
            pendingTargetTurnNextRef.current = null;
          }
          setTimeout(() => {
            triggerCardOnSummonEffects(transformed, ownerId, true, nextBoardAfterTransform, summonOrder);
            if (!transformedModalKind) {
              flushPendingSummonTargetTurn();
            }
          }, 80);
        } else {
          flushPendingSummonTargetTurn();
        }
      };

      if (enemyBoard.length === 0) {
        addLog(`🪽🔄 [Vergor] Nenhuma unidade inimiga em campo para copiar com Metamorfo Divino.`, 'info');
        flushPendingSummonTargetTurn();
      } else if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: 'Vergor - Metamorfo Divino',
          description: 'Selecione uma unidade inimiga em campo para Vergor se transformar em uma cópia mantendo a classe Divino:',
          candidates: enemyBoard,
          onSelect: (enemyTarget) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            applyVergorTransform(enemyTarget);
          },
        });
      } else {
        const bestEnemy = [...enemyBoard].sort((a, b) => (b.tier * 50 + b.atk + b.power + b.hp) - (a.tier * 50 + a.atk + a.power + a.hp))[0];
        if (bestEnemy) applyVergorTransform(bestEnemy);
      }
    }

    // Xeno (Musmo - Tier 4 - Divino): "Ao ser invocado, ATORDOA até 2 unidades inimigas por 1 rodada."
    // O atordoamento causado pelo próprio Xeno ao ser invocado também aciona imediatamente seu efeito de gerar "Centelha".
    if (card.templateId === 'm_xeno' || card.name.toLowerCase() === 'xeno') {
      const setOpposite = isPlayer ? setOpponent : setPlayer;
      const enemyBoard = isPlayer ? opponentRef.current.board : playerRef.current.board;
      const validEnemies = enemyBoard.filter((c) => c.hp > 0 && !c.conditions.has('imunidade'));
      const enemyStunnedRef = isPlayer ? prevOpponentStunnedIdsRef : prevPlayerStunnedIdsRef;
      const xenoSelfCount = (card.silencedRounds ?? 0) === 0 ? 1 : 0;

      const flushPendingXenoTurn = () => {
        if (pendingTargetTurnNextRef.current) {
          const next = pendingTargetTurnNextRef.current;
          pendingTargetTurnNextRef.current = null;
          advanceConsumedTurn(next);
        }
      };

      const stunEnemyTarget = (target: CardInstance) => {
        enemyStunnedRef.current.add(target.instanceId);
        sound.playSpell();
        queueUnitVfx({
          type: 'xeno_julgamento_paralizante',
          sourceId: card.instanceId,
          targetIds: [target.instanceId],
          ownerSide: allySide,
        });
        queueConditionVfx([{ condition: 'atordoamento', targetUnitId: target.instanceId, targetUnitName: target.name, targetSide: enemySide }]);
        setOpposite((prev) => ({
          ...prev,
          board: prev.board.map((u) => {
            if (u.instanceId !== target.instanceId) return u;
            const conds = new Set(u.conditions);
            conds.add('atordoado');
            return {
              ...u,
              conditions: conds,
              conditionSources: withConditionSource(u.conditionSources, 'atordoado', 'unidade_inimiga', card.name),
            };
          }),
        }));
        grantCentelhasForOwner(ownerId, 1, xenoSelfCount);
      };

      if (validEnemies.length === 0) {
        addLog(`⚡ [Xeno] Nenhuma unidade inimiga vulnerável a ATORDOADO em campo.`, 'info');
        flushPendingXenoTurn();
      } else if (isInteractiveUser) {
        if (validEnemies.length === 1) {
          stunEnemyTarget(validEnemies[0]);
          addLog(`⚡💫 [Xeno] Atordoou ${validEnemies[0].name} por 1 rodada!`, 'spell');
          flushPendingXenoTurn();
        } else {
          setTargetModal({
            isOpen: true,
            title: 'Xeno - Julgamento Paralizante (1/2)',
            description: 'Escolha a 1ª unidade inimiga para ATORDOAR por 1 rodada:',
            candidates: validEnemies,
            onSelect: (firstTarget) => {
              stunEnemyTarget(firstTarget);
              addLog(`⚡💫 [Xeno] Atordoou ${firstTarget.name} (1/2) por 1 rodada!`, 'spell');
              const remaining = validEnemies.filter((c) => c.instanceId !== firstTarget.instanceId);
              if (remaining.length > 0) {
                setTimeout(() => {
                  setTargetModal({
                    isOpen: true,
                    title: 'Xeno - Julgamento Paralizante (2/2)',
                    description: 'Escolha a 2ª unidade inimiga para ATORDOAR por 1 rodada:',
                    candidates: remaining,
                    onSelect: (secondTarget) => {
                      setTargetModal((prev) => ({ ...prev, isOpen: false }));
                      stunEnemyTarget(secondTarget);
                      addLog(`⚡💫 [Xeno] Atordoou ${secondTarget.name} (2/2) por 1 rodada!`, 'spell');
                      flushPendingXenoTurn();
                    },
                  });
                }, 180);
              } else {
                setTargetModal((prev) => ({ ...prev, isOpen: false }));
                flushPendingXenoTurn();
              }
            },
          });
        }
      } else {
        const picked = [...validEnemies].sort((a, b) => (b.atk + b.power) - (a.atk + a.power)).slice(0, 2);
        const pickedIds = new Set(picked.map((p) => p.instanceId));
        picked.forEach((p) => enemyStunnedRef.current.add(p.instanceId));
        sound.playSpell();
        queueUnitVfx({
          type: 'xeno_julgamento_paralizante',
          sourceId: card.instanceId,
          targetIds: picked.map((p) => p.instanceId),
          ownerSide: allySide,
        });
        queueConditionVfx(
          picked.map((p) => ({
            condition: 'atordoamento' as const,
            targetUnitId: p.instanceId,
            targetUnitName: p.name,
            targetSide: enemySide,
          }))
        );
        setOpposite((prev) => ({
          ...prev,
          board: prev.board.map((u) => {
            if (!pickedIds.has(u.instanceId)) return u;
            const conds = new Set(u.conditions);
            conds.add('atordoado');
            return {
              ...u,
              conditions: conds,
              conditionSources: withConditionSource(u.conditionSources, 'atordoado', 'unidade_inimiga', card.name),
            };
          }),
        }));
        grantCentelhasForOwner(ownerId, picked.length, xenoSelfCount);
        addLog(`⚡💫 [Xeno] Atordoou ${picked.map((p) => p.name).join(' e ')} por 1 rodada!`, 'spell');
      }
    }

    // Targor, o Dragão (Granty - Tier 1 - Sombrio):
    // "Ao ser invocado, selecione 2 inimigos para receber PRAGA por 2 rodadas."
    if (card.templateId === 'g_targor' || card.name.toLowerCase().includes('targor')) {
      const setOpposite = isPlayer ? setOpponent : setPlayer;
      const enemyBoard = isPlayer ? opponentRef.current.board : playerRef.current.board;
      const validEnemies = enemyBoard.filter(
        (c) => c.hp > 0 && !c.conditions.has('imunidade') && !isOSolLevel2Immortal(c) && !isALuaLevel2Supreme(c)
      );

      const flushPendingTargorTurn = () => {
        if (pendingTargetTurnNextRef.current) {
          const next = pendingTargetTurnNextRef.current;
          pendingTargetTurnNextRef.current = null;
          advanceConsumedTurn(next);
        }
      };

      const infectEnemyWithPraga = (target: CardInstance) => {
        sound.playSpell();
        queueUnitVfx({
          type: 'targor_praga_breath',
          sourceId: card.instanceId,
          targetIds: [target.instanceId],
          ownerSide: allySide,
        });
        queueConditionVfx([
          {
            condition: 'praga',
            targetUnitId: target.instanceId,
            targetUnitName: target.name,
            targetSide: enemySide,
          },
        ]);
        setOpposite((prev) => ({
          ...prev,
          board: prev.board.map((u) => {
            if (u.instanceId !== target.instanceId) return u;
            const clone: CardInstance = {
              ...u,
              conditions: new Set(u.conditions),
              conditionSources: u.conditionSources ? { ...u.conditionSources } : undefined,
            };
            applyPragaToUnit(clone, 2, card.name, 'unidade_inimiga');
            return clone;
          }),
        }));
      };

      if (validEnemies.length === 0) {
        addLog(`☠️🐉 [Targor, o Dragão] Nenhuma unidade inimiga vulnerável a PRAGA em campo.`, 'info');
        flushPendingTargorTurn();
      } else if (isInteractiveUser) {
        if (validEnemies.length === 1) {
          infectEnemyWithPraga(validEnemies[0]);
          addLog(`☠️🐉 [Targor, o Dragão] Aplicou PRAGA (-25% atributos) em ${validEnemies[0].name} por 2 rodadas!`, 'spell');
          flushPendingTargorTurn();
        } else {
          setTargetModal({
            isOpen: true,
            title: 'Targor, o Dragão - Sopro da Praga (1/2)',
            description: 'Escolha a 1ª unidade inimiga para receber PRAGA (-25% em todos os atributos) por 2 rodadas:',
            candidates: validEnemies,
            onSelect: (firstTarget) => {
              infectEnemyWithPraga(firstTarget);
              addLog(`☠️🐉 [Targor, o Dragão] Aplicou PRAGA em ${firstTarget.name} (1/2) por 2 rodadas!`, 'spell');
              const remaining = validEnemies.filter((c) => c.instanceId !== firstTarget.instanceId);
              if (remaining.length > 0) {
                setTimeout(() => {
                  setTargetModal({
                    isOpen: true,
                    title: 'Targor, o Dragão - Sopro da Praga (2/2)',
                    description: 'Escolha a 2ª unidade inimiga para receber PRAGA (-25% em todos os atributos) por 2 rodadas:',
                    candidates: remaining,
                    onSelect: (secondTarget) => {
                      setTargetModal((prev) => ({ ...prev, isOpen: false }));
                      infectEnemyWithPraga(secondTarget);
                      addLog(`☠️🐉 [Targor, o Dragão] Aplicou PRAGA em ${secondTarget.name} (2/2) por 2 rodadas!`, 'spell');
                      flushPendingTargorTurn();
                    },
                  });
                }, 180);
              } else {
                setTargetModal((prev) => ({ ...prev, isOpen: false }));
                flushPendingTargorTurn();
              }
            },
          });
        }
      } else {
        const picked = [...validEnemies].sort((a, b) => (b.atk + b.power) - (a.atk + a.power)).slice(0, 2);
        const pickedIds = new Set(picked.map((p) => p.instanceId));
        sound.playSpell();
        queueUnitVfx({
          type: 'targor_praga_breath',
          sourceId: card.instanceId,
          targetIds: picked.map((p) => p.instanceId),
          ownerSide: allySide,
        });
        queueConditionVfx(
          picked.map((p) => ({
            condition: 'praga' as const,
            targetUnitId: p.instanceId,
            targetUnitName: p.name,
            targetSide: enemySide,
          }))
        );
        setOpposite((prev) => ({
          ...prev,
          board: prev.board.map((u) => {
            if (!pickedIds.has(u.instanceId)) return u;
            const clone: CardInstance = {
              ...u,
              conditions: new Set(u.conditions),
              conditionSources: u.conditionSources ? { ...u.conditionSources } : undefined,
            };
            applyPragaToUnit(clone, 2, card.name, 'unidade_inimiga');
            return clone;
          }),
        }));
        addLog(`☠️🐉 [Targor, o Dragão] Aplicou PRAGA (-25% em todos os atributos) em ${picked.map((p) => p.name).join(' e ')} por 2 rodadas!`, 'spell');
      }
    }

    // Barelio, o Carcereiro (Naneya - Tier 4 - Sombrio):
    // "CAPTURA uma unidade da mesa inimiga e o prende em suas correntes. Barelio usurpa a unidade presa até que ela morra causando 10 de dano por rodada preso; caso Barelio mate a unidade presa ele recebe todos os valores de seus atributos."
    if (card.templateId === 'n_barelio' || card.name.toLowerCase().includes('barelio')) {
      const enemyBoard = isPlayer ? opponentRef.current.board : playerRef.current.board;
      const validEnemies = enemyBoard.filter(
        (c) => c.hp > 0 && !c.conditions.has('imunidade') && !isOSolLevel2Immortal(c) && !isALuaLevel2Supreme(c)
      );

      const flushPendingBarelioTurn = () => {
        if (pendingTargetTurnNextRef.current) {
          const next = pendingTargetTurnNextRef.current;
          pendingTargetTurnNextRef.current = null;
          advanceConsumedTurn(next);
        }
      };

      if (validEnemies.length === 0) {
        addLog(`⛓️🌑 [Barelio, o Carcereiro] Nenhuma unidade inimiga vulnerável em campo para aprisionar.`, 'info');
        flushPendingBarelioTurn();
      } else if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: 'Barelio, o Carcereiro - Correntes da Usurpação',
          description: 'Selecione uma unidade da mesa inimiga para CAPTURAR e prender nas correntes de Barelio (sofre 10 de dano por rodada; se morrer presa, Barelio absorve todos os seus atributos):',
          candidates: validEnemies,
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            executeBarelioCapture(card.instanceId, allySide, target);
            flushPendingBarelioTurn();
          },
        });
      } else {
        const bestTarget = [...validEnemies].sort((a, b) => (b.atk + b.power + b.hp) - (a.atk + a.power + a.hp))[0];
        if (bestTarget) {
          executeBarelioCapture(card.instanceId, allySide, bestTarget);
        }
      }
    }

    // Hamelia, a Fada Pútrida (Musmo - Tier 4 - Sombrio / Fada):
    // "Ao ser invocada recebe Furtivo. Além disso selecione 2 inimigos para receberem Corrosão por 2 rodadas."
    if (card.templateId === 'm_hamelia' || card.name.toLowerCase().includes('hamelia')) {
      card.conditions.add('furtividade');
      setCardConditionSource(card, 'furtividade', 'efeito_unico_proprio', card.name);
      setState((prev) => ({
        ...prev,
        board: prev.board.map((u) => {
          if (u.instanceId !== card.instanceId) return u;
          const conds = new Set(u.conditions);
          conds.add('furtividade');
          return {
            ...u,
            conditions: conds,
            conditionSources: withConditionSource(u.conditionSources, 'furtividade', 'efeito_unico_proprio', card.name),
          };
        }),
      }));
      queueConditionVfx([
        {
          condition: 'furtividade',
          targetUnitId: card.instanceId,
          targetUnitName: card.name,
          targetSide: allySide,
        },
      ]);

      const setOpposite = isPlayer ? setOpponent : setPlayer;
      const enemyBoard = isPlayer ? opponentRef.current.board : playerRef.current.board;
      const validEnemies = enemyBoard.filter(
        (c) => c.hp > 0 && !c.conditions.has('imunidade') && !isOSolLevel2Immortal(c) && !isALuaLevel2Supreme(c)
      );

      const flushPendingHameliaTurn = () => {
        if (pendingTargetTurnNextRef.current) {
          const next = pendingTargetTurnNextRef.current;
          pendingTargetTurnNextRef.current = null;
          advanceConsumedTurn(next);
        }
      };

      const infectEnemyWithCorrosao = (target: CardInstance) => {
        sound.playSpell();
        queueUnitVfx({
          type: 'hamelia_putrid_corrosion',
          sourceId: card.instanceId,
          targetIds: [target.instanceId],
          ownerSide: allySide,
        });
        queueConditionVfx([
          {
            condition: 'corrosao',
            targetUnitId: target.instanceId,
            targetUnitName: target.name,
            targetSide: enemySide,
          },
        ]);
        setOpposite((prev) => ({
          ...prev,
          board: prev.board.map((u) => {
            if (u.instanceId !== target.instanceId) return u;
            const conds = new Set(u.conditions);
            conds.add('corrosao');
            return {
              ...u,
              conditions: conds,
              corrosaoRoundsRemaining: 2,
              conditionSources: withConditionSource(u.conditionSources, 'corrosao', 'unidade_inimiga', card.name),
            };
          }),
        }));
      };

      if (validEnemies.length === 0) {
        addLog(`🧚🧪 [Hamelia, a Fada Pútrida] Recebeu Furtivo ao ser invocada (nenhum inimigo vulnerável para Corrosão).`, 'spell');
        flushPendingHameliaTurn();
      } else if (isInteractiveUser) {
        if (validEnemies.length === 1) {
          infectEnemyWithCorrosao(validEnemies[0]);
          addLog(
            `🧚🧪 [Hamelia, a Fada Pútrida] Recebeu Furtivo e aplicou CORROSÃO (-1 Vida/turno & corta cura) em ${validEnemies[0].name} por 2 rodadas!`,
            'spell'
          );
          flushPendingHameliaTurn();
        } else {
          setTargetModal({
            isOpen: true,
            title: 'Hamelia, a Fada Pútrida - Néctar Corrosivo (1/2)',
            description: 'Escolha a 1ª unidade inimiga para receber CORROSÃO (-1 Vida por turno e corta toda cura) por 2 rodadas:',
            candidates: validEnemies,
            onSelect: (firstTarget) => {
              infectEnemyWithCorrosao(firstTarget);
              addLog(`🧚🧪 [Hamelia] Aplicou CORROSÃO em ${firstTarget.name} (1/2) por 2 rodadas!`, 'spell');
              const remaining = validEnemies.filter((c) => c.instanceId !== firstTarget.instanceId);
              if (remaining.length > 0) {
                setTimeout(() => {
                  setTargetModal({
                    isOpen: true,
                    title: 'Hamelia, a Fada Pútrida - Néctar Corrosivo (2/2)',
                    description: 'Escolha a 2ª unidade inimiga para receber CORROSÃO (-1 Vida por turno e corta toda cura) por 2 rodadas:',
                    candidates: remaining,
                    onSelect: (secondTarget) => {
                      setTargetModal((prev) => ({ ...prev, isOpen: false }));
                      infectEnemyWithCorrosao(secondTarget);
                      addLog(`🧚🧪 [Hamelia] Aplicou CORROSÃO em ${secondTarget.name} (2/2) por 2 rodadas!`, 'spell');
                      flushPendingHameliaTurn();
                    },
                  });
                }, 180);
              } else {
                setTargetModal((prev) => ({ ...prev, isOpen: false }));
                flushPendingHameliaTurn();
              }
            },
          });
        }
      } else {
        const picked = [...validEnemies].sort((a, b) => (b.atk + b.power) - (a.atk + a.power)).slice(0, 2);
        const pickedIds = new Set(picked.map((p) => p.instanceId));
        sound.playSpell();
        queueUnitVfx({
          type: 'hamelia_putrid_corrosion',
          sourceId: card.instanceId,
          targetIds: picked.map((p) => p.instanceId),
          ownerSide: allySide,
        });
        queueConditionVfx(
          picked.map((p) => ({
            condition: 'corrosao' as const,
            targetUnitId: p.instanceId,
            targetUnitName: p.name,
            targetSide: enemySide,
          }))
        );
        setOpposite((prev) => ({
          ...prev,
          board: prev.board.map((u) => {
            if (!pickedIds.has(u.instanceId)) return u;
            const conds = new Set(u.conditions);
            conds.add('corrosao');
            return {
              ...u,
              conditions: conds,
              corrosaoRoundsRemaining: 2,
              conditionSources: withConditionSource(u.conditionSources, 'corrosao', 'unidade_inimiga', card.name),
            };
          }),
        }));
        addLog(
          `🧚🧪 [Hamelia, a Fada Pútrida] Recebeu Furtivo e aplicou CORROSÃO em ${picked.map((p) => p.name).join(' e ')} por 2 rodadas!`,
          'spell'
        );
      }
    }

    // Kaliel, o Arcanjo (Granty - Tier 5 - Divino):
    // "Ao ser invocado, concede +15 em todos os atributos para todos os outros Arcanjos (mesa, mão e baralho) e coloca os Arcanjos do baralho no topo."
    if (card.templateId === 'g_kaliel' || card.name.toLowerCase().includes('kaliel')) {
      card.isArchangel = true;
      let buffedCount = 0;
      let movedDeckArchangels = 0;
      const archangelBoardTargets = (explicitBoard || (isPlayer ? playerRef.current.board : opponentRef.current.board))
        .filter((u) => isArchangelCard(u) && u.instanceId !== card.instanceId)
        .map((u) => u.instanceId);

      const buffArchangel = (u: CardInstance): CardInstance => {
        if (!isArchangelCard(u) || u.instanceId === card.instanceId) return u;
        buffedCount += 1;
        const clone: CardInstance = {
          ...u,
          hp: u.hp + 15,
          maxHp: u.maxHp + 15,
          atk: u.atk + 15,
          baseAtk: u.baseAtk + 15,
          ...(u.sapience != null ? { sapience: u.sapience + 15, baseSapience: (u.baseSapience || u.maxHp) + 15 } : {}),
          conditions: new Set(u.conditions),
          conditionSources: u.conditionSources ? { ...u.conditionSources } : undefined,
        };
        addDefensePoints(clone, 15);
        addPowerPoints(clone, 15);
        return clone;
      };

      setState((prev) => {
        const nextBoard = prev.board.map(buffArchangel);
        const nextHand = prev.hand.map(buffArchangel);
        const updatedDeck = prev.deck.map(buffArchangel);
        const archangelsInDeck = updatedDeck.filter((c) => isArchangelCard(c));
        const nonArchangelsInDeck = updatedDeck.filter((c) => !isArchangelCard(c));
        movedDeckArchangels = archangelsInDeck.length;
        return {
          ...prev,
          board: nextBoard,
          hand: nextHand,
          deck: [...archangelsInDeck, ...nonArchangelsInDeck],
        };
      });

      sound.playFusion();
      queueUnitVfx({
        type: 'kaliel_bencao_global',
        sourceId: card.instanceId,
        targetIds: archangelBoardTargets,
        ownerSide: allySide,
      });
      addLog(
        `🪽👑 [Kaliel, o Arcanjo] BÊNÇÃO ANGIRIS! Concedeu +15 em TODOS os atributos para ${buffedCount} outro(s) Arcanjo(s) (mesa, mão e baralho) e posicionou ${movedDeckArchangels} Arcanjo(s) no topo do baralho!`,
        'spell'
      );
    }

    // Gohr, o Dragão: Expansão de mesa (+1 espaço de mesa = 6 unidades) & REVELAÇÃO
    if (card.templateId === 'n_gohr') {
      sound.playSpell();
      setState((prev) => ({
        ...prev,
        maxBoardSlots: 6,
      }));
      addLog(`🐉 Efeito Exclusivo: ${card.name} expandiu o espaço da mesa para até 6 unidades simultâneas!`, 'spell');
      // Disparar efeito de condição: REVELAR
      if (isInteractiveUser) {
        setTimeout(() => triggerInteractiveReveal(ownerId), 120);
      } else {
        triggerAiReveal();
      }
    }

    // Farren: Ao ser invocado recebe Roubo de Vida por uma rodada
    if (card.templateId === 'm_farren') {
      sound.playSpell();
      card.conditions.add('roubo_de_vida');
      setCardConditionSource(card, 'roubo_de_vida', 'efeito_unico_proprio', card.name);
      card.hasLifeSteal = true;
      card.lifeStealRoundsRemaining = 1;
      addLog(`💧 [Farren] Ao ser invocado, Farren recebeu Roubo de Vida por 1 rodada!`, 'spell');
    }

    // Sebastian: Ao ser invocado recebe ATAQUE-DUPLO e ROUBO DE VIDA
    if (card.templateId === 'g_sebastian') {
      sound.playSpell();
      card.conditions.add('ataque_duplo');
      card.conditions.add('roubo_de_vida');
      setCardConditionSource(card, 'ataque_duplo', 'passiva_propria', card.name);
      setCardConditionSource(card, 'roubo_de_vida', 'passiva_propria', card.name);
      card.hasDoubleAttack = true;
      card.hasLifeSteal = true;
      addLog(`⚡ [Sebastian] Velocidade Extrema ativada: Sebastian recebeu Ataque-Duplo e Roubo de Vida!`, 'spell');
    }

    // Titano: Recebe Ataque-Duplo
    if (card.templateId === 'm_titano') {
      card.conditions.add('ataque_duplo');
      setCardConditionSource(card, 'ataque_duplo', 'passiva_propria', card.name);
      card.hasDoubleAttack = true;
      addLog(`🌊 [Titano, o Carrasco dos Mares] Invocado com Ataque-Duplo permanente!`, 'info');
    }

    // Craff: Presença Rúnica (+1 invocação por rodada)
    if (card.templateId === 'g_craff') {
      sound.playSpell();
      addLog(`🏛️ [Craff] Presença Rúnica ativada: enquanto Craff estiver na mesa, permite invocar até 3 cartas por rodada!`, 'spell');
    }

    // Ide: Ao ser invocado ganha BARREIRA
    if (card.templateId === 'g_ide' || card.name.toLowerCase() === 'ide') {
      card.conditions.add('barreira');
      setCardConditionSource(card, 'barreira', 'efeito_unico_proprio', card.name);
      sound.playSpell();
      addLog(`🛡️✨ [Ide] Dádiva Cósmica: Ide ergueu uma Barreira Celestial que anulará o próximo dano que sofrer!`, 'spell');
    }

    // Herox, o Vigilante: Ao ser invocado ganha IMUNIDADE por 3 rodadas
    if (card.templateId === 'g_herox' || card.name.toLowerCase().includes('herox')) {
      card.conditions.add('imunidade');
      setCardConditionSource(card, 'imunidade', 'efeito_unico_proprio', card.name);
      card.immunedRounds = 3;
      sound.playSpell();
      addLog(`🌟 [Herox, o Vigilante] Aura Imutável: Herox recebeu Imunidade absoluta a condições e Voto do Silêncio por 3 rodadas!`, 'spell');
    }

    // Zyk, o Eminente: Em rodada de ATAQUE concede ataque extra; em DEFESA concede atacar na posição de defesa
    if (card.templateId === 'g_zyk' || card.name.toLowerCase().includes('zyk')) {
      sound.playSpell();
      const isOwnerAttacker = isPlayer ? (attackerRoleRef.current === 'player') : (attackerRoleRef.current === 'opponent');
      if (isOwnerAttacker) {
        if (hasAttackedThisRoundRef.current) {
          hasAttackedThisRoundRef.current = false;
          setHasAttackedThisRound(false);
          setState((prev) => ({
            ...prev,
            extraAttackRound: false,
            secondAttackDone: true,
          }));
          queueUnitVfx({
            type: 'zyk_purple_coin',
            ownerSide: allySide,
          });
          addLog(`🌌 [Zyk, o Eminente] Proeza Temporal: O 1º ataque já havia ocorrido — ATAQUE EXTRA garantido imediatamente antes da rodada encerrar!`, 'spell');
        } else {
          setState((prev) => ({
            ...prev,
            extraAttackRound: true,
            secondAttackDone: false,
          }));
          addLog(`🌌 [Zyk, o Eminente] Proeza Temporal: Concedeu uma RODADA EXTRA DE ATAQUE após a resolução do primeiro ataque!`, 'spell');
        }
      } else {
        setState((prev) => ({
          ...prev,
          canAttackOnDefense: true,
        }));
        queueUnitVfx({
          type: 'zyk_purple_coin',
          ownerSide: allySide,
        });
        addLog(`🌌 [Zyk, o Eminente] Transcendência Defensiva: Aliados na posição de defesa agora podem atacar antes do fim da rodada!`, 'spell');
      }
    }

    // Lunario: Se for EXATAMENTE a 2ª carta invocada na rodada, aplica SONO a 1 unidade inimiga
    if (card.templateId === 'g_lunario' || card.name.toLowerCase().includes('lunario')) {
      const effectiveOrder = summonOrder ?? activeState.summonsThisRound;
      if (effectiveOrder === 2) {
        const enemyState = isPlayer ? opponentRef.current : playerRef.current;
        const setOpposite = isPlayer ? setOpponent : setPlayer;
        const validEnemies = enemyState.board.filter((c) => c.hp > 0 && !c.conditions.has('imunidade'));
        if (validEnemies.length > 0) {
          const applyLunarioSleep = (target: CardInstance) => {
            target.conditions.add('dormindo');
            setCardConditionSource(target, 'dormindo', 'unidade_inimiga', card.name);
            target.asleepState = true;
            target.sleepRoundsRemaining = 1;
            sound.playSpell();
            queueUnitVfx({
              type: 'lunario_sleep_beam',
              sourceId: card.instanceId,
              targetIds: [target.instanceId],
              ownerSide: allySide,
            });
            setOpposite((opp) => ({
              ...opp,
              board: opp.board.map((u) => {
                if (u.instanceId === target.instanceId) {
                  const conds = new Set(u.conditions);
                  conds.add('dormindo');
                  return {
                    ...u,
                    conditions: conds,
                    conditionSources: withConditionSource(u.conditionSources, 'dormindo', 'unidade_inimiga', card.name),
                    asleepState: true,
                    sleepRoundsRemaining: 1,
                  };
                }
                return u;
              }),
            }));
            addLog(`🌙😴 [Lunario, o Emissário da Lua] 2ª Invocação da rodada! Lançou Sono Cósmico em ${target.name} por 1 rodada!`, 'spell');
          };

          if (isInteractiveUser) {
            setTargetModal({
              isOpen: true,
              title: 'Lunario - Emissário da Lua (2ª Invocação)',
              description: 'Escolha uma unidade inimiga para mergulhar em SONO por 1 rodada:',
              candidates: validEnemies,
              onSelect: (target) => {
                applyLunarioSleep(target);
                setTargetModal((prev) => ({ ...prev, isOpen: false }));
                flushPendingSummonTargetTurn();
              },
            });
          } else {
            const target = [...validEnemies].sort((a, b) => (b.atk + b.power) - (a.atk + a.power))[0];
            applyLunarioSleep(target);
          }
        }
      }
    }

    // Hélio, o Arauto do Sol: Se for EXATAMENTE a 1ª carta invocada na rodada, lança labareda solar (5 dano + TORPOR por 2 rodadas)
    if (card.templateId === 'n_helio' || card.name.toLowerCase().includes('helio') || card.name.toLowerCase().includes('hélio')) {
      const effectiveOrder = summonOrder ?? activeState.summonsThisRound;
      if (effectiveOrder === 1) {
        const enemyState = isPlayer ? opponentRef.current : playerRef.current;
        const validEnemies = enemyState.board.filter((c) => c.hp > 0 && !c.conditions.has('imunidade'));
        if (validEnemies.length > 0) {
          const applyHelioSolarFlare = (target: CardInstance) => {
            sound.playSpell();
            queueUnitVfx({
              type: 'helio_solar_flare',
              sourceId: card.instanceId,
              targetIds: [target.instanceId],
              ownerSide: allySide,
            });
            const isTargetVilmaImmune =
              (target.templateId === 'm_vilma' || target.name.toLowerCase().includes('vilma')) &&
              target.silencedRounds === 0;
            let flareDamage = isTargetVilmaImmune ? 0 : 5;
            if (flareDamage > 0) {
              if (target.conditions.has('congelado')) flareDamage = Math.round(flareDamage * 1.5);
              if (target.conditions.has('tenacidade')) flareDamage = Math.max(0, Math.round(flareDamage * 0.65));
            }
            if (target.def >= flareDamage) {
              target.def -= flareDamage;
            } else {
              const rem = flareDamage - target.def;
              target.def = 0;
              target.hp = Math.max(0, target.hp - rem);
            }
            target.conditions.add('entorpecer');
            setCardConditionSource(target, 'entorpecer', 'unidade_inimiga', card.name);
            target.entorpecerRoundsRemaining = 2;
            queueConditionVfx([
              {
                condition: 'torpor',
                targetUnitId: target.instanceId,
                targetUnitName: target.name,
                targetSide: enemySide,
              },
            ]);
            addLog(
              isTargetVilmaImmune
                ? `☀️🔥 [Hélio - Labareda Solar] Lançou fogo solar em ${target.name}: Imune ao dano de FOGO (0 dano), mas recebeu TORPOR por 2 rodadas!`
                : `☀️🔥 [Hélio - Labareda Solar] 1ª Invocação da rodada! Lançou fogo solar em ${target.name} causando ${flareDamage} de dano direto e aplicando TORPOR por 2 rodadas! (Vida/Def: ${target.hp}/${target.def})`,
              'spell'
            );
            const enemySetter = isPlayer ? setOpponent : setPlayer;
            if (target.hp <= 0) {
              addLog(`💀 ${target.name} foi consumido pelas chamas solares de Hélio!`, 'kill');
              enemySetter((prevEnemy) => ({
                ...prevEnemy,
                board: prevEnemy.board.filter((c) => c.instanceId !== target.instanceId),
                graveyard: [...prevEnemy.graveyard, target],
              }));
              triggerPhilioEliminationBonus(allySide, 1, [target.instanceId]);
            } else {
              enemySetter((prevEnemy) => ({
                ...prevEnemy,
                board: prevEnemy.board.map((u) => {
                  if (u.instanceId === target.instanceId) {
                    const conds = new Set(u.conditions);
                    conds.add('entorpecer');
                    return {
                      ...u,
                      hp: target.hp,
                      def: target.def,
                      conditions: conds,
                      conditionSources: withConditionSource(u.conditionSources, 'entorpecer', 'unidade_inimiga', card.name),
                      entorpecerRoundsRemaining: 2,
                    };
                  }
                  return u;
                }),
              }));
            }
          };

          if (isInteractiveUser) {
            setTargetModal({
              isOpen: true,
              title: 'Hélio - Labareda Solar (1ª Invocação)',
              description: 'Escolha uma unidade inimiga para receber 5 de dano e a condição TORPOR por 2 rodadas:',
              candidates: validEnemies,
              onSelect: (target) => {
                applyHelioSolarFlare(target);
                setTargetModal((prev) => ({ ...prev, isOpen: false }));
                flushPendingSummonTargetTurn();
              },
            });
          } else {
            const target = [...validEnemies].sort((a, b) => (b.atk + b.power) - (a.atk + a.power))[0];
            applyHelioSolarFlare(target);
          }
        }
      }
    }

    // Salazar TIER 3 (Granty - Fogo): "Ao ser invocado causa Torpor em dois inimigos a escolha por 1 rodada."
    if (card.templateId === 'g_salazar' || card.name.toLowerCase().includes('salazar')) {
      const enemyState = isPlayer ? opponentRef.current : playerRef.current;
      const setOpposite = isPlayer ? setOpponent : setPlayer;
      const validEnemies = enemyState.board.filter((c) => c.hp > 0 && !c.conditions.has('imunidade'));

      if (validEnemies.length > 0) {
        if (isInteractiveUser) {
          if (validEnemies.length === 1) {
            const singleTarget = validEnemies[0];
            singleTarget.conditions.add('entorpecer');
            setCardConditionSource(singleTarget, 'entorpecer', 'unidade_inimiga', card.name);
            singleTarget.entorpecerRoundsRemaining = 1;
            sound.playSpell();
            queueUnitVfx({
              type: 'salazar_torpor',
              sourceId: card.instanceId,
              targetIds: [singleTarget.instanceId],
              ownerSide: allySide,
            });
            queueConditionVfx([{ condition: 'torpor', targetUnitId: singleTarget.instanceId, targetUnitName: singleTarget.name, targetSide: enemySide }]);
            addLog(`🔥🌀 [Salazar] Causou TORPOR em ${singleTarget.name} por 1 rodada!`, 'spell');
            setOpposite((prev) => ({
              ...prev,
              board: prev.board.map((c) => {
                if (c.instanceId === singleTarget.instanceId) {
                  const conds = new Set(c.conditions);
                  conds.add('entorpecer');
                  return {
                    ...c,
                    conditions: conds,
                    conditionSources: withConditionSource(c.conditionSources, 'entorpecer', 'unidade_inimiga', card.name),
                    entorpecerRoundsRemaining: 1,
                  };
                }
                return c;
              }),
            }));
            flushPendingSummonTargetTurn();
          } else {
            setTargetModal({
              isOpen: true,
              title: 'Salazar - Brasa Entorpecente (1/2)',
              description: 'Escolha o 1º inimigo para receber TORPOR por 1 rodada:',
              candidates: validEnemies,
              onSelect: (firstTarget) => {
                firstTarget.conditions.add('entorpecer');
                setCardConditionSource(firstTarget, 'entorpecer', 'unidade_inimiga', card.name);
                firstTarget.entorpecerRoundsRemaining = 1;
                sound.playSpell();
                queueUnitVfx({
                  type: 'salazar_torpor',
                  sourceId: card.instanceId,
                  targetIds: [firstTarget.instanceId],
                  ownerSide: allySide,
                });
                queueConditionVfx([{ condition: 'torpor', targetUnitId: firstTarget.instanceId, targetUnitName: firstTarget.name, targetSide: enemySide }]);
                addLog(`🔥🌀 [Salazar] Causou TORPOR em ${firstTarget.name} (1/2) por 1 rodada!`, 'spell');
                const secondCandidates = validEnemies.filter((c) => c.instanceId !== firstTarget.instanceId);
                if (secondCandidates.length > 0) {
                  setTimeout(() => {
                    setTargetModal({
                      isOpen: true,
                      title: 'Salazar - Brasa Entorpecente (2/2)',
                      description: 'Escolha o 2º inimigo para receber TORPOR por 1 rodada:',
                      candidates: secondCandidates,
                      onSelect: (secondTarget) => {
                        secondTarget.conditions.add('entorpecer');
                        setCardConditionSource(secondTarget, 'entorpecer', 'unidade_inimiga', card.name);
                        secondTarget.entorpecerRoundsRemaining = 1;
                        sound.playSpell();
                        queueUnitVfx({
                          type: 'salazar_torpor',
                          sourceId: card.instanceId,
                          targetIds: [secondTarget.instanceId],
                          ownerSide: allySide,
                        });
                        queueConditionVfx([{ condition: 'torpor', targetUnitId: secondTarget.instanceId, targetUnitName: secondTarget.name, targetSide: enemySide }]);
                        addLog(`🔥🌀 [Salazar] Causou TORPOR em ${secondTarget.name} (2/2) por 1 rodada!`, 'spell');
                        setTargetModal((prev) => ({ ...prev, isOpen: false }));
                        setOpposite((prev) => ({
                          ...prev,
                          board: prev.board.map((c) => {
                            if (c.instanceId === firstTarget.instanceId || c.instanceId === secondTarget.instanceId) {
                              const conds = new Set(c.conditions);
                              conds.add('entorpecer');
                              return {
                                ...c,
                                conditions: conds,
                                conditionSources: withConditionSource(c.conditionSources, 'entorpecer', 'unidade_inimiga', card.name),
                                entorpecerRoundsRemaining: 1,
                              };
                            }
                            return c;
                          }),
                        }));
                        flushPendingSummonTargetTurn();
                      },
                    });
                  }, 180);
                } else {
                  setTargetModal((prev) => ({ ...prev, isOpen: false }));
                  flushPendingSummonTargetTurn();
                }
              },
            });
          }
        } else {
          const picked = [...validEnemies]
            .sort((a, b) => (b.atk + b.power) - (a.atk + a.power))
            .slice(0, 2);
          const pickedIds = new Set(picked.map((c) => c.instanceId));
          picked.forEach((t) => {
            t.conditions.add('entorpecer');
            setCardConditionSource(t, 'entorpecer', 'unidade_inimiga', card.name);
            t.entorpecerRoundsRemaining = 1;
          });
          sound.playSpell();
          queueUnitVfx({
            type: 'salazar_torpor',
            sourceId: card.instanceId,
            targetIds: picked.map((t) => t.instanceId),
            ownerSide: allySide,
          });
          queueConditionVfx(picked.map((t) => ({ condition: 'torpor' as const, targetUnitId: t.instanceId, targetUnitName: t.name, targetSide: enemySide })));
          addLog(
            `🔥🌀 [Salazar] Causou TORPOR em ${picked.map((c) => c.name).join(' e ')} por 1 rodada!`,
            'spell'
          );
          setOpposite((prev) => ({
            ...prev,
            board: prev.board.map((c) => {
              if (pickedIds.has(c.instanceId)) {
                const conds = new Set(c.conditions);
                conds.add('entorpecer');
                return {
                  ...c,
                  conditions: conds,
                  conditionSources: withConditionSource(c.conditionSources, 'entorpecer', 'unidade_inimiga', card.name),
                  entorpecerRoundsRemaining: 1,
                };
              }
              return c;
            }),
          }));
        }
      }
    }

    // O Sol - TIER 6 Supremo (Naneya - Fogo): "O Sol cura totalmente a Resistência(vida e defesa) de Hélio."
    if (card.templateId === 'n_o_sol' || card.name.trim().toLowerCase().startsWith('o sol')) {
      const currentBoard = explicitBoard || (isPlayer ? playerRef.current.board : opponentRef.current.board);
      const helioTargets = currentBoard.filter(
        (u) =>
          (u.templateId === 'n_helio' || u.name.toLowerCase().includes('helio') || u.name.toLowerCase().includes('hélio')) &&
          u.hp > 0
      );
      sound.playSpell();
      if (helioTargets.length > 0) {
        queueUnitVfx({
          type: 'o_sol_heal_helio',
          sourceId: card.instanceId,
          targetIds: helioTargets.map((h) => h.instanceId),
          ownerSide: allySide,
        });
      }
      addLog(
        `☀️✨ [O Sol] Resplendor Solar: Curou totalmente a Resistência (Vida e Defesa) de Hélio!`,
        'spell'
      );
      setState((prev) => ({
        ...prev,
        board: prev.board.map((u) => {
          if (
            (u.templateId === 'n_helio' || u.name.toLowerCase().includes('helio') || u.name.toLowerCase().includes('hélio')) &&
            u.hp > 0
          ) {
            return {
              ...u,
              hp: hasCorrosao(u) ? u.hp : u.maxHp,
              def: u.baseDef ?? u.def,
            };
          }
          return u;
        }),
      }));
    }

    // A Lua - TIER 6 Supremo (Granty - Cósmico): "A Lua cura totalmente a Sapiência de Lunário."
    if (card.templateId === 'g_a_lua' || card.name.trim().toLowerCase().startsWith('a lua')) {
      const currentBoard = explicitBoard || (isPlayer ? playerRef.current.board : opponentRef.current.board);
      const lunarioTargets = currentBoard.filter(
        (u) =>
          (u.templateId === 'g_lunario' || u.name.toLowerCase().includes('lunario')) &&
          u.hp > 0
      );
      sound.playSpell();
      if (lunarioTargets.length > 0) {
        queueUnitVfx({
          type: 'a_lua_heal_lunario',
          sourceId: card.instanceId,
          targetIds: lunarioTargets.map((l) => l.instanceId),
          ownerSide: allySide,
        });
      }
      addLog(
        `🌙✨ [A Lua] Dádiva Cósmica: Curou totalmente a Sapiência de Lunario!`,
        'spell'
      );
      setState((prev) => ({
        ...prev,
        board: prev.board.map((u) => {
          if (
            (u.templateId === 'g_lunario' || u.name.toLowerCase().includes('lunario')) &&
            u.hp > 0
          ) {
            const restoredSap = u.baseSapience ?? u.maxHp ?? 30;
            return {
              ...u,
              hp: restoredSap,
              sapience: restoredSap,
            };
          }
          return u;
        }),
      }));
    }
  };

  const executeSummonToBoard = (
    card: CardInstance,
    ownerId: 'player' | 'opponent',
    boardOverride?: CardInstance[]
  ) => {
    const isPlayer = ownerId === 'player';
    const setState = isPlayer ? setPlayer : setOpponent;
    const ownerRefState = isPlayer ? playerRef.current : opponentRef.current;
    const enemyRefState = isPlayer ? opponentRef.current : playerRef.current;
    const preBoardSnapshot = boardOverride ?? ownerRefState.board;
    const computedSummonOrder = ownerRefState.summonsThisRound + 1;

    // Restrição do Atormentador: Apenas 1 peça por rodada
    if (card.templateId === 'm_tor' || card.templateId === 'm_men' || card.templateId === 'm_tador') {
      setState((prev) => ({
        ...prev,
        atormentadorPieceSummonedThisRound: true,
      }));
    }

    let postSummonBoardSnapshot: CardInstance[] = [...preBoardSnapshot, card];

    // Add to board
    setState((prev) => {
      const baseBoard = boardOverride ?? prev.board;
      let nextBoard: CardInstance[];
      if (card.templateId === 'g_rainha_liz') {
        // Rainha Liz: Concede +15 de Poder para todas unidades aliadas na mesa
        nextBoard = baseBoard.map((c) => withAddedPowerPoints(c, 15));
        addPowerPoints(card, 15);
        if (
          (votoSilencioActive || votoSilencioRoundsRef.current > 0) &&
          !card.conditions.has('imunidade') &&
          !(card.immunedRounds != null && card.immunedRounds > 0)
        ) {
          card.votoSilencioSavedPower = card.power;
          card.peakPower = card.power;
          card.votoSilencioRoundsRemaining = Math.max(1, votoSilencioRoundsRef.current);
          card.power = 0;
          syncClassPowerBonuses(card);
        }
        nextBoard.push(card);
        sound.playSpell();
        addLog(
          `👑 Rainha Liz entoou seu decreto real: todas as unidades aliadas na mesa receberam permanentemente +15 de Poder!`,
          'spell'
        );
      } else {
        if (
          (votoSilencioActive || votoSilencioRoundsRef.current > 0) &&
          !card.conditions.has('imunidade') &&
          !(card.immunedRounds != null && card.immunedRounds > 0)
        ) {
          card.votoSilencioSavedPower = card.power;
          card.peakPower = card.power;
          card.votoSilencioRoundsRemaining = Math.max(1, votoSilencioRoundsRef.current);
          card.power = 0;
          syncClassPowerBonuses(card);
        }
        nextBoard = [...baseBoard, card];
      }
      const nextHand = prev.hand.filter((c) => c.instanceId !== card.instanceId);

      // Total match summons for Craff level up
      const nextTotalMatchSummons = (prev.totalMatchSummons || 0) + 1;
      const nextSummonsThisRound = prev.summonsThisRound + 1;
      let craffLevelUpTriggered = false;
      const checkAndEvolveCraff = (c: CardInstance) => {
        if ((c.templateId === 'g_craff' || c.name.toLowerCase().includes('craff')) && c.level === 1 && (c.silencedRounds ?? 0) === 0) {
          craffLevelUpTriggered = true;
          return {
            ...c,
            level: 2 as const,
            exclusiveName: 'Presença Rúnica & Rochedo',
            effectDescription:
              'Lendária [Tier 5 - Nível 2]. Presença Rúnica: Enquanto Craff estiver em campo permite invocar +1 carta por rodada (limite 3). Sempre que o jogador invocar a 3ª carta na mesma rodada com Craff Nível 2 na mesa, gera um Rochedo.',
          };
        }
        return c;
      };

      let evaluatedBoard = nextBoard;
      let evaluatedHand = nextHand;
      let evaluatedDeck = prev.deck;

      if (nextTotalMatchSummons >= 10) {
        evaluatedBoard = evaluatedBoard.map(checkAndEvolveCraff);
        evaluatedHand = evaluatedHand.map(checkAndEvolveCraff);
        evaluatedDeck = evaluatedDeck.map(checkAndEvolveCraff);
        if (craffLevelUpTriggered) {
          sound.playFusion();
          addLog(`🏛️⚡ ASCENSÃO! 10 cartas aliadas foram invocadas! Craff evoluiu para o NÍVEL 2!`, 'spell');
          const craffCard =
            evaluatedBoard.find((c) => c.templateId === 'g_craff' || c.name.toLowerCase().includes('craff')) ||
            evaluatedHand.find((c) => c.templateId === 'g_craff' || c.name.toLowerCase().includes('craff')) ||
            evaluatedDeck.find((c) => c.templateId === 'g_craff' || c.name.toLowerCase().includes('craff'));
          if (craffCard) {
            triggerLevelUpCinematic(
              craffCard,
              'Presença Rúnica elevada: permite invocar até 3 cartas por rodada enquanto estiver em campo, e sempre que a 3ª carta da rodada for invocada, gera um Rochedo (20 de dano) na mão!'
            );
          }
        }
      }

      // Craff Nível 2: Sempre que o jogador invocar a 3ª carta na mesma rodada com Craff Nível 2 na mesa, gera um Rochedo
      const hasCraffLvl2OnBoard = evaluatedBoard.some(
        (c) =>
          (c.templateId === 'g_craff' || c.name.toLowerCase().includes('craff')) &&
          c.level === 2 &&
          c.hp > 0 &&
          c.silencedRounds === 0
      );
      if (hasCraffLvl2OnBoard && nextSummonsThisRound === 3) {
        const rochedoTemplate = CARD_TEMPLATES.find((t) => t.id === 'g_rochedo');
        if (rochedoTemplate) {
          const rochedoInst = createCardInstance(rochedoTemplate);
          rochedoInst.isFugaz = true;
          rochedoInst.isGeneratedCard = true;
          evaluatedHand = [...evaluatedHand, rochedoInst];
          sound.playSpell();
          addLog(
            `🪨 [Craff Nível 2] Você invocou a 3ª carta nesta rodada! Craff gerou um Rochedo (Fugaz · 20 de dano) em sua mão!`,
            'spell'
          );
        }
      }

      // Immediate Bonetrus + A Lâmina do Inverno synergy on summon (only if not silenced):
      const bonetrusOnBoard = evaluatedBoard.find(
        (c) => (c.templateId === 'm_bonetrus' || c.name.toLowerCase().includes('bonetrus')) && c.level === 1 && c.hp > 0 && c.silencedRounds === 0
      );
      const laminaOnBoard = evaluatedBoard.find((c) => c.templateId === 'm_lamina_inverno' && c.hp > 0 && c.silencedRounds === 0);
      if (bonetrusOnBoard && laminaOnBoard) {
        evaluatedBoard = evaluatedBoard
          .filter((c) => c.instanceId !== laminaOnBoard.instanceId)
          .map((c) => {
            if (c.instanceId === bonetrusOnBoard.instanceId) {
              const evolvedBonetrus: CardInstance = {
                ...c,
                level: 2,
                name: 'Bonetrus, Soberano do Inverno',
                exclusiveName: 'Devastação Glacial',
                effectDescription:
                  'Lendária [Tier 5 - Nível 2 - Musmo]. Ao atacar inimigos afligidos por CONGELAR os executam caso tenha 12 ou menos de Vida. Se Bonetrus for designado sozinho para um ataque ele causa dano em TODAS as unidades da mesa inimiga além da carta que defende seu ataque (100% no defensor, 50% nas demais).',
              };
              setTimeout(() => {
                queueUnitVfx({
                  type: 'bonetrus_lamina_attach',
                  sourceId: evolvedBonetrus.instanceId,
                  secondarySourceId: laminaOnBoard.instanceId,
                  ownerSide: ownerId,
                });
                triggerLevelUpCinematic(
                  evolvedBonetrus,
                  '❄️💀 SOBERANO DO INVERNO DESPERTO! Bonetrus empunhou A Lâmina do Inverno e atingiu o Nível 2! Executa inimigos congelados com Vida <= 12 e desfere nevascas em área ao atacar sozinho!'
                );
              }, 80);
              return evolvedBonetrus;
            }
            return c;
          });
        sound.playFusion();
        addLog(
          `❄️💀 [ASCENSÃO GLACIAL] Bonetrus empunhou A Lâmina do Inverno em campo e subiu imediatamente para o NÍVEL 2!`,
          'spell'
        );
      }

      // Check fusion of Tor, Men, Tador -> O Atormentador!
      const fusion = checkAtormentadorFusion(evaluatedBoard);
      if (fusion.canFuse) {
        sound.playFusion();
        const filteredBoard = evaluatedBoard.filter((c) => !fusion.pieceIds.includes(c.instanceId));
        const atormentador = createAtormentadorInstance();
        addLog(`⚡ INVOCAÇÃO ESPECIAL! Tor, Men e Tador uniram suas essências para invocar O ATORMENTADOR!`, 'spell');
        queueUnitVfx({
          type: 'atormentador_fusion',
          ownerSide: ownerId,
        });

        // O Atormentador: Ao nascer da fundição, Atordoa o inimigo com maior valor de Dano na mesa inimiga por 1 rodada
        const enemySetter = isPlayer ? setOpponent : setPlayer;
        enemySetter((prevEnemy) => {
          const alive = prevEnemy.board.filter((c) => c.hp > 0);
          if (alive.length > 0) {
            const highestDmg = [...alive].sort((a, b) => (b.atk + b.power) - (a.atk + a.power))[0];
            highestDmg.conditions.add('atordoado');
            setCardConditionSource(highestDmg, 'atordoado', 'unidade_inimiga', atormentador.name);
            queueUnitVfx({
              type: 'atormentador_stun_bolt',
              sourceId: atormentador.instanceId,
              targetIds: [highestDmg.instanceId],
              ownerSide: ownerId,
            });
            addLog(`⚡ [O Atormentador] Ao nascer da fusão, atordoou ${highestDmg.name} (maior valor de Dano: ${highestDmg.atk + highestDmg.power}) por 1 rodada!`, 'spell');
          }
          return { ...prevEnemy };
        });

        const finalBoard = [...filteredBoard, atormentador];
        postSummonBoardSnapshot = finalBoard;
        return {
          ...prev,
          board: finalBoard,
          hand: evaluatedHand,
          deck: evaluatedDeck,
          summonsThisRound: nextSummonsThisRound,
          totalMatchSummons: nextTotalMatchSummons,
        };
      }

      postSummonBoardSnapshot = evaluatedBoard;
      return {
        ...prev,
        board: evaluatedBoard,
        hand: evaluatedHand,
        deck: evaluatedDeck,
        summonsThisRound: nextSummonsThisRound,
        totalMatchSummons: nextTotalMatchSummons,
      };
    });

    // Trigger on-summon effects cleanly outside React state updater using latest board snapshot
    setTimeout(() => {
      const latestBoard = (isPlayer ? playerRef.current.board : opponentRef.current.board);
      const effectiveBoard = latestBoard.some((c) => c.instanceId === card.instanceId)
        ? latestBoard
        : postSummonBoardSnapshot;
      triggerCardOnSummonEffects(card, ownerId, false, effectiveBoard, computedSummonOrder);
    }, 50);

    sound.playSummon();
    addLog(`${isPlayer ? ownerRefState.name : opponentRef.current.name} invocou ${card.name} na mesa.`, 'info');
    triggerElementalBurst(card, 'summon', isPlayer ? 'player' : 'opponent');

    const isZykSummon = card.templateId === 'g_zyk' || card.name.toLowerCase().includes('zyk');
    const ownerWillHaveZykAttack =
      isZykSummon || hasPendingZykAttack(ownerRefState, ownerId, postSummonBoardSnapshot);

    // Invocação de unidade consome o turno e zera passes consecutivos do Atacante
    if (ownerId === attackerRoleRef.current) {
      resetAttackerPasses();
    }

    // Se foi invocada durante o Turno Extra Pós-Ataque: mantém o turno se Zyk garantiu ataque antes do fim da rodada!
    if (isPostAttackFinalTurnRef.current) {
      setTurnTimeLeft(30);
      if (ownerWillHaveZykAttack) {
        setTurnPlayer(ownerId);
      } else {
        setTimeout(() => {
          setPostAttackRoundEndPending(true);
        }, 280);
      }
    } else {
      // Se a invocação disparar REVELAR, RETORNAR ou Seleção de Alvo interativa para P1 ou P2 humano, o turno aguarda a seleção antes de passar!
      const summonModalKind = getSummonInteractiveModalKind(
        card,
        ownerId,
        postSummonBoardSnapshot,
        enemyRefState.board,
        computedSummonOrder
      );
      const nextTurnAfterSummon: 'player' | 'opponent' = isPlayer ? 'opponent' : 'player';

      if (summonModalKind === 'reveal') {
        pendingRevealTurnNextRef.current = nextTurnAfterSummon;
        setTurnTimeLeft(30);
      } else if (summonModalKind === 'retornar') {
        pendingRetornarTurnNextRef.current = nextTurnAfterSummon;
        setTurnTimeLeft(30);
      } else if (summonModalKind === 'target') {
        pendingTargetTurnNextRef.current = nextTurnAfterSummon;
        setTurnTimeLeft(30);
      } else {
        // Switch turn to opponent after unit summon action!
        advanceConsumedTurn(nextTurnAfterSummon);
      }
    }
  };

  // ----------------------------------------------------
  // PLAY CARD FROM HAND
  // ----------------------------------------------------
  const handlePlayCard = (card: CardInstance, ownerId: 'player' | 'opponent') => {
    if (isOnlinePvp && ownerId !== 'player') {
      return;
    }
    const isPlayer = ownerId === 'player';
    const activePlayer = isPlayer ? player : opponent;

    // Block actions while Round Coin transition, Turn Handoff, or animations are running
    if (
      isRoundTransitioningRef.current ||
      isRoundTransitioning ||
      isTurnTransitioningRef.current ||
      isTurnTransitioning ||
      isBusyByAnimation
    ) {
      return;
    }

    // Validation: Is it this player's turn?
    if (!isTestingArena && turnPlayer !== ownerId) {
      if (!activePlayer.isAi) addLog(`Aguarde o turno de ${activePlayer.name} para realizar ações.`, 'info');
      return;
    }
    if (isTestingArena && !pendingSpell && turnPlayer !== ownerId) {
      setTurnPlayer(ownerId);
    }

    // Active player performed an action: reset consecutive inactivity timeouts
    setConsecutiveTimeouts((prev) => ({ ...prev, [ownerId]: 0 }));

    // Tier allowed check (bypassed in Testing Arena for unrestricted testing)
    if (!isTestingArena && !isTierAllowedInRound(card.tier, round, card)) {
      if (!activePlayer.isAi) addLog(`Cartas Tier ${card.tier} ainda não são permitidas na Rodada ${round}.`, 'info');
      return;
    }

    // Nova Regra Global: Restrições da Janela de Contra-Resposta
    if (pendingSpell) {
      if (card.type === 'unit') {
        if (!activePlayer.isAi) {
          addLog(
            '⏳ Janela de Contra-Resposta ativa! Você só pode usar uma Carta de Habilidade RÁPIDA ou FUGAZ, ou Passar a Vez para deixar resolver.',
            'info'
          );
        }
        return;
      }
      if (card.type === 'skill' && card.speed === 'lenta' && !card.isFugaz) {
        if (!activePlayer.isAi) {
          addLog(
            '⏳ Na Janela de Contra-Resposta, apenas Cartas de Habilidade RÁPIDAS ou FUGAZES podem ser utilizadas!',
            'info'
          );
        }
        return;
      }
    } else if (card.templateId === 'n_veto_do_indomito') {
      if (!activePlayer.isAi) {
        addLog(
          '🛡️ Veto do Indômito só pode ser usado na Janela de Contra-Resposta para vetar/bloquear uma Carta de Habilidade inimiga!',
          'info'
        );
      }
      return;
    }

    // Units
    if (card.type === 'unit') {
      const hasCraffOnBoard = activePlayer.board.some(
        (c) =>
          (c.templateId === 'g_craff' || c.name.toLowerCase().includes('craff')) &&
          c.hp > 0 &&
          c.silencedRounds === 0
      );
      const maxAllowedSummons = hasCraffOnBoard ? 3 : 2;

      if (!isTestingArena && activePlayer.summonsThisRound >= maxAllowedSummons) {
        if (!activePlayer.isAi) {
          addLog(
            `${activePlayer.name} já invocou ${maxAllowedSummons} cartas na mesa nesta rodada (limite ${
              hasCraffOnBoard ? 'expandido por Craff' : 'padrão'
            } atingido).`,
            'info'
          );
        }
        return;
      }

      // Check Atormentador pieces limit: only 1 piece per round
      const isAtormentadorPiece = card.templateId === 'm_tor' || card.templateId === 'm_men' || card.templateId === 'm_tador';
      if (isAtormentadorPiece && activePlayer.atormentadorPieceSummonedThisRound) {
        if (!activePlayer.isAi) {
          sound.playDiscard();
          addLog('Apenas 1 peça do Atormentador pode ser invocada por rodada!', 'info');
        }
        return;
      }

      // Requisito Exclusivo de O Sol (Tier 6): "Só pode ser invocado se houver um Hélio nível 2 na mesa."
      if (card.templateId === 'n_o_sol' || card.name.trim().toLowerCase().startsWith('o sol')) {
        const hasHelioLvl2 = activePlayer.board.some(
          (c) =>
            (c.templateId === 'n_helio' || c.name.toLowerCase().includes('helio') || c.name.toLowerCase().includes('hélio')) &&
            c.level === 2 &&
            c.hp > 0 &&
            c.silencedRounds === 0
        );
        if (!hasHelioLvl2) {
          if (!activePlayer.isAi) {
            sound.playDiscard();
            addLog('☀️ O Sol só pode ser invocado se houver um Hélio nível 2 na sua mesa!', 'info');
          }
          return;
        }
      }

      // Requisito Exclusivo de A Lua (Tier 6): "Só pode ser invocada se houver um Lunario nível 2 na mesa."
      if (card.templateId === 'g_a_lua' || card.name.trim().toLowerCase().startsWith('a lua')) {
        const hasLunarioLvl2 = activePlayer.board.some(
          (c) =>
            (c.templateId === 'g_lunario' || c.name.toLowerCase().includes('lunario')) &&
            c.level === 2 &&
            c.hp > 0 &&
            c.silencedRounds === 0
        );
        if (!hasLunarioLvl2) {
          if (!activePlayer.isAi) {
            sound.playDiscard();
            addLog('🌙 A Lua só pode ser invocada se houver um Lunario nível 2 na sua mesa!', 'info');
          }
          return;
        }
      }

      // Requisito Exclusivo de Zyk, o Eminente: Sacrifício de 2 unidades aliadas (da mesa ou da mão)
      // Se a mesa estiver cheia, pelo menos 1 das 2 cartas DEVE ser da mesa para abrir espaço!
      if (card.templateId === 'g_zyk' || card.name.toLowerCase().includes('zyk')) {
        const handCandidates = activePlayer.hand.filter((c) => c.instanceId !== card.instanceId);
        const boardCandidates = activePlayer.board;
        const totalSacrificeCandidates = handCandidates.length + boardCandidates.length;

        if (totalSacrificeCandidates < 2) {
          if (!activePlayer.isAi) {
            addLog('Para invocar Zyk, o Eminente, você deve possuir pelo menos 2 outras cartas na mão ou na mesa como sacrifício temporal!', 'info');
          }
          return;
        }

        const currentMaxSlots = activePlayer.maxBoardSlots ?? 5;
        const effectiveMaxSlots = card.templateId === 'n_gohr' ? 6 : currentMaxSlots;
        const isFull = activePlayer.board.length >= effectiveMaxSlots;

        if (!activePlayer.isAi) {
          setZykDiscardModal({
            isOpen: true,
            zykCard: card,
            selectedCardIds: [],
            ownerId,
          });
          return;
        } else {
          // AI automatic sacrifice: pick 2 cards. If board is full, at least 1 MUST come from board!
          let sacrifice1: CardInstance;
          let sacrifice2: CardInstance;

          if (isFull && boardCandidates.length > 0) {
            const sortedBoard = [...boardCandidates].sort((a, b) => (a.hp + a.def) - (b.hp + b.def));
            sacrifice1 = sortedBoard[0];
            const remainingCandidates = [...boardCandidates.filter((c) => c.instanceId !== sacrifice1.instanceId), ...handCandidates];
            sacrifice2 = remainingCandidates[0];
          } else {
            const allAiCandidates = [...boardCandidates, ...handCandidates];
            sacrifice1 = allAiCandidates[0];
            sacrifice2 = allAiCandidates[1];
          }

          const sacrificeIds = [sacrifice1.instanceId, sacrifice2.instanceId];

          setOpponent((prev) => {
            const remHand = prev.hand.filter((c) => !sacrificeIds.includes(c.instanceId));
            const remBoard = prev.board.filter((c) => !sacrificeIds.includes(c.instanceId));
            return {
              ...prev,
              hand: remHand,
              board: remBoard,
              graveyard: [...prev.graveyard, sacrifice1, sacrifice2],
            };
          });

          const remBoardSnapshot = boardCandidates.filter((c) => !sacrificeIds.includes(c.instanceId));
          addLog(`${opponent.name} sacrificou ${sacrifice1.name} e ${sacrifice2.name} para invocar Zyk, o Eminente!`, 'spell');
          executeSummonToBoard(card, 'opponent', remBoardSnapshot);
          return;
        }
      }

      // Check board size limit for all other units (5 cards default, or 6 with Gohr)
      const currentMaxSlots = activePlayer.maxBoardSlots ?? 5;
      const effectiveMaxSlots = card.templateId === 'n_gohr' ? 6 : currentMaxSlots;

      if (activePlayer.board.length >= effectiveMaxSlots) {
        // Must choose a board card to discard
        if (!activePlayer.isAi) {
          setDiscardModal({
            isOpen: true,
            incomingCard: card,
            ownerId,
          });
          return;
        } else {
          // AI discards weakest card
          const weakest = [...activePlayer.board].sort((a, b) => (a.hp + a.def) - (b.hp + b.def))[0];
          setDiscardingCardAnim({ card: weakest, ownerId: 'opponent' });
          sound.playDiscard();
          const remainingBoard = activePlayer.board.filter((c) => c.instanceId !== weakest.instanceId);
          setOpponent((o) => ({
            ...o,
            board: remainingBoard,
            graveyard: [...o.graveyard, weakest],
          }));
          addLog(`${opponent.name} descartou ${weakest.name} para abrir espaço na mesa.`, 'info');
          executeSummonToBoard(card, 'opponent', remainingBoard);
          return;
        }
      }

      executeSummonToBoard(card, ownerId);
    }
    // Skills / Spells
    else if (card.type === 'skill') {
      handleCastSpell(card, ownerId);
    }
  };
  handlePlayCardRef.current = handlePlayCard;

  const handleToggleZykCardSelect = (cardId: string) => {
    setZykDiscardModal((prev) => {
      if (!prev) return null;
      const current = prev.selectedCardIds;
      if (current.includes(cardId)) {
        return { ...prev, selectedCardIds: current.filter((id) => id !== cardId) };
      }
      if (current.length >= 2) {
        return prev;
      }
      return { ...prev, selectedCardIds: [...current, cardId] };
    });
  };

  const handleConfirmZykSacrifice = () => {
    if (!zykDiscardModal || zykDiscardModal.selectedCardIds.length !== 2) return;
    const { zykCard, selectedCardIds, ownerId = 'player' } = zykDiscardModal;
    const isPlayer = ownerId === 'player';
    const setter = isPlayer ? setPlayer : setOpponent;

    const sacrificedCards: CardInstance[] = [];
    setter((prev) => {
      const sacrificedHand = prev.hand.filter((c) => selectedCardIds.includes(c.instanceId));
      const remainingHand = prev.hand.filter((c) => !selectedCardIds.includes(c.instanceId));
      const sacrificedBoard = prev.board.filter((c) => selectedCardIds.includes(c.instanceId));
      const remainingBoard = prev.board.filter((c) => !selectedCardIds.includes(c.instanceId));

      sacrificedCards.push(...sacrificedHand, ...sacrificedBoard);
      return {
        ...prev,
        hand: remainingHand,
        board: remainingBoard,
        graveyard: [...prev.graveyard, ...sacrificedHand, ...sacrificedBoard],
      };
    });

    sacrificedCards.forEach((c) => {
      addLog(`🧬⏳ [Tributo Temporal] ${c.name} foi sacrificado para invocar Zyk, o Eminente!`, 'spell');
    });

    const currentTargetState = isPlayer ? playerRef.current : opponentRef.current;
    const remainingBoardForZyk = currentTargetState.board.filter((c) => !selectedCardIds.includes(c.instanceId));
    sound.playDiscard();
    setZykDiscardModal(null);
    executeSummonToBoard(zykCard, ownerId, remainingBoardForZyk);
  };

      // Helper to sync Licia's stealth condition based on other board units
  const syncLiciaStealth = (board: CardInstance[]) => {
    const licia = board.find((c) => (c.templateId === 'm_licia' || c.name.toLowerCase().includes('licia')) && c.level === 1 && c.silencedRounds === 0);
    if (licia) {
      const stealthAlly = board.find((c) => c.instanceId !== licia.instanceId && c.hp > 0 && c.conditions.has('furtividade'));
      if (stealthAlly) {
        licia.conditions.add('furtividade');
        setCardConditionSource(licia, 'furtividade', 'unidade_compartilhada', stealthAlly.name);
      } else {
        licia.conditions.delete('furtividade');
        removeCardConditionSource(licia, 'furtividade');
      }
    }
  };

  // ----------------------------------------------------
  // SPELL CASTING & COUNTER-RESPONSE WINDOW
  // ----------------------------------------------------
  const handleCastSpell = (card: CardInstance, ownerId: 'player' | 'opponent') => {
    const isPlayer = ownerId === 'player';
    const caster = isPlayer ? player : opponent;
    const enemy = isPlayer ? opponent : player;
    const isInteractiveUser = !caster.isAi;

    const finalizeSpell = (
      description: string,
      executeEffect?: () => void,
      targetName?: string,
      targetUnitId?: string
    ) => {
      sound.playSpell();
      const spellConsumesTurn = isSpellTurnConsuming(card);
      triggerElementalBurst(card, 'power', isPlayer ? 'player' : 'opponent');
      // Verificador da Janela de Contra-Resposta:
      // Ativa o modal/janela de contra-resposta APENAS quando o jogador adversário tiver VETO DO INDÔMITO na mão!
      const currentEnemy = isPlayer ? opponentRef.current : playerRef.current;
      const enemyHasVetoInHand = isOnlinePvp
        ? isPlayer
          ? remoteHasVetoRef.current
          : false
        : currentEnemy.hand.some(
            (c) =>
              (c.templateId === 'n_veto_do_indomito' ||
                c.name.toLowerCase().includes('veto do indômito') ||
                c.name.toLowerCase().includes('veto do indomito')) &&
              (isTestingArena || isTierAllowedInRound(c.tier, roundRef.current, c))
          );
      const willOpenCounterWindow = !pendingSpell && enemyHasVetoInHand;

      // Keep the skill card floating in the center of the arena until its animation/effect finishes!
      animatedDiscardIdsRef.current.add(card.instanceId);
      setFloatingSkillCards((prev) => [
        ...prev.filter((item) => item.card.instanceId !== card.instanceId),
        {
          id: `float_skill_${card.instanceId}_${Date.now()}`,
          card,
          ownerId,
          ownerName: isPlayer ? player.name : opponent.name,
          targetName,
          stage: willOpenCounterWindow ? 'awaiting_resolution' : 'executing_effect',
        },
      ]);

      // Move spell from hand to graveyard (discard visual will trigger after floating phase ends)
      if (isPlayer) {
        setPlayer((p) => ({
          ...p,
          hand: p.hand.filter((c) => c.instanceId !== card.instanceId),
          graveyard: [...p.graveyard, card],
        }));
      } else {
        setOpponent((o) => ({
          ...o,
          hand: o.hand.filter((c) => c.instanceId !== card.instanceId),
          graveyard: [...o.graveyard, card],
        }));
      }

      // Check Barão Well level up on skill casts (only if not silenced by Jurisdição de Saniel):
      const baraoWell = caster.board.find(
        (c) =>
          (c.templateId === 'g_barao_well' ||
            c.name.toLowerCase().includes('barão well') ||
            c.name.toLowerCase().includes('barao well')) &&
          c.level === 1 &&
          c.hp > 0 &&
          c.silencedRounds === 0
      );
      if (baraoWell) {
        baraoWell.skillsUsedWhileAlive = (baraoWell.skillsUsedWhileAlive || 0) + 1;
        if (baraoWell.skillsUsedWhileAlive >= 2) {
          baraoWell.level = 2;
          baraoWell.conditions.add('cura');
          baraoWell.conditions.add('roubo_de_vida');
          setCardConditionSource(baraoWell, 'cura', 'efeito_unico_proprio', baraoWell.name);
          setCardConditionSource(baraoWell, 'roubo_de_vida', 'efeito_unico_proprio', baraoWell.name);
          baraoWell.hasLifeSteal = true;
          baraoWell.healingAmount = 9;
          addLog(
            `⚡ ASCENSÃO! Barão Well presenciou o uso de 2 habilidades e evoluiu para o NÍVEL 2! Efeito EXTRA: Cura (+9 de Vida por rodada) e Roubo de Vida pelo resto do combate!`,
            'spell'
          );
          triggerLevelUpCinematic(
            baraoWell,
            'Efeito EXTRA Despertado: Cura (+9 de Vida por rodada) e Roubo de Vida pelo resto do combate!'
          );
        } else {
          addLog(`⚡ Barão Well presenciou o uso de habilidade (${baraoWell.skillsUsedWhileAlive}/2 para Nível 2).`, 'info');
        }
      }

      // Efeito Único de Gough: gera Flecha Elétrica sempre que uma carta de habilidade aliada for usada
      const isFlechaEletrica =
        card.templateId === 'token_flecha_eletrica' ||
        card.name.toLowerCase().includes('flecha elétrica') ||
        card.name.toLowerCase().includes('flecha eletrica');

      const gough = caster.board.find(
        (c) => (c.templateId === 'm_gough' || c.name.toLowerCase().includes('gough')) && c.hp > 0 && c.silencedRounds === 0
      );
      if (gough && !isFlechaEletrica) {
        const flechaTemplate = CARD_TEMPLATES.find((t) => t.id === 'token_flecha_eletrica');
        if (flechaTemplate) {
          const flechaCard = createCardInstance(flechaTemplate);
          flechaCard.isFugaz = true;
          flechaCard.isGeneratedCard = true;
          const setter = isPlayer ? setPlayer : setOpponent;
          setter((prev) => ({
            ...prev,
            hand: [...prev.hand, flechaCard],
          }));
          sound.playSpell();
          addLog(
            `🏹⚡ [Gough] Gerou Flecha Elétrica (Fugaz) na mão de ${isPlayer ? player.name : opponent.name} reagindo ao uso de habilidade aliada!`,
            'spell'
          );
        }
      }

      // Se estamos na Janela de Contra-Resposta:
      if (pendingSpell) {
        const originalConsumedTurn = pendingSpell.consumesTurn !== false;

        // Caso especial: Veto do Indômito veta/bloqueia totalmente o efeito da Carta de Habilidade inimiga!
        if (card.templateId === 'n_veto_do_indomito') {
          const blockedCard = pendingSpell.spellCard;
          const blockedCaster = pendingSpell.casterId;
          const blockedCasterName = blockedCaster === 'player' ? player.name : opponent.name;
          const blockedName = blockedCard.name;
          setPendingSpell(null);
          startFloatingSkillExecution(card, ownerId, 2250);
          startFloatingSkillExecution(blockedCard, blockedCaster, 2250);
          triggerSkillVfx('n_veto_do_indomito', 'center', undefined, blockedName);
          sound.playClash();
          addLog(
            `🚫🛡️ VETO DO INDÔMITO! ${caster.name} vetou e bloqueou totalmente o efeito de ${blockedName}!${
              !originalConsumedTurn ? ` (Ação livre — o turno segue com ${blockedCasterName}!)` : ''
            }`,
            'spell'
          );
          if (!originalConsumedTurn) {
            setTurnTimeLeft(30);
            setTurnPlayer(blockedCaster);
            showFreeActionHint(`⚡ Veto resolvido — Turno segue com ${blockedCasterName}`);
            return;
          }
          if (blockedCaster === attackerRoleRef.current) {
            resetAttackerPasses();
          }
          if (isPostAttackFinalTurnRef.current) {
            setTurnTimeLeft(30);
            const blockedCasterState = blockedCaster === 'player' ? playerRef.current : opponentRef.current;
            const responderState = isPlayer ? playerRef.current : opponentRef.current;
            if (hasPendingZykAttack(blockedCasterState, blockedCaster)) {
              setTurnPlayer(blockedCaster);
            } else if (hasPendingZykAttack(responderState, ownerId)) {
              setTurnPlayer(ownerId);
            } else {
              setTimeout(() => {
                setPostAttackRoundEndPending(true);
              }, 2250);
            }
          } else {
            advanceConsumedTurn(ownerId);
          }
          return;
        }

        // Qualquer outra Habilidade Rápida ou Fugaz na Contra-Resposta:
        // Resolve PRIMEIRO e encerra a cadeia, executando em seguida a habilidade original!
        const originalPending = pendingSpell;
        if (isOnlinePvp) {
          startFloatingSkillExecution(card, ownerId, 2250);
          if (executeEffect) {
            executeEffect();
          }
          syncLiciaStealth(caster.board);
          setPlayer((p) => ({ ...p, board: [...p.board] }));
          setOpponent((o) => ({ ...o, board: [...o.board] }));
          addLog(`⚡ [Contra-Resposta Resolvida] ${description}`, 'spell');
          // Devolve a janela aceita para o conjurador original executar o efeito fechado da habilidade original
          setPendingSpell({ ...originalPending, accepted: true });
          setTurnPlayer(originalPending.casterId);
          setTurnTimeLeft(30);
          return;
        }
        setPendingSpell(null);
        startFloatingSkillExecution(card, ownerId, 2250);
        startFloatingSkillExecution(originalPending.spellCard, originalPending.casterId, 2450);
        if (executeEffect) {
          executeEffect();
        }
        syncLiciaStealth(caster.board);
        addLog(`⚡ [Contra-Resposta Resolvida] ${description}`, 'spell');

        originalPending.executeEffect();
        setPlayer((p) => ({ ...p, board: [...p.board] }));
        setOpponent((o) => ({ ...o, board: [...o.board] }));
        const origCasterName = originalPending.casterId === 'player' ? player.name : opponent.name;
        addLog(
          `📜 [Habilidade Original Executada] ${originalPending.description}${
            !originalConsumedTurn ? ` (Ação livre — o turno segue com ${origCasterName}!)` : ''
          }`,
          'spell'
        );
        if (!originalConsumedTurn) {
          setTurnTimeLeft(30);
          setTurnPlayer(originalPending.casterId);
          showFreeActionHint(`⚡ Contra-resposta resolvida — Turno segue com ${origCasterName}`);
          return;
        }
        if (originalPending.casterId === attackerRoleRef.current) {
          resetAttackerPasses();
        }
        if (isPostAttackFinalTurnRef.current) {
          setTurnTimeLeft(30);
          const origCaster = originalPending.casterId;
          const origCasterState = origCaster === 'player' ? playerRef.current : opponentRef.current;
          const responderState = isPlayer ? playerRef.current : opponentRef.current;
          if (hasPendingZykAttack(origCasterState, origCaster)) {
            setTurnPlayer(origCaster);
          } else if (hasPendingZykAttack(responderState, ownerId)) {
            setTurnPlayer(ownerId);
          } else {
            setTimeout(() => {
              setPostAttackRoundEndPending(true);
            }, 2450);
          }
        } else {
          advanceConsumedTurn(ownerId);
        }
        return;
      }

      // Se o oponente NÃO possui Veto do Indômito na mão, a habilidade flutua no centro da arena e aplica seu efeito imediatamente!
      if (!willOpenCounterWindow) {
        startFloatingSkillExecution(card, ownerId, 2250);
        if (executeEffect) {
          executeEffect();
        }
        syncLiciaStealth(caster.board);
        setPlayer((p) => ({ ...p, board: [...p.board] }));
        setOpponent((o) => ({ ...o, board: [...o.board] }));
        const speedTag = card.isFugaz ? 'Fugaz' : card.speed === 'rapida' ? 'Rápida' : 'Lenta';
        addLog(
          `📜 [Habilidade Executada] ${description}${
            !spellConsumesTurn ? ` (⚡ ${speedTag}: não consome o turno!)` : ''
          }`,
          'spell'
        );
        setTurnTimeLeft(30);
        if (!spellConsumesTurn) {
          // Habilidade Rápida ou Fugaz: não consome o turno e permite outra ação (inclusive no Turno Extra Pós-Ataque!)
          showFreeActionHint(`⚡ ${card.name} (${speedTag}) — Turno mantido!`);
          return;
        }
        // Habilidade Lenta (não-fugaz) consome o turno!
        if (ownerId === attackerRoleRef.current) {
          resetAttackerPasses();
        }
        if (isPostAttackFinalTurnRef.current) {
          const casterLatest = isPlayer ? playerRef.current : opponentRef.current;
          if (hasPendingZykAttack(casterLatest, ownerId)) {
            setTurnPlayer(ownerId);
          } else {
            setTimeout(() => {
              setPostAttackRoundEndPending(true);
            }, 2250);
          }
        } else if (!isTestingArena && !pendingRetornarTurnNextRef.current) {
          const nextTurn = isPlayer ? 'opponent' : 'player';
          advanceConsumedTurn(nextTurn);
        }
        return;
      }

      // O oponente POSSUI Veto do Indômito na mão: abre o Modal de Contra-Resposta!
      const spellExecutor = () => {
        if (executeEffect) {
          executeEffect();
        }
        syncLiciaStealth(caster.board);
        setPlayer((p) => ({ ...p, board: [...p.board] }));
        setOpponent((o) => ({ ...o, board: [...o.board] }));
      };
      pendingSpellExecutorRef.current = spellExecutor;
      setPendingSpell({
        spellCard: card,
        casterId: ownerId,
        description,
        targetName,
        targetUnitId,
        consumesTurn: spellConsumesTurn,
        executeEffect: spellExecutor,
      });

      const nextTurn = isPlayer ? 'opponent' : 'player';
      setTurnTimeLeft(30);
      setTurnPlayer(nextTurn);
      addLog(
        `⏳ [Contra-Resposta Ativada] ${caster.name} lançou ${card.name}${
          targetName ? ` (Alvo: ${targetName})` : ''
        }! ${enemy.name} possui Veto do Indômito na mão e pode vetar a habilidade ou deixá-la resolver.`,
        'spell'
      );
    };

    // Spell 0: Veto do Indômito [Rápida - Tier 6]
    // "Veta/bloqueia totalmente o efeito de uma Carta de Habilidade inimiga."
    if (card.templateId === 'n_veto_do_indomito') {
      if (!pendingSpell) {
        if (isTestingArena) {
          triggerSkillVfx('n_veto_do_indomito', 'center', undefined, 'Demonstração do Tribunal Divino');
          addLog('⚖️🔨 [Arena de Testes] Sentença de Veto do Indômito demonstrada!', 'spell');
          return;
        }
        if (isInteractiveUser) {
          addLog('🛡️ Veto do Indômito só pode ser usado na Janela de Contra-Resposta para vetar uma Habilidade inimiga!', 'info');
        }
        return;
      }
      finalizeSpell(`Veto do Indômito bloqueou ${pendingSpell.spellCard.name}!`);
      return;
    }

    // Spell 1: Enganar [Rápida] - Torna uma unidade Furtiva nesta rodada
    if (card.templateId === 'g_enganar') {
      if (caster.board.length === 0) {
        if (isInteractiveUser) addLog(`Você precisa de pelo menos uma unidade em campo de ${caster.name} para usar Enganar.`, 'info');
        return;
      }
      const allySide = isPlayer ? 'player' : 'opponent';
      if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: 'Enganar - Furtividade Rápida',
          description: `Escolha uma unidade aliada de ${caster.name} para tornar Furtiva nesta rodada:`,
          candidates: caster.board,
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            finalizeSpell(
              `Enganar ativada: ${target.name} tornou-se Furtiva nesta rodada!`,
              () => {
                triggerSkillVfx('g_enganar', allySide, target.instanceId, target.name);
                target.conditions.add('furtividade');
                setCardConditionSource(target, 'furtividade', 'habilidade', card.name);
              },
              target.name,
              target.instanceId
            );
          },
        });
        return;
      } else {
        const target = [...caster.board].sort((a, b) => (b.atk + b.power) - (a.atk + a.power))[0];
        finalizeSpell(
          `${opponent.name} lançou Enganar em ${target.name}!`,
          () => {
            triggerSkillVfx('g_enganar', allySide, target.instanceId, target.name);
            target.conditions.add('furtividade');
            setCardConditionSource(target, 'furtividade', 'habilidade', card.name);
          },
          target.name,
          target.instanceId
        );
      }
    }

    // Spell 2: Levantar Moral [Rápida] - Concede BRAVURA e +3 de Ataque a uma unidade apenas nesta rodada
    else if (card.templateId === 'm_moral') {
      if (caster.board.length === 0) {
        if (isInteractiveUser) addLog(`Você precisa de pelo menos uma unidade em campo de ${caster.name} para Levantar Moral.`, 'info');
        return;
      }
      const allySide = isPlayer ? 'player' : 'opponent';
      if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: 'Levantar Moral - Bravura e Ataque',
          description: `Escolha uma unidade aliada de ${caster.name} para receber Bravura e +3 de Ataque:`,
          candidates: caster.board,
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            finalizeSpell(
              `Levantar Moral ativada: ${target.name} recebeu Bravura e +3 de Ataque!`,
              () => {
                triggerSkillVfx('m_moral', allySide, target.instanceId, target.name);
                target.conditions.add('bravura');
                setCardConditionSource(target, 'bravura', 'habilidade', card.name);
                target.atk += 3;
              },
              target.name,
              target.instanceId
            );
          },
        });
        return;
      } else {
        const target = [...caster.board].sort((a, b) => (b.atk + b.power) - (a.atk + a.power))[0];
        finalizeSpell(
          `${opponent.name} lançou Levantar Moral em ${target.name} (+3 Ataque e Bravura)!`,
          () => {
            triggerSkillVfx('m_moral', allySide, target.instanceId, target.name);
            target.conditions.add('bravura');
            setCardConditionSource(target, 'bravura', 'habilidade', card.name);
            target.atk += 3;
          },
          target.name,
          target.instanceId
        );
      }
    }

    // Spell 3: Voto do Silêncio [Lenta] - O Poder de TODAS as unidades fica zerado por 2 rodadas, retornando ao valor original após isso
    else if (
      card.templateId === 'g_voto_silencio' ||
      card.templateId === 'g_voto_do_silencio' ||
      card.name.toLowerCase().includes('silêncio') ||
      card.name.toLowerCase().includes('silencio')
    ) {
      const applyVotoDoSilencioAllBoards = () => {
        triggerSkillVfx('g_voto_silencio', 'center', undefined, 'Todas as Unidades em Campo (2 Rodadas)');
        votoSilencioRoundsRef.current = 2;
        setVotoSilencioRoundsRemaining(2);
        setVotoSilencioActive(true);
        const zeroUnitPower = (u: CardInstance): CardInstance => {
          const isImmortalDeity =
            ((u.templateId === 'n_o_sol' || u.name.trim().toLowerCase().startsWith('o sol')) && u.level === 2) ||
            ((u.templateId === 'g_a_lua' || u.name.trim().toLowerCase().startsWith('a lua')) && u.level === 2);
          if (u.conditions.has('imunidade') || (u.immunedRounds != null && u.immunedRounds > 0) || isImmortalDeity) {
            return u;
          }
          const savedPower = u.votoSilencioSavedPower !== undefined ? u.votoSilencioSavedPower : u.power;
          const updated: CardInstance = {
            ...u,
            votoSilencioSavedPower: savedPower,
            peakPower: savedPower,
            votoSilencioRoundsRemaining: 2,
            power: 0,
            conditions: new Set(u.conditions),
            conditionSources: u.conditionSources ? { ...u.conditionSources } : undefined,
          };
          syncClassPowerBonuses(updated);
          return updated;
        };
        setPlayer((p) => ({
          ...p,
          board: p.board.map(zeroUnitPower),
        }));
        setOpponent((o) => ({
          ...o,
          board: o.board.map(zeroUnitPower),
        }));
      };

      if (isInteractiveUser) {
        setConfirmModal({
          isOpen: true,
          title: 'Confirmar Ação - Voto do Silêncio',
          description:
            'Deseja ativar o Voto do Silêncio? O Poder e os bônus de classe derivados do Poder de TODAS as unidades em campo (aliadas e inimigas) ficarão zerados por 2 rodadas e retornarão ao valor original após isso (unidades Imunes resistem ao efeito).',
          confirmLabel: 'Confirmar Invocação',
          cancelLabel: 'Cancelar',
          onConfirm: () => {
            setConfirmModal(null);
            finalizeSpell(
              `🤫⚡ Voto do Silêncio ativado! O Poder de TODAS as unidades em campo (aliadas e inimigas) foi zerado (0) por 2 rodadas!`,
              applyVotoDoSilencioAllBoards,
              'Todas as unidades (2 Rodadas)'
            );
          },
          onCancel: () => {
            setConfirmModal(null);
          },
        });
        return;
      } else {
        finalizeSpell(
          `🤫⚡ Voto do Silêncio ativado! O Poder de TODAS as unidades em campo (aliadas e inimigas) foi zerado (0) por 2 rodadas!`,
          applyVotoDoSilencioAllBoards,
          'Todas as unidades (2 Rodadas)'
        );
      }
    }

    // Spell 4: Voto dos Caídos [Lenta] - Escolha uma unidade inimiga para ser Atordoada por 1 rodada
    else if (
      card.templateId === 'm_voto_caidos' ||
      card.templateId === 'm_voto_dos_caidos' ||
      card.name.toLowerCase().includes('voto dos caídos') ||
      card.name.toLowerCase().includes('voto dos caidos')
    ) {
      const candidates = enemy.board.filter((c) => c.hp > 0 && !c.conditions.has('imunidade'));
      if (candidates.length === 0) {
        if (isInteractiveUser) addLog(`O adversário (${enemy.name}) não possui unidades em campo para atordoar.`, 'info');
        return;
      }
      const enemySide = isPlayer ? 'opponent' : 'player';
      if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: 'Voto dos Caídos - Atordoamento',
          description: `Escolha uma unidade inimiga de ${enemy.name} para ficar Atordoada por 1 rodada:`,
          candidates,
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            finalizeSpell(
              `Voto dos Caídos: ${target.name} foi Atordoada e não poderá agir nesta rodada!`,
              () => {
                triggerSkillVfx('m_voto_caidos', enemySide, target.instanceId, target.name);
                if (target.conditions.has('imunidade')) {
                  addLog(`🌟 [IMUNIDADE] ${target.name} bloqueou o atordoamento de Voto dos Caídos!`, 'spell');
                  return;
                }
                target.conditions.add('atordoado');
                setCardConditionSource(target, 'atordoado', 'habilidade', card.name);
              },
              target.name,
              target.instanceId
            );
          },
        });
        return;
      } else {
        const target = [...candidates].sort((a, b) => (b.atk + b.power) - (a.atk + a.power))[0];
        finalizeSpell(
          `${opponent.name} atordoou ${target.name} com Voto dos Caídos!`,
          () => {
            triggerSkillVfx('m_voto_caidos', enemySide, target.instanceId, target.name);
            if (target.conditions.has('imunidade')) {
              addLog(`🌟 [IMUNIDADE] ${target.name} bloqueou o atordoamento de Voto dos Caídos!`, 'spell');
              return;
            }
            target.conditions.add('atordoado');
            setCardConditionSource(target, 'atordoado', 'habilidade', card.name);
          },
          target.name,
          target.instanceId
        );
      }
    }

    // Spell 5: Chamado da Vitória [Lenta] - Invoca 3 cartas aleatórias do baralho para a mesa (ignora limite de Tier) e ativa seus efeitos
    else if (
      card.templateId === 'm_chamado_vitoria' ||
      card.templateId === 'm_chamado_da_vitoria' ||
      card.name.toLowerCase().includes('chamado da vitória') ||
      card.name.toLowerCase().includes('chamado da vitoria')
    ) {
      const executeChamado = () => {
        const allySide = isPlayer ? 'player' : 'opponent';
        triggerSkillVfx('m_chamado_vitoria', allySide, undefined, `Mesa de ${caster.name}`);
        const currentCaster = isPlayer ? playerRef.current : opponentRef.current;
        const unitsInDeck = currentCaster.deck.filter((c) => c.type === 'unit');
        const maxSlots = currentCaster.maxBoardSlots ?? 5;
        const availableSlots = Math.max(0, maxSlots - currentCaster.board.length);
        const summonedCards = unitsInDeck.slice(0, Math.min(3, availableSlots));
        if (summonedCards.length > 0) {
          const remainingDeck = currentCaster.deck.filter((c) => !summonedCards.includes(c));
          let existingBoard = [...currentCaster.board];
          let incomingCards = [...summonedCards];
          const lizSummoned = incomingCards.find((c) => c.templateId === 'g_rainha_liz');
          if (lizSummoned) {
            existingBoard = existingBoard.map((c) => withAddedPowerPoints(c, 15));
            incomingCards = incomingCards.map((c) => withAddedPowerPoints(c, 15));
            sound.playSpell();
            addLog(
              `👑 Rainha Liz (invocada por Chamado da Vitória) concedeu +15 de Poder a todas as unidades aliadas na mesa!`,
              'spell'
            );
          }

          if (votoSilencioActive || votoSilencioRoundsRef.current > 0) {
            incomingCards = incomingCards.map((c) => {
              const isImmortalDeity =
                ((c.templateId === 'n_o_sol' || c.name.trim().toLowerCase().startsWith('o sol')) && c.level === 2) ||
                ((c.templateId === 'g_a_lua' || c.name.trim().toLowerCase().startsWith('a lua')) && c.level === 2);
              if (c.conditions.has('imunidade') || (c.immunedRounds != null && c.immunedRounds > 0) || isImmortalDeity) {
                return c;
              }
              const clone: CardInstance = {
                ...c,
                votoSilencioSavedPower: c.votoSilencioSavedPower !== undefined ? c.votoSilencioSavedPower : c.power,
                peakPower: c.votoSilencioSavedPower !== undefined ? c.votoSilencioSavedPower : c.power,
                votoSilencioRoundsRemaining: Math.max(1, votoSilencioRoundsRef.current),
                power: 0,
                conditions: new Set(c.conditions),
                conditionSources: c.conditionSources ? { ...c.conditionSources } : undefined,
              };
              syncClassPowerBonuses(clone);
              return clone;
            });
          }

          const updatedBoard = [...existingBoard, ...incomingCards];
          if (isPlayer) {
            setPlayer((p) => ({
              ...p,
              deck: remainingDeck,
              board: updatedBoard,
            }));
          } else {
            setOpponent((o) => ({
              ...o,
              deck: remainingDeck,
              board: updatedBoard,
            }));
          }

          incomingCards.forEach((sc, idx) => {
            setTimeout(() => {
              triggerCardOnSummonEffects(sc, ownerId, true, updatedBoard);
            }, idx * 150);
          });

          addLog(
            `Chamado da Vitória convocou ${incomingCards.map((c) => c.name).join(', ')} diretamente do baralho para o campo!`,
            'spell'
          );
        } else {
          addLog('Chamado da Vitória foi resolvido, mas não havia unidades no baralho ou espaço disponível na mesa.', 'info');
        }
      };

      finalizeSpell(
        `Chamado da Vitória ativado por ${caster.name}!`,
        executeChamado,
        '3 unidades do baralho'
      );
    }

    // Spell 6: Jurisdição de Saniel [Lenta - Tier 4] (antigo Bloqueio)
    else if (
      card.templateId === 'n_jurisdicao_de_saniel' ||
      card.templateId === 'n_bloqueio' ||
      card.name.toLowerCase().includes('jurisdição') ||
      card.name.toLowerCase().includes('jurisdicao') ||
      card.name.toLowerCase().includes('bloqueio')
    ) {
      if (enemy.board.length === 0) {
        if (isInteractiveUser) addLog(`O adversário (${enemy.name}) não possui unidades em campo para silenciar.`, 'info');
        return;
      }

      const enemySetter = isPlayer ? setOpponent : setPlayer;
      const enemySide = isPlayer ? 'opponent' : 'player';

      const applyJurisdicaoSilence = (target: CardInstance): { stoppedByImmunity: boolean } => {
        triggerSkillVfx('n_jurisdicao_de_saniel', enemySide, target.instanceId, target.name);
        const isImmortalSolLvl2 = isOSolLevel2Immortal(target);
        const isImmortalLuaLvl2 = isALuaLevel2Supreme(target);
        const hasImmunity =
          isImmortalSolLvl2 ||
          isImmortalLuaLvl2 ||
          target.conditions.has('imunidade') ||
          (target.immunedRounds != null && target.immunedRounds > 0);

        if (hasImmunity) {
          return { stoppedByImmunity: true };
        }

        const tpl = CARD_TEMPLATES.find((t) => t.id === target.templateId);
        target.silencedRounds = 2;
        target.atk = tpl ? tpl.atk : target.baseAtk;
        target.baseAtk = tpl ? tpl.atk : target.baseAtk;
        target.baseDef = tpl ? tpl.def : target.baseDef;
        target.def = Math.min(target.def, target.baseDef);
        target.icePeakDefense = Math.max(target.def, target.baseDef);
        target.icePowerDefGranted = 0;
        target.teluricoPowerHpGranted = 0;
        target.teluricoPowerDefGranted = 0;
        target.neutroPowerHpGranted = 0;
        target.neutroPowerAtkGranted = 0;
        target.neutroPowerDefGranted = 0;
        target.votoSilencioSavedPower = undefined;
        target.votoSilencioRoundsRemaining = 0;
        target.votoSilencioTeluricoBonusRemoved = undefined;
        target.votoSilencioTeluricoHpRemoved = undefined;
        target.votoSilencioTeluricoDefBonusRemoved = undefined;
        target.votoSilencioTeluricoDefRemoved = undefined;
        target.votoSilencioGeloBonusRemoved = undefined;
        target.votoSilencioGeloDefRemoved = undefined;
        target.votoSilencioNeutroHpBonusRemoved = undefined;
        target.votoSilencioNeutroHpRemoved = undefined;
        target.votoSilencioNeutroAtkBonusRemoved = undefined;
        target.votoSilencioNeutroAtkRemoved = undefined;
        target.votoSilencioNeutroDefBonusRemoved = undefined;
        target.votoSilencioNeutroDefRemoved = undefined;

        if (tpl && (hasCardClass(target, 'Telúrico') || hasCardClass(target, 'Neutro'))) {
          target.maxHp = tpl.hp;
          target.hp = Math.min(target.hp, tpl.hp);
        }

        if (tpl) {
          target.basePower = tpl.power;
        }
        target.power = 0;

        target.powerAlwaysActive = false;
        target.doublePower = false;
        target.hasDoubleAttack = false;
        target.hasLifeSteal = false;
        target.burnTurnsRemaining = 0;
        target.curaTurnsRemaining = 0;
        target.entorpecerRoundsRemaining = 0;
        target.sleepRoundsRemaining = 0;
        target.asleepState = false;
        target.barreiraRoundsRemaining = 0;
        target.tenacidadeRoundsRemaining = 0;
        target.doubleAttackRoundsRemaining = 0;
        target.lifeStealRoundsRemaining = 0;
        target.corrosaoRoundsRemaining = 0;
        target.sangramentoRoundsRemaining = 0;
        target.sangramentoMarks = 0;
        // Se a unidade silenciada por Jurisdição de Saniel estava mantendo uma unidade presa (ex: Barelio),
        // a unidade presa é imediatamente salva e retorna viva para a mesa!
        const rescuedFromChains = target.imprisonedUnit;
        const rescuedOwner = target.imprisonedOriginalOwner || (isPlayer ? 'player' : 'opponent');
        target.imprisonedUnit = undefined;
        target.imprisonedOriginalOwner = undefined;
        removePragaFromUnit(target);

        target.conditions.clear();
        target.conditionSources = {
          silencio: { kind: 'habilidade', sourceName: card.name },
        };

        enemySetter((prevEnemy) => ({
          ...prevEnemy,
          board: prevEnemy.board.map((c) =>
            c.instanceId === target.instanceId
              ? {
                  ...target,
                  conditions: new Set(target.conditions),
                  conditionSources: target.conditionSources ? { ...target.conditionSources } : undefined,
                }
              : c
          ),
        }));

        if (rescuedFromChains && rescuedFromChains.hp > 0) {
          const restoredPrisoner: CardInstance = {
            ...rescuedFromChains,
            conditions: new Set(rescuedFromChains.conditions),
            conditionSources: rescuedFromChains.conditionSources
              ? { ...rescuedFromChains.conditionSources }
              : undefined,
          };
          const rescueSetter = rescuedOwner === 'player' ? setPlayer : setOpponent;
          rescueSetter((prev) => ({
            ...prev,
            board: prev.board.some((b) => b.instanceId === restoredPrisoner.instanceId)
              ? prev.board
              : [...prev.board, restoredPrisoner],
          }));
          addLog(
            `⛓️🔓 [SALVO PELA JURISDIÇÃO DE SANIEL!] O silenciamento de ${target.name} quebrou as correntes e libertou ${restoredPrisoner.name} de volta para a mesa!`,
            'spell'
          );
        }

        return { stoppedByImmunity: false };
      };

      if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: 'Jurisdição de Saniel - Silenciamento Absoluto (Tier 4)',
          description: `Escolha uma unidade inimiga de ${enemy.name} para silenciar Efeitos Únicos, Requisitos de Nível, Efeitos de Classe e Condições por 2 rodadas:`,
          candidates: enemy.board,
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            finalizeSpell(
              `Jurisdição de Saniel lançada sobre ${target.name}!`,
              () => {
                const { stoppedByImmunity } = applyJurisdicaoSilence(target);
                if (stoppedByImmunity) {
                  addLog(`🌟 [IMUNIDADE] Jurisdição de Saniel foi parada pelo efeito Imunidade ativo em ${target.name}!`, 'spell');
                } else {
                  addLog(`🔇 Jurisdição de Saniel: ${target.name} foi completamente silenciado por 2 rodadas!`, 'spell');
                }
              },
              target.name,
              target.instanceId
            );
          },
        });
        return;
      } else {
        const nonImmune = enemy.board.filter(
          (c) => !c.conditions.has('imunidade') && !(c.immunedRounds && c.immunedRounds > 0)
        );
        const pool = nonImmune.length > 0 ? nonImmune : enemy.board;
        const target = [...pool].sort((a, b) => (b.atk + b.power) - (a.atk + a.power))[0];
        finalizeSpell(
          `${opponent.name} lançou Jurisdição de Saniel em ${target.name}!`,
          () => {
            const { stoppedByImmunity } = applyJurisdicaoSilence(target);
            if (stoppedByImmunity) {
              addLog(`🌟 [IMUNIDADE] Jurisdição de Saniel em ${target.name} foi parada pelo efeito Imunidade!`, 'spell');
            } else {
              addLog(`🔇 ${opponent.name} silenciou ${target.name} com Jurisdição de Saniel por 2 rodadas!`, 'spell');
            }
          },
          target.name,
          target.instanceId
        );
      }
    }

    // Spell 7: Soberania [Rápida] - Concede 15 de Ataque + 15 de Defesa a uma unidade a escolha pelo resto do combate
    else if (card.templateId === 'g_soberania' || card.name.toLowerCase().includes('soberania')) {
      if (caster.board.length === 0) {
        if (isInteractiveUser) addLog(`Você precisa de pelo menos uma unidade em campo de ${caster.name} para usar Soberania.`, 'info');
        return;
      }
      const allySide = isPlayer ? 'player' : 'opponent';
      if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: 'Soberania - Poder Absoluto',
          description: `Escolha uma unidade aliada de ${caster.name} para conceder +15 de Ataque e +15 de Defesa permanentemente:`,
          candidates: caster.board,
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            finalizeSpell(
              `👑 Soberania ativada: ${target.name} recebeu +15 de Ataque e +15 de Defesa pelo resto do combate!`,
              () => {
                triggerSkillVfx('g_soberania', allySide, target.instanceId, target.name);
                target.atk += 15;
                target.baseAtk += 15;
                addDefensePoints(target, 15);
              },
              target.name,
              target.instanceId
            );
          },
        });
        return;
      } else {
        const target = [...caster.board].sort((a, b) => (b.atk + b.def) - (a.atk + a.def))[0];
        finalizeSpell(
          `${opponent.name} concedeu +15 de Ataque e +15 de Defesa a ${target.name} com Soberania!`,
          () => {
            triggerSkillVfx('g_soberania', allySide, target.instanceId, target.name);
            target.atk += 15;
            target.baseAtk += 15;
            addDefensePoints(target, 15);
          },
          target.name,
          target.instanceId
        );
      }
    }

    // Spell 8: Escolhido das Estrelas [Lenta]
    else if (
      card.templateId === 'n_escolhido_estrelas' ||
      card.templateId === 'n_escolhido_das_estrelas' ||
      card.name.toLowerCase().includes('escolhido das estrelas')
    ) {
      const eligibleTier5OnBoard = caster.board.filter(
        (c) =>
          c.tier === 5 &&
          c.templateId !== 'n_o_sol' &&
          c.templateId !== 'g_a_lua' &&
          !c.name.trim().toLowerCase().startsWith('o sol') &&
          !c.name.trim().toLowerCase().startsWith('a lua') &&
          c.level === 1 &&
          c.hp > 0 &&
          c.silencedRounds === 0
      );

      if (eligibleTier5OnBoard.length === 0) {
        if (isInteractiveUser) {
          const hasSilencedTier5 = caster.board.some(
            (c) =>
              c.tier === 5 &&
              c.templateId !== 'n_o_sol' &&
              c.templateId !== 'g_a_lua' &&
              !c.name.trim().toLowerCase().startsWith('o sol') &&
              !c.name.trim().toLowerCase().startsWith('a lua') &&
              c.level === 1 &&
              c.hp > 0 &&
              c.silencedRounds > 0
          );
          const hasSolOrLuaLvl1 = caster.board.some(
            (c) =>
              (c.templateId === 'n_o_sol' ||
                c.templateId === 'g_a_lua' ||
                c.name.trim().toLowerCase().startsWith('o sol') ||
                c.name.trim().toLowerCase().startsWith('a lua')) &&
              c.level === 1 &&
              c.hp > 0
          );
          if (hasSilencedTier5) {
            sound.playDiscard();
            addLog(
              `🔇 [SILÊNCIO] Unidades silenciadas não podem subir de nível até o efeito de Silêncio acabar — nem mesmo com Escolhido das Estrelas!`,
              'info'
            );
          } else if (hasSolOrLuaLvl1) {
            sound.playDiscard();
            addLog(
              `☀️🌙 O Sol e A Lua não podem subir de nível com Escolhido das Estrelas! Eles só sobem de nível cumprindo seus próprios requisitos (ver Lunário ou Hélio ser eliminado).`,
              'info'
            );
          } else {
            addLog(
              `Nenhuma unidade elegível de Tier 5 em Nível 1 na mesa de ${caster.name} para ascender com Escolhido das Estrelas.`,
              'info'
            );
          }
        }
        return;
      }

      const allySide = isPlayer ? 'player' : 'opponent';
      const promoteTier5Unit = (target: CardInstance) => {
        triggerSkillVfx('n_escolhido_estrelas', allySide, target.instanceId, target.name);
        target.level = 2;
        if (target.templateId === 'g_barao_well' || target.name.toLowerCase().includes('well')) {
          target.conditions.add('cura');
          target.conditions.add('roubo_de_vida');
          setCardConditionSource(target, 'cura', 'efeito_unico_proprio', target.name);
          setCardConditionSource(target, 'roubo_de_vida', 'efeito_unico_proprio', target.name);
          target.hasLifeSteal = true;
          target.healingAmount = 9;
        } else if (target.templateId === 'm_licia' || target.name.toLowerCase().includes('licia')) {
          target.conditions.add('furtividade');
          target.conditions.add('etereo');
          setCardConditionSource(target, 'furtividade', 'efeito_unico_proprio', target.name);
          setCardConditionSource(target, 'etereo', 'efeito_unico_proprio', target.name);
          target.exclusiveName = 'Guardiã do Véu';
          target.effectDescription =
            'Lendária [Tier 5 - Nível 2]. Ao subir de nível, compartilha seu valor de PODER atual e entrega Furtivo a todas as unidades aliadas na mesa! Concede +10 de PODER a todas as unidades furtivas a cada nova rodada e possui o efeito exclusivo ETÉREO (só pode ser defendida por outra unidade ETÉREA).';
          const sharedPower = getBonusPowerValue(target);
          caster.board.forEach((ally) => {
            if (ally.instanceId !== target.instanceId && ally.hp > 0) {
              addPowerPoints(ally, sharedPower);
            }
            if (ally.hp > 0) {
              ally.conditions.add('furtividade');
              if (ally.instanceId !== target.instanceId) {
                setCardConditionSource(ally, 'furtividade', 'unidade_compartilhada', target.name);
              }
            }
          });
          setTimeout(() => {
            triggerSkillVfx('cond_etereo', allySide, target.instanceId, target.name);
          }, 260);
          addLog(
            `🧚‍♀️ ASCENSÃO FÉRICA! Licia subiu para o NÍVEL 2! Recebeu ETÉREO, compartilhou +${sharedPower} de Poder e entregou Furtivo a todos os aliados em campo!`,
            'spell'
          );
        } else if (target.templateId === 'g_craff' || target.name.toLowerCase().includes('craff')) {
          target.exclusiveName = 'Presença Rúnica & Rochedo';
          target.effectDescription =
            'Lendária [Tier 5 - Nível 2]. Presença Rúnica: Enquanto Craff estiver em campo permite invocar +1 carta por rodada (limite 3). Sempre que o jogador invocar a 3ª carta na mesma rodada com Craff Nível 2 na mesa, gera um Rochedo.';
        } else if (target.templateId === 'm_titano' || target.name.toLowerCase().includes('titano')) {
          target.conditions.add('ataque_duplo');
          target.hasDoubleAttack = true;
          setCardConditionSource(target, 'ataque_duplo', 'passiva_propria', target.name);
          addPowerPoints(target, 20);
          target.exclusiveName = 'Carrasco dos Mares & Sangramento';
          target.effectDescription =
            'Lendária [Tier 5 - Nível 2]. Possui Ataque-Duplo. Recebe +20 de poder e pode causar Sangramento permanentemente.\nPassiva: Causar dano em unidades afetadas por SANGRAMENTO concede CURA a Titano por 2 rodadas.';
        } else if (target.templateId === 'n_helio' || target.name.toLowerCase().includes('helio') || target.name.toLowerCase().includes('hélio')) {
          target.name = 'Hélio, o Arauto do Sol Cósmico';
          target.exclusiveName = 'Fúria Solar';
          target.effectDescription =
            'Lendária [Tier 5 - Nível 2]. Caso seja a única unidade designada em um ATAQUE, DOBRA seu valor de ATAQUE. Se eliminar uma unidade defensora, se cura em 10 de Resistência (priorizando a Vida e depois a Defesa).';
        } else if (target.templateId === 'g_lunario' || target.name.toLowerCase().includes('lunario')) {
          target.name = 'Lunario, Emissário Cósmico Supremo';
          target.exclusiveName = 'Devorador de Sonhos';
          target.effectDescription =
            'Lendária [Tier 5 - Nível 2]. No início de cada nova rodada, consome o efeito SONO de todas as unidades na mesa. Ganha +5/+5 de Sapiência e Poder por cada SONO consumido e causa 7 de dano à Resistência da unidade afetada.';
        } else if (target.templateId === 'm_bonetrus' || target.name.toLowerCase().includes('bonetrus')) {
          target.name = 'Bonetrus, Soberano do Inverno';
          target.exclusiveName = 'Devastação Glacial';
          target.effectDescription =
            'Lendária [Tier 5 - Nível 2 - Musmo]. Ao atacar inimigos afligidos por CONGELAR os executam caso tenha 12 ou menos de Vida. Se Bonetrus for designado sozinho para um ataque ele causa dano em TODAS as unidades da mesa inimiga além da carta que defende seu ataque (100% no defensor, 50% nas demais).';
        } else if (target.templateId === 'g_kaliel' || target.name.toLowerCase().includes('kaliel')) {
          target.exclusiveName = 'Comunhão Angiris';
          target.effectDescription =
            'Lendária [Tier 5 - Nível 2]. Ao subir de nível gera um "Filho da Luz" FUGAZ na mão. Enquanto Kaliel estiver na mesa, todos os Arcanjos aliados em campo compartilham entre si os maiores valores atuais de cada atributo e todas as suas condições benéficas e de combate!';
          const filhoTpl = CARD_TEMPLATES.find((t) => t.id === 'token_filho_da_luz');
          const casterSetter = isPlayer ? setPlayer : setOpponent;
          casterSetter((prev) => {
            const nextBoard = prev.board.map((u) =>
              u.instanceId === target.instanceId
                ? {
                    ...u,
                    level: 2 as const,
                    exclusiveName: target.exclusiveName,
                    effectDescription: target.effectDescription,
                  }
                : u
            );
            let nextHand = prev.hand;
            if (filhoTpl && prev.hand.length < 8) {
              const token = createCardInstance(filhoTpl);
              token.isFugaz = true;
              token.isGeneratedCard = true;
              nextHand = [...prev.hand, token];
            }
            return { ...prev, board: nextBoard, hand: nextHand };
          });
          if (filhoTpl) {
            addLog(`🪽✨ [Kaliel Nível 2] Gerou "Filho da Luz" (Fugaz) na mão!`, 'spell');
          }
        }
        triggerLevelUpCinematic(
          target,
          `Ascendido ao NÍVEL 2 pelo poder celestial de Escolhido das Estrelas!\n${getDefaultAwakenedPowerText(target)}`
        );
      };

      if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: 'Escolhido das Estrelas - Ascensão Celestial',
          description: `Escolha uma unidade de TIER 5 em campo de ${caster.name} para subir ao Nível 2 imediatamente (não aplicável a O Sol ou A Lua):`,
          candidates: eligibleTier5OnBoard,
          onSelect: (chosenCard) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            finalizeSpell(
              `✨ Escolhido das Estrelas! Concedeu a ${chosenCard.name} (Tier ${chosenCard.tier}) ascensão imediata para o NÍVEL 2!`,
              () => promoteTier5Unit(chosenCard),
              chosenCard.name,
              chosenCard.instanceId
            );
          },
        });
        return;
      } else {
        const chosenCard = eligibleTier5OnBoard[0];
        finalizeSpell(
          `${opponent.name} ascendeu ${chosenCard.name} (Tier ${chosenCard.tier}) para o Nível 2 com Escolhido das Estrelas!`,
          () => promoteTier5Unit(chosenCard),
          chosenCard.name,
          chosenCard.instanceId
        );
      }
    }

    // Spell 9: Rochedo [Fugaz - Rápida]
    else if (card.templateId === 'g_rochedo' || card.name.toLowerCase().includes('rochedo')) {
      const aliveEnemies = enemy.board.filter((c) => c.hp > 0);
      if (aliveEnemies.length === 0) {
        if (isInteractiveUser) addLog(`O adversário (${enemy.name}) não possui unidades em campo para atingir com Rochedo.`, 'info');
        return;
      }

      const enemySide = isPlayer ? 'opponent' : 'player';

      const applyRochedo = (target: CardInstance) => {
        triggerSkillVfx('g_rochedo', enemySide, target.instanceId, target.name);
        if (target.conditions.has('imunidade')) {
          addLog(`🌟 [IMUNIDADE] ${target.name} bloqueou o impacto de Rochedo!`, 'spell');
          return;
        }

        if (target.conditions.has('barreira')) {
          target.conditions.delete('barreira');
          removeCardConditionSource(target, 'barreira');
          addLog(`🛡️🪨 [Rochedo] ${target.name} absorveu o impacto de Rochedo com sua Barreira!`, 'spell');
          return;
        }

        let damage = 20;
        if (target.conditions.has('congelado')) damage = Math.round(damage * 1.5);
        if (target.conditions.has('tenacidade')) damage = Math.max(0, Math.round(damage * 0.65));
        if (target.def >= damage) {
          target.def -= damage;
        } else {
          const rem = damage - target.def;
          target.def = 0;
          target.hp = Math.max(0, target.hp - rem);
        }
        target.atk = Math.max(0, Math.round(target.atk * 0.75));
        target.baseAtk = Math.max(0, Math.round(target.baseAtk * 0.75));
        sound.playClash();

        if (target.hp <= 0) {
          addLog(`🪨 [Rochedo] Atingiu ${target.name} com 20 de dano à Resistência e a unidade pereceu!`, 'kill');
          const enemySetter = isPlayer ? setOpponent : setPlayer;
          enemySetter((prevEnemy) => ({
            ...prevEnemy,
            board: prevEnemy.board.filter((c) => c.instanceId !== target.instanceId),
            graveyard: [...prevEnemy.graveyard, target],
          }));
          triggerPhilioEliminationBonus(isPlayer ? 'player' : 'opponent', 1);
        } else {
          addLog(
            `🪨 [Rochedo] Atingiu ${target.name}: 20 de dano sofrido (Vida ${target.hp}/${target.maxHp}, Defesa ${target.def}) e Ataque reduzido em 25% (novo Ataque: ${target.atk})!`,
            'spell'
          );
        }
      };

      if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: 'Rochedo - Impacto Telúrico (Fugaz)',
          description: `Escolha uma unidade inimiga de ${enemy.name} para receber 20 de dano e ter seu Ataque reduzido em 25%:`,
          candidates: aliveEnemies,
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            finalizeSpell(
              `Rochedo atingiu ${target.name}!`,
              () => applyRochedo(target),
              target.name,
              target.instanceId
            );
          },
        });
        return;
      } else {
        const target = [...aliveEnemies].sort((a, b) => (b.atk + b.power) - (a.atk + a.power))[0];
        finalizeSpell(
          `${opponent.name} lançou Rochedo contra ${target.name}!`,
          () => applyRochedo(target),
          target.name,
          target.instanceId
        );
      }
    }

    // Spell 10: Destreza [Rápida]
    else if (card.templateId === 'n_destreza' || card.name.toLowerCase().includes('destreza')) {
      const aliveAllies = caster.board.filter((c) => c.hp > 0);
      if (aliveAllies.length === 0) {
        if (isInteractiveUser) addLog(`Você não possui unidades em campo de ${caster.name} para conceder Destreza.`, 'info');
        return;
      }
      const allySide = isPlayer ? 'player' : 'opponent';

      const applyDestreza = (target: CardInstance) => {
        triggerSkillVfx('n_destreza', allySide, target.instanceId, target.name);
        target.conditions.add('ataque_duplo');
        setCardConditionSource(target, 'ataque_duplo', 'habilidade', card.name);
        target.hasDoubleAttack = true;
        target.doubleAttackRoundsRemaining = 1;
        sound.playSpell();
        addLog(`⚡ [Destreza] ${target.name} recebeu ATAQUE-DUPLO por 1 rodada!`, 'spell');
      };

      if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: 'Destreza - Velocidade Extrema',
          description: `Escolha uma unidade aliada de ${caster.name} para receber Ataque-Duplo por uma rodada:`,
          candidates: aliveAllies,
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            finalizeSpell(
              `Destreza concedeu Ataque-Duplo a ${target.name} por 1 rodada!`,
              () => applyDestreza(target),
              target.name,
              target.instanceId
            );
          },
        });
        return;
      } else {
        const target = [...aliveAllies].sort((a, b) => (b.atk + b.power) - (a.atk + a.power))[0];
        finalizeSpell(
          `${opponent.name} concedeu Ataque-Duplo a ${target.name} com Destreza!`,
          () => applyDestreza(target),
          target.name,
          target.instanceId
        );
      }
    }

    // Spell 11: Voto das Estrelas [Rápida]
    else if (card.templateId === 'n_voto_estrelas' || card.name.toLowerCase().includes('voto das estrelas')) {
      const aliveAllies = caster.board.filter((c) => c.hp > 0);
      if (aliveAllies.length === 0) {
        if (isInteractiveUser) addLog(`Você não possui unidades em campo de ${caster.name} para conceder Barreira.`, 'info');
        return;
      }
      const allySide = isPlayer ? 'player' : 'opponent';

      const applyBarreira = (target: CardInstance) => {
        const isIceTarget = target.templateId === 'g_aurora' || target.element === 'Gelo';
        triggerSkillVfx('n_voto_estrelas', allySide, target.instanceId, target.name, isIceTarget);
        target.conditions.add('barreira');
        setCardConditionSource(target, 'barreira', 'habilidade', card.name);
        target.barreiraRoundsRemaining = 1;
        sound.playSpell();
        addLog(
          isIceTarget
            ? `❄️🛡️ [Voto das Estrelas] ${target.name} recebeu BARREIRA DE GELO por 1 rodada!`
            : `🛡️✨ [Voto das Estrelas] ${target.name} recebeu a condição BARREIRA por 1 rodada!`,
          'spell'
        );
      };

      if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: 'Voto das Estrelas - Barreira Celestial',
          description: `Escolha uma unidade aliada de ${caster.name} para receber Barreira por uma rodada (bloqueia o próximo dano sofrido):`,
          candidates: aliveAllies,
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            finalizeSpell(
              `Voto das Estrelas concedeu Barreira a ${target.name}!`,
              () => applyBarreira(target),
              target.name,
              target.instanceId
            );
          },
        });
        return;
      } else {
        const target = [...aliveAllies].sort((a, b) => (b.atk + b.power) - (a.atk + a.power))[0];
        finalizeSpell(
          `${opponent.name} concedeu Barreira a ${target.name} com Voto das Estrelas!`,
          () => applyBarreira(target),
          target.name,
          target.instanceId
        );
      }
    }

    // Spell 12: Letargia Lunar [Lenta]
    else if (card.templateId === 'm_letargia_lunar' || card.name.toLowerCase().includes('letargia lunar')) {
      const enemyCandidates = enemy.board.filter((c) => c.hp > 0 && !c.conditions.has('imunidade'));
      if (enemyCandidates.length === 0) {
        if (isInteractiveUser) addLog(`O adversário (${enemy.name}) não possui unidades vulneráveis a Sono em campo.`, 'info');
        return;
      }

      const casterSetter = isPlayer ? setPlayer : setOpponent;
      const enemySide = isPlayer ? 'opponent' : 'player';

      if (isInteractiveUser) {
        if (enemyCandidates.length === 1) {
          const t1 = enemyCandidates[0];
          finalizeSpell(
            `Letargia Lunar: ${t1.name} entrou em SONO por 1 rodada! (Reincide em 2 rodadas)`,
            () => {
              triggerSkillVfx('m_letargia_lunar', enemySide, t1.instanceId, t1.name);
              if (!t1.conditions.has('imunidade')) {
                t1.conditions.add('dormindo');
                setCardConditionSource(t1, 'dormindo', 'habilidade', card.name);
                t1.sleepRoundsRemaining = 1;
              }
              casterSetter((p) => ({
                ...p,
                scheduledLetargia: [...(p.scheduledLetargia || []), { targetIds: [t1.instanceId], roundsRemaining: 2 }],
              }));
            },
            t1.name,
            t1.instanceId
          );
        } else {
          setTargetModal({
            isOpen: true,
            title: 'Letargia Lunar - Sono Cósmico (1/2)',
            description: `Escolha a 1ª unidade de ${enemy.name} para aplicar SONO:`,
            candidates: enemyCandidates,
            onSelect: (firstTarget) => {
              const remainingCandidates = enemyCandidates.filter((c) => c.instanceId !== firstTarget.instanceId);
              if (remainingCandidates.length > 0) {
                setTimeout(() => {
                  setTargetModal({
                    isOpen: true,
                    title: 'Letargia Lunar - Sono Cósmico (2/2)',
                    description: `Escolha a 2ª unidade de ${enemy.name} para aplicar SONO:`,
                    candidates: remainingCandidates,
                    onSelect: (secondTarget) => {
                      setTargetModal((prev) => ({ ...prev, isOpen: false }));
                      finalizeSpell(
                        `Letargia Lunar: ${firstTarget.name} e ${secondTarget.name} entraram em SONO por 1 rodada! (Reincide em 2 rodadas)`,
                        () => {
                          triggerSkillVfx(
                            'm_letargia_lunar',
                            enemySide,
                            firstTarget.instanceId,
                            `${firstTarget.name} & ${secondTarget.name}`
                          );
                          if (!firstTarget.conditions.has('imunidade')) {
                            firstTarget.conditions.add('dormindo');
                            setCardConditionSource(firstTarget, 'dormindo', 'habilidade', card.name);
                            firstTarget.sleepRoundsRemaining = 1;
                          }
                          if (!secondTarget.conditions.has('imunidade')) {
                            secondTarget.conditions.add('dormindo');
                            setCardConditionSource(secondTarget, 'dormindo', 'habilidade', card.name);
                            secondTarget.sleepRoundsRemaining = 1;
                          }
                          casterSetter((p) => ({
                            ...p,
                            scheduledLetargia: [
                              ...(p.scheduledLetargia || []),
                              { targetIds: [firstTarget.instanceId, secondTarget.instanceId], roundsRemaining: 2 },
                            ],
                          }));
                        },
                        `${firstTarget.name} e ${secondTarget.name}`,
                        firstTarget.instanceId
                      );
                    },
                  });
                }, 200);
              } else {
                setTargetModal((prev) => ({ ...prev, isOpen: false }));
                finalizeSpell(
                  `Letargia Lunar: ${firstTarget.name} entrou em SONO por 1 rodada! (Reincide em 2 rodadas)`,
                  () => {
                    triggerSkillVfx('m_letargia_lunar', enemySide, firstTarget.instanceId, firstTarget.name);
                    if (!firstTarget.conditions.has('imunidade')) {
                      firstTarget.conditions.add('dormindo');
                      setCardConditionSource(firstTarget, 'dormindo', 'habilidade', card.name);
                      firstTarget.sleepRoundsRemaining = 1;
                    }
                    casterSetter((p) => ({
                      ...p,
                      scheduledLetargia: [...(p.scheduledLetargia || []), { targetIds: [firstTarget.instanceId], roundsRemaining: 2 }],
                    }));
                  },
                  firstTarget.name,
                  firstTarget.instanceId
                );
              }
            },
          });
          return;
        }
      } else {
        const sorted = [...enemyCandidates].sort((a, b) => (b.atk + b.power) - (a.atk + a.power));
        const t1 = sorted[0];
        const t2 = sorted[1];
        const targetIds = [t1?.instanceId, t2?.instanceId].filter(Boolean) as string[];
        finalizeSpell(
          `${opponent.name} lançou Letargia Lunar aplicando SONO em ${targetIds.length} unidade(s) inimiga(s)!`,
          () => {
            triggerSkillVfx(
              'm_letargia_lunar',
              enemySide,
              t1?.instanceId,
              [t1?.name, t2?.name].filter(Boolean).join(' & ')
            );
            if (t1 && !t1.conditions.has('imunidade')) {
              t1.conditions.add('dormindo');
              setCardConditionSource(t1, 'dormindo', 'habilidade', card.name);
              t1.sleepRoundsRemaining = 1;
            }
            if (t2 && !t2.conditions.has('imunidade')) {
              t2.conditions.add('dormindo');
              setCardConditionSource(t2, 'dormindo', 'habilidade', card.name);
              t2.sleepRoundsRemaining = 1;
            }
            setOpponent((o) => ({
              ...o,
              scheduledLetargia: [...(o.scheduledLetargia || []), { targetIds, roundsRemaining: 2 }],
            }));
          },
          [t1?.name, t2?.name].filter(Boolean).join(' e ')
        );
      }
    }

    // Spell 13: Fagulha Estelar [Fugaz - Rápida]
    else if (card.templateId === 'token_fagulha_estelar' || card.name.toLowerCase().includes('fagulha estelar')) {
      const enemyCandidates = enemy.board.filter((c) => c.hp > 0);
      if (enemyCandidates.length === 0) {
        if (isInteractiveUser) addLog(`O adversário (${enemy.name}) não possui unidades em campo para alvejar com Fagulha Estelar.`, 'info');
        return;
      }

      const enemySide = isPlayer ? 'opponent' : 'player';

      const fireStars = (target: CardInstance) => {
        triggerSkillVfx('token_fagulha_estelar', enemySide, target.instanceId, target.name);
        if (target.conditions.has('imunidade')) {
          addLog(`🌟 [IMUNIDADE] ${target.name} bloqueou os disparos de Fagulha Estelar!`, 'spell');
          return;
        }
        setProjectileAnim({ type: 'fagulhas', targetName: target.name });
        setTimeout(() => setProjectileAnim(null), 1000);

        const applyStarDamage = (starNum: number) => {
          sound.playSpell();
          if (target.conditions.has('barreira')) {
            target.conditions.delete('barreira');
            removeCardConditionSource(target, 'barreira');
            addLog(`⭐ [Fagulha Estelar] Estrela #${starNum}: ${target.name} absorveu o impacto com sua Barreira Celestial!`, 'spell');
            return;
          }
          let starDamage = 3;
          if (target.conditions.has('congelado')) starDamage = Math.round(starDamage * 1.5);
          if (target.conditions.has('tenacidade')) starDamage = Math.max(0, Math.round(starDamage * 0.65));
          if (target.def >= starDamage) {
            target.def -= starDamage;
          } else {
            const rem = starDamage - target.def;
            target.def = 0;
            target.hp = Math.max(0, target.hp - rem);
          }
          addLog(`⭐ [Fagulha Estelar] Estrela #${starNum} atingiu ${target.name} causando ${starDamage} de dano direto! (Vida/Def: ${target.hp}/${target.def})`, 'spell');
          if (target.hp <= 0) {
            addLog(`💀 ${target.name} foi abatido pela Fagulha Estelar!`, 'kill');
            const enemySetter = isPlayer ? setOpponent : setPlayer;
            enemySetter((prevEnemy) => ({
              ...prevEnemy,
              board: prevEnemy.board.filter((c) => c.instanceId !== target.instanceId),
              graveyard: [...prevEnemy.graveyard, target],
            }));
            triggerPhilioEliminationBonus(isPlayer ? 'player' : 'opponent', 1);
          }
        };

        applyStarDamage(1);
        if (target.hp > 0) {
          applyStarDamage(2);
        }
      };

      if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: 'Fagulha Estelar - Bombardeio Sequencial',
          description: `Escolha uma unidade inimiga de ${enemy.name} para receber 2 estrelas cósmicas (3 de dano cada):`,
          candidates: enemyCandidates,
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            finalizeSpell(
              `Fagulha Estelar disparou 2 estrelas cósmicas em ${target.name}!`,
              () => fireStars(target),
              target.name,
              target.instanceId
            );
          },
        });
        return;
      } else {
        const target = [...enemyCandidates].sort((a, b) => (a.hp + a.def) - (b.hp + b.def))[0];
        finalizeSpell(
          `${opponent.name} disparou Fagulha Estelar em ${target.name}!`,
          () => fireStars(target),
          target.name,
          target.instanceId
        );
      }
    }

    // Spell 14: Flecha Elétrica [Fugaz - Rápida]
    else if (
      card.templateId === 'token_flecha_eletrica' ||
      card.name.toLowerCase().includes('flecha elétrica') ||
      card.name.toLowerCase().includes('flecha eletrica')
    ) {
      const enemyCandidates = enemy.board.filter((c) => c.hp > 0);
      if (enemyCandidates.length === 0) {
        if (isInteractiveUser) addLog(`O adversário (${enemy.name}) não possui unidades em campo para alvejar com Flecha Elétrica.`, 'info');
        return;
      }

      const enemySide = isPlayer ? 'opponent' : 'player';

      const applyFlecha = (target: CardInstance) => {
        triggerSkillVfx('token_flecha_eletrica', enemySide, target.instanceId, target.name);
        if (target.conditions.has('imunidade')) {
          addLog(`🌟 [IMUNIDADE] ${target.name} bloqueou a Flecha Elétrica!`, 'spell');
          return;
        }
        setProjectileAnim({ type: 'flecha_eletrica', targetName: target.name });
        setTimeout(() => setProjectileAnim(null), 1000);

        sound.playSpell();
        const enemySetter = isPlayer ? setOpponent : setPlayer;
        if (target.conditions.has('barreira')) {
          target.conditions.delete('barreira');
          removeCardConditionSource(target, 'barreira');
          if (!target.conditions.has('imunidade')) {
            target.conditions.add('eletrificado');
            setCardConditionSource(target, 'eletrificado', 'habilidade', card.name);
            target.eletrificadoRoundsRemaining = 1;
            queueConditionVfx([
              {
                condition: 'eletrificado',
                targetUnitId: target.instanceId,
                targetUnitName: target.name,
                targetSide: enemySide,
              },
            ]);
          }
          enemySetter((prevEnemy) => ({
            ...prevEnemy,
            board: prevEnemy.board.map((c) => {
              if (c.instanceId === target.instanceId) {
                const conds = new Set(c.conditions);
                conds.delete('barreira');
                let nextSources = withoutConditionSource(c.conditionSources, 'barreira');
                if (!conds.has('imunidade')) {
                  conds.add('eletrificado');
                  nextSources = withConditionSource(nextSources, 'eletrificado', 'habilidade', card.name);
                }
                return {
                  ...c,
                  conditions: conds,
                  conditionSources: nextSources,
                  eletrificadoRoundsRemaining: !conds.has('imunidade') ? 1 : c.eletrificadoRoundsRemaining,
                };
              }
              return c;
            }),
          }));
          addLog(
            `🛡️⚡ [Flecha Elétrica] ${target.name} absorveu o dano com sua Barreira Celestial, mas recebeu ELETRIFICADO por 1 rodada!`,
            'spell'
          );
          return;
        }

        const baseDamage = 9;
        let damage = target.conditions.has('eletrificado') ? Math.round(baseDamage * 1.20) : baseDamage;
        if (target.conditions.has('congelado')) damage = Math.round(damage * 1.5);
        if (target.conditions.has('tenacidade')) damage = Math.max(0, Math.round(damage * 0.65));
        if (target.def >= damage) {
          target.def -= damage;
        } else {
          const rem = damage - target.def;
          target.def = 0;
          target.hp = Math.max(0, target.hp - rem);
        }

        if (target.hp <= 0) {
          addLog(`🏹⚡ [Flecha Elétrica] Disparou flecha elétrica em ${target.name} causando ${damage} de dano direto!`, 'spell');
          addLog(`💀 ${target.name} foi abatido pela Flecha Elétrica!`, 'kill');
          enemySetter((prevEnemy) => ({
            ...prevEnemy,
            board: prevEnemy.board.filter((c) => c.instanceId !== target.instanceId),
            graveyard: [...prevEnemy.graveyard, target],
          }));
          triggerPhilioEliminationBonus(isPlayer ? 'player' : 'opponent', 1, [target.instanceId]);
        } else {
          if (!target.conditions.has('imunidade')) {
            target.conditions.add('eletrificado');
            setCardConditionSource(target, 'eletrificado', 'habilidade', card.name);
            target.eletrificadoRoundsRemaining = 1;
            queueConditionVfx([
              {
                condition: 'eletrificado',
                targetUnitId: target.instanceId,
                targetUnitName: target.name,
                targetSide: enemySide,
              },
            ]);
          }
          enemySetter((prevEnemy) => ({
            ...prevEnemy,
            board: prevEnemy.board.map((c) => {
              if (c.instanceId === target.instanceId) {
                const conds = new Set(c.conditions);
                let nextSources = c.conditionSources ? { ...c.conditionSources } : undefined;
                if (!conds.has('imunidade')) {
                  conds.add('eletrificado');
                  nextSources = withConditionSource(nextSources, 'eletrificado', 'habilidade', card.name);
                }
                return {
                  ...c,
                  def: target.def,
                  hp: target.hp,
                  conditions: conds,
                  conditionSources: nextSources,
                  eletrificadoRoundsRemaining: !conds.has('imunidade') ? 1 : c.eletrificadoRoundsRemaining,
                };
              }
              return c;
            }),
          }));
          addLog(
            `🏹⚡ [Flecha Elétrica] Disparou flecha elétrica em ${target.name} causando ${damage} de dano direto e aplicando ELETRIFICADO por 1 rodada! (Vida/Def: ${target.hp}/${target.def})`,
            'spell'
          );
        }
      };

      if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: 'Flecha Elétrica - Disparo Fulminante (Fugaz)',
          description: `Escolha uma unidade inimiga de ${enemy.name} para receber 9 de dano direto e aplicar ELETRIFICADO por 1 rodada:`,
          candidates: enemyCandidates,
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            finalizeSpell(
              `Flecha Elétrica atingiu ${target.name} causando 9 de dano e aplicando ELETRIFICADO!`,
              () => applyFlecha(target),
              target.name,
              target.instanceId
            );
          },
        });
        return;
      } else {
        const target = [...enemyCandidates].sort((a, b) => (a.hp + a.def) - (b.hp + b.def))[0];
        finalizeSpell(
          `${opponent.name} lançou Flecha Elétrica em ${target.name}!`,
          () => applyFlecha(target),
          target.name,
          target.instanceId
        );
      }
    }

    // Spell 15: Labareda solar [Rápida - Tier 1]
    // "Selecione uma unidade inimiga para receber 8 de dano e Torpor por 2 rodadas."
    else if (card.templateId === 'n_labareda_solar' || card.name.toLowerCase().includes('labareda solar')) {
      const enemyCandidates = enemy.board.filter((c) => c.hp > 0);
      if (enemyCandidates.length === 0) {
        if (isInteractiveUser) addLog(`O adversário (${enemy.name}) não possui unidades em campo para alvejar com Labareda solar.`, 'info');
        return;
      }
      const enemySide = isPlayer ? 'opponent' : 'player';

      const applyLabaredaSolar = (target: CardInstance) => {
        triggerSkillVfx('n_labareda_solar', enemySide, target.instanceId, target.name);
        if (target.conditions.has('imunidade')) {
          addLog(`🌟 [IMUNIDADE] ${target.name} bloqueou o efeito de Labareda solar!`, 'spell');
          return;
        }
        const isVilmaImmune =
          (target.templateId === 'm_vilma' || target.name.toLowerCase().includes('vilma')) &&
          target.silencedRounds === 0;
        if (target.conditions.has('barreira')) {
          target.conditions.delete('barreira');
          removeCardConditionSource(target, 'barreira');
          addLog(`🛡️☀️ [Labareda solar] ${target.name} absorveu o dano com sua Barreira, mas recebeu Torpor por 2 rodadas!`, 'spell');
          target.conditions.add('entorpecer');
          setCardConditionSource(target, 'entorpecer', 'habilidade', card.name);
          target.entorpecerRoundsRemaining = 2;
          return;
        }

        if (!isVilmaImmune) {
          let damage = 8;
          if (target.conditions.has('congelado')) damage = Math.round(damage * 1.5);
          if (target.conditions.has('tenacidade')) damage = Math.max(0, Math.round(damage * 0.65));
          if (target.def >= damage) {
            target.def -= damage;
          } else {
            const rem = damage - target.def;
            target.def = 0;
            target.hp = Math.max(0, target.hp - rem);
          }
          if (target.element === 'Cósmico' || target.sapience != null) {
            target.sapience = target.hp;
          }
        }

        target.conditions.add('entorpecer');
        setCardConditionSource(target, 'entorpecer', 'habilidade', card.name);
        target.entorpecerRoundsRemaining = 2;
        queueConditionVfx([{ condition: 'torpor', targetUnitId: target.instanceId, targetUnitName: target.name, targetSide: enemySide }]);
        sound.playClash();

        if (target.hp <= 0) {
          addLog(`☀️🔥 [Labareda solar] Eliminou ${target.name} com 8 de dano solar!`, 'kill');
          const enemySetter = isPlayer ? setOpponent : setPlayer;
          enemySetter((prevEnemy) => ({
            ...prevEnemy,
            board: prevEnemy.board.filter((c) => c.instanceId !== target.instanceId),
            graveyard: [...prevEnemy.graveyard, target],
          }));
          triggerPhilioEliminationBonus(isPlayer ? 'player' : 'opponent', 1);
        } else {
          addLog(
            `☀️🌀 [Labareda solar] Atingiu ${target.name} causando 8 de dano e aplicando Torpor por 2 rodadas!`,
            'spell'
          );
        }
      };

      if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: 'Labareda solar - Chama Desorientadora (Rápida)',
          description: `Escolha uma unidade inimiga de ${enemy.name} para receber 8 de dano e Torpor por 2 rodadas:`,
          candidates: enemyCandidates,
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            finalizeSpell(
              `Labareda solar lançada sobre ${target.name} (8 de dano e Torpor por 2 rodadas)!`,
              () => applyLabaredaSolar(target),
              target.name,
              target.instanceId
            );
          },
        });
        return;
      } else {
        const target = [...enemyCandidates].sort((a, b) => (b.atk + b.power) - (a.atk + a.power))[0];
        finalizeSpell(
          `${opponent.name} lançou Labareda solar em ${target.name}!`,
          () => applyLabaredaSolar(target),
          target.name,
          target.instanceId
        );
      }
    }

    // Spell 16: Crio-gênese [Lenta - Tier 1]
    // "Causa 3 de dano a todas as unidades inimigas e aplica Congelar por 2 rodadas."
    else if (card.templateId === 'm_crio_genese' || card.name.toLowerCase().includes('crio-gênese') || card.name.toLowerCase().includes('crio-genese')) {
      const aliveEnemies = enemy.board.filter((c) => c.hp > 0);
      const targetSide = isPlayer ? 'opponent' : 'player';

      if (aliveEnemies.length === 0) {
        if (isInteractiveUser) {
          addLog(`O adversário (${enemy.name}) não possui unidades em campo para usar Crio-gênese.`, 'info');
        }
        return;
      }

      const applyCrioGenese = () => {
        // Dispara a animação do Tornado de Gelo no exato momento em que o efeito da habilidade é ativado/aplicado após a janela de contra-resposta!
        triggerCrioGeneseVfx(
          targetSide,
          Math.max(3, aliveEnemies.length),
          `Unidades de ${enemy.name}`
        );

        const enemySetter = isPlayer ? setOpponent : setPlayer;
        let killedCount = 0;
        enemySetter((prevEnemy) => {
          const surviving: CardInstance[] = [];
          const newlyDead: CardInstance[] = [];

          prevEnemy.board.forEach((u) => {
            const isCeliaImmune =
              (u.templateId === 'm_celia' || u.name.toLowerCase().includes('celia')) &&
              u.silencedRounds === 0;
            const isSolImmortal =
              (u.templateId === 'n_o_sol' || u.name.trim().toLowerCase().startsWith('o sol')) &&
              u.level === 2;

            if (u.conditions.has('imunidade') || isCeliaImmune || isSolImmortal) {
              surviving.push(u);
              return;
            }

            if (u.conditions.has('barreira')) {
              u.conditions.delete('barreira');
              removeCardConditionSource(u, 'barreira');
            } else {
              let dmg = 3;
              if (u.conditions.has('congelado')) dmg = Math.round(dmg * 1.5);
              if (u.conditions.has('tenacidade')) dmg = Math.max(0, Math.round(dmg * 0.65));
              if (u.def >= dmg) {
                u.def -= dmg;
              } else {
                const rem = dmg - u.def;
                u.def = 0;
                u.hp = Math.max(0, u.hp - rem);
              }
              if (u.element === 'Cósmico' || u.sapience != null) {
                u.sapience = u.hp;
              }
            }

            u.conditions.add('congelado');
            setCardConditionSource(u, 'congelado', 'habilidade', card.name);
            u.freezeRoundsRemaining = Math.max(u.freezeRoundsRemaining || 0, 2);

            if (u.hp <= 0) {
              newlyDead.push(u);
              killedCount += 1;
            } else {
              surviving.push(u);
            }
          });

          return {
            ...prevEnemy,
            board: surviving,
            graveyard: [...prevEnemy.graveyard, ...newlyDead],
          };
        });

        if (killedCount > 0) {
          triggerPhilioEliminationBonus(isPlayer ? 'player' : 'opponent', killedCount);
        }
        sound.playClash();
      };

      finalizeSpell(
        `❄️ Crio-gênese causou 3 de dano e aplicou Congelar por 2 rodadas em todas as unidades de ${enemy.name}!`,
        applyCrioGenese,
        `Mesa de ${enemy.name}`
      );
    }

    // Spell 17: Desafio real [Rápida - Tier 2]
    // "Concede ENFRENTAR a uma unidade a escolha."
    else if (card.templateId === 'g_desafio_real' || card.name.toLowerCase().includes('desafio real')) {
      const aliveAllies = caster.board.filter((c) => c.hp > 0);
      if (aliveAllies.length === 0) {
        if (isInteractiveUser) addLog(`Você precisa de pelo menos uma unidade em campo para usar Desafio real.`, 'info');
        return;
      }
      const allySide = isPlayer ? 'player' : 'opponent';

      if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: 'Desafio real - Imposição de Combate (Rápida)',
          description: `Escolha uma unidade aliada de ${caster.name} para receber ENFRENTAR permanentemente:`,
          candidates: aliveAllies,
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            finalizeSpell(
              `🗡️ Desafio real: ${target.name} recebeu o efeito ENFRENTAR!`,
              () => {
                triggerSkillVfx('g_desafio_real', allySide, target.instanceId, target.name);
                queueConditionVfx([
                  {
                    condition: 'enfrentar',
                    targetUnitId: target.instanceId,
                    targetUnitName: target.name,
                    targetSide: allySide,
                  },
                ]);
                target.conditions.add('enfrentar');
                setCardConditionSource(target, 'enfrentar', 'habilidade', card.name);
              },
              target.name,
              target.instanceId
            );
          },
        });
        return;
      } else {
        const target = [...aliveAllies].sort((a, b) => (b.atk + b.power) - (a.atk + a.power))[0];
        finalizeSpell(
          `🗡️ ${opponent.name} concedeu o efeito ENFRENTAR a ${target.name} com Desafio real!`,
          () => {
            triggerSkillVfx('g_desafio_real', allySide, target.instanceId, target.name);
            queueConditionVfx([
              {
                condition: 'enfrentar',
                targetUnitId: target.instanceId,
                targetUnitName: target.name,
                targetSide: allySide,
              },
            ]);
            target.conditions.add('enfrentar');
            setCardConditionSource(target, 'enfrentar', 'habilidade', card.name);
          },
          target.name,
          target.instanceId
        );
      }
    }

    // Spell 18: Fome insaciável [Lenta - Tier 3]
    // "Concede ROUBO DE VIDA e +10 de Poder a uma unidade por 1 rodada."
    else if (card.templateId === 'm_fome_insaciavel' || card.name.toLowerCase().includes('fome insaciável') || card.name.toLowerCase().includes('fome insaciavel')) {
      const aliveAllies = caster.board.filter((c) => c.hp > 0);
      if (aliveAllies.length === 0) {
        if (isInteractiveUser) addLog(`Você precisa de pelo menos uma unidade em campo para usar Fome insaciável.`, 'info');
        return;
      }

      const allySide = isPlayer ? 'player' : 'opponent';
      const applyFome = (target: CardInstance) => {
        triggerSkillVfx('m_fome_insaciavel', allySide, target.instanceId, target.name);
        target.conditions.add('roubo_de_vida');
        setCardConditionSource(target, 'roubo_de_vida', 'habilidade', card.name);
        target.hasLifeSteal = true;
        target.lifeStealRoundsRemaining = 1;
        addPowerPoints(target, 10);
        target.tempPowerBuffAmount = (target.tempPowerBuffAmount || 0) + 10;
        target.tempPowerBuffRoundsRemaining = 1;
      };

      if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: 'Fome insaciável - Voracidade Arcana (Lenta)',
          description: `Escolha uma unidade aliada de ${caster.name} para receber ROUBO DE VIDA e +10 de Poder por 1 rodada:`,
          candidates: aliveAllies,
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            finalizeSpell(
              `🩸 Fome insaciável: ${target.name} recebeu ROUBO DE VIDA e +10 de Poder por 1 rodada!`,
              () => applyFome(target),
              target.name,
              target.instanceId
            );
          },
        });
        return;
      } else {
        const target = [...aliveAllies].sort((a, b) => (b.atk + b.power) - (a.atk + a.power))[0];
        finalizeSpell(
          `${opponent.name} concedeu ROUBO DE VIDA e +10 de Poder a ${target.name} com Fome insaciável!`,
          () => applyFome(target),
          target.name,
          target.instanceId
        );
      }
    }

    // Spell 19: Sabedoria cósmica [Rápida - Tier 3]
    // "Concede IMUNIDADE a uma unidade a escolha por 2 rodadas."
    else if (card.templateId === 'g_sabedoria_cosmica' || card.name.toLowerCase().includes('sabedoria cósmica') || card.name.toLowerCase().includes('sabedoria cosmica')) {
      const aliveAllies = caster.board.filter((c) => c.hp > 0);
      if (aliveAllies.length === 0) {
        if (isInteractiveUser) addLog(`Você precisa de pelo menos uma unidade em campo para usar Sabedoria cósmica.`, 'info');
        return;
      }
      const allySide = isPlayer ? 'player' : 'opponent';

      const applySabedoria = (target: CardInstance) => {
        triggerSkillVfx('g_sabedoria_cosmica', allySide, target.instanceId, target.name);
        removePragaFromUnit(target);
        target.conditions.add('imunidade');
        setCardConditionSource(target, 'imunidade', 'habilidade', card.name);
        target.immunedRounds = Math.max(target.immunedRounds || 0, 2);
      };

      if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: 'Sabedoria cósmica - Proteção Astral (Rápida)',
          description: `Escolha uma unidade aliada de ${caster.name} para receber IMUNIDADE por 2 rodadas:`,
          candidates: aliveAllies,
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            finalizeSpell(
              `🌟 Sabedoria cósmica: ${target.name} recebeu IMUNIDADE por 2 rodadas!`,
              () => applySabedoria(target),
              target.name,
              target.instanceId
            );
          },
        });
        return;
      } else {
        const target = [...aliveAllies].sort((a, b) => (b.atk + b.power) - (a.atk + a.power))[0];
        finalizeSpell(
          `${opponent.name} concedeu IMUNIDADE por 2 rodadas a ${target.name} com Sabedoria cósmica!`,
          () => applySabedoria(target),
          target.name,
          target.instanceId
        );
      }
    }

    // Spell 20: Grão-mestre [Lenta - Tier 4]
    // "Concede CRITICO e +15 de Poder a uma unidade a escolha por 1 rodada."
    else if (card.templateId === 'm_grao_mestre' || card.name.toLowerCase().includes('grão-mestre') || card.name.toLowerCase().includes('grao-mestre')) {
      const aliveAllies = caster.board.filter((c) => c.hp > 0);
      if (aliveAllies.length === 0) {
        if (isInteractiveUser) addLog(`Você precisa de pelo menos uma unidade em campo para usar Grão-mestre.`, 'info');
        return;
      }

      const allySide = isPlayer ? 'player' : 'opponent';
      const applyGraoMestre = (target: CardInstance) => {
        triggerSkillVfx('m_grao_mestre', allySide, target.instanceId, target.name);
        target.conditions.add('critico');
        setCardConditionSource(target, 'critico', 'habilidade', card.name);
        target.criticoRoundsRemaining = 1;
        addPowerPoints(target, 15);
        target.tempPowerBuffAmount = (target.tempPowerBuffAmount || 0) + 15;
        target.tempPowerBuffRoundsRemaining = 1;
      };

      if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: 'Grão-mestre - Maestria Letal (Lenta)',
          description: `Escolha uma unidade aliada de ${caster.name} para receber CRÍTICO e +15 de Poder por 1 rodada:`,
          candidates: aliveAllies,
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            finalizeSpell(
              `🎯 Grão-mestre: ${target.name} recebeu CRÍTICO e +15 de Poder por 1 rodada!`,
              () => applyGraoMestre(target),
              target.name,
              target.instanceId
            );
          },
        });
        return;
      } else {
        const target = [...aliveAllies].sort((a, b) => (b.atk + b.power) - (a.atk + a.power))[0];
        finalizeSpell(
          `${opponent.name} concedeu CRÍTICO e +15 de Poder a ${target.name} com Grão-mestre!`,
          () => applyGraoMestre(target),
          target.name,
          target.instanceId
        );
      }
    }

    // Spell 21: Voto do Absoluto [Lenta - Tier 5]
    // "Seleciona uma unidade e OBLITERE ela(aliada ou inimiga)."
    else if (card.templateId === 'n_voto_do_absoluto' || card.name.toLowerCase().includes('voto do absoluto')) {
      const allBoardUnits = [...caster.board, ...enemy.board].filter((c) => c.hp > 0);
      if (allBoardUnits.length === 0) {
        if (isInteractiveUser) addLog(`Não há unidades em campo para obliterar com Voto do Absoluto.`, 'info');
        return;
      }

      const applyObliterar = (target: CardInstance) => {
        const wasOnEnemyBoard = enemy.board.some((c) => c.instanceId === target.instanceId);
        const targetSide = wasOnEnemyBoard ? (isPlayer ? 'opponent' : 'player') : (isPlayer ? 'player' : 'opponent');
        triggerSkillVfx('n_voto_do_absoluto', targetSide, target.instanceId, target.name);

        const isImmortalDivinity =
          ((target.templateId === 'n_o_sol' || target.name.trim().toLowerCase().startsWith('o sol')) && target.level === 2) ||
          ((target.templateId === 'g_a_lua' || target.name.trim().toLowerCase().startsWith('a lua')) && target.level === 2);
        if (target.conditions.has('imunidade') || isImmortalDivinity) {
          addLog(`🌟 [IMUNIDADE] ${target.name} resistiu à obliteração de Voto do Absoluto!`, 'spell');
          return;
        }

        sound.playDeath();
        setPlayer((p) => {
          const hadTarget = p.board.some((c) => c.instanceId === target.instanceId);
          return {
            ...p,
            board: p.board.filter((c) => c.instanceId !== target.instanceId),
            graveyard: hadTarget ? [...p.graveyard, target] : p.graveyard,
          };
        });
        setOpponent((o) => {
          const hadTarget = o.board.some((c) => c.instanceId === target.instanceId);
          return {
            ...o,
            board: o.board.filter((c) => c.instanceId !== target.instanceId),
            graveyard: hadTarget ? [...o.graveyard, target] : o.graveyard,
          };
        });

        const wasEnemy = enemy.board.some((c) => c.instanceId === target.instanceId);
        if (wasEnemy) {
          triggerPhilioEliminationBonus(isPlayer ? 'player' : 'opponent', 1);
        }
        addLog(`🕳️💀 [OBLITERAÇÃO] ${target.name} foi completamente OBLITERADO da partida por Voto do Absoluto!`, 'kill');
      };

      if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: 'Voto do Absoluto - Obliteração Cósmica (Tier 5)',
          description: `Selecione qualquer unidade em campo (aliada ou inimiga) para OBLITERAR imediatamente:`,
          candidates: allBoardUnits,
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            finalizeSpell(
              `🕳️ Voto do Absoluto lançado para OBLITERAR ${target.name}!`,
              () => applyObliterar(target),
              target.name,
              target.instanceId
            );
          },
        });
        return;
      } else {
        const enemyPool = enemy.board.filter((c) => c.hp > 0);
        const target = [...(enemyPool.length > 0 ? enemyPool : allBoardUnits)].sort(
          (a, b) => (b.hp + b.atk + b.power) - (a.hp + a.atk + a.power)
        )[0];
        finalizeSpell(
          `${opponent.name} lançou Voto do Absoluto para OBLITERAR ${target.name}!`,
          () => applyObliterar(target),
          target.name,
          target.instanceId
        );
      }
    }

    // Spell 22: Concessão Divina [Lenta - Tier 5]
    // "Concede RESSURREIÇÃO a uma unidade a escolha."
    else if (card.templateId === 'g_concessao_divina' || card.name.toLowerCase().includes('concessão divina') || card.name.toLowerCase().includes('concessao divina')) {
      const aliveAllies = caster.board.filter((c) => c.hp > 0);
      if (aliveAllies.length === 0) {
        if (isInteractiveUser) addLog(`Você precisa de pelo menos uma unidade em campo para usar Concessão Divina.`, 'info');
        return;
      }

      const allySide = isPlayer ? 'player' : 'opponent';
      const applyConcessao = (target: CardInstance) => {
        triggerSkillVfx('g_concessao_divina', allySide, target.instanceId, target.name);
        target.conditions.add('ressurreicao');
        setCardConditionSource(target, 'ressurreicao', 'habilidade', card.name);
        target.permanentRessurreicao = true;
      };

      if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: 'Concessão Divina - Graça Imortal (Tier 5)',
          description: `Escolha uma unidade aliada de ${caster.name} para receber RESSURREIÇÃO:`,
          candidates: aliveAllies,
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            finalizeSpell(
              `✨ Concessão Divina: ${target.name} recebeu a condição RESSURREIÇÃO!`,
              () => applyConcessao(target),
              target.name,
              target.instanceId
            );
          },
        });
        return;
      } else {
        const target = [...aliveAllies].sort((a, b) => (b.atk + b.power) - (a.atk + a.power))[0];
        finalizeSpell(
          `${opponent.name} concedeu RESSURREIÇÃO a ${target.name} com Concessão Divina!`,
          () => applyConcessao(target),
          target.name,
          target.instanceId
        );
      }
    }

    // PATCH 1.4 — Spell 23: Apoteose [Lenta - Tier 2 - Naneya]
    // "Concede a classe DIVINO para a carta escolhida (na mão ou na mesa) até o fim do combate."
    else if (card.templateId === 'n_apoteose' || card.name.toLowerCase().includes('apoteose')) {
      const boardCandidates = caster.board.filter((c) => c.hp > 0 && canReceiveMulticlass(c, 'Divino'));
      const handCandidates = caster.hand.filter(
        (c) => c.instanceId !== card.instanceId && c.type === 'unit' && canReceiveMulticlass(c, 'Divino')
      );
      const candidates = [...boardCandidates, ...handCandidates];

      if (candidates.length === 0) {
        if (isInteractiveUser) {
          addLog(
            `⚠️ Nenhuma unidade aliada na mesa ou na mão pode receber a classe DIVINO (unidades Cósmicas ou que já são Divinas não recebem melhoria).`,
            'info'
          );
        }
        return;
      }

      const allySide = isPlayer ? 'player' : 'opponent';
      const casterSetter = isPlayer ? setPlayer : setOpponent;

      const applyApoteose = (target: CardInstance) => {
        triggerSkillVfx('n_apoteose', allySide, target.instanceId, target.name);
        const updateUnit = (u: CardInstance): CardInstance => {
          if (u.instanceId !== target.instanceId) return u;
          const clone: CardInstance = {
            ...u,
            conditions: new Set(u.conditions),
            conditionSources: u.conditionSources ? { ...u.conditionSources } : undefined,
            extraElements: u.extraElements ? [...u.extraElements] : [],
          };
          addClassToCard(clone, 'Divino');
          return clone;
        };
        casterSetter((prev) => ({
          ...prev,
          board: prev.board.map(updateUnit),
          hand: prev.hand.map(updateUnit),
        }));
        triggerElementalBurst({ ...target, element: 'Divino' }, 'power', allySide);
        sound.playSpell();
      };

      if (isInteractiveUser) {
        const boardIdSet = new Set(boardCandidates.map((b) => b.instanceId));
        setTargetModal({
          isOpen: true,
          title: 'Apoteose - Ascensão Divina (Lenta)',
          description: `Escolha uma unidade aliada (na mesa ou na mão) de ${caster.name} para receber a classe DIVINO pelo resto do combate (exceto Cósmico ou já Divino):`,
          candidates,
          getBadgeLabel: (c) => (boardIdSet.has(c.instanceId) ? '⚔️ Na Mesa' : '🃏 Na Mão'),
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false, getBadgeLabel: undefined }));
            finalizeSpell(
              `⚜️ Apoteose: ${target.name} ascendeu e recebeu a classe DIVINO até o fim do combate!`,
              () => applyApoteose(target),
              target.name,
              target.instanceId
            );
          },
        });
        return;
      } else {
        const target =
          [...boardCandidates].sort((a, b) => (b.power + b.atk) - (a.power + a.atk))[0] ||
          [...handCandidates].sort((a, b) => b.tier - a.tier)[0];
        finalizeSpell(
          `⚜️ ${caster.name} conjurou Apoteose em ${target.name}, concedendo a classe DIVINO!`,
          () => applyApoteose(target),
          target.name,
          target.instanceId
        );
      }
    }

    // PATCH 1.4 — Spell 24: Subjugar [Rápida - Tier 3 - Granty]
    // "CAPTURA uma unidade escolhida na mesa inimiga." (Reseta atributos ao ir à mão e respeita limite de 8 cartas)
    else if (card.templateId === 'g_subjugar' || card.name.toLowerCase().includes('subjugar')) {
      const candidates = enemy.board.filter((c) => c.hp > 0);
      if (candidates.length === 0) {
        if (isInteractiveUser) addLog(`O adversário (${enemy.name}) não possui unidades na mesa para capturar com Subjugar.`, 'info');
        return;
      }

      const enemySide: 'player' | 'opponent' = isPlayer ? 'opponent' : 'player';
      const casterSide: 'player' | 'opponent' = isPlayer ? 'player' : 'opponent';
      const casterSetter = isPlayer ? setPlayer : setOpponent;
      const enemySetter = isPlayer ? setOpponent : setPlayer;

      const applySubjugar = (target: CardInstance) => {
        if (target.conditions.has('imunidade') || isOSolLevel2Immortal(target) || isALuaLevel2Supreme(target)) {
          addLog(`🌟 [IMUNIDADE] ${target.name} resistiu à captura de Subjugar!`, 'spell');
          return;
        }
        const tpl = CARD_TEMPLATES.find((t) => t.id === target.templateId);
        const resetCard = tpl ? createCardInstance(tpl) : createCardInstance({
          id: target.templateId,
          name: target.name,
          kingdom: target.kingdom,
          tier: target.tier,
          type: 'unit',
          element: target.element,
          hp: target.maxHp,
          atk: target.baseAtk,
          def: target.baseDef,
          power: target.basePower,
          sapience: target.sapience,
          effectDescription: target.effectDescription,
        });

        const latestCaster = isPlayer ? playerRef.current : opponentRef.current;
        const isHandFull = latestCaster.hand.length >= 8;
        const sourceRect = getVisibleDomRect(`[data-unit-instance-id="${target.instanceId}"]`);
        const destRect = getVisibleDomRect(
          isHandFull ? `[data-graveyard="${casterSide}"]` : `[data-hand-zone="${casterSide}"]`
        );

        queueConditionVfx([
          {
            condition: 'capturar',
            targetSide: enemySide,
            targetUnitId: target.instanceId,
            targetUnitName: target.name,
            captureData: {
              sourceSide: enemySide,
              destSide: casterSide,
              sourceKind: 'board',
              sourceRect,
              destRect,
              isHandFull,
              isSubjugar: true,
              card: {
                name: target.name,
                element: target.element,
                tier: target.tier,
                artUrl: resolveCardArtUrl(target.templateId, target.level === 2),
              },
            },
          },
        ]);

        enemySetter((prevEnemy) => ({
          ...prevEnemy,
          board: prevEnemy.board.filter((c) => c.instanceId !== target.instanceId),
        }));

        if (isHandFull) {
          sound.playDiscard();
          casterSetter((prev) => ({
            ...prev,
            graveyard: [...prev.graveyard, resetCard],
          }));
          addLog(
            `⛓️ [CAPTURAR - Subjugar] ${target.name} foi capturada da mesa de ${enemy.name} e restaurada ao estado original, mas a mão de ${latestCaster.name} atingiu o limite (8/8) — carta enviada ao cemitério!`,
            'spell'
          );
        } else {
          casterSetter((prev) => {
            if (prev.hand.length >= 8) {
              return { ...prev, graveyard: [...prev.graveyard, resetCard] };
            }
            return { ...prev, hand: [...prev.hand, resetCard] };
          });
          addLog(
            `⛓️ [CAPTURAR - Subjugar] ${caster.name} capturou ${target.name} da mesa inimiga para sua mão com atributos restaurados!`,
            'spell'
          );
        }
      };

      if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: 'Subjugar - Captura em Campo (Rápida)',
          description: `Escolha uma unidade da mesa inimiga de ${enemy.name} para CAPTURAR para a sua mão (atributos resetados; respeita limite de 8 cartas):`,
          candidates,
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            finalizeSpell(
              `⛓️ Subjugar: ${target.name} foi capturada da mesa inimiga para a mão de ${caster.name}!`,
              () => applySubjugar(target),
              target.name,
              target.instanceId
            );
          },
        });
        return;
      } else {
        const vulnerable = candidates.filter((c) => !c.conditions.has('imunidade') && !isOSolLevel2Immortal(c) && !isALuaLevel2Supreme(c));
        const target = [...(vulnerable.length > 0 ? vulnerable : candidates)].sort((a, b) => (b.tier * 100 + b.atk + b.power) - (a.tier * 100 + a.atk + a.power))[0];
        finalizeSpell(
          `⛓️ ${caster.name} lançou Subjugar para capturar ${target.name}!`,
          () => applySubjugar(target),
          target.name,
          target.instanceId
        );
      }
    }

    // PATCH 1.4 — Spell 25: Reencarnação [Lenta - Tier 3 - Musmo]
    // "Concede ao jogador o efeito RETORNAR."
    else if (card.templateId === 'm_reencarnacao' || card.name.toLowerCase().includes('reencarna')) {
      if (caster.graveyard.length === 0) {
        if (isInteractiveUser) {
          addLog(`🕊️ Seu cemitério (Cripta) está vazio — nenhuma carta para retornar com Reencarnação.`, 'info');
        }
        return;
      }
      const nextTurn = isPlayer ? 'opponent' : 'player';
      const hasEnemyVeto =
        !pendingSpell &&
        (isOnlinePvp
          ? isPlayer
            ? remoteHasVetoRef.current
            : false
          : enemy.hand.some(
              (c) =>
                (c.templateId === 'n_veto_do_indomito' || c.name.toLowerCase().includes('veto do ind')) &&
                (isTestingArena || isTierAllowedInRound(c.tier, roundRef.current, c))
            ));
      finalizeSpell(
        `🕊️ Reencarnação ativada por ${caster.name}: efeito RETORNAR concedido!`,
        () => {
          const deferTurn =
            (!hasEnemyVeto || isOnlinePvp) && !pendingSpell && !isPostAttackFinalTurnRef.current && !isTestingArena
              ? nextTurn
              : null;
          triggerRetornarFlow(ownerId, 0, card.name, deferTurn);
        },
        `Cripta de ${caster.name}`
      );
    }

    // PATCH 1.4 — Spells 26..29: Concessão de Classe em Mesa (Toque Ígneo, Força da Natureza, Estático, Nevasca)
    else if (
      card.templateId === 'g_toque_igneo' ||
      card.templateId === 'n_forca_natureza' ||
      card.templateId === 'm_estatico' ||
      card.templateId === 'm_nevasca'
    ) {
      const targetClass =
        card.templateId === 'g_toque_igneo'
          ? 'Fogo'
          : card.templateId === 'n_forca_natureza'
          ? 'Telúrico'
          : card.templateId === 'm_estatico'
          ? 'Elétrico'
          : 'Gelo';
      const classIcon =
        targetClass === 'Fogo' ? '🔥' : targetClass === 'Telúrico' ? '🌿' : targetClass === 'Elétrico' ? '⚡' : '❄️';

      const candidates = caster.board.filter((c) => c.hp > 0 && canReceiveMulticlass(c, targetClass));
      if (candidates.length === 0) {
        if (isInteractiveUser) {
          addLog(
            `⚠️ Nenhuma unidade aliada em campo pode receber a classe ${targetClass.toUpperCase()} (unidades Cósmicas ou que já possuem ${targetClass} não recebem melhoria).`,
            'info'
          );
        }
        return;
      }

      const allySide = isPlayer ? 'player' : 'opponent';
      const casterSetter = isPlayer ? setPlayer : setOpponent;

      const applyGrantedClass = (target: CardInstance) => {
        triggerSkillVfx(card.templateId as SkillVfxType, allySide, target.instanceId, target.name);
        let updatedClassesLabel = targetClass;
        casterSetter((prev) => ({
          ...prev,
          board: prev.board.map((u) => {
            if (u.instanceId !== target.instanceId) return u;
            const clone: CardInstance = {
              ...u,
              conditions: new Set(u.conditions),
              conditionSources: u.conditionSources ? { ...u.conditionSources } : undefined,
              extraElements: u.extraElements ? [...u.extraElements] : [],
            };
            addClassToCard(clone, targetClass);
            updatedClassesLabel = getCardClasses(clone).join(' + ');
            return clone;
          }),
        }));
        triggerElementalBurst({ ...target, element: targetClass }, 'power', allySide);
        sound.playSpell();
        addLog(
          `${classIcon}✨ [${card.name}] ${target.name} adquiriu a classe ${targetClass.toUpperCase()} (Multiclasse: ${updatedClassesLabel})!`,
          'spell'
        );
      };

      if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: `${card.name} - Conceder Classe ${targetClass}`,
          description: `Escolha uma unidade aliada de ${caster.name} na mesa para ganhar a classe ${targetClass.toUpperCase()} (exceto Cósmico ou quem já possui ${targetClass}):`,
          candidates,
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            finalizeSpell(
              `${classIcon} ${card.name} concedeu a classe ${targetClass.toUpperCase()} a ${target.name}!`,
              () => applyGrantedClass(target),
              target.name,
              target.instanceId
            );
          },
        });
        return;
      } else {
        const target = [...candidates].sort((a, b) => (b.power + b.atk + b.hp) - (a.power + a.atk + a.hp))[0];
        finalizeSpell(
          `${classIcon} ${caster.name} lançou ${card.name}, concedendo a classe ${targetClass.toUpperCase()} a ${target.name}!`,
          () => applyGrantedClass(target),
          target.name,
          target.instanceId
        );
      }
    }

    // PATCH 1.4.1 — Spells 30 & 31: Encantar [Lenta - Tier 3 - Naneya] & Oceânico [Lenta - Tier 2 - Granty]
    else if (card.templateId === 'n_encantar' || card.templateId === 'g_oceanico') {
      const targetClass = card.templateId === 'n_encantar' ? 'Mágico' : 'Água';
      const classIcon = targetClass === 'Mágico' ? '🔮' : '💧';
      const candidates = caster.board.filter((c) => c.hp > 0 && canReceiveMulticlass(c, targetClass));
      if (candidates.length === 0) {
        if (isInteractiveUser) {
          addLog(
            `⚠️ Nenhuma unidade aliada em campo pode receber a classe ${targetClass.toUpperCase()} (unidades Cósmicas ou que já possuem ${targetClass} não recebem melhoria).`,
            'info'
          );
        }
        return;
      }

      const allySide = isPlayer ? 'player' : 'opponent';
      const casterSetter = isPlayer ? setPlayer : setOpponent;

      const applyClassBuff = (target: CardInstance) => {
        triggerSkillVfx(card.templateId as SkillVfxType, allySide, target.instanceId, target.name);
        let updatedClassesLabel = targetClass;
        casterSetter((prev) => ({
          ...prev,
          board: prev.board.map((u) => {
            if (u.instanceId !== target.instanceId) return u;
            const clone: CardInstance = {
              ...u,
              conditions: new Set(u.conditions),
              conditionSources: u.conditionSources ? { ...u.conditionSources } : undefined,
              extraElements: u.extraElements ? [...u.extraElements] : [],
            };
            addClassToCard(clone, targetClass);
            updatedClassesLabel = getCardClasses(clone).join(' + ');
            return clone;
          }),
        }));
        triggerElementalBurst({ ...target, element: targetClass }, 'power', allySide);
        sound.playSpell();
        addLog(
          `${classIcon}✨ [${card.name}] ${target.name} adquiriu a classe ${targetClass.toUpperCase()} (Multiclasse: ${updatedClassesLabel})!`,
          'spell'
        );
      };

      if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: `${card.name} - Conceder Classe ${targetClass}`,
          description: `Escolha uma unidade aliada de ${caster.name} na mesa para ganhar a classe ${targetClass.toUpperCase()} pelo resto do combate:`,
          candidates,
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            finalizeSpell(
              `${classIcon} ${card.name} concedeu a classe ${targetClass.toUpperCase()} a ${target.name}!`,
              () => applyClassBuff(target),
              target.name,
              target.instanceId
            );
          },
        });
        return;
      } else {
        const target = [...candidates].sort((a, b) => (b.power + b.atk + b.hp) - (a.power + a.atk + a.hp))[0];
        finalizeSpell(
          `${classIcon} ${caster.name} lançou ${card.name}, concedendo a classe ${targetClass.toUpperCase()} a ${target.name}!`,
          () => applyClassBuff(target),
          target.name,
          target.instanceId
        );
      }
    }

    // PATCH 1.4.1 — Token 32: Centelha [Rápida - Fugaz - Tier 4 - Musmo]
    // "Causa 15 de dano a uma unidade inimiga (30 de dano se a unidade estiver ATORDOADA) e aplica TORPOR por 2 rodadas."
    else if (card.templateId === 'token_centelha' || card.name.toLowerCase() === 'centelha') {
      const aliveEnemies = enemy.board.filter((c) => c.hp > 0);
      if (aliveEnemies.length === 0) {
        if (isInteractiveUser) addLog(`O adversário (${enemy.name}) não possui unidades em campo para atingir com Centelha.`, 'info');
        return;
      }

      const enemySide = isPlayer ? 'opponent' : 'player';
      const enemySetter = isPlayer ? setOpponent : setPlayer;

      const applyCentelha = (target: CardInstance) => {
        triggerSkillVfx('token_centelha', enemySide, target.instanceId, target.name);
        if (target.conditions.has('imunidade') || isOSolLevel2Immortal(target) || isALuaLevel2Supreme(target)) {
          addLog(`🌟 [IMUNIDADE] ${target.name} resistiu à Centelha!`, 'spell');
          return;
        }

        let blockedByBarrier = false;
        if (target.conditions.has('barreira')) {
          target.conditions.delete('barreira');
          removeCardConditionSource(target, 'barreira');
          blockedByBarrier = true;
          addLog(`🛡️✨ [Barreira Quebrada] A Barreira de ${target.name} absorveu o dano de Centelha!`, 'spell');
        } else {
          let dmg = target.conditions.has('atordoado') ? 30 : 15;
          if (target.conditions.has('congelado')) dmg = Math.round(dmg * 1.5);
          if (target.conditions.has('tenacidade')) dmg = Math.max(0, Math.round(dmg * 0.65));
          if (target.def >= dmg) {
            target.def -= dmg;
          } else {
            const rem = dmg - target.def;
            target.def = 0;
            target.hp = Math.max(0, target.hp - rem);
          }
          if (target.sapience != null) target.sapience = target.hp;
        }

        target.conditions.add('entorpecer');
        setCardConditionSource(target, 'entorpecer', 'habilidade', card.name);
        target.entorpecerRoundsRemaining = Math.max(target.entorpecerRoundsRemaining || 0, 2);
        sound.playClash();
        queueConditionVfx([{ condition: 'torpor', targetUnitId: target.instanceId, targetUnitName: target.name, targetSide: enemySide }]);

        if (target.hp <= 0) {
          const enemyCurrent = isPlayer ? opponentRef.current : playerRef.current;
          if (target.templateId === 'g_bor' && !enemyCurrent.borRevivedOnce && target.silencedRounds === 0) {
            target.hp = Math.round(target.maxHp * 1.5);
            target.maxHp = target.hp;
            target.atk = Math.round(target.atk * 1.5);
            target.def = Math.round(target.def * 1.5);
            target.icePeakDefense = Math.max(target.icePeakDefense ?? 0, target.def);
            addPowerPoints(target, Math.max(0, Math.round(target.power * 1.5) - target.power), false);
            target.conditions.add('cura');
            setCardConditionSource(target, 'cura', 'passiva_propria', target.name);
            enemySetter((prev) => ({
              ...prev,
              borRevivedOnce: true,
              board: prev.board.map((u) => (u.instanceId === target.instanceId ? target : u)),
            }));
            triggerBorPhoenixVfx(target.instanceId, enemySide, 420);
            addLog(`🔥 [O Mesofênix] General Bor foi abatido por Centelha mas renasceu com +50% atributos e Cura!`, 'spell');
          } else if (target.conditions.has('ressurreicao')) {
            target.conditions.delete('ressurreicao');
            removeCardConditionSource(target, 'ressurreicao');
            target.permanentRessurreicao = false;
            target.hp = target.maxHp;
            target.atk = target.baseAtk;
            target.def = target.baseDef;
            target.icePeakDefense = target.baseDef;
            target.power = target.basePower;
            target.peakPower = target.basePower;
            syncClassPowerBonuses(target);
            enemySetter((prev) => ({
              ...prev,
              board: prev.board.map((u) => (u.instanceId === target.instanceId ? target : u)),
            }));
            triggerResurrectionVfx(
              [{ unitId: target.instanceId, unitName: target.name, side: enemySide }],
              420
            );
            addLog(`🪽 [Ressurreição] ${target.name} caiu para Centelha, mas ressuscitou com seus atributos originais!`, 'spell');
          } else {
            addLog(`✨💀 [Centelha] Fulminou ${target.name} com seu clarão sagrado!`, 'kill');
            enemySetter((prevEnemy) => ({
              ...prevEnemy,
              board: prevEnemy.board.filter((c) => c.instanceId !== target.instanceId),
              graveyard: [...prevEnemy.graveyard, target],
            }));
            triggerPhilioEliminationBonus(isPlayer ? 'player' : 'opponent', 1, [target.instanceId]);
          }
        } else {
          if (!blockedByBarrier) {
            addLog(
              `✨⚡ [Centelha] Atingiu ${target.name} (Vida ${target.hp}/${target.maxHp}, Def ${target.def}) e aplicou TORPOR por 2 rodadas!`,
              'spell'
            );
          }
          enemySetter((prevEnemy) => ({
            ...prevEnemy,
            board: prevEnemy.board.map((u) => {
              if (u.instanceId !== target.instanceId) return u;
              const conds = new Set(u.conditions);
              if (blockedByBarrier) conds.delete('barreira');
              conds.add('entorpecer');
              return {
                ...u,
                hp: target.hp,
                def: target.def,
                ...(target.sapience !== undefined ? { sapience: target.sapience } : {}),
                conditions: conds,
                conditionSources: target.conditionSources ? { ...target.conditionSources } : u.conditionSources,
                entorpecerRoundsRemaining: target.entorpecerRoundsRemaining,
              };
            }),
          }));
        }
      };

      if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: 'Centelha - Clarão Sagrado (Rápida)',
          description: `Escolha uma unidade inimiga de ${enemy.name} para causar 15 de dano (30 se ATORDOADA) e aplicar TORPOR por 2 rodadas:`,
          candidates: aliveEnemies,
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            finalizeSpell(
              `✨⚡ Centelha lançada contra ${target.name}!`,
              () => applyCentelha(target),
              target.name,
              target.instanceId
            );
          },
        });
        return;
      } else {
        const stunned = aliveEnemies.filter((e) => e.conditions.has('atordoado'));
        const pool = stunned.length > 0 ? stunned : aliveEnemies;
        const target = [...pool].sort((a, b) => (b.atk + b.power) - (a.atk + a.power))[0];
        finalizeSpell(
          `${caster.name} lançou Centelha contra ${target.name}!`,
          () => applyCentelha(target),
          target.name,
          target.instanceId
        );
      }
    }

    // PATCH 1.4.1 — Token 33: Filho da Luz [Rápida - Fugaz - Tier 5 - Granty]
    // "Restaura totalmente a Resistência (Vida e Defesa) de uma unidade aliada." (+ Secreto: revela Cavaleiro sem Nome como Faleziel, o Arcanjo!)
    else if (card.templateId === 'token_filho_da_luz' || card.name.toLowerCase().includes('filho da luz')) {
      const aliveAllies = caster.board.filter((c) => c.hp > 0);
      if (aliveAllies.length === 0) {
        if (isInteractiveUser) addLog(`Você precisa de pelo menos uma unidade aliada em campo para usar Filho da Luz.`, 'info');
        return;
      }

      const allySide = isPlayer ? 'player' : 'opponent';
      const casterSetter = isPlayer ? setPlayer : setOpponent;

      const applyFilhoDaLuz = (target: CardInstance) => {
        triggerSkillVfx('token_filho_da_luz', allySide, target.instanceId, target.name);
        const restoredDef = Math.max(target.def, target.baseDef ?? target.def, target.icePeakDefense ?? 0);
        const restoredHp = hasCorrosao(target) ? target.hp : target.maxHp;
        if (hasCorrosao(target)) {
          addLog(`🧪🚫 [Corrosão] A cura de Vida de Filho da Luz sobre ${target.name} foi cortada pela Corrosão (apenas a Defesa foi restaurada)!`, 'info');
        }
        const isSecretCavaleiro =
          (target.templateId === 'm_cavaleiro_sem_nome' || target.name.toLowerCase().includes('cavaleiro sem nome')) &&
          !target.isRevealedFaleziel;

        if (isSecretCavaleiro) {
          sound.playFusion();
          const falezielTpl = CARD_TEMPLATES.find((t) => t.id === 'm_faleziel');
          const cavaleiroTpl = CARD_TEMPLATES.find((t) => t.id === 'm_cavaleiro_sem_nome');
          const hpDelta = falezielTpl ? falezielTpl.hp - (cavaleiroTpl?.hp ?? falezielTpl.hp) : 0;
          const atkDelta = falezielTpl ? falezielTpl.atk - (cavaleiroTpl?.atk ?? falezielTpl.atk) : 0;
          const defDelta = falezielTpl ? falezielTpl.def - (cavaleiroTpl?.def ?? falezielTpl.def) : 0;
          const powerDelta = falezielTpl ? falezielTpl.power - (cavaleiroTpl?.power ?? falezielTpl.power) : 0;
          const falezielName = falezielTpl?.name || 'Faleziel, o Arcanjo';
          let updatedBoardSnap: CardInstance[] = [];
          casterSetter((prev) => {
            updatedBoardSnap = prev.board.map((u) => {
              if (u.instanceId !== target.instanceId) return u;
              const conds = new Set(u.conditions);
              conds.add('tenacidade');
              const nextMaxHp = Math.max(1, u.maxHp + hpDelta);
              const transformed: CardInstance = {
                ...u,
                templateId: falezielTpl?.id || 'm_faleziel',
                name: falezielName,
                kingdom: falezielTpl?.kingdom || u.kingdom,
                tier: falezielTpl?.tier || u.tier,
                element: falezielTpl?.element || u.element,
                isRevealedFaleziel: true,
                isArchangel: falezielTpl?.isArchangel ?? true,
                exclusiveName: falezielTpl?.exclusiveName || 'Arcanjo Oculto · Aliança Angiris',
                effectDescription:
                  falezielTpl?.effectDescription ||
                  'Revelado pelo poder de Filho da Luz! Possui Aliança Angiris (+50% de dano e -50% de dano sofrido com outro Arcanjo) e Tenacidade.',
                maxHp: nextMaxHp,
                hp: nextMaxHp,
                atk: Math.max(0, u.atk + atkDelta),
                baseAtk: Math.max(0, u.baseAtk + atkDelta),
                def: Math.max(restoredDef, (u.baseDef ?? restoredDef) + defDelta),
                baseDef: Math.max(0, (u.baseDef ?? u.def) + defDelta),
                conditions: conds,
                conditionSources: withConditionSource(u.conditionSources, 'tenacidade', 'passiva_propria', falezielName),
              };
              if (powerDelta !== 0) {
                addPowerPoints(transformed, powerDelta);
              }
              return transformed;
            });
            return { ...prev, board: updatedBoardSnap };
          });
          triggerElementalBurst({ ...target, element: falezielTpl?.element || 'Divino' }, 'power', allySide);
          queueUnitVfx({
            type: 'faleziel_revelacao_angiris',
            sourceId: target.instanceId,
            ownerSide: allySide,
          });
          addLog(
            `🪽✨ [SEGREDO REVELADO!] Filho da Luz despertou a verdadeira identidade do Cavaleiro sem Nome: ${falezielName.toUpperCase()}! Resistência totalmente restaurada e Aliança Angiris ativada!`,
            'spell'
          );
          if (hasCelestialCouncilVictory(updatedBoardSnap)) {
            addLog(
              `🪽✨ [CONSELHO CELESTIAL REUNIDO!] Todos os 5 Tiers de Arcanjos (1 a 5) estão na mesa! Se permanecerem até o fim da rodada, o Conselho curará totalmente a Vida e ativará a vitória!`,
              'spell'
            );
          }
        } else if (
          (target.templateId === 'm_atlaziel' || target.name.toLowerCase().includes('atlaziel')) &&
          !target.isArchangel
        ) {
          sound.playFusion();
          let updatedBoardSnap: CardInstance[] = [];
          casterSetter((prev) => {
            updatedBoardSnap = prev.board.map((u) =>
              u.instanceId === target.instanceId
                ? {
                    ...u,
                    hp: restoredHp,
                    def: restoredDef,
                    isArchangel: true,
                    effectDescription:
                      'Ao encerrar a rodada em que Atlaziel estiver na mesa EXECUTA inimigos com 17 ou menos de Vida afetados por PRAGA.\nPassiva: Aliança Angiris (Despertada por Filho da Luz).',
                    ...(u.sapience != null ? { sapience: restoredHp } : {}),
                  }
                : u
            );
            return { ...prev, board: updatedBoardSnap };
          });
          triggerElementalBurst({ ...target, element: 'Divino' }, 'power', allySide);
          queueUnitVfx({
            type: 'faleziel_revelacao_angiris',
            sourceId: target.instanceId,
            ownerSide: allySide,
          });
          addLog(
            `🪽✨ [ALIANÇA ANGIRIS DESPERTADA!] Filho da Luz revigorou ${target.name}, restaurando totalmente sua Resistência e ativando sua passiva Aliança Angiris!`,
            'spell'
          );
          if (hasCelestialCouncilVictory(updatedBoardSnap)) {
            addLog(
              `🪽✨ [CONSELHO CELESTIAL REUNIDO!] Todos os 5 Tiers de Arcanjos (1 a 5) estão na mesa! Se permanecerem até o fim da rodada, o Conselho curará totalmente a Vida e ativará a vitória!`,
              'spell'
            );
          }
        } else {
          sound.playSpell();
          casterSetter((prev) => ({
            ...prev,
            board: prev.board.map((u) =>
              u.instanceId === target.instanceId
                ? {
                    ...u,
                    hp: restoredHp,
                    def: restoredDef,
                    ...(u.sapience != null ? { sapience: restoredHp } : {}),
                  }
                : u
            ),
          }));
          addLog(
            `🪽✨ [Filho da Luz] Restaurou 100% da Resistência de ${target.name} (Vida ${restoredHp}/${target.maxHp}, Defesa ${restoredDef})!`,
            'spell'
          );
        }
      };

      if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: 'Filho da Luz - Restauração Divina (Rápida)',
          description: `Escolha uma unidade aliada de ${caster.name} para restaurar totalmente sua Vida e Defesa:`,
          candidates: aliveAllies,
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            finalizeSpell(
              `🪽 Filho da Luz iluminou ${target.name}, restaurando totalmente sua Resistência!`,
              () => applyFilhoDaLuz(target),
              target.name,
              target.instanceId
            );
          },
        });
        return;
      } else {
        const cavaleiro = aliveAllies.find((a) => a.templateId === 'm_cavaleiro_sem_nome' && !a.isRevealedFaleziel);
        const atlazielUnawakened = aliveAllies.find(
          (a) => (a.templateId === 'm_atlaziel' || a.name.toLowerCase().includes('atlaziel')) && !a.isArchangel
        );
        const mostDamaged = [...aliveAllies].sort(
          (a, b) => (b.maxHp - b.hp + Math.max(0, b.baseDef - b.def)) - (a.maxHp - a.hp + Math.max(0, a.baseDef - a.def))
        )[0];
        const target = cavaleiro || atlazielUnawakened || mostDamaged;
        finalizeSpell(
          `🪽 ${caster.name} lançou Filho da Luz em ${target.name}!`,
          () => applyFilhoDaLuz(target),
          target.name,
          target.instanceId
        );
      }
    }

    // PATCH 1.4.1 — Spell 34: Destino Fatal [Rápida - Tier 3 - Musmo]
    // "Seleciona uma unidade em campo (aliada ou inimiga) e aplica EXECUTAR."
    // Executa instantaneamente ignorando Vida e Defesa, respeitando Imunidade e permitindo Ressurreição.
    else if (card.templateId === 'm_destino_fatal' || card.name.toLowerCase().includes('destino fatal')) {
      const allBoardUnits = [...caster.board, ...enemy.board].filter((c) => c.hp > 0);
      if (allBoardUnits.length === 0) {
        if (isInteractiveUser) addLog(`Não há unidades em campo para aplicar Destino Fatal.`, 'info');
        return;
      }

      const applyExecutar = (target: CardInstance) => {
        const wasOnEnemyBoard = enemy.board.some((c) => c.instanceId === target.instanceId);
        const ownerSide: 'player' | 'opponent' = wasOnEnemyBoard
          ? (isPlayer ? 'opponent' : 'player')
          : (isPlayer ? 'player' : 'opponent');
        const ownerSetter = ownerSide === 'player' ? setPlayer : setOpponent;
        const ownerRefSnapshot = ownerSide === 'player' ? playerRef.current : opponentRef.current;

        triggerSkillVfx('m_destino_fatal', ownerSide, target.instanceId, target.name);

        if (target.conditions.has('imunidade') || isOSolLevel2Immortal(target) || isALuaLevel2Supreme(target)) {
          addLog(`🌟 [IMUNIDADE] ${target.name} resistiu à sentença de EXECUTAR de Destino Fatal!`, 'spell');
          return;
        }

        // General Bor Mesofênix (prioridade obrigatória caso ainda não tenha revivido e não silenciado)
        if (target.templateId === 'g_bor' && !ownerRefSnapshot.borRevivedOnce && target.silencedRounds === 0) {
          target.hp = Math.round(target.maxHp * 1.5);
          target.maxHp = target.hp;
          target.atk = Math.round(target.atk * 1.5);
          target.def = Math.round(target.def * 1.5);
          target.icePeakDefense = Math.max(target.icePeakDefense ?? 0, target.def);
          addPowerPoints(target, Math.max(0, Math.round(target.power * 1.5) - target.power), false);
          target.conditions.add('cura');
          setCardConditionSource(target, 'cura', 'passiva_propria', target.name);
          ownerSetter((prev) => ({
            ...prev,
            borRevivedOnce: true,
            board: prev.board.map((u) => (u.instanceId === target.instanceId ? target : u)),
          }));
          triggerBorPhoenixVfx(target.instanceId, ownerSide, 420);
          addLog(`🔥 [O Mesofênix] General Bor foi executado por Destino Fatal, mas renasceu com +50% em atributos e Cura permanente!`, 'spell');
          return;
        }

        // Ressurreição (EXECUTAR permite Ressurreição, ao contrário de OBLITERAR)
        if (target.conditions.has('ressurreicao')) {
          target.conditions.delete('ressurreicao');
          removeCardConditionSource(target, 'ressurreicao');
          target.permanentRessurreicao = false;
          target.hp = target.maxHp;
          target.atk = target.baseAtk;
          target.def = target.baseDef;
          target.icePeakDefense = target.baseDef;
          target.power = target.basePower;
          target.peakPower = target.basePower;
          syncClassPowerBonuses(target);
          ownerSetter((prev) => ({
            ...prev,
            board: prev.board.map((u) => (u.instanceId === target.instanceId ? target : u)),
          }));
          triggerResurrectionVfx(
            [{ unitId: target.instanceId, unitName: target.name, side: ownerSide }],
            420
          );
          addLog(`🪽 [Ressurreição] ${target.name} foi executado por Destino Fatal, mas retornou com seus atributos originais!`, 'spell');
          return;
        }

        sound.playDeath();
        queueConditionVfx([
          {
            condition: 'executar',
            targetUnitId: target.instanceId,
            targetUnitName: target.name,
            targetSide: ownerSide,
          },
        ]);

        const executedUnit: CardInstance = {
          ...target,
          hp: 0,
          def: 0,
          conditions: new Set(target.conditions),
        };

        ownerSetter((prev) => ({
          ...prev,
          board: prev.board.filter((c) => c.instanceId !== target.instanceId),
          graveyard: prev.board.some((c) => c.instanceId === target.instanceId)
            ? [...prev.graveyard, executedUnit]
            : prev.graveyard,
        }));

        if (wasOnEnemyBoard) {
          triggerPhilioEliminationBonus(isPlayer ? 'player' : 'opponent', 1, [target.instanceId]);
        }
        addLog(`💀⚔️ [EXECUTAR] ${target.name} foi executado instantaneamente por Destino Fatal (ignorando Vida e Defesa)!`, 'kill');
      };

      if (isInteractiveUser) {
        setTargetModal({
          isOpen: true,
          title: 'Destino Fatal - EXECUTAR (Rápida)',
          description: `Selecione qualquer unidade em campo (aliada ou inimiga) para aplicar EXECUTAR (ignora Vida e Defesa, respeita Imunidade e permite Ressurreição):`,
          candidates: allBoardUnits,
          onSelect: (target) => {
            setTargetModal((prev) => ({ ...prev, isOpen: false }));
            finalizeSpell(
              `💀⚔️ Destino Fatal aplicado em ${target.name}!`,
              () => applyExecutar(target),
              target.name,
              target.instanceId
            );
          },
        });
        return;
      } else {
        const enemyPool = enemy.board.filter((c) => c.hp > 0 && !c.conditions.has('imunidade'));
        const fallbackPool = enemy.board.filter((c) => c.hp > 0);
        const pool = enemyPool.length > 0 ? enemyPool : (fallbackPool.length > 0 ? fallbackPool : allBoardUnits);
        const target = [...pool].sort((a, b) => (b.hp + b.def + b.power) - (a.hp + a.def + a.power))[0];
        finalizeSpell(
          `${caster.name} lançou Destino Fatal para EXECUTAR ${target.name}!`,
          () => applyExecutar(target),
          target.name,
          target.instanceId
        );
      }
    }
  };

  // ----------------------------------------------------
  // COMBAT DECLARATION & RESOLUTION
  // ----------------------------------------------------
  const handleToggleAttackerSelection = (cardId: string) => {
    setSelectedAttackerIds((prev) => {
      const isPlayerUnit = player.board.some((c) => c.instanceId === cardId);
      const otherSideIds = new Set((isPlayerUnit ? opponent.board : player.board).map((c) => c.instanceId));
      const sameSidePrev = prev.filter((id) => !otherSideIds.has(id));
      if (sameSidePrev.includes(cardId)) {
        return sameSidePrev.filter((id) => id !== cardId);
      }
      const attackingBoard = isPlayerUnit ? player.board : opponent.board;
      const targetCard = attackingBoard.find((c) => c.instanceId === cardId);
      if (targetCard?.templateId === 'm_lamina_inverno') {
        sound.playDiscard();
        addLog('❄️ A Lâmina do Inverno não pode ser designada para ataque nem defesa!', 'info');
        return sameSidePrev;
      }
      if (targetCard?.conditions.has('atordoado') || targetCard?.conditions.has('dormindo')) {
        sound.playDiscard();
        addLog(`🚫 ${targetCard.name} está imóvel (${targetCard.conditions.has('atordoado') ? 'Atordoado' : 'Dormindo'}) e não pode atacar!`, 'info');
        return sameSidePrev;
      }
      if (targetCard?.templateId === 'n_pedrinha' || targetCard?.name.toLowerCase() === 'pedrinha') {
        sound.playDiscard();
        addLog('🪨 Pedrinha não pode ATACAR, apenas defender!', 'info');
        return sameSidePrev;
      }
      const maxSlots = attackingBoard.length;
      if (sameSidePrev.length >= maxSlots) {
        addLog(`Você pode escolher até todas as suas ${maxSlots} unidades em campo para atacar simultaneamente!`, 'info');
        return sameSidePrev;
      }
      return [...sameSidePrev, cardId];
    });
  };

  // Confirm declaration of attack
  const handleConfirmAttack = () => {
    if (isOnlinePvp && turnPlayer !== 'player') return;
    if (isAttackTransitioningRef.current || isDefendingPhase) return;
    const validSelectedIds = isOnlinePvp
      ? selectedAttackerIds.filter((id) => player.board.some((c) => c.instanceId === id))
      : selectedAttackerIds;
    if (validSelectedIds.length === 0) {
      addLog('Selecione pelo menos 1 carta da sua mesa para atacar.', 'info');
      return;
    }

    isAttackTransitioningRef.current = true;
    setIsAttackTransitioning(true);

    const combatAttackerId: 'player' | 'opponent' = player.board.some((c) =>
      validSelectedIds.includes(c.instanceId)
    )
      ? 'player'
      : opponent.board.some((c) => validSelectedIds.includes(c.instanceId))
      ? 'opponent'
      : attackerRole;
    const attackingPlayer = combatAttackerId === 'player' ? player : opponent;
    const defendingPlayer = combatAttackerId === 'player' ? opponent : player;
    const attackingCards = attackingPlayer.board.filter((c) => validSelectedIds.includes(c.instanceId));

    // Check if any attacking card has the condition "enfrentar"
    // "No ato de ataque unidades com Enfrentar ativo podem escolher qual carta irá defender o seu ataque. Fica a critério do jogador atacante escolher ou não."
    // Titano Nível 2 também pode ENFRENTAR unidades dormindo!
    const enfrentarAttackers = attackingCards.filter((c) => c.conditions.has('enfrentar'));
    const eligibleDefenders = defendingPlayer.board.filter(
      (c) =>
        !c.conditions.has('atordoado') &&
        !c.conditions.has('dormindo') &&
        c.templateId !== 'm_lamina_inverno'
    );

    if (enfrentarAttackers.length > 0 && eligibleDefenders.length > 0) {
      const firstAtk = enfrentarAttackers[0];
      setEnfrentarModal({
        attackerQueue: enfrentarAttackers,
        currentAttacker: firstAtk,
        attackingCards,
        enemyCandidates: eligibleDefenders,
        forcedBlocks: {},
      });
      return;
    }

    finalizeAttackDeclaration(attackingCards, {});
  };

  const handleSelectForcedDefender = (chosenEnemy: CardInstance) => {
    if (!enfrentarModal) return;
    const currentAtk = enfrentarModal.currentAttacker;
    if (chosenEnemy.conditions.has('atordoado')) {
      addLog(`🚫 ${chosenEnemy.name} está Atordoado e não pode defender!`, 'info');
      return;
    }
    if (chosenEnemy.conditions.has('dormindo')) {
      addLog(`🚫 ${chosenEnemy.name} está Dormindo e não pode defender!`, 'info');
      return;
    }
    const newForced = { ...enfrentarModal.forcedBlocks, [currentAtk.instanceId]: chosenEnemy.instanceId };
    addLog(`⚔️ ENFRENTAR: ${currentAtk.name} forçou ${chosenEnemy.name} a defender o seu ataque!`, 'attack');

    const nextQueue = enfrentarModal.attackerQueue.filter((c) => c.instanceId !== currentAtk.instanceId);
    if (nextQueue.length > 0) {
      const nextCandidates = enfrentarModal.enemyCandidates.filter((c) => c.instanceId !== chosenEnemy.instanceId);
      setEnfrentarModal({
        ...enfrentarModal,
        attackerQueue: nextQueue,
        currentAttacker: nextQueue[0],
        enemyCandidates: nextCandidates,
        forcedBlocks: newForced,
      });
    } else {
      const allAttackers = enfrentarModal.attackingCards;
      setEnfrentarModal(null);
      finalizeAttackDeclaration(allAttackers, newForced);
    }
  };

  const handleSkipForcedDefender = () => {
    if (!enfrentarModal) return;
    const currentAtk = enfrentarModal.currentAttacker;
    addLog(`⚔️ ENFRENTAR: Você optou por não forçar defensor específico para ${currentAtk.name}.`, 'info');

    const nextQueue = enfrentarModal.attackerQueue.filter((c) => c.instanceId !== currentAtk.instanceId);
    if (nextQueue.length > 0) {
      setEnfrentarModal({
        ...enfrentarModal,
        attackerQueue: nextQueue,
        currentAttacker: nextQueue[0],
      });
    } else {
      const allAttackers = enfrentarModal.attackingCards;
      const forced = enfrentarModal.forcedBlocks;
      setEnfrentarModal(null);
      finalizeAttackDeclaration(allAttackers, forced);
    }
  };

  const finalizeAttackDeclaration = (
    attackingCards: CardInstance[],
    forcedBlocks: Record<string, string>,
    combatAttackerIdOverride?: 'player' | 'opponent'
  ) => {
    const combatAttackerId: 'player' | 'opponent' =
      combatAttackerIdOverride ??
      (attackingCards.length > 0 && player.board.some((c) => c.instanceId === attackingCards[0].instanceId)
        ? 'player'
        : attackingCards.length > 0 && opponent.board.some((c) => c.instanceId === attackingCards[0].instanceId)
        ? 'opponent'
        : attackerRole);
    const isPlayer = combatAttackerId === 'player';
    const attackingPlayer = isPlayer ? player : opponent;
    const defendingPlayer = isPlayer ? opponent : player;
    const isDefenseCounterAttack =
      combatAttackerId !== attackerRoleRef.current && Boolean(attackingPlayer.canAttackOnDefense);

    isAttackTransitioningRef.current = true;
    setIsAttackTransitioning(true);
    setActiveCombatAttackerRole(combatAttackerId);
    sound.playAttackDeclare();
    resetAttackerPasses();
    if (!isDefenseCounterAttack) {
      hasAttackedThisRoundRef.current = true;
      setHasAttackedThisRound(true);
    }
    setConsecutiveTimeouts((prev) => ({ ...prev, [combatAttackerId]: 0 }));

    // Comandante Virtus: Sempre que declarar ataque com Comandante Virtus na mesa todas as unidades aliadas recebem +1 em todos seus atributos.
    const hasVirtus = attackingPlayer.board.some(
      (c) =>
        (c.templateId === 'g_comandante_virtus' ||
          c.templateId === 'g_virtus' ||
          c.name.toLowerCase().includes('virtus')) &&
        c.hp > 0 &&
        c.silencedRounds === 0
    );
    if (hasVirtus) {
      attackingCards.forEach((c) => {
        c.hp += 1;
        c.maxHp += 1;
        c.atk += 1;
        c.baseAtk += 1;
        addDefensePoints(c, 1);
        addPowerPoints(c, 1);
      });
      const setter = isPlayer ? setPlayer : setOpponent;
      setter((p) => ({
        ...p,
        board: p.board.map((c) => {
          if (attackingCards.some((atk) => atk.instanceId === c.instanceId)) {
            return c;
          }
          const updatedAlly: CardInstance = {
            ...c,
            hp: c.hp + 1,
            maxHp: c.maxHp + 1,
            atk: c.atk + 1,
            baseAtk: c.baseAtk + 1,
            conditions: new Set(c.conditions),
            conditionSources: c.conditionSources ? { ...c.conditionSources } : undefined,
          };
          addDefensePoints(updatedAlly, 1);
          addPowerPoints(updatedAlly, 1);
          return updatedAlly;
        }),
      }));
      sound.playSpell();
      const virtusUnit = attackingPlayer.board.find(
        (c) =>
          (c.templateId === 'g_comandante_virtus' ||
            c.templateId === 'g_virtus' ||
            c.name.toLowerCase().includes('virtus')) &&
          c.hp > 0 &&
          c.silencedRounds === 0
      );
      if (virtusUnit) {
        queueUnitVfx({
          type: 'virtus_impetus',
          sourceId: virtusUnit.instanceId,
          targetIds: attackingPlayer.board.filter((c) => c.hp > 0).map((c) => c.instanceId),
          ownerSide: combatAttackerId,
        });
      }
      addLog(
        `⚔️ [Comandante Virtus] Ataque declarado! Todas as unidades de ${attackingPlayer.name} receberam permanentemente +1 em todos os seus atributos!`,
        'spell'
      );
    }

    // Rei Mauricio novo efeito:
    // "Em toda declaração de ataque em que Rei Mauricio estiver presente, recebe CRITICO e concede BRAVURA a todas a unidades aliadas apenas durante o ataque."
    const mauricioAttacker = attackingCards.find(
      (c) =>
        c.templateId === 'm_rei_mauricio' ||
        c.templateId === 'm_mauricio' ||
        c.name.toLowerCase().includes('mauricio')
    );
    if (mauricioAttacker && mauricioAttacker.silencedRounds === 0) {
      mauricioAttacker.conditions.add('critico');
      setCardConditionSource(mauricioAttacker, 'critico', 'efeito_unico_proprio', mauricioAttacker.name);
      attackingCards.forEach((c) => {
        c.conditions.add('bravura');
        setCardConditionSource(
          c,
          'bravura',
          c.instanceId === mauricioAttacker.instanceId ? 'efeito_unico_proprio' : 'unidade_compartilhada',
          mauricioAttacker.name
        );
      });
      sound.playSpell();
      queueUnitVfx({
        type: 'rei_mauricio_decree',
        sourceId: mauricioAttacker.instanceId,
        targetIds: attackingCards.map((c) => c.instanceId),
        ownerSide: combatAttackerId,
      });
      addLog(
        `👑⚡ [Rei Mauricio] Liderança Soberana: Recebeu CRÍTICO e concedeu BRAVURA a todas as unidades aliadas durante o ataque!`,
        'spell'
      );
    }

    attackingCards.forEach((c) => {
      if ((c.templateId === 'g_barao_well' || c.name.toLowerCase().includes('well')) && c.silencedRounds === 0) {
        c.conditions.add('bravura');
        setCardConditionSource(c, 'bravura', 'efeito_unico_proprio', c.name);
        addLog(`⚡ Barão Well assumiu posição de ATACANTE: Condição Bravura ativada!`, 'spell');
      }
    });

    if (attackingPlayer.canAttackOnDefense) {
      const setter = isPlayer ? setPlayer : setOpponent;
      setter((prev) => ({ ...prev, canAttackOnDefense: false }));
    }

    setDeclaredAttackers(attackingCards);
    setSelectedAttackerIds([]);
    setAssignedBlocks(forcedBlocks);
    setEnfrentarLockedBlocks(forcedBlocks);
    setIsDefendingPhase(true);
    if (isPlayer) {
      setPlayerAttackCompletedCount((c) => c + 1);
      setPlayerOrbActionCount((c) => c + 1);
    }

    addLog(
      `${attackingPlayer.name} declarou ataque${isDefenseCounterAttack ? ' (Zyk - Transcendência Defensiva)' : ''} com ${attackingCards.length} carta(s): ${attackingCards.map((c) => c.name).join(', ')}. Vez de defesa!`,
      'attack'
    );

    // If defending player is AI, let AI choose remaining defense
    if (defendingPlayer.isAi) {
      setTimeout(() => {
        let aiBlocks = decideAiDefense(attackingCards, defendingPlayer.board, forcedBlocks);
        // Tutorial: facilitate real combat while ensuring player steadily damages the Instructor
        if (isTutorialMode) {
          const lockedKeys = new Set(Object.keys(forcedBlocks));
          const maxTutorBlocks = attackingCards.length >= 2 ? 1 : 0;
          const trimmed: Record<string, string> = {};
          let count = 0;
          for (const [atkId, defId] of Object.entries(aiBlocks)) {
            if (lockedKeys.has(atkId) || count < maxTutorBlocks) {
              trimmed[atkId] = defId;
              count++;
            }
          }
          aiBlocks = trimmed;
        }
        setAssignedBlocks(aiBlocks);
        resolveCombat(attackingCards, aiBlocks, combatAttackerId);
      }, 1200);
    } else {
      isAttackTransitioningRef.current = false;
      setIsAttackTransitioning(false);
    }
  };

  // Assign blocker (during defense phase) - Strictly 1-to-1 blocker constraint!
  const handleAssignBlocker = (attackerId: string, defenderId: string) => {
    if (enfrentarLockedBlocks[attackerId]) {
      addLog('Esta unidade defensora foi forçada pelo efeito Enfrentar e não pode ser desvinculada!', 'info');
      return;
    }
    const defendingBoard = activeCombatAttackerRole === 'player' ? opponent.board : player.board;
    const defCard = defendingBoard.find((c) => c.instanceId === defenderId);
    if (defCard?.templateId === 'm_lamina_inverno') {
      sound.playDiscard();
      addLog('❄️ A Lâmina do Inverno não pode ser designada para ataque nem defesa!', 'info');
      return;
    }
    if (defCard?.conditions.has('atordoado') || defCard?.conditions.has('dormindo')) {
      sound.playDiscard();
      addLog(
        `🚫 ${defCard.name} está ${defCard.conditions.has('atordoado') ? 'Atordoado' : 'Dormindo'} e não pode ser designado para defender!`,
        'info'
      );
      return;
    }
    setAssignedBlocks((prev) => {
      const next = { ...prev };
      if (next[attackerId] === defenderId) {
        delete next[attackerId]; // toggle off
      } else {
        // Enforce 1-to-1: if this defender is already assigned to any other attacker, release that attacker!
        for (const [otherAtkId, otherDefId] of Object.entries(next)) {
          if (otherDefId === defenderId) {
            if (enfrentarLockedBlocks[otherAtkId]) {
              addLog('Esta unidade defensora já está travada pelo efeito Enfrentar em outro combate!', 'info');
              return prev;
            }
            delete next[otherAtkId];
          }
        }
        next[attackerId] = defenderId;
      }
      return next;
    });
    setAssigningBlockForAttacker(null);
  };

  // Remove blocker from a specific attacker
  const handleRemoveBlocker = (attackerId: string) => {
    if (enfrentarLockedBlocks[attackerId]) {
      addLog('Esta unidade defensora foi forçada pelo efeito Enfrentar e não pode ser removida!', 'info');
      return;
    }
    setAssignedBlocks((prev) => {
      const next = { ...prev };
      delete next[attackerId];
      return next;
    });
  };

  // Confirm defense (when Player is Defender or in 2-player pass & play)
  const handleConfirmDefense = () => {
    if (isOnlinePvp && (!isDefendingPhase || activeCombatAttackerRole !== 'opponent')) return;
    setConsecutiveTimeouts({ player: 0, opponent: 0 });
    const attackingPlayerId: 'player' | 'opponent' =
      declaredAttackers.length > 0 && player.board.some((c) => c.instanceId === declaredAttackers[0].instanceId)
        ? 'player'
        : declaredAttackers.length > 0 && opponent.board.some((c) => c.instanceId === declaredAttackers[0].instanceId)
        ? 'opponent'
        : activeCombatAttackerRole;
    if (attackingPlayerId === 'opponent') {
      setPlayerDefenseCompletedCount((c) => c + 1);
      setPlayerOrbActionCount((c) => c + 1);
    }
    resolveCombat(declaredAttackers, assignedBlocks, attackingPlayerId);
  };

  // Defense phase timeout (Patch 1.3): immediately resolves combat accepting direct damage
  const handleDefenseTimeout = useCallback(() => {
    addLog('Tempo de defesa esgotado! Resolvendo combate imediatamente com dano direto para os atacantes sem bloqueio.', 'attack');
    sound.playClash();
    setAssigningBlockForAttacker(null);
    setEnfrentarModal(null);
    const attackingPlayerId: 'player' | 'opponent' =
      declaredAttackers.length > 0 && player.board.some((c) => c.instanceId === declaredAttackers[0].instanceId)
        ? 'player'
        : declaredAttackers.length > 0 && opponent.board.some((c) => c.instanceId === declaredAttackers[0].instanceId)
        ? 'opponent'
        : activeCombatAttackerRole;
    resolveCombat(declaredAttackers, assignedBlocks, attackingPlayerId);
  }, [declaredAttackers, player.board, opponent.board, activeCombatAttackerRole, assignedBlocks, addLog]);

  useEffect(() => {
    handleDefenseTimeoutRef.current = handleDefenseTimeout;
  }, [handleDefenseTimeout]);

  // Execute full combat resolution
  const resolveCombat = (
    attackers: CardInstance[],
    blocks: Record<string, string>,
    attackingPlayerId: 'player' | 'opponent'
  ) => {
    const isPlayerAttacking = attackingPlayerId === 'player';
    const attackerBoard = isPlayerAttacking ? [...player.board] : [...opponent.board];
    const defenderBoard = isPlayerAttacking ? [...opponent.board] : [...player.board];

    const results: CombatResultDetail[] = [];
    let directDamageTotal = 0;

    const isAttackerSolo = attackers.length === 1;
    // Check if O Sol (Nível 2 - O Absoluto) is present in this attack declaration (alone or full board)
    const hasOSolLvl2Attacking = attackers.some((atk) => {
      const inst = attackerBoard.find((c) => c.instanceId === atk.instanceId) || atk;
      return (
        (inst.templateId === 'n_o_sol' || inst.name.trim().toLowerCase().startsWith('o sol')) &&
        inst.level === 2 &&
        inst.silencedRounds === 0
      );
    });

    if (hasOSolLvl2Attacking) {
      sound.playSpell();
      addLog(
        `🕳️☀️ [O ABSOLUTO - BURACO NEGRO] O Sol (Nível 2) atacou! Todas as unidades inimigas que defenderem serão OBLITERADAS instantaneamente!`,
        'attack'
      );
    }

    // Check if O Sol (Nível 2 - O Absoluto) is defending (alone or full board)
    const hasOSolLvl2Defending = Object.values(blocks).some((defId) => {
      const inst = defenderBoard.find((c) => c.instanceId === defId);
      return (
        inst &&
        (inst.templateId === 'n_o_sol' || inst.name.trim().toLowerCase().startsWith('o sol')) &&
        inst.level === 2 &&
        inst.silencedRounds === 0
      );
    });

    if (hasOSolLvl2Defending) {
      sound.playSpell();
      addLog(
        `🕳️☀️ [O ABSOLUTO - DEFESA DO BURACO NEGRO] O Sol (Nível 2) está defendendo! Todas as unidades inimigas que atacarem serão OBLITERADAS instantaneamente!`,
        'attack'
      );
    }

    for (const atkCard of attackers) {
      const currentAtkInstance = attackerBoard.find((c) => c.instanceId === atkCard.instanceId);
      if (!currentAtkInstance) continue;

      const defenderId = blocks[atkCard.instanceId];
      const defCard = defenderId ? defenderBoard.find((c) => c.instanceId === defenderId) : undefined;
      const defWasLvl1 = defCard?.level === 1;

      const defenderTenacidadeActive = isPlayerAttacking ? Boolean(opponent.tenacidadeActive) : Boolean(player.tenacidadeActive);
      const res = resolveCombatPair(
        currentAtkInstance,
        defCard,
        votoSilencioActive,
        attackerBoard,
        defenderBoard,
        defenderTenacidadeActive,
        undefined,
        isAttackerSolo,
        hasOSolLvl2Attacking,
        hasOSolLvl2Defending
      );
      results.push(res);

      // Se Lunario subiu para o Nível 2 ao defender o 2º ataque:
      if (
        defWasLvl1 &&
        defCard &&
        defCard.level === 2 &&
        (defCard.templateId === 'g_lunario' || defCard.name.toLowerCase().includes('lunario'))
      ) {
        sound.playFusion();
        addLog(
          `🌙👑 ASCENSÃO LUNAR! Lunario defendeu seu 2º ataque e evoluiu para o NÍVEL 2 (Devorador de Sonhos)!`,
          'spell'
        );
        triggerLevelUpCinematic(
          defCard,
          'Efeito EXTRA Despertado: No início de cada nova rodada, consome o efeito SONO de todas as unidades na mesa, ganhando +5/+5 de Sapiência e Poder por cada SONO consumido e causando 7 de dano!'
        );
      }

      // Patch 1.1 / Rework: Titano level up tracking and level 2 permanent Sangramento effect (only if not silenced)
      const isTitanoAttacking =
        (currentAtkInstance.templateId === 'm_titano' ||
          currentAtkInstance.name.toLowerCase().includes('titano')) &&
        currentAtkInstance.silencedRounds === 0;
      if (isTitanoAttacking) {
        if (res.attackerDamageDealt > 0) {
          const strikes = currentAtkInstance.hasDoubleAttack ? 2 : 1;
          currentAtkInstance.levelUpProgress = (currentAtkInstance.levelUpProgress || 0) + strikes;
          if (currentAtkInstance.levelUpProgress >= 3 && currentAtkInstance.level === 1) {
            currentAtkInstance.level = 2;
            currentAtkInstance.conditions.add('ataque_duplo');
            currentAtkInstance.hasDoubleAttack = true;
            setCardConditionSource(currentAtkInstance, 'ataque_duplo', 'passiva_propria', currentAtkInstance.name);
            addPowerPoints(currentAtkInstance, 20);
            currentAtkInstance.exclusiveName = 'Carrasco dos Mares & Sangramento';
            currentAtkInstance.effectDescription =
              'Lendária [Tier 5 - Nível 2]. Possui Ataque-Duplo. Recebe +20 de poder e pode causar Sangramento permanentemente.\nPassiva: Causar dano em unidades afetadas por SANGRAMENTO concede CURA a Titano por 2 rodadas.';
            sound.playFusion();
            addLog(
              `🌊👑 ASCENSÃO! Titano causou dano 3 vezes a unidades inimigas e evoluiu para o NÍVEL 2! Mantém Ataque-Duplo, recebeu +20 de Poder e agora causa SANGRAMENTO permanentemente!`,
              'spell'
            );
            triggerLevelUpCinematic(
              currentAtkInstance,
              'Efeito EXTRA Despertado: Possui Ataque-Duplo, recebeu +20 de Poder e pode causar SANGRAMENTO permanentemente em seus ataques!'
            );
          }
        }
      }

      // Se defensor for Titano e causar dano de rebote (apenas se não estiver silenciado):
      if (
        defCard &&
        (defCard.templateId === 'm_titano' || defCard.name.toLowerCase().includes('titano')) &&
        defCard.silencedRounds === 0
      ) {
        if (res.reboundDamageDealt > 0) {
          defCard.levelUpProgress = (defCard.levelUpProgress || 0) + 1;
          if (defCard.levelUpProgress >= 3 && defCard.level === 1) {
            defCard.level = 2;
            defCard.conditions.add('ataque_duplo');
            defCard.hasDoubleAttack = true;
            setCardConditionSource(defCard, 'ataque_duplo', 'passiva_propria', defCard.name);
            addPowerPoints(defCard, 20);
            defCard.exclusiveName = 'Carrasco dos Mares & Sangramento';
            defCard.effectDescription =
              'Lendária [Tier 5 - Nível 2]. Possui Ataque-Duplo. Recebe +20 de poder e pode causar Sangramento permanentemente.\nPassiva: Causar dano em unidades afetadas por SANGRAMENTO concede CURA a Titano por 2 rodadas.';
            sound.playFusion();
            addLog(
              `🌊👑 ASCENSÃO! Titano defendeu causando dano a unidades inimigas e evoluiu para o NÍVEL 2! Mantém Ataque-Duplo, recebeu +20 de Poder e agora causa SANGRAMENTO permanentemente!`,
              'spell'
            );
            triggerLevelUpCinematic(
              defCard,
              'Efeito EXTRA Despertado: Possui Ataque-Duplo, recebeu +20 de Poder e pode causar SANGRAMENTO permanentemente em seus ataques!'
            );
          }
        }
      }

      // Wyr, o Dragão: "Eliminar uma unidade desafiada por ENFRENTAR cura toda a VIDA de Wyr."
      const isWyrAttacker =
        (currentAtkInstance.templateId === 'n_wyr' || currentAtkInstance.name.toLowerCase().includes('wyr')) &&
        currentAtkInstance.silencedRounds === 0;
      const wasForcedChallengedByEnfrentar =
        Boolean(defenderId) &&
        Boolean(enfrentarLockedBlocks[atkCard.instanceId]) &&
        enfrentarLockedBlocks[atkCard.instanceId] === defenderId;

      if (isWyrAttacker && wasForcedChallengedByEnfrentar && res.defenderDied) {
        if (hasCorrosao(currentAtkInstance)) {
          addLog(`🧪🚫 [Corrosão] ${currentAtkInstance.name} eliminou o alvo desafiado, mas a Corrosão cortou sua cura total de Vida!`, 'info');
        } else {
          currentAtkInstance.hp = currentAtkInstance.maxHp;
          sound.playSpell();
          queueUnitVfx({
            type: 'wyr_dragon_heal',
            sourceId: currentAtkInstance.instanceId,
            ownerSide: attackingPlayerId,
          });
          addLog(
            `🐉✨ [Wyr, o Dragão] Duelo do Dragão triunfante! Wyr eliminou a unidade desafiada (${defCard?.name ?? 'defensor'}) e restaurou 100% de sua Vida (${currentAtkInstance.hp}/${currentAtkInstance.maxHp})!`,
            'spell'
          );
        }
      }

      // Sacerdote Daniel: Roubo de Vida (only if not silenced)
      // Ativa quando Daniel atinge a vida do jogador inimigo OU causa dano em combate.
      // Prioridade: 1 de Vida ao jogador -> 10 de Vida ao próprio Daniel -> 10 de Vida ao aliado com menor vida na mesa.
      if (
        (res.directPlayerDamage > 0 || res.attackerDamageDealt > 0) &&
        (currentAtkInstance.templateId === 'g_daniel' || currentAtkInstance.name.toLowerCase().includes('daniel')) &&
        currentAtkInstance.silencedRounds === 0
      ) {
        const friendlyState = isPlayerAttacking ? player : opponent;
        const friendlySetter = isPlayerAttacking ? setPlayer : setOpponent;

        if (friendlyState.hp < friendlyState.maxHp) {
          friendlySetter((prev) => ({
            ...prev,
            hp: Math.min(prev.maxHp, prev.hp + 1),
          }));
          addLog(
            `🩸 ROUBO DE VIDA! ${currentAtkInstance.name} curou +1 ponto de vida para ${friendlyState.name}!`,
            'spell'
          );
        } else if (currentAtkInstance.hp < currentAtkInstance.maxHp) {
          if (hasCorrosao(currentAtkInstance)) {
            addLog(`🧪🚫 [Corrosão] ${currentAtkInstance.name} teve sua própria cura de Roubo de Vida cortada pela Corrosão!`, 'info');
          } else {
            currentAtkInstance.hp = Math.min(currentAtkInstance.maxHp, currentAtkInstance.hp + 10);
            addLog(
              `🩸 ROUBO DE VIDA! A vida de ${friendlyState.name} já estava cheia: ${currentAtkInstance.name} curou a si mesmo em +10 de Vida (${currentAtkInstance.hp}/${currentAtkInstance.maxHp})!`,
              'spell'
            );
          }
        } else {
          // Find ally with lowest HP on friendly board (other than Daniel)
          const allies = attackerBoard.filter((c) => c.instanceId !== currentAtkInstance.instanceId && c.hp > 0);
          if (allies.length > 0) {
            const lowestAlly = [...allies].sort((a, b) => a.hp - b.hp)[0];
            if (hasCorrosao(lowestAlly)) {
              addLog(`🧪🚫 [Corrosão] ${lowestAlly.name} teve a cura de Roubo de Vida de Daniel cortada pela Corrosão!`, 'info');
            } else {
              lowestAlly.hp = Math.min(lowestAlly.maxHp, lowestAlly.hp + 10);
              if (
                (lowestAlly.templateId === 'n_charmagon' ||
                  lowestAlly.templateId === 'm_charmagon' ||
                  lowestAlly.name.toLowerCase().includes('charmagon')) &&
                lowestAlly.silencedRounds === 0
              ) {
                lowestAlly.atk += 5;
                lowestAlly.baseAtk += 5;
                addPowerPoints(lowestAlly, 5);
                addLog(
                  `🔥🐉 [Charmagon] Ao ser curado por Daniel, Charmagon recebeu +5 de Ataque e +5 de Poder!`,
                  'spell'
                );
              }
              addLog(
                `🩸 ROUBO DE VIDA! Como a vida do líder e de Daniel estavam no máximo, ${currentAtkInstance.name} curou ${lowestAlly.name} em +10 de Vida (${lowestAlly.hp}/${lowestAlly.maxHp})!`,
                'spell'
              );
            }
          }
        }
        sound.playSpell();
      }

      if (res.directPlayerDamage > 0) {
        directDamageTotal += res.directPlayerDamage;

        // Finn, o Fada:
        // "A PRIMEIRA VEZ que Finn atacar a vida do jogador inimigo aumenta +1 da vida máxima do jogador aliado."
        if (
          (currentAtkInstance.templateId === 'm_finn' || currentAtkInstance.name.toLowerCase().includes('finn')) &&
          currentAtkInstance.silencedRounds === 0 &&
          !currentAtkInstance.finnBuffedPlayerHpOnce
        ) {
          currentAtkInstance.finnBuffedPlayerHpOnce = true;
          const friendlyState = isPlayerAttacking ? player : opponent;
          const friendlySetter = isPlayerAttacking ? setPlayer : setOpponent;
          friendlySetter((prev) => ({
            ...prev,
            maxHp: prev.maxHp + 1,
            hp: prev.hp + 1,
          }));
          sound.playSpell();
          queueUnitVfx({
            type: 'finn_hp_boost',
            sourceId: currentAtkInstance.instanceId,
            targetPlayerSide: attackingPlayerId,
            ownerSide: attackingPlayerId,
          });
          addLog(
            `🧚🌿 [Finn, o Fada] Atingiu a vida do jogador inimigo pela 1ª vez e aumentou +1 da Vida Máxima de ${friendlyState.name}!`,
            'spell'
          );
        }
      }
    }

    // Play clash sounds
    if (directDamageTotal > 0) {
      sound.playPlayerHit();
    } else {
      sound.playClash();
    }

    // Collect resurrected units during combat so the celestial Ressurreição / Bor Phoenix VFX fire right as combat commits
    const combatResurrectedEvents: Array<Omit<ConditionVfxEvent, 'id'>> = [];
    const combatBorPhoenixEvents: Array<{ unitId: string; side: 'player' | 'opponent' }> = [];

    // Check unit revival (Ressurreição and General Bor Mesofênix):
    const handleUnitDeathOrRevival = (
      c: CardInstance,
      playerRef: PlayerState,
      setFn: React.Dispatch<React.SetStateAction<PlayerState>>,
      role: 'attacker' | 'defender'
    ): boolean => {
      // O Sol Nível 2 & A Lua Nível 2 são IMORTAIS! Jamais podem ser destruídos ou obliterados.
      if (isOSolLevel2Immortal(c)) {
        c.hp = 999999;
        c.maxHp = 999999;
        c.atk = 999999;
        c.def = 999999;
        c.power = 999999;
        c.conditions.add('imunidade');
        setCardConditionSource(c, 'imunidade', 'efeito_unico_proprio', c.name);
        return true;
      }
      if (isALuaLevel2Supreme(c)) {
        c.hp = 999999;
        c.maxHp = 999999;
        c.sapience = 999999;
        c.power = 999999;
        c.conditions.add('imunidade');
        setCardConditionSource(c, 'imunidade', 'efeito_unico_proprio', c.name);
        return true;
      }

      if (c.hp > 0 && !c.conditions.has('obliteracao')) return false;

      // OBLITERAÇÃO: Elimina uma carta instantaneamente (ignora ressurreições)
      if (c.conditions.has('obliteracao')) {
        c.hp = 0;
        return false;
      }

      // 1. Check General Bor Mesofênix revival first (MANDATORY PREFERENCE over generic Ressurreição, only if not silenced):
      // "Este efeito é aplicado apenas UMA e na primeira vez que morre, caso Bor tenha o efeito Ressuscitar e a sua passiva ainda ativa, a preferência inicial é obrigatoriamente sua passiva ser ativada ao morrer. Ao ressuscitar recebe +50% em todos seus atributos e Cura até o fim do combate."
      if (c.templateId === 'g_bor' && !playerRef.borRevivedOnce && c.silencedRounds === 0) {
        c.hp = Math.round(c.maxHp * 1.5);
        c.maxHp = c.hp;
        c.atk = Math.round(c.atk * 1.5);
        c.def = Math.round(c.def * 1.5);
        c.icePeakDefense = Math.max(c.icePeakDefense ?? 0, c.def);
        const borPowerGain = Math.max(0, Math.round(c.power * 1.5) - c.power);
        addPowerPoints(c, borPowerGain, false);
        c.conditions.add('cura');
        setCardConditionSource(c, 'cura', 'passiva_propria', c.name);
        c.conditions.delete('atordoado');
        c.conditions.delete('dormindo');
        removeCardConditionSource(c, 'atordoado');
        removeCardConditionSource(c, 'dormindo');
        setFn((prev) => ({ ...prev, borRevivedOnce: true }));
        results.forEach((r) => {
          if (role === 'attacker' && r.attackerCard?.instanceId === c.instanceId) {
            r.attackerResurrected = true;
            r.attackerBorPhoenix = true;
            r.attackerDied = false;
            r.description += ` 🔥 O MESOFÊNIX! General Bor renasceu com +50% em atributos e Cura permanente!`;
          }
          if (role === 'defender' && r.defenderCard?.instanceId === c.instanceId) {
            r.defenderResurrected = true;
            r.defenderBorPhoenix = true;
            r.defenderDied = false;
            r.description += ` 🔥 O MESOFÊNIX! General Bor renasceu com +50% em atributos e Cura permanente!`;
          }
        });
        const borSide: 'player' | 'opponent' =
          role === 'attacker' ? attackingPlayerId : attackingPlayerId === 'player' ? 'opponent' : 'player';
        combatBorPhoenixEvents.push({ unitId: c.instanceId, side: borSide });
        addLog(`🔥 O MESOFÊNIX! General Bor renasceu das cinzas com +50% em todos os seus atributos e Cura permanente pelo resto do combate!`, 'spell');
        return true; // Survived via Mesofênix!
      }

      // 2. Check "Ressurreição" condition:
      // "Ao morrer a unidade retorna a vida com todos os valores de seus atributos originais, ou seja, como se fosse invocado novamente."
      if (c.conditions.has('ressurreicao')) {
        c.conditions.delete('ressurreicao');
        removeCardConditionSource(c, 'ressurreicao');
        c.permanentRessurreicao = false;
        // Restore to original base stats
        c.hp = c.maxHp;
        c.atk = c.baseAtk;
        c.def = c.baseDef;
        c.icePeakDefense = c.baseDef;
        c.power = c.basePower;
        c.peakPower = c.basePower;
        c.icePowerDefGranted = hasCardClass(c, 'Gelo') ? Math.floor(c.basePower * 0.5) : 0;
        c.teluricoPowerHpGranted = hasCardClass(c, 'Telúrico') ? Math.floor(c.basePower * 0.5) : 0;
        c.teluricoPowerDefGranted = hasCardClass(c, 'Telúrico') ? Math.floor(c.basePower * 0.5) : 0;
        c.neutroPowerHpGranted = hasCardClass(c, 'Neutro') ? Math.floor(c.basePower) : 0;
        c.neutroPowerAtkGranted = hasCardClass(c, 'Neutro') ? Math.floor(c.basePower) : 0;
        c.neutroPowerDefGranted = hasCardClass(c, 'Neutro') ? Math.floor(c.basePower) : 0;
        c.votoSilencioSavedPower = undefined;
        c.votoSilencioRoundsRemaining = 0;
        c.votoSilencioTeluricoBonusRemoved = undefined;
        c.votoSilencioTeluricoHpRemoved = undefined;
        c.votoSilencioTeluricoDefBonusRemoved = undefined;
        c.votoSilencioTeluricoDefRemoved = undefined;
        c.votoSilencioGeloBonusRemoved = undefined;
        c.votoSilencioGeloDefRemoved = undefined;
        c.votoSilencioNeutroHpBonusRemoved = undefined;
        c.votoSilencioNeutroHpRemoved = undefined;
        c.votoSilencioNeutroAtkBonusRemoved = undefined;
        c.votoSilencioNeutroAtkRemoved = undefined;
        c.votoSilencioNeutroDefBonusRemoved = undefined;
        c.votoSilencioNeutroDefRemoved = undefined;
        c.conditions.delete('atordoado');
        c.conditions.delete('dormindo');
        c.conditions.delete('corrosao');
        c.conditions.delete('sangramento');
        c.corrosaoRoundsRemaining = 0;
        c.sangramentoRoundsRemaining = 0;
        c.sangramentoMarks = 0;
        removeCardConditionSource(c, 'atordoado');
        removeCardConditionSource(c, 'dormindo');
        removeCardConditionSource(c, 'corrosao');
        removeCardConditionSource(c, 'sangramento');

        // Mark on combat results
        results.forEach((r) => {
          if (role === 'attacker' && r.attackerCard?.instanceId === c.instanceId) {
            r.attackerResurrected = true;
            r.attackerDied = false;
            r.description += ` ✨ ${c.name} RESSUSCITOU com atributos originais restaurados!`;
          }
          if (role === 'defender' && r.defenderCard?.instanceId === c.instanceId) {
            r.defenderResurrected = true;
            r.defenderDied = false;
            r.description += ` ✨ ${c.name} RESSUSCITOU com atributos originais restaurados!`;
          }
        });

        const revivedSide: 'player' | 'opponent' =
          role === 'attacker'
            ? attackingPlayerId
            : attackingPlayerId === 'player'
            ? 'opponent'
            : 'player';
        combatResurrectedEvents.push({
          condition: 'ressurreicao',
          targetUnitId: c.instanceId,
          targetUnitName: c.name,
          targetSide: revivedSide,
          labelOverride: `🪽✨ RESSURREIÇÃO! ${c.name} RENASCEU!`,
        });

        addLog(
          `✨ RESSURREIÇÃO ATIVADA! ${c.name} sucumbiu em batalha, mas retornou à vida com todos os atributos originais!`,
          'spell'
        );
        return true; // Survived via Ressurreição!
      }

      return false; // Actually dead
    };

    // Filter surviving and dead cards
    const survivingAttackers: CardInstance[] = [];
    const deadAttackers: CardInstance[] = [];
    attackerBoard.forEach((c) => {
      const targetState = isPlayerAttacking ? player : opponent;
      const setFn = isPlayerAttacking ? setPlayer : setOpponent;
      if (c.hp <= 0 && handleUnitDeathOrRevival(c, targetState, setFn, 'attacker')) {
        survivingAttackers.push(c);
      } else if (c.hp <= 0) {
        deadAttackers.push(c);
      } else {
        survivingAttackers.push(c);
      }
    });

    const survivingDefenders: CardInstance[] = [];
    const deadDefenders: CardInstance[] = [];
    defenderBoard.forEach((c) => {
      const targetState = isPlayerAttacking ? opponent : player;
      const setFn = isPlayerAttacking ? setOpponent : setPlayer;
      if (c.hp <= 0 && handleUnitDeathOrRevival(c, targetState, setFn, 'defender')) {
        survivingDefenders.push(c);
      } else if (c.hp <= 0) {
        deadDefenders.push(c);
      } else {
        survivingDefenders.push(c);
      }
    });

    // Check Karlo explosion on death:
    // "Quando Karlo é eliminado ele explode e causa 100% do seu Poder como dano em todas as unidades inimigas."
    const defendingPlayerId: 'player' | 'opponent' = attackingPlayerId === 'player' ? 'opponent' : 'player';
    deadAttackers.forEach((c) => {
      if (c.templateId === 'g_karlo') {
        const exp = triggerKarloExplosion(c, survivingDefenders, votoSilencioActive);
        if (exp.damageDealt > 0) {
          sound.playDeath();
          queueUnitVfx({
            type: 'karlo_death_shockwave',
            sourceId: c.instanceId,
            targetIds: survivingDefenders.map((x) => x.instanceId),
            ownerSide: attackingPlayerId,
          });
          addLog(
            `💥 EXPLOSÃO DE KARLO! Ao morrer, Karlo detonou causando ${exp.damageDealt} de dano a todas as unidades inimigas!${
              exp.killedNames.length > 0 ? ` Eliminou: ${exp.killedNames.join(', ')}!` : ''
            }`,
            'spell'
          );
        }
      }
      if (c.templateId === 'm_kore') {
        const res = triggerKoreDeath(c, survivingDefenders);
        if (res.damageDealt > 0) {
          sound.playDeath();
          queueUnitVfx({
            type: 'kore_death_blast',
            sourceId: c.instanceId,
            targetIds: survivingDefenders.map((x) => x.instanceId),
            ownerSide: attackingPlayerId,
          });
          addLog(
            `❄️💀 [Kore - Eco Criogênico] Ao morrer, Kore congelou todos os inimigos e causou ${res.damageDealt} de dano (75% da Defesa)!${
              res.killedNames.length > 0 ? ` Eliminou: ${res.killedNames.join(', ')}!` : ''
            }`,
            'spell'
          );
        }
      }
    });

    deadDefenders.forEach((c) => {
      if (c.templateId === 'g_karlo') {
        const exp = triggerKarloExplosion(c, survivingAttackers, votoSilencioActive);
        if (exp.damageDealt > 0) {
          sound.playDeath();
          queueUnitVfx({
            type: 'karlo_death_shockwave',
            sourceId: c.instanceId,
            targetIds: survivingAttackers.map((x) => x.instanceId),
            ownerSide: defendingPlayerId,
          });
          addLog(
            `💥 EXPLOSÃO DE KARLO! Ao morrer, Karlo detonou causando ${exp.damageDealt} de dano a todas as unidades inimigas!${
              exp.killedNames.length > 0 ? ` Eliminou: ${exp.killedNames.join(', ')}!` : ''
            }`,
            'spell'
          );
        }
      }
      if (c.templateId === 'm_kore') {
        const res = triggerKoreDeath(c, survivingAttackers);
        if (res.damageDealt > 0) {
          sound.playDeath();
          queueUnitVfx({
            type: 'kore_death_blast',
            sourceId: c.instanceId,
            targetIds: survivingAttackers.map((x) => x.instanceId),
            ownerSide: defendingPlayerId,
          });
          addLog(
            `❄️💀 [Kore - Eco Criogênico] Ao morrer, Kore congelou todos os inimigos e causou ${res.damageDealt} de dano (75% da Defesa)!${
              res.killedNames.length > 0 ? ` Eliminou: ${res.killedNames.join(', ')}!` : ''
            }`,
            'spell'
          );
        }
      }
    });

    // Patch 1.1: Karaty on-kill trigger (only if not silenced)
    // "Eliminar uma unidade inimiga faz com que Karaty lance uma rajada elétrica em todos os inimigos causando 6 de dano."
    results.forEach((r) => {
      const isKaratyAttacker =
        (r.attackerCard?.templateId === 'n_karaty' ||
          r.attackerName.toLowerCase().includes('karaty')) &&
        (r.attackerCard?.silencedRounds ?? 0) === 0;
      const isKaratyDefender =
        (r.defenderCard?.templateId === 'n_karaty' ||
          (r.defenderName && r.defenderName.toLowerCase().includes('karaty'))) &&
        (r.defenderCard?.silencedRounds ?? 0) === 0;

      if (isKaratyAttacker && r.defenderDied) {
        sound.playClash();
        if (r.attackerCard) {
          queueUnitVfx({
            type: 'karaty_chain_lightning',
            sourceId: r.attackerCard.instanceId,
            targetIds: survivingDefenders.map((x) => x.instanceId),
            ownerSide: attackingPlayerId,
          });
        }
        addLog(
          `⚡💥 [Karaty - Rajada Elétrica] Ao eliminar uma unidade inimiga, Karaty disparou uma rajada elétrica em todos os inimigos causando 6 de dano (+20% em Eletrificados)!`,
          'spell'
        );
        survivingDefenders.forEach((targetEnemy) => {
          let dmg = targetEnemy.conditions.has('eletrificado') ? Math.round(6 * 1.20) : 6;
          if (targetEnemy.conditions.has('congelado')) dmg = Math.round(dmg * 1.5);
          if (targetEnemy.conditions.has('tenacidade')) dmg = Math.max(0, Math.round(dmg * 0.65));
          if (targetEnemy.def >= dmg) {
            targetEnemy.def -= dmg;
          } else {
            const rem = dmg - targetEnemy.def;
            targetEnemy.def = 0;
            targetEnemy.hp = Math.max(0, targetEnemy.hp - rem);
          }
        });
      }

      if (isKaratyDefender && r.attackerDied) {
        sound.playClash();
        if (r.defenderCard) {
          queueUnitVfx({
            type: 'karaty_chain_lightning',
            sourceId: r.defenderCard.instanceId,
            targetIds: survivingAttackers.map((x) => x.instanceId),
            ownerSide: defendingPlayerId,
          });
        }
        addLog(
          `⚡💥 [Karaty - Rajada Elétrica] Ao eliminar uma unidade atacante em defesa, Karaty disparou uma rajada elétrica em todos os inimigos causando 6 de dano (+20% em Eletrificados)!`,
          'spell'
        );
        survivingAttackers.forEach((targetEnemy) => {
          let dmg = targetEnemy.conditions.has('eletrificado') ? Math.round(6 * 1.20) : 6;
          if (targetEnemy.conditions.has('congelado')) dmg = Math.round(dmg * 1.5);
          if (targetEnemy.conditions.has('tenacidade')) dmg = Math.max(0, Math.round(dmg * 0.65));
          if (targetEnemy.def >= dmg) {
            targetEnemy.def -= dmg;
          } else {
            const rem = dmg - targetEnemy.def;
            targetEnemy.def = 0;
            targetEnemy.hp = Math.max(0, targetEnemy.hp - rem);
          }
        });
      }
    });

    // Secondary sweep: Verify if any units were brought to 0 HP or less by Karlo's explosion, Karaty's burst or other death effects
    const finalSurvivingDefenders: CardInstance[] = [];
    survivingDefenders.forEach((c) => {
      const targetState = isPlayerAttacking ? opponent : player;
      const setFn = isPlayerAttacking ? setOpponent : setPlayer;
      if (c.hp <= 0 && handleUnitDeathOrRevival(c, targetState, setFn, 'defender')) {
        finalSurvivingDefenders.push(c);
      } else if (c.hp <= 0) {
        deadDefenders.push(c);
      } else {
        finalSurvivingDefenders.push(c);
      }
    });

    const finalSurvivingAttackers: CardInstance[] = [];
    survivingAttackers.forEach((c) => {
      const targetState = isPlayerAttacking ? player : opponent;
      const setFn = isPlayerAttacking ? setPlayer : setOpponent;
      if (c.hp <= 0 && handleUnitDeathOrRevival(c, targetState, setFn, 'attacker')) {
        finalSurvivingAttackers.push(c);
      } else if (c.hp <= 0) {
        deadAttackers.push(c);
      } else {
        finalSurvivingAttackers.push(c);
      }
    });

    // Limpeza de buffs temporários de ataque concedidos por Rei Mauricio:
    // "recebe CRITICO e concede BRAVURA a todas a unidades aliadas apenas durante o ataque."
    const hadMauricioAttacking = attackers.some(
      (c) =>
        c.templateId === 'm_rei_mauricio' ||
        c.templateId === 'm_mauricio' ||
        c.name.toLowerCase().includes('mauricio')
    );
    if (hadMauricioAttacking) {
      finalSurvivingAttackers.forEach((c) => {
        const isMauricio =
          c.templateId === 'm_rei_mauricio' ||
          c.templateId === 'm_mauricio' ||
          c.name.toLowerCase().includes('mauricio');
        if (isMauricio) {
          c.conditions.delete('critico');
          removeCardConditionSource(c, 'critico');
        }
        if (c.templateId !== 'n_ilio') {
          c.conditions.delete('bravura');
          removeCardConditionSource(c, 'bravura');
        }
      });
    }

    // Philio Universal Elimination Scaling: +2 Power permanently whenever an enemy unit is eliminated
    const applyPhilioToCards = (
      cards: CardInstance[],
      kills: number,
      ownerName: string,
      philioOwnerSide: 'player' | 'opponent',
      deadEnemyIds: string[]
    ): CardInstance[] => {
      if (kills <= 0) return cards;
      let philioCardId: string | undefined;
      let finalPower = 0;
      const updated = cards.map((c) => {
        if (
          (c.templateId === 'm_philio' || c.name.toLowerCase().includes('philio')) &&
          c.hp > 0 &&
          c.silencedRounds === 0
        ) {
          philioCardId = c.instanceId;
          const bonus = 2 * kills;
          const nextPhilio = withAddedPowerPoints(c, bonus);
          finalPower = nextPhilio.power;
          return nextPhilio;
        }
        return c;
      });
      if (philioCardId) {
        sound.playSpell();
        queueUnitVfx({
          type: 'philio_soul_orb',
          sourceId: philioCardId,
          targetIds: deadEnemyIds,
          ownerSide: philioOwnerSide,
        });
        addLog(
          `🧬✨ [Philio] ${kills} unidade(s) inimiga(s) eliminada(s)! Philio na mesa de ${ownerName} acumulou +${2 * kills} de Poder permanente (Poder atual: ${finalPower})!`,
          'spell'
        );
      }
      return updated;
    };

    // Post-combat Level Up Check for Saniel, o Arcanjo (requires completing 2 attacks, only if not silenced)
    for (const atkCard of attackers) {
      const currentAtkInstance = finalSurvivingAttackers.find((c) => c.instanceId === atkCard.instanceId);
      if (!currentAtkInstance) continue;

      const isSaniel =
        (currentAtkInstance.templateId === 'n_seniel' ||
          currentAtkInstance.templateId === 'n_saniel' ||
          currentAtkInstance.name.toLowerCase().includes('saniel') ||
          currentAtkInstance.name.toLowerCase().includes('seniel')) &&
        currentAtkInstance.silencedRounds === 0;

      if (isSaniel) {
        currentAtkInstance.attackCount = (currentAtkInstance.attackCount || 0) + 1;
        if (currentAtkInstance.attackCount >= 2 && currentAtkInstance.level !== 2) {
          currentAtkInstance.level = 2;
          queueUnitVfx({
            type: 'saniel_ascensao_lvl2',
            sourceId: currentAtkInstance.instanceId,
            ownerSide: attackingPlayerId,
          });
          addLog(
            `🌟 ASCENSÃO LENDÁRIA! ${currentAtkInstance.name} concluiu seu 2º ataque e SUBIU PARA O NÍVEL 2!`,
            'spell'
          );
          triggerLevelUpCinematic(
            currentAtkInstance,
            'Efeito Exclusivo Despertado: Ao abater qualquer inimigo em combate, absorve permanentemente todos os atributos (Vida, Ataque, Defesa e Poder) e condições da vítima, somando 50% do Poder absorvido ao seu Ataque!'
          );
        } else if (currentAtkInstance.level !== 2) {
          addLog(`⚔️ ${currentAtkInstance.name} concluiu o ataque [${currentAtkInstance.attackCount}/2 ataques para Nível 2]!`, 'info');
        }
      }
    }

    // Post-combat Level Up Check for Licia, a Fada (only if not silenced):
    // "Requisito para subir de nível: 2 ou + unidades com efeito Furtivo ativo atacam simultaneamente."
    // "Nível 2: Licia compartilha seu valor de Poder atual com todos seus aliados em mesa na hora que subiu de nível, entrega Furtivo a todos os aliados, recebe ETÉREO e concede +10 Poder a unidades Furtivas a cada nova rodada."
    const stealthAttackers = attackers.filter((c) => c.conditions.has('furtividade') && c.silencedRounds === 0);
    if (stealthAttackers.length >= 2) {
      const licia = finalSurvivingAttackers.find(
        (c) => (c.templateId === 'm_licia' || c.name.toLowerCase().includes('licia')) && c.level === 1 && c.silencedRounds === 0
      );
      if (licia) {
        licia.level = 2;
        licia.conditions.add('furtividade');
        licia.conditions.add('etereo');
        setCardConditionSource(licia, 'furtividade', 'efeito_unico_proprio', licia.name);
        setCardConditionSource(licia, 'etereo', 'efeito_unico_proprio', licia.name);
        licia.exclusiveName = 'Guardiã do Véu';
        licia.effectDescription =
          'Lendária [Tier 5 - Nível 2]. Ao subir de nível, compartilha seu valor de PODER atual e entrega Furtivo a todas as unidades aliadas na mesa! Concede +10 de PODER a todas as unidades furtivas a cada nova rodada e possui o efeito exclusivo ETÉREO (só pode ser defendida por outra unidade ETÉREA).';
        const sharedPower = getBonusPowerValue(licia);
        finalSurvivingAttackers.forEach((ally) => {
          if (ally.instanceId !== licia.instanceId) {
            addPowerPoints(ally, sharedPower);
            setCardConditionSource(ally, 'furtividade', 'unidade_compartilhada', licia.name);
          }
          ally.conditions.add('furtividade');
        });
        sound.playFusion();
        queueUnitVfx({
          type: 'licia_lvl2_light_wave',
          sourceId: licia.instanceId,
          targetIds: finalSurvivingAttackers.map((a) => a.instanceId),
          ownerSide: attackingPlayerId,
        });
        setTimeout(() => {
          triggerSkillVfx('cond_etereo', isPlayerAttacking ? 'player' : 'opponent', licia.instanceId, licia.name);
        }, 300);
        addLog(
          `🧚‍♀️ ASCENSÃO FÉRICA! Licia subiu para o NÍVEL 2 após ataque furtivo em conjunto! Recebeu ETÉREO, compartilhou +${sharedPower} de Poder e entregou Furtivo a todos os aliados em campo!`,
          'spell'
        );
        triggerLevelUpCinematic(
          licia,
          `Efeito Exclusivo Despertado: Recebeu ETÉREO, compartilhou +${sharedPower} Poder permanente, entregou Furtividade a todos os aliados e concede +10 Poder às unidades Furtivas a cada nova rodada!`
        );
      }
    }

    // Post-combat Level Up Check for Hélio: Realizar uma rodada de ataque sozinho (apenas se não estiver silenciado)
    if (attackers.length === 1) {
      const soleAttacker = finalSurvivingAttackers.find((c) => c.instanceId === attackers[0].instanceId);
      const isHelio =
        soleAttacker &&
        (soleAttacker.templateId === 'n_helio' ||
          soleAttacker.name.toLowerCase().includes('helio') ||
          soleAttacker.name.toLowerCase().includes('hélio'));
      if (soleAttacker && isHelio && soleAttacker.level === 1 && soleAttacker.silencedRounds === 0) {
        soleAttacker.level = 2;
        soleAttacker.name = 'Hélio, o Arauto do Sol Cósmico';
        soleAttacker.exclusiveName = 'Fúria Solar';
        soleAttacker.effectDescription =
          'Lendária [Tier 5 - Nível 2]. Caso seja a única unidade designada em um ATAQUE, DOBRA seu valor de ATAQUE. Se eliminar uma unidade defensora, se cura em 10 de Resistência (priorizando a Vida e depois a Defesa).';
        sound.playFusion();
        addLog(`☀️👑 ASCENSÃO SOLAR! Hélio realizou uma rodada de ataque sozinho e subiu para o NÍVEL 2!`, 'spell');
        triggerLevelUpCinematic(
          soleAttacker,
          'Efeito EXTRA Despertado: Dobra o Ataque se atacar sozinho e se cura em 10 de Resistência ao eliminar defensores!'
        );
      }
    }

    const finalPlayerBoard = isPlayerAttacking
      ? applyPhilioToCards(finalSurvivingAttackers, deadDefenders.length, player.name, 'player', deadDefenders.map((d) => d.instanceId))
      : applyPhilioToCards(finalSurvivingDefenders, deadAttackers.length, player.name, 'player', deadAttackers.map((a) => a.instanceId));

    const finalOpponentBoard = isPlayerAttacking
      ? applyPhilioToCards(finalSurvivingDefenders, deadAttackers.length, opponent.name, 'opponent', deadAttackers.map((a) => a.instanceId))
      : applyPhilioToCards(finalSurvivingAttackers, deadDefenders.length, opponent.name, 'opponent', deadDefenders.map((d) => d.instanceId));

    // Se Barelio foi eliminado em combate, liberta imediatamente o prisioneiro para a mesa adversária!
    deadAttackers.forEach((c) => {
      if (c.imprisonedUnit && c.imprisonedUnit.hp > 0) {
        const rescued: CardInstance = {
          ...c.imprisonedUnit,
          conditions: new Set(c.imprisonedUnit.conditions),
          conditionSources: c.imprisonedUnit.conditionSources ? { ...c.imprisonedUnit.conditionSources } : undefined,
        };
        c.imprisonedUnit = undefined;
        c.imprisonedOriginalOwner = undefined;
        if (isPlayerAttacking) {
          finalOpponentBoard.push(rescued);
        } else {
          finalPlayerBoard.push(rescued);
        }
        addLog(`⛓️🔓 [LIBERTAÇÃO!] ${c.name} foi eliminado em combate e ${rescued.name} se libertou das correntes de volta para a mesa!`, 'spell');
      }
    });

    deadDefenders.forEach((c) => {
      if (c.imprisonedUnit && c.imprisonedUnit.hp > 0) {
        const rescued: CardInstance = {
          ...c.imprisonedUnit,
          conditions: new Set(c.imprisonedUnit.conditions),
          conditionSources: c.imprisonedUnit.conditionSources ? { ...c.imprisonedUnit.conditionSources } : undefined,
        };
        c.imprisonedUnit = undefined;
        c.imprisonedOriginalOwner = undefined;
        if (isPlayerAttacking) {
          finalPlayerBoard.push(rescued);
        } else {
          finalOpponentBoard.push(rescued);
        }
        addLog(`⛓️🔓 [LIBERTAÇÃO!] ${c.name} foi eliminado em defesa e ${rescued.name} se libertou das correntes de volta para a mesa!`, 'spell');
      }
    });

    // Gangnyr: "Ver uma unidade sofrer hemorragia recebe Roubo de vida pelo resto do combate." (gatilho imediato caso a 4ª marca ocorra em combate)
    const combatHemoVictims = results
      .filter((r) => r.hemorrhageTriggeredDefender && r.defenderCard)
      .map((r) => r.defenderCard!.instanceId);
    if (combatHemoVictims.length > 0) {
      const grantCombatGangnyrLifeSteal = (board: CardInstance[], ownerSide: 'player' | 'opponent') => {
        board.forEach((g) => {
          if (
            (g.templateId === 'g_gangnyr' || g.name.toLowerCase().includes('gangnyr')) &&
            g.hp > 0 &&
            g.silencedRounds === 0
          ) {
            g.conditions.add('roubo_de_vida');
            g.hasLifeSteal = true;
            g.lifeStealRoundsRemaining = undefined;
            setCardConditionSource(g, 'roubo_de_vida', 'efeito_unico_proprio', g.name);
            sound.playSpell();
            queueUnitVfx({
              type: 'gangnyr_hemorrhage_burst',
              sourceId: g.instanceId,
              targetIds: combatHemoVictims,
              ownerSide,
            });
            addLog(
              `🩸🦇 [Gangnyr - Sede de Hemorragia] Gangnyr testemunhou uma unidade sofrer HEMORRAGIA em combate e despertou ROUBO DE VIDA permanente pelo resto do combate!`,
              'spell'
            );
          }
        });
      };
      grantCombatGangnyrLifeSteal(finalPlayerBoard, 'player');
      grantCombatGangnyrLifeSteal(finalOpponentBoard, 'opponent');
    }

    // Calculate next leader HPs and win/loss conditions (including Corte das Fadas miracle save)
    let nextPlayerHp = player.hp;
    let nextOpponentHp = opponent.hp;
    let gameOverTrigger: 'player' | 'opponent' | undefined = undefined;
    let gameOverReason: string | undefined = undefined;

    if (isPlayerAttacking) {
      nextOpponentHp = Math.max(0, opponent.hp - directDamageTotal);
      if (nextOpponentHp <= 0) {
        if (!opponent.corteDasFadasUsed && hasCorteDasFadas(finalOpponentBoard)) {
          nextOpponentHp = 2;
          const fadaIds: string[] = [];
          finalOpponentBoard.forEach((u) => {
            if (isFairyCard(u) && u.hp > 0) {
              const bonusPwr = Math.max(1, Math.round(u.power * 0.75));
              addPowerPoints(u, bonusPwr);
              fadaIds.push(u.instanceId);
            }
          });
          setOpponent((prev) => ({ ...prev, pinkExtraHpSlots: 2, corteDasFadasUsed: true }));
          queueUnitVfx({
            type: 'corte_das_fadas_miracle',
            targetIds: fadaIds,
            targetPlayerSide: 'opponent',
            ownerSide: 'opponent',
          });
          queueConditionVfx(
            fadaIds.map((fid) => ({
              condition: 'corte_das_fadas' as const,
              targetUnitId: fid,
              targetSide: 'opponent' as const,
            }))
          );
          addLog(
            `🧚💖 [CORTE DAS FADAS!] A Corte salvou ${opponent.name} da morte! Concedeu 2 pontos extras de Vida (na cor rosa) e todas as Fadas aliadas na mesa receberam +75% de PODER!`,
            'spell'
          );
        } else {
          gameOverTrigger = 'player';
          gameOverReason = 'A barra de vida do líder oponente foi completamente reduzida a zero!';
        }
      } else if (
        !isTestingArena &&
        opponent.deck.length === 0 &&
        finalOpponentBoard.length === 0 &&
        (opponent.hand.length === 0 || !opponent.hand.some((c) => c.type === 'unit'))
      ) {
        gameOverTrigger = 'player';
        gameOverReason = 'O oponente esgotou seu baralho e sua última unidade em campo foi destruída!';
      } else if (
        !isTestingArena &&
        player.deck.length === 0 &&
        finalPlayerBoard.length === 0 &&
        (player.hand.length === 0 || !player.hand.some((c) => c.type === 'unit'))
      ) {
        gameOverTrigger = 'opponent';
        gameOverReason = 'Seu baralho esgotou e sua última unidade foi derrotada sem reforços na mão!';
      }
    } else {
      nextPlayerHp = Math.max(0, player.hp - directDamageTotal);
      if (nextPlayerHp <= 0) {
        if (!player.corteDasFadasUsed && hasCorteDasFadas(finalPlayerBoard)) {
          nextPlayerHp = 2;
          const fadaIds: string[] = [];
          finalPlayerBoard.forEach((u) => {
            if (isFairyCard(u) && u.hp > 0) {
              const bonusPwr = Math.max(1, Math.round(u.power * 0.75));
              addPowerPoints(u, bonusPwr);
              fadaIds.push(u.instanceId);
            }
          });
          setPlayer((prev) => ({ ...prev, pinkExtraHpSlots: 2, corteDasFadasUsed: true }));
          queueUnitVfx({
            type: 'corte_das_fadas_miracle',
            targetIds: fadaIds,
            targetPlayerSide: 'player',
            ownerSide: 'player',
          });
          queueConditionVfx(
            fadaIds.map((fid) => ({
              condition: 'corte_das_fadas' as const,
              targetUnitId: fid,
              targetSide: 'player' as const,
            }))
          );
          addLog(
            `🧚💖 [CORTE DAS FADAS!] A Corte salvou você da morte! Você recebeu 2 pontos extras de Vida (na cor rosa) e todas as suas Fadas na mesa receberam +75% de PODER!`,
            'spell'
          );
        } else {
          gameOverTrigger = 'opponent';
          gameOverReason = 'Sua barra de vida foi reduzida a zero!';
        }
      } else if (
        !isTestingArena &&
        player.deck.length === 0 &&
        finalPlayerBoard.length === 0 &&
        (player.hand.length === 0 || !player.hand.some((c) => c.type === 'unit'))
      ) {
        gameOverTrigger = 'opponent';
        gameOverReason = 'Seu baralho esgotou e sua última unidade defensora foi eliminada sem reforços na mão!';
      } else if (
        !isTestingArena &&
        opponent.deck.length === 0 &&
        finalOpponentBoard.length === 0 &&
        (opponent.hand.length === 0 || !opponent.hand.some((c) => c.type === 'unit'))
      ) {
        gameOverTrigger = 'player';
        gameOverReason = 'O oponente esgotou seu baralho e sua última unidade foi eliminada!';
      }
    }

    // Xury death trigger: "Ao ser eliminado compra uma carta automaticamente." (only if not silenced)
    deadAttackers.forEach((c) => {
      if ((c.templateId === 'm_xury' || c.name.toLowerCase().includes('xury')) && c.silencedRounds === 0) {
        const ownerState = isPlayerAttacking ? player : opponent;
        const setOwner = isPlayerAttacking ? setPlayer : setOpponent;
        if (ownerState.deck.length > 0) {
          const { card: drawn, remainingDeck } = drawCardCurve(ownerState.deck, round);
          if (drawn) {
            setOwner((prev) => ({
              ...prev,
              deck: remainingDeck,
              hand: [...prev.hand, drawn],
            }));
            addLog(`⚡ [Xury] Ao ser eliminado, comprou ${drawn.name} automaticamente!`, 'spell');
          }
        }
      }
    });

    deadDefenders.forEach((c) => {
      if ((c.templateId === 'm_xury' || c.name.toLowerCase().includes('xury')) && c.silencedRounds === 0) {
        const ownerState = isPlayerAttacking ? opponent : player;
        const setOwner = isPlayerAttacking ? setPlayer : setOpponent;
        if (ownerState.deck.length > 0) {
          const { card: drawn, remainingDeck } = drawCardCurve(ownerState.deck, round);
          if (drawn) {
            setOwner((prev) => ({
              ...prev,
              deck: remainingDeck,
              hand: [...prev.hand, drawn],
            }));
            addLog(`⚡ [Xury] Ao ser eliminado em defesa, comprou ${drawn.name} automaticamente!`, 'spell');
          }
        }
      }
    });

    isAttackTransitioningRef.current = false;
    setIsAttackTransitioning(false);
    setCombatResults(results);

    // Disparar VFX de condições em combate (Torpor Fogo Amigo, Crítico, Roubo de Vida, Ataque-duplo, Barreira, Obliteração)
    const combatVfxBatch: Array<Omit<ConditionVfxEvent, 'id'>> = [];
    const atkSide: 'player' | 'opponent' = isPlayerAttacking ? 'player' : 'opponent';
    const defSide: 'player' | 'opponent' = isPlayerAttacking ? 'opponent' : 'player';
    results.forEach((r) => {
      if (r.torporTriggeredAttacker && r.attackerCard) {
        combatVfxBatch.push({
          condition: 'torpor',
          targetUnitId: r.torporFriendlyTargetId || r.attackerCard.instanceId,
          targetUnitName: r.attackerCard.name,
          targetSide: atkSide,
          isFriendlyFireFlash: true,
        });
      }
      if (r.torporTriggeredDefender && r.defenderCard) {
        combatVfxBatch.push({
          condition: 'torpor',
          targetUnitId: r.defenderCard.instanceId,
          targetUnitName: r.defenderCard.name,
          targetSide: defSide,
          isFriendlyFireFlash: true,
        });
      }
      if (r.criticoTriggered && r.defenderCard) {
        combatVfxBatch.push({
          condition: 'critico',
          targetUnitId: r.defenderCard.instanceId,
          targetUnitName: r.defenderCard.name,
          targetSide: defSide,
        });
      }
      if (r.lifeStealHealed && r.lifeStealHealed > 0 && r.defenderCard) {
        combatVfxBatch.push({
          condition: 'roubo_de_vida',
          targetUnitId: r.defenderCard.instanceId,
          targetUnitName: r.defenderCard.name,
          targetSide: defSide,
        });
      }
      if (r.doubleAttackTriggered && r.defenderCard) {
        combatVfxBatch.push({
          condition: 'ataque_duplo',
          targetUnitId: r.defenderCard.instanceId,
          targetUnitName: r.defenderCard.name,
          targetSide: defSide,
        });
      }
      if (r.defenderBarreiraBroken && r.defenderCard) {
        combatVfxBatch.push({
          condition: 'barreira',
          targetUnitId: r.defenderCard.instanceId,
          targetUnitName: r.defenderCard.name,
          targetSide: defSide,
          isAuroraIce: r.defenderCard.templateId === 'g_aurora' || r.defenderCard.element === 'Gelo',
        });
      }
      if (r.attackerBarreiraBroken && r.attackerCard) {
        combatVfxBatch.push({
          condition: 'barreira',
          targetUnitId: r.attackerCard.instanceId,
          targetUnitName: r.attackerCard.name,
          targetSide: atkSide,
          isAuroraIce: r.attackerCard.templateId === 'g_aurora' || r.attackerCard.element === 'Gelo',
        });
      }
      if (r.obliteratedTarget) {
        const targetCard = r.defenderCard || r.attackerCard;
        if (targetCard) {
          combatVfxBatch.push({
            condition: 'obliteracao',
            targetUnitId: targetCard.instanceId,
            targetUnitName: targetCard.name,
            targetSide: r.defenderCard ? defSide : atkSide,
          });
        }
      }
      if (r.inarielFireHit && r.attackerCard && r.defenderCard) {
        queueUnitVfx({
          type: 'inariel_fire_hit',
          sourceId: r.attackerCard.instanceId,
          targetIds: [r.defenderCard.instanceId],
          ownerSide: atkSide,
        });
      }
      if (r.kynBimoBonk && r.attackerCard && r.defenderCard) {
        queueUnitVfx({
          type: 'kyn_bonk',
          sourceId: r.attackerCard.instanceId,
          targetIds: [r.defenderCard.instanceId],
          ownerSide: atkSide,
        });
      }
      if (r.tiryuAttackerSelfHarm && r.attackerCard) {
        queueUnitVfx({
          type: 'tiryu_self_harm',
          sourceId: r.attackerCard.instanceId,
          ownerSide: atkSide,
        });
      }
      if (r.tiryuDefenderSelfHarm && r.defenderCard) {
        queueUnitVfx({
          type: 'tiryu_self_harm',
          sourceId: r.defenderCard.instanceId,
          ownerSide: defSide,
        });
      }
      if (r.pcieBlocked) {
        const pcieSide = r.pcieCardSide === 'attacker' ? atkSide : defSide;
        const pcieSourceId = r.pcieCardSide === 'attacker' ? r.attackerCard?.instanceId : r.defenderCard?.instanceId;
        queueUnitVfx({
          type: 'pcie_shield_block',
          sourceId: pcieSourceId,
          ownerSide: pcieSide,
        });
      }
      if (r.tynDodged) {
        const tynSide = r.tynCardSide === 'attacker' ? atkSide : defSide;
        const tynSourceId = r.tynCardSide === 'attacker' ? r.attackerCard?.instanceId : r.defenderCard?.instanceId;
        queueUnitVfx({
          type: 'tyn_lightning_dodge',
          sourceId: tynSourceId,
          ownerSide: tynSide,
        });
      }
      if ((r.bonetrusLvl2SoloAttack || (r.bonetrusLvl2CleaveTargetIds && r.bonetrusLvl2CleaveTargetIds.length > 0)) && r.attackerCard) {
        const allSlashTargetIds = Array.from(
          new Set([r.defenderCard?.instanceId, ...(r.bonetrusLvl2CleaveTargetIds || [])].filter((x): x is string => Boolean(x)))
        );
        queueUnitVfx({
          type: 'bonetrus_lvl2_solo_slash',
          sourceId: r.attackerCard.instanceId,
          targetIds: allSlashTargetIds,
          ownerSide: atkSide,
        });
      }
      if (r.oSolDefenderObliterated && r.defenderCard) {
        queueUnitVfx({
          type: 'o_sol_lvl2_oblit_disintegrate',
          sourceId: r.attackerCard?.instanceId,
          targetIds: [r.defenderCard.instanceId],
          ownerSide: atkSide,
        });
      }
      if (r.oSolAttackerObliterated && r.attackerCard) {
        queueUnitVfx({
          type: 'o_sol_lvl2_oblit_disintegrate',
          sourceId: r.defenderCard?.instanceId,
          targetIds: [r.attackerCard.instanceId],
          ownerSide: defSide,
        });
      }
      if (r.sanielLvl2Absorbed && r.attackerCard && r.defenderCard) {
        queueUnitVfx({
          type: 'saniel_lvl2_drain',
          sourceId: r.attackerCard.instanceId,
          targetIds: [r.defenderCard.instanceId],
          ownerSide: atkSide,
        });
      }
      if (r.lucentTorporConvert && r.attackerCard && r.defenderCard) {
        queueUnitVfx({
          type: 'lucent_purificacao_ardente',
          sourceId: r.attackerCard.instanceId,
          targetIds: [r.defenderCard.instanceId],
          ownerSide: atkSide,
        });
      }
      if (r.mavieAtkKill && r.attackerCard && r.defenderCard) {
        queueUnitVfx({
          type: 'mavie_ceifa_luminosa',
          sourceId: r.attackerCard.instanceId,
          targetIds: [r.defenderCard.instanceId],
          ownerSide: atkSide,
        });
      }
      if (r.mavieDefKill && r.defenderCard && r.attackerCard) {
        queueUnitVfx({
          type: 'mavie_ceifa_luminosa',
          sourceId: r.defenderCard.instanceId,
          targetIds: [r.attackerCard.instanceId],
          ownerSide: defSide,
        });
      }
      if (
        r.attackerCard &&
        r.defenderCard &&
        (r.bleedAppliedToDefender || r.hemorrhageTriggeredDefender || !r.defenderDied) &&
        (r.attackerCard.templateId === 'g_gangnyr' || r.attackerCard.name.toLowerCase().includes('gangnyr')) &&
        r.attackerCard.silencedRounds === 0
      ) {
        queueUnitVfx({
          type: 'gangnyr_bleed_slash',
          sourceId: r.attackerCard.instanceId,
          targetIds: [r.defenderCard.instanceId],
          ownerSide: atkSide,
        });
      }
      if (r.hemorrhageTriggeredDefender && r.defenderCard) {
        combatVfxBatch.push({
          condition: 'hemorragia',
          targetUnitId: r.defenderCard.instanceId,
          targetUnitName: r.defenderCard.name,
          targetSide: defSide,
          labelOverride: `💔🩸 HEMORRAGIA! -${r.hemorrhageDamageDealt || 0} VIDA (25% MÁX)!`,
        });
      }
      if (r.bleedAppliedToDefender && r.defenderCard) {
        combatVfxBatch.push({
          condition: 'sangramento',
          targetUnitId: r.defenderCard.instanceId,
          targetUnitName: r.defenderCard.name,
          targetSide: defSide,
          labelOverride:
            r.bleedMarksAfterAttack && r.bleedMarksAfterAttack > 0
              ? `🩸 SANGRAMENTO · MARCAS ${r.bleedMarksAfterAttack}/4`
              : undefined,
        });
      }
      if ((r.titanoBleedHealTriggered === 'attacker' || r.titanoBleedHealTriggered === 'both') && r.attackerCard) {
        combatVfxBatch.push({
          condition: 'cura',
          targetUnitId: r.attackerCard.instanceId,
          targetUnitName: r.attackerCard.name,
          targetSide: atkSide,
        });
      }
      if ((r.titanoBleedHealTriggered === 'defender' || r.titanoBleedHealTriggered === 'both') && r.defenderCard) {
        combatVfxBatch.push({
          condition: 'cura',
          targetUnitId: r.defenderCard.instanceId,
          targetUnitName: r.defenderCard.name,
          targetSide: defSide,
        });
      }
    });
    if (combatVfxBatch.length > 0) {
      queueConditionVfx(combatVfxBatch);
    }

    setTableCombatAnim({
      stage: 'striking',
      results,
      attackerRole: attackingPlayerId,
      directDamageTotal,
      finalPlayerBoard,
      finalOpponentBoard,
      deadAttackers,
      deadDefenders,
      nextPlayerHp,
      nextOpponentHp,
      gameOverTrigger,
      gameOverReason,
      resurrectedEvents: combatResurrectedEvents,
      borPhoenixEvents: combatBorPhoenixEvents,
    });
    setIsDefendingPhase(false);
    setAssignedBlocks({});
    setEnfrentarLockedBlocks({});
    setDeclaredAttackers([]);
  };

  const finishTableCombatRef = useRef<() => void>(() => {});

  const finishTableCombat = useCallback(() => {
    if (!tableCombatAnim) return;
    const anim = tableCombatAnim;
    setTableCombatAnim(null);
    setCombatResults(null);

    // Apply board and HP state after the table animation finishes
    setPlayer((p) => ({
      ...p,
      hp: anim.nextPlayerHp,
      board: anim.finalPlayerBoard,
      graveyard: [...p.graveyard, ...(anim.attackerRole === 'player' ? anim.deadAttackers : anim.deadDefenders)],
    }));

    setOpponent((o) => ({
      ...o,
      hp: anim.nextOpponentHp,
      board: anim.finalOpponentBoard,
      graveyard: [...o.graveyard, ...(anim.attackerRole === 'player' ? anim.deadDefenders : anim.deadAttackers)],
    }));

    if (anim.borPhoenixEvents && anim.borPhoenixEvents.length > 0) {
      anim.borPhoenixEvents.forEach((ev) => {
        triggerBorPhoenixVfx(ev.unitId, ev.side, 60);
      });
    }

    if (anim.resurrectedEvents && anim.resurrectedEvents.length > 0) {
      triggerResurrectionVfx(
        anim.resurrectedEvents
          .filter((e) => Boolean(e.targetUnitId))
          .map((e) => ({
            unitId: e.targetUnitId!,
            unitName: e.targetUnitName || 'Unidade',
            side: e.targetSide === 'opponent' ? 'opponent' : 'player',
            labelOverride: e.labelOverride,
          })),
        60
      );
    }

    if (anim.gameOverTrigger && anim.gameOverReason) {
      triggerFinishingCannon(anim.gameOverTrigger, anim.gameOverReason);
    } else if (!gameOverWinner) {
      const isPlayerAttacker = anim.attackerRole === 'player';
      const attackingPlayer = isPlayerAttacker ? playerRef.current : opponentRef.current;
      const defendingRole: 'player' | 'opponent' = isPlayerAttacker ? 'opponent' : 'player';
      const defendingPlayerState = isPlayerAttacker ? opponentRef.current : playerRef.current;
      const defenderFinalBoard = isPlayerAttacker ? anim.finalOpponentBoard : anim.finalPlayerBoard;

      if (attackingPlayer.extraAttackRound && !attackingPlayer.secondAttackDone) {
        if (isPlayerAttacker) {
          setPlayer((p) => ({ ...p, extraAttackRound: false, secondAttackDone: true }));
        } else {
          setOpponent((o) => ({ ...o, extraAttackRound: false, secondAttackDone: true }));
        }
        hasAttackedThisRoundRef.current = false;
        setHasAttackedThisRound(false);
        queueUnitVfx({
          type: 'zyk_purple_coin',
          ownerSide: anim.attackerRole,
        });
        addLog(
          `🌌 [Zyk, o Eminente] Proeza Temporal: ATAQUE EXTRA ATIVADO! ${attackingPlayer.name} tem permissão obrigatória para desferir um novo ataque antes de encerrar a rodada!`,
          'spell'
        );
        setTurnTimeLeft(30);
        setTurnPlayer(anim.attackerRole);
      } else if (isPostAttackFinalTurnRef.current) {
        if (hasPendingZykAttack(defendingPlayerState, defendingRole, defenderFinalBoard)) {
          resetAttackerPasses();
          setTurnTimeLeft(30);
          setTurnPlayer(defendingRole);
          addLog(
            `🌌 [Zyk, o Eminente] Antes de encerrar a rodada, o turno foi concedido a ${defendingPlayerState.name} para executar o ataque garantido de Zyk!`,
            'spell'
          );
        } else {
          startNewRound();
        }
      } else {
        // Turno Extra Pós-Ataque garantido ao Defensor (Rápidas e Fugazes continuam livres; só encerra após unidade, habilidade lenta ou passar a vez!)
        const postAttackPlayer: 'player' | 'opponent' = defendingRole;
        isPostAttackFinalTurnRef.current = true;
        setIsPostAttackFinalTurn(true);
        setPostAttackRoundEndPending(false);
        resetAttackerPasses();
        setTurnTimeLeft(30);
        setTurnPlayer(postAttackPlayer);
        addLog(
          `⏳ [Turno Extra Pós-Ataque] Combate resolvido! O turno passou para ${
            defendingPlayerState.name
          }${defendingPlayerState.canAttackOnDefense ? ' (com ataque defensivo de Zyk disponível!)' : ' realizar seu turno extra (Rápidas e Fugazes não encerram o turno; encerra ao invocar unidade, usar habilidade lenta ou passar a vez)'}.`,
          'round'
        );
      }
    }
  }, [tableCombatAnim, gameOverWinner, addLog, startNewRound, hasPendingZykAttack, triggerResurrectionVfx, triggerBorPhoenixVfx, resetAttackerPasses]);

  useEffect(() => {
    finishTableCombatRef.current = finishTableCombat;
  }, [finishTableCombat]);

  // Automated stage progression for On-Table Direct Combat
  useEffect(() => {
    if (!tableCombatAnim) return;

    const { stage, results } = tableCombatAnim;
    const hasRebounds = results.some((r) => r.reboundDamageDealt > 0);
    const hasDeaths = results.some((r) => r.defenderDied || r.attackerDied);
    const hasDirectPlayerDamage = results.some((r) => r.directPlayerDamage > 0);
    const hasDoubleAttackInClash = results.some((r) => {
      const atk = r.attackerCard;
      if (!atk) return false;
      return Boolean(
        atk.conditions?.has('ataque_duplo') ||
          atk.hasDoubleAttack ||
          (atk.templateId === 'm_moira' && (atk.silencedRounds ?? 0) === 0) ||
          (atk.templateId === 'm_jasmim' && r.defenderCard?.element === 'Fogo' && (atk.silencedRounds ?? 0) === 0)
      );
    });

    let timer: NodeJS.Timeout;
    let doubleSoundTimer: NodeJS.Timeout | undefined;

    if (stage === 'striking') {
      sound.playClash();
      if (hasDoubleAttackInClash) {
        doubleSoundTimer = setTimeout(() => {
          sound.playClash();
        }, 380);
      }
      if (hasDirectPlayerDamage) {
        sound.playPlayerHit();
      }

      timer = setTimeout(() => {
        if (hasRebounds) {
          setTableCombatAnim((prev) => (prev ? { ...prev, stage: 'rebound' } : null));
        } else if (hasDeaths) {
          setTableCombatAnim((prev) => (prev ? { ...prev, stage: 'death' } : null));
        } else {
          finishTableCombatRef.current();
        }
      }, hasDoubleAttackInClash ? 1150 : 800);
    } else if (stage === 'rebound') {
      sound.playReboundCounter();

      timer = setTimeout(() => {
        if (hasDeaths) {
          setTableCombatAnim((prev) => (prev ? { ...prev, stage: 'death' } : null));
        } else {
          finishTableCombatRef.current();
        }
      }, 850);
    } else if (stage === 'death') {
      sound.playDeath();

      timer = setTimeout(() => {
        finishTableCombatRef.current();
      }, 950);
    }

    return () => {
      clearTimeout(timer);
      if (doubleSoundTimer) clearTimeout(doubleSoundTimer);
    };
  }, [tableCombatAnim]);

  // ----------------------------------------------------
  // AI TURN AUTOMATION
  // ----------------------------------------------------
  useEffect(() => {
    if (
      opponent.isAi &&
      turnPlayer === 'opponent' &&
      !isRoundTransitioning &&
      !isTurnTransitioning &&
      !roundCoinTransition &&
      !isDefendingPhase &&
      !combatResults &&
      !gameOverWinner &&
      !revealModal.isOpen &&
      !retornarModal.isOpen &&
      !targetModal.isOpen &&
      pendingBarelioRecaptureQueue.length === 0 &&
      !isBusyByAnimation
    ) {
      const aiDelayMs = pendingSpell && pendingSpell.casterId === 'player' ? 1450 : 1350;
      const aiTimer = setTimeout(() => {
        if (pendingSpell && pendingSpell.casterId === 'player') {
          // AI is in the Counter-Response Window!
          const vetoCard = opponent.hand.find(
            (c) => c.templateId === 'n_veto_do_indomito' && isTierAllowedInRound(c.tier, round, c)
          );
          if (vetoCard) {
            handlePlayCard(vetoCard, 'opponent');
            return;
          }
          const fastSpells = opponent.hand.filter(
            (c) =>
              c.type === 'skill' &&
              c.templateId !== 'n_veto_do_indomito' &&
              (c.speed === 'rapida' || c.isFugaz) &&
              isTierAllowedInRound(c.tier, round, c)
          );
          const validFastSpell = fastSpells.find((sp) => {
            if (
              ['m_moral', 'g_bencao', 'n_bloqueio', 'n_convergencia', 'g_desafio_real', 'g_sabedoria_cosmica', 'token_filho_da_luz'].includes(
                sp.templateId
              )
            ) {
              return opponent.board.length > 0;
            }
            if (['g_enganar', 'n_labareda_solar', 'g_subjugar', 'token_centelha', 'm_destino_fatal'].includes(sp.templateId)) {
              return player.board.some((u) => !u.conditions.has('imunidade'));
            }
            return true;
          });
          if (validFastSpell && Math.random() < 0.55) {
            handlePlayCard(validFastSpell, 'opponent');
            return;
          }
          handlePassTurn(false, true);
          return;
        }

        let action = decideAiTurnAction(
          opponent,
          player,
          round,
          attackerRole === 'opponent',
          hasAttackedThisRound
        );

        // Tutorial Mode: Curated 100%-winnable Instructor AI (gives real attack & defense practice without ever overwhelming or defeating the learner)
        if (isTutorialMode) {
          if (action.type === 'cast_spell') {
            action = { type: 'pass' };
          } else if (action.type === 'summon' && (opponent.summonsThisRound >= 1 || opponent.board.length >= 2)) {
            action = { type: 'pass' };
          } else if (action.type === 'attack') {
            if (player.hp <= 2) {
              // Anti-lethal guard: learner can never lose the tutorial
              action = { type: 'pass' };
            } else if (action.attackerIds && action.attackerIds.length > 1) {
              // Attack with 1 unit so learner practices blocking cleanly
              const sortedWeakest = [...opponent.board]
                .filter((u) => action.attackerIds!.includes(u.instanceId))
                .sort((a, b) => a.atk - b.atk);
              action = sortedWeakest.length > 0
                ? { type: 'attack', attackerIds: [sortedWeakest[0].instanceId] }
                : { type: 'pass' };
            }
          }
        }

        if (action.type === 'draw') {
          handleDrawCard('opponent');
        } else if (action.type === 'summon' && action.cardInstanceId) {
          const card = opponent.hand.find((c) => c.instanceId === action.cardInstanceId);
          if (card) {
            handlePlayCard(card, 'opponent');
          } else {
            handlePassTurn(false, true);
          }
        } else if (action.type === 'cast_spell' && action.cardInstanceId) {
          const card = opponent.hand.find((c) => c.instanceId === action.cardInstanceId);
          if (card) {
            handlePlayCard(card, 'opponent');
          } else {
            handlePassTurn(false, true);
          }
        } else if (action.type === 'attack' && action.attackerIds && action.attackerIds.length > 0) {
          sound.playAttackDeclare();
          resetAttackerPasses();
          setActiveCombatAttackerRole('opponent');
          const isAiDefenseCounterAttack =
            attackerRole !== 'opponent' && Boolean(opponent.canAttackOnDefense);
          if (isAiDefenseCounterAttack) {
            setOpponent((o) => ({ ...o, canAttackOnDefense: false }));
          } else {
            hasAttackedThisRoundRef.current = true;
            setHasAttackedThisRound(true);
          }

          const attackingCards = opponent.board.filter((c) => action.attackerIds!.includes(c.instanceId));
          
          // Comandante Virtus: Sempre que declarar ataque com Comandante Virtus na mesa todas as unidades aliadas recebem +1 em todos seus atributos.
          const hasVirtusAi = opponent.board.some(
            (c) =>
              (c.templateId === 'g_comandante_virtus' ||
                c.templateId === 'g_virtus' ||
                c.name.toLowerCase().includes('virtus')) &&
              c.hp > 0 &&
              c.silencedRounds === 0
          );
          if (hasVirtusAi) {
            opponent.board.forEach((c) => {
              c.hp += 1;
              c.maxHp += 1;
              c.atk += 1;
              c.baseAtk += 1;
              addDefensePoints(c, 1);
              addPowerPoints(c, 1);
            });
            sound.playSpell();
            const virtusAiUnit = opponent.board.find(
              (c) =>
                (c.templateId === 'g_comandante_virtus' ||
                  c.templateId === 'g_virtus' ||
                  c.name.toLowerCase().includes('virtus')) &&
                c.hp > 0 &&
                c.silencedRounds === 0
            );
            if (virtusAiUnit) {
              queueUnitVfx({
                type: 'virtus_impetus',
                sourceId: virtusAiUnit.instanceId,
                targetIds: opponent.board.filter((c) => c.hp > 0).map((c) => c.instanceId),
                ownerSide: 'opponent',
              });
            }
            addLog(
              `⚔️ [Comandante Virtus] Ataque inimigo declarado! Todas as unidades de ${opponent.name} receberam +1 em todos os atributos!`,
              'spell'
            );
          }

          // Rei Mauricio novo efeito no ataque da IA
          const aiMauricioAttacker = attackingCards.find(
            (c) =>
              c.templateId === 'm_rei_mauricio' ||
              c.templateId === 'm_mauricio' ||
              c.name.toLowerCase().includes('mauricio')
          );
          if (aiMauricioAttacker && aiMauricioAttacker.silencedRounds === 0) {
            aiMauricioAttacker.conditions.add('critico');
            setCardConditionSource(aiMauricioAttacker, 'critico', 'efeito_unico_proprio', aiMauricioAttacker.name);
            attackingCards.forEach((c) => {
              c.conditions.add('bravura');
              setCardConditionSource(
                c,
                'bravura',
                c.instanceId === aiMauricioAttacker.instanceId ? 'efeito_unico_proprio' : 'unidade_compartilhada',
                aiMauricioAttacker.name
              );
            });
            sound.playSpell();
            queueUnitVfx({
              type: 'rei_mauricio_decree',
              sourceId: aiMauricioAttacker.instanceId,
              targetIds: attackingCards.map((c) => c.instanceId),
              ownerSide: 'opponent',
            });
            addLog(
              `👑⚡ [Rei Mauricio] Liderança Soberana: Recebeu CRÍTICO e concedeu BRAVURA a todas as unidades aliadas durante o ataque!`,
              'spell'
            );
          }

          // Check AI attackers with Enfrentar
          const aiForcedBlocks: Record<string, string> = {};
          const availablePlayerDefs = player.board.filter(
            (c) => !c.conditions.has('atordoado') && c.templateId !== 'm_lamina_inverno'
          );
          attackingCards.forEach((c) => {
            if (c.conditions.has('enfrentar') && availablePlayerDefs.length > 0) {
              const targetIdx = availablePlayerDefs.findIndex((def) => !def.conditions.has('dormindo'));
              if (targetIdx !== -1) {
                const [targetDef] = availablePlayerDefs.splice(targetIdx, 1);
                aiForcedBlocks[c.instanceId] = targetDef.instanceId;
                addLog(`⚔️ ENFRENTAR: ${c.name} do adversário forçou ${targetDef.name} a defender o seu ataque!`, 'attack');
              }
            }
          });

          setDeclaredAttackers(attackingCards);
          setAssignedBlocks(aiForcedBlocks);
          setEnfrentarLockedBlocks(aiForcedBlocks);
          setIsDefendingPhase(true);
          addLog(
            `${opponent.name} declarou ataque com ${attackingCards.length} carta(s)! Escolha suas cartas defensoras ou aceite o dano!`,
            'attack'
          );
        } else {
          // AI passes
          handlePassTurn(false, true);
        }
      }, aiDelayMs);

      return () => clearTimeout(aiTimer);
    }
  }, [
    opponent,
    turnPlayer,
    roundTurnNumber,
    attackerConsecutivePasses,
    attackerRole,
    round,
    hasAttackedThisRound,
    isRoundTransitioning,
    isTurnTransitioning,
    roundCoinTransition,
    isDefendingPhase,
    combatResults,
    gameOverWinner,
    pendingSpell,
    revealModal.isOpen,
    retornarModal.isOpen,
    targetModal.isOpen,
    pendingBarelioRecaptureQueue.length,
    isBusyByAnimation,
  ]);

  // ----------------------------------------------------
  // RESTART / REMATCH
  // ----------------------------------------------------
  const handleRematch = () => {
    clearPendingTurnTimers();
    if (isOnlinePvp) {
      onExitToTitle();
      return;
    }
    const cardIds = isTutorialMode
      ? TUTORIAL_PLAYER_DECK_IDS
      : customPlayerDeckCardIds && customPlayerDeckCardIds.length === 20
      ? customPlayerDeckCardIds
      : DEFAULT_DECK_IDS;
    const fullDeckP = buildDeckFromTemplateIds(cardIds);
    const dealtP = dealInitialHand(fullDeckP);

    const nextAiPreset = !isTestingArena && !isTutorialMode ? getNextRotatingAiDeck() : null;
    if (nextAiPreset) {
      setActiveAiDeckPreset(nextAiPreset);
    }
    const opponentDeckIds = isTutorialMode
      ? TUTORIAL_INSTRUCTOR_DECK_IDS
      : isTestingArena
      ? DEFAULT_DECK_IDS
      : nextAiPreset?.cardIds || DEFAULT_DECK_IDS;
    const fullDeckO = buildDeckFromTemplateIds(opponentDeckIds);
    const dealtO = dealInitialHand(fullDeckO);

    const { card: autoDrawnP, remainingDeck: deckP } = drawCardCurve(dealtP.remainingDeck, 1);
    const { card: autoDrawnO, remainingDeck: deckO } = drawCardCurve(dealtO.remainingDeck, 1);

    if (isTutorialMode) {
      tutorialRewardClaimAttemptedRef.current = false;
      setTutorialRewardResult(null);
      setPlayerOrbActionCount(0);
      setPlayerAttackCompletedCount(0);
      setPlayerDefenseCompletedCount(0);
    }

    setPlayer({
      id: 'player',
      name: isTutorialMode ? 'Aprendiz (Você)' : 'Você (Duelista)',
      isAi: false,
      hp: 5,
      maxHp: 5,
      deck: deckP,
      hand: autoDrawnP ? [...dealtP.hand, autoDrawnP] : dealtP.hand,
      board: [],
      graveyard: [],
      hasDrawnThisRound: true,
      drawsCountThisRound: 1,
      extraDrawAvailableThisRound: false,
      extraDrawNextRound: false,
      summonsThisRound: 0,
      borRevivedOnce: false,
      zaelUsed: false,
      purpleExtraHpSlots: 0,
    });

    setOpponent({
      id: 'opponent',
      name: isTutorialMode
        ? 'Instrutor Celentia'
        : isTestingArena
        ? 'IA de Testes (Controlável)'
        : nextAiPreset
        ? `IA · ${nextAiPreset.name}`
        : 'IA Estratégica',
      isAi: !isTestingArena,
      hp: isTestingArena ? 999 : isTutorialMode ? 4 : 5,
      maxHp: isTestingArena ? 999 : isTutorialMode ? 4 : 5,
      deck: deckO,
      hand: autoDrawnO ? [...dealtO.hand, autoDrawnO] : dealtO.hand,
      board: isTestingArena ? createDummyTargetCards() : [],
      graveyard: [],
      hasDrawnThisRound: true,
      drawsCountThisRound: 1,
      extraDrawAvailableThisRound: false,
      extraDrawNextRound: false,
      summonsThisRound: 0,
      borRevivedOnce: false,
      zaelUsed: false,
      purpleExtraHpSlots: 0,
    });

    roundRef.current = 1;
    attackerRoleRef.current = 'player';
    roundTurnNumberRef.current = 1;
    attackerConsecutivePassesRef.current = 0;
    setRound(1);
    setRoundTurnNumber(1);
    setAttackerRole('player');
    setActiveCombatAttackerRole('player');
    setTurnPlayer('player');
    setRoundCoinTransition(null);
    isRoundTransitioningRef.current = false;
    setIsRoundTransitioning(false);
    isPostAttackFinalTurnRef.current = false;
    setIsPostAttackFinalTurn(false);
    setPostAttackRoundEndPending(false);
    setAttackerConsecutivePasses(0);
    setFreeActionHint(null);
    hasAttackedThisRoundRef.current = false;
    setHasAttackedThisRound(false);
    votoSilencioRoundsRef.current = 0;
    setVotoSilencioRoundsRemaining(0);
    setVotoSilencioActive(false);
    setFloatingSkillCards([]);
    unitVfxQueueRef.current = [];
    setUnitVfxQueue([]);
    activeUnitVfxRef.current = null;
    setActiveUnitVfx(null);
    setTurnTimeLeft(30);
    setSelectedAttackerIds([]);
    setDeclaredAttackers([]);
    setAssignedBlocks({});
    setEnfrentarLockedBlocks({});
    setIsDefendingPhase(false);
    setCombatResults(null);
    celestialVictoryTriggeredRef.current = false;
    setCelestialVictoryAnim(null);
    onlineMatchRecordedRef.current = false;
    setRankDelta(null);
    setRematchStatus('idle');
    setRematchStatusMessage(null);
    setIncomingRematchFrom(null);
    setGameOverWinner(null);
    setPendingSpell(null);
    setPendingBarelioRecaptureQueue([]);
    matchDrawsTotalRef.current = 14;
    if (!isTestingArena) {
      setIsMagicCoinOpen(true);
    }
    addLog('Nova partida de revanche iniciada! Que vença a melhor estratégia.', 'info');
  };

  const handleRematchRef = useRef(handleRematch);
  handleRematchRef.current = handleRematch;

  const handleRequestRematch = () => {
    if (gameOverWinner !== 'opponent') return;
    if (isOnlinePvp) {
      setRematchStatus('requested');
      setRematchStatusMessage(null);
      pvpSocket.requestRematch();
    } else {
      setLocalAiRematchDeadline(Date.now() + 30_000);
    }
  };

  const handleRespondRematch = (accept: boolean) => {
    setIncomingRematchFrom(null);
    if (isOnlinePvp) {
      pvpSocket.respondRematch(accept);
      if (!accept) {
        setRematchStatus('declined');
        setRematchStatusMessage('Você recusou o pedido de revanche.');
      }
    }
  };

  const handleStartAiRematchFromPrep = useCallback(() => {
    setLocalAiRematchDeadline(null);
    handleRematchRef.current();
  }, []);

  // Live sync deck selection changes during Online Rematch Preparation
  useEffect(() => {
    if (!isOnlinePvp || !onlineRematchPrep) return;
    if (!customPlayerDeckCardIds || customPlayerDeckCardIds.length !== 20) return;
    pvpSocket.updateRematchPrep({
      deckName: activeDeckName || 'Meu Baralho',
      deckCardIds: customPlayerDeckCardIds,
    });
  }, [isOnlinePvp, Boolean(onlineRematchPrep), activeDeckName, customPlayerDeckCardIds]);

  // Efeito automático para encerrar a rodada após a conclusão da ação (unidade ou habilidade) no Turno Final Pós-Ataque
  useEffect(() => {
    if (!postAttackRoundEndPending) return;
    if (
      isBusyByAnimation ||
      targetModal.isOpen ||
      pendingBarelioRecaptureQueue.length > 0 ||
      Boolean(umaelModal) ||
      revealModal.isOpen ||
      retornarModal.isOpen ||
      discardModal.isOpen ||
      Boolean(zykDiscardModal?.isOpen) ||
      Boolean(pendingSpell) ||
      Boolean(cinematicLevelUp) ||
      Boolean(combatResults) ||
      isDefendingPhase ||
      Boolean(gameOverWinner)
    ) {
      return;
    }

    const timer = setTimeout(() => {
      if (isPostAttackFinalTurnRef.current) {
        const pState = playerRef.current;
        const oState = opponentRef.current;
        if (hasPendingZykAttack(pState, 'player')) {
          setPostAttackRoundEndPending(false);
          setTurnTimeLeft(30);
          setTurnPlayer('player');
          return;
        }
        if (hasPendingZykAttack(oState, 'opponent')) {
          setPostAttackRoundEndPending(false);
          setTurnTimeLeft(30);
          setTurnPlayer('opponent');
          return;
        }
        addLog(
          `⏳ Ação do turno final pós-ataque concluída! Encerrando a Rodada ${roundRef.current} e iniciando a próxima...`,
          'round'
        );
        startNewRound();
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [
    postAttackRoundEndPending,
    isBusyByAnimation,
    targetModal.isOpen,
    pendingBarelioRecaptureQueue.length,
    umaelModal,
    revealModal.isOpen,
    retornarModal.isOpen,
    discardModal.isOpen,
    zykDiscardModal,
    pendingSpell,
    cinematicLevelUp,
    combatResults,
    isDefendingPhase,
    gameOverWinner,
    addLog,
    startNewRound,
    hasPendingZykAttack,
  ]);

  // ----------------------------------------------------
  // ONLINE LAN PVP WEBSOCKET SYNC (INCOMING & OUTGOING)
  // ----------------------------------------------------
  useEffect(() => {
    if (!isOnlinePvp || !onlineMatchBootstrap) return;

    const unsubscribe = pvpSocket.subscribe((msg) => {
      if (msg.type === 'MATCH_ACK') {
        onlineSeqRef.current = Math.max(onlineSeqRef.current, msg.seq);
        if (typeof msg.opponentHasVeto === 'boolean') {
          remoteHasVetoRef.current = msg.opponentHasVeto;
        }
        return;
      }

      if (msg.type === 'OPPONENT_CONNECTION') {
        if (!msg.connected) {
          setOpponentDisconnectNotice(msg.graceSeconds ?? 20);
          addLog(
            `⚠️ ${onlineMatchBootstrap.opponentName} perdeu conexão na rede local. Aguardando retorno (${msg.graceSeconds ?? 20}s)...`,
            'info'
          );
        } else {
          setOpponentDisconnectNotice(null);
          addLog(`✅ ${onlineMatchBootstrap.opponentName} reconectou-se à sala!`, 'info');
        }
        return;
      }

      if (msg.type === 'OPPONENT_FORFEITED') {
        setOpponentDisconnectNotice(null);
        if (!gameOverWinner && !finishingCannonAnim?.active && !celestialVictoryAnim?.active) {
          setOpponent((o) => ({ ...o, hp: 0 }));
          triggerFinishingCannon('player', msg.reason || 'O oponente abandonou o duelo.');
        }
        return;
      }

      if (msg.type === 'REMATCH_REQUESTED') {
        sound.playSummon();
        setIncomingRematchFrom(msg.fromName);
        return;
      }

      if (msg.type === 'REMATCH_DECLINED') {
        sound.playDiscard();
        setOnlineRematchPrep(null);
        setIncomingRematchFrom(null);
        setRematchStatus('declined');
        setRematchStatusMessage(msg.reason || `${msg.byName} recusou a revanche.`);
        return;
      }

      if (msg.type === 'REMATCH_PREP_STATE') {
        setIncomingRematchFrom(null);
        setRematchStatus('idle');
        setRematchStatusMessage(null);
        setOnlineRematchPrep(msg.prep);
        return;
      }

      if (msg.type === 'MATCH_STARTED') {
        sound.playSummon();
        setOnlineRematchPrep(null);
        setIncomingRematchFrom(null);
        onOnlineRematchStarted?.(msg.bootstrap);
        return;
      }

      if (msg.type === 'PVP_ERROR' && (gameOverWinner || onlineRematchPrep)) {
        setRematchStatus('declined');
        setRematchStatusMessage(msg.message);
        return;
      }

      if (msg.type === 'MATCH_STATE') {
        const snap = msg.snapshot;
        if (snap.seq <= onlineSeqRef.current) return;

        onlineSeqRef.current = snap.seq;
        if (typeof snap.opponentHasVeto === 'boolean') {
          remoteHasVetoRef.current = snap.opponentHasVeto;
        }

        const nextPlayer = hydratePlayerState(snap.player);
        const nextOpponent = hydratePlayerState(snap.opponent);
        const nextDeclared = (snap.declaredAttackers || []).map(hydrateCardInstance);
        const nextPendingSpell = snap.pendingSpell
          ? {
              spellCard: hydrateCardInstance(snap.pendingSpell.spellCard),
              casterId: snap.pendingSpell.casterId,
              description: snap.pendingSpell.description,
              targetName: snap.pendingSpell.targetName,
              targetUnitId: snap.pendingSpell.targetUnitId,
              accepted: snap.pendingSpell.accepted,
              consumesTurn: snap.pendingSpell.consumesTurn,
              executeEffect: () => {},
            }
          : null;

        // Detect same-round Ressurreição & General Bor Phoenix rebirth triggers from remote PvP snapshot
        if (snap.round === roundRef.current) {
          if (!playerRef.current.borRevivedOnce && nextPlayer.borRevivedOnce) {
            const borUnit = nextPlayer.board.find((u) => u.templateId === 'g_bor' && u.hp > 0);
            if (borUnit) {
              triggerBorPhoenixVfx(borUnit.instanceId, 'player', 60);
            }
          }
          if (!opponentRef.current.borRevivedOnce && nextOpponent.borRevivedOnce) {
            const borUnit = nextOpponent.board.find((u) => u.templateId === 'g_bor' && u.hp > 0);
            if (borUnit) {
              triggerBorPhoenixVfx(borUnit.instanceId, 'opponent', 60);
            }
          }

          const remoteRevived: Array<{ unitId: string; unitName: string; side: 'player' | 'opponent' }> = [];
          const checkSideRevived = (
            prevBoard: CardInstance[],
            nextBoard: CardInstance[],
            side: 'player' | 'opponent'
          ) => {
            nextBoard.forEach((nextUnit) => {
              if (nextUnit.hp <= 0 || nextUnit.conditions.has('ressurreicao')) return;
              const prevUnit = prevBoard.find((p) => p.instanceId === nextUnit.instanceId);
              if (prevUnit && prevUnit.conditions.has('ressurreicao')) {
                remoteRevived.push({ unitId: nextUnit.instanceId, unitName: nextUnit.name, side });
              }
            });
          };
          checkSideRevived(playerRef.current.board, nextPlayer.board, 'player');
          checkSideRevived(opponentRef.current.board, nextOpponent.board, 'opponent');
          if (remoteRevived.length > 0) {
            triggerResurrectionVfx(remoteRevived, 60);
          }
        }

        // Avoid re-triggering draw fly animations for masked opponent hand placeholders
        const prevOppHandLen = opponentRef.current.hand.length;
        nextOpponent.hand.slice(0, prevOppHandLen).forEach((c) => {
          animatedDrawIdsRef.current.add(c.instanceId);
        });
        nextPlayer.hand.forEach((c) => {
          if (playerRef.current.hand.some((old) => old.instanceId === c.instanceId)) {
            animatedDrawIdsRef.current.add(c.instanceId);
          }
        });

        const nextRoundTurnNumber = snap.roundTurnNumber ?? 1;
        const nextAttackerConsecutivePasses =
          snap.attackerConsecutivePasses ?? snap.consecutivePasses ?? 0;

        // Update signature BEFORE applying state so the outgoing effect never echoes this snapshot
        lastSyncedSigRef.current = computeOnlineSyncSignature({
          round: snap.round,
          roundTurnNumber: nextRoundTurnNumber,
          turnPlayer: snap.turnPlayer,
          attackerRole: snap.attackerRole,
          activeCombatAttackerRole: snap.activeCombatAttackerRole,
          attackerConsecutivePasses: nextAttackerConsecutivePasses,
          hasAttackedThisRound: snap.hasAttackedThisRound,
          isDefendingPhase: snap.isDefendingPhase,
          isPostAttackFinalTurn: snap.isPostAttackFinalTurn,
          postAttackRoundEndPending: snap.postAttackRoundEndPending,
          declaredAttackers: nextDeclared,
          assignedBlocks: snap.assignedBlocks || {},
          enfrentarLockedBlocks: snap.enfrentarLockedBlocks || {},
          pendingSpell: nextPendingSpell,
          votoSilencioActive: snap.votoSilencioActive,
          votoSilencioRoundsRemaining: snap.votoSilencioRoundsRemaining,
          player: nextPlayer,
          opponent: nextOpponent,
          gameOverWinner: snap.gameOverWinner,
        });

        isApplyingRemoteStateRef.current = true;
        roundRef.current = snap.round;
        roundTurnNumberRef.current = nextRoundTurnNumber;
        attackerRoleRef.current = snap.attackerRole;
        attackerConsecutivePassesRef.current = nextAttackerConsecutivePasses;
        hasAttackedThisRoundRef.current = snap.hasAttackedThisRound;
        isPostAttackFinalTurnRef.current = snap.isPostAttackFinalTurn;
        votoSilencioRoundsRef.current = snap.votoSilencioRoundsRemaining;
        matchDrawsTotalRef.current = nextPlayer.totalCardsDrawnMatch ?? matchDrawsTotalRef.current;

        setRound(snap.round);
        setRoundTurnNumber(nextRoundTurnNumber);
        setTurnPlayer(snap.turnPlayer);
        setAttackerRole(snap.attackerRole);
        setActiveCombatAttackerRole(snap.activeCombatAttackerRole);
        setAttackerConsecutivePasses(nextAttackerConsecutivePasses);
        setHasAttackedThisRound(snap.hasAttackedThisRound);
        setIsDefendingPhase(snap.isDefendingPhase);
        setIsPostAttackFinalTurn(snap.isPostAttackFinalTurn);
        setPostAttackRoundEndPending(snap.postAttackRoundEndPending);
        setDeclaredAttackers(nextDeclared);
        setAssignedBlocks(snap.assignedBlocks || {});
        setEnfrentarLockedBlocks(snap.enfrentarLockedBlocks || {});
        setVotoSilencioActive(snap.votoSilencioActive);
        setVotoSilencioRoundsRemaining(snap.votoSilencioRoundsRemaining);
        setPlayer(nextPlayer);
        setOpponent(nextOpponent);
        if (snap.logs?.length) {
          setLogs(snap.logs);
        }
        setTurnTimeLeft(30);

        // If our own spell was accepted by the responder (No Veto or after fast counter), execute its effect now on the caster's client
        if (nextPendingSpell?.accepted && nextPendingSpell.casterId === 'player') {
          const acceptedConsumedTurn = nextPendingSpell.consumesTurn !== false;
          setPendingSpell(null);
          window.setTimeout(() => {
            isApplyingRemoteStateRef.current = false;
            const executor = pendingSpellExecutorRef.current;
            pendingSpellExecutorRef.current = null;
            sound.playSpell();
            startFloatingSkillExecution(nextPendingSpell.spellCard, 'player', 2250);
            if (executor) {
              executor();
            }
            addLog(
              `📜 [Habilidade Executada] ${nextPendingSpell.description}${
                !acceptedConsumedTurn ? ' (⚡ Ação livre — seu turno continua!)' : ''
              }`,
              'spell'
            );
            setTurnTimeLeft(30);
            if (!acceptedConsumedTurn) {
              setTurnPlayer('player');
              showFreeActionHint(`⚡ ${nextPendingSpell.spellCard.name} — Seu turno continua!`);
              return;
            }
            if ('player' === attackerRoleRef.current) {
              resetAttackerPasses();
            }
            if (isPostAttackFinalTurnRef.current) {
              const pLatest = playerRef.current;
              const oLatest = opponentRef.current;
              if (hasPendingZykAttack(pLatest, 'player')) {
                setTurnPlayer('player');
              } else if (hasPendingZykAttack(oLatest, 'opponent')) {
                setTurnPlayer('opponent');
              } else {
                setPostAttackRoundEndPending(true);
              }
            } else if (!pendingRetornarTurnNextRef.current) {
              advanceConsumedTurn('opponent');
            }
          }, 40);
          return;
        }

        setPendingSpell(nextPendingSpell);

        if (snap.gameOverWinner !== null && !gameOverWinner && !finishingCannonAnim?.active && !celestialVictoryAnim?.active) {
          setGameOverReason(snap.gameOverReason || 'A partida foi finalizada.');
          setGameOverWinner(snap.gameOverWinner);
          if (!onlineMatchRecordedRef.current && snap.gameOverWinner !== 'draw') {
            onlineMatchRecordedRef.current = true;
            const isPlayerWin = snap.gameOverWinner === 'player';
            let delta = 0;
            if (matchType === 'ranked') {
              const cloudState = getInMemoryPlayerState();
              if (cloudState?.rankBlockedTotal) {
                delta = 0;
                setRankDelta(0);
              } else {
                delta = calculateRankDelta(isPlayerWin, false);
                setRankDelta(delta);
                const newPts = Math.max(0, currentRankPoints + delta);
                setCurrentRankPoints(newPts);
                saveRankPoints(newPts);
              }
            } else {
              delta = isPlayerWin ? 20 : -10;
            }
            recordMatchResult(
              isPlayerWin ? 'victory' : 'defeat',
              onlineMatchBootstrap.localDeckName || 'Meu Baralho',
              delta,
              onlineMatchBootstrap.opponentName,
              matchType === 'ranked' ? 'pvp_ranked' : 'pvp_normal',
              onlineMatchBootstrap.opponentRank || 'Bronze III'
            );
          }
        }

        window.setTimeout(() => {
          isApplyingRemoteStateRef.current = false;
        }, 30);
      }
    });

    return () => unsubscribe();
  }, [
    isOnlinePvp,
    onlineMatchBootstrap,
    computeOnlineSyncSignature,
    startFloatingSkillExecution,
    addLog,
    hasPendingZykAttack,
    gameOverWinner,
    finishingCannonAnim,
    celestialVictoryAnim,
    triggerFinishingCannon,
    matchType,
    currentRankPoints,
    onlineRematchPrep,
    onOnlineRematchStarted,
    triggerResurrectionVfx,
    triggerBorPhoenixVfx,
    advanceConsumedTurn,
    resetAttackerPasses,
    showFreeActionHint,
  ]);

  useEffect(() => {
    if (!isOnlinePvp || !onlineMatchBootstrap) return;
    if (isApplyingRemoteStateRef.current) return;
    if (
      tableCombatAnim ||
      isRoundTransitioning ||
      isAttackTransitioning ||
      Boolean(roundCoinTransition) ||
      targetModal.isOpen ||
      Boolean(umaelModal) ||
      revealModal.isOpen ||
      retornarModal.isOpen ||
      discardModal.isOpen ||
      Boolean(zykDiscardModal?.isOpen) ||
      Boolean(confirmModal?.isOpen) ||
      Boolean(enfrentarModal)
    ) {
      return;
    }

    const currentSig = computeOnlineSyncSignature({
      round,
      roundTurnNumber,
      turnPlayer,
      attackerRole,
      activeCombatAttackerRole,
      attackerConsecutivePasses,
      hasAttackedThisRound,
      isDefendingPhase,
      isPostAttackFinalTurn,
      postAttackRoundEndPending,
      declaredAttackers,
      assignedBlocks,
      enfrentarLockedBlocks,
      pendingSpell,
      votoSilencioActive,
      votoSilencioRoundsRemaining,
      player,
      opponent,
      gameOverWinner,
    });

    if (currentSig === lastSyncedSigRef.current) return;
    lastSyncedSigRef.current = currentSig;

    const nextSeq = onlineSeqRef.current + 1;
    onlineSeqRef.current = nextSeq;

    const snapshot: OnlineMatchSnapshot = {
      seq: nextSeq,
      round,
      roundTurnNumber,
      turnPlayer,
      attackerRole,
      activeCombatAttackerRole,
      consecutivePasses: attackerConsecutivePasses,
      attackerConsecutivePasses,
      hasAttackedThisRound,
      isDefendingPhase,
      isPostAttackFinalTurn,
      postAttackRoundEndPending,
      declaredAttackers: declaredAttackers.map(serializeCardInstance),
      assignedBlocks,
      enfrentarLockedBlocks,
      pendingSpell: pendingSpell
        ? {
            spellCard: serializeCardInstance(pendingSpell.spellCard),
            casterId: pendingSpell.casterId,
            description: pendingSpell.description,
            targetName: pendingSpell.targetName,
            targetUnitId: pendingSpell.targetUnitId,
            accepted: pendingSpell.accepted,
            consumesTurn: pendingSpell.consumesTurn,
          }
        : null,
      votoSilencioActive,
      votoSilencioRoundsRemaining,
      playerCoinSide,
      player: serializePlayerState(player),
      opponent: serializePlayerState(opponent),
      logs: logs.slice(0, 60),
      gameOverWinner,
      gameOverReason,
    };

    pvpSocket.syncMatchState(snapshot);
  }, [
    isOnlinePvp,
    onlineMatchBootstrap,
    computeOnlineSyncSignature,
    tableCombatAnim,
    isRoundTransitioning,
    isAttackTransitioning,
    roundCoinTransition,
    round,
    roundTurnNumber,
    turnPlayer,
    attackerRole,
    activeCombatAttackerRole,
    attackerConsecutivePasses,
    hasAttackedThisRound,
    isDefendingPhase,
    isPostAttackFinalTurn,
    postAttackRoundEndPending,
    declaredAttackers,
    assignedBlocks,
    enfrentarLockedBlocks,
    pendingSpell,
    votoSilencioActive,
    votoSilencioRoundsRemaining,
    playerCoinSide,
    player,
    opponent,
    logs,
    gameOverWinner,
    gameOverReason,
    targetModal.isOpen,
    umaelModal,
    revealModal.isOpen,
    retornarModal.isOpen,
    discardModal.isOpen,
    zykDiscardModal,
    confirmModal,
    enfrentarModal,
  ]);

  // Testing Arena Handlers
  const handleTestingAddCardToHand = (card: CardInstance) => {
    setPlayer((p) => ({
      ...p,
      hand: [...p.hand, card],
    }));
    sound.playDraw();
    addLog(`🧪 [Arena de Testes] ${card.name} adicionado à sua mão!`, 'info');
  };

  const handleTestingAddCardToEnemyHand = (card: CardInstance) => {
    setOpponent((o) => ({
      ...o,
      hand: [...o.hand, card],
    }));
    sound.playDraw();
    addLog(`🧪 [Arena de Testes] ${card.name} adicionado à mão de ${opponent.name}!`, 'info');
  };

  const handleTestingSummonToBoard = (card: CardInstance) => {
    // Enforce O Sol requirement: Hélio Nível 2 on player board
    if (card.templateId === 'n_o_sol' || card.name.trim().toLowerCase().startsWith('o sol')) {
      const hasHelioLvl2 = player.board.some(
        (c) =>
          (c.templateId === 'n_helio' || c.name.toLowerCase().includes('helio') || c.name.toLowerCase().includes('hélio')) &&
          c.level === 2 &&
          c.hp > 0 &&
          c.silencedRounds === 0
      );
      if (!hasHelioLvl2) {
        sound.playDiscard();
        addLog('☀️ [Regra de Invocação] O Sol só pode ser invocado se houver um Hélio nível 2 na sua mesa!', 'info');
        return;
      }
    }

    // Enforce A Lua requirement: Lunário Nível 2 on player board
    if (card.templateId === 'g_a_lua' || card.name.trim().toLowerCase().startsWith('a lua')) {
      const hasLunarioLvl2 = player.board.some(
        (c) =>
          (c.templateId === 'g_lunario' || c.name.toLowerCase().includes('lunario')) &&
          c.level === 2 &&
          c.hp > 0 &&
          c.silencedRounds === 0
      );
      if (!hasLunarioLvl2) {
        sound.playDiscard();
        addLog('🌙 [Regra de Invocação] A Lua só pode ser invocada se houver um Lunario nível 2 na sua mesa!', 'info');
        return;
      }
    }

    // Enforce Zyk requirement: 2 allied cards sacrifice
    if (card.templateId === 'g_zyk' || card.name.toLowerCase().includes('zyk')) {
      handlePlayCard(card, 'player');
      return;
    }

    // Enforce Atormentador piece limit: 1 piece per round
    const isAtormentadorPiece = card.templateId === 'm_tor' || card.templateId === 'm_men' || card.templateId === 'm_tador';
    if (isAtormentadorPiece && player.atormentadorPieceSummonedThisRound) {
      sound.playDiscard();
      addLog('⚡ [Regra de Invocação] Apenas 1 peça do Atormentador pode ser invocada por rodada!', 'info');
      return;
    }

    const maxSlots = card.templateId === 'n_gohr' ? 6 : (player.maxBoardSlots ?? 5);
    if (player.board.length >= maxSlots) {
      setDiscardModal({
        isOpen: true,
        incomingCard: card,
        ownerId: 'player',
      });
      return;
    }

    executeSummonToBoard(card, 'player');
  };

  const handleTestingSummonToEnemyBoard = (card: CardInstance) => {
    if (card.templateId === 'n_o_sol' || card.name.trim().toLowerCase().startsWith('o sol')) {
      const hasHelioLvl2 = opponent.board.some(
        (c) =>
          (c.templateId === 'n_helio' || c.name.toLowerCase().includes('helio') || c.name.toLowerCase().includes('hélio')) &&
          c.level === 2 &&
          c.hp > 0 &&
          c.silencedRounds === 0
      );
      if (!hasHelioLvl2) {
        sound.playDiscard();
        addLog('☀️ [Regra de Invocação] O Sol só pode ser invocado na mesa inimiga se houver um Hélio nível 2 lá!', 'info');
        return;
      }
    }

    if (card.templateId === 'g_a_lua' || card.name.trim().toLowerCase().startsWith('a lua')) {
      const hasLunarioLvl2 = opponent.board.some(
        (c) =>
          (c.templateId === 'g_lunario' || c.name.toLowerCase().includes('lunario')) &&
          c.level === 2 &&
          c.hp > 0 &&
          c.silencedRounds === 0
      );
      if (!hasLunarioLvl2) {
        sound.playDiscard();
        addLog('🌙 [Regra de Invocação] A Lua só pode ser invocada na mesa inimiga se houver um Lunario nível 2 lá!', 'info');
        return;
      }
    }

    const maxSlots = card.templateId === 'n_gohr' ? 6 : (opponent.maxBoardSlots ?? 5);
    if (opponent.board.length >= maxSlots) {
      sound.playDiscard();
      addLog(`🧪 [Arena de Testes] Mesa inimiga cheia (${maxSlots} cartas). Limpe a mesa inimiga primeiro.`, 'info');
      return;
    }

    executeSummonToBoard(card, 'opponent');
  };

  const handleTestingClearPlayerBoard = () => {
    setPlayer((p) => ({
      ...p,
      board: [],
      graveyard: [...p.graveyard, ...p.board],
    }));
    sound.playDiscard();
    addLog('🧪 [Arena de Testes] Sua mesa foi limpa!', 'info');
  };

  const handleTestingClearEnemyBoard = () => {
    setOpponent((o) => ({
      ...o,
      board: [],
      graveyard: [...o.graveyard, ...o.board],
    }));
    sound.playDiscard();
    addLog('🧪 [Arena de Testes] Mesa do oponente limpa!', 'info');
  };

  const handleTestingRespawnDummies = () => {
    setOpponent((o) => ({
      ...o,
      hp: 999,
      board: createDummyTargetCards(),
    }));
    sound.playSummon();
    addLog('🎯 [Arena de Testes] Bonecos Alvo restaurados com 10 Vida, 5 Atk e 5 Def!', 'info');
  };

  const handleTestingSummonDummy = () => {
    const maxSlots = opponent.maxBoardSlots ?? 5;
    if (opponent.board.length >= maxSlots) {
      sound.playTick();
      addLog(`⚠️ [Arena de Testes] A mesa inimiga já está cheia (${maxSlots} unidades)!`, 'info');
      return;
    }
    const baseDummy = createDummyTargetCards()[0];
    const nextNumber = opponent.board.length + 1;
    const dummyCard: CardInstance = {
      ...baseDummy,
      name: `Boneco Alvo ${nextNumber}`,
    };
    setOpponent((o) => {
      const limit = o.maxBoardSlots ?? 5;
      if (o.board.length >= limit) return o;
      return {
        ...o,
        board: [...o.board, dummyCard],
      };
    });
    sound.playSummon();
    addLog(`🎯 [Arena de Testes] ${dummyCard.name} invocado na mesa inimiga!`, 'info');
  };

  const handleTestingClearHand = () => {
    setPlayer((p) => ({
      ...p,
      hand: [],
    }));
    sound.playDiscard();
    addLog('🧪 [Arena de Testes] Sua mão foi limpa! Abra o Grimório para selecionar as cartas que desejar.', 'info');
  };

  const handleTestingClearEnemyHand = () => {
    setOpponent((o) => ({
      ...o,
      hand: [],
    }));
    sound.playDiscard();
    addLog(`🧪 [Arena de Testes] A mão de ${opponent.name} foi limpa!`, 'info');
  };

  const handleTestingShuffleDeck = (playerId: 'player' | 'opponent' = 'player') => {
    const isPlayer = playerId === 'player';
    sound.playDraw();
    if (isPlayer) {
      setPlayer((p) => {
        const baseDeck = p.deck.length > 0 ? p.deck : buildPlayerDeck();
        return {
          ...p,
          deck: shuffleDeck(baseDeck),
        };
      });
      addLog('🔀 [Arena de Testes] Seu baralho foi embaralhado com sucesso!', 'info');
    } else {
      setOpponent((o) => {
        const baseDeck = o.deck.length > 0 ? o.deck : buildPlayerDeck();
        return {
          ...o,
          deck: shuffleDeck(baseDeck),
        };
      });
      addLog(`🔀 [Arena de Testes] O baralho de ${opponent.name} foi embaralhado!`, 'info');
    }
  };

  const handleTestingPutCardOnTopOfDeck = (card: CardInstance, playerId: 'player' | 'opponent' = 'player') => {
    const isPlayer = playerId === 'player';
    sound.playSummon();
    if (isPlayer) {
      setPlayer((p) => ({
        ...p,
        deck: [card, ...p.deck.filter((c) => c.instanceId !== card.instanceId)],
      }));
      addLog(
        `⭐ [Arena de Testes] A carta "${card.name}" foi colocada no TOPO do seu baralho! Na próxima compra ela virá para sua mão.`,
        'info'
      );
    } else {
      setOpponent((o) => ({
        ...o,
        deck: [card, ...o.deck.filter((c) => c.instanceId !== card.instanceId)],
      }));
      addLog(
        `⭐ [Arena de Testes] "${card.name}" foi colocada no TOPO do baralho de ${opponent.name}!`,
        'info'
      );
    }
  };

  // Auto-respawn dummies in testing arena when they all perish
  useEffect(() => {
    if (isTestingArena && opponent.board.length === 0) {
      const timer = setTimeout(() => {
        setOpponent((prev) => ({
          ...prev,
          board: createDummyTargetCards(),
        }));
        addLog('🎯 [Arena de Testes] Bonecos Alvo renasceram na mesa inimiga!', 'info');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isTestingArena, opponent.board.length]);

  const handleCoinResolved = (winner: 'player' | 'opponent', chosenSide?: 'sol' | 'lua') => {
    setIsMagicCoinOpen(false);
    if (chosenSide) {
      setPlayerCoinSide(chosenSide);
    }
    attackerRoleRef.current = winner;
    roundTurnNumberRef.current = 1;
    attackerConsecutivePassesRef.current = 0;
    setRoundTurnNumber(1);
    setAttackerConsecutivePasses(0);
    setFreeActionHint(null);
    setAttackerRole(winner);
    setActiveCombatAttackerRole(winner);
    setTurnPlayer(winner);
    sound.playVictory();
    addLog(
      `🪙✨ A Moeda Mágica decidiu! ${winner === 'player' ? 'Você' : opponent.name} venceu a iniciativa e começa o Turno 1 como ATACANTE da Rodada 1!`,
      'round'
    );
  };

  const handleSurrender = () => {
    if (isTestingArena) {
      setConfirmModal({
        isOpen: true,
        title: 'Sair da Arena de Testes',
        description: 'Deseja encerrar a sessão na Arena de Testes e retornar ao Menu Inicial?',
        confirmLabel: 'Sim, Sair',
        cancelLabel: 'Continuar Testando',
        onConfirm: () => {
          setConfirmModal(null);
          onExitToTitle();
        },
        onCancel: () => setConfirmModal(null),
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Render-se do Combate',
      description: 'Deseja realmente render-se e conceder a vitória ao seu adversário?',
      confirmLabel: 'Sim, Render-se',
      cancelLabel: 'Continuar Lutando',
      onConfirm: () => {
        setConfirmModal(null);
        if (isOnlinePvp) {
          pvpSocket.surrenderMatch('Você se rendeu do combate.');
        }
        setPlayer((p) => ({ ...p, hp: 0 }));
        triggerFinishingCannon('opponent', 'Você se rendeu do combate.');
      },
      onCancel: () => setConfirmModal(null),
    });
  };

  // Active Role labels
  const isPlayerAttackerRole = attackerRole === 'player';
  const isPlayerTurn = turnPlayer === 'player';
  const willPassEndRound =
    !isDefendingPhase &&
    !isAttackTransitioning &&
    !combatResults &&
    !tableCombatAnim &&
    !pendingSpell &&
    (isPostAttackFinalTurn || (turnPlayer === attackerRole && attackerConsecutivePasses >= 1));
  const isZykCosmicActive = Boolean(
    (isPlayerAttackerRole && player.secondAttackDone && !hasAttackedThisRound) ||
      (!isPlayerAttackerRole && opponent.secondAttackDone && !hasAttackedThisRound) ||
      (!isPlayerAttackerRole && player.canAttackOnDefense) ||
      (isPlayerAttackerRole && opponent.canAttackOnDefense)
  );

  const hasUnitZykExtraAttackAura = (
    card: CardInstance,
    ownerState: PlayerState,
    ownerId: 'player' | 'opponent'
  ): boolean => {
    if (
      card.hp <= 0 ||
      card.isDying ||
      card.conditions.has('atordoado') ||
      card.conditions.has('dormindo') ||
      card.templateId === 'm_lamina_inverno' ||
      card.templateId === 'n_pedrinha'
    ) {
      return false;
    }
    const isOwnerAttacker = attackerRole === ownerId;
    if (isOwnerAttacker) {
      return Boolean(
        (ownerState.extraAttackRound && !ownerState.secondAttackDone) ||
          (ownerState.secondAttackDone && !hasAttackedThisRound)
      );
    }
    return Boolean(ownerState.canAttackOnDefense);
  };

  const playmatBgClass =
    playmat === 'celestial_sanctuary'
      ? 'bg-[#0e0b06]'
      : playmat === 'obsidian_forge'
      ? 'bg-[#0d0507]'
      : playmat === 'classic_slate'
      ? 'bg-[#09090d]'
      : 'bg-[#070510]';

  return (
    <div className={`relative w-screen h-dvh overflow-hidden ${playmatBgClass} flex flex-col justify-between text-stone-200 select-none font-sans`}>
      {/* Background Cosmic Nebula & Stars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff18_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
        {playmat === 'celestial_sanctuary' ? (
          <>
            <div className="absolute -top-1/4 left-1/4 w-[65vw] h-[50vh] bg-gradient-to-br from-amber-900/45 via-yellow-800/20 to-transparent blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-[55vw] h-[45vh] bg-gradient-to-tl from-amber-700/30 via-indigo-900/20 to-transparent blur-3xl" />
          </>
        ) : playmat === 'obsidian_forge' ? (
          <>
            <div className="absolute -top-1/4 left-1/4 w-[65vw] h-[50vh] bg-gradient-to-br from-rose-950/65 via-red-900/30 to-transparent blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-[55vw] h-[45vh] bg-gradient-to-tl from-orange-900/35 via-rose-950/25 to-transparent blur-3xl" />
          </>
        ) : (
          <>
            <div className="absolute -top-1/4 left-1/4 w-[65vw] h-[50vh] bg-gradient-to-br from-indigo-950/70 via-purple-900/35 to-transparent blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-[55vw] h-[45vh] bg-gradient-to-tl from-amber-900/30 via-rose-900/20 to-transparent blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vw] h-[55vh] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.14)_0%,rgba(147,51,234,0.09)_50%,transparent_80%)] blur-2xl" />
          </>
        )}
      </div>

      {/* TOP COMMAND & ROUND PROGRESSION HUD BAR */}
      <div
        className={`relative z-30 ${
          isMobileView ? 'px-2 py-1 min-h-[36px]' : 'px-4 py-1.5 min-h-[44px]'
        } border-b border-amber-500/25 bg-gradient-to-r from-[#090712]/95 via-[#120e24]/95 to-[#090712]/95 backdrop-blur-md grid grid-cols-[minmax(0,1fr)_auto_auto] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-xs shrink-0 shadow-[0_4px_24px_rgba(0,0,0,0.65)]`}
      >
        {/* LEFT: Crônicas Storytelling Ticker (+ Online Room Code if PvP) */}
        <div className="flex items-center gap-2 min-w-0">
          {isOnlinePvp && onlineMatchBootstrap && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-950/85 border border-emerald-400/45 text-emerald-200 font-mono text-[10px] font-bold shrink-0 whitespace-nowrap">
              <span>🌐</span>
              <span>Sala {onlineMatchBootstrap.roomCode}</span>
            </div>
          )}

          {isMobileView ? (
            <button
              type="button"
              onClick={() => {
                sound.playTick();
                setIsMobileLogOpen(true);
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60 hover:bg-stone-900 border border-amber-500/35 hover:border-amber-400/70 min-w-0 max-w-full cursor-pointer transition-colors"
              title="Abrir Histórico Completo das Crônicas do Combate"
            >
              <ScrollText size={12} className="text-amber-400 shrink-0" />
              <span className="truncate text-[10px] text-stone-200 font-medium">
                {logs[0]?.text || 'Crônicas do Combate...'}
              </span>
              <span className="px-1 py-0.2 rounded bg-amber-500/20 border border-amber-400/40 text-[9px] font-mono font-bold text-amber-300 shrink-0 tabular-nums">
                {logs.length}
              </span>
            </button>
          ) : (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 border border-white/10 min-w-0 max-w-full"
              title={logs[0]?.text || 'Crônicas do Combate'}
            >
              <Sparkles size={12} className="text-amber-400 shrink-0" />
              <span className="text-amber-300/95 font-serif font-bold uppercase tracking-wider text-[10px] shrink-0 whitespace-nowrap">
                Crônicas:
              </span>
              <span className="truncate text-[11px] text-stone-200 font-medium">
                {logs[0]?.text || 'O santuário aguarda o primeiro movimento...'}
              </span>
            </div>
          )}

          {isMobileView && votoSilencioActive && (
            <span
              className="px-1.5 py-0.5 rounded-md bg-purple-950/90 border border-purple-400/60 text-[9px] font-bold text-purple-200 shrink-0 whitespace-nowrap"
              title={`Voto de Silêncio ativo (${votoSilencioRoundsRemaining} rod.)`}
            >
              🔇 Silêncio
            </span>
          )}
          {isMobileView && (pHasOVazio || oHasOVazio) && (
            <span
              className="px-1.5 py-0.5 rounded-md bg-fuchsia-950/90 border border-fuchsia-400/60 text-[9px] font-bold text-fuchsia-200 shrink-0 whitespace-nowrap"
              title="Passiva Secreta O Vazio ativa na arena"
            >
              🌌 Vazio
            </span>
          )}
        </div>

        {/* CENTER: TFT-Style Round & Turn Progression Bar */}
        <div className="flex items-center justify-center shrink-0">
          <RoundProgressTracker
            round={round}
            roundTurnNumber={roundTurnNumber}
            attackerRole={attackerRole}
            turnPlayer={turnPlayer}
            playerName={player.name}
            opponentName={opponent.name}
            attackerConsecutivePasses={attackerConsecutivePasses}
            hasAttackedThisRound={hasAttackedThisRound}
            isDefendingPhase={isDefendingPhase}
            isAttackTransitioning={isAttackTransitioning}
            hasPendingSpell={Boolean(pendingSpell)}
            isCombatResolving={Boolean(combatResults || tableCombatAnim)}
            isPostAttackFinalTurn={isPostAttackFinalTurn}
            isMobileView={isMobileView}
          />
        </div>

        {/* RIGHT: ONLY 3 BUTTONS — Configurações (Icon Only), Tela Cheia, Render-se */}
        <div className="flex items-center justify-end gap-1.5 shrink-0">
          <button
            onClick={() => {
              sound.playTick();
              setIsSettingsOpen(true);
            }}
            className="p-1.5 sm:p-2 rounded-lg bg-stone-900/90 hover:bg-stone-800 text-amber-300 hover:text-amber-200 border border-amber-500/35 hover:border-amber-400/70 transition-colors cursor-pointer"
            title="Configurações (Tema, Sons/Mutar, Mobile/Mesa e Regras)"
            aria-label="Configurações"
          >
            <Settings size={15} />
          </button>

          <button
            onClick={handleToggleFullscreen}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-colors text-[11px] font-bold cursor-pointer whitespace-nowrap ${
              isFullscreen
                ? 'bg-cyan-950/85 hover:bg-cyan-900 border-cyan-400/60 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.25)]'
                : 'bg-stone-900/90 hover:bg-stone-800 border-amber-500/30 text-amber-200'
            }`}
            title={isFullscreen ? 'Sair da Tela Cheia' : 'Colocar em Tela Cheia'}
          >
            {isFullscreen ? <Minimize2 size={13} className="text-cyan-300" /> : <Maximize2 size={13} className="text-amber-400" />}
            <span className="hidden sm:inline">
              {isFullscreen ? 'Sair' : 'Tela Cheia'}
            </span>
          </button>

          <button
            onClick={handleSurrender}
            className="px-2.5 py-1.5 rounded-lg bg-rose-950/85 hover:bg-rose-900 text-rose-200 border border-rose-500/40 font-serif font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap"
            title={isTestingArena ? 'Encerrar Arena de Testes e Voltar ao Menu' : 'Render-se do Combate'}
          >
            Render-se
          </button>
        </div>
      </div>

      {opponentDisconnectNotice !== null && isOnlinePvp && (
        <div className="relative z-30 w-full px-3 py-0.5 bg-amber-950/95 border-b border-amber-400/50 text-amber-200 text-[10px] font-bold flex items-center justify-center gap-2 shrink-0 animate-pulse">
          <span>⚠️ {onlineMatchBootstrap?.opponentName} desconectou-se. Aguardando retorno ({opponentDisconnectNotice}s)...</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* UNIFIED AAA BATTLEFIELD SANCTUARY (Mobile Landscape 3-Col & Desktop) */}
      {/* ==================================================================== */}
      {isMobileView ? (() => {
        const isManualBoth = isTestingArena;
        const activeMobileHandOwnerId: 'player' | 'opponent' =
          isManualBoth && turnPlayer === 'opponent' ? 'opponent' : 'player';
        const inactiveMobileOwnerId: 'player' | 'opponent' =
          activeMobileHandOwnerId === 'player' ? 'opponent' : 'player';
        const activeMobileHandOwner = activeMobileHandOwnerId === 'player' ? player : opponent;
        const inactiveMobileOwner = inactiveMobileOwnerId === 'player' ? player : opponent;
        const enableBoardCombatMotion = animationMode === 'full' && combatAnimations;
        const canDrawNow =
          isTestingArena ||
          (!activeMobileHandOwner.hasDrawnThisRound &&
            activeMobileHandOwner.deck.length > 0 &&
            (!isOnlinePvp || (turnPlayer === 'player' && !pendingSpell && !isDefendingPhase)));
        const drawStatusLabel =
          activeMobileHandOwner.deck.length === 0
            ? 'Vazio'
            : canDrawNow
            ? 'Comprar'
            : activeMobileHandOwner.hasDrawnThisRound
            ? 'Comprado ✓'
            : 'Aguarde';

        const renderMobileSegmentedHp = (owner: PlayerState, accent: 'opponent' | 'player') => (
          <div
            className={`w-full h-2.5 rounded-full bg-stone-950 border p-[1.5px] flex items-center gap-[1.5px] overflow-hidden ${
              accent === 'opponent' ? 'border-purple-500/50' : 'border-amber-500/50'
            }`}
          >
            {Array.from({ length: Math.max(1, owner.maxHp) }).map((_, i) => {
              const isFilled = i < owner.hp;
              const isPinkFairySlot = Boolean(owner.corteDasFadasUsed && i < (owner.pinkExtraHpSlots || 0));
              const purpleStartIdx = owner.maxHp - (owner.purpleExtraHpSlots || 0);
              const isPurpleSlot = i >= purpleStartIdx;
              return (
                <div
                  key={i}
                  title={
                    isPinkFairySlot
                      ? 'Vida Extra Rosa (Corte das Fadas)'
                      : isPurpleSlot
                      ? 'Segmento Extra Roxo (Mipo)'
                      : undefined
                  }
                  className={`flex-1 h-full rounded-[2px] transition-all duration-300 ${
                    isPinkFairySlot && isFilled
                      ? 'bg-gradient-to-r from-pink-300 via-pink-400 to-fuchsia-500 border border-pink-100 shadow-[0_0_6px_#f472b6]'
                      : isPurpleSlot
                      ? isFilled
                        ? 'bg-gradient-to-r from-purple-400 via-fuchsia-500 to-violet-600 shadow-[0_0_5px_#c084fc]'
                        : 'border border-purple-400/50 bg-purple-950/50'
                      : isFilled
                      ? accent === 'opponent'
                        ? 'bg-gradient-to-r from-purple-400 to-rose-500'
                        : 'bg-gradient-to-r from-amber-400 to-rose-500'
                      : 'bg-stone-800/60'
                  }`}
                />
              );
            })}
          </div>
        );

        return (
        <div className="relative z-10 flex-1 min-h-0 flex w-full safe-area-arena overflow-hidden px-1.5 py-1 gap-1.5 select-none">
          {/* ============================================================== */}
          {/* LEFT WING: Opponent Intel, Compact Turn/Round Dial, Role & Draw */}
          {/* ============================================================== */}
          <div className="w-[104px] sm:w-[118px] shrink-0 h-full flex flex-col justify-between items-center py-1 px-1 rounded-2xl bg-gradient-to-b from-[#130e26]/95 via-[#090714]/95 to-[#130e26]/95 border border-amber-500/30 shadow-[0_0_24px_rgba(0,0,0,0.75)] overflow-y-auto scrollbar-none gap-1">
            {/* Top: Inactive Owner (Opponent) Deck, Hand & Crypt Intel */}
            <div className="w-full flex flex-col gap-1 shrink-0">
              <div className="w-full flex items-center justify-between px-1">
                <span className="text-[8px] font-serif font-black text-purple-200 truncate">
                  {inactiveMobileOwner.name}
                </span>
                <span
                  className="text-[8px] font-mono font-bold text-purple-300 shrink-0 tabular-nums"
                  title={`Cartas na mão de ${inactiveMobileOwner.name}`}
                >
                  🃏{inactiveMobileOwner.hand.length}
                </span>
              </div>
              <div className="w-full grid grid-cols-2 gap-1">
                <button
                  type="button"
                  data-deck-zone={inactiveMobileOwnerId}
                  onClick={() => {
                    if (isManualBoth && (turnPlayer === inactiveMobileOwnerId || isTestingArena)) {
                      handleDrawCard(inactiveMobileOwnerId);
                    }
                  }}
                  className={`py-0.5 px-1 rounded-lg border text-center transition-all ${
                    isManualBoth && (turnPlayer === inactiveMobileOwnerId || isTestingArena)
                      ? 'border-amber-300 bg-purple-900/90 text-amber-200 cursor-pointer'
                      : 'border-purple-500/35 bg-purple-950/60 text-purple-200'
                  }`}
                  title={`Grimório de ${inactiveMobileOwner.name}: ${inactiveMobileOwner.deck.length} cartas`}
                >
                  <span className="text-[7px] font-serif uppercase tracking-wider block text-purple-300 leading-none">
                    Deck
                  </span>
                  <span className="text-[10px] font-mono font-black tabular-nums leading-tight">
                    {inactiveMobileOwner.deck.length}
                  </span>
                </button>

                <button
                  type="button"
                  data-graveyard={inactiveMobileOwnerId}
                  onClick={() => {
                    sound.playTick();
                    setGraveyardModalOwner(inactiveMobileOwnerId);
                  }}
                  className="py-0.5 px-1 rounded-lg border border-rose-500/40 bg-rose-950/60 hover:bg-rose-900 text-rose-200 text-center transition-all cursor-pointer"
                  title={`Cripta de ${inactiveMobileOwner.name}: ${inactiveMobileOwner.graveyard.length} cartas`}
                >
                  <span className="text-[7px] font-serif uppercase tracking-wider block text-rose-300 leading-none">
                    Cripta
                  </span>
                  <span className="text-[10px] font-mono font-black tabular-nums leading-tight">
                    {inactiveMobileOwner.graveyard.length}
                  </span>
                </button>
              </div>
              {isTestingArena && (
                <button
                  type="button"
                  onClick={() => handleTestingShuffleDeck(inactiveMobileOwnerId)}
                  className="w-full py-0.5 rounded-md border border-purple-500/40 bg-purple-950/70 hover:bg-purple-900 text-purple-300 text-[7.5px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Shuffle size={8} /> Mix
                </button>
              )}
            </div>

            {/* Middle: Compact Turn/Round Astrolabe Dial + 3D Role Crest */}
            <div data-tutorial-target="round-dial" className="w-full flex flex-col items-center gap-1 my-auto shrink-0">
              <div data-tutorial-target="round-dial-core" className="w-full flex flex-col items-center">
              <TurnRoundCoinDial
                compact
                round={round}
                roundTurnNumber={roundTurnNumber}
                turnPlayer={turnPlayer}
                attackerRole={attackerRole}
                activeCombatAttackerRole={activeCombatAttackerRole}
                attackerConsecutivePasses={attackerConsecutivePasses}
                isDefendingPhase={isDefendingPhase}
                isPostAttackFinalTurn={isPostAttackFinalTurn}
                hasPendingSpell={Boolean(pendingSpell)}
                willPassEndRound={willPassEndRound}
                freeActionHint={freeActionHint}
                newlyUnlockedTier={newlyUnlockedTier}
                roundCoinFlipAnim={roundCoinFlipAnim}
                isTestingArena={isTestingArena}
                onTestingNextRound={() => startNewRound()}
                onTestingSwapTurn={() => {
                  const nextTurn: 'player' | 'opponent' = turnPlayer === 'player' ? 'opponent' : 'player';
                  setTurnPlayer(nextTurn);
                  sound.playTick();
                  addLog(
                    `⇄ [Arena de Testes] Turno ativo alternado para ${nextTurn === 'player' ? player.name : opponent.name}!`,
                    'info'
                  );
                }}
              />
              </div>

              <div data-tutorial-target="role-crest" className="w-full flex flex-col items-center">
              <RoleFunctionCrest
                compact
                displayedRole={
                  roundCoinTransition?.stage === 'waves'
                    ? roundCoinTransition.fromRole
                    : roundCoinTransition?.stage === 'reveal'
                    ? roundCoinTransition.toRole
                    : isPlayerAttackerRole
                    ? 'attacker'
                    : 'defender'
                }
                isCoinConsuming={roundCoinTransition?.stage === 'consume_and_spin'}
                isCoinRevealing={roundCoinTransition?.stage === 'reveal'}
                isRoleCoinManualSpin={isRoleCoinManualSpin}
                isCosmicPurpleCoin={isZykCosmicActive && roundCoinTransition?.stage !== 'consume_and_spin'}
                hasAttackedThisRound={hasAttackedThisRound}
                isTestingArena={isTestingArena}
                coinTargetRef={roleCoinTargetRef}
                onCoinClick={() => {
                  if (isTestingArena) {
                    const nextRole: 'player' | 'opponent' = attackerRole === 'player' ? 'opponent' : 'player';
                    triggerRoleSwapCoinAnimation(nextRole);
                    return;
                  }
                  if (isRoleCoinManualSpin || roundCoinTransition) return;
                  sound.playTick();
                  setIsRoleCoinManualSpin(true);
                  setTimeout(() => setIsRoleCoinManualSpin(false), 750);
                }}
              />
              </div>
            </div>

            {/* Bottom: Active Player Draw & Crypt Cluster */}
            <div className="w-full flex flex-col items-center gap-1 shrink-0">
              {isTestingArena && (
                <button
                  type="button"
                  onClick={() => handleTestingShuffleDeck(activeMobileHandOwnerId)}
                  className="w-full py-0.5 rounded-md border border-amber-500/35 bg-stone-900/90 hover:bg-stone-800 text-amber-300 text-[7.5px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  title="Embaralhar baralho"
                >
                  <Shuffle size={8} /> Mix
                </button>
              )}

              <button
                type="button"
                data-deck-zone={activeMobileHandOwnerId}
                onClick={() => handleDrawCard(activeMobileHandOwnerId)}
                disabled={!canDrawNow}
                className={`w-full min-h-[38px] py-1 px-1.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                  canDrawNow
                    ? `border-amber-300 bg-gradient-to-b from-amber-500/35 to-amber-700/30 text-amber-100 cursor-pointer shadow-[0_0_12px_rgba(251,191,36,0.35)] ${
                        ambientAnimations && animationMode === 'full' ? 'animate-pulse' : ''
                      }`
                    : 'border-stone-700/80 bg-stone-900/85 text-stone-400 cursor-not-allowed'
                }`}
                title={
                  isTestingArena
                    ? 'Comprar carta (infinito na arena de testes)'
                    : `${drawStatusLabel} — ${activeMobileHandOwner.deck.length} cartas no grimório`
                }
              >
                <span className="text-[8px] font-serif font-black uppercase leading-none">
                  {drawStatusLabel}
                </span>
                <span className="text-[10px] font-mono font-black tabular-nums mt-0.5">
                  📚 {activeMobileHandOwner.deck.length}
                </span>
              </button>

              <button
                type="button"
                data-graveyard={activeMobileHandOwnerId}
                onClick={() => {
                  sound.playTick();
                  setGraveyardModalOwner(activeMobileHandOwnerId);
                }}
                className="w-full py-1 px-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/60 hover:bg-cyan-900 text-cyan-200 text-[8.5px] font-bold uppercase cursor-pointer flex items-center justify-center gap-1"
              >
                <span>💀 Cripta</span>
                <span className="font-mono tabular-nums">({activeMobileHandOwner.graveyard.length})</span>
              </button>
            </div>
          </div>

          {/* ============================================================== */}
          {/* CENTER SCULPTED RUNIC ARENA: Boards + Tactical Strip + Hand    */}
          {/* ============================================================== */}
          <div className="flex-1 min-w-0 h-full flex flex-col justify-between overflow-hidden gap-1">
            {/* Hidden hand-zone anchor for opponent draw/discard VFX targeting */}
            <div data-hand-zone={inactiveMobileOwnerId} className="sr-only" aria-hidden="true" />

            {/* Sculpted Battlefield Table (Drag-to-Summon Dropzone) */}
            <div
              ref={mobileBattlefieldDropRef}
              className={`flex-1 min-h-0 flex flex-col justify-between items-center w-full relative overflow-hidden rounded-2xl border bg-gradient-to-b from-[#140e28]/70 via-[#0a0816]/65 to-[#120d22]/75 px-1.5 py-1 shadow-[inset_0_0_28px_rgba(0,0,0,0.65)] transition-all ${
                mobileDragCard?.isDragging
                  ? mobileDragCard.isOverTable
                    ? mobileDragCard.isPlayable
                      ? 'border-emerald-400 ring-2 ring-emerald-400 bg-emerald-950/25 shadow-[inset_0_0_24px_rgba(16,185,129,0.3)]'
                      : 'border-rose-400 ring-2 ring-rose-400 bg-rose-950/25 shadow-[inset_0_0_24px_rgba(244,63,94,0.3)]'
                    : 'border-amber-400 ring-2 ring-amber-400/70 bg-amber-950/15 shadow-[inset_0_0_20px_rgba(251,191,36,0.2)]'
                  : 'border-amber-500/30'
              }`}
            >
              {/* Active Turn Half-Table Glowing Border (Mobile) */}
              <TableTurnBorderGlow
                turnPlayer={turnPlayer}
                cornerRadius={16}
                compact
                mode={effectiveTurnIndicatorMode}
                reduceBlur={reduceGpuBlur}
              />

              {/* Subtle sculpted golden filigree top/bottom rims */}
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/55 to-transparent" />
              <div className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-400/45 to-transparent" />

              {mobileDragCard?.isDragging && (
                <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 px-3 py-1 rounded-full bg-stone-950/95 border border-amber-400/80 text-[10px] font-serif font-bold text-amber-200 shadow-xl whitespace-nowrap">
                  {mobileDragCard.isOverTable
                    ? mobileDragCard.isPlayable
                      ? `✨ Solte na mesa para ${mobileDragCard.card.type === 'unit' ? 'Invocar' : 'Lançar'}!`
                      : `🚫 ${mobileDragCard.unplayableReason || 'Não jogável agora'}`
                    : '⬆️ Arraste até a mesa para jogar'}
                </div>
              )}

              {/* Opponent Unit Row (Native Crisp MobileBattleCard) */}
              <div className="w-full flex items-center justify-center gap-1.5 sm:gap-2 shrink-0 overflow-x-auto scrollbar-none py-0.5">
                {Array.from({ length: Math.max(opponent.board.length, opponent.maxBoardSlots ?? 5) }).map((_, slotIdx) => {
                  const card = opponent.board[slotIdx];
                  if (!card) {
                    return (
                      <div
                        key={`mob-opp-empty-${slotIdx}`}
                        className="w-[66px] h-[94px] sm:w-[78px] sm:h-[110px] rounded-xl border border-dashed border-purple-400/25 bg-purple-950/15 flex flex-col items-center justify-center pointer-events-none shrink-0"
                      >
                        <span className="text-sm font-mono text-purple-300/30">ᛊ</span>
                        <span className="text-[7px] font-serif uppercase tracking-widest text-purple-300/35 mt-0.5">
                          Slot {slotIdx + 1}
                        </span>
                      </div>
                    );
                  }

                  const isBlockingAttackerId = Object.entries(assignedBlocks).find(
                    ([_, defId]) => defId === card.instanceId
                  )?.[0];
                  const attackerName = isBlockingAttackerId
                    ? declaredAttackers.find((a) => a.instanceId === isBlockingAttackerId)?.name
                    : undefined;
                  const isSelectedForAttack = selectedAttackerIds.includes(card.instanceId);
                  const canOpponentAttack =
                    !pendingSpell &&
                    isManualBoth &&
                    (turnPlayer === 'opponent' || isTestingArena) &&
                    ((attackerRole === 'opponent' &&
                      (!hasAttackedThisRound || (Boolean(opponent.extraAttackRound) && !opponent.secondAttackDone))) ||
                      Boolean(opponent.canAttackOnDefense)) &&
                    !card.conditions.has('atordoado') &&
                    !card.conditions.has('dormindo') &&
                    card.templateId !== 'm_lamina_inverno' &&
                    card.templateId !== 'n_pedrinha';
                  const isAssigned = Boolean(isBlockingAttackerId);
                  const canOpponentDefend =
                    isDefendingPhase &&
                    activeCombatAttackerRole === 'player' &&
                    isManualBoth &&
                    !card.conditions.has('atordoado') &&
                    !card.conditions.has('dormindo') &&
                    card.templateId !== 'm_lamina_inverno';

                  let oppCardActionLabel: string | undefined = undefined;
                  if (canOpponentAttack) {
                    oppCardActionLabel = isSelectedForAttack ? 'Remover' : 'Atacar';
                  } else if (isDefendingPhase && activeCombatAttackerRole === 'player' && isManualBoth && (isAssigned || canOpponentDefend)) {
                    oppCardActionLabel = isAssigned ? 'Remover' : (assigningBlockForAttacker ? 'Bloquear' : 'Defender');
                  }

                  const mobOppAtkResult = tableCombatAnim?.results.find((r) => r.attackerCard?.instanceId === card.instanceId);
                  const mobOppDefResult = tableCombatAnim?.results.find((r) => r.defenderCard?.instanceId === card.instanceId);
                  const isMobOppDouble = Boolean(
                    card.conditions?.has('ataque_duplo') ||
                      card.hasDoubleAttack ||
                      (card.templateId === 'm_moira' && card.silencedRounds === 0) ||
                      (card.templateId === 'm_jasmim' && mobOppDefResult?.defenderCard?.element === 'Fogo' && card.silencedRounds === 0)
                  );

                  let mobOppCombatAnimClass = '';
                  if (enableBoardCombatMotion && mobOppAtkResult) {
                    if (tableCombatAnim?.stage === 'striking') {
                      mobOppCombatAnimClass = isMobOppDouble ? 'animate-table-double-lunge-down !z-50' : 'animate-table-lunge-down !z-50';
                    } else if (tableCombatAnim?.stage === 'rebound' && mobOppAtkResult.reboundDamageDealt > 0) {
                      mobOppCombatAnimClass = 'animate-table-defender-hit !z-40';
                    } else if (tableCombatAnim?.stage === 'death' && mobOppAtkResult.attackerDied) {
                      mobOppCombatAnimClass = 'animate-card-death !z-30';
                    } else if (tableCombatAnim?.stage === 'death' && mobOppAtkResult.attackerResurrected) {
                      mobOppCombatAnimClass = mobOppAtkResult.attackerBorPhoenix
                        ? 'animate-bor-phoenix-revive !z-50'
                        : 'animate-ressurreicao-revive !z-50';
                    }
                  } else if (enableBoardCombatMotion && mobOppDefResult) {
                    if (tableCombatAnim?.stage === 'striking') {
                      mobOppCombatAnimClass = 'animate-table-defender-hit !z-40';
                    } else if (tableCombatAnim?.stage === 'rebound' && mobOppDefResult.reboundDamageDealt > 0) {
                      mobOppCombatAnimClass = 'animate-table-rebound-down !z-50';
                    } else if (tableCombatAnim?.stage === 'death' && mobOppDefResult.defenderDied) {
                      mobOppCombatAnimClass = 'animate-card-death !z-30';
                    } else if (tableCombatAnim?.stage === 'death' && mobOppDefResult.defenderResurrected) {
                      mobOppCombatAnimClass = mobOppDefResult.defenderBorPhoenix
                        ? 'animate-bor-phoenix-revive !z-50'
                        : 'animate-ressurreicao-revive !z-50';
                    }
                  }

                  const mobOppReviveClass = !enableBoardCombatMotion
                    ? ''
                    : borPhoenixRevivingUnitIds[card.instanceId]
                    ? 'animate-bor-phoenix-revive !z-50'
                    : resurrectingUnitIds[card.instanceId]
                    ? 'animate-ressurreicao-revive !z-50'
                    : '';

                  return (
                    <div
                      key={card.instanceId}
                      data-unit-instance-id={card.instanceId}
                      className={`relative flex items-center justify-center shrink-0 transition-transform ${mobOppCombatAnimClass} ${mobOppReviveClass}`}
                    >
                      {mobOppDefResult && tableCombatAnim?.stage === 'striking' && mobOppDefResult.attackerDamageDealt > 0 && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-50 font-mono font-black text-[9px] text-white bg-rose-600 border border-rose-200 px-1.5 rounded-full shadow-[0_0_10px_#ef4444] animate-float-damage flex items-center gap-0.5 pointer-events-none whitespace-nowrap">
                          <HeartCrack size={9} /> -{mobOppDefResult.attackerDamageDealt}
                        </div>
                      )}
                      {enableBoardCombatMotion && mobOppDefResult && tableCombatAnim?.stage === 'striking' && (
                        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full border-2 border-amber-300 bg-amber-400/20 animate-lor-impact-sparks" />
                        </div>
                      )}
                      {mobOppAtkResult && tableCombatAnim?.stage === 'rebound' && mobOppAtkResult.reboundDamageDealt > 0 && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-50 font-mono font-black text-[9px] text-cyan-100 bg-sky-700 border border-cyan-300 px-1.5 rounded-full shadow-[0_0_10px_#38bdf8] animate-float-damage flex items-center gap-0.5 pointer-events-none whitespace-nowrap">
                          <Shield size={9} /> -{mobOppAtkResult.reboundDamageDealt}
                        </div>
                      )}
                      {mobOppAtkResult && tableCombatAnim?.stage === 'death' && mobOppAtkResult.attackerDied && !mobOppAtkResult.attackerResurrected && (
                        <div className="absolute inset-0 bg-red-950/90 rounded-xl z-50 flex items-center justify-center border border-red-500 pointer-events-none">
                          <Skull size={18} className="text-red-400" />
                        </div>
                      )}
                      {mobOppDefResult && tableCombatAnim?.stage === 'death' && mobOppDefResult.defenderDied && !mobOppDefResult.defenderResurrected && (
                        <div className="absolute inset-0 bg-red-950/90 rounded-xl z-50 flex items-center justify-center border border-red-500 pointer-events-none">
                          <Skull size={18} className="text-red-400" />
                        </div>
                      )}
                      {tableCombatAnim?.stage === 'death' &&
                        (mobOppAtkResult?.attackerResurrected || mobOppDefResult?.defenderResurrected) &&
                        (mobOppAtkResult?.attackerBorPhoenix || mobOppDefResult?.defenderBorPhoenix ? (
                          <div className="absolute inset-0 bg-gradient-to-t from-red-900/75 via-orange-600/45 to-amber-300/40 rounded-xl z-50 flex items-center justify-center border-2 border-orange-300 pointer-events-none">
                            <Flame size={20} className="text-amber-100" />
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-amber-500/35 rounded-xl z-50 flex items-center justify-center border-2 border-amber-200 pointer-events-none">
                            <Sparkles size={18} className="text-amber-100" />
                          </div>
                        ))}

                      <MobileBattleCard
                        card={card}
                        variant="board"
                        board={opponent.board}
                        votoSilencioActive={votoSilencioActive}
                        hasAliancaAngiris={hasAliancaAngiris(card, opponent.board)}
                        hasOVazioActive={oHasOVazio}
                        hasZykExtraAttack={hasUnitZykExtraAttackAura(card, opponent, 'opponent')}
                        isSelected={isSelectedForAttack}
                        isAssignedDefender={isAssigned}
                        assignedToAttackerName={attackerName}
                        actionLabel={oppCardActionLabel}
                        onInspect={() => setInspectedCard(card)}
                        onClick={() => {
                          if (canOpponentAttack) {
                            if (isTestingArena && turnPlayer !== 'opponent') {
                              setTurnPlayer('opponent');
                            }
                            handleToggleAttackerSelection(card.instanceId);
                          } else if (
                            isDefendingPhase &&
                            activeCombatAttackerRole === 'player' &&
                            isManualBoth &&
                            declaredAttackers.length > 0
                          ) {
                            if (isBlockingAttackerId) {
                              handleRemoveBlocker(isBlockingAttackerId);
                              sound.playDiscard();
                              addLog(`Defesa de ${card.name} removida.`, 'info');
                              return;
                            }
                            if (card.conditions.has('atordoado') || card.conditions.has('dormindo') || card.templateId === 'm_lamina_inverno') {
                              sound.playDiscard();
                              addLog(
                                `🚫 ${card.name} está ${card.conditions.has('atordoado') ? 'Atordoado' : card.conditions.has('dormindo') ? 'Dormindo' : 'imóvel'} e não pode defender!`,
                                'info'
                              );
                              return;
                            }
                            if (assigningBlockForAttacker) {
                              if (assigningBlockForAttacker.conditions.has('etereo') && !card.conditions.has('etereo')) {
                                addLog(`Apenas unidades com ETÉREO podem bloquear atacantes etéreos (${assigningBlockForAttacker.name})!`, 'info');
                                return;
                              }
                              if (assigningBlockForAttacker.conditions.has('furtividade') && !card.conditions.has('furtividade')) {
                                addLog(`Apenas unidades com FURTIVO podem bloquear atacantes furtivos (${assigningBlockForAttacker.name})!`, 'info');
                                return;
                              }
                              handleAssignBlocker(assigningBlockForAttacker.instanceId, card.instanceId);
                              setAssigningBlockForAttacker(null);
                              sound.playDraw();
                              addLog(`🛡️ ${card.name} foi designada para defender ${assigningBlockForAttacker.name}!`, 'defense');
                              return;
                            }
                            const unblocked = declaredAttackers.find((a) => {
                              if (assignedBlocks[a.instanceId]) return false;
                              if (a.conditions.has('etereo') && !card.conditions.has('etereo')) return false;
                              if (a.conditions.has('furtividade') && !card.conditions.has('furtividade')) return false;
                              return true;
                            });
                            if (unblocked) {
                              handleAssignBlocker(unblocked.instanceId, card.instanceId);
                              sound.playDraw();
                              addLog(`🛡️ ${card.name} foi designada para defender ${unblocked.name}!`, 'defense');
                            } else {
                              addLog('Todos os atacantes já estão bloqueados ou requerem Furtividade/Etéreo.', 'info');
                            }
                          } else {
                            setInspectedCard(card);
                          }
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Frontline Divider & Interactive Tactical Confrontation Strip */}
              <div className="w-full flex flex-col items-center justify-center px-1 z-20 shrink-0 my-0.5">
                {pendingSpell && (
                  <div className="w-full max-w-lg px-2.5 py-1 rounded-xl bg-amber-950/95 border border-amber-400 text-stone-100 flex items-center justify-between gap-2 text-[10px] shadow-md">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Sparkles size={11} className="text-amber-400 shrink-0" />
                      <span className="font-bold truncate">
                        ⚡ {pendingSpell.spellCard.name} — Aguardando Resposta
                      </span>
                    </div>
                    {(pendingSpell.casterId === 'opponent' || isTestingArena) && (
                      <button
                        type="button"
                        onClick={() => handlePassTurn(false)}
                        className="px-2.5 py-0.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 font-serif font-black text-[9px] uppercase tracking-wider shrink-0 cursor-pointer"
                      >
                        Resolver
                      </button>
                    )}
                  </div>
                )}

                {tableCombatAnim && (
                  <div className="w-full max-w-lg mx-auto py-1 px-2.5 rounded-full bg-stone-950/95 border border-amber-400/75 shadow-[0_0_16px_rgba(245,158,11,0.35)] flex items-center justify-between text-[10px] font-mono font-bold z-30">
                    <div className="flex items-center gap-1.5">
                      <Swords size={11} className="text-amber-400" />
                      <span className="font-serif font-black text-amber-200 uppercase text-[9px]">
                        Combate
                      </span>
                      <span className="text-[8.5px] px-1.5 py-0.2 rounded-full bg-amber-950/70 border border-amber-400/45 text-amber-300">
                        {tableCombatAnim.stage === 'striking'
                          ? '💥 Golpes'
                          : tableCombatAnim.stage === 'rebound'
                          ? '🛡️ Rebote'
                          : '☠️ Baixas'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={finishTableCombat}
                      className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-serif font-black text-[9px] uppercase cursor-pointer"
                    >
                      <FastForward size={9} />
                      <span>Pular</span>
                    </button>
                  </div>
                )}

                {isDefendingPhase && declaredAttackers.length > 0 && !tableCombatAnim && (
                  <div className="w-full max-w-xl px-2 py-1 rounded-xl bg-rose-950/95 border border-rose-400/80 text-[9px] flex items-center justify-between gap-2 shadow-lg">
                    <span className="font-serif font-black text-rose-200 shrink-0 whitespace-nowrap">
                      🛡️ {assigningBlockForAttacker ? `Alvo: ${assigningBlockForAttacker.name}` : 'Toque num atacante:'}
                    </span>
                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                      {declaredAttackers.map((atk) => {
                        const blockedByDefId = assignedBlocks[atk.instanceId];
                        const defCard = (activeCombatAttackerRole === 'player' ? opponent.board : player.board).find(
                          (c) => c.instanceId === blockedByDefId
                        );
                        const isPickedTarget = assigningBlockForAttacker?.instanceId === atk.instanceId;
                        return (
                          <button
                            key={atk.instanceId}
                            type="button"
                            onClick={() => {
                              sound.playTick();
                              setAssigningBlockForAttacker(isPickedTarget ? null : atk);
                            }}
                            className={`px-2 py-0.5 rounded-lg border whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                              isPickedTarget
                                ? 'border-amber-300 bg-amber-500/30 text-amber-100 ring-1 ring-amber-300'
                                : defCard
                                ? 'border-cyan-400/60 bg-cyan-950/75 text-cyan-200'
                                : 'border-rose-400/70 bg-black/70 text-rose-200 hover:border-amber-300'
                            }`}
                            title="Toque para escolher quem bloqueará este atacante"
                          >
                            <span className="font-bold text-amber-200">{atk.name}</span>
                            <span className="text-stone-400">→</span>
                            <span className={defCard ? 'text-cyan-300 font-black' : 'text-rose-300 font-black'}>
                              {defCard ? defCard.name : 'Direto'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!pendingSpell && !tableCombatAnim && !(isDefendingPhase && declaredAttackers.length > 0) && (
                  <div className="w-full flex items-center justify-center gap-2 px-2">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-400/45 to-cyan-400/50" />
                    <span className="px-2 py-0.5 rounded-full bg-stone-950/85 border border-amber-500/30 text-[8.5px] font-serif font-bold text-amber-200/90 tracking-wide whitespace-nowrap">
                      {selectedAttackerIds.length > 0
                        ? `⚔️ ${selectedAttackerIds.length} atacante(s) pronto(s) — Toque em ATACAR`
                        : isPlayerTurn
                        ? isPlayerAttackerRole && !hasAttackedThisRound && player.board.length > 0
                          ? '⚔️ Toque aliados para atacar · Arraste ou toque cartas na mão'
                          : '✨ Sua vez · Arraste ou toque uma carta para ver/jogar'
                        : `🌙 Aguardando turno de ${opponent.name}...`}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-l from-transparent via-amber-400/45 to-cyan-400/50" />
                  </div>
                )}
              </div>

              {/* Player Unit Row (Native Crisp MobileBattleCard) */}
              <div
                data-tutorial-target="player-board"
                className="w-full flex items-center justify-center gap-1.5 sm:gap-2 shrink-0 overflow-x-auto scrollbar-none py-0.5"
              >
                {Array.from({ length: Math.max(player.board.length, player.maxBoardSlots ?? 5) }).map((_, slotIdx) => {
                  const card = player.board[slotIdx];
                  if (!card) {
                    return (
                      <div
                        key={`mob-ply-empty-${slotIdx}`}
                        className="w-[66px] h-[94px] sm:w-[78px] sm:h-[110px] rounded-xl border border-dashed border-cyan-400/25 bg-cyan-950/15 flex flex-col items-center justify-center pointer-events-none shrink-0"
                      >
                        <span className="text-sm font-mono text-amber-300/30">ᚠ</span>
                        <span className="text-[7px] font-serif uppercase tracking-widest text-amber-300/35 mt-0.5">
                          Slot {slotIdx + 1}
                        </span>
                      </div>
                    );
                  }

                  const isSelectedForAttack = selectedAttackerIds.includes(card.instanceId);
                  const isBlockingAttackerId = Object.entries(assignedBlocks).find(
                    ([_, defId]) => defId === card.instanceId
                  )?.[0];
                  const blockingTargetName = isBlockingAttackerId
                    ? declaredAttackers.find((a) => a.instanceId === isBlockingAttackerId)?.name
                    : undefined;
                  const isAssigned = Boolean(isBlockingAttackerId);
                  const canAttack =
                    !pendingSpell &&
                    isPlayerTurn &&
                    ((isPlayerAttackerRole &&
                      (!hasAttackedThisRound || (Boolean(player.extraAttackRound) && !player.secondAttackDone))) ||
                      Boolean(player.canAttackOnDefense)) &&
                    !card.conditions.has('atordoado') &&
                    !card.conditions.has('dormindo') &&
                    card.templateId !== 'm_lamina_inverno' &&
                    card.templateId !== 'n_pedrinha';

                  const canDefend =
                    isDefendingPhase &&
                    activeCombatAttackerRole === 'opponent' &&
                    !card.conditions.has('atordoado') &&
                    !card.conditions.has('dormindo') &&
                    card.templateId !== 'm_lamina_inverno';

                  let cardActionLabel: string | undefined = undefined;
                  if (canAttack) {
                    cardActionLabel = isSelectedForAttack ? 'Remover' : 'Atacar';
                  } else if (isDefendingPhase && activeCombatAttackerRole === 'opponent' && (isAssigned || canDefend)) {
                    cardActionLabel = isAssigned ? 'Remover' : (assigningBlockForAttacker ? 'Bloquear' : 'Defender');
                  }

                  const mobPlyAtkResult = tableCombatAnim?.results.find((r) => r.attackerCard?.instanceId === card.instanceId);
                  const mobPlyDefResult = tableCombatAnim?.results.find((r) => r.defenderCard?.instanceId === card.instanceId);
                  const isMobPlyDouble = Boolean(
                    card.conditions?.has('ataque_duplo') ||
                      card.hasDoubleAttack ||
                      (card.templateId === 'm_moira' && card.silencedRounds === 0) ||
                      (card.templateId === 'm_jasmim' && mobPlyDefResult?.defenderCard?.element === 'Fogo' && card.silencedRounds === 0)
                  );

                  let mobPlyCombatAnimClass = '';
                  if (enableBoardCombatMotion && mobPlyAtkResult) {
                    if (tableCombatAnim?.stage === 'striking') {
                      mobPlyCombatAnimClass = isMobPlyDouble ? 'animate-table-double-lunge-up !z-50' : 'animate-table-lunge-up !z-50';
                    } else if (tableCombatAnim?.stage === 'rebound' && mobPlyAtkResult.reboundDamageDealt > 0) {
                      mobPlyCombatAnimClass = 'animate-table-defender-hit !z-40';
                    } else if (tableCombatAnim?.stage === 'death' && mobPlyAtkResult.attackerDied) {
                      mobPlyCombatAnimClass = 'animate-card-death !z-30';
                    } else if (tableCombatAnim?.stage === 'death' && mobPlyAtkResult.attackerResurrected) {
                      mobPlyCombatAnimClass = mobPlyAtkResult.attackerBorPhoenix
                        ? 'animate-bor-phoenix-revive !z-50'
                        : 'animate-ressurreicao-revive !z-50';
                    }
                  } else if (enableBoardCombatMotion && mobPlyDefResult) {
                    if (tableCombatAnim?.stage === 'striking') {
                      mobPlyCombatAnimClass = 'animate-table-defender-hit !z-40';
                    } else if (tableCombatAnim?.stage === 'rebound' && mobPlyDefResult.reboundDamageDealt > 0) {
                      mobPlyCombatAnimClass = 'animate-table-rebound-up !z-50';
                    } else if (tableCombatAnim?.stage === 'death' && mobPlyDefResult.defenderDied) {
                      mobPlyCombatAnimClass = 'animate-card-death !z-30';
                    } else if (tableCombatAnim?.stage === 'death' && mobPlyDefResult.defenderResurrected) {
                      mobPlyCombatAnimClass = mobPlyDefResult.defenderBorPhoenix
                        ? 'animate-bor-phoenix-revive !z-50'
                        : 'animate-ressurreicao-revive !z-50';
                    }
                  }

                  const mobPlyReviveClass = !enableBoardCombatMotion
                    ? ''
                    : borPhoenixRevivingUnitIds[card.instanceId]
                    ? 'animate-bor-phoenix-revive !z-50'
                    : resurrectingUnitIds[card.instanceId]
                    ? 'animate-ressurreicao-revive !z-50'
                    : '';

                  return (
                    <div
                      key={card.instanceId}
                      data-unit-instance-id={card.instanceId}
                      className={`flex items-center justify-center shrink-0 relative transition-transform ${mobPlyCombatAnimClass} ${mobPlyReviveClass}`}
                    >
                      {mobPlyDefResult && tableCombatAnim?.stage === 'striking' && mobPlyDefResult.attackerDamageDealt > 0 && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-50 font-mono font-black text-[9px] text-white bg-rose-600 border border-rose-200 px-1.5 rounded-full shadow-[0_0_10px_#ef4444] animate-float-damage flex items-center gap-0.5 pointer-events-none whitespace-nowrap">
                          <HeartCrack size={9} /> -{mobPlyDefResult.attackerDamageDealt}
                        </div>
                      )}
                      {enableBoardCombatMotion && mobPlyDefResult && tableCombatAnim?.stage === 'striking' && (
                        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full border-2 border-amber-300 bg-amber-400/20 animate-lor-impact-sparks" />
                        </div>
                      )}
                      {mobPlyAtkResult && tableCombatAnim?.stage === 'rebound' && mobPlyAtkResult.reboundDamageDealt > 0 && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-50 font-mono font-black text-[9px] text-cyan-100 bg-sky-700 border border-cyan-300 px-1.5 rounded-full shadow-[0_0_10px_#38bdf8] animate-float-damage flex items-center gap-0.5 pointer-events-none whitespace-nowrap">
                          <Shield size={9} /> -{mobPlyAtkResult.reboundDamageDealt}
                        </div>
                      )}
                      {mobPlyAtkResult && tableCombatAnim?.stage === 'death' && mobPlyAtkResult.attackerDied && !mobPlyAtkResult.attackerResurrected && (
                        <div className="absolute inset-0 bg-red-950/90 rounded-xl z-50 flex items-center justify-center border border-red-500 pointer-events-none">
                          <Skull size={18} className="text-red-400" />
                        </div>
                      )}
                      {mobPlyDefResult && tableCombatAnim?.stage === 'death' && mobPlyDefResult.defenderDied && !mobPlyDefResult.defenderResurrected && (
                        <div className="absolute inset-0 bg-red-950/90 rounded-xl z-50 flex items-center justify-center border border-red-500 pointer-events-none">
                          <Skull size={18} className="text-red-400" />
                        </div>
                      )}
                      {tableCombatAnim?.stage === 'death' &&
                        (mobPlyAtkResult?.attackerResurrected || mobPlyDefResult?.defenderResurrected) &&
                        (mobPlyAtkResult?.attackerBorPhoenix || mobPlyDefResult?.defenderBorPhoenix ? (
                          <div className="absolute inset-0 bg-gradient-to-t from-red-900/75 via-orange-600/45 to-amber-300/40 rounded-xl z-50 flex items-center justify-center border-2 border-orange-300 pointer-events-none">
                            <Flame size={20} className="text-amber-100" />
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-amber-500/35 rounded-xl z-50 flex items-center justify-center border-2 border-amber-200 pointer-events-none">
                            <Sparkles size={18} className="text-amber-100" />
                          </div>
                        ))}

                      <MobileBattleCard
                        card={card}
                        variant="board"
                        board={player.board}
                        votoSilencioActive={votoSilencioActive}
                        isSelected={isSelectedForAttack}
                        isAssignedDefender={isAssigned}
                        assignedToAttackerName={blockingTargetName}
                        hasAliancaAngiris={hasAliancaAngiris(card, player.board)}
                        hasOVazioActive={pHasOVazio}
                        hasZykExtraAttack={hasUnitZykExtraAttackAura(card, player, 'player')}
                        actionLabel={cardActionLabel}
                        onInspect={() => setInspectedCard(card)}
                        onClick={() => {
                          if (canAttack) {
                            handleToggleAttackerSelection(card.instanceId);
                          } else if (isDefendingPhase && activeCombatAttackerRole === 'opponent' && declaredAttackers.length > 0) {
                            if (isBlockingAttackerId) {
                              handleRemoveBlocker(isBlockingAttackerId);
                              sound.playDiscard();
                              return;
                            }
                            if (card.conditions.has('atordoado') || card.conditions.has('dormindo') || card.templateId === 'm_lamina_inverno') {
                              sound.playDiscard();
                              addLog(
                                `🚫 ${card.name} está ${card.conditions.has('atordoado') ? 'Atordoado' : card.conditions.has('dormindo') ? 'Dormindo' : 'imóvel'} e não pode defender!`,
                                'info'
                              );
                              return;
                            }
                            if (assigningBlockForAttacker) {
                              if (assigningBlockForAttacker.conditions.has('etereo') && !card.conditions.has('etereo')) {
                                addLog(`Apenas unidades com ETÉREO podem bloquear atacantes etéreos (${assigningBlockForAttacker.name})!`, 'info');
                                return;
                              }
                              if (assigningBlockForAttacker.conditions.has('furtividade') && !card.conditions.has('furtividade')) {
                                addLog(`Apenas unidades com FURTIVO podem bloquear atacantes furtivos (${assigningBlockForAttacker.name})!`, 'info');
                                return;
                              }
                              handleAssignBlocker(assigningBlockForAttacker.instanceId, card.instanceId);
                              setAssigningBlockForAttacker(null);
                              sound.playDraw();
                              return;
                            }
                            const unblocked = declaredAttackers.find((a) => {
                              if (assignedBlocks[a.instanceId]) return false;
                              if (a.conditions.has('etereo') && !card.conditions.has('etereo')) return false;
                              if (a.conditions.has('furtividade') && !card.conditions.has('furtividade')) return false;
                              return true;
                            });
                            if (unblocked) {
                              handleAssignBlocker(unblocked.instanceId, card.instanceId);
                              sound.playDraw();
                            }
                          } else {
                            setInspectedCard(card);
                          }
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Scrollable Active Hand Dock (Native Crisp MobileBattleCard + Drag-to-Summon + Tap-to-Inspect/Play) */}
            <div
              className={`w-full shrink-0 flex flex-col bg-stone-950/90 border rounded-2xl overflow-hidden shadow-lg ${
                activeMobileHandOwnerId === 'opponent' ? 'border-purple-400/45' : 'border-amber-500/35'
              }`}
            >
              <div className="w-full px-2 py-0.5 bg-black/55 border-b border-white/5 flex items-center justify-between text-[8px]">
                <span className="font-serif font-bold text-amber-200/95 uppercase tracking-wider">
                  {isManualBoth
                    ? `${activeMobileHandOwnerId === 'player' ? 'P1' : 'P2'} · Mão de ${activeMobileHandOwner.name}`
                    : 'Sua Mão'}{' '}
                  <span className="font-mono text-amber-300 tabular-nums">({activeMobileHandOwner.hand.length}/8)</span>
                </span>
                <span className="text-stone-400 font-medium hidden xs:inline">
                  Toque p/ detalhes/jogar · Arraste p/ mesa
                </span>
              </div>

              <div
                data-hand-zone={activeMobileHandOwnerId}
                style={{ touchAction: mobileDragCard?.isDragging ? 'none' : 'pan-x' }}
                className="w-full h-[100px] sm:h-[112px] flex items-center gap-1.5 overflow-x-auto overflow-y-hidden px-1.5 py-1 scrollbar-thin"
              >
                {activeMobileHandOwner.hand.length === 0 ? (
                  <div className="w-full text-center text-[10px] font-serif text-stone-500">
                    Mão vazia — Compre uma carta no Grimório à esquerda
                  </div>
                ) : (
                  activeMobileHandOwner.hand.map((card) => {
                    const isActiveOwnersTurn = turnPlayer === activeMobileHandOwnerId;
                    const isTierAllowed = isTestingArena || isTierAllowedInRound(card.tier, round, card);
                    const hasCraff = activeMobileHandOwner.board.some(
                      (c) => (c.templateId === 'g_craff' || c.name.toLowerCase().includes('craff')) && c.hp > 0 && c.silencedRounds === 0
                    );
                    const maxAllowedSummons = hasCraff ? 3 : 2;
                    const isSummonsMaxed = !isTestingArena && card.type === 'unit' && activeMobileHandOwner.summonsThisRound >= maxAllowedSummons;
                    const isAtormentadorPiece = card.templateId === 'm_tor' || card.templateId === 'm_men' || card.templateId === 'm_tador';
                    const isAtormentadorBlocked = isAtormentadorPiece && Boolean(activeMobileHandOwner.atormentadorPieceSummonedThisRound);
                    const isOSolCard = card.templateId === 'n_o_sol' || card.name.trim().toLowerCase().startsWith('o sol');
                    const hasHelioLvl2OnBoard = activeMobileHandOwner.board.some(
                      (c) => (c.templateId === 'n_helio' || c.name.toLowerCase().includes('helio') || c.name.toLowerCase().includes('hélio')) && c.level === 2 && c.hp > 0 && c.silencedRounds === 0
                    );
                    const isOSolBlocked = isOSolCard && !hasHelioLvl2OnBoard;
                    const isALuaCard = card.templateId === 'g_a_lua' || card.name.trim().toLowerCase().startsWith('a lua');
                    const hasLunarioLvl2OnBoard = activeMobileHandOwner.board.some(
                      (c) => (c.templateId === 'g_lunario' || c.name.toLowerCase().includes('lunario')) && c.level === 2 && c.hp > 0 && c.silencedRounds === 0
                    );
                    const isALuaBlocked = isALuaCard && !hasLunarioLvl2OnBoard;
                    const isZykCard = card.templateId === 'g_zyk' || card.name.toLowerCase().includes('zyk');
                    const zykCandidatesCount =
                      activeMobileHandOwner.hand.filter((c) => c.instanceId !== card.instanceId).length + activeMobileHandOwner.board.length;
                    const isZykBlocked = isZykCard && zykCandidatesCount < 2;
                    const isBlockedByCounterWindow =
                      Boolean(pendingSpell) && (card.type === 'unit' || (card.speed !== 'rapida' && !card.isFugaz));
                    const isVetoWithoutPending = !isTestingArena && !pendingSpell && card.templateId === 'n_veto_do_indomito';

                    const isPlayable =
                      !isDefendingPhase &&
                      (isActiveOwnersTurn || isTestingArena) &&
                      isTierAllowed &&
                      !isSummonsMaxed &&
                      !isAtormentadorBlocked &&
                      !isOSolBlocked &&
                      !isALuaBlocked &&
                      !isZykBlocked &&
                      !isBlockedByCounterWindow &&
                      !isVetoWithoutPending;

                    let unplayableReason: string | undefined = undefined;
                    if (isDefendingPhase) unplayableReason = 'Fase de Defesa: Selecione defensores na mesa';
                    else if (!isActiveOwnersTurn && !isTestingArena) unplayableReason = `Aguarde o turno de ${activeMobileHandOwner.name}`;
                    else if (isBlockedByCounterWindow)
                      unplayableReason = 'Contra-Resposta: Apenas Habilidades Rápidas ou Fugazes';
                    else if (isVetoWithoutPending)
                      unplayableReason = 'Veto só pode ser usado na Contra-Resposta';
                    else if (isOSolBlocked) unplayableReason = 'Requer Hélio Nível 2 na mesa';
                    else if (isALuaBlocked) unplayableReason = 'Requer Lunário Nível 2 na mesa';
                    else if (isZykBlocked) unplayableReason = 'Requer 2 cartas aliadas para sacrifício';
                    else if (!isTierAllowed) unplayableReason = `Requer rodada maior para Tier ${card.tier}`;
                    else if (isSummonsMaxed) unplayableReason = `Limite de ${maxAllowedSummons} invocações atingido`;
                    else if (isAtormentadorBlocked) unplayableReason = 'Apenas 1 peça por rodada';

                    const isBeingDragged =
                      Boolean(mobileDragCard?.isDragging && mobileDragCard.card.instanceId === card.instanceId);

                    return (
                      <div
                        key={card.instanceId}
                        onPointerDown={(e) => {
                          if (e.button !== 0 && e.pointerType === 'mouse') return;
                          if ((e.target as HTMLElement)?.closest('button')) return;
                          setMobileDragCard({
                            card,
                            ownerId: activeMobileHandOwnerId,
                            isPlayable,
                            unplayableReason,
                            pointerId: e.pointerId,
                            startX: e.clientX,
                            startY: e.clientY,
                            currentX: e.clientX,
                            currentY: e.clientY,
                            isDragging: false,
                            isOverTable: false,
                          });
                        }}
                        style={{ touchAction: 'pan-x' }}
                        className={`relative shrink-0 transition-opacity ${
                          isBeingDragged ? 'opacity-35 scale-90' : ''
                        }`}
                      >
                        <MobileBattleCard
                          card={card}
                          variant="hand"
                          board={activeMobileHandOwner.board}
                          votoSilencioActive={votoSilencioActive}
                          isPlayable={isPlayable}
                          unplayableReason={unplayableReason}
                          hasAliancaAngiris={hasAliancaAngiris(card, activeMobileHandOwner.board)}
                          hasOVazioActive={activeMobileHandOwnerId === 'player' ? pHasOVazio : oHasOVazio}
                          onClick={() => {
                            if (!mobileDragSkipClickRef.current) setInspectedCard(card);
                          }}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* RIGHT WING: Segmented HP Bars, Timer, Nexus Orb & Summons      */}
          {/* ============================================================== */}
          <div className="w-[112px] sm:w-[128px] shrink-0 h-full flex flex-col justify-between items-center py-1 px-1.5 rounded-2xl bg-gradient-to-b from-[#130e26]/95 via-[#090714]/95 to-[#130e26]/95 border border-amber-500/30 shadow-[0_0_24px_rgba(0,0,0,0.75)]">
            {/* Top: Opponent Sovereign HP (Segmented + Fairy/Mipo Extra Slots) + Turn Clock */}
            <div className="w-full flex flex-col items-center gap-1">
              <div
                data-hp-bar="opponent"
                className={`relative w-full px-1.5 py-1.5 rounded-xl bg-black/65 border flex flex-col gap-1 transition-all ${
                  finishingCannonAnim?.active && finishingCannonAnim.victor === 'player'
                    ? finishingCannonAnim.stage === 'impact'
                      ? 'border-white bg-gradient-to-r from-amber-300 via-rose-500 to-white animate-hp-shatter'
                      : finishingCannonAnim.stage === 'firing'
                      ? 'border-amber-200 bg-rose-950/90 animate-hp-critical-shake'
                      : 'border-amber-400 bg-rose-950/80 animate-hp-vibrate'
                    : 'border-purple-500/45'
                }`}
              >
                {tableCombatAnim?.stage === 'striking' && tableCombatAnim.directDamageTotal > 0 && tableCombatAnim.attackerRole === 'player' && (
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-50 font-mono font-black text-[9px] text-white bg-rose-600 border border-rose-200 px-1.5 rounded-full shadow-[0_0_10px_#ef4444] animate-float-damage whitespace-nowrap flex items-center gap-0.5 pointer-events-none">
                    <HeartCrack size={9} /> -{tableCombatAnim.directDamageTotal}
                  </div>
                )}
                <div className="w-full flex items-center justify-between gap-1">
                  <span className="text-[8.5px] font-serif font-black text-purple-100 truncate">
                    {opponent.name}
                  </span>
                  <span
                    className={`px-1 py-[1px] rounded text-[7px] font-serif font-black uppercase shrink-0 ${
                      attackerRole === 'opponent'
                        ? 'bg-rose-600/80 text-white'
                        : 'bg-sky-700/80 text-cyan-100'
                    }`}
                  >
                    {attackerRole === 'opponent' ? '⚔️ATQ' : '🛡️DEF'}
                  </span>
                </div>
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Heart size={11} className="text-rose-500 fill-rose-500 shrink-0" />
                    <span className="text-[8px] uppercase text-stone-400 font-bold">Vida</span>
                  </div>
                  <span className="font-mono text-[11px] font-black text-amber-300 tabular-nums leading-none">
                    {opponent.hp}/{opponent.maxHp}
                  </span>
                </div>
                {renderMobileSegmentedHp(opponent, 'opponent')}
              </div>

              {!isTestingArena && (
                <div className="w-full px-1.5 py-1 rounded-lg bg-stone-950/90 border border-white/10 flex flex-col gap-0.5">
                  <div className="w-full flex items-center justify-between text-[8.5px] font-mono font-bold text-amber-300">
                    <span className="truncate">
                      {isPlayerTurn ? '☀️ Sua Vez' : '🌙 Rival'}
                    </span>
                    <span className={`tabular-nums ${turnTimeLeft <= 5 ? 'text-rose-400 font-black' : ''}`}>
                      {`${turnTimeLeft}s`}
                    </span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-stone-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        turnTimeLeft <= 5
                          ? 'bg-rose-500'
                          : isPlayerTurn
                          ? 'bg-emerald-400'
                          : 'bg-amber-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, (turnTimeLeft / 30) * 100))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Center: Right-Thumb Nexus Action Orb (>= 44px touch target) */}
            <div
              data-tutorial-target="action-orb"
              className="flex flex-col items-center justify-center gap-1 my-auto"
            >
              {(() => {
                const canDeclareAttackNow =
                  !isAttackTransitioning &&
                  !isDefendingPhase &&
                  (((attackerRole === 'player' || Boolean(player.canAttackOnDefense)) &&
                    (turnPlayer === 'player' || isTestingArena)) ||
                    ((attackerRole === 'opponent' || Boolean(opponent.canAttackOnDefense)) &&
                      (turnPlayer === 'opponent' || isTestingArena) &&
                      isManualBoth)) &&
                  selectedAttackerIds.length > 0;

                const isPassTurnDisabled =
                  isAttackTransitioning ||
                  isDefendingPhase ||
                  Boolean(assigningBlockForAttacker) ||
                  Boolean(enfrentarModal) ||
                  Boolean(combatResults) ||
                  Boolean(gameOverWinner) ||
                  selectedAttackerIds.length > 0 ||
                  (!isManualBoth && !isPlayerTurn && !(isOnlinePvp && pendingSpell && pendingSpell.casterId === 'opponent'));

                const pulseIfFull = ambientAnimations && animationMode === 'full' ? 'animate-pulse' : '';

                if (isDefendingPhase) {
                  const canLocalDefend = !isOnlinePvp || activeCombatAttackerRole === 'opponent';
                  return (
                    <button
                      type="button"
                      onClick={handleConfirmDefense}
                      disabled={!canLocalDefend}
                      className={`w-[66px] h-[66px] sm:w-[76px] sm:h-[76px] rounded-full font-serif font-black text-[9.5px] uppercase tracking-wide flex flex-col items-center justify-center p-1 border-2 transition-all active:scale-95 ${
                        canLocalDefend
                          ? `bg-gradient-to-b from-emerald-400 via-teal-600 to-emerald-800 text-stone-950 border-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.75)] cursor-pointer ${pulseIfFull}`
                          : 'bg-stone-900 text-stone-500 border-stone-700 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <Shield size={17} className="mb-0.5" />
                      <span className="leading-tight text-center">{canLocalDefend ? 'DEFENDER' : 'RIVAL DEF.'}</span>
                    </button>
                  );
                }

                if (canDeclareAttackNow) {
                  return (
                    <button
                      type="button"
                      onClick={handleConfirmAttack}
                      className={`w-[66px] h-[66px] sm:w-[76px] sm:h-[76px] rounded-full font-serif font-black text-[9.5px] uppercase tracking-wide flex flex-col items-center justify-center p-1 bg-gradient-to-b from-rose-400 via-red-600 to-rose-900 text-white border-2 border-amber-200 shadow-[0_0_20px_rgba(244,63,94,0.75)] cursor-pointer active:scale-95 ${pulseIfFull}`}
                    >
                      <Swords size={17} className="mb-0.5" />
                      <span className="leading-tight text-center">ATACAR ({selectedAttackerIds.length})</span>
                    </button>
                  );
                }

                return (
                  <button
                    type="button"
                    onClick={() => handlePassTurn(false)}
                    disabled={isPassTurnDisabled}
                    className={`w-[66px] h-[66px] sm:w-[76px] sm:h-[76px] rounded-full font-serif font-black text-[9.5px] uppercase tracking-wide flex flex-col items-center justify-center p-1 border-2 transition-all active:scale-95 ${
                      !isPassTurnDisabled
                        ? pendingSpell
                          ? `bg-gradient-to-b from-amber-300 via-orange-500 to-amber-700 text-stone-950 border-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.7)] cursor-pointer ${pulseIfFull}`
                          : willPassEndRound
                          ? 'bg-gradient-to-b from-amber-400 via-rose-600 to-rose-900 text-white border-amber-200 shadow-[0_0_20px_rgba(244,63,94,0.7)] cursor-pointer'
                          : 'bg-gradient-to-b from-cyan-300 via-blue-600 to-indigo-800 text-white border-cyan-100 shadow-[0_0_18px_rgba(56,189,248,0.65)] cursor-pointer'
                        : 'bg-stone-900 text-stone-500 border-stone-800 opacity-55 cursor-not-allowed'
                    }`}
                    title={
                      isPassTurnDisabled
                        ? 'Aguarde sua vez...'
                        : pendingSpell
                        ? 'Passar resposta e deixar a Habilidade resolver'
                        : willPassEndRound
                        ? 'Atenção: passar a vez agora encerrará a rodada atual!'
                        : 'Passar a vez para o outro duelista'
                    }
                  >
                    <Compass size={16} className="mb-0.5" />
                    <span className="leading-tight text-center">
                      {pendingSpell
                        ? 'RESOLVER'
                        : isPlayerTurn || isManualBoth
                        ? willPassEndRound
                          ? 'PASSAR (FIM)'
                          : 'PASSAR'
                        : 'AGUARDE'}
                    </span>
                  </button>
                );
              })()}

              {isTestingArena && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playDraw();
                    setIsTestingDrawerOpen(true);
                  }}
                  className="w-full py-1 px-1.5 rounded-lg bg-stone-900/95 hover:bg-stone-800 border border-amber-500/45 text-amber-200 font-serif font-bold text-[8.5px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer shadow"
                  title="Abrir Grimório da Arena de Testes"
                >
                  <FlaskConical size={10} className="text-amber-400 shrink-0" />
                  <span>Grimório</span>
                </button>
              )}
            </div>

            {/* Bottom: Summon Gems + Fraction + Coin + Player Sovereign HP */}
            <div className="w-full flex flex-col items-center gap-1">
              <div className="w-full flex items-center justify-between gap-1">
                {(() => {
                  const hasCraff = activeMobileHandOwner.board.some(
                    (c) => (c.templateId === 'g_craff' || c.name.toLowerCase().includes('craff')) && c.hp > 0 && c.silencedRounds === 0
                  );
                  const maxSummons = hasCraff ? 3 : 2;
                  const availableSummons = Math.max(0, maxSummons - activeMobileHandOwner.summonsThisRound);
                  return (
                    <div
                      className="flex-1 flex items-center justify-between gap-1 px-1.5 py-1 rounded-lg bg-stone-950/90 border border-cyan-500/40"
                      title={`Invocações restantes nesta rodada: ${availableSummons} de ${maxSummons}`}
                    >
                      <div className="flex items-center gap-1">
                        {Array.from({ length: maxSummons }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rotate-45 rounded-xs border ${
                              i < availableSummons ? 'bg-cyan-400 border-white shadow-[0_0_5px_#38bdf8]' : 'bg-stone-800 border-stone-600'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[9px] font-mono font-black text-cyan-200 tabular-nums leading-none">
                        {availableSummons}/{maxSummons}
                      </span>
                    </div>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => {
                    if (isCoinBadgeSpinning) return;
                    sound.playTick();
                    setIsCoinBadgeSpinning(true);
                    setTimeout(() => setIsCoinBadgeSpinning(false), 750);
                  }}
                  className={`w-6 h-6 shrink-0 rounded-full border flex items-center justify-center cursor-pointer transition-transform duration-700 ${
                    isCoinBadgeSpinning && ambientAnimations && animationMode === 'full' ? '[transform:rotateY(720deg)]' : ''
                  } ${
                    playerCoinSide === 'sol'
                      ? 'border-amber-300 bg-amber-500 text-stone-950'
                      : 'border-blue-300 bg-blue-600 text-white'
                  }`}
                  title="Moeda do Duelista"
                >
                  {playerCoinSide === 'sol' ? <Sun size={11} /> : <Moon size={11} />}
                </button>
              </div>

              <div
                data-hp-bar="player"
                className={`relative w-full px-1.5 py-1.5 rounded-xl bg-black/65 border flex flex-col gap-1 transition-all ${
                  finishingCannonAnim?.active && finishingCannonAnim.victor === 'opponent'
                    ? finishingCannonAnim.stage === 'impact'
                      ? 'border-white bg-gradient-to-r from-amber-300 via-rose-500 to-white animate-hp-shatter'
                      : finishingCannonAnim.stage === 'firing'
                      ? 'border-amber-200 bg-rose-950/90 animate-hp-critical-shake'
                      : 'border-amber-400 bg-rose-950/80 animate-hp-vibrate'
                    : 'border-amber-500/45'
                }`}
              >
                {tableCombatAnim?.stage === 'striking' && tableCombatAnim.directDamageTotal > 0 && tableCombatAnim.attackerRole === 'opponent' && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-50 font-mono font-black text-[9px] text-white bg-rose-600 border border-rose-200 px-1.5 rounded-full shadow-[0_0_10px_#ef4444] animate-float-damage whitespace-nowrap flex items-center gap-0.5 pointer-events-none">
                    <HeartCrack size={9} /> -{tableCombatAnim.directDamageTotal}
                  </div>
                )}
                <div className="w-full flex items-center justify-between gap-1">
                  <span className="text-[8.5px] font-serif font-black text-amber-200 truncate">
                    {player.name}
                  </span>
                  <span
                    className={`px-1 py-[1px] rounded text-[7px] font-serif font-black uppercase shrink-0 ${
                      attackerRole === 'player'
                        ? 'bg-rose-600/80 text-white'
                        : 'bg-sky-700/80 text-cyan-100'
                    }`}
                  >
                    {attackerRole === 'player' ? '⚔️ATQ' : '🛡️DEF'}
                  </span>
                </div>
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Heart size={11} className="text-rose-500 fill-rose-500 shrink-0" />
                    <span className="text-[8px] uppercase text-stone-400 font-bold">Vida</span>
                  </div>
                  <span className="font-mono text-[11px] font-black text-amber-300 tabular-nums leading-none">
                    {player.hp}/{player.maxHp}
                  </span>
                </div>
                {renderMobileSegmentedHp(player, 'player')}
              </div>
            </div>
          </div>
        </div>
        );
      })() : (
        <div className="relative z-10 flex-1 flex w-full h-[calc(100dvh-44px)] overflow-hidden px-2.5 py-1.5 gap-2.5">

        {/* ================================================================== */}
        {/* LEFT TACTICAL WING: 3D STACKED DECKS & GRAVEYARD VORTEX SANCTUARY  */}
        {/* ================================================================== */}
        <div className="w-40 lg:w-48 shrink-0 flex flex-col justify-between items-center py-2 px-2 rounded-2xl bg-gradient-to-b from-[#120d24]/85 via-[#090714]/90 to-[#120d24]/85 border border-amber-500/25 shadow-[0_0_35px_rgba(0,0,0,0.75)] backdrop-blur-md relative overflow-hidden">
          {/* Subtle ornamental gold line */}
          <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
          <div className="absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

          {/* TOP-LEFT: OPPONENT 3D DECK & GRAVEYARD */}
          <div className="w-full flex flex-col items-center gap-2">
            <div className="w-full flex items-center justify-between px-1">
              <span className="text-[10px] font-serif font-bold uppercase tracking-widest text-purple-300/90">
                Grimório Inimigo
              </span>
              <span className="text-[10px] font-mono font-bold text-stone-400 tabular-nums">
                {opponent.deck.length}c
              </span>
            </div>

            <div className="w-full flex items-center justify-center gap-2.5">
              {/* Opponent 3D Deck Stack */}
              <div className="relative group flex flex-col items-center">
                {/* 3D Stack Depth Layers */}
                <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-xl bg-stone-900 border border-purple-500/30" />
                <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 rounded-xl bg-indigo-950 border border-purple-400/40" />
                <div
                  data-deck-zone="opponent"
                  onClick={() => {
                    if (isTestingArena) {
                      handleDrawCard('opponent');
                    }
                  }}
                  className={`relative w-16 h-22 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                    isTestingArena
                      ? 'border-amber-300 bg-gradient-to-br from-purple-900 via-indigo-950 to-stone-950 shadow-[0_0_20px_rgba(251,191,36,0.5)] cursor-pointer hover:scale-105 animate-pulse'
                      : 'border-purple-500/45 bg-gradient-to-br from-[#1e1538] via-[#110c22] to-[#090612] shadow-lg'
                  }`}
                  title={`Baralho de ${opponent.name}: ${opponent.deck.length} cartas restantes (Clique para comprar)`}
                >
                  <div className="w-9 h-9 rounded-full border border-purple-400/40 bg-black/50 flex items-center justify-center">
                    <Sparkles size={14} className="text-purple-300" />
                  </div>
                  <span className="mt-1 text-[10px] font-mono font-black text-purple-200 tabular-nums">
                    {opponent.deck.length}
                  </span>
                  {isTestingArena && (
                    <span className="absolute -bottom-1.5 px-1.5 py-0.2 rounded-full bg-amber-400 text-stone-950 font-serif font-black text-[8px] uppercase">
                      Comprar
                    </span>
                  )}
                </div>
                {isTestingArena && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTestingShuffleDeck('opponent');
                    }}
                    className="mt-1.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-900/90 hover:bg-stone-800 text-purple-300 border border-purple-500/40 text-[9px] font-bold cursor-pointer"
                    title="Embaralhar baralho do oponente"
                  >
                    <Shuffle size={10} /> Mix
                  </button>
                )}
              </div>

              {/* Opponent Graveyard / Descarte Vortex */}
              <button
                type="button"
                data-graveyard="opponent"
                onClick={() => {
                  sound.playTick();
                  setGraveyardModalOwner('opponent');
                }}
                className="relative w-16 h-22 rounded-xl border-2 border-rose-500/40 hover:border-amber-300 bg-gradient-to-b from-rose-950/75 via-stone-950 to-purple-950/80 flex flex-col items-center justify-center shadow-[0_0_16px_rgba(244,63,94,0.2)] cursor-pointer transition-all hover:scale-105 group overflow-hidden"
                title={`Inspecionar Cemitério de ${opponent.name} (${opponent.graveyard.length} cartas)`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.28)_0%,transparent_70%)] group-hover:scale-125 transition-transform" />
                <Layers size={16} className="text-rose-300 relative z-10" />
                <span className="text-xs font-mono font-black text-rose-200 relative z-10 mt-0.5 tabular-nums">
                  {opponent.graveyard.length}
                </span>
                <span className="text-[8px] font-serif font-bold uppercase tracking-wider text-rose-300/90 relative z-10 mt-0.5">
                  Cripta
                </span>
              </button>
            </div>
          </div>

          {/* CENTER-LEFT: TACTICAL TELEMETRY CLUSTER (UNIFIED TURN/ROUND COIN, ROLE CREST & INTERACTIVE COIN) */}
          <div data-tutorial-target="round-dial" className="my-auto w-full flex flex-col items-center gap-1.5 py-1 select-none">
            <div data-tutorial-target="round-dial-core" className="w-full flex flex-col items-center">
            <TurnRoundCoinDial
              round={round}
              roundTurnNumber={roundTurnNumber}
              turnPlayer={turnPlayer}
              attackerRole={attackerRole}
              activeCombatAttackerRole={activeCombatAttackerRole}
              attackerConsecutivePasses={attackerConsecutivePasses}
              isDefendingPhase={isDefendingPhase}
              isPostAttackFinalTurn={isPostAttackFinalTurn}
              hasPendingSpell={Boolean(pendingSpell)}
              willPassEndRound={willPassEndRound}
              freeActionHint={freeActionHint}
              newlyUnlockedTier={newlyUnlockedTier}
              roundCoinFlipAnim={roundCoinFlipAnim}
              isTestingArena={isTestingArena}
              onTestingNextRound={() => startNewRound()}
              onTestingSwapTurn={() => {
                const nextTurn: 'player' | 'opponent' = turnPlayer === 'player' ? 'opponent' : 'player';
                setTurnPlayer(nextTurn);
                sound.playTick();
                addLog(
                  `⇄ [Arena de Testes] Turno ativo alternado para ${nextTurn === 'player' ? player.name : opponent.name}!`,
                  'info'
                );
              }}
            />
            </div>

            {/* INSÍGNIA ESCULPIDA DA FUNÇÃO DO JOGADOR NA LATERAL ESQUERDA (MANTÉM ANIMAÇÃO DE TROCA 3D) */}
            <div data-tutorial-target="role-crest" className="w-full flex flex-col items-center">
            {(() => {
              const displayedRole: 'attacker' | 'defender' =
                roundCoinTransition?.stage === 'waves'
                  ? roundCoinTransition.fromRole
                  : roundCoinTransition?.stage === 'reveal'
                  ? roundCoinTransition.toRole
                  : attackerRole === 'player'
                  ? 'attacker'
                  : 'defender';
              const isCoinConsuming = roundCoinTransition?.stage === 'consume_and_spin';
              const isCoinRevealing = roundCoinTransition?.stage === 'reveal';
              const isCosmicPurpleCoin = isZykCosmicActive && !isCoinConsuming;

              return (
                <RoleFunctionCrest
                  displayedRole={displayedRole}
                  isCoinConsuming={isCoinConsuming}
                  isCoinRevealing={isCoinRevealing}
                  isRoleCoinManualSpin={isRoleCoinManualSpin}
                  isCosmicPurpleCoin={isCosmicPurpleCoin}
                  hasAttackedThisRound={hasAttackedThisRound}
                  isTestingArena={isTestingArena}
                  coinTargetRef={roleCoinTargetRef}
                  onCoinClick={() => {
                    if (isRoleCoinManualSpin || roundCoinTransition) return;
                    sound.playTick();
                    setIsRoleCoinManualSpin(true);
                    setTimeout(() => setIsRoleCoinManualSpin(false), 750);
                  }}
                  onTestingSwapRole={() => {
                    const nextRole: 'player' | 'opponent' = attackerRole === 'player' ? 'opponent' : 'player';
                    triggerRoleSwapCoinAnimation(nextRole);
                  }}
                />
              );
            })()}
            </div>

            {/* ÍCONE VISUAL INTERATIVO DA MOEDA ESCOLHIDA PELO JOGADOR */}
            <div data-tutorial-target="magic-coin" className="w-full flex items-center justify-between px-2 py-1 rounded-xl bg-stone-950/85 border border-amber-500/30 shadow-inner">
              <div className="flex flex-col items-start">
                <span className="text-[8px] font-serif font-bold uppercase tracking-widest text-stone-400">
                  Sua Moeda
                </span>
                <span
                  className={`text-[10px] font-serif font-black uppercase tracking-wider ${
                    playerCoinSide === 'sol' ? 'text-amber-300' : 'text-blue-300'
                  }`}
                >
                  {playerCoinSide === 'sol' ? 'Sol Dourado' : 'Lua Astral'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (isCoinBadgeSpinning) return;
                  sound.playTick();
                  setIsCoinBadgeSpinning(true);
                  setTimeout(() => setIsCoinBadgeSpinning(false), 750);
                }}
                className={`relative w-9 h-9 rounded-full border-2 flex items-center justify-center cursor-pointer transition-transform duration-700 hover:scale-110 active:scale-95 [transform-style:preserve-3d] ${
                  isCoinBadgeSpinning ? '[transform:rotateY(720deg)_scale(1.18)]' : '[transform:rotateY(0deg)_scale(1)]'
                } ${
                  playerCoinSide === 'sol'
                    ? 'border-amber-200 bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 text-stone-950 shadow-[0_0_14px_rgba(251,191,36,0.6)]'
                    : 'border-blue-200 bg-gradient-to-br from-blue-300 via-indigo-500 to-slate-900 text-white shadow-[0_0_14px_rgba(96,165,250,0.6)]'
                }`}
                title={`Moeda escolhida: ${playerCoinSide === 'sol' ? 'SOL' : 'LUA'} (Clique para girar a moeda!)`}
              >
                <div className="absolute inset-0.5 rounded-full border border-dashed border-white/40 pointer-events-none" />
                {playerCoinSide === 'sol' ? (
                  <Sun size={18} className="drop-shadow" />
                ) : (
                  <Moon size={18} className="drop-shadow" />
                )}
              </button>
            </div>

            {/* RUNIC SANCTUARY PILLAR ORNAMENT (PRESERVED) */}
            <div className="flex items-center gap-1.5 opacity-80 pt-0.5">
              <div className="w-4 h-px bg-gradient-to-r from-transparent to-amber-400/50" />
              <div className="px-2 py-0.5 rounded-full bg-stone-950/90 border border-amber-500/30 text-[8px] font-mono text-amber-300/80 tracking-[0.2em] shadow-inner">
                ᚱ ᚦ ᚠ ᛊ
              </div>
              <div className="w-4 h-px bg-gradient-to-l from-transparent to-cyan-400/50" />
            </div>
          </div>

          {/* BOTTOM-LEFT: PLAYER 3D STACKED DRAW DECK & GRAVEYARD VORTEX */}
          <div className="w-full flex flex-col items-center gap-2">
            {/* Player Graveyard / Descarte Button */}
            <button
              type="button"
              data-graveyard="player"
              onClick={() => {
                sound.playTick();
                setGraveyardModalOwner('player');
              }}
              className="w-full py-1.5 px-2.5 rounded-xl border border-cyan-500/40 hover:border-amber-300 bg-gradient-to-r from-blue-950/85 via-stone-950 to-cyan-950/85 flex items-center justify-between shadow-[0_0_15px_rgba(56,189,248,0.2)] cursor-pointer transition-all hover:scale-[1.02] group"
              title="Clique para inspecionar as cartas no seu Cemitério / Descarte"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-400/50 flex items-center justify-center group-hover:border-amber-300">
                  <Layers size={14} className="text-cyan-300" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[10px] font-serif font-black uppercase tracking-wider text-cyan-200 group-hover:text-amber-200">
                    Seu Descarte
                  </span>
                  <span className="text-[9px] text-stone-400">Ver Cripta</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-black/60 border border-cyan-500/30 font-mono font-black text-xs text-cyan-300 tabular-nums">
                {player.graveyard.length}
              </span>
            </button>

            {/* Player 3D Stacked Draw Deck Pedestal */}
            <div className="relative w-full flex flex-col items-center pt-1 pb-0.5">
              <div className="relative w-28 h-36 flex items-center justify-center">
                {/* 3D Physical Card Stack Layers beneath the top card */}
                {player.deck.length > 12 && (
                  <div className="absolute w-24 h-32 translate-x-2.5 translate-y-2.5 rounded-xl bg-[#0c1222] border border-cyan-500/30 shadow-md" />
                )}
                {player.deck.length > 6 && (
                  <div className="absolute w-24 h-32 translate-x-1.5 translate-y-1.5 rounded-xl bg-[#10192e] border border-cyan-400/40 shadow-md" />
                )}
                {player.deck.length > 1 && (
                  <div className="absolute w-24 h-32 translate-x-0.5 translate-y-0.5 rounded-xl bg-[#15223d] border border-amber-400/40 shadow-md" />
                )}

                {/* Interactive Top Card of the 3D Deck */}
                <button
                  type="button"
                  data-deck-zone="player"
                  onClick={() => handleDrawCard('player')}
                  disabled={!isTestingArena && (player.hasDrawnThisRound || player.deck.length === 0)}
                  className={`relative w-24 h-32 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-between p-2 overflow-hidden group select-none ${
                    isTestingArena || (!player.hasDrawnThisRound && player.deck.length > 0)
                      ? 'border-amber-300 bg-gradient-to-br from-indigo-950 via-blue-950 to-stone-950 shadow-[0_0_28px_rgba(251,191,36,0.65)] cursor-pointer hover:-translate-y-1.5 hover:scale-105 hover:border-yellow-200 active:scale-95'
                      : 'border-stone-600/70 bg-gradient-to-br from-stone-900 via-indigo-950/60 to-stone-950 shadow-inner cursor-not-allowed opacity-85'
                  }`}
                  title={
                    isTestingArena
                      ? `Baralho de Testes (${player.deck.length} cartas) - Clique para COMPRAR cartas infinitamente!`
                      : player.deck.length === 0
                      ? 'Baralho esgotado! Sobreviva até sua última unidade cair.'
                      : player.hasDrawnThisRound
                      ? `Baralho (${player.deck.length} cartas restantes) - Compra desta rodada já efetuada.`
                      : `Baralho (${player.deck.length} cartas) - Clique para COMPRAR sua carta da rodada!`
                  }
                >
                  {/* Top Runes */}
                  <span className="text-[8px] font-mono tracking-widest text-amber-300/80">
                    ᚱ ᚦ ᚠ ᛊ
                  </span>

                  {/* Center Celestial Astrolabe Emblem */}
                  <div
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                      isTestingArena || (!player.hasDrawnThisRound && player.deck.length > 0)
                        ? 'border-amber-300 bg-black/60 shadow-[0_0_16px_rgba(56,189,248,0.6)] group-hover:rotate-45'
                        : 'border-stone-600/60 bg-black/40'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center ${
                        isTestingArena || (!player.hasDrawnThisRound && player.deck.length > 0)
                          ? 'bg-gradient-to-tr from-amber-400 via-yellow-200 to-cyan-300 shadow-[0_0_12px_#fbbf24]'
                          : 'bg-stone-700'
                      }`}
                    >
                      <Sparkles
                        size={14}
                        className={isTestingArena || (!player.hasDrawnThisRound && player.deck.length > 0) ? 'text-stone-950' : 'text-stone-400'}
                      />
                    </div>
                  </div>

                  {/* Bottom Deck Count / Draw Callout */}
                  <div className="w-full flex flex-col items-center">
                    {isTestingArena || (!player.hasDrawnThisRound && player.deck.length > 0) ? (
                      <span className="w-full text-center text-[9px] font-serif font-black uppercase text-stone-950 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 px-1.5 py-0.5 rounded-md shadow-sm tracking-wider animate-pulse">
                        COMPRAR ({player.deck.length})
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-extrabold text-amber-200/90 tabular-nums">
                        {player.deck.length} Cartas
                      </span>
                    )}
                  </div>
                </button>
              </div>

              {/* Controles da Arena de Testes: Carta no Topo e Embaralhar */}
              {isTestingArena && (
                <div className="w-full flex flex-col items-center gap-1 mt-1.5">
                  {player.deck[0] && (
                    <div
                      className="px-2 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-400/50 text-[8px] font-mono text-emerald-300 max-w-[125px] truncate shadow-sm"
                      title={`Próxima carta no topo do seu baralho: ${player.deck[0].name}`}
                    >
                      ⬆️ Topo: {player.deck[0].name}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleTestingShuffleDeck('player')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-stone-900/95 hover:bg-stone-800 text-amber-300 border border-amber-500/50 font-serif text-[10px] font-bold shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                    title="Embaralha todo o seu baralho aleatoriamente"
                  >
                    <Shuffle size={12} className="text-amber-400" />
                    <span>Embaralhar</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* CENTER STAGE: OPPONENT ARC HAND + UNIFIED RUNIC BOARD + FAN HAND   */}
        {/* ================================================================== */}
        <div className="flex-1 flex flex-col justify-between items-center min-w-0 h-full relative">

          {/* 1. OPPONENT INVERTED FAN HAND AT TOP RIM */}
          <div className="w-full flex flex-col items-center shrink-0 pt-0.5 z-30">
            {isTestingArena && opponent.hand.length > 0 && (
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-serif font-bold text-purple-300 uppercase tracking-wider">
                  Mão de {opponent.name} ({opponent.hand.length})
                </span>
                <button
                  onClick={handleTestingClearEnemyHand}
                  className="px-2 py-0.5 rounded-md bg-rose-950/90 hover:bg-rose-800 text-rose-200 border border-rose-500/40 text-[9px] font-bold transition-colors cursor-pointer"
                  title="Limpar todas as cartas da mão inimiga"
                >
                  🗑️ Limpar Mão Inimiga
                </button>
              </div>
            )}
            <div data-hand-zone="opponent" className="flex items-center justify-center max-w-full overflow-visible px-4 py-0.5 min-h-[42px]">
              {opponent.hand.map((c, idx) => {
                const total = opponent.hand.length;
                const mid = (total - 1) / 2;
                const offset = idx - mid;
                const rotDeg = total <= 8 ? offset * -2.2 : 0;
                const dropY = total <= 8 ? Math.abs(offset) * -2 : 0;

                const isOpponentTurn = turnPlayer === 'opponent';
                const isTierAllowed = isTestingArena || isTierAllowedInRound(c.tier, round, c);
                const hasCraff = opponent.board.some(
                  (card) =>
                    (card.templateId === 'g_craff' || card.name.toLowerCase().includes('craff')) &&
                    card.hp > 0 &&
                    card.silencedRounds === 0
                );
                const maxAllowedSummons = hasCraff ? 3 : 2;
                const isSummonsMaxed = !isTestingArena && c.type === 'unit' && opponent.summonsThisRound >= maxAllowedSummons;
                const isAtormentadorPiece = c.templateId === 'm_tor' || c.templateId === 'm_men' || c.templateId === 'm_tador';
                const isAtormentadorBlocked = isAtormentadorPiece && Boolean(opponent.atormentadorPieceSummonedThisRound);
                const isOSolCard = c.templateId === 'n_o_sol' || c.name.trim().toLowerCase().startsWith('o sol');
                const hasHelioLvl2OnBoard = opponent.board.some(
                  (u) =>
                    (u.templateId === 'n_helio' || u.name.toLowerCase().includes('helio') || u.name.toLowerCase().includes('hélio')) &&
                    u.level === 2 &&
                    u.hp > 0 &&
                    u.silencedRounds === 0
                );
                const isOSolBlocked = isOSolCard && !hasHelioLvl2OnBoard;
                const isALuaCard = c.templateId === 'g_a_lua' || c.name.trim().toLowerCase().startsWith('a lua');
                const hasLunarioLvl2OnBoard = opponent.board.some(
                  (u) =>
                    (u.templateId === 'g_lunario' || u.name.toLowerCase().includes('lunario')) &&
                    u.level === 2 &&
                    u.hp > 0 &&
                    u.silencedRounds === 0
                );
                const isALuaBlocked = isALuaCard && !hasLunarioLvl2OnBoard;
                const isZykCard = c.templateId === 'g_zyk' || c.name.toLowerCase().includes('zyk');
                const zykCandidatesCount =
                  opponent.hand.filter((cardItem) => cardItem.instanceId !== c.instanceId).length + opponent.board.length;
                const isZykBlocked = isZykCard && zykCandidatesCount < 2;
                const isBlockedByCounterWindow =
                  Boolean(pendingSpell) &&
                  (c.type === 'unit' || (c.speed !== 'rapida' && !c.isFugaz));
                const isVetoWithoutPending =
                  !isTestingArena && !pendingSpell && c.templateId === 'n_veto_do_indomito';
                const isPlayable =
                  !opponent.isAi &&
                  !isDefendingPhase &&
                  (isOpponentTurn || isTestingArena) &&
                  isTierAllowed &&
                  !isSummonsMaxed &&
                  !isAtormentadorBlocked &&
                  !isOSolBlocked &&
                  !isALuaBlocked &&
                  !isZykBlocked &&
                  !isBlockedByCounterWindow &&
                  !isVetoWithoutPending;

                let unplayableReason: string | undefined = undefined;
                if (isDefendingPhase) unplayableReason = 'Fase de Defesa: Clique nas cartas da Mesa acima';
                else if (!isOpponentTurn && !isTestingArena) unplayableReason = `Aguarde o turno de ${opponent.name}`;
                else if (isBlockedByCounterWindow)
                  unplayableReason = 'Contra-Resposta: Apenas Habilidades Rápidas ou Fugazes';
                else if (isVetoWithoutPending)
                  unplayableReason = 'Apenas na Contra-Resposta a uma Habilidade inimiga';
                else if (isOSolBlocked)
                  unplayableReason = 'Requer Hélio Nível 2 na mesa';
                else if (isALuaBlocked)
                  unplayableReason = 'Requer Lunário Nível 2 na mesa';
                else if (isZykBlocked)
                  unplayableReason = 'Requer 2 cartas aliadas para sacrifício';
                else if (!isTierAllowed) {
                  const isDivinoUnit = c.type === 'unit' && hasCardClass(c, 'Divino');
                  unplayableReason = isDivinoUnit
                    ? `Divino: Requer Rodada ${c.tier === 2 ? '2+' : c.tier === 3 ? '4+' : c.tier === 4 ? '5+' : '7+'}`
                    : `Requer Rodada ${c.tier === 2 ? '3+' : c.tier === 3 ? '4+' : c.tier === 4 ? '7+' : c.tier === 5 ? '9+' : '10+'}`;
                }
                else if (isSummonsMaxed) unplayableReason = `Limite de ${maxAllowedSummons} invocações atingido`;
                else if (isAtormentadorBlocked) unplayableReason = 'Apenas 1 peça por rodada';

                return (
                  <div
                    key={c.instanceId}
                    style={{
                      transform: `translateY(${dropY}px) rotate(${rotDeg}deg)`,
                      marginLeft: idx === 0 ? '0px' : opponent.isAi ? '-22px' : '-12px',
                    }}
                    onMouseEnter={
                      !opponent.isAi
                        ? (e) =>
                            handleArenaCardHoverEnter(
                              e,
                              c,
                              'hand',
                              hasAliancaAngiris(c, opponent.board)
                            )
                        : undefined
                    }
                    onMouseLeave={
                      !opponent.isAi
                        ? () => handleArenaCardHoverLeave(c.instanceId)
                        : undefined
                    }
                    className={`relative transition-all duration-200 ${
                      opponent.isAi
                        ? 'scale-75 origin-top opacity-90'
                        : 'scale-90 origin-top hover:translate-y-4 hover:scale-110 hover:z-50 hover:!rotate-0'
                    }`}
                  >
                    <CardView
                      card={c}
                      size="sm"
                      isOpponentHand={opponent.isAi}
                      isPlayable={isPlayable}
                      unplayableReason={unplayableReason}
                      hasAliancaAngiris={hasAliancaAngiris(c, opponent.board)}
                      hasOVazioActive={oHasOVazio}
                      actionLabel={c.type === 'unit' ? 'Invocar' : pendingSpell ? 'Responder' : 'Lançar'}
                      onInspect={() => {
                        setHoveredArenaCard(null);
                        setInspectedCard(c);
                      }}
                      onClick={() => {
                        setHoveredArenaCard(null);
                        if (!opponent.isAi) {
                          handlePlayCard(c, 'opponent');
                        }
                      }}
                    />
                  </div>
                );
              })}
              {opponent.hand.length === 0 && (
                <div className="text-[10px] text-stone-500 font-serif italic py-1">
                  Mão de {opponent.name} vazia
                </div>
              )}
            </div>
          </div>

          {/* 2. UNIFIED RUNIC BATTLEFIELD TABLE (OPPONENT ROW + EQUATORIAL FRONT + PLAYER ROW) */}
          <div className="relative w-full flex-1 my-1 rounded-[28px] border-[3px] border-amber-500/40 bg-gradient-to-b from-[#161029]/90 via-[#0d0a1a]/95 to-[#121629]/90 shadow-[0_0_55px_rgba(0,0,0,0.9),inset_0_0_45px_rgba(0,0,0,0.85)] backdrop-blur-md flex flex-col justify-between px-4 py-2.5 overflow-visible">
            {/* Active Turn Half-Table Glowing Border (Flashes Full & Crawls on Turn Switch) */}
            <TableTurnBorderGlow
              turnPlayer={turnPlayer}
              cornerRadius={28}
              mode={effectiveTurnIndicatorMode}
              reduceBlur={reduceGpuBlur}
            />

            {/* Inner Golden Filigree Frame */}
            <div className="pointer-events-none absolute inset-1.5 rounded-[22px] border border-amber-300/15" />

            {/* 4 Elemental Corner Gems */}
            <div className="pointer-events-none absolute -top-2.5 -left-2.5 w-6 h-6 rounded-md bg-gradient-to-tr from-cyan-500 to-sky-200 rotate-45 border-2 border-white shadow-[0_0_14px_#38bdf8] z-20" />
            <div className="pointer-events-none absolute -top-2.5 -right-2.5 w-6 h-6 rounded-md bg-gradient-to-tr from-fuchsia-500 to-pink-200 rotate-45 border-2 border-white shadow-[0_0_14px_#e879f9] z-20" />
            <div className="pointer-events-none absolute -bottom-2.5 -left-2.5 w-6 h-6 rounded-md bg-gradient-to-tr from-blue-600 to-cyan-300 rotate-45 border-2 border-white shadow-[0_0_14px_#3b82f6] z-20" />
            <div className="pointer-events-none absolute -bottom-2.5 -right-2.5 w-6 h-6 rounded-md bg-gradient-to-tr from-amber-500 to-yellow-200 rotate-45 border-2 border-white shadow-[0_0_14px_#f59e0b] z-20" />

            {/* Sacred Constellation Geometry Etched into Stone Floor */}
            <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden rounded-[26px]">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50%" cy="50%" r="180" fill="none" stroke="#fbbf24" strokeWidth="0.7" strokeDasharray="6,6" />
                <circle cx="50%" cy="50%" r="290" fill="none" stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="3,8" />
                <line x1="8%" y1="50%" x2="92%" y2="50%" stroke="#fbbf24" strokeWidth="1" strokeOpacity="0.45" />
                <circle cx="14%" cy="26%" r="2.5" fill="#fef08a" />
                <circle cx="22%" cy="38%" r="2" fill="#fef08a" />
                <circle cx="84%" cy="28%" r="2.5" fill="#93c5fd" />
                <circle cx="78%" cy="72%" r="2.5" fill="#93c5fd" />
                <line x1="14%" y1="26%" x2="22%" y2="38%" stroke="#fef08a" strokeWidth="0.8" strokeDasharray="3,3" />
              </svg>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* UPPER HALF: OPPONENT BATTLE ROW WITH SCULPTED RUNIC SLOTS      */}
            {/* -------------------------------------------------------------- */}
            <div className="relative z-10 w-full flex-1 flex items-center justify-center gap-2.5 lg:gap-3.5 min-h-[120px] pt-5">
              {Array.from({ length: Math.max(opponent.board.length, opponent.maxBoardSlots ?? 5) }).map((_, slotIdx) => {
                const card = opponent.board[slotIdx];
                const runeGlyphs = ['ᛟ', 'ᛞ', 'ᚦ', 'ᚱ', 'ᛋ', 'ᚲ'];

                if (!card) {
                  return (
                    <div
                      key={`opp-empty-slot-${slotIdx}`}
                      className="w-[104px] h-[142px] sm:w-[114px] sm:h-[154px] rounded-2xl border border-dashed border-purple-400/20 bg-purple-950/10 flex flex-col items-center justify-center select-none pointer-events-none transition-all"
                    >
                      <span className="text-lg font-mono text-purple-300/20">{runeGlyphs[slotIdx % runeGlyphs.length]}</span>
                      <span className="text-[8px] font-serif uppercase tracking-widest text-purple-300/20 mt-1">
                        Pedestal {slotIdx + 1}
                      </span>
                    </div>
                  );
                }

                const isBlockingAttackerId = Object.entries(assignedBlocks).find(
                  ([_, defId]) => defId === card.instanceId
                )?.[0];
                const attackerName = isBlockingAttackerId
                  ? declaredAttackers.find((a) => a.instanceId === isBlockingAttackerId)?.name
                  : undefined;

                const isSelectedForAttack = selectedAttackerIds.includes(card.instanceId);

                const canOpponentAttack =
                  !pendingSpell &&
                  isTestingArena &&
                  ((attackerRole === 'opponent' &&
                    (!hasAttackedThisRound || (Boolean(opponent.extraAttackRound) && !opponent.secondAttackDone))) ||
                    Boolean(opponent.canAttackOnDefense)) &&
                  !card.conditions.has('atordoado') &&
                  !card.conditions.has('dormindo') &&
                  card.templateId !== 'm_lamina_inverno' &&
                  card.templateId !== 'n_pedrinha';

                const isAssigned = Boolean(isBlockingAttackerId);
                const canOpponentDefend =
                  isDefendingPhase &&
                  activeCombatAttackerRole === 'player' &&
                  isTestingArena &&
                  !card.conditions.has('atordoado') &&
                  !card.conditions.has('dormindo') &&
                  card.templateId !== 'm_lamina_inverno';

                let cardActionLabel: string | undefined = undefined;
                if (canOpponentAttack) {
                  cardActionLabel = isSelectedForAttack ? 'Remover' : 'Atacar';
                } else if (isDefendingPhase && activeCombatAttackerRole === 'player' && isTestingArena && (isAssigned || canOpponentDefend)) {
                  cardActionLabel = isAssigned ? 'Remover' : (assigningBlockForAttacker ? 'Bloquear' : 'Defender');
                }

                const oppAtkResult = tableCombatAnim?.results.find((r) => r.attackerCard?.instanceId === card.instanceId);
                const oppDefResult = tableCombatAnim?.results.find((r) => r.defenderCard?.instanceId === card.instanceId);
                const isOppDoubleAttack = Boolean(
                  card.conditions?.has('ataque_duplo') ||
                    card.hasDoubleAttack ||
                    (card.templateId === 'm_moira' && card.silencedRounds === 0) ||
                    (card.templateId === 'm_jasmim' && oppDefResult?.defenderCard?.element === 'Fogo' && card.silencedRounds === 0)
                );

                let oppCombatAnimClass = '';
                if (oppAtkResult) {
                  if (tableCombatAnim?.stage === 'striking') {
                    oppCombatAnimClass = isOppDoubleAttack ? 'animate-table-double-lunge-down !z-50' : 'animate-table-lunge-down !z-50';
                  } else if (tableCombatAnim?.stage === 'rebound' && oppAtkResult.reboundDamageDealt > 0) {
                    oppCombatAnimClass = 'animate-table-defender-hit !z-40';
                  } else if (tableCombatAnim?.stage === 'death' && oppAtkResult.attackerDied) {
                    oppCombatAnimClass = 'animate-card-death !z-30';
                  } else if (tableCombatAnim?.stage === 'death' && oppAtkResult.attackerResurrected) {
                    oppCombatAnimClass = oppAtkResult.attackerBorPhoenix
                      ? 'animate-bor-phoenix-revive !z-50'
                      : 'animate-ressurreicao-revive !z-50';
                  }
                } else if (oppDefResult) {
                  if (tableCombatAnim?.stage === 'striking') {
                    oppCombatAnimClass = 'animate-table-defender-hit !z-40';
                  } else if (tableCombatAnim?.stage === 'rebound' && oppDefResult.reboundDamageDealt > 0) {
                    oppCombatAnimClass = 'animate-table-rebound-down !z-50';
                  } else if (tableCombatAnim?.stage === 'death' && oppDefResult.defenderDied) {
                    oppCombatAnimClass = 'animate-card-death !z-30';
                  } else if (tableCombatAnim?.stage === 'death' && oppDefResult.defenderResurrected) {
                    oppCombatAnimClass = oppDefResult.defenderBorPhoenix
                      ? 'animate-bor-phoenix-revive !z-50'
                      : 'animate-ressurreicao-revive !z-50';
                  }
                }

                const oppReviveClass = borPhoenixRevivingUnitIds[card.instanceId]
                  ? 'animate-bor-phoenix-revive !z-50'
                  : resurrectingUnitIds[card.instanceId]
                  ? 'animate-ressurreicao-revive !z-50'
                  : '';

                return (
                  <div
                    key={card.instanceId}
                    data-unit-instance-id={card.instanceId}
                    onMouseEnter={(e) =>
                      handleArenaCardHoverEnter(
                        e,
                        card,
                        'board',
                        hasAliancaAngiris(card, opponent.board)
                      )
                    }
                    onMouseLeave={() => handleArenaCardHoverLeave(card.instanceId)}
                    className={`relative group transition-transform duration-200 hover:z-30 ${oppCombatAnimClass} ${oppReviveClass}`}
                  >
                    {/* On-Table Combat Floating Damage, Sparks & Death Overlays */}
                    {oppDefResult && tableCombatAnim?.stage === 'striking' && oppDefResult.attackerDamageDealt > 0 && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-50 font-mono font-black text-xs text-white bg-rose-600 border border-rose-300 px-2.5 py-0.5 rounded-full shadow-[0_0_18px_#ef4444] animate-float-damage flex items-center gap-1 pointer-events-none whitespace-nowrap">
                        <HeartCrack size={12} className="text-white" /> -{oppDefResult.attackerDamageDealt} HP
                      </div>
                    )}
                    {oppDefResult && tableCombatAnim?.stage === 'striking' && (
                      <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full border-2 border-amber-300 bg-amber-400/20 animate-lor-impact-sparks" />
                      </div>
                    )}
                    {oppAtkResult && isOppDoubleAttack && tableCombatAnim?.stage === 'striking' && (
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-500 to-rose-600 text-stone-950 font-black text-[9px] px-2 py-0.5 rounded-full border border-yellow-200 shadow-[0_0_15px_#f59e0b] animate-pulse whitespace-nowrap pointer-events-none">
                        ⚡ 2x ATAQUE
                      </div>
                    )}
                    {oppAtkResult && tableCombatAnim?.stage === 'rebound' && oppAtkResult.reboundDamageDealt > 0 && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-50 font-mono font-black text-xs text-cyan-200 bg-sky-700 border border-cyan-300 px-2.5 py-0.5 rounded-full shadow-[0_0_18px_#38bdf8] animate-float-damage flex items-center gap-1 pointer-events-none whitespace-nowrap">
                        <Shield size={12} className="text-cyan-300" /> -{oppAtkResult.reboundDamageDealt} Rebote
                      </div>
                    )}
                    {oppAtkResult && tableCombatAnim?.stage === 'death' && oppAtkResult.attackerDied && !oppAtkResult.attackerResurrected && (
                      <div className="absolute inset-0 bg-red-950/90 rounded-2xl z-50 flex flex-col items-center justify-center border-2 border-red-500 animate-pulse text-red-300 font-bold text-xs uppercase tracking-wider pointer-events-none">
                        <Skull size={24} className="text-red-400 mb-0.5" /> Eliminado!
                      </div>
                    )}
                    {oppDefResult && tableCombatAnim?.stage === 'death' && oppDefResult.defenderDied && !oppDefResult.defenderResurrected && (
                      <div className="absolute inset-0 bg-red-950/90 rounded-2xl z-50 flex flex-col items-center justify-center border-2 border-red-500 animate-pulse text-red-300 font-bold text-xs uppercase tracking-wider pointer-events-none">
                        <Skull size={24} className="text-red-400 mb-0.5" /> Eliminado!
                      </div>
                    )}
                    {tableCombatAnim?.stage === 'death' &&
                      (oppAtkResult?.attackerResurrected || oppDefResult?.defenderResurrected) &&
                      (oppAtkResult?.attackerBorPhoenix || oppDefResult?.defenderBorPhoenix ? (
                        <div className="absolute inset-0 bg-gradient-to-t from-red-950/85 via-orange-600/45 to-amber-300/35 rounded-2xl z-50 flex flex-col items-center justify-center text-center px-1.5 border-2 border-orange-300 shadow-[0_0_36px_rgba(249,115,22,0.98)] text-amber-100 font-serif font-black text-[10px] leading-tight uppercase tracking-wider pointer-events-none">
                          <Flame size={24} className="text-amber-100 mb-0.5 drop-shadow-[0_0_12px_#f97316]" />
                          Renasceu das Cinzas!
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-b from-amber-300/40 via-amber-500/30 to-amber-950/70 rounded-2xl z-50 flex flex-col items-center justify-center border-2 border-amber-200 shadow-[0_0_32px_rgba(251,191,36,0.95)] text-amber-100 font-serif font-black text-[11px] uppercase tracking-wider pointer-events-none">
                          <Sparkles size={22} className="text-amber-100 mb-0.5 drop-shadow-[0_0_10px_#fde047]" />
                          Ressuscitou!
                        </div>
                      ))}
                    {/* Illuminated Runic Pedestal Glow Under Active Unit */}
                    <div
                      className={`pointer-events-none absolute -inset-1.5 rounded-2xl blur-md transition-opacity ${
                        isSelectedForAttack
                          ? 'bg-rose-500/45 opacity-100'
                          : isAssigned
                          ? 'bg-sky-500/45 opacity-100'
                          : 'bg-purple-500/15 opacity-60 group-hover:opacity-100'
                      }`}
                    />
                    {card.conditions.has('ressurreicao') && card.silencedRounds === 0 && (
                      <DivineArchangelAura />
                    )}
                    <UnitFloatingBuffs
                      card={card}
                      board={opponent.board}
                      votoSilencioActive={votoSilencioActive}
                    />
                    {hasUnitZykExtraAttackAura(card, opponent, 'opponent') && (
                      <div
                        className="pointer-events-none absolute -inset-1 rounded-2xl z-10 border border-purple-400/55 zyk-extra-attack-aura"
                        aria-hidden="true"
                      />
                    )}
                    <CardView
                      card={card}
                      size="sm"
                      hasAliancaAngiris={hasAliancaAngiris(card, opponent.board)}
                      hasOVazioActive={oHasOVazio}
                      isSelected={isSelectedForAttack}
                      isAssignedDefender={isAssigned}
                      assignedToAttackerName={attackerName}
                      onInspect={() => {
                        setHoveredArenaCard(null);
                        setInspectedCard(card);
                      }}
                      onClick={() => {
                        setHoveredArenaCard(null);
                        if (canOpponentAttack) {
                          if (isTestingArena && turnPlayer !== 'opponent') {
                            setTurnPlayer('opponent');
                          }
                          handleToggleAttackerSelection(card.instanceId);
                        } else if (
                          isDefendingPhase &&
                          activeCombatAttackerRole === 'player' &&
                          isTestingArena &&
                          declaredAttackers.length > 0
                        ) {
                          if (isBlockingAttackerId) {
                            handleRemoveBlocker(isBlockingAttackerId);
                            sound.playDiscard();
                            addLog(`Defesa de ${card.name} removida.`, 'info');
                            return;
                          }
                          if (card.conditions.has('atordoado') || card.conditions.has('dormindo') || card.templateId === 'm_lamina_inverno') {
                            sound.playDiscard();
                            addLog(
                              `🚫 ${card.name} está ${card.conditions.has('atordoado') ? 'Atordoado' : card.conditions.has('dormindo') ? 'Dormindo' : 'imóvel'} e não pode defender!`,
                              'info'
                            );
                            return;
                          }

                          if (assigningBlockForAttacker) {
                            if (
                              assigningBlockForAttacker.conditions.has('etereo') &&
                              !card.conditions.has('etereo')
                            ) {
                              addLog(
                                `Apenas unidades com ETÉREO podem bloquear atacantes etéreos (${assigningBlockForAttacker.name})!`,
                                'info'
                              );
                              return;
                            }
                            if (
                              assigningBlockForAttacker.conditions.has('furtividade') &&
                              !card.conditions.has('furtividade')
                            ) {
                              addLog(
                                `Apenas unidades com FURTIVO podem bloquear atacantes furtivos (${assigningBlockForAttacker.name})!`,
                                'info'
                              );
                              return;
                            }
                            handleAssignBlocker(assigningBlockForAttacker.instanceId, card.instanceId);
                            setAssigningBlockForAttacker(null);
                            sound.playDraw();
                            addLog(`🛡️ ${card.name} foi designada para defender ${assigningBlockForAttacker.name}!`, 'defense');
                            return;
                          }

                          const unblocked = declaredAttackers.find((a) => {
                            if (assignedBlocks[a.instanceId]) return false;
                            if (a.conditions.has('etereo') && !card.conditions.has('etereo')) return false;
                            if (a.conditions.has('furtividade') && !card.conditions.has('furtividade')) return false;
                            return true;
                          });

                          if (unblocked) {
                            handleAssignBlocker(unblocked.instanceId, card.instanceId);
                            sound.playDraw();
                            addLog(`🛡️ ${card.name} foi designada para defender ${unblocked.name}!`, 'defense');
                          } else {
                            addLog('Todos os atacantes já estão bloqueados ou requerem Furtividade/Etéreo.', 'info');
                          }
                        } else {
                          setInspectedCard(card);
                        }
                      }}
                      actionLabel={cardActionLabel}
                    />
                  </div>
                );
              })}
            </div>

            {/* -------------------------------------------------------------- */}
            {/* EQUATORIAL ASTRAL FRONTLINE DIVIDER & CONFRONTATION BANNERS    */}
            {/* -------------------------------------------------------------- */}
            <div className="relative z-20 w-full my-1 flex flex-col items-center">
              {/* Glowing Astral Divider Line */}
              <div className="w-full flex items-center justify-center gap-3">
                <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-amber-400/50 to-purple-400/70" />
                <div className="px-4 py-0.5 rounded-full bg-stone-950/95 border border-amber-400/50 shadow-[0_0_18px_rgba(245,158,11,0.3)] flex items-center gap-2">
                  <span className="text-[9px] font-mono text-cyan-300/90 hidden sm:inline">ᚱ ᚲ ᚦ</span>
                  <span className="text-[10px] font-serif font-black tracking-[0.2em] text-amber-200 uppercase">
                    Fronteira Astral
                  </span>
                  <span className="text-[9px] font-mono text-cyan-300/90 hidden sm:inline">ᛞ ᚱ ᛏ</span>
                </div>
                <div className="flex-1 h-[2px] bg-gradient-to-l from-transparent via-amber-400/50 to-cyan-400/70" />
              </div>

              {/* Counter-Response Window Banner on Midline */}
              {pendingSpell && (
                <div className="w-full max-w-3xl mt-1.5 py-1.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-950/95 via-purple-950/95 to-amber-950/95 border-2 border-amber-400 text-amber-100 text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-[0_0_25px_rgba(245,158,11,0.5)] animate-pulse">
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} className="text-amber-300 shrink-0" />
                    <span>
                      ⚡ CONTRA-RESPOSTA:{' '}
                      <strong className="text-amber-300">
                        {pendingSpell.casterId === 'player' ? player.name : opponent.name}
                      </strong>{' '}
                      lançou <strong className="text-cyan-300">[{pendingSpell.spellCard.name}]</strong>
                      {pendingSpell.targetName ? ` (Alvo: ${pendingSpell.targetName})` : ''}!{' '}
                      {pendingSpell.casterId === 'opponent'
                        ? 'Use 1 Habilidade RÁPIDA/FUGAZ ou deixe resolver!'
                        : 'Aguardando resposta...'}
                    </span>
                  </div>
                  {(pendingSpell.casterId === 'opponent' || isTestingArena) && (
                    <button
                      onClick={() => handlePassTurn(false)}
                      className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 font-serif font-black text-[11px] uppercase tracking-wider shadow cursor-pointer transition-all shrink-0"
                    >
                      Deixar Resolver
                    </button>
                  )}
                </div>
              )}

              {/* On-Table Combat Floating Indicator (Desktop) */}
              {tableCombatAnim && (
                <div className="w-full max-w-md mx-auto my-1 py-1 px-4 rounded-full bg-stone-950/95 border-2 border-amber-400/70 shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center justify-between text-xs font-mono font-bold z-30 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Swords size={15} className="text-amber-400 animate-pulse" />
                    <span className="font-serif font-black text-amber-200 tracking-wider uppercase text-[11px]">
                      Combate na Mesa
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-400/40 text-amber-300">
                      {tableCombatAnim.stage === 'striking'
                        ? '💥 Impacto dos Golpes'
                        : tableCombatAnim.stage === 'rebound'
                        ? '🛡️ Rebote / Contra-Golpe'
                        : '☠️ Resolução de Baixas'}
                    </span>
                  </div>
                  <button
                    onClick={finishTableCombat}
                    className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-serif font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow"
                    title="Pular animação e resolver dano imediatamente"
                  >
                    <FastForward size={11} />
                    <span>Pular</span>
                  </button>
                </div>
              )}

              {/* Defense Confrontation Strip on Midline */}
              {isDefendingPhase && declaredAttackers.length > 0 && !tableCombatAnim && (
                <div className="w-full max-w-4xl mt-1.5 p-2 rounded-xl bg-gradient-to-r from-rose-950/90 via-stone-950/95 to-rose-950/90 border border-rose-400/70 shadow-[0_0_24px_rgba(244,63,94,0.35)] flex flex-col items-center">
                  <div className="w-full flex items-center justify-between mb-1 px-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-serif font-black text-rose-300 uppercase tracking-wider">
                      <Swords size={14} className="text-rose-400 animate-pulse" />
                      <span>{activeCombatAttackerRole === 'opponent' ? 'Ataque Inimigo em Curso' : 'Seu Ataque Declarado'}</span>
                    </div>
                    <div className="text-[11px] font-mono font-bold text-amber-300">
                      {assigningBlockForAttacker
                        ? `🎯 Clique em uma unidade na sua MESA para bloquear ${assigningBlockForAttacker.name}`
                        : 'Clique em uma unidade da mesa defensora para designar bloqueio'}
                    </div>
                  </div>

                  <div className="w-full flex items-center justify-center gap-2 flex-wrap">
                    {declaredAttackers.map((atk) => {
                      const blockedByDefId = assignedBlocks[atk.instanceId];
                      const defCard = (activeCombatAttackerRole === 'player' ? opponent.board : player.board).find(
                        (c) => c.instanceId === blockedByDefId
                      );
                      const isSelectedToAssign = assigningBlockForAttacker?.instanceId === atk.instanceId;
                      const isFurtivo = atk.conditions.has('furtividade');

                      return (
                        <div
                          key={atk.instanceId}
                          className={`p-1 px-2.5 rounded-lg border flex items-center gap-2 text-xs transition-all ${
                            isSelectedToAssign
                              ? 'bg-amber-950/90 border-amber-400 shadow-[0_0_15px_#f59e0b]'
                              : defCard
                              ? 'bg-blue-950/80 border-blue-400/60'
                              : 'bg-rose-950/90 border-rose-500/70'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-amber-300">⚔️ {atk.name}</span>
                            <span className="px-1.5 py-0.2 rounded bg-black/60 text-[10px] text-amber-200 font-mono tabular-nums">
                              Dano {calculateCombatDamage(atk, undefined, false, votoSilencioActive, activeCombatAttackerRole === 'player' ? player.board : opponent.board)}
                            </span>
                            {isFurtivo && (
                              <span className="px-1 py-0.2 rounded bg-purple-950 text-[9px] text-purple-300 border border-purple-500/40">
                                Furtivo
                              </span>
                            )}
                          </div>

                          <ArrowRight size={12} className="text-stone-400 shrink-0" />

                          {defCard ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-cyan-300">🛡️ {defCard.name}</span>
                              <span className="text-[10px] text-cyan-400 font-mono font-bold tabular-nums">
                                (Def {defCard.def})
                              </span>
                              {(!opponent.isAi || activeCombatAttackerRole === 'opponent') && (
                                <button
                                  onClick={() => {
                                    handleRemoveBlocker(atk.instanceId);
                                    addLog(`Defesa de ${defCard.name} removida.`, 'info');
                                  }}
                                  className="p-0.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-600/40 transition-colors cursor-pointer"
                                  title="Remover defesa"
                                >
                                  <X size={11} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-rose-400 text-[10px]">🎯 Dano Direto</span>
                              {(!opponent.isAi || activeCombatAttackerRole === 'opponent') && (
                                <button
                                  onClick={() => setAssigningBlockForAttacker(isSelectedToAssign ? null : atk)}
                                  className={`px-2 py-0.5 rounded font-bold text-[10px] border uppercase tracking-wider transition-all cursor-pointer ${
                                    isSelectedToAssign
                                      ? 'bg-amber-500 text-stone-950 border-amber-300'
                                      : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 shadow'
                                  }`}
                                >
                                  {isSelectedToAssign ? 'Cancelar' : 'Bloquear'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* -------------------------------------------------------------- */}
            {/* LOWER HALF: PLAYER BATTLE ROW WITH ILLUMINATED RUNIC SLOTS     */}
            {/* -------------------------------------------------------------- */}
            <div
              data-tutorial-target="player-board"
              className="relative z-10 w-full flex-1 flex items-center justify-center gap-2.5 lg:gap-3.5 min-h-[130px] pt-5"
            >
              {Array.from({ length: Math.max(player.board.length, player.maxBoardSlots ?? 5) }).map((_, slotIdx) => {
                const card = player.board[slotIdx];
                const runeGlyphs = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ'];

                if (!card) {
                  return (
                    <div
                      key={`player-empty-slot-${slotIdx}`}
                      className={`w-[104px] h-[142px] sm:w-[114px] sm:h-[154px] rounded-2xl border border-dashed flex flex-col items-center justify-center select-none pointer-events-none transition-all ${
                        isPlayerTurn && !isDefendingPhase
                          ? 'border-amber-400/30 bg-amber-950/10 shadow-[inset_0_0_16px_rgba(245,158,11,0.08)]'
                          : 'border-cyan-400/20 bg-cyan-950/10'
                      }`}
                    >
                      <span className="text-lg font-mono text-amber-300/25">{runeGlyphs[slotIdx % runeGlyphs.length]}</span>
                      <span className="text-[8px] font-serif uppercase tracking-widest text-amber-200/25 mt-1">
                        Slot {slotIdx + 1}
                      </span>
                    </div>
                  );
                }

                const isSelectedForAttack = selectedAttackerIds.includes(card.instanceId);
                const isBlockingAttackerId = Object.entries(assignedBlocks).find(
                  ([_, defId]) => defId === card.instanceId
                )?.[0];
                const attackerName = isBlockingAttackerId
                  ? declaredAttackers.find((a) => a.instanceId === isBlockingAttackerId)?.name
                  : undefined;

                const canAttack =
                  !pendingSpell &&
                  isPlayerTurn &&
                  ((isPlayerAttackerRole &&
                    (!hasAttackedThisRound || (Boolean(player.extraAttackRound) && !player.secondAttackDone))) ||
                    Boolean(player.canAttackOnDefense)) &&
                  !card.conditions.has('atordoado') &&
                  !card.conditions.has('dormindo') &&
                  card.templateId !== 'm_lamina_inverno' &&
                  card.templateId !== 'n_pedrinha';

                const isAssigned = Boolean(isBlockingAttackerId);
                const canDefend =
                  isDefendingPhase &&
                  activeCombatAttackerRole === 'opponent' &&
                  !card.conditions.has('atordoado') &&
                  !card.conditions.has('dormindo') &&
                  card.templateId !== 'm_lamina_inverno';

                let cardActionLabel: string | undefined = undefined;
                if (canAttack) {
                  cardActionLabel = isSelectedForAttack ? 'Remover' : 'Atacar';
                } else if (isDefendingPhase && activeCombatAttackerRole === 'opponent' && (isAssigned || canDefend)) {
                  cardActionLabel = isAssigned ? 'Remover' : (assigningBlockForAttacker ? 'Bloquear' : 'Defender');
                }

                const plyAtkResult = tableCombatAnim?.results.find((r) => r.attackerCard?.instanceId === card.instanceId);
                const plyDefResult = tableCombatAnim?.results.find((r) => r.defenderCard?.instanceId === card.instanceId);
                const isPlyDoubleAttack = Boolean(
                  card.conditions?.has('ataque_duplo') ||
                    card.hasDoubleAttack ||
                    (card.templateId === 'm_moira' && card.silencedRounds === 0) ||
                    (card.templateId === 'm_jasmim' && plyDefResult?.defenderCard?.element === 'Fogo' && card.silencedRounds === 0)
                );

                let plyCombatAnimClass = '';
                if (plyAtkResult) {
                  if (tableCombatAnim?.stage === 'striking') {
                    plyCombatAnimClass = isPlyDoubleAttack ? 'animate-table-double-lunge-up !z-50' : 'animate-table-lunge-up !z-50';
                  } else if (tableCombatAnim?.stage === 'rebound' && plyAtkResult.reboundDamageDealt > 0) {
                    plyCombatAnimClass = 'animate-table-defender-hit !z-40';
                  } else if (tableCombatAnim?.stage === 'death' && plyAtkResult.attackerDied) {
                    plyCombatAnimClass = 'animate-card-death !z-30';
                  } else if (tableCombatAnim?.stage === 'death' && plyAtkResult.attackerResurrected) {
                    plyCombatAnimClass = plyAtkResult.attackerBorPhoenix
                      ? 'animate-bor-phoenix-revive !z-50'
                      : 'animate-ressurreicao-revive !z-50';
                  }
                } else if (plyDefResult) {
                  if (tableCombatAnim?.stage === 'striking') {
                    plyCombatAnimClass = 'animate-table-defender-hit !z-40';
                  } else if (tableCombatAnim?.stage === 'rebound' && plyDefResult.reboundDamageDealt > 0) {
                    plyCombatAnimClass = 'animate-table-rebound-up !z-50';
                  } else if (tableCombatAnim?.stage === 'death' && plyDefResult.defenderDied) {
                    plyCombatAnimClass = 'animate-card-death !z-30';
                  } else if (tableCombatAnim?.stage === 'death' && plyDefResult.defenderResurrected) {
                    plyCombatAnimClass = plyDefResult.defenderBorPhoenix
                      ? 'animate-bor-phoenix-revive !z-50'
                      : 'animate-ressurreicao-revive !z-50';
                  }
                }

                const plyReviveClass = borPhoenixRevivingUnitIds[card.instanceId]
                  ? 'animate-bor-phoenix-revive !z-50'
                  : resurrectingUnitIds[card.instanceId]
                  ? 'animate-ressurreicao-revive !z-50'
                  : '';

                return (
                  <div
                    key={card.instanceId}
                    data-unit-instance-id={card.instanceId}
                    onMouseEnter={(e) =>
                      handleArenaCardHoverEnter(
                        e,
                        card,
                        'board',
                        hasAliancaAngiris(card, player.board)
                      )
                    }
                    onMouseLeave={() => handleArenaCardHoverLeave(card.instanceId)}
                    className={`relative group transition-transform duration-200 hover:z-30 ${plyCombatAnimClass} ${plyReviveClass}`}
                  >
                    {/* On-Table Combat Floating Damage, Sparks & Death Overlays */}
                    {plyDefResult && tableCombatAnim?.stage === 'striking' && plyDefResult.attackerDamageDealt > 0 && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-50 font-mono font-black text-xs text-white bg-rose-600 border border-rose-300 px-2.5 py-0.5 rounded-full shadow-[0_0_18px_#ef4444] animate-float-damage flex items-center gap-1 pointer-events-none whitespace-nowrap">
                        <HeartCrack size={12} className="text-white" /> -{plyDefResult.attackerDamageDealt} HP
                      </div>
                    )}
                    {plyDefResult && tableCombatAnim?.stage === 'striking' && (
                      <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full border-2 border-amber-300 bg-amber-400/20 animate-lor-impact-sparks" />
                      </div>
                    )}
                    {plyAtkResult && isPlyDoubleAttack && tableCombatAnim?.stage === 'striking' && (
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-500 to-rose-600 text-stone-950 font-black text-[9px] px-2 py-0.5 rounded-full border border-yellow-200 shadow-[0_0_15px_#f59e0b] animate-pulse whitespace-nowrap pointer-events-none">
                        ⚡ 2x ATAQUE
                      </div>
                    )}
                    {plyAtkResult && tableCombatAnim?.stage === 'rebound' && plyAtkResult.reboundDamageDealt > 0 && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-50 font-mono font-black text-xs text-cyan-200 bg-sky-700 border border-cyan-300 px-2.5 py-0.5 rounded-full shadow-[0_0_18px_#38bdf8] animate-float-damage flex items-center gap-1 pointer-events-none whitespace-nowrap">
                        <Shield size={12} className="text-cyan-300" /> -{plyAtkResult.reboundDamageDealt} Rebote
                      </div>
                    )}
                    {plyAtkResult && tableCombatAnim?.stage === 'death' && plyAtkResult.attackerDied && !plyAtkResult.attackerResurrected && (
                      <div className="absolute inset-0 bg-red-950/90 rounded-2xl z-50 flex flex-col items-center justify-center border-2 border-red-500 animate-pulse text-red-300 font-bold text-xs uppercase tracking-wider pointer-events-none">
                        <Skull size={24} className="text-red-400 mb-0.5" /> Eliminado!
                      </div>
                    )}
                    {plyDefResult && tableCombatAnim?.stage === 'death' && plyDefResult.defenderDied && !plyDefResult.defenderResurrected && (
                      <div className="absolute inset-0 bg-red-950/90 rounded-2xl z-50 flex flex-col items-center justify-center border-2 border-red-500 animate-pulse text-red-300 font-bold text-xs uppercase tracking-wider pointer-events-none">
                        <Skull size={24} className="text-red-400 mb-0.5" /> Eliminado!
                      </div>
                    )}
                    {tableCombatAnim?.stage === 'death' &&
                      (plyAtkResult?.attackerResurrected || plyDefResult?.defenderResurrected) &&
                      (plyAtkResult?.attackerBorPhoenix || plyDefResult?.defenderBorPhoenix ? (
                        <div className="absolute inset-0 bg-gradient-to-t from-red-950/85 via-orange-600/45 to-amber-300/35 rounded-2xl z-50 flex flex-col items-center justify-center text-center px-1.5 border-2 border-orange-300 shadow-[0_0_36px_rgba(249,115,22,0.98)] text-amber-100 font-serif font-black text-[10px] leading-tight uppercase tracking-wider pointer-events-none">
                          <Flame size={24} className="text-amber-100 mb-0.5 drop-shadow-[0_0_12px_#f97316]" />
                          Renasceu das Cinzas!
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-b from-amber-300/40 via-amber-500/30 to-amber-950/70 rounded-2xl z-50 flex flex-col items-center justify-center border-2 border-amber-200 shadow-[0_0_32px_rgba(251,191,36,0.95)] text-amber-100 font-serif font-black text-[11px] uppercase tracking-wider pointer-events-none">
                          <Sparkles size={22} className="text-amber-100 mb-0.5 drop-shadow-[0_0_10px_#fde047]" />
                          Ressuscitou!
                        </div>
                      ))}
                    {/* Illuminated Runic Pedestal Under Player Unit */}
                    <div
                      className={`pointer-events-none absolute -inset-1.5 rounded-2xl blur-md transition-opacity ${
                        isSelectedForAttack
                          ? 'bg-amber-400/55 opacity-100'
                          : isAssigned
                          ? 'bg-cyan-400/55 opacity-100'
                          : canAttack
                          ? 'bg-amber-500/25 opacity-80 group-hover:opacity-100'
                          : 'bg-cyan-500/15 opacity-60 group-hover:opacity-100'
                      }`}
                    />
                    {card.conditions.has('ressurreicao') && card.silencedRounds === 0 && (
                      <DivineArchangelAura />
                    )}
                    <UnitFloatingBuffs
                      card={card}
                      board={player.board}
                      votoSilencioActive={votoSilencioActive}
                    />
                    {hasUnitZykExtraAttackAura(card, player, 'player') && (
                      <div
                        className="pointer-events-none absolute -inset-1 rounded-2xl z-10 border border-purple-400/55 zyk-extra-attack-aura"
                        aria-hidden="true"
                      />
                    )}
                    <CardView
                      card={card}
                      size="sm"
                      hasAliancaAngiris={hasAliancaAngiris(card, player.board)}
                      hasOVazioActive={pHasOVazio}
                      isSelected={isSelectedForAttack}
                      isAssignedDefender={isAssigned}
                      assignedToAttackerName={attackerName}
                      onInspect={() => {
                        setHoveredArenaCard(null);
                        setInspectedCard(card);
                      }}
                      onClick={() => {
                        setHoveredArenaCard(null);
                        if (canAttack) {
                          handleToggleAttackerSelection(card.instanceId);
                        } else if (
                          isDefendingPhase &&
                          activeCombatAttackerRole === 'opponent' &&
                          declaredAttackers.length > 0
                        ) {
                          if (isBlockingAttackerId) {
                            handleRemoveBlocker(isBlockingAttackerId);
                            sound.playDiscard();
                            addLog(`Defesa de ${card.name} removida.`, 'info');
                            return;
                          }
                          if (card.conditions.has('atordoado') || card.conditions.has('dormindo') || card.templateId === 'm_lamina_inverno') {
                            sound.playDiscard();
                            addLog(
                              `🚫 ${card.name} está ${card.conditions.has('atordoado') ? 'Atordoado' : card.conditions.has('dormindo') ? 'Dormindo' : 'imóvel'} e não pode defender!`,
                              'info'
                            );
                            return;
                          }

                          if (assigningBlockForAttacker) {
                            if (
                              assigningBlockForAttacker.conditions.has('etereo') &&
                              !card.conditions.has('etereo')
                            ) {
                              addLog(
                                `Apenas unidades com ETÉREO podem bloquear atacantes etéreos (${assigningBlockForAttacker.name})!`,
                                'info'
                              );
                              return;
                            }
                            if (
                              assigningBlockForAttacker.conditions.has('furtividade') &&
                              !card.conditions.has('furtividade')
                            ) {
                              addLog(
                                `Apenas unidades com FURTIVO podem bloquear atacantes furtivos (${assigningBlockForAttacker.name})!`,
                                'info'
                              );
                              return;
                            }
                            handleAssignBlocker(assigningBlockForAttacker.instanceId, card.instanceId);
                            setAssigningBlockForAttacker(null);
                            sound.playDraw();
                            addLog(`🛡️ ${card.name} foi designada para defender ${assigningBlockForAttacker.name}!`, 'defense');
                            return;
                          }

                          const unblocked = declaredAttackers.find((a) => {
                            if (assignedBlocks[a.instanceId]) return false;
                            if (a.conditions.has('etereo') && !card.conditions.has('etereo')) return false;
                            if (a.conditions.has('furtividade') && !card.conditions.has('furtividade')) return false;
                            return true;
                          });

                          if (unblocked) {
                            handleAssignBlocker(unblocked.instanceId, card.instanceId);
                            sound.playDraw();
                            addLog(`🛡️ ${card.name} foi designada para defender ${unblocked.name}!`, 'defense');
                          } else {
                            addLog('Todos os atacantes já estão bloqueados ou requerem Furtividade/Etéreo.', 'info');
                          }
                        } else {
                          setInspectedCard(card);
                        }
                      }}
                      actionLabel={cardActionLabel}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. PLAYER CURVED FAN HAND WITH TACTICAL HOVER ZOOM */}
          <div className="relative z-40 w-full flex flex-col items-center shrink-0 pt-1 pb-0.5 overflow-visible">
            {/* Subtle Floating Hand Control Ribbon */}
            <div className="w-full max-w-3xl flex items-center justify-between px-4 py-1 rounded-t-2xl bg-gradient-to-r from-transparent via-stone-950/90 to-transparent border-t border-amber-500/30">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-serif font-black tracking-widest text-amber-300 uppercase flex items-center gap-1.5">
                  <Sparkles size={12} className="text-amber-400" /> Sua Mão ({player.hand.length})
                </span>
                {isTestingArena && player.hand.length > 0 && (
                  <button
                    onClick={handleTestingClearHand}
                    className="px-2 py-0.5 rounded-md bg-stone-900/95 hover:bg-stone-800 text-rose-300 border border-rose-500/40 text-[10px] font-serif font-bold transition-colors cursor-pointer"
                    title="Limpar todas as cartas da sua mão atual"
                  >
                    Limpar Mão
                  </button>
                )}
              </div>

              <div className="text-[10px] text-stone-300 font-mono">
                {pendingSpell
                  ? '⚡ Contra-Resposta: Jogue Rápida/Fugaz'
                  : isDefendingPhase
                  ? '🛡️ Fase de Defesa: Bloqueie na Mesa acima'
                  : 'Passe o mouse para ampliar · Clique para jogar'}
              </div>
            </div>

            {/* Curved Fan Hand Cards */}
            <div
              data-hand-zone="player"
              className={`w-full flex items-end justify-center max-w-full overflow-visible px-6 pt-3 pb-1 transition-all duration-200 min-h-[135px] ${
                isDefendingPhase ? 'scale-90 origin-bottom opacity-80' : ''
              }`}
            >
              {player.hand.map((card, idx) => {
                const total = player.hand.length;
                const mid = (total - 1) / 2;
                const offset = idx - mid;
                const useFan = total <= 9;
                const rotDeg = useFan ? offset * 2.8 : 0;
                const arcDropPx = useFan ? Math.abs(offset) * 3.2 : 0;

                const isTierAllowed = isTestingArena || isTierAllowedInRound(card.tier, round, card);
                const hasCraff = player.board.some(
                  (c) =>
                    (c.templateId === 'g_craff' || c.name.toLowerCase().includes('craff')) &&
                    c.hp > 0 &&
                    c.silencedRounds === 0
                );
                const maxAllowedSummons = hasCraff ? 3 : 2;
                const isSummonsMaxed = !isTestingArena && card.type === 'unit' && player.summonsThisRound >= maxAllowedSummons;
                const isAtormentadorPiece = card.templateId === 'm_tor' || card.templateId === 'm_men' || card.templateId === 'm_tador';
                const isAtormentadorBlocked = isAtormentadorPiece && Boolean(player.atormentadorPieceSummonedThisRound);
                const isOSolCard = card.templateId === 'n_o_sol' || card.name.trim().toLowerCase().startsWith('o sol');
                const hasHelioLvl2OnBoard = player.board.some(
                  (c) =>
                    (c.templateId === 'n_helio' || c.name.toLowerCase().includes('helio') || c.name.toLowerCase().includes('hélio')) &&
                    c.level === 2 &&
                    c.hp > 0 &&
                    c.silencedRounds === 0
                );
                const isOSolBlocked = isOSolCard && !hasHelioLvl2OnBoard;
                const isALuaCard = card.templateId === 'g_a_lua' || card.name.trim().toLowerCase().startsWith('a lua');
                const hasLunarioLvl2OnBoard = player.board.some(
                  (c) =>
                    (c.templateId === 'g_lunario' || c.name.toLowerCase().includes('lunario')) &&
                    c.level === 2 &&
                    c.hp > 0 &&
                    c.silencedRounds === 0
                );
                const isALuaBlocked = isALuaCard && !hasLunarioLvl2OnBoard;
                const isZykCard = card.templateId === 'g_zyk' || card.name.toLowerCase().includes('zyk');
                const zykCandidatesCount =
                  player.hand.filter((c) => c.instanceId !== card.instanceId).length + player.board.length;
                const isZykBlocked = isZykCard && zykCandidatesCount < 2;
                const isBlockedByCounterWindow =
                  Boolean(pendingSpell) &&
                  (card.type === 'unit' || (card.speed !== 'rapida' && !card.isFugaz));
                const isVetoWithoutPending =
                  !isTestingArena && !pendingSpell && card.templateId === 'n_veto_do_indomito';
                const isPlayable =
                  !isDefendingPhase &&
                  (isPlayerTurn || isTestingArena) &&
                  isTierAllowed &&
                  !isSummonsMaxed &&
                  !isAtormentadorBlocked &&
                  !isOSolBlocked &&
                  !isALuaBlocked &&
                  !isZykBlocked &&
                  !isBlockedByCounterWindow &&
                  !isVetoWithoutPending;

                let unplayableReason: string | undefined = undefined;
                if (isDefendingPhase) unplayableReason = 'Fase de Defesa: Clique nas cartas da Mesa acima';
                else if (!isPlayerTurn && !isTestingArena) unplayableReason = 'Aguarde seu turno';
                else if (isBlockedByCounterWindow)
                  unplayableReason = 'Contra-Resposta: Apenas Habilidades Rápidas ou Fugazes';
                else if (isVetoWithoutPending)
                  unplayableReason = 'Apenas na Contra-Resposta a uma Habilidade inimiga';
                else if (isOSolBlocked)
                  unplayableReason = 'Requer Hélio Nível 2 na sua mesa';
                else if (isALuaBlocked)
                  unplayableReason = 'Requer Lunário Nível 2 na sua mesa';
                else if (isZykBlocked)
                  unplayableReason = 'Requer 2 cartas aliadas para sacrifício';
                else if (!isTierAllowed) {
                  const isDivinoUnit = card.type === 'unit' && hasCardClass(card, 'Divino');
                  unplayableReason = isDivinoUnit
                    ? `Divino: Requer Rodada ${card.tier === 2 ? '2+' : card.tier === 3 ? '4+' : card.tier === 4 ? '5+' : '7+'}`
                    : `Requer Rodada ${card.tier === 2 ? '3+' : card.tier === 3 ? '4+' : card.tier === 4 ? '7+' : card.tier === 5 ? '9+' : '10+'}`;
                }
                else if (isSummonsMaxed) unplayableReason = `Limite de ${maxAllowedSummons} invocações atingido`;
                else if (isAtormentadorBlocked) unplayableReason = 'Apenas 1 peça por rodada';

                return (
                  <div
                    key={card.instanceId}
                    style={{
                      transform: `translateY(${arcDropPx}px) rotate(${rotDeg}deg)`,
                      marginLeft: idx === 0 ? '0px' : total > 7 ? '-18px' : '-10px',
                    }}
                    onMouseEnter={(e) =>
                      handleArenaCardHoverEnter(
                        e,
                        card,
                        'hand',
                        hasAliancaAngiris(card, player.board)
                      )
                    }
                    onMouseLeave={() => handleArenaCardHoverLeave(card.instanceId)}
                    className="relative transition-all duration-200 ease-out origin-bottom hover:!-translate-y-10 hover:!rotate-0 hover:scale-115 hover:z-50"
                  >
                    <CardView
                      card={card}
                      size="sm"
                      isPlayable={isPlayable}
                      unplayableReason={unplayableReason}
                      onClick={() => {
                        setHoveredArenaCard(null);
                        handlePlayCard(card, 'player');
                      }}
                      onInspect={() => {
                        setHoveredArenaCard(null);
                        setInspectedCard(card);
                      }}
                      actionLabel={card.type === 'unit' ? 'Invocar' : pendingSpell ? 'Responder' : 'Lançar'}
                    />
                  </div>
                );
              })}
              {player.hand.length === 0 && (
                <div className="text-xs text-stone-400 py-3 font-serif italic">
                  Sua mão está vazia · Compre cartas no seu Grimório 3D à esquerda!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* RIGHT TACTICAL WING: SOVEREIGN HP MEDALLIONS + CENTRAL NEXUS ORB   */}
        {/* ================================================================== */}
        <div className="w-48 lg:w-56 shrink-0 flex flex-col justify-between items-center py-2.5 px-2.5 rounded-2xl bg-gradient-to-b from-[#160d24]/85 via-[#090714]/90 to-[#0d1526]/85 border border-amber-500/25 shadow-[0_0_35px_rgba(0,0,0,0.75)] backdrop-blur-md relative overflow-hidden">
          <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-rose-400/50 to-transparent" />
          <div className="absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

          {/* TOP-RIGHT: OPPONENT SOVEREIGN MEDALLION & LIFE CRYSTALS */}
          <div className="w-full flex flex-col items-center gap-1.5 select-none">
            <div className="w-full flex items-center justify-between px-1">
              <span className="font-serif font-black text-xs text-stone-100 truncate max-w-[105px]">
                {opponent.name}
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-[9px] font-serif font-black uppercase tracking-wider border ${
                  attackerRole === 'opponent'
                    ? 'bg-rose-950/90 text-rose-300 border-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                    : 'bg-blue-950/90 text-blue-300 border-blue-500/60'
                }`}
              >
                {attackerRole === 'opponent' ? '⚔️ Atacante' : '🛡️ Defensor'}
              </span>
            </div>

            <div
              data-hp-bar="opponent"
              className={`relative w-full p-2 rounded-xl bg-black/55 border flex items-center gap-2.5 shadow-inner transition-all ${
                finishingCannonAnim?.active && finishingCannonAnim.victor === 'player'
                  ? finishingCannonAnim.stage === 'impact'
                    ? 'border-white bg-gradient-to-r from-amber-300 via-rose-500 to-white animate-hp-shatter'
                    : finishingCannonAnim.stage === 'firing'
                    ? 'border-amber-200 bg-rose-950/90 animate-hp-critical-shake'
                    : 'border-amber-400 bg-rose-950/80 animate-hp-vibrate'
                  : 'border-purple-500/30'
              }`}
            >
              {tableCombatAnim?.stage === 'striking' && tableCombatAnim.directDamageTotal > 0 && tableCombatAnim.attackerRole === 'player' && (
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-50 font-mono font-black text-xs text-white bg-rose-600 border border-rose-300 px-2 py-0.5 rounded-full shadow-[0_0_15px_#ef4444] animate-float-damage whitespace-nowrap flex items-center gap-1 pointer-events-none">
                  <HeartCrack size={12} /> -{tableCombatAnim.directDamageTotal} HP Líder
                </div>
              )}
              {/* 8-Point Star Heart Emblem */}
              <div className="relative w-11 h-11 shrink-0 flex items-center justify-center filter drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]">
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 rotate-45 rounded-sm" />
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 rotate-0 rounded-sm" />
                <div className="absolute inset-1 bg-stone-950 rounded-full flex items-center justify-center border border-amber-400">
                  <Heart size={15} className="text-rose-500 fill-rose-500" />
                </div>
              </div>

              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-between text-xs font-serif font-bold">
                  <span className="text-rose-300 text-[10px] uppercase tracking-wider">Vida</span>
                  <span className="font-mono text-amber-300 font-black text-sm tabular-nums">
                    {opponent.hp}/{opponent.maxHp}
                  </span>
                </div>
                <div className="w-full h-3.5 rounded-full bg-stone-950 border border-purple-500/50 p-0.5 mt-1 flex items-center gap-0.5 overflow-hidden">
                  {Array.from({ length: Math.max(1, opponent.maxHp) }).map((_, i) => {
                    const isFilled = i < opponent.hp;
                    const isPinkFairySlot = Boolean(opponent.corteDasFadasUsed && i < (opponent.pinkExtraHpSlots || 0));
                    const purpleStartIdx = opponent.maxHp - (opponent.purpleExtraHpSlots || 0);
                    const isPurpleSlot = i >= purpleStartIdx;
                    return (
                      <div
                        key={i}
                        title={
                          isPinkFairySlot
                            ? 'Vida Extra Rosa (Corte das Fadas)'
                            : isPurpleSlot
                            ? 'Segmento Extra Roxo (Mipo)'
                            : undefined
                        }
                        className={`flex-1 h-full rounded-xs transition-all duration-300 ${
                          isPinkFairySlot && isFilled
                            ? 'bg-gradient-to-r from-pink-300 via-pink-400 to-fuchsia-500 border border-pink-100 shadow-[0_0_10px_#f472b6]'
                            : isPurpleSlot
                            ? isFilled
                              ? 'bg-gradient-to-r from-purple-400 via-fuchsia-500 to-violet-600 shadow-[0_0_8px_#c084fc]'
                              : 'border border-purple-400/50 bg-purple-950/50'
                            : isFilled
                            ? 'bg-gradient-to-r from-purple-400 to-rose-500 shadow-[0_0_6px_#f43f5e]'
                            : 'bg-stone-800/50'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* CENTER-RIGHT: MULTI-STATE ASTRAL TURN & COMBAT NEXUS ORB */}
          <div className="w-full flex flex-col items-center my-auto py-1">
            {/* Turn Clock Pill Attached to Top of Orb */}
            {!isTestingArena && (
              <div className="mb-2 px-3 py-0.5 rounded-full bg-stone-950/90 border border-amber-400/50 flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                <span className="text-[10px]">{isPlayerTurn ? '☀️' : '🌙'}</span>
                <span
                  className={`font-mono text-xs font-black tabular-nums ${
                    turnTimeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-amber-300'
                  }`}
                >
                  {`${turnTimeLeft}s`}
                </span>
              </div>
            )}

            {/* Sculpted Runic Compass Housing */}
            <div
              data-tutorial-target="action-orb"
              className="relative w-34 h-34 rounded-full border-4 border-stone-600/90 bg-stone-950/90 p-2 flex items-center justify-center shadow-[0_0_30px_rgba(56,189,248,0.28)] ring-2 ring-amber-400/30"
            >
              {/* 4 Cardinal Gems */}
              <div className="absolute -top-2 w-3.5 h-3.5 bg-cyan-400 rotate-45 border border-white shadow-[0_0_8px_#38bdf8]" />
              <div className="absolute -bottom-2 w-3.5 h-3.5 bg-cyan-400 rotate-45 border border-white shadow-[0_0_8px_#38bdf8]" />
              <div className="absolute -left-2 w-3.5 h-3.5 bg-amber-400 rotate-45 border border-white shadow-[0_0_8px_#f59e0b]" />
              <div className="absolute -right-2 w-3.5 h-3.5 bg-amber-400 rotate-45 border border-white shadow-[0_0_8px_#f59e0b]" />

              {/* Inner Runic Ring */}
              <div className="absolute inset-2 rounded-full border border-cyan-500/30 flex items-center justify-center pointer-events-none">
                <span className="absolute top-1 text-[7px] font-mono text-amber-300/80 tracking-widest">ᚱ ᚲ ᚦ</span>
                <span className="absolute bottom-1 text-[7px] font-mono text-cyan-300/80 tracking-widest">ᛞ ᛗ ᛚ</span>
              </div>

              {/* Unified Multi-State Core Button (LoR / Hearthstone style) */}
              {(() => {
                const isManualBoth = isTestingArena;
                const canDeclareAttackNow =
                  !isAttackTransitioning &&
                  !isDefendingPhase &&
                  (((attackerRole === 'player' || Boolean(player.canAttackOnDefense)) &&
                    (turnPlayer === 'player' || isTestingArena)) ||
                    ((attackerRole === 'opponent' || Boolean(opponent.canAttackOnDefense)) &&
                      (turnPlayer === 'opponent' || isTestingArena) &&
                      isManualBoth)) &&
                  selectedAttackerIds.length > 0;

                const isPassTurnDisabled =
                  isAttackTransitioning ||
                  isTurnTransitioning ||
                  isDefendingPhase ||
                  Boolean(assigningBlockForAttacker) ||
                  Boolean(enfrentarModal) ||
                  Boolean(combatResults) ||
                  Boolean(gameOverWinner) ||
                  selectedAttackerIds.length > 0 ||
                  (!isManualBoth && !isPlayerTurn);

                if (isDefendingPhase) {
                  return (
                    <button
                      onClick={handleConfirmDefense}
                      className="w-24 h-24 rounded-full font-serif font-black text-center flex flex-col items-center justify-center p-2 transition-all cursor-pointer bg-gradient-to-b from-emerald-400 via-teal-600 to-emerald-800 hover:from-emerald-300 hover:to-teal-500 text-stone-950 border-4 border-emerald-200 shadow-[0_0_32px_rgba(16,185,129,0.85)] animate-pulse"
                      title="Confirmar bloqueadores e resolver combate"
                    >
                      <Shield size={20} className="text-stone-950 mb-0.5" />
                      <span className="text-[10px] uppercase tracking-wider leading-tight">
                        CONFIRMAR DEFESA
                      </span>
                    </button>
                  );
                }

                if (canDeclareAttackNow) {
                  return (
                    <button
                      onClick={handleConfirmAttack}
                      className="w-24 h-24 rounded-full font-serif font-black text-center flex flex-col items-center justify-center p-2 transition-all cursor-pointer bg-gradient-to-b from-rose-400 via-red-600 to-rose-900 hover:from-rose-300 hover:to-red-500 text-white border-4 border-amber-200 shadow-[0_0_32px_rgba(244,63,94,0.85)] animate-pulse"
                      title="Declarar ataque com as unidades selecionadas"
                    >
                      <Swords size={20} className="text-amber-200 mb-0.5" />
                      <span className="text-[10px] uppercase tracking-wider leading-tight">
                        ATACAR ({selectedAttackerIds.length})
                      </span>
                    </button>
                  );
                }

                return (
                  <button
                    onClick={() => handlePassTurn(false)}
                    disabled={isPassTurnDisabled}
                    className={`w-24 h-24 rounded-full font-serif font-black text-center flex flex-col items-center justify-center p-2 transition-all shadow-2xl ${
                      !isPassTurnDisabled
                        ? pendingSpell
                          ? 'bg-gradient-to-b from-amber-300 via-orange-500 to-amber-700 hover:from-amber-200 hover:to-orange-400 text-stone-950 border-4 border-amber-100 shadow-[0_0_30px_rgba(245,158,11,0.8)] animate-pulse cursor-pointer'
                          : willPassEndRound
                          ? 'bg-gradient-to-b from-amber-400 via-rose-600 to-rose-900 hover:from-amber-300 hover:to-rose-500 text-white border-4 border-amber-200 shadow-[0_0_30px_rgba(244,63,94,0.8)] cursor-pointer'
                          : 'bg-gradient-to-b from-cyan-300 via-blue-600 to-indigo-800 hover:from-cyan-200 hover:to-blue-500 text-white border-4 border-cyan-100 shadow-[0_0_30px_rgba(56,189,248,0.75)] cursor-pointer'
                        : 'bg-stone-900/90 text-stone-600 border-2 border-white/10 cursor-not-allowed opacity-45'
                    }`}
                    title={
                      isPassTurnDisabled
                        ? 'Aguarde sua vez...'
                        : pendingSpell
                        ? 'Passar resposta e deixar a Habilidade resolver'
                        : willPassEndRound
                        ? 'Atenção: passar a vez agora encerrará a rodada atual!'
                        : 'Passar a vez para o outro duelista'
                    }
                  >
                    <Compass size={20} className={!isPassTurnDisabled ? 'text-amber-200 mb-0.5' : 'text-stone-600 mb-0.5'} />
                    <span className="text-[10px] uppercase tracking-wider leading-tight">
                      {pendingSpell
                        ? 'RESOLVER'
                        : isPlayerTurn || isManualBoth
                        ? willPassEndRound
                          ? 'PASSAR (FIM)'
                          : 'PASSAR A VEZ'
                        : 'AGUARDANDO'}
                    </span>
                  </button>
                );
              })()}
            </div>

            {/* Subtle Initiative Indicator below the Orb */}
            <div className="w-full mt-2 flex flex-col gap-2">
              <div className="w-full py-1.5 px-2 rounded-xl bg-stone-900/60 border border-white/5 text-stone-400 text-center text-[10px] font-serif uppercase tracking-wider">
                {isDefendingPhase
                  ? '🛡️ Fase de Defesa Ativa'
                  : isPlayerAttackerRole
                  ? '⚔️ Iniciativa de Ataque'
                  : '🛡️ Postura de Defesa'}
              </div>

              {/* Arena de Testes: Botão GRIMÓRIO posicionado na barra direita abaixo de PASSAR A VEZ */}
              {isTestingArena && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playDraw();
                    setIsTestingDrawerOpen(true);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-b from-stone-900 via-stone-950 to-black hover:from-stone-800 hover:to-stone-950 border-2 border-amber-500/50 hover:border-amber-300 text-amber-200 hover:text-amber-100 font-serif font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                  title="Abrir Grimório da Arena de Testes para adicionar ou invocar cartas"
                >
                  <FlaskConical size={15} className="text-amber-400 shrink-0" />
                  <span>Grimório</span>
                </button>
              )}
            </div>
          </div>

          {/* BOTTOM-RIGHT: PLAYER SOVEREIGN MEDALLION, LIFE CRYSTALS & SUMMON MANA GEMS */}
          <div className="w-full flex flex-col items-center gap-2 select-none">
            {/* Summon Mana Gems Bar */}
            {(() => {
              const hasCraff = player.board.some(
                (c) =>
                  (c.templateId === 'g_craff' || c.name.toLowerCase().includes('craff')) &&
                  c.hp > 0 &&
                  c.silencedRounds === 0
              );
              const maxSummons = hasCraff ? 3 : 2;
              const availableSummons = Math.max(0, maxSummons - player.summonsThisRound);
              return (
                <div className="w-full px-2.5 py-1.5 rounded-xl bg-stone-950/90 border border-cyan-500/35 flex items-center justify-between">
                  <span className="text-[10px] font-serif font-bold uppercase tracking-wider text-cyan-300">
                    ✨ Invocações
                  </span>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: maxSummons }).map((_, idx) => {
                      const isAvailable = idx < availableSummons;
                      return (
                        <div
                          key={idx}
                          className={`w-3.5 h-3.5 rotate-45 rounded-xs border transition-all ${
                            isAvailable
                              ? 'bg-gradient-to-tr from-cyan-400 to-amber-200 border-white shadow-[0_0_8px_#38bdf8]'
                              : 'bg-stone-800 border-stone-600 opacity-45'
                          }`}
                        />
                      );
                    })}
                    <span className="ml-1 font-mono text-xs font-black text-cyan-300 tabular-nums">
                      {player.summonsThisRound}/{maxSummons}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Player Sovereign HP Medallion */}
            <div
              data-hp-bar="player"
              className={`relative w-full p-2 rounded-xl bg-black/60 border flex items-center gap-2.5 shadow-inner transition-all ${
                finishingCannonAnim?.active && finishingCannonAnim.victor === 'opponent'
                  ? finishingCannonAnim.stage === 'impact'
                    ? 'border-white bg-gradient-to-r from-amber-300 via-rose-500 to-white animate-hp-shatter'
                    : finishingCannonAnim.stage === 'firing'
                    ? 'border-amber-200 bg-rose-950/90 animate-hp-critical-shake'
                    : 'border-amber-400 bg-rose-950/80 animate-hp-vibrate'
                  : 'border-amber-500/35'
              }`}
            >
              {tableCombatAnim?.stage === 'striking' && tableCombatAnim.directDamageTotal > 0 && tableCombatAnim.attackerRole === 'opponent' && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-50 font-mono font-black text-xs text-white bg-rose-600 border border-rose-300 px-2 py-0.5 rounded-full shadow-[0_0_15px_#ef4444] animate-float-damage whitespace-nowrap flex items-center gap-1 pointer-events-none">
                  <HeartCrack size={12} /> -{tableCombatAnim.directDamageTotal} HP Seu Líder
                </div>
              )}
              <div className="relative w-11 h-11 shrink-0 flex items-center justify-center filter drop-shadow-[0_0_8px_rgba(245,158,11,0.55)]">
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 rotate-45 rounded-sm" />
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 rotate-0 rounded-sm" />
                <div className="absolute inset-1 bg-stone-950 rounded-full flex items-center justify-center border border-amber-400">
                  <Heart size={15} className="text-rose-500 fill-rose-500" />
                </div>
              </div>

              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-between text-xs font-serif font-bold">
                  <span className="text-amber-200 text-[10px] uppercase tracking-wider truncate">
                    {player.name}
                  </span>
                  <span className="font-mono text-amber-300 font-black text-sm tabular-nums">
                    {player.hp}/{player.maxHp}
                  </span>
                </div>
                <div className="w-full h-3.5 rounded-full bg-stone-950 border border-cyan-500/50 p-0.5 mt-1 flex items-center gap-0.5 overflow-hidden">
                  {Array.from({ length: Math.max(1, player.maxHp) }).map((_, i) => {
                    const isFilled = i < player.hp;
                    const isPinkFairySlot = Boolean(player.corteDasFadasUsed && i < (player.pinkExtraHpSlots || 0));
                    const purpleStartIdx = player.maxHp - (player.purpleExtraHpSlots || 0);
                    const isPurpleSlot = i >= purpleStartIdx;
                    return (
                      <div
                        key={i}
                        title={
                          isPinkFairySlot
                            ? 'Vida Extra Rosa (Corte das Fadas)'
                            : isPurpleSlot
                            ? 'Segmento Extra Roxo (Mipo)'
                            : undefined
                        }
                        className={`flex-1 h-full rounded-xs transition-all duration-300 ${
                          isPinkFairySlot && isFilled
                            ? 'bg-gradient-to-r from-pink-300 via-pink-400 to-fuchsia-500 border border-pink-100 shadow-[0_0_10px_#f472b6]'
                            : isPurpleSlot
                            ? isFilled
                              ? 'bg-gradient-to-r from-purple-400 via-fuchsia-500 to-violet-600 shadow-[0_0_8px_#c084fc]'
                              : 'border border-purple-400/50 bg-purple-950/50'
                            : isFilled
                            ? 'bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_6px_#38bdf8]'
                            : 'bg-stone-800/50'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="w-full flex items-center justify-between px-1">
              <span className="text-[10px] text-stone-400 font-serif">Seu Papel na Rodada:</span>
              <span
                className={`px-2 py-0.5 rounded-md text-[9px] font-serif font-black uppercase tracking-wider border ${
                  isPlayerAttackerRole
                    ? 'bg-rose-950/90 text-rose-300 border-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                    : 'bg-blue-950/90 text-blue-300 border-blue-500/60'
                }`}
              >
                {isPlayerAttackerRole ? '⚔️ Atacante' : '🛡️ Defensor'}
              </span>
            </div>
          </div>
        </div>

      </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODALS */}
      {/* ---------------------------------------------------- */}

      {/* Target Modal (for Spells & on-summon targeting) */}
      {(() => {
        const activeTargetOwnerSide =
          isTestingArena ? turnPlayer : 'player';
        const targetAllyState = activeTargetOwnerSide === 'player' ? player : opponent;
        const targetEnemyState = activeTargetOwnerSide === 'player' ? opponent : player;
        return (
          <TargetSelectModal
            isOpen={targetModal.isOpen}
            title={targetModal.title}
            description={targetModal.description}
            candidates={targetModal.candidates}
            getBadgeLabel={targetModal.getBadgeLabel}
            allyInstanceIds={new Set(targetAllyState.board.map((c) => c.instanceId))}
            enemyInstanceIds={new Set(targetEnemyState.board.map((c) => c.instanceId))}
            allyGroupLabel={`Unidades Aliadas (${targetAllyState.name})`}
            enemyGroupLabel={`Unidades Inimigas (${targetEnemyState.name})`}
            onInspect={(card) => setInspectedCard(card)}
            onSelect={targetModal.onSelect}
            onCancel={() => {
              setTargetModal((prev) => ({ ...prev, isOpen: false, getBadgeLabel: undefined }));
              if (pendingTargetTurnNextRef.current) {
                const next = pendingTargetTurnNextRef.current;
                pendingTargetTurnNextRef.current = null;
                advanceConsumedTurn(next);
              }
            }}
          />
        );
      })()}

      {/* Discard board Modal (5 or 6 cards limit) */}
      <DiscardSelectModal
        isOpen={discardModal.isOpen}
        boardCards={discardModal.ownerId === 'player' ? player.board : opponent.board}
        incomingCardName={discardModal.incomingCard?.name || 'Nova Carta'}
        onInspect={(card) => setInspectedCard(card)}
        onSelectDiscard={(cardToDiscard) => {
          const incoming = discardModal.incomingCard;
          setDiscardModal({ isOpen: false, incomingCard: null, ownerId: 'player' });
          if (!incoming) return;

          if (discardModal.ownerId === 'player') {
            const updatedBoard = player.board.filter((c) => c.instanceId !== cardToDiscard.instanceId);
            setPlayer((p) => ({
              ...p,
              board: updatedBoard,
              graveyard: [...p.graveyard, cardToDiscard],
            }));
            addLog(`Você descartou ${cardToDiscard.name} da sua mesa para abrir espaço.`, 'info');

            executeSummonToBoard(incoming, 'player', updatedBoard);
          } else {
            const updatedBoard = opponent.board.filter((c) => c.instanceId !== cardToDiscard.instanceId);
            setOpponent((p) => ({
              ...p,
              board: updatedBoard,
              graveyard: [...p.graveyard, cardToDiscard],
            }));
            addLog(`${opponent.name} descartou ${cardToDiscard.name} da mesa para abrir espaço.`, 'info');

            executeSummonToBoard(incoming, 'opponent', updatedBoard);
          }
        }}
        onCancel={() => setDiscardModal({ isOpen: false, incomingCard: null, ownerId: 'player' })}
      />

      {/* Reveal Selection Modal (Gohr / Revelação) */}
      <RevealSelectionModal
        isOpen={revealModal.isOpen}
        cards={revealModal.cards}
        onSelectCard={handleSelectRevealedCard}
        mode="revelar"
      />

      {/* Retornar Selection Modal (Kamui / Krust / Reencarnação — escolhe 1 de até 3 cartas do cemitério) */}
      <RevealSelectionModal
        isOpen={retornarModal.isOpen}
        cards={retornarModal.cards}
        onSelectCard={handleSelectRetornarCard}
        mode="retorno"
        title={
          retornarModal.bonusPower > 0 && retornarModal.bonusElement
            ? `RETORNAR · ${retornarModal.sourceName} (+${retornarModal.bonusPower} Poder se ${retornarModal.bonusElement})`
            : `RETORNAR · ${retornarModal.sourceName}`
        }
        description={
          retornarModal.bonusPower > 0 && retornarModal.bonusElement
            ? `Escolha 1 entre até 3 cartas aleatórias da sua Cripta para retornar à mão. Cartas da classe ${retornarModal.bonusElement.toUpperCase()} recebem +${retornarModal.bonusPower} de Poder!`
            : 'Escolha 1 entre até 3 cartas aleatórias da sua Cripta para retornar imediatamente para a sua mão.'
        }
      />

      {/* Blocker Selection Modal */}
      {assigningBlockForAttacker && (
        <TargetSelectModal
          isOpen={Boolean(assigningBlockForAttacker)}
          title={`Escolher Defensor contra ${assigningBlockForAttacker.name}`}
          description={`Selecione uma carta disponível da sua mesa para bloquear o ataque (${calculateCombatDamage(assigningBlockForAttacker, undefined, false, votoSilencioActive, activeCombatAttackerRole === 'player' ? player.board : opponent.board)} Dano). Cada defensor bloqueia apenas 1 atacante.`}
          candidates={(activeCombatAttackerRole === 'player' ? opponent.board : player.board).filter((d) => {
            // Cannot be already assigned to any attacker (strictly 1-to-1!)
            const alreadyAssigned = Object.values(assignedBlocks).includes(d.instanceId);
            if (alreadyAssigned) return false;
            // Cannot defend if immobile or Lâmina do Inverno
            if (d.conditions.has('atordoado') || d.conditions.has('dormindo') || d.templateId === 'm_lamina_inverno') return false;
            // Etéreo constraint (só pode ser bloqueado por outra unidade Etérea)
            if (assigningBlockForAttacker.conditions.has('etereo') && !d.conditions.has('etereo')) {
              return false;
            }
            // Furtividade constraint
            if (assigningBlockForAttacker.conditions.has('furtividade') && !d.conditions.has('furtividade')) {
              return false;
            }
            return true;
          })}
          onInspect={(card) => setInspectedCard(card)}
          onSelect={(chosenDef) => {
            handleAssignBlocker(assigningBlockForAttacker.instanceId, chosenDef.instanceId);
          }}
          onCancel={() => setAssigningBlockForAttacker(null)}
        />
      )}

      {/* Umael o Arcanjo Summon Modal: choose ally to receive Enfrentar */}
      {umaelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-2xl border-2 border-amber-500/60 bg-gradient-to-b from-stone-950 via-stone-900 to-amber-950/40 p-6 shadow-2xl text-stone-200">
            <button
              onClick={() => {
                setUmaelModal(null);
                flushPendingSummonTargetTurn();
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-amber-500/20 pb-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/40 text-2xl">
                ⚔️
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-widest uppercase text-amber-400">
                  Efeito Exclusivo · Invocação de Arcanjo
                </div>
                <h3 className="text-lg font-serif font-black text-amber-200">
                  Umael, o Arcanjo — Conceder Enfrentar
                </h3>
                <p className="text-xs text-stone-400">
                  Escolha uma unidade aliada na sua mesa para conceder a condição permanente <strong className="text-amber-300">Enfrentar</strong> (ela poderá escolher e forçar defensores ao atacar):
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 max-h-[55vh] overflow-y-auto py-3">
              {umaelModal.allies.map((ally) => {
                const handleGrantEnfrentar = () => {
                  const allySide = umaelModal.ownerId === 'player' ? 'player' : 'opponent';
                  const setOwnerState = umaelModal.ownerId === 'player' ? setPlayer : setOpponent;
                  ally.conditions.add('enfrentar');
                  setCardConditionSource(ally, 'enfrentar', 'unidade_compartilhada', umaelModal.umaelCard.name);
                  setOwnerState((prev) => ({
                    ...prev,
                    board: prev.board.map((u) => {
                      if (u.instanceId === ally.instanceId) {
                        const conds = new Set(u.conditions);
                        conds.add('enfrentar');
                        return {
                          ...u,
                          conditions: conds,
                          conditionSources: withConditionSource(u.conditionSources, 'enfrentar', 'unidade_compartilhada', umaelModal.umaelCard.name),
                        };
                      }
                      return u;
                    }),
                  }));
                  sound.playSpell();
                  queueUnitVfx({
                    type: 'umael_imposicao_duelo',
                    sourceId: umaelModal.umaelCard.instanceId,
                    targetIds: [ally.instanceId],
                    ownerSide: allySide,
                  });
                  queueConditionVfx([
                    {
                      condition: 'enfrentar',
                      targetUnitId: ally.instanceId,
                      targetUnitName: ally.name,
                      targetSide: allySide,
                    },
                  ]);
                  addLog(`🗡️ Efeito Exclusivo: Umael concedeu o efeito Enfrentar permanente a ${ally.name}!`, 'spell');
                  setUmaelModal(null);
                  flushPendingSummonTargetTurn();
                };

                return (
                  <div
                    key={ally.instanceId}
                    className="rounded-xl transition-all duration-150 active:scale-95 hover:ring-2 hover:ring-emerald-400/90 hover:shadow-[0_0_20px_rgba(16,185,129,0.45)]"
                  >
                    <CardView
                      card={ally}
                      size="sm"
                      isPlayable={true}
                      actionLabel="Conceder Enfrentar"
                      onClick={handleGrantEnfrentar}
                      onInspect={() => setInspectedCard(ally)}
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-stone-400">
                Clique diretamente na carta aliada para conceder Enfrentar · Use 👁️ para inspecionar
              </span>
              <button
                onClick={() => {
                  addLog(
                    `${umaelModal.ownerId === 'player' ? player.name : opponent.name} optou por não conceder Enfrentar a outra unidade.`,
                    'info'
                  );
                  setUmaelModal(null);
                  flushPendingSummonTargetTurn();
                }}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs rounded-xl font-medium transition-colors cursor-pointer"
              >
                Não Conceder / Pular
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enfrentar Attack Target Declaration Modal */}
      {enfrentarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-3xl border-2 border-amber-500 bg-gradient-to-b from-stone-950 via-stone-900 to-amber-950/60 p-6 shadow-[0_0_50px_rgba(245,158,11,0.35)] text-stone-200">
            <div className="flex items-center gap-3 border-b border-amber-500/30 pb-4 mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 text-black font-black text-2xl shadow-lg shadow-amber-500/40">
                ⚔️
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-bold tracking-widest uppercase text-amber-400">
                  Condição Ativa · Ato de Ataque
                </div>
                <h3 className="text-xl font-serif font-black text-amber-200">
                  Enfrentar: {enfrentarModal.currentAttacker.name}
                </h3>
                <p className="text-xs text-stone-300 mt-0.5 leading-relaxed">
                  Esta unidade possui a condição <strong className="text-amber-300">Enfrentar</strong>! Você pode escolher qual carta inimiga será FORÇADA a defender o seu ataque, ou deixar a escolha livre para o jogador defensor.
                </p>
              </div>
            </div>

            <div className="mb-2 text-xs font-semibold text-stone-400 flex items-center justify-between">
              <span>Unidades inimigas disponíveis para forçar defesa:</span>
              <span className="text-amber-400 font-mono text-[11px]">
                Fila de Enfrentar: {enfrentarModal.attackerQueue.length} atacante(s)
              </span>
            </div>

            {enfrentarModal.enemyCandidates.length === 0 ? (
              <div className="text-center py-8 text-stone-400 text-xs bg-stone-900/60 rounded-2xl border border-white/5 my-2">
                Nenhum defensor inimigo apto para ser forçado nesta rodada.
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-4 max-h-[50vh] overflow-y-auto py-3 bg-rose-950/20 rounded-2xl border border-rose-500/30 p-3">
                {enfrentarModal.enemyCandidates.map((enemyCard) => (
                  <div
                    key={enemyCard.instanceId}
                    className="rounded-xl transition-all duration-150 active:scale-95 hover:ring-2 hover:ring-rose-400/90 hover:shadow-[0_0_20px_rgba(244,63,94,0.45)]"
                  >
                    <CardView
                      card={enemyCard}
                      size="sm"
                      isPlayable={true}
                      actionLabel="Forçar Defesa"
                      onClick={() => handleSelectForcedDefender(enemyCard)}
                      onInspect={() => setInspectedCard(enemyCard)}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-stone-400 italic">
                Clique diretamente na carta inimiga para forçar defesa · Ou deixe livre para o defensor escolher.
              </span>
              <button
                onClick={handleSkipForcedDefender}
                className="w-full sm:w-auto px-5 py-2.5 bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 font-bold text-xs rounded-xl transition-all hover:scale-105 shadow cursor-pointer"
              >
                Deixar Livre (Escolha do Defensor) 🛡️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Coin & Golden Wave Beams Round Transition, Counter-Response Modal, Draw & Discard Animations Overlay */}
      <CardActionAnimationsOverlay
        drawEvents={drawEvents}
        discardEvents={discardEvents}
        floatingSkillCards={floatingSkillCards}
        roundCoinTransition={roundCoinTransition}
        counterResponseModal={
          pendingSpell
            ? (() => {
                const responderId: 'player' | 'opponent' = pendingSpell.casterId === 'player' ? 'opponent' : 'player';
                const responderState = responderId === 'player' ? player : opponent;
                const casterState = pendingSpell.casterId === 'player' ? player : opponent;
                const vetoCard = responderState.hand.find(
                  (c) =>
                    (c.templateId === 'n_veto_do_indomito' ||
                      c.name.toLowerCase().includes('veto do indômito') ||
                      c.name.toLowerCase().includes('veto do indomito')) &&
                    (isTestingArena || isTierAllowedInRound(c.tier, round, c))
                );
                const isInteractiveResponder = isOnlinePvp
                  ? responderId === 'player'
                  : !responderState.isAi || isTestingArena;
                return {
                  spellCard: pendingSpell.spellCard,
                  casterName: casterState.name,
                  defenderName: responderState.name,
                  targetName: pendingSpell.targetName,
                  canInteractiveDefenderRespond: isInteractiveResponder && Boolean(vetoCard),
                  onUseVeto: () => {
                    if (vetoCard) {
                      handlePlayCard(vetoCard, responderId);
                    }
                  },
                  onLetResolve: () => {
                    handlePassTurn(false);
                  },
                } satisfies CounterResponseModalData;
              })()
            : null
        }
        playerName={player.name}
        opponentName={opponent.name}
      />

      {/* Universal Cinematic Level Up Overlay (Full Animated & Static Modes) */}
      {cinematicLevelUp && (
        <LevelUpCinematicOverlay
          key={cinematicLevelUp.id}
          card={cinematicLevelUp.card}
          awakenedPowerText={cinematicLevelUp.awakenedPowerText}
          isStaticMode={animationMode !== 'full' || !combatAnimations}
          onComplete={() =>
            setCinematicLevelUpQueue((prev) => prev.slice(1))
          }
        />
      )}

      {/* Draw & Discard animations are now rendered via CardActionAnimationsOverlay */}

      {/* Card Detail Modal (with direct Play CTA when inspecting a card in hand) */}
      {(() => {
        let modalPlayHandler: (() => void) | undefined = undefined;
        let modalCanPlay = false;
        let modalPlayLabel: string | undefined = undefined;
        let modalPlayDisabledReason: string | undefined = undefined;

        if (inspectedCard) {
          const inPlayerHand = player.hand.some((c) => c.instanceId === inspectedCard.instanceId);
          const inOpponentHand = isTestingArena && opponent.hand.some((c) => c.instanceId === inspectedCard.instanceId);
          const handOwnerId: 'player' | 'opponent' | null = inPlayerHand
            ? 'player'
            : inOpponentHand
            ? 'opponent'
            : null;

          if (handOwnerId) {
            const handOwner = handOwnerId === 'player' ? player : opponent;
            const isOwnersTurn = turnPlayer === handOwnerId;
            const isTierAllowed = isTestingArena || isTierAllowedInRound(inspectedCard.tier, round, inspectedCard);
            const hasCraff = handOwner.board.some(
              (c) => (c.templateId === 'g_craff' || c.name.toLowerCase().includes('craff')) && c.hp > 0 && c.silencedRounds === 0
            );
            const maxAllowedSummons = hasCraff ? 3 : 2;
            const isSummonsMaxed = !isTestingArena && inspectedCard.type === 'unit' && handOwner.summonsThisRound >= maxAllowedSummons;
            const isAtormentadorPiece =
              inspectedCard.templateId === 'm_tor' ||
              inspectedCard.templateId === 'm_men' ||
              inspectedCard.templateId === 'm_tador';
            const isAtormentadorBlocked =
              isAtormentadorPiece && Boolean(handOwner.atormentadorPieceSummonedThisRound);
            const isOSolCard =
              inspectedCard.templateId === 'n_o_sol' ||
              inspectedCard.name.trim().toLowerCase().startsWith('o sol');
            const hasHelioLvl2 = handOwner.board.some(
              (c) =>
                (c.templateId === 'n_helio' || c.name.toLowerCase().includes('helio') || c.name.toLowerCase().includes('hélio')) &&
                c.level === 2 &&
                c.hp > 0 &&
                c.silencedRounds === 0
            );
            const isOSolBlocked = isOSolCard && !hasHelioLvl2;
            const isALuaCard =
              inspectedCard.templateId === 'g_a_lua' ||
              inspectedCard.name.trim().toLowerCase().startsWith('a lua');
            const hasLunarioLvl2 = handOwner.board.some(
              (c) =>
                (c.templateId === 'g_lunario' || c.name.toLowerCase().includes('lunario')) &&
                c.level === 2 &&
                c.hp > 0 &&
                c.silencedRounds === 0
            );
            const isALuaBlocked = isALuaCard && !hasLunarioLvl2;
            const isZykCard =
              inspectedCard.templateId === 'g_zyk' || inspectedCard.name.toLowerCase().includes('zyk');
            const zykCandidates =
              handOwner.hand.filter((c) => c.instanceId !== inspectedCard.instanceId).length + handOwner.board.length;
            const isZykBlocked = isZykCard && zykCandidates < 2;
            const isBlockedByCounter =
              Boolean(pendingSpell) &&
              (inspectedCard.type === 'unit' || (inspectedCard.speed !== 'rapida' && !inspectedCard.isFugaz));
            const isVetoWithoutPending =
              !isTestingArena && !pendingSpell && inspectedCard.templateId === 'n_veto_do_indomito';

            modalCanPlay =
              !isDefendingPhase &&
              (isOwnersTurn || isTestingArena) &&
              isTierAllowed &&
              !isSummonsMaxed &&
              !isAtormentadorBlocked &&
              !isOSolBlocked &&
              !isALuaBlocked &&
              !isZykBlocked &&
              !isBlockedByCounter &&
              !isVetoWithoutPending;

            if (isDefendingPhase) modalPlayDisabledReason = 'Fase de Defesa';
            else if (!isOwnersTurn && !isTestingArena) modalPlayDisabledReason = 'Aguarde sua vez';
            else if (isBlockedByCounter) modalPlayDisabledReason = 'Apenas Rápidas/Fugazes';
            else if (isVetoWithoutPending) modalPlayDisabledReason = 'Só na Contra-Resposta';
            else if (isOSolBlocked) modalPlayDisabledReason = 'Requer Hélio Nv. 2';
            else if (isALuaBlocked) modalPlayDisabledReason = 'Requer Lunário Nv. 2';
            else if (isZykBlocked) modalPlayDisabledReason = 'Requer 2 sacrifícios';
            else if (!isTierAllowed) modalPlayDisabledReason = `Requer Rodada maior (T${inspectedCard.tier})`;
            else if (isSummonsMaxed) modalPlayDisabledReason = `Limite de ${maxAllowedSummons} invocações`;
            else if (isAtormentadorBlocked) modalPlayDisabledReason = '1 peça por rodada';

            modalPlayLabel =
              inspectedCard.type === 'unit'
                ? 'Invocar na Mesa'
                : pendingSpell
                ? 'Responder com Habilidade'
                : 'Lançar Habilidade';

            modalPlayHandler = () => {
              handlePlayCardRef.current(inspectedCard, handOwnerId);
            };
          }
        }

        return (
          <CardModal
            card={inspectedCard}
            onClose={() => setInspectedCard(null)}
            hasOVazioActive={pHasOVazio || oHasOVazio}
            board={
              inspectedCard
                ? player.board.some((c) => c.instanceId === inspectedCard.instanceId)
                  ? player.board
                  : opponent.board.some((c) => c.instanceId === inspectedCard.instanceId)
                  ? opponent.board
                  : undefined
                : undefined
            }
            votoSilencioActive={votoSilencioActive}
            onPlayFromModal={modalPlayHandler}
            canPlayFromModal={modalCanPlay}
            playButtonLabel={modalPlayLabel}
            playDisabledReason={modalPlayDisabledReason}
          />
        );
      })()}

      {/* Mobile Crônicas Full Combat History Drawer */}
      {isMobileLogOpen && (
        <div
          onClick={() => setIsMobileLogOpen(false)}
          className="fixed inset-0 z-[75] flex items-center justify-center bg-black/80 p-3 sm:p-5 select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[84dvh] flex flex-col rounded-2xl bg-gradient-to-b from-[#151029] via-[#0c0918] to-[#080612] border border-amber-500/45 shadow-2xl overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-amber-500/25 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2">
                <ScrollText size={16} className="text-amber-400" />
                <h3 className="font-serif font-black text-sm uppercase tracking-wider text-amber-200">
                  Crônicas do Combate ({logs.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileLogOpen(false)}
                className="min-w-[40px] min-h-[40px] rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 flex items-center justify-center cursor-pointer"
                aria-label="Fechar Crônicas"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {logs.length === 0 ? (
                <div className="py-8 text-center text-xs text-stone-400 font-serif">
                  Nenhum evento registrado ainda nesta batalha.
                </div>
              ) : (
                logs.map((entry, idx) => {
                  const toneClass =
                    entry.type === 'attack' || entry.type === 'kill'
                      ? 'border-rose-500/35 bg-rose-950/35 text-rose-100'
                      : entry.type === 'defense'
                      ? 'border-cyan-500/35 bg-cyan-950/35 text-cyan-100'
                      : entry.type === 'spell'
                      ? 'border-purple-500/35 bg-purple-950/35 text-purple-100'
                      : entry.type === 'round'
                      ? 'border-amber-500/45 bg-amber-950/40 text-amber-100'
                      : 'border-stone-700/60 bg-stone-900/60 text-stone-200';
                  return (
                    <div
                      key={entry.id || idx}
                      className={`px-3 py-2 rounded-xl border text-xs leading-snug ${toneClass}`}
                    >
                      {entry.text}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rules Manual Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      {/* Finishing Cannon Strike Cinematic Animation */}
      {finishingCannonAnim && (
        <FinishingCannonOverlay
          victor={finishingCannonAnim.victor}
          stage={finishingCannonAnim.stage}
          playerName={player.name}
          opponentName={opponent.name}
        />
      )}

      {/* Exclusive Celestial Council Victory Animation (Aliança Angiris) */}
      <CelestialCouncilVictoryOverlay
        state={celestialVictoryAnim}
        playerName={player.name}
        opponentName={opponent.name}
      />

      {/* Efeitos Visuais Elementais de Partículas (Fogo, Gelo, Terra, etc.) */}
      <ElementalParticleCanvas
        burst={elementalBurst}
        onComplete={() => setElementalBurst(null)}
      />

      {/* Animação Especial de Tornado de Gelo da Habilidade Crio-Gênese */}
      <CrioGeneseVfxOverlay
        vfx={crioGeneseVfx}
        onComplete={() => setCrioGeneseVfx(null)}
      />

      {/* Animações Especiais das Cartas de Habilidade (Enganar, Levantar Moral, Labareda Solar, Desafio Real, etc.) */}
      <SkillAnimationsOverlay
        vfx={skillVfx}
        onComplete={() => setSkillVfx(null)}
      />

      {/* Overlay Canvas 60fps para Efeitos de Condição em Campo */}
      <ConditionVisualEffectsOverlay
        events={conditionVfxEvents}
        onComplete={() => setConditionVfxEvents([])}
      />

      {/* Overlay Canvas 60fps para Efeitos Exclusivos de Unidades */}
      <UnitAnimationsOverlay
        vfx={activeUnitVfx}
        onComplete={handleUnitVfxComplete}
      />

      {/* Correntes Visuais Contínuas de Barelio, o Carcereiro ligando-o à unidade capturada na mesa */}
      <BarelioBoardChainsOverlay
        links={[...player.board, ...opponent.board]
          .filter((u) => u.hp > 0 && Boolean(u.imprisonedUnit))
          .map((u) => ({
            captorId: u.instanceId,
            prisonerId: u.imprisonedUnit!.instanceId,
          }))}
      />

      {/* Banner de Vitória por W.O. (Inatividade do Adversário) */}
      {woBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-gradient-to-b from-amber-950 via-stone-900 to-stone-950 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-[0_0_60px_rgba(245,158,11,0.5)]">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-inner">
              🏆
            </div>
            <h2 className="text-2xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-300 tracking-wider uppercase mb-2">
              Vitória por W.O.!
            </h2>
            <div className="text-xs font-mono text-amber-400/90 bg-amber-950/60 border border-amber-500/30 rounded-xl p-2.5 mb-4">
              {woBanner.message}
            </div>
            <p className="text-xs text-stone-300 mb-6">
              A inatividade prolongada do adversário encerrou o duelo com pontuação integral concedida ao vencedor.
            </p>
            <button
              onClick={() => setWoBanner(null)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-black text-sm uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-amber-500/30"
            >
              Ver Detalhes do Duelo
            </button>
          </div>
        </div>
      )}

      {/* Game Over / Victory Modal */}
      <GameOverModal
        isOpen={Boolean(gameOverWinner && !woBanner && !onlineRematchPrep && !localAiRematchDeadline)}
        winner={gameOverWinner || 'player'}
        playerHp={player.hp}
        opponentHp={opponent.hp}
        totalRounds={round}
        reason={gameOverReason}
        matchType={matchType}
        rankDelta={rankDelta}
        currentRankPoints={currentRankPoints}
        isOnlinePvp={isOnlinePvp}
        isTutorialMode={isTutorialMode}
        tutorialRewardResult={tutorialRewardResult}
        rematchStatus={rematchStatus}
        rematchStatusMessage={rematchStatusMessage}
        incomingRematchFrom={incomingRematchFrom}
        onRequestRematch={handleRequestRematch}
        onRespondRematch={handleRespondRematch}
        onGoToLobby={() => (onGoToLobby ? onGoToLobby() : onExitToTitle())}
        onHome={onExitToTitle}
      />

      {/* Rematch Deck Preparation Modal (Online PvP) */}
      {onlineRematchPrep && (() => {
        const localIsHost = onlineRematchPrep.seat === 'host';
        const localDto = localIsHost ? onlineRematchPrep.host : onlineRematchPrep.guest;
        const oppDto = localIsHost ? onlineRematchPrep.guest : onlineRematchPrep.host;
        return (
          <RematchPrepModal
            isOpen={true}
            modeLabel={onlineRematchPrep.matchType === 'ranked' ? 'PvP Ranqueado' : 'PvP Normal'}
            isRanked={onlineRematchPrep.matchType === 'ranked'}
            roomCode={onlineRematchPrep.roomCode}
            deadlineAt={onlineRematchPrep.deadlineAt}
            totalDurationSeconds={30}
            localParticipant={{
              nickname: localDto.nickname,
              subtitle: `Nv. ${localDto.level} · Rank ${localDto.rankTier} · ${localDto.rankPoints} RP`,
              deckName: activeDeckName || localDto.deckName,
              ready: localDto.ready,
              isLocal: true,
            }}
            opponentParticipant={{
              nickname: oppDto.nickname,
              subtitle: `Nv. ${oppDto.level} · Rank ${oppDto.rankTier} · ${oppDto.rankPoints} RP`,
              deckName: oppDto.deckName,
              ready: oppDto.ready,
              isLocal: false,
            }}
            onToggleReady={() => {
              pvpSocket.updateRematchPrep({
                ready: !localDto.ready,
                deckName: activeDeckName || localDto.deckName,
                deckCardIds: customPlayerDeckCardIds,
              });
            }}
            onOpenDeckSelector={() => onOpenDeckSelector?.()}
            onCancel={onExitToTitle}
          />
        );
      })()}

      {/* Rematch Deck Preparation Modal (PvIA) */}
      {!isOnlinePvp && localAiRematchDeadline !== null && (
        <RematchPrepModal
          isOpen={true}
          modeLabel={matchType === 'ranked' ? 'PvIA · Ranqueado' : 'PvIA · Normal'}
          isRanked={matchType === 'ranked'}
          deadlineAt={localAiRematchDeadline}
          totalDurationSeconds={30}
          localParticipant={{
            nickname: player.name,
            subtitle: 'Duelista · Preparando Revanche',
            deckName: activeDeckName || 'Meu Baralho',
            ready: false,
            isLocal: true,
          }}
          opponentParticipant={{
            nickname: 'IA Estratégica',
            subtitle: 'IA Tática · Pronta para o Duelo',
            deckName: 'Baralho Tático Aleatório',
            ready: true,
            isLocal: false,
          }}
          onToggleReady={handleStartAiRematchFromPrep}
          onTimerExpired={handleStartAiRematchFromPrep}
          onOpenDeckSelector={() => onOpenDeckSelector?.()}
          onCancel={() => setLocalAiRematchDeadline(null)}
        />
      )}

      {/* Action Confirmation Modal (Voto do Silêncio) */}
      {confirmModal && (
        <ConfirmActionModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          description={confirmModal.description}
          confirmLabel={confirmModal.confirmLabel}
          cancelLabel={confirmModal.cancelLabel}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => {
            if (confirmModal.onCancel) confirmModal.onCancel();
            setConfirmModal(null);
          }}
        />
      )}

      {/* Projectile animation overlay (Fagulha Estelar, Flecha Elétrica) */}
      {projectileAnim && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="relative flex flex-col items-center">
            {projectileAnim.type === 'fagulhas' && (
              <div className="relative w-48 h-48 flex items-center justify-center">
                <div className="absolute text-5xl animate-star-strike-1 drop-shadow-[0_0_25px_#38bdf8]">
                  ⭐✨
                </div>
                <div className="absolute text-5xl animate-star-strike-2 drop-shadow-[0_0_35px_#60a5fa]">
                  🌟✨
                </div>
              </div>
            )}
            {projectileAnim.type === 'flecha_eletrica' && (
              <div className="relative w-64 h-48 flex items-center justify-center">
                <div className="text-6xl animate-electric-arrow drop-shadow-[0_0_40px_#facc15]">
                  ⚡🏹⚡
                </div>
              </div>
            )}
            <div className="mt-4 px-4 py-1.5 rounded-full bg-black/85 border border-white/20 text-xs font-bold text-amber-300 shadow-2xl backdrop-blur-sm">
              Alvo: {projectileAnim.targetName}
            </div>
          </div>
        </div>
      )}

      {/* Zyk Discard Tribute Modal */}
      {zykDiscardModal && (
        <ZykDiscardModal
          isOpen={zykDiscardModal.isOpen}
          handCards={(zykDiscardModal.ownerId === 'opponent' ? opponent.hand : player.hand).filter((c) => c.instanceId !== zykDiscardModal.zykCard.instanceId)}
          boardCards={zykDiscardModal.ownerId === 'opponent' ? opponent.board : player.board}
          selectedCardIds={zykDiscardModal.selectedCardIds}
          isBoardFull={(zykDiscardModal.ownerId === 'opponent' ? opponent.board : player.board).length >= ((zykDiscardModal.ownerId === 'opponent' ? opponent.maxBoardSlots : player.maxBoardSlots) ?? 5)}
          onToggleSelect={handleToggleZykCardSelect}
          onConfirm={handleConfirmZykSacrifice}
          onCancel={() => setZykDiscardModal(null)}
        />
      )}

      {/* Sorteio da Moeda Mágica (Iniciativa de Rodada 1) */}
      <MagicCoinModal
        isOpen={isMagicCoinOpen}
        onCoinResolved={handleCoinResolved}
      />

      {/* Tutorial Interativo Obrigatório & Modo Guiado PvIA */}
      {(isTutorialMode || isGuidedPviaMode) && (() => {
        const playerHasCraff = player.board.some(
          (c) => (c.templateId === 'g_craff' || c.name.toLowerCase().includes('craff')) && c.silencedRounds === 0
        );
        const maxAllowedSummons = playerHasCraff ? 3 : 2;
        const maxBoardSlots = player.maxBoardSlots ?? 5;
        const hasPlayableUnitInHand =
          player.board.length < maxBoardSlots &&
          player.summonsThisRound < maxAllowedSummons &&
          player.hand.some((c) => c.type === 'unit' && isTierAllowedInRound(c.tier, round, c));
        const hasPlayableSkillInHand = player.hand.some(
          (c) => c.type === 'skill' && isTierAllowedInRound(c.tier, round, c)
        );
        const canDeclareAttackNow =
          attackerRole === 'player' &&
          !hasAttackedThisRound &&
          player.board.some(
            (u) =>
              u.templateId !== 'm_lamina_inverno' &&
              !u.conditions.has('atordoado') &&
              !u.conditions.has('dormindo')
          );

        return (
          <CombatTutorialOverlay
            isActive={tutorialOverlayActive && !gameOverWinner && !isMagicCoinOpen}
            mode={isTutorialMode ? 'tutorial' : 'guided_pvia'}
            round={round}
            turnPlayer={turnPlayer}
            attackerRole={attackerRole}
            playerBoardCount={player.board.length}
            opponentBoardCount={opponent.board.length}
            selectedAttackerCount={selectedAttackerIds.length}
            isDefendingPhase={isDefendingPhase}
            assignedBlocksCount={Object.keys(assignedBlocks).length}
            isCombatAnimating={Boolean(tableCombatAnim)}
            hasPlayerAttackedThisRound={hasAttackedThisRound}
            summonsThisRound={player.summonsThisRound}
            maxAllowedSummons={maxAllowedSummons}
            hasPlayableUnitInHand={hasPlayableUnitInHand}
            hasPlayableSkillInHand={hasPlayableSkillInHand}
            canDeclareAttackNow={canDeclareAttackNow}
            willPassEndRound={willPassEndRound}
            isPostAttackFinalTurn={isPostAttackFinalTurn}
            attackerConsecutivePasses={attackerConsecutivePasses}
            turnTimeLeft={turnTimeLeft}
            playerOrbActionCount={playerOrbActionCount}
            playerDefenseCompletedCount={playerDefenseCompletedCount}
            playerAttackCompletedCount={playerAttackCompletedCount}
            opponentHp={opponent.hp}
            playerHp={player.hp}
            winner={gameOverWinner}
            onDismissGuided={isGuidedPviaMode ? () => setTutorialOverlayActive(false) : undefined}
          />
        );
      })()}

      {/* Grimório da Arena de Testes (Gaveta de Cartas e Controles de Treino) */}
      {isTestingArena && (
        <TestingArenaDrawer
          isOpen={isTestingDrawerOpen}
          onClose={() => setIsTestingDrawerOpen(false)}
          onAddCardToHand={handleTestingAddCardToHand}
          onAddCardToEnemyHand={handleTestingAddCardToEnemyHand}
          onSummonCardToBoard={handleTestingSummonToBoard}
          onSummonCardToEnemyBoard={handleTestingSummonToEnemyBoard}
          onCastSkillCard={(skillCard) => {
            setIsTestingDrawerOpen(false);
            handleCastSpell(skillCard, turnPlayer);
          }}
          onClearPlayerBoard={handleTestingClearPlayerBoard}
          onClearEnemyBoard={handleTestingClearEnemyBoard}
          onClearHand={handleTestingClearHand}
          onClearEnemyHand={handleTestingClearEnemyHand}
          onRespawnDummies={handleTestingRespawnDummies}
          onSummonDummy={handleTestingSummonDummy}
          onPutCardOnTopOfDeck={(card) => handleTestingPutCardOnTopOfDeck(card, 'player')}
          currentTopCardName={player.deck[0]?.name}
          deckCount={player.deck.length}
        />
      )}

      {/* Graveyard / Cemitério Inspection Modal */}
      {graveyardModalOwner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setGraveyardModalOwner(null)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-3xl border-2 border-cyan-500/40 bg-gradient-to-b from-[#151421] via-[#0f0e17] to-[#09080d] p-5 sm:p-6 shadow-2xl text-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-black text-amber-300">
                    Cemitério / Descarte — {graveyardModalOwner === 'player' ? player.name : opponent.name}
                  </h3>
                  <p className="text-xs text-stone-400">
                    {(graveyardModalOwner === 'player' ? player.graveyard : opponent.graveyard).length} carta(s) caída(s) ou utilizada(s) nesta partida · Clique em qualquer carta para inspecionar
                  </p>
                </div>
              </div>
              <button
                onClick={() => setGraveyardModalOwner(null)}
                className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              {(graveyardModalOwner === 'player' ? player.graveyard : opponent.graveyard).length === 0 ? (
                <div className="py-16 text-center text-stone-500 text-sm italic">
                  Nenhuma carta foi enviada ao cemitério ainda.
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {(graveyardModalOwner === 'player' ? player.graveyard : opponent.graveyard).map((deadCard, idx) => (
                    <div key={`${deadCard.instanceId}_${idx}`} className="flex flex-col items-center gap-1">
                      <CardView
                        card={deadCard}
                        size="sm"
                        isPlayable={false}
                        onClick={() => setInspectedCard(deadCard)}
                        onInspect={() => setInspectedCard(deadCard)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Mobile Drag Preview */}
      {mobileDragCard?.isDragging && (
        <div
          className="fixed z-[95] pointer-events-none"
          style={{
            left: mobileDragCard.currentX,
            top: mobileDragCard.currentY,
            transform: 'translate(-50%, -62%) scale(0.62)',
          }}
        >
          <div
            className={`rounded-2xl p-1 transition-all ${
              mobileDragCard.isOverTable
                ? mobileDragCard.isPlayable
                  ? 'ring-4 ring-emerald-400 shadow-[0_0_28px_rgba(16,185,129,0.8)]'
                  : 'ring-4 ring-rose-500 shadow-[0_0_28px_rgba(244,63,94,0.8)]'
                : 'ring-2 ring-amber-400/80 shadow-[0_0_22px_rgba(245,158,11,0.55)]'
            }`}
          >
            <CardView
              card={mobileDragCard.card}
              size="sm"
              isPlayable={mobileDragCard.isPlayable}
              hasAliancaAngiris={hasAliancaAngiris(
                mobileDragCard.card,
                mobileDragCard.ownerId === 'player' ? player.board : opponent.board
              )}
              hasOVazioActive={mobileDragCard.ownerId === 'player' ? pHasOVazio : oHasOVazio}
            />
          </div>
        </div>
      )}

      {/* Unmistakable Turn Alternation Banner & Edge Flash */}
      <TurnTransitionBanner
        banner={turnTransitionBanner}
        mode={effectiveTurnIndicatorMode}
        reduceBlur={reduceGpuBlur}
      />

      {/* Arena Card Hover Effect & Passives Preview (Board + Face-Up Hand) */}
      <ArenaCardHoverPreview
        card={resolvedHoveredArenaCard?.card || null}
        anchorRect={resolvedHoveredArenaCard?.rect || null}
        hasAliancaAngiris={resolvedHoveredArenaCard?.hasAliancaAngiris}
        zone={resolvedHoveredArenaCard?.zone}
      />

      {/* Settings Modal (Sons, Visual/Mobile-Mesa, Temas & Regras) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenRules={() => setIsRulesOpen(true)}
      />
    </div>
  );
};
