// Score Panel Component
// Displays score breakdown with territory visualization toggle and scoring phase controls

import React, { useMemo } from 'react';
import { BoardState, GamePhase } from '../types/baduk.types';
import { calculateScore, ScoreBreakdown } from '../utils/goLogic';

interface ScorePanelProps {
  board: BoardState;
  komi: number;
  captures: { black: number; white: number };
  deadStones: Set<string>;
  phase: GamePhase;
  showTerritory: boolean;
  onToggleTerritory: () => void;
  onAcceptScore: () => void;
  onResumeGame: () => void;
  result: string | null;
}

const ScorePanel: React.FC<ScorePanelProps> = ({
  board,
  komi,
  captures,
  deadStones,
  phase,
  showTerritory,
  onToggleTerritory,
  onAcceptScore,
  onResumeGame,
  result
}) => {
  const score: ScoreBreakdown = useMemo(() => {
    return calculateScore(board, komi, captures, deadStones);
  }, [board, komi, captures, deadStones]);

  const isScoring = phase === 'scoring';
  const isFinished = phase === 'finished';

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">Score</h3>
        {isScoring && (
          <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded">
            Scoring
          </span>
        )}
        {isFinished && (
          <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">
            Finished
          </span>
        )}
      </div>

      {/* Score display */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        {/* Black score */}
        <div className={`p-3 rounded-lg ${score.winner === 'black' ? 'bg-gray-900 ring-2 ring-green-500' : 'bg-gray-900'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 rounded-full bg-gray-900 border-2 border-gray-600" />
            <span className="text-white font-medium">Black</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {score.black.total}
          </div>
          <div className="text-xs text-gray-400 space-y-0.5">
            <div className="flex justify-between">
              <span>Territory:</span>
              <span>{score.black.territory}</span>
            </div>
            <div className="flex justify-between">
              <span>Stones:</span>
              <span>{score.black.stones}</span>
            </div>
          </div>
        </div>

        {/* White score */}
        <div className={`p-3 rounded-lg ${score.winner === 'white' ? 'bg-gray-100 ring-2 ring-green-500' : 'bg-gray-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 rounded-full bg-white border-2 border-gray-300" />
            <span className="text-gray-900 font-medium">White</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {score.white.total}
          </div>
          <div className="text-xs text-gray-600 space-y-0.5">
            <div className="flex justify-between">
              <span>Territory:</span>
              <span>{score.white.territory}</span>
            </div>
            <div className="flex justify-between">
              <span>Stones:</span>
              <span>{score.white.stones}</span>
            </div>
            <div className="flex justify-between">
              <span>Komi:</span>
              <span>{score.white.komi}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Winner display */}
      {score.winner !== 'tie' && (
        <div className="text-center text-sm">
          <span className={score.winner === 'black' ? 'text-gray-300' : 'text-gray-200'}>
            {score.winner === 'black' ? 'Black' : 'White'} wins by {score.margin.toFixed(1)} points
          </span>
        </div>
      )}
      {score.winner === 'tie' && (
        <div className="text-center text-sm text-yellow-400">
          Tie game!
        </div>
      )}

      {/* Final result display */}
      {isFinished && result && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="text-center text-lg font-bold text-green-400">
            Final: {result}
          </div>
        </div>
      )}

      {/* Territory visualization toggle */}
      {!isScoring && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showTerritory}
              onChange={onToggleTerritory}
              className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
            />
            <span className="text-sm text-gray-300">Show territory</span>
          </label>
        </div>
      )}

      {/* Scoring phase controls */}
      {isScoring && (
        <div className="mt-3 pt-3 border-t border-gray-700 space-y-3">
          <p className="text-xs text-yellow-400">
            Click on stones to mark them as dead. Click again to unmark.
          </p>
          {deadStones.size > 0 && (
            <p className="text-xs text-gray-400">
              {deadStones.size} stone{deadStones.size !== 1 ? 's' : ''} marked as dead
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onAcceptScore}
              className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors"
            >
              Accept Score
            </button>
            <button
              type="button"
              onClick={onResumeGame}
              className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium rounded transition-colors"
            >
              Resume Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScorePanel;
