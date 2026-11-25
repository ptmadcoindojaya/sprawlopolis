import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

interface PlayerConfig {
  id: number;
  name: string;
  isMainPlayer: boolean;
  color: string;
  isReady: boolean;
  avatar: string;
  occupantClientId?: string | null;
  occupantName?: string;
  lastSeen?: number;
}

interface ConnectedClient {
  clientId: string;
  name: string;
  slotId: number | null;
  lastSeen: number;
}

interface RoomState {
  roomCode: string;
  totalPlayers: number;
  players: PlayerConfig[];
  connectedClients: ConnectedClient[];
  isGameStarted: boolean;
  currentTurnIndex: number;
  gameState?: any;
  updatedAt: number;
}

const PLAYER_COLORS = ['#f59e0b', '#06b6d4', '#10b981', '#a855f7'];

const rooms: Record<string, RoomState> = {};

function getDefaultRoom(roomCode: string): RoomState {
  return {
    roomCode,
    totalPlayers: 2,
    players: [
      { id: 1, name: 'Pemain 1', isMainPlayer: true, color: PLAYER_COLORS[0], isReady: true, avatar: 'P1', occupantClientId: null, occupantName: undefined },
      { id: 2, name: 'Pemain 2', isMainPlayer: false, color: PLAYER_COLORS[1], isReady: true, avatar: 'P2', occupantClientId: null, occupantName: undefined }
    ],
    connectedClients: [],
    isGameStarted: false,
    currentTurnIndex: 0,
    updatedAt: Date.now()
  };
}

