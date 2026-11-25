import { CardInstance, ConditionEffect, ConditionOriginKind, ConditionSourceInfo } from '../types/game';

export type ConditionCategory = 'protecao' | 'negativo' | 'combate' | 'situacional';

export type ConditionSourceType =
  | 'passivo_especial' // Dourada reluzente (Aliança Angiris, Irmãos)
  | 'passivo'          // Azul escuro (efeito passivo nativo / parte do efeito único da própria carta)
  | 'benefico'         // Verde escuro (efeito benéfico advindo de habilidades ou compartilhado por outras cartas)
  | 'combate'          // Laranja (efeito de combate recebido de cartas de habilidade ou de outras unidades)
  | 'negativo';        // Vermelho (todo efeito negativo recebido)

export interface ConditionConfig {
  key: ConditionEffect | 'silencio' | 'alianca_angiris' | 'irmaos' | 'corte_das_fadas';
  name: string;
  category: ConditionCategory;
  categoryName: string;
  categoryColor: string; // Text/Badge color
  categoryBg: string;
  categoryBorder: string;
  icon: string;
  shortDesc: string;
  fullDesc: string;
  visualDesc: string;
  defaultDuration?: string;
}

export const CONDITION_CATEGORIES: Record<
  ConditionCategory,
  { name: string; colorName: string; textClass: string; borderClass: string; bgClass: string; hex: string }
> = {
  protecao: {
    name: 'Proteção',
    colorName: 'Verde Lima',
    textClass: 'text-lime-400',
    borderClass: 'border-lime-500',
    bgClass: 'bg-lime-950/40',
    hex: '#84cc16',
  },
  negativo: {
    name: 'Negativos',
    colorName: 'Vermelho',
    textClass: 'text-red-400',
    borderClass: 'border-red-500',
    bgClass: 'bg-red-950/40',
    hex: '#ef4444',
  },
  combate: {
    name: 'Combate',
    colorName: 'Laranja',
    textClass: 'text-orange-400',
    borderClass: 'border-orange-500',
    bgClass: 'bg-orange-950/40',
    hex: '#f97316',
  },
  situacional: {
    name: 'Situacionais',
    colorName: 'Azul Claro',
    textClass: 'text-sky-300',
    borderClass: 'border-sky-400',
    bgClass: 'bg-sky-950/40',
    hex: '#38bdf8',
  },
};

