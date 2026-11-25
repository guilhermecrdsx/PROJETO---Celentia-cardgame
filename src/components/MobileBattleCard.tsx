import React, { useEffect, useState } from 'react';
import { Eye, Lock, Sparkles, Swords, Shield, Flame } from 'lucide-react';
import { CardInstance } from '../types/game';
import {
  TIER_CONFIG,
  ELEMENT_CONFIG,
  getCardArtCandidates,
  advanceCardArtFallback,
  getThematicCardArt,
} from '../utils/cardVisuals';
import { getCardConditionItems } from '../utils/conditionEffectsConfig';
import { calculateCardCombatResistance, getEffectivePower } from '../logic/combat';
import { getForgedPalette } from '../utils/cardForgeTheme';
import { CardFiligreeCorners } from './CardFiligreeSVG';

interface MobileBattleCardProps {
  card: CardInstance;
  variant: 'board' | 'hand';
  board?: CardInstance[];
  votoSilencioActive?: boolean;
  isPlayable?: boolean;
  unplayableReason?: string;
  isSelected?: boolean;
  isAssignedDefender?: boolean;
  assignedToAttackerName?: string;
  hasAliancaAngiris?: boolean;
  hasOVazioActive?: boolean;
  hasZykExtraAttack?: boolean;
  actionLabel?: string;
  onClick?: () => void;
  onInspect?: (e: React.MouseEvent) => void;
}

const SHORT_LOCK_REASON = (reason?: string, tier?: number): string => {
  if (!reason) return 'Bloq.';
  const lower = reason.toLowerCase();
  if (lower.includes('rodada') || lower.includes('tier')) return `T${tier ?? '?'}🔒`;
  if (lower.includes('limite') || lower.includes('invoca')) return 'Max';
  if (lower.includes('turno') || lower.includes('aguarde')) return 'Vez';
  if (lower.includes('defesa')) return 'Def.';
  if (lower.includes('contra-resposta') || lower.includes('veto')) return 'Resp.';
  if (lower.includes('hélio') || lower.includes('helio')) return 'Hélio2';
  if (lower.includes('lunário') || lower.includes('lunario')) return 'Lun.2';
  if (lower.includes('sacrif')) return 'Sacr.';
  if (lower.includes('peça')) return '1/Rod';
  return 'Bloq.';
};

