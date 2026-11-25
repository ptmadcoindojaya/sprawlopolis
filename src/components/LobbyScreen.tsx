import React, { useState, useEffect } from 'react';
import { PlayerConfig, MultiplayerState } from '../types';
import {
  getOrCreateClientId,
  generateRoomCode,
  normalizeRoomCode,
  multiplayerSync
} from '../utils/multiplayerSync';
import {
  Users,
  User,
  Crown,
  UserCheck,
  Play,
  Copy,
  Check,
  BookOpen,
  FileSpreadsheet,
  Building2,
  Sparkles,
  RefreshCw,
  Info,
  Gamepad2,
  Lock,
  Radio,
  KeyRound,
  Layers,
  X,
  Wifi,
  WifiOff,
  Loader2,
  AlertCircle,
  LogOut,
  Dices
} from 'lucide-react';

interface LobbyScreenProps {
  isOpen: boolean;
  multiplayerState: MultiplayerState;
  actionNotice?: string | null;
  onClearActionNotice?: () => void;
  onUpdateMultiplayerState: (newState: Partial<MultiplayerState>) => void;
  onStartGame: () => void;
  onOpenRulebook: () => void;
  onOpenXlsImport: () => void;
  onOpenCardGallery?: () => void;
  onClose?: () => void;
}

export const PLAYER_COLORS = [
  { bg: 'bg-[#fae9e2]', border: 'border-[#e3a38c]', text: 'text-[#8f3d23]', badgeBg: 'bg-[#d97757]', hex: '#d97757' },
  { bg: 'bg-[#e6f2fa]', border: 'border-[#8ec5e8]', text: 'text-[#1e4d6b]', badgeBg: 'bg-[#5c9ec8]', hex: '#5c9ec8' },
  { bg: 'bg-[#e7f3ea]', border: 'border-[#9fd3a8]', text: 'text-[#235430]', badgeBg: 'bg-[#5e9a6b]', hex: '#5e9a6b' },
  { bg: 'bg-[#f2ecf9]', border: 'border-[#c8b2df]', text: 'text-[#543673]', badgeBg: 'bg-[#8f6cb2]', hex: '#8f6cb2' }
];

