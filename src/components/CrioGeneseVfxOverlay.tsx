import React, { useEffect, useRef } from 'react';
import { Snowflake } from 'lucide-react';
import { sound } from '../services/soundEffects';
import { useVisualPreferences } from '../utils/visualTheme';

export interface CrioGeneseVfxState {
  id: string;
  targetSide: 'opponent' | 'player' | 'center';
  enemyUnitCount?: number;
  targetLabel?: string;
}

interface CrioGeneseVfxOverlayProps {
  vfx: CrioGeneseVfxState | null;
  onComplete?: () => void;
}

interface VortexParticle {
  angle: number;
  angularSpeed: number;
  heightRatio: number; // 0 (base) to 1 (top of funnel)
  verticalSpeed: number;
  radiusOffset: number;
  size: number;
  type: 'shard' | 'snowflake' | 'mist' | 'spark';
  color: string;
  rotation: number;
  rotationSpeed: number;
  alpha: number;
}

interface ShatterParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  vRot: number;
  alpha: number;
  color: string;
  isSnowflake: boolean;
}

interface IceSpireCluster {
  x: number;
  y: number;
  triggerProgress: number;
  activated: boolean;
  scale: number;
  alpha: number;
  spikes: { angle: number; height: number; width: number; color: string }[];
}

