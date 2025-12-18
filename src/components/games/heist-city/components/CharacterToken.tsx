import React from 'react';
import { CharacterToken as CharacterTokenType, Position, GridType } from '../types';
import { inchesToPixels, TOKEN_RADIUS, GRID_CENTER_OFFSET } from '../data/mapConstants';

interface CharacterTokenProps {
  token: CharacterTokenType;
  onMouseDown?: (token: CharacterTokenType, e: React.MouseEvent) => void;
  isDragging?: boolean;
  selectingPlayers?: Array<1 | 2 | 'observer'>; // Player numbers who have selected this character
  /** Function to convert grid position to pixel coordinates */
  positionToPixels?: (position: Position) => { x: number; y: number };
  /** Grid type - affects positioning calculations */
  gridType?: GridType;
}

const CharacterToken: React.FC<CharacterTokenProps> = ({
  token,
  onMouseDown,
  isDragging,
  selectingPlayers = [],
  positionToPixels,
  gridType = 'square'
}) => {
  // Calculate pixel position based on grid type
  let x: number, y: number;
  if (positionToPixels && gridType === 'hex') {
    // Hex grid: use provided converter (axial coords -> pixels, centered on hex)
    const pixels = positionToPixels(token.position);
    x = pixels.x;
    y = pixels.y;
  } else {
    // Square grid: position is in inches, add offset to center in cell
    x = inchesToPixels(token.position.x + GRID_CENTER_OFFSET);
    y = inchesToPixels(token.position.y + GRID_CENTER_OFFSET);
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMouseDown?.(token, e);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Prevent click from bubbling to SVG (which would clear selection)
    e.stopPropagation();
  };

  // Determine opacity and filter based on status
  const getTokenOpacity = () => {
    if (token.state === 'Unconscious') return 0.3;
    if (token.exhausted) return 0.5;
    return 1;
  };

  const getTokenFilter = () => {
    if (token.state === 'Unconscious') return 'grayscale(1)';
    if (token.exhausted) return 'grayscale(0.7)';
    return 'none';
  };

  // Get focus ring color based on player number
  const getFocusRingColor = (playerNumber: 1 | 2 | 'observer'): string => {
    if (playerNumber === 1) return '#3b82f6'; // blue-500 (Player 1 controls Blue team)
    if (playerNumber === 2) return '#ef4444'; // red-500 (Player 2 controls Red team)
    return '#eab308'; // yellow-500 for observers
  };

  return (
    <g
      className={`cursor-move ${isDragging ? 'opacity-70 no-transition' : ''}`}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      opacity={getTokenOpacity()}
      style={{
        filter: getTokenFilter(),
      }}
    >
      {/* Focus rings for each player who has selected this character */}
      {selectingPlayers.map((playerNumber, index) => (
        <circle
          key={`focus-ring-${playerNumber}-${index}`}
          cx={x}
          cy={y}
          r={TOKEN_RADIUS + 4 + (index * 3)} // Stack rings outward if multiple players select same character
          fill="none"
          stroke={getFocusRingColor(playerNumber)}
          strokeWidth={2}
          opacity={0.8}
        />
      ))}

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
