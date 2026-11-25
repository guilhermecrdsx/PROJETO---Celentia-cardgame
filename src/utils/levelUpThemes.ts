import { CardInstance } from '../types/game';

export type AscensionCategory =
  | 'frost'
  | 'storm'
  | 'runic_earth'
  | 'seraphic'
  | 'fae_prism'
  | 'abyssal_tide'
  | 'firmament'
  | 'solar_flare'
  | 'singularity'
  | 'lunar_dream'
  | 'blood_eclipse';

export type ParticleShape =
  | 'spark'
  | 'diamond'
  | 'shard'
  | 'ember'
  | 'petal'
  | 'crescent'
  | 'ring_dot'
  | 'feather';

export interface AscensionTheme {
  id: string;
  category: AscensionCategory;
  epithet: string;
  ascensionTitle: string;
  isMythicTier6: boolean;
  primary: string;
  secondary: string;
  accent: string;
  flashCore: string;
  glowRgba: string;
  secondaryGlowRgba: string;
  voidStart: string;
  voidMid: string;
  voidEdge: string;
  borderColor: string;
  textGradient: string;
  ctaBg: string;
  ctaText: string;
  particleColors: string[];
  particleShape: ParticleShape;
  statHighlight?: string;
}

export const LEVEL_UP_TEMPLATE_IDS = new Set<string>([
  'm_bonetrus',
  'g_barao_well',
  'g_craff',
  'g_kaliel',
  'm_licia',
  'm_titano',
  'n_saniel',
  'n_seniel',
  'n_helio',
  'n_o_sol',
  'g_lunario',
  'g_a_lua',
]);

export function hasCardLevelUpMechanic(
  card: Pick<CardInstance, 'templateId' | 'name' | 'type' | 'tier'> & {
    levelUpRequirement?: string;
  }
): boolean {
  if (card.type === 'skill') return false;
  if (LEVEL_UP_TEMPLATE_IDS.has(card.templateId)) return true;
  if (typeof card.levelUpRequirement === 'string' && card.levelUpRequirement.trim().length > 0) {
    return true;
  }

  const lower = card.name.trim().toLowerCase();
  if (
    (card.tier === 5 || card.tier === 6) &&
    (lower.includes('bonetrus') ||
      lower.includes('barão well') ||
      lower.includes('barao well') ||
      lower.includes('craff') ||
      lower.includes('kaliel') ||
      lower.includes('licia') ||
      lower.includes('titano') ||
      (lower.includes('saniel') && !lower.includes('jurisdição')) ||
      lower.includes('hélio') ||
      lower.includes('helio') ||
      lower.startsWith('o sol') ||
      lower.includes('lunario') ||
      lower.includes('lunário') ||
      lower.startsWith('a lua'))
  ) {
    return true;
  }

  return false;
}

