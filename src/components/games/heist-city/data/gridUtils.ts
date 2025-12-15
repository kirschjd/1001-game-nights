/**
 * Grid Utilities - Abstraction layer for hybrid grid support (square and hex)
 *
 * This module provides a unified interface for grid operations that works
 * with both square and hexagonal grids. Each grid type implements this
 * interface with its own geometry-specific calculations.
 */

import { Position, GridType } from '../types';

/**
 * Configuration for grid initialization
 */
export interface GridConfig {
  type: GridType;
  cellSize: number; // Size of each cell in inches
  columns: number; // Number of columns in the grid
  rows: number; // Number of rows in the grid
  mapSizeInches: number; // Total map size in inches
}

/**
 * Unified interface for grid operations
 * Both square and hex grids implement this interface
 */
export interface GridUtils {
  /** Grid type identifier */
  readonly type: GridType;

  /** Grid configuration */
  readonly config: GridConfig;

  // ============== Position Conversions ==============

  /**
   * Snap a position to the nearest grid cell center
   * @param position - Position to snap
   * @returns Snapped position at cell center
   */
  snapToGrid(position: Position): Position;

  /**
   * Convert a grid position to pixel coordinates
   * @param position - Position in grid units
   * @returns Pixel coordinates {x, y}
   */
  positionToPixels(position: Position): { x: number; y: number };

  /**
   * Convert pixel coordinates to grid position
   * @param pixels - Pixel coordinates
   * @returns Position in grid units
   */
  pixelsToPosition(pixels: { x: number; y: number }): Position;

  // ============== Grid Geometry ==============

  /**
   * Get the center position of a specific grid cell
   * @param col - Column index
   * @param row - Row index
   * @returns Position at cell center
   */
  getCellCenter(col: number, row: number): Position;

  /**
   * Get all neighboring cell positions
   * @param position - Center position
   * @returns Array of neighbor positions (4 for square, 6 for hex)
   */
  getNeighbors(position: Position): Position[];

  // ============== Distance Calculations ==============

  /**
   * Calculate distance between two positions in grid units
   * @param from - Start position
   * @param to - End position
   * @returns Distance in inches (for ruler tool compatibility)
   */
  getDistance(from: Position, to: Position): number;

  /**
   * Calculate grid-based distance (number of cells)
   * @param from - Start position
   * @param to - End position
   * @returns Number of cells between positions
   */
  getCellDistance(from: Position, to: Position): number;

  // ============== Bounds Checking ==============

  /**
   * Check if a position is within map bounds
   * @param position - Position to check
   * @returns True if within bounds
   */
  isWithinBounds(position: Position): boolean;

  /**
   * Clamp a position to the nearest valid position within bounds
   * @param position - Position to clamp
   * @returns Position within bounds (snapped to grid)
   */
  clampToBounds(position: Position): Position;

  // ============== Rendering Helpers ==============

  /**
   * Get SVG elements for rendering the grid
   * @param showMajorLines - Whether to show major grid lines (every 6 cells)
   * @returns Array of SVG line/polygon elements
   */
  renderGridElements(showMajorLines?: boolean): React.ReactNode[];

  /**
   * Get SVG element for highlighting a single cell
   * @param position - Position to highlight
   * @param color - Fill color for highlight
   * @param opacity - Fill opacity
   * @returns SVG element for the highlight
   */
  renderCellHighlight(position: Position, color?: string, opacity?: number): React.ReactNode;

  /**
   * Get SVG path for coordinate labels
   * @returns Array of coordinate label elements
   */
  renderCoordinateLabels(): React.ReactNode[];
}

/**
 * Scale factor: pixels per inch (shared constant)
 */
export const SCALE = 25; // 900px / 36" = 25 pixels per inch

/**
 * Convert inches to pixels
 */
export function inchesToPixels(inches: number): number {
  return inches * SCALE;
}

/**
 * Convert pixels to inches
 */
export function pixelsToInches(pixels: number): number {
  return pixels / SCALE;
}

/**
 * Factory function to create grid utilities based on type
 * @param gridType - Type of grid ('square' or 'hex')
 * @returns Appropriate GridUtils implementation
 */
export function createGridUtils(gridType: GridType): GridUtils {
  // Dynamic import to avoid circular dependencies
  if (gridType === 'hex') {
    const { createHexGridUtils } = require('./hexGridUtils');
    return createHexGridUtils();
  } else {
    const { createSquareGridUtils } = require('./squareGridUtils');
    return createSquareGridUtils();
  }
}
