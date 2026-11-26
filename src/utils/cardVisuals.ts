import { ElementType, KingdomType, TierType } from '../types/game';

export interface KingdomTheme {
  name: string;
  subtitle: string;
  primaryColor: string;
  borderColor: string;
  bgGradient: string;
  crest: string;
}

export const KINGDOM_THEMES: Record<KingdomType, KingdomTheme> = {
  granty: {
    name: 'Reino de Granty',
    subtitle: 'Baluarte de Honra e Aço',
    primaryColor: '#f59e0b',
    borderColor: 'border-amber-500/40',
    bgGradient: 'from-amber-950/80 via-stone-900/90 to-black',
    crest: '🏰',
  },
  musmo: {
    name: 'Reino de Musmo',
    subtitle: 'Nexo Arcano e Tempestuoso',
    primaryColor: '#8b5cf6',
    borderColor: 'border-purple-500/40',
    bgGradient: 'from-purple-950/80 via-slate-900/90 to-black',
    crest: '🏛️',
  },
  naneya: {
    name: 'Reino de Naneya',
    subtitle: 'Ermos Naturais e Primordiais',
    primaryColor: '#10b981',
    borderColor: 'border-emerald-500/40',
    bgGradient: 'from-emerald-950/80 via-zinc-900/90 to-black',
    crest: '🏯',
  },
};

export const ELEMENT_CONFIG: Record<
  ElementType,
  {
    name: string;
    bgBadge: string;
    textBadge: string;
    border: string;
    glow: string;
    icon: string;
    strongVs: string;
    weakVs: string;
  }
> = {
  Fogo: {
    name: 'Fogo',
    bgBadge: 'bg-orange-950/80',
    textBadge: 'text-orange-400',
    border: 'border-orange-600/50',
    glow: 'rgba(234, 88, 12, 0.4)',
    icon: '🔥',
    strongVs: 'Dano Máximo (Dano = Ataque + Poder)',
    weakVs: 'Resistência = Vida + Defesa',
  },
  Água: {
    name: 'Água',
    bgBadge: 'bg-sky-950/80',
    textBadge: 'text-sky-400',
    border: 'border-sky-600/50',
    glow: 'rgba(2, 132, 199, 0.4)',
    icon: '💧',
    strongVs: 'Resistência Reforçada (+50% Poder)',
    weakVs: 'Dano = Ataque + 50% Poder',
  },
  Telúrico: {
    name: 'Telúrico',
    bgBadge: 'bg-emerald-950/80',
    textBadge: 'text-emerald-400',
    border: 'border-emerald-600/50',
    glow: 'rgba(5, 150, 105, 0.4)',
    icon: '🌿',
    strongVs: 'Vida & Defesa Extras (+50% Poder na Vida e +50% Poder na Defesa)',
    weakVs: 'Dano = Ataque puro',
  },
  Terra: {
    name: 'Telúrico',
    bgBadge: 'bg-emerald-950/80',
    textBadge: 'text-emerald-400',
    border: 'border-emerald-600/50',
    glow: 'rgba(5, 150, 105, 0.4)',
    icon: '🌿',
    strongVs: 'Vida & Defesa Extras (+50% Poder na Vida e +50% Poder na Defesa)',
    weakVs: 'Dano = Ataque puro',
  },
  Elétrico: {
    name: 'Elétrico',
    bgBadge: 'bg-yellow-950/80',
    textBadge: 'text-yellow-400',
    border: 'border-yellow-600/50',
    glow: 'rgba(202, 138, 4, 0.4)',
    icon: '⚡',
    strongVs: 'Primeiro Ataque Sempre Atordoa o Alvo',
    weakVs: 'Dano = Ataque + 50% Poder',
  },
  Mágico: {
    name: 'Mágico',
    bgBadge: 'bg-purple-950/80',
    textBadge: 'text-purple-300',
    border: 'border-purple-600/50',
    glow: 'rgba(147, 51, 234, 0.4)',
    icon: '✨',
    strongVs: 'Ataque Arcano (Dano = 100% Poder)',
    weakVs: 'Sem Ataque Físico (-)',
  },
  Cósmico: {
    name: 'Cósmico',
    bgBadge: 'bg-indigo-950/90',
    textBadge: 'text-indigo-300',
    border: 'border-indigo-400/60',
    glow: 'rgba(99, 102, 241, 0.5)',
    icon: '🧬',
    strongVs: 'Poder e Sapiência (Resistência = Sapiência)',
    weakVs: 'Imune a buffs não-cósmicos e Queimadura',
  },
  Gelo: {
    name: 'Gelo',
    bgBadge: 'bg-cyan-950/80',
    textBadge: 'text-cyan-300',
    border: 'border-cyan-500/50',
    glow: 'rgba(6, 182, 212, 0.45)',
    icon: '❄️',
    strongVs: 'Defesa Extra (+50% Poder) & Dano Extra (+25% Defesa)',
    weakVs: 'Sem Ataque Arcano direto',
  },
  Divino: {
    name: 'Divino',
    bgBadge: 'bg-amber-950/90',
    textBadge: 'text-amber-200',
    border: 'border-amber-300/70',
    glow: 'rgba(251, 191, 36, 0.55)',
    icon: '⚜️',
    strongVs: 'Invocação Antecipada & Dano Adicional (+80% Poder)',
    weakVs: 'Resistência = Vida + Defesa',
  },
  Sombrio: {
    name: 'Sombrio',
    bgBadge: 'bg-violet-950/95',
    textBadge: 'text-fuchsia-300',
    border: 'border-fuchsia-500/65',
    glow: 'rgba(168, 85, 247, 0.6)',
    icon: '🌑',
    strongVs: 'Dano Crítico Sombrio (50% do Poder direto na Vida)',
    weakVs: 'Com Crítico ativo: Dano normal na Vida + 50% do Poder atual',
  },
  Neutro: {
    name: 'Neutro',
    bgBadge: 'bg-slate-900/90',
    textBadge: 'text-slate-300',
    border: 'border-slate-500/50',
    glow: 'rgba(148, 163, 184, 0.3)',
    icon: '🧭',
    strongVs: 'Estabilidade Pura (Dano = Ataque, Resistência = Vida + Defesa)',
    weakVs: 'Sem bônus elemental',
  },
  Nenhum: {
    name: 'Habilidade',
    bgBadge: 'bg-purple-950/90',
    textBadge: 'text-purple-200',
    border: 'border-purple-500/50',
    glow: 'rgba(168, 85, 247, 0.4)',
    icon: '',
    strongVs: 'Efeito Direto de Habilidade',
    weakVs: 'Não Combate em Campo',
  },
};

