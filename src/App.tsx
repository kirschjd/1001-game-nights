import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './contexts/SocketContext';
import ConnectionStatus from './components/ConnectionStatus';
import LandingPage from './components/LandingPage';
import LobbyPage from './components/LobbyPage';
import ExplorePage from './components/ExplorePage';
import GamePage from './components/GamePage';
import './App.css';

function App() {
  return (
    <SocketProvider>
      <Router>
        <ConnectionStatus />
        <div className="App">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/lobby/:slug" element={<LobbyPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/game/:slug" element={<GamePage />} />
          </Routes>
        </div>
      </Router>
    </SocketProvider>
  );
}

export default App;