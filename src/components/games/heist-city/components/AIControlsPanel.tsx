/**
 * AIControlsPanel — AI Toggle, Difficulty, Step-by-Step Controls
 *
 * In step-by-step mode the AI:
 * 1. Plans ONE character activation at a time (Plan Next)
 * 2. Shows what it intends to do
 * 3. Waits for the human to press "Execute"
 * 4. Goes idle until the human activates their own character and requests the next AI activation
 */

import React from 'react';
import { AIActivation } from '../ai/types';

export interface AIControlsPanelProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  difficulty: 'easy' | 'normal' | 'hard';
  onDifficultyChange: (d: 'easy' | 'normal' | 'hard') => void;
  playerNumber: 1 | 2;
  onPlayerNumberChange: (p: 1 | 2) => void;
  aiStatus: 'idle' | 'thinking' | 'executing' | 'paused' | 'error';
  pendingActivation: AIActivation | null;
  lastReasoning: string;
  error: string | null;
  onPlanNext: () => void;
  onExecuteNext: () => void;
}

const AIControlsPanel: React.FC<AIControlsPanelProps> = ({
  enabled, onToggle, difficulty, onDifficultyChange,
  playerNumber, onPlayerNumberChange,
  aiStatus, pendingActivation, lastReasoning, error,
  onPlanNext, onExecuteNext,
}) => {
  const statusText =
    aiStatus === 'thinking' ? 'Thinking...'
    : aiStatus === 'executing' ? 'Executing...'
    : aiStatus === 'error' ? 'Error'
    : pendingActivation ? 'Ready'
    : 'Idle';

  const statusColor =
    aiStatus === 'thinking' ? 'text-cyan-400'
    : aiStatus === 'executing' ? 'text-yellow-400'
    : aiStatus === 'error' ? 'text-red-400'
    : pendingActivation ? 'text-green-400'
    : 'text-gray-400';

  const busy = aiStatus === 'thinking' || aiStatus === 'executing';

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white">AI Opponent</h3>
        <button
          onClick={() => onToggle(!enabled)}
          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
            enabled
              ? 'bg-cyan-600 text-white hover:bg-cyan-700'
              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
          }`}
        >
          {enabled ? 'On' : 'Off'}
        </button>
      </div>

      {enabled && (
        <>
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 block mb-1">Team</label>
              <select
                value={playerNumber}
                onChange={e => onPlayerNumberChange(Number(e.target.value) as 1 | 2)}
                className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1 border border-gray-600"
              >
                <option value={1}>Blue (P1)</option>
                <option value={2}>Red (P2)</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 block mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={e => onDifficultyChange(e.target.value as 'easy' | 'normal' | 'hard')}
                className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1 border border-gray-600"
              >
                <option value="easy">Easy</option>
                <option value="normal">Normal</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="mb-2">
            <span className="text-[10px] text-gray-400">Status: </span>
            <span className={`text-xs font-semibold ${statusColor}`}>{statusText}</span>
          </div>

          {/* Pending activation preview */}
          {pendingActivation && (
            <div className="bg-gray-900 border border-cyan-800 rounded p-2 mb-2">
              <div className="text-[10px] text-cyan-500 mb-1 font-semibold">Planned Activation</div>
              <div className="text-xs text-gray-300">
                {pendingActivation.actions.length > 0
                  ? pendingActivation.actions.map((a, i) => (
                      <span key={i}>
                        {i > 0 && <span className="text-gray-600"> → </span>}
                        <span className="text-cyan-300">{a.actionId}</span>
                      </span>
                    ))
                  : <span className="text-gray-500 italic">No actions</span>
                }
              </div>
            </div>
          )}

          {/* Reasoning */}
          {lastReasoning && (
            <div className="bg-gray-900 rounded p-2 mb-2">
              <div className="text-[10px] text-gray-500 mb-1">AI Reasoning</div>
              <div className="text-xs text-gray-300 italic">{lastReasoning}</div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {!pendingActivation && !busy && (
              <button
                onClick={onPlanNext}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs rounded font-semibold"
              >
                Plan Next
              </button>
            )}
            {pendingActivation && !busy && (
              <button
                onClick={onExecuteNext}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-semibold"
              >
                Execute
              </button>
            )}
          </div>

          {error && (
            <div className="mt-2 bg-red-900/30 border border-red-700 rounded p-2 text-xs text-red-300">
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AIControlsPanel;
