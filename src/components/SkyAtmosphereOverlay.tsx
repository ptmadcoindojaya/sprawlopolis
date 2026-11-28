import React, { useEffect, useRef, useState } from 'react';
import {
  computeDayNightSnapshot,
  DayNightSnapshot,
  FULL_CYCLE_DURATION_MS,
  INITIAL_CYCLE_PROGRESS,
  setLiveCycleProgress
} from '../utils/dayNightCycle';

interface SkyAtmosphereOverlayProps {
  /** Automatically pauses the elapsed-time cycle when in Lobby or Game Over */
  isPaused: boolean;
  /** Target container element (city board area) to receive live CSS lighting variables */
  targetRef: React.RefObject<HTMLElement | null>;
}

interface CloudSpec {
  id: string;
  topPct: number;
  widthPx: number;
  baseOpacity: number;
  durationSec: number;
  delaySec: number;
  direction: 'ltr' | 'rtl';
  variant: 0 | 1 | 2 | 3;
}

/**
 * 10 varied pastel clouds scattered across distinct vertical heights across the board,
 * drifting gently in both directions (left->right and right->left) with short off-screen
 * pauses so a few soft clouds are always gliding peacefully across the city.
 */
const SKY_CLOUDS: CloudSpec[] = [
  { id: 'c1', topPct: 5, widthPx: 218, baseOpacity: 0.45, durationSec: 54, delaySec: -6, direction: 'ltr', variant: 0 },
  { id: 'c2', topPct: 14, widthPx: 152, baseOpacity: 0.4, durationSec: 46, delaySec: -28, direction: 'rtl', variant: 1 },
  { id: 'c3', topPct: 23, widthPx: 242, baseOpacity: 0.43, durationSec: 66, delaySec: -42, direction: 'ltr', variant: 2 },
  { id: 'c4', topPct: 33, widthPx: 136, baseOpacity: 0.38, durationSec: 41, delaySec: -14, direction: 'rtl', variant: 3 },
  { id: 'c5', topPct: 43, widthPx: 196, baseOpacity: 0.39, durationSec: 60, delaySec: -34, direction: 'ltr', variant: 1 },
  { id: 'c6', topPct: 53, widthPx: 174, baseOpacity: 0.38, durationSec: 50, delaySec: -4, direction: 'rtl', variant: 0 },
  { id: 'c7', topPct: 62, widthPx: 234, baseOpacity: 0.41, durationSec: 70, delaySec: -51, direction: 'ltr', variant: 2 },
  { id: 'c8', topPct: 71, widthPx: 148, baseOpacity: 0.37, durationSec: 44, delaySec: -22, direction: 'rtl', variant: 3 },
  { id: 'c9', topPct: 80, widthPx: 204, baseOpacity: 0.4, durationSec: 58, delaySec: -19, direction: 'ltr', variant: 0 },
  { id: 'c10', topPct: 88, widthPx: 128, baseOpacity: 0.35, durationSec: 48, delaySec: -37, direction: 'rtl', variant: 1 }
];

/**
 * Computes (x, y) point along a smooth sky semicircle inside the 110x46 celestial arc SVG
 */
function pointOnSkyArc(t: number): { x: number; y: number } {
  const clamped = Math.max(0, Math.min(1, t));
  // Angle goes from ~166° (left horizon) over 90° (zenith) to ~14° (right horizon)
  const angleRad = Math.PI * (0.92 - clamped * 0.84);
  const cx = 55;
  const cy = 44;
  const rx = 43;
  const ry = 31;
  return {
    x: cx + Math.cos(angleRad) * rx,
    y: cy - Math.sin(angleRad) * ry
  };
}

/**
 * Memoized static cloud silhouettes: colors & opacity scale flow through CSS custom properties
 * on the parent wrapper, so the 10 clouds NEVER re-render in React during the day/night cycle.
 */
