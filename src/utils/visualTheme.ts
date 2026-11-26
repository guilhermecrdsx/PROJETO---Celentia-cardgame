import { useState, useEffect } from 'react';

export type PlaymatTheme =
  | 'standard_arena'
  | 'arcane_citadel'
  | 'celestial_sanctuary'
  | 'obsidian_forge'
  | 'classic_slate';
export type CardBackTheme =
  | 'standard_classic'
  | 'royal_gold'
  | 'angiris_wings'
  | 'cosmic_void'
  | 'crimson_war';

const VALID_PLAYMAT_THEMES = new Set<PlaymatTheme>([
  'standard_arena',
  'arcane_citadel',
  'celestial_sanctuary',
  'obsidian_forge',
  'classic_slate',
]);

const VALID_CARD_BACK_THEMES = new Set<CardBackTheme>([
  'standard_classic',
  'royal_gold',
  'angiris_wings',
  'cosmic_void',
  'crimson_war',
]);
export type ViewLayoutMode = 'auto' | 'mobile' | 'desktop';
export type AnimationMode = 'full' | 'static' | 'off';
export type TurnIndicatorMode = 'full' | 'static' | 'off';
export type ChestAnimationMode = 'full' | 'static' | 'off';

const PLAYMAT_THEME_KEY = 'alvorecer_playmat_theme';
const CARD_BACK_THEME_KEY = 'alvorecer_card_back_theme';
const FOIL_EFFECTS_KEY = 'alvorecer_foil_effects';
const ELEMENTAL_PARTICLES_KEY = 'alvorecer_elemental_particles';
const VIEW_LAYOUT_KEY = 'alvorecer_view_layout';
const ANIMATION_MODE_KEY = 'alvorecer_animation_mode';
const COMBAT_ANIMATIONS_KEY = 'alvorecer_combat_animations';
const SKILL_UNIT_VFX_KEY = 'alvorecer_skill_unit_vfx';
const AMBIENT_ANIMATIONS_KEY = 'alvorecer_ambient_animations';
const TURN_INDICATOR_MODE_KEY = 'alvorecer_turn_indicator_mode';
const CHEST_ANIMATION_MODE_KEY = 'alvorecer_chest_animation_mode';
const REDUCE_GPU_BLUR_KEY = 'alvorecer_reduce_gpu_blur';

export interface VisualPreferences {
  playmat: PlaymatTheme;
  cardBack: CardBackTheme;
  foilEffects: boolean;
  elementalParticles: boolean;
  viewLayout: ViewLayoutMode;
  animationMode: AnimationMode;
  combatAnimations: boolean;
  skillAndUnitVfx: boolean;
  ambientAnimations: boolean;
  turnIndicatorMode: TurnIndicatorMode;
  chestAnimationMode: ChestAnimationMode;
  reduceGpuBlur: boolean;
}

export function getVisualPreferences(): VisualPreferences {
  try {
    const playmatRaw = localStorage.getItem(PLAYMAT_THEME_KEY) as PlaymatTheme | null;
    const playmat: PlaymatTheme =
      playmatRaw && VALID_PLAYMAT_THEMES.has(playmatRaw) ? playmatRaw : 'standard_arena';
    const cardBackRaw = localStorage.getItem(CARD_BACK_THEME_KEY) as CardBackTheme | null;
    const cardBack: CardBackTheme =
      cardBackRaw && VALID_CARD_BACK_THEMES.has(cardBackRaw) ? cardBackRaw : 'standard_classic';
    const foilRaw = localStorage.getItem(FOIL_EFFECTS_KEY);
    const foilEffects = foilRaw === null ? true : foilRaw === 'true';
    const particlesRaw = localStorage.getItem(ELEMENTAL_PARTICLES_KEY);
    const elementalParticles = particlesRaw === null ? true : particlesRaw === 'true';
    const layoutRaw = (localStorage.getItem(VIEW_LAYOUT_KEY) as ViewLayoutMode) || 'auto';
    const viewLayout: ViewLayoutMode =
      layoutRaw === 'mobile' || layoutRaw === 'desktop' || layoutRaw === 'auto' ? layoutRaw : 'auto';
    const animModeRaw = (localStorage.getItem(ANIMATION_MODE_KEY) as AnimationMode) || 'full';
    const animationMode: AnimationMode =
      animModeRaw === 'full' || animModeRaw === 'static' || animModeRaw === 'off' ? animModeRaw : 'full';
    const combatRaw = localStorage.getItem(COMBAT_ANIMATIONS_KEY);
    const combatAnimations = combatRaw === null ? true : combatRaw === 'true';
    const skillRaw = localStorage.getItem(SKILL_UNIT_VFX_KEY);
    const skillAndUnitVfx = skillRaw === null ? true : skillRaw === 'true';
    const ambientRaw = localStorage.getItem(AMBIENT_ANIMATIONS_KEY);
    const ambientAnimations = ambientRaw === null ? true : ambientRaw === 'true';
    const turnIndRaw = (localStorage.getItem(TURN_INDICATOR_MODE_KEY) as TurnIndicatorMode) || 'full';
    const turnIndicatorMode: TurnIndicatorMode =
      turnIndRaw === 'full' || turnIndRaw === 'static' || turnIndRaw === 'off' ? turnIndRaw : 'full';
    const chestAnimRaw = (localStorage.getItem(CHEST_ANIMATION_MODE_KEY) as ChestAnimationMode) || 'full';
    const chestAnimationMode: ChestAnimationMode =
      chestAnimRaw === 'full' || chestAnimRaw === 'static' || chestAnimRaw === 'off' ? chestAnimRaw : 'full';
    const reduceBlurRaw = localStorage.getItem(REDUCE_GPU_BLUR_KEY);
    const reduceGpuBlur = reduceBlurRaw === null ? false : reduceBlurRaw === 'true';

    return {
      playmat,
      cardBack,
      foilEffects,
      elementalParticles,
      viewLayout,
      animationMode,
      combatAnimations,
      skillAndUnitVfx,
      ambientAnimations,
      turnIndicatorMode,
      chestAnimationMode,
      reduceGpuBlur,
    };
  } catch {
    return {
      playmat: 'standard_arena',
      cardBack: 'standard_classic',
      foilEffects: true,
      elementalParticles: true,
      viewLayout: 'auto',
      animationMode: 'full',
      combatAnimations: true,
      skillAndUnitVfx: true,
      ambientAnimations: true,
      turnIndicatorMode: 'full',
      chestAnimationMode: 'full',
      reduceGpuBlur: false,
    };
  }
}

