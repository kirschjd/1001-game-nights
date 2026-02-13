import React, { useState, useEffect, useRef } from 'react';
import { MapState, GridType, SavedGameState } from '../types';
import {
  getSavedGames,
  saveGameState,
  deleteSavedGame,
  createSavedGameState,
  importGameStateFromJson,
  downloadGameStateAsFile,
  copyGameStateToClipboard,
} from '../data/gameStateManager';

interface GameSaveModalProps {
  isOpen: 'save' | 'load' | null;
  mapState: MapState;
  gridType: GridType;
  turnNumber: number;
  alertModifier: number;
  onLoadGame: (savedGame: SavedGameState) => void;
  onClose: () => void;
}

const GameSaveModal: React.FC<GameSaveModalProps> = ({
  isOpen,
  mapState,
  gridType,
  turnNumber,
  alertModifier,
  onLoadGame,
  onClose,
}) => {
  const [savedGames, setSavedGames] = useState<SavedGameState[]>([]);
  const [gameSaveName, setGameSaveName] = useState('');
  const [gameImportJson, setGameImportJson] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSavedGames(getSavedGames());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!gameSaveName.trim()) return;
    const savedGame = createSavedGameState(
      gameSaveName.trim(),
      mapState,
      gridType,
      turnNumber,
      alertModifier
    );
    const result = saveGameState(savedGame);
    if (result.success) {
      setSavedGames(getSavedGames());
      setGameSaveName('');
      onClose();
    } else {
      alert(`Failed to save game: ${result.error}`);
    }
  };

  const handleLoad = (savedGame: SavedGameState) => {
    onLoadGame(savedGame);
    onClose();
  };

  const handleDelete = (name: string) => {
    deleteSavedGame(name);
    setSavedGames(getSavedGames());
  };

  const handleExport = (method: 'download' | 'clipboard') => {
    const savedGame = createSavedGameState(
      gameSaveName.trim() || 'Heist City Game',
      mapState,
      gridType,
      turnNumber,
      alertModifier
    );
    if (method === 'download') {
      downloadGameStateAsFile(savedGame);
    } else {
      copyGameStateToClipboard(savedGame);
    }
    setGameSaveName('');
  };

  const handleImportJson = () => {
    const savedGame = importGameStateFromJson(gameImportJson);
    if (savedGame) {
      handleLoad(savedGame);
      setGameImportJson('');
    } else {
      alert('Invalid game save JSON format');
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const savedGame = importGameStateFromJson(content);
      if (savedGame) {
        handleLoad(savedGame);
      } else {
        alert('Invalid game save file format');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-white mb-4">
          {isOpen === 'save' ? 'Save Game' : 'Load Game'}
        </h3>

        {/* Save Game */}
        {isOpen === 'save' && (
          <div className="space-y-4">
            <input
              type="text"
              value={gameSaveName}
              onChange={(e) => setGameSaveName(e.target.value)}
              placeholder="Enter save name..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!gameSaveName.trim()}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded font-semibold text-sm"
              >
                Save to Browser
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
              >
                Cancel
              </button>
            </div>

            {/* Export Options */}
            <div className="border-t border-gray-700 pt-4 space-y-2">
              <span className="text-gray-300 text-sm">Or export current game:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('download')}
                  className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                >
                  Download File
                </button>
                <button
                  onClick={() => handleExport('clipboard')}
                  className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                >
                  Copy to Clipboard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Load Game */}
        {isOpen === 'load' && (
          <div className="space-y-4">
            {/* Saved Games List */}
            <div className="space-y-2">
              <span className="text-gray-300 text-sm">Saved Games ({savedGames.length}):</span>
              {savedGames.length === 0 ? (
                <p className="text-gray-500 text-sm">No saved games</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {savedGames.map((game) => (
                    <div key={game.name} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                      <div className="flex-1 min-w-0">
                        <span className="text-white text-sm block truncate">{game.name}</span>
                        <span className="text-gray-400 text-xs">
                          Turn {game.turnNumber} - {new Date(game.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => handleLoad(game)}
                          className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDelete(game.name)}
                          className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Import from JSON */}
            <div className="border-t border-gray-700 pt-4 space-y-2">
              <span className="text-gray-300 text-sm">Import from JSON:</span>
              <textarea
                value={gameImportJson}
                onChange={(e) => setGameImportJson(e.target.value)}
                placeholder="Paste game JSON here..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
              />
              <button
                onClick={handleImportJson}
                disabled={!gameImportJson.trim()}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded font-semibold text-sm"
              >
                Import from JSON
              </button>
            </div>

            {/* Import from File */}
            <div className="border-t border-gray-700 pt-4 space-y-2">
              <span className="text-gray-300 text-sm">Import from File:</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
              />
            </div>

            <button
              onClick={() => {
                onClose();
                setGameImportJson('');
              }}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameSaveModal;
