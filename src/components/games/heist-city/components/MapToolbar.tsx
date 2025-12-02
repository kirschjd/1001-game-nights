import React from 'react';

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
}) => {
  const tools: { id: MapTool; icon: string; label: string }[] = [
    { id: 'select', icon: '👆', label: 'Select (Move tokens)' },
    { id: 'pan', icon: '✋', label: 'Pan (Drag map)' },
    { id: 'ruler', icon: '📏', label: 'Ruler (Measure distance)' },
    { id: 'editor', icon: '✏️', label: 'Editor (Move/Add map elements)' },
  ];

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
