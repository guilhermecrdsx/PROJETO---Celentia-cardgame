import React, { useState, useEffect, useRef } from 'react';
import { Eye } from 'lucide-react';
import { CardInstance } from '../types/game';
import { TIER_CONFIG, ELEMENT_CONFIG, getCardArtCandidates, getThematicCardArt } from '../utils/cardVisuals';
import { getCardConditionItems } from '../utils/conditionEffectsConfig';
import { getCardClasses } from '../logic/combat';
import { useVisualPreferences } from '../utils/visualTheme';
import { getForgedPalette } from '../utils/cardForgeTheme';
import { CardFiligreeCorners, CardFiligreeDivider, FacetedGemMedallion } from './CardFiligreeSVG';

interface CardViewProps {
  card: CardInstance;
  isPlayable?: boolean;
  unplayableReason?: string;
  isSelected?: boolean;
  isTargetCandidate?: boolean;
  isTargetable?: boolean;
  isAssignedDefender?: boolean;
  assignedToAttackerName?: string;
  isCombatAttacker?: boolean;
  isOpponentHand?: boolean;
  isDying?: boolean;
  isNewDrawn?: boolean;
  isDiscarding?: boolean;
  isLevelingUp?: boolean;
  hasAliancaAngiris?: boolean;
  isLockedByTier?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  onInspect?: (e?: React.MouseEvent) => void;
  actionLabel?: string;
  badgeText?: string;
  hasOVazioActive?: boolean;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  isPlayable = true,
  unplayableReason,
  isSelected = false,
  isTargetCandidate = false,
  isTargetable = false,
  isAssignedDefender = false,
  assignedToAttackerName,
  isCombatAttacker = false,
  isOpponentHand = false,
  isDying = false,
  isNewDrawn = false,
  isDiscarding = false,
  isLevelingUp = false,
  hasAliancaAngiris = false,
  hasOVazioActive = false,
  size = 'md',
  onClick,
  onInspect,
  actionLabel,
  badgeText,
}) => {
  const [imageError, setImageError] = useState(false);
  const [artCandidateIndex, setArtCandidateIndex] = useState(0);
  const [artAspectRatio, setArtAspectRatio] = useState(1);
  const [justLeveledUp, setJustLeveledUp] = useState(false);
  const prevLevelRef = useRef<{ id: string; level?: 1 | 2 }>({
    id: card.instanceId,
    level: card.level,
  });
  const { foilEffects, cardBack, isTouchDevice } = useVisualPreferences();

  useEffect(() => {
    setImageError(false);
    setArtCandidateIndex(0);
    setArtAspectRatio(1);
  }, [card.instanceId, card.templateId, card.level, card.isRevealedFaleziel, card.name]);

  // Universal Level-Up detector: triggers for ANY card transitioning from Level 1 to Level 2
  useEffect(() => {
    if (
      prevLevelRef.current.id === card.instanceId &&
      prevLevelRef.current.level === 1 &&
      card.level === 2
    ) {
      setJustLeveledUp(true);
      const timer = setTimeout(() => setJustLeveledUp(false), 1850);
      prevLevelRef.current = { id: card.instanceId, level: card.level };
      return () => clearTimeout(timer);
    }
    prevLevelRef.current = { id: card.instanceId, level: card.level };
  }, [card.instanceId, card.level]);

  const showLevelUpAnim = Boolean(isLevelingUp || justLeveledUp);

  const tier = TIER_CONFIG[card.tier] || TIER_CONFIG[1];

  // If face-down in opponent's hand
  if (isOpponentHand) {
    const cardBackThemes = {
      royal_gold: {
        outer: 'border-amber-700/90 from-stone-900 via-stone-950 to-stone-900',
        inner: 'border-amber-500/40 bg-stone-950/90',
        badge: 'border-amber-400/60 bg-amber-950/70 text-amber-300',
        icon: '⚜️',
        title: 'Reinos',
      },
      angiris_wings: {
        outer: 'border-yellow-400/90 from-amber-950 via-stone-950 to-yellow-950',
        inner: 'border-yellow-300/40 bg-stone-950/90',
        badge: 'border-yellow-300/70 bg-amber-900/70 text-yellow-200',
        icon: '🪽',
        title: 'Angiris',
      },
      cosmic_void: {
        outer: 'border-indigo-500/90 from-indigo-950 via-slate-950 to-purple-950',
        inner: 'border-indigo-400/40 bg-slate-950/90',
        badge: 'border-indigo-400/70 bg-indigo-950/70 text-indigo-200',
        icon: '🔮',
        title: 'Cósmico',
      },
      crimson_war: {
        outer: 'border-rose-600/90 from-rose-950 via-stone-950 to-red-950',
        inner: 'border-rose-500/40 bg-stone-950/90',
        badge: 'border-rose-400/70 bg-rose-950/70 text-rose-200',
        icon: '🐉',
        title: 'Granty',
      },
    };
    const activeBack = cardBackThemes[cardBack] || cardBackThemes.royal_gold;

    return (
      <div
        className={`relative rounded-2xl border-[3px] bg-gradient-to-br ${activeBack.outer} shadow-2xl flex flex-col items-center justify-center cursor-default select-none transition-transform hover:-translate-y-1 ${
          size === 'sm' ? 'w-28 h-44' : size === 'lg' ? 'w-64 h-96' : 'w-44 h-64'
        } ${isNewDrawn ? 'animate-in fade-in slide-in-from-top-6 duration-300' : ''}`}
      >
        <div className={`absolute inset-1.5 rounded-xl border-2 ${activeBack.inner} flex flex-col items-center justify-center p-2 text-center`}>
          <div className={`w-10 h-10 rounded-full border ${activeBack.badge} flex items-center justify-center font-serif text-base shadow-[0_0_15px_rgba(245,158,11,0.2)]`}>
            {activeBack.icon}
          </div>
          <span className="text-[11px] uppercase font-black tracking-widest text-amber-400/90 mt-2 font-serif">
            {activeBack.title}
          </span>
          <span className="text-[9px] text-stone-500 font-mono mt-0.5">Mão Oponente</span>
        </div>
      </div>
    );
  }

  // Size styling dimensions
  const sizeClasses = {
    sm: 'w-28 h-44 text-[10px]',
    md: 'w-44 h-64 text-xs',
    lg: 'w-72 h-[420px] text-sm',
  }[size];

  const isSkill = card.type === 'skill';
  const isSeniel =
    !isSkill &&
    (card.templateId === 'n_seniel' ||
      card.templateId === 'n_saniel' ||
      (card.name.toLowerCase().includes('saniel') && !card.name.toLowerCase().includes('jurisdição')));
  const isArchangel =
    Boolean(card.isArchangel) ||
    Boolean(card.isRevealedFaleziel) ||
    hasAliancaAngiris ||
    card.templateId === 'n_zael' ||
    card.templateId === 'm_inariel' ||
    card.templateId === 'm_umael' ||
    card.templateId === 'n_seniel' ||
    card.templateId === 'n_saniel' ||
    card.templateId === 'n_polus' ||
    card.templateId === 'n_torvyx' ||
    card.templateId === 'm_fanx' ||
    card.templateId === 'g_kaliel' ||
    card.templateId === 'm_faleziel' ||
    card.name.toLowerCase().includes('kaliel') ||
    card.name.toLowerCase().includes('faleziel');
  const hasLevelSystem =
    !isSkill &&
    (card.tier === 5 || card.tier === 6) &&
    (card.level !== undefined ||
      isSeniel ||
      card.templateId === 'g_barao_well' ||
      card.templateId === 'm_licia' ||
      card.templateId === 'g_craff' ||
      card.templateId === 'm_titano' ||
      card.templateId === 'n_helio' ||
      card.templateId === 'g_lunario' ||
      card.templateId === 'm_bonetrus' ||
      card.templateId === 'g_kaliel' ||
      card.name.toLowerCase().includes('kaliel') ||
      card.templateId === 'n_o_sol' ||
      card.templateId === 'g_a_lua');
  const isLevel2 = !isSkill && card.level === 2;
  const isOSolLvl2 =
    isLevel2 &&
    (card.templateId === 'n_o_sol' || card.name.trim().toLowerCase().startsWith('o sol'));
  const isALuaLvl2 =
    isLevel2 &&
    (card.templateId === 'g_a_lua' || card.name.trim().toLowerCase().startsWith('a lua'));
  const isTier5 = card.tier === 5;
  const isTier6 = card.tier === 6;
  const isSilenced = card.silencedRounds > 0;
  const isEffectivelyDying = isDying || card.isDying;
  // EXCLUSIVELY Tier 5 and Tier 6 cards get Foil & Prismatic Sheen!
  const isFoilCard = foilEffects && (isTier5 || isTier6);

  // Kingdom styling colors
  const kingdomColor = {
    granty: 'text-amber-400',
    musmo: 'text-sky-400',
    naneya: 'text-emerald-400',
  }[card.kingdom] || 'text-stone-300';

  const kingdomLabel = {
    granty: 'Granty',
    musmo: 'Musmo',
    naneya: 'Naneya',
  }[card.kingdom] || 'Reino';

  const conditionBadges = getCardConditionItems(card);
  const hasBarreira = card.conditions.has('barreira') || (card.barreiraRoundsRemaining != null && card.barreiraRoundsRemaining > 0);
  const isAuroraIceBarreira = hasBarreira && (card.templateId === 'g_aurora' || card.element === 'Gelo');
  const hasCongelado = card.conditions.has('congelado') || (card.freezeRoundsRemaining != null && card.freezeRoundsRemaining > 0);
  const hasEletrificado = card.conditions.has('eletrificado') || (card.eletrificadoRoundsRemaining != null && card.eletrificadoRoundsRemaining > 0);
  const hasTorpor = card.conditions.has('entorpecer') || card.conditions.has('torpor') || (card.entorpecerRoundsRemaining != null && card.entorpecerRoundsRemaining > 0);
  const hasQueimadura = card.conditions.has('queimadura') || (card.burnTurnsRemaining != null && card.burnTurnsRemaining > 0);
  const hasPraga = card.conditions.has('praga') || (card.pragaRoundsRemaining != null && card.pragaRoundsRemaining > 0);
  const hasCorrosao = card.conditions.has('corrosao') || (card.corrosaoRoundsRemaining != null && card.corrosaoRoundsRemaining > 0);
  const hasSangramento = card.conditions.has('sangramento') || (card.sangramentoRoundsRemaining != null && card.sangramentoRoundsRemaining > 0);
  const hasEtereo = card.conditions.has('etereo');
  const hasImunidade = card.conditions.has('imunidade') || (card.immunedRounds != null && card.immunedRounds > 0);

  const forged = getForgedPalette(card.tier, {
    isLevel2,
    isFugaz: card.isFugaz,
    isSkill,
  });
  const medallionSizePx = size === 'sm' ? 26 : size === 'lg' ? 42 : 31;

  // Top-left Element/Skill Faceted Gem Medallion
  const renderElementOrSpeedMedallion = () => {
    if (isSkill) {
      const isSlow = card.speed === 'lenta';
      return (
        <FacetedGemMedallion
          topColor={isSlow ? '#ddd6fe' : '#bae6fd'}
          midColor={isSlow ? '#8b5cf6' : '#0ea5e9'}
          bottomColor={isSlow ? '#3b0764' : '#0369a1'}
          borderColor={isSlow ? 'rgba(139,92,246,0.65)' : 'rgba(56,189,248,0.65)'}
          sizePx={medallionSizePx}
          title={isSlow ? 'Habilidade Lenta' : 'Habilidade Rápida'}
        >
          <span className={`${size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-base' : 'text-[11px]'} leading-none select-none`}>
            {isSlow ? '⏳' : '🌪️'}
          </span>
          <span
            className={`font-black uppercase tracking-tight text-slate-200 leading-none ${
              size === 'sm' ? 'text-[5px]' : size === 'lg' ? 'text-[8px]' : 'text-[6px]'
            }`}
          >
            {isSlow ? 'LENTO' : 'RÁPIDO'}
          </span>
        </FacetedGemMedallion>
      );
    }

    let elemIcon = '🛡️';
    let elemText = card.element || 'Neutro';
    let elemTextColor = 'text-stone-300';
    let gemColors = { top: '#e2e8f0', mid: '#64748b', bottom: '#1e293b', glow: 'rgba(148,163,184,0.45)' };

    switch (card.element) {
      case 'Telúrico':
      case 'Terra':
        elemIcon = '🌿';
        elemText = 'Telúrico';
        elemTextColor = 'text-emerald-300';
        gemColors = { top: '#a7f3d0', mid: '#10b981', bottom: '#064e3b', glow: 'rgba(16,185,129,0.55)' };
        break;
      case 'Cósmico':
        elemIcon = '🧬';
        elemText = 'Cósmico';
        elemTextColor = 'text-indigo-300';
        gemColors = { top: '#c7d2fe', mid: '#6366f1', bottom: '#1e1b4b', glow: 'rgba(99,102,241,0.65)' };
        break;
      case 'Mágico':
        elemIcon = '✨';
        elemText = 'Mágico';
        elemTextColor = 'text-purple-300';
        gemColors = { top: '#e9d5ff', mid: '#a855f7', bottom: '#3b0764', glow: 'rgba(168,85,247,0.55)' };
        break;
      case 'Neutro':
        elemIcon = '⚜';
        elemText = 'Neutro';
        elemTextColor = 'text-stone-200';
        gemColors = { top: '#e7e5e4', mid: '#78716c', bottom: '#292524', glow: 'rgba(168,162,158,0.45)' };
        break;
      case 'Fogo':
        elemIcon = '🔥';
        elemText = 'Fogo';
        elemTextColor = 'text-rose-300';
        gemColors = { top: '#fecdd3', mid: '#f43f5e', bottom: '#881337', glow: 'rgba(244,63,94,0.55)' };
        break;
      case 'Água':
        elemIcon = '💧';
        elemText = 'Água';
        elemTextColor = 'text-sky-300';
        gemColors = { top: '#bae6fd', mid: '#0ea5e9', bottom: '#0c4a6e', glow: 'rgba(56,189,248,0.55)' };
        break;
      case 'Elétrico':
        elemIcon = '⚡';
        elemText = 'Elétrico';
        elemTextColor = 'text-amber-300';
        gemColors = { top: '#fef08a', mid: '#f59e0b', bottom: '#78350f', glow: 'rgba(251,191,36,0.55)' };
        break;
      case 'Gelo':
        elemIcon = '❄️';
        elemText = 'Gelo';
        elemTextColor = 'text-cyan-200';
        gemColors = { top: '#cffafe', mid: '#06b6d4', bottom: '#164e63', glow: 'rgba(6,182,212,0.65)' };
        break;
      case 'Divino':
        elemIcon = '⚜️';
        elemText = 'Divino';
        elemTextColor = 'text-amber-200';
        gemColors = { top: '#fef9c3', mid: '#fbbf24', bottom: '#92400e', glow: 'rgba(251,191,36,0.75)' };
        break;
      case 'Sombrio':
        elemIcon = '🌑';
        elemText = 'Sombrio';
        elemTextColor = 'text-fuchsia-300';
        gemColors = { top: '#f5d0fe', mid: '#c026d3', bottom: '#4a044e', glow: 'rgba(192,38,211,0.75)' };
        break;
    }

    return (
      <FacetedGemMedallion
        topColor={gemColors.top}
        midColor={gemColors.mid}
        bottomColor={gemColors.bottom}
        borderColor={gemColors.glow}
        sizePx={medallionSizePx}
        glowShadow={`0 0 8px ${gemColors.glow}`}
        title={`Elemento: ${card.element}`}
      >
        <span className={`${size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-base' : 'text-[11px]'} leading-none select-none`}>
          {elemIcon}
        </span>
        <span
          className={`font-black uppercase tracking-tight leading-none ${elemTextColor} ${
            size === 'sm' ? 'text-[5px]' : size === 'lg' ? 'text-[8px]' : 'text-[6px]'
          }`}
        >
          {elemText}
        </span>
      </FacetedGemMedallion>
    );
  };

  const isLvl2Art = card.level === 2;
  const isPackArt = card.templateId === 'pack_atormentador' || card.isPack;
  const artCandidates = getCardArtCandidates(card.templateId, {
    isLvl2: isLvl2Art,
    isRevealedFaleziel: card.isRevealedFaleziel,
    isPack: isPackArt,
    name: card.name,
  });
  const currentArtSrc = artCandidates[artCandidateIndex];
  const hasRealArt = !imageError && Boolean(currentArtSrc);
  const minBarHeightPx = size === 'sm' ? 28 : size === 'lg' ? 44 : 34;

  // Dedicated artwork or thematic fantasy scene
  const renderCardArtCenter = () => {
    if (hasRealArt && currentArtSrc) {
      return (
        <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#0e0c16]">
          <img
            key={currentArtSrc}
            src={currentArtSrc}
            alt={card.name}
            onLoad={(e) => {
              const { naturalWidth, naturalHeight } = e.currentTarget;
              if (naturalWidth > 0 && naturalHeight > 0) {
                setArtAspectRatio(naturalWidth / naturalHeight);
              }
            }}
            onError={() => {
              if (artCandidateIndex + 1 < artCandidates.length) {
                setArtCandidateIndex((idx) => idx + 1);
              } else {
                setImageError(true);
              }
            }}
            className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0b14]/45 via-transparent to-black/15 pointer-events-none" />
        </div>
      );
    }

    const thematic = getThematicCardArt(
      card.isRevealedFaleziel ? 'm_faleziel' : card.templateId,
      card.element,
      isSkill
    );
    const primaryIcon = isArchangel && !card.templateId.startsWith('g_lucent') && card.templateId !== 'n_kamui' ? '🪽' : thematic.icon;

    return (
      <div
        className={`absolute inset-0 bg-gradient-to-br ${thematic.backdropClass} flex flex-col items-center justify-center p-2 text-center select-none overflow-hidden`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background: `radial-gradient(circle at 50% 45%, ${thematic.glowColor}, transparent 68%)`,
          }}
        />
        <div
          className={`relative z-10 flex items-center justify-center rounded-full border-2 ${thematic.ringColor} bg-black/45 backdrop-blur-sm shadow-2xl ${
            size === 'sm' ? 'w-11 h-11' : size === 'lg' ? 'w-24 h-24' : 'w-14 h-14'
          }`}
          style={{ boxShadow: `0 0 18px ${thematic.glowColor}` }}
        >
          <span
            className={`${
              size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-5xl' : 'text-3xl'
            } filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] leading-none`}
          >
            {primaryIcon}
          </span>
          <span
            className={`absolute -bottom-1 -right-1 rounded-full bg-stone-950/90 border border-white/25 flex items-center justify-center ${
              size === 'sm' ? 'w-4 h-4 text-[8px]' : size === 'lg' ? 'w-7 h-7 text-sm' : 'w-5 h-5 text-[10px]'
            }`}
          >
            {thematic.secondaryRune}
          </span>
        </div>
        <span
          className={`relative z-10 font-serif tracking-wider font-bold text-stone-200/90 uppercase mt-1.5 drop-shadow ${
            size === 'sm' ? 'text-[6.5px]' : size === 'lg' ? 'text-[11px]' : 'text-[8.5px]'
          }`}
        >
          {thematic.tagLabel} · {kingdomLabel}
        </span>
      </div>
    );
  };

  // Level 1 progress label for all progressive cards
  const getLevel1ProgressLabel = () => {
    if (isSilenced) return 'NV 1 (SILENCIADO)';
    if (isSeniel) return `NV 1 (${card.attackCount || 0}/2)`;
    if (card.templateId === 'g_barao_well') return `NV 1 (${card.skillsUsedWhileAlive || 0}/2)`;
    if (card.templateId === 'm_titano') return `NV 1 (${card.levelUpProgress || 0}/3)`;
    if (card.templateId === 'g_lunario') return `NV 1 (${card.defendCount || 0}/2)`;
    if (card.templateId === 'g_kaliel') return 'NV 1 (3 ANGIRIS)';
    return 'NÍVEL 1';
  };

  return (
    <div
      onClick={!isEffectivelyDying && isPlayable && onClick ? onClick : (onInspect ? () => onInspect() : undefined)}
      onContextMenu={(e) => {
        if (onInspect) {
          e.preventDefault();
          onInspect(e);
        }
      }}
      className={`group relative select-none transition-all duration-300 overflow-hidden rounded-2xl ${
        size === 'sm' ? 'p-[2.5px]' : 'p-[3px]'
      } ${sizeClasses} tcg-card-3d celentia-forged-card ${showLevelUpAnim ? 'animate-card-levelup-ascension z-40' : ''} ${
        isEffectivelyDying
          ? 'scale-90 opacity-40 rotate-6 filter grayscale contrast-150 bg-red-950 transition-all duration-700'
          : isDiscarding
          ? 'scale-75 opacity-20 -translate-y-8 filter blur-[1px] transition-all duration-500'
          : isNewDrawn
          ? 'animate-in fade-in zoom-in-75 slide-in-from-bottom-4 duration-300 ring-2 ring-amber-400 shadow-amber-500/40'
          : isSelected
          ? 'ring-4 ring-amber-400 scale-105 shadow-[0_0_24px_rgba(251,191,36,0.75)] -translate-y-2'
          : isCombatAttacker
          ? 'ring-4 ring-red-500 shadow-[0_0_24px_rgba(239,68,68,0.75)] -translate-y-1.5'
          : isAssignedDefender
          ? 'ring-4 ring-blue-500 shadow-[0_0_24px_rgba(59,130,246,0.75)]'
          : isTargetCandidate || isTargetable
          ? 'ring-4 ring-emerald-400 animate-pulse cursor-pointer shadow-[0_0_24px_rgba(16,185,129,0.75)]'
          : !isPlayable
          ? 'opacity-65 filter grayscale-[30%] cursor-not-allowed'
          : 'hover:-translate-y-1.5 hover:shadow-[0_14px_32px_rgba(0,0,0,0.92)] cursor-pointer'
      }`}
      style={{
        background: forged.outerMetalGradient,
        boxShadow: forged.bezelShadow,
      }}
      title={unplayableReason || card.name}
    >
      {/* Inner Dark-Steel Engraved Card Chassis */}
      <div
        className="relative w-full h-full rounded-[13px] overflow-hidden flex flex-col justify-between bg-[#0c0a12]"
        style={{
          border: `1px solid ${forged.innerFrameBorder}`,
          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.9)',
        }}
      >
      {/* TCG Holographic Foil Sweep on Tier 5 and Prismatic Rainbow on Tier 6 */}
      {isTier6 ? (
        <div className="pointer-events-none absolute inset-0 z-25 tcg-prismatic-overlay" />
      ) : isFoilCard ? (
        <div className="pointer-events-none absolute inset-0 z-25 tcg-foil-overlay" />
      ) : null}

      {/* Universal Level-Up Ascension Effects Overlay (Shockwave + Light Beam + Floating Badge) */}
      {showLevelUpAnim && (
        <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden rounded-[13px]">
          <div className="absolute inset-0 bg-gradient-to-t from-amber-500/45 via-yellow-300/65 to-white/40 animate-levelup-beam mix-blend-screen" />
          <div className="absolute inset-2 rounded-xl border-4 border-amber-300 animate-levelup-shockwave shadow-[0_0_30px_rgba(251,191,36,1)]" />
          <div className="absolute top-1/2 left-1/2 animate-levelup-badge px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 text-stone-950 font-serif font-black text-[9px] tracking-wider uppercase shadow-[0_0_20px_rgba(251,191,36,1)] border border-white whitespace-nowrap">
            👑 NÍVEL 2!
          </div>
        </div>
      )}

      {/* Forged Celestial Filigree Corner Scrollwork */}
      <CardFiligreeCorners
        color={forged.filigreeStroke}
        glowColor={forged.filigreeGlow}
        sizeClass={size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'}
      />

      {/* Evolved Level 2 Imperial Sun Hairline Glow */}
      {isLevel2 && (
        <div className="absolute inset-[1.5px] rounded-[11px] border border-amber-300/55 pointer-events-none z-20 shadow-[inset_0_0_12px_rgba(251,191,36,0.35)]" />
      )}

      {/* Fugaz smoky pulsating vapor border & aura */}
      {card.isFugaz && (
        <div className="absolute inset-0 pointer-events-none z-20 rounded-[13px] border-2 border-amber-400/90 animate-pulse shadow-[inset_0_0_24px_rgba(245,158,11,0.55),0_0_30px_rgba(239,68,68,0.7)] mix-blend-screen bg-gradient-to-t from-amber-500/15 via-transparent to-red-500/15" />
      )}

      {/* ========================================================
          1. TOP HEADER (Forged Metal Plate + Faceted Medallions)
      ======================================================== */}
      <div
        className={`relative celentia-forged-engrave px-1.5 ${
          size === 'sm' ? 'py-0.5' : 'py-1'
        } flex items-center justify-between shrink-0 z-20`}
        style={{
          background: forged.headerBg,
          borderBottom: `1px solid ${forged.headerDividerColor}`,
        }}
      >
        <div className="shrink-0 flex items-center justify-center">
          {renderElementOrSpeedMedallion()}
        </div>

        <div className="flex-1 px-1 text-center min-w-0">
          <h3
            className={`font-serif font-black text-white tracking-tight truncate leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] ${
              size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-sm' : 'text-xs'
            }`}
            title={card.name}
          >
            {card.name}
          </h3>
          <div className="text-[7px] sm:text-[8px] font-sans font-medium text-stone-300/90 truncate leading-none mt-0.5">
            {isSkill ? 'Carta de habilidade' : isArchangel ? '🪽 Unidade Arcanjo' : 'Carta de Unidade'}
          </div>
          <div className={`text-[8px] sm:text-[9px] font-serif font-extrabold truncate leading-none mt-0.5 ${kingdomColor} drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]`}>
            {kingdomLabel}
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-center">
          <FacetedGemMedallion
            topColor={forged.gemTop}
            midColor={forged.gemMid}
            bottomColor={forged.gemBottom}
            borderColor={forged.filigreeGlow}
            sizePx={medallionSizePx}
            glowShadow={isTier6 || isTier5 ? `0 0 10px ${forged.filigreeGlow}` : undefined}
          >
            <span
              className={`font-serif font-black tracking-tight leading-none ${
                size === 'sm' ? 'text-[11px]' : size === 'lg' ? 'text-base' : 'text-[13px]'
              }`}
              style={{ color: isTier6 ? '#f9a8d4' : forged.textAccent }}
            >
              {card.tier}
            </span>
            <span
              className={`font-black uppercase tracking-wider leading-none mt-[1px] ${
                size === 'sm' ? 'text-[4.5px]' : size === 'lg' ? 'text-[7px]' : 'text-[5.5px]'
              }`}
              style={{ color: isTier6 ? '#f9a8d4' : forged.textAccent }}
            >
              {isTier6 ? 'SUP' : 'TIER'}
            </span>
          </FacetedGemMedallion>
        </div>

        <CardFiligreeDivider
          lineColor={forged.headerDividerColor}
          gemTop={forged.gemTop}
          gemMid={forged.gemMid}
          gemBottom={forged.gemBottom}
          gemSize={size === 'sm' ? 'xs' : size === 'lg' ? 'md' : 'sm'}
          positionClass="-bottom-[5px]"
        />
      </div>

      {/* ========================================================
          2. ADAPTIVE BODY (Exact-Fit Artwork + Dynamic Bottom Bar)
      ======================================================== */}
      <div className="relative flex-1 min-h-0 w-full flex flex-col overflow-hidden bg-[#0a0810]">
      <div
        className={`relative w-full bg-[#100e17] flex items-center justify-center overflow-hidden ${
          hasRealArt ? 'shrink-0' : 'flex-1 min-h-0'
        }`}
        style={
          hasRealArt
            ? {
                aspectRatio: `${artAspectRatio}`,
                maxHeight: `calc(100% - ${minBarHeightPx}px)`,
              }
            : undefined
        }
      >
        {renderCardArtCenter()}

        <div className="absolute inset-0 shadow-[inset_0_0_15px_rgba(0,0,0,0.7)] pointer-events-none" />

        {/* Persistent Condition Atmospheric Visuals on Card */}
        {hasImunidade && (
          <div className="pointer-events-none absolute inset-0 z-10 border-2 border-amber-300/75 shadow-[inset_0_0_18px_rgba(253,224,71,0.42)]" />
        )}
        {hasEtereo && (
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-tr from-cyan-500/20 via-indigo-400/15 to-sky-300/25 border border-cyan-300/60 shadow-[inset_0_0_16px_rgba(34,211,238,0.45)]" />
        )}
        {hasBarreira && (
          <div
            className={`pointer-events-none absolute inset-0 z-10 ${
              isAuroraIceBarreira
                ? 'border-2 border-cyan-200/85 bg-gradient-to-b from-cyan-200/25 via-transparent to-sky-300/25 shadow-[inset_0_0_18px_rgba(165,243,252,0.55)]'
                : 'border-2 border-sky-400/70 bg-sky-400/10 shadow-[inset_0_0_14px_rgba(56,189,248,0.45)]'
            }`}
          >
            {isAuroraIceBarreira && (
              <>
                <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] drop-shadow-[0_0_6px_#67e8f9]">❄️</span>
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/90" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white/90" />
              </>
            )}
          </div>
        )}
        {hasCongelado && (
          <div className="pointer-events-none absolute inset-0 z-10 condition-frost-aura bg-gradient-to-br from-cyan-200/35 via-sky-400/15 to-white/30 border-2 border-cyan-200/80 shadow-[inset_0_0_20px_rgba(103,232,249,0.6)]" />
        )}
        {hasQueimadura && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 z-10 bg-gradient-to-t from-orange-600/40 via-red-500/15 to-transparent animate-pulse" />
        )}
        {hasEletrificado && (
          <div className="pointer-events-none absolute inset-0 z-10 condition-electric-aura border-2 border-yellow-300/80" />
        )}
        {hasTorpor && (
          <div className="pointer-events-none absolute inset-0 z-10 condition-torpor-aura bg-gradient-to-br from-white/50 via-fuchsia-400/35 to-white/40 mix-blend-screen" />
        )}
        {hasPraga && (
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-lime-900/50 via-purple-900/25 to-transparent border-2 border-lime-400/75 shadow-[inset_0_0_16px_rgba(132,204,22,0.45)] animate-pulse" />
        )}
        {hasCorrosao && (
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-lime-500/30 via-emerald-900/20 to-lime-950/55 border-2 border-lime-300/85 shadow-[inset_0_0_18px_rgba(163,230,53,0.6)] animate-pulse" />
        )}
        {hasSangramento && (
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-rose-900/55 via-red-800/20 to-transparent border-2 border-rose-500/80 shadow-[inset_0_0_18px_rgba(244,63,94,0.65)] animate-pulse" />
        )}
        {card.imprisonedUnit && (
          <>
            <svg
              className="pointer-events-none absolute inset-0 w-full h-full z-20 opacity-90"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id={`barelio-chain-${card.instanceId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f0abfc" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#581c87" />
                </linearGradient>
              </defs>
              <path
                d="M 10 92 Q 35 50 50 8"
                fill="none"
                stroke={`url(#barelio-chain-${card.instanceId})`}
                strokeWidth="3.2"
                strokeDasharray="5 2.5"
              />
              <path
                d="M 90 92 Q 65 50 50 8"
                fill="none"
                stroke={`url(#barelio-chain-${card.instanceId})`}
                strokeWidth="3.2"
                strokeDasharray="5 2.5"
              />
            </svg>
            <div
              className="absolute top-1 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-purple-950/95 border border-fuchsia-400 text-fuchsia-100 font-black text-[7px] px-1.5 py-0.5 rounded shadow-[0_0_12px_rgba(168,85,247,0.95)] whitespace-nowrap"
              title={`Prisioneiro em correntes: ${card.imprisonedUnit.name} (${card.imprisonedUnit.hp}/${card.imprisonedUnit.maxHp} Vida)`}
            >
              <span>⛓️</span>
              <span>{card.imprisonedUnit.name.split(',')[0]} ({card.imprisonedUnit.hp}❤️)</span>
            </div>
          </>
        )}

        {/* Fugaz Special Badge */}
        {card.isFugaz && (
          <div
            className="absolute top-1 left-1 z-30 flex items-center gap-1 bg-gradient-to-r from-amber-600 via-orange-500 to-red-600 text-white font-black text-[7px] sm:text-[8px] px-1.5 py-0.5 rounded shadow-[0_0_12px_rgba(245,158,11,0.95)] border border-yellow-300 animate-pulse"
            title="FUGAZ: Esta carta desaparece no fim da rodada se não for usada!"
          >
            <span>⚡💨</span>
            <span>FUGAZ</span>
          </div>
        )}

        {/* Pack Special Badge */}
        {card.isPack && (
          <div
            className="absolute top-1 left-1 z-30 flex items-center gap-1 bg-gradient-to-r from-purple-700 via-fuchsia-600 to-indigo-700 text-white font-black text-[7px] sm:text-[8px] px-1.5 py-0.5 rounded shadow-[0_0_12px_rgba(168,85,247,0.9)] border border-purple-300"
            title="MINI-PACOTE: Ocupa 1 slot no baralho e se divide em Tor, Men e Tador no jogo!"
          >
            <span>📦</span>
            <span>3 EM 1</span>
          </div>
        )}

        {/* Legendary Level Indicator */}
        {hasLevelSystem && !card.isFugaz && !card.isPack && (
          <div className="absolute top-1 left-1 z-20 select-none">
            {isLevel2 ? (
              <div
                className={`flex items-center gap-1 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-500 text-stone-950 font-black rounded-md border border-yellow-100 shadow-[0_0_12px_rgba(251,191,36,0.95)] ${
                  size === 'sm' ? 'px-1 py-0.2 text-[7px]' : size === 'lg' ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-0.5 text-[8px]'
                }`}
                title={`${card.name} Nível 2 Desperto!`}
              >
                <span>👑</span>
                <span className="font-mono font-black tracking-wider">NÍVEL 2</span>
              </div>
            ) : (
              <div
                className={`flex items-center gap-1 bg-stone-900/95 text-stone-200 font-bold rounded-md border border-amber-400/60 shadow-[0_2px_6px_rgba(0,0,0,0.9)] ${
                  size === 'sm' ? 'px-1 py-0.2 text-[7px]' : size === 'lg' ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-0.5 text-[8px]'
                }`}
              >
                <span className="text-amber-400">★</span>
                <span className="font-mono tracking-tight text-amber-200">
                  {getLevel1ProgressLabel()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Top-Right Sculpted 3D Heart with Glowing Green HP (for non-Cosmic units) */}
        {card.type === 'unit' && card.element !== 'Cósmico' && (
          <div
            className={`absolute top-1 right-1 z-20 flex items-center justify-center select-none ${
              size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10'
            }`}
            title={isOSolLvl2 ? 'Vida em Escala Infinita (Imortal): ∞' : `Vida Atual / Máxima: ${card.hp}/${card.maxHp}`}
          >
            <svg viewBox="0 0 32 32" className="w-full h-full filter drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)]">
              <path
                d="M16 29s-13-8.5-13-17.5c0-4.5 3.5-7.5 8-7.5 3 0 5 2 5 2s2-2 5-2c4.5 0 8 3 8 7.5 0 9-13 17.5-13 17.5z"
                fill={isOSolLvl2 ? '#4c1d95' : '#7f1d1d'}
              />
              <path
                d="M16 28s-12-8-12-16.5c0-4 3-7 7.5-7 2.8 0 4.5 2 4.5 2s1.7-2 4.5-2c4.5 0 7.5 3 7.5 7 0 8.5-12 16.5-12 16.5z"
                fill={isOSolLvl2 ? '#9333ea' : '#dc2626'}
              />
              <ellipse cx="12" cy="10" rx="3.5" ry="2" fill="rgba(255,255,255,0.45)" transform="rotate(-25 12 10)" />
            </svg>
            <span
              className={`absolute font-mono font-black ${
                isOSolLvl2 ? 'text-amber-200 text-sm sm:text-base' : 'text-[#4ade80]'
              } drop-shadow-[0_2px_3px_rgba(0,0,0,1)] ${
                !isOSolLvl2 ? (size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-xs' : 'text-[11px]') : ''
              }`}
            >
              {isOSolLvl2 ? '∞' : `${card.hp}/${card.maxHp}`}
            </span>
          </div>
        )}

        {/* Bottom-Right Acquired Multiclass Badges */}
        {card.extraElements && card.extraElements.length > 0 && (
          <div
            className="absolute bottom-1.5 right-1 z-25 flex flex-wrap justify-end gap-0.5 max-w-[65%] pointer-events-auto"
            title={`Multiclasse: ${getCardClasses(card).join(' + ')}`}
          >
            {card.extraElements.map((extra) => {
              const cfg = ELEMENT_CONFIG[extra] || ELEMENT_CONFIG.Neutro;
              return (
                <span
                  key={extra}
                  className={`inline-flex items-center gap-0.5 rounded-full border ${cfg.border} ${cfg.bgBadge} ${cfg.textBadge} font-black uppercase shadow-lg ${
                    size === 'sm' ? 'px-1 py-0 text-[7px]' : size === 'lg' ? 'px-2 py-0.5 text-[10px]' : 'px-1.5 py-0.5 text-[8px]'
                  }`}
                >
                  <span>{cfg.icon}</span>
                  {size !== 'sm' && <span>+{cfg.name}</span>}
                </span>
              );
            })}
          </div>
        )}

        {/* Bottom-Left Crisp Square Condition Badges */}
        {conditionBadges.length > 0 && (
          <div className="absolute bottom-1.5 left-1.5 z-20 flex flex-wrap gap-1 max-w-[90%] pointer-events-auto">
            {conditionBadges.slice(0, 8).map((item) => (
              <span
                key={item.key}
                title={`${item.config.icon} ${item.config.name} (${item.config.categoryName})\nNatureza: ${item.sourceLabel}\n${item.config.shortDesc}`}
                className={`inline-flex items-center justify-center font-bold rounded-[2px] shadow-[0_2px_6px_rgba(0,0,0,0.95)] border-2 ${item.sourceBorderClass} ${item.sourceBgClass} ${item.sourceTextClass} transition-transform hover:scale-125 cursor-help ${
                  size === 'sm' ? 'w-4 h-4 text-[9px]' : size === 'lg' ? 'w-6 h-6 text-sm' : 'w-5 h-5 text-xs'
                }`}
              >
                <span className="leading-none">{item.config.icon}</span>
              </span>
            ))}
          </div>
        )}

        {/* Special Synergy / Status badges */}
        {hasAliancaAngiris && (
          <div
            className={`absolute ${
              hasLevelSystem ? 'top-6 sm:top-7' : 'top-1'
            } left-1 z-20 bg-amber-500 text-stone-950 font-black text-[7px] px-1 py-0.2 rounded shadow-[0_0_8px_rgba(245,158,11,0.8)] border border-amber-300`}
          >
            🪽 Angiris
          </div>
        )}

        {isSilenced && (
          <div
            className={`absolute ${
              hasLevelSystem && hasAliancaAngiris ? 'top-11 sm:top-12' : hasLevelSystem ? 'top-6 sm:top-7' : 'top-1'
            } left-1 z-20 bg-rose-600 text-white font-bold text-[7px] px-1 py-0.2 rounded shadow border border-rose-400`}
          >
            🔇 Silêncio ({card.silencedRounds}r)
          </div>
        )}

        {(actionLabel || badgeText) && isPlayable && !isAssignedDefender && (
          <div
            className={`pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 z-30 transition-opacity bg-amber-400 text-stone-950 font-black text-[7.5px] px-1.5 py-0.2 rounded-full shadow border border-yellow-100 uppercase ${
              isTouchDevice ? 'opacity-95' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {badgeText || actionLabel}
          </div>
        )}

        {onInspect && size !== 'lg' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInspect(e);
            }}
            className={`absolute top-1/2 right-1 -translate-y-1/2 z-35 rounded-full bg-stone-950/90 hover:bg-amber-500 text-amber-300 hover:text-stone-950 border border-amber-400/70 shadow-md flex items-center justify-center transition-opacity cursor-pointer ${
              size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'
            } ${isTouchDevice ? 'opacity-90' : 'opacity-0 group-hover:opacity-100'}`}
            title={`Inspecionar ${card.name}`}
            aria-label={`Inspecionar ${card.name}`}
          >
            <Eye size={size === 'sm' ? 11 : 13} />
          </button>
        )}

        {hasOVazioActive && (isOSolLvl2 || isALuaLvl2) && (
          <div className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 z-35 px-1.5 py-0.5 rounded-full bg-black/90 border border-purple-400 text-purple-200 font-black text-[7px] tracking-wider uppercase shadow-[0_0_12px_rgba(168,85,247,0.9)] animate-pulse whitespace-nowrap">
            🌌 O VAZIO
          </div>
        )}

      </div>

      {/* ========================================================
          3. ADAPTIVE BOTTOM BAR (Forged Metal Engraved Stat Wells)
      ======================================================== */}
      {card.type === 'unit' ? (
        card.element === 'Cósmico' ? (
          <div
            className={`relative z-25 w-full ${
              hasRealArt ? 'flex-1' : 'shrink-0'
            } celentia-forged-engrave grid grid-cols-2 gap-1 p-1 text-center shadow-[0_-4px_14px_rgba(0,0,0,0.8)]`}
            style={{
              minHeight: `${minBarHeightPx}px`,
              background: 'linear-gradient(180deg, #1d193d 0%, #100e26 55%, #090818 100%)',
              borderTop: `1px solid ${forged.headerDividerColor}`,
            }}
          >
            <CardFiligreeDivider
              lineColor="rgba(129, 140, 248, 0.55)"
              gemTop="#e0e7ff"
              gemMid="#6366f1"
              gemBottom="#312e81"
              gemSize={size === 'sm' ? 'xs' : 'sm'}
              positionClass="-top-[5px]"
            />
            <div
              className="flex flex-col items-center justify-center px-1 rounded-md border"
              style={{ backgroundColor: 'rgba(15, 13, 40, 0.85)', borderColor: 'rgba(129, 140, 248, 0.35)' }}
              title={`Sapiência (Vida e Resistência Cósmica): ${card.hp}/${card.maxHp}`}
            >
              <div className="flex items-center gap-0.5 leading-none">
                <span className={`text-indigo-300 select-none drop-shadow leading-none ${size === 'lg' ? 'text-xs' : 'text-[9px]'}`}>🔮</span>
                <span className={`font-black uppercase tracking-wider text-indigo-300 leading-none ${size === 'lg' ? 'text-[9px]' : 'text-[6.5px] sm:text-[7.5px]'}`}>Sapiência</span>
              </div>
              <span className={`font-mono font-black tabular-nums text-indigo-100 leading-none mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] ${size === 'sm' ? 'text-[11px]' : size === 'lg' ? 'text-base' : 'text-sm'}`}>
                {isALuaLvl2 ? <span className="text-pink-300 font-extrabold">∞</span> : card.hp}
              </span>
            </div>

            <div
              className="flex flex-col items-center justify-center px-1 rounded-md border"
              style={{ backgroundColor: 'rgba(15, 13, 40, 0.85)', borderColor: 'rgba(251, 191, 36, 0.32)' }}
              title={`Poder (Dano Cósmico): ${card.power}`}
            >
              <div className="flex items-center gap-0.5 leading-none">
                <span className={`text-amber-400 select-none drop-shadow leading-none ${size === 'lg' ? 'text-xs' : 'text-[9px]'}`}>⚡</span>
                <span className={`font-black uppercase tracking-wider text-amber-300 leading-none ${size === 'lg' ? 'text-[9px]' : 'text-[6.5px] sm:text-[7.5px]'}`}>Poder</span>
              </div>
              <span className={`font-mono font-black tabular-nums text-amber-200 leading-none mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] ${size === 'sm' ? 'text-[11px]' : size === 'lg' ? 'text-base' : 'text-sm'}`}>
                {isALuaLvl2 ? <span className="text-pink-300 font-extrabold">∞</span> : card.power}
              </span>
            </div>
          </div>
        ) : (
          <div
            className={`relative z-25 w-full ${
              hasRealArt ? 'flex-1' : 'shrink-0'
            } celentia-forged-engrave grid grid-cols-3 gap-1 p-1 text-center shadow-[0_-4px_14px_rgba(0,0,0,0.85)]`}
            style={{
              minHeight: `${minBarHeightPx}px`,
              background: forged.footerBg,
              borderTop: `1px solid ${forged.headerDividerColor}`,
            }}
          >
            <CardFiligreeDivider
              lineColor={forged.headerDividerColor}
              gemTop={forged.gemTop}
              gemMid={forged.gemMid}
              gemBottom={forged.gemBottom}
              gemSize={size === 'sm' ? 'xs' : 'sm'}
              positionClass="-top-[5px]"
            />
            <div
              className="flex flex-col items-center justify-center rounded-md border"
              style={{ backgroundColor: forged.statWellBg, borderColor: forged.statWellBorder }}
              title={
                isOSolLvl2
                  ? 'Ataque em Escala Infinita: ∞'
                  : card.element === 'Mágico'
                  ? card.atk > 0
                    ? `Ataque: ${card.atk} (somado integralmente ao Poder/Dano Real)`
                    : 'Ataque: 0 (Dano = 100% Poder + Ataque recebido)'
                  : `Ataque: ${card.atk}`
              }
            >
              <span className={`text-stone-300 leading-none select-none drop-shadow ${size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-xs' : 'text-[10px]'}`}>⚔️</span>
              <span className={`font-mono font-black tabular-nums text-white leading-none mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] ${size === 'sm' ? 'text-[11px]' : size === 'lg' ? 'text-base' : 'text-sm'}`}>
                {isOSolLvl2 ? (
                  <span className="text-amber-300 font-extrabold">∞</span>
                ) : (
                  card.atk
                )}
              </span>
            </div>

            <div
              className="flex flex-col items-center justify-center rounded-md border"
              style={{ backgroundColor: forged.statWellBg, borderColor: forged.statWellBorder }}
              title={isOSolLvl2 ? 'Defesa em Escala Infinita (Imortal): ∞' : `Defesa: ${card.def}`}
            >
              <span className={`text-sky-400 leading-none select-none drop-shadow ${size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-xs' : 'text-[10px]'}`}>🛡️</span>
              <span className={`font-mono font-black tabular-nums text-white leading-none mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] ${size === 'sm' ? 'text-[11px]' : size === 'lg' ? 'text-base' : 'text-sm'}`}>
                {isOSolLvl2 ? <span className="text-amber-300 font-extrabold">∞</span> : card.def}
              </span>
            </div>

            <div
              className="flex flex-col items-center justify-center rounded-md border"
              style={{ backgroundColor: forged.statWellBg, borderColor: forged.statWellBorder }}
              title={isOSolLvl2 ? 'Poder em Escala Infinita: ∞' : `Poder: ${card.power}`}
            >
              <span className={`text-amber-400 leading-none select-none drop-shadow ${size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-xs' : 'text-[10px]'}`}>⚡</span>
              <span className={`font-mono font-black tabular-nums text-white leading-none mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] ${size === 'sm' ? 'text-[11px]' : size === 'lg' ? 'text-base' : 'text-sm'}`}>
                {isOSolLvl2 ? <span className="text-amber-300 font-extrabold">∞</span> : card.power}
              </span>
            </div>
          </div>
        )
      ) : (
        <div
          className={`relative z-25 w-full ${
            hasRealArt ? 'flex-1' : 'shrink-0'
          } celentia-forged-engrave flex items-center justify-center px-2 shadow-[0_-4px_14px_rgba(0,0,0,0.75)]`}
          style={{
            minHeight: `${minBarHeightPx}px`,
            background: forged.footerBg,
            borderTop: `1px solid ${forged.headerDividerColor}`,
          }}
        >
          <CardFiligreeDivider
            lineColor={forged.headerDividerColor}
            gemTop={forged.gemTop}
            gemMid={forged.gemMid}
            gemBottom={forged.gemBottom}
            gemSize={size === 'sm' ? 'xs' : 'sm'}
            positionClass="-top-[5px]"
          />
          <div className="w-full flex items-center justify-center gap-1.5">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-sky-400/40 to-sky-300/70" />
            <div className="flex items-center gap-1 shrink-0 px-2 py-0.5 rounded border border-sky-400/25 bg-black/45">
              <span className={`${size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-sm' : 'text-[11px]'} leading-none select-none`}>
                {card.speed === 'lenta' ? '⏳' : '🌪️'}
              </span>
              <span
                className={`font-serif font-black uppercase tracking-wider text-sky-200/95 leading-none ${
                  size === 'sm' ? 'text-[7.5px]' : size === 'lg' ? 'text-xs' : 'text-[9px]'
                }`}
              >
                {size === 'sm'
                  ? card.speed === 'lenta'
                    ? 'Lenta'
                    : 'Rápida'
                  : card.speed === 'lenta'
                  ? 'Habilidade Lenta'
                  : 'Habilidade Rápida'}
              </span>
            </div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-sky-400/40 to-sky-300/70" />
          </div>
        </div>
      )}
      </div>
      </div>

      {/* Target/Blocker Banner */}
      {isAssignedDefender && (
        <div className="absolute top-0 inset-x-0 bg-blue-600 text-white text-[9px] font-black text-center py-0.5 shadow-md z-30">
          Defendendo: {assignedToAttackerName || 'Ataque'}
        </div>
      )}
    </div>
  );
};
