/**
 * Continuous Playtime-Based Day/Night Cycle Engine (No Clocks / No Numeric Timers)
 * Smoothly interpolates Morning -> Day -> Sunset -> Night -> Morning over ~3 minutes of active play.
 */

export type TimePhase = 'morning' | 'day' | 'sunset' | 'night';

export interface DayNightSnapshot {
  progress: number; // 0..1 continuous cycle position
  phase: TimePhase;
  phaseLabel: string;
  // Dynamic lighting intensities (0..1)
  cityWindowOpacity: number;
  cityWindowGlow: number;
  cityLampOpacity: number;
  carHeadlightOpacity: number;
  // Atmospheric screen/board lighting
  ambientTintRgba: string;
  ambientTintAlpha: number;
  ambientGlowCss: string;
  boardBackdropBg: string;
  coordTextColor: string;
  emptyCellBg: string;
  emptyGridBorder: string;
  emptyTerrainOpacity: number;
  // Lightweight GPU-friendly city block night shading & rim (zero CSS filter)
  cityTileShadeOpacity: number;
  cityNightRimColor: string;
  // Tahap 4: Extruded diorama block wall & floating plinth day/night lighting tokens
  dioramaPlinthTop: string;
  dioramaPlinthBorder: string;
  dioramaPlinthSouth: string;
  dioramaPlinthEast: string;
  dioramaPlinthNorth: string;
  dioramaPlinthWest: string;
  dioramaPlinthShadow: string;
  dioramaWallTint: string;
  dioramaWallShadeOpacity: number;
  // Cloud palette
  cloudColor: string;
  cloudShadowColor: string;
  cloudOpacityScale: number;
  // Celestial indicator (non-numeric)
  sunArcT: number; // 0 (left horizon) -> 0.5 (zenith) -> 1 (right horizon)
  sunOpacity: number;
  sunColor: string;
  sunHaloColor: string;
  moonArcT: number; // 0 (left horizon) -> 0.5 (zenith) -> 1 (right horizon)
  moonOpacity: number;
  starOpacity: number;
  skyBadgeGradient: string;
  skyBadgeBorder: string;
  skyBadgeTextColor: string;
  hillBackColor: string;
  hillFrontColor: string;
}

export const FULL_CYCLE_DURATION_MS = 180_000; // ~3 minutes of active gameplay per full cycle
export const INITIAL_CYCLE_PROGRESS = 0.06; // Begin in fresh golden-peach Morning

export interface TrafficProfile {
  /** Normalized traffic density 0.1..1.0 (Pagi & Sore = 1.0 rush hour, Siang = 0.58, Malam = 0.28, Tengah Malam = 0.12) */
  densityFactor: number;
  /** Hard cap on concurrent cars when late night / midnight (null = use densityFactor) */
  maxActiveCap: number | null;
  /** Minimum & maximum seconds a waiting car pauses before entering the road */
  spawnWaitMinSec: number;
  spawnWaitMaxSec: number;
  /** True during Morning & Sunset rush hours */
  isRushHour: boolean;
}

let liveCycleProgress: number = INITIAL_CYCLE_PROGRESS;

export function setLiveCycleProgress(progress: number): void {
  liveCycleProgress = ((progress % 1) + 1) % 1;
}

export function getLiveCycleProgress(): number {
  return liveCycleProgress;
}

