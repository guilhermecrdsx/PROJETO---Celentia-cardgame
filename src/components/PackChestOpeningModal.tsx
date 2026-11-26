import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Gem, SkipForward, Sparkles, X } from 'lucide-react';
import { CardTemplate } from '../types/game';
import { createCardInstance } from '../logic/deckFactory';
import { CardView } from './CardView';
import { ELEMENT_CONFIG } from '../utils/cardVisuals';
import { sound } from '../services/soundEffects';
import type { PackDropItemDTO } from '../services/accountApi';
import type { PackType } from '../data/packs';
import { useVisualPreferences } from '../utils/visualTheme';

export interface PackChestRevealResult {
  drops: Array<PackDropItemDTO & { template: CardTemplate }>;
  totalRefundCrystals: number;
  usedFreePack: boolean;
}

interface PackChestOpeningModalProps {
  isOpen: boolean;
  packId: PackType;
  packName: string;
  packSubtitle?: string;
  usedFreePack?: boolean;
  result: PackChestRevealResult | null;
  onClose: () => void;
  onInspectCard: (template: CardTemplate) => void;
}

type ChestStage = 'shaking' | 'burst' | 'revealed';

interface ChestRarityVisual {
  label: string;
  shakingText: string;
  burstText: string;
  rumbleClass: string;
  bodyStops: [string, string, string];
  lidStops: [string, string, string];
  trimStops: [string, string, string, string, string];
  trimHorizStops: [string, string, string, string, string];
  seamColor: string;
  seamGlow: string;
  coreGlow: string;
  backdropShake: string;
  backdropBurst: string;
  sunburstGradient: string;
  shockwaveClass: string;
  sparkColors: string[];
  modalBorderClass: string;
  modalHairlineClass: string;
  titleColorClass: string;
  accentTextClass: string;
  sealKind: 'iron' | 'emerald' | 'sapphire' | 'amethyst' | 'crown' | 'clover';
  showArcaneOrbit?: boolean;
  showSkyBeam?: boolean;
  showDoubleShockwave?: boolean;
  showPrismaticHalo?: boolean;
}