export function LobbyScreen({
  isOpen,
  multiplayerState,
  actionNotice,
  onClearActionNotice,
  onUpdateMultiplayerState,
  onStartGame,
  onOpenRulebook,
  onOpenXlsImport,
  onOpenCardGallery,
  onClose
}: LobbyScreenProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [roomInput, setRoomInput] = useState(multiplayerState.roomCode || '');
  const [joinCodeInput, setJoinCodeInput] = useState('');

  const {
    totalPlayers,
    myPlayerId,
    players,
    roomCode,
    connectedClients,
    role,
    connectionStatus,
    connectionMessage
  } = multiplayerState;

  const myClientId = multiplayerState.myClientId || getOrCreateClientId();
  const isSolo = totalPlayers === 1 && role === 'solo';
  const isHost = role === 'host';
  const isGuest = role === 'guest';

  useEffect(() => {
    if (roomCode) {
      setRoomInput(roomCode);
    }
  }, [roomCode]);

  if (!isOpen) return null;

  const myCurrentDisplayName =
    players.find((p) => p.id === myPlayerId)?.name ||
    (isSolo ? 'Pemain Solo' : `Pemain ${myPlayerId || 2}`);

  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard?.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleHostWithCode = (customCode?: string, targetCount?: number) => {
    onClearActionNotice?.();
    const count = Math.max(2, targetCount || (totalPlayers > 1 ? totalPlayers : 2));
    const codeToUse = normalizeRoomCode(customCode ?? roomInput);
    setRoomInput(codeToUse);
    const hostDisplayName =
      myCurrentDisplayName === 'Pemain Solo' ? 'Pemain Utama' : myCurrentDisplayName;
    multiplayerSync.hostRoom(codeToUse, count, hostDisplayName, players);
  };

  const handleRegenerateHostCode = () => {
    const freshCode = generateRoomCode();
    setRoomInput(freshCode);
    handleHostWithCode(freshCode, Math.max(2, totalPlayers));
  };

  const handleJoinRoomByCode = (rawCode: string) => {
    onClearActionNotice?.();
    const trimmed = rawCode.trim().toUpperCase();
    if (!trimmed) return;
    const clean = normalizeRoomCode(trimmed);
    setRoomInput(clean);
    setJoinCodeInput(clean);
    const guestName =
      myCurrentDisplayName === 'Pemain Solo' || myCurrentDisplayName === 'Pemain Utama'
        ? 'Pemain Tamu'
        : myCurrentDisplayName;
    multiplayerSync.joinRoom(clean, guestName);
  };

  const handleLeaveToSolo = () => {
    onClearActionNotice?.();
    multiplayerSync.disconnect();
    const soloName =
      myCurrentDisplayName && myCurrentDisplayName !== 'Pemain Utama'
        ? myCurrentDisplayName
        : 'Pemain Solo';
    const soloPlayer: PlayerConfig = {
      id: 1,
      name: soloName,
      isMainPlayer: true,
      color: '#d97757',
      isReady: true,
      avatar: 'P1',
      occupantClientId: myClientId,
      occupantName: soloName
    };
    onUpdateMultiplayerState({
      totalPlayers: 1,
      myPlayerId: 1,
      currentTurnIndex: 0,
      players: [soloPlayer],
      connectedClients: [],
      isGameActive: false,
      role: 'solo',
      connectionStatus: 'idle',
      connectionMessage: 'Mode Solo aktif (tanpa koneksi jaringan).'
    });
  };

  const handleTotalPlayersChange = (count: number) => {
    onClearActionNotice?.();
    if (count === 1) {
      handleLeaveToSolo();
      return;
    }

    if (isGuest) return;

    if (isSolo) {
      // Auto-host a new P2P room immediately when switching from Solo to 2-4 players
      const code = roomCode || generateRoomCode();
      handleHostWithCode(code, count);
    } else if (isHost) {
      multiplayerSync.updateRoomSettings(count);
    }
  };

  const handleSelectMySlot = (targetSlotId: number) => {
    onClearActionNotice?.();
    const preferredName =
      myCurrentDisplayName && myCurrentDisplayName !== 'Pemain Solo'
        ? myCurrentDisplayName
        : `Pemain ${targetSlotId}`;
    multiplayerSync.claimSlot(targetSlotId, preferredName);
  };

  const handlePlayerNameChange = (id: number, newName: string) => {
    const updatedPlayers = players.map((p) =>
      p.id === id ? { ...p, name: newName } : p
    );
    onUpdateMultiplayerState({ players: updatedPlayers });

    if (!isSolo) {
      multiplayerSync.updatePlayerName(id, newName);
    }
  };

  const handleStartGameClick = () => {
    onClearActionNotice?.();
    onStartGame();
  };

  const mainPlayerConfig = players.find((p) => p.id === 1) || players[0];

  // Connection status banner styling
  const renderConnectionStatusBadge = () => {
    if (isSolo) {
      return (
        <div className="px-3 py-2 rounded-xl bg-[#e7f3ea] border border-[#b4ddb9] text-[#235430] text-xs font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#4d8b5d] shrink-0" />
          <span>Mode Solo · Siap bermain instan tanpa koneksi internet</span>
        </div>
      );
    }

    if (connectionStatus === 'connecting') {
      return (
        <div className="px-3 py-2 rounded-xl bg-[#fbf2df] border border-[#e3c995] text-[#855a1c] text-xs font-semibold flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#c88a2e] shrink-0" />
          <span>{connectionMessage || 'Menunggu koneksi PeerJS...'}</span>
        </div>
      );
    }

    if (connectionStatus === 'host-ready') {
      return (
        <div className="px-3 py-2 rounded-xl bg-[#e7f3ea] border border-[#9fd3a8] text-[#235430] text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Wifi className="w-4 h-4 text-[#3e7b4c] shrink-0" />
            <span className="truncate">
              Terhubung sebagai Host · Kode Room <strong className="font-mono">{roomCode}</strong>
            </span>
          </div>
          <span className="text-[10px] font-mono bg-[#fdfaf3] border border-[#b4ddb9] px-2 py-0.5 rounded-md shrink-0">
            P2P Aktif
          </span>
        </div>
      );
    }

    if (connectionStatus === 'connected') {
      return (
        <div className="px-3 py-2 rounded-xl bg-[#e6f2fa] border border-[#8ec5e8] text-[#1e4d6b] text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Wifi className="w-4 h-4 text-[#3d85b8] shrink-0" />
            <span className="truncate">
              Terhubung ke Host · Room <strong className="font-mono">{roomCode}</strong>
            </span>
          </div>
          <span className="text-[10px] font-mono bg-[#fdfaf3] border border-[#a9d1eb] px-2 py-0.5 rounded-md shrink-0">
            WebRTC Live
          </span>
        </div>
      );
    }

    return (
      <div className="px-3 py-2 rounded-xl bg-[#fae8e4] border border-[#efb3a5] text-[#9a3425] text-xs font-semibold flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <WifiOff className="w-4 h-4 text-[#c85a4b] shrink-0" />
          <span className="leading-snug">
            {connectionMessage || 'Gagal terhubung ke room. Periksa kode room atau jaringan Anda.'}
          </span>
        </div>
        {isHost && (
          <button
            type="button"
            onClick={() => handleHostWithCode(roomInput, Math.max(2, totalPlayers))}
            className="px-2.5 py-1 bg-[#fdfaf3] hover:bg-[#f4e5d3] border border-[#e3a38c] text-[#8f3d23] rounded-lg text-[10px] font-bold shrink-0"
          >
            Coba Lagi
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#292524]/45 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-3xl bg-[#fbf8f2] border border-[#ddd4c3] rounded-3xl shadow-2xl p-5 sm:p-7 flex flex-col gap-5 my-auto text-[#292524]">
        
        {/* Header Branding */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#e8dfd0] relative">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-0 right-0 p-2 text-[#78716c] hover:text-[#292524] hover:bg-[#efe9dc] rounded-xl transition-colors"
              title="Tutup Lobi & Lihat Arena"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3 pr-10 sm:pr-10">
            <div className="p-2.5 bg-[#f4e5d3] border border-[#e3ccb0] rounded-2xl text-[#c86b4a]">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-xl font-extrabold text-[#292524] tracking-tight">
                  Sprawlopolis
                </h2>
                <span className={`text-xs font-semibold ${isSolo ? 'text-[#2d6a3e]' : 'text-[#b95e3d]'}`}>
                  · {isSolo ? 'Mode Solo' : isHost ? 'Host P2P Online' : 'Tamu P2P Online'}
                </span>
              </div>
              <p className="text-xs text-[#57534e] mt-0.5">
                {isSolo
                  ? 'Bangun kota 18 kartu secara solo, atau buat/gabung room multiplayer online langsung dari browser.'
                  : 'Multiplayer Peer-to-Peer (WebRTC) langsung antar browser tanpa server tambahan.'}
              </p>
            </div>
          </div>
        </div>

        {/* Live Connection Status Banner */}
        <div className="space-y-2">
          {renderConnectionStatusBadge()}
          {actionNotice && (
            <div className="px-3 py-2 rounded-xl bg-[#fae8e4] border border-[#efb3a5] text-[#9a3425] text-xs font-semibold flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionNotice}</span>
              </div>
              {onClearActionNotice && (
                <button
                  type="button"
                  onClick={onClearActionNotice}
                  className="p-0.5 hover:bg-[#f4d4cc] rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Section 1: Mode & Player Count Selection */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-xs font-bold text-[#292524] flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-[#c86b4a]" />
              <span>Pilih Mode Permainan & Jumlah Pemain</span>
            </label>
            {isGuest && (
              <span className="text-[11px] text-[#9a4629] font-medium">
                Jumlah pemain diatur oleh Host · Klik Solo untuk keluar
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[1, 2, 3, 4].map((count) => {
              const active = isSolo ? count === 1 : totalPlayers === count;
              const isOptionSolo = count === 1;
              const isDisabled = isGuest && !isOptionSolo;

              return (
                <button
                  key={count}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleTotalPlayersChange(count)}
                  className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    active
                      ? isOptionSolo
                        ? 'cozy-btn-sage border-[#4d8b5d] scale-[1.01]'
                        : 'cozy-btn-primary border-[#b95e3d] scale-[1.01]'
                      : 'bg-[#f4efe6] border-[#ddd4c3] text-[#57534e] hover:border-[#c8b99e] hover:bg-[#efe9dc] hover:text-[#292524]'
                  }`}
                >
                  {isOptionSolo ? (
                    <>
                      <User className="w-4 h-4" />
                      <span>Solo (1 Pemain)</span>
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4" />
                      <span>{count} Pemain</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 1.5: Direct P2P Room Code Bar (Join from Solo OR Manage/Share Room in Multiplayer) */}
        {isSolo ? (
          <div className="bg-[#f4efe6] border border-[#ddd4c3] rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#fbf8f2] border border-[#ddd4c3] rounded-xl text-[#c86b4a] shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#292524]">
                  Punya Kode Room dari Teman?
                </div>
                <div className="text-[11px] text-[#78716c]">
                  Masukkan kode room Host untuk langsung bergabung via PeerJS.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && joinCodeInput.trim()) {
                    handleJoinRoomByCode(joinCodeInput);
                  }
                }}
                placeholder="SPRAWL-XXXX"
                className="w-32 sm:w-36 bg-[#fffdf9] border border-[#d6ccb8] focus:border-[#d97757] rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-[#292524] uppercase focus:outline-none"
              />
              <button
                type="button"
                disabled={!joinCodeInput.trim()}
                onClick={() => handleJoinRoomByCode(joinCodeInput)}
                className="px-3 py-1.5 cozy-btn-primary disabled:opacity-45 rounded-xl text-xs font-bold whitespace-nowrap"
              >
                Gabung Room
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#f4efe6] border border-[#ddd4c3] rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-[#fbf8f2] border border-[#ddd4c3] rounded-xl text-[#c86b4a] shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-[#78716c] uppercase tracking-wider">
                  {isHost ? 'Kode Room Anda (Bagikan ke Teman)' : 'Terhubung ke Kode Room'}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <input
                    type="text"
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && roomInput.trim()) {
                        if (isHost) handleHostWithCode(roomInput, totalPlayers);
                        else handleJoinRoomByCode(roomInput);
                      }
                    }}
                    placeholder="SPRAWL-XXXX"
                    className="w-32 bg-[#fffdf9] border border-[#d6ccb8] focus:border-[#d97757] rounded-lg px-2 py-1 text-xs font-mono font-extrabold text-[#9a4629] tracking-wider uppercase focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-1.5 bg-[#fbf8f2] hover:bg-[#e8e0d0] border border-[#ddd4c3] rounded-lg text-[#57534e] hover:text-[#292524] transition-colors"
                    title="Salin Kode Room"
                  >
                    {copiedCode ? (
                      <Check className="w-3.5 h-3.5 text-[#3e7b4c]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {isHost && (
                    <button
                      type="button"
                      onClick={handleRegenerateHostCode}
                      className="p-1.5 bg-[#fbf8f2] hover:bg-[#e8e0d0] border border-[#ddd4c3] rounded-lg text-[#57534e] hover:text-[#292524] transition-colors"
                      title="Acak Kode Room Baru"
                    >
                      <Dices className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              {isHost && normalizeRoomCode(roomInput) !== roomCode && (
                <button
                  type="button"
                  onClick={() => handleHostWithCode(roomInput, totalPlayers)}
                  className="px-2.5 py-1.5 cozy-btn-sage rounded-xl text-[11px] font-bold whitespace-nowrap"
                >
                  Host Kode Ini
                </button>
              )}
              <button
                type="button"
                onClick={() => handleJoinRoomByCode(roomInput)}
                className="px-2.5 py-1.5 bg-[#fbf8f2] hover:bg-[#f4e5d3] text-[#9a4629] border border-[#e3ccb0] rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors"
                title="Gabung ke Host dengan Kode di Samping"
              >
                Gabung Kode
              </button>
              {isGuest && (
                <button
                  type="button"
                  onClick={handleLeaveToSolo}
                  className="px-2.5 py-1.5 bg-[#fae8e4] hover:bg-[#f4d6cf] text-[#9a3425] border border-[#efb3a5] rounded-xl text-[11px] font-bold flex items-center gap-1 whitespace-nowrap transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Keluar</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Section 2: Player Slot Selection & Occupancy */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#292524] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#c86b4a]" />
              <span>{isSolo ? 'Pengaturan Profil Pemain' : 'Pilih Slot Pemain (Slot 1 = Host)'}</span>
            </label>
            {!isSolo && (
              <span className="text-[11px] font-mono text-[#78716c] tabular-nums">
                {players.filter((p) => p.occupantClientId).length} / {totalPlayers} Slot Terisi
              </span>
            )}
          </div>

          <div className={`grid grid-cols-1 ${isSolo ? 'sm:grid-cols-1' : 'sm:grid-cols-2'} gap-3`}>
            {players.map((p, idx) => {
              const colorTheme = PLAYER_COLORS[idx % 4];
              const isSelectedByMe = myPlayerId === p.id;
              const isSlot1 = p.id === 1;

              const occupantClientId = p.occupantClientId;
              const isOccupiedByOther =
                !!occupantClientId && occupantClientId !== myClientId;
              const occupantDisplayName =
                p.occupantName || p.name || `Pemain ${p.id}`;

              const canEditName =
                isSolo || isSelectedByMe || (isHost && !isOccupiedByOther);

              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-2xl border transition-all relative flex flex-col justify-between gap-2.5 ${
                    isSelectedByMe
                      ? `${colorTheme.bg} ${colorTheme.border} ring-2 ring-[#d97757]/25 shadow-sm`
                      : isOccupiedByOther
                      ? 'bg-[#efe9dc]/80 border-[#ddd4c3]'
                      : 'bg-[#f4efe6] border-[#ddd4c3] hover:border-[#c8b99e]'
                  }`}
                >
                  {/* Slot Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-8 h-8 rounded-xl ${colorTheme.badgeBg} text-[#fffdf9] font-extrabold text-xs flex items-center justify-center shadow-xs shrink-0`}
                      >
                        P{p.id}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs font-extrabold text-[#292524] flex items-center gap-1.5">
                          {isSolo ? 'Pemain Solo' : `Slot ${p.id}`}
                          {isSlot1 && (
                            <Crown className="w-3.5 h-3.5 text-[#c86b4a] fill-[#f4a28c] shrink-0" />
                          )}
                        </span>
                        <span className="text-[11px] text-[#78716c] font-medium">
                          {isSolo
                            ? 'Pemain Tunggal'
                            : isSlot1
                            ? 'Pemain Utama (Host)'
                            : `Pemain Anggota ${p.id}`}
                        </span>
                      </div>
                    </div>

                    {!isSolo && (
                      <div className="text-[11px] font-bold">
                        {isSelectedByMe ? (
                          <span className="text-[#9a4629] flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Anda
                          </span>
                        ) : isOccupiedByOther ? (
                          <span className="text-[#a63d33] flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>{isSlot1 ? 'Host' : 'Terisi'}</span>
                          </span>
                        ) : (
                          <span className="text-[#2d6a3e]">Tersedia</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Player Name Input */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#57534e] font-semibold flex items-center justify-between">
                      <span>
                        {isSelectedByMe
                          ? 'Nama / Panggilan Anda'
                          : `Nama Pemain ${p.id}`}
                      </span>
                      {isOccupiedByOther && (
                        <span className="text-[10px] text-[#2d6a3e] font-mono">
                          Online · {occupantDisplayName}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={p.name}
                      disabled={!canEditName}
                      onChange={(e) => handlePlayerNameChange(p.id, e.target.value)}
                      onBlur={(e) => {
                        if (!e.target.value.trim()) {
                          handlePlayerNameChange(p.id, isSolo ? 'Pemain Solo' : `Pemain ${p.id}`);
                        }
                      }}
                      placeholder={isSolo ? 'Nama Pemain Solo' : `Nama Pemain ${p.id}`}
                      className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none transition-colors ${
                        canEditName
                          ? 'bg-[#fffdf9] border-[#d6ccb8] focus:border-[#d97757] text-[#292524]'
                          : 'bg-[#f4efe6]/70 border-[#e2d8c5] text-[#78716c] cursor-not-allowed'
                      }`}
                    />
                  </div>

                  {/* Slot Action Buttons */}
                  {!isSolo && (
                    <div className="pt-2 border-t border-[#e5dccb] flex items-center justify-between">
                      {isSelectedByMe ? (
                        <span className="text-[11px] text-[#9a4629] font-semibold flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" /> Anda terhubung di slot ini
                        </span>
                      ) : isOccupiedByOther ? (
                        <div className="w-full text-[11px] text-[#a63d33] font-semibold flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {isSlot1
                              ? `Slot Host diisi oleh ${occupantDisplayName}.`
                              : `Slot diisi oleh ${occupantDisplayName}.`}
                          </span>
                        </div>
                      ) : isSlot1 && !isHost ? (
                        <span className="text-[11px] text-[#78716c] font-medium flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Khusus Host
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectMySlot(p.id)}
                          className="w-full py-1.5 px-3 bg-[#fbf8f2] hover:bg-[#f4e5d3] text-[#9a4629] border border-[#e3ccb0] rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Pilih Slot {p.id}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Online Connected Peers Panel */}
        {!isSolo && (
          <div className="bg-[#f4efe6] border border-[#ddd4c3] rounded-2xl p-3.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#3e7b4c]" />
                <span className="text-xs font-bold text-[#292524]">
                  Perangkat Terhubung di Room ({connectedClients?.length || 0} Online)
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#78716c]">
                PeerJS P2P · <strong className="text-[#9a4629]">{roomCode}</strong>
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-0.5">
              {connectedClients && connectedClients.length > 0 ? (
                connectedClients.map((client) => {
                  const isMe = client.clientId === myClientId;
                  const slotText = client.slotId ? `Slot ${client.slotId}` : 'Belum Pilih Slot';

                  return (
                    <div
                      key={client.clientId}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold border flex items-center gap-2 ${
                        isMe
                          ? 'bg-[#fae9e2] border-[#e3a38c] text-[#8f3d23]'
                          : 'bg-[#fbf8f2] border-[#ddd4c3] text-[#57534e]'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-[#5e9a6b]" />
                      <span>{client.name || 'Pemain'}</span>
                      <span className="text-[10px] font-mono text-[#78716c]">
                        · {slotText} {isMe ? '(Anda)' : ''}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-[#78716c] font-mono">
                  Menunggu perangkat terhubung ke room {roomCode}...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 4: Info & Action Buttons */}
        <div className="bg-[#f4efe6] border border-[#ddd4c3] rounded-2xl p-4 flex flex-col gap-3.5">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[#fbf8f2] border border-[#ddd4c3] rounded-xl text-[#c86b4a] shrink-0">
              <Info className="w-4 h-4" />
            </div>
            <div className="text-xs space-y-0.5">
              {isSolo ? (
                <>
                  <p className="font-bold text-[#235430]">Mode Solo Siap Dimainkan</p>
                  <p className="text-[#57534e] text-[11px] leading-relaxed">
                    Susun 15 kartu untuk membangun kota dan kalahkan target skor dari 3 Kartu Misi secara mandiri.
                  </p>
                </>
              ) : isHost ? (
                <>
                  <p className="font-bold text-[#9a4629]">Anda adalah Host Room (Slot 1)</p>
                  <p className="text-[#57534e] text-[11px] leading-relaxed">
                    Bagikan kode <strong className="font-mono">{roomCode}</strong> kepada teman Anda. Setelah semua bergabung, tekan Mulai Game Multiplayer untuk menyinkronkan papan kota ke seluruh pemain.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-[#1e4d6b]">
                    {myPlayerId > 0
                      ? `Terhubung di Slot ${myPlayerId} (${players.find((p) => p.id === myPlayerId)?.name || 'Anda'})`
                      : 'Terhubung sebagai Penonton · Silakan pilih slot kosong'}
                  </p>
                  <p className="text-[#57534e] text-[11px] leading-relaxed">
                    Menunggu <strong className="text-[#9a4629]">{mainPlayerConfig?.name || 'Host'} (Slot 1)</strong> memulai permainan.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-3 border-t border-[#e5dccb]">
            {isSolo || isHost ? (
              <button
                onClick={handleStartGameClick}
                disabled={!isSolo && connectionStatus === 'connecting'}
                className={`flex-1 py-3 px-6 font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-55 ${
                  isSolo ? 'cozy-btn-sage' : 'cozy-btn-primary'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{isSolo ? 'Mulai Game Solo' : 'Mulai Game Multiplayer'}</span>
              </button>
            ) : (
              <button
                disabled
                className="flex-1 py-3 px-6 bg-[#ebe3d4] border border-[#d6ccb8] text-[#78716c] font-bold text-sm rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <RefreshCw className="w-4 h-4 animate-spin text-[#c86b4a]" />
                <span>Menunggu Host ({mainPlayerConfig?.name || 'Pemain Utama'}) Memulai...</span>
              </button>
            )}

            <div className="flex items-center gap-2 shrink-0">
              {onOpenCardGallery && (
                <button
                  onClick={onOpenCardGallery}
                  className="px-3.5 py-3 bg-[#fbf8f2] hover:bg-[#f4e5d3] text-[#9a4629] border border-[#e3ccb0] rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  title="Lihat & Pelajari Semua Kartu (#1 - #18)"
                >
                  <Layers className="w-4 h-4 text-[#c86b4a]" />
                  <span>Lihat Kartu</span>
                </button>
              )}
              <button
                onClick={onOpenRulebook}
                className="p-3 bg-[#fbf8f2] hover:bg-[#efe9dc] text-[#57534e] hover:text-[#292524] border border-[#ddd4c3] rounded-xl text-xs font-semibold transition-colors"
                title="Panduan Aturan Game"
              >
                <BookOpen className="w-4 h-4 text-[#c86b4a]" />
              </button>
              <button
                onClick={onOpenXlsImport}
                className="p-3 bg-[#e7f3ea] hover:bg-[#d8ecd9] text-[#2d6a3e] border border-[#b4ddb9] rounded-xl text-xs font-semibold transition-colors"
                title="Impor Aturan XLS"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
