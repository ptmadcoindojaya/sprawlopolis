/**
 * Real-time Multiplayer Room & Lobby Sync Utility
 * Hybrid approach: Uses Express backend API (/api/rooms/:roomCode) for cross-device/cross-browser sync,
 * plus BroadcastChannel for instant local updates.
 */

import { PlayerConfig, ConnectedClient } from '../types';

export function getOrCreateClientId(): string {
  let clientId = sessionStorage.getItem('sprawlopolis_client_id');
  if (!clientId) {
    clientId = 'client_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    sessionStorage.setItem('sprawlopolis_client_id', clientId);
  }
  return clientId;
}

export interface ServerRoomState {
  roomCode: string;
  totalPlayers: number;
  players: PlayerConfig[];
  connectedClients: ConnectedClient[];
  isGameStarted: boolean;
  currentTurnIndex: number;
  gameState?: any;
  updatedAt: number;
}

// API methods
export async function apiGetRoomState(roomCode: string): Promise<ServerRoomState | null> {
  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch room state:', err);
    return null;
  }
}

export async function apiHeartbeat(
  roomCode: string,
  clientId: string,
  name: string,
  slotId: number | null
): Promise<ServerRoomState | null> {
  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, name, slotId })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Heartbeat error:', err);
    return null;
  }
}

export async function apiClaimSlot(
  roomCode: string,
  clientId: string,
  slotId: number,
  name: string
): Promise<{ success: boolean; room?: ServerRoomState; error?: string }> {
  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/claim-slot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, slotId, name })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error, room: data.room };
    }
    return { success: true, room: data };
  } catch (err) {
    console.warn('Claim slot error:', err);
    return { success: false, error: 'Gagal terhubung ke server.' };
  }
}

export async function apiReleaseSlot(
  roomCode: string,
  clientId: string,
  slotId: number
): Promise<ServerRoomState | null> {
  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/release-slot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, slotId })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function apiUpdatePlayerName(
  roomCode: string,
  slotId: number,
  name: string
): Promise<ServerRoomState | null> {
  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/player-name`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId, name })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function apiUpdateRoomSettings(
  roomCode: string,
  clientId: string,
  totalPlayers: number
): Promise<{ success: boolean; room?: ServerRoomState; error?: string }> {
  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, totalPlayers })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error };
    }
    return { success: true, room: data };
  } catch (err) {
    return { success: false, error: 'Gagal mengubah pengaturan room.' };
  }
}

export async function apiStartGame(
  roomCode: string,
  clientId: string
): Promise<ServerRoomState | null> {
  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function apiUpdateGameState(
  roomCode: string,
  gameState: any,
  currentTurnIndex: number
): Promise<ServerRoomState | null> {
  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/game-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameState, currentTurnIndex })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function apiResetRoom(roomCode: string): Promise<ServerRoomState | null> {
  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

class MultiplayerSyncManager {
  private currentRoomCode: string = 'SPRAWL-18';
  private clientId: string = getOrCreateClientId();
  private pollInterval: NodeJS.Timeout | null = null;
  private onRoomUpdateCallback: ((roomState: ServerRoomState) => void) | null = null;

  public startPolling(
    roomCode: string,
    playerName: string,
    mySlotId: number | null,
    onUpdate: (roomState: ServerRoomState) => void
  ) {
    this.currentRoomCode = (roomCode || 'SPRAWL-18').toUpperCase().trim();
    this.onRoomUpdateCallback = onUpdate;

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    const doHeartbeat = async () => {
      const roomState = await apiHeartbeat(this.currentRoomCode, this.clientId, playerName, mySlotId);
      if (roomState && this.onRoomUpdateCallback) {
        this.onRoomUpdateCallback(roomState);
      }
    };

    // Initial trigger
    doHeartbeat();

    // Poll every 800ms
    this.pollInterval = setInterval(doHeartbeat, 800);
  }

  public stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.onRoomUpdateCallback = null;
  }
}

export const multiplayerSync = new MultiplayerSyncManager();