export const CONDITIONS_REGISTRY: Record<string, ConditionConfig> = {
  // PASSIVAS ESPECIAIS (Dourada Reluzente)
  alianca_angiris: {
    key: 'alianca_angiris',
    name: 'Aliança Angiris',
    category: 'protecao',
    categoryName: 'Passiva Especial',
    categoryColor: 'text-amber-300',
    categoryBg: 'bg-amber-950/60',
    categoryBorder: 'border-amber-400/80',
    icon: '👼',
    shortDesc: '2+ Arcanjos na mesa: +50% dano causado e -50% dano recebido.',
    fullDesc:
      'Passiva — Aliança Angiris: Quando 2 ou mais Arcanjos estiverem na mesa simultaneamente, recebem +50% de dano causado e -50% de dano recebido (com Tenacidade -35% mitiga 67,5%). Se houver pelo menos 1 Arcanjo de cada Tier (Tiers 1 a 5) na mesa ao mesmo tempo, o jogador vence a partida imediatamente!',
    visualDesc: 'Aura celestial dourada de arcanjo resplandecendo sobre a unidade.',
  },
  irmaos: {
    key: 'irmaos',
    name: 'Irmãos',
    category: 'protecao',
    categoryName: 'Passiva Especial',
    categoryColor: 'text-amber-300',
    categoryBg: 'bg-amber-950/60',
    categoryBorder: 'border-amber-400/80',
    icon: '👥',
    shortDesc: 'Enquanto Inariel estiver na mesa, Zael não sairá da luta.',
    fullDesc:
      'Passiva — Irmãos: Elo fraterno inquebrável entre Zael, o Arcanjo e Inariel, o Arcanjo. Enquanto Inariel estiver em campo, Zael não se exilará ao final da rodada, permanecendo na batalha ao lado de seu irmão.',
    visualDesc: 'Símbolo dourado reluzente de elo fraterno entre os arcanjos irmãos.',
  },
  corte_das_fadas: {
    key: 'corte_das_fadas',
    name: 'Corte das Fadas',
    category: 'protecao',
    categoryName: 'Passiva Especial',
    categoryColor: 'text-pink-300',
    categoryBg: 'bg-pink-950/60',
    categoryBorder: 'border-pink-400/80',
    icon: '🧚',
    shortDesc: '3+ Fadas na mesa: salva o jogador da morte 1x (+2 Vida rosa e +75% Poder às Fadas).',
    fullDesc:
      'Passiva — Corte das Fadas: Ativa-se quando houver 3 ou mais unidades Fadas invocadas na mesa aliada. Quando ativa, salva o jogador da morte uma única vez: ao chegar a 0 de vida, o jogador recebe 2 pontos extras de vida (na cor rosa) e todas as unidades Fadas na mesa recebem +75% de PODER!',
    visualDesc: 'Círculo feérico cintilante com pólen rosa-dourado e asas luminosas.',
  },

  // 1. PROTEÇÃO (Verde Lima)
  cura: {
    key: 'cura',
    name: 'Cura',
    category: 'protecao',
    categoryName: 'Proteção',
    categoryColor: 'text-lime-400',
    categoryBg: 'bg-lime-950/50',
    categoryBorder: 'border-lime-500/70',
    icon: '💚',
    shortDesc: 'Regenera +9 de Vida a cada rodada.',
    fullDesc:
      'Regenera 9 de Vida a cada rodada que o efeito estiver ativo. Se a unidade atingir seu valor de Vida Máxima, o excesso é absorvido.',
    visualDesc: 'Faixas de luz verde esmeralda descem sobre a carta e a banham ("molham").',
    defaultDuration: '2 rodadas ou enquanto mantido',
  },
  tenacidade: {
    key: 'tenacidade',
    name: 'Tenacidade',
    category: 'protecao',
    categoryName: 'Proteção',
    categoryColor: 'text-lime-400',
    categoryBg: 'bg-lime-950/50',
    categoryBorder: 'border-lime-500/70',
    icon: '🛡️',
    shortDesc: 'Reduz todo o dano sofrido em 35%.',
    fullDesc:
      'Reduz todo o dano sofrido em 35%.',
    visualDesc: 'Um escudo rúnico reluzente se ergue e ancora na base da carta.',
  },
  barreira: {
    key: 'barreira',
    name: 'Barreira',
    category: 'protecao',
    categoryName: 'Proteção',
    categoryColor: 'text-lime-400',
    categoryBg: 'bg-lime-950/50',
    categoryBorder: 'border-lime-500/70',
    icon: '🌐',
    shortDesc: 'Bloqueia completamente qualquer dano 1 vez.',
    fullDesc:
      'Bloqueia completamente qualquer forma de dano 1 vez (ataques normais, habilidades ou feitiços). Unidades com Ataque-Duplo quebram a Barreira no 1º golpe e causam dano com o 2º golpe.',
    visualDesc: 'Cúpula celestial cintilante. Na carta Aurora, a barreira manifesta cristais e fragmentos de Gelo.',
  },
  imunidade: {
    key: 'imunidade',
    name: 'Imunidade',
    category: 'protecao',
    categoryName: 'Proteção',
    categoryColor: 'text-lime-400',
    categoryBg: 'bg-lime-950/50',
    categoryBorder: 'border-lime-500/70',
    icon: '🌟',
    shortDesc: 'Imune a todos os 7 efeitos negativos.',
    fullDesc:
      'Torna a unidade totalmente IMUNE a todos os efeitos NEGATIVOS (Queimadura, Sono, Congelar, Eletrificado, Torpor, Atordoamento e Silêncio). Bloqueia a anulação da Jurisdição de Saniel.',
    visualDesc: 'Aura cósmica dourada giratória de Sabedoria Cósmica envolvendo a moldura.',
  },
  ressurreicao: {
    key: 'ressurreicao',
    name: 'Ressurreição',
    category: 'protecao',
    categoryName: 'Proteção',
    categoryColor: 'text-lime-400',
    categoryBg: 'bg-lime-950/50',
    categoryBorder: 'border-lime-500/70',
    icon: '🕊️',
    shortDesc: 'Retorna totalmente restaurada da morte uma vez.',
    fullDesc:
      'A unidade retorna totalmente restaurada da morte, uma vez. Restaura Vida Máxima, Defesa e atributos originais.',
    visualDesc: 'Feixes de luz divina dourada e asas de fênix revitalizando a carta.',
  },

  // 2. NEGATIVOS (Vermelho)
  queimadura: {
    key: 'queimadura',
    name: 'Queimadura',
    category: 'negativo',
    categoryName: 'Negativos',
    categoryColor: 'text-red-400',
    categoryBg: 'bg-red-950/50',
    categoryBorder: 'border-red-500/70',
    icon: '🔥',
    shortDesc: 'Causa 4 de dano direto na vida por rodada.',
    fullDesc:
      'Causa 4 de dano diretamente na vida da unidade por rodada que o efeito estiver ativo. Dispara uma animação de fogo ativa a cada passagem de rodada.',
    visualDesc: 'Erupção ardente de chamas consumindo o centro da carta a cada rodada.',
    defaultDuration: '2 rodadas',
  },
  dormindo: {
    key: 'dormindo',
    name: 'Sono',
    category: 'negativo',
    categoryName: 'Negativos',
    categoryColor: 'text-red-400',
    categoryBg: 'bg-red-950/50',
    categoryBorder: 'border-red-500/70',
    icon: '💤',
    shortDesc: 'Imóvel; eliminada ao acordar se Vida <= 11.',
    fullDesc:
      'A unidade se torna IMÓVEL (não pode atacar, nem defender e não aplica dano de rebote). Ao despertar, se tiver 11 ou menos de vida, é eliminada instantaneamente. Dura a quantidade de rodadas conforme quem aplicou o efeito.',
    visualDesc: 'Névoa lunar escura e luas crescentes hipnóticas ao redor da carta.',
  },
  congelado: {
    key: 'congelado',
    name: 'Congelar',
    category: 'negativo',
    categoryName: 'Negativos',
    categoryColor: 'text-red-400',
    categoryBg: 'bg-red-950/50',
    categoryBorder: 'border-red-500/70',
    icon: '❄️',
    shortDesc: 'Aumenta todo dano recebido em +50%.',
    fullDesc:
      'Aumenta o dano (todos os tipos: físico, mágico, elemental e rebote) recebido pela unidade em +50%.',
    visualDesc: 'Congelamento profundo com placas de gelo e cristais pontiagudos congelando a carta.',
  },
  eletrificado: {
    key: 'eletrificado',
    name: 'Eletrificado',
    category: 'negativo',
    categoryName: 'Negativos',
    categoryColor: 'text-red-400',
    categoryBg: 'bg-red-950/50',
    categoryBorder: 'border-red-500/70',
    icon: '⚡',
    shortDesc: 'Aumenta dano elétrico recebido em +20%.',
    fullDesc:
      'Aumenta o dano ELÉTRICO recebido pela unidade em +20%.',
    visualDesc: 'Arcos e faíscas elétricas de alta voltagem estalando e emanando das bordas.',
    defaultDuration: '1 rodada',
  },
  entorpecer: {
    key: 'entorpecer',
    name: 'Torpor',
    category: 'negativo',
    categoryName: 'Negativos',
    categoryColor: 'text-red-400',
    categoryBg: 'bg-red-950/50',
    categoryBorder: 'border-red-500/70',
    icon: '🌀',
    shortDesc: '35% de chance de atacar um aliado por engano.',
    fullDesc:
      'A unidade tem 35% de chance de atacar uma unidade aliada por engano (seleciona uma unidade aliada aleatória em campo). Dispara um clarão ofuscante ao ocorrer.',
    visualDesc: 'Brilhos e flashes cegantes intermitentes, explodindo em luz branca quando ataca o aliado.',
    defaultDuration: '2 rodadas',
  },
  atordoado: {
    key: 'atordoado',
    name: 'Atordoamento',
    category: 'negativo',
    categoryName: 'Negativos',
    categoryColor: 'text-red-400',
    categoryBg: 'bg-red-950/50',
    categoryBorder: 'border-red-500/70',
    icon: '💫',
    shortDesc: 'Fica IMÓVEL enquanto o efeito estiver ativo.',
    fullDesc:
      'A unidade fica IMÓVEL enquanto o efeito estiver ativo, incapaz de declarar ataques ou realizar ações de combate.',
    visualDesc: 'Estrelas verticais cadentes e feixes sombrios desorientadores (Voto dos Caídos).',
  },
  silencio: {
    key: 'silencio',
    name: 'Silêncio',
    category: 'negativo',
    categoryName: 'Negativos',
    categoryColor: 'text-red-400',
    categoryBg: 'bg-red-950/50',
    categoryBorder: 'border-red-500/70',
    icon: '🔇',
    shortDesc: 'Bloqueia passivas, únicos e subida de nível.',
    fullDesc:
      'Bloqueia todos os EFEITOS ÚNICOS, PASSIVAS e REQUISITOS PARA SUBIR DE NÍVEL da unidade silenciada. Cartas silenciadas NÃO podem subir de nível, mesmo com a carta "Escolhido das Estrelas", devendo esperar o silêncio encerrar.',
    visualDesc: 'Correntes de contenção dourada e selos místicos da Jurisdição de Saniel.',
  },
  executar: {
    key: 'executar',
    name: 'Executar',
    category: 'negativo',
    categoryName: 'Negativos',
    categoryColor: 'text-red-400',
    categoryBg: 'bg-red-950/50',
    categoryBorder: 'border-red-500/70',
    icon: '💀',
    shortDesc: 'Elimina instantaneamente; efeitos de morte e Ressurreição ocorrem.',
    fullDesc:
      'Elimina a unidade instantaneamente ignorando Vida e Defesa (respeitando Imunidade). Diferente de OBLITERAR, efeitos de Ressurreição ou habilidades engatilhadas pela morte ocorrem normalmente.',
    visualDesc: 'Lâmina carmesim de sentença fatal descendo sobre a carta condenada.',
  },
  praga: {
    key: 'praga',
    name: 'Praga',
    category: 'negativo',
    categoryName: 'Negativos',
    categoryColor: 'text-red-400',
    categoryBg: 'bg-red-950/50',
    categoryBorder: 'border-red-500/70',
    icon: '☠️',
    shortDesc: 'Reduz todos os atributos da unidade em 25%.',
    fullDesc:
      'Unidades afetadas por Praga ficam com todos os seus atributos (Vida, Ataque, Defesa e Poder) reduzidos em 25% enquanto o efeito durar.',
    visualDesc: 'Miasma sombrio púrpura-esverdeado e esporos pestilentos corroendo os atributos da carta.',
    defaultDuration: '2 rodadas',
  },

  // 3. COMBATE (Laranja)
  bravura: {
    key: 'bravura',
    name: 'Bravura',
    category: 'combate',
    categoryName: 'Combate',
    categoryColor: 'text-orange-400',
    categoryBg: 'bg-orange-950/50',
    categoryBorder: 'border-orange-500/70',
    icon: '🎺',
    shortDesc: 'Dano excedente causa 1 de dano direto à Vida do líder.',
    fullDesc:
      'O dano excedente à RESISTÊNCIA da unidade atacada atinge a vida do jogador adversário, causando 1 de dano como um ataque direto.',
    visualDesc: 'Labaredas douradas de incentivo bélico e impulso combativo (Levantar Moral).',
  },
  enfrentar: {
    key: 'enfrentar',
    name: 'Enfrentar',
    category: 'combate',
    categoryName: 'Combate',
    categoryColor: 'text-orange-400',
    categoryBg: 'bg-orange-950/50',
    categoryBorder: 'border-orange-500/70',
    icon: '🗡️',
    shortDesc: 'Ao declarar ataque, pode escolher e forçar um defensor inimigo.',
    fullDesc:
      'Permite à unidade escolher diretamente qual unidade inimiga será forçada a defender seu ataque durante a declaração de ataque.',
    visualDesc: 'Lâmina de desafio cravada em duelo direto (Desafio Real).',
  },
  furtividade: {
    key: 'furtividade',
    name: 'Furtividade',
    category: 'combate',
    categoryName: 'Combate',
    categoryColor: 'text-orange-400',
    categoryBg: 'bg-orange-950/50',
    categoryBorder: 'border-orange-500/70',
    icon: '👤',
    shortDesc: 'Só pode ser bloqueada por unidades furtivas.',
    fullDesc:
      'Unidades furtivas só podem ser bloqueadas em um ataque por outras unidades que também possuam Furtividade.',
    visualDesc: 'Névoa densa de sombras e ilusão escura envolvendo a unidade (Enganar).',
  },
  etereo: {
    key: 'etereo',
    name: 'Etéreo',
    category: 'combate',
    categoryName: 'Combate',
    categoryColor: 'text-orange-400',
    categoryBg: 'bg-orange-950/50',
    categoryBorder: 'border-orange-500/70',
    icon: '✨🌌',
    shortDesc: 'Só pode ser bloqueada por unidades etéreas.',
    fullDesc:
      'Unidades etéreas só podem ser bloqueadas em um ataque por outras unidades etéreas, apenas. Converte a unidade em pura energia espectral cósmica.',
    visualDesc: 'Névoa translúcida fantasmagórica em tons cósmicos ciano e violeta com brilho estelar.',
  },
  critico: {
    key: 'critico',
    name: 'Crítico',
    category: 'combate',
    categoryName: 'Combate',
    categoryColor: 'text-orange-400',
    categoryBg: 'bg-orange-950/50',
    categoryBorder: 'border-orange-500/70',
    icon: '🎯',
    shortDesc: 'Dano atinge diretamente a Vida, ignorando Defesa.',
    fullDesc:
      'O dano é causado diretamente na VIDA da unidade atacada, ignorando sua defesa por completo.',
    visualDesc: 'Um dardo de PRATA cintilante atinge em alta velocidade diretamente o coração de Vida da carta.',
  },
  obliteracao: {
    key: 'obliteracao',
    name: 'Obliterar',
    category: 'combate',
    categoryName: 'Combate',
    categoryColor: 'text-orange-400',
    categoryBg: 'bg-orange-950/50',
    categoryBorder: 'border-orange-500/70',
    icon: '🕳️',
    shortDesc: 'Elimina uma unidade instantaneamente.',
    fullDesc:
      'Elimina uma unidade instantaneamente do jogo, desintegrando sua matéria cósmica sem permitir rebote.',
    visualDesc: 'Vórtice cósmico de singularidade gravitacional absoluta (Voto do Absoluto).',
  },
  roubo_de_vida: {
    key: 'roubo_de_vida',
    name: 'Roubo de Vida',
    category: 'combate',
    categoryName: 'Combate',
    categoryColor: 'text-orange-400',
    categoryBg: 'bg-orange-950/50',
    categoryBorder: 'border-orange-500/70',
    icon: '🩸',
    shortDesc: 'Cura 40% do dano causado na Vida antes do rebote.',
    fullDesc:
      'Cura 40% do seu dano causado ao ATACAR uma unidade (cura apenas a VIDA). Na resolução de combate, a vida roubada soma-se à VIDA da carta antes que o dano de rebote seja aplicado.',
    visualDesc: 'Mãos fantasmagóricas sanguinárias escarlates drenando a vida da carta adversária.',
  },
  ataque_duplo: {
    key: 'ataque_duplo',
    name: 'Ataque-duplo',
    category: 'combate',
    categoryName: 'Combate',
    categoryColor: 'text-orange-400',
    categoryBg: 'bg-orange-950/50',
    categoryBorder: 'border-orange-500/70',
    icon: '⚔️',
    shortDesc: '2º ataque causando 60% do dano original.',
    fullDesc:
      'A unidade executa um segundo ataque na unidade causando 60% do seu dano original no mesmo ato de combate.',
    visualDesc: 'Duas lâminas espectrais velozes cruzam a unidade com efeito sonoro duplo de estilhaço.',
  },

  // 4. SITUACIONAIS (Azul Claro)
  revelar: {
    key: 'revelar',
    name: 'Revelar',
    category: 'situacional',
    categoryName: 'Situacionais',
    categoryColor: 'text-sky-300',
    categoryBg: 'bg-sky-950/50',
    categoryBorder: 'border-sky-400/70',
    icon: '🔮',
    shortDesc: 'Revela 5 cartas do topo; escolha 1 para a mão.',
    fullDesc:
      'Revela as 5 primeiras cartas do topo do baralho. O jogador escolhe 1 para ir diretamente para sua mão.',
    visualDesc: 'Um portal místico espiral giratório se abre na mesa apresentando o grimório.',
  },
  capturar: {
    key: 'capturar',
    name: 'Capturar',
    category: 'situacional',
    categoryName: 'Situacionais',
    categoryColor: 'text-sky-300',
    categoryBg: 'bg-sky-950/50',
    categoryBorder: 'border-sky-400/70',
    icon: '🫱',
    shortDesc: 'Toma uma carta inimiga (baralho ou mesa) para a mão aliada.',
    fullDesc:
      'Pega uma carta do oponente (do baralho ou escolhida da mesa inimiga) e a adiciona à mão aliada até o fim da partida. Ao capturar da mesa, a unidade retorna aos seus atributos originais e respeita o limite de 8 cartas na mão.',
    visualDesc: 'Laço tático azul celeste que transfere a posse da carta adversária.',
  },
  retorno: {
    key: 'retorno',
    name: 'Retornar',
    category: 'situacional',
    categoryName: 'Situacionais',
    categoryColor: 'text-sky-300',
    categoryBg: 'bg-sky-950/50',
    categoryBorder: 'border-sky-400/70',
    icon: '🕊️',
    shortDesc: 'Escolha 1 dentre 3 cartas descartadas na cripta para retornar à mão.',
    fullDesc:
      'Exibe até 3 cartas aleatórias descartadas da cripta aliada. O jogador escolhe 1 para retornar diretamente para sua mão.',
    visualDesc: 'Vórtice celestial azul claro que evoca cartas caídas de volta da cripta.',
  },
  corrosao: {
    key: 'corrosao',
    name: 'Corrosão',
    category: 'negativo',
    categoryName: 'Negativos',
    categoryColor: 'text-lime-300',
    categoryBg: 'bg-lime-950/60',
    categoryBorder: 'border-lime-400/75',
    icon: '🧪',
    shortDesc: 'Causa 1 de dano direto na Vida a cada TURNO das rodadas ativo e corta toda cura.',
    fullDesc:
      'Unidades afetadas por Corrosão recebem 1 de dano diretamente na sua Vida a cada TURNO das rodadas em que permanecer ativo. Além disso, corta toda a cura recebida pela unidade.',
    visualDesc: 'Vapor ácido cáustico verde-esmeralda que corrói a vitalidade e bloqueia qualquer regeneração.',
  },
  sangramento: {
    key: 'sangramento',
    name: 'Sangramento',
    category: 'negativo',
    categoryName: 'Negativos',
    categoryColor: 'text-rose-300',
    categoryBg: 'bg-rose-950/60',
    categoryBorder: 'border-rose-400/75',
    icon: '🩸',
    shortDesc: 'Causa 2 de dano por rodada ativo. Na 4ª vez que causar dano, vira Hemorragia (-25% Vida Máx.).',
    fullDesc:
      'Causa 2 de dano a cada rodada ativo. Ao causar dano 4 vezes no mesmo inimigo, em sequência ou intercalando, o Sangramento se transforma em Hemorragia e causa 25% da Vida Máxima da unidade afetada. Após Hemorragia ativar na unidade, o contador de Sangramento reseta para ela, podendo receber Sangramento e Hemorragia novamente ao completar as 4 marcas. Unidades que causam Sangramento já contam +1 marca por golpe ao atacar (+2 marcas em um ataque com Ataque-Duplo), acelerando a Hemorragia.',
    visualDesc: 'Cortes carmesins gotejantes com marcador de 4 marcas para explosão de Hemorragia.',
  },
  hemorragia: {
    key: 'hemorragia',
    name: 'Hemorragia',
    category: 'negativo',
    categoryName: 'Negativos',
    categoryColor: 'text-red-300',
    categoryBg: 'bg-red-950/70',
    categoryBorder: 'border-red-500/80',
    icon: '💔',
    shortDesc: 'Ativa ao completar 4 marcas de Sangramento: causa 25% da Vida Máxima e reseta o contador.',
    fullDesc:
      'Quando o Sangramento causa dano pela 4ª vez no mesmo inimigo (em sequência ou intercalando), transforma-se em Hemorragia e causa instantaneamente 25% da Vida Máxima da unidade afetada diretamente na Vida, resetando o contador de marcas para 0.',
    visualDesc: 'Ruptura sanguínea escarlate que drena 25% da Vida Máxima e desperta o Roubo de Vida de Gangnyr.',
  },
};