export function syncDocumentAnimationAttributes(prefs?: VisualPreferences) {
  if (typeof document === 'undefined') return;
  const p = prefs || getVisualPreferences();
  const root = document.documentElement;
  root.dataset.animMode = p.animationMode;
  root.dataset.ambientAnim = p.ambientAnimations && p.animationMode === 'full' ? 'on' : 'off';
  root.dataset.combatAnim = p.combatAnimations && p.animationMode === 'full' ? 'on' : 'off';
  root.dataset.foilAnim = p.foilEffects && p.animationMode === 'full' ? 'on' : 'off';
  root.dataset.turnIndicator = p.turnIndicatorMode;
  root.dataset.chestAnim = p.chestAnimationMode;
  root.dataset.reduceBlur = p.reduceGpuBlur ? 'on' : 'off';
}

// Immediately apply persisted animation attributes on module load
if (typeof window !== 'undefined') {
  syncDocumentAnimationAttributes();
}

function notifyVisualChange() {
  syncDocumentAnimationAttributes();
  window.dispatchEvent(new CustomEvent('alvorecer-visual-change'));
}

export function setPlaymatTheme(playmat: PlaymatTheme) {
  try {
    localStorage.setItem(PLAYMAT_THEME_KEY, playmat);
    notifyVisualChange();
  } catch {
    // ignore
  }
}

export function setCardBackTheme(cardBack: CardBackTheme) {
  try {
    localStorage.setItem(CARD_BACK_THEME_KEY, cardBack);
    notifyVisualChange();
  } catch {
    // ignore
  }
}

export function setFoilEffects(enabled: boolean) {
  try {
    localStorage.setItem(FOIL_EFFECTS_KEY, String(enabled));
    notifyVisualChange();
  } catch {
    // ignore
  }
}

export function setElementalParticles(enabled: boolean) {
  try {
    localStorage.setItem(ELEMENTAL_PARTICLES_KEY, String(enabled));
    notifyVisualChange();
  } catch {
    // ignore
  }
}

export function setViewLayout(layout: ViewLayoutMode) {
  try {
    localStorage.setItem(VIEW_LAYOUT_KEY, layout);
    notifyVisualChange();
  } catch {
    // ignore
  }
}

export function setAnimationMode(mode: AnimationMode) {
  try {
    localStorage.setItem(ANIMATION_MODE_KEY, mode);
    notifyVisualChange();
  } catch {
    // ignore
  }
}

export function setCombatAnimations(enabled: boolean) {
  try {
    localStorage.setItem(COMBAT_ANIMATIONS_KEY, String(enabled));
    notifyVisualChange();
  } catch {
    // ignore
  }
}

export function setSkillAndUnitVfx(enabled: boolean) {
  try {
    localStorage.setItem(SKILL_UNIT_VFX_KEY, String(enabled));
    notifyVisualChange();
  } catch {
    // ignore
  }
}

export function setAmbientAnimations(enabled: boolean) {
  try {
    localStorage.setItem(AMBIENT_ANIMATIONS_KEY, String(enabled));
    notifyVisualChange();
  } catch {
    // ignore
  }
}

