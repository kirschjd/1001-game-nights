// Baduk Analysis Socket Event Handlers
// Handles multiplayer communication for Go analysis tool

const persistence = require('../utils/persistence');
const { getKataGoManager, isKataGoAvailable, getSkillLevels } = require('../games/baduk-analysis/kataGoManager');

/**
 * Register Baduk Analysis socket events
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Individual socket connection
 * @param {Map} lobbies - Lobbies storage
 * @param {Map} games - Games storage
 */
function registerBadukAnalysisEvents(io, socket, lobbies, games) {

  /**
   * Place a stone on the board
   */
  socket.on('baduk:place-stone', (data) => {
    const { slug, x, y } = data;

    if (!slug || x === undefined || y === undefined) {
      socket.emit('error', { message: 'Missing required data' });
      return;
    }

    const game = games.get(slug);
    if (!game || game.state.gameType !== 'baduk-analysis') {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    const result = game.placeStone(socket.id, x, y);

    if (result.success) {
      broadcastGameState(io, slug, game);

      // Trigger AI move if it's now AI's turn
      if (game.isAITurn()) {
        triggerAIMove(io, slug, game);
      }
    } else {
      socket.emit('error', { message: result.message });
    }
  });

  /**
   * Pass turn
   */
  socket.on('baduk:pass', (data) => {
    const { slug } = data;

    if (!slug) {
      socket.emit('error', { message: 'Missing slug' });
      return;
    }

    const game = games.get(slug);
    if (!game || game.state.gameType !== 'baduk-analysis') {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    const result = game.pass(socket.id);

    if (result.success) {
      broadcastGameState(io, slug, game);

      // Trigger AI move if it's now AI's turn (and not in scoring phase)
      if (game.isAITurn()) {
        triggerAIMove(io, slug, game);
      }
    } else {
      socket.emit('error', { message: result.message });
    }
  });

  /**
   * Navigate the move tree
   * direction: 'forward', 'back', 'to-node', 'to-start', 'to-end'
   */
  socket.on('baduk:navigate', (data) => {
    const { slug, direction, nodeId } = data;

    if (!slug || !direction) {
      socket.emit('error', { message: 'Missing required data' });
      return;
    }

    const game = games.get(slug);
    if (!game || game.state.gameType !== 'baduk-analysis') {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    const result = game.navigate(direction, nodeId);

    if (result.success) {
      broadcastGameState(io, slug, game);
    } else {
      socket.emit('error', { message: result.message });
    }
  });

  /**
   * Upload SGF file content
   */
  socket.on('baduk:upload-sgf', (data) => {
    const { slug, sgfContent } = data;

    if (!slug || !sgfContent) {
      socket.emit('error', { message: 'Missing required data' });
      return;
    }

    const game = games.get(slug);
    if (!game || game.state.gameType !== 'baduk-analysis') {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    try {
      // Parse SGF content
      const sgfData = parseSGF(sgfContent);
      const result = game.loadFromSGF(sgfData);

      if (result.success) {
        broadcastGameState(io, slug, game);
        console.log(`📋 SGF loaded in ${slug} by ${socket.playerName || socket.id}`);
      } else {
        socket.emit('error', { message: result.message });
      }
    } catch (error) {
      console.error('SGF parse error:', error);
      socket.emit('error', { message: 'Failed to parse SGF file: ' + error.message });
    }
  });

  /**
   * Add or update comment on current node
   */
  socket.on('baduk:add-comment', (data) => {
    const { slug, comment } = data;

    if (!slug) {
      socket.emit('error', { message: 'Missing slug' });
      return;
    }

    const game = games.get(slug);
    if (!game || game.state.gameType !== 'baduk-analysis') {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    const result = game.setComment(comment || '');

    if (result.success) {
      broadcastGameState(io, slug, game);
    }
  });

  /**
   * Add annotation to current node
   * type: 'triangle', 'square', 'circle', 'x', 'label'
   */
  socket.on('baduk:add-annotation', (data) => {
    const { slug, type, x, y, label } = data;

    if (!slug || !type || x === undefined || y === undefined) {
      socket.emit('error', { message: 'Missing required data' });
      return;
    }

    const game = games.get(slug);
    if (!game || game.state.gameType !== 'baduk-analysis') {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    const result = game.addAnnotation(type, x, y, label);

    if (result.success) {
      broadcastGameState(io, slug, game);
    }
  });

  /**
   * Remove annotation from current node
   */
  socket.on('baduk:remove-annotation', (data) => {
    const { slug, x, y } = data;

    if (!slug || x === undefined || y === undefined) {
      socket.emit('error', { message: 'Missing required data' });
      return;
    }

    const game = games.get(slug);
    if (!game || game.state.gameType !== 'baduk-analysis') {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    const result = game.removeAnnotation(x, y);

    if (result.success) {
      broadcastGameState(io, slug, game);
    }
  });

  /**
   * Delete a variation
   */
  socket.on('baduk:delete-variation', (data) => {
    const { slug, nodeId } = data;

    if (!slug || !nodeId) {
      socket.emit('error', { message: 'Missing required data' });
      return;
    }

    const game = games.get(slug);
    if (!game || game.state.gameType !== 'baduk-analysis') {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    const result = game.deleteVariation(nodeId);

    if (result.success) {
      broadcastGameState(io, slug, game);
    } else {
      socket.emit('error', { message: result.message });
    }
  });

  /**
   * Request current game state
   */
  socket.on('baduk:request-state', (data) => {
    const { slug } = data;

    if (!slug) {
      socket.emit('error', { message: 'Missing slug' });
      return;
    }

    const game = games.get(slug);
    if (!game || game.state.gameType !== 'baduk-analysis') {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    const playerView = game.getPlayerView(socket.id);
    socket.emit('baduk:game-state', playerView);
  });

  /**
   * Reset to empty board
   */
  socket.on('baduk:reset', (data) => {
    const { slug, keepMetadata } = data;

    if (!slug) {
      socket.emit('error', { message: 'Missing slug' });
      return;
    }

    const game = games.get(slug);
    if (!game || game.state.gameType !== 'baduk-analysis') {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    // Re-initialize state, optionally keeping metadata
    const oldMetadata = keepMetadata ? { ...game.state.metadata } : null;
    game.state = game.initializeState({
      players: game.state.players,
      komi: oldMetadata?.komi || game.options.komi,
      handicap: oldMetadata?.handicap || game.options.handicap
    });

    if (oldMetadata) {
      game.state.metadata = oldMetadata;
    }

    broadcastGameState(io, slug, game);
    console.log(`🔄 Board reset in ${slug}`);
  });

  /**
   * Toggle a stone as dead during scoring phase
   */
  socket.on('baduk:toggle-dead-stone', (data) => {
    const { slug, x, y } = data;

    if (!slug || x === undefined || y === undefined) {
      socket.emit('error', { message: 'Missing required data' });
      return;
    }

    const game = games.get(slug);
    if (!game || game.state.gameType !== 'baduk-analysis') {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    const result = game.toggleDeadStone(socket.id, x, y);

    if (result.success) {
      broadcastGameState(io, slug, game);
    } else {
      socket.emit('error', { message: result.message });
    }
  });

  /**
   * Accept the current score and end the game
   */
  socket.on('baduk:accept-score', (data) => {
    const { slug } = data;

    if (!slug) {
      socket.emit('error', { message: 'Missing slug' });
      return;
    }

    const game = games.get(slug);
    if (!game || game.state.gameType !== 'baduk-analysis') {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    const result = game.acceptScore(socket.id);

    if (result.success) {
      broadcastGameState(io, slug, game);
      console.log(`🏆 Game finished in ${slug}: ${game.state.metadata.result}`);
    } else {
      socket.emit('error', { message: result.message });
    }
  });

  /**
   * Resume the game from scoring phase (disagreement on dead stones)
   */
  socket.on('baduk:resume-game', (data) => {
    const { slug } = data;

    if (!slug) {
      socket.emit('error', { message: 'Missing slug' });
      return;
    }

    const game = games.get(slug);
    if (!game || game.state.gameType !== 'baduk-analysis') {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    const result = game.resumeGame(socket.id);

    if (result.success) {
      broadcastGameState(io, slug, game);
      console.log(`🔄 Game resumed in ${slug}`);
    } else {
      socket.emit('error', { message: result.message });
    }
  });

  /**
   * Request AI analysis using KataGo
   */
  socket.on('baduk:request-analysis', async (data) => {
    const { slug, options = {} } = data;

    if (!slug) {
      socket.emit('error', { message: 'Missing slug' });
      return;
    }

    const game = games.get(slug);
    if (!game || game.state.gameType !== 'baduk-analysis') {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    // Check if KataGo is available
    if (!isKataGoAvailable()) {
      socket.emit('baduk:analysis-result', {
        timestamp: Date.now(),
        moves: [],
        overallWinrate: { black: 0.5, white: 0.5 },
        scoreLead: 0,
        message: 'KataGo is not configured. Set KATAGO_PATH and KATAGO_MODEL environment variables.',
        available: false
      });
      return;
    }

    try {
      const kataGo = getKataGoManager();

      // Start KataGo if not running
      if (!kataGo.isReady) {
        socket.emit('baduk:analysis-status', { status: 'starting', message: 'Starting KataGo...' });
        await kataGo.start();
      }

      socket.emit('baduk:analysis-status', { status: 'analyzing', message: 'Analyzing position...' });

      // Get analysis
      const result = await kataGo.getAnalysis(
        game.state.board,
        game.state.currentTurn,
        {
          komi: game.state.metadata.komi,
          maxVisits: options.maxVisits || 200,
          timeout: options.timeout || 30000
        }
      );

      // Broadcast analysis result to all players in the game
      const lobby = io.sockets.adapter.rooms.get(slug);
      if (lobby) {
        for (const socketId of lobby) {
          const playerSocket = io.sockets.sockets.get(socketId);
          if (playerSocket) {
            playerSocket.emit('baduk:analysis-result', {
              ...result,
              available: true
            });
          }
        }
      }

      console.log(`🤖 AI analysis completed for ${slug}`);

    } catch (err) {
      console.error('KataGo analysis error:', err);
      socket.emit('baduk:analysis-result', {
        timestamp: Date.now(),
        moves: [],
        overallWinrate: { black: 0.5, white: 0.5 },
        scoreLead: 0,
        message: `Analysis failed: ${err.message}`,
        available: true
      });
    }
  });

  /**
   * Configure AI opponent settings
   */
  socket.on('baduk:configure-ai', (data) => {
    const { slug, enabled, color, skillLevel } = data;

    if (!slug) {
      socket.emit('error', { message: 'Missing slug' });
      return;
    }

    const game = games.get(slug);
    if (!game || game.state.gameType !== 'baduk-analysis') {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    const result = game.configureAI({ enabled, color, skillLevel });

    if (result.success) {
      broadcastGameState(io, slug, game);
      console.log(`🤖 AI configured in ${slug}: ${enabled ? `${skillLevel} as ${color}` : 'disabled'}`);

      // If AI is enabled and it's AI's turn, trigger AI move
      if (enabled && game.isAITurn()) {
        triggerAIMove(io, slug, game);
      }
    }
  });

  /**
   * Get available AI skill levels
   */
  socket.on('baduk:get-skill-levels', () => {
    socket.emit('baduk:skill-levels', getSkillLevels());
  });

  /**
   * Request AI to make a move (manual trigger or after player move)
   */
  socket.on('baduk:request-ai-move', async (data) => {
    const { slug } = data;

    if (!slug) {
      socket.emit('error', { message: 'Missing slug' });
      return;
    }

    const game = games.get(slug);
    if (!game || game.state.gameType !== 'baduk-analysis') {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    if (!game.state.aiOpponent.enabled) {
      socket.emit('error', { message: 'AI opponent is not enabled' });
      return;
    }

    if (!game.isAITurn()) {
      socket.emit('error', { message: 'Not AI\'s turn' });
      return;
    }

    await triggerAIMove(io, slug, game);
  });
}

/**
 * Trigger AI to make a move
 */
async function triggerAIMove(io, slug, game) {
  if (!isKataGoAvailable()) {
    console.log('KataGo not available for AI move');
    return;
  }

  if (game.state.aiOpponent.isThinking) {
    console.log('AI already thinking');
    return;
  }

  try {
    game.setAIThinking(true);
    broadcastGameState(io, slug, game);

    const kataGo = getKataGoManager();

    // Start KataGo if not running
    if (!kataGo.isReady) {
      await kataGo.start();
    }

    // Get AI move at the configured skill level
    const moveResult = await kataGo.getAIMove(
      game.state.board,
      game.state.currentTurn,
      game.state.aiOpponent.skillLevel,
      {
        komi: game.state.metadata.komi,
        maxVisits: 50 // Keep it fast for responsive play
      }
    );

    game.setAIThinking(false);

    // Play the AI's move
    if (moveResult.isPass) {
      game.pass('ai');
    } else if (moveResult.move) {
      game.placeStone('ai', moveResult.move.x, moveResult.move.y);
    }

    broadcastGameState(io, slug, game);
    console.log(`🤖 AI played: ${moveResult.isPass ? 'pass' : `(${moveResult.move?.x}, ${moveResult.move?.y})`}`);

    // Emit AI move info for client display
    const lobby = io.sockets.adapter.rooms.get(slug);
    if (lobby) {
      for (const socketId of lobby) {
        const playerSocket = io.sockets.sockets.get(socketId);
        if (playerSocket) {
          playerSocket.emit('baduk:ai-move', {
            move: moveResult.move,
            isPass: moveResult.isPass,
            winrate: moveResult.winrate,
            scoreLead: moveResult.scoreLead,
            skillLevel: moveResult.skillLevel
          });
        }
      }
    }

  } catch (err) {
    console.error('AI move error:', err);
    game.setAIThinking(false);
    broadcastGameState(io, slug, game);
  }
}

/**
 * Parse SGF content into game data
 * SGF format: https://www.red-bean.com/sgf/
 */
function parseSGF(content) {
  const result = {
    moves: [],
    blackPlayer: '',
    whitePlayer: '',
    komi: 6.5,
    handicap: 0,
    date: '',
    result: '',
    event: '',
    rootComment: '',
    setupBlack: [],
    setupWhite: []
  };

  // Remove whitespace and newlines
  content = content.replace(/\s+/g, ' ').trim();

  // Extract properties from first node (game info)
  const propertyRegex = /([A-Z]+)\[([^\]]*)\]/g;
  let match;

  // Find the root node properties
  const rootMatch = content.match(/\(;([^;(]+)/);
  if (rootMatch) {
    const rootProps = rootMatch[1];
    const propRegex = /([A-Z]+)\[([^\]]*)\]/g;

    while ((match = propRegex.exec(rootProps)) !== null) {
      const [, prop, value] = match;

      switch (prop) {
        case 'PB': result.blackPlayer = value; break;
        case 'PW': result.whitePlayer = value; break;
        case 'KM': result.komi = parseFloat(value) || 6.5; break;
        case 'HA': result.handicap = parseInt(value) || 0; break;
        case 'DT': result.date = value; break;
        case 'RE': result.result = value; break;
        case 'EV': result.event = value; break;
        case 'C': result.rootComment = value; break;
        case 'AB':
          // Setup black stones (can have multiple)
          result.setupBlack.push(sgfToPoint(value));
          break;
        case 'AW':
          // Setup white stones (can have multiple)
          result.setupWhite.push(sgfToPoint(value));
          break;
      }
    }
  }

  // Parse moves (simplified - main line only for now)
  const moveRegex = /;([BW])\[([a-s]{0,2})\]/g;
  let lastColor = null;

  while ((match = moveRegex.exec(content)) !== null) {
    const [, color, coord] = match;

    if (coord === '' || coord === 'tt') {
      // Pass move
      result.moves.push({
        color,
        pass: true
      });
    } else {
      const point = sgfToPoint(coord);
      if (point) {
        result.moves.push({
          color,
          x: point.x,
          y: point.y
        });
      }
    }

    lastColor = color;
  }

  // Extract comments for moves
  const moveWithCommentRegex = /;([BW])\[([a-s]{0,2})\](?:[A-Z]*\[[^\]]*\])*C\[([^\]]*)\]/g;
  let moveIndex = 0;

  while ((match = moveWithCommentRegex.exec(content)) !== null) {
    const [, , , comment] = match;
    // Find matching move and add comment
    if (result.moves[moveIndex]) {
      result.moves[moveIndex].comment = comment;
    }
    moveIndex++;
  }

  return result;
}

/**
 * Convert SGF coordinate to board point
 * 'aa' = {x: 0, y: 0}, 'ss' = {x: 18, y: 18}
 */
function sgfToPoint(coord) {
  if (!coord || coord.length !== 2) return null;

  const x = coord.charCodeAt(0) - 'a'.charCodeAt(0);
  const y = coord.charCodeAt(1) - 'a'.charCodeAt(0);

  if (x < 0 || x > 18 || y < 0 || y > 18) return null;

  return { x, y };
}

/**
 * Broadcast game state to all players in lobby
 */
function broadcastGameState(io, slug, game) {
  const lobby = io.sockets.adapter.rooms.get(slug);
  if (!lobby) return;

  // For analysis tool, all players see the same state
  const gameState = game.getPlayerView(null);

  for (const socketId of lobby) {
    const playerSocket = io.sockets.sockets.get(socketId);
    if (playerSocket) {
      playerSocket.emit('baduk:game-state', gameState);
    }
  }

  // Persist game state
  persistence.saveGame(slug, game);

  console.log(`📡 Broadcasted Baduk state to ${lobby.size} player(s) in ${slug}`);
}

module.exports = {
  registerBadukAnalysisEvents,
  broadcastGameState,
  parseSGF
};