const StaticCloudLayer = React.memo(() => (
  <>
    {SKY_CLOUDS.map((cloud) => (
      <div
        key={cloud.id}
        className={`absolute left-0 pointer-events-none ${
          cloud.direction === 'ltr' ? 'cloud-drift-ltr' : 'cloud-drift-rtl'
        }`}
        style={{
          top: `${cloud.topPct}%`,
          width: `${cloud.widthPx}px`,
          opacity: cloud.baseOpacity,
          animationDuration: `${cloud.durationSec}s`,
          animationDelay: `${cloud.delaySec}s`
        }}
      >
        <svg viewBox="0 0 140 56" className="w-full h-auto overflow-visible">
          {cloud.variant === 0 && (
            <g>
              <ellipse cx="70" cy="40" rx="50" ry="12" fill="var(--cloud-shadow, #e4e9ee)" opacity="0.52" />
              <circle cx="38" cy="34" r="16" fill="var(--cloud-color, #fffdf9)" />
              <circle cx="62" cy="24" r="22" fill="var(--cloud-color, #fffdf9)" />
              <circle cx="88" cy="28" r="18" fill="var(--cloud-color, #fffdf9)" />
              <circle cx="106" cy="36" r="13" fill="var(--cloud-color, #fffdf9)" />
              <rect x="36" y="29" width="70" height="19" rx="9" fill="var(--cloud-color, #fffdf9)" />
            </g>
          )}
          {cloud.variant === 1 && (
            <g>
              <ellipse cx="68" cy="39" rx="44" ry="10" fill="var(--cloud-shadow, #e4e9ee)" opacity="0.48" />
              <circle cx="42" cy="33" r="14" fill="var(--cloud-color, #fffdf9)" />
              <circle cx="66" cy="25" r="19" fill="var(--cloud-color, #fffdf9)" />
              <circle cx="90" cy="33" r="14" fill="var(--cloud-color, #fffdf9)" />
              <rect x="42" y="29" width="48" height="16" rx="8" fill="var(--cloud-color, #fffdf9)" />
            </g>
          )}
          {cloud.variant === 2 && (
            <g>
              <ellipse cx="72" cy="41" rx="54" ry="11" fill="var(--cloud-shadow, #e4e9ee)" opacity="0.48" />
              <circle cx="34" cy="36" r="14" fill="var(--cloud-color, #fffdf9)" />
              <circle cx="56" cy="26" r="20" fill="var(--cloud-color, #fffdf9)" />
              <circle cx="82" cy="23" r="21" fill="var(--cloud-color, #fffdf9)" />
              <circle cx="106" cy="34" r="15" fill="var(--cloud-color, #fffdf9)" />
              <rect x="34" y="30" width="72" height="18" rx="9" fill="var(--cloud-color, #fffdf9)" />
            </g>
          )}
          {cloud.variant === 3 && (
            <g>
              <ellipse cx="52" cy="37" rx="30" ry="8" fill="var(--cloud-shadow, #e4e9ee)" opacity="0.45" />
              <circle cx="38" cy="32" r="12" fill="var(--cloud-color, #fffdf9)" />
              <circle cx="54" cy="26" r="15" fill="var(--cloud-color, #fffdf9)" />
              <circle cx="69" cy="33" r="11" fill="var(--cloud-color, #fffdf9)" />
              <rect x="38" y="28" width="31" height="14" rx="7" fill="var(--cloud-color, #fffdf9)" />
              <circle cx="103" cy="23" r="9.5" fill="var(--cloud-color, #fffdf9)" opacity="0.88" />
              <circle cx="114" cy="26" r="7.5" fill="var(--cloud-color, #fffdf9)" opacity="0.88" />
            </g>
          )}
        </svg>
      </div>
    ))}
  </>
));
StaticCloudLayer.displayName = 'StaticCloudLayer';

