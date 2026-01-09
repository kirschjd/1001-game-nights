// Analysis Panel Component
// Displays AI analysis results from KataGo

import React from 'react';
import { AIAnalysisResult, AIAnalysisStatus, Point } from '../types/baduk.types';

interface AnalysisPanelProps {
  analysisResult: AIAnalysisResult | null;
  analysisStatus: AIAnalysisStatus | null;
  isAnalyzing: boolean;
  onRequestAnalysis: (options?: { maxVisits?: number }) => void;
  onClearAnalysis: () => void;
  currentTurn: 'black' | 'white';
  disabled?: boolean;
}

// Convert point to Go coordinate notation (A1-T19, no I)
function pointToCoord(point: Point | null): string {
  if (!point) return 'pass';
  const letters = 'ABCDEFGHJKLMNOPQRST'; // Note: no I
  return `${letters[point.x]}${19 - point.y}`;
}

// Format winrate as percentage
function formatWinrate(winrate: number): string {
  return `${(winrate * 100).toFixed(1)}%`;
}

// Format score lead
function formatScoreLead(scoreLead: number): string {
  if (scoreLead > 0) return `B+${scoreLead.toFixed(1)}`;
  if (scoreLead < 0) return `W+${Math.abs(scoreLead).toFixed(1)}`;
  return 'Even';
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  analysisResult,
  analysisStatus,
  isAnalyzing,
  onRequestAnalysis,
  onClearAnalysis,
  currentTurn,
  disabled = false
}) => {
  const hasResults = analysisResult && analysisResult.moves.length > 0;
  const isAvailable = analysisResult?.available !== false;

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">AI Analysis</h3>
        {isAnalyzing && (
          <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded animate-pulse">
            Analyzing...
          </span>
        )}
      </div>

      {/* Availability message */}
      {analysisResult && !isAvailable && (
        <div className="mb-3 p-2 bg-yellow-900/50 rounded text-xs text-yellow-400">
          {analysisResult.message}
        </div>
      )}

      {/* Status message */}
      {analysisStatus && (
        <div className="mb-3 text-sm text-gray-400">
          {analysisStatus.message}
        </div>
      )}

      {/* Winrate display */}
      {hasResults && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-400 text-xs">Win Rate</span>
            <span className="text-gray-400 text-xs">
              {formatScoreLead(analysisResult.scoreLead)}
            </span>
          </div>

          {/* Winrate bar */}
          <div className="h-4 bg-white rounded-full overflow-hidden flex">
            <div
              className="h-full bg-gray-900 transition-all duration-300"
              style={{ width: `${analysisResult.overallWinrate.black * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-400">
              Black: {formatWinrate(analysisResult.overallWinrate.black)}
            </span>
            <span className="text-xs text-gray-400">
              White: {formatWinrate(analysisResult.overallWinrate.white)}
            </span>
          </div>
        </div>
      )}

      {/* Top moves */}
      {hasResults && (
        <div className="mb-3">
          <h4 className="text-gray-400 text-xs mb-2">Top Moves</h4>
          <div className="space-y-1">
            {analysisResult.moves.slice(0, 5).map((move, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-2 rounded text-sm ${
                  index === 0 ? 'bg-green-900/30 border border-green-700' : 'bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-4">{index + 1}.</span>
                  <span className="text-white font-mono">
                    {pointToCoord(move.point)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className={move.winrate > 0.5 ? 'text-gray-300' : 'text-gray-400'}>
                    {formatWinrate(move.winrate)}
                  </span>
                  <span className="text-gray-500">
                    {move.visits} visits
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Principal variation for top move */}
      {hasResults && analysisResult.moves[0]?.pv.length > 0 && (
        <div className="mb-3">
          <h4 className="text-gray-400 text-xs mb-2">Principal Variation</h4>
          <div className="text-xs text-gray-300 font-mono bg-gray-700/50 p-2 rounded">
            {analysisResult.moves[0].pv.slice(0, 8).map(p => pointToCoord(p)).join(' → ')}
            {analysisResult.moves[0].pv.length > 8 && '...'}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onRequestAnalysis()}
          disabled={disabled || isAnalyzing}
          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded transition-colors"
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze'}
        </button>
        {hasResults && (
          <button
            type="button"
            onClick={onClearAnalysis}
            className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium rounded transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Quick analysis options */}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => onRequestAnalysis({ maxVisits: 50 })}
          disabled={disabled || isAnalyzing}
          className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-gray-300 text-xs rounded transition-colors"
        >
          Quick (50)
        </button>
        <button
          type="button"
          onClick={() => onRequestAnalysis({ maxVisits: 500 })}
          disabled={disabled || isAnalyzing}
          className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-gray-300 text-xs rounded transition-colors"
        >
          Deep (500)
        </button>
      </div>

      {/* Help text */}
      {!hasResults && !isAnalyzing && isAvailable && (
        <p className="mt-3 text-xs text-gray-500">
          Click Analyze to get AI suggestions for the current position.
        </p>
      )}
    </div>
  );
};

export default AnalysisPanel;
