import React from 'react';
import { ZoneType, RoadEdges } from '../types';

interface BlockDioramaArtProps {
  cardId: number;
  blockIndex: number;
  zone: ZoneType;
  roads: RoadEdges;
  layer: 'base' | 'popout';
  sizeMode?: 'board' | 'mini' | 'gallery';
}

/**
 * Deterministic integer hash from (cardId, blockIndex, zone)
 * Ensures every card & block always renders the exact same handcrafted miniature diorama.
 */
function computeBlockSeed(cardId: number, blockIndex: number, zone: ZoneType): number {
  const zCode = zone.charCodeAt(0);
  let h =
    Math.imul(cardId + 17, 2654435761) ^
    Math.imul(blockIndex + 3, 1597334677) ^
    Math.imul(zCode, 3812015801);
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Static SVG Trunk & Ground Shadow for Trees (paired with animated HTML canopy overlay)
 */
const StaticTreeBase: React.FC<{ x: number; y: number; scale?: number }> = ({
  x,
  y,
  scale = 1
}) => (
  <g transform={`translate(${x}, ${y}) scale(${scale})`}>
    <ellipse cx="2" cy="3" rx="8.5" ry="4" fill="#292524" opacity="0.16" />
    <rect x="-1.8" y="-5" width="3.6" height="7.5" rx="1" fill="#7c563b" />
  </g>
);

/**
 * Animated HTML Tree Canopy Layer (CSS rotate with transform-origin: bottom center)
 */
const AnimatedTreeCanopy: React.FC<{
  x: number;
  y: number;
  scale?: number;
  variant?: 'pine' | 'round' | 'blossom';
  delay: string;
  duration: string;
}> = ({ x, y, scale = 1, variant = 'round', delay, duration }) => {
  // Canopy sits directly atop the trunk at (x%, y%) inside the 100x100 square coordinate frame
  const widthPct = 22 * scale;
  const heightPct = (variant === 'pine' ? 25 : 22) * scale;
  const anchorBottomPct = 100 - (y - 3 * scale);

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${x}%`,
        bottom: `${anchorBottomPct}%`,
        width: `${widthPct}%`,
        height: `${heightPct}%`,
        transform: 'translateX(-50%)'
      }}
    >
      <div
        className="w-full h-full html-tree-sway"
        style={{ animationDelay: delay, animationDuration: duration }}
      >
        <svg viewBox="-11 -26 22 25" className="w-full h-full overflow-visible" aria-hidden="true">
          {variant === 'pine' ? (
            <>
              <polygon points="-9,-2 0,-15 9,-2" fill="#4f895c" />
              <polygon points="-7.5,-8 0,-20 7.5,-8" fill="#63a170" />
              <polygon points="-5.2,-14 0,-25 5.2,-14" fill="#79b985" />
              <polygon points="-5.2,-14 0,-25 0,-14" fill="#a2d9ab" opacity="0.5" />
            </>
          ) : variant === 'blossom' ? (
            <>
              <circle cx="-4.5" cy="-8.5" r="6.5" fill="#e8949a" />
              <circle cx="4.5" cy="-8" r="6" fill="#df7f88" />
              <circle cx="0" cy="-14" r="7.4" fill="#f7b7bc" />
              <circle cx="-2.2" cy="-16" r="3" fill="#fde3e5" opacity="0.72" />
            </>
          ) : (
            <>
              <circle cx="-4.5" cy="-8.5" r="6.5" fill="#549161" />
              <circle cx="4.5" cy="-8" r="6" fill="#467d53" />
              <circle cx="0" cy="-14" r="7.5" fill="#6fb07c" />
              <circle cx="-2.4" cy="-16.2" r="3.2" fill="#a8ddb1" opacity="0.62" />
            </>
          )}
        </svg>
      </div>
    </div>
  );
};

/**
 * Static SVG Flower Base Bush
 */
const StaticFlowerBase: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <ellipse cx={x} cy={y + 2} rx="6.5" ry="3.2" fill="#5a9465" />
);

/**
 * Animated HTML Flower Blooms Layer
 */
const AnimatedFlowerBlooms: React.FC<{
  x: number;
  y: number;
  delay: string;
  duration: string;
}> = ({ x, y, delay, duration }) => (
  <div
    className="absolute pointer-events-none"
    style={{
      left: `${x}%`,
      bottom: `${100 - (y + 2)}%`,
      width: '13%',
      height: '10%',
      transform: 'translateX(-50%)'
    }}
  >
    <div
      className="w-full h-full html-flower-sway"
      style={{ animationDelay: delay, animationDuration: duration }}
    >
      <svg viewBox="-6.5 -5 13 8" className="w-full h-full overflow-visible" aria-hidden="true">
        <circle cx="-3.2" cy="-0.6" r="1.7" fill="#fdf6e3" />
        <circle cx="0.5" cy="-2.1" r="1.8" fill="#f7b3a0" />
        <circle cx="3.6" cy="-0.4" r="1.6" fill="#fde08d" />
        <circle cx="-0.5" cy="0.6" r="1.4" fill="#f6c7d0" />
      </svg>
    </div>
  </div>
);

/**
 * Static SVG Streetlamp / Park Lantern Pole & Cap
 */
const StaticLampPole: React.FC<{ x: number; y: number; scale?: number }> = ({
  x,
  y,
  scale = 1
}) => (
  <g transform={`translate(${x}, ${y}) scale(${scale})`}>
    <ellipse cx="0.8" cy="1.2" rx="3" ry="1.4" fill="#292524" opacity="0.18" />
    <rect x="-0.9" y="-12" width="1.8" height="13" rx="0.6" fill="#555e66" />
    {/* Daytime frosted glass bulb */}
    <circle cx="0" cy="-13" r="2.1" fill="#e8e2d4" />
    <polygon points="-2.5,-14.6 0,-16.5 2.5,-14.6" fill="#464f57" />
  </g>
);

/**
 * Emissive Warm Golden Streetlamp / Park Lantern Ground Light Pool
 * Illuminates surrounding sidewalk, grass, and dark asphalt road at Sunset & Night
 */
const LampGroundPool: React.FC<{
  x: number;
  y: number;
  scale?: number;
}> = ({ x, y, scale = 1 }) => {
  const sizePct = 54 * scale;
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y - 2 * scale}%`,
        width: `${sizePct}%`,
        height: `${sizePct}%`,
        transform: 'translate3d(-50%, -50%, 0)',
        opacity: 'var(--city-lamp-opacity, 0)',
        background:
          'radial-gradient(circle, rgba(255,228,132,0.54) 0%, rgba(255,192,84,0.28) 44%, rgba(255,172,56,0.08) 72%, rgba(255,168,52,0) 100%)'
      }}
    />
  );
};

/**
 * Lightweight GPU-Friendly Emissive Streetlamp Bulb Core + Radiant Golden Bloom (Zero box-shadow / Zero blur)
 */
const AnimatedLampGlow: React.FC<{
  x: number;
  y: number;
  scale?: number;
}> = ({ x, y, scale = 1 }) => {
  const glowY = y - 13 * scale;
  const haloPct = 40 * scale;
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${glowY}%`,
        width: `${haloPct}%`,
        height: `${haloPct}%`,
        transform: 'translate3d(-50%, -50%, 0)',
        opacity: 'var(--city-lamp-opacity, 0)',
        background:
          'radial-gradient(circle, #fffbe0 0%, #fff6bd 13%, rgba(255,232,134,0.92) 24%, rgba(255,204,88,0.54) 44%, rgba(255,176,56,0.18) 70%, rgba(255,166,48,0) 100%)'
      }}
    />
  );
};

/**
 * Warm High-Contrast Emissive Window Spill Halo for Buildings at Sunset/Night
 */
const AnimatedWindowGlow: React.FC<{
  x: number;
  y: number;
  sizePct?: number;
}> = ({ x, y, sizePct = 28 }) => (
  <div
    className="absolute rounded-full pointer-events-none"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      width: `${sizePct}%`,
      height: `${sizePct}%`,
      transform: 'translate3d(-50%, -50%, 0)',
      opacity: 'var(--city-window-glow, 0)',
      background:
        'radial-gradient(circle, rgba(255,238,148,0.68) 0%, rgba(255,198,84,0.34) 48%, rgba(255,172,56,0.08) 76%, rgba(255,164,48,0) 100%)'
    }}
  />
);

/**
 * Animated HTML Chimney / Factory Smoke Puff
 */
const AnimatedSmokePuff: React.FC<{
  x: number;
  y: number;
  sizePct: number;
  delay: string;
  duration?: string;
}> = ({ x, y, sizePct, delay, duration = '3.1s' }) => (
  <div
    className="absolute rounded-full pointer-events-none html-smoke-rise"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      width: `${sizePct}%`,
      height: `${sizePct}%`,
      backgroundColor: '#fffdf9',
      animationDelay: delay,
      animationDuration: duration
    }}
  />
);

/**
 * Animated HTML Pond Duck
 */
const AnimatedPondDuck: React.FC<{ x: number; y: number; delay: string }> = ({ x, y, delay }) => (
  <div
    className="absolute pointer-events-none html-duck-bob"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      width: '13%',
      height: '10%',
      animationDelay: delay
    }}
  >
    <svg viewBox="-5 -4 12 8" className="w-full h-full overflow-visible" aria-hidden="true">
      <ellipse cx="0" cy="2.1" rx="3.8" ry="1.4" fill="#639db8" opacity="0.45" />
      <ellipse cx="0" cy="0.8" rx="3.4" ry="2.1" fill="#f9d876" />
      <circle cx="2.5" cy="-1.2" r="1.7" fill="#fbe294" />
      <polygon points="4,-1.2 5.7,-0.7 4,-0.2" fill="#e07b42" />
    </svg>
  </div>
);

/**
 * Animated HTML Water Ripple Ring
 */
const AnimatedWaterRipple: React.FC<{
  x: number;
  y: number;
  widthPct: number;
  heightPct: number;
  delay: string;
}> = ({ x, y, widthPct, heightPct, delay }) => (
  <div
    className="absolute rounded-full pointer-events-none html-water-ripple"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      width: `${widthPct}%`,
      height: `${heightPct}%`,
      border: '1.5px solid rgba(238, 249, 255, 0.92)',
      animationDelay: delay
    }}
  />
);

/**
 * Animated HTML Rooftop Cafe Signboard
 */
const AnimatedCafeSign: React.FC<{
  x: number;
  y: number;
  scale?: number;
  awningColor: string;
  delay: string;
}> = ({ x, y, scale = 1, awningColor, delay }) => (
  <div
    className="absolute pointer-events-none"
    style={{
      left: `${x}%`,
      bottom: `${100 - y}%`,
      width: `${17 * scale}%`,
      height: `${12 * scale}%`,
      transform: 'translateX(-50%)'
    }}
  >
    <div
      className="w-full h-full html-sign-sway"
      style={{ animationDelay: delay }}
    >
      <svg viewBox="-8 -11 16 11" className="w-full h-full overflow-visible" aria-hidden="true">
        <line x1="-4" y1="0" x2="-4" y2="-4.5" stroke="#536878" strokeWidth="1.2" />
        <line x1="4" y1="0" x2="4" y2="-4.5" stroke="#536878" strokeWidth="1.2" />
        <rect x="-7" y="-9.5" width="14" height="5.8" rx="1.4" fill={awningColor} stroke="#fffdf9" strokeWidth="0.8" />
        <line x1="-4" y1="-6.6" x2="4" y2="-6.6" stroke="#fffdf9" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </div>
  </div>
);

/**
 * Miniature 2.5D Wooden Park Bench (Static SVG)
 */
const MiniBench: React.FC<{ x: number; y: number; scale?: number }> = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x}, ${y}) scale(${scale})`}>
    <ellipse cx="0.5" cy="3.5" rx="8.5" ry="2.6" fill="#292524" opacity="0.14" />
    <rect x="-6.5" y="0" width="1.6" height="3.2" fill="#52463d" />
    <rect x="4.9" y="0" width="1.6" height="3.2" fill="#52463d" />
    <rect x="-8" y="-1.5" width="16" height="2.4" rx="0.8" fill="#b77f52" />
    <rect x="-7.6" y="-4.8" width="15.2" height="2.2" rx="0.8" fill="#cb9466" />
    <line x1="-7" y1="-4.2" x2="7" y2="-4.2" stroke="#ebd0b3" strokeWidth="0.6" opacity="0.7" />
  </g>
);