export function setTurnIndicatorMode(mode: TurnIndicatorMode) {
  try {
    localStorage.setItem(TURN_INDICATOR_MODE_KEY, mode);
    notifyVisualChange();
  } catch {
    // ignore
  }
}

export function setChestAnimationMode(mode: ChestAnimationMode) {
  try {
    localStorage.setItem(CHEST_ANIMATION_MODE_KEY, mode);
    notifyVisualChange();
  } catch {
    // ignore
  }
}

export function setReduceGpuBlur(enabled: boolean) {
  try {
    localStorage.setItem(REDUCE_GPU_BLUR_KEY, String(enabled));
    notifyVisualChange();
  } catch {
    // ignore
  }
}

export function applyLightweightPreset() {
  try {
    localStorage.setItem(ANIMATION_MODE_KEY, 'static');
    localStorage.setItem(COMBAT_ANIMATIONS_KEY, 'true');
    localStorage.setItem(SKILL_UNIT_VFX_KEY, 'true');
    localStorage.setItem(AMBIENT_ANIMATIONS_KEY, 'false');
    localStorage.setItem(ELEMENTAL_PARTICLES_KEY, 'false');
    localStorage.setItem(FOIL_EFFECTS_KEY, 'false');
    localStorage.setItem(TURN_INDICATOR_MODE_KEY, 'static');
    localStorage.setItem(CHEST_ANIMATION_MODE_KEY, 'static');
    localStorage.setItem(REDUCE_GPU_BLUR_KEY, 'true');
    notifyVisualChange();
  } catch {
    // ignore
  }
}

export function applyUltraLightPreset() {
  try {
    localStorage.setItem(ANIMATION_MODE_KEY, 'off');
    localStorage.setItem(COMBAT_ANIMATIONS_KEY, 'false');
    localStorage.setItem(SKILL_UNIT_VFX_KEY, 'false');
    localStorage.setItem(AMBIENT_ANIMATIONS_KEY, 'false');
    localStorage.setItem(ELEMENTAL_PARTICLES_KEY, 'false');
    localStorage.setItem(FOIL_EFFECTS_KEY, 'false');
    localStorage.setItem(TURN_INDICATOR_MODE_KEY, 'static');
    localStorage.setItem(CHEST_ANIMATION_MODE_KEY, 'off');
    localStorage.setItem(REDUCE_GPU_BLUR_KEY, 'true');
    notifyVisualChange();
  } catch {
    // ignore
  }
}

export function applyFullPreset() {
  try {
    localStorage.setItem(ANIMATION_MODE_KEY, 'full');
    localStorage.setItem(COMBAT_ANIMATIONS_KEY, 'true');
    localStorage.setItem(SKILL_UNIT_VFX_KEY, 'true');
    localStorage.setItem(AMBIENT_ANIMATIONS_KEY, 'true');
    localStorage.setItem(ELEMENTAL_PARTICLES_KEY, 'true');
    localStorage.setItem(FOIL_EFFECTS_KEY, 'true');
    localStorage.setItem(TURN_INDICATOR_MODE_KEY, 'full');
    localStorage.setItem(CHEST_ANIMATION_MODE_KEY, 'full');
    localStorage.setItem(REDUCE_GPU_BLUR_KEY, 'false');
    notifyVisualChange();
  } catch {
    // ignore
  }
}

export const PLAYMAT_OPTIONS: {
  id: PlaymatTheme;
  name: string;
  subtitle: string;
  previewClass: string;
  accentColor: string;
  isAnimated: boolean;
  animationLabel: string;
}[] = [
  {
    id: 'standard_arena',
    name: 'Arena Padrão',
    subtitle: 'Tabuleiro clássico em pedra escura fosca, limpo e estático',
    previewClass: 'bg-gradient-to-br from-[#16151c] via-[#100f15] to-[#08070b]',
    accentColor: 'border-stone-500/60 text-stone-300',
    isAnimated: false,
    animationLabel: 'Estático (Padrão sem animações)',
  },
  {
    id: 'arcane_citadel',
    name: 'Cidadela Arcana',
    subtitle: 'Astrolábio rúnico triplo com ondas arcanas, linhas ley pulsantes e runas flutuantes',
    previewClass: 'bg-gradient-to-br from-[#161329] via-[#0d0b18] to-[#06050c]',
    accentColor: 'border-violet-400/70 text-violet-300',
    isAnimated: true,
    animationLabel: 'Astrolábio Triplo, Ondas Arcanas & Runas Levitantes',
  },
  {
    id: 'celestial_sanctuary',
    name: 'Santuário Celestial Angiris',
    subtitle: 'Asas serafínicas douradas, ondas solares radiantes, feixes divinos e plumas de luz',
    previewClass: 'bg-gradient-to-br from-[#282114] via-[#17130d] to-[#0b0906]',
    accentColor: 'border-yellow-400/70 text-yellow-200',
    isAnimated: true,
    animationLabel: 'Asas Serafínicas, Feixes Solares & Plumas de Luz',
  },
  {
    id: 'obsidian_forge',
    name: 'Forja de Obsidiana',
    subtitle: 'Caldeira vulcânica com fissuras incandescentes, ondas de calor e chuva de brasas',
    previewClass: 'bg-gradient-to-br from-[#261115] via-[#140a0d] to-[#090406]',
    accentColor: 'border-rose-500/70 text-rose-300',
    isAnimated: true,
    animationLabel: 'Fissuras Incandescentes, Calor & Tempestade de Brasas',
  },
  {
    id: 'classic_slate',
    name: 'Ardósia Ancestral',
    subtitle: 'Cortinas triplas de aurora boreal, constelações pulsantes e estrelas cadentes',
    previewClass: 'bg-gradient-to-br from-[#101824] via-[#0c111a] to-[#06080f]',
    accentColor: 'border-cyan-400/60 text-cyan-200',
    isAnimated: true,
    animationLabel: 'Aurora Boreal Tripla, Constelações & Meteoros',
  },
];

