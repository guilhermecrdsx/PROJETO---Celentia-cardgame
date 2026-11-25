import { CARD_TEMPLATES } from '../data/cards.ts';
import type { CardInstance, CardTemplate, ConditionEffect, ConditionSourceInfo } from '../types/game.ts';

let instanceCounter = 1;

// Pure Fisher-Yates shuffle algorithm (Patch 1.3 - 100% aleatório)
export function shuffleDeck<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createCardInstance(template: CardTemplate): CardInstance {
  const instanceId = `c_${template.id}_${Date.now()}_${instanceCounter++}`;
  const conditions = new Set<ConditionEffect>();
  const conditionSources: Partial<Record<string, ConditionSourceInfo>> = {};

  // Patch 1.4: Unidades Telúricas recebem +50% Poder como Vida e +50% Poder como Defesa
  const isTelurico = template.element === 'Telúrico' || template.element === 'Terra';
  const teluricoHpBonus = isTelurico ? Math.floor(template.power * 0.5) : 0;
  const teluricoDefBonus = isTelurico ? Math.floor(template.power * 0.5) : 0;
  const effectiveHp = template.hp + teluricoHpBonus;

  // Nova Classe: Gelo - Unidades GELO recebem 50% do seu Poder como Defesa extra
  const isGelo = template.element === 'Gelo';
  const geloDefBonus = isGelo ? Math.floor(template.power * 0.5) : 0;

  // Classe Neutra: Unidades Neutras recebem 100% do seu Poder somado a Vida, Ataque e Defesa
  const isNeutro = template.element === 'Neutro';
  const neutroBonus = isNeutro ? Math.max(0, Math.floor(template.power)) : 0;

  const totalEffectiveHp = effectiveHp + neutroBonus;
  const effectiveAtk = template.atk + neutroBonus;
  const effectiveDef = template.def + teluricoDefBonus + geloDefBonus + neutroBonus;

  // Inherent conditions from templates
  if (template.id === 'g_corcel' || template.id === 'm_finn') {
    conditions.add('furtividade');
    conditionSources['furtividade'] = {
      kind: template.id === 'g_corcel' ? 'passiva_propria' : 'efeito_unico_proprio',
      sourceName: template.name,
    };
  }
  if (template.id === 'n_ilio') {
    conditions.add('dormindo');
    conditionSources['dormindo'] = { kind: 'efeito_unico_proprio', sourceName: template.name };
  }
  if (template.id === 'm_umael' || template.id === 'm_caspiem' || template.id === 'n_wyr') {
    conditions.add('enfrentar');
    conditionSources['enfrentar'] = { kind: 'efeito_unico_proprio', sourceName: template.name };
  }
  if (template.id === 'm_moira' || template.id === 'm_titano' || template.id === 'g_sebastian' || template.id === 'g_fafnyr') {
    conditions.add('ataque_duplo');
    conditionSources['ataque_duplo'] = {
      kind: template.id === 'g_fafnyr' ? 'efeito_unico_proprio' : 'passiva_propria',
      sourceName: template.name,
    };
  }
  if (template.id === 'g_daniel' || template.id === 'g_sebastian' || template.id === 'm_farren') {
    conditions.add('roubo_de_vida');
    conditionSources['roubo_de_vida'] = {
      kind: template.id === 'm_farren' ? 'efeito_unico_proprio' : 'passiva_propria',
      sourceName: template.name,
    };
  }
  if (template.id === 'g_ide') {
    conditions.add('barreira');
    conditionSources['barreira'] = { kind: 'efeito_unico_proprio', sourceName: template.name };
  }
  if (template.id === 'g_herox') {
    conditions.add('imunidade');
    conditionSources['imunidade'] = { kind: 'efeito_unico_proprio', sourceName: template.name };
  }
  if (template.id === 'n_polus') {
    conditions.add('critico');
    conditionSources['critico'] = { kind: 'efeito_unico_proprio', sourceName: template.name };
  }
  if (template.id === 'm_cavaleiro_sem_nome' || template.id === 'n_pedrinha') {
    conditions.add('tenacidade');
    conditionSources['tenacidade'] = { kind: 'passiva_propria', sourceName: template.name };
  }
  if (template.id === 'm_juci') {
    conditions.add('bravura');
    conditionSources['bravura'] = { kind: 'efeito_unico_proprio', sourceName: template.name };
  }
  if (template.id === 'n_yuh' || template.id === 'n_gambeta') {
    conditions.add('cura');
    conditionSources['cura'] = { kind: 'efeito_unico_proprio', sourceName: template.name };
  }

  return {
    instanceId,
    templateId: template.id,
    name: template.name,
    kingdom: template.kingdom,
    tier: template.tier,
    type: template.type,
    element: template.element,
    hp: totalEffectiveHp,
    maxHp: totalEffectiveHp,
    atk: effectiveAtk,
    def: effectiveDef,
    power: template.power,
    baseAtk: effectiveAtk,
    baseDef: effectiveDef,
    basePower: template.power,
    peakPower: template.power,
    icePeakDefense: effectiveDef,
    icePowerDefGranted: geloDefBonus,
    teluricoPowerHpGranted: teluricoHpBonus,
    teluricoPowerDefGranted: teluricoDefBonus,
    neutroPowerHpGranted: neutroBonus,
    neutroPowerAtkGranted: neutroBonus,
    neutroPowerDefGranted: neutroBonus,
    sapience: template.sapience ?? (template.element === 'Cósmico' ? template.hp : undefined),
    baseSapience: template.sapience ?? (template.element === 'Cósmico' ? template.hp : undefined),
    isToken: template.isToken,
    hasFirstAttacked: false,
    conditions,
    conditionSources,
    silencedRounds: 0,
    powerAlwaysActive: false,
    doublePower: false,
    asleepState: template.id === 'n_ilio' ? true : undefined,
    sleepRoundsRemaining: template.id === 'n_ilio' ? 2 : undefined,
    canActThisRound: true,
    speed: template.speed,
    effectDescription: template.effectDescription,
    lore: template.lore,
    exclusiveName: template.exclusiveName,
    conditionPill: template.conditionPill,
    level: template.level || (template.id === 'n_seniel' || template.id === 'n_saniel' || template.id === 'g_barao_well' || template.id === 'm_licia' || template.id === 'g_craff' || template.id === 'm_titano' || template.id === 'n_helio' || template.id === 'g_lunario' || template.id === 'm_bonetrus' || template.id === 'n_o_sol' ? 1 : undefined),
    attackCount: template.attackCount ?? (template.id === 'n_seniel' || template.id === 'n_saniel' ? 0 : undefined),
    isArchangel: template.isArchangel ?? (template.id === 'n_zael' || template.id === 'm_inariel' || template.id === 'm_umael' || template.id === 'n_seniel' || template.id === 'n_saniel' || template.id === 'n_polus' || template.id === 'n_torvyx' || template.id === 'm_fanx'),
    isFairy: template.isFairy,
    burnTurnsRemaining: 0,
    curaTurnsRemaining: template.id === 'n_gambeta' ? 4 : template.id === 'n_yuh' ? 3 : 0,
    entorpecerRoundsRemaining: 0,
    immunedRounds: template.id === 'g_herox' ? 3 : undefined,
    defendCount: template.id === 'g_lunario' ? 0 : undefined,
    hasDoubleAttack: template.id === 'm_moira' || template.id === 'm_titano' || template.id === 'g_sebastian' || template.id === 'g_fafnyr',
    doubleAttackRoundsRemaining: template.id === 'g_fafnyr' ? 1 : undefined,
    hasLifeSteal: template.id === 'g_daniel' || template.id === 'g_sebastian' || template.id === 'm_farren',
    lifeStealRoundsRemaining: template.id === 'm_farren' ? 1 : undefined,
    blockChance: template.id === 'g_pcie' ? 0.3 : undefined,
    dodgeChance: template.id === 'n_tyn' ? 0.4 : undefined,
    isFugaz: template.isFugaz,
    levelUpProgress: 0,
  };
}

