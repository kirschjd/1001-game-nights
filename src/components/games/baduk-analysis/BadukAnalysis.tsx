// Baduk (Go) Analysis Tool - Main Component
// Multiplayer Go board with move tree, SGF support, and collaborative analysis

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useBadukAnalysis } from './hooks/useBadukAnalysis';
import { GoBoard, ControlPanel, GameInfo, MoveTree, SGFUploader, CommentPanel, ScorePanel, AnalysisPanel, AISettingsPanel } from './components';
import { BadukAnalysisState } from './types/baduk.types';

interface BadukAnalysisProps {
  socket: any;
  slug: string;
  playerName: string;
  isLeader?: boolean;
  gameState?: BadukAnalysisState;
}

const BadukAnalysis: React.FC<BadukAnalysisProps> = ({
  socket,
  slug,
  playerName,
  isLeader,
  gameState: initialGameState
}) => {
  const { gameState, error, analysisResult, analysisStatus, isAnalyzing, skillLevels, actions } = useBadukAnalysis({
    socket,
    slug,
    initialState: initialGameState
  });

  // Track if KataGo is available based on analysis result
  const [kataGoAvailable, setKataGoAvailable] = useState(true);

  // Check KataGo availability from analysis result
  useEffect(() => {
    if (analysisResult && analysisResult.available === false) {
      setKataGoAvailable(false);
    }
  }, [analysisResult]);

  // Local UI state for territory visualization (not synced to server)
  const [showTerritory, setShowTerritory] = useState(false);

  // Auto-enable territory when entering scoring phase
  useEffect(() => {
    if (gameState?.phase === 'scoring') {
      setShowTerritory(true);
    }
  }, [gameState?.phase]);

  // Toggle territory visualization
  const handleToggleTerritory = useCallback(() => {
    setShowTerritory(prev => !prev);
  }, []);

  // Request state on mount
  useEffect(() => {
    if (socket && slug && !gameState) {
      actions.requestState();
    }
  }, [socket, slug, gameState, actions]);

  // Get current node info for controls
  const currentNodeInfo = useMemo(() => {
    if (!gameState) return null;
    return gameState.currentNode;
  }, [gameState]);

  // Get last move for board highlighting
  const lastMove = useMemo(() => {
    if (!gameState?.currentNode.move) return null;
    return gameState.currentNode.move;
  }, [gameState]);

  // Convert deadStones array to Set for components
  const deadStonesSet = useMemo(() => {
    if (!gameState?.deadStones) return new Set<string>();
    return new Set(gameState.deadStones);
  }, [gameState?.deadStones]);

  // Determine if in scoring mode from server phase
  const isScoring = gameState?.phase === 'scoring';
  const isFinished = gameState?.phase === 'finished';

  // Loading state
  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 min-h-full justify-center max-w-6xl mx-auto">
      {/* Error display */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded shadow-lg z-50">
          {error}
        </div>
      )}

      {/* Scoring phase banner */}
      {isScoring && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-yellow-600 text-white px-4 py-2 rounded shadow-lg z-40">
          Scoring Phase - Click stones to mark them as dead
        </div>
      )}

      {/* AI thinking banner */}
      {gameState.aiOpponent.enabled && gameState.aiOpponent.isThinking && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-40 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          AI is thinking...
        </div>
      )}

      {/* Left: Go Board */}
      <div className="flex-shrink-0 flex justify-center items-start">
        <GoBoard
          board={gameState.board}
          currentTurn={gameState.currentTurn}
          koPoint={gameState.koPoint}
          lastMove={lastMove}
          annotations={gameState.currentNode.annotations}
          onPlaceStone={actions.placeStone}
          starPoints={gameState.config.starPoints}
          size={560}
          scoringMode={isScoring}
          deadStones={deadStonesSet}
          onToggleDeadStone={actions.toggleDeadStone}
          showTerritory={showTerritory || isScoring}
        />
      </div>

      {/* Right: Controls and Info */}
      <div className="flex flex-col gap-4 w-full lg:w-80">
        {/* Score Panel */}
        <ScorePanel
          board={gameState.board}
          komi={gameState.metadata.komi}
          captures={gameState.captures}
          deadStones={deadStonesSet}
          phase={gameState.phase}
          showTerritory={showTerritory || isScoring}
          onToggleTerritory={handleToggleTerritory}
          onAcceptScore={actions.acceptScore}
          onResumeGame={actions.resumeGame}
          result={gameState.metadata.result}
        />

        {/* AI Analysis Panel */}
        <AnalysisPanel
          analysisResult={analysisResult}
          analysisStatus={analysisStatus}
          isAnalyzing={isAnalyzing}
          onRequestAnalysis={actions.requestAnalysis}
          onClearAnalysis={actions.clearAnalysis}
          currentTurn={gameState.currentTurn}
          disabled={isScoring || isFinished}
        />

        {/* AI Opponent Settings */}
        <AISettingsPanel
          aiSettings={gameState.aiOpponent}
          skillLevels={skillLevels}
          onConfigure={actions.configureAI}
          onRequestSkillLevels={actions.requestSkillLevels}
          kataGoAvailable={kataGoAvailable}
          disabled={isScoring || isFinished}
        />

        {/* Game Info */}
        <GameInfo
          metadata={gameState.metadata}
          captures={gameState.captures}
        />

        {/* Control Panel - hide some controls during scoring */}
        <ControlPanel
          onGoBack={actions.goBack}
          onGoForward={actions.goForward}
          onGoToStart={actions.goToStart}
          onGoToEnd={actions.goToEnd}
          onPass={actions.pass}
          onReset={() => actions.reset(false)}
          canGoBack={!!currentNodeInfo?.parentId}
          canGoForward={currentNodeInfo?.hasChildren || false}
          currentTurn={gameState.currentTurn}
          moveNumber={currentNodeInfo?.moveNumber || 0}
          disabled={isScoring}
        />

        {/* SGF Upload */}
        <SGFUploader onUpload={actions.uploadSGF} />

        {/* Comment Panel */}
        <CommentPanel
          comment={gameState.currentNode.comment}
          onUpdateComment={actions.setComment}
          moveNumber={currentNodeInfo?.moveNumber || 0}
        />

        {/* Move Tree */}
        <MoveTree
          moveTree={gameState.moveTree}
          onSelectNode={actions.navigateToNode}
        />

        {/* Players in session */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-2">Players</h3>
          <div className="space-y-1">
            {gameState.players.map(player => (
              <div
                key={player.playerId}
                className="flex items-center gap-2 text-sm"
              >
                <div
                  className={`w-2 h-2 rounded-full ${player.isConnected ? 'bg-green-500' : 'bg-gray-500'}`}
                />
                <span className={player.isConnected ? 'text-white' : 'text-gray-500'}>
                  {player.playerName}
                  {player.playerName === playerName && ' (you)'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Keyboard shortcuts help */}
        <div className="bg-gray-800 rounded-lg p-4 text-xs text-gray-500">
          <h4 className="text-gray-400 font-medium mb-1">Keyboard Shortcuts</h4>
          <div className="space-y-0.5">
            <div>Left/Right: Navigate moves</div>
            <div>Home/End: Go to start/end</div>
            <div>P: Pass</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BadukAnalysis;