export const MobileBattleCard: React.FC<MobileBattleCardProps> = ({
  card,
  variant,
  votoSilencioActive = false,
  isPlayable = true,
  unplayableReason,
  isSelected = false,
  isAssignedDefender = false,
  assignedToAttackerName,
  hasAliancaAngiris = false,
  hasOVazioActive = false,
  hasZykExtraAttack = false,
  actionLabel,
  onClick,
  onInspect,
}) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [card.instanceId, card.templateId, card.level, card.isRevealedFaleziel, card.name]);

  const elementCfg = ELEMENT_CONFIG[card.element] || ELEMENT_CONFIG.Neutro;
  const isSkill = card.type === 'skill';
  const isCosmic = card.element === 'Cósmico';
  const forged = getForgedPalette(card.tier, {
    isLevel2: !isSkill && card.level === 2,
    isFugaz: card.isFugaz,
    isSkill,
  });

  const artCandidates = getCardArtCandidates(card.templateId, {
    isLvl2: card.level === 2,
    isRevealedFaleziel: card.isRevealedFaleziel,
    isPack: card.isPack,
    name: card.name,
  });
  const thematicFallback = getThematicCardArt(card.templateId, card.element, isSkill);
  const currentArtUrl = artCandidates[0] || '';

  const conditionItems = isSkill ? [] : getCardConditionItems(card);
  const visibleConditions = conditionItems.slice(0, 4);
  const extraConditionsCount = Math.max(0, conditionItems.length - 4);

  const effectivePower = isSkill ? card.power : getEffectivePower(card, votoSilencioActive);
  const effectiveDefense = isSkill
    ? card.def
    : calculateCardCombatResistance(card, votoSilencioActive);

  const isDamaged = !isSkill && card.hp < card.maxHp;
  const isBuffedAtk = !isSkill && card.atk > card.baseAtk;
  const isBuffedDef = !isSkill && effectiveDefense > card.baseDef;
  const isBuffedPow = !isSkill && effectivePower > card.basePower;

  const sizeClass =
    variant === 'board'
      ? 'w-[66px] h-[94px] sm:w-[78px] sm:h-[110px]'
      : 'w-[70px] h-[92px] sm:w-[82px] sm:h-[104px]';

  // Non-hue-only visual border & elevation state
  const stateRingClass = isSelected
    ? 'ring-2 ring-amber-400/95 shadow-[0_0_16px_rgba(251,191,36,0.75)] -translate-y-0.5'
    : isAssignedDefender
    ? 'ring-2 ring-cyan-400/95 shadow-[0_0_16px_rgba(34,211,238,0.7)] -translate-y-0.5'
    : hasZykExtraAttack
    ? 'ring-1 ring-purple-400/85 shadow-[0_0_14px_rgba(168,85,247,0.68)]'
    : hasOVazioActive
    ? 'ring-1 ring-fuchsia-400 shadow-[0_0_12px_rgba(192,38,211,0.55)]'
    : variant === 'hand' && isPlayable
    ? 'ring-1 ring-emerald-400/85 shadow-[0_4px_14px_rgba(16,185,129,0.3)]'
    : variant === 'hand' && !isPlayable
    ? 'opacity-75 grayscale-[25%]'
    : 'shadow-[0_4px_12px_rgba(0,0,0,0.85)]';

  const speedMeta = card.isFugaz
    ? { label: '⚡Fugaz', cls: 'bg-cyan-950/90 text-cyan-200 border-cyan-400/60' }
    : card.speed === 'rapida'
    ? { label: '🌪️Ráp.', cls: 'bg-amber-950/90 text-amber-200 border-amber-400/60' }
    : { label: '⏳Lenta', cls: 'bg-purple-950/90 text-purple-200 border-purple-400/60' };

  const tierPillBg: Record<number, string> = {
    1: 'bg-stone-800/95 text-stone-200 border-stone-400/60',
    2: 'bg-emerald-950/95 text-emerald-200 border-emerald-400/70',
    3: 'bg-sky-950/95 text-sky-200 border-sky-400/70',
    4: 'bg-purple-950/95 text-purple-200 border-purple-400/70',
    5: 'bg-amber-950/95 text-amber-200 border-amber-400/80',
    6: 'bg-fuchsia-950/95 text-fuchsia-200 border-fuchsia-300/90',
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      title={
        unplayableReason
          ? `${card.name} — ${unplayableReason}`
          : assignedToAttackerName
          ? `${card.name} (Defendendo ${assignedToAttackerName})`
          : card.name
      }
      className={`group relative ${sizeClass} rounded-xl p-[2px] overflow-hidden select-none shrink-0 transition-all duration-150 cursor-pointer active:scale-95 ${stateRingClass}`}
      style={{
        background: forged.outerMetalGradient,
      }}
    >
      <div
        className="relative w-full h-full rounded-[10px] overflow-hidden bg-stone-950 flex flex-col justify-between"
        style={{
          border: `1px solid ${forged.innerFrameBorder}`,
        }}
      >
        <CardFiligreeCorners color={forged.filigreeStroke} sizeClass="w-2.5 h-2.5" />

        {/* Background Art Layer */}
        <div className="absolute inset-0 bg-gradient-to-b from-stone-900 via-stone-950 to-black">
          {!imageError && currentArtUrl ? (
            <img
              src={currentArtUrl}
              alt={card.name}
              draggable={false}
              onError={(e) => {
                const advanced = advanceCardArtFallback(e.currentTarget, artCandidates);
                if (!advanced) {
                  setImageError(true);
                }
              }}
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center ${thematicFallback.backdropClass} opacity-90`}
            >
              <span className="text-xl drop-shadow">{thematicFallback.icon || elementCfg.icon}</span>
            </div>
          )}
          {/* High-contrast legibility scrims top & bottom */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-black/85 via-black/45 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-black via-black/92 to-transparent" />
        </div>

        {/* TOP OVERLAY: Tier, Element, Level & Inspect */}
        <div className="relative z-10 w-full flex items-start justify-between p-0.5 gap-0.5">
          <div className="flex items-center gap-0.5 min-w-0">
            <span
              className={`px-1 py-[1px] rounded text-[8px] font-mono font-black leading-none border tabular-nums shadow ${
                tierPillBg[card.tier] || tierPillBg[1]
              }`}
            >
              T{card.tier}
            </span>
            <span
              className="w-3.5 h-3.5 rounded bg-black/80 border border-white/20 flex items-center justify-center text-[8px] leading-none shrink-0"
              title={card.element}
            >
              {elementCfg.icon}
            </span>
            {!isSkill && card.level === 2 && (
              <span
                className="px-1 py-[1px] rounded bg-amber-400 text-stone-950 text-[7px] font-black leading-none shadow"
                title="Nível 2"
              >
                ★2
              </span>
            )}
            {hasAliancaAngiris && (
              <span
                className="w-3.5 h-3.5 rounded bg-amber-500/90 text-stone-950 flex items-center justify-center text-[8px] leading-none shadow"
                title="Aliança Angiris Ativa"
              >
                🪽
              </span>
            )}
          </div>

          {/* Dedicated Inspect Button on board cards so players can read details even when selectable */}
          {variant === 'board' && onInspect && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInspect(e);
              }}
              aria-label={`Inspecionar ${card.name}`}
              title={`Ver detalhes de ${card.name}`}
              className="w-4 h-4 sm:w-[18px] sm:h-[18px] rounded-md bg-black/80 hover:bg-amber-500 text-amber-200 hover:text-stone-950 border border-amber-400/50 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            >
              <Eye size={9} />
            </button>
          )}

          {/* Hand Playable / Lock indicator */}
          {variant === 'hand' && !isPlayable && (
            <span className="px-1 py-[1px] rounded bg-stone-950/90 border border-rose-500/50 text-rose-300 text-[7px] font-mono font-bold leading-none flex items-center gap-0.5 shrink-0">
              <Lock size={7} />
              {SHORT_LOCK_REASON(unplayableReason, card.tier)}
            </span>
          )}
          {variant === 'hand' && isPlayable && (
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/95 text-stone-950 flex items-center justify-center shadow-[0_0_6px_rgba(16,185,129,0.9)] shrink-0">
              <Sparkles size={8} />
            </span>
          )}
        </div>

        {/* MIDDLE OVERLAY: Action Ribbon / Conditions Strip */}
        <div className="relative z-10 flex flex-col items-center justify-center px-0.5 gap-0.5 my-auto pointer-events-none">
          {actionLabel && (
            <div
              className={`px-1.5 py-[1px] rounded-full text-[7px] sm:text-[8px] font-serif font-black uppercase tracking-wider border shadow-md flex items-center gap-0.5 ${
                actionLabel === 'Remover'
                  ? 'bg-rose-600/95 text-white border-rose-200'
                  : actionLabel === 'Atacar'
                  ? 'bg-amber-400/95 text-stone-950 border-amber-100'
                  : 'bg-cyan-400/95 text-stone-950 border-cyan-100'
              }`}
            >
              {actionLabel === 'Atacar' && <Swords size={7} />}
              {(actionLabel === 'Defender' || actionLabel === 'Bloquear') && <Shield size={7} />}
              <span>{actionLabel}</span>
            </div>
          )}

          {isAssignedDefender && assignedToAttackerName && !actionLabel && (
            <div className="max-w-full px-1 py-[1px] rounded bg-cyan-950/95 border border-cyan-300/70 text-[7px] font-bold text-cyan-200 truncate">
              🛡️ {assignedToAttackerName}
            </div>
          )}

          {hasZykExtraAttack && !actionLabel && (
            <div className="px-1 py-[1px] rounded bg-purple-950/90 border border-purple-300/70 text-[7px] font-bold text-purple-200 flex items-center gap-0.5">
              <Flame size={7} className="text-purple-300" />
              <span>+1 Atq</span>
            </div>
          )}

          {visibleConditions.length > 0 && (
            <div className="flex items-center justify-center flex-wrap gap-0.5 max-w-full">
              {visibleConditions.map((cond) => (
                <span
                  key={cond.key}
                  className="px-[3px] py-[0.5px] rounded bg-black/85 border border-white/25 text-[8px] leading-none shadow-sm"
                  title={cond.config.name}
                >
                  {cond.config.icon}
                </span>
              ))}
              {extraConditionsCount > 0 && (
                <span className="px-1 py-[0.5px] rounded bg-amber-950/90 border border-amber-400/60 text-[7px] font-mono font-black text-amber-200 leading-none">
                  +{extraConditionsCount}
                </span>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM OVERLAY: Crisp Nameplate + Forged Stat Plaque */}
        <div
          className="relative z-10 w-full px-1 pb-1 pt-0.5 flex flex-col gap-0.5"
          style={{ borderTop: `1px solid ${forged.headerDividerColor}` }}
        >
          <div className="w-full text-center">
            <span className="block text-[8px] sm:text-[9px] font-serif font-black text-white leading-tight truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
              {card.name}
            </span>
          </div>

          {isSkill ? (
            <div className="w-full flex items-center justify-center gap-0.5">
              <span
                className={`px-1.5 py-[1px] rounded border text-[7px] sm:text-[8px] font-mono font-black leading-none flex items-center gap-0.5 ${speedMeta.cls}`}
              >
                {speedMeta.label}
              </span>
            </div>
          ) : (
            <div
              className="w-full grid grid-cols-4 gap-[2px] rounded-md px-[2px] py-[2px] font-mono tabular-nums border"
              style={{
                backgroundColor: forged.statWellBg,
                borderColor: forged.statWellBorder,
              }}
            >
              {/* HP / SAP */}
              <div className="flex flex-col items-center leading-none" title={isCosmic ? 'Sapiência' : 'Vida'}>
                <span className="text-[5.5px] font-sans font-bold uppercase text-stone-400">
                  {isCosmic ? 'SAP' : 'HP'}
                </span>
                <span
                  className={`text-[8px] sm:text-[9px] font-black ${
                    isDamaged
                      ? 'text-rose-400'
                      : isCosmic
                      ? 'text-fuchsia-300'
                      : 'text-emerald-300'
                  }`}
                >
                  {isCosmic && card.sapience !== undefined ? card.sapience : card.hp}
                </span>
              </div>

              {/* ATK */}
              <div className="flex flex-col items-center leading-none" title="Ataque">
                <span className="text-[5.5px] font-sans font-bold uppercase text-stone-400">ATK</span>
                <span
                  className={`text-[8px] sm:text-[9px] font-black ${
                    isBuffedAtk ? 'text-amber-300' : 'text-orange-200'
                  }`}
                >
                  {card.atk}
                </span>
              </div>

              {/* DEF */}
              <div className="flex flex-col items-center leading-none" title="Defesa">
                <span className="text-[5.5px] font-sans font-bold uppercase text-stone-400">DEF</span>
                <span
                  className={`text-[8px] sm:text-[9px] font-black ${
                    isBuffedDef ? 'text-cyan-300' : 'text-sky-200'
                  }`}
                >
                  {effectiveDefense}
                </span>
              </div>

              {/* POD */}
              <div className="flex flex-col items-center leading-none" title="Poder">
                <span className="text-[5.5px] font-sans font-bold uppercase text-stone-400">POD</span>
                <span
                  className={`text-[8px] sm:text-[9px] font-black ${
                    votoSilencioActive && card.votoSilencioSavedPower !== undefined
                      ? 'text-stone-400'
                      : isBuffedPow
                      ? 'text-fuchsia-300'
                      : 'text-purple-200'
                  }`}
                >
                  {effectivePower}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
