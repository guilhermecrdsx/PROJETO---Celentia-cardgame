/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { TitleScreen } from './components/TitleScreen';
import { GameBoard } from './components/GameBoard';
import { GameModeSelectModal } from './components/GameModeSelectModal';
import { DeckBuilder } from './components/DeckBuilder';
import { DeckSelectorModal } from './components/DeckSelectorModal';
import { RulesModal } from './components/RulesModal';
import { AuthModal } from './components/AuthModal';
import { PvpLobbyModal } from './components/PvpLobbyModal';
import { MobileOrientationGuard } from './components/MobileOrientationGuard';
import { DEFAULT_DECK_IDS, DECK_PRESETS } from './logic/deckFactory';
import { OnlineMatchBootstrap } from './types/pvp';
import { pvpSocket } from './services/pvpSocket';
import {
  initAuthSessionListener,
  useCloudPlayerState,
} from './services/accountApi';

type ReturnOrigin = 'title' | 'mode_select' | 'pvp_lobby' | 'deck_selector_title' | 'deck_selector_modes' | 'deck_selector_lobby' | 'playing';

export default function App() {
  const { playerState, initializing } = useCloudPlayerState();

  useEffect(() => {
    initAuthSessionListener();
  }, []);

  const [screen, setScreen] = useState<'title' | 'deck_builder' | 'playing'>('title');
  const [gameMode, setGameMode] = useState<'ai' | 'online_pvp'>('ai');
  const [matchType, setMatchType] = useState<'normal' | 'ranked'>('ranked');
  const [isGameModeModalOpen, setIsGameModeModalOpen] = useState<boolean>(false);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isDeckSelectorOpen, setIsDeckSelectorOpen] = useState<boolean>(false);
  const [isOnlineLobbyOpen, setIsOnlineLobbyOpen] = useState<boolean>(false);
  const [onlineLobbyMatchType, setOnlineLobbyMatchType] = useState<'normal' | 'ranked'>('normal');
  const [onlineMatchBootstrap, setOnlineMatchBootstrap] = useState<OnlineMatchBootstrap | null>(null);

  // Navigation history so every modal's "Voltar" returns to its exact previous screen/modal
  const [pvpLobbyReturnTo, setPvpLobbyReturnTo] = useState<'title' | 'mode_select'>('mode_select');
  const [deckBuilderReturnTo, setDeckBuilderReturnTo] = useState<ReturnOrigin>('mode_select');
  const [deckSelectorContext, setDeckSelectorContext] = useState<'title' | 'mode_select' | 'pvp_lobby' | 'playing'>('title');

  // Active player deck (20 cards)
  const [playerDeckCardIds, setPlayerDeckCardIds] = useState<string[]>(() => {
    return DEFAULT_DECK_IDS;
  });

  const [activeDeckName, setActiveDeckName] = useState<string>(() => {
    return DECK_PRESETS[0]?.name || 'Tríade Elemental: Fogo, Raiz & Trovão';
  });

  // Sync active deck from cloud account when player logs in
  useEffect(() => {
    if (playerState && Array.isArray(playerState.decks) && playerState.decks.length > 0) {
      const activeSlot =
        playerState.decks.find((d) => d.slotId === playerState.activeSlotId) ||
        playerState.decks.find((d) => d.isActive) ||
        playerState.decks[0];

      if (activeSlot && Array.isArray(activeSlot.cardIds) && activeSlot.cardIds.length === 20) {
        setPlayerDeckCardIds(activeSlot.cardIds);
        setActiveDeckName(activeSlot.name);
      }
    }
  }, [playerState?.uid, playerState?.activeSlotId]);

  const [isTestingArena, setIsTestingArena] = useState<boolean>(false);
  const [isTutorialMode, setIsTutorialMode] = useState<boolean>(false);
  const [isGuidedPviaMode, setIsGuidedPviaMode] = useState<boolean>(false);
  const [builderSlotId, setBuilderSlotId] = useState<number>(1);

  const handleStartGame = (
    mode: 'ai',
    type: 'normal' | 'ranked' = 'normal',
    guided: boolean = false
  ) => {
    setOnlineMatchBootstrap(null);
    setGameMode(mode);
    setMatchType(type);
    setIsTestingArena(false);
    setIsTutorialMode(false);
    setIsGuidedPviaMode(guided);
    setIsGameModeModalOpen(false);
    setIsOnlineLobbyOpen(false);
    setScreen('playing');
  };

  const handleStartTutorial = () => {
    setOnlineMatchBootstrap(null);
    setGameMode('ai');
    setMatchType('normal');
    setIsTestingArena(false);
    setIsTutorialMode(true);
    setIsGuidedPviaMode(false);
    setIsGameModeModalOpen(false);
    setIsOnlineLobbyOpen(false);
    setScreen('playing');
  };

  const handleOpenOnlineLobby = (
    type: 'normal' | 'ranked',
    returnTo: 'title' | 'mode_select' = 'mode_select'
  ) => {
    setOnlineLobbyMatchType(type);
    setPvpLobbyReturnTo(returnTo);
    setIsGameModeModalOpen(false);
    setIsOnlineLobbyOpen(true);
  };

  const handleCloseOnlineLobby = () => {
    setIsOnlineLobbyOpen(false);
    if (pvpLobbyReturnTo === 'mode_select') {
      setIsGameModeModalOpen(true);
    }
  };

  const handleOnlineMatchStarted = useCallback((bootstrap: OnlineMatchBootstrap) => {
    setOnlineMatchBootstrap(bootstrap);
    setGameMode('online_pvp');
    setMatchType(bootstrap.matchType);
    setIsTestingArena(false);
    setIsTutorialMode(false);
    setIsGuidedPviaMode(false);
    setIsOnlineLobbyOpen(false);
    setIsGameModeModalOpen(false);
    setIsDeckSelectorOpen(false);
    setScreen('playing');
  }, []);

  const handleOpenTestingArena = () => {
    setOnlineMatchBootstrap(null);
    setGameMode('ai');
    setMatchType('normal');
    setIsTestingArena(true);
    setIsTutorialMode(false);
    setIsGuidedPviaMode(false);
    setIsGameModeModalOpen(false);
    setIsOnlineLobbyOpen(false);
    setScreen('playing');
  };

  const handleOpenDeckBuilder = (slotId?: number, returnTo: ReturnOrigin = 'mode_select') => {
    setBuilderSlotId(slotId || playerState?.activeSlotId || 1);
    setDeckBuilderReturnTo(returnTo);
    setIsGameModeModalOpen(false);
    setIsOnlineLobbyOpen(false);
    setIsDeckSelectorOpen(false);
    setScreen('deck_builder');
  };

  const handleSaveDeck = (deckCardIds: string[], deckName: string) => {
    setPlayerDeckCardIds(deckCardIds);
    setActiveDeckName(deckName || 'Meu Baralho Personalizado');
  };

  const handleBackFromDeckBuilder = () => {
    switch (deckBuilderReturnTo) {
      case 'mode_select':
        setScreen('title');
        setIsGameModeModalOpen(true);
        break;
      case 'pvp_lobby':
        setScreen('title');
        setIsOnlineLobbyOpen(true);
        break;
      case 'deck_selector_title':
        setScreen('title');
        setDeckSelectorContext('title');
        setIsDeckSelectorOpen(true);
        break;
      case 'deck_selector_modes':
        setScreen('title');
        setIsGameModeModalOpen(true);
        setDeckSelectorContext('mode_select');
        setIsDeckSelectorOpen(true);
        break;
      case 'deck_selector_lobby':
        setScreen('title');
        setIsOnlineLobbyOpen(true);
        setDeckSelectorContext('pvp_lobby');
        setIsDeckSelectorOpen(true);
        break;
      case 'playing':
        setScreen('playing');
        break;
      case 'title':
      default:
        setScreen('title');
        break;
    }
  };

  const handleOpenDeckSelector = (context: 'title' | 'mode_select' | 'pvp_lobby' | 'playing' = 'title') => {
    setDeckSelectorContext(context);
    setIsDeckSelectorOpen(true);
  };

  const handleSelectDeckFromModal = (cardIds: string[], deckName: string) => {
    setPlayerDeckCardIds(cardIds);
    setActiveDeckName(deckName);
    setIsDeckSelectorOpen(false);
  };

  const handleExitToTitle = useCallback(() => {
    if (gameMode === 'online_pvp' || onlineMatchBootstrap) {
      pvpSocket.leaveRoom();
    }
    setOnlineMatchBootstrap(null);
    setIsTestingArena(false);
    setIsTutorialMode(false);
    setIsGuidedPviaMode(false);
    setIsDeckSelectorOpen(false);
    setIsGameModeModalOpen(false);
    setIsOnlineLobbyOpen(false);
    setScreen('title');
  }, [gameMode, onlineMatchBootstrap]);

  const handleExitTutorialToModes = useCallback(() => {
    setOnlineMatchBootstrap(null);
    setIsTestingArena(false);
    setIsTutorialMode(false);
    setIsGuidedPviaMode(false);
    setIsDeckSelectorOpen(false);
    setIsOnlineLobbyOpen(false);
    setScreen('title');
    setIsGameModeModalOpen(true);
  }, []);

  const handleGoToLobbyFromMatch = useCallback(() => {
    const targetType = onlineMatchBootstrap?.matchType ?? matchType;
    if (gameMode === 'online_pvp' || onlineMatchBootstrap) {
      pvpSocket.leaveRoom();
    }
    setOnlineMatchBootstrap(null);
    setIsTestingArena(false);
    setIsTutorialMode(false);
    setIsGuidedPviaMode(false);
    setIsDeckSelectorOpen(false);
    setIsGameModeModalOpen(false);
    setOnlineLobbyMatchType(targetType);
    setPvpLobbyReturnTo('mode_select');
    setScreen('title');
    setIsOnlineLobbyOpen(true);
  }, [gameMode, onlineMatchBootstrap, matchType]);

  return (
    <div className="w-screen h-dvh overflow-hidden bg-stone-950 font-sans">
      {screen === 'title' ? (
        <TitleScreen
          onOpenGameModes={() => setIsGameModeModalOpen(true)}
          onOpenDeckSelector={() => handleOpenDeckSelector('title')}
          activeDeckName={activeDeckName}
          onOpenRules={() => setIsRulesOpen(true)}
        />
      ) : screen === 'deck_builder' ? (
        <DeckBuilder
          initialCardIds={playerDeckCardIds}
          initialSlotId={builderSlotId}
          onSaveDeck={handleSaveDeck}
          onBack={handleBackFromDeckBuilder}
        />
      ) : (
        <GameBoard
          key={
            onlineMatchBootstrap
              ? `online_${onlineMatchBootstrap.roomCode}_${onlineMatchBootstrap.matchInstanceId || 'initial'}`
              : `${gameMode}_${matchType}_${isTestingArena}_${isTutorialMode}_${isGuidedPviaMode}`
          }
          gameMode={gameMode}
          matchType={matchType}
          onlineMatchBootstrap={onlineMatchBootstrap}
          isTestingArena={isTestingArena}
          isTutorialMode={isTutorialMode}
          isGuidedPviaMode={isGuidedPviaMode}
          activeDeckName={activeDeckName}
          customPlayerDeckCardIds={playerDeckCardIds}
          onOpenDeckBuilder={() => handleOpenDeckBuilder(playerState?.activeSlotId || 1, 'playing')}
          onOpenDeckSelector={() => handleOpenDeckSelector('playing')}
          onOnlineRematchStarted={handleOnlineMatchStarted}
          onGoToLobby={handleGoToLobbyFromMatch}
          onExitTutorialToModes={handleExitTutorialToModes}
          onExitToTitle={handleExitToTitle}
        />
      )}

      {/* Game Mode Selection Modal (lifted to App for clean Back history) */}
      <GameModeSelectModal
        isOpen={screen === 'title' && isGameModeModalOpen}
        onClose={() => setIsGameModeModalOpen(false)}
        onSelectMode={(mode, type, guided) => handleStartGame(mode, type, guided)}
        onOpenOnlineLobby={(type) => handleOpenOnlineLobby(type, 'mode_select')}
        onOpenTestingArena={handleOpenTestingArena}
        onStartTutorial={handleStartTutorial}
        onOpenDeckBuilder={() =>
          handleOpenDeckBuilder(playerState?.activeSlotId || 1, 'mode_select')
        }
        onOpenDeckSelector={() => handleOpenDeckSelector('mode_select')}
        activeDeckName={activeDeckName}
      />

      {/* Online LAN PvP Lobby Modal */}
      <PvpLobbyModal
        isOpen={isOnlineLobbyOpen}
        initialMatchType={onlineLobbyMatchType}
        activeDeckName={activeDeckName}
        activeDeckCardIds={playerDeckCardIds}
        onOpenDeckSelector={() => handleOpenDeckSelector('pvp_lobby')}
        onMatchStarted={handleOnlineMatchStarted}
        onClose={handleCloseOnlineLobby}
      />

      {/* Mandatory Cloud Account Login / Registration Gate */}
      <AuthModal isOpen={!initializing && !playerState} />

      {/* Deck Selection Modal */}
      <DeckSelectorModal
        isOpen={isDeckSelectorOpen}
        activeDeckCardIds={playerDeckCardIds}
        hideBuilderActions={deckSelectorContext === 'playing'}
        onSelectDeck={handleSelectDeckFromModal}
        onOpenDeckBuilder={(slotId) => {
          const origin: ReturnOrigin =
            deckSelectorContext === 'pvp_lobby'
              ? 'deck_selector_lobby'
              : deckSelectorContext === 'mode_select'
              ? 'deck_selector_modes'
              : deckSelectorContext === 'playing'
              ? 'playing'
              : 'deck_selector_title';
          handleOpenDeckBuilder(slotId, origin);
        }}
        onClose={() => setIsDeckSelectorOpen(false)}
      />

      {/* Rules Modal accessible from anywhere */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      {/* Mandatory Mobile Landscape Orientation Gate */}
      <MobileOrientationGuard />
    </div>
  );
}
