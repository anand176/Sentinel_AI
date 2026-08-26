import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AppNav from './AppNav';
import './../css/RunProgress.css';

const API_BASE = 'http://127.0.0.1:5001';
const POLL_MS = 1500;

const Progress = () => {
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const timerRef = useRef(null);

  useEffect(() => {
    const jobId = window.localStorage.getItem('trainJobId');
    if (!jobId) {
      setError('No training job found. Start a training run first.');
      return undefined;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/train/status/${jobId}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (!cancelled) setError(body.error || 'Could not read training status.');
          return;
        }
        const data = await res.json();
        if (cancelled) return;

        setJob(data);
        setError('');

        // Keep polling only while the job is still running
        if (data.state === 'running') {
          timerRef.current = setTimeout(poll, POLL_MS);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Lost contact with the detection service on port 5001.');
        }
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const progress = job?.progress ?? 0;
  const done = job?.state === 'complete';
  const failed = job?.state === 'failed';

  const badge = failed ? (
    <span className="badge badge-danger">
      <span className="badge-dot" />
      Failed
    </span>
  ) : done ? (
    <span className="badge badge-success">
      <span className="badge-dot" />
      Complete
    </span>
  ) : (
    <span className="badge badge-brand">
      <span className="badge-dot badge-dot--pulse" />
      Running
    </span>
  );

  return (
    <div className="page">
      <AppNav />

      <div className="page-body page-body--narrow">
        <header className="page-head">
          <span className="page-eyebrow">Training</span>
          <h1 className="page-title">Building your baseline model</h1>
          <p className="page-subtitle">
            The model learns this footage, then records the error distribution it produces —
            that baseline is what detection compares against.
          </p>
        </header>

        <div className="card">
          <div className="card-head run-head">
            <div>
              <h2 className="card-title">Autoencoder training</h2>
              <p className="card-desc">{job?.filename || 'Baseline footage'}</p>
            </div>
            {badge}
          </div>

          <div className="card-pad">
            {error && <div className="alert alert-danger">{error}</div>}

            {!error && (
              <>
                <div className="run-metric">
                  <span className="run-percent">{progress}%</span>
                  <span className="run-eta">{job?.stage || 'Starting…'}</span>
                </div>

                <div
                  className="progress-track"
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Training progress"
                >
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>

                {job?.loss !== null && job?.loss !== undefined && (
                  <p className="run-detail">Loss {job.loss.toFixed(5)}</p>
                )}

                {failed && <div className="alert alert-danger mt-16">{job.error}</div>}

                {done && job?.calibration && (
                  <dl className="run-summary mt-24">
                    <div>
                      <dt>Baseline frames</dt>
                      <dd>{job.calibration.frames}</dd>
                    </div>
                    <div>
                      <dt>Threshold</dt>
                      <dd>{job.calibration.threshold.toExponential(2)}</dd>
                    </div>
                    <div>
                      <dt>Sensitivity</dt>
                      <dd>{job.calibration.sigma}σ</dd>
                    </div>
                  </dl>
                )}
              </>
            )}

            {done ? (
              <div className="run-actions mt-24">
                <button className="btn btn-primary" onClick={() => navigate('/modeltestlanding')}>
                  Run a detection
                </button>
                <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
                  View dashboard
                </button>
              </div>
            ) : (
              (failed || error) && (
                <div className="run-actions mt-24">
                  <button
                    className="btn btn-secondary"
                    onClick={() => navigate('/modeltrainlanding')}
                  >
                    Back to training
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Progress;
