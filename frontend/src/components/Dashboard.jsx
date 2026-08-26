import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppNav from './AppNav';
import Sparkline from './Sparkline';
import './../css/Dashboard.css';

const API_BASE = 'http://127.0.0.1:5001';

const compact = (n) => {
  if (n === null || n === undefined) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
};

const relTime = (epochSeconds) => {
  if (!epochSeconds) return '—';
  const diff = Date.now() / 1000 - epochSeconds;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [runs, setRuns] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const [statsRes, runsRes] = await Promise.all([
        fetch(`${API_BASE}/stats`),
        fetch(`${API_BASE}/runs?limit=8`),
      ]);
      if (!statsRes.ok || !runsRes.ok) throw new Error('Backend returned an error');
      setStats(await statsRes.json());
      setRuns((await runsRes.json()).runs || []);
      setError('');
    } catch (err) {
      setError(
        'Could not reach the detection service on port 5001. Start the backend to see live figures.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const model = stats?.model;
  const ratePct = stats ? (stats.anomaly_rate * 100).toFixed(2) : '—';

  return (
    <div className="page">
      <AppNav />

      <div className="page-body">
        <header className="page-head dash-head">
          <div>
            <span className="page-eyebrow">Dashboard</span>
            <h1 className="page-title">Detection overview</h1>
          </div>
          <button className="btn btn-secondary btn-auto" onClick={load}>
            Refresh
          </button>
        </header>

        {error && <div className="alert alert-danger mt-16">{error}</div>}

        {/* Hero: the one number the view leads with */}
        <section className="card card-pad dash-hero">
          <div>
            <span className="dash-hero-label">Anomalies detected</span>
            <span className="dash-hero-value">
              {loading ? '—' : compact(stats?.total_anomalies ?? 0)}
            </span>
            <span className="dash-hero-meta">
              across {compact(stats?.total_runs ?? 0)} scans ·{' '}
              {compact(stats?.total_frames ?? 0)} frames analysed
            </span>
          </div>
          {stats?.recent_rates?.length > 1 && (
            <Sparkline values={stats.recent_rates} />
          )}
        </section>

        {/* KPI row */}
        <section className="dash-kpis">
          <article className="card card-pad stat-tile">
            <span className="stat-tile-label">Scans run</span>
            <span className="stat-tile-value">{loading ? '—' : compact(stats?.total_runs ?? 0)}</span>
          </article>

          <article className="card card-pad stat-tile">
            <span className="stat-tile-label">Scans with findings</span>
            <span className="stat-tile-value">{loading ? '—' : compact(stats?.flagged_runs ?? 0)}</span>
          </article>

          <article className="card card-pad stat-tile">
            <span className="stat-tile-label">Anomaly rate</span>
            <span className="stat-tile-value">{loading ? '—' : `${ratePct}%`}</span>
            <span className="stat-tile-meta">of all frames analysed</span>
          </article>

          <article className="card card-pad stat-tile">
            <span className="stat-tile-label">Baseline model</span>
            <span className="stat-tile-value">
              {!model?.trained ? 'None' : model.calibrated ? 'Calibrated' : 'Uncalibrated'}
            </span>
            <span className="stat-tile-meta">
              {model?.calibrated
                ? `${compact(model.frames)} frames · ${relTime(model.trained_at)}`
                : model?.trained
                  ? 'Retrain to calibrate'
                  : 'Train a model to begin'}
            </span>
          </article>
        </section>

        {/* Uncalibrated models silently produce false positives, so say so loudly.
            Status colour never carries the meaning alone — it ships with icon + label. */}
        {model?.trained && !model.calibrated && (
          <div className="card dash-warning">
            <span className="dash-warning-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>

            <div className="dash-warning-body">
              <h3 className="dash-warning-title">This model has no saved baseline</h3>
              <p className="dash-warning-text">
                Detection falls back to deriving its threshold from the video being tested,
                which flags frames even in ordinary footage.
              </p>
            </div>

            <button
              className="btn btn-primary dash-warning-action"
              onClick={() => navigate('/modeltrainlanding')}
            >
              Retrain model
            </button>
          </div>
        )}

        {/* Recent runs */}
        <section className="card dash-runs">
          <div className="card-head run-head">
            <div>
              <h2 className="card-title">Recent activity</h2>
              <p className="card-desc">Latest scans and training runs</p>
            </div>
          </div>

          {runs.length === 0 ? (
            <div className="card-pad dash-empty">
              {loading ? 'Loading…' : 'No runs yet. Train a model, then scan a video.'}
            </div>
          ) : (
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th scope="col">File</th>
                    <th scope="col">Type</th>
                    <th scope="col">Findings</th>
                    <th scope="col">Frames</th>
                    <th scope="col">When</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id}>
                      <td className="dash-file">{run.filename}</td>
                      <td>
                        <span className="badge badge-neutral dash-chip">{run.kind}</span>
                      </td>
                      <td>
                        {run.kind === 'train' ? (
                          <span className="dash-muted">—</span>
                        ) : run.anomaly_count > 0 ? (
                          <span className="badge badge-warning dash-chip">
                            <span className="badge-dot" />
                            {run.anomaly_count}
                          </span>
                        ) : (
                          <span className="badge badge-success dash-chip">
                            <span className="badge-dot" />
                            Clear
                          </span>
                        )}
                      </td>
                      <td className="dash-num">{compact(run.total_frames)}</td>
                      <td className="dash-muted">{relTime(run.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
