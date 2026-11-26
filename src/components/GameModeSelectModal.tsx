import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Coins,
  Compass,
  Crosshair,
  Crown,
  GraduationCap,
  Layers,
  Lock,
  Orbit,
  Play,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  X,
} from 'lucide-react';
import { sound } from '../services/soundEffects';
import { useModeQueues } from '../services/modeQueuesService';
import { useCloudPlayerState } from '../services/accountApi';
import { useRankPolicy } from '../services/rankPolicyService';
import { getRankInfo, loadRankPoints } from '../utils/rankSystem';
import { useVisualPreferences } from '../utils/visualTheme';
import { CosmicSkyEffects } from './CosmicSkyEffects';
import { advanceCardArtFallback, getCardArtCandidates } from '../utils/cardVisuals';

interface GameModeSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: 'ai', matchType: 'normal' | 'ranked', guided?: boolean) => void;
  onOpenOnlineLobby: (matchType: 'normal' | 'ranked') => void;
  onOpenTestingArena: () => void;
  onStartTutorial: () => void;
  onOpenDeckBuilder: () => void;
  onOpenDeckSelector: () => void;
  activeDeckName: string;
}

interface ModeBackdropArtProps {
  templateId: string;
  alt: string;
  isLvl2?: boolean;
  tintClass: string;
}

const ModeBackdropArt: React.FC<ModeBackdropArtProps> = ({
  templateId,
  alt,
  isLvl2 = false,
  tintClass,
}) => {
  const [failed, setFailed] = useState(false);
  const candidates = getCardArtCandidates(templateId, { isLvl2 });
  const src = candidates[0];

  if (failed || !src) {
    return <div aria-hidden="true" className={`absolute inset-0 ${tintClass} opacity-65`} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={(e) => {
        if (!advanceCardArtFallback(e.currentTarget, candidates)) {
          setFailed(true);
        }
      }}
      className="absolute inset-0 w-full h-full object-cover object-top opacity-35 group-hover:opacity-50 group-hover:scale-108 transition-all duration-500 pointer-events-none select-none"
    />
  );
};

