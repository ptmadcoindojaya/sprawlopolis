import React from 'react';

interface EmptyCellTerrainProps {
  x: number;
  y: number;
}

/**
 * Deterministic hash for any signed grid coordinate (x, y)
 * Produces consistent, natural outskirts terrain per empty square.
 */
function hashCoord(x: number, y: number): number {
  let h =
    Math.imul(x + 10007, 374761393) ^
    Math.imul(y + 20011, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Passive, low-contrast outskirts nature ornament for empty grid coordinates.
 * Intentionally muted to blend softly into the #efe9dc tabletop surface while
 * keeping the top-left coordinate label (0..32, 0..24) completely clear.
 */
export const EmptyCellTerrain: React.FC<EmptyCellTerrainProps> = React.memo(({ x, y }) => {
  const seed = hashCoord(x, y);
  const variant = seed % 8;
  const shiftX = ((seed >>> 4) % 9) - 4; // -4..+4 subtle organic offset
  const shiftY = ((seed >>> 8) % 9) - 4;

  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 w-full h-full pointer-events-none select-none opacity-[0.46]"
      aria-hidden="true"
    >
      <g transform={`translate(${shiftX}, ${shiftY})`}>
        {/* Variant 0: Soft grass meadow tufts */}
        {variant === 0 && (
          <>
            <ellipse cx="60" cy="64" rx="22" ry="12" fill="#e2dcc8" opacity="0.7" />
            <g stroke="#a5b498" strokeWidth="1.8" strokeLinecap="round" fill="none">
              <path d="M52,66 Q50,59 47,57 M52,66 L52,55 M52,66 Q55,60 57,58" />
              <path d="M71,54 Q69,48 67,47 M71,54 L71,45 M71,54 Q74,49 76,48" />
              <path d="M36,77 Q34,72 32,71 M36,77 L36,69 M36,77 Q39,72 40,71" />
            </g>
          </>
        )}

        {/* Variant 1: Dry sandy earth & small smooth river pebbles */}
        {variant === 1 && (
          <>
            <ellipse cx="58" cy="62" rx="21" ry="11" fill="#e1d6be" opacity="0.75" />
            <ellipse cx="48" cy="61" rx="5.2" ry="3.2" fill="#c7bc9f" />
            <ellipse cx="47.2" cy="60.2" rx="2.4" ry="1.2" fill="#ddd3bc" opacity="0.8" />
            <ellipse cx="62" cy="66" rx="3.8" ry="2.4" fill="#cfc4a8" />
            <ellipse cx="70" cy="56" rx="2.6" ry="1.8" fill="#c3b79b" />
            <circle cx="38" cy="76" r="1.8" fill="#c8bda2" />
            <circle cx="43" cy="78" r="1.2" fill="#d2c7ae" />
          </>
        )}

        {/* Variant 2: Faint miniature pine woodland cluster */}
        {variant === 2 && (
          <>
            <ellipse cx="66" cy="68" rx="19" ry="7" fill="#dcd4be" opacity="0.65" />
            {/* Back pine */}
            <rect x="74" y="57" width="2" height="5" fill="#b4a088" />
            <polygon points="69,58 75,45 81,58" fill="#b5c2a8" />
            <polygon points="70.5,52 75,41 79.5,52" fill="#c2ceba" />
            {/* Mid pine */}
            <rect x="57" y="64" width="2.4" height="6" fill="#ac9880" />
            <polygon points="50,65 58.2,48 66.4,65" fill="#a5b498" />
            <polygon points="52,57 58.2,43 64.4,57" fill="#b6c4aa" />
            {/* Small front pine */}
            <rect x="69" y="67" width="1.8" height="4.5" fill="#b4a088" />
            <polygon points="64.5,68 70,57 75.5,68" fill="#9fb092" />
          </>
        )}

        {/* Variant 3: Wild low bushes & subtle meadow flecks */}
        {variant === 3 && (
          <>
            <ellipse cx="54" cy="70" rx="18" ry="6.5" fill="#dfd7c2" opacity="0.6" />
            <circle cx="46" cy="68" r="6.5" fill="#b3c0a5" />
            <circle cx="54" cy="65" r="7.5" fill="#a8b79a" />
            <circle cx="62" cy="68.5" r="5.5" fill="#bcc8af" />
            {/* Tiny faded cream wildflower dots */}
            <circle cx="49" cy="65" r="1.3" fill="#f3ecd9" />
            <circle cx="57" cy="67" r="1.2" fill="#ead8b1" />
            <circle cx="72" cy="44" r="4.2" fill="#bac6ad" opacity="0.7" />
            <circle cx="77" cy="46" r="3.2" fill="#aebba0" opacity="0.7" />
          </>
        )}

        {/* Variant 4: Gentle topographic contour ridge & rocky dust */}
        {variant === 4 && (
          <>
            <path
              d="M28,74 Q54,54 84,64"
              fill="none"
              stroke="#cfc4ac"
              strokeWidth="1.5"
              strokeDasharray="4,4"
              strokeLinecap="round"
            />
            <path
              d="M38,83 Q58,69 80,76"
              fill="none"
              stroke="#d6cbb4"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <ellipse cx="64" cy="46" rx="4.2" ry="2.5" fill="#ccc1a7" />
            <ellipse cx="71" cy="49" rx="2.4" ry="1.6" fill="#d5cab2" />
          </>
        )}

        {/* Variant 5: Solitary rounded country tree & stone */}
        {variant === 5 && (
          <>
            <ellipse cx="64" cy="67" rx="13" ry="5" fill="#dcd4be" opacity="0.7" />
            <rect x="61.5" y="57" width="3" height="9" rx="1" fill="#b19d85" />
            <circle cx="58" cy="53" r="6.5" fill="#aebca1" />
            <circle cx="67" cy="53.5" r="6" fill="#a3b296" />
            <circle cx="63" cy="47.5" r="7.2" fill="#bac7ae" />
            <ellipse cx="44" cy="76" rx="4" ry="2.2" fill="#cbc0a6" />
          </>
        )}

        {/* Variant 6: Sparse grass blades & soft dry soil */}
        {variant === 6 && (
          <>
            <ellipse cx="48" cy="58" rx="16" ry="8" fill="#e5decb" opacity="0.65" />
            <g stroke="#adb99f" strokeWidth="1.6" strokeLinecap="round" fill="none">
              <path d="M44,58 Q42,53 40,52 M44,58 L44,51 M44,58 Q46,54 48,53" />
              <path d="M74,74 Q72,69 70,68 M74,74 L74,67 M74,74 Q76,70 78,69" />
            </g>
            <circle cx="63" cy="44" r="1.5" fill="#ccc1a7" />
          </>
        )}

        {/* Variant 7: Calm open outskirts clearing (airy breathing room) */}
        {variant === 7 && (
          <>
            <ellipse cx="62" cy="64" rx="14" ry="7" fill="#e5decb" opacity="0.5" />
            <circle cx="58" cy="63" r="1.5" fill="#cfc4ab" />
            <circle cx="66" cy="67" r="1.2" fill="#d4cab2" />
            <path
              d="M38,76 Q37,72 35,71 M38,76 L38,70"
              stroke="#b1bda3"
              strokeWidth="1.4"
              strokeLinecap="round"
              fill="none"
            />
          </>
        )}
      </g>
    </svg>
  );
});

EmptyCellTerrain.displayName = 'EmptyCellTerrain';
