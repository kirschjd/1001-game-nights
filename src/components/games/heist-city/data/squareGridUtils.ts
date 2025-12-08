/**
 * Square Grid Utilities
 *
 * Implementation of GridUtils interface for square/rectangular grids.
 * This maintains backward compatibility with existing Heist City maps.
 */

import React from 'react';
import { Position } from '../types';
import { GridUtils, GridConfig, SCALE, inchesToPixels } from './gridUtils';

/**
 * Default configuration for square grid (36x36 inches)
 */
export const DEFAULT_SQUARE_CONFIG: GridConfig = {
  type: 'square',
  cellSize: 1, // 1 inch per cell
  columns: 36,
  rows: 36,
  mapSizeInches: 36,
};

/**
 * Create square grid utilities
 * @param config - Grid configuration (defaults to 36x36 inch grid)
 * @returns GridUtils implementation for square grids
 */
export function createSquareGridUtils(config: GridConfig = DEFAULT_SQUARE_CONFIG): GridUtils {
  const { cellSize, columns, rows, mapSizeInches } = config;

  return {
    type: 'square',
    config,

    // ============== Position Conversions ==============

    snapToGrid(position: Position): Position {
      return {
        x: Math.round(position.x / cellSize) * cellSize,
        y: Math.round(position.y / cellSize) * cellSize,
      };
    },

    positionToPixels(position: Position): { x: number; y: number } {
      return {
        x: position.x * SCALE,
        y: position.y * SCALE,
      };
    },

    pixelsToPosition(pixels: { x: number; y: number }): Position {
      return {
        x: pixels.x / SCALE,
        y: pixels.y / SCALE,
      };
    },

    // ============== Grid Geometry ==============

    getCellCenter(col: number, row: number): Position {
      return {
        x: col * cellSize + cellSize / 2,
        y: row * cellSize + cellSize / 2,
      };
    },

    getNeighbors(position: Position): Position[] {
      // 4 orthogonal neighbors (N, E, S, W)
      const directions = [
        { dx: 0, dy: -1 }, // North
        { dx: 1, dy: 0 },  // East
        { dx: 0, dy: 1 },  // South
        { dx: -1, dy: 0 }, // West
      ];

      return directions.map(d => ({
        x: position.x + d.dx * cellSize,
        y: position.y + d.dy * cellSize,
      }));
    },

    // ============== Distance Calculations ==============

    getDistance(from: Position, to: Position): number {
      // Euclidean distance in inches (for ruler tool)
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      return Math.sqrt(dx * dx + dy * dy);
    },

    getCellDistance(from: Position, to: Position): number {
      // Chebyshev distance (allows diagonal movement)
      const dx = Math.abs(Math.round(to.x) - Math.round(from.x));
      const dy = Math.abs(Math.round(to.y) - Math.round(from.y));
      return Math.max(dx, dy);
    },

    // ============== Bounds Checking ==============

    isWithinBounds(position: Position): boolean {
      return (
        position.x >= 0 &&
        position.x <= mapSizeInches - 1 &&
        position.y >= 0 &&
        position.y <= mapSizeInches - 1
      );
    },

    // ============== Rendering Helpers ==============

    renderGridElements(showMajorLines = true): React.ReactNode[] {
      const lines: React.ReactNode[] = [];
      const mapSizePixels = inchesToPixels(mapSizeInches);

      // Vertical lines
      for (let i = 0; i <= columns; i++) {
        const x = inchesToPixels(i * cellSize);
        const isMajor = showMajorLines && i % 6 === 0;
        lines.push(
          React.createElement('line', {
            key: `v-${i}`,
            x1: x,
            y1: 0,
            x2: x,
            y2: mapSizePixels,
            stroke: '#374151',
            strokeWidth: isMajor ? 1.5 : 0.5,
            opacity: isMajor ? 0.6 : 0.3,
          })
        );
      }

      // Horizontal lines
      for (let i = 0; i <= rows; i++) {
        const y = inchesToPixels(i * cellSize);
        const isMajor = showMajorLines && i % 6 === 0;
        lines.push(
          React.createElement('line', {
            key: `h-${i}`,
            x1: 0,
            y1: y,
            x2: mapSizePixels,
            y2: y,
            stroke: '#374151',
            strokeWidth: isMajor ? 1.5 : 0.5,
            opacity: isMajor ? 0.6 : 0.3,
          })
        );
      }

      return lines;
    },

    renderCellHighlight(position: Position, color = '#60a5fa', opacity = 0.3): React.ReactNode {
      const centerOffset = cellSize / 2;
      const x = inchesToPixels(position.x + centerOffset);
      const y = inchesToPixels(position.y + centerOffset);
      const size = inchesToPixels(cellSize);

      return React.createElement('rect', {
        x: x - size / 2,
        y: y - size / 2,
        width: size,
        height: size,
        fill: color,
        opacity,
        pointerEvents: 'none',
      });
    },

    renderCoordinateLabels(): React.ReactNode[] {
      const labels: React.ReactNode[] = [];

      // Column labels (every 6 columns)
      for (let i = 0; i <= columns; i += 6) {
        const x = inchesToPixels(i * cellSize);
        labels.push(
          React.createElement('text', {
            key: `col-${i}`,
            x,
            y: -5,
            fill: '#6b7280',
            fontSize: '10px',
            textAnchor: 'middle',
          }, i.toString())
        );
      }

      // Row labels (every 6 rows)
      for (let i = 0; i <= rows; i += 6) {
        const y = inchesToPixels(i * cellSize);
        labels.push(
          React.createElement('text', {
            key: `row-${i}`,
            x: -10,
            y: y + 3,
            fill: '#6b7280',
            fontSize: '10px',
            textAnchor: 'end',
          }, i.toString())
        );
      }

      return labels;
    },
  };
}

/**
 * Singleton instance for default square grid
 */
let defaultSquareGrid: GridUtils | null = null;

/**
 * Get the default square grid utilities (singleton)
 */
export function getSquareGridUtils(): GridUtils {
  if (!defaultSquareGrid) {
    defaultSquareGrid = createSquareGridUtils();
  }
  return defaultSquareGrid;
}
