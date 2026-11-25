import React, { useEffect, useRef } from 'react';
import { CardInstance } from '../types/game';
import { getCardArtCandidates, advanceCardArtFallback } from '../utils/cardVisuals';
import { Crown, Sparkles } from 'lucide-react';
import { useVisualPreferences } from '../utils/visualTheme';

export interface CelestialCouncilVictoryState {
  active: boolean;
  victor: 'player' | 'opponent';
  stage: 'convergence' | 'ascension' | 'apotheosis';
  archangels: CardInstance[];
}

interface CelestialCouncilVictoryOverlayProps {
  state: CelestialCouncilVictoryState | null;
  playerName: string;
  opponentName: string;
}

const ROMAN_TIERS: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
};

const SUNBURST_RAYS = Array.from({ length: 24 }, (_, idx) => idx * 15);

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  kind: 'mote' | 'feather' | 'star';
  rot: number;
  vRot: number;
  hue: string;
}

interface RingWave {
  radius: number;
  maxRadius: number;
  alpha: number;
  lineWidth: number;
  color: string;
}

export const CelestialCouncilVictoryOverlay: React.FC<CelestialCouncilVictoryOverlayProps> = ({
  state,
  playerName,
  opponentName,
}) => {
  const { animationMode, combatAnimations } = useVisualPreferences();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<CelestialCouncilVictoryState['stage']>('convergence');
  const isOff = animationMode === 'off' || !combatAnimations;
  const isStatic = !isOff && animationMode === 'static';

  useEffect(() => {
    if (state?.stage) {
      stageRef.current = state.stage;
    }
  }, [state?.stage]);

  useEffect(() => {
    if (!state?.active || isOff || isStatic) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
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
    const rings: RingWave[] = [];
    let frameCount = 0;
    let prevStage = stageRef.current;

    const spawnBurst = (count: number, speedScale: number) => {
      const cx = width * 0.5;
      const cy = height * 0.48;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (1.5 + Math.random() * 5.2) * speedScale;
        const rKind = Math.random();
        particles.push({
          x: cx + (Math.random() - 0.5) * 40,
          y: cy + (Math.random() - 0.5) * 40,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.5,
          size: rKind < 0.28 ? 6 + Math.random() * 7 : 2 + Math.random() * 3.5,
          alpha: 0.95,
          decay: 0.008 + Math.random() * 0.01,
          kind: rKind < 0.25 ? 'feather' : rKind < 0.55 ? 'star' : 'mote',
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.08,
          hue: Math.random() < 0.3 ? '#ffffff' : Math.random() < 0.65 ? '#fde047' : '#fbbf24',
        });
      }
    };

    // Initial heavenly wave
    rings.push({
      radius: 20,
      maxRadius: Math.max(width, height) * 0.55,
      alpha: 0.85,
      lineWidth: 4,
      color: '#fde047',
    });
    spawnBurst(48, 0.8);

    const drawFeather = (p: Particle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.hue;
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.moveTo(0, -p.size * 1.4);
      ctx.quadraticCurveTo(p.size * 0.8, 0, 0, p.size * 1.4);
      ctx.quadraticCurveTo(-p.size * 0.8, 0, 0, -p.size * 1.4);
      ctx.fill();

      ctx.strokeStyle = '#fffbeb';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -p.size * 1.3);
      ctx.lineTo(0, p.size * 1.3);
      ctx.stroke();
      ctx.restore();
    };

    const drawStar = (p: Particle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.hue;
      ctx.shadowColor = '#fef08a';
      ctx.shadowBlur = 14;
      const s = p.size * 1.3;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(0, 0, s, 0);
      ctx.quadraticCurveTo(0, 0, 0, s);
      ctx.quadraticCurveTo(0, 0, -s, 0);
      ctx.quadraticCurveTo(0, 0, 0, -s);
      ctx.fill();
      ctx.restore();
    };

    const render = () => {
      frameCount++;
      const currentStage = stageRef.current;

      if (currentStage !== prevStage) {
        prevStage = currentStage;
        if (currentStage === 'ascension') {
          rings.push({
            radius: 30,
            maxRadius: Math.max(width, height) * 0.7,
            alpha: 0.95,
            lineWidth: 6,
            color: '#fef08a',
          });
          spawnBurst(75, 1.15);
        } else if (currentStage === 'apotheosis') {
          rings.push({
            radius: 25,
            maxRadius: Math.max(width, height) * 0.95,
            alpha: 1,
            lineWidth: 10,
            color: '#ffffff',
          });
          rings.push({
            radius: 15,
            maxRadius: Math.max(width, height) * 0.8,
            alpha: 0.9,
            lineWidth: 5,
            color: '#fbbf24',
          });
          spawnBurst(120, 1.55);
        }
      }

      ctx.clearRect(0, 0, width, height);
      const cx = width * 0.5;
      const cy = height * 0.48;

      // Ambient heavenly pillars descending onto the 5 Archangel seal arc
      const pillarCount = 5;
      for (let i = 0; i < pillarCount; i++) {
        const offsetNorm = (i - 2) / 2; // -1 .. +1
        const px =
          currentStage === 'convergence'
            ? cx + offsetNorm * Math.min(width * 0.32, 260)
            : cx + offsetNorm * Math.min(width * 0.16, 130);
        const beamW = currentStage === 'apotheosis' ? 85 : 52;
        const grad = ctx.createLinearGradient(px, 0, px, height * 0.72);
        const alphaBase =
          currentStage === 'convergence'
            ? 0.16 + 0.05 * Math.sin(frameCount * 0.08 + i)
            : currentStage === 'ascension'
            ? 0.24
            : 0.18;
        grad.addColorStop(0, `rgba(255, 251, 235, ${alphaBase * 1.4})`);
        grad.addColorStop(0.5, `rgba(251, 191, 36, ${alphaBase})`);
        grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(px - beamW * 0.5, 0, beamW, height * 0.72);
      }

      // Central Pillar of Divine Glory in Ascension & Apotheosis
      if (currentStage === 'ascension' || currentStage === 'apotheosis') {
        const centralW = currentStage === 'apotheosis' ? 240 : 120;
        const cGrad = ctx.createLinearGradient(cx - centralW * 0.5, 0, cx + centralW * 0.5, 0);
        const centralAlpha = currentStage === 'apotheosis' ? 0.38 : 0.2;
        cGrad.addColorStop(0, 'rgba(251, 191, 36, 0)');
        cGrad.addColorStop(0.5, `rgba(255, 253, 240, ${centralAlpha})`);
        cGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = cGrad;
        ctx.fillRect(cx - centralW * 0.5, 0, centralW, height);
      }

      // Continuous ascending heavenly feathers & golden stardust
      const spawnRate = currentStage === 'apotheosis' ? 4 : 2;
      for (let s = 0; s < spawnRate; s++) {
        const isFeather = Math.random() < 0.35;
        particles.push({
          x: cx + (Math.random() - 0.5) * Math.min(width * 0.8, 760),
          y: height * (0.65 + Math.random() * 0.35),
          vx: (Math.random() - 0.5) * 0.9,
          vy: -(1.2 + Math.random() * 2.4),
          size: isFeather ? 5 + Math.random() * 6 : 1.5 + Math.random() * 2.8,
          alpha: 0.85,
          decay: 0.005 + Math.random() * 0.006,
          kind: isFeather ? 'feather' : Math.random() < 0.3 ? 'star' : 'mote',
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.05,
          hue: Math.random() < 0.35 ? '#fffbeb' : '#fde047',
        });
      }

      // Expanding sacred halo shockwave rings
      for (let i = rings.length - 1; i >= 0; i--) {
        const rw = rings[i];
        rw.radius += (rw.maxRadius - rw.radius) * 0.075 + 4;
        rw.alpha *= 0.962;
        if (rw.alpha <= 0.02 || rw.radius >= rw.maxRadius) {
          rings.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, rw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = rw.color;
        ctx.globalAlpha = rw.alpha;
        ctx.lineWidth = rw.lineWidth;
        ctx.shadowColor = '#fde047';
        ctx.shadowBlur = 22;
        ctx.stroke();
        ctx.restore();
      }

      // Draw & update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vRot;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }
        if (p.kind === 'feather') {
          drawFeather(p);
        } else if (p.kind === 'star') {
          drawStar(p);
        } else {
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.hue;
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [state?.active, isOff, isStatic]);

  if (!state?.active || isOff) return null;

  const isPlayerVictor = state.victor === 'player';
  const victorName = isPlayerVictor ? playerName : opponentName;
  const stage = state.stage;

  // Ensure 5 Tier slots (1..5), using the actual summoned Archangels
  const tierSlots = [1, 2, 3, 4, 5].map((tierNum) => {
    const found = state.archangels.find((c) => c.tier === tierNum);
    return { tier: tierNum, card: found };
  });

  if (isStatic) {
    return (
      <div className="fixed inset-0 z-50 pointer-events-none select-none flex items-center justify-center bg-black/80 p-4">
        <div className="w-full max-w-lg rounded-2xl border-2 border-amber-300 bg-gradient-to-b from-amber-950/95 via-stone-950 to-black p-5 shadow-2xl text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-300/70 text-[11px] font-serif font-black uppercase tracking-widest text-amber-200">
            <Crown size={14} className="text-yellow-300" />
            <span>Passiva Suprema · Aliança Angiris</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-serif font-black uppercase tracking-wider text-amber-100">
            {isPlayerVictor ? '🪽 Vitória do Conselho Celestial!' : '🪽 Julgamento do Conselho Celestial!'}
          </h2>
          <p className="text-xs sm:text-sm text-amber-200/90">
            <strong className="text-white">{victorName}</strong> reuniu os 5 Tiers Angélicos (I–V) e selou a Glória Divina!
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            {tierSlots.map(({ tier, card }) => (
              <div
                key={tier}
                className="px-2 py-1 rounded-lg bg-stone-900 border border-amber-400/60 text-[10px] font-serif font-bold text-amber-200"
              >
                T{ROMAN_TIERS[tier]} · {card ? card.name.split(',')[0] : `Arcanjo`}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none overflow-hidden flex items-center justify-center">
      {/* Celestial Backdrop Twilight */}
      <div
        className={`absolute inset-0 transition-all duration-700 ${
          stage === 'apotheosis'
            ? 'bg-gradient-to-b from-amber-900/75 via-[#160f29]/85 to-black/92 backdrop-blur-sm'
            : stage === 'ascension'
            ? 'bg-gradient-to-b from-amber-950/75 via-[#0f0b20]/88 to-black/90 backdrop-blur-xs'
            : 'bg-gradient-to-b from-[#130e24]/82 via-[#090714]/88 to-black/88 backdrop-blur-[2px]'
        }`}
      />

      {/* Fullscreen Radiant Divine Supernova Flash on Apotheosis */}
      {stage === 'apotheosis' && (
        <div className="absolute inset-0 bg-gradient-to-b from-amber-100/70 via-yellow-300/40 to-amber-600/20 animate-celestial-flash pointer-events-none z-40" />
      )}

      {/* 60fps Canvas Layer (Heavenly Pillars, Ascending Feathers, Halo Shockwaves, Golden Stardust) */}
      <canvas ref={canvasRef} className="absolute inset-0 z-10 pointer-events-none" />

      {/* Rotating 24-Ray Golden Sunburst */}
      <div
        className={`absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[920px] h-[920px] pointer-events-none z-10 transition-all duration-700 ${
          stage === 'apotheosis'
            ? 'opacity-65 scale-115'
            : stage === 'ascension'
            ? 'opacity-45 scale-100'
            : 'opacity-20 scale-75'
        }`}
      >
        <div className="w-full h-full animate-angiris-mandala relative flex items-center justify-center">
          {SUNBURST_RAYS.map((deg) => (
            <div
              key={deg}
              style={{ transform: `rotate(${deg}deg)` }}
              className="absolute inset-y-0 w-3 bg-gradient-to-t from-transparent via-amber-300/35 to-transparent"
            />
          ))}
        </div>
      </div>

      {/* Main Sacred Council Stage */}
      <div className="relative z-30 flex flex-col items-center justify-center max-w-3xl w-full px-4 text-center">
        {/* Top Kicker Banner */}
        <div
          className={`mb-4 inline-flex items-center gap-2 px-5 py-1.5 rounded-full border-2 text-[11px] sm:text-xs font-serif font-black uppercase tracking-[0.22em] transition-all duration-500 ${
            stage === 'apotheosis'
              ? 'bg-gradient-to-r from-amber-950/95 via-yellow-900/90 to-amber-950/95 border-amber-200 text-amber-100 shadow-[0_0_40px_rgba(251,191,36,0.9)] scale-105'
              : stage === 'ascension'
              ? 'bg-amber-950/90 border-amber-300 text-amber-200 shadow-[0_0_30px_rgba(251,191,36,0.65)]'
              : 'bg-stone-950/90 border-amber-400/75 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.45)]'
          }`}
        >
          <Sparkles size={14} className="text-yellow-200 animate-spin-slow" />
          <span>Passiva Suprema · Aliança Angiris</span>
          <Sparkles size={14} className="text-yellow-200 animate-spin-slow" />
        </div>

        {/* Center Seraphic Wings + Sacred Mandala + Supreme Crest */}
        <div className="relative flex items-center justify-center w-72 h-60 sm:w-96 sm:h-72 my-1">
          {/* Outer Rotating Sacred Geometry Mandala SVG */}
          <svg
            viewBox="0 0 400 400"
            className={`absolute w-72 h-72 sm:w-88 sm:h-88 pointer-events-none animate-angiris-mandala transition-all duration-700 ${
              stage === 'apotheosis'
                ? 'opacity-95 scale-115 drop-shadow-[0_0_30px_rgba(253,224,71,0.9)]'
                : stage === 'ascension'
                ? 'opacity-80 scale-100 drop-shadow-[0_0_20px_rgba(251,191,36,0.75)]'
                : 'opacity-45 scale-80'
            }`}
          >
            <defs>
              <linearGradient id="angirisGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fffbeb" />
                <stop offset="45%" stopColor="#fde047" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>
            <circle cx="200" cy="200" r="188" fill="none" stroke="url(#angirisGold)" strokeWidth="2.5" strokeDasharray="10 6" />
            <circle cx="200" cy="200" r="168" fill="none" stroke="url(#angirisGold)" strokeWidth="1.5" opacity="0.8" />
            <circle cx="200" cy="200" r="134" fill="none" stroke="url(#angirisGold)" strokeWidth="2" strokeDasharray="4 8" />
            {/* Sacred 12-Point Celestial Star */}
            <polygon
              points="200,14 226,130 330,70 270,174 386,200 270,226 330,330 226,270 200,386 174,270 70,330 130,226 14,200 130,174 70,70 174,130"
              fill="none"
              stroke="url(#angirisGold)"
              strokeWidth="1.8"
              opacity="0.72"
            />
          </svg>

          {/* Counter-Rotating Inner Pentagram Halo */}
          <svg
            viewBox="0 0 260 260"
            className={`absolute w-48 h-48 sm:w-56 sm:h-56 pointer-events-none animate-angiris-mandala-reverse transition-all duration-700 ${
              stage === 'apotheosis' ? 'opacity-100 scale-110' : 'opacity-70 scale-95'
            }`}
          >
            <circle cx="130" cy="130" r="118" fill="none" stroke="#fef08a" strokeWidth="2" strokeDasharray="16 6 3 6" />
            <polygon
              points="130,18 196,216 28,94 232,94 64,216"
              fill="none"
              stroke="#fde047"
              strokeWidth="2.2"
              opacity="0.85"
            />
          </svg>

          {/* Unfurling Seraphic Golden Wings SVG */}
          <svg
            viewBox="0 0 560 260"
            className={`absolute w-[340px] sm:w-[490px] h-auto pointer-events-none transition-all duration-700 ${
              stage === 'apotheosis'
                ? 'opacity-100 scale-110 drop-shadow-[0_0_38px_rgba(253,224,71,0.95)]'
                : stage === 'ascension'
                ? 'opacity-95 scale-100 animate-seraph-wings-unfurl drop-shadow-[0_0_26px_rgba(251,191,36,0.85)]'
                : 'opacity-40 scale-70'
            }`}
          >
            <defs>
              <linearGradient id="seraphWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="38%" stopColor="#fef08a" />
                <stop offset="78%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#92400e" />
              </linearGradient>
            </defs>
            {/* Left Wing */}
            <g fill="url(#seraphWingGrad)" stroke="#fffbeb" strokeWidth="1.2" opacity="0.92">
              <path d="M250,145 C195,90 120,30 16,22 C65,68 122,102 195,134 Z" />
              <path d="M248,150 C185,112 105,68 28,68 C78,104 135,130 202,152 Z" />
              <path d="M246,156 C185,135 112,108 50,114 C96,140 152,158 212,168 Z" />
              <path d="M244,162 C192,155 130,146 78,158 C122,175 170,180 220,182 Z" />
              <path d="M242,168 C202,172 155,178 112,196 C152,202 195,198 230,192 Z" />
            </g>
            {/* Right Wing */}
            <g fill="url(#seraphWingGrad)" stroke="#fffbeb" strokeWidth="1.2" opacity="0.92">
              <path d="M310,145 C365,90 440,30 544,22 C495,68 438,102 365,134 Z" />
              <path d="M312,150 C375,112 455,68 532,68 C482,104 425,130 358,152 Z" />
              <path d="M314,156 C375,135 448,108 510,114 C464,140 408,158 348,168 Z" />
              <path d="M316,162 C368,155 430,146 482,158 C438,175 390,180 340,182 Z" />
              <path d="M318,168 C358,172 405,178 448,196 C408,202 365,198 328,192 Z" />
            </g>
          </svg>

          {/* Central Radiant Angiris Core Medallion */}
          <div
            className={`relative z-20 w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-700 ${
              stage === 'apotheosis'
                ? 'border-white bg-gradient-to-br from-amber-100 via-yellow-400 to-amber-700 text-stone-950 shadow-[0_0_75px_#fef08a,0_0_120px_#f59e0b] scale-115'
                : stage === 'ascension'
                ? 'border-amber-200 bg-gradient-to-br from-amber-300 via-amber-600 to-stone-950 text-amber-100 shadow-[0_0_55px_#fbbf24] scale-105'
                : 'border-amber-400/90 bg-gradient-to-br from-stone-900 via-amber-950 to-black text-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.55)]'
            }`}
          >
            <Crown
              size={22}
              className={`-mb-0.5 ${
                stage === 'apotheosis' ? 'text-stone-950 animate-bounce' : 'text-yellow-200 animate-pulse'
              }`}
            />
            <span className="text-3xl sm:text-4xl leading-none drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]">
              👼
            </span>
          </div>
        </div>

        {/* 5 Converging Archangel Seals (Tiers I to V) */}
        <div
          className={`relative z-30 flex items-center justify-center transition-all duration-700 mt-1 ${
            stage === 'convergence'
              ? 'gap-2.5 sm:gap-5 scale-100'
              : stage === 'ascension'
              ? 'gap-1.5 sm:gap-3 scale-95'
              : 'gap-2 sm:gap-3.5 scale-100'
          }`}
        >
          {tierSlots.map(({ tier, card }, idx) => {
            const artCandidates = card
              ? getCardArtCandidates(card.templateId, {
                  isLvl2: card.level === 2,
                  isRevealedFaleziel: card.isRevealedFaleziel,
                  isPack: card.templateId === 'pack_atormentador' || card.isPack,
                  name: card.name,
                })
              : [];
            const artUrl = artCandidates[0] || null;
            return (
              <div
                key={tier}
                style={{ animationDelay: `${idx * 90}ms` }}
                className="flex flex-col items-center gap-1 transition-all duration-700"
              >
                <div
                  className={`relative w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 overflow-hidden flex items-center justify-center bg-stone-950 transition-all duration-700 ${
                    stage === 'apotheosis'
                      ? 'border-white ring-2 ring-amber-300 shadow-[0_0_28px_#fde047]'
                      : stage === 'ascension'
                      ? 'border-amber-200 shadow-[0_0_22px_#fbbf24]'
                      : 'border-amber-400/90 shadow-[0_0_14px_rgba(251,191,36,0.65)]'
                  }`}
                >
                  {artUrl ? (
                    <img
                      key={artUrl}
                      src={artUrl}
                      alt={card?.name || `Arcanjo Tier ${tier}`}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        if (!advanceCardArtFallback(e.currentTarget, artCandidates)) {
                          e.currentTarget.style.display = 'none';
                        }
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl">👼</span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-amber-200/20 pointer-events-none" />
                  <span className="absolute bottom-0.5 inset-x-0 text-center text-[9px] sm:text-[10px] font-serif font-black text-amber-200 drop-shadow-[0_1px_3px_#000]">
                    T{ROMAN_TIERS[tier]}
                  </span>
                </div>
                <span className="max-w-[58px] sm:max-w-[78px] truncate text-[9px] sm:text-[10px] font-serif font-bold text-amber-200/95 drop-shadow">
                  {card ? card.name.split(',')[0] : `Tier ${tier}`}
                </span>
              </div>
            );
          })}
        </div>

        {/* Proclamation Title & Status Subtitle */}
        <div className="mt-5 z-40 space-y-1.5">
          {stage === 'convergence' && (
            <>
              <h2 className="text-xl sm:text-3xl font-serif font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-yellow-300 to-amber-200 drop-shadow-[0_0_18px_rgba(251,191,36,0.7)]">
                O Conselho Celestial Desperta
              </h2>
              <p className="text-xs sm:text-sm font-serif text-amber-100/90">
                Os Cinco Arcanjos dos Tiers I a V respondem ao chamado de{' '}
                <strong className="text-white">{victorName}</strong>...
              </p>
            </>
          )}

          {stage === 'ascension' && (
            <>
              <h2 className="text-2xl sm:text-4xl font-serif font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-yellow-400 drop-shadow-[0_0_24px_rgba(253,224,71,0.9)]">
                Aliança Angiris Suprema
              </h2>
              <p className="text-xs sm:text-base font-serif font-bold text-amber-100">
                ✨ Asas da glória eterna selam o destino do campo de batalha!
              </p>
            </>
          )}

          {stage === 'apotheosis' && (
            <div className="animate-in zoom-in-75 duration-300 flex flex-col items-center gap-1">
              <h2 className="text-2xl sm:text-5xl font-serif font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-white to-yellow-300 drop-shadow-[0_0_35px_rgba(251,191,36,1)]">
                {isPlayerVictor ? '🪽 Vitória do Conselho Celestial!' : '🪽 Julgamento do Conselho Celestial!'}
              </h2>
              <p className="text-xs sm:text-base font-serif font-bold text-amber-200 tracking-wide drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                {victorName} manteve os 5 Tiers Angélicos até o fim da rodada, curou totalmente sua Vida e conquistou a Glória Divina!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
