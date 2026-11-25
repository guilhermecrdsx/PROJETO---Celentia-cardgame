import React, { useEffect, useState } from 'react';
import { getAvatarById } from '../data/avatars';
import { KINGDOM_THEMES, TIER_CONFIG, advanceCardArtFallback, getCardArtCandidates } from '../utils/cardVisuals';

interface AvatarPortraitProps {
  avatarId?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isAdmin?: boolean;
  className?: string;
  showFrameGem?: boolean;
}

const SIZE_MAP: Record<NonNullable<AvatarPortraitProps['size']>, string> = {
  xs: 'w-7 h-7',
  sm: 'w-9 h-9',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
};

export const AvatarPortrait: React.FC<AvatarPortraitProps> = ({
  avatarId,
  size = 'md',
  isAdmin = false,
  className = '',
  showFrameGem = false,
}) => {
  const avatar = getAvatarById(avatarId);
  const candidates = getCardArtCandidates(avatar.templateId, { name: avatar.name });
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [avatar.id, avatar.templateId]);

  const tierCfg = TIER_CONFIG[avatar.tier] || TIER_CONFIG[1];
  const kingdom = KINGDOM_THEMES[avatar.kingdom];

  const rimClass = isAdmin
    ? 'border-fuchsia-400/90 ring-2 ring-fuchsia-500/35 shadow-[0_0_16px_rgba(217,70,239,0.45)]'
    : avatar.tier >= 5
    ? 'border-amber-300/90 ring-2 ring-amber-400/35 shadow-[0_0_14px_rgba(251,191,36,0.4)]'
    : avatar.tier === 4
    ? 'border-purple-400/85 ring-1 ring-purple-400/30 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
    : avatar.tier === 3
    ? 'border-sky-400/80 shadow-[0_0_8px_rgba(56,189,248,0.28)]'
    : avatar.tier === 2
    ? 'border-emerald-400/75'
    : 'border-stone-500/80';

  return (
    <div
      className={`relative ${SIZE_MAP[size]} rounded-xl overflow-hidden border-2 bg-stone-950 shrink-0 select-none ${rimClass} ${className}`}
      title={`${avatar.name} — ${avatar.title}`}
    >
      {/* Subtle forged inner metallic bevel */}
      <div className="pointer-events-none absolute inset-0 rounded-[10px] border border-white/15 z-10" />

      {!imgFailed && candidates[0] ? (
        <img
          src={candidates[0]}
          alt={avatar.name}
          draggable={false}
          onError={(e) => {
            if (!advanceCardArtFallback(e.currentTarget, candidates)) {
              setImgFailed(true);
            }
          }}
          className="w-full h-full object-cover object-top scale-110"
        />
      ) : (
        <div
          className={`w-full h-full bg-gradient-to-br ${kingdom.bgGradient} flex items-center justify-center`}
        >
          <span className="text-lg">{kingdom.crest}</span>
        </div>
      )}

      {/* Subtle vignette rim */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/15" />

      {showFrameGem && (
        <span
          className="pointer-events-none absolute bottom-0.5 right-0.5 w-2 h-2 rotate-45 border border-white/70 z-20"
          style={{ backgroundColor: tierCfg.color }}
        />
      )}
    </div>
  );
};