/**
 * Miniature 2.5D Cozy Cottage / House (Static SVG body + chimney)
 */
const MiniHouseStatic: React.FC<{
  x: number;
  y: number;
  scale?: number;
  roofColor: string;
  roofShade: string;
  wallColor?: string;
  tall?: boolean;
  hasChimney?: boolean;
  detailVariant?: number;
}> = ({
  x,
  y,
  scale = 1,
  roofColor,
  roofShade,
  wallColor = '#fbf6ec',
  tall = false,
  hasChimney = false,
  detailVariant = 0
}) => {
  const h = tall ? 18 : 12;
  const roofTop = -h - 9;
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <polygon points="-10,1 12,1 16,5 -6,5" fill="#292524" opacity="0.16" />
      <rect x="-10" y={-h} width="14" height={h + 1} rx="1" fill={wallColor} />
      {tall ? (
        <polygon points="4,1 11,-2 11,-19.5 4,-18" fill="#e2d5bf" />
      ) : (
        <polygon points="4,1 11,-2 11,-13.5 4,-12" fill="#e2d5bf" />
      )}
      <rect x="-5.5" y="-5.5" width="4" height="6.5" rx="0.8" fill="#9c6244" />
      {/* Tiny doorstep & potted shrub */}
      {detailVariant === 0 && (
        <>
          <rect x="-9.6" y="-1.8" width="2.2" height="2.4" rx="0.5" fill="#c07352" />
          <circle cx="-8.5" cy="-2.7" r="1.5" fill="#63a170" />
        </>
      )}
      {/* Daytime soft sky-tinted glass windows */}
      <rect x="-8.4" y={-h + 3} width="3.2" height="3.2" rx="0.5" fill="#8eb9d2" />
      <rect x="-1.2" y={-h + 3} width="3.2" height="3.2" rx="0.5" fill="#8eb9d2" />
      {/* Window flower planter boxes on detailVariant 2 */}
      {detailVariant === 2 && (
        <>
          <rect x="-8.7" y={-h + 6.1} width="3.8" height="1.2" rx="0.4" fill="#9c6244" />
          <circle cx="-7.5" cy={-h + 5.8} r="0.7" fill="#f29b9b" />
          <circle cx="-6.1" cy={-h + 5.8} r="0.7" fill="#73b37d" />
          <rect x="-1.5" y={-h + 6.1} width="3.8" height="1.2" rx="0.4" fill="#9c6244" />
          <circle cx="-0.3" cy={-h + 5.8} r="0.7" fill="#fbd77e" />
          <circle cx="1.1" cy={-h + 5.8} r="0.7" fill="#73b37d" />
        </>
      )}
      {tall && (
        <>
          <rect x="-8.4" y={-h + 8.2} width="3.2" height="3" rx="0.5" fill="#8eb9d2" />
          <rect x="-1.2" y={-h + 8.2} width="3.2" height="3" rx="0.5" fill="#8eb9d2" />
          {/* Tiny iron balcony rail on tall houses */}
          {detailVariant === 2 && (
            <line x1="-9.2" y1={-h + 11.4} x2="2.8" y2={-h + 11.4} stroke="#5d6670" strokeWidth="0.9" strokeLinecap="round" />
          )}
        </>
      )}
      <rect x="6.5" y={-h + 3.5} width="2.5" height="3" rx="0.4" fill="#a9bdca" />
      {hasChimney && (
        <rect x="2.5" y={roofTop - 2} width="3.2" height="6.5" rx="0.5" fill="#a85a46" />
      )}
      <polygon points={`-11.5,${-h + 0.5} -3,${roofTop} 5.5,${-h + 0.5}`} fill={roofColor} />
      <polygon points={`-3,${roofTop} 5,${roofTop - 2.2} 12.2,${-h - 1.8} 5.5,${-h + 0.5}`} fill={roofShade} />
      {/* Roof micro-detail: cozy attic dormer (0) or sleek solar/skylight tile (1) */}
      {detailVariant === 0 && (
        <g>
          <polygon points={`-5.2,${-h - 2.2} -3,${-h - 5.2} -0.8,${-h - 2.2}`} fill="#fbf6ec" />
          <rect x="-4.1" y={-h - 3.6} width="2.2" height="2" rx="0.4" fill="#8eb9d2" />
        </g>
      )}
      {detailVariant === 1 && (
        <g>
          <polygon
            points={`1.8,${roofTop + 2.4} 5.8,${roofTop + 1.1} 8.4,${-h - 3.0} 4.4,${-h - 1.8}`}
            fill="#476c8a"
            stroke="#c7e0f2"
            strokeWidth="0.45"
          />
          <line x1="3.8" y1={roofTop + 1.8} x2="6.4" y2={-h - 2.4} stroke="#9ec4df" strokeWidth="0.35" opacity="0.8" />
        </g>
      )}
      <line x1="-11" y1={-h + 0.2} x2="-3" y2={roofTop + 0.4} stroke="#fffdf9" strokeWidth="0.9" opacity="0.55" />
    </g>
  );
};

/**
 * Un-dimmed Emissive Warm Lit Windows & Cozy Porch Lamp for MiniHouse at Sunset & Night
 */
const MiniHouseLights: React.FC<{
  x: number;
  y: number;
  scale?: number;
  tall?: boolean;
}> = ({ x, y, scale = 1, tall = false }) => {
  const h = tall ? 18 : 12;
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <rect x="-8.4" y={-h + 3} width="3.2" height="3.2" rx="0.5" fill="#fff5b2" stroke="#ffbe42" strokeWidth="0.45" />
      <rect x="-1.2" y={-h + 3} width="3.2" height="3.2" rx="0.5" fill="#fff9cc" stroke="#ffbe42" strokeWidth="0.45" />
      {tall && (
        <>
          <rect x="-8.4" y={-h + 8.2} width="3.2" height="3" rx="0.5" fill="#ffe47a" stroke="#ffbe42" strokeWidth="0.4" />
          <rect x="-1.2" y={-h + 8.2} width="3.2" height="3" rx="0.5" fill="#fff7be" stroke="#ffbe42" strokeWidth="0.4" />
        </>
      )}
      <rect x="6.5" y={-h + 3.5} width="2.5" height="3" rx="0.4" fill="#ffe88a" stroke="#ffb83c" strokeWidth="0.35" />
      {/* Warm tiny porch lantern above front door */}
      <circle cx="-3.5" cy="-6.3" r="0.95" fill="#fffbe0" />
    </g>
  );
};

/**
 * Miniature 2.5D Commercial Shop / Cafe (Static SVG body + awning)
 */
