import React from 'react';
import { MapItem as MapItemType, Position, GridType } from '../types';
import { inchesToPixels, ITEM_STYLES, GRID_CENTER_OFFSET } from '../data/mapConstants';

interface MapItemProps {
  item: MapItemType;
  onClick?: (item: MapItemType) => void;
  onDoubleClick?: (item: MapItemType) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  isSelected?: boolean;
  isDragging?: boolean;
  /** Function to convert grid position to pixel coordinates */
  positionToPixels?: (position: Position) => { x: number; y: number };
  /** Grid type - affects positioning calculations */
  gridType?: GridType;
}

const MapItem: React.FC<MapItemProps> = ({
  item,
  onClick,
  onDoubleClick,
  onMouseDown,
  isSelected,
  isDragging,
  positionToPixels,
  gridType = 'square'
}) => {
  const style = ITEM_STYLES[item.type];

  // Calculate pixel position based on grid type
  let x: number, y: number;
  if (positionToPixels && gridType === 'hex') {
    // Hex grid: use provided converter (axial coords -> pixels, centered on hex)
    const pixels = positionToPixels(item.position);
    x = pixels.x;
    y = pixels.y;
  } else {
    // Square grid: position is in inches, add offset to center in cell
    x = inchesToPixels(item.position.x + GRID_CENTER_OFFSET);
    y = inchesToPixels(item.position.y + GRID_CENTER_OFFSET);
  }

  const size = inchesToPixels(style.size);
  const rotation = item.rotation || 0;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(item);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick?.(item);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMouseDown?.(e);
  };

  // Render different shapes based on item type
  const renderItem = () => {
    switch (item.type) {
      case 'wall':
        return (
          <rect
            x={x - size / 2}
            y={y - size / 2}
            width={size}
            height={size}
            fill={style.color}
            stroke={isSelected ? '#fff' : 'none'}
            strokeWidth={isSelected ? 2 : 0}
          />
        );

      case 'table':
        return (
          <rect
            x={x - size / 2}
            y={y - size / 2}
            width={size}
            height={size}
            fill={style.color}
            stroke={isSelected ? '#fff' : 'none'}
            strokeWidth={isSelected ? 2 : 0}
          />
        );

      case 'computer':
        return (
          <g>
            <rect
              x={x - size / 2}
              y={y - size / 2}
              width={size}
              height={size}
              fill="none"
              stroke={style.color}
              strokeWidth={3}
            />
            <rect
              x={x - size / 4}
              y={y - size / 4}
              width={size / 2}
              height={size / 2}
              fill={style.color}
              stroke={isSelected ? '#fff' : 'none'}
              strokeWidth={isSelected ? 2 : 0}
            />
          </g>
        );

      case 'gear':
        return (
          <circle
            cx={x}
            cy={y}
            r={size / 2}
            fill={style.color}
            stroke={isSelected ? '#fff' : '#000'}
            strokeWidth={isSelected ? 2 : 1}
          />
        );

      case 'teleporter':
        return (
          <g>
            <rect
              x={x - size / 2}
              y={y - size / 2}
              width={size}
              height={size}
              fill="none"
              stroke={style.color}
              strokeWidth={3}
            />
            <rect
              x={x - size / 4}
              y={y - size / 4}
              width={size / 2}
              height={size / 2}
              fill={style.color}
              stroke={isSelected ? '#fff' : 'none'}
              strokeWidth={isSelected ? 2 : 0}
            />
          </g>
        );

      case 'info-drop':
        return (
          <g>
            {/* Horizontal bar of cross */}
            <rect
              x={x - size / 2}
              y={y - size / 8}
              width={size}
              height={size / 4}
              fill={style.color}
              stroke={isSelected ? '#fff' : '#000'}
              strokeWidth={isSelected ? 2 : 1}
            />
            {/* Vertical bar of cross */}
            <rect
              x={x - size / 8}
              y={y - size / 2}
              width={size / 4}
              height={size}
              fill={style.color}
              stroke={isSelected ? '#fff' : '#000'}
              strokeWidth={isSelected ? 2 : 1}
            />
          </g>
        );

      case 'enemy-camera':
        return (
          <g>
            {/* Horizontal bar of cross */}
            <rect
              x={x - size / 2}
              y={y - size / 8}
              width={size}
              height={size / 4}
              fill={style.color}
              stroke={isSelected ? '#fff' : '#000'}
              strokeWidth={isSelected ? 2 : 1}
            />
            {/* Vertical bar of cross */}
            <rect
              x={x - size / 8}
              y={y - size / 2}
              width={size / 4}
              height={size}
              fill={style.color}
              stroke={isSelected ? '#fff' : '#000'}
              strokeWidth={isSelected ? 2 : 1}
            />
          </g>
        );

      case 'enemy-rapid-response':
        return (
          <polygon
            points={`${x},${y - size / 2} ${x + size / 2},${y} ${x},${y + size / 2} ${x - size / 2},${y}`}
            fill={style.color}
            stroke={isSelected ? '#fff' : '#000'}
            strokeWidth={isSelected ? 2 : 1}
          />
        );

      case 'enemy-security-guard':
        return (
          <circle
            cx={x}
            cy={y}
            r={size / 2}
            fill={style.color}
            stroke={isSelected ? '#fff' : '#000'}
            strokeWidth={isSelected ? 2 : 1}
          />
        );

      default:
        return (
          <circle
            cx={x}
            cy={y}
            r={size / 2}
            fill="#999"
            stroke={isSelected ? '#fff' : '#000'}
            strokeWidth={isSelected ? 2 : 1}
          />
        );
    }
  };

  return (
    <g
      transform={`rotate(${rotation}, ${x}, ${y})`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      className={`cursor-pointer hover:opacity-80 ${isDragging ? 'no-transition' : 'transition-opacity'}`}
      opacity={isDragging ? 0.5 : 1}
    >
      {renderItem()}
    </g>
  );
};

export default MapItem;
