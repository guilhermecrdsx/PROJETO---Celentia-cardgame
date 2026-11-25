// Pure ranked calculation & tier division math shared safely across Browser, Express & WebSocket servers.
// Strictly browser-free so Node.js imports never pull Firebase client SDKs.

export type RankTier = 'Bronze' | 'Prata' | 'Ouro' | 'Platina' | 'Diamante' | 'Celestial';
export type RankDivision = 3 | 2 | 1;

export interface RankPolicyConfig {
  blockedFromTier: RankTier | null;
  updatedAt?: string;
  updatedBy?: string;
}

export interface RankLockContext {
  globalBlockedFromTier?: RankTier | null;
  playerBlockedTotal?: boolean;
  playerBlockedFromTier?: RankTier | null;
}

export interface RankInfo {
  tier: RankTier;
  division: RankDivision;
  divisionRoman: 'III' | 'II' | 'I';
  label: string; // e.g. "Bronze III", "Prata I", "Celestial I"
  rawTier: RankTier;
  rawDivision: RankDivision;
  rawLabel: string;
  minPoints: number;
  maxPoints: number | null;
  totalPoints: number;
  pointsInDivision: number;
  pointsNeededPerDivision: number;
  progressPercent: number;
  nextLabel: string | null;
  isCapped: boolean;
  isTotallyBlocked: boolean;
  effectiveBlockedFromTier: RankTier | null;
  accumulatedBeyondCap: number;
  icon: string;
  accentColor: string;
  textColor: string;
  bgClass: string;
  borderClass: string;
  badgeGradient: string;
  description: string;
}

export const RANK_TIER_ORDER: readonly RankTier[] = [
  'Bronze',
  'Prata',
  'Ouro',
  'Platina',
  'Diamante',
  'Celestial',
] as const;

export const DIVISIONS_PER_TIER = 3;
export const POINTS_PER_DIVISION = 100;
export const POINTS_PER_TIER = DIVISIONS_PER_TIER * POINTS_PER_DIVISION; // 300 RP per Tier
export const MAX_DIVISION_INDEX = RANK_TIER_ORDER.length * DIVISIONS_PER_TIER - 1; // 17 -> Celestial I (1700+)

export const RANK_TIER_THEMES: Record<
  RankTier,
  {
    icon: string;
    accentColor: string;
    textColor: string;
    bgClass: string;
    borderClass: string;
    badgeGradient: string;
    description: string;
  }
> = {
  Bronze: {
    icon: '🥉',
    accentColor: '#cd7f32',
    textColor: 'text-amber-300',
    bgClass: 'bg-amber-950/60',
    borderClass: 'border-amber-700/60',
    badgeGradient: 'from-amber-800/75 via-stone-900 to-amber-950/80',
    description: 'Iniciantes da Arena de Celentia que forjam sua honra nas primeiras batalhas.',
  },
  Prata: {
    icon: '🥈',
    accentColor: '#cbd5e1',
    textColor: 'text-slate-200',
    bgClass: 'bg-slate-800/60',
    borderClass: 'border-slate-400/50',
    badgeGradient: 'from-slate-600/70 via-slate-800 to-slate-950/80',
    description: 'Duelistas disciplinados com domínio tático consistente entre os reinos.',
  },
  Ouro: {
    icon: '🥇',
    accentColor: '#f59e0b',
    textColor: 'text-amber-200',
    bgClass: 'bg-amber-900/50',
    borderClass: 'border-amber-400/65',
    badgeGradient: 'from-amber-500/75 via-yellow-800/70 to-amber-950/85',
    description: 'Comandantes experientes respeitados pela precisão de suas conjurações.',
  },
  Platina: {
    icon: '💠',
    accentColor: '#2dd4bf',
    textColor: 'text-teal-200',
    bgClass: 'bg-teal-950/65',
    borderClass: 'border-teal-400/60',
    badgeGradient: 'from-teal-500/70 via-cyan-900/75 to-slate-950/85',
    description: 'Estrategistas refinados capazes de virar duelos sob pressão extrema.',
  },
  Diamante: {
    icon: '💎',
    accentColor: '#38bdf8',
    textColor: 'text-sky-200',
    bgClass: 'bg-sky-950/65',
    borderClass: 'border-sky-400/70',
    badgeGradient: 'from-sky-400/75 via-indigo-900/75 to-slate-950/85',
    description: 'Campeões de elite cujo nome ecoa pelas fortalezas de Granty, Musmo e Naneya.',
  },
  Celestial: {
    icon: '🌌',
    accentColor: '#c084fc',
    textColor: 'text-fuchsia-200',
    bgClass: 'bg-purple-950/75',
    borderClass: 'border-fuchsia-400/80',
    badgeGradient: 'from-fuchsia-500/75 via-purple-900/80 to-indigo-950/90',
    description: 'Soberanos supremos coroados sob as estrelas da Ordem Celestial.',
  },
};

export function normalizeRankTierInput(value: unknown): RankTier | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const found = RANK_TIER_ORDER.find((t) => t.toLowerCase() === trimmed.toLowerCase());
  return found ?? null;
}

export function getTierIndex(tier: RankTier): number {
  return RANK_TIER_ORDER.indexOf(tier);
}