const CHEST_RARITY_VISUALS: Record<PackType, ChestRarityVisual> = {
  common: {
    label: 'Baú Comum · Tier 1',
    shakingText: 'Destrancando o Baú de Ferro...',
    burstText: 'Baú Comum Aberto!',
    rumbleClass: 'animate-chest-rumble-common',
    bodyStops: ['#333742', '#1d2029', '#101218'],
    lidStops: ['#474d5c', '#262a36', '#161922'],
    trimStops: ['#e2e8f0', '#94a3b8', '#475569', '#cbd5e1', '#64748b'],
    trimHorizStops: ['#64748b', '#e2e8f0', '#94a3b8', '#f1f5f9', '#475569'],
    seamColor: '#fde68a',
    seamGlow: 'rgba(245, 158, 11, 0.8)',
    coreGlow: 'radial-gradient(circle, rgba(226, 232, 240, 0.55) 0%, rgba(245, 158, 11, 0.22) 55%, transparent 78%)',
    backdropShake: 'radial-gradient(circle at 50% 50%, rgba(148, 163, 184, 0.16) 0%, rgba(20, 22, 30, 0.8) 46%, rgba(6, 7, 11, 0.96) 80%)',
    backdropBurst: 'radial-gradient(circle at 50% 48%, rgba(226, 232, 240, 0.28) 0%, rgba(217, 119, 6, 0.14) 38%, rgba(8, 9, 14, 0.96) 76%)',
    sunburstGradient:
      'conic-gradient(from 0deg, transparent 0deg, rgba(226,232,240,0.7) 18deg, transparent 36deg, transparent 90deg, rgba(253,230,138,0.65) 108deg, transparent 126deg, transparent 180deg, rgba(226,232,240,0.7) 198deg, transparent 216deg, transparent 270deg, rgba(253,230,138,0.65) 288deg, transparent 306deg, transparent 360deg)',
    shockwaveClass: 'border-slate-200/80 shadow-[0_0_24px_rgba(203,213,225,0.75)]',
    sparkColors: ['#e2e8f0', '#fde68a', '#cbd5e1'],
    modalBorderClass: 'border-stone-400/55 shadow-[0_24px_85px_rgba(0,0,0,0.96),0_0_32px_rgba(148,163,184,0.18)]',
    modalHairlineClass: 'via-slate-300/80',
    titleColorClass: 'text-slate-100',
    accentTextClass: 'text-slate-300',
    sealKind: 'iron',
  },
  uncommon: {
    label: 'Baú Incomum · Tier 2',
    shakingText: 'Despertando o Selo Esmeralda...',
    burstText: 'Energia Esmeralda Liberada!',
    rumbleClass: 'animate-chest-rumble-uncommon',
    bodyStops: ['#16352c', '#0d221c', '#071411'],
    lidStops: ['#1f4a3d', '#112d25', '#0a1c17'],
    trimStops: ['#a7f3d0', '#10b981', '#065f46', '#34d399', '#047857'],
    trimHorizStops: ['#047857', '#6ee7b7', '#10b981', '#a7f3d0', '#064e3b'],
    seamColor: '#6ee7b7',
    seamGlow: 'rgba(16, 185, 129, 0.92)',
    coreGlow: 'radial-gradient(circle, rgba(110, 231, 183, 0.65) 0%, rgba(16, 185, 129, 0.28) 52%, transparent 78%)',
    backdropShake: 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.18) 0%, rgba(10, 28, 23, 0.8) 46%, rgba(5, 11, 9, 0.96) 80%)',
    backdropBurst: 'radial-gradient(circle at 50% 48%, rgba(52, 211, 153, 0.34) 0%, rgba(6, 95, 70, 0.2) 38%, rgba(5, 11, 9, 0.96) 76%)',
    sunburstGradient:
      'conic-gradient(from 0deg, transparent 0deg, rgba(110,231,183,0.8) 14deg, transparent 30deg, transparent 60deg, rgba(52,211,153,0.7) 74deg, transparent 90deg, transparent 120deg, rgba(167,243,208,0.85) 134deg, transparent 150deg, transparent 180deg, rgba(52,211,153,0.75) 194deg, transparent 210deg, transparent 240deg, rgba(110,231,183,0.8) 254deg, transparent 270deg, transparent 300deg, rgba(52,211,153,0.75) 314deg, transparent 330deg, transparent 360deg)',
    shockwaveClass: 'border-emerald-300/90 shadow-[0_0_28px_rgba(16,185,129,0.88)]',
    sparkColors: ['#6ee7b7', '#34d399', '#d1fae5'],
    modalBorderClass: 'border-emerald-400/60 shadow-[0_24px_85px_rgba(0,0,0,0.96),0_0_38px_rgba(16,185,129,0.22)]',
    modalHairlineClass: 'via-emerald-300/90',
    titleColorClass: 'text-emerald-200',
    accentTextClass: 'text-emerald-300',
    sealKind: 'emerald',
    showDoubleShockwave: true,
  },
  rare: {
    label: 'Baú Raro · Tier 3',
    shakingText: 'Canalizando o Titânio Celeste...',
    burstText: 'Facho Celeste Rompido!',
    rumbleClass: 'animate-chest-rumble-rare',
    bodyStops: ['#182d4a', '#0f1d33', '#08101d'],
    lidStops: ['#224069', '#142642', '#0b1629'],
    trimStops: ['#e0f2fe', '#38bdf8', '#075985', '#7dd3fc', '#0369a1'],
    trimHorizStops: ['#0369a1', '#bae6fd', '#0ea5e9', '#e0f2fe', '#1e3a8a'],
    seamColor: '#bae6fd',
    seamGlow: 'rgba(56, 189, 248, 0.96)',
    coreGlow: 'radial-gradient(circle, rgba(186, 230, 253, 0.78) 0%, rgba(14, 165, 233, 0.34) 52%, transparent 78%)',
    backdropShake: 'radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.2) 0%, rgba(12, 25, 45, 0.82) 46%, rgba(6, 10, 18, 0.96) 80%)',
    backdropBurst: 'radial-gradient(circle at 50% 48%, rgba(125, 211, 252, 0.38) 0%, rgba(2, 132, 199, 0.22) 38%, rgba(6, 10, 18, 0.96) 76%)',
    sunburstGradient:
      'conic-gradient(from 0deg, transparent 0deg, rgba(186,230,253,0.88) 12deg, transparent 26deg, transparent 45deg, rgba(56,189,248,0.82) 58deg, transparent 72deg, transparent 90deg, rgba(224,242,254,0.92) 104deg, transparent 118deg, transparent 135deg, rgba(56,189,248,0.8) 148deg, transparent 162deg, transparent 180deg, rgba(186,230,253,0.88) 194deg, transparent 208deg, transparent 225deg, rgba(56,189,248,0.8) 238deg, transparent 252deg, transparent 270deg, rgba(224,242,254,0.9) 284deg, transparent 298deg, transparent 315deg, rgba(56,189,248,0.8) 328deg, transparent 344deg, transparent 360deg)',
    shockwaveClass: 'border-sky-300/95 shadow-[0_0_32px_rgba(56,189,248,0.95)]',
    sparkColors: ['#bae6fd', '#38bdf8', '#ffffff'],
    modalBorderClass: 'border-sky-400/65 shadow-[0_24px_85px_rgba(0,0,0,0.96),0_0_42px_rgba(56,189,248,0.24)]',
    modalHairlineClass: 'via-sky-300/95',
    titleColorClass: 'text-sky-200',
    accentTextClass: 'text-sky-300',
    sealKind: 'sapphire',
    showSkyBeam: true,
    showDoubleShockwave: true,
  },
  epic: {
    label: 'Baú Épico · Tier 4',
    shakingText: 'Invocando o Vórtice de Ametista...',
    burstText: 'Selo Arcano Épico Rompido!',
    rumbleClass: 'animate-chest-rumble-epic',
    bodyStops: ['#311b4d', '#1e1033', '#10081c'],
    lidStops: ['#45246b', '#281542', '#150a24'],
    trimStops: ['#f3e8ff', '#c084fc', '#581c87', '#a855f7', '#6b21a8'],
    trimHorizStops: ['#6b21a8', '#e9d5ff', '#a855f7', '#f5d0fe', '#4c1d95'],
    seamColor: '#e9d5ff',
    seamGlow: 'rgba(192, 132, 252, 0.98)',
    coreGlow: 'radial-gradient(circle, rgba(233, 213, 255, 0.82) 0%, rgba(168, 85, 247, 0.4) 50%, transparent 78%)',
    backdropShake: 'radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.24) 0%, rgba(28, 12, 46, 0.84) 46%, rgba(8, 5, 14, 0.97) 80%)',
    backdropBurst: 'radial-gradient(circle at 50% 48%, rgba(216, 180, 254, 0.42) 0%, rgba(147, 51, 234, 0.26) 38%, rgba(8, 5, 14, 0.97) 76%)',
    sunburstGradient:
      'conic-gradient(from 0deg, transparent 0deg, rgba(233,213,255,0.9) 12deg, transparent 24deg, transparent 40deg, rgba(192,132,252,0.85) 54deg, transparent 68deg, transparent 84deg, rgba(240,171,252,0.9) 98deg, transparent 112deg, transparent 132deg, rgba(168,85,247,0.85) 146deg, transparent 160deg, transparent 180deg, rgba(233,213,255,0.9) 194deg, transparent 208deg, transparent 228deg, rgba(192,132,252,0.85) 242deg, transparent 256deg, transparent 276deg, rgba(240,171,252,0.9) 290deg, transparent 304deg, transparent 324deg, rgba(168,85,247,0.85) 338deg, transparent 352deg, transparent 360deg)',
    shockwaveClass: 'border-purple-300/95 shadow-[0_0_34px_rgba(168,85,247,0.96)]',
    sparkColors: ['#e9d5ff', '#c084fc', '#f0abfc'],
    modalBorderClass: 'border-purple-400/70 shadow-[0_24px_85px_rgba(0,0,0,0.96),0_0_46px_rgba(168,85,247,0.28)]',
    modalHairlineClass: 'via-purple-300/95',
    titleColorClass: 'text-purple-200',
    accentTextClass: 'text-purple-300',
    sealKind: 'amethyst',
    showArcaneOrbit: true,
    showDoubleShockwave: true,
  },
  legendary: {
    label: 'Baú Lendário · Tier 5',
    shakingText: 'Despertando a Forja Celestial Real...',
    burstText: 'Glória Lendária Revelada!',
    rumbleClass: 'animate-chest-rumble-legendary',
    bodyStops: ['#382612', '#21150a', '#120b05'],
    lidStops: ['#4d3417', '#2b1c0d', '#170f07'],
    trimStops: ['#fef9c3', '#fbbf24', '#92400e', '#fde047', '#b45309'],
    trimHorizStops: ['#b45309', '#fef08a', '#f59e0b', '#fef9c3', '#78350f'],
    seamColor: '#fef08a',
    seamGlow: 'rgba(251, 191, 36, 1)',
    coreGlow: 'radial-gradient(circle, rgba(254, 249, 195, 0.96) 0%, rgba(245, 158, 11, 0.52) 48%, transparent 76%)',
    backdropShake: 'radial-gradient(circle at 50% 50%, rgba(251, 191, 36, 0.26) 0%, rgba(42, 24, 8, 0.82) 46%, rgba(8, 6, 5, 0.97) 80%)',
    backdropBurst: 'radial-gradient(circle at 50% 48%, rgba(254, 240, 138, 0.48) 0%, rgba(217, 119, 6, 0.28) 38%, rgba(8, 6, 5, 0.97) 76%)',
    sunburstGradient:
      'conic-gradient(from 0deg, transparent 0deg, rgba(254,249,195,0.95) 12deg, transparent 24deg, transparent 36deg, rgba(251,191,36,0.9) 48deg, transparent 60deg, transparent 72deg, rgba(254,240,138,0.95) 84deg, transparent 96deg, transparent 108deg, rgba(245,158,11,0.88) 120deg, transparent 132deg, transparent 144deg, rgba(254,249,195,0.95) 156deg, transparent 168deg, transparent 180deg, rgba(251,191,36,0.9) 192deg, transparent 204deg, transparent 216deg, rgba(254,240,138,0.95) 228deg, transparent 240deg, transparent 252deg, rgba(245,158,11,0.88) 264deg, transparent 276deg, transparent 288deg, rgba(254,249,195,0.95) 300deg, transparent 312deg, transparent 324deg, rgba(251,191,36,0.9) 336deg, transparent 348deg, transparent 360deg)',
    shockwaveClass: 'border-amber-200 shadow-[0_0_40px_rgba(251,191,36,1)]',
    sparkColors: ['#fef9c3', '#fde047', '#f59e0b', '#ffffff'],
    modalBorderClass: 'border-amber-400/75 shadow-[0_24px_90px_rgba(0,0,0,0.96),0_0_55px_rgba(245,158,11,0.34)]',
    modalHairlineClass: 'via-amber-300',
    titleColorClass: 'text-amber-200',
    accentTextClass: 'text-amber-300',
    sealKind: 'crown',
    showArcaneOrbit: true,
    showSkyBeam: true,
    showDoubleShockwave: true,
  },
  lucky: {
    label: 'Baú Prisma da Fortuna · Sorte',
    shakingText: 'Girando os Ventos da Fortuna...',
    burstText: 'A Sorte Sorriu para Você!',
    rumbleClass: 'animate-chest-lucky-dance',
    bodyStops: ['#2b173a', '#16282b', '#0b141a'],
    lidStops: ['#3e1f54', '#1d3b38', '#0f1f22'],
    trimStops: ['#fef08a', '#34d399', '#ec4899', '#38bdf8', '#fbbf24'],
    trimHorizStops: ['#34d399', '#fef08a', '#f472b6', '#38bdf8', '#fbbf24'],
    seamColor: '#a7f3d0',
    seamGlow: 'rgba(52, 211, 153, 0.95)',
    coreGlow: 'radial-gradient(circle, rgba(254, 240, 138, 0.88) 0%, rgba(52, 211, 153, 0.44) 42%, rgba(236, 72, 153, 0.25) 68%, transparent 82%)',
    backdropShake: 'radial-gradient(circle at 50% 50%, rgba(52, 211, 153, 0.2) 0%, rgba(58, 22, 68, 0.52) 44%, rgba(7, 10, 16, 0.96) 80%)',
    backdropBurst: 'radial-gradient(circle at 50% 48%, rgba(254, 240, 138, 0.4) 0%, rgba(16, 185, 129, 0.25) 35%, rgba(236, 72, 153, 0.16) 56%, rgba(7, 10, 16, 0.97) 80%)',
    sunburstGradient:
      'conic-gradient(from 0deg, transparent 0deg, rgba(110,231,183,0.9) 14deg, transparent 28deg, transparent 50deg, rgba(254,240,138,0.92) 64deg, transparent 78deg, transparent 104deg, rgba(244,114,182,0.88) 118deg, transparent 132deg, transparent 156deg, rgba(56,189,248,0.88) 170deg, transparent 184deg, transparent 210deg, rgba(110,231,183,0.9) 224deg, transparent 238deg, transparent 264deg, rgba(254,240,138,0.92) 278deg, transparent 292deg, transparent 316deg, rgba(244,114,182,0.88) 330deg, transparent 346deg, transparent 360deg)',
    shockwaveClass: 'border-emerald-300 shadow-[0_0_36px_rgba(52,211,153,0.95)]',
    sparkColors: ['#6ee7b7', '#fde047', '#f472b6', '#38bdf8', '#ffffff'],
    modalBorderClass: 'border-amber-300/70 shadow-[0_24px_88px_rgba(0,0,0,0.96),0_0_48px_rgba(16,185,129,0.24)]',
    modalHairlineClass: 'via-emerald-300',
    titleColorClass: 'text-emerald-200',
    accentTextClass: 'text-amber-300',
    sealKind: 'clover',
    showPrismaticHalo: true,
    showDoubleShockwave: true,
  },
};

