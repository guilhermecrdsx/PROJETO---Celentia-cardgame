import React, { useEffect, useState } from 'react';
import { Maximize2, RotateCw, Smartphone } from 'lucide-react';

function checkIsMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const hasCoarsePointer =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
  const hasTouch =
    'ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0;
  const smallestScreenEdge = Math.min(
    window.screen?.width || window.innerWidth,
    window.screen?.height || window.innerHeight
  );
  return hasCoarsePointer || (hasTouch && smallestScreenEdge <= 950);
}

export const MobileOrientationGuard: React.FC = () => {
  const [isPortraitMobile, setIsPortraitMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return checkIsMobileDevice() && window.innerHeight > window.innerWidth;
  });
  const [lockAttempted, setLockAttempted] = useState(false);

  useEffect(() => {
    const evaluate = () => {
      const mobile = checkIsMobileDevice();
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortraitMobile(mobile && portrait);
    };

    evaluate();
    window.addEventListener('resize', evaluate);
    window.addEventListener('orientationchange', evaluate);
    const mq =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(orientation: portrait)')
        : null;
    mq?.addEventListener?.('change', evaluate);

    return () => {
      window.removeEventListener('resize', evaluate);
      window.removeEventListener('orientationchange', evaluate);
      mq?.removeEventListener?.('change', evaluate);
    };
  }, []);

  const handleRequestLandscapeFullscreen = async () => {
    setLockAttempted(true);
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      const orientationApi = screen.orientation as ScreenOrientation & {
        lock?: (orientation: string) => Promise<void>;
      };
      if (orientationApi && typeof orientationApi.lock === 'function') {
        await orientationApi.lock('landscape');
      }
    } catch {
      // Some mobile browsers (e.g., iOS Safari) disallow programmatic orientation lock; user rotates manually
    }
  };

  if (!isPortraitMobile) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-stone-950/98 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Gire o aparelho para a horizontal"
    >
      {/* Subtle Runic Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-amber-500/15 blur-[110px]" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-cyan-500/15 blur-[110px]" />
      </div>

      <div className="relative z-10 max-w-sm w-full rounded-3xl border-2 border-amber-500/60 bg-gradient-to-b from-stone-900/95 via-stone-950/95 to-black/95 p-6 shadow-[0_0_60px_rgba(0,0,0,0.95)] flex flex-col items-center gap-4">
        <div className="text-[11px] font-mono tracking-[0.28em] text-amber-300/80 uppercase">
          ᚠ Celentia · Reinos em Guerra ᛊ
        </div>

        {/* Animated Rotating Phone Graphic */}
        <div className="relative w-24 h-24 rounded-2xl bg-stone-900/90 border border-amber-400/40 flex items-center justify-center shadow-inner">
          <div className="animate-rotate-landscape text-amber-300">
            <Smartphone size={46} strokeWidth={1.75} />
          </div>
          <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 shadow">
            <RotateCw size={18} className="animate-spin-slow" />
          </div>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-serif font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 uppercase">
            Gire Seu Aparelho
          </h2>
          <p className="text-sm text-stone-300 leading-relaxed">
            Para duelar em <strong className="text-amber-300">Celentia</strong>, utilize o celular <strong className="text-cyan-300">deitado (modo paisagem)</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRequestLandscapeFullscreen}
          className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] text-stone-950 font-serif font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          <Maximize2 size={16} />
          <span>Ativar Tela Cheia Horizontal</span>
        </button>

        {lockAttempted && (
          <p className="text-[11px] text-stone-400">
            Caso o navegador não gire automaticamente, desbloqueie a rotação de tela do aparelho e gire-o de lado.
          </p>
        )}
      </div>
    </div>
  );
};
