import type { KingdomType } from '../types/game.ts';

export interface CardAvatarEntry {
  id: string;
  templateId: string;
  name: string;
  title: string;
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  kingdom: KingdomType;
  isFree: boolean;
  /** Price in Gold (premium currency, ~2.5x value relative to Crystals) */
  cost: number;
  /** Price in Crystals (standard earnable currency) */
  crystalCost: number;
  tag: string;
}

export const DEFAULT_AVATAR_ID = 'av_g_hugo';

// Proportional Avatar Prices by Tier (Gold = Crystals / 2.5):
// Tier 1: 200 Crystals / 80 Gold
// Tier 2: 350 Crystals / 140 Gold
// Tier 3: 500 Crystals / 200 Gold
// Tier 4: 700 Crystals / 280 Gold
// Tier 5: 950 Crystals / 380 Gold
export const CARD_AVATARS: CardAvatarEntry[] = [
  // =====================================================
  // AVATAR PADRÃO OBRIGATÓRIO ÚNICO (1 INICIAL)
  // =====================================================
  { id: 'av_g_hugo', templateId: 'g_hugo', name: 'Cavaleiro Hugo', title: 'Escudo da Coroa', tier: 1, kingdom: 'granty', isFree: true, cost: 0, crystalCost: 0, tag: 'Padrão' },

  // =====================================================
  // TIER 1 (17 avatares @ 200 Cristais ou 80 Ouro)
  // =====================================================
  { id: 'av_g_glauco', templateId: 'g_glauco', name: 'Glauco', title: 'Sentinela Glacial', tier: 1, kingdom: 'granty', isFree: false, cost: 80, crystalCost: 200, tag: 'Tier 1' },
  { id: 'av_g_gael', templateId: 'g_gael', name: 'Gael, o Lobo', title: 'Presa Carmesim', tier: 1, kingdom: 'granty', isFree: false, cost: 80, crystalCost: 200, tag: 'Tier 1' },
  { id: 'av_g_leo', templateId: 'g_leo', name: 'Leo', title: 'Lanceiro de Granty', tier: 1, kingdom: 'granty', isFree: false, cost: 80, crystalCost: 200, tag: 'Tier 1' },
  { id: 'av_m_celia', templateId: 'm_celia', name: 'Celia, a Bruxa do Gelo', title: 'Véu de Geada', tier: 1, kingdom: 'musmo', isFree: false, cost: 80, crystalCost: 200, tag: 'Tier 1' },
  { id: 'av_m_vilma', templateId: 'm_vilma', name: 'Vilma, a Bruxa do Fogo', title: 'Centelha de Musmo', tier: 1, kingdom: 'musmo', isFree: false, cost: 80, crystalCost: 200, tag: 'Tier 1' },
  { id: 'av_m_mara', templateId: 'm_mara', name: 'Mara', title: 'Lâmina Tempestuosa', tier: 1, kingdom: 'musmo', isFree: false, cost: 80, crystalCost: 200, tag: 'Tier 1' },
  { id: 'av_n_kyn', templateId: 'n_kyn', name: 'Kyn', title: 'Guardião da Mata', tier: 1, kingdom: 'naneya', isFree: false, cost: 80, crystalCost: 200, tag: 'Tier 1' },
  { id: 'av_n_fernando', templateId: 'n_fernando', name: 'Fernando', title: 'Vanguarda Solar', tier: 1, kingdom: 'naneya', isFree: false, cost: 80, crystalCost: 200, tag: 'Tier 1' },
  { id: 'av_n_cristalys', templateId: 'n_cristalys', name: 'Cristalys, a Fada', title: 'Brisa Cristalina', tier: 1, kingdom: 'naneya', isFree: false, cost: 80, crystalCost: 200, tag: 'Tier 1' },
  { id: 'av_n_polus', templateId: 'n_polus', name: 'Poluziel, o Arcanjo', title: 'Arauto da Geada', tier: 1, kingdom: 'naneya', isFree: false, cost: 80, crystalCost: 200, tag: 'Tier 1' },
  { id: 'av_g_fafnyr', templateId: 'g_fafnyr', name: 'Fafnyr', title: 'Escama de Ferro', tier: 1, kingdom: 'granty', isFree: false, cost: 80, crystalCost: 200, tag: 'Tier 1' },
  { id: 'av_g_ambroz', templateId: 'g_ambroz', name: 'Ambroz', title: 'Luz Consagrada', tier: 1, kingdom: 'granty', isFree: false, cost: 80, crystalCost: 200, tag: 'Tier 1' },
  { id: 'av_g_targor', templateId: 'g_targor', name: 'Targor, o Dragão', title: 'Asas do Crepúsculo', tier: 1, kingdom: 'granty', isFree: false, cost: 80, crystalCost: 200, tag: 'Tier 1' },
  { id: 'av_m_finn', templateId: 'm_finn', name: 'Finn, o Fada', title: 'Brote da Terra', tier: 1, kingdom: 'musmo', isFree: false, cost: 80, crystalCost: 200, tag: 'Tier 1' },
  { id: 'av_m_fanx', templateId: 'm_fanx', name: 'Fanael, o Arcanjo', title: 'Maré Seráfica', tier: 1, kingdom: 'musmo', isFree: false, cost: 80, crystalCost: 200, tag: 'Tier 1' },
  { id: 'av_m_bia', templateId: 'm_bia', name: 'Bia, a Fada', title: 'Sopro Dourado', tier: 1, kingdom: 'musmo', isFree: false, cost: 80, crystalCost: 200, tag: 'Tier 1' },
  { id: 'av_n_bart', templateId: 'n_bart', name: 'Bart', title: 'Faísca Indomável', tier: 1, kingdom: 'naneya', isFree: false, cost: 80, crystalCost: 200, tag: 'Tier 1' },

  // =====================================================
  // TIER 2 (12 avatares @ 350 Cristais ou 140 Ouro)
  // =====================================================
  { id: 'av_m_kore', templateId: 'm_kore', name: 'Kore', title: 'Coração Invernal', tier: 2, kingdom: 'musmo', isFree: false, cost: 140, crystalCost: 350, tag: 'Tier 2' },
  { id: 'av_m_felicia', templateId: 'm_felicia', name: 'Felicia', title: 'Orvalho Glacial', tier: 2, kingdom: 'musmo', isFree: false, cost: 140, crystalCost: 350, tag: 'Tier 2' },
  { id: 'av_g_comandante_virtus', templateId: 'g_comandante_virtus', name: 'Comandante Virtus', title: 'Flama Real', tier: 2, kingdom: 'granty', isFree: false, cost: 140, crystalCost: 350, tag: 'Tier 2' },
  { id: 'av_g_karlo', templateId: 'g_karlo', name: 'Karlo', title: 'Erudito Arcano', tier: 2, kingdom: 'granty', isFree: false, cost: 140, crystalCost: 350, tag: 'Tier 2' },
  { id: 'av_g_sebastian', templateId: 'g_sebastian', name: 'Sebastian', title: 'Lança do Trovão', tier: 2, kingdom: 'granty', isFree: false, cost: 140, crystalCost: 350, tag: 'Tier 2' },
  { id: 'av_g_lucent', templateId: 'g_lucent', name: 'Lucent', title: 'Clarão Sagrado', tier: 2, kingdom: 'granty', isFree: false, cost: 140, crystalCost: 350, tag: 'Tier 2' },
  { id: 'av_m_jasmim', templateId: 'm_jasmim', name: 'Jasmim', title: 'Flor das Águas', tier: 2, kingdom: 'musmo', isFree: false, cost: 140, crystalCost: 350, tag: 'Tier 2' },
  { id: 'av_m_moira', templateId: 'm_moira', name: 'Moira', title: 'Sombra Silenciosa', tier: 2, kingdom: 'musmo', isFree: false, cost: 140, crystalCost: 350, tag: 'Tier 2' },
  { id: 'av_m_atlaziel', templateId: 'm_atlaziel', name: 'Atlaziel, o Arcanjo Caído', title: 'Asas Quebradas', tier: 2, kingdom: 'musmo', isFree: false, cost: 140, crystalCost: 350, tag: 'Tier 2' },
  { id: 'av_n_crisol', templateId: 'n_crisol', name: 'Crisol', title: 'Forja Ardente', tier: 2, kingdom: 'naneya', isFree: false, cost: 140, crystalCost: 350, tag: 'Tier 2' },
  { id: 'av_n_charmagon', templateId: 'n_charmagon', name: 'Charmagon', title: 'Escama Abissal', tier: 2, kingdom: 'naneya', isFree: false, cost: 140, crystalCost: 350, tag: 'Tier 2' },
  { id: 'av_n_mavie', templateId: 'n_mavie', name: 'Mavie', title: 'Voz da Alvorada', tier: 2, kingdom: 'naneya', isFree: false, cost: 140, crystalCost: 350, tag: 'Tier 2' },

  // =====================================================
  // TIER 3 (12 avatares @ 500 Cristais ou 200 Ouro)
  // =====================================================
  { id: 'av_m_crizelia', templateId: 'm_crizelia', name: 'Crizelia', title: 'Imperatriz do Gelo', tier: 3, kingdom: 'musmo', isFree: false, cost: 200, crystalCost: 500, tag: 'Tier 3' },
  { id: 'av_g_bronx', templateId: 'g_bronx', name: 'Capitão Bronx', title: 'Muralha Real', tier: 3, kingdom: 'granty', isFree: false, cost: 200, crystalCost: 500, tag: 'Tier 3' },
  { id: 'av_g_lilia', templateId: 'g_lilia', name: 'Lilia, a Fada', title: 'Encanto Astral', tier: 3, kingdom: 'granty', isFree: false, cost: 200, crystalCost: 500, tag: 'Tier 3' },
  { id: 'av_g_salazar', templateId: 'g_salazar', name: 'Salazar, o Fada', title: 'Brasa Selvagem', tier: 3, kingdom: 'granty', isFree: false, cost: 200, crystalCost: 500, tag: 'Tier 3' },
  { id: 'av_g_aurora', templateId: 'g_aurora', name: 'Aurora, a Fada', title: 'Valsa Boreal', tier: 3, kingdom: 'granty', isFree: false, cost: 200, crystalCost: 500, tag: 'Tier 3' },
  { id: 'av_g_gangnyr', templateId: 'g_gangnyr', name: 'Gangnyr', title: 'Terror do Eclipse', tier: 3, kingdom: 'granty', isFree: false, cost: 200, crystalCost: 500, tag: 'Tier 3' },
  { id: 'av_m_inariel', templateId: 'm_inariel', name: 'Inariel, o Arcanjo', title: 'Chama Púrpura', tier: 3, kingdom: 'musmo', isFree: false, cost: 200, crystalCost: 500, tag: 'Tier 3' },
  { id: 'av_m_umael', templateId: 'm_umael', name: 'Umael, o Arcanjo', title: 'Relâmpago Celestial', tier: 3, kingdom: 'musmo', isFree: false, cost: 200, crystalCost: 500, tag: 'Tier 3' },
  { id: 'av_m_falanx', templateId: 'm_falanx', name: 'Falanx', title: 'Bastião Seráfico', tier: 3, kingdom: 'musmo', isFree: false, cost: 200, crystalCost: 500, tag: 'Tier 3' },
  { id: 'av_n_wyr', templateId: 'n_wyr', name: 'Wyr, o Dragão', title: 'Soberano dos Ventos', tier: 3, kingdom: 'naneya', isFree: false, cost: 200, crystalCost: 500, tag: 'Tier 3' },
  { id: 'av_n_kamui', templateId: 'n_kamui', name: 'Kamui', title: 'Espírito Juramentado', tier: 3, kingdom: 'naneya', isFree: false, cost: 200, crystalCost: 500, tag: 'Tier 3' },
  { id: 'av_g_herox', templateId: 'g_herox', name: 'Herox, o Vigilante', title: 'Olho do Cosmos', tier: 3, kingdom: 'granty', isFree: false, cost: 200, crystalCost: 500, tag: 'Tier 3' },

  // =====================================================
  // TIER 4 (10 avatares @ 700 Cristais ou 280 Ouro)
  // =====================================================
  { id: 'av_m_juci', templateId: 'm_juci', name: 'Juci, a Dragoa', title: 'Sopro Ártico', tier: 4, kingdom: 'musmo', isFree: false, cost: 280, crystalCost: 700, tag: 'Tier 4' },
  { id: 'av_m_lamina_inverno', templateId: 'm_lamina_inverno', name: 'A Lâmina do Inverno', title: 'Aço Subzero', tier: 4, kingdom: 'musmo', isFree: false, cost: 280, crystalCost: 700, tag: 'Tier 4' },
  { id: 'av_g_bor', templateId: 'g_bor', name: 'General Bor', title: 'Fúria de Granty', tier: 4, kingdom: 'granty', isFree: false, cost: 280, crystalCost: 700, tag: 'Tier 4' },
  { id: 'av_g_rainha_liz', templateId: 'g_rainha_liz', name: 'Rainha Liz', title: 'Coroa Arcana', tier: 4, kingdom: 'granty', isFree: false, cost: 280, crystalCost: 700, tag: 'Tier 4' },
  { id: 'av_g_vergor', templateId: 'g_vergor', name: 'Vergor', title: 'Juízo Dourado', tier: 4, kingdom: 'granty', isFree: false, cost: 280, crystalCost: 700, tag: 'Tier 4' },
  { id: 'av_m_cavaleiro_sem_nome', templateId: 'm_cavaleiro_sem_nome', name: 'Cavaleiro sem Nome', title: 'Juramento Esquecido', tier: 4, kingdom: 'musmo', isFree: false, cost: 280, crystalCost: 700, tag: 'Tier 4' },
  { id: 'av_m_rei_mauricio', templateId: 'm_rei_mauricio', name: 'Rei Mauricio', title: 'Trono de Musmo', tier: 4, kingdom: 'musmo', isFree: false, cost: 280, crystalCost: 700, tag: 'Tier 4' },
  { id: 'av_m_hamelia', templateId: 'm_hamelia', name: 'Hamelia, a Fada Pútrida', title: 'Pétala Sombria', tier: 4, kingdom: 'musmo', isFree: false, cost: 280, crystalCost: 700, tag: 'Tier 4' },
  { id: 'av_n_zael', templateId: 'n_zael', name: 'Zael, o Arcanjo', title: 'Véu Estelar', tier: 4, kingdom: 'naneya', isFree: false, cost: 280, crystalCost: 700, tag: 'Tier 4' },
  { id: 'av_g_zyk', templateId: 'g_zyk', name: 'Zyk, o Dragão', title: 'Vórtice Cósmico', tier: 4, kingdom: 'granty', isFree: false, cost: 280, crystalCost: 700, tag: 'Tier 4' },

  // =====================================================
  // TIER 5 LENDÁRIO (8 avatares @ 950 Cristais ou 380 Ouro)
  // =====================================================
  { id: 'av_m_bonetrus', templateId: 'm_bonetrus', name: 'Bonetrus', title: 'Soberano do Inverno', tier: 5, kingdom: 'musmo', isFree: false, cost: 380, crystalCost: 950, tag: 'Tier 5 Lendário' },
  { id: 'av_g_barao_well', templateId: 'g_barao_well', name: 'Barão Well', title: 'Senhor da Tempestade', tier: 5, kingdom: 'granty', isFree: false, cost: 380, crystalCost: 950, tag: 'Tier 5 Lendário' },
  { id: 'av_g_craff', templateId: 'g_craff', name: 'Craff', title: 'Colosso Rúnico', tier: 5, kingdom: 'granty', isFree: false, cost: 380, crystalCost: 950, tag: 'Tier 5 Lendário' },
  { id: 'av_g_kaliel', templateId: 'g_kaliel', name: 'Kaliel, o Arcanjo', title: 'Chama da Aliança', tier: 5, kingdom: 'granty', isFree: false, cost: 380, crystalCost: 950, tag: 'Tier 5 Lendário' },
  { id: 'av_m_licia', templateId: 'm_licia', name: 'Licia, a Fada', title: 'Guardiã do Véu', tier: 5, kingdom: 'musmo', isFree: false, cost: 380, crystalCost: 950, tag: 'Tier 5 Lendário' },
  { id: 'av_m_titano', templateId: 'm_titano', name: 'Titano, o Carrasco dos Mares', title: 'Flagelo Abissal', tier: 5, kingdom: 'musmo', isFree: false, cost: 380, crystalCost: 950, tag: 'Tier 5 Lendário' },
  { id: 'av_n_saniel', templateId: 'n_saniel', name: 'Saniel, o Arcanjo', title: 'Colheita Celestial', tier: 5, kingdom: 'naneya', isFree: false, cost: 380, crystalCost: 950, tag: 'Tier 5 Lendário' },
  { id: 'av_n_helio', templateId: 'n_helio', name: 'Hélio, o Emissário do Sol', title: 'Arauto Solar', tier: 5, kingdom: 'naneya', isFree: false, cost: 380, crystalCost: 950, tag: 'Tier 5 Lendário' },
];

export const FREE_AVATAR_IDS: string[] = CARD_AVATARS.filter((a) => a.isFree).map((a) => a.id);
export const PAID_AVATARS: CardAvatarEntry[] = CARD_AVATARS.filter((a) => !a.isFree);

export function getAvatarById(avatarId?: string | null): CardAvatarEntry {
  if (!avatarId) return CARD_AVATARS[0];
  return CARD_AVATARS.find((a) => a.id === avatarId) ?? CARD_AVATARS[0];
}
