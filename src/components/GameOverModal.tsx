import React, { useEffect } from 'react';
import {
  Trophy,
  Skull,
  Scale,
  Home,
  Sparkles,
  Flame,
  Swords,
  TrendingUp,
  TrendingDown,
  Crown,
  ShieldAlert,
  DoorOpen,
  Check,
  X,
  Loader2,
  Lock,
  Coins,
  GraduationCap,
} from 'lucide-react';
import { sound } from '../services/soundEffects';
import { getRankInfo } from '../utils/rankSystem';
import { useRankPolicy } from '../services/rankPolicyService';
import { useCloudPlayerState } from '../services/accountApi';

export type RematchRequestStatus = 'idle' | 'requested' | 'declined';

interface GameOverModalProps {
  isOpen: boolean;
  winner: 'player' | 'opponent' | 'draw';
  playerHp: number;
  opponentHp: number;
  totalRounds: number;
  reason?: string;
  matchType?: 'normal' | 'ranked';
  rankDelta?: number | null;
  currentRankPoints?: number;
  isOnlinePvp?: boolean;
  isTutorialMode?: boolean;
  tutorialRewardResult?: { claimedNow: boolean; goldAwarded: number } | null;
  rematchStatus?: RematchRequestStatus;
  rematchStatusMessage?: string | null;
  incomingRematchFrom?: string | null;
  onRequestRematch: () => void;
  onRespondRematch?: (accept: boolean) => void;
  onGoToLobby: () => void;
  onHome: () => void;
}

const VICTORY_SPARK_POSITIONS = [
  'left-[10%] bottom-[15%]',
  'left-[18%] bottom-[28%]',
  'left-[26%] bottom-[18%]',
  'left-[34%] bottom-[35%]',
  'left-[42%] bottom-[22%]',
  'left-[50%] bottom-[14%]',
  'left-[58%] bottom-[30%]',
  'left-[66%] bottom-[20%]',
  'left-[74%] bottom-[36%]',
  'left-[82%] bottom-[16%]',
  'left-[88%] bottom-[26%]',
  'left-[92%] bottom-[18%]',
];

