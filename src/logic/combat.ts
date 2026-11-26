import { CardInstance, CombatResultDetail, ConditionOriginKind, ElementType, TierType } from '../types/game';
import { setCardConditionSource, removeCardConditionSource, isCardFairy } from '../utils/conditionEffectsConfig';

// PATCH 1.3: Sistema de Vantagem Cruzada entre Classes foi TOTALMENTE REMOVIDO.
// As vantagens e desvantagens de cada classe são próprias e exclusivas dela,
// sem nenhum bônus ou penalidade relacional entre classes diferentes.
export function isStrongAgainst(_attackerElem?: ElementType, _defenderElem?: ElementType): boolean {
  return false;
}

export function isWeakAgainst(_attackerElem: ElementType, _defenderElem: ElementType): boolean {
  return false;
}

export function normalizeClassElement(el: ElementType): ElementType {
  return el === 'Terra' ? 'Telúrico' : el;
}

export function getCardClasses(card: Pick<CardInstance, 'element' | 'extraElements'>): ElementType[] {
  const result: ElementType[] = [];
  const seen = new Set<ElementType>();
  const addUnique = (el?: ElementType) => {
    if (!el || el === 'Nenhum') return;
    const norm = normalizeClassElement(el);
    if (!seen.has(norm)) {
      seen.add(norm);
      result.push(el === 'Terra' ? 'Telúrico' : el);
    }
  };
  addUnique(card.element);
  if (card.extraElements && card.extraElements.length > 0) {
    for (const extra of card.extraElements) {
      addUnique(extra);
    }
  }
  return result.length > 0 ? result : [card.element];
}

export function hasCardClass(
  card: Pick<CardInstance, 'element' | 'extraElements'>,
  targetClass: ElementType
): boolean {
  const normTarget = normalizeClassElement(targetClass);
  return getCardClasses(card).some((c) => normalizeClassElement(c) === normTarget);
}

export function canReceiveMulticlass(
  card: Pick<CardInstance, 'element' | 'extraElements' | 'type'>,
  newClass: ElementType
): boolean {
  if (card.type !== 'unit') return false;
  if (card.element === 'Cósmico') return false;
  if (hasCardClass(card, newClass)) return false;
  return true;
}

export function addClassToCard(card: CardInstance, newClass: ElementType): boolean {
  if (!canReceiveMulticlass(card, newClass)) return false;
  const norm = normalizeClassElement(newClass);
  card.extraElements = [...(card.extraElements || []), norm];
  syncClassPowerBonuses(card);
  return true;
}

export function isOSolLevel2Immortal(card?: CardInstance): boolean {
  return Boolean(
    card &&
      card.level === 2 &&
      (card.templateId === 'n_o_sol' || card.name.trim().toLowerCase().startsWith('o sol'))
  );
}

export function isALuaLevel2Supreme(card?: CardInstance): boolean {
  return Boolean(
    card &&
      card.level === 2 &&
      (card.templateId === 'g_a_lua' || card.name.trim().toLowerCase().startsWith('a lua'))
  );
}

export function getBonusPowerValue(card: CardInstance): number {
  if (isOSolLevel2Immortal(card) || isALuaLevel2Supreme(card)) return 999999;
  return card.votoSilencioSavedPower !== undefined ? card.votoSilencioSavedPower : card.power;
}

// Calculate effective Power of a card live from its current Power & conditions/buffs
export function getEffectivePower(card: CardInstance, votoSilencioActive: boolean = false): number {
  if (isOSolLevel2Immortal(card) || isALuaLevel2Supreme(card)) return 999999;
  const isImmune = card.conditions.has('imunidade') || (card.immunedRounds ?? 0) > 0;
  const isUnderVoto =
    !isImmune &&
    (votoSilencioActive ||
      card.votoSilencioSavedPower !== undefined ||
      (card.votoSilencioRoundsRemaining ?? 0) > 0);
  if (isUnderVoto) return 0;
  if (card.silencedRounds > 0) return 0;
  let p = card.power;
  if (card.doublePower) p *= 2;
  return p;
}

export function getIceBonusDefenseValue(card: CardInstance): number {
  return Math.max(card.icePeakDefense ?? 0, card.def, card.baseDef ?? 0);
}

/**
 * Adds defense points to a unit and accumulates them onto icePeakDefense so
 * Classe Gelo's 25% bonus reflects the cumulative peak defense even after
 * losing defense in combat (e.g., 30 -> lost 10 = 20 -> +5 = 25 current, 35 peak sum).
 */
export function addDefensePoints(
  card: CardInstance,
  amount: number,
  alsoIncreaseBaseDef: boolean = true
): void {
  if (amount <= 0) return;
  const prevPeak = getIceBonusDefenseValue(card);
  card.def += amount;
  if (alsoIncreaseBaseDef) {
    card.baseDef = (card.baseDef ?? 0) + amount;
    card.icePeakDefense = Math.max(prevPeak + amount, card.def, card.baseDef ?? 0);
  } else {
    card.icePeakDefense = Math.max(prevPeak, card.def);
  }
}

/**
 * Live-recalculates Gelo (+50% of current Power as Defense) and Telúrico (+50% of current Power as HP/MaxHP and +50% as Defense):
 * - Works independently for multiclass units (e.g., Gelo + Telúrico).
 * - Adds extra Defense/HP when Power increases (permanently or momentarily).
 * - Subtracts momentary Defense/HP when a temporary Power buff expires OR when Voto do Silêncio zeroes Power.
 * - Restores the exact Defense/HP bonuses when Voto do Silêncio expires.
 */
export function syncClassPowerBonuses(card: CardInstance): void {
  if (
    card.type !== 'unit' ||
    card.silencedRounds > 0 ||
    isOSolLevel2Immortal(card) ||
    isALuaLevel2Supreme(card)
  ) {
    return;
  }

  const isMaskedByVoto =
    card.votoSilencioSavedPower !== undefined || (card.votoSilencioRoundsRemaining ?? 0) > 0;
  const currentPwr = isMaskedByVoto ? 0 : Math.max(0, card.power);

  if (hasCardClass(card, 'Gelo')) {
    const expectedDefBonus = Math.floor(currentPwr * 0.5);
    const prevGranted =
      card.icePowerDefGranted ??
      (card.element === 'Gelo'
        ? Math.min(expectedDefBonus, Math.floor((card.basePower ?? card.power) * 0.5))
        : 0);
    const deltaDef = expectedDefBonus - prevGranted;
    if (deltaDef > 0) {
      if (
        !isMaskedByVoto &&
        (card.votoSilencioGeloDefRemoved !== undefined ||
          card.votoSilencioGeloBonusRemoved !== undefined)
      ) {
        const savedDef = card.votoSilencioGeloDefRemoved ?? 0;
        const savedBonus = card.votoSilencioGeloBonusRemoved ?? 0;
        const extraNewDef = Math.max(0, deltaDef - savedBonus);
        const defRestore = Math.min(deltaDef, savedDef + extraNewDef);
        const prevPeak = getIceBonusDefenseValue(card);
        card.def += defRestore;
        card.baseDef = (card.baseDef ?? 0) + deltaDef;
        card.icePeakDefense = Math.max(prevPeak + deltaDef, card.def, card.baseDef ?? 0);
        card.votoSilencioGeloDefRemoved = undefined;
        card.votoSilencioGeloBonusRemoved = undefined;
      } else {
        addDefensePoints(card, deltaDef, true);
      }
    } else if (deltaDef < 0) {
      const removeDef = Math.abs(deltaDef);
      const prevDef = card.def;
      card.def = Math.max(0, card.def - removeDef);
      card.baseDef = Math.max(0, (card.baseDef ?? 0) - removeDef);
      if (card.icePeakDefense !== undefined) {
        card.icePeakDefense = Math.max(card.def, card.baseDef, card.icePeakDefense - removeDef);
      }
      if (isMaskedByVoto) {
        card.votoSilencioGeloBonusRemoved =
          (card.votoSilencioGeloBonusRemoved ?? 0) + removeDef;
        card.votoSilencioGeloDefRemoved =
          (card.votoSilencioGeloDefRemoved ?? 0) + Math.max(0, prevDef - card.def);
      }
    }
    card.icePowerDefGranted = expectedDefBonus;
  }

  if (hasCardClass(card, 'Telúrico') || hasCardClass(card, 'Terra')) {
    const expectedHpBonus = Math.floor(currentPwr * 0.5);
    const prevHpGranted =
      card.teluricoPowerHpGranted ??
      (card.element === 'Telúrico' || card.element === 'Terra'
        ? Math.min(expectedHpBonus, Math.floor((card.basePower ?? card.power) * 0.5))
        : 0);
    const deltaHp = expectedHpBonus - prevHpGranted;
    if (deltaHp > 0) {
      if (
        !isMaskedByVoto &&
        (card.votoSilencioTeluricoHpRemoved !== undefined ||
          card.votoSilencioTeluricoBonusRemoved !== undefined)
      ) {
        const savedHp = card.votoSilencioTeluricoHpRemoved ?? 0;
        const savedBonus = card.votoSilencioTeluricoBonusRemoved ?? 0;
        const extraNewPwr = Math.max(0, deltaHp - savedBonus);
        const hpRestore = Math.min(deltaHp, savedHp + extraNewPwr);
        card.maxHp += deltaHp;
        card.hp = Math.min(card.maxHp, card.hp + hpRestore);
        card.votoSilencioTeluricoHpRemoved = undefined;
        card.votoSilencioTeluricoBonusRemoved = undefined;
      } else {
        card.hp += deltaHp;
        card.maxHp += deltaHp;
      }
    } else if (deltaHp < 0) {
      const removeHp = Math.abs(deltaHp);
      const prevHp = card.hp;
      card.maxHp = Math.max(1, card.maxHp - removeHp);
      card.hp = Math.min(card.maxHp, card.hp);
      if (isMaskedByVoto) {
        card.votoSilencioTeluricoBonusRemoved =
          (card.votoSilencioTeluricoBonusRemoved ?? 0) + removeHp;
        card.votoSilencioTeluricoHpRemoved =
          (card.votoSilencioTeluricoHpRemoved ?? 0) + Math.max(0, prevHp - card.hp);
      }
    }
    card.teluricoPowerHpGranted = expectedHpBonus;

    // Patch 1.4: Telúrico também recebe +50% Poder como Defesa
    const expectedDefBonus = Math.floor(currentPwr * 0.5);
    const prevDefGranted =
      card.teluricoPowerDefGranted ??
      (card.element === 'Telúrico' || card.element === 'Terra'
        ? Math.min(expectedDefBonus, Math.floor((card.basePower ?? card.power) * 0.5))
        : 0);
    const deltaDef = expectedDefBonus - prevDefGranted;
    if (deltaDef > 0) {
      if (
        !isMaskedByVoto &&
        (card.votoSilencioTeluricoDefRemoved !== undefined ||
          card.votoSilencioTeluricoDefBonusRemoved !== undefined)
      ) {
        const savedDef = card.votoSilencioTeluricoDefRemoved ?? 0;
        const savedBonus = card.votoSilencioTeluricoDefBonusRemoved ?? 0;
        const extraNewDef = Math.max(0, deltaDef - savedBonus);
        const defRestore = Math.min(deltaDef, savedDef + extraNewDef);
        const prevPeak = getIceBonusDefenseValue(card);
        card.def += defRestore;
        card.baseDef = (card.baseDef ?? 0) + deltaDef;
        card.icePeakDefense = Math.max(prevPeak + deltaDef, card.def, card.baseDef ?? 0);
        card.votoSilencioTeluricoDefRemoved = undefined;
        card.votoSilencioTeluricoDefBonusRemoved = undefined;
      } else {
        addDefensePoints(card, deltaDef, true);
      }
    } else if (deltaDef < 0) {
      const removeDef = Math.abs(deltaDef);
      const prevDef = card.def;
      card.def = Math.max(0, card.def - removeDef);
      card.baseDef = Math.max(0, (card.baseDef ?? 0) - removeDef);
      if (card.icePeakDefense !== undefined) {
        card.icePeakDefense = Math.max(card.def, card.baseDef, card.icePeakDefense - removeDef);
      }
      if (isMaskedByVoto) {
        card.votoSilencioTeluricoDefBonusRemoved =
          (card.votoSilencioTeluricoDefBonusRemoved ?? 0) + removeDef;
        card.votoSilencioTeluricoDefRemoved =
          (card.votoSilencioTeluricoDefRemoved ?? 0) + Math.max(0, prevDef - card.def);
      }
    }
    card.teluricoPowerDefGranted = expectedDefBonus;
  }

  if (hasCardClass(card, 'Neutro')) {
    const expectedBonus = Math.floor(currentPwr);

    // 1. Vida (+100% Poder)
    const prevHpGranted =
      card.neutroPowerHpGranted ??
      (card.element === 'Neutro'
        ? Math.min(expectedBonus, Math.floor(card.basePower ?? card.power))
        : 0);
    const deltaHp = expectedBonus - prevHpGranted;
    if (deltaHp > 0) {
      if (
        !isMaskedByVoto &&
        (card.votoSilencioNeutroHpRemoved !== undefined ||
          card.votoSilencioNeutroHpBonusRemoved !== undefined)
      ) {
        const savedHp = card.votoSilencioNeutroHpRemoved ?? 0;
        const savedBonus = card.votoSilencioNeutroHpBonusRemoved ?? 0;
        const extraNewHp = Math.max(0, deltaHp - savedBonus);
        const hpRestore = Math.min(deltaHp, savedHp + extraNewHp);
        card.maxHp += deltaHp;
        card.hp = Math.min(card.maxHp, card.hp + hpRestore);
        card.votoSilencioNeutroHpRemoved = undefined;
        card.votoSilencioNeutroHpBonusRemoved = undefined;
      } else {
        card.hp += deltaHp;
        card.maxHp += deltaHp;
      }
    } else if (deltaHp < 0) {
      const removeHp = Math.abs(deltaHp);
      const prevHp = card.hp;
      card.maxHp = Math.max(1, card.maxHp - removeHp);
      card.hp = Math.min(card.maxHp, card.hp);
      if (isMaskedByVoto) {
        card.votoSilencioNeutroHpBonusRemoved =
          (card.votoSilencioNeutroHpBonusRemoved ?? 0) + removeHp;
        card.votoSilencioNeutroHpRemoved =
          (card.votoSilencioNeutroHpRemoved ?? 0) + Math.max(0, prevHp - card.hp);
      }
    }
    card.neutroPowerHpGranted = expectedBonus;

    // 2. Ataque (+100% Poder)
    const prevAtkGranted =
      card.neutroPowerAtkGranted ??
      (card.element === 'Neutro'
        ? Math.min(expectedBonus, Math.floor(card.basePower ?? card.power))
        : 0);
    const deltaAtk = expectedBonus - prevAtkGranted;
    if (deltaAtk > 0) {
      if (
        !isMaskedByVoto &&
        (card.votoSilencioNeutroAtkRemoved !== undefined ||
          card.votoSilencioNeutroAtkBonusRemoved !== undefined)
      ) {
        const savedAtk = card.votoSilencioNeutroAtkRemoved ?? 0;
        const savedBonus = card.votoSilencioNeutroAtkBonusRemoved ?? 0;
        const extraNewAtk = Math.max(0, deltaAtk - savedBonus);
        const atkRestore = Math.min(deltaAtk, savedAtk + extraNewAtk);
        card.atk += atkRestore;
        card.baseAtk = (card.baseAtk ?? 0) + deltaAtk;
        card.votoSilencioNeutroAtkRemoved = undefined;
        card.votoSilencioNeutroAtkBonusRemoved = undefined;
      } else {
        card.atk += deltaAtk;
        card.baseAtk = (card.baseAtk ?? 0) + deltaAtk;
      }
    } else if (deltaAtk < 0) {
      const removeAtk = Math.abs(deltaAtk);
      const prevAtk = card.atk;
      card.atk = Math.max(0, card.atk - removeAtk);
      card.baseAtk = Math.max(0, (card.baseAtk ?? 0) - removeAtk);
      if (isMaskedByVoto) {
        card.votoSilencioNeutroAtkBonusRemoved =
          (card.votoSilencioNeutroAtkBonusRemoved ?? 0) + removeAtk;
        card.votoSilencioNeutroAtkRemoved =
          (card.votoSilencioNeutroAtkRemoved ?? 0) + Math.max(0, prevAtk - card.atk);
      }
    }
    card.neutroPowerAtkGranted = expectedBonus;

    // 3. Defesa (+100% Poder)
    const prevDefGranted =
      card.neutroPowerDefGranted ??
      (card.element === 'Neutro'
        ? Math.min(expectedBonus, Math.floor(card.basePower ?? card.power))
        : 0);
    const deltaDef = expectedBonus - prevDefGranted;
    if (deltaDef > 0) {
      if (
        !isMaskedByVoto &&
        (card.votoSilencioNeutroDefRemoved !== undefined ||
          card.votoSilencioNeutroDefBonusRemoved !== undefined)
      ) {
        const savedDef = card.votoSilencioNeutroDefRemoved ?? 0;
        const savedBonus = card.votoSilencioNeutroDefBonusRemoved ?? 0;
        const extraNewDef = Math.max(0, deltaDef - savedBonus);
        const defRestore = Math.min(deltaDef, savedDef + extraNewDef);
        const prevPeak = getIceBonusDefenseValue(card);
        card.def += defRestore;
        card.baseDef = (card.baseDef ?? 0) + deltaDef;
        card.icePeakDefense = Math.max(prevPeak + deltaDef, card.def, card.baseDef ?? 0);
        card.votoSilencioNeutroDefRemoved = undefined;
        card.votoSilencioNeutroDefBonusRemoved = undefined;
      } else {
        addDefensePoints(card, deltaDef, true);
      }
    } else if (deltaDef < 0) {
      const removeDef = Math.abs(deltaDef);
      const prevDef = card.def;
      card.def = Math.max(0, card.def - removeDef);
      card.baseDef = Math.max(0, (card.baseDef ?? 0) - removeDef);
      if (card.icePeakDefense !== undefined) {
        card.icePeakDefense = Math.max(card.def, card.baseDef, card.icePeakDefense - removeDef);
      }
      if (isMaskedByVoto) {
        card.votoSilencioNeutroDefBonusRemoved =
          (card.votoSilencioNeutroDefBonusRemoved ?? 0) + removeDef;
        card.votoSilencioNeutroDefRemoved =
          (card.votoSilencioNeutroDefRemoved ?? 0) + Math.max(0, prevDef - card.def);
      }
    }
    card.neutroPowerDefGranted = expectedBonus;
  }
}

