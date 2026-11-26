import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Volume2,
  VolumeX,
  Palette,
  Check,
  Sliders,
  Monitor,
  Flame,
  Layers,
  Smartphone,
  BookOpen,
  Zap,
  Shield,
  Swords,
  Wind,
  Gauge,
  PackageOpen,
  Frame,
  EyeOff,
  Lock,
} from 'lucide-react';
import {
  useVisualPreferences,
  PLAYMAT_OPTIONS,
  CARD_BACK_OPTIONS,
  AnimationMode,
  TurnIndicatorMode,
  ChestAnimationMode,
} from '../utils/visualTheme';
import { sound } from '../services/soundEffects';
import { useCloudPlayerState, syncProfileToCloud } from '../services/accountApi';
import {
  FREE_PLAYMAT_IDS,
  FREE_CARD_BACK_IDS,
  getPlaymatPrice,
  getCardBackPrice,
  type PlaymatId,
  type CardBackId,
} from '../data/economy';
import { ArenaPlaymatBackdrop } from './ArenaPlaymatBackdrop';
import { CardBackArt } from './CardBackArt';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRules?: () => void;
  initialTab?: SettingsTab;
}

export type SettingsTab = 'audio' | 'visual' | 'performance' | 'themes';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenRules,
  initialTab = 'audio',
}) => {
  const {
    playmat,
    cardBack,
    foilEffects,
    setPlaymat,
    setCardBack,
    setFoilEffects,
    elementalParticles,
    setElementalParticles,
    viewLayout,
    setViewLayout,
    animationMode,
    setAnimationMode,
    combatAnimations,
    setCombatAnimations,
    skillAndUnitVfx,
    setSkillAndUnitVfx,
    ambientAnimations,
    setAmbientAnimations,
    turnIndicatorMode,
    setTurnIndicatorMode,
    chestAnimationMode,
    setChestAnimationMode,
    reduceGpuBlur,
    setReduceGpuBlur,
    applyLightweightPreset,
    applyUltraLightPreset,
    applyFullPreset,
  } = useVisualPreferences();

  const { playerState } = useCloudPlayerState();
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [isMuted, setIsMuted] = useState(() => sound.getMuted());
  const [volume, setVolume] = useState(() => sound.getVolume());

  const unlockedPlaymatSet = new Set<PlaymatId>([
    ...FREE_PLAYMAT_IDS,
    ...(playerState?.unlockedPlaymats || []),
  ]);
  const unlockedCardBackSet = new Set<CardBackId>([
    ...FREE_CARD_BACK_IDS,
    ...(playerState?.unlockedCardBacks || []),
  ]);
  const activePlaymat = playerState?.equippedPlaymat || playmat;
  const activeCardBack = playerState?.equippedCardBack || cardBack;

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setIsMuted(sound.getMuted());
      setVolume(sound.getVolume());
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const syncAudio = () => {
      setIsMuted(sound.getMuted());
      setVolume(sound.getVolume());
    };
    window.addEventListener('alvorecer-audio-change', syncAudio);
    return () => window.removeEventListener('alvorecer-audio-change', syncAudio);
  }, []);

  if (!isOpen) return null;

  const handleToggleAudio = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      if (sound.getVolume() === 0) {
        sound.setVolume(0.8);
        setVolume(0.8);
      }
      sound.playSummon();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    sound.setVolume(val);
    setIsMuted(val === 0);
  };

  const isLightweightActive =
    animationMode === 'static' &&
    !ambientAnimations &&
    !elementalParticles &&
    !foilEffects &&
    turnIndicatorMode === 'static' &&
    chestAnimationMode === 'static' &&
    reduceGpuBlur;
  const isUltraLightActive =
    animationMode === 'off' &&
    !combatAnimations &&
    !skillAndUnitVfx &&
    !ambientAnimations &&
    chestAnimationMode === 'off' &&
    reduceGpuBlur;
  const isFullActive =
    animationMode === 'full' &&
    combatAnimations &&
    skillAndUnitVfx &&
    ambientAnimations &&
    elementalParticles &&
    foilEffects &&
    turnIndicatorMode === 'full' &&
    chestAnimationMode === 'full' &&
    !reduceGpuBlur;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[94dvh] flex flex-col rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#161421] via-[#0f0e17] to-[#07060b] border-2 border-amber-500/40 shadow-[0_25px_70px_rgba(0,0,0,0.95)] text-stone-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800/80 px-4 sm:px-6 py-3 sm:py-4 bg-stone-950/60 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-inner">
              <Sliders size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-500">
                CONFIGURAÇÕES
              </h2>
              <p className="text-[10px] sm:text-[11px] text-stone-400">
                Sons, layout Mobile/Mesa, modo leve / animações estáticas e temas da arena.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-700/80 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Fechar Configurações"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 px-3 sm:px-6 pt-2.5 pb-2 border-b border-stone-800/60 bg-stone-950/30 shrink-0 overflow-x-auto">
          <button
            onClick={() => {
              sound.playTick();
              setActiveTab('audio');
            }}
            className={`flex-1 py-2 px-2.5 sm:px-3 rounded-xl font-serif font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border whitespace-nowrap ${
              activeTab === 'audio'
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-md'
                : 'bg-stone-900/50 border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            {isMuted ? (
              <VolumeX size={14} className={activeTab === 'audio' ? 'text-rose-400' : 'text-stone-500'} />
            ) : (
              <Volume2 size={14} className={activeTab === 'audio' ? 'text-emerald-400' : 'text-stone-500'} />
            )}
            <span>Sons</span>
          </button>

          <button
            onClick={() => {
              sound.playTick();
              setActiveTab('performance');
            }}
            className={`flex-1 py-2 px-2.5 sm:px-3 rounded-xl font-serif font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border whitespace-nowrap ${
              activeTab === 'performance'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-md'
                : 'bg-stone-900/50 border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <Gauge size={14} className={activeTab === 'performance' ? 'text-cyan-300' : 'text-stone-500'} />
            <span>Animações</span>
          </button>

          <button
            onClick={() => {
              sound.playTick();
              setActiveTab('visual');
            }}
            className={`flex-1 py-2 px-2.5 sm:px-3 rounded-xl font-serif font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border whitespace-nowrap ${
              activeTab === 'visual'
                ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md'
                : 'bg-stone-900/50 border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <Monitor size={14} className={activeTab === 'visual' ? 'text-amber-400' : 'text-stone-500'} />
            <span>Tela</span>
          </button>

          <button
            onClick={() => {
              sound.playTick();
              setActiveTab('themes');
            }}
            className={`flex-1 py-2 px-2.5 sm:px-3 rounded-xl font-serif font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border whitespace-nowrap ${
              activeTab === 'themes'
                ? 'bg-purple-500/20 border-purple-400 text-purple-200 shadow-md'
                : 'bg-stone-900/50 border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <Palette size={14} className={activeTab === 'themes' ? 'text-purple-400' : 'text-stone-500'} />
            <span>Temas</span>
          </button>

          {onOpenRules && (
            <button
              onClick={() => {
                sound.playDraw();
                onClose();
                onOpenRules();
              }}
              className="py-2 px-2.5 sm:px-3 rounded-xl font-serif font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border bg-stone-900/80 border-amber-500/40 text-amber-200 hover:bg-amber-500/20 whitespace-nowrap shrink-0"
              title="Abrir Manual de Regras do Jogo"
            >
              <BookOpen size={14} className="text-amber-400" />
              <span>Regras</span>
            </button>
          )}
        </div>

        {/* Dynamic Tab Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3.5 sm:py-4 space-y-4">
          {/* TAB 1: SONS (Mute + Volume integrados) */}
          {activeTab === 'audio' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-stone-900/70 border border-stone-800 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-inner ${
                        isMuted
                          ? 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                          : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                      }`}
                    >
                      {isMuted ? <VolumeX size={19} /> : <Volume2 size={19} />}
                    </div>
                    <div>
                      <h3 className="text-sm font-serif font-black text-amber-200 uppercase tracking-wider">
                        Efeitos Sonoros do Jogo
                      </h3>
                      <p className="text-[11px] text-stone-400">
                        Controle o silenciamento e o volume geral dos efeitos de cartas e combate.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleAudio}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer font-mono whitespace-nowrap ${
                      !isMuted
                        ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                        : 'bg-rose-950/70 border-rose-500/50 text-rose-200'
                    }`}
                  >
                    {!isMuted ? 'SOM ATIVO' : 'MUTADO'}
                  </button>
                </div>

                {/* Integrated Volume Slider */}
                <div className="pt-3 border-t border-stone-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-300">Volume Geral</span>
                    <span className="font-mono tabular-nums font-bold text-amber-300">
                      {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-full accent-amber-500 cursor-pointer h-2"
                    aria-label="Volume Geral dos Efeitos Sonoros"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-stone-500">0% (Mudo)</span>
                    <button
                      type="button"
                      onClick={() => sound.playSummon()}
                      disabled={isMuted}
                      className="px-3 py-1 rounded-lg bg-stone-950 hover:bg-stone-800 border border-stone-700 text-[11px] font-semibold text-amber-200 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Testar Som
                    </button>
                    <span className="text-[10px] text-stone-500">100%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANIMAÇÕES & DESEMPENHO (Modo Estático / Leve / Desativado) */}
          {activeTab === 'performance' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              {/* Quick Presets */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-stone-900/80 to-stone-950 border border-cyan-500/35 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Gauge size={16} className="text-cyan-300" />
                    <h3 className="text-xs font-serif font-black text-cyan-200 uppercase tracking-wider">
                      Maximização de FPS (Mobile & Desktop)
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-stone-400">
                    {animationMode === 'full' && !reduceGpuBlur
                      ? 'Completo'
                      : animationMode === 'static'
                      ? 'Estático (Mobile)'
                      : 'Máx. FPS'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTick();
                      applyFullPreset();
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                      isFullActive
                        ? 'bg-amber-500/20 border-amber-400 text-amber-100 shadow-md'
                        : 'bg-stone-950/70 border-stone-800 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black">Completo</span>
                      <Sparkles size={13} className="text-amber-300" />
                    </div>
                    <span className="text-[9px] text-stone-400 leading-tight">
                      Borda viva, baús 3D, partículas e desfoque
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sound.playTick();
                      applyLightweightPreset();
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                      isLightweightActive
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100 shadow-md'
                        : 'bg-stone-950/70 border-stone-800 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black">Modo Leve</span>
                      <Shield size={13} className="text-emerald-300" />
                    </div>
                    <span className="text-[9px] text-stone-400 leading-tight">
                      Formas estáticas + sem blur (Ideal Mobile)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sound.playTick();
                      applyUltraLightPreset();
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                      isUltraLightActive
                        ? 'bg-sky-500/20 border-sky-400 text-sky-100 shadow-md'
                        : 'bg-stone-950/70 border-stone-800 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black">Máx. FPS</span>
                      <Zap size={13} className="text-sky-300" />
                    </div>
                    <span className="text-[9px] text-stone-400 leading-tight">
                      Borda fixa zero-GPU, baús diretos, zero loops
                    </span>
                  </button>
                </div>
              </div>

              {/* 3-Way Global Animation Mode */}
              <div className="p-3.5 rounded-2xl bg-stone-900/70 border border-stone-800 space-y-2.5">
                <div>
                  <h4 className="text-xs font-serif font-black text-amber-200 uppercase tracking-wider">
                    Estilo das Animações
                  </h4>
                  <p className="text-[10px] text-stone-400">
                    No modo Estático, habilidades, partículas e fundo cósmico usam versões paradas sem loops de renderização.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      {
                        id: 'full' as AnimationMode,
                        title: 'Completas',
                        desc: 'Efeitos animados',
                        activeClass: 'bg-amber-500/20 border-amber-400 text-amber-200',
                      },
                      {
                        id: 'static' as AnimationMode,
                        title: 'Estáticas',
                        desc: 'Placas visuais fixas',
                        activeClass: 'bg-emerald-500/20 border-emerald-400 text-emerald-200',
                      },
                      {
                        id: 'off' as AnimationMode,
                        title: 'Desativadas',
                        desc: 'Sem animações',
                        activeClass: 'bg-sky-500/20 border-sky-400 text-sky-200',
                      },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        sound.playTick();
                        setAnimationMode(opt.id);
                      }}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        animationMode === opt.id
                          ? `${opt.activeClass} shadow-md`
                          : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <div className="text-[11px] font-black">{opt.title}</div>
                      <div className="text-[9px] opacity-80">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Granular Toggles */}
              <div className="space-y-2">
                {/* Borda da Mesa & Aviso de Turno (Animada / Estática / Off) */}
                <div className="p-3 rounded-2xl bg-stone-900/60 border border-stone-800/90 space-y-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                      <Frame size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-stone-200">Borda da Mesa & Aviso de Turno</div>
                      <div className="text-[10px] text-stone-400">
                        Versão estática usa meia-borda CSS pura + placa fixa (zero SVG blur ou rastreamento no mobile)
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        {
                          id: 'full' as TurnIndicatorMode,
                          label: 'Animada',
                          activeClass: 'bg-amber-500/20 border-amber-400 text-amber-200',
                        },
                        {
                          id: 'static' as TurnIndicatorMode,
                          label: 'Estática',
                          activeClass: 'bg-emerald-500/20 border-emerald-400 text-emerald-200',
                        },
                        {
                          id: 'off' as TurnIndicatorMode,
                          label: 'Desativada',
                          activeClass: 'bg-stone-800 border-stone-500 text-stone-200',
                        },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          sound.playTick();
                          setTurnIndicatorMode(opt.id);
                        }}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer font-mono whitespace-nowrap ${
                          turnIndicatorMode === opt.id
                            ? opt.activeClass
                            : 'bg-stone-950/70 border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Abertura de Baús & Pacotes (Completa / Estática / Instantânea) */}
                <div className="p-3 rounded-2xl bg-stone-900/60 border border-stone-800/90 space-y-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
                      <PackageOpen size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-stone-200">Abertura de Baús & Pacotes</div>
                      <div className="text-[10px] text-stone-400">
                        Estática exibe o baú fixo sem partículas/tremor; Instantânea abre direto nas cartas ganhas
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        {
                          id: 'full' as ChestAnimationMode,
                          label: 'Completa',
                          activeClass: 'bg-amber-500/20 border-amber-400 text-amber-200',
                        },
                        {
                          id: 'static' as ChestAnimationMode,
                          label: 'Estática',
                          activeClass: 'bg-emerald-500/20 border-emerald-400 text-emerald-200',
                        },
                        {
                          id: 'off' as ChestAnimationMode,
                          label: 'Instantânea',
                          activeClass: 'bg-sky-500/20 border-sky-400 text-sky-200',
                        },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          sound.playTick();
                          setChestAnimationMode(opt.id);
                        }}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer font-mono whitespace-nowrap ${
                          chestAnimationMode === opt.id
                            ? opt.activeClass
                            : 'bg-stone-950/70 border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reduzir Desfoque (Blur) & Brilhos GPU */}
                <div className="p-3 rounded-2xl bg-stone-900/60 border border-stone-800/90 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-sky-950/80 border border-sky-500/40 flex items-center justify-center text-sky-300 shrink-0">
                      <EyeOff size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-stone-200">Reduzir Desfoque (Blur) & Brilhos GPU</div>
                      <div className="text-[10px] text-stone-400">
                        Remove backdrop-blur, filtros gaussianos e pulsos contínuos para máximo FPS no celular
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTick();
                      setReduceGpuBlur(!reduceGpuBlur);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer font-mono shrink-0 whitespace-nowrap ${
                      reduceGpuBlur
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                        : 'bg-stone-800 border-stone-700 text-stone-400'
                    }`}
                  >
                    {reduceGpuBlur ? 'ATIVO' : 'OFF'}
                  </button>
                </div>
                <div className="p-3 rounded-2xl bg-stone-900/60 border border-stone-800/90 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-300 shrink-0">
                      <Swords size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-stone-200">Animações de Combate & Cartas</div>
                      <div className="text-[10px] text-stone-400">
                        Investidas na mesa, compra, descarte, virada de moeda e Level-Up
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTick();
                      setCombatAnimations(!combatAnimations);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer font-mono shrink-0 ${
                      combatAnimations && animationMode !== 'off'
                        ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                        : 'bg-stone-800 border-stone-700 text-stone-400'
                    }`}
                  >
                    {combatAnimations && animationMode !== 'off'
                      ? animationMode === 'static'
                        ? 'ESTÁTICO'
                        : 'LIGADO'
                      : 'OFF'}
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-stone-900/60 border border-stone-800/90 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                      <Zap size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-stone-200">Efeitos de Habilidades & Unidades</div>
                      <div className="text-[10px] text-stone-400">
                        VFX de habilidades, condições (Fogo, Gelo, Raio), Crio-Gênese e correntes
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTick();
                      setSkillAndUnitVfx(!skillAndUnitVfx);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer font-mono shrink-0 ${
                      skillAndUnitVfx && animationMode !== 'off'
                        ? 'bg-purple-500/20 border-purple-400 text-purple-200'
                        : 'bg-stone-800 border-stone-700 text-stone-400'
                    }`}
                  >
                    {skillAndUnitVfx && animationMode !== 'off'
                      ? animationMode === 'static'
                        ? 'ESTÁTICO'
                        : 'LIGADO'
                      : 'OFF'}
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-stone-900/60 border border-stone-800/90 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
                      <Wind size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-stone-200">Animações de Fundo & Ambiente</div>
                      <div className="text-[10px] text-stone-400">
                        Galáxias em espiral, estrelas cadentes, órbitas do relógio e auras contínuas
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTick();
                      setAmbientAnimations(!ambientAnimations);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer font-mono shrink-0 ${
                      ambientAnimations && animationMode === 'full'
                        ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200'
                        : 'bg-stone-800 border-stone-700 text-stone-400'
                    }`}
                  >
                    {ambientAnimations && animationMode === 'full'
                      ? 'LIGADO'
                      : animationMode === 'static'
                      ? 'ESTÁTICO'
                      : 'OFF'}
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-stone-900/60 border border-stone-800/90 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0">
                      <Flame size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-stone-200">Partículas Elementais</div>
                      <div className="text-[10px] text-stone-400">
                        Explosões elementais de Fogo, Gelo, Telúrico e Divino ao invocar
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTick();
                      setElementalParticles(!elementalParticles);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer font-mono shrink-0 ${
                      elementalParticles && animationMode !== 'off'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                        : 'bg-stone-800 border-stone-700 text-stone-400'
                    }`}
                  >
                    {elementalParticles && animationMode !== 'off'
                      ? animationMode === 'static'
                        ? 'ESTÁTICO'
                        : 'LIGADO'
                      : 'OFF'}
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-stone-900/60 border border-stone-800/90 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                      <Sparkles size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-stone-200">Glow & Foil Holográfico</div>
                      <div className="text-[10px] text-stone-400">
                        Brilho reflexivo especial nas cartas Lendárias e Supremas (Tier 5 e 6)
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTick();
                      setFoilEffects(!foilEffects);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer font-mono shrink-0 ${
                      foilEffects && animationMode === 'full'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-stone-800 border-stone-700 text-stone-400'
                    }`}
                  >
                    {foilEffects && animationMode === 'full' ? 'LIGADO' : 'OFF'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TELA (Layout Mobile / Mesa) */}
          {activeTab === 'visual' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-2xl bg-stone-900/70 border border-amber-500/30 flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-300">
                    <Smartphone size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-serif font-black text-amber-300 uppercase tracking-wider">
                      Visualização Mobile / Mesa
                    </h4>
                    <p className="text-[10px] text-stone-400">
                      Alterne entre a arena otimizada para celular (cartas nítidas e HUD tático) e o modo mesa desktop
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={() => {
                      sound.playTick();
                      setViewLayout('auto');
                    }}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      viewLayout === 'auto'
                        ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-md'
                        : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                    }`}
                  >
                    <Sparkles size={14} className={viewLayout === 'auto' ? 'text-amber-300' : 'text-stone-500'} />
                    <span className="text-[11px] font-bold">Automático</span>
                    <span className="text-[9px] text-stone-400/80">Detecta tela</span>
                  </button>

                  <button
                    onClick={() => {
                      sound.playTick();
                      setViewLayout('mobile');
                    }}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      viewLayout === 'mobile'
                        ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-md'
                        : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                    }`}
                  >
                    <Smartphone size={14} className={viewLayout === 'mobile' ? 'text-emerald-300' : 'text-stone-500'} />
                    <span className="text-[11px] font-bold">Modo Mobile</span>
                    <span className="text-[9px] text-stone-400/80">Arena tática mobile</span>
                  </button>

                  <button
                    onClick={() => {
                      sound.playTick();
                      setViewLayout('desktop');
                    }}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      viewLayout === 'desktop'
                        ? 'bg-sky-500/25 border-sky-400 text-sky-200 shadow-md'
                        : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                    }`}
                  >
                    <Monitor size={14} className={viewLayout === 'desktop' ? 'text-sky-300' : 'text-stone-500'} />
                    <span className="text-[11px] font-bold">Modo Mesa</span>
                    <span className="text-[9px] text-stone-400/80">Desktop completo</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TEMAS (Tapetes de Mesa & Versos de Carta) */}
          {activeTab === 'themes' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-2.5 rounded-xl bg-stone-900/75 border border-stone-800 text-[11px] text-stone-400">
                Apenas tapetes e versos já adquiridos podem ser equipados aqui. Para desbloquear novos temas com Cristais ou Ouro, acesse a <strong className="text-amber-300">Loja → Temas</strong>.
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-serif font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Palette size={14} className="text-amber-400" />
                    Tapete de Batalha (Playmat)
                  </h3>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {PLAYMAT_OPTIONS.find((p) => p.id === activePlaymat)?.name}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PLAYMAT_OPTIONS.map((opt) => {
                    const isOwned = unlockedPlaymatSet.has(opt.id);
                    const isEquipped = activePlaymat === opt.id;
                    const price = getPlaymatPrice(opt.id);

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={!isOwned}
                        onClick={() => {
                          if (!isOwned) return;
                          sound.playTick();
                          setPlaymat(opt.id);
                          void syncProfileToCloud({ equippedPlaymat: opt.id }).catch(() => {});
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                          isEquipped
                            ? `bg-stone-900 border-2 ${opt.accentColor} shadow-md cursor-pointer`
                            : isOwned
                            ? 'bg-stone-900/45 border-stone-700 hover:border-stone-500 cursor-pointer'
                            : 'bg-stone-950/60 border-stone-800/80 opacity-65 cursor-not-allowed'
                        }`}
                        title={
                          isOwned
                            ? `Equipar ${opt.name}`
                            : `Bloqueado — compre na Loja por ${price.crystalCost} Cristais ou ${price.goldCost} Ouro`
                        }
                      >
                        <div className="flex items-center justify-between mb-1.5 gap-2">
                          <span className="text-xs font-bold text-stone-100">{opt.name}</span>
                          {isEquipped ? (
                            <span className="w-5 h-5 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center text-[10px] shrink-0">
                              <Check size={12} />
                            </span>
                          ) : !isOwned ? (
                            <span className="px-1.5 py-0.5 rounded bg-stone-900 border border-stone-700 text-[9px] font-mono text-stone-400 flex items-center gap-1 shrink-0">
                              <Lock size={9} /> {price.crystalCost} 💎 / {price.goldCost} 🪙
                            </span>
                          ) : null}
                        </div>
                        <div className="relative w-full h-16 rounded-xl overflow-hidden mb-1.5 border border-white/15">
                          <ArenaPlaymatBackdrop
                            playmat={opt.id}
                            animated={opt.isAnimated}
                            variant="preview"
                          />
                          <span className="absolute bottom-1 left-1.5 px-1.5 py-0.5 rounded bg-black/65 text-[9px] font-bold text-amber-200/90 z-10">
                            {opt.isAnimated ? `✨ ${opt.animationLabel}` : 'Estático (Padrão)'}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-400 leading-snug">{opt.subtitle}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-stone-800/80">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-serif font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers size={14} className="text-amber-400" />
                    Verso de Carta do Baralho
                  </h3>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {CARD_BACK_OPTIONS.find((c) => c.id === activeCardBack)?.name}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {CARD_BACK_OPTIONS.map((cb) => {
                    const isOwned = unlockedCardBackSet.has(cb.id);
                    const isEquipped = activeCardBack === cb.id;
                    const price = getCardBackPrice(cb.id);

                    return (
                      <button
                        key={cb.id}
                        type="button"
                        disabled={!isOwned}
                        onClick={() => {
                          if (!isOwned) return;
                          sound.playTick();
                          setCardBack(cb.id);
                          void syncProfileToCloud({ equippedCardBack: cb.id }).catch(() => {});
                        }}
                        className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 ${
                          isEquipped
                            ? 'bg-stone-900 border-2 border-amber-400 shadow-md cursor-pointer'
                            : isOwned
                            ? 'bg-stone-900/45 border-stone-700 hover:border-stone-500 cursor-pointer'
                            : 'bg-stone-950/60 border-stone-800/80 opacity-65 cursor-not-allowed'
                        }`}
                        title={
                          isOwned
                            ? `Equipar ${cb.name}`
                            : `Bloqueado — compre na Loja por ${price.crystalCost} Cristais ou ${price.goldCost} Ouro`
                        }
                      >
                        <div className="relative">
                          <CardBackArt
                            theme={cb.id}
                            context="preview"
                            animated={cb.isAnimated}
                            compact
                            className="w-12 h-18 rounded-lg shadow-md"
                          />
                          {!isOwned && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-stone-950 border border-stone-600 flex items-center justify-center text-stone-300 z-20">
                              <Lock size={9} />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-stone-200 truncate">{cb.name}</div>
                          <div className="text-[8px] text-stone-400 leading-tight mt-0.5">
                            {cb.isAnimated ? '✨ Animado' : 'Estático'}
                          </div>
                          <div className="text-[9px] font-mono mt-0.5 tabular-nums text-amber-400">
                            {isEquipped
                              ? 'Selecionado'
                              : isOwned
                              ? 'Escolher'
                              : `${price.crystalCost} 💎 / ${price.goldCost} 🪙`}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-stone-800/80 px-4 sm:px-6 py-3 bg-stone-950/60 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-stone-400">
            Seção:{' '}
            <strong className="text-amber-300">
              {activeTab === 'audio'
                ? 'Sons'
                : activeTab === 'performance'
                ? 'Animações & Desempenho'
                : activeTab === 'visual'
                ? 'Tela'
                : 'Temas'}
            </strong>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-serif font-black text-xs tracking-wider shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            CONCLUÍDO
          </button>
        </div>
      </div>
    </div>
  );
};
