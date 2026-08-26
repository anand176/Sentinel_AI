import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppNav from './AppNav';

function ModelTestNo() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <AppNav />

      <div className="page-body page-body--narrow">
        <header className="page-head">
          <span className="page-eyebrow">Detection</span>
          <h1 className="page-title">Scan results</h1>
        </header>

        <div className="card card-pad">
          <span className="badge badge-success">
            <span className="badge-dot" />
            All clear
          </span>
          <h2 className="card-title mt-16">No anomalies detected</h2>
          <p className="page-subtitle">
            Every frame in this recording matched the learned baseline.
          </p>

          <div className="result-actions mt-24">
            <button
              className="btn btn-primary"
              onClick={() => navigate('/modeltestlanding')}
            >
              Scan another video
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/')}>
              Back to overview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModelTestNo;
