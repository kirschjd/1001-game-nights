// HenHur Game Initialization
// This file runs on game load to set up the card system and dev tools

import { validateCardDatabase } from './utils/cardValidator';
import { CARD_DATABASE, getDatabaseStats } from './data/cardDatabase';
import { enableDevMode } from './utils/cardDevTools';

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Initialize the HenHur card system
 */
export function initializeHenHur(): void {
  console.log('🏁 Initializing HenHur game system...');

  // Validate card database
  validateCardDatabase(CARD_DATABASE);

  // Get and log stats
  const stats = getDatabaseStats();
  console.log(`📦 Loaded ${stats.totalUniqueCards} unique cards (${stats.totalCardCopies} total copies)`);

  // Enable dev tools in development mode
  if (isDevelopment) {
    enableDevMode();
  }

  console.log('✅ HenHur initialization complete');
}

// Auto-initialize on import in development
if (isDevelopment) {
  initializeHenHur();
}

export default initializeHenHur;