export function createAtormentadorInstance(): CardInstance {
  const template = CARD_TEMPLATES.find((c) => c.id === 'm_atormentador')!;
  return createCardInstance(template);
}

// Deck Inicial Oficial de 20 Cartas (Exclusivamente Fogo, Telúrico e Elétrico | Máximo Tier 4 com 2 unidades T4 diferentes):
export const PRESET_FIRE_LIGHTNING = {
  name: 'Tríade Elemental: Fogo, Raiz & Trovão',
  subtitle: 'Deck Inicial Oficial · Fogo, Telúrico & Elétrico (T1–T4)',
  description:
    'Gael e Vilma espalham Queimadura e dano em área para ativar o bônus de +25% de dano de Inariel. Bart e Mara aceleram compras e concedem Poder (que aumenta Dano em Fogo/Elétrico e Vida/Defesa em Telúricos). Kyn, Bimo e Sebastian controlam o campo com Atordoamento e Ataque-Duplo, Milton amplifica os Telúricos em +25%, Virtus fortalece toda a mesa e a dupla Tier 4 (General Bor e Karaty) finaliza a partida.',
  cardIds: [
    // Tier 1 (8 cartas: 4 Fogo, 3 Elétrico, 1 Telúrico)
    'g_gael', 'g_gael',
    'm_vilma', 'm_vilma',
    'n_bart', 'n_bart',
    'm_mara',
    'n_kyn',
    // Tier 2 (6 cartas: 2 Fogo, 2 Elétrico, 2 Telúrico)
    'g_comandante_virtus', 'g_comandante_virtus',
    'g_sebastian', 'g_sebastian',
    'n_bimo', 'n_bimo',
    // Tier 3 (4 cartas: 2 Fogo, 1 Telúrico, 1 Elétrico)
    'm_inariel', 'm_inariel',
    'n_milton',
    'm_umael',
    // Tier 4 (2 cartas — apenas 2 unidades diferentes: 1 Fogo, 1 Elétrico)
    'g_bor',
    'n_karaty',
  ],
};