export const TIER_CONFIG: Record<
  TierType,
  {
    name: string;
    color: string;
    badgeStyle: string;
    borderCard: string;
    unlockRound: string;
    frameGradient: string;
    gemColor: string;
    glowShadow: string;
  }
> = {
  1: {
    name: 'Comum',
    color: '#64748b',
    badgeStyle: 'text-slate-400',
    borderCard: 'border-[#64748b] border-[3px]',
    unlockRound: 'Rodadas 1 - 2',
    frameGradient: 'from-slate-600 via-slate-700 to-slate-800',
    gemColor: '#94a3b8',
    glowShadow: 'transparent',
  },
  2: {
    name: 'Incomum',
    color: '#06b6d4',
    badgeStyle: 'text-cyan-400',
    borderCard: 'border-[#06b6d4] border-[3px]',
    unlockRound: 'Rodadas 3 - 4',
    frameGradient: 'from-cyan-500 via-cyan-700 to-sky-900',
    gemColor: '#38bdf8',
    glowShadow: 'transparent',
  },
  3: {
    name: 'Rara',
    color: '#10b981',
    badgeStyle: 'text-emerald-400',
    borderCard: 'border-[#10b981] border-[3px]',
    unlockRound: 'Rodadas 5 - 6',
    frameGradient: 'from-emerald-500 via-emerald-700 to-teal-950',
    gemColor: '#34d399',
    glowShadow: 'transparent',
  },
  4: {
    name: 'Épica',
    color: '#a855f7',
    badgeStyle: 'text-purple-400',
    borderCard: 'border-[#a855f7] border-[3px]',
    unlockRound: 'Rodadas 7 - 8',
    frameGradient: 'from-purple-500 via-purple-700 to-violet-950',
    gemColor: '#c084fc',
    glowShadow: 'transparent',
  },
  5: {
    name: 'Lendária',
    color: '#f59e0b',
    badgeStyle: 'text-amber-400',
    borderCard: 'border-[#f59e0b] border-[3px]',
    unlockRound: 'Rodada 9+',
    frameGradient: 'from-amber-400 via-amber-600 to-yellow-950',
    gemColor: '#fbbf24',
    glowShadow: 'rgba(245, 158, 11, 0.6)',
  },
  6: {
    name: 'Supremo',
    color: '#ec4899',
    badgeStyle: 'text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-amber-300 via-emerald-300 via-cyan-300 to-fuchsia-400 font-black',
    borderCard: 'border-[#ec4899] border-[3px]',
    unlockRound: 'Rodada 10+',
    frameGradient: 'from-rose-500 via-amber-400 via-emerald-400 via-cyan-400 to-fuchsia-600',
    gemColor: '#f472b6',
    glowShadow: 'rgba(236, 72, 153, 0.9)',
  },
};

export const CONDITION_PILL_CONFIG: Record<
  string,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
  }
