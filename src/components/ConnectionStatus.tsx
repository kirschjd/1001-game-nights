/**
 * ConnectionStatus - Displays reconnection banner when connection is lost
 *
 * Shows a banner at the top of the screen when:
 * - Socket is reconnecting (shows attempt count)
 * - Connection failed permanently (shows error)
 * - Successfully reconnected (briefly shows success message)
 */

import React, { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';

const ConnectionStatus: React.FC = () => {
  const { isConnected, isReconnecting, reconnectAttempts, maxReconnectAttempts, lastError } = useSocket();
  const [showConnected, setShowConnected] = useState(false);
  const [wasDisconnected, setWasDisconnected] = useState(false);

  // Track when we were disconnected so we can show "Connected" message briefly
  useEffect(() => {
    if (!isConnected) {
      setWasDisconnected(true);
    } else if (wasDisconnected) {
      // Just reconnected - show success message briefly
      setShowConnected(true);
      const timer = setTimeout(() => {
        setShowConnected(false);
        setWasDisconnected(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, wasDisconnected]);

  // Show nothing if connected and not showing success message
  if (isConnected && !showConnected) {
    return null;
  }

  // Show success message briefly after reconnecting
  if (isConnected && showConnected) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white py-2 px-4 text-center text-sm font-medium shadow-lg animate-fade-in">
        <span className="inline-flex items-center gap-2">
          <span className="text-green-200">&#10003;</span>
          Connected
        </span>
      </div>
    );
  }

  // Show permanent error (reconnection failed completely)
  if (lastError && !isReconnecting) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white py-3 px-4 text-center shadow-lg">
        <div className="flex items-center justify-center gap-3">
          <span className="text-red-200 text-xl">&#9888;</span>
          <span className="font-medium">{lastError}</span>
          <button
            onClick={() => window.location.reload()}
            className="ml-4 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Show reconnecting banner
  if (isReconnecting) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-600 text-white py-2 px-4 text-center text-sm font-medium shadow-lg">
        <div className="flex items-center justify-center gap-3">
          <span className="inline-block animate-spin text-yellow-200">&#8635;</span>
          <span>
            Reconnecting... ({reconnectAttempts}/{maxReconnectAttempts})
          </span>
        </div>
      </div>
    );
  }

  // Show disconnected state (before reconnection attempts start)
  if (!isConnected) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-orange-600 text-white py-2 px-4 text-center text-sm font-medium shadow-lg">
        <div className="flex items-center justify-center gap-2">
          <span className="inline-block animate-pulse text-orange-200">&#9679;</span>
          <span>Connection lost - attempting to reconnect...</span>
        </div>
      </div>
    );
  }

  return null;
};

export default ConnectionStatus;
