export const MAX_ACCOUNT_LEVEL = 50;
export const BASE_XP_LEVEL_1 = 100;
export const XP_GROWTH_MULTIPLIER = 1.25;
// Legacy constant kept only for fallback compatibility; use getXpRequiredForNextLevel(level).
export const XP_PER_ACCOUNT_LEVEL = BASE_XP_LEVEL_1;
export const LEVEL_MILESTONE_INTERVAL = 10;
export const ACCOUNT_LEVEL_MILESTONES: readonly number[] = [10, 20, 30, 40, 50] as const;
export const MILESTONE_GOLD_REWARD = 100;
export const MILESTONE_COMMON_PACK_REWARD = 1;

export type ProgressionMatchMode = 'pvia' | 'pvp_normal' | 'pvp_ranked';

export interface LevelMilestoneReward {
  level: number;
  gold: number;
  commonPacks: number;
}

export interface XpProgressionResult {
  level: number;
  xp: number;
  xpForNextLevel: number;
  goldGained: number;
  commonPacksGained: number;
  newlyClaimedMilestones: LevelMilestoneReward[];
  claimedMilestones: number[];
  levelsGained: number;
}

/**
 * Dynamic per-level XP curve (+25% per level, rounded up):
 * Level 1 -> 2: 100 XP
 * Level 2 -> 3: 125 XP
 * Level 3 -> 4: 157 XP
 * Level 4 -> 5: 197 XP
 * ...and so on without cumulative carryover of previous thresholds.
 */
export function getXpRequiredForNextLevel(level: number): number {
  const safeLevel = Math.max(1, Math.min(MAX_ACCOUNT_LEVEL, Math.floor(level || 1)));
  let required = BASE_XP_LEVEL_1;
  for (let l = 1; l < safeLevel; l++) {
    required = Math.ceil(required * XP_GROWTH_MULTIPLIER);
  }
  return required;
}

/**
 * Exact match XP rewards by mode and current account level:
 * - PvIA: +50 XP ONLY while account is strictly Level 1; +10 XP at Level 2+.
 * - PvP Normal (sem rank): +20 XP on Victory, +15 XP on Defeat.
 * - PvP Ranked: +30 XP on Victory, +15 XP on Defeat.
 */
export function calculateMatchXpReward(
  mode: ProgressionMatchMode,
  isVictory: boolean,
  currentAccountLevel: number
): number {
  const safeLevel = Math.max(1, Math.floor(currentAccountLevel || 1));
  if (mode === 'pvia') {
    return safeLevel === 1 ? 50 : 10;
  }
  if (mode === 'pvp_normal') {
    return isVictory ? 20 : 15;
  }
  // pvp_ranked
  return isVictory ? 30 : 15;
}

export function normalizeClaimedMilestones(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const validSet = new Set<number>();
  for (const item of raw) {
    const num = Number(item);
    if (ACCOUNT_LEVEL_MILESTONES.includes(num)) {
      validSet.add(num);
    }
  }
  return Array.from(validSet).sort((a, b) => a - b);
}

export function awardMilestonesForLevel(
  newLevel: number,
  alreadyClaimed: number[]
): {
  claimedMilestones: number[];
  newlyClaimedMilestones: LevelMilestoneReward[];
  goldGained: number;
  commonPacksGained: number;
} {
  const claimedSet = new Set(normalizeClaimedMilestones(alreadyClaimed));
  const newlyClaimed: LevelMilestoneReward[] = [];

  for (const milestone of ACCOUNT_LEVEL_MILESTONES) {
    if (newLevel >= milestone && !claimedSet.has(milestone)) {
      claimedSet.add(milestone);
      newlyClaimed.push({
        level: milestone,
        gold: MILESTONE_GOLD_REWARD,
        commonPacks: MILESTONE_COMMON_PACK_REWARD,
      });
    }
  }

  return {
    claimedMilestones: Array.from(claimedSet).sort((a, b) => a - b),
    newlyClaimedMilestones: newlyClaimed,
    goldGained: newlyClaimed.reduce((sum, m) => sum + m.gold, 0),
    commonPacksGained: newlyClaimed.reduce((sum, m) => sum + m.commonPacks, 0),
  };
}

export function applyAccountXpProgress(params: {
  currentLevel: number;
  currentXp: number;
  claimedMilestones: number[];
  addedXp: number;
}): XpProgressionResult {
  const startLevel = Math.max(1, Math.min(MAX_ACCOUNT_LEVEL, Math.floor(params.currentLevel || 1)));
  const startXp = startLevel >= MAX_ACCOUNT_LEVEL ? 0 : Math.max(0, Math.floor(params.currentXp || 0));
  const safeAddXp = Math.max(0, Math.floor(params.addedXp || 0));

  let level = startLevel;
  let xp = startXp + safeAddXp;

  while (level < MAX_ACCOUNT_LEVEL) {
    const requiredForNext = getXpRequiredForNextLevel(level);
    if (xp < requiredForNext) break;
    xp -= requiredForNext;
    level += 1;
  }

  if (level >= MAX_ACCOUNT_LEVEL) {
    level = MAX_ACCOUNT_LEVEL;
    xp = 0;
  }

  const milestoneResult = awardMilestonesForLevel(level, params.claimedMilestones);

  return {
    level,
    xp,
    xpForNextLevel: getXpRequiredForNextLevel(level),
    goldGained: milestoneResult.goldGained,
    commonPacksGained: milestoneResult.commonPacksGained,
    newlyClaimedMilestones: milestoneResult.newlyClaimedMilestones,
    claimedMilestones: milestoneResult.claimedMilestones,
    levelsGained: Math.max(0, level - startLevel),
  };
}
