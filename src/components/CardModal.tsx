import React, { useState, useEffect } from 'react';
import { CardInstance } from '../types/game';
import {
  calculateCardCombatResistance,
  calculateCombatDamage,
  getCardClasses,
  getEffectivePower,
  getIceBonusDefenseValue,
  hasAliancaAngiris,
  hasCardClass,
  hasCorteDasFadas,
  isFairyCard,
} from '../logic/combat';
import { CARD_TEMPLATES } from '../data/cards';
import { ELEMENT_CONFIG, KINGDOM_THEMES, TIER_CONFIG, getCardArtCandidates, advanceCardArtFallback, getThematicCardArt } from '../utils/cardVisuals';
import { getCardConditionItems } from '../utils/conditionEffectsConfig';
import { CardView } from './CardView';
import { FormattedCardDescription } from './FormattedCardDescription';
import { LevelUpCinematicOverlay } from './LevelUpCinematicOverlay';
import { hasCardLevelUpMechanic, getDefaultAwakenedPowerText } from '../utils/levelUpThemes';
import { useVisualPreferences } from '../utils/visualTheme';
import { getForgedPalette } from '../utils/cardForgeTheme';
import { CardFiligreeCorners, CardFiligreeDivider } from './CardFiligreeSVG';
import {
  X,
  AlertCircle,
  Compass,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  BookOpen,
  Play,
} from 'lucide-react';

interface CardModalProps {
  card: CardInstance | null;
  onClose: () => void;
  hasOVazioActive?: boolean;
  board?: CardInstance[];
  votoSilencioActive?: boolean;
  onPlayFromModal?: () => void;
  playButtonLabel?: string;
  canPlayFromModal?: boolean;
  playDisabledReason?: string;
}

export const CardModal: React.FC<CardModalProps> = (props) => {
  if (!props.card) return null;
  return <CardModalContent {...props} card={props.card} />;
};

