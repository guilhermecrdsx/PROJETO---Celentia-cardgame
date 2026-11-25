import React, { useEffect, useRef } from 'react';
import { useVisualPreferences } from '../utils/visualTheme';

interface CosmicSkyEffectsProps {
  compact?: boolean;
}

interface GalaxyPalette {
  core: string;
  innerArm: string;
  outerArm: string;
  starTint: string;
}

const GALAXY_PALETTES: GalaxyPalette[] = [
  {
    core: 'rgba(255, 244, 214, 0.95)',
    innerArm: 'rgba(251, 191, 36, 0.52)',
    outerArm: 'rgba(139, 92, 246, 0.28)',
    starTint: '#fef08a',
  },
  {
    core: 'rgba(224, 242, 254, 0.95)',
    innerArm: 'rgba(56, 189, 248, 0.52)',
    outerArm: 'rgba(99, 102, 241, 0.28)',
    starTint: '#bae6fd',
  },
  {
    core: 'rgba(245, 208, 254, 0.92)',
    innerArm: 'rgba(192, 132, 252, 0.48)',
    outerArm: 'rgba(59, 130, 246, 0.26)',
    starTint: '#e9d5ff',
  },
  {
    core: 'rgba(254, 226, 226, 0.9)',
    innerArm: 'rgba(244, 114, 182, 0.42)',
    outerArm: 'rgba(245, 158, 11, 0.26)',
    starTint: '#fde68a',
  },
  {
    core: 'rgba(207, 250, 254, 0.94)',
    innerArm: 'rgba(45, 212, 191, 0.46)',
    outerArm: 'rgba(56, 189, 248, 0.25)',
    starTint: '#a5f3fc',
  },
];

interface GalaxyStarDot {
  armIndex: number;
  t: number; // 0..1 along arm
  jitterRadius: number;
  jitterAngle: number;
  size: number;
  alpha: number;
}

interface SpiralGalaxy {
  x: number;
  y: number;
  radius: number;
  tiltAngle: number; // orientation of ellipse
  inclination: number; // 0.36..0.76 vertical compression
  rotation: number;
  rotationSpeed: number; // rad/s
  armCount: number;
  twist: number; // total radians of spiral twist
  palette: GalaxyPalette;
  age: number;
  lifetime: number;
  peakOpacity: number;
  stars: GalaxyStarDot[];
}

interface ShootingStarSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  age: number;
  duration: number;
  colorHead: string;
  colorTail: string;
  thickness: number;
  sparks: ShootingStarSpark[];
}

interface TwinkleStar {
  xRatio: number;
  yRatio: number;
  size: number;
  baseAlpha: number;
  phase: number;
  speed: number;
  tint: string;
}

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function createSpiralGalaxy(
  width: number,
  height: number,
  existing: SpiralGalaxy[],
  initialAgeRatio?: number
): SpiralGalaxy {
  const marginX = Math.max(70, width * 0.08);
  const marginY = Math.max(60, height * 0.1);
  let x = randRange(marginX, Math.max(marginX + 10, width - marginX));
  let y = randRange(marginY, Math.max(marginY + 10, height - marginY));

  // Try a few candidate positions so galaxies spread nicely across the background
  for (let attempt = 0; attempt < 8; attempt++) {
    const cx = randRange(marginX, Math.max(marginX + 10, width - marginX));
    const cy = randRange(marginY, Math.max(marginY + 10, height - marginY));
    const tooClose = existing.some((g) => {
      const dx = g.x - cx;
      const dy = g.y - cy;
      return Math.hypot(dx, dy) < Math.min(width, height) * 0.24;
    });
    if (!tooClose) {
      x = cx;
      y = cy;
      break;
    }
  }

  const minDim = Math.min(width, height);
  const radius = randRange(Math.max(46, minDim * 0.07), Math.max(88, minDim * 0.145));
  const armCount = Math.random() < 0.7 ? 2 : 3;
  const twist = randRange(2.9, 4.3);
  const direction = Math.random() < 0.5 ? 1 : -1;
  const lifetime = randRange(10, 17);
  const age = initialAgeRatio !== undefined ? initialAgeRatio * lifetime : 0;

  const starCount = 46;
  const stars: GalaxyStarDot[] = [];
  for (let i = 0; i < starCount; i++) {
    const t = Math.pow(Math.random(), 0.78);
    stars.push({
      armIndex: i % armCount,
      t,
      jitterRadius: randRange(-0.14, 0.14) * (0.35 + t),
      jitterAngle: randRange(-0.26, 0.26) * (0.3 + t),
      size: randRange(0.75, 2.05) * (1 - t * 0.35),
      alpha: randRange(0.35, 0.95) * (1 - t * 0.45),
    });
  }

  return {
    x,
    y,
    radius,
    tiltAngle: randRange(0, Math.PI * 2),
    inclination: randRange(0.38, 0.74),
    rotation: randRange(0, Math.PI * 2),
    rotationSpeed: direction * randRange(0.14, 0.32),
    armCount,
    twist,
    palette: pickRandom(GALAXY_PALETTES),
    age,
    lifetime,
    peakOpacity: randRange(0.55, 0.85),
    stars,
  };
}

