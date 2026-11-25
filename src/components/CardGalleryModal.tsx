import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Maximize2, Layers, Eye, LayoutGrid } from 'lucide-react';
import { CARD_TEMPLATES } from '../data/cards';
import { CardTemplate, ElementType, KingdomType } from '../types/game';
import { createCardInstance } from '../logic/deckFactory';
import { ELEMENT_CONFIG, KINGDOM_THEMES, TIER_CONFIG, CONDITION_PILL_CONFIG, getCardArtPrimaryId, getCardArtCandidates, advanceCardArtFallback, getThematicCardArt } from '../utils/cardVisuals';
import { CardModal } from './CardModal';
import { FormattedCardDescription } from './FormattedCardDescription';
import { sound } from '../services/soundEffects';
import {
  useCloudPlayerState,
  isCardUnlocked,
  isEventExclusiveCard,
  getCardUnlockCost,
} from '../services/accountApi';

interface CardGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialElement?: 'all' | ElementType;
}

const LEVEL_2_OVERRIDES: Record<
  string,
  {
    name?: string;
    exclusiveName: string;
    effectDescription: string;
  }
> = {
  g_barao_well: {
    name: 'Barão Well (Nível 2)',
    exclusiveName: 'Soberano da Tempestade',
    effectDescription:
      'Lendária [Tier 5 - Nível 2]. Ganha CURA e ROUBO DE VIDA permanentes! Além disso, a cada início de rodada, 2 inimigos aleatórios na mesa inimiga são atingidos por um raio causando 15 de dano e aplicando ELETRIFICADO por 1 rodada (+20% de dano elétrico recebido).',
  },
  g_craff: {
    name: 'Craff, o Ferreiro (Nível 2)',
    exclusiveName: 'Presença Rúnica & Rochedo',
    effectDescription:
      'Lendária [Tier 5 - Nível 2]. Presença Rúnica: Enquanto Craff estiver em campo permite invocar +1 carta por rodada (limite 3). Sempre que o jogador invocar a 3ª carta na mesma rodada com Craff Nível 2 na mesa, gere um Rochedo.',
  },
  m_licia: {
    name: 'Licia, a Fada (Nível 2)',
    exclusiveName: 'Guardiã do Véu',
    effectDescription:
      'Lendária [Tier 5 - Nível 2]. Ao subir de nível, compartilha seu valor de PODER atual e entrega Furtivo a todas as unidades aliadas na mesa! Concede +10 de PODER a todas as unidades furtivas a cada nova rodada e recebe o efeito exclusivo ETÉREO.',
  },
  m_titano: {
    name: 'Titano (Nível 2)',
    exclusiveName: 'Carrasco dos Mares & Sangramento',
    effectDescription:
      'Lendária [Tier 5 - Nível 2]. Possui Ataque-Duplo. Recebe +20 de poder e pode causar Sangramento permanentemente.\nPassiva: Causar dano em unidades afetadas por SANGRAMENTO concede CURA a Titano por 2 rodadas.',
  },
  n_saniel: {
    name: 'Saniel, o Arcanjo (Nível 2)',
    exclusiveName: 'Colheita Celestial',
    effectDescription:
      'Lendária [Tier 5 - Nível 2]. Absorve permanentemente todos os atributos e condições benéficas da unidade que eliminar em combate, somando 50% de todo PODER absorvido ao seu ATAQUE! A cada 2 rodadas gera uma "Jurisdição de Saniel" FUGAZ na mão.',
  },
  n_helio: {
    name: 'Hélio, o Guerreiro do Sol (Nível 2)',
    exclusiveName: 'Arauto Solar Supremo',
    effectDescription:
      'Lendária [Tier 5 - Nível 2]. Caso seja a única unidade designada em um ATAQUE, DOBRA seu valor de ATAQUE. Se eliminar uma unidade defensora, cura-se em 10 de Resistência (priorizando Vida e depois Defesa).',
  },
  g_lunario: {
    name: 'Lunario, Emissário Cósmico Supremo',
    exclusiveName: 'Devorador de Sonhos',
    effectDescription:
      'Lendária [Tier 5 - Nível 2]. No início de cada nova rodada, consome o efeito SONO de todas as unidades na mesa. Ganha +5/+5 de Sapiência e Poder por cada SONO consumido e causa 7 de dano à Resistência da unidade afetada.',
  },
  m_bonetrus: {
    name: 'Bonetrus, Soberano do Inverno',
    exclusiveName: 'Devastação Glacial',
    effectDescription:
      'Lendária [Tier 5 - Nível 2]. Ao atacar inimigos afligidos por CONGELAR os executa caso tenham 12 ou menos de Vida. Se designado sozinho para um ataque, causa 100% do dano no defensor e 50% em TODAS as demais unidades inimigas.',
  },
  n_o_sol: {
    name: 'O Sol - O Absoluto (Nível 2)',
    exclusiveName: 'O Absoluto (Buraco Negro · Imortal)',
    effectDescription:
      'Supremo [Tier 6 - Nível 2]. O ABSOLUTO: O Sol mostra sua verdadeira forma de Buraco Negro, ficando com todos seus atributos em escala INFINITO (∞) e tornando-se IMORTAL. Em ataques e defesas (sozinho ou em mesa cheia) OBLITERA todas as unidades que atacarem ou defenderem. A cada rodada drena 1 de vida do jogador inimigo, ao chegar a zero ele é derrotado.',
  },
  g_a_lua: {
    name: 'A Lua - A Eminente (Nível 2)',
    exclusiveName: 'A Eminente (Monstruosidade Sanguinária · Imortal)',
    effectDescription:
      'Supremo [Tier 6 - Nível 2]. A EMINENTE: A Lua mostra sua verdadeira forma, uma monstruosidade sanguinária e aniquiladora. A cada rodada aplica SONO em todos os inimigos. A Lua potencializa o efeito de Lunario, fazendo com que toda vez que Lunario consuma o SONO das unidades inimigas ele OBLITERA elas. A cada início de rodada A Lua drena 1 da vida do jogador inimigo, ao chegar a zero ele é derrotado.',
  },
  g_kaliel: {
    name: 'Kaliel, o Arcanjo (Nível 2)',
    exclusiveName: 'Comunhão Angiris',
    effectDescription:
      'Lendária [Tier 5 - Nível 2]. Ao subir de nível gera um "Filho da Luz" FUGAZ na mão. Enquanto Kaliel estiver na mesa, todos os Arcanjos aliados em campo compartilham entre si os maiores valores atuais de cada atributo e todas as suas condições benéficas e de combate!',
  },
};

