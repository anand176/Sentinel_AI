// src/App.js
//
// The product UI only. The marketing site is a separate static app in
// ../../marketing — it deploys and versions independently.
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import ModelTrain from './components/ModelTrain';
import ModelTestLanding from './components/ModelTestLanding';
import ModelTestNo from './components/ModelTestNo';
import Progress from './components/Progress';
import VideoNarration from './components/VideoNarration';
import LiveDetection from './components/LiveDetection';
import ClayBackdrop from './components/ClayBackdrop';

function App() {
  return (
    <Router>
      {/* Fixed-position ambient blobs shared by every route */}
      <ClayBackdrop />

      <Routes>
        {/* The app opens on the dashboard; /dashboard stays as an alias so
            existing links and the marketing site's CTA keep working. */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Training */}
        <Route path="/modeltrainlanding" element={<ModelTrain />} />
        <Route path="/progress" element={<Progress />} />

        {/* Detection on an uploaded file */}
        <Route path="/modeltestlanding" element={<ModelTestLanding />} />
        <Route path="/video" element={<VideoNarration />} />
        <Route path="/modeltestno" element={<ModelTestNo />} />

        {/* Live webcam detection */}
        <Route path="/live" element={<LiveDetection />} />
      </Routes>
    </Router>
  );
}

export default App;
