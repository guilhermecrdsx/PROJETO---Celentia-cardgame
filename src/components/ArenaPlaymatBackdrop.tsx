import React, { useId } from 'react';
import { PlaymatTheme } from '../utils/visualTheme';

export type PlaymatRenderVariant = 'arena' | 'table' | 'preview';
export type PlaymatOwnerSide = 'full' | 'bottom' | 'top';

interface ArenaPlaymatBackdropProps {
  playmat: PlaymatTheme;
  /** When false, renders the static base without motion (used when ambient animations are off). */
  animated?: boolean;
  /** Reduces expensive blur radii on low-end GPU settings. */
  reduceBlur?: boolean;
  /**
   * - 'arena': outer full-viewport arena atmosphere
   * - 'table': directly embedded inside the sculpted combat table floor
   * - 'preview': scaled cleanly inside Shop / Settings cards
   */
  variant?: PlaymatRenderVariant;
  /**
   * Controls where the focal centerpiece and particle/energy anchors sit:
   * - 'full': centered composition (previews)
   * - 'bottom': anchored predominantly on the bottom owner's territory (player side)
   * - 'top': anchored on the top owner's territory (opponent side, vertically mirrored)
   */
  side?: PlaymatOwnerSide;
  className?: string;
}

interface ArenaSplitPlaymatProps {
  playerPlaymat: PlaymatTheme;
  opponentPlaymat?: PlaymatTheme;
  animated?: boolean;
  reduceBlur?: boolean;
  variant?: 'arena' | 'table';
  className?: string;
}

const ARCANE_MOTES = [
  { left: '9%', top: '28%', size: 5, delay: '0s', duration: '4.2s', color: '#c4b5fd' },
  { left: '19%', top: '68%', size: 6, delay: '1.3s', duration: '4.9s', color: '#67e8f9' },
  { left: '31%', top: '42%', size: 4.5, delay: '2.1s', duration: '4.4s', color: '#fcd34d' },
  { left: '42%', top: '80%', size: 5, delay: '0.7s', duration: '5.1s', color: '#a78bfa' },
  { left: '50%', top: '22%', size: 4, delay: '1.9s', duration: '4.8s', color: '#fde68a' },
  { left: '59%', top: '78%', size: 5.5, delay: '2.8s', duration: '4.5s', color: '#67e8f9' },
  { left: '69%', top: '38%', size: 5, delay: '0.4s', duration: '5.3s', color: '#c084fc' },
  { left: '80%', top: '66%', size: 6, delay: '1.6s', duration: '4.3s', color: '#fcd34d' },
  { left: '90%', top: '32%', size: 4.5, delay: '2.5s', duration: '4.7s', color: '#ddd6fe' },
  { left: '26%', top: '86%', size: 4, delay: '3.2s', duration: '5.0s', color: '#fbbf24' },
];

const ARCANE_FLOATING_RUNES = [
  { glyph: 'ᚠ', left: '14%', bottom: '18%', delay: '0s', duration: '6.4s', color: '#c4b5fd' },
  { glyph: 'ᚱ', left: '28%', bottom: '12%', delay: '1.8s', duration: '7.2s', color: '#fcd34d' },
  { glyph: 'ᚦ', left: '43%', bottom: '20%', delay: '3.2s', duration: '6.8s', color: '#67e8f9' },
  { glyph: 'ᛊ', left: '58%', bottom: '14%', delay: '0.9s', duration: '7.0s', color: '#fde68a' },
  { glyph: 'ᛟ', left: '73%', bottom: '19%', delay: '2.5s', duration: '6.5s', color: '#c084fc' },
  { glyph: 'ᚲ', left: '86%', bottom: '15%', delay: '4.1s', duration: '7.4s', color: '#a5f3fc' },
];

const ARCANE_RING_GLYPHS = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛟ'];

const CELESTIAL_FEATHERS = [
  { left: '10%', delay: '0s', duration: '8.4s', size: 6 },
  { left: '21%', delay: '2.1s', duration: '9.6s', size: 5 },
  { left: '33%', delay: '4.2s', duration: '10.4s', size: 6.5 },
  { left: '44%', delay: '1.2s', duration: '8.9s', size: 7 },
  { left: '56%', delay: '3.4s', duration: '9.2s', size: 5.5 },
  { left: '67%', delay: '0.7s', duration: '8.6s', size: 6 },
  { left: '78%', delay: '4.8s', duration: '10.1s', size: 5 },
  { left: '89%', delay: '2.6s', duration: '9.4s', size: 6 },
  { left: '27%', delay: '5.5s', duration: '10.8s', size: 4.5 },
  { left: '73%', delay: '3.9s', duration: '8.8s', size: 4.5 },
];

const CELESTIAL_SPARKLES = [
  { left: '16%', top: '34%', size: 8, delay: '0s', duration: '3.1s' },
  { left: '30%', top: '62%', size: 10, delay: '1.1s', duration: '3.6s' },
  { left: '45%', top: '44%', size: 9, delay: '0.5s', duration: '2.9s' },
  { left: '56%', top: '68%', size: 11, delay: '1.9s', duration: '3.4s' },
  { left: '70%', top: '38%', size: 9, delay: '0.8s', duration: '3.2s' },
  { left: '84%', top: '58%', size: 10, delay: '2.3s', duration: '3.8s' },
  { left: '22%', top: '76%', size: 7, delay: '1.5s', duration: '3.0s' },
  { left: '78%', top: '76%', size: 8, delay: '2.7s', duration: '3.5s' },
];

