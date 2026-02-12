import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate for redirection
import './../css/Progress.css'; // Importing the custom CSS
 
const Progress = () => {
  const [progress, setProgress] = useState(0); // Initial progress value set to 0
  const estimatedTime = 17; // Estimated time remaining in hours
  const navigate = useNavigate(); // Initialize navigate for redirection
 
  // Control the speed of progress (how often it updates)
  const progressSpeed = 100; // 1% every 1 second (1000ms)
 
  // Effect to increment progress over time
  useEffect(() => {
    if (progress < 100) {
      const timer = setTimeout(() => {
        setProgress((prevProgress) => (prevProgress < 100 ? prevProgress + 1 : 100));
      }, progressSpeed); // Increase by 1% every second
 
      return () => clearTimeout(timer); // Cleanup timeout
    }
  }, [progress]);
 
  // Handle the test model button click (redirect to landing page)
  const handleTestModel = () => {
    navigate('/modeltestlanding'); // Redirect to the landing page
  };
 
  return (
    <div className="app-container">
      <div className='top-container'>
      <h1>SentinelAI by Abilytics</h1>
      </div>
      <div className='training-box-container'>
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
 
          {progress < 100 ? (
            <p className="estimated-time">
              In Progress | Estimated completion time is ~{estimatedTime} hours
            </p>
          ) : (
            <>
              <p className="progress-complete">
                Training Completed <span className="checkmark">✔</span>
              </p>
              <button className="test-model-button" onClick={handleTestModel}>
                Test Model
              </button>
            </>
          )}
        </div>
 
        {progress < 100 && (
          <div className="buttons">
            <button className="resume-button">Pause Training</button>
            <button className="stop-button">Stop Training</button>
          </div>
        )}
      </div>
      </div>
      <div className="bottom-container"></div>
    </div>
  );
};
 
export default Progress;