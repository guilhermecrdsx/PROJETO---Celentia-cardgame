import React, { useEffect, useRef } from 'react';
import { ElementType } from '../types/game';
import { useVisualPreferences } from '../utils/visualTheme';

export interface ElementalVfxBurst {
  id: string;
  element: ElementType;
  cardName: string;
  type: 'summon' | 'power';
  position?: 'player' | 'opponent' | 'center';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape: 'circle' | 'spark' | 'shard' | 'ring' | 'leaf' | 'lightning' | 'rune';
  rotation: number;
  rotationSpeed: number;
}

interface ElementalParticleCanvasProps {
  burst: ElementalVfxBurst | null;
  onComplete?: () => void;
}

// Configurações visuais e físicas específicas de cada elemento
const ELEMENT_VFX_CONFIG: Record<
  ElementType,
  {
    primary: string;
    secondary: string;
    tertiary: string;
    glow: string;
    shapes: Particle['shape'][];
    particleCount: number;
    speed: number;
    decay: number;
    titleIcon: string;
    label: string;
  }
> = {
  Fogo: {
    primary: '#ff4500',
    secondary: '#ffaa00',
    tertiary: '#ffdd55',
    glow: 'rgba(255, 69, 0, 0.7)',
    shapes: ['spark', 'circle', 'shard'],
    particleCount: 50,
    speed: 6.5,
    decay: 0.022,
    titleIcon: '🔥',
    label: 'Fogo',
  },
  Gelo: {
    primary: '#38bdf8',
    secondary: '#7dd3fc',
    tertiary: '#ffffff',
    glow: 'rgba(56, 189, 248, 0.75)',
    shapes: ['shard', 'spark', 'ring'],
    particleCount: 48,
    speed: 5.5,
    decay: 0.02,
    titleIcon: '❄️',
    label: 'Gelo',
  },
  Divino: {
    primary: '#fbbf24',
    secondary: '#fde68a',
    tertiary: '#fffbeb',
    glow: 'rgba(251, 191, 36, 0.85)',
    shapes: ['spark', 'ring', 'rune'],
    particleCount: 54,
    speed: 6.2,
    decay: 0.019,
    titleIcon: '⚜️',
    label: 'Divino',
  },
  Sombrio: {
    primary: '#a855f7',
    secondary: '#e879f9',
    tertiary: '#84cc16',
    glow: 'rgba(168, 85, 247, 0.85)',
    shapes: ['shard', 'ring', 'rune'],
    particleCount: 54,
    speed: 6.4,
    decay: 0.02,
    titleIcon: '🌑',
    label: 'Sombrio',
  },
  Telúrico: {
    primary: '#10b981',
    secondary: '#34d399',
    tertiary: '#a7f3d0',
    glow: 'rgba(16, 185, 129, 0.7)',
    shapes: ['leaf', 'circle', 'shard'],
    particleCount: 45,
    speed: 5.0,
    decay: 0.02,
    titleIcon: '🌿',
    label: 'Telúrico',
  },
  Terra: {
    primary: '#d97706',
    secondary: '#b45309',
    tertiary: '#fcd34d',
    glow: 'rgba(217, 119, 6, 0.7)',
    shapes: ['shard', 'circle'],
    particleCount: 45,
    speed: 5.0,
    decay: 0.02,
    titleIcon: '⛰️',
    label: 'Terra',
  },
  Elétrico: {
    primary: '#facc15',
    secondary: '#eab308',
    tertiary: '#ffffff',
    glow: 'rgba(250, 204, 21, 0.85)',
    shapes: ['lightning', 'spark'],
    particleCount: 52,
    speed: 8.5,
    decay: 0.028,
    titleIcon: '⚡',
    label: 'Elétrico',
  },
  Água: {
    primary: '#0284c7',
    secondary: '#38bdf8',
    tertiary: '#e0f2fe',
    glow: 'rgba(2, 132, 199, 0.7)',
    shapes: ['circle', 'ring'],
    particleCount: 45,
    speed: 5.2,
    decay: 0.02,
    titleIcon: '💧',
    label: 'Água',
  },
  Mágico: {
    primary: '#a855f7',
    secondary: '#c084fc',
    tertiary: '#f472b6',
    glow: 'rgba(168, 85, 247, 0.75)',
    shapes: ['rune', 'spark', 'ring'],
    particleCount: 50,
    speed: 5.8,
    decay: 0.02,
    titleIcon: '✨',
    label: 'Mágico',
  },
  Cósmico: {
    primary: '#818cf8',
    secondary: '#c084fc',
    tertiary: '#38bdf8',
    glow: 'rgba(129, 140, 248, 0.85)',
    shapes: ['ring', 'spark', 'rune'],
    particleCount: 55,
    speed: 6.0,
    decay: 0.018,
    titleIcon: '🌌',
    label: 'Cósmico',
  },
  Neutro: {
    primary: '#e2e8f0',
    secondary: '#94a3b8',
    tertiary: '#f1f5f9',
    glow: 'rgba(226, 232, 240, 0.65)',
    shapes: ['shard', 'spark'],
    particleCount: 42,
    speed: 5.0,
    decay: 0.022,
    titleIcon: '⚔️',
    label: 'Neutro',
  },
  Nenhum: {
    primary: '#c084fc',
    secondary: '#e879f9',
    tertiary: '#ffffff',
    glow: 'rgba(192, 132, 252, 0.7)',
    shapes: ['spark', 'ring'],
    particleCount: 40,
    speed: 5.5,
    decay: 0.022,
    titleIcon: '📜',
    label: 'Habilidade',
  },
};

