export type ElementType = 'Fogo' | 'Água' | 'Telúrico' | 'Terra' | 'Elétrico' | 'Mágico' | 'Cósmico' | 'Gelo' | 'Divino' | 'Sombrio' | 'Neutro' | 'Nenhum';
export type KingdomType = 'granty' | 'musmo' | 'naneya';
export type TierType = 1 | 2 | 3 | 4 | 5 | 6;
export type CardType = 'unit' | 'skill';
export type SkillSpeed = 'rapida' | 'lenta';
export type ConditionEffect =
  | 'furtividade'
  | 'bravura'
  | 'atordoado'
  | 'dormindo'
  | 'sono'
  | 'ressurreicao'
  | 'revelar'
  | 'cura'
  | 'enfrentar'
  | 'queimadura'
  | 'tenacidade'
  | 'ataque_duplo'
  | 'roubo_de_vida'
  | 'entorpecer'
  | 'torpor'
  | 'barreira'
  | 'imunidade'
  | 'congelado'
  | 'critico'
  | 'obliteracao'
  | 'etereo'
  | 'eletrificado'
  | 'silencio'
  | 'capturar'
  | 'retorno'
  | 'executar'
  | 'praga'
  | 'corrosao'
  | 'sangramento'
  | 'hemorragia';

export type ConditionOriginKind =
  | 'habilidade'
  | 'unidade_compartilhada'
  | 'unidade_inimiga'
  | 'passiva_propria'
  | 'efeito_unico_proprio';

export interface ConditionSourceInfo {
  kind: ConditionOriginKind;
  sourceName: string;
}

export interface CardTemplate {
  id: string;
  name: string;
  kingdom: KingdomType;
  tier: TierType;
  type: CardType;
  element: ElementType;
  hp: number;
  atk: number;
  def: number;
  power: number;
  speed?: SkillSpeed;
  effectDescription?: string;
  lore?: string;
  exclusiveName?: string;
  conditionPill?: string;
  isSpecialSummon?: boolean;
  level?: 1 | 2;
  attackCount?: number;
  isArchangel?: boolean;
  isFairy?: boolean;
  isFugaz?: boolean;
  isPack?: boolean;
  packCardIds?: string[];
  levelUpRequirement?: string;
  sapience?: number;
  isToken?: boolean;
  isSecret?: boolean;
  hasFirstAttacked?: boolean;
}