> = {
  furtividade: { label: 'FURTIVO', bg: 'bg-[#9333ea]', text: 'text-white', border: 'border-purple-400' },
  furtivo: { label: 'FURTIVO', bg: 'bg-[#9333ea]', text: 'text-white', border: 'border-purple-400' },
  bravura: { label: 'BRAVURA', bg: 'bg-[#dc2626]', text: 'text-white', border: 'border-red-400' },
  atordoado: { label: 'ATORDOAMENTO', bg: 'bg-[#facc15]', text: 'text-black', border: 'border-yellow-400' },
  atordoamento: { label: 'ATORDOAMENTO', bg: 'bg-[#facc15]', text: 'text-black', border: 'border-yellow-400' },
  dormindo: { label: 'SONO', bg: 'bg-[#0284c7]', text: 'text-white', border: 'border-sky-400' },
  sono: { label: 'SONO', bg: 'bg-[#0284c7]', text: 'text-white', border: 'border-sky-400' },
  ressurreicao: { label: 'RESSURREIÇÃO', bg: 'bg-[#f97316]', text: 'text-white', border: 'border-orange-400' },
  revelar: { label: 'REVELAR', bg: 'bg-[#16a34a]', text: 'text-white', border: 'border-emerald-400' },
  revelacao: { label: 'REVELAR', bg: 'bg-[#16a34a]', text: 'text-white', border: 'border-emerald-400' },
  cura: { label: 'CURA', bg: 'bg-[#a3e635]', text: 'text-black', border: 'border-lime-400' },
  enfrentar: { label: 'ENFRENTAR', bg: 'bg-[#b91c1c]', text: 'text-amber-100', border: 'border-amber-400' },
  queimadura: { label: 'QUEIMANDO', bg: 'bg-[#ea580c]', text: 'text-white', border: 'border-orange-500' },
  queimando: { label: 'QUEIMANDO', bg: 'bg-[#ea580c]', text: 'text-white', border: 'border-orange-500' },
  tenacidade: { label: 'TENACIDADE', bg: 'bg-[#0f766e]', text: 'text-emerald-100', border: 'border-emerald-400' },
  ataque_duplo: { label: 'ATQ DUPLO', bg: 'bg-[#b45309]', text: 'text-amber-100', border: 'border-amber-400' },
  roubo_de_vida: { label: 'ROUBO DE VIDA', bg: 'bg-[#831843]', text: 'text-rose-100', border: 'border-rose-400' },
  entorpecer: { label: 'TORPOR', bg: 'bg-[#581c87]', text: 'text-fuchsia-200', border: 'border-fuchsia-400' },
  torpor: { label: 'TORPOR', bg: 'bg-[#581c87]', text: 'text-fuchsia-200', border: 'border-fuchsia-400' },
  barreira: { label: 'BARREIRA', bg: 'bg-[#1e1b4b]', text: 'text-cyan-200', border: 'border-cyan-400' },
  imunidade: { label: 'IMUNIDADE', bg: 'bg-[#312e81]', text: 'text-amber-200', border: 'border-amber-300' },
  congelado: { label: 'CONGELADO', bg: 'bg-[#0369a1]', text: 'text-cyan-100', border: 'border-cyan-300' },
  congelar: { label: 'CONGELADO', bg: 'bg-[#0369a1]', text: 'text-cyan-100', border: 'border-cyan-300' },
  critico: { label: 'CRÍTICO', bg: 'bg-[#b91c1c]', text: 'text-yellow-200', border: 'border-yellow-400' },
  obliteracao: { label: 'OBLITERAÇÃO', bg: 'bg-[#3b0764]', text: 'text-rose-200', border: 'border-rose-500' },
  obliterar: { label: 'OBLITERAÇÃO', bg: 'bg-[#3b0764]', text: 'text-rose-200', border: 'border-rose-500' },
  etereo: { label: 'ETÉREO', bg: 'bg-[#4f46e5]', text: 'text-indigo-100', border: 'border-indigo-300' },
  eletrificado: { label: 'ELETRIFICADO', bg: 'bg-[#ca8a04]', text: 'text-yellow-100', border: 'border-yellow-300' },
  capturar: { label: 'CAPTURAR', bg: 'bg-[#0284c7]', text: 'text-sky-100', border: 'border-sky-300' },
  retorno: { label: 'RETORNAR', bg: 'bg-[#0ea5e9]', text: 'text-sky-50', border: 'border-sky-300' },
  retornar: { label: 'RETORNAR', bg: 'bg-[#0ea5e9]', text: 'text-sky-50', border: 'border-sky-300' },
  executar: { label: 'EXECUTAR', bg: 'bg-[#7f1d1d]', text: 'text-rose-100', border: 'border-red-400' },
  praga: { label: 'PRAGA', bg: 'bg-[#3b0764]', text: 'text-lime-300', border: 'border-fuchsia-500' },
  corrosao: { label: 'CORROSÃO', bg: 'bg-[#1a2e05]', text: 'text-lime-200', border: 'border-lime-400' },
  sangramento: { label: 'SANGRAMENTO', bg: 'bg-[#4c0519]', text: 'text-rose-200', border: 'border-rose-400' },
  hemorragia: { label: 'HEMORRAGIA', bg: 'bg-[#7f1d1d]', text: 'text-red-100', border: 'border-red-400' },
};