function getCalculatedCombatStats(card: CardTemplate) {
  if (card.type === 'skill') return null;
  const elem = card.element;
  if (elem === 'Cósmico') {
    const sap = card.sapience ?? card.hp;
    return {
      hp: sap,
      def: 0,
      atk: 0,
      power: card.power,
      effectiveDmg: card.power,
      effectiveRes: sap,
      formulaHint: `Dano: ${card.power} (100% Poder) · Resistência: ${sap} Sapiência`,
    };
  }
  if (elem === 'Gelo') {
    const bonusDef = Math.floor(card.power * 0.5);
    const totalDef = card.def + bonusDef;
    const bonusDmg = Math.floor(totalDef * 0.25);
    const effectiveDmg = card.atk + bonusDmg;
    const effectiveRes = card.hp + totalDef;
    return {
      hp: card.hp,
      def: totalDef,
      atk: card.atk,
      power: card.power,
      effectiveDmg,
      effectiveRes,
      formulaHint: `Def c/ Passiva: ${totalDef} (+${bonusDef}) · Dano Real: ${effectiveDmg} (+${bonusDmg})`,
    };
  }
  if (elem === 'Telúrico' || elem === 'Terra') {
    const bonusTel = Math.floor(card.power * 0.5);
    const totalHp = card.hp + bonusTel;
    const totalDef = card.def + bonusTel;
    const effectiveDmg = card.atk;
    const effectiveRes = totalHp + totalDef;
    return {
      hp: totalHp,
      def: totalDef,
      atk: card.atk,
      power: card.power,
      effectiveDmg,
      effectiveRes,
      formulaHint: `Vida: ${totalHp} (+${bonusTel}) · Defesa: ${totalDef} (+${bonusTel}) · Resistência: ${effectiveRes}`,
    };
  }
  if (elem === 'Divino') {
    const bonusDmg = Math.floor(card.power * 0.8);
    const effectiveDmg = card.atk + bonusDmg;
    const effectiveRes = card.hp + card.def;
    return {
      hp: card.hp,
      def: card.def,
      atk: card.atk,
      power: card.power,
      effectiveDmg,
      effectiveRes,
      formulaHint: `Dano Real: ${effectiveDmg} (Atq + ${bonusDmg} [80% Poder]) · Invocação Antecipada`,
    };
  }
  if (elem === 'Sombrio') {
    const critDmg = Math.floor(card.power * 0.5);
    const effectiveDmg = card.atk + critDmg;
    const effectiveRes = card.hp + card.def;
    return {
      hp: card.hp,
      def: card.def,
      atk: card.atk,
      power: card.power,
      effectiveDmg,
      effectiveRes,
      formulaHint: `Dano Total: ${effectiveDmg} (${card.atk} Atq + ${critDmg} Crítico [50% Poder direto na Vida])`,
    };
  }
  if (elem === 'Fogo') {
    const effectiveDmg = card.atk + card.power;
    const effectiveRes = card.hp + card.def;
    return {
      hp: card.hp,
      def: card.def,
      atk: card.atk,
      power: card.power,
      effectiveDmg,
      effectiveRes,
      formulaHint: `Dano Real: ${effectiveDmg} (Atq + 100% Poder) · Resistência: ${effectiveRes}`,
    };
  }
  if (elem === 'Água') {
    const halfPwr = Math.floor(card.power / 2);
    const effectiveDmg = card.atk + halfPwr;
    const effectiveRes = card.hp + card.def + halfPwr;
    return {
      hp: card.hp,
      def: card.def,
      atk: card.atk,
      power: card.power,
      effectiveDmg,
      effectiveRes,
      formulaHint: `Dano Real: ${effectiveDmg} (+${halfPwr}) · Resistência: ${effectiveRes} (+${halfPwr})`,
    };
  }
  if (elem === 'Elétrico') {
    const halfPwr = Math.floor(card.power / 2);
    const effectiveDmg = card.atk + halfPwr;
    const effectiveRes = card.hp + card.def;
    return {
      hp: card.hp,
      def: card.def,
      atk: card.atk,
      power: card.power,
      effectiveDmg,
      effectiveRes,
      formulaHint: `Dano Real: ${effectiveDmg} (+${halfPwr}) · 1º Ataque Atordoa`,
    };
  }
  if (elem === 'Mágico') {
    const effectiveDmg = card.power + Math.max(0, card.atk);
    const effectiveRes = card.hp + card.def;
    return {
      hp: card.hp,
      def: card.def,
      atk: card.atk,
      power: card.power,
      effectiveDmg,
      effectiveRes,
      formulaHint: `Dano Arcano: ${effectiveDmg} (100% Poder + Ataque) · Resistência: ${effectiveRes}`,
    };
  }
  // Neutro
  return {
    hp: card.hp,
    def: card.def,
    atk: card.atk,
    power: card.power,
    effectiveDmg: card.atk,
    effectiveRes: card.hp + card.def,
    formulaHint: `Dano Puro: ${card.atk} · Resistência: ${card.hp + card.def}`,
  };
}

