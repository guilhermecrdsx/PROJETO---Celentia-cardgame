import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Crown,
  Layers,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Swords,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { sound } from '../services/soundEffects';
import { useModeQueues } from '../services/modeQueuesService';
import { AvatarPortrait } from './AvatarPortrait';
import { DEFAULT_AVATAR_ID } from '../data/avatars';
import {
  OnlineMatchBootstrap,
  PvpMatchType,
  PvpRoomDetailDTO,
  PvpRoomSummaryDTO,
  PvpSeat,
  pvpSocket,
} from '../services/pvpSocket';

interface PvpLobbyModalProps {
  isOpen: boolean;
  initialMatchType: PvpMatchType;
  activeDeckName: string;
  activeDeckCardIds: string[];
  onClose: () => void;
  onOpenDeckSelector: () => void;
  onMatchStarted: (bootstrap: OnlineMatchBootstrap) => void;
}

export const PvpLobbyModal: React.FC<PvpLobbyModalProps> = ({
  isOpen,
  initialMatchType,
  activeDeckName,
  activeDeckCardIds,
  onClose,
  onOpenDeckSelector,
  onMatchStarted,
}) => {
  const matchTypeFilter: PvpMatchType = initialMatchType;
  const { queues } = useModeQueues();
  const activeQueueStatus =
    matchTypeFilter === 'ranked' ? queues.pvp_ranked : queues.pvp_normal;
  const isQueueClosed = !activeQueueStatus.enabled;
  const [isConnected, setIsConnected] = useState<boolean>(
    pvpSocket.isConnected()
  );
  const [rooms, setRooms] = useState<PvpRoomSummaryDTO[]>([]);
  const [currentRoom, setCurrentRoom] = useState<PvpRoomDetailDTO | null>(null);
  const [seat, setSeat] = useState<PvpSeat | null>(null);
  const [roomTitle, setRoomTitle] = useState<string>('');
  const [joinCode, setJoinCode] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Sync deck changes live if player swaps deck while inside waiting room
  useEffect(() => {
    if (isOpen && currentRoom && currentRoom.status === 'waiting') {
      pvpSocket.updateLoadout({
        deckName: activeDeckName,
        deckCardIds: activeDeckCardIds,
      });
    }
  }, [isOpen, currentRoom?.code, activeDeckName, activeDeckCardIds]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentRoom(null);
      setSeat(null);
      setErrorMsg(null);
      setCopiedCode(false);
      return;
    }

    pvpSocket.connect();
    const unsubConn = pvpSocket.subscribeConnection((connected) => {
      setIsConnected(connected);
      if (connected) {
        pvpSocket.listRooms();
      }
    });

    const unsubMsg = pvpSocket.subscribe((msg) => {
      switch (msg.type) {
        case 'AUTHENTICATED':
          setErrorMsg(null);
          pvpSocket.listRooms();
          break;
        case 'LOBBY_LIST':
          setRooms(msg.rooms);
          break;
        case 'ROOM_STATE':
          setCurrentRoom(msg.room);
          setSeat(msg.seat);
          setErrorMsg(null);
          break;
        case 'MATCH_STARTED':
          sound.playSummon();
          onMatchStarted(msg.bootstrap);
          break;
        case 'PVP_ERROR':
          sound.playDiscard();
          setErrorMsg(msg.message);
          break;
      }
    });

    return () => {
      unsubConn();
      unsubMsg();
    };
  }, [isOpen, onMatchStarted]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (currentRoom) {
      pvpSocket.leaveRoom();
      setCurrentRoom(null);
      setSeat(null);
    }
    onClose();
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (isQueueClosed) {
      setErrorMsg(
        activeQueueStatus.reason ||
          'Esta fila PvP está temporariamente indisponível.'
      );
      return;
    }
    setErrorMsg(null);
    sound.playSummon();
    pvpSocket.createRoom({
      matchType: matchTypeFilter,
      title: roomTitle.trim() || undefined,
      deckName: activeDeckName,
      deckCardIds: activeDeckCardIds,
    });
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (isQueueClosed) {
      setErrorMsg(
        activeQueueStatus.reason ||
          'Esta fila PvP está temporariamente indisponível.'
      );
      return;
    }
    const cleaned = joinCode.trim().toUpperCase();
    if (!cleaned) {
      setErrorMsg('Digite o código da sala para entrar.');
      return;
    }
    setErrorMsg(null);
    sound.playDraw();
    pvpSocket.joinRoom({
      code: cleaned,
      deckName: activeDeckName,
      deckCardIds: activeDeckCardIds,
      expectedMatchType: matchTypeFilter,
    });
  };

  const handleJoinFromList = (code: string) => {
    if (isQueueClosed) {
      setErrorMsg(
        activeQueueStatus.reason ||
          'Esta fila PvP está temporariamente indisponível.'
      );
      return;
    }
    setErrorMsg(null);
    sound.playDraw();
    pvpSocket.joinRoom({
      code,
      deckName: activeDeckName,
      deckCardIds: activeDeckCardIds,
      expectedMatchType: matchTypeFilter,
    });
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      sound.playTick();
      setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const myParticipant =
    currentRoom && seat === 'host'
      ? currentRoom.host
      : currentRoom && seat === 'guest'
      ? currentRoom.guest
      : null;

  const canHostStart = Boolean(
    currentRoom &&
      seat === 'host' &&
      currentRoom.host.ready &&
      currentRoom.guest?.ready
  );

  const visibleRooms = rooms.filter((r) => r.matchType === matchTypeFilter);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/88 backdrop-blur-md animate-fadeIn select-none"
      onClick={handleClose}
    >
      <div
        className="relative z-10 w-full max-w-5xl max-h-[94dvh] flex flex-col rounded-2xl sm:rounded-3xl bg-slate-950/95 border-2 sm:border-4 border-stone-700 shadow-[0_0_60px_rgba(0,0,0,0.95)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-stone-800 bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 border border-amber-400/60 flex items-center justify-center shrink-0">
              {matchTypeFilter === 'ranked' ? (
                <Crown size={18} className="text-amber-300" />
              ) : (
                <Swords size={18} className="text-cyan-300" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-xl font-serif font-black tracking-wider text-amber-200 uppercase truncate">
                  Salão PvP Online Local
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-serif font-black uppercase tracking-wider border ${
                    matchTypeFilter === 'ranked'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400/60'
                      : 'bg-cyan-500/20 text-cyan-200 border-cyan-400/60'
                  }`}
                >
                  {matchTypeFilter === 'ranked'
                    ? 'Ranqueado (RP)'
                    : 'Normal (Sem RP)'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-stone-400 mt-0.5">
                {isConnected ? (
                  <>
                    <Wifi size={12} className="text-emerald-400" />
                    <span className="text-emerald-300 font-medium">
                      Conectado ao Servidor Local
                    </span>
                  </>
                ) : (
                  <>
                    <WifiOff size={12} className="text-amber-400 animate-pulse" />
                    <span className="text-amber-300">Conectando...</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="min-w-[44px] min-h-[44px] px-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-amber-400/60 text-stone-300 hover:text-white flex items-center justify-center gap-1.5 text-xs font-serif font-bold uppercase cursor-pointer transition-colors"
              title="Voltar à tela anterior"
            >
              <X size={16} />
              <span className="hidden sm:inline">Voltar</span>
            </button>
          </div>
        </div>

        {/* Queue Maintenance Alert */}
        {isQueueClosed && (
          <div className="shrink-0 mx-3 sm:mx-6 mt-2.5 px-3.5 py-2.5 rounded-xl bg-rose-950/95 border border-rose-400/80 text-rose-100 text-xs flex flex-wrap items-center gap-2">
            <Lock size={15} className="text-rose-300 shrink-0" />
            <span className="px-2 py-0.5 rounded bg-rose-600 border border-rose-300/90 text-[10px] font-mono font-black uppercase tracking-wider text-white">
              OFFLINE
            </span>
            <span>
              <strong>DESABILITADO NO MOMENTO:</strong>{' '}
              {activeQueueStatus.reason ||
                `A fila ${matchTypeFilter === 'ranked' ? 'Ranqueada' : 'PvP Normal'} foi desativada temporariamente pelo administrador.`}
            </span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="shrink-0 mx-3 sm:mx-6 mt-2.5 px-3.5 py-2 rounded-xl bg-rose-950/90 border border-rose-500/70 text-rose-200 text-xs flex items-center justify-between gap-2">
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-rose-300 hover:text-white cursor-pointer p-1"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6">
          {!currentRoom ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-5">
              {/* Left Column: Create Room + Join by Code */}
              <div className="md:col-span-5 flex flex-col gap-3">
                {/* Create Room Card */}
                <form
                  onSubmit={handleCreateRoom}
                  className="rounded-2xl bg-stone-900/90 border border-amber-500/40 p-3.5 sm:p-4 flex flex-col gap-2.5"
                >
                  <div className="flex items-center gap-2 text-amber-200 font-serif font-black text-xs sm:text-sm uppercase tracking-wider">
                    <Plus size={16} className="text-amber-400" />
                    <span>Criar Nova Sala</span>
                  </div>
                  <input
                    type="text"
                    value={roomTitle}
                    onChange={(e) => setRoomTitle(e.target.value)}
                    maxLength={32}
                    placeholder="Nome da sala (opcional)"
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 focus:border-amber-400 outline-none text-xs sm:text-sm text-stone-100 placeholder-stone-500"
                  />
                  <button
                    type="submit"
                    disabled={!isConnected || isQueueClosed}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-stone-950 font-serif font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    <Swords size={16} />
                    <span>{isQueueClosed ? 'Fila Indisponível' : 'Criar Sala e Gerar Código'}</span>
                  </button>
                </form>

                {/* Join by Code Card */}
                <form
                  onSubmit={handleJoinByCode}
                  className="rounded-2xl bg-stone-900/90 border border-cyan-500/40 p-3.5 sm:p-4 flex flex-col gap-2.5"
                >
                  <div className="flex items-center gap-2 text-cyan-200 font-serif font-black text-xs sm:text-sm uppercase tracking-wider">
                    <Sparkles size={16} className="text-cyan-400" />
                    <span>Entrar com Código</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={joinCode}
                      disabled={isQueueClosed}
                      onChange={(e) =>
                        setJoinCode(e.target.value.toUpperCase().slice(0, 6))
                      }
                      placeholder="Ex: CEL7A"
                      className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 focus:border-cyan-400 outline-none text-sm font-mono font-black tracking-[0.25em] uppercase text-cyan-200 placeholder-stone-600 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!isConnected || isQueueClosed}
                      className="min-h-[44px] px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-serif font-black text-xs uppercase tracking-wider cursor-pointer transition-all"
                    >
                      Entrar
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Live Local Rooms List */}
              <div className="md:col-span-7 rounded-2xl bg-stone-900/80 border border-stone-700 p-3.5 sm:p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-amber-400" />
                    <h3 className="font-serif font-black text-xs sm:text-sm uppercase tracking-wider text-amber-200">
                      Salas Abertas na Rede Local ({visibleRooms.length})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTick();
                      pvpSocket.listRooms();
                    }}
                    className="min-h-[38px] px-3 rounded-lg bg-stone-950 hover:bg-stone-800 border border-stone-700 text-stone-300 text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw size={13} />
                    <span>Atualizar</span>
                  </button>
                </div>

                {visibleRooms.length === 0 ? (
                  <div className="flex-1 min-h-[140px] rounded-xl bg-stone-950/70 border border-dashed border-stone-700 flex flex-col items-center justify-center p-4 text-center gap-1.5">
                    <Users size={26} className="text-stone-600" />
                    <p className="text-xs sm:text-sm font-serif font-bold text-stone-300">
                      Nenhuma sala{' '}
                      {matchTypeFilter === 'ranked' ? 'Ranqueada' : 'Normal'}{' '}
                      aberta agora.
                    </p>
                    <p className="text-[11px] text-stone-500 max-w-sm">
                      Crie uma sala ao lado para aparecer aqui instantaneamente ou peça o código ao outro duelista na sua rede local.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {visibleRooms.map((room) => (
                      <div
                        key={room.code}
                        className="rounded-xl bg-stone-950/90 border border-stone-700 hover:border-amber-400/60 p-3 flex items-center justify-between gap-3 transition-all"
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          <AvatarPortrait
                            avatarId={room.hostAvatarId || DEFAULT_AVATAR_ID}
                            size="sm"
                            showFrameGem
                          />
                          <div className="min-w-0 flex flex-col gap-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 font-mono text-[11px] font-black text-amber-300 tracking-wider">
                                {room.code}
                              </span>
                              <span className="font-serif font-bold text-xs sm:text-sm text-stone-100 truncate">
                                {room.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-stone-400 flex-wrap">
                              <span>Anfitrião: {room.hostNickname}</span>
                              <span>·</span>
                              <span>Nv.{room.hostLevel}</span>
                              <span>·</span>
                              <span className="text-amber-300 font-semibold">
                                {room.hostRankTier}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleJoinFromList(room.code)}
                          disabled={room.playerCount >= 2}
                          className="shrink-0 min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-serif font-black text-xs uppercase tracking-wider cursor-pointer shadow"
                        >
                          {room.playerCount >= 2 ? 'Cheia' : 'Entrar'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* INSIDE WAITING ROOM */
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Top Code Plaque */}
              <div className="rounded-2xl bg-gradient-to-r from-indigo-950/80 via-stone-900 to-amber-950/60 border border-amber-400/50 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-serif uppercase tracking-widest text-amber-300 block">
                    Código da Sala Local
                  </span>
                  <div className="flex items-center gap-2.5 mt-0.5">
                    <span className="text-2xl sm:text-3xl font-mono font-black tracking-[0.3em] text-white drop-shadow">
                      {currentRoom.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(currentRoom.code)}
                      className="min-h-[38px] px-3 rounded-xl bg-stone-900 hover:bg-stone-800 border border-amber-400/50 text-amber-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy size={13} />
                      <span>{copiedCode ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                <div className="text-xs text-stone-300">
                  <span className="block font-serif font-bold text-amber-200">
                    {currentRoom.title}
                  </span>
                  <span className="text-[11px] text-stone-400">
                    Compartilhe o código ou peça para entrar na Lista de Salas Locais
                  </span>
                </div>
              </div>

              {/* Duelist VS Duelist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Host Slot */}
                <div
                  className={`rounded-2xl p-3.5 sm:p-4 border-2 flex flex-col justify-between gap-2 ${
                    currentRoom.host.ready
                      ? 'bg-emerald-950/30 border-emerald-400/70'
                      : 'bg-stone-900/90 border-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-serif font-black uppercase tracking-widest text-amber-300">
                      Anfitrião {seat === 'host' ? '(Você)' : ''}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-serif font-black uppercase border ${
                        currentRoom.host.ready
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
                          : 'bg-stone-800 text-stone-400 border-stone-600'
                      }`}
                    >
                      {currentRoom.host.ready ? 'Pronto' : 'Aguardando'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <AvatarPortrait
                      avatarId={currentRoom.host.avatarId || DEFAULT_AVATAR_ID}
                      size="md"
                      showFrameGem
                    />
                    <div className="min-w-0">
                      <p className="font-serif font-black text-sm sm:text-base text-white truncate">
                        {currentRoom.host.nickname}
                      </p>
                      <p className="text-[11px] text-stone-400 tabular-nums">
                        Nv.{currentRoom.host.level} · {currentRoom.host.rankTier} ({currentRoom.host.rankPoints} RP)
                      </p>
                    </div>
                  </div>
                  <div className="text-[11px] text-amber-200/90 bg-stone-950/80 border border-stone-800 rounded-xl px-3 py-1.5 truncate">
                    Deck: {currentRoom.host.deckName}
                  </div>
                </div>

                {/* Guest Slot */}
                {currentRoom.guest ? (
                  <div
                    className={`rounded-2xl p-3.5 sm:p-4 border-2 flex flex-col justify-between gap-2 ${
                      currentRoom.guest.ready
                        ? 'bg-emerald-950/30 border-emerald-400/70'
                        : 'bg-stone-900/90 border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-serif font-black uppercase tracking-widest text-cyan-300">
                        Desafiante {seat === 'guest' ? '(Você)' : ''}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-serif font-black uppercase border ${
                          currentRoom.guest.ready
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
                            : 'bg-stone-800 text-stone-400 border-stone-600'
                        }`}
                      >
                        {currentRoom.guest.ready ? 'Pronto' : 'Aguardando'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <AvatarPortrait
                        avatarId={currentRoom.guest.avatarId || DEFAULT_AVATAR_ID}
                        size="md"
                        showFrameGem
                      />
                      <div className="min-w-0">
                        <p className="font-serif font-black text-sm sm:text-base text-white truncate">
                          {currentRoom.guest.nickname}
                        </p>
                        <p className="text-[11px] text-stone-400 tabular-nums">
                          Nv.{currentRoom.guest.level} · {currentRoom.guest.rankTier} ({currentRoom.guest.rankPoints} RP)
                        </p>
                      </div>
                    </div>
                    <div className="text-[11px] text-cyan-200/90 bg-stone-950/80 border border-stone-800 rounded-xl px-3 py-1.5 truncate">
                      Deck: {currentRoom.guest.deckName}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl p-4 border-2 border-dashed border-stone-700 bg-stone-950/60 flex flex-col items-center justify-center text-center gap-1.5 min-h-[120px]">
                    <Users size={22} className="text-stone-500 animate-pulse" />
                    <span className="text-xs sm:text-sm font-serif font-bold text-stone-300">
                      Aguardando 2º Duelista...
                    </span>
                    <span className="text-[11px] text-stone-500">
                      Passe o código <strong className="text-amber-300 font-mono">{currentRoom.code}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Action Controls inside Room */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    sound.playDiscard();
                    pvpSocket.leaveRoom();
                    setCurrentRoom(null);
                    setSeat(null);
                  }}
                  className="min-h-[44px] px-4 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-200 font-serif font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut size={15} />
                  <span>Sair da Sala</span>
                </button>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playDraw();
                      pvpSocket.updateLoadout({
                        ready: !myParticipant?.ready,
                        deckName: activeDeckName,
                        deckCardIds: activeDeckCardIds,
                      });
                    }}
                    className={`min-h-[44px] px-5 rounded-xl font-serif font-black text-xs uppercase tracking-wider border-2 flex items-center gap-2 cursor-pointer transition-all ${
                      myParticipant?.ready
                        ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-300 text-white shadow-[0_0_20px_rgba(16,185,129,0.45)]'
                        : 'bg-stone-800 hover:bg-stone-700 border-amber-400/60 text-amber-200'
                    }`}
                  >
                    <CheckCircle2 size={16} />
                    <span>
                      {myParticipant?.ready ? 'Pronto! (Cancelar)' : 'Estou Pronto'}
                    </span>
                  </button>

                  {seat === 'host' && (
                    <button
                      type="button"
                      disabled={!canHostStart}
                      onClick={() => {
                        sound.playSummon();
                        pvpSocket.startMatch();
                      }}
                      className="min-h-[44px] px-5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed border-2 border-amber-200 text-stone-950 font-serif font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.5)] cursor-pointer flex items-center gap-2"
                    >
                      <Swords size={16} />
                      <span>Iniciar Duelo</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Active Deck Bar */}
        <div className="shrink-0 px-3 sm:px-6 py-2.5 border-t border-stone-800 bg-stone-950/95 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Layers size={15} className="text-amber-400 shrink-0" />
            <span className="text-[11px] font-serif font-bold text-stone-400 uppercase">
              Seu Deck:
            </span>
            <span className="text-xs sm:text-sm font-serif font-black text-amber-200 truncate max-w-[240px]">
              {activeDeckName}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              sound.playDraw();
              onOpenDeckSelector();
            }}
            className="min-h-[40px] px-4 rounded-xl bg-stone-900 hover:bg-stone-800 border border-amber-500/50 text-amber-200 font-serif font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
          >
            <Layers size={14} />
            <span>Trocar Deck</span>
          </button>
        </div>
      </div>
    </div>
  );
};