export const CARD_FILENAME_MAP: Record<string, string> = {
  pack_atormentador: 'm_atormentador',
  g_voto_silencio: 'g_voto_do_silencio',
  g_voto_do_silencio: 'g_voto_do_silencio',
  m_chamado_vitoria: 'm_chamado_da_vitoria',
  m_chamado_da_vitoria: 'm_chamado_da_vitoria',
  n_bloqueio: 'n_jurisdicao_de_saniel',
  n_jurisdicao_de_saniel: 'n_jurisdicao_de_saniel',
  n_escolhido_estrelas: 'n_escolhido_das_estrelas',
  n_escolhido_das_estrelas: 'n_escolhido_das_estrelas',
  n_seniel: 'n_saniel',
  n_saniel: 'n_saniel',
  n_sol: 'n_o_sol',
  o_sol: 'n_o_sol',
  g_lua: 'g_a_lua',
  a_lua: 'g_a_lua',
  krust: 'm_krust',
  feiticeiro_krust: 'm_krust',
  m_feiticeiro_krust: 'm_krust',
  caspiem: 'm_caspiem',
  mara: 'm_mara',
  pedrinha: 'n_pedrinha',
  g_pedrinha: 'n_pedrinha',
  m_pedrinha: 'n_pedrinha',
  celia: 'm_celia',
  g_celia: 'm_celia',
  n_celia: 'm_celia',
  guadan: 'g_guadan',
  aurora: 'g_aurora',
  juci: 'm_juci',
  finn: 'm_finn',
  fafnyr: 'g_fafnyr',
  bart: 'n_bart',
  xury: 'n_xury',
  labareda_solar: 'n_labareda_solar',
  n_labareda_solar: 'n_labareda_solar',
  crio_genese: 'm_crio_genese',
  m_crio_genese: 'm_crio_genese',
  desafio_real: 'g_desafio_real',
  g_desafio_real: 'g_desafio_real',
  fome_insaciavel: 'm_fome_insaciavel',
  m_fome_insaciavel: 'm_fome_insaciavel',
  sabedoria_cosmica: 'g_sabedoria_cosmica',
  g_sabedoria_cosmica: 'g_sabedoria_cosmica',
  grao_mestre: 'm_grao_mestre',
  m_grao_mestre: 'm_grao_mestre',
  voto_do_absoluto: 'n_voto_do_absoluto',
  n_voto_do_absoluto: 'n_voto_do_absoluto',
  concessao_divina: 'g_concessao_divina',
  g_concessao_divina: 'g_concessao_divina',
  veto_do_indomito: 'n_veto_do_indomito',
  n_veto_do_indomito: 'n_veto_do_indomito',
  wyr: 'n_wyr',
  n_wyr: 'n_wyr',
  kaliel: 'g_kaliel',
  g_kaliel: 'g_kaliel',
  faleziel: 'm_faleziel',
  m_faleziel: 'm_faleziel',
  nulio: 'n_nulio',
  n_nulio: 'n_nulio',
  falanx: 'm_falanx',
  m_falanx: 'm_falanx',
  vergor: 'g_vergor',
  g_vergor: 'g_vergor',
  xeno: 'm_xeno',
  m_xeno: 'm_xeno',
  centelha: 'm_centelha',
  m_centelha: 'm_centelha',
  token_centelha: 'm_centelha',
  filho_da_luz: 'g_filho_luz',
  filho_luz: 'g_filho_luz',
  g_filho_luz: 'g_filho_luz',
  g_filho_da_luz: 'g_filho_luz',
  token_filho_da_luz: 'g_filho_luz',
  encantar: 'm_encantar',
  m_encantar: 'm_encantar',
  n_encantar: 'm_encantar',
  oceanico: 'g_oceanico',
  g_oceanico: 'g_oceanico',
  destino_fatal: 'm_destino_fatal',
  m_destino_fatal: 'm_destino_fatal',
  targor: 'g_targor',
  g_targor: 'g_targor',
  m_targor: 'g_targor',
  n_targor: 'g_targor',
  atlaziel: 'm_atlaziel',
  m_atlaziel: 'm_atlaziel',
  g_atlaziel: 'm_atlaziel',
  n_atlaziel: 'm_atlaziel',
  barelio: 'n_barelio',
  n_barelio: 'n_barelio',
  g_barelio: 'n_barelio',
  m_barelio: 'n_barelio',
  gangnyr: 'g_gangnyr',
  g_gangnyr: 'g_gangnyr',
  m_gangnyr: 'g_gangnyr',
  n_gangnyr: 'g_gangnyr',
  hamelia: 'm_hamelia',
  m_hamelia: 'm_hamelia',
  g_hamelia: 'm_hamelia',
  n_hamelia: 'm_hamelia',
};

