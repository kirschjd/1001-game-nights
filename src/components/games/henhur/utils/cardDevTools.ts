// Card Development Tools
// Utilities for rapid card prototyping and testing

import { Card, DeckType } from '../types/card.types';
import { validateCard, formatValidationResults } from './cardValidator';
import { ALL_CARDS, getDatabaseStats } from '../data/cardDatabase';
import { registerEffect, getRegisteredEffectTypes, debugListEffects } from './effectRegistry';
import { exportCardsToJSON, exportCardsToCSV } from './cardImportExport';

// ============================================================================
// QUICK CARD BUILDER
// ============================================================================

/**
 * Builder pattern for creating cards quickly
 */
export class CardBuilder {
  private card: Partial<Card>;

  constructor(id: string, title: string) {
    this.card = {
      id,
      title,
      effect: [],
      burnEffect: []
    };
  }

  deckType(type: DeckType): this {
    this.card.deckType = type;
    return this;
  }

  priority(value: number): this {
    this.card.priority = value;
    return this;
  }

  trickNumber(value: number): this {
    this.card.trickNumber = value;
    return this;
  }

  raceNumber(value: number): this {
    this.card.raceNumber = value;
    return this;
  }

  description(text: string): this {
    this.card.description = text;
    return this;
  }

  copies(count: number): this {
    this.card.copies = count;
    return this;
  }

  addEffect(type: string, params: Record<string, any>): this {
    this.card.effect = this.card.effect || [];
    this.card.effect.push({ type, params });
    return this;
  }

  addBurnEffect(type: string, params: Record<string, any>): this {
    this.card.burnEffect = this.card.burnEffect || [];
    this.card.burnEffect.push({ type, params });
    return this;
  }

  // Shorthand methods for common effects
  move(distance: number): this {
    return this.addEffect('move_player_position', { distance });
  }

  moveOpponent(distance: number): this {
    return this.addEffect('move_opponent_position', { distance, targetSelection: 'choose' });
  }

  gainToken(tokenType: string, count: number): this {
    return this.addEffect('affect_token_pool', { action: 'gain', tokenType, count });
  }

  draw(count: number): this {
    return this.addEffect('draw_cards', { count });
  }

  burnDraw(count: number): this {
    return this.addBurnEffect('draw_cards', { count });
  }

  build(): Card {
    // Validate before building
    const validation = validateCard(this.card as Card);
    if (!validation.valid) {
      console.warn('⚠️  Card has validation errors:');
      console.warn(formatValidationResults(validation));
    }

    return this.card as Card;
  }
}

/**
 * Quick card creation helper
 */
export function quickCard(id: string, title: string): CardBuilder {
  return new CardBuilder(id, title);
}

// Example usage:
// const newCard = quickCard('lap1_speed_boost', 'Speed Boost')
//   .deckType('lap1')
//   .priority(8)
//   .trickNumber(2)
//   .raceNumber(1)
//   .description('Move 4 spaces and draw a card')
//   .move(4)
//   .draw(1)
//   .burnDraw(2)
//   .copies(3)
//   .build();

// ============================================================================
// CARD COMPARISON & ANALYSIS
// ============================================================================

/**
 * Compare two cards
 */
export function compareCards(card1: Card, card2: Card) {
  return {
    id: { card1: card1.id, card2: card2.id },
    title: { card1: card1.title, card2: card2.title },
    priority: {
      card1: card1.priority,
      card2: card2.priority,
      diff: card2.priority - card1.priority
    },
    trickNumber: {
      card1: card1.trickNumber,
      card2: card2.trickNumber,
      diff: card2.trickNumber - card1.trickNumber
    },
    raceNumber: {
      card1: card1.raceNumber,
      card2: card2.raceNumber,
      diff: card2.raceNumber - card1.raceNumber
    },
    effects: {
      card1: card1.effect.length,
      card2: card2.effect.length
    },
    burnEffects: {
      card1: card1.burnEffect.length,
      card2: card2.burnEffect.length
    }
  };
}

/**
 * Get cards sorted by priority
 */
export function getCardsByPriority(cards: Card[] = ALL_CARDS): Card[] {
  return [...cards].sort((a, b) => b.priority - a.priority);
}

/**
 * Get cards sorted by race number
 */
export function getCardsByRaceNumber(cards: Card[] = ALL_CARDS): Card[] {
  return [...cards].sort((a, b) => b.raceNumber - a.raceNumber);
}

/**
 * Find similar cards (same deck type and similar priority)
 */
export function findSimilarCards(card: Card, cards: Card[] = ALL_CARDS): Card[] {
  return cards.filter(
    c =>
      c.id !== card.id &&
      c.deckType === card.deckType &&
      Math.abs(c.priority - card.priority) <= 2
  );
}

// ============================================================================
// CARD TESTING HELPERS
// ============================================================================

/**
 * Create a test scenario with specific cards
 */
export interface TestScenario {
  name: string;
  description: string;
  cards: Card[];
  expectedOutcome?: string;
}

/**
 * Define test scenarios for playtesting
 */
