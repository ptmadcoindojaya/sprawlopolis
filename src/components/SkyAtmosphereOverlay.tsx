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
  { id: 'c1', topPct: 6, widthPx: 142, baseOpacity: 0.3, durationSec: 52, delaySec: -6, direction: 'ltr', variant: 0 },
  { id: 'c2', topPct: 15, widthPx: 96, baseOpacity: 0.25, durationSec: 44, delaySec: -28, direction: 'rtl', variant: 1 },
  { id: 'c3', topPct: 24, widthPx: 158, baseOpacity: 0.27, durationSec: 64, delaySec: -42, direction: 'ltr', variant: 2 },
  { id: 'c4', topPct: 33, widthPx: 82, baseOpacity: 0.24, durationSec: 39, delaySec: -14, direction: 'rtl', variant: 3 },
  { id: 'c5', topPct: 43, widthPx: 126, baseOpacity: 0.23, durationSec: 58, delaySec: -34, direction: 'ltr', variant: 1 },
  { id: 'c6', topPct: 52, widthPx: 108, baseOpacity: 0.24, durationSec: 48, delaySec: -4, direction: 'rtl', variant: 0 },
  { id: 'c7', topPct: 61, widthPx: 152, baseOpacity: 0.25, durationSec: 68, delaySec: -51, direction: 'ltr', variant: 2 },
  { id: 'c8', topPct: 70, widthPx: 92, baseOpacity: 0.23, durationSec: 42, delaySec: -22, direction: 'rtl', variant: 3 },
  { id: 'c9', topPct: 79, widthPx: 132, baseOpacity: 0.24, durationSec: 56, delaySec: -19, direction: 'ltr', variant: 0 },
  { id: 'c10', topPct: 87, widthPx: 78, baseOpacity: 0.21, durationSec: 46, delaySec: -37, direction: 'rtl', variant: 1 }
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

