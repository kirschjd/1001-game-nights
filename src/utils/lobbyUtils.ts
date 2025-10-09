// src/utils/lobbyUtils.ts
// Shared lobby utility functions

/**
 * Generate a random lobby slug from predefined words
 * @returns Random 3-word slug separated by hyphens
 */
export function generateLobbySlug(): string {
  const words = [
    'horse', 'hat', 'wickerbasket', 'blue', 'mountain', 'river', 'coffee', 'laptop',
    'sunset', 'garden', 'book', 'candle', 'forest', 'ocean', 'pizza', 'guitar',
    'rainbow', 'cloud', 'bicycle', 'camera', 'thunder', 'whisper', 'diamond', 'feather',
    'knight', 'dragon', 'castle', 'magic', 'crystal', 'shadow', 'flame', 'frost'
  ];

  const shuffled = words.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).join('-');
}

/**
 * Validate lobby slug format
 * @param slug - Lobby slug to validate
 * @returns True if slug is valid
 */
export function isValidLobbySlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;

  // Slug should be 3 words separated by hyphens, alphanumeric only
  const parts = slug.split('-');
  if (parts.length !== 3) return false;

  return parts.every(part => /^[a-z0-9]+$/i.test(part) && part.length > 0);
}

/**
 * Sanitize lobby title
 * @param title - Raw title input
 * @returns Sanitized title
 */
export function sanitizeLobbyTitle(title: string): string {
  return title.trim().slice(0, 50); // Max 50 characters
}

/**
 * Sanitize player name
 * @param name - Raw player name input
 * @returns Sanitized name
 */
export function sanitizePlayerName(name: string): string {
  return name.trim().slice(0, 20); // Max 20 characters
}