/**
 * Adds Power points to a card and live-readjusts Gelo / Telúrico class bonuses
 * according to the current Power value.
 */
export function addPowerPoints(
  card: CardInstance,
  amount: number,
  alsoIncreaseBasePower: boolean = true
): number {
  if (amount <= 0) return card.power;
  if (isOSolLevel2Immortal(card) || isALuaLevel2Supreme(card)) {
    card.power = 999999;
    card.basePower = 999999;
    card.peakPower = 999999;
    return 999999;
  }

  const isUnderVoto =
    card.votoSilencioSavedPower !== undefined || (card.votoSilencioRoundsRemaining ?? 0) > 0;

  if (isUnderVoto) {
    card.votoSilencioSavedPower = (card.votoSilencioSavedPower ?? card.basePower ?? 0) + amount;
    if (alsoIncreaseBasePower) {
      card.basePower = (card.basePower ?? 0) + amount;
    }
    card.power = 0;
    card.peakPower = card.votoSilencioSavedPower;
  } else {
    card.power += amount;
    if (alsoIncreaseBasePower) {
      card.basePower = (card.basePower ?? 0) + amount;
    }
    card.peakPower = card.power;
  }

  syncClassPowerBonuses(card);
  return card.power;
}

export function withAddedPowerPoints(
  card: CardInstance,
  amount: number,
  alsoIncreaseBasePower: boolean = true
): CardInstance {
  const clone: CardInstance = {
    ...card,
    extraElements: card.extraElements ? [...card.extraElements] : undefined,
    conditions: new Set(card.conditions),
    conditionSources: card.conditionSources ? { ...card.conditionSources } : undefined,
  };
  addPowerPoints(clone, amount, alsoIncreaseBasePower);
  return clone;
}

export function syncScaledPower(card: CardInstance, calculatedPower: number): CardInstance {
  const clone: CardInstance = {
    ...card,
    extraElements: card.extraElements ? [...card.extraElements] : undefined,
    conditions: new Set(card.conditions),
    conditionSources: card.conditionSources ? { ...card.conditionSources } : undefined,
  };
  if (clone.votoSilencioSavedPower !== undefined || (clone.votoSilencioRoundsRemaining ?? 0) > 0) {
    clone.votoSilencioSavedPower = calculatedPower;
    clone.power = 0;
    clone.peakPower = calculatedPower;
  } else {
    clone.power = calculatedPower;
    clone.peakPower = calculatedPower;
  }
  syncClassPowerBonuses(clone);
  return clone;
}

// NOVO Cálculo do Dano Final (Patch 1.4 - Multiclasse Aditiva & Classe Divino):
// Multiplicadores individuais de classe são somados no final sobre o Dano Base:
// - Mágico: Poder + Ataque recebido (inicia com 0 de Ataque)
// - Cósmico: Poder
// - Outros: Ataque + soma dos bônus das classes ativas:
//   - Fogo: +100% Poder
//   - Divino: +80% Poder
//   - Água: +50% Poder
//   - Elétrico: +50% Poder
//   - Gelo: +25% Defesa Pico Cumulativa
export function calculateCombatDamage(
  attacker: CardInstance,
  _targetElem?: ElementType,
  _targetIsNeutral: boolean = false,
  votoSilencioActive: boolean = false,
  attackerBoard?: CardInstance[],
  defender?: CardInstance
): number {
  const pwr = getEffectivePower(attacker, votoSilencioActive);
  const elem = attacker.element;

  let damage = 0;
  if (elem === 'Cósmico') {
    damage = pwr;
  } else {
    damage = attacker.atk;
    const classes = getCardClasses(attacker);
    for (const cls of classes) {
      if (cls === 'Fogo' || cls === 'Mágico') {
        damage += pwr;
      } else if (cls === 'Divino') {
        damage += Math.floor(pwr * 0.8);
      } else if (cls === 'Água' || cls === 'Elétrico') {
        damage += Math.floor(pwr / 2);
      } else if (cls === 'Gelo') {
        const iceBonusDef = getIceBonusDefenseValue(attacker);
        const extraIceDmg = attacker.silencedRounds > 0 ? 0 : Math.floor(iceBonusDef * 0.25);
        damage += extraIceDmg;
      }
    }
  }

  // Mara effect: if powerAlwaysActive is set on a unit that doesn't already add 100% power
  if (
    attacker.powerAlwaysActive &&
    !hasCardClass(attacker, 'Fogo') &&
    elem !== 'Mágico' &&
    elem !== 'Cósmico'
  ) {
    damage += pwr;
  }

  // Passiva de Milton: +25% de dano para unidades Telúricas aliadas se Milton estiver na mesa aliada
  if (
    (hasCardClass(attacker, 'Telúrico') || hasCardClass(attacker, 'Terra')) &&
    attackerBoard &&
    attacker.silencedRounds === 0
  ) {
    const hasMilton = attackerBoard.some(
      (c) => (c.templateId === 'n_milton' || c.name.toLowerCase().includes('milton')) && c.hp > 0 && c.silencedRounds === 0
    );
    if (hasMilton) {
      damage = Math.round(damage * 1.25);
    }
  }

  // Inariel, o Arcanjo: Atacar inimigos já com Queimadura ativa aumenta o dano causado por Inariel em 25%
  if (
    (attacker.templateId === 'm_inariel' || attacker.name.toLowerCase().includes('inariel')) &&
    attacker.silencedRounds === 0 &&
    defender &&
    (defender.conditions.has('queimadura') || (defender.burnTurnsRemaining != null && defender.burnTurnsRemaining > 0))
  ) {
    damage = Math.round(damage * 1.25);
  }

  // ELETRIFICADO: Unidades eletrificadas recebem +20% de dano ELÉTRICO
  if (
    hasCardClass(attacker, 'Elétrico') &&
    defender &&
    (defender.conditions.has('eletrificado') || (defender.eletrificadoRoundsRemaining != null && defender.eletrificadoRoundsRemaining > 0))
  ) {
    damage = Math.round(damage * 1.20);
  }

  // Lucent (DIVINO): Causa o dobro de dano a unidades afetadas por Torpor
  const defenderHasTorpor = Boolean(
    defender &&
      (defender.conditions.has('entorpecer') ||
        defender.conditions.has('torpor') ||
        (defender.entorpecerRoundsRemaining != null && defender.entorpecerRoundsRemaining > 0))
  );
  if (
    (attacker.templateId === 'g_lucent' || attacker.name.trim().toLowerCase() === 'lucent') &&
    attacker.silencedRounds === 0 &&
    defenderHasTorpor
  ) {
    damage = damage * 2;
  }

  return Math.max(0, damage);
}

// Cálculo da Resistência Total da Carta (Patch 1.4 - Multiclasse Aditiva):
export function calculateCardCombatResistance(card: CardInstance, votoSilencioActive: boolean = false): number {
  if (card.element === 'Cósmico') {
    return card.sapience ?? card.hp;
  }
  const pwr = getEffectivePower(card, votoSilencioActive);
  let res = card.hp + card.def; // Telúrico (+50% Vida / +50% Def) e Gelo (+50% Def) já estão sincronizados em hp/def
  if (hasCardClass(card, 'Água')) {
    res += Math.floor(pwr / 2);
  }
  return res;
}

// Calculate effective Defense of a card
export function getEffectiveDefense(card: CardInstance, votoSilencioActive: boolean = false): number {
  let def = card.def;
  const pwr = getEffectivePower(card, votoSilencioActive);
  if (hasCardClass(card, 'Água')) {
    def += Math.floor(pwr / 2);
  }
  if (card.powerAlwaysActive && !hasCardClass(card, 'Água')) {
    def += pwr;
  }
  return Math.max(0, def);
}

// Backwards-compatible getEffectiveAttack wrapper
export function getEffectiveAttack(
  attacker: CardInstance,
  targetElem?: ElementType,
  _targetIsMagic?: boolean,
  targetIsNeutral?: boolean,
  votoSilencioActive: boolean = false
): number {
  return calculateCombatDamage(attacker, targetElem, targetIsNeutral, votoSilencioActive);
}

