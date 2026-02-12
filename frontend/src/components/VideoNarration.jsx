import React, { useState, useEffect } from 'react';
import './../css/video.css';  // Import custom CSS for styling

function VideoNarration() {
  const [status, setStatus] = useState('');
  const [narration, setNarration] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  // Load the video and narration from the last detection result
  useEffect(() => {
    setStatus('Loading detection result...');
    try {
      const stored = window.localStorage.getItem('anomalyResult');
      if (!stored) {
        setStatus('No detection result found. Please run a test first.');
        return;
      }

      const data = JSON.parse(stored);

      if (data.error) {
        setStatus(data.error);
        return;
      }

      if (data.narration) {
        setNarration(data.narration);
      }

      if (data.clip_url) {
        // Backend serves clips at /anomalous_clips/<filename> on port 5001
        setVideoUrl(`http://127.0.0.1:5001${data.clip_url}`);
      }

      // Show status when no clip/narration (e.g. "No anomalies detected")
      if (!data.narration && !data.clip_url && data.status) {
        setStatus(data.status);
      } else {
        setStatus('');
      }
    } catch (error) {
      console.error('Error loading detection result:', error);
      setStatus('Error loading detection result.');
    }
  }, []);

  // Handle button click to test with another video
  const handleTestAnotherVideo = () => {
    window.location.href = '/modeltestlanding';  // Redirect to the test page
  };

  // Handle button click to go back to the homepage
  const handleBackToHome = () => {
    window.location.href = '/';  // Redirect to the homepage
  };

  return (
    <div className="app-container">
      {/* Top container */}
      <div className="top-container">
        <h1>SentinelAI by Abilytics</h1>
      </div>

      {/* Anomaly Detection Heading */}
      <h2 className="anomaly-detection-heading">Anomaly Detection</h2>

      {/* Video and narration inside shadow container */}
      <div className="video-shadow-container">
        {videoUrl ? (
          <div className="video-container">
            <video width="500" controls>
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        ) : (
          <div className="video-placeholder">
            <p>&lt; ANOMALY VIDEO SNIPPET &gt;</p>
          </div>
        )}
        {status && <p className="status-message">{status}</p>}
        {narration && (
          <div className="narration-result">
            <p>{narration}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="button-container">
          <button className="start-test-btn1" onClick={handleTestAnotherVideo}>
            Test with Another Video
          </button>
          <button className="start-test-btn1" onClick={handleBackToHome}>
            Back to Home Page
          </button>
        </div>
      </div>

      {/* Bottom container */}
      <div className="bottom-container3"></div>
    </div>
  );
}

export default VideoNarration;