const EMBER_SPARKS = [
  { x: '-120px', y: '-128px', delay: '0ms', size: 7 },
  { x: '-82px', y: '-158px', delay: '45ms', size: 6 },
  { x: '-42px', y: '-176px', delay: '20ms', size: 8 },
  { x: '0px', y: '-188px', delay: '55ms', size: 7 },
  { x: '46px', y: '-170px', delay: '30ms', size: 8 },
  { x: '86px', y: '-150px', delay: '75ms', size: 6 },
  { x: '122px', y: '-122px', delay: '40ms', size: 7 },
  { x: '-98px', y: '-84px', delay: '105ms', size: 5 },
  { x: '100px', y: '-88px', delay: '92ms', size: 5 },
  { x: '-26px', y: '-134px', delay: '138ms', size: 5 },
  { x: '32px', y: '-138px', delay: '122ms', size: 6 },
  { x: '6px', y: '-106px', delay: '162ms', size: 5 },
  { x: '-64px', y: '-114px', delay: '148ms', size: 6 },
  { x: '68px', y: '-118px', delay: '132ms', size: 6 },
];

const SHAKE_MIN_MS_BY_PACK: Record<PackType, number> = {
  common: 920,
  uncommon: 1020,
  rare: 1100,
  epic: 1180,
  legendary: 1280,
  lucky: 1220,
};

