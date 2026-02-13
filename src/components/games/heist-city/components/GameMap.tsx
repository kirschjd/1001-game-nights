import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { MapState, CharacterToken as CharacterTokenType, MapItem as MapItemType, MapZone as MapZoneType, Position, ItemType, PlayerSelection, GridType } from '../types';
import {
  inchesToPixels,
  MAP_SIZE_INCHES,
} from '../data/mapConstants';
import { useViewport } from '../hooks/useViewport';
import { useDrag, ResizeHandle } from '../hooks/useDrag';
import CharacterToken from './CharacterToken';
import MapItem from './MapItem';
import MapZone from './MapZone';
import ZonePropertiesPanel from './ZonePropertiesPanel';
import MapToolbar, { MapTool } from './MapToolbar';
import MapSettings from './MapSettings';
import MapLegend from './MapLegend';
import DiceRoller from './DiceRoller';
import GameLog, { LogEntry } from './GameLog';
import AlertLevelIndicator from './AlertLevelIndicator';
import CharacterSelectionPanel from './CharacterSelectionPanel';
import EnemyInfoPanel from './EnemyInfoPanel';
import GearItemPanel from './GearItemPanel';
import {
  isMovableEnemy,
  isEnemyUnit,
} from '../data/characters';
import { createGridUtils, GridUtils } from '../data/gridUtils';

interface GameInfo {
  turnNumber: number;
  blueVictoryPoints: number;
  redVictoryPoints: number;
}

interface GameMapProps {
  mapState: MapState;
  onMapStateChange?: (mapState: MapState) => void;
  onSelectionChange?: (characterId: string | null) => void; // Now just passes character ID
  readOnly?: boolean;
  gridType?: GridType; // Grid type: 'square' (default) or 'hex'
  onDiceRoll?: (dice1: number, dice2: number, total: number) => void;
  lastDiceRoll?: { dice1: number; dice2: number; total: number; roller?: string } | null;
  logEntries?: LogEntry[];
  playerSelections: PlayerSelection[]; // All player selections
  currentPlayerId: string; // Current player's ID
  currentPlayerNumber: 1 | 2 | 'observer'; // Current player's number for color-coding
  onExhaustToggle?: (characterId: string) => void;
  onActionUpdate?: (characterId: string, actions: string[]) => void;
  onLoadMap?: (mapId: string) => void;
  sharedRulerState?: {
    start: Position | null;
    end: Position | null;
    playerId: string | null;
  } | null;
  onRulerUpdate?: (start: Position | null, end: Position | null) => void;
  gameInfo?: GameInfo; // Turn number and victory points for export
  onGameInfoChange?: (gameInfo: GameInfo) => void; // Callback when importing game info
  alertModifier?: number; // Alert level modifier
  onAlertModifierChange?: (value: number) => void; // Callback when alert modifier changes
  onSaveGame?: () => void; // Callback to open save game modal
  onLoadGame?: () => void; // Callback to open load game modal
}