function cleanStaleClients(room: RoomState) {
  const now = Date.now();
  // Filter clients active within last 10 seconds
  const activeClients = room.connectedClients.filter((c) => now - c.lastSeen < 10000);
  room.connectedClients = activeClients;

  // Clear slot occupants if their client is no longer active
  room.players = room.players.map((p) => {
    if (p.occupantClientId) {
      const isStillConnected = activeClients.some((c) => c.clientId === p.occupantClientId);
      if (!isStillConnected) {
        return {
          ...p,
          occupantClientId: null,
          occupantName: undefined
        };
      }
    }
    return p;
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Get current room state or initialize room
  app.get('/api/rooms/:roomCode', (req, res) => {
    const code = (req.params.roomCode || 'SPRAWL-18').toUpperCase().trim();
    if (!rooms[code]) {
      rooms[code] = getDefaultRoom(code);
    }
    const room = rooms[code];
    cleanStaleClients(room);
    res.json(room);
  });

  // Heartbeat & presence update
  app.post('/api/rooms/:roomCode/heartbeat', (req, res) => {
    const code = (req.params.roomCode || 'SPRAWL-18').toUpperCase().trim();
    const { clientId, name, slotId } = req.body;

    if (!clientId) {
      res.status(400).json({ error: 'Missing clientId' });
      return;
    }

    if (!rooms[code]) {
      rooms[code] = getDefaultRoom(code);
    }

    const room = rooms[code];
    const now = Date.now();

    // Update client list
    const existingIdx = room.connectedClients.findIndex((c) => c.clientId === clientId);
    if (existingIdx >= 0) {
      room.connectedClients[existingIdx] = {
        clientId,
        name: name || `Pemain`,
        slotId: slotId ?? room.connectedClients[existingIdx].slotId,
        lastSeen: now
      };
    } else {
      room.connectedClients.push({
        clientId,
        name: name || `Pemain`,
        slotId: slotId ?? null,
        lastSeen: now
      });
    }

    // Auto-claim slot 1 if room has no slot 1 occupant and this is first client
    const slot1 = room.players.find((p) => p.id === 1);
    if (slot1 && !slot1.occupantClientId && slotId === 1) {
      slot1.occupantClientId = clientId;
      slot1.occupantName = name || 'Pemain 1';
      slot1.name = name || 'Pemain 1';
    }

    // Update player occupant name if client matches
    if (slotId) {
      const p = room.players.find((pl) => pl.id === slotId);
      if (p && p.occupantClientId === clientId) {
        if (name) p.name = name;
        p.occupantName = name || p.name;
        p.lastSeen = now;
      }
    }

    cleanStaleClients(room);
    room.updatedAt = now;
    res.json(room);
  });

  // Claim slot in lobby
  app.post('/api/rooms/:roomCode/claim-slot', (req, res) => {
    const code = (req.params.roomCode || 'SPRAWL-18').toUpperCase().trim();
    const { clientId, slotId, name } = req.body;

    if (!rooms[code]) {
      rooms[code] = getDefaultRoom(code);
    }

    const room = rooms[code];
    const targetSlot = room.players.find((p) => p.id === slotId);

    if (!targetSlot) {
      res.status(400).json({ error: 'Slot tidak valid' });
      return;
    }

    // If slot is taken by ANOTHER client, reject claim
    if (targetSlot.occupantClientId && targetSlot.occupantClientId !== clientId) {
      res.status(409).json({
        error: `Slot ${slotId} sudah diisi oleh ${targetSlot.occupantName || 'pemain lain'}.`,
        room
      });
      return;
    }

    // Release any previous slot occupied by this client
    room.players = room.players.map((p) => {
      if (p.occupantClientId === clientId && p.id !== slotId) {
        return { ...p, occupantClientId: null, occupantName: undefined };
      }
      return p;
    });

    // Claim target slot
    targetSlot.occupantClientId = clientId;
    targetSlot.occupantName = name || targetSlot.name;
    if (name) targetSlot.name = name;
    targetSlot.lastSeen = Date.now();

    // Update client list
    const client = room.connectedClients.find((c) => c.clientId === clientId);
    if (client) {
      client.slotId = slotId;
      if (name) client.name = name;
    }

    room.updatedAt = Date.now();
    res.json(room);
  });

  // Release slot
  app.post('/api/rooms/:roomCode/release-slot', (req, res) => {
    const code = (req.params.roomCode || 'SPRAWL-18').toUpperCase().trim();
    const { clientId, slotId } = req.body;

    if (rooms[code]) {
      const room = rooms[code];
      room.players = room.players.map((p) =>
        p.id === slotId && p.occupantClientId === clientId
          ? { ...p, occupantClientId: null, occupantName: undefined }
          : p
      );
      room.updatedAt = Date.now();
      res.json(room);
    } else {
      res.json({ success: true });
    }
  });

  // Update player name endpoint
  app.post('/api/rooms/:roomCode/player-name', (req, res) => {
    const code = (req.params.roomCode || 'SPRAWL-18').toUpperCase().trim();
    const { slotId, name } = req.body;

    if (!rooms[code]) {
      rooms[code] = getDefaultRoom(code);
    }

    const room = rooms[code];
    const targetSlot = room.players.find((p) => p.id === slotId);
    if (targetSlot) {
      targetSlot.name = name || `Pemain ${slotId}`;
      if (targetSlot.occupantClientId) {
        targetSlot.occupantName = targetSlot.name;
      }
      room.updatedAt = Date.now();
    }
    res.json(room);
  });

  // Update room settings (mode/player count)
  app.post('/api/rooms/:roomCode/settings', (req, res) => {
    const code = (req.params.roomCode || 'SPRAWL-18').toUpperCase().trim();
    const { clientId, totalPlayers } = req.body;

    if (!rooms[code]) {
      rooms[code] = getDefaultRoom(code);
    }

    const room = rooms[code];
    const slot1 = room.players.find((p) => p.id === 1);

    // Allow setting changes if host or slot 1 is empty or caller is slot 1 occupant
    if (slot1?.occupantClientId && slot1.occupantClientId !== clientId) {
      res.status(403).json({ error: 'Hanya Pemain Utama (Slot 1) yang dapat mengubah mode room.' });
      return;
    }

    const count = Math.max(1, Math.min(4, totalPlayers || 2));
    const newPlayers: PlayerConfig[] = [];

    for (let i = 1; i <= count; i++) {
      const existing = room.players.find((p) => p.id === i);
      if (existing) {
        newPlayers.push(existing);
      } else {
        newPlayers.push({
          id: i,
          name: i === 1 ? 'Pemain Utama' : `Pemain ${i}`,
          isMainPlayer: i === 1,
          color: PLAYER_COLORS[(i - 1) % 4],
          isReady: true,
          avatar: `P${i}`,
          occupantClientId: null,
          occupantName: undefined
        });
      }
    }

    room.totalPlayers = count;
    room.players = newPlayers;
    room.updatedAt = Date.now();

    res.json(room);
  });

  // Start game
  app.post('/api/rooms/:roomCode/start', (req, res) => {
    const code = (req.params.roomCode || 'SPRAWL-18').toUpperCase().trim();
    const { clientId } = req.body;

    if (!rooms[code]) {
      rooms[code] = getDefaultRoom(code);
    }

    const room = rooms[code];
    room.isGameStarted = true;
    room.updatedAt = Date.now();

    res.json(room);
  });

  // Update live game state / turn
  app.post('/api/rooms/:roomCode/game-state', (req, res) => {
    const code = (req.params.roomCode || 'SPRAWL-18').toUpperCase().trim();
    const { gameState, currentTurnIndex } = req.body;

    if (rooms[code]) {
      const room = rooms[code];
      if (gameState !== undefined) room.gameState = gameState;
      if (currentTurnIndex !== undefined) room.currentTurnIndex = currentTurnIndex;
      room.updatedAt = Date.now();
      res.json(room);
    } else {
      res.status(404).json({ error: 'Room not found' });
    }
  });

  // Reset room back to lobby
  app.post('/api/rooms/:roomCode/reset', (req, res) => {
    const code = (req.params.roomCode || 'SPRAWL-18').toUpperCase().trim();
    if (rooms[code]) {
      rooms[code].isGameStarted = false;
      rooms[code].gameState = null;
      rooms[code].updatedAt = Date.now();
      res.json(rooms[code]);
    } else {
      res.json({ success: true });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
