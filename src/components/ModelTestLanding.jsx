import React, { useState } from 'react';
import './../css/ModelTestLanding.css';

function App() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');

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
    } else {
      setUploadMessage('Please upload a valid video file');
    }
  };

  // Handle manual file selection (restricting to video files only)
  const handleFileSelection = (e) => {
    const files = Array.from(e.target.files).filter(file => file.type.startsWith('video/')); // Only accept video files
    if (files.length > 0) {
      setSelectedFiles(files);  // Store selected files
    } else {
      setUploadMessage('Please upload a valid video file');
    }
  };
  
// Upload file to the backend server
const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('http://127.0.0.1:5000', { // Corrected URL
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const result = await response.json();
      setUploadMessage(result.message || 'Video uploaded successfully');
    } else {
      setUploadMessage('Error uploading video');
    }
  } catch (error) {
    setUploadMessage('Error uploading video: ' + error.message);
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

      {/* Wrapping container for the Upload Data box */}
      <div className="upload-container">
        <h2 className="upload-heading">Upload Video</h2>
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

        {/* Start Test button outside the upload-box */}
        <button className="start-test-btn" onClick={handleStartTest}>
          Start Test
        </button>

        {/* Message Display */}
        {uploadMessage && <p className="upload-message">{uploadMessage}</p>}
      </div>

      {/* Bottom container */}
      <div className="bottom-container"></div>
    </div>
  );
}

export default App;
