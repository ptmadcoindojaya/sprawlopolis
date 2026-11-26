import React, { useMemo, useEffect, useRef } from 'react';
import { GridState, RoadEdges } from '../types';
import { getLiveTrafficProfile } from '../utils/dayNightCycle';

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
  baseSpeed: number; // cruising speed (units per second in 100-unit cell space)
  initialDirection: 1 | -1;
  priorityRank: number; // lower rank stays active first during quiet / midnight phases
  seed: number;
}

interface CarSimState {
  status: 'driving' | 'waiting';
  dist: number;
  direction: 1 | -1;
  waitRemaining: number;
  opacity: number;
  retiring: boolean;
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
  const clampedDist = Math.max(0, Math.min(path.totalLen, dist));
  const targetDist = reverse ? path.totalLen - clampedDist : clampedDist;
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

  // Sort longest roads first so quiet/night phases prioritize main arteries
  paths.sort((a, b) => b.totalLen - a.totalLen);
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

  // Build connected road polylines & lightweight free-flowing car pool deterministically
  const { paths, cars } = useMemo(() => {
    const builtPaths = buildRoadPaths(grid, minX, minY, cellW, cellH);
    const builtCars: CarAgent[] = [];
    // Lightweight peak cap (10 cars on board during Pagi/Sore rush, 2 on compact previews) for silky-smooth FPS
    const maxTotalCars = compact ? 2 : 10;

    const maxSlotsPerPath = builtPaths.map((p) => {
      if (p.totalLen < 35) return 0;
      if (compact) return 1;
      if (p.totalLen >= 220) return 2;
      return 1;
    });

    const highestSlotCount = Math.max(0, ...maxSlotsPerPath);
    let rank = 0;

    for (let slotIdx = 0; slotIdx < highestSlotCount; slotIdx++) {
      for (let pathIndex = 0; pathIndex < builtPaths.length; pathIndex++) {
        if (builtCars.length >= maxTotalCars) break;
        if (slotIdx >= maxSlotsPerPath[pathIndex]) continue;

        const p = builtPaths[pathIndex];
        const ch = hashString(`${p.id}-slot-${slotIdx}`);
        const palette = CAR_PALETTE[(ch + pathIndex + slotIdx) % CAR_PALETTE.length];

        // Gentle varied cruising speeds (48..76) so traffic feels organic & free-flowing
        const baseSpeed = compact ? 52 + (ch % 14) : 48 + (ch % 8) * 4;

        // Alternate lane directions across slots so two-way roads look lively
        const dirBit = (hashString(p.id) >>> 1) & 1;
        const primaryDir: 1 | -1 = dirBit === 0 ? 1 : -1;
        const initialDirection: 1 | -1 =
          slotIdx % 2 === 1 ? (primaryDir === 1 ? -1 : 1) : primaryDir;

        builtCars.push({
          id: `${p.id}-car-${slotIdx}`,
          pathIndex,
          color: palette.body,
          roofColor: palette.roof,
          baseSpeed,
          initialDirection,
          priorityRank: rank++,
          seed: ch
        });
      }
      if (builtCars.length >= maxTotalCars) break;
    }

    return { paths: builtPaths, cars: builtCars };
  }, [grid, minX, minY, compact, cellW, cellH]);

  const carRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (cars.length === 0) return;

    let rafId = 0;
    let isDisposed = false;
    // Right-hand lane lateral offset beside the cream centerline
    const laneOffset = compact ? 4.2 : 5.2;

    const initialProfile = compact
      ? { densityFactor: 1, maxActiveCap: null, spawnWaitMinSec: 0.45, spawnWaitMaxSec: 0.9, isRushHour: false }
      : getLiveTrafficProfile();

    const initialTargetCount = compact
      ? cars.length
      : Math.max(
          1,
          Math.min(
            initialProfile.maxActiveCap ?? cars.length,
            Math.round(cars.length * initialProfile.densityFactor)
          )
        );

    // Initialize free-flowing cars evenly spread across their paths (zero inter-car collision/queue state)
    const simStates: CarSimState[] = cars.map((car, idx) => {
      const path = paths[car.pathIndex];
      const startActive = idx < initialTargetCount;
      const startFrac = ((idx * 0.37 + (car.seed % 31) * 0.013) % 0.82) + 0.08;
      const startDist = startActive && path ? startFrac * path.totalLen : 0;

      return {
        status: startActive ? 'driving' : 'waiting',
        dist: startDist,
        direction: car.initialDirection,
        waitRemaining: startActive
          ? 0
          : initialProfile.spawnWaitMinSec +
            (car.seed % 100) * 0.01 * (initialProfile.spawnWaitMaxSec - initialProfile.spawnWaitMinSec),
        opacity: startActive ? 1 : 0,
        retiring: false
      };
    });

    // Resolve DOM refs once into a flat array (avoids Map.get() lookups inside rAF)
    const carEls: Array<HTMLDivElement | null> = cars.map(
      (car) => carRefsMap.current.get(car.id) ?? null
    );
    const lastHidden = new Uint8Array(cars.length);

