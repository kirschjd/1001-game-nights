// Card Validation System
// Validates card definitions to catch errors early

import { Card, CardEffect, DeckType } from '../types/card.types';
import { VALID_EFFECT_TYPES } from './effectRegistry';

export interface ValidationError {
  cardId: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validate a single card
 */
export function validateCard(card: Card): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Required fields
  if (!card.id || card.id.trim() === '') {
    errors.push({
      cardId: card.id || 'unknown',
      field: 'id',
      message: 'Card ID is required',
      severity: 'error'
    });
  }

  if (!card.title || card.title.trim() === '') {
    errors.push({
      cardId: card.id,
      field: 'title',
      message: 'Card title is required',
      severity: 'error'
    });
  }

  if (!card.deckType) {
    errors.push({
      cardId: card.id,
      field: 'deckType',
      message: 'Deck type is required',
      severity: 'error'
    });
  } else if (!['base', 'lap1', 'lap2', 'lap3'].includes(card.deckType)) {
    errors.push({
      cardId: card.id,
      field: 'deckType',
      message: `Invalid deck type: ${card.deckType}. Must be base, lap1, lap2, or lap3`,
      severity: 'error'
    });
  }

  // Numeric fields validation
  if (typeof card.trickNumber !== 'number' || card.trickNumber < 0) {
    errors.push({
      cardId: card.id,
      field: 'trickNumber',
      message: 'Trick number must be a non-negative number',
      severity: 'error'
    });
  }

  if (typeof card.raceNumber !== 'number' || card.raceNumber < 0) {
    errors.push({
      cardId: card.id,
      field: 'raceNumber',
      message: 'Race number must be a non-negative number',
      severity: 'error'
    });
  }

  if (typeof card.priority !== 'number') {
    errors.push({
      cardId: card.id,
      field: 'priority',
      message: 'Priority must be a number',
      severity: 'error'
    });
  }

  // Description validation
  if (!card.description || card.description.trim() === '') {
    warnings.push({
      cardId: card.id,
      field: 'description',
      message: 'Card description is missing or empty',
      severity: 'warning'
    });
  }

  // Effects validation
  if (!Array.isArray(card.effect)) {
    errors.push({
      cardId: card.id,
      field: 'effect',
      message: 'Effect must be an array',
      severity: 'error'
    });
  } else {
    card.effect.forEach((effect, index) => {
      const effectErrors = validateEffect(effect, card.id, `effect[${index}]`);
      errors.push(...effectErrors.filter(e => e.severity === 'error'));
      warnings.push(...effectErrors.filter(e => e.severity === 'warning'));
    });
  }

  // Burn effects validation
  if (!Array.isArray(card.burnEffect)) {
    errors.push({
      cardId: card.id,
      field: 'burnEffect',
      message: 'Burn effect must be an array',
      severity: 'error'
    });
  } else {
    card.burnEffect.forEach((effect, index) => {
      const effectErrors = validateEffect(effect, card.id, `burnEffect[${index}]`);
      errors.push(...effectErrors.filter(e => e.severity === 'error'));
      warnings.push(...effectErrors.filter(e => e.severity === 'warning'));
    });
  }

  // Copies validation
  if (card.copies !== undefined) {
    if (typeof card.copies !== 'number' || card.copies < 1) {
      errors.push({
        cardId: card.id,
        field: 'copies',
        message: 'Copies must be a positive number',
        severity: 'error'
      });
    }
  }

  // ID naming conventions
  if (card.id) {
    const expectedPrefix = card.deckType + '_';
    if (!card.id.startsWith(expectedPrefix)) {
      warnings.push({
        cardId: card.id,
        field: 'id',
        message: `Card ID should start with '${expectedPrefix}' for consistency`,
        severity: 'warning'
      });
    }
  }

  // Balance warnings
  if (card.priority > 15) {
    warnings.push({
      cardId: card.id,
      field: 'priority',
      message: 'Very high priority (>15) - may cause balance issues',
      severity: 'warning'
    });
  }

