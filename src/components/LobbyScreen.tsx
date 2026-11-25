import React, { useState } from 'react';
import { PlayerConfig, MultiplayerState } from '../types';
import {
  getOrCreateClientId,
  apiGetRoomState,
  apiClaimSlot,
  apiUpdatePlayerName,
  apiUpdateRoomSettings,
  apiStartGame
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
  X
} from 'lucide-react';

interface LobbyScreenProps {
  isOpen: boolean;
  multiplayerState: MultiplayerState;
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
  onUpdateMultiplayerState,
  onStartGame,
  onOpenRulebook,
  onOpenXlsImport,
  onOpenCardGallery,
  onClose
}: LobbyScreenProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [roomInput, setRoomInput] = useState(multiplayerState.roomCode || 'SPRAWL-18');
  const [isEditingRoom, setIsEditingRoom] = useState(false);

  const { totalPlayers, myPlayerId, players, roomCode, connectedClients } = multiplayerState;
  const myClientId = multiplayerState.myClientId || getOrCreateClientId();
  const isSolo = totalPlayers === 1;

  if (!isOpen) return null;

  // Determine if current player is Slot 1 occupant (Pemain Utama / Host)
  const isMainPlayer = myPlayerId === 1;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleJoinNewRoom = async () => {
    const clean = roomInput.trim().toUpperCase() || 'SPRAWL-18';
    onUpdateMultiplayerState({ roomCode: clean, gameCode: clean });
    setIsEditingRoom(false);

    const serverRoom = await apiGetRoomState(clean);
    if (serverRoom) {
      onUpdateMultiplayerState({
        totalPlayers: serverRoom.totalPlayers,
        players: serverRoom.players,
        connectedClients: serverRoom.connectedClients
      });
    }
  };

  const handleSelectMySlot = async (targetSlotId: number) => {
    const myCurrentName =
      players.find((p) => p.id === myPlayerId)?.name || `Pemain ${targetSlotId}`;

    const res = await apiClaimSlot(roomCode, myClientId, targetSlotId, myCurrentName);
    if (!res.success) {
      if (res.error) alert(res.error);
      if (res.room) {
        onUpdateMultiplayerState({
          totalPlayers: res.room.totalPlayers,
          players: res.room.players,
          connectedClients: res.room.connectedClients
        });
      }
      return;
    }

    if (res.room) {
      onUpdateMultiplayerState({
        myPlayerId: targetSlotId,
        totalPlayers: res.room.totalPlayers,
        players: res.room.players,
        connectedClients: res.room.connectedClients
      });
    }
  };

  const handleTotalPlayersChange = async (count: number) => {
    if (!isMainPlayer && !isSolo) return;

    // Ensure local players list matches count immediately
    const updatedPlayers: PlayerConfig[] = [];
    const slotHexColors = ['#d97757', '#5c9ec8', '#5e9a6b', '#8f6cb2'];
    for (let i = 1; i <= count; i++) {
      const existing = players.find((p) => p.id === i);
      if (existing) {
        updatedPlayers.push(existing);
      } else {
        updatedPlayers.push({
          id: i,
          name: i === 1 ? 'Pemain Utama' : `Pemain ${i}`,
          isMainPlayer: i === 1,
          color: slotHexColors[(i - 1) % 4],
          isReady: true,
          avatar: `P${i}`
        });
      }
    }
    onUpdateMultiplayerState({ totalPlayers: count, players: updatedPlayers });

    const res = await apiUpdateRoomSettings(roomCode, myClientId, count);
    if (res.success && res.room) {
      onUpdateMultiplayerState({
        totalPlayers: res.room.totalPlayers,
        players: res.room.players,
        connectedClients: res.room.connectedClients
      });
    } else if (res.error) {
      alert(res.error);
    }
  };

  const handlePlayerNameChange = async (id: number, newName: string) => {
    const updatedPlayers = players.map((p) =>
      p.id === id ? { ...p, name: newName } : p
    );
    onUpdateMultiplayerState({ players: updatedPlayers });

    if (id === myPlayerId) {
      const syncedName = newName.trim() || (isSolo ? 'Pemain Solo' : `Pemain ${id}`);
      await apiClaimSlot(roomCode, myClientId, id, syncedName);
    } else {
      const syncedName = newName.trim() || `Pemain ${id}`;
      await apiUpdatePlayerName(roomCode, id, syncedName);
    }
  };

  const handleStartGameClick = async () => {
    await apiStartGame(roomCode, myClientId);
    onStartGame();
  };

  const mainPlayerConfig = players.find((p) => p.id === 1) || players[0];

  return (
    <div className="fixed inset-0 z-50 bg-[#292524]/45 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-3xl bg-[#fbf8f2] border border-[#ddd4c3] rounded-3xl shadow-2xl p-5 sm:p-8 flex flex-col gap-6 my-auto text-[#292524]">
        
        {/* Header Branding & Lobby Code */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#e8dfd0] relative">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-0 right-0 p-2 text-[#78716c] hover:text-[#292524] hover:bg-[#efe9dc] rounded-xl transition-colors"
              title="Tutup Lobi & Lihat Arena"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3 pr-8 sm:pr-0">
            <div className="p-3 bg-[#f4e5d3] border border-[#e3ccb0] rounded-2xl text-[#c86b4a]">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-xl font-extrabold text-[#292524] tracking-tight">
                  Lobi Permainan Sprawlopolis
                </h2>
                <span className={`text-xs font-semibold ${isSolo ? 'text-[#2d6a3e]' : 'text-[#b95e3d]'}`}>
                  · {isSolo ? 'Mode Solo' : 'Multiplayer Terhubung'}
                </span>
              </div>
              <p className="text-xs text-[#57534e] mt-0.5">
                {isSolo
                  ? 'Mainkan Sprawlopolis secara mandiri untuk mencapai target skor tertinggi.'
                  : 'Pilih slot pemain. Semua pemain terhubung langsung di lobi yang sama.'}
              </p>
            </div>
          </div>

          {/* Room / Lobby Code Input & Joiner */}
          {!isSolo && (
            <div className="flex items-center gap-2 bg-[#f4efe6] border border-[#ddd4c3] px-3 py-2 rounded-xl sm:mr-9">
              <KeyRound className="w-4 h-4 text-[#c86b4a] shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-[#78716c]">
                  Kode Lobi
                </span>
                {isEditingRoom ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <input
                      type="text"
                      value={roomInput}
                      onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                      className="w-24 bg-[#fffdf9] border border-[#d97757] rounded-md px-1.5 py-0.5 text-xs font-mono font-bold text-[#292524] uppercase focus:outline-none"
                      placeholder="SPRAWL-18"
                    />
                    <button
                      onClick={handleJoinNewRoom}
                      className="px-2 py-0.5 cozy-btn-primary text-[10px] font-bold rounded-md"
                    >
                      Masuk
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingRoom(true)}
                    className="font-mono font-bold text-[#9a4629] text-sm tracking-wider hover:underline text-left"
                    title="Klik untuk Mengubah Kode Lobi"
                  >
                    {roomCode || 'SPRAWL-18'}
                  </button>
                )}
              </div>

              {!isEditingRoom && (
                <button
                  onClick={handleCopyCode}
                  className="p-1.5 hover:bg-[#e8e0d0] rounded-lg text-[#78716c] hover:text-[#292524] transition-colors ml-1"
                  title="Salin Kode Lobi"
                >
                  {copiedCode ? (
                    <Check className="w-3.5 h-3.5 text-[#3e7b4c]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Section 1: Set Mode & Total Players */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#292524] flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-[#c86b4a]" />
              <span>Pilih Mode Permainan & Jumlah Pemain</span>
            </label>
            {!isMainPlayer && !isSolo && (
              <span className="text-[11px] text-[#9a4629] font-medium">
                Hanya Pemain Utama yang dapat mengubah mode
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[1, 2, 3, 4].map((count) => {
              const active = totalPlayers === count;
              const isOptionSolo = count === 1;
              const isDisabled = !isMainPlayer && !isSolo;

              return (
                <button
                  key={count}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleTotalPlayersChange(count)}
                  className={`py-3 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                    isDisabled ? 'opacity-55 cursor-not-allowed' : ''
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
                      <User className="w-5 h-5" />
                      <span>Solo (1 Pemain)</span>
                    </>
                  ) : (
                    <>
                      <Users className="w-5 h-5" />
                      <span>{count} Pemain</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Player Slot Selection & Occupancy */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#292524] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#c86b4a]" />
              <span>{isSolo ? 'Pengaturan Profil Pemain' : 'Pilih Slot Pemain (Slot 1 = Pemain Utama)'}</span>
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

              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between gap-3 ${
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

                    {/* Selection status text */}
                    {!isSolo && (
                      <div className="text-[11px] font-bold">
                        {isSelectedByMe ? (
                          <span className="text-[#9a4629] flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Anda
                          </span>
                        ) : isOccupiedByOther ? (
                          <span className="text-[#a63d33] flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>{isSlot1 ? 'Terkunci' : 'Terisi'}</span>
                          </span>
                        ) : (
                          <span className="text-[#2d6a3e]">Tersedia</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Player Name Input */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#57534e] font-semibold mb-1 flex items-center justify-between">
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
                      onChange={(e) => handlePlayerNameChange(p.id, e.target.value)}
                      onBlur={(e) => {
                        if (!e.target.value.trim()) {
                          handlePlayerNameChange(p.id, isSolo ? 'Pemain Solo' : `Pemain ${p.id}`);
                        }
                      }}
                      placeholder={isSolo ? 'Nama Pemain Solo' : `Nama Pemain ${p.id}`}
                      className="w-full bg-[#fffdf9] border border-[#d6ccb8] focus:border-[#d97757] rounded-xl px-3 py-2 text-xs font-bold text-[#292524] focus:outline-none transition-colors"
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
                          {isSlot1 ? (
                            <span>Slot 1 diisi oleh {occupantDisplayName}. Slot dikunci.</span>
                          ) : (
                            <span>Slot terisi oleh {occupantDisplayName}</span>
                          )}
                        </div>
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

        {/* Section 3: Online Connected Players Panel */}
        {!isSolo && (
          <div className="bg-[#f4efe6] border border-[#ddd4c3] rounded-2xl p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#3e7b4c]" />
                <span className="text-xs font-bold text-[#292524]">
                  Pemain Terhubung di Lobi ({connectedClients?.length || 1} Online)
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#78716c]">
                Kode Server: <strong className="text-[#9a4629]">{roomCode}</strong>
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
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
                  Menghubungkan ke lobi server {roomCode}...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 4: Status Box & Main Action Button */}
        <div className="bg-[#f4efe6] border border-[#ddd4c3] rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[#fbf8f2] border border-[#ddd4c3] rounded-xl text-[#c86b4a] shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div className="text-xs space-y-1">
              {isSolo ? (
                <>
                  <p className="font-bold text-[#235430]">
                    Mode Solo Aktif
                  </p>
                  <p className="text-[#57534e] text-[11px] leading-relaxed">
                    Anda akan bermain sendiri untuk menyusun 15 kartu di atas kota dan berusaha mengalahkan target skor dari 3 Kartu Sasaran.
                  </p>
                </>
              ) : isMainPlayer ? (
                <>
                  <p className="font-bold text-[#9a4629]">
                    Anda terdaftar sebagai Pemain Utama (Slot 1)
                  </p>
                  <p className="text-[#57534e] text-[11px] leading-relaxed">
                    Sebagai Pemain Utama (Slot 1), Anda memegang hak akses untuk mengatur mode dan memulai sesi permainan Sprawlopolis ini untuk seluruh pemain di lobi.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-[#1e4d6b]">
                    Anda terdaftar sebagai Pemain {myPlayerId} ({players.find((p) => p.id === myPlayerId)?.name})
                  </p>
                  <p className="text-[#57534e] text-[11px] leading-relaxed">
                    Menunggu <strong className="text-[#9a4629]">{mainPlayerConfig.name} (Pemain Utama - Slot 1)</strong> untuk menekan tombol Mulai Game.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-[#e5dccb]">
            {isSolo || isMainPlayer ? (
              <button
                onClick={handleStartGameClick}
                className={`flex-1 py-3 px-6 font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-[0.98] ${
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
                <span>Menunggu Pemain Utama ({mainPlayerConfig.name}) Memulai...</span>
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
