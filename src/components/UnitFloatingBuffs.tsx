import React from 'react';
import { CardInstance } from '../types/game';
import { CARD_TEMPLATES } from '../data/cards';
import {
  getEffectivePower,
  getIceBonusDefenseValue,
  getSombrioCritBonusDamage,
  hasAliancaAngiris,
  hasCardClass,
  hasCorteDasFadas,
  isFairyCard,
} from '../logic/combat';

interface UnitFloatingBuffsProps {
  card: CardInstance;
  board: CardInstance[];
  votoSilencioActive?: boolean;
}

export const UnitFloatingBuffs: React.FC<UnitFloatingBuffsProps> = ({
  card,
  board,
  votoSilencioActive = false,
}) => {
  if (card.type !== 'unit' || card.hp <= 0 || card.isDying) {
    return null;
  }

  const isSilenced = card.silencedRounds > 0;
  const hasImunidade = card.conditions.has('imunidade') || (card.immunedRounds ?? 0) > 0;
  const isVotoBlocked =
    !hasImunidade &&
    (votoSilencioActive ||
      card.votoSilencioSavedPower !== undefined ||
      (card.votoSilencioRoundsRemaining ?? 0) > 0);
  const isInfiniteScale = card.hp >= 999999 || card.atk >= 999999 || card.power >= 999999;

  // 1. Bônus de dano da Classe Gelo (baseado no Pico de Defesa registrado)
  const isIceBonusActive = hasCardClass(card, 'Gelo') && !isSilenced;
  const icePeakDef = isIceBonusActive ? getIceBonusDefenseValue(card) : 0;
  const iceBonusDmg = isIceBonusActive ? Math.floor(icePeakDef * 0.25) : 0;
  const isPeakAboveCurrent = isIceBonusActive && icePeakDef > card.def;

  // 1b. Bônus Crítico da Classe Sombrio (50% do Poder atual direto na Vida)
  const isSombrioActive = hasCardClass(card, 'Sombrio') && !isSilenced && !isVotoBlocked;
  const sombrioCritDmg = isSombrioActive ? getSombrioCritBonusDamage(card, votoSilencioActive) : 0;

  // 2. Bônus da Aliança Angiris (+50% Dano / -50% Dano Recebido)
  const angirisActive = hasAliancaAngiris(card, board);

  // 2b. Passiva Corte das Fadas (3+ Fadas na mesa)
  const corteDasFadasActive = isFairyCard(card) && !isSilenced && hasCorteDasFadas(board);

  // 2c. Condições Negativas: Praga (-25% Atributos), Corrosão (-1 Vida/turno + corta cura), Sangramento (-2 Vida/rodada + 4 marcas = Hemorragia) e Unidade Presa em Barelio
  const hasPraga = card.conditions.has('praga') || (card.pragaRoundsRemaining != null && card.pragaRoundsRemaining > 0);
  const pragaRounds = card.pragaRoundsRemaining ?? 1;
  const hasCorrosao = card.conditions.has('corrosao') || (card.corrosaoRoundsRemaining != null && card.corrosaoRoundsRemaining > 0);
  const corrosaoRounds = card.corrosaoRoundsRemaining ?? 1;
  const hasSangramento = card.conditions.has('sangramento') || (card.sangramentoRoundsRemaining != null && card.sangramentoRoundsRemaining > 0);
  const sangramentoRounds = card.sangramentoRoundsRemaining ?? 1;
  const sangramentoMarks = card.sangramentoMarks ?? 0;
  const imprisonedUnit = card.imprisonedUnit;

  // 3. Bônus da Passiva de Milton (+25% Dano para unidades Telúricas)
  const miltonActive =
    (hasCardClass(card, 'Telúrico') || hasCardClass(card, 'Terra')) &&
    !isSilenced &&
    board.some(
      (u) =>
        (u.templateId === 'n_milton' || u.name.toLowerCase().includes('milton')) &&
        u.hp > 0 &&
        u.silencedRounds === 0
    );

  // 4. Poder Dobrado (Mesmerino) & Poder Sempre Ativo (Mara / efeito)
  const doublePowerActive = Boolean(card.doublePower && !isSilenced && !isVotoBlocked);
  const powerAlwaysActiveBuff = Boolean(
    card.powerAlwaysActive &&
      !isSilenced &&
      !isVotoBlocked &&
      !hasCardClass(card, 'Fogo') &&
      card.element !== 'Mágico' &&
      card.element !== 'Cósmico'
  );

  // 5. Bônus Temporário de Poder (Fome Insaciável, Grão-Mestre, etc.)
  const tempPowerAmt =
    !isVotoBlocked &&
    card.tempPowerBuffAmount &&
    card.tempPowerBuffAmount > 0 &&
    card.tempPowerBuffRoundsRemaining &&
    card.tempPowerBuffRoundsRemaining > 0
      ? card.tempPowerBuffAmount
      : 0;
  const tempPowerRounds = card.tempPowerBuffRoundsRemaining ?? 0;

  // 6. Bônus de Atributos recebidos de outras cartas / buffs acumulados acima do valor base do template
  let atkBonus = 0;
  let defBonus = 0;
  let permPowerBonus = 0;
  let hpBonus = 0;

  if (!isInfiniteScale) {
    const tpl = CARD_TEMPLATES.find((t) => t.id === card.templateId);
    if (tpl) {
      const hasClassPowerBonus = !isVotoBlocked && !isSilenced;
      const teluricoHp =
        hasClassPowerBonus && (hasCardClass(card, 'Telúrico') || hasCardClass(card, 'Terra'))
          ? card.teluricoPowerHpGranted ??
            (tpl.element === 'Telúrico' || tpl.element === 'Terra' ? Math.floor(tpl.power * 0.5) : 0)
          : 0;
      const teluricoDef =
        hasClassPowerBonus && (hasCardClass(card, 'Telúrico') || hasCardClass(card, 'Terra'))
          ? card.teluricoPowerDefGranted ??
            (tpl.element === 'Telúrico' || tpl.element === 'Terra' ? Math.floor(tpl.power * 0.5) : 0)
          : 0;
      const geloDef =
        hasClassPowerBonus && hasCardClass(card, 'Gelo')
          ? card.icePowerDefGranted ?? (tpl.element === 'Gelo' ? Math.floor(tpl.power * 0.5) : 0)
          : 0;
      const neutroHp =
        hasClassPowerBonus && hasCardClass(card, 'Neutro')
          ? card.neutroPowerHpGranted ?? (tpl.element === 'Neutro' ? Math.floor(tpl.power) : 0)
          : 0;
      const neutroAtk =
        hasClassPowerBonus && hasCardClass(card, 'Neutro')
          ? card.neutroPowerAtkGranted ?? (tpl.element === 'Neutro' ? Math.floor(tpl.power) : 0)
          : 0;
      const neutroDef =
        hasClassPowerBonus && hasCardClass(card, 'Neutro')
          ? card.neutroPowerDefGranted ?? (tpl.element === 'Neutro' ? Math.floor(tpl.power) : 0)
          : 0;

      const expectedHp = tpl.hp + teluricoHp + neutroHp;
      const expectedAtk = tpl.atk + neutroAtk;
      const expectedDef = tpl.def + teluricoDef + geloDef + neutroDef;
      const expectedPower = tpl.power;

      atkBonus = Math.max(0, card.atk - expectedAtk);
      defBonus = Math.max(0, card.def - expectedDef);
      permPowerBonus = hasClassPowerBonus
        ? Math.max(0, card.power - expectedPower - tempPowerAmt)
        : 0;
      hpBonus = Math.max(0, card.maxHp - expectedHp);
    }
  }

  const statTokens: string[] = [];
  const statTooltipParts: string[] = [];
  if (atkBonus > 0) {
    statTokens.push(`+${atkBonus}⚔️`);
    statTooltipParts.push(`+${atkBonus} Ataque`);
  }
  if (defBonus > 0) {
    statTokens.push(`+${defBonus}🛡️`);
    statTooltipParts.push(`+${defBonus} Defesa`);
  }
  if (permPowerBonus > 0) {
    statTokens.push(`+${permPowerBonus}⚡`);
    statTooltipParts.push(`+${permPowerBonus} Poder`);
  }
  if (hpBonus > 0) {
    statTokens.push(`+${hpBonus}❤️`);
    statTooltipParts.push(`+${hpBonus} Vida Máx.`);
  }

  const hasMulticlass = Boolean(card.extraElements && card.extraElements.length > 0);
  const hasAnyIndicator =
    (isIceBonusActive && icePeakDef > 0) ||
    sombrioCritDmg > 0 ||
    hasMulticlass ||
    angirisActive ||
    corteDasFadasActive ||
    hasPraga ||
    hasCorrosao ||
    hasSangramento ||
    sangramentoMarks > 0 ||
    Boolean(imprisonedUnit) ||
    miltonActive ||
    doublePowerActive ||
    powerAlwaysActiveBuff ||
    tempPowerAmt > 0 ||
    statTokens.length > 0;

  if (!hasAnyIndicator) {
    return null;
  }

  return (
    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-[35] flex flex-wrap items-center justify-center gap-0.5 w-max max-w-[162px] pointer-events-auto select-none">
      {hasMulticlass && (
        <div
          className="flex items-center gap-0.5 px-1.5 py-[1px] rounded-full bg-amber-950/95 border border-amber-300/90 text-[8px] font-mono font-black text-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.65)] whitespace-nowrap"
          title={`Multiclasse adquirida: ${card.element} + ${card.extraElements!.join(' + ')}`}
        >
          <span>⚜️</span>
          <span>+{card.extraElements!.join('/')}</span>
        </div>
      )}
      {/* Indicador Flutuante da Classe Sombrio: 50% do Poder como Dano Crítico */}
      {sombrioCritDmg > 0 && (
        <div
          className="flex items-center gap-0.5 px-1.5 py-[1px] rounded-full bg-purple-950/95 border border-fuchsia-400/90 text-[8.5px] font-mono font-black text-fuchsia-200 shadow-[0_0_10px_rgba(192,38,211,0.75)] whitespace-nowrap"
          title={`Classe Sombrio: Causa +${sombrioCritDmg} de Dano Crítico (50% do Poder atual) diretamente à Vida da unidade atacada!`}
        >
          <span>🌑</span>
          <span>+{sombrioCritDmg}🎯</span>
        </div>
      )}
      {/* Indicador Flutuante da Classe Gelo: Pico de Defesa Registrado + Dano Adicional */}
      {isIceBonusActive && icePeakDef > 0 && (
        <div
          className={`flex items-center gap-1 px-1.5 py-[1px] rounded-full bg-cyan-950/95 border text-[8.5px] font-mono font-black text-cyan-100 whitespace-nowrap transition-all ${
            isPeakAboveCurrent
              ? 'border-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.9)] ring-1 ring-cyan-300/60'
              : 'border-cyan-400/85 shadow-[0_0_8px_rgba(6,182,212,0.65)]'
          }`}
          title={`Classe Gelo: Pico de Defesa registrado = ${icePeakDef} (Defesa atual: ${card.def}) → +${iceBonusDmg} de Dano adicional (25% do pico)`}
        >
          <span className="leading-none">❄️</span>
          <span>
            Pico {icePeakDef} (+{iceBonusDmg})
          </span>
        </div>
      )}

      {/* Bônus Aliança Angiris */}
      {angirisActive && (
        <div
          className="flex items-center gap-0.5 px-1.5 py-[1px] rounded-full bg-amber-950/95 border border-amber-300/90 text-[8.5px] font-mono font-black text-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.75)] whitespace-nowrap"
          title="Aliança Angiris ativa: +50% Dano causado e -50% Dano recebido"
        >
          <span>👼</span>
          <span>+50%/-50%</span>
        </div>
      )}

      {/* Passiva Corte das Fadas Ativa */}
      {corteDasFadasActive && (
        <div
          className="flex items-center gap-0.5 px-1.5 py-[1px] rounded-full bg-pink-950/95 border border-pink-300/90 text-[8.5px] font-mono font-black text-pink-200 shadow-[0_0_10px_rgba(244,114,182,0.8)] whitespace-nowrap"
          title="Corte das Fadas ativa (3+ Fadas na mesa): Salva o jogador da morte uma vez concedendo 2 de Vida extra rosa e +75% de Poder a todas as Fadas!"
        >
          <span>🧚</span>
          <span>Corte Ativa</span>
        </div>
      )}

      {/* Condição Negativa: Praga (-25% Atributos) */}
      {hasPraga && (
        <div
          className="flex items-center gap-0.5 px-1.5 py-[1px] rounded-full bg-lime-950/95 border border-lime-400/90 text-[8.5px] font-mono font-black text-lime-200 shadow-[0_0_10px_rgba(132,204,22,0.75)] whitespace-nowrap"
          title={`Praga ativa: Todos os atributos reduzidos em 25% (${pragaRounds} rodada(s) restante(s))`}
        >
          <span>☠️</span>
          <span>-25% ({pragaRounds}r)</span>
        </div>
      )}

      {/* Condição Negativa: Corrosão (-1 Vida por turno + corta toda cura) */}
      {hasCorrosao && (
        <div
          className="flex items-center gap-0.5 px-1.5 py-[1px] rounded-full bg-lime-950/95 border border-lime-300/95 text-[8.5px] font-mono font-black text-lime-100 shadow-[0_0_10px_rgba(163,230,53,0.85)] whitespace-nowrap"
          title={`Corrosão ativa: Causa 1 de dano direto na Vida a cada TURNO e corta toda cura recebida (${corrosaoRounds} rodada(s) restante(s))`}
        >
          <span>🧪</span>
          <span>-1/t · 🚫💚 ({corrosaoRounds}r)</span>
        </div>
      )}

      {/* Condição Negativa: Sangramento (-2 Vida/rodada + contador de marcas para Hemorragia) */}
      {(hasSangramento || sangramentoMarks > 0) && (
        <div
          className="flex items-center gap-0.5 px-1.5 py-[1px] rounded-full bg-rose-950/95 border border-rose-400/95 text-[8.5px] font-mono font-black text-rose-100 shadow-[0_0_10px_rgba(244,63,94,0.85)] whitespace-nowrap"
          title={
            hasSangramento
              ? `Sangramento ativo (${sangramentoRounds}r): Causa 2 de dano por rodada. Marcas acumuladas: ${sangramentoMarks}/4 (na 4ª vez vira Hemorragia e causa 25% da Vida Máxima! Ataques com Sangramento aceleram +1 marca, ou +2 com Ataque-Duplo)`
              : `Marcas de Sangramento acumuladas: ${sangramentoMarks}/4 (ataques com Sangramento aceleram +1 marca, ou +2 com Ataque-Duplo; ao completar 4 marcas sofre Hemorragia de 25% da Vida Máxima!)`
          }
        >
          <span>🩸</span>
          <span>
            {hasSangramento ? `-2 (${sangramentoRounds}r) · ${sangramentoMarks}/4💔` : `${sangramentoMarks}/4💔`}
          </span>
        </div>
      )}

      {/* Unidade Aprisionada por Barelio */}
      {imprisonedUnit && (
        <div
          data-barelio-prisoner-id={imprisonedUnit.instanceId}
          data-barelio-captor-id={card.instanceId}
          className="relative flex flex-col items-center px-2 py-1 rounded-lg bg-gradient-to-b from-purple-950/95 via-[#180926]/95 to-stone-950/95 border-2 border-fuchsia-400/90 text-[8.5px] font-mono font-black text-purple-100 shadow-[0_0_16px_rgba(168,85,247,0.95)] whitespace-nowrap overflow-hidden"
          title={`Prisioneiro de Barelio: ${imprisonedUnit.name} (${imprisonedUnit.hp}/${imprisonedUnit.maxHp} Vida) — Sofre 10 de dano por rodada. Se morrer preso, Barelio usurpa todos os seus atributos!`}
        >
          {/* Barras verticais da jaula sombria */}
          <div className="pointer-events-none absolute inset-0 flex justify-evenly opacity-35">
            <span className="w-[1.5px] h-full bg-fuchsia-300" />
            <span className="w-[1.5px] h-full bg-fuchsia-300" />
            <span className="w-[1.5px] h-full bg-fuchsia-300" />
            <span className="w-[1.5px] h-full bg-fuchsia-300" />
          </div>
          <div className="relative z-10 flex items-center gap-1">
            <span className="text-[10px] animate-pulse">⛓️🔒</span>
            <span className="text-fuchsia-200 tracking-tight">
              {imprisonedUnit.name.split(',')[0]}
            </span>
            <span className="text-rose-300 bg-rose-950/90 border border-rose-400/60 px-1 rounded text-[8px]">
              {imprisonedUnit.hp}/{imprisonedUnit.maxHp}❤️
            </span>
          </div>
          {/* Barra de vida da unidade aprisionada */}
          <div className="relative z-10 w-full h-1 bg-stone-900 rounded-full overflow-hidden mt-0.5 border border-purple-500/40">
            <div
              className="h-full bg-gradient-to-r from-rose-500 via-fuchsia-500 to-purple-400 transition-all duration-300"
              style={{
                width: `${Math.max(5, Math.min(100, (imprisonedUnit.hp / Math.max(1, imprisonedUnit.maxHp)) * 100))}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Bônus Passiva de Milton (Telúrico +25% Dano) */}
      {miltonActive && (
        <div
          className="flex items-center gap-0.5 px-1.5 py-[1px] rounded-full bg-emerald-950/95 border border-emerald-400/85 text-[8.5px] font-mono font-black text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.65)] whitespace-nowrap"
          title="Passiva de Milton: +25% de Dano em ataques (Classe Telúrica)"
        >
          <span>🌿</span>
          <span>+25% Dano</span>
        </div>
      )}

      {/* Bônus Poder Dobrado (Mesmerino) */}
      {doublePowerActive && (
        <div
          className="flex items-center gap-0.5 px-1.5 py-[1px] rounded-full bg-purple-950/95 border border-fuchsia-400/85 text-[8.5px] font-mono font-black text-fuchsia-200 shadow-[0_0_10px_rgba(217,70,239,0.7)] whitespace-nowrap"
          title={`Poder Dobrado (Mesmerino): Poder efetivo = ${getEffectivePower(card, votoSilencioActive)}`}
        >
          <span>🔮</span>
          <span>2x Poder</span>
        </div>
      )}

      {/* Bônus Poder Sempre Ativo */}
      {powerAlwaysActiveBuff && (
        <div
          className="flex items-center gap-0.5 px-1.5 py-[1px] rounded-full bg-amber-950/95 border border-yellow-400/85 text-[8.5px] font-mono font-black text-yellow-200 shadow-[0_0_8px_rgba(250,204,21,0.6)] whitespace-nowrap"
          title={`Poder Sempre Ativo: +${getEffectivePower(card, votoSilencioActive)} Poder somado ao Dano e à Resistência`}
        >
          <span>⚡</span>
          <span>+Poder</span>
        </div>
      )}

      {/* Bônus Temporário de Poder (Fome Insaciável, Grão-Mestre, etc.) */}
      {tempPowerAmt > 0 && (
        <div
          className="flex items-center gap-0.5 px-1.5 py-[1px] rounded-full bg-indigo-950/95 border border-indigo-300/85 text-[8.5px] font-mono font-black text-indigo-100 shadow-[0_0_10px_rgba(129,140,248,0.75)] whitespace-nowrap"
          title={`Buff temporário de Poder: +${tempPowerAmt} Poder (${tempPowerRounds} rodada(s) restante(s))`}
        >
          <span>✨</span>
          <span>
            +{tempPowerAmt}⚡ ({tempPowerRounds}r)
          </span>
        </div>
      )}

      {/* Bônus de Atributos Recebidos de Outras Cartas / Efeitos */}
      {statTokens.length > 0 && (
        <div
          className="flex items-center gap-1 px-1.5 py-[1px] rounded-full bg-emerald-950/95 border border-lime-400/80 text-[8.5px] font-mono font-black text-lime-200 shadow-[0_0_8px_rgba(132,204,22,0.55)] whitespace-nowrap"
          title={`Buffs de atributos ativos: ${statTooltipParts.join(', ')}`}
        >
          {statTokens.join(' ')}
        </div>
      )}
    </div>
  );
};