export function getTrafficProfileFromProgress(rawProgress: number): TrafficProfile {
  const p = ((rawProgress % 1) + 1) % 1;

  // Morning Rush Hour (Pagi: 0.05..0.25)
  if (p >= 0.05 && p < 0.25) {
    return {
      densityFactor: 1.0,
      maxActiveCap: null,
      spawnWaitMinSec: 0.35,
      spawnWaitMaxSec: 1.05,
      isRushHour: true
    };
  }

  // Daytime Normal (Siang: 0.25..0.55)
  if (p >= 0.25 && p < 0.55) {
    return {
      densityFactor: 0.58,
      maxActiveCap: null,
      spawnWaitMinSec: 1.1,
      spawnWaitMaxSec: 2.4,
      isRushHour: false
    };
  }

  // Evening / Sunset Rush Hour (Sore: 0.55..0.76)
  if (p >= 0.55 && p < 0.76) {
    return {
      densityFactor: 1.0,
      maxActiveCap: null,
      spawnWaitMinSec: 0.35,
      spawnWaitMaxSec: 0.95,
      isRushHour: true
    };
  }

  // Midnight / Late Night Very Sparse (Tengah Malam / Dini Hari: 0.85..0.95)
  if (p >= 0.85 && p < 0.95) {
    return {
      densityFactor: 0.12,
      maxActiveCap: 2,
      spawnWaitMinSec: 3.8,
      spawnWaitMaxSec: 7.2,
      isRushHour: false
    };
  }

  // Quiet Evening & Pre-Dawn Night (Malam: 0.76..0.85 and 0.95..1.00 / 0.00..0.05)
  return {
    densityFactor: 0.28,
    maxActiveCap: null,
    spawnWaitMinSec: 2.2,
    spawnWaitMaxSec: 4.4,
    isRushHour: false
  };
}

export function getLiveTrafficProfile(): TrafficProfile {
  return getTrafficProfileFromProgress(liveCycleProgress);
}

interface ColorRGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface Keyframe {
  t: number;
  tint: ColorRGBA;
  glow: ColorRGBA;
  glowX: number; // %
  glowY: number; // %
  boardBackdropRgb: [number, number, number];
  cloudRgb: [number, number, number];
  cloudShadowRgb: [number, number, number];
  cloudOpacity: number;
  windowOpacity: number;
  windowGlow: number;
  lampOpacity: number;
  headlightOpacity: number;
  skyTop: [number, number, number];
  skyBottom: [number, number, number];
  hillBack: [number, number, number];
  hillFront: [number, number, number];
  coordRgba: ColorRGBA;
  emptyCellBg: ColorRGBA;
  emptyGridBorder: ColorRGBA;
  emptyTerrainOpacity: number;
  cityTileShadeOpacity: number;
  cityNightRimAlpha: number;
}