export const CrioGeneseVfxOverlay: React.FC<CrioGeneseVfxOverlayProps> = ({
  vfx,
  onComplete,
}) => {
  const { animationMode, skillAndUnitVfx } = useVisualPreferences();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const isOff = animationMode === 'off' || !skillAndUnitVfx;
  const isStatic = !isOff && animationMode === 'static';

  useEffect(() => {
    if (!vfx?.id) return;

    const totalDurationMs = isOff ? 45 : isStatic ? 750 : 2600;
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
    const safetyTimer = window.setTimeout(finish, isOff ? 45 : isStatic ? 750 : totalDurationMs + 250);

    try {
      sound.playCrioGenese();
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

    // Determina a linha horizontal das unidades inimigas atingidas
    const targetY =
      vfx.targetSide === 'opponent'
        ? height * 0.30
        : vfx.targetSide === 'player'
        ? height * 0.68
        : height * 0.50;

    const funnelHeight = Math.min(height * 0.52, 420);
    const baseRadius = 30;
    const topRadius = 165;

    // 1. Criar partículas orbitando em 3D dentro e ao redor do Tornado de Gelo
    const vortexParticles: VortexParticle[] = [];
    const palette = ['#ffffff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0284c7'];

    for (let i = 0; i < 210; i++) {
      const types: VortexParticle['type'][] = ['shard', 'snowflake', 'mist', 'spark'];
      const type = types[i % 4 === 0 ? 1 : i % 3 === 0 ? 0 : i % 5 === 0 ? 2 : 3];
      vortexParticles.push({
        angle: Math.random() * Math.PI * 2,
        angularSpeed: 0.12 + Math.random() * 0.15,
        heightRatio: Math.random(),
        verticalSpeed: 0.013 + Math.random() * 0.02,
        radiusOffset: (Math.random() - 0.5) * 38,
        size:
          type === 'mist'
            ? 26 + Math.random() * 28
            : type === 'snowflake'
            ? 7 + Math.random() * 8
            : 5 + Math.random() * 7,
        type,
        color: palette[Math.floor(Math.random() * palette.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        alpha: type === 'mist' ? 0.22 + Math.random() * 0.16 : 0.82 + Math.random() * 0.18,
      });
    }

    // 2. Criar pontos de impacto de Estalagmites de Gelo ao longo da fileira inimiga
    const slotCount = Math.max(3, Math.min(6, vfx.enemyUnitCount || 5));
    const rowSpan = Math.min(width * 0.66, 780);
    const startX = width / 2 - rowSpan / 2;
    const endX = width / 2 + rowSpan / 2;

    const spireClusters: IceSpireCluster[] = [];
    for (let i = 0; i < slotCount; i++) {
      const frac = slotCount === 1 ? 0.5 : i / (slotCount - 1);
      const sx = startX + frac * rowSpan;
      const spikes = [
        { angle: -0.40, height: 64 + Math.random() * 18, width: 18, color: '#38bdf8' },
        { angle: -0.18, height: 92 + Math.random() * 22, width: 24, color: '#7dd3fc' },
        { angle: 0.0, height: 118 + Math.random() * 26, width: 28, color: '#e0f2fe' },
        { angle: 0.18, height: 88 + Math.random() * 20, width: 22, color: '#38bdf8' },
        { angle: 0.40, height: 60 + Math.random() * 16, width: 17, color: '#0284c7' },
      ];
      spireClusters.push({
        x: sx,
        y: targetY + 36,
        triggerProgress: 0.10 + frac * 0.52,
        activated: false,
        scale: 0,
        alpha: 1,
        spikes,
      });
    }

    // 3. Partículas de explosão/estilhaços quando o tornado congela cada unidade e no clímax
    const shatterParticles: ShatterParticle[] = [];
    const spawnShatterBurst = (bx: number, by: number, count: number, speedMult = 1) => {
      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
        const spd = (3.0 + Math.random() * 8.0) * speedMult;
        shatterParticles.push({
          x: bx,
          y: by,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 1.8,
          size: 5 + Math.random() * 8,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.24,
          alpha: 1,
          color: palette[Math.floor(Math.random() * palette.length)],
          isSnowflake: i % 3 === 0,
        });
      }
    };

    const drawSnowflake = (radius: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        ctx.moveTo(0, 0);
        ctx.lineTo(cos * radius, sin * radius);
        const bLen = radius * 0.44;
        const bx = cos * (radius * 0.58);
        const by = sin * (radius * 0.58);
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(a + 0.55) * bLen, by + Math.sin(a + 0.55) * bLen);
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(a - 0.55) * bLen, by + Math.sin(a - 0.55) * bLen);
      }
      ctx.stroke();
    };

    const drawIceShard = (size: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -size * 1.7);
      ctx.lineTo(size * 0.78, -size * 0.15);
      ctx.lineTo(0, size * 1.5);
      ctx.lineTo(-size * 0.78, -size * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.9;
      ctx.stroke();
    };

    const startTime = performance.now();
    let novaTriggered = false;
    let novaRadius = 15;
    let novaAlpha = 0;

    const animate = (now: number) => {
      if (completed) return;
      const elapsed = Math.max(0, now - startTime);
      const progress = Math.max(0, Math.min(1, elapsed / totalDurationMs));
      const timeSec = elapsed * 0.001;

      ctx.clearRect(0, 0, width, height);

      // Envelope de opacidade global do tornado
      const masterAlpha = Math.max(
        0,
        Math.min(
          1,
          progress < 0.08
            ? progress / 0.08
            : progress > 0.84
            ? (1 - progress) / 0.16
            : 1
        )
      );

      try {

      // Posição horizontal do Tornado:
      // 0.00 -> 0.66: Varre da esquerda até a direita atingindo todas as unidades inimigas
      // 0.66 -> 1.00: Converge para o centro da fileira inimiga e explode em Supernova Glacial
      let tornadoBaseX = width / 2;
      if (progress < 0.66) {
        const sweepT = progress / 0.66;
        const eased = sweepT < 0.5 ? 2 * sweepT * sweepT : 1 - Math.pow(-2 * sweepT + 2, 2) / 2;
        tornadoBaseX = startX - 35 + eased * (rowSpan + 70);
      } else {
        const returnT = Math.min(1, (progress - 0.66) / 0.14);
        tornadoBaseX = (endX + 35) * (1 - returnT) + (width / 2) * returnT;
      }

      const tornadoBaseY = targetY + 46;

      // Disparar Supernova Glacial no clímax
      if (progress >= 0.70 && !novaTriggered) {
        novaTriggered = true;
        novaAlpha = 1.0;
        spawnShatterBurst(width / 2, targetY, 65, 1.55);
      }

      // ==============================================================
      // CAMADA A: FAIXA CONGELANTE SOBRE A MESA INIMIGA & NEVASCA
      // ==============================================================
      ctx.save();
      const rowGlow = ctx.createLinearGradient(0, targetY - 140, 0, targetY + 110);
      rowGlow.addColorStop(0, 'transparent');
      rowGlow.addColorStop(0.5, `rgba(2, 132, 199, ${0.32 * masterAlpha})`);
      rowGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = rowGlow;
      ctx.fillRect(0, targetY - 140, width, 250);

      // Linhas de vento cortante da nevasca
      ctx.globalAlpha = masterAlpha * 0.45;
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 1.8;
      for (let wLine = 0; wLine < 22; wLine++) {
        const wx = ((wLine * 137 + timeSec * 1550) % (width + 320)) - 160;
        const wy = targetY - 180 + ((wLine * 53) % 300);
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.lineTo(wx + 110, wy + 20);
        ctx.stroke();
      }
      ctx.restore();

      // ==============================================================
      // CAMADA B: TRILHA DE ESTALAGMITES DE GELO NAS UNIDADES INIMIGAS
      // ==============================================================
      for (const cluster of spireClusters) {
        if (!cluster.activated && progress >= cluster.triggerProgress) {
          cluster.activated = true;
          spawnShatterBurst(cluster.x, cluster.y - 38, 26, 1.05);
        }
        if (cluster.activated) {
          cluster.scale = Math.min(1, cluster.scale + 0.15);
          const fadeOut = progress > 0.84 ? Math.max(0, (1 - progress) / 0.16) : 1;

          ctx.save();
          ctx.translate(cluster.x, cluster.y);
          ctx.scale(cluster.scale, cluster.scale);
          ctx.globalAlpha = fadeOut;

          // Brilho de gelo no chão da unidade
          const floorGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 70);
          floorGrad.addColorStop(0, 'rgba(56, 189, 248, 0.85)');
          floorGrad.addColorStop(0.6, 'rgba(2, 132, 199, 0.45)');
          floorGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = floorGrad;
          ctx.beginPath();
          ctx.ellipse(0, 0, 70, 22, 0, 0, Math.PI * 2);
          ctx.fill();

          // Círculo Rúnico de Congelamento sob a unidade
          ctx.strokeStyle = '#bae6fd';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(0, 0, 52, 15, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Estalagmites de Cristal de Gelo brotando na posição da unidade
          for (const sp of cluster.spikes) {
            ctx.save();
            ctx.rotate(sp.angle);
            const spGrad = ctx.createLinearGradient(0, 0, 0, -sp.height);
            spGrad.addColorStop(0, 'rgba(3, 105, 161, 0.95)');
            spGrad.addColorStop(0.55, sp.color);
            spGrad.addColorStop(1, '#ffffff');

            ctx.fillStyle = spGrad;
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.moveTo(-sp.width / 2, 0);
            ctx.lineTo(0, -sp.height);
            ctx.lineTo(sp.width / 2, 0);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -sp.height);
            ctx.stroke();
            ctx.restore();
          }

          // Indicador flutuante "-3 ❄️ CONGELADO" com fundo escuro para leitura imediata
          const floatOffset = Math.min(30, cluster.scale * 26);
          const tagY = -124 - floatOffset * 0.4;
          ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(-68, tagY - 15, 136, 24, 8);
          ctx.fill();
          ctx.stroke();

          ctx.font = '900 12px Cinzel, serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#e0f2fe';
          ctx.fillText('❄️ -3 · CONGELADO', 0, tagY + 1);

          ctx.restore();
        }
      }

      // ==============================================================
      // CAMADA C: CORPO VOLUMÉTRICO & FUNIL DO TORNADO DE GELO 3D
      // ==============================================================
      // C1. Sombra Volumétrica Interna do Funil (garante alto contraste sobre qualquer carta/mesa)
      ctx.save();
      const bodySteps = 32;
      for (let i = 0; i < bodySteps; i++) {
        const hRatio = i / (bodySteps - 1);
        const swayX =
          Math.sin(timeSec * 9.5 - hRatio * 5.2) * (14 + hRatio * 28) +
          Math.cos(timeSec * 5.5 + hRatio * 3.1) * 9;
        const cx = tornadoBaseX + swayX;
        const cy = tornadoBaseY - hRatio * funnelHeight;
        const r = baseRadius + Math.pow(hRatio, 1.25) * (topRadius - baseRadius);

        const darkGrad = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 1.15);
        darkGrad.addColorStop(0, `rgba(3, 105, 161, ${0.28 * masterAlpha})`);
        darkGrad.addColorStop(0.65, `rgba(12, 74, 110, ${0.18 * masterAlpha})`);
        darkGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = darkGrad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r * 1.15, r * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // C2. Anéis Elípticos Luminosos & Espirais Helicoidais do Tornado
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      const ringCount = 56;
      for (let i = 0; i < ringCount; i++) {
        const hRatio = i / (ringCount - 1);
        const swayX =
          Math.sin(timeSec * 9.5 - hRatio * 5.2) * (14 + hRatio * 28) +
          Math.cos(timeSec * 5.5 + hRatio * 3.1) * 9;
        const ringCenterX = tornadoBaseX + swayX;
        const ringCenterY = tornadoBaseY - hRatio * funnelHeight;

        const currentRadius =
          baseRadius + Math.pow(hRatio, 1.25) * (topRadius - baseRadius);
        const ellipseRy = currentRadius * 0.29;
        const ringAngle = timeSec * (15 - hRatio * 4) + i * 0.45;

        ctx.save();
        ctx.translate(ringCenterX, ringCenterY);

        // Brilho central do anel
        const coreGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, currentRadius * 1.12);
        coreGrad.addColorStop(0, `rgba(224, 242, 254, ${0.18 * masterAlpha})`);
        coreGrad.addColorStop(0.5, `rgba(56, 189, 248, ${0.11 * masterAlpha})`);
        coreGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, currentRadius * 1.12, ellipseRy * 1.28, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2 Arcos de Vento Glacial por nível do tornado
        for (let arcIdx = 0; arcIdx < 2; arcIdx++) {
          const startAng = ringAngle + arcIdx * Math.PI;
          const endAng = startAng + Math.PI * 0.72;

          ctx.beginPath();
          ctx.ellipse(0, 0, currentRadius, ellipseRy, 0, startAng, endAng);
          ctx.strokeStyle =
            i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? '#7dd3fc' : '#38bdf8';
          ctx.globalAlpha = masterAlpha * (0.34 + (1 - Math.abs(hRatio - 0.5)) * 0.46);
          ctx.lineWidth = 2.0 + (1 - hRatio) * 2.4;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 14;
          ctx.stroke();
        }

        ctx.restore();
      }

      // Fitas Helicoidais Triplas subindo pelo Tornado
      for (let strand = 0; strand < 3; strand++) {
        ctx.beginPath();
        const steps = 64;
        for (let s = 0; s <= steps; s++) {
          const hr = s / steps;
          const swayX =
            Math.sin(timeSec * 9.5 - hr * 5.2) * (14 + hr * 28) +
            Math.cos(timeSec * 5.5 + hr * 3.1) * 9;
          const r = baseRadius + Math.pow(hr, 1.25) * (topRadius - baseRadius);
          const theta = hr * Math.PI * 8.0 - timeSec * 16 + (strand * Math.PI * 2) / 3;
          const px = tornadoBaseX + swayX + Math.cos(theta) * r;
          const py = tornadoBaseY - hr * funnelHeight + Math.sin(theta) * (r * 0.27);
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = strand === 0 ? '#ffffff' : strand === 1 ? '#7dd3fc' : '#38bdf8';
        ctx.globalAlpha = masterAlpha * 0.72;
        ctx.lineWidth = 3.2;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 20;
        ctx.stroke();
      }

      ctx.restore();

      // ==============================================================
      // CAMADA D: PARTÍCULAS 3D ORBITANDO NO VÓRTICE (CRISTAIS E FLOCOS)
      // ==============================================================
      for (const vp of vortexParticles) {
        vp.angle += vp.angularSpeed;
        vp.heightRatio += vp.verticalSpeed;
        if (vp.heightRatio > 1) {
          vp.heightRatio -= 1;
        }
        vp.rotation += vp.rotationSpeed;

        const hr = vp.heightRatio;
        const swayX =
          Math.sin(timeSec * 9.5 - hr * 5.2) * (14 + hr * 28) +
          Math.cos(timeSec * 5.5 + hr * 3.1) * 9;
        const funnelR =
          baseRadius + Math.pow(hr, 1.25) * (topRadius - baseRadius) + vp.radiusOffset;

        const px = tornadoBaseX + swayX + Math.cos(vp.angle) * funnelR;
        const py =
          tornadoBaseY - hr * funnelHeight + Math.sin(vp.angle) * (funnelR * 0.28);

        const depthScale = 0.75 + (Math.sin(vp.angle) + 1) * 0.30;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(vp.rotation);
        ctx.scale(depthScale, depthScale);
        ctx.globalAlpha = vp.alpha * masterAlpha;

        if (vp.type === 'snowflake') {
          ctx.shadowColor = '#7dd3fc';
          ctx.shadowBlur = 10;
          drawSnowflake(vp.size, vp.color);
        } else if (vp.type === 'shard') {
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 12;
          drawIceShard(vp.size, vp.color);
        } else if (vp.type === 'mist') {
          const mistGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, vp.size);
          mistGrad.addColorStop(0, 'rgba(186, 230, 253, 0.55)');
          mistGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = mistGrad;
          ctx.beginPath();
          ctx.arc(0, 0, vp.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = vp.color;
          ctx.beginPath();
          ctx.moveTo(0, -vp.size * 1.6);
          ctx.lineTo(vp.size * 0.45, 0);
          ctx.lineTo(0, vp.size * 1.6);
          ctx.lineTo(-vp.size * 0.45, 0);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      }

      // ==============================================================
      // CAMADA E: SUPERNOVA GLACIAL & ONDA DE CHOQUE DE CONGELAMENTO
      // ==============================================================
      if (novaTriggered && novaAlpha > 0.01) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(width / 2, targetY, novaRadius * 1.7, novaRadius * 0.58, 0, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = novaAlpha;
        ctx.lineWidth = 6 * novaAlpha;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 28;
        ctx.stroke();
        ctx.restore();

        novaRadius += 15;
        novaAlpha *= 0.92;
      }

      // Renderizar estilhaços de impacto
      for (const sp of shatterParticles) {
        if (sp.alpha <= 0.02) continue;
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vy += 0.12;
        sp.rotation += sp.vRot;
        sp.alpha -= 0.022;

        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.rotate(sp.rotation);
        ctx.globalAlpha = Math.max(0, sp.alpha);
        if (sp.isSnowflake) {
          drawSnowflake(sp.size, sp.color);
        } else {
          drawIceShard(sp.size, sp.color);
        }
        ctx.restore();
      }

      } catch (err) {
        console.error('Erro na animação Crio-Gênese:', err);
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
  }, [vfx?.id, isOff, isStatic]);

  if (!vfx || isOff) return null;

  return (
    <div
      className="fixed inset-0 z-[95] pointer-events-none overflow-hidden select-none"
      style={{ zIndex: 95 }}
    >
      {/* Vinheta de Congelamento apenas no modo completo */}
      {!isStatic && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 48%, rgba(2, 132, 199, 0.28) 80%, rgba(186, 230, 253, 0.52) 100%)',
            boxShadow: 'inset 0 0 110px rgba(56, 189, 248, 0.55)',
          }}
        />
      )}

      {/* Canvas 60fps apenas no modo completo */}
      {!isStatic && <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />}

      {/* Banner de Anúncio da Habilidade Crio-Gênese */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
        style={{
          top: vfx.targetSide === 'opponent' ? '10%' : vfx.targetSide === 'player' ? '46%' : '12%',
        }}
      >
        <div
          className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-slate-950/95 border-2 border-cyan-300 flex items-center gap-3 ${
            isStatic ? 'shadow-2xl' : 'shadow-[0_0_45px_rgba(56,189,248,0.9)] backdrop-blur-md'
          }`}
        >
          <div
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-500/25 border border-cyan-300/80 flex items-center justify-center ${
              isStatic ? '' : 'animate-spin-slow'
            }`}
          >
            <Snowflake size={18} className="text-cyan-100" />
          </div>
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-base font-serif font-black tracking-[0.16em] text-white uppercase">
                Crio-Gênese
              </span>
              <span className="text-cyan-400">·</span>
              <span className="text-[10px] sm:text-xs font-bold text-cyan-300 uppercase tracking-wider">
                Tornado de Gelo
              </span>
            </div>
            <span className="text-[10px] sm:text-xs font-mono text-cyan-100">
              {vfx.targetLabel || 'Unidades Inimigas'} · -3 Dano & Congelar por 2 Rodadas
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