// Helper to identify if a card instance is an Archangel
export function isArchangelCard(c: CardInstance): boolean {
  return (
    Boolean(c.isArchangel) ||
    Boolean(c.isRevealedFaleziel) ||
    c.templateId === 'n_zael' ||
    c.templateId === 'm_inariel' ||
    c.templateId === 'm_umael' ||
    c.templateId === 'n_seniel' ||
    c.templateId === 'n_saniel' ||
    c.templateId === 'n_polus' ||
    c.templateId === 'n_torvyx' ||
    c.templateId === 'm_fanx' ||
    c.templateId === 'g_kaliel' ||
    c.templateId === 'm_faleziel' ||
    c.name.toLowerCase().includes('zael') ||
    c.name.toLowerCase().includes('inariel') ||
    c.name.toLowerCase().includes('umael') ||
    c.name.toLowerCase().includes('seniel') ||
    c.name.toLowerCase().includes('saniel') ||
    c.name.toLowerCase().includes('polus') ||
    c.name.toLowerCase().includes('pólus') ||
    c.name.toLowerCase().includes('torvyx') ||
    c.name.toLowerCase().includes('fanx') ||
    c.name.toLowerCase().includes('fanael') ||
    c.name.toLowerCase().includes('kaliel') ||
    c.name.toLowerCase().includes('faleziel')
  );
}

// Helper to identify if a card instance is a Fairy (Corte das Fadas)
export function isFairyCard(c: CardInstance): boolean {
  return isCardFairy(c);
}

// Check if Corte das Fadas passive is active on a board (3+ living unsilenced Fairies)
export function hasCorteDasFadas(board?: CardInstance[]): boolean {
  if (!board || board.length < 3) return false;
  const activeFairies = board.filter(
    (c) => isFairyCard(c) && c.hp > 0 && (c.silencedRounds ?? 0) === 0
  );
  return activeFairies.length >= 3;
}

// Check if a unit is currently afflicted by Corrosão (cuts all healing received and deals 1 direct HP damage per turn)
export function hasCorrosao(c: CardInstance): boolean {
  return Boolean(c.conditions.has('corrosao') || (c.corrosaoRoundsRemaining && c.corrosaoRoundsRemaining > 0));
}

// Calculate Sombrio class bonus damage (50% of current Power as Critical damage directly to HP)
export function getSombrioCritBonusDamage(
  card: CardInstance,
  votoSilencioActive: boolean = false
): number {
  if (card.silencedRounds > 0 || !hasCardClass(card, 'Sombrio')) return 0;
  const pwr = getEffectivePower(card, votoSilencioActive);
  return Math.floor(pwr * 0.5);
}

/**
 * Applies PRAGA (-25% to all attributes: HP/MaxHP, Atk, Def, Power) to a unit for `rounds` rounds.
 * Respects Imunidade and immortal Tier 6 units. Does not stack multiple 25% reductions if already active.
 */
export function applyPragaToUnit(
  card: CardInstance,
  rounds: number,
  sourceName: string,
  originKind: ConditionOriginKind = 'unidade_inimiga'
): boolean {
  if (card.hp <= 0) return false;
  if (
    card.conditions.has('imunidade') ||
    (card.immunedRounds ?? 0) > 0 ||
    isOSolLevel2Immortal(card) ||
    isALuaLevel2Supreme(card)
  ) {
    return false;
  }

  // If already afflicted by Praga, refresh duration without double-reducing attributes
  if (card.conditions.has('praga') || (card.pragaRoundsRemaining ?? 0) > 0) {
    card.conditions.add('praga');
    card.pragaRoundsRemaining = Math.max(card.pragaRoundsRemaining ?? 0, rounds);
    setCardConditionSource(card, 'praga', originKind, sourceName);
    return true;
  }

  const redMaxHp = Math.floor(card.maxHp * 0.25);
  const redHp = Math.floor(card.hp * 0.25);
  const redAtk = Math.floor(card.atk * 0.25);
  const redDef = Math.floor(card.def * 0.25);
  const redPwr = Math.floor(card.power * 0.25);

  card.pragaReducedMaxHp = redMaxHp;
  card.pragaReducedHp = redHp;
  card.pragaReducedAtk = redAtk;
  card.pragaReducedDef = redDef;
  card.pragaReducedPower = redPwr;

  card.maxHp = Math.max(1, card.maxHp - redMaxHp);
  card.hp = Math.max(1, Math.min(card.maxHp, card.hp - redHp));
  if (card.element === 'Cósmico' || card.sapience != null) {
    card.sapience = card.hp;
    if (card.baseSapience != null) {
      card.pragaReducedSapience = Math.floor(card.baseSapience * 0.25);
      card.baseSapience = Math.max(1, card.baseSapience - card.pragaReducedSapience);
    }
  }
  card.atk = Math.max(0, card.atk - redAtk);
  card.def = Math.max(0, card.def - redDef);
  card.power = Math.max(0, card.power - redPwr);

  card.conditions.add('praga');
  card.pragaRoundsRemaining = rounds;
  setCardConditionSource(card, 'praga', originKind, sourceName);
  return true;
}

/**
 * Removes PRAGA from a unit and restores its 25% reduced attributes.
 */
export function removePragaFromUnit(card: CardInstance): void {
  if (!card.conditions.has('praga') && !(card.pragaRoundsRemaining && card.pragaRoundsRemaining > 0)) {
    return;
  }
  const addMaxHp = card.pragaReducedMaxHp ?? 0;
  const addHp = card.pragaReducedHp ?? 0;
  const addAtk = card.pragaReducedAtk ?? 0;
  const addDef = card.pragaReducedDef ?? 0;
  const addPwr = card.pragaReducedPower ?? 0;

  card.maxHp += addMaxHp;
  if (card.hp > 0) {
    card.hp = Math.min(card.maxHp, card.hp + addHp);
  }
  if (card.element === 'Cósmico' || card.sapience != null) {
    card.sapience = card.hp;
    if (card.baseSapience != null) {
      card.baseSapience += card.pragaReducedSapience ?? addMaxHp;
    }
  }
  card.atk += addAtk;
  card.def += addDef;
  card.power += addPwr;

  card.pragaReducedMaxHp = undefined;
  card.pragaReducedHp = undefined;
  card.pragaReducedAtk = undefined;
  card.pragaReducedDef = undefined;
  card.pragaReducedPower = undefined;
  card.pragaReducedSapience = undefined;
  card.pragaRoundsRemaining = 0;
  card.conditions.delete('praga');
  removeCardConditionSource(card, 'praga');
}

// Check if a card has active Aliança Angiris (+50% damage dealt, -50% damage received)
// Activated when at least two archangels (Zael, Inariel, Umael, Saniel, Polus, Torvyx, Fanx, Kaliel, Faleziel, Atlaziel) are in field simultaneously and card is not silenced
export function hasAliancaAngiris(card: CardInstance, board?: CardInstance[]): boolean {
  if (!board || card.silencedRounds > 0) return false;
  if (!isArchangelCard(card)) return false;

  const hasAnotherArchangel = board.some(
    (c) => c.instanceId !== card.instanceId && isArchangelCard(c) && c.hp > 0 && c.silencedRounds === 0
  );
  return hasAnotherArchangel;
}

// Check additional Aliança Angiris passive: "Vitória do Conselho Celestial"
// Checked at the end of a round: if at least 1 Archangel of each Tier (1, 2, 3, 4, 5) is on the board simultaneously, heals the allied player to full HP and triggers Council victory
export function hasCelestialCouncilVictory(board?: CardInstance[]): boolean {
  if (!board || board.length < 5) return false;
  const activeArchangels = board.filter(
    (c) => isArchangelCard(c) && c.hp > 0 && (c.silencedRounds ?? 0) === 0
  );
  if (activeArchangels.length < 5) return false;

  const tiersPresent = new Set<number>(activeArchangels.map((c) => Number(c.tier)));
  return (
    tiersPresent.has(1) &&
    tiersPresent.has(2) &&
    tiersPresent.has(3) &&
    tiersPresent.has(4) &&
    tiersPresent.has(5)
  );
}