  if (card.raceNumber > 10) {
    warnings.push({
      cardId: card.id,
      field: 'raceNumber',
      message: 'Very high race number (>10) - may cause balance issues',
      severity: 'warning'
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a card effect
 */
function validateEffect(
  effect: CardEffect,
  cardId: string,
  fieldPath: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!effect.type) {
    errors.push({
      cardId,
      field: fieldPath + '.type',
      message: 'Effect type is required',
      severity: 'error'
    });
  } else if (!VALID_EFFECT_TYPES.has(effect.type)) {
    errors.push({
      cardId,
      field: fieldPath + '.type',
      message: `Unknown effect type: ${effect.type}. Valid types: ${Array.from(VALID_EFFECT_TYPES).join(', ')}`,
      severity: 'error'
    });
  }

  if (!effect.params || typeof effect.params !== 'object') {
    errors.push({
      cardId,
      field: fieldPath + '.params',
      message: 'Effect params must be an object',
      severity: 'error'
    });
  } else {
    // Validate specific effect type params
    const paramErrors = validateEffectParams(effect, cardId, fieldPath);
    errors.push(...paramErrors);
  }

  return errors;
}

/**
 * Validate effect-specific parameters
 */
function validateEffectParams(
  effect: CardEffect,
  cardId: string,
  fieldPath: string
): ValidationError[] {
  const errors: ValidationError[] = [];
  const params = effect.params;

  switch (effect.type) {
    case 'move_player_position':
      if (typeof params.distance !== 'number') {
        errors.push({
          cardId,
          field: fieldPath + '.params.distance',
          message: 'move_player_position requires numeric distance parameter',
          severity: 'error'
        });
      }
      break;

    case 'move_opponent_position':
      if (typeof params.distance !== 'number') {
        errors.push({
          cardId,
          field: fieldPath + '.params.distance',
          message: 'move_opponent_position requires numeric distance parameter',
          severity: 'error'
        });
      }
      if (params.targetSelection && !['choose', 'all', 'random'].includes(params.targetSelection)) {
        errors.push({
          cardId,
          field: fieldPath + '.params.targetSelection',
          message: 'targetSelection must be "choose", "all", or "random"',
          severity: 'error'
        });
      }
      break;

    case 'affect_token_pool':
      if (!['gain', 'spend', 'set'].includes(params.action)) {
        errors.push({
          cardId,
          field: fieldPath + '.params.action',
          message: 'Token action must be "gain", "spend", or "set"',
          severity: 'error'
        });
      }
      if (!params.tokenType) {
        errors.push({
          cardId,
          field: fieldPath + '.params.tokenType',
          message: 'Token type is required (e.g., P+, R+, A+, W+, D)',
          severity: 'error'
        });
      }
      if (typeof params.count !== 'number' || params.count < 0) {
        errors.push({
          cardId,
          field: fieldPath + '.params.count',
          message: 'Token count must be a non-negative number',
          severity: 'error'
        });
      }
      break;

    case 'draw_cards':
    case 'discard_cards':
      if (typeof params.count !== 'number' || params.count < 1) {
        errors.push({
          cardId,
          field: fieldPath + '.params.count',
          message: `${effect.type} requires a positive count parameter`,
          severity: 'error'
        });
      }
      break;

    case 'modify_priority':
      if (typeof params.adjustment !== 'number') {
        errors.push({
          cardId,
          field: fieldPath + '.params.adjustment',
          message: 'modify_priority requires numeric adjustment parameter',
          severity: 'error'
        });
      }
      break;
  }

  return errors;
}

/**
 * Validate multiple cards
 */
export function validateCards(cards: Card[]): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];

  // Validate each card
  cards.forEach(card => {
    const result = validateCard(card);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  });

  // Check for duplicate IDs
  const idCounts = new Map<string, number>();
  cards.forEach(card => {
    const count = idCounts.get(card.id) || 0;
    idCounts.set(card.id, count + 1);
  });

  idCounts.forEach((count, id) => {
    if (count > 1) {
      allErrors.push({
        cardId: id,
        field: 'id',
        message: `Duplicate card ID found ${count} times`,
        severity: 'error'
      });
    }
  });

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Format validation results for console output
 */
export function formatValidationResults(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.valid && result.warnings.length === 0) {
    lines.push('✅ All cards validated successfully!');
    return lines.join('\n');
  }

  if (result.errors.length > 0) {
    lines.push('❌ VALIDATION ERRORS:');
    result.errors.forEach(error => {
      lines.push(`  [${error.cardId}] ${error.field}: ${error.message}`);
    });
    lines.push('');
  }

  if (result.warnings.length > 0) {
    lines.push('⚠️  VALIDATION WARNINGS:');
    result.warnings.forEach(warning => {
      lines.push(`  [${warning.cardId}] ${warning.field}: ${warning.message}`);
    });
    lines.push('');
  }

  lines.push(`Summary: ${result.errors.length} error(s), ${result.warnings.length} warning(s)`);

  return lines.join('\n');
}

/**
 * Validate card database on import (useful for development)
 */
export function validateCardDatabase(cardDatabase: Record<DeckType, Card[]>): void {
  const allCards = Object.values(cardDatabase).flat();
  const result = validateCards(allCards);

  if (!result.valid || result.warnings.length > 0) {
    console.warn('⚠️  Card Database Validation Results:');
    console.warn(formatValidationResults(result));

    if (!result.valid) {
      console.error('❌ Card database contains errors. Please fix them before proceeding.');
    }
  } else {
    console.log('✅ Card database validated successfully!');
  }
}