const KEYFRAMES: Keyframe[] = [
  // 0.00: Pre-dawn / Sunrise edge
  {
    t: 0.0,
    tint: { r: 238, g: 176, b: 136, a: 0.08 },
    glow: { r: 255, g: 192, b: 138, a: 0.18 },
    glowX: 16,
    glowY: 26,
    boardBackdropRgb: [198, 188, 178],
    cloudRgb: [255, 228, 208],
    cloudShadowRgb: [212, 178, 168],
    cloudOpacity: 0.84,
    windowOpacity: 0.45,
    windowGlow: 0.4,
    lampOpacity: 0.48,
    headlightOpacity: 0.22,
    skyTop: [122, 152, 198],
    skyBottom: [248, 206, 172],
    hillBack: [130, 154, 134],
    hillFront: [104, 136, 108],
    coordRgba: { r: 96, g: 86, b: 74, a: 0.72 },
    emptyCellBg: { r: 150, g: 140, b: 130, a: 0.54 },
    emptyGridBorder: { r: 108, g: 98, b: 86, a: 0.34 },
    emptyTerrainOpacity: 0.42,
    cityTileShadeOpacity: 0.08,
    cityNightRimAlpha: 0.05
  },
  // 0.12: Cozy Bright Morning
  {
    t: 0.12,
    tint: { r: 255, g: 222, b: 174, a: 0.08 },
    glow: { r: 255, g: 228, b: 168, a: 0.18 },
    glowX: 24,
    glowY: 18,
    boardBackdropRgb: [239, 233, 220],
    cloudRgb: [255, 250, 242],
    cloudShadowRgb: [236, 224, 208],
    cloudOpacity: 0.96,
    windowOpacity: 0.0,
    windowGlow: 0.0,
    lampOpacity: 0.0,
    headlightOpacity: 0.0,
    skyTop: [148, 196, 230],
    skyBottom: [253, 234, 204],
    hillBack: [152, 188, 148],
    hillFront: [122, 166, 122],
    coordRgba: { r: 92, g: 83, b: 68, a: 0.74 },
    emptyCellBg: { r: 178, g: 168, b: 145, a: 0.45 },
    emptyGridBorder: { r: 116, g: 106, b: 88, a: 0.34 },
    emptyTerrainOpacity: 0.56,
    cityTileShadeOpacity: 0.0,
    cityNightRimAlpha: 0.0
  },
  // 0.26: Clear Fresh Day entry
  {
    t: 0.26,
    tint: { r: 255, g: 252, b: 244, a: 0.0 },
    glow: { r: 255, g: 248, b: 224, a: 0.08 },
    glowX: 44,
    glowY: 10,
    boardBackdropRgb: [239, 233, 220],
    cloudRgb: [255, 253, 249],
    cloudShadowRgb: [228, 233, 238],
    cloudOpacity: 1.0,
    windowOpacity: 0.0,
    windowGlow: 0.0,
    lampOpacity: 0.0,
    headlightOpacity: 0.0,
    skyTop: [128, 188, 230],
    skyBottom: [222, 241, 248],
    hillBack: [152, 194, 152],
    hillFront: [118, 168, 124],
    coordRgba: { r: 88, g: 79, b: 65, a: 0.74 },
    emptyCellBg: { r: 174, g: 164, b: 142, a: 0.47 },
    emptyGridBorder: { r: 112, g: 102, b: 84, a: 0.35 },
    emptyTerrainOpacity: 0.56,
    cityTileShadeOpacity: 0.0,
    cityNightRimAlpha: 0.0
  },
  // 0.45: Bright Sunlit Midday
  {
    t: 0.45,
    tint: { r: 255, g: 252, b: 246, a: 0.0 },
    glow: { r: 255, g: 250, b: 230, a: 0.06 },
    glowX: 58,
    glowY: 10,
    boardBackdropRgb: [239, 233, 220],
    cloudRgb: [255, 253, 250],
    cloudShadowRgb: [226, 232, 238],
    cloudOpacity: 1.0,
    windowOpacity: 0.0,
    windowGlow: 0.0,
    lampOpacity: 0.0,
    headlightOpacity: 0.0,
    skyTop: [124, 186, 228],
    skyBottom: [226, 243, 248],
    hillBack: [148, 190, 148],
    hillFront: [116, 164, 122],
    coordRgba: { r: 88, g: 79, b: 65, a: 0.74 },
    emptyCellBg: { r: 174, g: 164, b: 142, a: 0.47 },
    emptyGridBorder: { r: 112, g: 102, b: 84, a: 0.35 },
    emptyTerrainOpacity: 0.56,
    cityTileShadeOpacity: 0.0,
    cityNightRimAlpha: 0.0
  },
  // 0.58: Golden Late Afternoon / Sunset Start
  {
    t: 0.58,
    tint: { r: 244, g: 170, b: 96, a: 0.09 },
    glow: { r: 255, g: 192, b: 114, a: 0.18 },
    glowX: 74,
    glowY: 20,
    boardBackdropRgb: [226, 212, 192],
    cloudRgb: [255, 232, 206],
    cloudShadowRgb: [226, 176, 146],
    cloudOpacity: 0.92,
    windowOpacity: 0.32,
    windowGlow: 0.28,
    lampOpacity: 0.36,
    headlightOpacity: 0.28,
    skyTop: [152, 166, 206],
    skyBottom: [249, 202, 154],
    hillBack: [144, 164, 132],
    hillFront: [114, 142, 108],
    coordRgba: { r: 86, g: 71, b: 56, a: 0.76 },
    emptyCellBg: { r: 158, g: 140, b: 120, a: 0.52 },
    emptyGridBorder: { r: 106, g: 88, b: 70, a: 0.36 },
    emptyTerrainOpacity: 0.48,
    cityTileShadeOpacity: 0.04,
    cityNightRimAlpha: 0.02
  },
  // 0.69: Cozy Golden-Amber Sunset Peak
  {
    t: 0.69,
    tint: { r: 224, g: 120, b: 72, a: 0.12 },
    glow: { r: 255, g: 154, b: 88, a: 0.2 },
    glowX: 84,
    glowY: 30,
    boardBackdropRgb: [164, 142, 134],
    cloudRgb: [244, 192, 168],
    cloudShadowRgb: [182, 126, 122],
    cloudOpacity: 0.82,
    windowOpacity: 0.78,
    windowGlow: 0.76,
    lampOpacity: 0.82,
    headlightOpacity: 0.64,
    skyTop: [112, 114, 168],
    skyBottom: [244, 164, 126],
    hillBack: [118, 120, 116],
    hillFront: [90, 100, 96],
    coordRgba: { r: 236, g: 214, b: 196, a: 0.58 },
    emptyCellBg: { r: 106, g: 92, b: 96, a: 0.68 },
    emptyGridBorder: { r: 162, g: 138, b: 136, a: 0.26 },
    emptyTerrainOpacity: 0.32,
    cityTileShadeOpacity: 0.16,
    cityNightRimAlpha: 0.08
  },
  // 0.78: Twilight Dusk -> Rich Midnight Night Entry (zero fullscreen fog, deep navy outskirts)
  {
    t: 0.78,
    tint: { r: 10, g: 16, b: 36, a: 0.0 },
    glow: { r: 78, g: 112, b: 196, a: 0.0 },
    glowX: 30,
    glowY: 22,
    boardBackdropRgb: [20, 27, 46],
    cloudRgb: [52, 66, 104],
    cloudShadowRgb: [30, 40, 70],
    cloudOpacity: 0.44,
    windowOpacity: 0.98,
    windowGlow: 0.96,
    lampOpacity: 0.98,
    headlightOpacity: 0.96,
    skyTop: [28, 38, 76],
    skyBottom: [64, 78, 126],
    hillBack: [48, 62, 88],
    hillFront: [34, 48, 70],
    coordRgba: { r: 158, g: 178, b: 220, a: 0.44 },
    emptyCellBg: { r: 24, g: 31, b: 52, a: 0.94 },
    emptyGridBorder: { r: 118, g: 142, b: 196, a: 0.18 },
    emptyTerrainOpacity: 0.14,
    cityTileShadeOpacity: 0.3,
    cityNightRimAlpha: 0.22
  },
  // 0.88: Deep Cozy Starry Midnight (deep #161c2e outskirts, 0 fullscreen overdraw, radiant warm lights)
  {
    t: 0.88,
    tint: { r: 10, g: 16, b: 36, a: 0.0 },
    glow: { r: 84, g: 118, b: 204, a: 0.0 },
    glowX: 52,
    glowY: 16,
    boardBackdropRgb: [16, 22, 38],
    cloudRgb: [36, 48, 82],
    cloudShadowRgb: [22, 30, 56],
    cloudOpacity: 0.38,
    windowOpacity: 1.0,
    windowGlow: 1.0,
    lampOpacity: 1.0,
    headlightOpacity: 1.0,
    skyTop: [18, 26, 54],
    skyBottom: [42, 56, 98],
    hillBack: [38, 52, 78],
    hillFront: [26, 38, 60],
    coordRgba: { r: 164, g: 184, b: 226, a: 0.46 },
    emptyCellBg: { r: 22, g: 28, b: 46, a: 0.96 },
    emptyGridBorder: { r: 122, g: 148, b: 204, a: 0.19 },
    emptyTerrainOpacity: 0.12,
    cityTileShadeOpacity: 0.35,
    cityNightRimAlpha: 0.26
  },
  // 0.96: Late Night softening gently toward Dawn
  {
    t: 0.96,
    tint: { r: 28, g: 34, b: 68, a: 0.02 },
    glow: { r: 214, g: 162, b: 148, a: 0.08 },
    glowX: 20,
    glowY: 28,
    boardBackdropRgb: [58, 66, 94],
    cloudRgb: [86, 94, 128],
    cloudShadowRgb: [56, 62, 92],
    cloudOpacity: 0.52,
    windowOpacity: 0.8,
    windowGlow: 0.76,
    lampOpacity: 0.82,
    headlightOpacity: 0.7,
    skyTop: [46, 62, 106],
    skyBottom: [142, 132, 158],
    hillBack: [68, 84, 100],
    hillFront: [50, 68, 82],
    coordRgba: { r: 182, g: 194, b: 222, a: 0.52 },
    emptyCellBg: { r: 54, g: 62, b: 86, a: 0.82 },
    emptyGridBorder: { r: 136, g: 152, b: 190, a: 0.22 },
    emptyTerrainOpacity: 0.22,
    cityTileShadeOpacity: 0.22,
    cityNightRimAlpha: 0.14
  },
  // 1.00: Seamless wrap to 0.00
  {
    t: 1.0,
    tint: { r: 238, g: 176, b: 136, a: 0.08 },
    glow: { r: 255, g: 192, b: 138, a: 0.18 },
    glowX: 16,
    glowY: 26,
    boardBackdropRgb: [198, 188, 178],
    cloudRgb: [255, 228, 208],
    cloudShadowRgb: [212, 178, 168],
    cloudOpacity: 0.84,
    windowOpacity: 0.45,
    windowGlow: 0.4,
    lampOpacity: 0.48,
    headlightOpacity: 0.22,
    skyTop: [122, 152, 198],
    skyBottom: [248, 206, 172],
    hillBack: [130, 154, 134],
    hillFront: [104, 136, 108],
    coordRgba: { r: 96, g: 86, b: 74, a: 0.72 },
    emptyCellBg: { r: 150, g: 140, b: 130, a: 0.54 },
    emptyGridBorder: { r: 108, g: 98, b: 86, a: 0.34 },
    emptyTerrainOpacity: 0.42,
    cityTileShadeOpacity: 0.08,
    cityNightRimAlpha: 0.05
  }
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function lerpRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): string {
  const r = Math.round(lerp(a[0], b[0], t));
  const g = Math.round(lerp(a[1], b[1], t));
  const bl = Math.round(lerp(a[2], b[2], t));
  return `rgb(${r}, ${g}, ${bl})`;
}