const MiniShopStatic: React.FC<{
  x: number;
  y: number;
  scale?: number;
  awningA: string;
  awningB?: string;
  wallColor?: string;
  tall?: boolean;
  detailVariant?: number;
}> = ({
  x,
  y,
  scale = 1,
  awningA,
  awningB = '#fffaf0',
  wallColor = '#faf4e8',
  tall = false,
  detailVariant = 0
}) => {
  const h = tall ? 20 : 15;
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <polygon points="-11,1 12,1 16,5 -7,5" fill="#292524" opacity="0.16" />
      <rect x="-11" y={-h} width="16" height={h + 1} rx="1.2" fill={wallColor} />
      <polygon points={`5,1 12,-2 12,${-h - 2.5} 5,${-h}`} fill="#dce5eb" />
      <polygon points={`-11.5,${-h} -4.5,${-h - 3} 12.5,${-h - 3} 5.5,${-h}`} fill="#d7e4ee" />
      <polygon points={`-11.5,${-h} 5.5,${-h} 5.5,${-h + 1.6} -11.5,${-h + 1.6}`} fill="#5f8aa8" />
      {/* Rooftop micro-details for zoom-in richness */}
      {detailVariant === 0 && (
        <g transform={`translate(3.5, ${-h - 1.6})`}>
          {/* Miniature rooftop HVAC unit + small antenna */}
          <rect x="-2.6" y="-3.2" width="5.2" height="3.2" rx="0.6" fill="#bcc8d1" stroke="#647484" strokeWidth="0.45" />
          <circle cx="0" cy="-1.6" r="1.05" fill="#6d7e8d" />
          <line x1="3.4" y1="0" x2="3.4" y2="-4.6" stroke="#536878" strokeWidth="0.7" />
          <circle cx="3.4" cy="-4.8" r="0.8" fill={awningA} />
        </g>
      )}
      {detailVariant === 1 && (
        <g transform={`translate(2.5, ${-h - 1.4})`}>
          {/* Cozy rooftop planter garden box */}
          <rect x="-4.4" y="-1.8" width="8.8" height="2" rx="0.5" fill="#a86e49" />
          <circle cx="-2.4" cy="-2.8" r="1.8" fill="#5e9c6b" />
          <circle cx="0.2" cy="-3.2" r="2" fill="#73b581" />
          <circle cx="2.7" cy="-2.6" r="1.6" fill="#569163" />
          <circle cx="0.4" cy="-3.6" r="0.65" fill="#fde391" />
        </g>
      )}
      {detailVariant === 2 && (
        <g transform={`translate(1.5, ${-h - 1.4})`}>
          {/* Glass rooftop skylight dome */}
          <ellipse cx="0" cy="0" rx="4.6" ry="1.4" fill="#6b8ba4" />
          <path d="M-4.2,0 A4.2,3.4 0 0,1 4.2,0 Z" fill="#a7d2ea" opacity="0.92" />
          <path d="M-2.2,-0.5 A2.5,2.2 0 0,1 0.8,-2.4" fill="none" stroke="#fffdf9" strokeWidth="0.65" opacity="0.75" />
        </g>
      )}
      {/* Daytime storefront glass */}
      <rect x="-9" y="-7.5" width="7.2" height="6.2" rx="0.8" fill="#9bc7e0" />
      <rect x="-0.5" y="-7" width="3.8" height="8" rx="0.6" fill="#4f6d82" />
      {tall && (
        <>
          <rect x="-8.5" y={-h + 3.5} width="3.6" height="3.8" rx="0.6" fill="#89bddb" />
          <rect x="-2.5" y={-h + 3.5} width="3.6" height="3.8" rx="0.6" fill="#89bddb" />
        </>
      )}
      <polygon points="-11.5,-7.5 6,-7.5 4.8,-11.2 -10.3,-11.2" fill={awningA} />
      <polygon points="-8.2,-7.5 -5.4,-7.5 -5,-11.2 -7.6,-11.2" fill={awningB} />
      <polygon points="-2.4,-7.5 0.4,-7.5 0.2,-11.2 -2.2,-11.2" fill={awningB} />
      <polygon points="3.2,-7.5 5.4,-7.5 4.6,-11.2 2.8,-11.2" fill={awningB} />
    </g>
  );
};

/**
 * Un-dimmed Emissive Warm Lit Storefront & Upstairs Windows for MiniShop at Sunset & Night
 */
const MiniShopLights: React.FC<{
  x: number;
  y: number;
  scale?: number;
  tall?: boolean;
}> = ({ x, y, scale = 1, tall = false }) => {
  const h = tall ? 20 : 15;
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Soft warm sidewalk light spill directly in front of shop display window */}
      <polygon points="-9.6,-1.1 -1.2,-1.1 1.6,3.8 -12.2,3.8" fill="#ffd970" opacity="0.32" />
      <rect x="-9" y="-7.5" width="7.2" height="6.2" rx="0.8" fill="#fff4ae" stroke="#ffbe42" strokeWidth="0.5" />
      <rect x="-7.8" y="-6.4" width="4.8" height="3.2" rx="0.4" fill="#fffbe0" opacity="0.72" />
      {tall && (
        <>
          <rect x="-8.5" y={-h + 3.5} width="3.6" height="3.8" rx="0.6" fill="#ffe885" stroke="#ffbe42" strokeWidth="0.45" />
          <rect x="-2.5" y={-h + 3.5} width="3.6" height="3.8" rx="0.6" fill="#fff7be" stroke="#ffbe42" strokeWidth="0.45" />
        </>
      )}
    </g>
  );
};

/**
 * Miniature 2.5D Industrial Workshop / Factory / Silos / Warehouse (Static SVG)
 */
const MiniFactoryStatic: React.FC<{
  x: number;
  y: number;
  scale?: number;
  variant: 'sawtooth' | 'silos' | 'warehouse';
}> = ({ x, y, scale = 1, variant }) => {
  if (variant === 'silos') {
    return (
      <g transform={`translate(${x}, ${y}) scale(${scale})`}>
        <ellipse cx="0" cy="2" rx="12" ry="4" fill="#292524" opacity="0.16" />
        <rect x="-10" y="-17" width="9" height="17" fill="#c7beae" />
        <rect x="-10" y="-17" width="3.5" height="17" fill="#dfd7c8" />
        <ellipse cx="-5.5" cy="-17" rx="4.5" ry="2.2" fill="#ebe4d7" />
        <ellipse cx="-5.5" cy="0" rx="4.5" ry="2" fill="#b5ab99" />
        <rect x="-10" y="-10" width="9" height="2" fill="#9c7a56" opacity="0.7" />
        <rect x="0" y="-21" width="10" height="22" fill="#b9afa0" />
        <rect x="0" y="-21" width="4" height="22" fill="#d9d1c2" />
        <ellipse cx="5" cy="-21" rx="5" ry="2.4" fill="#ebe4d7" />
        <ellipse cx="5" cy="1" rx="5" ry="2.1" fill="#a89e8e" />
        <rect x="0" y="-13" width="10" height="2.2" fill="#c97b5d" opacity="0.85" />
        <path d="M-4,-15 L3,-18" stroke="#646e78" strokeWidth="1.6" strokeLinecap="round" />
        {/* Tiny connecting steel catwalk handrail between twin silos */}
        <line x1="-5.5" y1="-19.5" x2="5" y2="-23.5" stroke="#53606c" strokeWidth="0.9" strokeLinecap="round" />
        <line x1="-2.5" y1="-17.5" x2="-2.5" y2="-20.4" stroke="#53606c" strokeWidth="0.7" />
        <line x1="1.8" y1="-19.5" x2="1.8" y2="-22.2" stroke="#53606c" strokeWidth="0.7" />
      </g>
    );
  }

  if (variant === 'warehouse') {
    return (
      <g transform={`translate(${x}, ${y}) scale(${scale})`}>
        <polygon points="-12,1 12,1 16,5 -8,5" fill="#292524" opacity="0.16" />
        <rect x="-12" y="-13" width="17" height="14" rx="1" fill="#ebe2d2" />
        <polygon points="5,1 12,-2.2 12,-15.2 5,-13" fill="#cfc3ad" />
        <polygon points="-12.5,-13 -5.5,-16.5 12.5,-16.5 5.5,-13" fill="#8b7d6b" />
        {/* Rooftop skylight strip */}
        <polygon points="-8.5,-14.1 -3.8,-15.9 1.6,-15.9 -3.1,-14.1" fill="#a7cde0" opacity="0.82" />
        <rect x="-9" y="-7.5" width="8" height="8.5" rx="0.6" fill="#6d767f" />
        <line x1="-8.5" y1="-5.2" x2="-1.5" y2="-5.2" stroke="#9aa3ac" strokeWidth="0.7" />
        <line x1="-8.5" y1="-3" x2="-1.5" y2="-3" stroke="#9aa3ac" strokeWidth="0.7" />
        {/* Subtle industrial hazard trim above loading bay */}
        <rect x="-9.2" y="-8.8" width="8.4" height="1.1" rx="0.3" fill="#d99b43" opacity="0.9" />
        <g transform="translate(5, -16)">
          <line x1="-2.2" y1="0" x2="-1.5" y2="-6" stroke="#646e78" strokeWidth="1.1" />
          <line x1="2.2" y1="0" x2="1.5" y2="-6" stroke="#646e78" strokeWidth="1.1" />
          <rect x="-3.8" y="-11.5" width="7.6" height="5.8" rx="1" fill="#b4835a" />
          <polygon points="-4.5,-11.5 0,-14.5 4.5,-11.5" fill="#7c5b40" />
        </g>
      </g>
    );
  }

  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <polygon points="-12,1 12,1 16,5 -8,5" fill="#292524" opacity="0.16" />
      <g transform="translate(5.5, -13)">
        <rect x="-2.4" y="-13" width="4.8" height="14" rx="0.8" fill="#a86452" />
        <rect x="-2.4" y="-13" width="2" height="14" fill="#c27a66" />
        <rect x="-3" y="-14" width="6" height="2" rx="0.5" fill="#646e78" />
      </g>
      <polygon points="-12,1 -12,-11 -5,-16 -5,-11 2,-16 2,-11 5,-11 5,1" fill="#e8dcc8" />
      <polygon points="5,1 11,-2 11,-13.5 5,-11" fill="#cbbca2" />
      <polygon points="-12,-11 -5,-16 0,-18 -7,-13" fill="#77828d" />
      <polygon points="-5,-11 2,-16 7,-18 0,-13" fill="#646e78" />
      {/* Daytime workshop glass */}
      <rect x="-9.5" y="-6.5" width="3.8" height="3.2" rx="0.5" fill="#89a8ba" />
      <rect x="-3.5" y="-6.5" width="3.8" height="3.2" rx="0.5" fill="#89a8ba" />
    </g>
  );
};

/**
 * Un-dimmed Emissive Warm Workshop Windows, Loading Bay Lamp & Silo Beacon at Sunset & Night
 */
const MiniFactoryLights: React.FC<{
  x: number;
  y: number;
  scale?: number;
  variant: 'sawtooth' | 'silos' | 'warehouse';
}> = ({ x, y, scale = 1, variant }) => {
  if (variant === 'silos') {
    return (
      <g transform={`translate(${x}, ${y}) scale(${scale})`}>
        <circle cx="5" cy="-21.5" r="2.8" fill="#ffcf54" opacity="0.45" />
        <circle cx="5" cy="-21.5" r="1.5" fill="#fff6b8" />
        <circle cx="-5.5" cy="-17.2" r="1.15" fill="#ffe680" />
      </g>
    );
  }
  if (variant === 'warehouse') {
    return (
      <g transform={`translate(${x}, ${y}) scale(${scale})`}>
        <polygon points="-8.2,-9.2 -1.8,-9.2 0.2,2.2 -10.2,2.2" fill="#ffd970" opacity="0.22" />
        <rect x="-6.8" y="-10.8" width="3.6" height="1.8" rx="0.7" fill="#fff7be" stroke="#ffbe42" strokeWidth="0.35" />
      </g>
    );
  }
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <rect x="-9.5" y="-6.5" width="3.8" height="3.2" rx="0.5" fill="#fff4ac" stroke="#ffbe42" strokeWidth="0.45" />
      <rect x="-3.5" y="-6.5" width="3.8" height="3.2" rx="0.5" fill="#fff9cc" stroke="#ffbe42" strokeWidth="0.45" />
    </g>
  );
};