const BURST_DURATION_MS = 900;

export const PackChestOpeningModal: React.FC<PackChestOpeningModalProps> = ({
  isOpen,
  packId,
  packName,
  packSubtitle,
  usedFreePack = false,
  result,
  onClose,
  onInspectCard,
}) => {
  const { animationMode, chestAnimationMode, reduceGpuBlur } = useVisualPreferences();
  const [stage, setStage] = useState<ChestStage>('shaking');
  const [shakeDone, setShakeDone] = useState(false);
  const [skipRequested, setSkipRequested] = useState(false);

  const shakeTimerRef = useRef<number | null>(null);
  const burstTimerRef = useRef<number | null>(null);
  const luckyBonusSoundTimerRef = useRef<number | null>(null);
  const burstSoundPlayedRef = useRef<boolean>(false);

  const osReducedMotion =
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  const effectiveChestMode: 'full' | 'static' | 'off' =
    osReducedMotion || animationMode === 'off' || chestAnimationMode === 'off'
      ? 'off'
      : animationMode === 'static' || chestAnimationMode === 'static'
      ? 'static'
      : 'full';

  const isStaticChest = effectiveChestMode === 'static';
  const isNoAnimChest = effectiveChestMode === 'off';

  const visual = CHEST_RARITY_VISUALS[packId] || CHEST_RARITY_VISUALS.common;
  const hasLuckyFourthBonus = packId === 'lucky' && Boolean(result && result.drops.length >= 4);

  const clearTimers = () => {
    if (shakeTimerRef.current !== null) {
      window.clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = null;
    }
    if (burstTimerRef.current !== null) {
      window.clearTimeout(burstTimerRef.current);
      burstTimerRef.current = null;
    }
    if (luckyBonusSoundTimerRef.current !== null) {
      window.clearTimeout(luckyBonusSoundTimerRef.current);
      luckyBonusSoundTimerRef.current = null;
    }
  };

  // Start a fresh chest sequence whenever modal opens
  useEffect(() => {
    if (!isOpen) {
      clearTimers();
      setStage('shaking');
      setShakeDone(false);
      setSkipRequested(false);
      burstSoundPlayedRef.current = false;
      return;
    }

    if (effectiveChestMode === 'off') {
      setSkipRequested(true);
      setShakeDone(true);
      return;
    }

    setStage('shaking');
    setShakeDone(false);
    setSkipRequested(false);
    burstSoundPlayedRef.current = false;

    if (effectiveChestMode === 'static') {
      // Static lightweight chest glimpse (420ms, zero shake/sparks/blur) -> straight to cards
      sound.playTick();
      shakeTimerRef.current = window.setTimeout(() => {
        shakeTimerRef.current = null;
        setShakeDone(true);
      }, 420);
      return () => {
        clearTimers();
      };
    }

    sound.playChestRumble(packId);

    const shakeDuration = SHAKE_MIN_MS_BY_PACK[packId] ?? 1080;
    shakeTimerRef.current = window.setTimeout(() => {
      shakeTimerRef.current = null;
      setShakeDone(true);
    }, shakeDuration);

    return () => {
      clearTimers();
    };
  }, [isOpen, packId, effectiveChestMode]);

  // Advance stage when data resolves or player presses Skip
  useEffect(() => {
    if (!isOpen) return;

    if (skipRequested && result) {
      clearTimers();
      if (!burstSoundPlayedRef.current) {
        burstSoundPlayedRef.current = true;
        sound.playChestOpenBurst(packId, packId === 'lucky' && result.drops.length >= 4);
      }
      setStage('revealed');
      return;
    }

    if (stage === 'shaking' && shakeDone && result) {
      const bonusFourth = packId === 'lucky' && result.drops.length >= 4;
      if (!burstSoundPlayedRef.current) {
        burstSoundPlayedRef.current = true;
        sound.playChestOpenBurst(packId, bonusFourth);
      }
      // Static mode skips the heavy burst choreography and opens the card showcase directly
      if (effectiveChestMode === 'static') {
        setStage('revealed');
        return;
      }
      setStage('burst');
      burstTimerRef.current = window.setTimeout(() => {
        burstTimerRef.current = null;
        setStage('revealed');
      }, bonusFourth ? BURST_DURATION_MS + 140 : BURST_DURATION_MS);
    }
  }, [isOpen, stage, shakeDone, result, skipRequested, packId, effectiveChestMode]);

  // Play the special Lucky 4th-card flourish chime right when the 4th card erupts in the reveal modal
  useEffect(() => {
    if (!isOpen || stage !== 'revealed' || !hasLuckyFourthBonus) return;
    luckyBonusSoundTimerRef.current = window.setTimeout(() => {
      luckyBonusSoundTimerRef.current = null;
      sound.playLuckyBonusCard();
    }, effectiveChestMode === 'full' ? 460 : 120);
    return () => {
      if (luckyBonusSoundTimerRef.current !== null) {
        window.clearTimeout(luckyBonusSoundTimerRef.current);
        luckyBonusSoundTimerRef.current = null;
      }
    };
  }, [isOpen, stage, hasLuckyFourthBonus]);

  // Escape key closes modal once cards are revealed
  useEffect(() => {
    if (!isOpen || stage !== 'revealed') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, stage, onClose]);

  const cardInstances = useMemo(() => {
    if (!result) return [];
    return result.drops.map((drop) => ({
      drop,
      instance: createCardInstance(drop.template),
    }));
  }, [result]);

  if (!isOpen) return null;

  const handleSkip = () => {
    sound.playTick();
    setSkipRequested(true);
  };

  const newCardsCount = result ? result.drops.filter((d) => !d.isDuplicate).length : 0;
  const dupCardsCount = result ? result.drops.length - newCardsCount : 0;
  const gradSuffix = `_${packId}`;

  const useHeavyBlur = !reduceGpuBlur && !isStaticChest && !isNoAnimChest;

  return (
    <div
      className={`fixed inset-0 z-[65] flex items-center justify-center ${
        useHeavyBlur ? 'bg-black/90 backdrop-blur-md' : 'bg-black/94'
      } p-4 select-none overflow-y-auto`}
      role="dialog"
      aria-modal="true"
      aria-label={`Abertura de ${packName}`}
      onClick={() => {
        if (stage === 'revealed') {
          onClose();
        }
      }}
    >
      {/* Rarity-Specific Ambient Radial Backdrop */}
      {!isStaticChest && !isNoAnimChest && (
        <div
          className="pointer-events-none fixed inset-0 transition-opacity duration-500"
          style={{
            background: stage === 'burst' ? visual.backdropBurst : visual.backdropShake,
          }}
        />
      )}

      {/* STAGE 1 & 2: RARITY-SPECIFIC FORGED CHEST OPENING SEQUENCE */}
      {stage !== 'revealed' && (
        <div
          className="relative z-10 w-full max-w-2xl flex flex-col items-center justify-center py-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top-right Skip Button */}
          <button
            type="button"
            onClick={handleSkip}
            className="fixed top-5 right-5 sm:top-7 sm:right-8 z-20 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-amber-400/45 text-amber-200 hover:text-amber-100 text-xs font-serif font-bold uppercase tracking-wider shadow-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <SkipForward size={14} className="shrink-0" />
            <span>{skipRequested && !result ? 'Abrindo...' : 'Pular'}</span>
          </button>

          {/* Chest Stage Container */}
          <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center">
            {/* Warm / Rarity Core Glow Behind Chest */}
            {useHeavyBlur && (
              <div
                className="pointer-events-none absolute inset-4 rounded-full blur-3xl transition-opacity duration-300"
                style={{
                  background: visual.coreGlow,
                  opacity: stage === 'burst' ? 1 : 0.78,
                }}
              />
            )}

            {/* Epic & Legendary Spinning Arcane Runic Halo */}
            {visual.showArcaneOrbit && !isStaticChest && !isNoAnimChest && (
              <div
                className="pointer-events-none absolute w-64 h-64 rounded-full border border-dashed animate-chest-arcane-orbit"
                style={{
                  borderColor: visual.seamColor,
                  boxShadow: `0 0 28px ${visual.seamGlow}`,
                }}
                aria-hidden="true"
              />
            )}

            {/* Lucky Pack Iridescent Fortune Roulette Ring */}
            {visual.showPrismaticHalo && !isStaticChest && !isNoAnimChest && (
              <div
                className="pointer-events-none absolute w-68 h-68 rounded-full animate-chest-lucky-prism"
                style={{
                  background:
                    'conic-gradient(from 0deg, rgba(52,211,153,0.45), rgba(254,240,138,0.5), rgba(244,114,182,0.45), rgba(56,189,248,0.45), rgba(52,211,153,0.45))',
                  maskImage: 'radial-gradient(circle, transparent 56%, black 60%, black 66%, transparent 72%)',
                  WebkitMaskImage: 'radial-gradient(circle, transparent 56%, black 60%, black 66%, transparent 72%)',
                }}
                aria-hidden="true"
              />
            )}

            {/* Burst VFX: Sunburst, Sky Pillar, Shockwaves & Sparks */}
            {stage === 'burst' && (
              <>
                {visual.showSkyBeam && (
                  <div
                    className="pointer-events-none absolute inset-y-[-140px] w-24 animate-chest-sky-beam"
                    style={{
                      background: `linear-gradient(180deg, transparent 0%, ${visual.seamGlow} 48%, transparent 100%)`,
                      filter: 'blur(8px)',
                    }}
                    aria-hidden="true"
                  />
                )}
                <div
                  className="pointer-events-none absolute inset-0 flex items-center justify-center animate-chest-light-burst"
                  aria-hidden="true"
                >
                  <div
                    className="w-76 h-76 rounded-full"
                    style={{
                      background: visual.sunburstGradient,
                      maskImage: 'radial-gradient(circle, black 16%, transparent 72%)',
                      WebkitMaskImage: 'radial-gradient(circle, black 16%, transparent 72%)',
                    }}
                  />
                </div>
                <div
                  className={`pointer-events-none absolute w-40 h-40 rounded-full border-2 animate-chest-shockwave ${visual.shockwaveClass}`}
                  aria-hidden="true"
                />
                {(visual.showDoubleShockwave || hasLuckyFourthBonus) && (
                  <div
                    className={`pointer-events-none absolute w-40 h-40 rounded-full border-2 animate-chest-shockwave ${
                      hasLuckyFourthBonus
                        ? 'border-amber-200 shadow-[0_0_40px_rgba(253,224,71,1)]'
                        : visual.shockwaveClass
                    }`}
                    style={{ animationDelay: '150ms' }}
                    aria-hidden="true"
                  />
                )}
                {EMBER_SPARKS.map((spark, i) => {
                  const sparkHex = visual.sparkColors[i % visual.sparkColors.length];
                  return (
                    <span
                      key={i}
                      className="pointer-events-none absolute rounded-full animate-chest-spark"
                      style={
                        {
                          width: `${spark.size}px`,
                          height: `${spark.size}px`,
                          backgroundColor: sparkHex,
                          boxShadow: `0 0 12px ${sparkHex}`,
                          animationDelay: spark.delay,
                          '--spark-x': spark.x,
                          '--spark-y': spark.y,
                        } as React.CSSProperties
                      }
                      aria-hidden="true"
                    />
                  );
                })}
              </>
            )}

            {/* Forged Rarity Metallic Chest Artwork */}
            <div
              className={`relative w-60 h-52 sm:w-64 sm:h-56 flex items-center justify-center ${
                isStaticChest || isNoAnimChest ? '' : 'animate-chest-drop'
              }`}
            >
              <div
                className={
                  stage === 'shaking' && !isStaticChest && !isNoAnimChest
                    ? `w-full h-full ${visual.rumbleClass}`
                    : 'w-full h-full'
                }
              >
                <svg
                  viewBox="0 0 260 220"
                  className={`w-full h-full overflow-visible ${
                    useHeavyBlur ? 'drop-shadow-[0_22px_34px_rgba(0,0,0,0.92)]' : ''
                  }`}
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id={`chestBody${gradSuffix}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={visual.bodyStops[0]} />
                      <stop offset="48%" stopColor={visual.bodyStops[1]} />
                      <stop offset="100%" stopColor={visual.bodyStops[2]} />
                    </linearGradient>
                    <linearGradient id={`chestLid${gradSuffix}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={visual.lidStops[0]} />
                      <stop offset="52%" stopColor={visual.lidStops[1]} />
                      <stop offset="100%" stopColor={visual.lidStops[2]} />
                    </linearGradient>
                    <linearGradient id={`chestTrim${gradSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={visual.trimStops[0]} />
                      <stop offset="28%" stopColor={visual.trimStops[1]} />
                      <stop offset="56%" stopColor={visual.trimStops[2]} />
                      <stop offset="82%" stopColor={visual.trimStops[3]} />
                      <stop offset="100%" stopColor={visual.trimStops[4]} />
                    </linearGradient>
                    <linearGradient id={`chestTrimH${gradSuffix}`} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={visual.trimHorizStops[0]} />
                      <stop offset="24%" stopColor={visual.trimHorizStops[1]} />
                      <stop offset="50%" stopColor={visual.trimHorizStops[2]} />
                      <stop offset="76%" stopColor={visual.trimHorizStops[3]} />
                      <stop offset="100%" stopColor={visual.trimHorizStops[4]} />
                    </linearGradient>
                    <radialGradient id={`chestInner${gradSuffix}`} cx="50%" cy="65%" r="55%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="38%" stopColor={visual.seamColor} />
                      <stop offset="76%" stopColor={visual.trimStops[1]} stopOpacity="0.65" />
                      <stop offset="100%" stopColor={visual.trimStops[1]} stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Ground contact shadow */}
                  <ellipse cx="130" cy="198" rx="96" ry="13" fill="rgba(0,0,0,0.68)" />

                  {/* Inner Core Light Visible When Lid Opens */}
                  <ellipse
                    cx="130"
                    cy="104"
                    rx={stage === 'burst' ? 90 : 74}
                    ry={stage === 'burst' ? 34 : 8}
                    fill={`url(#chestInner${gradSuffix})`}
                    className={stage === 'shaking' ? 'animate-chest-seam-glow' : ''}
                    style={{
                      opacity: stage === 'burst' ? 1 : 0.78,
                      transformOrigin: '130px 104px',
                    }}
                  />

                  {/* CHEST BASE BODY */}
                  <g>
                    <path
                      d="M36 106 L224 106 L216 186 Q215 194 206 194 L54 194 Q45 194 44 186 Z"
                      fill={`url(#chestBody${gradSuffix})`}
                      stroke={`url(#chestTrim${gradSuffix})`}
                      strokeWidth="4.5"
                    />
                    <path
                      d="M52 118 L208 118 L202 180 L58 180 Z"
                      fill="rgba(7, 8, 14, 0.55)"
                      stroke={visual.seamColor}
                      strokeOpacity="0.28"
                      strokeWidth="1.5"
                    />
                    <rect x="68" y="106" width="18" height="88" rx="2" fill={`url(#chestTrim${gradSuffix})`} />
                    <rect x="174" y="106" width="18" height="88" rx="2" fill={`url(#chestTrim${gradSuffix})`} />
                    <circle cx="77" cy="124" r="2.6" fill="#ffffff" fillOpacity="0.9" />
                    <circle cx="77" cy="176" r="2.6" fill="#ffffff" fillOpacity="0.9" />
                    <circle cx="183" cy="124" r="2.6" fill="#ffffff" fillOpacity="0.9" />
                    <circle cx="183" cy="176" r="2.6" fill="#ffffff" fillOpacity="0.9" />
                    <path d="M36 106 L54 106 L52 126 L38 126 Z" fill={`url(#chestTrim${gradSuffix})`} />
                    <path d="M224 106 L206 106 L208 126 L222 126 Z" fill={`url(#chestTrim${gradSuffix})`} />
                    <path d="M44 176 L62 176 L64 194 L46 194 Z" fill={`url(#chestTrim${gradSuffix})`} />
                    <path d="M216 176 L198 176 L196 194 L214 194 Z" fill={`url(#chestTrim${gradSuffix})`} />
                    <rect x="31" y="101" width="198" height="10" rx="4" fill={`url(#chestTrimH${gradSuffix})`} />
                  </g>

                  {/* Glowing Light Seam */}
                  <rect
                    x="42"
                    y="98"
                    width="176"
                    height={stage === 'burst' ? 14 : 6}
                    rx="4"
                    fill={visual.seamColor}
                    className={stage === 'shaking' ? 'animate-chest-seam-glow' : ''}
                    style={{
                      opacity: stage === 'burst' ? 1 : 0.88,
                      filter: `drop-shadow(0 0 12px ${visual.seamGlow})`,
                    }}
                  />

                  {/* ARTICULATED CHEST LID */}
                  <g className={stage === 'burst' ? 'animate-chest-lid-open' : ''}>
                    <path
                      d="M32 101 Q34 52 72 44 L188 44 Q226 52 228 101 Z"
                      fill={`url(#chestLid${gradSuffix})`}
                      stroke={`url(#chestTrim${gradSuffix})`}
                      strokeWidth="4.5"
                    />
                    {/* Legendary Royal Crown Finial atop Lid */}
                    {visual.sealKind === 'crown' && (
                      <path
                        d="M104 44 L112 24 L123 36 L130 18 L137 36 L148 24 L156 44 Z"
                        fill={`url(#chestTrim${gradSuffix})`}
                        stroke="#451a03"
                        strokeWidth="1.5"
                      />
                    )}
                    <path
                      d="M68 46 L192 46"
                      stroke={visual.seamColor}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      opacity="0.72"
                    />
                    <path d="M68 44 L86 44 L86 101 L68 101 Z" fill={`url(#chestTrim${gradSuffix})`} />
                    <path d="M174 44 L192 44 L192 101 L174 101 Z" fill={`url(#chestTrim${gradSuffix})`} />
                    <path
                      d="M96 76 Q130 58 164 76"
                      fill="none"
                      stroke={visual.seamColor}
                      strokeOpacity="0.6"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <rect x="29" y="92" width="202" height="10" rx="4" fill={`url(#chestTrimH${gradSuffix})`} />

                    {/* Central Rarity Seal Medallion */}
                    <path
                      d="M110 85 L150 85 L155 110 L130 129 L105 110 Z"
                      fill={`url(#chestTrim${gradSuffix})`}
                      stroke="rgba(10, 10, 18, 0.85)"
                      strokeWidth="2"
                    />
                    <path
                      d="M115 91 L145 91 L148 108 L130 122 L112 108 Z"
                      fill="#120f1e"
                    />

                    {/* Seal Emblem by Pack Rarity */}
                    {visual.sealKind === 'clover' ? (
                      /* Four-Leaf Fortune Clover Emblem for Lucky Pack */
                      <g style={{ filter: `drop-shadow(0 0 8px ${visual.seamGlow})` }}>
                        <circle cx="130" cy="99" r="4.6" fill={stage === 'burst' ? '#ffffff' : '#6ee7b7'} />
                        <circle cx="123.5" cy="105.5" r="4.6" fill={stage === 'burst' ? '#ffffff' : '#fde047'} />
                        <circle cx="136.5" cy="105.5" r="4.6" fill={stage === 'burst' ? '#ffffff' : '#f472b6'} />
                        <circle cx="130" cy="112" r="4.6" fill={stage === 'burst' ? '#ffffff' : '#38bdf8'} />
                        <circle cx="130" cy="105.5" r="2.8" fill="#ffffff" />
                      </g>
                    ) : visual.sealKind === 'sapphire' || visual.sealKind === 'emerald' ? (
                      /* Faceted Diamond Gem Seal */
                      <polygon
                        points="130,94 140,105 130,117 120,105"
                        fill={stage === 'burst' ? '#ffffff' : visual.seamColor}
                        style={{ filter: `drop-shadow(0 0 9px ${visual.seamGlow})` }}
                      />
                    ) : visual.sealKind === 'amethyst' ? (
                      /* Arcane Mystic Eye / Star Seal */
                      <g style={{ filter: `drop-shadow(0 0 9px ${visual.seamGlow})` }}>
                        <path
                          d="M117 105 Q130 95 143 105 Q130 115 117 105 Z"
                          fill={stage === 'burst' ? '#ffffff' : '#d8b4fe'}
                        />
                        <circle cx="130" cy="105" r="4" fill="#4c1d95" />
                        <circle cx="130" cy="105" r="1.8" fill="#ffffff" />
                      </g>
                    ) : (
                      /* Forged Keyhole / Royal Rune Lock */
                      <g style={{ filter: `drop-shadow(0 0 8px ${visual.seamGlow})` }}>
                        <circle
                          cx="130"
                          cy="103"
                          r="5.5"
                          fill={stage === 'burst' ? '#ffffff' : visual.seamColor}
                        />
                        <path
                          d="M127.5 107 L132.5 107 L134 116 L126 116 Z"
                          fill={stage === 'burst' ? '#ffffff' : visual.trimStops[1]}
                        />
                      </g>
                    )}
                  </g>
                </svg>
              </div>
            </div>
          </div>

          {/* Quiet Typographic Stage Caption */}
          <div className="mt-2 text-center space-y-1.5">
            <div className={`text-[10px] font-mono uppercase tracking-[0.22em] font-bold ${visual.accentTextClass}`}>
              {visual.label}
            </div>
            <h2 className={`text-xl sm:text-2xl font-serif font-black tracking-wide ${visual.titleColorClass}`}>
              {packName}
            </h2>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-stone-300">
              {stage === 'burst'
                ? hasLuckyFourthBonus
                  ? '🍀 Sorte Extra Ativada! +1 Carta Bônus!'
                  : visual.burstText
                : usedFreePack
                ? 'Abrindo Recompensa Grátis...'
                : visual.shakingText}
            </p>
            {packSubtitle && (
              <p className="text-xs text-stone-400">
                {packSubtitle}
              </p>
            )}
          </div>
        </div>
      )}

      {/* STAGE 3: DEDICATED PACK REWARDS MODAL */}
      {stage === 'revealed' && result && (
        <div
          className={`relative z-10 w-full max-w-4xl rounded-3xl bg-gradient-to-b from-[#171226] via-[#0f0c1a] to-[#08070f] border-2 ${visual.modalBorderClass} overflow-hidden`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Rarity Forged Hairline */}
          <div className={`h-[2.5px] w-full bg-gradient-to-r from-transparent ${visual.modalHairlineClass} to-transparent`} />

          {/* Modal Header */}
          <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-stone-800/90 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className={`flex items-center gap-2 ${visual.accentTextClass}`}>
                <Sparkles size={17} className="shrink-0" />
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] font-bold">
                  {hasLuckyFourthBonus
                    ? '🍀 Fortuna Extra · 4ª Carta Bônus Revelada!'
                    : `Tesouro Revelado${result.usedFreePack ? ' · Recompensa Grátis' : ''}`}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-black text-stone-100">
                {packName}
              </h2>
              <p className="text-xs text-stone-400 font-mono tabular-nums">
                {result.drops.length} cartas obtidas
                {newCardsCount > 0 ? ` · ${newCardsCount} nova${newCardsCount > 1 ? 's' : ''}` : ''}
                {dupCardsCount > 0 ? ` · ${dupCardsCount} repetida${dupCardsCount > 1 ? 's' : ''}` : ''}
                {result.totalRefundCrystals > 0 ? ` · +${result.totalRefundCrystals} Cristais reembolsados` : ''}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {result.totalRefundCrystals > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 text-sm font-mono font-black text-cyan-300 tabular-nums">
                  <Gem size={16} className="text-cyan-400 shrink-0" />
                  <span>+{result.totalRefundCrystals}</span>
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar modal de cartas ganhas"
                className="p-2 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Won Cards Showcase */}
          <div className="px-6 sm:px-8 py-7">
            <div className="flex flex-wrap items-start justify-center gap-6 sm:gap-7">
              {cardInstances.map(({ drop, instance }, idx) => {
                const elemMeta = ELEMENT_CONFIG[drop.template.element];
                const isLuckyBonusFourth = packId === 'lucky' && idx === 3;

                return (
                  <div
                    key={`${drop.cardId}-${idx}`}
                    className={`relative flex flex-col items-center gap-2.5 ${
                      effectiveChestMode === 'full'
                        ? isLuckyBonusFourth
                          ? 'animate-lucky-fourth-card'
                          : 'animate-pack-card-reveal'
                        : ''
                    }`}
                    style={
                      effectiveChestMode === 'full'
                        ? { animationDelay: isLuckyBonusFourth ? '460ms' : `${idx * 100}ms` }
                        : undefined
                    }
                  >
                    {/* Exclusive Lucky Pack 4th-Card Surprise Detail Effects */}
                    {isLuckyBonusFourth && (
                      <>
                        {effectiveChestMode === 'full' && (
                          <div
                            className="pointer-events-none absolute -inset-4 rounded-3xl border-2 border-emerald-300/90 shadow-[0_0_34px_rgba(52,211,153,0.9),0_0_24px_rgba(251,191,36,0.75)] animate-lucky-fourth-burst"
                            style={{ animationDelay: '480ms' }}
                            aria-hidden="true"
                          />
                        )}
                        {useHeavyBlur && (
                          <div
                            className="pointer-events-none absolute -inset-2 rounded-2xl blur-xl opacity-55"
                            style={{
                              background:
                                'linear-gradient(135deg, rgba(52,211,153,0.55), rgba(251,191,36,0.5), rgba(244,114,182,0.45))',
                            }}
                            aria-hidden="true"
                          />
                        )}
                        <div className="relative z-10 -mb-1 text-[10px] font-mono font-black uppercase tracking-[0.18em] text-emerald-200">
                          🍀 Carta Bônus · 10%
                        </div>
                      </>
                    )}

                    <div
                      className={
                        isLuckyBonusFourth
                          ? 'relative z-10 p-1 rounded-2xl bg-gradient-to-tr from-emerald-400 via-amber-300 to-fuchsia-400 shadow-[0_0_28px_rgba(52,211,153,0.55)]'
                          : 'relative z-10'
                      }
                    >
                      <CardView
                        card={instance}
                        size="md"
                        isPlayable={true}
                        onClick={() => onInspectCard(drop.template)}
                        onInspect={() => onInspectCard(drop.template)}
                      />
                    </div>

                    <div className="relative z-10 text-center space-y-1 max-w-[168px]">
                      <div className="text-sm font-serif font-bold text-stone-100 truncate">
                        {drop.template.name}
                      </div>
                      <div className="text-[11px] text-stone-400 font-mono">
                        Tier {drop.template.tier} · {elemMeta?.icon} {drop.template.element}
                      </div>
                      {drop.isDuplicate ? (
                        <div className="text-[11px] font-mono font-bold text-cyan-300 tabular-nums flex items-center justify-center gap-1">
                          <Gem size={11} className="text-cyan-400 shrink-0" />
                          <span>REPETIDA · +{drop.refundCrystals} Cristais</span>
                        </div>
                      ) : (
                        <div className="text-[11px] font-mono font-extrabold text-emerald-300 tracking-wide">
                          ✦ NOVA NA COLEÇÃO
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 sm:px-8 py-4 border-t border-stone-800/90 bg-stone-950/75 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-stone-400">
              Clique em qualquer carta para inspecionar seus detalhes completos.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:brightness-110 text-stone-950 font-serif font-black text-xs uppercase tracking-wider shadow-[0_6px_24px_rgba(245,158,11,0.35)] transition-all cursor-pointer whitespace-nowrap"
            >
              Coletar e Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
