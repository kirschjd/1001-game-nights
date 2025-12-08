import React, { useState } from 'react';
import { ItemType, MapItem, MapZone, CharacterToken, Position } from '../types';
import { ITEM_STYLES } from '../data/mapConstants';

interface GameInfo {
  turnNumber: number;
  blueVictoryPoints: number;
  redVictoryPoints: number;
}

interface MapLegendProps {
  editorMode: boolean;
  onAddItem?: (itemType: ItemType) => void;
  onAddZone?: () => void;
  existingItems: ItemType[];
  allItems?: MapItem[];
  allZones?: MapZone[];
  allCharacters?: CharacterToken[];
  gameInfo?: GameInfo;
  onImportMap?: (mapData: {
    items: MapItem[];
    zones: MapZone[];
    startPositions?: { player1: Position[]; player2: Position[] };
    characterData?: CharacterToken[];
    gameInfo?: GameInfo;
  }) => void;
}

const ITEM_NAMES: Record<ItemType, string> = {
  wall: 'Wall',
  table: 'Partial Cover',
  computer: 'Computer',
  gear: 'Gear',
  teleporter: 'Teleporter',
  'info-drop': 'Info Drop',
  'enemy-camera': 'Turret',
  'enemy-rapid-response': 'Rapid Response',
  'enemy-security-guard': 'Security Guard',
};

// Render mini SVG icon for each item type
const renderItemIcon = (itemType: ItemType) => {
  const style = ITEM_STYLES[itemType];
  const size = 20; // Fixed size for legend icons
  const center = size / 2;

  switch (itemType) {
    case 'wall':
      return (
        <rect
          x={2}
          y={2}
          width={size - 4}
          height={size - 4}
          fill={style.color}
          stroke="#000"
          strokeWidth={1}
        />
      );

    case 'table':
      return (
        <rect
          x={2}
          y={2}
          width={size - 4}
          height={size - 4}
          fill={style.color}
          stroke="#000"
          strokeWidth={1}
        />
      );

    case 'computer':
      return (
        <g>
          <rect
            x={3}
            y={3}
            width={14}
            height={14}
            fill="none"
            stroke={style.color}
            strokeWidth={2}
          />
          <rect
            x={6}
            y={6}
            width={8}
            height={8}
            fill={style.color}
          />
        </g>
      );

    case 'gear':
      return (
        <circle
          cx={center}
          cy={center}
          r={8}
          fill={style.color}
          stroke="#000"
          strokeWidth={1}
        />
      );

    case 'teleporter':
      return (
        <g>
          <rect
            x={3}
            y={3}
            width={14}
            height={14}
            fill="none"
            stroke={style.color}
            strokeWidth={2}
          />
          <rect
            x={6}
            y={6}
            width={8}
            height={8}
            fill={style.color}
          />
        </g>
      );

    case 'info-drop':
      return (
        <g>
          {/* Horizontal bar of cross */}
          <rect
            x={3}
            y={8}
            width={14}
            height={4}
            fill={style.color}
            stroke="#000"
            strokeWidth={0.5}
          />
          {/* Vertical bar of cross */}
          <rect
            x={8}
            y={3}
            width={4}
            height={14}
            fill={style.color}
            stroke="#000"
            strokeWidth={0.5}
          />
        </g>
      );

    case 'enemy-camera':
      return (
        <g>
          {/* Horizontal bar of cross */}
          <rect
            x={3}
            y={8}
            width={14}
            height={4}
            fill={style.color}
            stroke="#000"
            strokeWidth={0.5}
          />
          {/* Vertical bar of cross */}
          <rect
            x={8}
            y={3}
            width={4}
            height={14}
            fill={style.color}
            stroke="#000"
            strokeWidth={0.5}
          />
        </g>
      );

    case 'enemy-rapid-response':
      return (
        <polygon
          points={`${center},2 ${size - 2},${center} ${center},${size - 2} 2,${center}`}
          fill={style.color}
          stroke="#000"
          strokeWidth={1}
        />
      );

    case 'enemy-security-guard':
      return (
        <circle
          cx={center}
          cy={center}
          r={8}
          fill={style.color}
          stroke="#000"
          strokeWidth={1}
        />
      );

    default:
      return (
        <circle
          cx={center}
          cy={center}
          r={8}
          fill="#999"
          stroke="#000"
          strokeWidth={1}
        />
      );
  }
};