export const DEFAULT_DECK_IDS = PRESET_FIRE_LIGHTNING.cardIds;

// Apenas o Deck Inicial existe como deck pré-definido do jogador
export const DECK_PRESETS = [PRESET_FIRE_LIGHTNING];

export interface AiDeckPreset {
  id: string;
  name: string;
  subtitle: string;
  cardIds: string[];
}

// Pool variado de 6 baralhos sinérgicos para a IA rotacionar entre partidas PvIA
export const AI_DECK_POOL: AiDeckPreset[] = [
  {
    id: 'ai_triade_fogo_trovao',
    name: 'Tríade Elemental',
    subtitle: 'Fogo, Telúrico & Elétrico',
    cardIds: [
      'g_gael', 'g_gael',
      'm_vilma', 'm_vilma',
      'n_bart', 'n_bart',
      'm_mara', 'n_kyn',
      'g_comandante_virtus', 'g_comandante_virtus',
      'g_sebastian', 'g_sebastian',
      'n_bimo', 'n_bimo',
      'm_inariel', 'm_inariel',
      'n_milton', 'm_umael',
      'g_bor', 'n_karaty',
    ],
  },
  {
    id: 'ai_muralha_glacial',
    name: 'Muralha Glacial',
    subtitle: 'Gelo & Controle de Defesa',
    cardIds: [
      'g_glauco', 'g_glauco',
      'n_polus', 'n_polus',
      'm_celia', 'm_celia',
      'm_crio_genese', 'm_moral',
      'm_kore', 'm_kore',
      'm_felicia', 'm_felicia',
      'm_nevasca', 'g_desafio_real',
      'm_crizelia', 'm_crizelia',
      'g_aurora', 'g_aurora',
      'm_juci', 'm_lamina_inverno',
    ],
  },
  {
    id: 'ai_mare_abissal',
    name: 'Maré Abissal',
    subtitle: 'Água & Sobrevivência Fluida',
    cardIds: [
      'm_fanx', 'm_fanx',
      'n_cristalys', 'n_cristalys',
      'n_vanusa', 'n_vanusa',
      'g_enganar', 'm_moral',
      'm_jasmim', 'm_jasmim',
      'n_charmagon', 'n_charmagon',
      'g_oceanico', 'n_destreza',
      'g_guadan', 'g_guadan',
      'm_farren', 'm_farren',
      'm_krust', 'n_gohr',
    ],
  },
  {
    id: 'ai_bastiao_telurico',
    name: 'Bastião de Pedra & Aço',
    subtitle: 'Telúrico & Neutro',
    cardIds: [
      'n_kyn', 'n_kyn',
      'n_pedrinha', 'n_pedrinha',
      'm_finn', 'g_hugo',
      'g_leo', 'g_fafnyr',
      'n_bimo', 'n_bimo',
      'n_gambeta', 'g_pcie',
      'm_moira', 'n_forca_natureza',
      'n_milton', 'm_caspiem',
      'g_bronx', 'n_wyr',
      'm_cavaleiro_sem_nome', 'm_rei_mauricio',
    ],
  },
  {
    id: 'ai_tempestade_eletrica',
    name: 'Tempestade Relâmpago',
    subtitle: 'Elétrico & Pressão Veloz',
    cardIds: [
      'n_bart', 'n_bart',
      'm_mara', 'm_mara',
      'm_gough', 'm_gough',
      'm_estatico', 'g_enganar',
      'g_sebastian', 'g_sebastian',
      'n_xury', 'n_xury',
      'n_destreza', 'm_voto_caidos',
      'm_umael', 'm_umael',
      'n_tyn', 'n_tyn',
      'n_karaty', 'm_chamado_da_vitoria',
    ],
  },
  {
    id: 'ai_forja_chamas_laminas',
    name: 'Forja de Chamas & Lâminas',
    subtitle: 'Fogo & Neutro Agressivo',
    cardIds: [
      'g_gael', 'g_gael',
      'm_vilma', 'n_fernando',
      'g_hugo', 'g_leo',
      'n_labareda_solar', 'm_moral',
      'g_comandante_virtus', 'g_comandante_virtus',
      'n_crisol', 'n_crisol',
      'm_moira', 'n_yuh',
      'm_inariel', 'g_salazar',
      'g_bronx', 'm_destino_fatal',
      'g_bor', 'm_rei_mauricio',
    ],
  },
];

