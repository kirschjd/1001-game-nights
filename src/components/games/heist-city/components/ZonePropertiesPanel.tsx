import React, { useState, useEffect } from 'react';
import { MapZone, GridType } from '../types';

interface ZonePropertiesPanelProps {
  zone: MapZone;
  onUpdate: (zone: MapZone) => void;
  onClose: () => void;
  gridType?: GridType;
}

const ZonePropertiesPanel: React.FC<ZonePropertiesPanelProps> = ({ zone, onUpdate, onClose, gridType = 'square' }) => {
  const [label, setLabel] = useState(zone.label);
  const [color, setColor] = useState(zone.color);
  const [opacity, setOpacity] = useState(0.3);

  // Extract opacity from RGBA color
  useEffect(() => {
    const rgbaMatch = zone.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
    if (rgbaMatch && rgbaMatch[4]) {
      setOpacity(parseFloat(rgbaMatch[4]));
    }
  }, [zone.color]);

  // Convert hex color to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 147, g: 51, b: 234 }; // Default purple
  };

  // Handle color change
  const handleColorChange = (hexColor: string) => {
    setColor(hexColor);
    const rgb = hexToRgb(hexColor);
    const rgbaColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    onUpdate({ ...zone, color: rgbaColor });
  };

  // Handle opacity change
  const handleOpacityChange = (newOpacity: number) => {
    setOpacity(newOpacity);
    const rgb = hexToRgb(color);
    const rgbaColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${newOpacity})`;
    onUpdate({ ...zone, color: rgbaColor });
  };

  // Handle label change
  const handleLabelChange = (newLabel: string) => {
    setLabel(newLabel);
    onUpdate({ ...zone, label: newLabel });
  };

  // Get hex color from RGBA
  const getHexFromRgba = (rgba: string): string => {
    const rgbaMatch = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbaMatch) {
      const r = parseInt(rgbaMatch[1]);
      const g = parseInt(rgbaMatch[2]);
      const b = parseInt(rgbaMatch[3]);
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
    return '#9333ea'; // Default purple
  };

  return (
    <div className="absolute top-16 right-4 bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-lg z-50 w-64">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold text-sm">Zone Properties</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-lg leading-none"
          title="Close"
        >
          ×
        </button>
      </div>

      {/* Label Input */}
      <div className="mb-3">
        <label className="text-gray-300 text-xs font-medium mb-1 block">Label</label>
        <input
          type="text"
          value={label}
          onChange={(e) => handleLabelChange(e.target.value)}
          className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white text-sm"
          placeholder="Zone label"
        />
      </div>

      {/* Color Picker */}
      <div className="mb-3">
        <label className="text-gray-300 text-xs font-medium mb-1 block">Color</label>
        <input
          type="color"
          value={getHexFromRgba(zone.color)}
          onChange={(e) => handleColorChange(e.target.value)}
          className="w-full h-8 bg-gray-900 border border-gray-600 rounded cursor-pointer"
        />
      </div>

      {/* Opacity Slider */}
      <div className="mb-3">
        <label className="text-gray-300 text-xs font-medium mb-1 block">
          Opacity: {Math.round(opacity * 100)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={opacity}
          onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Size Display / Radius Control */}
      <div className="mb-3">
        <label className="text-gray-300 text-xs font-medium mb-1 block">
          {gridType === 'hex' ? 'Radius (hex cells)' : 'Size'}
        </label>
        {gridType === 'hex' ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newWidth = Math.max(0, zone.width - 2);
                onUpdate({ ...zone, width: newWidth, height: newWidth });
              }}
              className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm"
            >
              −
            </button>
            <span className="text-white text-sm min-w-[40px] text-center">
              {Math.floor(zone.width / 2)}
            </span>
            <button
              onClick={() => {
                const newWidth = Math.min(20, zone.width + 2);
                onUpdate({ ...zone, width: newWidth, height: newWidth });
              }}
              className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm"
            >
              +
            </button>
          </div>
        ) : (
          <div className="text-gray-400 text-xs">
            {zone.width} × {zone.height} squares
          </div>
        )}
      </div>

      {/* Position Display */}
      <div>
        <label className="text-gray-300 text-xs font-medium mb-1 block">
          {gridType === 'hex' ? 'Center (q, r)' : 'Position'}
        </label>
        <div className="text-gray-400 text-xs">
          ({zone.position.x.toFixed(0)}, {zone.position.y.toFixed(0)})
        </div>
      </div>
    </div>
  );
};

export default ZonePropertiesPanel;