/**
 * 3D Upright Billboard Anchor for Mekorama-style Diorama Board (`sizeMode === 'board'`).
 * Pins structures, trees & streetlamps at exact tile coordinates (x%, y%) and counter-rotates
 * by (-yaw, -tilt) so they stand vertically upright facing the viewer at any angle or zoom,
 * while ground & roads remain flush on the top face of the extruded block.
 */
const DioramaStandup: React.FC<{
  x: number;
  y: number;
  liftZ?: number;
  children: React.ReactNode;
}> = ({ x, y, liftZ = 2.6, children }) => (
  <div
    className="absolute pointer-events-none overflow-visible diorama-standup"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      width: '100%',
      height: '100%',
      opacity: 'var(--block-popout-opacity, 1)',
      transform: `translateZ(${liftZ}px) rotateZ(var(--cam-inv-yaw, 0deg)) rotateX(var(--cam-inv-tilt, 0deg))`
    }}
  >
    {children}
  </div>
);

/**
 * Miniature Stacked Cargo Crates (Static SVG)
 */
const MiniCrates: React.FC<{ x: number; y: number; accent: string }> = ({ x, y, accent }) => (
  <g transform={`translate(${x}, ${y})`}>
    <ellipse cx="0.5" cy="2.5" rx="7.5" ry="2.6" fill="#292524" opacity="0.15" />
    <rect x="-6.5" y="-4.5" width="6" height="6" rx="0.6" fill="#c5945c" />
    <line x1="-6.5" y1="-4.5" x2="-0.5" y2="1.5" stroke="#9b6e3c" strokeWidth="0.7" />
    <rect x="0.5" y="-4" width="6" height="5.5" rx="0.6" fill={accent} />
    <polygon points="0.5,-4 3,-5.6 9,-5.6 6.5,-4" fill="#fffdf9" opacity="0.35" />
    <rect x="-3.5" y="-9.5" width="5.5" height="5" rx="0.6" fill="#d4a66e" />
  </g>
);