// Execute single combat interaction between Attacker and optional Defender
export function resolveCombatPair(
  attacker: CardInstance,
  defender: CardInstance | undefined,
  votoSilencioActive: boolean,
  attackerBoard?: CardInstance[],
  defenderBoard?: CardInstance[],
  defenderTenacidadeActive: boolean = false,
  onAttackerHealedPlayer?: (amount: number) => void,
  isAttackerSolo: boolean = false,
  hasOSolLvl2Attacking: boolean = false,
  hasOSolLvl2Defending: boolean = false
): CombatResultDetail {
  const attackerAngiris = hasAliancaAngiris(attacker, attackerBoard);
  const defenderAngiris = defender ? hasAliancaAngiris(defender, defenderBoard) : false;

  const isHelioLvl2 =
    attacker.level === 2 &&
    (attacker.templateId === 'n_helio' || attacker.name.toLowerCase().includes('helio') || attacker.name.toLowerCase().includes('hélio')) &&
    attacker.silencedRounds === 0;

  const isBonetrusLvl2 =
    (attacker.templateId === 'm_bonetrus' || attacker.name.toLowerCase().includes('bonetrus')) &&
    attacker.level === 2 &&
    attacker.silencedRounds === 0;

  // Case 1: DIRECT ATTACK ON PLAYER (unblocked)
  if (!defender) {
    // Regra: Cada ataque direto retira 1 de Vida. Unidades com Ataque-Duplo causam 2 de dano.
    // Lilia, a Fada causa o DOBRO de dano à vida do jogador (2 normal, ou 4 com Ataque-Duplo ativo).
    let directDamage = 1;
    let hitCount = 1;

    const isLilia =
      (attacker.templateId === 'g_lilia' || attacker.name.toLowerCase().includes('lilia')) &&
      attacker.silencedRounds === 0;

    const hasDoubleAttack =
      attacker.conditions.has('ataque_duplo') ||
      Boolean(attacker.hasDoubleAttack) ||
      attacker.templateId === 'm_moira' ||
      attacker.templateId === 'm_titano' ||
      attacker.templateId === 'g_sebastian';

    const isDoubleAttackActive = hasDoubleAttack && attacker.silencedRounds === 0;

    if (isDoubleAttackActive) {
      directDamage = 2;
      hitCount = 2;
    }

    if (isLilia) {
      directDamage = directDamage * 2;
      hitCount = hitCount * 2;
    }

    if (isHelioLvl2 && isAttackerSolo) {
      directDamage = directDamage * 2;
    }

    // Tenacidade (Cavaleiro Sem Nome): Reduz dano recebido à vida do jogador em 35%
    if (defenderTenacidadeActive) {
      directDamage = Math.max(1, Math.round(directDamage * 0.65));
    }

    // Roubo de Vida ao atacar diretamente a vida do jogador: cura proporcional aos golpes desferidos!
    const hasLifeSteal =
      attacker.conditions.has('roubo_de_vida') ||
      attacker.hasLifeSteal ||
      (attacker.templateId === 'g_daniel' && attacker.silencedRounds === 0) ||
      (attacker.templateId === 'g_barao_well' && attacker.level === 2 && attacker.silencedRounds === 0);

    if (hasLifeSteal && onAttackerHealedPlayer) {
      onAttackerHealedPlayer(hitCount);
    }

    // Tiryu: Auto-flagelar (Sempre que ataca ou defende, perde 5 de Sapiência)
    let tiryuAttackerSelfHarm = false;
    if (attacker.templateId === 'm_tiryu' && attacker.silencedRounds === 0) {
      attacker.hp = Math.max(0, attacker.hp - 5);
      attacker.sapience = attacker.hp;
      tiryuAttackerSelfHarm = true;
    }

    // Bonetrus Nível 2 Solo Attack Splash Damage mesmo sem bloqueador direto
    const unblockedBonetrusCleavedIds: string[] = [];
    let unblockedSplashLog = '';
    if (isBonetrusLvl2 && isAttackerSolo && defenderBoard && defenderBoard.length > 0) {
      let baseCombatDmg = calculateCombatDamage(attacker, undefined, false, votoSilencioActive, attackerBoard);
      if (attackerAngiris) baseCombatDmg = Math.round(baseCombatDmg * 1.5);
      const splashDamage = Math.round(baseCombatDmg * 0.5);
      if (splashDamage > 0) {
        const hitLogNames: string[] = [];
        for (const otherEnemy of defenderBoard) {
          if (otherEnemy.hp <= 0) continue;
          const isOtherCeliaImmune =
            (otherEnemy.templateId === 'm_celia' ||
              otherEnemy.name.toLowerCase().includes('celia') ||
              otherEnemy.name.toLowerCase().includes('célia')) &&
            otherEnemy.silencedRounds === 0;
          if (
            otherEnemy.conditions.has('imunidade') ||
            isOtherCeliaImmune ||
            isOSolLevel2Immortal(otherEnemy) ||
            isALuaLevel2Supreme(otherEnemy)
          ) {
            continue;
          }
          const otherDef = getEffectiveDefense(otherEnemy, votoSilencioActive);
          const otherDefAbsorbed = Math.min(otherDef, splashDamage);
          otherEnemy.def = Math.max(0, otherEnemy.def - otherDefAbsorbed);
          const otherHpDamage = splashDamage - otherDefAbsorbed;
          otherEnemy.hp = Math.max(0, otherEnemy.hp - otherHpDamage);
          if (otherEnemy.element === 'Cósmico' || otherEnemy.sapience != null) {
            otherEnemy.sapience = otherEnemy.hp;
          }
          unblockedBonetrusCleavedIds.push(otherEnemy.instanceId);
          hitLogNames.push(`${otherEnemy.name} (-${splashDamage})`);
        }
        if (hitLogNames.length > 0) {
          unblockedSplashLog = ` [❄️🌪️ NEVASCA DEVASTADORA: Bonetrus atacou sozinho e varreu o campo com 50% de dano em: ${hitLogNames.join(', ')}!]`;
        }
      }
    }

    let desc = `${attacker.name} atacou diretamente o jogador causando ${directDamage} ponto(s) de dano à vida!`;
    if (isLilia && isDoubleAttackActive) {
      desc += ' [Lilia, a Fada + Ataque-Duplo: Dobro de 2 Golpes = 4 de dano à Vida]';
    } else if (isLilia) {
      desc += ' [Lilia, a Fada: Dobro de dano direto = 2 de dano à Vida]';
    } else if (isDoubleAttackActive) {
      desc += ' [Ataque-Duplo: 2 Golpes Diretos = 2 de dano à Vida]';
    }
    if (defenderTenacidadeActive) desc += ' [🛡️ Tenacidade: -35% dano à vida]';
    if (hasLifeSteal) desc += ` [🩸 Roubo de Vida: Líder recuperou ${hitCount} de Vida]`;
    if (tiryuAttackerSelfHarm) desc += ' [🩸 Auto-flagelar: Tiryu perdeu 5 de Sapiência ao atacar]';
    if (unblockedSplashLog) desc += unblockedSplashLog;

    return {
      attackerName: attacker.name,
      attackerCard: { ...attacker },
      defenderName: undefined,
      defenderCard: undefined,
      attackerDamageDealt: attacker.atk,
      reboundDamageDealt: 0,
      directPlayerDamage: directDamage,
      defenderDied: false,
      attackerDied: attacker.hp <= 0,
      bravuraPierce: false,
      doubleAttackTriggered: Boolean(hasDoubleAttack && attacker.silencedRounds === 0),
      tiryuAttackerSelfHarm: tiryuAttackerSelfHarm || undefined,
      bonetrusLvl2CleaveTargetIds: unblockedBonetrusCleavedIds.length > 0 ? unblockedBonetrusCleavedIds : undefined,
      bonetrusLvl2SoloAttack: Boolean(isBonetrusLvl2 && isAttackerSolo),
      description: desc,
    };
  }

  // Case 2: BLOCKED COMBAT
  // O SOL (Nível 2) - O ABSOLUTO & A LUA (Nível 2) - A EMINENTE (IMORTAIS & ESCALA INFINITO):
  const isAttackerOSolLvl2 = isOSolLevel2Immortal(attacker);
  const isDefenderOSolLvl2 = isOSolLevel2Immortal(defender);
  const isAttackerALuaLvl2 = isALuaLevel2Supreme(attacker);
  const isDefenderALuaLvl2 = isALuaLevel2Supreme(defender);

  if (isDefenderALuaLvl2) {
    defender.hp = 999999;
    defender.maxHp = 999999;
    defender.sapience = 999999;
    defender.baseSapience = 999999;
    defender.power = 999999;
    defender.basePower = 999999;
    defender.conditions.add('imunidade');
    defender.conditions.add('obliteracao');
    setCardConditionSource(defender, 'imunidade', 'efeito_unico_proprio', defender.name);
    setCardConditionSource(defender, 'obliteracao', 'efeito_unico_proprio', defender.name);
    return {
      attackerName: attacker.name,
      defenderName: defender.name,
      attackerCard: { ...attacker },
      defenderCard: { ...defender },
      attackerDamageDealt: 0,
      reboundDamageDealt: 0,
      directPlayerDamage: 0,
      defenderDied: false,
      attackerDied: false,
      bravuraPierce: false,
      bonetrusLvl2SoloAttack: Boolean(isBonetrusLvl2 && isAttackerSolo),
      description: `🌕🩸 [IMORTAL - A EMINENTE] ${defender.name} (Nível 2) é IMORTAL e possui atributos cósmicos infinitos (∞), anulando todo o dano de ${attacker.name}!`,
    };
  }

  if (isDefenderOSolLvl2) {
    // O Sol Nível 2 é IMORTAL e possui atributos em escala INFINITO (∞):
    // Jamais sofre dano ou morre, e destrói o atacante com seu rebote infinito (a menos que o atacante também seja O Sol ou A Lua Nível 2)
    defender.hp = 999999;
    defender.maxHp = 999999;
    defender.atk = 999999;
    defender.def = 999999;
    defender.power = 999999;
    defender.conditions.delete('obliteracao');
    removeCardConditionSource(defender, 'obliteracao');

    const attackerImmuneToSol = isAttackerOSolLvl2 || isAttackerALuaLvl2;
    if (!attackerImmuneToSol) {
      attacker.conditions.add('obliteracao');
      attacker.conditions.delete('ressurreicao');
      setCardConditionSource(attacker, 'obliteracao', 'unidade_inimiga', defender.name);
      removeCardConditionSource(attacker, 'ressurreicao');
      attacker.hp = 0;
      attacker.def = 0;
      if (attacker.sapience != null) attacker.sapience = 0;
    }

    return {
      attackerName: attacker.name,
      defenderName: defender.name,
      attackerCard: { ...attacker },
      defenderCard: { ...defender },
      attackerDamageDealt: 0,
      reboundDamageDealt: attackerImmuneToSol ? 0 : 999999,
      directPlayerDamage: 0,
      defenderDied: false,
      attackerDied: !attackerImmuneToSol,
      bravuraPierce: false,
      obliteratedTarget: !attackerImmuneToSol,
      oSolAttackerObliterated: !attackerImmuneToSol || undefined,
      bonetrusLvl2SoloAttack: Boolean(isBonetrusLvl2 && isAttackerSolo),
      description: `🕳️☀️ [IMORTAL - ESCALA INFINITO] ${defender.name} (Nível 2) é IMORTAL e possui atributos infinitos (∞)! Anulou todo o dano de ${attacker.name}${
        !attackerImmuneToSol ? ` e OBLITEROU ${attacker.name} instantaneamente no contra-ataque!` : '!'
      }`,
    };
  }

  // Se O Sol (Nível 2) estiver defendendo (sozinho ou em mesa cheia), OBLITERA todas as unidades que atacarem!
  let oSolObliteratedAttacker = false;
  if (hasOSolLvl2Defending && !isAttackerOSolLvl2 && !isAttackerALuaLvl2) {
    oSolObliteratedAttacker = true;
    attacker.conditions.add('obliteracao');
    attacker.conditions.delete('ressurreicao');
    setCardConditionSource(attacker, 'obliteracao', 'unidade_inimiga', 'O Sol - O Absoluto (Nível 2)');
    removeCardConditionSource(attacker, 'ressurreicao');
    attacker.hp = 0;
    attacker.def = 0;
    if (attacker.sapience != null) attacker.sapience = 0;
  }

  if (hasOSolLvl2Attacking || isAttackerOSolLvl2) {
    defender.conditions.add('obliteracao');
    defender.conditions.delete('ressurreicao');
    setCardConditionSource(defender, 'obliteracao', 'unidade_inimiga', 'O Sol - O Absoluto (Nível 2)');
    removeCardConditionSource(defender, 'ressurreicao');
    defender.hp = 0;
    defender.def = 0;
    if (defender.sapience != null) {
      defender.sapience = 0;
    }
    const hasBravura = attacker.conditions.has('bravura');
    const bravuraPierce = Boolean(hasBravura);
    const directPlayerDamage = bravuraPierce ? 1 : 0;
    return {
      attackerName: attacker.name,
      defenderName: defender.name,
      attackerCard: { ...attacker },
      defenderCard: { ...defender },
      attackerDamageDealt: 999999,
      reboundDamageDealt: 0,
      directPlayerDamage,
      defenderDied: true,
      attackerDied: false,
      bravuraPierce,
      obliteratedTarget: true,
      oSolDefenderObliterated: true,
      description: `🕳️☀️ [O ABSOLUTO - OBLITERAÇÃO] O Sol em sua verdadeira forma de Buraco Negro (Atributos ∞ · Imortal) OBLITEROU instantaneamente ${defender.name} ao defender o ataque!${
        bravuraPierce ? ' [Bravura: +1 dano à vida do líder inimigo]' : ''
      }`,
    };
  }

  // Check Pcie 30% chance to block attack completely:
  const isPcie =
    (defender.templateId === 'g_pcie' || defender.name.toLowerCase().includes('pcie')) &&
    defender.silencedRounds === 0;
  if (isPcie && Math.random() < 0.3) {
    return {
      attackerName: attacker.name,
      defenderName: defender.name,
      attackerCard: { ...attacker },
      defenderCard: { ...defender },
      attackerDamageDealt: 0,
      reboundDamageDealt: 0,
      directPlayerDamage: 0,
      defenderDied: false,
      attackerDied: false,
      bravuraPierce: false,
      pcieBlocked: true,
      pcieCardSide: 'defender',
      description: `🛡️ BLOQUEIO PERFEITO! O escudo mágico de ${defender.name} bloqueou completamente o ataque de ${attacker.name}!`,
    };
  }

  // Check Tyn 40% chance to dodge attack completely:
  const isTyn =
    (defender.templateId === 'n_tyn' || defender.name.toLowerCase().includes('tyn')) &&
    defender.silencedRounds === 0;
  if (isTyn && Math.random() < 0.4) {
    return {
      attackerName: attacker.name,
      defenderName: defender.name,
      attackerCard: { ...attacker },
      defenderCard: { ...defender },
      attackerDamageDealt: 0,
      reboundDamageDealt: 0,
      directPlayerDamage: 0,
      defenderDied: false,
      attackerDied: false,
      bravuraPierce: false,
      tynDodged: true,
      tynCardSide: 'defender',
      description: `⚡ ESQUIVA RELÂMPAGO! Com velocidade extrema, ${defender.name} desviou completamente do ataque de ${attacker.name}!`,
    };
  }

  // Check Ataque Duplo (Moira e Jasmim contra Fogo)
  const isMoira =
    (attacker.templateId === 'm_moira' || attacker.name.toLowerCase().includes('moira')) &&
    attacker.silencedRounds === 0;
  const isJasmimVsFogo =
    (attacker.templateId === 'm_jasmim' || attacker.name.toLowerCase().includes('jasmim')) &&
    hasCardClass(defender, 'Fogo') &&
    attacker.silencedRounds === 0;
  const hasDoubleAttack = attacker.conditions.has('ataque_duplo') || attacker.hasDoubleAttack || isMoira || isJasmimVsFogo;

  // NOVO Cálculo do Dano Final
  let singleStrikeDamage = calculateCombatDamage(
    attacker,
    defender.element,
    defender.element === 'Neutro',
    votoSilencioActive,
    attackerBoard,
    defender
  );

  // Vilma, a Bruxa do Fogo: Imune a dano de FOGO
  const isDefenderVilmaImmuneToFire =
    (defender.templateId === 'm_vilma' || defender.name.toLowerCase().includes('vilma')) &&
    hasCardClass(attacker, 'Fogo') &&
    defender.silencedRounds === 0;
  // Celia, a Bruxa do Gelo: Imune a dano de GELO
  const isDefenderCeliaImmuneToIce =
    (defender.templateId === 'm_celia' ||
      defender.name.toLowerCase().includes('celia') ||
      defender.name.toLowerCase().includes('célia')) &&
    hasCardClass(attacker, 'Gelo') &&
    defender.silencedRounds === 0;
  if (isDefenderVilmaImmuneToFire || isDefenderCeliaImmuneToIce) {
    singleStrikeDamage = 0;
  }

  // Gambeta receives Cura for 2 rounds if attacked by Fogo
  if (defender.templateId === 'n_gambeta' && hasCardClass(attacker, 'Fogo') && defender.silencedRounds === 0) {
    defender.conditions.add('cura');
    setCardConditionSource(defender, 'cura', 'efeito_unico_proprio', defender.name);
    defender.curaTurnsRemaining = 2;
  }

  // CONGELAR: Faz com que a unidade congelada receba +50% de dano de qualquer fonte
  if (defender.conditions.has('congelado')) {
    singleStrikeDamage = Math.round(singleStrikeDamage * 1.5);
  }

  // Aliança Angiris: Attacker deals +50% damage
  if (attackerAngiris) {
    singleStrikeDamage = Math.round(singleStrikeDamage * 1.5);
  }

  // Barão Well em defesa ativa Tenacidade
  const isWellDefending =
    (defender.templateId === 'g_barao_well' || defender.name.toLowerCase().includes('well')) &&
    defender.silencedRounds === 0;
  if (isWellDefending) {
    defender.conditions.add('tenacidade');
    setCardConditionSource(defender, 'tenacidade', 'efeito_unico_proprio', defender.name);
  }

  // Tenacidade: reduz 35% do dano sofrido. Com Aliança Angiris: reduz cumulativamente
  const defenderHasTenacidade = defender.conditions.has('tenacidade');
  if (defenderHasTenacidade && defenderAngiris) {
    singleStrikeDamage = Math.round(singleStrikeDamage * 0.325);
  } else if (defenderHasTenacidade) {
    singleStrikeDamage = Math.round(singleStrikeDamage * 0.65);
  } else if (defenderAngiris) {
    singleStrikeDamage = Math.round(singleStrikeDamage * 0.5);
  }

  // Hélio Nível 2: Caso seja a única unidade designada em um ATAQUE, DOBRA seu valor de ATAQUE
  if (isHelioLvl2 && isAttackerSolo) {
    singleStrikeDamage = singleStrikeDamage * 2;
  }

  // Tiryu: Auto-flagelar (Sempre que ataca ou defende, perde 5 de Sapiência)
  let tiryuAttackerSelfHarm = false;
  let tiryuDefenderSelfHarm = false;
  if (attacker.templateId === 'm_tiryu' && attacker.silencedRounds === 0) {
    attacker.hp = Math.max(0, attacker.hp - 5);
    attacker.sapience = attacker.hp;
    tiryuAttackerSelfHarm = true;
  }
  if (defender.templateId === 'm_tiryu' && defender.silencedRounds === 0) {
    defender.hp = Math.max(0, defender.hp - 5);
    defender.sapience = defender.hp;
    tiryuDefenderSelfHarm = true;
  }

  // Ataque-duplo: A unidade executa um segundo ataque na unidade causando 60% do seu dano original.
  const secondStrikeDamage = Math.round(singleStrikeDamage * 0.60);

  // Classe Sombrio: Causa 50% do seu Poder atual como dano Crítico (diretamente na Vida da unidade atacada).
  // Obs: Com o efeito Crítico ativo, causa o dano normalmente à Vida e mais um adicional de 50% do Poder atual no momento do Ataque!
  let singleSombrioCrit = getSombrioCritBonusDamage(attacker, votoSilencioActive);
  if (singleSombrioCrit > 0) {
    if (isDefenderVilmaImmuneToFire || isDefenderCeliaImmuneToIce) {
      singleSombrioCrit = 0;
    } else {
      if (defender.conditions.has('congelado')) {
        singleSombrioCrit = Math.round(singleSombrioCrit * 1.5);
      }
      if (attackerAngiris) {
        singleSombrioCrit = Math.round(singleSombrioCrit * 1.5);
      }
      if (defenderHasTenacidade && defenderAngiris) {
        singleSombrioCrit = Math.round(singleSombrioCrit * 0.325);
      } else if (defenderHasTenacidade) {
        singleSombrioCrit = Math.round(singleSombrioCrit * 0.65);
      } else if (defenderAngiris) {
        singleSombrioCrit = Math.round(singleSombrioCrit * 0.5);
      }
    }
  }
  const secondSombrioCrit = Math.round(singleSombrioCrit * 0.60);

  // Barreira do Defensor: Bloqueia completamente qualquer forma de dano 1 vez
  // Se o atacante tiver ATAQUE-DUPLO, a barreira bloqueia o 1º golpe e o 2º golpe (60%) atinge normalmente
  const defenderHadBarreira =
    defender.conditions.has('barreira') &&
    !isDefenderVilmaImmuneToFire &&
    !isDefenderCeliaImmuneToIce;
  let totalAttackerDamage = 0;
  let totalSombrioCritDamage = 0;
  if (isDefenderVilmaImmuneToFire || isDefenderCeliaImmuneToIce) {
    totalAttackerDamage = 0;
    totalSombrioCritDamage = 0;
  } else if (defenderHadBarreira) {
    defender.conditions.delete('barreira');
    removeCardConditionSource(defender, 'barreira');
    if (hasDoubleAttack) {
      totalAttackerDamage = secondStrikeDamage;
      totalSombrioCritDamage = secondSombrioCrit;
    } else {
      totalAttackerDamage = 0;
      totalSombrioCritDamage = 0;
    }
  } else {
    totalAttackerDamage = hasDoubleAttack
      ? singleStrikeDamage + secondStrikeDamage
      : singleStrikeDamage;
    totalSombrioCritDamage = hasDoubleAttack
      ? singleSombrioCrit + secondSombrioCrit
      : singleSombrioCrit;
  }

  // Lunario (Nível 1): Requisito para subir de nível: precisa DEFENDER ataques duas vezes
  const isLunarioLvl1 =
    (defender.templateId === 'g_lunario' || defender.name.toLowerCase().includes('lunario')) &&
    defender.level === 1 &&
    defender.silencedRounds === 0;
  if (isLunarioLvl1) {
    defender.defendCount = (defender.defendCount || 0) + 1;
    if (defender.defendCount >= 2) {
      defender.level = 2;
      defender.name = 'Lunario, Emissário Cósmico Supremo';
      defender.exclusiveName = 'Devorador de Sonhos';
      defender.effectDescription =
        'Lendária [Tier 5 - Nível 2]. No início de cada nova rodada, consome o efeito SONO de todas as unidades na mesa. Ganha +5/+5 de Sapiência e Poder por cada SONO consumido e causa 7 de dano à Resistência da unidade afetada.';
    }
  }

  // Check Torpor / Entorpecer (35% de chance de atacar aliado por engano) for Attacker:
  const attackerHasTorpor =
    (attacker.conditions.has('entorpecer') || attacker.conditions.has('torpor') || (attacker.entorpecerRoundsRemaining != null && attacker.entorpecerRoundsRemaining > 0)) &&
    attacker.silencedRounds === 0;

  let attackerFriendlyFireTarget: CardInstance | null = null;
  if (attackerHasTorpor && Math.random() < 0.35) {
    const allies = (attackerBoard || []).filter((c) => c.instanceId !== attacker.instanceId && c.hp > 0);
    if (allies.length > 0) {
      attackerFriendlyFireTarget = allies[Math.floor(Math.random() * allies.length)];
    }
  }

  // Defender total resistance before attack: Resistência = Vida + Defesa
  const defenderEffectiveDef = getEffectiveDefense(defender, votoSilencioActive);
  const defenderTotalResistance = defenderEffectiveDef + defender.hp;

  // Check Bravura: Dano excedente à resistência atinge a vida do jogador (1 de dano)
  const hasBravura = attacker.conditions.has('bravura');
  let bravuraPierce = false;
  let directPlayerDamage = 0;

  const combinedTotalDamage = totalAttackerDamage + totalSombrioCritDamage;

  if (hasBravura && combinedTotalDamage > defenderTotalResistance && !attackerFriendlyFireTarget) {
    bravuraPierce = true;
    directPlayerDamage = 1;
    if (attacker.templateId === 'g_lilia' && attacker.silencedRounds === 0) {
      directPlayerDamage = 2;
    }
    if (defenderTenacidadeActive) {
      directPlayerDamage = Math.max(1, Math.round(directPlayerDamage * 0.65));
    }
  }

  // Roubo de Vida: Cura 40% do seu dano causado ao ATACAR uma unidade (cura apenas a VIDA).
  // Na resolução de combate a vida roubada deve se somar a VIDA da carta ANTES que o dano do rebote seja aplicado!
  const isUnsilencedDaniel =
    (attacker.templateId === 'g_daniel' || attacker.name.toLowerCase().includes('daniel')) &&
    attacker.silencedRounds === 0;
  const attackerHasLifeSteal =
    !isUnsilencedDaniel &&
    (attacker.conditions.has('roubo_de_vida') ||
      attacker.hasLifeSteal ||
      (attacker.templateId === 'g_barao_well' && attacker.level === 2 && attacker.silencedRounds === 0));

  const extraEffectsDesc: string[] = [];
  let lifeStealHealedAmount = 0;
  if (attackerHasLifeSteal && !attackerFriendlyFireTarget && combinedTotalDamage > 0) {
    if (hasCorrosao(attacker)) {
      extraEffectsDesc.push(`[🧪 Corrosão: Cortou toda a cura do Roubo de Vida de ${attacker.name}!]`);
    } else {
      const lifeStealHeal = Math.round(combinedTotalDamage * 0.40);
      const healAmount = Math.min(attacker.maxHp - attacker.hp, lifeStealHeal);
      if (healAmount > 0) {
        lifeStealHealedAmount = healAmount;
        attacker.hp += healAmount;
        if (attacker.element === 'Cósmico' || attacker.sapience != null) {
          attacker.sapience = attacker.hp;
        }
        extraEffectsDesc.push(`[🩸 Roubo de Vida: +${healAmount} HP restaurados antes do rebote (40% de ${combinedTotalDamage})]`);
      }
    }
  }

  // Pre-damage snapshot of defender stats and conditions for Seniel Level 2 & Titano Sangramento passive
  const defenderHadSangramento =
    defender.conditions.has('sangramento') || (defender.sangramentoRoundsRemaining ?? 0) > 0;
  const attackerHadSangramento =
    attacker.conditions.has('sangramento') || (attacker.sangramentoRoundsRemaining ?? 0) > 0;
  const defenderPreHp = defender.hp;
  const defenderPreAtk = defender.atk;
  const defenderPreDef = defender.def;
  const defenderPrePower = defender.power;
  const defenderPreConds = new Set(defender.conditions);

  let defenderDied = false;
  const bonetrusCleavedIds: string[] = [];
  const hasActiveCriticoCondition =
    !attackerFriendlyFireTarget &&
    attacker.conditions.has('critico') &&
    attacker.silencedRounds === 0 &&
    totalAttackerDamage > 0;
  const criticoTriggered =
    hasActiveCriticoCondition || (!attackerFriendlyFireTarget && totalSombrioCritDamage > 0);

  if (attackerFriendlyFireTarget) {
    // Damage is redirected to allied unit instead of defender
    const allyDef = getEffectiveDefense(attackerFriendlyFireTarget, votoSilencioActive);
    const allyDefAbsorbed = Math.min(allyDef, totalAttackerDamage);
    attackerFriendlyFireTarget.def = Math.max(0, attackerFriendlyFireTarget.def - allyDefAbsorbed);
    const allyHpDamage = totalAttackerDamage - allyDefAbsorbed + totalSombrioCritDamage;
    attackerFriendlyFireTarget.hp = Math.max(0, attackerFriendlyFireTarget.hp - allyHpDamage);
    if (attackerFriendlyFireTarget.element === 'Cósmico' || attackerFriendlyFireTarget.sapience != null) {
      attackerFriendlyFireTarget.sapience = attackerFriendlyFireTarget.hp;
    }
  } else {
    // Bonetrus Nível 2 Execution:
    // "Ao atacar inimigos afligidos por CONGELAR os executam caso tenha 12 ou menos de Vida"
    const isFrozen = defender.conditions.has('congelado');

    if (isBonetrusLvl2 && isFrozen && defender.hp <= 12) {
      defender.hp = 0;
      defenderDied = true;
      extraEffectsDesc.push(`[💀❄️ EXECUÇÃO GÉLIDA: Bonetrus (Nível 2) executou ${defender.name} congelado instantaneamente (Vida <= 12)!]`);
    } else if (attacker.conditions.has('critico') && attacker.silencedRounds === 0) {
      // CRÍTICO: Unidades com Crítico ativo causam dano diretamente na vida da unidade atacada, ignora completamente a Defesa.
      // Obs Sombrio: Unidades sombrias com Crítico ativo causam o dano normalmente à vida da unidade atacada + 50% do PODER atual no momento do Ataque!
      const totalCritHpDamage = totalAttackerDamage + totalSombrioCritDamage;
      defender.hp = Math.max(0, defender.hp - totalCritHpDamage);
      if (defender.element === 'Cósmico' || defender.sapience != null) {
        defender.sapience = defender.hp;
      }
      defenderDied = defender.hp <= 0;
      if (totalSombrioCritDamage > 0) {
        extraEffectsDesc.push(
          `[🌑🎯 CRÍTICO SOMBRIO: ${attacker.name} causou ${totalAttackerDamage} de dano direto na Vida + ${totalSombrioCritDamage} de adicional Sombrio (50% do Poder) = -${totalCritHpDamage} HP em ${defender.name}!]`
        );
      } else {
        extraEffectsDesc.push(
          `[🎯 GOLPE CRÍTICO: ${attacker.name} perfurou as defesas e atingiu a Vida de ${defender.name} diretamente (-${totalAttackerDamage} HP)!]`
        );
      }
    } else {
      // Normal attack against defender (Defense absorbs normal damage first, then HP; Sombrio 50% Power hits HP directly as Critical!)
      if (isDefenderVilmaImmuneToFire) {
        extraEffectsDesc.push(`[🔥🛡️ Imune a Fogo: ${defender.name} anulou todo o dano de FOGO de ${attacker.name}!]`);
      } else if (isDefenderCeliaImmuneToIce) {
        extraEffectsDesc.push(`[❄️🛡️ Imune a Gelo: ${defender.name} anulou todo o dano de GELO de ${attacker.name}!]`);
      } else {
        const defAbsorbed = Math.min(defenderEffectiveDef, totalAttackerDamage);
        defender.def = Math.max(0, defender.def - defAbsorbed);
        const hpDamage = totalAttackerDamage - defAbsorbed + totalSombrioCritDamage;
        defender.hp = Math.max(0, defender.hp - hpDamage);
        if (defender.element === 'Cósmico' || defender.sapience != null) {
          defender.sapience = defender.hp;
        }
        if (totalSombrioCritDamage > 0) {
          extraEffectsDesc.push(
            `[🌑🎯 Dano Crítico Sombrio: +${totalSombrioCritDamage} de dano (50% do Poder) atingiu diretamente a Vida de ${defender.name}!]`
          );
        }
        defenderDied = defender.hp <= 0;
      }
    }

    // Bonetrus Nível 2 Solo Attack Splash Damage:
    // "Se Bonetrus for designado sozinho para um ataque ele causa dano em TODAS as unidades da mesa inimiga além da carta que defende seu ataque. Na unidade que o defende ele causa 100% do seu dano, nas demais causa 50%."
    if (isBonetrusLvl2 && isAttackerSolo && defenderBoard && defenderBoard.length > 0) {
      const splashDamage = Math.round(totalAttackerDamage * 0.5);
      if (splashDamage > 0) {
        const otherEnemies = defenderBoard.filter((u) => u.instanceId !== defender.instanceId && u.hp > 0);
        const hitLogNames: string[] = [];
        for (const otherEnemy of otherEnemies) {
          const isOtherCeliaImmune =
            (otherEnemy.templateId === 'm_celia' ||
              otherEnemy.name.toLowerCase().includes('celia') ||
              otherEnemy.name.toLowerCase().includes('célia')) &&
            otherEnemy.silencedRounds === 0;
          if (
            otherEnemy.conditions.has('imunidade') ||
            isOtherCeliaImmune ||
            isOSolLevel2Immortal(otherEnemy) ||
            isALuaLevel2Supreme(otherEnemy)
          ) {
            continue;
          }
          const otherDef = getEffectiveDefense(otherEnemy, votoSilencioActive);
          const otherDefAbsorbed = Math.min(otherDef, splashDamage);
          otherEnemy.def = Math.max(0, otherEnemy.def - otherDefAbsorbed);
          const otherHpDamage = splashDamage - otherDefAbsorbed;
          otherEnemy.hp = Math.max(0, otherEnemy.hp - otherHpDamage);
          if (otherEnemy.element === 'Cósmico' || otherEnemy.sapience != null) {
            otherEnemy.sapience = otherEnemy.hp;
          }
          bonetrusCleavedIds.push(otherEnemy.instanceId);
          hitLogNames.push(`${otherEnemy.name} (-${splashDamage})`);
        }
        if (hitLogNames.length > 0) {
          extraEffectsDesc.push(`[❄️🌪️ NEVASCA DEVASTADORA: Bonetrus atacou sozinho e varreu o campo com 50% de dano em: ${hitLogNames.join(', ')}!]`);
        }
      }
    }
  }

  // Defender applies REBOTE (Contra-ataque com 50% do seu dano calculado, aplicado apenas uma vez mesmo em Ataque Duplo)
  // Unidades sob efeito de SONO não conseguem aplicar rebote!
  const isDefenderSleeping = defender.conditions.has('dormindo');
  const defenderBaseDmg = isDefenderSleeping
    ? 0
    : calculateCombatDamage(
        defender,
        attacker.element,
        attacker.element === 'Neutro',
        votoSilencioActive,
        defenderBoard,
        attacker
      );
  let reboundDamage = isDefenderSleeping ? 0 : Math.round(defenderBaseDmg * 0.5);

  // Aliança Angiris: Defender deals +50% on rebound
  if (defenderAngiris && !isDefenderSleeping) {
    reboundDamage = Math.round(reboundDamage * 1.5);
  }

  // Vilma, a Bruxa do Fogo: Imune a dano de FOGO (inclusive no rebote contra defensores de Fogo)
  const isAttackerVilmaImmuneToFire =
    (attacker.templateId === 'm_vilma' || attacker.name.toLowerCase().includes('vilma')) &&
    hasCardClass(defender, 'Fogo') &&
    attacker.silencedRounds === 0;
  // Celia, a Bruxa do Gelo: Imune a dano de GELO (inclusive no rebote contra defensores de Gelo)
  const isAttackerCeliaImmuneToIce =
    (attacker.templateId === 'm_celia' ||
      attacker.name.toLowerCase().includes('celia') ||
      attacker.name.toLowerCase().includes('célia')) &&
    hasCardClass(defender, 'Gelo') &&
    attacker.silencedRounds === 0;
  if (isAttackerVilmaImmuneToFire || isAttackerCeliaImmuneToIce) {
    reboundDamage = 0;
  }

  // Pcie (30% chance de bloquear rebote ao atacar) e Tyn (40% chance de esquivar do rebote ao atacar):
  let attackerPcieBlockedRebound = false;
  let attackerTynDodgedRebound = false;
  const isAttackerPcie =
    (attacker.templateId === 'g_pcie' || attacker.name.toLowerCase().includes('pcie')) &&
    attacker.silencedRounds === 0;
  const isAttackerTyn =
    (attacker.templateId === 'n_tyn' || attacker.name.toLowerCase().includes('tyn')) &&
    attacker.silencedRounds === 0;

  if (reboundDamage > 0 && isAttackerPcie && Math.random() < 0.3) {
    reboundDamage = 0;
    attackerPcieBlockedRebound = true;
  } else if (reboundDamage > 0 && isAttackerTyn && Math.random() < 0.4) {
    reboundDamage = 0;
    attackerTynDodgedRebound = true;
  }

  // Barreira do Atacante contra o Rebote:
  const attackerHadBarreira = attacker.conditions.has('barreira') && reboundDamage > 0;
  if (attackerHadBarreira && reboundDamage > 0) {
    attacker.conditions.delete('barreira');
    removeCardConditionSource(attacker, 'barreira');
    reboundDamage = 0;
  }

  // Check Torpor / Entorpecer (35% Friendly Fire) for Defender:
  const defenderHasTorpor =
    (defender.conditions.has('entorpecer') || defender.conditions.has('torpor') || (defender.entorpecerRoundsRemaining != null && defender.entorpecerRoundsRemaining > 0)) &&
    defender.silencedRounds === 0;

  let defenderFriendlyFireTarget: CardInstance | null = null;
  if (defenderHasTorpor && Math.random() < 0.35) {
    const allies = (defenderBoard || []).filter((c) => c.instanceId !== defender.instanceId && c.hp > 0);
    if (allies.length > 0) {
      defenderFriendlyFireTarget = allies[Math.floor(Math.random() * allies.length)];
    }
  }

  if (defenderFriendlyFireTarget) {
    // Rebound hit ally instead of attacker
    const allyDef = getEffectiveDefense(defenderFriendlyFireTarget, votoSilencioActive);
    const allyDefAbsorbed = Math.min(allyDef, reboundDamage);
    defenderFriendlyFireTarget.def = Math.max(0, defenderFriendlyFireTarget.def - allyDefAbsorbed);
    const allyHpDamage = reboundDamage - allyDefAbsorbed;
    defenderFriendlyFireTarget.hp = Math.max(0, defenderFriendlyFireTarget.hp - allyHpDamage);
    if (defenderFriendlyFireTarget.element === 'Cósmico' || defenderFriendlyFireTarget.sapience != null) {
      defenderFriendlyFireTarget.sapience = defenderFriendlyFireTarget.hp;
    }
    reboundDamage = 0;
  } else {
    // Attacker mitigation against rebound (Tenacidade e Aliança Angiris):
    const attackerHasTenacidade = attacker.conditions.has('tenacidade');
    if (attackerHasTenacidade && attackerAngiris) {
      reboundDamage = Math.round(reboundDamage * 0.325);
    } else if (attackerHasTenacidade) {
      reboundDamage = Math.round(reboundDamage * 0.65);
    } else if (attackerAngiris) {
      reboundDamage = Math.round(reboundDamage * 0.5);
    }

    // Rebound damage absorbs attacker Def first, then HP
    const attackerEffectiveDef = getEffectiveDefense(attacker, votoSilencioActive);
    const atkDefAbsorbed = Math.min(attackerEffectiveDef, reboundDamage);
    attacker.def = Math.max(0, attacker.def - atkDefAbsorbed);
    const atkHpDamage = reboundDamage - atkDefAbsorbed;
    attacker.hp = Math.max(0, attacker.hp - atkHpDamage);
    if (attacker.element === 'Cósmico' || attacker.sapience != null) {
      attacker.sapience = attacker.hp;
    }
  }
  const attackerDied = attacker.hp <= 0;

  let desc = '';
  if (attackerFriendlyFireTarget) {
    desc = `🌀 TORPOR DESORIENTADOR! ${attacker.name} ficou confuso pelo Torpor e atacou sua aliada ${attackerFriendlyFireTarget.name} (${totalAttackerDamage} dano)!`;
  } else {
    desc = `${attacker.name} atacou ${defender.name} (${totalAttackerDamage} dano${hasDoubleAttack ? ' [Ataque Duplo: 2x golpes]' : ''}${isHelioLvl2 && isAttackerSolo ? ' [☀️ Hélio Nível 2: Ataque Solo Dobrado!]' : ''}).`;
    if (extraEffectsDesc.length > 0) {
      desc += ' ' + extraEffectsDesc.join(' ');
    }
  }

  if (defenderFriendlyFireTarget) {
    desc += ` [🌀 TORPOR DEFENSIVO! ${defender.name} desferiu seu contra-ataque confuso contra a unidade aliada ${defenderFriendlyFireTarget.name}!]`;
  } else if (isDefenderSleeping) {
    desc += ` [💤 SONO: ${defender.name} está dormindo e não conseguiu aplicar rebote!]`;
  } else if (attackerPcieBlockedRebound) {
    desc += ` [🛡️ BLOQUEIO PERFEITO: O escudo mágico de ${attacker.name} bloqueou completamente o rebote de ${defender.name}!]`;
  } else if (attackerTynDodgedRebound) {
    desc += ` [⚡ ESQUIVA RELÂMPAGO: ${attacker.name} desviou completamente do rebote de ${defender.name}!]`;
  } else {
    desc += ` ${defender.name} aplicou rebote (${reboundDamage} dano).`;
  }

  if (defenderHadBarreira) {
    desc += ` [🛡️✨ BARREIRA: ${defender.name} absorveu o primeiro golpe com sua Barreira Celestial!]`;
  }
  if (attackerHadBarreira && reboundDamage === 0) {
    desc += ` [🛡️✨ BARREIRA: ${attacker.name} bloqueou o dano do rebote!]`;
  }
  if (attacker.templateId === 'm_tiryu' && attacker.silencedRounds === 0) {
    desc += ` [🩸 Auto-flagelar: Tiryu perdeu 5 de Sapiência ao atacar]`;
  }
  if (defender.templateId === 'm_tiryu' && defender.silencedRounds === 0) {
    desc += ` [🩸 Auto-flagelar: Tiryu perdeu 5 de Sapiência ao defender]`;
  }
  if (defenderHasTenacidade && defenderAngiris) {
    desc += ` [🛡️⚡ Tenacidade + Aliança Angiris: -67,5% Dano Geral]`;
  } else if (defenderHasTenacidade) {
    desc += ` [🛡️ Tenacidade: -35% Dano]`;
  } else if (defenderAngiris) {
    desc += ` [Aliança Angiris: -50% Dano Recebido]`;
  }

  if (attackerHasLifeSteal && !attackerFriendlyFireTarget) {
    desc += ` [🩸 Roubo de Vida: ${attacker.name} recuperou vida no ataque]`;
  }

  if (bravuraPierce && !attackerFriendlyFireTarget) {
    desc += ` Bravura ativada! O dano excedente atingiu a vida do jogador (-${directPlayerDamage} HP${defenderTenacidadeActive ? ' [-35% Tenacidade]' : ''})!`;
  }

  // Kyn & Bimo: Ao atacar, atordoam o defensor até o fim da próxima rodada (respeita Imunidade)
  let kynBimoBonk = false;
  if (
    (attacker.templateId === 'n_kyn' ||
      attacker.templateId === 'n_bimo' ||
      attacker.name.toLowerCase() === 'kyn' ||
      attacker.name.toLowerCase() === 'bimo') &&
    attacker.silencedRounds === 0 &&
    !attackerFriendlyFireTarget
  ) {
    kynBimoBonk = true;
    if (!defenderDied && !defender.conditions.has('imunidade')) {
      defender.conditions.add('atordoado');
      setCardConditionSource(defender, 'atordoado', 'unidade_inimiga', attacker.name);
      defender.stunRoundsRemaining = 1;
      desc += ` [⚡ Atordoamento Telúrico: ${attacker.name} atordoou ${defender.name} até o fim da próxima rodada!]`;
    }
  }

  // Passiva Global da Classe Elétrico (Patch 1.3):
  // O primeiro ataque de toda unidade elétrica sempre atordoa a carta inimiga na rodada seguinte.
  if (hasCardClass(attacker, 'Elétrico') && !attacker.hasFirstAttacked && attacker.silencedRounds === 0 && !defenderDied && !attackerFriendlyFireTarget) {
    attacker.hasFirstAttacked = true;
    if (!defender.conditions.has('imunidade')) {
      defender.conditions.add('atordoado');
      setCardConditionSource(defender, 'atordoado', 'unidade_inimiga', `${attacker.name} (Passiva Elétrico)`);
      defender.stunRoundsRemaining = 1;
      desc += ` [⚡ Choque de Classe Elétrica: Primeiro ataque de ${attacker.name} atordoou ${defender.name} para a próxima rodada!]`;
    } else {
      desc += ` [🌟 Imunidade: ${defender.name} resistiu ao atordoamento elétrico!]`;
    }
  }

  // Lucent (Divino): Consome Torpor do alvo atingido e converte em Queimadura por 2 rodadas
  const isAttackerLucent =
    (attacker.templateId === 'g_lucent' || attacker.name.trim().toLowerCase() === 'lucent') &&
    attacker.silencedRounds === 0;
  const defenderHadTorporForLucent =
    defender.conditions.has('entorpecer') ||
    defender.conditions.has('torpor') ||
    (defender.entorpecerRoundsRemaining != null && defender.entorpecerRoundsRemaining > 0);
  const lucentTorporConvert = Boolean(isAttackerLucent && defenderHadTorporForLucent && !attackerFriendlyFireTarget);
  if (lucentTorporConvert) {
    defender.conditions.delete('entorpecer');
    defender.conditions.delete('torpor');
    defender.entorpecerRoundsRemaining = 0;
    removeCardConditionSource(defender, 'entorpecer');
    if (!defenderDied) {
      const isDefenderVilma =
        (defender.templateId === 'm_vilma' || defender.name.toLowerCase().includes('vilma')) &&
        defender.silencedRounds === 0;
      if (defender.element === 'Cósmico' && defender.silencedRounds === 0) {
        desc += ` [☀️ Lucent: Causou 2x de dano e consumiu o Torpor de ${defender.name} (Cósmico é imune a Queimadura)!]`;
      } else if (isDefenderVilma) {
        desc += ` [☀️ Lucent: Causou 2x de dano e consumiu o Torpor de ${defender.name} (Vilma é imune a Queimadura)!]`;
      } else if (defender.conditions.has('imunidade')) {
        desc += ` [☀️ Lucent: Causou 2x de dano e consumiu o Torpor de ${defender.name} (Imunidade bloqueou a Queimadura)!]`;
      } else {
        defender.conditions.add('queimadura');
        setCardConditionSource(defender, 'queimadura', 'unidade_inimiga', attacker.name);
        defender.burnTurnsRemaining = 2;
        desc += ` [☀️🔥 Purificação Ardente: Lucent causou 2x de dano, consumiu o TORPOR de ${defender.name} e aplicou QUEIMADURA por 2 rodadas!]`;
      }
    } else {
      desc += ` [☀️🔥 Purificação Ardente: Lucent causou 2x de dano e consumiu o TORPOR de ${defender.name}!]`;
    }
  }

  // Incineração / Queimadura nos ataques de Gael, Leo e Inariel (Cósmicos e Imunes não recebem Queimadura)
  const appliesQueimadura =
    ((attacker.templateId === 'g_gael' ||
      attacker.templateId === 'g_leo' ||
      attacker.templateId === 'm_inariel') &&
      attacker.silencedRounds === 0);

  const inarielFireHit =
    (attacker.templateId === 'm_inariel' || attacker.name.toLowerCase().includes('inariel')) &&
    attacker.silencedRounds === 0 &&
    !attackerFriendlyFireTarget &&
    totalAttackerDamage > 0;

  if (appliesQueimadura && !defenderDied && !attackerFriendlyFireTarget) {
    const isDefenderVilma =
      (defender.templateId === 'm_vilma' || defender.name.toLowerCase().includes('vilma')) &&
      defender.silencedRounds === 0;
    if (defender.element === 'Cósmico' && defender.silencedRounds === 0) {
      desc += ` [🧬 Cósmico: ${defender.name} é imune a Queimadura!]`;
    } else if (isDefenderVilma) {
      desc += ` [🔥🛡️ Imune a Fogo: ${defender.name} é imune a Queimadura!]`;
    } else if (defender.conditions.has('imunidade')) {
      desc += ` [🌟 Imunidade: ${defender.name} resistiu à Queimadura!]`;
    } else {
      defender.conditions.add('queimadura');
      setCardConditionSource(defender, 'queimadura', 'unidade_inimiga', attacker.name);
      defender.burnTurnsRemaining = 2;
      desc += ` [🔥 Queimadura: ${defender.name} começou a queimar (4 de dano por rodada)!]`;
    }
  }

  // Sangramento em ataques: Gangnyr, Moira, Tiryu e Titano (Nível 2)
  const isGangnyrAttacker =
    (attacker.templateId === 'g_gangnyr' || attacker.name.toLowerCase().includes('gangnyr')) &&
    attacker.silencedRounds === 0;
  const isMoiraAttacker =
    (attacker.templateId === 'm_moira' || attacker.name.toLowerCase().includes('moira')) &&
    attacker.silencedRounds === 0;
  const isTiryuAttacker =
    (attacker.templateId === 'm_tiryu' || attacker.name.toLowerCase().includes('tiryu')) &&
    attacker.silencedRounds === 0;
  const isTitanoLvl2Attacker =
    (attacker.templateId === 'm_titano' || attacker.name.toLowerCase().includes('titano')) &&
    attacker.level === 2 &&
    attacker.silencedRounds === 0;

  let bleedAppliedToDefender = false;
  let hemorrhageTriggeredDefender = false;
  let hemorrhageDamageDealt = 0;
  if (
    (isGangnyrAttacker || isMoiraAttacker || isTiryuAttacker || isTitanoLvl2Attacker) &&
    !defenderDied &&
    !attackerFriendlyFireTarget
  ) {
    if (defender.conditions.has('imunidade') || isOSolLevel2Immortal(defender) || isALuaLevel2Supreme(defender)) {
      desc += ` [🌟 Imunidade: ${defender.name} resistiu ao Sangramento de ${attacker.name}!]`;
    } else {
      const bleedHits = hasDoubleAttack ? 2 : 1;
      let bleedRoundsAppliedThisAttack = false;
      for (let hitIdx = 0; hitIdx < bleedHits; hitIdx++) {
        if (defender.hp <= 0) break;

        if (!bleedRoundsAppliedThisAttack || !defender.conditions.has('sangramento')) {
          defender.conditions.add('sangramento');
          defender.sangramentoRoundsRemaining = (defender.sangramentoRoundsRemaining || 0) + 2;
          setCardConditionSource(defender, 'sangramento', 'unidade_inimiga', attacker.name);
          bleedRoundsAppliedThisAttack = true;
        }

        defender.sangramentoMarks = (defender.sangramentoMarks || 0) + 1;

        if (defender.sangramentoMarks >= 4) {
          const hitHemo = Math.max(1, Math.floor(defender.maxHp * 0.25));
          defender.hp = Math.max(0, defender.hp - hitHemo);
          if (defender.element === 'Cósmico' || defender.sapience != null) {
            defender.sapience = defender.hp;
          }
          defender.sangramentoMarks = 0;
          defender.sangramentoRoundsRemaining = 0;
          defender.conditions.delete('sangramento');
          removeCardConditionSource(defender, 'sangramento');
          hemorrhageTriggeredDefender = true;
          hemorrhageDamageDealt += hitHemo;
          bleedRoundsAppliedThisAttack = false;

          if (defender.hp <= 0) {
            defenderDied = true;
            break;
          }
        }
      }

      bleedAppliedToDefender = defender.conditions.has('sangramento');
      if (hemorrhageTriggeredDefender) {
        desc += ` [💔🩸 HEMORRAGIA ACELERADA! ${attacker.name} completou a 4ª marca de Sangramento em ${defender.name}, causando ${hemorrhageDamageDealt} de dano (25% da Vida Máxima) e resetando as marcas!${
          bleedAppliedToDefender
            ? ` (2º golpe reaplicou Sangramento: ${defender.sangramentoRoundsRemaining}r · Marcas: ${defender.sangramentoMarks || 0}/4)`
            : ''
        }]`;
      } else {
        desc += ` [🩸 ${attacker.name}: ${defender.name} recebeu SANGRAMENTO por 2 rodadas (Total: ${defender.sangramentoRoundsRemaining}r · Marcas: ${defender.sangramentoMarks || 0}/4${
          hasDoubleAttack ? ' [+2 Ataque-Duplo]' : ''
        })!]`;
      }
    }
  }

  // Titano: Causar dano em unidades afetadas por SANGRAMENTO concede CURA a Titano por 2 rodadas (atacando ou defendendo).
  let titanoAttackerBleedHeal = false;
  let titanoDefenderBleedHeal = false;
  const isTitanoAttackerUnit =
    (attacker.templateId === 'm_titano' || attacker.name.toLowerCase().includes('titano')) &&
    attacker.silencedRounds === 0;
  if (isTitanoAttackerUnit && !attackerFriendlyFireTarget && combinedTotalDamage > 0 && defenderHadSangramento) {
    attacker.conditions.add('cura');
    attacker.curaTurnsRemaining = Math.max(attacker.curaTurnsRemaining || 0, 2);
    attacker.healingAmount = attacker.healingAmount ?? 9;
    setCardConditionSource(attacker, 'cura', 'passiva_propria', attacker.name);
    titanoAttackerBleedHeal = true;
    desc += ` [🌊💚 ${attacker.name}: Causou dano em ${defender.name} afetada por SANGRAMENTO e recebeu CURA por 2 rodadas!]`;
  }

  const isTitanoDefenderUnit =
    (defender.templateId === 'm_titano' || defender.name.toLowerCase().includes('titano')) &&
    defender.silencedRounds === 0;
  if (
    isTitanoDefenderUnit &&
    !defenderDied &&
    !defenderFriendlyFireTarget &&
    !isDefenderSleeping &&
    reboundDamage > 0 &&
    attackerHadSangramento
  ) {
    defender.conditions.add('cura');
    defender.curaTurnsRemaining = Math.max(defender.curaTurnsRemaining || 0, 2);
    defender.healingAmount = defender.healingAmount ?? 9;
    setCardConditionSource(defender, 'cura', 'passiva_propria', defender.name);
    titanoDefenderBleedHeal = true;
    desc += ` [🌊💚 ${defender.name}: Causou dano em ${attacker.name} afetada por SANGRAMENTO e recebeu CURA por 2 rodadas!]`;
  }

  let sanielLvl2Absorbed = false;

  if (defenderDied && !attackerFriendlyFireTarget) {
    desc += ` ${defender.name} foi derrotado!`;

    // Hélio Nível 2: Se eliminar uma unidade defensora, se cura em 10 de Resistência (priorizando a Vida e depois a Defesa)
    if (isHelioLvl2) {
      if (hasCorrosao(attacker)) {
        addDefensePoints(attacker, 10, false);
        desc += ` [☀️🧪 Hélio (Nível 2): Eliminou o defensor, mas Corrosão cortou a cura de Vida (+10 Defesa)!]`;
      } else {
        const missingHp = attacker.maxHp - attacker.hp;
        const hpHeal = Math.min(missingHp, 10);
        attacker.hp += hpHeal;
        const defHeal = 10 - hpHeal;
        if (defHeal > 0) {
          addDefensePoints(attacker, defHeal, false);
        }
        desc += ` [☀️ Hélio (Nível 2): Eliminou o defensor e recuperou 10 de Resistência (+${hpHeal} Vida, +${defHeal} Defesa)!]`;
      }
    }

    // Saniel Nível 2 absorve atributos e condições benéficas, e 50% do Poder absorvido é somado ao seu Ataque
    const isSanielLvl2 =
      (attacker.templateId === 'n_seniel' ||
        attacker.templateId === 'n_saniel' ||
        attacker.name.toLowerCase().includes('seniel') ||
        attacker.name.toLowerCase().includes('saniel')) &&
      attacker.level === 2;
    if (isSanielLvl2) {
      sanielLvl2Absorbed = true;
      const bonusAtkFromPower = Math.floor(defenderPrePower * 0.5);
      attacker.hp += defenderPreHp;
      attacker.maxHp += defenderPreHp;
      attacker.atk += defenderPreAtk + bonusAtkFromPower;
      attacker.baseAtk += defenderPreAtk + bonusAtkFromPower;
      addDefensePoints(attacker, defenderPreDef);
      addPowerPoints(attacker, defenderPrePower);

      if (defenderPreConds.has('bravura')) {
        attacker.conditions.add('bravura');
        setCardConditionSource(attacker, 'bravura', 'unidade_compartilhada', `${defender.name} (absorvido por Saniel Nível 2)`);
      }
      if (defenderPreConds.has('furtividade')) {
        attacker.conditions.add('furtividade');
        setCardConditionSource(attacker, 'furtividade', 'unidade_compartilhada', `${defender.name} (absorvido por Saniel Nível 2)`);
      }
      if (defenderPreConds.has('cura')) {
        attacker.conditions.add('cura');
        setCardConditionSource(attacker, 'cura', 'unidade_compartilhada', `${defender.name} (absorvido por Saniel Nível 2)`);
      }
      if (defenderPreConds.has('tenacidade')) {
        attacker.conditions.add('tenacidade');
        setCardConditionSource(attacker, 'tenacidade', 'unidade_compartilhada', `${defender.name} (absorvido por Saniel Nível 2)`);
      }
      if (defenderPreConds.has('ressurreicao')) {
        attacker.conditions.add('ressurreicao');
        setCardConditionSource(attacker, 'ressurreicao', 'unidade_compartilhada', `${defender.name} (absorvido por Saniel Nível 2)`);
      }
      if (defenderPreConds.has('etereo')) {
        attacker.conditions.add('etereo');
        setCardConditionSource(attacker, 'etereo', 'unidade_compartilhada', `${defender.name} (absorvido por Saniel Nível 2)`);
      }

      desc += ` [👑 Saniel (Nível 2) absorveu os atributos de ${defender.name}: +${defenderPreHp} Vida, +${defenderPreAtk + bonusAtkFromPower} Atk (incluindo +${bonusAtkFromPower} de 50% do Poder), +${defenderPreDef} Def, +${defenderPrePower} Poder!]`;
    }

    // Felicia TIER 2: Recebe +1/+3 de Ataque/Defesa sempre que eliminar uma unidade inimiga em combate
    if (
      (attacker.templateId === 'm_felicia' || attacker.name.toLowerCase().includes('felicia')) &&
      attacker.silencedRounds === 0
    ) {
      attacker.atk += 1;
      attacker.baseAtk += 1;
      addDefensePoints(attacker, 3);
      desc += ` [❄️ Felicia eliminou ${defender.name} e ascendeu seu poder frígido: +1 Ataque e +3 Defesa (Novo: ${attacker.atk}/${attacker.def})!]`;
    }

    // Mavie TIER 2 (Divino): Recebe Roubo de Vida até o fim da próxima rodada e +3 Poder permanente por abate
    if (
      (attacker.templateId === 'n_mavie' || attacker.name.trim().toLowerCase() === 'mavie') &&
      attacker.silencedRounds === 0
    ) {
      attacker.conditions.add('roubo_de_vida');
      attacker.hasLifeSteal = true;
      attacker.lifeStealRoundsRemaining = 2;
      setCardConditionSource(attacker, 'roubo_de_vida', 'efeito_unico_proprio', attacker.name);
      const prevPwr = attacker.power;
      addPowerPoints(attacker, 3);
      desc += ` [🪽🩸 Ceifa Luminosa: Mavie eliminou ${defender.name}, recebeu ROUBO DE VIDA até o fim da próxima rodada e +3 Poder permanente (${prevPwr} → ${attacker.power})!]`;
    }
  }

  if (attackerDied) {
    desc += ` ${attacker.name} foi derrotado pelo rebote!`;

    // Felicia eliminou o atacante no rebote
    if (
      (defender.templateId === 'm_felicia' || defender.name.toLowerCase().includes('felicia')) &&
      defender.silencedRounds === 0
    ) {
      defender.atk += 1;
      defender.baseAtk += 1;
      addDefensePoints(defender, 3);
      desc += ` [❄️ Felicia eliminou ${attacker.name} no contra-ataque: +1 Ataque e +3 Defesa!]`;
    }

    // Mavie eliminou o atacante no rebote
    if (
      (defender.templateId === 'n_mavie' || defender.name.trim().toLowerCase() === 'mavie') &&
      defender.silencedRounds === 0 &&
      !defenderFriendlyFireTarget
    ) {
      defender.conditions.add('roubo_de_vida');
      defender.hasLifeSteal = true;
      defender.lifeStealRoundsRemaining = 2;
      setCardConditionSource(defender, 'roubo_de_vida', 'efeito_unico_proprio', defender.name);
      const prevPwr = defender.power;
      addPowerPoints(defender, 3);
      desc += ` [🪽🩸 Ceifa Luminosa: Mavie eliminou ${attacker.name} no rebote, recebeu ROUBO DE VIDA até o fim da próxima rodada e +3 Poder permanente (${prevPwr} → ${defender.power})!]`;
    }
  }

  const mavieAtkKill = Boolean(
    defenderDied &&
      !attackerFriendlyFireTarget &&
      (attacker.templateId === 'n_mavie' || attacker.name.trim().toLowerCase() === 'mavie') &&
      attacker.silencedRounds === 0
  );
  const mavieDefKill = Boolean(
    attackerDied &&
      !defenderFriendlyFireTarget &&
      (defender.templateId === 'n_mavie' || defender.name.trim().toLowerCase() === 'mavie') &&
      defender.silencedRounds === 0
  );

  const elementalImmunityTriggers: Array<{
    targetId: string;
    element: 'Gelo' | 'Fogo';
    side: 'attacker' | 'defender';
  }> = [];
  if (isDefenderVilmaImmuneToFire) {
    elementalImmunityTriggers.push({ targetId: defender.instanceId, element: 'Fogo', side: 'defender' });
  }
  if (isDefenderCeliaImmuneToIce) {
    elementalImmunityTriggers.push({ targetId: defender.instanceId, element: 'Gelo', side: 'defender' });
  }
  if (isAttackerVilmaImmuneToFire) {
    elementalImmunityTriggers.push({ targetId: attacker.instanceId, element: 'Fogo', side: 'attacker' });
  }
  if (isAttackerCeliaImmuneToIce) {
    elementalImmunityTriggers.push({ targetId: attacker.instanceId, element: 'Gelo', side: 'attacker' });
  }

  return {
    attackerName: attacker.name,
    defenderName: defender.name,
    attackerCard: { ...attacker },
    defenderCard: { ...defender },
    attackerDamageDealt: combinedTotalDamage,
    reboundDamageDealt: reboundDamage,
    directPlayerDamage,
    defenderDied,
    attackerDied,
    bravuraPierce,
    torporTriggeredAttacker: Boolean(attackerFriendlyFireTarget),
    torporTriggeredDefender: Boolean(defenderFriendlyFireTarget),
    torporFriendlyTargetId: attackerFriendlyFireTarget?.instanceId || defenderFriendlyFireTarget?.instanceId,
    criticoTriggered,
    sombrioCritDamageDealt: totalSombrioCritDamage > 0 ? totalSombrioCritDamage : undefined,
    lifeStealHealed: lifeStealHealedAmount,
    doubleAttackTriggered: Boolean(hasDoubleAttack && !attackerFriendlyFireTarget && combinedTotalDamage > 0),
    defenderBarreiraBroken: defenderHadBarreira,
    attackerBarreiraBroken: attackerHadBarreira,
    obliteratedTarget: oSolObliteratedAttacker || undefined,
    oSolAttackerObliterated: oSolObliteratedAttacker || undefined,
    pcieBlocked: attackerPcieBlockedRebound || undefined,
    pcieCardSide: attackerPcieBlockedRebound ? 'attacker' : undefined,
    tynDodged: attackerTynDodgedRebound || undefined,
    tynCardSide: attackerTynDodgedRebound ? 'attacker' : undefined,
    inarielFireHit: inarielFireHit || undefined,
    kynBimoBonk: kynBimoBonk || undefined,
    tiryuAttackerSelfHarm: tiryuAttackerSelfHarm || undefined,
    tiryuDefenderSelfHarm: tiryuDefenderSelfHarm || undefined,
    bonetrusLvl2CleaveTargetIds: bonetrusCleavedIds.length > 0 ? bonetrusCleavedIds : undefined,
    bonetrusLvl2SoloAttack: Boolean(isBonetrusLvl2 && isAttackerSolo),
    sanielLvl2Absorbed: sanielLvl2Absorbed || undefined,
    lucentTorporConvert: lucentTorporConvert || undefined,
    mavieAtkKill: mavieAtkKill || undefined,
    mavieDefKill: mavieDefKill || undefined,
    bleedAppliedToDefender: bleedAppliedToDefender || undefined,
    bleedMarksAfterAttack: bleedAppliedToDefender ? defender.sangramentoMarks || 0 : undefined,
    hemorrhageTriggeredDefender: hemorrhageTriggeredDefender || undefined,
    hemorrhageDamageDealt: hemorrhageDamageDealt > 0 ? hemorrhageDamageDealt : undefined,
    titanoBleedHealTriggered:
      titanoAttackerBleedHeal && titanoDefenderBleedHeal
        ? 'both'
        : titanoAttackerBleedHeal
        ? 'attacker'
        : titanoDefenderBleedHeal
        ? 'defender'
        : undefined,
    elementalImmunityTriggers:
      elementalImmunityTriggers.length > 0 ? elementalImmunityTriggers : undefined,
    description: desc,
  };
}

