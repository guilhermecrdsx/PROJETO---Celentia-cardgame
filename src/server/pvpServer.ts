import type { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { verifyAuthToken } from '../middleware/auth.ts';
import { getPlayerStateByUidOrEmail } from '../db/playerRepository.ts';
import { DEFAULT_AVATAR_ID } from '../data/avatars.ts';
import { getRankInfo, type RankPolicyConfig, type RankTier } from '../utils/rankMath.ts';
import {
  buildDeckFromTemplateIds,
  dealInitialHand,
  DEFAULT_DECK_IDS,
  drawCardCurve,
} from '../logic/deckFactory.ts';
import type { GameLogEntry } from '../types/game.ts';
import {
  type OnlineMatchBootstrap,
  type OnlineMatchSnapshot,
  type PvpMatchType,
  type PvpParticipantDTO,
  type PvpRoomDetailDTO,
  type PvpRoomStatus,
  type PvpRoomSummaryDTO,
  type PvpSeat,
  type SerializedCardInstance,
  type SerializedPendingSpell,
  type SerializedPlayerState,
  serializeCardInstance,
} from '../types/pvp.ts';

interface ConnectedClient {
  ws: WebSocket;
  uid: string;
  email: string;
  nickname: string;
  level: number;
  rankPoints: number;
  rankTier: string;
  avatarId: string;
  rankBlockedTotal: boolean;
  rankBlockFromTier: RankTier | null;
  roomCode: string | null;
}

interface CanonicalParticipant extends PvpParticipantDTO {
  disconnectTimer?: ReturnType<typeof setTimeout> | null;
}

interface CanonicalOnlineMatchState {
  seq: number;
  round: number;
  roundTurnNumber: number;
  turnSeat: PvpSeat;
  attackerSeat: PvpSeat;
  activeCombatAttackerSeat: PvpSeat;
  consecutivePasses: number;
  attackerConsecutivePasses: number;
  hasAttackedThisRound: boolean;
  isDefendingPhase: boolean;
  isPostAttackFinalTurn: boolean;
  postAttackRoundEndPending: boolean;
  declaredAttackers: SerializedCardInstance[];
  assignedBlocks: Record<string, string>;
  enfrentarLockedBlocks: Record<string, string>;
  pendingSpell: {
    spellCard: SerializedCardInstance;
    casterSeat: PvpSeat;
    description: string;
    targetName?: string;
    targetUnitId?: string;
    accepted?: boolean;
    consumesTurn?: boolean;
  } | null;
  votoSilencioActive: boolean;
  votoSilencioRoundsRemaining: number;
  coinChoiceBySeat: Record<PvpSeat, 'sol' | 'lua'>;
  players: Record<PvpSeat, SerializedPlayerState>;
  logs: GameLogEntry[];
  gameOverWinnerSeat: PvpSeat | 'draw' | null;
  gameOverReason?: string;
}

interface ServerPvpRoom {
  code: string;
  title: string;
  matchType: PvpMatchType;
  status: PvpRoomStatus;
  createdAt: number;
  host: CanonicalParticipant;
  guest: CanonicalParticipant | null;
  matchState: CanonicalOnlineMatchState | null;
  winnerSeat: PvpSeat | 'draw' | null;
  rematchRequestedBySeat: PvpSeat | null;
  rematchPrepDeadlineAt: number | null;
  rematchPrepTimer: ReturnType<typeof setTimeout> | null;
}

const REMATCH_PREP_DURATION_MS = 30000;

function computeEffectiveRankLabel(
  points: number,
  policy: RankPolicyConfig | undefined,
  playerBlockedTotal: boolean,
  playerBlockedFromTier: RankTier | null
): string {
  return getRankInfo(points, {
    globalBlockedFromTier: policy?.blockedFromTier ?? null,
    playerBlockedTotal,
    playerBlockedFromTier,
  }).label;
}

function hasPlayableVetoInHand(
  hand: SerializedCardInstance[],
  round: number
): boolean {
  if (round < 10) return false;
  return hand.some(
    (c) =>
      c.templateId === 'n_veto_do_indomito' ||
      c.name.toLowerCase().includes('veto do indômito') ||
      c.name.toLowerCase().includes('veto do indomito')
  );
}

function generateRoomCode(existing: Set<string>): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 40; attempt++) {
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    if (!existing.has(code)) return code;
  }
  return `C${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

function sanitizeCardPerspective(
  card: SerializedCardInstance,
  localSeat: PvpSeat
): SerializedCardInstance {
  const mapOwner = (
    owner?: 'player' | 'opponent'
  ): 'player' | 'opponent' | undefined => {
    if (!owner) return undefined;
    // Canonical storage uses 'player' for host and 'opponent' for guest
    if (localSeat === 'host') return owner;
    return owner === 'player' ? 'opponent' : 'player';
  };

  return {
    ...card,
    imprisonedOriginalOwner: mapOwner(card.imprisonedOriginalOwner),
    ...(card.imprisonedUnit
      ? {
          imprisonedUnit: sanitizeCardPerspective(
            card.imprisonedUnit,
            localSeat
          ),
        }
      : {}),
  };
}

function createMaskedHiddenCard(
  index: number,
  prefix: 'hand' | 'deck'
): SerializedCardInstance {
  return {
    instanceId: `hidden_${prefix}_${index}_${Math.random().toString(36).slice(2, 6)}`,
    templateId: 'hidden_card_back',
    name: 'Carta Oculta',
    kingdom: 'granty',
    tier: 1,
    type: 'unit',
    element: 'Neutro',
    hp: 0,
    maxHp: 0,
    atk: 0,
    def: 0,
    power: 0,
    baseAtk: 0,
    baseDef: 0,
    basePower: 0,
    conditions: [],
    silencedRounds: 0,
    powerAlwaysActive: false,
    doublePower: false,
    canActThisRound: false,
  };
}

function mapCanonicalSeatToPerspective(
  seat: PvpSeat,
  viewerSeat: PvpSeat
): 'player' | 'opponent' {
  return seat === viewerSeat ? 'player' : 'opponent';
}

function mapPerspectiveToCanonicalSeat(
  perspective: 'player' | 'opponent',
  senderSeat: PvpSeat
): PvpSeat {
  if (perspective === 'player') return senderSeat;
  return senderSeat === 'host' ? 'guest' : 'host';
}

function sanitizeStateForViewer(
  canonical: CanonicalOnlineMatchState,
  viewerSeat: PvpSeat
): OnlineMatchSnapshot {
  const otherSeat: PvpSeat = viewerSeat === 'host' ? 'guest' : 'host';
  const localRaw = canonical.players[viewerSeat];
  const remoteRaw = canonical.players[otherSeat];

  const localPlayer: SerializedPlayerState = {
    ...localRaw,
    id: 'player',
    isAi: false,
    deck: localRaw.deck.map((c) => sanitizeCardPerspective(c, viewerSeat)),
    hand: localRaw.hand.map((c) => sanitizeCardPerspective(c, viewerSeat)),
    board: localRaw.board.map((c) => sanitizeCardPerspective(c, viewerSeat)),
    graveyard: localRaw.graveyard.map((c) =>
      sanitizeCardPerspective(c, viewerSeat)
    ),
  };

  // Fog-of-war: mask opponent's hand and deck identities while preserving counts
  const remotePlayer: SerializedPlayerState = {
    ...remoteRaw,
    id: 'opponent',
    isAi: false,
    deck: remoteRaw.deck.map((_, idx) => createMaskedHiddenCard(idx, 'deck')),
    hand: remoteRaw.hand.map((_, idx) => createMaskedHiddenCard(idx, 'hand')),
    board: remoteRaw.board.map((c) => sanitizeCardPerspective(c, viewerSeat)),
    graveyard: remoteRaw.graveyard.map((c) =>
      sanitizeCardPerspective(c, viewerSeat)
    ),
  };

  const pendingSpell: SerializedPendingSpell | null = canonical.pendingSpell
    ? {
        spellCard: sanitizeCardPerspective(
          canonical.pendingSpell.spellCard,
          viewerSeat
        ),
        casterId: mapCanonicalSeatToPerspective(
          canonical.pendingSpell.casterSeat,
          viewerSeat
        ),
        description: canonical.pendingSpell.description,
        targetName: canonical.pendingSpell.targetName,
        targetUnitId: canonical.pendingSpell.targetUnitId,
        accepted: canonical.pendingSpell.accepted,
        consumesTurn: canonical.pendingSpell.consumesTurn,
      }
    : null;

  return {
    seq: canonical.seq,
    round: canonical.round,
    roundTurnNumber: canonical.roundTurnNumber ?? 1,
    turnPlayer: mapCanonicalSeatToPerspective(canonical.turnSeat, viewerSeat),
    attackerRole: mapCanonicalSeatToPerspective(
      canonical.attackerSeat,
      viewerSeat
    ),
    activeCombatAttackerRole: mapCanonicalSeatToPerspective(
      canonical.activeCombatAttackerSeat,
      viewerSeat
    ),
    consecutivePasses: canonical.consecutivePasses,
    attackerConsecutivePasses: canonical.attackerConsecutivePasses ?? canonical.consecutivePasses ?? 0,
    hasAttackedThisRound: canonical.hasAttackedThisRound,
    isDefendingPhase: canonical.isDefendingPhase,
    isPostAttackFinalTurn: canonical.isPostAttackFinalTurn,
    postAttackRoundEndPending: canonical.postAttackRoundEndPending,
    declaredAttackers: canonical.declaredAttackers.map((c) =>
      sanitizeCardPerspective(c, viewerSeat)
    ),
    assignedBlocks: { ...canonical.assignedBlocks },
    enfrentarLockedBlocks: { ...canonical.enfrentarLockedBlocks },
    pendingSpell,
    votoSilencioActive: canonical.votoSilencioActive,
    votoSilencioRoundsRemaining: canonical.votoSilencioRoundsRemaining,
    playerCoinSide: canonical.coinChoiceBySeat[viewerSeat] || 'sol',
    player: localPlayer,
    opponent: remotePlayer,
    logs: canonical.logs,
    gameOverWinner:
      canonical.gameOverWinnerSeat === 'draw'
        ? 'draw'
        : canonical.gameOverWinnerSeat
        ? mapCanonicalSeatToPerspective(
            canonical.gameOverWinnerSeat,
            viewerSeat
          )
        : null,
    gameOverReason: canonical.gameOverReason,
    opponentHasVeto: hasPlayableVetoInHand(remoteRaw.hand, canonical.round),
  };
}

function unmapCardToHostCanonical(
  card: SerializedCardInstance,
  senderSeat: PvpSeat
): SerializedCardInstance {
  const toHostOwner = (
    owner?: 'player' | 'opponent'
  ): 'player' | 'opponent' | undefined => {
    if (!owner) return undefined;
    if (senderSeat === 'host') return owner;
    return owner === 'player' ? 'opponent' : 'player';
  };

  return {
    ...card,
    imprisonedOriginalOwner: toHostOwner(card.imprisonedOriginalOwner),
    ...(card.imprisonedUnit
      ? {
          imprisonedUnit: unmapCardToHostCanonical(
            card.imprisonedUnit,
            senderSeat
          ),
        }
      : {}),
  };
}

export interface PvpServerHooks {
  isQueueEnabled?: (matchType: PvpMatchType) => { enabled: boolean; reason?: string };
  getRankPolicy?: () => RankPolicyConfig;
}

export function setupPvpWebSocketServer(
  httpServer: HttpServer,
  hooks?: PvpServerHooks
) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/pvp' });

  const clientsByWs = new Map<WebSocket, ConnectedClient>();
  const rooms = new Map<string, ServerPvpRoom>();

  const sendToWs = (ws: WebSocket, payload: unknown) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  };

  const findWsForUid = (uid: string): ConnectedClient | null => {
    for (const client of clientsByWs.values()) {
      if (client.uid === uid && client.ws.readyState === WebSocket.OPEN) {
        return client;
      }
    }
    return null;
  };

  const toPublicParticipant = (
    p: CanonicalParticipant
  ): PvpParticipantDTO => ({
    uid: p.uid,
    nickname: p.nickname,
    level: p.level,
    rankPoints: p.rankPoints,
    rankTier: p.rankTier,
    avatarId: p.avatarId,
    deckName: p.deckName,
    deckCardIds: p.deckCardIds,
    ready: p.ready,
    connected: p.connected,
  });

  const toRoomDetail = (room: ServerPvpRoom): PvpRoomDetailDTO => ({
    code: room.code,
    title: room.title,
    matchType: room.matchType,
    status: room.status,
    createdAt: room.createdAt,
    host: toPublicParticipant(room.host),
    guest: room.guest ? toPublicParticipant(room.guest) : null,
  });

  const getLobbyList = (): PvpRoomSummaryDTO[] => {
    const list: PvpRoomSummaryDTO[] = [];
    for (const room of rooms.values()) {
      if (room.status === 'waiting') {
        list.push({
          code: room.code,
          title: room.title,
          matchType: room.matchType,
          status: room.status,
          createdAt: room.createdAt,
          hostNickname: room.host.nickname,
          hostLevel: room.host.level,
          hostRankTier: room.host.rankTier,
          hostAvatarId: room.host.avatarId,
          playerCount: room.guest ? 2 : 1,
        });
      }
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  };

  const broadcastLobbyList = () => {
    const summary = getLobbyList();
    for (const client of clientsByWs.values()) {
      const inPlayingRoom =
        client.roomCode && rooms.get(client.roomCode)?.status === 'playing';
      if (!inPlayingRoom) {
        sendToWs(client.ws, { type: 'LOBBY_LIST', rooms: summary });
      }
    }
  };

  const broadcastRoomState = (room: ServerPvpRoom) => {
    const detail = toRoomDetail(room);
    const hostClient = findWsForUid(room.host.uid);
    if (hostClient) {
      sendToWs(hostClient.ws, {
        type: 'ROOM_STATE',
        room: detail,
        seat: 'host',
      });
    }
    if (room.guest) {
      const guestClient = findWsForUid(room.guest.uid);
      if (guestClient) {
        sendToWs(guestClient.ws, {
          type: 'ROOM_STATE',
          room: detail,
          seat: 'guest',
        });
      }
    }
  };

  const cleanupRoom = (roomCode: string) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    if (room.host.disconnectTimer) clearTimeout(room.host.disconnectTimer);
    if (room.guest?.disconnectTimer) clearTimeout(room.guest.disconnectTimer);
    if (room.rematchPrepTimer) {
      clearTimeout(room.rematchPrepTimer);
      room.rematchPrepTimer = null;
    }
    for (const client of clientsByWs.values()) {
      if (client.roomCode === roomCode) {
        client.roomCode = null;
      }
    }
    rooms.delete(roomCode);
    broadcastLobbyList();
  };

  const broadcastRematchPrepState = (room: ServerPvpRoom) => {
    if (!room.guest || room.status !== 'rematch_prep' || !room.rematchPrepDeadlineAt) return;
    const hostPub = toPublicParticipant(room.host);
    const guestPub = toPublicParticipant(room.guest);
    const hostClient = findWsForUid(room.host.uid);
    const guestClient = findWsForUid(room.guest.uid);
    if (hostClient) {
      sendToWs(hostClient.ws, {
        type: 'REMATCH_PREP_STATE',
        prep: {
          roomCode: room.code,
          matchType: room.matchType,
          deadlineAt: room.rematchPrepDeadlineAt,
          host: hostPub,
          guest: guestPub,
          seat: 'host',
        },
      });
    }
    if (guestClient) {
      sendToWs(guestClient.ws, {
        type: 'REMATCH_PREP_STATE',
        prep: {
          roomCode: room.code,
          matchType: room.matchType,
          deadlineAt: room.rematchPrepDeadlineAt,
          host: hostPub,
          guest: guestPub,
          seat: 'guest',
        },
      });
    }
  };

  const launchMatchInRoom = (room: ServerPvpRoom) => {
    if (!room.guest) return;
    if (room.rematchPrepTimer) {
      clearTimeout(room.rematchPrepTimer);
      room.rematchPrepTimer = null;
    }
    room.status = 'playing';
    room.winnerSeat = null;
    room.rematchRequestedBySeat = null;
    room.rematchPrepDeadlineAt = null;
    room.host.ready = false;
    room.guest.ready = false;
    room.matchState = buildInitialCanonicalMatch(room);
    broadcastLobbyList();

    const matchInstanceId = `match_${room.code}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    const hostClient = findWsForUid(room.host.uid);
    const guestClient = findWsForUid(room.guest.uid);
    if (hostClient) {
      sendToWs(hostClient.ws, {
        type: 'MATCH_STARTED',
        bootstrap: {
          ...buildBootstrapForSeat(room, 'host'),
          matchInstanceId,
        },
      });
    }
    if (guestClient) {
      sendToWs(guestClient.ws, {
        type: 'MATCH_STARTED',
        bootstrap: {
          ...buildBootstrapForSeat(room, 'guest'),
          matchInstanceId,
        },
      });
    }
  };

  const removeClientFromCurrentRoom = (
    client: ConnectedClient,
    reason: 'left' | 'forfeit' = 'left'
  ) => {
    if (!client.roomCode) return;
    const room = rooms.get(client.roomCode);
    const prevCode = client.roomCode;
    if (!room) {
      client.roomCode = null;
      return;
    }

    const isHost = room.host.uid === client.uid;
    const isGuest = room.guest?.uid === client.uid;
    if (!isHost && !isGuest) {
      client.roomCode = null;
      return;
    }

    // Surrender during match keeps both players in finished room so loser can still request rematch
    if (room.status === 'playing' && reason === 'forfeit') {
      const winnerSeat: PvpSeat = isHost ? 'guest' : 'host';
      const remainingParticipant = isHost ? room.guest : room.host;
      room.status = 'finished';
      room.winnerSeat = winnerSeat;
      if (room.matchState) {
        room.matchState.gameOverWinnerSeat = winnerSeat;
        room.matchState.gameOverReason = `${client.nickname} rendeu-se do duelo.`;
      }
      if (remainingParticipant) {
        const remainingClient = findWsForUid(remainingParticipant.uid);
        if (remainingClient) {
          sendToWs(remainingClient.ws, {
            type: 'OPPONENT_FORFEITED',
            winnerSeat,
            reason: `${client.nickname} rendeu-se do duelo.`,
          });
        }
      }
      return;
    }

    client.roomCode = null;

    if (room.status === 'waiting') {
      if (isHost) {
        if (room.guest) {
          // Promote guest to host
          room.host = { ...room.guest, ready: false };
          room.guest = null;
          broadcastRoomState(room);
        } else {
          rooms.delete(prevCode);
        }
      } else if (isGuest) {
        room.guest = null;
        broadcastRoomState(room);
      }
      sendToWs(client.ws, { type: 'ROOM_STATE', room: null, seat: null });
      broadcastLobbyList();
      return;
    }

    if (room.status === 'playing') {
      const winnerSeat: PvpSeat = isHost ? 'guest' : 'host';
      const remainingParticipant = isHost ? room.guest : room.host;
      room.status = 'finished';
      room.winnerSeat = winnerSeat;
      if (remainingParticipant) {
        const remainingClient = findWsForUid(remainingParticipant.uid);
        if (remainingClient) {
          sendToWs(remainingClient.ws, {
            type: 'OPPONENT_FORFEITED',
            winnerSeat,
            reason: `${client.nickname} abandonou a sala.`,
          });
        }
      }
      cleanupRoom(prevCode);
      return;
    }

    // Leaving during finished post-match or rematch prep notifies opponent and closes room
    if (room.status === 'finished' || room.status === 'rematch_prep') {
      const leaverSeat: PvpSeat = isHost ? 'host' : 'guest';
      const remainingParticipant = isHost ? room.guest : room.host;
      if (remainingParticipant) {
        const remainingClient = findWsForUid(remainingParticipant.uid);
        if (remainingClient) {
          sendToWs(remainingClient.ws, {
            type: 'REMATCH_DECLINED',
            bySeat: leaverSeat,
            byName: client.nickname,
            reason: `${client.nickname} saiu da sala.`,
          });
        }
      }
      cleanupRoom(prevCode);
      return;
    }

    cleanupRoom(prevCode);
  };

  const buildInitialCanonicalMatch = (
    room: ServerPvpRoom
  ): CanonicalOnlineMatchState => {
    const hostDeckIds =
      room.host.deckCardIds.length === 20
        ? room.host.deckCardIds
        : DEFAULT_DECK_IDS;
    const guestDeckIds =
      room.guest && room.guest.deckCardIds.length === 20
        ? room.guest.deckCardIds
        : DEFAULT_DECK_IDS;

    const hostFull = buildDeckFromTemplateIds(hostDeckIds);
    const guestFull = buildDeckFromTemplateIds(guestDeckIds);

    const hostDealt = dealInitialHand(hostFull);
    const guestDealt = dealInitialHand(guestFull);

    const { card: hostAuto, remainingDeck: hostDeck } = drawCardCurve(
      hostDealt.remainingDeck,
      1
    );
    const { card: guestAuto, remainingDeck: guestDeck } = drawCardCurve(
      guestDealt.remainingDeck,
      1
    );

    const hostHand = hostAuto
      ? [...hostDealt.hand, hostAuto]
      : hostDealt.hand;
    const guestHand = guestAuto
      ? [...guestDealt.hand, guestAuto]
      : guestDealt.hand;

    const firstAttacker: PvpSeat = Math.random() < 0.5 ? 'host' : 'guest';
    const firstAttackerName =
      firstAttacker === 'host'
        ? room.host.nickname
        : room.guest?.nickname || 'Oponente';

    const hostPlayer: SerializedPlayerState = {
      id: 'player',
      name: room.host.nickname,
      isAi: false,
      hp: 5,
      maxHp: 5,
      deck: hostDeck.map(serializeCardInstance),
      hand: hostHand.map(serializeCardInstance),
      board: [],
      graveyard: [],
      hasDrawnThisRound: true,
      drawsCountThisRound: 1,
      extraDrawAvailableThisRound: false,
      extraDrawNextRound: false,
      summonsThisRound: 0,
      borRevivedOnce: false,
      zaelUsed: false,
      purpleExtraHpSlots: 0,
    };

    const guestPlayer: SerializedPlayerState = {
      id: 'opponent',
      name: room.guest?.nickname || 'Duelista',
      isAi: false,
      hp: 5,
      maxHp: 5,
      deck: guestDeck.map(serializeCardInstance),
      hand: guestHand.map(serializeCardInstance),
      board: [],
      graveyard: [],
      hasDrawnThisRound: true,
      drawsCountThisRound: 1,
      extraDrawAvailableThisRound: false,
      extraDrawNextRound: false,
      summonsThisRound: 0,
      borRevivedOnce: false,
      zaelUsed: false,
      purpleExtraHpSlots: 0,
    };

    return {
      seq: 1,
      round: 1,
      roundTurnNumber: 1,
      turnSeat: firstAttacker,
      attackerSeat: firstAttacker,
      activeCombatAttackerSeat: firstAttacker,
      consecutivePasses: 0,
      attackerConsecutivePasses: 0,
      hasAttackedThisRound: false,
      isDefendingPhase: false,
      isPostAttackFinalTurn: false,
      postAttackRoundEndPending: false,
      declaredAttackers: [],
      assignedBlocks: {},
      enfrentarLockedBlocks: {},
      pendingSpell: null,
      votoSilencioActive: false,
      votoSilencioRoundsRemaining: 0,
      coinChoiceBySeat: {
        host: firstAttacker === 'host' ? 'sol' : 'lua',
        guest: firstAttacker === 'guest' ? 'sol' : 'lua',
      },
      players: {
        host: hostPlayer,
        guest: guestPlayer,
      },
      logs: [
        {
          id: `log_init_${Date.now()}`,
          text: `🪙✨ Moeda Mágica Online: ${firstAttackerName} venceu o sorteio e começa como ATACANTE na Rodada 1!`,
          type: 'round',
          timestamp: Date.now(),
        },
      ],
      gameOverWinnerSeat: null,
    };
  };

  const buildBootstrapForSeat = (
    room: ServerPvpRoom,
    seat: PvpSeat
  ): OnlineMatchBootstrap => {
    const localP = seat === 'host' ? room.host : room.guest!;
    const remoteP = seat === 'host' ? room.guest! : room.host;
    return {
      roomCode: room.code,
      seat,
      matchType: room.matchType,
      localDeckName: localP.deckName,
      opponentUid: remoteP.uid,
      opponentName: remoteP.nickname,
      opponentRank: remoteP.rankTier,
      opponentLevel: remoteP.level,
      opponentAvatarId: remoteP.avatarId,
      initialSnapshot: sanitizeStateForViewer(room.matchState!, seat),
    };
  };

  const authenticateConnection = async (ws: WebSocket, token: string) => {
    const authUser = await verifyAuthToken(token);
    if (!authUser) {
      sendToWs(ws, {
        type: 'PVP_ERROR',
        message: 'Token de autenticação inválido para o PvP Online.',
      });
      ws.close(4001, 'Unauthorized');
      return null;
    }

    const dbState = await getPlayerStateByUidOrEmail(authUser.uid);
    const nickname = dbState?.nickname || authUser.nickname || 'Duelista';
    const level = dbState?.level ?? 1;
    const rankPoints = dbState?.rankPoints ?? 0;
    const avatarId = dbState?.avatarId || DEFAULT_AVATAR_ID;
    const rankBlockedTotal = Boolean(dbState?.rankBlockedTotal);
    const rankBlockFromTier = dbState?.rankBlockFromTier ?? null;
    const rankTier = computeEffectiveRankLabel(
      rankPoints,
      hooks?.getRankPolicy?.(),
      rankBlockedTotal,
      rankBlockFromTier
    );

    // Close duplicate active sockets for same uid cleanly (without forfeiting active room)
    for (const [otherWs, otherClient] of clientsByWs.entries()) {
      if (otherClient.uid === authUser.uid && otherWs !== ws) {
        otherClient.roomCode = null;
        clientsByWs.delete(otherWs);
        try {
          otherWs.close(4002, 'Replaced by new session');
        } catch {
          // ignore
        }
      }
    }

    const client: ConnectedClient = {
      ws,
      uid: authUser.uid,
      email: authUser.email,
      nickname,
      level,
      rankPoints,
      rankTier,
      avatarId,
      rankBlockedTotal,
      rankBlockFromTier,
      roomCode: null,
    };
    clientsByWs.set(ws, client);

    // Check if player has an active 'playing' room to resume
    for (const room of rooms.values()) {
      if (room.status === 'playing') {
        const seat: PvpSeat | null =
          room.host.uid === client.uid
            ? 'host'
            : room.guest?.uid === client.uid
            ? 'guest'
            : null;
        if (seat) {
          const participant = seat === 'host' ? room.host : room.guest!;
          if (participant.disconnectTimer) {
            clearTimeout(participant.disconnectTimer);
            participant.disconnectTimer = null;
          }
          participant.connected = true;
          client.roomCode = room.code;
          sendToWs(ws, {
            type: 'AUTHENTICATED',
            uid: client.uid,
            nickname: client.nickname,
          });
          // Notify opponent that player reconnected
          const otherSeat: PvpSeat = seat === 'host' ? 'guest' : 'host';
          const otherParticipant =
            otherSeat === 'host' ? room.host : room.guest;
          if (otherParticipant) {
            const otherClient = findWsForUid(otherParticipant.uid);
            if (otherClient) {
              sendToWs(otherClient.ws, {
                type: 'OPPONENT_CONNECTION',
                connected: true,
              });
            }
          }
          if (room.matchState) {
            sendToWs(ws, {
              type: 'MATCH_STARTED',
              bootstrap: buildBootstrapForSeat(room, seat),
            });
          }
          return client;
        }
      }
    }

    sendToWs(ws, {
      type: 'AUTHENTICATED',
      uid: client.uid,
      nickname: client.nickname,
    });
    sendToWs(ws, { type: 'LOBBY_LIST', rooms: getLobbyList() });
    return client;
  };

  wss.on('connection', async (ws, req) => {
    let client: ConnectedClient | null = null;
    let authInFlight: Promise<ConnectedClient | null> | null = null;

    const runAuthOnce = (token: string): Promise<ConnectedClient | null> => {
      if (client) return Promise.resolve(client);
      if (authInFlight) return authInFlight;
      authInFlight = authenticateConnection(ws, token)
        .then((authed) => {
          if (authed) client = authed;
          return authed;
        })
        .finally(() => {
          authInFlight = null;
        });
      return authInFlight;
    };

    try {
      const urlObj = new URL(req.url || '/ws/pvp', 'http://localhost');
      const queryToken = urlObj.searchParams.get('token') || '';
      if (queryToken) {
        await runAuthOnce(queryToken);
      }
    } catch {
      // Fall back to explicit AUTH message
    }

    ws.on('message', async (raw) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (!msg || typeof msg.type !== 'string') return;

      if (msg.type === 'PING') {
        sendToWs(ws, { type: 'PONG' });
        return;
      }

      if (msg.type === 'AUTH') {
        if (!client && typeof msg.token === 'string') {
          await runAuthOnce(msg.token);
        }
        return;
      }

      if (!client && authInFlight) {
        await authInFlight;
      }

      if (!client) {
        sendToWs(ws, {
          type: 'PVP_ERROR',
          message: 'Conexão não autenticada.',
        });
        return;
      }

      switch (msg.type) {
        case 'LIST_ROOMS': {
          sendToWs(ws, { type: 'LOBBY_LIST', rooms: getLobbyList() });
          break;
        }

        case 'CREATE_ROOM': {
          const matchType: PvpMatchType =
            msg.matchType === 'ranked' ? 'ranked' : 'normal';
          const queueStatus = hooks?.isQueueEnabled?.(matchType);
          if (queueStatus && !queueStatus.enabled) {
            sendToWs(ws, {
              type: 'PVP_ERROR',
              message:
                queueStatus.reason ||
                `A fila ${matchType === 'ranked' ? 'Ranqueada' : 'PvP Normal'} está temporariamente indisponível.`,
            });
            return;
          }
          removeClientFromCurrentRoom(client, 'left');
          const deckIds =
            Array.isArray(msg.deckCardIds) && msg.deckCardIds.length === 20
              ? msg.deckCardIds
              : DEFAULT_DECK_IDS;
          const code = generateRoomCode(new Set(rooms.keys()));
          const title =
            typeof msg.title === 'string' && msg.title.trim()
              ? msg.title.trim().slice(0, 36)
              : `Mesa de ${client.nickname}`;

          const freshRankTier = computeEffectiveRankLabel(
            client.rankPoints,
            hooks?.getRankPolicy?.(),
            client.rankBlockedTotal,
            client.rankBlockFromTier
          );
          client.rankTier = freshRankTier;

          const room: ServerPvpRoom = {
            code,
            title,
            matchType,
            status: 'waiting',
            createdAt: Date.now(),
            host: {
              uid: client.uid,
              nickname: client.nickname,
              level: client.level,
              rankPoints: client.rankPoints,
              rankTier: freshRankTier,
              avatarId: client.avatarId,
              deckName:
                typeof msg.deckName === 'string' && msg.deckName.trim()
                  ? msg.deckName.trim()
                  : 'Tríade Elemental',
              deckCardIds: deckIds,
              ready: false,
              connected: true,
              disconnectTimer: null,
            },
            guest: null,
            matchState: null,
            winnerSeat: null,
            rematchRequestedBySeat: null,
            rematchPrepDeadlineAt: null,
            rematchPrepTimer: null,
          };

          rooms.set(code, room);
          client.roomCode = code;
          broadcastRoomState(room);
          broadcastLobbyList();
          break;
        }

        case 'JOIN_ROOM': {
          const code =
            typeof msg.code === 'string' ? msg.code.trim().toUpperCase() : '';
          const room = rooms.get(code);
          if (!room) {
            sendToWs(ws, {
              type: 'PVP_ERROR',
              message: `Sala "${code}" não encontrada ou já encerrada.`,
            });
            return;
          }
          if (room.status !== 'waiting') {
            sendToWs(ws, {
              type: 'PVP_ERROR',
              message: 'Esta partida já está em andamento.',
            });
            return;
          }
          const joinQueueStatus = hooks?.isQueueEnabled?.(room.matchType);
          if (joinQueueStatus && !joinQueueStatus.enabled) {
            sendToWs(ws, {
              type: 'PVP_ERROR',
              message:
                joinQueueStatus.reason ||
                `A fila ${room.matchType === 'ranked' ? 'Ranqueada' : 'PvP Normal'} está temporariamente indisponível.`,
            });
            return;
          }
          if (
            (msg.expectedMatchType === 'normal' ||
              msg.expectedMatchType === 'ranked') &&
            room.matchType !== msg.expectedMatchType
          ) {
            sendToWs(ws, {
              type: 'PVP_ERROR',
              message: `Esta sala pertence ao modo ${
                room.matchType === 'ranked' ? 'Ranqueado' : 'Normal'
              }. Volte à tela de modos e selecione o modo correspondente.`,
            });
            return;
          }
          if (room.host.uid === client.uid) {
            client.roomCode = code;
            broadcastRoomState(room);
            return;
          }
          if (room.guest && room.guest.uid !== client.uid) {
            sendToWs(ws, {
              type: 'PVP_ERROR',
              message: 'Esta sala já está cheia (2/2 duelistas).',
            });
            return;
          }

          removeClientFromCurrentRoom(client, 'left');
          const deckIds =
            Array.isArray(msg.deckCardIds) && msg.deckCardIds.length === 20
              ? msg.deckCardIds
              : DEFAULT_DECK_IDS;

          const guestRankTier = computeEffectiveRankLabel(
            client.rankPoints,
            hooks?.getRankPolicy?.(),
            client.rankBlockedTotal,
            client.rankBlockFromTier
          );
          client.rankTier = guestRankTier;

          room.guest = {
            uid: client.uid,
            nickname: client.nickname,
            level: client.level,
            rankPoints: client.rankPoints,
            rankTier: guestRankTier,
            avatarId: client.avatarId,
            deckName:
              typeof msg.deckName === 'string' && msg.deckName.trim()
                ? msg.deckName.trim()
                : 'Tríade Elemental',
            deckCardIds: deckIds,
            ready: false,
            connected: true,
            disconnectTimer: null,
          };
          client.roomCode = code;
          broadcastRoomState(room);
          broadcastLobbyList();
          break;
        }

        case 'UPDATE_ROOM_LOADOUT': {
          if (!client.roomCode) return;
          const room = rooms.get(client.roomCode);
          if (!room || room.status !== 'waiting') return;

          const participant =
            room.host.uid === client.uid
              ? room.host
              : room.guest?.uid === client.uid
              ? room.guest
              : null;
          if (!participant) return;

          if (typeof msg.ready === 'boolean') {
            participant.ready = msg.ready;
          }
          if (typeof msg.deckName === 'string' && msg.deckName.trim()) {
            participant.deckName = msg.deckName.trim();
          }
          if (
            Array.isArray(msg.deckCardIds) &&
            msg.deckCardIds.length === 20
          ) {
            participant.deckCardIds = msg.deckCardIds;
          }
          broadcastRoomState(room);
          break;
        }

        case 'LEAVE_ROOM': {
          removeClientFromCurrentRoom(client, 'left');
          break;
        }

        case 'START_MATCH': {
          if (!client.roomCode) return;
          const room = rooms.get(client.roomCode);
          if (!room || room.status !== 'waiting') return;
          if (room.host.uid !== client.uid) {
            sendToWs(ws, {
              type: 'PVP_ERROR',
              message: 'Apenas o anfitrião da sala pode iniciar o duelo.',
            });
            return;
          }
          if (!room.guest) {
            sendToWs(ws, {
              type: 'PVP_ERROR',
              message: 'Aguardando um segundo duelista entrar na sala.',
            });
            return;
          }
          if (!room.host.ready || !room.guest.ready) {
            sendToWs(ws, {
              type: 'PVP_ERROR',
              message: 'Ambos os duelistas precisam marcar "Estou Pronto".',
            });
            return;
          }

          launchMatchInRoom(room);
          break;
        }

        case 'SYNC_MATCH_STATE': {
          if (!client.roomCode) return;
          const room = rooms.get(client.roomCode);
          if (!room || room.status !== 'playing' || !room.matchState) return;

          const seat: PvpSeat | null =
            room.host.uid === client.uid
              ? 'host'
              : room.guest?.uid === client.uid
              ? 'guest'
              : null;
          if (!seat) return;

          const incoming: OnlineMatchSnapshot | undefined = msg.snapshot;
          if (!incoming || typeof incoming.seq !== 'number') return;

          const canonical = room.matchState;
          const otherSeat: PvpSeat = seat === 'host' ? 'guest' : 'host';

          // Validate permission: active turn player, active defender, counter-responder, or game-over
          const canAct =
            incoming.gameOverWinner !== null ||
            canonical.turnSeat === seat ||
            (canonical.isDefendingPhase &&
              canonical.activeCombatAttackerSeat !== seat) ||
            (canonical.pendingSpell !== null &&
              canonical.pendingSpell.casterSeat !== seat) ||
            (incoming.isDefendingPhase &&
              mapPerspectiveToCanonicalSeat(
                incoming.activeCombatAttackerRole,
                seat
              ) === seat);

          if (!canAct) {
            return;
          }

          // Ignore stale out-of-order packets
          if (incoming.seq < canonical.seq) {
            return;
          }

          // 1. Update sender's own player state (preserving canonical deck/hand)
          const senderMappedPlayer: SerializedPlayerState = {
            ...incoming.player,
            id: seat === 'host' ? 'player' : 'opponent',
            isAi: false,
            deck: incoming.player.deck.map((c) =>
              unmapCardToHostCanonical(c, seat)
            ),
            hand: incoming.player.hand.map((c) =>
              unmapCardToHostCanonical(c, seat)
            ),
            board: incoming.player.board.map((c) =>
              unmapCardToHostCanonical(c, seat)
            ),
            graveyard: incoming.player.graveyard.map((c) =>
              unmapCardToHostCanonical(c, seat)
            ),
          };

          // 2. Update other player's public state while protecting their real hidden hand & deck
          const prevOther = canonical.players[otherSeat];
          let nextOtherHand = [...prevOther.hand];
          let nextOtherDeck = [...prevOther.deck];
          // Filter out any masked fog-of-war placeholder cards that could have been moved into graveyard/board
          let nextOtherGraveyard = incoming.opponent.graveyard
            .filter((c) => c.templateId !== 'hidden_card_back')
            .map((c) => unmapCardToHostCanonical(c, seat));

          // If an effect caused the remote player to lose cards from hand (random discard)
          const targetOtherHandCount = incoming.opponent.hand.length;
          if (targetOtherHandCount < nextOtherHand.length) {
            const diff = nextOtherHand.length - targetOtherHandCount;
            for (let i = 0; i < diff && nextOtherHand.length > 0; i++) {
              const randIdx = Math.floor(Math.random() * nextOtherHand.length);
              const [removed] = nextOtherHand.splice(randIdx, 1);
              if (
                removed &&
                !nextOtherGraveyard.some(
                  (g) => g.instanceId === removed.instanceId
                )
              ) {
                nextOtherGraveyard.push(removed);
              }
            }
          }

          // If an effect caused the remote player to draw from deck
          const targetOtherDeckCount = incoming.opponent.deck.length;
          if (
            targetOtherDeckCount < nextOtherDeck.length &&
            targetOtherHandCount > nextOtherHand.length
          ) {
            const drawDiff = Math.min(
              nextOtherDeck.length - targetOtherDeckCount,
              targetOtherHandCount - nextOtherHand.length
            );
            for (let i = 0; i < drawDiff && nextOtherDeck.length > 0; i++) {
              const drawn = nextOtherDeck.shift();
              if (drawn) nextOtherHand.push(drawn);
            }
          }

          const updatedOtherPlayer: SerializedPlayerState = {
            ...incoming.opponent,
            id: otherSeat === 'host' ? 'player' : 'opponent',
            isAi: false,
            deck: nextOtherDeck,
            hand: nextOtherHand,
            board: incoming.opponent.board
              .filter((c) => c.templateId !== 'hidden_card_back')
              .map((c) => unmapCardToHostCanonical(c, seat)),
            graveyard: nextOtherGraveyard,
          };

          const nextSeq = canonical.seq + 1;
          const nextCanonical: CanonicalOnlineMatchState = {
            seq: nextSeq,
            round: incoming.round,
            roundTurnNumber: incoming.roundTurnNumber ?? canonical.roundTurnNumber ?? 1,
            turnSeat: mapPerspectiveToCanonicalSeat(incoming.turnPlayer, seat),
            attackerSeat: mapPerspectiveToCanonicalSeat(
              incoming.attackerRole,
              seat
            ),
            activeCombatAttackerSeat: mapPerspectiveToCanonicalSeat(
              incoming.activeCombatAttackerRole,
              seat
            ),
            consecutivePasses: incoming.consecutivePasses,
            attackerConsecutivePasses:
              incoming.attackerConsecutivePasses ?? incoming.consecutivePasses ?? 0,
            hasAttackedThisRound: incoming.hasAttackedThisRound,
            isDefendingPhase: incoming.isDefendingPhase,
            isPostAttackFinalTurn: incoming.isPostAttackFinalTurn,
            postAttackRoundEndPending: incoming.postAttackRoundEndPending,
            declaredAttackers: incoming.declaredAttackers.map((c) =>
              unmapCardToHostCanonical(c, seat)
            ),
            assignedBlocks: { ...incoming.assignedBlocks },
            enfrentarLockedBlocks: { ...incoming.enfrentarLockedBlocks },
            pendingSpell: incoming.pendingSpell
              ? {
                  spellCard: unmapCardToHostCanonical(
                    incoming.pendingSpell.spellCard,
                    seat
                  ),
                  casterSeat: mapPerspectiveToCanonicalSeat(
                    incoming.pendingSpell.casterId,
                    seat
                  ),
                  description: incoming.pendingSpell.description,
                  targetName: incoming.pendingSpell.targetName,
                  targetUnitId: incoming.pendingSpell.targetUnitId,
                  accepted: Boolean(incoming.pendingSpell.accepted),
                  consumesTurn: incoming.pendingSpell.consumesTurn,
                }
              : null,
            votoSilencioActive: incoming.votoSilencioActive,
            votoSilencioRoundsRemaining: incoming.votoSilencioRoundsRemaining,
            coinChoiceBySeat: canonical.coinChoiceBySeat,
            players: {
              ...canonical.players,
              [seat]: senderMappedPlayer,
              [otherSeat]: updatedOtherPlayer,
            },
            logs: incoming.logs.slice(0, 80),
            gameOverWinnerSeat:
              incoming.gameOverWinner === 'draw'
                ? 'draw'
                : incoming.gameOverWinner
                ? mapPerspectiveToCanonicalSeat(incoming.gameOverWinner, seat)
                : null,
            gameOverReason: incoming.gameOverReason,
          };

          room.matchState = nextCanonical;
          if (nextCanonical.gameOverWinnerSeat !== null) {
            room.status = 'finished';
            room.winnerSeat = nextCanonical.gameOverWinnerSeat;
          }

          // Acknowledge seq to sender
          sendToWs(ws, {
            type: 'MATCH_ACK',
            seq: nextSeq,
            opponentHandCount: nextOtherHand.length,
            opponentDeckCount: nextOtherDeck.length,
            opponentHasVeto: hasPlayableVetoInHand(
              nextOtherHand,
              nextCanonical.round
            ),
          });

          // Send perspective-mapped sanitized state to the other participant
          const otherParticipant =
            otherSeat === 'host' ? room.host : room.guest;
          if (otherParticipant) {
            const otherClient = findWsForUid(otherParticipant.uid);
            if (otherClient) {
              sendToWs(otherClient.ws, {
                type: 'MATCH_STATE',
                snapshot: sanitizeStateForViewer(nextCanonical, otherSeat),
              });
            }
          }
          break;
        }

        case 'SURRENDER_MATCH': {
          removeClientFromCurrentRoom(client, 'forfeit');
          break;
        }

        case 'REQUEST_REMATCH': {
          if (!client.roomCode) {
            sendToWs(ws, {
              type: 'PVP_ERROR',
              message: 'A sala da partida já foi encerrada.',
            });
            return;
          }
          const room = rooms.get(client.roomCode);
          if (!room || !room.guest) {
            sendToWs(ws, {
              type: 'PVP_ERROR',
              message: 'O adversário não está mais conectado na sala.',
            });
            return;
          }
          if (room.status !== 'finished') {
            sendToWs(ws, {
              type: 'PVP_ERROR',
              message: 'A revanche só pode ser solicitada após o término da partida.',
            });
            return;
          }
          const seat: PvpSeat | null =
            room.host.uid === client.uid
              ? 'host'
              : room.guest.uid === client.uid
              ? 'guest'
              : null;
          if (!seat) return;

          // Authoritative Rule: ONLY the losing player can initiate a rematch
          if (
            !room.winnerSeat ||
            room.winnerSeat === 'draw' ||
            room.winnerSeat === seat
          ) {
            sendToWs(ws, {
              type: 'PVP_ERROR',
              message: 'Apenas o jogador derrotado pode solicitar uma revanche.',
            });
            return;
          }

          const opponentParticipant = seat === 'host' ? room.guest : room.host;
          const opponentClient = findWsForUid(opponentParticipant.uid);
          if (!opponentClient) {
            sendToWs(ws, {
              type: 'REMATCH_DECLINED',
              bySeat: seat === 'host' ? 'guest' : 'host',
              byName: opponentParticipant.nickname,
              reason: `${opponentParticipant.nickname} já saiu da sala.`,
            });
            return;
          }

          room.rematchRequestedBySeat = seat;
          sendToWs(opponentClient.ws, {
            type: 'REMATCH_REQUESTED',
            fromSeat: seat,
            fromName: client.nickname,
          });
          break;
        }

        case 'RESPOND_REMATCH': {
          if (!client.roomCode) return;
          const room = rooms.get(client.roomCode);
          if (!room || !room.guest || room.status !== 'finished') return;

          const seat: PvpSeat | null =
            room.host.uid === client.uid
              ? 'host'
              : room.guest.uid === client.uid
              ? 'guest'
              : null;
          if (!seat || !room.rematchRequestedBySeat || room.rematchRequestedBySeat === seat) {
            return;
          }

          const requesterSeat = room.rematchRequestedBySeat;
          const requesterParticipant =
            requesterSeat === 'host' ? room.host : room.guest;
          const requesterClient = findWsForUid(requesterParticipant.uid);

          if (!msg.accept) {
            room.rematchRequestedBySeat = null;
            if (requesterClient) {
              sendToWs(requesterClient.ws, {
                type: 'REMATCH_DECLINED',
                bySeat: seat,
                byName: client.nickname,
                reason: `${client.nickname} recusou o pedido de revanche.`,
              });
            }
            return;
          }

          if (!requesterClient) {
            sendToWs(ws, {
              type: 'REMATCH_DECLINED',
              bySeat: requesterSeat,
              byName: requesterParticipant.nickname,
              reason: `${requesterParticipant.nickname} saiu da sala antes do início.`,
            });
            cleanupRoom(room.code);
            return;
          }

          // Accepted! Enter server-authoritative Rematch Deck Preparation Screen with 30s forced-start timer
          room.status = 'rematch_prep';
          room.rematchRequestedBySeat = null;
          room.host.ready = false;
          room.guest.ready = false;
          room.rematchPrepDeadlineAt = Date.now() + REMATCH_PREP_DURATION_MS;

          if (room.rematchPrepTimer) {
            clearTimeout(room.rematchPrepTimer);
          }
          room.rematchPrepTimer = setTimeout(() => {
            if (room.status === 'rematch_prep' && room.guest) {
              launchMatchInRoom(room);
            }
          }, REMATCH_PREP_DURATION_MS);

          broadcastRematchPrepState(room);
          break;
        }

        case 'UPDATE_REMATCH_PREP': {
          if (!client.roomCode) return;
          const room = rooms.get(client.roomCode);
          if (!room || !room.guest || room.status !== 'rematch_prep') return;

          const participant =
            room.host.uid === client.uid
              ? room.host
              : room.guest.uid === client.uid
              ? room.guest
              : null;
          if (!participant) return;

          if (typeof msg.ready === 'boolean') {
            participant.ready = msg.ready;
          }
          if (typeof msg.deckName === 'string' && msg.deckName.trim()) {
            participant.deckName = msg.deckName.trim();
          }
          if (
            Array.isArray(msg.deckCardIds) &&
            msg.deckCardIds.length === 20
          ) {
            participant.deckCardIds = msg.deckCardIds;
          }

          if (room.host.ready && room.guest.ready) {
            launchMatchInRoom(room);
          } else {
            broadcastRematchPrepState(room);
          }
          break;
        }
      }
    });

    ws.on('close', () => {
      const disconnectedClient = clientsByWs.get(ws);
      clientsByWs.delete(ws);
      if (!disconnectedClient || !disconnectedClient.roomCode) return;

      const room = rooms.get(disconnectedClient.roomCode);
      if (!room) return;

      if (
        room.status === 'waiting' ||
        room.status === 'finished' ||
        room.status === 'rematch_prep'
      ) {
        removeClientFromCurrentRoom(disconnectedClient, 'left');
        return;
      }

      if (room.status === 'playing') {
        const seat: PvpSeat | null =
          room.host.uid === disconnectedClient.uid
            ? 'host'
            : room.guest?.uid === disconnectedClient.uid
            ? 'guest'
            : null;
        if (!seat) return;

        const participant = seat === 'host' ? room.host : room.guest!;
        const otherSeat: PvpSeat = seat === 'host' ? 'guest' : 'host';
        const otherParticipant =
          otherSeat === 'host' ? room.host : room.guest;

        participant.connected = false;
        if (otherParticipant) {
          const otherClient = findWsForUid(otherParticipant.uid);
          if (otherClient) {
            sendToWs(otherClient.ws, {
              type: 'OPPONENT_CONNECTION',
              connected: false,
              graceSeconds: 20,
            });
          }
        }

        if (participant.disconnectTimer) {
          clearTimeout(participant.disconnectTimer);
        }
        participant.disconnectTimer = setTimeout(() => {
          if (room.status === 'playing' && !participant.connected) {
            room.status = 'finished';
            if (otherParticipant) {
              const otherClient = findWsForUid(otherParticipant.uid);
              if (otherClient) {
                sendToWs(otherClient.ws, {
                  type: 'OPPONENT_FORFEITED',
                  winnerSeat: otherSeat,
                  reason: `${participant.nickname} perdeu a conexão e não retornou a tempo.`,
                });
              }
            }
            cleanupRoom(room.code);
          }
        }, 20000);
      }
    });
  });

  return wss;
}
