import React from 'react';

/**
 * 12-point trend sparkline for a stat tile: prior points recede, the current
 * point carries the accent. No axes, no labels — the tile's value is the
 * headline and this is context.
 */
function Sparkline({ values = [], width = 168, height = 46 }) {
  if (values.length < 2) return null;

  const max = Math.max(...values, Number.EPSILON);
  const stepX = width / (values.length - 1);
  const toY = (v) => height - 4 - (v / max) * (height - 10);

  const path = values
    .map((v, i) => `${i ? 'L' : 'M'}${(i * stepX).toFixed(2)},${toY(v).toFixed(2)}`)
    .join(' ');

  const lastX = (values.length - 1) * stepX;
  const lastY = toY(values[values.length - 1]);

  return (
    <svg
      className="sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
    >
      <path d={`${path} L${lastX.toFixed(2)},${height} L0,${height} Z`} className="sparkline-area" />
      <path d={path} className="sparkline-line" />
      <circle cx={lastX} cy={lastY} r={4} className="sparkline-dot" />
    </svg>
  );
}

export default Sparkline;
