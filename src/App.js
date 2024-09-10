// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage'; // Import the LandingPage component
import ModelTest from './components/ModelTest'; // Import the ModelTest component

function App() {
  return (
    <Router>
      <Routes>
        {/* Route for the Landing Page */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Route for the Model Test page */}
        <Route path="/model-test" element={<ModelTest />} />
      </Routes>
    </Router>
  );
}

export default App;