export function getDefaultAwakenedPowerText(
  card: Pick<CardInstance, 'templateId' | 'name' | 'effectDescription'>
): string {
  const tid = card.templateId;
  const lower = card.name.trim().toLowerCase();

  if (tid === 'm_bonetrus' || lower.includes('bonetrus')) {
    return 'Ao atacar inimigos afligidos por CONGELAR, executa-os caso tenham 12 ou menos de Vida. Se designado sozinho para um ataque, desfere uma nevasca devastadora em todas as unidades inimigas (100% no defensor e 50% nas demais).';
  }
  if (tid === 'g_barao_well' || lower.includes('well')) {
    return 'Recebe CURA e ROUBO DE VIDA pelo resto do combate. Além disso, a cada início de rodada, 2 inimigos aleatórios são atingidos por um raio de 15 de dano, aplicando ELETRIFICADO por 1 rodada (+20% de dano Elétrico recebido).';
  }
  if (tid === 'g_craff' || lower.includes('craff')) {
    return 'Presença Rúnica elevada: permite invocar até 3 cartas por rodada enquanto estiver em campo, e sempre que a 3ª carta da rodada for invocada, gera um Rochedo (20 de dano) na mão.';
  }
  if (tid === 'g_kaliel' || lower.includes('kaliel')) {
    return 'Comunhão Angiris desperta: gera um "Filho da Luz" fugaz na mão e faz todos os Arcanjos aliados em campo compartilharem entre si os maiores valores de seus atributos e todas as suas condições benéficas e de combate.';
  }
  if (tid === 'm_licia' || lower.includes('licia')) {
    return 'Compartilha seu valor de Poder e entrega Furtivo a todos os aliados em campo, concede +10 de Poder às unidades Furtivas a cada nova rodada e desperta a condição exclusiva ETÉREO (só pode ser bloqueada por unidades Etéreas).';
  }
  if (tid === 'm_titano' || lower.includes('titano')) {
    return 'Mantém Ataque-Duplo, recebe +20 de Poder permanente e passa a infligir SANGRAMENTO em todos os seus golpes.';
  }
  if (tid === 'n_saniel' || tid === 'n_seniel' || (lower.includes('saniel') && !lower.includes('jurisdição'))) {
    return 'Absorve permanentemente todos os atributos e condições benéficas de cada unidade inimiga que eliminar em combate, somando 50% de todo Poder absorvido ao seu Ataque, e gera "Jurisdição de Saniel" fugaz a cada 2 rodadas.';
  }
  if (tid === 'n_helio' || lower.includes('hélio') || lower.includes('helio')) {
    return 'Ao ser designado sozinho para um ataque, DOBRA o seu valor de Ataque. Se eliminar o defensor, restaura Resistência e cura +1 à Vida do Jogador.';
  }
  if (tid === 'n_o_sol' || lower.startsWith('o sol')) {
    return 'O ABSOLUTO: O Sol colapsa em sua verdadeira forma de Buraco Negro. Atributos em escala INFINITO (∞), torna-se IMORTAL, OBLITERA todas as unidades que atacarem ou defenderem e drena 1 de vida do jogador inimigo a cada rodada.';
  }
  if (tid === 'g_lunario' || lower.includes('lunario') || lower.includes('lunário')) {
    return 'Devorador de Sonhos: no início de cada nova rodada, consome o efeito SONO de todas as unidades em campo, ganhando +5/+5 de Sapiência e Poder por cada SONO consumido e causando 7 de dano à Resistência dos alvos.';
  }
  if (tid === 'g_a_lua' || lower.startsWith('a lua')) {
    return 'A EMINENTE: A Lua revela sua forma sanguinária e aniquiladora. Atributos em escala INFINITO (∞), IMORTAL, aplica SONO em todos os inimigos a cada rodada, faz Lunario OBLITERAR alvos ao consumir SONO e drena 1 de vida inimiga por rodada.';
  }

  return card.effectDescription || 'Forma suprema de Nível 2 desperta em campo de batalha.';
}

