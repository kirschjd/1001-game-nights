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
 * Map Shape: Regular hexagon with 20 hexes per side (radius 19 in hex distance)
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
 *
 * Size is set so tokens (12px radius = 0.48") fit inside the hex inner radius.
 * Inner radius = size * sqrt(3)/2, so size = 0.6" gives inner radius ~0.52"
 */
const HEX_SIZE_INCHES = 0.6; // Radius of hex in inches (corner to center)

/**
 * Map is a regular hexagon with this many hexes per side
 * A hex with side length N has hex-distance radius of N-1 from center
 */
const HEX_MAP_SIDE_LENGTH = 16;
const HEX_MAP_RADIUS = HEX_MAP_SIDE_LENGTH - 1; // 15

/**
 * Default configuration for hex grid
 */
export const DEFAULT_HEX_CONFIG: GridConfig = {
  type: 'hex',
  cellSize: HEX_SIZE_INCHES,
  columns: HEX_MAP_SIDE_LENGTH * 2 - 1, // Diameter of hex map
  rows: HEX_MAP_SIDE_LENGTH * 2 - 1,
  mapSizeInches: 36, // SVG canvas size (hexes will be centered)
};

// ============== Axial Coordinate Helpers ==============

/**
 * Convert axial coordinates to pixel position (in inches)
 * Pointy-top hex arrangement (rotated 90° from flat-top)
 * Combined with flat-top hex shapes, this rotates the entire map
 */
function axialToPixel(q: number, r: number): { x: number; y: number } {
  // Pointy-top arrangement: rows are horizontal, +r goes down
  const x = HEX_SIZE_INCHES * Math.sqrt(3) * (q + r / 2);
  const y = HEX_SIZE_INCHES * (3 / 2) * r;
  return { x, y };
}

/**
 * Convert pixel position (in inches) to axial coordinates
 * Returns fractional coordinates (use axialRound to snap)
 * Pointy-top hex arrangement (matches axialToPixel)
 */
function pixelToAxial(xInches: number, yInches: number): { q: number; r: number } {
  const q = (Math.sqrt(3) / 3 * xInches - (1 / 3) * yInches) / HEX_SIZE_INCHES;
  const r = ((2 / 3) * yInches) / HEX_SIZE_INCHES;
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
 * Check if a hex position is within the hex-shaped map boundary
 * Map is a regular hexagon centered at (0,0) with radius HEX_MAP_RADIUS
 */
function isWithinHexBounds(q: number, r: number): boolean {
  return hexDistance(q, r, 0, 0) <= HEX_MAP_RADIUS;
}

/**
 * Clamp a hex position to the nearest valid hex within the map boundary
 * Uses a scaling approach: scales the position toward the center until it's within bounds
 */
function clampToHexBounds(q: number, r: number): { q: number; r: number } {
  // First snap to nearest hex
  const snapped = axialRound(q, r);

  // If already within bounds, return it
  if (isWithinHexBounds(snapped.q, snapped.r)) {
    return snapped;
  }

  // Otherwise, scale toward center until within bounds
  // Binary search for the right scale factor
  let lo = 0, hi = 1;
  for (let i = 0; i < 10; i++) { // 10 iterations gives good precision
    const mid = (lo + hi) / 2;
    const testQ = q * mid;
    const testR = r * mid;
    const testSnapped = axialRound(testQ, testR);
    if (isWithinHexBounds(testSnapped.q, testSnapped.r)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  // Use the largest valid scale factor
  const finalQ = q * lo;
  const finalR = r * lo;
  return axialRound(finalQ, finalR);
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
 * Flat-top means flat edges on top/bottom, pointy corners on left/right
 */
function getHexPoints(centerX: number, centerY: number, size: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    // Flat-top: offset by 30 degrees so first corner is at top-right
    // Corners at: 30°, 90°, 150°, 210°, 270°, 330°
    const angle = (Math.PI / 3) * i + (Math.PI / 6);
    const px = centerX + size * Math.cos(angle);
    const py = centerY + size * Math.sin(angle);
    points.push(`${px},${py}`);
  }
  return points.join(' ');
}

/**
 * Calculate the offset to center the hex map in the SVG canvas
 */
function getMapCenterOffset(): { x: number; y: number } {
  // The hex map spans from roughly -radius to +radius in both pixel dimensions
  // We want to center it in the 36" (900px) canvas
  const canvasCenterPx = (DEFAULT_HEX_CONFIG.mapSizeInches * SCALE) / 2;
  return { x: canvasCenterPx, y: canvasCenterPx };
}

/**
 * Create hex grid utilities
 * @param config - Grid configuration
 * @returns GridUtils implementation for hex grids
 */
export function createHexGridUtils(config: GridConfig = DEFAULT_HEX_CONFIG): GridUtils {
  const centerOffset = getMapCenterOffset();

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
      // Convert axial (q, r) to pixel coordinates, centered in canvas
      const pixel = axialToPixel(position.x, position.y);
      return {
        x: inchesToPixels(pixel.x) + centerOffset.x,
        y: inchesToPixels(pixel.y) + centerOffset.y,
      };
    },

    pixelsToPosition(pixels: { x: number; y: number }): Position {
      // Convert pixels to inches (accounting for center offset), then to axial coordinates
      const inchX = (pixels.x - centerOffset.x) / SCALE;
      const inchY = (pixels.y - centerOffset.y) / SCALE;
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
      // Check if within the hex-shaped map boundary
      return isWithinHexBounds(position.x, position.y);
    },

    clampToBounds(position: Position): Position {
      // Clamp to nearest valid hex within bounds
      const clamped = clampToHexBounds(position.x, position.y);
      return { x: clamped.q, y: clamped.r };
    },

    // ============== Rendering Helpers ==============

    renderGridElements(showMajorLines = true): React.ReactNode[] {
      const hexes: React.ReactNode[] = [];
      const hexSizePixels = inchesToPixels(HEX_SIZE_INCHES);

      // Generate all hexes within the hex-shaped boundary
      // Iterate over a bounding box and filter by hex distance
      for (let q = -HEX_MAP_RADIUS; q <= HEX_MAP_RADIUS; q++) {
        for (let r = -HEX_MAP_RADIUS; r <= HEX_MAP_RADIUS; r++) {
          // Skip hexes outside the hex-shaped boundary
          if (!isWithinHexBounds(q, r)) continue;

          const pixel = axialToPixel(q, r);
          const pixelX = inchesToPixels(pixel.x) + centerOffset.x;
          const pixelY = inchesToPixels(pixel.y) + centerOffset.y;

          // Determine if this is a "major" hex (every 5th ring from center)
          const distFromCenter = hexDistance(q, r, 0, 0);
          const isMajor = showMajorLines && (distFromCenter % 5 === 0);
          const isCenter = q === 0 && r === 0;

          hexes.push(
            React.createElement('polygon', {
              key: `hex-${q}-${r}`,
              points: getHexPoints(pixelX, pixelY, hexSizePixels),
              fill: isCenter ? 'rgba(100, 100, 255, 0.1)' : 'none',
              stroke: isCenter ? '#6366f1' : '#374151',
              strokeWidth: isCenter ? 2 : (isMajor ? 1.5 : 0.5),
              opacity: isMajor ? 0.6 : 0.4,
            })
          );
        }
      }

      return hexes;
    },

    renderCellHighlight(position: Position, color = '#60a5fa', opacity = 0.3): React.ReactNode {
      const pixel = axialToPixel(position.x, position.y);
      const pixelX = inchesToPixels(pixel.x) + centerOffset.x;
      const pixelY = inchesToPixels(pixel.y) + centerOffset.y;
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

      // Label hexes along the positive q axis (r=0)
      for (let q = 0; q <= HEX_MAP_RADIUS; q += 5) {
        if (!isWithinHexBounds(q, 0)) continue;
        const pixel = axialToPixel(q, 0);
        const pixelX = inchesToPixels(pixel.x) + centerOffset.x;
        const pixelY = inchesToPixels(pixel.y) + centerOffset.y;

        labels.push(
          React.createElement('text', {
            key: `label-q${q}`,
            x: pixelX,
            y: pixelY - inchesToPixels(HEX_SIZE_INCHES) - 5,
            fill: '#9ca3af',
            fontSize: '9px',
            textAnchor: 'middle',
          }, `${q},0`)
        );
      }

      // Label hexes along the positive r axis (q=0)
      for (let r = 5; r <= HEX_MAP_RADIUS; r += 5) {
        if (!isWithinHexBounds(0, r)) continue;
        const pixel = axialToPixel(0, r);
        const pixelX = inchesToPixels(pixel.x) + centerOffset.x;
        const pixelY = inchesToPixels(pixel.y) + centerOffset.y;

        labels.push(
          React.createElement('text', {
            key: `label-r${r}`,
            x: pixelX - inchesToPixels(HEX_SIZE_INCHES) - 5,
            y: pixelY + 3,
            fill: '#9ca3af',
            fontSize: '9px',
            textAnchor: 'end',
          }, `0,${r}`)
        );
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

/**
 * Get all hexes within a given radius from a center hex
 * @param centerQ - Center hex q coordinate
 * @param centerR - Center hex r coordinate
 * @param radius - Radius in hex cells
 * @returns Array of {q, r} positions
 */
function getHexesInRadius(centerQ: number, centerR: number, radius: number): Array<{ q: number; r: number }> {
  const hexes: Array<{ q: number; r: number }> = [];
  for (let q = centerQ - radius; q <= centerQ + radius; q++) {
    for (let r = centerR - radius; r <= centerR + radius; r++) {
      if (hexDistance(q, r, centerQ, centerR) <= radius) {
        hexes.push({ q, r });
      }
    }
  }
  return hexes;
}

/**
 * Get map center offset for external use
 */
function getHexMapCenterOffset(): { x: number; y: number } {
  return getMapCenterOffset();
}

// Export helper functions for external use
export {
  axialToPixel,
  pixelToAxial,
  axialRound,
  hexDistance,
  isWithinHexBounds,
  clampToHexBounds,
  getHexPoints,
  getHexesInRadius,
  getHexMapCenterOffset,
  HEX_SIZE_INCHES,
  HEX_MAP_RADIUS,
};