// Karlo explosion on death:
// "Ao morrer Karlo explode e causa 100% do seu Poder como dano em todas as unidades inimigas."
export function triggerKarloExplosion(
  karlo: CardInstance,
  enemyBoard: CardInstance[],
  votoSilencioActive: boolean = false
): { damageDealt: number; killedNames: string[]; blockedVilmaIds: string[] } {
  if (karlo.templateId !== 'g_karlo' || karlo.silencedRounds > 0) {
    return { damageDealt: 0, killedNames: [], blockedVilmaIds: [] };
  }
  const explosionDamage = getEffectivePower(karlo, votoSilencioActive);
  if (explosionDamage <= 0) return { damageDealt: 0, killedNames: [], blockedVilmaIds: [] };

  const killedNames: string[] = [];
  const blockedVilmaIds: string[] = [];
  for (const enemy of enemyBoard) {
    const isVilmaImmune =
      (enemy.templateId === 'm_vilma' || enemy.name.toLowerCase().includes('vilma')) &&
      enemy.silencedRounds === 0;
    if (enemy.hp <= 0 || isOSolLevel2Immortal(enemy)) continue;
    if (isVilmaImmune) {
      blockedVilmaIds.push(enemy.instanceId);
      continue;
    }
    const defAbsorbed = Math.min(enemy.def, explosionDamage);
    enemy.def -= defAbsorbed;
    const hpDmg = explosionDamage - defAbsorbed;
    enemy.hp = Math.max(0, enemy.hp - hpDmg);
    if (enemy.hp <= 0) {
      killedNames.push(enemy.name);
    }
  }

  return { damageDealt: explosionDamage, killedNames, blockedVilmaIds };
}

