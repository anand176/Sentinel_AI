import React, { useEffect, useRef, useState } from 'react';

/**
 * Drag-and-drop / click-anywhere control restricted to video files.
 *
 * Empty state: the whole well is one big target — click or drop.
 * Filled state: the chosen video plays inline, and replacing it is an explicit
 * action so that clicking the player's controls never reopens the file dialog.
 */
function VideoDropzone({ inputId = 'video-upload', file, onFilesSelected }) {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const inputRef = useRef(null);

  // Object URLs must be revoked or the blob is retained for the page's lifetime.
  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pickVideos = (fileList) =>
    Array.from(fileList).filter((f) => f.type.startsWith('video/'));

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    onFilesSelected(pickVideos(e.dataTransfer.files));
  };

  const openPicker = () => inputRef.current?.click();

  const handleKeyDown = (e) => {
    // A div with role="button" has to implement its own key activation
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  };

  const formatSize = (bytes) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  };

  // Click-to-open applies only to the empty state
  const zoneProps = file
    ? {}
    : { role: 'button', tabIndex: 0, onClick: openPicker, onKeyDown: handleKeyDown };

  return (
    <>
      <div
        className={`dropzone${dragActive ? ' is-active' : ''}${file ? ' has-file' : ' is-clickable'}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        aria-label={file ? undefined : 'Choose a video file'}
        {...zoneProps}
      >
        {file && previewUrl ? (
          <div className="dz-preview">
            <div className="dz-preview-frame">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={previewUrl} controls preload="metadata" />
            </div>

            <div className="dz-preview-meta">
              <span className="dz-preview-name" title={file.name}>{file.name}</span>
              <span className="dz-preview-size">{formatSize(file.size)}</span>
            </div>

            <button type="button" className="dz-replace" onClick={openPicker}>
              Replace video
            </button>
          </div>
        ) : (
          <>
            <span className="dropzone-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </span>
            <span className="dropzone-title">
              {dragActive ? 'Drop to upload' : 'Drag and drop a video here'}
            </span>
            <span className="dropzone-hint">MP4, MOV, AVI or WebM</span>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="video/*"
        onChange={(e) => onFilesSelected(pickVideos(e.target.files))}
        style={{ display: 'none' }}
      />
    </>
  );
}

export default VideoDropzone;