export const CARD_ART_ALIASES: Record<string, string[]> = {
  pack_atormentador: ['/cards/m_atormentador.jpg'],
  g_targor: ['/cards/g_targor.jpg', '/cards/targor.jpg', '/cards/m_targor.jpg', '/cards/n_targor.jpg'],
  m_atlaziel: ['/cards/m_atlaziel.jpg', '/cards/atlaziel.jpg', '/cards/g_atlaziel.jpg', '/cards/n_atlaziel.jpg'],
  n_barelio: ['/cards/n_barelio.jpg', '/cards/barelio.jpg', '/cards/g_barelio.jpg', '/cards/m_barelio.jpg'],
  g_gangnyr: ['/cards/g_gangnyr.jpg', '/cards/gangnyr.jpg', '/cards/m_gangnyr.jpg', '/cards/n_gangnyr.jpg'],
  m_hamelia: ['/cards/m_hamelia.jpg', '/cards/hamelia.jpg', '/cards/g_hamelia.jpg', '/cards/n_hamelia.jpg'],
  m_faleziel: ['/cards/m_faleziel.jpg', '/cards/faleziel.jpg', '/cards/g_faleziel.jpg', '/cards/n_faleziel.jpg', '/cards/token_faleziel.jpg'],
  g_kaliel: ['/cards/g_kaliel.jpg', '/cards/kaliel.jpg'],
  g_kaliel_lvl2: ['/cards/g_kaliel_lvl2.jpg', '/cards/kaliel_lvl2.jpg', '/cards/g_kaliel_nvl2.jpg', '/cards/g_kaliel.jpg'],
  n_nulio: ['/cards/n_nulio.jpg', '/cards/nulio.jpg', '/cards/g_nulio.jpg', '/cards/m_nulio.jpg'],
  m_falanx: ['/cards/m_falanx.jpg', '/cards/falanx.jpg', '/cards/g_falanx.jpg', '/cards/n_falanx.jpg'],
  g_vergor: ['/cards/g_vergor.jpg', '/cards/vergor.jpg', '/cards/m_vergor.jpg', '/cards/n_vergor.jpg'],
  m_xeno: ['/cards/m_xeno.jpg', '/cards/xeno.jpg', '/cards/g_xeno.jpg', '/cards/n_xeno.jpg'],
  token_centelha: ['/cards/token_centelha.jpg', '/cards/m_centelha.jpg', '/cards/g_centelha.jpg', '/cards/n_centelha.jpg', '/cards/centelha.jpg'],
  token_filho_da_luz: ['/cards/token_filho_da_luz.jpg', '/cards/g_filho_luz.jpg', '/cards/g_filho_da_luz.jpg', '/cards/filho_da_luz.jpg', '/cards/filho_luz.jpg', '/cards/token_filho_luz.jpg'],
  n_encantar: ['/cards/n_encantar.jpg', '/cards/m_encantar.jpg', '/cards/g_encantar.jpg', '/cards/encantar.jpg'],
  g_oceanico: ['/cards/g_oceanico.jpg', '/cards/oceanico.jpg', '/cards/m_oceanico.jpg', '/cards/n_oceanico.jpg'],
  m_destino_fatal: ['/cards/m_destino_fatal.jpg', '/cards/destino_fatal.jpg', '/cards/g_destino_fatal.jpg', '/cards/n_destino_fatal.jpg'],
  g_enganar: ['/cards/g_enganar.jpg'],
  g_voto_silencio: ['/cards/g_voto_do_silencio.jpg', '/cards/g_voto_silencio.jpg'],
  g_voto_do_silencio: ['/cards/g_voto_do_silencio.jpg', '/cards/g_voto_silencio.jpg'],
  g_soberania: ['/cards/g_soberania.jpg'],
  m_moral: ['/cards/m_moral.jpg'],
  m_voto_caidos: ['/cards/m_voto_caidos.jpg', '/cards/m_voto_dos_caidos.jpg'],
  m_chamado_da_vitoria: ['/cards/m_chamado_da_vitoria.jpg', '/cards/m_chamado_vitoria.jpg'],
  m_chamado_vitoria: ['/cards/m_chamado_da_vitoria.jpg', '/cards/m_chamado_vitoria.jpg'],
  n_bloqueio: ['/cards/n_jurisdicao_de_saniel.jpg', '/cards/habilidade_jurisdicao_de_saniel.jpg'],
  n_jurisdicao_de_saniel: ['/cards/n_jurisdicao_de_saniel.jpg'],
  n_escolhido_estrelas: ['/cards/n_escolhido_das_estrelas.jpg', '/cards/n_escolhido_estrelas.jpg'],
  n_escolhido_das_estrelas: ['/cards/n_escolhido_das_estrelas.jpg', '/cards/n_escolhido_estrelas.jpg'],
  n_voto_estrelas: ['/cards/n_voto_estrelas.jpg', '/cards/n_voto_das_estrelas.jpg'],
  m_letargia_lunar: ['/cards/m_letargia_lunar.jpg'],
  token_fagulha_estelar: ['/cards/token_fagulha_estelar.jpg', '/cards/g_karyen.jpg'],
  token_flecha_eletrica: ['/cards/token_flecha_eletrica.jpg', '/cards/m_gough.jpg'],
  g_rochedo: ['/cards/g_rochedo.jpg', '/cards/token_rochedo_craff.jpg', '/cards/g_craff.jpg'],
  g_lunario_lvl2: ['/cards/g_lunario_lvl2.jpg', '/cards/g_lunario.jpg'],
  n_seniel: ['/cards/n_saniel.jpg'],
  n_seniel_lvl2: ['/cards/n_saniel_lvl2.jpg', '/cards/n_saniel.jpg'],
  g_salazar: ['/cards/g_salazar.jpg', '/cards/salazar.jpg'],
  n_o_sol: ['/cards/n_o_sol.jpg', '/cards/n_sol.jpg', '/cards/o_sol.jpg'],
  n_o_sol_lvl2: ['/cards/n_o_sol_lvl2.jpg', '/cards/n_sol_lvl2.jpg', '/cards/o_sol_lvl2.jpg', '/cards/n_o_sol.jpg', '/cards/n_sol.jpg', '/cards/o_sol.jpg'],
  g_a_lua: ['/cards/g_a_lua.jpg', '/cards/g_lua.jpg', '/cards/a_lua.jpg'],
  g_a_lua_lvl2: ['/cards/g_a_lua_lvl2.jpg', '/cards/g_lua_lvl2.jpg', '/cards/a_lua_lvl2.jpg', '/cards/g_a_lua.jpg', '/cards/g_lua.jpg', '/cards/a_lua.jpg'],
  n_pedrinha: ['/cards/n_pedrinha.jpg', '/cards/g_pedrinha.jpg', '/cards/m_pedrinha.jpg', '/cards/pedrinha.jpg'],
  m_celia: ['/cards/m_celia.jpg', '/cards/g_celia.jpg', '/cards/n_celia.jpg', '/cards/celia.jpg'],
  g_guadan: ['/cards/g_guadan.jpg', '/cards/guadan.jpg'],
  g_aurora: ['/cards/g_aurora.jpg', '/cards/aurora.jpg'],
  m_juci: ['/cards/m_juci.jpg', '/cards/juci.jpg'],
  m_finn: ['/cards/m_finn.jpg', '/cards/finn.jpg'],
  g_fafnyr: ['/cards/g_fafnyr.jpg', '/cards/fafnyr.jpg'],
  n_bart: ['/cards/n_bart.jpg', '/cards/bart.jpg'],
  n_xury: ['/cards/n_xury.jpg', '/cards/m_xury.jpg', '/cards/xury.jpg'],
  n_labareda_solar: ['/cards/n_labareda_solar.jpg', '/cards/labareda_solar.jpg', '/cards/g_labareda_solar.jpg', '/cards/m_labareda_solar.jpg'],
  m_crio_genese: ['/cards/m_crio_genese.jpg', '/cards/crio_genese.jpg', '/cards/g_crio_genese.jpg', '/cards/n_crio_genese.jpg'],
  g_desafio_real: ['/cards/g_desafio_real.jpg', '/cards/desafio_real.jpg', '/cards/m_desafio_real.jpg', '/cards/n_desafio_real.jpg'],
  m_fome_insaciavel: ['/cards/m_fome_insaciavel.jpg', '/cards/fome_insaciavel.jpg', '/cards/g_fome_insaciavel.jpg', '/cards/n_fome_insaciavel.jpg'],
  g_sabedoria_cosmica: ['/cards/g_sabedoria_cosmica.jpg', '/cards/sabedoria_cosmica.jpg', '/cards/m_sabedoria_cosmica.jpg', '/cards/n_sabedoria_cosmica.jpg'],
  m_grao_mestre: ['/cards/m_grao_mestre.jpg', '/cards/grao_mestre.jpg', '/cards/g_grao_mestre.jpg', '/cards/n_grao_mestre.jpg'],
  n_voto_do_absoluto: ['/cards/n_voto_do_absoluto.jpg', '/cards/voto_do_absoluto.jpg', '/cards/g_voto_do_absoluto.jpg', '/cards/m_voto_do_absoluto.jpg'],
  g_concessao_divina: ['/cards/g_concessao_divina.jpg', '/cards/concessao_divina.jpg', '/cards/m_concessao_divina.jpg', '/cards/n_concessao_divina.jpg'],
  n_veto_do_indomito: ['/cards/n_veto_do_indomito.jpg', '/cards/veto_do_indomito.jpg', '/cards/g_veto_do_indomito.jpg', '/cards/m_veto_do_indomito.jpg'],
  n_wyr: ['/cards/n_wyr.jpg', '/cards/wyr.jpg'],
};

