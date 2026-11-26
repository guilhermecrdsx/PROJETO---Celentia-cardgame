import React from 'react';
import { CardBackTheme } from '../utils/visualTheme';

interface CardBackArtProps {
  theme: CardBackTheme;
  /** 'live' obeys global ambient-anim setting; 'preview' keeps Shop/Settings previews lively. */
  context?: 'live' | 'preview';
  animated?: boolean;
  compact?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const CRIMSON_SPARKS = [
  { left: '22%', delay: '0s', duration: '2.5s' },
  { left: '42%', delay: '0.8s', duration: '2.9s' },
  { left: '60%', delay: '0.3s', duration: '2.4s' },
  { left: '78%', delay: '1.3s', duration: '3.1s' },
];

export const CardBackArt: React.FC<CardBackArtProps> = ({
  theme,
  context = 'live',
  animated = true,
  compact = false,
  className = '',
  children,
}) => {
  const showMotion = animated && theme !== 'standard_classic';
  const liveClass = context === 'live' ? 'arena-cardback-live' : '';
  const iconSizeClass = compact ? 'text-base' : 'text-2xl';
  const badgeCircleClass = compact ? 'w-7 h-7' : 'w-11 h-11';

  // 0. STANDARD CLASSIC — Clean, static, ZERO animations
  if (theme === 'standard_classic') {
    return (
      <div
        className={`relative overflow-hidden rounded-xl border-2 border-stone-500/80 bg-gradient-to-br from-stone-800 via-stone-900 to-neutral-950 shadow-lg flex items-center justify-center select-none ${className}`}
      >
        <div className="absolute inset-1.5 rounded-lg border border-stone-500/35 pointer-events-none" />
        <div className="absolute inset-3 rounded border border-stone-600/25 pointer-events-none" />
        <div
          className={`${badgeCircleClass} rounded-full border border-stone-500/45 bg-stone-900/90 flex items-center justify-center relative z-10`}
        >
          <span className={`${iconSizeClass} leading-none opacity-85`}>🛡️</span>
        </div>
        {children}
      </div>
    );
  }

  // 1. ROYAL GOLD — Sweeping Liquid-Gold Metallic Sheen & Pulsing Sovereign Crest
  if (theme === 'royal_gold') {
    return (
      <div
        className={`relative overflow-hidden rounded-xl border-2 border-amber-400/90 bg-gradient-to-br from-amber-900 via-stone-950 to-amber-950 shadow-lg flex items-center justify-center select-none ${liveClass} ${className}`}
      >
        {/* Filigree inner frames */}
        <div className="absolute inset-1.5 rounded-lg border border-amber-300/45 pointer-events-none" />
        <div className="absolute inset-2.5 rounded border border-amber-500/30 pointer-events-none" />
        {/* Corner royal accents */}
        <div className="absolute top-1.5 left-1.5 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-300/80 rounded-tl-sm pointer-events-none" />
        <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 border-t-2 border-r-2 border-amber-300/80 rounded-tr-sm pointer-events-none" />
        <div className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 border-b-2 border-l-2 border-amber-300/80 rounded-bl-sm pointer-events-none" />
        <div className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 border-b-2 border-r-2 border-amber-300/80 rounded-br-sm pointer-events-none" />

        {/* Sweeping metallic diagonal sheen */}
        {showMotion && (
          <div
            className="absolute -inset-y-4 w-1/2 pointer-events-none cb-gold-sheen"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(254, 240, 138, 0.35) 50%, transparent 100%)',
            }}
          />
        )}

