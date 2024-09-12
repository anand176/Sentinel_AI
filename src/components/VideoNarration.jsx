import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './../css/video.css';  // Import custom CSS for styling

function VideoNarration() {
  const [status, setStatus] = useState('');
  const [narration, setNarration] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  // Fetch the video and narration from the backend
  useEffect(() => {
    setStatus('Fetching narration and video...');
    axios.get('http://127.0.0.1:5001/narration')
      .then(response => {
        setNarration(response.data.narration);
        setVideoUrl(`http://127.0.0.1:5001/anomalous_clips1/${response.data.video}`);  // Video URL from the Flask backend
        setStatus(''); // Clear status message after data is received
      })
      .catch(error => {
        setStatus('Error fetching narration or video');
        console.error('Error:', error);
      });
  }, []);

  // Handle button click to test with another video
  const handleTestAnotherVideo = () => {
    // Implement the logic to test with another video, e.g., navigate to an upload page
    window.location.href = '/modeltestlanding';  // Redirect to the homepage or upload page
  };

  return (
    <div className="app-container">
      {/* Top container */}
      <div className="top-container">
        <h1>SentinelAI by Abilytics</h1>
      </div>

      <div className="narration-container">
        <h2 className="model-test-heading">MODEL TEST</h2>
        <div className="anomaly-detection-box">
          <h3 className="anomaly-detection-title">Anomaly Detection</h3>
          {videoUrl ? (
            <div className="video-container">
              <video width="600" controls>
                <source src={videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          ) : (
            <div className="video-placeholder">
              <p>&lt; ANOMALY VIDEO SNIPPET &gt;</p>
            </div>
          )}
          {narration ? (
            <div className="narration-result">
              <p>{narration}</p>
            </div>
          ) : (
            <p className="narration-placeholder">&lt; Anomaly Narration &gt;</p>
          )}
          <button className="start-test-btn" onClick={handleTestAnotherVideo}>
            Test Data
          </button>
        </div>
      </div>

      {/* Bottom container */}
      <div className="bottom-container"></div>
    </div>
  );
}

export default VideoNarration;
