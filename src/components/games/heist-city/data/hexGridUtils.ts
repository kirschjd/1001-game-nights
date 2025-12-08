/**
 * Hex Grid Utilities
 *
 * Implementation of GridUtils interface for hexagonal grids.
 * Uses flat-top hexagons with axial coordinate system (q, r).
 *
 * Coordinate System:
 * - Position.x = q (column in axial coords)
 * - Position.y = r (row in axial coords)
 * - Cube coordinates: (q, r, s) where s = -q - r
 *
 * Reference: https://www.redblobgames.com/grids/hexagons/
 */

import React from 'react';
import { Position } from '../types';
import { GridUtils, GridConfig, SCALE, inchesToPixels } from './gridUtils';

/**
 * Hex size constants
 * Using flat-top hexagons where:
 * - width = size * 2
 * - height = size * sqrt(3)
 */
const HEX_SIZE_INCHES = 0.5; // Radius of hex in inches (corner to center)
const HEX_WIDTH = HEX_SIZE_INCHES * 2;
const HEX_HEIGHT = HEX_SIZE_INCHES * Math.sqrt(3);

/**
 * Default configuration for hex grid
 * Sized to roughly match the 36" square map area
 */
export const DEFAULT_HEX_CONFIG: GridConfig = {
  type: 'hex',
  cellSize: HEX_SIZE_INCHES,
  columns: 48, // More columns due to hex packing
  rows: 42,
  mapSizeInches: 36,
};

// ============== Axial Coordinate Helpers ==============

/**
 * Convert axial coordinates to pixel position
 * Flat-top hex orientation
 */
function axialToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_SIZE_INCHES * (3 / 2) * q;
  const y = HEX_SIZE_INCHES * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
  return { x, y };
}

/**
 * Convert pixel position to axial coordinates
 * Returns fractional coordinates (use axialRound to snap)
 */
function pixelToAxial(x: number, y: number): { q: number; r: number } {
  const q = ((2 / 3) * x) / HEX_SIZE_INCHES;
  const r = ((-1 / 3) * x + (Math.sqrt(3) / 3) * y) / HEX_SIZE_INCHES;
  return { q, r };
}

/**
 * Round fractional axial coordinates to nearest hex
 * Uses cube coordinate rounding for accuracy
 */
function axialRound(q: number, r: number): { q: number; r: number } {
  // Convert to cube coordinates
  const s = -q - r;

  // Round each coordinate
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);

  // Fix rounding errors (q + r + s must equal 0)
  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }
  // else: rs = -rq - rr (implicit, not needed for axial)

  return { q: rq, r: rr };
}

/**
 * Calculate hex distance using cube coordinates
 * This is the number of hexes between two positions
 */
function hexDistance(q1: number, r1: number, q2: number, r2: number): number {
  // Convert to cube coordinates
  const s1 = -q1 - r1;
  const s2 = -q2 - r2;

  // Hex distance = max of absolute differences
  return Math.max(
    Math.abs(q1 - q2),
    Math.abs(r1 - r2),
    Math.abs(s1 - s2)
  );
}

/**
 * Get the 6 hex neighbor directions in axial coordinates
 */
const HEX_DIRECTIONS = [
  { dq: 1, dr: 0 },   // East
  { dq: 1, dr: -1 },  // Northeast
  { dq: 0, dr: -1 },  // Northwest
  { dq: -1, dr: 0 },  // West
  { dq: -1, dr: 1 },  // Southwest
  { dq: 0, dr: 1 },   // Southeast
];

/**
 * Generate SVG points for a flat-top hexagon
 */
function getHexPoints(centerX: number, centerY: number, size: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    // Flat-top: start at 0 degrees (pointing right)
    const angle = (Math.PI / 3) * i;
    const px = centerX + size * Math.cos(angle);
    const py = centerY + size * Math.sin(angle);
    points.push(`${px},${py}`);
  }
  return points.join(' ');
}

/**
 * Create hex grid utilities
 * @param config - Grid configuration
 * @returns GridUtils implementation for hex grids
 */
