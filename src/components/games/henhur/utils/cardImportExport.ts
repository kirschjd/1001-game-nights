// Card Import/Export Utilities
// Tools for importing cards from CSV/JSON and exporting for external editing

import { Card, CardEffect, DeckType } from '../types/card.types';
import { validateCard, ValidationResult } from './cardValidator';

// ============================================================================
// JSON IMPORT/EXPORT
// ============================================================================

/**
 * Export cards to JSON string (formatted for readability)
 */
export function exportCardsToJSON(cards: Card[]): string {
  return JSON.stringify(cards, null, 2);
}

/**
 * Import cards from JSON string
 */
export function importCardsFromJSON(jsonString: string): {
  cards: Card[];
  errors: string[];
} {
  const errors: string[] = [];
  let cards: Card[] = [];

  try {
    const parsed = JSON.parse(jsonString);

    if (!Array.isArray(parsed)) {
      errors.push('JSON must contain an array of cards');
      return { cards: [], errors };
    }

    cards = parsed;

    // Validate each card
    cards.forEach((card, index) => {
      const result = validateCard(card);
      if (!result.valid) {
        errors.push(`Card ${index + 1} (${card.id || 'unknown'}): ${result.errors.map(e => e.message).join(', ')}`);
      }
    });
  } catch (error) {
    errors.push(`Failed to parse JSON: ${error}`);
  }

  return { cards, errors };
}

// ============================================================================
// CSV IMPORT/EXPORT
// ============================================================================

/**
 * Export cards to CSV format
 * Useful for editing in spreadsheet applications
 */
export function exportCardsToCSV(cards: Card[]): string {
  const headers = [
    'id',
    'title',
    'deckType',
    'trickNumber',
    'raceNumber',
    'priority',
    'description',
    'effect',
    'burnEffect',
    'copies'
  ];

  const rows = cards.map(card => [
    card.id,
    card.title,
    card.deckType,
    card.trickNumber.toString(),
    card.raceNumber.toString(),
    card.priority.toString(),
    card.description,
    JSON.stringify(card.effect),
    JSON.stringify(card.burnEffect),
    (card.copies || 1).toString()
  ]);

  const csvLines = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
  ];

  return csvLines.join('\n');
}

/**
 * Import cards from CSV format
 */
