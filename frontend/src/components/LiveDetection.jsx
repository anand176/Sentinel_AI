import React, { useEffect, useRef, useState, useCallback } from 'react';
import AppNav from './AppNav';
import './../css/LiveDetection.css';

const API_BASE = 'http://127.0.0.1:5001';
const FRAME_INTERVAL_MS = 800;
const SUSTAINED_ANOMALY_STREAK = 3; // consecutive anomalous frames before we ask for narration

function LiveDetection() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const sessionIdRef = useRef(null);
  const anomalyStreakRef = useRef(0);
  const narratingRef = useRef(false);

  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [calibrating, setCalibrating] = useState(true);
  const [isAnomaly, setIsAnomaly] = useState(false);
  const [score, setScore] = useState(null);
  const [threshold, setThreshold] = useState(null);
  const [narration, setNarration] = useState('');
  const [clipUrl, setClipUrl] = useState('');

  const captureAndSendFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !sessionIdRef.current) return;
    if (video.readyState < 2) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL('image/jpeg', 0.7);

    try {
      const res = await fetch(`${API_BASE}/live/frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionIdRef.current, image }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Frame scoring failed');
        return;
      }

      setCalibrating(!!data.calibrating);
      setIsAnomaly(!!data.is_anomaly);
      setScore(data.mse);
      setThreshold(data.threshold);

      anomalyStreakRef.current = data.is_anomaly ? anomalyStreakRef.current + 1 : 0;

      if (anomalyStreakRef.current >= SUSTAINED_ANOMALY_STREAK && !narratingRef.current) {
        narratingRef.current = true;
        try {
          const narrateRes = await fetch(`${API_BASE}/live/narrate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionIdRef.current }),
          });
          const narrateData = await narrateRes.json();
          if (narrateRes.ok) {
            setNarration(narrateData.narration || '');
            if (narrateData.clip_url) setClipUrl(`${API_BASE}${narrateData.clip_url}`);
          }
        } finally {
          narratingRef.current = false;
          anomalyStreakRef.current = 0;
        }
      }
    } catch (err) {
      setError('Lost connection to the detection server: ' + err.message);
    }
  }, []);

  const stopLiveDetection = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (sessionIdRef.current) {
      fetch(`${API_BASE}/live/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionIdRef.current }),
      }).catch(() => {});
      sessionIdRef.current = null;
    }
    setRunning(false);
    setCalibrating(true);
    setIsAnomaly(false);
    setScore(null);
    setThreshold(null);
  }, []);

  const startLiveDetection = useCallback(async () => {
    setError('');
    setNarration('');
    setClipUrl('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      const startRes = await fetch(`${API_BASE}/live/start`, { method: 'POST' });
      const startData = await startRes.json();
      sessionIdRef.current = startData.session_id;
      anomalyStreakRef.current = 0;

      intervalRef.current = setInterval(captureAndSendFrame, FRAME_INTERVAL_MS);
      setRunning(true);
    } catch (err) {
      setError('Could not access webcam: ' + err.message);
      stopLiveDetection();
    }
  }, [captureAndSendFrame, stopLiveDetection]);

  useEffect(() => stopLiveDetection, [stopLiveDetection]);

  const statusBadge = !running ? (
    <span className="badge badge-neutral">Idle</span>
  ) : calibrating ? (
    <span className="badge badge-brand">
      <span className="badge-dot badge-dot--pulse" />
      Calibrating
    </span>
  ) : isAnomaly ? (
    <span className="badge badge-danger">
      <span className="badge-dot badge-dot--pulse" />
      Anomaly
    </span>
  ) : (
    <span className="badge badge-success">
      <span className="badge-dot" />
      Normal
    </span>
  );

  return (
    <div className="page">
      <AppNav />

      <div className="page-body">
        <header className="page-head">
          <span className="page-eyebrow">Live monitor</span>
          <h1 className="page-title">Real-time webcam detection</h1>
          <p className="page-subtitle">
            Frames are sampled from your camera and scored against the trained baseline. Sustained
            deviations trigger an automatic narration.
          </p>
        </header>

        <div className="live-layout">
          <div className="card live-main">
            <div className="card-head run-head">
              <div>
                <h2 className="card-title">Camera feed</h2>
                <p className="card-desc">Sampled every {FRAME_INTERVAL_MS / 1000}s</p>
              </div>
              {statusBadge}
            </div>

            <div className="card-pad">
              <div className={`live-frame${isAnomaly ? ' is-anomaly' : ''}`}>
                <video ref={videoRef} autoPlay playsInline muted />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                {!running && (
                  <div className="live-idle">Camera off — start monitoring to begin.</div>
                )}
              </div>

              {error && <div className="alert alert-danger mt-16">{error}</div>}

              <div className="live-actions mt-16">
                {running ? (
                  <button className="btn btn-danger" onClick={stopLiveDetection}>
                    Stop monitoring
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={startLiveDetection}>
                    Start monitoring
                  </button>
                )}
              </div>
            </div>
          </div>

          <aside className="live-side stack gap-16">
            <div className="card">
              <div className="card-head">
                <h2 className="card-title">Signal</h2>
                <p className="card-desc">Reconstruction error vs. threshold</p>
              </div>
              <div className="card-pad stack gap-16">
                <div className="stat-orbs">
                  <div className="stat-orb">
                    <span className="stat-orb-label">Score</span>
                    <span className="stat-orb-value">
                      {score !== null ? score.toFixed(4) : '—'}
                    </span>
                  </div>
                  <div className="stat-orb">
                    <span className="stat-orb-label">Threshold</span>
                    <span className="stat-orb-value">
                      {threshold !== null && threshold !== undefined
                        ? threshold.toFixed(4)
                        : '—'}
                    </span>
                  </div>
                </div>
                {running && calibrating && (
                  <p className="stat-note">
                    Collecting baseline frames — detection starts once calibrated.
                  </p>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h2 className="card-title">Latest narration</h2>
                <p className="card-desc">Generated on sustained anomalies</p>
              </div>
              <div className="card-pad">
                {narration ? (
                  <>
                    <p className="narration-text">{narration}</p>
                    {clipUrl && (
                      <div className="clip-frame mt-16">
                        <video controls src={clipUrl} />
                      </div>
                    )}
                  </>
                ) : (
                  <p className="stat-note">Nothing flagged yet.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default LiveDetection;