const CardModalContent: React.FC<Omit<CardModalProps, 'card'> & { card: CardInstance }> = ({
  card,
  onClose,
  hasOVazioActive = false,
  board,
  votoSilencioActive = false,
  onPlayFromModal,
  playButtonLabel,
  canPlayFromModal = false,
  playDisabledReason,
}) => {
  // Level preview state for cards with level progression (ONLY Tier 5 Units: Licia, Well, Seniel/Saniel)
  const { animationMode, combatAnimations } = useVisualPreferences();
  const isSkill = card.type === 'skill';
  const hasLevelSystem = hasCardLevelUpMechanic(card);

  const [previewLevel, setPreviewLevel] = useState<1 | 2>(!isSkill && card.level === 2 ? 2 : 1);
  const [showInGameFrame, setShowInGameFrame] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isLevelUpPreviewOpen, setIsLevelUpPreviewOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [mainArtError, setMainArtError] = useState(false);
  const [zoomImageError, setZoomImageError] = useState(false);
  const [expandedConditionKey, setExpandedConditionKey] = useState<string | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<'status' | 'lore'>('status');

  // Sync preview level whenever modal opens with a different card
  useEffect(() => {
    if (card) {
      setPreviewLevel(!isSkill && card.level === 2 ? 2 : 1);
      setShowInGameFrame(false);
      setIsZoomOpen(false);
      setIsLevelUpPreviewOpen(false);
      setZoomScale(1);
      setMainArtError(false);
      setZoomImageError(false);
      setExpandedConditionKey(null);
      setActiveRightTab('status');
    }
  }, [card?.instanceId, card?.templateId, card?.level, card?.isRevealedFaleziel]);

  useEffect(() => {
    setMainArtError(false);
    setZoomImageError(false);
  }, [previewLevel]);

  // Handle escape key to close zoom or modal (LevelUpCinematicOverlay owns Escape while open)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isLevelUpPreviewOpen) {
          return;
        }
        if (isZoomOpen) {
          setIsZoomOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLevelUpPreviewOpen, isZoomOpen, onClose]);

  // Derive the active displayed card instance with selected level
  const displayCard: CardInstance = React.useMemo(() => {
    if (!hasLevelSystem) return card;
    if (previewLevel === 2 && (card.templateId === 'g_barao_well' || card.name.toLowerCase().includes('well'))) {
      return {
        ...card,
        level: 2,
        exclusiveName: 'Soberano da Tempestade',
        effectDescription:
          'Lendária [Tier 5 - Nível 2]. Ganha CURA e ROUBO DE VIDA permanentes! Além disso, a cada início de rodada, 2 inimigos aleatórios na mesa inimiga são atingidos por um raio, causando 15 de dano e aplicando ELETRIFICADO por 1 rodada (+20% de dano ELÉTRICO recebido).',
      };
    }
    if (previewLevel === 2 && (card.templateId === 'm_licia' || card.name.toLowerCase().includes('licia'))) {
      return {
        ...card,
        level: 2,
        exclusiveName: 'Guardiã do Véu',
        effectDescription:
          'Lendária [Tier 5 - Nível 2]. Ao subir de nível, compartilha seu valor de PODER atual e entrega Furtivo a todas as unidades aliadas na mesa! Concede +10 de PODER a todas as unidades furtivas a cada nova rodada e recebe o efeito de condição exclusivo ETÉREO (só pode ser defendida por outra unidade ETÉREA).',
      };
    }
    if (previewLevel === 2 && (card.templateId === 'n_saniel' || card.templateId === 'n_seniel' || card.name.toLowerCase().includes('saniel'))) {
      return {
        ...card,
        level: 2,
        exclusiveName: 'Colheita Celestial',
        effectDescription:
          'Lendária [Tier 5 - Nível 2]. Absorve permanentemente todos os atributos e condições benéficas da unidade que eliminar em combate, somando 50% de todo PODER absorvido ao seu ATAQUE! Além disso, a cada 2 rodadas gera uma "Jurisdição de Saniel" FUGAZ na mão.',
      };
    }
    if (previewLevel === 2 && (card.templateId === 'g_craff' || card.name.toLowerCase().includes('craff'))) {
      return {
        ...card,
        level: 2,
        exclusiveName: 'Presença Rúnica & Rochedo',
        effectDescription:
          'Lendária [Tier 5 - Nível 2]. Presença Rúnica: Enquanto Craff estiver em campo permite invocar +1 carta por rodada (limite 3). Sempre que o jogador invocar a 3ª carta na mesma rodada com Craff Nível 2 na mesa, gera um Rochedo (20 de dano e -25% de Ataque).',
      };
    }
    if (previewLevel === 2 && (card.templateId === 'm_titano' || card.name.toLowerCase().includes('titano'))) {
      return {
        ...card,
        level: 2,
        exclusiveName: 'Carrasco dos Mares & Sangramento',
        effectDescription:
          'Lendária [Tier 5 - Nível 2]. Possui Ataque-Duplo. Recebe +20 de poder e pode causar Sangramento permanentemente.\nPassiva: Causar dano em unidades afetadas por SANGRAMENTO concede CURA a Titano por 2 rodadas.',
      };
    }
    if (previewLevel === 2 && (card.templateId === 'n_helio' || card.name.toLowerCase().includes('hélio') || card.name.toLowerCase().includes('helio'))) {
      return {
        ...card,
        level: 2,
        exclusiveName: 'Arauto Solar Supremo',
        effectDescription:
          'Lendária [Tier 5 - Nível 2]. Se for a primeira carta invocada na rodada lança labareda solar causando 5 de dano e aplicando ENTORPECER por 2 rodadas. Efeito EXTRA Nível 2: Caso seja a única unidade designada em um ATAQUE, DOBRA seu valor de ATAQUE. Se eliminar uma unidade defensora, se cura em 10 de Resistência (priorizando a Vida e depois a Defesa).',
      };
    }
    if (previewLevel === 2 && (card.templateId === 'g_lunario' || card.name.toLowerCase().includes('lunario'))) {
      return {
        ...card,
        level: 2,
        name: 'Lunario, Emissário Cósmico Supremo',
        exclusiveName: 'Devorador de Sonhos',
        effectDescription:
          'Lendária [Tier 5 - Nível 2]. No início de cada nova rodada, consome o efeito SONO de todas as unidades na mesa (aliadas e inimigas). Ganha +5/+5 de Sapiência e Poder por cada SONO consumido e causa 7 de dano à Resistência da unidade afetada.',
      };
    }
    if (previewLevel === 2 && (card.templateId === 'm_bonetrus' || card.name.toLowerCase().includes('bonetrus'))) {
      return {
        ...card,
        level: 2,
        name: 'Bonetrus, Soberano do Inverno',
        exclusiveName: 'Devastação Glacial',
        effectDescription:
          'Lendária [Tier 5 - Nível 2]. Ao atacar inimigos afligidos por CONGELAR os executa caso tenham 12 ou menos de Vida. Se Bonetrus for designado sozinho para um ataque ele causa dano em TODAS as unidades da mesa inimiga além da carta que defende seu ataque (100% no defensor, 50% nas demais).',
      };
    }
    if (previewLevel === 2 && (card.templateId === 'n_o_sol' || card.name.trim().toLowerCase().startsWith('o sol'))) {
      return {
        ...card,
        level: 2,
        name: 'O Sol - O Absoluto',
        exclusiveName: 'O Absoluto (Buraco Negro · Imortal)',
        effectDescription:
          'Supremo [Tier 6 - Nível 2]. O ABSOLUTO: O Sol mostra sua verdadeira forma de Buraco Negro, ficando com todos seus atributos em escala INFINITO (∞) e tornando-se IMORTAL. Em ataques e defesas (sozinho ou em mesa cheia) OBLITERA todas as unidades que atacarem ou defenderem. A cada rodada drena 1 de vida do jogador inimigo, ao chegar a zero ele é derrotado.',
      };
    }
    if (previewLevel === 2 && (card.templateId === 'g_a_lua' || card.name.trim().toLowerCase().startsWith('a lua'))) {
      return {
        ...card,
        level: 2,
        name: 'A Lua - A Eminente',
        exclusiveName: 'A Eminente (Monstruosidade Sanguinária · Imortal)',
        effectDescription:
          'Supremo [Tier 6 - Nível 2]. A EMINENTE: A Lua mostra sua verdadeira forma, uma monstruosidade sanguinária e aniquiladora. A cada rodada aplica SONO em todos os inimigos. A Lua potencializa o efeito de Lunario, fazendo com que toda vez que Lunario consuma o SONO das unidades inimigas ele OBLITERA elas. A cada início de rodada A Lua drena 1 da vida do jogador inimigo, ao chegar a zero ele é derrotado.',
      };
    }
    if (previewLevel === 2 && (card.templateId === 'g_kaliel' || card.name.toLowerCase().includes('kaliel'))) {
      return {
        ...card,
        level: 2,
        exclusiveName: 'Comunhão Angiris',
        effectDescription:
          'Lendária [Tier 5 - Nível 2]. Ao subir de nível gera um "Filho da Luz" FUGAZ na mão. Enquanto Kaliel estiver na mesa, todos os Arcanjos aliados em campo compartilham entre si os maiores valores atuais de cada atributo e todas as suas condições benéficas e de combate!',
      };
    }
    return {
      ...card,
      level: previewLevel,
    };
  }, [card, hasLevelSystem, previewLevel]);

  const conditionItems = getCardConditionItems(displayCard, true);
  const expandedItem = conditionItems.find((item) => item.key === expandedConditionKey);

  const templateForLore = CARD_TEMPLATES.find((t) => t.id === displayCard.templateId);
  const resolvedLore = (displayCard.lore ?? templateForLore?.lore ?? '').trim();
  const hasLore = resolvedLore.length > 0;

  const kingdom = KINGDOM_THEMES[displayCard.kingdom];
  const element = ELEMENT_CONFIG[displayCard.element];
  const tier = TIER_CONFIG[displayCard.tier];
  const forged = getForgedPalette(displayCard.tier, {
    isLevel2: !isSkill && displayCard.level === 2,
    isFugaz: displayCard.isFugaz,
    isSkill,
  });

  // Compute artwork filename candidates for Preview and Full Version Zoom
  const isLvl2 = displayCard.level === 2;
  const isOSolLvl2 =
    isLvl2 &&
    (displayCard.templateId === 'n_o_sol' || displayCard.name.trim().toLowerCase().startsWith('o sol'));
  const isALuaLvl2 =
    isLvl2 &&
    (displayCard.templateId === 'g_a_lua' || displayCard.name.trim().toLowerCase().startsWith('a lua'));
  const artCandidates = getCardArtCandidates(displayCard.templateId, {
    isLvl2,
    isRevealedFaleziel: displayCard.isRevealedFaleziel,
    isPack: displayCard.templateId === 'pack_atormentador' || displayCard.isPack,
    name: displayCard.name,
  });
  const initialArtSrc = artCandidates[0];

  return (
    <>
      {/* Main Expanded Card Modal */}
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className="relative my-auto w-full max-w-4xl max-h-[94dvh] overflow-y-auto rounded-3xl border-2 border-stone-700/80 bg-gradient-to-b from-[#181622] via-[#121019] to-[#0a0910] p-4 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] text-stone-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition-colors z-20 cursor-pointer"
            title="Fechar"
          >
            <X size={20} />
          </button>

          {/* Modal Content Grid */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Left Column: Absolute Uncropped Art Showcase (or In-Game CardView Frame) */}
            <div className="shrink-0 flex flex-col items-center w-72 sm:w-80">
              {!showInGameFrame ? (
                <div
                  onClick={() => setIsZoomOpen(true)}
                  className="group relative w-full rounded-2xl p-[3px] overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-[1.01] celentia-forged-card"
                  style={{
                    background: forged.outerMetalGradient,
                    boxShadow: forged.bezelShadow,
                  }}
                  title="Clique para ampliar em tela cheia"
                >
                  <div
                    className="relative w-full rounded-[13px] overflow-hidden bg-[#09080e]"
                    style={{ border: `1px solid ${forged.innerFrameBorder}` }}
                  >
                    <CardFiligreeCorners
                      color={forged.filigreeStroke}
                      glowColor={forged.filigreeGlow}
                      sizeClass="w-6 h-6"
                    />
                    {/* 1:1 Uncropped Square Artwork */}
                    <div className="relative w-full aspect-square bg-[#08070c] flex items-center justify-center overflow-hidden">
                      {!mainArtError && initialArtSrc ? (
                        <img
                          key={`modal_${initialArtSrc}`}
                          src={initialArtSrc}
                          alt={displayCard.name}
                          onError={(e) => {
                            if (!advanceCardArtFallback(e.currentTarget, artCandidates)) {
                              setMainArtError(true);
                            }
                          }}
                          className="w-full h-full object-contain select-none"
                        />
                      ) : (() => {
                        const thematic = getThematicCardArt(
                          displayCard.isRevealedFaleziel ? 'm_faleziel' : displayCard.templateId,
                          displayCard.element,
                          isSkill
                        );
                        return (
                          <div className={`w-full h-full bg-gradient-to-br ${thematic.backdropClass} flex flex-col items-center justify-center p-6 text-center relative`}>
                            <div
                              className="pointer-events-none absolute inset-0 opacity-65"
                              style={{ background: `radial-gradient(circle at 50% 45%, ${thematic.glowColor}, transparent 68%)` }}
                            />
                            <div
                              className={`relative z-10 w-28 h-28 rounded-full border-2 ${thematic.ringColor} bg-black/50 backdrop-blur-sm flex items-center justify-center shadow-2xl`}
                              style={{ boxShadow: `0 0 28px ${thematic.glowColor}` }}
                            >
                              <span className="text-6xl leading-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]">
                                {thematic.icon}
                              </span>
                              <span className="absolute -bottom-1.5 -right-1.5 w-9 h-9 rounded-full bg-stone-950/95 border border-white/25 flex items-center justify-center text-lg shadow-lg">
                                {thematic.secondaryRune}
                              </span>
                            </div>
                            <span className="relative z-10 mt-3 text-xs font-serif font-bold uppercase tracking-widest text-stone-200/90">
                              {thematic.tagLabel}
                            </span>
                            <span className="relative z-10 mt-0.5 text-[10px] font-mono text-stone-400">
                              {kingdom.name} · {element.name}
                            </span>
                          </div>
                        );
                      })()}

                      {/* Hover Zoom Hint */}
                      <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 backdrop-blur-[1px] pointer-events-none">
                        <div className="p-2.5 rounded-full bg-black/80 border border-amber-400/80 text-amber-300 shadow-xl">
                          <Maximize2 size={22} />
                        </div>
                        <span className="text-xs font-bold text-amber-200 bg-black/80 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                          Ampliar Tela Cheia
                        </span>
                      </div>
                    </div>

                    {/* Quick Base Stats Bar under Uncropped Art */}
                    <div className="relative" style={{ borderTop: `1px solid ${forged.headerDividerColor}` }}>
                      <CardFiligreeDivider
                        lineColor={forged.headerDividerColor}
                        gemTop={forged.gemTop}
                        gemMid={forged.gemMid}
                        gemBottom={forged.gemBottom}
                        gemSize="sm"
                        positionClass="-top-[6px]"
                      />
                      {displayCard.type === 'unit' ? (
                        displayCard.element === 'Cósmico' ? (
                          <div className="grid grid-cols-2 divide-x divide-indigo-500/30 bg-[#151226] py-2.5 text-center font-mono tabular-nums">
                            <div>
                              <div className="text-[10px] text-indigo-300 font-bold uppercase">🔮 Sapiência</div>
                              <div className="text-sm font-black text-indigo-100">{isALuaLvl2 ? '∞' : displayCard.hp}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-amber-300 font-bold uppercase">⚡ Poder</div>
                              <div className="text-sm font-black text-amber-200">{isALuaLvl2 ? '∞' : displayCard.power}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-4 divide-x divide-stone-800/80 py-2.5 text-center font-mono tabular-nums" style={{ background: forged.footerBg }}>
                            <div>
                              <div className="text-[9px] text-emerald-400 font-bold uppercase">❤️ Vida</div>
                              <div className="text-xs font-black text-emerald-200">{isOSolLvl2 ? '∞' : displayCard.hp}</div>
                            </div>
                            <div>
                              <div className="text-[9px] text-rose-400 font-bold uppercase">⚔️ Atq</div>
                              <div className="text-xs font-black text-rose-200">
                                {isOSolLvl2 ? '∞' : displayCard.atk}
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] text-sky-400 font-bold uppercase">🛡️ Def</div>
                              <div className="text-xs font-black text-sky-200">{isOSolLvl2 ? '∞' : displayCard.def}</div>
                            </div>
                            <div>
                              <div className="text-[9px] text-amber-400 font-bold uppercase">⚡ Pod</div>
                              <div className="text-xs font-black text-amber-200">{isOSolLvl2 ? '∞' : displayCard.power}</div>
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="py-2.5 text-center text-xs font-bold text-purple-300" style={{ background: forged.footerBg }}>
                          {displayCard.speed === 'lenta' ? '⏳ Habilidade Lenta' : '🌪️ Habilidade Rápida'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setIsZoomOpen(true)}
                  className="group relative cursor-pointer transform hover:scale-[1.02] transition-transform duration-300 drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)] rounded-2xl"
                  title="Clique para ver a Arte Completa em Alta Resolução (Full Version)"
                >
                  <CardView card={displayCard} size="lg" isPlayable={true} hasOVazioActive={hasOVazioActive} />
                </div>
              )}

              {/* Action Buttons: Fullscreen Zoom & Toggle Frame */}
              <div className="mt-2.5 w-full grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsZoomOpen(true)}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 text-xs font-bold transition-all cursor-pointer"
                >
                  <Maximize2 size={13} className="text-amber-400" />
                  <span>Tela Cheia</span>
                </button>
                <button
                  onClick={() => setShowInGameFrame((prev) => !prev)}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-stone-800/90 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-semibold transition-all cursor-pointer"
                >
                  <span>{showInGameFrame ? '🖼️ Arte Absoluta' : '🃏 Moldura Jogo'}</span>
                </button>
              </div>

              {/* Level 1 / Level 2 Switcher for cards that level up */}
              {hasLevelSystem && (
                <div className="w-full mt-2.5 p-2 rounded-xl bg-black/50 border border-stone-800/90 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px] text-stone-400 font-medium px-1">
                    <span className="flex items-center gap-1">
                      <Layers size={12} className="text-amber-400" /> Versão da Carta:
                    </span>
                    <span className="text-amber-300 font-mono font-bold">Nível {previewLevel}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setPreviewLevel(1)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                        previewLevel === 1
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                          : 'bg-stone-900/90 border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <span>★ Nível 1</span>
                    </button>
                    <button
                      onClick={() => setPreviewLevel(2)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                        previewLevel === 2
                          ? 'bg-purple-500/25 border-purple-400 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.35)]'
                          : 'bg-stone-900/90 border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <span>👑 Nível 2</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsLevelUpPreviewOpen(true)}
                    className="mt-1 w-full min-h-[36px] py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-500/20 via-amber-400/25 to-amber-500/20 hover:from-amber-500/35 hover:to-amber-400/35 border border-amber-400/55 text-amber-200 text-xs font-serif font-bold tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Play size={12} className="fill-amber-300 text-amber-300 shrink-0" />
                    <span>Assistir Animação de Subida de Nível</span>
                  </button>
                </div>
              )}

              {/* Painel Interativo de Condições (Abaixo da Arte e Botões de Ação) */}
              {conditionItems.length > 0 && (
                <div className="w-full mt-3 p-2.5 rounded-2xl bg-black/60 border border-stone-800/90 shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] text-stone-400 font-medium px-1">
                    <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-stone-200">
                      <span>✨</span> Condições ({conditionItems.length})
                    </span>
                    <span className="text-[10px] text-stone-500 italic">
                      Clique para expandir
                    </span>
                  </div>

                  {/* Ordem estrita: 1º Passivos -> 2º Únicos -> 3º Recebidos (Bordas Quadradas) */}
                  <div className="flex flex-wrap items-center gap-2.5 px-1 py-1.5">
                    {conditionItems.map((item) => {
                      const isExpanded = expandedConditionKey === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setExpandedConditionKey(isExpanded ? null : item.key)}
                          className={`w-10 h-10 rounded-[2px] flex items-center justify-center text-base font-bold transition-all cursor-pointer border-2 relative ${
                            item.sourceBorderClass
                          } ${item.sourceBgClass} ${item.sourceTextClass} ${
                            isExpanded
                              ? 'scale-110 ring-2 ring-white/75 shadow-[0_0_16px_rgba(255,255,255,0.45)]'
                              : 'hover:scale-105 opacity-95 hover:opacity-100'
                          }`}
                          title={
                            item.duration.showCounter
                              ? `${item.config.name} (${item.config.categoryName}) · ${item.duration.detailLabel} - ${item.sourceLabel}\nClique para expandir/retrair detalhes`
                              : `${item.config.name} (${item.config.categoryName}) - ${item.sourceLabel}\nClique para expandir/retrair detalhes`
                          }
                        >
                          <span
                            className={`leading-none ${
                              item.duration.showCounter ? '-translate-x-0.5 -translate-y-0.5' : ''
                            }`}
                          >
                            {item.config.icon}
                          </span>
                          {item.duration.showCounter && (
                            <span
                              className={`absolute -bottom-1 -right-1 px-1 min-w-[16px] h-[14px] rounded text-[9px] font-mono font-black leading-none flex items-center justify-center border shadow-sm tabular-nums ${
                                item.duration.isPermanent
                                  ? 'bg-stone-900 border-stone-500/80 text-stone-200'
                                  : 'bg-amber-950 border-amber-400 text-amber-200'
                              }`}
                            >
                              {item.duration.shortBadge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Informação Completa Expandida (retrai ao clicar novamente) */}
                  {expandedItem && (
                    <div className="mt-1 p-3 rounded-xl bg-stone-950/95 border border-stone-800 text-xs space-y-2 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between gap-2 border-b border-stone-800 pb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-base">{expandedItem.config.icon}</span>
                          <strong className="text-white font-bold text-sm">{expandedItem.config.name}</strong>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${expandedItem.config.categoryBg} ${expandedItem.config.categoryColor} ${expandedItem.config.categoryBorder}`}
                          >
                            {expandedItem.config.categoryName}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedConditionKey(null)}
                          className="text-stone-400 hover:text-white text-xs px-2 py-0.5 rounded bg-stone-900 border border-stone-700 cursor-pointer shrink-0"
                          title="Recolher detalhes"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="text-amber-300 font-medium flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 inline-block border-2" style={{ borderColor: 'currentColor' }} />
                          <span>Origem: <strong className="text-white">{expandedItem.sourceLabel}</strong></span>
                        </div>
                        {expandedItem.duration.showCounter && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold border tabular-nums ${
                              expandedItem.duration.isPermanent
                                ? 'bg-stone-900/90 border-stone-600/70 text-stone-200'
                                : 'bg-amber-950/85 border-amber-500/60 text-amber-200'
                            }`}
                          >
                            <span>{expandedItem.duration.isPermanent ? '∞' : '⏳'}</span>
                            <span>{expandedItem.duration.detailLabel}</span>
                          </span>
                        )}
                      </div>

                      {expandedItem.duration.subNote && (
                        <div className="text-[11px] font-medium text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-lg px-2 py-1">
                          {expandedItem.duration.subNote}
                        </div>
                      )}

                      <p className="text-stone-300 text-xs leading-relaxed">
                        {expandedItem.config.fullDesc}
                      </p>

                      <div
                        className={`w-full mt-1.5 p-2.5 rounded-lg border text-[11px] flex items-start gap-2 ${
                          expandedItem.originBadgeType === 'habilidade'
                            ? 'bg-purple-950/60 border-purple-500/45 text-purple-100'
                            : expandedItem.originBadgeType === 'unidade_compartilhada'
                            ? 'bg-emerald-950/60 border-emerald-500/45 text-emerald-100'
                            : expandedItem.originBadgeType === 'unidade_inimiga'
                            ? 'bg-rose-950/60 border-rose-500/45 text-rose-100'
                            : 'bg-sky-950/60 border-sky-500/45 text-sky-100'
                        }`}
                      >
                        <span className="text-sm leading-none shrink-0 mt-0.5">
                          {expandedItem.originBadgeType === 'habilidade'
                            ? '📜'
                            : expandedItem.originBadgeType === 'unidade_compartilhada'
                            ? '🤝'
                            : expandedItem.originBadgeType === 'unidade_inimiga'
                            ? '⚔️'
                            : '✨'}
                        </span>
                        <div className="space-y-0.5 leading-snug">
                          <div className="font-bold uppercase tracking-wider text-[10px] opacity-90">
                            Procedência: {expandedItem.originKindLabel}
                          </div>
                          <div className="text-stone-200">{expandedItem.originDetail}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Detailed Lore, Synergy, Mechanics & Conditions */}
            <div className="flex-1 flex flex-col justify-between space-y-4 w-full">
              {/* Header info */}
              <div className="border-b border-stone-800 pb-3 pr-8">
                <div className="flex items-center gap-2">
                  <span className="text-2xl p-1.5 rounded-lg bg-black/40 border border-stone-800">
                    {kingdom.crest}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-serif font-black text-white tracking-tight">
                        {displayCard.name}
                      </h2>
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border"
                        style={{
                          backgroundColor: `${tier.color}20`,
                          color: tier.color,
                          borderColor: `${tier.color}50`,
                        }}
                      >
                        Tier {displayCard.tier} ({tier.name})
                      </span>
                      {hasLevelSystem && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono border bg-purple-950/70 text-purple-300 border-purple-500/40">
                          Nível {previewLevel}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 font-sans mt-0.5">
                      {kingdom.name} · {kingdom.subtitle}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tab Switcher: Status & Efeitos vs História / Lore (only rendered when the card has lore filled) */}
              {hasLore && (
                <div className="flex items-center gap-1 p-1 rounded-xl bg-black/55 border border-stone-800/90 w-fit">
                  <button
                    type="button"
                    onClick={() => setActiveRightTab('status')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                      activeRightTab === 'status'
                        ? 'bg-stone-800 text-white border border-stone-600/80 shadow-sm'
                        : 'text-stone-400 hover:text-stone-200 border border-transparent'
                    }`}
                  >
                    <span>Status & Efeitos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveRightTab('lore')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                      activeRightTab === 'lore'
                        ? 'bg-amber-950/85 text-amber-200 border border-amber-500/55 shadow-sm'
                        : 'text-stone-400 hover:text-amber-200/85 border border-transparent'
                    }`}
                  >
                    <BookOpen size={13} className={activeRightTab === 'lore' ? 'text-amber-300' : 'text-stone-400'} />
                    <span>História / Lore</span>
                  </button>
                </div>
              )}

              {hasLore && activeRightTab === 'lore' ? (
                <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-black/60 border border-amber-500/35 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 border-b border-stone-800/80 pb-2.5">
                      <div className="flex items-center gap-2 text-amber-200 font-serif font-bold text-sm">
                        <BookOpen size={15} className="text-amber-400 shrink-0" />
                        <span>Crônicas de {kingdom.name}</span>
                      </div>
                      <span className="text-[11px] text-stone-400">
                        {element.icon} {element.name}
                      </span>
                    </div>

                    <div className="max-h-[380px] overflow-y-auto pr-2 text-sm sm:text-[15px] text-stone-200/95 leading-relaxed whitespace-pre-line font-serif">
                      {resolvedLore}
                    </div>
                  </div>
                </div>
              ) : (
                <>
              {/* Description & Exclusive Effect breakdown */}
              <div className="p-3.5 rounded-2xl bg-black/60 border border-stone-800/80 space-y-2">
                <div className="flex items-center flex-wrap gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-bold border ${element.bgBadge} ${element.textBadge} ${element.border}`}
                  >
                    {isSkill ? `Habilidade (${displayCard.speed === 'rapida' ? 'Rápida' : 'Lenta'})` : `Classe: ${element.icon} ${element.name}`}
                  </span>
                  {!isSkill && displayCard.extraElements && displayCard.extraElements.map((extra) => {
                    const exCfg = ELEMENT_CONFIG[extra] || ELEMENT_CONFIG.Neutro;
                    return (
                      <span
                        key={extra}
                        className={`px-2.5 py-0.5 rounded text-xs font-bold border ${exCfg.bgBadge} ${exCfg.textBadge} ${exCfg.border}`}
                        title="Classe adquirida por habilidade em combate (Multiclasse)"
                      >
                        + {exCfg.icon} {exCfg.name}
                      </span>
                    );
                  })}
                  {displayCard.exclusiveName && (
                    <span className="px-2.5 py-0.5 rounded text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                      ★ {displayCard.exclusiveName}
                    </span>
                  )}
                </div>

                <div className="pt-1.5 border-t border-stone-800/80">
                  <FormattedCardDescription
                    text={displayCard.effectDescription || 'Guerreiro convocado para lutar pelo reino nas batalhas ancestrais.'}
                    variant="modal"
                  />
                </div>
              </div>

              {/* Bônus Ativos na Unidade (Buffs de Atributos, Outras Cartas & Vantagens de Classe) */}
              {displayCard.type === 'unit' && (() => {
                const isSilenced = displayCard.silencedRounds > 0;
                const hasImunidade =
                  displayCard.conditions.has('imunidade') || (displayCard.immunedRounds ?? 0) > 0;
                const isVotoBlocked =
                  !hasImunidade &&
                  (votoSilencioActive ||
                    displayCard.votoSilencioSavedPower !== undefined ||
                    (displayCard.votoSilencioRoundsRemaining ?? 0) > 0);
                const isInfiniteScale =
                  isOSolLvl2 ||
                  isALuaLvl2 ||
                  displayCard.hp >= 999999 ||
                  displayCard.atk >= 999999 ||
                  displayCard.power >= 999999;

                const bonusPills: Array<{
                  key: string;
                  icon: string;
                  label: string;
                  badgeClass: string;
                  title: string;
                }> = [];

                // 1. Vantagens de Classe (Multiclasse aditiva)
                const pwrEffective = getEffectivePower(displayCard, votoSilencioActive);
                const isVotoActiveOnCard = !isSilenced && isVotoBlocked;
                if (isVotoActiveOnCard) {
                  bonusPills.push({
                    key: 'voto_silencio_suppressed',
                    icon: '🤫',
                    label: `Voto do Silêncio: Poder e bônus zerados (${displayCard.votoSilencioRoundsRemaining ?? 1}r)`,
                    badgeClass: 'bg-stone-900/90 border-stone-500/70 text-stone-300',
                    title: 'Voto do Silêncio ativo: o Poder e todos os bônus de classe derivados do Poder estão temporariamente removidos até o término do efeito.',
                  });
                }
                const activeClasses = getCardClasses(displayCard);
                if (activeClasses.length > 1) {
                  bonusPills.push({
                    key: 'multiclass_active',
                    icon: '🧬',
                    label: `Multiclasse (${activeClasses.join(' + ')})`,
                    badgeClass: 'bg-amber-950/85 border-amber-300/75 text-amber-200',
                    title: 'Esta unidade possui múltiplas classes ativas cujos multiplicadores são somados ao cálculo final.',
                  });
                }
                for (const cls of activeClasses) {
                  if (cls === 'Fogo') {
                    bonusPills.push({
                      key: 'class_fogo',
                      icon: '🔥',
                      label: isOSolLvl2 ? 'Classe Fogo: +∞ Dano' : `Classe Fogo: +${pwrEffective} Dano (100% Poder)`,
                      badgeClass: 'bg-red-950/70 border-red-500/50 text-red-200',
                      title: 'Vantagem da Classe Fogo: soma 100% do Poder ao Ataque no cálculo de Dano.',
                    });
                  } else if (cls === 'Divino') {
                    const divBonus = Math.floor(pwrEffective * 0.8);
                    bonusPills.push({
                      key: 'class_divino',
                      icon: '⚜️',
                      label: `Classe Divino: +${divBonus} Dano (80% Poder)`,
                      badgeClass: 'bg-amber-950/80 border-amber-400/65 text-amber-200',
                      title: 'Vantagem da Classe Divino: soma 80% do Poder como dano adicional e libera Tiers antecipadamente.',
                    });
                  } else if (cls === 'Água') {
                    const halfPwr = Math.floor(pwrEffective / 2);
                    bonusPills.push({
                      key: 'class_agua',
                      icon: '💧',
                      label: `Classe Água: +${halfPwr} Dano / +${halfPwr} Resist.`,
                      badgeClass: 'bg-sky-950/70 border-sky-500/50 text-sky-200',
                      title: 'Vantagem da Classe Água: soma 50% do Poder tanto ao Dano quanto à Resistência.',
                    });
                  } else if (cls === 'Gelo') {
                    const icePeakDef = getIceBonusDefenseValue(displayCard);
                    const iceExtraDmg = isSilenced ? 0 : Math.floor(icePeakDef * 0.25);
                    const iceDefFromPwr = Math.floor(pwrEffective * 0.5);
                    bonusPills.push({
                      key: 'class_gelo_def',
                      icon: '❄️',
                      label: `Defesa Glacial: +${iceDefFromPwr} Def (50% Poder)`,
                      badgeClass: 'bg-cyan-950/70 border-cyan-500/50 text-cyan-200',
                      title: 'Vantagem da Classe Gelo: recebe 50% do Poder como Defesa adicional.',
                    });
                    bonusPills.push({
                      key: 'class_gelo_dmg',
                      icon: '🧊',
                      label: isSilenced
                        ? 'Dano Glacial: Anulado (Silêncio)'
                        : `Pico Def ${icePeakDef} → +${iceExtraDmg} Dano`,
                      badgeClass: isSilenced
                        ? 'bg-stone-900/80 border-stone-600/60 text-stone-400'
                        : 'bg-cyan-950/85 border-cyan-300/75 text-cyan-100',
                      title: isSilenced
                        ? 'Unidade silenciada: bônus de 25% da Defesa em Dano está anulado temporariamente.'
                        : `Vantagem da Classe Gelo: causa 25% do pico cumulativo de Defesa registrado (${icePeakDef}, atual ${displayCard.def}) como dano adicional.`,
                    });
                  } else if (cls === 'Telúrico' || cls === 'Terra') {
                    const halfTel = Math.floor(pwrEffective * 0.5);
                    bonusPills.push({
                      key: 'class_telurico',
                      icon: '🌿',
                      label: `Classe Telúrico: +${halfTel} Vida / +${halfTel} Def (50%/50% Poder)`,
                      badgeClass: 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200',
                      title: 'Vantagem da Classe Telúrico: divide seu Poder em +50% Vida Máxima e +50% Defesa.',
                    });
                  } else if (cls === 'Elétrico') {
                    const halfPwr = Math.floor(pwrEffective / 2);
                    bonusPills.push({
                      key: 'class_eletrico',
                      icon: '⚡',
                      label: `Classe Elétrico: +${halfPwr} Dano · Atordoa 1º Atq`,
                      badgeClass: 'bg-amber-950/70 border-amber-500/50 text-amber-200',
                      title: 'Vantagem da Classe Elétrico: soma 50% do Poder ao Dano e atordoa o alvo no 1º ataque.',
                    });
                  } else if (cls === 'Mágico') {
                    const extraMagicAtk = Math.max(0, displayCard.atk);
                    bonusPills.push({
                      key: 'class_magico',
                      icon: '✨',
                      label:
                        activeClasses.length > 1
                          ? `Classe Mágico: +${pwrEffective} Dano (100% Poder · +Ataque soma ao Dano)`
                          : extraMagicAtk > 0
                          ? `Classe Mágico: ${pwrEffective} Poder + ${extraMagicAtk} Ataque = ${pwrEffective + extraMagicAtk} Dano`
                          : `Classe Mágico: ${pwrEffective} Dano (100% Poder · +Ataque soma ao Dano)`,
                      badgeClass: 'bg-purple-950/70 border-purple-500/50 text-purple-200',
                      title: 'Vantagem da Classe Mágico: o dano utiliza 100% do Poder e soma integralmente qualquer valor de Ataque recebido.',
                    });
                  } else if (cls === 'Cósmico') {
                    bonusPills.push({
                      key: 'class_cosmico',
                      icon: '🧬',
                      label: isALuaLvl2
                        ? 'Classe Cósmico: ∞ Sapiência & Poder'
                        : 'Classe Cósmico: Imune Queimadura & Buffs Externos',
                      badgeClass: 'bg-indigo-950/70 border-indigo-400/55 text-indigo-200',
                      title: 'Vantagem da Classe Cósmico: utiliza Sapiência e Poder; imune a Queimadura e a buffs não-cósmicos.',
                    });
                  } else if (cls === 'Sombrio') {
                    const sombrioCrit = Math.floor(pwrEffective * 0.5);
                    bonusPills.push({
                      key: 'class_sombrio',
                      icon: '🌑',
                      label: `Classe Sombrio: +${sombrioCrit} Dano Crítico (50% Poder direto na Vida)`,
                      badgeClass: 'bg-purple-950/80 border-fuchsia-400/75 text-fuchsia-200',
                      title: 'Vantagem da Classe Sombrio: causa 50% do Poder atual como dano Crítico diretamente à Vida da unidade atacada, além do dano normal de Ataque.',
                    });
                  } else if (cls === 'Neutro' && pwrEffective > 0) {
                    const neutroBonus = Math.floor(pwrEffective);
                    bonusPills.push({
                      key: 'class_neutro',
                      icon: '⚔️',
                      label: `Classe Neutro: +${neutroBonus} Vida / +${neutroBonus} Atq / +${neutroBonus} Def (100% Poder)`,
                      badgeClass: 'bg-slate-900/90 border-slate-400/75 text-slate-100',
                      title: 'Vantagem da Classe Neutra: soma 100% do Poder atual em cada atributo (Vida, Ataque e Defesa).',
                    });
                  }
                }

                // 2. Buffs Específicos de Outras Unidades / Habilidades
                if (board && hasAliancaAngiris(displayCard, board)) {
                  bonusPills.push({
                    key: 'buff_angiris',
                    icon: '👼',
                    label: 'Aliança Angiris: +50% Dano / -50% Sofrido',
                    badgeClass: 'bg-amber-950/80 border-amber-400/80 text-amber-200',
                    title: 'Bônus compartilhado com outro Arcanjo na mesa.',
                  });
                }

                if (board && isFairyCard(displayCard) && !isSilenced && hasCorteDasFadas(board)) {
                  bonusPills.push({
                    key: 'buff_corte_fadas',
                    icon: '🧚',
                    label: 'Corte das Fadas Ativa (3+ Fadas): Milagre + 75% Poder ao salvar o líder',
                    badgeClass: 'bg-pink-950/80 border-pink-400/80 text-pink-200',
                    title: 'Passiva Corte das Fadas ativa na mesa! Salva o jogador da morte uma vez concedendo 2 de Vida extra rosa e +75% de Poder a todas as Fadas.',
                  });
                }

                if (displayCard.conditions.has('praga') || (displayCard.pragaRoundsRemaining ?? 0) > 0) {
                  bonusPills.push({
                    key: 'debuff_praga',
                    icon: '☠️',
                    label: `Praga: -25% em Todos os Atributos (${displayCard.pragaRoundsRemaining ?? 1}r)`,
                    badgeClass: 'bg-lime-950/85 border-lime-400/80 text-lime-200',
                    title: 'Unidade afligida por Praga tem Vida, Ataque, Defesa e Poder reduzidos em 25%.',
                  });
                }

                const hasCorrosaoActive =
                  displayCard.conditions.has('corrosao') ||
                  (displayCard.corrosaoRoundsRemaining != null && displayCard.corrosaoRoundsRemaining > 0);
                if (hasCorrosaoActive) {
                  bonusPills.push({
                    key: 'debuff_corrosao',
                    icon: '🧪',
                    label: `Corrosão Ativa: -1 Vida/Turno & Corta Cura (${displayCard.corrosaoRoundsRemaining ?? 1}r)`,
                    badgeClass: 'bg-lime-950/85 border-lime-300/85 text-lime-100',
                    title: 'Sofre 1 de dano diretamente na Vida a cada turno das rodadas ativo e corta toda cura recebida.',
                  });
                }

                const hasSangramentoActive =
                  displayCard.conditions.has('sangramento') ||
                  (displayCard.sangramentoRoundsRemaining != null && displayCard.sangramentoRoundsRemaining > 0);
                const bleedMarks = displayCard.sangramentoMarks ?? 0;
                if (hasSangramentoActive || bleedMarks > 0) {
                  bonusPills.push({
                    key: 'debuff_sangramento',
                    icon: '🩸',
                    label: hasSangramentoActive
                      ? `Sangramento (${displayCard.sangramentoRoundsRemaining ?? 1}r): -2 Vida/Rodada · Marcas ${bleedMarks}/4 para Hemorragia`
                      : `Marcas de Sangramento: ${bleedMarks}/4 para Hemorragia (-25% Vida Máx.)`,
                    badgeClass: 'bg-rose-950/85 border-rose-400/85 text-rose-100',
                    title: 'Na 4ª vez que Sangramento causar dano (em sequência ou intercalando), transforma-se em Hemorragia causando 25% da Vida Máxima e resetando o contador.',
                  });
                }

                if (
                  board &&
                  (hasCardClass(displayCard, 'Telúrico') || hasCardClass(displayCard, 'Terra')) &&
                  !isSilenced &&
                  board.some(
                    (u) =>
                      (u.templateId === 'n_milton' || u.name.toLowerCase().includes('milton')) &&
                      u.hp > 0 &&
                      u.silencedRounds === 0
                  )
                ) {
                  bonusPills.push({
                    key: 'buff_milton',
                    icon: '🌿',
                    label: 'Passiva de Milton: +25% Dano',
                    badgeClass: 'bg-emerald-950/80 border-emerald-400/80 text-emerald-200',
                    title: 'Milton na mesa concede +25% de dano em ataques de unidades Telúricas.',
                  });
                }

                if (displayCard.doublePower && !isSilenced && !isVotoBlocked) {
                  bonusPills.push({
                    key: 'buff_double_power',
                    icon: '🔮',
                    label: `Mesmerino: Poder 2x (${pwrEffective})`,
                    badgeClass: 'bg-fuchsia-950/80 border-fuchsia-400/75 text-fuchsia-200',
                    title: 'Poder dobrado pelo efeito de Mesmerino.',
                  });
                }

                if (
                  displayCard.powerAlwaysActive &&
                  !isSilenced &&
                  !isVotoBlocked &&
                  !hasCardClass(displayCard, 'Fogo') &&
                  displayCard.element !== 'Mágico' &&
                  displayCard.element !== 'Cósmico'
                ) {
                  bonusPills.push({
                    key: 'buff_power_always',
                    icon: '⚡',
                    label: `Poder Sempre Ativo: +${pwrEffective}`,
                    badgeClass: 'bg-yellow-950/80 border-yellow-400/75 text-yellow-200',
                    title: 'Poder somado ao Dano e à Resistência.',
                  });
                }

                const tempPowerAmt =
                  !isVotoBlocked &&
                  displayCard.tempPowerBuffAmount &&
                  displayCard.tempPowerBuffAmount > 0 &&
                  displayCard.tempPowerBuffRoundsRemaining &&
                  displayCard.tempPowerBuffRoundsRemaining > 0
                    ? displayCard.tempPowerBuffAmount
                    : 0;

                if (tempPowerAmt > 0) {
                  bonusPills.push({
                    key: 'buff_temp_power',
                    icon: '⏳',
                    label: `Buff Temporário: +${tempPowerAmt} Poder (${displayCard.tempPowerBuffRoundsRemaining}r)`,
                    badgeClass: 'bg-indigo-950/80 border-indigo-400/75 text-indigo-200',
                    title: 'Aumento temporário de Poder concedido por habilidade.',
                  });
                }

                if (displayCard.blockChance && displayCard.blockChance > 0 && !isSilenced) {
                  bonusPills.push({
                    key: 'buff_block',
                    icon: '🛡️',
                    label: `Escudo Mágico: ${Math.round(displayCard.blockChance * 100)}% Bloqueio`,
                    badgeClass: 'bg-sky-950/80 border-sky-400/70 text-sky-200',
                    title: 'Chance passiva de bloquear ataques por completo.',
                  });
                }

                if (displayCard.dodgeChance && displayCard.dodgeChance > 0 && !isSilenced) {
                  bonusPills.push({
                    key: 'buff_dodge',
                    icon: '💨',
                    label: `Esquiva: ${Math.round(displayCard.dodgeChance * 100)}%`,
                    badgeClass: 'bg-teal-950/80 border-teal-400/70 text-teal-200',
                    title: 'Chance passiva de esquivar de ataques.',
                  });
                }

                // 3. Melhorias de Atributos em Relação ao Template Base
                if (isInfiniteScale) {
                  bonusPills.push({
                    key: 'buff_infinite',
                    icon: '♾️',
                    label: 'Escala Infinita (∞): Atributos Supremos',
                    badgeClass: 'bg-amber-950/85 border-amber-300/80 text-amber-200',
                    title: 'Atributos elevados à escala infinita e imortalidade.',
                  });
                } else {
                  const tpl = CARD_TEMPLATES.find((t) => t.id === displayCard.templateId);
                  if (tpl) {
                    const hasClassPowerBonus = !isVotoBlocked && !isSilenced;
                    const telHp =
                      hasClassPowerBonus && (hasCardClass(displayCard, 'Telúrico') || hasCardClass(displayCard, 'Terra'))
                        ? displayCard.teluricoPowerHpGranted ??
                          (tpl.element === 'Telúrico' || tpl.element === 'Terra' ? Math.floor(tpl.power * 0.5) : 0)
                        : 0;
                    const telDef =
                      hasClassPowerBonus && (hasCardClass(displayCard, 'Telúrico') || hasCardClass(displayCard, 'Terra'))
                        ? displayCard.teluricoPowerDefGranted ??
                          (tpl.element === 'Telúrico' || tpl.element === 'Terra' ? Math.floor(tpl.power * 0.5) : 0)
                        : 0;
                    const iceDef =
                      hasClassPowerBonus && hasCardClass(displayCard, 'Gelo')
                        ? displayCard.icePowerDefGranted ?? (tpl.element === 'Gelo' ? Math.floor(tpl.power * 0.5) : 0)
                        : 0;
                    const neutroHp =
                      hasClassPowerBonus && hasCardClass(displayCard, 'Neutro')
                        ? displayCard.neutroPowerHpGranted ?? (tpl.element === 'Neutro' ? Math.floor(tpl.power) : 0)
                        : 0;
                    const neutroAtk =
                      hasClassPowerBonus && hasCardClass(displayCard, 'Neutro')
                        ? displayCard.neutroPowerAtkGranted ?? (tpl.element === 'Neutro' ? Math.floor(tpl.power) : 0)
                        : 0;
                    const neutroDef =
                      hasClassPowerBonus && hasCardClass(displayCard, 'Neutro')
                        ? displayCard.neutroPowerDefGranted ?? (tpl.element === 'Neutro' ? Math.floor(tpl.power) : 0)
                        : 0;

                    const expectedHp = tpl.hp + telHp + neutroHp;
                    const expectedAtk = tpl.atk + neutroAtk;
                    const expectedDef = tpl.def + telDef + iceDef + neutroDef;
                    const expectedPower = tpl.power;

                    const atkGain = Math.max(0, displayCard.atk - expectedAtk);
                    const defGain = Math.max(0, displayCard.def - expectedDef);
                    const pwrGain = hasClassPowerBonus
                      ? Math.max(0, displayCard.power - expectedPower - tempPowerAmt)
                      : 0;
                    const hpGain = Math.max(0, displayCard.maxHp - expectedHp);

                    if (atkGain > 0) {
                      bonusPills.push({
                        key: 'stat_atk',
                        icon: '⚔️',
                        label: `+${atkGain} Ataque`,
                        badgeClass: 'bg-emerald-950/80 border-lime-400/70 text-lime-200',
                        title: `Melhoria de Ataque acima do base (${expectedAtk} → ${displayCard.atk}).`,
                      });
                    }
                    if (defGain > 0) {
                      bonusPills.push({
                        key: 'stat_def',
                        icon: '🛡️',
                        label: `+${defGain} Defesa`,
                        badgeClass: 'bg-emerald-950/80 border-lime-400/70 text-lime-200',
                        title: `Melhoria de Defesa acima do base (${expectedDef} → ${displayCard.def}).`,
                      });
                    }
                    if (pwrGain > 0) {
                      bonusPills.push({
                        key: 'stat_pwr',
                        icon: '⚡',
                        label: `+${pwrGain} Poder`,
                        badgeClass: 'bg-emerald-950/80 border-lime-400/70 text-lime-200',
                        title: `Melhoria de Poder acima do base (${expectedPower} → ${displayCard.power}).`,
                      });
                    }
                    if (hpGain > 0) {
                      bonusPills.push({
                        key: 'stat_hp',
                        icon: '❤️',
                        label: `+${hpGain} Vida Máx.`,
                        badgeClass: 'bg-emerald-950/80 border-lime-400/70 text-lime-200',
                        title: `Melhoria de Vida Máxima acima do base (${expectedHp} → ${displayCard.maxHp}).`,
                      });
                    }
                  }
                }

                return (
                  <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-xl bg-black/45 border border-stone-800/70">
                    <span className="text-[11px] font-bold text-amber-300 mr-1 flex items-center gap-1">
                      <span>📈</span> Bônus Ativos:
                    </span>
                    {bonusPills.length > 0 ? (
                      bonusPills.map((b) => (
                        <span
                          key={b.key}
                          title={b.title}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${b.badgeClass}`}
                        >
                          <span>{b.icon}</span>
                          <span>{b.label}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-stone-400 italic">
                        Sem vantagens de classe ou melhorias de atributos ativas.
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* Mechanics & Patch 1.4 Additive Multiclass Formulas Box */}
              {(() => {
                const pwrEffective = getEffectivePower(displayCard, votoSilencioActive);
                const pwrLabel = `(${pwrEffective})`;
                const activeClasses = getCardClasses(displayCard);
                const isMulticlass = activeClasses.length > 1;
                const totalComputedDamage = calculateCombatDamage(
                  displayCard,
                  undefined,
                  false,
                  votoSilencioActive,
                  board
                );
                const totalComputedRes = calculateCardCombatResistance(displayCard, votoSilencioActive);
                const isDivinoUnit = hasCardClass(displayCard, 'Divino');

                const dmgParts: string[] = [];
                if (displayCard.element === 'Cósmico') {
                  dmgParts.push(`Poder ${pwrLabel}`);
                } else if (displayCard.element === 'Mágico') {
                  if (displayCard.atk > 0) dmgParts.push(`Ataque (${displayCard.atk})`);
                  if (!isMulticlass) {
                    dmgParts.push(`Poder ${pwrLabel}`);
                  }
                } else {
                  dmgParts.push(`Ataque (${displayCard.atk})`);
                }
                if (isMulticlass) {
                  for (const cls of activeClasses) {
                    if (cls === 'Mágico') dmgParts.push(`100% Mágico (+${pwrEffective})`);
                    else if (cls === 'Fogo') dmgParts.push(`100% Fogo (+${pwrEffective})`);
                    else if (cls === 'Divino') dmgParts.push(`80% Divino (+${Math.floor(pwrEffective * 0.8)})`);
                    else if (cls === 'Água') dmgParts.push(`50% Água (+${Math.floor(pwrEffective / 2)})`);
                    else if (cls === 'Elétrico') dmgParts.push(`50% Elétrico (+${Math.floor(pwrEffective / 2)})`);
                    else if (cls === 'Gelo') {
                      const iceBonusDef = getIceBonusDefenseValue(displayCard);
                      const extraIceDmg = displayCard.silencedRounds > 0 ? 0 : Math.floor(iceBonusDef * 0.25);
                      dmgParts.push(`25% Gelo Pico (+${extraIceDmg})`);
                    } else if (cls === 'Sombrio') {
                      dmgParts.push(`50% Sombrio Crítico (+${Math.floor(pwrEffective * 0.5)} direto na Vida)`);
                    }
                  }
                }

                return (
              <div className="space-y-2 text-xs bg-stone-950/80 p-3.5 rounded-2xl border border-stone-800">
                {displayCard.imprisonedUnit && (
                  <div className="p-2.5 rounded-xl bg-purple-950/70 border border-fuchsia-400/60 flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⛓️</span>
                      <div>
                        <div className="font-black text-fuchsia-200 text-xs">
                          Prisioneiro em Correntes: {displayCard.imprisonedUnit.name}
                        </div>
                        <div className="text-[11px] text-purple-200/90">
                          Sofre 10 de dano por rodada. Se morrer preso, Barelio usurpa todos os seus atributos!
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono font-black text-xs text-rose-300 shrink-0">
                      ❤️ {displayCard.imprisonedUnit.hp}/{displayCard.imprisonedUnit.maxHp} · ⚔️ {displayCard.imprisonedUnit.atk} · 🛡️ {displayCard.imprisonedUnit.def} · ⚡ {displayCard.imprisonedUnit.power}
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Compass size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <div className="w-full">
                    <span className="font-bold text-stone-200">
                      {isMulticlass
                        ? `Fórmula Aditiva Multiclasse (${activeClasses.join(' + ')}): `
                        : `Fórmula de Combate da Classe (${displayCard.element}): `}
                    </span>
                    {isMulticlass ? (
                      <div className="mt-1 space-y-1 text-stone-300">
                        <div className="flex justify-between gap-2 bg-amber-950/35 p-1.5 rounded border border-amber-400/30">
                          <span>⚜️ <strong>Dano:</strong> {dmgParts.join(' + ')}</span>
                          <span className="font-black text-amber-300 shrink-0">{totalComputedDamage} Dano Real</span>
                        </div>
                        <div className="flex justify-between gap-2 bg-sky-950/35 p-1.5 rounded border border-sky-400/30">
                          <span>
                            🛡️ <strong>Resistência:</strong> Vida ({displayCard.hp}) + Defesa ({displayCard.def})
                            {hasCardClass(displayCard, 'Água') ? ` + 50% Água (+${Math.floor(pwrEffective / 2)})` : ''}
                          </span>
                          <span className="font-black text-sky-300 shrink-0">{totalComputedRes} Resistência Total</span>
                        </div>
                      </div>
                    ) : displayCard.element === 'Fogo' ? (
                      <div className="mt-1 space-y-1 text-stone-300">
                        <div className="flex justify-between bg-red-950/40 p-1.5 rounded border border-red-500/20">
                          <span>🔥 <strong>Dano:</strong> {isOSolLvl2 ? 'Ataque (∞) + Poder (∞)' : `Ataque (${displayCard.atk}) + Poder ${pwrLabel}`}</span>
                          <span className="font-black text-amber-300">{isOSolLvl2 ? '∞ Dano Real (Obliteração)' : `${displayCard.atk + pwrEffective} Dano Real`}</span>
                        </div>
                        <div className="flex justify-between bg-stone-900/40 p-1.5 rounded border border-stone-700/40">
                          <span>🛡️ <strong>Resistência:</strong> {isOSolLvl2 ? 'Vida (∞) + Defesa (∞)' : `Vida (${displayCard.hp}) + Defesa (${displayCard.def})`}</span>
                          <span className="font-black text-sky-300">{isOSolLvl2 ? '∞ Resistência Total (IMORTAL)' : `${displayCard.hp + displayCard.def} Resistência Total`}</span>
                        </div>
                      </div>
                    ) : displayCard.element === 'Divino' ? (
                      <div className="mt-1 space-y-1 text-stone-300">
                        <div className="flex justify-between bg-amber-950/45 p-1.5 rounded border border-amber-400/35">
                          <span>⚜️ <strong>Dano:</strong> Ataque ({displayCard.atk}) + 80% Poder {pwrLabel} (+{Math.floor(pwrEffective * 0.8)})</span>
                          <span className="font-black text-amber-300">{displayCard.atk + Math.floor(pwrEffective * 0.8)} Dano Real</span>
                        </div>
                        <div className="flex justify-between bg-stone-900/40 p-1.5 rounded border border-stone-700/40">
                          <span>🛡️ <strong>Resistência:</strong> Vida ({displayCard.hp}) + Defesa ({displayCard.def})</span>
                          <span className="font-black text-sky-300">{displayCard.hp + displayCard.def} Resistência Total</span>
                        </div>
                        <p className="text-[11px] text-amber-200 font-semibold pt-0.5">
                          ⚜️ Passiva Divino: Pode ser invocada mais cedo (T1 R1 · T2 R2 · T3 R4 · T4 R5 · T5/6 R7) e recebe +80% Poder em Dano!
                        </p>
                      </div>
                    ) : displayCard.element === 'Sombrio' ? (
                      <div className="mt-1 space-y-1 text-stone-300">
                        <div className="flex justify-between bg-purple-950/45 p-1.5 rounded border border-fuchsia-400/35">
                          <span>🌑 <strong>Dano:</strong> Ataque ({displayCard.atk}) + 50% Poder Crítico {pwrLabel} (+{Math.floor(pwrEffective * 0.5)} direto na Vida)</span>
                          <span className="font-black text-fuchsia-300">{displayCard.atk} Normal + {Math.floor(pwrEffective * 0.5)} Crítico</span>
                        </div>
                        <div className="flex justify-between bg-stone-900/40 p-1.5 rounded border border-stone-700/40">
                          <span>🛡️ <strong>Resistência:</strong> Vida ({displayCard.hp}) + Defesa ({displayCard.def})</span>
                          <span className="font-black text-sky-300">{displayCard.hp + displayCard.def} Resistência Total</span>
                        </div>
                        <p className="text-[11px] text-fuchsia-200 font-semibold pt-0.5">
                          🌑 Passiva Sombrio: Causa 50% do Poder atual como dano Crítico diretamente à Vida do alvo. Se tiver Crítico ativo, causa todo o Ataque direto na Vida + 50% do Poder atual!
                        </p>
                      </div>
                    ) : displayCard.element === 'Água' ? (
                      <div className="mt-1 space-y-1 text-stone-300">
                        <div className="flex justify-between bg-sky-950/40 p-1.5 rounded border border-sky-500/20">
                          <span>💧 <strong>Dano:</strong> Ataque ({displayCard.atk}) + 50% Poder {pwrLabel} ({Math.floor(pwrEffective / 2)})</span>
                          <span className="font-black text-amber-300">{displayCard.atk + Math.floor(pwrEffective / 2)} Dano Real</span>
                        </div>
                        <div className="flex justify-between bg-sky-950/40 p-1.5 rounded border border-sky-500/20">
                          <span>🛡️ <strong>Resistência:</strong> Vida ({displayCard.hp}) + Defesa ({displayCard.def}) + 50% Poder {pwrLabel} ({Math.floor(pwrEffective / 2)})</span>
                          <span className="font-black text-sky-300">{displayCard.hp + displayCard.def + Math.floor(pwrEffective / 2)} Resistência Total</span>
                        </div>
                      </div>
                    ) : displayCard.element === 'Gelo' ? (
                      (() => {
                        const iceBonusDef = getIceBonusDefenseValue(displayCard);
                        const extraIceDmg = displayCard.silencedRounds > 0 ? 0 : Math.floor(iceBonusDef * 0.25);
                        return (
                          <div className="mt-1 space-y-1 text-stone-300">
                            <div className="flex justify-between bg-cyan-950/40 p-1.5 rounded border border-cyan-500/20">
                              <span>
                                ❄️ <strong>Dano:</strong> Ataque ({displayCard.atk}) + 25% Defesa{' '}
                                {iceBonusDef > displayCard.def ? `Máx. Acumulada (${iceBonusDef})` : `(${iceBonusDef})`} → +{extraIceDmg}
                              </span>
                              <span className="font-black text-cyan-300">{displayCard.atk + extraIceDmg} Dano Real</span>
                            </div>
                            <div className="flex justify-between bg-cyan-950/40 p-1.5 rounded border border-cyan-500/20">
                              <span>🛡️ <strong>Resistência:</strong> Vida ({displayCard.hp}) + Defesa ({displayCard.def})</span>
                              <span className="font-black text-sky-300">{displayCard.hp + displayCard.def} Resistência Total (Defesa Extra de +{Math.floor(pwrEffective * 0.5)})</span>
                            </div>
                            <p className="text-[11px] text-cyan-300 font-semibold pt-0.5">
                              ❄️ Passiva Gelo: Recebe 50% do Poder atual como Defesa extra e causa 25% do maior valor acumulado de Defesa como dano adicional.
                            </p>
                          </div>
                        );
                      })()
                    ) : displayCard.element === 'Telúrico' || displayCard.element === 'Terra' ? (
                      <div className="mt-1 space-y-1 text-stone-300">
                        <div className="flex justify-between bg-emerald-950/40 p-1.5 rounded border border-emerald-500/20">
                          <span>🌿 <strong>Dano:</strong> Ataque puro</span>
                          <span className="font-black text-emerald-300">{displayCard.atk} Dano Real</span>
                        </div>
                        <div className="flex justify-between bg-emerald-950/40 p-1.5 rounded border border-emerald-500/20">
                          <span>🛡️ <strong>Resistência:</strong> (Vida + 50% Poder) + (Defesa + 50% Poder)</span>
                          <span className="font-black text-sky-300">{displayCard.hp + displayCard.def} Resistência Total (+{Math.floor(pwrEffective * 0.5)} Vid / +{Math.floor(pwrEffective * 0.5)} Def)</span>
                        </div>
                      </div>
                    ) : displayCard.element === 'Elétrico' ? (
                      <div className="mt-1 space-y-1 text-stone-300">
                        <div className="flex justify-between bg-yellow-950/40 p-1.5 rounded border border-yellow-500/20">
                          <span>⚡ <strong>Dano:</strong> Ataque ({displayCard.atk}) + 50% Poder {pwrLabel} ({Math.floor(pwrEffective / 2)})</span>
                          <span className="font-black text-amber-300">{displayCard.atk + Math.floor(pwrEffective / 2)} Dano Real</span>
                        </div>
                        <div className="flex justify-between bg-yellow-950/40 p-1.5 rounded border border-yellow-500/20">
                          <span>🛡️ <strong>Resistência:</strong> Vida ({displayCard.hp}) + Defesa ({displayCard.def})</span>
                          <span className="font-black text-sky-300">{displayCard.hp + displayCard.def} Resistência Total</span>
                        </div>
                        <p className="text-[11px] text-yellow-300 font-semibold pt-0.5">
                          ⚡ O 1º ataque de toda unidade elétrica atordoa a carta inimiga para a rodada seguinte!
                        </p>
                      </div>
                    ) : displayCard.element === 'Mágico' ? (
                      <div className="mt-1 space-y-1 text-stone-300">
                        <div className="flex justify-between gap-2 bg-purple-950/40 p-1.5 rounded border border-purple-500/20">
                          <span>
                            ✨ <strong>Dano:</strong> Poder {pwrLabel}
                            {displayCard.atk > 0
                              ? ` + Ataque (${displayCard.atk})`
                              : ' (100% Poder · Ataque recebido soma ao Dano)'}
                          </span>
                          <span className="font-black text-purple-300 shrink-0">
                            {pwrEffective + Math.max(0, displayCard.atk)} Dano Real
                          </span>
                        </div>
                        <div className="flex justify-between bg-purple-950/40 p-1.5 rounded border border-purple-500/20">
                          <span>🛡️ <strong>Resistência:</strong> Vida ({displayCard.hp}) + Defesa ({displayCard.def})</span>
                          <span className="font-black text-sky-300">{displayCard.hp + displayCard.def} Resistência Total</span>
                        </div>
                      </div>
                    ) : displayCard.element === 'Cósmico' ? (
                      <div className="mt-1 space-y-1 text-stone-300">
                        <div className="flex justify-between bg-indigo-950/40 p-1.5 rounded border border-indigo-500/20">
                          <span>🔮 <strong>Dano:</strong> {isALuaLvl2 ? 'Poder Cósmico em Escala Infinita (∞)' : 'Poder Cósmico'}</span>
                          <span className="font-black text-amber-300">{isALuaLvl2 ? '∞ Dano Real' : `${pwrEffective} Dano Real`}</span>
                        </div>
                        <div className="flex justify-between bg-indigo-950/40 p-1.5 rounded border border-indigo-500/20">
                          <span>🛡️ <strong>Resistência:</strong> {isALuaLvl2 ? 'Sapiência Universal em Escala Infinita (∞)' : 'Sapiência Universal'}</span>
                          <span className="font-black text-indigo-300">{isALuaLvl2 ? '∞ Resistência (IMORTAL)' : `${displayCard.hp} Resistência (Sapiência)`}</span>
                        </div>
                        <p className="text-[11px] text-indigo-300 font-semibold pt-0.5">
                          🧬 Imune a Queimadura e imune a buffs de unidades não-cósmicas.
                        </p>
                      </div>
                    ) : displayCard.element === 'Neutro' ? (
                      <div className="mt-1 space-y-1 text-stone-300">
                        <div className="flex justify-between bg-stone-900/60 p-1.5 rounded border border-stone-700/40">
                          <span>⚔️ <strong>Dano:</strong> Ataque ({displayCard.atk})</span>
                          <span className="font-black text-white">{displayCard.atk} Dano Real</span>
                        </div>
                        <div className="flex justify-between bg-stone-900/60 p-1.5 rounded border border-stone-700/40">
                          <span>🛡️ <strong>Resistência:</strong> Vida ({displayCard.hp}) + Defesa ({displayCard.def})</span>
                          <span className="font-black text-sky-300">{displayCard.hp + displayCard.def} Resistência Total</span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-semibold pt-0.5">
                          ⚔️ Passiva Neutra: Soma 100% do seu Poder atual em Vida, Ataque e Defesa (+{Math.floor(pwrEffective)} em cada atributo).
                        </p>
                      </div>
                    ) : (
                      <p className="text-stone-300 mt-1">Carta de Habilidade: Efeito imediato na mesa de jogo.</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-1 border-t border-stone-800/80">
                  <AlertCircle size={16} className="text-sky-400 shrink-0 mt-0.5" />
                  <div className="text-stone-300">
                    <span className="font-semibold text-stone-200">Disponibilidade de Rodada: </span>
                    <span>
                      {isDivinoUnit ? (
                        <>
                          {displayCard.tier === 1 && 'Liberada na Rodada 1+ (Divino Tier 1)'}
                          {displayCard.tier === 2 && 'Liberada a partir da Rodada 2 (Antecipação Divina — Tier 2)'}
                          {displayCard.tier === 3 && 'Liberada a partir da Rodada 4 (Antecipação Divina — Tier 3)'}
                          {displayCard.tier === 4 && 'Liberada a partir da Rodada 5 (Antecipação Divina — Tier 4)'}
                          {displayCard.tier === 5 && 'Liberada a partir da Rodada 7 (Antecipação Divina — Tier 5)'}
                          {displayCard.tier === 6 && 'Liberada a partir da Rodada 7 (Antecipação Divina — Tier 6)'}
                        </>
                      ) : (
                        <>
                          {displayCard.tier === 1 && 'Liberada nas Rodadas 1 - 2 (Tier 1 Comum)'}
                          {displayCard.tier === 2 && 'Liberada a partir da Rodada 3 (Tier 2 Incomum)'}
                          {displayCard.tier === 3 && 'Liberada a partir da Rodada 5 (Tier 3 Rara)'}
                          {displayCard.tier === 4 && 'Liberada a partir da Rodada 7 (Tier 4 Épica)'}
                          {displayCard.tier === 5 && 'Liberada a partir da Rodada 9+ (Tier 5 Lendária)'}
                          {displayCard.tier === 6 && 'Liberada a partir da Rodada 10+ (Tier 6 Supremo)'}
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Secret Passive: O VAZIO - ONLY visible when both O Absoluto and A Eminente are on board at Level 2! */}
                {hasOVazioActive && (isOSolLvl2 || isALuaLvl2) && (
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-950/80 via-black to-purple-950/80 border border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                    <div className="flex items-center gap-2 text-purple-300 font-serif font-black text-xs uppercase tracking-wider">
                      <span>🌌 PASSIVA SECRETA: O VAZIO (ATIVADA)</span>
                    </div>
                    <p className="mt-1 text-[11px] text-purple-200/90 leading-relaxed">
                      O Absoluto e A Eminente (Nível 2) estão juntos na mesma mesa! Duas divindades cósmicas opostas não coexistem: a antimatéria é desencadeada e causará a aniquilação imediata do seu invocador.
                    </p>
                  </div>
                )}
              </div>
                );
              })()}
                </>
              )}

              {/* Modal Bottom Footer */}
              <div className="flex flex-wrap justify-between items-center gap-2 pt-3 border-t border-stone-800/80">
                <span className="text-xs text-stone-400 font-serif">
                  {kingdom.crest} {kingdom.name} {hasLevelSystem ? `· Nível ${previewLevel}` : ''}
                </span>
                <div className="flex flex-wrap items-center gap-2 ml-auto">
                  {onPlayFromModal && (
                    <button
                      type="button"
                      disabled={!canPlayFromModal}
                      onClick={() => {
                        if (!canPlayFromModal) return;
                        onPlayFromModal();
                        onClose();
                      }}
                      title={canPlayFromModal ? playButtonLabel || 'Jogar Carta' : playDisabledReason || 'Não jogável agora'}
                      className={`min-h-[44px] px-5 py-2 rounded-xl font-serif font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-1.5 ${
                        canPlayFromModal
                          ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-stone-950 border border-emerald-200 shadow-emerald-500/30 cursor-pointer active:scale-95'
                          : 'bg-stone-900/90 text-stone-400 border border-stone-700 cursor-not-allowed'
                      }`}
                    >
                      <span>{canPlayFromModal ? '✨' : '🔒'}</span>
                      <span>
                        {canPlayFromModal
                          ? playButtonLabel || (isSkill ? 'Lançar Habilidade' : 'Invocar na Mesa')
                          : playDisabledReason || 'Indisponível'}
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[44px] px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-medium text-xs transition-colors border border-stone-700 shadow-md cursor-pointer"
                  >
                    Fechar Detalhes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Art Zoom Modal (Full Version Lightbox) */}
      {isZoomOpen && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl p-4 sm:p-8 animate-in fade-in duration-200"
          onClick={() => setIsZoomOpen(false)}
        >
          {/* Zoom Header Bar */}
          <div
            className="w-full max-w-4xl flex items-center justify-between pb-3 border-b border-stone-800 mb-4 text-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl p-1 rounded-lg bg-stone-900 border border-stone-800">
                {kingdom.crest}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-serif font-black text-amber-300">
                    {displayCard.name}
                  </h3>
                  {hasLevelSystem && (
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-purple-900/60 text-purple-200 border border-purple-500/40">
                      Nível {previewLevel}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-400">
                  Arte Oficial em Alta Resolução · {kingdom.name}
                </p>
              </div>
            </div>

            {/* Controls: Level Toggle, Zoom In/Out, Close */}
            <div className="flex items-center gap-2">
              {hasLevelSystem && (
                <div className="flex items-center bg-stone-900/90 rounded-lg p-0.5 border border-stone-800 mr-2">
                  <button
                    onClick={() => setPreviewLevel(1)}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                      previewLevel === 1
                        ? 'bg-amber-500 text-stone-950 shadow'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                    title="Ver Arte Nível 1"
                  >
                    Nv. 1
                  </button>
                  <button
                    onClick={() => setPreviewLevel(2)}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                      previewLevel === 2
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                    title="Ver Arte Nível 2"
                  >
                    Nv. 2
                  </button>
                </div>
              )}

              {/* Zoom Scale controls */}
              <div className="hidden sm:flex items-center bg-stone-900/90 rounded-lg p-0.5 border border-stone-800">
                <button
                  onClick={() => setZoomScale((s) => Math.max(0.75, +(s - 0.25).toFixed(2)))}
                  className="p-1.5 rounded hover:bg-stone-800 text-stone-300 hover:text-white transition-colors"
                  title="Diminuir Zoom"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-[11px] font-mono px-2 text-stone-300 select-none">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  onClick={() => setZoomScale((s) => Math.min(2.5, +(s + 0.25).toFixed(2)))}
                  className="p-1.5 rounded hover:bg-stone-800 text-stone-300 hover:text-white transition-colors"
                  title="Aumentar Zoom"
                >
                  <ZoomIn size={16} />
                </button>
                {zoomScale !== 1 && (
                  <button
                    onClick={() => setZoomScale(1)}
                    className="p-1.5 rounded hover:bg-stone-800 text-amber-400 transition-colors border-l border-stone-800 ml-1"
                    title="Redefinir Zoom (100%)"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>

              {/* Close Zoom */}
              <button
                onClick={() => setIsZoomOpen(false)}
                className="p-2 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors border border-stone-700"
                title="Fechar Zoom (Esc)"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Zoom Body */}
          <div
            className="relative flex-1 w-full max-w-4xl flex items-center justify-center overflow-auto p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="transition-transform duration-200 cursor-zoom-in"
              style={{ transform: `scale(${zoomScale})` }}
              onClick={() => setZoomScale((s) => (s >= 1.5 ? 1 : 1.5))}
              title="Clique para alternar zoom 1x / 1.5x"
            >
              {!zoomImageError && initialArtSrc ? (
                <div className="relative rounded-2xl overflow-hidden shadow-[0_20px_70px_rgba(0,0,0,0.95)] border-2 border-stone-700 max-h-[75vh] max-w-[85vw] sm:max-w-xl bg-black">
                  <img
                    key={`zoom_${initialArtSrc}`}
                    src={initialArtSrc}
                    alt={displayCard.name}
                    onError={(e) => {
                      if (!advanceCardArtFallback(e.currentTarget, artCandidates)) {
                        setZoomImageError(true);
                      }
                    }}
                    className="w-full h-auto object-contain max-h-[75vh] select-none"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 flex items-center justify-between text-xs text-stone-300">
                    <span className="font-serif font-bold text-amber-300">{displayCard.name}</span>
                    <span className="text-xs text-stone-300 font-serif">
                      {kingdom.name} · Tier {displayCard.tier}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <CardView card={displayCard} size="lg" isPlayable={false} />
                  <p className="text-xs text-stone-400 mt-3 bg-stone-900/80 px-3 py-1 rounded-full border border-stone-800">
                    Arte procedural renderizada em alta definição
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Harmonious Description Box in Fullscreen Mode */}
          <div
            className="w-full max-w-2xl mt-3 px-4 py-2.5 rounded-2xl bg-stone-950/90 border border-stone-800 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <FormattedCardDescription
              text={displayCard.effectDescription}
              variant="compact"
            />
          </div>

          {/* Zoom Footer instruction */}
          <div className="text-[11px] text-stone-500 pt-2 flex items-center gap-3">
            <span>Dica: Clique na arte para alternar o zoom</span>
            <span>·</span>
            <span>Pressione <kbd className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 font-mono text-[10px]">ESC</kbd> para fechar</span>
          </div>
        </div>
      )}

      {/* Interactive Level-Up Cinematic Preview for ALL Tier 5/6 Level-Up Cards */}
      {isLevelUpPreviewOpen && hasLevelSystem && (
        <LevelUpCinematicOverlay
          card={{ ...card, level: 2 }}
          awakenedPowerText={getDefaultAwakenedPowerText(card)}
          isStaticMode={animationMode !== 'full' || !combatAnimations}
          isPreview
          onComplete={() => {
            setIsLevelUpPreviewOpen(false);
            setPreviewLevel(2);
          }}
        />
      )}
    </>
  );
};
