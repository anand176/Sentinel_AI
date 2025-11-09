// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage'; // Import the LandingPage component
import ModelTestNo from './components/ModelTestNo'; // Import the ModelTestNo component
import Progress from './components/Progress';
import ModelTrainLanding from './components/ModelTrain';
import ModelTestLanding from './components/ModelTestLanding';
// import video from './components/VideoNarration'; // Import the VideoNarration component
import VideoNarration from './components/VideoNarration';

import Progress1 from './components/Progress1';

function App() {
  return (
    <Router>
      <Routes>
        {/* Route for the Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Route for the Model Test page */}
        <Route path="/modeltestno" element={<ModelTestNo />} />

        <Route path="/progress" element={<Progress />} />

        <Route path="/modeltrainlanding" element={<ModelTrainLanding />} />

        <Route path="/modeltestlanding" element={<ModelTestLanding />} />

        {/* Route for Video Narration */}
        <Route path="/video" element={<VideoNarration />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/progress1" element={<Progress1 />} />
        

      </Routes>
    </Router>
  );
}

export default App;
