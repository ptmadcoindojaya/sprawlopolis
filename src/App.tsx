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
  MultiplayerState,
  SyncedGameState
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
  generateRoomCode
} from './utils/multiplayerSync';

export function App() {
  const [activeCardsDeck, setActiveCardsDeck] = useState<SprawlopolisCard[]>(INITIAL_CARDS);
  const [deck, setDeck] = useState<SprawlopolisCard[]>([]);
  const [goals, setGoals] = useState<GoalCard[]>([]);
  const [hand, setHand] = useState<CardInHand[]>([]);
  const [grid, setGrid] = useState<GridState>({});
  const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(0);
  const [history, setHistory] = useState<MoveHistoryItem[]>([]);

  // Modals state — Lobby opens immediately when app loads
  const [isScoreOpen, setIsScoreOpen] = useState<boolean>(false);
  const [isRulebookOpen, setIsRulebookOpen] = useState<boolean>(false);
  const [isXlsOpen, setIsXlsOpen] = useState<boolean>(false);
  const [isGameOverOpen, setIsGameOverOpen] = useState<boolean>(false);
  const [isLobbyOpen, setIsLobbyOpen] = useState<boolean>(true);
  const [isCardGalleryOpen, setIsCardGalleryOpen] = useState<boolean>(false);
  const [lobbyActionNotice, setLobbyActionNotice] = useState<string | null>(null);

  // Stable client ID & initial room code
  const initialClientId = useMemo(() => getOrCreateClientId(), []);
  const initialRoomCode = useMemo(() => generateRoomCode(), []);

  // Last synced game state timestamp ref for deduplication
  const lastGameSyncTimestampRef = useRef<number>(0);
  // Track previous game started state to handle lobby auto-open/close transitions
  const prevGameStartedRef = useRef<boolean>(false);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Client-Side Solo & PeerJS P2P Multiplayer State
  const [multiplayerState, setMultiplayerState] = useState<MultiplayerState>({
    roomCode: initialRoomCode,
    gameCode: initialRoomCode,
    totalPlayers: 1,
    myPlayerId: 1,
    myClientId: initialClientId,
    currentTurnIndex: 0,
    connectedClients: [],
    isGameActive: false,
    role: 'solo',
    connectionStatus: 'idle',
    connectionMessage: 'Mode Solo aktif (tanpa koneksi jaringan).',
    players: [
      {
        id: 1,
        name: 'Pemain Solo',
        isMainPlayer: true,
        color: '#d97757',
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

  // Build fresh game setup & optionally broadcast via PeerJS when multiplayer
  const startNewGame = (
    customCards?: SprawlopolisCard[],
    mode: 'local-only' | 'start-multiplayer' | 'reset-multiplayer' = 'reset-multiplayer'
  ) => {
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

    const payload: SyncedGameState = {
      goals: initialGoals,
      hand: initialHand,
      grid: initialGrid,
      deck: remainingDeck,
      history: [],
      isGameOver: false,
      timestamp: now
    };

    if (mode === 'start-multiplayer' && multiplayerSync.getRole() === 'host') {
      multiplayerSync.startGame(payload);
    } else if (mode === 'reset-multiplayer' && multiplayerSync.getRole() !== 'solo') {
      multiplayerSync.updateGameState(payload, 0);
    }
  };

  // Render an initial cozy board behind the opening Lobby
  useEffect(() => {
    startNewGame(undefined, 'local-only');
  }, []);

  // Subscribe to PeerJS P2P Real-Time Events (Zero HTTP polling, 100% browser-side)
  useEffect(() => {
    const unsubscribe = multiplayerSync.subscribe({
      onConnectionChange: (ev) => {
        setMultiplayerState((prev) => ({
          ...prev,
          role: ev.role,
          connectionStatus: ev.status,
          connectionMessage: ev.message,
          roomCode: ev.roomCode,
          gameCode: ev.roomCode
        }));
      },
      onActionError: (msg) => {
        setLobbyActionNotice(msg);
        if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
        noticeTimerRef.current = setTimeout(() => {
          setLobbyActionNotice(null);
        }, 4500);
      },
      onRoomUpdate: (room) => {
        const mySlotInRoom = room.players.find(
          (p) => p.occupantClientId === initialClientId
        );
        const resolvedSlotId = mySlotInRoom ? mySlotInRoom.id : 0;

        setMultiplayerState((prev) => ({
          ...prev,
          roomCode: room.roomCode,
          gameCode: room.roomCode,
          totalPlayers: room.totalPlayers,
          players: room.players,
          connectedClients: room.connectedClients,
          currentTurnIndex: room.currentTurnIndex,
          myPlayerId: resolvedSlotId,
          isGameActive: room.isGameStarted
        }));

        const wasStarted = prevGameStartedRef.current;
        const isNowStarted = !!room.isGameStarted;
        prevGameStartedRef.current = isNowStarted;

        if (!wasStarted && isNowStarted) {
          setIsLobbyOpen(false);
          setIsGameOverOpen(false);
        } else if (wasStarted && !isNowStarted) {
          setIsGameOverOpen(false);
          setIsLobbyOpen(true);
        }

        if (room.gameState && room.gameState.timestamp) {
          if (room.gameState.timestamp > lastGameSyncTimestampRef.current) {
            lastGameSyncTimestampRef.current = room.gameState.timestamp;
            setGoals(room.gameState.goals);
            setHand(room.gameState.hand);
            setGrid(room.gameState.grid);
            setDeck(room.gameState.deck);
            setHistory(room.gameState.history);
            setSelectedHandIndex((prevIdx) => {
              const len = room.gameState!.hand.length;
              if (len === 0) return null;
              if (prevIdx === null || prevIdx >= len) return 0;
              return prevIdx;
            });
            setIsGameOverOpen(!!room.gameState.isGameOver);
          }
        }
      }
    });

    return () => {
      unsubscribe();
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, [initialClientId]);

  // Cleanly close PeerJS on page unload
  useEffect(() => {
    const handleUnload = () => {
      if (multiplayerSync.getRole() !== 'solo') {
        multiplayerSync.disconnect();
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  // Determine current active turn player
  const isSolo = multiplayerState.totalPlayers === 1 && multiplayerState.role === 'solo';
  const currentTurnPlayer =
    multiplayerState.players[multiplayerState.currentTurnIndex] || multiplayerState.players[0];
  const isMyTurn = isSolo || (multiplayerState.myPlayerId > 0 && multiplayerState.myPlayerId === currentTurnPlayer?.id);

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
    if (!isMyTurn) return;
    if (selectedHandIndex === null || !hand[selectedHandIndex]) return;

    const cardToPlace = hand[selectedHandIndex];
    const orientedBlocks = getOrientedBlocks(cardToPlace.card.blocks, rotation);

    const newHistoryItem: MoveHistoryItem = {
      grid: { ...grid },
      hand: [...hand],
      deck: [...deck],
      placedCardId: cardToPlace.card.id,
      placedPos: pos,
      turnIndex: multiplayerState.currentTurnIndex
    };

    const updatedHistory = [...history, newHistoryItem];

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

    const updatedHand = hand.filter((_, idx) => idx !== selectedHandIndex);
    let updatedDeck = [...deck];

    if (updatedDeck.length > 0) {
      const drawnCard = updatedDeck[0];
      updatedDeck = updatedDeck.slice(1);
      updatedHand.push({ card: drawnCard, rotation: 0 });
    }

    const isGameOver = updatedHand.length === 0;
    const nextTurnIndex = isSolo
      ? 0
      : (multiplayerState.currentTurnIndex + 1) % multiplayerState.totalPlayers;

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

    if (!isSolo) {
      const payload: SyncedGameState = {
        goals,
        hand: updatedHand,
        grid: nextGrid,
        deck: updatedDeck,
        history: updatedHistory,
        isGameOver,
        timestamp: now
      };
      multiplayerSync.updateGameState(payload, nextTurnIndex);
    }

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
      const payload: SyncedGameState = {
        goals,
        hand: lastState.hand,
        grid: lastState.grid,
        deck: lastState.deck,
        history: updatedHistory,
        isGameOver: false,
        timestamp: now
      };
      multiplayerSync.updateGameState(payload, nextTurnIndex);
    }
  };

  // Switch turn manually from top bar
  const handleSwitchTurn = (newIndex: number) => {
    setMultiplayerState((prev) => ({ ...prev, currentTurnIndex: newIndex }));
    if (!isSolo) {
      multiplayerSync.updateGameState(undefined, newIndex);
    }
  };

  // Reset current game
  const handleResetGame = () => {
    startNewGame(undefined, isSolo ? 'local-only' : 'reset-multiplayer');
  };

  // Return to lobby handler (Solo & P2P Multiplayer)
  const handleReturnToLobby = () => {
    setIsGameOverOpen(false);
    setIsLobbyOpen(true);
    if (!isSolo) {
      multiplayerSync.resetRoom();
    }
    setMultiplayerState((prev) => ({
      ...prev,
      isGameActive: false
    }));
  };

  // Apply custom spreadsheet cards
  const handleApplyCustomCards = (customCards: SprawlopolisCard[]) => {
    setActiveCardsDeck(customCards);
    startNewGame(customCards, isSolo ? 'local-only' : 'reset-multiplayer');
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
        actionNotice={lobbyActionNotice}
        onClearActionNotice={() => setLobbyActionNotice(null)}
        onUpdateMultiplayerState={(partial) => setMultiplayerState((prev) => ({ ...prev, ...partial }))}
        onStartGame={() => {
          setIsLobbyOpen(false);
          startNewGame(undefined, isSolo ? 'local-only' : 'start-multiplayer');
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
