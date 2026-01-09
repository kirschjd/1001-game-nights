// Custom hook for Baduk Analysis game state and socket communication

import { useState, useEffect, useCallback } from 'react';
import { BadukAnalysisState, NavigationDirection, AnnotationType, AIAnalysisResult, AIAnalysisStatus } from '../types/baduk.types';

interface UseBadukAnalysisOptions {
  socket: any;
  slug: string;
  initialState?: BadukAnalysisState;
}

export function useBadukAnalysis({ socket, slug, initialState }: UseBadukAnalysisOptions) {
  const [gameState, setGameState] = useState<BadukAnalysisState | null>(initialState || null);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AIAnalysisStatus | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Listen for game state updates
  useEffect(() => {
    if (!socket) return;

    const handleGameStarted = (data: BadukAnalysisState) => {
      console.log('Game started:', data);
      if (data.type === 'baduk-analysis') {
        setGameState(data);
        setError(null);
      }
    };

    const handleGameState = (data: BadukAnalysisState) => {
      console.log('Baduk state update:', data);
      setGameState(data);
      setError(null);
    };

    const handleError = (data: { message: string }) => {
      console.error('Baduk error:', data.message);
      setError(data.message);
      setTimeout(() => setError(null), 5000);
    };

    const handleAnalysisResult = (data: AIAnalysisResult) => {
      console.log('Analysis result:', data);
      setAnalysisResult(data);
      setIsAnalyzing(false);
      setAnalysisStatus(null);
    };

    const handleAnalysisStatus = (data: AIAnalysisStatus) => {
      console.log('Analysis status:', data);
      setAnalysisStatus(data);
    };

    socket.on('game-started', handleGameStarted);
    socket.on('baduk:game-state', handleGameState);
    socket.on('baduk:analysis-result', handleAnalysisResult);
    socket.on('baduk:analysis-status', handleAnalysisStatus);
    socket.on('error', handleError);

    return () => {
      socket.off('game-started', handleGameStarted);
      socket.off('baduk:game-state', handleGameState);
      socket.off('baduk:analysis-result', handleAnalysisResult);
      socket.off('baduk:analysis-status', handleAnalysisStatus);
      socket.off('error', handleError);
    };
  }, [socket]);

  // Request current state
  const requestState = useCallback(() => {
    if (!socket || !slug) return;
    socket.emit('baduk:request-state', { slug });
  }, [socket, slug]);

  // Place a stone
  const placeStone = useCallback((x: number, y: number) => {
    if (!socket || !slug) return;
    socket.emit('baduk:place-stone', { slug, x, y });
  }, [socket, slug]);

  // Pass turn
  const pass = useCallback(() => {
    if (!socket || !slug) return;
    socket.emit('baduk:pass', { slug });
  }, [socket, slug]);

  // Navigate move tree
  const navigate = useCallback((direction: NavigationDirection, nodeId?: string) => {
    if (!socket || !slug) return;
    socket.emit('baduk:navigate', { slug, direction, nodeId });
  }, [socket, slug]);

  // Navigate to specific node
  const navigateToNode = useCallback((nodeId: string) => {
    if (!socket || !slug) return;
    socket.emit('baduk:navigate', { slug, direction: 'to-node', nodeId });
  }, [socket, slug]);

  // Upload SGF file
  const uploadSGF = useCallback((sgfContent: string) => {
    if (!socket || !slug) return;
    socket.emit('baduk:upload-sgf', { slug, sgfContent });
  }, [socket, slug]);

  // Update comment on current node
  const setComment = useCallback((comment: string) => {
    if (!socket || !slug) return;
    socket.emit('baduk:add-comment', { slug, comment });
  }, [socket, slug]);

  // Add annotation
  const addAnnotation = useCallback((type: AnnotationType, x: number, y: number, label?: string) => {
    if (!socket || !slug) return;
    socket.emit('baduk:add-annotation', { slug, type, x, y, label });
  }, [socket, slug]);

  // Remove annotation
  const removeAnnotation = useCallback((x: number, y: number) => {
    if (!socket || !slug) return;
    socket.emit('baduk:remove-annotation', { slug, x, y });
  }, [socket, slug]);

  // Delete variation
  const deleteVariation = useCallback((nodeId: string) => {
    if (!socket || !slug) return;
    socket.emit('baduk:delete-variation', { slug, nodeId });
  }, [socket, slug]);

  // Reset board
  const reset = useCallback((keepMetadata: boolean = false) => {
    if (!socket || !slug) return;
    socket.emit('baduk:reset', { slug, keepMetadata });
  }, [socket, slug]);

  // Request AI analysis
  const requestAnalysis = useCallback((options?: { maxVisits?: number }) => {
    if (!socket || !slug) return;
    setIsAnalyzing(true);
    setAnalysisStatus({ status: 'starting', message: 'Requesting analysis...' });
    socket.emit('baduk:request-analysis', { slug, options });
  }, [socket, slug]);

  // Clear analysis results
  const clearAnalysis = useCallback(() => {
    setAnalysisResult(null);
    setAnalysisStatus(null);
    setIsAnalyzing(false);
  }, []);

  // Scoring phase actions
  const toggleDeadStone = useCallback((x: number, y: number) => {
    if (!socket || !slug) return;
    socket.emit('baduk:toggle-dead-stone', { slug, x, y });
  }, [socket, slug]);

  const acceptScore = useCallback(() => {
    if (!socket || !slug) return;
    socket.emit('baduk:accept-score', { slug });
  }, [socket, slug]);

  const resumeGame = useCallback(() => {
    if (!socket || !slug) return;
    socket.emit('baduk:resume-game', { slug });
  }, [socket, slug]);

  return {
    gameState,
    error,
    // Analysis state
    analysisResult,
    analysisStatus,
    isAnalyzing,
    actions: {
      requestState,
      placeStone,
      pass,
      navigate,
      navigateToNode,
      goBack: () => navigate('back'),
      goForward: () => navigate('forward'),
      goToStart: () => navigate('to-start'),
      goToEnd: () => navigate('to-end'),
      uploadSGF,
      setComment,
      addAnnotation,
      removeAnnotation,
      deleteVariation,
      reset,
      // Analysis
      requestAnalysis,
      clearAnalysis,
      // Scoring phase
      toggleDeadStone,
      acceptScore,
      resumeGame
    }
  };
}
