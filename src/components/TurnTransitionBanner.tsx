import React from 'react';
import { Shield, Swords, Zap } from 'lucide-react';
import type { TurnIndicatorMode } from '../utils/visualTheme';

export interface TurnTransitionBannerData {
  id: string;
  nextPlayer: 'player' | 'opponent';
  activeName: string;
  round: number;
  turnNumber: number;
  isAttacker: boolean;
  isPostAttackExtra?: boolean;
  isCounterResponse?: boolean;
}

interface TurnTransitionBannerProps {
  banner: TurnTransitionBannerData | null;
  mode?: TurnIndicatorMode;
  reduceBlur?: boolean;
}

export const TurnTransitionBanner: React.FC<TurnTransitionBannerProps> = ({
  banner,
  mode = 'full',
  reduceBlur = false,
}) => {
  if (!banner || mode === 'off') return null;

  const isPlayer = banner.nextPlayer === 'player';

  const headline = banner.isCounterResponse
    ? isPlayer
      ? 'Contra-Resposta · Sua Vez'
      : `Contra-Resposta · ${banner.activeName}`
    : isPlayer
    ? 'Sua Vez'
    : `Vez de ${banner.activeName}`;

  const roleLabel = banner.isPostAttackExtra
    ? 'Turno Extra Pós-Ataque'
    : banner.isCounterResponse
    ? 'Janela de Resposta Rápida'
    : banner.isAttacker
    ? 'Atacante'
    : 'Defensor';

  const subtitle = `Rodada ${banner.round} · Turno ${banner.turnNumber} · ${roleLabel}`;

  const icon = banner.isCounterResponse ? (
    <Zap
      size={18}
      className={isPlayer ? 'text-amber-300 shrink-0' : 'text-purple-300 shrink-0'}
    />
  ) : banner.isAttacker ? (
    <Swords
      size={18}
      className={isPlayer ? 'text-amber-300 shrink-0' : 'text-rose-300 shrink-0'}
    />
  ) : (
    <Shield
      size={18}
      className={isPlayer ? 'text-emerald-300 shrink-0' : 'text-purple-300 shrink-0'}
    />
  );

  // STATIC ZERO-GPU TURN INDICATOR PLAQUE (No backdrop-blur, no edge flash, no sweep keyframes)
  if (mode === 'static') {
    return (
      <div
        key={banner.id}
        className="fixed inset-0 z-[58] pointer-events-none select-none flex items-center justify-center"
        aria-live="polite"
        role="status"
      >
        <div
          className={`px-6 sm:px-8 py-3 rounded-xl border-2 flex flex-col items-center text-center shadow-lg ${
            isPlayer
              ? 'bg-[#12101d] border-amber-400 text-amber-100'
              : 'bg-[#170f21] border-purple-400 text-purple-100'
          }`}
        >
          <div className="flex items-center gap-2">
            {icon}
            <span
              className={`font-serif font-black text-base sm:text-xl uppercase tracking-[0.12em] whitespace-nowrap ${
                isPlayer ? 'text-amber-200' : 'text-purple-100'
              }`}
            >
              {headline}
            </span>
          </div>
          <div
            className={`mt-0.5 text-[10px] font-mono uppercase tracking-[0.14em] tabular-nums ${
              isPlayer ? 'text-emerald-300' : 'text-rose-200'
            }`}
          >
            {subtitle}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      key={banner.id}
      className="fixed inset-0 z-[58] pointer-events-none select-none flex items-center justify-center overflow-hidden"
      aria-live="polite"
      role="status"
    >
      {/* Active-Side Edge Flash so players immediately feel whose side is active */}
      <div
        className={`fixed inset-x-0 h-28 animate-turn-edge-flash ${
          isPlayer ? 'bottom-0' : 'top-0'
        }`}
        style={{
          background: isPlayer
            ? 'linear-gradient(0deg, rgba(245, 158, 11, 0.32) 0%, rgba(16, 185, 129, 0.12) 48%, transparent 100%)'
            : 'linear-gradient(180deg, rgba(168, 85, 247, 0.3) 0%, rgba(244, 63, 94, 0.14) 48%, transparent 100%)',
        }}
        aria-hidden="true"
      />

      {/* Horizontal Celestial Energy Sweep Across Midline */}
      <div
        className="absolute inset-x-0 flex items-center justify-center animate-turn-banner-line"
        aria-hidden="true"
      >
        <div
          className="w-full max-w-4xl h-[2px]"
          style={{
            background: isPlayer
              ? 'linear-gradient(90deg, transparent 0%, rgba(251,191,36,0.85) 28%, rgba(52,211,153,0.95) 50%, rgba(251,191,36,0.85) 72%, transparent 100%)'
              : 'linear-gradient(90deg, transparent 0%, rgba(192,132,252,0.8) 28%, rgba(244,63,94,0.9) 50%, rgba(192,132,252,0.8) 72%, transparent 100%)',
          }}
        />
      </div>

      {/* Forged Turn Alternation Crest Banner */}
      <div
        className={`relative px-7 sm:px-10 py-3.5 rounded-2xl ${
          reduceBlur ? '' : 'backdrop-blur-md'
        } animate-turn-banner-sweep flex flex-col items-center text-center`}
        style={
          {
            '--turn-enter-y': isPlayer ? '-16px' : '16px',
            '--turn-exit-y': isPlayer ? '14px' : '-14px',
            background: isPlayer
              ? 'linear-gradient(180deg, rgba(24, 20, 36, 0.94) 0%, rgba(14, 17, 26, 0.96) 100%)'
              : 'linear-gradient(180deg, rgba(30, 15, 36, 0.94) 0%, rgba(16, 10, 24, 0.96) 100%)',
            border: isPlayer
              ? '1.5px solid rgba(251, 191, 36, 0.72)'
              : '1.5px solid rgba(192, 132, 252, 0.68)',
            boxShadow: isPlayer
              ? '0 18px 50px rgba(0, 0, 0, 0.85), 0 0 36px rgba(245, 158, 11, 0.32)'
              : '0 18px 50px rgba(0, 0, 0, 0.85), 0 0 34px rgba(168, 85, 247, 0.28)',
          } as React.CSSProperties
        }
      >
        {/* Top metallic hairline */}
        <div
          className="absolute inset-x-4 top-0 h-[2px]"
          style={{
            background: isPlayer
              ? 'linear-gradient(90deg, transparent, #fde047, #6ee7b7, #fde047, transparent)'
              : 'linear-gradient(90deg, transparent, #e9d5ff, #fb7185, #e9d5ff, transparent)',
          }}
        />

        <div className="flex items-center gap-2.5">
          {icon}

          <span
            className={`font-serif font-black text-lg sm:text-2xl uppercase tracking-[0.14em] whitespace-nowrap ${
              isPlayer ? 'text-amber-200' : 'text-purple-100'
            }`}
          >
            {headline}
          </span>
        </div>

        <div
          className={`mt-1 text-[11px] font-mono uppercase tracking-[0.16em] tabular-nums ${
            isPlayer ? 'text-emerald-300/90' : 'text-rose-200/85'
          }`}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
};
