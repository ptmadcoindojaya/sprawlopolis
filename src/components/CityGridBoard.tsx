import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GridState, CardInHand, GridPos, PlacedBlock } from '../types';
import { ZONE_NAMES } from '../data/cards';
import { getOrientedBlocks } from '../utils/cardUtils';
import { BlockDioramaArt } from './BlockDioramaArt';
import { CityTrafficOverlay } from './CityTrafficOverlay';
import { EmptyCellTerrain } from './EmptyCellTerrain';
import { RemoteHoverAim } from '../utils/multiplayerSync';
import { Check, X, RotateCcw, RotateCw, Compass, Box, Map as MapIcon, Crosshair, Route } from 'lucide-react';

const EMPTY_STRING_SET: ReadonlySet<string> = new Set();
const EMPTY_OPACITY_MAP: ReadonlyMap<string, number> = new Map();
type EmptyCellTier = 'near' | 'outer' | 'far';

const DEFAULT_CAMERA_YAW = -35;
const DEFAULT_CAMERA_TILT = 44;
const MIN_CAMERA_TILT = 0;
const MAX_CAMERA_TILT = 56;
const MIN_CAMERA_ZOOM = 0.45;
const MAX_CAMERA_ZOOM = 2.2;
const MOUSE_DRAG_THRESHOLD = 5;
const TOUCH_DRAG_THRESHOLD = 6;
const BASE_BLOCK_HEIGHT = 16;
const LAYER_STEP_HEIGHT = 7;
const MAX_VISUAL_LAYER = 5;
const PLINTH_THICKNESS = 24;
const PLINTH_PAD = 10;
const DIORAMA_PERSPECTIVE = 1350;
const CELL_SIZE = 74; // pixels per 1x1 block

const ZONE_BLOCK_WALLS: Record<
  string,
  { south: string; east: string; north: string; west: string; rim: string }
> = {
  R: {
    south: '#c98866',
    east: '#a96c4c',
    north: '#dfa686',
    west: '#bd7c5a',
    rim: '#f6d8c4'
  },
  C: {
    south: '#6f96b3',
    east: '#547894',
    north: '#8eb2cc',
    west: '#6287a4',
    rim: '#d6e9f7'
  },
  I: {
    south: '#a59882',
    east: '#877a66',
    north: '#bfb39d',
    west: '#968973',
    rim: '#e7dfd1'
  },
  P: {
    south: '#739a6d',
    east: '#597c54',
    north: '#8eb588',
    west: '#668b60',
    rim: '#d4ebd0'
  }
};

function getBlockExtrusionHeight(layer: number): number {
  return BASE_BLOCK_HEIGHT + Math.min(Math.max(0, layer), MAX_VISUAL_LAYER) * LAYER_STEP_HEIGHT;
}

export interface DioramaCameraEventDetail {
  yaw: number;
  tilt: number;
  isTopDown: boolean;
}

function normalizeDeg360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function closestAngleTarget(current: number, targetMod360: number): number {
  const currNorm = normalizeDeg360(current);
  let delta = normalizeDeg360(targetMod360) - currNorm;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return current + delta;
}

interface PlacementBurst {
  id: number;
  x: number;
  y: number;
  z: number;
  keys: Set<string>;
}

const MICRO_BOUNCE_SPARKS: Array<{
  leftPct: number;
  topPct: number;
  dx: number;
  dy: number;
  size: number;
  delayMs: number;
  color: string;
}> = [
  { leftPct: 12, topPct: 2, dx: -16, dy: -22, size: 5.5, delayMs: 10, color: '#efe4cf' },
  { leftPct: 62, topPct: 0, dx: 8, dy: -26, size: 4.5, delayMs: 30, color: '#d8c5a5' },
  { leftPct: 99, topPct: 14, dx: 24, dy: -14, size: 5.5, delayMs: 15, color: '#fff8ea' },
  { leftPct: 100, topPct: 72, dx: 25, dy: 12, size: 5, delayMs: 35, color: '#e5d4b7' },
  { leftPct: 86, topPct: 99, dx: 15, dy: 24, size: 5.5, delayMs: 20, color: '#efe4cf' },
  { leftPct: 36, topPct: 100, dx: -10, dy: 25, size: 4.5, delayMs: 40, color: '#d8c5a5' },
  { leftPct: 1, topPct: 84, dx: -24, dy: 14, size: 5.5, delayMs: 15, color: '#fff8ea' },
  { leftPct: 0, topPct: 30, dx: -23, dy: -12, size: 5, delayMs: 30, color: '#e5d4b7' }
];

const SOIL_STRATA_PALETTES = [
  // 0: Warm rich loam & sandstone band
  { strata: '#a89478', soil: '#7c593e', deep: '#553c2a' },
  // 1: Concrete / limestone pebble strata
  { strata: '#9a9387', soil: '#746453', deep: '#4f463e' },
  // 2: Terracotta clay & dark earth
  { strata: '#b58d6e', soil: '#85583c', deep: '#5b3b29' }
];

/**
 * Subtle buried subterranean fossil (mini dino skull / rib / ammonite) embedded in soil strata walls.
 */
const BuriedFossilSvg: React.FC<{ variant: 0 | 1 | 2; className?: string }> = ({
  variant,
  className = ''
}) => (
  <svg
    viewBox="0 0 24 12"
    className={`pointer-events-none select-none ${className}`}
    aria-hidden="true"
  >
    {variant === 0 ? (
      /* Mini Dino Skull Silhouette */
      <g fill="#efe4cc" opacity="0.62">
        <path d="M4,6.5 C4,3.4 7,1.8 11.5,2.2 L18.5,3.2 C20.2,3.5 21,4.8 20.5,6.2 L16.2,6.8 L15.4,8.6 L11,8.2 L9.5,9.6 L5.5,9.2 Z" />
        <circle cx="9.2" cy="4.8" r="1.45" fill="#4f3828" opacity="0.88" />
        <circle cx="15.2" cy="4.9" r="0.85" fill="#4f3828" opacity="0.82" />
        <path d="M12.2,7.2 L12.9,8.4 M14.2,7.0 L14.8,8.2 M16.3,6.7 L16.8,7.8" stroke="#efe4cc" strokeWidth="0.9" strokeLinecap="round" />
      </g>
    ) : variant === 1 ? (
      /* Small Buried Bone & Rib Fragments */
      <g fill="#efe4cc" opacity="0.56">
        <rect x="6" y="4.8" width="12" height="2.4" rx="1.1" />
        <circle cx="5.8" cy="4.6" r="1.6" />
        <circle cx="5.8" cy="7.4" r="1.6" />
        <circle cx="18.2" cy="4.6" r="1.6" />
        <circle cx="18.2" cy="7.4" r="1.6" />
      </g>
    ) : (
      /* Spiral Ammonite / Ancient Shell Fossil */
      <g fill="none" stroke="#efe4cc" strokeWidth="1.25" strokeLinecap="round" opacity="0.56">
        <path d="M12,6.2 m-0.6,0 a1.4,1.4 0 1,1 2.2,1.1 a2.8,2.6 0 1,1 -4.4,-1.8 a4.2,3.8 0 1,1 7.2,2.1" />
        <circle cx="5.5" cy="8.2" r="0.9" fill="#efe4cc" stroke="none" opacity="0.65" />
        <circle cx="19.2" cy="4.6" r="0.75" fill="#efe4cc" stroke="none" opacity="0.6" />
      </g>
    )}
  </svg>
);

const DUST_PUFFS: Array<{
  leftPct: number;
  topPct: number;
  dx: number;
  dy: number;
  size: number;
  delayMs: number;
  color: string;
}> = [
  // Top edge puffs
  { leftPct: 18, topPct: 1, dx: -10, dy: -18, size: 17, delayMs: 0, color: '#fffdf9' },
  { leftPct: 48, topPct: 0, dx: 2, dy: -22, size: 20, delayMs: 25, color: '#f7f0e2' },
  { leftPct: 80, topPct: 2, dx: 11, dy: -17, size: 16, delayMs: 15, color: '#fffdf9' },
  // Right edge puffs
  { leftPct: 99, topPct: 22, dx: 19, dy: -9, size: 18, delayMs: 10, color: '#f4ebda' },
  { leftPct: 100, topPct: 54, dx: 22, dy: 3, size: 19, delayMs: 30, color: '#fffdf9' },
  { leftPct: 98, topPct: 84, dx: 16, dy: 12, size: 15, delayMs: 20, color: '#efe4cf' },
  // Bottom edge puffs
  { leftPct: 78, topPct: 99, dx: 9, dy: 19, size: 18, delayMs: 5, color: '#f7f0e2' },
  { leftPct: 50, topPct: 100, dx: -3, dy: 22, size: 21, delayMs: 25, color: '#fffdf9' },
  { leftPct: 20, topPct: 98, dx: -12, dy: 17, size: 16, delayMs: 15, color: '#f4ebda' },
  // Left edge puffs
  { leftPct: 1, topPct: 78, dx: -19, dy: 10, size: 17, delayMs: 20, color: '#fffdf9' },
  { leftPct: 0, topPct: 48, dx: -22, dy: -2, size: 20, delayMs: 10, color: '#f7f0e2' },
  { leftPct: 2, topPct: 18, dx: -16, dy: -12, size: 15, delayMs: 35, color: '#efe4cf' },
  // Corner micro wisps
  { leftPct: 96, topPct: 6, dx: 18, dy: -16, size: 13, delayMs: 40, color: '#fffdf9' },
  { leftPct: 4, topPct: 95, dx: -17, dy: 16, size: 13, delayMs: 40, color: '#fffdf9' }
];

