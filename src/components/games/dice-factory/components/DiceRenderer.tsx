// 1001 Game Nights - Dice Renderer Component
// Version: 2.0.0 - Moved to dice-factory directory
// Updated: December 2024

import React from 'react';

// Re-export Die interface from types (avoiding duplication)
export type { Die } from '../types/DiceFactoryTypes';

export interface DiceRendererProps {
  die: import('../types/DiceFactoryTypes').Die;
  size?: 'sm' | 'md' | 'lg';
  glowing?: boolean;
  dimmed?: boolean;
  isSelected?: boolean;
  isExhausted?: boolean;
  canSelect?: boolean;
  highlighted?: boolean;
  onClick?: () => void;
}

const DiceRenderer: React.FC<DiceRendererProps> = ({
  die,
  size = 'md',
  glowing = false,
  dimmed = false,
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
  
  // Size configurations
  const sizeConfig = {
    sm: { container: 'w-12 h-12', svg: 42, text: 'text-sm' },
    md: { container: 'w-16 h-16', svg: 56, text: 'text-lg' },
    lg: { container: 'w-20 h-20', svg: 70, text: 'text-xl' }
  };

  const config = sizeConfig[size];
  
  const baseClasses = `
    relative ${config.container} flex items-center justify-center font-bold ${config.text}
    transition-all duration-200 select-none
    ${dimmed || isExhausted ? 'opacity-40 grayscale' : ''}
    ${isSelected || glowing ? `ring-4 ring-uranian-blue` : ''}
    ${highlighted && !isExhausted ? 'ring-2 ring-yellow-400' : ''}
    ${canSelect ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : 'cursor-default'}
    ${!canSelect && !isExhausted ? 'opacity-75' : ''}
  `;

  const handleClick = () => {
    if (canSelect && onClick) {
      onClick();
    }
  };

  const renderSVGShape = () => {
    const svgSize = config.svg;
    const strokeWidth = 2;

    switch (die.sides) {
      case 4: // Tetrahedron (triangle)
        return (
          <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
            <polygon
              points={`${svgSize/2},${svgSize*0.15} ${svgSize*0.15},${svgSize*0.85} ${svgSize*0.85},${svgSize*0.85}`}
              fill={colors.fill}
              stroke={colors.stroke}
              strokeWidth={strokeWidth}
            />
          </svg>
        );

      case 6: // Cube (square)
        return (
          <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
            <rect
              x={svgSize * 0.1}
              y={svgSize * 0.1}
              width={svgSize * 0.8}
              height={svgSize * 0.8}
              rx="4"
              fill={colors.fill}
              stroke={colors.stroke}
              strokeWidth={strokeWidth}
            />
          </svg>
        );

      case 8: // Octahedron (diamond/hexagon)
        return (
          <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
            <polygon
              points={`${svgSize/2},${svgSize*0.1} ${svgSize*0.8},${svgSize*0.3} ${svgSize*0.8},${svgSize*0.7} ${svgSize/2},${svgSize*0.9} ${svgSize*0.2},${svgSize*0.7} ${svgSize*0.2},${svgSize*0.3}`}
              fill={colors.fill}
              stroke={colors.stroke}
              strokeWidth={strokeWidth}
            />
            {/* Inner diamond */}
            <polygon
              points={`${svgSize/2},${svgSize*0.25} ${svgSize*0.65},${svgSize*0.4} ${svgSize/2},${svgSize*0.75} ${svgSize*0.35},${svgSize*0.4}`}
              fill="none"
              stroke={colors.stroke}
              strokeWidth={strokeWidth}
            />
          </svg>
        );

      case 10: // Pentagonal trapezohedron (kite shape)
        return (
          <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
            <polygon
              points={`${svgSize/2},${svgSize*0.05} ${svgSize*0.75},${svgSize*0.35} ${svgSize*0.9},${svgSize*0.65} ${svgSize/2},${svgSize*0.95} ${svgSize*0.1},${svgSize*0.65} ${svgSize*0.25},${svgSize*0.35}`}
              fill={colors.fill}
              stroke={colors.stroke}
              strokeWidth={strokeWidth}
            />
            {/* Inner kite face */}
            <polygon
              points={`${svgSize/2},${svgSize*0.25} ${svgSize*0.65},${svgSize*0.45} ${svgSize/2},${svgSize*0.75} ${svgSize*0.35},${svgSize*0.45}`}
              fill="none"
              stroke={colors.stroke}
              strokeWidth={strokeWidth}
            />
          </svg>
        );

      case 12: // Dodecahedron (pentagon with connecting lines)
        return (
          <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
            {/* Outer dodecagon approximation */}
            <polygon
              points={`${svgSize/2},${svgSize*0.05} ${svgSize*0.75},${svgSize*0.15} ${svgSize*0.9},${svgSize*0.35} ${svgSize*0.9},${svgSize*0.65} ${svgSize*0.75},${svgSize*0.85} ${svgSize/2},${svgSize*0.95} ${svgSize*0.25},${svgSize*0.85} ${svgSize*0.1},${svgSize*0.65} ${svgSize*0.1},${svgSize*0.35} ${svgSize*0.25},${svgSize*0.15}`}
              fill={colors.fill}
              stroke={colors.stroke}
              strokeWidth={strokeWidth}
            />
            {/* Central pentagon */}
            <polygon
              points={`${svgSize/2},${svgSize*0.25} ${svgSize*0.7},${svgSize*0.4} ${svgSize*0.6},${svgSize*0.7} ${svgSize*0.4},${svgSize*0.7} ${svgSize*0.3},${svgSize*0.4}`}
              fill="none"
              stroke={colors.stroke}
              strokeWidth={strokeWidth}
            />
            {/* Connecting lines to pentagon */}
            <line x1={svgSize/2} y1={svgSize*0.25} x2={svgSize/2} y2={svgSize*0.05} stroke={colors.stroke} strokeWidth={strokeWidth} />
            <line x1={svgSize*0.7} y1={svgSize*0.4} x2={svgSize*0.9} y2={svgSize*0.35} stroke={colors.stroke} strokeWidth={strokeWidth} />
            <line x1={svgSize*0.6} y1={svgSize*0.7} x2={svgSize*0.75} y2={svgSize*0.85} stroke={colors.stroke} strokeWidth={strokeWidth} />
            <line x1={svgSize*0.4} y1={svgSize*0.7} x2={svgSize*0.25} y2={svgSize*0.85} stroke={colors.stroke} strokeWidth={strokeWidth} />
            <line x1={svgSize*0.3} y1={svgSize*0.4} x2={svgSize*0.1} y2={svgSize*0.35} stroke={colors.stroke} strokeWidth={strokeWidth} />
          </svg>
        );

      default:
        // Fallback to cube
        return (
          <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
            <rect
              x={svgSize * 0.1}
              y={svgSize * 0.1}
              width={svgSize * 0.8}
              height={svgSize * 0.8}
              rx="4"
              fill={colors.fill}
              stroke={colors.stroke}
              strokeWidth={strokeWidth}
            />
          </svg>
        );
    }
  };

  const renderDiceContent = () => {
    // Adjust positioning based on die type for main face centering
    let valuePositioning = "absolute inset-0 flex items-center justify-center z-10";
    
    if (die.sides === 4) {
      // 15% higher for tetrahedron
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
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 font-semibold">
          d{die.sides}
        </div>
        
        {/* Value in center of main face */}
        <div className={valuePositioning}>
          <div className={`${config.text} font-bold text-gray-900`}>
            {die.value || '?'}
          </div>
        </div>
        
        {/* Special indicators */}
        {die.shiny && <div className="absolute top-1 right-1 text-xs">✨</div>}
        {die.rainbow && <div className="absolute top-1 left-1 text-xs">🌈</div>}
        {isExhausted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded">
            <span className="text-red-400 font-bold text-xs">USED</span>
          </div>
        )}
      </>
    );
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