export const SkyAtmosphereOverlay: React.FC<SkyAtmosphereOverlayProps> = ({
  isPaused,
  targetRef
}) => {
  const [snapshot, setSnapshot] = useState<DayNightSnapshot>(() =>
    computeDayNightSnapshot(INITIAL_CYCLE_PROGRESS)
  );

  const elapsedMsRef = useRef<number>(INITIAL_CYCLE_PROGRESS * FULL_CYCLE_DURATION_MS);
  const isPausedRef = useRef<boolean>(isPaused);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Apply CSS lighting custom properties directly to the city board container
  // so 100+ BlockDioramaArt & CityTrafficOverlay elements respond smoothly with ZERO React re-renders
  const applyLightingVars = (snap: DayNightSnapshot) => {
    setLiveCycleProgress(snap.progress);
    const el = targetRef.current;
    if (!el) return;
    el.style.setProperty('--city-window-opacity', snap.cityWindowOpacity.toFixed(3));
    el.style.setProperty('--city-window-glow', snap.cityWindowGlow.toFixed(3));
    el.style.setProperty('--city-lamp-opacity', snap.cityLampOpacity.toFixed(3));
    el.style.setProperty('--car-headlight-opacity', snap.carHeadlightOpacity.toFixed(3));
    el.style.setProperty('--board-backdrop-bg', snap.boardBackdropBg);
    el.style.setProperty('--day-tabletop-glow', snap.dayTabletopGlowOpacity.toFixed(3));
    el.style.setProperty('--night-vignette-opacity', snap.nightVignetteOpacity.toFixed(3));
    el.style.setProperty('--coord-text-color', snap.coordTextColor);
    el.style.setProperty('--empty-cell-bg', snap.emptyCellBg);
    el.style.setProperty('--empty-grid-border', snap.emptyGridBorder);
    el.style.setProperty('--empty-terrain-opacity', snap.emptyTerrainOpacity.toFixed(3));
    el.style.setProperty('--empty-terrain-brightness', snap.emptyTerrainBrightness.toFixed(3));
    el.style.setProperty('--city-surface-brightness', snap.citySurfaceBrightness.toFixed(3));
    el.style.setProperty('--city-surface-saturate', snap.citySurfaceSaturate.toFixed(3));
    el.style.setProperty('--city-surface-contrast', snap.citySurfaceContrast.toFixed(3));
    el.style.setProperty('--city-popout-shadow-alpha', snap.cityPopoutShadowAlpha.toFixed(3));
    el.style.setProperty('--city-night-rim-alpha', snap.cityNightRimAlpha.toFixed(3));
    // Soften tile top-edge bevel & sunlight sheen smoothly during Sunset/Night so tiles merge organically with the board
    const nightFactor = snap.cityWindowOpacity;
    const bevelAlpha = 0.36 - nightFactor * 0.22; // 0.36 day -> 0.14 night
    const sunSheen = 0.13 - nightFactor * 0.12; // 0.13 day -> 0.01 night
    el.style.setProperty('--tile-bevel-alpha', bevelAlpha.toFixed(3));
    el.style.setProperty('--tile-sun-sheen', sunSheen.toFixed(3));
  };

  useEffect(() => {
    // Initialize CSS vars immediately on mount
    applyLightingVars(computeDayNightSnapshot(elapsedMsRef.current / FULL_CYCLE_DURATION_MS));

    let rafId = 0;
    let lastNow = performance.now();
    let lastUiUpdate = 0;

    const tick = (now: number) => {
      const rawDt = now - lastNow;
      lastNow = now;

      if (!isPausedRef.current && rawDt > 0) {
        // Clamp dt so returning from a background tab stays smooth
        const safeDt = Math.min(rawDt, 250);
        elapsedMsRef.current = (elapsedMsRef.current + safeDt) % FULL_CYCLE_DURATION_MS;

        // Throttle React state updates to ~3 Hz (plenty smooth for a 3-minute celestial cycle)
        if (now - lastUiUpdate >= 320) {
          lastUiUpdate = now;
          const nextSnap = computeDayNightSnapshot(elapsedMsRef.current / FULL_CYCLE_DURATION_MS);
          applyLightingVars(nextSnap);
          setSnapshot(nextSnap);
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
      {/* 1. Soft Atmospheric Screen & City Lighting Tint (pointer-events-none, preserves readability) */}
      <div
        className="absolute inset-0 pointer-events-none z-[26] transition-colors duration-300"
        style={{
          backgroundColor: snapshot.ambientTintRgba,
          backgroundImage: snapshot.ambientGlowCss
        }}
        aria-hidden="true"
      />

      {/* 2. Multi-Height Two-Way Soft Drifting Pastel Clouds Above the City Board */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden z-[27]"
        aria-hidden="true"
      >
        {SKY_CLOUDS.map((cloud) => (
          <div
            key={cloud.id}
            className={`absolute left-0 pointer-events-none ${
              cloud.direction === 'ltr' ? 'cloud-drift-ltr' : 'cloud-drift-rtl'
            }`}
            style={{
              top: `${cloud.topPct}%`,
              width: `${cloud.widthPx}px`,
              opacity: Number((cloud.baseOpacity * snapshot.cloudOpacityScale).toFixed(3)),
              animationDuration: `${cloud.durationSec}s`,
              animationDelay: `${cloud.delaySec}s`
            }}
          >
            <svg viewBox="0 0 140 56" className="w-full h-auto overflow-visible">
              {cloud.variant === 0 && (
                <g>
                  <ellipse cx="70" cy="40" rx="50" ry="12" fill={snapshot.cloudShadowColor} opacity="0.52" />
                  <circle cx="38" cy="34" r="16" fill={snapshot.cloudColor} />
                  <circle cx="62" cy="24" r="22" fill={snapshot.cloudColor} />
                  <circle cx="88" cy="28" r="18" fill={snapshot.cloudColor} />
                  <circle cx="106" cy="36" r="13" fill={snapshot.cloudColor} />
                  <rect x="36" y="29" width="70" height="19" rx="9" fill={snapshot.cloudColor} />
                </g>
              )}
              {cloud.variant === 1 && (
                <g>
                  <ellipse cx="68" cy="39" rx="44" ry="10" fill={snapshot.cloudShadowColor} opacity="0.48" />
                  <circle cx="42" cy="33" r="14" fill={snapshot.cloudColor} />
                  <circle cx="66" cy="25" r="19" fill={snapshot.cloudColor} />
                  <circle cx="90" cy="33" r="14" fill={snapshot.cloudColor} />
                  <rect x="42" y="29" width="48" height="16" rx="8" fill={snapshot.cloudColor} />
                </g>
              )}
              {cloud.variant === 2 && (
                <g>
                  <ellipse cx="72" cy="41" rx="54" ry="11" fill={snapshot.cloudShadowColor} opacity="0.48" />
                  <circle cx="34" cy="36" r="14" fill={snapshot.cloudColor} />
                  <circle cx="56" cy="26" r="20" fill={snapshot.cloudColor} />
                  <circle cx="82" cy="23" r="21" fill={snapshot.cloudColor} />
                  <circle cx="106" cy="34" r="15" fill={snapshot.cloudColor} />
                  <rect x="34" y="30" width="72" height="18" rx="9" fill={snapshot.cloudColor} />
                </g>
              )}
              {cloud.variant === 3 && (
                <g>
                  {/* Small twin puffy wisps */}
                  <ellipse cx="52" cy="37" rx="30" ry="8" fill={snapshot.cloudShadowColor} opacity="0.45" />
                  <circle cx="38" cy="32" r="12" fill={snapshot.cloudColor} />
                  <circle cx="54" cy="26" r="15" fill={snapshot.cloudColor} />
                  <circle cx="69" cy="33" r="11" fill={snapshot.cloudColor} />
                  <rect x="38" y="28" width="31" height="14" rx="7" fill={snapshot.cloudColor} />
                  <circle cx="103" cy="23" r="9.5" fill={snapshot.cloudColor} opacity="0.88" />
                  <circle cx="114" cy="26" r="7.5" fill={snapshot.cloudColor} opacity="0.88" />
                </g>
              )}
            </svg>
          </div>
        ))}
      </div>

      {/* 3. Non-Numeric Celestial Sun/Moon Arc Horizon Indicator (Top-Right, Unobtrusive, Zero Clocks/Digits) */}
      <div
        className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[35] pointer-events-none select-none"
        aria-hidden="true"
      >
        <div
          className="rounded-2xl overflow-hidden shadow-md backdrop-blur-md transition-colors duration-500"
          style={{
            width: '112px',
            border: `1.5px solid ${snapshot.skyBadgeBorder}`,
            boxShadow: '0 6px 16px rgba(41, 37, 36, 0.14), inset 0 1px 0 rgba(255,255,255,0.45)'
          }}
        >
          {/* Miniature Tabletop Sky Dome */}
          <div
            className="relative w-full h-[46px] overflow-hidden"
            style={{ background: snapshot.skyBadgeGradient }}
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

          {/* Minimal Non-Numeric Phase Label (Pagi / Siang / Sore / Malam) */}
          <div
            className="px-2 py-0.5 text-center text-[10px] font-bold tracking-wide transition-colors duration-500"
            style={{
              backgroundColor:
                snapshot.phase === 'night'
                  ? 'rgba(28, 39, 74, 0.86)'
                  : 'rgba(251, 248, 242, 0.92)',
              color: snapshot.skyBadgeTextColor
            }}
          >
            {snapshot.phaseLabel}
          </div>
        </div>
      </div>
    </>
  );
};