const DEFEAT_EMBER_POSITIONS = [
  'left-[12%] bottom-[16%]',
  'left-[22%] bottom-[26%]',
  'left-[31%] bottom-[19%]',
  'left-[40%] bottom-[32%]',
  'left-[49%] bottom-[15%]',
  'left-[59%] bottom-[28%]',
  'left-[68%] bottom-[21%]',
  'left-[77%] bottom-[34%]',
  'left-[85%] bottom-[18%]',
  'left-[91%] bottom-[25%]',
];

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  winner,
  playerHp,
  opponentHp,
  totalRounds,
  reason,
  matchType = 'normal',
  rankDelta = null,
  currentRankPoints = 0,
  isOnlinePvp = false,
  isTutorialMode = false,
  tutorialRewardResult = null,
  rematchStatus = 'idle',
  rematchStatusMessage = null,
  incomingRematchFrom = null,
  onRequestRematch,
  onRespondRematch,
  onGoToLobby,
  onHome,
}) => {
  const { rankPolicy } = useRankPolicy();
  const { playerState } = useCloudPlayerState();

  useEffect(() => {
    if (isOpen) {
      if (winner === 'player') {
        sound.playVictory();
      } else if (winner === 'opponent') {
        sound.playDefeat();
      } else {
        sound.playDrawGame();
      }
    }
  }, [isOpen, winner]);

  if (!isOpen) return null;

  const isPlayerWinner = winner === 'player';
  const isDraw = winner === 'draw';
  const isCelestialCouncil = Boolean(reason && reason.includes('Vitória do Conselho Celestial'));

  const effectiveRankDelta =
    matchType === 'ranked' && playerState?.rankBlockedTotal ? 0 : rankDelta;
  const rankInfo = getRankInfo(currentRankPoints, {
    globalBlockedFromTier: rankPolicy.blockedFromTier,
    playerBlockedTotal: playerState?.rankBlockedTotal,
    playerBlockedFromTier: playerState?.rankBlockFromTier,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-300 select-none overflow-y-auto">
      {/* Ambient Radial Lighting */}
      <div
        className={`absolute -inset-40 pointer-events-none transition-all duration-1000 ${
          isPlayerWinner
            ? 'bg-radial from-amber-500/35 via-yellow-900/15 to-transparent blur-3xl'
            : isDraw
            ? 'bg-radial from-purple-500/30 via-sky-900/15 to-transparent blur-3xl'
            : 'bg-radial from-rose-600/35 via-red-950/20 to-transparent blur-3xl'
        }`}
      />

      {/* Cinematic Background Rays & Floating Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {isPlayerWinner && (
          <>
            {/* Spinning Golden Sunburst Rays */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] pointer-events-none animate-victory-sunburst opacity-45">
              <svg viewBox="0 0 100 100" className="w-full h-full text-amber-400/35 fill-current">
                <polygon points="50,0 55,40 95,20 60,50 95,80 55,60 50,100 45,60 5,80 40,50 5,20 45,40" />
              </svg>
            </div>
            {/* Expanding Golden Shockwave Ring */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border-4 border-amber-300/60 animate-levelup-shockwave" />
            {/* Golden Sparks */}
            {VICTORY_SPARK_POSITIONS.map((pos, i) => (
              <div
                key={i}
                className={`absolute w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_12px_#fbbf24] animate-particle-float ${pos}`}
              />
            ))}
          </>
        )}

        {!isPlayerWinner && !isDraw && (
          <>
            {/* Shattered Crimson Shockwave */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border-4 border-rose-500/60 animate-levelup-shockwave" />
            {/* Crimson Embers */}
            {DEFEAT_EMBER_POSITIONS.map((pos, i) => (
              <div
                key={i}
                className={`absolute w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_14px_#e11d48] animate-particle-float ${pos}`}
              />
            ))}
          </>
        )}

        {isDraw && (
          <>
            {DEFEAT_EMBER_POSITIONS.map((pos, i) => (
              <div
                key={i}
                className={`absolute w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_12px_#38bdf8] animate-particle-float ${pos}`}
              />
            ))}
          </>
        )}
      </div>

      {/* Main Modal Card */}
      <div
        className={`relative my-auto w-full max-w-md max-h-[94dvh] overflow-y-auto rounded-3xl border-2 transition-all p-5 sm:p-6 text-center text-stone-200 shadow-2xl flex flex-col items-center ${
          isPlayerWinner
            ? 'border-amber-400 bg-gradient-to-b from-amber-950/95 via-stone-950/95 to-black shadow-[0_0_70px_rgba(245,158,11,0.45)] animate-in zoom-in-90 duration-300'
            : isDraw
            ? 'border-purple-400/80 bg-gradient-to-b from-purple-950/95 via-stone-950/95 to-black shadow-purple-500/30'
            : 'border-rose-600 bg-gradient-to-b from-rose-950/95 via-stone-950/95 to-black shadow-[0_0_70px_rgba(225,29,72,0.45)] animate-defeat-impact'
        }`}
      >
        {/* Top Ornamental Line */}
        <div
          className={`w-36 h-1 rounded-full mb-4 ${
            isPlayerWinner
              ? 'bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_12px_#fbbf24]'
              : isDraw
              ? 'bg-gradient-to-r from-transparent via-purple-400 to-transparent'
              : 'bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_#f43f5e]'
          }`}
        />

        {/* Animated Main Heraldic Crest */}
        <div className="relative mb-3 flex items-center justify-center">
          <div
            className={`absolute -inset-4 rounded-full blur-xl opacity-80 ${
              isPlayerWinner
                ? 'bg-amber-400 animate-pulse'
                : isDraw
                ? 'bg-purple-500 animate-pulse'
                : 'bg-rose-600 animate-pulse'
            }`}
          />

          <div
            className={`relative w-24 h-24 rounded-3xl flex items-center justify-center border-2 ${
              isPlayerWinner
                ? 'bg-gradient-to-br from-amber-300/35 via-yellow-600/25 to-stone-950 border-amber-200 text-amber-300 shadow-[0_0_45px_rgba(245,158,11,0.75)] animate-victory-badge'
                : isDraw
                ? 'bg-gradient-to-br from-purple-500/30 to-sky-600/20 border-purple-300 text-purple-300 shadow-[0_0_40px_rgba(168,85,247,0.6)] animate-draw-balance'
                : 'bg-gradient-to-br from-rose-600/35 via-red-950/50 to-stone-950 border-rose-400 text-rose-400 shadow-[0_0_45px_rgba(225,29,72,0.75)]'
            }`}
          >
            {isPlayerWinner ? (
              isCelestialCouncil ? (
                <div className="relative flex flex-col items-center">
                  <Crown size={18} className="text-yellow-100 -mb-0.5 animate-bounce" />
                  <span className="text-3xl leading-none drop-shadow-[0_0_16px_rgba(253,224,71,0.95)]">
                    👼
                  </span>
                </div>
              ) : (
                <div className="relative flex flex-col items-center">
                  <Crown size={18} className="text-yellow-200 -mb-1 animate-bounce" />
                  <Trophy size={40} className="drop-shadow-[0_0_14px_rgba(251,191,36,0.95)]" />
                </div>
              )
            ) : isDraw ? (
              <Scale size={44} className="drop-shadow-[0_0_12px_rgba(168,85,247,0.9)]" />
            ) : (
              <div className="relative flex flex-col items-center">
                <ShieldAlert size={16} className="text-rose-300 -mb-1 animate-pulse" />
                <Skull size={40} className="drop-shadow-[0_0_14px_rgba(225,29,72,0.95)]" />
              </div>
            )}
          </div>
        </div>

        {/* Status Tag Badge */}
        <div
          className={`inline-flex items-center gap-1.5 px-3.5 py-0.5 rounded-full text-xs font-black tracking-widest uppercase mb-1.5 border ${
            isPlayerWinner
              ? 'bg-amber-500/20 text-amber-200 border-amber-300/70 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
              : isDraw
              ? 'bg-purple-500/20 text-purple-300 border-purple-400/60 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
              : 'bg-rose-600/20 text-rose-300 border-rose-500/70 shadow-[0_0_15px_rgba(225,29,72,0.4)]'
          }`}
        >
          {isCelestialCouncil ? (
            <>
              <Sparkles size={12} className="animate-spin-slow" /> 🪽 Aliança Angiris Suprema
            </>
          ) : isPlayerWinner ? (
            <>
              <Sparkles size={12} className="animate-spin-slow" /> Barra de Vida Inimiga Destruída
            </>
          ) : isDraw ? (
            <>
              <Swords size={12} /> Duelo Lendário
            </>
          ) : (
            <>
              <Flame size={12} /> Sua Barra de Vida Explodiu
            </>
          )}
        </div>

        {/* Main Title Header */}
        <h2
          className={`text-3xl md:text-4xl font-serif font-black tracking-wider uppercase ${
            isPlayerWinner
              ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-yellow-300 to-amber-400 drop-shadow-[0_2px_14px_rgba(245,158,11,0.65)]'
              : isDraw
              ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-sky-300 to-indigo-200 drop-shadow-[0_2px_10px_rgba(168,85,247,0.5)]'
              : 'text-transparent bg-clip-text bg-gradient-to-r from-rose-200 via-rose-500 to-red-500 drop-shadow-[0_2px_14px_rgba(225,29,72,0.65)]'
          }`}
        >
          {isCelestialCouncil
            ? isPlayerWinner
              ? 'Vitória Celestial!'
              : 'Derrota Celestial'
            : isPlayerWinner
            ? 'Vitória!'
            : isDraw
            ? 'Empate Honroso!'
            : 'Derrota!'}
        </h2>

        {/* Narrative Description / End Reason */}
        <p className="mt-2 text-xs text-stone-300 max-w-sm leading-relaxed px-1">
          {reason
            ? reason
            : isPlayerWinner
            ? 'A barra de vida do adversário entrou em colapso e explodiu! A vitória é sua!'
            : isDraw
            ? 'Ambos os líderes duelaram até a última consequência e seus destinos encerraram em equilíbrio cósmico perfeito.'
            : 'Sua barra de vida sofreu sobrecarga crítica e explodiu no campo de batalha.'}
        </p>

        {/* RANKED PROGRESS CARD (IF RANKED MODE) */}
        {matchType === 'ranked' ? (
          <div className="mt-3.5 mb-2 w-full p-3 rounded-2xl bg-gradient-to-r from-stone-900 via-stone-900/90 to-black border border-amber-500/40 shadow-lg">
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl shrink-0">{rankInfo.icon}</span>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black uppercase text-amber-300">
                      Rank {rankInfo.label}
                    </span>
                    {(rankInfo.isCapped || rankInfo.isTotallyBlocked) && (
                      <Lock size={11} className="text-amber-300 shrink-0" />
                    )}
                    <span className="text-[10px] text-stone-400 font-mono tabular-nums">
                      ({rankInfo.totalPoints} RP Total)
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-400 block truncate">
                    {rankInfo.description}
                  </span>
                </div>
              </div>

              {effectiveRankDelta !== null && (
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold text-xs shrink-0 tabular-nums ${
                    rankInfo.isTotallyBlocked
                      ? 'bg-rose-950/70 text-rose-200 border border-rose-500/50'
                      : effectiveRankDelta > 0
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      : effectiveRankDelta < 0
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-500/50'
                      : 'bg-stone-800 text-stone-300'
                  }`}
                >
                  {rankInfo.isTotallyBlocked ? (
                    <Lock size={12} className="text-rose-300" />
                  ) : effectiveRankDelta > 0 ? (
                    <TrendingUp size={13} className="text-emerald-400" />
                  ) : (
                    <TrendingDown size={13} className="text-rose-400" />
                  )}
                  {effectiveRankDelta > 0 ? `+${effectiveRankDelta}` : effectiveRankDelta} RP
                </div>
              )}
            </div>

            {rankInfo.isTotallyBlocked && (
              <div className="mb-1.5 px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/40 text-[10px] text-rose-200 text-left flex items-center gap-1.5">
                <Lock size={11} className="shrink-0" />
                <span>Sua progressão de rank está congelada pelo administrador (0 RP aplicado).</span>
              </div>
            )}

            {rankInfo.isCapped && !rankInfo.isTotallyBlocked && (
              <div className="mb-1.5 px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-500/40 text-[10px] text-amber-200 text-left flex items-center gap-1.5">
                <Lock size={11} className="shrink-0" />
                <span>
                  Teto em {rankInfo.label}: pontos continuam acumulando ({rankInfo.totalPoints} RP · Real: {rankInfo.rawLabel}).
                </span>
              </div>
            )}

            {/* Rank Progress Bar */}
            <div className="w-full">
              <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 mb-1">
                <span>
                  {rankInfo.isCapped
                    ? `Bloqueado antes de ${rankInfo.effectiveBlockedFromTier}`
                    : rankInfo.nextLabel
                    ? `Progresso para ${rankInfo.nextLabel}`
                    : 'Elo Celestial I Máximo'}
                </span>
                <span className="text-amber-300 font-bold tabular-nums">
                  {rankInfo.nextLabel ? `${rankInfo.pointsInDivision} / 100 RP` : `${rankInfo.pointsInDivision} pts`}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-stone-950 border border-white/10 overflow-hidden p-0.5 flex gap-0.5">
                {Array.from({ length: 10 }).map((_, segIdx) => {
                  const isFilled = rankInfo.progressPercent >= (segIdx + 1) * 10;
                  return (
                    <div
                      key={segIdx}
                      className={`flex-1 h-full rounded-xs transition-all duration-700 ${
                        isFilled
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-300 shadow-[0_0_6px_#f59e0b]'
                          : 'bg-stone-800/60'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        ) : isTutorialMode ? (
          <div
            className={`mt-3.5 mb-2 w-full p-3 rounded-2xl border flex items-center gap-3 text-left ${
              isPlayerWinner && tutorialRewardResult?.claimedNow
                ? 'bg-gradient-to-r from-amber-950/85 via-emerald-950/75 to-stone-950 border-amber-400/70 shadow-[0_0_24px_rgba(245,158,11,0.3)]'
                : 'bg-emerald-950/45 border-emerald-500/40'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/60 flex items-center justify-center shrink-0">
              {isPlayerWinner && tutorialRewardResult?.claimedNow ? (
                <Coins size={20} className="text-amber-300" />
              ) : (
                <GraduationCap size={20} className="text-emerald-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-serif font-black uppercase tracking-wider text-amber-200">
                {isPlayerWinner
                  ? tutorialRewardResult?.claimedNow
                    ? `Tutorial Concluído! +${tutorialRewardResult.goldAwarded} Ouro`
                    : 'Tutorial Concluído!'
                  : 'Treinamento Interativo'}
              </span>
              <span className="block text-[11px] text-stone-300 mt-0.5">
                {isPlayerWinner
                  ? tutorialRewardResult?.claimedNow
                    ? '250 Ouro foram creditados na sua conta pela conclusão do treinamento.'
                    : 'Você completou o treinamento! (Prêmio único de 250 Ouro já resgatado anteriormente.)'
                  : 'Tente novamente para concluir o treinamento e garantir seus 250 Ouro.'}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-3.5 mb-2 w-full py-1.5 px-3 rounded-xl bg-stone-900/60 border border-white/5 flex items-center justify-between text-xs text-stone-400">
            <span>Modo Normal (Casual)</span>
            <span className="text-[11px] text-stone-500 font-mono">Sem pontuação de Rank</span>
          </div>
        )}

        {/* Battle Stats Cards */}
        <div className="my-3 w-full p-3 rounded-2xl bg-stone-900/80 border border-white/10 grid grid-cols-3 gap-2 text-center text-xs shadow-inner">
          <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-black/40 border border-white/5">
            <span className="text-[10px] text-stone-400 block uppercase font-mono">Rodadas</span>
            <span className="text-lg font-mono font-black text-amber-300">{totalRounds}</span>
          </div>
          <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-black/40 border border-white/5">
            <span className="text-[10px] text-stone-400 block uppercase font-mono">Sua Vida</span>
            <span className={`text-lg font-mono font-black ${playerHp > 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
              {playerHp} HP
            </span>
          </div>
          <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-black/40 border border-white/5">
            <span className="text-[10px] text-stone-400 block uppercase font-mono">Vida Inimiga</span>
            <span className={`text-lg font-mono font-black ${opponentHp > 0 ? 'text-amber-400' : 'text-rose-500'}`}>
              {opponentHp} HP
            </span>
          </div>
        </div>

        {/* Incoming Rematch Challenge Notification (Visible to the Winner in Online PvP) */}
        {incomingRematchFrom && onRespondRematch && (
          <div className="w-full mb-3 p-3.5 rounded-2xl bg-gradient-to-b from-amber-950/90 via-stone-900 to-stone-950 border-2 border-amber-400/80 shadow-[0_0_28px_rgba(245,158,11,0.35)] text-left animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-amber-300 font-serif font-black text-xs uppercase tracking-wider mb-1">
              <Swords size={15} className="text-amber-400 animate-pulse" />
              <span>Pedido de Revanche!</span>
            </div>
            <p className="text-xs text-stone-200 leading-relaxed mb-3">
              <strong className="text-amber-200">{incomingRematchFrom}</strong> desafiou você para uma revanche. Você concorda em duelar novamente?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  sound.playSummon();
                  onRespondRematch(true);
                }}
                className="min-h-[40px] py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-stone-950 font-serif font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg cursor-pointer transition-all"
              >
                <Check size={15} /> Aceitar
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playDiscard();
                  onRespondRematch(false);
                }}
                className="min-h-[40px] py-2 px-3 rounded-xl bg-stone-800 hover:bg-rose-950/90 border border-stone-600 hover:border-rose-500/70 text-stone-200 hover:text-rose-200 font-serif font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <X size={15} /> Recusar
              </button>
            </div>
          </div>
        )}

        {/* Rematch Feedback Banner (for requester or declined state) */}
        {rematchStatus === 'requested' && (
          <div className="w-full mb-3 px-3.5 py-2.5 rounded-xl bg-amber-950/50 border border-amber-400/50 text-amber-200 text-xs flex items-center justify-center gap-2">
            <Loader2 size={14} className="animate-spin text-amber-300 shrink-0" />
            <span>Pedido de revanche enviado. Aguardando resposta do adversário...</span>
          </div>
        )}

        {rematchStatus === 'declined' && rematchStatusMessage && (
          <div className="w-full mb-3 px-3.5 py-2.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs text-center">
            {rematchStatusMessage}
          </div>
        )}

        {/* Action Buttons: Revanche (Loser Only), Ir para Preparação de Salas, Início */}
        {(() => {
          const isLoser = winner === 'opponent';
          const canClickRematch = isLoser && rematchStatus === 'idle';
          return (
            <div className="flex flex-col gap-2.5 w-full mt-1">
              <button
                type="button"
                disabled={!canClickRematch}
                onClick={() => {
                  if (!canClickRematch) return;
                  sound.playSummon();
                  onRequestRematch();
                }}
                className={`w-full min-h-[44px] py-3 px-4 rounded-xl font-serif font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border ${
                  canClickRematch
                    ? 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 border-amber-300/70 text-white shadow-lg shadow-rose-600/35 cursor-pointer active:scale-[0.98]'
                    : 'bg-stone-900/90 border-stone-700/80 text-stone-500 cursor-not-allowed'
                }`}
                title={
                  isLoser
                    ? rematchStatus === 'requested'
                      ? 'Aguardando resposta do adversário...'
                      : rematchStatus === 'declined'
                      ? 'Revanche indisponível'
                      : 'Solicitar Revanche ao adversário'
                    : 'Apenas o jogador derrotado pode acionar a revanche'
                }
              >
                {rematchStatus === 'requested' ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Aguardando Resposta da Revanche...</span>
                  </>
                ) : (
                  <>
                    <Swords size={15} />
                    <span>Revanche</span>
                  </>
                )}
              </button>

              {!isLoser && !incomingRematchFrom && (
                <p className="text-[11px] text-stone-400 leading-tight -mt-1">
                  {isOnlinePvp
                    ? 'Apenas o jogador derrotado pode solicitar revanche. Se ele desafiar, você será notificado aqui.'
                    : 'Apenas o jogador derrotado pode acionar a revanche.'}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                <button
                  type="button"
                  onClick={() => {
                    sound.playDraw();
                    onGoToLobby();
                  }}
                  className="min-h-[44px] py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 border border-amber-500/45 hover:border-amber-300 text-amber-200 hover:text-white font-serif font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                  title="Ir diretamente para a tela de preparação de salas"
                >
                  <DoorOpen size={15} className="text-amber-400 shrink-0" />
                  <span>Preparação de Salas</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playDraw();
                    onHome();
                  }}
                  className="min-h-[44px] py-2.5 px-3 rounded-xl bg-stone-800/90 hover:bg-stone-700 text-stone-200 font-serif font-bold text-xs uppercase tracking-wider transition-colors border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                  title="Voltar ao Menu Inicial"
                >
                  <Home size={15} />
                  <span>Início</span>
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
