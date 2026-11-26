import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FastForward, Sparkles } from 'lucide-react';
import { CardInstance } from '../types/game';
import { ELEMENT_CONFIG, TIER_CONFIG } from '../utils/cardVisuals';
import {
  AscensionCategory,
  AscensionTheme,
  getAscensionTheme,
  getDefaultAwakenedPowerText,
} from '../utils/levelUpThemes';
import { CardView } from './CardView';
import { sound } from '../services/soundEffects';

export interface LevelUpCinematicOverlayProps {
  card: CardInstance;
  awakenedPowerText?: string;
  isStaticMode?: boolean;
  isPreview?: boolean;
  onComplete: () => void;
}

type CinematicPhase = 'gathering' | 'metamorphosis' | 'climax' | 'revealed';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  angle: number;
  vAngle: number;
  life: number;
  maxLife: number;
  mode: 'inward' | 'burst' | 'ambient';
  orbitRadius?: number;
  orbitAngle?: number;
  orbitSpeed?: number;
}

interface Shockwave {
  radius: number;
  maxRadius: number;
  alpha: number;
  lineWidth: number;
  color: string;
}

interface LightningArc {
  points: Array<{ x: number; y: number }>;
  alpha: number;
  color: string;
  width: number;
}

/**
 * Intricate, bespoke sacred-geometry SVG emblem tailored to each card's Ascension Category.
 */
