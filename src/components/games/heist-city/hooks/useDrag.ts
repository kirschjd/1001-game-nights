import { useRef, useState, useCallback } from 'react';
import { Position, MapZone as MapZoneType } from '../types';
import { pixelsToInches } from '../data/mapConstants';
import { GridUtils } from '../data/gridUtils';

export type ResizeHandle = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w';

export interface DragResult {
  type: 'token' | 'item';
  id: string;
  position: Position;
}

export interface UseDragOptions {
  gridUtils: GridUtils;
  screenToSVG: (clientX: number, clientY: number) => { x: number; y: number };
  snapToGrid: boolean;
  onZoneMove?: (zoneId: string, position: Position) => void;
  onZoneResize?: (zoneId: string, width: number, height: number, position: Position) => void;
}

export interface UseDragReturn {
  // State for rendering
  draggedToken: string | null;
  draggedItem: string | null;
  draggedZone: string | null;
  tempDragPosition: Position | null;
  cursorPosition: Position | null;
  resizingZone: string | null;
  justFinishedDragRef: React.MutableRefObject<boolean>;

  // Start functions
  startTokenDrag: (tokenId: string, tokenPosition: Position, e: React.MouseEvent) => void;
  startItemDrag: (itemId: string, itemPosition: Position, e: React.MouseEvent) => void;
  startZoneDrag: (zoneId: string, zonePosition: Position, e: React.MouseEvent) => void;
  startZoneResize: (zone: MapZoneType, e: React.MouseEvent, handle: ResizeHandle) => void;

  // Move/end
  handleDragMove: (e: React.MouseEvent) => void;
  handleDragEnd: () => DragResult | null;
}

