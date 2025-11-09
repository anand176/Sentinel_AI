import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Importing global styles if you have any
import App from './App'; // Importing the App component

// Render the App component to the root div in public/index.html
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

