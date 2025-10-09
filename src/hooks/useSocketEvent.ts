// src/hooks/useSocketEvent.ts
// Custom hook for managing socket event listeners

import { useEffect, DependencyList } from 'react';
import { Socket } from 'socket.io-client';

/**
 * Custom hook to register and cleanup socket event listeners
 * Automatically handles cleanup on unmount or dependency changes
 *
 * @param socket - Socket.io client instance (can be null during initialization)
 * @param eventName - Name of the socket event to listen to
 * @param handler - Event handler function
 * @param deps - Optional dependency array (default: empty array)
 *
 * @example
 * ```tsx
 * useSocketEvent(socket, 'game-started', (data) => {
 *   console.log('Game started:', data);
 * });
 * ```
 */
export function useSocketEvent<T = any>(
  socket: Socket | null,
  eventName: string,
  handler: (data: T) => void,
  deps: DependencyList = []
): void {
  useEffect(() => {
    if (!socket) return;

    // Register event listener
    socket.on(eventName, handler);

    // Cleanup function removes the listener
    return () => {
      socket.off(eventName, handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, eventName, ...deps]);
}

/**
 * Custom hook to register multiple socket event listeners at once
 *
 * @param socket - Socket.io client instance
 * @param events - Object mapping event names to handler functions
 * @param deps - Optional dependency array
 *
 * @example
 * ```tsx
 * useSocketEvents(socket, {
 *   'game-started': handleGameStarted,
 *   'game-ended': handleGameEnded,
 *   'error': handleError
 * });
 * ```
 */
export function useSocketEvents(
  socket: Socket | null,
  events: Record<string, (data: any) => void>,
  deps: DependencyList = []
): void {
  useEffect(() => {
    if (!socket) return;

    // Register all event listeners
    Object.entries(events).forEach(([eventName, handler]) => {
      socket.on(eventName, handler);
    });

    // Cleanup removes all listeners
    return () => {
      Object.entries(events).forEach(([eventName, handler]) => {
        socket.off(eventName, handler);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, ...deps]);
}

/**
 * Custom hook for one-time socket event (fires once then removes listener)
 *
 * @param socket - Socket.io client instance
 * @param eventName - Name of the socket event to listen to
 * @param handler - Event handler function
 * @param deps - Optional dependency array
 *
 * @example
 * ```tsx
 * useSocketEventOnce(socket, 'initial-state', (data) => {
 *   console.log('Initial state received:', data);
 * });
 * ```
 */
export function useSocketEventOnce<T = any>(
  socket: Socket | null,
  eventName: string,
  handler: (data: T) => void,
  deps: DependencyList = []
): void {
  useEffect(() => {
    if (!socket) return;

    // Register one-time listener
    socket.once(eventName, handler);

    // Cleanup in case component unmounts before event fires
    return () => {
      socket.off(eventName, handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, eventName, ...deps]);
}