export const ART_CACHE_BUST = 'v=20261115_2';

export interface ResolveCardArtOptions {
  isLvl2?: boolean;
  isRevealedFaleziel?: boolean;
  isPack?: boolean;
  name?: string;
}

export function getCardArtPrimaryId(templateId: string, options?: ResolveCardArtOptions): { baseId: string; primaryId: string } {
  const isPack = options?.isPack || templateId === 'pack_atormentador';
  const mappedBase = isPack
    ? 'm_atormentador'
    : options?.isRevealedFaleziel
    ? 'm_faleziel'
    : CARD_FILENAME_MAP[templateId] || templateId;
  const primaryId = options?.isLvl2 ? `${mappedBase}_lvl2` : mappedBase;
  return { baseId: mappedBase, primaryId };
}

export function getCardArtCandidates(templateId: string, options?: ResolveCardArtOptions): string[] {
  const { baseId, primaryId } = getCardArtPrimaryId(templateId, options);
  const candidates: string[] = [];
  const seen = new Set<string>();

  const pushPath = (rawPath: string) => {
    const clean = rawPath.split('?')[0];
    if (!seen.has(clean)) {
      seen.add(clean);
      candidates.push(clean.startsWith('/cards/') ? `${clean}?${ART_CACHE_BUST}` : clean);
    }
  };

  pushPath(`/cards/${primaryId}.jpg`);

  const primaryAliasGroups = options?.isLvl2
    ? [CARD_ART_ALIASES[primaryId], CARD_ART_ALIASES[`${templateId}_lvl2`]]
    : [CARD_ART_ALIASES[primaryId], CARD_ART_ALIASES[templateId], CARD_ART_ALIASES[baseId]];

  for (const group of primaryAliasGroups) {
    if (!group) continue;
    for (const aliasPath of group) {
      pushPath(aliasPath);
    }
  }

  pushPath(`/cards/${primaryId}.png`);
  pushPath(`/cards/${primaryId}.jpeg`);
  pushPath(`/cards/${primaryId}.webp`);

  for (const group of primaryAliasGroups) {
    if (!group) continue;
    for (const aliasPath of group) {
      if (aliasPath.endsWith('.jpg')) {
        pushPath(aliasPath.replace(/\.jpg$/, '.png'));
      }
    }
  }

  if (options?.isLvl2) {
    pushPath(`/cards/${baseId}.jpg`);
    pushPath(`/cards/${baseId}.png`);
    for (const group of [CARD_ART_ALIASES[baseId], CARD_ART_ALIASES[templateId]]) {
      if (!group) continue;
      for (const aliasPath of group) {
        pushPath(aliasPath);
      }
    }
  }

  if (templateId === 'g_corcel' || options?.name?.toLowerCase() === 'o corcel') {
    pushPath('/assets/aistudio/image_b16678b7.png');
  }

  return candidates;
}

export function advanceCardArtFallback(img: HTMLImageElement, candidates: string[]): boolean {
  const nextIdx = Number(img.dataset.artFallbackIdx || '0') + 1;
  if (nextIdx < candidates.length) {
    img.dataset.artFallbackIdx = String(nextIdx);
    img.src = candidates[nextIdx];
    return true;
  }
  return false;
}

export function resolveCardArtUrl(templateId: string, isLvl2 = false): string {
  const { primaryId } = getCardArtPrimaryId(templateId, { isLvl2 });
  return `/cards/${primaryId}.jpg?${ART_CACHE_BUST}`;
}

export interface ThematicCardArt {
  icon: string;
  secondaryRune: string;
  backdropClass: string;
  ringColor: string;
  glowColor: string;
  tagLabel: string;
}

