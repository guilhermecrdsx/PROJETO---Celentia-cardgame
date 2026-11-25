import React from 'react';
import { Heart, Flame, Sparkles, Zap, Skull } from 'lucide-react';
import { useVisualPreferences } from '../utils/visualTheme';

interface FinishingCannonOverlayProps {
  victor: 'player' | 'opponent';
  stage: 'aiming' | 'firing' | 'impact';
  playerName: string;
  opponentName: string;
}

const RADIAL_ANGLES = [
  'rotate-[0deg] [animation-delay:0ms]',
  'rotate-[22.5deg] [animation-delay:90ms]',
  'rotate-[45deg] [animation-delay:180ms]',
  'rotate-[67.5deg] [animation-delay:40ms]',
  'rotate-[90deg] [animation-delay:140ms]',
  'rotate-[112.5deg] [animation-delay:220ms]',
  'rotate-[135deg] [animation-delay:70ms]',
  'rotate-[157.5deg] [animation-delay:190ms]',
  'rotate-[180deg] [animation-delay:30ms]',
  'rotate-[202.5deg] [animation-delay:120ms]',
  'rotate-[225deg] [animation-delay:240ms]',
  'rotate-[247.5deg] [animation-delay:60ms]',
  'rotate-[270deg] [animation-delay:160ms]',
  'rotate-[292.5deg] [animation-delay:110ms]',
  'rotate-[315deg] [animation-delay:210ms]',
  'rotate-[337.5deg] [animation-delay:80ms]',
];

const SHARD_POSITIONS = [
  '-translate-x-32 -translate-y-24 rotate-12',
  'translate-x-32 -translate-y-28 -rotate-45',
  '-translate-x-40 translate-y-14 rotate-45',
  'translate-x-40 translate-y-18 -rotate-12',
  '-translate-x-20 -translate-y-36 rotate-90',
  'translate-x-24 translate-y-32 -rotate-90',
  '-translate-x-48 -translate-y-6 rotate-30',
  'translate-x-48 -translate-y-8 -rotate-30',
];

