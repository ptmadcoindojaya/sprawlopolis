/**
 * 100% Client-Side Peer-to-Peer Multiplayer Engine (PeerJS / WebRTC)
 * Works directly in browser & static hosts (GitHub Pages) with zero backend server.
 * Host acts as authoritative state owner for lobby slots, players, turn index, and gameState.
 */

import Peer, { DataConnection } from 'peerjs';
import {
  PlayerConfig,
  ConnectedClient,
  ConnectionStatus,
  PeerRole,
  SyncedGameState
} from '../types';

export interface AuthoritativeRoomState {
  roomCode: string;
  totalPlayers: number;
  players: PlayerConfig[];
  connectedClients: ConnectedClient[];
  isGameStarted: boolean;
  currentTurnIndex: number;
  gameState?: SyncedGameState;
  updatedAt: number;
}

export interface ConnectionEvent {
  role: PeerRole;
  status: ConnectionStatus;
  roomCode: string;
  message?: string;
}

type PeerAction =
  | { type: 'HELLO'; clientId: string; name: string }
  | { type: 'CLAIM_SLOT'; clientId: string; slotId: number; name: string }
  | { type: 'UPDATE_NAME'; clientId: string; slotId: number; name: string }
  | {
      type: 'UPDATE_GAME_STATE';
      clientId: string;
      gameState?: SyncedGameState;
      currentTurnIndex: number;
    }
  | { type: 'RESET_ROOM'; clientId: string };

type HostMessage =
  | { type: 'ROOM_STATE'; room: AuthoritativeRoomState }
  | { type: 'ACTION_ERROR'; targetClientId: string; message: string }
  | { type: 'HOST_CLOSING'; reason: string };

interface SyncSubscribers {
  onRoomUpdate?: (room: AuthoritativeRoomState) => void;
  onConnectionChange?: (event: ConnectionEvent) => void;
  onActionError?: (message: string) => void;
}

const SLOT_HEX_COLORS = ['#d97757', '#5c9ec8', '#5e9a6b', '#8f6cb2'];
const PEER_ID_PREFIX = 'sprawlopolis-p2p-v1-';

const PEER_OPTIONS = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  }
};

