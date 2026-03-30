class VanLifeGame {
  constructor(connectedPlayers) {
    const playerColors = ['#F44336', '#2196F3', '#4CAF50', '#FFEB3B', '#9C27B0', '#FF9800'];
    this.state = {
      type: 'van-life',
      phase: 'LOBBY',
      players: connectedPlayers.map((p, i) => ({
        id: p.id,
        name: p.name,
        isConnected: true,
        score: 0,
        color: playerColors[i % playerColors.length],
      })),
      currentTurn: null,
      claimedRoutes: [],
      visitedParks: [],
    };
  }

  getPlayerView(playerId) {
    return this.state;
  }

  startGame() {
    this.state.phase = 'PLAYING';
    this.state.currentTurn = this.state.players[0]?.id || null;
    return { success: true };
  }

  claimRoute(playerId, routeId) {
    if (this.state.phase !== 'PLAYING') return { success: false, error: 'Game not in progress' };
    if (this.state.currentTurn !== playerId) return { success: false, error: 'Not your turn' };
    if (this.state.claimedRoutes.find(r => r.routeId === routeId)) {
      return { success: false, error: 'Route already claimed' };
    }

    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found' };

    this.state.claimedRoutes.push({
      routeId,
      playerId,
      playerColor: player.color,
    });

    player.score += 1;

    // Advance turn
    const playerIndex = this.state.players.findIndex(p => p.id === playerId);
    this.state.currentTurn = this.state.players[(playerIndex + 1) % this.state.players.length].id;

    return { success: true };
  }
}

module.exports = { VanLifeGame };