export const GameModeSelectModal: React.FC<GameModeSelectModalProps> = ({
  isOpen,
  onClose,
  onSelectMode,
  onOpenOnlineLobby,
  onOpenTestingArena,
  onStartTutorial,
  onOpenDeckBuilder,
  onOpenDeckSelector,
  activeDeckName,
}) => {
  const { isCompactLandscape, foilEffects } = useVisualPreferences();
  const { queues } = useModeQueues();
  const { playerState } = useCloudPlayerState();
  const { rankPolicy } = useRankPolicy();
  const [isTutorialIntroOpen, setIsTutorialIntroOpen] = useState(false);
  if (!isOpen) return null;

  const rankInfo = getRankInfo(playerState?.rankPoints ?? loadRankPoints(), {
    globalBlockedFromTier: rankPolicy.blockedFromTier,
    playerBlockedTotal: playerState?.rankBlockedTotal,
    playerBlockedFromTier: playerState?.rankBlockFromTier,
    hasPlayedRanked: (playerState?.rankedMatchesPlayed ?? 0) > 0,
  });

  const hasCompletedTutorial = Boolean(playerState?.tutorialRewardClaimed);
  const currentAccountLevel = playerState?.level ?? 1;
  const hasReachedLevel2 = currentAccountLevel >= 2;
  const isPvpUnlocked =
    Boolean(playerState?.isAdmin) || (hasCompletedTutorial && hasReachedLevel2);

  const isPvpNormalOn = queues.pvp_normal.enabled;
  const isPvpRankedOn = queues.pvp_ranked.enabled;
  const isPviaOn = queues.pvia.enabled;
  const isTestingOn = queues.testing_arena.enabled;
  const isTutorialOn = queues.tutorial.enabled;

  const canEnterPvpNormal = isPvpNormalOn && isPvpUnlocked;
  const canEnterPvpRanked = isPvpRankedOn && isPvpUnlocked;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 lg:p-6 bg-[#02040b]/88 backdrop-blur-md select-none"
      onClick={onClose}
    >
      {/* Main Sanctuary Chamber Shell */}
      <div
        className={`relative z-10 w-full max-w-6xl max-h-[95dvh] flex flex-col justify-between rounded-[26px] bg-[#060a18]/96 border-[1.5px] border-amber-400/50 shadow-[0_24px_90px_rgba(0,0,0,0.95),0_0_50px_rgba(245,158,11,0.14)] overflow-hidden ${
          isCompactLandscape ? 'p-2.5 gap-2' : 'h-full p-4 sm:p-5 lg:p-6 gap-3 sm:gap-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============================================================== */}
        {/* LAYER 1: COSMIC SANCTUARY SKY, SPIRAL GALAXIES & ASTROLABE     */}
        {/* ============================================================== */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#141f45] via-[#070c1c] to-[#03050c]" />

          {/* Ambient Nebula Glows */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[780px] h-[360px] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.2)_0%,rgba(56,189,248,0.12)_52%,transparent_76%)] blur-3xl" />
          <div className="absolute -bottom-24 left-1/4 w-[480px] h-[280px] rounded-full bg-cyan-500/12 blur-[110px]" />
          <div className="absolute -bottom-24 right-1/4 w-[480px] h-[280px] rounded-full bg-purple-500/14 blur-[110px]" />

          {/* Live Shooting Stars & Spiral Galaxies */}
          <CosmicSkyEffects compact />

          {/* Subtle Rotating Sanctuary Astrolabe */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[620px] h-[620px] opacity-20">
            <svg viewBox="0 0 600 600" className="w-full h-full animate-spin-cosmic">
              <defs>
                <linearGradient id="modeAstrolabeGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fde68a" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              <circle cx="300" cy="300" r="280" fill="none" stroke="url(#modeAstrolabeGold)" strokeWidth="1.2" strokeDasharray="8 7" />
              <circle cx="300" cy="300" r="245" fill="none" stroke="url(#modeAstrolabeGold)" strokeWidth="1" />
              <circle cx="300" cy="300" r="190" fill="none" stroke="#38bdf8" strokeOpacity="0.45" strokeWidth="0.9" strokeDasharray="4 10" />
              <polygon points="300,52 514,424 86,424" fill="none" stroke="url(#modeAstrolabeGold)" strokeWidth="0.9" opacity="0.5" />
              <polygon points="300,548 514,176 86,176" fill="none" stroke="url(#modeAstrolabeGold)" strokeWidth="0.9" opacity="0.5" />
            </svg>
          </div>

          {/* Sanctuary Floor Grid Horizon */}
          <div
            className="absolute bottom-0 inset-x-0 h-36 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(to top, rgba(245,158,11,0.24) 1px, transparent 1px), linear-gradient(to right, rgba(56,189,248,0.16) 1px, transparent 1px)',
              backgroundSize: '56px 28px',
              maskImage: 'linear-gradient(to top, black 15%, transparent 100%)',
            }}
          />

          {/* Top & Bottom Forged Gold Rim Accent Lines */}
          <div className="absolute top-0 inset-x-16 h-[2px] bg-gradient-to-r from-transparent via-amber-300/80 to-transparent" />
          <div className="absolute bottom-0 inset-x-16 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/55 to-transparent" />
        </div>

        {/* Sculpted Corner Diamond Rivets */}
        <span aria-hidden="true" className="pointer-events-none absolute top-2.5 left-2.5 z-20 w-2 h-2 rotate-45 bg-amber-300/85 shadow-[0_0_8px_#fde047]" />
        <span aria-hidden="true" className="pointer-events-none absolute top-2.5 right-2.5 z-20 w-2 h-2 rotate-45 bg-cyan-300/85 shadow-[0_0_8px_#38bdf8]" />
        <span aria-hidden="true" className="pointer-events-none absolute bottom-2.5 left-2.5 z-20 w-2 h-2 rotate-45 bg-cyan-300/85 shadow-[0_0_8px_#38bdf8]" />
        <span aria-hidden="true" className="pointer-events-none absolute bottom-2.5 right-2.5 z-20 w-2 h-2 rotate-45 bg-amber-300/85 shadow-[0_0_8px_#fde047]" />

        {/* ============================================================== */}
        {/* HEADER: VOLTAR | CELESTIAL ARENA TITLE | CLOSE                 */}
        {/* ============================================================== */}
        <header className="relative z-20 w-full flex items-center justify-between gap-3 shrink-0">
          {/* Left Runic Medallion: Voltar */}
          <button
            type="button"
            onClick={() => {
              sound.playDraw();
              onClose();
            }}
            className="group flex items-center gap-2.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl bg-stone-900/90 hover:bg-stone-800/95 border-[1.5px] border-cyan-400/45 hover:border-amber-300 shadow-[0_6px_22px_rgba(0,0,0,0.8)] transition-all duration-200 cursor-pointer shrink-0 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            title="Voltar ao Menu Inicial"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-sky-950 via-slate-900 to-stone-950 border border-cyan-400/55 flex items-center justify-center shadow-[0_0_14px_rgba(56,189,248,0.28)] group-hover:-translate-x-0.5 transition-transform">
              <ArrowLeft size={17} className="text-cyan-200" />
            </div>
            <span className="font-serif font-black text-xs sm:text-sm tracking-[0.18em] text-amber-100 uppercase whitespace-nowrap">
              Voltar
            </span>
          </button>

          {/* Center Sanctuary Crest Heading */}
          <div className="flex flex-col items-center text-center min-w-0 px-1">
            <div className="flex items-center gap-2.5">
              <span aria-hidden="true" className="hidden sm:block w-10 h-[1px] bg-gradient-to-r from-transparent to-amber-400/85" />
              <span aria-hidden="true" className="hidden sm:block w-1.5 h-1.5 rotate-45 bg-amber-300 shadow-[0_0_8px_#fde047]" />
              <h2
                className={`font-serif font-black tracking-[0.16em] uppercase text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-100 to-amber-400 drop-shadow-[0_2px_14px_rgba(251,191,36,0.45)] whitespace-nowrap ${
                  isCompactLandscape ? 'text-sm' : 'text-lg sm:text-2xl lg:text-[26px]'
                }`}
              >
                Modos de Batalha
              </h2>
              <span aria-hidden="true" className="hidden sm:block w-1.5 h-1.5 rotate-45 bg-cyan-300 shadow-[0_0_8px_#38bdf8]" />
              <span aria-hidden="true" className="hidden sm:block w-10 h-[1px] bg-gradient-to-l from-transparent to-cyan-400/85" />
            </div>
            {!isCompactLandscape && (
              <div className="mt-0.5 flex items-center gap-2 text-[11px] sm:text-xs text-stone-400">
                <span>Arena Celestial</span>
                <span aria-hidden="true">·</span>
                <span className="text-amber-200/85">Escolha seu campo de duelo</span>
              </div>
            )}
          </div>

          {/* Right Runic Medallion: Close */}
          <button
            type="button"
            onClick={() => {
              sound.playDraw();
              onClose();
            }}
            className="w-11 h-11 rounded-2xl bg-stone-900/90 hover:bg-rose-950/90 border-[1.5px] border-stone-700/90 hover:border-rose-400/75 text-stone-300 hover:text-rose-200 flex items-center justify-center shadow-[0_6px_22px_rgba(0,0,0,0.8)] transition-all duration-200 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            title="Fechar Modal de Modos"
            aria-label="Fechar"
          >
            <X size={19} />
          </button>
        </header>

        {/* ============================================================== */}
        {/* CENTER: SCULPTED SANCTUARY MODE PORTALS GRID                   */}
        {/* ============================================================== */}
        <div
          className={`relative z-20 w-full flex-1 min-h-0 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-stretch ${
            isCompactLandscape ? 'gap-2 py-0.5' : 'gap-3.5 sm:gap-5 py-1'
          }`}
        >
          {/* PORTAL 1: PvP NORMAL (ONLINE REDE LOCAL) */}
          <button
            type="button"
            disabled={!canEnterPvpNormal}
            onClick={() => {
              if (!canEnterPvpNormal) return;
              sound.playSummon();
              onOpenOnlineLobby('normal');
            }}
            className={`group relative flex flex-col justify-between rounded-2xl border-[1.5px] bg-gradient-to-b from-[#0f1a38]/95 via-[#090e20]/95 to-[#060812]/98 shadow-[0_14px_40px_rgba(0,0,0,0.85)] transition-all duration-300 text-left overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
              canEnterPvpNormal
                ? 'border-sky-400/60 hover:border-amber-300 hover:shadow-[0_18px_50px_rgba(56,189,248,0.34),0_0_30px_rgba(251,191,36,0.22)] hover:-translate-y-1.5 cursor-pointer'
                : !isPvpNormalOn
                ? 'border-rose-500/60 opacity-75 grayscale-[45%] cursor-not-allowed'
                : 'border-amber-500/50 opacity-90 cursor-not-allowed'
            } ${
              isCompactLandscape ? 'p-2.5' : 'p-4 sm:p-5'
            }`}
          >
            {!isPvpNormalOn ? (
              <div className="absolute inset-0 z-30 bg-stone-950/82 backdrop-blur-[2.5px] flex flex-col items-center justify-center p-4 text-center gap-2">
                <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-md bg-rose-600 border border-rose-300/90 text-[10px] font-mono font-black uppercase tracking-widest text-white shadow-[0_0_16px_rgba(244,63,94,0.75)] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  OFFLINE
                </span>
                <div className="w-11 h-11 rounded-2xl bg-rose-950/95 border border-rose-400/80 flex items-center justify-center text-rose-200 shadow-[0_0_24px_rgba(244,63,94,0.5)]">
                  <Lock size={20} />
                </div>
                <span className="px-3 py-1 rounded-md bg-rose-600/35 border border-rose-400/90 text-[10px] sm:text-[11px] font-mono font-black uppercase tracking-[0.14em] text-rose-100 shadow-[0_0_18px_rgba(244,63,94,0.35)]">
                  DESABILITADO NO MOMENTO
                </span>
                <p className="text-[11px] text-stone-200 max-w-[235px] leading-snug">
                  {queues.pvp_normal.reason || 'Salas PvP Normal temporariamente desativadas pelo administrador.'}
                </p>
              </div>
            ) : !isPvpUnlocked ? (
              <div className="absolute inset-0 z-30 bg-[#050814]/88 backdrop-blur-[3px] flex flex-col items-center justify-center p-4 text-center gap-2.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-950/90 border border-amber-400/75 flex items-center justify-center text-amber-200 shadow-[0_0_22px_rgba(245,158,11,0.35)]">
                  <Lock size={20} />
                </div>
                <span className="px-3 py-1 rounded-md bg-amber-500/20 border border-amber-400/70 text-[10px] sm:text-[11px] font-mono font-black uppercase tracking-[0.14em] text-amber-200">
                  BLOQUEADO · REQUISITOS
                </span>
                <div className="w-full max-w-[235px] space-y-1.5 text-left bg-stone-950/85 border border-white/10 rounded-xl p-2.5 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className={hasCompletedTutorial ? 'text-emerald-300' : 'text-stone-200'}>
                      1. Concluir o Tutorial
                    </span>
                    <span className={`font-mono font-bold text-[10px] ${hasCompletedTutorial ? 'text-emerald-400' : 'text-amber-300'}`}>
                      {hasCompletedTutorial ? '✓ OK' : 'Pendente'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={hasReachedLevel2 ? 'text-emerald-300' : 'text-stone-200'}>
                      2. Nível 2 no PvIA
                    </span>
                    <span className={`font-mono font-bold text-[10px] tabular-nums ${hasReachedLevel2 ? 'text-emerald-400' : 'text-amber-300'}`}>
                      {hasReachedLevel2 ? '✓ OK' : `Nv. ${currentAccountLevel}/2`}
                    </span>
                  </div>
                </div>
                <p className="text-[10.5px] text-stone-400 max-w-[230px] leading-snug">
                  No Nível 1, cada partida PvIA garante +50 XP para subir de nível rapidamente.
                </p>
              </div>
            ) : null}
            {/* Card Art Atmospheric Backdrop */}
            <ModeBackdropArt
              templateId="g_kaliel"
              isLvl2
              alt="Portal PvP Normal"
              tintClass="bg-gradient-to-b from-sky-900/50 via-indigo-950/60 to-stone-950"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#081024]/55 via-[#070b1a]/82 to-[#050711]/98"
            />

            {/* Diagonal Specular Metallic Sheen */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-sky-200/18 to-transparent animate-dial-sheen"
            />

            {/* Top Rim Accent */}
            <div aria-hidden="true" className="pointer-events-none absolute top-0 inset-x-8 h-[2px] bg-gradient-to-r from-transparent via-sky-300 to-transparent" />

            {/* Top Header */}
            <div className="relative z-10 flex items-center justify-between gap-2">
              <span className="text-[10px] font-serif font-bold uppercase tracking-[0.2em] text-sky-300/95">
                Duelo Casual
              </span>
              <span className="text-[10px] font-mono text-stone-400">
                Online · Local
              </span>
            </div>

            {/* Central Sculpted Solar-Sapphire Crest Medallion */}
            <div className={`relative z-10 flex flex-col items-center justify-center text-center my-auto ${isCompactLandscape ? 'py-1.5' : 'py-4'}`}>
              <div className="relative flex items-center justify-center">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-4 rounded-full bg-sky-400/25 blur-xl group-hover:bg-sky-300/40 transition-colors"
                />
                <svg
                  viewBox="0 0 110 110"
                  aria-hidden="true"
                  className={`pointer-events-none absolute animate-dial-orbit-slow opacity-70 group-hover:opacity-100 ${
                    isCompactLandscape ? 'w-16 h-16' : 'w-24 h-24 sm:w-28 sm:h-28'
                  }`}
                >
                  <circle cx="55" cy="55" r="49" fill="none" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="7 6" />
                  <circle cx="55" cy="55" r="42" fill="none" stroke="#fbbf24" strokeWidth="0.9" strokeOpacity="0.65" />
                </svg>

                <div
                  className={`relative flex items-center justify-center bg-gradient-to-br from-sky-300 via-blue-600 to-indigo-950 p-[2px] shadow-[0_0_24px_rgba(56,189,248,0.55)] group-hover:scale-108 transition-transform duration-300 ${
                    isCompactLandscape ? 'w-11 h-11' : 'w-16 h-16 sm:w-[74px] sm:h-[74px]'
                  }`}
                  style={{
                    clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                  }}
                >
                  <div
                    className="w-full h-full bg-gradient-to-br from-[#0e2244] via-[#091329] to-[#050814] flex items-center justify-center"
                    style={{
                      clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                    }}
                  >
                    <Swords
                      size={isCompactLandscape ? 20 : 30}
                      className="text-sky-200 drop-shadow-[0_0_12px_rgba(56,189,248,0.9)]"
                    />
                  </div>
                </div>
              </div>

              <h3
                className={`font-serif font-black tracking-[0.14em] uppercase text-transparent bg-clip-text bg-gradient-to-b from-white via-sky-100 to-sky-300 drop-shadow ${
                  isCompactLandscape ? 'text-sm mt-2' : 'text-2xl sm:text-[26px] mt-4'
                }`}
              >
                PvP Normal
              </h3>
              <p className={`${isCompactLandscape ? 'text-[10px] mt-0.5' : 'text-xs mt-1.5 max-w-[230px]'} text-stone-300/90 leading-snug`}>
                Enfrente outro jogador na rede local em partidas livres sem risco de pontos de rank.
              </p>
            </div>

            {/* Sculpted Chamfered Footer CTA Strip */}
            <div
              className={`relative z-10 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-950/90 via-blue-900/70 to-sky-950/90 border border-sky-400/55 group-hover:border-amber-300/80 text-sky-100 group-hover:text-amber-100 transition-colors ${
                isCompactLandscape ? 'py-1.5 px-3 mt-1.5' : 'py-2.5 px-4 mt-3'
              }`}
              style={{
                clipPath: 'polygon(12px 0%, calc(100% - 12px) 0%, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0% 50%)',
              }}
            >
              <span className="font-serif font-black text-[11px] sm:text-xs uppercase tracking-[0.2em] whitespace-nowrap">
                Abrir Sala Normal
              </span>
              <ChevronRight size={14} className="text-sky-300 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </button>

          {/* PORTAL 2: PvP RANQUEADO (SOVEREIGN GOLDEN HERO PORTAL) */}
          <button
            type="button"
            disabled={!canEnterPvpRanked}
            onClick={() => {
              if (!canEnterPvpRanked) return;
              sound.playSummon();
              onOpenOnlineLobby('ranked');
            }}
            className={`group relative flex flex-col justify-between rounded-2xl border-2 bg-gradient-to-b from-[#2b1a09]/95 via-[#130d16]/95 to-[#08060c]/98 transition-all duration-300 text-left overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
              canEnterPvpRanked
                ? 'border-amber-400/85 hover:border-amber-200 shadow-[0_16px_50px_rgba(245,158,11,0.28),0_0_30px_rgba(0,0,0,0.9)] hover:shadow-[0_22px_65px_rgba(251,191,36,0.52)] hover:-translate-y-2 cursor-pointer'
                : !isPvpRankedOn
                ? 'border-rose-500/70 opacity-75 grayscale-[45%] cursor-not-allowed'
                : 'border-amber-500/50 opacity-90 cursor-not-allowed'
            } ${
              isCompactLandscape ? 'p-2.5' : 'p-4 sm:p-5'
            }`}
          >
            {!isPvpRankedOn ? (
              <div className="absolute inset-0 z-30 bg-stone-950/84 backdrop-blur-[2.5px] flex flex-col items-center justify-center p-4 text-center gap-2">
                <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-md bg-rose-600 border border-rose-300/90 text-[10px] font-mono font-black uppercase tracking-widest text-white shadow-[0_0_16px_rgba(244,63,94,0.75)] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  OFFLINE
                </span>
                <div className="w-12 h-12 rounded-2xl bg-rose-950/95 border border-rose-400/80 flex items-center justify-center text-rose-200 shadow-[0_0_26px_rgba(244,63,94,0.55)]">
                  <Lock size={22} />
                </div>
                <span className="px-3 py-1 rounded-md bg-rose-600/35 border border-rose-400/90 text-[10px] sm:text-[11px] font-mono font-black uppercase tracking-[0.14em] text-rose-100 shadow-[0_0_18px_rgba(244,63,94,0.35)]">
                  DESABILITADO NO MOMENTO
                </span>
                <p className="text-[11px] text-stone-200 max-w-[240px] leading-snug">
                  {queues.pvp_ranked.reason || 'Fila Ranqueada temporariamente fechada pelo administrador.'}
                </p>
              </div>
            ) : !isPvpUnlocked ? (
              <div className="absolute inset-0 z-30 bg-[#0b070c]/88 backdrop-blur-[3px] flex flex-col items-center justify-center p-4 text-center gap-2.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-950/90 border border-amber-400/75 flex items-center justify-center text-amber-200 shadow-[0_0_22px_rgba(245,158,11,0.35)]">
                  <Lock size={22} />
                </div>
                <span className="px-3 py-1 rounded-md bg-amber-500/20 border border-amber-400/70 text-[10px] sm:text-[11px] font-mono font-black uppercase tracking-[0.14em] text-amber-200">
                  BLOQUEADO · REQUISITOS
                </span>
                <div className="w-full max-w-[240px] space-y-1.5 text-left bg-stone-950/85 border border-white/10 rounded-xl p-2.5 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className={hasCompletedTutorial ? 'text-emerald-300' : 'text-stone-200'}>
                      1. Concluir o Tutorial
                    </span>
                    <span className={`font-mono font-bold text-[10px] ${hasCompletedTutorial ? 'text-emerald-400' : 'text-amber-300'}`}>
                      {hasCompletedTutorial ? '✓ OK' : 'Pendente'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={hasReachedLevel2 ? 'text-emerald-300' : 'text-stone-200'}>
                      2. Nível 2 no PvIA
                    </span>
                    <span className={`font-mono font-bold text-[10px] tabular-nums ${hasReachedLevel2 ? 'text-emerald-400' : 'text-amber-300'}`}>
                      {hasReachedLevel2 ? '✓ OK' : `Nv. ${currentAccountLevel}/2`}
                    </span>
                  </div>
                </div>
                <p className="text-[10.5px] text-stone-400 max-w-[235px] leading-snug">
                  Apenas partidas PvP Ranqueadas concedem Pontos de Rank (RP).
                </p>
              </div>
            ) : null}
            {/* Card Art Atmospheric Backdrop (O Sol) */}
            <ModeBackdropArt
              templateId="n_o_sol"
              alt="Portal PvP Ranqueado"
              tintClass="bg-gradient-to-b from-amber-800/45 via-amber-950/60 to-stone-950"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#1e1206]/45 via-[#120b12]/78 to-[#07050a]/98"
            />

            {/* Foil Holographic Sweep for Featured Competitive Portal */}
            {foilEffects && (
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 tcg-foil-overlay opacity-45" />
            )}

            {/* Top Molten-Gold Crown Accent */}
            <div aria-hidden="true" className="pointer-events-none absolute top-0 inset-x-6 h-[2.5px] bg-gradient-to-r from-transparent via-amber-200 to-transparent" />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-amber-300 border border-white shadow-[0_0_12px_#fde047]"
            />

            {/* Top Header */}
            <div className="relative z-10 flex items-center justify-between gap-2">
              <span className="text-[10px] font-serif font-black uppercase tracking-[0.2em] text-amber-300 flex items-center gap-1">
                <Crown size={12} className="text-amber-300 shrink-0" />
                <span>Competitivo</span>
              </span>
              <span className="text-[10px] font-mono text-amber-200/90 flex items-center gap-1">
                {(rankInfo.isTotallyBlocked || rankInfo.isCapped) && <Lock size={10} className="text-amber-300 shrink-0" />}
                <span>{rankInfo.isTotallyBlocked ? `Travado · ${rankInfo.label}` : `Valendo RP · ${rankInfo.label}`}</span>
              </span>
            </div>

            {/* Central Sovereign Sunburst Trophy Medallion */}
            <div className={`relative z-10 flex flex-col items-center justify-center text-center my-auto ${isCompactLandscape ? 'py-1.5' : 'py-4'}`}>
              <div className="relative flex items-center justify-center">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-5 rounded-full bg-amber-400/35 blur-2xl animate-dial-breath"
                />
                {/* Rotating Golden Solar Corona */}
                <svg
                  viewBox="0 0 130 130"
                  aria-hidden="true"
                  className={`pointer-events-none absolute animate-spin-cosmic opacity-65 group-hover:opacity-100 ${
                    isCompactLandscape ? 'w-20 h-20' : 'w-28 h-28 sm:w-32 sm:h-32'
                  }`}
                >
                  {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                    <polygon
                      key={deg}
                      points="65,65 62,10 65,3 68,10"
                      fill="#fbbf24"
                      opacity="0.7"
                      transform={`rotate(${deg} 65 65)`}
                    />
                  ))}
                  <circle cx="65" cy="65" r="46" fill="none" stroke="#fef08a" strokeWidth="1.2" strokeDasharray="6 5" />
                </svg>

                <div
                  className={`relative flex items-center justify-center bg-gradient-to-br from-amber-100 via-amber-400 to-amber-800 p-[2.5px] shadow-[0_0_32px_rgba(251,191,36,0.75)] group-hover:scale-110 transition-transform duration-300 ${
                    isCompactLandscape ? 'w-12 h-12' : 'w-[70px] h-[70px] sm:w-20 sm:h-20'
                  }`}
                  style={{
                    clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                  }}
                >
                  <div
                    className="w-full h-full bg-gradient-to-br from-[#351f08] via-[#1c1008] to-[#0b0709] flex items-center justify-center"
                    style={{
                      clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                    }}
                  >
                    <Trophy
                      size={isCompactLandscape ? 21 : 33}
                      className="text-amber-200 drop-shadow-[0_0_14px_rgba(253,224,71,0.95)]"
                    />
                  </div>
                </div>
              </div>

              <h3
                className={`font-serif font-black tracking-[0.14em] uppercase text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-100 to-amber-400 drop-shadow-[0_2px_12px_rgba(251,191,36,0.5)] ${
                  isCompactLandscape ? 'text-sm mt-2' : 'text-2xl sm:text-[26px] mt-4'
                }`}
              >
                PvP Ranqueado
              </h3>
              <p className={`${isCompactLandscape ? 'text-[10px] mt-0.5' : 'text-xs mt-1.5 max-w-[240px]'} text-amber-100/85 leading-snug`}>
                Duelo oficial online pela glória dos reinos. Conquiste Pontos de Rank (RP) e suba de elo.
              </p>
            </div>

            {/* Sculpted Chamfered Molten-Gold CTA Strip */}
            <div
              className={`relative z-10 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-stone-950 shadow-[0_0_24px_rgba(251,191,36,0.5)] group-hover:brightness-110 transition-all ${
                isCompactLandscape ? 'py-1.5 px-3 mt-1.5' : 'py-2.5 px-4 mt-3'
              }`}
              style={{
                clipPath: 'polygon(12px 0%, calc(100% - 12px) 0%, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0% 50%)',
              }}
            >
              <span className="font-serif font-black text-[11px] sm:text-xs uppercase tracking-[0.2em] whitespace-nowrap">
                Disputar Ranqueada
              </span>
              <ChevronRight size={15} className="text-stone-950 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </button>

          {/* COLUMN 3: SANCTUARY TRAINING & PRACTICE PORTALS (PvIA, ARENA DE TESTES & TUTORIAL) */}
          <div
            className={`sm:col-span-2 lg:col-span-1 flex ${
              isCompactLandscape ? 'flex-row gap-2' : 'flex-col gap-2.5 sm:gap-3'
            } justify-between`}
          >
            {/* PORTAL 3: MODO PvIA (ASTRAL VIOLET CHAMBER + MODO GUIADO) */}
            <div
              role="button"
              tabIndex={isPviaOn ? 0 : -1}
              aria-disabled={!isPviaOn}
              onClick={() => {
                if (!isPviaOn) return;
                sound.playSummon();
                onSelectMode('ai', 'normal', false);
              }}
              onKeyDown={(e) => {
                if (!isPviaOn) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  sound.playSummon();
                  onSelectMode('ai', 'normal', false);
                }
              }}
              className={`group relative flex-1 flex items-center justify-between gap-2.5 rounded-2xl border-[1.5px] bg-gradient-to-br from-[#1b0e36]/95 via-[#0f0921]/95 to-[#070612]/98 shadow-[0_12px_34px_rgba(0,0,0,0.85)] transition-all duration-300 text-left overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 ${
                isPviaOn
                  ? 'border-purple-400/55 hover:border-purple-300 hover:shadow-[0_16px_42px_rgba(168,85,247,0.38)] hover:-translate-y-1 cursor-pointer'
                  : 'border-rose-500/60 opacity-75 grayscale-[45%] cursor-not-allowed'
              } ${
                isCompactLandscape ? 'p-2 min-h-[78px]' : 'p-3.5 sm:p-4 min-h-[104px]'
              }`}
            >
              {!isPviaOn && (
                <div className="absolute inset-0 z-30 bg-stone-950/84 backdrop-blur-[2.5px] flex items-center justify-center gap-2.5 px-3 py-2 text-left">
                  <div className="w-9 h-9 rounded-xl bg-rose-950/95 border border-rose-400/80 flex items-center justify-center text-rose-200 shrink-0 shadow-[0_0_16px_rgba(244,63,94,0.45)]">
                    <Lock size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-rose-600 border border-rose-300/90 text-[9px] font-mono font-black uppercase tracking-wider text-white">
                        OFFLINE
                      </span>
                      <span className="text-[9.5px] font-mono font-black uppercase tracking-wider text-rose-200">
                        DESABILITADO NO MOMENTO
                      </span>
                    </div>
                    <span className="block text-[10px] text-stone-200 line-clamp-2 mt-0.5">
                      {queues.pvia.reason || 'Temporariamente desativado pelo administrador.'}
                    </span>
                  </div>
                </div>
              )}
              <ModeBackdropArt
                templateId="g_a_lua"
                alt="Portal PvIA"
                tintClass="bg-gradient-to-br from-purple-900/50 via-indigo-950/60 to-stone-950"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a0618]/94 via-[#110926]/82 to-[#0e0820]/55"
              />
              <div aria-hidden="true" className="pointer-events-none absolute top-0 inset-x-6 h-[2px] bg-gradient-to-r from-transparent via-purple-400/80 to-transparent" />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-purple-300/18 to-transparent animate-dial-sheen"
              />

              <div className="relative z-10 flex flex-col justify-between h-full min-w-0">
                <div>
                  <span className="text-[10px] font-serif font-bold uppercase tracking-[0.2em] text-purple-300/95">
                    Campanha Solo · Baralhos Rotativos
                  </span>
                  <h3
                    className={`font-serif font-black uppercase tracking-[0.14em] text-transparent bg-clip-text bg-gradient-to-b from-white via-purple-100 to-purple-300 leading-tight mt-0.5 ${
                      isCompactLandscape ? 'text-sm' : 'text-xl sm:text-2xl'
                    }`}
                  >
                    Modo PvIA
                  </h3>
                  <p className={`${isCompactLandscape ? 'text-[10px]' : 'text-xs mt-1'} text-stone-300/90 leading-snug`}>
                    {currentAccountLevel === 1
                      ? 'Nível 1: ganhe +50 XP por partida para liberar o PvP! (Sem pontos de rank)'
                      : 'Enfrente a IA com baralhos variados (+10 XP/partida · Sem pontos de rank).'}
                  </p>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-serif font-bold uppercase tracking-widest text-purple-200 group-hover:text-amber-200 transition-colors">
                    <span>Jogar Solo</span>
                    <ChevronRight size={13} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                  <button
                    type="button"
                    disabled={!isPviaOn}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isPviaOn) return;
                      sound.playSummon();
                      onSelectMode('ai', 'normal', true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/60 text-emerald-200 hover:text-white text-[10px] font-serif font-black uppercase tracking-wider transition-colors cursor-pointer"
                    title="Jogar PvIA com dicas táticas em tempo real (pode pular ou fechar a qualquer hora)"
                  >
                    <Compass size={11} />
                    <span>Modo Guiado</span>
                  </button>
                </div>
              </div>

              {/* Sculpted Octagonal Astral Emblem */}
              <div className="relative z-10 shrink-0 flex items-center justify-center">
                <div aria-hidden="true" className="pointer-events-none absolute -inset-2 rounded-full bg-purple-500/30 blur-lg group-hover:bg-purple-400/45 transition-colors" />
                <svg
                  viewBox="0 0 80 80"
                  aria-hidden="true"
                  className={`pointer-events-none absolute animate-dial-orbit-reverse opacity-70 ${
                    isCompactLandscape ? 'w-14 h-14' : 'w-20 h-20'
                  }`}
                >
                  <circle cx="40" cy="40" r="35" fill="none" stroke="#c084fc" strokeWidth="1.1" strokeDasharray="6 5" />
                </svg>
                <div
                  className={`relative bg-gradient-to-br from-fuchsia-300 via-purple-600 to-indigo-950 p-[2px] shadow-[0_0_20px_rgba(168,85,247,0.55)] group-hover:scale-110 transition-transform duration-300 ${
                    isCompactLandscape ? 'w-11 h-11' : 'w-14 h-14 sm:w-16 sm:h-16'
                  }`}
                  style={{
                    clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                  }}
                >
                  <div
                    className="w-full h-full bg-gradient-to-br from-[#231042] via-[#130926] to-[#080512] flex items-center justify-center"
                    style={{
                      clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                    }}
                  >
                    <Orbit
                      size={isCompactLandscape ? 19 : 26}
                      className="text-purple-200 drop-shadow-[0_0_10px_rgba(216,180,254,0.95)]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* PORTAL 4: ARENA DE TESTES (CRYSTALLINE CYAN-EMERALD SANDBOX) */}
            <button
              type="button"
              disabled={!isTestingOn}
              onClick={() => {
                if (!isTestingOn) return;
                sound.playSummon();
                onOpenTestingArena();
              }}
              className={`group relative flex-1 flex items-center justify-between gap-2.5 rounded-2xl border-[1.5px] bg-gradient-to-br from-[#072636]/95 via-[#071624]/95 to-[#050b12]/98 shadow-[0_12px_34px_rgba(0,0,0,0.85)] transition-all duration-300 text-left overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                isTestingOn
                  ? 'border-cyan-400/55 hover:border-emerald-300 hover:shadow-[0_16px_42px_rgba(34,211,238,0.36)] hover:-translate-y-1 cursor-pointer'
                  : 'border-rose-500/60 opacity-75 grayscale-[45%] cursor-not-allowed'
              } ${
                isCompactLandscape ? 'p-2 min-h-[78px]' : 'p-3.5 sm:p-4 min-h-[104px]'
              }`}
            >
              {!isTestingOn && (
                <div className="absolute inset-0 z-30 bg-stone-950/84 backdrop-blur-[2.5px] flex items-center justify-center gap-2.5 px-3 py-2 text-left">
                  <div className="w-9 h-9 rounded-xl bg-rose-950/95 border border-rose-400/80 flex items-center justify-center text-rose-200 shrink-0 shadow-[0_0_16px_rgba(244,63,94,0.45)]">
                    <Lock size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-rose-600 border border-rose-300/90 text-[9px] font-mono font-black uppercase tracking-wider text-white">
                        OFFLINE
                      </span>
                      <span className="text-[9.5px] font-mono font-black uppercase tracking-wider text-rose-200">
                        DESABILITADO NO MOMENTO
                      </span>
                    </div>
                    <span className="block text-[10px] text-stone-200 line-clamp-2 mt-0.5">
                      {queues.testing_arena.reason || 'Temporariamente desativada pelo administrador.'}
                    </span>
                  </div>
                </div>
              )}
              <ModeBackdropArt
                templateId="g_zyk"
                alt="Portal Arena de Testes"
                tintClass="bg-gradient-to-br from-cyan-900/50 via-teal-950/60 to-stone-950"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#041019]/94 via-[#061824]/82 to-[#061d29]/55"
              />
              <div aria-hidden="true" className="pointer-events-none absolute top-0 inset-x-6 h-[2px] bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-cyan-200/18 to-transparent animate-dial-sheen"
              />

              <div className="relative z-10 flex flex-col justify-between h-full min-w-0">
                <div>
                  <span className="text-[10px] font-serif font-bold uppercase tracking-[0.2em] text-cyan-300/95">
                    Laboratório Livre
                  </span>
                  <h3
                    className={`font-serif font-black uppercase tracking-[0.12em] text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-teal-300 leading-tight mt-0.5 ${
                      isCompactLandscape ? 'text-xs' : 'text-lg sm:text-xl'
                    }`}
                  >
                    Arena de Testes
                  </h3>
                  <p className={`${isCompactLandscape ? 'text-[9.5px]' : 'text-[11px] mt-0.5'} text-stone-300/90 leading-snug`}>
                    Teste combos, evoluções e cartas sem limite de Tier.
                  </p>
                </div>

                <div className="mt-1.5 flex items-center gap-1 text-[10.5px] font-serif font-bold uppercase tracking-widest text-cyan-200 group-hover:text-emerald-200 transition-colors">
                  <span>Abrir Sandbox</span>
                  <ChevronRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Sculpted Octagonal Precision Emblem */}
              <div className="relative z-10 shrink-0 flex items-center justify-center">
                <div aria-hidden="true" className="pointer-events-none absolute -inset-2 rounded-full bg-cyan-400/28 blur-lg group-hover:bg-emerald-400/40 transition-colors" />
                <svg
                  viewBox="0 0 80 80"
                  aria-hidden="true"
                  className={`pointer-events-none absolute animate-dial-orbit-slow opacity-70 ${
                    isCompactLandscape ? 'w-12 h-12' : 'w-16 h-16'
                  }`}
                >
                  <circle cx="40" cy="40" r="35" fill="none" stroke="#22d3ee" strokeWidth="1.1" strokeDasharray="5 5" />
                </svg>
                <div
                  className={`relative bg-gradient-to-br from-cyan-200 via-teal-500 to-slate-900 p-[2px] shadow-[0_0_20px_rgba(34,211,238,0.5)] group-hover:scale-110 transition-transform duration-300 ${
                    isCompactLandscape ? 'w-10 h-10' : 'w-12 h-12 sm:w-14 sm:h-14'
                  }`}
                  style={{
                    clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                  }}
                >
                  <div
                    className="w-full h-full bg-gradient-to-br from-[#082c3a] via-[#061a26] to-[#040c14] flex items-center justify-center"
                    style={{
                      clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                    }}
                  >
                    <Crosshair
                      size={isCompactLandscape ? 17 : 22}
                      className="text-cyan-200 drop-shadow-[0_0_10px_rgba(34,211,238,0.95)]"
                    />
                  </div>
                </div>
              </div>
            </button>

            {/* PORTAL 5: TUTORIAL INTERATIVO (EMERALD-GOLD GUIDED ACADEMY) */}
            <button
              type="button"
              disabled={!isTutorialOn}
              onClick={() => {
                if (!isTutorialOn) return;
                sound.playDraw();
                setIsTutorialIntroOpen(true);
              }}
              className={`group relative flex-1 flex items-center justify-between gap-2.5 rounded-2xl border-[1.5px] bg-gradient-to-br from-[#0b2a1e]/95 via-[#071914]/95 to-[#050b0a]/98 shadow-[0_12px_34px_rgba(0,0,0,0.85)] transition-all duration-300 text-left overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${
                isTutorialOn
                  ? 'border-emerald-400/60 hover:border-amber-300 hover:shadow-[0_16px_42px_rgba(16,185,129,0.36)] hover:-translate-y-1 cursor-pointer'
                  : 'border-rose-500/60 opacity-75 grayscale-[45%] cursor-not-allowed'
              } ${
                isCompactLandscape ? 'p-2 min-h-[78px]' : 'p-3.5 sm:p-4 min-h-[104px]'
              }`}
            >
              {!isTutorialOn && (
                <div className="absolute inset-0 z-30 bg-stone-950/84 backdrop-blur-[2.5px] flex items-center justify-center gap-2.5 px-3 py-2 text-left">
                  <div className="w-9 h-9 rounded-xl bg-rose-950/95 border border-rose-400/80 flex items-center justify-center text-rose-200 shrink-0 shadow-[0_0_16px_rgba(244,63,94,0.45)]">
                    <Lock size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-rose-600 border border-rose-300/90 text-[9px] font-mono font-black uppercase tracking-wider text-white">
                        OFFLINE
                      </span>
                      <span className="text-[9.5px] font-mono font-black uppercase tracking-wider text-rose-200">
                        DESABILITADO NO MOMENTO
                      </span>
                    </div>
                    <span className="block text-[10px] text-stone-200 line-clamp-2 mt-0.5">
                      {queues.tutorial.reason || 'Temporariamente desativado pelo administrador.'}
                    </span>
                  </div>
                </div>
              )}
              <ModeBackdropArt
                templateId="n_escolhido_estrelas"
                alt="Portal Tutorial Interativo"
                tintClass="bg-gradient-to-br from-emerald-900/50 via-teal-950/60 to-stone-950"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#05140e]/94 via-[#071c15]/84 to-[#082218]/55"
              />
              <div aria-hidden="true" className="pointer-events-none absolute top-0 inset-x-6 h-[2px] bg-gradient-to-r from-transparent via-emerald-300/85 to-transparent" />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-emerald-200/18 to-transparent animate-dial-sheen"
              />

              <div className="relative z-10 flex flex-col justify-between h-full min-w-0">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-serif font-bold uppercase tracking-[0.2em] text-emerald-300/95">
                      Aprenda na Prática
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-black uppercase ${
                        playerState?.tutorialRewardClaimed
                          ? 'bg-stone-800/90 text-stone-300 border border-stone-600/70'
                          : 'bg-amber-500/25 text-amber-200 border border-amber-400/60'
                      }`}
                    >
                      <Coins size={9} />
                      {playerState?.tutorialRewardClaimed ? '250 Ouro Resgatado' : '+250 Ouro (1x)'}
                    </span>
                  </div>
                  <h3
                    className={`font-serif font-black uppercase tracking-[0.1em] text-transparent bg-clip-text bg-gradient-to-b from-white via-emerald-100 to-amber-300 leading-tight mt-0.5 ${
                      isCompactLandscape ? 'text-xs' : 'text-lg sm:text-xl'
                    }`}
                  >
                    Tutorial Interativo
                  </h3>
                  <p className={`${isCompactLandscape ? 'text-[9.5px]' : 'text-[11px] mt-0.5'} text-stone-300/90 leading-snug`}>
                    Treinamento prático obrigatório em 7 passos com prêmio de 250 Ouro.
                  </p>
                </div>

                <div className="mt-1.5 flex items-center gap-1 text-[10.5px] font-serif font-bold uppercase tracking-widest text-emerald-200 group-hover:text-amber-200 transition-colors">
                  <span>Iniciar Treinamento</span>
                  <ChevronRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Sculpted Octagonal Academy Emblem */}
              <div className="relative z-10 shrink-0 flex items-center justify-center">
                <div aria-hidden="true" className="pointer-events-none absolute -inset-2 rounded-full bg-emerald-400/28 blur-lg group-hover:bg-amber-400/35 transition-colors" />
                <svg
                  viewBox="0 0 80 80"
                  aria-hidden="true"
                  className={`pointer-events-none absolute animate-dial-orbit-reverse opacity-70 ${
                    isCompactLandscape ? 'w-12 h-12' : 'w-16 h-16'
                  }`}
                >
                  <circle cx="40" cy="40" r="35" fill="none" stroke="#34d399" strokeWidth="1.1" strokeDasharray="6 5" />
                </svg>
                <div
                  className={`relative bg-gradient-to-br from-emerald-200 via-emerald-500 to-amber-700 p-[2px] shadow-[0_0_20px_rgba(16,185,129,0.5)] group-hover:scale-110 transition-transform duration-300 ${
                    isCompactLandscape ? 'w-10 h-10' : 'w-12 h-12 sm:w-14 sm:h-14'
                  }`}
                  style={{
                    clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                  }}
                >
                  <div
                    className="w-full h-full bg-gradient-to-br from-[#0c3123] via-[#071f17] to-[#040f0c] flex items-center justify-center"
                    style={{
                      clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                    }}
                  >
                    <GraduationCap
                      size={isCompactLandscape ? 17 : 23}
                      className="text-emerald-200 drop-shadow-[0_0_10px_rgba(52,211,153,0.95)]"
                    />
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* FOOTER: SCULPTED DECK RELIQUARY DOCK                           */}
        {/* ============================================================== */}
        <footer
          className={`relative z-20 w-full flex flex-row flex-wrap items-center justify-between gap-2.5 sm:gap-4 rounded-2xl bg-gradient-to-r from-[#0c0a1a]/95 via-stone-950/95 to-[#0b1324]/95 border-[1.5px] border-amber-500/40 shadow-[0_10px_34px_rgba(0,0,0,0.85)] shrink-0 ${
            isCompactLandscape ? 'px-3 py-1.5' : 'px-4 py-3'
          }`}
        >
          {/* Left: Active Deck Relic Readout */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`rounded-xl bg-gradient-to-br from-amber-500/25 via-indigo-950 to-stone-950 border border-amber-400/60 flex items-center justify-center shadow-[0_0_14px_rgba(245,158,11,0.28)] shrink-0 ${
                isCompactLandscape ? 'w-8 h-8' : 'w-10 h-10'
              }`}
            >
              <Shield size={isCompactLandscape ? 15 : 18} className="text-amber-300" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-serif font-bold uppercase tracking-[0.18em] text-stone-400 leading-none">
                Baralho Selecionado
              </span>
              <span className="text-xs sm:text-sm font-serif font-black text-amber-100 truncate max-w-[180px] sm:max-w-[300px] mt-0.5">
                {activeDeckName}
              </span>
            </div>
          </div>

          {/* Right: Trocar Deck & Montar Deck Controls */}
          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            <button
              type="button"
              onClick={() => {
                sound.playDraw();
                onOpenDeckSelector();
              }}
              className="min-h-[44px] py-2 px-3.5 sm:px-5 rounded-xl bg-stone-900/95 hover:bg-stone-800 border-[1.5px] border-stone-600/90 hover:border-amber-400/80 text-amber-100 font-serif font-bold text-[11px] sm:text-xs uppercase tracking-[0.14em] shadow-md transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <Layers size={14} className="text-amber-400 shrink-0" />
              <span>Trocar Deck</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playSummon();
                onOpenDeckBuilder();
              }}
              className="group relative min-h-[44px] py-2 px-4 sm:px-6 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-stone-950 font-serif font-black text-[11px] sm:text-xs uppercase tracking-[0.16em] shadow-[0_6px_22px_rgba(245,158,11,0.42)] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
              style={{
                clipPath: 'polygon(10px 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 10px 100%, 0% 50%)',
              }}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-white/45 to-transparent animate-play-portal-sheen"
              />
              <Sparkles size={14} className="relative z-10 text-stone-950 shrink-0" />
              <span className="relative z-10">Montar Deck</span>
            </button>
          </div>
        </footer>

        {/* ============================================================== */}
        {/* INTERACTIVE TUTORIAL INTRO MODAL (PREVIEW + START CTA)         */}
        {/* ============================================================== */}
        {isTutorialIntroOpen && (
          <div
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/82 backdrop-blur-md p-3 sm:p-6"
            onClick={() => setIsTutorialIntroOpen(false)}
          >
            <div
              className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl border-[1.5px] border-emerald-400/70 bg-gradient-to-b from-[#0b1f1a] via-[#080f18] to-[#05080f] p-4 sm:p-6 shadow-[0_20px_70px_rgba(0,0,0,0.95),0_0_40px_rgba(16,185,129,0.2)] text-stone-200 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-0 inset-x-10 h-[2px] bg-gradient-to-r from-transparent via-emerald-300 to-transparent"
              />

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-950/90 border border-emerald-400/55 flex items-center justify-center text-emerald-300 shrink-0 shadow-[0_0_18px_rgba(16,185,129,0.3)]">
                    <GraduationCap size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] font-serif font-bold uppercase tracking-[0.2em] text-emerald-300">
                      Academia Celestial · 7 Passos
                    </span>
                    <h3 className="text-lg sm:text-xl font-serif font-black text-amber-100 leading-tight">
                      Tutorial Interativo de Combate
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTutorialIntroOpen(false)}
                  className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 cursor-pointer"
                  aria-label="Fechar introdução do tutorial"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-stone-300 leading-relaxed">
                Treine diretamente no campo de batalha contra o <strong className="text-emerald-300">Instrutor Celentia</strong>. Cada etapa exige a ação correta (sem pular) para garantir que você domine todas as mecânicas reais do duelo!
              </p>

              <div
                className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-xs ${
                  playerState?.tutorialRewardClaimed
                    ? 'bg-stone-900/75 border-stone-700 text-stone-300'
                    : 'bg-amber-500/15 border-amber-400/55 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.18)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Coins size={16} className="text-amber-300 shrink-0" />
                  <div>
                    <span className="font-serif font-black uppercase tracking-wider block text-[11px]">
                      {playerState?.tutorialRewardClaimed
                        ? 'Recompensa de Conclusão Já Resgatada'
                        : 'Recompensa de Conclusão: +250 Ouro'}
                    </span>
                    <span className="text-[10px] text-stone-300">
                      {playerState?.tutorialRewardClaimed
                        ? 'Você pode refazer o treinamento sempre que quiser (prêmio único de 250 Ouro já recebido).'
                        : 'Vença a partida do Tutorial para resgatar 250 Ouro (resgatável 1 vez por conta).'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {[
                  '1. Barra Esquerda: Tiers, Rodada, Turno, Função e Moeda',
                  '2. Baralho & Compra Automática por Rodada',
                  '3. Mão, Hover, Invocação (2/rodada) & Habilidades',
                  '4. Mesa: Prática Real de Ataque e Defesa',
                  '5. Vida do Líder (5 PV & Dano Direto)',
                  '6. Botão Central: Atacar, Defender e Passar a Vez',
                  '7. Conclua a Partida contra o Instrutor (+250 Ouro)',
                ].map((label) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-black/45 border border-emerald-500/20 text-stone-200"
                  >
                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    sound.playDraw();
                    setIsTutorialIntroOpen(false);
                  }}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 font-serif font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Voltar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playSummon();
                    setIsTutorialIntroOpen(false);
                    onStartTutorial();
                  }}
                  className="min-h-[42px] px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 hover:brightness-110 text-stone-950 font-serif font-black text-xs uppercase tracking-[0.14em] shadow-[0_6px_24px_rgba(16,185,129,0.45)] cursor-pointer flex items-center gap-2"
                >
                  <Play size={14} className="fill-stone-950" />
                  <span>Iniciar Treinamento</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
