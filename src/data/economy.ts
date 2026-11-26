// Single source of truth for Celentia's dual-currency economy (Crystals + Gold).
// Pure TypeScript module safe for both Node.js server and browser bundles.

export type CurrencyType = 'gold' | 'crystals';
export type EconomyMatchMode = 'pvia' | 'pvp_normal' | 'pvp_ranked';

export type PlaymatId =
  | 'standard_arena'
  | 'arcane_citadel'
  | 'celestial_sanctuary'
  | 'obsidian_forge'
  | 'classic_slate';

export type CardBackId =
  | 'standard_classic'
  | 'royal_gold'
  | 'angiris_wings'
  | 'cosmic_void'
  | 'crimson_war';

// Unanimated starter defaults (only free items; all animated themes are paid)
export const DEFAULT_PLAYMAT_ID: PlaymatId = 'standard_arena';
export const DEFAULT_CARD_BACK_ID: CardBackId = 'standard_classic';

export const ALL_PLAYMAT_IDS: readonly PlaymatId[] = [
  'standard_arena',
  'arcane_citadel',
  'celestial_sanctuary',
  'obsidian_forge',
  'classic_slate',
] as const;

export const ALL_CARD_BACK_IDS: readonly CardBackId[] = [
  'standard_classic',
  'royal_gold',
  'angiris_wings',
  'cosmic_void',
  'crimson_war',
] as const;

export const FREE_PLAYMAT_IDS: readonly PlaymatId[] = [DEFAULT_PLAYMAT_ID] as const;
export const FREE_CARD_BACK_IDS: readonly CardBackId[] = [DEFAULT_CARD_BACK_ID] as const;

// Card prices in Gold (Tiers 1..6)
export const TIER_GOLD_COSTS: Record<number, number> = {
  1: 100,
  2: 200,
  3: 350,
  4: 550,
  5: 800,
  6: 1200,
};

// Card prices in Crystals (ONLY Tiers 1..3 are purchasable with Crystals)
export const MAX_CRYSTAL_PURCHASABLE_CARD_TIER = 3;
export const TIER_CRYSTAL_COSTS: Record<1 | 2 | 3, number> = {
  1: 250,
  2: 500,
  3: 700,
};

export function getCardGoldCostByTier(tier: number): number {
  return TIER_GOLD_COSTS[tier] ?? 200;
}

export function getCardCrystalCostByTier(tier: number): number | null {
  if (tier === 1) return TIER_CRYSTAL_COSTS[1];
  if (tier === 2) return TIER_CRYSTAL_COSTS[2];
  if (tier === 3) return TIER_CRYSTAL_COSTS[3];
  return null;
}

// Cosmetic prices (Gold is worth 2.5x Crystals on cosmetics)
export const PLAYMAT_CRYSTAL_COST = 550;
export const PLAYMAT_GOLD_COST = 220; // 550 / 2.5

export const CARD_BACK_CRYSTAL_COST = 300;
export const CARD_BACK_GOLD_COST = 120; // 300 / 2.5

export interface CosmeticPriceInfo {
  isDefaultFree: boolean;
  crystalCost: number;
  goldCost: number;
}

export function getPlaymatPrice(playmatId: string): CosmeticPriceInfo {
  if (playmatId === DEFAULT_PLAYMAT_ID) {
    return { isDefaultFree: true, crystalCost: 0, goldCost: 0 };
  }
  return {
    isDefaultFree: false,
    crystalCost: PLAYMAT_CRYSTAL_COST,
    goldCost: PLAYMAT_GOLD_COST,
  };
}

export function getCardBackPrice(cardBackId: string): CosmeticPriceInfo {
  if (cardBackId === DEFAULT_CARD_BACK_ID) {
    return { isDefaultFree: true, crystalCost: 0, goldCost: 0 };
  }
  return {
    isDefaultFree: false,
    crystalCost: CARD_BACK_CRYSTAL_COST,
    goldCost: CARD_BACK_GOLD_COST,
  };
}

export function isValidPlaymatId(id: unknown): id is PlaymatId {
  return typeof id === 'string' && (ALL_PLAYMAT_IDS as readonly string[]).includes(id);
}

export function isValidCardBackId(id: unknown): id is CardBackId {
  return typeof id === 'string' && (ALL_CARD_BACK_IDS as readonly string[]).includes(id);
}

/**
 * Authoritative match crystal rewards:
 * - PvP (Normal or Ranked): Victory = +20 Crystals, Defeat = +10 Crystals
 * - PvIA: Victory = +5 Crystals, Defeat = +5 Crystals
 * Matches NEVER award Gold.
 */
export function calculateMatchCrystalReward(
  mode: EconomyMatchMode,
  isVictory: boolean
): number {
  if (mode === 'pvia') {
    return 5;
  }
  return isVictory ? 20 : 10;
}
