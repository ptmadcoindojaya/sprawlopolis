import React, { useState } from 'react';
import { SprawlopolisCard, BlockData, GridState } from '../types';
import { INITIAL_CARDS, ZONE_NAMES } from '../data/cards';
import { BlockDioramaArt } from './BlockDioramaArt';
import { CityTrafficOverlay } from './CityTrafficOverlay';
import {
  X,
  RotateCw,
  Search,
  Layers,
  RefreshCw
} from 'lucide-react';

interface CardGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards?: SprawlopolisCard[];
}

export const CardGalleryModal: React.FC<CardGalleryModalProps> = ({
  isOpen,
  onClose,
  cards = INITIAL_CARDS
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('ALL');
  const [globalFlipped, setGlobalFlipped] = useState<boolean>(false);
  const [cardFlips, setCardFlips] = useState<Record<number, boolean>>({});
  const [cardRotations, setCardRotations] = useState<Record<number, number>>({});

  if (!isOpen) return null;

  // Rotation helper
  const handleRotateCard = (cardId: number) => {
    setCardRotations((prev) => ({
      ...prev,
      [cardId]: ((prev[cardId] || 0) + 90) % 360
    }));
  };

  // Flip single card
  const handleFlipCard = (cardId: number) => {
    setCardFlips((prev) => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  // Filter logic
  const filteredCards = cards.filter((card) => {
    const matchesSearch =
      card.id.toString().includes(searchQuery) ||
      card.goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.goal.descriptionId.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedZoneFilter === 'ALL') return true;

    return card.blocks.some((b) => b.zone === selectedZoneFilter);
  });

  // Re-orient blocks for 2x2 grid based on rotation degree (0, 90, 180, 270)
  const getOrientedBlocksForGallery = (blocks: BlockData[], rotation: number): BlockData[] => {
    if (rotation === 90) {
      const b0 = blocks[2];
      const b1 = blocks[0];
      const b2 = blocks[3];
      const b3 = blocks[1];
      return [
        rotateSingleBlockRoads(b0, 90),
        rotateSingleBlockRoads(b1, 90),
        rotateSingleBlockRoads(b2, 90),
        rotateSingleBlockRoads(b3, 90)
      ];
    } else if (rotation === 180) {
      return [
        rotateSingleBlockRoads(blocks[3], 180),
        rotateSingleBlockRoads(blocks[2], 180),
        rotateSingleBlockRoads(blocks[1], 180),
        rotateSingleBlockRoads(blocks[0], 180)
      ];
    } else if (rotation === 270) {
      return [
        rotateSingleBlockRoads(blocks[1], 270),
        rotateSingleBlockRoads(blocks[3], 270),
        rotateSingleBlockRoads(blocks[0], 270),
        rotateSingleBlockRoads(blocks[2], 270)
      ];
    }
    return blocks;
  };

  const rotateSingleBlockRoads = (block: BlockData, deg: number): BlockData => {
    const r = block.roads;
    if (deg === 90) {
      return {
        ...block,
        roads: {
          top: r.left,
          right: r.top,
          bottom: r.right,
          left: r.bottom
        }
      };
    } else if (deg === 180) {
      return {
        ...block,
        roads: {
          top: r.bottom,
          right: r.left,
          bottom: r.top,
          left: r.right
        }
      };
    } else if (deg === 270) {
      return {
        ...block,
        roads: {
          top: r.right,
          right: r.bottom,
          bottom: r.left,
          left: r.top
        }
      };
    }
    return block;
  };

  const getCanonicalBlockIndex = (displayIdx: number, rotation: number): number => {
    if (rotation === 90) return [2, 0, 3, 1][displayIdx] ?? displayIdx;
    if (rotation === 180) return [3, 2, 1, 0][displayIdx] ?? displayIdx;
    if (rotation === 270) return [1, 3, 0, 2][displayIdx] ?? displayIdx;
    return displayIdx;
  };

  const renderInteractiveFrontGrid = (cardId: number, orientedBlocks: BlockData[], rotation: number) => {
    const miniGrid: GridState = {
      '0,0': { cardId, zone: orientedBlocks[0].zone, roads: orientedBlocks[0].roads, layer: 0, blockIndex: 0, rotation: 0 },
      '1,0': { cardId, zone: orientedBlocks[1].zone, roads: orientedBlocks[1].roads, layer: 0, blockIndex: 1, rotation: 0 },
      '0,1': { cardId, zone: orientedBlocks[2].zone, roads: orientedBlocks[2].roads, layer: 0, blockIndex: 2, rotation: 0 },
      '1,1': { cardId, zone: orientedBlocks[3].zone, roads: orientedBlocks[3].roads, layer: 0, blockIndex: 3, rotation: 0 }
    };

    return (
      <div className="space-y-2">
        <div className="relative p-2.5 pt-3.5 bg-[#e8e0d0] rounded-2xl border border-[#d6ccb8] shadow-inner overflow-visible">
          <div className="relative grid grid-cols-2 gap-2 overflow-visible">
            {orientedBlocks.map((block, bIdx) => {
              const zone = ZONE_NAMES[block.zone];
              const canonicalIdx = getCanonicalBlockIndex(bIdx, rotation);

              return (
                <div key={bIdx} className="relative aspect-square overflow-visible">
                  {/* Clipped 2.5D Base Tile (z-[5]) */}
                  <div
                    className={`relative z-[5] w-full h-full rounded-xl overflow-hidden tile-25d-mini ${zone.bg} ${zone.text}`}
                  >
                    <BlockDioramaArt
                      cardId={cardId}
                      blockIndex={canonicalIdx}
                      zone={block.zone}
                      roads={block.roads}
                      layer="base"
                      sizeMode="gallery"
                    />
                  </div>

                  {/* 2.5D Pop-Out Upper Layer (z-[20]) */}
                  <div className="absolute inset-0 pointer-events-none overflow-visible z-[20]">
                    <BlockDioramaArt
                      cardId={cardId}
                      blockIndex={canonicalIdx}
                      zone={block.zone}
                      roads={block.roads}
                      layer="popout"
                      sizeMode="gallery"
                    />
                  </div>
                </div>
              );
            })}

            {/* Compact Single-Card Traffic Overlay (z-[12]) */}
            <CityTrafficOverlay
              grid={miniGrid}
              minX={0}
              maxX={1}
              minY={0}
              maxY={1}
              compact
              className="z-[12]"
            />
          </div>
        </div>
        <div className="text-[10px] font-mono text-center text-[#78716c] tabular-nums">
          Arah Sambungan Jalan: {rotation}°
        </div>
      </div>
    );
  };

  const renderMissionBackCard = (card: SprawlopolisCard) => (
    <div className="goal-card-25d border-[1.5px] border-[#cbbca3] rounded-2xl overflow-hidden flex flex-col">
      <div className="px-3.5 py-2.5 bg-[#f5e9da] border-b border-[#dec4a6] flex items-center justify-between gap-2">
        <span className="text-xs font-extrabold text-[#292524] tracking-tight uppercase truncate">
          {card.goal.title}
        </span>
        <span className="px-2 py-0.5 bg-[#d97757] text-[#fffdf9] border border-[#b85a3b] font-mono font-extrabold text-xs rounded-lg tabular-nums shrink-0">
          {card.goal.targetPoints} PT
        </span>
      </div>

      <div className="p-3.5 text-xs text-[#3d3732] leading-relaxed font-sans bg-[#fdfaf3] flex-1">
        {card.goal.descriptionId}
      </div>

      <div className="px-3.5 py-2 bg-[#f4efe6] border-t border-[#e5dac6] flex items-center justify-between text-[10px] text-[#78716c] font-mono">
        <span className="capitalize">Kategori: {card.goal.category}</span>
        <span>Kartu Misi #{card.goal.id}</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#292524]/45 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-fade-in">
      <div className="w-full max-w-6xl max-h-[92vh] bg-[#fbf8f2] border border-[#ddd4c3] rounded-3xl shadow-2xl flex flex-col text-[#292524] overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 sm:p-6 border-b border-[#e8dfd0] flex flex-wrap items-center justify-between gap-4 bg-[#f4efe6]/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#f4e5d3] border border-[#e3ccb0] rounded-2xl text-[#c86b4a]">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-[#292524]">
                  Galeri & Katalog Kartu Sprawlopolis
                </h2>
                <span className="text-xs font-mono font-semibold text-[#78716c]">
                  · 18 Kartu Lengkap
                </span>
              </div>
              <p className="text-xs text-[#57534e] mt-0.5">
                Pelajari struktur 4 blok diorama 2.5D, sambungan jalan, serta kartu misi setiap kartu.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-[#ebe3d4] rounded-xl text-[#78716c] hover:text-[#292524] transition-colors ml-auto"
            title="Tutup Galeri"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-3 sm:p-4 bg-[#fbf8f2] border-b border-[#e8dfd0] flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-[#78716c] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor kartu #1-18 atau nama target..."
              className="w-full bg-[#f4efe6] border border-[#ddd4c3] rounded-xl pl-9 pr-3 py-2 text-[#292524] placeholder-[#8c8273] focus:outline-none focus:border-[#d97757] transition-colors"
            />
          </div>

          {/* Filter by Zone */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[#78716c] font-semibold mr-1 hidden sm:inline">Wilayah:</span>
            {[
              { id: 'ALL', label: 'Semua' },
              { id: 'R', label: 'Residential' },
              { id: 'C', label: 'Commercial' },
              { id: 'I', label: 'Industrial' },
              { id: 'P', label: 'Park' }
            ].map((z) => (
              <button
                key={z.id}
                onClick={() => setSelectedZoneFilter(z.id)}
                className={`px-2.5 py-1.5 rounded-xl border font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  selectedZoneFilter === z.id
                    ? 'cozy-btn-primary border-[#b95e3d]'
                    : 'bg-[#f4efe6] text-[#57534e] border-[#ddd4c3] hover:text-[#292524] hover:bg-[#efe9dc]'
                }`}
              >
                {z.label}
              </button>
            ))}
          </div>

          {/* Flip All Toggle */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => {
                const next = !globalFlipped;
                setGlobalFlipped(next);
                const updated: Record<number, boolean> = {};
                cards.forEach((c) => {
                  updated[c.id] = next;
                });
                setCardFlips(updated);
              }}
              className="px-3 py-1.5 bg-[#f4e5d3] hover:bg-[#ecd7be] border border-[#e3ccb0] text-[#9a4629] rounded-xl font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{globalFlipped ? 'Semua Sisi Depan' : 'Semua Sisi Misi'}</span>
            </button>
          </div>
        </div>

        {/* Cards Grid Display */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 bg-[#efe9dc]/60">
          {filteredCards.length === 0 ? (
            <div className="col-span-full py-16 text-center text-[#78716c] font-medium">
              Tidak ada kartu yang cocok dengan pencarian / filter "{searchQuery}".
            </div>
          ) : (
            filteredCards.map((card) => {
              const isFlipped = cardFlips[card.id] ?? globalFlipped;
              const rotation = cardRotations[card.id] || 0;
              const orientedBlocks = getOrientedBlocksForGallery(card.blocks, rotation);

              return (
                <div
                  key={card.id}
                  className="cozy-card border border-[#ddd4c3] hover:border-[#c8b99e] rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all"
                >
                  {/* Card Header Tag & Flip Button */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#e8dfd0] gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 bg-[#f4e5d3] border border-[#e3ccb0] text-[#9a4629] font-extrabold font-mono text-xs rounded-lg tabular-nums shrink-0">
                        #{card.id}
                      </span>
                      <span className="text-xs font-bold text-[#292524] truncate">
                        {card.goal.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!isFlipped && (
                        <button
                          onClick={() => handleRotateCard(card.id)}
                          className="p-1.5 bg-[#f4efe6] hover:bg-[#ebe3d4] border border-[#ddd4c3] text-[#9a4629] rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors tabular-nums"
                          title="Putar Kartu (Rotasi 90°)"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>{rotation}°</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleFlipCard(card.id)}
                        className="px-2 py-1.5 bg-[#f4efe6] hover:bg-[#ebe3d4] text-[#57534e] hover:text-[#292524] rounded-lg text-[11px] font-bold flex items-center gap-1 border border-[#ddd4c3] transition-colors whitespace-nowrap"
                        title="Balik Sisi Kartu"
                      >
                        <RefreshCw className="w-3 h-3 text-[#c86b4a]" />
                        <span>{isFlipped ? 'Depan' : 'Misi'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Card Face Content (Pure 2.5D Diorama Grid or 2.5D Tabletop Goal Card) */}
                  <div className="flex-1 flex flex-col justify-center my-1">
                    {!isFlipped
                      ? renderInteractiveFrontGrid(card.id, orientedBlocks, rotation)
                      : renderMissionBackCard(card)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3.5 bg-[#f4efe6] border-t border-[#e8dfd0] text-xs text-[#57534e] flex items-center justify-between px-6">
          <span className="tabular-nums">Menampilkan {filteredCards.length} dari 18 Kartu Sprawlopolis</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#fbf8f2] hover:bg-[#ebe3d4] text-[#292524] border border-[#ddd4c3] rounded-xl font-bold text-xs transition-colors"
          >
            Tutup Katalog
          </button>
        </div>
      </div>
    </div>
  );
};
