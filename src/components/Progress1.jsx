import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import './../css/Progress1.css'; // Ensure this file has the correct styles

const Progress1 = () => {
  const [progress, setProgress] = useState(0); // Initial progress value set to 0
  const navigate = useNavigate(); // Initialize navigate for redirection

  // Control the speed of progress (how often it updates)
  const progressSpeed = 40000 / 100; // Total time (40000ms) divided by 100 steps

  // Effect to increment progress over time
  useEffect(() => {
    if (progress < 100) {
      const timer = setTimeout(() => {
        setProgress((prevProgress) => (prevProgress < 100 ? prevProgress + 1 : 100));
      }, progressSpeed); // Increase by 1% over the total time

      return () => clearTimeout(timer); // Cleanup timeout
    } else {
      // Redirect to /video after progress reaches 100%
      setTimeout(() => {
        navigate('/video');
      }, 1000); // Delay redirection by 1 second for a smooth transition
    }
  }, [progress, navigate]);

  return (
    <div className="app-container">
      <div className='top-container'>
        <h1>SentinelAI by Abilytics</h1>
      </div>
      <div className='training-box-container'>
        <div className="training-box">
          <h2 className="model-training">MODEL TESTING</h2>
          <div className="progress-container">
            <h3 className="progress-title">Progress</h3>
            <div className="progress-percentage">{progress}%</div>
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            {progress < 100 ? (
              <p className="estimated-time">
                In Progress | Estimated completion time is ~40 seconds
              </p>
            ) : (
              <p className="progress-complete">
                Testing Completed <span className="checkmark">✔</span>
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="bottom-container"></div>
    </div>
  );
};

export default Progress1;
