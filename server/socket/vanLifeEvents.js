function registerVanLifeEvents(io, socket, lobbies, games) {
  socket.on('van-life:claim-route', ({ slug, routeId }) => {
    const game = games.get(slug);
    if (!game || game.state.type !== 'van-life') return;

    const result = game.claimRoute(socket.id, routeId);
    if (result.success) {
      io.to(slug).emit('game-state-updated', game.getPlayerView(socket.id));
    } else {
      socket.emit('error', { message: result.error });
    }
  });
}

module.exports = { registerVanLifeEvents };
