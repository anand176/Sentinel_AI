import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppNav from './AppNav';
import AnomalyTimeline from './AnomalyTimeline';
import './../css/Results.css';

const fmtTime = (sec) => {
  if (!Number.isFinite(sec)) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${s.toFixed(0).padStart(2, '0')}` : `${s.toFixed(1)}s`;
};

function VideoNarration() {
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('anomalyResult');
      if (!stored) {
        setStatus('No detection result found. Run a scan first.');
        return;
      }
      const data = JSON.parse(stored);
      if (data.error) {
        setStatus(data.error);
        return;
      }
      setResult(data);
      setStatus('');
    } catch (error) {
      setStatus('Could not read the detection result.');
    }
  }, []);

  const videoUrl = result?.clip_url ? `http://127.0.0.1:5001${result.clip_url}` : '';
  const detected = (result?.anomaly_count ?? 0) > 0;

  return (
    <div className="page">
      <AppNav />

      <div className="page-body">
        <header className="page-head">
          <span className="page-eyebrow">Detection</span>
          <h1 className="page-title">Scan results</h1>
          {result && (
            <p className="page-subtitle">
              {result.total_frames} frames analysed
              {result.duration_sec ? ` · ${fmtTime(result.duration_sec)} of footage` : ''}
              {result.segments?.length
                ? ` · ${result.segments.length} flagged segment${result.segments.length === 1 ? '' : 's'}`
                : ''}
            </p>
          )}
        </header>

        {status && <div className="alert alert-info">{status}</div>}

        {result && (
          <>
            <section className="results-summary">
              <article className="card card-pad stat-tile">
                <span className="stat-tile-label">Frames flagged</span>
                <span className="stat-tile-value">{result.anomaly_count}</span>
                <span className="stat-tile-meta">
                  {((result.anomaly_count / Math.max(result.total_frames, 1)) * 100).toFixed(2)}% of footage
                </span>
              </article>
              <article className="card card-pad stat-tile">
                <span className="stat-tile-label">Peak score</span>
                <span className="stat-tile-value">{result.max_score?.toExponential(2)}</span>
                <span className="stat-tile-meta">
                  threshold {result.threshold?.toExponential(2)}
                </span>
              </article>
              <article className="card card-pad stat-tile">
                <span className="stat-tile-label">Verdict</span>
                <span className="stat-tile-value">{detected ? 'Anomaly' : 'Clear'}</span>
                <span className="stat-tile-meta">at {result.sigma}σ sensitivity</span>
              </article>
            </section>

            <section className="card card-pad results-chart">
              <AnomalyTimeline
                scores={result.scores || []}
                threshold={result.threshold || 0}
                fps={result.fps || 30}
                totalFrames={result.total_frames || 0}
                segments={result.segments || []}
              />
            </section>
          </>
        )}

        <div className="results-grid">
          <div className="card">
            <div className="card-head run-head">
              <div>
                <h2 className="card-title">Flagged segment</h2>
                <p className="card-desc">Extracted around the first anomalous frame</p>
              </div>
              {detected ? (
                <span className="badge badge-warning">
                  <span className="badge-dot" />
                  Anomaly
                </span>
              ) : (
                <span className="badge badge-success">
                  <span className="badge-dot" />
                  Clear
                </span>
              )}
            </div>

            <div className="card-pad">
              {videoUrl ? (
                <div className="clip-frame">
                  <video controls src={videoUrl}>
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <div className="clip-empty">
                  {detected ? 'No clip was extracted for this scan.' : 'Nothing flagged — no clip needed.'}
                </div>
              )}

              {result?.narration && (
                <section className="narration mt-16">
                  <h3 className="narration-label">Narration</h3>
                  <p className="narration-text">{result.narration}</p>
                </section>
              )}
            </div>
          </div>
        </div>

        <div className="result-actions mt-24">
          <button className="btn btn-primary btn-auto" onClick={() => navigate('/modeltestlanding')}>
            Scan another video
          </button>
          <button className="btn btn-secondary btn-auto" onClick={() => navigate('/dashboard')}>
            View dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default VideoNarration;
