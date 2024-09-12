import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';  // Import useNavigate for navigation
import './../css/ModelTestLanding.css';

function App() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);  // Track processing state
  const [fileName, setFileName] = useState('');  // State for storing the filename
  const navigate = useNavigate();  // React Router's hook for navigation

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop event (restricting to video files only)
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('video/')); // Only accept video files
    if (files.length > 0) {
      setSelectedFiles(files);  // Store selected files
      setFileName(files[0].name); // Update filename
    } else {
      setUploadMessage('Please upload a valid video file');
    }
  };

  // Handle manual file selection (restricting to video files only)
  const handleFileSelection = (e) => {
    const files = Array.from(e.target.files).filter(file => file.type.startsWith('video/')); // Only accept video files
    if (files.length > 0) {
      setSelectedFiles(files);  // Store selected files
      setFileName(files[0].name); // Update filename
    } else {
      setUploadMessage('Please upload a valid video file');
    }
  };

  // Upload file to the backend server
  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsProcessing(true);  // Start processing
      const response = await fetch('http://127.0.0.1:5000', { // Corrected URL
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setUploadMessage(result.message || 'Video uploaded successfully');

        // Delay the navigation to /video for 1 minute (60,000 milliseconds)
        setTimeout(() => {
          setUploadMessage('Redirecting to video...');
          setTimeout(() => {
            navigate('/video');  // Redirect to /video route
          }, 1000);  // Add a short delay before navigation to display the message
        }, 40000);  // 1 minute delay before navigating to /video
      } else {
        setUploadMessage('Error uploading video');
        setIsProcessing(false);  // Stop processing in case of error
      }
    } catch (error) {
      setUploadMessage('Error uploading video: ' + error.message);
      setIsProcessing(false);  // Stop processing in case of error
    }
  };

  // Handle start test button click
  const handleStartTest = () => {
    if (selectedFiles && selectedFiles.length > 0) {
      Array.from(selectedFiles).forEach((file) => uploadFile(file));
    } else {
      setUploadMessage('Please select a video file first');
    }
  };

  return (
    <div className="app-container">
      {/* Top container */}
      <div className="top-container">
        <h1>Sentinel AI By Abilytics</h1>
      </div>

      {/* Heading for Model Test */}
      <div className="model-test-heading">
        <h2>MODEL TEST</h2>
      </div>

      {/* Wrapping container for the Upload Data box */}
      <div className='uploadContainer'>
        <div className="upload-container">
          <h2 className="upload-heading">Upload Test Video</h2>
          <p className="instruction-text">Please upload a video to start the model test (supported formats: MP4, MOV, AVI, WebM).</p>
          <div
            className={`upload-box ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <p>Drag & Drop your videos here</p>
            <p>or</p>
            <label htmlFor="file-upload" className="browse-files-btn">
              Browse Files
            </label>
            <input
              id="file-upload"
              type="file"
              accept="video/*"  // Accept only video files
              multiple
              onChange={handleFileSelection}
              style={{ display: 'none' }}
            />
          </div>

          {/* Display selected file name */}
          {fileName && <p className="file-name">Selected File: {fileName}</p>}

          {/* Start Test button outside the upload-box */}
          <button
            className="start-test-btn"
            onClick={handleStartTest}
            disabled={isProcessing} // Disable button during processing
          >
            {isProcessing ? 'Processing...' : 'Start Test'}
          </button>

          {/* Message Display */}
          {uploadMessage && <p className="upload-message">{uploadMessage}</p>}
        </div>
      </div>
      

      {/* Bottom container */}
      <div className="bottom-container"></div>
    </div>
  );
}

export default App;
