// Control Panel for navigation and actions

import React from 'react';

interface ControlPanelProps {
  onGoBack: () => void;
  onGoForward: () => void;
  onGoToStart: () => void;
  onGoToEnd: () => void;
  onPass: () => void;
  onReset: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  currentTurn: 'black' | 'white';
  moveNumber: number;
  disabled?: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  onGoBack,
  onGoForward,
  onGoToStart,
  onGoToEnd,
  onPass,
  onReset,
  canGoBack,
  canGoForward,
  currentTurn,
  moveNumber,
  disabled = false
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-300 text-sm">Move: {moveNumber}</span>
        <div className="flex items-center gap-2">
          <div
            className={`w-4 h-4 rounded-full ${currentTurn === 'black' ? 'bg-gray-900 border border-gray-600' : 'bg-white'}`}
          />
          <span className="text-gray-300 text-sm capitalize">{currentTurn} to play</span>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={onGoToStart}
          disabled={!canGoBack}
          className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded transition-colors"
          title="Go to start"
        >
          |&lt;
        </button>
        <button
          onClick={onGoBack}
          disabled={!canGoBack}
          className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded transition-colors"
          title="Go back"
        >
          &lt;
        </button>
        <button
          onClick={onGoForward}
          disabled={!canGoForward}
          className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded transition-colors"
          title="Go forward"
        >
          &gt;
        </button>
        <button
          onClick={onGoToEnd}
          disabled={!canGoForward}
          className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded transition-colors"
          title="Go to end"
        >
          &gt;|
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onPass}
          disabled={disabled}
          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors"
        >
          Pass
        </button>
        <button
          onClick={onReset}
          disabled={disabled}
          className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Disabled message */}
      {disabled && (
        <div className="mt-2 text-xs text-yellow-400 text-center">
          Complete scoring phase first
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
