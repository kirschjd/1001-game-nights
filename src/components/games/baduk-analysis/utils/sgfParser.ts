// SGF (Smart Game Format) Parser for Go/Baduk
// Reference: https://www.red-bean.com/sgf/

import { Point, Annotation, AnnotationType } from '../types/baduk.types';

// Parsed SGF data structure
export interface ParsedSGF {
  blackPlayer: string;
  whitePlayer: string;
  komi: number;
  handicap: number;
  date: string;
  result: string;
  event: string;
  rootComment: string;
  setupBlack: Point[];
  setupWhite: Point[];
  moves: SGFMove[];
}

export interface SGFMove {
  color: 'B' | 'W';
  x?: number;
  y?: number;
  pass?: boolean;
  comment?: string;
  annotations?: Annotation[];
  variations?: SGFMove[][];
}

/**
 * Convert SGF coordinate to board point
 * 'aa' = {x: 0, y: 0}, 'ss' = {x: 18, y: 18}
 */
export function sgfToPoint(coord: string): Point | null {
  if (!coord || coord.length !== 2) return null;

  const x = coord.charCodeAt(0) - 'a'.charCodeAt(0);
  const y = coord.charCodeAt(1) - 'a'.charCodeAt(0);

  if (x < 0 || x > 18 || y < 0 || y > 18) return null;

  return { x, y };
}

/**
 * Convert board point to SGF coordinate
 */
export function pointToSgf(point: Point): string {
  return String.fromCharCode('a'.charCodeAt(0) + point.x) +
         String.fromCharCode('a'.charCodeAt(0) + point.y);
}

/**
 * Parse a single SGF property value list
 * Handles cases like AB[aa][bb][cc]
 */
function parsePropertyValues(content: string, startIndex: number): { values: string[], endIndex: number } {
  const values: string[] = [];
  let i = startIndex;

  while (i < content.length && content[i] === '[') {
    let valueStart = i + 1;
    let valueEnd = valueStart;

    // Find closing bracket, handling escaped characters
    while (valueEnd < content.length) {
      if (content[valueEnd] === ']' && content[valueEnd - 1] !== '\\') {
        break;
      }
      valueEnd++;
    }

    // Extract value, unescape special characters
    const value = content.substring(valueStart, valueEnd)
      .replace(/\\]/g, ']')
      .replace(/\\\\/g, '\\');

    values.push(value);
    i = valueEnd + 1;
  }

  return { values, endIndex: i };
}

/**
 * Parse SGF content to structured data
 */
