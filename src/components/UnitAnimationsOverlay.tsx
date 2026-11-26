import React, { useEffect, useRef } from 'react';
import { sound } from '../services/soundEffects';
import { useVisualPreferences } from '../utils/visualTheme';

export type UnitVfxType =
  | 'fernando_ember'
  | 'vilma_fire_wave'
  | 'virtus_impetus'
  | 'salazar_torpor'
  | 'inariel_fire_hit'
  | 'bor_phoenix_rebirth'
  | 'helio_solar_flare'
  | 'o_sol_heal_helio'
  | 'o_sol_lvl2_oblit_disintegrate'
  | 'o_sol_lvl2_drain'
  | 'fanx_aqua_blessing'
  | 'cristalys_aqua_heal'
  | 'vanusa_reveal'
  | 'krust_crypt_reopen'
  | 'glauco_snowflake_def'
  | 'kore_death_blast'
  | 'juci_dragon_breath'
  | 'bonetrus_frost_fog'
  | 'bonetrus_lvl2_solo_slash'
  | 'bonetrus_lamina_attach'
  | 'finn_hp_boost'
  | 'kyn_bonk'
  | 'mara_potion_power'
  | 'tyn_lightning_dodge'
  | 'atormentador_fusion'
  | 'atormentador_stun_bolt'
  | 'karaty_chain_lightning'
  | 'barao_well_lvl2_bolts'
  | 'mipo_purple_hp'
  | 'karlo_death_shockwave'
  | 'mesmerino_mirror'
  | 'rainha_liz_power_decree'
  | 'licia_lvl2_light_wave'
  | 'philio_soul_orb'
  | 'tiryu_self_harm'
  | 'zyk_purple_coin'
  | 'lunario_sleep_beam'
  | 'lunario_lvl2_consume'
  | 'a_lua_heal_lunario'
  | 'a_lua_lvl2_sleep'
  | 'a_lua_lvl2_drain'
  | 'a_lua_lunario_obliterate'
  | 'pcie_shield_block'
  | 'wyr_dragon_heal'
  | 'rei_mauricio_decree'
  | 'saniel_lvl2_drain'
  | 'ambroz_alvorada_crit'
  | 'bia_furto_feerico'
  | 'nulio_luz_revigorante'
  | 'lucent_purificacao_ardente'
  | 'mavie_ceifa_luminosa'
  | 'falanx_onda_luz'
  | 'kamui_chamado_sagrado'
  | 'torvyx_visao_celestial'
  | 'umael_imposicao_duelo'
  | 'polus_golpe_penetrante'
  | 'vergor_metamorfo_divino'
  | 'xeno_julgamento_paralizante'
  | 'zael_bencao_ressurreicao'
  | 'zael_exilio_crepusculo'
  | 'faleziel_revelacao_angiris'
  | 'kaliel_bencao_global'
  | 'kaliel_comunhao_angiris'
  | 'saniel_ascensao_lvl2'
  | 'targor_praga_breath'
  | 'atlaziel_fallen_execute'
  | 'barelio_chains_imprison'
  | 'barelio_usurp_tick'
  | 'corte_das_fadas_miracle'
  | 'gangnyr_bleed_slash'
  | 'gangnyr_hemorrhage_burst'
  | 'hamelia_putrid_corrosion'
  | 'celia_frost_bonus'
  | 'celia_ice_barrier'
  | 'vilma_fire_bonus'
  | 'vilma_fire_barrier'
  | 'mago_uhr_draw_arcana'
  | 'gough_arrow_forge';

export interface UnitVfxEvent {
  id: string;
  type: UnitVfxType;
  sourceId?: string;
  secondarySourceId?: string;
  targetIds?: string[];
  targetPoints?: Point[];
  ownerSide?: 'player' | 'opponent';
  targetPlayerSide?: 'player' | 'opponent';
  label?: string;
  previewMode?: boolean;
}

export const UNIT_VFX_DURATIONS: Record<UnitVfxType, number> = {
  fernando_ember: 1000,
  vilma_fire_wave: 900,
  virtus_impetus: 880,
  salazar_torpor: 850,
  inariel_fire_hit: 920,
  bor_phoenix_rebirth: 2450,
  helio_solar_flare: 950,
  o_sol_heal_helio: 900,
  o_sol_lvl2_oblit_disintegrate: 1900,
  o_sol_lvl2_drain: 900,
  fanx_aqua_blessing: 1080,
  cristalys_aqua_heal: 880,
  vanusa_reveal: 900,
  krust_crypt_reopen: 950,
  glauco_snowflake_def: 1000,
  kore_death_blast: 950,
  juci_dragon_breath: 950,
  bonetrus_frost_fog: 950,
  bonetrus_lvl2_solo_slash: 1850,
  bonetrus_lamina_attach: 1950,
  finn_hp_boost: 900,
  kyn_bonk: 820,
  mara_potion_power: 1000,
  tyn_lightning_dodge: 820,
  atormentador_fusion: 2000,
  atormentador_stun_bolt: 880,
  karaty_chain_lightning: 920,
  barao_well_lvl2_bolts: 920,
  mipo_purple_hp: 850,
  karlo_death_shockwave: 960,
  mesmerino_mirror: 920,
  rainha_liz_power_decree: 920,
  licia_lvl2_light_wave: 1800,
  philio_soul_orb: 880,
  tiryu_self_harm: 800,
  zyk_purple_coin: 1050,
  lunario_sleep_beam: 880,
  lunario_lvl2_consume: 1050,
  a_lua_heal_lunario: 900,
  a_lua_lvl2_sleep: 950,
  a_lua_lvl2_drain: 950,
  a_lua_lunario_obliterate: 1350,
  pcie_shield_block: 820,
  wyr_dragon_heal: 880,
  rei_mauricio_decree: 900,
  saniel_lvl2_drain: 1050,
  ambroz_alvorada_crit: 900,
  bia_furto_feerico: 980,
  nulio_luz_revigorante: 1040,
  lucent_purificacao_ardente: 980,
  mavie_ceifa_luminosa: 960,
  falanx_onda_luz: 1020,
  kamui_chamado_sagrado: 980,
  torvyx_visao_celestial: 960,
  umael_imposicao_duelo: 960,
  polus_golpe_penetrante: 1250,
  vergor_metamorfo_divino: 1450,
  xeno_julgamento_paralizante: 1380,
  zael_bencao_ressurreicao: 1420,
  zael_exilio_crepusculo: 1120,
  faleziel_revelacao_angiris: 1850,
  kaliel_bencao_global: 1850,
  kaliel_comunhao_angiris: 1750,
  saniel_ascensao_lvl2: 1550,
  targor_praga_breath: 1350,
  atlaziel_fallen_execute: 1550,
  barelio_chains_imprison: 1750,
  barelio_usurp_tick: 1250,
  corte_das_fadas_miracle: 1850,
  gangnyr_bleed_slash: 1250,
  gangnyr_hemorrhage_burst: 1550,
  hamelia_putrid_corrosion: 1450,
  celia_frost_bonus: 960,
  celia_ice_barrier: 880,
  vilma_fire_bonus: 960,
  vilma_fire_barrier: 880,
  mago_uhr_draw_arcana: 920,
  gough_arrow_forge: 820,
};

interface Point {
  x: number;
  y: number;
  w?: number;
  h?: number;
}

interface UnitAnimationsOverlayProps {
  vfx: UnitVfxEvent | null;
  onComplete: () => void;
}

function getElementCenter(selector: string): Point | null {
  const els = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
    }
  }
  return null;
}

/**
 * Desenha uma corrente forjada abissal com elos metálicos entrelaçados reais,
 * brilho espectral e partículas de drenagem ao longo da curva quadrática.
 */