export interface CardInstance {
  instanceId: string;
  templateId: string;
  name: string;
  kingdom: KingdomType;
  tier: TierType;
  type: CardType;
  element: ElementType;
  // Current stats
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  power: number;
  baseAtk: number;
  baseDef: number;
  basePower: number;
  extraElements?: ElementType[]; // Patch 1.4: Classes adquiridas por habilidades de multiclasse durante o combate
  peakPower?: number; // Pico cumulativo de Poder atingido ao decorrer da existência da carta
  icePeakDefense?: number; // Classe Gelo: pico cumulativo de defesa atingido para cálculo dos 25% de dano adicional
  icePowerDefGranted?: number; // Total de Defesa já concedida pelo bônus da Classe Gelo (50% do Poder)
  teluricoPowerHpGranted?: number; // Total de Vida já concedida pelo bônus da Classe Telúrica (50% do Poder)
  teluricoPowerDefGranted?: number; // Total de Defesa já concedida pelo bônus da Classe Telúrica (50% do Poder)
  neutroPowerHpGranted?: number; // Total de Vida já concedida pelo bônus da Classe Neutra (100% do Poder)
  neutroPowerAtkGranted?: number; // Total de Ataque já concedido pelo bônus da Classe Neutra (100% do Poder)
  neutroPowerDefGranted?: number; // Total de Defesa já concedida pelo bônus da Classe Neutra (100% do Poder)
  sapience?: number;
  baseSapience?: number;
  // Conditions
  conditions: Set<ConditionEffect>;
  conditionSources?: Partial<Record<string, ConditionSourceInfo>>;
  silencedRounds: number;
  powerAlwaysActive: boolean; // Mara effect
  doublePower: boolean; // Mesmerino effect
  asleepState?: boolean;
  sleepRoundsRemaining?: number; // For Ilio: sleeps 2 rounds after summon, then wakes with Bravura
  isDying?: boolean; // For death animation
  canActThisRound: boolean;
  speed?: SkillSpeed;
  effectDescription?: string;
  lore?: string;
  exclusiveName?: string;
  conditionPill?: string;
  level?: 1 | 2; // For Legendary cards like Saniel, Lunario
  attackCount?: number; // Tracking attacks for level up
  isArchangel?: boolean;
  isFairy?: boolean;
  burnTurnsRemaining?: number; // 2 rounds of burn (2 damage per round)
  curaTurnsRemaining?: number; // 2 rounds of cura (5 heal per round)
  forcedDefenderId?: string; // For Enfrentar condition: forced defender chosen by attacker
  healingAmount?: number; // For Barão Well level 2 cura
  healingDefAmount?: number; // For Barão Well level 2 cura def regen
  hasLifeSteal?: boolean; // Roubo de Vida
  hasDoubleAttack?: boolean; // Ataque Duplo
  lifeStealRoundsRemaining?: number; // For Farren (expires after 1 round)
  doubleAttackRoundsRemaining?: number; // For Destreza (expires after 1 round)
  blockChance?: number; // Pcie: 30% chance to block attack
  dodgeChance?: number; // Tyn: 40% chance to dodge attack
  skillsUsedWhileAlive?: number; // Tracking skill casts while on board (Barão Well level up: 2+)
  isFugaz?: boolean; // Fugaz card (vanishes at end of round)
  fugazRoundCreated?: number;
  levelUpProgress?: number; // Damage dealt tracker for Titano, etc.
  isPack?: boolean;
  packCardIds?: string[];
  entorpecerRoundsRemaining?: number; // For Torpor: lasts 2 rounds
  immunedRounds?: number; // For Herox: immune for 3 rounds
  defendCount?: number; // For Lunario: defends 2 times for level up
  barreiraRoundsRemaining?: number; // For Voto das Estrelas
  isToken?: boolean; // Token card linked to a unit (cannot be added to decks manually)
  isGeneratedCard?: boolean; // Card dynamically generated during combat/level-up (bypasses round-tier unlock lock)
  hasFirstAttacked?: boolean; // Tracking first attack for Elétrico class stun effect
  tenacidadeRoundsRemaining?: number; // For Cavaleiro Sem Nome: grants Tenacidade for 2 rounds to selected unit
  freezeRoundsRemaining?: number; // For Juci (3 rounds) and Bonetrus (1 round)
  stunRoundsRemaining?: number; // For Bimo, Kyn, Electric first attack (lasts until end of next round)
  finnBuffedPlayerHpOnce?: boolean; // For Finn, o Fada: first time attacking enemy player life grants +1 Max HP to allied player
  criticoRoundsRemaining?: number; // For Grão-mestre: grants CRÍTICO for 1 round
  tempPowerBuffAmount?: number; // For Fome insaciável (+10) and Grão-mestre (+15)
  tempPowerBuffRoundsRemaining?: number; // Duration in rounds for temporary Power buff
  permanentRessurreicao?: boolean; // For Concessão Divina: keeps RESSURREIÇÃO active across rounds until consumed
  eletrificadoRoundsRemaining?: number; // ELETRIFICADO duration (1 round: +25% electric damage taken)
  sanielJurisdicaoCounter?: number; // Saniel Nível 2: generates Fugaz Jurisdição de Saniel every 2 rounds
  krustHealCounter?: number; // Krust, o Feiticeiro: heals 1 player HP every 2 rounds
  ilioJustSummoned?: boolean; // Ilio: tracks summon round so +5 sleep buff applies at end of each slept round
  votoSilencioSavedPower?: number; // Voto do Silêncio: saves original power to restore after 2 rounds
  votoSilencioRoundsRemaining?: number; // Voto do Silêncio: remaining rounds of zeroed power (2 rounds)
  votoSilencioTeluricoBonusRemoved?: number;
  votoSilencioTeluricoHpRemoved?: number;
  votoSilencioTeluricoDefBonusRemoved?: number;
  votoSilencioTeluricoDefRemoved?: number;
  votoSilencioGeloBonusRemoved?: number;
  votoSilencioGeloDefRemoved?: number;
  votoSilencioNeutroHpBonusRemoved?: number;
  votoSilencioNeutroHpRemoved?: number;
  votoSilencioNeutroAtkBonusRemoved?: number;
  votoSilencioNeutroAtkRemoved?: number;
  votoSilencioNeutroDefBonusRemoved?: number;
  votoSilencioNeutroDefRemoved?: number;
  isRevealedFaleziel?: boolean; // Passiva secreta de Filho da Luz: Cavaleiro sem Nome revelado como Faleziel, o Arcanjo
  // Praga (-25% all attributes while active)
  pragaRoundsRemaining?: number;
  pragaReducedHp?: number;
  pragaReducedMaxHp?: number;
  pragaReducedAtk?: number;
  pragaReducedDef?: number;
  pragaReducedPower?: number;
  pragaReducedSapience?: number;
  // Barelio, o Carcereiro: unidade inimiga aprisionada nas correntes
  imprisonedUnit?: CardInstance;
  imprisonedOriginalOwner?: 'player' | 'opponent';
  // Corrosão: 1 de dano direto na Vida a cada turno das rodadas ativo e corta toda cura recebida
  corrosaoRoundsRemaining?: number;
  // Sangramento: 2 de dano por rodada ativo; ao causar dano 4 vezes (em sequência ou intercalando), transforma-se em Hemorragia (25% da Vida Máxima) e reseta o contador
  sangramentoRoundsRemaining?: number;
  sangramentoMarks?: number;
}

