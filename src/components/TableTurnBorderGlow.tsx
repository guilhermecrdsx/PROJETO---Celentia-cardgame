import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { TurnIndicatorMode } from '../utils/visualTheme';

interface TableTurnBorderGlowProps {
  turnPlayer: 'player' | 'opponent';
  cornerRadius?: number;
  compact?: boolean;
  mode?: TurnIndicatorMode;
  reduceBlur?: boolean;
}

type CrawlDirection = 'to-opponent' | 'to-player' | null;

/**
 * Renders a living, responsive luminous border hugging the battlefield table frame.
 * - mode === 'full': SVG glowing half-border that flashes full perimeter and crawls on turn switch.
 * - mode === 'static': Zero-GPU pure CSS static half-table border + 50% midline anchors (ideal for mobile FPS).
 * - mode === 'off': Disabled completely.
 */
export const TableTurnBorderGlow: React.FC<TableTurnBorderGlowProps> = ({
  turnPlayer,
  cornerRadius = 28,
  compact = false,
  mode = 'full',
  reduceBlur = false,
}) => {
  const uid = useId().replace(/:/g, '');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const prevTurnRef = useRef<'player' | 'opponent'>(turnPlayer);
  const crawlTimerRef = useRef<number | null>(null);
  const [crawlState, setCrawlState] = useState<{
    direction: CrawlDirection;
    seq: number;
  }>({ direction: null, seq: 0 });

  useLayoutEffect(() => {
    if (mode !== 'full') return;
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };

    measure();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'full') {
      prevTurnRef.current = turnPlayer;
      setCrawlState((prev) => (prev.direction ? { ...prev, direction: null } : prev));
      return;
    }

    if (prevTurnRef.current === turnPlayer) return;
    const direction: CrawlDirection =
      turnPlayer === 'opponent' ? 'to-opponent' : 'to-player';
    prevTurnRef.current = turnPlayer;

    setCrawlState((prev) => ({ direction, seq: prev.seq + 1 }));

    if (crawlTimerRef.current !== null) {
      window.clearTimeout(crawlTimerRef.current);
    }
    crawlTimerRef.current = window.setTimeout(() => {
      crawlTimerRef.current = null;
      setCrawlState((prev) => ({ ...prev, direction: null }));
    }, 980);
  }, [turnPlayer, mode]);

  useEffect(() => {
    return () => {
      if (crawlTimerRef.current !== null) {
        window.clearTimeout(crawlTimerRef.current);
      }
    };
  }, []);

  if (mode === 'off') return null;

  const isPlayer = turnPlayer === 'player';

  // STATIC ZERO-GPU HALF-TABLE BORDER (Zero SVG, Zero feGaussianBlur, Zero ResizeObserver, Zero Keyframes)
  if (mode === 'static') {
    const borderWidth = compact ? '2.5px' : '3px';
    const borderColor = isPlayer ? '#fbbf24' : '#c084fc';
    const dotColor = isPlayer ? 'bg-emerald-400' : 'bg-rose-400';
    const rPx = `${cornerRadius}px`;

    return (
      <div
        className={`pointer-events-none absolute ${
          compact ? 'inset-0' : '-inset-[2px]'
        } z-[15] overflow-visible`}
        aria-hidden="true"
      >
        <div
          className={`absolute inset-x-0 h-1/2 ${isPlayer ? 'bottom-0' : 'top-0'}`}
          style={{
            borderLeft: `${borderWidth} solid ${borderColor}`,
            borderRight: `${borderWidth} solid ${borderColor}`,
            ...(isPlayer
              ? {
                  borderBottom: `${borderWidth} solid ${borderColor}`,
                  borderBottomLeftRadius: rPx,
                  borderBottomRightRadius: rPx,
                }
              : {
                  borderTop: `${borderWidth} solid ${borderColor}`,
                  borderTopLeftRadius: rPx,
                  borderTopRightRadius: rPx,
                }),
          }}
        />
        {/* Crisp 50% horizontal midline anchor dots */}
        <span
          className={`absolute -left-[3px] top-1/2 -translate-y-1/2 ${
            compact ? 'w-1.5 h-1.5' : 'w-2 h-2'
          } rounded-full ${dotColor}`}
        />
        <span
          className={`absolute -right-[3px] top-1/2 -translate-y-1/2 ${
            compact ? 'w-1.5 h-1.5' : 'w-2 h-2'
          } rounded-full ${dotColor}`}
        />
      </div>
    );
  }

  const { w, h } = size;

  // Build exact symmetric Left & Right rail paths from Bottom-Center (0) -> Top-Center (100).
  // By rectangle symmetry, exact arc length 50 lands precisely on the 50% horizontal midline!
  const pad = compact ? 1.5 : 2;
  const r = Math.max(4, Math.min(cornerRadius, w / 2 - pad, h / 2 - pad));
  const midX = w / 2;
  const leftX = pad;
  const rightX = w - pad;
  const topY = pad;
  const bottomY = h - pad;

  const leftRailPath =
    w > 20 && h > 20
      ? [
          `M ${midX} ${bottomY}`,
          `L ${leftX + r} ${bottomY}`,
          `Q ${leftX} ${bottomY} ${leftX} ${bottomY - r}`,
          `L ${leftX} ${topY + r}`,
          `Q ${leftX} ${topY} ${leftX + r} ${topY}`,
          `L ${midX} ${topY}`,
        ].join(' ')
      : '';

  const rightRailPath =
    w > 20 && h > 20
      ? [
          `M ${midX} ${bottomY}`,
          `L ${rightX - r} ${bottomY}`,
          `Q ${rightX} ${bottomY} ${rightX} ${bottomY - r}`,
          `L ${rightX} ${topY + r}`,
          `Q ${rightX} ${topY} ${rightX - r} ${topY}`,
          `L ${midX} ${topY}`,
        ].join(' ')
      : '';

  const crawlClass =
    crawlState.direction === 'to-opponent'
      ? 'animate-table-border-crawl-to-opponent'
      : crawlState.direction === 'to-player'
      ? 'animate-table-border-crawl-to-player'
      : '';

  const steadyDashArray = '50 150';
  const steadyDashOffset = isPlayer ? 0 : -50;

  // Forged Celestial color palette: Gold + Emerald-Cyan for Player; Violet + Crimson-Rose for Opponent
  const outerGlowColor = isPlayer ? '#f59e0b' : '#a855f7';
  const midCoreColor = isPlayer ? '#fde047' : '#e879f9';
  const brightCoreColor = isPlayer ? '#fef9c3' : '#fae8ff';
  const accentTipColor = isPlayer ? '#34d399' : '#fb7185';

  const outerStrokeW = compact ? 7 : 10;
  const midStrokeW = compact ? 3.2 : 4.2;
  const coreStrokeW = compact ? 1.5 : 2;
  const shimmerStrokeW = compact ? 2.4 : 3.2;
  const bloomFilterAttr = reduceBlur ? undefined : `url(#tbg-bloom-${uid})`;

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute ${
        compact ? 'inset-0' : '-inset-[2px]'
      } z-[15] overflow-visible`}
      aria-hidden="true"
    >
      {w > 20 && h > 20 && (
        <svg
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            {!reduceBlur && (
              <filter
                id={`tbg-bloom-${uid}`}
                x="-12%"
                y="-12%"
                width="124%"
                height="124%"
              >
                <feGaussianBlur stdDeviation={compact ? '3.2' : '4.8'} result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            )}

            <linearGradient
              id={`tbg-grad-player-${uid}`}
              x1="0%"
              y1="100%"
              x2="0%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="55%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>

            <linearGradient
              id={`tbg-grad-opponent-${uid}`}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#e879f9" />
              <stop offset="55%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#fb7185" />
            </linearGradient>
          </defs>

          {/* 1. FULL-PERIMETER SURGE FLASH ON TURN SWITCH */}
          {crawlState.direction && (
            <g
              key={`flash-${crawlState.seq}`}
              className="animate-table-border-full-flash"
              filter={bloomFilterAttr}
            >
              <path
                d={leftRailPath}
                fill="none"
                stroke={midCoreColor}
                strokeWidth={compact ? 5.5 : 8}
                strokeLinecap="round"
                opacity="0.72"
              />
              <path
                d={rightRailPath}
                fill="none"
                stroke={midCoreColor}
                strokeWidth={compact ? 5.5 : 8}
                strokeLinecap="round"
                opacity="0.72"
              />
            </g>
          )}

          {/* 2. ACTIVE HALF-BORDER (CONTINUOUS BREATHING GLOW + CRAWL ON SWITCH) */}
          <g
            key={crawlState.direction ? `crawl-${crawlState.seq}` : `steady-${turnPlayer}`}
            className={!crawlState.direction ? 'animate-table-border-breathe' : ''}
          >
            {/* Soft outer luminous aura */}
            {[leftRailPath, rightRailPath].map((d, idx) => (
              <path
                key={`aura-${idx}`}
                d={d}
                pathLength={100}
                fill="none"
                stroke={outerGlowColor}
                strokeWidth={outerStrokeW}
                strokeLinecap="round"
                filter={bloomFilterAttr}
                opacity={0.48}
                className={crawlClass}
                style={
                  crawlState.direction
                    ? { transition: 'stroke 420ms ease' }
                    : {
                        strokeDasharray: steadyDashArray,
                        strokeDashoffset: steadyDashOffset,
                        transition: 'stroke 420ms ease',
                      }
                }
              />
            ))}

            {/* Forged gradient luminous main border */}
            {[leftRailPath, rightRailPath].map((d, idx) => (
              <path
                key={`mid-${idx}`}
                d={d}
                pathLength={100}
                fill="none"
                stroke={
                  isPlayer
                    ? `url(#tbg-grad-player-${uid})`
                    : `url(#tbg-grad-opponent-${uid})`
                }
                strokeWidth={midStrokeW}
                strokeLinecap="round"
                filter={bloomFilterAttr}
                className={crawlClass}
                style={
                  crawlState.direction
                    ? undefined
                    : {
                        strokeDasharray: steadyDashArray,
                        strokeDashoffset: steadyDashOffset,
                      }
                }
              />
            ))}

            {/* Crisp white-gold / white-violet inner filament */}
            {[leftRailPath, rightRailPath].map((d, idx) => (
              <path
                key={`core-${idx}`}
                d={d}
                pathLength={100}
                fill="none"
                stroke={brightCoreColor}
                strokeWidth={coreStrokeW}
                strokeLinecap="round"
                opacity={0.92}
                className={crawlClass}
                style={
                  crawlState.direction
                    ? { transition: 'stroke 420ms ease' }
                    : {
                        strokeDasharray: steadyDashArray,
                        strokeDashoffset: steadyDashOffset,
                        transition: 'stroke 420ms ease',
                      }
                }
              />
            ))}
          </g>

          {/* 3. LIVING TRAVELING ENERGY WISPS ALONG THE ACTIVE HALF WHILE HOLDING THE TURN */}
          {!crawlState.direction && (
            <g filter={bloomFilterAttr}>
              {[leftRailPath, rightRailPath].map((d, idx) => (
                <path
                  key={`shimmer-${idx}`}
                  d={d}
                  pathLength={100}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={shimmerStrokeW}
                  strokeLinecap="round"
                  strokeDasharray="10 190"
                  className={
                    isPlayer
                      ? 'animate-table-border-shimmer-player'
                      : 'animate-table-border-shimmer-opponent'
                  }
                />
              ))}

              {/* Subtle Midline Anchor Nodes (Left & Right 50% Horizon Points) */}
              <circle
                cx={leftX}
                cy={h / 2}
                r={compact ? 3 : 4}
                fill={accentTipColor}
                opacity="0.92"
              />
              <circle
                cx={rightX}
                cy={h / 2}
                r={compact ? 3 : 4}
                fill={accentTipColor}
                opacity="0.92"
              />
            </g>
          )}
        </svg>
      )}
    </div>
  );
};