export const THEMATIC_CARD_ART: Record<string, ThematicCardArt> = {
  g_ambroz: {
    icon: '⚔️',
    secondaryRune: '⚜️',
    backdropClass: 'from-amber-900/95 via-yellow-950/90 to-stone-950',
    ringColor: 'border-amber-300/70',
    glowColor: 'rgba(251, 191, 36, 0.55)',
    tagLabel: 'Arauto Solar',
  },
  m_bia: {
    icon: '🧚',
    secondaryRune: '🪄',
    backdropClass: 'from-amber-900/85 via-purple-950/90 to-slate-950',
    ringColor: 'border-amber-300/70',
    glowColor: 'rgba(245, 158, 11, 0.5)',
    tagLabel: 'Fada Celeste',
  },
  n_mavie: {
    icon: '🪽',
    secondaryRune: '🩸',
    backdropClass: 'from-amber-900/90 via-rose-950/85 to-zinc-950',
    ringColor: 'border-amber-300/75',
    glowColor: 'rgba(244, 63, 94, 0.45)',
    tagLabel: 'Ceifadora Divina',
  },
  g_lucent: {
    icon: '☀️',
    secondaryRune: '🔥',
    backdropClass: 'from-yellow-900/90 via-orange-950/90 to-stone-950',
    ringColor: 'border-amber-300/80',
    glowColor: 'rgba(249, 115, 22, 0.55)',
    tagLabel: 'Chama Sagrada',
  },
  n_kamui: {
    icon: '👑',
    secondaryRune: '🕊️',
    backdropClass: 'from-amber-800/90 via-emerald-950/85 to-slate-950',
    ringColor: 'border-amber-200/80',
    glowColor: 'rgba(251, 191, 36, 0.6)',
    tagLabel: 'Regente Divino',
  },
  n_apoteose: {
    icon: '⚜️',
    secondaryRune: '🌟',
    backdropClass: 'from-amber-700/85 via-yellow-900/85 to-stone-950',
    ringColor: 'border-amber-300/80',
    glowColor: 'rgba(251, 191, 36, 0.65)',
    tagLabel: 'Ascensão Divina',
  },
  g_subjugar: {
    icon: '⛓️',
    secondaryRune: '🫱',
    backdropClass: 'from-sky-900/90 via-amber-950/85 to-stone-950',
    ringColor: 'border-sky-300/75',
    glowColor: 'rgba(56, 189, 248, 0.55)',
    tagLabel: 'Domínio Tático',
  },
  m_reencarnacao: {
    icon: '🕊️',
    secondaryRune: '✨',
    backdropClass: 'from-sky-800/90 via-indigo-950/90 to-slate-950',
    ringColor: 'border-sky-300/80',
    glowColor: 'rgba(56, 189, 248, 0.6)',
    tagLabel: 'Chamado da Cripta',
  },
  g_toque_igneo: {
    icon: '🔥',
    secondaryRune: '🖐️',
    backdropClass: 'from-orange-900/90 via-red-950/90 to-stone-950',
    ringColor: 'border-orange-400/75',
    glowColor: 'rgba(249, 115, 22, 0.6)',
    tagLabel: 'Essência de Fogo',
  },
  n_forca_natureza: {
    icon: '🌿',
    secondaryRune: '⛰️',
    backdropClass: 'from-emerald-900/90 via-green-950/90 to-zinc-950',
    ringColor: 'border-emerald-400/75',
    glowColor: 'rgba(16, 185, 129, 0.55)',
    tagLabel: 'Essência Telúrica',
  },
  m_estatico: {
    icon: '⚡',
    secondaryRune: '🌩️',
    backdropClass: 'from-yellow-900/90 via-indigo-950/90 to-slate-950',
    ringColor: 'border-yellow-400/75',
    glowColor: 'rgba(250, 204, 21, 0.6)',
    tagLabel: 'Essência Elétrica',
  },
  m_nevasca: {
    icon: '❄️',
    secondaryRune: '🌨️',
    backdropClass: 'from-cyan-900/90 via-sky-950/90 to-slate-950',
    ringColor: 'border-cyan-300/80',
    glowColor: 'rgba(34, 211, 238, 0.6)',
    tagLabel: 'Essência Glacial',
  },
  n_nulio: {
    icon: '🕯️',
    secondaryRune: '💚',
    backdropClass: 'from-amber-800/90 via-emerald-950/85 to-stone-950',
    ringColor: 'border-amber-300/80',
    glowColor: 'rgba(163, 230, 53, 0.5)',
    tagLabel: 'Acólito da Luz',
  },
  m_falanx: {
    icon: '🛡️',
    secondaryRune: '🌀',
    backdropClass: 'from-amber-900/90 via-purple-950/85 to-stone-950',
    ringColor: 'border-amber-300/80',
    glowColor: 'rgba(245, 158, 11, 0.55)',
    tagLabel: 'Baluarte Luminoso',
  },
  g_vergor: {
    icon: '🪞',
    secondaryRune: '⚜️',
    backdropClass: 'from-amber-700/85 via-slate-900/90 to-stone-950',
    ringColor: 'border-amber-200/85',
    glowColor: 'rgba(251, 191, 36, 0.6)',
    tagLabel: 'Metamorfo Divino',
  },
  m_xeno: {
    icon: '⚡',
    secondaryRune: '☀️',
    backdropClass: 'from-yellow-800/90 via-amber-950/90 to-stone-950',
    ringColor: 'border-yellow-300/85',
    glowColor: 'rgba(253, 224, 71, 0.65)',
    tagLabel: 'Inquisidor Solar',
  },
  token_centelha: {
    icon: '🌠',
    secondaryRune: '🌀',
    backdropClass: 'from-yellow-700/90 via-amber-950/90 to-stone-950',
    ringColor: 'border-yellow-200/90',
    glowColor: 'rgba(254, 240, 138, 0.75)',
    tagLabel: 'Feixe Divino',
  },
  g_kaliel: {
    icon: '🪽',
    secondaryRune: '👑',
    backdropClass: 'from-amber-600/90 via-yellow-950/90 to-stone-950',
    ringColor: 'border-yellow-200/90',
    glowColor: 'rgba(251, 191, 36, 0.78)',
    tagLabel: 'Arcanjo Soberano',
  },
  token_filho_da_luz: {
    icon: '🕊️',
    secondaryRune: '✨',
    backdropClass: 'from-yellow-700/90 via-amber-900/85 to-stone-950',
    ringColor: 'border-amber-200/90',
    glowColor: 'rgba(253, 224, 71, 0.72)',
    tagLabel: 'Graça Divina',
  },
  m_faleziel: {
    icon: '🪽',
    secondaryRune: '⚔️',
    backdropClass: 'from-amber-500/90 via-yellow-900/90 to-stone-950',
    ringColor: 'border-yellow-200/95',
    glowColor: 'rgba(253, 224, 71, 0.85)',
    tagLabel: 'Faleziel · Arcanjo',
  },
  n_encantar: {
    icon: '✨',
    secondaryRune: '🔮',
    backdropClass: 'from-purple-800/90 via-fuchsia-950/90 to-slate-950',
    ringColor: 'border-purple-300/80',
    glowColor: 'rgba(192, 132, 252, 0.65)',
    tagLabel: 'Essência Mágica',
  },
  g_oceanico: {
    icon: '🌊',
    secondaryRune: '💧',
    backdropClass: 'from-sky-800/90 via-cyan-950/90 to-slate-950',
    ringColor: 'border-sky-300/80',
    glowColor: 'rgba(56, 189, 248, 0.65)',
    tagLabel: 'Essência Oceânica',
  },
  m_destino_fatal: {
    icon: '💀',
    secondaryRune: '⚔️',
    backdropClass: 'from-red-900/95 via-rose-950/90 to-black',
    ringColor: 'border-red-400/85',
    glowColor: 'rgba(239, 68, 68, 0.72)',
    tagLabel: 'Sentença Letal',
  },
  g_targor: {
    icon: '🐉',
    secondaryRune: '☠️',
    backdropClass: 'from-purple-950/95 via-emerald-950/85 to-black',
    ringColor: 'border-fuchsia-400/80',
    glowColor: 'rgba(168, 85, 247, 0.68)',
    tagLabel: 'Dragão da Praga',
  },
  m_atlaziel: {
    icon: '🪽',
    secondaryRune: '💀',
    backdropClass: 'from-fuchsia-950/95 via-purple-950/90 to-black',
    ringColor: 'border-fuchsia-400/85',
    glowColor: 'rgba(192, 38, 211, 0.75)',
    tagLabel: 'Arcanjo Caído',
  },
  n_barelio: {
    icon: '⛓️',
    secondaryRune: '🌑',
    backdropClass: 'from-violet-950/95 via-slate-950/95 to-black',
    ringColor: 'border-purple-400/85',
    glowColor: 'rgba(139, 92, 246, 0.75)',
    tagLabel: 'O Carcereiro',
  },
  g_gangnyr: {
    icon: '🩸',
    secondaryRune: '🗡️',
    backdropClass: 'from-rose-950/95 via-purple-950/90 to-black',
    ringColor: 'border-rose-400/85',
    glowColor: 'rgba(225, 29, 72, 0.75)',
    tagLabel: 'Ceifador Carmesim',
  },
  m_hamelia: {
    icon: '🧚',
    secondaryRune: '🧪',
    backdropClass: 'from-lime-950/95 via-purple-950/90 to-black',
    ringColor: 'border-lime-400/85',
    glowColor: 'rgba(132, 204, 22, 0.72)',
    tagLabel: 'Fada Pútrida',
  },
};