// Kore death trigger:
// "Ao morrer Kore Congela todas as unidades inimigas e causa 75% do seu valor de Defesa como dano."
export function triggerKoreDeath(
  kore: CardInstance,
  enemyBoard: CardInstance[]
): { damageDealt: number; killedNames: string[]; blockedCeliaIds: string[] } {
  if (kore.templateId !== 'm_kore' || kore.silencedRounds > 0) {
    return { damageDealt: 0, killedNames: [], blockedCeliaIds: [] };
  }
  const freezeDamage = Math.max(Math.round((kore.baseDef || 10) * 0.75), Math.round(kore.def * 0.75));
  const killedNames: string[] = [];
  const blockedCeliaIds: string[] = [];

  for (const enemy of enemyBoard) {
    const isCeliaImmune =
      (enemy.templateId === 'm_celia' ||
        enemy.name.toLowerCase().includes('celia') ||
        enemy.name.toLowerCase().includes('célia')) &&
      enemy.silencedRounds === 0;
    if (enemy.hp <= 0 || isOSolLevel2Immortal(enemy)) continue;
    if (isCeliaImmune) {
      blockedCeliaIds.push(enemy.instanceId);
      continue;
    }
    if (!enemy.conditions.has('imunidade')) {
      enemy.conditions.add('congelado');
      setCardConditionSource(enemy, 'congelado', 'unidade_inimiga', kore.name);
    }
    const defAbsorbed = Math.min(enemy.def, freezeDamage);
    enemy.def -= defAbsorbed;
    const hpDmg = freezeDamage - defAbsorbed;
    enemy.hp = Math.max(0, enemy.hp - hpDmg);
    if (enemy.element === 'Cósmico' || enemy.sapience != null) {
      enemy.sapience = enemy.hp;
    }
    if (enemy.hp <= 0) {
      killedNames.push(enemy.name);
    }
  }

  return { damageDealt: freezeDamage, killedNames, blockedCeliaIds };
}

