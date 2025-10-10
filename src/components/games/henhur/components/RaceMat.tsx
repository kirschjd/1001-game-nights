import React, { useRef, useEffect, useState, useCallback } from 'react';

interface SpacePosition {
  x: number;
  y: number;
  track: number;
  section: string;
  space: number;
}

interface TokenPosition {
  track: number;
  section: string;
  space: number;
  x: number;
  y: number;
}

interface PlayerToken {
  id: string;
  color: string;
  name: string;
  position: TokenPosition | null;
}

// Track configuration constants
const TRACKS = [
  { lane: 0, curveSpaces: 7 },  // Inner track
  { lane: 1, curveSpaces: 9 },  // Middle track
  { lane: 2, curveSpaces: 11 }  // Outer track
];

const STRAIGHT_SPACES = 10;
const LANE_WIDTH = 40;
const CENTER_X = 450;
const CENTER_Y = 300;
const STRAIGHT_LENGTH = 400;
const BASE_RADIUS = 100;

const RaceMat: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [spacePositions, setSpacePositions] = useState<SpacePosition[]>([]);
  const [playerTokens, setPlayerTokens] = useState<PlayerToken[]>([
    { id: 'player-1', color: '#ff4444', name: 'Red', position: null },
    { id: 'player-2', color: '#44ff44', name: 'Green', position: null },
    { id: 'player-3', color: '#4444ff', name: 'Blue', position: null },
  ]);
  const [draggedToken, setDraggedToken] = useState<string | null>(null);
  const [clickedSpaces, setClickedSpaces] = useState<Set<string>>(new Set());
  const [nearestSpace, setNearestSpace] = useState<SpacePosition | null>(null);

  // Generate space positions
  useEffect(() => {
    const positions: SpacePosition[] = [];

    TRACKS.forEach((track, trackIndex) => {
      const radius = BASE_RADIUS + (trackIndex * LANE_WIDTH);
      const leftX = CENTER_X - STRAIGHT_LENGTH / 2;
      const rightX = CENTER_X + STRAIGHT_LENGTH / 2;

      // Top straight
      for (let i = 0; i < STRAIGHT_SPACES; i++) {
        const x1 = leftX + (i * STRAIGHT_LENGTH / STRAIGHT_SPACES);
        const x2 = leftX + ((i + 1) * STRAIGHT_LENGTH / STRAIGHT_SPACES);
        positions.push({
          x: (x1 + x2) / 2,
          y: CENTER_Y - radius,
          track: trackIndex,
          section: 'top-straight',
          space: i
        });
      }

      // Right curve
      for (let i = 0; i < track.curveSpaces; i++) {
        const angle1 = (i / track.curveSpaces) * Math.PI;
        const angle2 = ((i + 1) / track.curveSpaces) * Math.PI;
        const midAngle = (angle1 + angle2) / 2;
        positions.push({
          x: rightX + radius * Math.sin(midAngle),
          y: CENTER_Y + radius * Math.cos(midAngle),
          track: trackIndex,
          section: 'right-curve',
          space: i
        });
      }

      // Bottom straight
      for (let i = 0; i < STRAIGHT_SPACES; i++) {
        const x1 = leftX + (i * STRAIGHT_LENGTH / STRAIGHT_SPACES);
        const x2 = leftX + ((i + 1) * STRAIGHT_LENGTH / STRAIGHT_SPACES);
        positions.push({
          x: (x1 + x2) / 2,
          y: CENTER_Y + radius,
          track: trackIndex,
          section: 'bottom-straight',
          space: i
        });
      }

      // Left curve
      for (let i = 0; i < track.curveSpaces; i++) {
        const angle1 = Math.PI + (i / track.curveSpaces) * Math.PI;
        const angle2 = Math.PI + ((i + 1) / track.curveSpaces) * Math.PI;
        const midAngle = (angle1 + angle2) / 2;
        positions.push({
          x: leftX + radius * Math.sin(midAngle),
          y: CENTER_Y + radius * Math.cos(midAngle),
          track: trackIndex,
          section: 'left-curve',
          space: i
        });
      }
    });

    setSpacePositions(positions);

    // Initialize tokens at starting positions
    const startingSpaces = positions.filter(
      space => space.section === 'bottom-straight' && space.space === 0
    );

    if (startingSpaces.length >= 3) {
      setPlayerTokens(prev => prev.map((token, i) => ({
        ...token,
        position: startingSpaces[i] || null
      })));
    }
  }, []);

  // Create track path
  const createTrackPath = (radius: number) => {
    const innerR = radius - LANE_WIDTH / 2;
    const outerR = radius + LANE_WIDTH / 2;
    const leftX = CENTER_X - STRAIGHT_LENGTH / 2;
    const rightX = CENTER_X + STRAIGHT_LENGTH / 2;

    return `
      M ${leftX} ${CENTER_Y - outerR}
      L ${rightX} ${CENTER_Y - outerR}
      A ${outerR} ${outerR} 0 0 1 ${rightX} ${CENTER_Y + outerR}
      L ${leftX} ${CENTER_Y + outerR}
      A ${outerR} ${outerR} 0 0 1 ${leftX} ${CENTER_Y - outerR}
      M ${leftX} ${CENTER_Y - innerR}
      L ${rightX} ${CENTER_Y - innerR}
      A ${innerR} ${innerR} 0 0 1 ${rightX} ${CENTER_Y + innerR}
      L ${leftX} ${CENTER_Y + innerR}
      A ${innerR} ${innerR} 0 0 1 ${leftX} ${CENTER_Y - innerR}
    `;
  };

  // Find nearest space
  const findNearestSpace = useCallback((x: number, y: number): SpacePosition | null => {
    let minDistance = Infinity;
    let nearest: SpacePosition | null = null;

    for (const space of spacePositions) {
      const dx = space.x - x;
      const dy = space.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        nearest = space;
      }
    }

    return nearest;
  }, [spacePositions]);

  // Check if space is occupied
  const isSpaceOccupied = useCallback((space: SpacePosition, excludeTokenId?: string): boolean => {
    return playerTokens.some(token =>
      token.id !== excludeTokenId &&
      token.position &&
      token.position.track === space.track &&
      token.position.section === space.section &&
      token.position.space === space.space
    );
  }, [playerTokens]);

  // Handle token drag
  const handleTokenMouseDown = (tokenId: string) => {
    setDraggedToken(tokenId);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggedToken || !svgRef.current) return;

    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());

    // Update token position temporarily
    setPlayerTokens(prev => prev.map(token =>
      token.id === draggedToken
        ? { ...token, position: { ...token.position!, x: svgP.x, y: svgP.y } }
        : token
    ));

    // Find and highlight nearest space
    const nearest = findNearestSpace(svgP.x, svgP.y);
    if (nearest && !isSpaceOccupied(nearest, draggedToken)) {
      setNearestSpace(nearest);
    } else {
      setNearestSpace(null);
    }
  };

  const handleMouseUp = () => {
    if (!draggedToken) return;

    const token = playerTokens.find(t => t.id === draggedToken);
    if (!token || !token.position) return;

    const nearest = findNearestSpace(token.position.x, token.position.y);

    if (nearest && !isSpaceOccupied(nearest, draggedToken)) {
      // Snap to space
      setPlayerTokens(prev => prev.map(t =>
        t.id === draggedToken
          ? { ...t, position: nearest }
          : t
      ));
    } else {
      // Revert to previous position (find previous position from state)
      const prevToken = playerTokens.find(t => t.id === draggedToken);
      if (prevToken?.position) {
        setPlayerTokens(prev => prev.map(t =>
          t.id === draggedToken
            ? prevToken
            : t
        ));
      }
    }

    setDraggedToken(null);
    setNearestSpace(null);
  };

  // Handle space click
  const handleSpaceClick = (track: number, section: string, space: number) => {
    const key = `${track}-${section}-${space}`;
    setClickedSpaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Reset functions
  const resetTokens = () => {
    const startingSpaces = spacePositions.filter(
      space => space.section === 'bottom-straight' && space.space === 0
    );

    if (startingSpaces.length >= 3) {
      setPlayerTokens(prev => prev.map((token, i) => ({
        ...token,
        position: startingSpaces[i] || null
      })));
    }
  };

  const resetColors = () => {
    setClickedSpaces(new Set());
  };

  // Render track spaces
  const renderTrackSpaces = () => {
    const elements: JSX.Element[] = [];

    TRACKS.forEach((track, trackIndex) => {
      const radius = BASE_RADIUS + (trackIndex * LANE_WIDTH);
      const innerR = radius - LANE_WIDTH / 2;
      const outerR = radius + LANE_WIDTH / 2;
      const leftX = CENTER_X - STRAIGHT_LENGTH / 2;
      const rightX = CENTER_X + STRAIGHT_LENGTH / 2;

      // Top straight spaces
      for (let i = 0; i < STRAIGHT_SPACES; i++) {
        const x1 = leftX + (i * STRAIGHT_LENGTH / STRAIGHT_SPACES);
        const x2 = leftX + ((i + 1) * STRAIGHT_LENGTH / STRAIGHT_SPACES);
        const key = `${trackIndex}-top-straight-${i}`;
        const isClicked = clickedSpaces.has(key);
        const isNearestTarget = nearestSpace?.track === trackIndex &&
          nearestSpace?.section === 'top-straight' &&
          nearestSpace?.space === i;

        elements.push(
          <path
            key={key}
            d={`M ${x1} ${centerY - innerR} L ${x2} ${centerY - innerR} L ${x2} ${centerY - outerR} L ${x1} ${centerY - outerR} Z`}
            fill={isClicked ? 'rgba(74, 158, 255, 0.5)' : 'transparent'}
            stroke={isNearestTarget ? '#fff' : 'transparent'}
            strokeWidth={isNearestTarget ? 2 : 0}
            className="cursor-pointer hover:fill-white/10 transition-colors"
            onClick={() => handleSpaceClick(trackIndex, 'top-straight', i)}
          />
        );
      }

      // Right curve spaces
      for (let i = 0; i < track.curveSpaces; i++) {
        const angle1 = (i / track.curveSpaces) * Math.PI;
        const angle2 = ((i + 1) / track.curveSpaces) * Math.PI;
        const key = `${trackIndex}-right-curve-${i}`;
        const isClicked = clickedSpaces.has(key);
        const isNearestTarget = nearestSpace?.track === trackIndex &&
          nearestSpace?.section === 'right-curve' &&
          nearestSpace?.space === i;

        elements.push(
          <path
            key={key}
            d={`
              M ${rightX + innerR * Math.sin(angle1)} ${centerY + innerR * Math.cos(angle1)}
              A ${innerR} ${innerR} 0 0 0 ${rightX + innerR * Math.sin(angle2)} ${centerY + innerR * Math.cos(angle2)}
              L ${rightX + outerR * Math.sin(angle2)} ${centerY + outerR * Math.cos(angle2)}
              A ${outerR} ${outerR} 0 0 1 ${rightX + outerR * Math.sin(angle1)} ${centerY + outerR * Math.cos(angle1)}
              Z
            `}
            fill={isClicked ? 'rgba(74, 158, 255, 0.5)' : 'transparent'}
            stroke={isNearestTarget ? '#fff' : 'transparent'}
            strokeWidth={isNearestTarget ? 2 : 0}
            className="cursor-pointer hover:fill-white/10 transition-colors"
            onClick={() => handleSpaceClick(trackIndex, 'right-curve', i)}
          />
        );
      }

      // Bottom straight spaces
      for (let i = 0; i < STRAIGHT_SPACES; i++) {
        const x1 = leftX + (i * STRAIGHT_LENGTH / STRAIGHT_SPACES);
        const x2 = leftX + ((i + 1) * STRAIGHT_LENGTH / STRAIGHT_SPACES);
        const key = `${trackIndex}-bottom-straight-${i}`;
        const isClicked = clickedSpaces.has(key);
        const isNearestTarget = nearestSpace?.track === trackIndex &&
          nearestSpace?.section === 'bottom-straight' &&
          nearestSpace?.space === i;

        elements.push(
          <path
            key={key}
            d={`M ${x1} ${centerY + innerR} L ${x2} ${centerY + innerR} L ${x2} ${centerY + outerR} L ${x1} ${centerY + outerR} Z`}
            fill={isClicked ? 'rgba(74, 158, 255, 0.5)' : 'transparent'}
            stroke={isNearestTarget ? '#fff' : 'transparent'}
            strokeWidth={isNearestTarget ? 2 : 0}
            className="cursor-pointer hover:fill-white/10 transition-colors"
            onClick={() => handleSpaceClick(trackIndex, 'bottom-straight', i)}
          />
        );
      }

      // Left curve spaces
      for (let i = 0; i < track.curveSpaces; i++) {
        const angle1 = Math.PI + (i / track.curveSpaces) * Math.PI;
        const angle2 = Math.PI + ((i + 1) / track.curveSpaces) * Math.PI;
        const key = `${trackIndex}-left-curve-${i}`;
        const isClicked = clickedSpaces.has(key);
        const isNearestTarget = nearestSpace?.track === trackIndex &&
          nearestSpace?.section === 'left-curve' &&
          nearestSpace?.space === i;

        elements.push(
          <path
            key={key}
            d={`
              M ${leftX + innerR * Math.sin(angle1)} ${centerY + innerR * Math.cos(angle1)}
              A ${innerR} ${innerR} 0 0 0 ${leftX + innerR * Math.sin(angle2)} ${centerY + innerR * Math.cos(angle2)}
              L ${leftX + outerR * Math.sin(angle2)} ${centerY + outerR * Math.cos(angle2)}
              A ${outerR} ${outerR} 0 0 1 ${leftX + outerR * Math.sin(angle1)} ${centerY + outerR * Math.cos(angle1)}
              Z
            `}
            fill={isClicked ? 'rgba(74, 158, 255, 0.5)' : 'transparent'}
            stroke={isNearestTarget ? '#fff' : 'transparent'}
            strokeWidth={isNearestTarget ? 2 : 0}
            className="cursor-pointer hover:fill-white/10 transition-colors"
            onClick={() => handleSpaceClick(trackIndex, 'left-curve', i)}
          />
        );
      }
    });

    return elements;
  };

  // Render dividers
  const renderDividers = () => {
    const elements: JSX.Element[] = [];

    TRACKS.forEach((track, trackIndex) => {
      const radius = BASE_RADIUS + (trackIndex * LANE_WIDTH);
      const innerR = radius - LANE_WIDTH / 2;
      const outerR = radius + LANE_WIDTH / 2;
      const leftX = CENTER_X - STRAIGHT_LENGTH / 2;
      const rightX = CENTER_X + STRAIGHT_LENGTH / 2;

      // Lane dividers (between tracks)
      if (trackIndex < TRACKS.length - 1) {
        const dividerRadius = radius + LANE_WIDTH / 2;
        elements.push(
          <path
            key={`lane-divider-${trackIndex}`}
            d={`
              M ${leftX} ${CENTER_Y - dividerRadius}
              L ${rightX} ${CENTER_Y - dividerRadius}
              A ${dividerRadius} ${dividerRadius} 0 0 1 ${rightX} ${CENTER_Y + dividerRadius}
              L ${leftX} ${CENTER_Y + dividerRadius}
              A ${dividerRadius} ${dividerRadius} 0 0 1 ${leftX} ${CENTER_Y - dividerRadius}
            `}
            stroke="#222"
            strokeWidth={2}
            fill="none"
          />
        );
      }

      // Space dividers - top straight
      for (let i = 1; i < STRAIGHT_SPACES; i++) {
        const x = leftX + (i * STRAIGHT_LENGTH / STRAIGHT_SPACES);
        elements.push(
          <line
            key={`top-divider-${trackIndex}-${i}`}
            x1={x}
            y1={CENTER_Y - innerR}
            x2={x}
            y2={CENTER_Y - outerR}
            stroke="#666"
            strokeWidth={1}
          />
        );
      }

      // Transition dividers
      elements.push(
        <line key={`top-left-${trackIndex}`} x1={leftX} y1={CENTER_Y - innerR} x2={leftX} y2={CENTER_Y - outerR} stroke="#666" strokeWidth={1} />,
        <line key={`top-right-${trackIndex}`} x1={rightX} y1={CENTER_Y - innerR} x2={rightX} y2={CENTER_Y - outerR} stroke="#666" strokeWidth={1} />,
        <line key={`bottom-left-${trackIndex}`} x1={leftX} y1={CENTER_Y + innerR} x2={leftX} y2={CENTER_Y + outerR} stroke="#666" strokeWidth={1} />,
        <line key={`bottom-right-${trackIndex}`} x1={rightX} y1={CENTER_Y + innerR} x2={rightX} y2={CENTER_Y + outerR} stroke="#666" strokeWidth={1} />
      );

      // Space dividers - bottom straight
      for (let i = 1; i < STRAIGHT_SPACES; i++) {
        const x = leftX + (i * STRAIGHT_LENGTH / STRAIGHT_SPACES);
        elements.push(
          <line
            key={`bottom-divider-${trackIndex}-${i}`}
            x1={x}
            y1={CENTER_Y + innerR}
            x2={x}
            y2={CENTER_Y + outerR}
            stroke="#666"
            strokeWidth={1}
          />
        );
      }

      // Right curve dividers
      for (let i = 1; i < track.curveSpaces; i++) {
        const angle = (i / track.curveSpaces) * Math.PI;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        elements.push(
          <line
            key={`right-divider-${trackIndex}-${i}`}
            x1={rightX + innerR * sin}
            y1={CENTER_Y + innerR * cos}
            x2={rightX + outerR * sin}
            y2={CENTER_Y + outerR * cos}
            stroke="#666"
            strokeWidth={1}
          />
        );
      }

      // Left curve dividers
      for (let i = 1; i < track.curveSpaces; i++) {
        const angle = Math.PI + (i / track.curveSpaces) * Math.PI;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        elements.push(
          <line
            key={`left-divider-${trackIndex}-${i}`}
            x1={leftX + innerR * sin}
            y1={CENTER_Y + innerR * cos}
            x2={leftX + outerR * sin}
            y2={CENTER_Y + outerR * cos}
            stroke="#666"
            strokeWidth={1}
          />
        );
      }
    });

    return elements;
  };

  return (
    <div className="w-full relative mb-6">
      {/* Controls */}
      <div className="absolute top-4 right-4 bg-black/70 p-3 rounded-lg z-10 space-y-2">
        <button
          onClick={resetColors}
          className="block w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm transition-colors"
        >
          Reset Colors
        </button>
        <button
          onClick={resetTokens}
          className="block w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm transition-colors"
        >
          Reset Tokens
        </button>
      </div>

      {/* Token Status */}
      <div className="absolute top-4 left-4 bg-black/70 p-3 rounded-lg z-10 min-w-[220px]">
        <h4 className="text-sm font-bold text-white mb-2 border-b border-gray-600 pb-1">Token Positions</h4>
        {playerTokens.map(token => (
          <div key={token.id} className="flex items-center text-sm text-white mb-1">
            <div
              className="w-3 h-3 rounded-full mr-2 border border-white"
              style={{ backgroundColor: token.color }}
            />
            <span>
              {token.name}: {token.position ?
                `${['Inner', 'Middle', 'Outer'][token.position.track]} - ${token.position.section.replace('-', ' ')} #${token.position.space + 1}` :
                'Not on track'}
            </span>
          </div>
        ))}
      </div>

      {/* Race Track */}
      <svg
        ref={svgRef}
        width="900"
        height="600"
        viewBox="0 0 900 600"
        className="bg-gray-900 rounded-lg shadow-xl cursor-grab active:cursor-grabbing"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Track backgrounds */}
        <g>
          {TRACKS.map((_, trackIndex) => {
            const radius = BASE_RADIUS + (trackIndex * LANE_WIDTH);
            return (
              <path
                key={`track-${trackIndex}`}
                d={createTrackPath(radius)}
                fill="#444"
                stroke="#222"
                strokeWidth={2}
                fillRule="evenodd"
              />
            );
          })}
        </g>

        {/* Track dividers */}
        <g>{renderDividers()}</g>

        {/* Clickable spaces */}
        <g>{renderTrackSpaces()}</g>

        {/* Player tokens */}
        {playerTokens.map(token => token.position && (
          <circle
            key={token.id}
            cx={token.position.x}
            cy={token.position.y}
            r={12}
            fill={token.color}
            stroke="#fff"
            strokeWidth={2}
            className="cursor-move"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))' }}
            onMouseDown={() => handleTokenMouseDown(token.id)}
          />
        ))}
      </svg>
    </div>
  );
};

export default RaceMat;