export interface PlayerState {
  id: 'player' | 'opponent';
  name: string;
  isAi: boolean;
  hp: number;
  maxHp: number;
  deck: CardInstance[];
  hand: CardInstance[];
  board: CardInstance[];
  graveyard: CardInstance[];
  hasDrawnThisRound: boolean;
  drawsCountThisRound: number; // Support multiple draws (Mago Uhr)
  extraDrawAvailableThisRound: boolean; // True if player has 2nd draw ready this round
  extraDrawNextRound: boolean; // Mago Uhr effect: +1 draw next round
  summonsThisRound: number;
  totalMatchSummons?: number; // Total summons in entire match for Craff level up
  totalCardsDrawnMatch?: number; // Total cards drawn in entire match for Karcelios (+1 power each)
  totalElectricUnitsSummonedMatch?: number; // Total electric units summoned on allied board in entire match for Xury (+1 power each)
  borRevivedOnce: boolean;
  zaelUsed: boolean;
  tenacidadeActive?: boolean; // Cavaleiro Sem Nome: 50% damage reduction to player HP
  maxBoardSlots?: number; // Gohr: expands board from 5 to 6 units
  atormentadorPieceSummonedThisRound?: boolean; // Limit: only 1 piece per round
  extraAttackRound?: boolean; // Zyk: allow attacking twice in attack round
  canAttackOnDefense?: boolean; // Zyk: allow attacking during defense round
  secondAttackDone?: boolean; // Track if 2nd attack already executed
  scheduledLetargia?: { targetIds: string[]; roundsRemaining: number }[]; // Letargia Lunar reincidence
  purpleExtraHpSlots?: number; // Extra permanent Max HP segments granted by Mipo (rendered in purple)
  pinkExtraHpSlots?: number; // Extra HP points granted by Corte das Fadas (rendered in pink)
  corteDasFadasUsed?: boolean; // Tracks if Corte das Fadas already saved the player once
}

export type GamePhase =
  | 'action'
  | 'declaring_attack'
  | 'declaring_defense'
  | 'combat_resolving'
  | 'game_over';

export interface CombatBlock {
  attackerId: string;
  defenderId?: string; // If undefined, direct attack on player!
}

export interface CombatResultDetail {
  attackerName: string;
  defenderName?: string;
  attackerCard?: CardInstance;
  defenderCard?: CardInstance;
  attackerDamageDealt: number;
  reboundDamageDealt: number;
  directPlayerDamage: number;
  defenderDied: boolean;
  attackerDied: boolean;
  attackerResurrected?: boolean;
  defenderResurrected?: boolean;
  attackerBorPhoenix?: boolean;
  defenderBorPhoenix?: boolean;
  bravuraPierce: boolean;
  description: string;
  torporTriggeredAttacker?: boolean;
  torporTriggeredDefender?: boolean;
  torporFriendlyTargetId?: string;
  criticoTriggered?: boolean;
  sombrioCritDamageDealt?: number;
  lifeStealHealed?: number;
  doubleAttackTriggered?: boolean;
  defenderBarreiraBroken?: boolean;
  attackerBarreiraBroken?: boolean;
  obliteratedTarget?: boolean;
  pcieBlocked?: boolean;
  pcieCardSide?: 'attacker' | 'defender';
  tynDodged?: boolean;
  tynCardSide?: 'attacker' | 'defender';
  inarielFireHit?: boolean;
  kynBimoBonk?: boolean;
  tiryuAttackerSelfHarm?: boolean;
  tiryuDefenderSelfHarm?: boolean;
  oSolDefenderObliterated?: boolean;
  oSolAttackerObliterated?: boolean;
  bonetrusLvl2CleaveTargetIds?: string[];
  bonetrusLvl2SoloAttack?: boolean;
  sanielLvl2Absorbed?: boolean;
  lucentTorporConvert?: boolean;
  mavieAtkKill?: boolean;
  mavieDefKill?: boolean;
  bleedAppliedToDefender?: boolean;
  bleedMarksAfterAttack?: number;
  hemorrhageTriggeredDefender?: boolean;
  hemorrhageDamageDealt?: number;
  titanoBleedHealTriggered?: 'attacker' | 'defender' | 'both';
}

export interface GameLogEntry {
  id: string;
  text: string;
  type: 'info' | 'attack' | 'spell' | 'defense' | 'round' | 'kill';
  timestamp: number;
}
