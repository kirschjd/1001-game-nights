/**
 * SocketContext - Centralized Socket.IO connection management
 *
 * Provides a single socket instance to the entire app with:
 * - Automatic reconnection with exponential backoff
 * - Connection state tracking
 * - Session-based identity recovery
 */

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';

// Server URL based on environment
const SERVER_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';

// Socket.IO configuration with auto-reconnect
const SOCKET_OPTIONS = {
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  timeout: 20000,
  autoConnect: true,
};

export interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  lastError: string | null;
  // Helper to rejoin lobby after reconnection
  rejoinLobby: (slug: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Track which lobbies we need to rejoin after reconnection
  const pendingRejoinRef = useRef<string | null>(null);

  // Initialize socket connection
  useEffect(() => {
    console.log('[SocketContext] Initializing socket connection...');

    const socket = io(SERVER_URL, SOCKET_OPTIONS);
    socketRef.current = socket;

    // Connection established
    socket.on('connect', () => {
      console.log('[SocketContext] Connected! Socket ID:', socket.id);
      setIsConnected(true);
      setIsReconnecting(false);
      setReconnectAttempts(0);
      setLastError(null);

      // If we have a pending rejoin, do it now
      if (pendingRejoinRef.current) {
        const slug = pendingRejoinRef.current;
        const playerName = localStorage.getItem(`player-name-${slug}`);
        if (playerName) {
          console.log('[SocketContext] Rejoining lobby after reconnect:', slug, 'as', playerName);
          socket.emit('join-lobby', { slug, playerName });
          socket.emit('request-game-state', { slug });
        }
        pendingRejoinRef.current = null;
      }
    });

    // Connection lost
    socket.on('disconnect', (reason) => {
      console.log('[SocketContext] Disconnected:', reason);
      setIsConnected(false);

      // If server disconnected us, we'll try to reconnect
      if (reason === 'io server disconnect') {
        // Server disconnected us, reconnect manually
        socket.connect();
      }
      // For other reasons, Socket.IO will auto-reconnect based on config
    });

    // Reconnection attempt starting
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[SocketContext] Reconnection attempt:', attemptNumber);
      setIsReconnecting(true);
      setReconnectAttempts(attemptNumber);
    });

    // Reconnection successful
    socket.on('reconnect', (attemptNumber) => {
      console.log('[SocketContext] Reconnected after', attemptNumber, 'attempts');
      setIsReconnecting(false);
      setReconnectAttempts(0);
      setLastError(null);
    });

    // Reconnection failed permanently
    socket.on('reconnect_failed', () => {
      console.log('[SocketContext] Reconnection failed permanently');
      setIsReconnecting(false);
      setLastError('Unable to reconnect to server. Please refresh the page.');
    });

    // Connection error
    socket.on('connect_error', (error) => {
      console.error('[SocketContext] Connection error:', error.message);
      setLastError(`Connection error: ${error.message}`);
    });

    // Respond to server heartbeat pings
    socket.on('heartbeat-ping', () => {
      socket.emit('heartbeat-pong');
    });

    // Cleanup on unmount
    return () => {
      console.log('[SocketContext] Cleaning up socket connection');
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Helper function to rejoin a lobby (called by pages after reconnect)
  const rejoinLobby = useCallback((slug: string) => {
    const socket = socketRef.current;
    if (!socket) return;

    if (socket.connected) {
      const playerName = localStorage.getItem(`player-name-${slug}`);
      if (playerName) {
        console.log('[SocketContext] Rejoining lobby:', slug, 'as', playerName);
        socket.emit('join-lobby', { slug, playerName });
        socket.emit('request-game-state', { slug });
      }
    } else {
      // Store for later when we reconnect
      console.log('[SocketContext] Socket not connected, storing rejoin request for:', slug);
      pendingRejoinRef.current = slug;
    }
  }, []);

  const contextValue: SocketContextType = {
    socket: socketRef.current,
    isConnected,
    isReconnecting,
    reconnectAttempts,
    maxReconnectAttempts: SOCKET_OPTIONS.reconnectionAttempts,
    lastError,
    rejoinLobby,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

/**
 * Hook to access the socket context
 * Must be used within a SocketProvider
 */
export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
