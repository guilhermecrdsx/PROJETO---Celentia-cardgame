import type {
  CardInstance,
  ConditionEffect,
  GameLogEntry,
  PlayerState,
} from './game.ts';
import type { PlaymatId, CardBackId } from '../data/economy.ts';

export type PvpSeat = 'host' | 'guest';
export type PvpMatchType = 'normal' | 'ranked';
export type PvpRoomStatus = 'waiting' | 'playing' | 'finished' | 'rematch_prep';

export interface PvpRematchPrepDTO {
  roomCode: string;
  matchType: PvpMatchType;
  deadlineAt: number;
  host: PvpParticipantDTO;
  guest: PvpParticipantDTO;
  seat: PvpSeat;
}

export interface PvpParticipantDTO {
  uid: string;
  nickname: string;
  level: number;
  rankPoints: number;
  rankTier: string;
  avatarId: string;
  equippedPlaymat?: PlaymatId;
  equippedCardBack?: CardBackId;
  deckName: string;
  deckCardIds: string[];
  ready: boolean;
  connected: boolean;
}

export interface PvpRoomSummaryDTO {
  code: string;
  title: string;
  matchType: PvpMatchType;
  status: PvpRoomStatus;
  createdAt: number;
  hostNickname: string;
  hostLevel: number;
  hostRankTier: string;
  hostAvatarId: string;
  playerCount: number;
}

export interface PvpRoomDetailDTO {
  code: string;
  title: string;
  matchType: PvpMatchType;
  status: PvpRoomStatus;
  createdAt: number;
  host: PvpParticipantDTO;
  guest: PvpParticipantDTO | null;
}

export interface SerializedCardInstance
  extends Omit<CardInstance, 'conditions' | 'imprisonedUnit'> {
  conditions: ConditionEffect[];
  imprisonedUnit?: SerializedCardInstance;
}

export interface SerializedPlayerState
  extends Omit<PlayerState, 'deck' | 'hand' | 'board' | 'graveyard'> {
  deck: SerializedCardInstance[];
  hand: SerializedCardInstance[];
  board: SerializedCardInstance[];
  graveyard: SerializedCardInstance[];
}

export interface SerializedPendingSpell {
  spellCard: SerializedCardInstance;
  casterId: 'player' | 'opponent';
  description: string;
  targetName?: string;
  targetUnitId?: string;
  accepted?: boolean;
  consumesTurn?: boolean;
}

export interface OnlineMatchSnapshot {
  seq: number;
  round: number;
  roundTurnNumber?: number;
  turnPlayer: 'player' | 'opponent';
  attackerRole: 'player' | 'opponent';
  activeCombatAttackerRole: 'player' | 'opponent';
  consecutivePasses: number;
  attackerConsecutivePasses?: number;
  hasAttackedThisRound: boolean;
  isDefendingPhase: boolean;
  isPostAttackFinalTurn: boolean;
  postAttackRoundEndPending: boolean;
  declaredAttackers: SerializedCardInstance[];
  assignedBlocks: Record<string, string>;
  enfrentarLockedBlocks: Record<string, string>;
  pendingSpell: SerializedPendingSpell | null;
  votoSilencioActive: boolean;
  votoSilencioRoundsRemaining: number;
  playerCoinSide: 'sol' | 'lua';
  player: SerializedPlayerState;
  opponent: SerializedPlayerState;
  logs: GameLogEntry[];
  gameOverWinner: 'player' | 'opponent' | 'draw' | null;
  gameOverReason?: string;
  lastEventLabel?: string;
  opponentHasVeto?: boolean;
}

export interface OnlineMatchBootstrap {
  matchInstanceId?: string;
  roomCode: string;
  seat: PvpSeat;
  matchType: PvpMatchType;
  localDeckName: string;
  opponentUid: string;
  opponentName: string;
  opponentRank: string;
  opponentLevel: number;
  opponentAvatarId?: string;
  opponentPlaymat?: PlaymatId;
  opponentCardBack?: CardBackId;
  initialSnapshot: OnlineMatchSnapshot;
}