const FORGE_EMBERS = [
  { left: '6%', delay: '0s', duration: '4.4s', size: 4.5, color: '#fb923c', arc: false },
  { left: '14%', delay: '1.4s', duration: '5.2s', size: 5.5, color: '#f43f5e', arc: true },
  { left: '22%', delay: '0.6s', duration: '4.1s', size: 3.5, color: '#fde047', arc: false },
  { left: '30%', delay: '2.3s', duration: '5.5s', size: 5, color: '#fb7185', arc: true },
  { left: '38%', delay: '1.0s', duration: '4.6s', size: 4, color: '#f97316', arc: false },
  { left: '46%', delay: '3.0s', duration: '4.9s', size: 5.5, color: '#fef08a', arc: true },
  { left: '53%', delay: '0.4s', duration: '4.3s', size: 4.5, color: '#fb923c', arc: false },
  { left: '61%', delay: '2.1s', duration: '5.3s', size: 5, color: '#e11d48', arc: true },
  { left: '69%', delay: '1.6s', duration: '4.5s', size: 3.5, color: '#fbbf24', arc: false },
  { left: '76%', delay: '3.4s', duration: '5.1s', size: 5, color: '#f97316', arc: true },
  { left: '84%', delay: '0.9s', duration: '4.7s', size: 4, color: '#fde047', arc: false },
  { left: '92%', delay: '2.6s', duration: '5.4s', size: 4.5, color: '#f43f5e', arc: true },
  { left: '34%', delay: '3.7s', duration: '4.8s', size: 3.5, color: '#fef08a', arc: false },
  { left: '65%', delay: '4.1s', duration: '5.0s', size: 4, color: '#fb923c', arc: false },
];

const SLATE_STARS = [
  { left: '8%', top: '24%', size: 3.2, delay: '0s' },
  { left: '17%', top: '52%', size: 2.8, delay: '1.1s' },
  { left: '26%', top: '34%', size: 3.8, delay: '0.5s' },
  { left: '35%', top: '66%', size: 2.6, delay: '2.0s' },
  { left: '44%', top: '28%', size: 3.4, delay: '0.9s' },
  { left: '53%', top: '56%', size: 4.0, delay: '1.6s' },
  { left: '62%', top: '32%', size: 2.8, delay: '2.4s' },
  { left: '71%', top: '62%', size: 3.6, delay: '0.7s' },
  { left: '80%', top: '26%', size: 3.2, delay: '1.9s' },
  { left: '89%', top: '48%', size: 3.5, delay: '1.3s' },
  { left: '22%', top: '78%', size: 2.6, delay: '2.8s' },
  { left: '76%', top: '80%', size: 3.0, delay: '0.3s' },
];

const SLATE_FROST_MOTES = [
  { left: '15%', top: '70%', size: 4, delay: '0s', duration: '5.2s' },
  { left: '29%', top: '56%', size: 5, delay: '1.4s', duration: '6.0s' },
  { left: '43%', top: '74%', size: 4, delay: '2.7s', duration: '5.6s' },
  { left: '57%', top: '64%', size: 5, delay: '0.8s', duration: '5.8s' },
  { left: '71%', top: '72%', size: 4, delay: '2.1s', duration: '5.3s' },
  { left: '85%', top: '58%', size: 4.5, delay: '3.2s', duration: '6.2s' },
  { left: '36%', top: '42%', size: 3.5, delay: '1.9s', duration: '5.5s' },
  { left: '64%', top: '44%', size: 3.5, delay: '3.6s', duration: '5.9s' },
];

function getPlaymatAccentRgb(playmat: PlaymatTheme): string {
  switch (playmat) {
    case 'arcane_citadel':
      return 'rgba(167, 139, 250, 0.58)';
    case 'celestial_sanctuary':
      return 'rgba(251, 191, 36, 0.58)';
    case 'obsidian_forge':
      return 'rgba(249, 115, 22, 0.58)';
    case 'classic_slate':
      return 'rgba(56, 189, 248, 0.52)';
    default:
      return 'rgba(148, 163, 184, 0.22)';
  }
}

