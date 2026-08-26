import React, { useMemo, useRef, useState } from 'react';
import './../css/AnomalyTimeline.css';

// Plot geometry. The viewBox includes the axis bands so the card never needs
// a nested scrollbar to show the x labels.
const W = 800;
const H = 260;
const PAD = { top: 16, right: 18, bottom: 34, left: 56 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const fmtScore = (v) => (v >= 0.01 ? v.toFixed(4) : v.toExponential(1));
const fmtTime = (sec) => {
  if (!Number.isFinite(sec)) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${s.toFixed(0).padStart(2, '0')}` : `${s.toFixed(1)}s`;
};

function AnomalyTimeline({
  scores = [],
  threshold = 0,
  fps = 30,
  totalFrames = 0,
  segments = [],
}) {
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);
  const [showTable, setShowTable] = useState(false);

  const frames = totalFrames || (scores.length ? scores[scores.length - 1].i + 1 : 0);

  const { yMax, toX, toY, linePath, areaPath, flagged, yTicks, xTicks } = useMemo(() => {
    const peak = scores.reduce((m, p) => Math.max(m, p.v), 0);
    const top = Math.max(peak, threshold) * 1.12 || 1;

    const x = (i) => PAD.left + (frames > 1 ? (i / (frames - 1)) * PLOT_W : 0);
    const y = (v) => PAD.top + PLOT_H - (v / top) * PLOT_H;

    const line = scores.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(2)},${y(p.v).toFixed(2)}`).join(' ');
    const area = scores.length
      ? `${line} L${x(scores[scores.length - 1].i).toFixed(2)},${(PAD.top + PLOT_H).toFixed(2)} L${x(scores[0].i).toFixed(2)},${(PAD.top + PLOT_H).toFixed(2)} Z`
      : '';

    // Only peaks above threshold get a marker — labelling every point is noise.
    const above = scores.filter((p) => threshold > 0 && p.v > threshold);

    const ticks = Array.from({ length: 5 }, (_, k) => (top / 4) * k);
    const xt = Array.from({ length: 5 }, (_, k) => Math.round(((frames - 1) / 4) * k));

    return { yMax: top, toX: x, toY: y, linePath: line, areaPath: area, flagged: above, yTicks: ticks, xTicks: xt };
  }, [scores, threshold, frames]);

  if (!scores.length) {
    return <p className="viz-empty">No score data was recorded for this scan.</p>;
  }

  const handleMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const rel = ((e.clientX - rect.left) / rect.width) * W;
    const frac = Math.min(1, Math.max(0, (rel - PAD.left) / PLOT_W));
    const targetFrame = frac * (frames - 1);

    // Nearest point, so the hit target is the whole column rather than the 2px line
    let best = scores[0];
    let bestD = Infinity;
    for (const p of scores) {
      const d = Math.abs(p.i - targetFrame);
      if (d < bestD) { bestD = d; best = p; }
    }
    setHover(best);
  };

  const summary =
    `Anomaly score across ${frames} frames. ` +
    `${flagged.length} point${flagged.length === 1 ? '' : 's'} above the threshold of ${fmtScore(threshold)}.`;

  return (
    <div className="viz-root">
      <div className="viz-head">
        <div>
          <h3 className="viz-title">Anomaly score over time</h3>
          <p className="viz-sub">
            Reconstruction error per frame, against the trained baseline threshold
          </p>
        </div>
        <button
          type="button"
          className="viz-toggle"
          onClick={() => setShowTable((v) => !v)}
          aria-pressed={showTable}
        >
          {showTable ? 'Show chart' : 'Show table'}
        </button>
      </div>

      {showTable ? (
        <div className="viz-table-wrap">
          <table className="viz-table">
            <caption className="viz-caption">{summary}</caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Start</th>
                <th scope="col">End</th>
                <th scope="col">Frames</th>
              </tr>
            </thead>
            <tbody>
              {segments.length ? (
                segments.map((s, k) => (
                  <tr key={`${s.start_frame}-${s.end_frame}`}>
                    <td>{k + 1}</td>
                    <td>{fmtTime(s.start_sec)}</td>
                    <td>{fmtTime(s.end_sec)}</td>
                    <td>{s.frames}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="viz-table-empty">
                    No frames exceeded the threshold.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="viz-plot">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="viz-svg"
            role="img"
            aria-label={summary}
            onMouseMove={handleMove}
            onMouseLeave={() => setHover(null)}
          >
            {/* Gridlines: solid hairlines, one step off the surface */}
            {yTicks.map((t) => (
              <line
                key={t}
                className="viz-grid"
                x1={PAD.left}
                x2={PAD.left + PLOT_W}
                y1={toY(t)}
                y2={toY(t)}
              />
            ))}

            {yTicks.map((t) => (
              <text key={`yl-${t}`} className="viz-tick" x={PAD.left - 10} y={toY(t) + 4} textAnchor="end">
                {t === 0 ? '0' : fmtScore(t)}
              </text>
            ))}

            {xTicks.map((f) => (
              <text
                key={`xl-${f}`}
                className="viz-tick"
                x={toX(f)}
                y={PAD.top + PLOT_H + 22}
                textAnchor="middle"
              >
                {fmtTime(fps ? f / fps : f)}
              </text>
            ))}

            <line
              className="viz-axis"
              x1={PAD.left}
              x2={PAD.left + PLOT_W}
              y1={PAD.top + PLOT_H}
              y2={PAD.top + PLOT_H}
            />

            <path d={areaPath} className="viz-area" />
            <path d={linePath} className="viz-line" />

            {/* Threshold: dashed because it genuinely IS a threshold, direct-labelled
                rather than given a legend box */}
            {threshold > 0 && threshold <= yMax && (
              <>
                <line
                  className="viz-threshold"
                  x1={PAD.left}
                  x2={PAD.left + PLOT_W}
                  y1={toY(threshold)}
                  y2={toY(threshold)}
                />
                <text
                  className="viz-threshold-label"
                  x={PAD.left + PLOT_W}
                  y={toY(threshold) - 7}
                  textAnchor="end"
                >
                  threshold
                </text>
              </>
            )}

            {/* Flagged peaks carry a surface ring so they stay legible on the line */}
            {flagged.map((p) => (
              <circle key={`f-${p.i}`} className="viz-flag" cx={toX(p.i)} cy={toY(p.v)} r={4.5} />
            ))}

            {hover && (
              <>
                <line
                  className="viz-crosshair"
                  x1={toX(hover.i)}
                  x2={toX(hover.i)}
                  y1={PAD.top}
                  y2={PAD.top + PLOT_H}
                />
                <circle
                  className={hover.v > threshold ? 'viz-flag' : 'viz-cursor'}
                  cx={toX(hover.i)}
                  cy={toY(hover.v)}
                  r={5}
                />
              </>
            )}
          </svg>

          {hover && (
            <div
              className="viz-tooltip"
              style={{
                left: `${(toX(hover.i) / W) * 100}%`,
                top: `${(toY(hover.v) / H) * 100}%`,
              }}
            >
              <span className="viz-tooltip-time">{fmtTime(fps ? hover.i / fps : hover.i)}</span>
              <span className="viz-tooltip-score">{fmtScore(hover.v)}</span>
              <span className={`viz-tooltip-state${hover.v > threshold ? ' is-anomaly' : ''}`}>
                {hover.v > threshold ? 'Above threshold' : 'Normal'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AnomalyTimeline;
