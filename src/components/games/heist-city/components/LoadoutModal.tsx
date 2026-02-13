import React, { useState, useEffect, useRef } from 'react';
import { CharacterToken, EquipmentLoadout } from '../types';
import {
  getSavedLoadouts,
  saveLoadout,
  deleteLoadout,
  createLoadoutFromCharacters,
  applyLoadoutToCharacters,
  importLoadoutFromJson,
  downloadLoadoutAsFile,
  copyLoadoutToClipboard,
} from '../data/loadoutManager';

interface LoadoutModalProps {
  isOpen: { type: 'save' | 'load' | 'export'; playerNumber: 1 | 2 } | null;
  playerName: string;
  characters: CharacterToken[];
  onApplyLoadout: (updatedCharacters: CharacterToken[]) => void;
  onClose: () => void;
}

const LoadoutModal: React.FC<LoadoutModalProps> = ({
  isOpen,
  playerName,
  characters,
  onApplyLoadout,
  onClose,
}) => {
  const [savedLoadouts, setSavedLoadouts] = useState<EquipmentLoadout[]>([]);
  const [loadoutName, setLoadoutName] = useState('');
  const [importJson, setImportJson] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSavedLoadouts(getSavedLoadouts());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const { type, playerNumber } = isOpen;

  const handleSave = () => {
    if (!loadoutName.trim()) return;
    const loadout = createLoadoutFromCharacters(loadoutName.trim(), characters);
    saveLoadout(loadout);
    setSavedLoadouts(getSavedLoadouts());
    setLoadoutName('');
    onClose();
  };

  const handleLoad = (loadout: EquipmentLoadout) => {
    const updatedCharacters = applyLoadoutToCharacters(loadout, characters);
    onApplyLoadout(updatedCharacters);
    onClose();
  };

  const handleDelete = (name: string) => {
    deleteLoadout(name);
    setSavedLoadouts(getSavedLoadouts());
  };

  const handleExport = (method: 'download' | 'clipboard') => {
    const loadout = createLoadoutFromCharacters(
      loadoutName.trim() || `${playerNumber === 1 ? 'Blue' : 'Red'} Team Loadout`,
      characters
    );
    if (method === 'download') {
      downloadLoadoutAsFile(loadout);
    } else {
      copyLoadoutToClipboard(loadout);
    }
    setLoadoutName('');
    onClose();
  };

  const handleImportJson = () => {
    const loadout = importLoadoutFromJson(importJson);
    if (loadout) {
      handleLoad(loadout);
      setImportJson('');
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const loadout = importLoadoutFromJson(content);
      if (loadout) {
        handleLoad(loadout);
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
          {type === 'save' && 'Save Loadout'}
          {type === 'load' && 'Load Loadout'}
          {type === 'export' && 'Export Loadout'}
          {' - '}
          {playerName}
        </h3>

        {/* Save Loadout */}
        {type === 'save' && (
          <div className="space-y-4">
            <input
              type="text"
              value={loadoutName}
              onChange={(e) => setLoadoutName(e.target.value)}
              placeholder="Enter loadout name..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!loadoutName.trim()}
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
          </div>
        )}

        {/* Load Loadout */}
        {type === 'load' && (
          <div className="space-y-4">
            {/* Saved Loadouts List */}
            <div className="space-y-2">
              <span className="text-gray-300 text-sm">Saved Loadouts:</span>
              {savedLoadouts.length === 0 ? (
                <p className="text-gray-500 text-sm">No saved loadouts</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {savedLoadouts.map((loadout) => (
                    <div key={loadout.name} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                      <span className="text-white text-sm">{loadout.name}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleLoad(loadout)}
                          className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDelete(loadout.name)}
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
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder="Paste JSON here..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
              />
              <button
                onClick={handleImportJson}
                disabled={!importJson.trim()}
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
                setImportJson('');
              }}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
            >
              Close
            </button>
          </div>
        )}

        {/* Export Loadout */}
        {type === 'export' && (
          <div className="space-y-4">
            <input
              type="text"
              value={loadoutName}
              onChange={(e) => setLoadoutName(e.target.value)}
              placeholder="Enter loadout name (optional)..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('download')}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold text-sm"
              >
                Download File
              </button>
              <button
                onClick={() => handleExport('clipboard')}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-sm"
              >
                Copy to Clipboard
              </button>
            </div>
            <button
              onClick={() => {
                onClose();
                setLoadoutName('');
              }}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadoutModal;
