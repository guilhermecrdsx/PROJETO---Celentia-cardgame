import React, { useState, useEffect, useMemo } from 'react';
import { CardInstance, ElementType, TierType } from '../types/game';
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
import {
  ELEMENT_CONFIG,
  KINGDOM_THEMES,
  TIER_CONFIG,
  getCardArtCandidates,
  advanceCardArtFallback,
  getThematicCardArt,
} from '../utils/cardVisuals';
import { CardConditionItem, getCardConditionItems } from '../utils/conditionEffectsConfig';
import { CardView } from './CardView';
import { FormattedCardDescription } from './FormattedCardDescription';
import { hasCardLevelUpMechanic, getDefaultAwakenedPowerText } from '../utils/levelUpThemes';
import { getForgedPalette } from '../utils/cardForgeTheme';
import { CardFiligreeCorners } from './CardFiligreeSVG';
import {
  X,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  BookOpen,
  Info,
  Swords,
  Shield,
  Sparkles,
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

type OriginBucket = 'passiva_unidade' | 'inerente_carta' | 'adquirido_positivo' | 'adquirido_negativo';
type ActiveTooltip = 'class' | 'kingdom' | 'tier' | 'damage' | 'defense' | null;

interface ClassDetailedInfo {
  title: string;
  summary: string;
  damageRule: string;
  defenseRule: string;
  specialRule?: string;
}

const CLASS_DETAIL_MAP: Record<ElementType, ClassDetailedInfo> = {
  Fogo: {
    title: 'Classe Fogo',
    summary: 'Especialista em dano explosivo máximo.',
    damageRule: 'Dano = Ataque + 100% do Poder.',
    defenseRule: 'Resistência = Vida + Defesa.',
  },
  Água: {
    title: 'Classe Água',
    summary: 'Equilíbrio fluido entre ataque e resistência.',
    damageRule: 'Dano = Ataque + 50% do Poder.',
    defenseRule: 'Resistência = Vida + Defesa + 50% do Poder.',
  },
  Telúrico: {
    title: 'Classe Telúrico',
    summary: 'Muralha primordial com alta sobrevivência.',
    damageRule: 'Dano = Ataque puro.',
    defenseRule: 'Recebe +50% do Poder em Vida Máxima e +50% em Defesa.',
  },
  Terra: {
    title: 'Classe Telúrico',
    summary: 'Muralha primordial com alta sobrevivência.',
    damageRule: 'Dano = Ataque puro.',
    defenseRule: 'Recebe +50% do Poder em Vida Máxima e +50% em Defesa.',
  },
  Elétrico: {
    title: 'Classe Elétrico',
    summary: 'Controle de ritmo com impacto imediato.',
    damageRule: 'Dano = Ataque + 50% do Poder.',
    defenseRule: 'Resistência = Vida + Defesa.',
    specialRule: 'O 1º ataque de toda unidade Elétrica atordoa o alvo para a rodada seguinte.',
  },
  Mágico: {
    title: 'Classe Mágico',
    summary: 'Combate canalizado por energia arcana.',
    damageRule: 'Dano = 100% do Poder (+ qualquer Ataque adicional recebido).',
    defenseRule: 'Resistência = Vida + Defesa.',
  },
  Cósmico: {
    title: 'Classe Cósmico',
    summary: 'Entidade transcendental imune a interferências comuns.',
    damageRule: 'Dano = Poder Cósmico.',
    defenseRule: 'Resistência = Sapiência Universal.',
    specialRule: 'Imune a Queimadura e a buffs de unidades não-cósmicas.',
  },
  Gelo: {
    title: 'Classe Gelo',
    summary: 'Converte resiliência defensiva em dano glacial.',
    damageRule: 'Dano = Ataque + 25% do maior pico acumulado de Defesa.',
    defenseRule: 'Recebe +50% do Poder atual como Defesa extra.',
  },
  Divino: {
    title: 'Classe Divino',
    summary: 'Ascensão acelerada e poder sagrado elevado.',
    damageRule: 'Dano = Ataque + 80% do Poder.',
    defenseRule: 'Resistência = Vida + Defesa.',
    specialRule: 'Antecipação Divina: libera Tiers antes das rodadas padrão (T2 R2 · T3 R4 · T4 R5 · T5/6 R7).',
  },
  Sombrio: {
    title: 'Classe Sombrio',
    summary: 'Perfura defesas com dano crítico direto na Vida.',
    damageRule: 'Ataque normal + 50% do Poder como Dano Crítico direto na Vida.',
    defenseRule: 'Resistência = Vida + Defesa.',
    specialRule: 'Com Crítico ativo, causa todo o Ataque direto na Vida + 50% do Poder atual.',
  },
  Neutro: {
    title: 'Classe Neutro',
    summary: 'Versatilidade pura convertendo Poder em todos os atributos.',
    damageRule: 'Dano = Ataque (já somado com +100% do Poder).',
    defenseRule: 'Soma +100% do Poder atual em Vida, Ataque e Defesa.',
  },
  Nenhum: {
    title: 'Carta de Habilidade',
    summary: 'Efeito imediato conjurado diretamente da mão.',
    damageRule: 'Não combate diretamente como unidade.',
    defenseRule: 'Habilidades Rápidas podem responder a ações; Lentas exigem seu turno.',
  },
};

const TIER_UNLOCK_TABLE: Array<{
  tier: TierType;
  name: string;
  normalRound: string;
  divineRound: string;
}> = [
  { tier: 1, name: 'Comum', normalRound: 'Rodada 1+', divineRound: 'Rodada 1+' },
  { tier: 2, name: 'Incomum', normalRound: 'Rodada 3+', divineRound: 'Rodada 2+' },
  { tier: 3, name: 'Rara', normalRound: 'Rodada 5+', divineRound: 'Rodada 4+' },
  { tier: 4, name: 'Épica', normalRound: 'Rodada 7+', divineRound: 'Rodada 5+' },
  { tier: 5, name: 'Lendária', normalRound: 'Rodada 9+', divineRound: 'Rodada 7+' },
  { tier: 6, name: 'Supremo', normalRound: 'Rodada 10+', divineRound: 'Rodada 7+' },
];

const ORIGIN_STYLES: Record<
  OriginBucket,
  {
    tag: string;
    legendText: string;
    colorWord: string;
    squareClass: string;
    panelBorderClass: string;
    tagClass: string;
    dotBgClass: string;
    activeRowClass: string;
  }
> = {
  passiva_unidade: {
    tag: '[Passiva]',
    legendText: 'Passiva da unidade',
    colorWord: 'dourado',
    squareClass:
      'border-amber-400 bg-amber-500/25 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.45)]',
    panelBorderClass: 'border-amber-400/80',
    tagClass: 'text-amber-300',
    dotBgClass: 'bg-amber-400 border-amber-200',
    activeRowClass: 'bg-amber-500/18 border-amber-400/75 text-amber-100 font-bold',
  },
  inerente_carta: {
    tag: '[Inerente]',
    legendText: 'Efeito inerente da carta',
    colorWord: 'azul',
    squareClass:
      'border-blue-400 bg-blue-600/30 text-blue-100 shadow-[0_0_12px_rgba(59,130,246,0.4)]',
    panelBorderClass: 'border-blue-400/80',
    tagClass: 'text-blue-300',
    dotBgClass: 'bg-blue-500 border-blue-200',
    activeRowClass: 'bg-blue-500/20 border-blue-400/75 text-blue-100 font-bold',
  },
  adquirido_positivo: {
    tag: '[Adquirido Positivo]',
    legendText: 'Efeito adquirido a partir de outra unidade ou habilidade',
    colorWord: 'verde',
    squareClass:
      'border-emerald-400 bg-emerald-600/30 text-emerald-100 shadow-[0_0_12px_rgba(34,197,94,0.42)]',
    panelBorderClass: 'border-emerald-400/80',
    tagClass: 'text-emerald-300',
    dotBgClass: 'bg-emerald-500 border-emerald-200',
    activeRowClass: 'bg-emerald-500/20 border-emerald-400/75 text-emerald-100 font-bold',
  },
  adquirido_negativo: {
    tag: '[Adquirido Negativo]',
    legendText: 'Efeito negativo adquirido',
    colorWord: 'vermelho',
    squareClass:
      'border-red-500 bg-red-600/30 text-red-100 shadow-[0_0_12px_rgba(239,68,68,0.45)]',
    panelBorderClass: 'border-red-500/80',
    tagClass: 'text-red-300',
    dotBgClass: 'bg-red-500 border-red-200',
    activeRowClass: 'bg-red-500/20 border-red-400/75 text-red-100 font-bold',
  },
};

function resolveConditionOriginBucket(item: CardConditionItem): OriginBucket {
  if (item.sourceType === 'passivo_especial') return 'passiva_unidade';
  if (item.sourceType === 'passivo') return 'inerente_carta';
  if (item.sourceType === 'negativo') return 'adquirido_negativo';
  return 'adquirido_positivo';
}

function splitLevelUpDescription(
  rawText: string,
  fallbackRequirement: string,
  fallbackLevel2Text: string
): {
  level1Text: string;
  requirementText: string;
  level2Text: string;
} {
  const normalized = (rawText || '').trim();
  const reqRegex = /Requisito para subir de n[ií]vel\s*:\s*/i;
  const lvl2Regex = /Efeito\s+EXTRA\s+de\s+n[ií]vel\s*2\s*:\s*/i;

  const reqMatch = reqRegex.exec(normalized);
  const lvl2Match = lvl2Regex.exec(normalized);

  if (!reqMatch && !lvl2Match) {
    return {
      level1Text: normalized || 'Sem efeitos adicionais no Nível 1.',
      requirementText: fallbackRequirement,
      level2Text: fallbackLevel2Text,
    };
  }

  let level1Text = normalized;
  let requirementText = fallbackRequirement;
  let level2Text = fallbackLevel2Text;

  if (reqMatch) {
    level1Text = normalized.slice(0, reqMatch.index).trim();
    const afterReq = normalized.slice(reqMatch.index + reqMatch[0].length);
    const innerLvl2 = lvl2Regex.exec(afterReq);
    if (innerLvl2) {
      const parsedReq = afterReq.slice(0, innerLvl2.index).trim();
      const parsedLvl2 = afterReq.slice(innerLvl2.index + innerLvl2[0].length).trim();
      if (parsedReq) requirementText = parsedReq;
      if (parsedLvl2) level2Text = parsedLvl2;
    } else {
      const parsedReq = afterReq.trim();
      if (parsedReq) requirementText = parsedReq;
    }
  } else if (lvl2Match) {
    level1Text = normalized.slice(0, lvl2Match.index).trim();
    const parsedLvl2 = normalized.slice(lvl2Match.index + lvl2Match[0].length).trim();
    if (parsedLvl2) level2Text = parsedLvl2;
  }

  return {
    level1Text: level1Text || 'Não possui efeitos adicionais no Nível 1.',
    requirementText: requirementText || fallbackRequirement,
    level2Text: level2Text || fallbackLevel2Text,
  };
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
  const isSkill = card.type === 'skill';
  const hasLevelSystem = hasCardLevelUpMechanic(card);

  const [previewLevel, setPreviewLevel] = useState<1 | 2>(!isSkill && card.level === 2 ? 2 : 1);
  const [showInGameFrame, setShowInGameFrame] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [mainArtError, setMainArtError] = useState(false);
  const [zoomImageError, setZoomImageError] = useState(false);
  const [selectedConditionKey, setSelectedConditionKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'descricao' | 'historia'>('descricao');
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip>(null);

  useEffect(() => {
    setPreviewLevel(!isSkill && card.level === 2 ? 2 : 1);
    setShowInGameFrame(false);
    setIsZoomOpen(false);
    setZoomScale(1);
    setMainArtError(false);
    setZoomImageError(false);
    setSelectedConditionKey(null);
    setActiveTab('descricao');
    setActiveTooltip(null);
  }, [card.instanceId, card.templateId, card.level, card.isRevealedFaleziel, isSkill]);

  useEffect(() => {
    setMainArtError(false);
    setZoomImageError(false);
  }, [previewLevel]);

  // Escape key hierarchy: Zoom -> Condition Detail Overlay -> Main Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isZoomOpen) {
        setIsZoomOpen(false);
      } else if (selectedConditionKey) {
        setSelectedConditionKey(null);
      } else {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoomOpen, selectedConditionKey, onClose]);

  const baseTemplate = useMemo(
    () => CARD_TEMPLATES.find((t) => t.id === card.templateId),
    [card.templateId]
  );

  // Derive displayed card instance reflecting previewLevel (for art, name, stats, & conditions)
  const displayCard: CardInstance = useMemo(() => {
    if (!hasLevelSystem) return card;
    if (previewLevel === 2 && (card.templateId === 'g_barao_well' || card.name.toLowerCase().includes('well'))) {
      return { ...card, level: 2, exclusiveName: 'Soberano da Tempestade' };
    }
    if (previewLevel === 2 && (card.templateId === 'm_licia' || card.name.toLowerCase().includes('licia'))) {
      return { ...card, level: 2, exclusiveName: 'Guardiã do Véu' };
    }
    if (previewLevel === 2 && (card.templateId === 'n_saniel' || card.templateId === 'n_seniel' || card.name.toLowerCase().includes('saniel'))) {
      return { ...card, level: 2, exclusiveName: 'Colheita Celestial' };
    }
    if (previewLevel === 2 && (card.templateId === 'g_craff' || card.name.toLowerCase().includes('craff'))) {
      return { ...card, level: 2, exclusiveName: 'Presença Rúnica & Rochedo' };
    }
    if (previewLevel === 2 && (card.templateId === 'm_titano' || card.name.toLowerCase().includes('titano'))) {
      return { ...card, level: 2, exclusiveName: 'Carrasco dos Mares & Sangramento' };
    }
    if (previewLevel === 2 && (card.templateId === 'n_helio' || card.name.toLowerCase().includes('hélio') || card.name.toLowerCase().includes('helio'))) {
      return { ...card, level: 2, exclusiveName: 'Arauto Solar Supremo' };
    }
    if (previewLevel === 2 && (card.templateId === 'g_lunario' || card.name.toLowerCase().includes('lunario'))) {
      return { ...card, level: 2, name: 'Lunario, Emissário Cósmico Supremo', exclusiveName: 'Devorador de Sonhos' };
    }
    if (previewLevel === 2 && (card.templateId === 'm_bonetrus' || card.name.toLowerCase().includes('bonetrus'))) {
      return { ...card, level: 2, name: 'Bonetrus, Soberano do Inverno', exclusiveName: 'Devastação Glacial' };
    }
    if (previewLevel === 2 && (card.templateId === 'n_o_sol' || card.name.trim().toLowerCase().startsWith('o sol'))) {
      return { ...card, level: 2, name: 'O Sol - O Absoluto', exclusiveName: 'O Absoluto (Buraco Negro · Imortal)' };
    }
    if (previewLevel === 2 && (card.templateId === 'g_a_lua' || card.name.trim().toLowerCase().startsWith('a lua'))) {
      return { ...card, level: 2, name: 'A Lua - A Eminente', exclusiveName: 'A Eminente (Monstruosidade Sanguinária · Imortal)' };
    }
    if (previewLevel === 2 && (card.templateId === 'g_kaliel' || card.name.toLowerCase().includes('kaliel'))) {
      return { ...card, level: 2, exclusiveName: 'Comunhão Angiris' };
    }
    return { ...card, level: previewLevel };
  }, [card, hasLevelSystem, previewLevel]);

  const conditionItems = useMemo(() => getCardConditionItems(displayCard, true), [displayCard]);
  const selectedCondition = useMemo(
    () => conditionItems.find((item) => item.key === selectedConditionKey) || null,
    [conditionItems, selectedConditionKey]
  );

  const resolvedLore = (displayCard.lore ?? baseTemplate?.lore ?? '').trim();
  const kingdom = KINGDOM_THEMES[displayCard.kingdom];
  const element = ELEMENT_CONFIG[displayCard.element] || ELEMENT_CONFIG.Neutro;
  const tier = TIER_CONFIG[displayCard.tier] || TIER_CONFIG[1];
  const forged = getForgedPalette(displayCard.tier, {
    isLevel2: !isSkill && displayCard.level === 2,
    isFugaz: displayCard.isFugaz,
    isSkill,
  });

  const isLvl2 = displayCard.level === 2;
  const isOSolLvl2 =
    isLvl2 &&
    (displayCard.templateId === 'n_o_sol' || displayCard.name.trim().toLowerCase().startsWith('o sol'));
  const isALuaLvl2 =
    isLvl2 &&
    (displayCard.templateId === 'g_a_lua' || displayCard.name.trim().toLowerCase().startsWith('a lua'));
  const isInfiniteScale =
    isOSolLvl2 ||
    isALuaLvl2 ||
    displayCard.hp >= 999999 ||
    displayCard.atk >= 999999 ||
    displayCard.power >= 999999;

  const artCandidates = getCardArtCandidates(displayCard.templateId, {
    isLvl2,
    isRevealedFaleziel: displayCard.isRevealedFaleziel,
    isPack: displayCard.templateId === 'pack_atormentador' || displayCard.isPack,
    name: displayCard.name,
  });
  const initialArtSrc = artCandidates[0];

  // Unified Level 1 + Level-Up Requirement + Level 2 description (always shown together in EFEITO ÚNICO)
  const effectBreakdown = useMemo(() => {
    const rawBaseText =
      baseTemplate?.effectDescription ||
      card.effectDescription ||
      'Guerreiro convocado para lutar pelo reino nas batalhas ancestrais.';

    if (!hasLevelSystem) {
      return {
        level1Text: rawBaseText,
        requirementText: '',
        level2Text: '',
      };
    }

    const fallbackReq =
      baseTemplate?.levelUpRequirement ||
      'Cumpra o requisito especial da unidade em campo.';
    const fallbackLvl2 = getDefaultAwakenedPowerText(card);

    return splitLevelUpDescription(rawBaseText, fallbackReq, fallbackLvl2);
  }, [baseTemplate, card, hasLevelSystem]);

  // Combat Damage & Defense calculations + hover formula breakdown
  const combatSummary = useMemo(() => {
    const pwrEffective = getEffectivePower(displayCard, votoSilencioActive);
    const activeClasses = getCardClasses(displayCard);
    const isMulticlass = activeClasses.length > 1;
    const isDivinoUnit = hasCardClass(displayCard, 'Divino');

    if (isSkill) {
      const isRapid = displayCard.speed !== 'lenta';
      return {
        activeClasses,
        isMulticlass: false,
        isDivinoUnit: false,
        damageValueLabel: isRapid ? 'Rápida' : 'Lenta',
        damageFormulaLines: [
          isRapid
            ? 'Habilidade Rápida: pode ser lançada em resposta a ações ou ataques.'
            : 'Habilidade Lenta: deve ser lançada durante seu turno livre.',
        ],
        defenseValueLabel: 'Efeito Imediato',
        defenseFormulaLines: [
          'Cartas de habilidade não ocupam espaço na mesa e aplicam seu efeito diretamente.',
        ],
      };
    }

    const totalComputedDamage = calculateCombatDamage(
      displayCard,
      undefined,
      false,
      votoSilencioActive,
      board
    );
    const totalComputedRes = calculateCardCombatResistance(displayCard, votoSilencioActive);

    const damageFormulaLines: string[] = [];
    const defenseFormulaLines: string[] = [];

    if (isOSolLvl2 || isALuaLvl2) {
      damageFormulaLines.push('Escala Infinita (∞): Oblitera qualquer unidade em combate.');
      defenseFormulaLines.push('IMORTAL (∞): Resistência infinita em campo.');
      return {
        activeClasses,
        isMulticlass,
        isDivinoUnit,
        damageValueLabel: '∞ (Obliteração)',
        damageFormulaLines,
        defenseValueLabel: '∞ (Imortal)',
        defenseFormulaLines,
      };
    }

    if (isMulticlass) {
      const dmgParts: string[] = [];
      if (displayCard.element === 'Cósmico') {
        dmgParts.push(`Poder (${pwrEffective})`);
      } else if (displayCard.element === 'Mágico') {
        if (displayCard.atk > 0) dmgParts.push(`Ataque (${displayCard.atk})`);
      } else {
        dmgParts.push(`Ataque (${displayCard.atk})`);
      }
      for (const cls of activeClasses) {
        if (cls === 'Mágico') dmgParts.push(`100% Mágico (+${pwrEffective})`);
        else if (cls === 'Fogo') dmgParts.push(`100% Fogo (+${pwrEffective})`);
        else if (cls === 'Divino') dmgParts.push(`80% Divino (+${Math.floor(pwrEffective * 0.8)})`);
        else if (cls === 'Água') dmgParts.push(`50% Água (+${Math.floor(pwrEffective / 2)})`);
        else if (cls === 'Elétrico') dmgParts.push(`50% Elétrico (+${Math.floor(pwrEffective / 2)})`);
        else if (cls === 'Gelo') {
          const iceDef = getIceBonusDefenseValue(displayCard);
          const extraIce = displayCard.silencedRounds > 0 ? 0 : Math.floor(iceDef * 0.25);
          dmgParts.push(`25% Gelo Pico (+${extraIce})`);
        } else if (cls === 'Sombrio') {
          dmgParts.push(`50% Sombrio Crítico (+${Math.floor(pwrEffective * 0.5)} na Vida)`);
        }
      }
      damageFormulaLines.push(`Fórmula Multiclasse (${activeClasses.join(' + ')}):`);
      damageFormulaLines.push(`${dmgParts.join(' + ')} = ${totalComputedDamage} Dano Real`);
      defenseFormulaLines.push(
        `Vida (${displayCard.hp}) + Defesa (${displayCard.def})${
          hasCardClass(displayCard, 'Água') ? ` + 50% Água (+${Math.floor(pwrEffective / 2)})` : ''
        } = ${totalComputedRes} Resistência`
      );
    } else if (displayCard.element === 'Fogo') {
      damageFormulaLines.push(`Ataque (${displayCard.atk}) + 100% Poder (${pwrEffective}) = ${totalComputedDamage}`);
      defenseFormulaLines.push(`Vida (${displayCard.hp}) + Defesa (${displayCard.def}) = ${totalComputedRes}`);
    } else if (displayCard.element === 'Divino') {
      const divBonus = Math.floor(pwrEffective * 0.8);
      damageFormulaLines.push(`Ataque (${displayCard.atk}) + 80% Poder (+${divBonus}) = ${totalComputedDamage}`);
      defenseFormulaLines.push(`Vida (${displayCard.hp}) + Defesa (${displayCard.def}) = ${totalComputedRes}`);
    } else if (displayCard.element === 'Sombrio') {
      const crit = Math.floor(pwrEffective * 0.5);
      damageFormulaLines.push(`Ataque Normal (${displayCard.atk}) + Crítico Sombrio direto na Vida (+${crit})`);
      defenseFormulaLines.push(`Vida (${displayCard.hp}) + Defesa (${displayCard.def}) = ${totalComputedRes}`);
    } else if (displayCard.element === 'Água') {
      const half = Math.floor(pwrEffective / 2);
      damageFormulaLines.push(`Ataque (${displayCard.atk}) + 50% Poder (+${half}) = ${totalComputedDamage}`);
      defenseFormulaLines.push(
        `Vida (${displayCard.hp}) + Defesa (${displayCard.def}) + 50% Poder (+${half}) = ${totalComputedRes}`
      );
    } else if (displayCard.element === 'Gelo') {
      const iceDef = getIceBonusDefenseValue(displayCard);
      const extraIce = displayCard.silencedRounds > 0 ? 0 : Math.floor(iceDef * 0.25);
      damageFormulaLines.push(`Ataque (${displayCard.atk}) + 25% Defesa Pico (${iceDef} → +${extraIce}) = ${totalComputedDamage}`);
      defenseFormulaLines.push(
        `Vida (${displayCard.hp}) + Defesa (${displayCard.def}) = ${totalComputedRes} (inclui +${Math.floor(
          pwrEffective * 0.5
        )} Def de Poder)`
      );
    } else if (displayCard.element === 'Telúrico' || displayCard.element === 'Terra') {
      damageFormulaLines.push(`Ataque puro (${displayCard.atk}) = ${totalComputedDamage}`);
      defenseFormulaLines.push(
        `Vida (${displayCard.hp}) + Defesa (${displayCard.def}) = ${totalComputedRes} (+${Math.floor(
          pwrEffective * 0.5
        )} Vida / +${Math.floor(pwrEffective * 0.5)} Def de Poder)`
      );
    } else if (displayCard.element === 'Elétrico') {
      const half = Math.floor(pwrEffective / 2);
      damageFormulaLines.push(`Ataque (${displayCard.atk}) + 50% Poder (+${half}) = ${totalComputedDamage}`);
      damageFormulaLines.push('1º ataque atordoa a unidade inimiga para a rodada seguinte.');
      defenseFormulaLines.push(`Vida (${displayCard.hp}) + Defesa (${displayCard.def}) = ${totalComputedRes}`);
    } else if (displayCard.element === 'Mágico') {
      damageFormulaLines.push(
        `100% Poder (${pwrEffective})${displayCard.atk > 0 ? ` + Ataque (${displayCard.atk})` : ''} = ${totalComputedDamage}`
      );
      defenseFormulaLines.push(`Vida (${displayCard.hp}) + Defesa (${displayCard.def}) = ${totalComputedRes}`);
    } else if (displayCard.element === 'Cósmico') {
      damageFormulaLines.push(`Poder Cósmico (${pwrEffective}) = ${totalComputedDamage}`);
      defenseFormulaLines.push(`Sapiência Universal (${displayCard.hp}) = ${totalComputedRes}`);
    } else {
      damageFormulaLines.push(`Ataque (${displayCard.atk}) = ${totalComputedDamage} (+100% Poder somado aos atributos)`);
      defenseFormulaLines.push(`Vida (${displayCard.hp}) + Defesa (${displayCard.def}) = ${totalComputedRes}`);
    }

    const damageValueLabel =
      displayCard.element === 'Sombrio' && !isMulticlass
        ? `${displayCard.atk} + ${Math.floor(pwrEffective * 0.5)} Crít.`
        : `${totalComputedDamage} Dano`;

    const defenseValueLabel =
      displayCard.element === 'Cósmico'
        ? `${totalComputedRes} Sapiência`
        : `${totalComputedRes} Resist. (${displayCard.hp}V + ${displayCard.def}D)`;

    return {
      activeClasses,
      isMulticlass,
      isDivinoUnit,
      damageValueLabel,
      damageFormulaLines,
      defenseValueLabel,
      defenseFormulaLines,
    };
  }, [displayCard, isSkill, votoSilencioActive, board, isOSolLvl2, isALuaLvl2]);

  // Active Bonuses list (for the bottom-right fixed box "BÔNUS ATIVOS")
  const activeBonuses = useMemo(() => {
    if (isSkill) return [];

    const isSilenced = displayCard.silencedRounds > 0;
    const hasImunidade =
      displayCard.conditions.has('imunidade') || (displayCard.immunedRounds ?? 0) > 0;
    const isVotoBlocked =
      !hasImunidade &&
      (votoSilencioActive ||
        displayCard.votoSilencioSavedPower !== undefined ||
        (displayCard.votoSilencioRoundsRemaining ?? 0) > 0);
    const pwrEffective = getEffectivePower(displayCard, votoSilencioActive);
    const activeClasses = getCardClasses(displayCard);

    const list: Array<{
      key: string;
      icon: string;
      label: string;
      toneClass: string;
      title: string;
    }> = [];

    if (!isSilenced && isVotoBlocked) {
      list.push({
        key: 'voto_silencio',
        icon: '🤫',
        label: `Voto do Silêncio: Poder zerado (${displayCard.votoSilencioRoundsRemaining ?? 1}r)`,
        toneClass: 'border-stone-600/70 bg-stone-900/70 text-stone-300',
        title: 'Poder e bônus de classe derivados do Poder temporariamente suprimidos.',
      });
    }

    if (activeClasses.length > 1) {
      list.push({
        key: 'multiclass',
        icon: '🧬',
        label: `Multiclasse (${activeClasses.join(' + ')})`,
        toneClass: 'border-amber-400/60 bg-amber-950/50 text-amber-200',
        title: 'Multiplicadores de todas as classes ativas são somados no combate.',
      });
    }

    for (const cls of activeClasses) {
      if (cls === 'Fogo') {
        list.push({
          key: 'cls_fogo',
          icon: '🔥',
          label: isOSolLvl2 ? 'Fogo: +∞ Dano' : `Fogo: +${pwrEffective} Dano (100% Poder)`,
          toneClass: 'border-orange-500/45 bg-orange-950/40 text-orange-200',
          title: 'Vantagem Fogo: soma 100% do Poder ao Dano.',
        });
      } else if (cls === 'Divino') {
        list.push({
          key: 'cls_divino',
          icon: '⚜️',
          label: `Divino: +${Math.floor(pwrEffective * 0.8)} Dano (80% Poder)`,
          toneClass: 'border-amber-400/50 bg-amber-950/40 text-amber-200',
          title: 'Vantagem Divino: +80% do Poder em Dano e liberação antecipada de Tier.',
        });
      } else if (cls === 'Água') {
        const half = Math.floor(pwrEffective / 2);
        list.push({
          key: 'cls_agua',
          icon: '💧',
          label: `Água: +${half} Dano / +${half} Resistência`,
          toneClass: 'border-sky-500/45 bg-sky-950/40 text-sky-200',
          title: 'Vantagem Água: +50% Poder em Dano e +50% em Resistência.',
        });
      } else if (cls === 'Gelo') {
        const icePeakDef = getIceBonusDefenseValue(displayCard);
        const iceExtraDmg = isSilenced ? 0 : Math.floor(icePeakDef * 0.25);
        list.push({
          key: 'cls_gelo',
          icon: '❄️',
          label: isSilenced
            ? 'Gelo: Bônus silenciado'
            : `Gelo: +${iceExtraDmg} Dano (25% Def) · +${Math.floor(pwrEffective * 0.5)} Def`,
          toneClass: 'border-cyan-400/45 bg-cyan-950/40 text-cyan-200',
          title: 'Vantagem Gelo: +50% Poder em Defesa e +25% do pico de Defesa em Dano.',
        });
      } else if (cls === 'Telúrico' || cls === 'Terra') {
        const half = Math.floor(pwrEffective * 0.5);
        list.push({
          key: 'cls_tel',
          icon: '🌿',
          label: `Telúrico: +${half} Vida / +${half} Defesa`,
          toneClass: 'border-emerald-500/45 bg-emerald-950/40 text-emerald-200',
          title: 'Vantagem Telúrico: +50% Poder em Vida Máxima e +50% em Defesa.',
        });
      } else if (cls === 'Elétrico') {
        list.push({
          key: 'cls_eletrico',
          icon: '⚡',
          label: `Elétrico: +${Math.floor(pwrEffective / 2)} Dano · Atordoa 1º Atq`,
          toneClass: 'border-yellow-500/45 bg-yellow-950/40 text-yellow-200',
          title: 'Vantagem Elétrico: +50% Poder em Dano e atordoa no primeiro ataque.',
        });
      } else if (cls === 'Mágico') {
        list.push({
          key: 'cls_magico',
          icon: '✨',
          label: `Mágico: ${pwrEffective} Poder${displayCard.atk > 0 ? ` + ${displayCard.atk} Atq` : ''} em Dano`,
          toneClass: 'border-purple-500/45 bg-purple-950/40 text-purple-200',
          title: 'Vantagem Mágico: utiliza 100% do Poder + Ataque adicional em Dano.',
        });
      } else if (cls === 'Cósmico') {
        list.push({
          key: 'cls_cosmico',
          icon: '🧬',
          label: isALuaLvl2 ? 'Cósmico: ∞ Sapiência & Poder' : 'Cósmico: Imune a Queimadura e Buffs Comuns',
          toneClass: 'border-indigo-400/50 bg-indigo-950/40 text-indigo-200',
          title: 'Vantagem Cósmico: usa Sapiência/Poder e ignora buffs externos não-cósmicos.',
        });
      } else if (cls === 'Sombrio') {
        list.push({
          key: 'cls_sombrio',
          icon: '🌑',
          label: `Sombrio: +${Math.floor(pwrEffective * 0.5)} Crítico direto na Vida`,
          toneClass: 'border-fuchsia-400/50 bg-purple-950/45 text-fuchsia-200',
          title: 'Vantagem Sombrio: 50% do Poder como dano crítico direto na Vida.',
        });
      } else if (cls === 'Neutro' && pwrEffective > 0) {
        const nb = Math.floor(pwrEffective);
        list.push({
          key: 'cls_neutro',
          icon: '🧭',
          label: `Neutro: +${nb} Vida / +${nb} Atq / +${nb} Def`,
          toneClass: 'border-slate-400/50 bg-slate-900/60 text-slate-200',
          title: 'Vantagem Neutro: soma 100% do Poder em Vida, Ataque e Defesa.',
        });
      }
    }

    if (board && hasAliancaAngiris(displayCard, board)) {
      list.push({
        key: 'angiris',
        icon: '👼',
        label: 'Aliança Angiris: +50% Dano / -50% Sofrido',
        toneClass: 'border-amber-400/60 bg-amber-950/50 text-amber-200',
        title: 'Bônus ativo com 2+ Arcanjos em mesa.',
      });
    }

    if (board && isFairyCard(displayCard) && !isSilenced && hasCorteDasFadas(board)) {
      list.push({
        key: 'corte_fadas',
        icon: '🧚',
        label: 'Corte das Fadas: Milagre + 75% Poder',
        toneClass: 'border-pink-400/60 bg-pink-950/50 text-pink-200',
        title: '3+ Fadas na mesa: salva o líder uma vez com +2 Vida rosa e +75% Poder.',
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
      list.push({
        key: 'milton',
        icon: '🌿',
        label: 'Passiva de Milton: +25% Dano',
        toneClass: 'border-emerald-400/60 bg-emerald-950/50 text-emerald-200',
        title: 'Milton em mesa concede +25% de dano a unidades Telúricas.',
      });
    }

    if (displayCard.doublePower && !isSilenced && !isVotoBlocked) {
      list.push({
        key: 'mesmerino',
        icon: '🔮',
        label: `Mesmerino: Poder 2x (${pwrEffective})`,
        toneClass: 'border-fuchsia-400/60 bg-fuchsia-950/50 text-fuchsia-200',
        title: 'Poder dobrado por Mesmerino.',
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
      list.push({
        key: 'pwr_always',
        icon: '⚡',
        label: `Poder Sempre Ativo: +${pwrEffective}`,
        toneClass: 'border-yellow-400/60 bg-yellow-950/50 text-yellow-200',
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
      list.push({
        key: 'temp_pwr',
        icon: '⏳',
        label: `Buff Temporário: +${tempPowerAmt} Poder (${displayCard.tempPowerBuffRoundsRemaining}r)`,
        toneClass: 'border-indigo-400/60 bg-indigo-950/50 text-indigo-200',
        title: 'Aumento temporário de Poder.',
      });
    }

    if (displayCard.blockChance && displayCard.blockChance > 0 && !isSilenced) {
      list.push({
        key: 'block',
        icon: '🛡️',
        label: `Escudo Mágico: ${Math.round(displayCard.blockChance * 100)}% Bloqueio`,
        toneClass: 'border-sky-400/60 bg-sky-950/50 text-sky-200',
        title: 'Chance passiva de bloquear ataques.',
      });
    }

    if (displayCard.dodgeChance && displayCard.dodgeChance > 0 && !isSilenced) {
      list.push({
        key: 'dodge',
        icon: '💨',
        label: `Esquiva: ${Math.round(displayCard.dodgeChance * 100)}%`,
        toneClass: 'border-teal-400/60 bg-teal-950/50 text-teal-200',
        title: 'Chance passiva de esquivar de ataques.',
      });
    }

    if (displayCard.conditions.has('praga') || (displayCard.pragaRoundsRemaining ?? 0) > 0) {
      list.push({
        key: 'praga',
        icon: '☠️',
        label: `Praga: -25% Atributos (${displayCard.pragaRoundsRemaining ?? 1}r)`,
        toneClass: 'border-red-500/60 bg-red-950/50 text-red-200',
        title: 'Reduz todos os atributos em 25%.',
      });
    }

    if (
      displayCard.conditions.has('corrosao') ||
      (displayCard.corrosaoRoundsRemaining != null && displayCard.corrosaoRoundsRemaining > 0)
    ) {
      list.push({
        key: 'corrosao',
        icon: '🧪',
        label: `Corrosão: -1 Vida/Turno & Corta Cura (${displayCard.corrosaoRoundsRemaining ?? 1}r)`,
        toneClass: 'border-red-500/60 bg-red-950/50 text-red-200',
        title: 'Sofre 1 de dano direto na Vida por turno e anula curas.',
      });
    }

    const bleedMarks = displayCard.sangramentoMarks ?? 0;
    if (
      displayCard.conditions.has('sangramento') ||
      (displayCard.sangramentoRoundsRemaining != null && displayCard.sangramentoRoundsRemaining > 0) ||
      bleedMarks > 0
    ) {
      list.push({
        key: 'sangramento',
        icon: '🩸',
        label: `Sangramento: Marcas ${bleedMarks}/4 para Hemorragia`,
        toneClass: 'border-rose-500/60 bg-rose-950/50 text-rose-200',
        title: 'Na 4ª marca, dispara Hemorragia causando 25% da Vida Máxima.',
      });
    }

    if (isInfiniteScale) {
      list.push({
        key: 'infinite',
        icon: '♾️',
        label: 'Escala Infinita (∞): Atributos Supremos',
        toneClass: 'border-amber-300/70 bg-amber-950/55 text-amber-100',
        title: 'Atributos infinitos e imortalidade.',
      });
    } else if (baseTemplate) {
      const hasClassPowerBonus = !isVotoBlocked && !isSilenced;
      const telHp =
        hasClassPowerBonus && (hasCardClass(displayCard, 'Telúrico') || hasCardClass(displayCard, 'Terra'))
          ? displayCard.teluricoPowerHpGranted ??
            (baseTemplate.element === 'Telúrico' || baseTemplate.element === 'Terra'
              ? Math.floor(baseTemplate.power * 0.5)
              : 0)
          : 0;
      const telDef =
        hasClassPowerBonus && (hasCardClass(displayCard, 'Telúrico') || hasCardClass(displayCard, 'Terra'))
          ? displayCard.teluricoPowerDefGranted ??
            (baseTemplate.element === 'Telúrico' || baseTemplate.element === 'Terra'
              ? Math.floor(baseTemplate.power * 0.5)
              : 0)
          : 0;
      const iceDef =
        hasClassPowerBonus && hasCardClass(displayCard, 'Gelo')
          ? displayCard.icePowerDefGranted ??
            (baseTemplate.element === 'Gelo' ? Math.floor(baseTemplate.power * 0.5) : 0)
          : 0;
      const neutroHp =
        hasClassPowerBonus && hasCardClass(displayCard, 'Neutro')
          ? displayCard.neutroPowerHpGranted ??
            (baseTemplate.element === 'Neutro' ? Math.floor(baseTemplate.power) : 0)
          : 0;
      const neutroAtk =
        hasClassPowerBonus && hasCardClass(displayCard, 'Neutro')
          ? displayCard.neutroPowerAtkGranted ??
            (baseTemplate.element === 'Neutro' ? Math.floor(baseTemplate.power) : 0)
          : 0;
      const neutroDef =
        hasClassPowerBonus && hasCardClass(displayCard, 'Neutro')
          ? displayCard.neutroPowerDefGranted ??
            (baseTemplate.element === 'Neutro' ? Math.floor(baseTemplate.power) : 0)
          : 0;

      const expectedHp = baseTemplate.hp + telHp + neutroHp;
      const expectedAtk = baseTemplate.atk + neutroAtk;
      const expectedDef = baseTemplate.def + telDef + iceDef + neutroDef;
      const expectedPower = baseTemplate.power;

      const atkGain = Math.max(0, displayCard.atk - expectedAtk);
      const defGain = Math.max(0, displayCard.def - expectedDef);
      const pwrGain = hasClassPowerBonus ? Math.max(0, displayCard.power - expectedPower - tempPowerAmt) : 0;
      const hpGain = Math.max(0, displayCard.maxHp - expectedHp);

      if (atkGain > 0) {
        list.push({
          key: 'gain_atk',
          icon: '⚔️',
          label: `+${atkGain} Ataque acima do base`,
          toneClass: 'border-lime-400/55 bg-emerald-950/50 text-lime-200',
          title: `Base ${expectedAtk} → Atual ${displayCard.atk}`,
        });
      }
      if (defGain > 0) {
        list.push({
          key: 'gain_def',
          icon: '🛡️',
          label: `+${defGain} Defesa acima do base`,
          toneClass: 'border-lime-400/55 bg-emerald-950/50 text-lime-200',
          title: `Base ${expectedDef} → Atual ${displayCard.def}`,
        });
      }
      if (pwrGain > 0) {
        list.push({
          key: 'gain_pwr',
          icon: '⚡',
          label: `+${pwrGain} Poder acima do base`,
          toneClass: 'border-lime-400/55 bg-emerald-950/50 text-lime-200',
          title: `Base ${expectedPower} → Atual ${displayCard.power}`,
        });
      }
      if (hpGain > 0) {
        list.push({
          key: 'gain_hp',
          icon: '❤️',
          label: `+${hpGain} Vida Máx. acima do base`,
          toneClass: 'border-lime-400/55 bg-emerald-950/50 text-lime-200',
          title: `Base ${expectedHp} → Atual ${displayCard.maxHp}`,
        });
      }
    }

    return list;
  }, [displayCard, isSkill, votoSilencioActive, board, isOSolLvl2, isALuaLvl2, isInfiniteScale, baseTemplate]);

  const primaryClassDetail = CLASS_DETAIL_MAP[displayCard.element] || CLASS_DETAIL_MAP.Neutro;
  const extraClasses = !isSkill && displayCard.extraElements ? displayCard.extraElements : [];
  const selectedOriginBucket = selectedCondition ? resolveConditionOriginBucket(selectedCondition) : null;
  const selectedOriginStyle = selectedOriginBucket ? ORIGIN_STYLES[selectedOriginBucket] : null;

  return (
    <>
      {/* Main Expanded Card Modal Backdrop */}
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        onClick={onClose}
      >
        {/* Main Fixed-Structure Modal Frame */}
        <div
          className="relative my-auto w-full max-w-[940px] rounded-2xl border-2 border-stone-700/85 bg-gradient-to-b from-[#171522] via-[#110f1a] to-[#0a0910] shadow-[0_24px_70px_rgba(0,0,0,0.95)] text-stone-200 flex flex-col"
          onClick={(e) => {
            e.stopPropagation();
            if (activeTooltip) setActiveTooltip(null);
          }}
        >
          {/* ================================================================ */}
          {/* TOP HEADER BAR (Hexagon Class · Name · Descrição/História · Reino · Pentagon Tier · X) */}
          {/* ================================================================ */}
          <div className="relative z-30 flex flex-wrap md:flex-nowrap items-center justify-between gap-3 px-4 sm:px-5 pt-3.5 pb-3 border-b border-stone-700/80">
            {/* LEFT: Class Hexagon + Unit Name & Type */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Hexagon Class Emblem (Hover/Click opens Class Description Tooltip) */}
              <div
                className="relative shrink-0"
                onMouseEnter={() => setActiveTooltip('class')}
                onMouseLeave={() => setActiveTooltip((prev) => (prev === 'class' ? null : prev))}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTooltip((prev) => (prev === 'class' ? null : 'class'));
                  }}
                  className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center cursor-pointer group focus:outline-none"
                  aria-label={`Informações da classe ${element.name}`}
                >
                  <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)]">
                    <polygon
                      points="50,3 93,27 93,73 50,97 7,73 7,27"
                      fill="#12101d"
                      stroke={element.glow || '#a8a29e'}
                      strokeWidth="4.5"
                      className="transition-all group-hover:brightness-125"
                    />
                    <polygon
                      points="50,9 87,30 87,70 50,91 13,70 13,30"
                      fill="none"
                      stroke="rgba(255,255,255,0.22)"
                      strokeWidth="1.5"
                    />
                  </svg>
                  <div className="relative z-10 flex flex-col items-center justify-center leading-none">
                    <span className="text-lg sm:text-xl leading-none">
                      {isSkill ? '📜' : element.icon || '🧭'}
                    </span>
                    <span className="mt-0.5 text-[7px] sm:text-[8px] font-bold uppercase tracking-wider text-stone-200 max-w-[42px] truncate">
                      {isSkill ? 'Hab.' : element.name}
                    </span>
                  </div>
                  {extraClasses.length > 0 && (
                    <span className="absolute -bottom-0.5 -right-0.5 z-20 px-1 py-0.5 rounded bg-amber-400 text-stone-950 text-[8px] font-mono font-black leading-none shadow">
                      +{extraClasses.length}
                    </span>
                  )}
                </button>

                {/* Class Hover Tooltip */}
                {activeTooltip === 'class' && (
                  <div
                    className="absolute left-0 top-full mt-2 z-50 w-72 sm:w-80 rounded-xl border border-amber-400/55 bg-[#0e0c17]/98 p-3.5 shadow-[0_14px_40px_rgba(0,0,0,0.95)] text-left animate-in fade-in duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2 border-b border-stone-800 pb-2 mb-2">
                      <span className="text-lg">{isSkill ? '📜' : element.icon || '🧭'}</span>
                      <div>
                        <div className="font-serif font-black text-sm text-amber-200">
                          {primaryClassDetail.title}
                        </div>
                        <div className="text-[11px] text-stone-400">{primaryClassDetail.summary}</div>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs text-stone-200 leading-snug">
                      <div>
                        <span className="font-bold text-rose-300">Dano: </span>
                        {primaryClassDetail.damageRule}
                      </div>
                      <div>
                        <span className="font-bold text-sky-300">Defesa: </span>
                        {primaryClassDetail.defenseRule}
                      </div>
                      {primaryClassDetail.specialRule && (
                        <div className="pt-1 border-t border-stone-800/80 text-amber-200/95">
                          <span className="font-bold">Passiva da Classe: </span>
                          {primaryClassDetail.specialRule}
                        </div>
                      )}
                      {extraClasses.length > 0 && (
                        <div className="pt-1.5 mt-1 border-t border-stone-800 space-y-1">
                          <div className="text-[11px] font-bold text-amber-300">
                            Multiclasse Ativa (+{extraClasses.map((c) => ELEMENT_CONFIG[c]?.name || c).join(', ')}):
                          </div>
                          {extraClasses.map((extra) => {
                            const info = CLASS_DETAIL_MAP[extra];
                            return (
                              <div key={extra} className="text-[11px] text-stone-300">
                                • <strong>{info?.title || extra}:</strong> {info?.damageRule}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Name & Type */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-xl font-serif font-black text-white tracking-tight truncate">
                    {displayCard.name}
                  </h2>
                  {hasLevelSystem && (
                    <span className="text-[11px] font-mono font-bold text-purple-300 shrink-0">
                      Nv. {previewLevel}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-400 truncate">
                  {isSkill
                    ? `Carta de Habilidade · ${displayCard.speed === 'lenta' ? 'Lenta' : 'Rápida'}`
                    : `Carta de Unidade · ${element.name}`}
                </p>
              </div>
            </div>

            {/* CENTER: Diagonal-Split Segmented Switch (DESCRIÇÃO / HISTÓRIA) */}
            <div className="order-3 md:order-2 w-full md:w-auto flex justify-center shrink-0">
              <div className="relative flex items-stretch h-9 sm:h-10 w-full max-w-[270px] md:w-[244px] rounded-lg border border-stone-600/85 bg-black/60 overflow-hidden shadow-inner">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('descricao');
                    setSelectedConditionKey(null);
                  }}
                  style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 14px) 100%, 0 100%)' }}
                  className={`relative z-10 flex-1 pr-3 text-[11px] sm:text-xs font-serif font-black uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center ${
                    activeTab === 'descricao'
                      ? 'bg-amber-500/25 text-amber-200'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-white/5'
                  }`}
                >
                  Descrição
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('historia');
                    setSelectedConditionKey(null);
                  }}
                  style={{ clipPath: 'polygon(14px 0, 100% 0, 100% 100%, 0 100%)' }}
                  className={`relative z-10 flex-1 -ml-3.5 pl-3 text-[11px] sm:text-xs font-serif font-black uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center ${
                    activeTab === 'historia'
                      ? 'bg-amber-500/25 text-amber-200'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-white/5'
                  }`}
                >
                  História
                </button>
                {/* Crisp Slanted Diagonal Separator Line */}
                <svg
                  viewBox="0 0 24 40"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-5 h-full z-20"
                >
                  <line x1="19" y1="0" x2="5" y2="40" stroke="rgba(168,162,158,0.7)" strokeWidth="1.5" />
                </svg>
              </div>
            </div>

            {/* RIGHT: Kingdom Circle · Tier Pentagon · Close X */}
            <div className="order-2 md:order-3 flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Kingdom Circle Badge */}
              <div
                className="relative"
                onMouseEnter={() => setActiveTooltip('kingdom')}
                onMouseLeave={() => setActiveTooltip((prev) => (prev === 'kingdom' ? null : prev))}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTooltip((prev) => (prev === 'kingdom' ? null : 'kingdom'));
                  }}
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#12101d] border-2 flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-105 shadow-md"
                  style={{ borderColor: kingdom.primaryColor }}
                  aria-label={kingdom.name}
                >
                  <span className="text-lg sm:text-xl leading-none">{kingdom.crest}</span>
                </button>

                {activeTooltip === 'kingdom' && (
                  <div
                    className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl border border-stone-600/80 bg-[#0e0c17]/98 p-3 shadow-[0_14px_40px_rgba(0,0,0,0.95)] text-left animate-in fade-in duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{kingdom.crest}</span>
                      <div>
                        <div className="font-serif font-black text-xs text-white">{kingdom.name}</div>
                        <div className="text-[11px] text-stone-400">{kingdom.subtitle}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tier Pentagon Badge (Hover/Click opens Tier Info + All Rounds Unlock Table) */}
              <div
                className="relative"
                onMouseEnter={() => setActiveTooltip('tier')}
                onMouseLeave={() => setActiveTooltip((prev) => (prev === 'tier' ? null : prev))}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTooltip((prev) => (prev === 'tier' ? null : 'tier'));
                  }}
                  className="relative w-14 h-14 sm:w-[60px] sm:h-[60px] flex items-center justify-center cursor-pointer group focus:outline-none"
                  aria-label={`Tier ${displayCard.tier} ${tier.name}`}
                >
                  <svg viewBox="0 0 100 96" className="absolute inset-0 w-full h-full drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)]">
                    <polygon
                      points="50,4 96,37 78,92 22,92 4,37"
                      fill="#12101d"
                      stroke={tier.color}
                      strokeWidth="4.5"
                      className="transition-all group-hover:brightness-125"
                    />
                    <polygon
                      points="50,11 89,39 74,86 26,86 11,39"
                      fill="none"
                      stroke="rgba(255,255,255,0.18)"
                      strokeWidth="1.4"
                    />
                  </svg>
                  <div className="relative z-10 flex flex-col items-center justify-center leading-none pt-1">
                    <span
                      className="text-sm sm:text-base font-mono font-black leading-none tabular-nums"
                      style={{ color: tier.color }}
                    >
                      {displayCard.tier}
                    </span>
                    <span className="text-[7px] font-mono font-bold uppercase tracking-widest text-stone-300 mt-0.5">
                      TIER
                    </span>
                    <span className="text-[8px] font-serif font-bold text-white leading-tight max-w-[46px] truncate">
                      {tier.name}
                    </span>
                  </div>
                </button>

                {/* Tier Info & Round Unlock Table Tooltip */}
                {activeTooltip === 'tier' && (
                  <div
                    className="absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 rounded-xl border border-amber-400/55 bg-[#0e0c17]/98 p-3.5 shadow-[0_14px_40px_rgba(0,0,0,0.95)] text-left animate-in fade-in duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between border-b border-stone-800 pb-2 mb-2">
                      <div>
                        <div className="font-serif font-black text-sm" style={{ color: tier.color }}>
                          Tier {displayCard.tier} — {tier.name}
                        </div>
                        <div className="text-[11px] text-stone-300">
                          {combatSummary.isDivinoUnit
                            ? `Antecipação Divina ativa: ${
                                TIER_UNLOCK_TABLE.find((t) => t.tier === displayCard.tier)?.divineRound
                              }`
                            : `Liberação padrão: ${
                                TIER_UNLOCK_TABLE.find((t) => t.tier === displayCard.tier)?.normalRound
                              }`}
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                      Liberação de cada Tier por Rodada
                    </div>
                    <div className="space-y-1 font-mono text-[11px] tabular-nums">
                      {TIER_UNLOCK_TABLE.map((row) => {
                        const isCurrent = row.tier === displayCard.tier;
                        const rowTierCfg = TIER_CONFIG[row.tier];
                        return (
                          <div
                            key={row.tier}
                            className={`flex items-center justify-between px-2 py-1 rounded-md border ${
                              isCurrent
                                ? 'bg-amber-500/15 border-amber-400/60 text-white font-bold'
                                : 'bg-black/35 border-stone-800/80 text-stone-300'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <span className="font-black" style={{ color: rowTierCfg.color }}>
                                T{row.tier}
                              </span>
                              <span className="font-sans text-[11px]">{row.name}</span>
                            </span>
                            <span className="text-right">
                              <span>{row.normalRound}</span>
                              {row.divineRound !== row.normalRound && (
                                <span className="text-amber-300/90 text-[10px] ml-1.5">
                                  (⚜️ {row.divineRound})
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Close Button (X) */}
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-lg bg-white/8 hover:bg-white/18 border border-stone-700/80 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Fechar (Esc)"
                aria-label="Fechar detalhes"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* ================================================================ */}
          {/* MAIN TWO-COLUMN BODY (FIXED DIMENSIONS WITH INTERNAL SCROLL)     */}
          {/* ================================================================ */}
          <div className="relative p-4 sm:p-5 flex flex-col md:flex-row gap-4 sm:gap-5 items-stretch">
            {/* -------------------------------------------------------------- */}
            {/* LEFT COLUMN (FIXED): Art · Toggle View · Damage Bar · Def Bar  */}
            {/* -------------------------------------------------------------- */}
            <div className="w-full md:w-[276px] shrink-0 flex flex-col gap-2.5">
              {/* 1. FIXED ARTWORK SHOWCASE BOX */}
              <div
                onClick={() => setIsZoomOpen(true)}
                className="group relative w-full h-[276px] rounded-xl p-[2.5px] overflow-hidden cursor-pointer celentia-forged-card shrink-0"
                style={{
                  background: forged.outerMetalGradient,
                  boxShadow: forged.bezelShadow,
                }}
                title="Clique para ampliar a arte em tela cheia"
              >
                <div
                  className="relative w-full h-full rounded-[10px] overflow-hidden bg-[#09080e] flex items-center justify-center"
                  style={{ border: `1px solid ${forged.innerFrameBorder}` }}
                >
                  {!showInGameFrame ? (
                    <>
                      <CardFiligreeCorners
                        color={forged.filigreeStroke}
                        glowColor={forged.filigreeGlow}
                        sizeClass="w-5 h-5"
                      />
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
                          <div
                            className={`w-full h-full bg-gradient-to-br ${thematic.backdropClass} flex flex-col items-center justify-center p-4 text-center relative`}
                          >
                            <div
                              className="pointer-events-none absolute inset-0 opacity-65"
                              style={{
                                background: `radial-gradient(circle at 50% 45%, ${thematic.glowColor}, transparent 68%)`,
                              }}
                            />
                            <div
                              className={`relative z-10 w-24 h-24 rounded-full border-2 ${thematic.ringColor} bg-black/50 flex items-center justify-center shadow-2xl`}
                            >
                              <span className="text-5xl leading-none">{thematic.icon}</span>
                            </div>
                            <span className="relative z-10 mt-2.5 text-xs font-serif font-bold uppercase tracking-widest text-stone-200">
                              {thematic.tagLabel}
                            </span>
                          </div>
                        );
                      })()}

                      {/* Compact Base Stats Scrim along the bottom edge of Gallery Art */}
                      {displayCard.type === 'unit' && (
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/92 via-black/70 to-transparent pt-5 pb-1.5 px-2">
                          {displayCard.element === 'Cósmico' ? (
                            <div className="grid grid-cols-2 text-center font-mono text-[11px] tabular-nums">
                              <span className="text-indigo-200 font-bold">
                                🔮 {isALuaLvl2 ? '∞' : displayCard.hp}
                              </span>
                              <span className="text-amber-200 font-bold">
                                ⚡ {isALuaLvl2 ? '∞' : displayCard.power}
                              </span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-4 text-center font-mono text-[11px] tabular-nums">
                              <span className="text-emerald-300 font-bold">
                                ❤️{isOSolLvl2 ? '∞' : displayCard.hp}
                              </span>
                              <span className="text-rose-300 font-bold">
                                ⚔️{isOSolLvl2 ? '∞' : displayCard.atk}
                              </span>
                              <span className="text-sky-300 font-bold">
                                🛡️{isOSolLvl2 ? '∞' : displayCard.def}
                              </span>
                              <span className="text-amber-300 font-bold">
                                ⚡{isOSolLvl2 ? '∞' : displayCard.power}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#09080e] overflow-hidden">
                      <div className="scale-[0.96] origin-center pointer-events-none">
                        <CardView
                          card={displayCard}
                          size="md"
                          isPlayable={true}
                          hasOVazioActive={hasOVazioActive}
                        />
                      </div>
                    </div>
                  )}

                  {/* Compact Level 1 / Level 2 Art Switcher ONLY (No animation preview button) */}
                  {hasLevelSystem && (
                    <div
                      className="absolute top-2 right-2 z-20 flex items-center rounded-lg bg-black/82 border border-stone-600/80 p-0.5 shadow-lg backdrop-blur-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setPreviewLevel(1)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                          previewLevel === 1
                            ? 'bg-amber-400 text-stone-950'
                            : 'text-stone-300 hover:text-white'
                        }`}
                      >
                        Nv.1
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewLevel(2)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                          previewLevel === 2
                            ? 'bg-purple-500 text-white'
                            : 'text-stone-300 hover:text-white'
                        }`}
                      >
                        Nv.2
                      </button>
                    </div>
                  )}

                  {/* Subtle Fullscreen Zoom Hover Cue */}
                  <div className="pointer-events-none absolute top-2 left-2 z-10 p-1.5 rounded-lg bg-black/70 border border-stone-600/70 text-amber-300 opacity-75 group-hover:opacity-100 transition-opacity">
                    <Maximize2 size={13} />
                  </div>
                </div>
              </div>

              {/* 2. ALTERNAR VISUALIZAÇÃO — Moldura / Galeria */}
              <button
                type="button"
                onClick={() => setShowInGameFrame((prev) => !prev)}
                className="w-full h-[46px] shrink-0 rounded-xl border border-stone-600/85 bg-stone-900/90 hover:bg-stone-800 hover:border-amber-400/60 transition-colors cursor-pointer flex flex-col items-center justify-center leading-tight px-3"
              >
                <span className="text-[11px] font-serif font-black uppercase tracking-wider text-stone-100">
                  Alternar Visualização
                </span>
                <span className="text-[10px] text-stone-400 mt-0.5">
                  <span className={showInGameFrame ? 'text-amber-300 font-bold' : ''}>Moldura</span>
                  <span className="mx-1">/</span>
                  <span className={!showInGameFrame ? 'text-amber-300 font-bold' : ''}>Galeria</span>
                </span>
              </button>

              {/* 3. INFORMAÇÃO DE DANO (Direct summary + Hover/Click Detailed Formula) */}
              <div
                className="relative shrink-0"
                onMouseEnter={() => setActiveTooltip('damage')}
                onMouseLeave={() => setActiveTooltip((prev) => (prev === 'damage' ? null : prev))}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTooltip((prev) => (prev === 'damage' ? null : 'damage'));
                  }}
                  className="w-full h-[46px] rounded-xl border border-stone-700/85 hover:border-rose-400/65 bg-black/55 hover:bg-rose-950/25 px-3 flex items-center justify-between gap-2 transition-colors cursor-pointer text-left"
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-stone-300 truncate">
                    <Swords size={14} className="text-rose-400 shrink-0" />
                    <span>{isSkill ? 'Velocidade' : 'Informação de Dano'}</span>
                  </span>
                  <span className="flex items-center gap-1 font-mono font-black text-xs text-amber-200 shrink-0 tabular-nums">
                    <span>{combatSummary.damageValueLabel}</span>
                    <Info size={12} className="text-stone-400" />
                  </span>
                </button>

                {activeTooltip === 'damage' && (
                  <div
                    className="absolute left-0 bottom-full mb-2 z-50 w-72 sm:w-80 rounded-xl border border-rose-400/55 bg-[#0e0c17]/98 p-3 shadow-[0_14px_40px_rgba(0,0,0,0.95)] text-left animate-in fade-in duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-xs font-serif font-black text-rose-300 border-b border-stone-800 pb-1.5 mb-1.5">
                      {isSkill ? 'Velocidade da Habilidade' : 'Cálculo de Dano em Combate'}
                    </div>
                    <div className="space-y-1 text-xs text-stone-200 leading-snug">
                      {combatSummary.damageFormulaLines.map((line, idx) => (
                        <p key={idx}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. INFORMAÇÃO DE DEFESA (Direct summary + Hover/Click Detailed Formula) */}
              <div
                className="relative shrink-0"
                onMouseEnter={() => setActiveTooltip('defense')}
                onMouseLeave={() => setActiveTooltip((prev) => (prev === 'defense' ? null : prev))}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTooltip((prev) => (prev === 'defense' ? null : 'defense'));
                  }}
                  className="w-full h-[46px] rounded-xl border border-stone-700/85 hover:border-sky-400/65 bg-black/55 hover:bg-sky-950/25 px-3 flex items-center justify-between gap-2 transition-colors cursor-pointer text-left"
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-stone-300 truncate">
                    <Shield size={14} className="text-sky-400 shrink-0" />
                    <span>{isSkill ? 'Aplicação' : 'Informação de Defesa'}</span>
                  </span>
                  <span className="flex items-center gap-1 font-mono font-black text-xs text-sky-200 shrink-0 tabular-nums">
                    <span>{combatSummary.defenseValueLabel}</span>
                    <Info size={12} className="text-stone-400" />
                  </span>
                </button>

                {activeTooltip === 'defense' && (
                  <div
                    className="absolute left-0 bottom-full mb-2 z-50 w-72 sm:w-80 rounded-xl border border-sky-400/55 bg-[#0e0c17]/98 p-3 shadow-[0_14px_40px_rgba(0,0,0,0.95)] text-left animate-in fade-in duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-xs font-serif font-black text-sky-300 border-b border-stone-800 pb-1.5 mb-1.5">
                      {isSkill ? 'Aplicação da Habilidade' : 'Cálculo de Defesa e Resistência'}
                    </div>
                    <div className="space-y-1 text-xs text-stone-200 leading-snug">
                      {combatSummary.defenseFormulaLines.map((line, idx) => (
                        <p key={idx}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* RIGHT COLUMN (STRICTLY FIXED HEIGHTS + INTERNAL SCROLL)        */}
            {/* -------------------------------------------------------------- */}
            <div className="flex-1 min-w-0 h-[544px] sm:h-[444px] flex flex-col gap-3">
              {activeTab === 'historia' ? (
                /* HISTÓRIA TAB: Replaces entire right column at exact same fixed height */
                <div className="h-full flex flex-col rounded-xl border border-amber-500/40 bg-black/55 overflow-hidden">
                  <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-2.5 border-b border-stone-800 bg-stone-950/60">
                    <div className="flex items-center gap-2 text-amber-200 font-serif font-bold text-xs sm:text-sm uppercase tracking-wider">
                      <BookOpen size={14} className="text-amber-400 shrink-0" />
                      <span>Crônicas de {kingdom.name}</span>
                    </div>
                    <span className="text-[11px] text-stone-400 font-sans">
                      {kingdom.crest} {element.name}
                    </span>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3.5 text-sm text-stone-200/95 leading-relaxed whitespace-pre-line font-serif">
                    {resolvedLore ? (
                      resolvedLore
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center text-stone-400 gap-2 py-8">
                        <BookOpen size={24} className="text-stone-600" />
                        <p className="text-xs font-sans max-w-xs">
                          Esta carta ainda não possui crônicas registradas nos arquivos de {kingdom.name}.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* DESCRIÇÃO TAB: Fixed Top Box (EFEITO ÚNICO) + Two Fixed Bottom Boxes */
                <>
                  {/* TOP FIXED BOX: EFEITO ÚNICO (Unified Level 1 + Level 2 Box with Scroll) */}
                  <div className="h-[272px] shrink-0 flex flex-col rounded-xl border border-stone-700/85 bg-black/55 overflow-hidden">
                    <div className="shrink-0 flex items-center justify-between gap-2 px-3.5 py-2 border-b border-stone-800 bg-stone-950/65">
                      <span className="text-[11px] font-serif font-black uppercase tracking-wider text-stone-100">
                        Efeito Único
                      </span>
                      {displayCard.exclusiveName && (
                        <span className="text-[11px] font-serif font-bold text-amber-300 truncate">
                          ★ {displayCard.exclusiveName}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3">
                      {/* Level 1 / Base Card Effect Description */}
                      <div className="text-stone-200">
                        <FormattedCardDescription text={effectBreakdown.level1Text} variant="modal" />
                      </div>

                      {/* Inner Level-Up Box for Tier 5 & Tier 6 Leveling Units */}
                      {hasLevelSystem && (
                        <div className="rounded-lg border border-purple-500/45 bg-purple-950/22 p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2 border-b border-purple-500/25 pb-1.5">
                            <span className="flex items-center gap-1.5 text-[11px] font-serif font-black uppercase tracking-wider text-purple-200">
                              <Sparkles size={12} className="text-amber-300 shrink-0" />
                              <span>Ascensão · Nível 2</span>
                            </span>
                            {card.level === 2 && (
                              <span className="text-[10px] font-mono font-bold text-emerald-300">
                                Desperto
                              </span>
                            )}
                          </div>

                          <div className="text-xs leading-relaxed text-stone-200">
                            <span className="font-bold text-amber-300">
                              Requisito para subir de nível:{' '}
                            </span>
                            <span>{effectBreakdown.requirementText}</span>
                          </div>

                          <div className="pt-1 border-t border-purple-500/20 text-xs text-stone-200">
                            <div className="font-bold text-purple-200 mb-1">
                              Efeitos ao subir de nível:
                            </div>
                            <FormattedCardDescription text={effectBreakdown.level2Text} variant="modal" />
                          </div>
                        </div>
                      )}

                      {/* Imprisoned Unit Alert (Barelio Chains) */}
                      {displayCard.imprisonedUnit && (
                        <div className="p-2.5 rounded-lg bg-purple-950/60 border border-fuchsia-400/55 text-xs space-y-1">
                          <div className="font-black text-fuchsia-200">
                            ⛓️ Prisioneiro em Correntes: {displayCard.imprisonedUnit.name}
                          </div>
                          <div className="text-[11px] text-purple-200/90">
                            Sofre 10 de dano por rodada. Se morrer preso, Barelio usurpa todos os seus atributos.
                          </div>
                        </div>
                      )}

                      {/* Secret Passive: O VAZIO (only when active on board) */}
                      {hasOVazioActive && (isOSolLvl2 || isALuaLvl2) && (
                        <div className="p-2.5 rounded-lg bg-purple-950/75 border border-purple-400/65 text-xs space-y-1">
                          <div className="font-serif font-black text-purple-200 uppercase tracking-wider">
                            🌌 Passiva Secreta: O Vazio (Ativada)
                          </div>
                          <p className="text-[11px] text-purple-100/90 leading-relaxed">
                            O Absoluto e A Eminente (Nível 2) estão juntos na mesma mesa: a antimatéria desencadeará a aniquilação imediata do seu invocador.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* BOTTOM TWO SIDE-BY-SIDE FIXED BOXES */}
                  <div className="h-[260px] sm:h-[160px] shrink-0 grid grid-cols-1 grid-rows-2 sm:grid-cols-2 sm:grid-rows-1 gap-3">
                    {/* BOTTOM-LEFT FIXED BOX: PASSIVAS E EFEITOS INERENTES */}
                    <div className="h-full flex flex-col rounded-xl border border-stone-700/85 bg-black/55 overflow-hidden">
                      <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-1.5 border-b border-stone-800 bg-stone-950/65">
                        <span className="text-[10px] sm:text-[11px] font-serif font-black uppercase tracking-wider text-stone-100 truncate">
                          Passivas e Efeitos Inerentes
                        </span>
                        {conditionItems.length > 0 && (
                          <span className="text-[10px] font-mono text-stone-400 tabular-nums shrink-0">
                            {conditionItems.length}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-h-0 overflow-y-auto p-3">
                        {conditionItems.length > 0 ? (
                          <div className="flex flex-wrap items-start gap-2.5">
                            {conditionItems.map((item) => {
                              const bucket = resolveConditionOriginBucket(item);
                              const originStyle = ORIGIN_STYLES[bucket];
                              const isSelected = selectedConditionKey === item.key;

                              return (
                                <button
                                  key={item.key}
                                  type="button"
                                  onClick={() =>
                                    setSelectedConditionKey(isSelected ? null : item.key)
                                  }
                                  className={`w-11 h-11 rounded-[4px] border-2 flex items-center justify-center text-lg font-bold transition-transform cursor-pointer relative shrink-0 ${
                                    originStyle.squareClass
                                  } ${
                                    isSelected
                                      ? 'scale-105 ring-2 ring-white shadow-lg'
                                      : 'hover:scale-105'
                                  }`}
                                  title={`${item.config.name} ${originStyle.tag} — Clique para abrir detalhes`}
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
                                      className={`absolute -bottom-1 -right-1 px-1 min-w-[16px] h-[14px] rounded text-[9px] font-mono font-black leading-none flex items-center justify-center border tabular-nums ${
                                        item.duration.isPermanent
                                          ? 'bg-stone-900 border-stone-500 text-stone-200'
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
                        ) : (
                          <div className="h-full flex items-center justify-center text-center text-[11px] text-stone-500 italic px-2">
                            Nenhuma passiva ou condição ativa.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* BOTTOM-RIGHT FIXED BOX: BÔNUS ATIVOS */}
                    <div className="h-full flex flex-col rounded-xl border border-stone-700/85 bg-black/55 overflow-hidden">
                      <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-1.5 border-b border-stone-800 bg-stone-950/65">
                        <span className="text-[10px] sm:text-[11px] font-serif font-black uppercase tracking-wider text-stone-100 truncate">
                          Bônus Ativos
                        </span>
                        {activeBonuses.length > 0 && (
                          <span className="text-[10px] font-mono text-stone-400 tabular-nums shrink-0">
                            {activeBonuses.length}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-1.5">
                        {activeBonuses.length > 0 ? (
                          activeBonuses.map((bonus) => (
                            <div
                              key={bonus.key}
                              title={bonus.title}
                              className={`flex items-start gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] leading-snug ${bonus.toneClass}`}
                            >
                              <span className="shrink-0 leading-none mt-0.5">{bonus.icon}</span>
                              <span className="font-medium">{bonus.label}</span>
                            </div>
                          ))
                        ) : (
                          <div className="h-full flex items-center justify-center text-center text-[11px] text-stone-500 italic px-2">
                            Sem bônus ativos no momento.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ============================================================== */}
            {/* RIGHT-SIDE OVERLAY PANEL (PASSIVA / EFEITO DETALHADO)          */}
            {/* Always overlays the right side of the modal on any screen size */}
            {/* ============================================================== */}
            {selectedCondition && selectedOriginBucket && selectedOriginStyle && (
              <div
                className={`absolute top-3 right-3 bottom-3 z-40 w-[calc(100%-24px)] sm:w-[376px] rounded-2xl border-2 ${selectedOriginStyle.panelBorderClass} bg-[#0e0c18]/98 backdrop-blur-md shadow-[-16px_0_48px_rgba(0,0,0,0.94)] p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-right-4 duration-200`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Overlay Header: Square Icon + Name / Type Tag + Close X */}
                <div className="shrink-0 flex items-start gap-3">
                  <div
                    className={`w-12 h-12 rounded-[4px] border-2 flex items-center justify-center text-2xl shrink-0 ${selectedOriginStyle.squareClass}`}
                  >
                    {selectedCondition.config.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif font-black text-base text-white leading-tight truncate">
                      {selectedCondition.config.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px]">
                      <span className={`font-bold ${selectedOriginStyle.tagClass}`}>
                        {selectedOriginStyle.tag}
                      </span>
                      {selectedCondition.duration.showCounter && (
                        <>
                          <span className="text-stone-500">·</span>
                          <span className="font-mono text-amber-200 tabular-nums">
                            {selectedCondition.duration.isPermanent ? '∞ ' : '⏳ '}
                            {selectedCondition.duration.detailLabel}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedConditionKey(null)}
                    className="w-8 h-8 rounded-lg bg-white/8 hover:bg-white/18 border border-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    title="Fechar detalhes do efeito"
                    aria-label="Fechar detalhes do efeito"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Overlay Fixed Scrollable Description Box */}
                <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-stone-700/85 bg-black/60 overflow-hidden">
                  <div className="shrink-0 px-3 py-1.5 border-b border-stone-800 bg-stone-950/65 text-[10px] font-serif font-black uppercase tracking-wider text-stone-300">
                    Descrição do Efeito / Passiva
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 text-xs text-stone-200 leading-relaxed">
                    <p>{selectedCondition.config.fullDesc}</p>

                    {selectedCondition.duration.subNote && (
                      <div className="p-2 rounded-lg bg-rose-950/45 border border-rose-500/35 text-[11px] text-rose-200">
                        {selectedCondition.duration.subNote}
                      </div>
                    )}

                    {selectedCondition.originDetail && (
                      <div className="pt-2 border-t border-stone-800 text-[11px] text-stone-300">
                        <span className="font-bold text-stone-100">
                          {selectedCondition.originKindLabel}:{' '}
                        </span>
                        <span>{selectedCondition.originDetail}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Overlay Bottom Origin Legend (4 Color Codes Highlighting Active Origin) */}
                <div className="shrink-0 rounded-xl border border-stone-800 bg-black/50 p-2.5 space-y-1.5">
                  <div className="text-[10px] font-serif font-black uppercase tracking-wider text-stone-300 px-1">
                    Origem:
                  </div>
                  <div className="space-y-1">
                    {(
                      [
                        'passiva_unidade',
                        'inerente_carta',
                        'adquirido_positivo',
                        'adquirido_negativo',
                      ] as OriginBucket[]
                    ).map((bucketKey) => {
                      const st = ORIGIN_STYLES[bucketKey];
                      const isActive = bucketKey === selectedOriginBucket;
                      return (
                        <div
                          key={bucketKey}
                          className={`flex items-center gap-2 px-2 py-1 rounded-md border text-[11px] leading-tight transition-colors ${
                            isActive
                              ? st.activeRowClass
                              : 'border-transparent text-stone-400 opacity-75'
                          }`}
                        >
                          <span
                            className={`w-2.5 h-2.5 rounded-[2px] border shrink-0 ${st.dotBgClass}`}
                          />
                          <span>{st.legendText}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Optional Combat Play Action Bar (only shown when inspecting playable hand card in combat) */}
          {onPlayFromModal && (
            <div className="px-4 sm:px-5 pb-4 pt-1 flex items-center justify-end gap-2 border-t border-stone-800/70">
              <button
                type="button"
                disabled={!canPlayFromModal}
                onClick={() => {
                  if (!canPlayFromModal) return;
                  onPlayFromModal();
                  onClose();
                }}
                title={
                  canPlayFromModal
                    ? playButtonLabel || 'Jogar Carta'
                    : playDisabledReason || 'Não jogável agora'
                }
                className={`min-h-[40px] px-5 py-2 rounded-xl font-serif font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-1.5 ${
                  canPlayFromModal
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-stone-950 border border-emerald-200 cursor-pointer active:scale-95'
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
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Art Zoom Lightbox */}
      {isZoomOpen && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl p-4 sm:p-8 animate-in fade-in duration-200"
          onClick={() => setIsZoomOpen(false)}
        >
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
                    <span className="text-xs font-mono font-bold text-purple-300">
                      Nível {previewLevel}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-400">
                  Arte Oficial em Alta Resolução · {kingdom.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasLevelSystem && (
                <div className="flex items-center bg-stone-900/90 rounded-lg p-0.5 border border-stone-800 mr-2">
                  <button
                    type="button"
                    onClick={() => setPreviewLevel(1)}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                      previewLevel === 1
                        ? 'bg-amber-500 text-stone-950 shadow'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Nv. 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewLevel(2)}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                      previewLevel === 2
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Nv. 2
                  </button>
                </div>
              )}

              <div className="hidden sm:flex items-center bg-stone-900/90 rounded-lg p-0.5 border border-stone-800">
                <button
                  type="button"
                  onClick={() => setZoomScale((s) => Math.max(0.75, +(s - 0.25).toFixed(2)))}
                  className="p-1.5 rounded hover:bg-stone-800 text-stone-300 hover:text-white transition-colors cursor-pointer"
                  title="Diminuir Zoom"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-[11px] font-mono px-2 text-stone-300 select-none tabular-nums">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomScale((s) => Math.min(2.5, +(s + 0.25).toFixed(2)))}
                  className="p-1.5 rounded hover:bg-stone-800 text-stone-300 hover:text-white transition-colors cursor-pointer"
                  title="Aumentar Zoom"
                >
                  <ZoomIn size={16} />
                </button>
                {zoomScale !== 1 && (
                  <button
                    type="button"
                    onClick={() => setZoomScale(1)}
                    className="p-1.5 rounded hover:bg-stone-800 text-amber-400 transition-colors border-l border-stone-800 ml-1 cursor-pointer"
                    title="Redefinir Zoom (100%)"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsZoomOpen(false)}
                className="p-2 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors border border-stone-700 cursor-pointer"
                title="Fechar Zoom (Esc)"
              >
                <X size={20} />
              </button>
            </div>
          </div>

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
                </div>
              )}
            </div>
          </div>

          <div className="text-[11px] text-stone-500 pt-2 flex items-center gap-3">
            <span>Dica: Clique na arte para alternar o zoom</span>
            <span>·</span>
            <span>
              Pressione{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 font-mono text-[10px]">
                ESC
              </kbd>{' '}
              para fechar
            </span>
          </div>
        </div>
      )}
    </>
  );
};
