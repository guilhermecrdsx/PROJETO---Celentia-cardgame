export interface ForgedTierPalette {
  name: string;
  outerMetalGradient: string;
  innerFrameBorder: string;
  filigreeStroke: string;
  filigreeGlow: string;
  gemTop: string;
  gemMid: string;
  gemBottom: string;
  gemHighlight: string;
  headerBg: string;
  headerDividerColor: string;
  footerBg: string;
  statWellBg: string;
  statWellBorder: string;
  bezelShadow: string;
  textAccent: string;
}

export const FORGED_TIER_PALETTES: Record<number, ForgedTierPalette> = {
  1: {
    name: 'Ferro Temperado',
    outerMetalGradient: 'linear-gradient(145deg, #9ca3af 0%, #4b5563 26%, #1f2937 52%, #6b7280 78%, #374151 100%)',
    innerFrameBorder: 'rgba(203, 213, 225, 0.32)',
    filigreeStroke: '#cbd5e1',
    filigreeGlow: 'rgba(148, 163, 184, 0.45)',
    gemTop: '#f1f5f9',
    gemMid: '#94a3b8',
    gemBottom: '#334155',
    gemHighlight: '#ffffff',
    headerBg: 'linear-gradient(180deg, #272936 0%, #171923 55%, #0f1118 100%)',
    headerDividerColor: 'rgba(148, 163, 184, 0.45)',
    footerBg: 'linear-gradient(180deg, #1b1d27 0%, #101219 52%, #090a0f 100%)',
    statWellBg: 'rgba(12, 13, 20, 0.72)',
    statWellBorder: 'rgba(148, 163, 184, 0.25)',
    bezelShadow: '0 10px 24px rgba(0, 0, 0, 0.88)',
    textAccent: '#e2e8f0',
  },
  2: {
    name: 'Bronze Esmeralda',
    outerMetalGradient: 'linear-gradient(145deg, #6ee7b7 0%, #059669 24%, #064e3b 50%, #34d399 76%, #065f46 100%)',
    innerFrameBorder: 'rgba(110, 231, 183, 0.38)',
    filigreeStroke: '#6ee7b7',
    filigreeGlow: 'rgba(16, 185, 129, 0.55)',
    gemTop: '#d1fae5',
    gemMid: '#10b981',
    gemBottom: '#064e3b',
    gemHighlight: '#ecfdf5',
    headerBg: 'linear-gradient(180deg, #172e28 0%, #10201c 58%, #0a1513 100%)',
    headerDividerColor: 'rgba(52, 211, 153, 0.5)',
    footerBg: 'linear-gradient(180deg, #122621 0%, #0b1815 55%, #07100e 100%)',
    statWellBg: 'rgba(6, 20, 17, 0.78)',
    statWellBorder: 'rgba(52, 211, 153, 0.3)',
    bezelShadow: '0 10px 26px rgba(0, 0, 0, 0.9), 0 0 14px rgba(16, 185, 129, 0.25)',
    textAccent: '#6ee7b7',
  },
  3: {
    name: 'Titânio Celeste',
    outerMetalGradient: 'linear-gradient(145deg, #bae6fd 0%, #0284c7 26%, #172554 52%, #38bdf8 78%, #0369a1 100%)',
    innerFrameBorder: 'rgba(125, 211, 252, 0.42)',
    filigreeStroke: '#7dd3fc',
    filigreeGlow: 'rgba(56, 189, 248, 0.6)',
    gemTop: '#e0f2fe',
    gemMid: '#0ea5e9',
    gemBottom: '#1e3a8a',
    gemHighlight: '#ffffff',
    headerBg: 'linear-gradient(180deg, #18273e 0%, #101b2d 58%, #09111e 100%)',
    headerDividerColor: 'rgba(56, 189, 248, 0.55)',
    footerBg: 'linear-gradient(180deg, #132136 0%, #0c1625 55%, #070e19 100%)',
    statWellBg: 'rgba(8, 17, 32, 0.8)',
    statWellBorder: 'rgba(56, 189, 248, 0.34)',
    bezelShadow: '0 10px 26px rgba(0, 0, 0, 0.9), 0 0 16px rgba(56, 189, 248, 0.32)',
    textAccent: '#7dd3fc',
  },
  4: {
    name: 'Mithril Ametista',
    outerMetalGradient: 'linear-gradient(145deg, #e9d5ff 0%, #9333ea 26%, #3b0764 52%, #c084fc 78%, #6b21a8 100%)',
    innerFrameBorder: 'rgba(216, 180, 254, 0.44)',
    filigreeStroke: '#d8b4fe',
    filigreeGlow: 'rgba(168, 85, 247, 0.65)',
    gemTop: '#f3e8ff',
    gemMid: '#a855f7',
    gemBottom: '#4c1d95',
    gemHighlight: '#ffffff',
    headerBg: 'linear-gradient(180deg, #28193d 0%, #1b102b 58%, #110a1c 100%)',
    headerDividerColor: 'rgba(192, 132, 252, 0.58)',
    footerBg: 'linear-gradient(180deg, #211433 0%, #150c22 55%, #0d0716 100%)',
    statWellBg: 'rgba(19, 10, 32, 0.82)',
    statWellBorder: 'rgba(192, 132, 252, 0.36)',
    bezelShadow: '0 10px 28px rgba(0, 0, 0, 0.92), 0 0 18px rgba(168, 85, 247, 0.38)',
    textAccent: '#d8b4fe',
  },
  5: {
    name: 'Ouro Celestial Forjado',
    outerMetalGradient: 'linear-gradient(145deg, #fef08a 0%, #f59e0b 22%, #78350f 48%, #fbbf24 72%, #b45309 88%, #fde047 100%)',
    innerFrameBorder: 'rgba(253, 224, 71, 0.55)',
    filigreeStroke: '#fde047',
    filigreeGlow: 'rgba(251, 191, 36, 0.78)',
    gemTop: '#fef9c3',
    gemMid: '#f59e0b',
    gemBottom: '#7c2d12',
    gemHighlight: '#ffffff',
    headerBg: 'linear-gradient(180deg, #2d2115 0%, #1d1510 58%, #120d0a 100%)',
    headerDividerColor: 'rgba(251, 191, 36, 0.68)',
    footerBg: 'linear-gradient(180deg, #251b12 0%, #16100b 55%, #0d0907 100%)',
    statWellBg: 'rgba(22, 14, 7, 0.85)',
    statWellBorder: 'rgba(251, 191, 36, 0.42)',
    bezelShadow: '0 12px 30px rgba(0, 0, 0, 0.94), 0 0 22px rgba(245, 158, 11, 0.52)',
    textAccent: '#fde047',
  },
  6: {
    name: 'Astral Prismático',
    outerMetalGradient: 'linear-gradient(135deg, #f9a8d4 0%, #fbbf24 22%, #67e8f9 48%, #c084fc 74%, #f472b6 100%)',
    innerFrameBorder: 'rgba(249, 168, 212, 0.62)',
    filigreeStroke: '#f9a8d4',
    filigreeGlow: 'rgba(236, 72, 153, 0.85)',
    gemTop: '#fdf2f8',
    gemMid: '#ec4899',
    gemBottom: '#4338ca',
    gemHighlight: '#ffffff',
    headerBg: 'linear-gradient(180deg, #271535 0%, #170d25 58%, #0e0818 100%)',
    headerDividerColor: 'rgba(244, 114, 182, 0.72)',
    footerBg: 'linear-gradient(180deg, #211230 0%, #130b1f 55%, #0a0612 100%)',
    statWellBg: 'rgba(18, 9, 32, 0.86)',
    statWellBorder: 'rgba(244, 114, 182, 0.48)',
    bezelShadow: '0 12px 32px rgba(0, 0, 0, 0.96), 0 0 24px rgba(236, 72, 153, 0.62), 0 0 42px rgba(56, 189, 248, 0.38)',
    textAccent: '#f9a8d4',
  },
};