// Aliases for compatibility
CONDITIONS_REGISTRY['sono'] = CONDITIONS_REGISTRY['dormindo'];
CONDITIONS_REGISTRY['furtivo'] = CONDITIONS_REGISTRY['furtividade'];
CONDITIONS_REGISTRY['torpor'] = CONDITIONS_REGISTRY['entorpecer'];
CONDITIONS_REGISTRY['retornar'] = CONDITIONS_REGISTRY['retorno'];

export interface ConditionDurationInfo {
  showCounter: boolean;
  isPermanent: boolean;
  remainingRounds?: number;
  shortBadge: string;
  detailLabel: string;
  subNote?: string;
}

export interface CardConditionItem {
  key: string;
  config: ConditionConfig;
  sourceType: ConditionSourceType;
  sourceLabel: string;
  sourceBorderClass: string;
  sourceBgClass: string;
  sourceTextClass: string;
  isSpecialGolden: boolean;
  priorityOrder: number; // 1: Passivo, 2: Único, 3: Recebido
  originBadgeType: 'habilidade' | 'unidade_compartilhada' | 'unidade_inimiga' | 'proprio';
  originKindLabel: string;
  originDetail: string;
  duration: ConditionDurationInfo;
}

export function normalizeConditionKey(key: string): string {
  const lower = (key || '').toLowerCase();
  if (lower === 'sono') return 'dormindo';
  if (lower === 'furtivo') return 'furtividade';
  if (lower === 'torpor') return 'entorpecer';
  return lower;
}

