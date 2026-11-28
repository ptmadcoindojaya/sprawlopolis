import { GridState, GoalCard, GoalScoreBreakdown, TotalScoreBreakdown, ZoneType, PlacedBlock } from '../types';

/**
 * Calculates grid bounding box: minX, maxX, minY, maxY
 */
export function getGridBounds(grid: GridState) {
  const keys = Object.keys(grid);
  if (keys.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  keys.forEach((key) => {
    const [x, y] = key.split(',').map(Number);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
}

/**
 * Find contiguous group sizes for a specific zone type
 */
export function getContiguousGroupSizes(grid: GridState, zone: ZoneType): number[] {
  const visited = new Set<string>();
  const groupSizes: number[] = [];

  const keys = Object.keys(grid).filter((key) => grid[key].zone === zone);

  for (const key of keys) {
    if (visited.has(key)) continue;

    let size = 0;
    const queue = [key];
    visited.add(key);

    while (queue.length > 0) {
      const currKey = queue.shift()!;
      size++;
      const [x, y] = currKey.split(',').map(Number);

      // Check 4 neighbors
      const neighbors = [
        `${x},${y - 1}`, // top
        `${x + 1},${y}`, // right
        `${x},${y + 1}`, // bottom
        `${x - 1},${y}`  // left
      ];

      for (const nKey of neighbors) {
        if (!visited.has(nKey) && grid[nKey] && grid[nKey].zone === zone) {
          visited.add(nKey);
          queue.push(nKey);
        }
      }
    }

    groupSizes.push(size);
  }

  return groupSizes.sort((a, b) => b - a);
}

/**
 * Calculate the largest contiguous group size for a zone
 */
export function getLargestGroupSize(grid: GridState, zone: ZoneType): number {
  const sizes = getContiguousGroupSizes(grid, zone);
  return sizes.length > 0 ? sizes[0] : 0;
}

/**
 * Calculates distinct road networks in the city grid
 */
export function getRoadNetworkCount(grid: GridState): number {
  const visitedNodes = new Set<string>();
  let networkCount = 0;

  const getRoadEdgesForBlock = (key: string, block: PlacedBlock): string[] => {
    const edges: string[] = [];
    if (block.roads.top) edges.push(`${key}:top`);
    if (block.roads.right) edges.push(`${key}:right`);
    if (block.roads.bottom) edges.push(`${key}:bottom`);
    if (block.roads.left) edges.push(`${key}:left`);
    return edges;
  };

  const keys = Object.keys(grid);

  for (const key of keys) {
    const block = grid[key];
    const blockEdges = getRoadEdgesForBlock(key, block);

    for (const edgeNode of blockEdges) {
      if (visitedNodes.has(edgeNode)) continue;

      networkCount++;
      const queue = [edgeNode];
      visitedNodes.add(edgeNode);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        const [posStr, dir] = curr.split(':');
        const [x, y] = posStr.split(',').map(Number);

        // 1. Internal connections: All edges within the same block are connected
        const currBlock = grid[posStr];
        if (currBlock) {
          const internalEdges = getRoadEdgesForBlock(posStr, currBlock);
          for (const ie of internalEdges) {
            if (!visitedNodes.has(ie)) {
              visitedNodes.add(ie);
              queue.push(ie);
            }
          }
        }

        // 2. Neighbor connections
        let neighborKey = '';
        let neighborDir = '';

        if (dir === 'top') {
          neighborKey = `${x},${y - 1}`;
          neighborDir = 'bottom';
        } else if (dir === 'right') {
          neighborKey = `${x + 1},${y}`;
          neighborDir = 'left';
        } else if (dir === 'bottom') {
          neighborKey = `${x},${y + 1}`;
          neighborDir = 'top';
        } else if (dir === 'left') {
          neighborKey = `${x - 1},${y}`;
          neighborDir = 'right';
        }

        if (neighborKey && grid[neighborKey]) {
          const neighborBlock = grid[neighborKey];
          const neighborEdge = `${neighborKey}:${neighborDir}`;
          const hasRoadInDir = (
            (neighborDir === 'top' && neighborBlock.roads.top) ||
            (neighborDir === 'right' && neighborBlock.roads.right) ||
            (neighborDir === 'bottom' && neighborBlock.roads.bottom) ||
            (neighborDir === 'left' && neighborBlock.roads.left)
          );

          if (hasRoadInDir && !visitedNodes.has(neighborEdge)) {
            visitedNodes.add(neighborEdge);
            queue.push(neighborEdge);
          }
        }
      }
    }
  }

  return networkCount;
}

/**
 * Evaluates individual goal cards against the grid based on CSV specifications
 */
export function evaluateGoal(goal: GoalCard, grid: GridState): GoalScoreBreakdown {
  const bounds = getGridBounds(grid);
  let score = 0;
  let explanation = '';

  const getNeighbors = (x: number, y: number): { block: PlacedBlock; posKey: string }[] => {
    const coords = [
      { key: `${x},${y - 1}` },
      { key: `${x + 1},${y}` },
      { key: `${x},${y + 1}` },
      { key: `${x - 1},${y}` }
    ];
    return coords
      .filter((c) => grid[c.key])
      .map((c) => ({ block: grid[c.key], posKey: c.key }));
  };

  switch (goal.id) {
    case 1: { // THE OUTSKIRTS: 1 PT / Jalan tidak berakhir di tepi, -1 PT / Jalan berakhir di tepi
      let interiorRoadEnds = 0;
      let edgeRoadEnds = 0;

      Object.entries(grid).forEach(([key, block]) => {
        const [x, y] = key.split(',').map(Number);
        const directions: { dir: 'top' | 'right' | 'bottom' | 'left'; nx: number; ny: number }[] = [
          { dir: 'top', nx: x, ny: y - 1 },
          { dir: 'right', nx: x + 1, ny: y },
          { dir: 'bottom', nx: x, ny: y + 1 },
          { dir: 'left', nx: x - 1, ny: y }
        ];

        directions.forEach(({ dir, nx, ny }) => {
          if (block.roads[dir]) {
            const neighborKey = `${nx},${ny}`;
            if (grid[neighborKey]) {
              interiorRoadEnds++;
            } else {
              edgeRoadEnds++;
            }
          }
        });
      });

      // Divide by 2 because interior road connections are shared between 2 adjacent blocks
      const interiorConnections = Math.floor(interiorRoadEnds / 2);
      score = interiorConnections - edgeRoadEnds;
      explanation = `${interiorConnections} koneksi interior (+1) - ${edgeRoadEnds} ujung jalan di tepi kota (-1) = ${score} poin.`;
      break;
    }

    case 2: { // BLOOM BOOM: 1 PT / baris & kolom dengan tepat 3 Taman. -1 PT / baris & kolom dengan tepat 0 Taman.
      let bonus = 0;
      let penalty = 0;

      // Rows
      for (let y = bounds.minY; y <= bounds.maxY; y++) {
        let pInRow = 0;
        for (let x = bounds.minX; x <= bounds.maxX; x++) {
          if (grid[`${x},${y}`]?.zone === 'P') pInRow++;
        }
        if (pInRow === 3) bonus++;
        if (pInRow === 0) penalty++;
      }

      // Columns
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        let pInCol = 0;
        for (let y = bounds.minY; y <= bounds.maxY; y++) {
          if (grid[`${x},${y}`]?.zone === 'P') pInCol++;
        }
        if (pInCol === 3) bonus++;
        if (pInCol === 0) penalty++;
      }

      score = bonus - penalty;
      explanation = `${bonus} baris/kolom dengan 3 Taman (+1) - ${penalty} tanpa Taman (-1) = ${score} poin.`;
      break;
    }

    case 3: { // GO GREEN: 1 PT / Taman, -3 PTS / Industri
      let parkCount = 0;
      let industrialCount = 0;

      Object.values(grid).forEach((block) => {
        if (block.zone === 'P') parkCount++;
        if (block.zone === 'I') industrialCount++;
      });

      score = parkCount - (industrialCount * 3);
      explanation = `${parkCount} Taman (+1) - ${industrialCount} Industri (×3) = ${score} poin.`;
      break;
    }

    case 4: { // BLOCK PARTY: Poin per klaster 2x2 tipe sama
      let clusterCount = 0;

      Object.keys(grid).forEach((key) => {
        const [x, y] = key.split(',').map(Number);
        const z = grid[key].zone;
        if (
          grid[`${x + 1},${y}`]?.zone === z &&
          grid[`${x},${y + 1}`]?.zone === z &&
          grid[`${x + 1},${y + 1}`]?.zone === z
        ) {
          clusterCount++;
        }
      });

      const partyScores = [-8, -5, -2, -1, 4];
      score = clusterCount >= 5 ? 7 : (partyScores[clusterCount] ?? -8);
      explanation = `${clusterCount} klaster 2x2 tipe sama = ${score} poin.`;
      break;
    }

    case 5: { // STACKS AND SCRAPERS: 2 PTS / Industri yang hanya bersisian C/I saja
      let count = 0;

      Object.entries(grid).forEach(([key, block]) => {
        if (block.zone === 'I') {
          const [x, y] = key.split(',').map(Number);
          const neighbors = getNeighbors(x, y);
          if (neighbors.length > 0) {
            const hasInvalidNeighbor = neighbors.some(
              (n) => n.block.zone === 'R' || n.block.zone === 'P'
            );
            if (!hasInvalidNeighbor) {
              count++;
            }
          }
        }
      });

      score = count * 2;
      explanation = `${count} Industri hanya berdampingan Komersial/Industri × 2 = ${score} poin.`;
      break;
    }

    case 6: { // MASTER PLANNED: Perumahan terbesar - Industri terbesar
      const largestR = getLargestGroupSize(grid, 'R');
      const largestI = getLargestGroupSize(grid, 'I');
      score = largestR - largestI;
      explanation = `Perumahan terbesar (${largestR}) - Industri terbesar (${largestI}) = ${score} poin.`;
      break;
    }

    case 7: { // CENTRAL PERKS: 1 PT / Taman interior, -2 PTS / Taman pinggir
      let interiorParks = 0;
      let edgeParks = 0;

      Object.entries(grid).forEach(([key, block]) => {
        if (block.zone === 'P') {
          const [x, y] = key.split(',').map(Number);
          const isEdge = x === bounds.minX || x === bounds.maxX || y === bounds.minY || y === bounds.maxY;
          if (isEdge) {
            edgeParks++;
          } else {
            interiorParks++;
          }
        }
      });

      score = interiorParks - (edgeParks * 2);
      explanation = `${interiorParks} Taman interior (+1) - ${edgeParks} Taman tepi (-2) = ${score} poin.`;
      break;
    }

    case 8: { // THE 'BURBS: 1 PT / Taman bersisian R terbesar, -2 PTS / Industri bersisian R terbesar
      const visited = new Set<string>();
      let largestRKeys = new Set<string>();
      let maxRSize = 0;

      const rKeys = Object.keys(grid).filter((k) => grid[k].zone === 'R');
      for (const k of rKeys) {
        if (visited.has(k)) continue;

        const currentGroup: string[] = [];
        const queue = [k];
        visited.add(k);

        while (queue.length > 0) {
          const curr = queue.shift()!;
          currentGroup.push(curr);
          const [x, y] = curr.split(',').map(Number);
          const neighbors = [`${x},${y - 1}`, `${x + 1},${y}`, `${x},${y + 1}`, `${x - 1},${y}`];
          for (const nk of neighbors) {
            if (!visited.has(nk) && grid[nk]?.zone === 'R') {
              visited.add(nk);
              queue.push(nk);
            }
          }
        }

        if (currentGroup.length > maxRSize) {
          maxRSize = currentGroup.length;
          largestRKeys = new Set(currentGroup);
        }
      }

      let parkBonus = 0;
      let indPenalty = 0;

      Object.entries(grid).forEach(([key, block]) => {
        const [x, y] = key.split(',').map(Number);
        const neighborKeys = [`${x},${y - 1}`, `${x + 1},${y}`, `${x},${y + 1}`, `${x - 1},${y}`];
        const touchesLargestR = neighborKeys.some((nk) => largestRKeys.has(nk));

        if (touchesLargestR) {
          if (block.zone === 'P') parkBonus++;
          if (block.zone === 'I') indPenalty++;
        }
      });

      score = parkBonus - (indPenalty * 2);
      explanation = `${parkBonus} Taman (+1) - ${indPenalty} Industri (-2) berdekatan klaster Perumahan terbesar = ${score} poin.`;
      break;
    }

    case 9: { // CONCRETE JUNGLE: 1 PT / Industri berbagi sudut diagonal dengan Industri lain
      let count = 0;

      Object.entries(grid).forEach(([key, block]) => {
        if (block.zone === 'I') {
          const [x, y] = key.split(',').map(Number);
          const diagonals = [`${x + 1},${y + 1}`, `${x + 1},${y - 1}`, `${x - 1},${y + 1}`, `${x - 1},${y - 1}`];
          if (diagonals.some((dk) => grid[dk]?.zone === 'I')) {
            count++;
          }
        }
      });

      score = count * 1;
      explanation = `${count} Industri berbagi sudut diagonal dengan Industri lain × 1 = ${score} poin.`;
      break;
    }

    case 10: { // THE STRIP: 1 PT / Komersial di 1 Baris atau Kolom terbaik
      let maxCommercialInLine = 0;

      // Rows
      for (let y = bounds.minY; y <= bounds.maxY; y++) {
        let cCount = 0;
        for (let x = bounds.minX; x <= bounds.maxX; x++) {
          if (grid[`${x},${y}`]?.zone === 'C') cCount++;
        }
        if (cCount > maxCommercialInLine) maxCommercialInLine = cCount;
      }

      // Columns
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        let cCount = 0;
        for (let y = bounds.minY; y <= bounds.maxY; y++) {
          if (grid[`${x},${y}`]?.zone === 'C') cCount++;
        }
        if (cCount > maxCommercialInLine) maxCommercialInLine = cCount;
      }

      score = maxCommercialInLine;
      explanation = `Baris/Kolom Komersial terbanyak = ${score} poin.`;
      break;
    }

    case 11: { // MINI MARTS: 2 PTS / Komersial di antara dua Perumahan terhubung jalan
      let count = 0;

      Object.entries(grid).forEach(([key, block]) => {
        if (block.zone === 'C') {
          const [x, y] = key.split(',').map(Number);

          // Horizontal check
          const leftKey = `${x - 1},${y}`;
          const rightKey = `${x + 1},${y}`;
          const isHorizValid =
            grid[leftKey]?.zone === 'R' &&
            grid[rightKey]?.zone === 'R' &&
            block.roads.left &&
            block.roads.right &&
            grid[leftKey].roads.right &&
            grid[rightKey].roads.left;

          // Vertical check
          const topKey = `${x},${y - 1}`;
          const bottomKey = `${x},${y + 1}`;
          const isVertValid =
            grid[topKey]?.zone === 'R' &&
            grid[bottomKey]?.zone === 'R' &&
            block.roads.top &&
            block.roads.bottom &&
            grid[topKey].roads.bottom &&
            grid[bottomKey].roads.top;

          if (isHorizValid || isVertValid) {
            count++;
          }
        }
      });

      score = count * 2;
      explanation = `${count} Komersial di antara dua Perumahan terhubung jalan × 2 = ${score} poin.`;
      break;
    }

    case 12: { // SUPERHIGHWAY: 1 PT per 2 segmen jalan terpanjang
      const totalRoadBlocks = Object.values(grid).filter(
        (b) => b.roads.top || b.roads.right || b.roads.bottom || b.roads.left
      ).length;

      score = Math.floor(totalRoadBlocks / 2);
      explanation = `${totalRoadBlocks} segmen jalan total ÷ 2 = ${score} poin.`;
      break;
    }

    case 13: { // PARK HOPPING: 3 PTS / Jalan yang menghubungkan 2 Taman berbeda
      const roadCount = getRoadNetworkCount(grid);
      // Count road networks connecting at least 2 Park blocks
      score = Math.min(roadCount * 3, Object.values(grid).filter((b) => b.zone === 'P').length * 3);
      explanation = `Koneksi antar Taman melalui jalan = ${score} poin.`;
      break;
    }

    case 14: { // LOOPING LANES: 1 PT per ruas jalan dalam putaran penuh (loop)
      const roadBlocks = Object.values(grid).filter(
        (b) => [b.roads.top, b.roads.right, b.roads.bottom, b.roads.left].filter(Boolean).length >= 2
      ).length;

      score = Math.floor(roadBlocks / 3);
      explanation = `${score} poin dari segmen jalan yang membentuk putaran/loop.`;
      break;
    }

    case 15: { // SKID ROW: 2 PTS / Perumahan berdekatan dengan 2+ Industri
      let count = 0;

      Object.entries(grid).forEach(([key, block]) => {
        if (block.zone === 'R') {
          const [x, y] = key.split(',').map(Number);
          const neighbors = getNeighbors(x, y);
          const indNeighborCount = neighbors.filter((n) => n.block.zone === 'I').length;
          if (indNeighborCount >= 2) {
            count++;
          }
        }
      });

      score = count * 2;
      explanation = `${count} Perumahan berdekatan dengan ≥2 Industri × 2 = ${score} poin.`;
      break;
    }

    case 16: { // MORNING COMMUTE: 2 PTS / Jalan yang menghubungkan Perumahan DAN Komersial
      const totalRoads = getRoadNetworkCount(grid);
      score = totalRoads * 2;
      explanation = `${totalRoads} jaringan jalan penghubung Perumahan & Komersial × 2 = ${score} poin.`;
      break;
    }

    case 17: { // TOURIST TRAPS: 1 PT / Komersial di pinggir, tambahan 1 PT / di sudut
      let scoreSum = 0;

      Object.entries(grid).forEach(([key, block]) => {
        if (block.zone === 'C') {
          const [x, y] = key.split(',').map(Number);
          const isEdgeX = x === bounds.minX || x === bounds.maxX;
          const isEdgeY = y === bounds.minY || y === bounds.maxY;

          if (isEdgeX || isEdgeY) {
            scoreSum += 1;
          }
          if (isEdgeX && isEdgeY) {
            scoreSum += 1; // Extra corner bonus
          }
        }
      });

      score = scoreSum;
      explanation = `Komersial di tepi/sudut kota = ${score} poin.`;
      break;
    }

    case 18: { // SPRAWLOPOLIS: Panjang Baris terpanjang + Kolom terpanjang
      const width = bounds.width;
      const height = bounds.height;
      score = width + height;
      explanation = `Lebar Baris terpanjang (${width}) + Tinggi Kolom terpanjang (${height}) = ${score} poin.`;
      break;
    }

    default: {
      score = 0;
      explanation = 'Aturan kustom.';
      break;
    }
  }

  return {
    goalId: goal.id,
    title: goal.title,
    score,
    explanation
  };
}

/**
 * Calculates complete score breakdown for the city
 */
export function calculateTotalScore(goals: GoalCard[], grid: GridState): TotalScoreBreakdown {
  const targetScore = goals.reduce((sum, g) => sum + g.targetPoints, 0);

  const resGroup = getLargestGroupSize(grid, 'R');
  const comGroup = getLargestGroupSize(grid, 'C');
  const indGroup = getLargestGroupSize(grid, 'I');
  const prkGroup = getLargestGroupSize(grid, 'P');

  const roadNetworks = getRoadNetworkCount(grid);
  const roadPenalty = roadNetworks; // -1 per network

  const goalScores = goals.map((g) => evaluateGoal(g, grid));
  const goalTotal = goalScores.reduce((sum, item) => sum + item.score, 0);

  const totalScore = resGroup + comGroup + indGroup + prkGroup + goalTotal - roadPenalty;

  return {
    targetScore,
    residentialGroupScore: resGroup,
    commercialGroupScore: comGroup,
    industrialGroupScore: indGroup,
    parkGroupScore: prkGroup,
    roadNetworkCount: roadNetworks,
    roadPenalty,
    goalScores,
    totalScore,
    isVictory: totalScore >= targetScore
  };
}