export const ArenaPlaymatBackdrop: React.FC<ArenaPlaymatBackdropProps> = ({
  playmat,
  animated = true,
  reduceBlur = false,
  variant = 'arena',
  side = 'full',
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const isPreview = variant === 'preview';
  const isTable = variant === 'table';
  const showMotion = animated && playmat !== 'standard_arena';
  const liveClass = variant === 'preview' ? '' : 'arena-playmat-live';

  // When rendered on the opponent's half (top), mirror vertically so effects radiate from the opponent's edge inward
  const mirrorStyle: React.CSSProperties | undefined =
    side === 'top' ? { transform: 'scaleY(-1)' } : undefined;

  // Focal vertical position:
  // - 'full' (preview): centered at 50%
  // - 'bottom' / 'top' (which is mirrored from bottom): anchored solidly in the owner's territory (lower half of the half-layer)
  const focalTopClass = side === 'full' ? 'items-center' : 'items-end pb-[4%]';

  // 0. STANDARD ARENA — Clean, static, ZERO animations
  if (playmat === 'standard_arena') {
    return (
      <div
        className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
        style={{
          ...mirrorStyle,
          background: isTable
            ? 'radial-gradient(ellipse at 50% 65%, #1c1a24 0%, #111018 58%, #08070c 100%)'
            : 'radial-gradient(ellipse at 50% 45%, #1c1b23 0%, #111017 55%, #07070b 100%)',
        }}
      >
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, transparent 55%, rgba(0, 0, 0, 0.72) 100%)',
          }}
        />
        {!isTable && (
          <>
            <div className="absolute inset-[6%] rounded-2xl border border-stone-500/15" />
            <div className="absolute top-1/2 left-[8%] right-[8%] h-px bg-gradient-to-r from-transparent via-stone-500/20 to-transparent" />
          </>
        )}
      </div>
    );
  }

  // 1. ARCANE CITADEL — Upgraded 3-Ring Runic Astrolabe, Arcane Shockwaves, Ley-Line Conduits & Levitating Runes
  if (playmat === 'arcane_citadel') {
    const astrolabeSizeClass = isPreview
      ? 'w-[148%] h-[148%]'
      : isTable
      ? 'w-[92%] h-[92%] max-w-[540px] max-h-[540px]'
      : 'w-[72vmin] h-[72vmin] max-w-[700px] max-h-[700px]';

    return (
      <div
        className={`absolute inset-0 pointer-events-none overflow-hidden ${liveClass} ${className}`}
        style={{
          ...mirrorStyle,
          background:
            side === 'full'
              ? 'radial-gradient(ellipse at 50% 48%, #261b58 0%, #130e2b 52%, #05040d 100%)'
              : 'radial-gradient(ellipse at 50% 78%, #2b1e63 0%, #161033 48%, #070512 100%)',
        }}
      >
        {/* Deep Indigo, Cyan & Amethyst Ambient Glows anchored to owner edge */}
        <div
          className={`absolute -bottom-[22%] left-1/2 -translate-x-1/2 w-[88%] h-[78%] rounded-full bg-violet-600/28 ${
            reduceBlur ? '' : 'blur-3xl'
          }`}
        />
        <div
          className={`absolute -bottom-[18%] -left-[12%] w-[52%] h-[58%] rounded-full bg-cyan-500/18 ${
            reduceBlur ? '' : 'blur-3xl'
          }`}
        />
        <div
          className={`absolute -bottom-[18%] -right-[12%] w-[52%] h-[58%] rounded-full bg-amber-500/18 ${
            reduceBlur ? '' : 'blur-3xl'
          }`}
        />

        {/* Radiating Arcane Ley-Line Conduits extending left & right across owner territory */}
        <svg
          viewBox="0 0 800 400"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full opacity-60"
        >
          <defs>
            <linearGradient id={`leyGrad-${uid}`} x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.1" />
              <stop offset="30%" stopColor="#a78bfa" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#fcd34d" stopOpacity="0.95" />
              <stop offset="70%" stopColor="#a78bfa" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          {/* Static base geometric channels */}
          <g fill="none" stroke="#818cf8" strokeWidth="1" opacity="0.32">
            <path d="M 20 315 L 155 315 L 210 262 L 590 262 L 645 315 L 780 315" />
            <path d="M 45 215 L 185 215 L 245 262" />
            <path d="M 755 215 L 615 215 L 555 262" />
            <path d="M 105 375 L 235 320 L 565 320 L 695 375" />
          </g>
          {/* Animated pulsing energy surges traveling along the ley-lines */}
          <g
            fill="none"
            stroke={`url(#leyGrad-${uid})`}
            strokeWidth="2"
            strokeDasharray="24 60"
            strokeLinecap="round"
            className={showMotion ? 'pm-ley-pulse' : ''}
          >
            <path d="M 20 315 L 155 315 L 210 262 L 590 262 L 645 315 L 780 315" />
            <path d="M 105 375 L 235 320 L 565 320 L 695 375" />
          </g>
          {/* Luminous ley-line junction diamonds */}
          <g fill="#fde68a" opacity="0.72">
            <polygon points="155,310 160,315 155,320 150,315" />
            <polygon points="210,257 215,262 210,267 205,262" />
            <polygon points="590,257 595,262 590,267 585,262" />
            <polygon points="645,310 650,315 645,320 640,315" />
          </g>
        </svg>

        {/* Upgraded 3-Layer Counter-Rotating Runic Astrolabe + Expanding Arcane Shockwaves */}
        <div className={`absolute inset-0 flex justify-center ${focalTopClass}`}>
          <div className={`relative flex items-center justify-center ${astrolabeSizeClass}`}>
            {/* Pulsing Amethyst-Cyan Core Halo */}
            <div
              className={`absolute w-[48%] h-[48%] rounded-full ${
                showMotion ? 'pm-arcane-core-pulse' : 'opacity-50'
              } ${reduceBlur ? '' : 'blur-xl'}`}
              style={{
                background:
                  'radial-gradient(circle, rgba(251, 191, 36, 0.36) 0%, rgba(139, 92, 246, 0.38) 45%, rgba(56, 189, 248, 0.14) 72%, transparent 100%)',
              }}
            />

            {/* 2 Expanding Arcane Shockwave Pulse Rings */}
            {showMotion && (
              <>
                <div
                  className="absolute w-[62%] h-[62%] rounded-full border border-violet-300/65 shadow-[0_0_16px_rgba(167,139,250,0.55)] pm-arcane-shockwave"
                  style={{ animationDelay: '0s' }}
                />
                <div
                  className="absolute w-[62%] h-[62%] rounded-full border border-amber-300/55 shadow-[0_0_14px_rgba(251,191,36,0.45)] pm-arcane-shockwave"
                  style={{ animationDelay: '3.1s' }}
                />
              </>
            )}

            {/* Intricate 3-Ring SVG Runic Astrolabe */}
            <svg viewBox="0 0 420 420" className="w-full h-full opacity-78">
              <defs>
                <radialGradient id={`astroCore-${uid}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fef08a" stopOpacity="0.65" />
                  <stop offset="45%" stopColor="#a78bfa" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Soft inner astrolabe glow disc */}
              <circle cx="210" cy="210" r="88" fill={`url(#astroCore-${uid})`} />

              {/* LAYER 1: Outer Elder-Rune Zodiac Ring (Slow CW) */}
              <g
                className={showMotion ? 'pm-rune-ring-outer' : ''}
                style={{ transformOrigin: '210px 210px' }}
              >
                <circle
                  cx="210"
                  cy="210"
                  r="196"
                  fill="none"
                  stroke="#a78bfa"
                  strokeWidth="1.2"
                  strokeDasharray="12 6 3 6"
                  opacity="0.65"
                />
                <circle
                  cx="210"
                  cy="210"
                  r="176"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1"
                  opacity="0.52"
                />
                <circle
                  cx="210"
                  cy="210"
                  r="164"
                  fill="none"
                  stroke="#67e8f9"
                  strokeWidth="0.7"
                  strokeDasharray="2 7"
                  opacity="0.55"
                />
                {ARCANE_RING_GLYPHS.map((glyph, idx) => {
                  const deg = idx * 30;
                  return (
                    <g key={deg} transform={`rotate(${deg} 210 210)`}>
                      <line x1="210" y1="14" x2="210" y2="24" stroke="#fcd34d" strokeWidth="1.2" opacity="0.75" />
                      <polygon points="210,27 214,34 210,39 206,34" fill="#fcd34d" opacity="0.82" />
                      {!isPreview && (
                        <text
                          x="210"
                          y="53"
                          textAnchor="middle"
                          fill="#ddd6fe"
                          fontSize="11"
                          fontFamily="monospace"
                          opacity="0.72"
                        >
                          {glyph}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>

              {/* LAYER 2: Middle Counter-Clockwise Alchemical Hexagram & Sacred Star (Medium CCW) */}
              <g
                className={showMotion ? 'pm-rune-ccw' : ''}
                style={{ transformOrigin: '210px 210px' }}
              >
                <circle
                  cx="210"
                  cy="210"
                  r="134"
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth="1.3"
                  strokeDasharray="5 5"
                  opacity="0.72"
                />
                {/* Twin interlocked sacred hexagons */}
                <polygon
                  points="210,80 322,145 322,275 210,340 98,275 98,145"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1.15"
                  opacity="0.56"
                />
                <polygon
                  points="210,80 322,145 322,275 210,340 98,275 98,145"
                  transform="rotate(30 210 210)"
                  fill="none"
                  stroke="#c084fc"
                  strokeWidth="1.05"
                  opacity="0.5"
                />
                {/* Cyan astrolabe cross-arcs */}
                <ellipse
                  cx="210"
                  cy="210"
                  rx="132"
                  ry="54"
                  fill="none"
                  stroke="#67e8f9"
                  strokeWidth="0.9"
                  opacity="0.42"
                />
                <ellipse
                  cx="210"
                  cy="210"
                  rx="132"
                  ry="54"
                  transform="rotate(60 210 210)"
                  fill="none"
                  stroke="#c4b5fd"
                  strokeWidth="0.85"
                  opacity="0.38"
                />
                <ellipse
                  cx="210"
                  cy="210"
                  rx="132"
                  ry="54"
                  transform="rotate(120 210 210)"
                  fill="none"
                  stroke="#fde68a"
                  strokeWidth="0.85"
                  opacity="0.36"
                />
                {/* Glowing crystal vertex nodes */}
                {[0, 60, 120, 180, 240, 300].map((deg) => (
                  <g key={deg} transform={`rotate(${deg} 210 210)`}>
                    <circle cx="210" cy="80" r="3.4" fill="#67e8f9" opacity="0.9" />
                    <circle cx="210" cy="80" r="6.2" fill="none" stroke="#c4b5fd" strokeWidth="0.8" opacity="0.6" />
                  </g>
                ))}
              </g>

              {/* LAYER 3: Inner Star-Compass Sigil Core (Faster CW) */}
              <g
                className={showMotion ? 'pm-rune-cw' : ''}
                style={{ transformOrigin: '210px 210px' }}
              >
                <circle
                  cx="210"
                  cy="210"
                  r="76"
                  fill="none"
                  stroke="#e9d5ff"
                  strokeWidth="1.1"
                  opacity="0.55"
                />
                <circle
                  cx="210"
                  cy="210"
                  r="64"
                  fill="none"
                  stroke="#fcd34d"
                  strokeWidth="0.9"
                  strokeDasharray="3 4"
                  opacity="0.6"
                />
                {/* 8-Pointed Arcane Compass Rose */}
                <polygon
                  points="210,136 222,196 284,210 222,224 210,284 198,224 136,210 198,196"
                  fill="none"
                  stroke="#fde68a"
                  strokeWidth="1.2"
                  opacity="0.72"
                />
                <polygon
                  points="210,152 219,201 268,210 219,219 210,268 201,219 152,210 201,201"
                  transform="rotate(45 210 210)"
                  fill="none"
                  stroke="#67e8f9"
                  strokeWidth="1"
                  opacity="0.62"
                />
                <circle cx="210" cy="210" r="14" fill="none" stroke="#fef08a" strokeWidth="1.3" opacity="0.85" />
                <circle cx="210" cy="210" r="4.5" fill="#fef08a" opacity="0.95" />
              </g>
            </svg>
          </div>
        </div>

        {/* Levitating Elder Runes rising from owner territory */}
        {!isPreview &&
          ARCANE_FLOATING_RUNES.map((rune, idx) => (
            <span
              key={`rune-${idx}`}
              className={`absolute font-mono font-bold select-none ${
                showMotion ? 'pm-rune-float' : 'opacity-40'
              }`}
              style={{
                left: rune.left,
                bottom: rune.bottom,
                fontSize: isTable ? '15px' : '18px',
                color: rune.color,
                textShadow: `0 0 10px ${rune.color}, 0 0 18px rgba(139, 92, 246, 0.7)`,
                animationDelay: rune.delay,
                animationDuration: rune.duration,
              }}
            >
              {rune.glyph}
            </span>
          ))}

        {/* 10 Dual-Tone Arcane Motes & Spark Flares */}
        {ARCANE_MOTES.map((mote, i) => (
          <span
            key={i}
            className={`absolute rounded-full ${showMotion ? 'pm-arcane-mote' : 'opacity-45'}`}
            style={{
              left: mote.left,
              top: mote.top,
              width: isPreview ? Math.max(3, mote.size - 1.5) : mote.size,
              height: isPreview ? Math.max(3, mote.size - 1.5) : mote.size,
              backgroundColor: mote.color,
              boxShadow: `0 0 12px ${mote.color}`,
              animationDelay: mote.delay,
              animationDuration: mote.duration,
            }}
          />
        ))}
      </div>
    );
  }

  // 2. CELESTIAL SANCTUARY ANGIRIS — Gilded Seraph Wing Filigree, Solar Halo Ripples, God-Rays & Light Feathers
  if (playmat === 'celestial_sanctuary') {
    const haloSizeClass = isPreview
      ? 'w-[125%] h-[125%]'
      : isTable
      ? 'w-[84%] h-[84%] max-w-[480px] max-h-[480px]'
      : 'w-[66vmin] h-[66vmin] max-w-[640px] max-h-[640px]';

    return (
      <div
        className={`absolute inset-0 pointer-events-none overflow-hidden ${liveClass} ${className}`}
        style={{
          ...mirrorStyle,
          background:
            side === 'full'
              ? 'radial-gradient(ellipse at 50% 24%, #453415 0%, #20180c 52%, #090704 100%)'
              : 'radial-gradient(ellipse at 50% 82%, #4c3816 0%, #22190c 50%, #0a0704 100%)',
        }}
      >
        {/* Warm Radiant Golden Sanctuary Aura */}
        <div
          className={`absolute -bottom-[24%] left-1/2 -translate-x-1/2 w-[96%] h-[78%] rounded-full ${
            showMotion ? 'pm-celestial-halo' : 'opacity-65'
          } ${reduceBlur ? '' : 'blur-2xl'}`}
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(254, 240, 138, 0.44) 0%, rgba(245, 158, 11, 0.22) 48%, transparent 76%)',
          }}
        />

        {/* 3 Sweeping Cathedral God-Rays */}
        <div
          className={`absolute -top-[18%] left-[7%] w-[26%] h-[145%] ${showMotion ? 'pm-godray' : 'opacity-30'}`}
          style={{
            background:
              'linear-gradient(0deg, rgba(254, 243, 199, 0.36) 0%, rgba(251, 191, 36, 0.14) 50%, transparent 90%)',
            transform: 'rotate(-16deg)',
            animationDelay: '0s',
            animationDuration: '8.2s',
          }}
        />
        <div
          className={`absolute -top-[18%] left-[38%] w-[24%] h-[145%] ${showMotion ? 'pm-godray' : 'opacity-28'}`}
          style={{
            background:
              'linear-gradient(0deg, rgba(254, 240, 138, 0.34) 0%, rgba(245, 158, 11, 0.12) 52%, transparent 90%)',
            transform: 'rotate(-8deg)',
            animationDelay: '2.5s',
            animationDuration: '9.8s',
          }}
        />
        <div
          className={`absolute -top-[18%] right-[7%] w-[25%] h-[145%] ${showMotion ? 'pm-godray' : 'opacity-28'}`}
          style={{
            background:
              'linear-gradient(0deg, rgba(253, 224, 71, 0.3) 0%, rgba(217, 119, 6, 0.1) 50%, transparent 88%)',
            transform: 'rotate(15deg)',
            animationDelay: '4.4s',
            animationDuration: '9.1s',
          }}
        />

        {/* Etched Gilded Seraph Wing Filigree + Sacred Archangel Sanctuary Arches */}
        <svg
          viewBox="0 0 800 420"
          preserveAspectRatio="none"
          className={`absolute inset-0 w-full h-full ${showMotion ? 'pm-seraph-breath' : 'opacity-55'}`}
        >
          <defs>
            <linearGradient id={`seraphGold-${uid}`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fde68a" stopOpacity="0.18" />
              <stop offset="50%" stopColor="#fef08a" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.22" />
            </linearGradient>
          </defs>
          {/* Left Seraph Wing Pinions */}
          <g fill="none" stroke={`url(#seraphGold-${uid})`} strokeLinecap="round">
            <path d="M 385 350 C 295 310 190 260 68 185" strokeWidth="2.4" opacity="0.72" />
            <path d="M 380 356 C 285 330 185 295 92 246" strokeWidth="1.8" opacity="0.62" />
            <path d="M 374 364 C 285 348 198 330 124 302" strokeWidth="1.5" opacity="0.52" />
            <path d="M 368 372 C 292 368 220 362 162 350" strokeWidth="1.2" opacity="0.44" />
            <path d="M 388 342 C 308 286 218 220 112 132" strokeWidth="1.5" opacity="0.48" />
          </g>
          {/* Right Seraph Wing Pinions (Mirrored) */}
          <g fill="none" stroke={`url(#seraphGold-${uid})`} strokeLinecap="round">
            <path d="M 415 350 C 505 310 610 260 732 185" strokeWidth="2.4" opacity="0.72" />
            <path d="M 420 356 C 515 330 615 295 708 246" strokeWidth="1.8" opacity="0.62" />
            <path d="M 426 364 C 515 348 602 330 676 302" strokeWidth="1.5" opacity="0.52" />
            <path d="M 432 372 C 508 368 580 362 638 350" strokeWidth="1.2" opacity="0.44" />
            <path d="M 412 342 C 492 286 582 220 688 132" strokeWidth="1.5" opacity="0.48" />
          </g>
          {/* Cathedral Sanctuary Golden Arches */}
          <path d="M 32 375 Q 400 115 768 375" fill="none" stroke="#fde68a" strokeWidth="1.4" opacity="0.45" />
          <path d="M 85 395 Q 400 185 715 395" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="6 6" opacity="0.42" />
        </svg>

        {/* Centered Radiant Solar Halo Crest + Expanding Solar Ripples */}
        <div className={`absolute inset-0 flex justify-center ${focalTopClass}`}>
          <div className={`relative flex items-center justify-center ${haloSizeClass}`}>
            {showMotion && (
              <>
                <div
                  className="absolute w-[56%] h-[56%] rounded-full border border-amber-200/60 shadow-[0_0_18px_rgba(253,224,71,0.5)] pm-solar-ripple"
                  style={{ animationDelay: '0s' }}
                />
                <div
                  className="absolute w-[56%] h-[56%] rounded-full border border-yellow-300/50 shadow-[0_0_14px_rgba(245,158,11,0.45)] pm-solar-ripple"
                  style={{ animationDelay: '3.4s' }}
                />
              </>
            )}

            <svg viewBox="0 0 360 360" className="w-[74%] h-[74%] opacity-72">
              <g className={showMotion ? 'pm-rune-cw' : ''} style={{ transformOrigin: '180px 180px' }}>
                <circle cx="180" cy="180" r="144" fill="none" stroke="#fef08a" strokeWidth="1.1" strokeDasharray="8 6" opacity="0.6" />
                <circle cx="180" cy="180" r="118" fill="none" stroke="#f59e0b" strokeWidth="1.2" opacity="0.52" />
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                  <g key={deg} transform={`rotate(${deg} 180 180)`}>
                    <line
                      x1="180"
                      y1={deg % 60 === 0 ? '26' : '44'}
                      x2="180"
                      y2="66"
                      stroke="#fef08a"
                      strokeWidth={deg % 60 === 0 ? '1.8' : '1'}
                      opacity={deg % 60 === 0 ? '0.85' : '0.5'}
                    />
                  </g>
                ))}
              </g>
              <g className={showMotion ? 'pm-rune-ccw' : ''} style={{ transformOrigin: '180px 180px' }}>
                <polygon
                  points="180,82 198,162 278,180 198,198 180,278 162,198 82,180 162,162"
                  fill="none"
                  stroke="#fef3c7"
                  strokeWidth="1.2"
                  opacity="0.7"
                />
                <circle cx="180" cy="180" r="32" fill="none" stroke="#fcd34d" strokeWidth="1.3" opacity="0.75" />
                <circle cx="180" cy="180" r="8" fill="#fef9c3" opacity="0.9" />
              </g>
            </svg>
          </div>
        </div>

        {/* 8 Twinkling Golden Diamond-Star Glints */}
        {CELESTIAL_SPARKLES.map((sp, idx) => (
          <svg
            key={`sp-${idx}`}
            viewBox="0 0 24 24"
            className={`absolute ${showMotion ? 'pm-celestial-sparkle' : 'opacity-50'}`}
            style={{
              left: sp.left,
              top: sp.top,
              width: isPreview ? Math.max(6, sp.size - 2) : sp.size,
              height: isPreview ? Math.max(6, sp.size - 2) : sp.size,
              filter: 'drop-shadow(0 0 6px rgba(254, 240, 138, 0.9))',
              animationDelay: sp.delay,
              animationDuration: sp.duration,
            }}
          >
            <path d="M12 0 L14.8 9.2 L24 12 L14.8 14.8 L12 24 L9.2 14.8 L0 12 L9.2 9.2 Z" fill="#fef9c3" />
          </svg>
        ))}

        {/* 10 Luminous Descending Light-Feathers */}
        {CELESTIAL_FEATHERS.map((f, idx) => (
          <span
            key={idx}
            className={`absolute top-0 rounded-full ${showMotion ? 'pm-feather-fall' : 'opacity-45'}`}
            style={{
              left: f.left,
              width: isPreview ? Math.max(3, f.size - 2) : f.size,
              height: isPreview ? Math.max(7, f.size * 1.5) : f.size * 2.4,
              background:
                'linear-gradient(180deg, rgba(255,251,235,0.98) 0%, rgba(251,191,36,0.78) 58%, transparent 100%)',
              boxShadow: '0 0 10px rgba(253, 224, 71, 0.85)',
              animationDelay: f.delay,
              animationDuration: f.duration,
            }}
          />
        ))}
      </div>
    );
  }

  // 3. OBSIDIAN FORGE — Volcanic Caldera Heart, Dual-Phase Surging Magma Fissures, Heat Shimmer & Cinder Storm
  if (playmat === 'obsidian_forge') {
    return (
      <div
        className={`absolute inset-0 pointer-events-none overflow-hidden ${liveClass} ${className}`}
        style={{
          ...mirrorStyle,
          background:
            'radial-gradient(ellipse at 50% 88%, #3f1218 0%, #1d090e 50%, #080305 100%)',
        }}
      >
        {/* Molten Caldera Hearth Underglow */}
        <div
          className={`absolute -bottom-[22%] left-0 right-0 h-[72%] ${showMotion ? 'pm-heat-glow' : 'opacity-65'}`}
          style={{
            background:
              'radial-gradient(ellipse at 50% 100%, rgba(251, 146, 60, 0.44) 0%, rgba(225, 29, 72, 0.24) 46%, transparent 78%)',
          }}
        />

        {/* 2 Rising Vertical Heat-Shimmer Plumes */}
        <div
          className={`absolute bottom-0 left-[12%] w-[34%] h-[88%] rounded-full ${
            showMotion ? 'pm-heat-shimmer' : 'opacity-20'
          } ${reduceBlur ? '' : 'blur-2xl'}`}
          style={{
            background:
              'linear-gradient(0deg, rgba(249, 115, 22, 0.3) 0%, rgba(225, 29, 72, 0.14) 55%, transparent 100%)',
            animationDelay: '0s',
          }}
        />
        <div
          className={`absolute bottom-0 right-[12%] w-[34%] h-[88%] rounded-full ${
            showMotion ? 'pm-heat-shimmer' : 'opacity-20'
          } ${reduceBlur ? '' : 'blur-2xl'}`}
          style={{
            background:
              'linear-gradient(0deg, rgba(251, 191, 36, 0.25) 0%, rgba(249, 115, 22, 0.14) 55%, transparent 100%)',
            animationDelay: '2.3s',
          }}
        />

        {/* Multi-Layer Branching Volcanic Magma Fissure Network + Forged Obsidian Hearth Ring */}
        <svg
          viewBox="0 0 800 440"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
        >
          <defs>
            <linearGradient id={`magmaGrad-${uid}`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
            <radialGradient id={`calderaCore-${uid}`} cx="50%" cy="100%" r="60%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.58" />
              <stop offset="45%" stopColor="#f97316" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Forged volcanic hearth glow at owner baseline */}
          <ellipse cx="400" cy="430" rx="280" ry="135" fill={`url(#calderaCore-${uid})`} />

          {/* Obsidian Basalt Plate Lines */}
          <g fill="none" stroke="#451a1d" strokeWidth="2" opacity="0.6">
            <polygon points="315,435 360,335 440,335 485,435" />
            <polygon points="215,435 280,295 520,295 585,435" />
          </g>

          {/* Layer A: Wide Pulsing Crimson-Orange Lava Underglow Cracks */}
          <g
            fill="none"
            stroke="#f97316"
            strokeWidth="8"
            strokeLinecap="round"
            className={showMotion ? 'pm-magma-pulse' : 'opacity-40'}
            opacity="0.38"
          >
            <path d="M 35 435 L 130 335 L 108 265 L 215 178 L 195 102 L 272 35" />
            <path d="M 765 435 L 665 330 L 692 252 L 580 172 L 618 92 L 535 28" />
            <path d="M 328 438 L 368 355 L 348 282 L 405 215 L 456 278 L 434 358 L 474 438" />
            <path d="M 130 335 L 222 315 L 288 355 L 368 355" />
            <path d="M 665 330 L 574 312 L 510 355 L 434 358" />
          </g>

          {/* Layer B: Crisp Molten Core Cracks */}
          <g
            fill="none"
            stroke={`url(#magmaGrad-${uid})`}
            strokeWidth="2.4"
            strokeLinecap="round"
            className={showMotion ? 'pm-magma-pulse' : 'opacity-75'}
          >
            <path d="M 35 435 L 130 335 L 108 265 L 215 178 L 195 102 L 272 35" />
            <path d="M 130 335 L 222 315 L 288 355 L 368 355" />
            <path d="M 215 178 L 284 198" />
            <path d="M 765 435 L 665 330 L 692 252 L 580 172 L 618 92 L 535 28" />
            <path d="M 665 330 L 574 312 L 510 355 L 434 358" />
            <path d="M 580 172 L 516 196" />
            <path d="M 328 438 L 368 355 L 348 282 L 405 215 L 456 278 L 434 358 L 474 438" />
          </g>

          {/* Layer C: White-Yellow Incandescent Bellows Surge flowing along main fractures */}
          <g
            fill="none"
            stroke="#fef9c3"
            strokeWidth="1.6"
            strokeDasharray="18 46"
            strokeLinecap="round"
            className={showMotion ? 'pm-magma-core-surge' : 'opacity-45'}
          >
            <path d="M 35 435 L 130 335 L 108 265 L 215 178 L 195 102" />
            <path d="M 765 435 L 665 330 L 692 252 L 580 172 L 618 92" />
            <path d="M 328 438 L 368 355 L 348 282 L 405 215 L 456 278 L 434 358 L 474 438" />
          </g>

          {/* Glowing Volcanic Node Nodes */}
          <g fill="#fef08a" className={showMotion ? 'pm-magma-pulse' : 'opacity-70'}>
            <circle cx="130" cy="335" r="3.5" />
            <circle cx="368" cy="355" r="4" />
            <circle cx="405" cy="215" r="3.8" />
            <circle cx="434" cy="358" r="4" />
            <circle cx="665" cy="330" r="3.5" />
          </g>
        </svg>

        {/* 14 Rising Embers & Curving Cinder Sparks */}
        {FORGE_EMBERS.map((ember, idx) => (
          <span
            key={idx}
            className={`absolute bottom-0 rounded-full ${
              showMotion ? (ember.arc ? 'pm-cinder-arc' : 'pm-ember-rise') : 'opacity-45'
            }`}
            style={{
              left: ember.left,
              width: isPreview ? Math.max(2.5, ember.size - 1) : ember.size,
              height: isPreview ? Math.max(2.5, ember.size - 1) : ember.size,
              backgroundColor: ember.color,
              boxShadow: `0 0 11px ${ember.color}, 0 0 4px #fef08a`,
              animationDelay: ember.delay,
              animationDuration: ember.duration,
            }}
          />
        ))}
      </div>
    );
  }

  // 4. CLASSIC SLATE (Ardósia Ancestral) — Triple Boreal Aurora Curtains, Pulsing Star Constellation Network & Twin Shooting Stars
  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden ${liveClass} ${className}`}
      style={{
        ...mirrorStyle,
        background:
          side === 'full'
            ? 'radial-gradient(ellipse at 50% 35%, #16283e 0%, #0d1524 54%, #050810 100%)'
            : 'radial-gradient(ellipse at 50% 80%, #172d44 0%, #0d1626 52%, #050810 100%)',
      }}
    >
      {/* Triple-Layered Undulating Aurora Borealis Ribbons */}
      <div
        className={`absolute bottom-[6%] -left-[14%] w-[128%] h-[64%] rounded-full ${
          showMotion ? 'pm-aurora-drift' : 'opacity-45'
        } ${reduceBlur ? '' : 'blur-2xl'}`}
        style={{
          background:
            'linear-gradient(102deg, transparent 8%, rgba(34, 211, 238, 0.34) 32%, rgba(52, 211, 153, 0.32) 60%, transparent 90%)',
          animationDuration: '11s',
        }}
      />
      <div
        className={`absolute bottom-[22%] -left-[10%] w-[122%] h-[54%] rounded-full ${
          showMotion ? 'pm-aurora-drift' : 'opacity-38'
        } ${reduceBlur ? '' : 'blur-2xl'}`}
        style={{
          background:
            'linear-gradient(78deg, transparent 10%, rgba(99, 102, 241, 0.28) 38%, rgba(56, 189, 248, 0.26) 66%, transparent 92%)',
          animationDelay: '3.4s',
          animationDuration: '13.5s',
        }}
      />
      <div
        className={`absolute -bottom-[8%] left-[6%] w-[88%] h-[52%] rounded-full ${
          showMotion ? 'pm-aurora-curtain' : 'opacity-34'
        } ${reduceBlur ? '' : 'blur-2xl'}`}
        style={{
          background:
            'linear-gradient(95deg, transparent 8%, rgba(16, 185, 129, 0.26) 35%, rgba(125, 211, 252, 0.28) 65%, transparent 92%)',
          animationDelay: '1.6s',
        }}
      />

      {/* Illuminated Sacred Star Constellation Network with Pulsing Starlight Bridges */}
      <svg
        viewBox="0 0 800 420"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient id={`constGrad-${uid}`} x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#bae6fd" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        {/* Subtle static constellation map */}
        <g fill="none" stroke="#7dd3fc" strokeWidth="0.9" strokeDasharray="3 5" opacity="0.35">
          <polyline points="64,102 136,218 208,142 280,278 352,118 424,235 496,134 568,260 640,110 712,202" />
          <polyline points="176,328 280,278 424,235 568,260 608,336" />
          <line x1="208" y1="142" x2="352" y2="118" />
          <line x1="496" y1="134" x2="640" y2="110" />
        </g>
        {/* Animated starlight pulses traveling along constellation lines */}
        <g
          fill="none"
          stroke={`url(#constGrad-${uid})`}
          strokeWidth="1.6"
          strokeDasharray="18 54"
          strokeLinecap="round"
          className={showMotion ? 'pm-constellation-pulse' : 'opacity-45'}
        >
          <polyline points="64,102 136,218 208,142 280,278 352,118 424,235 496,134 568,260 640,110 712,202" />
          <polyline points="176,328 280,278 424,235 568,260 608,336" />
        </g>
        {/* Subtle Polar Compass Arc */}
        <circle cx="400" cy="390" r="165" fill="none" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="4 8" opacity="0.28" />
        <circle cx="400" cy="390" r="240" fill="none" stroke="#34d399" strokeWidth="0.7" strokeDasharray="2 10" opacity="0.22" />
      </svg>

      {/* 12 Multi-Scale Twinkling Stars */}
      {SLATE_STARS.map((star, idx) => (
        <span
          key={idx}
          className={`absolute rounded-full bg-sky-100 ${showMotion ? 'pm-star-twinkle' : 'opacity-55'}`}
          style={{
            left: star.left,
            top: star.top,
            width: isPreview ? Math.max(2, star.size - 0.6) : star.size,
            height: isPreview ? Math.max(2, star.size - 0.6) : star.size,
            boxShadow: '0 0 9px rgba(125, 211, 252, 0.95)',
            animationDelay: star.delay,
          }}
        />
      ))}

      {/* 8 Floating Frost-Starlight Dust Motes */}
      {!isPreview &&
        SLATE_FROST_MOTES.map((mote, idx) => (
          <span
            key={`frost-${idx}`}
            className={`absolute rounded-full ${showMotion ? 'pm-frost-drift' : 'opacity-35'}`}
            style={{
              left: mote.left,
              top: mote.top,
              width: mote.size,
              height: mote.size,
              backgroundColor: idx % 2 === 0 ? '#a7f3d0' : '#bae6fd',
              boxShadow: idx % 2 === 0 ? '0 0 8px #34d399' : '0 0 8px #38bdf8',
              animationDelay: mote.delay,
              animationDuration: mote.duration,
            }}
          />
        ))}

      {/* 2 Staggered Diagonal Shooting Stars */}
      {showMotion && (
        <>
          <span
            className="absolute top-[22%] left-[16%] h-[1.8px] w-24 rounded-full pm-shooting-star"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(167, 243, 208, 0.78) 60%, #ffffff 100%)',
              boxShadow: '0 0 10px rgba(125, 211, 252, 0.95)',
              animationDelay: '0s',
              animationDuration: '9.2s',
            }}
          />
          <span
            className="absolute top-[42%] left-[48%] h-[1.5px] w-20 rounded-full pm-shooting-star"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(186, 230, 253, 0.75) 62%, #ffffff 100%)',
              boxShadow: '0 0 9px rgba(56, 189, 248, 0.9)',
              animationDelay: '4.6s',
              animationDuration: '10.6s',
            }}
          />
        </>
      )}
    </div>
  );
};

