import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { MapState, CharacterToken as CharacterTokenType, MapItem as MapItemType, MapZone as MapZoneType, Position, ItemType, PlayerSelection, GridType } from '../types';
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
import MapZone from './MapZone';
import ZonePropertiesPanel from './ZonePropertiesPanel';
import MapToolbar, { MapTool } from './MapToolbar';
import MapSettings from './MapSettings';
import MapLegend from './MapLegend';
import DiceRoller from './DiceRoller';
import GameLog, { LogEntry } from './GameLog';
import { getRoleAbilities } from '../data/roleAbilities';
import { getEquipmentByIds, getAllEquipment, getEquipmentById } from '../data/equipmentLoader';
import { isMovableEnemy, getEnemyStats, isEnemyUnit } from '../data/enemyStats';
import { createGridUtils, GridUtils } from '../data/gridUtils';
import { getStateInfo } from '../data/stateAbilities';
import { getActionCost, canSelectAction, getActionCostDisplay } from '../data/actionCosts';

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
}

/**
 * Generate available actions for a character based on their stats, role, equipment, and state
 */
const getAvailableActions = (character: CharacterTokenType): string[] => {
  // Get state info to check for state-based action restrictions
  const stateInfo = getStateInfo(character.state);

  // If state has exclusive actions, only those actions are available
  if (stateInfo.exclusiveActions) {
    // Return only the state's additional actions (or empty if none)
    if (stateInfo.additionalActions && stateInfo.additionalActions.length > 0) {
      return stateInfo.additionalActions.map(action => action.name);
    }
    // No actions available (e.g., Unconscious)
    return [];
  }

  const actions: string[] = [];

  // Core actions with stats
  actions.push(`Move (${character.stats.movement}")`);
  actions.push(`Hack (${character.stats.hack}+)`);
  actions.push(`Con (${character.stats.con}+)`);

  // Role-specific abilities
  const roleAbilities = getRoleAbilities(character.role);
  roleAbilities.forEach(ability => {
    actions.push(ability);
  });

  // Equipment-based actions
  const equipment = getEquipmentByIds(character.equipment || []);
  let hasMeleeWeapon = false;

  equipment.forEach(item => {
    if (item.type === 'Ranged') {
      actions.push(`${item.id} (BS ${character.stats.ballisticSkill}+)`);
    } else if (item.type === 'Thrown') {
      actions.push(`${item.id} (BS ${character.stats.ballisticSkill}+)`);
    } else if (item.type === 'Melee') {
      hasMeleeWeapon = true;
      actions.push(`${item.id} (MS ${character.stats.meleeSkill}+)`);
    }
  });

  // Add Fist as default melee weapon if no melee weapon equipped
  if (!hasMeleeWeapon) {
    actions.push(`Fist (MS ${character.stats.meleeSkill}+)`);
  }

  // Add state-based additional actions (non-exclusive states like Hidden, Disguised)
  if (stateInfo.additionalActions) {
    stateInfo.additionalActions.forEach(action => {
      actions.push(action.name);
    });
  }

  return actions;
};

