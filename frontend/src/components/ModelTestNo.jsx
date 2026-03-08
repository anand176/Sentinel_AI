import React from 'react';
import { Link } from 'react-router-dom';
import './../css/ModelTestNo.css';

function ModelTest() {
  return (
    <div className="model-test-page">
      <header className="app-shell-header">
        <span className="app-shell-logo">SentinelAI</span>
        <Link to="/">Back to Home</Link>
      </header>

      <section className="model-test-section">
        <h2 className="section-title">MODEL TEST</h2>
        <div className="test-result-box">
          <h3 className="result-message">No Anomaly Detected</h3>
          <Link to="/modeltestlanding" className="test-button">Test with another video</Link>
        </div>
      </section>

      <div className="app-shell-bottom" />
    </div>
  );
}

export default ModelTest;
