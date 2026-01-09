// Game Info Panel - displays metadata and captures

import React from 'react';
import { GameMetadata } from '../types/baduk.types';

interface GameInfoProps {
  metadata: GameMetadata;
  captures: {
    black: number;
    white: number;
  };
}

const GameInfo: React.FC<GameInfoProps> = ({ metadata, captures }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-white font-semibold mb-3">Game Info</h3>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {/* Black player */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gray-900 border border-gray-600" />
          <div>
            <div className="text-white">{metadata.blackPlayer || 'Black'}</div>
            <div className="text-gray-400">Captures: {captures.black}</div>
          </div>
        </div>

        {/* White player */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-white" />
          <div>
            <div className="text-white">{metadata.whitePlayer || 'White'}</div>
            <div className="text-gray-400">Captures: {captures.white}</div>
          </div>
        </div>
      </div>

      {/* Additional info */}
      <div className="mt-3 pt-3 border-t border-gray-700 text-sm text-gray-400">
        <div className="flex justify-between">
          <span>Komi:</span>
          <span>{metadata.komi}</span>
        </div>
        {metadata.handicap > 0 && (
          <div className="flex justify-between">
            <span>Handicap:</span>
            <span>{metadata.handicap}</span>
          </div>
        )}
        {metadata.result && (
          <div className="flex justify-between">
            <span>Result:</span>
            <span className="text-white">{metadata.result}</span>
          </div>
        )}
        {metadata.date && (
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{metadata.date}</span>
          </div>
        )}
        {metadata.event && (
          <div className="flex justify-between">
            <span>Event:</span>
            <span>{metadata.event}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameInfo;