const GameMap: React.FC<GameMapProps> = ({
  mapState,
  onMapStateChange,
  onSelectionChange,
  readOnly = false,
  gridType = 'square',
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

  // Tool and view state
  const [activeTool, setActiveTool] = useState<MapTool>('select');
  const [zoom, setZoom] = useState(1);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: SVG_WIDTH, height: SVG_HEIGHT });

  // Dragging state
  const [draggedToken, setDraggedToken] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [draggedZone, setDraggedZone] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [, setHoveredGrid] = useState<Position | null>(null);
  const [cursorPosition, setCursorPosition] = useState<Position | null>(null);
  const [dragOffset, setDragOffset] = useState<Position | null>(null);
  const [tempDragPosition, setTempDragPosition] = useState<Position | null>(null);
  const tempDragPositionRef = useRef<Position | null>(null);
  const [dragStartPosition, setDragStartPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingConfirmed, setIsDraggingConfirmed] = useState(false);

  // Zone resizing state
  const [resizingZone, setResizingZone] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w' | null>(null);
  const [resizeStartSize, setResizeStartSize] = useState<{ width: number; height: number; position: Position } | null>(null);
  const [resizeStartCursor, setResizeStartCursor] = useState<Position | null>(null);
  const [zoneCounter, setZoneCounter] = useState(1);

  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    showGrid: true,
    showCoordinates: true,
    showItems: true,
    snapToGrid: true,
  });

  // Gear equipment assignments (gear item ID -> equipment ID)
  const [gearEquipment, setGearEquipment] = useState<Record<string, string>>({});

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

  // Handle keyboard controls for moving selected tokens (WASD)
  useEffect(() => {
    if (readOnly || activeTool !== 'select') return;

    const handleKeyDown = (e: KeyboardEvent) => {
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
        newPosition = snapToGridUtil(newPosition);
      }

      // Update the selected token's position
      const updatedCharacters = mapState.characters.map(char =>
        char.id === selectedToken.id ? { ...char, position: newPosition } : char
      );

      onMapStateChange?.({ ...mapState, characters: updatedCharacters });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readOnly, activeTool, mapState, onMapStateChange, settings.snapToGrid, getCurrentPlayerSelection]);

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

      // Right-click pan - works with any tool
      if (e.button === 2) {
        e.preventDefault(); // Prevent context menu
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
        return;
      }

      // Left-click tool-specific behavior
      if (activeTool === 'pan') {
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
      } else if (activeTool === 'ruler') {
        const posInches = { x: pixelsToInches(svgCoords.x), y: pixelsToInches(svgCoords.y) };
        onRulerUpdate?.(posInches, posInches);
      }
    },
    [activeTool, readOnly, screenToSVG, onRulerUpdate]
  );

  // Handle token drag start and selection
  const handleTokenMouseDown = useCallback(
    (token: CharacterTokenType, e: React.MouseEvent) => {
      if (readOnly || activeTool !== 'select') return;

      // Check if current player already has this character selected
      const currentSelection = playerSelections.find(sel => sel.playerId === currentPlayerId);
      const isCurrentlySelected = currentSelection?.characterId === token.id;

      // Notify parent of selection change (toggle selection)
      if (isCurrentlySelected) {
        onSelectionChange?.(null); // Deselect
      } else {
        onSelectionChange?.(token.id); // Select this character
      }

      // Store initial mouse position for drag threshold
      setDragStartPosition({ x: e.clientX, y: e.clientY });
      setIsDraggingConfirmed(false);

      // Calculate offset from cursor to token center for dragging
      const svgCoords = screenToSVG(e.clientX, e.clientY);
      const posInches = { x: pixelsToInches(svgCoords.x), y: pixelsToInches(svgCoords.y) };
      const offset = {
        x: token.position.x - posInches.x,
        y: token.position.y - posInches.y
      };

      setDraggedToken(token.id);
      setDragOffset(offset);
    },
    [readOnly, activeTool, screenToSVG, playerSelections, currentPlayerId, onSelectionChange]
  );

  // Handle item drag start (editor mode or movable enemies in select mode)
  const handleItemMouseDown = useCallback(
    (item: MapItemType, e: React.MouseEvent) => {
      if (readOnly) return;

      // Allow dragging in editor mode, or in select mode if it's a movable enemy
      const canDrag = activeTool === 'editor' || (activeTool === 'select' && isMovableEnemy(item.type));
      if (!canDrag) return;

      // For draggable items, select them immediately
      setSelectedItem(item.id);

      // Store initial mouse position for drag threshold
      setDragStartPosition({ x: e.clientX, y: e.clientY });
      setIsDraggingConfirmed(false);

      // Calculate offset from cursor to item center
      const svgCoords = screenToSVG(e.clientX, e.clientY);
      const posInches = { x: pixelsToInches(svgCoords.x), y: pixelsToInches(svgCoords.y) };
      const offset = {
        x: item.position.x - posInches.x,
        y: item.position.y - posInches.y
      };

      setDraggedItem(item.id);
      setDragOffset(offset);
    },
    [readOnly, activeTool, screenToSVG]
  );

  // Add new item to map (editor mode)
  const handleAddItem = useCallback(
    (itemType: ItemType) => {
      if (readOnly) return;

      // Find a default position (center of map)
      const newItem: MapItemType = {
        id: `item-${Date.now()}`,
        type: itemType,
        position: { x: 18, y: 18 }, // Center of 36x36 map
        size: 1,
      };

      onMapStateChange?.({
        ...mapState,
        items: [...mapState.items, newItem]
      });
    },
    [readOnly, mapState, onMapStateChange]
  );

  // Add new zone to map (editor mode)
  const handleAddZone = useCallback(() => {
    if (readOnly) return;

    const newZone: MapZoneType = {
      id: `zone-${Date.now()}`,
      position: { x: 15, y: 15 }, // Near center
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
  }, [readOnly, mapState, onMapStateChange, zoneCounter]);

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

      // Calculate offset from cursor to zone top-left
      const svgCoords = screenToSVG(e.clientX, e.clientY);
      const posInches = { x: pixelsToInches(svgCoords.x), y: pixelsToInches(svgCoords.y) };
      const offset = {
        x: zone.position.x - posInches.x,
        y: zone.position.y - posInches.y
      };

      setDraggedZone(zone.id);
      setDragOffset(offset);
    },
    [readOnly, activeTool, screenToSVG]
  );

  // Handle zone resize start
  const handleResizeHandleMouseDown = useCallback(
    (zone: MapZoneType, e: React.MouseEvent, handle: 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w') => {
      if (readOnly || activeTool !== 'editor') return;
      e.stopPropagation();

      const svgCoords = screenToSVG(e.clientX, e.clientY);
      const posInches = { x: pixelsToInches(svgCoords.x), y: pixelsToInches(svgCoords.y) };

      setResizingZone(zone.id);
      setResizeHandle(handle);
      setResizeStartSize({ width: zone.width, height: zone.height, position: zone.position });
      setResizeStartCursor(posInches);
    },
    [readOnly, activeTool, screenToSVG]
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
      if (sharedRulerState?.start && activeTool === 'ruler') {
        onRulerUpdate?.(sharedRulerState.start, posInches);
        return;
      }

      // Handle token dragging
      if (draggedToken && activeTool === 'select' && dragOffset) {
        // Check if we've exceeded the drag threshold
        if (!isDraggingConfirmed && dragStartPosition) {
          const dx = e.clientX - dragStartPosition.x;
          const dy = e.clientY - dragStartPosition.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const DRAG_THRESHOLD = 5; // pixels

          if (distance > DRAG_THRESHOLD) {
            setIsDraggingConfirmed(true);
          } else {
            // Haven't moved enough yet, don't drag
            return;
          }
        }

        // Apply drag offset to keep item under cursor
        const adjustedPos = {
          x: posInches.x + dragOffset.x,
          y: posInches.y + dragOffset.y
        };
        const snapPos = settings.snapToGrid ? snapToGridUtil(adjustedPos) : adjustedPos;
        setHoveredGrid(snapPos);
        setCursorPosition(adjustedPos); // Track actual cursor position for shadow

        // Update ref immediately (no re-render)
        tempDragPositionRef.current = adjustedPos;

        // Schedule state update on next animation frame for smooth rendering
        requestAnimationFrame(() => {
          setTempDragPosition(adjustedPos);
        });
      }

      // Handle item dragging (editor mode or movable enemies in select mode)
      if (draggedItem && dragOffset) {
        const item = mapState.items.find(i => i.id === draggedItem);
        const canDrag = activeTool === 'editor' || (activeTool === 'select' && item && isMovableEnemy(item.type));

        if (canDrag) {
          // Check if we've exceeded the drag threshold
          if (!isDraggingConfirmed && dragStartPosition) {
            const dx = e.clientX - dragStartPosition.x;
            const dy = e.clientY - dragStartPosition.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const DRAG_THRESHOLD = 5; // pixels

            if (distance > DRAG_THRESHOLD) {
              setIsDraggingConfirmed(true);
            } else {
              // Haven't moved enough yet, don't drag
              return;
            }
          }

          // Apply drag offset to keep item under cursor
          const adjustedPos = {
            x: posInches.x + dragOffset.x,
            y: posInches.y + dragOffset.y
          };
          const snapPos = settings.snapToGrid ? snapToGridUtil(adjustedPos) : adjustedPos;
          setHoveredGrid(snapPos);
          setCursorPosition(adjustedPos);

          // Update ref immediately (no re-render)
          tempDragPositionRef.current = adjustedPos;

          // Schedule state update on next animation frame for smooth rendering
          requestAnimationFrame(() => {
            setTempDragPosition(adjustedPos);
          });
        }
      }

      // Handle zone dragging (editor mode)
      if (draggedZone && activeTool === 'editor' && dragOffset) {
        const adjustedPos = {
          x: posInches.x + dragOffset.x,
          y: posInches.y + dragOffset.y
        };
        const snapPos = settings.snapToGrid ? snapToGridUtil(adjustedPos) : adjustedPos;

        const updatedZones = mapState.zones.map((z) =>
          z.id === draggedZone ? { ...z, position: snapPos } : z
        );
        onMapStateChange?.({ ...mapState, zones: updatedZones });
      }

      // Handle zone resizing (editor mode)
      if (resizingZone && resizeHandle && resizeStartSize && resizeStartCursor && activeTool === 'editor') {
        const zone = mapState.zones.find((z) => z.id === resizingZone);
        if (!zone) return;

        const dx = posInches.x - resizeStartCursor.x;
        const dy = posInches.y - resizeStartCursor.y;

        let newWidth = resizeStartSize.width;
        let newHeight = resizeStartSize.height;
        let newPosition = { ...resizeStartSize.position };

        // Calculate new size and position based on handle
        switch (resizeHandle) {
          case 'nw':
            newWidth = Math.max(1, resizeStartSize.width - dx);
            newHeight = Math.max(1, resizeStartSize.height - dy);
            newPosition.x = resizeStartSize.position.x + (resizeStartSize.width - newWidth);
            newPosition.y = resizeStartSize.position.y + (resizeStartSize.height - newHeight);
            break;
          case 'ne':
            newWidth = Math.max(1, resizeStartSize.width + dx);
            newHeight = Math.max(1, resizeStartSize.height - dy);
            newPosition.y = resizeStartSize.position.y + (resizeStartSize.height - newHeight);
            break;
          case 'se':
            newWidth = Math.max(1, resizeStartSize.width + dx);
            newHeight = Math.max(1, resizeStartSize.height + dy);
            break;
          case 'sw':
            newWidth = Math.max(1, resizeStartSize.width - dx);
            newHeight = Math.max(1, resizeStartSize.height + dy);
            newPosition.x = resizeStartSize.position.x + (resizeStartSize.width - newWidth);
            break;
          case 'n':
            newHeight = Math.max(1, resizeStartSize.height - dy);
            newPosition.y = resizeStartSize.position.y + (resizeStartSize.height - newHeight);
            break;
          case 'e':
            newWidth = Math.max(1, resizeStartSize.width + dx);
            break;
          case 's':
            newHeight = Math.max(1, resizeStartSize.height + dy);
            break;
          case 'w':
            newWidth = Math.max(1, resizeStartSize.width - dx);
            newPosition.x = resizeStartSize.position.x + (resizeStartSize.width - newWidth);
            break;
        }

        // Snap to grid: round width, height, and position to integers
        newWidth = Math.round(newWidth);
        newHeight = Math.round(newHeight);
        newPosition.x = Math.round(newPosition.x);
        newPosition.y = Math.round(newPosition.y);

        const updatedZones = mapState.zones.map((z) =>
          z.id === resizingZone ? { ...z, width: newWidth, height: newHeight, position: newPosition } : z
        );
        onMapStateChange?.({ ...mapState, zones: updatedZones });
      }
    },
    [
      screenToSVG,
      isPanning,
      panStart,
      zoom,
      sharedRulerState,
      onRulerUpdate,
      activeTool,
      draggedToken,
      draggedItem,
      draggedZone,
      dragOffset,
      settings.snapToGrid,
      resizingZone,
      resizeHandle,
      resizeStartSize,
      resizeStartCursor,
      mapState,
      onMapStateChange,
      isDraggingConfirmed,
      dragStartPosition,
    ]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    // End panning
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
    }

    // End ruler - keep it visible after mouse up
    // (ruler state is managed in parent via sharedRulerState)

    // End token dragging
    if (draggedToken) {
      // Only update position if dragging was confirmed (exceeded threshold)
      if (isDraggingConfirmed && tempDragPositionRef.current) {
        let finalPosition = tempDragPositionRef.current;
        if (settings.snapToGrid) {
          finalPosition = snapToGridUtil(tempDragPositionRef.current);
        }

        if (!isWithinBounds(finalPosition)) {
          finalPosition.x = Math.max(0, Math.min(35, finalPosition.x));
          finalPosition.y = Math.max(0, Math.min(35, finalPosition.y));
        }

        const updatedCharacters = mapState.characters.map((t) =>
          t.id === draggedToken ? { ...t, position: finalPosition } : t
        );

        onMapStateChange?.({ ...mapState, characters: updatedCharacters });
      }

      setDraggedToken(null);
      setDragOffset(null);
      setTempDragPosition(null);
      tempDragPositionRef.current = null;
      setHoveredGrid(null);
      setCursorPosition(null);
      setDragStartPosition(null);
      setIsDraggingConfirmed(false);
    }

    // End item dragging (editor mode or movable enemies in select mode)
    if (draggedItem) {
      const item = mapState.items.find(i => i.id === draggedItem);
      const canDrag = activeTool === 'editor' || (activeTool === 'select' && item && isMovableEnemy(item.type));

      // Only update position if dragging was confirmed (exceeded threshold)
      if (canDrag && isDraggingConfirmed && tempDragPositionRef.current) {
        let finalPosition = tempDragPositionRef.current;
        if (settings.snapToGrid) {
          finalPosition = snapToGridUtil(tempDragPositionRef.current);
        }

        if (!isWithinBounds(finalPosition)) {
          finalPosition.x = Math.max(0, Math.min(35, finalPosition.x));
          finalPosition.y = Math.max(0, Math.min(35, finalPosition.y));
        }

        const updatedItems = mapState.items.map((i) =>
          i.id === draggedItem ? { ...i, position: finalPosition } : i
        );

        onMapStateChange?.({ ...mapState, items: updatedItems });
      }

      setDraggedItem(null);
      setDragOffset(null);
      setTempDragPosition(null);
      tempDragPositionRef.current = null;
      setHoveredGrid(null);
      setCursorPosition(null);
      setDragStartPosition(null);
      setIsDraggingConfirmed(false);
    }

    // End zone dragging (editor mode)
    if (draggedZone) {
      setDraggedZone(null);
      setDragOffset(null);
    }

    // End zone resizing (editor mode)
    if (resizingZone) {
      setResizingZone(null);
      setResizeHandle(null);
      setResizeStartSize(null);
      setResizeStartCursor(null);
    }
  }, [isPanning, activeTool, draggedToken, draggedItem, draggedZone, resizingZone, mapState, onMapStateChange, settings.snapToGrid, isDraggingConfirmed]);


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

  // Handle keyboard events for delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't trigger if user is typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        e.preventDefault();
        handleDeleteItem();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDeleteItem]);

  // Calculate distance for ruler
  const calculateDistance = useCallback((start: Position, end: Position) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Render grid lines (supports both square and hex grids)
  const renderGrid = () => {
    if (!settings.showGrid) return null;
    return gridUtils.renderGridElements(true);
  };

  // Render hovered grid highlight (supports both square and hex grids)
  const renderHoveredGrid = () => {
    if (!cursorPosition || (!draggedToken && !draggedItem)) return null;

    // For square grids, snap to grid center; for hex grids, use the current position
    const snappedPosition = gridUtils.snapToGrid(cursorPosition);
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
    if (activeTool === 'pan') return isPanning ? 'cursor-grabbing' : 'cursor-grab';
    if (activeTool === 'ruler') return 'cursor-crosshair';
    if (activeTool === 'editor') return draggedItem ? 'cursor-grabbing' : 'cursor-move';
    return draggedToken ? 'cursor-grabbing' : 'cursor-default';
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
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onFitToWindow={handleFitToWindow}
        onToggleSettings={() => setShowSettings(!showSettings)}
        showSettings={showSettings}
        selectedItemId={selectedItem}
        onDeleteItem={handleDeleteItem}
        onLoadMap={onLoadMap}
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
        {/* Map Legend and Game Log (Left) */}
        <div className="flex-shrink-0 w-64 space-y-4">
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
          height={600}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          className={`bg-gray-900 rounded-lg shadow-xl ${getCursorClass()}`}
          style={{ userSelect: 'none' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
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
                  isDragging={zone.id === draggedZone}
                />
              );
            })}
          </g>

          {/* Map items */}
          {settings.showItems && (
            <g>
              {mapState.items.map((item) => {
                // Use temporary position if this item is being dragged
                const displayItem = item.id === draggedItem && tempDragPosition
                  ? { ...item, position: tempDragPosition }
                  : item;

                return (
                  <MapItem
                    key={item.id}
                    item={displayItem}
                    onMouseDown={(e) => handleItemMouseDown(item, e)}
                    onClick={handleItemClick}
                    isSelected={item.id === selectedItem}
                    isDragging={item.id === draggedItem}
                  />
                );
              })}
            </g>
          )}

          {/* Character tokens */}
          <g>
            {mapState.characters.map((token) => {
              // Use temporary position if this token is being dragged
              const displayToken = token.id === draggedToken && tempDragPosition
                ? { ...token, position: tempDragPosition }
                : token;

              return (
                <CharacterToken
                  key={token.id}
                  token={displayToken}
                  onMouseDown={handleTokenMouseDown}
                  isDragging={token.id === draggedToken}
                  selectingPlayers={getSelectingPlayers(token.id)}
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

            const handleActionChange = (slotIndex: number, actionName: string) => {
              if (!onActionUpdate) return;
              const currentActions = character.actions || [];
              const newActions = [...currentActions];

              // First, clear any continuation slots from the previous action in this slot
              const previousAction = newActions[slotIndex];
              if (previousAction && !previousAction.startsWith('[')) {
                const previousCost = getActionCost(previousAction);
                // Clear this slot and any continuation slots from the old action
                for (let i = 0; i < previousCost && slotIndex + i < 3; i++) {
                  newActions[slotIndex + i] = '';
                }
              }

              if (actionName === '') {
                // Just clearing - already handled above
                // Clean up empty trailing slots
                while (newActions.length > 0 && newActions[newActions.length - 1] === '') {
                  newActions.pop();
                }
              } else {
                const cost = getActionCost(actionName);
                // Set the action in the selected slot
                newActions[slotIndex] = actionName;
                // For multi-slot actions, fill subsequent slots with continuation marker
                for (let i = 1; i < cost && slotIndex + i < 3; i++) {
                  newActions[slotIndex + i] = `[${actionName} cont.]`;
                }
              }

              onActionUpdate(character.id, newActions);
            };

            // Check if a slot is a continuation of a multi-slot action
            const isContinuationSlot = (slotIndex: number): boolean => {
              const currentAction = character.actions?.[slotIndex] || '';
              return currentAction.startsWith('[') && currentAction.endsWith(' cont.]');
            };

            return (
              <div className="bg-purple-900/30 border border-purple-500/50 p-4 rounded-lg">
                {/* Name and Position Header */}
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-sm font-bold text-white">{character.name}</h3>
                  <span className="text-xs text-gray-400">
                    ({character.position.x.toFixed(1)}", {character.position.y.toFixed(1)}")
                  </span>
                </div>

                {/* Character Stats Summary */}
                <div className="mb-3 p-2 bg-gray-800/50 rounded">
                  <p className="text-xs font-semibold text-purple-400 mb-1">Stats:</p>
                  <div className="grid grid-cols-4 gap-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">W:</span>
                      <span className="text-white font-semibold">{character.stats.wounds}/{character.stats.maxWounds}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">M:</span>
                      <span className="text-white font-semibold">{character.stats.movement}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">MS:</span>
                      <span className="text-white font-semibold">{character.stats.meleeSkill}+</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">BS:</span>
                      <span className="text-white font-semibold">{character.stats.ballisticSkill}+</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">D:</span>
                      <span className="text-white font-semibold">{character.stats.defense}+</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">H:</span>
                      <span className="text-white font-semibold">{character.stats.hack}+</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">C:</span>
                      <span className="text-white font-semibold">{character.stats.con}+</span>
                    </div>
                  </div>
                </div>

                {/* Character State Section */}
                {(() => {
                  const stateInfo = getStateInfo(character.state);
                  return (
                    <div className="mb-3 p-2 bg-gray-800/50 rounded">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-xs font-semibold text-purple-400">State:</p>
                        <span className={`text-xs font-bold ${stateInfo.color}`}>{stateInfo.name}</span>
                      </div>
                      <div className="space-y-1">
                        {stateInfo.abilities.map((ability, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="text-xs text-gray-300 mb-1">{ability.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Actions Section */}
                <div className="space-y-2 mb-3">
                  <p className="text-xs font-semibold text-purple-400">Actions:</p>

                  {[0, 1, 2].map((slotIndex) => {
                    const currentAction = character.actions?.[slotIndex] || '';
                    const availableActions = getAvailableActions(character);
                    const isContinuation = isContinuationSlot(slotIndex);

                    // If this is a continuation slot, show a disabled indicator
                    if (isContinuation) {
                      const parentAction = currentAction.replace(/^\[/, '').replace(/ cont\.]$/, '');
                      return (
                        <div
                          key={slotIndex}
                          className="w-full px-2 py-1.5 bg-gray-700 border border-yellow-500/50 rounded text-yellow-400 text-xs italic"
                        >
                          ↳ {parentAction} (continued)
                        </div>
                      );
                    }

                    return (
                      <select
                        key={slotIndex}
                        value={currentAction}
                        onChange={(e) => handleActionChange(slotIndex, e.target.value)}
                        className="w-full px-2 py-1.5 bg-gray-800 border border-purple-500/30 rounded text-white text-xs hover:border-purple-500/50 focus:outline-none focus:border-purple-500"
                      >
                        <option value="">-- Select Action --</option>
                        {availableActions.map((action) => {
                          const costDisplay = getActionCostDisplay(action);
                          const canFit = canSelectAction(action, slotIndex, 3);
                          return (
                            <option
                              key={action}
                              value={action}
                              disabled={!canFit}
                              className={!canFit ? 'text-gray-500' : ''}
                            >
                              {action}{costDisplay ? ` ${costDisplay}` : ''}
                            </option>
                          );
                        })}
                      </select>
                    );
                  })}
                </div>

                {/* Exhaust Button */}
                {onExhaustToggle && (
                  <button
                    onClick={() => onExhaustToggle(character.id)}
                    className="w-full px-3 py-2 rounded-lg font-semibold text-white text-xs transition-all bg-purple-600 hover:bg-purple-700 active:scale-95"
                  >
                    {character.exhausted ? 'Unexhaust Character' : 'Exhaust Character'}
                  </button>
                )}
              </div>
            );
          })()}

          {/* Enemy Unit Selection Info Panel */}
          {(() => {
            if (!selectedItem) return null;
            const item = mapState.items.find(i => i.id === selectedItem);
            if (!item || !isEnemyUnit(item.type)) return null;

            const enemyStats = getEnemyStats(item.type);
            if (!enemyStats) return null;

            return (
              <div className="bg-red-900/30 border border-red-500/50 p-4 rounded-lg">
                {/* Name and Position Header */}
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-sm font-bold text-white">{enemyStats.name}</h3>
                  <span className="text-xs text-gray-400">
                    ({item.position.x.toFixed(1)}", {item.position.y.toFixed(1)}")
                  </span>
                </div>

                {/* Stats Display */}
                <div className="space-y-1 text-xs text-white">
                  {enemyStats.movement !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">M:</span>
                      <span className="font-semibold">{enemyStats.movement}</span>
                    </div>
                  )}
                  {enemyStats.meleeSkill !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">MS:</span>
                      <span className="font-semibold">{enemyStats.meleeSkill}</span>
                    </div>
                  )}
                  {enemyStats.ballisticSkill !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">BS:</span>
                      <span className="font-semibold">{enemyStats.ballisticSkill}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">W:</span>
                    <span className="font-semibold">{enemyStats.wounds}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Def:</span>
                    <span className="font-semibold">{enemyStats.defense}</span>
                  </div>
                  {enemyStats.range !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Range:</span>
                      <span className="font-semibold">{enemyStats.range}"</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Dam:</span>
                    <span className="font-semibold">{enemyStats.damage}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Gear Item Selection Panel */}
          {(() => {
            if (!selectedItem) return null;
            const item = mapState.items.find(i => i.id === selectedItem);
            if (!item || item.type !== 'gear') return null;

            const allEquipment = getAllEquipment();
            const selectedEquipmentId = gearEquipment[item.id] || '';
            const selectedEquipment = selectedEquipmentId ? getEquipmentById(selectedEquipmentId) : null;

            return (
              <div className="bg-yellow-900/30 border border-yellow-500/50 p-4 rounded-lg">
                {/* Name and Position Header */}
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-sm font-bold text-white">Gear</h3>
                  <span className="text-xs text-gray-400">
                    ({item.position.x.toFixed(1)}", {item.position.y.toFixed(1)}")
                  </span>
                </div>

                {/* Equipment Selection Dropdown */}
                <div className="mb-3">
                  <p className="text-xs font-semibold text-yellow-400 mb-2">Equipment:</p>
                  <div className="flex gap-2">
                    <select
                      value={selectedEquipmentId}
                      onChange={(e) => {
                        setGearEquipment(prev => ({
                          ...prev,
                          [item.id]: e.target.value
                        }));
                      }}
                      className="flex-1 px-2 py-1.5 bg-gray-800 border border-yellow-500/30 rounded text-white text-xs hover:border-yellow-500/50 focus:outline-none focus:border-yellow-500"
                    >
                      <option value="">-- Select Equipment --</option>
                      {allEquipment.map((equip) => (
                        <option key={equip.id} value={equip.id}>{equip.id}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const randomIndex = Math.floor(Math.random() * allEquipment.length);
                        const randomEquip = allEquipment[randomIndex];
                        setGearEquipment(prev => ({
                          ...prev,
                          [item.id]: randomEquip.id
                        }));
                      }}
                      className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors font-semibold"
                      title="Select random equipment"
                    >
                      Random
                    </button>
                  </div>
                </div>

                {/* Equipment Stats Display */}
                {selectedEquipment && (
                  <div className="space-y-1 text-xs text-white">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Type:</span>
                      <span className="font-semibold">{selectedEquipment.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Cost:</span>
                      <span className="font-semibold">{selectedEquipment.Cost}</span>
                    </div>
                    {selectedEquipment.Attacks !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Attacks:</span>
                        <span className="font-semibold">{selectedEquipment.Attacks}</span>
                      </div>
                    )}
                    {selectedEquipment.Range !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Range:</span>
                        <span className="font-semibold">{selectedEquipment.Range}"</span>
                      </div>
                    )}
                    {selectedEquipment.Damage !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Damage:</span>
                        <span className="font-semibold">{selectedEquipment.Damage}</span>
                      </div>
                    )}
                    {selectedEquipment.Size !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Size:</span>
                        <span className="font-semibold">{selectedEquipment.Size}</span>
                      </div>
                    )}
                    {selectedEquipment.Description && (
                      <div className="mt-2 pt-2 border-t border-yellow-500/30">
                        <p className="text-gray-300 italic">{selectedEquipment.Description}</p>
                      </div>
                    )}
                    {selectedEquipment.Notice && Object.keys(selectedEquipment.Notice).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-yellow-500/30">
                        <p className="text-xs font-semibold text-yellow-400 mb-1">Notice:</p>
                        {Object.entries(selectedEquipment.Notice).map(([key, value]) => (
                          value && <div key={key} className="text-xs text-gray-300">• {key}</div>
                        ))}
                      </div>
                    )}
                    {selectedEquipment.Special && Object.keys(selectedEquipment.Special).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-yellow-500/30">
                        <p className="text-xs font-semibold text-yellow-400 mb-1">Special:</p>
                        {Object.entries(selectedEquipment.Special).map(([key, value]) => (
                          value && <div key={key} className="text-xs text-gray-300">• {key}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
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
        />
      )}
    </div>
  );
};

export default GameMap;