export const BlockDioramaArt: React.FC<BlockDioramaArtProps> = React.memo(({
  cardId,
  blockIndex,
  zone,
  roads,
  layer,
  sizeMode = 'board'
}) => {
  const seed = computeBlockSeed(cardId, blockIndex, zone);
  const variant = seed % 4;
  const accentIdx = (seed >>> 3) % 3;
  const flip = ((seed >>> 6) % 2) === 1;
  const detailVariant = (seed >>> 8) % 3;
  const secDetailVariant = (seed >>> 10) % 3;

  // Deterministic per-block timings so each block's ornaments sway/bob/rise out of phase
  const delay1 = `${-((seed % 32) * 0.11).toFixed(2)}s`;
  const delay2 = `${-(((seed + 15) % 32) * 0.11).toFixed(2)}s`;
  const delay3 = `${-(((seed + 23) % 32) * 0.11).toFixed(2)}s`;
  const treeDur1 = `${(2.8 + (seed % 11) * 0.11).toFixed(2)}s`;
  const treeDur2 = `${(3.0 + ((seed >>> 4) % 10) * 0.11).toFixed(2)}s`;
  const flowerDur = `${(2.4 + ((seed >>> 7) % 8) * 0.1).toFixed(2)}s`;

  const hasRoads = !!(roads.top || roads.right || roads.bottom || roads.left);
  const isMini = sizeMode === 'mini';
  const isBoard3D = sizeMode === 'board';

  const getZoneAnchors = () => {
    if (!hasRoads) {
      return { heroX: flip ? 66 : 34, heroY: 46, secX: flip ? 28 : 70, secY: 76, propX: 24, propY: 78 };
    }
    if (roads.top && roads.bottom && !roads.left && !roads.right) {
      return flip
        ? { heroX: 20, heroY: 26, secX: 80, secY: 66, propX: 20, propY: 76 }
        : { heroX: 78, heroY: 28, secX: 20, secY: 68, propX: 78, propY: 76 };
    }
    if (roads.left && roads.right && !roads.top && !roads.bottom) {
      return flip
        ? { heroX: 30, heroY: 24, secX: 68, secY: 86, propX: 26, propY: 84 }
        : { heroX: 66, heroY: 24, secX: 30, secY: 86, propX: 72, propY: 84 };
    }
    if (roads.top && roads.left) {
      return { heroX: 76, heroY: 26, secX: 76, secY: 78, propX: 22, propY: 80 };
    }
    if (roads.top && roads.right) {
      return { heroX: 22, heroY: 26, secX: 24, secY: 78, propX: 76, propY: 80 };
    }
    if (roads.bottom && roads.left) {
      return { heroX: 52, heroY: 23, secX: 78, secY: 76, propX: 22, propY: 26 };
    }
    if (roads.bottom && roads.right) {
      return { heroX: 48, heroY: 23, secX: 22, secY: 76, propX: 78, propY: 26 };
    }
    return { heroX: 24, heroY: 26, secX: 74, secY: 80, propX: 24, propY: 78 };
  };

  const anchors = getZoneAnchors();

  const houseRoofs = [
    { main: '#c85a44', shade: '#9e4130' },
    { main: '#c98042', shade: '#9d5f2b' },
    { main: '#8a5a68', shade: '#68404d' }
  ];
  const shopAwnings = ['#d96b57', '#5e9a6b', '#d99b43'];
  const cargoColors = ['#6996a8', '#c9785d', '#6d9b77'];

  // Centered 1:1 coordinate frame matching SVG viewBox="0 0 100 100" across square & 4:3 cells
  const htmlOverlayBoxClass =
    'absolute top-0 bottom-0 left-1/2 -translate-x-1/2 aspect-square pointer-events-none overflow-visible';

  // Single source of truth for streetlamps & cozy park lanterns so poles, ground pools & unclipped blooms align pixel-for-pixel
  const lampPositions: Array<{ x: number; y: number; scale: number; delay: string }> = [];
  if (zone === 'P') {
    if (hasRoads) {
      lampPositions.push({ x: anchors.propX, y: anchors.propY, scale: 0.78, delay: delay1 });
    } else if (variant === 0) {
      lampPositions.push({ x: 36, y: 75, scale: 0.78, delay: delay1 });
    } else if (variant === 1) {
      lampPositions.push({ x: 66, y: 57, scale: 0.78, delay: delay2 });
    } else if (variant === 2) {
      lampPositions.push({ x: 31, y: 56, scale: 0.78, delay: delay1 });
    } else {
      lampPositions.push({ x: 44, y: 58, scale: 0.78, delay: delay2 });
    }
  } else if (zone === 'R') {
    if (variant === 0) {
      lampPositions.push({ x: anchors.propX + 10, y: anchors.propY + 3, scale: 0.82, delay: delay1 });
    } else if (variant === 1) {
      lampPositions.push({ x: anchors.propX + 11, y: anchors.propY - 1, scale: 0.78, delay: delay2 });
    } else if (variant === 2) {
      lampPositions.push({ x: anchors.propX + 11, y: anchors.propY + 2, scale: 0.78, delay: delay3 });
    } else {
      lampPositions.push({ x: anchors.propX - 2, y: anchors.propY + 3, scale: 0.85, delay: delay2 });
    }
  } else if (zone === 'C') {
    if (variant === 0) {
      lampPositions.push({ x: anchors.propX + 11, y: anchors.propY + 3, scale: 0.82, delay: delay2 });
    } else if (variant === 1) {
      lampPositions.push({ x: anchors.propX + 10, y: anchors.propY + 2, scale: 0.82, delay: delay3 });
    } else if (variant === 2) {
      lampPositions.push({ x: anchors.propX + 11, y: anchors.propY + 2, scale: 0.8, delay: delay1 });
    } else {
      lampPositions.push({ x: anchors.propX - 8, y: anchors.propY + 2, scale: 0.8, delay: delay2 });
    }
  } else if (zone === 'I') {
    if (variant === 0) {
      lampPositions.push({ x: anchors.propX, y: anchors.propY + 2, scale: 0.82, delay: delay1 });
    } else if (variant === 2) {
      lampPositions.push({ x: anchors.propX, y: anchors.propY + 3, scale: 0.82, delay: delay2 });
    } else if (variant === 3) {
      lampPositions.push({ x: anchors.propX + 11, y: anchors.propY + 2, scale: 0.8, delay: delay3 });
    }
  }

  // =========================================================================
  // LAYER 1: BASE TILE (Dimmed Twilight Surfaces + Un-dimmed Emissive Lights)
  // =========================================================================
  if (layer === 'base') {
    return (
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Static SVG: Ground, Ponds, Static Buildings, Trunks & Lamp Poles */}
        <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            aria-hidden="true"
          >
            <circle
              cx="24"
              cy="24"
              r="34"
              fill="#fffdf9"
              style={{ opacity: 'var(--tile-sun-sheen, 0.13)' }}
            />

            {/* PARK STATIC BASE */}
            {zone === 'P' && (
              <g>
                {variant === 0 && (
                  <>
                    <path
                      d="M-2,74 Q30,66 44,82 T102,76"
                      fill="none"
                      stroke="#e8dec6"
                      strokeWidth="7.5"
                      strokeLinecap="round"
                    />
                    <ellipse cx="58" cy="54" rx="23" ry="15" fill="#7dbad4" />
                    <ellipse cx="57" cy="53" rx="19.5" ry="12" fill="#9ed5eb" />
                    <MiniBench x={25} y={76} scale={0.92} />
                    <StaticFlowerBase x={78} y={76} />
                    {isBoard3D ? (
                      <>
                        <ellipse cx={28} cy={22} rx="9.5" ry="4.5" fill="#292524" opacity="0.16" />
                        <ellipse cx={72} cy={25} rx="8" ry="4" fill="#292524" opacity="0.16" />
                        <ellipse cx={22} cy={52} rx="7.5" ry="3.6" fill="#292524" opacity="0.16" />
                      </>
                    ) : (
                      <StaticTreeBase x={22} y={50} scale={0.92} />
                    )}
                  </>
                )}

                {variant === 1 && (
                  <>
                    <g fill="#ece3cd" opacity="0.9">
                      <ellipse cx="18" cy="84" rx="4.5" ry="2.8" />
                      <ellipse cx="32" cy="77" rx="4.2" ry="2.6" />
                      <ellipse cx="47" cy="71" rx="4.8" ry="2.9" />
                      <ellipse cx="62" cy="74" rx="4.2" ry="2.5" />
                      <ellipse cx="78" cy="68" rx="4.5" ry="2.7" />
                    </g>
                    <MiniBench x={50} y={56} scale={1.0} />
                    <StaticFlowerBase x={25} y={62} />
                    <StaticFlowerBase x={77} y={82} />
                    {isBoard3D ? (
                      <>
                        <ellipse cx={26} cy={22} rx="9.5" ry="4.5" fill="#292524" opacity="0.16" />
                        <ellipse cx={70} cy={23} rx="8.8" ry="4.2" fill="#292524" opacity="0.16" />
                        <ellipse cx={75} cy={54} rx="8" ry="3.8" fill="#292524" opacity="0.16" />
                        <ellipse cx={24} cy={86} rx="6.8" ry="3.2" fill="#292524" opacity="0.16" />
                      </>
                    ) : (
                      <>
                        <StaticTreeBase x={75} y={52} scale={0.95} />
                        <StaticTreeBase x={24} y={84} scale={0.78} />
                      </>
                    )}
                  </>
                )}

                {variant === 2 && (
                  <>
                    <circle cx="50" cy="56" r="24" fill="#eae0c9" opacity="0.88" />
                    <circle cx="50" cy="56" r="13.5" fill="#d2c6ae" />
                    <circle cx="50" cy="56" r="10.5" fill="#8bc6df" />
                    <circle cx="50" cy="56" r="2.6" fill="#f7f1e3" />
                    <MiniBench x={50} y={84} scale={0.95} />
                    <StaticFlowerBase x={21} y={76} />
                    {isBoard3D ? (
                      <>
                        <ellipse cx={24} cy={22} rx="9.2" ry="4.4" fill="#292524" opacity="0.16" />
                        <ellipse cx={75} cy={24} rx="8.8" ry="4.2" fill="#292524" opacity="0.16" />
                        <ellipse cx={80} cy={74} rx="7.2" ry="3.5" fill="#292524" opacity="0.16" />
                      </>
                    ) : (
                      <StaticTreeBase x={80} y={72} scale={0.85} />
                    )}
                  </>
                )}

                {variant === 3 && (
                  <>
                    <path
                      d="M12,98 Q42,64 88,36"
                      fill="none"
                      stroke="#e9dfc7"
                      strokeWidth="7"
                      strokeLinecap="round"
                    />
                    <MiniBench x={32} y={58} scale={0.95} />
                    {isBoard3D ? (
                      <>
                        <ellipse cx={70} cy={22} rx="9.5" ry="4.5" fill="#292524" opacity="0.16" />
                        <ellipse cx={26} cy={24} rx="8.6" ry="4" fill="#292524" opacity="0.16" />
                        <ellipse cx={25} cy={80} rx="7.2" ry="3.4" fill="#292524" opacity="0.16" />
                        <ellipse cx={76} cy={74} rx="7.6" ry="3.6" fill="#292524" opacity="0.16" />
                      </>
                    ) : (
                      <>
                        <StaticTreeBase x={25} y={78} scale={0.86} />
                        <StaticTreeBase x={76} y={72} scale={0.92} />
                      </>
                    )}
                    <StaticFlowerBase x={55} y={82} />
                    <StaticFlowerBase x={72} y={44} />
                  </>
                )}
              </g>
            )}

            {/* RESIDENTIAL STATIC BASE */}
            {zone === 'R' && (
              <g>
                {isBoard3D && (
                  <>
                    <ellipse cx={anchors.heroX} cy={anchors.heroY + 1} rx="14" ry="6.2" fill="#292524" opacity="0.2" />
                    <ellipse cx={anchors.secX} cy={anchors.secY + 1} rx="12.5" ry="5.5" fill="#292524" opacity="0.18" />
                  </>
                )}
                {variant === 0 && (
                  <>
                    <g transform={`translate(${anchors.propX - 10}, ${anchors.propY + 2})`} opacity="0.9">
                      <line x1="0" y1="0" x2="18" y2="0" stroke="#fbf8f2" strokeWidth="1.4" />
                      <line x1="0" y1="3" x2="18" y2="3" stroke="#fbf8f2" strokeWidth="1.4" />
                      {[1, 5, 9, 13, 17].map((fx) => (
                        <rect key={fx} x={fx} y="-2.5" width="1.6" height="7" rx="0.5" fill="#fffdf9" />
                      ))}
                    </g>
                    {!isBoard3D && (
                      <MiniHouseStatic
                        x={anchors.secX}
                        y={anchors.secY}
                        scale={0.84}
                        roofColor={houseRoofs[(accentIdx + 1) % 3].main}
                        roofShade={houseRoofs[(accentIdx + 1) % 3].shade}
                      />
                    )}
                  </>
                )}

                {variant === 1 && (
                  <>
                    {!isBoard3D && (
                      <>
                        <StaticTreeBase x={anchors.propX} y={anchors.propY + 2} scale={0.72} />
                        <MiniHouseStatic
                          x={anchors.secX}
                          y={anchors.secY}
                          scale={0.82}
                          roofColor={houseRoofs[accentIdx].main}
                          roofShade={houseRoofs[accentIdx].shade}
                        />
                      </>
                    )}
                    <StaticFlowerBase x={anchors.propX + 11} y={anchors.propY + 4} />
                  </>
                )}

                {variant === 2 && (
                  <>
                    {!isBoard3D && (
                      <>
                        <MiniHouseStatic
                          x={anchors.secX}
                          y={anchors.secY}
                          scale={0.88}
                          roofColor={houseRoofs[(accentIdx + 2) % 3].main}
                          roofShade={houseRoofs[(accentIdx + 2) % 3].shade}
                          hasChimney
                        />
                        <StaticTreeBase x={anchors.propX} y={anchors.propY} scale={0.74} />
                      </>
                    )}
                  </>
                )}

                {variant === 3 && (
                  <>
                    <ellipse cx={anchors.secX} cy={anchors.secY + 2} rx="14" ry="6" fill="#e9cfb8" opacity="0.65" />
                    {!isBoard3D && (
                      <MiniHouseStatic
                        x={anchors.secX}
                        y={anchors.secY}
                        scale={0.86}
                        roofColor={houseRoofs[accentIdx].main}
                        roofShade={houseRoofs[accentIdx].shade}
                      />
                    )}
                    <StaticFlowerBase x={anchors.propX + 8} y={anchors.propY + 3} />
                  </>
                )}
              </g>
            )}

            {/* COMMERCIAL STATIC BASE */}
            {zone === 'C' && (
              <g>
                <rect
                  x={anchors.secX - 15}
                  y={anchors.secY - 12}
                  width="30"
                  height="18"
                  rx="4"
                  fill="#d6e7f2"
                  opacity="0.55"
                />
                {isBoard3D && (
                  <>
                    <ellipse cx={anchors.heroX} cy={anchors.heroY + 1} rx="14.5" ry="6.2" fill="#292524" opacity="0.2" />
                    <ellipse cx={anchors.secX} cy={anchors.secY + 1} rx="12.5" ry="5.5" fill="#292524" opacity="0.18" />
                  </>
                )}
                {variant === 0 && (
                  <>
                    {!isBoard3D && (
                      <MiniShopStatic
                        x={anchors.secX}
                        y={anchors.secY}
                        scale={0.84}
                        awningA={shopAwnings[(accentIdx + 1) % 3]}
                      />
                    )}
                    <g transform={`translate(${anchors.propX}, ${anchors.propY + 2})`}>
                      <ellipse cx="1" cy="2" rx="5.5" ry="2.2" fill="#292524" opacity="0.16" />
                      <line x1="0" y1="1" x2="0" y2="-6" stroke="#6d5843" strokeWidth="1.2" />
                      <ellipse cx="0" cy="-6.5" rx="6" ry="3.2" fill={shopAwnings[accentIdx]} />
                      <ellipse cx="-1.5" cy="-7" rx="2.4" ry="1.2" fill="#fffdf9" opacity="0.45" />
                    </g>
                  </>
                )}

                {variant === 1 && (
                  <>
                    {!isBoard3D && (
                      <>
                        <MiniShopStatic
                          x={anchors.secX}
                          y={anchors.secY}
                          scale={0.84}
                          awningA={shopAwnings[accentIdx]}
                        />
                        <StaticTreeBase x={anchors.propX} y={anchors.propY + 2} scale={0.68} />
                      </>
                    )}
                  </>
                )}

                {variant === 2 && (
                  <>
                    {!isBoard3D && (
                      <MiniShopStatic
                        x={anchors.secX}
                        y={anchors.secY}
                        scale={0.86}
                        awningA={shopAwnings[(accentIdx + 2) % 3]}
                      />
                    )}
                    <g transform={`translate(${anchors.propX}, ${anchors.propY + 1})`}>
                      <rect x="-7" y="-2" width="4.5" height="3.5" rx="0.8" fill="#c87355" />
                      <circle cx="-4.8" cy="-3.6" r="2.8" fill="#63a170" />
                      <rect x="2" y="-2" width="4.5" height="3.5" rx="0.8" fill="#c87355" />
                      <circle cx="4.2" cy="-3.6" r="2.8" fill="#74b482" />
                    </g>
                  </>
                )}

                {variant === 3 && (
                  <>
                    {!isBoard3D && (
                      <MiniShopStatic
                        x={anchors.secX}
                        y={anchors.secY}
                        scale={0.84}
                        awningA={shopAwnings[accentIdx]}
                        tall
                      />
                    )}
                    <MiniBench x={anchors.propX + 2} y={anchors.propY + 2} scale={0.82} />
                  </>
                )}
              </g>
            )}

            {/* INDUSTRIAL STATIC BASE */}
            {zone === 'I' && (
              <g>
                <rect
                  x={anchors.secX - 14}
                  y={anchors.secY - 10}
                  width="28"
                  height="16"
                  rx="3"
                  fill="#c5b495"
                  opacity="0.65"
                />
                {isBoard3D && (
                  <>
                    <ellipse cx={anchors.heroX} cy={anchors.heroY + 1} rx="15" ry="6.4" fill="#292524" opacity="0.2" />
                    {(variant === 1 || variant === 2) && (
                      <ellipse cx={anchors.secX} cy={anchors.secY + 2} rx="12" ry="5.2" fill="#292524" opacity="0.18" />
                    )}
                  </>
                )}
                {variant === 0 && (
                  <>
                    <MiniCrates x={anchors.secX} y={anchors.secY + 1} accent={cargoColors[accentIdx]} />
                    <MiniCrates x={anchors.propX + 10} y={anchors.propY + 3} accent={cargoColors[(accentIdx + 1) % 3]} />
                  </>
                )}

                {variant === 1 && (
                  <>
                    {!isBoard3D && (
                      <MiniFactoryStatic x={anchors.secX} y={anchors.secY + 1} scale={0.78} variant="warehouse" />
                    )}
                    <MiniCrates x={anchors.propX + 2} y={anchors.propY + 2} accent={cargoColors[accentIdx]} />
                  </>
                )}

                {variant === 2 && !isBoard3D && (
                  <MiniFactoryStatic x={anchors.secX} y={anchors.secY + 1} scale={0.82} variant="silos" />
                )}

                {variant === 3 && (
                  <>
                    <MiniCrates x={anchors.secX - 3} y={anchors.secY + 2} accent={cargoColors[(accentIdx + 2) % 3]} />
                    <g transform={`translate(${anchors.propX - 8}, ${anchors.propY + 1})`} opacity="0.8">
                      <line x1="0" y1="0" x2="18" y2="0" stroke="#78716c" strokeWidth="1.2" />
                      <line x1="0" y1="3.5" x2="18" y2="3.5" stroke="#78716c" strokeWidth="1.2" />
                      {[1, 6, 11, 16].map((fx) => (
                        <line key={fx} x1={fx} y1="-2" x2={fx} y2="5" stroke="#646e78" strokeWidth="1.3" />
                      ))}
                    </g>
                  </>
                )}
              </g>
            )}

            {/* Streetlamp & Park Lantern Poles (Rendered flat in mini/gallery; stood upright in 3D board popout) */}
            {!isBoard3D &&
              lampPositions.map((lp, idx) => (
                <StaticLampPole key={idx} x={lp.x} y={lp.y} scale={lp.scale} />
              ))}
          </svg>

          {/* Animated HTML Base Ornaments (Ground ripples, duck, flowers; trees/smoke promoted to 3D standup on board) */}
          <div className={`${htmlOverlayBoxClass} z-[1]`}>
            {zone === 'P' && variant === 0 && (
              <>
                <AnimatedWaterRipple x={56} y={54} widthPct={23} heightPct={13} delay={delay1} />
                <AnimatedPondDuck x={58} y={53} delay={delay2} />
                <AnimatedFlowerBlooms x={78} y={76} delay={delay1} duration={flowerDur} />
                {!isBoard3D && (
                  <AnimatedTreeCanopy x={22} y={50} scale={0.92} variant="round" delay={delay2} duration={treeDur2} />
                )}
              </>
            )}
            {zone === 'P' && variant === 1 && (
              <>
                <AnimatedFlowerBlooms x={25} y={62} delay={delay1} duration={flowerDur} />
                <AnimatedFlowerBlooms x={77} y={82} delay={delay2} duration={flowerDur} />
                {!isBoard3D && (
                  <>
                    <AnimatedTreeCanopy x={75} y={52} scale={0.95} variant="pine" delay={delay1} duration={treeDur1} />
                    <AnimatedTreeCanopy x={24} y={84} scale={0.78} variant="blossom" delay={delay3} duration={treeDur2} />
                  </>
                )}
              </>
            )}
            {zone === 'P' && variant === 2 && (
              <>
                <AnimatedWaterRipple x={50} y={56} widthPct={15} heightPct={15} delay={delay1} />
                <AnimatedFlowerBlooms x={21} y={76} delay={delay2} duration={flowerDur} />
                {!isBoard3D && (
                  <AnimatedTreeCanopy x={80} y={72} scale={0.85} variant="round" delay={delay1} duration={treeDur1} />
                )}
              </>
            )}
            {zone === 'P' && variant === 3 && (
              <>
                {!isBoard3D && (
                  <>
                    <AnimatedTreeCanopy x={25} y={78} scale={0.86} variant="blossom" delay={delay1} duration={treeDur1} />
                    <AnimatedTreeCanopy x={76} y={72} scale={0.92} variant="pine" delay={delay2} duration={treeDur2} />
                  </>
                )}
                <AnimatedFlowerBlooms x={55} y={82} delay={delay1} duration={flowerDur} />
                <AnimatedFlowerBlooms x={72} y={44} delay={delay3} duration={flowerDur} />
              </>
            )}

            {zone === 'R' && variant === 1 && (
              <>
                {!isBoard3D && (
                  <AnimatedTreeCanopy x={anchors.propX} y={anchors.propY + 2} scale={0.72} variant="round" delay={delay1} duration={treeDur1} />
                )}
                <AnimatedFlowerBlooms x={anchors.propX + 11} y={anchors.propY + 4} delay={delay2} duration={flowerDur} />
              </>
            )}
            {zone === 'R' && variant === 2 && !isBoard3D && (
              <>
                <AnimatedSmokePuff
                  x={anchors.secX + 4.1 * 0.88}
                  y={anchors.secY - 25.2 * 0.88}
                  sizePct={5.2}
                  delay={delay1}
                />
                <AnimatedTreeCanopy x={anchors.propX} y={anchors.propY} scale={0.74} variant="blossom" delay={delay2} duration={treeDur2} />
              </>
            )}
            {zone === 'R' && variant === 3 && (
              <AnimatedFlowerBlooms x={anchors.propX + 8} y={anchors.propY + 3} delay={delay1} duration={flowerDur} />
            )}

            {zone === 'C' && variant === 1 && !isBoard3D && (
              <AnimatedTreeCanopy x={anchors.propX} y={anchors.propY + 2} scale={0.68} variant="round" delay={delay1} duration={treeDur1} />
            )}
          </div>

          {/* Crisp Soft Asphalt Road Layer (Always above base ground ornaments & connected seamlessly) */}
          {hasRoads && (
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 w-full h-full pointer-events-none z-[2]"
              aria-hidden="true"
            >
              {/* Subtle Road Curb */}
              {roads.top && (
                <line x1="50" y1="50" x2="50" y2="0" stroke="#7d8791" strokeWidth="26" strokeLinecap="square" />
              )}
              {roads.right && (
                <line x1="50" y1="50" x2={isMini ? 124 : 100} y2="50" stroke="#7d8791" strokeWidth="26" strokeLinecap="square" />
              )}
              {roads.bottom && (
                <line x1="50" y1="50" x2="50" y2="100" stroke="#7d8791" strokeWidth="26" strokeLinecap="square" />
              )}
              {roads.left && (
                <line x1="50" y1="50" x2={isMini ? -24 : 0} y2="50" stroke="#7d8791" strokeWidth="26" strokeLinecap="square" />
              )}

              {/* Soft Asphalt Base (#646e78) */}
              {roads.top && (
                <line x1="50" y1="50" x2="50" y2="0" stroke="#646e78" strokeWidth="21" strokeLinecap="square" />
              )}
              {roads.right && (
                <line x1="50" y1="50" x2={isMini ? 124 : 100} y2="50" stroke="#646e78" strokeWidth="21" strokeLinecap="square" />
              )}
              {roads.bottom && (
                <line x1="50" y1="50" x2="50" y2="100" stroke="#646e78" strokeWidth="21" strokeLinecap="square" />
              )}
              {roads.left && (
                <line x1="50" y1="50" x2={isMini ? -24 : 0} y2="50" stroke="#646e78" strokeWidth="21" strokeLinecap="square" />
              )}

              {/* Smooth Intersection Hub */}
              <circle cx="50" cy="50" r="10.5" fill="#646e78" />

              {/* Soft Cream Center Dashes (#fdf8ee) */}
              {roads.top && (
                <line x1="50" y1="50" x2="50" y2="0" stroke="#fdf8ee" strokeWidth="2.8" strokeDasharray="6,5" strokeLinecap="round" />
              )}
              {roads.right && (
                <line x1="50" y1="50" x2={isMini ? 124 : 100} y2="50" stroke="#fdf8ee" strokeWidth="2.8" strokeDasharray="6,5" strokeLinecap="round" />
              )}
              {roads.bottom && (
                <line x1="50" y1="50" x2="50" y2="100" stroke="#fdf8ee" strokeWidth="2.8" strokeDasharray="6,5" strokeLinecap="round" />
              )}
              {roads.left && (
                <line x1="50" y1="50" x2={isMini ? -24 : 0} y2="50" stroke="#fdf8ee" strokeWidth="2.8" strokeDasharray="6,5" strokeLinecap="round" />
              )}
            </svg>
          )}

        {/* Lightweight Zero-Filter Twilight/Night Shade Overlay (Dims ground, base roofs & asphalt without CSS filter passes) */}
        <div
          className="absolute inset-0 w-full h-full pointer-events-none z-[2]"
          style={{
            backgroundColor: '#0b142c',
            opacity: 'var(--city-tile-shade, 0)'
          }}
        />

        {/* Un-dimmed Emissive Base Lights (Flat secondary windows in mini/gallery + always-flat streetlamp ground pools) */}
        {!isBoard3D && (
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 w-full h-full pointer-events-none z-[3]"
            style={{ opacity: 'var(--city-window-opacity, 0)' }}
            aria-hidden="true"
          >
            {zone === 'R' && (
              <MiniHouseLights
                x={anchors.secX}
                y={anchors.secY}
                scale={variant === 0 ? 0.84 : variant === 1 ? 0.82 : variant === 2 ? 0.88 : 0.86}
              />
            )}
            {zone === 'C' && (
              <MiniShopLights
                x={anchors.secX}
                y={anchors.secY}
                scale={variant === 2 ? 0.86 : 0.84}
                tall={variant === 3}
              />
            )}
            {zone === 'I' && variant === 1 && (
              <MiniFactoryLights x={anchors.secX} y={anchors.secY + 1} scale={0.78} variant="warehouse" />
            )}
            {zone === 'I' && variant === 2 && (
              <MiniFactoryLights x={anchors.secX} y={anchors.secY + 1} scale={0.82} variant="silos" />
            )}
          </svg>
        )}

        <div className={`${htmlOverlayBoxClass} z-[4]`}>
          {/* Warm Streetlamp / Park Lantern Ground Light Pools Illuminating Sidewalk & Asphalt */}
          {lampPositions.map((lp, idx) => (
            <LampGroundPool key={idx} x={lp.x} y={lp.y} scale={lp.scale} />
          ))}

          {/* Secondary Building Warm Window Spill Halos (flat only in mini/gallery; stood upright on 3D board) */}
          {!isBoard3D && zone === 'R' && (
            <AnimatedWindowGlow x={anchors.secX - 2} y={anchors.secY - 6} sizePct={26} />
          )}
          {!isBoard3D && zone === 'C' && (
            <AnimatedWindowGlow x={anchors.secX - 3} y={anchors.secY - 5} sizePct={28} />
          )}
          {!isBoard3D && zone === 'I' && (variant === 1 || variant === 2) && (
            <AnimatedWindowGlow x={anchors.secX - 2} y={anchors.secY - 8} sizePct={24} />
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // LAYER 2: 2.5D / 3D POP-OUT HERO & STANDUP ORNAMENTS
  // =========================================================================
  const heroScale = isMini ? 0.82 : 0.96;
  const heroY = isMini ? Math.max(anchors.heroY, 27) : anchors.heroY;
  const isHouseTall = variant === 1 || variant === 3;
  const hasHouseChimney = variant === 0 || variant === 1;
  const isShopTall = variant === 1 || variant === 2;
  const hasShopSign = variant === 0 || variant === 1 || variant === 3;
  const factoryVariant = variant === 1 ? 'silos' : variant === 2 ? 'warehouse' : 'sawtooth';

  // True 3D Upright Diorama Standup Layer for Board Mode (zero "rebahan" at any zoom/tilt/orbit!)
  if (isBoard3D) {
    const standupTrees: Array<{
      key: string;
      x: number;
      y: number;
      scale: number;
      variant: 'pine' | 'round' | 'blossom';
      delay: string;
      duration: string;
    }> = [];

    if (zone === 'P') {
      if (variant === 0) {
        standupTrees.push(
          { key: 'ph1', x: 28, y: 20, scale: 1.18, variant: 'pine', delay: delay1, duration: treeDur1 },
          { key: 'ph2', x: 72, y: 23, scale: 0.98, variant: 'round', delay: delay2, duration: treeDur2 },
          { key: 'ps1', x: 22, y: 50, scale: 0.92, variant: 'round', delay: delay2, duration: treeDur2 }
        );
      } else if (variant === 1) {
        standupTrees.push(
          { key: 'ph1', x: 26, y: 20, scale: 1.18, variant: 'round', delay: delay1, duration: treeDur1 },
          { key: 'ph2', x: 70, y: 21, scale: 1.08, variant: 'pine', delay: delay2, duration: treeDur2 },
          { key: 'ps1', x: 75, y: 52, scale: 0.95, variant: 'pine', delay: delay1, duration: treeDur1 },
          { key: 'ps2', x: 24, y: 84, scale: 0.78, variant: 'blossom', delay: delay3, duration: treeDur2 }
        );
      } else if (variant === 2) {
        standupTrees.push(
          { key: 'ph1', x: 24, y: 20, scale: 1.15, variant: 'pine', delay: delay1, duration: treeDur1 },
          { key: 'ph2', x: 75, y: 22, scale: 1.08, variant: 'blossom', delay: delay2, duration: treeDur2 },
          { key: 'ps1', x: 80, y: 72, scale: 0.85, variant: 'round', delay: delay1, duration: treeDur1 }
        );
      } else {
        standupTrees.push(
          { key: 'ph1', x: 70, y: 20, scale: 1.18, variant: 'blossom', delay: delay1, duration: treeDur1 },
          { key: 'ph2', x: 26, y: 22, scale: 1.05, variant: 'pine', delay: delay2, duration: treeDur2 },
          { key: 'ps1', x: 25, y: 78, scale: 0.86, variant: 'blossom', delay: delay1, duration: treeDur1 },
          { key: 'ps2', x: 76, y: 72, scale: 0.92, variant: 'pine', delay: delay2, duration: treeDur2 }
        );
      }
    } else if (zone === 'R') {
      if (variant === 1) {
        standupTrees.push({
          key: 'rs1',
          x: anchors.propX,
          y: anchors.propY + 2,
          scale: 0.72,
          variant: 'round',
          delay: delay1,
          duration: treeDur1
        });
      } else if (variant === 2) {
        standupTrees.push({
          key: 'rs2',
          x: anchors.propX,
          y: anchors.propY,
          scale: 0.74,
          variant: 'blossom',
          delay: delay2,
          duration: treeDur2
        });
      }
    } else if (zone === 'C' && variant === 1) {
      standupTrees.push({
        key: 'cs1',
        x: anchors.propX,
        y: anchors.propY + 2,
        scale: 0.68,
        variant: 'round',
        delay: delay1,
        duration: treeDur1
      });
    }

    const secHouseScale = variant === 0 ? 0.84 : variant === 1 ? 0.82 : variant === 2 ? 0.88 : 0.86;
    const secHouseRoof =
      variant === 0
        ? houseRoofs[(accentIdx + 1) % 3]
        : variant === 2
        ? houseRoofs[(accentIdx + 2) % 3]
        : houseRoofs[accentIdx];
    const secShopScale = variant === 2 ? 0.86 : 0.84;
    const secShopAwning =
      variant === 0
        ? shopAwnings[(accentIdx + 1) % 3]
        : variant === 2
        ? shopAwnings[(accentIdx + 2) % 3]
        : shopAwnings[accentIdx];

    return (
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-visible diorama-stage-3d">
        {/* Upright Standing Hero Building */}
        {zone === 'R' && (
          <DioramaStandup x={anchors.heroX} y={heroY} liftZ={3.2}>
            <svg viewBox="0 0 100 100" overflow="visible" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
              <MiniHouseStatic
                x={0}
                y={0}
                scale={heroScale}
                roofColor={houseRoofs[accentIdx].main}
                roofShade={houseRoofs[accentIdx].shade}
                tall={isHouseTall}
                hasChimney={hasHouseChimney}
                detailVariant={detailVariant}
              />
            </svg>
            <svg
              viewBox="0 0 100 100"
              overflow="visible"
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ opacity: 'var(--city-window-opacity, 0)' }}
              aria-hidden="true"
            >
              <MiniHouseLights x={0} y={0} scale={heroScale} tall={isHouseTall} />
            </svg>
            {hasHouseChimney && (
              <AnimatedSmokePuff
                x={4.1 * heroScale}
                y={-(isHouseTall ? 31.2 : 25.2) * heroScale}
                sizePct={6 * heroScale}
                delay={delay1}
              />
            )}
            <AnimatedWindowGlow
              x={-3 * heroScale}
              y={-(isHouseTall ? 10 : 6) * heroScale}
              sizePct={30 * heroScale}
            />
          </DioramaStandup>
        )}

        {zone === 'C' && (
          <DioramaStandup x={anchors.heroX} y={heroY} liftZ={3.2}>
            <svg viewBox="0 0 100 100" overflow="visible" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
              <MiniShopStatic
                x={0}
                y={0}
                scale={heroScale}
                awningA={shopAwnings[accentIdx]}
                tall={isShopTall}
                detailVariant={detailVariant}
              />
            </svg>
            <svg
              viewBox="0 0 100 100"
              overflow="visible"
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ opacity: 'var(--city-window-opacity, 0)' }}
              aria-hidden="true"
            >
              <MiniShopLights x={0} y={0} scale={heroScale} tall={isShopTall} />
            </svg>
            {hasShopSign && (
              <AnimatedCafeSign
                x={-2 * heroScale}
                y={-((isShopTall ? 20 : 15) + 3) * heroScale}
                scale={heroScale}
                awningColor={shopAwnings[accentIdx]}
                delay={delay1}
              />
            )}
            <AnimatedWindowGlow
              x={-3.5 * heroScale}
              y={-(isShopTall ? 8 : 5) * heroScale}
              sizePct={32 * heroScale}
            />
          </DioramaStandup>
        )}

        {zone === 'I' && (
          <DioramaStandup x={anchors.heroX} y={heroY} liftZ={3.2}>
            <svg viewBox="0 0 100 100" overflow="visible" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
              <MiniFactoryStatic x={0} y={0} scale={heroScale} variant={factoryVariant} />
            </svg>
            <svg
              viewBox="0 0 100 100"
              overflow="visible"
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ opacity: 'var(--city-window-opacity, 0)' }}
              aria-hidden="true"
            >
              <MiniFactoryLights x={0} y={0} scale={heroScale} variant={factoryVariant} />
            </svg>
            {factoryVariant === 'sawtooth' && (
              <>
                <AnimatedSmokePuff
                  x={5.5 * heroScale}
                  y={-28.5 * heroScale}
                  sizePct={7.2 * heroScale}
                  delay={delay1}
                  duration="3.1s"
                />
                <AnimatedSmokePuff
                  x={6.9 * heroScale}
                  y={-29.5 * heroScale}
                  sizePct={5.8 * heroScale}
                  delay={delay2}
                  duration="3.1s"
                />
              </>
            )}
            <AnimatedWindowGlow
              x={-3 * heroScale}
              y={-(factoryVariant === 'silos' ? 18 : 6) * heroScale}
              sizePct={26 * heroScale}
            />
          </DioramaStandup>
        )}

        {/* Upright Standing Secondary Buildings */}
        {zone === 'R' && (
          <DioramaStandup x={anchors.secX} y={anchors.secY} liftZ={2.8}>
            <svg viewBox="0 0 100 100" overflow="visible" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
              <MiniHouseStatic
                x={0}
                y={0}
                scale={secHouseScale}
                roofColor={secHouseRoof.main}
                roofShade={secHouseRoof.shade}
                hasChimney={variant === 2}
                detailVariant={secDetailVariant}
              />
            </svg>
            <svg
              viewBox="0 0 100 100"
              overflow="visible"
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ opacity: 'var(--city-window-opacity, 0)' }}
              aria-hidden="true"
            >
              <MiniHouseLights x={0} y={0} scale={secHouseScale} />
            </svg>
            {variant === 2 && (
              <AnimatedSmokePuff
                x={4.1 * secHouseScale}
                y={-25.2 * secHouseScale}
                sizePct={5.2}
                delay={delay1}
              />
            )}
            <AnimatedWindowGlow x={-2} y={-6} sizePct={26} />
          </DioramaStandup>
        )}

        {zone === 'C' && (
          <DioramaStandup x={anchors.secX} y={anchors.secY} liftZ={2.8}>
            <svg viewBox="0 0 100 100" overflow="visible" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
              <MiniShopStatic
                x={0}
                y={0}
                scale={secShopScale}
                awningA={secShopAwning}
                tall={variant === 3}
                detailVariant={secDetailVariant}
              />
            </svg>
            <svg
              viewBox="0 0 100 100"
              overflow="visible"
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ opacity: 'var(--city-window-opacity, 0)' }}
              aria-hidden="true"
            >
              <MiniShopLights x={0} y={0} scale={secShopScale} tall={variant === 3} />
            </svg>
            <AnimatedWindowGlow x={-3} y={-5} sizePct={28} />
          </DioramaStandup>
        )}

        {zone === 'I' && (variant === 1 || variant === 2) && (
          <DioramaStandup x={anchors.secX} y={anchors.secY + 1} liftZ={2.8}>
            <svg viewBox="0 0 100 100" overflow="visible" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
              <MiniFactoryStatic
                x={0}
                y={0}
                scale={variant === 1 ? 0.78 : 0.82}
                variant={variant === 1 ? 'warehouse' : 'silos'}
              />
            </svg>
            <svg
              viewBox="0 0 100 100"
              overflow="visible"
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ opacity: 'var(--city-window-opacity, 0)' }}
              aria-hidden="true"
            >
              <MiniFactoryLights
                x={0}
                y={0}
                scale={variant === 1 ? 0.78 : 0.82}
                variant={variant === 1 ? 'warehouse' : 'silos'}
              />
            </svg>
            <AnimatedWindowGlow x={-2} y={-8} sizePct={24} />
          </DioramaStandup>
        )}

        {/* Upright Standing Swaying Trees */}
        {standupTrees.map((tree) => (
          <DioramaStandup key={tree.key} x={tree.x} y={tree.y} liftZ={2.6}>
            <svg viewBox="0 0 100 100" overflow="visible" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
              <StaticTreeBase x={0} y={0} scale={tree.scale} />
            </svg>
            <AnimatedTreeCanopy
              x={0}
              y={0}
              scale={tree.scale}
              variant={tree.variant}
              delay={tree.delay}
              duration={tree.duration}
            />
          </DioramaStandup>
        ))}

        {/* Upright Standing Streetlamps & Glowing Night Halos */}
        {lampPositions.map((lp, idx) => (
          <DioramaStandup key={`lamp-${idx}`} x={lp.x} y={lp.y} liftZ={2.2}>
            <svg viewBox="0 0 100 100" overflow="visible" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
              <StaticLampPole x={0} y={0} scale={lp.scale} />
            </svg>
            <AnimatedLampGlow x={0} y={0} scale={lp.scale} />
          </DioramaStandup>
        ))}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20">
      {/* Static Pop-Out Structures & Tree Trunks (Zero CSS filter for crisp 60fps pop-out contrast) */}
      <svg
        viewBox="0 0 100 100"
        overflow="visible"
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      >
          {zone === 'P' && variant === 0 && (
            <>
              <StaticTreeBase x={28} y={isMini ? 24 : 20} scale={isMini ? 0.92 : 1.18} />
              <StaticTreeBase x={72} y={isMini ? 26 : 23} scale={isMini ? 0.8 : 0.98} />
            </>
          )}
          {zone === 'P' && variant === 1 && (
            <>
              <StaticTreeBase x={26} y={isMini ? 24 : 20} scale={isMini ? 0.92 : 1.18} />
              <StaticTreeBase x={70} y={isMini ? 25 : 21} scale={isMini ? 0.84 : 1.08} />
            </>
          )}
          {zone === 'P' && variant === 2 && (
            <>
              <StaticTreeBase x={24} y={isMini ? 24 : 20} scale={isMini ? 0.88 : 1.15} />
              <StaticTreeBase x={75} y={isMini ? 25 : 22} scale={isMini ? 0.86 : 1.08} />
            </>
          )}
          {zone === 'P' && variant === 3 && (
            <>
              <StaticTreeBase x={70} y={isMini ? 24 : 20} scale={isMini ? 0.92 : 1.18} />
              <StaticTreeBase x={26} y={isMini ? 26 : 22} scale={isMini ? 0.84 : 1.05} />
            </>
          )}

          {zone === 'R' && (
            <MiniHouseStatic
              x={anchors.heroX}
              y={heroY}
              scale={heroScale}
              roofColor={houseRoofs[accentIdx].main}
              roofShade={houseRoofs[accentIdx].shade}
              tall={isHouseTall}
              hasChimney={hasHouseChimney}
            />
          )}

          {zone === 'C' && (
            <MiniShopStatic
              x={anchors.heroX}
              y={heroY}
              scale={heroScale}
              awningA={shopAwnings[accentIdx]}
              tall={isShopTall}
            />
          )}

          {zone === 'I' && (
            <MiniFactoryStatic
              x={anchors.heroX}
              y={heroY}
              scale={heroScale}
              variant={factoryVariant}
            />
          )}
        </svg>

        {/* Animated HTML Pop-Out Ornaments (Tall Swaying Trees, Rising Smoke, Rooftop Cafe Signs) */}
        <div className={htmlOverlayBoxClass}>
          {zone === 'P' && variant === 0 && (
            <>
              <AnimatedTreeCanopy x={28} y={isMini ? 24 : 20} scale={isMini ? 0.92 : 1.18} variant="pine" delay={delay1} duration={treeDur1} />
              <AnimatedTreeCanopy x={72} y={isMini ? 26 : 23} scale={isMini ? 0.8 : 0.98} variant="round" delay={delay2} duration={treeDur2} />
            </>
          )}
          {zone === 'P' && variant === 1 && (
            <>
              <AnimatedTreeCanopy x={26} y={isMini ? 24 : 20} scale={isMini ? 0.92 : 1.18} variant="round" delay={delay1} duration={treeDur1} />
              <AnimatedTreeCanopy x={70} y={isMini ? 25 : 21} scale={isMini ? 0.84 : 1.08} variant="pine" delay={delay2} duration={treeDur2} />
            </>
          )}
          {zone === 'P' && variant === 2 && (
            <>
              <AnimatedTreeCanopy x={24} y={isMini ? 24 : 20} scale={isMini ? 0.88 : 1.15} variant="pine" delay={delay1} duration={treeDur1} />
              <AnimatedTreeCanopy x={75} y={isMini ? 25 : 22} scale={isMini ? 0.86 : 1.08} variant="blossom" delay={delay2} duration={treeDur2} />
            </>
          )}
          {zone === 'P' && variant === 3 && (
            <>
              <AnimatedTreeCanopy x={70} y={isMini ? 24 : 20} scale={isMini ? 0.92 : 1.18} variant="blossom" delay={delay1} duration={treeDur1} />
              <AnimatedTreeCanopy x={26} y={isMini ? 26 : 22} scale={isMini ? 0.84 : 1.05} variant="pine" delay={delay2} duration={treeDur2} />
            </>
          )}

          {/* Residential Hero Chimney Smoke */}
          {zone === 'R' && hasHouseChimney && (
            <AnimatedSmokePuff
              x={anchors.heroX + 4.1 * heroScale}
              y={heroY - (isHouseTall ? 31.2 : 25.2) * heroScale}
              sizePct={6 * heroScale}
              delay={delay1}
            />
          )}

          {/* Commercial Hero Rooftop Cafe Sign */}
          {zone === 'C' && hasShopSign && (
            <AnimatedCafeSign
              x={anchors.heroX - 2 * heroScale}
              y={heroY - ((isShopTall ? 20 : 15) + 3) * heroScale}
              scale={heroScale}
              awningColor={shopAwnings[accentIdx]}
              delay={delay1}
            />
          )}

          {/* Industrial Hero Smokestack Dual Steam Puffs */}
          {zone === 'I' && factoryVariant === 'sawtooth' && (
            <>
              <AnimatedSmokePuff
                x={anchors.heroX + 5.5 * heroScale}
                y={heroY - 28.5 * heroScale}
                sizePct={7.2 * heroScale}
                delay={delay1}
                duration="3.1s"
              />
              <AnimatedSmokePuff
                x={anchors.heroX + 6.9 * heroScale}
                y={heroY - 29.5 * heroScale}
                sizePct={5.8 * heroScale}
                delay={delay2}
                duration="3.1s"
              />
            </>
          )}
        </div>

      {/* Un-dimmed Emissive Hero Windows (100% Pure Golden Contrast Above Night Surfaces) */}
      <svg
        viewBox="0 0 100 100"
        overflow="visible"
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 'var(--city-window-opacity, 0)' }}
        aria-hidden="true"
      >
        {zone === 'R' && (
          <MiniHouseLights x={anchors.heroX} y={heroY} scale={heroScale} tall={isHouseTall} />
        )}
        {zone === 'C' && (
          <MiniShopLights x={anchors.heroX} y={heroY} scale={heroScale} tall={isShopTall} />
        )}
        {zone === 'I' && (
          <MiniFactoryLights x={anchors.heroX} y={heroY} scale={heroScale} variant={factoryVariant} />
        )}
      </svg>

      {/* Un-dimmed Unclipped Golden Streetlamp Blooms & Warm Hero Window Spill Halos */}
      <div className={htmlOverlayBoxClass}>
        {lampPositions.map((lp, idx) => (
          <AnimatedLampGlow key={idx} x={lp.x} y={lp.y} scale={lp.scale} />
        ))}

        {zone === 'R' && (
          <AnimatedWindowGlow
            x={anchors.heroX - 3 * heroScale}
            y={heroY - (isHouseTall ? 10 : 6) * heroScale}
            sizePct={30 * heroScale}
          />
        )}
        {zone === 'C' && (
          <AnimatedWindowGlow
            x={anchors.heroX - 3.5 * heroScale}
            y={heroY - (isShopTall ? 8 : 5) * heroScale}
            sizePct={32 * heroScale}
          />
        )}
        {zone === 'I' && (
          <AnimatedWindowGlow
            x={anchors.heroX - 3 * heroScale}
            y={heroY - (factoryVariant === 'silos' ? 18 : 6) * heroScale}
            sizePct={26 * heroScale}
          />
        )}
      </div>
    </div>
  );
});
