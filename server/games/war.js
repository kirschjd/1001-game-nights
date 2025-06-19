// War Card Game Server Logic

class WarGame {
  constructor(players) {
    this.state = {
      type: 'war',
      phase: 'dealing',
      round: 1,
      winner: null,
      players: players.map(p => ({
        id: p.id, // Preserve original socket ID
        name: p.name,
        score: 0,
        card: null,
        hasPlayed: false,
        hasFolded: false,
        action: null // 'play', 'fold', or null
      })),
      roundResults: null
    };
  }

  // Deal cards to all players
  dealCards() {
    this.state.players.forEach(player => {
      player.card = Math.floor(Math.random() * 13) + 1; // 1-13 (Ace to King)
      player.hasPlayed = false;
      player.hasFolded = false;
      player.action = null;
    });
    
    this.state.phase = 'playing';
    this.state.roundResults = null;
    
    return this.getGameState();
  }

  // Player makes a play or fold decision
  playerAction(playerId, action) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player || this.state.phase !== 'playing') {
      console.log(`War action rejected: player=${!!player}, phase=${this.state.phase}`);
      return { success: false, error: 'Invalid action' };
    }

    if (player.action !== null) {
      console.log(`War action rejected: player ${player.name} already acted`);
      return { success: false, error: 'Player already acted' };
    }

    if (action === 'play') {
      player.hasPlayed = true;
      player.hasFolded = false;
      player.action = 'play';
    } else if (action === 'fold') {
      player.hasPlayed = false;
      player.hasFolded = true;
      player.action = 'fold';
      player.score -= 1; // Immediate penalty for folding
    } else {
      return { success: false, error: 'Invalid action type' };
    }

    console.log(`War: ${player.name} chose to ${action}`);

    // Check if all players have acted
    const allActed = this.state.players.every(p => p.hasPlayed || p.hasFolded);
    
    if (allActed) {
      console.log('War: All players have acted, resolving round');
      this.resolveRound();
    }

    return { success: true, gameState: this.getGameState() };
  }

  // Resolve the round and calculate scores
  resolveRound() {
    const playingPlayers = this.state.players.filter(p => p.hasPlayed);
    
    if (playingPlayers.length === 0) {
      // Everyone folded
      this.state.roundResults = {
        message: "Everyone folded! No points awarded.",
        winner: null,
        highCard: null
      };
    } else {
      // Find highest card
      const highCard = Math.max(...playingPlayers.map(p => p.card));
      const winners = playingPlayers.filter(p => p.card === highCard);
      
      if (winners.length === 1) {
        // Single winner
        const winner = winners[0];
        winner.score += 1;
        
        // Everyone else who played loses a point
        playingPlayers.forEach(p => {
          if (p.id !== winner.id) {
            p.score -= 1;
          }
        });
        
        this.state.roundResults = {
          message: `${winner.name} wins with ${this.getCardName(highCard)}!`,
          winner: winner.name,
          highCard: highCard
        };
      } else {
        // Tie - no score changes
        this.state.roundResults = {
          message: `Tie with ${this.getCardName(highCard)}! No points awarded.`,
          winner: null,
          highCard: highCard
        };
      }
    }

    this.state.phase = 'revealing';

    // Check for game winner
    const gameWinner = this.state.players.find(p => p.score >= 5);
    if (gameWinner) {
      this.state.phase = 'complete';
      this.state.winner = gameWinner.name;
      console.log(`War game complete! Winner: ${gameWinner.name}`);
    }
  }

  // Start next round
  nextRound() {
    if (this.state.phase !== 'revealing') {
      return { success: false, error: 'Cannot start next round' };
    }

    if (this.state.winner) {
      return { success: false, error: 'Game is complete' };
    }

    this.state.round += 1;
    console.log(`War: Starting round ${this.state.round}`);
    this.dealCards();
    
    return { success: true, gameState: this.getGameState() };
  }

  // Get game state for a specific player
  getPlayerView(playerId) {
    const baseState = this.getGameState();
    const currentPlayer = baseState.players.find(p => p.id === playerId);
    
    if (this.state.phase === 'playing') {
      // During playing phase, only show own card
      baseState.players = baseState.players.map(p => ({
        ...p,
        card: p.id === playerId ? p.card : null // Hide other players' cards
      }));
    }
    
    return {
      ...baseState,
      currentPlayer: currentPlayer
    };
  }

  // Get full game state (for revealing phase)
  getGameState() {
    return {
      type: this.state.type,
      phase: this.state.phase,
      round: this.state.round,
      winner: this.state.winner,
      players: [...this.state.players],
      roundResults: this.state.roundResults
    };
  }

  // Helper to convert card number to name
  getCardName(cardValue) {
    const cardNames = {
      1: 'Ace', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
      8: '8', 9: '9', 10: '10', 11: 'Jack', 12: 'Queen', 13: 'King'
    };
    return cardNames[cardValue] || cardValue.toString();
  }

  // Check if game is complete
  isGameComplete() {
    return this.state.phase === 'complete';
  }
}

module.exports = WarGame;