const CelestialAscensionSeal: React.FC<{
  theme: AscensionTheme;
  phase: CinematicPhase;
  isStaticMode: boolean;
}> = ({ theme, phase, isStaticMode }) => {
  const isClimaxOrRevealed = phase === 'climax' || phase === 'revealed';
  const ringScale =
    isStaticMode || phase === 'revealed'
      ? 'scale-100 opacity-90'
      : phase === 'climax'
      ? 'scale-115 opacity-100'
      : phase === 'metamorphosis'
      ? 'scale-90 opacity-95'
      : 'scale-125 opacity-60';

  const renderCategoryMotif = (category: AscensionCategory) => {
    switch (category) {
      case 'singularity':
        // Tier 6 O Sol: Black Hole Accretion Disk & Gravitational Lensing Rings
        return (
          <g>
            <circle cx="260" cy="260" r="196" fill="none" stroke={theme.primary} strokeWidth="1.4" strokeDasharray="14 8" opacity="0.7" />
            <ellipse cx="260" cy="260" rx="238" ry="74" fill="none" stroke={theme.secondary} strokeWidth="2.2" opacity="0.82" transform="rotate(-18 260 260)" />
            <ellipse cx="260" cy="260" rx="212" ry="56" fill="none" stroke={theme.primary} strokeWidth="1.5" strokeDasharray="6 6" opacity="0.75" transform="rotate(-18 260 260)" />
            <circle cx="260" cy="260" r="144" fill="none" stroke={theme.accent} strokeWidth="1.6" opacity="0.65" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <line
                key={deg}
                x1="260"
                y1="52"
                x2="260"
                y2="82"
                stroke={theme.secondary}
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.85"
                transform={`rotate(${deg} 260 260)`}
              />
            ))}
          </g>
        );

      case 'blood_eclipse':
        // Tier 6 A Lua: Crimson Totality Eclipse & Bleeding Corona Crescents
        return (
          <g>
            <circle cx="260" cy="260" r="204" fill="none" stroke={theme.primary} strokeWidth="1.6" strokeDasharray="10 7" opacity="0.75" />
            <circle cx="260" cy="260" r="168" fill="none" stroke={theme.secondary} strokeWidth="1.2" opacity="0.6" />
            <path
              d="M 260 44 A 216 216 0 1 1 259 476 A 178 178 0 1 0 260 44 Z"
              fill={theme.primary}
              opacity="0.16"
            />
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <polygon
                key={deg}
                points="260,36 266,68 260,78 254,68"
                fill={theme.primary}
                opacity="0.8"
                transform={`rotate(${deg} 260 260)`}
              />
            ))}
          </g>
        );

      case 'frost':
        // Bonetrus: Hexagonal Glacial Snowflake Mandala
        return (
          <g>
            <polygon
              points="260,46 445,153 445,367 260,474 75,367 75,153"
              fill="none"
              stroke={theme.primary}
              strokeWidth="1.6"
              opacity="0.72"
            />
            <polygon
              points="260,78 417,169 417,351 260,442 103,351 103,169"
              fill="none"
              stroke={theme.secondary}
              strokeWidth="1.2"
              strokeDasharray="8 6"
              opacity="0.65"
            />
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <g key={deg} transform={`rotate(${deg} 260 260)`}>
                <line x1="260" y1="42" x2="260" y2="112" stroke={theme.secondary} strokeWidth="2" opacity="0.85" />
                <polyline points="244,74 260,92 276,74" fill="none" stroke={theme.primary} strokeWidth="1.5" opacity="0.8" />
              </g>
            ))}
          </g>
        );

      case 'storm':
        // Barão Well: High-Voltage Electromagnetic Arc Rings
        return (
          <g>
            <circle cx="260" cy="260" r="204" fill="none" stroke={theme.primary} strokeWidth="1.8" strokeDasharray="18 6 4 6" opacity="0.8" />
            <circle cx="260" cy="260" r="164" fill="none" stroke={theme.secondary} strokeWidth="1.4" strokeDasharray="6 10" opacity="0.75" />
            {[0, 90, 180, 270].map((deg) => (
              <polyline
                key={deg}
                points="260,34 250,72 268,78 254,116"
                fill="none"
                stroke={theme.primary}
                strokeWidth="2.2"
                strokeLinejoin="round"
                opacity="0.9"
                transform={`rotate(${deg} 260 260)`}
              />
            ))}
          </g>
        );

      case 'seraphic':
      case 'firmament':
        // Kaliel & Saniel: Cathedral Halo & Sacred Eight-Pointed Seraphic Star
        return (
          <g>
            <circle cx="260" cy="260" r="206" fill="none" stroke={theme.primary} strokeWidth="1.6" opacity="0.8" />
            <circle cx="260" cy="260" r="176" fill="none" stroke={theme.secondary} strokeWidth="1.1" strokeDasharray="4 8" opacity="0.7" />
            <rect x="118" y="118" width="284" height="284" fill="none" stroke={theme.primary} strokeWidth="1.2" opacity="0.55" />
            <rect x="118" y="118" width="284" height="284" fill="none" stroke={theme.secondary} strokeWidth="1.2" opacity="0.55" transform="rotate(45 260 260)" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <polygon
                key={deg}
                points="260,34 265,84 260,96 255,84"
                fill={theme.primary}
                opacity="0.8"
                transform={`rotate(${deg} 260 260)`}
              />
            ))}
          </g>
        );

      case 'fae_prism':
        // Licia: Iridescent Fae Lotus & Arcane Star
        return (
          <g>
            <circle cx="260" cy="260" r="198" fill="none" stroke={theme.primary} strokeWidth="1.4" strokeDasharray="8 6" opacity="0.78" />
            <circle cx="260" cy="260" r="160" fill="none" stroke={theme.secondary} strokeWidth="1.2" opacity="0.65" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <path
                key={deg}
                d="M 260 44 Q 282 104 260 132 Q 238 104 260 44 Z"
                fill="none"
                stroke={deg % 90 === 0 ? theme.primary : theme.secondary}
                strokeWidth="1.4"
                opacity="0.72"
                transform={`rotate(${deg} 260 260)`}
              />
            ))}
          </g>
        );

      case 'abyssal_tide':
        // Titano: Deep-Sea Maelstrom Compass & Trident Rays
        return (
          <g>
            <circle cx="260" cy="260" r="204" fill="none" stroke={theme.primary} strokeWidth="1.7" strokeDasharray="24 8" opacity="0.8" />
            <circle cx="260" cy="260" r="162" fill="none" stroke={theme.secondary} strokeWidth="1.2" strokeDasharray="6 10" opacity="0.65" />
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <path
                key={deg}
                d="M 260 56 C 324 70, 368 112, 392 164"
                fill="none"
                stroke={theme.primary}
                strokeWidth="1.6"
                strokeLinecap="round"
                opacity="0.65"
                transform={`rotate(${deg} 260 260)`}
              />
            ))}
          </g>
        );

      case 'solar_flare':
        // Hélio: Blazing Solar Corona
        return (
          <g>
            <circle cx="260" cy="260" r="192" fill="none" stroke={theme.secondary} strokeWidth="1.6" opacity="0.8" />
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
              <polygon
                key={deg}
                points={deg % 60 === 0 ? '260,32 268,88 252,88' : '260,54 265,92 255,92'}
                fill={deg % 60 === 0 ? theme.secondary : theme.primary}
                opacity="0.78"
                transform={`rotate(${deg} 260 260)`}
              />
            ))}
          </g>
        );

      case 'lunar_dream':
        // Lunario: Astral Phases & Crescent Astrolabe
        return (
          <g>
            <circle cx="260" cy="260" r="202" fill="none" stroke={theme.primary} strokeWidth="1.4" strokeDasharray="10 8" opacity="0.75" />
            <circle cx="260" cy="260" r="164" fill="none" stroke={theme.secondary} strokeWidth="1.2" opacity="0.65" />
            {[0, 90, 180, 270].map((deg) => (
              <g key={deg} transform={`rotate(${deg} 260 260)`}>
                <circle cx="260" cy="58" r="10" fill={theme.secondary} opacity="0.85" />
                <circle cx="264" cy="55" r="8" fill={theme.voidMid} />
              </g>
            ))}
          </g>
        );

      case 'runic_earth':
      default:
        // Craff: Octagonal Monolith Runic Ring
        return (
          <g>
            <polygon
              points="180,66 340,66 454,180 454,340 340,454 180,454 66,340 66,180"
              fill="none"
              stroke={theme.primary}
              strokeWidth="1.8"
              opacity="0.8"
            />
            <polygon
              points="196,94 324,94 426,196 426,324 324,426 196,426 94,324 94,196"
              fill="none"
              stroke={theme.accent}
              strokeWidth="1.2"
              strokeDasharray="10 6"
              opacity="0.7"
            />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <rect
                key={deg}
                x="255"
                y="48"
                width="10"
                height="16"
                rx="2"
                fill={theme.primary}
                opacity="0.8"
                transform={`rotate(${deg} 260 260)`}
              />
            ))}
          </g>
        );
    }
  };

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out ${ringScale}`}
    >
      {/* Atmospheric Smoky Radial Bloom — wide multi-stop falloff so glow dissipates organically into distance */}
      <div
        className="absolute w-[480px] h-[480px] sm:w-[680px] sm:h-[680px] lg:w-[780px] lg:h-[780px] rounded-full transition-opacity duration-700"
        style={{
          background: `radial-gradient(circle, ${theme.glowRgba} 0%, ${theme.secondaryGlowRgba} 24%, ${theme.primary}26 44%, ${theme.secondary}10 60%, transparent 74%)`,
          filter: 'blur(38px)',
          opacity: isClimaxOrRevealed ? 0.92 : 0.5,
        }}
      />

      {/* Outer Slow-Rotating Sacred Geometry SVG */}
      <svg
        viewBox="0 0 520 520"
        className={`w-[320px] h-[320px] sm:w-[440px] sm:h-[440px] lg:w-[500px] lg:h-[500px] ${
          isStaticMode ? '' : 'animate-ascension-seal-slow'
        }`}
        style={{
          filter: `drop-shadow(0 0 18px ${theme.glowRgba})`,
        }}
      >
        {renderCategoryMotif(theme.category)}
      </svg>

      {/* Inner Counter-Rotating Astrolabe Hairline Ring */}
      <svg
        viewBox="0 0 520 520"
        className={`absolute w-[240px] h-[240px] sm:w-[330px] sm:h-[330px] lg:w-[375px] lg:h-[375px] opacity-75 ${
          isStaticMode ? '' : 'animate-ascension-seal-reverse'
        }`}
      >
        <circle
          cx="260"
          cy="260"
          r="212"
          fill="none"
          stroke={theme.accent}
          strokeWidth="1"
          strokeDasharray="3 11"
          opacity="0.7"
        />
        <circle
          cx="260"
          cy="260"
          r="186"
          fill="none"
          stroke={theme.primary}
          strokeWidth="0.9"
          opacity="0.5"
        />
      </svg>
    </div>
  );
};

export const LevelUpCinematicOverlay: React.FC<LevelUpCinematicOverlayProps> = ({
  card,
  awakenedPowerText,
  isStaticMode = false,
  isPreview = false,
  onComplete,
}) => {
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const staticActive = isStaticMode || prefersReducedMotion;
  const theme = useMemo(() => getAscensionTheme(card), [card]);
  const resolvedPowerText = useMemo(
    () => (awakenedPowerText && awakenedPowerText.trim()) || getDefaultAwakenedPowerText(card),
    [awakenedPowerText, card]
  );

  const [phase, setPhase] = useState<CinematicPhase>(staticActive ? 'revealed' : 'gathering');
  const [tilt, setTilt] = useState<{ rx: number; ry: number }>({ rx: 0, ry: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef<CinematicPhase>(staticActive ? 'revealed' : 'gathering');
  const climaxTriggeredRef = useRef<boolean>(false);

  const level1Card = useMemo<CardInstance>(() => ({ ...card, level: 1 }), [card]);
  const level2Card = useMemo<CardInstance>(() => ({ ...card, level: 2 }), [card]);
  const displayedCard =
    staticActive || phase === 'climax' || phase === 'revealed' ? level2Card : level1Card;

  const elementInfo = ELEMENT_CONFIG[card.element];
  const tierInfo = TIER_CONFIG[card.tier] || TIER_CONFIG[5];

  // Keep phaseRef synchronized for the 60fps canvas loop
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Orchestrate the 4-act timeline & symphonic Web Audio score
  useEffect(() => {
    if (staticActive) {
      setPhase('revealed');
      sound.playLevelUpAscension(card.tier, theme.category, true);
      return;
    }

    setPhase('gathering');
    climaxTriggeredRef.current = false;
    const cancelAudio = sound.playLevelUpAscension(card.tier, theme.category, false);

    const t1 = window.setTimeout(() => setPhase('metamorphosis'), 660);
    const t2 = window.setTimeout(() => setPhase('climax'), 1500);
    const t3 = window.setTimeout(() => setPhase('revealed'), 2060);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      if (cancelAudio) cancelAudio();
    };
  }, [card.instanceId, card.templateId, card.tier, theme.category, staticActive]);

  // Keyboard shortcuts: Escape / Space / Enter to skip or continue
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (phaseRef.current === 'revealed') {
          onComplete();
        } else {
          setPhase('revealed');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onComplete]);

  // High-DPI 60fps Elemental Particle, Shockwave & Lightning Canvas Engine
  useEffect(() => {
    if (staticActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const particles: Particle[] = [];
    const shockwaves: Shockwave[] = [];
    const arcs: LightningArc[] = [];

    const pickColor = () =>
      theme.particleColors[Math.floor(Math.random() * theme.particleColors.length)] ||
      theme.primary;

    const getFocalCenter = () => {
      const isDesktopSplit = width >= 900 && phaseRef.current === 'revealed';
      return {
        cx: isDesktopSplit ? width * 0.36 : width * 0.5,
        cy: height * 0.48,
      };
    };

    const spawnInwardParticle = () => {
      const { cx, cy } = getFocalCenter();
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.max(width, height) * (0.34 + Math.random() * 0.28);
      particles.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        size: 2.2 + Math.random() * 4.5,
        alpha: 0,
        color: pickColor(),
        angle: Math.random() * Math.PI * 2,
        vAngle: (Math.random() - 0.5) * 0.14,
        life: 0,
        maxLife: 45 + Math.random() * 35,
        mode: 'inward',
        orbitRadius: dist,
        orbitAngle: angle,
        orbitSpeed: (Math.random() > 0.5 ? 1 : -1) * (0.025 + Math.random() * 0.04),
      });
    };

    const spawnClimaxBurst = () => {
      const { cx, cy } = getFocalCenter();
      const burstCount = theme.isMythicTier6 ? 130 : 96;
      for (let i = 0; i < burstCount; i++) {
        const angle = (Math.PI * 2 * i) / burstCount + (Math.random() - 0.5) * 0.18;
        const speed = 3.5 + Math.random() * (theme.isMythicTier6 ? 14 : 11);
        particles.push({
          x: cx + Math.cos(angle) * (8 + Math.random() * 20),
          y: cy + Math.sin(angle) * (8 + Math.random() * 20),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2.5 + Math.random() * 6.5,
          alpha: 1,
          color: pickColor(),
          angle: angle,
          vAngle: (Math.random() - 0.5) * 0.18,
          life: 0,
          maxLife: 55 + Math.random() * 50,
          mode: 'burst',
        });
      }

      // Twin / Triple concentric shockwave rings
      shockwaves.push({
        radius: 36,
        maxRadius: Math.max(width, height) * 0.58,
        alpha: 0.95,
        lineWidth: 6,
        color: theme.accent,
      });
      shockwaves.push({
        radius: 18,
        maxRadius: Math.max(width, height) * 0.44,
        alpha: 0.85,
        lineWidth: 3.5,
        color: theme.primary,
      });
      if (theme.isMythicTier6) {
        shockwaves.push({
          radius: 8,
          maxRadius: Math.max(width, height) * 0.72,
          alpha: 0.7,
          lineWidth: 2.5,
          color: theme.secondary,
        });
      }

      // Lightning arcs for Storm or Tier 6 Singularity
      if (theme.category === 'storm' || theme.isMythicTier6) {
        const arcCount = theme.category === 'storm' ? 8 : 5;
        for (let a = 0; a < arcCount; a++) {
          const baseAngle = (Math.PI * 2 * a) / arcCount + Math.random() * 0.4;
          const pts: Array<{ x: number; y: number }> = [{ x: cx, y: cy }];
          let curR = 25;
          for (let seg = 0; seg < 7; seg++) {
            curR += 32 + Math.random() * 44;
            const jitter = (Math.random() - 0.5) * 0.35;
            pts.push({
              x: cx + Math.cos(baseAngle + jitter) * curR,
              y: cy + Math.sin(baseAngle + jitter) * curR,
            });
          }
          arcs.push({
            points: pts,
            alpha: 1,
            color: a % 2 === 0 ? theme.accent : theme.primary,
            width: 2.2 + Math.random() * 1.6,
          });
        }
      }
    };

    const spawnAmbientParticle = () => {
      const { cx, cy } = getFocalCenter();
      const spreadX = Math.min(width * 0.45, 360);
      particles.push({
        x: cx + (Math.random() - 0.5) * spreadX * 2,
        y: cy + 160 + Math.random() * 140,
        vx: (Math.random() - 0.5) * 0.7,
        vy: -(0.55 + Math.random() * 1.4),
        size: 1.8 + Math.random() * 3.6,
        alpha: 0,
        color: pickColor(),
        angle: Math.random() * Math.PI * 2,
        vAngle: (Math.random() - 0.5) * 0.04,
        life: 0,
        maxLife: 110 + Math.random() * 80,
        mode: 'ambient',
      });
    };

    const drawParticleShape = (p: Particle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      ctx.fillStyle = p.color;
      ctx.shadowBlur = p.size * 2.2;
      ctx.shadowColor = p.color;

      const s = p.size;
      switch (theme.particleShape) {
        case 'diamond':
        case 'shard':
          ctx.beginPath();
          ctx.moveTo(0, -s * 1.5);
          ctx.lineTo(s * 0.7, 0);
          ctx.lineTo(0, s * 1.5);
          ctx.lineTo(-s * 0.7, 0);
          ctx.closePath();
          ctx.fill();
          break;
        case 'spark':
          ctx.beginPath();
          ctx.moveTo(-s * 2.1, 0);
          ctx.lineTo(0, -s * 0.45);
          ctx.lineTo(s * 2.1, 0);
          ctx.lineTo(0, s * 0.45);
          ctx.closePath();
          ctx.fill();
          break;
        case 'petal':
          ctx.beginPath();
          ctx.ellipse(0, 0, s * 1.35, s * 0.65, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'feather':
          ctx.beginPath();
          ctx.moveTo(-s * 1.9, 0);
          ctx.quadraticCurveTo(0, -s * 0.85, s * 1.9, 0);
          ctx.quadraticCurveTo(0, s * 0.85, -s * 1.9, 0);
          ctx.fill();
          break;
        case 'crescent':
          ctx.beginPath();
          ctx.arc(0, 0, s * 1.1, 0.25 * Math.PI, 1.75 * Math.PI);
          ctx.arc(s * 0.45, 0, s * 0.85, 1.65 * Math.PI, 0.35 * Math.PI, true);
          ctx.closePath();
          ctx.fill();
          break;
        case 'ring_dot':
          ctx.beginPath();
          ctx.arc(0, 0, s * 0.9, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.8;
          ctx.stroke();
          break;
        case 'ember':
        default:
          ctx.beginPath();
          ctx.arc(0, 0, s * 0.85, 0, Math.PI * 2);
          ctx.fill();
          break;
      }
      ctx.restore();
    };

    // Seed initial gathering stream
    for (let i = 0; i < 42; i++) {
      spawnInwardParticle();
    }

    let frame = 0;
    const render = () => {
      frame += 1;
      ctx.clearRect(0, 0, width, height);

      const curPhase = phaseRef.current;
      const { cx, cy } = getFocalCenter();

      if (curPhase === 'gathering' || curPhase === 'metamorphosis') {
        const spawnRate = curPhase === 'metamorphosis' ? 4 : 2;
        for (let i = 0; i < spawnRate; i++) {
          if (particles.length < 150) spawnInwardParticle();
        }
        // Periodic storm micro-arcs during charge
        if (theme.category === 'storm' && frame % 9 === 0) {
          const baseAngle = Math.random() * Math.PI * 2;
          const pts: Array<{ x: number; y: number }> = [];
          let r = 80;
          for (let s = 0; s < 5; s++) {
            pts.push({
              x: cx + Math.cos(baseAngle + (Math.random() - 0.5) * 0.45) * r,
              y: cy + Math.sin(baseAngle + (Math.random() - 0.5) * 0.45) * r,
            });
            r += 28 + Math.random() * 26;
          }
          arcs.push({ points: pts, alpha: 0.78, color: theme.primary, width: 1.6 });
        }
      } else if (curPhase === 'climax' && !climaxTriggeredRef.current) {
        climaxTriggeredRef.current = true;
        spawnClimaxBurst();
      } else if (curPhase === 'revealed') {
        if (!climaxTriggeredRef.current) {
          climaxTriggeredRef.current = true;
          spawnClimaxBurst();
        }
        if (frame % 3 === 0 && particles.length < 72) {
          spawnAmbientParticle();
        }
      }

      // Render Shockwaves
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += (sw.maxRadius - sw.radius) * 0.11 + 5;
        sw.alpha *= 0.91;
        sw.lineWidth = Math.max(0.5, sw.lineWidth * 0.95);
        if (sw.alpha < 0.02) {
          shockwaves.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = sw.alpha;
        ctx.lineWidth = sw.lineWidth;
        ctx.shadowBlur = 20;
        ctx.shadowColor = sw.color;
        ctx.stroke();
        ctx.restore();
      }

      // Render Lightning / Singularity Arcs
      for (let i = arcs.length - 1; i >= 0; i--) {
        const arc = arcs[i];
        arc.alpha *= 0.86;
        if (arc.alpha < 0.03) {
          arcs.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.beginPath();
        arc.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.strokeStyle = arc.color;
        ctx.globalAlpha = arc.alpha;
        ctx.lineWidth = arc.width;
        ctx.shadowBlur = 16;
        ctx.shadowColor = arc.color;
        ctx.stroke();
        ctx.restore();
      }

      // Update & Render Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += 1;
        p.angle += p.vAngle;

        if (p.mode === 'inward') {
          const pullRate = curPhase === 'metamorphosis' ? 0.915 : 0.955;
          p.orbitRadius = (p.orbitRadius ?? 200) * pullRate;
          p.orbitAngle =
            (p.orbitAngle ?? 0) +
            (p.orbitSpeed ?? 0.03) * (curPhase === 'metamorphosis' ? 2.1 : 1);
          p.x = cx + Math.cos(p.orbitAngle) * p.orbitRadius;
          p.y = cy + Math.sin(p.orbitAngle) * p.orbitRadius;
          p.alpha = Math.min(0.95, p.life / 12) * Math.min(1, p.orbitRadius / 45);
          if (p.orbitRadius < 14 || p.life > p.maxLife) {
            particles.splice(i, 1);
            continue;
          }
        } else if (p.mode === 'burst') {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.955;
          p.vy *= 0.955;
          p.alpha = Math.max(0, 1 - p.life / p.maxLife);
          if (p.life >= p.maxLife) {
            particles.splice(i, 1);
            continue;
          }
        } else {
          p.x += p.vx + Math.sin(p.life * 0.04) * 0.25;
          p.y += p.vy;
          const progress = p.life / p.maxLife;
          p.alpha =
            progress < 0.2
              ? progress * 4
              : progress > 0.75
              ? (1 - progress) * 4
              : 0.75;
          if (p.life >= p.maxLife) {
            particles.splice(i, 1);
            continue;
          }
        }

        drawParticleShape(p);
      }

      rafId = window.requestAnimationFrame(render);
    };

    rafId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [staticActive, theme]);

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (staticActive || phase !== 'revealed') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setTilt({ rx: -ny * 9, ry: nx * 11 });
  };

  const resetCardTilt = () => setTilt({ rx: 0, ry: 0 });

  const isRevealed = phase === 'revealed';
  const isClimax = phase === 'climax';

  const overlayNode = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Subida de nível de ${card.name}`}
      onClick={() => {
        if (isRevealed) onComplete();
      }}
      className="fixed inset-0 z-[5000] isolate flex flex-col items-center justify-center overflow-hidden select-none"
      style={{
        zIndex: 5000,
        background: `radial-gradient(ellipse at 50% 45%, ${theme.voidStart} 0%, ${theme.voidMid} 55%, ${theme.voidEdge} 100%)`,
      }}
    >
      {/* Full-Viewport Unclipped Ambient Aura Layer (dissipates smoothly across the entire screen) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-700"
        style={{
          background: isRevealed
            ? `radial-gradient(circle at 35% 50%, ${theme.primary}38 0%, ${theme.secondary}22 20%, ${theme.primary}10 38%, transparent 66%)`
            : `radial-gradient(circle at 50% 50%, ${theme.primary}34 0%, ${theme.secondary}1a 22%, transparent 60%)`,
          opacity: isClimax || isRevealed ? 1 : 0.65,
        }}
      />

      {/* Top & Bottom Cinema Letterbox Bars */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 inset-x-0 h-8 sm:h-11 bg-black/85 border-b z-30 flex items-center justify-between px-4 sm:px-8"
        style={{ borderColor: `${theme.primary}33` }}
      >
        <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-mono tracking-[0.2em] uppercase text-stone-400 whitespace-nowrap truncate">
          <span style={{ color: theme.primary }}>{tierInfo.name}</span>
          <span aria-hidden="true">·</span>
          <span>{elementInfo?.name || card.element}</span>
          <span aria-hidden="true">·</span>
          <span className="text-stone-200">{theme.ascensionTitle}</span>
        </div>

        {!isRevealed && !staticActive && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPhase('revealed');
            }}
            className="pointer-events-auto flex items-center gap-1.5 text-[11px] font-medium text-stone-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0 px-2 py-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <FastForward size={13} />
            <span>Pular</span>
          </button>
        )}
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 inset-x-0 h-8 sm:h-11 bg-black/85 border-t z-30 flex items-center justify-center px-4"
        style={{ borderColor: `${theme.primary}33` }}
      >
        <span className="text-[10px] sm:text-[11px] tracking-[0.16em] uppercase text-stone-400">
          {isRevealed
            ? 'Toque fora ou pressione Espaço para continuar'
            : theme.epithet}
        </span>
      </div>

      {/* 60fps Canvas Particle & Energy Field Layer */}
      {!staticActive && (
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 z-10"
        />
      )}

      {/* Tier 6 Exclusive Gravitational Eclipse Compression Ring */}
      {!staticActive && theme.isMythicTier6 && phase === 'metamorphosis' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
        >
          <div
            className="w-64 h-64 sm:w-80 sm:h-80 rounded-full animate-ascension-tier6-eclipse"
            style={{
              background:
                theme.category === 'singularity'
                  ? 'radial-gradient(circle, #000000 44%, rgba(251,146,60,0.95) 56%, rgba(253,224,71,0.45) 68%, transparent 78%)'
                  : 'radial-gradient(circle, #090105 44%, rgba(244,63,94,0.95) 56%, rgba(192,132,252,0.4) 68%, transparent 78%)',
              boxShadow: `0 0 80px ${theme.glowRgba}`,
            }}
          />
        </div>
      )}

      {/* Anamorphic Horizontal Light Blade & Climax Flash Veil */}
      {!staticActive && isClimax && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-40 animate-ascension-flash-peak"
            style={{
              background: `radial-gradient(circle at 50% 48%, ${theme.flashCore} 0%, ${theme.primary}88 38%, transparent 72%)`,
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-24 sm:h-32 z-40 animate-ascension-horizon-sweep"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${theme.primary}cc 28%, #ffffff 50%, ${theme.secondary}cc 72%, transparent 100%)`,
              filter: 'blur(6px)',
            }}
          />
        </>
      )}

      {/* ==================================================================== */}
      {/* CENTER THEATRICAL STAGE (CARD SHOWCASE + AWAKENED EDITORIAL PANEL)   */}
      {/* Full-bleed scroll wrapper + overflow-visible stage prevents any glow clipping */}
      {/* ==================================================================== */}
      <div className="relative z-20 w-full h-full overflow-y-auto overflow-x-hidden flex items-center justify-center pt-10 pb-10 sm:pt-14 sm:pb-14">
        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-5xl overflow-visible px-4 sm:px-8 py-6 sm:py-10 my-auto flex flex-col items-center justify-center transition-all duration-700 ${
            isRevealed ? 'md:flex-row md:items-center md:justify-center md:gap-10 lg:gap-14' : ''
          }`}
        >
          {/* LEFT / CENTER COLUMN: ILLUMINATED CARD STAGE + CELESTIAL SEAL */}
          <div
            className="relative overflow-visible flex flex-col items-center justify-center shrink-0 py-3 sm:py-5"
            onPointerMove={handleCardPointerMove}
            onPointerLeave={resetCardTilt}
          >
          <CelestialAscensionSeal
            theme={theme}
            phase={phase}
            isStaticMode={staticActive}
          />

          {/* 3D Perspective Card Vessel */}
          <div
            className={`relative z-20 transition-transform duration-300 ease-out ${
              staticActive
                ? ''
                : phase === 'gathering'
                ? 'animate-ascension-card-charge'
                : phase === 'metamorphosis'
                ? 'animate-ascension-card-flip'
                : phase === 'climax'
                ? 'animate-ascension-card-erupt'
                : 'animate-ascension-aura-float'
            }`}
            style={{
              transform:
                !staticActive && isRevealed
                  ? `perspective(1200px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`
                  : undefined,
            }}
          >
            {/* Outer Forged Luminance Rim around Card */}
            <div
              className="relative rounded-[20px] p-[3px] transition-all duration-500"
              style={{
                background: isClimax || isRevealed
                  ? `linear-gradient(135deg, ${theme.accent}, ${theme.primary}, ${theme.secondary}, ${theme.accent})`
                  : `linear-gradient(135deg, ${theme.primary}66, ${theme.secondary}55)`,
                boxShadow:
                  isClimax || isRevealed
                    ? `0 22px 60px rgba(0,0,0,0.92), 0 0 42px ${theme.glowRgba}, 0 0 90px ${theme.secondaryGlowRgba}`
                    : `0 18px 45px rgba(0,0,0,0.9), 0 0 24px ${theme.glowRgba}`,
              }}
            >
              <div className="rounded-[17px] overflow-hidden bg-stone-950">
                <CardView
                  card={displayedCard}
                  size="md"
                  isPlayable={false}
                  isLevelingUp={false}
                />
              </div>
            </div>
          </div>

          {/* Phase Caption under Card during Buildup (Before Reveal) */}
          {!isRevealed && (
            <div className="relative z-20 mt-6 text-center">
              <p
                className="text-xs sm:text-sm font-serif font-bold uppercase tracking-[0.26em] text-stone-200"
                style={{ textShadow: `0 0 18px ${theme.glowRgba}` }}
              >
                {phase === 'gathering'
                  ? 'Despertando Poder Latente'
                  : phase === 'metamorphosis'
                  ? theme.epithet
                  : 'Nível II Desperto'}
              </p>
            </div>
          )}
        </div>

        {/* RIGHT / BOTTOM COLUMN: REFINED AWAKENED EDITORIAL SHOWCASE */}
        {isRevealed && (
          <div
            className={`relative z-20 w-full max-w-md flex flex-col items-center md:items-start text-center md:text-left mt-3 md:mt-0 ${
              staticActive ? '' : 'animate-ascension-panel-in'
            }`}
          >
            {/* Clean Unboxed Metadata Line (Zero-Pill Discipline) */}
            <div className="flex items-center flex-wrap justify-center md:justify-start gap-2 text-xs font-mono tracking-wider uppercase text-stone-300">
              <span style={{ color: theme.primary }} className="font-bold">
                Nível I → Nível II
              </span>
              <span aria-hidden="true" className="text-stone-600">
                ·
              </span>
              <span>{tierInfo.name}</span>
              <span aria-hidden="true" className="text-stone-600">
                ·
              </span>
              <span>{elementInfo?.name || card.element}</span>
            </div>

            {/* Monumental Card Name */}
            <h2
              className={`mt-2 text-2xl sm:text-4xl font-serif font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r ${theme.textGradient} text-balance leading-tight`}
              style={{ filter: `drop-shadow(0 4px 18px ${theme.glowRgba})` }}
            >
              {card.name}
            </h2>

            {/* Poetic Epithet */}
            <p className="mt-1 text-sm sm:text-base font-serif italic text-stone-200/90">
              {theme.epithet}
            </p>

            {/* Hairline Divider */}
            <div
              aria-hidden="true"
              className="my-3.5 w-full h-[1px]"
              style={{
                background: `linear-gradient(90deg, ${theme.primary}aa 0%, ${theme.secondary}44 65%, transparent 100%)`,
              }}
            />

            {/* Stat / Milestone Highlight (Clean Text Strip) */}
            {theme.statHighlight && (
              <div className="mb-3 flex items-center gap-2 text-xs font-mono font-bold tracking-wide text-stone-100">
                <Sparkles size={14} style={{ color: theme.primary }} className="shrink-0" />
                <span>{theme.statHighlight}</span>
              </div>
            )}

            {/* Awakened Level 2 Power Panel */}
            <div
              className="w-full rounded-2xl bg-black/55 backdrop-blur-md p-4 text-left border"
              style={{
                borderColor: `${theme.primary}55`,
                boxShadow: `inset 0 1px 0 ${theme.accent}22`,
              }}
            >
              <div
                className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] mb-1.5"
                style={{ color: theme.primary }}
              >
                Poder de Nível 2 Despertado
              </div>
              <p className="text-xs sm:text-sm text-stone-200 leading-relaxed whitespace-pre-line">
                {resolvedPowerText}
              </p>
            </div>

            {/* Single Primary Action */}
            <div className="mt-5 w-full flex items-center justify-center md:justify-start">
              <button
                type="button"
                onClick={onComplete}
                className={`min-h-[46px] px-7 py-2.5 rounded-xl bg-gradient-to-r ${theme.ctaBg} ${theme.ctaText} font-serif font-black text-sm tracking-wide shadow-xl transition-transform duration-150 hover:scale-[1.03] active:scale-[0.98] cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white`}
                style={{ boxShadow: `0 10px 30px ${theme.glowRgba}` }}
              >
                {isPreview ? 'Fechar Prévia' : 'Continuar Batalha'}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(overlayNode, document.body);
  }
  return overlayNode;
};
