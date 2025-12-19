import { EquipmentLoadout, CharacterRole, CharacterToken } from '../types';

const LOADOUT_STORAGE_KEY = 'heist-city-loadouts';

/**
 * Get all saved loadouts from localStorage
 */
export function getSavedLoadouts(): EquipmentLoadout[] {
  try {
    const stored = localStorage.getItem(LOADOUT_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading loadouts from localStorage:', error);
    return [];
  }
}

/**
 * Save a loadout to localStorage
 */
export function saveLoadout(loadout: EquipmentLoadout): void {
  try {
    const loadouts = getSavedLoadouts();
    // Check if loadout with same name exists and replace it
    const existingIndex = loadouts.findIndex(l => l.name === loadout.name);
    if (existingIndex >= 0) {
      loadouts[existingIndex] = loadout;
    } else {
      loadouts.push(loadout);
    }
    localStorage.setItem(LOADOUT_STORAGE_KEY, JSON.stringify(loadouts));
  } catch (error) {
    console.error('Error saving loadout to localStorage:', error);
  }
}

/**
 * Delete a loadout from localStorage by name
 */
export function deleteLoadout(name: string): void {
  try {
    const loadouts = getSavedLoadouts();
    const filtered = loadouts.filter(l => l.name !== name);
    localStorage.setItem(LOADOUT_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting loadout from localStorage:', error);
  }
}

/**
 * Create a loadout from current character equipment, experience, and stats
 */
export function createLoadoutFromCharacters(
  name: string,
  characters: CharacterToken[]
): EquipmentLoadout {
  return {
    name,
    timestamp: Date.now(),
    characters: characters.map(char => ({
      role: char.role,
      equipment: char.equipment || [],
      experience: char.experience || 0,
      stats: char.stats, // Save base stats (for permanent modifications)
    })),
  };
}

/**
 * Apply a loadout to characters (returns updated characters)
 * Restores equipment, experience, and stats from the loadout
 */
export function applyLoadoutToCharacters(
  loadout: EquipmentLoadout,
  characters: CharacterToken[]
): CharacterToken[] {
  return characters.map(char => {
    const loadoutChar = loadout.characters.find(lc => lc.role === char.role);
    if (loadoutChar) {
      const updated: CharacterToken = {
        ...char,
        equipment: loadoutChar.equipment,
      };

      // Restore experience if available
      if (loadoutChar.experience !== undefined) {
        updated.experience = loadoutChar.experience;
      }

      // Restore stats if available (for permanent stat modifications)
      if (loadoutChar.stats) {
        updated.stats = {
          ...loadoutChar.stats,
          // Preserve current wounds (don't override with saved wounds)
          wounds: char.stats.wounds,
        };
      }

      return updated;
    }
    return char;
  });
}

/**
 * Export loadout as JSON string
 */
export function exportLoadoutAsJson(loadout: EquipmentLoadout): string {
  return JSON.stringify(loadout, null, 2);
}

/**
 * Import loadout from JSON string
 */
export function importLoadoutFromJson(jsonString: string): EquipmentLoadout | null {
  try {
    const parsed = JSON.parse(jsonString);
    // Validate structure
    if (!parsed.name || !parsed.characters || !Array.isArray(parsed.characters)) {
      throw new Error('Invalid loadout format');
    }
    // Validate each character entry
    const validRoles: CharacterRole[] = ['Face', 'Muscle', 'Ninja', 'Brain', 'Spook'];
    for (const char of parsed.characters) {
      if (!validRoles.includes(char.role) || !Array.isArray(char.equipment)) {
        throw new Error('Invalid character entry in loadout');
      }
    }
    return {
      name: parsed.name,
      timestamp: parsed.timestamp || Date.now(),
      characters: parsed.characters.map((char: any) => ({
        role: char.role,
        equipment: char.equipment,
        experience: char.experience, // Optional field
        stats: char.stats, // Optional field
      })),
    };
  } catch (error) {
    console.error('Error parsing loadout JSON:', error);
    return null;
  }
}

/**
 * Download loadout as a JSON file
 */
export function downloadLoadoutAsFile(loadout: EquipmentLoadout): void {
  const json = exportLoadoutAsJson(loadout);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${loadout.name.replace(/[^a-zA-Z0-9]/g, '_')}_loadout.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy loadout JSON to clipboard
 */
export async function copyLoadoutToClipboard(loadout: EquipmentLoadout): Promise<boolean> {
  try {
    const json = exportLoadoutAsJson(loadout);
    await navigator.clipboard.writeText(json);
    return true;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
}
