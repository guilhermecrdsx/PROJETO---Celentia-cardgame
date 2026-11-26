import { getInMemoryPlayerState } from '../services/accountApi';

export {
  RANK_TIER_ORDER,
  RANK_TIER_THEMES,
  UNRANKED_THEME,
  DIVISIONS_PER_TIER,
  POINTS_PER_DIVISION,
  POINTS_PER_TIER,
  MAX_DIVISION_INDEX,
  CELESTIAL_MIN_POINTS,
  normalizeRankTierInput,
  getTierIndex,
  divisionIndexToTierAndDivision,
  getEffectiveBlockedFromTier,
  getMaxAllowedDivisionIndex,
  getRankInfo,
  calculateRankedRpDelta,
  calculateRankDelta,
} from './rankMath';

export type {
  RankTier,
  RankDisplayTier,
  RankDivision,
  RankPolicyConfig,
  RankLockContext,
  RankInfo,
  RankedRpCalculationResult,
} from './rankMath';

const RANK_STORAGE_KEY = 'celentia_ranked_points_v1';

export function loadRankPoints(): number {
  const cloud = getInMemoryPlayerState();
  if (cloud) return cloud.rankPoints;
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(RANK_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = parseInt(raw, 10);
    return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
  } catch {
    return 0;
  }
}

export function saveRankPoints(points: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RANK_STORAGE_KEY, String(Math.max(0, Math.floor(points))));
  } catch {
    // Ignore storage quota errors
  }
}
