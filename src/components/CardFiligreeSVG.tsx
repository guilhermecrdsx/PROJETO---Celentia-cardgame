import React, { useId } from 'react';

interface CornerFiligreeProps {
  color: string;
  glowColor?: string;
  sizeClass?: string;
}

/**
 * Renders 4 intricate celestial forged filigree corner scrollwork ornaments inside a card frame.
 */
export const CardFiligreeCorners: React.FC<CornerFiligreeProps> = ({
  color,
  glowColor,
  sizeClass = 'w-5 h-5',
}) => {
  const filterStyle = glowColor ? { filter: `drop-shadow(0 0 3px ${glowColor})` } : undefined;

  const cornerSvg = (transformClass: string) => (
    <svg
      viewBox="0 0 32 32"
      className={`pointer-events-none absolute z-20 ${sizeClass} ${transformClass}`}
      style={filterStyle}
      aria-hidden="true"
    >
      {/* Outer forged L-scrollwork */}
      <path
        d="M 2 18 L 2 5 Q 2 2 5 2 L 18 2"
        fill="none"
        stroke={color}
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      {/* Inner baroque curl */}
      <path
        d="M 5.5 14 Q 5.5 6.5 14 5.5"
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeOpacity="0.85"
        strokeLinecap="round"
      />
      <path
        d="M 2 22 C 6 20 8 15 6 12 C 4 9 9 7 12 6 C 15 8 20 6 22 2"
        fill="none"
        stroke={color}
        strokeWidth="0.9"
        strokeOpacity="0.55"
      />
      {/* Corner facet rivet gem */}
      <polygon
        points="5.5,3 8,5.5 5.5,8 3,5.5"
        fill={color}
        fillOpacity="0.92"
      />
    </svg>
  );

  return (
    <>
      {cornerSvg('top-[3px] left-[3px]')}
      {cornerSvg('top-[3px] right-[3px] -scale-x-100')}
      {cornerSvg('bottom-[3px] left-[3px] -scale-y-100')}
      {cornerSvg('bottom-[3px] right-[3px] -scale-x-100 -scale-y-100')}
    </>
  );
};

interface FiligreeDividerProps {
  lineColor: string;
  gemTop: string;
  gemMid: string;
  gemBottom: string;
  gemSize?: 'xs' | 'sm' | 'md';
  positionClass?: string;
}

/**
 * Forged horizontal filigree hairline with central cut-diamond gemstone inlay.
 */
export const CardFiligreeDivider: React.FC<FiligreeDividerProps> = ({
  lineColor,
  gemTop,
  gemMid,
  gemBottom,
  gemSize = 'sm',
  positionClass = '-bottom-[5px]',
}) => {
  const uid = useId().replace(/:/g, '');
  const dim = gemSize === 'xs' ? 10 : gemSize === 'md' ? 16 : 12;

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 ${positionClass} z-25 flex items-center justify-center px-2`}
      aria-hidden="true"
    >
      <div
        className="h-[1px] flex-1"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${lineColor} 85%, ${gemTop} 100%)`,
        }}
      />
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 16 16"
        className="mx-0.5 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]"
      >
        <defs>
          <linearGradient id={`fg-gem-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gemTop} />
            <stop offset="50%" stopColor={gemMid} />
            <stop offset="100%" stopColor={gemBottom} />
          </linearGradient>
        </defs>
        <polygon
          points="8,1 15,8 8,15 1,8"
          fill={`url(#fg-gem-${uid})`}
          stroke={gemTop}
          strokeWidth="1"
        />
        <polygon points="8,3.2 12.2,8 8,12.8 3.8,8" fill="rgba(255,255,255,0.28)" />
      </svg>
      <div
        className="h-[1px] flex-1"
        style={{
          background: `linear-gradient(270deg, transparent 0%, ${lineColor} 85%, ${gemTop} 100%)`,
        }}
      />
    </div>
  );
};

interface FacetedGemBadgeProps {
  topColor: string;
  midColor: string;
  bottomColor: string;
  borderColor?: string;
  sizePx?: number;
  children: React.ReactNode;
  title?: string;
  glowShadow?: string;
}

/**
 * Octagonal beveled metal & faceted gemstone medallion for card Tier and Element seals.
 */
export const FacetedGemMedallion: React.FC<FacetedGemBadgeProps> = ({
  topColor,
  midColor,
  bottomColor,
  borderColor,
  sizePx = 32,
  children,
  title,
  glowShadow,
}) => {
  return (
    <div
      title={title}
      className="relative flex flex-col items-center justify-center shrink-0 select-none"
      style={{
        width: `${sizePx}px`,
        height: `${sizePx}px`,
        clipPath: 'polygon(28% 2%, 72% 2%, 98% 28%, 98% 72%, 72% 98%, 28% 98%, 2% 72%, 2% 28%)',
        background: `linear-gradient(145deg, ${topColor} 0%, ${midColor} 45%, ${bottomColor} 100%)`,
        boxShadow: glowShadow || '0 2px 6px rgba(0,0,0,0.85)',
        padding: '1.5px',
      }}
    >
      <div
        className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
        style={{
          clipPath: 'polygon(28% 2%, 72% 2%, 98% 28%, 98% 72%, 72% 98%, 28% 98%, 2% 72%, 2% 28%)',
          background: 'radial-gradient(circle at 32% 25%, #2e293d 0%, #15121d 68%, #0a090f 100%)',
          boxShadow: borderColor ? `inset 0 0 6px ${borderColor}` : 'inset 0 1px 4px rgba(0,0,0,0.9)',
        }}
      >
        <div
          className="pointer-events-none absolute top-0 inset-x-1 h-[38%] opacity-30"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, transparent 100%)',
          }}
        />
        <div className="relative z-10 flex flex-col items-center justify-center leading-none">
          {children}
        </div>
      </div>
    </div>
  );
};
