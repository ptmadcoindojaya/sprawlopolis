import { CardBlocks, RoadEdges, SprawlopolisCard } from '../types';

/**
 * Rotates road edge connections 180 degrees.
 * top <-> bottom, left <-> right
 */
export function rotateRoads180(roads: RoadEdges): RoadEdges {
  return {
    top: !!roads.bottom,
    bottom: !!roads.top,
    left: !!roads.right,
    right: !!roads.left,
    internalConnect: roads.internalConnect
  };
}

/**
 * Returns the 4 blocks of a card correctly oriented for 0 or 180 degree rotation.
 * For 180 degrees:
 * - Position order changes: [SE, SW, NE, NW] -> [0, 1, 2, 3] positions
 * - Internal road edges of each block are inverted 180 degrees
 */
export function getOrientedBlocks(blocks: CardBlocks, rotation: 0 | 180): CardBlocks {
  if (rotation === 180) {
    return [
      { zone: blocks[3].zone, roads: rotateRoads180(blocks[3].roads) },
      { zone: blocks[2].zone, roads: rotateRoads180(blocks[2].roads) },
      { zone: blocks[1].zone, roads: rotateRoads180(blocks[1].roads) },
      { zone: blocks[0].zone, roads: rotateRoads180(blocks[0].roads) }
    ];
  }
  return blocks;
}