const MapLegend: React.FC<MapLegendProps> = ({ editorMode, onAddItem, onAddZone, existingItems, allItems = [], allZones = [], allCharacters = [], gameInfo, onImportMap }) => {
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');

  const itemCounts = existingItems.reduce((acc, itemType) => {
    acc[itemType] = (acc[itemType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const exportMapJSON = () => {
    // Extract start positions from characters
    const player1Characters = allCharacters.filter(c => c.playerNumber === 1);
    const player2Characters = allCharacters.filter(c => c.playerNumber === 2);

    const exportData = {
      items: allItems,
      zones: allZones,
      startPositions: {
        player1: player1Characters.map(c => ({ x: c.position.x, y: c.position.y })),
        player2: player2Characters.map(c => ({ x: c.position.x, y: c.position.y })),
      },
      characterData: allCharacters.map(c => ({
        id: c.id,
        playerId: c.playerId,
        playerNumber: c.playerNumber,
        position: c.position,
        color: c.color,
        name: c.name,
        role: c.role,
        stats: c.stats,
        state: c.state,
        isSelected: c.isSelected,
        equipment: c.equipment || [],
        exhausted: c.exhausted || false,
        actions: c.actions || [],
      })),
      // Include game info if available
      gameInfo: gameInfo || {
        turnNumber: 1,
        blueVictoryPoints: 0,
        redVictoryPoints: 0,
      },
    };
    return JSON.stringify(exportData, null, 2);
  };

  const handleImport = () => {
    try {
      const mapData = JSON.parse(importText);
      onImportMap?.(mapData);
      setImportText('');
      setShowImport(false);
    } catch (error) {
      alert('Invalid JSON format. Please check your input.');
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
      <h3 className="text-sm font-bold text-white mb-2">Map Elements</h3>
      <div className="space-y-1">
        {(Object.keys(ITEM_NAMES) as ItemType[]).map((itemType) => {
          const name = ITEM_NAMES[itemType];
          const count = itemCounts[itemType] || 0;
          const canAdd = editorMode && onAddItem;

          return (
            <div
              key={itemType}
              className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
                canAdd
                  ? 'cursor-pointer hover:bg-gray-700 bg-gray-900'
                  : 'bg-gray-900'
              }`}
              onClick={() => canAdd && onAddItem(itemType)}
              title={canAdd ? `Click to add ${name}` : name}
            >
              <svg width="20" height="20" className="flex-shrink-0">
                {renderItemIcon(itemType)}
              </svg>
              <span className="text-gray-300 flex-1">{name}</span>
              {count > 0 && (
                <span className="text-gray-400 text-xs bg-gray-700 px-1.5 py-0.5 rounded">
                  {count}
                </span>
              )}
              {canAdd && <span className="text-purple-400 text-xs">+</span>}
            </div>
          );
        })}
      </div>
      {editorMode && (
        <>
          <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
            Click items to add to map
          </div>
          <button
            onClick={onAddZone}
            className="mt-3 w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors font-semibold"
          >
            + Add Zone
          </button>

          <button
            onClick={() => setShowExport(!showExport)}
            className="mt-3 w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors font-semibold"
          >
            {showExport ? 'Hide Export' : 'Export Map JSON'}
          </button>
          {showExport && (
            <div className="mt-3">
              <textarea
                readOnly
                value={exportMapJSON()}
                className="w-full h-64 p-2 bg-gray-900 border border-gray-600 rounded text-xs text-gray-300 font-mono"
                onClick={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.select();
                }}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(exportMapJSON());
                }}
                className="mt-2 w-full px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
              >
                Copy to Clipboard
              </button>
            </div>
          )}

          <button
            onClick={() => setShowImport(!showImport)}
            className="mt-3 w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors font-semibold"
          >
            {showImport ? 'Hide Import' : 'Import Map JSON'}
          </button>
          {showImport && (
            <div className="mt-3">
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste map JSON here..."
                className="w-full h-64 p-2 bg-gray-900 border border-gray-600 rounded text-xs text-gray-300 font-mono"
              />
              <button
                onClick={handleImport}
                className="mt-2 w-full px-3 py-1 bg-green-700 hover:bg-green-600 text-white text-xs rounded transition-colors font-semibold"
              >
                Load Map
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MapLegend;
