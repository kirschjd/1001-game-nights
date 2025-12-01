import React from 'react';

interface MapSettingsProps {
  showGrid: boolean;
  showCoordinates: boolean;
  showItems: boolean;
  snapToGrid: boolean;
  onToggleGrid: () => void;
  onToggleCoordinates: () => void;
  onToggleItems: () => void;
  onToggleSnapToGrid: () => void;
}

const MapSettings: React.FC<MapSettingsProps> = ({
  showGrid,
  showCoordinates,
  showItems,
  snapToGrid,
  onToggleGrid,
  onToggleCoordinates,
  onToggleItems,
  onToggleSnapToGrid,
}) => {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
      <h3 className="text-white font-bold mb-3">Map Settings</h3>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-gray-300 cursor-pointer hover:text-white">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={onToggleGrid}
            className="w-4 h-4"
          />
          <span>Show Grid Lines</span>
        </label>
        <label className="flex items-center gap-2 text-gray-300 cursor-pointer hover:text-white">
          <input
            type="checkbox"
            checked={showCoordinates}
            onChange={onToggleCoordinates}
            className="w-4 h-4"
          />
          <span>Show Coordinates</span>
        </label>
        <label className="flex items-center gap-2 text-gray-300 cursor-pointer hover:text-white">
          <input
            type="checkbox"
            checked={showItems}
            onChange={onToggleItems}
            className="w-4 h-4"
          />
          <span>Show Map Items</span>
        </label>
        <label className="flex items-center gap-2 text-gray-300 cursor-pointer hover:text-white">
          <input
            type="checkbox"
            checked={snapToGrid}
            onChange={onToggleSnapToGrid}
            className="w-4 h-4"
          />
          <span>Snap to Grid</span>
        </label>
      </div>
    </div>
  );
};

export default MapSettings;