function createShootingStar(width: number, height: number): ShootingStar {
  const fromLeft = Math.random() < 0.55;
  const startX = fromLeft ? randRange(-width * 0.05, width * 0.72) : randRange(width * 0.28, width * 1.05);
  const startY = randRange(-height * 0.04, height * 0.46);

  const angleDeg = fromLeft ? randRange(18, 46) : randRange(134, 162);
  const angleRad = (angleDeg * Math.PI) / 180;
  const speed = randRange(540, 960);

  const paletteRoll = Math.random();
  let colorHead = '#fffbeb';
  let colorTail = 'rgba(253, 224, 71, 0.85)';
  if (paletteRoll < 0.38) {
    colorHead = '#f0f9ff';
    colorTail = 'rgba(56, 189, 248, 0.88)';
  } else if (paletteRoll < 0.6) {
    colorHead = '#faf5ff';
    colorTail = 'rgba(192, 132, 252, 0.82)';
  }

  return {
    x: startX,
    y: startY,
    vx: Math.cos(angleRad) * speed,
    vy: Math.sin(angleRad) * speed,
    length: randRange(110, 225),
    age: 0,
    duration: randRange(0.68, 1.25),
    colorHead,
    colorTail,
    thickness: randRange(1.4, 2.4),
    sparks: [],
  };
}

