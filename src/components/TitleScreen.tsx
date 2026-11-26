import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Sparkles,
  ShoppingBag,
  Settings,
  BookOpen,
  Swords,
  Eye,
  Crown,
  Shield,
  Flame,
  Droplets,
  Snowflake,
  Zap,
  Mountain,
  Orbit,
  Wand2,
  Moon,
  Sun,
  Compass,
  Library,
  Maximize2,
  Minimize2,
  Lock,
  Trophy,
  Gem,
} from 'lucide-react';
import { sound } from '../services/soundEffects';
import { getRankInfo, loadRankPoints } from '../utils/rankSystem';
import { getPlayerProfile } from '../utils/matchHistory';
import { useCloudPlayerState } from '../services/accountApi';
import { useRankPolicy } from '../services/rankPolicyService';
import { AvatarPortrait } from './AvatarPortrait';
import { DEFAULT_AVATAR_ID } from '../data/avatars';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { isAdminUser } from '../services/patchNotesService';
import { PlayerProfileModal } from './PlayerProfileModal';
import { AdminPanelModal } from './AdminPanelModal';
import { CardGalleryModal } from './CardGalleryModal';
import { SettingsModal } from './SettingsModal';
import { ShopModal } from './ShopModal';
import { CardModal } from './CardModal';
import { CosmicSkyEffects } from './CosmicSkyEffects';
import { useVisualPreferences } from '../utils/visualTheme';
import { CARD_TEMPLATES } from '../data/cards';
import { createCardInstance } from '../logic/deckFactory';
import { CardInstance, ElementType } from '../types/game';
import { getCardArtCandidates, advanceCardArtFallback, TIER_CONFIG, KINGDOM_THEMES } from '../utils/cardVisuals';

interface TitleScreenProps {
  onOpenGameModes: () => void;
  onOpenDeckSelector: () => void;
  activeDeckName: string;
  onOpenRules: () => void;
}

interface ElementalPillarInfo {
  id: ElementType;
  label: string;
  shortLabel: string;
  runes: string;
  side: 'left' | 'right';
  heightClass: string;
  orbColor: string;
  beamColor: string;
  borderGlow: string;
  accentHex: string;
  lore: string;
}

const ELEMENTAL_PILLARS: ElementalPillarInfo[] = [
  // Left Wing (5 classes, outer tallest tapering inward)
  {
    id: 'Fogo',
    label: 'Chama Solar',
    shortLabel: 'Fogo',
    runes: 'ᚠ ᚢ ᚦ',
    side: 'left',
    heightClass: 'h-64 xl:h-72',
    orbColor: 'from-amber-200 via-orange-500 to-red-700',
    beamColor: 'from-orange-500/30 via-amber-500/10 to-transparent',
    borderGlow: 'border-orange-500/50 shadow-[0_0_22px_rgba(249,115,22,0.35)]',
    accentHex: '#f97316',
    lore: 'Ofensiva Total · Ataque + 100% Poder',
  },
  {
    id: 'Água',
    label: 'Maré Abissal',
    shortLabel: 'Água',
    runes: 'ᛚ ᚨ ᚹ',
    side: 'left',
    heightClass: 'h-56 xl:h-64',
    orbColor: 'from-sky-100 via-blue-500 to-indigo-900',
    beamColor: 'from-blue-500/25 via-sky-400/10 to-transparent',
    borderGlow: 'border-blue-400/50 shadow-[0_0_22px_rgba(59,130,246,0.35)]',
    accentHex: '#3b82f6',
    lore: 'Fluxo Restaurador · Cura & Controle de Maré',
  },
  {
    id: 'Telúrico',
    label: 'Raiz Telúrica',
    shortLabel: 'Telúrico',
    runes: 'ᛒ ᛖ ᛗ',
    side: 'left',
    heightClass: 'h-48 xl:h-56',
    orbColor: 'from-emerald-200 via-emerald-500 to-teal-900',
    beamColor: 'from-emerald-500/25 via-emerald-500/10 to-transparent',
    borderGlow: 'border-emerald-500/50 shadow-[0_0_22px_rgba(16,185,129,0.35)]',
    accentHex: '#10b981',
    lore: 'Vitalidade Ancestral · +100% Poder na Vida',
  },
  {
    id: 'Elétrico',
    label: 'Fúria Astral',
    shortLabel: 'Elétrico',
    runes: 'ᛋ ᛏ ᛉ',
    side: 'left',
    heightClass: 'h-40 xl:h-48',
    orbColor: 'from-yellow-100 via-amber-400 to-yellow-700',
    beamColor: 'from-yellow-400/25 via-amber-300/10 to-transparent',
    borderGlow: 'border-yellow-400/50 shadow-[0_0_22px_rgba(250,204,21,0.35)]',
    accentHex: '#facc15',
    lore: 'Impacto Relâmpago · 1º Ataque Atordoa',
  },
  {
    id: 'Neutro',
    label: 'Ordem Neutra',
    shortLabel: 'Neutro',
    runes: 'ᚾ ᛟ ᚺ',
    side: 'left',
    heightClass: 'h-34 xl:h-40',
    orbColor: 'from-stone-200 via-stone-400 to-stone-800',
    beamColor: 'from-stone-400/25 via-stone-500/10 to-transparent',
    borderGlow: 'border-stone-400/50 shadow-[0_0_20px_rgba(168,162,158,0.3)]',
    accentHex: '#a8a29e',
    lore: 'Equilíbrio Tático · Versatilidade Pura',
  },

  // Right Wing (5 classes, mirrored: inner shortest rising outward)
  {
    id: 'Divino',
    label: 'Alvorada Divina',
    shortLabel: 'Divino',
    runes: 'ᛊ ᛞ ᛟ',
    side: 'right',
    heightClass: 'h-34 xl:h-40',
    orbColor: 'from-yellow-100 via-amber-300 to-amber-700',
    beamColor: 'from-amber-300/30 via-yellow-300/10 to-transparent',
    borderGlow: 'border-amber-300/60 shadow-[0_0_24px_rgba(251,191,36,0.45)]',
    accentHex: '#fbbf24',
    lore: 'Luz Angiris · Purificação & Bênçãos Celestes',
  },
  {
    id: 'Sombrio',
    label: 'Véu Sombrio',
    shortLabel: 'Sombrio',
    runes: 'ᚦ ᛇ ᛈ',
    side: 'right',
    heightClass: 'h-40 xl:h-48',
    orbColor: 'from-rose-200 via-fuchsia-700 to-stone-950',
    beamColor: 'from-fuchsia-600/25 via-rose-700/10 to-transparent',
    borderGlow: 'border-fuchsia-500/55 shadow-[0_0_22px_rgba(192,38,211,0.38)]',
    accentHex: '#c026d3',
    lore: 'Corte Obscura · Praga, Corrosão & Sangramento',
  },
  {
    id: 'Mágico',
    label: 'Nexo Arcano',
    shortLabel: 'Mágico',
    runes: 'ᚨ ᚫ ᛜ',
    side: 'right',
    heightClass: 'h-48 xl:h-56',
    orbColor: 'from-fuchsia-200 via-purple-500 to-violet-950',
    beamColor: 'from-purple-500/25 via-fuchsia-500/10 to-transparent',
    borderGlow: 'border-purple-400/50 shadow-[0_0_22px_rgba(168,85,247,0.35)]',
    accentHex: '#a855f7',
    lore: 'Maestria Etérea · Dano Puro = 100% Poder',
  },
  {
    id: 'Cósmico',
    label: 'Éter Estelar',
    shortLabel: 'Cósmico',
    runes: 'ᛞ ᛟ ᛇ',
    side: 'right',
    heightClass: 'h-56 xl:h-64',
    orbColor: 'from-indigo-100 via-indigo-400 to-blue-950',
    beamColor: 'from-indigo-400/30 via-sky-500/10 to-transparent',
    borderGlow: 'border-indigo-400/50 shadow-[0_0_22px_rgba(99,102,241,0.4)]',
    accentHex: '#818cf8',
    lore: 'Sapiência Suprema · Imune a Corrupções',
  },
  {
    id: 'Gelo',
    label: 'Geada Eterna',
    shortLabel: 'Gelo',
    runes: 'ᛁ ᛃ ᚹ',
    side: 'right',
    heightClass: 'h-64 xl:h-72',
    orbColor: 'from-cyan-100 via-sky-400 to-cyan-900',
    beamColor: 'from-cyan-400/30 via-sky-400/10 to-transparent',
    borderGlow: 'border-cyan-400/50 shadow-[0_0_22px_rgba(34,211,238,0.4)]',
    accentHex: '#22d3ee',
    lore: 'Domínio Glacial · Defesa Extra & Congelar',
  },
];

