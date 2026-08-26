import React, { useId } from 'react';

/**
 * Sentinel mark: a camera aperture of six clay blades opening onto a pink
 * centre — the lens is watching, and something is in view.
 *
 * Gradient ids are generated per-instance so multiple logos on one page
 * cannot collide (duplicate SVG ids would make them share a fill).
 */
function Logo({ size = 42, className = '', title = 'Sentinel' }) {
  const uid = useId().replace(/:/g, '');
  const body = `body-${uid}`;
  const core = `core-${uid}`;
  const clip = `clip-${uid}`;
  const shadow = `shadow-${uid}`;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Clay body: lit from the upper left, deepening to the lower right */}
        <linearGradient id={body} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="55%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#075985" />
        </linearGradient>

        {/* The aperture opening */}
        <radialGradient id={core} cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#F9A8D4" />
          <stop offset="100%" stopColor="#DB2777" />
        </radialGradient>

        <clipPath id={clip}>
          <rect width="64" height="64" rx="19" />
        </clipPath>

        <filter id={shadow} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow
            dx="0"
            dy="1.2"
            stdDeviation="1.2"
            floodColor="#04384F"
            floodOpacity="0.38"
          />
        </filter>
      </defs>

      {/* Squircle body */}
      <rect width="64" height="64" rx="19" fill={`url(#${body})`} />

      {/* Diffused sheen from the top-left light source */}
      <g clipPath={`url(#${clip})`}>
        <ellipse cx="18" cy="10" rx="30" ry="18" fill="#FFFFFF" opacity="0.18" />
      </g>

      {/* Six aperture blades, alternating tone so the facets read as folded clay */}
      <g filter={`url(#${shadow})`}>
        <path d="M40,32 L51,32 A19,19 0 0,1 41.5,48.45 L36,38.93 Z" fill="#FFFFFF" opacity="0.95" />
        <path d="M36,38.93 L41.5,48.45 A19,19 0 0,1 22.5,48.45 L28,38.93 Z" fill="#FFFFFF" opacity="0.72" />
        <path d="M28,38.93 L22.5,48.45 A19,19 0 0,1 13,32 L24,32 Z" fill="#FFFFFF" opacity="0.95" />
        <path d="M24,32 L13,32 A19,19 0 0,1 22.5,15.55 L28,25.07 Z" fill="#FFFFFF" opacity="0.72" />
        <path d="M28,25.07 L22.5,15.55 A19,19 0 0,1 41.5,15.55 L36,25.07 Z" fill="#FFFFFF" opacity="0.95" />
        <path d="M36,25.07 L41.5,15.55 A19,19 0 0,1 51,32 L40,32 Z" fill="#FFFFFF" opacity="0.72" />
      </g>

      {/* The opening */}
      <path
        d="M40,32 L36,38.93 L28,38.93 L24,32 L28,25.07 L36,25.07 Z"
        fill={`url(#${core})`}
      />

      {/* Rim light along the clay edge */}
      <rect
        x="0.75"
        y="0.75"
        width="62.5"
        height="62.5"
        rx="18.25"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.3"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export default Logo;
