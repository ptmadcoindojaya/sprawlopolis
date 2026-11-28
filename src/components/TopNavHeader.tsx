import React, { useState, useRef, useEffect } from 'react';
import { MultiplayerState } from '../types';
import { Building2, Users, BookOpen, FileSpreadsheet, RotateCcw, RefreshCw, Layers, Volume2, VolumeX, Music } from 'lucide-react';
import { PLAYER_COLORS } from './LobbyScreen';

interface TopNavHeaderProps {
  multiplayerState: MultiplayerState;
  historyLength: number;
  isMuted: boolean;
  onToggleMute: () => void;
  isMusicEnabled: boolean;
  onToggleMusic: () => void;
  onOpenLobby: () => void;
  onOpenRules: () => void;
  onOpenXls: () => void;
  onOpenCardGallery?: () => void;
  onUndo: () => void;
  onResetGame: () => void;
  onSwitchTurn: (newTurnIndex: number) => void;
}

export const TopNavHeader: React.FC<TopNavHeaderProps> = ({
  multiplayerState,
  historyLength,
  isMuted,
  onToggleMute,
  isMusicEnabled,
  onToggleMusic,
  onOpenLobby,
  onOpenRules,
  onOpenXls,
  onOpenCardGallery,
  onUndo,
  onResetGame,
  onSwitchTurn
}) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const { totalPlayers, players, currentTurnIndex } = multiplayerState;
  const isSolo = totalPlayers === 1;
  const currentTurnPlayer = players[currentTurnIndex] || players[0];

  const colorTheme = isSolo
    ? { bg: 'bg-[#e7f3ea]', border: 'border-[#9fd3a8]', text: 'text-[#235430]', badgeBg: 'bg-[#5e9a6b]' }
    : PLAYER_COLORS[(currentTurnPlayer.id - 1) % 4];

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 1200); // stay open 1.2s after mouse leaves for comfortable click
  };

  const isVisible = isHovered || isMobileOpen;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 flex flex-col items-center pointer-events-none"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Expanded Main Menu (Slides down on hover/tap) */}
      <div
        className={`w-full bg-[#fbf8f2]/96 border-b border-[#ddd4c3] shadow-lg backdrop-blur-md transition-all duration-200 overflow-hidden ${
          isVisible
            ? 'max-h-[300px] opacity-100 py-2.5 px-3 sm:px-6 pointer-events-auto'
            : 'max-h-0 opacity-0 py-0 px-3 pointer-events-none border-b-0'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="p-1.5 bg-[#f4e5d3] border border-[#e3ccb0] rounded-xl text-[#c86b4a]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-[#292524] leading-tight whitespace-nowrap">
                Sprawlopolis
              </h1>
              <p className="text-[11px] text-[#78716c] hidden sm:block leading-tight">
                Permainan Tata Kota Strategi 18 Kartu
              </p>
            </div>
          </div>

          {/* Turn & Player Status */}
          <div className="flex items-center gap-2 text-xs">
            <div className={`px-3 py-1 rounded-xl border ${colorTheme.bg} ${colorTheme.border} flex items-center gap-1.5`}>
              <span className={`w-2 h-2 rounded-full ${colorTheme.badgeBg}`} />
              <span className={`font-bold whitespace-nowrap ${colorTheme.text}`}>
                {isSolo ? 'Mode Solo' : `Giliran: ${currentTurnPlayer.name}`}
              </span>
            </div>

            {!isSolo && (
              <div className="hidden md:flex items-center gap-1">
                {players.slice(0, totalPlayers).map((p, idx) => {
                  const isTurn = idx === currentTurnIndex;
                  const theme = PLAYER_COLORS[idx % 4];
                  return (
                    <button
                      key={p.id}
                      onClick={() => onSwitchTurn(idx)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                        isTurn
                          ? `${theme.bg} ${theme.border} ${theme.text} shadow-xs`
                          : 'bg-[#f4efe6] border-[#ddd4c3] text-[#78716c] hover:text-[#292524] hover:border-[#c8b99e]'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${theme.badgeBg}`} />
                      <span>{p.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={onOpenLobby}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f4efe6] hover:bg-[#ebe3d4] text-[#292524] border border-[#ddd4c3] rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              title="Lobi Pemain"
            >
              <Users className="w-3.5 h-3.5 text-[#c86b4a]" />
              <span className="hidden sm:inline">Lobi</span>
            </button>

            {onOpenCardGallery && (
              <button
                onClick={onOpenCardGallery}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f4e5d3] hover:bg-[#ecd7be] text-[#9a4629] border border-[#e3ccb0] rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                title="Galeri & Katalog Kartu (#1 - #18)"
              >
                <Layers className="w-3.5 h-3.5 text-[#c86b4a]" />
                <span className="hidden sm:inline">Kartu</span>
              </button>
            )}

            <button
              onClick={onOpenRules}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f4efe6] hover:bg-[#ebe3d4] text-[#292524] border border-[#ddd4c3] rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              title="Panduan & Aturan"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#c86b4a]" />
              <span className="hidden sm:inline">Aturan</span>
            </button>

            <button
              onClick={onOpenXls}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e7f3ea] hover:bg-[#d8ecd9] text-[#235430] border border-[#b4ddb9] rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              title="Unggah XLS Kustom"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#3e7b4c]" />
              <span className="hidden sm:inline">Impor XLS</span>
            </button>

            <button
              onClick={onUndo}
              disabled={historyLength === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f4efe6] hover:bg-[#ebe3d4] disabled:opacity-45 text-[#57534e] hover:text-[#292524] border border-[#ddd4c3] rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 tabular-nums"
              title="Undo Langkah"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Undo ({historyLength})</span>
            </button>

            {/* Separate SFX Toggle */}
            <button
              onClick={onToggleMute}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                isMuted
                  ? 'bg-[#fae8e4] hover:bg-[#f4d6cf] text-[#9a3425] border-[#efb3a5]'
                  : 'bg-[#f4efe6] hover:bg-[#ebe3d4] text-[#292524] border-[#ddd4c3]'
              }`}
              title={isMuted ? 'SFX Dimatikan (Klik untuk Nyalakan)' : 'SFX Aktif (Klik untuk Matikan)'}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-[#c85a4b]" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-[#4d8b5d]" />
              )}
              <span className="hidden sm:inline">{isMuted ? 'SFX Off' : 'SFX On'}</span>
            </button>

            {/* Separate Cozy Music & Ambience Toggle */}
            <button
              onClick={onToggleMusic}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                !isMusicEnabled
                  ? 'bg-[#fae8e4] hover:bg-[#f4d6cf] text-[#9a3425] border-[#efb3a5]'
                  : 'bg-[#eef6f0] hover:bg-[#e1efe4] text-[#235430] border-[#b7dabf]'
              }`}
              title={
                isMusicEnabled
                  ? 'Musik & Ambience Aktif (Klik untuk Matikan)'
                  : 'Musik & Ambience Dimatikan (Klik untuk Nyalakan)'
              }
            >
              <span className="relative inline-flex items-center justify-center w-3.5 h-3.5">
                <Music className={`w-3.5 h-3.5 ${isMusicEnabled ? 'text-[#4d8b5d]' : 'text-[#c85a4b] opacity-75'}`} />
                {!isMusicEnabled && (
                  <span className="absolute w-4 h-[1.5px] bg-[#c85a4b] rotate-45 rounded-full" />
                )}
              </span>
              <span className="hidden sm:inline">{isMusicEnabled ? 'Musik On' : 'Musik Off'}</span>
            </button>

            <button
              onClick={onResetGame}
              className="flex items-center gap-1.5 px-3.5 py-1.5 cozy-btn-primary font-bold rounded-xl text-xs transition-transform active:scale-95 whitespace-nowrap shrink-0"
              title="Mulai Ulang Permainan Baru"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Auto-Hide Hover Trigger Strip + Quick Compact SFX & Music Toggles */}
      <div className="flex items-center gap-1.5 pointer-events-auto">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-[#fbf8f2]/95 hover:bg-[#fffdf9] text-[#57534e] hover:text-[#292524] border border-t-0 border-[#ddd4c3] rounded-b-2xl px-4 py-1.5 shadow-md text-xs font-semibold flex items-center gap-2 backdrop-blur-md transition-all active:scale-95"
          title="Menu Navigasi (Arahkan Kursor / Sentuh)"
        >
          <Building2 className="w-3.5 h-3.5 text-[#c86b4a]" />
          <span className="font-bold text-[11px] text-[#292524] whitespace-nowrap">
            Menu Utama {isVisible ? '▲' : '▼'}
          </span>
          <span className="text-[10px] text-[#78716c] hidden sm:inline whitespace-nowrap">
            · Arahkan kursor
          </span>
        </button>

        {/* Quick SFX Toggle */}
        <button
          onClick={onToggleMute}
          className={`border border-t-0 rounded-b-2xl px-2.5 py-1.5 shadow-md backdrop-blur-md transition-all active:scale-95 flex items-center gap-1 text-[10px] font-bold ${
            isMuted
              ? 'bg-[#fae8e4]/95 hover:bg-[#f5dcd6] border-[#efb3a5] text-[#9a3425]'
              : 'bg-[#fbf8f2]/95 hover:bg-[#fffdf9] border-[#ddd4c3] text-[#4d8b5d]'
          }`}
          title={isMuted ? 'SFX Dimatikan (Klik untuk Nyalakan)' : 'SFX Aktif (Klik untuk Matikan)'}
          aria-label={isMuted ? 'Nyalakan SFX' : 'Matikan SFX'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          <span className="hidden md:inline">SFX</span>
        </button>

        {/* Quick Cozy Music & Ambience Toggle */}
        <button
          onClick={onToggleMusic}
          className={`border border-t-0 rounded-b-2xl px-2.5 py-1.5 shadow-md backdrop-blur-md transition-all active:scale-95 flex items-center gap-1 text-[10px] font-bold ${
            !isMusicEnabled
              ? 'bg-[#fae8e4]/95 hover:bg-[#f5dcd6] border-[#efb3a5] text-[#9a3425]'
              : 'bg-[#eef6f0]/95 hover:bg-[#e4f2e8] border-[#b7dabf] text-[#2e683d]'
          }`}
          title={
            isMusicEnabled
              ? 'Musik & Ambience Aktif (Klik untuk Matikan)'
              : 'Musik & Ambience Dimatikan (Klik untuk Nyalakan)'
          }
          aria-label={isMusicEnabled ? 'Matikan Musik & Ambience' : 'Nyalakan Musik & Ambience'}
        >
          <span className="relative inline-flex items-center justify-center w-3.5 h-3.5">
            <Music className={`w-3.5 h-3.5 ${!isMusicEnabled ? 'opacity-75' : ''}`} />
            {!isMusicEnabled && (
              <span className="absolute w-4 h-[1.5px] bg-[#9a3425] rotate-45 rounded-full" />
            )}
          </span>
          <span className="hidden md:inline">Musik</span>
        </button>
      </div>
    </div>
  );
};