export function createHexGridUtils(config: GridConfig = DEFAULT_HEX_CONFIG): GridUtils {
  const { columns, rows, mapSizeInches } = config;

  return {
    type: 'hex',
    config,

    // ============== Position Conversions ==============

    snapToGrid(position: Position): Position {
      // Position stores axial coordinates (q, r)
      // Snap to nearest hex center
      const rounded = axialRound(position.x, position.y);
      return { x: rounded.q, y: rounded.r };
    },

    positionToPixels(position: Position): { x: number; y: number } {
      // Convert axial (q, r) to pixel coordinates
      const pixel = axialToPixel(position.x, position.y);
      return {
        x: inchesToPixels(pixel.x),
        y: inchesToPixels(pixel.y),
      };
    },

    pixelsToPosition(pixels: { x: number; y: number }): Position {
      // Convert pixels to inches, then to axial coordinates
      const inchX = pixels.x / SCALE;
      const inchY = pixels.y / SCALE;
      const axial = pixelToAxial(inchX, inchY);
      return { x: axial.q, y: axial.r };
    },

    // ============== Grid Geometry ==============

    getCellCenter(col: number, row: number): Position {
      // For hex grids, col and row ARE the axial coordinates
      return { x: col, y: row };
    },

    getNeighbors(position: Position): Position[] {
      return HEX_DIRECTIONS.map(d => ({
        x: position.x + d.dq,
        y: position.y + d.dr,
      }));
    },

    // ============== Distance Calculations ==============

    getDistance(from: Position, to: Position): number {
      // Convert positions to pixel coordinates and calculate Euclidean distance
      // This gives actual distance in inches for ruler tool
      const fromPixel = axialToPixel(from.x, from.y);
      const toPixel = axialToPixel(to.x, to.y);
      const dx = toPixel.x - fromPixel.x;
      const dy = toPixel.y - fromPixel.y;
      return Math.sqrt(dx * dx + dy * dy);
    },

    getCellDistance(from: Position, to: Position): number {
      // Hex grid distance (number of hexes)
      return hexDistance(from.x, from.y, to.x, to.y);
    },

    // ============== Bounds Checking ==============

    isWithinBounds(position: Position): boolean {
      // Convert to pixel position and check against map size
      const pixel = axialToPixel(position.x, position.y);
      return (
        pixel.x >= 0 &&
        pixel.x <= mapSizeInches &&
        pixel.y >= 0 &&
        pixel.y <= mapSizeInches
      );
    },

    // ============== Rendering Helpers ==============

    renderGridElements(showMajorLines = true): React.ReactNode[] {
      const hexes: React.ReactNode[] = [];
      const hexSizePixels = inchesToPixels(HEX_SIZE_INCHES);

      // Render hexes in a rectangular region
      for (let q = -2; q < columns; q++) {
        for (let r = -2; r < rows; r++) {
          const pixel = axialToPixel(q, r);
          const pixelX = inchesToPixels(pixel.x);
          const pixelY = inchesToPixels(pixel.y);

          // Only render if within visible bounds (with some padding)
          if (
            pixelX >= -hexSizePixels * 2 &&
            pixelX <= inchesToPixels(mapSizeInches) + hexSizePixels * 2 &&
            pixelY >= -hexSizePixels * 2 &&
            pixelY <= inchesToPixels(mapSizeInches) + hexSizePixels * 2
          ) {
            const isMajor = showMajorLines && (q % 6 === 0 && r % 6 === 0);
            hexes.push(
              React.createElement('polygon', {
                key: `hex-${q}-${r}`,
                points: getHexPoints(pixelX, pixelY, hexSizePixels),
                fill: 'none',
                stroke: '#374151',
                strokeWidth: isMajor ? 1.5 : 0.5,
                opacity: isMajor ? 0.6 : 0.3,
              })
            );
          }
        }
      }

      return hexes;
    },

    renderCellHighlight(position: Position, color = '#60a5fa', opacity = 0.3): React.ReactNode {
      const pixel = axialToPixel(position.x, position.y);
      const pixelX = inchesToPixels(pixel.x);
      const pixelY = inchesToPixels(pixel.y);
      const hexSizePixels = inchesToPixels(HEX_SIZE_INCHES);

      return React.createElement('polygon', {
        points: getHexPoints(pixelX, pixelY, hexSizePixels),
        fill: color,
        opacity,
        pointerEvents: 'none',
      });
    },

    renderCoordinateLabels(): React.ReactNode[] {
      const labels: React.ReactNode[] = [];

      // Label every 6th hex along the q axis (r=0)
      for (let q = 0; q < columns; q += 6) {
        const pixel = axialToPixel(q, 0);
        const pixelX = inchesToPixels(pixel.x);
        const pixelY = inchesToPixels(pixel.y);

        if (pixelX >= 0 && pixelX <= inchesToPixels(mapSizeInches)) {
          labels.push(
            React.createElement('text', {
              key: `q-${q}`,
              x: pixelX,
              y: -10,
              fill: '#6b7280',
              fontSize: '10px',
              textAnchor: 'middle',
            }, `q${q}`)
          );
        }
      }

      // Label every 6th hex along the r axis (q=0)
      for (let r = 0; r < rows; r += 6) {
        const pixel = axialToPixel(0, r);
        const pixelX = inchesToPixels(pixel.x);
        const pixelY = inchesToPixels(pixel.y);

        if (pixelY >= 0 && pixelY <= inchesToPixels(mapSizeInches)) {
          labels.push(
            React.createElement('text', {
              key: `r-${r}`,
              x: -15,
              y: pixelY + 3,
              fill: '#6b7280',
              fontSize: '10px',
              textAnchor: 'end',
            }, `r${r}`)
          );
        }
      }

      return labels;
    },
  };
}

/**
 * Singleton instance for default hex grid
 */
let defaultHexGrid: GridUtils | null = null;

/**
 * Get the default hex grid utilities (singleton)
 */
export function getHexGridUtils(): GridUtils {
  if (!defaultHexGrid) {
    defaultHexGrid = createHexGridUtils();
  }
  return defaultHexGrid;
}

// Export helper functions for external use
export { axialToPixel, pixelToAxial, axialRound, hexDistance, HEX_SIZE_INCHES };