        {/* Pulsing royal medallion */}
        <div
          className={`${badgeCircleClass} rounded-full border border-amber-300/75 bg-gradient-to-b from-amber-800/70 to-amber-950/90 flex items-center justify-center shadow-[0_0_16px_rgba(251,191,36,0.45)] relative z-10 ${
            showMotion ? 'cb-royal-pulse' : ''
          }`}
        >
          <span className={`${iconSizeClass} leading-none drop-shadow-[0_0_6px_rgba(254,240,138,0.85)]`}>
            ⚜️
          </span>
        </div>
        {children}
      </div>
    );
  }

  // 2. ANGIRIS WINGS — Rotating Heavenly Sunburst Rays & Radiant Halo
  if (theme === 'angiris_wings') {
    return (
      <div
        className={`relative overflow-hidden rounded-xl border-2 border-yellow-300/90 bg-gradient-to-br from-yellow-700 via-amber-950 to-stone-950 shadow-lg flex items-center justify-center select-none ${liveClass} ${className}`}
      >
        {/* Rotating conic sunburst behind emblem */}
        <div
          className={`absolute w-[190%] aspect-square pointer-events-none opacity-40 ${
            showMotion ? 'cb-sunburst-spin' : ''
          }`}
          style={{
            background:
              'repeating-conic-gradient(from 0deg, rgba(254, 249, 195, 0.55) 0deg 12deg, transparent 12deg 30deg)',
          }}
        />
        <div className="absolute inset-1.5 rounded-lg border border-yellow-200/50 pointer-events-none" />

        {/* Breathing radiant halo */}
        <div
          className={`absolute ${compact ? 'w-11 h-11' : 'w-16 h-16'} rounded-full pointer-events-none ${
            showMotion ? 'cb-halo-breathe' : 'opacity-65'
          }`}
          style={{
            background:
              'radial-gradient(circle, rgba(254, 240, 138, 0.65) 0%, rgba(251, 191, 36, 0.22) 55%, transparent 75%)',
          }}
        />

        <div
          className={`${badgeCircleClass} rounded-full border border-yellow-200/80 bg-amber-950/75 flex items-center justify-center relative z-10 shadow-[0_0_16px_rgba(254,240,138,0.55)]`}
        >
          <span className={`${iconSizeClass} leading-none drop-shadow-[0_0_8px_rgba(254,249,195,0.9)]`}>
            🪽
          </span>
        </div>
        {children}
      </div>
    );
  }

  // 3. COSMIC VOID — Dual Counter-Rotating Orbital Rings & Galactic Nebula
  if (theme === 'cosmic_void') {
    return (
      <div
        className={`relative overflow-hidden rounded-xl border-2 border-indigo-400/90 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 shadow-lg flex items-center justify-center select-none ${liveClass} ${className}`}
      >
        {/* Pulsing nebula core */}
        <div
          className={`absolute inset-0 pointer-events-none ${showMotion ? 'cb-nebula-pulse' : 'opacity-55'}`}
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.48) 0%, rgba(79, 70, 229, 0.24) 45%, transparent 76%)',
          }}
        />
        <div className="absolute inset-1.5 rounded-lg border border-indigo-300/35 pointer-events-none" />

        {/* Counter-rotating orbital SVG rings */}
        <svg viewBox="0 0 100 100" className="absolute w-[84%] h-[84%] pointer-events-none opacity-80">
          <g className={showMotion ? 'cb-orbit-cw' : ''} style={{ transformOrigin: '50px 50px' }}>
            <ellipse
              cx="50"
              cy="50"
              rx="40"
              ry="20"
              transform="rotate(-28 50 50)"
              fill="none"
              stroke="#a5b4fc"
              strokeWidth="1.4"
              strokeDasharray="6 4"
            />
            <circle cx="85" cy="31" r="2.6" fill="#e0e7ff" />
          </g>
          <g className={showMotion ? 'cb-orbit-ccw' : ''} style={{ transformOrigin: '50px 50px' }}>
            <ellipse
              cx="50"
              cy="50"
              rx="38"
              ry="18"
              transform="rotate(34 50 50)"
              fill="none"
              stroke="#d8b4fe"
              strokeWidth="1.3"
            />
            <circle cx="19" cy="29" r="2.2" fill="#f0abfc" />
          </g>
        </svg>

        <div
          className={`${badgeCircleClass} rounded-full border border-purple-300/70 bg-indigo-950/85 flex items-center justify-center relative z-10 shadow-[0_0_16px_rgba(168,85,247,0.6)]`}
        >
          <span className={`${iconSizeClass} leading-none drop-shadow-[0_0_8px_rgba(192,132,252,0.9)]`}>
            🔮
          </span>
        </div>
        {children}
      </div>
    );
  }

  // 4. CRIMSON WAR (Chama de Granty) — Rising Flame Sparks & Dragon-Heart Pulse
  return (
    <div
      className={`relative overflow-hidden rounded-xl border-2 border-rose-500/90 bg-gradient-to-br from-rose-950 via-red-950 to-stone-950 shadow-lg flex items-center justify-center select-none ${liveClass} ${className}`}
    >
      {/* Molten base flame wash */}
      <div
        className="absolute inset-x-0 bottom-0 h-[55%] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 100%, rgba(249, 115, 22, 0.52) 0%, rgba(225, 29, 72, 0.25) 55%, transparent 85%)',
        }}
      />
      <div className="absolute inset-1.5 rounded-lg border border-rose-400/40 pointer-events-none" />

      {/* Rising forge sparks */}
      {showMotion &&
        CRIMSON_SPARKS.map((sp, i) => (
          <span
            key={i}
            className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-orange-300 pointer-events-none cb-flame-rise"
            style={{
              left: sp.left,
              boxShadow: '0 0 6px #fb923c',
              animationDelay: sp.delay,
              animationDuration: sp.duration,
            }}
          />
        ))}

      {/* Dragon-heart pulsing seal */}
      <div
        className={`${badgeCircleClass} rounded-full border border-rose-400/80 bg-gradient-to-b from-rose-900/85 to-red-950/95 flex items-center justify-center relative z-10 shadow-[0_0_18px_rgba(244,63,94,0.55)] ${
          showMotion ? 'cb-dragon-heart' : ''
        }`}
      >
        <span className={`${iconSizeClass} leading-none drop-shadow-[0_0_8px_rgba(251,113,133,0.9)]`}>
          🐉
        </span>
      </div>
      {children}
    </div>
  );
};