export const CARD_BACK_OPTIONS: {
  id: CardBackTheme;
  name: string;
  emblem: string;
  bgClass: string;
  borderClass: string;
  isAnimated: boolean;
  animationLabel: string;
}[] = [
  {
    id: 'standard_classic',
    name: 'Verso Padrão',
    emblem: '🛡️',
    bgClass: 'from-stone-800 via-stone-900 to-neutral-950',
    borderClass: 'border-stone-500',
    isAnimated: false,
    animationLabel: 'Estático (Padrão sem animações)',
  },
  {
    id: 'royal_gold',
    name: 'Real Dourado',
    emblem: '⚜️',
    bgClass: 'from-amber-900 via-stone-900 to-amber-950',
    borderClass: 'border-amber-400',
    isAnimated: true,
    animationLabel: 'Reflexo Metálico Dourado & Brasão Pulsante',
  },
  {
    id: 'angiris_wings',
    name: 'Conselho Angiris',
    emblem: '🪽',
    bgClass: 'from-yellow-700 via-amber-950 to-stone-950',
    borderClass: 'border-yellow-300',
    isAnimated: true,
    animationLabel: 'Raios Solares Giratórios & Halo Radiante',
  },
  {
    id: 'cosmic_void',
    name: 'Vazio Cósmico',
    emblem: '🔮',
    bgClass: 'from-indigo-900 via-purple-950 to-slate-950',
    borderClass: 'border-indigo-400',
    isAnimated: true,
    animationLabel: 'Anéis Orbitais Duplos & Nebulosa Estelar',
  },
  {
    id: 'crimson_war',
    name: 'Chama de Granty',
    emblem: '🐉',
    bgClass: 'from-rose-900 via-red-950 to-stone-950',
    borderClass: 'border-rose-400',
    isAnimated: true,
    animationLabel: 'Ondas de Brasas Ascendentes & Coração Dracônico',
  },
];

export function useVisualPreferences() {
  const [prefs, setPrefs] = useState<VisualPreferences>(() => {
    const initial = getVisualPreferences();
    syncDocumentAnimationAttributes(initial);
    return initial;
  });
  const [viewport, setViewport] = useState<{ width: number; height: number }>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 720,
  }));

  useEffect(() => {
    const handleSync = () => {
      const next = getVisualPreferences();
      syncDocumentAnimationAttributes(next);
      setPrefs(next);
    };
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('alvorecer-visual-change', handleSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('alvorecer-visual-change', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const isTouchDevice =
    typeof window !== 'undefined' &&
    ((typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches) ||
      'ontouchstart' in window ||
      (navigator.maxTouchPoints ?? 0) > 0);

  const isCompactLandscape =
    viewport.height <= 520 && viewport.width > viewport.height;

  const isMobileView =
    prefs.viewLayout === 'mobile'
      ? true
      : prefs.viewLayout === 'desktop'
      ? false
      : viewport.width < 1024 || isCompactLandscape;

  return {
    ...prefs,
    isMobileView,
    isCompactLandscape,
    isTouchDevice,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    setPlaymat: setPlaymatTheme,
    setCardBack: setCardBackTheme,
    setFoilEffects,
    setElementalParticles,
    setViewLayout,
    setAnimationMode,
    setCombatAnimations,
    setSkillAndUnitVfx,
    setAmbientAnimations,
    setTurnIndicatorMode,
    setChestAnimationMode,
    setReduceGpuBlur,
    applyLightweightPreset,
    applyUltraLightPreset,
    applyFullPreset,
  };
}
