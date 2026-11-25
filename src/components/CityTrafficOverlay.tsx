import React, { useMemo, useEffect, useRef } from 'react';
import { GridState, RoadEdges } from '../types';

type EdgeDir = 'top' | 'right' | 'bottom' | 'left';

interface Point {
  x: number;
  y: number;
}

interface SampledPath {
  id: string;
  points: Point[];
  cumLen: number[];
  totalLen: number;
  isLoop: boolean;
}

interface CarAgent {
  id: string;
  pathIndex: number;
  color: string;
  roofColor: string;
  speed: number; // units per second (in 100-unit cell space)
  direction: 1 | -1;
  cycleDuration: number; // travel time + short pause time
  travelDuration: number;
  phaseOffset: number;
}

interface CityTrafficOverlayProps {
  grid: GridState;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  compact?: boolean; // true for smaller 2x2 card previews
  cellAspectRatio?: number; // width / height ratio per cell (1 for square board, 4/3 for hand card)
  className?: string;
}

const OPPOSITE: Record<EdgeDir, EdgeDir> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right'
};

const DELTA: Record<EdgeDir, { dx: number; dy: number }> = {
  top: { dx: 0, dy: -1 },
  right: { dx: 1, dy: 0 },
  bottom: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 }
};

const CAR_PALETTE = [
  { body: '#f5d276', roof: '#fbe8b0' }, // Soft butter yellow
  { body: '#ee8672', roof: '#f7b4a6' }, // Cozy coral
  { body: '#7dc7b8', roof: '#b3e3d9' }, // Soft mint teal
  { body: '#89bbe8', roof: '#bddaf5' }, // Pastel sky blue
  { body: '#f2a972', roof: '#f9cca8' }, // Warm apricot
  { body: '#fbf5e6', roof: '#ffffff' }  // Warm cream white
];

function getActiveEdges(roads: RoadEdges): EdgeDir[] {
  const dirs: EdgeDir[] = [];
  if (roads.top) dirs.push('top');
  if (roads.right) dirs.push('right');
  if (roads.bottom) dirs.push('bottom');
  if (roads.left) dirs.push('left');
  return dirs;
}

function edgeMidpoint(ox: number, oy: number, cellW: number, cellH: number, dir: EdgeDir): Point {
  switch (dir) {
    case 'top':
      return { x: ox + cellW * 0.5, y: oy };
    case 'right':
      return { x: ox + cellW, y: oy + cellH * 0.5 };
    case 'bottom':
      return { x: ox + cellW * 0.5, y: oy + cellH };
    case 'left':
      return { x: ox, y: oy + cellH * 0.5 };
  }
}

/**
 * Generates smooth points traversing a single cell from entryDir -> exitDir,
 * using a quadratic Bezier corner curve on 90-degree turns so cars turn smoothly.
 */
function buildCellSegmentPoints(
  ox: number,
  oy: number,
  cellW: number,
  cellH: number,
  entryDir: EdgeDir,
  exitDir: EdgeDir
): Point[] {
  const pStart = edgeMidpoint(ox, oy, cellW, cellH, entryDir);
  const pEnd = edgeMidpoint(ox, oy, cellW, cellH, exitDir);
  const pCenter = { x: ox + cellW * 0.5, y: oy + cellH * 0.5 };

  if (OPPOSITE[entryDir] === exitDir) {
    return [pStart, pCenter, pEnd];
  }

  const steps = 10;
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const inv = 1 - t;
    const x = inv * inv * pStart.x + 2 * inv * t * pCenter.x + t * t * pEnd.x;
    const y = inv * inv * pStart.y + 2 * inv * t * pCenter.y + t * t * pEnd.y;
    pts.push({ x, y });
  }
  return pts;
}

function finalizePath(id: string, rawPoints: Point[], isLoop: boolean): SampledPath {
  const points: Point[] = [];
  for (const pt of rawPoints) {
    const prev = points[points.length - 1];
    if (!prev || Math.hypot(pt.x - prev.x, pt.y - prev.y) > 0.25) {
      points.push(pt);
    }
  }
  const cumLen: number[] = [0];
  let totalLen = 0;
  for (let i = 1; i < points.length; i++) {
    totalLen += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    cumLen.push(totalLen);
  }
  return { id, points, cumLen, totalLen, isLoop };
}

/**
 * Samples position and tangent angle along a polyline at distance `dist`
 */
