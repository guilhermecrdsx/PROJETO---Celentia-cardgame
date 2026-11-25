import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CardInstance } from '../types/game';
import { getCardClasses } from '../logic/combat';
import { ELEMENT_CONFIG } from '../utils/cardVisuals';
import { getForgedPalette } from '../utils/cardForgeTheme';
import { getCardConditionItems } from '../utils/conditionEffectsConfig';
import { FormattedCardDescription } from './FormattedCardDescription';

export interface ArenaCardHoverPreviewProps {
  card: CardInstance | null;
  anchorRect: DOMRect | null;
  hasAliancaAngiris?: boolean;
  zone?: 'board' | 'hand';
}

interface FloatingPosition {
  left: number;
  top: number;
  side: 'right' | 'left';
  arrowTop: number;
}

const PANEL_WIDTH = 288;
const GAP_PX = 14;
const VIEWPORT_MARGIN = 12;

export const ArenaCardHoverPreview: React.FC<ArenaCardHoverPreviewProps> = ({
  card,
  anchorRect,
  hasAliancaAngiris = false,
  zone = 'board',
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<FloatingPosition | null>(null);

  const conditionItems = useMemo(() => {
    if (!card) return [];
    return getCardConditionItems(card, true);
  }, [card]);

  const cardClasses = useMemo(() => {
    if (!card) return [];
    return getCardClasses(card);
  }, [card]);

  useLayoutEffect(() => {
    if (!card || !anchorRect || typeof window === 'undefined') {
      setPos(null);
      return;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const effectiveWidth = Math.min(PANEL_WIDTH, vw - VIEWPORT_MARGIN * 2);
    const panelHeight = panelRef.current?.offsetHeight || 260;

    const spaceRight = vw - anchorRect.right - GAP_PX;
    const spaceLeft = anchorRect.left - GAP_PX;
    const side: 'right' | 'left' =
      spaceRight >= effectiveWidth || spaceRight >= spaceLeft ? 'right' : 'left';

    let left =
      side === 'right'
        ? anchorRect.right + GAP_PX
        : anchorRect.left - effectiveWidth - GAP_PX;

    left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - effectiveWidth - VIEWPORT_MARGIN));

    const anchorCenterY = anchorRect.top + anchorRect.height / 2;
    const rawTop = anchorCenterY - panelHeight / 2;
    const maxTop = Math.max(VIEWPORT_MARGIN, vh - panelHeight - VIEWPORT_MARGIN);
    const top = Math.max(VIEWPORT_MARGIN, Math.min(rawTop, maxTop));

    const arrowTop = Math.max(20, Math.min(panelHeight - 20, anchorCenterY - top));

    setPos({ left, top, side, arrowTop });
  }, [card, anchorRect, conditionItems.length]);

  if (!card || !anchorRect || typeof document === 'undefined') {
    return null;
  }

  const isLevel2 = card.type === 'unit' && card.level === 2;
  const isSkill = card.type === 'skill';
  const palette = getForgedPalette(card.tier, {
    isLevel2,
    isFugaz: Boolean(card.isFugaz),
    isSkill,
  });
  const elemMeta = ELEMENT_CONFIG[card.element];
  const isSilenced = card.silencedRounds > 0;

  const levelLabel = isSkill
    ? card.speed === 'rapida'
      ? card.isFugaz
        ? 'Rápida · Fugaz'
        : 'Habilidade Rápida'
      : card.isFugaz
      ? 'Lenta · Fugaz'
      : 'Habilidade Lenta'
    : isLevel2
    ? 'Nível 2 · Despertada'
    : 'Nível 1';

  const fallbackLeft =
    anchorRect.right + GAP_PX + PANEL_WIDTH <= window.innerWidth - VIEWPORT_MARGIN
      ? anchorRect.right + GAP_PX
      : Math.max(VIEWPORT_MARGIN, anchorRect.left - PANEL_WIDTH - GAP_PX);
  const fallbackTop = Math.max(VIEWPORT_MARGIN, anchorRect.top);
  const resolvedSide = pos?.side ?? (fallbackLeft >= anchorRect.right ? 'right' : 'left');

  return createPortal(
    <div
      ref={panelRef}
      key={card.instanceId}
      className="fixed z-[65] pointer-events-none select-none animate-arena-hover-in"
      style={
        {
          left: `${pos ? pos.left : fallbackLeft}px`,
          top: `${pos ? pos.top : fallbackTop}px`,
          width: `${Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2)}px`,
          '--hover-slide-x': resolvedSide === 'right' ? '-6px' : '6px',
        } as React.CSSProperties
      }
      role="tooltip"
    >
      {/* Lateral Directional Pointer Notch */}
      <div
        className="absolute w-2.5 h-2.5 rotate-45 bg-[#120e1e]"
        style={{
          top: `${(pos?.arrowTop ?? 36) - 5}px`,
          ...(resolvedSide === 'right'
            ? {
                left: '-5px',
                borderLeft: `1.5px solid ${palette.filigreeStroke}`,
                borderBottom: `1.5px solid ${palette.filigreeStroke}`,
              }
            : {
                right: '-5px',
                borderRight: `1.5px solid ${palette.filigreeStroke}`,
                borderTop: `1.5px solid ${palette.filigreeStroke}`,
              }),
        }}
        aria-hidden="true"
      />

      {/* Forged Celestial Plaque */}
      <div
        className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#171225]/96 via-[#100d1b]/97 to-[#090710]/98 backdrop-blur-md text-stone-100"
        style={{
          border: `1.5px solid ${palette.innerFrameBorder}`,
          boxShadow: `0 18px 42px rgba(0, 0, 0, 0.92), 0 0 20px ${palette.filigreeGlow}`,
        }}
      >
        {/* Top Metallic Accent Hairline */}
        <div
          className="h-[2.5px] w-full"
          style={{ background: palette.outerMetalGradient }}
        />

        <div className="p-3.5 space-y-2.5">
          {/* Header: Name, Level & Metadata */}
          <div className="space-y-1 border-b border-white/10 pb-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-serif font-black text-sm leading-tight text-stone-50">
                {card.name}
              </h4>
              <span
                className={`text-[10px] font-mono font-extrabold uppercase tracking-wider shrink-0 whitespace-nowrap ${
                  isLevel2
                    ? 'text-amber-300'
                    : isSkill && card.speed === 'rapida'
                    ? 'text-cyan-300'
                    : isSkill
                    ? 'text-purple-300'
                    : 'text-stone-300'
                }`}
              >
                {levelLabel}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-stone-400 font-mono">
              <span style={{ color: palette.textAccent }} className="font-bold">
                Tier {card.tier}
              </span>
              <span>·</span>
              <span>
                {elemMeta?.icon} {card.element}
              </span>
              {cardClasses.length > 0 && (
                <>
                  <span>·</span>
                  <span className="text-stone-300">{cardClasses.join(', ')}</span>
                </>
              )}
            </div>

            {/* Live Compact Unit Stats */}
            {card.type === 'unit' && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-0.5 text-[11px] font-mono font-bold tabular-nums text-stone-200">
                <span className="text-amber-300" title="Ataque">
                  ⚔️ {card.atk}
                </span>
                <span className="text-sky-300" title="Defesa">
                  🛡️ {card.def}
                </span>
                <span className="text-purple-300" title="Poder">
                  ✦ {card.power}
                </span>
                <span
                  className={card.hp < card.maxHp ? 'text-rose-300' : 'text-emerald-300'}
                  title="Vida"
                >
                  ❤️ {card.hp}/{card.maxHp}
                </span>
              </div>
            )}
          </div>

          {/* Silenced Status Warning */}
          {isSilenced && (
            <div className="px-2.5 py-1.5 rounded-lg bg-rose-950/75 border border-rose-500/50 text-[11px] text-rose-200 font-semibold leading-snug">
              🔇 Silenciada ({card.silencedRounds} rod.) — efeitos suspensos
            </div>
          )}

          {/* Card Effect Description */}
          <div className={isSilenced ? 'opacity-55' : ''}>
            <FormattedCardDescription
              text={card.effectDescription}
              variant="compact"
            />
          </div>

          {/* Passives & Active Conditions (Icon + Name) */}
          {conditionItems.length > 0 && (
            <div className="pt-2 border-t border-white/10 space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-stone-400 font-bold">
                Passivas e Condições
              </div>
              <div className="grid grid-cols-1 gap-1">
                {conditionItems.map((item) => {
                  const isAngirisActive =
                    item.key === 'alianca_angiris' && hasAliancaAngiris;
                  const accentColorClass =
                    item.sourceType === 'passivo_especial'
                      ? 'border-amber-400/75 bg-amber-950/35 text-amber-200'
                      : item.sourceType === 'negativo'
                      ? 'border-rose-500/70 bg-rose-950/35 text-rose-200'
                      : item.sourceType === 'combate'
                      ? 'border-orange-400/70 bg-orange-950/35 text-orange-200'
                      : item.sourceType === 'benefico'
                      ? 'border-emerald-500/65 bg-emerald-950/35 text-emerald-200'
                      : 'border-sky-400/55 bg-slate-900/70 text-sky-100';

                  return (
                    <div
                      key={item.key}
                      className={`flex items-center justify-between gap-2 px-2 py-1 rounded-lg border-l-2 ${accentColorClass}`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm leading-none shrink-0" aria-hidden="true">
                          {item.config.icon}
                        </span>
                        <span className="text-[11px] font-semibold truncate">
                          {item.config.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono opacity-80 shrink-0 whitespace-nowrap tabular-nums">
                        {isAngirisActive
                          ? 'Ativa'
                          : item.duration.showCounter && item.duration.shortBadge
                          ? item.duration.shortBadge
                          : item.priorityOrder === 1
                          ? 'Passiva'
                          : item.priorityOrder === 2
                          ? 'Único'
                          : 'Ativa'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subtle Action Hint */}
          <div className="pt-1 border-t border-white/5 text-[10px] text-stone-400 font-mono">
            {zone === 'hand'
              ? 'Clique em 👁️ para abrir informações expandidas'
              : 'Clique na carta ou em 👁️ para detalhes completos'}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
