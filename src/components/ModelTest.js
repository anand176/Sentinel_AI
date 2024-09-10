import React from 'react';
import './../css/ModelTest.css';

function ModelTest() {
  return (
    <div className="model-test-page">
      <header className="header">
        <h1>SentinelAI by Abilytics</h1>
      </header>

      <section className="model-test-section">
        <h2 className="section-title">MODEL TEST</h2>
        <div className="test-result-box">
          <h3 className="result-message">No Anomaly Detected</h3>
          <button className="test-button">Test with another video</button>
        </div>
      </section>
    </div>
  );
}

export default ModelTest;
