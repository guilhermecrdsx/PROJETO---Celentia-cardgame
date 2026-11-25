import React, { useEffect, useRef } from 'react';
import {
  Sparkles,
  Flame,
  Swords,
  Ghost,
  Wind,
  Shield,
  VolumeX,
  EyeOff,
  Crown,
  Droplets,
  Zap,
  Moon,
  Feather,
  Star,
  Orbit,
  Gavel,
  Mountain,
  Sun,
  Snowflake,
} from 'lucide-react';
import { sound } from '../services/soundEffects';
import { useVisualPreferences } from '../utils/visualTheme';

export type SkillVfxType =
  | 'g_enganar'
  | 'm_moral'
  | 'n_labareda_solar'
  | 'g_desafio_real'
  | 'm_voto_caidos'
  | 'n_destreza'
  | 'n_voto_estrelas'
  | 'g_voto_silencio'
  | 'g_sabedoria_cosmica'
  | 'm_chamado_vitoria'
  | 'm_fome_insaciavel'
  | 'm_grao_mestre'
  | 'n_jurisdicao_de_saniel'
  | 'm_letargia_lunar'
  | 'g_soberania'
  | 'g_concessao_divina'
  | 'n_escolhido_estrelas'
  | 'n_voto_do_absoluto'
  | 'n_veto_do_indomito'
  | 'token_flecha_eletrica'
  | 'token_fagulha_estelar'
  | 'g_rochedo'
  | 'cond_etereo'
  | 'm_destino_fatal'
  | 'token_centelha'
  | 'token_filho_da_luz'
  | 'n_encantar'
  | 'g_oceanico'
  | 'n_apoteose'
  | 'g_toque_igneo'
  | 'n_forca_natureza'
  | 'm_estatico'
  | 'm_nevasca';

export interface SkillVfxState {
  id: string;
  skillType: SkillVfxType;
  targetSide: 'player' | 'opponent' | 'center';
  targetUnitId?: string;
  targetName?: string;
  isAuroraIce?: boolean;
}

interface SkillAnimationsOverlayProps {
  vfx: SkillVfxState | null;
  onComplete?: () => void;
}

/**
 * Efeito Visual Persistente de CONCESSÃO DIVINA (Ressurreição ativa):
 * "Um grande brilho divino e asas de arcanjo ficam em volta do alvo até que o efeito termine."
 */
export const DivineArchangelAura: React.FC = () => {
  const { animationMode, ambientAnimations } = useVisualPreferences();
  const isStaticOrOff = animationMode !== 'full' || !ambientAnimations;
  return (
    <div
      className="pointer-events-none absolute -inset-4 z-0 flex items-center justify-center select-none"
      aria-hidden="true"
    >
      {/* Grande Brilho Divino Radiante em volta da carta */}
      <div
        className={`absolute inset-1 rounded-2xl ${isStaticOrOff ? '' : 'animate-pulse'}`}
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(254, 240, 138, 0.52) 0%, rgba(251, 191, 36, 0.28) 55%, transparent 80%)',
          boxShadow: isStaticOrOff
            ? '0 0 12px 2px rgba(251, 191, 36, 0.45)'
            : '0 0 28px 6px rgba(251, 191, 36, 0.65), inset 0 0 18px rgba(254, 249, 195, 0.75)',
        }}
      />

      {/* Halo Celestial Superior */}
      <div
        className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-16 h-3.5 rounded-full border-2 border-amber-200/95"
        style={{
          boxShadow: '0 0 14px #fde047, inset 0 0 8px #fef08a',
          background: 'radial-gradient(ellipse at center, rgba(254,249,195,0.35), transparent 75%)',
        }}
      />

      {/* Asas de Arcanjo Douradas & Brancas (Esquerda e Direita) */}
      <svg
        viewBox="0 0 240 160"
        className="w-[155%] h-[125%] max-w-none drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="archangelWingGradL" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="archangelWingGradR" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>

        {/* Asa de Arcanjo Esquerda (3 camadas de penas celestiais) */}
        <g className="origin-[85px_85px] animate-[pulse_2.4s_ease-in-out_infinite]">
          <path
            d="M82 78 C55 42, 22 22, 4 28 C14 46, 28 58, 48 66 C24 62, 10 68, 3 80 C20 86, 42 86, 62 84 C36 92, 20 104, 14 118 C34 116, 58 104, 82 92 Z"
            fill="url(#archangelWingGradL)"
            stroke="#fef9c3"
            strokeWidth="1.5"
            opacity="0.92"
          />
          <path
            d="M78 66 C56 36, 28 14, 12 16 C22 34, 42 48, 66 58 Z"
            fill="#ffffff"
            opacity="0.85"
          />
        </g>

        {/* Asa de Arcanjo Direita (Espelhada) */}
        <g className="origin-[155px_85px] animate-[pulse_2.4s_ease-in-out_infinite]">
          <path
            d="M158 78 C185 42, 218 22, 236 28 C226 46, 212 58, 192 66 C216 62, 230 68, 237 80 C220 86, 198 86, 178 84 C204 92, 220 104, 226 118 C206 116, 182 104, 158 92 Z"
            fill="url(#archangelWingGradR)"
            stroke="#fef9c3"
            strokeWidth="1.5"
            opacity="0.92"
          />
          <path
            d="M162 66 C184 36, 212 14, 228 16 C218 34, 198 48, 174 58 Z"
            fill="#ffffff"
            opacity="0.85"
          />
        </g>
      </svg>
    </div>
  );
};

const SKILL_META: Record<
  SkillVfxType,
  {
    title: string;
    subtitle: string;
    effectBadge: string;
    borderColor: string;
    glowColor: string;
    textColor: string;
    vignette: string;
    durationMs: number;
  }
> = {
  g_enganar: {
    title: 'Enganar',
    subtitle: 'Véu Espectral de Furtividade',
    effectBadge: '👤 FURTIVO INTEGRADO',
    borderColor: 'border-purple-400',
    glowColor: 'rgba(168, 85, 247, 0.9)',
    textColor: 'text-purple-200',
    vignette:
      'radial-gradient(ellipse at center, transparent 48%, rgba(88, 28, 135, 0.34) 82%, rgba(59, 7, 100, 0.62) 100%)',
    durationMs: 2250,
  },
  m_moral: {
    title: 'Levantar Moral',
    subtitle: 'Corneta Real da Bravura',
    effectBadge: '🎺 🔥 BRAVURA · +3 ATAQUE',
    borderColor: 'border-amber-300',
    glowColor: 'rgba(251, 191, 36, 0.9)',
    textColor: 'text-amber-200',
    vignette:
      'radial-gradient(ellipse at center, transparent 50%, rgba(180, 83, 9, 0.25) 82%, rgba(245, 158, 11, 0.48) 100%)',
    durationMs: 2300,
  },
  n_labareda_solar: {
    title: 'Labareda Solar',
    subtitle: 'Pilar de Fogo & Torpor Solar',
    effectBadge: '☀️ -8 DANO · 🌀 TORPOR (2 RODADAS)',
    borderColor: 'border-orange-400',
    glowColor: 'rgba(249, 115, 22, 0.95)',
    textColor: 'text-orange-200',
    vignette:
      'radial-gradient(ellipse at center, transparent 45%, rgba(194, 65, 12, 0.32) 80%, rgba(251, 146, 60, 0.56) 100%)',
    durationMs: 2400,
  },
  g_desafio_real: {
    title: 'Desafio Real',
    subtitle: 'Cruzamento de Ferro & Honra',
    effectBadge: '⚔️ ENFRENTAR CONCEDIDO',
    borderColor: 'border-amber-400',
    glowColor: 'rgba(245, 158, 11, 0.9)',
    textColor: 'text-amber-100',
    vignette:
      'radial-gradient(ellipse at center, transparent 52%, rgba(120, 53, 15, 0.26) 82%, rgba(217, 119, 6, 0.46) 100%)',
    durationMs: 2150,
  },
  m_voto_caidos: {
    title: 'Voto dos Caídos',
    subtitle: 'Investida do Espectro Branco',
    effectBadge: '👻 ⚡ ATORDOADO POR 1 RODADA',
    borderColor: 'border-slate-200',
    glowColor: 'rgba(226, 232, 240, 0.95)',
    textColor: 'text-slate-100',
    vignette:
      'radial-gradient(ellipse at center, transparent 48%, rgba(51, 65, 85, 0.36) 80%, rgba(226, 232, 240, 0.52) 100%)',
    durationMs: 2250,
  },
  n_destreza: {
    title: 'Destreza',
    subtitle: 'Lâmina Corta-Vento Dupla',
    effectBadge: '⚔️⚔️ ATAQUE-DUPLO (1 RODADA)',
    borderColor: 'border-emerald-300',
    glowColor: 'rgba(52, 211, 153, 0.9)',
    textColor: 'text-emerald-200',
    vignette:
      'radial-gradient(ellipse at center, transparent 52%, rgba(6, 95, 70, 0.26) 82%, rgba(52, 211, 153, 0.45) 100%)',
    durationMs: 2100,
  },
  n_voto_estrelas: {
    title: 'Voto das Estrelas',
    subtitle: 'Esfera Cósmica Estelar',
    effectBadge: '🛡️✨ BARREIRA CELESTIAL',
    borderColor: 'border-cyan-300',
    glowColor: 'rgba(56, 189, 248, 0.95)',
    textColor: 'text-cyan-100',
    vignette:
      'radial-gradient(ellipse at center, transparent 48%, rgba(30, 58, 138, 0.32) 80%, rgba(56, 189, 248, 0.50) 100%)',
    durationMs: 2350,
  },
  g_voto_silencio: {
    title: 'Voto do Silêncio',
    subtitle: 'Selo Gigante de Anulação Arcana',
    effectBadge: '🔇 PODER ZERADO EM TODA A MESA',
    borderColor: 'border-fuchsia-400',
    glowColor: 'rgba(217, 70, 239, 0.92)',
    textColor: 'text-fuchsia-200',
    vignette:
      'radial-gradient(ellipse at center, transparent 40%, rgba(74, 4, 78, 0.38) 78%, rgba(192, 38, 211, 0.55) 100%)',
    durationMs: 2550,
  },
  g_sabedoria_cosmica: {
    title: 'Sabedoria Cósmica',
    subtitle: 'Mandala Astral da Imunidade',
    effectBadge: '🌟 IMUNIDADE CÓSMICA (2 RODADAS)',
    borderColor: 'border-indigo-300',
    glowColor: 'rgba(129, 140, 248, 0.95)',
    textColor: 'text-indigo-100',
    vignette:
      'radial-gradient(ellipse at center, transparent 48%, rgba(49, 46, 129, 0.34) 80%, rgba(165, 180, 252, 0.52) 100%)',
    durationMs: 2350,
  },
  m_chamado_vitoria: {
    title: 'Chamado da Vitória',
    subtitle: 'Portais Dourados de Convocação Real',
    effectBadge: '📯✨ +3 UNIDADES DO BARALHO À MESA',
    borderColor: 'border-amber-300',
    glowColor: 'rgba(251, 191, 36, 0.95)',
    textColor: 'text-amber-100',
    vignette:
      'radial-gradient(ellipse at center, transparent 42%, rgba(180, 83, 9, 0.32) 78%, rgba(251, 191, 36, 0.55) 100%)',
    durationMs: 2550,
  },
  m_fome_insaciavel: {
    title: 'Fome Insaciável',
    subtitle: 'Convergência Carmesim Sanguinária',
    effectBadge: '🩸 ROUBO DE VIDA · +10 PODER',
    borderColor: 'border-rose-500',
    glowColor: 'rgba(225, 29, 72, 0.95)',
    textColor: 'text-rose-200',
    vignette:
      'radial-gradient(ellipse at center, transparent 46%, rgba(136, 19, 55, 0.38) 80%, rgba(225, 29, 72, 0.62) 100%)',
    durationMs: 2350,
  },
  m_grao_mestre: {
    title: 'Grão-Mestre',
    subtitle: 'Estrela Tripla de Lâminas Soberanas',
    effectBadge: '⚔️⭐ CRÍTICO · +15 PODER',
    borderColor: 'border-amber-300',
    glowColor: 'rgba(245, 158, 11, 0.95)',
    textColor: 'text-amber-100',
    vignette:
      'radial-gradient(ellipse at center, transparent 48%, rgba(146, 64, 14, 0.30) 80%, rgba(251, 191, 36, 0.52) 100%)',
    durationMs: 2350,
  },
  n_jurisdicao_de_saniel: {
    title: 'Jurisdição de Saniel',
    subtitle: 'Raio do Julgamento Celestial',
    effectBadge: '⚡🔇 SILENCIADO POR 2 RODADAS',
    borderColor: 'border-yellow-200',
    glowColor: 'rgba(253, 224, 71, 0.98)',
    textColor: 'text-yellow-100',
    vignette:
      'radial-gradient(ellipse at center, transparent 44%, rgba(161, 98, 7, 0.34) 78%, rgba(254, 240, 138, 0.58) 100%)',
    durationMs: 2400,
  },
  m_letargia_lunar: {
    title: 'Letargia Lunar',
    subtitle: 'Feixes de Luar do Adormecimento',
    effectBadge: '🌙💤 SONO LUNAR APLICADO',
    borderColor: 'border-indigo-300',
    glowColor: 'rgba(129, 140, 248, 0.95)',
    textColor: 'text-indigo-100',
    vignette:
      'radial-gradient(ellipse at center, transparent 44%, rgba(30, 27, 75, 0.45) 78%, rgba(99, 102, 241, 0.62) 100%)',
    durationMs: 2500,
  },
  g_soberania: {
    title: 'Soberania',
    subtitle: 'Honraria & Investidura da Realeza',
    effectBadge: '👑 +15 ATAQUE · +15 DEFESA',
    borderColor: 'border-amber-400',
    glowColor: 'rgba(245, 158, 11, 0.95)',
    textColor: 'text-amber-100',
    vignette:
      'radial-gradient(ellipse at center, transparent 46%, rgba(120, 53, 15, 0.34) 78%, rgba(245, 158, 11, 0.56) 100%)',
    durationMs: 2450,
  },
  g_concessao_divina: {
    title: 'Concessão Divina',
    subtitle: 'Graça do Arcanjo & Brilho Imortal',
    effectBadge: '🪽✨ RESSURREIÇÃO CONCEDIDA',
    borderColor: 'border-amber-200',
    glowColor: 'rgba(254, 240, 138, 0.98)',
    textColor: 'text-amber-100',
    vignette:
      'radial-gradient(ellipse at center, transparent 42%, rgba(180, 83, 9, 0.28) 76%, rgba(254, 240, 138, 0.58) 100%)',
    durationMs: 2600,
  },
  n_escolhido_estrelas: {
    title: 'Escolhido das Estrelas',
    subtitle: 'Incorporação Astral de Ascensão',
    effectBadge: '🌟⬆️ ASCENSÃO IMEDIATA AO NÍVEL 2',
    borderColor: 'border-cyan-300',
    glowColor: 'rgba(56, 189, 248, 0.96)',
    textColor: 'text-cyan-100',
    vignette:
      'radial-gradient(ellipse at center, transparent 44%, rgba(30, 58, 138, 0.36) 78%, rgba(56, 189, 248, 0.56) 100%)',
    durationMs: 2550,
  },
  n_voto_do_absoluto: {
    title: 'Voto do Absoluto',
    subtitle: 'Horizonte de Eventos Devorador',
    effectBadge: '🕳️💀 UNIDADE OBLITERADA',
    borderColor: 'border-purple-400',
    glowColor: 'rgba(147, 51, 234, 0.96)',
    textColor: 'text-purple-200',
    vignette:
      'radial-gradient(ellipse at center, transparent 35%, rgba(15, 7, 28, 0.58) 75%, rgba(88, 28, 135, 0.78) 100%)',
    durationMs: 2650,
  },
  n_veto_do_indomito: {
    title: 'Veto do Indômito',
    subtitle: 'Sentença do Tribunal Divino',
    effectBadge: '⚖️🔨 HABILIDADE INIMIGA VETADA',
    borderColor: 'border-amber-300',
    glowColor: 'rgba(251, 191, 36, 0.96)',
    textColor: 'text-amber-100',
    vignette:
      'radial-gradient(ellipse at center, transparent 44%, rgba(120, 53, 15, 0.38) 78%, rgba(251, 191, 36, 0.58) 100%)',
    durationMs: 2450,
  },
  token_flecha_eletrica: {
    title: 'Flecha Elétrica',
    subtitle: 'Disparo Fulminante de Alta Voltagem',
    effectBadge: '🏹⚡ -9 DANO + ELETRIFICADO 1R',
    borderColor: 'border-cyan-300',
    glowColor: 'rgba(34, 211, 238, 0.96)',
    textColor: 'text-cyan-100',
    vignette:
      'radial-gradient(ellipse at center, transparent 45%, rgba(8, 51, 68, 0.38) 78%, rgba(34, 211, 238, 0.58) 100%)',
    durationMs: 2250,
  },
  token_fagulha_estelar: {
    title: 'Fagulha Estelar',
    subtitle: 'Duas Estrelas Cadentes em Sequência',
    effectBadge: '🌠✨ 2x ESTRELAS CADENTES (3 + 3 DANO)',
    borderColor: 'border-sky-300',
    glowColor: 'rgba(56, 189, 248, 0.96)',
    textColor: 'text-sky-100',
    vignette:
      'radial-gradient(ellipse at center, transparent 44%, rgba(30, 27, 75, 0.42) 78%, rgba(56, 189, 248, 0.58) 100%)',
    durationMs: 2450,
  },
  g_rochedo: {
    title: 'Rochedo',
    subtitle: 'Colossal Rocha Mágica Telúrica',
    effectBadge: '🪨✨ -5 DANO · -25% ATAQUE',
    borderColor: 'border-emerald-400',
    glowColor: 'rgba(16, 185, 129, 0.94)',
    textColor: 'text-emerald-100',
    vignette:
      'radial-gradient(ellipse at center, transparent 44%, rgba(68, 64, 60, 0.44) 78%, rgba(16, 185, 129, 0.52) 100%)',
    durationMs: 2400,
  },
  cond_etereo: {
    title: 'Etéreo',
    subtitle: 'Véu Astral Translúcido',
    effectBadge: '✨🌌 FORMA ETÉREA · SÓ BLOQUEÁVEL POR ETÉREOS',
    borderColor: 'border-cyan-300',
    glowColor: 'rgba(34, 211, 238, 0.92)',
    textColor: 'text-cyan-100',
    vignette:
      'radial-gradient(ellipse at center, transparent 48%, rgba(8, 51, 68, 0.34) 82%, rgba(30, 27, 75, 0.62) 100%)',
    durationMs: 2250,
  },
  m_destino_fatal: {
    title: 'Destino Fatal',
    subtitle: 'Sentença de Execução Imediata',
    effectBadge: '💀⚔️ EXECUTAR (IGNORA VIDA E DEFESA)',
    borderColor: 'border-red-500',
    glowColor: 'rgba(220, 38, 38, 0.96)',
    textColor: 'text-red-200',
    vignette:
      'radial-gradient(ellipse at center, transparent 38%, rgba(127, 29, 29, 0.48) 78%, rgba(69, 10, 10, 0.78) 100%)',
    durationMs: 2250,
  },
  token_centelha: {
    title: 'Centelha',
    subtitle: 'Clarão Sagrado Fulminante',
    effectBadge: '✨⚡ 15 DANO (30 SE ATORDOADO) · TORPOR 2R',
    borderColor: 'border-amber-300',
    glowColor: 'rgba(251, 191, 36, 0.96)',
    textColor: 'text-amber-100',
    vignette:
      'radial-gradient(ellipse at center, transparent 46%, rgba(180, 83, 9, 0.34) 78%, rgba(251, 191, 36, 0.56) 100%)',
    durationMs: 2150,
  },
  token_filho_da_luz: {
    title: 'Filho da Luz',
    subtitle: 'Restauração Plena do Arcanjo',
    effectBadge: '🪽✨ RESISTÊNCIA 100% RESTAURADA',
    borderColor: 'border-yellow-200',
    glowColor: 'rgba(254, 240, 138, 0.98)',
    textColor: 'text-yellow-100',
    vignette:
      'radial-gradient(ellipse at center, transparent 54%, rgba(202, 138, 4, 0.20) 82%, rgba(251, 191, 36, 0.34) 100%)',
    durationMs: 2250,
  },
  n_encantar: {
    title: 'Encantar',
    subtitle: 'Infusão Arcana de Classe',
    effectBadge: '✨🔮 CLASSE MÁGICO CONCEDIDA',
    borderColor: 'border-purple-400',
    glowColor: 'rgba(168, 85, 247, 0.94)',
    textColor: 'text-purple-200',
    vignette:
      'radial-gradient(ellipse at center, transparent 48%, rgba(88, 28, 135, 0.36) 80%, rgba(147, 51, 234, 0.58) 100%)',
    durationMs: 2150,
  },
  g_oceanico: {
    title: 'Oceânico',
    subtitle: 'Batismo das Marés Profundas',
    effectBadge: '💧🌊 CLASSE ÁGUA CONCEDIDA',
    borderColor: 'border-sky-400',
    glowColor: 'rgba(56, 189, 248, 0.94)',
    textColor: 'text-sky-200',
    vignette:
      'radial-gradient(ellipse at center, transparent 48%, rgba(7, 89, 133, 0.36) 80%, rgba(14, 165, 233, 0.58) 100%)',
    durationMs: 2150,
  },
  n_apoteose: {
    title: 'Apoteose',
    subtitle: 'Ascensão à Essência Divina',
    effectBadge: '☀️🪽 CLASSE DIVINO CONCEDIDA',
    borderColor: 'border-amber-200',
    glowColor: 'rgba(253, 224, 71, 0.96)',
    textColor: 'text-amber-100',
    vignette:
      'radial-gradient(ellipse at center, transparent 44%, rgba(180, 83, 9, 0.30) 78%, rgba(254, 240, 138, 0.56) 100%)',
    durationMs: 2250,
  },
  g_toque_igneo: {
    title: 'Toque Ígneo',
    subtitle: 'Forja Solar das Chamas Vivas',
    effectBadge: '🔥 CLASSE FOGO CONCEDIDA',
    borderColor: 'border-orange-400',
    glowColor: 'rgba(249, 115, 22, 0.95)',
    textColor: 'text-orange-200',
    vignette:
      'radial-gradient(ellipse at center, transparent 46%, rgba(154, 52, 18, 0.34) 80%, rgba(249, 115, 22, 0.58) 100%)',
    durationMs: 2150,
  },
  n_forca_natureza: {
    title: 'Força da Natureza',
    subtitle: 'Raízes Ancestrais da Terra',
    effectBadge: '🌿🪨 CLASSE TELÚRICO CONCEDIDA',
    borderColor: 'border-emerald-400',
    glowColor: 'rgba(16, 185, 129, 0.94)',
    textColor: 'text-emerald-200',
    vignette:
      'radial-gradient(ellipse at center, transparent 46%, rgba(6, 78, 59, 0.36) 80%, rgba(16, 185, 129, 0.56) 100%)',
    durationMs: 2150,
  },
  m_estatico: {
    title: 'Estático',
    subtitle: 'Jaula de Alta Voltagem',
    effectBadge: '⚡ CLASSE ELÉTRICO CONCEDIDA',
    borderColor: 'border-yellow-300',
    glowColor: 'rgba(250, 204, 21, 0.96)',
    textColor: 'text-yellow-100',
    vignette:
      'radial-gradient(ellipse at center, transparent 46%, rgba(113, 63, 18, 0.34) 80%, rgba(250, 204, 21, 0.54) 100%)',
    durationMs: 2150,
  },
  m_nevasca: {
    title: 'Nevasca',
    subtitle: 'Vórtice Glacial Eterno',
    effectBadge: '❄️ CLASSE GELO CONCEDIDA',
    borderColor: 'border-cyan-300',
    glowColor: 'rgba(103, 232, 249, 0.95)',
    textColor: 'text-cyan-100',
    vignette:
      'radial-gradient(ellipse at center, transparent 46%, rgba(22, 78, 99, 0.38) 80%, rgba(103, 232, 249, 0.58) 100%)',
    durationMs: 2200,
  },
};

