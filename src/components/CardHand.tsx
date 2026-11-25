import React, { useState } from 'react';
import { CardInHand } from '../types';
import { CardBlockGrid } from './CardBlockGrid';
import { RotateCw, Eye, Sparkles, Layers, ChevronUp, ChevronDown, Lock, Clock } from 'lucide-react';

interface CardHandProps {
  hand: CardInHand[];
  deckCount: number;
  selectedIndex: number | null;
  onSelectCard: (index: number) => void;
  onRotateCard: (index: number) => void;
  isMyTurn?: boolean;
  currentTurnPlayerName?: string;
  totalPlayers?: number;
}

export const CardHand: React.FC<CardHandProps> = ({
  hand,
  deckCount,
  selectedIndex,
  onSelectCard,
  onRotateCard,
  isMyTurn = true,
  currentTurnPlayerName,
  totalPlayers = 1
}) => {
  const [flippedIndex, setFlippedIndex] = useState<number | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const isMultiplayer = totalPlayers > 1;

  return (
    <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-30 w-full max-w-[336px] sm:max-w-[396px] md:max-w-[432px] px-2 transition-all duration-200 pointer-events-none">
      <div
        className={`cozy-panel rounded-2xl p-1.5 sm:p-2 backdrop-blur-md pointer-events-auto transition-all ${
          !isMyTurn && isMultiplayer
            ? 'border-[#d96b6b]/60 ring-2 ring-[#d96b6b]/20'
            : 'border-[#ddd4c3]'
        }`}
      >
        {/* Compact Turn Status Header for Multiplayer */}
        {isMultiplayer && (
          <div
            className={`mb-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-semibold flex items-center justify-between ${
              isMyTurn
                ? 'bg-[#e7f3ea] border-[#9fd3a8] text-[#235430]'
                : 'bg-[#fae8e4] border-[#f4a28c] text-[#8a3224]'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              {isMyTurn ? (
                <>
                  <Sparkles className="w-3 h-3 text-[#4d8b5d] shrink-0" />
                  <span className="truncate">Giliran Anda! Pilih kartu & taruh di kota.</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 text-[#c85a4b] shrink-0" />
                  <span className="truncate">
                    Giliran: <strong className="underline decoration-[#d97757]">{currentTurnPlayerName || 'Pemain Lain'}</strong>
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1 font-mono text-[9px] shrink-0 ml-2 font-bold">
              <Clock className="w-2.5 h-2.5" />
              <span>{isMyTurn ? 'Aktif' : 'Terkunci'}</span>
            </div>
          </div>
        )}

        {/* Slim Hand Bar Header */}
        <div className="flex items-center justify-between px-1 mb-1">
          <div className="flex items-center gap-1.5">
            <div className="p-1 bg-[#f4e5d3] border border-[#e3ccb0] rounded-md text-[#b95e3d]">
              <Layers className="w-3 h-3" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-[11px] font-bold text-[#292524] tracking-tight leading-none">
                Kartu Tangan
              </h3>
              <span className="text-[10px] font-mono font-semibold text-[#78716c] tabular-nums leading-none">
                {hand.length} · Dek {deckCount}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 bg-[#f4efe6] hover:bg-[#ebe3d4] text-[#57534e] hover:text-[#292524] border border-[#ddd4c3] rounded-md transition-colors"
            title={isCollapsed ? 'Tampilkan Kartu Tangan' : 'Sembunyikan Kartu Tangan'}
          >
            {isCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Compact 3 Player Cards Row */}
        {!isCollapsed && (
          <div
            className={`grid grid-cols-3 gap-1.5 items-stretch pt-0.5 ${
              !isMyTurn && isMultiplayer ? 'opacity-65 cursor-not-allowed' : ''
            }`}
          >
            {hand.map((cardInHand, idx) => {
              const isSelected = selectedIndex === idx && isMyTurn;
              const isFlipped = flippedIndex === idx;
              const card = cardInHand.card;

              return (
                <div
                  key={`${card.id}-${idx}`}
                  className={`relative group rounded-xl p-1.5 border transition-all duration-200 flex flex-col justify-between ${
                    !isMyTurn && isMultiplayer
                      ? 'border-[#e2d8c5] bg-[#f4efe6]/70 cursor-not-allowed'
                      : isSelected
                      ? 'cozy-card-selected border-[#d97757] -translate-y-1.5 ring-2 ring-[#d97757]/40 cursor-pointer'
                      : 'cozy-card border-[#ddd4c3] hover:border-[#c8b99e] hover:-translate-y-0.5 cursor-pointer'
                  }`}
                  onClick={() => {
                    if (isMyTurn) onSelectCard(idx);
                  }}
                >
                  {/* Compact Card Header Tag & Actions */}
                  <div className="flex items-center justify-between mb-1 pb-0.5 border-b border-[#e8dfd0]">
                    <div className="flex items-center gap-1 min-w-0">
                      <span
                        className={`text-[10px] font-bold font-mono tabular-nums leading-none ${
                          isSelected ? 'text-[#c86b4a]' : 'text-[#57534e]'
                        }`}
                      >
                        #{card.id}
                      </span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#d97757] shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-0.5">
                      {/* Flip Preview Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFlippedIndex(isFlipped ? null : idx);
                        }}
                        className={`p-0.5 rounded transition-colors ${
                          isFlipped
                            ? 'text-[#c86b4a] bg-[#f4e5d3]'
                            : 'text-[#78716c] hover:text-[#292524] hover:bg-[#efe9dc]'
                        }`}
                        title="Intip Target Misi"
                      >
                        <Eye className="w-3 h-3" />
                      </button>

                      {/* Rotate Button */}
                      {isMyTurn && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRotateCard(idx);
                          }}
                          className="p-0.5 text-[#b95e3d] hover:bg-[#f4e5d3] rounded transition-colors"
                          title="Putar 180°"
                        >
                          <RotateCw className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Front 2.5D Diorama Grid or Back Goal Card Preview */}
                  {!isFlipped ? (
                    <div className="space-y-0.5">
                      <CardBlockGrid card={card} rotation={cardInHand.rotation} />
                      <div
                        className={`text-[9px] text-center font-mono tabular-nums leading-tight ${
                          isSelected ? 'text-[#b95e3d] font-bold' : 'text-[#78716c]'
                        }`}
                      >
                        {cardInHand.rotation}°{isSelected ? ' · Aktif' : ''}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <div className="w-full aspect-[4/3] bg-[#fdfaf3] p-1.5 rounded-lg border border-[#d6c8b0] shadow-inner flex flex-col justify-between overflow-hidden">
                        <div className="flex items-center justify-between gap-1 text-[8px] font-extrabold text-[#9a4629]">
                          <span className="truncate">{card.goal.title}</span>
                          <span className="font-mono font-bold text-[#fffdf9] bg-[#d97757] px-1 py-0.5 rounded text-[7px] shrink-0 tabular-nums leading-none">
                            +{card.goal.targetPoints}
                          </span>
                        </div>
                        <p className="text-[7.5px] text-[#57534e] line-clamp-3 leading-tight my-0.5 font-sans">
                          {card.goal.descriptionId || card.goal.description}
                        </p>
                        <div className="text-[7px] font-mono text-[#78716c] tabular-nums leading-none">
                          Misi #{card.goal.id}
                        </div>
                      </div>
                      <div className="text-[9px] text-center text-[#b95e3d] font-mono font-semibold leading-tight">
                        Sisi Misi
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
