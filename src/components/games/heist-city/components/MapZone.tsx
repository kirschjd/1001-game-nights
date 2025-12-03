import React from 'react';
import { MapZone as MapZoneType } from '../types';
import { inchesToPixels } from '../data/mapConstants';

interface MapZoneProps {
  zone: MapZoneType;
  isSelected?: boolean;
  editorMode?: boolean;
  onClick?: (zone: MapZoneType) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onResizeHandleMouseDown?: (e: React.MouseEvent, handle: 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w') => void;
  isDragging?: boolean;
}

const MapZone: React.FC<MapZoneProps> = ({
  zone,
  isSelected,
  editorMode,
  onClick,
  onMouseDown,
  onResizeHandleMouseDown,
  isDragging,
}) => {
  // Convert position and size to pixels
  const x = inchesToPixels(zone.position.x);
  const y = inchesToPixels(zone.position.y);
  const width = inchesToPixels(zone.width);
  const height = inchesToPixels(zone.height);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(zone);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMouseDown?.(e);
  };

  const handleResizeMouseDown = (e: React.MouseEvent, handle: 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w') => {
    e.stopPropagation();
    onResizeHandleMouseDown?.(e, handle);
  };

  // Render resize handles for selected zone in editor mode
  const renderResizeHandles = () => {
    if (!isSelected || !editorMode) return null;

    const handleSize = 8;
    const handles: Array<{ x: number; y: number; type: 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w' }> = [
      // Corners
      { x: x, y: y, type: 'nw' },
      { x: x + width, y: y, type: 'ne' },
      { x: x + width, y: y + height, type: 'se' },
      { x: x, y: y + height, type: 'sw' },
      // Edges
      { x: x + width / 2, y: y, type: 'n' },
      { x: x + width, y: y + height / 2, type: 'e' },
      { x: x + width / 2, y: y + height, type: 's' },
      { x: x, y: y + height / 2, type: 'w' },
    ];

    return handles.map((handle) => (
      <rect
        key={handle.type}
        x={handle.x - handleSize / 2}
        y={handle.y - handleSize / 2}
        width={handleSize}
        height={handleSize}
        fill="#fff"
        stroke="#3b82f6"
        strokeWidth={2}
        className="cursor-pointer hover:fill-blue-200"
        onMouseDown={(e) => handleResizeMouseDown(e, handle.type)}
      />
    ));
  };

  return (
    <g
      className={editorMode ? 'cursor-move' : ''}
      opacity={isDragging ? 0.5 : 1}
    >
      {/* Zone rectangle */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={zone.color}
        stroke={isSelected ? '#3b82f6' : 'none'}
        strokeWidth={isSelected ? 2 : 0}
        strokeDasharray={isSelected ? '5,5' : 'none'}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        className={editorMode ? 'cursor-move' : ''}
      />

      {/* Zone label */}
      <text
        x={x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontSize={Math.min(width / zone.label.length * 2, 24)}
        fontWeight="bold"
        pointerEvents="none"
        style={{ userSelect: 'none' }}
      >
        {zone.label}
      </text>

      {/* Resize handles */}
      {renderResizeHandles()}
    </g>
  );
};

export default MapZone;