export function getOrCreateClientId(): string {
  try {
    let clientId = sessionStorage.getItem('sprawlopolis_client_id');
    if (!clientId) {
      clientId =
        'client_' +
        Math.random().toString(36).substring(2, 9) +
        '_' +
        Date.now().toString(36);
      sessionStorage.setItem('sprawlopolis_client_id', clientId);
    }
    return clientId;
  } catch {
    return 'client_' + Math.random().toString(36).substring(2, 10);
  }
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SPRAWL-${suffix}`;
}

export function normalizeRoomCode(raw: string): string {
  const cleaned = (raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20);
  return cleaned || generateRoomCode();
}

function hostPeerIdForRoom(roomCode: string): string {
  return `${PEER_ID_PREFIX}${roomCode.toLowerCase()}`;
}

function sanitizeName(name: string, fallback: string): string {
  const trimmed = (name || '').trim().slice(0, 28);
  return trimmed || fallback;
}

function createInitialPlayers(
  totalPlayers: number,
  hostClientId: string,
  hostName: string,
  existingPlayers: PlayerConfig[] = []
): PlayerConfig[] {
  const players: PlayerConfig[] = [];
  for (let i = 1; i <= totalPlayers; i++) {
    const prev = existingPlayers.find((p) => p.id === i);
    if (prev) {
      players.push({
        ...prev,
        isMainPlayer: i === 1,
        color: SLOT_HEX_COLORS[(i - 1) % 4],
        avatar: `P${i}`
      });
    } else if (i === 1) {
      const cleanHost = sanitizeName(hostName, 'Pemain Utama');
      players.push({
        id: 1,
        name: cleanHost,
        isMainPlayer: true,
        color: SLOT_HEX_COLORS[0],
        isReady: true,
        avatar: 'P1',
        occupantClientId: hostClientId,
        occupantName: cleanHost,
        lastSeen: Date.now()
      });
    } else {
      players.push({
        id: i,
        name: `Pemain ${i}`,
        isMainPlayer: false,
        color: SLOT_HEX_COLORS[(i - 1) % 4],
        isReady: true,
        avatar: `P${i}`,
        occupantClientId: null,
        occupantName: undefined
      });
    }
  }
  return players;
}

class PeerMultiplayerManager {
  private clientId: string = getOrCreateClientId();
  private peer: Peer | null = null;
  private role: PeerRole = 'solo';
  private status: ConnectionStatus = 'idle';
  private roomCode: string = generateRoomCode();

  // Host-only state
  private hostRoomState: AuthoritativeRoomState | null = null;
  private guestConnections: Map<string, DataConnection> = new Map(); // key: guest peerId
  private peerIdToClientId: Map<string, string> = new Map();

  // Guest-only state
  private hostConnection: DataConnection | null = null;
  private connectTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private subscribers: SyncSubscribers = {};
  private sessionSeq = 0;

  public subscribe(subs: SyncSubscribers): () => void {
    this.subscribers = subs;
    return () => {
      this.subscribers = {};
    };
  }

  public getRole(): PeerRole {
    return this.role;
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getRoomCode(): string {
    return this.roomCode;
  }

  private emitConnection(role: PeerRole, status: ConnectionStatus, roomCode: string, message?: string) {
    this.role = role;
    this.status = status;
    this.roomCode = roomCode;
    this.subscribers.onConnectionChange?.({ role, status, roomCode, message });
  }

  private emitRoomState(room: AuthoritativeRoomState) {
    this.subscribers.onRoomUpdate?.(room);
  }

  private emitActionError(message: string) {
    this.subscribers.onActionError?.(message);
  }

  private clearConnectTimeout() {
    if (this.connectTimeoutId !== null) {
      clearTimeout(this.connectTimeoutId);
      this.connectTimeoutId = null;
    }
  }

  private teardownPeer(notifyGuests: boolean = true) {
    this.sessionSeq += 1;
    this.clearConnectTimeout();

    if (notifyGuests && this.role === 'host') {
      const closingMsg: HostMessage = {
        type: 'HOST_CLOSING',
        reason: 'Host menutup atau berpindah room.'
      };
      this.guestConnections.forEach((conn) => {
        try {
          if (conn.open) conn.send(closingMsg);
          conn.close();
        } catch {
          // Ignore close errors
        }
      });
    }

    this.guestConnections.clear();
    this.peerIdToClientId.clear();

    if (this.hostConnection) {
      try {
        this.hostConnection.close();
      } catch {
        // Ignore
      }
      this.hostConnection = null;
    }

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // Ignore
      }
      this.peer = null;
    }

    this.hostRoomState = null;
  }

  /**
   * Disconnect from P2P network and return cleanly to offline Solo mode.
   */
  public disconnect() {
    this.teardownPeer(true);
    this.emitConnection('solo', 'idle', this.roomCode, 'Mode Solo aktif (tanpa koneksi jaringan).');
  }

  /**
   * Start hosting a P2P room with the given code.
   */
  public hostRoom(
    rawRoomCode: string,
    totalPlayers: number,
    hostName: string,
    existingPlayers?: PlayerConfig[],
    existingGameState?: SyncedGameState
  ) {
    const cleanCode = normalizeRoomCode(rawRoomCode);
    const clampedPlayers = Math.min(4, Math.max(2, totalPlayers));
    const cleanHostName = sanitizeName(hostName, 'Pemain Utama');

    this.teardownPeer(true);
    const seq = this.sessionSeq;

    const initialPlayers = createInitialPlayers(
      clampedPlayers,
      this.clientId,
      cleanHostName,
      existingPlayers
    );
    // Guarantee Host owns Slot 1
    if (initialPlayers[0]) {
      initialPlayers[0] = {
        ...initialPlayers[0],
        name: cleanHostName,
        occupantClientId: this.clientId,
        occupantName: cleanHostName,
        isMainPlayer: true,
        lastSeen: Date.now()
      };
    }

    this.hostRoomState = {
      roomCode: cleanCode,
      totalPlayers: clampedPlayers,
      players: initialPlayers,
      connectedClients: [
        {
          clientId: this.clientId,
          name: cleanHostName,
          slotId: 1,
          lastSeen: Date.now()
        }
      ],
      isGameStarted: false,
      currentTurnIndex: 0,
      gameState: existingGameState,
      updatedAt: Date.now()
    };

    this.emitConnection('host', 'connecting', cleanCode, `Membuka room ${cleanCode} sebagai Host...`);
    this.emitRoomState({ ...this.hostRoomState });

    const peerId = hostPeerIdForRoom(cleanCode);
    const peer = new Peer(peerId, PEER_OPTIONS);
    this.peer = peer;

    this.connectTimeoutId = setTimeout(() => {
      if (seq !== this.sessionSeq) return;
      if (this.status === 'connecting') {
        this.emitConnection(
          'host',
          'error',
          cleanCode,
          'Waktu koneksi jaringan P2P habis. Coba klik Buat / Host lagi.'
        );
      }
    }, 12000);

    peer.on('open', () => {
      if (seq !== this.sessionSeq) return;
      this.clearConnectTimeout();
      this.emitConnection(
        'host',
        'host-ready',
        cleanCode,
        `Terhubung sebagai Host · Bagikan kode ${cleanCode}`
      );
      if (this.hostRoomState) {
        this.emitRoomState({ ...this.hostRoomState });
      }
    });

    peer.on('connection', (conn: DataConnection) => {
      if (seq !== this.sessionSeq) {
        conn.close();
        return;
      }

      conn.on('open', () => {
        if (seq !== this.sessionSeq) return;
        this.guestConnections.set(conn.peer, conn);
        if (this.hostRoomState) {
          this.sendToConn(conn, { type: 'ROOM_STATE', room: this.hostRoomState });
        }
      });

      conn.on('data', (raw: unknown) => {
        if (seq !== this.sessionSeq) return;
        this.handleHostIncomingAction(conn, raw as PeerAction);
      });

      conn.on('close', () => {
        if (seq !== this.sessionSeq) return;
        this.handleGuestDisconnected(conn.peer);
      });

      conn.on('error', () => {
        if (seq !== this.sessionSeq) return;
        this.handleGuestDisconnected(conn.peer);
      });
    });

    peer.on('disconnected', () => {
      if (seq !== this.sessionSeq) return;
      try {
        if (!peer.destroyed) peer.reconnect();
      } catch {
        // Ignore reconnect error
      }
    });

    peer.on('error', (err: { type?: string; message?: string }) => {
      if (seq !== this.sessionSeq) return;
      this.clearConnectTimeout();
      if (err?.type === 'unavailable-id') {
        this.emitConnection(
          'host',
          'error',
          cleanCode,
          `Kode room "${cleanCode}" sedang digunakan Host lain. Buat kode baru atau klik Gabung.`
        );
      } else if (err?.type === 'network' || err?.type === 'server-error' || err?.type === 'socket-error') {
        this.emitConnection(
          'host',
          'error',
          cleanCode,
          'Tidak dapat terhubung ke server signaling PeerJS. Periksa koneksi internet Anda.'
        );
      } else {
        this.emitConnection(
          'host',
          'error',
          cleanCode,
          `Koneksi Host bermasalah (${err?.type || 'unknown'}). Silakan coba ulang.`
        );
      }
    });
  }

  /**
   * Join an existing Host room as a Guest peer.
   */
  public joinRoom(rawRoomCode: string, guestName: string) {
    const cleanCode = normalizeRoomCode(rawRoomCode);
    const cleanGuestName = sanitizeName(guestName, 'Pemain Tamu');

    this.teardownPeer(true);
    const seq = this.sessionSeq;

    this.emitConnection(
      'guest',
      'connecting',
      cleanCode,
      `Menghubungkan ke Host room ${cleanCode}...`
    );

    const peer = new Peer(PEER_OPTIONS);
    this.peer = peer;

    this.connectTimeoutId = setTimeout(() => {
      if (seq !== this.sessionSeq) return;
      if (this.status === 'connecting') {
        this.teardownPeer(false);
        this.emitConnection(
          'guest',
          'error',
          cleanCode,
          `Gagal terhubung ke room "${cleanCode}". Pastikan Host sudah membuka room dan kode benar.`
        );
      }
    }, 10000);

    peer.on('open', () => {
      if (seq !== this.sessionSeq) return;
      const targetPeerId = hostPeerIdForRoom(cleanCode);
      const conn = peer.connect(targetPeerId, { reliable: true });
      this.hostConnection = conn;

      conn.on('open', () => {
        if (seq !== this.sessionSeq) return;
        this.clearConnectTimeout();
        this.emitConnection(
          'guest',
          'connected',
          cleanCode,
          `Terhubung ke Host · Room ${cleanCode}`
        );
        this.sendToHost({
          type: 'HELLO',
          clientId: this.clientId,
          name: cleanGuestName
        });
      });

      conn.on('data', (raw: unknown) => {
        if (seq !== this.sessionSeq) return;
        this.handleGuestIncomingMessage(raw as HostMessage);
      });

      conn.on('close', () => {
        if (seq !== this.sessionSeq) return;
        this.clearConnectTimeout();
        this.hostConnection = null;
        this.emitConnection(
          'guest',
          'error',
          cleanCode,
          `Koneksi ke Host room ${cleanCode} terputus.`
        );
      });

      conn.on('error', () => {
        if (seq !== this.sessionSeq) return;
        this.clearConnectTimeout();
        this.emitConnection(
          'guest',
          'error',
          cleanCode,
          `Gagal berkomunikasi dengan Host room ${cleanCode}.`
        );
      });
    });

    peer.on('error', (err: { type?: string; message?: string }) => {
      if (seq !== this.sessionSeq) return;
      this.clearConnectTimeout();
      if (err?.type === 'peer-unavailable') {
        this.emitConnection(
          'guest',
          'error',
          cleanCode,
          `Kode room "${cleanCode}" tidak ditemukan. Pastikan Host sudah aktif di lobi.`
        );
      } else {
        this.emitConnection(
          'guest',
          'error',
          cleanCode,
          `Gagal terhubung ke jaringan P2P (${err?.type || 'error'}).`
        );
      }
    });
  }

  private sendToConn(conn: DataConnection, msg: HostMessage) {
    try {
      if (conn.open) conn.send(msg);
    } catch {
      // Ignore send failure
    }
  }

  private sendToHost(action: PeerAction) {
    if (!this.hostConnection || !this.hostConnection.open) {
      this.emitActionError('Belum terhubung ke Host. Periksa koneksi room Anda.');
      return;
    }
    try {
      this.hostConnection.send(action);
    } catch {
      this.emitActionError('Gagal mengirim aksi ke Host.');
    }
  }

  private broadcastRoomState() {
    if (!this.hostRoomState) return;
    this.hostRoomState.updatedAt = Date.now();
    const snapshot: AuthoritativeRoomState = {
      ...this.hostRoomState,
      players: this.hostRoomState.players.map((p) => ({ ...p })),
      connectedClients: this.hostRoomState.connectedClients.map((c) => ({ ...c }))
    };
    const msg: HostMessage = { type: 'ROOM_STATE', room: snapshot };
    this.guestConnections.forEach((conn) => {
      this.sendToConn(conn, msg);
    });
    this.emitRoomState(snapshot);
  }

  private handleGuestIncomingMessage(msg: HostMessage) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'ROOM_STATE' && msg.room) {
      this.emitRoomState(msg.room);
    } else if (msg.type === 'ACTION_ERROR') {
      if (msg.targetClientId === this.clientId) {
        this.emitActionError(msg.message);
      }
    } else if (msg.type === 'HOST_CLOSING') {
      this.emitConnection('guest', 'error', this.roomCode, msg.reason);
    }
  }

  private handleGuestDisconnected(peerId: string) {
    this.guestConnections.delete(peerId);
    const departedClientId = this.peerIdToClientId.get(peerId);
    this.peerIdToClientId.delete(peerId);

    if (!departedClientId || !this.hostRoomState) return;

    this.hostRoomState.connectedClients = this.hostRoomState.connectedClients.filter(
      (c) => c.clientId !== departedClientId
    );
    this.hostRoomState.players = this.hostRoomState.players.map((p) =>
      p.occupantClientId === departedClientId
        ? { ...p, occupantClientId: null, occupantName: undefined }
        : p
    );

    this.broadcastRoomState();
  }

  private handleHostIncomingAction(conn: DataConnection, action: PeerAction) {
    if (!this.hostRoomState || !action || typeof action !== 'object') return;

    switch (action.type) {
      case 'HELLO': {
        const guestClientId = String(action.clientId || '').slice(0, 64);
        if (!guestClientId) return;
        this.peerIdToClientId.set(conn.peer, guestClientId);

        const cleanName = sanitizeName(action.name, 'Pemain Tamu');
        let assignedSlotId: number | null = null;

        // Check if this client already occupies a slot
        const existingSlot = this.hostRoomState.players.find(
          (p) => p.occupantClientId === guestClientId
        );
        if (existingSlot) {
          assignedSlotId = existingSlot.id;
        } else {
          // Auto-assign first open slot (Slot 2..totalPlayers)
          const openSlot = this.hostRoomState.players.find(
            (p) => p.id > 1 && !p.occupantClientId
          );
          if (openSlot) {
            assignedSlotId = openSlot.id;
            const slotDisplayName =
              cleanName === 'Pemain Solo' || cleanName === 'Pemain Tamu'
                ? `Pemain ${openSlot.id}`
                : cleanName;
            openSlot.occupantClientId = guestClientId;
            openSlot.occupantName = slotDisplayName;
            openSlot.name = slotDisplayName;
            openSlot.lastSeen = Date.now();
          }
        }

        const displayName =
          this.hostRoomState.players.find((p) => p.id === assignedSlotId)?.name || cleanName;

        // Upsert connectedClients (idempotent)
        const existingIdx = this.hostRoomState.connectedClients.findIndex(
          (c) => c.clientId === guestClientId
        );
        const clientEntry: ConnectedClient = {
          clientId: guestClientId,
          name: displayName,
          slotId: assignedSlotId,
          lastSeen: Date.now()
        };
        if (existingIdx >= 0) {
          this.hostRoomState.connectedClients[existingIdx] = clientEntry;
        } else {
          this.hostRoomState.connectedClients.push(clientEntry);
        }

        this.broadcastRoomState();
        break;
      }

      case 'CLAIM_SLOT': {
        const result = this.applyClaimSlotOnHost(
          action.clientId,
          action.slotId,
          action.name
        );
        if (!result.ok && result.error) {
          this.sendToConn(conn, {
            type: 'ACTION_ERROR',
            targetClientId: action.clientId,
            message: result.error
          });
        }
        break;
      }

      case 'UPDATE_NAME': {
        this.applyUpdateNameOnHost(action.clientId, action.slotId, action.name);
        break;
      }

      case 'UPDATE_GAME_STATE': {
        this.applyGameStateOnHost(action.gameState, action.currentTurnIndex);
        break;
      }

      case 'RESET_ROOM': {
        this.applyResetRoomOnHost();
        break;
      }
    }
  }

  private applyClaimSlotOnHost(
    actorClientId: string,
    slotId: number,
    name: string
  ): { ok: boolean; error?: string } {
    if (!this.hostRoomState) return { ok: false, error: 'Room tidak aktif.' };

    const target = this.hostRoomState.players.find((p) => p.id === slotId);
    if (!target) return { ok: false, error: 'Slot pemain tidak tersedia.' };

    if (target.occupantClientId && target.occupantClientId !== actorClientId) {
      return {
        ok: false,
        error: `Slot ${slotId} sudah diisi oleh ${target.occupantName || target.name}.`
      };
    }

    // Slot 1 is reserved for Host
    if (slotId === 1 && actorClientId !== this.clientId) {
      return {
        ok: false,
        error: 'Slot 1 dikunci khusus untuk Host (Pemain Utama).'
      };
    }

    const cleanName = sanitizeName(name, `Pemain ${slotId}`);

    // Release any other slot previously held by this client
    this.hostRoomState.players = this.hostRoomState.players.map((p) => {
      if (p.id === slotId) {
        return {
          ...p,
          name: cleanName,
          occupantClientId: actorClientId,
          occupantName: cleanName,
          lastSeen: Date.now()
        };
      }
      if (p.occupantClientId === actorClientId) {
        return {
          ...p,
          occupantClientId: null,
          occupantName: undefined
        };
      }
      return p;
    });

    // Sync connectedClients entry
    const idx = this.hostRoomState.connectedClients.findIndex(
      (c) => c.clientId === actorClientId
    );
    const updatedClient: ConnectedClient = {
      clientId: actorClientId,
      name: cleanName,
      slotId,
      lastSeen: Date.now()
    };
    if (idx >= 0) {
      this.hostRoomState.connectedClients[idx] = updatedClient;
    } else {
      this.hostRoomState.connectedClients.push(updatedClient);
    }

    this.broadcastRoomState();
    return { ok: true };
  }

  private applyUpdateNameOnHost(actorClientId: string, slotId: number, name: string) {
    if (!this.hostRoomState) return;
    const target = this.hostRoomState.players.find((p) => p.id === slotId);
    if (!target) return;

    // Allow editing own slot, or Host editing any unoccupied slot
    const isOwner = target.occupantClientId === actorClientId;
    const isHostEditingEmpty = actorClientId === this.clientId && !target.occupantClientId;
    if (!isOwner && !isHostEditingEmpty) return;

    const safeDisplay = name.slice(0, 28);
    const cleanForClient = sanitizeName(safeDisplay, `Pemain ${slotId}`);

    this.hostRoomState.players = this.hostRoomState.players.map((p) =>
      p.id === slotId
        ? {
            ...p,
            name: safeDisplay,
            occupantName: p.occupantClientId ? cleanForClient : p.occupantName,
            lastSeen: Date.now()
          }
        : p
    );

    if (target.occupantClientId) {
      this.hostRoomState.connectedClients = this.hostRoomState.connectedClients.map((c) =>
        c.clientId === target.occupantClientId ? { ...c, name: cleanForClient } : c
      );
    }

    this.broadcastRoomState();
  }

  private applyGameStateOnHost(
    incomingGameState: SyncedGameState | undefined,
    currentTurnIndex: number
  ) {
    if (!this.hostRoomState) return;

    if (incomingGameState) {
      const prevTs = this.hostRoomState.gameState?.timestamp || 0;
      if (incomingGameState.timestamp >= prevTs) {
        this.hostRoomState.gameState = incomingGameState;
      }
    }

    const total = Math.max(1, this.hostRoomState.totalPlayers);
    this.hostRoomState.currentTurnIndex =
      ((currentTurnIndex % total) + total) % total;

    this.broadcastRoomState();
  }

  private applyResetRoomOnHost() {
    if (!this.hostRoomState) return;
    this.hostRoomState.isGameStarted = false;
    this.hostRoomState.currentTurnIndex = 0;
    if (this.hostRoomState.gameState) {
      this.hostRoomState.gameState = {
        ...this.hostRoomState.gameState,
        isGameOver: false,
        timestamp: Date.now()
      };
    }
    this.broadcastRoomState();
  }

  // =========================================================================
  // Public High-Level Actions (Host & Guest Transparent API)
  // =========================================================================

  public updateRoomSettings(totalPlayers: number) {
    if (totalPlayers <= 1) {
      this.disconnect();
      return;
    }

    if (this.role !== 'host' || !this.hostRoomState) return;

    const clamped = Math.min(4, Math.max(2, totalPlayers));
    const hostPlayer = this.hostRoomState.players[0];
    const hostName = hostPlayer?.name || 'Pemain Utama';

    const nextPlayers = createInitialPlayers(
      clamped,
      this.clientId,
      hostName,
      this.hostRoomState.players
    );

    // Clear slotId for any connected client whose slot was removed
    const validSlotIds = new Set(nextPlayers.map((p) => p.id));
    this.hostRoomState.connectedClients = this.hostRoomState.connectedClients.map((c) =>
      c.slotId && !validSlotIds.has(c.slotId) ? { ...c, slotId: null } : c
    );

    this.hostRoomState.totalPlayers = clamped;
    this.hostRoomState.players = nextPlayers;
    if (this.hostRoomState.currentTurnIndex >= clamped) {
      this.hostRoomState.currentTurnIndex = 0;
    }

    this.broadcastRoomState();
  }

  public claimSlot(slotId: number, name: string) {
    if (this.role === 'host') {
      const res = this.applyClaimSlotOnHost(this.clientId, slotId, name);
      if (!res.ok && res.error) this.emitActionError(res.error);
    } else if (this.role === 'guest') {
      this.sendToHost({
        type: 'CLAIM_SLOT',
        clientId: this.clientId,
        slotId,
        name
      });
    }
  }

  public updatePlayerName(slotId: number, name: string) {
    if (this.role === 'host') {
      this.applyUpdateNameOnHost(this.clientId, slotId, name);
    } else if (this.role === 'guest') {
      this.sendToHost({
        type: 'UPDATE_NAME',
        clientId: this.clientId,
        slotId,
        name
      });
    }
  }

  public startGame(initialGameState: SyncedGameState) {
    if (this.role !== 'host' || !this.hostRoomState) return;
    this.hostRoomState.isGameStarted = true;
    this.hostRoomState.currentTurnIndex = 0;
    this.hostRoomState.gameState = initialGameState;
    this.broadcastRoomState();
  }

  public updateGameState(
    gameState: SyncedGameState | undefined,
    currentTurnIndex: number
  ) {
    if (this.role === 'host') {
      this.applyGameStateOnHost(gameState, currentTurnIndex);
    } else if (this.role === 'guest') {
      this.sendToHost({
        type: 'UPDATE_GAME_STATE',
        clientId: this.clientId,
        gameState,
        currentTurnIndex
      });
    }
  }

  public resetRoom() {
    if (this.role === 'host') {
      this.applyResetRoomOnHost();
    } else if (this.role === 'guest') {
      this.sendToHost({
        type: 'RESET_ROOM',
        clientId: this.clientId
      });
    }
  }
}

export const multiplayerSync = new PeerMultiplayerManager();