export function getThematicCardArt(templateId: string, element: ElementType, isSkill = false): ThematicCardArt {
  if (THEMATIC_CARD_ART[templateId]) return THEMATIC_CARD_ART[templateId];
  const cfg = ELEMENT_CONFIG[element] || ELEMENT_CONFIG.Neutro;
  if (element === 'Divino') {
    return {
      icon: '⚜️',
      secondaryRune: '✨',
      backdropClass: 'from-amber-900/90 via-yellow-950/85 to-stone-950',
      ringColor: 'border-amber-300/75',
      glowColor: cfg.glow,
      tagLabel: isSkill ? 'Habilidade Divina' : 'Unidade Divina',
    };
  }
  if (element === 'Sombrio') {
    return {
      icon: '🌑',
      secondaryRune: '☠️',
      backdropClass: 'from-violet-950/95 via-purple-950/90 to-black',
      ringColor: 'border-fuchsia-400/80',
      glowColor: cfg.glow,
      tagLabel: isSkill ? 'Habilidade Sombria' : 'Unidade Sombria',
    };
  }
  return {
    icon: isSkill ? '📜' : cfg.icon || '🧭',
    secondaryRune: cfg.icon || '✨',
    backdropClass: 'from-slate-800/95 via-slate-900/95 to-black',
    ringColor: cfg.border,
    glowColor: cfg.glow,
    tagLabel: isSkill ? 'Habilidade' : cfg.name,
  };
}