export const SkillAnimationsOverlay: React.FC<SkillAnimationsOverlayProps> = ({
  vfx,
  onComplete,
}) => {
  const { animationMode, skillAndUnitVfx } = useVisualPreferences();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const isOff = animationMode === 'off' || !skillAndUnitVfx;
  const isStatic = !isOff && animationMode === 'static';

  useEffect(() => {
    if (!vfx?.id) return;

    const meta = SKILL_META[vfx.skillType];
    const totalDuration = isOff ? 50 : isStatic ? 780 : meta?.durationMs || 2200;
    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      onCompleteRef.current?.();
    };
    const safetyTimer = window.setTimeout(finish, isOff ? 50 : isStatic ? 780 : totalDuration + 250);

    // Dispara o efeito sonoro específico da carta de habilidade
    try {
      switch (vfx.skillType) {
        case 'g_enganar':
          sound.playSkillEnganar();
          break;
        case 'm_moral':
          sound.playSkillLevantarMoral();
          break;
        case 'n_labareda_solar':
          sound.playSkillLabaredaSolar();
          break;
        case 'g_desafio_real':
          sound.playSkillDesafioReal();
          break;
        case 'm_voto_caidos':
          sound.playSkillVotoCaidos();
          break;
        case 'n_destreza':
          sound.playSkillDestreza();
          break;
        case 'n_voto_estrelas':
          sound.playSkillVotoEstrelas();
          break;
        case 'g_voto_silencio':
          sound.playSkillVotoSilencio();
          break;
        case 'g_sabedoria_cosmica':
          sound.playSkillSabedoriaCosmica();
          break;
        case 'm_chamado_vitoria':
          sound.playSkillChamadoVitoria();
          break;
        case 'm_fome_insaciavel':
          sound.playSkillFomeInsaciavel();
          break;
        case 'm_grao_mestre':
          sound.playSkillGraoMestre();
          break;
        case 'n_jurisdicao_de_saniel':
          sound.playSkillJurisdicaoSaniel();
          break;
        case 'm_letargia_lunar':
          sound.playSkillLetargiaLunar();
          break;
        case 'g_soberania':
          sound.playSkillSoberania();
          break;
        case 'g_concessao_divina':
          sound.playSkillConcessaoDivina();
          break;
        case 'n_escolhido_estrelas':
          sound.playSkillEscolhidoEstrelas();
          break;
        case 'n_voto_do_absoluto':
          sound.playSkillVotoAbsoluto();
          break;
        case 'n_veto_do_indomito':
          sound.playSkillVetoIndomito();
          break;
        case 'token_flecha_eletrica':
          sound.playSkillFlechaEletrica();
          break;
        case 'token_fagulha_estelar':
          sound.playSkillFagulhaEstelar();
          break;
        case 'g_rochedo':
          sound.playSkillRochedo();
          break;
        case 'cond_etereo':
          sound.playSkillEnganar();
          break;
        case 'm_destino_fatal':
          sound.playSkillDestinoFatal();
          break;
        case 'token_centelha':
          sound.playSkillCentelha();
          break;
        case 'token_filho_da_luz':
          sound.playSkillFilhoDaLuz();
          break;
        case 'n_encantar':
          sound.playSkillEncantar();
          break;
        case 'g_oceanico':
          sound.playSkillOceanico();
          break;
        case 'n_apoteose':
          sound.playSkillApoteose();
          break;
        case 'g_toque_igneo':
          sound.playSkillToqueIgneo();
          break;
        case 'n_forca_natureza':
          sound.playSkillForcaNatureza();
          break;
        case 'm_estatico':
          sound.playSkillEstatico();
          break;
        case 'm_nevasca':
          sound.playSkillNevasca();
          break;
      }
    } catch {
      // Ignora bloqueio de áudio antes de interação do usuário
    }

    if (isOff || isStatic) {
      return () => {
        completed = true;
        window.clearTimeout(safetyTimer);
      };
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return () => {
        completed = true;
        window.clearTimeout(safetyTimer);
      };
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return () => {
        completed = true;
        window.clearTimeout(safetyTimer);
      };
    }

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Localiza a posição exata da carta alvo na tela (se existir no DOM)
    let targetX = width / 2;
    let targetY =
      vfx.targetSide === 'opponent'
        ? height * 0.30
        : vfx.targetSide === 'player'
        ? height * 0.67
        : height * 0.50;
    let cardW = 132;
    let cardH = 186;

    if (vfx.targetUnitId && typeof document !== 'undefined') {
      const el = document.querySelector(`[data-unit-instance-id="${vfx.targetUnitId}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 10 && rect.height > 10) {
          targetX = rect.left + rect.width / 2;
          targetY = rect.top + rect.height / 2;
          cardW = rect.width;
          cardH = rect.height;
        }
      }
    }

    const startTime = performance.now();

    // Sementes determinísticas/pré-alocadas para partículas fluidas
    const particles = Array.from({ length: 85 }, (_, i) => ({
      angle: (Math.PI * 2 * i) / 85 + Math.random() * 0.3,
      dist: 20 + Math.random() * 190,
      speed: 1.5 + Math.random() * 4.5,
      size: 3 + Math.random() * 7,
      phase: Math.random() * Math.PI * 2,
      yOffset: (Math.random() - 0.5) * 220,
      xOffset: (Math.random() - 0.5) * 180,
    }));

    const drawFourPointStar = (cx: number, cy: number, r: number, color: string, rot = 0) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.lineTo(Math.cos(a + Math.PI / 4) * (r * 0.28), Math.sin(a + Math.PI / 4) * (r * 0.28));
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawFloatingBadge = (cx: number, cy: number, text: string, strokeCol: string, textCol: string, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '900 12px Cinzel, serif';
      const metrics = ctx.measureText(text);
      const bw = Math.max(150, metrics.width + 28);
      const bh = 26;
      ctx.fillStyle = 'rgba(9, 8, 16, 0.92)';
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = strokeCol;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, 8);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = textCol;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, cx, cy + 1);
      ctx.restore();
    };

    const drawCardHighlight = (cx: number, cy: number, strokeCol: string, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 4;
      ctx.shadowColor = strokeCol;
      ctx.shadowBlur = 26;
      ctx.beginPath();
      ctx.roundRect(cx - cardW / 2 - 4, cy - cardH / 2 - 4, cardW + 8, cardH + 8, 12);
      ctx.stroke();
      ctx.restore();
    };

    const animate = (now: number) => {
      if (completed) return;
      const elapsed = Math.max(0, now - startTime);
      const progress = Math.max(0, Math.min(1, elapsed / totalDuration));
      const timeSec = elapsed * 0.001;

      const masterAlpha = Math.max(
        0,
        Math.min(
          1,
          progress < 0.08
            ? progress / 0.08
            : progress > 0.84
            ? (1 - progress) / 0.16
            : 1
        )
      );

      ctx.clearRect(0, 0, width, height);

      try {

      // ============================================================================
      // 1. ENGANAR (Furtividade) & ETÉREO (Recolorido em Ciano/Astral Espectral)
      // ============================================================================
      if (vfx.skillType === 'g_enganar' || vfx.skillType === 'cond_etereo') {
        const isEtereo = vfx.skillType === 'cond_etereo';
        ctx.save();

        const mergeProgress = Math.min(1, progress / 0.62);
        const easeIn = mergeProgress * mergeProgress * (3 - 2 * mergeProgress);

        // Aura sombria/astral sob a carta selecionada
        const groundGrad = ctx.createRadialGradient(targetX, targetY, 8, targetX, targetY, cardW * 1.55);
        groundGrad.addColorStop(0, isEtereo ? `rgba(34, 211, 238, ${0.58 * masterAlpha})` : `rgba(147, 51, 234, ${0.58 * masterAlpha})`);
        groundGrad.addColorStop(0.55, isEtereo ? `rgba(99, 102, 241, ${0.38 * masterAlpha})` : `rgba(88, 28, 135, ${0.38 * masterAlpha})`);
        groundGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = groundGrad;
        ctx.beginPath();
        ctx.arc(targetX, targetY, cardW * 1.55, 0, Math.PI * 2);
        ctx.fill();

        // 7 Espíritos/Tentáculos Espectrais convergindo e se integrando à carta
        const wraithCount = 7;
        for (let w = 0; w < wraithCount; w++) {
          const baseAngle = (Math.PI * 2 * w) / wraithCount + timeSec * (isEtereo ? 5.2 : 4.8);
          const currentRadius = (1 - easeIn) * 215;
          const wx = targetX + Math.cos(baseAngle) * currentRadius;
          const wy = targetY + Math.sin(baseAngle) * (currentRadius * 0.78);

          ctx.beginPath();
          for (let tail = 0; tail <= 18; tail++) {
            const tf = tail / 18;
            const tAng = baseAngle - tf * 1.4;
            const tRad = currentRadius + tf * 90 * (1 - easeIn * 0.6);
            const tx = targetX + Math.cos(tAng) * tRad;
            const ty = targetY + Math.sin(tAng) * (tRad * 0.78);
            if (tail === 0) ctx.moveTo(tx, ty);
            else ctx.lineTo(tx, ty);
          }
          ctx.strokeStyle = isEtereo
            ? (w % 2 === 0 ? '#67e8f9' : '#818cf8')
            : (w % 2 === 0 ? '#c084fc' : '#9333ea');
          ctx.lineWidth = (1 - easeIn * 0.4) * 14;
          ctx.lineCap = 'round';
          ctx.shadowColor = isEtereo ? '#22d3ee' : '#a855f7';
          ctx.shadowBlur = 24;
          ctx.globalAlpha = masterAlpha * 0.82;
          ctx.stroke();

          ctx.save();
          ctx.translate(wx, wy);
          ctx.rotate(baseAngle + Math.PI / 2);
          const wGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
          wGrad.addColorStop(0, isEtereo ? '#ecfeff' : '#f3e8ff');
          wGrad.addColorStop(0.5, isEtereo ? '#22d3ee' : '#a855f7');
          wGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = wGrad;
          ctx.beginPath();
          ctx.arc(0, 0, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Integração na Carta Selecionada: Manto Espectral tomando a forma da carta
        if (progress > 0.34) {
          const cloakAlpha = Math.min(1, (progress - 0.34) / 0.28) * masterAlpha;
          ctx.save();
          ctx.globalAlpha = cloakAlpha;

          const pulseScale = 1 + Math.sin(timeSec * 14) * 0.05;
          const cw = cardW * pulseScale;
          const ch = cardH * pulseScale;

          const cardGlow = ctx.createLinearGradient(
            targetX - cw / 2,
            targetY - ch / 2,
            targetX + cw / 2,
            targetY + ch / 2
          );
          if (isEtereo) {
            cardGlow.addColorStop(0, 'rgba(8, 145, 178, 0.58)');
            cardGlow.addColorStop(0.5, 'rgba(34, 211, 238, 0.38)');
            cardGlow.addColorStop(1, 'rgba(67, 56, 202, 0.62)');
          } else {
            cardGlow.addColorStop(0, 'rgba(88, 28, 135, 0.72)');
            cardGlow.addColorStop(0.5, 'rgba(168, 85, 247, 0.44)');
            cardGlow.addColorStop(1, 'rgba(59, 7, 100, 0.76)');
          }

          ctx.fillStyle = cardGlow;
          ctx.strokeStyle = isEtereo ? '#a5f3fc' : '#e9d5ff';
          ctx.lineWidth = 3.2;
          ctx.shadowColor = isEtereo ? '#22d3ee' : '#c084fc';
          ctx.shadowBlur = 28;
          ctx.beginPath();
          ctx.roundRect(targetX - cw / 2, targetY - ch / 2, cw, ch, 14);
          ctx.fill();
          ctx.stroke();

          // Olhos / Emblema Espectral emergindo no centro da carta integrada
          const eyeY = targetY - 8;
          ctx.fillStyle = isEtereo ? '#cffafe' : '#f3e8ff';
          ctx.shadowColor = isEtereo ? '#67e8f9' : '#d8b4fe';
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.moveTo(targetX - 28, eyeY - 4);
          ctx.quadraticCurveTo(targetX - 16, eyeY - 12, targetX - 6, eyeY);
          ctx.quadraticCurveTo(targetX - 18, eyeY + 4, targetX - 28, eyeY - 4);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(targetX + 28, eyeY - 4);
          ctx.quadraticCurveTo(targetX + 16, eyeY - 12, targetX + 6, eyeY);
          ctx.quadraticCurveTo(targetX + 18, eyeY + 4, targetX + 28, eyeY - 4);
          ctx.fill();

          if (isEtereo) {
            // Partículas estelares etéreas orbitando a silhueta
            for (let s = 0; s < 6; s++) {
              const sa = timeSec * 3.5 + (s * Math.PI) / 3;
              drawFourPointStar(
                targetX + Math.cos(sa) * (cw * 0.45),
                targetY + Math.sin(sa) * (ch * 0.42),
                8,
                '#a5f3fc',
                timeSec * 6
              );
            }
          }

          ctx.restore();
        }

        // Fumaça espectral subindo da carta
        for (let i = 0; i < 36; i++) {
          const p = particles[i];
          const py = targetY + cardH * 0.4 - ((timeSec * 90 + i * 19) % (cardH * 1.3));
          const px = targetX + Math.sin(timeSec * 4 + p.phase) * (cardW * 0.48);
          ctx.save();
          ctx.globalAlpha = masterAlpha * 0.55;
          const mGrad = ctx.createRadialGradient(px, py, 1, px, py, p.size * 2.5);
          mGrad.addColorStop(0, isEtereo ? '#a5f3fc' : '#d8b4fe');
          mGrad.addColorStop(0.5, isEtereo ? '#0891b2' : '#9333ea');
          mGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = mGrad;
          ctx.beginPath();
          ctx.arc(px, py, p.size * 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        drawFloatingBadge(
          targetX,
          targetY - cardH / 2 - 26,
          isEtereo ? '✨🌌 FORMA ETÉREA' : '👤 FURTIVO INTEGRADO',
          isEtereo ? '#22d3ee' : '#c084fc',
          isEtereo ? '#ecfeff' : '#f3e8ff',
          masterAlpha
        );
        ctx.restore();
      }

      // ============================================================================
      // 2. LEVANTAR MORAL: Uma corneta ressoando uma nota inspiradora
      // ============================================================================
      else if (vfx.skillType === 'm_moral') {
        ctx.save();

        // Aura dourada e carmesim de Bravura sob a unidade
        const auraGrad = ctx.createRadialGradient(targetX, targetY, 10, targetX, targetY, cardW * 1.4);
        auraGrad.addColorStop(0, `rgba(251, 191, 36, ${0.55 * masterAlpha})`);
        auraGrad.addColorStop(0.55, `rgba(225, 29, 72, ${0.32 * masterAlpha})`);
        auraGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(targetX, targetY, cardW * 1.4, 0, Math.PI * 2);
        ctx.fill();

        // Posição da Corneta Real acima/à esquerda da carta, soprando em direção ao topo/direita
        const hornX = targetX - 52;
        const hornY = targetY - cardH * 0.35;
        const hornTilt = -0.35 + Math.sin(timeSec * 12) * 0.04;

        // Ondas Sonoras Douradas concêntricas saindo do bocal da corneta
        const mouthX = hornX + 76;
        const mouthY = hornY - 26;
        for (let w = 0; w < 5; w++) {
          const waveProg = ((timeSec * 1.65 + w * 0.2) % 1);
          const waveR = 18 + waveProg * 165;
          const waveAlpha = (1 - waveProg) * masterAlpha * 0.9;

          ctx.save();
          ctx.translate(mouthX, mouthY);
          ctx.rotate(-0.32);
          ctx.beginPath();
          ctx.arc(0, 0, waveR, -Math.PI * 0.42, Math.PI * 0.42);
          ctx.strokeStyle = w % 2 === 0 ? '#fde68a' : '#fb7185';
          ctx.lineWidth = 4 * (1 - waveProg * 0.6);
          ctx.globalAlpha = waveAlpha;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 18;
          ctx.stroke();
          ctx.restore();
        }

        // Notas Musicais Inspiradoras & Runas de Bravura flutuando nas ondas sonoras
        const notes = ['♪', '♫', '𝄞', '⚔', '♪', '♫'];
        for (let n = 0; n < notes.length; n++) {
          const np = ((timeSec * 0.95 + n * 0.16) % 1);
          const ang = -0.55 + (n % 3) * 0.28;
          const dist = 30 + np * 155;
          const nx = mouthX + Math.cos(ang) * dist;
          const ny = mouthY + Math.sin(ang) * dist - Math.sin(np * Math.PI) * 18;

          ctx.save();
          ctx.globalAlpha = (1 - np) * masterAlpha;
          ctx.font = '900 24px Cinzel, serif';
          ctx.fillStyle = n % 2 === 0 ? '#fef08a' : '#fda4af';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 14;
          ctx.fillText(notes[n], nx, ny);
          ctx.restore();
        }

        // Desenho detalhado da Corneta Real Dourada (Golden War Horn)
        ctx.save();
        ctx.translate(hornX, hornY);
        ctx.rotate(hornTilt);
        ctx.globalAlpha = masterAlpha;

        // Flâmula/Estandarte Real Carmesim pendurado na corneta
        ctx.fillStyle = '#be123c';
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(12, 6);
        ctx.lineTo(52, 6);
        ctx.lineTo(56, 46 + Math.sin(timeSec * 10) * 4);
        ctx.lineTo(32, 34);
        ctx.lineTo(8, 46 - Math.sin(timeSec * 10) * 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Corpo Cônico de Latão/Ouro Polido da Corneta
        const brassGrad = ctx.createLinearGradient(-30, -25, 80, 25);
        brassGrad.addColorStop(0, '#b45309');
        brassGrad.addColorStop(0.4, '#fbbf24');
        brassGrad.addColorStop(0.75, '#fef08a');
        brassGrad.addColorStop(1, '#d97706');

        ctx.fillStyle = brassGrad;
        ctx.strokeStyle = '#fef3c7';
        ctx.lineWidth = 2.2;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 22;

        ctx.beginPath();
        ctx.moveTo(-28, -3);
        ctx.quadraticCurveTo(25, -5, 76, -30);
        ctx.ellipse(76, 0, 9, 30, 0, -Math.PI / 2, Math.PI / 2);
        ctx.quadraticCurveTo(25, 5, -28, 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Bocal e Anéis Ornamentais da Corneta
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(-30, 0, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(14, -7, 5, 14);
        ctx.fillRect(42, -12, 5, 24);
        ctx.restore();

        // Contorno dourado de Bravura energizando a carta selecionada
        ctx.save();
        ctx.globalAlpha = masterAlpha * 0.85;
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.roundRect(targetX - cardW / 2, targetY - cardH / 2, cardW, cardH, 12);
        ctx.stroke();
        ctx.restore();

        drawFloatingBadge(
          targetX,
          targetY - cardH / 2 - 28,
          '🎺 🔥 BRAVURA · +3 ATAQUE',
          '#fbbf24',
          '#fef08a',
          masterAlpha
        );
        ctx.restore();
      }

      // ============================================================================
      // 3. LABAREDA SOLAR: Um pilar de fogo atingindo a carta inimiga
      // ============================================================================
      else if (vfx.skillType === 'n_labareda_solar') {
        ctx.save();

        const pillarWidth = Math.max(105, cardW * 0.92);
        const dropProgress = Math.min(1, progress / 0.18);
        const pillarTopY = 0;
        const pillarBottomY = dropProgress * (targetY + cardH * 0.45);

        // Cratera / Círculo Solar Incandescente na base da carta inimiga
        if (dropProgress >= 0.8) {
          const baseGrad = ctx.createRadialGradient(
            targetX,
            targetY + cardH * 0.25,
            8,
            targetX,
            targetY + cardH * 0.25,
            pillarWidth * 1.4
          );
          baseGrad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * masterAlpha})`);
          baseGrad.addColorStop(0.35, `rgba(251, 146, 60, ${0.85 * masterAlpha})`);
          baseGrad.addColorStop(0.7, `rgba(220, 38, 38, ${0.45 * masterAlpha})`);
          baseGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = baseGrad;
          ctx.beginPath();
          ctx.ellipse(
            targetX,
            targetY + cardH * 0.25,
            pillarWidth * 1.4,
            pillarWidth * 0.48,
            0,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }

        // Corpo Principal do Pilar de Fogo Solar (Coluna Vertical do Céu até a Carta Inimiga)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const outerFireGrad = ctx.createLinearGradient(
          targetX - pillarWidth,
          0,
          targetX + pillarWidth,
          0
        );
        outerFireGrad.addColorStop(0, 'transparent');
        outerFireGrad.addColorStop(0.2, `rgba(220, 38, 38, ${0.65 * masterAlpha})`);
        outerFireGrad.addColorStop(0.38, `rgba(249, 115, 22, ${0.92 * masterAlpha})`);
        outerFireGrad.addColorStop(0.5, `rgba(254, 240, 138, ${0.98 * masterAlpha})`);
        outerFireGrad.addColorStop(0.62, `rgba(249, 115, 22, ${0.92 * masterAlpha})`);
        outerFireGrad.addColorStop(0.8, `rgba(220, 38, 38, ${0.65 * masterAlpha})`);
        outerFireGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = outerFireGrad;
        ctx.fillRect(targetX - pillarWidth, pillarTopY, pillarWidth * 2, pillarBottomY);

        // Espirais de Plasma Solar subindo pelo Pilar de Fogo
        for (let s = 0; s < 4; s++) {
          ctx.beginPath();
          const steps = 45;
          for (let i = 0; i <= steps; i++) {
            const frac = i / steps;
            const py = pillarBottomY * (1 - frac);
            const wave = Math.sin(frac * 12 - timeSec * 18 + (s * Math.PI) / 2);
            const px = targetX + wave * (pillarWidth * 0.58);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.strokeStyle = s % 2 === 0 ? '#ffffff' : '#fb923c';
          ctx.lineWidth = 6;
          ctx.globalAlpha = masterAlpha * 0.8;
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = 22;
          ctx.stroke();
        }
        ctx.restore();

        // Labaredas e Fagulhas Solares explodindo na Carta Inimiga
        for (let i = 0; i < 48; i++) {
          const p = particles[i];
          const py = targetY + cardH * 0.35 - ((timeSec * 240 + i * 27) % 340);
          const sway = Math.sin(timeSec * 8 + p.phase) * (pillarWidth * 0.65);
          const px = targetX + sway;

          ctx.save();
          ctx.globalAlpha = masterAlpha * 0.85;
          ctx.fillStyle = i % 3 === 0 ? '#fef08a' : i % 2 === 0 ? '#f97316' : '#ef4444';
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Anéis de TORPOR (Espiral Hipnótica Púrpura-Solar sobre a carta atingida)
        if (progress > 0.35) {
          for (let r = 0; r < 2; r++) {
            ctx.save();
            ctx.translate(targetX, targetY - 15 + r * 24);
            ctx.rotate(timeSec * (r === 0 ? 6 : -6));
            ctx.strokeStyle = r === 0 ? '#e879f9' : '#fde047';
            ctx.lineWidth = 2.8;
            ctx.setLineDash([12, 8]);
            ctx.globalAlpha = masterAlpha * 0.9;
            ctx.beginPath();
            ctx.ellipse(0, 0, cardW * 0.58, 18, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }

        drawFloatingBadge(
          targetX,
          targetY - cardH / 2 - 28,
          '☀️ -8 DANO · 🌀 TORPOR',
          '#fb923c',
          '#ffedd5',
          masterAlpha
        );
        ctx.restore();
      }

      // ============================================================================
      // 4. DESAFIO REAL: Duas espadas se cruzando emitindo som de ferro batendo
      // ============================================================================
      else if (vfx.skillType === 'g_desafio_real') {
        ctx.save();

        // Brasão de Honra Real atrás das espadas cruzadas
        const clashProg = Math.min(1, progress / 0.22);
        const easeClash = 1 - Math.pow(1 - clashProg, 3);
        const shakeX =
          progress >= 0.20 && progress <= 0.45
            ? Math.sin(timeSec * 90) * 6 * (1 - (progress - 0.20) / 0.25)
            : 0;
        const shakeY =
          progress >= 0.20 && progress <= 0.45
            ? Math.cos(timeSec * 85) * 6 * (1 - (progress - 0.20) / 0.25)
            : 0;

        const cx = targetX + shakeX;
        const cy = targetY + shakeY;

        // Onda de Choque Metálica no momento do impacto das lâminas (progress >= 0.20)
        if (progress >= 0.20) {
          const ringT = Math.min(1, (progress - 0.20) / 0.45);
          const ringR = 15 + ringT * 175;
          ctx.save();
          ctx.globalAlpha = (1 - ringT) * masterAlpha;
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 6 * (1 - ringT);
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 24;
          ctx.beginPath();
          ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Função para desenhar uma Espada Longa Real de Ferro Temperado
        const drawRoyalBroadsword = (
          x: number,
          y: number,
          angle: number
        ) => {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(angle);
          ctx.globalAlpha = masterAlpha;

          // Lâmina de Aço/Ferro Forjado (da guarda em y=38 até a ponta em y=-105)
          const bladeGrad = ctx.createLinearGradient(-12, 0, 12, 0);
          bladeGrad.addColorStop(0, '#94a3b8');
          bladeGrad.addColorStop(0.45, '#f8fafc');
          bladeGrad.addColorStop(0.5, '#475569');
          bladeGrad.addColorStop(0.55, '#e2e8f0');
          bladeGrad.addColorStop(1, '#64748b');

          ctx.fillStyle = bladeGrad;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.6;
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 18;

          ctx.beginPath();
          ctx.moveTo(-10, 38);
          ctx.lineTo(-8, -78);
          ctx.lineTo(0, -108);
          ctx.lineTo(8, -78);
          ctx.lineTo(10, 38);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Sulco central da lâmina (fuller)
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 32);
          ctx.lineTo(0, -72);
          ctx.stroke();

          // Guarda-mão Real Dourado (Crossguard)
          ctx.fillStyle = '#fbbf24';
          ctx.strokeStyle = '#fef3c7';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-34, 34);
          ctx.quadraticCurveTo(0, 44, 34, 34);
          ctx.lineTo(30, 44);
          ctx.quadraticCurveTo(0, 50, -30, 44);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Joia central na guarda
          ctx.fillStyle = '#e11d48';
          ctx.beginPath();
          ctx.arc(0, 41, 4.5, 0, Math.PI * 2);
          ctx.fill();

          // Empunhadura & Pomo Dourado
          ctx.fillStyle = '#78350f';
          ctx.fillRect(-5, 45, 10, 26);
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(0, 76, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.restore();
        };

        // Espada 1 (vem da esquerda superior e cruza em +38 graus)
        const s1Offset = (1 - easeClash) * -140;
        drawRoyalBroadsword(cx + s1Offset, cy + s1Offset * 0.6, 0.68);

        // Espada 2 (vem da direita superior e cruza em -38 graus)
        const s2Offset = (1 - easeClash) * 140;
        drawRoyalBroadsword(cx + s2Offset, cy - s2Offset * 0.6, -0.68);

        // Centelhas de Ferro Batendo no Ponto de Contato Central
        if (progress >= 0.19 && progress <= 0.85) {
          const sparkProg = (progress - 0.19) / 0.66;
          drawFourPointStar(cx, cy - 12, 34 * (1 - sparkProg * 0.5), '#ffffff', timeSec * 8);
          drawFourPointStar(cx, cy - 12, 52 * (1 - sparkProg * 0.5), '#fbbf24', -timeSec * 6);

          for (let i = 0; i < 34; i++) {
            const p = particles[i];
            const dist = sparkProg * p.dist * 1.15;
            const sx = cx + Math.cos(p.angle) * dist;
            const sy = cy - 12 + Math.sin(p.angle) * dist + sparkProg * sparkProg * 45;
            ctx.save();
            ctx.globalAlpha = (1 - sparkProg) * masterAlpha;
            ctx.strokeStyle = i % 2 === 0 ? '#fef08a' : '#ffffff';
            ctx.lineWidth = 2.4;
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx - Math.cos(p.angle) * 12, sy - Math.sin(p.angle) * 12);
            ctx.stroke();
            ctx.restore();
          }
        }

        drawFloatingBadge(
          targetX,
          targetY - cardH / 2 - 28,
          '⚔️ ENFRENTAR ATIVO',
          '#fbbf24',
          '#fef3c7',
          masterAlpha
        );
        ctx.restore();
      }

      // ============================================================================
      // 5. VOTO DOS CAÍDOS: Um espectro branco atingindo o alvo
      // ============================================================================
      else if (vfx.skillType === 'm_voto_caidos') {
        ctx.save();

        // Fase 1 (0 -> 0.42): Espectro Branco surge no alto e mergulha em alta velocidade até a carta alvo
        // Fase 2 (0.42 -> 1.0): Impacto espectral branco + correntes etéreas e estrelas de Atordoamento
        const strikeT = Math.min(1, progress / 0.42);
        const easeStrike = strikeT * strikeT;

        const startX = targetX - 150;
        const startY = Math.max(40, targetY - 260);
        const wraithX = startX + (targetX - startX) * easeStrike;
        const wraithY = startY + (targetY - startY) * easeStrike;

        // Trilha Ectoplásmica Branca deixada pelo Espectro em movimento
        ctx.save();
        for (let t = 0; t < 12; t++) {
          const trailFrac = Math.max(0, easeStrike - t * 0.045);
          const tx = startX + (targetX - startX) * trailFrac;
          const ty = startY + (targetY - startY) * trailFrac;
          const r = (36 - t * 2.2) * (progress > 0.55 ? 1 - (progress - 0.55) / 0.45 : 1);
          if (r <= 0) continue;

          const tGrad = ctx.createRadialGradient(tx, ty, 2, tx, ty, r * 1.5);
          tGrad.addColorStop(0, `rgba(255, 255, 255, ${0.65 * masterAlpha})`);
          tGrad.addColorStop(0.5, `rgba(226, 232, 240, ${0.32 * masterAlpha})`);
          tGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = tGrad;
          ctx.beginPath();
          ctx.arc(tx, ty, r * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // Silhueta do Espectro Branco dos Caídos (Capuz, Manto Espectral e Olhos Brilhantes)
        if (progress < 0.78) {
          const wraithScale = progress > 0.42 ? 1 + (progress - 0.42) * 1.4 : 0.85 + easeStrike * 0.25;
          const wraithFade = progress > 0.48 ? Math.max(0, 1 - (progress - 0.48) / 0.30) : 1;

          ctx.save();
          ctx.translate(wraithX, wraithY);
          ctx.scale(wraithScale, wraithScale);
          ctx.globalAlpha = wraithFade * masterAlpha;

          // Manto Branco Fantasmagórico
          const shroudGrad = ctx.createRadialGradient(0, -10, 4, 0, 10, 62);
          shroudGrad.addColorStop(0, '#ffffff');
          shroudGrad.addColorStop(0.55, 'rgba(241, 245, 249, 0.88)');
          shroudGrad.addColorStop(1, 'rgba(148, 163, 184, 0)');

          ctx.fillStyle = shroudGrad;
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 30;
          ctx.beginPath();
          ctx.moveTo(0, -52);
          ctx.quadraticCurveTo(42, -32, 48, 28);
          ctx.lineTo(28, 46);
          ctx.lineTo(12, 28);
          ctx.lineTo(0, 52);
          ctx.lineTo(-12, 28);
          ctx.lineTo(-28, 46);
          ctx.lineTo(-48, 28);
          ctx.quadraticCurveTo(-42, -32, 0, -52);
          ctx.closePath();
          ctx.fill();

          // Face Sombria sob o Capuz Branco + Olhos Celestes
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.ellipse(0, -22, 16, 18, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#e0f2fe';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(-6, -23, 3.2, 0, Math.PI * 2);
          ctx.arc(6, -23, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Impacto do Espectro Branco no Alvo (progress >= 0.40): Onda Espectral + Estrelas de Atordoamento
        if (progress >= 0.40) {
          const hitProg = (progress - 0.40) / 0.60;
          const ringR = 20 + hitProg * 140;

          ctx.save();
          ctx.globalAlpha = (1 - hitProg) * masterAlpha;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 5 * (1 - hitProg);
          ctx.shadowColor = '#e2e8f0';
          ctx.shadowBlur = 24;
          ctx.beginPath();
          ctx.arc(targetX, targetY, ringR, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // Estrelas Brancas/Douradas de Atordoamento girando sobre o topo da carta alvo
          for (let s = 0; s < 4; s++) {
            const ang = timeSec * 5.5 + (s * Math.PI) / 2;
            const sx = targetX + Math.cos(ang) * (cardW * 0.42);
            const sy = targetY - cardH * 0.36 + Math.sin(ang) * 14;
            drawFourPointStar(sx, sy, 11, s % 2 === 0 ? '#ffffff' : '#fde047', timeSec * 6);
          }
        }

        drawFloatingBadge(
          targetX,
          targetY - cardH / 2 - 28,
          '👻 ⚡ ATORDOADO',
          '#e2e8f0',
          '#ffffff',
          masterAlpha
        );
        ctx.restore();
      }

      // ============================================================================
      // 6. DESTREZA / ATAQUE-DUPLO (REFEITO): Ciclone Supersônico de Lâminas Gêmeas
      // ============================================================================
      else if (vfx.skillType === 'n_destreza') {
        ctx.save();

        // Micro-tremor de impacto em cada um dos 2 golpes
        const strike1Impact = progress >= 0.24 && progress <= 0.40 ? Math.sin(timeSec * 95) * 4 : 0;
        const strike2Impact = progress >= 0.54 && progress <= 0.72 ? Math.cos(timeSec * 95) * 4 : 0;
        const cx = targetX + strike1Impact + strike2Impact;
        const cy = targetY - (strike1Impact * 0.5);

        // Vórtice de vento esmeralda e lâminas circulantes de velocidade
        const windGlow = ctx.createRadialGradient(cx, cy, 12, cx, cy, cardW * 1.5);
        windGlow.addColorStop(0, `rgba(16, 185, 129, ${0.38 * masterAlpha})`);
        windGlow.addColorStop(0.6, `rgba(45, 212, 191, ${0.22 * masterAlpha})`);
        windGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = windGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, cardW * 1.5, 0, Math.PI * 2);
        ctx.fill();

        for (let w = 0; w < 16; w++) {
          const wAng = timeSec * 10 + (w * Math.PI) / 8;
          const r = 42 + (w % 4) * 26;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(wAng);
          ctx.strokeStyle = w % 3 === 0 ? '#ffffff' : w % 2 === 0 ? '#34d399' : '#2dd4bf';
          ctx.globalAlpha = masterAlpha * 0.52;
          ctx.lineWidth = w % 3 === 0 ? 1.5 : 2.6;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 0.52);
          ctx.stroke();
          ctx.restore();
        }

        // Helper para desenhar golpe supersônico com lâmina crescente metálica + ondas sônicas + faíscas
        const drawSupersonicBladeSlash = (
          slashP: number,
          angle: number,
          bladeHue: string,
          sparkHue: string,
          isSecondHit: boolean
        ) => {
          if (slashP <= 0 || slashP >= 1) return;
          const sweep = Math.min(1, slashP * 2.3);
          const fade = slashP > 0.55 ? Math.max(0, (1 - slashP) / 0.45) : 1;

          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(angle);
          ctx.globalAlpha = fade * masterAlpha;

          const span = isSecondHit ? 148 : 162;
          const x0 = -span;
          const x1 = -span + span * 2 * sweep;

          // Rastro externo aerodinâmico de vácuo
          const arcGrad = ctx.createLinearGradient(x0, 0, x1, 0);
          arcGrad.addColorStop(0, 'transparent');
          arcGrad.addColorStop(0.45, bladeHue);
          arcGrad.addColorStop(0.92, '#ffffff');
          arcGrad.addColorStop(1, '#ffffff');

          ctx.strokeStyle = arcGrad;
          ctx.lineWidth = (isSecondHit ? 16 : 20) * fade;
          ctx.lineCap = 'round';
          ctx.shadowColor = bladeHue;
          ctx.shadowBlur = 30;
          ctx.beginPath();
          ctx.moveTo(x0, 12);
          ctx.quadraticCurveTo(0, -42, x1, 8);
          ctx.stroke();

          // Núcleo cortante branco-prata da lâmina
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 5 * fade;
          ctx.beginPath();
          ctx.moveTo(x0 * 0.85, 8);
          ctx.quadraticCurveTo(0, -34, x1, 6);
          ctx.stroke();

          // Lâmina física estilizada viajando na ponta do arco
          if (sweep < 0.99) {
            const bladeTipY = 8 - Math.sin(sweep * Math.PI) * 26;
            ctx.save();
            ctx.translate(x1, bladeTipY);
            ctx.rotate(sweep * 0.45 - 0.25);
            const metalGrad = ctx.createLinearGradient(-34, -8, 18, 8);
            metalGrad.addColorStop(0, 'transparent');
            metalGrad.addColorStop(0.35, bladeHue);
            metalGrad.addColorStop(0.8, '#f8fafc');
            metalGrad.addColorStop(1, '#ffffff');
            ctx.fillStyle = metalGrad;
            ctx.beginPath();
            ctx.moveTo(-36, 4);
            ctx.quadraticCurveTo(0, -14, 24, 0);
            ctx.quadraticCurveTo(-4, 6, -36, 4);
            ctx.fill();
            ctx.restore();
            drawFourPointStar(x1, bladeTipY, 24, '#ffffff', timeSec * 14);
          }

          // Ondas de choque do impacto central + fagulhas de aço
          if (slashP >= 0.35) {
            const imp = (slashP - 0.35) / 0.65;
            ctx.strokeStyle = sparkHue;
            ctx.lineWidth = 3 * (1 - imp);
            ctx.beginPath();
            ctx.ellipse(0, -10, 22 + imp * 90, 8 + imp * 34, 0, 0, Math.PI * 2);
            ctx.stroke();

            for (let f = 0; f < 10; f++) {
              const p = particles[f + (isSecondHit ? 12 : 0)];
              const sx = Math.cos(p.angle) * (15 + imp * 115);
              const sy = -10 + Math.sin(p.angle) * (15 + imp * 75);
              ctx.fillStyle = f % 2 === 0 ? '#ffffff' : sparkHue;
              ctx.beginPath();
              ctx.arc(sx, sy, 2.5 * (1 - imp * 0.5), 0, Math.PI * 2);
              ctx.fill();
            }
          }

          ctx.restore();
        };

        // 1º GOLPE (100%): diagonal descendente (-36°)
        if (progress >= 0.08 && progress <= 0.62) {
          drawSupersonicBladeSlash((progress - 0.08) / 0.54, -0.62, '#34d399', '#a7f3d0', false);
        }

        // 2º GOLPE (60% Ataque-Duplo): diagonal cruzada (+36°) em sequência rápida
        if (progress >= 0.38 && progress <= 0.94) {
          drawSupersonicBladeSlash((progress - 0.38) / 0.56, 0.62, '#38bdf8', '#fde047', true);
        }

        // Selo X brilhante da intersecção dos dois cortes
        if (progress >= 0.45 && progress <= 0.88) {
          const xAlpha = Math.sin(((progress - 0.45) / 0.43) * Math.PI) * masterAlpha;
          drawCardHighlight(cx, cy, '#34d399', xAlpha);
        }

        drawFloatingBadge(
          cx,
          cy - cardH / 2 - 30,
          '⚔️⚔️ DESTREZA · ATAQUE-DUPLO (2º GOLPE 60%)',
          '#34d399',
          '#d1fae5',
          masterAlpha
        );
        ctx.restore();
      }

      // ============================================================================
      // 7. VOTO DAS ESTRELAS / BARREIRA (Com detalhes de GELO quando Aurora!)
      // ============================================================================
      else if (vfx.skillType === 'n_voto_estrelas') {
        ctx.save();

        const isIce = Boolean(vfx.isAuroraIce);
        const sphereR = Math.max(90, Math.hypot(cardW, cardH) * 0.57);
        const expandScale =
          progress < 0.22
            ? 0.2 + (progress / 0.22) * 0.85
            : 1.05 + Math.sin(timeSec * 5) * 0.03;
        const r = sphereR * expandScale;

        ctx.translate(targetX, targetY);
        ctx.globalAlpha = masterAlpha;

        // 1. Preenchimento volumétrico da Esfera (Gelada para Aurora ou Cósmica Estelar)
        const sphereGrad = ctx.createRadialGradient(-r * 0.28, -r * 0.28, r * 0.08, 0, 0, r);
        if (isIce) {
          sphereGrad.addColorStop(0, 'rgba(240, 249, 255, 0.55)');
          sphereGrad.addColorStop(0.45, 'rgba(103, 232, 249, 0.32)');
          sphereGrad.addColorStop(0.78, 'rgba(56, 189, 248, 0.48)');
          sphereGrad.addColorStop(1, 'rgba(186, 230, 253, 0.9)');
        } else {
          sphereGrad.addColorStop(0, 'rgba(224, 242, 254, 0.38)');
          sphereGrad.addColorStop(0.45, 'rgba(56, 189, 248, 0.24)');
          sphereGrad.addColorStop(0.78, 'rgba(99, 102, 241, 0.42)');
          sphereGrad.addColorStop(1, 'rgba(14, 165, 233, 0.82)');
        }

        ctx.fillStyle = sphereGrad;
        ctx.strokeStyle = isIce ? '#e0f2fe' : '#bae6fd';
        ctx.lineWidth = 3.2;
        ctx.shadowColor = isIce ? '#67e8f9' : '#38bdf8';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 2. Anéis Meridianos e Paralelos 3D
        for (let m = 0; m < 3; m++) {
          ctx.save();
          ctx.rotate(timeSec * 1.4 + (m * Math.PI) / 3);
          ctx.strokeStyle = isIce ? (m === 0 ? '#ffffff' : '#67e8f9') : (m === 0 ? '#fde68a' : '#7dd3fc');
          ctx.lineWidth = 1.8;
          ctx.globalAlpha = masterAlpha * 0.72;
          ctx.beginPath();
          ctx.ellipse(0, 0, r, r * 0.34, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // 3. Detalhes de GELO Cristalinos exclusivos quando Aurora (ou Gelo)
        if (isIce) {
          for (let c = 0; c < 8; c++) {
            const ang = (c * Math.PI) / 4 + timeSec * 0.65;
            const px = Math.cos(ang) * r;
            const py = Math.sin(ang) * r;
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(ang + Math.PI / 2);
            ctx.fillStyle = c % 2 === 0 ? 'rgba(224, 242, 254, 0.92)' : 'rgba(103, 232, 249, 0.85)';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(0, -20);
            ctx.lineTo(9, 0);
            ctx.lineTo(0, 12);
            ctx.lineTo(-9, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
          // Hexágonos internos de gelo na superfície da esfera
          ctx.strokeStyle = 'rgba(224, 242, 254, 0.55)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let h = 0; h <= 6; h++) {
            const ha = (h * Math.PI) / 3 + timeSec * 0.4;
            const hx = Math.cos(ha) * (r * 0.64);
            const hy = Math.sin(ha) * (r * 0.64);
            if (h === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.stroke();
        }

        // 4. Constelações e Estrelas Orbitando Dentro e Ao Redor da Esfera
        const starPoints: { x: number; y: number }[] = [];
        for (let s = 0; s < 14; s++) {
          const theta = timeSec * (1.8 + (s % 3) * 0.5) + (s * Math.PI * 2) / 14;
          const phi = Math.sin(timeSec * 2 + s) * 0.75;
          const sx = Math.cos(theta) * Math.cos(phi) * (r * 0.88);
          const sy = Math.sin(phi) * (r * 0.88);
          starPoints.push({ x: sx, y: sy });

          drawFourPointStar(
            sx,
            sy,
            7 + (s % 3) * 3,
            isIce ? (s % 2 === 0 ? '#ffffff' : '#67e8f9') : (s % 3 === 0 ? '#fef08a' : s % 2 === 0 ? '#ffffff' : '#7dd3fc'),
            timeSec * 3 + s
          );
        }

        ctx.strokeStyle = isIce ? 'rgba(224, 242, 254, 0.5)' : 'rgba(186, 230, 253, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i < starPoints.length; i++) {
          const next = starPoints[(i + 1) % starPoints.length];
          ctx.moveTo(starPoints[i].x, starPoints[i].y);
          ctx.lineTo(next.x, next.y);
        }
        ctx.stroke();

        ctx.restore();

        drawFloatingBadge(
          targetX,
          targetY - r - 22,
          isIce ? '❄️🛡️ BARREIRA GLACIAL (AURORA)' : '🛡️✨ BARREIRA CELESTIAL',
          isIce ? '#67e8f9' : '#38bdf8',
          '#e0f2fe',
          masterAlpha
        );
      }

      // ============================================================================
      // 8. VOTO DO SILÊNCIO: Um selo gigante silenciando as unidades
      // ============================================================================
      else if (vfx.skillType === 'g_voto_silencio') {
        ctx.save();

        const cx = width / 2;
        const cy = height * 0.50;
        const maxSealR = Math.min(width, height) * 0.32;
        const slamT = Math.min(1, progress / 0.25);
        const sealScale = slamT < 1 ? 1.8 - 0.8 * slamT : 1.0 + Math.sin(timeSec * 6) * 0.015;
        const r = maxSealR * sealScale;

        // Onda de Silêncio varrendo as duas fileiras da mesa quando o selo trava (progress >= 0.24)
        if (progress >= 0.24) {
          const waveT = Math.min(1, (progress - 0.24) / 0.55);
          ctx.save();
          ctx.globalAlpha = (1 - waveT) * masterAlpha * 0.85;
          ctx.strokeStyle = '#e879f9';
          ctx.lineWidth = 8 * (1 - waveT);
          ctx.shadowColor = '#d946ef';
          ctx.shadowBlur = 30;
          ctx.beginPath();
          ctx.arc(cx, cy, r + waveT * 360, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        ctx.translate(cx, cy);
        ctx.globalAlpha = masterAlpha;

        // Fundo escuro translúcido do Selo Gigante
        const bgGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, r * 1.15);
        bgGrad.addColorStop(0, 'rgba(46, 16, 101, 0.78)');
        bgGrad.addColorStop(0.65, 'rgba(112, 26, 117, 0.48)');
        bgGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = bgGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
        ctx.fill();

        // Anel Externo e Interno do Selo Gigante
        ctx.strokeStyle = '#f0abfc';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#d946ef';
        ctx.shadowBlur = 26;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
        ctx.stroke();

        // Estrela de 8 Pontas (Octagrama de Selamento Arcano) girando dentro do Selo
        for (let sq = 0; sq < 2; sq++) {
          ctx.save();
          ctx.rotate(timeSec * 0.8 + (sq * Math.PI) / 4);
          ctx.strokeStyle = sq === 0 ? '#e879f9' : '#fde047';
          ctx.lineWidth = 2.6;
          const side = r * 1.12;
          ctx.strokeRect(-side / 2, -side / 2, side, side);
          ctx.restore();
        }

        // Runas Arcanas ao redor do perímetro do Selo Gigante
        const runes = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ'];
        ctx.save();
        ctx.rotate(-timeSec * 0.65);
        ctx.font = '900 18px Cinzel, serif';
        ctx.fillStyle = '#fae8ff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < runes.length; i++) {
          const a = (i * Math.PI * 2) / runes.length;
          const rx = Math.cos(a) * (r * 0.91);
          const ry = Math.sin(a) * (r * 0.91);
          ctx.fillText(runes[i], rx, ry);
        }
        ctx.restore();

        // Grande Símbolo Central de Silêncio (X de Selamento + Cadeado Rúnico)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#f0abfc';
        ctx.shadowBlur = 24;
        const xSpan = r * 0.42;
        ctx.beginPath();
        ctx.moveTo(-xSpan, -xSpan);
        ctx.lineTo(xSpan, xSpan);
        ctx.moveTo(xSpan, -xSpan);
        ctx.lineTo(-xSpan, xSpan);
        ctx.stroke();

        ctx.restore();

        drawFloatingBadge(
          cx,
          cy + maxSealR + 28,
          '🔇 SELO DO SILÊNCIO · PODER ZERADO EM CAMPO',
          '#e879f9',
          '#fae8ff',
          masterAlpha
        );
      }

      // ============================================================================
      // 9. SABEDORIA CÓSMICA: Mandala Astral & Santuário de Imunidade Cósmica
      // ============================================================================
      else if (vfx.skillType === 'g_sabedoria_cosmica') {
        ctx.save();

        const mandalaR = Math.max(92, cardW * 0.85);
        ctx.translate(targetX, targetY);
        ctx.globalAlpha = masterAlpha;

        // Halo Galáctico Dourado-Índigo
        const galGrad = ctx.createRadialGradient(0, 0, 12, 0, 0, mandalaR * 1.35);
        galGrad.addColorStop(0, 'rgba(254, 240, 138, 0.55)');
        galGrad.addColorStop(0.5, 'rgba(129, 140, 248, 0.42)');
        galGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = galGrad;
        ctx.beginPath();
        ctx.arc(0, 0, mandalaR * 1.35, 0, Math.PI * 2);
        ctx.fill();

        // Mandala de Geometria Sagrada girando ao redor da unidade imune
        for (let ring = 0; ring < 3; ring++) {
          ctx.save();
          ctx.rotate(timeSec * (ring % 2 === 0 ? 1.5 : -1.5));
          const rad = mandalaR * (0.65 + ring * 0.22);
          ctx.strokeStyle = ring === 1 ? '#fde047' : '#a5b4fc';
          ctx.lineWidth = 2.2;
          ctx.shadowColor = '#818cf8';
          ctx.shadowBlur = 18;

          ctx.beginPath();
          for (let p = 0; p < 6; p++) {
            const a = (p * Math.PI) / 3;
            const px = Math.cos(a) * rad;
            const py = Math.sin(a) * rad;
            if (p === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }

        // Escudo Dourado de Imunidade contornando a carta
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.roundRect(-cardW / 2 - 6, -cardH / 2 - 6, cardW + 12, cardH + 12, 14);
        ctx.stroke();

        ctx.restore();

        drawFloatingBadge(
          targetX,
          targetY - cardH / 2 - 30,
          '🌟 IMUNIDADE CÓSMICA (2 RODADAS)',
          '#fde047',
          '#fef9c3',
          masterAlpha
        );
      }

      // ============================================================================
      // 10. CHAMADO DA VITÓRIA: 3 Portais/Pilares Dourados de Convocação Triunfal
      // ============================================================================
      else if (vfx.skillType === 'm_chamado_vitoria') {
        ctx.save();
        const rowY = vfx.targetSide === 'opponent' ? height * 0.30 : height * 0.65;
        const portalXOffsets = [-210, 0, 210];

        // Estandarte de Luz Solar cruzando toda a fileira aliada
        const bannerGrad = ctx.createLinearGradient(width * 0.15, rowY, width * 0.85, rowY);
        bannerGrad.addColorStop(0, 'transparent');
        bannerGrad.addColorStop(0.5, `rgba(251, 191, 36, ${0.32 * masterAlpha})`);
        bannerGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = bannerGrad;
        ctx.fillRect(width * 0.15, rowY - 85, width * 0.70, 170);

        portalXOffsets.forEach((offsetX, idx) => {
          const px = width / 2 + offsetX;
          const py = rowY;
          const portalDelay = idx * 0.12;
          const localP = Math.max(0, Math.min(1, (progress - portalDelay) / (1 - portalDelay)));
          if (localP <= 0) return;

          // Pilar de Luz Dourada subindo da base do portal
          const beamH = Math.min(1, localP * 2.2) * 320;
          const beamGrad = ctx.createLinearGradient(px - 52, py, px + 52, py);
          beamGrad.addColorStop(0, 'transparent');
          beamGrad.addColorStop(0.3, `rgba(245, 158, 11, ${0.55 * masterAlpha})`);
          beamGrad.addColorStop(0.5, `rgba(254, 249, 195, ${0.92 * masterAlpha})`);
          beamGrad.addColorStop(0.7, `rgba(245, 158, 11, ${0.55 * masterAlpha})`);
          beamGrad.addColorStop(1, 'transparent');

          ctx.fillStyle = beamGrad;
          ctx.fillRect(px - 52, py - beamH + 40, 104, beamH);

          // Círculo Rúnico Dourado de Convocação na base de cada unidade invocada
          ctx.save();
          ctx.translate(px, py + 45);
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 22;
          ctx.globalAlpha = masterAlpha;
          ctx.beginPath();
          ctx.ellipse(0, 0, 68, 22, 0, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.ellipse(0, 0, 48, 15, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // Silhueta Dourada de Carta Emergindo do Portal da Vitória
          const riseY = py + (1 - Math.min(1, localP * 1.8)) * 60;
          ctx.save();
          ctx.globalAlpha = masterAlpha * 0.9;
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 24;
          ctx.beginPath();
          ctx.roundRect(px - 46, riseY - 64, 92, 128, 10);
          ctx.stroke();
          drawFourPointStar(px, riseY, 24, '#ffffff', timeSec * 5 + idx);
          ctx.restore();
        });

        drawFloatingBadge(
          width / 2,
          rowY - 125,
          '📯✨ CHAMADO DA VITÓRIA · 3 UNIDADES CONVOCADAS',
          '#fbbf24',
          '#fef08a',
          masterAlpha
        );
        ctx.restore();
      }

      // ============================================================================
      // 11. FOME INSACIÁVEL: Efeitos de sangue vermelhos entregues à carta
      // ============================================================================
      else if (vfx.skillType === 'm_fome_insaciavel') {
        ctx.save();

        // Aura Sanguinária Carmesim sob a carta selecionada
        const bloodAura = ctx.createRadialGradient(targetX, targetY, 8, targetX, targetY, cardW * 1.5);
        bloodAura.addColorStop(0, `rgba(225, 29, 72, ${0.68 * masterAlpha})`);
        bloodAura.addColorStop(0.55, `rgba(136, 19, 55, ${0.42 * masterAlpha})`);
        bloodAura.addColorStop(1, 'transparent');
        ctx.fillStyle = bloodAura;
        ctx.beginPath();
        ctx.arc(targetX, targetY, cardW * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // 8 Feixes/Tentáculos de Sangue Vermelho Vivo convergindo para dentro da carta
        const streamCount = 8;
        for (let s = 0; s < streamCount; s++) {
          const baseAng = (Math.PI * 2 * s) / streamCount + timeSec * 2.2;
          const absorbT = (timeSec * 1.45 + s * 0.12) % 1;
          const dist = (1 - absorbT) * 230;
          const bx = targetX + Math.cos(baseAng) * dist;
          const by = targetY + Math.sin(baseAng) * dist;

          // Rastro líquido carmesim sendo sugado pela carta
          ctx.beginPath();
          for (let k = 0; k <= 14; k++) {
            const kf = k / 14;
            const kDist = dist + kf * 65;
            const kAng = baseAng - kf * 0.45 + Math.sin(timeSec * 10 + k) * 0.05;
            const kx = targetX + Math.cos(kAng) * kDist;
            const ky = targetY + Math.sin(kAng) * kDist;
            if (k === 0) ctx.moveTo(kx, ky);
            else ctx.lineTo(kx, ky);
          }
          ctx.strokeStyle = s % 2 === 0 ? '#ef4444' : '#be123c';
          ctx.lineWidth = (1 - absorbT * 0.5) * 9;
          ctx.lineCap = 'round';
          ctx.shadowColor = '#e11d48';
          ctx.shadowBlur = 18;
          ctx.globalAlpha = masterAlpha * 0.88;
          ctx.stroke();

          // Gota/Glóbulo de Sangue Vermelho Brilhante na ponta entregando poder à carta
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(baseAng + Math.PI / 2);
          ctx.fillStyle = '#fecdd3';
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.moveTo(0, -12);
          ctx.quadraticCurveTo(9, 2, 0, 10);
          ctx.quadraticCurveTo(-9, 2, 0, -12);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // Contorno Pulsante Vermelho-Sangue Energizando a Carta Alvo
        const pulse = 1 + Math.sin(timeSec * 16) * 0.045;
        ctx.strokeStyle = '#fb7185';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#e11d48';
        ctx.shadowBlur = 28;
        ctx.globalAlpha = masterAlpha;
        ctx.beginPath();
        ctx.roundRect(
          targetX - (cardW * pulse) / 2,
          targetY - (cardH * pulse) / 2,
          cardW * pulse,
          cardH * pulse,
          14
        );
        ctx.stroke();

        drawFloatingBadge(
          targetX,
          targetY - cardH / 2 - 28,
          '🩸 ROUBO DE VIDA · +10 PODER',
          '#f43f5e',
          '#ffe4e6',
          masterAlpha
        );
        ctx.restore();
      }

      // ============================================================================
      // 12. GRÃO-MESTRE: Três espadas em forma de estrela girando e se cruzam
      // ============================================================================
      else if (vfx.skillType === 'm_grao_mestre') {
        ctx.save();

        // Fase 1 (0 -> 0.52): 3 Espadas dispostas a 120° em forma de estrela girando rápido
        // Fase 2 (0.52 -> 1.0): As 3 Espadas avançam para o centro e se cruzam formando uma Estrela de 6 pontas
        const spinPhase = Math.min(1, progress / 0.52);
        const crossPhase = progress > 0.52 ? Math.min(1, (progress - 0.52) / 0.22) : 0;
        const easeCross = 1 - Math.pow(1 - crossPhase, 3);

        const starRot =
          progress <= 0.52
            ? spinPhase * Math.PI * 3.5
            : Math.PI * 3.5;

        // Anel Dourado de Maestria Marcial sob as 3 espadas
        ctx.save();
        ctx.translate(targetX, targetY);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 20;
        ctx.globalAlpha = masterAlpha * 0.75;
        ctx.beginPath();
        ctx.arc(0, 0, 96, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Função para desenhar cada uma das 3 Espadas de Grão-Mestre
        const drawMasterSword = (angle: number, radialOffset: number) => {
          ctx.save();
          ctx.translate(targetX, targetY);
          ctx.rotate(angle);
          ctx.translate(0, radialOffset);
          ctx.globalAlpha = masterAlpha;

          // Lâmina Reluzente Dourada/Prateada apontando para o centro (0,0)
          const bGrad = ctx.createLinearGradient(-9, 0, 9, 0);
          bGrad.addColorStop(0, '#cbd5e1');
          bGrad.addColorStop(0.5, '#ffffff');
          bGrad.addColorStop(1, '#94a3b8');
          ctx.fillStyle = bGrad;
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.6;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 20;

          ctx.beginPath();
          ctx.moveTo(-8, 45);
          ctx.lineTo(-6, -65);
          ctx.lineTo(0, -95);
          ctx.lineTo(6, -65);
          ctx.lineTo(8, 45);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Guarda-mão Imperial Dourada
          ctx.fillStyle = '#f59e0b';
          ctx.strokeStyle = '#fef08a';
          ctx.beginPath();
          ctx.moveTo(-28, 42);
          ctx.quadraticCurveTo(0, 52, 28, 42);
          ctx.lineTo(24, 50);
          ctx.quadraticCurveTo(0, 58, -24, 50);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Cabo e Pomo
          ctx.fillStyle = '#78350f';
          ctx.fillRect(-4.5, 50, 9, 24);
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(0, 78, 7, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        };

        // 3 Espadas espaçadas em 120° (2*PI/3) formando uma Estrela Tripla
        const radialDist = progress <= 0.52 ? 55 : 55 * (1 - easeCross * 0.85);
        for (let s = 0; s < 3; s++) {
          const swordAngle = starRot + (s * Math.PI * 2) / 3;
          drawMasterSword(swordAngle, radialDist);
        }

        // Brilho Estelar Explosivo quando as 3 espadas se cruzam no centro!
        if (progress >= 0.52) {
          const flashT = (progress - 0.52) / 0.48;
          drawFourPointStar(targetX, targetY, 58 * (1 - flashT * 0.4), '#ffffff', timeSec * 6);
          drawFourPointStar(targetX, targetY, 82 * (1 - flashT * 0.4), '#fbbf24', -timeSec * 4);
        }

        drawFloatingBadge(
          targetX,
          targetY - cardH / 2 - 28,
          '⚔️⭐ CRÍTICO · +15 PODER',
          '#fbbf24',
          '#fef9c3',
          masterAlpha
        );
        ctx.restore();
      }

      // ============================================================================
      // 13. JURISDIÇÃO DE SANIEL: Um raio divino atinge o alvo
      // ============================================================================
      else if (vfx.skillType === 'n_jurisdicao_de_saniel') {
        ctx.save();

        // Raio Divino Dourado-Branco descendo dos céus diretamente sobre a carta alvo
        const boltProg = Math.min(1, progress / 0.16);
        const endY = boltProg * targetY;

        // Clarão Celestial no topo da tela
        const skyGlow = ctx.createRadialGradient(targetX, 0, 10, targetX, 0, 260);
        skyGlow.addColorStop(0, `rgba(255, 255, 255, ${0.95 * masterAlpha})`);
        skyGlow.addColorStop(0.45, `rgba(253, 224, 71, ${0.65 * masterAlpha})`);
        skyGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = skyGlow;
        ctx.beginPath();
        ctx.arc(targetX, 0, 260, 0, Math.PI * 2);
        ctx.fill();

        // Tronco Principal Ziguezagueante do Raio Divino de Saniel
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 11;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 35;
        ctx.globalAlpha = masterAlpha;

        const segments = 14;
        ctx.beginPath();
        ctx.moveTo(targetX, 0);
        for (let i = 1; i <= segments; i++) {
          const frac = i / segments;
          const py = endY * frac;
          const jitter =
            i === segments
              ? 0
              : Math.sin(i * 7.3 + Math.floor(timeSec * 28)) * 34;
          ctx.lineTo(targetX + jitter, py);
        }
        ctx.stroke();

        // Segundo traço dourado externo
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 22;
        ctx.globalAlpha = masterAlpha * 0.42;
        ctx.stroke();
        ctx.restore();

        // Impacto do Julgamento Celestial e Correntes de Silenciamento na Carta Alvo
        if (boltProg >= 0.95) {
          const impGrad = ctx.createRadialGradient(targetX, targetY, 6, targetX, targetY, cardW * 1.25);
          impGrad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * masterAlpha})`);
          impGrad.addColorStop(0.45, `rgba(250, 204, 21, ${0.65 * masterAlpha})`);
          impGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = impGrad;
          ctx.beginPath();
          ctx.arc(targetX, targetY, cardW * 1.25, 0, Math.PI * 2);
          ctx.fill();

          // Anel de Julgamento de Saniel trancando a carta por 2 rodadas
          ctx.save();
          ctx.translate(targetX, targetY);
          ctx.rotate(timeSec * 2.5);
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 3.5;
          ctx.setLineDash([14, 8]);
          ctx.shadowColor = '#eab308';
          ctx.shadowBlur = 20;
          ctx.globalAlpha = masterAlpha;
          ctx.beginPath();
          ctx.arc(0, 0, cardW * 0.68, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        drawFloatingBadge(
          targetX,
          targetY - cardH / 2 - 28,
          '⚡🔇 SILENCIADO POR 2 RODADAS',
          '#fde047',
          '#fef9c3',
          masterAlpha
        );
        ctx.restore();
      }

      // ============================================================================
      // 14. LETARGIA LUNAR: Feixes de luz da lua que causam sono
      // ============================================================================
      else if (vfx.skillType === 'm_letargia_lunar') {
        ctx.save();

        const moonX = targetX - 110;
        const moonY = Math.max(85, targetY - 220);

        // Feixe Cônico Diagonal de Luz da Lua descendo sobre a carta alvo
        const beamGrad = ctx.createLinearGradient(moonX, moonY, targetX, targetY + cardH * 0.5);
        beamGrad.addColorStop(0, `rgba(224, 231, 255, ${0.72 * masterAlpha})`);
        beamGrad.addColorStop(0.55, `rgba(129, 140, 248, ${0.42 * masterAlpha})`);
        beamGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(moonX - 18, moonY + 10);
        ctx.lineTo(moonX + 24, moonY - 10);
        ctx.lineTo(targetX + cardW * 0.95, targetY + cardH * 0.55);
        ctx.lineTo(targetX - cardW * 0.95, targetY + cardH * 0.55);
        ctx.closePath();
        ctx.fill();

        // Lua Crescente Prateada/Índigo brilhando no alto
        ctx.save();
        ctx.translate(moonX, moonY);
        ctx.globalAlpha = masterAlpha;
        ctx.fillStyle = '#e0e7ff';
        ctx.shadowColor = '#818cf8';
        ctx.shadowBlur = 32;
        ctx.beginPath();
        ctx.arc(0, 0, 38, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(14, -10, 32, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Poeira Lunar e Símbolos "Zzz 💤" subindo suavemente da unidade adormecida
        const sleepSymbols = ['Z', 'z', 'Z', '💤', '✧', 'z'];
        for (let i = 0; i < sleepSymbols.length; i++) {
          const sp = (timeSec * 0.65 + i * 0.16) % 1;
          const sx = targetX + Math.sin(sp * Math.PI * 2 + i) * 42;
          const sy = targetY + 20 - sp * 135;
          ctx.save();
          ctx.globalAlpha = (1 - sp) * masterAlpha;
          ctx.font = '900 22px Cinzel, serif';
          ctx.fillStyle = i % 2 === 0 ? '#e0e7ff' : '#a5b4fc';
          ctx.shadowColor = '#6366f1';
          ctx.shadowBlur = 14;
          ctx.fillText(sleepSymbols[i], sx, sy);
          ctx.restore();
        }

        drawFloatingBadge(
          targetX,
          targetY - cardH / 2 - 28,
          '🌙💤 SONO LUNAR',
          '#818cf8',
          '#e0e7ff',
          masterAlpha
        );
        ctx.restore();
      }

      // ============================================================================
      // 15. SOBERANIA: Honraria da Realeza (Coroa Imperial, Estandarte e Louros)
      // ============================================================================
      else if (vfx.skillType === 'g_soberania') {
        ctx.save();

        // Tapete/Estandarte Real Carmesim e Ouro atrás da Carta Alvo
        const bannerH = cardH * 1.22;
        const bannerW = cardW * 1.18;
        ctx.save();
        ctx.globalAlpha = masterAlpha * 0.88;
        const royalGrad = ctx.createLinearGradient(
          targetX,
          targetY - bannerH / 2,
          targetX,
          targetY + bannerH / 2
        );
        royalGrad.addColorStop(0, 'rgba(159, 18, 57, 0.82)');
        royalGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.38)');
        royalGrad.addColorStop(1, 'rgba(136, 19, 55, 0.85)');

        ctx.fillStyle = royalGrad;
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 28;
        ctx.beginPath();
        ctx.roundRect(targetX - bannerW / 2, targetY - bannerH / 2, bannerW, bannerH, 16);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Coroa Imperial Dourada descendo solenemente sobre o topo da carta selecionada
        const crownDrop = Math.min(1, progress / 0.35);
        const crownY = targetY - cardH * 0.45 - (1 - crownDrop) * 65;

        ctx.save();
        ctx.translate(targetX, crownY);
        ctx.globalAlpha = masterAlpha;
        const crownGrad = ctx.createLinearGradient(-42, -25, 42, 15);
        crownGrad.addColorStop(0, '#d97706');
        crownGrad.addColorStop(0.5, '#fef08a');
        crownGrad.addColorStop(1, '#b45309');

        ctx.fillStyle = crownGrad;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 24;

        ctx.beginPath();
        ctx.moveTo(-36, 12);
        ctx.lineTo(-42, -16);
        ctx.lineTo(-20, -2);
        ctx.lineTo(0, -26);
        ctx.lineTo(20, -2);
        ctx.lineTo(42, -16);
        ctx.lineTo(36, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Joias Reais na Coroa
        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.arc(0, 2, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(-20, 4, 3.5, 0, Math.PI * 2);
        ctx.arc(20, 4, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        drawFloatingBadge(
          targetX,
          targetY - cardH / 2 - 48,
          '👑 SOBERANIA REAL · +15 ATQ / +15 DEF',
          '#fbbf24',
          '#fef08a',
          masterAlpha
        );
        ctx.restore();
      }

      // ============================================================================
      // 16. CONCESSÃO DIVINA: Grande brilho divino e asas de arcanjo em volta do alvo
      // ============================================================================
      else if (vfx.skillType === 'g_concessao_divina') {
        ctx.save();

        const wingSpread = Math.min(1, progress / 0.32);
        const easeWings = 1 - Math.pow(1 - wingSpread, 3);

        // Grande Brilho Divino Radiante envolvendo o alvo
        const divGrad = ctx.createRadialGradient(targetX, targetY, 10, targetX, targetY, cardW * 1.75);
        divGrad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * masterAlpha})`);
        divGrad.addColorStop(0.4, `rgba(254, 240, 138, ${0.75 * masterAlpha})`);
        divGrad.addColorStop(0.75, `rgba(245, 158, 11, ${0.35 * masterAlpha})`);
        divGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = divGrad;
        ctx.beginPath();
        ctx.arc(targetX, targetY, cardW * 1.75, 0, Math.PI * 2);
        ctx.fill();

        // Desenho das Majestosas Asas de Arcanjo (Esquerda e Direita) abrindo-se ao redor do alvo
        const drawArchangelWing = (dir: -1 | 1) => {
          ctx.save();
          ctx.translate(targetX + dir * (cardW * 0.28), targetY);
          ctx.scale(dir * easeWings, easeWings);
          ctx.rotate(Math.sin(timeSec * 5) * 0.06);
          ctx.globalAlpha = masterAlpha;

          for (let layer = 0; layer < 3; layer++) {
            const span = 145 - layer * 26;
            const lift = -75 + layer * 28;
            const wGrad = ctx.createLinearGradient(0, 0, span, lift);
            wGrad.addColorStop(0, '#ffffff');
            wGrad.addColorStop(0.6, '#fef08a');
            wGrad.addColorStop(1, '#f59e0b');

            ctx.fillStyle = wGrad;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#fde047';
            ctx.shadowBlur = 24;

            ctx.beginPath();
            ctx.moveTo(0, -10 + layer * 12);
            ctx.quadraticCurveTo(span * 0.55, lift - 35, span, lift);
            ctx.quadraticCurveTo(span * 0.65, lift + 42, 0, 22 + layer * 12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
          ctx.restore();
        };

        drawArchangelWing(-1);
        drawArchangelWing(1);

        // Auréola Sagrada sobre o Alvo
        ctx.save();
        ctx.translate(targetX, targetY - cardH * 0.56);
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 22;
        ctx.globalAlpha = masterAlpha;
        ctx.beginPath();
        ctx.ellipse(0, 0, 48, 12, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        drawFloatingBadge(
          targetX,
          targetY - cardH / 2 - 42,
          '🪽✨ CONCESSÃO DIVINA · RESSURREIÇÃO ATIVA',
          '#fde047',
          '#ffffff',
          masterAlpha
        );
        ctx.restore();
      }

      // ============================================================================
      // 17. ESCOLHIDO DAS ESTRELAS: Estrelas mágicas incorporam a carta e fazem o efeito
      // ============================================================================
      else if (vfx.skillType === 'n_escolhido_estrelas') {
        ctx.save();

        // Fase 1 (0 -> 0.62): 9 Estrelas Mágicas espiralam do cosmos e se incorporam ao núcleo da carta
        // Fase 2 (0.60 -> 1.0): Explosão Astral de Ascensão Nível 2
        const incorpT = Math.min(1, progress / 0.62);
        const easeIncorp = incorpT * incorpT * (3 - 2 * incorpT);

        const starCount = 9;
        for (let s = 0; s < starCount; s++) {
          const angle = (Math.PI * 2 * s) / starCount + timeSec * 5.2;
          const radius = (1 - easeIncorp) * 230;
          const sx = targetX + Math.cos(angle) * radius;
          const sy = targetY + Math.sin(angle) * radius;

          // Cauda Cósmica da Estrela Mágica
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(
            targetX + Math.cos(angle - 0.35) * (radius + 45),
            targetY + Math.sin(angle - 0.35) * (radius + 45)
          );
          ctx.strokeStyle = s % 2 === 0 ? '#38bdf8' : '#fde047';
          ctx.lineWidth = 4;
          ctx.globalAlpha = masterAlpha * 0.85;
          ctx.stroke();

          drawFourPointStar(
            sx,
            sy,
            16 * (1 - easeIncorp * 0.3),
            s % 2 === 0 ? '#fef08a' : '#7dd3fc',
            timeSec * 8 + s
          );
        }

        // Quando as estrelas se incorporam na carta (progress >= 0.55): Pilar Astral Nível 2
        if (progress >= 0.55) {
          const burstT = (progress - 0.55) / 0.45;
          ctx.save();
          ctx.globalAlpha = (1 - burstT * 0.5) * masterAlpha;
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 32;
          ctx.beginPath();
          ctx.roundRect(targetX - cardW / 2 - 8, targetY - cardH / 2 - 8, cardW + 16, cardH + 16, 16);
          ctx.stroke();

          drawFourPointStar(targetX, targetY, 64 * (1 - burstT * 0.4), '#ffffff', timeSec * 6);
          ctx.restore();
        }

        drawFloatingBadge(
          targetX,
          targetY - cardH / 2 - 30,
          '🌟⬆️ INCORPORAÇÃO ESTELAR · NÍVEL 2',
          '#38bdf8',
          '#fef08a',
          masterAlpha
        );
        ctx.restore();
      }

      // ============================================================================
      // 18. VOTO DO ABSOLUTO: Um buraco negro consome a carta alvo
      // ============================================================================
      else if (vfx.skillType === 'n_voto_do_absoluto') {
        ctx.save();

        const bhRadius = Math.max(82, cardW * 0.72);
        const pullProgress = Math.min(1, progress / 0.78);

        ctx.translate(targetX, targetY);
        ctx.globalAlpha = masterAlpha;

        // 1. Disco de Acreção Relativístico (Violeta, Carmesim e Ouro Cósmico girando em alta velocidade)
        for (let ring = 0; ring < 4; ring++) {
          ctx.save();
          ctx.rotate(timeSec * (4.5 + ring * 1.4));
          const r = bhRadius * (0.85 + ring * 0.22);
          ctx.strokeStyle =
            ring === 0 ? '#fef08a' : ring === 1 ? '#c084fc' : ring === 2 ? '#9333ea' : '#4c1d95';
          ctx.lineWidth = 10 - ring * 2;
          ctx.shadowColor = '#a855f7';
          ctx.shadowBlur = 28;
          ctx.beginPath();
          ctx.ellipse(0, 0, r * 1.25, r * 0.55, 0.25, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // 2. Silhueta da Carta Sendo Distorcida e Sugada para Dentro do Buraco Negro
        if (pullProgress < 0.96) {
          const shrink = Math.max(0.02, 1 - pullProgress);
          ctx.save();
          ctx.rotate(pullProgress * Math.PI * 4);
          ctx.scale(shrink, shrink);
          ctx.strokeStyle = '#e9d5ff';
          ctx.fillStyle = 'rgba(88, 28, 135, 0.55)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        // 3. Horizonte de Eventos (Núcleo Negro Absoluto com Anel de Fótons Branco-Violeta)
        const coreR = bhRadius * (progress > 0.8 ? Math.max(0.1, 1 - (progress - 0.8) * 4) : 0.68);
        ctx.fillStyle = '#020106';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 35;
        ctx.beginPath();
        ctx.arc(0, 0, coreR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();

        drawFloatingBadge(
          targetX,
          targetY - bhRadius * 1.5 - 18,
          '🕳️💀 OBLITERADO PELO BURACO NEGRO',
          '#c084fc',
          '#f3e8ff',
          masterAlpha
        );
      }

      // ============================================================================
      // 19. VETO DO INDÔMITO: Um martelo de tribunal divino sentenciando
      // ============================================================================
      else if (vfx.skillType === 'n_veto_do_indomito') {
        ctx.save();

        const cx = width / 2;
        const cy = height * 0.50;

        // Fase 1 (0 -> 0.26): O Martelo de Tribunal Divino desce em arco fulminante
        // Fase 2 (0.26 -> 1.0): Impacto na Base de Sentença + Estilhaçamento da Habilidade Inimiga
        const strikeT = Math.min(1, progress / 0.26);
        const easeHammer = strikeT * strikeT * strikeT;

        // Base Dourada do Tribunal Divino (Sounding Block)
        ctx.save();
        ctx.translate(cx, cy + 52);
        ctx.globalAlpha = masterAlpha;
        const blockGrad = ctx.createLinearGradient(-95, -18, 95, 18);
        blockGrad.addColorStop(0, '#78350f');
        blockGrad.addColorStop(0.5, '#fbbf24');
        blockGrad.addColorStop(1, '#78350f');
        ctx.fillStyle = blockGrad;
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.roundRect(-95, -16, 190, 32, 10);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Onda de Choque de Sentença e Estilhaços da Habilidade Vetada (progress >= 0.25)
        if (progress >= 0.25) {
          const shockT = (progress - 0.25) / 0.75;
          ctx.save();
          ctx.globalAlpha = (1 - shockT) * masterAlpha;
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 8 * (1 - shockT);
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 32;
          ctx.beginPath();
          ctx.arc(cx, cy + 34, 30 + shockT * 260, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // Estilhaços da Habilidade Inimiga Vetada voando para os lados
          for (let s = 0; s < 22; s++) {
            const p = particles[s];
            const dist = 25 + shockT * p.dist * 1.4;
            const sx = cx + Math.cos(p.angle) * dist;
            const sy = cy + 25 + Math.sin(p.angle) * dist;
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(timeSec * 8 + s);
            ctx.globalAlpha = (1 - shockT) * masterAlpha;
            ctx.fillStyle = s % 2 === 0 ? '#f43f5e' : '#fde047';
            ctx.beginPath();
            ctx.moveTo(0, -8);
            ctx.lineTo(7, 6);
            ctx.lineTo(-7, 6);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }

        // Desenho do Colossal Martelo de Tribunal Divino (Divine Gavel)
        ctx.save();
        const pivotX = cx + 125;
        const pivotY = cy + 28;
        const hammerAngle = -1.15 * (1 - easeHammer);
        ctx.translate(pivotX, pivotY);
        ctx.rotate(hammerAngle);
        ctx.globalAlpha = masterAlpha;

        // Cabo Longo Ornamentado do Martelo
        ctx.fillStyle = '#92400e';
        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.roundRect(-130, -9, 130, 18, 6);
        ctx.fill();
        ctx.stroke();

        // Cabeça Cilíndrica Dupla do Martelo de Tribunal Divino (Ouro & Mármore Celestial)
        const headGrad = ctx.createLinearGradient(-165, -48, -85, 48);
        headGrad.addColorStop(0, '#b45309');
        headGrad.addColorStop(0.5, '#fef08a');
        headGrad.addColorStop(1, '#d97706');
        ctx.fillStyle = headGrad;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.8;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 28;
        ctx.beginPath();
        ctx.roundRect(-162, -46, 74, 92, 12);
        ctx.fill();
        ctx.stroke();

        // Frisos de Julgamento nas extremidades do Martelo
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-166, -42, 8, 84);
        ctx.fillRect(-92, -42, 8, 84);
        ctx.restore();

        drawFloatingBadge(
          cx,
          cy + 108,
          '⚖️🔨 SENTENÇA EXECUTADA · HABILIDADE INIMIGA VETADA!',
          '#fbbf24',
          '#fef08a',
          masterAlpha
        );
        ctx.restore();
      }

      // ========================================================================
      // 20. FLECHA ELÉTRICA — Arco de Plasma & Flecha de Eletricidade no Alvo
      // ========================================================================
      else if (vfx.skillType === 'token_flecha_eletrica') {
        // Ponto de origem do disparo (lado oposto ao alvo para cruzar a arena com clareza)
        const startX = Math.max(width * 0.18, targetX - 310);
        const startY = vfx.targetSide === 'opponent' ? Math.min(height * 0.78, targetY + 290) : Math.max(height * 0.22, targetY - 290);
        const bowAngle = Math.atan2(targetY - startY, targetX - startX);

        // Fase 1: Tensão do Arco Elétrico (0 -> 0.24), Fase 2: Voo Fulminante (0.20 -> 0.42), Fase 3: Explosão Voltaica no Alvo (0.40 -> 1.0)
        const bowAlpha = progress < 0.48 ? Math.min(1, progress / 0.12) * (1 - Math.max(0, (progress - 0.32) / 0.16)) : 0;
        const pullAmount = progress < 0.22 ? (progress / 0.22) * 38 : 0;

        // Desenha o Arco de Plasma Elétrico na origem
        if (bowAlpha > 0.01) {
          ctx.save();
          ctx.translate(startX, startY);
          ctx.rotate(bowAngle);
          ctx.globalAlpha = bowAlpha * masterAlpha;

          // Halo energético do arco
          const bowGlow = ctx.createRadialGradient(0, 0, 6, 0, 0, 75);
          bowGlow.addColorStop(0, 'rgba(224, 242, 254, 0.85)');
          bowGlow.addColorStop(0.5, 'rgba(34, 211, 238, 0.35)');
          bowGlow.addColorStop(1, 'transparent');
          ctx.fillStyle = bowGlow;
          ctx.beginPath();
          ctx.arc(0, 0, 75, 0, Math.PI * 2);
          ctx.fill();

          // Limbo curvo do Arco Voltaico
          ctx.strokeStyle = '#e0f2fe';
          ctx.lineWidth = 5;
          ctx.shadowColor = '#22d3ee';
          ctx.shadowBlur = 24;
          ctx.beginPath();
          ctx.arc(-18, 0, 58, -Math.PI * 0.42, Math.PI * 0.42);
          ctx.stroke();

          // Corda de laser elétrico tracionada
          const tipTopX = -18 + Math.cos(-Math.PI * 0.42) * 58;
          const tipTopY = Math.sin(-Math.PI * 0.42) * 58;
          const tipBotX = -18 + Math.cos(Math.PI * 0.42) * 58;
          const tipBotY = Math.sin(Math.PI * 0.42) * 58;
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(tipTopX, tipTopY);
          ctx.lineTo(-pullAmount, 0);
          ctx.lineTo(tipBotX, tipBotY);
          ctx.stroke();
          ctx.restore();
        }

        // Voo da Flecha de Eletricidade (progress 0.16 -> 0.44)
        const flightT = Math.min(1, Math.max(0, (progress - 0.16) / 0.26));
        const easeFlight = 1 - Math.pow(1 - flightT, 2);
        const arrowX = startX + (targetX - startX) * easeFlight;
        const arrowY = startY + (targetY - startY) * easeFlight;

        // Trilha de Relâmpago Ramificado ligando o disparo até a flecha/alvo
        if (progress >= 0.16 && progress <= 0.82) {
          const trailFade = progress < 0.44 ? 1 : Math.max(0, 1 - (progress - 0.44) / 0.38);
          ctx.save();
          ctx.globalAlpha = trailFade * masterAlpha;
          for (let b = 0; b < 3; b++) {
            ctx.strokeStyle = b === 0 ? '#ffffff' : b === 1 ? '#22d3ee' : '#fde047';
            ctx.lineWidth = b === 0 ? 4.5 : 2.2;
            ctx.shadowColor = '#22d3ee';
            ctx.shadowBlur = 22;
            ctx.beginPath();
            const segs = 14;
            for (let s = 0; s <= segs; s++) {
              const st = s / segs;
              const bx = startX + (arrowX - startX) * st;
              const by = startY + (arrowY - startY) * st;
              const jitter = s === 0 || s === segs ? 0 : Math.sin(timeSec * 45 + s * 2.7 + b * 1.9) * (14 + b * 6);
              const perpX = -Math.sin(bowAngle) * jitter;
              const perpY = Math.cos(bowAngle) * jitter;
              if (s === 0) ctx.moveTo(bx, by);
              else ctx.lineTo(bx + perpX, by + perpY);
            }
            ctx.stroke();
          }
          ctx.restore();
        }

        // Desenha a Flecha de Eletricidade em si (enquanto voa e cravada no alvo)
        if (progress >= 0.08 && progress <= 0.78) {
          const arrowAlpha = progress < 0.55 ? 1 : Math.max(0, 1 - (progress - 0.55) / 0.23);
          ctx.save();
          ctx.translate(arrowX, arrowY);
          ctx.rotate(bowAngle);
          ctx.globalAlpha = arrowAlpha * masterAlpha;

          // Haste de plasma ciano/branco
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 5;
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 28;
          ctx.beginPath();
          ctx.moveTo(-68, 0);
          ctx.lineTo(24, 0);
          ctx.stroke();

          // Ponta de Flecha Fulminante em formato de raio/diamante
          ctx.fillStyle = '#fef08a';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(42, 0);
          ctx.lineTo(8, -15);
          ctx.lineTo(16, 0);
          ctx.lineTo(8, 15);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Penas traseiras de eletricidade
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-50, 0);
          ctx.lineTo(-68, -13);
          ctx.moveTo(-50, 0);
          ctx.lineTo(-68, 13);
          ctx.moveTo(-38, 0);
          ctx.lineTo(-56, -11);
          ctx.moveTo(-38, 0);
          ctx.lineTo(-56, 11);
          ctx.stroke();
          ctx.restore();
        }

        // Explosão Elétrica de Alta Voltagem no Alvo (progress >= 0.40)
        if (progress >= 0.40) {
          const impT = (progress - 0.40) / 0.60;
          const shakeX = impT < 0.35 ? Math.sin(timeSec * 90) * 8 * (1 - impT) : 0;
          const shakeY = impT < 0.35 ? Math.cos(timeSec * 82) * 6 * (1 - impT) : 0;

          ctx.save();
          ctx.translate(shakeX, shakeY);

          // Clarão de eletrocussão sobre a carta alvo
          drawCardHighlight(targetX, targetY, '#22d3ee', Math.sin(impT * Math.PI) * 0.95 * masterAlpha);

          const flashGrad = ctx.createRadialGradient(targetX, targetY, 8, targetX, targetY, 175);
          flashGrad.addColorStop(0, `rgba(255, 255, 255, ${(1 - impT * 0.6) * masterAlpha})`);
          flashGrad.addColorStop(0.35, `rgba(34, 211, 238, ${0.75 * (1 - impT * 0.5) * masterAlpha})`);
          flashGrad.addColorStop(0.7, `rgba(250, 204, 21, ${0.35 * (1 - impT) * masterAlpha})`);
          flashGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = flashGrad;
          ctx.beginPath();
          ctx.arc(targetX, targetY, 175, 0, Math.PI * 2);
          ctx.fill();

          // Onda de choque elétrica expansiva
          ctx.save();
          ctx.globalAlpha = (1 - impT) * masterAlpha;
          ctx.strokeStyle = '#67e8f9';
          ctx.lineWidth = 5 * (1 - impT * 0.6);
          ctx.shadowColor = '#22d3ee';
          ctx.shadowBlur = 24;
          ctx.beginPath();
          ctx.arc(targetX, targetY, 24 + impT * 155, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // Arcos Voltaicos / Raios eletrocutando a carta alvo em 8 direções
          for (let a = 0; a < 8; a++) {
            const baseAng = (a / 8) * Math.PI * 2 + timeSec * 2.5;
            ctx.save();
            ctx.globalAlpha = (1 - impT * 0.65) * masterAlpha;
            ctx.strokeStyle = a % 2 === 0 ? '#ffffff' : '#fde047';
            ctx.lineWidth = a % 2 === 0 ? 3 : 2.2;
            ctx.shadowColor = '#22d3ee';
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.moveTo(targetX, targetY);
            for (let step = 1; step <= 5; step++) {
              const dist = step * (18 + impT * 12);
              const jitterAng = baseAng + Math.sin(timeSec * 38 + a * 3 + step * 2.1) * 0.28;
              ctx.lineTo(targetX + Math.cos(jitterAng) * dist, targetY + Math.sin(jitterAng) * dist);
            }
            ctx.stroke();
            ctx.restore();
          }

          drawFloatingBadge(
            targetX,
            targetY + cardH * 0.62,
            '🏹⚡ FLECHA ELÉTRICA · -9 DANO + ELETRIFICADO 1R!',
            '#22d3ee',
            '#ecfeff',
            masterAlpha
          );
          ctx.restore();
        }
      }

      // ========================================================================
      // 21. FAGULHA ESTELAR — Duas Estrelas Cadentes Atingindo o Alvo
      // ========================================================================
      else if (vfx.skillType === 'token_fagulha_estelar') {
        // Céu noturno estelar ao redor do alvo
        const cosmosGrad = ctx.createRadialGradient(targetX, targetY - 40, 20, targetX, targetY, 260);
        cosmosGrad.addColorStop(0, `rgba(56, 189, 248, ${0.28 * masterAlpha})`);
        cosmosGrad.addColorStop(0.55, `rgba(99, 102, 241, ${0.18 * masterAlpha})`);
        cosmosGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = cosmosGrad;
        ctx.beginPath();
        ctx.arc(targetX, targetY, 260, 0, Math.PI * 2);
        ctx.fill();

        // Função auxiliar para desenhar cada uma das 2 Estrelas Cadentes (Shooting Stars)
        const drawShootingStar = (
          starIndex: number,
          startWindow: number,
          impactTime: number,
          originOffsetX: number,
          originOffsetY: number,
          impactOffsetX: number,
          impactOffsetY: number,
          primaryColor: string,
          secondaryColor: string
        ) => {
          if (progress < startWindow) return;

          const sX = targetX + originOffsetX;
          const sY = targetY + originOffsetY;
          const eX = targetX + impactOffsetX;
          const eY = targetY + impactOffsetY;

          const flightDur = impactTime - startWindow;
          const fT = Math.min(1, Math.max(0, (progress - startWindow) / flightDur));
          const easeStar = Math.pow(fT, 1.45);

          const curX = sX + (eX - sX) * easeStar;
          const curY = sY + (eY - sY) * easeStar;
          const angle = Math.atan2(eY - sY, eX - sX);

          // Desenha a Estrela Cadente e sua Cauda Cometa durante a queda
          if (progress <= impactTime + 0.12) {
            const starVis = progress <= impactTime ? 1 : Math.max(0, 1 - (progress - impactTime) / 0.12);
            ctx.save();
            ctx.globalAlpha = starVis * masterAlpha;

            // Cauda longa luminosa da Estrela Cadente
            const tailLen = 185;
            const tailX = curX - Math.cos(angle) * tailLen;
            const tailY = curY - Math.sin(angle) * tailLen;
            const tailGrad = ctx.createLinearGradient(curX, curY, tailX, tailY);
            tailGrad.addColorStop(0, '#ffffff');
            tailGrad.addColorStop(0.25, primaryColor);
            tailGrad.addColorStop(0.65, secondaryColor);
            tailGrad.addColorStop(1, 'transparent');

            ctx.strokeStyle = tailGrad;
            ctx.lineWidth = 12;
            ctx.lineCap = 'round';
            ctx.shadowColor = primaryColor;
            ctx.shadowBlur = 26;
            ctx.beginPath();
            ctx.moveTo(curX, curY);
            ctx.lineTo(tailX, tailY);
            ctx.stroke();

            // Poeira cósmica cintilante ao longo da cauda
            for (let p = 0; p < 10; p++) {
              const pt = p / 10;
              const px = curX - Math.cos(angle) * (tailLen * pt) + Math.sin(timeSec * 14 + p * 2 + starIndex) * 10;
              const py = curY - Math.sin(angle) * (tailLen * pt) + Math.cos(timeSec * 12 + p * 2 + starIndex) * 10;
              ctx.fillStyle = p % 2 === 0 ? '#ffffff' : '#fef08a';
              ctx.beginPath();
              ctx.arc(px, py, (1 - pt) * 3.8, 0, Math.PI * 2);
              ctx.fill();
            }

            // Núcleo de 8 pontas da Estrela Cadente
            ctx.translate(curX, curY);
            ctx.rotate(timeSec * 7 + starIndex * 1.5);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = primaryColor;
            ctx.shadowBlur = 30;
            ctx.beginPath();
            const spikes = 8;
            for (let i = 0; i < spikes * 2; i++) {
              const r = i % 2 === 0 ? 24 : 7;
              const a = (i * Math.PI) / spikes;
              if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
              else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }

          // Explosão Estelar da Estrela Cadente ao atingir o alvo
          if (progress >= impactTime) {
            const impT = Math.min(1, (progress - impactTime) / 0.42);
            ctx.save();
            ctx.globalAlpha = (1 - impT) * masterAlpha;

            // Anel de choque cósmico
            ctx.strokeStyle = primaryColor;
            ctx.lineWidth = 5 * (1 - impT);
            ctx.shadowColor = primaryColor;
            ctx.shadowBlur = 24;
            ctx.beginPath();
            ctx.arc(eX, eY, 18 + impT * 125, 0, Math.PI * 2);
            ctx.stroke();

            // Estilhaços de pequenas estrelas voando no impacto
            for (let s = 0; s < 8; s++) {
              const sAng = (s / 8) * Math.PI * 2 + starIndex * 0.5;
              const sDist = 16 + impT * 92;
              const sx = eX + Math.cos(sAng) * sDist;
              const sy = eY + Math.sin(sAng) * sDist;
              ctx.save();
              ctx.translate(sx, sy);
              ctx.rotate(timeSec * 6 + s);
              ctx.fillStyle = s % 2 === 0 ? '#fef08a' : primaryColor;
              ctx.beginPath();
              for (let k = 0; k < 8; k++) {
                const kr = k % 2 === 0 ? 8 * (1 - impT * 0.5) : 3 * (1 - impT * 0.5);
                const ka = (k * Math.PI) / 4;
                if (k === 0) ctx.moveTo(Math.cos(ka) * kr, Math.sin(ka) * kr);
                else ctx.lineTo(Math.cos(ka) * kr, Math.sin(ka) * kr);
              }
              ctx.closePath();
              ctx.fill();
              ctx.restore();
            }

            // Selo de impacto individual (-3 Dano)
            ctx.font = '900 16px "Cinzel", serif';
            ctx.fillStyle = '#fef08a';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#0284c7';
            ctx.shadowBlur = 12;
            ctx.fillText(`⭐ -3 DANO`, eX, eY - 28 - impT * 36);
            ctx.restore();
          }
        };

        // 1ª Estrela Cadente (Ciano/Ouro — vem da esquerda superior e atinge em progress = 0.34)
        drawShootingStar(
          1,
          0.02,
          0.34,
          -260,
          -310,
          -16,
          -8,
          '#38bdf8',
          'rgba(168, 85, 247, 0.45)'
        );

        // 2ª Estrela Cadente (Dourado/Magenta — vem da direita superior e atinge em progress = 0.60)
        drawShootingStar(
          2,
          0.28,
          0.60,
          250,
          -320,
          16,
          10,
          '#fbbf24',
          'rgba(236, 72, 153, 0.45)'
        );

        if (progress >= 0.32) {
          drawCardHighlight(targetX, targetY, '#38bdf8', masterAlpha * 0.9);
          drawFloatingBadge(
            targetX,
            targetY + cardH * 0.62,
            '🌠✨ 2x ESTRELAS CADENTES · -6 DANO TOTAL!',
            '#38bdf8',
            '#e0f2fe',
            masterAlpha
          );
        }
      }

      // ========================================================================
      // 22. ROCHEDO — Colossal Rocha Mágica Telúrica Esmagando o Alvo
      // ========================================================================
      else if (vfx.skillType === 'g_rochedo') {
        // Fase 1: Levitação e convocação da Grande Rocha Mágica (0 -> 0.32)
        // Fase 2: Queda Titânica sobre o alvo (0.32 -> 0.50)
        // Fase 3: Impacto Sísmico, Rachaduras Rúnicas e Redução de Ataque (0.50 -> 1.0)
        const impactAt = 0.48;
        const preImpactT = Math.min(1, progress / impactAt);
        const postImpactT = progress > impactAt ? (progress - impactAt) / (1 - impactAt) : 0;

        // Tremor de tela sísmico no impacto
        const quakeX = progress >= impactAt && postImpactT < 0.45 ? Math.sin(timeSec * 85) * 11 * (1 - postImpactT * 2) : 0;
        const quakeY = progress >= impactAt && postImpactT < 0.45 ? Math.cos(timeSec * 78) * 9 * (1 - postImpactT * 2) : 0;

        ctx.save();
        ctx.translate(quakeX, quakeY);

        // Sombra telúrica e círculo rúnico esmeralda se expandindo no chão sob a carta alvo
        const shadowScale = progress < impactAt ? 0.35 + preImpactT * 0.65 : 1 + postImpactT * 0.25;
        ctx.save();
        ctx.translate(targetX, targetY + 18);
        ctx.scale(1.35 * shadowScale, 0.55 * shadowScale);
        ctx.globalAlpha = masterAlpha * 0.85;
        const groundGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 110);
        groundGrad.addColorStop(0, 'rgba(6, 78, 59, 0.9)');
        groundGrad.addColorStop(0.6, 'rgba(16, 185, 129, 0.45)');
        groundGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = groundGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 110, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, 82, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Posição vertical da Grande Rocha Mágica
        const startRockY = targetY - 290;
        const dropCurve = preImpactT < 0.55
          ? (preImpactT / 0.55) * 0.18 // flutuação pesada concentrando magia
          : 0.18 + Math.pow((preImpactT - 0.55) / 0.45, 2.6) * 0.82; // queda esmagadora
        const rockY = startRockY + (targetY - startRockY) * dropCurve;
        const rockScale = progress < impactAt
          ? 0.55 + preImpactT * 0.55
          : Math.max(0.85, 1.10 - postImpactT * 0.2);
        const rockAlpha = progress < 0.78 ? masterAlpha : Math.max(0, (1 - (progress - 0.78) / 0.22) * masterAlpha);

        // Pedregulhos orbitais levitando em torno da Rocha Mágica
        if (progress < 0.62) {
          for (let m = 0; m < 6; m++) {
            const orbitAng = timeSec * 3.2 + (m * Math.PI) / 3;
            const ox = targetX + Math.cos(orbitAng) * 95 * rockScale;
            const oy = rockY + Math.sin(orbitAng) * 36 * rockScale;
            ctx.save();
            ctx.translate(ox, oy);
            ctx.rotate(timeSec * 4 + m);
            ctx.globalAlpha = rockAlpha * 0.9;
            ctx.fillStyle = '#57534e';
            ctx.strokeStyle = '#34d399';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(11, -3);
            ctx.lineTo(8, 9);
            ctx.lineTo(-9, 8);
            ctx.lineTo(-11, -4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
        }

        // Desenha a GRANDE ROCHA MÁGICA (Colossal Monólito Facetado com Cristais e Runas Brilhantes)
        if (rockAlpha > 0.02) {
          ctx.save();
          ctx.translate(targetX, rockY);
          ctx.scale(rockScale, rockScale);
          ctx.rotate(progress < impactAt ? Math.sin(timeSec * 5) * 0.08 : 0.06);
          ctx.globalAlpha = rockAlpha;

          // Aura Mágica Esmeralda/Âmbar ao redor do Rochedo
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 34;

          // Corpo principal da Grande Rocha Mágica (polígono facetado irregular de pedra ancestral)
          const rockGrad = ctx.createRadialGradient(-22, -26, 12, 0, 0, 96);
          rockGrad.addColorStop(0, '#78716c');
          rockGrad.addColorStop(0.55, '#44403c');
          rockGrad.addColorStop(1, '#1c1917');
          ctx.fillStyle = rockGrad;
          ctx.strokeStyle = '#6ee7b7';
          ctx.lineWidth = 3;

          ctx.beginPath();
          ctx.moveTo(0, -82);
          ctx.lineTo(52, -64);
          ctx.lineTo(84, -18);
          ctx.lineTo(74, 42);
          ctx.lineTo(28, 76);
          ctx.lineTo(-34, 74);
          ctx.lineTo(-78, 36);
          ctx.lineTo(-82, -24);
          ctx.lineTo(-46, -68);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Facetas internas de sombreamento da rocha
          ctx.fillStyle = 'rgba(28, 25, 23, 0.55)';
          ctx.beginPath();
          ctx.moveTo(0, -82);
          ctx.lineTo(14, -10);
          ctx.lineTo(74, 42);
          ctx.lineTo(28, 76);
          ctx.lineTo(-34, 74);
          ctx.lineTo(-18, 8);
          ctx.closePath();
          ctx.fill();

          // Veios de Magia Telúrica e Runas Cravadas na Rocha (brilho esmeralda e dourado)
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 3.5;
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          // Fissura mágica central
          ctx.moveTo(-38, -42);
          ctx.lineTo(-8, -12);
          ctx.lineTo(12, -24);
          ctx.lineTo(38, 14);
          ctx.moveTo(-8, -12);
          ctx.lineTo(-22, 32);
          ctx.lineTo(14, 48);
          ctx.stroke();

          // Runa Ancestral da Terra brilhando no centro da rocha
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.moveTo(0, -34);
          ctx.lineTo(24, 0);
          ctx.lineTo(0, 34);
          ctx.lineTo(-24, 0);
          ctx.closePath();
          ctx.moveTo(-14, 0);
          ctx.lineTo(14, 0);
          ctx.stroke();

          // Cristais Mágicos incrustados nas bordas do Rochedo
          const crystalCoords = [
            { x: -48, y: -38, rot: -0.6 },
            { x: 52, y: -28, rot: 0.55 },
            { x: -42, y: 28, rot: -2.2 },
            { x: 44, y: 32, rot: 2.1 },
          ];
          crystalCoords.forEach((c) => {
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.rot);
            ctx.fillStyle = '#34d399';
            ctx.strokeStyle = '#ecfdf5';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, -18);
            ctx.lineTo(9, 0);
            ctx.lineTo(5, 14);
            ctx.lineTo(-5, 14);
            ctx.lineTo(-9, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          });

          ctx.restore();
        }

        // Onda de Choque Sísmica, Fissuras Tectônicas e Estilhaços de Rocha Mágica após o impacto (progress >= impactAt)
        if (progress >= impactAt) {
          drawCardHighlight(targetX, targetY, '#10b981', (1 - postImpactT * 0.4) * masterAlpha);

          // Fissuras tectônicas esmeralda-magma irradiando da cratera
          for (let cr = 0; cr < 7; cr++) {
            const ang = (cr / 7) * Math.PI * 2 + 0.35;
            const len = 35 + Math.min(1, postImpactT * 2.2) * (105 + (cr % 3) * 28);
            ctx.save();
            ctx.globalAlpha = (1 - postImpactT * 0.75) * masterAlpha;
            ctx.strokeStyle = cr % 2 === 0 ? '#34d399' : '#fbbf24';
            ctx.lineWidth = 4 * (1 - postImpactT * 0.5);
            ctx.shadowColor = '#10b981';
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.moveTo(targetX, targetY + 12);
            const midX = targetX + Math.cos(ang + 0.14) * len * 0.52;
            const midY = targetY + 12 + Math.sin(ang + 0.14) * len * 0.38;
            const endX = targetX + Math.cos(ang) * len;
            const endY = targetY + 12 + Math.sin(ang) * len * 0.68;
            ctx.lineTo(midX, midY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            ctx.restore();
          }

          // Anéis de choque telúrico
          for (let r = 0; r < 3; r++) {
            const ringT = Math.min(1, Math.max(0, postImpactT - r * 0.11));
            ctx.save();
            ctx.globalAlpha = (1 - ringT) * masterAlpha;
            ctx.strokeStyle = r === 0 ? '#34d399' : r === 1 ? '#fbbf24' : '#a7f3d0';
            ctx.lineWidth = (7 - r * 2) * (1 - ringT);
            ctx.shadowColor = '#10b981';
            ctx.shadowBlur = 24;
            ctx.beginPath();
            ctx.arc(targetX, targetY, 32 + ringT * 195, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          // Fragmentos de rocha e cristais mágicos explodindo radialmente
          for (let f = 0; f < 20; f++) {
            const p = particles[f % particles.length];
            const dist = 28 + postImpactT * (110 + p.dist * 0.95);
            const fx = targetX + Math.cos(p.angle + f * 0.2) * dist;
            const fy = targetY + Math.sin(p.angle + f * 0.2) * dist + postImpactT * postImpactT * 52;
            ctx.save();
            ctx.translate(fx, fy);
            ctx.rotate(timeSec * 7 + f);
            ctx.globalAlpha = (1 - postImpactT) * masterAlpha;
            ctx.fillStyle = f % 3 === 0 ? '#34d399' : f % 3 === 1 ? '#78716c' : '#fbbf24';
            ctx.strokeStyle = '#1c1917';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(11, -2);
            ctx.lineTo(7, 10);
            ctx.lineTo(-9, 8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }

          drawFloatingBadge(
            targetX,
            targetY + cardH * 0.62,
            '🪨✨ ROCHEDO MÁGICO · -5 DANO & -25% ATAQUE!',
            '#10b981',
            '#d1fae5',
            masterAlpha
          );
        }

        ctx.restore();
      } else if (vfx.skillType === 'm_destino_fatal') {
        const strokeCol = '#ef4444';
        drawCardHighlight(targetX, targetY, strokeCol, masterAlpha);

        // Aura sombria de execução colapsando sobre a carta
        const darkGrad = ctx.createRadialGradient(targetX, targetY, 8, targetX, targetY, cardW * 1.3);
        darkGrad.addColorStop(0, `rgba(220, 38, 38, ${0.42 * masterAlpha})`);
        darkGrad.addColorStop(0.65, `rgba(127, 29, 29, ${0.32 * masterAlpha})`);
        darkGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = darkGrad;
        ctx.beginPath();
        ctx.arc(targetX, targetY, cardW * 1.3, 0, Math.PI * 2);
        ctx.fill();

        const slashT = Math.min(1, progress / 0.45);
        ctx.save();
        ctx.globalAlpha = masterAlpha;
        ctx.strokeStyle = '#fca5a5';
        ctx.shadowColor = '#dc2626';
        ctx.shadowBlur = 32;
        ctx.lineCap = 'round';
        ctx.lineWidth = 10 * (1 - slashT * 0.35);
        ctx.beginPath();
        ctx.moveTo(targetX - 115, targetY - 115);
        ctx.lineTo(targetX - 115 + 230 * slashT, targetY - 115 + 230 * slashT);
        ctx.stroke();
        if (progress > 0.2) {
          const s2 = Math.min(1, (progress - 0.2) / 0.38);
          ctx.beginPath();
          ctx.moveTo(targetX + 115, targetY - 115);
          ctx.lineTo(targetX + 115 - 230 * s2, targetY - 115 + 230 * s2);
          ctx.stroke();
        }
        // Selo circular rompendo-se após o X
        if (progress > 0.4) {
          const ringT = Math.min(1, (progress - 0.4) / 0.55);
          ctx.globalAlpha = (1 - ringT) * masterAlpha;
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(targetX, targetY, 26 + ringT * 135, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
        drawFloatingBadge(
          targetX,
          targetY - cardH * 0.62,
          '💀 SENTENÇA: EXECUTAR!',
          '#ef4444',
          '#fee2e2',
          masterAlpha
        );
      } else if (vfx.skillType === 'token_centelha') {
        // Tier 4 Elevado: Clarão Sagrado Fulminante com pilar celestial, arcos elétricos dourados e halo octogonal
        drawCardHighlight(targetX, targetY, '#fde047', masterAlpha);
        const strikeT = Math.min(1, progress / 0.38);
        const burstT = Math.max(0, Math.min(1, (progress - 0.3) / 0.7));

        // Halo celeste Tier 4 atrás do alvo
        ctx.save();
        ctx.translate(targetX, targetY);
        ctx.rotate(timeSec * 1.4);
        ctx.globalAlpha = (0.72 - burstT * 0.25) * masterAlpha;
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.arc(0, 0, cardW * 0.76, 0, Math.PI * 2);
        ctx.stroke();
        for (let r = 0; r < 8; r++) {
          const ra = (r * Math.PI) / 4;
          ctx.beginPath();
          ctx.moveTo(Math.cos(ra) * (cardW * 0.62), Math.sin(ra) * (cardW * 0.62));
          ctx.lineTo(Math.cos(ra) * (cardW * 0.96), Math.sin(ra) * (cardW * 0.96));
          ctx.stroke();
        }
        ctx.restore();

        // Raio sagrado descendo dos céus
        ctx.save();
        ctx.globalAlpha = (1 - Math.max(0, progress - 0.55) / 0.45) * masterAlpha;
        const beamH = targetY + 20;
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = '#fde047';
        ctx.shadowBlur = 32;
        ctx.lineWidth = 10 * (1 - progress * 0.45);
        ctx.beginPath();
        let prevX = targetX;
        let prevY = 0;
        ctx.moveTo(prevX, prevY);
        const steps = 10;
        for (let s = 1; s <= steps; s++) {
          const frac = Math.min(strikeT, s / steps);
          const curY = beamH * frac;
          const jitter = s === steps ? 0 : Math.sin(s * 3.7 + timeSec * 28) * 18 * (1 - s / steps);
          const curX = targetX + jitter;
          ctx.lineTo(curX, curY);
          if (frac >= strikeT) break;
        }
        ctx.stroke();
        ctx.restore();

        // Ondas de choque douradas + faíscas angulares
        if (progress > 0.25) {
          for (let ring = 0; ring < 2; ring++) {
            const rt = Math.max(0, Math.min(1, (burstT - ring * 0.14) / 0.86));
            ctx.save();
            ctx.globalAlpha = (1 - rt) * masterAlpha;
            ctx.strokeStyle = ring === 0 ? '#fef08a' : '#f59e0b';
            ctx.lineWidth = 4 * (1 - rt);
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 22;
            ctx.beginPath();
            ctx.arc(targetX, targetY, 24 + rt * 155, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
          for (let s = 0; s < 14; s++) {
            const sa = (s * Math.PI * 2) / 14 + timeSec * 2.2;
            const sd = 24 + burstT * 135;
            drawFourPointStar(
              targetX + Math.cos(sa) * sd,
              targetY + Math.sin(sa) * sd,
              11 * (1 - burstT * 0.65),
              s % 2 === 0 ? '#ffffff' : '#fbbf24',
              sa
            );
          }
        }
        drawFloatingBadge(targetX, targetY - cardH * 0.64, '✨⚡ CENTELHA DIVINA!', '#fbbf24', '#fef3c7', masterAlpha);
      } else if (vfx.skillType === 'token_filho_da_luz') {
        // Tier 5 Elevado: Asas Douradas de Arcanjo + Coluna de Luz Restauradora + Mandala Celestial
        drawCardHighlight(targetX, targetY, '#fef08a', masterAlpha);
        const wingOpen = Math.max(0, Math.min(1, progress / 0.45));
        const wingEase = Math.max(0, 1 - Math.pow(1 - wingOpen, 3));

        // Coluna de luz ascendente (isolada em ctx.save/restore e com opacidade suave)
        ctx.save();
        const colHalfW = Math.max(48, cardW * 0.72);
        const colGrad = ctx.createLinearGradient(targetX - colHalfW, 0, targetX + colHalfW, 0);
        colGrad.addColorStop(0, 'transparent');
        colGrad.addColorStop(0.5, `rgba(254, 240, 138, ${0.30 * masterAlpha})`);
        colGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = colGrad;
        ctx.fillRect(targetX - colHalfW, 0, colHalfW * 2, height);
        ctx.restore();

        // Asas Celestiais Douradas no Canvas ao redor da carta
        if (wingEase > 0.02) {
          ctx.save();
          ctx.translate(targetX, targetY);
          ctx.globalAlpha = 0.92 * masterAlpha;
          ctx.shadowColor = '#fde047';
          ctx.shadowBlur = 24;
          for (const dir of [-1, 1]) {
            ctx.save();
            ctx.scale(dir * (0.4 + wingEase * 0.72), 0.75 + wingEase * 0.35);
            for (let f = 0; f < 4; f++) {
              const featherLen = Math.max(2, (115 - f * 18) * wingEase);
              const featherAngle = -0.58 + f * 0.28 + Math.sin(timeSec * 4 + f) * 0.04;
              ctx.save();
              ctx.translate(cardW * 0.35, -18 + f * 18);
              ctx.rotate(featherAngle);
              const fGrad = ctx.createLinearGradient(0, 0, featherLen, 0);
              fGrad.addColorStop(0, '#ffffff');
              fGrad.addColorStop(0.55, '#fef08a');
              fGrad.addColorStop(1, '#f59e0b');
              ctx.fillStyle = fGrad;
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.quadraticCurveTo(featherLen * 0.55, -18, featherLen, -6);
              ctx.quadraticCurveTo(featherLen * 0.55, 14, 0, 8);
              ctx.closePath();
              ctx.fill();
              ctx.restore();
            }
            ctx.restore();
          }
          ctx.restore();

          // Halo rotativo acima
          ctx.save();
          ctx.globalAlpha = masterAlpha;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#fde047';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.ellipse(
            targetX,
            targetY - cardH * 0.56,
            Math.max(1, 44 * wingEase),
            Math.max(1, 10 * wingEase),
            0,
            0,
            Math.PI * 2
          );
          ctx.stroke();
          ctx.restore();
        }

        for (let i = 0; i < 16; i++) {
          const rise = (progress * 1.4 + i / 16) % 1;
          const px = targetX + Math.sin(timeSec * 3 + i) * (cardW * 0.55);
          const py = targetY + cardH * 0.5 - rise * (cardH * 1.15);
          drawFourPointStar(px, py, 9 * (1 - rise * 0.5), i % 3 === 0 ? '#6ee7b7' : '#fef08a', timeSec * 4 + i);
        }

        drawFloatingBadge(targetX, targetY - cardH * 0.72, '🪽✨ FILHO DA LUZ · 100% RESTAURADO!', '#fde047', '#fef9c3', masterAlpha);
      } else if (vfx.skillType === 'n_apoteose') {
        // Ascensão à Classe Divino: Espiral dourado-celestial e coroa de luz descendo
        drawCardHighlight(targetX, targetY, '#fde047', masterAlpha);
        const ringT = Math.min(1, progress / 0.75);
        for (let h = 0; h < 2; h++) {
          const ang = timeSec * (h === 0 ? 2.6 : -3.4);
          ctx.save();
          ctx.translate(targetX, targetY);
          ctx.rotate(ang);
          ctx.globalAlpha = 0.85 * masterAlpha;
          ctx.strokeStyle = h === 0 ? '#fef08a' : '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.arc(0, 0, cardW * (0.68 + h * 0.18), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        // Raios radiantes subindo ao redor da carta
        for (let i = 0; i < 12; i++) {
          const a = timeSec * 3 + (i * Math.PI * 2) / 12;
          const r = cardW * 0.55 + Math.sin(progress * Math.PI) * 28;
          drawFourPointStar(targetX + Math.cos(a) * r, targetY + Math.sin(a) * (r * 1.15), 11, i % 2 === 0 ? '#ffffff' : '#fde047', timeSec * 5);
        }
        // Coroa de luz descendo
        ctx.save();
        ctx.globalAlpha = masterAlpha;
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 22;
        const haloY = targetY - cardH * 0.85 + ringT * (cardH * 0.34);
        ctx.beginPath();
        ctx.ellipse(targetX, haloY, 38, 10, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        drawFloatingBadge(targetX, targetY - cardH * 0.64, '☀️🪽 APOTEOSE · CLASSE DIVINO!', '#fbbf24', '#fef3c7', masterAlpha);
      } else if (vfx.skillType === 'n_encantar') {
        // Infusão Arcana de Classe Mágico: Círculo rúnico violeta duplo + cristais mágicos convergindo
        drawCardHighlight(targetX, targetY, '#c084fc', masterAlpha);
        ctx.save();
        ctx.translate(targetX, targetY);
        ctx.rotate(timeSec * 2.2);
        ctx.globalAlpha = 0.85 * masterAlpha;
        ctx.strokeStyle = '#d8b4fe';
        ctx.lineWidth = 2.4;
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 22;
        const rHex = cardW * 0.72;
        ctx.beginPath();
        ctx.arc(0, 0, rHex, 0, Math.PI * 2);
        ctx.stroke();
        for (let tri = 0; tri < 2; tri++) {
          ctx.beginPath();
          for (let v = 0; v < 3; v++) {
            const va = tri * (Math.PI / 3) + (v * Math.PI * 2) / 3;
            const vx = Math.cos(va) * rHex;
            const vy = Math.sin(va) * rHex;
            if (v === 0) ctx.moveTo(vx, vy);
            else ctx.lineTo(vx, vy);
          }
          ctx.closePath();
          ctx.stroke();
        }
        ctx.restore();
        for (let s = 0; s < 10; s++) {
          const sa = -timeSec * 3.8 + (s * Math.PI * 2) / 10;
          const dist = cardW * 0.85 * (1 - progress * 0.45);
          drawFourPointStar(targetX + Math.cos(sa) * dist, targetY + Math.sin(sa) * dist, 10, s % 2 === 0 ? '#e9d5ff' : '#a855f7', sa);
        }
        drawFloatingBadge(targetX, targetY - cardH * 0.64, '🔮 CLASSE MÁGICO CONCEDIDA!', '#c084fc', '#f3e8ff', masterAlpha);
      } else if (vfx.skillType === 'g_oceanico') {
        // Batismo das Marés Profundas: Ondas espirais azul-turquesa e gotas oceânicas envolvendo a carta
        drawCardHighlight(targetX, targetY, '#38bdf8', masterAlpha);
        for (let w = 0; w < 3; w++) {
          const waveT = (progress + w * 0.25) % 1;
          ctx.save();
          ctx.globalAlpha = (1 - waveT) * 0.85 * masterAlpha;
          ctx.strokeStyle = w % 2 === 0 ? '#7dd3fc' : '#0284c7';
          ctx.lineWidth = 4 - w;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.ellipse(targetX, targetY, 34 + waveT * 115, (34 + waveT * 115) * 0.68, Math.sin(timeSec * 2 + w) * 0.25, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        for (let d = 0; d < 14; d++) {
          const da = timeSec * 4.2 + (d * Math.PI * 2) / 14;
          const dr = cardW * 0.56 + Math.sin(timeSec * 6 + d) * 18;
          ctx.save();
          ctx.globalAlpha = 0.9 * masterAlpha;
          ctx.fillStyle = d % 2 === 0 ? '#bae6fd' : '#38bdf8';
          ctx.shadowColor = '#0ea5e9';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(targetX + Math.cos(da) * dr, targetY + Math.sin(da) * (dr * 0.85), 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        drawFloatingBadge(targetX, targetY - cardH * 0.64, '💧🌊 CLASSE ÁGUA CONCEDIDA!', '#38bdf8', '#e0f2fe', masterAlpha);
      } else if (vfx.skillType === 'g_toque_igneo') {
        // Forja Solar das Chamas Vivas: Vórtice de brasas e selo incandescente de Fogo
        drawCardHighlight(targetX, targetY, '#fb923c', masterAlpha);
        const fireGrad = ctx.createRadialGradient(targetX, targetY, 10, targetX, targetY, cardW * 1.1);
        fireGrad.addColorStop(0, `rgba(253, 186, 116, ${0.48 * masterAlpha})`);
        fireGrad.addColorStop(0.55, `rgba(234, 88, 12, ${0.35 * masterAlpha})`);
        fireGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = fireGrad;
        ctx.beginPath();
        ctx.arc(targetX, targetY, cardW * 1.1, 0, Math.PI * 2);
        ctx.fill();

        for (let f = 0; f < 16; f++) {
          const rise = ((progress * 1.6 + f / 16) % 1);
          const angle = f * 0.8 + timeSec * 5;
          const fx = targetX + Math.cos(angle) * (cardW * 0.48 * (1 - rise * 0.3));
          const fy = targetY + cardH * 0.45 - rise * (cardH * 1.1);
          ctx.save();
          ctx.globalAlpha = (1 - rise) * masterAlpha;
          ctx.fillStyle = f % 2 === 0 ? '#fed7aa' : '#f97316';
          ctx.shadowColor = '#ea580c';
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.arc(fx, fy, 6 * (1 - rise * 0.5), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        drawFloatingBadge(targetX, targetY - cardH * 0.64, '🔥 CLASSE FOGO CONCEDIDA!', '#f97316', '#ffedd5', masterAlpha);
      } else if (vfx.skillType === 'n_forca_natureza') {
        // Raízes Ancestrais da Terra: Anéis telúricos esmeralda e espiral de folhas vivas
        drawCardHighlight(targetX, targetY, '#34d399', masterAlpha);
        ctx.save();
        ctx.translate(targetX, targetY);
        ctx.rotate(timeSec * 1.8);
        ctx.globalAlpha = 0.85 * masterAlpha;
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, 0, cardW * 0.68, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        for (let l = 0; l < 12; l++) {
          const la = timeSec * 3.2 + (l * Math.PI * 2) / 12;
          const lr = cardW * 0.52 + Math.sin(timeSec * 4 + l) * 16;
          const lx = targetX + Math.cos(la) * lr;
          const ly = targetY + Math.sin(la) * (lr * 0.9);
          ctx.save();
          ctx.translate(lx, ly);
          ctx.rotate(la + Math.PI / 2);
          ctx.globalAlpha = 0.92 * masterAlpha;
          ctx.fillStyle = l % 2 === 0 ? '#6ee7b7' : '#a3e635';
          ctx.beginPath();
          ctx.ellipse(0, 0, 9, 4.2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        drawFloatingBadge(targetX, targetY - cardH * 0.64, '🌿🪨 CLASSE TELÚRICO CONCEDIDA!', '#10b981', '#d1fae5', masterAlpha);
      } else if (vfx.skillType === 'm_estatico') {
        // Jaula de Alta Voltagem: Raios ziguezague cruzando e envolvendo a carta
        drawCardHighlight(targetX, targetY, '#facc15', masterAlpha);
        for (let b = 0; b < 6; b++) {
          const ba = timeSec * 6 + (b * Math.PI) / 3;
          const r1 = cardW * 0.42;
          const r2 = cardW * 0.88;
          ctx.save();
          ctx.globalAlpha = (0.75 + Math.sin(timeSec * 30 + b) * 0.25) * masterAlpha;
          ctx.strokeStyle = b % 2 === 0 ? '#fef08a' : '#22d3ee';
          ctx.lineWidth = 2.6;
          ctx.shadowColor = '#eab308';
          ctx.shadowBlur = 18;
          ctx.beginPath();
          const sx = targetX + Math.cos(ba) * r1;
          const sy = targetY + Math.sin(ba) * r1;
          const mx = targetX + Math.cos(ba + 0.25) * ((r1 + r2) * 0.52) + Math.sin(timeSec * 45 + b) * 10;
          const my = targetY + Math.sin(ba + 0.25) * ((r1 + r2) * 0.52) + Math.cos(timeSec * 42 + b) * 10;
          const ex = targetX + Math.cos(ba) * r2;
          const ey = targetY + Math.sin(ba) * r2;
          ctx.moveTo(sx, sy);
          ctx.lineTo(mx, my);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          ctx.restore();
        }
        drawFloatingBadge(targetX, targetY - cardH * 0.64, '⚡ CLASSE ELÉTRICO CONCEDIDA!', '#facc15', '#fef9c3', masterAlpha);
      } else if (vfx.skillType === 'm_nevasca') {
        // Vórtice Glacial Eterno: Cristal hexagonal de gelo girando e ventania congelante
        drawCardHighlight(targetX, targetY, '#67e8f9', masterAlpha);
        ctx.save();
        ctx.translate(targetX, targetY);
        ctx.rotate(timeSec * 1.9);
        ctx.globalAlpha = 0.88 * masterAlpha;
        ctx.strokeStyle = '#cffafe';
        ctx.lineWidth = 2.6;
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 22;
        const armLen = cardW * 0.68 * Math.min(1, progress / 0.35);
        for (let arm = 0; arm < 6; arm++) {
          const aa = (arm * Math.PI) / 3;
          const ax = Math.cos(aa) * armLen;
          const ay = Math.sin(aa) * armLen;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(ax, ay);
          ctx.stroke();
          // Ramos do floco
          const bx = Math.cos(aa) * (armLen * 0.62);
          const by = Math.sin(aa) * (armLen * 0.62);
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(aa + 0.65) * 16, by + Math.sin(aa + 0.65) * 16);
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(aa - 0.65) * 16, by + Math.sin(aa - 0.65) * 16);
          ctx.stroke();
        }
        ctx.restore();
        for (let c = 0; c < 14; c++) {
          const ca = -timeSec * 4.5 + (c * Math.PI * 2) / 14;
          const cr = cardW * 0.62 + Math.sin(timeSec * 5 + c) * 18;
          drawFourPointStar(targetX + Math.cos(ca) * cr, targetY + Math.sin(ca) * cr, 8, c % 2 === 0 ? '#ffffff' : '#67e8f9', timeSec * 4);
        }
        drawFloatingBadge(targetX, targetY - cardH * 0.64, '❄️ CLASSE GELO CONCEDIDA!', '#67e8f9', '#ecfeff', masterAlpha);
      }

      } catch (err) {
        console.error('Erro na animação de habilidade:', err);
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        finish();
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      completed = true;
      window.clearTimeout(safetyTimer);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [vfx?.id]);

  if (!vfx) return null;

  const meta = SKILL_META[vfx.skillType];

  const renderIcon = () => {
    switch (vfx.skillType) {
      case 'g_enganar':
        return <EyeOff size={20} className="text-purple-200" />;
      case 'm_moral':
        return <Crown size={20} className="text-amber-200" />;
      case 'n_labareda_solar':
        return <Flame size={20} className="text-orange-200" />;
      case 'g_desafio_real':
        return <Swords size={20} className="text-amber-200" />;
      case 'm_voto_caidos':
        return <Ghost size={20} className="text-slate-100" />;
      case 'n_destreza':
        return <Wind size={20} className="text-emerald-200" />;
      case 'n_voto_estrelas':
        return <Shield size={20} className="text-cyan-200" />;
      case 'g_voto_silencio':
        return <VolumeX size={20} className="text-fuchsia-200" />;
      case 'g_sabedoria_cosmica':
        return <Sparkles size={20} className="text-indigo-200" />;
      case 'm_chamado_vitoria':
        return <Crown size={20} className="text-amber-200" />;
      case 'm_fome_insaciavel':
        return <Droplets size={20} className="text-rose-300" />;
      case 'm_grao_mestre':
        return <Swords size={20} className="text-amber-200" />;
      case 'n_jurisdicao_de_saniel':
        return <Zap size={20} className="text-yellow-200" />;
      case 'm_letargia_lunar':
        return <Moon size={20} className="text-indigo-200" />;
      case 'g_soberania':
        return <Crown size={20} className="text-amber-200" />;
      case 'g_concessao_divina':
        return <Feather size={20} className="text-amber-100" />;
      case 'n_escolhido_estrelas':
        return <Star size={20} className="text-cyan-200" />;
      case 'n_voto_do_absoluto':
        return <Orbit size={20} className="text-purple-200" />;
      case 'n_veto_do_indomito':
        return <Gavel size={20} className="text-amber-200" />;
      case 'token_flecha_eletrica':
        return <Zap size={20} className="text-cyan-200" />;
      case 'token_fagulha_estelar':
        return <Sparkles size={20} className="text-sky-200" />;
      case 'g_rochedo':
        return <Mountain size={20} className="text-emerald-200" />;
      case 'cond_etereo':
        return <Sparkles size={20} className="text-cyan-200" />;
      case 'm_destino_fatal':
        return <Swords size={20} className="text-red-300" />;
      case 'token_centelha':
        return <Zap size={20} className="text-amber-200" />;
      case 'token_filho_da_luz':
        return <Feather size={20} className="text-yellow-100" />;
      case 'n_encantar':
        return <Sparkles size={20} className="text-purple-200" />;
      case 'g_oceanico':
        return <Droplets size={20} className="text-sky-200" />;
      case 'n_apoteose':
        return <Sun size={20} className="text-amber-200" />;
      case 'g_toque_igneo':
        return <Flame size={20} className="text-orange-200" />;
      case 'n_forca_natureza':
        return <Mountain size={20} className="text-emerald-200" />;
      case 'm_estatico':
        return <Zap size={20} className="text-yellow-200" />;
      case 'm_nevasca':
        return <Snowflake size={20} className="text-cyan-200" />;
    }
  };

  if (!vfx || isOff) return null;

  return (
    <div
      className="fixed inset-0 z-[95] pointer-events-none overflow-hidden select-none"
      style={{ zIndex: 95 }}
    >
      {/* Vinheta Temática da Habilidade (suavizada no modo estático) */}
      {!isStatic && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: meta.vignette,
          }}
        />
      )}

      {/* Canvas 60fps de Alta Precisão apenas no modo completo */}
      {!isStatic && <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />}

      {/* Banner Superior da Habilidade Ativada (Plaque estática nítida no modo leve) */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none ${
          isStatic ? 'top-[10%]' : 'top-[7%]'
        }`}
      >
        <div
          className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-slate-950/95 border-2 ${meta.borderColor} flex items-center gap-3 ${
            isStatic ? 'shadow-2xl' : 'backdrop-blur-md'
          }`}
          style={{
            boxShadow: isStatic ? `0 8px 26px rgba(0,0,0,0.85)` : `0 0 42px ${meta.glowColor}`,
          }}
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 border border-white/25 flex items-center justify-center shrink-0">
            {renderIcon()}
          </div>
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-base font-serif font-black tracking-[0.14em] text-white uppercase">
                {meta.title}
              </span>
              <span className="text-stone-400">·</span>
              <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${meta.textColor}`}>
                {meta.subtitle}
              </span>
            </div>
            <span className="text-[10px] sm:text-xs font-mono text-stone-200">
              {vfx.targetName ? `Alvo: ${vfx.targetName} · ` : ''}
              {meta.effectBadge}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

