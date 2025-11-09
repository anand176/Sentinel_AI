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