const LAST_AI_DECK_KEY = 'alvorecer_last_ai_deck_idx';
let inMemoryLastAiDeckIdx = -1;

export function getNextRotatingAiDeck(): AiDeckPreset {
  let lastIdx = inMemoryLastAiDeckIdx;
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(LAST_AI_DECK_KEY);
      if (saved !== null) {
        const parsed = Number.parseInt(saved, 10);
        if (!Number.isNaN(parsed)) lastIdx = parsed;
      }
    } catch {
      // ignore storage errors
    }
  }

  const candidateIndices = AI_DECK_POOL.map((_, idx) => idx).filter((idx) => idx !== lastIdx);
  const chosenIdx =
    candidateIndices.length > 0
      ? candidateIndices[Math.floor(Math.random() * candidateIndices.length)]
      : 0;

  inMemoryLastAiDeckIdx = chosenIdx;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(LAST_AI_DECK_KEY, String(chosenIdx));
    } catch {
      // ignore storage errors
    }
  }

  return AI_DECK_POOL[chosenIdx];
}

export function getRandomPresetDeckIds(): string[] {
  return getNextRotatingAiDeck().cardIds;
}

// Baralho curado do Jogador no Tutorial (cartas fortes, claras e variadas: unidades T1-T3 + habilidades rápidas/lentas)
export const TUTORIAL_PLAYER_DECK_IDS: string[] = [
  'g_gael', 'g_gael',
  'g_hugo', 'g_hugo',
  'm_vilma', 'm_vilma',
  'n_bart', 'n_bart',
  'm_moral', 'g_enganar',
  'm_crio_genese', 'n_labareda_solar',
  'g_comandante_virtus', 'g_comandante_virtus',
  'g_sebastian', 'g_sebastian',
  'm_moira', 'n_bimo',
  'm_inariel', 'g_bronx',
];