// Nova Curva de Liberação de Tiers por Rodada:
// Padrão: T1 (R1), T2 (R3), T3 (R5), T4 (R7), T5 (R9), T6 (R10)
// Divino (Patch 1.4): T1 (R1), T2 (R2), T3 (R4), T4 (R5), T5/T6 (R7)
// Cartas geradas em combate (tokens ou geradas por efeitos/subida de nível) ignoram a restrição de Tier por rodada.
export function isTierAllowedInRound(
  tier: TierType,
  round: number,
  card?: Pick<CardInstance, 'element' | 'extraElements' | 'isToken' | 'isGeneratedCard' | 'templateId'>
): boolean {
  if (
    card &&
    (card.isToken ||
      card.isGeneratedCard ||
      (typeof card.templateId === 'string' && card.templateId.startsWith('token_')))
  ) {
    return true;
  }
  const isDivino = card ? hasCardClass(card, 'Divino') : false;
  if (isDivino) {
    if (round >= 7) return true;
    if (round >= 5) return tier <= 4;
    if (round >= 4) return tier <= 3;
    if (round >= 2) return tier <= 2;
    return tier === 1;
  }
  if (round >= 10) return true;
  if (round >= 9) return tier <= 5;
  if (round >= 7) return tier <= 4;
  if (round >= 5) return tier <= 3;
  if (round >= 3) return tier <= 2;
  return tier === 1;
}

// Check fusion: Tor, Men, Tador on the same board (only if not silenced)
export function checkAtormentadorFusion(board: CardInstance[]): { canFuse: boolean; pieceIds: string[] } {
  const tor = board.find((c) => c.templateId === 'm_tor' && c.silencedRounds === 0);
  const men = board.find((c) => c.templateId === 'm_men' && c.silencedRounds === 0);
  const tador = board.find((c) => c.templateId === 'm_tador' && c.silencedRounds === 0);

  if (tor && men && tador) {
    return {
      canFuse: true,
      pieceIds: [tor.instanceId, men.instanceId, tador.instanceId],
    };
  }
  return { canFuse: false, pieceIds: [] };
}