    let lastNow = performance.now();

    const tick = (now: number) => {
      if (isDisposed) return;

      const rawDt = (now - lastNow) * 0.001;
      lastNow = now;
      const dt = Math.min(0.05, Math.max(0.001, rawDt));

      // Read live time-of-day traffic density (zero React setState)
      const profile = compact
        ? { densityFactor: 1, maxActiveCap: null, spawnWaitMinSec: 0.45, spawnWaitMaxSec: 0.9, isRushHour: false }
        : getLiveTrafficProfile();

      const rawTarget = Math.round(cars.length * profile.densityFactor);
      const desiredActiveCount = compact
        ? cars.length
        : Math.max(
            1,
            Math.min(
              cars.length,
              profile.maxActiveCap !== null ? Math.min(rawTarget, profile.maxActiveCap) : rawTarget
            )
          );

      let activeDrivingCount = 0;
      for (let i = 0; i < simStates.length; i++) {
        if (simStates[i].status === 'driving' && !simStates[i].retiring) {
          activeDrivingCount++;
        }
      }

      // Gracefully fade out excess closed-loop cars when transitioning to quieter Night/Midnight
      if (!compact && activeDrivingCount > desiredActiveCount) {
        for (let i = cars.length - 1; i >= 0 && activeDrivingCount > desiredActiveCount; i--) {
          const st = simStates[i];
          const path = paths[cars[i].pathIndex];
          if (st.status === 'driving' && !st.retiring && path?.isLoop) {
            st.retiring = true;
            activeDrivingCount--;
          }
        }
      }

      // Single O(N) free-flow pass: advance each car independently & update its DOM transform directly
      for (let i = 0; i < cars.length; i++) {
        const car = cars[i];
        const st = simStates[i];
        const path = paths[car.pathIndex];
        const el = carEls[i];
        if (!path || path.totalLen <= 0 || !el) continue;

        if (st.status === 'waiting') {
          if (lastHidden[i] !== 1) {
            el.style.opacity = '0';
            lastHidden[i] = 1;
          }

          if (activeDrivingCount < desiredActiveCount) {
            st.waitRemaining -= dt;
            if (st.waitRemaining <= 0) {
              st.status = 'driving';
              st.direction = path.isLoop
                ? car.initialDirection
                : Math.random() < 0.55
                ? car.initialDirection
                : car.initialDirection === 1
                ? -1
                : 1;
              st.dist = 0;
              st.retiring = false;
              st.opacity = 0.02;
              activeDrivingCount++;
            }
          }
          continue;
        }

        // Advance smoothly at constant cruising speed (cars pass/overtake freely without blocking)
        st.dist += car.baseSpeed * dt;

        if (st.retiring) {
          st.opacity = Math.max(0, st.opacity - dt * 0.72);
          if (st.opacity <= 0.01) {
            st.status = 'waiting';
            st.retiring = false;
            st.waitRemaining =
              profile.spawnWaitMinSec +
              Math.random() * (profile.spawnWaitMaxSec - profile.spawnWaitMinSec);
            if (lastHidden[i] !== 1) {
              el.style.opacity = '0';
              lastHidden[i] = 1;
            }
            continue;
          }
        }

        if (path.isLoop) {
          if (st.dist >= path.totalLen) {
            st.dist -= path.totalLen;
          }
          if (!st.retiring && st.opacity < 1) {
            st.opacity = Math.min(1, st.opacity + dt * 1.4);
          }
        } else {
          if (st.dist >= path.totalLen) {
            st.status = 'waiting';
            st.dist = 0;
            st.opacity = 0;
            st.retiring = false;
            st.waitRemaining =
              profile.spawnWaitMinSec +
              Math.random() * (profile.spawnWaitMaxSec - profile.spawnWaitMinSec);
            if (lastHidden[i] !== 1) {
              el.style.opacity = '0';
              lastHidden[i] = 1;
            }
            continue;
          }

          const fadeDist = Math.min(18, path.totalLen * 0.14);
          let edgeAlpha = 1;
          if (st.dist < fadeDist) {
            edgeAlpha = st.dist / Math.max(1, fadeDist);
          } else if (st.dist > path.totalLen - fadeDist) {
            edgeAlpha = (path.totalLen - st.dist) / Math.max(1, fadeDist);
          }
          st.opacity = st.retiring
            ? Math.min(st.opacity, Math.max(0, edgeAlpha))
            : Math.max(0, Math.min(1, edgeAlpha));
        }

        const sample = samplePolyline(path, st.dist, st.direction === -1);
        const worldX = sample.x - Math.sin(sample.angleRad) * laneOffset;
        const worldY = sample.y + Math.cos(sample.angleRad) * laneOffset;

        lastHidden[i] = 0;
        const deg = (sample.angleRad * 180) / Math.PI;
        const leftPct = (worldX / totalW) * 100;
        const topPct = (worldY / totalH) * 100;

        el.style.left = `${leftPct.toFixed(2)}%`;
        el.style.top = `${topPct.toFixed(2)}%`;
        el.style.transform = `translate(-50%, -50%) rotate(${deg.toFixed(1)}deg)`;
        el.style.opacity = st.opacity.toFixed(2);
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
          {/* Outer Wide Conical Headlight Beam Illuminating Dark Night Road */}
          <div
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              right: compact ? '-17px' : '-35px',
              width: compact ? '18px' : '36px',
              height: compact ? '12px' : '23px',
              opacity: 'var(--car-headlight-opacity, 0)',
              clipPath: 'polygon(0% 34%, 100% 0%, 100% 100%, 0% 66%)',
              background:
                'linear-gradient(90deg, rgba(255,250,204,0.82) 0%, rgba(255,236,148,0.44) 44%, rgba(255,220,112,0.14) 76%, rgba(255,214,100,0) 100%)'
            }}
          />