export const CardGalleryModal: React.FC<CardGalleryModalProps> = ({
  isOpen,
  onClose,
  initialElement = 'all',
}) => {
  const { playerState } = useCloudPlayerState();
  const [selectedKingdom, setSelectedKingdom] = useState<'all' | KingdomType>('all');
  const [selectedElement, setSelectedElement] = useState<'all' | ElementType>(initialElement);
  const [selectedTier, setSelectedTier] = useState<number | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'unit' | 'skill' | 'archangel' | 'legendary'>('all');
  const [viewMode, setViewMode] = useState<'detailed' | 'art_showcase'>('detailed');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectedTemplate, setInspectedTemplate] = useState<{ card: CardTemplate; level?: 1 | 2 } | null>(null);
  const [cardLevels, setCardLevels] = useState<Record<string, 1 | 2>>({});
  const [failedArtIds, setFailedArtIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      setFailedArtIds({});
      setSelectedElement(initialElement);
      setSelectedKingdom('all');
      setSelectedTier('all');
      setSelectedCategory('all');
      setSearchQuery('');
    }
  }, [isOpen, initialElement]);

  const toggleCardLevel = (e: React.MouseEvent, cardId: string) => {
    e.stopPropagation();
    sound.playTick();
    setCardLevels((prev) => ({
      ...prev,
      [cardId]: prev[cardId] === 2 ? 1 : 2,
    }));
  };

  const filteredCards = useMemo(() => {
    return CARD_TEMPLATES.filter((card) => {
      if (card.id === 'dummy_target' || card.isSecret) return false;
      if (selectedKingdom !== 'all' && card.kingdom !== selectedKingdom) return false;
      if (selectedElement !== 'all') {
        if (selectedElement === 'Telúrico') {
          if (card.element !== 'Telúrico' && card.element !== 'Terra') return false;
        } else if (card.element !== selectedElement) {
          return false;
        }
      }
      if (selectedTier !== 'all') {
        if (selectedTier === 5) {
          if (card.tier !== 5 && card.tier !== 6) return false;
        } else if (card.tier !== selectedTier) {
          return false;
        }
      }
      if (selectedCategory === 'unit' && card.type !== 'unit') return false;
      if (selectedCategory === 'skill' && card.type !== 'skill') return false;
      if (selectedCategory === 'archangel' && !card.isArchangel) return false;
      if (selectedCategory === 'legendary' && card.tier !== 5 && card.tier !== 6) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = card.name.toLowerCase().includes(query);
        const matchesDesc = (card.effectDescription || '').toLowerCase().includes(query);
        const matchesElem = (card.element || '').toLowerCase().includes(query);
        const matchesExcl = (card.exclusiveName || '').toLowerCase().includes(query);
        const matchesCond = (card.conditionPill || '').toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesElem && !matchesExcl && !matchesCond) return false;
      }
      return true;
    });
  }, [selectedKingdom, selectedElement, selectedTier, selectedCategory, searchQuery]);

  const inspectedInstance = useMemo(() => {
    if (!inspectedTemplate) return null;
    const inst = createCardInstance(inspectedTemplate.card);
    if (inspectedTemplate.level === 2) {
      inst.level = 2;
    }
    return inst;
  }, [inspectedTemplate]);

  if (!isOpen) return null;

  const totalCatalogCount = CARD_TEMPLATES.filter((c) => c.id !== 'dummy_target' && !c.isSecret).length;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/90 backdrop-blur-md animate-fadeIn select-none">
        {/* Ambient Glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[650px] h-[650px] bg-amber-600/10 rounded-full blur-[160px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[150px]" />
        </div>

        <div className="relative z-10 w-full max-w-[1440px] h-[94dvh] flex flex-col rounded-3xl bg-[#0c0b10] border-2 border-stone-700/80 shadow-[0_0_60px_rgba(0,0,0,0.95)] overflow-hidden">
          {/* Header Bar */}
          <div className="py-3.5 px-5 sm:px-7 flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 bg-gradient-to-r from-[#171520] via-[#110f18] to-[#171520]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-xl shadow-inner">
                📜
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg sm:text-2xl font-serif font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500">
                    GALERIA DE CARTAS
                  </h2>
                  <span className="text-xs font-mono font-bold text-amber-300 bg-stone-900/90 px-2.5 py-0.5 rounded-md border border-amber-500/30">
                    {filteredCards.length} / {totalCatalogCount} cartas
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 hidden sm:block">
                  Artes oficiais 100% integrais sem cortes · Clique em qualquer carta para inspecionar fórmulas e ampliar em tela cheia
                </p>
              </div>
            </div>

            {/* Right Controls: Gold Balance, View Mode Switcher & Close */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-950 border border-amber-500/40 font-mono text-xs text-amber-300 font-bold">
                <span>🪙</span>
                <span>{playerState?.gold ?? 1000} Ouro</span>
              </div>

              <div className="flex items-center bg-stone-950 p-1 rounded-xl border border-stone-800">
                <button
                  onClick={() => {
                    sound.playTick();
                    setViewMode('detailed');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    viewMode === 'detailed'
                      ? 'bg-amber-500 text-stone-950 shadow-md'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                  title="Exibir Arte Absoluta + Ficha Completa de Atributos e Efeitos"
                >
                  <LayoutGrid size={14} />
                  <span>Ficha Detalhada</span>
                </button>
                <button
                  onClick={() => {
                    sound.playTick();
                    setViewMode('art_showcase');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    viewMode === 'art_showcase'
                      ? 'bg-amber-500 text-stone-950 shadow-md'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                  title="Focar na Arte Completa em Destaque"
                >
                  <Eye size={14} />
                  <span>Vitrine de Arte</span>
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-stone-900 hover:bg-rose-950/80 border border-stone-700 hover:border-rose-500/50 text-stone-300 hover:text-rose-200 transition-all cursor-pointer"
                title="Fechar Galeria"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="px-4 sm:px-6 py-3 border-b border-stone-800/80 bg-[#121018] flex flex-col gap-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Search Input */}
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome, efeito, condição ou classe..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-stone-950 border border-stone-700/90 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-400 text-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-200 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-950 border border-stone-800">
                {(
                  [
                    { id: 'all', label: 'Todas' },
                    { id: 'unit', label: '⚔️ Unidades' },
                    { id: 'skill', label: '📜 Habilidades' },
                    { id: 'archangel', label: '🪽 Arcanjos' },
                    { id: 'legendary', label: '👑 Lendárias (T5)' },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer whitespace-nowrap ${
                      selectedCategory === cat.id
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Kingdom Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-950 border border-stone-800">
                <span className="text-[10px] text-stone-500 px-1.5 font-mono uppercase">Reino:</span>
                {(['all', 'granty', 'musmo', 'naneya'] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setSelectedKingdom(k)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] capitalize transition-all cursor-pointer whitespace-nowrap ${
                      selectedKingdom === k
                        ? 'bg-amber-600 text-white shadow'
                        : 'text-stone-400 hover:text-amber-300'
                    }`}
                  >
                    {k === 'all' ? 'Todos' : k === 'granty' ? '🏰 Granty' : k === 'musmo' ? '🏛️ Musmo' : '🏯 Naneya'}
                  </button>
                ))}
              </div>

              {/* Tier Buttons */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-950 border border-stone-800">
                <span className="text-[10px] text-stone-500 px-1.5 font-mono uppercase">Tier:</span>
                {(['all', 1, 2, 3, 4, 5] as const).map((t) => (
                  <button
                    key={String(t)}
                    onClick={() => setSelectedTier(t)}
                    className={`px-2 h-6 rounded-lg font-mono font-bold flex items-center justify-center transition-all cursor-pointer text-xs ${
                      selectedTier === t
                        ? 'bg-cyan-500 text-stone-950 shadow'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {t === 'all' ? 'Todos' : `T${t}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Elements Row */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-950 border border-stone-800 overflow-x-auto">
              <span className="text-[10px] text-stone-500 px-2 font-mono uppercase shrink-0">Classe:</span>
              {(['all', 'Fogo', 'Água', 'Gelo', 'Telúrico', 'Elétrico', 'Mágico', 'Cósmico', 'Divino', 'Sombrio', 'Neutro'] as const).map((elem) => (
                <button
                  key={elem}
                  onClick={() => setSelectedElement(elem)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer whitespace-nowrap ${
                    selectedElement === elem
                      ? 'bg-amber-500 text-stone-950 shadow'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {elem === 'all'
                    ? 'Todas as Classes'
                    : elem === 'Telúrico'
                    ? '🌿 Telúrico'
                    : elem === 'Fogo'
                    ? '🔥 Fogo'
                    : elem === 'Água'
                    ? '💧 Água'
                    : elem === 'Gelo'
                    ? '❄️ Gelo'
                    : elem === 'Elétrico'
                    ? '⚡ Elétrico'
                    : elem === 'Mágico'
                    ? '✨ Mágico'
                    : elem === 'Cósmico'
                    ? '🧬 Cósmico'
                    : elem === 'Divino'
                    ? '⚜️ Divino'
                    : elem === 'Sombrio'
                    ? '🌑 Sombrio'
                    : '⚔️ Neutro'}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {filteredCards.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-stone-400 gap-2">
                <span className="text-3xl">🔍</span>
                <p className="text-sm font-semibold">Nenhuma carta encontrada para os filtros selecionados.</p>
                <button
                  onClick={() => {
                    setSelectedKingdom('all');
                    setSelectedElement('all');
                    setSelectedTier('all');
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }}
                  className="mt-1 px-4 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition-colors cursor-pointer"
                >
                  Limpar Filtros
                </button>
              </div>
            ) : (
              <div
                className={
                  viewMode === 'detailed'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'
                    : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'
                }
              >
                {filteredCards.map((card) => {
                  const isSpell = card.type === 'skill';
                  const isCosmic = card.element === 'Cósmico';
                  const hasLvl2 =
                    !isSpell &&
                    (card.tier === 5 || card.tier === 6) &&
                    Boolean(
                      LEVEL_2_OVERRIDES[card.id] ||
                        card.level !== undefined
                    );
                  const activeLvl = cardLevels[card.id] || 1;
                  const isLvl2Active = hasLvl2 && activeLvl === 2;
                  const isOSolLvl2 = isLvl2Active && card.id === 'n_o_sol';

                  const lvl2Info = isLvl2Active ? LEVEL_2_OVERRIDES[card.id] : undefined;
                  const displayName = lvl2Info?.name || card.name;
                  const displayExclusive = lvl2Info?.exclusiveName || card.exclusiveName;
                  const displayDesc = lvl2Info?.effectDescription || card.effectDescription || 'Guerreiro convocado para lutar pelo reino.';

                  const tierCfg = TIER_CONFIG[card.tier] || TIER_CONFIG[1];
                  const kingdomCfg = KINGDOM_THEMES[card.kingdom];
                  const elemCfg = ELEMENT_CONFIG[card.element] || ELEMENT_CONFIG.Neutro;
                  const combatStats = getCalculatedCombatStats(card);

                  const { primaryId: primaryArtId } = getCardArtPrimaryId(card.id, {
                    isLvl2: isLvl2Active,
                    isPack: card.isPack,
                    name: card.name,
                  });
                  const artCandidates = getCardArtCandidates(card.id, {
                    isLvl2: isLvl2Active,
                    isPack: card.isPack,
                    name: card.name,
                  });
                  const initialSrc = artCandidates[0];

                  const pillKey = card.conditionPill?.toLowerCase();
                  const pillCfg = pillKey ? CONDITION_PILL_CONFIG[pillKey] : null;
                  const isArtFailed = Boolean(failedArtIds[primaryArtId]) || !initialSrc;
                  const thematicArt = getThematicCardArt(card.id, card.element, isSpell);
                  const unlockRoundText =
                    card.element === 'Divino' && card.type === 'unit'
                      ? card.tier === 1
                        ? 'Rodada 1 (Divino)'
                        : card.tier === 2
                        ? 'Rodada 2 (Divino)'
                        : card.tier === 3
                        ? 'Rodada 4 (Divino)'
                        : card.tier === 4
                        ? 'Rodada 5 (Divino)'
                        : 'Rodada 7 (Divino)'
                      : tierCfg.unlockRound;

                  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                    if (!advanceCardArtFallback(e.currentTarget, artCandidates)) {
                      setFailedArtIds((prev) => (prev[primaryArtId] ? prev : { ...prev, [primaryArtId]: true }));
                    }
                  };

                  // MODE 2: ART SHOWCASE (Vitrine de Arte Absoluta)
                  if (viewMode === 'art_showcase') {
                    return (
                      <div
                        key={card.id}
                        onClick={() => {
                          sound.playDraw();
                          setInspectedTemplate({ card, level: activeLvl });
                        }}
                        className="group relative flex flex-col rounded-2xl overflow-hidden bg-[#13111c] border-2 transition-all duration-200 cursor-pointer hover:-translate-y-1.5 shadow-xl"
                        style={{
                          borderColor: isLvl2Active ? '#fbbf24' : tierCfg.color,
                          boxShadow:
                            card.tier === 6
                              ? `0 10px 30px rgba(0,0,0,0.85), 0 0 22px ${tierCfg.glowShadow}, 0 0 35px rgba(56,189,248,0.4)`
                              : card.tier === 5
                              ? `0 10px 25px rgba(0,0,0,0.85), 0 0 16px ${tierCfg.glowShadow}`
                              : '0 10px 25px rgba(0,0,0,0.85)',
                        }}
                      >
                        {/* Square 1:1 Uncropped Artwork Container */}
                        <div className="relative w-full aspect-square bg-[#09080d] overflow-hidden flex items-center justify-center">
                          {isArtFailed ? (
                            <div
                              className={`w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br ${thematicArt.backdropClass} relative p-4`}
                            >
                              <div className={`absolute inset-3 rounded-xl border ${thematicArt.ringColor} pointer-events-none`} />
                              <span className="absolute top-10 right-4 text-lg opacity-50 pointer-events-none">{thematicArt.secondaryRune}</span>
                              <div
                                className={`w-16 h-16 rounded-2xl bg-black/50 border ${thematicArt.ringColor} flex items-center justify-center text-4xl shadow-2xl`}
                                style={{ boxShadow: `0 0 24px ${thematicArt.glowColor}` }}
                              >
                                {thematicArt.icon}
                              </div>
                              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-widest border bg-black/55 text-white ${thematicArt.ringColor}`}>
                                {thematicArt.tagLabel}
                              </span>
                            </div>
                          ) : (
                            <img
                              key={`showcase_${card.id}_${primaryArtId}`}
                              src={initialSrc}
                              alt={displayName}
                              onError={handleImageError}
                              className="w-full h-full object-contain select-none transition-transform duration-300 group-hover:scale-[1.03]"
                              loading="lazy"
                            />
                          )}

                          {/* Top Floating Badges */}
                          <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-none">
                            <span
                              className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black border backdrop-blur-md shadow"
                              style={{
                                backgroundColor: 'rgba(12, 10, 18, 0.85)',
                                color: tierCfg.color,
                                borderColor: tierCfg.color,
                              }}
                            >
                              TIER {card.tier}
                            </span>

                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border backdrop-blur-md shadow ${elemCfg.bgBadge} ${elemCfg.textBadge} ${elemCfg.border}`}>
                              {isSpell ? (card.speed === 'lenta' ? '⏳ Lenta' : '🌪️ Rápida') : `${elemCfg.icon} ${elemCfg.name}`}
                            </span>
                          </div>

                          {/* Level 1 / Level 2 Toggle Button */}
                          {hasLvl2 && (
                            <button
                              onClick={(e) => toggleCardLevel(e, card.id)}
                              className={`absolute bottom-2 right-2 z-20 px-2.5 py-1 rounded-lg text-[10px] font-mono font-black border shadow-lg transition-all cursor-pointer flex items-center gap-1 ${
                                isLvl2Active
                                  ? 'bg-amber-400 text-stone-950 border-yellow-200 shadow-amber-500/50'
                                  : 'bg-stone-900/90 text-amber-300 border-amber-500/60 hover:bg-stone-800'
                              }`}
                              title="Alternar visualização Nível 1 / Nível 2"
                            >
                              <Layers size={11} />
                              <span>{isLvl2Active ? 'NÍVEL 2' : 'VER NV. 2'}</span>
                            </button>
                          )}
                        </div>

                        {/* Minimal Footer Info with Harmonious Effect Breakdown */}
                        <div className="p-3 bg-gradient-to-b from-[#191625] to-[#0f0d17] border-t border-stone-800 flex-1 flex flex-col justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="font-serif font-black text-xs text-white truncate" title={displayName}>
                                {displayName}
                              </h4>
                              <span className="text-[10px] text-stone-400 shrink-0">{kingdomCfg.crest}</span>
                            </div>
                            {combatStats ? (
                              isCosmic ? (
                                <div className="flex items-center justify-between text-[10px] font-mono text-indigo-300 pb-1 border-b border-stone-800/80">
                                  <span>🔮 {combatStats.hp} Sapiência</span>
                                  <span className="text-amber-300">⚡ {combatStats.power} Poder</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between text-[10px] font-mono pb-1 border-b border-stone-800/80">
                                  <span className="text-emerald-400 font-bold">❤️ {isOSolLvl2 ? '∞' : combatStats.hp}</span>
                                  <span className="text-rose-400 font-bold">⚔️ {isOSolLvl2 ? '∞' : combatStats.atk}</span>
                                  <span className="text-sky-400 font-bold">🛡️ {isOSolLvl2 ? '∞' : combatStats.def}</span>
                                  <span className="text-amber-300 font-bold">⚡ {isOSolLvl2 ? '∞' : combatStats.power}</span>
                                </div>
                              )
                            ) : (
                              <div className="text-[10px] text-purple-300 font-semibold pb-1 border-b border-stone-800/80">
                                Carta de Habilidade ({card.speed === 'lenta' ? 'Lenta' : 'Rápida'})
                              </div>
                            )}
                          </div>

                          <FormattedCardDescription
                            text={displayDesc}
                            variant="compact"
                            hideLevelRequirement={true}
                          />
                        </div>
                      </div>
                    );
                  }

                  // MODE 1: DETAILED FULL-ART CARD SHEET (Padrão)
                  return (
                    <div
                      key={card.id}
                      onClick={() => {
                        sound.playDraw();
                        setInspectedTemplate({ card, level: activeLvl });
                      }}
                      className="group relative flex flex-col rounded-2xl overflow-hidden bg-gradient-to-b from-[#191724] via-[#13111b] to-[#0c0b12] border-2 transition-all duration-200 cursor-pointer hover:-translate-y-1 shadow-xl"
                      style={{
                        borderColor: isLvl2Active ? '#fbbf24' : tierCfg.color,
                        boxShadow: isLvl2Active
                          ? '0 12px 30px rgba(0,0,0,0.9), 0 0 22px rgba(251,191,36,0.45)'
                          : card.tier === 6
                          ? `0 10px 30px rgba(0,0,0,0.85), 0 0 22px ${tierCfg.glowShadow}, 0 0 35px rgba(56,189,248,0.4)`
                          : card.tier === 5
                          ? `0 10px 28px rgba(0,0,0,0.85), 0 0 16px ${tierCfg.glowShadow}`
                          : '0 10px 28px rgba(0,0,0,0.85)',
                      }}
                    >
                      {/* 1. Card Header: Kingdom, Name & Tier */}
                      <div className="px-3.5 py-2.5 bg-gradient-to-b from-[#242031] to-[#161420] border-b border-stone-800 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-base border shrink-0 ${elemCfg.bgBadge} ${elemCfg.border}`}
                            title={isSpell ? 'Habilidade' : `Classe: ${elemCfg.name}`}
                          >
                            {isSpell ? (card.speed === 'lenta' ? '⏳' : '🌪️') : elemCfg.icon}
                          </span>
                          <div className="min-w-0">
                            <h3
                              className="font-serif font-black text-sm text-white truncate leading-tight group-hover:text-amber-300 transition-colors"
                              title={displayName}
                            >
                              {displayName}
                            </h3>
                            <div className="flex items-center gap-1.5 text-[10px] text-stone-400 mt-0.5">
                              <span>
                                {kingdomCfg.crest} {kingdomCfg.name.replace('Reino de ', '')}
                              </span>
                              <span>·</span>
                              <span className={`font-bold ${elemCfg.textBadge}`}>
                                {isSpell ? (card.speed === 'lenta' ? 'Habilidade Lenta' : 'Habilidade Rápida') : elemCfg.name}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Tier Coin */}
                        <div
                          className="shrink-0 px-2.5 py-1 rounded-xl border-2 flex flex-col items-center justify-center bg-[#121018] shadow-inner"
                          style={{ borderColor: tierCfg.color }}
                          title={`Tier ${card.tier} (${tierCfg.name}) - ${tierCfg.unlockRound}`}
                        >
                          <span className="font-serif font-black text-xs leading-none" style={{ color: tierCfg.color }}>
                            T{card.tier}
                          </span>
                          <span className="text-[8px] font-mono uppercase tracking-wider text-stone-400 mt-0.5">
                            {tierCfg.name}
                          </span>
                        </div>
                      </div>

                      {/* 2. Absolute Full Uncropped Artwork Window (1:1 Square Aspect Ratio) */}
                      <div className="relative w-full aspect-square bg-[#08070c] border-b border-stone-800/90 overflow-hidden flex items-center justify-center">
                        {isArtFailed ? (
                          <div
                            className={`w-full h-full flex flex-col items-center justify-center gap-2.5 bg-gradient-to-br ${thematicArt.backdropClass} relative p-5`}
                          >
                            <div className={`absolute inset-3 rounded-2xl border ${thematicArt.ringColor} pointer-events-none`} />
                            <span className="absolute top-11 right-5 text-xl opacity-50 pointer-events-none">{thematicArt.secondaryRune}</span>
                            <div
                              className={`w-20 h-20 rounded-2xl bg-black/50 border ${thematicArt.ringColor} flex items-center justify-center text-5xl shadow-2xl`}
                              style={{ boxShadow: `0 0 28px ${thematicArt.glowColor}` }}
                            >
                              {thematicArt.icon}
                            </div>
                            <span className={`px-3 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-widest border bg-black/55 text-white ${thematicArt.ringColor}`}>
                              {thematicArt.tagLabel}
                            </span>
                          </div>
                        ) : (
                          <>
                            {/* Subtle ambient backdrop */}
                            <img
                              key={`bg_${card.id}_${primaryArtId}`}
                              src={initialSrc}
                              alt=""
                              aria-hidden="true"
                              onError={(e) => {
                                if (!advanceCardArtFallback(e.currentTarget, artCandidates)) {
                                  e.currentTarget.style.display = 'none';
                                }
                              }}
                              className="absolute inset-0 w-full h-full object-cover blur-xl opacity-25 scale-110 pointer-events-none"
                            />

                            {/* Main 100% Uncropped Artwork */}
                            <img
                              key={`main_${card.id}_${primaryArtId}`}
                              src={initialSrc}
                              alt={displayName}
                              onError={handleImageError}
                              className="relative z-10 w-full h-full object-contain select-none transition-transform duration-300 group-hover:scale-[1.02]"
                              loading="lazy"
                            />
                          </>
                        )}

                        {/* Top-Left Special Tags (Arcanjo, Fugaz, Token, Mini-Pacote, Nível) */}
                        <div className="absolute top-2.5 left-2.5 z-20 flex flex-wrap gap-1 max-w-[75%] pointer-events-none">
                          {card.isArchangel && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/95 text-stone-950 border border-yellow-200 shadow-lg">
                              🪽 ARCANJO
                            </span>
                          )}
                          {card.isFugaz && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-orange-600/95 text-white border border-yellow-300 shadow-lg">
                              ⚡ FUGAZ
                            </span>
                          )}
                          {card.isPack && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-700/95 text-white border border-purple-300 shadow-lg">
                              📦 PACOTE 3 EM 1
                            </span>
                          )}
                          {card.isToken && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-sky-900/95 text-sky-200 border border-sky-400/50 shadow-lg">
                              🔹 TOKEN
                            </span>
                          )}
                        </div>

                        {/* Top-Right Zoom Hint Icon */}
                        <div className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-lg bg-black/75 border border-white/15 text-stone-300 group-hover:text-amber-300 group-hover:border-amber-400/60 transition-colors backdrop-blur-sm shadow-lg">
                          <Maximize2 size={14} />
                        </div>

                        {/* Bottom-Left Condition Pill Badge */}
                        {pillCfg && (
                          <div className="absolute bottom-2.5 left-2.5 z-20 pointer-events-none">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border shadow-lg ${pillCfg.bg} ${pillCfg.text} ${pillCfg.border}`}
                            >
                              {pillCfg.label}
                            </span>
                          </div>
                        )}

                        {/* Bottom-Right Level 1 / Level 2 Interactive Switcher for Tier 5 Legendaries */}
                        {hasLvl2 && (
                          <button
                            onClick={(e) => toggleCardLevel(e, card.id)}
                            className={`absolute bottom-2.5 right-2.5 z-20 px-2.5 py-1 rounded-lg text-[10px] font-mono font-black border shadow-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                              isLvl2Active
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-stone-950 border-yellow-100 shadow-amber-500/40'
                                : 'bg-stone-900/95 text-amber-300 border-amber-500/60 hover:bg-stone-800'
                            }`}
                            title="Clique para alternar entre Nível 1 e Nível 2"
                          >
                            <Layers size={12} />
                            <span>{isLvl2Active ? '👑 NÍVEL 2 ATIVO' : '★ NÍVEL 1 (VER NV.2)'}</span>
                          </button>
                        )}
                      </div>

                      {/* 3. Complete Stats Bar & Class Passive Calculation */}
                      {combatStats ? (
                        <div className="bg-[#15131f] border-b border-stone-800 px-3 py-2">
                          {isCosmic ? (
                            <div className="grid grid-cols-2 gap-2 text-center">
                              <div className="bg-indigo-950/50 border border-indigo-500/30 rounded-lg py-1 px-2 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-indigo-300 uppercase">🔮 Sapiência</span>
                                <span className="font-mono font-black text-sm text-indigo-100">{combatStats.hp}</span>
                              </div>
                              <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg py-1 px-2 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-amber-300 uppercase">⚡ Poder</span>
                                <span className="font-mono font-black text-sm text-amber-200">{combatStats.power}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-4 gap-1.5 text-center">
                              <div className="bg-emerald-950/40 border border-emerald-500/25 rounded-lg py-1 px-1.5 flex flex-col items-center">
                                <span className="text-[9px] text-emerald-400 font-bold uppercase leading-none">❤️ Vida</span>
                                <span className="font-mono font-black text-xs text-emerald-200 mt-0.5">
                                  {isOSolLvl2 ? '∞' : combatStats.hp}
                                  {card.element === 'Telúrico' || card.element === 'Terra' ? (
                                    <span className="text-[9px] text-emerald-400 ml-0.5" title={`Base ${card.hp} + ${Math.floor(card.power * 0.5)} (50% Poder)`}>
                                      *
                                    </span>
                                  ) : null}
                                </span>
                              </div>
                              <div className="bg-rose-950/40 border border-rose-500/25 rounded-lg py-1 px-1.5 flex flex-col items-center">
                                <span className="text-[9px] text-rose-400 font-bold uppercase leading-none">⚔️ Ataque</span>
                                <span className="font-mono font-black text-xs text-rose-200 mt-0.5">
                                  {isOSolLvl2 ? '∞' : combatStats.atk}
                                </span>
                              </div>
                              <div className="bg-sky-950/40 border border-sky-500/25 rounded-lg py-1 px-1.5 flex flex-col items-center">
                                <span className="text-[9px] text-sky-400 font-bold uppercase leading-none">🛡️ Defesa</span>
                                <span className="font-mono font-black text-xs text-sky-200 mt-0.5">
                                  {isOSolLvl2 ? '∞' : combatStats.def}
                                  {card.element === 'Gelo' || card.element === 'Telúrico' || card.element === 'Terra' ? (
                                    <span className="text-[9px] text-cyan-300 ml-0.5" title={`Base ${card.def} + ${Math.floor(card.power * 0.5)} (50% Poder)`}>
                                      *
                                    </span>
                                  ) : null}
                                </span>
                              </div>
                              <div className="bg-amber-950/40 border border-amber-500/25 rounded-lg py-1 px-1.5 flex flex-col items-center">
                                <span className="text-[9px] text-amber-400 font-bold uppercase leading-none">⚡ Poder</span>
                                <span className="font-mono font-black text-xs text-amber-200 mt-0.5">{isOSolLvl2 ? '∞' : combatStats.power}</span>
                              </div>
                            </div>
                          )}

                          {/* Effective Combat Summary Line */}
                          <div className="mt-1.5 pt-1.5 border-t border-stone-800/80 flex items-center justify-between text-[10px] font-mono text-stone-300">
                            <span>
                              💥 Dano Efetivo: <strong className="text-amber-300">{isOSolLvl2 ? '∞' : combatStats.effectiveDmg}</strong>
                            </span>
                            <span>
                              🛡️ Resistência: <strong className="text-sky-300">{isOSolLvl2 ? '∞ (IMORTAL)' : combatStats.effectiveRes}</strong>
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-purple-950/30 border-b border-stone-800 px-3 py-2 flex items-center justify-between text-[11px]">
                          <span className="font-bold text-purple-300">
                            {card.speed === 'lenta' ? '⏳ Habilidade Lenta (Consome o turno)' : '🌪️ Habilidade Rápida (Ação livre no turno)'}
                          </span>
                          <span className="text-[10px] font-mono text-stone-400">{unlockRoundText}</span>
                        </div>
                      )}

                      {/* 4. Full Effect Details & Level-Up Requirement */}
                      <div className="p-3.5 flex-1 flex flex-col justify-between gap-2 bg-gradient-to-b from-[#12101a] to-[#0b0a10]">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-1 flex-wrap border-b border-stone-800/80 pb-1.5">
                            <span className="text-[10px] font-serif font-black uppercase tracking-wider text-amber-400">
                              {displayExclusive ? `★ ${displayExclusive}` : isSpell ? 'Efeito da Habilidade' : 'Efeito Único'}
                            </span>
                            <span className="text-[9px] font-mono text-stone-500">{unlockRoundText}</span>
                          </div>

                          <FormattedCardDescription
                            text={displayDesc}
                            variant="gallery"
                          />
                        </div>

                        {!card.isToken && !card.isSpecialSummon && (
                          <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between">
                            {isCardUnlocked(card.id) ? (
                              <span className="text-[11px] font-mono font-bold text-emerald-400">
                                ✓ Desbloqueada na Coleção
                              </span>
                            ) : isEventExclusiveCard(card.id) ? (
                              <span className="text-[11px] font-mono font-bold text-fuchsia-300">
                                🔒 Exclusivo · Evento / Admin
                              </span>
                            ) : (
                              <span className="text-[11px] font-mono font-bold text-amber-300/90">
                                🔒 Disponível na Loja · {getCardUnlockCost(card.id)} 🪙
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Inspeção Completa com Zoom e Fórmula de Combate */}
      {inspectedInstance && (
        <CardModal
          card={inspectedInstance}
          onClose={() => setInspectedTemplate(null)}
        />
      )}
    </>
  );
};