export function parseSGF(content: string): ParsedSGF {
  const result: ParsedSGF = {
    blackPlayer: '',
    whitePlayer: '',
    komi: 6.5,
    handicap: 0,
    date: '',
    result: '',
    event: '',
    rootComment: '',
    setupBlack: [],
    setupWhite: [],
    moves: []
  };

  // Remove newlines and normalize whitespace
  content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Find game tree start
  const treeStart = content.indexOf('(;');
  if (treeStart === -1) {
    throw new Error('Invalid SGF: No game tree found');
  }

  let i = treeStart + 2; // Skip "(;"

  // Parse nodes
  let isRootNode = true;
  let currentMoveIndex = -1;

  while (i < content.length) {
    // Skip whitespace
    while (i < content.length && /\s/.test(content[i])) i++;

    if (i >= content.length) break;

    const char = content[i];

    // End of variation
    if (char === ')') {
      break;
    }

    // New node
    if (char === ';') {
      i++;
      isRootNode = false;
      continue;
    }

    // Start of variation (nested)
    if (char === '(') {
      // Skip nested variations for now (simplified parser)
      let depth = 1;
      i++;
      while (i < content.length && depth > 0) {
        if (content[i] === '(') depth++;
        else if (content[i] === ')') depth--;
        i++;
      }
      continue;
    }

    // Property identifier
    if (/[A-Z]/.test(char)) {
      let propEnd = i;
      while (propEnd < content.length && /[A-Z]/.test(content[propEnd])) {
        propEnd++;
      }
      const prop = content.substring(i, propEnd);
      i = propEnd;

      // Parse property values
      const { values, endIndex } = parsePropertyValues(content, i);
      i = endIndex;

      // Handle properties
      switch (prop) {
        case 'PB':
          result.blackPlayer = values[0] || '';
          break;
        case 'PW':
          result.whitePlayer = values[0] || '';
          break;
        case 'KM':
          result.komi = parseFloat(values[0]) || 6.5;
          break;
        case 'HA':
          result.handicap = parseInt(values[0]) || 0;
          break;
        case 'DT':
          result.date = values[0] || '';
          break;
        case 'RE':
          result.result = values[0] || '';
          break;
        case 'EV':
          result.event = values[0] || '';
          break;
        case 'C':
          if (result.moves.length === 0) {
            result.rootComment = values[0] || '';
          } else if (currentMoveIndex >= 0) {
            result.moves[currentMoveIndex].comment = values[0] || '';
          }
          break;
        case 'AB':
          // Add black stones (setup)
          for (const val of values) {
            const point = sgfToPoint(val);
            if (point) result.setupBlack.push(point);
          }
          break;
        case 'AW':
          // Add white stones (setup)
          for (const val of values) {
            const point = sgfToPoint(val);
            if (point) result.setupWhite.push(point);
          }
          break;
        case 'B':
          // Black move
          if (values[0] === '' || values[0] === 'tt') {
            result.moves.push({ color: 'B', pass: true });
          } else {
            const point = sgfToPoint(values[0]);
            if (point) {
              result.moves.push({ color: 'B', x: point.x, y: point.y });
            }
          }
          currentMoveIndex = result.moves.length - 1;
          break;
        case 'W':
          // White move
          if (values[0] === '' || values[0] === 'tt') {
            result.moves.push({ color: 'W', pass: true });
          } else {
            const point = sgfToPoint(values[0]);
            if (point) {
              result.moves.push({ color: 'W', x: point.x, y: point.y });
            }
          }
          currentMoveIndex = result.moves.length - 1;
          break;
        case 'TR':
          // Triangle annotations
          if (currentMoveIndex >= 0) {
            if (!result.moves[currentMoveIndex].annotations) {
              result.moves[currentMoveIndex].annotations = [];
            }
            for (const val of values) {
              const point = sgfToPoint(val);
              if (point) {
                result.moves[currentMoveIndex].annotations!.push({
                  type: 'triangle' as AnnotationType,
                  point
                });
              }
            }
          }
          break;
        case 'SQ':
          // Square annotations
          if (currentMoveIndex >= 0) {
            if (!result.moves[currentMoveIndex].annotations) {
              result.moves[currentMoveIndex].annotations = [];
            }
            for (const val of values) {
              const point = sgfToPoint(val);
              if (point) {
                result.moves[currentMoveIndex].annotations!.push({
                  type: 'square' as AnnotationType,
                  point
                });
              }
            }
          }
          break;
        case 'CR':
          // Circle annotations
          if (currentMoveIndex >= 0) {
            if (!result.moves[currentMoveIndex].annotations) {
              result.moves[currentMoveIndex].annotations = [];
            }
            for (const val of values) {
              const point = sgfToPoint(val);
              if (point) {
                result.moves[currentMoveIndex].annotations!.push({
                  type: 'circle' as AnnotationType,
                  point
                });
              }
            }
          }
          break;
        case 'MA':
        case 'X':
          // X mark annotations
          if (currentMoveIndex >= 0) {
            if (!result.moves[currentMoveIndex].annotations) {
              result.moves[currentMoveIndex].annotations = [];
            }
            for (const val of values) {
              const point = sgfToPoint(val);
              if (point) {
                result.moves[currentMoveIndex].annotations!.push({
                  type: 'x' as AnnotationType,
                  point
                });
              }
            }
          }
          break;
        case 'LB':
          // Label annotations (format: "point:label")
          if (currentMoveIndex >= 0) {
            if (!result.moves[currentMoveIndex].annotations) {
              result.moves[currentMoveIndex].annotations = [];
            }
            for (const val of values) {
              const parts = val.split(':');
              if (parts.length >= 2) {
                const point = sgfToPoint(parts[0]);
                if (point) {
                  result.moves[currentMoveIndex].annotations!.push({
                    type: 'label' as AnnotationType,
                    point,
                    label: parts[1]
                  });
                }
              }
            }
          }
          break;
      }
    } else {
      i++;
    }
  }

  return result;
}

