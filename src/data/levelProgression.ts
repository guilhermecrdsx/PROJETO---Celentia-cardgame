export const MAX_ACCOUNT_LEVEL = 50;
export const XP_PER_ACCOUNT_LEVEL = 500;
export const LEVEL_MILESTONE_INTERVAL = 10;
export const ACCOUNT_LEVEL_MILESTONES: readonly number[] = [10, 20, 30, 40, 50] as const;
export const MILESTONE_GOLD_REWARD = 100;
export const MILESTONE_COMMON_PACK_REWARD = 1;

export interface LevelMilestoneReward {
  level: number;
  gold: number;
  commonPacks: number;
}

export interface XpProgressionResult {
  level: number;
  xp: number;
  goldGained: number;
  commonPacksGained: number;
  newlyClaimedMilestones: LevelMilestoneReward[];
  claimedMilestones: number[];
  levelsGained: number;
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

  while (xp >= XP_PER_ACCOUNT_LEVEL && level < MAX_ACCOUNT_LEVEL) {
    xp -= XP_PER_ACCOUNT_LEVEL;
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
    goldGained: milestoneResult.goldGained,
    commonPacksGained: milestoneResult.commonPacksGained,
    newlyClaimedMilestones: milestoneResult.newlyClaimedMilestones,
    claimedMilestones: milestoneResult.claimedMilestones,
    levelsGained: Math.max(0, level - startLevel),
  };
}
