import React from 'react';
import { MapItem as MapItemType } from '../types';
import { inchesToPixels, ITEM_STYLES, GRID_CENTER_OFFSET } from '../data/mapConstants';

interface MapItemProps {
  item: MapItemType;
  onClick?: (item: MapItemType) => void;
  isSelected?: boolean;
}

const MapItem: React.FC<MapItemProps> = ({ item, onClick, isSelected }) => {
  const style = ITEM_STYLES[item.type];
  // Center items in grid squares by adding offset
  const x = inchesToPixels(item.position.x + GRID_CENTER_OFFSET);
  const y = inchesToPixels(item.position.y + GRID_CENTER_OFFSET);
  const size = inchesToPixels(style.size);
  const rotation = item.rotation || 0;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(item);
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
            rx={4}
          />
        );

      case 'computer':
        return (
          <g>
            <rect
              x={x - size / 2}
              y={y - size / 2}
              width={size}
              height={size * 0.7}
              fill={style.color}
              stroke={isSelected ? '#fff' : '#000'}
              strokeWidth={isSelected ? 2 : 1}
              rx={2}
            />
            <rect
              x={x - size / 3}
              y={y}
              width={size * 0.66}
              height={size * 0.2}
              fill="#4b5563"
              stroke="#000"
              strokeWidth={1}
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
            <circle
              cx={x}
              cy={y}
              r={size / 2}
              fill="none"
              stroke={style.color}
              strokeWidth={3}
            />
            <circle
              cx={x}
              cy={y}
              r={size / 4}
              fill={style.color}
              stroke={isSelected ? '#fff' : 'none'}
              strokeWidth={isSelected ? 2 : 0}
            />
          </g>
        );

      case 'info-drop':
        return (
          <g>
            <polygon
              points={`${x},${y - size / 2} ${x + size / 2},${y + size / 2} ${x - size / 2},${y + size / 2}`}
              fill={style.color}
              stroke={isSelected ? '#fff' : '#000'}
              strokeWidth={isSelected ? 2 : 1}
            />
            <text
              x={x}
              y={y + size / 6}
              textAnchor="middle"
              fill="#000"
              fontSize="10"
              fontWeight="bold"
            >
              i
            </text>
          </g>
        );

      case 'enemy-camera':
        return (
          <g>
            <circle
              cx={x}
              cy={y}
              r={size / 2}
              fill={style.color}
              stroke={isSelected ? '#fff' : '#000'}
              strokeWidth={isSelected ? 2 : 1}
            />
            <path
              d={`M ${x} ${y} L ${x - size / 3} ${y - size} L ${x + size / 3} ${y - size} Z`}
              fill={style.color}
              fillOpacity={0.3}
              stroke={style.color}
              strokeWidth={1}
            />
          </g>
        );

      case 'enemy-rapid-response':
        return (
          <g>
            <rect
              x={x - size / 2}
              y={y - size / 2}
              width={size}
              height={size}
              fill={style.color}
              stroke={isSelected ? '#fff' : '#000'}
              strokeWidth={isSelected ? 2 : 1}
            />
            <text
              x={x}
              y={y + size / 6}
              textAnchor="middle"
              fill="#fff"
              fontSize="12"
              fontWeight="bold"
            >
              RR
            </text>
          </g>
        );

      case 'enemy-security-guard':
        return (
          <g>
            <circle
              cx={x}
              cy={y - size / 4}
              r={size / 4}
              fill={style.color}
              stroke={isSelected ? '#fff' : '#000'}
              strokeWidth={isSelected ? 2 : 1}
            />
            <rect
              x={x - size / 3}
              y={y}
              width={size * 0.66}
              height={size / 2}
              fill={style.color}
              stroke={isSelected ? '#fff' : '#000'}
              strokeWidth={isSelected ? 2 : 1}
            />
          </g>
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
      className="cursor-pointer hover:opacity-80 transition-opacity"
    >
      {renderItem()}
    </g>
  );
};

export default MapItem;