export function importCardsFromCSV(csvString: string): {
  cards: Card[];
  errors: string[];
} {
  const errors: string[] = [];
  const cards: Card[] = [];

  try {
    const lines = csvString.trim().split('\n');

    if (lines.length < 2) {
      errors.push('CSV must have at least a header row and one data row');
      return { cards: [], errors };
    }

    // Parse header
    const headers = parseCSVLine(lines[0]);

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);

      if (values.length !== headers.length) {
        errors.push(`Row ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
        continue;
      }

      const rowData: Record<string, string> = {};
      headers.forEach((header, index) => {
        rowData[header] = values[index];
      });

      try {
        const card: Card = {
          id: rowData.id,
          title: rowData.title,
          deckType: rowData.deckType as DeckType,
          trickNumber: parseInt(rowData.trickNumber),
          raceNumber: parseInt(rowData.raceNumber),
          priority: parseInt(rowData.priority),
          description: rowData.description,
          effect: JSON.parse(rowData.effect || '[]'),
          burnEffect: JSON.parse(rowData.burnEffect || '[]'),
          copies: rowData.copies ? parseInt(rowData.copies) : 1
        };

        // Validate the card
        const validation = validateCard(card);
        if (!validation.valid) {
          errors.push(`Row ${i + 1} (${card.id}): ${validation.errors.map(e => e.message).join(', ')}`);
        } else {
          cards.push(card);
        }
      } catch (error) {
        errors.push(`Row ${i + 1}: Failed to parse card data - ${error}`);
      }
    }
  } catch (error) {
    errors.push(`Failed to parse CSV: ${error}`);
  }

  return { cards, errors };
}

/**
 * Parse a CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

// ============================================================================
// SIMPLIFIED FORMAT (For quick card creation)
// ============================================================================

/**
 * Simplified card format for quick manual entry
 * Example:
 *   lap1_dash | Dash | 7 | 2 | 1 | Move 3 spaces | move_player_position:distance=3
 */
export interface SimplifiedCardFormat {
  id: string;
  title: string;
  priority: number;
  trickNumber: number;
  raceNumber: number;
  description: string;
  effectString: string; // Simplified effect notation
  burnEffectString?: string;
  copies?: number;
}

/**
 * Parse simplified effect string
 * Format: "effect_type:param1=value1,param2=value2"
 */
function parseEffectString(effectString: string): CardEffect[] {
  if (!effectString || effectString.trim() === '') {
    return [];
  }

  const effects: CardEffect[] = [];
  const effectParts = effectString.split('|').map(s => s.trim());

  for (const part of effectParts) {
    const [type, paramsString] = part.split(':');

    const params: Record<string, any> = {};
    if (paramsString) {
      const paramPairs = paramsString.split(',');
      for (const pair of paramPairs) {
        const [key, value] = pair.split('=');
        // Try to parse as number, otherwise keep as string
        params[key.trim()] = isNaN(Number(value)) ? value.trim() : Number(value);
      }
    }

    effects.push({ type: type.trim(), params });
  }

  return effects;
}

/**
 * Convert simplified format to full card
 */
export function simplifiedToCard(
  simplified: SimplifiedCardFormat,
  deckType: DeckType
): Card {
  return {
    id: simplified.id,
    title: simplified.title,
    deckType,
    trickNumber: simplified.trickNumber,
    raceNumber: simplified.raceNumber,
    priority: simplified.priority,
    description: simplified.description,
    effect: parseEffectString(simplified.effectString),
    burnEffect: simplified.burnEffectString
      ? parseEffectString(simplified.burnEffectString)
      : [],
    copies: simplified.copies || 1
  };
}

/**
 * Convert full card to simplified format
 */
export function cardToSimplified(card: Card): SimplifiedCardFormat {
  const effectString = card.effect
    .map(e => {
      const params = Object.entries(e.params)
        .map(([k, v]) => `${k}=${v}`)
        .join(',');
      return params ? `${e.type}:${params}` : e.type;
    })
    .join(' | ');

  const burnEffectString = card.burnEffect
    .map(e => {
      const params = Object.entries(e.params)
        .map(([k, v]) => `${k}=${v}`)
        .join(',');
      return params ? `${e.type}:${params}` : e.type;
    })
    .join(' | ');

  return {
    id: card.id,
    title: card.title,
    priority: card.priority,
    trickNumber: card.trickNumber,
    raceNumber: card.raceNumber,
    description: card.description,
    effectString,
    burnEffectString: burnEffectString || undefined,
    copies: card.copies
  };
}

// ============================================================================
// BATCH IMPORT HELPER
// ============================================================================

/**
 * Import cards from multiple sources and combine them
 */
export function batchImportCards(sources: {
  json?: string;
  csv?: string;
  simplified?: Array<{ card: SimplifiedCardFormat; deckType: DeckType }>;
}): {
  cards: Card[];
  errors: string[];
} {
  const allCards: Card[] = [];
  const allErrors: string[] = [];

  // Import from JSON
  if (sources.json) {
    const result = importCardsFromJSON(sources.json);
    allCards.push(...result.cards);
    allErrors.push(...result.errors);
  }

  // Import from CSV
  if (sources.csv) {
    const result = importCardsFromCSV(sources.csv);
    allCards.push(...result.cards);
    allErrors.push(...result.errors);
  }

  // Import from simplified format
  if (sources.simplified) {
    sources.simplified.forEach(({ card, deckType }) => {
      try {
        const fullCard = simplifiedToCard(card, deckType);
        const validation = validateCard(fullCard);
        if (validation.valid) {
          allCards.push(fullCard);
        } else {
          allErrors.push(
            `Simplified card ${card.id}: ${validation.errors.map(e => e.message).join(', ')}`
          );
        }
      } catch (error) {
        allErrors.push(`Failed to convert simplified card ${card.id}: ${error}`);
      }
    });
  }

  return { cards: allCards, errors: allErrors };
}

// ============================================================================
// CARD TEMPLATE GENERATOR
// ============================================================================

/**
 * Generate a template card for easy copying
 */
export function generateCardTemplate(deckType: DeckType): Card {
  return {
    id: `${deckType}_template`,
    title: 'Template Card',
    deckType,
    trickNumber: 1,
    raceNumber: 1,
    priority: 5,
    description: 'Card description here',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 1 }
      }
    ],
    burnEffect: [],
    copies: 1
  };
}

/**
 * Generate multiple card templates as JSON
 */
export function generateCardTemplates(count: number, deckType: DeckType): string {
  const templates: Card[] = [];

  for (let i = 1; i <= count; i++) {
    templates.push({
      ...generateCardTemplate(deckType),
      id: `${deckType}_card_${i}`,
      title: `Card ${i}`
    });
  }

  return exportCardsToJSON(templates);
}