function drawForgedAbyssalChain(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curveOffset: number,
  sec: number,
  alpha: number,
  options?: {
    linkSpacing?: number;
    linkLength?: number;
    linkWidth?: number;
    primaryColor?: string;
    highlightColor?: string;
    glowColor?: string;
    siphonParticles?: number;
  }
) {
  const spacing = options?.linkSpacing ?? 13;
  const linkLen = options?.linkLength ?? 15;
  const linkWid = options?.linkWidth ?? 7.5;
  const primary = options?.primaryColor ?? '#a855f7';
  const highlight = options?.highlightColor ?? '#f5d0fe';
  const glow = options?.glowColor ?? '#d946ef';
  const siphonCount = options?.siphonParticles ?? 3;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return;

  const nx = -dy / dist;
  const ny = dx / dist;
  const sway = Math.sin(sec * 3.4 + curveOffset * 0.05) * 6;
  const cx = (x1 + x2) / 2 + nx * (curveOffset + sway);
  const cy = (y1 + y2) / 2 + ny * (curveOffset + sway);

  const sampleQuad = (t: number) => {
    const mt = 1 - t;
    const x = mt * mt * x1 + 2 * mt * t * cx + t * t * x2;
    const y = mt * mt * y1 + 2 * mt * t * cy + t * t * y2;
    const tx = 2 * mt * (cx - x1) + 2 * t * (x2 - cx);
    const ty = 2 * mt * (cy - y1) + 2 * t * (y2 - cy);
    const angle = Math.atan2(ty, tx);
    return { x, y, angle };
  };

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

  // 1. Feixe energético abissal de fundo sob os elos
  ctx.strokeStyle = glow;
  ctx.lineWidth = linkWid + 4;
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 0.25));
  ctx.shadowColor = glow;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(cx, cy, x2, y2);
  ctx.stroke();

  // 2. Elos metálicos entrelaçados (alternando elos abertos e elos de perfil)
  const steps = Math.max(3, Math.floor(dist / spacing));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const pt = sampleQuad(t);
    const isFlatLink = i % 2 === 0;

    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.rotate(pt.angle);

    if (isFlatLink) {
      // Elo oval aberto com furo central
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 0.95));
      ctx.fillStyle = '#1e1030';
      ctx.strokeStyle = primary;
      ctx.lineWidth = 2.6;
      ctx.shadowColor = glow;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(-linkLen / 2, -linkWid / 2, linkLen, linkWid, linkWid / 2);
      ctx.fill();
      ctx.stroke();

      // Brilho especular metálico no topo do elo
      ctx.strokeStyle = highlight;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.roundRect(-linkLen / 2 + 2, -linkWid / 2 + 1.2, linkLen - 4, linkWid - 2.4, (linkWid - 2.4) / 2);
      ctx.stroke();
    } else {
      // Elo conector de perfil (entrelaçando os elos planos)
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.fillStyle = highlight;
      ctx.strokeStyle = '#3b0764';
      ctx.lineWidth = 1.6;
      ctx.shadowColor = glow;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.roundRect(-linkLen * 0.36, -linkWid * 0.26, linkLen * 0.72, linkWid * 0.52, 2.5);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3. Partículas de usurpação fluindo do prisioneiro (x2,y2) para Barelio (x1,y1)
  for (let pIdx = 0; pIdx < siphonCount; pIdx++) {
    const flowT = 1 - ((sec * 0.85 + pIdx / Math.max(1, siphonCount)) % 1);
    const pt = sampleQuad(flowT);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 0.9));
    ctx.fillStyle = pIdx % 2 === 0 ? '#f0abfc' : '#fb7185';
    ctx.shadowColor = '#e879f9';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawShackleCollar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  sec: number,
  alpha: number
) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.translate(x, y);
  ctx.rotate(sec * 0.9);

  ctx.strokeStyle = '#c084fc';
  ctx.fillStyle = 'rgba(24, 9, 38, 0.78)';
  ctx.lineWidth = 3.2;
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Cravos/argolas da algema
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const rx = Math.cos(a) * radius;
    const ry = Math.sin(a) * radius;
    ctx.fillStyle = '#f5d0fe';
    ctx.beginPath();
    ctx.arc(rx, ry, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export const UnitAnimationsOverlay: React.FC<UnitAnimationsOverlayProps> = ({ vfx, onComplete }) => {
  const { animationMode, skillAndUnitVfx } = useVisualPreferences();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const isOff = animationMode === 'off' || !skillAndUnitVfx;
  const isStatic = !isOff && animationMode === 'static';

  useEffect(() => {
    if (!vfx) return;

    const durationMs = isOff ? 40 : isStatic ? 650 : UNIT_VFX_DURATIONS[vfx.type] || 850;
    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      onCompleteRef.current();
    };
    const safetyTimer = window.setTimeout(finish, isOff ? 40 : isStatic ? 650 : durationMs + 250);

    try {
      sound.playUnitVfx(vfx.type);
    } catch {
      // Ignore audio block before user gesture
    }

    if (isOff || isStatic) {
      return () => {
        completed = true;
        window.clearTimeout(safetyTimer);
      };
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return () => {
        completed = true;
        window.clearTimeout(safetyTimer);
      };
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return () => {
        completed = true;
        window.clearTimeout(safetyTimer);
      };
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isPreview = Boolean(vfx.previewMode);

    const resolveSource = (): Point => {
      if (isPreview) {
        return { x: vw * 0.34, y: vh * 0.56, w: 120, h: 170 };
      }
      if (vfx.sourceId) {
        const pt = getElementCenter(`[data-unit-instance-id="${vfx.sourceId}"]`);
        if (pt) return pt;
      }
      return {
        x: vw * 0.5,
        y: vfx.ownerSide === 'opponent' ? vh * 0.28 : vh * 0.72,
        w: 110,
        h: 150,
      };
    };

    const resolveSecondarySource = (): Point => {
      if (isPreview) {
        return { x: vw * 0.5, y: vh * 0.64, w: 110, h: 150 };
      }
      if (vfx.secondarySourceId) {
        const pt = getElementCenter(`[data-unit-instance-id="${vfx.secondarySourceId}"]`);
        if (pt) return pt;
      }
      return { x: vw * 0.65, y: vh * 0.72, w: 110, h: 150 };
    };

    const resolveTargets = (): Point[] => {
      if (isPreview) {
        if (
          vfx.type === 'vilma_fire_wave' ||
          vfx.type === 'kore_death_blast' ||
          vfx.type === 'juci_dragon_breath' ||
          vfx.type === 'bonetrus_frost_fog' ||
          vfx.type === 'karaty_chain_lightning' ||
          vfx.type === 'karlo_death_shockwave' ||
          vfx.type === 'a_lua_lvl2_sleep' ||
          vfx.type === 'a_lua_lunario_obliterate' ||
          vfx.type === 'licia_lvl2_light_wave' ||
          vfx.type === 'rainha_liz_power_decree' ||
          vfx.type === 'rei_mauricio_decree' ||
          vfx.type === 'virtus_impetus' ||
          vfx.type === 'bonetrus_lvl2_solo_slash' ||
          vfx.type === 'falanx_onda_luz' ||
          vfx.type === 'zael_bencao_ressurreicao' ||
          vfx.type === 'kaliel_bencao_global' ||
          vfx.type === 'kaliel_comunhao_angiris' ||
          vfx.type === 'corte_das_fadas_miracle'
        ) {
          const isAlliedBand =
            vfx.type === 'zael_bencao_ressurreicao' ||
            vfx.type === 'kaliel_bencao_global' ||
            vfx.type === 'kaliel_comunhao_angiris' ||
            vfx.type === 'corte_das_fadas_miracle';
          const bandY = isAlliedBand ? vh * 0.58 : vh * 0.36;
          return [
            { x: vw * 0.36, y: bandY, w: 110, h: 150 },
            { x: vw * 0.5, y: bandY - 10, w: 110, h: 150 },
            { x: vw * 0.64, y: bandY, w: 110, h: 150 },
          ];
        }
        if (
          vfx.type === 'barao_well_lvl2_bolts' ||
          vfx.type === 'salazar_torpor' ||
          vfx.type === 'xeno_julgamento_paralizante' ||
          vfx.type === 'targor_praga_breath' ||
          vfx.type === 'atlaziel_fallen_execute'
        ) {
          return [
            { x: vw * 0.41, y: vh * 0.38, w: 110, h: 150 },
            { x: vw * 0.59, y: vh * 0.38, w: 110, h: 150 },
          ];
        }
        return [{ x: vw * 0.64, y: vh * 0.44, w: 120, h: 170 }];
      }

      if (vfx.targetPlayerSide) {
        const hpEl = getElementCenter(`[data-hp-bar="${vfx.targetPlayerSide}"]`);
        if (hpEl) return [hpEl];
        return [{ x: vw * 0.12, y: vfx.targetPlayerSide === 'opponent' ? vh * 0.14 : vh * 0.86 }];
      }

      if (vfx.type === 'krust_crypt_reopen') {
        const side = vfx.ownerSide || 'player';
        const gy = getElementCenter(`[data-graveyard="${side}"]`);
        if (gy) return [gy];
        return [{ x: vw * 0.88, y: side === 'opponent' ? vh * 0.2 : vh * 0.8 }];
      }

      if (vfx.type === 'zyk_purple_coin') {
        const coin = getElementCenter('[data-role-coin="true"]');
        if (coin) return [coin];
        return [{ x: 74, y: vh * 0.5 }];
      }

      if (vfx.targetPoints && vfx.targetPoints.length > 0) {
        return vfx.targetPoints;
      }

      if (vfx.targetIds && vfx.targetIds.length > 0) {
        const pts = vfx.targetIds
          .map(
            (id) =>
              getElementCenter(`[data-unit-instance-id="${id}"]`) ||
              getElementCenter(`[data-barelio-prisoner-id="${id}"]`)
          )
          .filter((p): p is Point => p !== null);
        if (pts.length > 0) return pts;
      }

      const enemySideY = vfx.ownerSide === 'opponent' ? vh * 0.68 : vh * 0.3;
      return [{ x: vw * 0.5, y: enemySideY, w: 110, h: 150 }];
    };

    const resolveZonePoint = (selector: string, fallback: Point): Point => {
      if (isPreview) return fallback;
      const found = getElementCenter(selector);
      return found || fallback;
    };

    const src = resolveSource();
    const secSrc = resolveSecondarySource();
    const targets = resolveTargets();
    const primaryTarget = targets[0] || { x: vw * 0.5, y: vh * 0.5 };

    const seeds = Array.from({ length: 42 }, (_, i) => ({
      angle: (i / 42) * Math.PI * 2 + (i % 3) * 0.17,
      dist: 0.35 + ((i * 29) % 100) / 100,
      speed: 0.6 + ((i * 19) % 100) / 100,
      size: 2.2 + ((i * 13) % 7),
    }));

    const drawBadge = (x: number, y: number, text: string, border: string, textColor: string, alpha: number) => {
      if (!text) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.font = '800 13px "Cinzel", system-ui, sans-serif';
      const padX = 14;
      const metrics = ctx.measureText(text);
      const bw = metrics.width + padX * 2;
      const bh = 28;
      const bx = Math.max(bw / 2 + 12, Math.min(vw - bw / 2 - 12, x));
      const by = Math.max(30, Math.min(vh - 30, y));

      ctx.fillStyle = 'rgba(10, 8, 18, 0.92)';
      ctx.strokeStyle = border;
      ctx.lineWidth = 2;
      ctx.shadowColor = border;
      ctx.shadowBlur = 16;

      ctx.beginPath();
      ctx.roundRect(bx - bw / 2, by - bh / 2, bw, bh, 8);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, bx, by + 0.5);
      ctx.restore();
    };

    const drawBolt = (x1: number, y1: number, x2: number, y2: number, color: string, width: number, alpha: number, phase: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      const steps = 8;
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const jx = Math.sin(phase * 32 + i * 4.3) * 18;
        const jy = Math.cos(phase * 27 + i * 3.7) * 14;
        ctx.lineTo(x1 + (x2 - x1) * t + jx, y1 + (y2 - y1) * t + jy);
      }
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    };

    const drawWingPair = (
      cx: number,
      cy: number,
      span: number,
      openFactor: number,
      primaryColor: string,
      secondaryColor: string,
      alpha: number
    ) => {
      const safeOpen = Math.max(0, Math.min(1.5, openFactor));
      const safeAlpha = Math.max(0, Math.min(1, alpha));
      if (safeAlpha <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = safeAlpha;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 24;
      [-1, 1].forEach((dir) => {
        for (let f = 0; f < 5; f++) {
          const ang = (-0.52 + f * 0.22) * safeOpen;
          const len = Math.max(4, span * (1 - f * 0.11));
          ctx.strokeStyle = f % 2 === 0 ? primaryColor : secondaryColor;
          ctx.lineWidth = Math.max(2.2, 8.5 - f * 1.3);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(cx + dir * 12, cy);
          ctx.quadraticCurveTo(
            cx + dir * len * 0.55,
            cy - Math.abs(Math.cos(ang)) * (span * 0.42) - 10,
            cx + dir * Math.cos(ang * 0.48) * len,
            cy + Math.sin(ang) * (span * 0.35) - 8
          );
          ctx.stroke();
        }
      });
      ctx.restore();
    };

    const drawDivineMandala = (
      cx: number,
      cy: number,
      radius: number,
      rot: number,
      outerColor: string,
      innerColor: string,
      alpha: number
    ) => {
      const safeRadius = Math.max(1, radius);
      const safeAlpha = Math.max(0, Math.min(1, alpha));
      if (safeAlpha <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = safeAlpha;
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.strokeStyle = outerColor;
      ctx.lineWidth = 2.6;
      ctx.shadowColor = outerColor;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, 0, safeRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = innerColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const r = i % 2 === 0 ? safeRadius * 0.94 : safeRadius * 0.56;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    };

    const startTime = performance.now();

    const render = (now: number) => {
      if (completed) return;
      const elapsed = Math.max(0, now - startTime);
      const p = Math.max(0, Math.min(1, elapsed / durationMs));
      const sec = elapsed / 1000;
      const fadeIn = Math.min(1, p / 0.14);
      const fadeOut = p > 0.78 ? Math.max(0, 1 - (p - 0.78) / 0.22) : 1;
      const masterAlpha = Math.max(0, Math.min(fadeIn, fadeOut));

      ctx.clearRect(0, 0, vw, vh);

      try {
      // Helper: Pequena Orbe Elemental com trajetória curva fluida, captura espiralada e fusão suave na unidade alvo
      const drawElementalIntegrationOrb = (opts: {
        coreColor: string;
        midColor: string;
        outerColor: string;
        glowColor: string;
        elementKind: 'fire' | 'ice' | 'electric' | 'divine';
        badgeText: string;
        badgeBorder: string;
        badgeTextCol: string;
      }) => {
        const tx = primaryTarget.x;
        const ty = primaryTarget.y;
        const cw = primaryTarget.w || 96;
        const ch = primaryTarget.h || 134;
        const selfCast = Math.hypot(src.x - tx, src.y - ty) < 22;

        // Curva orgânica S-Bézier com aproximação em espiral suave até o coração da carta
        const dx = tx - src.x;
        const dy = ty - src.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const curveSign = src.x <= tx ? 1 : -1;
        const ctrl1X = src.x + dx * 0.28 + perpX * 48 * curveSign;
        const ctrl1Y = src.y + dy * 0.28 + perpY * 48 * curveSign - 34;
        const ctrl2X = src.x + dx * 0.76 - perpX * 26 * curveSign;
        const ctrl2Y = src.y + dy * 0.76 - perpY * 26 * curveSign - 24;

        const sampleOrbPos = (prog: number): { x: number; y: number } => {
          if (selfCast) {
            const orbitT = Math.min(1, prog / 0.68);
            const easeOrb = 1 - Math.pow(1 - orbitT, 2.35);
            const rad = 46 * (1 - easeOrb);
            const ang = -Math.PI * 0.55 + easeOrb * Math.PI * 2.85;
            return {
              x: tx + Math.cos(ang) * rad,
              y: ty + Math.sin(ang) * rad * 0.82,
            };
          }
          const flightEnd = 0.54;
          const spiralEnd = 0.70;
          if (prog <= flightEnd) {
            const u = Math.max(0, Math.min(1, prog / flightEnd));
            // Smoothstep cúbico para aceleração e desaceleração orgânicas
            const t = u * u * (3 - 2 * u);
            const mt = 1 - t;
            // Aproxima-se da borda orbital (raio 24px) antes de espiralar para o centro
            const entryX = tx + Math.cos(-Math.PI * 0.35) * 24;
            const entryY = ty + Math.sin(-Math.PI * 0.35) * 20;
            const x =
              mt * mt * mt * src.x +
              3 * mt * mt * t * ctrl1X +
              3 * mt * t * t * ctrl2X +
              t * t * t * entryX;
            const y =
              mt * mt * mt * src.y +
              3 * mt * mt * t * ctrl1Y +
              3 * mt * t * t * ctrl2Y +
              t * t * t * entryY;
            return { x, y };
          }
          const s = Math.max(0, Math.min(1, (prog - flightEnd) / (spiralEnd - flightEnd)));
          const sEase = 1 - Math.pow(1 - s, 2.2);
          const rad = 24 * (1 - sEase);
          const ang = -Math.PI * 0.35 + sEase * Math.PI * 1.95;
          return {
            x: tx + Math.cos(ang) * rad,
            y: ty + Math.sin(ang) * rad * 0.84,
          };
        };

        const spawnT = Math.min(1, p / 0.14);
        const orbPos = sampleOrbPos(p);
        const ox = orbPos.x;
        const oy = orbPos.y;
        const mergeStart = selfCast ? 0.56 : 0.60;
        const integrateT = Math.max(0, Math.min(1, (p - mergeStart) / (1 - mergeStart)));

        ctx.save();
        ctx.globalAlpha = masterAlpha;

        // Fase 1: Anel suave de condensação na carta de origem (0..0.24)
        if (!selfCast && p < 0.28) {
          const launchT = p / 0.28;
          ctx.save();
          ctx.globalAlpha = (1 - launchT) * 0.72 * masterAlpha;
          ctx.strokeStyle = opts.coreColor;
          ctx.lineWidth = 2.2 * (1 - launchT * 0.4);
          ctx.shadowColor = opts.glowColor;
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(src.x, src.y, 10 + launchT * 28, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Fase 2: Fita luminosa contínua e partículas elementais acompanhando a curva da orbe
        if (integrateT < 0.42) {
          const trailFade = 1 - integrateT / 0.42;
          const samples = 16;
          ctx.save();
          for (let s = samples; s >= 1; s--) {
            const sampleP = Math.max(0, p - s * 0.015);
            const prevP = Math.max(0, p - (s - 1) * 0.015);
            const ptA = sampleOrbPos(sampleP);
            const ptB = sampleOrbPos(prevP);
            const ratio = 1 - s / (samples + 1);
            ctx.strokeStyle = s % 3 === 0 ? '#ffffff' : s % 2 === 0 ? opts.coreColor : opts.midColor;
            ctx.lineWidth = Math.max(1.2, ratio * 10.5 * spawnT);
            ctx.lineCap = 'round';
            ctx.globalAlpha = trailFade * ratio * ratio * 0.72 * masterAlpha;
            ctx.shadowColor = opts.glowColor;
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.moveTo(ptA.x, ptA.y);
            ctx.lineTo(ptB.x, ptB.y);
            ctx.stroke();
          }

          // Micro-faíscas orbitando a cauda durante o trajeto
          for (let m = 0; m < 7; m++) {
            const mP = Math.max(0, p - 0.02 - m * 0.025);
            const mPt = sampleOrbPos(mP);
            const mAng = sec * 9 + m * 1.4;
            const mRad = 6 + (m % 3) * 4.5;
            ctx.fillStyle = m % 2 === 0 ? '#ffffff' : opts.coreColor;
            ctx.globalAlpha = trailFade * (1 - m / 8) * 0.85 * masterAlpha;
            ctx.beginPath();
            ctx.arc(
              mPt.x + Math.cos(mAng) * mRad,
              mPt.y + Math.sin(mAng) * mRad,
              Math.max(1.2, 2.8 - m * 0.25),
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
          ctx.restore();
        }

        // Pequena Orbe Elemental translúcida e fluida (contrai suavemente ao fundir-se no centro da carta)
        if (integrateT < 0.45) {
          const shrinkEase = integrateT <= 0 ? 1 : Math.pow(1 - integrateT / 0.45, 1.55);
          const orbScale = Math.min(1, spawnT * 1.15) * shrinkEase;
          const breathe = 1 + Math.sin(sec * 20) * 0.08;
          const rOuter = 14.5 * orbScale * breathe;

          ctx.save();
          ctx.globalAlpha = masterAlpha * Math.min(1, orbScale * 1.15);

          // Halo volumétrico macio
          const orbGrad = ctx.createRadialGradient(ox, oy, 1, ox, oy, Math.max(2, rOuter * 2.15));
          orbGrad.addColorStop(0, '#ffffff');
          orbGrad.addColorStop(0.24, opts.coreColor);
          orbGrad.addColorStop(0.56, opts.midColor);
          orbGrad.addColorStop(0.84, opts.outerColor);
          orbGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = orbGrad;
          ctx.shadowColor = opts.glowColor;
          ctx.shadowBlur = 24;
          ctx.beginPath();
          ctx.arc(ox, oy, Math.max(2, rOuter * 2.15), 0, Math.PI * 2);
          ctx.fill();

          // Núcleo cristalino brilhante
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ox, oy, Math.max(1.5, 5.4 * orbScale), 0, Math.PI * 2);
          ctx.fill();

          // Assinatura elemental exclusiva da orbe
          if (opts.elementKind === 'fire') {
            // Línguas de chama sinuosas envolvendo a orbe ígnea de Fernando
            for (let f = 0; f < 3; f++) {
              const fa = sec * 8 + (f * Math.PI * 2) / 3;
              const fx = ox + Math.cos(fa) * 10 * orbScale;
              const fy = oy + Math.sin(fa) * 10 * orbScale;
              ctx.strokeStyle = f === 0 ? '#fef08a' : '#fb923c';
              ctx.lineWidth = 2.2 * orbScale;
              ctx.beginPath();
              ctx.arc(ox, oy, (11 + f * 3) * orbScale, fa, fa + Math.PI * 0.72);
              ctx.stroke();
              ctx.fillStyle = '#fde047';
              ctx.beginPath();
              ctx.arc(fx, fy, 2.4 * orbScale, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (opts.elementKind === 'ice') {
            // Duplo floco hexagonal cristalino rotativo da orbe gélida de Glauco
            ctx.save();
            ctx.translate(ox, oy);
            ctx.rotate(sec * 4.5);
            ctx.strokeStyle = '#e0f2fe';
            ctx.lineWidth = 1.65;
            for (let b = 0; b < 6; b++) {
              const a = (b * Math.PI) / 3;
              const len = 15.5 * orbScale;
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
              ctx.stroke();
              // Ramos do cristal
              const bx = Math.cos(a) * len * 0.58;
              const by = Math.sin(a) * len * 0.58;
              ctx.beginPath();
              ctx.moveTo(bx, by);
              ctx.lineTo(bx + Math.cos(a + 0.6) * 4.8 * orbScale, by + Math.sin(a + 0.6) * 4.8 * orbScale);
              ctx.moveTo(bx, by);
              ctx.lineTo(bx + Math.cos(a - 0.6) * 4.8 * orbScale, by + Math.sin(a - 0.6) * 4.8 * orbScale);
              ctx.stroke();
            }
            ctx.restore();
          } else if (opts.elementKind === 'electric') {
            // Micro-arcos voltaicos orbitais da orbe elétrica de Mara
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(ox, oy, 14.5 * orbScale, 0, Math.PI * 2);
            ctx.stroke();
            for (let k = 0; k < 4; k++) {
              const a1 = (k / 4) * Math.PI * 2 + sec * 13;
              const a2 = a1 + 0.9;
              const rx1 = ox + Math.cos(a1) * 16.5 * orbScale;
              const ry1 = oy + Math.sin(a1) * 16.5 * orbScale;
              const rx2 = ox + Math.cos(a2) * 18.5 * orbScale;
              const ry2 = oy + Math.sin(a2) * 18.5 * orbScale;
              drawBolt(ox, oy, rx1, ry1, '#fef08a', 1.7, masterAlpha * orbScale, sec + k);
              drawBolt(rx1, ry1, rx2, ry2, '#c084fc', 1.2, masterAlpha * orbScale * 0.85, sec + k + 5);
            }
          } else if (opts.elementKind === 'divine') {
            // Micro-halo celestial e estrela de 4 pontas da orbe divina de Nulio
            ctx.save();
            ctx.translate(ox, oy);
            ctx.rotate(sec * 3.2);
            ctx.strokeStyle = '#fef9c3';
            ctx.lineWidth = 1.7;
            ctx.beginPath();
            ctx.arc(0, 0, 14.5 * orbScale, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = '#a7f3d0';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(0, 0, 19 * orbScale, sec, sec + Math.PI * 1.2);
            ctx.stroke();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(-19 * orbScale, 0);
            ctx.lineTo(19 * orbScale, 0);
            ctx.moveTo(0, -19 * orbScale);
            ctx.lineTo(0, 19 * orbScale);
            ctx.stroke();
            ctx.restore();
          }
          ctx.restore();
        }

        // Fase 3: Fusão & Integração Suave dentro da carta escolhida
        if (integrateT > 0) {
          const easeOut = 1 - Math.pow(1 - integrateT, 2.8);
          const bellAlpha = Math.sin(integrateT * Math.PI);
          const impFade = 1 - integrateT;

          // 3A. Brilho interno suave irradiando do coração da unidade + varredura especular líquida sobre a carta
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(tx - cw / 2 - 2, ty - ch / 2 - 2, cw + 4, ch + 4, 11);
          ctx.clip();

          // Núcleo de absorção interna
          ctx.globalAlpha = bellAlpha * 0.72 * masterAlpha;
          const absorbGrad = ctx.createRadialGradient(tx, ty, 3, tx, ty, Math.max(cw, ch) * 0.85);
          absorbGrad.addColorStop(0, '#ffffff');
          absorbGrad.addColorStop(0.32, opts.coreColor);
          absorbGrad.addColorStop(0.68, opts.midColor);
          absorbGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = absorbGrad;
          ctx.fillRect(tx - cw / 2 - 6, ty - ch / 2 - 6, cw + 12, ch + 12);

          // Varredura diagonal de luz líquida integrando o buff na superfície da carta
          const sweepShift = -cw * 1.15 + easeOut * (cw * 2.3 + ch * 0.55);
          ctx.globalAlpha = bellAlpha * 0.82 * masterAlpha;
          const sheenGrad = ctx.createLinearGradient(
            tx - cw / 2 + sweepShift - 36,
            ty - ch / 2,
            tx - cw / 2 + sweepShift + 36,
            ty + ch / 2
          );
          sheenGrad.addColorStop(0, 'transparent');
          sheenGrad.addColorStop(0.42, opts.coreColor);
          sheenGrad.addColorStop(0.5, '#ffffff');
          sheenGrad.addColorStop(0.58, opts.midColor);
          sheenGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = sheenGrad;
          ctx.fillRect(tx - cw / 2 - 6, ty - ch / 2 - 6, cw + 12, ch + 12);
          ctx.restore();

          // 3B. Moldura luminosa respirando em harmonia com o elemento
          ctx.save();
          ctx.globalAlpha = bellAlpha * 0.95 * masterAlpha;
          ctx.strokeStyle = opts.coreColor;
          ctx.lineWidth = 3.2;
          ctx.shadowColor = opts.glowColor;
          ctx.shadowBlur = 22;
          ctx.beginPath();
          ctx.roundRect(tx - cw / 2 - 3, ty - ch / 2 - 3, cw + 6, ch + 6, 11);
          ctx.stroke();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.25;
          ctx.globalAlpha = bellAlpha * 0.7 * masterAlpha;
          ctx.beginPath();
          ctx.roundRect(tx - cw / 2 - 1, ty - ch / 2 - 1, cw + 2, ch + 2, 10);
          ctx.stroke();
          ctx.restore();

          // 3C. Dois anéis harmônicos concêntricos de ressonância elemental
          for (let r = 0; r < 2; r++) {
            const rt = Math.max(0, easeOut - r * 0.14);
            if (rt <= 0) continue;
            ctx.save();
            ctx.globalAlpha = impFade * (r === 0 ? 0.9 : 0.68) * masterAlpha;
            ctx.strokeStyle = r === 0 ? opts.coreColor : opts.outerColor;
            ctx.lineWidth = (r === 0 ? 3.2 : 1.9) * (1 - integrateT * 0.45);
            ctx.shadowColor = opts.glowColor;
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.arc(tx, ty, 12 + rt * (62 + r * 20), 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          // 3D. Emanação final temática ao redor da unidade integrada
          ctx.save();
          if (opts.elementKind === 'electric') {
            for (let e = 0; e < 4; e++) {
              const ea = (e / 4) * Math.PI * 2 + sec * 6;
              const sx = tx + Math.cos(ea) * (cw * 0.45);
              const sy = ty + Math.sin(ea) * (ch * 0.42);
              const ex = tx + Math.cos(ea + 0.5) * (cw * 0.56 + easeOut * 14);
              const ey = ty + Math.sin(ea + 0.5) * (ch * 0.5 + easeOut * 14);
              drawBolt(sx, sy, ex, ey, e % 2 === 0 ? '#fef08a' : '#c084fc', 1.8, impFade * masterAlpha, sec + e * 3);
            }
          }
          for (let i = 0; i < 16; i++) {
            const ang = (i / 16) * Math.PI * 2 + (opts.elementKind === 'divine' ? sec * 1.2 : sec * 2.1);
            const distP = 14 + easeOut * (46 + (i % 3) * 16);
            const rise =
              opts.elementKind === 'fire' || opts.elementKind === 'divine'
                ? easeOut * 28
                : opts.elementKind === 'ice'
                ? -easeOut * 8
                : 0;
            const px = tx + Math.cos(ang) * distP;
            const py = ty + Math.sin(ang) * distP * 0.88 - rise;
            ctx.fillStyle = i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? opts.coreColor : opts.midColor;
            ctx.shadowColor = opts.glowColor;
            ctx.shadowBlur = 10;
            ctx.globalAlpha = impFade * 0.92 * masterAlpha;
            ctx.beginPath();
            if (opts.elementKind === 'ice' && i % 2 === 0) {
              // Pequeno losango de cristal gélido
              const sz = 4.2 * (1 - integrateT * 0.35);
              ctx.moveTo(px, py - sz);
              ctx.lineTo(px + sz * 0.72, py);
              ctx.lineTo(px, py + sz);
              ctx.lineTo(px - sz * 0.72, py);
              ctx.closePath();
            } else {
              ctx.arc(px, py, Math.max(1.2, 3.1 * (1 - integrateT * 0.42)), 0, Math.PI * 2);
            }
            ctx.fill();
          }
          ctx.restore();
        }

        ctx.restore();
        drawBadge(tx, ty - 86, vfx.label || opts.badgeText, opts.badgeBorder, opts.badgeTextCol, masterAlpha);
      };

      switch (vfx.type) {
        // 1. FERNANDO (MODERNIZADO): Pequena orbe ígnea se integrando à unidade escolhida
        case 'fernando_ember': {
          drawElementalIntegrationOrb({
            coreColor: '#fef08a',
            midColor: '#fb923c',
            outerColor: '#ef4444',
            glowColor: '#f97316',
            elementKind: 'fire',
            badgeText: '🔥 +4 PODER (ORBE ÍGNEA DE FERNANDO)',
            badgeBorder: '#f97316',
            badgeTextCol: '#ffedd5',
          });
          break;
        }

        // 2. VILMA (MODERNIZADA): Onda de chamas ígneas e brasas varrendo todas as unidades inimigas
        case 'vilma_fire_wave': {
          const sweepProg = Math.min(1, p / 0.72);
          const easeSweep = 1 - Math.pow(1 - sweepProg, 2.2);
          const sweepX = vw * (0.04 + easeSweep * 0.92);
          const bandY = targets.length > 0 ? targets[0].y : vh * 0.32;

          ctx.save();
          ctx.globalAlpha = masterAlpha;

          // Frente de onda ígnea volumétrica em camadas
          const waveGrad = ctx.createLinearGradient(sweepX - 240, bandY, sweepX + 55, bandY);
          waveGrad.addColorStop(0, 'transparent');
          waveGrad.addColorStop(0.32, 'rgba(185, 28, 28, 0.48)');
          waveGrad.addColorStop(0.68, 'rgba(249, 115, 22, 0.85)');
          waveGrad.addColorStop(0.9, 'rgba(254, 240, 138, 0.96)');
          waveGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = waveGrad;
          ctx.beginPath();
          ctx.moveTo(sweepX - 240, bandY - 78);
          ctx.quadraticCurveTo(sweepX + 46, bandY - 56, sweepX + 52, bandY);
          ctx.quadraticCurveTo(sweepX + 46, bandY + 56, sweepX - 240, bandY + 78);
          ctx.closePath();
          ctx.fill();

          // Línguas de fogo e brasas acompanhando a frente da onda
          for (let f = 0; f < 16; f++) {
            const fy = bandY - 68 + (f / 15) * 136;
            const fx = sweepX - (f % 5) * 34 - Math.sin(sec * 16 + f) * 14;
            const fr = 5 + (f % 3) * 3;
            ctx.fillStyle = f % 3 === 0 ? '#fef08a' : f % 2 === 0 ? '#fb923c' : '#ef4444';
            ctx.shadowColor = '#f97316';
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.arc(fx, fy, fr * (1 - p * 0.35), 0, Math.PI * 2);
            ctx.fill();
          }

          // Impacto flamejante em cada inimigo atingido
          targets.forEach((tg, idx) => {
            const hitDelay = Math.min(0.45, Math.max(0, (tg.x / vw) * 0.55));
            const localT = Math.max(0, Math.min(1, (p - hitDelay) / (1 - hitDelay)));
            if (localT <= 0) return;

            const burstGrad = ctx.createRadialGradient(tg.x, tg.y, 4, tg.x, tg.y, 58 + localT * 26);
            burstGrad.addColorStop(0, `rgba(255, 255, 255, ${(1 - localT) * 0.9})`);
            burstGrad.addColorStop(0.35, `rgba(251, 146, 60, ${(1 - localT * 0.65) * 0.85})`);
            burstGrad.addColorStop(0.75, `rgba(220, 38, 38, ${(1 - localT) * 0.45})`);
            burstGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = burstGrad;
            ctx.beginPath();
            ctx.arc(tg.x, tg.y, 58 + localT * 26, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 3.2 * (1 - localT * 0.6);
            ctx.shadowColor = '#f97316';
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.arc(tg.x, tg.y, 16 + localT * 52, 0, Math.PI * 2);
            ctx.stroke();

            // Fagulhas subindo da unidade queimada
            for (let e = 0; e < 6; e++) {
              const ang = (e / 6) * Math.PI * 2 + idx + sec * 3;
              const ex = tg.x + Math.cos(ang) * (18 + localT * 28);
              const ey = tg.y + Math.sin(ang) * 18 - localT * 36;
              ctx.fillStyle = e % 2 === 0 ? '#fef08a' : '#fb923c';
              ctx.beginPath();
              ctx.arc(ex, ey, 3 * (1 - localT * 0.5), 0, Math.PI * 2);
              ctx.fill();
            }
          });
          ctx.restore();
          drawBadge(vw * 0.5, bandY - 96, vfx.label || '🔥 CHAMA DE VILMA · -2 DANO EM TODOS OS INIMIGOS', '#f97316', '#fef3c7', masterAlpha);
          break;
        }

        // 3. VIRTUS: Ímpeto flamejante acende em todas as unidades aliadas
        case 'virtus_impetus': {
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          targets.forEach((tg) => {
            const h = 44 + Math.sin(p * Math.PI) * 58;
            const g = ctx.createRadialGradient(tg.x, tg.y + 20, 6, tg.x, tg.y - 10, h);
            g.addColorStop(0, 'rgba(254, 240, 138, 0.88)');
            g.addColorStop(0.5, 'rgba(249, 115, 22, 0.55)');
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(tg.x, tg.y, h, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fb923c';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect(tg.x - 46, tg.y - 62, 92, 124, 10);
            ctx.stroke();
          });
          ctx.restore();
          drawBadge(primaryTarget.x, primaryTarget.y - 82, vfx.label || '🔥 ÍMPETO DE VIRTUS · +1/+1/+1', '#f97316', '#ffedd5', masterAlpha);
          break;
        }

        // 4. SALAZAR: Torpor dedicado nos 2 alvos
        case 'salazar_torpor': {
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          targets.forEach((tg) => {
            for (let ring = 0; ring < 3; ring++) {
              ctx.save();
              ctx.translate(tg.x, tg.y);
              ctx.rotate(sec * (2.5 + ring) + ring);
              ctx.strokeStyle = ring % 2 === 0 ? '#a855f7' : '#f97316';
              ctx.lineWidth = 3;
              ctx.setLineDash([12, 8]);
              ctx.beginPath();
              ctx.arc(0, 0, 26 + ring * 14, 0, Math.PI * 1.65);
              ctx.stroke();
              ctx.restore();
            }
          });
          ctx.restore();
          drawBadge(primaryTarget.x, primaryTarget.y - 78, vfx.label || '🌀 TORPOR DE SALAZAR', '#c084fc', '#f3e8ff', masterAlpha);
          break;
        }

        // 5. INARIEL (RENOVADO): Asas seráficas flamejantes + lâmina solar gravando Queimadura
        case 'inariel_fire_hit': {
          const tx = primaryTarget.x;
          const ty = primaryTarget.y;
          const wingOpen = Math.min(1, p / 0.48);
          drawWingPair(src.x, src.y, 118, wingOpen, '#fbbf24', '#ef4444', masterAlpha * 0.85);

          ctx.save();
          ctx.globalAlpha = masterAlpha;
          // Halo flamejante ao redor do alvo
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 22;
          ctx.beginPath();
          ctx.arc(tx, ty, 38 + Math.sin(p * Math.PI) * 26, 0, Math.PI * 2);
          ctx.stroke();

          // Corte duplo em cruz flamejante
          const s1 = Math.min(1, p / 0.5);
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 6.5;
          ctx.beginPath();
          ctx.moveTo(tx - 64, ty - 64);
          ctx.lineTo(tx - 64 + 128 * s1, ty - 64 + 128 * s1);
          ctx.stroke();
          if (p > 0.18) {
            const s2 = Math.min(1, (p - 0.18) / 0.45);
            ctx.strokeStyle = '#fb923c';
            ctx.beginPath();
            ctx.moveTo(tx + 64, ty - 64);
            ctx.lineTo(tx + 64 - 128 * s2, ty - 64 + 128 * s2);
            ctx.stroke();
          }

          for (let i = 0; i < 16; i++) {
            const ang = (i / 16) * Math.PI * 2 + sec * 2.4;
            const d = 22 + p * 68;
            ctx.fillStyle = i % 2 === 0 ? '#fef08a' : '#ef4444';
            ctx.beginPath();
            ctx.arc(tx + Math.cos(ang) * d, ty + Math.sin(ang) * d, 5 * (1 - p * 0.55), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          drawBadge(tx, ty - 84, vfx.label || '🔥🪽 LÂMINA ARDENTE DE INARIEL · QUEIMADURA!', '#ef4444', '#fef3c7', masterAlpha);
          break;
        }

        // 6. GENERAL BOR: Renascimento Exclusivo do Mesofênix (2.45s cinematográfico)
        case 'bor_phoenix_rebirth': {
          const cx = src.x;
          const cy = src.y;
          const cardW = src.w || 110;
          const cardH = src.h || 154;
          const prefersReduced =
            typeof window !== 'undefined' &&
            Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

          if (prefersReduced) {
            ctx.save();
            ctx.globalAlpha = masterAlpha;
            const halo = ctx.createRadialGradient(cx, cy, 10, cx, cy, 165);
            halo.addColorStop(0, 'rgba(255, 247, 237, 0.85)');
            halo.addColorStop(0.35, 'rgba(249, 115, 22, 0.65)');
            halo.addColorStop(0.7, 'rgba(185, 28, 28, 0.35)');
            halo.addColorStop(1, 'transparent');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(cx, cy, 165, 0, Math.PI * 2);
            ctx.fill();

            drawWingPair(cx, cy - 10, 175, 1.0, '#f97316', '#fde047', masterAlpha * 0.92);

            ctx.strokeStyle = '#fb923c';
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#ea580c';
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.roundRect(cx - cardW * 0.56, cy - cardH * 0.56, cardW * 1.12, cardH * 1.12, 14);
            ctx.stroke();
            ctx.restore();

            drawBadge(
              cx,
              cy - cardH * 0.72 - 26,
              vfx.label || '🔥🦅 O MESOFÊNIX RENASCEU! +50% ATRIBUTOS · CURA',
              '#f97316',
              '#fef3c7',
              masterAlpha
            );
            break;
          }

          // Timelines for 4 dramatic phases
          const ashPhase = Math.min(1, p / 0.25); // 0..0.25: Ash implosion & molten egg
          const eruptPhase = Math.max(0, Math.min(1, (p - 0.18) / 0.30)); // 0.18..0.48: Fire pillar & Phoenix eruption
          const eruptEase = 1 - Math.pow(1 - eruptPhase, 3);
          const wingPhase = Math.max(0, Math.min(1, (p - 0.22) / 0.36)); // 0.22..0.58: Giant Phoenix wings unfurl
          const wingEase = 1 - Math.pow(1 - wingPhase, 2.6);
          const shockPhase = Math.max(0, Math.min(1, (p - 0.24) / 0.42)); // 0.24..0.66: Blazing shockwave rings
          const emberPhase = Math.max(0, Math.min(1, (p - 0.20) / 0.80)); // 0.20..1.00: Swirling rising embers & fire feathers

          ctx.save();
          ctx.globalAlpha = masterAlpha;

          // ── STAGE 0: Subtle volcanic heat backdrop vignette focused on Bor ──
          const heatGlow = ctx.createRadialGradient(cx, cy, 12, cx, cy, 340);
          const heatAlpha = Math.sin(Math.min(1, p / 0.85) * Math.PI) * 0.42;
          heatGlow.addColorStop(0, `rgba(251, 146, 60, ${heatAlpha})`);
          heatGlow.addColorStop(0.45, `rgba(185, 28, 28, ${heatAlpha * 0.72})`);
          heatGlow.addColorStop(1, 'transparent');
          ctx.fillStyle = heatGlow;
          ctx.beginPath();
          ctx.arc(cx, cy, 340, 0, Math.PI * 2);
          ctx.fill();

          // ── STAGE 1: Ash Vortex Implosion & Molten Flame Sigil (0.00 - 0.32) ──
          if (p < 0.38) {
            const implodeFade = p < 0.24 ? 1 : Math.max(0, 1 - (p - 0.24) / 0.14);
            for (let i = 0; i < 28; i++) {
              const seed = (i * 137.5 * Math.PI) / 180;
              const startDist = 115 + (i % 5) * 26;
              const dist = Math.max(4, startDist * (1 - Math.pow(ashPhase, 1.55)));
              const ang = seed + ashPhase * 3.6;
              const ax = cx + Math.cos(ang) * dist;
              const ay = cy + Math.sin(ang) * dist * 0.82;
              const sz = 2.6 + (i % 4) * 1.4;

              ctx.save();
              ctx.globalAlpha = masterAlpha * implodeFade * 0.92;
              ctx.fillStyle = i % 3 === 0 ? '#1c1917' : i % 3 === 1 ? '#dc2626' : '#fb923c';
              ctx.shadowColor = '#f97316';
              ctx.shadowBlur = i % 3 === 0 ? 4 : 12;
              ctx.translate(ax, ay);
              ctx.rotate(ang);
              ctx.beginPath();
              ctx.ellipse(0, 0, sz * 1.4, sz * 0.65, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
          }

          // Rotating Molten Phoenix Flame Sigil beneath Bor
          const sigilRadius = 56 + eruptEase * 46;
          const sigilAlpha = masterAlpha * (p < 0.82 ? 0.85 : Math.max(0, 1 - (p - 0.82) / 0.18) * 0.85);
          if (sigilAlpha > 0.02) {
            ctx.save();
            ctx.translate(cx, cy + cardH * 0.18);
            ctx.scale(1, 0.42);
            ctx.rotate(sec * 1.6);
            ctx.globalAlpha = sigilAlpha;
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#ea580c';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(0, 0, sigilRadius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(0, 0, sigilRadius * 0.78, 0, Math.PI * 2);
            ctx.stroke();

            // 8-point blazing solar star
            ctx.beginPath();
            for (let s = 0; s < 16; s++) {
              const a = (s * Math.PI) / 8;
              const r = s % 2 === 0 ? sigilRadius * 1.08 : sigilRadius * 0.56;
              if (s === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
              else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
          }

          // ── STAGE 2: Erupting Solar Fire Pillar (0.18 - 0.88) ──
          if (eruptPhase > 0) {
            const pillarFade = p < 0.68 ? Math.min(1, eruptPhase * 1.4) : Math.max(0, 1 - (p - 0.68) / 0.24);
            const pillarW = (62 + Math.sin(sec * 18) * 8) * (0.55 + eruptEase * 0.65);
            const pillarTop = Math.max(0, cy - 60 - eruptEase * (cy + 140));
            const pillarBot = cy + cardH * 0.62;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = masterAlpha * pillarFade * 0.85;

            // Outer crimson flame column
            const outerPillar = ctx.createLinearGradient(cx - pillarW, cy, cx + pillarW, cy);
            outerPillar.addColorStop(0, 'transparent');
            outerPillar.addColorStop(0.22, 'rgba(220, 38, 38, 0.55)');
            outerPillar.addColorStop(0.5, 'rgba(249, 115, 22, 0.9)');
            outerPillar.addColorStop(0.78, 'rgba(220, 38, 38, 0.55)');
            outerPillar.addColorStop(1, 'transparent');
            ctx.fillStyle = outerPillar;
            ctx.fillRect(cx - pillarW, pillarTop, pillarW * 2, pillarBot - pillarTop);

            // Inner white-hot plasma core
            const innerW = pillarW * 0.42;
            const innerPillar = ctx.createLinearGradient(cx - innerW, cy, cx + innerW, cy);
            innerPillar.addColorStop(0, 'transparent');
            innerPillar.addColorStop(0.5, 'rgba(255, 247, 237, 0.92)');
            innerPillar.addColorStop(1, 'transparent');
            ctx.fillStyle = innerPillar;
            ctx.fillRect(cx - innerW, pillarTop + 20, innerW * 2, Math.max(10, pillarBot - pillarTop - 20));
            ctx.restore();
          }

          // ── STAGE 2B: Incandescent Central Phoenix Heart Flash ──
          const corePulse = p < 0.26 ? 0.35 + ashPhase * 0.65 : Math.max(0.2, 1 - (p - 0.26) * 0.95);
          const coreRadius = 38 + eruptEase * 125;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = masterAlpha * corePulse;
          const coreG = ctx.createRadialGradient(cx, cy, 4, cx, cy, coreRadius);
          coreG.addColorStop(0, 'rgba(255, 251, 235, 1)');
          coreG.addColorStop(0.24, 'rgba(254, 240, 138, 0.92)');
          coreG.addColorStop(0.52, 'rgba(249, 115, 22, 0.68)');
          coreG.addColorStop(0.82, 'rgba(185, 28, 28, 0.28)');
          coreG.addColorStop(1, 'transparent');
          ctx.fillStyle = coreG;
          ctx.beginPath();
          ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // ── STAGE 2C: Sculpted Blazing Phoenix Rising with Sweeping Multi-Layered Wings ──
          if (wingPhase > 0) {
            const phoenixRise = eruptEase * 32 + Math.sin(sec * 5.2) * 5;
            const px = cx;
            const py = cy - 6 - phoenixRise;
            const flap = Math.sin(sec * 7.8) * 0.11;
            const wingSpan = 65 + wingEase * Math.min(245, vw * 0.24);
            const phoenixAlpha =
              masterAlpha * (p < 0.78 ? Math.min(1, wingPhase * 1.45) : Math.max(0, 1 - (p - 0.78) / 0.22));

            ctx.save();
            ctx.globalAlpha = phoenixAlpha;
            ctx.globalCompositeOperation = 'lighter';

            // 1. Flowing Phoenix Tail Flame Plumes (3 graceful ribbons trailing below Bor)
            for (let tIdx = -1; tIdx <= 1; tIdx++) {
              const tailSway = Math.sin(sec * 8 + tIdx * 1.4) * 16;
              const tailLen = (85 + (tIdx === 0 ? 35 : 0)) * wingEase;
              const tailGrad = ctx.createLinearGradient(px, py + 14, px + tIdx * 36 + tailSway, py + 24 + tailLen);
              tailGrad.addColorStop(0, '#fef08a');
              tailGrad.addColorStop(0.45, '#f97316');
              tailGrad.addColorStop(0.85, '#dc2626');
              tailGrad.addColorStop(1, 'transparent');
              ctx.strokeStyle = tailGrad;
              ctx.lineWidth = tIdx === 0 ? 7.5 : 5;
              ctx.lineCap = 'round';
              ctx.shadowColor = '#ea580c';
              ctx.shadowBlur = 18;
              ctx.beginPath();
              ctx.moveTo(px + tIdx * 6, py + 12);
              ctx.bezierCurveTo(
                px + tIdx * 24 - tailSway * 0.6,
                py + 18 + tailLen * 0.42,
                px + tIdx * 14 + tailSway,
                py + 22 + tailLen * 0.75,
                px + tIdx * 34 + tailSway * 0.7,
                py + 24 + tailLen
              );
              ctx.stroke();
            }

            // 2. Massive Sweeping Phoenix Wings (8 primary + 5 inner molten feathers per wing)
            [-1, 1].forEach((dir) => {
              // Back crimson fire wash of the wing
              ctx.save();
              ctx.fillStyle = 'rgba(220, 38, 38, 0.28)';
              ctx.shadowColor = '#dc2626';
              ctx.shadowBlur = 32;
              ctx.beginPath();
              ctx.moveTo(px + dir * 10, py + 4);
              ctx.quadraticCurveTo(
                px + dir * wingSpan * 0.56,
                py - wingSpan * (0.58 + flap),
                px + dir * wingSpan * 1.02,
                py - wingSpan * (0.28 + flap * 0.8)
              );
              ctx.quadraticCurveTo(
                px + dir * wingSpan * 0.62,
                py + wingSpan * 0.22,
                px + dir * 10,
                py + 26
              );
              ctx.closePath();
              ctx.fill();
              ctx.restore();

              // 8 sculpted blazing primary wing feathers
              for (let f = 0; f < 8; f++) {
                const ratio = f / 7;
                const fAng = (-0.82 + ratio * 1.38 + flap) * wingEase;
                const fLen = wingSpan * (1.06 - ratio * 0.34);
                const wave = Math.sin(sec * 10 + f * 0.85) * 6;

                const tipX = px + dir * Math.cos(fAng * 0.48) * fLen;
                const tipY = py + Math.sin(fAng) * fLen * 0.56 - (1 - ratio) * 42 + wave;
                const ctrlX = px + dir * fLen * 0.52;
                const ctrlY = py - (1 - ratio) * wingSpan * (0.56 + flap) - 18;

                // Outer crimson-orange fire plume
                const fGrad = ctx.createLinearGradient(px, py, tipX, tipY);
                fGrad.addColorStop(0, '#fff7ed');
                fGrad.addColorStop(0.28, '#fde047');
                fGrad.addColorStop(0.65, '#f97316');
                fGrad.addColorStop(1, '#dc2626');

                ctx.strokeStyle = fGrad;
                ctx.lineWidth = Math.max(3, 13.5 - f * 1.25);
                ctx.lineCap = 'round';
                ctx.shadowColor = '#f97316';
                ctx.shadowBlur = 24;
                ctx.beginPath();
                ctx.moveTo(px + dir * 10, py + f * 2.4);
                ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
                ctx.stroke();

                // White-hot incandescent inner quill on upper feathers
                if (f < 5) {
                  ctx.strokeStyle = 'rgba(255, 251, 235, 0.82)';
                  ctx.lineWidth = Math.max(1.4, 4.2 - f * 0.55);
                  ctx.shadowBlur = 10;
                  ctx.beginPath();
                  ctx.moveTo(px + dir * 12, py + f * 2.2);
                  ctx.quadraticCurveTo(ctrlX, ctrlY + 2, px + (tipX - px) * 0.78, py + (tipY - py) * 0.78);
                  ctx.stroke();
                }
              }
            });

            // 3. Crested Phoenix Head & Solar Crown rising above the wings
            const headY = py - 24 - wingEase * 34;
            ctx.save();
            ctx.translate(px, headY);
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 22;

            // Neck & chest flame silhouette
            const bodyGrad = ctx.createLinearGradient(0, -18, 0, 34);
            bodyGrad.addColorStop(0, '#fff7ed');
            bodyGrad.addColorStop(0.45, '#fde047');
            bodyGrad.addColorStop(1, '#f97316');
            ctx.fillStyle = bodyGrad;
            ctx.beginPath();
            ctx.moveTo(0, -16);
            ctx.quadraticCurveTo(13, -4, 10, 22);
            ctx.quadraticCurveTo(0, 34, -10, 22);
            ctx.quadraticCurveTo(-13, -4, 0, -16);
            ctx.fill();

            // 3 Swept-back Fiery Crown Plumes
            [-1, 0, 1].forEach((cDir) => {
              const crestH = cDir === 0 ? 32 : 22;
              const sway = Math.sin(sec * 12 + cDir) * 3;
              ctx.strokeStyle = cDir === 0 ? '#fef08a' : '#f97316';
              ctx.lineWidth = cDir === 0 ? 4.2 : 3;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(cDir * 4, -12);
              ctx.quadraticCurveTo(cDir * 14 + sway, -18 - crestH * 0.55, cDir * 18 + sway, -14 - crestH);
              ctx.stroke();
            });

            // Blazing amber Phoenix eyes
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(-4.2, -5, 2.4, 1.4, -0.25, 0, Math.PI * 2);
            ctx.ellipse(4.2, -5, 2.4, 1.4, 0.25, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            ctx.restore();
          }

          // ── STAGE 3: Twin Fiery Shockwaves & Molten Card Frame ──
          if (shockPhase > 0 && shockPhase < 1) {
            const ring1R = 26 + Math.pow(shockPhase, 0.72) * 235;
            const ring1Alpha = masterAlpha * (1 - shockPhase) * 0.92;
            ctx.save();
            ctx.globalAlpha = ring1Alpha;
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = Math.max(1.5, 7 * (1 - shockPhase));
            ctx.shadowColor = '#f97316';
            ctx.shadowBlur = 24;
            ctx.beginPath();
            ctx.arc(cx, cy, ring1R, 0, Math.PI * 2);
            ctx.stroke();

            if (shockPhase > 0.16) {
              const s2 = (shockPhase - 0.16) / 0.84;
              const ring2R = 18 + Math.pow(s2, 0.78) * 195;
              ctx.globalAlpha = masterAlpha * (1 - s2) * 0.8;
              ctx.strokeStyle = '#ef4444';
              ctx.lineWidth = Math.max(1.2, 5.5 * (1 - s2));
              ctx.shadowColor = '#dc2626';
              ctx.shadowBlur = 18;
              ctx.beginPath();
              ctx.arc(cx, cy, ring2R, 0, Math.PI * 2);
              ctx.stroke();
            }
            ctx.restore();
          }

          // Molten glowing border hugging General Bor's card
          if (p > 0.22) {
            const frameFade = p < 0.76 ? Math.min(1, (p - 0.22) / 0.18) : Math.max(0, 1 - (p - 0.76) / 0.24);
            ctx.save();
            ctx.globalAlpha = masterAlpha * frameFade;
            ctx.strokeStyle = '#fb923c';
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#f97316';
            ctx.shadowBlur = 22;
            ctx.beginPath();
            ctx.roundRect(cx - cardW * 0.56, cy - cardH * 0.56, cardW * 1.12, cardH * 1.12, 14);
            ctx.stroke();

            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.roundRect(cx - cardW * 0.52, cy - cardH * 0.52, cardW * 1.04, cardH * 1.04, 12);
            ctx.stroke();
            ctx.restore();
          }

          // ── STAGE 3B: 42 Swirling Rising Embers & Burning Phoenix Feathers ──
          if (emberPhase > 0) {
            for (let i = 0; i < 42; i++) {
              const seedA = (i * 2.39996) % (Math.PI * 2);
              const speed = 0.65 + (i % 7) * 0.14;
              const localP = Math.max(0, Math.min(1, emberPhase * speed));
              const spreadX = Math.cos(seedA) * (32 + (i % 9) * 22) + Math.sin(sec * 5 + i) * 18;
              const riseY = localP * (135 + (i % 6) * 34);
              const ex = cx + spreadX;
              const ey = cy + 36 - riseY;
              const eAlpha = masterAlpha * Math.sin(localP * Math.PI);

              if (eAlpha <= 0.02) continue;

              ctx.save();
              ctx.globalAlpha = eAlpha;
              ctx.translate(ex, ey);
              ctx.rotate(seedA + sec * (i % 2 === 0 ? 2.4 : -2.2));

              if (i % 5 === 0) {
                // Burning Phoenix feather ember
                ctx.fillStyle = i % 10 === 0 ? '#fde047' : '#f97316';
                ctx.shadowColor = '#ea580c';
                ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.moveTo(0, -10);
                ctx.quadraticCurveTo(5, 0, 0, 10);
                ctx.quadraticCurveTo(-5, 0, 0, -10);
                ctx.fill();
              } else {
                // Glowing spark/ember
                const r = 1.8 + (i % 4) * 1.05;
                ctx.fillStyle = i % 3 === 0 ? '#fff7ed' : i % 3 === 1 ? '#fbbf24' : '#ef4444';
                ctx.shadowColor = '#f97316';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.restore();
            }
          }

          ctx.restore();

          // ── STAGE 4: Exclusive Mesofênix Banner ──
          drawBadge(
            cx,
            cy - cardH * 0.72 - 30,
            vfx.label || '🔥🦅 O MESOFÊNIX RENASCEU! +50% ATRIBUTOS · CURA',
            '#f97316',
            '#fef3c7',
            masterAlpha
          );
          break;
        }

        // 7. HÉLIO: Labareda solar (1ª invocação)
        case 'helio_solar_flare': {
          const tx = primaryTarget.x;
          const ty = primaryTarget.y;
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          const beam = ctx.createLinearGradient(src.x, src.y, tx, ty);
          beam.addColorStop(0, '#fef08a');
          beam.addColorStop(0.5, '#f97316');
          beam.addColorStop(1, '#ef4444');
          ctx.strokeStyle = beam;
          ctx.lineWidth = 12 * (1 - p * 0.45);
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = 24;
          ctx.beginPath();
          ctx.moveTo(src.x, src.y);
          ctx.lineTo(tx, ty);
          ctx.stroke();

          ctx.fillStyle = 'rgba(249, 115, 22, 0.55)';
          ctx.beginPath();
          ctx.arc(tx, ty, 30 + Math.sin(p * Math.PI) * 52, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          drawBadge(tx, ty - 78, vfx.label || '☀️🔥 LABAREDA DE HÉLIO · -8 + TORPOR', '#f97316', '#fef08a', masterAlpha);
          break;
        }

        // 8. O SOL CURANDO HÉLIO / WYR CURANDO / A LUA CURANDO LUNARIO
        case 'o_sol_heal_helio':
        case 'a_lua_heal_lunario':
        case 'wyr_dragon_heal': {
          const isMoon = vfx.type === 'a_lua_heal_lunario';
          const isWyr = vfx.type === 'wyr_dragon_heal';
          const mainColor = isMoon ? '#c084fc' : isWyr ? '#fbbf24' : '#facc15';
          const glow = isMoon ? '#818cf8' : isWyr ? '#34d399' : '#f97316';
          const tx = isWyr ? src.x : primaryTarget.x;
          const ty = isWyr ? src.y : primaryTarget.y;

          ctx.save();
          ctx.globalAlpha = masterAlpha;
          if (!isWyr) {
            ctx.strokeStyle = mainColor;
            ctx.lineWidth = 6;
            ctx.shadowColor = glow;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.moveTo(src.x, src.y);
            ctx.lineTo(tx, ty);
            ctx.stroke();
          }
          for (let i = 0; i < 12; i++) {
            const ang = (i / 12) * Math.PI * 2 + sec * 2;
            const d = 18 + Math.sin(p * Math.PI) * 34;
            ctx.fillStyle = i % 2 === 0 ? '#ffffff' : mainColor;
            ctx.beginPath();
            ctx.arc(tx + Math.cos(ang) * d, ty + Math.sin(ang) * d - p * 26, 4.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          drawBadge(
            tx,
            ty - 76,
            vfx.label || (isMoon ? '🌙💚 CURA LUNAR' : isWyr ? '🐉💚 VIDA TOTAL RESTAURADA!' : '☀️💚 BÊNÇÃO SOLAR ENVIADA A HÉLIO'),
            mainColor,
            '#ffffff',
            masterAlpha
          );
          break;
        }

        // 9. O SOL LVL 2: Desintegração única das cartas obliteradas
        case 'o_sol_lvl2_oblit_disintegrate': {
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          targets.forEach((tg) => {
            // Núcleo buraco negro + anel solar
            const r = 46 + (1 - p) * 28;
            ctx.fillStyle = '#09090b';
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 4;
            ctx.shadowColor = '#f97316';
            ctx.shadowBlur = 28;
            ctx.beginPath();
            ctx.arc(tg.x, tg.y, Math.max(10, r * (1 - p * 0.7)), 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Partículas desintegrando para o alto
            for (let k = 0; k < 24; k++) {
              const s = seeds[k];
              const px = tg.x + Math.cos(s.angle) * (14 + p * 85 * s.dist);
              const py = tg.y + Math.sin(s.angle) * 28 - p * (60 + k * 4);
              ctx.fillStyle = k % 3 === 0 ? '#ffffff' : k % 3 === 1 ? '#fde047' : '#ef4444';
              ctx.fillRect(px, py, s.size * (1 - p * 0.7), s.size * (1 - p * 0.7));
            }
          });
          ctx.restore();
          drawBadge(primaryTarget.x, primaryTarget.y - 95, vfx.label || '🕳️☀️ DESINTEGRAÇÃO SOLAR ABSOLUTA!', '#facc15', '#fef3c7', masterAlpha);
          break;
        }

        // 10. O SOL LVL 2 & A LUA LVL 2: Sugando vida do jogador inimigo / PHILIO ORB / SANIEL LVL 2 DRAIN (RENOVADO)
        case 'o_sol_lvl2_drain':
        case 'a_lua_lvl2_drain':
        case 'saniel_lvl2_drain': {
          const isSol = vfx.type === 'o_sol_lvl2_drain';
          const isLua = vfx.type === 'a_lua_lvl2_drain';
          const isSaniel = vfx.type === 'saniel_lvl2_drain';
          const fromPt = primaryTarget;
          const toPt = src;
          const orbX = fromPt.x + (toPt.x - fromPt.x) * Math.min(1, p / 0.85);
          const orbY = fromPt.y + (toPt.y - fromPt.y) * Math.min(1, p / 0.85) - Math.sin(Math.min(1, p / 0.85) * Math.PI) * 52;
          const c1 = isSol ? '#f97316' : isLua ? '#e11d48' : '#fbbf24';
          const c2 = isSol ? '#fef08a' : isLua ? '#c084fc' : '#fef9c3';

          if (isSaniel) {
            drawDivineMandala(fromPt.x, fromPt.y, 44 + p * 22, -sec * 3, '#f59e0b', '#e11d48', masterAlpha * 0.85);
            drawWingPair(toPt.x, toPt.y, 128, Math.min(1, p / 0.55), '#fde047', '#f59e0b', masterAlpha * 0.82);
          }

          ctx.save();
          ctx.globalAlpha = masterAlpha;
          ctx.strokeStyle = c1;
          ctx.lineWidth = isLua || isSaniel ? 4.5 : 3.5;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.moveTo(fromPt.x, fromPt.y);
          ctx.lineTo(toPt.x, toPt.y);
          ctx.stroke();
          ctx.setLineDash([]);

          if (isLua || isSaniel) {
            ctx.strokeStyle = isSaniel ? '#fde047' : '#fda4af';
            ctx.lineWidth = 2.8;
            ctx.beginPath();
            ctx.arc(fromPt.x, fromPt.y, 18 + p * 42, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.fillStyle = c2;
          ctx.shadowColor = c1;
          ctx.shadowBlur = 26;
          ctx.beginPath();
          ctx.arc(orbX, orbY, isLua || isSaniel ? 16 : 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          drawBadge(
            toPt.x,
            toPt.y - 84,
            vfx.label || (isSol ? '☀️🩸 DRENO SOLAR (-1 HP INIMIGO)' : isLua ? '🌕🩸 DRENO EMINENTE (-1 HP INIMIGO)' : '👑🪽 SANIEL LVL 2 ABSORVEU TODOS OS ATRIBUTOS!'),
            c1,
            '#ffffff',
            masterAlpha
          );
          break;
        }

        // 10B. PHILIO (MODERNIZADO): Vórtice de absorção cósmica drenando essência para Philio
        case 'philio_soul_orb': {
          const toPt = src;
          const sources = targets.length > 0 ? targets : [primaryTarget];
          const pullEase = 1 - Math.pow(1 - Math.min(1, p / 0.78), 2.6);
          const absorbPulse = Math.max(0, (p - 0.58) / 0.42);

          ctx.save();
          ctx.globalAlpha = masterAlpha;

          // Vórtice gravitacional espiralado sobre Philio sugando energia
          const vortexGrad = ctx.createRadialGradient(toPt.x, toPt.y, 4, toPt.x, toPt.y, 68);
          vortexGrad.addColorStop(0, 'rgba(245, 208, 254, 0.95)');
          vortexGrad.addColorStop(0.35, 'rgba(139, 92, 246, 0.62)');
          vortexGrad.addColorStop(0.75, 'rgba(49, 46, 129, 0.34)');
          vortexGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = vortexGrad;
          ctx.beginPath();
          ctx.arc(toPt.x, toPt.y, 68, 0, Math.PI * 2);
          ctx.fill();

          // 3 anéis de sucção contraindo em direção ao centro de Philio
          for (let r = 0; r < 3; r++) {
            const rp = (1 - ((p * 1.6 + r * 0.33) % 1));
            ctx.strokeStyle = r % 2 === 0 ? '#c084fc' : '#818cf8';
            ctx.lineWidth = 2.4;
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.arc(toPt.x, toPt.y, 12 + rp * 54, sec * 4 + r * 2, sec * 4 + r * 2 + Math.PI * 1.45);
            ctx.stroke();
          }

          // Fios de essência cósmica fluindo das vítimas eliminadas até Philio
          sources.forEach((fromPt, sIdx) => {
            const hasDist = Math.hypot(fromPt.x - toPt.x, fromPt.y - toPt.y) > 22;
            const originX = hasDist ? fromPt.x : toPt.x + Math.cos(sIdx * 2.1) * 95;
            const originY = hasDist ? fromPt.y : toPt.y - 85;
            for (let strand = -1; strand <= 1; strand++) {
              const mx = (originX + toPt.x) / 2 + strand * 44;
              const my = (originY + toPt.y) / 2 - 28 + Math.sin(sec * 8 + strand) * 16;
              ctx.strokeStyle = strand === 0 ? '#e879f9' : '#818cf8';
              ctx.lineWidth = strand === 0 ? 3.2 : 1.8;
              ctx.globalAlpha = (1 - absorbPulse * 0.6) * 0.85 * masterAlpha;
              ctx.beginPath();
              ctx.moveTo(originX, originY);
              ctx.quadraticCurveTo(mx, my, toPt.x, toPt.y);
              ctx.stroke();

              // Partículas sendo sugadas ao longo de cada fio
              const t = pullEase;
              const mt = 1 - t;
              const px = mt * mt * originX + 2 * mt * t * mx + t * t * toPt.x;
              const py = mt * mt * originY + 2 * mt * t * my + t * t * toPt.y;
              ctx.fillStyle = '#ffffff';
              ctx.shadowColor = '#c084fc';
              ctx.shadowBlur = 18;
              ctx.beginPath();
              ctx.arc(px, py, strand === 0 ? 7.5 * (1 - absorbPulse * 0.4) : 4.5, 0, Math.PI * 2);
              ctx.fill();
            }
          });

          // Pulso de crescimento ao concluir a absorção
          if (absorbPulse > 0) {
            ctx.globalAlpha = (1 - absorbPulse) * masterAlpha;
            ctx.strokeStyle = '#f0abfc';
            ctx.lineWidth = 4 * (1 - absorbPulse * 0.5);
            ctx.beginPath();
            ctx.arc(toPt.x, toPt.y, 16 + absorbPulse * 64, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.restore();
          drawBadge(
            toPt.x,
            toPt.y - 86,
            vfx.label || '🌌✨ ABSORÇÃO CÓSMICA DE PHILIO (+2 PODER)',
            '#c084fc',
            '#f5d0fe',
            masterAlpha
          );
          break;
        }

        // 11A. FANAEL, O ARCANJO (CINEMATOGRÁFICO): Bênção angelical com detalhes de água cristalina
        case 'fanx_aqua_blessing': {
          const tx = primaryTarget.x;
          const ty = primaryTarget.y;
          const cw = primaryTarget.w || 98;
          const ch = primaryTarget.h || 136;
          const wingOpen = 1 - Math.pow(1 - Math.min(1, p / 0.36), 2.4);
          const sealPulse = Math.max(0, Math.min(1, (p - 0.32) / 0.68));
          const bellGlow = Math.sin(Math.min(1, p) * Math.PI);

          // 1. Coluna de luz celestial dourado-turquesa com faixas cáusticas aquáticas suaves
          ctx.save();
          ctx.globalAlpha = masterAlpha * bellGlow;
          const beamG = ctx.createLinearGradient(tx, ty - 230, tx, ty + 96);
          beamG.addColorStop(0, 'transparent');
          beamG.addColorStop(0.22, 'rgba(254, 249, 195, 0.48)');
          beamG.addColorStop(0.55, 'rgba(56, 189, 248, 0.44)');
          beamG.addColorStop(0.82, 'rgba(14, 165, 233, 0.28)');
          beamG.addColorStop(1, 'transparent');
          ctx.fillStyle = beamG;
          ctx.fillRect(tx - 52, ty - 230, 104, 326);

          // Cáusticas aquáticas translúcidas descendo pelo feixe de bênção
          for (let c = 0; c < 4; c++) {
            const cy = ty - 140 + ((p * 220 + c * 62) % 230);
            ctx.strokeStyle = c % 2 === 0 ? 'rgba(186, 230, 253, 0.58)' : 'rgba(254, 240, 138, 0.45)';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(tx - 38, cy);
            ctx.bezierCurveTo(
              tx - 14,
              cy - 10 + Math.sin(sec * 5 + c) * 6,
              tx + 14,
              cy + 10 - Math.sin(sec * 5 + c) * 6,
              tx + 38,
              cy
            );
            ctx.stroke();
          }
          ctx.restore();

          // 2. Halo serafínico de luz dourada e água-marinha acima da unidade abençoada
          ctx.save();
          const haloY = ty - ch * 0.56 - 14;
          const haloScale = Math.min(1, p / 0.28);
          ctx.globalAlpha = masterAlpha * bellGlow;
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 3.2;
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.ellipse(tx, haloY, 34 * haloScale, 10.5 * haloScale, 0, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = '#7dd3fc';
          ctx.lineWidth = 1.6;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.ellipse(tx, haloY + 3, 42 * haloScale, 13 * haloScale, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // 3. Dupla camada de asas angelicais (ouro celestial externo + brilho aquático translúcido interno)
          drawWingPair(tx, ty - 14, 168, wingOpen, '#fef08a', '#38bdf8', masterAlpha * 0.92);
          drawWingPair(tx, ty - 8, 126, wingOpen * 0.95, '#e0f2fe', '#0284c7', masterAlpha * 0.65);
          drawDivineMandala(tx, ty, 48 + Math.sin(p * Math.PI) * 16, sec * 1.9, '#fde047', '#38bdf8', masterAlpha * 0.62);

          // 4. Duas fitas líquidas de água abençoada espiralando de baixo para cima em torno da carta
          ctx.save();
          ctx.globalAlpha = masterAlpha * (1 - Math.max(0, (p - 0.78) / 0.22));
          for (let strand = 0; strand < 2; strand++) {
            const phaseOffset = strand * Math.PI;
            const segs = 26;
            const ribbonHead = Math.min(1, p * 1.25);
            const ribbonTail = Math.max(0, ribbonHead - 0.56);
            ctx.beginPath();
            let started = false;
            for (let i = 0; i <= segs; i++) {
              const frac = ribbonTail + (ribbonHead - ribbonTail) * (i / segs);
              const ang = frac * Math.PI * 3.1 + phaseOffset + sec * 1.4;
              const rx = tx + Math.cos(ang) * (44 + Math.sin(frac * Math.PI) * 16);
              const ry = ty + 62 - frac * 128;
              if (!started) {
                ctx.moveTo(rx, ry);
                started = true;
              } else {
                ctx.lineTo(rx, ry);
              }
            }
            ctx.strokeStyle = strand === 0 ? '#7dd3fc' : '#fef08a';
            ctx.lineWidth = strand === 0 ? 5.2 : 3.4;
            ctx.lineCap = 'round';
            ctx.shadowColor = strand === 0 ? '#0ea5e9' : '#facc15';
            ctx.shadowBlur = 18;
            ctx.stroke();

            // Brilho especular branco no núcleo da corrente líquida
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
            ctx.lineWidth = strand === 0 ? 1.8 : 1.2;
            ctx.stroke();
          }
          ctx.restore();

          // 5. Brilho aquático-dourado integrando a bênção sobre a silhueta da carta (+10 Vida Máx)
          if (sealPulse > 0) {
            const sBell = Math.sin(sealPulse * Math.PI);
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(tx - cw / 2 - 2, ty - ch / 2 - 2, cw + 4, ch + 4, 11);
            ctx.clip();
            const sheenX = tx - cw + sealPulse * cw * 2.2;
            const cardSheen = ctx.createLinearGradient(sheenX - 38, ty - ch / 2, sheenX + 38, ty + ch / 2);
            cardSheen.addColorStop(0, 'transparent');
            cardSheen.addColorStop(0.4, 'rgba(125, 211, 252, 0.65)');
            cardSheen.addColorStop(0.5, 'rgba(255, 255, 255, 0.92)');
            cardSheen.addColorStop(0.6, 'rgba(253, 224, 71, 0.62)');
            cardSheen.addColorStop(1, 'transparent');
            ctx.globalAlpha = sBell * 0.88 * masterAlpha;
            ctx.fillStyle = cardSheen;
            ctx.fillRect(tx - cw / 2 - 4, ty - ch / 2 - 4, cw + 8, ch + 8);
            ctx.restore();

            ctx.save();
            ctx.globalAlpha = sBell * 0.92 * masterAlpha;
            ctx.strokeStyle = '#7dd3fc';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.roundRect(tx - cw / 2 - 3, ty - ch / 2 - 3, cw + 6, ch + 6, 11);
            ctx.stroke();
            ctx.restore();
          }

          // 6. Ondas concêntricas cristalinas na base + gotículas peroladas ascendentes
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          for (let r = 0; r < 3; r++) {
            const rp = Math.max(0, Math.min(1, p * 1.2 - r * 0.16));
            if (rp <= 0) continue;
            ctx.globalAlpha = (1 - rp) * 0.92 * masterAlpha;
            ctx.strokeStyle = r === 1 ? '#fef08a' : '#38bdf8';
            ctx.lineWidth = (r === 0 ? 4.2 : 2.8) * (1 - rp * 0.45);
            ctx.shadowColor = r === 1 ? '#facc15' : '#0ea5e9';
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.ellipse(tx, ty + 46 - r * 14 - rp * 20, 22 + rp * 76, 9 + rp * 25, 0, 0, Math.PI * 2);
            ctx.stroke();
          }

          for (let d = 0; d < 22; d++) {
            const ang = (d / 22) * Math.PI * 2 + sec * 2.1;
            const rad = 28 + Math.sin(d * 1.9 + p * 4.5) * 26;
            const gx = tx + Math.cos(ang) * rad;
            const gy = ty + 52 - p * 124 - (d % 6) * 9;
            ctx.globalAlpha = bellGlow * 0.95 * masterAlpha;
            ctx.fillStyle = d % 3 === 0 ? '#fef9c3' : d % 2 === 0 ? '#7dd3fc' : '#ffffff';
            ctx.shadowColor = d % 3 === 0 ? '#fde047' : '#38bdf8';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            if (d % 2 === 0) {
              // Gota cristalina estilizada subindo com a bênção
              ctx.moveTo(gx, gy - 6.5);
              ctx.quadraticCurveTo(gx + 4.5, gy + 1.5, gx, gy + 5.2);
              ctx.quadraticCurveTo(gx - 4.5, gy + 1.5, gx, gy - 6.5);
            } else {
              ctx.arc(gx, gy, 3.2, 0, Math.PI * 2);
            }
            ctx.fill();
          }
          ctx.restore();

          drawBadge(
            tx,
            ty - 98,
            vfx.label || '🌊🪽 BÊNÇÃO ANGELICAL DE FANAEL (+10 VIDA MÁX)',
            '#38bdf8',
            '#fef9c3',
            masterAlpha
          );
          break;
        }

        // 11B. CRISTALYS (MODERNIZADA): Banho mágico de água cristalina entregando CURA (2R)
        case 'cristalys_aqua_heal': {
          const tx = primaryTarget.x;
          const ty = primaryTarget.y;

          ctx.save();
          ctx.globalAlpha = masterAlpha;

          // Halo de nascente mágica acima da carta alvo
          const topY = ty - 74;
          const haloGrad = ctx.createRadialGradient(tx, topY, 4, tx, topY, 56);
          haloGrad.addColorStop(0, 'rgba(224, 242, 254, 0.95)');
          haloGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.65)');
          haloGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = haloGrad;
          ctx.beginPath();
          ctx.ellipse(tx, topY, 54, 18, 0, 0, Math.PI * 2);
          ctx.fill();

          // Cascatas translúcidas de água mágica banhando a carta de cima para baixo
          for (let stream = -2; stream <= 2; stream++) {
            const xOff = stream * 15;
            const streamTop = topY + 4;
            const streamBot = ty + 62;
            const flowT = Math.min(1, p * 1.45 - Math.abs(stream) * 0.08);
            if (flowT <= 0) continue;
            const curBot = streamTop + (streamBot - streamTop) * flowT;
            const sGrad = ctx.createLinearGradient(tx + xOff, streamTop, tx + xOff, curBot);
            sGrad.addColorStop(0, 'rgba(224, 242, 254, 0.92)');
            sGrad.addColorStop(0.5, stream % 2 === 0 ? 'rgba(56, 189, 248, 0.78)' : 'rgba(52, 211, 153, 0.74)');
            sGrad.addColorStop(1, 'rgba(110, 231, 183, 0.12)');
            ctx.strokeStyle = sGrad;
            ctx.lineWidth = stream === 0 ? 11 : 7.5;
            ctx.lineCap = 'round';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.moveTo(tx + xOff, streamTop);
            ctx.bezierCurveTo(
              tx + xOff + Math.sin(sec * 8 + stream) * 14,
              (streamTop + curBot) * 0.5,
              tx + xOff - Math.sin(sec * 8 + stream) * 12,
              curBot - 16,
              tx + xOff * 1.25,
              curBot
            );
            ctx.stroke();
          }

          // Ondas de respingo na base da unidade durante o banho mágico
          for (let r = 0; r < 3; r++) {
            const rp = (p * 1.5 + r * 0.3) % 1;
            ctx.globalAlpha = (1 - rp) * 0.9 * masterAlpha;
            ctx.strokeStyle = r % 2 === 0 ? '#7dd3fc' : '#6ee7b7';
            ctx.lineWidth = 3.2 * (1 - rp * 0.5);
            ctx.beginPath();
            ctx.ellipse(tx, ty + 54, 18 + rp * 64, 7 + rp * 20, 0, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Gotas borrifando e cintilando em verde-água
          ctx.globalAlpha = masterAlpha;
          for (let g = 0; g < 16; g++) {
            const ang = (g / 16) * Math.PI * 2 + sec * 2.4;
            const gx = tx + Math.cos(ang) * (24 + (g % 4) * 10);
            const gy = ty + 48 - ((p * 130 + g * 11) % 118);
            ctx.fillStyle = g % 3 === 0 ? '#ffffff' : g % 2 === 0 ? '#7dd3fc' : '#6ee7b7';
            ctx.beginPath();
            ctx.arc(gx, gy, 3.2, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
          drawBadge(
            tx,
            ty - 94,
            vfx.label || '💧💚 BANHO MÁGICO DE CRISTALYS · CURA (2R)!',
            '#34d399',
            '#e0f2fe',
            masterAlpha
          );
          break;
        }

        // 12. VANUSA: Portal místico aquático de Revelar (mantido como fallback legado)
        case 'vanusa_reveal': {
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#0ea5e9';
          ctx.shadowBlur = 24;
          ctx.beginPath();
          ctx.arc(src.x, src.y, 28 + Math.sin(p * Math.PI) * 58, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          drawBadge(src.x, src.y - 82, vfx.label || '👁️ REVELAR ATIVADO!', '#38bdf8', '#e0f2fe', masterAlpha);
          break;
        }

        // 13. KRUST: Reabrindo a cripta com névoa marinha espectral
        case 'krust_crypt_reopen': {
          const gy = primaryTarget;
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          const gateG = ctx.createRadialGradient(gy.x, gy.y, 8, gy.x, gy.y, 105);
          gateG.addColorStop(0, 'rgba(56, 189, 248, 0.85)');
          gateG.addColorStop(0.55, 'rgba(14, 165, 233, 0.45)');
          gateG.addColorStop(1, 'transparent');
          ctx.fillStyle = gateG;
          ctx.beginPath();
          ctx.arc(gy.x, gy.y, 105, 0, Math.PI * 2);
          ctx.fill();

          // Portal fenda vertical abrindo
          const openW = Math.sin(Math.min(1, p * 1.4) * Math.PI * 0.5) * 34;
          ctx.fillStyle = '#082f49';
          ctx.strokeStyle = '#7dd3fc';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(gy.x, gy.y, openW, 64, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
          drawBadge(gy.x, gy.y - 84, vfx.label || '⚰️💧 CRIPTA REABERTA POR KRUST', '#38bdf8', '#e0f2fe', masterAlpha);
          break;
        }

        // 14. GLAUCO (MODERNIZADO): Pequena orbe gélida se integrando à unidade escolhida
        case 'glauco_snowflake_def': {
          drawElementalIntegrationOrb({
            coreColor: '#e0f2fe',
            midColor: '#38bdf8',
            outerColor: '#0284c7',
            glowColor: '#22d3ee',
            elementKind: 'ice',
            badgeText: '❄️🛡️ +4 DEFESA (ORBE GÉLIDA DE GLAUCO)',
            badgeBorder: '#22d3ee',
            badgeTextCol: '#ecfeff',
          });
          break;
        }

        // 15. KORE / JUCI / BONETRUS FOG: Rajada de gelo / baforada / névoa
        case 'kore_death_blast':
        case 'juci_dragon_breath':
        case 'bonetrus_frost_fog': {
          const isJuci = vfx.type === 'juci_dragon_breath';
          const isFog = vfx.type === 'bonetrus_frost_fog';
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          targets.forEach((tg) => {
            if (isJuci) {
              const g = ctx.createLinearGradient(src.x, src.y, tg.x, tg.y);
              g.addColorStop(0, 'rgba(224, 242, 254, 0.9)');
              g.addColorStop(1, 'rgba(34, 211, 238, 0.35)');
              ctx.strokeStyle = g;
              ctx.lineWidth = 22 * (1 - p * 0.4);
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(src.x, src.y);
              ctx.lineTo(tg.x, tg.y);
              ctx.stroke();
            }
            const r = isFog ? 26 + p * 72 : 20 + p * 64;
            const rg = ctx.createRadialGradient(tg.x, tg.y, 4, tg.x, tg.y, r);
            rg.addColorStop(0, 'rgba(224, 242, 254, 0.85)');
            rg.addColorStop(0.6, 'rgba(34, 211, 238, 0.45)');
            rg.addColorStop(1, 'transparent');
            ctx.fillStyle = rg;
            ctx.beginPath();
            ctx.arc(tg.x, tg.y, r, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.restore();
          drawBadge(
            primaryTarget.x,
            primaryTarget.y - 86,
            vfx.label || (isJuci ? '❄️🐉 BAFORADA DE JUCI (-9 + CONGELAR)' : isFog ? '❄️🌫️ NÉVOA CONGELANTE DE BONETRUS' : '❄️💥 RAJADA GLACIAL DE KORE'),
            '#22d3ee',
            '#ecfeff',
            masterAlpha
          );
          break;
        }

        // 16. BONETRUS LVL 2 SOLO SLASH: Epic Sovereign Blizzard + X-Slash + Giant Crescent Ice Blade AoE Sweep (~1.85s)
        case 'bonetrus_lvl2_solo_slash': {
          const defPt = primaryTarget;
          const cleavePts = targets.slice(1);
          const allTargets = cleavePts.length > 0 ? targets : [defPt];
          ctx.save();

          // Frost atmospheric aura & screen-border vignette pulse
          const vigAlpha = Math.sin(p * Math.PI) * 0.42;
          const vigGrad = ctx.createRadialGradient(vw * 0.5, vh * 0.5, Math.min(vw, vh) * 0.25, vw * 0.5, vh * 0.5, Math.max(vw, vh) * 0.72);
          vigGrad.addColorStop(0, 'rgba(34, 211, 238, 0)');
          vigGrad.addColorStop(0.75, `rgba(14, 165, 233, ${vigAlpha * 0.35})`);
          vigGrad.addColorStop(1, `rgba(165, 243, 252, ${vigAlpha})`);
          ctx.fillStyle = vigGrad;
          ctx.fillRect(0, 0, vw, vh);

          ctx.globalAlpha = masterAlpha;

          // FASE 1 (0 -> 0.34): Despertar Glacial em Bonetrus — círculo rúnico de gelo e vórtice da Lâmina do Inverno
          if (p <= 0.42) {
            const t1 = Math.min(1, p / 0.28);
            const fade1 = p > 0.28 ? 1 - (p - 0.28) / 0.14 : 1;
            ctx.save();
            ctx.globalAlpha = masterAlpha * fade1;
            ctx.translate(src.x, src.y);
            ctx.rotate(sec * 4.5);
            ctx.strokeStyle = '#67e8f9';
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#06b6d4';
            ctx.shadowBlur = 26;
            const ringR = 26 + t1 * 48;
            ctx.beginPath();
            ctx.arc(0, 0, ringR, 0, Math.PI * 2);
            ctx.stroke();

            // Estrela hexagonal rúnica de gelo
            for (let hex = 0; hex < 6; hex++) {
              const a = (hex * Math.PI) / 3;
              ctx.beginPath();
              ctx.moveTo(Math.cos(a) * (ringR * 0.45), Math.sin(a) * (ringR * 0.45));
              ctx.lineTo(Math.cos(a) * ringR, Math.sin(a) * ringR);
              ctx.stroke();
            }
            ctx.restore();
          }

          // FASE 2 (0.18 -> 0.58): Golpe Direto Soberano em X (100%) + Anel de Choque + Fragmentos de Cristal no Defensor Primário
          if (p >= 0.18 && p <= 0.72) {
            const p2 = Math.min(1, (p - 0.18) / 0.24);
            const fade2 = p > 0.46 ? Math.max(0, 1 - (p - 0.46) / 0.26) : 1;
            const ease2 = 1 - Math.pow(1 - p2, 3);
            ctx.save();
            ctx.globalAlpha = masterAlpha * fade2;
            ctx.shadowColor = '#22d3ee';
            ctx.shadowBlur = 32;

            // Feixe gélido de investida entre Bonetrus e o defensor
            if (p <= 0.42) {
              const beamGrad = ctx.createLinearGradient(src.x, src.y, defPt.x, defPt.y);
              beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
              beamGrad.addColorStop(0.6, 'rgba(165, 243, 252, 0.85)');
              beamGrad.addColorStop(1, 'rgba(255, 255, 255, 0.98)');
              ctx.strokeStyle = beamGrad;
              ctx.lineWidth = 12 * (1 - p2 * 0.35);
              ctx.beginPath();
              ctx.moveTo(src.x, src.y);
              ctx.lineTo(src.x + (defPt.x - src.x) * ease2, src.y + (defPt.y - src.y) * ease2);
              ctx.stroke();
            }

            // Corte em X luminoso gigante no defensor
            const drawTaperedSlash = (x0: number, y0: number, x1: number, y1: number, prog: number, color: string, width: number) => {
              const cx1 = x0 + (x1 - x0) * prog;
              const cy1 = y0 + (y1 - y0) * prog;
              ctx.strokeStyle = color;
              ctx.lineWidth = width;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(x0, y0);
              ctx.lineTo(cx1, cy1);
              ctx.stroke();
            };
            drawTaperedSlash(defPt.x - 68, defPt.y - 62, defPt.x + 68, defPt.y + 62, ease2, '#e0f2fe', 11);
            drawTaperedSlash(defPt.x - 68, defPt.y - 62, defPt.x + 68, defPt.y + 62, ease2, '#ffffff', 4.5);
            if (p2 > 0.25) {
              const p2b = Math.min(1, (p2 - 0.25) / 0.75);
              drawTaperedSlash(defPt.x + 68, defPt.y - 62, defPt.x - 68, defPt.y + 62, p2b, '#38bdf8', 11);
              drawTaperedSlash(defPt.x + 68, defPt.y - 62, defPt.x - 68, defPt.y + 62, p2b, '#ffffff', 4.5);
            }

            // Ondas de choque gélidas + estilhaços de cristal
            for (let r = 0; r < 2; r++) {
              const rp = Math.max(0, Math.min(1, (p - 0.22 - r * 0.08) / 0.38));
              ctx.strokeStyle = r === 0 ? '#ffffff' : '#22d3ee';
              ctx.lineWidth = 4 * (1 - rp);
              ctx.beginPath();
              ctx.arc(defPt.x, defPt.y, 18 + rp * 95, 0, Math.PI * 2);
              ctx.stroke();
            }
            for (let k = 0; k < 14; k++) {
              const s = seeds[k];
              const d = 14 + p2 * 82 * s.dist;
              const sx = defPt.x + Math.cos(s.angle) * d;
              const sy = defPt.y + Math.sin(s.angle) * d;
              ctx.fillStyle = k % 2 === 0 ? '#ffffff' : '#67e8f9';
              ctx.beginPath();
              ctx.moveTo(sx, sy - 6);
              ctx.lineTo(sx + 4, sy);
              ctx.lineTo(sx, sy + 6);
              ctx.lineTo(sx - 4, sy);
              ctx.closePath();
              ctx.fill();
            }
            ctx.restore();
          }

          // FASE 3 (0.42 -> 1.0): NEVASCA SOBERANA EM ÁREA — Grande Arco da Lâmina do Inverno + Estacas Glaciais + Cortes em TODAS as unidades inimigas
          if (p >= 0.42) {
            const p3 = Math.min(1, (p - 0.42) / 0.42);
            const ease3 = 1 - Math.pow(1 - p3, 2.5);
            const avgEnemyY = allTargets.reduce((acc, tg) => acc + tg.y, 0) / allTargets.length;
            const minEnemyX = Math.min(...allTargets.map((tg) => tg.x)) - 95;
            const maxEnemyX = Math.max(...allTargets.map((tg) => tg.x)) + 95;
            const frontCenterX = (minEnemyX + maxEnemyX) / 2;
            const sweepRadius = Math.max(vw * 0.32, (maxEnemyX - minEnemyX) * 0.62);

            ctx.save();
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 34;

            // Rajadas de vento nevasca cruzando a linha frontal inimiga
            for (let w = 0; w < 14; w++) {
              const laneY = avgEnemyY - 68 + ((w * 23) % 136);
              const windProg = ((p - 0.42) * 1.9 + w * 0.09) % 1;
              const wx1 = minEnemyX - 80 + windProg * (maxEnemyX - minEnemyX + 160);
              const wx2 = wx1 + 95 + (w % 3) * 35;
              ctx.strokeStyle = w % 3 === 0 ? 'rgba(255,255,255,0.75)' : 'rgba(103,232,249,0.55)';
              ctx.lineWidth = w % 2 === 0 ? 3 : 1.8;
              ctx.beginPath();
              ctx.moveTo(wx1, laneY);
              ctx.lineTo(wx2, laneY - 10);
              ctx.stroke();
            }

            // Arco Crescente Gigante de "A Lâmina do Inverno" varrendo toda a mesa inimiga
            const startAng = Math.PI * 1.12;
            const endAng = startAng + Math.PI * 0.76 * ease3;
            ctx.strokeStyle = '#0ea5e9';
            ctx.lineWidth = 22 * (1 - p3 * 0.45);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(frontCenterX, avgEnemyY + sweepRadius * 0.68, sweepRadius, startAng, endAng);
            ctx.stroke();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 8 * (1 - p3 * 0.35);
            ctx.beginPath();
            ctx.arc(frontCenterX, avgEnemyY + sweepRadius * 0.68, sweepRadius, startAng, endAng);
            ctx.stroke();

            // Ponta brilhante da lâmina percorrendo o arco
            if (p3 < 0.96) {
              const tipX = frontCenterX + Math.cos(endAng) * sweepRadius;
              const tipY = avgEnemyY + sweepRadius * 0.68 + Math.sin(endAng) * sweepRadius;
              ctx.fillStyle = '#ffffff';
              ctx.shadowColor = '#a5f3fc';
              ctx.shadowBlur = 38;
              ctx.beginPath();
              ctx.arc(tipX, tipY, 16, 0, Math.PI * 2);
              ctx.fill();
            }

            // Impacto sequencial em CADA unidade inimiga: pilares de gelo irrompendo + corte em X + estilhaços
            allTargets.forEach((tg, idx) => {
              const delay = idx * 0.05;
              const tp = Math.max(0, Math.min(1, (p - 0.46 - delay) / 0.32));
              if (tp <= 0) return;

              // Pilares/estacas de gelo subindo embaixo da carta inimiga
              const spikeH = Math.sin(Math.min(1, tp * 1.1) * Math.PI * 0.7) * 58;
              for (let sp = -1; sp <= 1; sp++) {
                const sx = tg.x + sp * 22;
                const sh = spikeH * (sp === 0 ? 1.15 : 0.78);
                ctx.fillStyle = sp === 0 ? 'rgba(224, 242, 254, 0.85)' : 'rgba(56, 189, 248, 0.7)';
                ctx.strokeStyle = '#a5f3fc';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(sx - 10, tg.y + 38);
                ctx.lineTo(sx, tg.y + 38 - sh);
                ctx.lineTo(sx + 10, tg.y + 38);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
              }

              // Anel de impacto gélido
              ctx.strokeStyle = '#67e8f9';
              ctx.lineWidth = 3.5 * (1 - tp * 0.5);
              ctx.beginPath();
              ctx.arc(tg.x, tg.y, 16 + tp * 54, 0, Math.PI * 2);
              ctx.stroke();

              // Corte em X gélido sobre cada inimigo atingido
              const slashScale = Math.min(1, tp * 1.8);
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 6.5;
              ctx.beginPath();
              ctx.moveTo(tg.x - 42, tg.y + 32);
              ctx.lineTo(tg.x - 42 + 84 * slashScale, tg.y + 32 - 64 * slashScale);
              ctx.stroke();

              ctx.strokeStyle = '#22d3ee';
              ctx.lineWidth = 5;
              ctx.beginPath();
              ctx.moveTo(tg.x - 38, tg.y - 32);
              ctx.lineTo(tg.x - 38 + 76 * slashScale, tg.y - 32 + 64 * slashScale);
              ctx.stroke();
            });
            ctx.restore();
          }

          ctx.restore();
          drawBadge(defPt.x, defPt.y - 96, vfx.label || '⚔️❄️ NEVASCA SOBERANA DE BONETRUS LVL 2!', '#38bdf8', '#ecfeff', masterAlpha);
          break;
        }

        // 17. BONETRUS + A LÂMINA DO INVERNO: Acoplamento no fim da rodada (~1.95s)
        case 'bonetrus_lamina_attach': {
          const bonPt = src;
          const bladePt = secSrc;
          const mergeT = Math.min(1, p / 0.68);
          const ease = 1 - Math.pow(1 - mergeT, 3);
          const bx = bladePt.x + (bonPt.x - bladePt.x) * ease;
          const by = bladePt.y + (bonPt.y - bladePt.y) * ease - Math.sin(mergeT * Math.PI) * 70;

          ctx.save();
          ctx.globalAlpha = masterAlpha;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 28;

          // Desenha a Lâmina do Inverno girando até Bonetrus
          if (p < 0.78) {
            ctx.save();
            ctx.translate(bx, by);
            ctx.rotate(ease * Math.PI * 3);
            ctx.fillStyle = '#e0f2fe';
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, -54);
            ctx.lineTo(14, 16);
            ctx.lineTo(0, 48);
            ctx.lineTo(-14, 16);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }

          // Ascensão glacial ao acoplar
          if (p >= 0.65) {
            const burst = (p - 0.65) / 0.35;
            ctx.strokeStyle = '#a5f3fc';
            ctx.lineWidth = 6 * (1 - burst);
            ctx.beginPath();
            ctx.arc(bonPt.x, bonPt.y, 35 + burst * 140, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
          drawBadge(bonPt.x, bonPt.y - 96, vfx.label || '⚔️❄️ A LÂMINA DO INVERNO ACOPLOU! BONETRUS LVL 2!', '#38bdf8', '#e0f2fe', masterAlpha);
          break;
        }

        // 18. FINN & MIPO (MODERNIZADOS): Núcleo arcano / feérico voando até a barra de vida e expandindo novo segmento
        case 'finn_hp_boost':
        case 'mipo_purple_hp': {
          const isMipo = vfx.type === 'mipo_purple_hp';
          const mainCol = isMipo ? '#c084fc' : '#34d399';
          const secCol = isMipo ? '#e879f9' : '#f472b6';
          const hpPt = primaryTarget;
          const travel = Math.min(1, p / 0.62);
          const ease = 1 - Math.pow(1 - travel, 2.8);
          const ox = src.x + (hpPt.x - src.x) * ease;
          const oy = src.y + (hpPt.y - src.y) * ease - Math.sin(travel * Math.PI) * 74;
          const bloom = Math.max(0, (p - 0.56) / 0.44);

          ctx.save();
          ctx.globalAlpha = masterAlpha;

          // Rastro etéreo curvo ligando a carta ao cristal de vida
          for (let s = 1; s <= 12; s++) {
            const st = Math.max(0, travel - s * 0.045);
            const se = 1 - Math.pow(1 - st, 2.8);
            const sx = src.x + (hpPt.x - src.x) * se;
            const sy = src.y + (hpPt.y - src.y) * se - Math.sin(st * Math.PI) * 74;
            ctx.fillStyle = s % 2 === 0 ? mainCol : secCol;
            ctx.globalAlpha = (1 - s / 13) * (1 - bloom * 0.7) * 0.85 * masterAlpha;
            ctx.beginPath();
            ctx.arc(sx, sy, Math.max(2, 8.5 * (1 - s / 13)), 0, Math.PI * 2);
            ctx.fill();
          }

          // Orbe cristalina em voo
          if (bloom < 0.55) {
            const sc = 1 - bloom / 0.55;
            ctx.globalAlpha = masterAlpha * sc;
            const oGrad = ctx.createRadialGradient(ox, oy, 2, ox, oy, 24 * sc);
            oGrad.addColorStop(0, '#ffffff');
            oGrad.addColorStop(0.35, mainCol);
            oGrad.addColorStop(0.75, secCol);
            oGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = oGrad;
            ctx.shadowColor = mainCol;
            ctx.shadowBlur = 26;
            ctx.beginPath();
            ctx.arc(ox, oy, 24 * sc, 0, Math.PI * 2);
            ctx.fill();

            // Losango de cristal girando no núcleo
            ctx.save();
            ctx.translate(ox, oy);
            ctx.rotate(sec * 6);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(0, -9 * sc);
            ctx.lineTo(7 * sc, 0);
            ctx.lineTo(0, 9 * sc);
            ctx.lineTo(-7 * sc, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }

          // Expansão cristalina na barra de vida ao receber o ponto extra
          if (bloom > 0) {
            const easeB = 1 - Math.pow(1 - bloom, 3);
            ctx.globalAlpha = (1 - bloom) * masterAlpha;
            const burstG = ctx.createRadialGradient(hpPt.x, hpPt.y, 4, hpPt.x, hpPt.y, 68 * easeB);
            burstG.addColorStop(0, '#ffffff');
            burstG.addColorStop(0.4, mainCol);
            burstG.addColorStop(0.8, secCol);
            burstG.addColorStop(1, 'transparent');
            ctx.fillStyle = burstG;
            ctx.beginPath();
            ctx.arc(hpPt.x, hpPt.y, 68 * easeB, 0, Math.PI * 2);
            ctx.fill();

            for (let r = 0; r < 2; r++) {
              ctx.strokeStyle = r === 0 ? mainCol : secCol;
              ctx.lineWidth = (r === 0 ? 4 : 2.5) * (1 - bloom * 0.6);
              ctx.beginPath();
              ctx.arc(hpPt.x, hpPt.y, 14 + easeB * (46 + r * 20), 0, Math.PI * 2);
              ctx.stroke();
            }

            for (let pt = 0; pt < 10; pt++) {
              const a = (pt / 10) * Math.PI * 2 + sec * 2.5;
              const d = 14 + easeB * 52;
              ctx.fillStyle = pt % 2 === 0 ? '#ffffff' : secCol;
              ctx.beginPath();
              ctx.arc(hpPt.x + Math.cos(a) * d, hpPt.y + Math.sin(a) * d, 3.2 * (1 - bloom * 0.4), 0, Math.PI * 2);
              ctx.fill();
            }
          }

          ctx.restore();
          drawBadge(
            hpPt.x,
            hpPt.y - 42,
            vfx.label || (isMipo ? '💜 +1 VIDA MÁX E ATUAL (MIPO)' : '🧚💚 +1 VIDA MÁX E ATUAL (FINN)'),
            mainCol,
            '#ffffff',
            masterAlpha
          );
          break;
        }

        // 19. KYN / BIMO: Impacto pesado BONK!
        case 'kyn_bonk': {
          const tx = primaryTarget.x;
          const ty = primaryTarget.y;
          const slam = Math.min(1, p / 0.35);
          const bounce = 1 + Math.sin(Math.min(1, (p - 0.35) * 2.5) * Math.PI) * 0.25;
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          ctx.translate(tx, ty - (1 - slam) * 55);
          ctx.scale(bounce, bounce);

          // Estrela de impacto sísmico
          ctx.fillStyle = '#fbbf24';
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 4;
          ctx.beginPath();
          for (let i = 0; i < 16; i++) {
            const ang = (i * Math.PI) / 8;
            const r = i % 2 === 0 ? 58 : 30;
            if (i === 0) ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
            else ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.font = '900 24px "Cinzel", system-ui, sans-serif';
          ctx.fillStyle = '#1c1917';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('BONK!', 0, 1);
          ctx.restore();
          drawBadge(tx, ty + 78, vfx.label || '🔨 BONK! ATORDOADO 1R', '#fbbf24', '#fef3c7', masterAlpha);
          break;
        }

        // 20. MARA (MODERNIZADA): Pequena orbe elétrica se integrando à unidade escolhida
        case 'mara_potion_power': {
          drawElementalIntegrationOrb({
            coreColor: '#fef08a',
            midColor: '#22d3ee',
            outerColor: '#eab308',
            glowColor: '#38bdf8',
            elementKind: 'electric',
            badgeText: '⚡ +6 PODER (ORBE ELÉTRICA DE MARA)',
            badgeBorder: '#fde047',
            badgeTextCol: '#ecfeff',
          });
          break;
        }

        // 21. TYN: Esquiva relâmpago
        case 'tyn_lightning_dodge': {
          const shift = Math.sin(p * Math.PI) * 62;
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          [-1, 0, 1].forEach((ghost) => {
            ctx.strokeStyle = ghost === 0 ? '#fde047' : 'rgba(34, 211, 238, 0.55)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(src.x + ghost * 24 + shift - 42, src.y - 58, 84, 116, 10);
            ctx.stroke();
          });
          drawBolt(src.x - 50, src.y, src.x + shift + 50, src.y - 18, '#22d3ee', 4, masterAlpha, sec);
          ctx.restore();
          drawBadge(src.x, src.y - 84, vfx.label || '⚡💨 ESQUIVA RELÂMPAGO DE TYN!', '#fde047', '#fef9c3', masterAlpha);
          break;
        }

        // 22. O ATORMENTADO FUSÃO: 3 cartas se unem em um raio (~2.0s épico)
        case 'atormentador_fusion': {
          const cx = vw * 0.5;
          const cy = vh * 0.5;
          const conv = Math.min(1, p / 0.58);
          const ease = conv * conv;
          const origins = [
            { x: vw * 0.25, y: src.y },
            { x: vw * 0.5, y: src.y },
            { x: vw * 0.75, y: src.y },
          ];
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          origins.forEach((o, i) => {
            const x = o.x + (cx - o.x) * ease;
            const y = o.y + (cy - o.y) * ease;
            ctx.fillStyle = i % 2 === 0 ? '#fde047' : '#22d3ee';
            ctx.shadowColor = '#fde047';
            ctx.shadowBlur = 22;
            ctx.beginPath();
            ctx.arc(x, y, 16 * (1 - ease * 0.35), 0, Math.PI * 2);
            ctx.fill();
            drawBolt(x, y, cx, cy, '#22d3ee', 3.5, masterAlpha, sec + i);
          });
          if (p >= 0.52) {
            const b = (p - 0.52) / 0.48;
            drawBolt(cx, 0, cx, cy, '#ffffff', 12 * (1 - b * 0.5), masterAlpha, sec);
            drawBolt(cx, 0, cx, cy, '#fde047', 6, masterAlpha, sec + 1);
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 6 * (1 - b);
            ctx.beginPath();
            ctx.arc(cx, cy, 35 + b * 220, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
          drawBadge(cx, cy - 115, vfx.label || '⚡🌩️ FUSÃO SUPREMA: O ATORMENTADOR SURGIU!', '#fde047', '#fef9c3', masterAlpha);
          break;
        }

        // 23. ATORMENTADOR STUN / KARATY CHAIN / BARÃO WELL LVL 2 BOLTS
        case 'atormentador_stun_bolt':
        case 'karaty_chain_lightning':
        case 'barao_well_lvl2_bolts': {
          const isSky = vfx.type === 'barao_well_lvl2_bolts';
          const isKaraty = vfx.type === 'karaty_chain_lightning';
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          targets.forEach((tg, idx) => {
            const sx = isSky ? tg.x + (idx % 2 === 0 ? -24 : 24) : idx === 0 || !isKaraty ? src.x : targets[idx - 1].x;
            const sy = isSky ? 10 : idx === 0 || !isKaraty ? src.y : targets[idx - 1].y;
            drawBolt(sx, sy, tg.x, tg.y, '#fde047', 5, masterAlpha, sec + idx * 0.7);
            drawBolt(sx, sy, tg.x, tg.y, '#22d3ee', 2.5, masterAlpha, sec + idx * 1.1);
            ctx.fillStyle = 'rgba(253, 224, 71, 0.35)';
            ctx.beginPath();
            ctx.arc(tg.x, tg.y, 28 + Math.sin(p * Math.PI) * 26, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.restore();
          drawBadge(
            primaryTarget.x,
            primaryTarget.y - 84,
            vfx.label ||
              (isSky
                ? '🌩️⚡ RAIOS DO BARÃO WELL LVL 2!'
                : isKaraty
                  ? '⚡🌩️ TEMPESTADE EM CADEIA DE KARATY!'
                  : '⚡ DESCARGA DO ATORMENTADOR · ATORDOADO!'),
            '#fde047',
            '#ecfeff',
            masterAlpha
          );
          break;
        }

        // 24. KARLO: Grande onda de choque mágica ao morrer
        case 'karlo_death_shockwave': {
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          for (let r = 0; r < 3; r++) {
            const rp = Math.max(0, Math.min(1, p - r * 0.1));
            ctx.strokeStyle = r % 2 === 0 ? '#d946ef' : '#a855f7';
            ctx.lineWidth = 7 * (1 - rp * 0.6);
            ctx.shadowColor = '#d946ef';
            ctx.shadowBlur = 24;
            ctx.beginPath();
            ctx.arc(src.x, src.y, 24 + rp * 420, 0, Math.PI * 2);
            ctx.stroke();
          }
          targets.forEach((tg) => {
            ctx.fillStyle = 'rgba(217, 70, 239, 0.45)';
            ctx.beginPath();
            ctx.arc(tg.x, tg.y, 38 * (1 - p * 0.3), 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.restore();
          drawBadge(src.x, src.y - 86, vfx.label || '💥🔮 ONDA DE CHOQUE DE KARLO!', '#d946ef', '#fae8ff', masterAlpha);
          break;
        }

        // 25. MESMERINO: Espelhamento duplicador + dreno 60%
        case 'mesmerino_mirror': {
          const tx = primaryTarget.x;
          const ty = primaryTarget.y;
          const split = Math.sin(p * Math.PI) * 34;
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          [-split, split].forEach((dx, i) => {
            ctx.strokeStyle = i === 0 ? '#a855f7' : '#e879f9';
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#d946ef';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.roundRect(tx + dx - 44, ty - 60, 88, 120, 10);
            ctx.stroke();
          });
          ctx.restore();
          drawBadge(tx, ty - 84, vfx.label || '🪞🔮 ESPELHO DE MESMERINO · 2x PODER / 60% VIDA', '#d946ef', '#fae8ff', masterAlpha);
          break;
        }

        // 26. RAINHA LIZ & REI MAURÍCIO: Investidura / Estandarte real
        case 'rainha_liz_power_decree':
        case 'rei_mauricio_decree': {
          const isLiz = vfx.type === 'rainha_liz_power_decree';
          const col = isLiz ? '#d946ef' : '#fbbf24';
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          targets.forEach((tg) => {
            ctx.strokeStyle = col;
            ctx.lineWidth = 4;
            ctx.shadowColor = col;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(tg.x, tg.y, 26 + Math.sin(p * Math.PI) * 36, 0, Math.PI * 2);
            ctx.stroke();
            // Crown spark
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.moveTo(tg.x - 16, tg.y - 54);
            ctx.lineTo(tg.x - 8, tg.y - 68);
            ctx.lineTo(tg.x, tg.y - 58);
            ctx.lineTo(tg.x + 8, tg.y - 68);
            ctx.lineTo(tg.x + 16, tg.y - 54);
            ctx.closePath();
            ctx.fill();
          });
          ctx.restore();
          drawBadge(
            primaryTarget.x,
            primaryTarget.y - 90,
            vfx.label || (isLiz ? '👑🔮 DECRETO DA RAINHA LIZ (+15 PODER)' : '🎺👑 DECRETO DO REI MAURÍCIO (CRÍTICO + BRAVURA)'),
            col,
            '#ffffff',
            masterAlpha
          );
          break;
        }

        // 27. LICIA LVL 2: Brilho púrpura atinge todos os aliados (~1.8s épico)
        case 'licia_lvl2_light_wave': {
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          ctx.strokeStyle = '#d946ef';
          ctx.lineWidth = 8 * (1 - p * 0.5);
          ctx.shadowColor = '#a855f7';
          ctx.shadowBlur = 28;
          ctx.beginPath();
          ctx.arc(src.x, src.y, 24 + p * 460, 0, Math.PI * 2);
          ctx.stroke();

          targets.forEach((tg) => {
            ctx.strokeStyle = '#e879f9';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(src.x, src.y);
            ctx.lineTo(tg.x, tg.y);
            ctx.stroke();
            ctx.fillStyle = 'rgba(217, 70, 239, 0.36)';
            ctx.beginPath();
            ctx.arc(tg.x, tg.y, 44, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.restore();
          drawBadge(src.x, src.y - 96, vfx.label || '🦋✨ ASCENSÃO DE LICIA LVL 2 · LUZ PÚRPURA!', '#e879f9', '#fae8ff', masterAlpha);
          break;
        }

        // 28. TIRYU: Auto-flagelação sombria
        case 'tiryu_self_harm': {
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 5;
          ctx.shadowColor = '#be123c';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.moveTo(src.x - 38, src.y - 44);
          ctx.lineTo(src.x + 38, src.y + 44);
          ctx.moveTo(src.x + 38, src.y - 44);
          ctx.lineTo(src.x - 38, src.y + 44);
          ctx.stroke();
          ctx.restore();
          drawBadge(src.x, src.y - 78, vfx.label || '🩸 AUTO-FLAGELAR DE TIRYU (-5 SAPIÊNCIA)', '#f43f5e', '#ffe4e6', masterAlpha);
          break;
        }

        // 29. ZYK: Moeda do Turno em Púrpura Cósmica
        case 'zyk_purple_coin': {
          const coinPt = primaryTarget;
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          for (let r = 0; r < 3; r++) {
            const rp = Math.max(0, Math.min(1, p - r * 0.14));
            ctx.strokeStyle = r % 2 === 0 ? '#a855f7' : '#e879f9';
            ctx.lineWidth = 4 * (1 - rp * 0.5);
            ctx.shadowColor = '#9333ea';
            ctx.shadowBlur = 26;
            ctx.beginPath();
            ctx.arc(coinPt.x, coinPt.y, 34 + rp * 76, 0, Math.PI * 2);
            ctx.stroke();
          }
          // Orbiting cosmic runes
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + sec * 5;
            const ox = coinPt.x + Math.cos(a) * 52;
            const oy = coinPt.y + Math.sin(a) * 52;
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(ox, oy, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          drawBadge(coinPt.x + 125, coinPt.y, vfx.label || '🪙🟣 ATAQUE EXTRA CÓSMICO DE ZYK!', '#a855f7', '#f3e8ff', masterAlpha);
          break;
        }

        // 30. LUNARIO SLEEP BEAM / A LUA LVL 2 SLEEP
        case 'lunario_sleep_beam':
        case 'a_lua_lvl2_sleep': {
          const isLua = vfx.type === 'a_lua_lvl2_sleep';
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          targets.forEach((tg) => {
            ctx.strokeStyle = '#818cf8';
            ctx.lineWidth = 5;
            ctx.shadowColor = '#6366f1';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.moveTo(src.x, src.y);
            ctx.lineTo(tg.x, tg.y);
            ctx.stroke();

            ctx.font = '900 22px "Cinzel", sans-serif';
            ctx.fillStyle = '#c7d2fe';
            ctx.fillText('💤', tg.x + Math.sin(sec * 5) * 8, tg.y - p * 44);
          });
          ctx.restore();
          drawBadge(
            primaryTarget.x,
            primaryTarget.y - 84,
            vfx.label || (isLua ? '🌙💤 SONO PROFUNDO DE A LUA LVL 2!' : '🌙💤 LETARGIA DE LUNARIO (2ª CARTA)'),
            '#818cf8',
            '#e0e7ff',
            masterAlpha
          );
          break;
        }

        // 31. LUNARIO LVL 2 CONSUME & A LUA LUNARIO OBLITERATE
        case 'lunario_lvl2_consume':
        case 'a_lua_lunario_obliterate': {
          const isOblit = vfx.type === 'a_lua_lunario_obliterate';
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          targets.forEach((tg) => {
            // Espiral sugada para Lunário
            const sx = tg.x + (src.x - tg.x) * Math.min(1, p / 0.78);
            const sy = tg.y + (src.y - tg.y) * Math.min(1, p / 0.78);
            ctx.fillStyle = isOblit ? '#f43f5e' : '#818cf8';
            ctx.shadowColor = isOblit ? '#e11d48' : '#6366f1';
            ctx.shadowBlur = 22;
            ctx.beginPath();
            ctx.arc(sx, sy, 11, 0, Math.PI * 2);
            ctx.fill();
            if (isOblit) {
              ctx.strokeStyle = '#fda4af';
              ctx.lineWidth = 4;
              ctx.beginPath();
              ctx.arc(tg.x, tg.y, 22 + p * 48, 0, Math.PI * 2);
              ctx.stroke();
            }
          });
          ctx.restore();
          drawBadge(
            src.x,
            src.y - 84,
            vfx.label || (isOblit ? '🌙🕳️ OBLITERAÇÃO LUNAR DE A LUA & LUNARIO!' : '🌙✨ LUNARIO CONSUMIU SONO (+5/+5)'),
            isOblit ? '#f43f5e' : '#818cf8',
            '#ffffff',
            masterAlpha
          );
          break;
        }

        // 32. PCIE: Escudo mágico prateado/dourado repelindo o golpe
        case 'pcie_shield_block': {
          const cx = src.x;
          const cy = src.y;
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          ctx.fillStyle = 'rgba(226, 232, 240, 0.25)';
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 5;
          ctx.shadowColor = '#e2e8f0';
          ctx.shadowBlur = 24;
          ctx.beginPath();
          for (let h = 0; h < 6; h++) {
            const ang = (h * Math.PI) / 3 - Math.PI / 6;
            const px = cx + Math.cos(ang) * 58;
            const py = cy + Math.sin(ang) * 58;
            if (h === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
          drawBadge(cx, cy - 86, vfx.label || '🛡️✨ ESCUDO MÁGICO DE PCIE BLOQUEOU!', '#fbbf24', '#f8fafc', masterAlpha);
          break;
        }

        // =====================================================================
        // NOVAS ANIMAÇÕES EXCLUSIVAS — CLASSE DIVINO & ARCANJOS
        // =====================================================================

        // 33. AMBROZ (T1 Divino): Alvorada solar & clarão de Crítico
        case 'ambroz_alvorada_crit': {
          const cx = src.x;
          const cy = src.y;
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          const sunG = ctx.createRadialGradient(cx, cy - 16, 6, cx, cy, 86);
          sunG.addColorStop(0, 'rgba(254, 249, 195, 0.92)');
          sunG.addColorStop(0.45, 'rgba(251, 191, 36, 0.48)');
          sunG.addColorStop(1, 'transparent');
          ctx.fillStyle = sunG;
          ctx.beginPath();
          ctx.arc(cx, cy, 86, 0, Math.PI * 2);
          ctx.fill();

          // Lâmina crítica diagonal dourada-rubra
          const slash = Math.min(1, p / 0.55);
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 7;
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 22;
          ctx.beginPath();
          ctx.moveTo(cx - 56, cy + 48);
          ctx.lineTo(cx - 56 + 112 * slash, cy + 48 - 104 * slash);
          ctx.stroke();

          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(cx, cy, 34 + p * 44, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          drawBadge(cx, cy - 84, vfx.label || '🌅⚔️ ALVORADA DE AMBROZ · CRÍTICO (1R)!', '#fbbf24', '#fef3c7', masterAlpha);
          break;
        }

        // 34. BIA, A FADA (T1 Divino): Furto Feérico — trilha iridescente do grimório rival à mão
        case 'bia_furto_feerico': {
          const enemySideKey = vfx.ownerSide === 'opponent' ? 'player' : 'opponent';
          const allySideKey = vfx.ownerSide === 'opponent' ? 'opponent' : 'player';
          const enemyDeckPt = resolveZonePoint(`[data-deck-zone="${enemySideKey}"]`, { x: vw * 0.2, y: vh * 0.24 });
          const allyHandPt = resolveZonePoint(`[data-hand-zone="${allySideKey}"]`, { x: vw * 0.5, y: vh * 0.84 });
          const midPt = src;
          const tMove = Math.min(1, p / 0.85);
          const px =
            tMove < 0.45
              ? enemyDeckPt.x + (midPt.x - enemyDeckPt.x) * (tMove / 0.45)
              : midPt.x + (allyHandPt.x - midPt.x) * ((tMove - 0.45) / 0.55);
          const py =
            tMove < 0.45
              ? enemyDeckPt.y + (midPt.y - enemyDeckPt.y) * (tMove / 0.45) - Math.sin((tMove / 0.45) * Math.PI) * 35
              : midPt.y + (allyHandPt.y - midPt.y) * ((tMove - 0.45) / 0.55) - Math.sin(((tMove - 0.45) / 0.55) * Math.PI) * 35;

          ctx.save();
          ctx.globalAlpha = masterAlpha;
          ctx.strokeStyle = '#e879f9';
          ctx.lineWidth = 3;
          ctx.setLineDash([7, 6]);
          ctx.shadowColor = '#f472b6';
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.moveTo(enemyDeckPt.x, enemyDeckPt.y);
          ctx.quadraticCurveTo(midPt.x, midPt.y - 48, allyHandPt.x, allyHandPt.y);
          ctx.stroke();
          ctx.setLineDash([]);

          for (let i = 0; i < 16; i++) {
            const ang = (i / 16) * Math.PI * 2 + sec * 4;
            const d = 10 + (i % 4) * 9;
            ctx.fillStyle = i % 2 === 0 ? '#fef08a' : '#f472b6';
            ctx.beginPath();
            ctx.arc(px + Math.cos(ang) * d, py + Math.sin(ang) * d, 3.6, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillStyle = '#fdf4ff';
          ctx.beginPath();
          ctx.arc(px, py, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          drawBadge(src.x, src.y - 84, vfx.label || '🧚✨ FURTO FEÉRICO DE BIA · CARTA CAPTURADA!', '#e879f9', '#fdf4ff', masterAlpha);
          break;
        }

        // 35. NULIO (MODERNIZADO): Pequena orbe divina se integrando à unidade escolhida (+4 Poder + Cura 2R)
        case 'nulio_luz_revigorante': {
          drawElementalIntegrationOrb({
            coreColor: '#fef9c3',
            midColor: '#fbbf24',
            outerColor: '#34d399',
            glowColor: '#f59e0b',
            elementKind: 'divine',
            badgeText: '✨ ORBE DIVINA DE NULIO · +4 PODER & CURA (2R)',
            badgeBorder: '#fbbf24',
            badgeTextCol: '#fef9c3',
          });
          break;
        }

        // 36. LUCENT (T2 Divino): Purificação Ardente — consome Torpor e converte em Queimadura
        case 'lucent_purificacao_ardente': {
          const tx = primaryTarget.x;
          const ty = primaryTarget.y;
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          // Feixe solar purificador
          const grad = ctx.createLinearGradient(src.x, src.y, tx, ty);
          grad.addColorStop(0, '#fef08a');
          grad.addColorStop(0.5, '#fbbf24');
          grad.addColorStop(1, '#f97316');
          ctx.strokeStyle = grad;
          ctx.lineWidth = 10 * (1 - p * 0.4);
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 24;
          ctx.beginPath();
          ctx.moveTo(src.x, src.y);
          ctx.lineTo(tx, ty);
          ctx.stroke();

          // Anel de Torpor roxo estilhaçando em chamas douradas
          if (p < 0.55) {
            ctx.strokeStyle = '#c084fc';
            ctx.setLineDash([10, 8]);
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.arc(tx, ty, 34 + (p / 0.55) * 24, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          for (let i = 0; i < 14; i++) {
            const ang = (i / 14) * Math.PI * 2 + sec * 3;
            const dist = 16 + p * 56;
            ctx.fillStyle = i % 2 === 0 ? '#fde047' : '#f97316';
            ctx.beginPath();
            ctx.arc(tx + Math.cos(ang) * dist, ty + Math.sin(ang) * dist, 5.2 * (1 - p * 0.45), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          drawBadge(tx, ty - 84, vfx.label || '☀️🔥 LUCENT · 2x DANO & TORPOR ➔ QUEIMADURA!', '#f97316', '#fef08a', masterAlpha);
          break;
        }

        // 37. MAVIE (T2 Divino): Ceifa Luminosa — arco espectral + absorção de poder
        case 'mavie_ceifa_luminosa': {
          const deadPt = primaryTarget;
          const maviePt = src;
          const orbT = Math.max(0, (p - 0.25) / 0.75);
          const ox = deadPt.x + (maviePt.x - deadPt.x) * orbT;
          const oy = deadPt.y + (maviePt.y - deadPt.y) * orbT - Math.sin(orbT * Math.PI) * 44;

          ctx.save();
          ctx.globalAlpha = masterAlpha;
          // Arco de foice dourado-rubro sobre a vítima abatida
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 7;
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 24;
          ctx.beginPath();
          ctx.arc(deadPt.x, deadPt.y, 58, -Math.PI * 0.85, Math.PI * 0.25);
          ctx.stroke();

          if (p > 0.22) {
            ctx.strokeStyle = '#fb7185';
            ctx.lineWidth = 3;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.moveTo(deadPt.x, deadPt.y);
            ctx.lineTo(maviePt.x, maviePt.y);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(ox, oy, 12, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          drawBadge(maviePt.x, maviePt.y - 84, vfx.label || '🪽🩸 CEIFA DE MAVIE · +3 PODER & ROUBO DE VIDA!', '#fbbf24', '#ffe4e6', masterAlpha);
          break;
        }

        // 38. FALANX (T3 Divino): Onda de Luz Divina varrendo inimigos (invocação/morte)
        case 'falanx_onda_luz': {
          const cx = src.x;
          const cy = src.y;
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          for (let r = 0; r < 3; r++) {
            const rp = Math.max(0, Math.min(1, p - r * 0.12));
            ctx.strokeStyle = r % 2 === 0 ? '#fde047' : '#c084fc';
            ctx.lineWidth = 6 * (1 - rp * 0.5);
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 24;
            ctx.beginPath();
            ctx.arc(cx, cy, 24 + rp * 440, 0, Math.PI * 2);
            ctx.stroke();
          }
          targets.forEach((tg) => {
            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 6]);
            ctx.beginPath();
            ctx.arc(tg.x, tg.y, 38 * (0.6 + p * 0.5), 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
          });
          ctx.restore();
          drawBadge(cx, cy - 88, vfx.label || '✨🌀 ONDA DE LUZ DE FALANX · TORPOR EM TODOS!', '#fde047', '#f3e8ff', masterAlpha);
          break;
        }

        // 39. KAMUI (T3 Divino): Chamado Sagrado — portal de Retorno + bônus Divino
        case 'kamui_chamado_sagrado': {
          const cx = src.x;
          const cy = src.y;
          drawDivineMandala(cx, cy, 52 + Math.sin(p * Math.PI) * 20, sec * 2.8, '#fde047', '#38bdf8', masterAlpha);
          ctx.save();
          ctx.globalAlpha = masterAlpha * 0.72;
          const beamG = ctx.createLinearGradient(cx, cy - 150, cx, cy + 40);
          beamG.addColorStop(0, 'transparent');
          beamG.addColorStop(0.5, 'rgba(254, 240, 138, 0.72)');
          beamG.addColorStop(1, 'transparent');
          ctx.fillStyle = beamG;
          ctx.fillRect(cx - 34, cy - 150, 68, 190);
          ctx.restore();
          drawBadge(cx, cy - 88, vfx.label || '🕊️✨ CHAMADO SAGRADO DE KAMUI · RETORNAR (+10 SE DIVINO)', '#fde047', '#fef9c3', masterAlpha);
          break;
        }

        // 40. TORVYX, O ARCANJO (T2): Visão Celestial acionando Revelar
        case 'torvyx_visao_celestial': {
          const cx = src.x;
          const cy = src.y;
          drawWingPair(cx, cy, 118, Math.min(1, p / 0.5), '#fde047', '#38bdf8', masterAlpha * 0.8);
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 3.5;
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 24;
          // Olho celestial brilhante
          ctx.beginPath();
          ctx.moveTo(cx - 50, cy - 10);
          ctx.quadraticCurveTo(cx, cy - 48, cx + 50, cy - 10);
          ctx.quadraticCurveTo(cx, cy + 28, cx - 50, cy - 10);
          ctx.stroke();

          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(cx, cy - 10, 12 + Math.sin(p * Math.PI) * 5, 0, Math.PI * 2);
          ctx.fill();

          if (secSrc && Math.hypot(secSrc.x - cx, secSrc.y - cy) > 20) {
            ctx.strokeStyle = 'rgba(253, 224, 71, 0.8)';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(secSrc.x, secSrc.y);
            ctx.lineTo(cx, cy);
            ctx.stroke();
          }
          ctx.restore();
          drawBadge(cx, cy - 88, vfx.label || '🔮🪽 VISÃO CELESTIAL DE TORVYX · REVELAR!', '#fbbf24', '#e0f2fe', masterAlpha);
          break;
        }

        // 41. UMAEL, O ARCANJO (T3): Imposição do Duelo — correntes douradas de Enfrentar
        case 'umael_imposicao_duelo': {
          const tx = primaryTarget.x;
          const ty = primaryTarget.y;
          drawWingPair(src.x, src.y, 118, Math.min(1, p / 0.5), '#fde047', '#f59e0b', masterAlpha * 0.8);
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          if (Math.hypot(src.x - tx, src.y - ty) > 20) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 4.5;
            ctx.setLineDash([12, 6]);
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.moveTo(src.x, src.y);
            ctx.lineTo(tx, ty);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          // Lanças cruzadas sobre o alvo
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(tx - 44, ty - 48);
          ctx.lineTo(tx + 44, ty + 48);
          ctx.moveTo(tx + 44, ty - 48);
          ctx.lineTo(tx - 44, ty + 48);
          ctx.stroke();
          ctx.restore();
          drawBadge(tx, ty - 84, vfx.label || '🗡️🪽 IMPOSIÇÃO DO DUELO · ENFRENTAR CONCEDIDO!', '#fbbf24', '#fef3c7', masterAlpha);
          break;
        }

        // 42. PÓLUS, O ARCANJO (T4 ESPECIAL): Golpe Penetrante & Halo Celestial
        case 'polus_golpe_penetrante': {
          const cx = src.x;
          const cy = src.y;
          drawWingPair(cx, cy, 145, Math.min(1, p / 0.45), '#fef9c3', '#38bdf8', masterAlpha * 0.9);
          drawDivineMandala(cx, cy, 62 + Math.sin(p * Math.PI) * 18, sec * 3.2, '#fde047', '#bae6fd', masterAlpha);
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          const beamG = ctx.createLinearGradient(cx, cy - 220, cx, cy + 90);
          beamG.addColorStop(0, 'transparent');
          beamG.addColorStop(0.5, 'rgba(254, 249, 195, 0.85)');
          beamG.addColorStop(1, 'transparent');
          ctx.fillStyle = beamG;
          ctx.fillRect(cx - 18, cy - 220, 36, 310);

          // Mira crítica cristalina
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(cx, cy, 34, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          drawBadge(cx, cy - 96, vfx.label || '🎯🪽 PÓLUS, O ARCANJO · GOLPE PENETRANTE (CRÍTICO)!', '#fde047', '#ffffff', masterAlpha);
          break;
        }

        // 43. VERGOR (T4 DIVINO ESPECIAL): Metamorfo Divino — prisma espelhado mantendo classe Divino
        case 'vergor_metamorfo_divino': {
          const enemyPt = primaryTarget;
          const vergorPt = src;
          const morphT = Math.min(1, p / 0.78);
          const beamX = enemyPt.x + (vergorPt.x - enemyPt.x) * morphT;
          const beamY = enemyPt.y + (vergorPt.y - enemyPt.y) * morphT;

          drawDivineMandala(vergorPt.x, vergorPt.y, 70, sec * 3.4, '#fde047', '#e879f9', masterAlpha);
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 24;
          ctx.beginPath();
          ctx.moveTo(enemyPt.x, enemyPt.y);
          ctx.lineTo(beamX, beamY);
          ctx.stroke();

          // Estilhaços caleidoscópicos
          for (let i = 0; i < 12; i++) {
            const ang = (i / 12) * Math.PI * 2 + sec * 3;
            const d = 18 + Math.sin(p * Math.PI) * 58;
            ctx.fillStyle = i % 2 === 0 ? '#fef08a' : '#c084fc';
            ctx.save();
            ctx.translate(vergorPt.x + Math.cos(ang) * d, vergorPt.y + Math.sin(ang) * d);
            ctx.rotate(ang);
            ctx.fillRect(-5, -5, 10, 10);
            ctx.restore();
          }
          ctx.restore();
          drawBadge(vergorPt.x, vergorPt.y - 96, vfx.label || '🪞🪽 VERGOR · METAMORFO DIVINO!', '#fde047', '#fae8ff', masterAlpha);
          break;
        }

        // 44. XENO (T4 DIVINO ESPECIAL): Julgamento Paralizante + Geração de Centelha
        case 'xeno_julgamento_paralizante': {
          const allySideKey = vfx.ownerSide === 'opponent' ? 'opponent' : 'player';
          const handPt = resolveZonePoint(`[data-hand-zone="${allySideKey}"]`, { x: vw * 0.5, y: vh * 0.84 });
          drawDivineMandala(src.x, src.y, 68, -sec * 3, '#fde047', '#38bdf8', masterAlpha * 0.9);
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          targets.forEach((tg, idx) => {
            drawBolt(src.x, src.y, tg.x, tg.y, '#fde047', 6, masterAlpha, sec + idx * 0.9);
            drawBolt(src.x, src.y, tg.x, tg.y, '#ffffff', 2.6, masterAlpha, sec + idx * 1.4);
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.arc(tg.x, tg.y, 34 + Math.sin(p * Math.PI) * 20, 0, Math.PI * 2);
            ctx.stroke();
          });
          // Centelha gerada indo de Xeno até a mão
          if (p > 0.35) {
            const ct = Math.min(1, (p - 0.35) / 0.6);
            const cx = src.x + (handPt.x - src.x) * ct;
            const cy = src.y + (handPt.y - src.y) * ct - Math.sin(ct * Math.PI) * 40;
            ctx.fillStyle = '#fef9c3';
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 24;
            ctx.beginPath();
            ctx.arc(cx, cy, 11, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          drawBadge(src.x, src.y - 96, vfx.label || '⚡🪽 XENO · ATORDOAMENTO & CENTELHA DIVINA!', '#fde047', '#fef9c3', masterAlpha);
          break;
        }

        // 45. ZAEL, O ARCANJO (T4 ESPECIAL): Bênção de Ressurreição + Cura Líder
        case 'zael_bencao_ressurreicao': {
          const allySideKey = vfx.ownerSide === 'opponent' ? 'opponent' : 'player';
          const hpPt = resolveZonePoint(`[data-hp-bar="${allySideKey}"]`, { x: vw * 0.14, y: vh * 0.84 });
          drawWingPair(src.x, src.y, 165, Math.min(1, p / 0.45), '#fef9c3', '#fbbf24', masterAlpha);
          drawDivineMandala(src.x, src.y, 72, sec * 2.2, '#fde047', '#ffffff', masterAlpha * 0.85);
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          // Raio de cura ao HP do líder
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.moveTo(src.x, src.y);
          ctx.lineTo(hpPt.x, hpPt.y);
          ctx.stroke();

          targets.forEach((tg) => {
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(tg.x, tg.y, 38 + Math.sin(p * Math.PI) * 20, 0, Math.PI * 2);
            ctx.stroke();
          });
          ctx.restore();
          drawBadge(src.x, src.y - 102, vfx.label || '🪽✨ ZAEL · +2 VIDA LÍDER & RESSURREIÇÃO ALIADA!', '#fde047', '#ecfdf5', masterAlpha);
          break;
        }

        // 46. ZAEL CREPÚSCULO (Exílio ao fim da rodada)
        case 'zael_exilio_crepusculo': {
          const cx = src.x;
          const cy = src.y;
          drawWingPair(cx, cy, 130 * (1 - p * 0.4), 1 - p * 0.35, '#fef08a', '#f59e0b', masterAlpha);
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          const ascendY = cy - p * 110;
          const g = ctx.createRadialGradient(cx, ascendY, 4, cx, ascendY, 64);
          g.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          g.addColorStop(0.5, 'rgba(251, 191, 36, 0.55)');
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cx, ascendY, 64, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          drawBadge(cx, cy - 88, vfx.label || '🪽🌅 ZAEL ASCENDEU AO EXÍLIO CELESTIAL', '#fbbf24', '#fef9c3', masterAlpha);
          break;
        }

        // 47. FALEZIEL, O ARCANJO (T4 SECRETO ESPECIAL): Revelação Angiris sobre Cavaleiro sem Nome
        case 'faleziel_revelacao_angiris': {
          const cx = src.x;
          const cy = src.y;
          const burst = Math.min(1, p / 0.42);
          drawWingPair(cx, cy, 185, burst, '#ffffff', '#fde047', masterAlpha);
          drawDivineMandala(cx, cy, 82 + Math.sin(p * Math.PI) * 24, sec * 3.5, '#fde047', '#ffffff', masterAlpha);
          drawDivineMandala(cx, cy, 56, -sec * 2.5, '#38bdf8', '#fef08a', masterAlpha * 0.85);
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          const beam = ctx.createLinearGradient(cx, 0, cx, vh);
          beam.addColorStop(0, 'transparent');
          beam.addColorStop(0.45, 'rgba(254, 249, 195, 0.65)');
          beam.addColorStop(1, 'transparent');
          ctx.fillStyle = beam;
          ctx.fillRect(cx - 46, 0, 92, vh);

          for (let i = 0; i < 20; i++) {
            const ang = (i / 20) * Math.PI * 2 + sec * 2;
            const d = 26 + p * 125;
            ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#fde047';
            ctx.beginPath();
            ctx.arc(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, 4.8 * (1 - p * 0.5), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          drawBadge(cx, cy - 112, vfx.label || '🪽⚔️ SEGREDO REVELADO: FALEZIEL, O ARCANJO!', '#ffffff', '#fef08a', masterAlpha);
          break;
        }

        // 48. KALIEL, O ARCANJO (T5 ESPECIAL): Bênção Global Angiris (+15 tudo + Topo do Deck)
        case 'kaliel_bencao_global': {
          const allySideKey = vfx.ownerSide === 'opponent' ? 'opponent' : 'player';
          const deckPt = resolveZonePoint(`[data-deck-zone="${allySideKey}"]`, { x: vw * 0.14, y: vh * 0.72 });
          const handPt = resolveZonePoint(`[data-hand-zone="${allySideKey}"]`, { x: vw * 0.5, y: vh * 0.85 });
          drawWingPair(src.x, src.y, 190, Math.min(1, p / 0.45), '#ffffff', '#fbbf24', masterAlpha);
          drawDivineMandala(src.x, src.y, 88 + Math.sin(p * Math.PI) * 26, sec * 2.8, '#fde047', '#ffffff', masterAlpha);

          ctx.save();
          ctx.globalAlpha = masterAlpha;
          // Feixes de luz para aliados, mão e deck
          [...targets, handPt, deckPt].forEach((tg) => {
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 4;
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 22;
            ctx.beginPath();
            ctx.moveTo(src.x, src.y);
            ctx.lineTo(tg.x, tg.y);
            ctx.stroke();

            ctx.strokeStyle = '#fef9c3';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(tg.x, tg.y, 28 + p * 32, 0, Math.PI * 2);
            ctx.stroke();
          });
          ctx.restore();
          drawBadge(src.x, src.y - 110, vfx.label || '🪽👑 KALIEL · +15 TODOS OS ATRIBUTOS AOS ARCANJOS!', '#fde047', '#ffffff', masterAlpha);
          break;
        }

        // 49. KALIEL LVL 2 (T5 ESPECIAL): Comunhão Angiris — teia dourada entre todos os Arcanjos
        case 'kaliel_comunhao_angiris': {
          drawWingPair(src.x, src.y, 200, Math.min(1, p / 0.4), '#fef9c3', '#fde047', masterAlpha);
          drawDivineMandala(src.x, src.y, 92, sec * 3.2, '#ffffff', '#fbbf24', masterAlpha);
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          const allPts = [src, ...targets];
          for (let i = 0; i < allPts.length; i++) {
            for (let j = i + 1; j < allPts.length; j++) {
              ctx.strokeStyle = '#fde047';
              ctx.lineWidth = 4;
              ctx.shadowColor = '#fbbf24';
              ctx.shadowBlur = 24;
              ctx.beginPath();
              ctx.moveTo(allPts[i].x, allPts[i].y);
              ctx.lineTo(allPts[j].x, allPts[j].y);
              ctx.stroke();
            }
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(allPts[i].x, allPts[i].y, 38 + Math.sin(sec * 8 + i) * 10, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
          drawBadge(src.x, src.y - 112, vfx.label || '👑🪽 COMUNHÃO ANGIRIS LVL 2 · ARCANJOS SINCRONIZADOS!', '#ffffff', '#fef08a', masterAlpha);
          break;
        }

        // 50. SANIEL, O ARCANJO LVL 2 (T5 ESPECIAL): Ascensão Lendária
        case 'saniel_ascensao_lvl2': {
          const cx = src.x;
          const cy = src.y;
          drawWingPair(cx, cy, 175, Math.min(1, p / 0.45), '#fde047', '#f43f5e', masterAlpha);
          drawDivineMandala(cx, cy, 78 + p * 28, -sec * 3, '#fde047', '#fb7185', masterAlpha);
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          for (let i = 0; i < 18; i++) {
            const ang = (i / 18) * Math.PI * 2 + sec * 3;
            const d = 22 + p * 95;
            ctx.fillStyle = i % 2 === 0 ? '#fde047' : '#fda4af';
            ctx.beginPath();
            ctx.arc(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, 4.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          drawBadge(cx, cy - 104, vfx.label || '🌟🪽 SANIEL LVL 2 · ASCENSÃO LENDÁRIA!', '#fde047', '#ffe4e6', masterAlpha);
          break;
        }

        // 51. TARGOR, O DRAGÃO (MODERNIZADO): Baforada de Dragão Negra volumétrica
        case 'targor_praga_breath': {
          ctx.save();
          ctx.globalAlpha = masterAlpha;

          // Brilho sombrio na boca do dragão Targor
          const mawGrad = ctx.createRadialGradient(src.x, src.y, 4, src.x, src.y, 58);
          mawGrad.addColorStop(0, 'rgba(192, 132, 252, 0.95)');
          mawGrad.addColorStop(0.4, 'rgba(15, 10, 24, 0.92)');
          mawGrad.addColorStop(0.8, 'rgba(88, 28, 135, 0.45)');
          mawGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = mawGrad;
          ctx.beginPath();
          ctx.arc(src.x, src.y, 58, 0, Math.PI * 2);
          ctx.fill();

          targets.forEach((tg, tIdx) => {
            const dx = tg.x - src.x;
            const dy = tg.y - src.y;
            const dist = Math.max(20, Math.hypot(dx, dy));
            const angle = Math.atan2(dy, dx);
            const coneProg = Math.min(1, p / 0.56);
            const curLen = dist * coneProg;

            // Cone de baforada negra em camadas (fumaça abissal + núcleo negro-violeta)
            ctx.save();
            ctx.translate(src.x, src.y);
            ctx.rotate(angle);

            const outerSpread = 16 + coneProg * 54;
            const blackCone = ctx.createLinearGradient(0, 0, curLen, 0);
            blackCone.addColorStop(0, 'rgba(10, 6, 16, 0.96)');
            blackCone.addColorStop(0.55, 'rgba(24, 12, 38, 0.9)');
            blackCone.addColorStop(0.85, 'rgba(88, 28, 135, 0.72)');
            blackCone.addColorStop(1, 'rgba(132, 204, 22, 0.25)');
            ctx.fillStyle = blackCone;
            ctx.shadowColor = '#581c87';
            ctx.shadowBlur = 26;
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.quadraticCurveTo(curLen * 0.55, -outerSpread * 0.8, curLen, -outerSpread);
            ctx.arc(curLen, 0, outerSpread, -Math.PI / 2, Math.PI / 2);
            ctx.quadraticCurveTo(curLen * 0.55, outerSpread * 0.8, 0, 10);
            ctx.closePath();
            ctx.fill();

            // Nuvens turbulentas de fogo negro rolando dentro da baforada
            for (let puff = 0; puff < 14; puff++) {
              const frac = ((puff / 14) + p * 1.45) % 1;
              if (frac > coneProg) continue;
              const px = frac * dist;
              const spread = (8 + frac * 42) * Math.sin(puff * 2.3 + sec * 7 + tIdx);
              const pr = 10 + frac * 22;
              const pGrad = ctx.createRadialGradient(px, spread, 2, px, spread, pr);
              pGrad.addColorStop(0, puff % 3 === 0 ? 'rgba(168, 85, 247, 0.75)' : 'rgba(5, 4, 10, 0.95)');
              pGrad.addColorStop(0.6, 'rgba(28, 12, 46, 0.78)');
              pGrad.addColorStop(1, 'transparent');
              ctx.fillStyle = pGrad;
              ctx.beginPath();
              ctx.arc(px, spread, pr, 0, Math.PI * 2);
              ctx.fill();
            }

            // Brasas sombrias e toxinas voando na baforada
            for (let em = 0; em < 12; em++) {
              const frac = ((em / 12) + p * 1.8) % 1;
              if (frac > coneProg) continue;
              const ex = frac * dist;
              const ey = Math.sin(em * 3.1 + sec * 10) * (10 + frac * 40);
              ctx.fillStyle = em % 3 === 0 ? '#a3e635' : em % 2 === 0 ? '#d946ef' : '#09090b';
              ctx.beginPath();
              ctx.arc(ex, ey, 3.2, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();

            // Envolvimento sombrio no impacto sobre o inimigo
            if (p >= 0.34) {
              const imp = Math.min(1, (p - 0.34) / 0.66);
              const hitGrad = ctx.createRadialGradient(tg.x, tg.y, 4, tg.x, tg.y, 58 + imp * 24);
              hitGrad.addColorStop(0, `rgba(9, 7, 16, ${0.9 * (1 - imp * 0.4)})`);
              hitGrad.addColorStop(0.55, `rgba(107, 33, 168, ${0.65 * (1 - imp * 0.5)})`);
              hitGrad.addColorStop(0.88, `rgba(132, 204, 22, ${0.42 * (1 - imp)})`);
              hitGrad.addColorStop(1, 'transparent');
              ctx.fillStyle = hitGrad;
              ctx.beginPath();
              ctx.arc(tg.x, tg.y, 58 + imp * 24, 0, Math.PI * 2);
              ctx.fill();

              ctx.strokeStyle = '#a3e635';
              ctx.lineWidth = 3 * (1 - imp * 0.5);
              ctx.beginPath();
              ctx.arc(tg.x, tg.y, 20 + imp * 46, 0, Math.PI * 2);
              ctx.stroke();
            }
          });
          ctx.restore();
          drawBadge(src.x, src.y - 90, vfx.label || '🐉🖤 BAFORADA NEGRA DE TARGOR · PRAGA (2R)!', '#a855f7', '#ecfccb', masterAlpha);
          break;
        }

        // 52. ATLAZIEL, O ARCANJO CAÍDO (T2 SOMBRIO): Execução de inimigos com Praga (<= 17 HP)
        case 'atlaziel_fallen_execute': {
          drawWingPair(src.x, src.y, 175, Math.min(1, p / 0.45), '#d946ef', '#581c87', masterAlpha);
          drawDivineMandala(src.x, src.y, 74, -sec * 3.2, '#e879f9', '#84cc16', masterAlpha);
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          targets.forEach((tg) => {
            // Guilhotina / Lâmina Abissal descendo sobre o alvo
            const drop = Math.min(1, p / 0.55);
            const bladeY = tg.y - 110 * (1 - drop);
            ctx.strokeStyle = '#e879f9';
            ctx.lineWidth = 5;
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 24;
            ctx.beginPath();
            ctx.moveTo(tg.x - 42, bladeY - 36);
            ctx.lineTo(tg.x + 42, bladeY + 36);
            ctx.moveTo(tg.x + 42, bladeY - 36);
            ctx.lineTo(tg.x - 42, bladeY + 36);
            ctx.stroke();

            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.arc(tg.x, tg.y, 32 + p * 36, 0, Math.PI * 2);
            ctx.stroke();
          });
          ctx.restore();
          drawBadge(src.x, src.y - 98, vfx.label || '🪽💀 ATLAZIEL · EXECUÇÃO DA PRAGA (≤17 VIDA)!', '#d946ef', '#fee2e2', masterAlpha);
          break;
        }

        // 53. BARELIO, O CARCEREIRO (T4 SOMBRIO ESPECIAL): Correntes Abissais que aprisionam inimigo
        case 'barelio_chains_imprison': {
          const tg = targets[0] || { x: vw * 0.5, y: vh * 0.35 };
          // Fase 1 (0..0.38): Correntes disparam de Barelio até a unidade inimiga na mesa
          // Fase 2 (0.38..1.0): Correntes trancam a jaula e arrastam o inimigo preso até Barelio
          const shootPhase = Math.min(1, p / 0.38);
          const pullPhase = p < 0.44 ? 0 : Math.min(1, (p - 0.44) / 0.56);
          const easePull = 1 - Math.pow(1 - pullPhase, 3);

          // Destino final: o topo/jaula de Barelio
          const destX = src.x;
          const destY = src.y - 48;

          const chainTipX =
            p < 0.44
              ? src.x + (tg.x - src.x) * shootPhase
              : tg.x + (destX - tg.x) * easePull;
          const chainTipY =
            p < 0.44
              ? src.y + (tg.y - src.y) * shootPhase
              : tg.y + (destY - tg.y) * easePull;

          drawDivineMandala(src.x, src.y, 86, -sec * 2.8, '#a855f7', '#c084fc', masterAlpha);
          drawShackleCollar(ctx, src.x, src.y, 32, sec, masterAlpha);

          // Fantasma energético na posição original do inimigo na mesa mostrando de onde foi arrancado
          if (p >= 0.32) {
            drawDivineMandala(tg.x, tg.y, 58 * (1 - pullPhase * 0.4), sec * 2.2, '#ef4444', '#a855f7', masterAlpha * 0.65);
          }

          // 3 Correntes forjadas abissais conectando Barelio ao inimigo capturado
          drawForgedAbyssalChain(ctx, src.x - 18, src.y, chainTipX - 14, chainTipY, -38, sec, masterAlpha, {
            primaryColor: '#9333ea',
            highlightColor: '#e9d5ff',
            glowColor: '#a855f7',
          });
          drawForgedAbyssalChain(ctx, src.x + 18, src.y, chainTipX + 14, chainTipY, 38, sec + 0.5, masterAlpha, {
            primaryColor: '#9333ea',
            highlightColor: '#e9d5ff',
            glowColor: '#a855f7',
          });
          drawForgedAbyssalChain(ctx, src.x, src.y, chainTipX, chainTipY, 0, sec + 1.1, masterAlpha, {
            primaryColor: '#d946ef',
            highlightColor: '#fae8ff',
            glowColor: '#e879f9',
            linkLength: 16,
            linkWidth: 8.5,
          });

          // Jaula de ferro abissal e algema ao redor da unidade capturada
          if (p >= 0.28) {
            ctx.save();
            ctx.globalAlpha = masterAlpha;
            const scale = 1 - easePull * 0.38;
            const cageW = 92 * scale;
            const cageH = 122 * scale;

            ctx.fillStyle = 'rgba(24, 9, 38, 0.72)';
            ctx.strokeStyle = '#e879f9';
            ctx.lineWidth = 3.2;
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.roundRect(chainTipX - cageW / 2, chainTipY - cageH / 2, cageW, cageH, 10);
            ctx.fill();
            ctx.stroke();

            // Grades verticais da prisão
            ctx.strokeStyle = '#d8b4fe';
            ctx.lineWidth = 2.4;
            for (let b = -2; b <= 2; b++) {
              const bx = chainTipX + (b * cageW) / 5.2;
              ctx.beginPath();
              ctx.moveTo(bx, chainTipY - cageH / 2);
              ctx.lineTo(bx, chainTipY + cageH / 2);
              ctx.stroke();
            }

            // Correntes cruzadas em X sobre a jaula
            drawForgedAbyssalChain(
              ctx,
              chainTipX - cageW / 2,
              chainTipY - cageH / 2,
              chainTipX + cageW / 2,
              chainTipY + cageH / 2,
              0,
              sec,
              masterAlpha,
              { linkSpacing: 11, linkLength: 12, linkWidth: 6, siphonParticles: 0 }
            );
            drawForgedAbyssalChain(
              ctx,
              chainTipX + cageW / 2,
              chainTipY - cageH / 2,
              chainTipX - cageW / 2,
              chainTipY + cageH / 2,
              0,
              sec,
              masterAlpha,
              { linkSpacing: 11, linkLength: 12, linkWidth: 6, siphonParticles: 0 }
            );

            drawShackleCollar(ctx, chainTipX, chainTipY, 22 * scale, -sec * 1.6, masterAlpha);
            ctx.restore();
          }

          drawBadge(
            src.x,
            src.y - 108,
            vfx.label || '⛓️🌑 BARELIO · UNIDADE APRISIONADA NAS CORRENTES!',
            '#a855f7',
            '#f3e8ff',
            masterAlpha
          );
          break;
        }

        // 54. BARELIO, O CARCEREIRO: Usurpação por rodada (-10 HP ao prisioneiro / absorção ao matar)
        case 'barelio_usurp_tick': {
          const cx = src.x;
          const cy = src.y;
          const prisonerPt =
            (vfx.sourceId && getElementCenter(`[data-barelio-captor-id="${vfx.sourceId}"]`)) ||
            targets[0] || { x: cx, y: cy - 64 };

          drawDivineMandala(cx, cy, 74, -sec * 3.5, '#a855f7', '#ef4444', masterAlpha);
          drawForgedAbyssalChain(ctx, cx - 10, cy, prisonerPt.x - 8, prisonerPt.y, -20, sec * 1.8, masterAlpha, {
            primaryColor: '#e11d48',
            highlightColor: '#fecdd3',
            glowColor: '#f43f5e',
            siphonParticles: 5,
          });
          drawForgedAbyssalChain(ctx, cx + 10, cy, prisonerPt.x + 8, prisonerPt.y, 20, sec * 1.8 + 0.5, masterAlpha, {
            primaryColor: '#a855f7',
            highlightColor: '#f5d0fe',
            glowColor: '#d946ef',
            siphonParticles: 5,
          });
          drawShackleCollar(ctx, prisonerPt.x, prisonerPt.y, 20, -sec * 2, masterAlpha);

          ctx.save();
          ctx.globalAlpha = masterAlpha;
          for (let i = 0; i < 14; i++) {
            const ang = (i / 14) * Math.PI * 2 + sec * 4;
            const r = Math.max(6, 75 * (1 - p));
            ctx.fillStyle = i % 2 === 0 ? '#e879f9' : '#f43f5e';
            ctx.beginPath();
            ctx.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 4.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          drawBadge(cx, cy - 96, vfx.label || '⛓️🩸 USURPAÇÃO DE BARELIO (-10 VIDA AO PRISIONEIRO)!', '#a855f7', '#ffe4e6', masterAlpha);
          break;
        }

        // 55. PASSIVA CORTE DAS FADAS: Milagre Feérico (+2 Vida Rosa ao líder e +75% Poder às Fadas)
        case 'corte_das_fadas_miracle': {
          const allySideKey = vfx.ownerSide === 'opponent' ? 'opponent' : 'player';
          const hpPt = resolveZonePoint(
            `[data-hp-bar="${allySideKey}"]`,
            { x: vw * 0.14, y: allySideKey === 'opponent' ? vh * 0.14 : vh * 0.86 }
          );
          drawWingPair(hpPt.x, hpPt.y, 165, Math.min(1, p / 0.45), '#f472b6', '#fbcfe8', masterAlpha);
          drawDivineMandala(hpPt.x, hpPt.y, 76, sec * 3, '#f472b6', '#fde047', masterAlpha);
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          targets.forEach((tg) => {
            ctx.strokeStyle = '#f472b6';
            ctx.lineWidth = 4;
            ctx.shadowColor = '#ec4899';
            ctx.shadowBlur = 22;
            ctx.beginPath();
            ctx.moveTo(hpPt.x, hpPt.y);
            ctx.lineTo(tg.x, tg.y);
            ctx.stroke();

            ctx.strokeStyle = '#fbcfe8';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(tg.x, tg.y, 28 + p * 34, 0, Math.PI * 2);
            ctx.stroke();
          });
          ctx.restore();
          drawBadge(
            vw * 0.5,
            vh * 0.48,
            vfx.label || '🧚💖 CORTE DAS FADAS · +2 VIDA ROSA & +75% PODER ÀS FADAS!',
            '#f472b6',
            '#fdf2f8',
            masterAlpha
          );
          break;
        }

        // 56. GANGNYR (T3 SOMBRIO): Golpe Sangrento (aplica Sangramento por 2 rodadas)
        case 'gangnyr_bleed_slash': {
          const tg = targets[0] || { x: vw * 0.5, y: vh * 0.35 };
          drawDivineMandala(src.x, src.y, 72, -sec * 3, '#e11d48', '#a855f7', masterAlpha);
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          const slashProg = Math.min(1, p / 0.45);
          ctx.strokeStyle = '#fb7185';
          ctx.lineWidth = 6 * (1 - p * 0.3);
          ctx.shadowColor = '#e11d48';
          ctx.shadowBlur = 22;
          ctx.beginPath();
          ctx.moveTo(tg.x - 48, tg.y - 44);
          ctx.lineTo(tg.x - 48 + 96 * slashProg, tg.y - 44 + 88 * slashProg);
          ctx.stroke();

          for (let i = 0; i < 12; i++) {
            const ang = (i / 12) * Math.PI * 2 + sec * 3.5;
            const r = 12 + p * 54;
            ctx.fillStyle = i % 2 === 0 ? '#f43f5e' : '#a855f7';
            ctx.beginPath();
            ctx.arc(tg.x + Math.cos(ang) * r, tg.y + Math.sin(ang) * r, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          drawBadge(src.x, src.y - 92, vfx.label || '🩸🗡️ GANGNYR · SANGRAMENTO APLICADO (2 RODADAS)!', '#f43f5e', '#ffe4e6', masterAlpha);
          break;
        }

        // 57. GANGNYR / HEMORRAGIA (4ª MARCA DE SANGRAMENTO): Explosão de 25% da Vida Máxima & Roubo de Vida permanente para Gangnyr
        case 'gangnyr_hemorrhage_burst': {
          drawDivineMandala(src.x, src.y, 82, sec * 3.8, '#ef4444', '#f43f5e', masterAlpha);
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          targets.forEach((tg) => {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 4.5;
            ctx.shadowColor = '#dc2626';
            ctx.shadowBlur = 24;
            ctx.beginPath();
            ctx.arc(tg.x, tg.y, 26 + p * 52, 0, Math.PI * 2);
            ctx.stroke();

            // Feixe de sangue drenado para Gangnyr despertando Roubo de Vida
            ctx.strokeStyle = '#fb7185';
            ctx.lineWidth = 3.5;
            ctx.setLineDash([10, 6]);
            ctx.lineDashOffset = sec * 90;
            ctx.beginPath();
            ctx.moveTo(tg.x, tg.y);
            ctx.lineTo(src.x, src.y);
            ctx.stroke();
            ctx.setLineDash([]);
          });
          ctx.restore();
          drawBadge(
            src.x,
            src.y - 98,
            vfx.label || '💔🩸 HEMORRAGIA (-25% VIDA MÁX) · GANGNYR DESPERTOU ROUBO DE VIDA!',
            '#ef4444',
            '#fee2e2',
            masterAlpha
          );
          break;
        }

        // 58. HAMELIA, A FADA PÚTRIDA (T4 SOMBRIO): Véu Furtivo + Néctar de Corrosão em 2 inimigos
        case 'hamelia_putrid_corrosion': {
          drawWingPair(src.x, src.y, 162, Math.min(1, p / 0.45), '#84cc16', '#9333ea', masterAlpha);
          drawDivineMandala(src.x, src.y, 76, -sec * 2.8, '#a3e635', '#c084fc', masterAlpha);
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          targets.forEach((tg) => {
            const beamProg = Math.min(1, p / 0.5);
            const curX = src.x + (tg.x - src.x) * beamProg;
            const curY = src.y + (tg.y - src.y) * beamProg;
            const grad = ctx.createLinearGradient(src.x, src.y, curX, curY);
            grad.addColorStop(0, 'rgba(147, 51, 234, 0.85)');
            grad.addColorStop(1, 'rgba(132, 204, 22, 0.95)');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 10 * (1 - p * 0.3);
            ctx.lineCap = 'round';
            ctx.shadowColor = '#84cc16';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.moveTo(src.x, src.y);
            ctx.lineTo(curX, curY);
            ctx.stroke();

            if (p >= 0.35) {
              const imp = Math.min(1, (p - 0.35) / 0.65);
              ctx.strokeStyle = '#bef264';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(tg.x, tg.y, 22 + imp * 42, 0, Math.PI * 2);
              ctx.stroke();
            }
          });
          ctx.restore();
          drawBadge(
            src.x,
            src.y - 96,
            vfx.label || '🧚🧪 HAMELIA · FURTIVO & CORROSÃO EM 2 INIMIGOS (2 RODADAS)!',
            '#84cc16',
            '#ecfccb',
            masterAlpha
          );
          break;
        }

        // 58. CELIA (BÔNUS DE COMPRA GELO): Gelo e flocos de neve giratórios na unidade beneficiada
        case 'celia_frost_bonus': {
          const tx = primaryTarget.x;
          const ty = primaryTarget.y;
          ctx.save();
          ctx.globalAlpha = masterAlpha;

          const haloG = ctx.createRadialGradient(tx, ty, 6, tx, ty, 88);
          haloG.addColorStop(0, 'rgba(240, 249, 255, 0.92)');
          haloG.addColorStop(0.45, 'rgba(56, 189, 248, 0.55)');
          haloG.addColorStop(1, 'transparent');
          ctx.fillStyle = haloG;
          ctx.beginPath();
          ctx.arc(tx, ty, 88, 0, Math.PI * 2);
          ctx.fill();

          // Anel de geada cristalina expandindo
          ctx.strokeStyle = '#bae6fd';
          ctx.lineWidth = 3.2 * (1 - p * 0.45);
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.arc(tx, ty, 20 + p * 68, 0, Math.PI * 2);
          ctx.stroke();

          // 8 flocos de neve detalhados de 6 pontas rodopiando ao redor da unidade
          for (let f = 0; f < 8; f++) {
            const ang = (f / 8) * Math.PI * 2 + sec * 2.4;
            const dist = 26 + Math.sin(p * Math.PI) * 44 + (f % 2) * 12;
            const fx = tx + Math.cos(ang) * dist;
            const fy = ty + Math.sin(ang) * dist - p * 22;
            const sz = f % 2 === 0 ? 13 : 9;
            ctx.save();
            ctx.translate(fx, fy);
            ctx.rotate(sec * (f % 2 === 0 ? 3.2 : -2.6) + f);
            ctx.strokeStyle = f % 2 === 0 ? '#ffffff' : '#7dd3fc';
            ctx.lineWidth = 2;
            for (let b = 0; b < 6; b++) {
              const ba = (b * Math.PI) / 3;
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(Math.cos(ba) * sz, Math.sin(ba) * sz);
              ctx.stroke();
            }
            ctx.restore();
          }

          ctx.restore();
          drawBadge(
            tx,
            ty - 92,
            vfx.label || '❄️✨ BÔNUS DE CELIA · +5 PODER (CLASSE GELO)!',
            '#38bdf8',
            '#e0f2fe',
            masterAlpha
          );
          break;
        }

        // 59. CELIA (BARREIRA MÁGICA DE IMUNIDADE A GELO): Escudo hexagonal glacial bloqueando dano de Gelo
        case 'celia_ice_barrier': {
          const tx = primaryTarget.x;
          const ty = primaryTarget.y;
          const r = 64 + Math.sin(Math.min(1, p * 2.5) * Math.PI * 0.5) * 14;
          ctx.save();
          ctx.translate(tx, ty);
          ctx.globalAlpha = masterAlpha;

          // Cúpula hexagonal translúcida de gelo arcano
          const bGrad = ctx.createRadialGradient(-16, -16, 4, 0, 0, r * 1.15);
          bGrad.addColorStop(0, 'rgba(240, 249, 255, 0.65)');
          bGrad.addColorStop(0.55, 'rgba(56, 189, 248, 0.34)');
          bGrad.addColorStop(1, 'rgba(186, 230, 253, 0.92)');
          ctx.fillStyle = bGrad;
          ctx.strokeStyle = '#e0f2fe';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#22d3ee';
          ctx.shadowBlur = 28;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3 - Math.PI / 6;
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Malha rúnica interna e reflexo diagonal prismático
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.68)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3 - Math.PI / 6;
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * r * 0.88, Math.sin(a) * r * 0.88);
          }
          ctx.stroke();

          // Estilhaços de gelo ricocheteando na barreira
          for (let s = 0; s < 10; s++) {
            const a = (s / 10) * Math.PI * 2 + sec * 1.6;
            const d = r + 6 + p * 34;
            ctx.fillStyle = s % 2 === 0 ? '#ffffff' : '#67e8f9';
            ctx.beginPath();
            ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 3.2 * (1 - p * 0.5), 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
          drawBadge(
            tx,
            ty - r - 22,
            vfx.label || '❄️🛡️ BARREIRA MÁGICA · CELIA IMUNE A GELO!',
            '#38bdf8',
            '#f0f9ff',
            masterAlpha
          );
          break;
        }

        // 60. VILMA (BÔNUS DE COMPRA FOGO): Chamas e brasas envolventes na unidade beneficiada
        case 'vilma_fire_bonus': {
          const tx = primaryTarget.x;
          const ty = primaryTarget.y;
          ctx.save();
          ctx.globalAlpha = masterAlpha;

          const haloG = ctx.createRadialGradient(tx, ty, 6, tx, ty, 90);
          haloG.addColorStop(0, 'rgba(254, 240, 138, 0.94)');
          haloG.addColorStop(0.45, 'rgba(249, 115, 22, 0.62)');
          haloG.addColorStop(0.82, 'rgba(220, 38, 38, 0.25)');
          haloG.addColorStop(1, 'transparent');
          ctx.fillStyle = haloG;
          ctx.beginPath();
          ctx.arc(tx, ty, 90, 0, Math.PI * 2);
          ctx.fill();

          // Anel de fogo em espiral subindo
          ctx.strokeStyle = '#fb923c';
          ctx.lineWidth = 3.5 * (1 - p * 0.45);
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = 22;
          ctx.beginPath();
          ctx.arc(tx, ty, 20 + p * 68, 0, Math.PI * 2);
          ctx.stroke();

          // Línguas de chama e brasas ascendendo ao redor da unidade
          for (let f = 0; f < 12; f++) {
            const ang = (f / 12) * Math.PI * 2 + sec * 3.2;
            const dist = 24 + Math.sin(p * Math.PI) * 36;
            const fx = tx + Math.cos(ang) * dist;
            const fy = ty + Math.sin(ang) * dist * 0.65 - p * 44;
            ctx.fillStyle = f % 3 === 0 ? '#fef08a' : f % 2 === 0 ? '#fb923c' : '#ef4444';
            ctx.beginPath();
            ctx.moveTo(fx, fy - 12);
            ctx.quadraticCurveTo(fx + 7, fy, fx, fy + 7);
            ctx.quadraticCurveTo(fx - 7, fy, fx, fy - 12);
            ctx.fill();
          }

          ctx.restore();
          drawBadge(
            tx,
            ty - 92,
            vfx.label || '🔥✨ BÔNUS DE VILMA · +5 PODER (CLASSE FOGO)!',
            '#f97316',
            '#fef3c7',
            masterAlpha
          );
          break;
        }

        // 61. VILMA (BARREIRA MÁGICA DE IMUNIDADE A FOGO): Escudo hexagonal flamejante bloqueando dano de Fogo
        case 'vilma_fire_barrier': {
          const tx = primaryTarget.x;
          const ty = primaryTarget.y;
          const r = 64 + Math.sin(Math.min(1, p * 2.5) * Math.PI * 0.5) * 14;
          ctx.save();
          ctx.translate(tx, ty);
          ctx.globalAlpha = masterAlpha;

          const bGrad = ctx.createRadialGradient(-14, -14, 4, 0, 0, r * 1.15);
          bGrad.addColorStop(0, 'rgba(254, 240, 138, 0.68)');
          bGrad.addColorStop(0.55, 'rgba(249, 115, 22, 0.36)');
          bGrad.addColorStop(1, 'rgba(239, 68, 68, 0.92)');
          ctx.fillStyle = bGrad;
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = 28;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3 - Math.PI / 6;
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = 'rgba(254, 240, 138, 0.72)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3 - Math.PI / 6;
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * r * 0.88, Math.sin(a) * r * 0.88);
          }
          ctx.stroke();

          // Brasas ricocheteando na barreira flamejante
          for (let s = 0; s < 10; s++) {
            const a = (s / 10) * Math.PI * 2 + sec * 2.1;
            const d = r + 6 + p * 34;
            ctx.fillStyle = s % 2 === 0 ? '#fef08a' : '#fb923c';
            ctx.beginPath();
            ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 3.4 * (1 - p * 0.5), 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
          drawBadge(
            tx,
            ty - r - 22,
            vfx.label || '🔥🛡️ BARREIRA MÁGICA · VILMA IMUNE A FOGO!',
            '#f97316',
            '#fef3c7',
            masterAlpha
          );
          break;
        }

        // 62. MAGO UHR: Animação mágica arcana nele mesmo ao comprar a carta extra
        case 'mago_uhr_draw_arcana': {
          const cx = src.x;
          const cy = src.y;
          const pulse = Math.sin(p * Math.PI);
          ctx.save();
          ctx.globalAlpha = masterAlpha;

          // Brilho arcano violeta-dourado envolvendo o próprio Mago Uhr
          const auraG = ctx.createRadialGradient(cx, cy, 6, cx, cy, 86);
          auraG.addColorStop(0, 'rgba(255, 255, 255, 0.88)');
          auraG.addColorStop(0.35, 'rgba(167, 139, 250, 0.65)');
          auraG.addColorStop(0.75, 'rgba(251, 191, 36, 0.28)');
          auraG.addColorStop(1, 'transparent');
          ctx.fillStyle = auraG;
          ctx.beginPath();
          ctx.arc(cx, cy, 86, 0, Math.PI * 2);
          ctx.fill();

          // Círculo mágico arcano girando sobre Mago Uhr
          drawDivineMandala(cx, cy, 52 + pulse * 14, sec * 3.4, '#c084fc', '#fde047', masterAlpha * 0.92);

          // 6 páginas/cartas luminosas etéreas emergindo em espiral ao redor dele
          for (let pg = 0; pg < 6; pg++) {
            const ang = (pg / 6) * Math.PI * 2 + sec * 2.6;
            const dist = 28 + pulse * 26;
            const px = cx + Math.cos(ang) * dist;
            const py = cy + Math.sin(ang) * dist * 0.7 - p * 34;
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(ang + Math.PI / 2);
            ctx.fillStyle = pg % 2 === 0 ? 'rgba(254, 240, 138, 0.9)' : 'rgba(196, 181, 253, 0.9)';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 12;
            ctx.fillRect(-5, -7, 10, 14);
            ctx.strokeRect(-5, -7, 10, 14);
            ctx.restore();
          }

          ctx.restore();
          drawBadge(
            cx,
            cy - 88,
            vfx.label || '🧙‍♂️✨ MAGO UHR · COMPRA ARCANA EXTRA!',
            '#c084fc',
            '#fef3c7',
            masterAlpha
          );
          break;
        }

        // 63. GOUGH: Forja estática ao gerar a Flecha Elétrica
        case 'gough_arrow_forge': {
          const cx = src.x;
          const cy = src.y;
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 74);
          g.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
          g.addColorStop(0.4, 'rgba(34, 211, 238, 0.6)');
          g.addColorStop(0.8, 'rgba(250, 204, 21, 0.25)');
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cx, cy, 74, 0, Math.PI * 2);
          ctx.fill();

          for (let b = 0; b < 6; b++) {
            const ang = (b / 6) * Math.PI * 2 + sec * 5;
            drawBolt(cx, cy, cx + Math.cos(ang) * 52, cy + Math.sin(ang) * 52, b % 2 === 0 ? '#22d3ee' : '#fde047', 2.4, masterAlpha, sec + b);
          }
          ctx.restore();
          drawBadge(cx, cy - 86, vfx.label || '🏹⚡ GOUGH · FLECHA ELÉTRICA FORJADA!', '#22d3ee', '#ecfeff', masterAlpha);
          break;
        }
      }
      } catch (err) {
        console.error('Erro na animação de unidade:', err);
      }

      if (p < 1) {
        rafRef.current = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, vw, vh);
        finish();
      }
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      completed = true;
      window.clearTimeout(safetyTimer);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      try {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      } catch {
        // Ignore
      }
    };
  }, [vfx, isOff, isStatic]);

  if (!vfx || isOff) return null;

  if (isStatic) {
    const cleanTitle =
      vfx.label ||
      vfx.type
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    return (
      <div className="fixed inset-x-0 top-[14%] z-[195] pointer-events-none flex justify-center px-4 select-none">
        <div className="px-4 py-1.5 rounded-xl bg-stone-950/95 border-2 border-amber-400/80 shadow-xl text-[11px] sm:text-xs font-serif font-black text-amber-200 tracking-wider uppercase">
          {cleanTitle}
        </div>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[195] pointer-events-none"
    />
  );
};

export interface BarelioChainLinkPair {
  captorId: string;
  prisonerId: string;
}

export const BarelioBoardChainsOverlay: React.FC<{ links: BarelioChainLinkPair[] }> = ({ links }) => {
  const { animationMode, ambientAnimations } = useVisualPreferences();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isStaticOrOff = animationMode !== 'full' || !ambientAnimations;

  useEffect(() => {
    if (links.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number | null = null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const drawStaticChains = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const pair of links) {
        const captorPt = getElementCenter(`[data-unit-instance-id="${pair.captorId}"]`);
        const prisonerPt =
          getElementCenter(`[data-barelio-prisoner-id="${pair.prisonerId}"]`) ||
          getElementCenter(`[data-barelio-captor-id="${pair.captorId}"]`);
        if (captorPt && prisonerPt) {
          ctx.save();
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 3;
          ctx.setLineDash([7, 5]);
          ctx.beginPath();
          ctx.moveTo(captorPt.x, captorPt.y);
          ctx.lineTo(prisonerPt.x, prisonerPt.y);
          ctx.stroke();
          ctx.restore();
        }
      }
    };

    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (isStaticOrOff) {
        drawStaticChains();
      }
    };
    resize();
    window.addEventListener('resize', resize);

    if (isStaticOrOff) {
      drawStaticChains();
      return () => {
        window.removeEventListener('resize', resize);
      };
    }

    const startMs = performance.now();
    const tick = (now: number) => {
      const sec = (now - startMs) / 1000;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (const pair of links) {
        const captorPt = getElementCenter(`[data-unit-instance-id="${pair.captorId}"]`);
        const prisonerPt =
          getElementCenter(`[data-barelio-prisoner-id="${pair.prisonerId}"]`) ||
          getElementCenter(`[data-barelio-captor-id="${pair.captorId}"]`);

        if (captorPt && prisonerPt) {
          drawForgedAbyssalChain(
            ctx,
            captorPt.x - 14,
            captorPt.y - 6,
            prisonerPt.x - 12,
            prisonerPt.y + 4,
            -18,
            sec,
            0.88,
            {
              linkSpacing: 10,
              linkLength: 11,
              linkWidth: 5.5,
              primaryColor: '#a855f7',
              highlightColor: '#f5d0fe',
              glowColor: '#d946ef',
              siphonParticles: 2,
            }
          );
          drawForgedAbyssalChain(
            ctx,
            captorPt.x + 14,
            captorPt.y - 6,
            prisonerPt.x + 12,
            prisonerPt.y + 4,
            18,
            sec + 0.6,
            0.88,
            {
              linkSpacing: 10,
              linkLength: 11,
              linkWidth: 5.5,
              primaryColor: '#9333ea',
              highlightColor: '#e9d5ff',
              glowColor: '#a855f7',
              siphonParticles: 2,
            }
          );
          drawShackleCollar(ctx, prisonerPt.x, prisonerPt.y, 13, -sec * 1.1, 0.85);
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('resize', resize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [links, isStaticOrOff]);

  if (links.length === 0) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[35] pointer-events-none"
    />
  );
};

