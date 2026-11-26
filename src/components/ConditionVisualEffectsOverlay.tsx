import React, { useEffect, useRef } from 'react';
import { sound } from '../services/soundEffects';
import { ElementType } from '../types/game';
import { getThematicCardArt } from '../utils/cardVisuals';
import { useVisualPreferences } from '../utils/visualTheme';

export interface RectSnapshot {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CaptureVfxCardInfo {
  name: string;
  element: ElementType;
  tier: number;
  artUrl?: string;
  hideFace?: boolean;
}

export interface CaptureVfxData {
  sourceSide: 'player' | 'opponent';
  destSide: 'player' | 'opponent';
  sourceKind: 'board' | 'deck';
  sourceRect?: RectSnapshot | null;
  destRect?: RectSnapshot | null;
  isHandFull?: boolean;
  isSubjugar?: boolean;
  card?: CaptureVfxCardInfo;
}

export type ConditionVfxType =
  | 'cura'
  | 'tenacidade'
  | 'barreira'
  | 'imunidade'
  | 'ressurreicao'
  | 'queimadura'
  | 'sono'
  | 'congelado'
  | 'eletrificado'
  | 'torpor'
  | 'atordoamento'
  | 'silencio'
  | 'bravura'
  | 'enfrentar'
  | 'furtividade'
  | 'etereo'
  | 'critico'
  | 'obliteracao'
  | 'roubo_de_vida'
  | 'ataque_duplo'
  | 'revelar'
  | 'capturar'
  | 'retorno'
  | 'alianca_angiris'
  | 'irmaos'
  | 'corte_das_fadas'
  | 'executar'
  | 'praga'
  | 'corrosao'
  | 'sangramento'
  | 'hemorragia';

export interface ConditionVfxEvent {
  id: string;
  condition: ConditionVfxType;
  targetUnitId?: string;
  targetUnitName?: string;
  targetSide?: 'player' | 'opponent' | 'center';
  isAuroraIce?: boolean;
  isFriendlyFireFlash?: boolean;
  labelOverride?: string;
  captureData?: CaptureVfxData;
}

interface ConditionVisualEffectsOverlayProps {
  event?: ConditionVfxEvent | null;
  events?: ConditionVfxEvent[];
  onComplete?: () => void;
}

const CONDITION_DURATIONS: Partial<Record<ConditionVfxType, number>> = {
  torpor: 1550,
  critico: 1450,
  roubo_de_vida: 1650,
  ataque_duplo: 1750,
  queimadura: 1450,
  cura: 1600,
  tenacidade: 1550,
  congelado: 1650,
  eletrificado: 1450,
  revelar: 1650,
  capturar: 2150,
  retorno: 1550,
  executar: 1650,
  praga: 1600,
  corte_das_fadas: 1700,
  ressurreicao: 2150,
};

const STATIC_CONDITION_LABELS: Record<ConditionVfxType, { icon: string; label: string; colorClass: string }> = {
  cura: { icon: '💚', label: 'Cura', colorClass: 'border-emerald-400 text-emerald-200' },
  tenacidade: { icon: '🛡️', label: 'Tenacidade', colorClass: 'border-emerald-300 text-emerald-100' },
  barreira: { icon: '🔷', label: 'Barreira', colorClass: 'border-sky-400 text-sky-200' },
  imunidade: { icon: '🌟', label: 'Imunidade', colorClass: 'border-amber-300 text-amber-100' },
  ressurreicao: { icon: '🕊️', label: 'Ressurreição', colorClass: 'border-amber-400 text-amber-200' },
  queimadura: { icon: '🔥', label: 'Queimadura', colorClass: 'border-orange-400 text-orange-200' },
  sono: { icon: '💤', label: 'Sono', colorClass: 'border-indigo-400 text-indigo-200' },
  congelado: { icon: '❄️', label: 'Congelado', colorClass: 'border-cyan-300 text-cyan-100' },
  eletrificado: { icon: '⚡', label: 'Eletrificado', colorClass: 'border-yellow-400 text-yellow-200' },
  torpor: { icon: '🌀', label: 'Torpor', colorClass: 'border-fuchsia-400 text-fuchsia-200' },
  atordoamento: { icon: '💫', label: 'Atordoamento', colorClass: 'border-slate-300 text-slate-100' },
  silencio: { icon: '🔇', label: 'Silêncio', colorClass: 'border-rose-400 text-rose-200' },
  bravura: { icon: '🎺', label: 'Bravura', colorClass: 'border-amber-400 text-amber-200' },
  enfrentar: { icon: '⚔️', label: 'Enfrentar', colorClass: 'border-orange-400 text-orange-200' },
  furtividade: { icon: '👤', label: 'Furtividade', colorClass: 'border-purple-400 text-purple-200' },
  etereo: { icon: '✨', label: 'Etéreo', colorClass: 'border-cyan-400 text-cyan-200' },
  critico: { icon: '💥', label: 'Crítico', colorClass: 'border-rose-400 text-rose-200' },
  obliteracao: { icon: '🕳️', label: 'Obliteração', colorClass: 'border-purple-500 text-purple-200' },
  roubo_de_vida: { icon: '🩸', label: 'Roubo de Vida', colorClass: 'border-rose-500 text-rose-200' },
  ataque_duplo: { icon: '⚔️', label: 'Ataque-Duplo', colorClass: 'border-emerald-400 text-emerald-200' },
  revelar: { icon: '👁️', label: 'Revelar', colorClass: 'border-sky-300 text-sky-200' },
  capturar: { icon: '⛓️', label: 'Capturar', colorClass: 'border-purple-400 text-purple-200' },
  retorno: { icon: '🕊️', label: 'Retorno', colorClass: 'border-sky-400 text-sky-200' },
  alianca_angiris: { icon: '👼', label: 'Aliança Angiris', colorClass: 'border-amber-300 text-amber-100' },
  irmaos: { icon: '👥', label: 'Irmãos', colorClass: 'border-amber-400 text-amber-200' },
  corte_das_fadas: { icon: '🧚', label: 'Corte das Fadas', colorClass: 'border-pink-400 text-pink-200' },
  executar: { icon: '💀', label: 'Executar', colorClass: 'border-red-500 text-red-200' },
  praga: { icon: '☠️', label: 'Praga', colorClass: 'border-lime-400 text-lime-200' },
  corrosao: { icon: '🧪', label: 'Corrosão', colorClass: 'border-lime-400 text-lime-200' },
  sangramento: { icon: '🩸', label: 'Sangramento', colorClass: 'border-rose-500 text-rose-200' },
  hemorragia: { icon: '🩸', label: 'Hemorragia', colorClass: 'border-red-500 text-red-200' },
};

export const ConditionVisualEffectsOverlay: React.FC<ConditionVisualEffectsOverlayProps> = ({
  event,
  events,
  onComplete,
}) => {
  const { animationMode, skillAndUnitVfx } = useVisualPreferences();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const activeEvents = React.useMemo(() => {
    const list: ConditionVfxEvent[] = [];
    if (event) list.push(event);
    if (events && events.length > 0) list.push(...events);
    return list;
  }, [event, events]);

  const isOff = animationMode === 'off' || !skillAndUnitVfx;
  const isStatic = !isOff && animationMode === 'static';
  const batchKey = activeEvents.map((e) => e.id).join('|');

  useEffect(() => {
    if (activeEvents.length === 0) return;

    const durationMs = isOff
      ? 40
      : isStatic
      ? 680
      : Math.max(...activeEvents.map((e) => CONDITION_DURATIONS[e.condition] ?? 1550));
    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      onCompleteRef.current?.();
    };
    const safetyTimer = window.setTimeout(finish, isOff ? 40 : isStatic ? 680 : durationMs + 250);

    // Play primary audio cue for first event in batch
    const primary = activeEvents[0];
    try {
      switch (primary.condition) {
        case 'cura':
          sound.playSpell();
          break;
        case 'tenacidade':
        case 'barreira':
          sound.playShieldBlock();
          break;
        case 'imunidade':
          sound.playSkillSabedoriaCosmica();
          break;
        case 'ressurreicao':
          sound.playRessurreicaoRevive();
          break;
        case 'queimadura':
          sound.playSkillLabaredaSolar();
          break;
        case 'sono':
          sound.playSkillLetargiaLunar();
          break;
        case 'congelado':
          sound.playCrioGenese();
          break;
        case 'eletrificado':
          sound.playSkillFlechaEletrica();
          break;
        case 'torpor':
          sound.playTick();
          break;
        case 'atordoamento':
          sound.playSkillVotoCaidos();
          break;
        case 'silencio':
          sound.playSkillJurisdicaoSaniel();
          break;
        case 'bravura':
          sound.playSkillLevantarMoral();
          break;
        case 'enfrentar':
          sound.playSkillDesafioReal();
          break;
        case 'alianca_angiris':
        case 'irmaos':
          sound.playSkillConcessaoDivina();
          break;
        case 'furtividade':
        case 'etereo':
          sound.playSkillEnganar();
          break;
        case 'critico':
          sound.playSkillGraoMestre();
          break;
        case 'obliteracao':
          sound.playSkillVotoAbsoluto();
          break;
        case 'executar':
          sound.playDeath();
          break;
        case 'roubo_de_vida':
          sound.playSkillFomeInsaciavel();
          break;
        case 'ataque_duplo':
          sound.playSkillDestreza();
          break;
        case 'capturar':
          sound.playCaptureChains();
          break;
        case 'revelar':
        case 'retorno':
          sound.playSpell();
          break;
      }
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

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    const findVisibleRect = (selector: string): RectSnapshot | null => {
      if (typeof document === 'undefined') return null;
      const nodes = document.querySelectorAll(selector);
      for (let i = 0; i < nodes.length; i++) {
        const r = nodes[i].getBoundingClientRect();
        if (r.width > 4 && r.height > 4) {
          return { left: r.left, top: r.top, width: r.width, height: r.height };
        }
      }
      return null;
    };

    const capturedImageMap = new Map<string, HTMLImageElement>();
    activeEvents.forEach((evt) => {
      const artUrl = evt.captureData?.card?.artUrl;
      if (artUrl && !evt.captureData?.card?.hideFace && !capturedImageMap.has(artUrl)) {
        const img = new Image();
        img.src = artUrl;
        capturedImageMap.set(artUrl, img);
      }
    });

    const resolvedTargets = activeEvents.map((evt, idx) => {
      let targetX = width / 2 + (activeEvents.length > 1 ? (idx - (activeEvents.length - 1) / 2) * 140 : 0);
      let targetY =
        evt.targetSide === 'opponent'
          ? height * 0.3
          : evt.targetSide === 'player'
          ? height * 0.67
          : height * 0.5;
      let cardW = 134;
      let cardH = 188;

      if (evt.captureData?.sourceRect && evt.captureData.sourceRect.width > 10) {
        const r = evt.captureData.sourceRect;
        targetX = r.left + r.width / 2;
        targetY = r.top + r.height / 2;
        if (evt.captureData.sourceKind === 'board') {
          cardW = r.width;
          cardH = r.height;
        } else {
          cardW = Math.max(108, Math.min(138, r.width * 1.15));
          cardH = Math.round(cardW * 1.4);
        }
      } else if (evt.targetUnitId && typeof document !== 'undefined') {
        const rect = findVisibleRect(`[data-unit-instance-id="${evt.targetUnitId}"]`);
        if (rect) {
          targetX = rect.left + rect.width / 2;
          targetY = rect.top + rect.height / 2;
          cardW = rect.width;
          cardH = rect.height;
        }
      } else if (evt.captureData?.sourceKind === 'deck') {
        const deckRect = findVisibleRect(`[data-deck-zone="${evt.captureData.sourceSide}"]`);
        if (deckRect) {
          targetX = deckRect.left + deckRect.width / 2;
          targetY = deckRect.top + deckRect.height / 2;
          cardW = 116;
          cardH = 162;
        }
      }

      let destX = width * 0.5;
      let destY = evt.captureData?.destSide === 'opponent' ? height * 0.08 : height * 0.88;
      if (evt.captureData) {
        if (evt.captureData.destRect && evt.captureData.destRect.width > 4) {
          destX = evt.captureData.destRect.left + evt.captureData.destRect.width / 2;
          destY = evt.captureData.destRect.top + evt.captureData.destRect.height / 2;
        } else {
          const fallbackSel = evt.captureData.isHandFull
            ? `[data-graveyard="${evt.captureData.destSide}"]`
            : `[data-hand-zone="${evt.captureData.destSide}"]`;
          const foundDest = findVisibleRect(fallbackSel);
          if (foundDest) {
            destX = foundDest.left + foundDest.width / 2;
            destY = foundDest.top + foundDest.height / 2;
          }
        }
      }

      return { evt, targetX, targetY, destX, destY, cardW, cardH };
    });

    const startTime = performance.now();

    const particles = Array.from({ length: 48 }, (_, i) => ({
      angle: ((Math.PI * 2) / 48) * i + (i % 3) * 0.14,
      speed: 0.65 + (i % 7) * 0.24,
      size: 2.2 + (i % 5) * 1.1,
      phase: i * 0.77,
      dist: 24 + (i % 11) * 13,
    }));

    const drawFourPointStar = (
      x: number,
      y: number,
      size: number,
      color: string,
      rotation = 0
    ) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.quadraticCurveTo(size * 0.18, -size * 0.18, size, 0);
      ctx.quadraticCurveTo(size * 0.18, size * 0.18, 0, size);
      ctx.quadraticCurveTo(-size * 0.18, size * 0.18, -size, 0);
      ctx.quadraticCurveTo(-size * 0.18, -size * 0.18, 0, -size);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawBadge = (
      x: number,
      y: number,
      text: string,
      borderCol: string,
      textCol: string,
      alpha: number
    ) => {
      if (alpha <= 0.04) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '800 12px Inter, system-ui, sans-serif';
      const tw = ctx.measureText(text).width;
      const bw = tw + 24;
      const bh = 26;
      const bx = Math.max(10, Math.min(width - bw - 10, x - bw / 2));
      const by = Math.max(10, Math.min(height - bh - 10, y - bh / 2));

      ctx.fillStyle = 'rgba(8, 10, 18, 0.92)';
      ctx.strokeStyle = borderCol;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = borderCol;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 6);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = textCol;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, bx + bw / 2, by + bh / 2 + 0.5);
      ctx.restore();
    };

    const drawMagicChain = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      linkLen: number,
      growFrac: number,
      glowColor: string,
      highlightColor: string,
      alpha: number,
      timeSec: number
    ) => {
      const clampedFrac = Math.max(0, Math.min(1, growFrac));
      if (clampedFrac <= 0.02 || alpha <= 0.02) return;
      const ex = x1 + (x2 - x1) * clampedFrac;
      const ey = y1 + (y2 - y1) * clampedFrac;
      const dx = ex - x1;
      const dy = ey - y1;
      const dist = Math.hypot(dx, dy);
      if (dist < 4) return;
      const angle = Math.atan2(dy, dx);
      const step = Math.max(8, linkLen * 0.72);
      const count = Math.max(1, Math.floor(dist / step));

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 14;

      for (let i = 0; i <= count; i++) {
        const t = i / Math.max(1, count);
        const lx = x1 + dx * t;
        const ly = y1 + dy * t;
        const isFlat = i % 2 === 0;
        const pulse = 0.78 + 0.22 * Math.sin(timeSec * 11 - i * 0.6);

        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(angle);

        if (isFlat) {
          // Elo oval de frente com núcleo escuro e brilho arcano
          ctx.fillStyle = `rgba(14, 24, 42, 0.9)`;
          ctx.strokeStyle = i % 4 === 0 ? highlightColor : '#e0f2fe';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.ellipse(0, 0, linkLen * 0.56, linkLen * 0.28, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = glowColor;
          ctx.globalAlpha = alpha * 0.6 * pulse;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else {
          // Elo perpendicular entrelaçado
          ctx.fillStyle = highlightColor;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.roundRect(-linkLen * 0.42, -linkLen * 0.14, linkLen * 0.84, linkLen * 0.28, 3);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
    };

    const drawCapturedCardVisual = (
      cx: number,
      cy: number,
      w: number,
      h: number,
      scale: number,
      rotRad: number,
      alpha: number,
      evt: ConditionVfxEvent,
      chainGlowIntensity: number
    ) => {
      if (alpha <= 0.02 || scale <= 0.02) return;
      const cardInfo = evt.captureData?.card;
      const tier = cardInfo?.tier ?? 3;
      const tierBorder =
        tier >= 6 ? '#38bdf8' : tier === 5 ? '#f59e0b' : tier === 4 ? '#c084fc' : tier === 3 ? '#60a5fa' : '#cbd5e1';

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotRad);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;

      // Sombra e aura de aprisionamento ao redor da carta
      ctx.shadowColor = chainGlowIntensity > 0.2 ? '#38bdf8' : tierBorder;
      ctx.shadowBlur = 24 + chainGlowIntensity * 16;

      // Corpo da carta
      const cardBg = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      cardBg.addColorStop(0, '#1e1b2e');
      cardBg.addColorStop(0.5, '#12101d');
      cardBg.addColorStop(1, '#090810');
      ctx.fillStyle = cardBg;
      ctx.strokeStyle = tierBorder;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 10);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Área interna da arte
      const pad = 5;
      const artX = -w / 2 + pad;
      const artY = -h / 2 + pad;
      const artW = w - pad * 2;
      const artH = h - pad * 2;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(artX, artY, artW, artH, 7);
      ctx.clip();

      const artUrl = cardInfo?.artUrl;
      const img = artUrl && !cardInfo?.hideFace ? capturedImageMap.get(artUrl) : undefined;
      if (img && img.complete && img.naturalWidth > 0) {
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const boxAspect = artW / artH;
        let dw = artW;
        let dh = artH;
        if (imgAspect > boxAspect) {
          dw = artH * imgAspect;
        } else {
          dh = artW / imgAspect;
        }
        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      } else if (cardInfo?.hideFace) {
        const backGrad = ctx.createLinearGradient(-artW / 2, -artH / 2, artW / 2, artH / 2);
        backGrad.addColorStop(0, '#311b5c');
        backGrad.addColorStop(0.5, '#181036');
        backGrad.addColorStop(1, '#0a071a');
        ctx.fillStyle = backGrad;
        ctx.fillRect(artX, artY, artW, artH);
        ctx.strokeStyle = 'rgba(167, 139, 250, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, artW * 0.28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = 'bold 26px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ddd6fe';
        ctx.fillText('✦', 0, 2);
      } else {
        const thematic = getThematicCardArt('', cardInfo?.element || 'Divino', false);
        const fbGrad = ctx.createLinearGradient(-artW / 2, -artH / 2, artW / 2, artH / 2);
        fbGrad.addColorStop(0, '#1e293b');
        fbGrad.addColorStop(1, '#090d16');
        ctx.fillStyle = fbGrad;
        ctx.fillRect(artX, artY, artW, artH);
        ctx.font = `${Math.round(w * 0.34)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(thematic.icon, 0, -4);
      }

      // Véu azulado de contenção mágica quando acorrentada
      if (chainGlowIntensity > 0.05) {
        ctx.fillStyle = `rgba(56, 189, 248, ${0.22 * chainGlowIntensity})`;
        ctx.fillRect(artX, artY, artW, artH);
      }

      // Barra inferior com nome da unidade capturada
      const displayName = cardInfo?.hideFace
        ? 'Carta Capturada'
        : cardInfo?.name || evt.targetUnitName || 'Unidade Capturada';
      const barH = Math.max(22, h * 0.16);
      ctx.fillStyle = 'rgba(7, 9, 18, 0.88)';
      ctx.fillRect(artX, artY + artH - barH, artW, barH);
      ctx.fillStyle = '#f8fafc';
      ctx.font = `700 ${Math.max(9, Math.round(w * 0.095))}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayName.slice(0, 18), 0, artY + artH - barH / 2 + 0.5, artW - 8);
      ctx.restore();

      ctx.restore();
    };

    const renderCondition = (
      item: {
        evt: ConditionVfxEvent;
        targetX: number;
        targetY: number;
        destX: number;
        destY: number;
        cardW: number;
        cardH: number;
      },
      progress: number,
      timeSec: number,
      masterAlpha: number
    ) => {
      const { evt, targetX, targetY, destX, destY, cardW, cardH } = item;
      const cond = evt.condition;

      // 1. CURA: Faixas de luz verde chegam à carta e "molham" ela
      if (cond === 'cura') {
        ctx.save();
        // Faixas sinuosas de luz verde esmeralda descendo do topo até a carta
        for (let r = 0; r < 5; r++) {
          const offset = (r - 2) * (cardW * 0.24);
          const ribbonDrop = Math.min(1, progress / 0.45);
          ctx.beginPath();
          for (let step = 0; step <= 20; step++) {
            const sf = step / 20;
            const ry = targetY - cardH * 1.1 + sf * cardH * 1.75 * ribbonDrop;
            const rx = targetX + offset + Math.sin(sf * 5 + timeSec * 5 + r) * 14;
            if (step === 0) ctx.moveTo(rx, ry);
            else ctx.lineTo(rx, ry);
          }
          const grad = ctx.createLinearGradient(0, targetY - cardH, 0, targetY + cardH * 0.6);
          grad.addColorStop(0, 'transparent');
          grad.addColorStop(0.5, 'rgba(74, 222, 128, 0.85)');
          grad.addColorStop(1, 'rgba(167, 243, 208, 0.2)');
          ctx.strokeStyle = grad;
          ctx.lineWidth = 7;
          ctx.lineCap = 'round';
          ctx.shadowColor = '#22c55e';
          ctx.shadowBlur = 18;
          ctx.globalAlpha = masterAlpha * 0.85;
          ctx.stroke();
        }

        // Efeito "molhado": ondas de luz líquida e gotas brilhantes escorrendo sobre a carta
        if (progress >= 0.22) {
          const wetP = (progress - 0.22) / 0.78;
          ctx.save();
          ctx.globalAlpha = (1 - wetP * 0.35) * masterAlpha;
          ctx.strokeStyle = '#86efac';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(targetX - cardW / 2, targetY - cardH / 2, cardW, cardH, 10);
          ctx.stroke();

          // Ondículas líquidas concêntricas sobre a face da carta
          for (let w = 0; w < 3; w++) {
            const rp = (wetP * 1.5 + w * 0.33) % 1;
            ctx.globalAlpha = (1 - rp) * masterAlpha * 0.7;
            ctx.strokeStyle = '#bbf7d0';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(targetX, targetY, cardW * (0.2 + rp * 0.42), cardH * (0.14 + rp * 0.32), 0, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Gotas verdes escorrendo pela carta
          for (let d = 0; d < 12; d++) {
            const dp = (timeSec * 0.9 + d * 0.17) % 1;
            const dx = targetX + ((d % 4) - 1.5) * (cardW * 0.25);
            const dy = targetY - cardH * 0.42 + dp * cardH * 0.84;
            ctx.fillStyle = d % 2 === 0 ? '#86efac' : '#4ade80';
            ctx.globalAlpha = Math.sin(dp * Math.PI) * masterAlpha * 0.9;
            ctx.beginPath();
            ctx.ellipse(dx, dy, 3, 5.5, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        drawBadge(targetX, targetY - cardH / 2 - 22, evt.labelOverride || '💚 CURA (+9 VIDA)', '#4ade80', '#dcfce7', masterAlpha);
        ctx.restore();
      }

      // 2. TENACIDADE: Um escudo rúnico de aço se levanta na carta
      else if (cond === 'tenacidade') {
        ctx.save();
        const riseT = Math.min(1, progress / 0.36);
        const easeRise = 1 - Math.pow(1 - riseT, 3);
        const shieldY = targetY + (1 - easeRise) * (cardH * 0.65);

        ctx.translate(targetX, shieldY);
        ctx.globalAlpha = masterAlpha;

        // Aura protetora na base
        const sGlow = ctx.createRadialGradient(0, 10, 8, 0, 10, cardW * 0.85);
        sGlow.addColorStop(0, 'rgba(52, 211, 153, 0.52)');
        sGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = sGlow;
        ctx.beginPath();
        ctx.arc(0, 10, cardW * 0.85, 0, Math.PI * 2);
        ctx.fill();

        // Escudo medieval de aço e runas esmeralda
        const sw = Math.min(78, cardW * 0.64);
        const sh = Math.min(96, cardH * 0.56);
        const shieldGrad = ctx.createLinearGradient(-sw / 2, -sh / 2, sw / 2, sh / 2);
        shieldGrad.addColorStop(0, '#0f766e');
        shieldGrad.addColorStop(0.5, '#065f46');
        shieldGrad.addColorStop(1, '#022c22');

        ctx.fillStyle = shieldGrad;
        ctx.strokeStyle = '#6ee7b7';
        ctx.lineWidth = 3.2;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.moveTo(0, -sh * 0.52);
        ctx.lineTo(sw * 0.52, -sh * 0.32);
        ctx.lineTo(sw * 0.5, sh * 0.12);
        ctx.quadraticCurveTo(sw * 0.35, sh * 0.42, 0, sh * 0.55);
        ctx.quadraticCurveTo(-sw * 0.35, sh * 0.42, -sw * 0.5, sh * 0.12);
        ctx.lineTo(-sw * 0.52, -sh * 0.32);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cruz rúnica metálica interna no escudo
        ctx.strokeStyle = '#d1fae5';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(0, -sh * 0.32);
        ctx.lineTo(0, sh * 0.36);
        ctx.moveTo(-sw * 0.28, -sh * 0.05);
        ctx.lineTo(sw * 0.28, -sh * 0.05);
        ctx.stroke();

        ctx.restore();
        drawBadge(targetX, targetY - cardH / 2 - 22, evt.labelOverride || '🛡️ TENACIDADE (-35% DANO)', '#34d399', '#d1fae5', masterAlpha);
      }

      // 3. QUEIMADURA: Erupção de chamas na carta ao causar dano por rodada
      else if (cond === 'queimadura') {
        ctx.save();
        ctx.globalAlpha = masterAlpha;
        const fireGrad = ctx.createRadialGradient(targetX, targetY + cardH * 0.18, 8, targetX, targetY, cardW * 0.95);
        fireGrad.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
        fireGrad.addColorStop(0.45, 'rgba(249, 115, 22, 0.72)');
        fireGrad.addColorStop(0.85, 'rgba(220, 38, 38, 0.38)');
        fireGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = fireGrad;
        ctx.beginPath();
        ctx.arc(targetX, targetY, cardW * 0.95, 0, Math.PI * 2);
        ctx.fill();

        // Línguas de fogo lambendo a moldura da carta
        for (let f = 0; f < 10; f++) {
          const fx = targetX + (f - 4.5) * (cardW * 0.11);
          const flameH = (36 + (f % 3) * 18) * (0.7 + Math.sin(timeSec * 18 + f) * 0.3);
          const fy = targetY + cardH * 0.38;
          const fGrad = ctx.createLinearGradient(fx, fy, fx, fy - flameH);
          fGrad.addColorStop(0, '#ef4444');
          fGrad.addColorStop(0.55, '#f97316');
          fGrad.addColorStop(1, '#fef08a');
          ctx.fillStyle = fGrad;
          ctx.beginPath();
          ctx.moveTo(fx - 10, fy);
          ctx.quadraticCurveTo(fx - 4, fy - flameH * 0.6, fx + Math.sin(timeSec * 12 + f) * 6, fy - flameH);
          ctx.quadraticCurveTo(fx + 6, fy - flameH * 0.5, fx + 10, fy);
          ctx.closePath();
          ctx.fill();
        }

        // Fagulhas subindo
        for (let e = 0; e < 18; e++) {
          const p = particles[e];
          const ep = (timeSec * 1.4 + e * 0.11) % 1;
          const ex = targetX + Math.sin(timeSec * 7 + p.phase) * (cardW * 0.45);
          const ey = targetY + cardH * 0.35 - ep * cardH * 1.05;
          ctx.fillStyle = e % 2 === 0 ? '#fef08a' : '#fb923c';
          ctx.beginPath();
          ctx.arc(ex, ey, 2.5 * (1 - ep * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        drawBadge(targetX, targetY - cardH / 2 - 22, evt.labelOverride || '🔥 QUEIMADURA (-4 HP DIRETO)', '#ef4444', '#fee2e2', masterAlpha);
      }

      // 4. CONGELADO: Carta sendo congelada progressivamente por placas e cristais de gelo
      else if (cond === 'congelado') {
        ctx.save();
        const freezeT = Math.min(1, progress / 0.38);
        ctx.globalAlpha = masterAlpha;

        // Bloco de gelo translúcido cobrindo os limites da carta
        const iceGrad = ctx.createLinearGradient(
          targetX - cardW / 2,
          targetY - cardH / 2,
          targetX + cardW / 2,
          targetY + cardH / 2
        );
        iceGrad.addColorStop(0, `rgba(224, 242, 254, ${0.58 * freezeT})`);
        iceGrad.addColorStop(0.5, `rgba(56, 189, 248, ${0.38 * freezeT})`);
        iceGrad.addColorStop(1, `rgba(186, 230, 253, ${0.65 * freezeT})`);

        ctx.fillStyle = iceGrad;
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 22;
        ctx.beginPath();
        ctx.roundRect(targetX - cardW / 2 - 3, targetY - cardH / 2 - 3, cardW + 6, cardH + 6, 10);
        ctx.fill();
        ctx.stroke();

        // Rachaduras / veias de geada crescendo a partir das 4 pontas da carta
        const corners = [
          [-cardW / 2, -cardH / 2],
          [cardW / 2, -cardH / 2],
          [cardW / 2, cardH / 2],
          [-cardW / 2, cardH / 2],
        ];
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        corners.forEach(([cxOff, cyOff], cIdx) => {
          const sx = targetX + cxOff;
          const sy = targetY + cyOff;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx - cxOff * 0.55 * freezeT, sy - cyOff * 0.38 * freezeT);
          ctx.lineTo(sx - cxOff * 0.32 * freezeT, sy - cyOff * 0.72 * freezeT);
          ctx.stroke();

          // Estilhaço cristalino nos cantos
          ctx.fillStyle = cIdx % 2 === 0 ? '#bae6fd' : '#ffffff';
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx - cxOff * 0.25 * freezeT, sy);
          ctx.lineTo(sx, sy - cyOff * 0.22 * freezeT);
          ctx.closePath();
          ctx.fill();
        });

        ctx.restore();
        drawBadge(targetX, targetY - cardH / 2 - 22, evt.labelOverride || '❄️ CONGELADO (+50% TODO DANO)', '#38bdf8', '#e0f2fe', masterAlpha);
      }

      // 5. ELETRIFICADO: Arcos e faíscas elétricas emanando das bordas da carta
      else if (cond === 'eletrificado') {
        ctx.save();
        ctx.globalAlpha = masterAlpha;
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.4;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 18;

        for (let b = 0; b < 8; b++) {
          const perimeterAng = (b * Math.PI) / 4 + Math.sin(timeSec * 14 + b) * 0.2;
          const bx = targetX + Math.cos(perimeterAng) * (cardW * 0.45);
          const by = targetY + Math.sin(perimeterAng) * (cardH * 0.45);
          ctx.strokeStyle = b % 2 === 0 ? '#fef08a' : '#38bdf8';
          ctx.beginPath();
          ctx.moveTo(bx, by);
          let lx = bx;
          let ly = by;
          for (let seg = 1; seg <= 4; seg++) {
            const stepLen = 14;
            lx += Math.cos(perimeterAng) * stepLen + Math.sin(seg * 9 + Math.floor(timeSec * 30) + b) * 10;
            ly += Math.sin(perimeterAng) * stepLen + Math.cos(seg * 7 + Math.floor(timeSec * 30) + b) * 10;
            ctx.lineTo(lx, ly);
          }
          ctx.stroke();
        }
        ctx.restore();
        drawBadge(targetX, targetY - cardH / 2 - 22, evt.labelOverride || '⚡ ELETRIFICADO (+20% ELÉTRICO)', '#facc15', '#fef9c3', masterAlpha);
      }

      // 6. TORPOR: Brilhos e flashes cegantes; flash intenso ao atacar aliado!
      else if (cond === 'torpor') {
        ctx.save();
        const isFriendly = Boolean(evt.isFriendlyFireFlash);
        const flashIntensity = isFriendly
          ? Math.max(0.25, Math.abs(Math.sin(timeSec * 22)))
          : 0.45 + 0.55 * Math.abs(Math.sin(timeSec * 14));

        // Clarão ofuscante branco/púrpura sobre a carta afetada
        const blindGrad = ctx.createRadialGradient(
          targetX,
          targetY,
          4,
          targetX,
          targetY,
          cardW * (isFriendly ? 1.85 : 1.2)
        );
        blindGrad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * flashIntensity * masterAlpha})`);
        blindGrad.addColorStop(0.42, `rgba(232, 121, 249, ${0.72 * flashIntensity * masterAlpha})`);
        blindGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = blindGrad;
        ctx.beginPath();
        ctx.arc(targetX, targetY, cardW * (isFriendly ? 1.85 : 1.2), 0, Math.PI * 2);
        ctx.fill();

        // Estrelas de clarão cegante cruzando em alta frequência
        for (let s = 0; s < (isFriendly ? 8 : 5); s++) {
          const sa = timeSec * 7 + (s * Math.PI * 2) / (isFriendly ? 8 : 5);
          const sr = cardW * (0.28 + (s % 2) * 0.24);
          drawFourPointStar(
            targetX + Math.cos(sa) * sr,
            targetY + Math.sin(sa) * (sr * 0.7),
            isFriendly ? 26 : 16,
            s % 2 === 0 ? '#ffffff' : '#f0abfc',
            timeSec * 10 + s
          );
        }

        if (isFriendly) {
          drawFourPointStar(targetX, targetY, 68 * flashIntensity, '#ffffff', timeSec * 12);
        }

        ctx.restore();
        drawBadge(
          targetX,
          targetY - cardH / 2 - 22,
          evt.labelOverride || (isFriendly ? '🌀💥 TORPOR ATIVADO! ATAQUE EM ALIADO!' : '🌀 TORPOR CEGANTE (35%)'),
          '#e879f9',
          '#fae8ff',
          masterAlpha
        );
      }

      // 7. CRÍTICO: Um dardo de PRATA atingindo diretamente o coração de Vida da carta
      else if (cond === 'critico') {
        ctx.save();
        // O coração de Vida fica sempre no canto superior direito da carta
        const heartX = targetX + cardW * 0.34;
        const heartY = targetY - cardH * 0.34;
        const startX = heartX - 240;
        const startY = heartY - 120;

        const flightT = Math.min(1, progress / 0.36);
        const easeDart = 1 - Math.pow(1 - flightT, 3);
        const dartX = startX + (heartX - startX) * easeDart;
        const dartY = startY + (heartY - startY) * easeDart;
        const angle = Math.atan2(heartY - startY, heartX - startX);

        // Rastro prateado do dardo de prata
        if (progress <= 0.72) {
          const trailA = (progress > 0.36 ? 1 - (progress - 0.36) / 0.36 : 1) * masterAlpha;
          ctx.save();
          ctx.globalAlpha = trailA;
          const trGrad = ctx.createLinearGradient(startX, startY, dartX, dartY);
          trGrad.addColorStop(0, 'transparent');
          trGrad.addColorStop(0.5, '#cbd5e1');
          trGrad.addColorStop(1, '#ffffff');
          ctx.strokeStyle = trGrad;
          ctx.lineWidth = 4.5;
          ctx.shadowColor = '#f8fafc';
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(dartX, dartY);
          ctx.stroke();

          // Corpo esculpido do Dardo de Prata
          ctx.translate(dartX, dartY);
          ctx.rotate(angle);
          const silverGrad = ctx.createLinearGradient(-32, -6, 16, 6);
          silverGrad.addColorStop(0, '#64748b');
          silverGrad.addColorStop(0.5, '#f1f5f9');
          silverGrad.addColorStop(1, '#ffffff');
          ctx.fillStyle = silverGrad;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(18, 0);
          ctx.lineTo(-10, -6);
          ctx.lineTo(-28, -2);
          ctx.lineTo(-34, -8);
          ctx.lineTo(-26, 0);
          ctx.lineTo(-34, 8);
          ctx.lineTo(-28, 2);
          ctx.lineTo(-10, 6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        // Impacto perfurante no coração de Vida (progress >= 0.34)
        if (progress >= 0.34) {
          const impT = (progress - 0.34) / 0.66;
          ctx.save();
          ctx.globalAlpha = (1 - impT) * masterAlpha;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4 * (1 - impT);
          ctx.shadowColor = '#e2e8f0';
          ctx.shadowBlur = 22;
          ctx.beginPath();
          ctx.arc(heartX, heartY, 10 + impT * 52, 0, Math.PI * 2);
          ctx.stroke();

          drawFourPointStar(heartX, heartY, 32 * (1 - impT * 0.5), '#ffffff', timeSec * 12);

          // Estilhaços prateados saltando do coração de Vida
          for (let s = 0; s < 10; s++) {
            const p = particles[s];
            const sx = heartX + Math.cos(p.angle) * (8 + impT * 68);
            const sy = heartY + Math.sin(p.angle) * (8 + impT * 68);
            ctx.fillStyle = s % 2 === 0 ? '#ffffff' : '#94a3b8';
            ctx.beginPath();
            ctx.arc(sx, sy, 2.2 * (1 - impT), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        drawBadge(targetX, targetY - cardH / 2 - 24, evt.labelOverride || '🎯 CRÍTICO · DARDO DE PRATA NA VIDA', '#e2e8f0', '#f8fafc', masterAlpha);
        ctx.restore();
      }

      // 8. ROUBO DE VIDA: Mãos sanguinárias sugando a vida da carta
      else if (cond === 'roubo_de_vida') {
        ctx.save();
        const graspT = Math.min(1, progress / 0.45);
        const reach = (1 - graspT) * 58;

        // Névoa carmesim envolvendo o alvo
        const aura = ctx.createRadialGradient(targetX, targetY, 8, targetX, targetY, cardW * 1.15);
        aura.addColorStop(0, `rgba(190, 18, 60, ${0.58 * masterAlpha})`);
        aura.addColorStop(1, 'transparent');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(targetX, targetY, cardW * 1.15, 0, Math.PI * 2);
        ctx.fill();

        // Desenha duas Mãos Sanguinárias (garras escarlates fantasmagóricas) apertando e drenando a carta
        const drawBloodyHand = (side: -1 | 1) => {
          ctx.save();
          ctx.translate(targetX + side * (cardW * 0.34 + reach), targetY + 12);
          ctx.scale(side, 1);
          ctx.globalAlpha = masterAlpha * 0.92;

          const hGrad = ctx.createLinearGradient(0, -40, 0, 45);
          hGrad.addColorStop(0, '#fb7185');
          hGrad.addColorStop(0.5, '#e11d48');
          hGrad.addColorStop(1, '#4c0519');
          ctx.fillStyle = hGrad;
          ctx.strokeStyle = '#fecdd3';
          ctx.lineWidth = 1.6;
          ctx.shadowColor = '#be123c';
          ctx.shadowBlur = 20;

          // Palma e 4 dedos/garras longas agarrando em direção ao centro
          ctx.beginPath();
          ctx.moveTo(22, 34);
          ctx.quadraticCurveTo(26, 2, 12, -10);
          ctx.lineTo(-18, -32); // dedo indicador
          ctx.lineTo(-8, -14);
          ctx.lineTo(-26, -16); // dedo médio
          ctx.lineTo(-10, -2);
          ctx.lineTo(-24, 6); // dedo anelar
          ctx.lineTo(-8, 12);
          ctx.lineTo(-16, 26); // polegar/garra inferior
          ctx.lineTo(4, 34);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        };

        drawBloodyHand(-1);
        drawBloodyHand(1);

        // Orbes de sangue vital sendo drenados para cima
        for (let b = 0; b < 12; b++) {
          const bp = (timeSec * 1.1 + b * 0.13) % 1;
          const bx = targetX + Math.sin(bp * Math.PI * 2 + b) * (cardW * 0.32);
          const by = targetY + 25 - bp * (cardH * 0.85);
          ctx.save();
          ctx.globalAlpha = (1 - bp) * masterAlpha;
          ctx.fillStyle = b % 2 === 0 ? '#f43f5e' : '#fecdd3';
          ctx.shadowColor = '#e11d48';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(bx, by, 4.2 * (1 - bp * 0.4), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        drawBadge(targetX, targetY - cardH / 2 - 22, evt.labelOverride || '🩸 ROUBO DE VIDA (CURA 40%)', '#f43f5e', '#ffe4e6', masterAlpha);
        ctx.restore();
      }

      // 9. REVELAR (MODERNIZADO): Olho Arcano de Clarividência, Ondas Prismáticas e Astrolábio Rúnico
      else if (cond === 'revelar') {
        ctx.save();
        ctx.translate(targetX, targetY);
        ctx.globalAlpha = masterAlpha;
        const pRad = Math.max(92, cardW * 0.82);
        const expand = Math.min(1, progress / 0.24);
        const openEase = 1 - Math.pow(1 - expand, 3);
        const curRad = pRad * (0.42 + openEase * 0.58);

        // 1. Halo prismático de clarividência
        const pGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, curRad * 1.45);
        pGrad.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
        pGrad.addColorStop(0.24, 'rgba(125, 211, 252, 0.72)');
        pGrad.addColorStop(0.55, 'rgba(56, 189, 248, 0.34)');
        pGrad.addColorStop(0.82, 'rgba(167, 139, 250, 0.24)');
        pGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(0, 0, curRad * 1.45, 0, Math.PI * 2);
        ctx.fill();

        // 2. Duas ondas de varredura (scan) concêntricas expandindo para fora
        for (let w = 0; w < 2; w++) {
          const waveP = (progress * 1.55 + w * 0.45) % 1;
          const waveR = curRad * (0.35 + waveP * 1.35);
          ctx.save();
          ctx.globalAlpha = Math.max(0, (1 - waveP) * 0.85 * masterAlpha);
          ctx.strokeStyle = w === 0 ? '#7dd3fc' : '#fde047';
          ctx.lineWidth = 3.2 * (1 - waveP * 0.55);
          ctx.shadowColor = w === 0 ? '#38bdf8' : '#f59e0b';
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.arc(0, 0, waveR, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // 3. Dois anéis astrolábio contra-rotativos com traços rúnicos
        ctx.save();
        ctx.rotate(timeSec * 1.4);
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.88)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 7, 3, 7]);
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(0, 0, curRad * 0.94, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        // 8 marcadores cardinais dourados no anel
        for (let m = 0; m < 8; m++) {
          const a = (m * Math.PI) / 4;
          const rIn = curRad * 0.86;
          const rOut = curRad * 1.02;
          ctx.strokeStyle = m % 2 === 0 ? '#fde047' : '#bae6fd';
          ctx.lineWidth = m % 2 === 0 ? 2.4 : 1.4;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
          ctx.lineTo(Math.cos(a) * rOut, Math.sin(a) * rOut);
          ctx.stroke();
        }
        ctx.restore();

        ctx.save();
        ctx.rotate(-timeSec * 2.1);
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.82)';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, curRad * 0.68, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // 4. Olho Místico de Clarividência abrindo-se no centro
        const eyeOpen = Math.sin(Math.min(1, progress / 0.32) * Math.PI * 0.5);
        const eyeW = curRad * 0.68;
        const eyeH = curRad * 0.36 * eyeOpen;
        ctx.save();
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 22;
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 2.8;
        ctx.fillStyle = 'rgba(12, 74, 110, 0.62)';
        ctx.beginPath();
        ctx.moveTo(-eyeW, 0);
        ctx.quadraticCurveTo(0, -eyeH * 1.9, eyeW, 0);
        ctx.quadraticCurveTo(0, eyeH * 1.9, -eyeW, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Íris dourado-celeste e pupila vertical luminosa
        const irisR = Math.max(8, eyeH * 0.72);
        const irisGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, irisR);
        irisGrad.addColorStop(0, '#ffffff');
        irisGrad.addColorStop(0.45, '#fde047');
        irisGrad.addColorStop(0.85, '#38bdf8');
        irisGrad.addColorStop(1, '#1d4ed8');
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.arc(0, 0, irisR, 0, Math.PI * 2);
        ctx.fill();

        // Brilho em cruz de estrela no centro da pupila
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        const starLen = irisR * (1.2 + Math.sin(timeSec * 12) * 0.25);
        ctx.beginPath();
        ctx.moveTo(-starLen, 0);
        ctx.lineTo(starLen, 0);
        ctx.moveTo(0, -starLen * 0.75);
        ctx.lineTo(0, starLen * 0.75);
        ctx.stroke();
        ctx.restore();

        // 5. Partículas estelares orbitais e ascendentes
        for (let s = 0; s < 16; s++) {
          const ang = (s / 16) * Math.PI * 2 + timeSec * (s % 2 === 0 ? 1.8 : -1.3);
          const dist = curRad * (0.45 + ((s * 0.19 + progress * 0.9) % 0.85));
          const sx = Math.cos(ang) * dist;
          const sy = Math.sin(ang) * dist - progress * 16;
          ctx.fillStyle = s % 3 === 0 ? '#fef08a' : s % 3 === 1 ? '#e0f2fe' : '#c4b5fd';
          ctx.beginPath();
          ctx.arc(sx, sy, s % 3 === 0 ? 3.2 : 2.1, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
        drawBadge(
          targetX,
          targetY - cardH / 2 - 24,
          evt.labelOverride || '👁️ REVELAR · VISÃO DO GRIMÓRIO',
          '#38bdf8',
          '#e0f2fe',
          masterAlpha
        );
      }

      // 10. BARREIRA (Com GELO quando Aurora!)
      else if (cond === 'barreira') {
        ctx.save();
        ctx.translate(targetX, targetY);
        ctx.globalAlpha = masterAlpha;
        const r = Math.max(84, Math.hypot(cardW, cardH) * 0.56);
        const isIce = Boolean(evt.isAuroraIce);
        const sGrad = ctx.createRadialGradient(-r * 0.25, -r * 0.25, 6, 0, 0, r);
        sGrad.addColorStop(0, isIce ? 'rgba(240, 249, 255, 0.55)' : 'rgba(224, 242, 254, 0.4)');
        sGrad.addColorStop(0.65, isIce ? 'rgba(103, 232, 249, 0.35)' : 'rgba(56, 189, 248, 0.28)');
        sGrad.addColorStop(1, isIce ? 'rgba(186, 230, 253, 0.88)' : 'rgba(14, 165, 233, 0.8)');
        ctx.fillStyle = sGrad;
        ctx.strokeStyle = isIce ? '#ffffff' : '#bae6fd';
        ctx.lineWidth = 3;
        ctx.shadowColor = isIce ? '#67e8f9' : '#38bdf8';
        ctx.shadowBlur = 26;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (isIce) {
          for (let c = 0; c < 8; c++) {
            const ang = (c * Math.PI) / 4 + timeSec * 0.8;
            ctx.save();
            ctx.translate(Math.cos(ang) * r, Math.sin(ang) * r);
            ctx.rotate(ang + Math.PI / 2);
            ctx.fillStyle = '#e0f2fe';
            ctx.beginPath();
            ctx.moveTo(0, -16);
            ctx.lineTo(7, 0);
            ctx.lineTo(0, 10);
            ctx.lineTo(-7, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }
        ctx.restore();
        drawBadge(
          targetX,
          targetY - r - 18,
          evt.labelOverride || (isIce ? '🌐 BARREIRA GLACIAL (AURORA)' : '🌐 BARREIRA CELESTIAL'),
          isIce ? '#67e8f9' : '#38bdf8',
          '#e0f2fe',
          masterAlpha
        );
      }

      // 11. SUBJUGAR / CAPTURAR: Correntes mágicas envolvem a unidade, reduzem seu tamanho e a movem para a mão
      else if (cond === 'capturar') {
        const isDeckCapture = evt.captureData?.sourceKind === 'deck';
        const isHandFull = Boolean(evt.captureData?.isHandFull);
        const isSubjugar = evt.captureData?.isSubjugar ?? !isDeckCapture;

        // Marcos da coreografia (0..1 em 2150ms)
        const pWrapEnd = 0.44; // Envolvida por correntes mágicas
        const pShrinkEnd = 0.66; // Reduzida pelo selo arcano
        // 0.66..1.00 => Movida em arco para a mão do jogador

        const easeOutCubic = (v: number) => 1 - Math.pow(1 - v, 3);
        const easeInOutCubic = (v: number) =>
          v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;

        // Posição, escala e rotação atual da carta capturada
        let curX = targetX;
        let curY = targetY;
        let curScale = 1;
        let curRot = 0;
        let cardAlpha = masterAlpha;

        if (progress < pWrapEnd) {
          const wrapT = progress / pWrapEnd;
          if (isDeckCapture) {
            // Para Bia (do baralho), a carta emerge crescendo rapidamente do topo do grimório
            const emergeT = easeOutCubic(Math.min(1, wrapT / 0.35));
            curScale = 0.38 + 0.62 * emergeT;
            curY = targetY + (1 - emergeT) * 18;
          } else {
            curScale = 1;
          }
          // Tremor sutil quando as correntes batem e apertam a unidade (respeitando reduced-motion)
          if (!prefersReducedMotion && wrapT > 0.32 && wrapT < 0.72) {
            const amp = (1 - (wrapT - 0.32) / 0.4) * 3.5;
            curX += Math.sin(timeSec * 58) * amp;
            curY += Math.cos(timeSec * 52) * amp * 0.6;
          }
        } else if (progress < pShrinkEnd) {
          // FASE 2: Redução mágica de 1.0 -> 0.42
          const shrinkT = easeInOutCubic((progress - pWrapEnd) / (pShrinkEnd - pWrapEnd));
          curScale = 1 - shrinkT * 0.58; // 1.0 -> 0.42
          curRot = prefersReducedMotion ? 0 : -shrinkT * 0.12;
        } else {
          // FASE 3: Voo curvo até a mão do jogador (ou Cripta se mão cheia)
          const flyT = easeInOutCubic((progress - pShrinkEnd) / (1 - pShrinkEnd));
          const midX = (targetX + destX) * 0.5 + (destX >= targetX ? -85 : 85);
          const midY = Math.min(targetY, destY) - Math.max(70, Math.abs(destY - targetY) * 0.25);
          const omt = 1 - flyT;
          curX = omt * omt * targetX + 2 * omt * flyT * midX + flyT * flyT * destX;
          curY = omt * omt * targetY + 2 * omt * flyT * midY + flyT * flyT * destY;
          curScale = 0.42 - flyT * 0.16; // 0.42 -> 0.26 na chegada
          curRot = prefersReducedMotion ? 0 : -0.12 + flyT * 0.22;
          if (flyT > 0.8) {
            cardAlpha = Math.max(0, (1 - (flyT - 0.8) / 0.2)) * masterAlpha;
          }
        }

        // A) Círculo Mágico de Captura atrás da unidade na origem (Fases 1 e 2)
        if (progress < pShrinkEnd + 0.08) {
          const sigilFade =
            progress < pShrinkEnd
              ? 1
              : Math.max(0, 1 - (progress - pShrinkEnd) / 0.08);
          const sigilScale =
            progress < pWrapEnd
              ? easeOutCubic(Math.min(1, progress / 0.22))
              : Math.max(0.32, 1 - ((progress - pWrapEnd) / (pShrinkEnd - pWrapEnd)) * 0.65);
          const sigilRad = Math.max(cardW, cardH) * 0.62 * sigilScale;

          ctx.save();
          ctx.translate(targetX, targetY);
          ctx.globalAlpha = sigilFade * masterAlpha * 0.85;

          const bgGlow = ctx.createRadialGradient(0, 0, 4, 0, 0, sigilRad * 1.25);
          bgGlow.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
          bgGlow.addColorStop(0.55, 'rgba(251, 191, 36, 0.22)');
          bgGlow.addColorStop(1, 'transparent');
          ctx.fillStyle = bgGlow;
          ctx.beginPath();
          ctx.arc(0, 0, sigilRad * 1.25, 0, Math.PI * 2);
          ctx.fill();

          ctx.rotate(timeSec * 1.6);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.2;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.arc(0, 0, sigilRad, 0, Math.PI * 2);
          ctx.stroke();

          ctx.setLineDash([7, 6]);
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(0, 0, sigilRad * 0.82, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }

        // B) Rastro luminoso de correntes e faíscas durante a ida à mão (Fase 3)
        if (progress >= pShrinkEnd) {
          const flyT = (progress - pShrinkEnd) / (1 - pShrinkEnd);
          const midX = (targetX + destX) * 0.5 + (destX >= targetX ? -85 : 85);
          const midY = Math.min(targetY, destY) - Math.max(70, Math.abs(destY - targetY) * 0.25);
          for (let tr = 0; tr < 12; tr++) {
            const sampleT = Math.max(0, flyT - tr * 0.032);
            const omt = 1 - sampleT;
            const tx = omt * omt * targetX + 2 * omt * sampleT * midX + sampleT * sampleT * destX;
            const ty = omt * omt * targetY + 2 * omt * sampleT * midY + sampleT * sampleT * destY;
            const trailAlpha = (1 - tr / 12) * (1 - Math.max(0, (flyT - 0.85) / 0.15)) * masterAlpha;
            ctx.save();
            ctx.globalAlpha = trailAlpha;
            ctx.fillStyle = tr % 2 === 0 ? '#7dd3fc' : '#fde047';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(tx, ty, Math.max(1.5, (1 - tr / 12) * 5.5), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        // C) Desenha a Carta Capturada na posição, escala e rotação atuais
        const chainGlow = Math.min(1, progress / 0.24);
        drawCapturedCardVisual(curX, curY, cardW, cardH, curScale, curRot, cardAlpha, evt, chainGlow);

        // D) Correntes Mágicas externas disparando dos cantos e prendendo a unidade (Fase 1)
        const halfW = (cardW * curScale) / 2;
        const halfH = (cardH * curScale) / 2;
        if (progress < pShrinkEnd) {
          const tetherGrow = Math.min(1, progress / 0.16);
          const tetherAlpha =
            progress < pWrapEnd
              ? masterAlpha
              : Math.max(0, 1 - (progress - pWrapEnd) / (pShrinkEnd - pWrapEnd)) * masterAlpha;
          const anchorReach = Math.max(cardW, cardH) * 0.95;
          const corners: Array<[number, number, number, number]> = [
            [targetX - anchorReach, targetY - anchorReach * 0.72, curX - halfW * 0.85, curY - halfH * 0.72],
            [targetX + anchorReach, targetY - anchorReach * 0.72, curX + halfW * 0.85, curY - halfH * 0.72],
            [targetX - anchorReach, targetY + anchorReach * 0.72, curX - halfW * 0.85, curY + halfH * 0.72],
            [targetX + anchorReach, targetY + anchorReach * 0.72, curX + halfW * 0.85, curY + halfH * 0.72],
          ];
          corners.forEach(([ax, ay, bx, by], idx) => {
            drawMagicChain(
              ax,
              ay,
              bx,
              by,
              15,
              tetherGrow,
              idx % 2 === 0 ? '#38bdf8' : '#fbbf24',
              idx % 2 === 0 ? '#7dd3fc' : '#fde047',
              tetherAlpha * 0.9,
              timeSec
            );
          });
        }

        // E) Correntes Mágicas enroladas em "X" + cinta horizontal SOBRE a carta (encolhem junto com ela!)
        const wrapGrow = Math.min(1, Math.max(0, (progress - 0.10) / 0.18));
        if (wrapGrow > 0.02 && cardAlpha > 0.02) {
          ctx.save();
          ctx.translate(curX, curY);
          ctx.rotate(curRot);
          const bw = halfW * 1.04;
          const bh = halfH * 0.96;
          const linkSize = Math.max(7, 14 * curScale);

          // X diagonal envolvente
          drawMagicChain(-bw, -bh * 0.82, bw, bh * 0.82, linkSize, wrapGrow, '#38bdf8', '#bae6fd', cardAlpha, timeSec);
          drawMagicChain(bw, -bh * 0.82, -bw, bh * 0.82, linkSize, wrapGrow, '#38bdf8', '#fde047', cardAlpha, timeSec);
          // Cinta horizontal central apertando a carta
          drawMagicChain(-bw * 1.05, 0, bw * 1.05, 0, linkSize * 0.95, wrapGrow, '#fbbf24', '#fef08a', cardAlpha, timeSec);

          // Selo / Cadeado Rúnico no cruzamento central das correntes
          if (progress >= 0.24) {
            const lockAppear = Math.min(1, (progress - 0.24) / 0.08);
            const lockSize = Math.max(9, 20 * curScale) * (1.28 - 0.28 * lockAppear);
            ctx.save();
            ctx.globalAlpha = cardAlpha * lockAppear;
            ctx.fillStyle = '#082f49';
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = Math.max(1.5, 2.6 * curScale);
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 18;
            ctx.beginPath();
            // Losango/Escudo do selo
            ctx.moveTo(0, -lockSize);
            ctx.lineTo(lockSize * 0.85, 0);
            ctx.lineTo(0, lockSize);
            ctx.lineTo(-lockSize * 0.85, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Fechadura brilhante interna
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(0, -lockSize * 0.12, lockSize * 0.22, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-lockSize * 0.14, -lockSize * 0.05);
            ctx.lineTo(lockSize * 0.14, -lockSize * 0.05);
            ctx.lineTo(lockSize * 0.2, lockSize * 0.36);
            ctx.lineTo(-lockSize * 0.2, lockSize * 0.36);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
          ctx.restore();
        }

        // F) Onda de Choque e Faíscas no instante do travamento (0.24..0.46)
        if (progress >= 0.24 && progress <= 0.50) {
          const lockImpT = (progress - 0.24) / 0.26;
          ctx.save();
          ctx.globalAlpha = (1 - lockImpT) * masterAlpha;
          ctx.strokeStyle = '#7dd3fc';
          ctx.lineWidth = 4 * (1 - lockImpT);
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.arc(targetX, targetY, 18 + lockImpT * (cardW * 0.9), 0, Math.PI * 2);
          ctx.stroke();

          if (!prefersReducedMotion) {
            for (let sp = 0; sp < 14; sp++) {
              const p = particles[sp];
              const d = 14 + lockImpT * (55 + p.dist);
              const sx = targetX + Math.cos(p.angle) * d;
              const sy = targetY + Math.sin(p.angle) * d;
              ctx.fillStyle = sp % 2 === 0 ? '#fde047' : '#bae6fd';
              ctx.beginPath();
              ctx.arc(sx, sy, 2.4 * (1 - lockImpT), 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.restore();
        }

        // G) Anéis de compressão na redução (0.44..0.68)
        if (progress >= pWrapEnd && progress <= pShrinkEnd + 0.04) {
          const compT = Math.min(1, (progress - pWrapEnd) / (pShrinkEnd - pWrapEnd));
          ctx.save();
          ctx.globalAlpha = Math.sin(compT * Math.PI) * masterAlpha;
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.arc(curX, curY, Math.max(14, (1 - compT) * cardW * 0.72), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // H) Pulso de chegada na Mão (0.88..1.00)
        if (progress >= 0.88) {
          const arrT = (progress - 0.88) / 0.12;
          ctx.save();
          ctx.globalAlpha = (1 - arrT) * masterAlpha;
          ctx.strokeStyle = isHandFull ? '#fb7185' : '#38bdf8';
          ctx.lineWidth = 4 * (1 - arrT * 0.5);
          ctx.shadowColor = isHandFull ? '#f43f5e' : '#fbbf24';
          ctx.shadowBlur = 22;
          ctx.beginPath();
          ctx.arc(destX, destY, 16 + arrT * 72, 0, Math.PI * 2);
          ctx.stroke();
          drawFourPointStar(destX, destY, 26 * (1 - arrT * 0.4), '#fde047', timeSec * 8);
          ctx.restore();
        }

        // I) Banner contextual acompanhando a fase atual
        const phaseLabel =
          evt.labelOverride ||
          (progress < pWrapEnd
            ? isSubjugar
              ? '⛓️ SUBJUGAR · CORRENTES MÁGICAS!'
              : '⛓️ CAPTURAR · SELANDO CARTA!'
            : progress < pShrinkEnd
            ? '✨ REDUZINDO UNIDADE CAPTURADA...'
            : isHandFull
            ? '🪦 MÃO CHEIA (8/8) · ENVIANDO À CRIPTA'
            : '🫱 MOVENDO PARA A MÃO!');
        const badgeAnchorX = progress < pShrinkEnd ? targetX : curX;
        const badgeAnchorY = progress < pShrinkEnd ? targetY - cardH / 2 - 24 : curY - cardH * curScale * 0.5 - 24;
        drawBadge(badgeAnchorX, badgeAnchorY, phaseLabel, '#38bdf8', '#e0f2fe', masterAlpha);
      }

      // 13. PRAGA (Miasma sombrio púrpura-esverdeado e esporos pestilentos -25% atributos)
      else if (cond === 'praga') {
        ctx.save();
        ctx.globalAlpha = masterAlpha;
        const rad = ctx.createRadialGradient(targetX, targetY, 6, targetX, targetY, cardW * 1.15);
        rad.addColorStop(0, 'rgba(132, 204, 22, 0.65)');
        rad.addColorStop(0.5, 'rgba(147, 51, 234, 0.55)');
        rad.addColorStop(1, 'transparent');
        ctx.fillStyle = rad;
        ctx.beginPath();
        ctx.arc(targetX, targetY, cardW * 1.15, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#84cc16';
        ctx.shadowBlur = 22;
        ctx.beginPath();
        ctx.roundRect(targetX - cardW / 2 - 4, targetY - cardH / 2 - 4, cardW + 8, cardH + 8, 12);
        ctx.stroke();

        for (let i = 0; i < 14; i++) {
          const ang = (i / 14) * Math.PI * 2 + timeSec * 2.6;
          const dist = 16 + ((progress * 75 + i * 9) % (cardW * 0.7));
          const sx = targetX + Math.cos(ang) * dist;
          const sy = targetY + Math.sin(ang) * dist - progress * 18;
          ctx.fillStyle = i % 2 === 0 ? '#a3e635' : '#d946ef';
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(1.5, 4.5 * (1 - progress * 0.4)), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        drawBadge(
          targetX,
          targetY - cardH / 2 - 24,
          evt.labelOverride || '☠️ PRAGA (-25% EM TODOS OS ATRIBUTOS)',
          '#a855f7',
          '#ecfccb',
          masterAlpha
        );
      }

      // 8. CORROSÃO: Vapor ácido cáustico (-1 Vida por turno + corta toda cura)
      else if (cond === 'corrosao') {
        ctx.save();
        ctx.globalAlpha = masterAlpha;
        const acidGrad = ctx.createRadialGradient(targetX, targetY, 8, targetX, targetY, cardW * 0.95);
        acidGrad.addColorStop(0, 'rgba(132, 204, 22, 0.72)');
        acidGrad.addColorStop(0.55, 'rgba(63, 98, 18, 0.5)');
        acidGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = acidGrad;
        ctx.beginPath();
        ctx.arc(targetX, targetY, cardW * 0.95, 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < 12; i++) {
          const bx = targetX + (((i * 23) % 72) - 36);
          const by = targetY + cardH * 0.35 - ((progress * 90 + i * 11) % (cardH * 0.95));
          const br = 3 + (i % 4) * 1.4;
          ctx.strokeStyle = '#bef264';
          ctx.fillStyle = 'rgba(163, 230, 53, 0.45)';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
        drawBadge(
          targetX,
          targetY - cardH / 2 - 24,
          evt.labelOverride || '🧪 CORROSÃO (-1 VIDA/TURNO · CORTA CURA)',
          '#84cc16',
          '#ecfccb',
          masterAlpha
        );
      }

      // 9. SANGRAMENTO / HEMORRAGIA: Cortes carmesins e ruptura de 25% da Vida Máxima
      else if (cond === 'sangramento' || cond === 'hemorragia') {
        const isHemo = cond === 'hemorragia';
        ctx.save();
        ctx.globalAlpha = masterAlpha;
        const bloodGrad = ctx.createRadialGradient(targetX, targetY, 6, targetX, targetY, cardW * (isHemo ? 1.25 : 0.9));
        bloodGrad.addColorStop(0, isHemo ? 'rgba(220, 38, 38, 0.85)' : 'rgba(225, 29, 72, 0.68)');
        bloodGrad.addColorStop(0.6, 'rgba(136, 19, 55, 0.45)');
        bloodGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = bloodGrad;
        ctx.beginPath();
        ctx.arc(targetX, targetY, cardW * (isHemo ? 1.25 : 0.9), 0, Math.PI * 2);
        ctx.fill();

        // Rasgos diagonais sangrentos
        ctx.strokeStyle = isHemo ? '#fecaca' : '#fda4af';
        ctx.lineWidth = isHemo ? 5 : 3.5;
        ctx.shadowColor = '#e11d48';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.moveTo(targetX - cardW * 0.42, targetY - cardH * 0.32);
        ctx.lineTo(targetX + cardW * 0.42, targetY + cardH * 0.32);
        if (isHemo) {
          ctx.moveTo(targetX + cardW * 0.42, targetY - cardH * 0.32);
          ctx.lineTo(targetX - cardW * 0.42, targetY + cardH * 0.32);
        }
        ctx.stroke();

        // Gotas de sangue caindo
        for (let i = 0; i < (isHemo ? 16 : 10); i++) {
          const dx = targetX + (((i * 19) % 68) - 34);
          const dy = targetY - cardH * 0.2 + ((progress * 85 + i * 13) % (cardH * 0.75));
          ctx.fillStyle = i % 2 === 0 ? '#f43f5e' : '#991b1b';
          ctx.beginPath();
          ctx.arc(dx, dy, isHemo ? 4.2 : 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        drawBadge(
          targetX,
          targetY - cardH / 2 - 24,
          evt.labelOverride || (isHemo ? '💔🩸 HEMORRAGIA! (-25% DA VIDA MÁXIMA)' : '🩸 SANGRAMENTO (-2 VIDA/RODADA)'),
          isHemo ? '#ef4444' : '#f43f5e',
          '#ffe4e6',
          masterAlpha
        );
      }

      // 10. RESSURREIÇÃO: Selo rúnico celestial, pilar de luz divina, asas de arcanjo, aura dourada e ascensão de penas
      else if (cond === 'ressurreicao') {
        const easeOutCubic = (x: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
        const easeOutBack = (x: number) => {
          const c = Math.max(0, Math.min(1, x));
          const c1 = 1.70158;
          const c3 = c1 + 1;
          return 1 + c3 * Math.pow(c - 1, 3) + c1 * Math.pow(c - 1, 2);
        };

        if (prefersReducedMotion) {
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          const calmGrad = ctx.createRadialGradient(targetX, targetY, 8, targetX, targetY, cardW * 1.25);
          calmGrad.addColorStop(0, 'rgba(254, 249, 195, 0.72)');
          calmGrad.addColorStop(0.55, 'rgba(251, 191, 36, 0.35)');
          calmGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = calmGrad;
          ctx.beginPath();
          ctx.arc(targetX, targetY, cardW * 1.25, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 3.5;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.roundRect(targetX - cardW / 2 - 5, targetY - cardH / 2 - 5, cardW + 10, cardH + 10, 14);
          ctx.stroke();

          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(targetX, targetY - cardH / 2 - 14, cardW * 0.34, 8, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          drawBadge(
            targetX,
            targetY - cardH / 2 - 34,
            evt.labelOverride || '🪽✨ RESSURREIÇÃO! ATRIBUTOS RESTAURADOS',
            '#fde047',
            '#fef9c3',
            masterAlpha
          );
          return;
        }

        const sealT = easeOutCubic(progress / 0.28);
        const pillarAlpha =
          progress < 0.14
            ? 0
            : progress < 0.34
            ? (progress - 0.14) / 0.2
            : progress < 0.76
            ? 1
            : Math.max(0, (1 - progress) / 0.24);
        const wingOpen = progress < 0.16 ? 0 : easeOutBack((progress - 0.16) / 0.38);
        const wingAlpha =
          progress < 0.16
            ? 0
            : progress < 0.3
            ? (progress - 0.16) / 0.14
            : progress > 0.8
            ? Math.max(0, (1 - progress) / 0.2)
            : 1;
        const burstT = progress < 0.24 ? 0 : Math.min(1, (progress - 0.24) / 0.52);

        // A) Pilar de Luz Celestial descendo do topo da tela sobre a unidade
        if (pillarAlpha > 0.01) {
          ctx.save();
          ctx.globalAlpha = pillarAlpha * masterAlpha;
          const beamHalfW = cardW * (0.62 + 0.16 * Math.sin(timeSec * 8));
          const outerBeam = ctx.createLinearGradient(targetX - beamHalfW, 0, targetX + beamHalfW, 0);
          outerBeam.addColorStop(0, 'rgba(245, 158, 11, 0)');
          outerBeam.addColorStop(0.24, 'rgba(251, 191, 36, 0.26)');
          outerBeam.addColorStop(0.5, 'rgba(254, 249, 195, 0.72)');
          outerBeam.addColorStop(0.76, 'rgba(251, 191, 36, 0.26)');
          outerBeam.addColorStop(1, 'rgba(245, 158, 11, 0)');
          ctx.fillStyle = outerBeam;
          ctx.fillRect(targetX - beamHalfW, 0, beamHalfW * 2, targetY + cardH * 0.62);

          // Núcleo branco-dourado puro do pilar
          const coreW = cardW * 0.24;
          const innerBeam = ctx.createLinearGradient(targetX - coreW, 0, targetX + coreW, 0);
          innerBeam.addColorStop(0, 'rgba(255, 255, 255, 0)');
          innerBeam.addColorStop(0.5, 'rgba(255, 255, 255, 0.85)');
          innerBeam.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = innerBeam;
          ctx.fillRect(targetX - coreW, 0, coreW * 2, targetY + cardH * 0.52);
          ctx.restore();
        }

        // B) Selo Rúnico Celestial Dourado girando sob a unidade
        ctx.save();
        ctx.globalAlpha = masterAlpha * 0.92;
        ctx.translate(targetX, targetY);
        const ringR = Math.max(cardW, cardH) * 0.62 * (0.45 + 0.55 * sealT);
        ctx.rotate(timeSec * 1.15);

        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2.6;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(0, 0, ringR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(254, 249, 195, 0.75)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, ringR * 0.82, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Estrela sagrada de 8 pontas inscrita no selo
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.65)';
        ctx.lineWidth = 1.5;
        for (let sq = 0; sq < 2; sq++) {
          ctx.save();
          ctx.rotate((sq * Math.PI) / 4);
          const s = ringR * 0.58;
          ctx.strokeRect(-s, -s, s * 2, s * 2);
          ctx.restore();
        }
        ctx.restore();

        // C) Asas de Arcanjo Douradas & Brancas se abrindo majestosamente em volta da carta
        if (wingAlpha > 0.01 && wingOpen > 0.01) {
          ctx.save();
          ctx.globalAlpha = wingAlpha * masterAlpha;
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 24;
          const wingSpan = cardW * (1.22 + 0.14 * Math.sin(timeSec * 6));
          [-1, 1].forEach((dir) => {
            for (let f = 0; f < 6; f++) {
              const spread = (-0.68 + f * 0.24) * Math.min(1.15, wingOpen);
              const featherLen = wingSpan * (1 - f * 0.095) * Math.min(1.1, wingOpen);
              const startX = targetX + dir * (cardW * 0.34);
              const startY = targetY - cardH * 0.06 + f * 7;
              const ctrlX = startX + dir * featherLen * 0.56;
              const ctrlY = startY + Math.sin(spread) * featherLen * 0.72 - 22;
              const tipX = startX + dir * Math.cos(spread * 0.55) * featherLen;
              const tipY = startY + Math.sin(spread) * featherLen * 0.92;

              // Pluma externa dourada
              ctx.strokeStyle = f % 2 === 0 ? '#fef08a' : '#f59e0b';
              ctx.lineWidth = Math.max(2.6, 9.5 - f * 1.15);
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(startX, startY);
              ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
              ctx.stroke();

              // Filete central branco puro
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
              ctx.lineWidth = Math.max(1.2, 3.8 - f * 0.45);
              ctx.beginPath();
              ctx.moveTo(startX, startY);
              ctx.quadraticCurveTo(ctrlX, ctrlY - 1.5, tipX, tipY);
              ctx.stroke();
            }
          });
          ctx.restore();
        }

        // D) Clarão radial de renascimento & ondas de choque douradas
        if (burstT > 0) {
          ctx.save();
          const flashAlpha = Math.max(0, 1 - burstT * 1.25) * masterAlpha;
          if (flashAlpha > 0.01) {
            const flashGrad = ctx.createRadialGradient(targetX, targetY, 4, targetX, targetY, cardW * 1.45);
            flashGrad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * flashAlpha})`);
            flashGrad.addColorStop(0.45, `rgba(253, 224, 71, ${0.58 * flashAlpha})`);
            flashGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = flashGrad;
            ctx.beginPath();
            ctx.arc(targetX, targetY, cardW * 1.45, 0, Math.PI * 2);
            ctx.fill();
          }

          // Duas ondas de choque concêntricas
          for (let w = 0; w < 2; w++) {
            const wt = Math.max(0, Math.min(1, burstT * 1.25 - w * 0.22));
            if (wt > 0 && wt < 1) {
              ctx.globalAlpha = (1 - wt) * masterAlpha * 0.95;
              ctx.strokeStyle = w === 0 ? '#ffffff' : '#fbbf24';
              ctx.lineWidth = (5.5 - w * 1.5) * (1 - wt * 0.65);
              ctx.shadowColor = '#fde047';
              ctx.shadowBlur = 22;
              ctx.beginPath();
              ctx.arc(targetX, targetY, 18 + easeOutCubic(wt) * cardW * 1.55, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
          ctx.restore();
        }

        // E) Moldura luminosa pulsante ao redor da carta ressuscitada + Halo Celestial no topo
        ctx.save();
        ctx.globalAlpha = masterAlpha;
        const pulseGlow = 1 + 0.08 * Math.sin(timeSec * 12);
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 4 * pulseGlow;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 26;
        ctx.beginPath();
        ctx.roundRect(targetX - cardW / 2 - 5, targetY - cardH / 2 - 5, cardW + 10, cardH + 10, 14);
        ctx.stroke();

        // Halo Celestial flutuando acima do topo da carta
        const haloY = targetY - cardH / 2 - 15 - Math.sin(timeSec * 5) * 3;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#fde047';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.ellipse(targetX, haloY, cardW * 0.36 * sealT, 8.5 * sealT, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // F) Penas celestiais, estrelas de 4 pontas e centelhas douradas ascendendo
        ctx.save();
        ctx.globalAlpha = masterAlpha;
        for (let i = 0; i < 24; i++) {
          const p = particles[i % particles.length];
          const life = (progress * 1.35 + (i % 7) * 0.11) % 1;
          const spreadX = Math.cos(p.angle) * (cardW * 0.82) * (0.4 + life * 0.65);
          const swayX = Math.sin(timeSec * 4.5 + p.phase) * 10;
          const riseY = cardH * 0.45 - life * (cardH * 1.38);
          const px = targetX + spreadX + swayX;
          const py = targetY + riseY;
          const pAlpha = Math.sin(life * Math.PI) * masterAlpha;
          if (pAlpha <= 0.02) continue;

          ctx.globalAlpha = pAlpha;
          if (i % 3 === 0) {
            // Pena angelical estilizada flutuando
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(Math.sin(timeSec * 3.5 + p.phase) * 0.55 - 0.3);
            ctx.fillStyle = i % 6 === 0 ? '#ffffff' : '#fef08a';
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.ellipse(0, 0, 8.5, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          } else if (i % 3 === 1) {
            drawFourPointStar(px, py, 6 + (i % 4) * 2.2, '#fef08a', timeSec * 5 + p.phase);
          } else {
            ctx.fillStyle = '#fde047';
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(px, py, 2.2 + (i % 3), 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();

        // G) Banner Majestoso de Ressurreição
        drawBadge(
          targetX,
          targetY - cardH / 2 - 36,
          evt.labelOverride || '🪽✨ RESSURREIÇÃO! ATRIBUTOS RESTAURADOS',
          '#fde047',
          '#fef9c3',
          masterAlpha
        );
      }

      // Fallback estilizado para previews diretos no Modal e condições (Imunidade, Sono, Atordoamento, Silêncio, Bravura, Enfrentar, Furtividade, Etéreo, Obliterar, Ataque-Duplo, Passivas)
      else {
        const meta: Record<string, { badge: string; color: string; glow: string }> = {
          imunidade: { badge: '🌟 IMUNIDADE TOTAL', color: '#fde047', glow: 'rgba(251, 191, 36, 0.6)' },
          ressurreicao: { badge: '🕊️ RESSURREIÇÃO DIVINA', color: '#fcd34d', glow: 'rgba(245, 158, 11, 0.65)' },
          sono: { badge: '💤 SONO LUNAR (IMÓVEL)', color: '#a5b4fc', glow: 'rgba(99, 102, 241, 0.6)' },
          atordoamento: { badge: '💫 ATORDOADO (IMÓVEL)', color: '#e2e8f0', glow: 'rgba(226, 232, 240, 0.55)' },
          silencio: { badge: '🔇 SILENCIADO', color: '#fb7185', glow: 'rgba(244, 63, 94, 0.65)' },
          bravura: { badge: '🎺 BRAVURA', color: '#fb923c', glow: 'rgba(249, 115, 22, 0.65)' },
          enfrentar: { badge: '🗡️ ENFRENTAR RECEBIDO!', color: '#f97316', glow: 'rgba(249, 115, 22, 0.7)' },
          furtividade: { badge: '👤 FURTIVIDADE', color: '#c084fc', glow: 'rgba(168, 85, 247, 0.65)' },
          etereo: { badge: '✨🌌 ETÉREO', color: '#22d3ee', glow: 'rgba(34, 211, 238, 0.65)' },
          obliteracao: { badge: '🕳️ OBLITERAÇÃO TOTAL', color: '#a855f7', glow: 'rgba(147, 51, 234, 0.7)' },
          executar: { badge: '💀 EXECUTAR!', color: '#ef4444', glow: 'rgba(220, 38, 38, 0.8)' },
          ataque_duplo: { badge: '⚔️ ATAQUE-DUPLO (60%)', color: '#34d399', glow: 'rgba(52, 211, 153, 0.65)' },
          capturar: { badge: '⛓️ CAPTURAR!', color: '#7dd3fc', glow: 'rgba(56, 189, 248, 0.7)' },
          retorno: { badge: '🕊️ RETORNO DA CRIPTA!', color: '#7dd3fc', glow: 'rgba(56, 189, 248, 0.7)' },
          alianca_angiris: { badge: '👼 PASSIVA: ALIANÇA ANGIRIS', color: '#fbbf24', glow: 'rgba(251, 191, 36, 0.75)' },
          irmaos: { badge: '👥 PASSIVA: IRMÃOS', color: '#fbbf24', glow: 'rgba(251, 191, 36, 0.75)' },
          corte_das_fadas: { badge: '🧚 PASSIVA: CORTE DAS FADAS', color: '#f472b6', glow: 'rgba(244, 114, 182, 0.8)' },
        };
        const m = meta[cond] || { badge: cond.toUpperCase(), color: '#fbbf24', glow: 'rgba(251,191,36,0.5)' };
        ctx.save();
        ctx.globalAlpha = masterAlpha;
        const rad = ctx.createRadialGradient(targetX, targetY, 8, targetX, targetY, cardW * 1.1);
        rad.addColorStop(0, m.glow);
        rad.addColorStop(1, 'transparent');
        ctx.fillStyle = rad;
        ctx.beginPath();
        ctx.arc(targetX, targetY, cardW * 1.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = m.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = m.color;
        ctx.shadowBlur = 22;
        ctx.beginPath();
        ctx.roundRect(targetX - cardW / 2 - 4, targetY - cardH / 2 - 4, cardW + 8, cardH + 8, 12);
        ctx.stroke();

        for (let i = 0; i < 6; i++) {
          const a = timeSec * 4 + (i * Math.PI) / 3;
          drawFourPointStar(
            targetX + Math.cos(a) * (cardW * 0.56),
            targetY + Math.sin(a) * (cardH * 0.48),
            10,
            m.color,
            timeSec * 6
          );
        }
        ctx.restore();
        drawBadge(targetX, targetY - cardH / 2 - 24, evt.labelOverride || m.badge, m.color, '#ffffff', masterAlpha);
      }
    };

    const animate = (now: number) => {
      if (completed) return;
      const elapsed = Math.max(0, now - startTime);
      const progress = Math.max(0, Math.min(1, elapsed / durationMs));
      const timeSec = elapsed * 0.001;
      const masterAlpha = Math.max(
        0,
        Math.min(
          1,
          progress < 0.1
            ? progress / 0.1
            : progress > 0.82
            ? (1 - progress) / 0.18
            : 1
        )
      );

      ctx.clearRect(0, 0, width, height);

      try {
        for (const item of resolvedTargets) {
          renderCondition(item, progress, timeSec, masterAlpha);
        }
      } catch (err) {
        console.error('Erro na animação de condição:', err);
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        finish();
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      completed = true;
      window.clearTimeout(safetyTimer);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [batchKey, isOff, isStatic]);

  if (activeEvents.length === 0 || isOff) return null;

  if (isStatic) {
    return (
      <div className="fixed inset-x-0 top-[14%] z-[96] pointer-events-none flex flex-wrap items-center justify-center gap-2 px-4 select-none">
        {activeEvents.slice(0, 4).map((ev) => {
          const info = STATIC_CONDITION_LABELS[ev.condition] || {
            icon: '✨',
            label: ev.condition,
            colorClass: 'border-amber-400 text-amber-200',
          };
          return (
            <div
              key={ev.id}
              className={`px-3 py-1.5 rounded-xl bg-stone-950/95 border-2 shadow-xl flex items-center gap-1.5 text-[11px] font-serif font-black uppercase tracking-wider ${info.colorClass}`}
            >
              <span>{info.icon}</span>
              <span>{ev.labelOverride || info.label}</span>
              {ev.targetUnitName && (
                <span className="font-mono font-bold text-stone-300 normal-case">
                  · {ev.targetUnitName}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-[96] overflow-hidden select-none">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};
