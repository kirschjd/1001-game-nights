import React from 'react';
import { MapZone as MapZoneType, Position, GridType } from '../types';
import { inchesToPixels } from '../data/mapConstants';
import {
  axialToPixel,
  getHexPoints,
  getHexesInRadius,
  getHexMapCenterOffset,
  isWithinHexBounds,
  HEX_SIZE_INCHES,
} from '../data/hexGridUtils';
import { SCALE } from '../data/gridUtils';

interface MapZoneProps {
  zone: MapZoneType;
  isSelected?: boolean;
  editorMode?: boolean;
  onClick?: (zone: MapZoneType) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onResizeHandleMouseDown?: (e: React.MouseEvent, handle: 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w') => void;
  isDragging?: boolean;
  /** Function to convert grid position to pixel coordinates */
  positionToPixels?: (position: Position) => { x: number; y: number };
  /** Grid type - affects positioning calculations */
  gridType?: GridType;
}

const MapZone: React.FC<MapZoneProps> = ({
  zone,
  isSelected,
  editorMode,
  onClick,
  onMouseDown,
  onResizeHandleMouseDown,
  isDragging,
  positionToPixels,
  gridType = 'square',
}) => {
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

  // Render for hex grids
  if (gridType === 'hex') {
    const centerOffset = getHexMapCenterOffset();
    const hexSizePixels = HEX_SIZE_INCHES * SCALE;

    // Get hex cells: use explicit hexCells if provided, otherwise compute from position and width
    let hexCells: Array<{ q: number; r: number }>;
    if (zone.hexCells && zone.hexCells.length > 0) {
      hexCells = zone.hexCells.map(p => ({ q: p.x, r: p.y }));
    } else {
      // Use width as radius (in hex cells) for backward compatibility
      const radius = Math.max(0, Math.floor(zone.width / 2));
      hexCells = getHexesInRadius(
        Math.round(zone.position.x),
        Math.round(zone.position.y),
        radius
      ).filter(h => isWithinHexBounds(h.q, h.r));
    }

    // Calculate center position for label
    const centerPixel = axialToPixel(zone.position.x, zone.position.y);
    const labelX = centerPixel.x * SCALE + centerOffset.x;
    const labelY = centerPixel.y * SCALE + centerOffset.y;

    return (
      <g
        className={editorMode ? 'cursor-move' : ''}
        opacity={isDragging ? 0.5 : 1}
      >
        {/* Render all hex cells */}
        {hexCells.map((hex, index) => {
          const pixel = axialToPixel(hex.q, hex.r);
          const pixelX = pixel.x * SCALE + centerOffset.x;
          const pixelY = pixel.y * SCALE + centerOffset.y;

          return (
            <polygon
              key={`${zone.id}-hex-${index}`}
              points={getHexPoints(pixelX, pixelY, hexSizePixels)}
              fill={zone.color}
              stroke={isSelected ? '#3b82f6' : 'rgba(255,255,255,0.2)'}
              strokeWidth={isSelected ? 2 : 0.5}
              onClick={handleClick}
              onMouseDown={handleMouseDown}
              className={editorMode ? 'cursor-move' : ''}
            />
          );
        })}

        {/* Zone label at center */}
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fff"
          fontSize={Math.min(hexSizePixels * 1.5, 20)}
          fontWeight="bold"
          pointerEvents="none"
          style={{ userSelect: 'none', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
        >
          {zone.label}
        </text>

        {/* Selection indicator - ring around center hex */}
        {isSelected && editorMode && (
          <circle
            cx={labelX}
            cy={labelY}
            r={hexSizePixels * (Math.floor(zone.width / 2) + 1.5)}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="5,5"
            pointerEvents="none"
          />
        )}
      </g>
    );
  }

  // Square grid rendering (original code)
  const width = inchesToPixels(zone.width);
  const height = inchesToPixels(zone.height);

  // Square grid: position is the top-left corner in inches
  const rectX = inchesToPixels(zone.position.x);
  const rectY = inchesToPixels(zone.position.y);
  const centerX = rectX + width / 2;
  const centerY = rectY + height / 2;

  // Render resize handles for selected zone in editor mode
  const renderResizeHandles = () => {
    if (!isSelected || !editorMode) return null;

    const handleSize = 8;
    const handles: Array<{ x: number; y: number; type: 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w' }> = [
      // Corners
      { x: rectX, y: rectY, type: 'nw' },
      { x: rectX + width, y: rectY, type: 'ne' },
      { x: rectX + width, y: rectY + height, type: 'se' },
      { x: rectX, y: rectY + height, type: 'sw' },
      // Edges
      { x: centerX, y: rectY, type: 'n' },
      { x: rectX + width, y: centerY, type: 'e' },
      { x: centerX, y: rectY + height, type: 's' },
      { x: rectX, y: centerY, type: 'w' },
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
        x={rectX}
        y={rectY}
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
        x={centerX}
        y={centerY}
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
