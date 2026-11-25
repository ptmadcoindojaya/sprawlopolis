/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { INITIAL_CARDS } from './data/cards';
import {
  SprawlopolisCard,
  GridState,
  CardInHand,
  GoalCard,
  GridPos,
  MoveHistoryItem,
  MultiplayerState
} from './types';
import { calculateTotalScore } from './utils/scoring';
import { getOrientedBlocks } from './utils/cardUtils';
import { CityGridBoard } from './components/CityGridBoard';
import { CardHand } from './components/CardHand';
import { GoalHeader } from './components/GoalHeader';
import { TopNavHeader } from './components/TopNavHeader';
import { ScorePanel } from './components/ScorePanel';
import { RulebookModal } from './components/RulebookModal';
import { XlsImportModal } from './components/XlsImportModal';
import { GameOverModal } from './components/GameOverModal';
import { LobbyScreen } from './components/LobbyScreen';
import { CardGalleryModal } from './components/CardGalleryModal';

import {
  multiplayerSync,
  getOrCreateClientId,
  apiUpdateGameState,
  apiResetRoom
} from './utils/multiplayerSync';

export function App() {
  const [activeCardsDeck, setActiveCardsDeck] = useState<SprawlopolisCard[]>(INITIAL_CARDS);
  const [deck, setDeck] = useState<SprawlopolisCard[]>([]);
  const [goals, setGoals] = useState<GoalCard[]>([]);
  const [hand, setHand] = useState<CardInHand[]>([]);
  const [grid, setGrid] = useState<GridState>({});
  const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(0);
  const [history, setHistory] = useState<MoveHistoryItem[]>([]);

  // Modals state
  const [isScoreOpen, setIsScoreOpen] = useState<boolean>(false);
  const [isRulebookOpen, setIsRulebookOpen] = useState<boolean>(false);
  const [isXlsOpen, setIsXlsOpen] = useState<boolean>(false);
  const [isGameOverOpen, setIsGameOverOpen] = useState<boolean>(false);
  const [isLobbyOpen, setIsLobbyOpen] = useState<boolean>(true);
  const [isCardGalleryOpen, setIsCardGalleryOpen] = useState<boolean>(false);

  // Initial client ID
  const initialClientId = getOrCreateClientId();

  // Last local game state update timestamp ref for server sync deduplication
  const lastGameSyncTimestampRef = useRef<number>(0);
  // Track previous game started state to handle lobby auto-close transitions
  const prevGameStartedRef = useRef<boolean>(false);

  // Multiplayer / Pass & Play state
  const [multiplayerState, setMultiplayerState] = useState<MultiplayerState>({
    roomCode: 'SPRAWL-18',
    gameCode: 'SPRAWL-18',
    totalPlayers: 1,
    myPlayerId: 1,
    myClientId: initialClientId,
    currentTurnIndex: 0,
    connectedClients: [],
    isGameActive: false,
    players: [
      {
        id: 1,
        name: 'Pemain Solo',
        isMainPlayer: true,
        color: '#f59e0b',
        isReady: true,
        avatar: 'P1',
        occupantClientId: initialClientId,
        occupantName: 'Pemain Solo'
      }
    ]
  });

  // Shuffle array utility
  const shuffleArray = (array: SprawlopolisCard[]): SprawlopolisCard[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Start new game setup
  const startNewGame = (customCards?: SprawlopolisCard[], skipServerSync: boolean = false) => {
    const pool = customCards || activeCardsDeck;
    const shuffled = shuffleArray(pool);

    // Pick first 3 cards as Goal cards
    const initialGoals = shuffled.slice(0, 3).map((c) => c.goal);

    // Next 3 cards as initial player hand
    const initialHand: CardInHand[] = shuffled.slice(3, 6).map((c) => ({
      card: c,
      rotation: 0
    }));

    // Next card as starting city block
    const startCard = shuffled[6];
    const initialGrid: GridState = {
      '0,0': { cardId: startCard.id, zone: startCard.blocks[0].zone, roads: startCard.blocks[0].roads, layer: 0, blockIndex: 0, rotation: 0 },
      '1,0': { cardId: startCard.id, zone: startCard.blocks[1].zone, roads: startCard.blocks[1].roads, layer: 0, blockIndex: 1, rotation: 0 },
      '0,1': { cardId: startCard.id, zone: startCard.blocks[2].zone, roads: startCard.blocks[2].roads, layer: 0, blockIndex: 2, rotation: 0 },
      '1,1': { cardId: startCard.id, zone: startCard.blocks[3].zone, roads: startCard.blocks[3].roads, layer: 0, blockIndex: 3, rotation: 0 }
    };

    // Remaining 11 cards in draw deck
    const remainingDeck = shuffled.slice(7);
    const now = Date.now();
    lastGameSyncTimestampRef.current = now;

    setGoals(initialGoals);
    setHand(initialHand);
    setGrid(initialGrid);
    setDeck(remainingDeck);
    setHistory([]);
    setSelectedHandIndex(0);
    setIsGameOverOpen(false);

    setMultiplayerState((prev) => ({
      ...prev,
      currentTurnIndex: 0
    }));

    // Broadcast starting board & cards to Express server if multiplayer
    if (!skipServerSync && multiplayerState.totalPlayers > 1) {
      const payload = {
        goals: initialGoals,
        hand: initialHand,
        grid: initialGrid,
        deck: remainingDeck,
        history: [],
        isGameOver: false,
        timestamp: now
      };
      apiUpdateGameState(multiplayerState.roomCode, payload, 0);
    }
  };

  useEffect(() => {
    startNewGame(undefined, true);
  }, []);

  // Central Real-time Server Sync Loop
  useEffect(() => {
    const currentRoom = multiplayerState.roomCode || 'SPRAWL-18';
    const myPlayerObj = multiplayerState.players.find((p) => p.id === multiplayerState.myPlayerId);
    const myName = myPlayerObj ? myPlayerObj.name : `Pemain ${multiplayerState.myPlayerId}`;

    multiplayerSync.startPolling(
      currentRoom,
      myName,
      multiplayerState.myPlayerId,
      (serverRoom) => {
        // Match client slot in room
        let serverMySlotId = multiplayerState.myPlayerId;
        const mySlotInServer = serverRoom.players.find(
          (p) => p.occupantClientId === initialClientId
        );

        if (mySlotInServer) {
          serverMySlotId = mySlotInServer.id;
        }

        setMultiplayerState((prev) => ({
          ...prev,
          roomCode: serverRoom.roomCode,
          totalPlayers: serverRoom.totalPlayers,
          players: serverRoom.players,
          connectedClients: serverRoom.connectedClients,
          currentTurnIndex: serverRoom.currentTurnIndex,
          myPlayerId: serverMySlotId,
          isGameActive: serverRoom.isGameStarted
        }));

        // Handle auto-closing lobby screen on game start transition
        const gameStartedTransition = !prevGameStartedRef.current && serverRoom.isGameStarted;
        prevGameStartedRef.current = !!serverRoom.isGameStarted;

        if (gameStartedTransition && isLobbyOpen) {
          setIsLobbyOpen(false);
        }

        // Live game state sync across all clients in room
        if (serverRoom.gameState && serverRoom.gameState.timestamp) {
          if (serverRoom.gameState.timestamp > lastGameSyncTimestampRef.current) {
            lastGameSyncTimestampRef.current = serverRoom.gameState.timestamp;

            if (serverRoom.gameState.goals) setGoals(serverRoom.gameState.goals);
            if (serverRoom.gameState.hand) setHand(serverRoom.gameState.hand);
            if (serverRoom.gameState.grid) setGrid(serverRoom.gameState.grid);
            if (serverRoom.gameState.deck) setDeck(serverRoom.gameState.deck);
            if (serverRoom.gameState.history) setHistory(serverRoom.gameState.history);
            if (serverRoom.gameState.isGameOver !== undefined) {
              setIsGameOverOpen(serverRoom.gameState.isGameOver);
            }
          }
        }
      }
    );

    return () => {
      multiplayerSync.stopPolling();
    };
  }, [multiplayerState.roomCode, multiplayerState.myPlayerId, initialClientId, isLobbyOpen]);

  // Determine current active turn player
  const isSolo = multiplayerState.totalPlayers === 1;
  const currentTurnPlayer = multiplayerState.players[multiplayerState.currentTurnIndex] || multiplayerState.players[0];
  const isMyTurn = isSolo || (multiplayerState.myPlayerId === currentTurnPlayer?.id);

  // Compute live score breakdown
  const scoreBreakdown = useMemo(() => {
    return calculateTotalScore(goals, grid);
  }, [goals, grid]);

  // Handle card rotation in hand
  const handleRotateCard = (handIdx: number) => {
    if (!isMyTurn) return;
    setHand((prevHand) => {
      const nextHand = [...prevHand];
      const currRot = nextHand[handIdx].rotation;
      nextHand[handIdx] = {
        ...nextHand[handIdx],
        rotation: currRot === 0 ? 180 : 0
      };
      return nextHand;
    });
  };

  // Handle placing card onto city grid
  const handlePlaceCard = (pos: GridPos, rotation: 0 | 180) => {
    if (!isMyTurn) return; // Strictly enforce turn locking
    if (selectedHandIndex === null || !hand[selectedHandIndex]) return;

    const cardToPlace = hand[selectedHandIndex];
    const orientedBlocks = getOrientedBlocks(cardToPlace.card.blocks, rotation);

    // Save history for undo
    const newHistoryItem: MoveHistoryItem = {
      grid: { ...grid },
      hand: [...hand],
      deck: [...deck],
      placedCardId: cardToPlace.card.id,
      placedPos: pos,
      turnIndex: multiplayerState.currentTurnIndex
    };

    const updatedHistory = [...history, newHistoryItem];

    // Update grid state with 2x2 blocks placed at pos
    const nextGrid = { ...grid };
    const offsets = [
      { dx: 0, dy: 0, bIdx: 0 },
      { dx: 1, dy: 0, bIdx: 1 },
      { dx: 0, dy: 1, bIdx: 2 },
      { dx: 1, dy: 1, bIdx: 3 }
    ];

    offsets.forEach(({ dx, dy, bIdx }) => {
      const key = `${pos.x + dx},${pos.y + dy}`;
      const prevLayer = nextGrid[key] ? nextGrid[key].layer : -1;
      const blockData = orientedBlocks[bIdx];

      nextGrid[key] = {
        cardId: cardToPlace.card.id,
        zone: blockData.zone,
        roads: blockData.roads,
        layer: prevLayer + 1,
        blockIndex: bIdx,
        rotation
      };
    });

    // Remove placed card from hand and draw a new one if deck is not empty
    const updatedHand = hand.filter((_, idx) => idx !== selectedHandIndex);
    let updatedDeck = [...deck];

    if (updatedDeck.length > 0) {
      const drawnCard = updatedDeck[0];
      updatedDeck = updatedDeck.slice(1);
      updatedHand.push({ card: drawnCard, rotation: 0 });
    }

    const isGameOver = updatedHand.length === 0;
    const nextTurnIndex = isSolo ? 0 : (multiplayerState.currentTurnIndex + 1) % multiplayerState.totalPlayers;

    setGrid(nextGrid);
    setHand(updatedHand);
    setDeck(updatedDeck);
    setHistory(updatedHistory);
    setSelectedHandIndex(updatedHand.length > 0 ? 0 : null);

    setMultiplayerState((prev) => ({
      ...prev,
      currentTurnIndex: nextTurnIndex
    }));

    const now = Date.now();
    lastGameSyncTimestampRef.current = now;

    // Broadcast updated game state to server
    if (!isSolo) {
      const payload = {
        goals,
        hand: updatedHand,
        grid: nextGrid,
        deck: updatedDeck,
        history: updatedHistory,
        isGameOver,
        timestamp: now
      };
      apiUpdateGameState(multiplayerState.roomCode, payload, nextTurnIndex);
    }

    // Check if game is over (hand is empty)
    if (isGameOver) {
      setTimeout(() => {
        setIsGameOverOpen(true);
      }, 500);
    }
  };

  // Undo move
  const handleUndo = () => {
    if (history.length === 0) return;
    if (!isMyTurn && !isSolo) return;

    const lastState = history[history.length - 1];
    const updatedHistory = history.slice(0, history.length - 1);
    const nextTurnIndex = lastState.turnIndex ?? 0;

    setGrid(lastState.grid);
    setHand(lastState.hand);
    setDeck(lastState.deck);
    setHistory(updatedHistory);
    setSelectedHandIndex(0);
    setIsGameOverOpen(false);

    setMultiplayerState((prev) => ({
      ...prev,
      currentTurnIndex: nextTurnIndex
    }));

    const now = Date.now();
    lastGameSyncTimestampRef.current = now;

    if (!isSolo) {
      const payload = {
        goals,
        hand: lastState.hand,
        grid: lastState.grid,
        deck: lastState.deck,
        history: updatedHistory,
        isGameOver: false,
        timestamp: now
      };
      apiUpdateGameState(multiplayerState.roomCode, payload, nextTurnIndex);
    }
  };

  // Switch turn manually from top bar
  const handleSwitchTurn = (newIndex: number) => {
    setMultiplayerState((prev) => ({ ...prev, currentTurnIndex: newIndex }));
    if (!isSolo) {
      apiUpdateGameState(multiplayerState.roomCode, undefined, newIndex);
    }
  };

  // Reset current game
  const handleResetGame = async () => {
    if (!isSolo) {
      await apiResetRoom(multiplayerState.roomCode);
    }
    startNewGame();
  };

  // Return to lobby handler (Solo & Multiplayer)
  const handleReturnToLobby = async () => {
    setIsGameOverOpen(false);
    setIsLobbyOpen(true);
    if (!isSolo) {
      await apiResetRoom(multiplayerState.roomCode);
    }
    setMultiplayerState((prev) => ({
      ...prev,
      isGameActive: false
    }));
  };

  // Apply custom spreadsheet cards
  const handleApplyCustomCards = (customCards: SprawlopolisCard[]) => {
    setActiveCardsDeck(customCards);
    startNewGame(customCards);
  };

  const selectedCardInHand = selectedHandIndex !== null ? hand[selectedHandIndex] : null;

  return (
    <div className="w-screen h-screen bg-[#f4efe6] text-[#292524] flex flex-col overflow-hidden font-sans select-none relative">
      
      {/* Auto-Hiding Hover Top Navigation Menu */}
      <TopNavHeader
        multiplayerState={multiplayerState}
        historyLength={history.length}
        onOpenLobby={handleReturnToLobby}
        onOpenRules={() => setIsRulebookOpen(true)}
        onOpenXls={() => setIsXlsOpen(true)}
        onOpenCardGallery={() => setIsCardGalleryOpen(true)}
        onUndo={handleUndo}
        onResetGame={handleResetGame}
        onSwitchTurn={handleSwitchTurn}
      />

      {/* Floating Target Score Cards Widget (Top Left) */}
      <GoalHeader
        goals={goals}
        scoreBreakdown={scoreBreakdown}
        onOpenScoreDetails={() => setIsScoreOpen(true)}
      />

      {/* Full-Screen Interactive City Board Area */}
      <main className="w-full h-full flex-1 relative overflow-hidden">
        <CityGridBoard
          grid={grid}
          selectedCard={selectedCardInHand}
          onPlaceCard={handlePlaceCard}
          onRotateSelectedCard={() => {
            if (selectedHandIndex !== null) handleRotateCard(selectedHandIndex);
          }}
          isMyTurn={isMyTurn}
        />
      </main>

      {/* Floating Player Hand (Pinned at Bottom-Center) */}
      <CardHand
        hand={hand}
        deckCount={deck.length}
        selectedIndex={selectedHandIndex}
        onSelectCard={(idx) => {
          if (isMyTurn) setSelectedHandIndex(idx);
        }}
        onRotateCard={handleRotateCard}
        isMyTurn={isMyTurn}
        currentTurnPlayerName={currentTurnPlayer?.name}
        totalPlayers={multiplayerState.totalPlayers}
      />

      {/* Modals & Dialogs */}
      <ScorePanel
        isOpen={isScoreOpen}
        onClose={() => setIsScoreOpen(false)}
        scoreBreakdown={scoreBreakdown}
        goals={goals}
      />

      <RulebookModal
        isOpen={isRulebookOpen}
        onClose={() => setIsRulebookOpen(false)}
      />

      <XlsImportModal
        isOpen={isXlsOpen}
        onClose={() => setIsXlsOpen(false)}
        onApplyCustomCards={handleApplyCustomCards}
      />

      <GameOverModal
        isOpen={isGameOverOpen}
        scoreBreakdown={scoreBreakdown}
        goals={goals}
        onRestart={handleResetGame}
        onInspectBoard={() => setIsGameOverOpen(false)}
        onOpenLobby={handleReturnToLobby}
      />

      <LobbyScreen
        isOpen={isLobbyOpen}
        multiplayerState={multiplayerState}
        onUpdateMultiplayerState={(partial) => setMultiplayerState((prev) => ({ ...prev, ...partial }))}
        onStartGame={() => {
          setIsLobbyOpen(false);
          startNewGame();
        }}
        onClose={() => setIsLobbyOpen(false)}
        onOpenRulebook={() => {
          setIsLobbyOpen(false);
          setIsRulebookOpen(true);
        }}
        onOpenXlsImport={() => {
          setIsLobbyOpen(false);
          setIsXlsOpen(true);
        }}
        onOpenCardGallery={() => {
          setIsCardGalleryOpen(true);
        }}
      />

      <CardGalleryModal
        isOpen={isCardGalleryOpen}
        onClose={() => setIsCardGalleryOpen(false)}
        cards={activeCardsDeck}
      />
    </div>
  );
}

export default App;
