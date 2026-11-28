import React, { useMemo } from 'react';
import { SprawlopolisCard, GridState } from '../types';
import { ZONE_NAMES } from '../data/cards';
import { getOrientedBlocks } from '../utils/cardUtils';
import { BlockDioramaArt } from './BlockDioramaArt';
import { CityTrafficOverlay } from './CityTrafficOverlay';

interface CardBlockGridProps {
  card: SprawlopolisCard;
  rotation: 0 | 180;
  className?: string;
}

export const CardBlockGrid: React.FC<CardBlockGridProps> = ({ card, rotation, className = '' }) => {
  const blocks = useMemo(() => getOrientedBlocks(card.blocks, rotation), [card.blocks, rotation]);

  // Build 2x2 mini GridState so single-card roads also show occasional mini pastel cars
  const miniGrid: GridState = useMemo(() => {
    const coords = [
      { key: '0,0', idx: 0 },
      { key: '1,0', idx: 1 },
      { key: '0,1', idx: 2 },
      { key: '1,1', idx: 3 }
    ];
    const g: GridState = {};
    coords.forEach(({ key, idx }) => {
      g[key] = {
        cardId: card.id,
        zone: blocks[idx].zone,
        roads: blocks[idx].roads,
        layer: 0,
        blockIndex: idx,
        rotation
      };
    });
    return g;
  }, [card.id, blocks, rotation]);

  return (
    <div
      className={`relative bg-[#e8e0d0] p-0.5 pt-1 rounded-lg border border-[#d6ccb8] shadow-inner aspect-[4/3] w-full overflow-visible ${className}`}
    >
      <div className="relative grid grid-cols-2 grid-rows-2 gap-0.5 w-full h-full overflow-visible">
        {blocks.map((block, idx) => {
          const zoneInfo = ZONE_NAMES[block.zone];
          const canonicalIdx = rotation === 180 ? 3 - idx : idx;

          return (
            <div key={idx} className="relative w-full h-full overflow-visible">
              {/* Clipped 2.5D Base Tile (Ground + Roads + Midground, z-[5]) */}
              <div
                className={`relative z-[5] w-full h-full rounded-lg overflow-hidden tile-25d-mini ${
                  zoneInfo ? `${zoneInfo.bg} ${zoneInfo.text}` : 'bg-[#d8c39e] text-[#292524]'
                }`}
              >
                <BlockDioramaArt
                  cardId={card.id}
                  blockIndex={canonicalIdx}
                  zone={block.zone}
                  roads={block.roads}
                  layer="base"
                  sizeMode="mini"
                />
              </div>

              {/* 2.5D Pop-Out Upper Layer (Trees / Rooftops / Smokestacks, z-[20]) */}
              <div className="absolute inset-0 pointer-events-none overflow-visible z-[20]">
                <BlockDioramaArt
                  cardId={card.id}
                  blockIndex={canonicalIdx}
                  zone={block.zone}
                  roads={block.roads}
                  layer="popout"
                  sizeMode="mini"
                />
              </div>
            </div>
          );
        })}

        {/* Single-Card Mini Traffic Layer (Above asphalt z-[5], below pop-outs z-[20]) */}
        <CityTrafficOverlay
          grid={miniGrid}
          minX={0}
          maxX={1}
          minY={0}
          maxY={1}
          compact
          cellAspectRatio={4 / 3}
          className="z-[12]"
        />
      </div>
    </div>
  );
};
