import { getInMemoryAuthToken } from './accountApi';
import type {
  ClientPvpMessage,
  OnlineMatchBootstrap,
  OnlineMatchSnapshot,
  PvpMatchType,
  PvpRematchPrepDTO,
  PvpRoomDetailDTO,
  PvpRoomSummaryDTO,
  PvpSeat,
  ServerPvpMessage,
} from '../types/pvp';

type ServerMessageListener = (msg: ServerPvpMessage) => void;
type ConnectionListener = (connected: boolean) => void;

class PvpSocketClient {
  private ws: WebSocket | null = null;
  private isAuthenticated = false;
  private messageListeners = new Set<ServerMessageListener>();
  private connectionListeners = new Set<ConnectionListener>();
  private pingInterval: number | null = null;
  private reconnectTimeout: number | null = null;
  private shouldStayConnected = false;

  public connect(): void {
    this.shouldStayConnected = true;
    const token = getInMemoryAuthToken();
    if (!token) return;

    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/pvp?token=${encodeURIComponent(
      token
    )}`;

    const socket = new WebSocket(wsUrl);
    this.ws = socket;

    socket.onopen = () => {
      this.isAuthenticated = false;
      this.send({ type: 'AUTH', token });
      this.startHeartbeat();
      this.notifyConnection(true);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ServerPvpMessage;
        if (data.type === 'AUTHENTICATED') {
          this.isAuthenticated = true;
        }
        this.messageListeners.forEach((cb) => cb(data));
      } catch {
        // ignore malformed packets
      }
    };

    socket.onclose = (event) => {
      this.stopHeartbeat();
      this.isAuthenticated = false;
      this.notifyConnection(false);
      if (this.ws === socket) {
        this.ws = null;
      }
      if (event.code === 4001 || event.code === 4002) {
        this.shouldStayConnected = false;
        return;
      }
      if (this.shouldStayConnected && getInMemoryAuthToken()) {
        if (this.reconnectTimeout !== null) {
          window.clearTimeout(this.reconnectTimeout);
        }
        this.reconnectTimeout = window.setTimeout(() => {
          this.connect();
        }, 2000);
      }
    };

    socket.onerror = () => {
      // close handler manages reconnection
    };
  }

  public disconnect(): void {
    this.shouldStayConnected = false;
    if (this.reconnectTimeout !== null) {
      window.clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.stopHeartbeat();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.isAuthenticated = false;
    this.notifyConnection(false);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = window.setInterval(() => {
      this.send({ type: 'PING' });
    }, 15000);
  }

  private stopHeartbeat() {
    if (this.pingInterval !== null) {
      window.clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private notifyConnection(connected: boolean) {
    this.connectionListeners.forEach((cb) => cb(connected));
  }

  public isConnected(): boolean {
    return Boolean(this.ws && this.ws.readyState === WebSocket.OPEN);
  }

  public isReady(): boolean {
    return this.isConnected() && this.isAuthenticated;
  }

  public send(msg: ClientPvpMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    this.ws.send(JSON.stringify(msg));
    return true;
  }

  public subscribe(listener: ServerMessageListener): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  public subscribeConnection(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    listener(this.isConnected());
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  public listRooms() {
    this.send({ type: 'LIST_ROOMS' });
  }

  public createRoom(input: {
    matchType: PvpMatchType;
    title?: string;
    deckName: string;
    deckCardIds: string[];
  }) {
    this.send({
      type: 'CREATE_ROOM',
      ...input,
    });
  }

  public joinRoom(input: {
    code: string;
    deckName: string;
    deckCardIds: string[];
    expectedMatchType?: PvpMatchType;
  }) {
    this.send({
      type: 'JOIN_ROOM',
      ...input,
    });
  }

  public updateLoadout(input: {
    ready?: boolean;
    deckName?: string;
    deckCardIds?: string[];
  }) {
    this.send({
      type: 'UPDATE_ROOM_LOADOUT',
      ...input,
    });
  }

  public leaveRoom() {
    this.send({ type: 'LEAVE_ROOM' });
  }

  public startMatch() {
    this.send({ type: 'START_MATCH' });
  }

  public syncMatchState(snapshot: OnlineMatchSnapshot) {
    this.send({ type: 'SYNC_MATCH_STATE', snapshot });
  }

  public surrenderMatch(reason?: string) {
    this.send({ type: 'SURRENDER_MATCH', reason });
  }

  public requestRematch() {
    this.send({ type: 'REQUEST_REMATCH' });
  }

  public respondRematch(accept: boolean) {
    this.send({ type: 'RESPOND_REMATCH', accept });
  }

  public updateRematchPrep(input: {
    ready?: boolean;
    deckName?: string;
    deckCardIds?: string[];
  }) {
    this.send({
      type: 'UPDATE_REMATCH_PREP',
      ...input,
    });
  }
}

export const pvpSocket = new PvpSocketClient();

export type {
  OnlineMatchBootstrap,
  OnlineMatchSnapshot,
  PvpMatchType,
  PvpRematchPrepDTO,
  PvpRoomDetailDTO,
  PvpRoomSummaryDTO,
  PvpSeat,
  ServerPvpMessage,
};
