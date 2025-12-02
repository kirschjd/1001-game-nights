import React from 'react';
import { CharacterToken as CharacterTokenType } from '../types';
import { inchesToPixels, TOKEN_RADIUS, GRID_CENTER_OFFSET } from '../data/mapConstants';

interface CharacterTokenProps {
  token: CharacterTokenType;
  onMouseDown?: (token: CharacterTokenType, e: React.MouseEvent) => void;
  onClick?: (token: CharacterTokenType) => void;
  isDragging?: boolean;
}

const CharacterToken: React.FC<CharacterTokenProps> = ({
  token,
  onMouseDown,
  onClick,
  isDragging,
}) => {
  // Center tokens in grid squares by adding offset
  const x = inchesToPixels(token.position.x + GRID_CENTER_OFFSET);
  const y = inchesToPixels(token.position.y + GRID_CENTER_OFFSET);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMouseDown?.(token, e);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(token);
  };

  return (
    <g
      className={`cursor-move ${isDragging ? 'opacity-70 no-transition' : ''}`}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {/* Outer glow for selected state */}
      {token.isSelected && (
        <circle
          cx={x}
          cy={y}
          r={TOKEN_RADIUS + 4}
          fill="none"
          stroke="#fff"
          strokeWidth={2}
          opacity={0.6}
        />
      )}

      {/* Main token circle */}
      <circle
        cx={x}
        cy={y}
        r={TOKEN_RADIUS}
        fill={token.color}
        stroke="#fff"
        strokeWidth={2}
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))' }}
      />

      {/* Token role label (first letter) */}
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fill="#fff"
        fontSize="12"
        fontWeight="bold"
        pointerEvents="none"
        style={{ userSelect: 'none' }}
      >
        {token.role[0]}
      </text>
    </g>
  );
};

export default CharacterToken;