/**
 * Dual-Territory Arena Playmat Layer:
 * Renders the local player's equipped playmat predominantly on the bottom half (player territory)
 * and the opponent's equipped playmat predominantly on the top half (opponent territory),
 * blended smoothly across the equatorial front with an atmospheric clash seam.
 */
export const ArenaSplitPlaymat: React.FC<ArenaSplitPlaymatProps> = ({
  playerPlaymat,
  opponentPlaymat = 'standard_arena',
  animated = true,
  reduceBlur = false,
  variant = 'arena',
  className = '',
}) => {
  const playerIsCustom = playerPlaymat !== 'standard_arena';
  const opponentIsCustom = opponentPlaymat !== 'standard_arena';
  const bothStandard = !playerIsCustom && !opponentIsCustom;

  // If both players use the clean standard arena, render a single static dark stone surface
  if (bothStandard) {
    return (
      <ArenaPlaymatBackdrop
        playmat="standard_arena"
        animated={false}
        reduceBlur={reduceBlur}
        variant={variant}
        side="full"
        className={className}
      />
    );
  }

  // Owner predominance heights:
  // When only one side has a custom playmat, their territory shines prominently across their half
  // and gently feathers across the midline while the other side stays calm dark slate.
  // When both PvP players have custom playmats, each commands their own half meeting at 50%.
  const bottomHeight = playerIsCustom && !opponentIsCustom ? '72%' : '62%';
  const topHeight = opponentIsCustom && !playerIsCustom ? '72%' : '62%';

  const bottomMask =
    playerIsCustom && !opponentIsCustom
      ? 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.96) 56%, rgba(0,0,0,0.52) 76%, rgba(0,0,0,0) 100%)'
      : 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 54%, rgba(0,0,0,0.48) 78%, rgba(0,0,0,0) 100%)';

  const topMask =
    opponentIsCustom && !playerIsCustom
      ? 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.96) 56%, rgba(0,0,0,0.52) 76%, rgba(0,0,0,0) 100%)'
      : 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 54%, rgba(0,0,0,0.48) 78%, rgba(0,0,0,0) 100%)';

  const playerAccent = getPlaymatAccentRgb(playerPlaymat);
  const opponentAccent = getPlaymatAccentRgb(opponentPlaymat);

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {/* Quiet Obsidian-Slate Base Foundation underneath both territories */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, #14121d 0%, #0b0a12 60%, #050509 100%)',
        }}
      />

      {/* TOP HALF — Opponent Territory */}
      <div
        className="absolute inset-x-0 top-0 overflow-hidden"
        style={{
          height: topHeight,
          opacity: opponentIsCustom ? 1 : 0.72,
          WebkitMaskImage: topMask,
          maskImage: topMask,
        }}
      >
        <ArenaPlaymatBackdrop
          playmat={opponentPlaymat}
          animated={animated && opponentIsCustom}
          reduceBlur={reduceBlur}
          variant={variant}
          side="top"
        />
      </div>

      {/* BOTTOM HALF — Player Territory (Owner Predominance) */}
      <div
        className="absolute inset-x-0 bottom-0 overflow-hidden"
        style={{
          height: bottomHeight,
          opacity: playerIsCustom ? 1 : 0.72,
          WebkitMaskImage: bottomMask,
          maskImage: bottomMask,
        }}
      >
        <ArenaPlaymatBackdrop
          playmat={playerPlaymat}
          animated={animated && playerIsCustom}
          reduceBlur={reduceBlur}
          variant={variant}
          side="bottom"
        />
      </div>

      {/* Equatorial Front Seam — Soft Luminous Boundary Merging Both Territories */}
      <div
        className="absolute inset-x-[6%] top-1/2 -translate-y-1/2 h-[2px] opacity-70"
        style={{
          background:
            playerIsCustom && opponentIsCustom
              ? `linear-gradient(90deg, transparent 0%, ${opponentAccent} 24%, rgba(255,255,255,0.42) 50%, ${playerAccent} 76%, transparent 100%)`
              : `linear-gradient(90deg, transparent 0%, ${
                  playerIsCustom ? playerAccent : opponentAccent
                } 50%, transparent 100%)`,
        }}
      />

      {/* Protective Contrast Vignette on Table Surface so Cards & Badges Always Stay Crisp */}
      {variant === 'table' && (
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(5, 4, 10, 0.14) 0%, rgba(5, 4, 10, 0.34) 72%, rgba(4, 3, 8, 0.56) 100%)',
          }}
        />
      )}
    </div>
  );
};
