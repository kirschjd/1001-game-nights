import React, { useState, useRef, useEffect, useMemo } from 'react';
import { getAvailableMaps } from '../data/mapLoader';

export type MapTool = 'select' | 'pan' | 'ruler' | 'editor';

interface MapToolbarProps {
  activeTool: MapTool;
  onToolChange: (tool: MapTool) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFitToWindow: () => void;
  onToggleSettings: () => void;
  showSettings: boolean;
  selectedItemId?: string | null;
  onDeleteItem?: () => void;
  onLoadMap?: (mapId: string) => void;
}

const MapToolbar: React.FC<MapToolbarProps> = ({
  activeTool,
  onToolChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFitToWindow,
  onToggleSettings,
  showSettings,
  selectedItemId,
  onDeleteItem,
  onLoadMap,
}) => {
  const [showMapMenu, setShowMapMenu] = useState(false);
  const mapMenuRef = useRef<HTMLDivElement>(null);

  const tools: { id: MapTool; icon: string; label: string }[] = [
    { id: 'select', icon: '👆', label: 'Select (Move tokens)' },
    { id: 'pan', icon: '✋', label: 'Pan (Drag map)' },
    { id: 'ruler', icon: '📏', label: 'Ruler (Measure distance)' },
    { id: 'editor', icon: '✏️', label: 'Editor (Move/Add map elements)' },
  ];

  // Get available maps from the map loader
  const availableMaps = useMemo(() => getAvailableMaps(), []);

  // Close map menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mapMenuRef.current && !mapMenuRef.current.contains(event.target as Node)) {
        setShowMapMenu(false);
      }
    };

    if (showMapMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMapMenu]);

  const handleLoadMap = (mapId: string) => {
    onLoadMap?.(mapId);
    setShowMapMenu(false);
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Tool Selection */}
        <div className="flex gap-1 border-r border-gray-600 pr-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className={`px-3 py-2 rounded transition-colors ${
                activeTool === tool.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title={tool.label}
            >
              <span className="text-lg">{tool.icon}</span>
            </button>
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 border-r border-gray-600 pr-2">
          <button
            onClick={onZoomOut}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            title="Zoom Out"
          >
            <span className="text-lg">−</span>
          </button>
          <div className="px-3 py-2 bg-gray-900 text-white rounded min-w-[60px] text-center text-sm">
            {Math.round(zoom * 100)}%
          </div>
          <button
            onClick={onZoomIn}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            title="Zoom In"
          >
            <span className="text-lg">+</span>
          </button>
          <button
            onClick={onZoomReset}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm"
            title="Reset Zoom (100%)"
          >
            100%
          </button>
        </div>

        {/* Fit to Window */}
        <button
          onClick={onFitToWindow}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors border-r border-gray-600 pr-2 mr-2"
          title="Fit to Window"
        >
          <span className="text-lg">⛶</span>
        </button>

        {/* Settings */}
        <button
          onClick={onToggleSettings}
          className={`px-3 py-2 rounded transition-colors ${
            showSettings
              ? 'bg-purple-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          title="Settings"
        >
          <span className="text-lg">⚙️</span>
        </button>

        {/* Map Loader */}
        {onLoadMap && (
          <div className="relative" ref={mapMenuRef}>
            <button
              onClick={() => setShowMapMenu(!showMapMenu)}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              title="Load Map"
            >
              <span className="text-lg">🗺️</span>
            </button>
            {showMapMenu && (
              <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 min-w-[180px]">
                <div className="py-1">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Load Map</div>
                  {availableMaps.map((map) => (
                    <button
                      key={map.id}
                      onClick={() => handleLoadMap(map.id)}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
                    >
                      {map.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Delete Button (Editor Mode Only) */}
        {activeTool === 'editor' && selectedItemId && onDeleteItem && (
          <button
            onClick={onDeleteItem}
            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors border-l border-gray-600 ml-2"
            title="Delete selected item (Delete/Backspace)"
          >
            <span className="text-lg">🗑️</span>
          </button>
        )}

        {/* Active Tool Indicator */}
        <div className="ml-auto text-sm text-gray-400">
          {tools.find((t) => t.id === activeTool)?.label}
        </div>
      </div>
    </div>
  );
};

export default MapToolbar;
