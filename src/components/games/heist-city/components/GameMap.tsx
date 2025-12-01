import React, { useRef, useState, useCallback, useEffect } from 'react';
import { MapState, CharacterToken as CharacterTokenType, MapItem as MapItemType, Position } from '../types';
import {
  SVG_WIDTH,
  SVG_HEIGHT,
  GRID_COLUMNS,
  GRID_ROWS,
  inchesToPixels,
  pixelsToInches,
  snapToGrid as snapToGridUtil,
  isWithinBounds,
  GRID_SIZE_INCHES,
  GRID_CENTER_OFFSET,
  MAP_SIZE_INCHES,
} from '../data/mapConstants';
import CharacterToken from './CharacterToken';
import MapItem from './MapItem';
import MapToolbar, { MapTool } from './MapToolbar';
import MapSettings from './MapSettings';

interface GameMapProps {
  mapState: MapState;
  onMapStateChange?: (mapState: MapState) => void;
  onSelectionChange?: (selection: { type: 'token' | 'item' | null; id: string | null; name: string; position: Position } | null) => void;
  readOnly?: boolean;
}

const GameMap: React.FC<GameMapProps> = ({ mapState, onMapStateChange, onSelectionChange, readOnly = false }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tool and view state
  const [activeTool, setActiveTool] = useState<MapTool>('select');
  const [zoom, setZoom] = useState(1);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: SVG_WIDTH, height: SVG_HEIGHT });

  // Dragging state
  const [draggedToken, setDraggedToken] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [hoveredGrid, setHoveredGrid] = useState<Position | null>(null);
  const [cursorPosition, setCursorPosition] = useState<Position | null>(null);

  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Ruler state
  const [rulerStart, setRulerStart] = useState<Position | null>(null);
  const [rulerEnd, setRulerEnd] = useState<Position | null>(null);

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    showGrid: true,
    showCoordinates: true,
    showItems: true,
    snapToGrid: true,
  });

  // Zoom functions
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.25, 0.25));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setViewBox({ x: 0, y: 0, width: SVG_WIDTH, height: SVG_HEIGHT });
  }, []);

  const handleFitToWindow = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const containerAspect = container.clientWidth / container.clientHeight;
    const mapAspect = SVG_WIDTH / SVG_HEIGHT;

    let newZoom = 1;
    if (containerAspect > mapAspect) {
      newZoom = container.clientHeight / SVG_HEIGHT;
    } else {
      newZoom = container.clientWidth / SVG_WIDTH;
    }

    setZoom(newZoom);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Update viewBox based on zoom and pan
  useEffect(() => {
    const newWidth = SVG_WIDTH / zoom;
    const newHeight = SVG_HEIGHT / zoom;
    const newX = panOffset.x;
    const newY = panOffset.y;

    setViewBox({
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
    });
  }, [zoom, panOffset]);

  // Add native wheel event listener to prevent browser zoom
  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const handleNativeWheel = (e: WheelEvent) => {
      // Only handle when Ctrl key is pressed
      if (!e.ctrlKey || readOnly) return;

      // Prevent browser zoom
      e.preventDefault();

      // Get mouse position in SVG coordinates before zoom
      const svg = svgElement;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgPoint = pt.matrixTransform(svg.getScreenCTM()!.inverse());

      const delta = -e.deltaY / 1000;
      const newZoom = Math.min(Math.max(zoom + delta, 0.25), 4);

      if (newZoom !== zoom) {
        // Calculate new viewBox dimensions
        const newWidth = SVG_WIDTH / newZoom;
        const newHeight = SVG_HEIGHT / newZoom;
        const oldWidth = SVG_WIDTH / zoom;
        const oldHeight = SVG_HEIGHT / zoom;

        // Calculate the position of the mouse in the viewBox (0-1 normalized)
        const mouseXRatio = (svgPoint.x - panOffset.x) / oldWidth;
        const mouseYRatio = (svgPoint.y - panOffset.y) / oldHeight;

        // Calculate new pan offset to keep the mouse point stationary
        const newPanX = svgPoint.x - mouseXRatio * newWidth;
        const newPanY = svgPoint.y - mouseYRatio * newHeight;

        setZoom(newZoom);
        setPanOffset({ x: newPanX, y: newPanY });
      }
    };

    // Add listener with passive: false to allow preventDefault
    svgElement.addEventListener('wheel', handleNativeWheel, { passive: false });

    return () => {
      svgElement.removeEventListener('wheel', handleNativeWheel);
    };
  }, [zoom, readOnly, panOffset]);

  // Convert screen coordinates to SVG coordinates
  const screenToSVG = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: svgP.x, y: svgP.y };
  }, []);

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (readOnly) return;

      const svgCoords = screenToSVG(e.clientX, e.clientY);

      if (activeTool === 'pan') {
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
      } else if (activeTool === 'ruler') {
        const posInches = { x: pixelsToInches(svgCoords.x), y: pixelsToInches(svgCoords.y) };
        setRulerStart(posInches);
        setRulerEnd(posInches);
      }
    },
    [activeTool, readOnly, screenToSVG]
  );

  // Handle token drag start
  const handleTokenMouseDown = useCallback(
    (token: CharacterTokenType) => {
      if (readOnly || activeTool !== 'select') return;
      setDraggedToken(token.id);
    },
    [readOnly, activeTool]
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svgCoords = screenToSVG(e.clientX, e.clientY);
      const posInches = { x: pixelsToInches(svgCoords.x), y: pixelsToInches(svgCoords.y) };

      // Handle panning
      if (isPanning && panStart) {
        const dx = (panStart.x - e.clientX) / zoom;
        const dy = (panStart.y - e.clientY) / zoom;
        setPanOffset((prev) => ({
          x: prev.x + dx,
          y: prev.y + dy,
        }));
        setPanStart({ x: e.clientX, y: e.clientY });
        return;
      }

      // Handle ruler
      if (rulerStart && activeTool === 'ruler') {
        setRulerEnd(posInches);
        return;
      }

      // Handle token dragging
      if (draggedToken && activeTool === 'select') {
        const snapPos = settings.snapToGrid ? snapToGridUtil(posInches) : posInches;
        setHoveredGrid(snapPos);
        setCursorPosition(posInches); // Track actual cursor position for shadow

        const updatedCharacters = mapState.characters.map((token) =>
          token.id === draggedToken ? { ...token, position: posInches } : token
        );

        onMapStateChange?.({ ...mapState, characters: updatedCharacters });
      }
    },
    [
      screenToSVG,
      isPanning,
      panStart,
      zoom,
      rulerStart,
      activeTool,
      draggedToken,
      mapState,
      onMapStateChange,
      settings.snapToGrid,
    ]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    // End panning
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
    }

    // End ruler
    if (rulerStart && activeTool === 'ruler') {
      // Ruler measurement is complete, keep it visible
    }

    // End token dragging
    if (draggedToken) {
      const token = mapState.characters.find((t) => t.id === draggedToken);
      if (!token) return;

      let finalPosition = token.position;
      if (settings.snapToGrid) {
        finalPosition = snapToGridUtil(token.position);
      }

      if (!isWithinBounds(finalPosition)) {
        finalPosition.x = Math.max(0, Math.min(35, finalPosition.x));
        finalPosition.y = Math.max(0, Math.min(35, finalPosition.y));
      }

      const updatedCharacters = mapState.characters.map((t) =>
        t.id === draggedToken ? { ...t, position: finalPosition } : t
      );

      onMapStateChange?.({ ...mapState, characters: updatedCharacters });
      setDraggedToken(null);
      setHoveredGrid(null);
      setCursorPosition(null);
    }
  }, [isPanning, rulerStart, activeTool, draggedToken, mapState, onMapStateChange, settings.snapToGrid]);

  // Handle token click
  const handleTokenClick = useCallback(
    (token: CharacterTokenType) => {
      if (readOnly || activeTool !== 'select') return;
      const isCurrentlySelected = token.isSelected;
      const updatedCharacters = mapState.characters.map((t) => ({
        ...t,
        isSelected: t.id === token.id ? !t.isSelected : t.isSelected,
      }));
      onMapStateChange?.({ ...mapState, characters: updatedCharacters });

      // Notify parent of selection change
      if (!isCurrentlySelected) {
        onSelectionChange?.({
          type: 'token',
          id: token.id,
          name: token.name,
          position: token.position,
        });
      } else {
        onSelectionChange?.(null);
      }
    },
    [mapState, onMapStateChange, onSelectionChange, readOnly, activeTool]
  );

  // Handle item click
  const handleItemClick = useCallback(
    (item: MapItemType) => {
      if (readOnly || activeTool !== 'select') return;
      const isCurrentlySelected = item.id === selectedItem;
      setSelectedItem(isCurrentlySelected ? null : item.id);

      // Notify parent of selection change
      if (!isCurrentlySelected) {
        // Format item type as readable name
        const itemName = item.type
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        onSelectionChange?.({
          type: 'item',
          id: item.id,
          name: itemName,
          position: item.position,
        });
      } else {
        onSelectionChange?.(null);
      }
    },
    [selectedItem, onSelectionChange, readOnly, activeTool]
  );

  // Calculate distance for ruler
  const calculateDistance = useCallback((start: Position, end: Position) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Render grid lines
  const renderGrid = () => {
    if (!settings.showGrid) return null;
    const lines: JSX.Element[] = [];
    const mapSizePixels = inchesToPixels(MAP_SIZE_INCHES);

    for (let i = 0; i <= GRID_COLUMNS; i++) {
      const x = inchesToPixels(i * GRID_SIZE_INCHES);
      lines.push(
        <line
          key={`v-${i}`}
          x1={x}
          y1={0}
          x2={x}
          y2={mapSizePixels}
          stroke="#374151"
          strokeWidth={i % 6 === 0 ? 1.5 : 0.5}
          opacity={i % 6 === 0 ? 0.6 : 0.3}
        />
      );
    }

    for (let i = 0; i <= GRID_ROWS; i++) {
      const y = inchesToPixels(i * GRID_SIZE_INCHES);
      lines.push(
        <line
          key={`h-${i}`}
          x1={0}
          y1={y}
          x2={mapSizePixels}
          y2={y}
          stroke="#374151"
          strokeWidth={i % 6 === 0 ? 1.5 : 0.5}
          opacity={i % 6 === 0 ? 0.6 : 0.3}
        />
      );
    }

    return lines;
  };

  // Render hovered grid highlight
  const renderHoveredGrid = () => {
    if (!cursorPosition || !draggedToken) return null;

    // Center the shadow on the cursor position
    const x = inchesToPixels(cursorPosition.x + GRID_CENTER_OFFSET);
    const y = inchesToPixels(cursorPosition.y + GRID_CENTER_OFFSET);
    const size = inchesToPixels(GRID_SIZE_INCHES);

    return (
      <rect
        x={x - size / 2}
        y={y - size / 2}
        width={size}
        height={size}
        fill="#fff"
        opacity={0.1}
        pointerEvents="none"
      />
    );
  };

  // Render grid coordinates
  const renderCoordinates = () => {
    if (!settings.showCoordinates) return null;
    const coords: JSX.Element[] = [];

    // Display coordinates every 6 inches, plus the final edge at 35
    const coordMarkers = [0, 6, 12, 18, 24, 30, 35];

    coordMarkers.forEach((i) => {
      coords.push(
        <text
          key={`top-${i}`}
          x={inchesToPixels(i)}
          y={12}
          textAnchor="middle"
          fill="#9ca3af"
          fontSize="10"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {i}"
        </text>
      );

      coords.push(
        <text
          key={`left-${i}`}
          x={12}
          y={inchesToPixels(i) + 4}
          textAnchor="middle"
          fill="#9ca3af"
          fontSize="10"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {i}"
        </text>
      );
    });

    return coords;
  };

  // Render ruler
  const renderRuler = () => {
    if (!rulerStart || !rulerEnd) return null;

    const x1 = inchesToPixels(rulerStart.x);
    const y1 = inchesToPixels(rulerStart.y);
    const x2 = inchesToPixels(rulerEnd.x);
    const y2 = inchesToPixels(rulerEnd.y);
    const distance = calculateDistance(rulerStart, rulerEnd);

    return (
      <g>
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#eab308"
          strokeWidth={2}
          strokeDasharray="5,5"
        />
        <circle cx={x1} cy={y1} r={4} fill="#eab308" />
        <circle cx={x2} cy={y2} r={4} fill="#eab308" />
        <text
          x={(x1 + x2) / 2}
          y={(y1 + y2) / 2 - 10}
          textAnchor="middle"
          fill="#eab308"
          fontSize="14"
          fontWeight="bold"
          stroke="#000"
          strokeWidth={0.5}
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {distance.toFixed(2)}"
        </text>
      </g>
    );
  };

  // Get cursor style based on active tool
  const getCursorClass = () => {
    if (readOnly) return '';
    if (activeTool === 'pan') return isPanning ? 'cursor-grabbing' : 'cursor-grab';
    if (activeTool === 'ruler') return 'cursor-crosshair';
    return draggedToken ? 'cursor-grabbing' : 'cursor-default';
  };

  return (
    <div className="w-full relative" ref={containerRef}>
      {/* Toolbar */}
      <MapToolbar
        activeTool={activeTool}
        onToolChange={(tool) => {
          setActiveTool(tool);
          setRulerStart(null);
          setRulerEnd(null);
        }}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onFitToWindow={handleFitToWindow}
        onToggleSettings={() => setShowSettings(!showSettings)}
        showSettings={showSettings}
      />

      {/* Settings Panel */}
      {showSettings && (
        <MapSettings
          showGrid={settings.showGrid}
          showCoordinates={settings.showCoordinates}
          showItems={settings.showItems}
          snapToGrid={settings.snapToGrid}
          onToggleGrid={() => setSettings((s) => ({ ...s, showGrid: !s.showGrid }))}
          onToggleCoordinates={() => setSettings((s) => ({ ...s, showCoordinates: !s.showCoordinates }))}
          onToggleItems={() => setSettings((s) => ({ ...s, showItems: !s.showItems }))}
          onToggleSnapToGrid={() => setSettings((s) => ({ ...s, snapToGrid: !s.snapToGrid }))}
        />
      )}

      {/* Map */}
      <svg
        ref={svgRef}
        width="100%"
        height={600}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        className={`bg-gray-900 rounded-lg shadow-xl ${getCursorClass()}`}
        style={{ userSelect: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid background */}
        <rect width={inchesToPixels(MAP_SIZE_INCHES)} height={inchesToPixels(MAP_SIZE_INCHES)} fill="#1f2937" />

        {/* Grid lines */}
        <g>{renderGrid()}</g>

        {/* Grid coordinates */}
        <g>{renderCoordinates()}</g>

        {/* Hovered grid highlight */}
        {renderHoveredGrid()}

        {/* Map items */}
        {settings.showItems && (
          <g>
            {mapState.items.map((item) => (
              <MapItem
                key={item.id}
                item={item}
                onClick={handleItemClick}
                isSelected={item.id === selectedItem}
              />
            ))}
          </g>
        )}

        {/* Character tokens */}
        <g>
          {mapState.characters.map((token) => (
            <CharacterToken
              key={token.id}
              token={token}
              onMouseDown={handleTokenMouseDown}
              onClick={handleTokenClick}
              isDragging={token.id === draggedToken}
            />
          ))}
        </g>

        {/* Ruler */}
        {renderRuler()}
      </svg>
    </div>
  );
};

export default GameMap;
