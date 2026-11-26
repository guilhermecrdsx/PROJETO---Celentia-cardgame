export type PackType = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'lucky';

export interface PackDefinition {
  id: PackType;
  name: string;
  subtitle: string;
  cost: number;
  guaranteedCards: number;
  extraCardChance: number; // 0..1 (e.g. 0.10 = 10% chance of 4th card)
  fixedTier: 1 | 2 | 3 | 4 | 5 | null;
  tierWeights?: Array<{ tier: 1 | 2 | 3 | 4 | 5; weightPercent: number }>;
  icon: string;
  accentGradient: string;
  borderClass: string;
  badgeText: string;
  description: string;
}

export const DUPLICATE_CARD_CRYSTAL_REFUND: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 60,
  2: 130,
  3: 220,
  4: 320,
  5: 450,
};

export const LUCKY_PACK_TIER_WEIGHTS: Array<{ tier: 1 | 2 | 3 | 4 | 5; weightPercent: number }> = [
  { tier: 1, weightPercent: 33.5 },
  { tier: 2, weightPercent: 27.5 },
  { tier: 3, weightPercent: 22.5 },
  { tier: 4, weightPercent: 12.5 },
  { tier: 5, weightPercent: 4.0 },
];

export const PACK_DEFINITIONS: PackDefinition[] = [
  {
    id: 'common',
    name: 'Pacote Comum',
    subtitle: '3 Cartas de TIER 1 Aleatórias',
    cost: 250,
    guaranteedCards: 3,
    extraCardChance: 0,
    fixedTier: 1,
    icon: '📦',
    accentGradient: 'from-stone-700/80 via-stone-900 to-stone-950',
    borderClass: 'border-stone-400/50',
    badgeText: 'TIER 1',
    description: 'Contém 3 cartas aleatórias de Tier 1. Repetidas são convertidas em Cristais.',
  },
  {
    id: 'uncommon',
    name: 'Pacote Incomum',
    subtitle: '3 Cartas de TIER 2 Aleatórias',
    cost: 550,
    guaranteedCards: 3,
    extraCardChance: 0,
    fixedTier: 2,
    icon: '💠',
    accentGradient: 'from-emerald-800/75 via-stone-900 to-emerald-950/90',
    borderClass: 'border-emerald-400/55',
    badgeText: 'TIER 2',
    description: 'Contém 3 cartas aleatórias de Tier 2. Repetidas são convertidas em Cristais.',
  },
  {
    id: 'rare',
    name: 'Pacote Raro',
    subtitle: '3 Cartas de TIER 3 Aleatórias',
    cost: 1000,
    guaranteedCards: 3,
    extraCardChance: 0,
    fixedTier: 3,
    icon: '🔷',
    accentGradient: 'from-sky-800/75 via-slate-900 to-sky-950/90',
    borderClass: 'border-sky-400/65',
    badgeText: 'TIER 3',
    description: 'Contém 3 cartas aleatórias de Tier 3. Repetidas são convertidas em Cristais.',
  },
  {
    id: 'epic',
    name: 'Pacote Épico',
    subtitle: '3 Cartas de TIER 4 Aleatórias',
    cost: 1500,
    guaranteedCards: 3,
    extraCardChance: 0,
    fixedTier: 4,
    icon: '🔮',
    accentGradient: 'from-purple-800/80 via-slate-900 to-purple-950/90',
    borderClass: 'border-purple-400/70',
    badgeText: 'TIER 4',
    description: 'Contém 3 cartas aleatórias de Tier 4. Repetidas são convertidas em Cristais.',
  },
  {
    id: 'legendary',
    name: 'Pacote Lendário',
    subtitle: '3 Cartas de TIER 5 Aleatórias',
    cost: 2200,
    guaranteedCards: 3,
    extraCardChance: 0,
    fixedTier: 5,
    icon: '👑',
    accentGradient: 'from-amber-700/80 via-stone-900 to-amber-950/90',
    borderClass: 'border-amber-400/80',
    badgeText: 'TIER 5',
    description: 'Contém 3 cartas aleatórias de Tier 5. Repetidas são convertidas em Cristais.',
  },
  {
    id: 'lucky',
    name: 'Pacote da Sorte',
    subtitle: '3 Cartas Garantidas (+10% de 4ª Carta)',
    cost: 650,
    guaranteedCards: 3,
    extraCardChance: 0.1,
    fixedTier: null,
    tierWeights: LUCKY_PACK_TIER_WEIGHTS,
    icon: '🍀',
    accentGradient: 'from-fuchsia-800/75 via-amber-900/45 to-emerald-950/85',
    borderClass: 'border-amber-300/85',
    badgeText: 'SORTE · 10% +1',
    description: 'Chances por Tier: T1 33,5% · T2 27,5% · T3 22,5% · T4 12,5% · T5 4%.',
  },
];

export const PACK_MAP: Record<PackType, PackDefinition> = PACK_DEFINITIONS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<PackType, PackDefinition>
);

export function rollWeightedLuckyTier(randomValue: number = Math.random()): 1 | 2 | 3 | 4 | 5 {
  const scaled = Math.max(0, Math.min(99.9999, randomValue * 100));
  let cumulative = 0;
  for (const entry of LUCKY_PACK_TIER_WEIGHTS) {
    cumulative += entry.weightPercent;
    if (scaled < cumulative) {
      return entry.tier;
    }
  }
  return 1;
}
