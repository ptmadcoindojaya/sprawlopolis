import React from 'react';
import { MultiplayerState } from '../types';
import { PLAYER_COLORS } from './LobbyScreen';
import { Crown, Users, Sparkles, UserCheck, User } from 'lucide-react';

interface MultiplayerStatusHeaderProps {
  multiplayerState: MultiplayerState;
  onOpenLobby: () => void;
  onSwitchTurn: (newTurnIndex: number) => void;
}

export function MultiplayerStatusHeader({
  multiplayerState,
  onOpenLobby,
  onSwitchTurn
}: MultiplayerStatusHeaderProps) {
  const { totalPlayers, myPlayerId, players, currentTurnIndex } = multiplayerState;

  const isSolo = totalPlayers === 1;
  const currentTurnPlayer = players[currentTurnIndex] || players[0];
  const isMyTurn = currentTurnPlayer.id === myPlayerId;
  const myPlayerConfig = players.find((p) => p.id === myPlayerId) || players[0];

  const colorTheme = isSolo
    ? { bg: 'bg-[#e7f3ea]', border: 'border-[#9fd3a8]', text: 'text-[#235430]', badgeBg: 'bg-[#5e9a6b]' }
    : PLAYER_COLORS[(currentTurnPlayer.id - 1) % 4];

  return (
    <div className="bg-[#fbf8f2] border-b border-[#ddd4c3] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs z-20 text-[#292524]">
      
      {/* Left: Active Mode & Player Badge */}
      <div className="flex items-center gap-3">
        <div className={`px-3 py-1.5 rounded-xl border ${colorTheme.bg} ${colorTheme.border} flex items-center gap-2`}>
          <span className={`w-2.5 h-2.5 rounded-full ${colorTheme.badgeBg}`} />
          <div className={`flex items-center gap-1.5 font-bold ${colorTheme.text}`}>
            <span>{isSolo ? 'Mode Solo:' : 'Giliran:'}</span>
            <span className="flex items-center gap-1">
              {currentTurnPlayer.name} {!isSolo && `(P${currentTurnPlayer.id})`}
              {!isSolo && currentTurnPlayer.isMainPlayer && (
                <Crown className="w-3.5 h-3.5 text-[#c86b4a] fill-[#f4a28c]" />
              )}
            </span>
          </div>
        </div>

        {/* Turn Status Message */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-[#57534e] bg-[#f4efe6] px-3 py-1.5 rounded-xl border border-[#ddd4c3]">
          {isSolo ? (
            <span className="text-[#2d6a3e] font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Selamat bermain! Pilih kartu dari tangan dan letakkan di kota.
            </span>
          ) : isMyTurn ? (
            <span className="text-[#2d6a3e] font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Giliran Anda ({myPlayerConfig.name}) untuk menaruh kartu!
            </span>
          ) : (
            <span className="text-[#9a4629] font-medium flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />
              Menunggu {currentTurnPlayer.name} meletakkan kartu...
            </span>
          )}
        </div>
      </div>

      {/* Center: All Players Badges list (Hidden in Solo mode) */}
      {!isSolo && (
        <div className="flex items-center gap-1.5">
          {players.slice(0, totalPlayers).map((p, idx) => {
            const isTurn = idx === currentTurnIndex;
            const isMe = p.id === myPlayerId;
            const theme = PLAYER_COLORS[idx % 4];

            return (
              <button
                key={p.id}
                onClick={() => onSwitchTurn(idx)}
                title={`Sesi Pass & Play: Klik untuk ganti giliran ke ${p.name}`}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-colors ${
                  isTurn
                    ? `${theme.bg} ${theme.border} ${theme.text} shadow-xs`
                    : 'bg-[#f4efe6] border-[#ddd4c3] text-[#78716c] hover:text-[#292524] hover:border-[#c8b99e]'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${theme.badgeBg}`} />
                <span>{p.name}</span>
                {p.isMainPlayer && <Crown className="w-3 h-3 text-[#c86b4a] fill-[#f4a28c]" />}
                {isMe && <span className="text-[10px] text-[#9a4629] font-extrabold ml-0.5">(Anda)</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Right: Lobby & Quick Switch */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenLobby}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f4efe6] hover:bg-[#ebe3d4] text-[#292524] border border-[#ddd4c3] rounded-xl text-xs font-bold transition-colors"
          title="Buka Lobi Pemain / Mode Permainan"
        >
          {isSolo ? <User className="w-3.5 h-3.5 text-[#c86b4a]" /> : <Users className="w-3.5 h-3.5 text-[#c86b4a]" />}
          <span>{isSolo ? 'Ubah Mode / Lobi' : 'Lobi Pemain'}</span>
        </button>
      </div>

    </div>
  );
}
