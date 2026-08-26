import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppNav from './AppNav';
import VideoDropzone from './VideoDropzone';

function ModelTrain() {
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  const handleFilesSelected = (files) => {
    if (files.length > 0) {
      setSelectedFiles(files);
      setUploadMessage('');
    } else {
      setUploadMessage('Please choose a valid video file.');
    }
  };

  const handleStartTrain = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      setUploadMessage('Please select a video file first.');
      return;
    }

    const formData = new FormData();
    formData.append('video', selectedFiles[0]);
    formData.append('mode', 'train');

    try {
      setIsProcessing(true);
      const response = await fetch('http://127.0.0.1:5001/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setUploadMessage(data.error || `Training failed to start: ${response.statusText}`);
        return;
      }

      // Training runs in the background; the progress screen polls this job.
      window.localStorage.setItem('trainJobId', data.job_id);
      navigate('/progress');
    } catch (err) {
      setUploadMessage(
        'Could not reach the detection service on port 5001. Is the backend running?'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="page">
      <AppNav />

      <div className="page-body page-body--narrow">
        <header className="page-head">
          <span className="page-eyebrow">Training</span>
          <h1 className="page-title">Teach Sentinel what normal looks like</h1>
          <p className="page-subtitle">
            Upload routine footage from the camera you want to monitor. The model learns this
            baseline and treats deviations from it as anomalies.
          </p>
        </header>

        <div className="card">
          <div className="card-head">
            <h2 className="card-title">Baseline footage</h2>
            <p className="card-desc">One clear recording of ordinary activity works best.</p>
          </div>

          <div className="card-pad">
            <VideoDropzone
              inputId="train-upload"
              file={selectedFiles?.[0]}
              onFilesSelected={handleFilesSelected}
            />

            {uploadMessage && (
              <div className="alert alert-danger mt-16">{uploadMessage}</div>
            )}

            <button
              className="btn btn-primary btn-block mt-24"
              onClick={handleStartTrain}
              disabled={isProcessing}
            >
              {isProcessing ? 'Starting training…' : 'Start training'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModelTrain;