function samplePolyline(
  path: SampledPath,
  dist: number,
  reverse: boolean
): { x: number; y: number; angleRad: number } {
  const targetDist = reverse ? Math.max(0, path.totalLen - dist) : Math.min(path.totalLen, dist);
  const { points, cumLen } = path;

  if (points.length < 2) {
    return { x: points[0]?.x || 0, y: points[0]?.y || 0, angleRad: 0 };
  }

  let segIdx = 0;
  for (let i = 1; i < cumLen.length; i++) {
    if (cumLen[i] >= targetDist) {
      segIdx = i - 1;
      break;
    }
    segIdx = cumLen.length - 2;
  }

  const d0 = cumLen[segIdx];
  const d1 = cumLen[segIdx + 1];
  const segLen = Math.max(0.0001, d1 - d0);
  const t = Math.min(1, Math.max(0, (targetDist - d0) / segLen));

  const a = points[segIdx];
  const b = points[segIdx + 1];
  const x = a.x + (b.x - a.x) * t;
  const y = a.y + (b.y - a.y) * t;

  const dx = reverse ? a.x - b.x : b.x - a.x;
  const dy = reverse ? a.y - b.y : b.y - a.y;
  const angleRad = Math.atan2(dy, dx);

  return { x, y, angleRad };
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Traces all continuous road chains (single blocks, connected multi-block roads, and full loops)
 */
function buildRoadPaths(
  grid: GridState,
  minX: number,
  minY: number,
  cellW: number,
  cellH: number
): SampledPath[] {
  const visitedCells = new Set<string>();
  const paths: SampledPath[] = [];

  const getNeighbor = (x: number, y: number, dir: EdgeDir) => {
    const nx = x + DELTA[dir].dx;
    const ny = y + DELTA[dir].dy;
    const nKey = `${nx},${ny}`;
    const nBlock = grid[nKey];
    if (!nBlock) return null;
    const opp = OPPOSITE[dir];
    if (!nBlock.roads[opp]) return null;
    return { key: nKey, x: nx, y: ny, entryFrom: opp, edges: getActiveEdges(nBlock.roads) };
  };

  const sortedKeys = Object.keys(grid).sort();

  // Pass 1: Start from open road endpoints
  for (const startKey of sortedKeys) {
    if (visitedCells.has(startKey)) continue;
    const block = grid[startKey];
    const edges = getActiveEdges(block.roads);
    if (edges.length === 0) continue;

    const [sx, sy] = startKey.split(',').map(Number);

    const openEdge = edges.find((e) => !getNeighbor(sx, sy, e));
    if (!openEdge) continue;

    if (edges.length === 1) {
      visitedCells.add(startKey);
      const ox = (sx - minX) * cellW;
      const oy = (sy - minY) * cellH;
      const pts = [
        edgeMidpoint(ox, oy, cellW, cellH, openEdge),
        { x: ox + cellW * 0.5, y: oy + cellH * 0.5 }
      ];
      paths.push(finalizePath(`road-${startKey}`, pts, false));
      continue;
    }

    const chainPoints: Point[] = [];
    let currKey = startKey;
    let cx = sx;
    let cy = sy;
    let entryDir: EdgeDir = openEdge;
    let guard = 0;

    while (guard++ < 120) {
      if (visitedCells.has(currKey)) break;
      visitedCells.add(currKey);

      const currBlock = grid[currKey];
      const currEdges = getActiveEdges(currBlock.roads);
      const exitDir = currEdges.find((e) => e !== entryDir) || OPPOSITE[entryDir];

      const ox = (cx - minX) * cellW;
      const oy = (cy - minY) * cellH;
      const segPts = buildCellSegmentPoints(ox, oy, cellW, cellH, entryDir, exitDir);
      chainPoints.push(...segPts);

      const next = getNeighbor(cx, cy, exitDir);
      if (!next || visitedCells.has(next.key)) {
        break;
      }
      currKey = next.key;
      cx = next.x;
      cy = next.y;
      entryDir = next.entryFrom;
    }

    if (chainPoints.length >= 2) {
      paths.push(finalizePath(`road-${startKey}`, chainPoints, false));
    }
  }

  // Pass 2: Remaining unvisited road cells form closed loops
  for (const startKey of sortedKeys) {
    if (visitedCells.has(startKey)) continue;
    const block = grid[startKey];
    const edges = getActiveEdges(block.roads);
    if (edges.length < 2) continue;

    const [sx, sy] = startKey.split(',').map(Number);
    const chainPoints: Point[] = [];
    let currKey = startKey;
    let cx = sx;
    let cy = sy;
    let entryDir: EdgeDir = edges[0];
    let guard = 0;
    let closedLoop = false;

    while (guard++ < 120) {
      if (visitedCells.has(currKey)) {
        if (currKey === startKey) closedLoop = true;
        break;
      }
      visitedCells.add(currKey);

      const currBlock = grid[currKey];
      const currEdges = getActiveEdges(currBlock.roads);
      const exitDir = currEdges.find((e) => e !== entryDir) || edges[1];

      const ox = (cx - minX) * cellW;
      const oy = (cy - minY) * cellH;
      const segPts = buildCellSegmentPoints(ox, oy, cellW, cellH, entryDir, exitDir);
      chainPoints.push(...segPts);

      const next = getNeighbor(cx, cy, exitDir);
      if (!next) break;
      if (next.key === startKey) {
        closedLoop = true;
        break;
      }
      if (visitedCells.has(next.key)) break;

      currKey = next.key;
      cx = next.x;
      cy = next.y;
      entryDir = next.entryFrom;
    }

    if (chainPoints.length >= 2) {
      paths.push(finalizePath(`loop-${startKey}`, chainPoints, closedLoop));
    }
  }

  return paths;
}

export const CityTrafficOverlay: React.FC<CityTrafficOverlayProps> = ({
  grid,
  minX,
  maxX,
  minY,
  maxY,
  compact = false,
  cellAspectRatio = 1,
  className = ''
}) => {
  const cols = maxX - minX + 1;
  const rows = maxY - minY + 1;
  const cellW = 100 * cellAspectRatio;
  const cellH = 100;
  const totalW = cols * cellW;
  const totalH = rows * cellH;

  // Build connected road polylines & car agents deterministically
  const { paths, cars } = useMemo(() => {
    const builtPaths = buildRoadPaths(grid, minX, minY, cellW, cellH);
    const builtCars: CarAgent[] = [];
    const maxTotalCars = compact ? 3 : 20;

    builtPaths.forEach((p, pathIndex) => {
      if (builtCars.length >= maxTotalCars) return;
      if (p.totalLen < 35) return;

      const h = hashString(p.id);
      const desiredCarsForPath = compact
        ? 1
        : p.totalLen >= 480
        ? 3
        : p.totalLen >= 220
        ? 2
        : 1;

      for (let c = 0; c < desiredCarsForPath; c++) {
        if (builtCars.length >= maxTotalCars) break;
        const ch = hashString(`${p.id}-${c}`);
        const palette = CAR_PALETTE[(ch + pathIndex) % CAR_PALETTE.length];
        // Clear, smooth cruising speed (100 units = 1 block)
        const speed = compact ? 52 + (ch % 16) : 66 + (ch % 20);
        const travelDuration = p.totalLen / speed;
        // Quick ~0.5s respawn pause on open roads; continuous on loops
        const pauseDuration = p.isLoop ? 0 : 0.45 + ((ch >>> 4) % 4) * 0.05;
        const cycleDuration = travelDuration + pauseDuration;
        // First car starts mid-road so motion is immediately visible when loaded
        const phaseOffset =
          c === 0
            ? ((h % 65) + 15) * 0.01 * travelDuration
            : ((c / desiredCarsForPath) + ((h % 20) * 0.01)) * cycleDuration;

        builtCars.push({
          id: `${p.id}-car-${c}`,
          pathIndex,
          color: palette.body,
          roofColor: palette.roof,
          speed,
          direction: c % 2 === 0 ? ((ch & 1) === 0 ? 1 : -1) : ((ch & 1) === 0 ? -1 : 1),
          cycleDuration,
          travelDuration,
          phaseOffset
        });
      }
    });

    return { paths: builtPaths, cars: builtCars };
  }, [grid, minX, minY, compact, cellW, cellH]);

  const carRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (cars.length === 0) return;

    let rafId = 0;
    let isDisposed = false;
    const laneOffset = compact ? 3.4 : 4.2;

    const tick = (now: number) => {
      if (isDisposed) return;

      const tSec = now * 0.001;

      for (let i = 0; i < cars.length; i++) {
        const car = cars[i];
        const el = carRefsMap.current.get(car.id);
        if (!el) continue;

        const path = paths[car.pathIndex];
        if (!path || path.totalLen <= 0) continue;

        const totalTime = tSec + car.phaseOffset;
        const tCycle = ((totalTime % car.cycleDuration) + car.cycleDuration) % car.cycleDuration;

        if (!path.isLoop && tCycle > car.travelDuration) {
          el.style.opacity = '0';
          continue;
        }

        const cycleCount = Math.floor(totalTime / car.cycleDuration);
        const isReverse = path.isLoop
          ? car.direction === -1
          : (cycleCount % 2 === 1 ? car.direction === 1 : car.direction === -1);

        const progress = path.isLoop
          ? (tCycle / car.travelDuration) % 1
          : Math.min(1, tCycle / car.travelDuration);

        const dist = progress * path.totalLen;
        const sample = samplePolyline(path, dist, isReverse);

        // Right-hand lane offset beside cream dashed centerline
        const lx = sample.x - Math.sin(sample.angleRad) * laneOffset;
        const ly = sample.y + Math.cos(sample.angleRad) * laneOffset;
        const deg = (sample.angleRad * 180) / Math.PI;

        const leftPct = (lx / totalW) * 100;
        const topPct = (ly / totalH) * 100;

        el.style.left = `${leftPct.toFixed(3)}%`;
        el.style.top = `${topPct.toFixed(3)}%`;
        el.style.transform = `translate(-50%, -50%) rotate(${deg.toFixed(1)}deg)`;

        if (path.isLoop) {
          el.style.opacity = '1';
        } else {
          const edgeFade = Math.min(0.11, 12 / Math.max(40, path.totalLen));
          let alpha = 1;
          if (progress < edgeFade) {
            alpha = progress / edgeFade;
          } else if (progress > 1 - edgeFade) {
            alpha = (1 - progress) / edgeFade;
          }
          el.style.opacity = Math.max(0, Math.min(1, alpha)).toFixed(2);
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      isDisposed = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [cars, paths, totalW, totalH, compact]);

  if (cars.length === 0) return null;

  const carWidthPx = compact ? 11 : 16;
  const carHeightPx = compact ? 6.5 : 9.5;

  return (
    <div
      className={`absolute inset-0 w-full h-full pointer-events-none overflow-visible ${className}`}
      aria-hidden="true"
    >
      {cars.map((car) => (
        <div
          key={car.id}
          ref={(el) => {
            if (el) {
              carRefsMap.current.set(car.id, el);
            } else {
              carRefsMap.current.delete(car.id);
            }
          }}
          className="absolute pointer-events-none will-change-transform opacity-0"
          style={{
            width: `${carWidthPx}px`,
            height: `${carHeightPx}px`
          }}
        >
          {/* Warm Subtle Headlight Glow Cone */}
          <div
            className="absolute top-1/2 -translate-y-1/2 rounded-r-full pointer-events-none"
            style={{
              right: compact ? '-4px' : '-6px',
              width: compact ? '5px' : '7px',
              height: compact ? '7px' : '10px',
              background: 'radial-gradient(ellipse at left, rgba(255,244,196,0.65) 0%, rgba(255,244,196,0) 85%)'
            }}
          />

          {/* 2.5D Pastel Car Chassis */}
          <div
            className="relative w-full h-full rounded-[3px] border border-[#3f474f]/80"
            style={{
              backgroundColor: car.color,
              boxShadow: '0 2px 3px rgba(30, 36, 43, 0.36), inset 0 1px 0 rgba(255,255,255,0.45)'
            }}
          >
            {/* Front & Rear Tinted Windshields */}
            <div
              className="absolute top-[15%] bottom-[15%] rounded-[1px]"
              style={{ right: '18%', width: '18%', backgroundColor: '#3a4550' }}
            />
            <div
              className="absolute top-[18%] bottom-[18%] rounded-[1px]"
              style={{ left: '16%', width: '13%', backgroundColor: '#3a4550', opacity: 0.85 }}
            />

            {/* Raised Sunlit 2.5D Roof Cabin */}
            <div
              className="absolute top-[14%] bottom-[14%] rounded-[2px]"
              style={{
                left: '28%',
                right: '34%',
                backgroundColor: car.roofColor,
                boxShadow: '0 1px 1px rgba(41,37,36,0.18)'
              }}
            />

            {/* Front Headlights */}
            <div
              className="absolute rounded-[1px]"
              style={{ right: '-0.5px', top: '14%', width: '2px', height: '22%', backgroundColor: '#fff9db' }}
            />
            <div
              className="absolute rounded-[1px]"
              style={{ right: '-0.5px', bottom: '14%', width: '2px', height: '22%', backgroundColor: '#fff9db' }}
            />

            {/* Rear Taillights */}
            <div
              className="absolute rounded-[1px]"
              style={{ left: '-0.5px', top: '16%', width: '1.5px', height: '20%', backgroundColor: '#d96b6b' }}
            />
            <div
              className="absolute rounded-[1px]"
              style={{ left: '-0.5px', bottom: '16%', width: '1.5px', height: '20%', backgroundColor: '#d96b6b' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
