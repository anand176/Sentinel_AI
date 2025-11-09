import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';  
import './../css/ModelTestLanding.css';

function App() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(null);
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
      // If you need to display a message about invalid files, uncomment the line below:
      // setUploadMessage('Please upload a valid video file');
    }
  };

  // Handle manual file selection (restricting to video files only)
  const handleFileSelection = (e) => {
    const files = Array.from(e.target.files).filter(file => file.type.startsWith('video/')); // Only accept video files
    if (files.length > 0) {
      setSelectedFiles(files);  // Store selected files
      setFileName(files[0].name); // Update filename
    } else {
      // If you need to display a message about invalid files, uncomment the line below:
      // setUploadMessage('Please upload a valid video file');
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
        // Navigate to /progress1 immediately after file upload initiation
        navigate('/progress1');
      } else {
        // If you need to display an error message, uncomment the line below:
        // setUploadMessage('Error uploading video');
      }
    } catch (error) {
      // If you need to display an error message, uncomment the line below:
      // setUploadMessage('Error uploading video: ' + error.message);
    } finally {
      setIsProcessing(false);  // Stop processing
    }
  };

  // Handle start test button click
  const handleStartTest = () => {
    if (selectedFiles && selectedFiles.length > 0) {
      Array.from(selectedFiles).forEach((file) => uploadFile(file));
    } else {
      // If you need to display a message about no file selected, uncomment the line below:
      // setUploadMessage('Please select a video file first');
    }
  };

  return (
    <div className="app-container">
      {/* Top container */}
      <div className="top-container">
        <h1>SentinelAI By Abilytics</h1>
      </div>

      {/* Heading for Model Test */}
      <div className="model-test-heading2">
        <h2>MODEL TEST</h2>
      </div>

      {/* Wrapping container for the Upload Data box */}
      <div className='uploadContainer'>
        <div className="upload-container">
          <h2 className="upload-heading">Upload Test Video</h2>
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
              accept="video/*"  // Accept only video files
              multiple
              onChange={handleFileSelection}
              style={{ display: 'none' }}
            />
          </div>

          {/* Display selected file name in bold and highlighted */}
          {fileName && <p className="file-name highlighted">Selected File: {fileName}</p>}

          {/* Start Test button outside the upload-box */}
          <button
            className="start-test-btn"
            onClick={handleStartTest}
            disabled={isProcessing} // Disable button during processing
          >
            {isProcessing ? 'Processing...' : 'Start Test'}
          </button>
        </div>
      </div>

      {/* Bottom container */}
      <div className="bottom-container"></div>
    </div>
  );
}

export default App;
