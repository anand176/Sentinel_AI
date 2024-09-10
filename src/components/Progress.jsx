import React, { useState } from 'react';
import './../css/Progress.css'; 

const Progress = () => {
  const [progress, setProgress] = useState(50); // Current progress state
  const estimatedTime = 17; // Estimated completion time

  return (
    <div className="model-training-container">
      <h1 className="title">SentinelAI by Abilytics</h1>
      <div className="training-box">
        <h2 className="model-training">MODEL TRAINING</h2>
        <div className="progress-container">
          <h3 className="progress-title">Progress</h3>
          <div className="progress-percentage">{progress}%</div>
          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="progress-text">
            Training in progress. Please wait while the page loads
          </p>
          <p className="estimated-time">
            In Progress | Estimated completion time {estimatedTime} hours
          </p>
        </div>
        <div className="buttons">
          <button className="pause-button">Pause Training</button>
          <button className="stop-button">Stop Training</button>
        </div>
      </div>
    </div>
  );
};

export default Progress;

