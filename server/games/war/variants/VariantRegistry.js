// server/games/war/variants/VariantRegistry.js
// War game variant registration and management

class VariantRegistry {
  constructor() {
    this.variants = new Map();
    this.registerDefaultVariants();
  }

  /**
   * Register default war variants
   */
  registerDefaultVariants() {
    this.registerVariant({
      id: 'regular',
      name: 'Regular War',
      description: 'Standard rules - highest card wins',
      rules: [
        'Each player reveals their card',
        'Highest card wins the round',
        'Winner gets +1 point, others get -1',
        'Ace = 1, King = 13',
        'First to 5 points wins'
      ],
      difficulty: 'easy',
      minPlayers: 2,
      maxPlayers: 8,
      estimatedTime: '5-10 minutes'
    });

    this.registerVariant({
      id: 'aces-high',
      name: 'Aces High',
      description: 'Aces always win, regardless of other cards',
      rules: [
        'Aces (A) always win against any other card',
        'If multiple Aces are played, it\'s a tie',
        'If no Aces, highest card wins normally',
        'Winner gets +1 point, others get -1',
        'First to 5 points wins'
      ],
      difficulty: 'easy',
      minPlayers: 2,
      maxPlayers: 8,
      estimatedTime: '5-10 minutes'
    });
  }

  /**
   * Register a new variant
   * @param {Object} variant - Variant definition
   */
  registerVariant(variant) {
    if (!variant.id || !variant.name) {
      throw new Error('Variant must have id and name');
    }

    this.variants.set(variant.id, {
      id: variant.id,
      name: variant.name,
      description: variant.description || '',
      rules: variant.rules || [],
      difficulty: variant.difficulty || 'medium',
      minPlayers: variant.minPlayers || 2,
      maxPlayers: variant.maxPlayers || 8,
      estimatedTime: variant.estimatedTime || '10-15 minutes',
      isCustom: variant.isCustom || false
    });

    console.log(`Registered War variant: ${variant.name}`);
  }

  /**
   * Get variant by ID
   * @param {string} variantId - Variant ID
   * @returns {Object|null} - Variant definition or null
   */
  getVariant(variantId) {
    return this.variants.get(variantId) || null;
  }

  /**
   * Get all available variants
   * @returns {Array} - Array of variant definitions
   */
  getAllVariants() {
    return Array.from(this.variants.values());
  }

  /**
   * Get variants by difficulty
   * @param {string} difficulty - 'easy', 'medium', 'hard'
   * @returns {Array} - Array of matching variants
   */
  getVariantsByDifficulty(difficulty) {
    return this.getAllVariants().filter(v => v.difficulty === difficulty);
  }

  /**
   * Check if variant supports player count
   * @param {string} variantId - Variant ID
   * @param {number} playerCount - Number of players
   * @returns {boolean} - True if supported
   */
  supportsPlayerCount(variantId, playerCount) {
    const variant = this.getVariant(variantId);
    if (!variant) return false;

    return playerCount >= variant.minPlayers && playerCount <= variant.maxPlayers;
  }

  /**
   * Get variant-specific win logic
   * @param {string} variantId - Variant ID
   * @param {Array} playingPlayers - Players who played cards
   * @returns {Object} - {winners: Array, highCard: number}
   */
  determineWinners(variantId, playingPlayers) {
    switch (variantId) {
      case 'aces-high':
        return this.determineAcesHighWinners(playingPlayers);
      
      case 'regular':
      default:
        return this.determineRegularWinners(playingPlayers);
    }
  }

  /**
   * Regular war winner determination
   * @param {Array} playingPlayers - Players who played
   * @returns {Object} - Winners and high card
   */
  determineRegularWinners(playingPlayers) {
    const highCard = Math.max(...playingPlayers.map(p => p.card));
    const winners = playingPlayers.filter(p => p.card === highCard);
    return { winners, highCard };
  }

  /**
   * Aces High winner determination
   * @param {Array} playingPlayers - Players who played
   * @returns {Object} - Winners and high card
   */
  determineAcesHighWinners(playingPlayers) {
    // Check for Aces first
    const acePlayers = playingPlayers.filter(p => p.card === 1);
    
    if (acePlayers.length > 0) {
      // Aces always win
      return { winners: acePlayers, highCard: 1 };
    } else {
      // No aces, use regular logic
      return this.determineRegularWinners(playingPlayers);
    }
  }

  /**
   * Remove custom variant
   * @param {string} variantId - Variant ID to remove
   * @returns {boolean} - True if removed
   */
  removeVariant(variantId) {
    const variant = this.getVariant(variantId);
    if (variant && variant.isCustom) {
      this.variants.delete(variantId);
      console.log(`Removed custom War variant: ${variant.name}`);
      return true;
    }
    return false;
  }
}

// Create singleton instance
const variantRegistry = new VariantRegistry();

module.exports = variantRegistry;