function lerpRgba(a: ColorRGBA, b: ColorRGBA, t: number): string {
  const r = Math.round(lerp(a.r, b.r, t));
  const g = Math.round(lerp(a.g, b.g, t));
  const bl = Math.round(lerp(a.b, b.b, t));
  const al = lerp(a.a, b.a, t);
  return `rgba(${r}, ${g}, ${bl}, ${al.toFixed(2)})`;
}

export function getPhaseFromProgress(progress: number): { phase: TimePhase; label: string } {
  const p = ((progress % 1) + 1) % 1;
  if (p < 0.25) return { phase: 'morning', label: 'Pagi' };
  if (p < 0.55) return { phase: 'day', label: 'Siang' };
  if (p < 0.76) return { phase: 'sunset', label: 'Sore' };
  return { phase: 'night', label: 'Malam' };
}

export function computeDayNightSnapshot(rawProgress: number): DayNightSnapshot {
  const progress = ((rawProgress % 1) + 1) % 1;

  let k0 = KEYFRAMES[0];
  let k1 = KEYFRAMES[1];
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (progress >= KEYFRAMES[i].t && progress <= KEYFRAMES[i + 1].t) {
      k0 = KEYFRAMES[i];
      k1 = KEYFRAMES[i + 1];
      break;
    }
  }

  const span = Math.max(0.0001, k1.t - k0.t);
  const localT = smoothstep((progress - k0.t) / span);

  const { phase, label } = getPhaseFromProgress(progress);

  const sunSpan = 0.76;
  const sunArcT = Math.max(0, Math.min(1, progress / sunSpan));
  let sunOpacity = 0;
  if (progress < sunSpan) {
    const fadeIn = smoothstep(progress / 0.045);
    const fadeOut = 1 - smoothstep((progress - 0.705) / 0.055);
    sunOpacity = Math.min(fadeIn, fadeOut);
  }

  let sunColor = '#ffe484';
  let sunHaloColor = 'rgba(255, 232, 148, 0.55)';
  if (progress < 0.22) {
    sunColor = '#ffd08a';
    sunHaloColor = 'rgba(255, 202, 134, 0.58)';
  } else if (progress >= 0.56) {
    sunColor = '#ff9f68';
    sunHaloColor = 'rgba(255, 148, 92, 0.65)';
  }

  const moonStart = 0.74;
  const moonSpan = 1.0 - moonStart;
  const moonArcT =
    progress >= moonStart ? Math.max(0, Math.min(1, (progress - moonStart) / moonSpan)) : 0;
  let moonOpacity = 0;
  if (progress >= moonStart) {
    const fadeIn = smoothstep((progress - moonStart) / 0.045);
    const fadeOut = 1 - smoothstep((progress - 0.955) / 0.045);
    moonOpacity = Math.min(fadeIn, fadeOut);
  }

  const starOpacity =
    progress >= 0.74
      ? Math.min(smoothstep((progress - 0.75) / 0.06), 1 - smoothstep((progress - 0.94) / 0.05))
      : 0;

  const glowAlpha = lerp(k0.glow.a, k1.glow.a, localT);
  const tintAlpha = lerp(k0.tint.a, k1.tint.a, localT);
  const glowX = lerp(k0.glowX, k1.glowX, localT).toFixed(0);
  const glowY = lerp(k0.glowY, k1.glowY, localT).toFixed(0);
  const glowCenter = lerpRgba(k0.glow, k1.glow, localT);
  const glowZero = `rgba(${Math.round(lerp(k0.glow.r, k1.glow.r, localT))}, ${Math.round(
    lerp(k0.glow.g, k1.glow.g, localT)
  )}, ${Math.round(lerp(k0.glow.b, k1.glow.b, localT))}, 0)`;

  const skyTop = lerpRgb(k0.skyTop, k1.skyTop, localT);
  const skyBottom = lerpRgb(k0.skyBottom, k1.skyBottom, localT);

  const isDarkBadge = progress >= 0.73 && progress <= 0.97;
  const rimAlpha = lerp(k0.cityNightRimAlpha, k1.cityNightRimAlpha, localT);

  // Derive smooth day -> golden sunset -> starry night palette for extruded diorama walls & floating plinth
  const nightMix = Math.min(1, Math.max(0, lerp(k0.cityTileShadeOpacity, k1.cityTileShadeOpacity, localT) / 0.35));
  const sunsetMix = Math.min(
    1,
    Math.max(
      0,
      phase === 'sunset'
        ? Math.sin(((progress - 0.55) / 0.21) * Math.PI)
        : phase === 'morning' && progress < 0.14
        ? (0.14 - progress) / 0.14 * 0.45
        : 0
    )
  );

  const blendTriplet = (
    dayRgb: [number, number, number],
    sunsetRgb: [number, number, number],
    nightRgb: [number, number, number]
  ): string => {
    const mid: [number, number, number] = [
      lerp(dayRgb[0], sunsetRgb[0], sunsetMix),
      lerp(dayRgb[1], sunsetRgb[1], sunsetMix),
      lerp(dayRgb[2], sunsetRgb[2], sunsetMix)
    ];
    return lerpRgb(mid, nightRgb, nightMix);
  };

  const dioramaPlinthTop = blendTriplet([227, 218, 200], [192, 162, 142], [35, 45, 74]);
  const dioramaPlinthBorder = blendTriplet([201, 188, 166], [156, 126, 110], [59, 75, 117]);
  const dioramaPlinthSouth = blendTriplet([184, 168, 142], [142, 110, 96], [26, 34, 56]);
  const dioramaPlinthEast = blendTriplet([150, 134, 109], [112, 86, 76], [18, 24, 42]);
  const dioramaPlinthNorth = blendTriplet([197, 182, 157], [156, 124, 108], [36, 47, 77]);
  const dioramaPlinthWest = blendTriplet([171, 155, 130], [128, 98, 86], [24, 32, 53]);
  const dioramaPlinthShadow = `rgba(${Math.round(lerp(38, 5, nightMix))}, ${Math.round(
    lerp(30, 8, nightMix)
  )}, ${Math.round(lerp(20, 18, nightMix))}, ${lerp(0.24, 0.62, nightMix).toFixed(2)})`;
  const dioramaWallTint = lerpRgb([76, 36, 22], [9, 16, 38], Math.min(1, nightMix * 1.15));
  const dioramaWallShadeOpacity = Math.min(0.5, nightMix * 0.48 + sunsetMix * 0.14 * (1 - nightMix));

  return {
    progress,
    phase,
    phaseLabel: label,
    cityWindowOpacity: lerp(k0.windowOpacity, k1.windowOpacity, localT),
    cityWindowGlow: lerp(k0.windowGlow, k1.windowGlow, localT),
    cityLampOpacity: lerp(k0.lampOpacity, k1.lampOpacity, localT),
    carHeadlightOpacity: lerp(k0.headlightOpacity, k1.headlightOpacity, localT),
    ambientTintRgba: lerpRgba(k0.tint, k1.tint, localT),
    ambientTintAlpha: Math.max(tintAlpha, glowAlpha),
    ambientGlowCss:
      glowAlpha > 0.01
        ? `radial-gradient(ellipse 68% 58% at ${glowX}% ${glowY}%, ${glowCenter} 0%, ${glowZero} 75%)`
        : 'none',
    boardBackdropBg: lerpRgb(k0.boardBackdropRgb, k1.boardBackdropRgb, localT),
    coordTextColor: lerpRgba(k0.coordRgba, k1.coordRgba, localT),
    emptyCellBg: lerpRgba(k0.emptyCellBg, k1.emptyCellBg, localT),
    emptyGridBorder: lerpRgba(k0.emptyGridBorder, k1.emptyGridBorder, localT),
    emptyTerrainOpacity: lerp(k0.emptyTerrainOpacity, k1.emptyTerrainOpacity, localT),
    cityTileShadeOpacity: lerp(k0.cityTileShadeOpacity, k1.cityTileShadeOpacity, localT),
    cityNightRimColor:
      rimAlpha > 0.01 ? `rgba(148, 176, 236, ${rimAlpha.toFixed(2)})` : 'transparent',
    dioramaPlinthTop,
    dioramaPlinthBorder,
    dioramaPlinthSouth,
    dioramaPlinthEast,
    dioramaPlinthNorth,
    dioramaPlinthWest,
    dioramaPlinthShadow,
    dioramaWallTint,
    dioramaWallShadeOpacity,
    cloudColor: lerpRgb(k0.cloudRgb, k1.cloudRgb, localT),
    cloudShadowColor: lerpRgb(k0.cloudShadowRgb, k1.cloudShadowRgb, localT),
    cloudOpacityScale: lerp(k0.cloudOpacity, k1.cloudOpacity, localT),
    sunArcT,
    sunOpacity,
    sunColor,
    sunHaloColor,
    moonArcT,
    moonOpacity,
    starOpacity,
    skyBadgeGradient: `linear-gradient(180deg, ${skyTop} 0%, ${skyBottom} 100%)`,
    skyBadgeBorder: isDarkBadge ? 'rgba(164, 182, 224, 0.35)' : 'rgba(221, 212, 195, 0.95)',
    skyBadgeTextColor: isDarkBadge ? '#eef3ff' : '#4a433b',
    hillBackColor: lerpRgb(k0.hillBack, k1.hillBack, localT),
    hillFrontColor: lerpRgb(k0.hillFront, k1.hillFront, localT)
  };
}