export const CosmicSkyEffects: React.FC<CosmicSkyEffectsProps> = ({ compact = false }) => {
  const { animationMode, ambientAnimations } = useVisualPreferences();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isOff = animationMode === 'off';
  const isStatic = animationMode === 'static' || !ambientAnimations;

  useEffect(() => {
    if (isOff) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    // Subtle twinkling deep-space stars
    const twinkleCount = compact ? 36 : 68;
    const starTints = ['#ffffff', '#fef3c7', '#bae6fd', '#e9d5ff'];
    const twinkleStars: TwinkleStar[] = Array.from({ length: twinkleCount }, () => ({
      xRatio: Math.random(),
      yRatio: Math.random(),
      size: randRange(0.6, 1.75),
      baseAlpha: randRange(0.18, 0.65),
      phase: randRange(0, Math.PI * 2),
      speed: randRange(0.8, 2.4),
      tint: pickRandom(starTints),
    }));

    // Staggered spiral galaxies that fade in, rotate, dissolve, and respawn randomly
    const galaxyTargetCount = compact ? 3 : 5;
    const galaxies: SpiralGalaxy[] = [];
    for (let i = 0; i < galaxyTargetCount; i++) {
      // In static mode place galaxies right at peak visibility (0.48)
      const stagger = isStatic ? 0.48 : (i / galaxyTargetCount) * 0.85;
      galaxies.push(createSpiralGalaxy(width, height, galaxies, stagger));
    }

    const shootingStars: ShootingStar[] = [];
    if (isStatic || prefersReducedMotion) {
      // Seed 2 serene frozen shooting stars for the static illustration
      for (let i = 0; i < 2; i++) {
        const m = createShootingStar(width, height);
        m.age = m.duration * 0.42;
        m.x = width * (i === 0 ? 0.28 : 0.74);
        m.y = height * (i === 0 ? 0.22 : 0.34);
        shootingStars.push(m);
      }
    }
    let nextMeteorCooldown = randRange(0.45, 1.35);

    const drawGalaxy = (g: SpiralGalaxy) => {
      const progress = Math.min(Math.max(g.age / g.lifetime, 0), 1);
      let fadeFactor = 1;
      if (progress < 0.24) {
        const t = progress / 0.24;
        fadeFactor = t * t * (3 - 2 * t);
      } else if (progress > 0.72) {
        const t = (1 - progress) / 0.28;
        fadeFactor = t * t * (3 - 2 * t);
      }

      const alpha = fadeFactor * g.peakOpacity;
      if (alpha <= 0.01) return;

      const scalePulse = 0.84 + 0.16 * Math.sin(progress * Math.PI);
      const effectiveRadius = g.radius * scalePulse;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(g.x, g.y);
      ctx.rotate(g.tiltAngle);
      ctx.scale(1, g.inclination);

      // 1. Soft outer cosmic nebula halo
      const haloGrad = ctx.createRadialGradient(0, 0, effectiveRadius * 0.04, 0, 0, effectiveRadius * 1.15);
      haloGrad.addColorStop(0, g.palette.core);
      haloGrad.addColorStop(0.28, g.palette.innerArm);
      haloGrad.addColorStop(0.65, g.palette.outerArm);
      haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(0, 0, effectiveRadius * 1.15, 0, Math.PI * 2);
      ctx.fill();

      // 2. Logarithmic luminous spiral arms
      ctx.rotate(g.rotation);
      const steps = 26;
      for (let arm = 0; arm < g.armCount; arm++) {
        const baseAngle = (arm * Math.PI * 2) / g.armCount;

        ctx.beginPath();
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const r = effectiveRadius * (0.06 + 0.94 * Math.pow(t, 0.92));
          const theta = baseAngle + t * g.twist;
          const px = Math.cos(theta) * r;
          const py = Math.sin(theta) * r;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = g.palette.outerArm;
        ctx.lineWidth = effectiveRadius * 0.18;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const r = effectiveRadius * (0.05 + 0.85 * Math.pow(t, 0.92));
          const theta = baseAngle + t * g.twist;
          const px = Math.cos(theta) * r;
          const py = Math.sin(theta) * r;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = g.palette.innerArm;
        ctx.lineWidth = effectiveRadius * 0.065;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // 3. Sparkling star-forming clusters embedded along the spiral arms
      ctx.fillStyle = g.palette.starTint;
      for (let i = 0; i < g.stars.length; i++) {
        const st = g.stars[i];
        const baseAngle = (st.armIndex * Math.PI * 2) / g.armCount;
        const r = effectiveRadius * Math.max(0.05, 0.08 + 0.9 * st.t + st.jitterRadius);
        const theta = baseAngle + st.t * g.twist + st.jitterAngle;
        const px = Math.cos(theta) * r;
        const py = Math.sin(theta) * r;
        ctx.globalAlpha = alpha * st.alpha;
        ctx.beginPath();
        ctx.arc(px, py, st.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Radiant galactic core nucleus
      ctx.globalAlpha = alpha;
      const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, effectiveRadius * 0.28);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.35, g.palette.core);
      coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, effectiveRadius * 0.28, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const drawShootingStar = (m: ShootingStar) => {
      const progress = Math.min(Math.max(m.age / m.duration, 0), 1);
      const alpha = progress < 0.15 ? progress / 0.15 : Math.pow(1 - (progress - 0.15) / 0.85, 1.3);
      if (alpha <= 0.01) return;

      const speedMag = Math.hypot(m.vx, m.vy) || 1;
      const dirX = m.vx / speedMag;
      const dirY = m.vy / speedMag;

      const tailLen = m.length * (0.4 + 0.6 * Math.sin(progress * Math.PI));
      const tailX = m.x - dirX * tailLen;
      const tailY = m.y - dirY * tailLen;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      const outerGrad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
      outerGrad.addColorStop(0, m.colorTail);
      outerGrad.addColorStop(0.45, m.colorTail.replace(/0\.\d+\)/, '0.28)'));
      outerGrad.addColorStop(1, 'rgba(255,255,255,0)');

      ctx.globalAlpha = alpha * 0.65;
      ctx.strokeStyle = outerGrad;
      ctx.lineWidth = m.thickness * 3.1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      const coreGrad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.25, m.colorHead);
      coreGrad.addColorStop(1, 'rgba(255,255,255,0)');

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = coreGrad;
      ctx.lineWidth = m.thickness;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      const flareSize = m.thickness * 3.6 * alpha;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(m.x - flareSize, m.y);
      ctx.lineTo(m.x + flareSize, m.y);
      ctx.moveTo(m.x, m.y - flareSize);
      ctx.lineTo(m.x, m.y + flareSize);
      ctx.stroke();

      const headGrad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.thickness * 3.8);
      headGrad.addColorStop(0, '#ffffff');
      headGrad.addColorStop(0.45, m.colorTail);
      headGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.thickness * 3.8, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < m.sparks.length; i++) {
        const sp = m.sparks[i];
        const spAlpha = Math.max(0, 1 - sp.life / sp.maxLife) * alpha * 0.85;
        if (spAlpha <= 0.02) continue;
        ctx.globalAlpha = spAlpha;
        ctx.fillStyle = m.colorHead;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    const renderFrame = (timeSec: number, dt: number) => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < twinkleStars.length; i++) {
        const st = twinkleStars[i];
        const twinkle = dt === 0 ? 0.85 : 0.55 + 0.45 * Math.sin(timeSec * st.speed + st.phase);
        ctx.globalAlpha = st.baseAlpha * twinkle;
        ctx.fillStyle = st.tint;
        ctx.beginPath();
        ctx.arc(st.xRatio * width, st.yRatio * height, st.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (let i = 0; i < galaxies.length; i++) {
        const g = galaxies[i];
        if (dt > 0) {
          g.age += dt;
          g.rotation += g.rotationSpeed * dt;
          if (g.age >= g.lifetime) {
            galaxies[i] = createSpiralGalaxy(width, height, galaxies);
          }
        }
        drawGalaxy(galaxies[i]);
      }

      if (dt > 0) {
        nextMeteorCooldown -= dt;
        if (nextMeteorCooldown <= 0) {
          shootingStars.push(createShootingStar(width, height));
          if (Math.random() < 0.24) {
            const twin = createShootingStar(width, height);
            twin.age = -randRange(0.12, 0.3);
            shootingStars.push(twin);
          }
          nextMeteorCooldown = compact ? randRange(2.1, 4.4) : randRange(1.2, 3.2);
        }
      }

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const m = shootingStars[i];
        if (dt > 0) {
          m.age += dt;
          if (m.age < 0) continue;

          m.x += m.vx * dt;
          m.y += m.vy * dt;

          if (Math.random() < 0.55 && m.sparks.length < 18) {
            m.sparks.push({
              x: m.x + randRange(-2, 2),
              y: m.y + randRange(-2, 2),
              vx: -m.vx * 0.05 + randRange(-18, 18),
              vy: -m.vy * 0.05 + randRange(-18, 18),
              life: 0,
              maxLife: randRange(0.28, 0.58),
              size: randRange(0.6, 1.45),
            });
          }

          for (let s = m.sparks.length - 1; s >= 0; s--) {
            const sp = m.sparks[s];
            sp.life += dt;
            sp.x += sp.vx * dt;
            sp.y += sp.vy * dt;
            if (sp.life >= sp.maxLife) {
              m.sparks.splice(s, 1);
            }
          }
        }

        drawShootingStar(m);

        if (dt > 0 && m.age >= m.duration) {
          shootingStars.splice(i, 1);
        }
      }
    };

    const handleResize = () => {
      resize();
      if (isStatic || prefersReducedMotion) {
        renderFrame(1.5, 0);
      }
    };
    window.addEventListener('resize', handleResize);

    // Static mode or reduced-motion: render one crisp cosmic snapshot with ZERO animation loop
    if (isStatic || prefersReducedMotion) {
      renderFrame(1.5, 0);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }

    let rafId = 0;
    let lastTs = performance.now();

    const loop = (now: number) => {
      if (!document.hidden) {
        const dt = Math.min((now - lastTs) / 1000, 0.05);
        renderFrame(now / 1000, dt);
      }
      lastTs = now;
      rafId = window.requestAnimationFrame(loop);
    };

    rafId = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [compact, isOff, isStatic]);

  if (isOff) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
};
