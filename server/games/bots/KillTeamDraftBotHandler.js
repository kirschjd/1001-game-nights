// Kill Team Draft Bot Handler
// Bots randomly select cards from their packs

const ADJECTIVES = ['Swift', 'Tactical', 'Strategic', 'Bold', 'Cunning', 'Elite'];
const NOUNS = ['Commander', 'Captain', 'Sergeant', 'Operator', 'Specialist', 'Agent'];

class KillTeamDraftBotHandler {
  /**
   * Get available bot styles for Kill Team Draft
   */
  getAvailableStyles() {
    return [
      {
        id: 'random',
        name: 'Random Drafter',
        description: 'Picks cards randomly from packs'
      }
    ];
  }

  /**
   * Generate a bot name
   */
  generateBotName(style) {
    const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    return `${adjective} ${noun}`;
  }

  /**
   * Get bot action for current game state
   * @param {Object} bot - Bot player
   * @param {Object} gameState - Current game state
   * @returns {Object|null} - Action to take
   */
  getBotAction(bot, gameState) {
    // Check if bot has a pack to draft from (first pack in their queue)
    const botPackQueue = gameState.packQueues[bot.id];

    if (!botPackQueue || botPackQueue.length === 0) {
      return null; // No action needed
    }

    const botPack = botPackQueue[0]; // Get first pack in queue

    if (!botPack || botPack.length === 0) {
      return null;
    }

    // Randomly select a card from the pack
    const randomIndex = Math.floor(Math.random() * botPack.length);
    const selectedCard = botPack[randomIndex];

    return {
      action: 'select-card',
      cardId: selectedCard.id
    };
  }

  /**
   * Get bots that need to make actions
   * @param {Object} gameState - Current game state
   * @param {Object} botSystem - Bot system instance
   * @returns {Array} - Array of bot players that need to act
   */
  getPendingBots(gameState, botSystem) {
    console.log('KTD Bot Handler: getPendingBots called');
    console.log('  Phase:', gameState.phase);
    console.log('  Players:', gameState.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot })));

    if (gameState.phase !== 'drafting') {
      console.log('  Not in drafting phase, returning empty array');
      return [];
    }

    const pendingBots = [];

    gameState.players.forEach(player => {
      console.log(`  Checking player ${player.name}:`, {
        isBot: botSystem.isBot(player.id),
        hasPackQueue: !!gameState.packQueues[player.id],
        queueLength: gameState.packQueues[player.id]?.length,
        firstPackLength: gameState.packQueues[player.id]?.[0]?.length
      });

      if (botSystem.isBot(player.id)) {
        const packQueue = gameState.packQueues[player.id];
        // Bot needs to act if it has a pack in its queue
        if (packQueue && packQueue.length > 0 && packQueue[0].length > 0) {
          const bot = botSystem.getBot(player.id);
          if (bot) {
            console.log(`  ✓ Bot ${player.name} is pending`);
            pendingBots.push(bot);
          }
        }
      }
    });

    console.log(`  Total pending bots: ${pendingBots.length}`);
    return pendingBots;
  }

  /**
   * Get action delay for bot (in ms)
   * Bots pick instantly as per requirements
   */
  getActionDelay(bot, index) {
    return 0; // Instant selection
  }
}

module.exports = KillTeamDraftBotHandler;
