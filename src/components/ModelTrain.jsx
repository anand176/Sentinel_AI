import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './../css/ModelTrain.css';
import axios from 'axios';

function ModelTrain() {
  const [isProcessing, setIsProcessing] = useState(false); // State to track processing
  const [status, setStatus] = useState(''); // Status message
  const navigate = useNavigate(); // Use navigate to route to the /video page

  // Function to handle the test data processing
  const handleTestData = async () => {
    setIsProcessing(true); // Set processing state to true
    setStatus('Processing video... Please wait.');

    try {
      // Simulate or make API request to start processing the uploaded video
      const response = await axios.post('http://127.0.0.1:5001/upload_video', {
        // Include file data or other necessary payload here
        // For example, if you have a file input for video upload, include it in the request
      });

      if (response.status === 200) {
        setStatus('Processing completed, obtaining narration...');
        
        // After the video is processed, request the narration from the /narration endpoint
        const narrationResponse = await axios.get('http://127.0.0.1:5001/narration');
        
        if (narrationResponse.status === 200) {
          setStatus('Narration obtained, redirecting...');
          
          // Redirect to the /video page once the narration is obtained
          setTimeout(() => {
            navigate('/video'); // Navigate to the video page after successful processing
          }, 1000); // Add a short delay before routing
        } else {
          setStatus('Error obtaining narration. Please try again.');
        }
      } else {
        setStatus('Error processing video. Please try again.');
      }
    } catch (error) {
      setStatus('Error processing video. Please check the backend or network connection.');
      console.error('Error processing video:', error);
    }

    setIsProcessing(false); // Reset processing state after completion
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>SentinelAI by Abilytics</h1>
      </header> 
      
      <main className="main-content">
        <h2 className="model-title">MODEL TEST</h2>

        <div className="upload-container">
          <h3 className="upload-title">Upload Test Video</h3>
          <div className="upload-box">
            <div className="upload-instructions">
              <p>Drag and drop a video here</p>
              <p>or</p>
              <button className="browse-button">Browse Files</button>
            </div>
            <p className="file-types">Supported File types: Mp4, MOV, AVI, WebM</p>
          </div>

          <button 
            className="test-data-button" 
            onClick={handleTestData}
            disabled={isProcessing} // Disable button while processing
          >
            {isProcessing ? 'Processing...' : 'Test Data'}
          </button>
        </div>

        {status && <p className="status-message">{status}</p>} {/* Display status messages */}
      </main>
    </div>
  );
}

export default ModelTrain;