// Baralho facilitado do Instrutor Celentia no Tutorial (permite combate real de ataque e defesa, mas garante vitória justa do aprendiz)
export const TUTORIAL_INSTRUCTOR_DECK_IDS: string[] = [
  'm_celia', 'm_celia',
  'n_cristalys', 'n_cristalys',
  'n_vanusa', 'n_vanusa',
  'm_finn', 'm_finn',
  'n_pedrinha', 'n_pedrinha',
  'm_gough', 'm_gough',
  'g_glauco', 'g_glauco',
  'n_kyn', 'n_kyn',
  'n_gambeta', 'n_gambeta',
  'm_jasmim', 'm_jasmim',
];

// Build deck from card IDs (expanding mini-packs like pack_atormentador)
export function buildDeckFromTemplateIds(cardIds: string[]): CardInstance[] {
  const instances: CardInstance[] = [];
  const map = new Map(CARD_TEMPLATES.map((t) => [t.id, t]));

  for (const id of cardIds) {
    if (id === 'pack_atormentador') {
      const tor = map.get('m_tor');
      const men = map.get('m_men');
      const tador = map.get('m_tador');
      if (tor) instances.push(createCardInstance(tor));
      if (men) instances.push(createCardInstance(men));
      if (tador) instances.push(createCardInstance(tador));
      continue;
    }
    const template = map.get(id);
    if (template) {
      instances.push(createCardInstance(template));
    }
  }

  // If less than 20 for any reason, pad with default collectible cards
  const fallbackPool = CARD_TEMPLATES.filter((t) => !t.isSpecialSummon && !t.isToken && !t.isSecret && t.id !== 'dummy_target');
  while (instances.length < 20 && fallbackPool.length > 0) {
    const fallbackTemplate = fallbackPool[instances.length % fallbackPool.length];
    instances.push(createCardInstance(fallbackTemplate));
  }

  // Shuffle the constructed deck purely randomly (Patch 1.3)
  return shuffleDeck(instances);
}

// Distribuição da mão inicial (4 cartas iniciais antes da compra automática da Rodada 1):
// - 1 Carta de TIER 1 tem 100% de chance de estar na mão inicial.
// - 1 Carta de TIER 1 adicional tem 50% de chance de estar na mão inicial.
// - As demais são aleatórias, como normalmente é.
export function dealInitialHand(deck: CardInstance[]): { hand: CardInstance[]; remainingDeck: CardInstance[] } {
  const pool = shuffleDeck(deck);
  const hand: CardInstance[] = [];

  // 1) 1 Carta de Tier 1 com 100% de chance na mão inicial
  const firstTier1Idx = pool.findIndex((c) => c.tier === 1);
  if (firstTier1Idx !== -1) {
    hand.push(...pool.splice(firstTier1Idx, 1));
  }

  // 2) 1 Carta de Tier 1 adicional com 50% de chance na mão inicial
  if (Math.random() < 0.5) {
    const secondTier1Idx = pool.findIndex((c) => c.tier === 1);
    if (secondTier1Idx !== -1) {
      hand.push(...pool.splice(secondTier1Idx, 1));
    }
  }

  // 3) As demais cartas são aleatórias até completar as 4 cartas iniciais
  while (hand.length < 4 && pool.length > 0) {
    const next = pool.shift();
    if (next) hand.push(next);
  }

  return {
    hand: shuffleDeck(hand),
    remainingDeck: pool,
  };
}

// Pure 100% random draw (Patch 1.3):
// Qualquer carta do deck pode ser comprada em qualquer momento da partida, independente da rodada.
export function drawCardCurve(deck: CardInstance[], _round?: number): { card: CardInstance | null; remainingDeck: CardInstance[] } {
  if (deck.length === 0) {
    return { card: null, remainingDeck: [] };
  }

  const [card, ...remainingDeck] = deck;

  return {
    card,
    remainingDeck,
  };
}

// Default export builder
export function buildPlayerDeck(): CardInstance[] {
  return buildDeckFromTemplateIds(DEFAULT_DECK_IDS);
}