          {/* Crisp Bright Inner Conical Headlight Core Beam */}
          <div
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              right: compact ? '-11px' : '-22px',
              width: compact ? '12px' : '23px',
              height: compact ? '7px' : '13px',
              opacity: 'var(--car-headlight-opacity, 0)',
              clipPath: 'polygon(0% 22%, 100% 6%, 100% 94%, 0% 78%)',
              background:
                'linear-gradient(90deg, rgba(255,254,230,0.98) 0%, rgba(255,244,178,0.62) 52%, rgba(255,232,140,0) 100%)'
            }}
          />

          {/* Radiant Warm Headlight Source Halo at Night */}
          <div
            className="absolute top-1/2 -translate-y-1/2 rounded-full pointer-events-none"
            style={{
              right: compact ? '-4px' : '-6px',
              width: compact ? '7px' : '12px',
              height: compact ? '8px' : '14px',
              opacity: 'var(--car-headlight-opacity, 0)',
              background:
                'radial-gradient(circle, rgba(255,252,218,0.98) 0%, rgba(255,236,146,0.45) 52%, rgba(255,226,120,0) 85%)'
            }}
          />

          {/* Vivid Glowing Red Taillight Aura at Night */}
          <div
            className="absolute top-1/2 -translate-y-1/2 rounded-full pointer-events-none"
            style={{
              left: compact ? '-5px' : '-8px',
              width: compact ? '7px' : '12px',
              height: compact ? '8px' : '14px',
              opacity: 'var(--car-headlight-opacity, 0)',
              background:
                'radial-gradient(circle, rgba(255,74,74,0.9) 0%, rgba(240,48,58,0.42) 50%, rgba(235,44,54,0) 85%)'
            }}
          />

          {/* 2.5D Pastel Car Chassis */}
          <div
            className="relative w-full h-full rounded-[3px] border border-[#2d343d]/85"
            style={{
              backgroundColor: car.color,
              boxShadow: '0 2px 3px rgba(10, 14, 28, 0.42)'
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
                backgroundColor: car.roofColor
              }}
            />

            {/* Front Headlights */}
            <div
              className="absolute rounded-[1px]"
              style={{ right: '-0.5px', top: '14%', width: '2px', height: '22%', backgroundColor: '#f5efe0' }}
            />
            <div
              className="absolute rounded-[1px]"
              style={{ right: '-0.5px', bottom: '14%', width: '2px', height: '22%', backgroundColor: '#f5efe0' }}
            />
            {/* Luminous Headlight Lenses at Sunset/Night */}
            <div
              className="absolute rounded-[1px]"
              style={{
                right: '-0.8px',
                top: '13%',
                width: '2.5px',
                height: '24%',
                backgroundColor: '#fffde6',
                opacity: 'var(--car-headlight-opacity, 0)'
              }}
            />
            <div
              className="absolute rounded-[1px]"
              style={{
                right: '-0.8px',
                bottom: '13%',
                width: '2.5px',
                height: '24%',
                backgroundColor: '#fffde6',
                opacity: 'var(--car-headlight-opacity, 0)'
              }}
            />

            {/* Rear Taillights */}
            <div
              className="absolute rounded-[1px]"
              style={{ left: '-0.5px', top: '16%', width: '1.6px', height: '21%', backgroundColor: '#d96b6b' }}
            />
            <div
              className="absolute rounded-[1px]"
              style={{ left: '-0.5px', bottom: '16%', width: '1.6px', height: '21%', backgroundColor: '#d96b6b' }}
            />
            {/* Vivid Glowing Red Taillight Lenses at Night */}
            <div
              className="absolute rounded-[1px]"
              style={{
                left: '-0.8px',
                top: '15%',
                width: '2px',
                height: '23%',
                backgroundColor: '#ff5252',
                opacity: 'var(--car-headlight-opacity, 0)'
              }}
            />
            <div
              className="absolute rounded-[1px]"
              style={{
                left: '-0.8px',
                bottom: '15%',
                width: '2px',
                height: '23%',
                backgroundColor: '#ff5252',
                opacity: 'var(--car-headlight-opacity, 0)'
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