export const FinishingCannonOverlay: React.FC<FinishingCannonOverlayProps> = ({
  victor,
  stage,
  playerName,
  opponentName,
}) => {
  const { animationMode, combatAnimations } = useVisualPreferences();
  const isPlayerVictor = victor === 'player';
  const victimName = isPlayerVictor ? opponentName : playerName;

  if (animationMode === 'off' || !combatAnimations) {
    return null;
  }

  if (animationMode === 'static') {
    return (
      <div className="fixed inset-0 z-50 pointer-events-none select-none flex items-center justify-center bg-black/75 p-4">
        <div className="w-full max-w-md rounded-2xl border-2 border-amber-400 bg-stone-950/95 p-5 shadow-2xl text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950 border border-rose-400/70 text-[11px] font-serif font-black uppercase tracking-widest text-amber-200">
            <Skull size={14} className="text-rose-400" />
            <span>Golpe Final · Vida Zerada</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-black text-amber-100 uppercase tracking-wider">
            {victimName} · 0 / 5 HP
          </h3>
          <p className="text-xs text-stone-300">
            {isPlayerVictor
              ? `${playerName} selou a vitória na arena!`
              : `${opponentName} desferiu o golpe decisivo!`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none overflow-hidden flex items-center justify-center">
      {/* Backdrop Dramatic Darkness & Implosion Vignette */}
      <div
        className={`absolute inset-0 transition-all duration-300 ${
          stage === 'impact'
            ? 'bg-red-950/70 backdrop-blur-xs'
            : stage === 'firing'
            ? 'bg-black/82 backdrop-blur-xs'
            : 'bg-black/68 backdrop-blur-[2px]'
        }`}
      />

      {/* Fullscreen Supernova Flash on Explosion Impact */}
      {stage === 'impact' && (
        <div className="absolute inset-0 bg-gradient-to-b from-amber-300/45 via-rose-500/35 to-red-950/50 animate-cannon-flash pointer-events-none" />
      )}

      {/* Corner Energy Accumulator & Explosion over the Losing Player's Actual HP Bar on the Right Wing */}
      <div
        className={`fixed right-4 z-40 pointer-events-none flex items-center justify-center ${
          isPlayerVictor ? 'top-14' : 'bottom-12'
        }`}
      >
        {stage !== 'impact' ? (
          <div className="relative flex items-center justify-center w-56 h-24">
            {/* Inward Sucking Energy Rings on the Actual Corner HP Bar */}
            <div
              className={`absolute w-36 h-36 rounded-full border-2 border-dashed border-amber-300 shadow-[0_0_25px_#fbbf24] ${
                stage === 'firing' ? 'animate-energy-ring-suck-fast' : 'animate-energy-ring-suck'
              }`}
            />
            <div
              className={`absolute w-44 h-44 rounded-full border-2 border-rose-400 shadow-[0_0_30px_#f43f5e] [animation-delay:220ms] ${
                stage === 'firing' ? 'animate-energy-ring-suck-fast' : 'animate-energy-ring-suck'
              }`}
            />
            <div
              className={`w-full h-full rounded-2xl border-2 ${
                stage === 'firing'
                  ? 'border-white bg-gradient-to-r from-rose-500/55 via-amber-400/65 to-white/55 animate-hp-critical-shake shadow-[0_0_75px_#ef4444]'
                  : 'border-amber-400 bg-rose-600/35 animate-hp-vibrate shadow-[0_0_45px_#f59e0b]'
              }`}
            />
          </div>
        ) : (
          <div className="relative flex items-center justify-center">
            <div className="w-60 h-60 rounded-full border-8 border-amber-300 bg-rose-600/55 animate-explosion-shockwave shadow-[0_0_110px_#ef4444]" />
            <div className="absolute w-44 h-44 rounded-full border-4 border-white bg-amber-300/70 animate-ping" />
          </div>
        )}
      </div>

      {/* Central Energy Accumulator Suction Vortex & Life Bar Detonation */}
      <div className="relative z-30 flex flex-col items-center justify-center max-w-lg w-full px-6 text-center">
        {/* Stage Header Badge */}
        <div
          className={`mb-5 inline-flex items-center gap-2 px-4 py-1 rounded-full border text-xs font-serif font-black uppercase tracking-[0.2em] shadow-lg transition-all z-40 ${
            stage === 'impact'
              ? 'bg-rose-950/95 border-amber-200 text-amber-200 shadow-[0_0_35px_#ef4444] scale-110'
              : stage === 'firing'
              ? 'bg-red-950/95 border-amber-300 text-amber-100 shadow-[0_0_30px_#f43f5e] animate-pulse'
              : 'bg-stone-950/95 border-amber-400/80 text-amber-300 shadow-[0_0_22px_rgba(245,158,11,0.45)]'
          }`}
        >
          {stage === 'aiming' && (
            <>
              <Zap size={14} className="text-amber-300 animate-bounce" />
              <span>Acumulador Vital · Sugando Energia</span>
            </>
          )}
          {stage === 'firing' && (
            <>
              <Flame size={15} className="text-orange-400 animate-ping" />
              <span>Compressão Máxima · Prestes a Explodir!</span>
            </>
          )}
          {stage === 'impact' && (
            <>
              <Sparkles size={15} className="text-yellow-300 animate-spin" />
              <span>Explosão Cataclísmica!</span>
            </>
          )}
        </div>

        {/* ENERGY ACCUMULATOR VORTEX & LIFE BAR STAGE */}
        <div className="relative w-full flex items-center justify-center my-4">
          {/* 1. INWARD-SUCKING CONCENTRIC RINGS & RADIAL STREAMS (DURING AIMING & FIRING) */}
          {stage !== 'impact' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              {/* Outer Imploding Ring 1 */}
              <div
                className={`absolute w-80 h-80 rounded-full border-2 border-dashed border-amber-300/90 shadow-[0_0_35px_rgba(251,191,36,0.75),inset_0_0_35px_rgba(244,63,94,0.5)] ${
                  stage === 'firing' ? 'animate-energy-ring-suck-fast' : 'animate-energy-ring-suck'
                }`}
              />
              {/* Middle Imploding Ring 2 */}
              <div
                className={`absolute w-72 h-72 rounded-full border-2 border-rose-400/90 shadow-[0_0_40px_rgba(244,63,94,0.85)] [animation-delay:260ms] ${
                  stage === 'firing' ? 'animate-energy-ring-suck-fast' : 'animate-energy-ring-suck'
                }`}
              />
              {/* Inner Imploding Ring 3 */}
              <div
                className={`absolute w-64 h-64 rounded-full border-2 border-white/85 shadow-[0_0_45px_rgba(255,255,255,0.9)] [animation-delay:500ms] ${
                  stage === 'firing' ? 'animate-energy-ring-suck-fast' : 'animate-energy-ring-suck'
                }`}
              />

              {/* 16 Radial Energy Streams Sucked From All Around Into the Center */}
              {RADIAL_ANGLES.map((angleClass, idx) => (
                <div
                  key={idx}
                  className={`absolute flex items-center justify-center ${angleClass}`}
                >
                  <div
                    className={`w-1.5 h-14 rounded-full bg-gradient-to-b from-transparent via-amber-300 to-white shadow-[0_0_16px_#fbbf24] ${
                      stage === 'firing' ? 'animate-energy-streak-suck-fast' : 'animate-energy-streak-suck'
                    }`}
                  />
                </div>
              ))}

              {/* Central Singularity Core Accumulating the Sucked Energy */}
              <div
                className={`rounded-full animate-accumulator-core ${
                  stage === 'firing'
                    ? 'w-44 h-44 bg-radial from-white via-amber-300/80 to-rose-600/0'
                    : 'w-32 h-32 bg-radial from-amber-300/80 via-rose-500/50 to-transparent'
                }`}
              />
            </div>
          )}

          {/* 2. OUTWARD SUPERNOVA DETONATION (DURING IMPACT) */}
          {stage === 'impact' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
              <div className="w-80 h-80 rounded-full border-8 border-amber-200 bg-rose-500/35 animate-explosion-shockwave shadow-[0_0_130px_#ef4444]" />
              <div className="absolute w-60 h-60 rounded-full border-4 border-white bg-yellow-300/50 animate-ping" />

              {/* 16 Outward Exploding Energy Beams */}
              {RADIAL_ANGLES.map((angleClass, idx) => (
                <div
                  key={idx}
                  className={`absolute flex items-center justify-center ${angleClass}`}
                >
                  <div className="w-2 h-20 rounded-full bg-gradient-to-t from-white via-amber-300 to-rose-500 shadow-[0_0_22px_#ffffff] animate-energy-streak-explode" />
                </div>
              ))}

              {/* Flying Shattered Crystal Shards */}
              {SHARD_POSITIONS.map((posClass, idx) => (
                <div
                  key={idx}
                  className={`absolute w-5 h-5 bg-gradient-to-tr from-rose-500 via-amber-300 to-white rotate-45 border border-white shadow-[0_0_22px_#fbbf24] transition-all duration-500 ${posClass}`}
                />
              ))}
            </div>
          )}

          {/* Outer Glow Behind Life Bar */}
          <div
            className={`absolute -inset-6 rounded-3xl blur-2xl transition-all duration-300 ${
              stage === 'impact'
                ? 'bg-gradient-to-r from-white via-amber-400 to-rose-500 opacity-100 scale-150'
                : stage === 'firing'
                ? 'bg-gradient-to-r from-rose-600 via-amber-300 to-red-600 opacity-90 scale-115'
                : 'bg-gradient-to-r from-amber-500/50 via-rose-500/60 to-purple-600/50 opacity-75'
            }`}
          />

          {/* The Victim's Life Bar Container */}
          <div
            className={`relative z-20 w-full max-w-md p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${
              stage === 'impact'
                ? 'border-white bg-gradient-to-r from-white via-amber-300 to-rose-500 animate-hp-shatter'
                : stage === 'firing'
                ? 'border-white bg-gradient-to-r from-rose-950 via-red-900 to-amber-950 animate-hp-critical-shake'
                : 'border-amber-400/95 bg-gradient-to-r from-stone-950 via-rose-950/90 to-stone-950 animate-hp-vibrate'
            }`}
          >
            {/* Sovereign Heart Medallion */}
            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
              <div
                className={`absolute inset-0 rotate-45 rounded-md transition-all ${
                  stage === 'firing' || stage === 'impact'
                    ? 'bg-gradient-to-tr from-white via-yellow-300 to-rose-500 shadow-[0_0_30px_#ffffff]'
                    : 'bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 shadow-[0_0_18px_#f59e0b]'
                }`}
              />
              <div
                className={`absolute inset-0 rotate-0 rounded-md transition-all ${
                  stage === 'firing' || stage === 'impact'
                    ? 'bg-gradient-to-tr from-rose-500 via-amber-300 to-white'
                    : 'bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200'
                }`}
              />
              <div className="absolute inset-1.5 bg-stone-950 rounded-full flex items-center justify-center border-2 border-amber-300">
                {stage === 'impact' ? (
                  <Skull size={26} className="text-amber-300 animate-ping" />
                ) : (
                  <Heart
                    size={26}
                    className={`text-rose-500 fill-rose-500 ${
                      stage === 'firing' ? 'animate-ping brightness-200' : 'animate-pulse'
                    }`}
                  />
                )}
              </div>
            </div>

            {/* Victim Name & Fracturing HP Segments */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-serif font-black text-sm sm:text-base uppercase tracking-wider text-amber-100 truncate">
                  {victimName}
                </span>
                <span
                  className={`font-mono font-black text-base sm:text-lg tabular-nums ${
                    stage === 'impact'
                      ? 'text-white'
                      : stage === 'firing'
                      ? 'text-amber-200 animate-bounce'
                      : 'text-rose-400'
                  }`}
                >
                  0 / 5 HP
                </span>
              </div>

              {/* Glowing & Vibrating Bar Track */}
              <div className="relative w-full h-6 rounded-full bg-stone-950 border-2 border-amber-300/90 p-1 mt-2 flex items-center gap-1 overflow-hidden shadow-[0_0_25px_rgba(244,63,94,0.85)]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-full rounded-xs transition-all ${
                      stage === 'firing' || stage === 'impact'
                        ? 'bg-gradient-to-r from-white via-amber-300 to-rose-500 shadow-[0_0_16px_#ffffff]'
                        : 'bg-gradient-to-r from-rose-500 via-amber-400 to-red-500 shadow-[0_0_12px_#f43f5e]'
                    }`}
                  />
                ))}

                {/* Lightning Fracture Overlay Lines */}
                <div className="absolute inset-0 flex items-center justify-around pointer-events-none">
                  <div className="w-0.5 h-full bg-white rotate-12 shadow-[0_0_8px_#fff]" />
                  <div className="w-0.5 h-full bg-amber-200 -rotate-12 shadow-[0_0_8px_#fde047]" />
                  <div className="w-0.5 h-full bg-white rotate-6 shadow-[0_0_8px_#fff]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subtitle Status Message */}
        <div className="mt-5 z-40">
          {stage === 'aiming' && (
            <p className="text-xs sm:text-sm font-serif font-bold text-amber-200 tracking-wide drop-shadow">
              Energia vital sendo sugada para o núcleo da barra de vida de <span className="text-white font-black">{victimName}</span>...
            </p>
          )}
          {stage === 'firing' && (
            <p className="text-sm sm:text-base font-serif font-black text-amber-100 uppercase tracking-wider drop-shadow-[0_0_14px_#ef4444]">
              ⚡ Acúmulo crítico atingido · Detonação iminente! ⚡
            </p>
          )}
          {stage === 'impact' && (
            <div className="animate-in zoom-in-75 duration-200 flex flex-col items-center">
              <span className="text-3xl sm:text-5xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-rose-400 tracking-wider drop-shadow-[0_0_30px_rgba(239,68,68,0.95)]">
                💥 EXPLOSÃO VITAL!
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