export function setCardConditionSource(
  card: CardInstance,
  key: string,
  kind: ConditionOriginKind,
  sourceName: string
): void {
  const norm = normalizeConditionKey(key);
  card.conditionSources = {
    ...(card.conditionSources || {}),
    [norm]: { kind, sourceName },
  };
}

export function removeCardConditionSource(card: CardInstance, key: string): void {
  if (!card.conditionSources) return;
  const norm = normalizeConditionKey(key);
  if (!(norm in card.conditionSources)) return;
  const next = { ...card.conditionSources };
  delete next[norm];
  card.conditionSources = next;
}

export function withConditionSource(
  sources: Partial<Record<string, ConditionSourceInfo>> | undefined,
  key: string,
  kind: ConditionOriginKind,
  sourceName: string
): Partial<Record<string, ConditionSourceInfo>> {
  const norm = normalizeConditionKey(key);
  return {
    ...(sources || {}),
    [norm]: { kind, sourceName },
  };
}

export function withoutConditionSource(
  sources: Partial<Record<string, ConditionSourceInfo>> | undefined,
  key: string
): Partial<Record<string, ConditionSourceInfo>> | undefined {
  if (!sources) return sources;
  const norm = normalizeConditionKey(key);
  if (!(norm in sources)) return sources;
  const next = { ...sources };
  delete next[norm];
  return next;
}

export function isCardArchangel(card: CardInstance): boolean {
  if (card.type === 'skill') return false;
  const cardNameLower = (card.name || '').toLowerCase();
  if (cardNameLower.includes('jurisdi')) return false;
  const templateId = (card.templateId || '').toLowerCase();
  return (
    Boolean(card.isArchangel) ||
    Boolean(card.isRevealedFaleziel) ||
    templateId === 'n_zael' ||
    templateId === 'm_inariel' ||
    templateId === 'm_umael' ||
    templateId === 'n_seniel' ||
    templateId === 'n_saniel' ||
    templateId === 'n_polus' ||
    templateId === 'n_torvyx' ||
    templateId === 'm_fanx' ||
    templateId === 'g_kaliel' ||
    templateId === 'm_faleziel' ||
    cardNameLower.includes('zael') ||
    cardNameLower.includes('inariel') ||
    cardNameLower.includes('umael') ||
    cardNameLower.includes('seniel') ||
    cardNameLower.includes('saniel') ||
    cardNameLower.includes('polus') ||
    cardNameLower.includes('pólus') ||
    cardNameLower.includes('torvyx') ||
    cardNameLower.includes('fanx') ||
    cardNameLower.includes('kaliel') ||
    cardNameLower.includes('faleziel') ||
    cardNameLower.includes('angiris') ||
    templateId.includes('angiris')
  );
}

export function isCardFairy(card: CardInstance): boolean {
  if (card.type === 'skill') return false;
  const cardNameLower = (card.name || '').toLowerCase();
  const templateId = (card.templateId || '').toLowerCase();
  return (
    Boolean(card.isFairy) ||
    templateId === 'g_lilia' ||
    templateId === 'g_salazar' ||
    templateId === 'g_aurora' ||
    templateId === 'm_finn' ||
    templateId === 'm_bia' ||
    templateId === 'm_licia' ||
    templateId === 'm_licia_lvl2' ||
    templateId === 'n_cristalys' ||
    templateId === 'n_xury' ||
    templateId === 'g_karyen' ||
    templateId === 'm_hamelia' ||
    cardNameLower.includes('fada')
  );
}

export function isCardIrmaos(card: CardInstance): boolean {
  const cardNameLower = (card.name || '').toLowerCase();
  const templateId = (card.templateId || '').toLowerCase();
  return (
    templateId === 'n_zael' ||
    templateId === 'm_inariel' ||
    cardNameLower.includes('zael') ||
    cardNameLower.includes('inariel') ||
    cardNameLower.includes('irmãos') ||
    cardNameLower.includes('irmaos')
  );
}

