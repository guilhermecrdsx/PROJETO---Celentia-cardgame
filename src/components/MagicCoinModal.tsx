import React, { useState } from 'react';
import { Sun, Moon, Sparkles, Swords, Shield } from 'lucide-react';
import { sound } from '../services/soundEffects';

interface MagicCoinModalProps {
  isOpen: boolean;
  onCoinResolved: (winner: 'player' | 'opponent', chosenSide?: 'sol' | 'lua') => void;
}

export const MagicCoinModal: React.FC<MagicCoinModalProps> = ({
  isOpen,
  onCoinResolved,
}) => {
  const [selectedSide, setSelectedSide] = useState<'sol' | 'lua' | null>(null);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [resultSide, setResultSide] = useState<'sol' | 'lua' | null>(null);
  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setSelectedSide(null);
      setIsFlipping(false);
      setResultSide(null);
      setWinner(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectSide = (side: 'sol' | 'lua') => {
    if (selectedSide || isFlipping) return;
    setSelectedSide(side);
    setIsFlipping(true);
    sound.playSpell();

    const winningFace: 'sol' | 'lua' = Math.random() < 0.5 ? 'sol' : 'lua';

    setTimeout(() => {
      setResultSide(winningFace);
      setIsFlipping(false);
      const isPlayerWinner = side === winningFace;
      const winnerResult = isPlayerWinner ? 'player' : 'opponent';
      setWinner(winnerResult);

      if (isPlayerWinner) {
        sound.playVictory();
      } else {
        sound.playAttackDeclare();
      }

      setTimeout(() => {
        onCoinResolved(winnerResult, side);
      }, 2800);
    }, 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg max-h-[94dvh] overflow-y-auto rounded-3xl border-2 border-amber-500/70 bg-gradient-to-b from-stone-950 via-indigo-950/80 to-stone-950 p-5 sm:p-7 text-center shadow-[0_0_60px_rgba(245,158,11,0.4)] flex flex-col items-center select-none">
        {/* Glow halo */}
        <div className="absolute -top-16 w-48 h-48 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black tracking-widest uppercase mb-2">
          <Sparkles size={14} /> Sorteio de Iniciativa Cósmica <Sparkles size={14} />
        </div>

        <h2 className="text-2xl md:text-3xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400">
          A Moeda Mágica
        </h2>

        <p className="text-xs text-stone-300 mt-1 max-w-sm">
          {!selectedSide
            ? 'Escolha uma face da moeda para disputar quem desfere o primeiro ataque na Rodada 1!'
            : isFlipping
            ? 'A Moeda Mágica gira no vazio celestial...'
            : winner === 'player'
            ? '✨ Você venceu o sorteio e é o Atacante da Rodada 1!'
            : '🛡️ O adversário venceu o sorteio e é o Atacante da Rodada 1!'}
        </p>

        {/* 3D Coin Stage */}
        <div className="my-8 relative w-40 h-40 flex items-center justify-center" style={{ perspective: '1000px' }}>
          <div
            className={`w-36 h-36 rounded-full border-4 shadow-2xl flex items-center justify-center relative transition-all duration-700 ${
              isFlipping
                ? 'animate-[spin_0.22s_linear_infinite] border-amber-400 bg-gradient-to-br from-amber-400 via-yellow-600 to-amber-700 shadow-[0_0_50px_rgba(251,191,36,0.8)]'
                : resultSide === 'sol'
                ? 'border-yellow-400 bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-600 shadow-[0_0_40px_rgba(234,179,8,0.7)]'
                : resultSide === 'lua'
                ? 'border-indigo-400 bg-gradient-to-br from-indigo-400 via-blue-600 to-indigo-800 shadow-[0_0_40px_rgba(99,102,241,0.7)]'
                : 'border-amber-500/60 bg-gradient-to-br from-stone-800 via-amber-950/60 to-stone-900 shadow-xl'
            }`}
          >
            {isFlipping ? (
              <div className="text-4xl text-amber-200 animate-pulse">✨</div>
            ) : resultSide === 'sol' ? (
              <div className="flex flex-col items-center text-yellow-950">
                <Sun size={48} className="text-yellow-100 drop-shadow" />
                <span className="text-xs font-black tracking-widest mt-1 uppercase text-yellow-100">SOL</span>
              </div>
            ) : resultSide === 'lua' ? (
              <div className="flex flex-col items-center text-indigo-100">
                <Moon size={48} className="text-indigo-200 drop-shadow" />
                <span className="text-xs font-black tracking-widest mt-1 uppercase text-indigo-200">LUA</span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-amber-300/80">
                <div className="flex items-center gap-1 text-2xl">
                  <Sun size={26} className="text-amber-400" />
                  <span className="text-stone-400">/</span>
                  <Moon size={26} className="text-blue-300" />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 mt-1">
                  Sol ou Lua?
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Choice buttons */}
        {!selectedSide ? (
          <div className="flex items-center gap-4 w-full justify-center">
            <button
              onClick={() => handleSelectSide('sol')}
              className="flex-1 max-w-[170px] py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-stone-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sun size={18} /> Escolher Sol
            </button>
            <button
              onClick={() => handleSelectSide('lua')}
              className="flex-1 max-w-[170px] py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Moon size={18} /> Escolher Lua
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {winner ? (
              <div
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black uppercase tracking-wider shadow-xl ${
                  winner === 'player'
                    ? 'bg-rose-950/80 border border-amber-500 text-amber-300'
                    : 'bg-blue-950/80 border border-blue-400 text-blue-300'
                }`}
              >
                {winner === 'player' ? (
                  <>
                    <Swords size={18} className="text-rose-400" />
                    Você Ataca Primeiro!
                  </>
                ) : (
                  <>
                    <Shield size={18} className="text-blue-400" />
                    Você Defende Primeiro!
                  </>
                )}
              </div>
            ) : (
              <div className="text-xs font-semibold text-amber-300/80 animate-pulse">
                Sua aposta: <strong>{selectedSide === 'sol' ? 'SOL ☀️' : 'LUA 🌙'}</strong> · Lançando a moeda...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
