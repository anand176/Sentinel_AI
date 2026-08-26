import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppNav from './AppNav';
import VideoDropzone from './VideoDropzone';

function ModelTestLanding() {
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const navigate = useNavigate();

  const handleFilesSelected = (files) => {
    if (files.length > 0) {
      setSelectedFiles(files);
      setUploadMessage('');
    } else {
      setUploadMessage('Please choose a valid video file.');
    }
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('mode', 'detect');

    try {
      setIsProcessing(true);
      const response = await fetch('http://127.0.0.1:5001/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        window.localStorage.setItem('anomalyResult', JSON.stringify(data));
        // Detection completes during this request, so go straight to results
        // rather than showing a fabricated progress bar afterwards.
        navigate('/video');
      } else {
        setUploadMessage('Upload failed: ' + response.statusText);
      }
    } catch (error) {
      setUploadMessage(
        'Could not reach the detection service on port 5001. Is the backend running?'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartTest = () => {
    if (selectedFiles && selectedFiles.length > 0) {
      selectedFiles.forEach((file) => uploadFile(file));
    } else {
      setUploadMessage('Please select a video file first.');
    }
  };

  return (
    <div className="page">
      <AppNav />

      <div className="page-body page-body--narrow">
        <header className="page-head">
          <span className="page-eyebrow">Detection</span>
          <h1 className="page-title">Scan a recording for anomalies</h1>
          <p className="page-subtitle">
            Sentinel scores every frame against your trained baseline, extracts the segment that
            deviates most, and describes what it found.
          </p>
        </header>

        <div className="card">
          <div className="card-head">
            <h2 className="card-title">Footage to analyse</h2>
            <p className="card-desc">Requires a trained model. Train one first if you haven't.</p>
          </div>

          <div className="card-pad">
            <VideoDropzone
              inputId="test-upload"
              file={selectedFiles?.[0]}
              onFilesSelected={handleFilesSelected}
            />

            {uploadMessage && (
              <div className="alert alert-danger mt-16">{uploadMessage}</div>
            )}

            <button
              className="btn btn-primary btn-block mt-24"
              onClick={handleStartTest}
              disabled={isProcessing}
            >
              {isProcessing ? 'Analysing…' : 'Run detection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModelTestLanding;
