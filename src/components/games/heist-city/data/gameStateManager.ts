import { SavedGameState, MapState, GridType } from '../types';

const GAME_STATE_STORAGE_KEY = 'heist-city-saved-games';
const MAX_SAVED_GAMES = 50; // Maximum number of saved games before auto-cleanup

/**
 * Get all saved game states from localStorage
 */
export function getSavedGames(): SavedGameState[] {
  try {
    const stored = localStorage.getItem(GAME_STATE_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading saved games from localStorage:', error);
    return [];
  }
}

/**
 * Save a game state to localStorage with automatic cleanup of oldest saves
 */
export function saveGameState(gameState: SavedGameState): { success: boolean; error?: string } {
  try {
    let savedGames = getSavedGames();

    // Check if game with same name exists and replace it
    const existingIndex = savedGames.findIndex(g => g.name === gameState.name);
    if (existingIndex >= 0) {
      savedGames[existingIndex] = gameState;
    } else {
      savedGames.push(gameState);
    }

    // Sort by timestamp (newest first) for cleanup purposes
    savedGames.sort((a, b) => b.timestamp - a.timestamp);

    // If we exceed max saves, remove oldest ones
    if (savedGames.length > MAX_SAVED_GAMES) {
      savedGames = savedGames.slice(0, MAX_SAVED_GAMES);
    }

    // Try to save, with automatic cleanup on quota exceeded
    try {
      localStorage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify(savedGames));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        // Storage full - remove oldest saves until it fits
        console.warn('Storage quota exceeded, removing oldest saves...');
        while (savedGames.length > 1) {
          savedGames.pop(); // Remove oldest
          try {
            localStorage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify(savedGames));
            console.log(`Removed old saves, now have ${savedGames.length} saves`);
            return { success: true };
          } catch {
            // Still too big, continue removing
          }
        }
        return { success: false, error: 'Storage full and unable to free space' };
      }
      throw e;
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving game state to localStorage:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Delete a saved game by name
 */
export function deleteSavedGame(name: string): void {
  try {
    const savedGames = getSavedGames();
    const filtered = savedGames.filter(g => g.name !== name);
    localStorage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting saved game from localStorage:', error);
  }
}

/**
 * Create a SavedGameState from current game data
 */
export function createSavedGameState(
  name: string,
  mapState: MapState,
  gridType: GridType,
  turnNumber: number,
  alertModifier: number
): SavedGameState {
  return {
    name,
    timestamp: Date.now(),
    mapState,
    gridType,
    turnNumber,
    alertModifier,
  };
}

/**
 * Export saved game as JSON string
 */
export function exportGameStateAsJson(gameState: SavedGameState): string {
  return JSON.stringify(gameState, null, 2);
}

/**
 * Import saved game from JSON string
 */
export function importGameStateFromJson(jsonString: string): SavedGameState | null {
  try {
    const parsed = JSON.parse(jsonString);
    // Validate structure
    if (!parsed.name || !parsed.mapState || !parsed.gridType) {
      throw new Error('Invalid game state format');
    }
    // Validate mapState has required fields
    if (!parsed.mapState.characters || !parsed.mapState.items) {
      throw new Error('Invalid mapState in game state');
    }
    return {
      name: parsed.name,
      timestamp: parsed.timestamp || Date.now(),
      mapState: parsed.mapState,
      gridType: parsed.gridType,
      turnNumber: parsed.turnNumber || 1,
      alertModifier: parsed.alertModifier || 0,
    };
  } catch (error) {
    console.error('Error parsing game state JSON:', error);
    return null;
  }
}

/**
 * Download saved game as a JSON file
 */
export function downloadGameStateAsFile(gameState: SavedGameState): void {
  const json = exportGameStateAsJson(gameState);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${gameState.name.replace(/[^a-zA-Z0-9]/g, '_')}_game.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy saved game JSON to clipboard
 */
export async function copyGameStateToClipboard(gameState: SavedGameState): Promise<boolean> {
  try {
    const json = exportGameStateAsJson(gameState);
    await navigator.clipboard.writeText(json);
    return true;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
}

/**
 * Get storage usage info
 */
export function getStorageInfo(): { used: number; savedGamesCount: number } {
  const savedGames = getSavedGames();
  const stored = localStorage.getItem(GAME_STATE_STORAGE_KEY) || '';
  return {
    used: new Blob([stored]).size,
    savedGamesCount: savedGames.length,
  };
}