export function getAscensionTheme(
  card: Pick<CardInstance, 'templateId' | 'name' | 'element' | 'tier'>
): AscensionTheme {
  const tid = card.templateId;
  const lower = card.name.trim().toLowerCase();

  // 1. O Sol (Tier 6 - Black Hole Singularity)
  if (tid === 'n_o_sol' || lower.startsWith('o sol')) {
    return {
      id: 'n_o_sol',
      category: 'singularity',
      epithet: 'O Absoluto · Singularidade Solar',
      ascensionTitle: 'Colapso Estelar — Nível II',
      isMythicTier6: true,
      primary: '#fb923c',
      secondary: '#fde047',
      accent: '#fff7ed',
      flashCore: '#fef08a',
      glowRgba: 'rgba(251, 146, 60, 0.72)',
      secondaryGlowRgba: 'rgba(253, 224, 71, 0.5)',
      voidStart: '#1c0b04',
      voidMid: '#09040a',
      voidEdge: '#020104',
      borderColor: 'rgba(251, 146, 60, 0.85)',
      textGradient: 'from-white via-amber-200 to-orange-500',
      ctaBg: 'from-amber-400 via-orange-500 to-amber-500',
      ctaText: 'text-stone-950',
      particleColors: ['#fff7ed', '#fde047', '#fb923c', '#f97316', '#ea580c'],
      particleShape: 'ember',
      statHighlight: 'Atributos ∞ · Imortal · Obliteração Absoluta',
    };
  }

  // 2. A Lua (Tier 6 - Blood Eclipse)
  if (tid === 'g_a_lua' || lower.startsWith('a lua')) {
    return {
      id: 'g_a_lua',
      category: 'blood_eclipse',
      epithet: 'A Eminente · Eclipse de Sangue',
      ascensionTitle: 'Eclipse Sanguinário — Nível II',
      isMythicTier6: true,
      primary: '#f43f5e',
      secondary: '#c084fc',
      accent: '#ffe4e6',
      flashCore: '#fda4af',
      glowRgba: 'rgba(244, 63, 94, 0.72)',
      secondaryGlowRgba: 'rgba(168, 85, 247, 0.45)',
      voidStart: '#1f050f',
      voidMid: '#0d0410',
      voidEdge: '#030106',
      borderColor: 'rgba(244, 63, 94, 0.85)',
      textGradient: 'from-rose-100 via-rose-400 to-fuchsia-500',
      ctaBg: 'from-rose-500 via-red-500 to-rose-600',
      ctaText: 'text-white',
      particleColors: ['#ffe4e6', '#fb7185', '#e11d48', '#c084fc', '#9f1239'],
      particleShape: 'crescent',
      statHighlight: 'Atributos ∞ · Imortal · Sono em Massa & Obliteração',
    };
  }

  // 3. Bonetrus (Tier 5 - Glacial Frost)
  if (tid === 'm_bonetrus' || lower.includes('bonetrus')) {
    return {
      id: 'm_bonetrus',
      category: 'frost',
      epithet: 'Soberano do Inverno Eterno',
      ascensionTitle: 'Ascensão Glacial — Nível II',
      isMythicTier6: false,
      primary: '#38bdf8',
      secondary: '#e0f2fe',
      accent: '#7dd3fc',
      flashCore: '#e0f2fe',
      glowRgba: 'rgba(56, 189, 248, 0.65)',
      secondaryGlowRgba: 'rgba(186, 230, 253, 0.42)',
      voidStart: '#061a2e',
      voidMid: '#040d1a',
      voidEdge: '#02060d',
      borderColor: 'rgba(125, 211, 252, 0.8)',
      textGradient: 'from-white via-sky-100 to-cyan-400',
      ctaBg: 'from-sky-300 via-cyan-400 to-sky-500',
      ctaText: 'text-slate-950',
      particleColors: ['#ffffff', '#e0f2fe', '#7dd3fc', '#38bdf8', '#0284c7'],
      particleShape: 'shard',
      statHighlight: 'Execução Glacial (Vida ≤ 12) · Nevasca em Área',
    };
  }

  // 4. Barão Well (Tier 5 - High-Voltage Storm)
  if (tid === 'g_barao_well' || lower.includes('well')) {
    return {
      id: 'g_barao_well',
      category: 'storm',
      epithet: 'Soberano da Tempestade',
      ascensionTitle: 'Ascensão Voltaica — Nível II',
      isMythicTier6: false,
      primary: '#facc15',
      secondary: '#60a5fa',
      accent: '#fef9c3',
      flashCore: '#fef08a',
      glowRgba: 'rgba(250, 204, 21, 0.65)',
      secondaryGlowRgba: 'rgba(96, 165, 250, 0.5)',
      voidStart: '#121530',
      voidMid: '#090b1c',
      voidEdge: '#03040c',
      borderColor: 'rgba(250, 204, 21, 0.8)',
      textGradient: 'from-white via-yellow-200 to-sky-400',
      ctaBg: 'from-yellow-400 via-amber-400 to-yellow-500',
      ctaText: 'text-stone-950',
      particleColors: ['#fef9c3', '#fde047', '#facc15', '#93c5fd', '#38bdf8'],
      particleShape: 'spark',
      statHighlight: 'Cura + Roubo de Vida · Raios de 15 Dano / Rodada',
    };
  }

  // 5. Craff (Tier 5 - Runic Earth Monolith)
  if (tid === 'g_craff' || lower.includes('craff')) {
    return {
      id: 'g_craff',
      category: 'runic_earth',
      epithet: 'Arquiteto Rúnico',
      ascensionTitle: 'Ascensão Telúrica — Nível II',
      isMythicTier6: false,
      primary: '#f59e0b',
      secondary: '#d97706',
      accent: '#fde68a',
      flashCore: '#fef3c7',
      glowRgba: 'rgba(245, 158, 11, 0.62)',
      secondaryGlowRgba: 'rgba(180, 83, 9, 0.45)',
      voidStart: '#1d1206',
      voidMid: '#100a05',
      voidEdge: '#060402',
      borderColor: 'rgba(245, 158, 11, 0.8)',
      textGradient: 'from-amber-50 via-amber-300 to-orange-500',
      ctaBg: 'from-amber-400 via-amber-500 to-orange-500',
      ctaText: 'text-stone-950',
      particleColors: ['#fef3c7', '#fcd34d', '#f59e0b', '#d97706', '#a16207'],
      particleShape: 'diamond',
      statHighlight: '+1 Invocação / Rodada · Gera Rochedo na 3ª Carta',
    };
  }

  // 6. Kaliel, o Arcanjo (Tier 5 - Seraphic Divine)
  if (tid === 'g_kaliel' || lower.includes('kaliel')) {
    return {
      id: 'g_kaliel',
      category: 'seraphic',
      epithet: 'Comunhão Angiris',
      ascensionTitle: 'Ascensão Seráfica — Nível II',
      isMythicTier6: false,
      primary: '#fde047',
      secondary: '#fffbeb',
      accent: '#f59e0b',
      flashCore: '#ffffff',
      glowRgba: 'rgba(253, 224, 71, 0.68)',
      secondaryGlowRgba: 'rgba(255, 251, 235, 0.45)',
      voidStart: '#241a05',
      voidMid: '#120e07',
      voidEdge: '#060503',
      borderColor: 'rgba(253, 224, 71, 0.85)',
      textGradient: 'from-white via-amber-100 to-amber-400',
      ctaBg: 'from-amber-300 via-yellow-400 to-amber-500',
      ctaText: 'text-stone-950',
      particleColors: ['#ffffff', '#fef9c3', '#fde047', '#fbbf24', '#f59e0b'],
      particleShape: 'feather',
      statHighlight: 'Comunhão de Atributos & Condições · Filho da Luz',
    };
  }

  // 7. Licia, a Fada (Tier 5 - Iridescent Fae Magic)
  if (tid === 'm_licia' || lower.includes('licia')) {
    return {
      id: 'm_licia',
      category: 'fae_prism',
      epithet: 'Guardiã do Véu Etéreo',
      ascensionTitle: 'Ascensão Férica — Nível II',
      isMythicTier6: false,
      primary: '#e879f9',
      secondary: '#34d399',
      accent: '#f5d0fe',
      flashCore: '#fae8ff',
      glowRgba: 'rgba(232, 121, 249, 0.62)',
      secondaryGlowRgba: 'rgba(52, 211, 153, 0.44)',
      voidStart: '#1f0929',
      voidMid: '#0e071a',
      voidEdge: '#05030b',
      borderColor: 'rgba(232, 121, 249, 0.8)',
      textGradient: 'from-white via-fuchsia-200 to-emerald-300',
      ctaBg: 'from-fuchsia-400 via-purple-400 to-emerald-400',
      ctaText: 'text-stone-950',
      particleColors: ['#fae8ff', '#f0abfc', '#e879f9', '#6ee7b7', '#34d399'],
      particleShape: 'petal',
      statHighlight: 'Condição Exclusiva ETÉREO · Furtividade Global',
    };
  }

  // 8. Titano, o Carrasco dos Mares (Tier 5 - Abyssal Ocean Tide)
  if (tid === 'm_titano' || lower.includes('titano')) {
    return {
      id: 'm_titano',
      category: 'abyssal_tide',
      epithet: 'Carrasco das Profundezas',
      ascensionTitle: 'Ascensão Abissal — Nível II',
      isMythicTier6: false,
      primary: '#22d3ee',
      secondary: '#fb7185',
      accent: '#cffafe',
      flashCore: '#a5f3fc',
      glowRgba: 'rgba(34, 211, 238, 0.65)',
      secondaryGlowRgba: 'rgba(251, 113, 133, 0.4)',
      voidStart: '#041f2b',
      voidMid: '#030f18',
      voidEdge: '#01060b',
      borderColor: 'rgba(34, 211, 238, 0.82)',
      textGradient: 'from-cyan-50 via-cyan-300 to-teal-400',
      ctaBg: 'from-cyan-400 via-teal-400 to-cyan-500',
      ctaText: 'text-slate-950',
      particleColors: ['#cffafe', '#67e8f9', '#22d3ee', '#0ea5e9', '#fb7185'],
      particleShape: 'ring_dot',
      statHighlight: 'Ataque-Duplo · +20 Poder · Sangramento Permanente',
    };
  }

  // 9. Saniel, o Arcanjo (Tier 5 - Firmament Platinum & Gold)
  if (tid === 'n_saniel' || tid === 'n_seniel' || lower.includes('saniel')) {
    return {
      id: 'n_saniel',
      category: 'firmament',
      epithet: 'Juiz do Firmamento',
      ascensionTitle: 'Ascensão Soberana — Nível II',
      isMythicTier6: false,
      primary: '#e2e8f0',
      secondary: '#fbbf24',
      accent: '#f8fafc',
      flashCore: '#ffffff',
      glowRgba: 'rgba(251, 191, 36, 0.58)',
      secondaryGlowRgba: 'rgba(226, 232, 240, 0.48)',
      voidStart: '#191a24',
      voidMid: '#0d0e15',
      voidEdge: '#040508',
      borderColor: 'rgba(251, 191, 36, 0.8)',
      textGradient: 'from-white via-slate-100 to-amber-300',
      ctaBg: 'from-amber-300 via-yellow-400 to-amber-500',
      ctaText: 'text-stone-950',
      particleColors: ['#ffffff', '#f1f5f9', '#cbd5e1', '#fde68a', '#fbbf24'],
      particleShape: 'feather',
      statHighlight: 'Absorção Total de Atributos · Jurisdição de Saniel',
    };
  }

  // 10. Hélio, o Emissário do Sol (Tier 5 - Solar Flare)
  if (tid === 'n_helio' || lower.includes('hélio') || lower.includes('helio')) {
    return {
      id: 'n_helio',
      category: 'solar_flare',
      epithet: 'Arauto da Chama Solar',
      ascensionTitle: 'Ascensão Solar — Nível II',
      isMythicTier6: false,
      primary: '#f97316',
      secondary: '#fde047',
      accent: '#ffedd5',
      flashCore: '#fef08a',
      glowRgba: 'rgba(249, 115, 22, 0.68)',
      secondaryGlowRgba: 'rgba(253, 224, 71, 0.48)',
      voidStart: '#290e04',
      voidMid: '#140704',
      voidEdge: '#070302',
      borderColor: 'rgba(251, 146, 60, 0.85)',
      textGradient: 'from-yellow-50 via-amber-300 to-orange-500',
      ctaBg: 'from-amber-400 via-orange-500 to-amber-500',
      ctaText: 'text-stone-950',
      particleColors: ['#ffedd5', '#fde047', '#fbbf24', '#fb923c', '#ef4444'],
      particleShape: 'ember',
      statHighlight: 'Ataque Dobrado (Sozinho) · Cura Resistência & +1 Vida',
    };
  }

  // 11. Lunario, o Emissário da Lua (Tier 5 - Astral Dream)
  if (tid === 'g_lunario' || lower.includes('lunario') || lower.includes('lunário')) {
    return {
      id: 'g_lunario',
      category: 'lunar_dream',
      epithet: 'Devorador de Sonhos',
      ascensionTitle: 'Ascensão Lunar — Nível II',
      isMythicTier6: false,
      primary: '#a78bfa',
      secondary: '#e0e7ff',
      accent: '#c4b5fd',
      flashCore: '#eef2ff',
      glowRgba: 'rgba(167, 139, 250, 0.65)',
      secondaryGlowRgba: 'rgba(129, 140, 248, 0.45)',
      voidStart: '#140c2e',
      voidMid: '#0a061a',
      voidEdge: '#03020a',
      borderColor: 'rgba(167, 139, 250, 0.82)',
      textGradient: 'from-white via-indigo-200 to-violet-400',
      ctaBg: 'from-indigo-400 via-violet-400 to-purple-500',
      ctaText: 'text-stone-950',
      particleColors: ['#ffffff', '#e0e7ff', '#c4b5fd', '#a78bfa', '#818cf8'],
      particleShape: 'crescent',
      statHighlight: 'Consome SONO Global · +5/+5 Sapiência & Poder',
    };
  }

  // Universal Fallback for any future Tier 5/6 card
  const isTier6 = card.tier === 6;
  return {
    id: card.templateId,
    category: isTier6 ? 'singularity' : 'seraphic',
    epithet: isTier6 ? 'Entidade Cósmica Desperta' : 'Forma Lendária Desperta',
    ascensionTitle: isTier6 ? 'Ascensão Cósmica — Nível II' : 'Ascensão Lendária — Nível II',
    isMythicTier6: isTier6,
    primary: '#fbbf24',
    secondary: '#38bdf8',
    accent: '#fef3c7',
    flashCore: '#fef9c3',
    glowRgba: 'rgba(251, 191, 36, 0.65)',
    secondaryGlowRgba: 'rgba(56, 189, 248, 0.42)',
    voidStart: '#1a1208',
    voidMid: '#0c0912',
    voidEdge: '#040308',
    borderColor: 'rgba(251, 191, 36, 0.82)',
    textGradient: 'from-white via-amber-200 to-amber-500',
    ctaBg: 'from-amber-400 via-yellow-400 to-amber-500',
    ctaText: 'text-stone-950',
    particleColors: ['#ffffff', '#fef08a', '#fbbf24', '#f59e0b', '#38bdf8'],
    particleShape: 'diamond',
  };
}