export function isCardAngirisOrIrmaos(card: CardInstance): boolean {
  return isCardArchangel(card) || isCardIrmaos(card) || isCardFairy(card);
}

/**
 * Determine the visual border styling based on the nature/source of the condition on this specific card.
 * Rule:
 * - DOURADA Reluzente: Efeitos passivos de cartas especiais como Aliança Angiris (👼), Irmãos (👥) e Corte das Fadas (🧚).
 * - AZUL ESCURO: Efeito Único / Passivo da própria carta (incluindo unidades que aplicam efeitos negativos).
 * - VERDE ESCURO: Efeito Benéfico advindo de habilidades ou compartilhado por outras cartas.
 * - LARANJA: Efeito de Combate recebido de cartas de habilidade ou de outras unidades.
 * - VERMELHO: Todo efeito negativo recebido.
 */
export function getConditionSourceStyle(
  card: CardInstance,
  conditionKey: string,
  nature: 'passivo' | 'unico' | 'recebido' = 'recebido'
): {
  sourceType: ConditionSourceType;
  sourceLabel: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  isGolden: boolean;
  priorityOrder: number;
} {
  const normKey = conditionKey.toLowerCase();
  const config = CONDITIONS_REGISTRY[normKey];
  const isNegative = config?.category === 'negativo' || normKey === 'silencio';
  const isNative = nature === 'passivo' || nature === 'unico';
  const priorityOrder = nature === 'passivo' ? 1 : nature === 'unico' ? 2 : 3;

  // Special golden border: exclusively for the independent passives Aliança Angiris (👼), Irmãos (👥), and Corte das Fadas (🧚)
  if (normKey === 'alianca_angiris' || normKey === 'irmaos' || normKey === 'corte_das_fadas') {
    const labelMap: Record<string, string> = {
      alianca_angiris: 'Passiva — Aliança Angiris',
      irmaos: 'Passiva — Irmãos',
      corte_das_fadas: 'Passiva — Corte das Fadas',
    };
    return {
      sourceType: 'passivo_especial',
      sourceLabel: labelMap[normKey] || 'Passiva Especial',
      borderClass: 'border-amber-400 ring-2 ring-amber-300/85 shadow-[0_0_12px_rgba(251,191,36,0.95)]',
      bgClass: 'bg-amber-950/85',
      textClass: 'text-amber-200',
      isGolden: true,
      priorityOrder: 1,
    };
  }

  // Negative effects RECEIVED by a unit (or displayed on a skill card that applies a negative condition) have a RED border.
  // However, if a unit applies/has a negative condition as part of its own native passive/unique effect (e.g., Gael, o Lobo),
  // it uses the native passive border (AZUL ESCURO).
  if (isNegative && (!isNative || card.type === 'skill')) {
    return {
      sourceType: 'negativo',
      sourceLabel: card.type === 'skill' ? 'Efeito Negativo Aplicado pela Habilidade' : 'Efeito Negativo Recebido',
      borderClass: 'border-red-600 ring-1 ring-red-500/70 shadow-[0_0_8px_rgba(239,68,68,0.55)]',
      bgClass: 'bg-red-950/90',
      textClass: 'text-red-200',
      isGolden: false,
      priorityOrder: nature === 'unico' ? 2 : 3,
    };
  }

  // Native passive / unique effect of the card itself -> AZUL ESCURO (including units that apply negative effects via their unique/passive effect)
  if (isNative) {
    return {
      sourceType: 'passivo',
      sourceLabel: isNegative
        ? 'Efeito Negativo Aplicado pelo Efeito Único/Passiva'
        : nature === 'passivo'
        ? 'Efeito Passivo Próprio'
        : 'Efeito Único da Carta',
      borderClass: 'border-blue-800 ring-1 ring-blue-500/75 shadow-[0_0_8px_rgba(30,58,138,0.75)]',
      bgClass: 'bg-blue-950/90',
      textClass: 'text-blue-200',
      isGolden: false,
      priorityOrder,
    };
  }

  // Externally received Combat effects -> LARANJA border
  if (config?.category === 'combate') {
    return {
      sourceType: 'combate',
      sourceLabel: 'Efeito de Combate Recebido',
      borderClass: 'border-orange-500 ring-1 ring-orange-400/75 shadow-[0_0_8px_rgba(234,88,12,0.6)]',
      bgClass: 'bg-orange-950/90',
      textClass: 'text-orange-200',
      isGolden: false,
      priorityOrder: 3,
    };
  }

  // Externally received Beneficial / Protection / Situational effects -> VERDE ESCURO
  return {
    sourceType: 'benefico',
    sourceLabel: 'Efeito Benéfico Recebido',
    borderClass: 'border-emerald-700 ring-1 ring-emerald-500/70 shadow-[0_0_8px_rgba(6,95,70,0.7)]',
    bgClass: 'bg-emerald-950/90',
    textClass: 'text-emerald-200',
    isGolden: false,
    priorityOrder: 3,
  };
}

const PASSIVE_NATIVE_KEYS: Record<string, string[]> = {
  g_corcel: ['furtividade'],
  g_bor: ['cura'],
  g_daniel: ['roubo_de_vida'],
  m_moira: ['ataque_duplo', 'sangramento'],
  m_tiryu: ['sangramento'],
  m_titano: ['ataque_duplo', 'cura'],
  g_sebastian: ['ataque_duplo', 'roubo_de_vida'],
  m_cavaleiro_sem_nome: ['tenacidade'],
  n_pedrinha: ['tenacidade'],
  g_gael: ['queimadura'],
  g_leo: ['queimadura'],
  n_kyn: ['atordoado'],
  n_bimo: ['atordoado'],
  g_guadan: ['atordoado'],
  m_atormentador: ['atordoado'],
  n_elio: ['cura'],
  g_selma: ['eletrificado'],
  n_crisol: ['enfrentar'],
  n_wyr: ['enfrentar'],
  m_caspiem: ['enfrentar', 'furtividade'],
  m_jasmim: ['enfrentar', 'ataque_duplo'],
};

const UNIQUE_CARD_CONDITIONS: Record<string, string[]> = {
  // Arcanjos: seus efeitos únicos ficam separados de suas Passivas (Aliança Angiris / Irmãos)
  n_polus: ['critico'],
  n_zael: ['ressurreicao'],
  m_inariel: ['queimadura'],
  m_umael: ['enfrentar'],
  n_torvyx: ['revelar'],
  n_saniel_lvl2: ['silencio'],
  // Demais unidades com efeitos únicos
  g_barao_well: ['bravura', 'tenacidade'],
  g_barao_well_lvl2: ['cura', 'roubo_de_vida', 'eletrificado'],
  m_licia_lvl2: ['furtividade', 'etereo'],
  m_titano_lvl2: ['ataque_duplo', 'sangramento', 'cura'],
  g_aurora: ['barreira'],
  n_ilio: ['dormindo', 'bravura', 'critico'],
  g_lunario: ['dormindo'],
  g_a_lua: ['dormindo'],
  n_o_sol_lvl2: ['imunidade', 'obliteracao'],
  g_a_lua_lvl2: ['dormindo', 'obliteracao'],
  m_juci: ['bravura', 'congelado'],
  m_bonetrus: ['congelado'],
  m_kore: ['congelado'],
  m_lamina_inverno: ['congelado'],
  g_salazar: ['entorpecer'],
  n_helio: ['entorpecer'],
  m_rei_mauricio: ['critico', 'bravura'],
  g_mago_uhr: ['revelar'],
  // Skill cards
  g_enganar: ['furtividade'],
  m_moral: ['bravura'],
  g_desafio_real: ['enfrentar'],
  n_labareda_solar: ['entorpecer'],
  m_voto_caidos: ['atordoado'],
  m_crio_genese: ['congelado'],
  n_destreza: ['ataque_duplo'],
  n_voto_estrelas: ['barreira'],
  g_sabedoria_cosmica: ['imunidade'],
  m_fome_insaciavel: ['roubo_de_vida'],
  m_grao_mestre: ['critico'],
  n_jurisdicao_de_saniel: ['silencio'],
  n_bloqueio: ['silencio'],
  m_letargia_lunar: ['dormindo'],
  g_concessao_divina: ['ressurreicao'],
  n_voto_do_absoluto: ['obliteracao'],
  n_revelar: ['revelar'],
  token_flecha_eletrica: ['eletrificado'],
  // Patch 1.4: Novas Unidades Divinas e Habilidades Situacionais
  g_ambroz: ['critico'],
  m_bia: ['capturar'],
  n_mavie: ['roubo_de_vida'],
  g_lucent: ['queimadura'],
  n_kamui: ['retorno'],
  g_subjugar: ['capturar'],
  m_reencarnacao: ['retorno'],
  // Patch 1.4.1
  n_nulio: ['cura'],
  m_falanx: ['entorpecer'],
  m_xeno: ['atordoado'],
  token_centelha: ['entorpecer'],
  m_destino_fatal: ['executar'],
  // Patch 1.5: Classe Sombrio
  g_targor: ['praga'],
  m_atlaziel: ['executar', 'praga'],
  n_barelio: ['capturar'],
  g_gangnyr: ['sangramento', 'hemorragia', 'roubo_de_vida'],
  m_hamelia: ['furtividade', 'corrosao'],
};