export const SkyAtmosphereOverlay: React.FC<SkyAtmosphereOverlayProps> = ({
  isPaused,
  targetRef
}) => {
  const [snapshot, setSnapshot] = useState<DayNightSnapshot>(() =>
    computeDayNightSnapshot(INITIAL_CYCLE_PROGRESS)
  );

  const elapsedMsRef = useRef<number>(INITIAL_CYCLE_PROGRESS * FULL_CYCLE_DURATION_MS);
  const isPausedRef = useRef<boolean>(isPaused);
  const tintRef = useRef<HTMLDivElement>(null);
  const cloudsWrapperRef = useRef<HTMLDivElement>(null);
  const lastCssCacheRef = useRef<Record<string, string>>({});

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Apply quantized CSS custom properties directly (skipping unchanged values to prevent style thrashing)
  const applyLightingVars = (snap: DayNightSnapshot) => {
    setLiveCycleProgress(snap.progress);
    const el = targetRef.current;
    const cache = lastCssCacheRef.current;

    const setVarIfChanged = (node: HTMLElement | null, key: string, value: string) => {
      if (!node || cache[key] === value) return;
      cache[key] = value;
      node.style.setProperty(key, value);
    };

    if (el) {
      setVarIfChanged(el, '--city-window-opacity', snap.cityWindowOpacity.toFixed(2));
      setVarIfChanged(el, '--city-window-glow', snap.cityWindowGlow.toFixed(2));
      setVarIfChanged(el, '--city-lamp-opacity', snap.cityLampOpacity.toFixed(2));
      setVarIfChanged(el, '--car-headlight-opacity', snap.carHeadlightOpacity.toFixed(2));
      setVarIfChanged(el, '--board-backdrop-bg', snap.boardBackdropBg);
      setVarIfChanged(el, '--coord-text-color', snap.coordTextColor);
      setVarIfChanged(el, '--empty-cell-bg', snap.emptyCellBg);
      setVarIfChanged(el, '--empty-grid-border', snap.emptyGridBorder);
      setVarIfChanged(el, '--empty-terrain-opacity', snap.emptyTerrainOpacity.toFixed(2));
      setVarIfChanged(el, '--city-tile-shade', snap.cityTileShadeOpacity.toFixed(2));
      setVarIfChanged(el, '--city-night-rim-color', snap.cityNightRimColor);
      setVarIfChanged(el, '--diorama-plinth-top', snap.dioramaPlinthTop);
      setVarIfChanged(el, '--diorama-plinth-border', snap.dioramaPlinthBorder);
      setVarIfChanged(el, '--diorama-plinth-south', snap.dioramaPlinthSouth);
      setVarIfChanged(el, '--diorama-plinth-east', snap.dioramaPlinthEast);
      setVarIfChanged(el, '--diorama-plinth-north', snap.dioramaPlinthNorth);
      setVarIfChanged(el, '--diorama-plinth-west', snap.dioramaPlinthWest);
      setVarIfChanged(el, '--diorama-plinth-shadow', snap.dioramaPlinthShadow);
      setVarIfChanged(el, '--diorama-wall-tint', snap.dioramaWallTint);
      setVarIfChanged(el, '--diorama-wall-shade', snap.dioramaWallShadeOpacity.toFixed(2));
      const sunSheen = 0.13 - snap.cityWindowOpacity * 0.12;
      setVarIfChanged(el, '--tile-sun-sheen', sunSheen.toFixed(2));
    }

    // Update single atmospheric warm-hour tint directly via ref & hide completely at Night (zero fullscreen overdraw!)
    const tintEl = tintRef.current;
    if (tintEl) {
      if (snap.ambientTintAlpha <= 0.01) {
        if (cache['tintHidden'] !== '1') {
          cache['tintHidden'] = '1';
          tintEl.style.display = 'none';
        }
      } else {
        if (cache['tintHidden'] !== '0') {
          cache['tintHidden'] = '0';
          tintEl.style.display = 'block';
        }
        if (cache['tintBg'] !== snap.ambientTintRgba) {
          cache['tintBg'] = snap.ambientTintRgba;
          tintEl.style.backgroundColor = snap.ambientTintRgba;
        }
        if (cache['tintGlow'] !== snap.ambientGlowCss) {
          cache['tintGlow'] = snap.ambientGlowCss;
          tintEl.style.backgroundImage = snap.ambientGlowCss;
        }
      }
    }

    // Update cloud palette directly via CSS variables on the single cloud wrapper (zero React re-renders)
    const cloudsEl = cloudsWrapperRef.current;
    if (cloudsEl) {
      setVarIfChanged(cloudsEl, '--cloud-color', snap.cloudColor);
      setVarIfChanged(cloudsEl, '--cloud-shadow', snap.cloudShadowColor);
      const cloudOp = snap.cloudOpacityScale.toFixed(2);
      if (cache['cloudOp'] !== cloudOp) {
        cache['cloudOp'] = cloudOp;
        cloudsEl.style.opacity = cloudOp;
      }
    }
  };

  useEffect(() => {
    // Initialize CSS vars immediately on mount
    const initSnap = computeDayNightSnapshot(elapsedMsRef.current / FULL_CYCLE_DURATION_MS);
    applyLightingVars(initSnap);

    let rafId = 0;
    let lastNow = performance.now();
    let lastDomUpdate = 0;
    let lastBadgeUpdate = 0;

    const tick = (now: number) => {
      const rawDt = now - lastNow;
      lastNow = now;

      if (!isPausedRef.current && rawDt > 0) {
        const safeDt = Math.min(rawDt, 250);
        elapsedMsRef.current = (elapsedMsRef.current + safeDt) % FULL_CYCLE_DURATION_MS;

        // Smooth 2 Hz quantized CSS var updates (zero React re-renders on grid/blocks/clouds)
        if (now - lastDomUpdate >= 500) {
          lastDomUpdate = now;
          const nextSnap = computeDayNightSnapshot(elapsedMsRef.current / FULL_CYCLE_DURATION_MS);
          applyLightingVars(nextSnap);

          // Tiny celestial badge only needs ~1.25 Hz React state updates
          if (now - lastBadgeUpdate >= 800) {
            lastBadgeUpdate = now;
            setSnapshot(nextSnap);
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [targetRef]);

  const sunPos = pointOnSkyArc(snapshot.sunArcT);
  const moonPos = pointOnSkyArc(snapshot.moonArcT);

  return (
    <>
      {/* 1. Single Consolidated Atmospheric Lighting Tint (auto-hidden at Night for zero fullscreen overdraw) */}
      <div
        ref={tintRef}
        className="absolute inset-0 pointer-events-none z-[26]"
        aria-hidden="true"
      />

      {/* 2. Multi-Height Two-Way Soft Drifting Clouds (Static Memoized SVGs, Zero React Re-renders) */}
      <div
        ref={cloudsWrapperRef}
        className="absolute inset-0 pointer-events-none overflow-hidden z-[27]"
        aria-hidden="true"
      >
        <StaticCloudLayer />
      </div>

      {/* 3. Borderless, Text-Free Celestial Sun/Moon Arc Horizon Indicator (Top-Right, Seamlessly Blended) */}
      <div
        className="fixed top-2.5 right-3 sm:top-3.5 sm:right-4 z-[35] pointer-events-none select-none"
        aria-hidden="true"
      >
        <div
          className="relative overflow-hidden rounded-full"
          style={{
            width: '116px',
            height: '52px',
            background: snapshot.skyBadgeGradient,
            WebkitMaskImage:
              'radial-gradient(ellipse 86% 86% at 50% 52%, rgba(0,0,0,1) 62%, rgba(0,0,0,0) 100%)',
            maskImage:
              'radial-gradient(ellipse 86% 86% at 50% 52%, rgba(0,0,0,1) 62%, rgba(0,0,0,0) 100%)'
          }}
        >
          <svg viewBox="0 0 110 46" className="w-full h-full block">
            {/* Soft Dotted Celestial Path */}
            <path
              d="M 12 44 A 43 31 0 0 1 98 44"
              fill="none"
              stroke="rgba(255, 253, 249, 0.36)"
              strokeWidth="1.1"
              strokeDasharray="2.5 3"
            />

            {/* Tiny Twinkling Stars at Night */}
            {snapshot.starOpacity > 0.02 && (
              <g style={{ opacity: snapshot.starOpacity }}>
                <circle
                  cx="24"
                  cy="13"
                  r="1.1"
                  fill="#fffbe6"
                  className="celestial-star-twinkle"
                  style={{ animationDelay: '0s' }}
                />
                <circle
                  cx="45"
                  cy="8"
                  r="0.95"
                  fill="#fffbe6"
                  className="celestial-star-twinkle"
                  style={{ animationDelay: '0.9s' }}
                />
                <circle
                  cx="78"
                  cy="12"
                  r="1.15"
                  fill="#fffbe6"
                  className="celestial-star-twinkle"
                  style={{ animationDelay: '1.7s' }}
                />
                <circle
                  cx="92"
                  cy="21"
                  r="0.85"
                  fill="#fffbe6"
                  className="celestial-star-twinkle"
                  style={{ animationDelay: '0.4s' }}
                />
              </g>
            )}

            {/* Animated Rising -> Zenith -> Setting Sun */}
            {snapshot.sunOpacity > 0.01 && (
              <g
                transform={`translate(${sunPos.x.toFixed(2)}, ${sunPos.y.toFixed(2)})`}
                style={{ opacity: snapshot.sunOpacity }}
              >
                <circle cx="0" cy="0" r="11" fill={snapshot.sunHaloColor} />
                <circle cx="0" cy="0" r="7" fill={snapshot.sunColor} />
                <circle cx="-1.5" cy="-1.5" r="2.6" fill="#fffdf6" opacity="0.7" />
              </g>
            )}

            {/* Animated Soft Glowing Crescent Moon at Night */}
            {snapshot.moonOpacity > 0.01 && (
              <g
                transform={`translate(${moonPos.x.toFixed(2)}, ${moonPos.y.toFixed(2)})`}
                style={{ opacity: snapshot.moonOpacity }}
              >
                <circle cx="0" cy="0" r="10.5" fill="rgba(224, 236, 255, 0.24)" />
                {/* Crisp crescent path */}
                <path
                  d="M 1.8 -5.8 A 6 6 0 1 0 5.5 3.6 A 4.8 4.8 0 1 1 1.8 -5.8 Z"
                  fill="#fdf6dc"
                />
              </g>
            )}

            {/* Cozy Soft Rolling Tabletop Hills Silhouette */}
            <path
              d="M 0 46 L 0 38 Q 24 31 50 38 T 110 36 L 110 46 Z"
              fill={snapshot.hillBackColor}
              opacity="0.85"
            />
            <path
              d="M 0 46 L 0 41 Q 36 35 72 41 T 110 39 L 110 46 Z"
              fill={snapshot.hillFrontColor}
            />
          </svg>
        </div>
      </div>
    </>
  );
};
