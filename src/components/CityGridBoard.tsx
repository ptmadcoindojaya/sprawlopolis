import React, { useState, useRef, useEffect } from 'react';
import { GridState, CardInHand, GridPos, PlacedBlock } from '../types';
import { ZONE_NAMES } from '../data/cards';
import { getOrientedBlocks } from '../utils/cardUtils';
import { BlockDioramaArt } from './BlockDioramaArt';
import { CityTrafficOverlay } from './CityTrafficOverlay';
import { EmptyCellTerrain } from './EmptyCellTerrain';
import { Check, X } from 'lucide-react';

interface CityGridBoardProps {
  grid: GridState;
  selectedCard: CardInHand | null;
  onPlaceCard: (pos: GridPos, rotation: 0 | 180) => void;
  onRotateSelectedCard: () => void;
  isMyTurn?: boolean;
}

export const CityGridBoard: React.FC<CityGridBoardProps> = ({
  grid,
  selectedCard,
  onPlaceCard,
  onRotateSelectedCard,
  isMyTurn = true
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoverPos, setHoverPos] = useState<GridPos | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{
    dist: number;
    midX: number;
    midY: number;
    startZoom: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  // Calculate existing grid bounds to establish placement canvas limits
  const keys = Object.keys(grid);
  let minX = 0, maxX = 0, minY = 0, maxY = 0;

  if (keys.length > 0) {
    minX = Infinity; maxX = -Infinity; minY = Infinity; maxY = -Infinity;
    keys.forEach((key) => {
      const [x, y] = key.split(',').map(Number);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });
  }

  // Padding buffer around existing grid for prospective moves
  const renderMinX = minX - 3;
  const renderMaxX = maxX + 4;
  const renderMinY = minY - 3;
  const renderMaxY = maxY + 4;

  // Desktop Mouse Wheel Scroll Zoom Handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setZoom((prev) => Math.min(2.5, Math.max(0.4, prev * zoomFactor)));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Desktop Mouse Down Pan Handler
  const handleMouseDown = (e: React.MouseEvent) => {
    // If user clicks on grid cell and has a card selected, allow click-to-place; otherwise drag pan
    if (e.button === 0 && (e.target as HTMLElement).dataset.gridCell && selectedCard) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Mobile Touch Gestures (2-Finger Pinch Zoom & 2-Finger Pan, 1-Finger Pan)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      const midX = (t0.clientX + t1.clientX) / 2;
      const midY = (t0.clientY + t1.clientY) / 2;
      touchStartRef.current = {
        dist,
        midX,
        midY,
        startZoom: zoom,
        startPanX: pan.x,
        startPanY: pan.y
      };
      setIsDragging(false);
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      const target = touch.target as HTMLElement;
      if (target.dataset.gridCell && selectedCard) return; // allow cell selection
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartRef.current) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const currDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      const currMidX = (t0.clientX + t1.clientX) / 2;
      const currMidY = (t0.clientY + t1.clientY) / 2;

      const scaleRatio = currDist / (touchStartRef.current.dist || 1);
      const newZoom = Math.min(2.5, Math.max(0.4, touchStartRef.current.startZoom * scaleRatio));
      setZoom(newZoom);

      const dx = currMidX - touchStartRef.current.midX;
      const dy = currMidY - touchStartRef.current.midY;
      setPan({
        x: touchStartRef.current.startPanX + dx,
        y: touchStartRef.current.startPanY + dy
      });
    } else if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      setPan({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y });
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    setIsDragging(false);
  };

  // Check if placement at top-left pos (x,y) is valid (must touch or overlap existing city)
  const isValidPlacement = (pos: GridPos): boolean => {
    if (keys.length === 0) return true; // First card

    const targetCells = [
      `${pos.x},${pos.y}`,
      `${pos.x + 1},${pos.y}`,
      `${pos.x},${pos.y + 1}`,
      `${pos.x + 1},${pos.y + 1}`
    ];

    let touchesExisting = false;

    for (const cell of targetCells) {
      if (grid[cell]) {
        touchesExisting = true;
        break;
      }
      const [cx, cy] = cell.split(',').map(Number);
      const neighbors = [
        `${cx},${cy - 1}`,
        `${cx + 1},${cy}`,
        `${cx},${cy + 1}`,
        `${cx - 1},${cy}`
      ];
      if (neighbors.some((n) => grid[n])) {
        touchesExisting = true;
        break;
      }
    }

    return touchesExisting;
  };

  const CELL_SIZE = 74; // pixels per 1x1 block

  return (
    <div
      className="relative w-full h-full tabletop-surface overflow-hidden select-none cursor-grab active:cursor-grabbing"
      onContextMenu={(e) => {
        if (isMyTurn && selectedCard) {
          e.preventDefault();
          onRotateSelectedCard();
        }
      }}
    >
      {/* Grid Canvas Wrapper */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center relative touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp();
          setHoverPos(null);
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="transition-transform duration-75 ease-out relative shrink-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center'
          }}
        >
          {/* Render All Cells in Bounding Canvas */}
          {Array.from({ length: renderMaxY - renderMinY + 1 }).map((_, rIdx) => {
            const y = renderMinY + rIdx;
            return (
              <div key={`row-${y}`} className="flex overflow-visible">
                {Array.from({ length: renderMaxX - renderMinX + 1 }).map((_, cIdx) => {
                  const x = renderMinX + cIdx;
                  const key = `${x},${y}`;
                  const placedBlock = grid[key];

                  let hoverBlockIndex = -1;
                  let isHoverTarget = false;
                  let isValidPlacementArea = false;

                  if (isMyTurn && selectedCard && hoverPos) {
                    isValidPlacementArea = isValidPlacement(hoverPos);
                    const dx = x - hoverPos.x;
                    const dy = y - hoverPos.y;
                    if ((dx === 0 || dx === 1) && (dy === 0 || dy === 1)) {
                      isHoverTarget = true;
                      hoverBlockIndex = dy * 2 + dx;
                    }
                  }

                  const orientedBlocks = (isMyTurn && selectedCard)
                    ? getOrientedBlocks(selectedCard.card.blocks, selectedCard.rotation)
                    : null;
                  const previewBlock = (isHoverTarget && orientedBlocks && hoverBlockIndex >= 0)
                    ? orientedBlocks[hoverBlockIndex]
                    : null;

                  return (
                    <div
                      key={key}
                      data-grid-cell="true"
                      style={{ width: CELL_SIZE, height: CELL_SIZE }}
                      className={`relative overflow-visible border border-[#d6ccb8]/55 flex items-center justify-center transition-colors duration-150 ${
                        isHoverTarget ? 'z-30' : ''
                      } ${
                        placedBlock
                          ? ''
                          : isMyTurn
                          ? 'hover:bg-[#fbf8f2]/50'
                          : ''
                      }`}
                      onMouseEnter={() => isMyTurn && selectedCard && setHoverPos({ x, y })}
                      onClick={() => {
                        if (isMyTurn && selectedCard && hoverPos && isValidPlacement(hoverPos)) {
                          onPlaceCard(hoverPos, selectedCard.rotation);
                        }
                      }}
                    >
                      {/* Calm Low-Contrast Outskirts Nature Terrain & Coordinate Marker on Empty Cells */}
                      {!placedBlock && (
                        <>
                          <EmptyCellTerrain x={x} y={y} />
                          <span className="absolute top-1 left-1.5 z-[1] text-[9px] font-mono text-[#8d8271]/70 pointer-events-none tabular-nums">
                            {x},{y}
                          </span>
                        </>
                      )}

                      {/* Render Placed City Block */}
                      {placedBlock && (
                        <BlockCell block={placedBlock} size={CELL_SIZE} />
                      )}

                      {/* Render Floating 2.5D Hover Preview Overlay */}
                      {isHoverTarget && previewBlock && (
                        <div
                          className={`absolute inset-0 z-30 pointer-events-none overflow-visible transition-transform duration-150 -translate-y-1.5 scale-[1.03] rounded-xl p-[2px] ${
                            isValidPlacementArea
                              ? 'bg-[#63a375]/25 ring-2 ring-[#5e9a6b]'
                              : 'bg-[#d96b6b]/25 ring-2 ring-[#d96b6b]'
                          }`}
                        >
                          <BlockCell
                            block={{
                              cardId: selectedCard.card.id,
                              zone: previewBlock.zone,
                              roads: previewBlock.roads,
                              layer: 99,
                              blockIndex: hoverBlockIndex,
                              rotation: selectedCard.rotation
                            }}
                            size={CELL_SIZE - 4}
                            isGhost
                            isValidGhost={isValidPlacementArea}
                          />

                          {/* Non-Hue-Only Placement Indicator Badge on Top-Left Preview Block */}
                          {hoverBlockIndex === 0 && (
                            <div
                              className={`absolute -top-3.5 -left-1 z-40 px-1.5 py-0.5 rounded-md text-[9px] font-bold shadow-md flex items-center gap-0.5 whitespace-nowrap ${
                                isValidPlacementArea
                                  ? 'bg-[#5e9a6b] text-[#fffdf9]'
                                  : 'bg-[#d96b6b] text-[#fffdf9]'
                              }`}
                            >
                              {isValidPlacementArea ? (
                                <>
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  <span>Pasang</span>
                                </>
                              ) : (
                                <>
                                  <X className="w-2.5 h-2.5 stroke-[3]" />
                                  <span>Harus menempel</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Animated 2.5D Mini Cars Traffic Layer (Above asphalt/markings z-[5], below pop-outs z-[20] & hover z-30) */}
          <CityTrafficOverlay
            grid={grid}
            minX={renderMinX}
            maxX={renderMaxX}
            minY={renderMinY}
            maxY={renderMaxY}
            className="z-[12]"
          />
        </div>
      </div>
    </div>
  );
};

interface BlockCellProps {
  block: PlacedBlock;
  size: number;
  isGhost?: boolean;
  isValidGhost?: boolean;
}

const BlockCell: React.FC<BlockCellProps> = ({ block, size, isGhost, isValidGhost }) => {
  const zoneInfo = ZONE_NAMES[block.zone];
  const isStacked = !isGhost && block.layer > 0;
  const canonicalBlockIndex = block.rotation === 180 ? 3 - block.blockIndex : block.blockIndex;

  return (
    <div
      style={{ width: size, height: size }}
      className="relative p-[2px] flex items-center justify-center pointer-events-none overflow-visible"
    >
      {/* Clipped 2.5D Ground Tile, Roads & Base Diorama Layer (z-[5] below traffic z-[12]) */}
      <div
        className={`relative z-[5] w-full h-full rounded-[10px] overflow-hidden transition-transform duration-150 ${
          zoneInfo ? `${zoneInfo.bg} ${zoneInfo.text}` : 'bg-[#d8c39e] text-[#292524]'
        } ${
          isGhost
            ? `tile-25d-floating ${isValidGhost ? 'opacity-95' : 'opacity-80 saturate-75'}`
            : isStacked
            ? 'tile-25d-elevated -translate-y-[1px]'
            : 'tile-25d'
        }`}
      >
        <BlockDioramaArt
          cardId={block.cardId}
          blockIndex={canonicalBlockIndex}
          zone={block.zone}
          roads={block.roads}
          layer="base"
          sizeMode="board"
        />
      </div>

      {/* 2.5D Pop-Out Hero Elements (z-[20] above traffic z-[12] for authentic 2.5D depth) */}
      <div
        className={`absolute inset-[2px] pointer-events-none overflow-visible z-[20] transition-transform duration-150 ${
          isGhost
            ? isValidGhost
              ? 'opacity-95'
              : 'opacity-80 saturate-75'
            : isStacked
            ? '-translate-y-[1px]'
            : ''
        }`}
      >
        <BlockDioramaArt
          cardId={block.cardId}
          blockIndex={canonicalBlockIndex}
          zone={block.zone}
          roads={block.roads}
          layer="popout"
          sizeMode="board"
        />
      </div>
    </div>
  );
};