/**
 * Extracts all active conditions on a card, structured and sorted according to:
 * 1º Passivos (incluindo ícones separados para Aliança Angiris 👼, Irmãos 👥 e Corte das Fadas 🧚)
 * 2º Únicos (ex: Torvyx tem 1º Aliança Angiris 👼 e 2º Revelar 🔮)
 * 3º Recebidos
 */
export function getCardConditionItems(card: CardInstance, includeUniquePreview: boolean = false): CardConditionItem[] {
  const items: CardConditionItem[] = [];
  const processedKeys = new Set<string>();

  const isSilenced = Boolean(card.silencedRounds && card.silencedRounds > 0);
  const tid = (card.templateId || '').toLowerCase();
  const lvlKey = card.level === 2 ? `${tid}_lvl2` : tid;
  const passiveList = new Set<string>(PASSIVE_NATIVE_KEYS[tid] || []);
  const uniqueList = new Set<string>([
    ...(UNIQUE_CARD_CONDITIONS[tid] || []),
    ...(UNIQUE_CARD_CONDITIONS[lvlKey] || []),
  ]);

  // Independent Passives: Aliança Angiris (👼), Irmãos (👥), and Corte das Fadas (🧚) are separate passives!
  if (card.type === 'unit') {
    if (isCardArchangel(card)) {
      passiveList.add('alianca_angiris');
    }
    if (isCardIrmaos(card)) {
      passiveList.add('irmaos');
    }
    if (isCardFairy(card)) {
      passiveList.add('corte_das_fadas');
    }
  }

  const nativePill = card.conditionPill?.toLowerCase();
  const resolvedNativePillKey = nativePill && CONDITIONS_REGISTRY[nativePill] ? CONDITIONS_REGISTRY[nativePill].key : undefined;
  if (resolvedNativePillKey) {
    // If the card already has independent passives (like Archangels with Aliança Angiris / Irmãos / Fairies) or is in uniqueList,
    // keep the condition as its separate 2º Único effect instead of merging it into 1º Passivo!
    if (uniqueList.has(resolvedNativePillKey) || isCardArchangel(card) || isCardIrmaos(card) || isCardFairy(card)) {
      uniqueList.add(resolvedNativePillKey);
    } else {
      passiveList.add(resolvedNativePillKey);
    }
  }

  const resolveOriginInfo = (
    configKey: string,
    effectiveNature: 'passivo' | 'unico' | 'recebido',
    recorded?: ConditionSourceInfo
  ): {
    originBadgeType: 'habilidade' | 'unidade_compartilhada' | 'unidade_inimiga' | 'proprio';
    originKindLabel: string;
    originDetail: string;
  } => {
    if (recorded) {
      if (recorded.kind === 'habilidade') {
        return {
          originBadgeType: 'habilidade',
          originKindLabel: 'Carta de Habilidade',
          originDetail: `Aplicado pela carta de habilidade "${recorded.sourceName}".`,
        };
      }
      if (recorded.kind === 'unidade_compartilhada') {
        return {
          originBadgeType: 'unidade_compartilhada',
          originKindLabel: 'Efeito Compartilhado de Outra Unidade',
          originDetail: `Compartilhado pelo efeito da unidade "${recorded.sourceName}".`,
        };
      }
      if (recorded.kind === 'unidade_inimiga') {
        return {
          originBadgeType: 'unidade_inimiga',
          originKindLabel: 'Efeito de Outra Unidade',
          originDetail: `Aplicado pela unidade "${recorded.sourceName}".`,
        };
      }
      return {
        originBadgeType: 'proprio',
        originKindLabel: recorded.kind === 'passiva_propria' ? 'Passiva Própria da Carta' : 'Efeito Único Próprio da Carta',
        originDetail: `Efeito próprio desta carta ("${recorded.sourceName}").`,
      };
    }

    if (configKey === 'alianca_angiris') {
      return {
        originBadgeType: 'unidade_compartilhada',
        originKindLabel: 'Efeito Compartilhado entre Arcanjos',
        originDetail: 'Passiva compartilhada: ativa quando 2 ou mais Arcanjos aliados estão juntos na mesa.',
      };
    }
    if (configKey === 'irmaos') {
      return {
        originBadgeType: 'unidade_compartilhada',
        originKindLabel: 'Efeito Compartilhado entre Irmãos',
        originDetail: 'Passiva compartilhada: elo fraterno entre Zael, o Arcanjo e Inariel, o Arcanjo em campo.',
      };
    }
    if (configKey === 'corte_das_fadas') {
      return {
        originBadgeType: 'unidade_compartilhada',
        originKindLabel: 'Efeito Compartilhado entre Fadas',
        originDetail: 'Passiva compartilhada: ativa com 3 ou mais Fadas na mesa, salvando o jogador da morte 1x (+2 Vida rosa e +75% Poder às Fadas).',
      };
    }
    if (card.type === 'skill') {
      return {
        originBadgeType: 'habilidade',
        originKindLabel: 'Carta de Habilidade',
        originDetail: `Efeito aplicado diretamente ao utilizar a carta de habilidade "${card.name}".`,
      };
    }
    if (effectiveNature === 'passivo' || effectiveNature === 'unico') {
      return {
        originBadgeType: 'proprio',
        originKindLabel: effectiveNature === 'passivo' ? 'Passiva Própria da Unidade' : 'Efeito Único Próprio da Unidade',
        originDetail: `Efeito nativo da própria carta "${card.name}", ativado por sua mecânica original.`,
      };
    }
    if (configKey === 'silencio') {
      return {
        originBadgeType: 'habilidade',
        originKindLabel: 'Carta de Habilidade',
        originDetail: 'Aplicado pela carta de habilidade "Jurisdição de Saniel".',
      };
    }
    return {
      originBadgeType: 'habilidade',
      originKindLabel: 'Carta de Habilidade ou Unidade',
      originDetail: 'Recebido em campo por uma carta de habilidade ou pelo efeito compartilhado de outra unidade.',
    };
  };

  const formatRoundsDuration = (rounds: number, subNote?: string): Omit<ConditionDurationInfo, 'showCounter'> => ({
    isPermanent: false,
    remainingRounds: rounds,
    shortBadge: `${rounds}r`,
    detailLabel: rounds === 1 ? '1 rodada restante' : `${rounds} rodadas restantes`,
    subNote,
  });

  const permanentDuration = (subNote?: string): Omit<ConditionDurationInfo, 'showCounter'> => ({
    isPermanent: true,
    shortBadge: '∞',
    detailLabel: 'Permanente',
    subNote,
  });

  const resolveConditionDuration = (
    config: ConditionConfig,
    originBadgeType: 'habilidade' | 'unidade_compartilhada' | 'unidade_inimiga' | 'proprio',
    sourceType: ConditionSourceType
  ): ConditionDurationInfo => {
    const showCounter =
      card.type !== 'skill' &&
      sourceType !== 'passivo' &&
      sourceType !== 'passivo_especial';
    const withVisibility = (base: Omit<ConditionDurationInfo, 'showCounter'>): ConditionDurationInfo => ({
      ...base,
      showCounter,
    });
    const key = config.key;
    const tidLower = (card.templateId || '').toLowerCase();
    const isNegative = config.category === 'negativo' || key === 'silencio';

    // 1. Efeitos de habilidade (fora de mesa) ou capacidades ofensivas nativas da unidade (ex.: Gael aplicando Queimadura)
    if (card.type === 'skill') {
      return withVisibility(permanentDuration());
    }
    if (isNegative && originBadgeType === 'proprio') {
      // Exceção: Ilio inicia dormindo (sleepRoundsRemaining) como condição própria aplicada sobre si mesmo
      if (key === 'dormindo' && (card.sleepRoundsRemaining ?? 0) > 0) {
        return withVisibility(formatRoundsDuration(card.sleepRoundsRemaining!));
      }
      return withVisibility(permanentDuration());
    }

    switch (key) {
      case 'silencio':
        if (card.silencedRounds && card.silencedRounds > 0) {
          return withVisibility(formatRoundsDuration(card.silencedRounds));
        }
        return withVisibility(permanentDuration());
      case 'queimadura':
        if (card.burnTurnsRemaining && card.burnTurnsRemaining > 0) {
          return withVisibility(formatRoundsDuration(card.burnTurnsRemaining));
        }
        return withVisibility(permanentDuration());
      case 'cura':
        if (card.curaTurnsRemaining && card.curaTurnsRemaining > 0) {
          return withVisibility(formatRoundsDuration(card.curaTurnsRemaining));
        }
        return withVisibility(permanentDuration());
      case 'entorpecer':
        if (card.entorpecerRoundsRemaining && card.entorpecerRoundsRemaining > 0) {
          return withVisibility(formatRoundsDuration(card.entorpecerRoundsRemaining));
        }
        return withVisibility(permanentDuration());
      case 'imunidade':
        if (card.immunedRounds && card.immunedRounds > 0) {
          return withVisibility(formatRoundsDuration(card.immunedRounds));
        }
        return withVisibility(permanentDuration());
      case 'barreira':
        if (card.barreiraRoundsRemaining && card.barreiraRoundsRemaining > 0) {
          return withVisibility(formatRoundsDuration(card.barreiraRoundsRemaining));
        }
        return withVisibility(permanentDuration());
      case 'tenacidade':
        if (card.tenacidadeRoundsRemaining && card.tenacidadeRoundsRemaining > 0) {
          return withVisibility(formatRoundsDuration(card.tenacidadeRoundsRemaining));
        }
        return withVisibility(permanentDuration());
      case 'congelado':
        if (card.freezeRoundsRemaining && card.freezeRoundsRemaining > 0) {
          return withVisibility(formatRoundsDuration(card.freezeRoundsRemaining));
        }
        return withVisibility(permanentDuration());
      case 'atordoado':
        if (card.conditions?.has('atordoado') || (card.stunRoundsRemaining ?? 0) > 0) {
          return withVisibility(formatRoundsDuration((card.stunRoundsRemaining ?? 0) + 1));
        }
        return withVisibility(permanentDuration());
      case 'critico':
        if (card.criticoRoundsRemaining && card.criticoRoundsRemaining > 0) {
          return withVisibility(formatRoundsDuration(card.criticoRoundsRemaining));
        }
        return withVisibility(permanentDuration());
      case 'eletrificado':
        if (card.eletrificadoRoundsRemaining && card.eletrificadoRoundsRemaining > 0) {
          return withVisibility(formatRoundsDuration(card.eletrificadoRoundsRemaining));
        }
        return withVisibility(permanentDuration());
      case 'dormindo':
        if (card.sleepRoundsRemaining && card.sleepRoundsRemaining > 0) {
          return withVisibility(formatRoundsDuration(card.sleepRoundsRemaining));
        }
        if (card.asleepState || card.conditions?.has('dormindo')) {
          return withVisibility(formatRoundsDuration(1));
        }
        return withVisibility(permanentDuration());
      case 'praga':
        if (card.pragaRoundsRemaining && card.pragaRoundsRemaining > 0) {
          return withVisibility(formatRoundsDuration(card.pragaRoundsRemaining));
        }
        return withVisibility(permanentDuration());
      case 'corrosao':
        if (card.corrosaoRoundsRemaining && card.corrosaoRoundsRemaining > 0) {
          return withVisibility(formatRoundsDuration(card.corrosaoRoundsRemaining));
        }
        return withVisibility(permanentDuration());
      case 'sangramento': {
        const marksNote =
          card.sangramentoMarks && card.sangramentoMarks > 0
            ? `Marcas: ${card.sangramentoMarks}/4 para Hemorragia`
            : undefined;
        if (card.sangramentoRoundsRemaining && card.sangramentoRoundsRemaining > 0) {
          return withVisibility(formatRoundsDuration(card.sangramentoRoundsRemaining, marksNote));
        }
        return withVisibility(permanentDuration(marksNote));
      }
      case 'hemorragia': {
        if (card.sangramentoMarks && card.sangramentoMarks > 0) {
          return withVisibility({
            isPermanent: false,
            shortBadge: `${card.sangramentoMarks}/4`,
            detailLabel: `Marcas: ${card.sangramentoMarks}/4 para Hemorragia`,
          });
        }
        return withVisibility(permanentDuration());
      }
      case 'roubo_de_vida':
        if (card.lifeStealRoundsRemaining && card.lifeStealRoundsRemaining > 0) {
          return withVisibility(formatRoundsDuration(card.lifeStealRoundsRemaining));
        }
        return withVisibility(permanentDuration());
      case 'ataque_duplo':
        if (card.doubleAttackRoundsRemaining && card.doubleAttackRoundsRemaining > 0) {
          return withVisibility(formatRoundsDuration(card.doubleAttackRoundsRemaining));
        }
        return withVisibility(permanentDuration());
      case 'furtividade': {
        if (
          card.conditions?.has('furtividade') &&
          (originBadgeType === 'habilidade' || tidLower === 'm_finn')
        ) {
          return withVisibility(formatRoundsDuration(1));
        }
        return withVisibility(permanentDuration());
      }
      case 'bravura': {
        if (card.conditions?.has('bravura') && originBadgeType === 'habilidade') {
          return withVisibility(formatRoundsDuration(1));
        }
        return withVisibility(permanentDuration());
      }
      default:
        return withVisibility(permanentDuration());
    }
  };

  const pushItem = (rawKey: string, nature: 'passivo' | 'unico' | 'recebido', customLabel?: string) => {
    const config = CONDITIONS_REGISTRY[rawKey.toLowerCase()];
    if (!config || processedKeys.has(config.key)) return;
    processedKeys.add(config.key);

    const recorded = card.conditionSources?.[normalizeConditionKey(config.key)];
    const hasExternalRecordedSource =
      recorded &&
      (recorded.kind === 'habilidade' || recorded.kind === 'unidade_compartilhada' || recorded.kind === 'unidade_inimiga');

    const effectiveNature: 'passivo' | 'unico' | 'recebido' =
      hasExternalRecordedSource && card.type !== 'skill'
        ? 'recebido'
        : isSilenced && nature !== 'recebido' && card.type !== 'skill'
        ? 'recebido'
        : nature;

    const style = getConditionSourceStyle(card, config.key, effectiveNature);
    const originInfo = resolveOriginInfo(config.key, effectiveNature, includeUniquePreview && nature !== 'recebido' && !hasExternalRecordedSource ? undefined : recorded);
    const duration = resolveConditionDuration(config, originInfo.originBadgeType, style.sourceType);

    items.push({
      key: config.key,
      config,
      sourceType: style.sourceType,
      sourceLabel: customLabel || style.sourceLabel,
      sourceBorderClass: style.borderClass,
      sourceBgClass: style.bgClass,
      sourceTextClass: style.textClass,
      isSpecialGolden: style.isGolden,
      priorityOrder: style.priorityOrder,
      originBadgeType: originInfo.originBadgeType,
      originKindLabel: originInfo.originKindLabel,
      originDetail: originInfo.originDetail,
      duration,
    });
  };

  // Helper to check if a negative condition is actually afflicting THIS unit as a debuff
  const isAfflictedByNegative = (key: string): boolean => {
    if (!card.conditions && !isSilenced) return false;
    if (key === 'silencio') return isSilenced;
    if (key === 'queimadura') return Boolean((card.burnTurnsRemaining && card.burnTurnsRemaining > 0) || card.conditions?.has('queimadura'));
    if (key === 'congelado') return Boolean((card.freezeRoundsRemaining && card.freezeRoundsRemaining > 0) || card.conditions?.has('congelado'));
    if (key === 'eletrificado') return Boolean((card.eletrificadoRoundsRemaining && card.eletrificadoRoundsRemaining > 0) || card.conditions?.has('eletrificado'));
    if (key === 'entorpecer') return Boolean((card.entorpecerRoundsRemaining && card.entorpecerRoundsRemaining > 0) || card.conditions?.has('entorpecer'));
    if (key === 'praga') return Boolean((card.pragaRoundsRemaining && card.pragaRoundsRemaining > 0) || card.conditions?.has('praga'));
    if (key === 'corrosao') return Boolean((card.corrosaoRoundsRemaining && card.corrosaoRoundsRemaining > 0) || card.conditions?.has('corrosao'));
    if (key === 'sangramento') return Boolean((card.sangramentoRoundsRemaining && card.sangramentoRoundsRemaining > 0) || card.conditions?.has('sangramento'));
    return Boolean(card.conditions?.has(key as ConditionEffect));
  };

  // 1. Passivos (1º na ordem)
  if (!isSilenced || includeUniquePreview) {
    passiveList.forEach((k) => {
      const cfg = CONDITIONS_REGISTRY[k.toLowerCase()];
      const isNeg = cfg?.category === 'negativo';
      const isSpecialPassive = k === 'alianca_angiris' || k === 'irmaos' || k === 'corte_das_fadas';
      if (isNeg && card.type === 'unit' && isAfflictedByNegative(cfg.key) && !includeUniquePreview) {
        return; // Let step 3/4 render it as an active received debuff if the unit is currently suffering from it
      }
      if (
        isSpecialPassive ||
        card.type === 'skill' ||
        (card.conditions && card.conditions.has(k as ConditionEffect)) ||
        includeUniquePreview ||
        (resolvedNativePillKey === k && !uniqueList.has(k)) ||
        (isNeg && card.type === 'unit')
      ) {
        pushItem(k, 'passivo');
      }
    });
  }

  // 2. Únicos da carta (2º na ordem — inclusive para Cartas de Habilidade, efeitos únicos no Modal e efeitos únicos/negativos aplicados pela unidade)
  if (card.type === 'skill' || includeUniquePreview) {
    uniqueList.forEach((k) => {
      pushItem(k, 'unico');
    });
  } else if (!isSilenced) {
    uniqueList.forEach((k) => {
      const cfg = CONDITIONS_REGISTRY[k.toLowerCase()];
      const isNeg = cfg?.category === 'negativo';
      if (isNeg && card.type === 'unit' && !isAfflictedByNegative(cfg.key)) {
        pushItem(k, 'unico');
      } else if (
        (card.conditions && card.conditions.has(k as ConditionEffect)) ||
        resolvedNativePillKey === k
      ) {
        pushItem(k, 'unico');
      }
    });
  }

  // 3. Efeitos ativos recebidos em campo (3º na ordem — ou classificados pela natureza)
  if (card.conditions) {
    card.conditions.forEach((cond) => {
      const norm = cond.toLowerCase();
      const config = CONDITIONS_REGISTRY[norm];
      if (!config || processedKeys.has(config.key)) return;
      const isPass = passiveList.has(config.key);
      const isUniq = uniqueList.has(config.key);
      const nature: 'passivo' | 'unico' | 'recebido' = isPass ? 'passivo' : isUniq ? 'unico' : 'recebido';
      pushItem(config.key, nature);
    });
  }

  // 4. Flags com duração explícita (Silêncio, Queimadura, Congelado, Eletrificado, Torpor, Praga)
  if (isSilenced && !processedKeys.has('silencio')) {
    pushItem('silencio', 'recebido', `Silenciado (${card.silencedRounds} rodada(s))`);
  }
  if (card.burnTurnsRemaining && card.burnTurnsRemaining > 0 && !processedKeys.has('queimadura')) {
    pushItem('queimadura', 'recebido', `Queimadura (${card.burnTurnsRemaining} rodada(s))`);
  }
  if (card.freezeRoundsRemaining && card.freezeRoundsRemaining > 0 && !processedKeys.has('congelado')) {
    pushItem('congelado', 'recebido', `Congelado (${card.freezeRoundsRemaining} rodada(s))`);
  }
  if (card.eletrificadoRoundsRemaining && card.eletrificadoRoundsRemaining > 0 && !processedKeys.has('eletrificado')) {
    pushItem('eletrificado', 'recebido', `Eletrificado (${card.eletrificadoRoundsRemaining} rodada(s))`);
  }
  if (card.entorpecerRoundsRemaining && card.entorpecerRoundsRemaining > 0 && !processedKeys.has('entorpecer')) {
    pushItem('entorpecer', 'recebido', `Torpor (${card.entorpecerRoundsRemaining} rodada(s))`);
  }
  if (card.pragaRoundsRemaining && card.pragaRoundsRemaining > 0 && !processedKeys.has('praga')) {
    pushItem('praga', 'recebido', `Praga (${card.pragaRoundsRemaining} rodada(s))`);
  }
  if (card.corrosaoRoundsRemaining && card.corrosaoRoundsRemaining > 0 && !processedKeys.has('corrosao')) {
    pushItem('corrosao', 'recebido', `Corrosão (${card.corrosaoRoundsRemaining} rodada(s))`);
  }
  if (card.sangramentoRoundsRemaining && card.sangramentoRoundsRemaining > 0 && !processedKeys.has('sangramento')) {
    pushItem(
      'sangramento',
      'recebido',
      `Sangramento (${card.sangramentoRoundsRemaining}r · Marcas: ${card.sangramentoMarks || 0}/4)`
    );
  } else if (card.sangramentoMarks && card.sangramentoMarks > 0 && !processedKeys.has('hemorragia')) {
    pushItem('hemorragia', 'recebido', `Marcas de Sangramento (${card.sangramentoMarks}/4 para Hemorragia)`);
  }

  // Sort strictly: 1º Passivos -> 2º Únicos -> 3º Recebidos
  return items.sort((a, b) => a.priorityOrder - b.priorityOrder);
}