export function createTestScenario(
  name: string,
  description: string,
  cardIds: string[]
): TestScenario {
  const cards = cardIds
    .map(id => ALL_CARDS.find(c => c.id === id))
    .filter(Boolean) as Card[];

  return {
    name,
    description,
    cards
  };
}

// ============================================================================
// CARD DATABASE UTILITIES
// ============================================================================

/**
 * Print database statistics
 */
export function printDatabaseStats(): void {
  const stats = getDatabaseStats();

  console.log('\n📊 Card Database Statistics');
  console.log('━'.repeat(50));
  console.log(`Total Unique Cards: ${stats.totalUniqueCards}`);
  console.log(`Total Card Copies: ${stats.totalCardCopies}`);
  console.log('\nBy Deck Type:');
  Object.entries(stats.byDeckType).forEach(([type, data]) => {
    console.log(`  ${type}: ${data.unique} unique (${data.total} total)`);
  });
  console.log('\nEffect Types Usage:');
  Object.entries(stats.effectTypes).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  console.log(`\nPriority Range: ${stats.priorityRange.min} - ${stats.priorityRange.max}`);
  console.log('━'.repeat(50) + '\n');
}

/**
 * Export entire database in multiple formats
 */
export function exportDatabase() {
  return {
    json: exportCardsToJSON(ALL_CARDS),
    csv: exportCardsToCSV(ALL_CARDS),
    stats: getDatabaseStats()
  };
}

/**
 * Find cards by effect type
 */
export function findCardsByEffect(effectType: string, cards: Card[] = ALL_CARDS): Card[] {
  return cards.filter(card => card.effect.some(e => e.type === effectType));
}

/**
 * Get cards with no burn effects
 */
export function getCardsWithoutBurnEffects(cards: Card[] = ALL_CARDS): Card[] {
  return cards.filter(card => card.burnEffect.length === 0);
}

/**
 * Get cards that allow auction burning (have @ symbol conceptually)
 */
export function getAuctionBurnableCards(cards: Card[] = ALL_CARDS): Card[] {
  return cards.filter(card => card.burnEffect.length > 0);
}

// ============================================================================
// DEVELOPMENT MODE HELPERS
// ============================================================================

/**
 * Enable development mode logging
 */
export function enableDevMode(): void {
  console.log('🔧 HenHur Dev Mode Enabled');
  printDatabaseStats();
  debugListEffects();
}

/**
 * Quick validate all cards in database
 */
export function validateAllCards(): void {
  console.log('🔍 Validating all cards...');
  let errorCount = 0;
  let warningCount = 0;

  ALL_CARDS.forEach(card => {
    const result = validateCard(card);
    if (!result.valid) {
      console.error(`❌ ${card.id}: ${result.errors.map(e => e.message).join(', ')}`);
      errorCount += result.errors.length;
    }
    if (result.warnings.length > 0) {
      console.warn(`⚠️  ${card.id}: ${result.warnings.map(w => w.message).join(', ')}`);
      warningCount += result.warnings.length;
    }
  });

  console.log(`\n✅ Validation complete: ${errorCount} error(s), ${warningCount} warning(s)`);
}

/**
 * Hot reload cards (for development)
 */
export function hotReloadCards(newCards: Card[]): {
  success: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  newCards.forEach(card => {
    const result = validateCard(card);
    if (!result.valid) {
      errors.push(`${card.id}: ${result.errors.map(e => e.message).join(', ')}`);
    }
  });

  if (errors.length === 0) {
    console.log('🔄 Cards reloaded successfully');
    return { success: true, errors: [] };
  } else {
    console.error('❌ Failed to reload cards:', errors);
    return { success: false, errors };
  }
}

// ============================================================================
// CARD GENERATION HELPERS
// ============================================================================

/**
 * Generate a series of similar cards with variations
 */
export function generateCardVariations(
  baseCard: Card,
  variations: Array<Partial<Card>>
): Card[] {
  return variations.map((variation, index) => ({
    ...baseCard,
    ...variation,
    id: variation.id || `${baseCard.id}_variant_${index + 1}`
  }));
}

/**
 * Batch create movement cards
 */
export function createMovementCards(
  deckType: DeckType,
  distances: number[]
): Card[] {
  return distances.map((distance, index) =>
    quickCard(
      `${deckType}_move_${distance}`,
      `Move ${distance}`
    )
      .deckType(deckType)
      .priority(5 + index)
      .trickNumber(index + 1)
      .raceNumber(1)
      .description(`Move forward ${distance} space${distance !== 1 ? 's' : ''}`)
      .move(distance)
      .copies(3)
      .build()
  );
}

// ============================================================================
// EXPORT FOR CONSOLE/TESTING
// ============================================================================

// Make all dev tools available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).henHurDevTools = {
    quickCard,
    validateAllCards,
    printDatabaseStats,
    enableDevMode,
    compareCards,
    findSimilarCards,
    findCardsByEffect,
    exportDatabase,
    createTestScenario,
    generateCardVariations,
    createMovementCards
  };
  console.log('💡 HenHur Dev Tools available at: window.henHurDevTools');
}