const GameMap: React.FC<GameMapProps> = ({
  mapState,
  onMapStateChange,
  onSelectionChange,
  readOnly = false,
  gridType = 'hex',
  onDiceRoll,
  lastDiceRoll,
  logEntries = [],
  playerSelections,
  currentPlayerId,
  currentPlayerNumber,
  onExhaustToggle,
  onActionUpdate,
  onLoadMap,
  sharedRulerState,
  onRulerUpdate,
  gameInfo,
  onGameInfoChange,
  alertModifier = 0,
  onAlertModifierChange,
  onSaveGame,
  onLoadGame,
}) => {
  // Create grid utilities based on grid type (memoized to prevent recreation)
  const gridUtils = useMemo<GridUtils>(() => createGridUtils(gridType), [gridType]);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper function to get all players who have selected a character
  const getSelectingPlayers = useCallback(
    (characterId: string): Array<1 | 2 | 'observer'> => {
      return playerSelections
        .filter(sel => sel.characterId === characterId)
        .map(sel => sel.playerNumber);
    },
    [playerSelections]
  );

  // Get the character selected by the current player
  const getCurrentPlayerSelection = useCallback((): CharacterTokenType | null => {
    const selection = playerSelections.find(sel => sel.playerId === currentPlayerId);
    if (!selection) return null;
    return mapState.characters.find(char => char.id === selection.characterId) || null;
  }, [playerSelections, currentPlayerId, mapState.characters]);

  // Tool state
  const [activeTool, setActiveTool] = useState<MapTool>('select');

  // Selection state (not part of drag — these track which item/zone is selected)
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [zoneCounter, setZoneCounter] = useState(1);

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    showGrid: true,
    showCoordinates: true,
    showItems: true,
    snapToGrid: true,
  });

  // Clipboard state for copy/paste
  const [copiedItem, setCopiedItem] = useState<MapItemType | null>(null);
  const [copiedZone, setCopiedZone] = useState<MapZoneType | null>(null);

  // Viewport hook (zoom, pan, viewBox, wheel zoom, screenToSVG)
  const viewport = useViewport(svgRef, containerRef, readOnly);

  // Zone update callbacks for drag hook
  const handleZoneDragMove = useCallback((zoneId: string, position: Position) => {
    const updatedZones = mapState.zones.map(z =>
      z.id === zoneId ? { ...z, position } : z
    );
    onMapStateChange?.({ ...mapState, zones: updatedZones });
  }, [mapState, onMapStateChange]);

  const handleZoneResizeMove = useCallback((zoneId: string, width: number, height: number, position: Position) => {
    const updatedZones = mapState.zones.map(z =>
      z.id === zoneId ? { ...z, width, height, position } : z
    );
    onMapStateChange?.({ ...mapState, zones: updatedZones });
  }, [mapState, onMapStateChange]);

  // Drag hook (token/item/zone dragging, zone resize)
  const drag = useDrag({
    gridUtils,
    screenToSVG: viewport.screenToSVG,
    snapToGrid: settings.snapToGrid,
    onZoneMove: handleZoneDragMove,
    onZoneResize: handleZoneResizeMove,
  });

  // Handle keyboard controls for moving selected tokens (WASD)
  useEffect(() => {
    if (readOnly || activeTool !== 'select') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Check if current player has a selected token
      const selectedToken = getCurrentPlayerSelection();
      if (!selectedToken) return;

      // Prevent default browser behavior for these keys
      if (['w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }

      const moveAmount = 1; // Move 1 inch at a time
      let newPosition = { ...selectedToken.position };

      switch (e.key.toLowerCase()) {
        case 'w': // Move up
          newPosition.y = Math.max(0, newPosition.y - moveAmount);
          break;
        case 's': // Move down
          newPosition.y = Math.min(35, newPosition.y + moveAmount);
          break;
        case 'a': // Move left
          newPosition.x = Math.max(0, newPosition.x - moveAmount);
          break;
        case 'd': // Move right
          newPosition.x = Math.min(35, newPosition.x + moveAmount);
          break;
        default:
          return; // Ignore other keys
      }

      // Apply snap to grid if enabled
      if (settings.snapToGrid) {
        newPosition = gridUtils.snapToGrid(newPosition);
      }

      // Update the selected token's position
      const updatedCharacters = mapState.characters.map(char =>
        char.id === selectedToken.id ? { ...char, position: newPosition } : char
      );

      onMapStateChange?.({ ...mapState, characters: updatedCharacters });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readOnly, activeTool, mapState, onMapStateChange, settings.snapToGrid, getCurrentPlayerSelection, gridUtils]);

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (readOnly) return;

      // Right-click pan - works with any tool
      if (e.button === 2) {
        e.preventDefault();
        viewport.startPan(e.clientX, e.clientY);
        return;
      }

      // Left-click tool-specific behavior
      if (activeTool === 'pan') {
        viewport.startPan(e.clientX, e.clientY);
      } else if (activeTool === 'ruler') {
        const svgCoords = viewport.screenToSVG(e.clientX, e.clientY);
        const rulerPos = gridUtils.pixelsToPosition(svgCoords);
        onRulerUpdate?.(rulerPos, rulerPos);
      }
    },
    [activeTool, readOnly, viewport, onRulerUpdate, gridUtils]
  );

  // Handle SVG click (clicking empty area to unfocus selections)
  const handleSvgClick = useCallback(
    () => {
      // If we just finished dragging, don't clear selection
      if (drag.justFinishedDragRef.current) {
        drag.justFinishedDragRef.current = false;
        return;
      }

      if (selectedItem) setSelectedItem(null);
      if (selectedZone) setSelectedZone(null);
      onSelectionChange?.(null);
    },
    [selectedItem, selectedZone, onSelectionChange, drag]
  );

  // Handle item double-click (to unfocus)
  const handleItemDoubleClick = useCallback(
    (item: MapItemType) => {
      // Double-click clears selection
      if (item.id === selectedItem) {
        setSelectedItem(null);
      }
    },
    [selectedItem]
  );

  // Handle token drag start and selection
  const handleTokenMouseDown = useCallback(
    (token: CharacterTokenType, e: React.MouseEvent) => {
      if (readOnly || activeTool !== 'select') return;
      onSelectionChange?.(token.id);
      drag.startTokenDrag(token.id, token.position, e);
    },
    [readOnly, activeTool, onSelectionChange, drag]
  );

  // Handle item drag start (editor mode or movable enemies in select mode)
  const handleItemMouseDown = useCallback(
    (item: MapItemType, e: React.MouseEvent) => {
      if (readOnly) return;
      const canDrag = activeTool === 'editor' || (activeTool === 'select' && isMovableEnemy(item.type));
      if (!canDrag) return;
      setSelectedItem(item.id);
      drag.startItemDrag(item.id, item.position, e);
    },
    [readOnly, activeTool, drag]
  );

  // Add new item to map (editor mode)
  const handleAddItem = useCallback(
    (itemType: ItemType) => {
      if (readOnly) return;

      // Default position: center of map (0,0 for hex, 18,18 for square)
      const defaultPosition = gridType === 'hex' ? { x: 0, y: 0 } : { x: 18, y: 18 };
      const newItem: MapItemType = {
        id: `item-${Date.now()}`,
        type: itemType,
        position: defaultPosition,
        size: 1,
      };

      onMapStateChange?.({
        ...mapState,
        items: [...mapState.items, newItem]
      });
    },
    [readOnly, mapState, onMapStateChange, gridType]
  );

  // Add new zone to map (editor mode)
  const handleAddZone = useCallback(() => {
    if (readOnly) return;

    // Default position: near center (0,0 for hex, 15,15 for square)
    const defaultPosition = gridType === 'hex' ? { x: 0, y: 0 } : { x: 15, y: 15 };
    const newZone: MapZoneType = {
      id: `zone-${Date.now()}`,
      position: defaultPosition,
      width: 3,
      height: 3,
      color: 'rgba(147, 51, 234, 0.3)', // Semi-transparent purple
      label: `Zone ${zoneCounter}`,
    };

    setZoneCounter(zoneCounter + 1);
    onMapStateChange?.({
      ...mapState,
      zones: [...mapState.zones, newZone]
    });
  }, [readOnly, mapState, onMapStateChange, zoneCounter, gridType]);

  // Handle importing a map
  const handleImportMap = useCallback((mapData: {
    items: MapItemType[];
    zones: MapZoneType[];
    startPositions?: { player1: Position[]; player2: Position[] };
    characterData?: CharacterTokenType[];
    gameInfo?: GameInfo;
  }) => {
    if (readOnly) return;

    // Update items and zones
    const newMapState = {
      ...mapState,
      items: mapData.items || [],
      zones: mapData.zones || [],
    };

    // Priority 1: Use full character data if provided (includes stats, state, equipment, position)
    if (mapData.characterData && mapData.characterData.length > 0) {
      newMapState.characters = mapData.characterData;
    }
    // Priority 2: Update character positions only if startPositions provided
    else if (mapData.startPositions) {
      const updatedCharacters = mapState.characters.map((char) => {
        const positions = char.playerNumber === 1
          ? mapData.startPositions!.player1
          : mapData.startPositions!.player2;
        const index = parseInt(char.id.split('-').pop() || '0') - 1;

        if (positions && positions[index]) {
          return {
            ...char,
            position: positions[index],
          };
        }
        return char;
      });

      newMapState.characters = updatedCharacters;
    }

    onMapStateChange?.(newMapState);

    // If gameInfo was provided in the import, restore it
    if (mapData.gameInfo && onGameInfoChange) {
      onGameInfoChange(mapData.gameInfo);
    }
  }, [readOnly, mapState, onMapStateChange, onGameInfoChange]);

  // Handle zone click
  const handleZoneClick = useCallback(
    (zone: MapZoneType) => {
      if (readOnly) return;
      const isCurrentlySelected = zone.id === selectedZone;
      setSelectedZone(isCurrentlySelected ? null : zone.id);
      // Clear item selection when selecting a zone
      setSelectedItem(null);
    },
    [selectedZone, readOnly]
  );

  // Handle zone drag start
  const handleZoneMouseDown = useCallback(
    (zone: MapZoneType, e: React.MouseEvent) => {
      if (readOnly || activeTool !== 'editor') return;
      drag.startZoneDrag(zone.id, zone.position, e);
    },
    [readOnly, activeTool, drag]
  );

  // Handle zone resize start
  const handleResizeHandleMouseDown = useCallback(
    (zone: MapZoneType, e: React.MouseEvent, handle: ResizeHandle) => {
      if (readOnly || activeTool !== 'editor') return;
      drag.startZoneResize(zone, e, handle);
    },
    [readOnly, activeTool, drag]
  );

  // Handle zone property update
  const handleZoneUpdate = useCallback(
    (updatedZone: MapZoneType) => {
      if (readOnly) return;

      const updatedZones = mapState.zones.map((z) =>
        z.id === updatedZone.id ? updatedZone : z
      );

      onMapStateChange?.({ ...mapState, zones: updatedZones });
    },
    [readOnly, mapState, onMapStateChange]
  );

  // Handle mouse move — delegates to viewport (pan) or drag hook
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (viewport.isPanning) {
        viewport.updatePan(e.clientX, e.clientY);
        return;
      }

      // Handle ruler
      if (sharedRulerState?.start && activeTool === 'ruler') {
        const svgCoords = viewport.screenToSVG(e.clientX, e.clientY);
        const cursorPos = gridUtils.pixelsToPosition(svgCoords);
        onRulerUpdate?.(sharedRulerState.start, cursorPos);
        return;
      }

      // Handle all drag operations (token, item, zone, resize)
      drag.handleDragMove(e);
    },
    [viewport, sharedRulerState, activeTool, onRulerUpdate, gridUtils, drag]
  );

  // Handle mouse up — delegates to viewport (end pan) and drag hook
  const handleMouseUp = useCallback(() => {
    viewport.endPan();

    const dragResult = drag.handleDragEnd();
    if (dragResult) {
      if (dragResult.type === 'token') {
        const updatedCharacters = mapState.characters.map(t =>
          t.id === dragResult.id ? { ...t, position: dragResult.position } : t
        );
        onMapStateChange?.({ ...mapState, characters: updatedCharacters });
      } else if (dragResult.type === 'item') {
        const updatedItems = mapState.items.map(i =>
          i.id === dragResult.id ? { ...i, position: dragResult.position } : i
        );
        onMapStateChange?.({ ...mapState, items: updatedItems });
      }
    }
  }, [viewport, drag, mapState, onMapStateChange]);


  // Handle item click
  const handleItemClick = useCallback(
    (item: MapItemType) => {
      // Allow selection in both select and editor modes
      if (readOnly || (activeTool !== 'select' && activeTool !== 'editor')) return;

      // Check if this item is draggable (movable enemy in select mode, or any item in editor mode)
      const canDrag = activeTool === 'editor' || (activeTool === 'select' && isMovableEnemy(item.type));

      // For draggable items, selection is handled by mouseDown - don't toggle here
      // This prevents the click event from immediately deselecting after mouseDown selected
      // User must click elsewhere (background) to deselect
      if (canDrag) {
        // Draggable items: selection/deselection handled by mouseDown, do nothing on click
        return;
      }

      // Non-draggable items (turrets, gear): toggle selection normally
      const isCurrentlySelected = item.id === selectedItem;
      setSelectedItem(isCurrentlySelected ? null : item.id);
    },
    [selectedItem, readOnly, activeTool]
  );

  // Handle delete selected item or zone
  const handleDeleteItem = useCallback(() => {
    if (readOnly || activeTool !== 'editor') return;

    // Delete zone if selected
    if (selectedZone) {
      const updatedZones = mapState.zones.filter((zone) => zone.id !== selectedZone);
      onMapStateChange?.({ ...mapState, zones: updatedZones });
      setSelectedZone(null);
      return;
    }

    // Delete item if selected
    if (selectedItem) {
      const updatedItems = mapState.items.filter((item) => item.id !== selectedItem);
      onMapStateChange?.({ ...mapState, items: updatedItems });
      setSelectedItem(null);
    }
  }, [selectedItem, selectedZone, readOnly, activeTool, mapState, onMapStateChange]);

  // Handle keyboard events for delete, copy, paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteItem();
        return;
      }

      // Only handle copy/paste in editor mode
      if (activeTool !== 'editor') return;

      // Copy (Ctrl+C)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedItem) {
          const itemToCopy = mapState.items.find(item => item.id === selectedItem);
          if (itemToCopy) {
            setCopiedItem({ ...itemToCopy });
            setCopiedZone(null);
          }
        } else if (selectedZone) {
          const zoneToCopy = mapState.zones.find(zone => zone.id === selectedZone);
          if (zoneToCopy) {
            setCopiedZone({ ...zoneToCopy });
            setCopiedItem(null);
          }
        }
        return;
      }

      // Paste (Ctrl+V)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();

        if (copiedItem) {
          // Create new item with unique ID and offset position
          const newItem: MapItemType = {
            ...copiedItem,
            id: `${copiedItem.type}-${Date.now()}`,
            position: {
              x: Math.min(copiedItem.position.x + 1, 35),
              y: Math.min(copiedItem.position.y + 1, 35),
            },
            // Also offset endPosition for walls
            ...(copiedItem.endPosition && {
              endPosition: {
                x: Math.min(copiedItem.endPosition.x + 1, 35),
                y: Math.min(copiedItem.endPosition.y + 1, 35),
              },
            }),
          };
          const updatedItems = [...mapState.items, newItem];
          onMapStateChange?.({ ...mapState, items: updatedItems });
          setSelectedItem(newItem.id);
        } else if (copiedZone) {
          // Create new zone with unique ID and offset position
          const newZone: MapZoneType = {
            ...copiedZone,
            id: `zone-${Date.now()}`,
            position: {
              x: Math.min(copiedZone.position.x + 1, 35),
              y: Math.min(copiedZone.position.y + 1, 35),
            },
            label: `${copiedZone.label} (copy)`,
          };
          const updatedZones = [...mapState.zones, newZone];
          onMapStateChange?.({ ...mapState, zones: updatedZones });
          setSelectedZone(newZone.id);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDeleteItem, activeTool, selectedItem, selectedZone, mapState, onMapStateChange, copiedItem, copiedZone]);

  // Render grid lines (supports both square and hex grids)
  const renderGrid = () => {
    if (!settings.showGrid) return null;
    return gridUtils.renderGridElements(true);
  };

  // Render hovered grid highlight (supports both square and hex grids)
  const renderHoveredGrid = () => {
    if (!drag.cursorPosition || (!drag.draggedToken && !drag.draggedItem)) return null;

    const snappedPosition = gridUtils.snapToGrid(drag.cursorPosition);
    return gridUtils.renderCellHighlight(snappedPosition, '#fff', 0.1);
  };

  // Render grid coordinates (supports both square and hex grids)
  const renderCoordinates = () => {
    if (!settings.showCoordinates) return null;

    // For square grids, use the traditional inch markers
    // For hex grids, use axial coordinate labels
    if (gridType === 'hex') {
      return gridUtils.renderCoordinateLabels();
    }

    // Square grid: Display coordinates every 6 inches, plus the final edge at 35
    const coords: JSX.Element[] = [];
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

  // Render ruler (supports both square and hex grids)
  const renderRuler = () => {
    if (!sharedRulerState?.start || !sharedRulerState?.end) return null;

    // For hex grids, convert axial coords to pixels; for square grids, use direct conversion
    const startPixels = gridType === 'hex'
      ? gridUtils.positionToPixels(sharedRulerState.start)
      : { x: inchesToPixels(sharedRulerState.start.x), y: inchesToPixels(sharedRulerState.start.y) };
    const endPixels = gridType === 'hex'
      ? gridUtils.positionToPixels(sharedRulerState.end)
      : { x: inchesToPixels(sharedRulerState.end.x), y: inchesToPixels(sharedRulerState.end.y) };

    const x1 = startPixels.x;
    const y1 = startPixels.y;
    const x2 = endPixels.x;
    const y2 = endPixels.y;

    // Use gridUtils for consistent distance calculation
    const distance = gridUtils.getDistance(sharedRulerState.start, sharedRulerState.end);

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
    if (activeTool === 'pan') return viewport.isPanning ? 'cursor-grabbing' : 'cursor-grab';
    if (activeTool === 'ruler') return 'cursor-crosshair';
    if (activeTool === 'editor') return drag.draggedItem ? 'cursor-grabbing' : 'cursor-move';
    return drag.draggedToken ? 'cursor-grabbing' : 'cursor-default';
  };

  return (
    <div className="w-full relative" ref={containerRef}>
      {/* Toolbar */}
      <MapToolbar
        activeTool={activeTool}
        onToolChange={(tool) => {
          setActiveTool(tool);
          onRulerUpdate?.(null, null); // Clear ruler when changing tools
        }}
        zoom={viewport.zoom}
        onZoomIn={viewport.handleZoomIn}
        onZoomOut={viewport.handleZoomOut}
        onZoomReset={viewport.handleZoomReset}
        onFitToWindow={viewport.handleFitToWindow}
        onToggleSettings={() => setShowSettings(!showSettings)}
        showSettings={showSettings}
        selectedItemId={selectedItem}
        onDeleteItem={handleDeleteItem}
        onLoadMap={onLoadMap}
        onSaveGame={onSaveGame}
        onLoadGame={onLoadGame}
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

      {/* Map, Legend, and Dice Roller Container */}
      <div className="flex gap-4">
        {/* Alert Level, Map Legend, and Game Log (Left) */}
        <div className="flex-shrink-0 w-64 space-y-4">
          <AlertLevelIndicator
            characters={mapState.characters}
            alertModifier={alertModifier}
            onAlertModifierChange={onAlertModifierChange || (() => {})}
          />
          <MapLegend
            editorMode={activeTool === 'editor'}
            onAddItem={handleAddItem}
            onAddZone={handleAddZone}
            existingItems={mapState.items.map(item => item.type)}
            allItems={mapState.items}
            allZones={mapState.zones}
            allCharacters={mapState.characters}
            gameInfo={gameInfo}
            onImportMap={handleImportMap}
          />
          <GameLog entries={logEntries} />
        </div>

        {/* Map (Center) */}
        <svg
          ref={svgRef}
          width="100%"
          height={840}
          viewBox={`${viewport.viewBox.x} ${viewport.viewBox.y} ${viewport.viewBox.width} ${viewport.viewBox.height}`}
          className={`bg-gray-900 rounded-lg shadow-xl ${getCursorClass()}`}
          style={{ userSelect: 'none' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleSvgClick}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Grid background */}
          <rect width={inchesToPixels(MAP_SIZE_INCHES)} height={inchesToPixels(MAP_SIZE_INCHES)} fill="#1f2937" />

          {/* Grid lines */}
          <g>{renderGrid()}</g>

          {/* Grid coordinates */}
          <g>{renderCoordinates()}</g>

          {/* Hovered grid highlight */}
          {renderHoveredGrid()}

          {/* Map zones (below items) */}
          <g>
            {mapState.zones.map((zone) => {
              return (
                <MapZone
                  key={zone.id}
                  zone={zone}
                  isSelected={zone.id === selectedZone}
                  editorMode={activeTool === 'editor'}
                  onClick={handleZoneClick}
                  onMouseDown={(e) => handleZoneMouseDown(zone, e)}
                  onResizeHandleMouseDown={(e, handle) => handleResizeHandleMouseDown(zone, e, handle)}
                  isDragging={zone.id === drag.draggedZone}
                  gridType={gridType}
                  positionToPixels={gridUtils.positionToPixels}
                />
              );
            })}
          </g>

          {/* Map items */}
          {settings.showItems && (
            <g>
              {mapState.items
                .filter((item) => gridUtils.isWithinBounds(item.position))
                .map((item) => {
                  // Use temporary position if this item is being dragged
                  const displayItem = item.id === drag.draggedItem && drag.tempDragPosition
                    ? { ...item, position: drag.tempDragPosition }
                    : item;

                  return (
                    <MapItem
                      key={item.id}
                      item={displayItem}
                      onMouseDown={(e) => handleItemMouseDown(item, e)}
                      onClick={handleItemClick}
                      onDoubleClick={handleItemDoubleClick}
                      isSelected={item.id === selectedItem}
                      isDragging={item.id === drag.draggedItem}
                      gridType={gridType}
                      positionToPixels={gridUtils.positionToPixels}
                    />
                  );
                })}
            </g>
          )}

          {/* Character tokens */}
          <g>
            {mapState.characters
              .filter((token) => gridUtils.isWithinBounds(token.position))
              .map((token) => {
                // Use temporary position if this token is being dragged
                const displayToken = token.id === drag.draggedToken && drag.tempDragPosition
                  ? { ...token, position: drag.tempDragPosition }
                  : token;

                return (
                  <CharacterToken
                    key={token.id}
                    token={displayToken}
                    onMouseDown={handleTokenMouseDown}
                    isDragging={token.id === drag.draggedToken}
                    selectingPlayers={getSelectingPlayers(token.id)}
                    gridType={gridType}
                    positionToPixels={gridUtils.positionToPixels}
                  />
                );
            })}
          </g>

          {/* Ruler */}
          {renderRuler()}
        </svg>

        {/* Dice Roller and Selection Info (Right) */}
        <div className="flex-shrink-0 w-64 space-y-4">
          <DiceRoller
            onRoll={onDiceRoll}
            lastRoll={lastDiceRoll}
          />

          {/* Character Selection Info Panel */}
          {(() => {
            const character = getCurrentPlayerSelection();
            if (!character) return null;
            return (
              <CharacterSelectionPanel
                character={character}
                onActionUpdate={onActionUpdate}
                onExhaustToggle={onExhaustToggle}
              />
            );
          })()}

          {/* Enemy Unit Selection Info Panel */}
          {(() => {
            if (!selectedItem) return null;
            const item = mapState.items.find(i => i.id === selectedItem);
            if (!item || !isEnemyUnit(item.type)) return null;
            return <EnemyInfoPanel item={item} />;
          })()}

          {/* Gear Item Selection Panel */}
          {(() => {
            if (!selectedItem) return null;
            const item = mapState.items.find(i => i.id === selectedItem);
            if (!item || item.type !== 'gear') return null;
            return (
              <GearItemPanel
                item={item}
                mapState={mapState}
                onMapStateChange={onMapStateChange}
              />
            );
          })()}
        </div>
      </div>

      {/* Zone Properties Panel */}
      {selectedZone && activeTool === 'editor' && (
        <ZonePropertiesPanel
          zone={mapState.zones.find((z) => z.id === selectedZone)!}
          onUpdate={handleZoneUpdate}
          onClose={() => setSelectedZone(null)}
          gridType={gridType}
        />
      )}
    </div>
  );
};

export default GameMap;
