import { CardInstance, ElementType, PlayerState } from '../types/game';
import { canReceiveMulticlass, isTierAllowedInRound } from './combat';

const MULTICLASS_SPELL_ELEMENT: Record<string, ElementType> = {
  n_apoteose: 'Divino',
  g_toque_igneo: 'Fogo',
  n_forca_natureza: 'Telúrico',
  m_estatico: 'Elétrico',
  m_nevasca: 'Gelo',
  n_encantar: 'Mágico',
  g_oceanico: 'Água',
};

export interface AiAction {
  type: 'draw' | 'summon' | 'cast_spell' | 'attack' | 'pass';
  cardInstanceId?: string;
  targetCardInstanceId?: string;
  attackerIds?: string[];
  discardBoardCardId?: string;
}

export function decideAiTurnAction(
  ai: PlayerState,
  opponent: PlayerState,
  round: number,
  isAiAttackerRole: boolean,
  hasAttackedThisRound: boolean
): AiAction {
  // 1. Draw a card if not drawn yet this round
  if (!ai.hasDrawnThisRound && ai.deck.length > 0 && ai.hand.length < 8) {
    return { type: 'draw' };
  }

  // 2. Play cards if summons limit has not been reached (3 if Craff is on board, else 2)
  const hasCraff = ai.board.some(
    (c) =>
      (c.templateId === 'g_craff' || c.name.toLowerCase().includes('craff')) &&
      c.hp > 0 &&
      c.silencedRounds === 0
  );
  const maxAllowedSummons = hasCraff ? 3 : 2;

  if (ai.summonsThisRound < maxAllowedSummons) {
    // Check playable units from hand
    const playableUnits = ai.hand.filter((c) => {
      if (c.type !== 'unit') return false;
      if (!isTierAllowedInRound(c.tier, round, c)) return false;

      // Atormentador piece restriction: max 1 per round
      const isPiece = c.templateId === 'm_tor' || c.templateId === 'm_men' || c.templateId === 'm_tador';
      if (isPiece && ai.atormentadorPieceSummonedThisRound) return false;

      // Zyk requires at least 2 sacrifice candidates
      const isZyk = c.templateId === 'g_zyk' || c.name.toLowerCase().includes('zyk');
      if (isZyk) {
        const sacrificeCandidates =
          ai.hand.filter((h) => h.instanceId !== c.instanceId).length + ai.board.length;
        if (sacrificeCandidates < 2) return false;
      }

      return true;
    });

    if (playableUnits.length > 0) {
      // Prioritize fusion pieces if legal, else highest stat unit
      const fusionPiece = playableUnits.find(
        (c) => c.templateId === 'm_tor' || c.templateId === 'm_men' || c.templateId === 'm_tador'
      );
      const chosenUnit =
        fusionPiece ||
        [...playableUnits].sort((a, b) => b.atk + b.def - (a.atk + a.def))[0];

      // If board is full, choose weakest board card to discard
      let discardId: string | undefined = undefined;
      const maxSlots = ai.maxBoardSlots || 5;
      if (ai.board.length >= maxSlots) {
        const weakest = [...ai.board].sort((a, b) => a.hp + a.def - (b.hp + b.def))[0];
        discardId = weakest.instanceId;
      }

      return {
        type: 'summon',
        cardInstanceId: chosenUnit.instanceId,
        discardBoardCardId: discardId,
      };
    }
  }

  // 2b. Check playable spells (skills do NOT count toward the unit summon limit; Fast/Fugaz skills keep the turn!)
  {
    const ALLY_TARGET_SPELLS = new Set([
      'g_enganar',
      'm_moral',
      'g_soberania',
      'n_destreza',
      'n_voto_estrelas',
      'n_escolhido_das_estrelas',
      'n_escolhido_estrelas',
      'g_desafio_real',
      'm_fome_insaciavel',
      'g_sabedoria_cosmica',
      'm_grao_mestre',
      'g_concessao_divina',
      'token_filho_da_luz',
      'n_apoteose',
      'g_toque_igneo',
      'n_forca_natureza',
      'm_estatico',
      'm_nevasca',
      'n_encantar',
      'g_oceanico',
    ]);
    const ENEMY_TARGET_SPELLS = new Set([
      'm_voto_caidos',
      'n_bloqueio',
      'n_jurisdicao_de_saniel',
      'm_letargia_lunar',
      'g_rochedo',
      'token_flecha_eletrica',
      'token_fagulha_estelar',
      'token_centelha',
      'n_labareda_solar',
      'n_voto_do_absoluto',
      'm_destino_fatal',
      'g_subjugar',
    ]);

    const playableSpells = ai.hand.filter((c) => {
      if (c.type !== 'skill') return false;
      // Veto do Indômito can only be used in the Counter-Response window
      if (c.templateId === 'n_veto_do_indomito') return false;
      if (!isTierAllowedInRound(c.tier, round, c)) return false;

      if (c.templateId === 'm_reencarnacao') {
        return ai.graveyard.length > 0 && ai.hand.length < 8;
      }

      if (c.templateId === 'g_subjugar') {
        return opponent.board.length > 0 && ai.hand.length < 8;
      }

      if (ALLY_TARGET_SPELLS.has(c.templateId)) {
        const grantElem = MULTICLASS_SPELL_ELEMENT[c.templateId];
        if (grantElem) {
          const pool = c.templateId === 'n_apoteose' ? [...ai.board, ...ai.hand] : ai.board;
          return pool.some((ally) => canReceiveMulticlass(ally, grantElem));
        }
        const validAllies = ai.board.filter((ally) => {
          if (c.templateId === 'n_escolhido_das_estrelas' || c.templateId === 'n_escolhido_estrelas') {
            return (
              ally.tier === 5 &&
              ally.templateId !== 'n_o_sol' &&
              ally.templateId !== 'g_a_lua' &&
              (ally.level || 1) < 2
            );
          }
          if (c.templateId === 'g_sabedoria_cosmica' || c.templateId === 'token_filho_da_luz') {
            return true;
          }
          return ally.element !== 'Cósmico';
        });
        return validAllies.length > 0;
      }

      if (ENEMY_TARGET_SPELLS.has(c.templateId)) {
        return opponent.board.length > 0;
      }

      // Global spells (e.g. Voto do Silêncio, Chamado da Vitória, Crio-gênese)
      if (
        c.templateId === 'g_voto_do_silencio' ||
        c.templateId === 'g_voto_silencio' ||
        c.templateId === 'm_crio_genese'
      ) {
        return opponent.board.length > 0;
      }
      if (c.templateId === 'm_chamado_da_vitoria' || c.templateId === 'm_chamado_vitoria') {
        return ai.board.length > 0;
      }

      return true;
    });

    if (playableSpells.length > 0) {
      const spell = playableSpells[0];
      let targetId: string | undefined = undefined;

      if (ALLY_TARGET_SPELLS.has(spell.templateId)) {
        const grantElem = MULTICLASS_SPELL_ELEMENT[spell.templateId];
        if (grantElem) {
          const pool = spell.templateId === 'n_apoteose' ? [...ai.board, ...ai.hand] : ai.board;
          const valid = pool.filter((ally) => canReceiveMulticlass(ally, grantElem));
          if (valid.length > 0) {
            // Prefer higher tier / power units (on board first, or high-tier Divino acceleration in hand for Apoteose)
            const chosen = [...valid].sort((a, b) => (b.power + b.tier * 4) - (a.power + a.tier * 4))[0];
            targetId = chosen.instanceId;
          }
        } else {
          const validAllies = ai.board.filter((ally) => {
            if (spell.templateId === 'n_escolhido_das_estrelas' || spell.templateId === 'n_escolhido_estrelas') {
              return (
                ally.tier === 5 &&
                ally.templateId !== 'n_o_sol' &&
                ally.templateId !== 'g_a_lua' &&
                (ally.level || 1) < 2
              );
            }
            if (spell.templateId === 'g_sabedoria_cosmica' || spell.templateId === 'token_filho_da_luz') {
              return true;
            }
            return ally.element !== 'Cósmico';
          });
          if (validAllies.length > 0) {
            if (spell.templateId === 'token_filho_da_luz') {
              const cavaleiro = validAllies.find(
                (ally) => ally.templateId === 'm_cavaleiro_sem_nome' && !ally.isRevealedFaleziel
              );
              const atlazielUnawakened = validAllies.find(
                (ally) => (ally.templateId === 'm_atlaziel' || ally.name.toLowerCase().includes('atlaziel')) && !ally.isArchangel
              );
              const mostDamaged = [...validAllies].sort(
                (a, b) => (b.maxHp - b.hp + Math.max(0, b.baseDef - b.def)) - (a.maxHp - a.hp + Math.max(0, a.baseDef - a.def))
              )[0];
              targetId = (cavaleiro || atlazielUnawakened || mostDamaged).instanceId;
            } else {
              const strongest = [...validAllies].sort((a, b) => b.atk + b.power - (a.atk + a.power))[0];
              targetId = strongest.instanceId;
            }
          }
        }
      } else if (ENEMY_TARGET_SPELLS.has(spell.templateId)) {
        if (opponent.board.length > 0) {
          if (spell.templateId === 'token_centelha') {
            const stunnedEnemy = opponent.board
              .filter((e) => e.conditions.has('atordoado'))
              .sort((a, b) => b.atk + b.power - (a.atk + a.power))[0];
            const strongestEnemy = [...opponent.board].sort((a, b) => b.atk + b.power - (a.atk + a.power))[0];
            targetId = (stunnedEnemy || strongestEnemy).instanceId;
          } else if (spell.templateId === 'm_destino_fatal') {
            const nonImmune = opponent.board.filter((e) => !e.conditions.has('imunidade'));
            const pool = nonImmune.length > 0 ? nonImmune : opponent.board;
            const best = [...pool].sort((a, b) => b.hp + b.def + b.power - (a.hp + a.def + a.power))[0];
            targetId = best.instanceId;
          } else {
            const strongestEnemy = [...opponent.board].sort((a, b) => b.atk + b.power - (a.atk + a.power))[0];
            targetId = strongestEnemy.instanceId;
          }
        }
      }

      return {
        type: 'cast_spell',
        cardInstanceId: spell.instanceId,
        targetCardInstanceId: targetId,
      };
    }
  }

  // 3. Declare Attack if AI is the Attacker of the round (or canAttackOnDefense via Zyk) and has not attacked yet (or extraAttackRound)
  // All ready attackers on board attack simultaneously!
  const canAiAttack =
    (isAiAttackerRole && (!hasAttackedThisRound || (Boolean(ai.extraAttackRound) && !ai.secondAttackDone))) ||
    Boolean(ai.canAttackOnDefense);

  if (canAiAttack && ai.board.length > 0) {
    const readyAttackers = ai.board.filter(
      (c) =>
        !c.conditions.has('atordoado') &&
        !c.conditions.has('dormindo') &&
        c.templateId !== 'm_lamina_inverno' &&
        c.templateId !== 'n_pedrinha'
    );

    if (readyAttackers.length > 0) {
      return {
        type: 'attack',
        attackerIds: readyAttackers.map((c) => c.instanceId),
      };
    }
  }

  // 4. Default: Pass turn
  return { type: 'pass' };
}