export function serializeCardInstance(
  card: CardInstance
): SerializedCardInstance {
  const conditionsList: ConditionEffect[] = Array.isArray(card.conditions)
    ? [...card.conditions]
    : card.conditions instanceof Set
    ? Array.from(card.conditions)
    : [];

  const { conditions: _cond, imprisonedUnit, ...rest } = card;
  return {
    ...rest,
    conditions: conditionsList,
    ...(imprisonedUnit
      ? { imprisonedUnit: serializeCardInstance(imprisonedUnit) }
      : {}),
  };
}

export function hydrateCardInstance(
  raw: SerializedCardInstance | CardInstance
): CardInstance {
  const condArray: ConditionEffect[] = Array.isArray(raw.conditions)
    ? raw.conditions
    : raw.conditions instanceof Set
    ? Array.from(raw.conditions)
    : [];

  const { imprisonedUnit, ...rest } = raw as SerializedCardInstance;
  return {
    ...rest,
    conditions: new Set<ConditionEffect>(condArray),
    ...(imprisonedUnit
      ? { imprisonedUnit: hydrateCardInstance(imprisonedUnit) }
      : {}),
  };
}

export function serializePlayerState(
  state: PlayerState
): SerializedPlayerState {
  return {
    ...state,
    deck: state.deck.map(serializeCardInstance),
    hand: state.hand.map(serializeCardInstance),
    board: state.board.map(serializeCardInstance),
    graveyard: state.graveyard.map(serializeCardInstance),
  };
}

export function hydratePlayerState(
  raw: SerializedPlayerState
): PlayerState {
  return {
    ...raw,
    deck: (raw.deck || []).map(hydrateCardInstance),
    hand: (raw.hand || []).map(hydrateCardInstance),
    board: (raw.board || []).map(hydrateCardInstance),
    graveyard: (raw.graveyard || []).map(hydrateCardInstance),
  };
}

export type ClientPvpMessage =
  | { type: 'AUTH'; token: string }
  | { type: 'PING' }
  | { type: 'LIST_ROOMS' }
  | {
      type: 'CREATE_ROOM';
      matchType: PvpMatchType;
      title?: string;
      deckName: string;
      deckCardIds: string[];
    }
  | {
      type: 'JOIN_ROOM';
      code: string;
      deckName: string;
      deckCardIds: string[];
      expectedMatchType?: PvpMatchType;
    }
  | {
      type: 'UPDATE_ROOM_LOADOUT';
      ready?: boolean;
      deckName?: string;
      deckCardIds?: string[];
    }
  | { type: 'LEAVE_ROOM' }
  | { type: 'START_MATCH' }
  | {
      type: 'SYNC_MATCH_STATE';
      snapshot: OnlineMatchSnapshot;
    }
  | {
      type: 'SURRENDER_MATCH';
      reason?: string;
    }
  | { type: 'REQUEST_REMATCH' }
  | { type: 'RESPOND_REMATCH'; accept: boolean }
  | {
      type: 'UPDATE_REMATCH_PREP';
      ready?: boolean;
      deckName?: string;
      deckCardIds?: string[];
    };

export type ServerPvpMessage =
  | { type: 'PONG' }
  | { type: 'AUTHENTICATED'; uid: string; nickname: string }
  | { type: 'LOBBY_LIST'; rooms: PvpRoomSummaryDTO[] }
  | { type: 'ROOM_STATE'; room: PvpRoomDetailDTO | null; seat: PvpSeat | null }
  | { type: 'MATCH_STARTED'; bootstrap: OnlineMatchBootstrap }
  | { type: 'MATCH_STATE'; snapshot: OnlineMatchSnapshot }
  | {
      type: 'MATCH_ACK';
      seq: number;
      opponentHandCount: number;
      opponentDeckCount: number;
      opponentHasVeto?: boolean;
    }
  | {
      type: 'OPPONENT_CONNECTION';
      connected: boolean;
      graceSeconds?: number;
    }
  | {
      type: 'OPPONENT_FORFEITED';
      winnerSeat: PvpSeat;
      reason: string;
    }
  | {
      type: 'REMATCH_REQUESTED';
      fromSeat: PvpSeat;
      fromName: string;
    }
  | {
      type: 'REMATCH_DECLINED';
      bySeat: PvpSeat;
      byName: string;
      reason?: string;
    }
  | {
      type: 'REMATCH_PREP_STATE';
      prep: PvpRematchPrepDTO;
    }
  | { type: 'PVP_ERROR'; message: string };
