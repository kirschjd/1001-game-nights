// Go Board Component
// Canvas-based rendering of a 19x19 Go board

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BoardState, Point, Annotation, EMPTY, BLACK, WHITE } from '../types/baduk.types';
import { isValidMove, previewCaptures, getTerritoryRegions } from '../utils/goLogic';

interface GoBoardProps {
  board: BoardState;
  currentTurn: 'black' | 'white';
  koPoint: Point | null;
  lastMove?: Point | null;
  annotations?: Annotation[];
  onPlaceStone: (x: number, y: number) => void;
  starPoints?: [number, number][];
  size?: number;
  // Scoring mode props
  scoringMode?: boolean;
  deadStones?: Set<string>;
  onToggleDeadStone?: (x: number, y: number) => void;
  showTerritory?: boolean;
}

const BOARD_SIZE = 19;
const DEFAULT_CANVAS_SIZE = 600;
const BOARD_COLOR = '#DEB887'; // Burlywood
const LINE_COLOR = '#000000';
const STAR_POINT_RADIUS = 3;

const GoBoard: React.FC<GoBoardProps> = ({
  board,
  currentTurn,
  koPoint,
  lastMove,
  annotations = [],
  onPlaceStone,
  starPoints = [[3, 3], [3, 9], [3, 15], [9, 3], [9, 9], [9, 15], [15, 3], [15, 9], [15, 15]],
  size = DEFAULT_CANVAS_SIZE,
  scoringMode = false,
  deadStones = new Set(),
  onToggleDeadStone,
  showTerritory = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  // Calculate spacing
  const padding = size * 0.05;
  const boardWidth = size - 2 * padding;
  const cellSize = boardWidth / (BOARD_SIZE - 1);
  const stoneRadius = cellSize * 0.45;

  // Convert canvas coordinates to board coordinates
  const canvasToBoard = useCallback((canvasX: number, canvasY: number): Point | null => {
    const x = Math.round((canvasX - padding) / cellSize);
    const y = Math.round((canvasY - padding) / cellSize);

    if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
      return { x, y };
    }
    return null;
  }, [padding, cellSize]);

  // Convert board coordinates to canvas coordinates
  const boardToCanvas = useCallback((x: number, y: number): { cx: number; cy: number } => {
    return {
      cx: padding + x * cellSize,
      cy: padding + y * cellSize
    };
  }, [padding, cellSize]);

  // Draw the board
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw background
    ctx.fillStyle = BOARD_COLOR;
    ctx.fillRect(0, 0, size, size);

    // Draw grid lines
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 1;

    for (let i = 0; i < BOARD_SIZE; i++) {
      const pos = padding + i * cellSize;

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(pos, padding);
      ctx.lineTo(pos, padding + (BOARD_SIZE - 1) * cellSize);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(padding, pos);
      ctx.lineTo(padding + (BOARD_SIZE - 1) * cellSize, pos);
      ctx.stroke();
    }

    // Draw star points
    ctx.fillStyle = LINE_COLOR;
    for (const [x, y] of starPoints) {
      const { cx, cy } = boardToCanvas(x, y);
      ctx.beginPath();
      ctx.arc(cx, cy, STAR_POINT_RADIUS, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw territory visualization (before stones so stones appear on top)
    if (showTerritory) {
      const territories = getTerritoryRegions(board, deadStones);
      for (const region of territories) {
        if (region.owner === 'neutral') continue;

        ctx.globalAlpha = 0.25;
        ctx.fillStyle = region.owner === 'black' ? '#000000' : '#ffffff';

        for (const point of region.points) {
          const { cx, cy } = boardToCanvas(point.x, point.y);
          ctx.beginPath();
          ctx.arc(cx, cy, cellSize * 0.4, 0, 2 * Math.PI);
          ctx.fill();
        }
        ctx.globalAlpha = 1.0;
      }
    }

    // Draw stones
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const stone = board[y][x];
        if (stone === EMPTY) continue;

        const { cx, cy } = boardToCanvas(x, y);

        // Stone gradient for 3D effect
        const gradient = ctx.createRadialGradient(
          cx - stoneRadius * 0.3,
          cy - stoneRadius * 0.3,
          0,
          cx,
          cy,
          stoneRadius
        );

        if (stone === BLACK) {
          gradient.addColorStop(0, '#444');
          gradient.addColorStop(1, '#000');
        } else {
          gradient.addColorStop(0, '#fff');
          gradient.addColorStop(1, '#ccc');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, stoneRadius, 0, 2 * Math.PI);
        ctx.fill();

        // Stone border
        ctx.strokeStyle = stone === BLACK ? '#000' : '#aaa';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw dead stone marker (X)
        if (deadStones.has(`${x},${y}`)) {
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 3;
          const offset = stoneRadius * 0.5;
          ctx.beginPath();
          ctx.moveTo(cx - offset, cy - offset);
          ctx.lineTo(cx + offset, cy + offset);
          ctx.moveTo(cx + offset, cy - offset);
          ctx.lineTo(cx - offset, cy + offset);
          ctx.stroke();
        }
      }
    }

    // Draw last move marker
    if (lastMove) {
      const { cx, cy } = boardToCanvas(lastMove.x, lastMove.y);
      const stone = board[lastMove.y][lastMove.x];
      ctx.fillStyle = stone === BLACK ? '#fff' : '#000';
      ctx.beginPath();
      ctx.arc(cx, cy, stoneRadius * 0.3, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw ko point marker
    if (koPoint) {
      const { cx, cy } = boardToCanvas(koPoint.x, koPoint.y);
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, stoneRadius * 0.5, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Draw annotations
    for (const ann of annotations) {
      const { cx, cy } = boardToCanvas(ann.point.x, ann.point.y);
      const stone = board[ann.point.y][ann.point.x];
      const color = stone === BLACK ? '#fff' : (stone === WHITE ? '#000' : '#0066cc');

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;

      switch (ann.type) {
        case 'triangle':
          ctx.beginPath();
          ctx.moveTo(cx, cy - stoneRadius * 0.5);
          ctx.lineTo(cx - stoneRadius * 0.4, cy + stoneRadius * 0.3);
          ctx.lineTo(cx + stoneRadius * 0.4, cy + stoneRadius * 0.3);
          ctx.closePath();
          ctx.stroke();
          break;

        case 'square':
          const halfSize = stoneRadius * 0.35;
          ctx.strokeRect(cx - halfSize, cy - halfSize, halfSize * 2, halfSize * 2);
          break;

        case 'circle':
          ctx.beginPath();
          ctx.arc(cx, cy, stoneRadius * 0.4, 0, 2 * Math.PI);
          ctx.stroke();
          break;

        case 'x':
          const offset = stoneRadius * 0.35;
          ctx.beginPath();
          ctx.moveTo(cx - offset, cy - offset);
          ctx.lineTo(cx + offset, cy + offset);
          ctx.moveTo(cx + offset, cy - offset);
          ctx.lineTo(cx - offset, cy + offset);
          ctx.stroke();
          break;

        case 'label':
          if (ann.label) {
            ctx.font = `bold ${stoneRadius}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(ann.label, cx, cy);
          }
          break;
      }
    }

    // Draw hover preview
    if (hoverPoint && board[hoverPoint.y][hoverPoint.x] === EMPTY) {
      const color = currentTurn === 'black' ? BLACK : WHITE;
      const validation = isValidMove(board, hoverPoint.x, hoverPoint.y, color, koPoint);

      if (validation.valid) {
        const { cx, cy } = boardToCanvas(hoverPoint.x, hoverPoint.y);

        // Semi-transparent stone preview
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = currentTurn === 'black' ? '#000' : '#fff';
        ctx.beginPath();
        ctx.arc(cx, cy, stoneRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Show capture preview
        const captures = previewCaptures(board, hoverPoint.x, hoverPoint.y, color);
        if (captures.length > 0) {
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = '#ff0000';
          for (const cap of captures) {
            const { cx: capX, cy: capY } = boardToCanvas(cap.x, cap.y);
            ctx.beginPath();
            ctx.arc(capX, capY, stoneRadius, 0, 2 * Math.PI);
            ctx.fill();
          }
          ctx.globalAlpha = 1.0;
        }
      }
    }

  }, [board, currentTurn, koPoint, lastMove, annotations, hoverPoint, size, padding, cellSize, stoneRadius, boardToCanvas, starPoints, scoringMode, deadStones, showTerritory]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const point = canvasToBoard(canvasX, canvasY);
    setHoverPoint(point);
  }, [canvasToBoard]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setHoverPoint(null);
  }, []);

  // Handle click
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const point = canvasToBoard(canvasX, canvasY);
    if (point) {
      if (scoringMode && onToggleDeadStone) {
        // In scoring mode, toggle dead stone marking
        if (board[point.y][point.x] !== EMPTY) {
          onToggleDeadStone(point.x, point.y);
        }
      } else {
        // Normal mode, place stone
        onPlaceStone(point.x, point.y);
      }
    }
  }, [canvasToBoard, onPlaceStone, scoringMode, onToggleDeadStone, board]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="cursor-pointer rounded-lg shadow-lg"
      style={{
        width: size,
        height: size,
        maxWidth: '100%',
        maxHeight: 'calc(100vh - 200px)',
        aspectRatio: '1 / 1',
        objectFit: 'contain'
      }}
    />
  );
};

export default GoBoard;