// AI defense logic: chooses optimal blockers for incoming attackers
export function decideAiDefense(
  attackers: CardInstance[],
  aiBoard: CardInstance[],
  preAssignedBlocks: Record<string, string> = {}
): Record<string, string> {
  const blocks: Record<string, string> = { ...preAssignedBlocks };
  const availableDefenders = [
    ...aiBoard.filter(
      (c) =>
        !c.conditions.has('atordoado') &&
        !c.conditions.has('dormindo') &&
        c.templateId !== 'm_lamina_inverno'
    ),
  ];

  // Remove pre-assigned defenders (e.g. forced via Enfrentar)
  for (const assignedDefId of Object.values(preAssignedBlocks)) {
    const idx = availableDefenders.findIndex((d) => d.instanceId === assignedDefId);
    if (idx !== -1) availableDefenders.splice(idx, 1);
  }

  for (const attacker of attackers) {
    if (blocks[attacker.instanceId]) continue; // Already assigned
    if (availableDefenders.length === 0) break;

    const isFurtivoAttacker = attacker.conditions.has('furtividade');
    const isEtereoAttacker = attacker.conditions.has('etereo');

    // Find eligible defenders
    const eligible = availableDefenders.filter((d) => {
      if (isEtereoAttacker && !d.conditions.has('etereo')) {
        return false;
      }
      if (isFurtivoAttacker && !d.conditions.has('furtividade')) {
        return false;
      }
      return true;
    });

    if (eligible.length > 0) {
      // Prioritize defender with highest durability (HP + DEF)
      const best = [...eligible].sort((a, b) => b.hp + b.def - (a.hp + a.def))[0];

      blocks[attacker.instanceId] = best.instanceId;
      // Remove used defender so 1 card defends 1 attacker
      const idx = availableDefenders.findIndex((d) => d.instanceId === best.instanceId);
      if (idx !== -1) availableDefenders.splice(idx, 1);
    }
  }

  return blocks;
}