/**
 * Export move tree to SGF format
 * Note: This is a simplified exporter that exports the main line only
 */
export function exportToSGF(
  moves: { color: 'black' | 'white'; x?: number; y?: number; pass?: boolean; comment?: string }[],
  metadata: {
    blackPlayer?: string;
    whitePlayer?: string;
    komi?: number;
    handicap?: number;
    date?: string;
    result?: string;
    event?: string;
  } = {}
): string {
  let sgf = '(;GM[1]FF[4]CA[UTF-8]AP[1001GameNights:1.0]SZ[19]';

  if (metadata.blackPlayer) sgf += `PB[${escapeValue(metadata.blackPlayer)}]`;
  if (metadata.whitePlayer) sgf += `PW[${escapeValue(metadata.whitePlayer)}]`;
  if (metadata.komi !== undefined) sgf += `KM[${metadata.komi}]`;
  if (metadata.handicap && metadata.handicap > 0) sgf += `HA[${metadata.handicap}]`;
  if (metadata.date) sgf += `DT[${escapeValue(metadata.date)}]`;
  if (metadata.result) sgf += `RE[${escapeValue(metadata.result)}]`;
  if (metadata.event) sgf += `EV[${escapeValue(metadata.event)}]`;

  for (const move of moves) {
    const colorChar = move.color === 'black' ? 'B' : 'W';

    if (move.pass) {
      sgf += `;${colorChar}[]`;
    } else if (move.x !== undefined && move.y !== undefined) {
      const coord = pointToSgf({ x: move.x, y: move.y });
      sgf += `;${colorChar}[${coord}]`;
    }

    if (move.comment) {
      sgf += `C[${escapeValue(move.comment)}]`;
    }
  }

  sgf += ')';
  return sgf;
}

/**
 * Escape special characters in SGF values
 */
function escapeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/]/g, '\\]');
}

/**
 * Validate that content looks like an SGF file
 */
export function isValidSGF(content: string): boolean {
  // Basic validation - check for game tree start
  const trimmed = content.trim();
  return trimmed.startsWith('(;') && trimmed.endsWith(')');
}

/**
 * Extract game info from SGF without full parsing
 * Useful for preview/listing
 */
export function extractSGFInfo(content: string): Partial<ParsedSGF> {
  const info: Partial<ParsedSGF> = {};

  const patterns: Record<string, RegExp> = {
    blackPlayer: /PB\[([^\]]*)\]/,
    whitePlayer: /PW\[([^\]]*)\]/,
    date: /DT\[([^\]]*)\]/,
    result: /RE\[([^\]]*)\]/,
    event: /EV\[([^\]]*)\]/
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = content.match(pattern);
    if (match) {
      (info as any)[key] = match[1];
    }
  }

  const komiMatch = content.match(/KM\[([^\]]*)\]/);
  if (komiMatch) {
    info.komi = parseFloat(komiMatch[1]) || 6.5;
  }

  const handicapMatch = content.match(/HA\[([^\]]*)\]/);
  if (handicapMatch) {
    info.handicap = parseInt(handicapMatch[1]) || 0;
  }

  return info;
}