export const ElementalParticleCanvas: React.FC<ElementalParticleCanvasProps> = ({
  burst,
  onComplete,
}) => {
  const { animationMode, elementalParticles } = useVisualPreferences();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const isOff = animationMode === 'off' || !elementalParticles;
  const isStatic = !isOff && animationMode === 'static';

  useEffect(() => {
    if (!burst?.id) return;

    if (isOff) {
      const t = window.setTimeout(() => onCompleteRef.current?.(), 30);
      return () => window.clearTimeout(t);
    }

    if (isStatic) {
      const t = window.setTimeout(() => onCompleteRef.current?.(), 580);
      return () => window.clearTimeout(t);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Redimensionamento de alta definição para telas retina
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const config = ELEMENT_VFX_CONFIG[burst.element] || ELEMENT_VFX_CONFIG.Neutro;

    // Posição central da explosão de partículas
    let originX = width / 2;
    let originY = height / 2;

    if (burst.position === 'player') {
      originY = height * 0.62;
    } else if (burst.position === 'opponent') {
      originY = height * 0.32;
    }

    // Gerar conjunto de partículas
    const particles: Particle[] = [];
    const colors = [config.primary, config.secondary, config.tertiary];

    for (let i = 0; i < config.particleCount; i++) {
      const angle = (Math.PI * 2 * i) / config.particleCount + (Math.random() - 0.5) * 0.5;
      const speed = (0.3 + Math.random() * 0.9) * config.speed;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const shape = config.shapes[Math.floor(Math.random() * config.shapes.length)];

      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 6 + 3,
        color,
        alpha: 1.0,
        life: 1.0,
        maxLife: 1.0,
        shape,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
      });
    }

    // Onda de choque circular (Ring Shockwave)
    let shockwaveRadius = 10;
    let shockwaveAlpha = 0.85;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Renderizar onda de choque em expansão
      if (shockwaveAlpha > 0.02) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(originX, originY, shockwaveRadius, 0, Math.PI * 2);
        ctx.strokeStyle = config.primary;
        ctx.globalAlpha = shockwaveAlpha;
        ctx.lineWidth = Math.max(1, 4 * shockwaveAlpha);
        ctx.shadowColor = config.primary;
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.restore();

        shockwaveRadius += 7.5;
        shockwaveAlpha -= 0.035;
      }

      // Renderizar partículas
      let activeCount = 0;

      for (const p of particles) {
        if (p.alpha <= 0.01) continue;
        activeCount++;

        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.life -= config.decay;
        p.alpha = Math.max(0, p.life);

        // Físicas específicas
        if (burst.element === 'Fogo') {
          p.vy -= 0.08; // Chamas sobem
        } else if (burst.element === 'Telúrico' || burst.element === 'Terra') {
          p.vy += 0.07; // Folhas/pedras caem levemente com gravidade
        } else if (burst.element === 'Água') {
          p.vy += 0.05;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = config.primary;
        ctx.shadowBlur = 10;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'spark') {
          // Estrela pontiaguda de 4 pontas
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 1.5);
          ctx.lineTo(p.size * 0.4, 0);
          ctx.lineTo(0, p.size * 1.5);
          ctx.lineTo(-p.size * 0.4, 0);
          ctx.closePath();
          ctx.fill();
        } else if (p.shape === 'shard') {
          // Fragmento de cristal/gelo
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 1.4);
          ctx.lineTo(p.size * 0.8, p.size * 0.8);
          ctx.lineTo(-p.size * 0.8, p.size * 0.8);
          ctx.closePath();
          ctx.fill();
        } else if (p.shape === 'ring') {
          // Anel cósmico/mágico
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (p.shape === 'leaf') {
          // Folha telúrica
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 1.4, p.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'lightning') {
          // Raio elétrico zigue-zague
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 1.5);
          ctx.lineTo(p.size * 0.6, -p.size * 0.3);
          ctx.lineTo(-p.size * 0.2, 0);
          ctx.lineTo(p.size * 0.5, p.size * 1.5);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (p.shape === 'rune') {
          // Diamante arcano/mágico
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size, 0);
          ctx.lineTo(0, p.size);
          ctx.lineTo(-p.size, 0);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      }

      if (activeCount > 0 || shockwaveAlpha > 0.02) {
        animFrameRef.current = requestAnimationFrame(render);
      } else {
        if (onCompleteRef.current) onCompleteRef.current();
      }
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [burst?.id, isOff, isStatic]);

  if (!burst || isOff) return null;

  const config = ELEMENT_VFX_CONFIG[burst.element] || ELEMENT_VFX_CONFIG.Neutro;

  return (
    <div
      className="fixed inset-0 z-[85] pointer-events-none overflow-hidden"
      style={{ zIndex: 85 }}
    >
      {/* Canvas com aceleração GPU apenas no modo completo */}
      {!isStatic && <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />}

      {/* Distintivo de Elemento Flutuante com Nome da Carta e Efeito */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none ${
          isStatic ? '' : 'animate-in zoom-in-75 fade-in duration-200'
        }`}
        style={{
          marginTop: burst.position === 'player' ? '100px' : burst.position === 'opponent' ? '-110px' : '0px',
        }}
      >
        <div
          className="px-4 py-1.5 rounded-full border shadow-xl flex items-center gap-2"
          style={{
            backgroundColor: 'rgba(15, 12, 25, 0.92)',
            borderColor: config.primary,
            boxShadow: isStatic
              ? `0 4px 16px rgba(0,0,0,0.75)`
              : `0 0 25px ${config.glow}, inset 0 0 15px ${config.glow}`,
          }}
        >
          <span className="text-base select-none">{config.titleIcon}</span>
          <span
            className="text-xs font-serif font-black uppercase tracking-widest select-none"
            style={{ color: config.tertiary }}
          >
            {burst.type === 'summon' ? 'Invocação' : 'Poder Ativado'} · {config.label}
          </span>
          <span className="text-[11px] font-sans font-bold text-white select-none">
            [{burst.cardName}]
          </span>
        </div>
      </div>
    </div>
  );
};