export function getForgedPalette(
  tier: number,
  options?: { isLevel2?: boolean; isFugaz?: boolean; isSkill?: boolean }
): ForgedTierPalette {
  const base = FORGED_TIER_PALETTES[tier] || FORGED_TIER_PALETTES[1];

  if (options?.isFugaz) {
    return {
      ...base,
      outerMetalGradient: 'linear-gradient(145deg, #fde68a 0%, #f97316 28%, #7c2d12 56%, #fbbf24 82%, #ea580c 100%)',
      innerFrameBorder: 'rgba(251, 146, 60, 0.65)',
      filigreeStroke: '#fdba74',
      filigreeGlow: 'rgba(249, 115, 22, 0.85)',
      bezelShadow: '0 0 24px rgba(245, 158, 11, 0.85), 0 0 38px rgba(239, 68, 68, 0.6)',
    };
  }

  if (options?.isLevel2 && tier < 6) {
    return {
      ...base,
      outerMetalGradient: 'linear-gradient(145deg, #fef9c3 0%, #fbbf24 24%, #92400e 50%, #fde047 76%, #b45309 100%)',
      innerFrameBorder: 'rgba(254, 240, 138, 0.72)',
      filigreeStroke: '#fef08a',
      filigreeGlow: 'rgba(251, 191, 36, 0.9)',
      headerDividerColor: 'rgba(253, 224, 71, 0.8)',
      bezelShadow: '0 0 26px rgba(251, 191, 36, 0.85), 0 0 44px rgba(217, 70, 239, 0.28)',
    };
  }

  if (options?.isSkill) {
    return {
      ...base,
      headerBg: 'linear-gradient(180deg, #1b2238 0%, #121728 58%, #0b0e1a 100%)',
      footerBg: 'linear-gradient(180deg, #161d31 0%, #0e1322 55%, #080b15 100%)',
    };
  }

  return base;
}
