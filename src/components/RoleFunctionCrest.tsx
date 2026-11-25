import React from 'react';
import { RefreshCw, Shield, Sparkles, Swords } from 'lucide-react';

interface RoleFunctionCrestProps {
  displayedRole: 'attacker' | 'defender';
  isCoinConsuming: boolean;
  isCoinRevealing: boolean;
  isRoleCoinManualSpin: boolean;
  isCosmicPurpleCoin: boolean;
  hasAttackedThisRound: boolean;
  isTestingArena: boolean;
  compact?: boolean;
  coinTargetRef: React.RefObject<HTMLDivElement | null>;
  onCoinClick: () => void;
  onTestingSwapRole?: () => void;
}

export const RoleFunctionCrest: React.FC<RoleFunctionCrestProps> = ({
  displayedRole,
  isCoinConsuming,
  isCoinRevealing,
  isRoleCoinManualSpin,
  isCosmicPurpleCoin,
  hasAttackedThisRound,
  isTestingArena,
  compact = false,
  coinTargetRef,
  onCoinClick,
  onTestingSwapRole,
}) => {
  const isDisplayingAttack = displayedRole === 'attacker';

  if (compact) {
    return (
      <div
        ref={coinTargetRef}
        data-role-coin="true"
        role="button"
        tabIndex={0}
        onClick={onCoinClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onCoinClick();
          }
        }}
        className={`relative w-full px-2 py-1.5 rounded-lg border-[1.5px] flex items-center justify-center gap-1.5 cursor-pointer select-none overflow-hidden transition-all duration-700 [transform-style:preserve-3d] ${
          isCoinConsuming || isRoleCoinManualSpin
            ? 'scale-110 border-amber-100 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-stone-950 shadow-[0_0_24px_#fbbf24] [transform:rotateY(1080deg)]'
            : isCosmicPurpleCoin
            ? 'border-fuchsia-300/90 bg-gradient-to-r from-[#2c0b46] via-[#581c87] to-[#2e1065] text-fuchsia-100 shadow-[0_0_16px_rgba(217,70,239,0.65)]'
            : isDisplayingAttack
            ? 'border-rose-400/80 bg-gradient-to-r from-[#2b090e] via-[#5c111b] to-[#260c09] text-amber-100 shadow-[0_0_12px_rgba(244,63,94,0.38)]'
            : 'border-sky-400/80 bg-gradient-to-r from-[#07192c] via-[#0e3559] to-[#081b2e] text-cyan-100 shadow-[0_0_12px_rgba(56,189,248,0.38)]'
        }`}
        title={isTestingArena ? 'Toque para alternar Atacante/Defensor' : 'Insígnia da Função'}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-7 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-dial-sheen"
        />
        {isCosmicPurpleCoin ? (
          <Sparkles size={11} className="shrink-0 text-fuchsia-200" />
        ) : isDisplayingAttack ? (
          <Swords size={11} className="shrink-0 text-amber-300" />
        ) : (
          <Shield size={11} className="shrink-0 text-cyan-300" />
        )}
        <span className="relative z-10 text-[9px] font-serif font-black uppercase tracking-widest leading-none whitespace-nowrap">
          {isCoinConsuming
            ? 'Girando'
            : isCosmicPurpleCoin
            ? 'Zyk'
            : isDisplayingAttack
            ? 'Atacante'
            : 'Defensor'}
        </span>
      </div>
    );
  }

  // Sculpted Octagonal Heraldic Crest Plaque (Desktop Left HUD)
  const plaqueThemeClass = isCoinConsuming
    ? 'border-amber-100 bg-gradient-to-br from-amber-400/45 via-yellow-500/30 to-amber-950/95 shadow-[0_0_46px_rgba(251,191,36,0.9),inset_0_0_24px_rgba(254,240,138,0.6)] scale-[1.04]'
    : isCosmicPurpleCoin
    ? 'border-fuchsia-400/90 bg-gradient-to-b from-[#250a3d]/95 via-[#180728]/95 to-[#0c0514]/95 shadow-[0_0_28px_rgba(217,70,239,0.52)]'
    : isCoinRevealing
    ? isDisplayingAttack
      ? 'border-amber-300 bg-gradient-to-b from-[#3b0c14]/95 via-[#21070c]/95 to-[#120608]/95 shadow-[0_0_34px_rgba(251,191,36,0.72)] animate-role-crest-reveal'
      : 'border-cyan-300 bg-gradient-to-b from-[#0a233d]/95 via-[#07172a]/95 to-[#050d18]/95 shadow-[0_0_34px_rgba(56,189,248,0.72)] animate-role-crest-reveal'
    : isDisplayingAttack
    ? 'border-rose-500/75 bg-gradient-to-b from-[#2e0b12]/95 via-[#1a070b]/95 to-[#0e0508]/95 shadow-[0_0_22px_rgba(244,63,94,0.28)] hover:border-amber-300/90'
    : 'border-sky-400/75 bg-gradient-to-b from-[#092038]/95 via-[#071526]/95 to-[#050c17]/95 shadow-[0_0_22px_rgba(56,189,248,0.28)] hover:border-cyan-300/90';

  const statusText = isCoinConsuming
    ? 'Alternando Função...'
    : isCosmicPurpleCoin
    ? 'Ataque Extra Ativo'
    : isDisplayingAttack
    ? hasAttackedThisRound
      ? 'Ataque Realizado'
      : 'Iniciativa de Combate'
    : 'Postura de Muralha';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onCoinClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCoinClick();
        }
      }}
      className={`group relative w-full rounded-xl border-[1.5px] px-2.5 py-2 flex flex-col items-center gap-1.5 transition-all duration-500 cursor-pointer select-none overflow-hidden ${plaqueThemeClass}`}
      title={
        isCosmicPurpleCoin
          ? 'Insígnia Cósmica de Zyk: Ataque Extra / Contra-Ataque Defensivo Ativo!'
          : isDisplayingAttack
          ? 'Função da Rodada: Você é o ATACANTE (gira automaticamente ao mudar de rodada)'
          : 'Função da Rodada: Você é o DEFENSOR (gira automaticamente ao mudar de rodada)'
      }
    >
      {/* Top forged-metal ornamental crest hairline */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-0 inset-x-4 h-[2px] rounded-full transition-colors duration-300 ${
          isCoinConsuming
            ? 'bg-gradient-to-r from-transparent via-yellow-200 to-transparent'
            : isCosmicPurpleCoin
            ? 'bg-gradient-to-r from-transparent via-fuchsia-400 to-transparent'
            : isDisplayingAttack
            ? 'bg-gradient-to-r from-transparent via-amber-400 to-transparent'
            : 'bg-gradient-to-r from-transparent via-cyan-300 to-transparent'
        }`}
      />

      {/* Subtle forged diagonal sheen sweeping across the crest plaque */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-dial-sheen"
      />

      {/* Ambient radial spotlight behind the sovereign crest medallion */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 w-24 h-16 rounded-full blur-xl transition-all duration-500 ${
          isCoinConsuming
            ? 'bg-amber-300/80 scale-125'
            : isCosmicPurpleCoin
            ? 'bg-fuchsia-500/55 animate-dial-breath'
            : isDisplayingAttack
            ? 'bg-rose-500/35'
            : 'bg-sky-400/35'
        }`}
      />

      {/* Subtle corner diamond rivets */}
      <span aria-hidden="true" className="pointer-events-none absolute top-1.5 left-1.5 w-1 h-1 rotate-45 bg-amber-300/60" />
      <span aria-hidden="true" className="pointer-events-none absolute top-1.5 right-1.5 w-1 h-1 rotate-45 bg-amber-300/60" />

      {/* Header kicker + Emblem Row */}
      <div className="relative z-10 w-full flex items-center gap-2">
        {/* 3D Spinning Sovereign Octagonal-Shield Medallion (Exact Target for 4-Corner Golden Wave Beams) */}
        <div
          ref={coinTargetRef}
          data-role-coin="true"
          className={`relative shrink-0 w-12 h-12 flex items-center justify-center [transform-style:preserve-3d] transition-all duration-700 ${
            isCoinConsuming
              ? '[transform:rotateY(1080deg)_scale(1.22)]'
              : isRoleCoinManualSpin
              ? '[transform:rotateY(720deg)_scale(1.08)]'
              : 'group-hover:scale-105'
          }`}
        >
          {/* Orbiting energy halo during swap or cosmic state */}
          <svg
            viewBox="0 0 60 60"
            aria-hidden="true"
            className={`pointer-events-none absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] ${
              isCoinConsuming || isCosmicPurpleCoin ? 'animate-dial-orbit-fast' : 'animate-dial-orbit-slow'
            }`}
          >
            <polygon
              points="30,2 50,10 58,30 50,50 30,58 10,50 2,30 10,10"
              fill="none"
              stroke={
                isCoinConsuming
                  ? '#fef08a'
                  : isCosmicPurpleCoin
                  ? '#e879f9'
                  : isDisplayingAttack
                  ? 'rgba(251,191,36,0.55)'
                  : 'rgba(56,189,248,0.55)'
              }
              strokeWidth="1.2"
              strokeDasharray="6 5"
            />
          </svg>

          {/* Forged Beveled Octagonal Medallion Body */}
          <div
            className={`relative w-11 h-11 flex items-center justify-center transition-all duration-500 ${
              isCoinConsuming
                ? 'bg-gradient-to-br from-amber-100 via-yellow-300 to-amber-500 text-stone-950 shadow-[0_0_32px_#fef08a,0_0_55px_#f59e0b]'
                : isCosmicPurpleCoin
                ? 'bg-gradient-to-br from-fuchsia-400 via-purple-700 to-violet-950 text-fuchsia-100 shadow-[0_0_24px_rgba(232,121,249,0.85)]'
                : isDisplayingAttack
                ? 'bg-gradient-to-br from-amber-300 via-rose-700 to-red-950 text-amber-50 shadow-[0_0_16px_rgba(244,63,94,0.55)]'
                : 'bg-gradient-to-br from-cyan-200 via-sky-700 to-blue-950 text-cyan-50 shadow-[0_0_16px_rgba(56,189,248,0.55)]'
            }`}
            style={{
              clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
            }}
          >
            {/* Inner recessed forged core */}
            <div
              className="w-[36px] h-[36px] flex items-center justify-center bg-black/35 shadow-inner"
              style={{
                clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
              }}
            >
              {isCosmicPurpleCoin ? (
                <Sparkles
                  size={19}
                  className="text-fuchsia-200 drop-shadow-[0_0_8px_rgba(240,171,252,0.95)] animate-role-emblem-float"
                />
              ) : isDisplayingAttack ? (
                <Swords
                  size={19}
                  className="text-amber-200 drop-shadow-[0_0_8px_rgba(251,191,36,0.95)] animate-role-emblem-float"
                />
              ) : (
                <Shield
                  size={19}
                  className="text-cyan-200 drop-shadow-[0_0_8px_rgba(56,189,248,0.95)] animate-role-emblem-float"
                />
              )}
            </div>
          </div>

          {/* Reveal burst ring right after the coin finishes spinning */}
          {isCoinRevealing && (
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 rounded-full border-2 animate-dial-shockwave ${
                isDisplayingAttack ? 'border-amber-300' : 'border-cyan-300'
              }`}
            />
          )}
        </div>

        {/* Crisp Heraldic Typography Readout */}
        <div className="flex flex-col items-start min-w-0 flex-1">
          <span
            className={`text-[8px] font-serif font-bold uppercase tracking-[0.16em] leading-none ${
              isCosmicPurpleCoin
                ? 'text-fuchsia-300'
                : isDisplayingAttack
                ? 'text-amber-300/90'
                : 'text-sky-300/90'
            }`}
          >
            {isCosmicPurpleCoin ? 'Zyk Cósmico' : 'Sua Função'}
          </span>

          <span
            className={`text-[13px] lg:text-sm font-serif font-black uppercase tracking-wider leading-tight mt-0.5 ${
              isCoinConsuming
                ? 'text-yellow-100'
                : isCosmicPurpleCoin
                ? 'text-fuchsia-100 drop-shadow-[0_0_10px_rgba(232,121,249,0.75)]'
                : isDisplayingAttack
                ? 'text-amber-100 drop-shadow-[0_0_8px_rgba(251,191,36,0.45)]'
                : 'text-cyan-100 drop-shadow-[0_0_8px_rgba(56,189,248,0.45)]'
            }`}
          >
            {isCoinConsuming ? 'Girando...' : isDisplayingAttack ? 'Atacante' : 'Defensor'}
          </span>

          <span
            className={`text-[8px] font-medium truncate max-w-full leading-tight mt-0.5 ${
              isCosmicPurpleCoin
                ? 'text-fuchsia-200/95'
                : isDisplayingAttack
                ? 'text-rose-200/85'
                : 'text-sky-200/85'
            }`}
          >
            {statusText}
          </span>
        </div>
      </div>

      {/* Testing Arena: Sleek Integrated Role-Swap Trigger */}
      {isTestingArena && onTestingSwapRole && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTestingSwapRole();
          }}
          className={`relative z-10 w-full py-1 px-2 rounded-lg border text-[9px] font-serif font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer whitespace-nowrap ${
            isDisplayingAttack
              ? 'bg-rose-950/70 hover:bg-rose-900/80 border-amber-400/45 hover:border-amber-300 text-amber-200'
              : 'bg-sky-950/70 hover:bg-sky-900/80 border-cyan-400/45 hover:border-cyan-300 text-cyan-200'
          }`}
          title="Girar a Insígnia da Função e alternar entre Atacante e Defensor"
        >
          <RefreshCw size={10} className="shrink-0" />
          <span>Alternar Função</span>
        </button>
      )}
    </div>
  );
};