export function divisionIndexToTierAndDivision(divIndex: number): {
  tier: RankTier;
  division: RankDivision;
  divisionRoman: 'III' | 'II' | 'I';
  label: string;
} {
  const clamped = Math.max(0, Math.min(MAX_DIVISION_INDEX, Math.floor(divIndex)));
  const tierIdx = Math.floor(clamped / DIVISIONS_PER_TIER);
  const subIdx = clamped % DIVISIONS_PER_TIER; // 0 -> III, 1 -> II, 2 -> I
  const division = (3 - subIdx) as RankDivision;
  const divisionRoman = division === 3 ? 'III' : division === 2 ? 'II' : 'I';
  const tier = RANK_TIER_ORDER[tierIdx];
  return {
    tier,
    division,
    divisionRoman,
    label: `${tier} ${divisionRoman}`,
  };
}

export function getEffectiveBlockedFromTier(context?: RankLockContext): RankTier | null {
  if (!context) return null;
  const globalBlock = context.globalBlockedFromTier ? normalizeRankTierInput(context.globalBlockedFromTier) : null;
  const playerBlock = context.playerBlockedFromTier ? normalizeRankTierInput(context.playerBlockedFromTier) : null;

  if (globalBlock && playerBlock) {
    return getTierIndex(globalBlock) <= getTierIndex(playerBlock) ? globalBlock : playerBlock;
  }
  return globalBlock ?? playerBlock ?? null;
}

export function getMaxAllowedDivisionIndex(blockedFromTier: RankTier | null): number {
  if (!blockedFromTier) return MAX_DIVISION_INDEX;
  const tierIdx = getTierIndex(blockedFromTier);
  if (tierIdx <= 0) {
    // If Bronze itself is blocked, stay at Bronze III (index 0)
    return 0;
  }
  // Blocking Ouro (tierIdx=2) caps players at Prata I -> index = 2 * 3 - 1 = 5
  return tierIdx * DIVISIONS_PER_TIER - 1;
}

export function getRankInfo(totalPoints: number, lockContext?: RankLockContext): RankInfo {
  const safePts = Math.max(0, Math.floor(Number.isFinite(totalPoints) ? totalPoints : 0));

  // Uncapped / Real rank computed purely from accumulated points
  const rawDivIndex = Math.min(MAX_DIVISION_INDEX, Math.floor(safePts / POINTS_PER_DIVISION));
  const rawMeta = divisionIndexToTierAndDivision(rawDivIndex);

  // Effective cap (min of global cap and player cap)
  const effectiveBlockedFromTier = getEffectiveBlockedFromTier(lockContext);
  const maxAllowedDivIdx = getMaxAllowedDivisionIndex(effectiveBlockedFromTier);
  const isTotallyBlocked = Boolean(lockContext?.playerBlockedTotal);

  const displayedDivIndex = Math.min(rawDivIndex, maxAllowedDivIdx);
  const displayedMeta = divisionIndexToTierAndDivision(displayedDivIndex);
  const isCapped = Boolean(effectiveBlockedFromTier) && rawDivIndex > maxAllowedDivIdx;

  const minPoints = displayedDivIndex * POINTS_PER_DIVISION;
  const isAtAbsolutePeak = displayedDivIndex >= MAX_DIVISION_INDEX;
  const maxAllowedCeilingEnd = (maxAllowedDivIdx + 1) * POINTS_PER_DIVISION;

  // If capped by an admin rank block (e.g. Bronze->Prata I locked before Ouro), show full 100/100 bar + accumulated overflow
  const accumulatedBeyondCap = isCapped ? Math.max(0, safePts - (maxAllowedCeilingEnd - 1)) : 0;
  const pointsInDivision = isCapped
    ? POINTS_PER_DIVISION
    : isAtAbsolutePeak
    ? safePts - minPoints
    : safePts - minPoints;

  const progressPercent = isCapped
    ? 100
    : isAtAbsolutePeak
    ? 100
    : Math.min(100, Math.max(0, Math.round((pointsInDivision / POINTS_PER_DIVISION) * 100)));

  const nextDivIndex = displayedDivIndex + 1;
  const nextLabel =
    isAtAbsolutePeak || displayedDivIndex >= maxAllowedDivIdx
      ? null
      : divisionIndexToTierAndDivision(nextDivIndex).label;

  const theme = RANK_TIER_THEMES[displayedMeta.tier];

  return {
    tier: displayedMeta.tier,
    division: displayedMeta.division,
    divisionRoman: displayedMeta.divisionRoman,
    label: displayedMeta.label,
    rawTier: rawMeta.tier,
    rawDivision: rawMeta.division,
    rawLabel: rawMeta.label,
    minPoints,
    maxPoints: isAtAbsolutePeak ? null : minPoints + POINTS_PER_DIVISION - 1,
    totalPoints: safePts,
    pointsInDivision,
    pointsNeededPerDivision: POINTS_PER_DIVISION,
    progressPercent,
    nextLabel,
    isCapped,
    isTotallyBlocked,
    effectiveBlockedFromTier,
    accumulatedBeyondCap,
    ...theme,
  };
}

export function calculateRankDelta(isWinner: boolean, isDraw: boolean): number {
  if (isDraw) return 5;
  return isWinner ? 25 : -15;
}
