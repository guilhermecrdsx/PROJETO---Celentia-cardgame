import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Crown,
  Layers,
  LogOut,
  Shield,
  Swords,
} from 'lucide-react';
import { sound } from '../services/soundEffects';

export interface RematchPrepParticipant {
  nickname: string;
  subtitle: string;
  deckName: string;
  ready: boolean;
  isLocal: boolean;
}

interface RematchPrepModalProps {
  isOpen: boolean;
  modeLabel: string;
  isRanked?: boolean;
  roomCode?: string;
  deadlineAt: number;
  totalDurationSeconds?: number;
  localParticipant: RematchPrepParticipant;
  opponentParticipant: RematchPrepParticipant;
  onToggleReady: () => void;
  onOpenDeckSelector: () => void;
  onCancel: () => void;
  onTimerExpired?: () => void;
}

export const RematchPrepModal: React.FC<RematchPrepModalProps> = ({
  isOpen,
  modeLabel,
  isRanked = false,
  roomCode,
  deadlineAt,
  totalDurationSeconds = 30,
  localParticipant,
  opponentParticipant,
  onToggleReady,
  onOpenDeckSelector,
  onCancel,
  onTimerExpired,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(() =>
    Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000))
  );

  useEffect(() => {
    if (!isOpen) return;

    let expiredTriggered = false;
    let lastTickSecond: number | null = null;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 5 && remaining > 0 && remaining !== lastTickSecond) {
        lastTickSecond = remaining;
        sound.playTick();
      }
      if (remaining === 0 && !expiredTriggered) {
        expiredTriggered = true;
        onTimerExpired?.();
      }
    };

    tick();
    const interval = window.setInterval(tick, 500);
    return () => window.clearInterval(interval);
  }, [isOpen, deadlineAt, onTimerExpired]);

  if (!isOpen) return null;

  const progressPct = Math.max(
    0,
    Math.min(100, (secondsLeft / Math.max(1, totalDurationSeconds)) * 100)
  );
  const formattedTime = `00:${String(secondsLeft).padStart(2, '0')}`;
  const isUrgent = secondsLeft <= 7;

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[94dvh] flex flex-col rounded-2xl sm:rounded-3xl bg-slate-950 border-2 border-amber-500/60 shadow-[0_0_70px_rgba(0,0,0,0.95)] overflow-hidden text-stone-200">
        {/* Top Accent Rail */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-600 via-yellow-300 to-amber-600" />

        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-stone-800 bg-gradient-to-r from-stone-900 via-slate-950 to-stone-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-400/50 flex items-center justify-center shrink-0">
              {isRanked ? (
                <Crown size={20} className="text-amber-300" />
              ) : (
                <Swords size={20} className="text-amber-300" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-serif font-black tracking-wider text-amber-200 uppercase">
                  Preparação de Revanche
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-serif font-bold uppercase tracking-wider border ${
                    isRanked
                      ? 'bg-amber-500/15 text-amber-300 border-amber-400/50'
                      : 'bg-cyan-500/15 text-cyan-200 border-cyan-400/50'
                  }`}
                >
                  {modeLabel}
                </span>
                {roomCode && (
                  <span className="px-2 py-0.5 rounded-md bg-stone-900 border border-stone-700 font-mono text-[11px] font-bold text-stone-300 tracking-wider">
                    Sala {roomCode}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Ajuste seu baralho antes do duelo começar. A partida inicia assim que ambos confirmarem ou ao fim da contagem.
              </p>
            </div>
          </div>

          {/* Countdown Plaque */}
          <div
            className={`px-3.5 py-2 rounded-xl border flex items-center gap-2 shrink-0 transition-colors ${
              isUrgent
                ? 'bg-rose-950/80 border-rose-500/70 text-rose-200 animate-pulse'
                : 'bg-stone-900/90 border-amber-500/40 text-amber-200'
            }`}
          >
            <Clock size={16} className={isUrgent ? 'text-rose-400' : 'text-amber-400'} />
            <div className="text-right">
              <span className="block text-[9px] uppercase tracking-widest text-stone-400 leading-none">
                Início Forçado
              </span>
              <span className="font-mono font-black text-base sm:text-lg tabular-nums leading-tight">
                {formattedTime}
              </span>
            </div>
          </div>
        </div>

        {/* Countdown Progress Bar */}
        <div className="w-full h-1.5 bg-stone-900 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-linear ${
              isUrgent
                ? 'bg-gradient-to-r from-rose-600 to-amber-400'
                : 'bg-gradient-to-r from-amber-500 via-yellow-300 to-emerald-400'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Body: Duelists Deck Prep Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Local Player Card */}
            <div
              className={`rounded-2xl p-4 border-2 flex flex-col justify-between gap-3 transition-all ${
                localParticipant.ready
                  ? 'bg-emerald-950/25 border-emerald-400/70 shadow-[0_0_24px_rgba(16,185,129,0.2)]'
                  : 'bg-stone-900/90 border-amber-500/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-serif font-black uppercase tracking-widest text-amber-300">
                  Você · Seu Baralho
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-serif font-bold uppercase border ${
                    localParticipant.ready
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60'
                      : 'bg-stone-800 text-stone-300 border-stone-600'
                  }`}
                >
                  {localParticipant.ready ? 'Pronto' : 'Preparando'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-400/50 flex items-center justify-center shrink-0">
                  <Shield size={19} className="text-amber-300" />
                </div>
                <div className="min-w-0">
                  <p className="font-serif font-black text-base text-white truncate">
                    {localParticipant.nickname}
                  </p>
                  <p className="text-xs text-stone-400 truncate">
                    {localParticipant.subtitle}
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-stone-950/90 border border-stone-800 p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-wider text-stone-500 font-serif">
                    Deck Selecionado
                  </span>
                  <span className="text-xs sm:text-sm font-serif font-bold text-amber-200 truncate block">
                    {localParticipant.deckName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sound.playDraw();
                    onOpenDeckSelector();
                  }}
                  className="shrink-0 min-h-[38px] px-3 rounded-lg bg-stone-800 hover:bg-stone-700 border border-amber-500/45 text-amber-200 hover:text-white text-xs font-serif font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Layers size={13} />
                  <span>Trocar</span>
                </button>
              </div>
            </div>

            {/* Opponent Card */}
            <div
              className={`rounded-2xl p-4 border-2 flex flex-col justify-between gap-3 transition-all ${
                opponentParticipant.ready
                  ? 'bg-emerald-950/25 border-emerald-400/70 shadow-[0_0_24px_rgba(16,185,129,0.2)]'
                  : 'bg-stone-900/90 border-stone-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-serif font-black uppercase tracking-widest text-cyan-300">
                  Adversário
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-serif font-bold uppercase border ${
                    opponentParticipant.ready
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60'
                      : 'bg-stone-800 text-stone-400 border-stone-600'
                  }`}
                >
                  {opponentParticipant.ready ? 'Pronto' : 'Escolhendo Deck'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-400/50 flex items-center justify-center shrink-0">
                  <Swords size={19} className="text-cyan-300" />
                </div>
                <div className="min-w-0">
                  <p className="font-serif font-black text-base text-white truncate">
                    {opponentParticipant.nickname}
                  </p>
                  <p className="text-xs text-stone-400 truncate">
                    {opponentParticipant.subtitle}
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-stone-950/90 border border-stone-800 p-3">
                <span className="block text-[10px] uppercase tracking-wider text-stone-500 font-serif">
                  Deck do Adversário
                </span>
                <span className="text-xs sm:text-sm font-serif font-bold text-cyan-200 truncate block">
                  {opponentParticipant.deckName}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-stone-800 bg-stone-950/95 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              sound.playDiscard();
              onCancel();
            }}
            className="min-h-[44px] px-4 rounded-xl bg-stone-900 hover:bg-rose-950/80 border border-stone-700 hover:border-rose-500/60 text-stone-300 hover:text-rose-200 font-serif font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
          >
            <LogOut size={15} />
            <span>Cancelar Revanche</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playSummon();
              onToggleReady();
            }}
            className={`min-h-[44px] px-6 rounded-xl font-serif font-black text-xs sm:text-sm uppercase tracking-wider border-2 flex items-center gap-2 cursor-pointer transition-all ${
              localParticipant.ready
                ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-300 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 border-amber-200 text-stone-950 shadow-[0_0_24px_rgba(245,158,11,0.45)]'
            }`}
          >
            <CheckCircle2 size={17} />
            <span>
              {localParticipant.ready ? 'Pronto! (Cancelar)' : 'Estou Pronto'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