interface CityGridBoardProps {
  grid: GridState;
  selectedCard: CardInHand | null;
  onPlaceCard: (pos: GridPos, rotation: 0 | 180) => void;
  onRotateSelectedCard: () => void;
  isMyTurn?: boolean;
  remoteHoverAim?: RemoteHoverAim | null;
  onHoverAimChange?: (pos: GridPos | null, rotation: 0 | 180, cardId?: number) => void;
}

export const CityGridBoard: React.FC<CityGridBoardProps> = ({
  grid,
  selectedCard,
  onPlaceCard,
  onRotateSelectedCard,
  isMyTurn = true,
  remoteHoverAim = null,
  onHoverAimChange
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [yaw, setYaw] = useState<number>(DEFAULT_CAMERA_YAW);
  const [tilt, setTilt] = useState<number>(DEFAULT_CAMERA_TILT);
  const [isTopDown, setIsTopDown] = useState<boolean>(false);
  const [isRoadInspect, setIsRoadInspect] = useState<boolean>(false);
  const [interactionMode, setInteractionMode] = useState<'idle' | 'panning' | 'orbiting'>('idle');
  const [hoverPos, setHoverPos] = useState<GridPos | null>(null);
  const [placementBursts, setPlacementBursts] = useState<PlacementBurst[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const prevGridRef = useRef<GridState>(grid);
  const burstIdRef = useRef<number>(0);
  const burstTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Refs for smooth, conflict-free pointer & touch gesture state machine
  const savedDioramaRef = useRef<{ yaw: number; tilt: number }>({
    yaw: DEFAULT_CAMERA_YAW,
    tilt: DEFAULT_CAMERA_TILT
  });
  const panRef = useRef(pan);
  const yawRef = useRef(yaw);
  const tiltRef = useRef(tilt);
  const zoomRef = useRef(zoom);
  const isTopDownRef = useRef(isTopDown);
  panRef.current = pan;
  yawRef.current = yaw;
  tiltRef.current = tilt;
  zoomRef.current = zoom;
  isTopDownRef.current = isTopDown;

  const mouseGestureRef = useRef<{
    type: 'pan' | 'orbit';
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    startYaw: number;
    startTilt: number;
    moved: boolean;
  } | null>(null);
  const suppressNextClickRef = useRef<boolean>(false);
  const suppressNextContextRotateRef = useRef<boolean>(false);
  const lastInputWasTouchRef = useRef<boolean>(false);

  const touchStartRef = useRef<{
    mode: 'single' | 'pinch';
    startX: number;
    startY: number;
    dist: number;
    angle: number;
    midX: number;
    midY: number;
    startZoom: number;
    startPanX: number;
    startPanY: number;
    startYaw: number;
    moved: boolean;
    twistUnlocked: boolean;
  } | null>(null);

  // Broadcast local diorama camera state to HUD helpers (e.g. CardHand orientation compass)
  useEffect(() => {
    const detail: DioramaCameraEventDetail = { yaw, tilt, isTopDown };
    window.dispatchEvent(new CustomEvent<DioramaCameraEventDetail>('sprawlopolis:camera-change', { detail }));
  }, [yaw, tilt, isTopDown]);

  // Clear local hover when turn ends
  useEffect(() => {
    if (!isMyTurn) {
      setHoverPos(null);
    }
  }, [isMyTurn]);

  // Notify optional ephemeral PeerJS hover-aim callback when local aim changes during active turn
  useEffect(() => {
    if (!onHoverAimChange) return;
    if (isMyTurn && selectedCard && hoverPos) {
      onHoverAimChange(hoverPos, selectedCard.rotation, selectedCard.card.id);
    } else {
      onHoverAimChange(null, 0, undefined);
    }
  }, [onHoverAimChange, isMyTurn, selectedCard?.card.id, selectedCard?.rotation, hoverPos?.x, hoverPos?.y]);

  const rotateCameraBy = useCallback((deltaDeg: number) => {
    setYaw((prev) => {
      const next = prev + deltaDeg;
      if (!isTopDownRef.current) {
        savedDioramaRef.current.yaw = next;
      }
      return next;
    });
  }, []);

  const toggleTopDown = useCallback(() => {
    setIsTopDown((prevTopDown) => {
      if (!prevTopDown) {
        savedDioramaRef.current = {
          yaw: yawRef.current,
          tilt: Math.max(22, tiltRef.current)
        };
        setTilt(0);
        setYaw((curr) => closestAngleTarget(curr, 0));
        return true;
      } else {
        setTilt(savedDioramaRef.current.tilt || DEFAULT_CAMERA_TILT);
        setYaw((curr) => closestAngleTarget(curr, savedDioramaRef.current.yaw));
        return false;
      }
    });
  }, []);

  const resetCamera = useCallback(() => {
    savedDioramaRef.current = { yaw: DEFAULT_CAMERA_YAW, tilt: DEFAULT_CAMERA_TILT };
    setIsTopDown(false);
    setYaw((curr) => closestAngleTarget(curr, DEFAULT_CAMERA_YAW));
    setTilt(DEFAULT_CAMERA_TILT);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Keyboard shortcuts: Q/E rotate camera ±90°, T toggle top-down, R rotate card 180°, 0 reset camera
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === 'q') {
        e.preventDefault();
        rotateCameraBy(-90);
      } else if (key === 'e') {
        e.preventDefault();
        rotateCameraBy(90);
      } else if (key === 't') {
        e.preventDefault();
        toggleTopDown();
      } else if (key === 'v') {
        e.preventDefault();
        setIsRoadInspect((prev) => !prev);
      } else if (key === '0') {
        e.preventDefault();
        resetCamera();
      } else if (key === 'r' && isMyTurn && selectedCard) {
        e.preventDefault();
        onRotateSelectedCard();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rotateCameraBy, toggleTopDown, resetCamera, isMyTurn, selectedCard, onRotateSelectedCard]);

  // Detect newly landed 2x2 cards (local or remote PeerJS) to trigger dust puff & settle spring
  useEffect(() => {
    const prevGrid = prevGridRef.current;
    const prevKeys = Object.keys(prevGrid);
    const currKeys = Object.keys(grid);

    if (prevKeys.length >= 4 && currKeys.length >= prevKeys.length) {
      const changedKeys: string[] = [];
      for (const k of currKeys) {
        const currBlock = grid[k];
        const prevBlock = prevGrid[k];
        if (
          !prevBlock ||
          prevBlock.cardId !== currBlock.cardId ||
          prevBlock.layer !== currBlock.layer
        ) {
          changedKeys.push(k);
        }
      }

      if (changedKeys.length === 4) {
        const firstCardId = grid[changedKeys[0]].cardId;
        const allSameCard = changedKeys.every((k) => grid[k].cardId === firstCardId);
        if (allSameCard) {
          let minPx = Infinity;
          let minPy = Infinity;
          let maxBurstLayer = 0;
          changedKeys.forEach((k) => {
            const [cx, cy] = k.split(',').map(Number);
            if (cx < minPx) minPx = cx;
            if (cy < minPy) minPy = cy;
            const blkLayer = grid[k]?.layer || 0;
            if (blkLayer > maxBurstLayer) maxBurstLayer = blkLayer;
          });

          const id = ++burstIdRef.current;
          const newBurst: PlacementBurst = {
            id,
            x: minPx,
            y: minPy,
            z: getBlockExtrusionHeight(maxBurstLayer) + 1.4,
            keys: new Set(changedKeys)
          };

          setPlacementBursts((prev) => [...prev, newBurst]);
          const timer = setTimeout(() => {
            setPlacementBursts((prev) => prev.filter((b) => b.id !== id));
          }, 600);
          burstTimersRef.current.push(timer);
        }
      }
    }

    prevGridRef.current = grid;
  }, [grid]);

  useEffect(() => {
    return () => {
      burstTimersRef.current.forEach((t) => clearTimeout(t));
      burstTimersRef.current = [];
    };
  }, []);

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

  // Tight dynamic padding around existing city so floating diorama island grows cleanly with every card
  // (±2 covers 100% of valid adjacent 2x2 placements on all four edges)
  const renderMinX = minX - 2;
  const renderMaxX = maxX + 2;
  const renderMinY = minY - 2;
  const renderMaxY = maxY + 2;

  // Exact analytical 3D ray-plane intersection matching CSS perspective(1350px) * translate3d(pan) * scale(zoom) * rotateX(tilt) * rotateZ(yaw).
  // Eliminates browser preserve-3d DOM hit-test misses on far-Z rotated quadrants and edge cells.
  const pickPlacementPosFromClient = useCallback(
    (clientX: number, clientY: number): GridPos | null => {
      const container = containerRef.current;
      if (!container) return null;

      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;

      const sx = clientX - (rect.left + rect.width * 0.5);
      const sy = clientY - (rect.top + rect.height * 0.5);

      const currZoom = zoomRef.current;
      const currPan = panRef.current;
      const tiltRad = (tiltRef.current * Math.PI) / 180;
      const yawRad = (yawRef.current * Math.PI) / 180;
      const cosT = Math.cos(tiltRad);
      const sinT = Math.sin(tiltRad);
      const cosY = Math.cos(yawRad);
      const sinY = Math.sin(yawRad);

      const gridW = (renderMaxX - renderMinX + 1) * CELL_SIZE;
      const gridH = (renderMaxY - renderMinY + 1) * CELL_SIZE;

      const intersectPlane = (zPlane: number): GridPos | null => {
        const denom = DIORAMA_PERSPECTIVE * currZoom * cosT + sy * sinT;
        if (Math.abs(denom) < 1e-4) return null;

        const y1 =
          (sy * (DIORAMA_PERSPECTIVE - zPlane * cosT) +
            DIORAMA_PERSPECTIVE * currZoom * zPlane * sinT -
            DIORAMA_PERSPECTIVE * currPan.y) /
          denom;
        const z3 = y1 * sinT + zPlane * cosT;
        if (z3 >= DIORAMA_PERSPECTIVE - 20) return null;

        const x3 = (sx * (DIORAMA_PERSPECTIVE - z3)) / DIORAMA_PERSPECTIVE;
        const x1 = (x3 - currPan.x) / currZoom;

        const u = x1 * cosY + y1 * sinY;
        const v = -x1 * sinY + y1 * cosY;

        const gx = renderMinX + Math.floor((u + gridW * 0.5) / CELL_SIZE);
        const gy = renderMinY + Math.floor((v + gridH * 0.5) / CELL_SIZE);
        return { x: gx, y: gy };
      };

      // 1. Test raised extruded city block top faces from highest existing layer downward
      let maxLayerInGrid = -1;
      for (const k of Object.keys(grid)) {
        const l = grid[k].layer || 0;
        if (l > maxLayerInGrid) maxLayerInGrid = l;
      }

      let hitCell: GridPos | null = null;
      for (let layer = Math.min(maxLayerInGrid, MAX_VISUAL_LAYER); layer >= 0; layer--) {
        const candidate = intersectPlane(getBlockExtrusionHeight(layer));
        if (!candidate) continue;
        const blockAt = grid[`${candidate.x},${candidate.y}`];
        if (blockAt && Math.min(blockAt.layer || 0, MAX_VISUAL_LAYER) === layer) {
          hitCell = candidate;
          break;
        }
      }

      // 2. Fallback to baseplate grid plane (Z = 0) for empty socket cells
      if (!hitCell) {
        const baseCandidate = intersectPlane(0);
        if (
          baseCandidate &&
          baseCandidate.x >= renderMinX &&
          baseCandidate.x <= renderMaxX &&
          baseCandidate.y >= renderMinY &&
          baseCandidate.y <= renderMaxY
        ) {
          hitCell = baseCandidate;
        }
      }

      if (!hitCell) return null;

      // Clamp 2x2 top-left anchor inside [renderMin..renderMax - 1] so hovering outermost edge/corner cells
      // cleanly places the full 2x2 preview inside the diorama island from every camera rotation angle.
      return {
        x: Math.min(renderMaxX - 1, Math.max(renderMinX, hitCell.x)),
        y: Math.min(renderMaxY - 1, Math.max(renderMinY, hitCell.y))
      };
    },
    [grid, renderMinX, renderMaxX, renderMinY, renderMaxY]
  );

  const handleViewportMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (interactionMode !== 'idle' || !isMyTurn || !selectedCard) return;
      const picked = pickPlacementPosFromClient(e.clientX, e.clientY);
      setHoverPos((prev) => {
        if (!picked && !prev) return prev;
        if (picked && prev && picked.x === prev.x && picked.y === prev.y) return prev;
        return picked;
      });
    },
    [interactionMode, isMyTurn, selectedCard, pickPlacementPosFromClient]
  );

  const handleViewportClick = useCallback(
    (e: React.MouseEvent) => {
      if (suppressNextClickRef.current) {
        suppressNextClickRef.current = false;
        return;
      }
      if (!isMyTurn || !selectedCard) return;

      const picked = pickPlacementPosFromClient(e.clientX, e.clientY);
      if (!picked) {
        setHoverPos(null);
        return;
      }

      // On touch devices, first tap previews the 2x2 target and second tap confirms placement
      if (
        lastInputWasTouchRef.current &&
        (!hoverPos || hoverPos.x !== picked.x || hoverPos.y !== picked.y)
      ) {
        setHoverPos(picked);
        return;
      }

      if (isValidPlacement(picked)) {
        onPlaceCard(picked, selectedCard.rotation);
        if (lastInputWasTouchRef.current) {
          setHoverPos(null);
        }
      } else {
        setHoverPos(picked);
      }
    },
    [isMyTurn, selectedCard, hoverPos, pickPlacementPosFromClient, onPlaceCard, grid]
  );

  // Desktop Mouse Wheel Scroll Zoom Handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.09 : 0.92;
      setZoom((prev) => Math.min(MAX_CAMERA_ZOOM, Math.max(MIN_CAMERA_ZOOM, prev * zoomFactor)));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Global window drag listeners while panning or orbiting so cursor leaving board never gets stuck
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      const gesture = mouseGestureRef.current;
      if (!gesture) return;

      const dx = e.clientX - gesture.startX;
      const dy = e.clientY - gesture.startY;
      if (!gesture.moved && Math.hypot(dx, dy) < MOUSE_DRAG_THRESHOLD) {
        return;
      }

      if (!gesture.moved) {
        gesture.moved = true;
        setInteractionMode(gesture.type === 'orbit' ? 'orbiting' : 'panning');
        if (gesture.type === 'pan') {
          suppressNextClickRef.current = true;
        } else {
          suppressNextContextRotateRef.current = true;
        }
      }

      if (gesture.type === 'pan') {
        setPan({
          x: gesture.startPanX + dx,
          y: gesture.startPanY + dy
        });
      } else {
        const nextYaw = gesture.startYaw - dx * 0.42;
        const nextTilt = Math.min(
          MAX_CAMERA_TILT,
          Math.max(MIN_CAMERA_TILT, gesture.startTilt - dy * 0.34)
        );
        setYaw(nextYaw);
        setTilt(nextTilt);
        const nowTopDown = nextTilt <= 3;
        setIsTopDown(nowTopDown);
        if (!nowTopDown) {
          savedDioramaRef.current = { yaw: nextYaw, tilt: nextTilt };
        }
      }
    };

    const handleWindowMouseUp = () => {
      if (!mouseGestureRef.current) return;
      mouseGestureRef.current = null;
      setInteractionMode('idle');
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, []);

  // Desktop Mouse Down: Left-drag pans (short click places card), Right/Middle/Shift-drag orbits (short right-click rotates card)
  const handleMouseDown = (e: React.MouseEvent) => {
    lastInputWasTouchRef.current = false;
    suppressNextClickRef.current = false;

    const isOrbitTrigger = e.button === 2 || e.button === 1 || (e.button === 0 && e.shiftKey);
    if (isOrbitTrigger) {
      e.preventDefault();
      suppressNextContextRotateRef.current = false;
      mouseGestureRef.current = {
        type: 'orbit',
        startX: e.clientX,
        startY: e.clientY,
        startPanX: panRef.current.x,
        startPanY: panRef.current.y,
        startYaw: yawRef.current,
        startTilt: tiltRef.current,
        moved: false
      };
      return;
    }

    if (e.button === 0) {
      mouseGestureRef.current = {
        type: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        startPanX: panRef.current.x,
        startPanY: panRef.current.y,
        startYaw: yawRef.current,
        startTilt: tiltRef.current,
        moved: false
      };
    }
  };

  // Mobile Touch Gestures (1-Finger Pan vs Tap-to-Preview/Place, 2-Finger Pinch Zoom + Pan + Twist Orbit)
  const handleTouchStart = (e: React.TouchEvent) => {
    lastInputWasTouchRef.current = true;
    suppressNextClickRef.current = false;

    if (e.touches.length === 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      const angle = (Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX) * 180) / Math.PI;
      const midX = (t0.clientX + t1.clientX) / 2;
      const midY = (t0.clientY + t1.clientY) / 2;
      touchStartRef.current = {
        mode: 'pinch',
        startX: midX,
        startY: midY,
        dist,
        angle,
        midX,
        midY,
        startZoom: zoomRef.current,
        startPanX: panRef.current.x,
        startPanY: panRef.current.y,
        startYaw: yawRef.current,
        moved: true,
        twistUnlocked: false
      };
      suppressNextClickRef.current = true;
      setInteractionMode('panning');
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = {
        mode: 'single',
        startX: touch.clientX,
        startY: touch.clientY,
        dist: 0,
        angle: 0,
        midX: touch.clientX,
        midY: touch.clientY,
        startZoom: zoomRef.current,
        startPanX: panRef.current.x,
        startPanY: panRef.current.y,
        startYaw: yawRef.current,
        moved: false,
        twistUnlocked: false
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    if (!start) return;

    if (e.touches.length === 2 && start.mode === 'pinch') {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const currDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      const currAngle = (Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX) * 180) / Math.PI;
      const currMidX = (t0.clientX + t1.clientX) / 2;
      const currMidY = (t0.clientY + t1.clientY) / 2;

      const scaleRatio = currDist / (start.dist || 1);
      const newZoom = Math.min(MAX_CAMERA_ZOOM, Math.max(MIN_CAMERA_ZOOM, start.startZoom * scaleRatio));
      setZoom(newZoom);

      const dx = currMidX - start.midX;
      const dy = currMidY - start.midY;
      setPan({
        x: start.startPanX + dx,
        y: start.startPanY + dy
      });

      let angleDelta = currAngle - start.angle;
      if (angleDelta > 180) angleDelta -= 360;
      if (angleDelta < -180) angleDelta += 360;
      if (!start.twistUnlocked && Math.abs(angleDelta) > 8) {
        start.twistUnlocked = true;
      }
      if (start.twistUnlocked) {
        const nextYaw = start.startYaw + angleDelta;
        setYaw(nextYaw);
        if (!isTopDownRef.current) {
          savedDioramaRef.current.yaw = nextYaw;
        }
      }
    } else if (e.touches.length === 1 && start.mode === 'single') {
      const touch = e.touches[0];
      const dx = touch.clientX - start.startX;
      const dy = touch.clientY - start.startY;
      if (!start.moved && Math.hypot(dx, dy) >= TOUCH_DRAG_THRESHOLD) {
        start.moved = true;
        suppressNextClickRef.current = true;
        setInteractionMode('panning');
      }
      if (start.moved) {
        setPan({
          x: start.startPanX + dx,
          y: start.startPanY + dy
        });
      }
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    setInteractionMode('idle');
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

  const cameraTransitionClass =
    interactionMode === 'idle' ? 'diorama-camera-smooth' : 'diorama-camera-instant';
  const cameraTransitionCss =
    interactionMode === 'idle' ? 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
  const cursorClass =
    interactionMode === 'orbiting'
      ? 'cursor-move'
      : interactionMode === 'panning'
      ? 'cursor-grabbing'
      : 'cursor-grab';

  // Precompute active hover metadata (elevation, overlap tier, road connections, camera-aware occlusion vector)
  const isHoverActive = !!(isMyTurn && selectedCard && hoverPos);
  const hoverOrientedBlocks =
    isMyTurn && selectedCard ? getOrientedBlocks(selectedCard.card.blocks, selectedCard.rotation) : null;
  const hoverIsValid = isHoverActive && hoverPos ? isValidPlacement(hoverPos) : false;

  let hoverBaseHeight = 0;
  let hoverOverlapCount = 0;
  let hoverNextLayer = 0;
  let hoverRoadConnectCount = 0;

  type OuterEdgeStatus = 'connect' | 'deadend' | null;
  const hoverOuterEdges: Array<{
    top: OuterEdgeStatus;
    right: OuterEdgeStatus;
    bottom: OuterEdgeStatus;
    left: OuterEdgeStatus;
  }> = [
    { top: null, right: null, bottom: null, left: null },
    { top: null, right: null, bottom: null, left: null },
    { top: null, right: null, bottom: null, left: null },
    { top: null, right: null, bottom: null, left: null }
  ];

  if (isHoverActive && hoverPos && hoverOrientedBlocks) {
    for (let idx = 0; idx < 4; idx++) {
      const dx = idx % 2;
      const dy = Math.floor(idx / 2);
      const gx = hoverPos.x + dx;
      const gy = hoverPos.y + dy;
      const existing = grid[`${gx},${gy}`];
      if (existing) {
        hoverOverlapCount++;
        hoverNextLayer = Math.max(hoverNextLayer, existing.layer + 1);
        hoverBaseHeight = Math.max(hoverBaseHeight, getBlockExtrusionHeight(existing.layer));
      }

      const roads = hoverOrientedBlocks[idx].roads;
      // Inspect only the 8 outer perimeter edges of the 2x2 preview card against adjacent placed blocks
      const checks: Array<{
        isOuter: boolean;
        dir: 'top' | 'right' | 'bottom' | 'left';
        opp: 'top' | 'right' | 'bottom' | 'left';
        nx: number;
        ny: number;
      }> = [
        { isOuter: dy === 0, dir: 'top', opp: 'bottom', nx: gx, ny: gy - 1 },
        { isOuter: dx === 1, dir: 'right', opp: 'left', nx: gx + 1, ny: gy },
        { isOuter: dy === 1, dir: 'bottom', opp: 'top', nx: gx, ny: gy + 1 },
        { isOuter: dx === 0, dir: 'left', opp: 'right', nx: gx - 1, ny: gy }
      ];

      for (const ch of checks) {
        if (!ch.isOuter) continue;
        const neighbor = grid[`${ch.nx},${ch.ny}`];
        if (!neighbor) continue;
        const previewHasRoad = !!roads[ch.dir];
        const neighborHasRoad = !!neighbor.roads[ch.opp];
        if (previewHasRoad && neighborHasRoad) {
          hoverOuterEdges[idx][ch.dir] = 'connect';
          hoverRoadConnectCount++;
        } else if (previewHasRoad && !neighborHasRoad) {
          hoverOuterEdges[idx][ch.dir] = 'deadend';
        }
      }
    }
  }

  // Camera-facing foreground vector in world grid space (quantized to 15° sectors so orbit drag doesn't churn hover X-ray)
  const yawSectorRad = (Math.round(yaw / 15) * 15 * Math.PI) / 180;
  const isTiltedForXRay = !isTopDown && tilt > 10;

  // Compact map of ONLY the ~4-8 placed blocks dimmed by active hover X-ray (empty Map when idle/dragging -> 0 block re-renders!)
  const dimmedPopoutMap = useMemo<ReadonlyMap<string, number>>(() => {
    if (isRoadInspect || !isHoverActive || !hoverPos || interactionMode !== 'idle') {
      return EMPTY_OPACITY_MAP;
    }

    const map = new Map<string, number>();
    const fx = Math.sin(yawSectorRad);
    const fy = Math.cos(yawSectorRad);
    const centerDepth = (hoverPos.x + 0.5) * fx + (hoverPos.y + 0.5) * fy;

    // 1. Blocks directly underneath the 2x2 hover target
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        const k = `${hoverPos.x + dx},${hoverPos.y + dy}`;
        if (grid[k]) {
          map.set(k, 0.22);
        }
      }
    }

    // 2. Nearby foreground blocks (Chebyshev <= 2) standing in front of target along camera view
    if (isTiltedForXRay) {
      for (let gy = hoverPos.y - 2; gy <= hoverPos.y + 3; gy++) {
        for (let gx = hoverPos.x - 2; gx <= hoverPos.x + 3; gx++) {
          const k = `${gx},${gy}`;
          if (!grid[k] || map.has(k)) continue;
          const cellDepth = gx * fx + gy * fy;
          if (cellDepth > centerDepth - 0.15) {
            map.set(k, 0.34);
          }
        }
      }
    }

    return map.size > 0 ? map : EMPTY_OPACITY_MAP;
  }, [
    grid,
    isRoadInspect,
    isHoverActive,
    hoverPos?.x,
    hoverPos?.y,
    interactionMode,
    isTiltedForXRay,
    yawSectorRad
  ]);

  const settlingKeys = useMemo<ReadonlySet<string>>(() => {
    if (placementBursts.length === 0) return EMPTY_STRING_SET;
    const set = new Set<string>();
    for (const b of placementBursts) {
      b.keys.forEach((k) => set.add(k));
    }
    return set;
  }, [placementBursts]);

  const placedBlockCount = keys.length;
  const isLargeCity = placedBlockCount >= 32;

  return (
    <div
      className={`relative w-full h-full tabletop-surface overflow-hidden select-none ${cursorClass}`}
      onContextMenu={(e) => {
        e.preventDefault();
        if (suppressNextContextRotateRef.current) {
          suppressNextContextRotateRef.current = false;
          return;
        }
        if (isMyTurn && selectedCard) {
          onRotateSelectedCard();
        }
      }}
    >
      {/* Diorama 3D Perspective Viewport (Unified 3D Ray-Plane Hover & Click Hit-Testing) */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center relative touch-none diorama-viewport"
        onMouseDown={handleMouseDown}
        onMouseMove={handleViewportMouseMove}
        onClick={handleViewportClick}
        onMouseLeave={() => {
          setHoverPos(null);
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pan + Zoom Camera Rig (pointer-events-none so no 3D child plane steals or blocks ray-plane hit-testing) */}
        <div
          className={`relative shrink-0 diorama-camera-rig pointer-events-none ${cameraTransitionClass}`}
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: 'center center'
          }}
        >
          {/* Mekorama-Style Tilt + Orbit Diorama Plane */}
          <div
            className={`relative shrink-0 diorama-camera-rig ${cameraTransitionClass}`}
            style={
              {
                transform: `rotateX(${tilt}deg) rotateZ(${yaw}deg)`,
                transformOrigin: 'center center',
                '--cam-yaw': `${yaw}deg`,
                '--cam-tilt': `${tilt}deg`,
                '--cam-inv-yaw': `${-yaw}deg`,
                '--cam-inv-tilt': `${-tilt}deg`,
                '--cam-transition': cameraTransitionCss
              } as React.CSSProperties
            }
          >
            {/* Dynamic Floating Mekorama Diorama Baseplate / Island Plinth (Day/Night Reactive) */}
            <div
              className="relative diorama-stage-3d diorama-plinth-top rounded-[10px] border"
              style={{ padding: `${PLINTH_PAD}px` }}
            >
              {/* Zero-Blur Ambient Floating Island Shadow Below Plinth (Zero GPU blur shader overhead at Night) */}
              <div
                className="absolute -inset-4 rounded-[26px] pointer-events-none"
                style={{
                  transform: `translateZ(-${PLINTH_THICKNESS + 8}px)`,
                  background:
                    'radial-gradient(ellipse 72% 72% at 50% 50%, var(--diorama-plinth-shadow, rgba(38, 30, 20, 0.24)) 45%, rgba(0, 0, 0, 0) 100%)'
                }}
                aria-hidden="true"
              />

              {/* Extruded Plinth South Wall (Front-Bottom with Subterranean Strata & Faint Buried Fossils) */}
              <div
                className="absolute left-0 top-full w-full diorama-plinth-wall rounded-b-[4px] overflow-hidden"
                style={{
                  height: `${PLINTH_THICKNESS}px`,
                  transformOrigin: 'top center',
                  transform: 'rotateX(-90deg)',
                  backgroundColor: 'var(--diorama-plinth-south, #b8a88e)',
                  backgroundImage:
                    'linear-gradient(180deg, rgba(255,253,249,0.2) 0%, rgba(160,136,108,0.14) 30%, rgba(112,78,52,0.34) 32%, rgba(92,64,44,0.44) 68%, rgba(44,34,28,0.58) 70%, rgba(16,18,28,0.52) 100%)',
                  borderTop: '2px solid var(--diorama-plinth-border, #e5dbc9)',
                  borderBottom: '1px solid rgba(18, 20, 30, 0.38)'
                }}
                aria-hidden="true"
              >
                <BuriedFossilSvg variant={0} className="absolute bottom-[2px] left-[19%] w-[20px] h-[10px] opacity-65" />
                <BuriedFossilSvg variant={2} className="absolute bottom-[2px] left-[68%] w-[18px] h-[9px] opacity-55" />
              </div>

              {/* Extruded Plinth North Wall (Back-Top with Subterranean Strata) */}
              <div
                className="absolute left-0 bottom-full w-full diorama-plinth-wall rounded-t-[4px] overflow-hidden"
                style={{
                  height: `${PLINTH_THICKNESS}px`,
                  transformOrigin: 'bottom center',
                  transform: 'rotateX(90deg)',
                  backgroundColor: 'var(--diorama-plinth-north, #c5b69d)',
                  backgroundImage:
                    'linear-gradient(0deg, rgba(255,253,249,0.22) 0%, rgba(160,136,108,0.12) 30%, rgba(112,78,52,0.3) 32%, rgba(92,64,44,0.38) 68%, rgba(44,34,28,0.5) 70%, rgba(16,18,28,0.44) 100%)',
                  borderBottom: '2px solid var(--diorama-plinth-border, #ece3d2)',
                  borderTop: '1px solid rgba(18, 20, 30, 0.32)'
                }}
                aria-hidden="true"
              >
                <BuriedFossilSvg variant={1} className="absolute top-[2px] left-[36%] w-[18px] h-[9px] rotate-180 opacity-55" />
              </div>

              {/* Extruded Plinth East Wall (Right with Subterranean Strata & Faint Buried Fossil) */}
              <div
                className="absolute top-0 left-full h-full diorama-plinth-wall rounded-r-[4px] overflow-hidden"
                style={{
                  width: `${PLINTH_THICKNESS}px`,
                  transformOrigin: 'left center',
                  transform: 'rotateY(90deg)',
                  backgroundColor: 'var(--diorama-plinth-east, #96866d)',
                  backgroundImage:
                    'linear-gradient(90deg, rgba(255,253,249,0.14) 0%, rgba(145,122,98,0.14) 30%, rgba(98,68,46,0.36) 32%, rgba(78,54,38,0.46) 68%, rgba(36,28,24,0.6) 70%, rgba(12,14,24,0.56) 100%)',
                  borderLeft: '2px solid var(--diorama-plinth-border, #ded4c1)',
                  borderRight: '1px solid rgba(18, 20, 30, 0.42)'
                }}
                aria-hidden="true"
              >
                <BuriedFossilSvg variant={0} className="absolute right-[0px] top-[34%] w-[19px] h-[9.5px] -rotate-90 opacity-60" />
              </div>

              {/* Extruded Plinth West Wall (Left with Subterranean Strata) */}
              <div
                className="absolute top-0 right-full h-full diorama-plinth-wall rounded-l-[4px] overflow-hidden"
                style={{
                  width: `${PLINTH_THICKNESS}px`,
                  transformOrigin: 'right center',
                  transform: 'rotateY(-90deg)',
                  backgroundColor: 'var(--diorama-plinth-west, #ab9b82)',
                  backgroundImage:
                    'linear-gradient(270deg, rgba(255,253,249,0.18) 0%, rgba(145,122,98,0.12) 30%, rgba(98,68,46,0.32) 32%, rgba(78,54,38,0.42) 68%, rgba(36,28,24,0.54) 70%, rgba(12,14,24,0.48) 100%)',
                  borderRight: '2px solid var(--diorama-plinth-border, #e6dccb)',
                  borderLeft: '1px solid rgba(18, 20, 30, 0.35)'
                }}
                aria-hidden="true"
              >
                <BuriedFossilSvg variant={1} className="absolute left-[0px] top-[62%] w-[18px] h-[9px] rotate-90 opacity-50" />
              </div>

              {/* Inner Unpadded Grid Plane (Exact CELL_SIZE Alignment for Cells, Traffic & Dust Bursts) */}
              <div
                className={`relative diorama-stage-3d ${isRoadInspect ? 'road-inspect-active' : ''} ${
                  isLargeCity ? 'diorama-large-city' : ''
                } ${interactionMode !== 'idle' ? 'camera-interacting' : ''}`}
              >
          {/* Memoized Static City Cells & Pruned Outskirts (Decoupled from camera pan/orbit/zoom & remote aim!) */}
          <StaticCityCells
            grid={grid}
            renderMinX={renderMinX}
            renderMaxX={renderMaxX}
            renderMinY={renderMinY}
            renderMaxY={renderMaxY}
            placedBlockCount={placedBlockCount}
            isRoadInspect={isRoadInspect}
            settlingKeys={settlingKeys}
            dimmedPopoutMap={dimmedPopoutMap}
          />

          {/* Isolated 4-Cell 2x2 Hover Preview Overlay (Ground Footprint + Floating Ghost + Road Seams) */}
          {isHoverActive && hoverPos && hoverOrientedBlocks && selectedCard && (
            <div
              className="absolute pointer-events-none overflow-visible diorama-stage-3d"
              style={{
                left: (hoverPos.x - renderMinX) * CELL_SIZE,
                top: (hoverPos.y - renderMinY) * CELL_SIZE,
                width: CELL_SIZE * 2,
                height: CELL_SIZE * 2
              }}
              aria-hidden="true"
            >
              {[0, 1, 2, 3].map((idx) => {
                const dx = idx % 2;
                const dy = Math.floor(idx / 2);
                const gx = hoverPos.x + dx;
                const gy = hoverPos.y + dy;
                const existing = grid[`${gx},${gy}`];
                const cellSurfaceZ = existing ? getBlockExtrusionHeight(existing.layer) : 0;
                const previewBlock = hoverOrientedBlocks[idx];
                const cellEdgeStatus = hoverOuterEdges[idx];

                return (
                  <div
                    key={idx}
                    className="absolute pointer-events-none overflow-visible diorama-stage-3d"
                    style={{
                      left: dx * CELL_SIZE,
                      top: dy * CELL_SIZE,
                      width: CELL_SIZE,
                      height: CELL_SIZE
                    }}
                  >
                    {/* Ground-Projected 2x2 Target Footprint (Eliminates 3D parallax aiming error) */}
                    <div
                      style={{
                        transform: `translateZ(${cellSurfaceZ + 1.2}px)`
                      }}
                      className={`absolute inset-0 pointer-events-none ${
                        hoverIsValid ? 'diorama-footprint-valid' : 'diorama-footprint-invalid'
                      } ${
                        dy === 0
                          ? hoverIsValid
                            ? 'border-t-2 border-t-[#4e8f5e] border-dashed'
                            : 'border-t-2 border-t-[#d96b6b] border-dashed'
                          : ''
                      } ${
                        dy === 1
                          ? hoverIsValid
                            ? 'border-b-2 border-b-[#4e8f5e] border-dashed'
                            : 'border-b-2 border-b-[#d96b6b] border-dashed'
                          : ''
                      } ${
                        dx === 0
                          ? hoverIsValid
                            ? 'border-l-2 border-l-[#4e8f5e] border-dashed'
                            : 'border-l-2 border-l-[#d96b6b] border-dashed'
                          : ''
                      } ${
                        dx === 1
                          ? hoverIsValid
                            ? 'border-r-2 border-r-[#4e8f5e] border-dashed'
                            : 'border-r-2 border-r-[#d96b6b] border-dashed'
                          : ''
                      }`}
                    >
                      <div
                        className={`absolute w-2.5 h-2.5 ${
                          hoverIsValid ? 'border-[#3f7f50]' : 'border-[#c85555]'
                        } ${
                          idx === 0
                            ? 'top-0.5 left-0.5 border-t-2 border-l-2 rounded-tl-[2px]'
                            : idx === 1
                            ? 'top-0.5 right-0.5 border-t-2 border-r-2 rounded-tr-[2px]'
                            : idx === 2
                            ? 'bottom-0.5 left-0.5 border-b-2 border-l-2 rounded-bl-[2px]'
                            : 'bottom-0.5 right-0.5 border-b-2 border-r-2 rounded-br-[2px]'
                        }`}
                      />
                    </div>

                    {/* Floating 3D Ghost Block + Road-Seam Highlights */}
                    <div
                      style={
                        {
                          '--city-tile-shade': '0',
                          transform: `translateZ(${hoverBaseHeight + 13}px)`
                        } as React.CSSProperties
                      }
                      className={`absolute inset-0 pointer-events-none overflow-visible diorama-stage-3d rounded-xl p-[2px] ${
                        hoverIsValid
                          ? 'bg-[#63a375]/20 ring-2 ring-[#5e9a6b]'
                          : 'bg-[#d96b6b]/20 ring-2 ring-[#d96b6b]'
                      }`}
                    >
                      <BlockCell
                        block={{
                          cardId: selectedCard.card.id,
                          zone: previewBlock.zone,
                          roads: previewBlock.roads,
                          layer: 99,
                          blockIndex: idx,
                          rotation: selectedCard.rotation
                        }}
                        size={CELL_SIZE - 4}
                        isGhost
                        isValidGhost={hoverIsValid}
                      />

                      {cellEdgeStatus && (
                        <div
                          className="absolute inset-0 pointer-events-none overflow-visible"
                          style={{ transform: 'translateZ(11.5px)' }}
                        >
                          {(['top', 'right', 'bottom', 'left'] as const).map((dir) => {
                            const status = cellEdgeStatus[dir];
                            if (!status) return null;
                            const posClass =
                              dir === 'top'
                                ? 'top-0 left-1/2'
                                : dir === 'right'
                                ? 'top-1/2 left-full'
                                : dir === 'bottom'
                                ? 'top-full left-1/2'
                                : 'top-1/2 left-0';
                            return (
                              <div
                                key={dir}
                                className={`absolute ${posClass} rounded-full pointer-events-none ${
                                  status === 'connect'
                                    ? 'w-3.5 h-3.5 bg-[#fbbf24] border-2 border-[#fffdf9] shadow-md road-seam-badge'
                                    : 'w-2 h-2 -translate-x-1/2 -translate-y-1/2 bg-[#78716c]/80 border border-[#fffdf9]/80'
                                }`}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Screen-Aligned Upright Hover Placement Status Badge (High-Z Centered Billboard: Never Tilted or Clipped) */}
          {isHoverActive && hoverPos && (
            <div
              className="diorama-billboard-anchor"
              style={{
                left: (hoverPos.x + 1 - renderMinX) * CELL_SIZE,
                top: (hoverPos.y + 1 - renderMinY) * CELL_SIZE,
                transform: `translateZ(${hoverBaseHeight + 58}px) rotateZ(var(--cam-inv-yaw, 0deg)) rotateX(var(--cam-inv-tilt, 0deg))`
              }}
              aria-hidden="true"
            >
              <div
                style={{
                  transform: 'translate(-50%, -100%)',
                  textShadow: '0 1px 2px rgba(20, 20, 20, 0.35)'
                }}
                className={`w-max px-2 py-1 rounded-lg text-[10px] font-bold shadow-lg border backdrop-blur-[3px] flex items-center gap-1 whitespace-nowrap ${
                  hoverIsValid
                    ? 'bg-[#3c7b4d]/72 text-[#fffdf9] border-[#fffdf9]/60'
                    : 'bg-[#c94a4a]/78 text-[#fffdf9] border-[#fffdf9]/60'
                }`}
              >
                {hoverIsValid ? (
                  <>
                    <Check className="w-3 h-3 stroke-[3] shrink-0" />
                    <span>
                      {hoverOverlapCount > 0 ? `Tumpuk L${hoverNextLayer + 1}` : 'Pasang'}
                    </span>
                    {hoverRoadConnectCount > 0 && (
                      <span className="px-1 py-[0.5px] rounded bg-[#fbbf24] text-[#292524] text-[8.5px] font-mono font-extrabold leading-none">
                        +{hoverRoadConnectCount} jalan
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <X className="w-3 h-3 stroke-[3] shrink-0" />
                    <span>Harus menempel</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Tahap 5: Lightweight Ephemeral Remote PeerJS Player Aim Footprint & Upright Label */}
          {!isMyTurn && remoteHoverAim?.pos && (() => {
            const rPos = remoteHoverAim.pos;
            let remoteBaseHeight = 0;
            for (let dy = 0; dy <= 1; dy++) {
              for (let dx = 0; dx <= 1; dx++) {
                const existing = grid[`${rPos.x + dx},${rPos.y + dy}`];
                if (existing) {
                  remoteBaseHeight = Math.max(remoteBaseHeight, getBlockExtrusionHeight(existing.layer));
                }
              }
            }
            const aimColor = remoteHoverAim.playerColor || '#d97757';
            return (
              <>
                <div
                  className="absolute pointer-events-none rounded-lg remote-aim-pulse"
                  style={{
                    left: (rPos.x - renderMinX) * CELL_SIZE,
                    top: (rPos.y - renderMinY) * CELL_SIZE,
                    width: CELL_SIZE * 2,
                    height: CELL_SIZE * 2,
                    transform: `translateZ(${remoteBaseHeight + 2.5}px)`,
                    border: `2.5px dashed ${aimColor}`,
                    backgroundColor: `${aimColor}24`,
                    boxShadow: `inset 0 0 14px ${aimColor}35`
                  }}
                  aria-hidden="true"
                />
                <div
                  className="diorama-billboard-anchor"
                  style={{
                    left: (rPos.x + 1 - renderMinX) * CELL_SIZE,
                    top: (rPos.y + 1 - renderMinY) * CELL_SIZE,
                    transform: `translateZ(${remoteBaseHeight + 44}px) rotateZ(var(--cam-inv-yaw, 0deg)) rotateX(var(--cam-inv-tilt, 0deg))`
                  }}
                  aria-hidden="true"
                >
                  <div
                    style={{
                      transform: 'translate(-50%, -100%)',
                      borderColor: aimColor
                    }}
                    className="w-max px-2 py-0.5 rounded-full bg-[#fffdf9]/95 text-[#292524] border-2 text-[9.5px] font-bold shadow-lg flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: aimColor }}
                    />
                    <span>{remoteHoverAim.playerName} membidik...</span>
                  </div>
                </div>
              </>
            );
          })()}

          {/* Animated Extruded 3D Mini Cars Traffic Layer (Per-Layer Elevation + Local Layout Sizing) */}
          <CityTrafficOverlay
            grid={grid}
            minX={renderMinX}
            maxX={renderMaxX}
            minY={renderMinY}
            maxY={renderMaxY}
            diorama3D
            cellSizePx={CELL_SIZE}
            baseBlockHeight={BASE_BLOCK_HEIGHT}
            layerStepHeight={LAYER_STEP_HEIGHT}
            maxVisualLayer={MAX_VISUAL_LAYER}
          />

          {/* Soft Warm Cream Dust Puff & Micro-Bounce Pebble Overlay Around Newly Landed 2x2 Card */}
          {placementBursts.map((burst) => (
            <div
              key={burst.id}
              className="absolute pointer-events-none overflow-visible diorama-stage-3d"
              style={{
                left: (burst.x - renderMinX) * CELL_SIZE,
                top: (burst.y - renderMinY) * CELL_SIZE,
                width: CELL_SIZE * 2,
                height: CELL_SIZE * 2,
                transform: `translateZ(${burst.z}px)`
              }}
              aria-hidden="true"
            >
              {/* Soft expanding warm edge impact ring */}
              <div className="absolute inset-0 rounded-2xl border-2 border-[#fffdf9]/85 dust-ring-aura" />

              {/* Warm radial cream/ivory dust puffs */}
              {DUST_PUFFS.map((puff, pIdx) => (
                <div
                  key={pIdx}
                  className="absolute rounded-full dust-puff-particle"
                  style={
                    {
                      left: `${puff.leftPct}%`,
                      top: `${puff.topPct}%`,
                      width: `${puff.size}px`,
                      height: `${puff.size}px`,
                      backgroundColor: puff.color,
                      boxShadow: '0 2px 6px rgba(168, 152, 126, 0.25)',
                      animationDelay: `${puff.delayMs}ms`,
                      '--dust-dx': `${puff.dx}px`,
                      '--dust-dy': `${puff.dy}px`
                    } as React.CSSProperties
                  }
                />
              ))}

              {/* Tiny 3D Micro-Bounce Pebbles / Dust Sparks Popping Around Block Perimeter */}
              {MICRO_BOUNCE_SPARKS.map((spark, sIdx) => (
                <div
                  key={`spark-${sIdx}`}
                  className="absolute rounded-full dust-spark-particle"
                  style={
                    {
                      left: `${spark.leftPct}%`,
                      top: `${spark.topPct}%`,
                      width: `${spark.size}px`,
                      height: `${spark.size}px`,
                      backgroundColor: spark.color,
                      border: '0.5px solid rgba(112, 92, 68, 0.35)',
                      animationDelay: `${spark.delayMs}ms`,
                      '--spark-dx': `${spark.dx}px`,
                      '--spark-dy': `${spark.dy}px`
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
          ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Mekorama-Style Diorama Camera HUD (Bottom-Right on Desktop, Under Sky Badge on Narrow Mobile) */}
      <div
        className="fixed right-3 sm:right-4 top-[84px] sm:top-auto sm:bottom-4 z-30 flex flex-col items-end gap-1.5 pointer-events-none"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="diorama-hud-pill backdrop-blur-md rounded-2xl p-1 flex items-center gap-1 pointer-events-auto">
          {/* Rotate Camera -90° */}
          <button
            type="button"
            onClick={() => rotateCameraBy(-90)}
            className="p-1.5 rounded-xl bg-[#f4efe6] hover:bg-[#e9e0d0] text-[#44403c] hover:text-[#292524] border border-[#dfd5c3] transition-colors cursor-pointer"
            title="Putar Kamera Kiri 90° (Q)"
            aria-label="Putar Kamera Kiri 90 derajat"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Interactive World-North Compass (Click to snap to default diorama angle) */}
          <button
            type="button"
            onClick={resetCamera}
            className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-[#fffdf9] hover:bg-[#f7f1e5] border border-[#ddd4c3] transition-colors cursor-pointer"
            title={`Kompas Utara (${Math.round(normalizeDeg360(yaw))}°) · Klik untuk reset kamera (0)`}
            aria-label="Reset posisi dan sudut kamera"
          >
            <Compass
              className="w-4 h-4 text-[#b95e3d] transition-transform duration-200"
              style={{ transform: `rotate(${yaw}deg)` }}
            />
            <span className="absolute -top-1 px-1 rounded bg-[#d97757] text-[#fffdf9] text-[7px] font-mono font-bold leading-tight shadow-xs">
              N
            </span>
          </button>

          {/* Rotate Camera +90° */}
          <button
            type="button"
            onClick={() => rotateCameraBy(90)}
            className="p-1.5 rounded-xl bg-[#f4efe6] hover:bg-[#e9e0d0] text-[#44403c] hover:text-[#292524] border border-[#dfd5c3] transition-colors cursor-pointer"
            title="Putar Kamera Kanan 90° (E)"
            aria-label="Putar Kamera Kanan 90 derajat"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-5 bg-[#ddd4c3] mx-0.5" />

          {/* Quick Top-Down (2D) vs Diorama (3D) Toggle */}
          <button
            type="button"
            onClick={toggleTopDown}
            className={`px-2 py-1.5 rounded-xl border text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
              isTopDown
                ? 'bg-[#d97757] text-[#fffdf9] border-[#c46444] shadow-xs'
                : 'bg-[#f4efe6] hover:bg-[#e9e0d0] text-[#44403c] border-[#dfd5c3]'
            }`}
            title="Toggle Tampilan 2D Top-Down / 3D Diorama (T)"
            aria-label="Toggle tampilan Top-Down"
          >
            {isTopDown ? <MapIcon className="w-3.5 h-3.5" /> : <Box className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isTopDown ? '2D' : '3D'}</span>
          </button>

          {/* Road Inspection Mode (X-Ray Buildings to Trace 4-Edge Road Networks) */}
          <button
            type="button"
            onClick={() => setIsRoadInspect((prev) => !prev)}
            className={`px-2 py-1.5 rounded-xl border text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
              isRoadInspect
                ? 'bg-[#5f9b6f] text-[#fffdf9] border-[#4c845b] shadow-xs'
                : 'bg-[#f4efe6] hover:bg-[#e9e0d0] text-[#44403c] border-[#dfd5c3]'
            }`}
            title="Mode Inspeksi Jalan: Transparansi bangunan agar sambungan jalan terlihat jelas (V)"
            aria-label="Toggle mode inspeksi jalan"
          >
            <Route className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Jalan</span>
          </button>

          {/* Recenter Pan & Zoom */}
          <button
            type="button"
            onClick={resetCamera}
            className="p-1.5 rounded-xl bg-[#f4efe6] hover:bg-[#e9e0d0] text-[#57534e] hover:text-[#292524] border border-[#dfd5c3] transition-colors cursor-pointer"
            title="Pusatkan & Reset Kamera (0)"
            aria-label="Pusatkan kamera"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Subtle Desktop Gesture Hint Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fbf8f2]/85 border border-[#ddd4c3]/90 text-[9px] font-medium text-[#57534e] shadow-xs backdrop-blur-xs">
          <span>Drag Kiri: Geser</span>
          <span className="text-[#c8bba4]">•</span>
          <span>Drag Kanan: Orbit</span>
          <span className="text-[#c8bba4]">•</span>
          <span>T: 2D/3D</span>
          <span className="text-[#c8bba4]">•</span>
          <span>V: Cek Jalan</span>
          <span className="text-[#c8bba4]">•</span>
          <span>R: Putar Kartu</span>
        </div>
      </div>
    </div>
  );
};

interface EmptyBoardCellProps {
  x: number;
  y: number;
  tier: EmptyCellTier;
  showOuterOrnament: boolean;
}

/**
 * Memoized Empty Grid Cell with Safe Distance-Based DOM Pruning:
 * - 'near' (adjacent to city): full recessed diorama socket + EmptyCellTerrain + coord label
 * - 'outer' (distance 2, valid 2x2 landing ring): clean minimal socket (skips heavy SVG & coord text on large cities)
 * - 'far' (distance > 2, unreachable corners): pure lightweight blank spacer (0 inner DOM nodes)
 */
const EmptyBoardCell: React.FC<EmptyBoardCellProps> = React.memo(({ x, y, tier, showOuterOrnament }) => {
  if (tier === 'far') {
    return (
      <div
        data-grid-cell="true"
        style={{ width: CELL_SIZE, height: CELL_SIZE }}
        className="relative pointer-events-none shrink-0"
      />
    );
  }

  const isNear = tier === 'near';
  return (
    <div
      data-grid-cell="true"
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        backgroundColor: isNear
          ? 'var(--empty-cell-bg, rgba(174, 164, 142, 0.56))'
          : 'var(--empty-cell-bg, rgba(174, 164, 142, 0.3))',
        borderColor: 'var(--empty-grid-border, rgba(112, 102, 84, 0.35))'
      }}
      className={`relative overflow-visible pointer-events-none border flex items-center justify-center shrink-0 ${
        isNear ? 'diorama-socket-cell rounded-[4px]' : 'rounded-[3px]'
      }`}
    >
      {(isNear || showOuterOrnament) && (
        <>
          <EmptyCellTerrain x={x} y={y} />
          <span
            className="absolute top-1 left-1.5 z-[1] text-[9px] font-mono pointer-events-none tabular-nums"
            style={{ color: 'var(--coord-text-color, rgba(141, 130, 113, 0.7))' }}
          >
            {x},{y}
          </span>
        </>
      )}
    </div>
  );
});

interface StaticCityCellsProps {
  grid: GridState;
  renderMinX: number;
  renderMaxX: number;
  renderMinY: number;
  renderMaxY: number;
  placedBlockCount: number;
  isRoadInspect: boolean;
  settlingKeys: ReadonlySet<string>;
  dimmedPopoutMap: ReadonlyMap<string, number>;
}

/**
 * Memoized Static Board Grid:
 * Completely decoupled from camera pan/zoom/yaw/tilt, hover preview 2x2 overlay, and PeerJS remote aim updates.
 * Precomputes proximity tiers once per grid change to prune unreachable corner cell DOM on large cities.
 */
const StaticCityCells: React.FC<StaticCityCellsProps> = React.memo(({
  grid,
  renderMinX,
  renderMaxX,
  renderMinY,
  renderMaxY,
  placedBlockCount,
  isRoadInspect,
  settlingKeys,
  dimmedPopoutMap
}) => {
  const showOuterOrnament = placedBlockCount < 12;

  // Precompute active placement proximity sets once per committed move (O(placedBlocks), ~0.05ms)
  const { nearEmptySet, outerEmptySet } = useMemo(() => {
    const near = new Set<string>();
    const outer = new Set<string>();
    const placedKeys = Object.keys(grid);

    for (const pk of placedKeys) {
      const sep = pk.indexOf(',');
      const bx = Number(pk.slice(0, sep));
      const by = Number(pk.slice(sep + 1));

      // Orthogonal neighbors (distance 1): active placement border
      const n1 = `${bx - 1},${by}`;
      const n2 = `${bx + 1},${by}`;
      const n3 = `${bx},${by - 1}`;
      const n4 = `${bx},${by + 1}`;
      if (!grid[n1]) near.add(n1);
      if (!grid[n2]) near.add(n2);
      if (!grid[n3]) near.add(n3);
      if (!grid[n4]) near.add(n4);

      // Chebyshev <= 2 ring: valid 2x2 card landing footprint buffer
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx === 0 && dy === 0) continue;
          const ok = `${bx + dx},${by + dy}`;
          if (!grid[ok]) outer.add(ok);
        }
      }
    }

    return { nearEmptySet: near, outerEmptySet: outer };
  }, [grid]);

  const rowCount = renderMaxY - renderMinY + 1;
  const colCount = renderMaxX - renderMinX + 1;

  return (
    <>
      {Array.from({ length: rowCount }).map((_, rIdx) => {
        const y = renderMinY + rIdx;
        return (
          <div key={`row-${y}`} className="flex overflow-visible diorama-stage-3d">
            {Array.from({ length: colCount }).map((_, cIdx) => {
              const x = renderMinX + cIdx;
              const key = `${x},${y}`;
              const placedBlock = grid[key];

              if (!placedBlock) {
                const tier: EmptyCellTier =
                  placedBlockCount === 0 || nearEmptySet.has(key)
                    ? 'near'
                    : outerEmptySet.has(key)
                    ? 'outer'
                    : 'far';
                return (
                  <EmptyBoardCell
                    key={key}
                    x={x}
                    y={y}
                    tier={tier}
                    showOuterOrnament={showOuterOrnament}
                  />
                );
              }

              const popoutOpacity = isRoadInspect ? 0.24 : (dimmedPopoutMap.get(key) ?? 1);
              return (
                <div
                  key={key}
                  data-grid-cell="true"
                  style={{ width: CELL_SIZE, height: CELL_SIZE }}
                  className="relative overflow-visible diorama-stage-3d pointer-events-none flex items-center justify-center shrink-0"
                >
                  <BlockCell
                    block={placedBlock}
                    size={CELL_SIZE}
                    isSettling={settlingKeys.has(key)}
                    popoutOpacity={popoutOpacity}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
});

interface BlockCellProps {
  block: PlacedBlock;
  size: number;
  isGhost?: boolean;
  isValidGhost?: boolean;
  isSettling?: boolean;
  popoutOpacity?: number;
}

const areBlockCellPropsEqual = (prev: BlockCellProps, next: BlockCellProps): boolean => {
  if (
    prev.size !== next.size ||
    prev.isGhost !== next.isGhost ||
    prev.isValidGhost !== next.isValidGhost ||
    prev.isSettling !== next.isSettling ||
    prev.popoutOpacity !== next.popoutOpacity
  ) {
    return false;
  }
  const pb = prev.block;
  const nb = next.block;
  if (pb === nb) return true;
  return (
    pb.cardId === nb.cardId &&
    pb.zone === nb.zone &&
    pb.layer === nb.layer &&
    pb.blockIndex === nb.blockIndex &&
    pb.rotation === nb.rotation &&
    !!pb.roads.top === !!nb.roads.top &&
    !!pb.roads.right === !!nb.roads.right &&
    !!pb.roads.bottom === !!nb.roads.bottom &&
    !!pb.roads.left === !!nb.roads.left
  );
};

const BlockCell: React.FC<BlockCellProps> = React.memo(({ block, size, isGhost, isValidGhost, isSettling, popoutOpacity = 1 }) => {
  const zoneInfo = ZONE_NAMES[block.zone];
  const isStacked = !isGhost && block.layer > 0;
  const canonicalBlockIndex = block.rotation === 180 ? 3 - block.blockIndex : block.blockIndex;
  const wallPalette = ZONE_BLOCK_WALLS[block.zone] || ZONE_BLOCK_WALLS.I;
  const extrusionHeight = isGhost ? 10 : getBlockExtrusionHeight(block.layer);

  // Subtle horizontal stepped seam pattern on extruded walls for overlapping stacked cards (layer > 0)
  const verticalSeamOverlay = isStacked
    ? `repeating-linear-gradient(180deg, transparent 0px, transparent ${LAYER_STEP_HEIGHT - 1}px, rgba(35, 28, 22, 0.22) ${LAYER_STEP_HEIGHT - 1}px, rgba(35, 28, 22, 0.22) ${LAYER_STEP_HEIGHT}px)`
    : undefined;
  const horizontalSeamOverlay = isStacked
    ? `repeating-linear-gradient(90deg, transparent 0px, transparent ${LAYER_STEP_HEIGHT - 1}px, rgba(35, 28, 22, 0.22) ${LAYER_STEP_HEIGHT - 1}px, rgba(35, 28, 22, 0.22) ${LAYER_STEP_HEIGHT}px)`
    : undefined;

  // Deterministic subterranean soil strata & rare buried fossil detail per city block
  const soilSeed = ((block.cardId * 73 + canonicalBlockIndex * 31 + block.layer * 17) >>> 0);
  const soilPalette = SOIL_STRATA_PALETTES[soilSeed % SOIL_STRATA_PALETTES.length];
  const hasSouthFossil = !isGhost && (soilSeed % 5 === 0);
  const hasEastFossil = !isGhost && (soilSeed % 7 === 2);
  const fossilVariant = ((soilSeed >>> 3) % 3) as 0 | 1 | 2;
  const fossilOffsetPct = 22 + ((soilSeed >>> 5) % 44);

  const buildStrataGradient = (dirDeg: number, topColor: string) =>
    `linear-gradient(${dirDeg}deg, ${topColor} 0%, ${topColor} 38%, ${soilPalette.strata} 39%, ${soilPalette.strata} 47%, ${soilPalette.soil} 48%, ${soilPalette.soil} 76%, ${soilPalette.deep} 77%, ${soilPalette.deep} 100%)`;

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center pointer-events-none overflow-visible diorama-stage-3d ${
        isGhost ? 'p-[2px]' : 'p-[0.5px]'
      } ${
        isSettling ? 'tile-land-settle' : ''
      }`}
    >
      {/* Elevated 3D Extruded Mekorama Prism Container */}
      <div
        style={{
          transform: `translateZ(${extrusionHeight}px)`
        }}
        className="relative w-full h-full pointer-events-none overflow-visible diorama-stage-3d"
      >
        {/* 4 Extruded Block Side Walls Hanging Down from Top Face to Plinth (Z = 0) with Earth Strata & Rare Buried Fossils */}
        {!isGhost && (
          <>
            {/* South Wall (Bottom Edge) */}
            <div
              className="absolute left-0 top-full w-full diorama-block-wall overflow-hidden"
              style={{
                height: `${extrusionHeight}px`,
                transformOrigin: 'top center',
                transform: 'rotateX(-90deg)',
                backgroundColor: wallPalette.south,
                backgroundImage: verticalSeamOverlay
                  ? `${verticalSeamOverlay}, linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(18,14,12,0.22) 100%), ${buildStrataGradient(180, wallPalette.south)}`
                  : `linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(18,14,12,0.22) 100%), ${buildStrataGradient(180, wallPalette.south)}`,
                borderTop: `1.5px solid ${wallPalette.rim}`,
                borderBottom: '1px solid rgba(28, 24, 20, 0.34)'
              }}
              aria-hidden="true"
            >
              {hasSouthFossil && (
                <div
                  className="absolute bottom-[0.5px] pointer-events-none"
                  style={{ left: `${fossilOffsetPct}%` }}
                >
                  <BuriedFossilSvg variant={fossilVariant} className="w-[16px] h-[8.5px]" />
                </div>
              )}
            </div>
            {/* North Wall (Top Edge) */}
            <div
              className="absolute left-0 bottom-full w-full diorama-block-wall overflow-hidden"
              style={{
                height: `${extrusionHeight}px`,
                transformOrigin: 'bottom center',
                transform: 'rotateX(90deg)',
                backgroundColor: wallPalette.north,
                backgroundImage: verticalSeamOverlay
                  ? `${verticalSeamOverlay}, linear-gradient(0deg, rgba(255,255,255,0.16) 0%, rgba(18,14,12,0.16) 100%), ${buildStrataGradient(0, wallPalette.north)}`
                  : `linear-gradient(0deg, rgba(255,255,255,0.16) 0%, rgba(18,14,12,0.16) 100%), ${buildStrataGradient(0, wallPalette.north)}`,
                borderBottom: `1.5px solid ${wallPalette.rim}`,
                borderTop: '1px solid rgba(28, 24, 20, 0.28)'
              }}
              aria-hidden="true"
            />
            {/* East Wall (Right Edge) */}
            <div
              className="absolute top-0 left-full h-full diorama-block-wall overflow-hidden"
              style={{
                width: `${extrusionHeight}px`,
                transformOrigin: 'left center',
                transform: 'rotateY(90deg)',
                backgroundColor: wallPalette.east,
                backgroundImage: horizontalSeamOverlay
                  ? `${horizontalSeamOverlay}, linear-gradient(90deg, rgba(255,255,255,0.08) 0%, rgba(14,12,10,0.28) 100%), ${buildStrataGradient(90, wallPalette.east)}`
                  : `linear-gradient(90deg, rgba(255,255,255,0.08) 0%, rgba(14,12,10,0.28) 100%), ${buildStrataGradient(90, wallPalette.east)}`,
                borderLeft: `1.5px solid ${wallPalette.rim}`,
                borderRight: '1px solid rgba(28, 24, 20, 0.34)'
              }}
              aria-hidden="true"
            >
              {hasEastFossil && (
                <div
                  className="absolute right-[-3px] -rotate-90 pointer-events-none"
                  style={{ top: `${fossilOffsetPct}%` }}
                >
                  <BuriedFossilSvg variant={fossilVariant} className="w-[15px] h-[8px]" />
                </div>
              )}
            </div>
            {/* West Wall (Left Edge) */}
            <div
              className="absolute top-0 right-full h-full diorama-block-wall overflow-hidden"
              style={{
                width: `${extrusionHeight}px`,
                transformOrigin: 'right center',
                transform: 'rotateY(-90deg)',
                backgroundColor: wallPalette.west,
                backgroundImage: horizontalSeamOverlay
                  ? `${horizontalSeamOverlay}, linear-gradient(270deg, rgba(255,255,255,0.12) 0%, rgba(14,12,10,0.22) 100%), ${buildStrataGradient(270, wallPalette.west)}`
                  : `linear-gradient(270deg, rgba(255,255,255,0.12) 0%, rgba(14,12,10,0.22) 100%), ${buildStrataGradient(270, wallPalette.west)}`,
                borderRight: `1.5px solid ${wallPalette.rim}`,
                borderLeft: '1px solid rgba(28, 24, 20, 0.28)'
              }}
              aria-hidden="true"
            />
          </>
        )}

        {/* Clipped Ground Tile, Flush Roads & Flat Surface Ornaments (Leaf node — never flattens sibling walls or 3D popouts) */}
        <div
          style={{
            borderColor: isGhost ? 'transparent' : 'var(--city-night-rim-color, rgba(255, 253, 249, 0.24))'
          }}
          className={`relative w-full h-full overflow-hidden border ${
            isGhost ? 'rounded-[8px]' : 'rounded-[3px]'
          } ${
            zoneInfo ? zoneInfo.bg : 'bg-[#d8c39e]'
          } ${
            zoneInfo ? zoneInfo.text : 'text-[#292524]'
          } ${
            isGhost
              ? `tile-25d-floating ${isValidGhost ? 'opacity-95' : 'opacity-80 saturate-75'}`
              : isStacked
              ? 'diorama-block-top-stacked'
              : 'diorama-block-top'
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

          {/* Subtle Stacked Layer Micro-Indicator (Clear in both 3D Diorama and 2D Top-Down views; zero backdrop-blur) */}
          {isStacked && (
            <span
              className="absolute bottom-0.5 right-0.5 z-[6] px-1 py-[0.5px] rounded bg-[#292524]/82 text-[#fffdf9] text-[7.5px] font-mono font-bold leading-none tracking-tight"
              title={`Tumpukan Lapisan ${block.layer + 1}`}
            >
              L{block.layer + 1}
            </span>
          )}
        </div>

        {/* Upright 3D Pop-Out Buildings, Trees & Streetlamps (Sibling in preserve-3d space above tile top; opacity flows via CSS var into DioramaStandup leaf so GPU 3D never flattens) */}
        <div
          className="absolute inset-0 pointer-events-none overflow-visible diorama-stage-3d"
          style={
            {
              '--block-popout-opacity': isGhost ? '1' : String(popoutOpacity)
            } as React.CSSProperties
          }
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
    </div>
  );
}, areBlockCellPropsEqual);
