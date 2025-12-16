import React from 'react';

const LobbyInfo: React.FC = () => {
  return (
    <div className="mt-6 p-4 bg-lion/10 rounded-lg border border-lion/30">
      <h4 className="font-semibold mb-2 text-lion">Lobby Features:</h4>
      <ul className="text-sm text-gray-300 space-y-1">
        <li>• Real-time multiplayer with Socket.io</li>
        <li>• Player reconnection support</li>
        <li>• Leader-based game control</li>
        <li>• Share lobby with 3-word URL</li>
      </ul>
    </div>
  );
};

export default LobbyInfo;
