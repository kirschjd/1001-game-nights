import React from 'react';

export interface Die {
  id: string;
  sides: number;
  value: number | null;
  shiny: boolean;
  rainbow: boolean;
}

export interface DiceRendererProps {
  die: Die;
  isSelected?: boolean;
  isExhausted?: boolean;
  canSelect?: boolean;
  highlighted?: boolean;
  onClick?: () => void;
}

const DiceRenderer: React.FC<DiceRendererProps> = ({
  die,
  isSelected = false,
  isExhausted = false,
  canSelect = false,
  highlighted = false,
  onClick
}) => {
  // Get dice color based on sides
  const getDiceColors = (sides: number) => {
    const colorMap: Record<number, { fill: string; stroke: string }> = {
      4: { fill: '#ef4444', stroke: '#b91c1c' }, // red
      6: { fill: '#14b8a6', stroke: '#0f766e' }, // teal
      8: { fill: '#3b82f6', stroke: '#1d4ed8' }, // blue
      10: { fill: '#22c55e', stroke: '#15803d' }, // green
      12: { fill: '#eab308', stroke: '#a16207' } // yellow
    };
    return colorMap[sides] || colorMap[6];
  };

  const colors = getDiceColors(die.sides);
  
  const baseClasses = `
    relative w-16 h-16 flex items-center justify-center font-bold text-lg
    transition-all duration-200 select-none
    ${isExhausted ? 'opacity-40 grayscale' : ''}
    ${isSelected ? `ring-4 ring-uranian-blue` : ''}
    ${highlighted && !isExhausted ? 'ring-2 ring-yellow-400' : ''}
    ${canSelect ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : 'cursor-default'}
    ${!canSelect && !isExhausted ? 'opacity-75' : ''}
  `;

  const renderDiceContent = () => {
    // Adjust positioning based on die type for main face centering
    let valuePositioning = "absolute inset-0 flex items-center justify-center z-10";
    
    if (die.sides === 4) {
      // 15% higher
      valuePositioning = "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-2 z-10 flex items-center justify-center";
    } else if (die.sides === 10) {
      // 10% higher - center on the kite-shaped face
      valuePositioning = "absolute top-3 left-1/2 transform -translate-x-1/2 z-10 flex items-center justify-center w-8 h-8";
    } else if (die.sides === 12) {
      // 15% higher - center on the inner pentagon
      valuePositioning = "absolute top-4 left-1/2 transform -translate-x-1/2 z-10 flex items-center justify-center w-8 h-8";
    }
    
    return (
      <>
        {/* Die type above the shape */}
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-xs text-gray-800 font-semibold">
          d{die.sides}
        </div>
        
        {/* Value in center of main face */}
        <div className={valuePositioning}>
          <div className="text-lg font-bold text-gray-900">{die.value || '?'}</div>
        </div>
        
        {/* Special indicators */}
        {die.shiny && <div className="absolute top-1 right-1 text-xs">✨</div>}
        {die.rainbow && <div className="absolute top-1 left-1 text-xs">🌈</div>}
        {isExhausted && <div className="absolute inset-0 flex items-center justify-center text-red-600 font-bold text-xl">×</div>}
      </>
    );
  };

  const handleClick = () => {
    if (canSelect && onClick) {
      onClick();
    }
  };

  const renderSVGShape = () => {
    const size = 56; // 14 * 4 (w-14 h-14)
    const strokeWidth = 2;

    switch (die.sides) {
      case 4: // Tetrahedron (triangle)
        return (
          <svg width={size} height={size} viewBox="0 0 56 56">
            <polygon
              points="28,8 8,48 48,48"
              fill={colors.fill}
              stroke={colors.stroke}
              strokeWidth={strokeWidth}
            />
          </svg>
        );

      case 6: // Cube (square)
        return (
          <svg width={size} height={size} viewBox="0 0 56 56">
            <rect
              x="4"
              y="4"
              width="48"
              height="48"
              rx="4"
              fill={colors.fill}
              stroke={colors.stroke}
              strokeWidth={strokeWidth}
            />
          </svg>
        );

      case 8: // Octahedron viewed from angle showing triangular faces
        return (
          <svg width={size} height={size} viewBox="0 0 56 56">
            {/* Outer hexagonal shape */}
            <polygon
              points="28,4 46,16 46,40 28,52 10,40 10,16"
              fill={colors.fill}
              stroke={colors.stroke}
              strokeWidth={strokeWidth}
            />
            {/* Central upside-down triangle and surrounding triangles */}
            <line x1="10" y1="16" x2="46" y2="16" stroke={colors.stroke} strokeWidth={strokeWidth} />
            <line x1="10" y1="16" x2="28" y2="52" stroke={colors.stroke} strokeWidth={strokeWidth} />
            <line x1="46" y1="16" x2="28" y2="52" stroke={colors.stroke} strokeWidth={strokeWidth} />
          </svg>
        );

      case 10: // Pentagonal bipyramid (d10) - outer shape with kite
        return (
          <svg width={size} height={size} viewBox="0 0 56 56">
            {/* Outer shape: diamond with small vertical sections on left and right */}
            <polygon
              points="28,4 49,24 49,32 28,52 7,32 7,24"
              fill={colors.fill}
              stroke={colors.stroke}
              strokeWidth={strokeWidth}
            />
            {/* Inner kite shape */}
            <polygon
              points="28,4 41,30 28,37 15,30"
              fill="none"
              stroke={colors.stroke}
              strokeWidth={strokeWidth}
            />
            {/* Three connecting line segments */}
            <line x1="7" y1="32" x2="15" y2="30" stroke={colors.stroke} strokeWidth={strokeWidth} />
            <line x1="49" y1="32" x2="41" y2="30" stroke={colors.stroke} strokeWidth={strokeWidth} />
            <line x1="28" y1="37" x2="28" y2="52" stroke={colors.stroke} strokeWidth={strokeWidth} />
          </svg>
        );

      case 12: // Dodecahedron - central pentagon with 5 outer pentagons
        return (
          <svg width={size} height={size} viewBox="0 0 56 56">
            {/* Outer 10-sided shape */}
            <polygon
              points="28,2 42,8 50,20 50,36 42,48 28,52 14,48 6,36 6,20 14,8"
              fill={colors.fill}
              stroke={colors.stroke}
              strokeWidth={strokeWidth}
            />
            {/* Central pentagon - moved down more */}
            <polygon
              points="28,12 43,24 38,41 18,41 13,24"
              fill="none"
              stroke={colors.stroke}
              strokeWidth={strokeWidth}
            />
            {/* Five specific connecting lines */}
            <line x1="28" y1="12" x2="28" y2="2" stroke={colors.stroke} strokeWidth={strokeWidth} />
            <line x1="43" y1="24" x2="50" y2="20" stroke={colors.stroke} strokeWidth={strokeWidth} />
            <line x1="38" y1="41" x2="42" y2="48" stroke={colors.stroke} strokeWidth={strokeWidth} />
            <line x1="18" y1="41" x2="14" y2="48" stroke={colors.stroke} strokeWidth={strokeWidth} />
            <line x1="13" y1="24" x2="6" y2="20" stroke={colors.stroke} strokeWidth={strokeWidth} />
          </svg>
        );

      default:
        // Fallback to cube
        return (
          <svg width={size} height={size} viewBox="0 0 56 56">
            <rect
              x="4"
              y="4"
              width="48"
              height="48"
              rx="4"
              fill={colors.fill}
              stroke={colors.stroke}
              strokeWidth={strokeWidth}
            />
          </svg>
        );
    }
  };

  return (
    <div
      key={die.id}
      onClick={handleClick}
      className={baseClasses}
    >
      {renderSVGShape()}
      {renderDiceContent()}
    </div>
  );
};

export default DiceRenderer;