export function useDrag(options: UseDragOptions): UseDragReturn {
  // Store options in refs to avoid recreating callbacks when they change
  const gridUtilsRef = useRef(options.gridUtils);
  gridUtilsRef.current = options.gridUtils;
  const screenToSVGRef = useRef(options.screenToSVG);
  screenToSVGRef.current = options.screenToSVG;
  const snapToGridRef = useRef(options.snapToGrid);
  snapToGridRef.current = options.snapToGrid;
  const onZoneMoveRef = useRef(options.onZoneMove);
  onZoneMoveRef.current = options.onZoneMove;
  const onZoneResizeRef = useRef(options.onZoneResize);
  onZoneResizeRef.current = options.onZoneResize;

  // Drag state
  const [draggedToken, setDraggedToken] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [draggedZone, setDraggedZone] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Position | null>(null);
  const [tempDragPosition, setTempDragPosition] = useState<Position | null>(null);
  const tempDragPositionRef = useRef<Position | null>(null);
  const [cursorPosition, setCursorPosition] = useState<Position | null>(null);
  const [dragStartPosition, setDragStartPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingConfirmed, setIsDraggingConfirmed] = useState(false);

  // Zone resize state
  const [resizingZone, setResizingZone] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
  const [resizeStartSize, setResizeStartSize] = useState<{ width: number; height: number; position: Position } | null>(null);
  const [resizeStartCursor, setResizeStartCursor] = useState<Position | null>(null);

  // Track if we just finished a drag (to prevent click from clearing selection)
  const justFinishedDragRef = useRef(false);

  // Use refs for drag state that handleDragMove/End need to read
  // (avoids dependency array bloat while still reading fresh values)
  const draggedTokenRef = useRef(draggedToken);
  draggedTokenRef.current = draggedToken;
  const draggedItemRef = useRef(draggedItem);
  draggedItemRef.current = draggedItem;
  const draggedZoneRef = useRef(draggedZone);
  draggedZoneRef.current = draggedZone;
  const dragOffsetRef = useRef(dragOffset);
  dragOffsetRef.current = dragOffset;
  const isDraggingConfirmedRef = useRef(isDraggingConfirmed);
  isDraggingConfirmedRef.current = isDraggingConfirmed;
  const dragStartPositionRef = useRef(dragStartPosition);
  dragStartPositionRef.current = dragStartPosition;
  const resizingZoneRef = useRef(resizingZone);
  resizingZoneRef.current = resizingZone;
  const resizeHandleRef = useRef(resizeHandle);
  resizeHandleRef.current = resizeHandle;
  const resizeStartSizeRef = useRef(resizeStartSize);
  resizeStartSizeRef.current = resizeStartSize;
  const resizeStartCursorRef = useRef(resizeStartCursor);
  resizeStartCursorRef.current = resizeStartCursor;

  // Start token drag
  const startTokenDrag = useCallback((tokenId: string, tokenPosition: Position, e: React.MouseEvent) => {
    const svgCoords = screenToSVGRef.current(e.clientX, e.clientY);
    const cursorPos = gridUtilsRef.current.pixelsToPosition(svgCoords);

    setDragStartPosition({ x: e.clientX, y: e.clientY });
    setIsDraggingConfirmed(false);
    setDraggedToken(tokenId);
    setDragOffset({
      x: tokenPosition.x - cursorPos.x,
      y: tokenPosition.y - cursorPos.y,
    });
  }, []);

  // Start item drag
  const startItemDrag = useCallback((itemId: string, itemPosition: Position, e: React.MouseEvent) => {
    const svgCoords = screenToSVGRef.current(e.clientX, e.clientY);
    const cursorPos = gridUtilsRef.current.pixelsToPosition(svgCoords);

    setDragStartPosition({ x: e.clientX, y: e.clientY });
    setIsDraggingConfirmed(false);
    setDraggedItem(itemId);
    setDragOffset({
      x: itemPosition.x - cursorPos.x,
      y: itemPosition.y - cursorPos.y,
    });
  }, []);

  // Start zone drag
  const startZoneDrag = useCallback((zoneId: string, zonePosition: Position, e: React.MouseEvent) => {
    const svgCoords = screenToSVGRef.current(e.clientX, e.clientY);
    const cursorPos = gridUtilsRef.current.pixelsToPosition(svgCoords);

    setDraggedZone(zoneId);
    setDragOffset({
      x: zonePosition.x - cursorPos.x,
      y: zonePosition.y - cursorPos.y,
    });
  }, []);

  // Start zone resize
  const startZoneResize = useCallback((zone: MapZoneType, e: React.MouseEvent, handle: ResizeHandle) => {
    e.stopPropagation();
    const svgCoords = screenToSVGRef.current(e.clientX, e.clientY);
    const cursorPos = gridUtilsRef.current.pixelsToPosition(svgCoords);

    setResizingZone(zone.id);
    setResizeHandle(handle);
    setResizeStartSize({ width: zone.width, height: zone.height, position: zone.position });
    setResizeStartCursor(cursorPos);
  }, []);

  // Handle drag move (all drag types)
  const handleDragMove = useCallback((e: React.MouseEvent) => {
    const svgCoords = screenToSVGRef.current(e.clientX, e.clientY);
    const cursorPos = gridUtilsRef.current.pixelsToPosition(svgCoords);
    const offset = dragOffsetRef.current;
    const snap = snapToGridRef.current;
    const utils = gridUtilsRef.current;

    // Check drag threshold
    const checkThreshold = (): boolean => {
      if (isDraggingConfirmedRef.current) return true;
      const start = dragStartPositionRef.current;
      if (!start) return false;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 5) {
        setIsDraggingConfirmed(true);
        return true;
      }
      return false;
    };

    // Token drag
    if (draggedTokenRef.current && offset) {
      if (!checkThreshold()) return;

      const adjustedPos = {
        x: cursorPos.x + offset.x,
        y: cursorPos.y + offset.y,
      };
      setCursorPosition(adjustedPos);
      tempDragPositionRef.current = adjustedPos;

      requestAnimationFrame(() => {
        setTempDragPosition(adjustedPos);
      });
      return;
    }

    // Item drag
    if (draggedItemRef.current && offset) {
      if (!checkThreshold()) return;

      const adjustedPos = {
        x: cursorPos.x + offset.x,
        y: cursorPos.y + offset.y,
      };
      setCursorPosition(adjustedPos);
      tempDragPositionRef.current = adjustedPos;

      requestAnimationFrame(() => {
        setTempDragPosition(adjustedPos);
      });
      return;
    }

    // Zone drag
    if (draggedZoneRef.current && offset) {
      const adjustedPos = {
        x: cursorPos.x + offset.x,
        y: cursorPos.y + offset.y,
      };
      const snapPos = snap ? utils.snapToGrid(adjustedPos) : adjustedPos;
      onZoneMoveRef.current?.(draggedZoneRef.current, snapPos);
      return;
    }

    // Zone resize
    const rZone = resizingZoneRef.current;
    const rHandle = resizeHandleRef.current;
    const rStartSize = resizeStartSizeRef.current;
    const rStartCursor = resizeStartCursorRef.current;

    if (rZone && rHandle && rStartSize && rStartCursor) {
      const posInches = { x: pixelsToInches(svgCoords.x), y: pixelsToInches(svgCoords.y) };
      const dx = posInches.x - rStartCursor.x;
      const dy = posInches.y - rStartCursor.y;

      let newWidth = rStartSize.width;
      let newHeight = rStartSize.height;
      let newPosition = { ...rStartSize.position };

      switch (rHandle) {
        case 'nw':
          newWidth = Math.max(1, rStartSize.width - dx);
          newHeight = Math.max(1, rStartSize.height - dy);
          newPosition.x = rStartSize.position.x + (rStartSize.width - newWidth);
          newPosition.y = rStartSize.position.y + (rStartSize.height - newHeight);
          break;
        case 'ne':
          newWidth = Math.max(1, rStartSize.width + dx);
          newHeight = Math.max(1, rStartSize.height - dy);
          newPosition.y = rStartSize.position.y + (rStartSize.height - newHeight);
          break;
        case 'se':
          newWidth = Math.max(1, rStartSize.width + dx);
          newHeight = Math.max(1, rStartSize.height + dy);
          break;
        case 'sw':
          newWidth = Math.max(1, rStartSize.width - dx);
          newHeight = Math.max(1, rStartSize.height + dy);
          newPosition.x = rStartSize.position.x + (rStartSize.width - newWidth);
          break;
        case 'n':
          newHeight = Math.max(1, rStartSize.height - dy);
          newPosition.y = rStartSize.position.y + (rStartSize.height - newHeight);
          break;
        case 'e':
          newWidth = Math.max(1, rStartSize.width + dx);
          break;
        case 's':
          newHeight = Math.max(1, rStartSize.height + dy);
          break;
        case 'w':
          newWidth = Math.max(1, rStartSize.width - dx);
          newPosition.x = rStartSize.position.x + (rStartSize.width - newWidth);
          break;
      }

      newWidth = Math.round(newWidth);
      newHeight = Math.round(newHeight);
      newPosition.x = Math.round(newPosition.x);
      newPosition.y = Math.round(newPosition.y);

      onZoneResizeRef.current?.(rZone, newWidth, newHeight, newPosition);
    }
  }, []);

  // Handle drag end - returns the final position for token/item drops
  const handleDragEnd = useCallback((): DragResult | null => {
    let result: DragResult | null = null;
    const utils = gridUtilsRef.current;
    const snap = snapToGridRef.current;

    // End token drag
    if (draggedTokenRef.current) {
      if (isDraggingConfirmedRef.current) {
        justFinishedDragRef.current = true;
      }

      if (isDraggingConfirmedRef.current && tempDragPositionRef.current) {
        let finalPosition = tempDragPositionRef.current;
        if (snap) {
          finalPosition = utils.snapToGrid(finalPosition);
        }
        if (!utils.isWithinBounds(finalPosition)) {
          finalPosition = utils.clampToBounds(finalPosition);
        }
        result = { type: 'token', id: draggedTokenRef.current, position: finalPosition };
      }

      setDraggedToken(null);
      setDragOffset(null);
      setTempDragPosition(null);
      tempDragPositionRef.current = null;
      setCursorPosition(null);
      setDragStartPosition(null);
      setIsDraggingConfirmed(false);
    }

    // End item drag
    if (draggedItemRef.current) {
      if (isDraggingConfirmedRef.current) {
        justFinishedDragRef.current = true;
      }

      if (isDraggingConfirmedRef.current && tempDragPositionRef.current) {
        let finalPosition = tempDragPositionRef.current;
        if (snap) {
          finalPosition = utils.snapToGrid(finalPosition);
        }
        if (!utils.isWithinBounds(finalPosition)) {
          finalPosition = utils.clampToBounds(finalPosition);
        }
        result = { type: 'item', id: draggedItemRef.current, position: finalPosition };
      }

      setDraggedItem(null);
      setDragOffset(null);
      setTempDragPosition(null);
      tempDragPositionRef.current = null;
      setCursorPosition(null);
      setDragStartPosition(null);
      setIsDraggingConfirmed(false);
    }

    // End zone drag
    if (draggedZoneRef.current) {
      justFinishedDragRef.current = true;
      setDraggedZone(null);
      setDragOffset(null);
    }

    // End zone resize
    if (resizingZoneRef.current) {
      setResizingZone(null);
      setResizeHandle(null);
      setResizeStartSize(null);
      setResizeStartCursor(null);
    }

    return result;
  }, []);

  return {
    draggedToken,
    draggedItem,
    draggedZone,
    tempDragPosition,
    cursorPosition,
    resizingZone,
    justFinishedDragRef,
    startTokenDrag,
    startItemDrag,
    startZoneDrag,
    startZoneResize,
    handleDragMove,
    handleDragEnd,
  };
}