interface ShowcaseSetConfig {
  left: [string, string];
  right: [string, string];
  fullscreenLeft: string;
  fullscreenRight: string;
}

const DEFAULT_SHOWCASE_SETS: ShowcaseSetConfig[] = [
  {
    left: ['n_o_sol', 'n_wyr'],
    right: ['m_juci', 'g_a_lua'],
    fullscreenLeft: 'g_zyk',
    fullscreenRight: 'm_atormentador',
  },
  {
    left: ['n_saniel', 'g_barao_well'],
    right: ['m_licia', 'm_bonetrus'],
    fullscreenLeft: 'n_zael',
    fullscreenRight: 'm_rei_mauricio',
  },
  {
    left: ['n_helio', 'g_craff'],
    right: ['m_titano', 'g_lunario'],
    fullscreenLeft: 'g_bor',
    fullscreenRight: 'n_gohr',
  },
  {
    left: ['g_kaliel', 'g_targor'],
    right: ['m_fanx', 'n_barelio'],
    fullscreenLeft: 'm_krust',
    fullscreenRight: 'm_faleziel',
  },
];

const SHOWCASE_CAROUSEL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes automatic rotation

interface FloatingHolographicCardProps {
  card: CardInstance;
  slotIndex: number;
  totalInWing?: number;
  side: 'left' | 'right';
  foilEnabled: boolean;
  isFullscreenExtra?: boolean;
  onInspect: (card: CardInstance) => void;
}

