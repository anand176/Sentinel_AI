import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './../css/ModelTrain.css';

function ModelTrain() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle drop event (restricting to video files only)
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('video/'));
    if (files.length > 0) {
      setSelectedFiles(files);
      setFileName(files[0].name);
    } else {
      setUploadMessage('Please upload a valid video file');
    }
  };

  // Handle manual file selection (restricting to video files only)
  const handleFileSelection = (e) => {
    const files = Array.from(e.target.files).filter(file => file.type.startsWith('video/'));
    if (files.length > 0) {
      setSelectedFiles(files);
      setFileName(files[0].name);
    } else {
      setUploadMessage('Please upload a valid video file');
    }
  };

  // Handle start train button click
  const handleStartTrain = () => {
    if (selectedFiles && selectedFiles.length > 0) {
      setIsProcessing(true);
      setTimeout(() => {
        navigate('/progress');  // Navigate to /progress after processing
      }, 2000);
    } else {
      setUploadMessage('Please select a video file first');
    }
  };

  return (
    <div className="app-container">
      {/* Top container */}
      <div className="top-container">
        <h1>SentinelAI by Abilytics</h1>
      </div>

      {/* Main container to center content */}
      <div className="main-container">
        <h2 className="model-train-heading">MODEL TRAIN</h2>

        {/* Wrapping container for the Upload Data box */}
        <div className="upload-container">
          <h2 className="upload-heading">Upload Training Video</h2>
          <p className="instruction-text">Supported formats: MP4, MOV, AVI, WebM.</p>
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
              accept="video/*"
              multiple
              onChange={handleFileSelection}
              style={{ display: 'none' }}
            />
          </div>

          {/* Display selected file name in bold and highlighted */}
          {fileName && <p className="file-name highlighted">Uploaded File: {fileName}</p>}

          {/* Start Training button */}
          <button
            className="start-train-btn"
            onClick={handleStartTrain}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Start Training'}
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

export default ModelTrain;