const FloatingHolographicCard: React.FC<FloatingHolographicCardProps> = ({
  card,
  slotIndex,
  totalInWing = 2,
  side,
  foilEnabled,
  isFullscreenExtra = false,
  onInspect,
}) => {
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50, isHovered: false });
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [card.templateId, card.level]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pctX = (x / rect.width) * 100;
    const pctY = (y / rect.height) * 100;
    const rotateY = ((pctX - 50) / 50) * 16;
    const rotateX = -((pctY - 50) / 50) * 16;
    setTilt({ rotateX, rotateY, glareX: pctX, glareY: pctY, isHovered: true });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50, isHovered: false });
  };

  const tierCfg = TIER_CONFIG[card.tier] || TIER_CONFIG[5];
  const kingdomCfg = KINGDOM_THEMES[card.kingdom] || KINGDOM_THEMES.granty;
  const isSupreme = card.tier === 6;
  const artCandidates = getCardArtCandidates(card.templateId, {
    isLvl2: card.level === 2,
    isRevealedFaleziel: card.isRevealedFaleziel,
    isPack: card.templateId === 'pack_atormentador' || card.isPack,
    name: card.name,
  });
  const artUrl = artCandidates[0];

  const baseAngles =
    totalInWing >= 3
      ? side === 'left'
        ? slotIndex === 0
          ? '-rotate-9 -translate-y-6'
          : slotIndex === 1
          ? '-rotate-4 -translate-y-1'
          : '-rotate-1 translate-y-4'
        : slotIndex === 0
        ? 'rotate-1 translate-y-4'
        : slotIndex === 1
        ? 'rotate-4 -translate-y-1'
        : 'rotate-9 -translate-y-6'
      : side === 'left'
      ? slotIndex === 0
        ? '-rotate-6 -translate-y-3'
        : '-rotate-2 translate-y-4'
      : slotIndex === 0
      ? 'rotate-2 translate-y-4'
      : 'rotate-6 -translate-y-3';

  const cardSizeClass =
    totalInWing >= 3
      ? 'w-28 h-40 lg:w-32 lg:h-46 xl:w-36 xl:h-52 2xl:w-40 2xl:h-56'
      : 'w-32 h-46 sm:w-36 sm:h-52 xl:w-42 xl:h-60';

  return (
    <div
      className={`relative group select-none transition-all duration-300 ${
        isFullscreenExtra ? 'animate-fullscreen-card-unfurl' : ''
      }`}
      style={{ perspective: '1100px' }}
    >
      <div
        className={side === 'left' ? 'animate-levitate-left' : 'animate-levitate-right'}
        style={{ animationDelay: `${slotIndex * 0.75}s` }}
      >
      <div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={() => {
          sound.playSummon();
          onInspect(card);
        }}
        className={`relative ${cardSizeClass} rounded-2xl cursor-pointer transition-transform duration-150 ease-out ${
          !tilt.isHovered ? baseAngles : 'z-30 scale-110'
        }`}
        style={{
          transformStyle: 'preserve-3d',
          transform: tilt.isHovered
            ? `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(1.1)`
            : undefined,
        }}
        title={`Clique para inspecionar ${card.name} em detalhes`}
      >
        <div
          className={`absolute -inset-2.5 rounded-3xl blur-xl transition-opacity duration-300 pointer-events-none ${
            isSupreme
              ? 'bg-gradient-to-tr from-rose-500/50 via-amber-400/50 to-cyan-400/50'
              : 'bg-gradient-to-tr from-amber-500/40 via-purple-500/35 to-cyan-400/40'
          } ${tilt.isHovered ? 'opacity-100' : 'opacity-55'}`}
        />

        <div
          className={`relative w-full h-full rounded-2xl p-[2.5px] overflow-hidden shadow-[0_18px_40px_rgba(0,0,0,0.92)] ${
            isSupreme
              ? 'bg-gradient-to-br from-rose-400 via-amber-300 via-emerald-300 to-cyan-400'
              : 'bg-gradient-to-br from-amber-200 via-amber-500 to-yellow-900'
          }`}
        >
          <div className="relative w-full h-full rounded-[14px] bg-stone-950 overflow-hidden flex flex-col justify-between">
            {!imgError && artUrl ? (
              <img
                key={artUrl}
                src={artUrl}
                alt={card.name}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  if (!advanceCardArtFallback(e.currentTarget, artCandidates)) {
                    setImgError(true);
                  }
                }}
                className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-108"
              />
            ) : (
              <div
                className={`absolute inset-0 bg-gradient-to-b ${kingdomCfg.bgGradient} flex flex-col items-center justify-center p-3 text-center`}
              >
                <Crown size={28} className="text-amber-300 mb-1 opacity-80" />
                <span className="font-serif font-bold text-xs text-amber-100">{card.name}</span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/60 pointer-events-none" />

            {foilEnabled && (
              <>
                <div
                  className={`absolute inset-0 pointer-events-none ${
                    isSupreme ? 'tcg-prismatic-overlay' : 'tcg-foil-overlay'
                  } opacity-75`}
                />
                {tilt.isHovered && (
                  <div
                    className="absolute inset-0 pointer-events-none transition-opacity duration-150"
                    style={{
                      background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.45) 0%, rgba(251,191,36,0.22) 28%, rgba(56,189,248,0.18) 52%, transparent 75%)`,
                      mixBlendMode: 'screen',
                    }}
                  />
                )}
              </>
            )}

            <div className="relative z-10 flex items-center justify-between px-2.5 pt-2">
              <span className="text-[10px] font-serif font-black tracking-wider uppercase text-amber-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                Tier {card.tier}
              </span>
              <span className="text-[10px] font-medium text-stone-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                {card.element}
              </span>
            </div>

            <div className="relative z-10 my-auto flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="px-2.5 py-1 rounded-lg bg-black/80 border border-amber-400/60 text-amber-200 text-[10px] font-serif font-bold tracking-wider flex items-center gap-1 shadow-lg">
                <Eye size={11} className="text-amber-300" />
                <span>Inspecionar</span>
              </div>
            </div>

            <div className="relative z-10 p-2.5 pt-1 flex flex-col gap-1">
              <div className="flex items-center justify-between gap-1 border-b border-amber-400/30 pb-1">
                <span className="font-serif font-black text-xs text-amber-100 truncate drop-shadow">
                  {card.name}
                </span>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: tierCfg.gemColor }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-stone-300 pt-0.5">
                <span title="Vida">❤️ {card.hp}</span>
                <span title="Ataque">⚔️ {card.atk}</span>
                <span title="Defesa">🛡️ {card.def}</span>
                {card.power > 0 && <span title="Poder">✨ {card.power}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onOpenGameModes,
  onOpenDeckSelector,
  activeDeckName,
  onOpenRules,
}) => {
  // Modals state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<'my_profile' | 'leaderboard' | 'search_players'>('my_profile');
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [galleryInitialElement, setGalleryInitialElement] = useState<'all' | ElementType>('all');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);
  const [inspectedCard, setInspectedCard] = useState<CardInstance | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth.currentUser);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setFirebaseUser(u));
  }, []);

  // Sync fullscreen state across standard & WebKit browsers
  useEffect(() => {
    const syncFullscreen = () => {
      const doc = document as Document & {
        fullscreenElement?: Element | null;
        webkitFullscreenElement?: Element | null;
      };
      setIsFullscreen(Boolean(doc.fullscreenElement || doc.webkitFullscreenElement));
    };
    syncFullscreen();
    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('webkitfullscreenchange', syncFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
      document.removeEventListener('webkitfullscreenchange', syncFullscreen);
    };
  }, []);

  const handleToggleFullscreen = async () => {
    sound.playTick();
    try {
      const doc = document as Document & {
        fullscreenElement?: Element | null;
        webkitFullscreenElement?: Element | null;
        exitFullscreen?: () => Promise<void>;
        webkitExitFullscreen?: () => Promise<void>;
      };
      const root = document.documentElement as HTMLElement & {
        requestFullscreen?: () => Promise<void>;
        webkitRequestFullscreen?: () => Promise<void>;
      };
      if (doc.fullscreenElement || doc.webkitFullscreenElement) {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
      } else {
        if (root.requestFullscreen) await root.requestFullscreen();
        else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
      }
    } catch {
      // Ignore fullscreen rejection if browser or iframe sandbox blocks it
    }
  };

  // Hovered Elemental Pillar (for atmospheric aura preview) & Automatic 10-min Showcase Carousel
  const [hoveredPillarId, setHoveredPillarId] = useState<ElementType | null>(null);
  const [showcaseSetIndex, setShowcaseSetIndex] = useState(() =>
    Math.floor(Date.now() / SHOWCASE_CAROUSEL_INTERVAL_MS) % DEFAULT_SHOWCASE_SETS.length
  );

  const { foilEffects, elementalParticles, isCompactLandscape, isTouchDevice } = useVisualPreferences();

  const { rankPolicy } = useRankPolicy();
  const { playerState } = useCloudPlayerState();
  const isAdminAccount = Boolean(playerState?.isAdmin || isAdminUser(firebaseUser));
  const [profile, setProfile] = useState(() => getPlayerProfile());
  const rankPoints = playerState?.rankPoints ?? loadRankPoints();
  const rankInfo = getRankInfo(rankPoints, {
    globalBlockedFromTier: rankPolicy.blockedFromTier,
    playerBlockedTotal: playerState?.rankBlockedTotal,
    playerBlockedFromTier: playerState?.rankBlockFromTier,
    hasPlayedRanked: (playerState?.rankedMatchesPlayed ?? 0) > 0,
  });

  // Automatic 10-minute carousel rotating showcase legends
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setShowcaseSetIndex((prev) => (prev + 1) % DEFAULT_SHOWCASE_SETS.length);
    }, SHOWCASE_CAROUSEL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  // Re-read profile whenever modals close or cloud state updates
  useEffect(() => {
    setProfile(getPlayerProfile());
  }, [isProfileModalOpen, isShopModalOpen, playerState]);

  // Resolve the floating legendary/iconic cards for the sanctuary wings (2 per side normal, 3 per side in fullscreen)
  const { leftWingCards, rightWingCards } = useMemo(() => {
    const activeSet = DEFAULT_SHOWCASE_SETS[showcaseSetIndex % DEFAULT_SHOWCASE_SETS.length];

    const instantiateShowcaseCard = (id: string): CardInstance | null => {
      const tpl = CARD_TEMPLATES.find((t) => t.id === id);
      if (!tpl) return null;
      const inst = createCardInstance(tpl);
      if (id === 'n_saniel' || id === 'm_licia' || id === 'g_barao_well' || id === 'g_kaliel') {
        inst.level = 2;
      }
      return inst;
    };

    const leftIds = isFullscreen ? [activeSet.fullscreenLeft, ...activeSet.left] : [...activeSet.left];
    const rightIds = isFullscreen ? [...activeSet.right, activeSet.fullscreenRight] : [...activeSet.right];

    return {
      leftWingCards: leftIds.map(instantiateShowcaseCard).filter((c): c is CardInstance => c !== null),
      rightWingCards: rightIds.map(instantiateShowcaseCard).filter((c): c is CardInstance => c !== null),
    };
  }, [showcaseSetIndex, isFullscreen]);

  const handleOpenGameMode = () => {
    sound.playSummon();
    onOpenGameModes();
  };

  const handleSelectPillar = (pillar: ElementalPillarInfo) => {
    sound.playDraw();
    setGalleryInitialElement(pillar.id);
    setIsGalleryModalOpen(true);
  };

  const renderElementIcon = (el: ElementType) => {
    switch (el) {
      case 'Fogo':
        return <Flame size={14} className="text-orange-200" />;
      case 'Água':
        return <Droplets size={14} className="text-sky-200" />;
      case 'Terra':
      case 'Telúrico':
        return <Mountain size={14} className="text-emerald-200" />;
      case 'Elétrico':
        return <Zap size={14} className="text-yellow-200" />;
      case 'Neutro':
        return <Compass size={14} className="text-stone-200" />;
      case 'Divino':
        return <Sun size={14} className="text-amber-100" />;
      case 'Sombrio':
        return <Moon size={14} className="text-fuchsia-200" />;
      case 'Mágico':
        return <Wand2 size={14} className="text-purple-200" />;
      case 'Cósmico':
        return <Orbit size={14} className="text-indigo-200" />;
      case 'Gelo':
        return <Snowflake size={14} className="text-cyan-100" />;
      default:
        return <Sparkles size={14} className="text-amber-300" />;
    }
  };

  const hoveredPillarInfo = ELEMENTAL_PILLARS.find((p) => p.id === hoveredPillarId);

  return (
    <div
      className={`relative w-screen h-dvh overflow-hidden bg-[#050814] flex flex-col justify-between safe-area-arena select-none text-stone-200 ${
        isCompactLandscape ? 'px-3 py-2' : 'p-4 sm:p-5 lg:px-6 lg:py-5'
      }`}
    >
      {/* ============================================================== */}
      {/* LAYER 1: COSMIC SANCTUARY SKY, NEBULAE & ROTATING ASTROLABE    */}
      {/* ============================================================== */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#111a3a] via-[#070b19] to-[#03050c]" />

        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[980px] h-[540px] rounded-full blur-[150px] transition-colors duration-700"
          style={{
            background: hoveredPillarInfo
              ? `radial-gradient(circle, ${hoveredPillarInfo.accentHex}33 0%, rgba(124,58,237,0.12) 55%, transparent 75%)`
              : 'radial-gradient(circle, rgba(245,158,11,0.18) 0%, rgba(56,189,248,0.14) 48%, transparent 75%)',
          }}
        />
        <div className="absolute bottom-0 left-1/4 w-[650px] h-[380px] bg-cyan-500/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-0 right-1/4 w-[650px] h-[380px] bg-amber-500/10 rounded-full blur-[130px]" />

        <div className="absolute inset-0 bg-[radial-gradient(#ffffff22_1px,transparent_1px)] [background-size:32px_32px] opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(#fde68a1a_1.5px,transparent_1.5px)] [background-size:72px_72px] opacity-50" />

        {/* Dynamic Shooting Stars & Fading/Reappearing Spiral Galaxies */}
        <CosmicSkyEffects compact={isCompactLandscape} />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] sm:w-[820px] sm:h-[820px] opacity-30">
          <svg viewBox="0 0 600 600" className="w-full h-full animate-spin-cosmic">
            <defs>
              <linearGradient id="astrolabeGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fde68a" stopOpacity="0.7" />
                <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.7" />
              </linearGradient>
            </defs>
            <circle cx="300" cy="300" r="280" fill="none" stroke="url(#astrolabeGold)" strokeWidth="1.2" strokeDasharray="8 6" />
            <circle cx="300" cy="300" r="252" fill="none" stroke="url(#astrolabeGold)" strokeWidth="1.5" />
            <circle cx="300" cy="300" r="210" fill="none" stroke="url(#astrolabeGold)" strokeWidth="0.8" strokeDasharray="3 9" />
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
              <g key={deg} transform={`rotate(${deg} 300 300)`}>
                <line x1="300" y1="20" x2="300" y2="55" stroke="#fde68a" strokeWidth="1.2" opacity="0.6" />
                <circle cx="300" cy="48" r="3" fill="#38bdf8" />
              </g>
            ))}
            <polygon
              points="300,50 516,425 84,425"
              fill="none"
              stroke="url(#astrolabeGold)"
              strokeWidth="1"
              opacity="0.45"
            />
            <polygon
              points="300,550 516,175 84,175"
              fill="none"
              stroke="url(#astrolabeGold)"
              strokeWidth="1"
              opacity="0.45"
            />
          </svg>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] h-[440px] sm:w-[540px] sm:h-[540px] opacity-25">
          <svg viewBox="0 0 400 400" className="w-full h-full animate-spin-cosmic-reverse">
            <circle cx="200" cy="200" r="185" fill="none" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="14 8" />
            <circle cx="200" cy="200" r="165" fill="none" stroke="#f59e0b" strokeWidth="1" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <g key={deg} transform={`rotate(${deg} 200 200)`}>
                <rect x="196" y="11" width="8" height="8" fill="#fde68a" transform="rotate(45 200 15)" />
              </g>
            ))}
          </svg>
        </div>

        <div
          className="absolute bottom-0 inset-x-0 h-44 opacity-25"
          style={{
            backgroundImage:
              'linear-gradient(to top, rgba(245,158,11,0.22) 1px, transparent 1px), linear-gradient(to right, rgba(56,189,248,0.16) 1px, transparent 1px)',
            backgroundSize: '64px 32px',
            maskImage: 'linear-gradient(to top, black 15%, transparent 100%)',
          }}
        />
      </div>

      {/* ============================================================== */}
      {/* LAYER 2: 10 ELEMENTAL CLASS PILLARS (2 SYMMETRIC WINGS OF 5)   */}
      {/* ============================================================== */}
      {!isCompactLandscape && (
        <div className="hidden lg:flex absolute inset-x-3 bottom-24 top-20 pointer-events-none items-end justify-between z-10 px-1 xl:px-4">
          {/* Left Elemental Sanctuary Colonnade (Fogo, Água, Telúrico, Elétrico, Neutro) */}
          <div className="flex items-end gap-1.5 xl:gap-2.5 pointer-events-auto">
            {ELEMENTAL_PILLARS.filter((p) => p.side === 'left').map((pillar) => {
              const isHovered = hoveredPillarId === pillar.id;
              return (
                <button
                  key={pillar.id}
                  onClick={() => handleSelectPillar(pillar)}
                  onMouseEnter={() => setHoveredPillarId(pillar.id)}
                  onMouseLeave={() => setHoveredPillarId((curr) => (curr === pillar.id ? null : curr))}
                  className="group relative flex flex-col items-center transition-all duration-300 cursor-pointer focus:outline-none hover:-translate-y-2.5"
                  title={`${pillar.label} (${pillar.id}) — Clique para abrir a Galeria de Cartas filtrada por ${pillar.id}`}
                >
                  {elementalParticles && (
                    <div
                      className={`absolute -top-20 left-1/2 w-20 h-32 bg-gradient-to-tr ${pillar.beamColor} blur-xl rotate-12 pointer-events-none transition-opacity ${
                        isHovered ? 'opacity-100' : 'opacity-40 group-hover:opacity-90'
                      }`}
                    />
                  )}

                  <div
                    className={`relative w-9 h-9 xl:w-10 xl:h-10 rounded-full bg-gradient-to-br ${pillar.orbColor} border-2 border-white/80 flex items-center justify-center mb-1.5 animate-pillar-orb ${pillar.borderGlow}`}
                  >
                    {renderElementIcon(pillar.id)}
                    <div className="absolute -inset-1 rounded-full border border-white/30 animate-ping opacity-20" />
                  </div>

                  <div
                    className={`relative w-11 xl:w-[54px] ${pillar.heightClass} rounded-t-xl bg-gradient-to-b from-slate-800/95 via-slate-900/95 to-stone-950 border-x-2 border-t-2 transition-colors flex flex-col items-center justify-between py-2.5 px-0.5 shadow-[0_10px_30px_rgba(0,0,0,0.9)] ${
                      isHovered
                        ? 'border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.4)]'
                        : 'border-stone-700/80 group-hover:border-amber-400/70'
                    }`}
                  >
                    <div className="w-full h-1.5 border-y border-amber-400/40 bg-stone-950/80" />

                    <div className="flex flex-col items-center gap-1.5 my-auto">
                      {pillar.runes.split(' ').map((r, i) => (
                        <span
                          key={i}
                          className="text-[11px] font-mono font-bold tracking-widest transition-all"
                          style={{
                            color: isHovered ? '#fde68a' : pillar.accentHex,
                            textShadow: `0 0 10px ${pillar.accentHex}`,
                          }}
                        >
                          {r}
                        </span>
                      ))}
                    </div>

                    <span className="text-[8px] font-serif font-bold tracking-wide uppercase text-stone-300 group-hover:text-amber-200 whitespace-nowrap">
                      {pillar.shortLabel}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Elemental Sanctuary Colonnade (Divino, Sombrio, Mágico, Cósmico, Gelo) */}
          <div className="flex items-end gap-1.5 xl:gap-2.5 pointer-events-auto">
            {ELEMENTAL_PILLARS.filter((p) => p.side === 'right').map((pillar) => {
              const isHovered = hoveredPillarId === pillar.id;
              return (
                <button
                  key={pillar.id}
                  onClick={() => handleSelectPillar(pillar)}
                  onMouseEnter={() => setHoveredPillarId(pillar.id)}
                  onMouseLeave={() => setHoveredPillarId((curr) => (curr === pillar.id ? null : curr))}
                  className="group relative flex flex-col items-center transition-all duration-300 cursor-pointer focus:outline-none hover:-translate-y-2.5"
                  title={`${pillar.label} (${pillar.id}) — Clique para abrir a Galeria de Cartas filtrada por ${pillar.id}`}
                >
                  {elementalParticles && (
                    <div
                      className={`absolute -top-20 right-1/2 w-20 h-32 bg-gradient-to-tl ${pillar.beamColor} blur-xl -rotate-12 pointer-events-none transition-opacity ${
                        isHovered ? 'opacity-100' : 'opacity-40 group-hover:opacity-90'
                      }`}
                    />
                  )}

                  <div
                    className={`relative w-9 h-9 xl:w-10 xl:h-10 rounded-full bg-gradient-to-br ${pillar.orbColor} border-2 border-white/80 flex items-center justify-center mb-1.5 animate-pillar-orb ${pillar.borderGlow}`}
                  >
                    {renderElementIcon(pillar.id)}
                    <div className="absolute -inset-1 rounded-full border border-white/30 animate-ping opacity-20" />
                  </div>

                  <div
                    className={`relative w-11 xl:w-[54px] ${pillar.heightClass} rounded-t-xl bg-gradient-to-b from-slate-800/95 via-slate-900/95 to-stone-950 border-x-2 border-t-2 transition-colors flex flex-col items-center justify-between py-2.5 px-0.5 shadow-[0_10px_30px_rgba(0,0,0,0.9)] ${
                      isHovered
                        ? 'border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.4)]'
                        : 'border-stone-700/80 group-hover:border-amber-400/70'
                    }`}
                  >
                    <div className="w-full h-1.5 border-y border-amber-400/40 bg-stone-950/80" />

                    <div className="flex flex-col items-center gap-1.5 my-auto">
                      {pillar.runes.split(' ').map((r, i) => (
                        <span
                          key={i}
                          className="text-[11px] font-mono font-bold tracking-widest transition-all"
                          style={{
                            color: isHovered ? '#fde68a' : pillar.accentHex,
                            textShadow: `0 0 10px ${pillar.accentHex}`,
                          }}
                        >
                          {r}
                        </span>
                      ))}
                    </div>

                    <span className="text-[8px] font-serif font-bold tracking-wide uppercase text-stone-300 group-hover:text-amber-200 whitespace-nowrap">
                      {pillar.shortLabel}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TOP BAR: RETRACTABLE LOJA (LEFT) | ADMIN, TELA CHEIA & CONFIG (RIGHT) */}
      {/* ============================================================== */}
      <header className="relative z-20 w-full flex items-start justify-between gap-4">
        {/* Top Left: Retractable Loja Medallion (Icon-only at rest, expands rightward on hover/focus) */}
        <button
          type="button"
          onClick={() => {
            sound.playDraw();
            setIsShopModalOpen(true);
          }}
          aria-label="Loja — Cartas à venda, Pacotes, Avatares e Temas"
          title="Abrir Loja de Celentia — Cartas à Venda, Pacotes, Avatares e Temas"
          className="group relative flex items-center justify-start rounded-2xl bg-stone-900/95 hover:bg-stone-800/95 border-2 border-amber-500/50 hover:border-amber-300 shadow-[0_8px_28px_rgba(0,0,0,0.9)] hover:shadow-[0_0_24px_rgba(245,158,11,0.32)] transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 shrink-0"
        >
          <div
            className={`relative flex items-center justify-start overflow-hidden ${
              isCompactLandscape ? 'p-1.5' : 'p-2'
            }`}
          >
            {/* Shop Icon */}
            <div
              className={`relative z-10 rounded-xl bg-gradient-to-br from-amber-950 via-slate-900 to-stone-950 border border-amber-400/60 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)] group-hover:scale-105 transition-transform shrink-0 ${
                isCompactLandscape ? 'w-9 h-9' : 'w-10 h-10 sm:w-11 sm:h-11'
              }`}
            >
              <ShoppingBag size={isCompactLandscape ? 17 : 19} className="text-amber-300" />
              {(playerState?.pendingCommonPacks ?? 0) > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 border border-white text-[10px] font-mono font-black text-stone-950 flex items-center justify-center shadow">
                  {playerState?.pendingCommonPacks}
                </span>
              ) : (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-300 rotate-45 border border-white" />
              )}
            </div>

            {/* Expanding Title & Description (slides open rightward from the icon) */}
            <div className="overflow-hidden max-w-0 opacity-0 pl-0 pr-0 group-hover:max-w-[220px] group-hover:opacity-100 group-hover:pl-3 group-hover:pr-2.5 group-focus-visible:max-w-[220px] group-focus-visible:opacity-100 group-focus-visible:pl-3 group-focus-visible:pr-2.5 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none">
              <div className="flex flex-col items-start text-left whitespace-nowrap">
                <span className="text-xs font-serif font-black tracking-wider text-amber-100 uppercase">
                  Loja
                </span>
                <span className="text-[11px] text-stone-400">
                  Cartas · Pacotes · Avatares
                </span>
              </div>
            </div>
          </div>
        </button>

        {/* Top Right: Retractable Admin (if admin), Tela Cheia & Configurações */}
        <div className="flex items-start justify-end gap-2 sm:gap-2.5 shrink-0">
          {isAdminAccount && (
            <button
              type="button"
              onClick={() => {
                sound.playSpell();
                setIsAdminPanelOpen(true);
              }}
              aria-label="Painel Admin — Gerenciar perfis e filas de modos"
              title="Abrir Painel Administrativo — Gerenciar Perfis e Filas de Jogo"
              className="group relative flex items-center justify-end rounded-2xl p-[2px] bg-gradient-to-br from-amber-400/85 via-rose-500/75 to-amber-300/85 hover:from-amber-300 hover:via-rose-400 hover:to-yellow-200 shadow-[0_8px_28px_rgba(0,0,0,0.9)] hover:shadow-[0_0_26px_rgba(245,158,11,0.42)] transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 shrink-0"
            >
              <div
                className={`relative rounded-[14px] bg-gradient-to-r from-[#1c0c14] via-[#170f18] to-[#1f1309] flex items-center justify-end overflow-hidden ${
                  isCompactLandscape ? 'p-1.5' : 'p-2'
                }`}
              >
                <div className="overflow-hidden max-w-0 opacity-0 pl-0 pr-0 group-hover:max-w-[220px] group-hover:opacity-100 group-hover:pl-2.5 group-hover:pr-3 group-focus-visible:max-w-[220px] group-focus-visible:opacity-100 group-focus-visible:pl-2.5 group-focus-visible:pr-3 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none">
                  <div className="flex flex-col items-end text-right whitespace-nowrap">
                    <span className="text-xs font-serif font-black tracking-wider uppercase text-amber-200">
                      Painel Admin
                    </span>
                    <span className="text-[11px] text-rose-200/85">
                      Perfis · Filas · Controle
                    </span>
                  </div>
                </div>
                <div
                  className={`relative z-10 rounded-xl bg-gradient-to-br from-amber-500/25 via-rose-900/50 to-stone-950 border border-amber-400/70 flex items-center justify-center shadow-[0_0_14px_rgba(245,158,11,0.35)] group-hover:scale-105 transition-transform shrink-0 ${
                    isCompactLandscape ? 'w-9 h-9' : 'w-10 h-10 sm:w-11 sm:h-11'
                  }`}
                >
                  <Crown size={isCompactLandscape ? 17 : 19} className="text-amber-300" />
                </div>
              </div>
            </button>
          )}

          {/* Tela Cheia — Icon-only at rest, expands leftward on hover/focus */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className={`group relative flex items-center justify-end rounded-2xl border-2 shadow-[0_8px_28px_rgba(0,0,0,0.9)] transition-all duration-200 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 ${
              isFullscreen
                ? 'bg-cyan-950/95 hover:bg-cyan-900/95 border-cyan-400/75 hover:border-cyan-300 hover:shadow-[0_0_24px_rgba(34,211,238,0.32)]'
                : 'bg-stone-900/95 hover:bg-stone-800/95 border-stone-700/90 hover:border-amber-400/80 hover:shadow-[0_0_24px_rgba(245,158,11,0.28)]'
            }`}
            title={isFullscreen ? 'Sair do modo Tela Cheia' : 'Ativar modo Tela Cheia'}
            aria-label={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
          >
            <div
              className={`relative flex items-center justify-end overflow-hidden ${
                isCompactLandscape ? 'p-1.5' : 'p-2'
              }`}
            >
              <div className="overflow-hidden max-w-0 opacity-0 pl-0 pr-0 group-hover:max-w-[180px] group-hover:opacity-100 group-hover:pl-2.5 group-hover:pr-3 group-focus-visible:max-w-[180px] group-focus-visible:opacity-100 group-focus-visible:pl-2.5 group-focus-visible:pr-3 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none">
                <div className="flex flex-col items-end text-right whitespace-nowrap">
                  <span className="text-xs font-serif font-black tracking-wider text-amber-100 uppercase">
                    {isFullscreen ? 'Sair' : 'Tela Cheia'}
                  </span>
                  <span className="text-[11px] text-stone-400">
                    {isFullscreen ? 'Tela Cheia' : 'Expandir tela'}
                  </span>
                </div>
              </div>
              <div
                className={`relative z-10 rounded-xl border flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shrink-0 ${
                  isCompactLandscape ? 'w-9 h-9' : 'w-10 h-10 sm:w-11 sm:h-11'
                } ${
                  isFullscreen
                    ? 'bg-gradient-to-br from-cyan-950 via-slate-900 to-stone-950 border-cyan-400/60 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                    : 'bg-gradient-to-br from-sky-950 via-slate-900 to-stone-950 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.22)]'
                }`}
              >
                {isFullscreen ? (
                  <Minimize2 size={isCompactLandscape ? 17 : 19} className="text-cyan-300" />
                ) : (
                  <Maximize2 size={isCompactLandscape ? 17 : 19} className="text-amber-300" />
                )}
              </div>
            </div>
          </button>

          {/* Configurações — Icon-only at rest, expands leftward on hover/focus */}
          <button
            type="button"
            onClick={() => {
              sound.playDraw();
              setIsSettingsModalOpen(true);
            }}
            aria-label="Configurações — Sons, Visual, Mesa e Temas"
            title="Abrir Configurações de Sons, Visual, Mesa e Temas"
            className="group relative flex items-center justify-end rounded-2xl bg-stone-900/95 hover:bg-stone-800/95 border-2 border-stone-700/90 hover:border-amber-400/80 shadow-[0_8px_28px_rgba(0,0,0,0.9)] hover:shadow-[0_0_24px_rgba(192,132,252,0.28)] transition-all duration-200 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80"
          >
            <div
              className={`relative flex items-center justify-end overflow-hidden ${
                isCompactLandscape ? 'p-1.5' : 'p-2'
              }`}
            >
              <div className="overflow-hidden max-w-0 opacity-0 pl-0 pr-0 group-hover:max-w-[210px] group-hover:opacity-100 group-hover:pl-2.5 group-hover:pr-3 group-focus-visible:max-w-[210px] group-focus-visible:opacity-100 group-focus-visible:pl-2.5 group-focus-visible:pr-3 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none">
                <div className="flex flex-col items-end text-right whitespace-nowrap">
                  <span className="text-xs font-serif font-black tracking-wider text-amber-100 uppercase">
                    Configurações
                  </span>
                  <span className="text-[11px] text-stone-400">
                    Sons · Visual · Temas
                  </span>
                </div>
              </div>
              <div
                className={`relative z-10 rounded-xl bg-gradient-to-br from-purple-950 via-slate-900 to-stone-950 border border-purple-400/50 flex items-center justify-center shadow-[0_0_15px_rgba(192,132,252,0.25)] group-hover:rotate-45 transition-transform duration-300 shrink-0 ${
                  isCompactLandscape ? 'w-9 h-9' : 'w-10 h-10 sm:w-11 sm:h-11'
                }`}
              >
                <Settings size={isCompactLandscape ? 17 : 19} className="text-purple-300" />
              </div>
            </div>
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* CENTER STAGE: FLOATING 3D CARDS + IMPOSING CREST + JOGAR       */}
      {/* ============================================================== */}
      <main
        className={`relative z-20 flex-1 min-h-0 w-full mx-auto flex items-center justify-center my-auto transition-all duration-300 ${
          isFullscreen ? 'max-w-[1800px] gap-2 lg:gap-4 xl:gap-6' : 'max-w-[1440px] gap-3 lg:gap-5 xl:gap-8'
        }`}
      >
        {/* Left Wing: Floating Legendary 3D Holographic Cards (2 normal, 3 in fullscreen) */}
        {!isCompactLandscape && (
          <div
            className={`hidden md:flex items-center shrink-0 ${
              isFullscreen ? 'gap-2 lg:gap-3 xl:gap-4' : 'gap-3 xl:gap-5'
            }`}
          >
            {leftWingCards.map((card, idx) => (
              <FloatingHolographicCard
                key={card.instanceId}
                card={card}
                slotIndex={idx}
                totalInWing={leftWingCards.length}
                side="left"
                foilEnabled={foilEffects}
                isFullscreenExtra={isFullscreen && idx === 0}
                onInspect={(c) => setInspectedCard(c)}
              />
            ))}
          </div>
        )}

        {/* Center Focal Anchor: Official Logo of Celentia + Eclipse JOGAR Portal */}
        <div className="relative flex flex-col items-center text-center max-w-2xl xl:max-w-3xl px-2">
          <div className="relative flex flex-col items-center">
            <div className="relative flex items-center justify-center animate-float">
              {/* Multi-layered Golden & Celestial Aura Halo */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-x-8 -inset-y-4 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.42)_0%,rgba(245,158,11,0.2)_38%,rgba(56,189,248,0.14)_62%,transparent_78%)] blur-2xl animate-dial-breath"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-2 rounded-full bg-[radial-gradient(circle,rgba(254,243,199,0.34)_0%,rgba(129,140,248,0.16)_52%,transparent_75%)] blur-xl"
              />

              {/* Slow-Rotating Radiant Golden Sunburst Corona Behind Emblem */}
              <svg
                viewBox="0 0 320 320"
                aria-hidden="true"
                className={`pointer-events-none absolute opacity-40 animate-spin-cosmic ${
                  isCompactLandscape ? 'w-56 h-56' : 'w-72 h-72 sm:w-[390px] sm:h-[390px] xl:w-[460px] xl:h-[460px]'
                }`}
              >
                <defs>
                  <radialGradient id="logoCoronaRay" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fef08a" stopOpacity="0.85" />
                    <stop offset="55%" stopColor="#f59e0b" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                  </radialGradient>
                </defs>
                {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5].map((deg) => (
                  <polygon
                    key={deg}
                    points="160,160 153,16 160,4 167,16"
                    fill="url(#logoCoronaRay)"
                    transform={`rotate(${deg} 160 160)`}
                  />
                ))}
              </svg>

              {/* Subtle 4-Point Celestial Star Glints framing the Crest */}
              {!isCompactLandscape && (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="pointer-events-none absolute top-[12%] left-[8%] w-5 h-5 text-amber-200 drop-shadow-[0_0_10px_#fde047] animate-logo-star-twinkle z-20"
                  >
                    <path d="M12 1L14.2 9.8L23 12L14.2 14.2L12 23L9.8 14.2L1 12L9.8 9.8L12 1Z" fill="currentColor" />
                  </svg>
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="pointer-events-none absolute top-[16%] right-[9%] w-4 h-4 text-cyan-200 drop-shadow-[0_0_10px_#38bdf8] animate-logo-star-twinkle z-20"
                    style={{ animationDelay: '1.1s' }}
                  >
                    <path d="M12 1L14.2 9.8L23 12L14.2 14.2L12 23L9.8 14.2L1 12L9.8 9.8L12 1Z" fill="currentColor" />
                  </svg>
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-[18%] right-[14%] w-3.5 h-3.5 text-amber-100 drop-shadow-[0_0_8px_#fbbf24] animate-logo-star-twinkle z-20"
                    style={{ animationDelay: '2.1s' }}
                  >
                    <path d="M12 1L14.2 9.8L23 12L14.2 14.2L12 23L9.8 14.2L1 12L9.8 9.8L12 1Z" fill="currentColor" />
                  </svg>
                </>
              )}

              <img
                src="/assets/aistudio/image_37b92b6f.png?v=official_cutout_5"
                alt="Celentia: Reinos em Guerra — Logo Oficial"
                referrerPolicy="no-referrer"
                className={`relative z-10 object-contain select-none pointer-events-none animate-logo-celestial-glow ${
                  isCompactLandscape
                    ? 'w-72 max-h-[34dvh]'
                    : 'w-80 sm:w-[440px] md:w-[500px] lg:w-[560px] xl:w-[640px] max-h-[46vh]'
                }`}
              />
            </div>

            {!isCompactLandscape && (
              <div className="mt-0.5 h-5 flex items-center justify-center text-xs text-stone-300">
                {hoveredPillarInfo ? (
                  <div className="flex items-center gap-2 text-amber-200">
                    <span>Pilar de {hoveredPillarInfo.label}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-stone-300">{hoveredPillarInfo.lore}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-stone-400">
                    <span>Granty</span>
                    <span aria-hidden="true">·</span>
                    <span>Musmo</span>
                    <span aria-hidden="true">·</span>
                    <span>Naneya</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-300/90">
                      {isTouchDevice
                        ? 'Toque em Jogar para entrar na arena'
                        : 'Clique nos pilares para filtrar a Galeria'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Primary Focal CTA: Sovereign Eclipse Relic "JOGAR" Portal */}
          <div className={`${isCompactLandscape ? 'mt-1' : 'mt-2.5 sm:mt-3.5'} flex flex-col items-center`}>
            <button
              type="button"
              onClick={handleOpenGameMode}
              className="group relative flex items-center justify-center transition-transform duration-200 hover:scale-[1.06] active:scale-[0.96] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 rounded-2xl min-h-[48px]"
              title="Iniciar Batalha — Escolher Modo de Jogo"
            >
              {/* Layered Breathing Sovereign Portal Aura */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-x-7 -inset-y-3 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.52)_0%,rgba(245,158,11,0.26)_42%,rgba(56,189,248,0.22)_70%,transparent_88%)] blur-2xl animate-play-portal-aura group-hover:scale-110 transition-transform duration-300"
              />

              {/* Sculpted Left & Right Spear-Wing Relic Finials */}
              <svg
                viewBox="0 0 26 48"
                aria-hidden="true"
                className={`pointer-events-none shrink-0 -mr-2.5 z-10 text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.75)] transition-transform duration-300 group-hover:-translate-x-1 ${
                  isCompactLandscape ? 'w-4 h-9' : 'w-6 h-12 sm:w-7 sm:h-14'
                }`}
              >
                <polygon points="24,4 4,24 24,44 17,24" fill="currentColor" opacity="0.92" />
                <polygon points="15,13 1,24 15,35 10,24" fill="#38bdf8" opacity="0.85" />
              </svg>

              {/* Chamfered Hexagonal Forged-Gold Outer Relic Bezel */}
              <div
                className={`relative z-20 p-[2.5px] bg-gradient-to-b from-amber-100 via-amber-400 to-amber-800 shadow-[0_14px_44px_rgba(245,158,11,0.55),0_0_24px_rgba(56,189,248,0.25)] transition-all duration-300 group-hover:shadow-[0_16px_54px_rgba(251,191,36,0.8),0_0_32px_rgba(56,189,248,0.45)] ${
                  isCompactLandscape ? 'w-56 h-[54px]' : 'w-72 h-[74px] sm:w-[320px] sm:h-[82px]'
                }`}
                style={{
                  clipPath:
                    'polygon(20px 0%, calc(100% - 20px) 0%, 100% 50%, calc(100% - 20px) 100%, 20px 100%, 0% 50%)',
                }}
              >
                {/* Inner Obsidian-Celestial Chamber */}
                <div
                  className="relative w-full h-full bg-gradient-to-r from-[#0e081c] via-[#241338] to-[#081c36] overflow-hidden flex items-center justify-center gap-3.5 sm:gap-4 px-7"
                  style={{
                    clipPath:
                      'polygon(18.5px 0%, calc(100% - 18.5px) 0%, 100% 50%, calc(100% - 18.5px) 100%, 18.5px 100%, 0% 50%)',
                  }}
                >
                  {/* Warm Solar-Lunar Core Backlight */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.26)_0%,rgba(168,85,247,0.14)_45%,rgba(56,189,248,0.12)_78%,transparent_100%)] group-hover:opacity-100 opacity-80 transition-opacity"
                  />

                  {/* Dual Counter-Rotating Engraved Arcane Astrolabe Rings */}
                  <svg
                    viewBox="0 0 220 220"
                    aria-hidden="true"
                    className="pointer-events-none absolute w-56 h-56 opacity-30 group-hover:opacity-55 animate-dial-orbit-slow transition-opacity"
                  >
                    <circle
                      cx="110"
                      cy="110"
                      r="86"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="1.2"
                      strokeDasharray="8 6"
                    />
                    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                      <polygon
                        key={deg}
                        points="110,110 106,24 110,14 114,24"
                        fill="#f59e0b"
                        opacity="0.65"
                        transform={`rotate(${deg} 110 110)`}
                      />
                    ))}
                  </svg>
                  <svg
                    viewBox="0 0 180 180"
                    aria-hidden="true"
                    className="pointer-events-none absolute w-40 h-40 opacity-25 group-hover:opacity-50 animate-dial-orbit-reverse transition-opacity"
                  >
                    <circle
                      cx="90"
                      cy="90"
                      r="68"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.2"
                      strokeDasharray="12 8"
                    />
                  </svg>

                  {/* Molten-Gold Specular Sweep Gliding Across the Portal */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-amber-200/40 to-transparent animate-play-portal-sheen"
                  />

                  {/* Fine Inner Metallic Hairline Frame */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-[3px] border border-amber-300/35"
                    style={{
                      clipPath:
                        'polygon(16px 0%, calc(100% - 16px) 0%, 100% 50%, calc(100% - 16px) 100%, 16px 100%, 0% 50%)',
                    }}
                  />

                  {/* Sovereign Eclipse Emblem Orb (Solar Ring + Lunar Rim + Crossed Blades) */}
                  <div
                    className={`relative z-10 shrink-0 rounded-full p-[2px] bg-gradient-to-br from-amber-200 via-amber-500 to-cyan-400 shadow-[0_0_20px_rgba(251,191,36,0.75)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                      isCompactLandscape ? 'w-9 h-9' : 'w-12 h-12 sm:w-[52px] sm:h-[52px]'
                    }`}
                  >
                    <div className="relative w-full h-full rounded-full bg-gradient-to-br from-[#1b102c] via-[#120b1f] to-[#08192e] flex items-center justify-center overflow-hidden">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-1 rounded-full border border-dashed border-amber-300/60 animate-dial-orbit-fast"
                      />
                      <Swords
                        size={isCompactLandscape ? 17 : 23}
                        className="relative z-10 text-amber-200 drop-shadow-[0_0_10px_rgba(253,224,71,0.95)]"
                      />
                    </div>
                  </div>

                  {/* Embossed Gold-Foil Display Typography */}
                  <div className="relative z-10 flex flex-col items-start">
                    <span
                      className={`font-serif font-black tracking-[0.26em] text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-100 to-amber-400 drop-shadow-[0_2px_12px_rgba(251,191,36,0.55)] whitespace-nowrap leading-none ${
                        isCompactLandscape ? 'text-xl' : 'text-2xl sm:text-[32px]'
                      }`}
                    >
                      JOGAR
                    </span>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span aria-hidden="true" className="w-3 h-[1px] bg-gradient-to-r from-transparent to-amber-300/80" />
                      <span className="text-[9px] sm:text-[10px] font-serif font-bold tracking-[0.2em] text-cyan-200/95 uppercase whitespace-nowrap leading-none">
                        Entrar na Arena
                      </span>
                      <span aria-hidden="true" className="w-3 h-[1px] bg-gradient-to-l from-transparent to-cyan-300/80" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sculpted Right Spear-Wing Relic Finial */}
              <svg
                viewBox="0 0 26 48"
                aria-hidden="true"
                className={`pointer-events-none shrink-0 -ml-2.5 z-10 text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.75)] transition-transform duration-300 group-hover:translate-x-1 ${
                  isCompactLandscape ? 'w-4 h-9' : 'w-6 h-12 sm:w-7 sm:h-14'
                }`}
              >
                <polygon points="2,4 22,24 2,44 9,24" fill="currentColor" opacity="0.92" />
                <polygon points="11,13 25,24 11,35 16,24" fill="#38bdf8" opacity="0.85" />
              </svg>

              {/* Top & Bottom Center Keystone Diamonds */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-1.5 left-1/2 -translate-x-1/2 z-30 w-3 h-3 rotate-45 bg-gradient-to-br from-white via-amber-300 to-amber-600 border border-amber-100 shadow-[0_0_12px_#fde047]"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-30 w-2.5 h-2.5 rotate-45 bg-gradient-to-br from-cyan-100 via-sky-400 to-indigo-600 border border-cyan-100 shadow-[0_0_10px_#38bdf8]"
              />
            </button>

            {/* Active Deck Reliquary Bar (1-Click Deck Switcher) */}
            <button
              onClick={() => {
                sound.playDraw();
                onOpenDeckSelector();
              }}
              className={`${
                isCompactLandscape ? 'mt-1.5 py-1 px-3 min-h-[36px]' : 'mt-3 px-4 py-1.5 min-h-[40px]'
              } rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-stone-700 hover:border-amber-400/70 text-xs text-stone-300 flex items-center gap-2 transition-all cursor-pointer shadow-md`}
              title="Clique para trocar seu Baralho Ativo"
            >
              <Layers size={13} className="text-amber-400 shrink-0" />
              <span className="text-stone-400">Deck Ativo:</span>
              <span className="font-serif font-bold text-amber-200 truncate max-w-[160px] sm:max-w-[200px]">
                {activeDeckName}
              </span>
              <span className="text-stone-500">·</span>
              <span className="text-amber-400 font-semibold whitespace-nowrap">Trocar</span>
            </button>
          </div>
        </div>

        {/* Right Wing: Floating Legendary 3D Holographic Cards (2 normal, 3 in fullscreen) */}
        {!isCompactLandscape && (
          <div
            className={`hidden md:flex items-center shrink-0 ${
              isFullscreen ? 'gap-2 lg:gap-3 xl:gap-4' : 'gap-3 xl:gap-5'
            }`}
          >
            {rightWingCards.map((card, idx) => (
              <FloatingHolographicCard
                key={card.instanceId}
                card={card}
                slotIndex={idx}
                totalInWing={rightWingCards.length}
                side="right"
                foilEnabled={foilEffects}
                isFullscreenExtra={isFullscreen && idx === rightWingCards.length - 1}
                onInspect={(c) => setInspectedCard(c)}
              />
            ))}
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* BOTTOM EDGE HUD: PROFILE (BOTTOM-LEFT) | GALERIA & REGRAS (RIGHT) */}
      {/* ============================================================== */}
      <footer
        className={`relative z-20 w-full flex flex-row items-end justify-between gap-3 shrink-0 ${
          isCompactLandscape ? 'pt-1' : 'pt-2'
        }`}
      >
        {/* Bottom Left: Sculpted Stone & Gold Player Profile Crest (Edge-Anchored) */}
        <button
          type="button"
          onClick={() => {
            sound.playDraw();
            setProfileInitialTab('my_profile');
            setIsProfileModalOpen(true);
          }}
          className={`group relative flex items-center text-left rounded-2xl bg-gradient-to-b from-stone-900/95 to-stone-950/95 border-2 border-stone-700/90 hover:border-cyan-400/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 shadow-[0_8px_30px_rgba(0,0,0,0.92)] transition-all duration-200 cursor-pointer shrink-0 max-w-[68vw] sm:max-w-none ${
            isCompactLandscape ? 'gap-2 px-2.5 py-1.5' : 'gap-3.5 px-4 py-2.5'
          }`}
          title="Abrir Perfil do Jogador, Emblemas e Histórico de Partidas"
        >
          <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rotate-45 bg-cyan-400 border border-white pointer-events-none" />
          <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rotate-45 bg-amber-400 border border-white pointer-events-none" />

          <div className="relative shrink-0">
            <AvatarPortrait
              avatarId={playerState?.avatarId || profile.avatarId || DEFAULT_AVATAR_ID}
              size={isCompactLandscape ? 'sm' : 'md'}
              isAdmin={isAdminAccount}
              showFrameGem
              className="group-hover:scale-105 transition-transform"
            />
            <div className="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.5 rounded-md bg-cyan-500 border border-white text-[10px] font-mono tabular-nums font-black text-stone-950 shadow z-20">
              Nv.{playerState?.level ?? profile.level}
            </div>
          </div>

          <div className="flex flex-col gap-1 pr-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm sm:text-base font-serif font-black tracking-wide text-amber-100 group-hover:text-white transition-colors truncate">
                {playerState?.nickname ?? profile.nickname}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400/50 text-[11px] font-mono font-bold text-cyan-200 flex items-center gap-1 tabular-nums shrink-0" title="Cristais">
                <Gem size={11} className="text-cyan-300 shrink-0" />
                <span>{playerState?.crystals ?? profile.crystals ?? 0}</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/50 text-[11px] font-mono font-bold text-amber-300 flex items-center gap-1 tabular-nums shrink-0" title="Ouro">
                <span>🪙</span>
                <span>{playerState?.gold ?? profile.gold}</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-stone-300 font-mono tabular-nums whitespace-nowrap">
              <Shield size={13} className="text-amber-400 shrink-0" />
              <span className="font-serif font-bold text-amber-300 uppercase">
                {rankInfo.label}
              </span>
              {(rankInfo.isCapped || rankInfo.isTotallyBlocked) && (
                <Lock size={11} className="text-amber-300 shrink-0" />
              )}
              <span aria-hidden="true" className="text-stone-500">·</span>
              <span className="text-stone-400">
                {rankInfo.isUnranked
                  ? '1ª Ranqueada → Bronze III'
                  : rankInfo.nextLabel
                  ? `${rankInfo.pointsInDivision}/100 RP`
                  : `${rankInfo.totalPoints} RP`}
              </span>
            </div>
          </div>
        </button>

        {/* Bottom Right: Compact Hover-Expanding Icon Dock (Ranking Geral, Galeria de Cartas & Regras) */}
        <div className="flex items-end justify-end gap-2.5 shrink-0">
          {/* Ranking Geral — Icon-only at rest, expands leftward on hover/focus */}
          <button
            type="button"
            onClick={() => {
              sound.playDraw();
              setProfileInitialTab('leaderboard');
              setIsProfileModalOpen(true);
            }}
            aria-label="Ranking Geral — Classificação global dos duelistas"
            className="group relative flex items-center justify-end rounded-2xl p-[2px] bg-gradient-to-br from-amber-300/80 via-yellow-500/75 to-orange-400/80 hover:from-amber-200 hover:via-yellow-400 hover:to-amber-300 shadow-[0_8px_28px_rgba(0,0,0,0.9)] hover:shadow-[0_0_26px_rgba(251,191,36,0.38)] transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 shrink-0"
          >
            <div
              className={`relative rounded-[14px] bg-gradient-to-r from-[#1e1306] via-[#17110a] to-[#1a1007] flex items-center justify-end overflow-hidden ${
                isCompactLandscape ? 'p-1.5' : 'p-2'
              }`}
            >
              <div className="overflow-hidden max-w-0 opacity-0 pl-0 pr-0 group-hover:max-w-[230px] group-hover:opacity-100 group-hover:pl-2.5 group-hover:pr-3 group-focus-visible:max-w-[230px] group-focus-visible:opacity-100 group-focus-visible:pl-2.5 group-focus-visible:pr-3 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none">
                <div className="flex flex-col items-end text-right whitespace-nowrap">
                  <span className="text-xs font-serif font-black tracking-wider uppercase text-amber-200">
                    Ranking Geral
                  </span>
                  <span className="text-[11px] text-amber-100/75">
                    Classificação dos duelistas
                  </span>
                </div>
              </div>
              <div
                className={`relative z-10 rounded-xl bg-gradient-to-br from-amber-500/25 via-yellow-500/20 to-orange-500/25 border border-amber-300/65 flex items-center justify-center shadow-[0_0_14px_rgba(251,191,36,0.3)] group-hover:scale-105 transition-transform shrink-0 ${
                  isCompactLandscape ? 'w-9 h-9' : 'w-11 h-11'
                }`}
              >
                <Trophy size={isCompactLandscape ? 18 : 21} className="text-amber-300" />
              </div>
            </div>
          </button>

          {/* Galeria de Cartas — Icon-only at rest, expands title + description on hover/focus */}
          <button
            type="button"
            onClick={() => {
              sound.playDraw();
              setGalleryInitialElement('all');
              setIsGalleryModalOpen(true);
            }}
            aria-label="Galeria de Cartas — Acervo completo com todas as classes, reinos e efeitos"
            className="group relative flex items-center justify-end rounded-2xl p-[2px] bg-gradient-to-br from-cyan-400/75 via-emerald-400/75 to-amber-300/75 hover:from-cyan-300 hover:via-emerald-300 hover:to-amber-200 shadow-[0_8px_28px_rgba(0,0,0,0.9)] hover:shadow-[0_0_26px_rgba(34,211,238,0.35)] transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 shrink-0"
          >
            <div
              className={`relative rounded-[14px] bg-gradient-to-r from-[#071622] via-[#0d1a26] to-[#081b19] flex items-center justify-end overflow-hidden ${
                isCompactLandscape ? 'p-1.5' : 'p-2'
              }`}
            >
              {/* Expanding Title & Description (slides open leftward from the icon) */}
              <div className="overflow-hidden max-w-0 opacity-0 pl-0 pr-0 group-hover:max-w-[230px] group-hover:opacity-100 group-hover:pl-2.5 group-hover:pr-3 group-focus-visible:max-w-[230px] group-focus-visible:opacity-100 group-focus-visible:pl-2.5 group-focus-visible:pr-3 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none">
                <div className="flex flex-col items-end text-right whitespace-nowrap">
                  <span className="text-xs font-serif font-black tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-100 via-amber-100 to-emerald-200">
                    Galeria de Cartas
                  </span>
                  <span className="text-[11px] text-cyan-200/80">
                    Acervo completo · 10 classes
                  </span>
                </div>
              </div>

              {/* Relic Icon */}
              <div
                className={`relative z-10 rounded-xl bg-gradient-to-br from-cyan-500/25 via-emerald-500/20 to-amber-500/25 border border-cyan-300/60 flex items-center justify-center shadow-[0_0_14px_rgba(34,211,238,0.3)] group-hover:scale-105 transition-transform shrink-0 ${
                  isCompactLandscape ? 'w-9 h-9' : 'w-11 h-11'
                }`}
              >
                <Library size={isCompactLandscape ? 18 : 21} className="text-cyan-200" />
              </div>
            </div>
          </button>

          {/* Regras — Icon-only at rest, expands title + description on hover/focus */}
          <button
            type="button"
            onClick={() => {
              sound.playDraw();
              onOpenRules();
            }}
            aria-label="Regras — Manual do Santuário e mecânicas de combate"
            className="group relative flex items-center justify-end rounded-2xl bg-stone-900/95 hover:bg-stone-800/95 border-2 border-stone-700/90 hover:border-amber-400/85 shadow-[0_8px_28px_rgba(0,0,0,0.9)] hover:shadow-[0_0_24px_rgba(245,158,11,0.28)] transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 shrink-0"
          >
            <div
              className={`relative flex items-center justify-end overflow-hidden ${
                isCompactLandscape ? 'p-1.5' : 'p-2'
              }`}
            >
              {/* Expanding Title & Description (slides open leftward from the icon) */}
              <div className="overflow-hidden max-w-0 opacity-0 pl-0 pr-0 group-hover:max-w-[220px] group-hover:opacity-100 group-hover:pl-2.5 group-hover:pr-3 group-focus-visible:max-w-[220px] group-focus-visible:opacity-100 group-focus-visible:pl-2.5 group-focus-visible:pr-3 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none">
                <div className="flex flex-col items-end text-right whitespace-nowrap">
                  <span className="text-xs font-serif font-black tracking-wider uppercase text-amber-100">
                    Regras
                  </span>
                  <span className="text-[11px] text-stone-400">
                    Manual do Santuário e combate
                  </span>
                </div>
              </div>

              {/* Tome Icon */}
              <div
                className={`relative z-10 rounded-xl bg-gradient-to-br from-amber-950 via-stone-900 to-stone-950 border border-amber-400/55 flex items-center justify-center shadow-[0_0_14px_rgba(245,158,11,0.22)] group-hover:scale-105 transition-transform shrink-0 ${
                  isCompactLandscape ? 'w-9 h-9' : 'w-11 h-11'
                }`}
              >
                <BookOpen size={isCompactLandscape ? 18 : 21} className="text-amber-300" />
              </div>
            </div>
          </button>
        </div>
      </footer>

      {/* ============================================================== */}
      {/* INTEGRATED MODALS                                              */}
      {/* ============================================================== */}
      <PlayerProfileModal
        isOpen={isProfileModalOpen}
        initialTab={profileInitialTab}
        onClose={() => setIsProfileModalOpen(false)}
        onOpenAdminPanel={
          isAdminAccount
            ? () => {
                setIsProfileModalOpen(false);
                setIsAdminPanelOpen(true);
              }
            : undefined
        }
      />

      <AdminPanelModal
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
      />

      <CardGalleryModal
        isOpen={isGalleryModalOpen}
        onClose={() => setIsGalleryModalOpen(false)}
        initialElement={galleryInitialElement}
      />

      <ShopModal
        isOpen={isShopModalOpen}
        onClose={() => setIsShopModalOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      <CardModal
        card={inspectedCard}
        onClose={() => setInspectedCard(null)}
      />
    </div>
  );
};
