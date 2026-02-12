// Baduk (Go) Analysis Tool
// Multiplayer Go board with move tree, SGF support, and variation handling

const config = require('./gameConfig');
const goRules = require('./goRules');
const { EMPTY, BLACK, WHITE } = config.stone;

/**
 * Generate a unique node ID
 */
function generateNodeId() {
  return 'node_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Baduk Analysis Game Class
 * Manages board state, move tree with variations, and collaborative analysis
 */
class BadukAnalysis {
  constructor(options = {}) {
    this.options = options;
    this.state = this.initializeState(options);
    this.onStateChange = null;
  }

  /**
   * Set callback for state changes
   */
  setStateChangeCallback(callback) {
    this.onStateChange = callback;
  }

  /**
   * Notify listeners of state change
   */
  notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange();
    }
  }

  /**
   * Initialize complete game state
   */
  initializeState(options) {
    const players = options.players || [];
    const handicap = options.handicap || config.defaults.handicap;

    // Create initial board (with handicap if set)
    let initialBoard = goRules.createEmptyBoard();
    if (handicap > 0) {
      initialBoard = goRules.setupHandicap(initialBoard, handicap);
    }

    // Create root node
    const rootNode = {
      id: 'root',
      move: null,
      isPass: false,
      color: null,
      boardState: initialBoard,
      comment: '',
      annotations: [],
      children: [],
      parent: null,
      moveNumber: 0
    };

    return {
      // Game type
      gameType: 'baduk-analysis',
      started: true,
      phase: 'analyzing',

      // Board state (current position)
      board: goRules.cloneBoard(initialBoard),

      // Move tree
      moveTree: {
        root: rootNode,
        currentNodeId: 'root',
        nodeMap: new Map([['root', rootNode]]),
        nodeCount: 1
      },

      // Game metadata
      metadata: {
        blackPlayer: options.blackPlayer || 'Black',
        whitePlayer: options.whitePlayer || 'White',
        komi: options.komi || config.defaults.komi,
        handicap: handicap,
        date: new Date().toISOString().split('T')[0],
        result: null,
        event: '',
        source: ''
      },

      // Current turn (who plays next)
      currentTurn: handicap > 0 ? 'white' : 'black',

      // Captured stones count
      captures: { black: 0, white: 0 },

      // Ko point (if any)
      koPoint: null,

      // Players in session
      players: players.map(p => ({
        playerId: p.id,
        playerName: p.name,
        isConnected: p.isConnected !== false
      })),

      // Analysis mode flag (for future AI integration)
      analysisMode: false,

      // Dead stones marked during scoring phase
      deadStones: [],

      // Track consecutive passes for scoring trigger
      consecutivePasses: 0,

      // AI opponent settings
      aiOpponent: {
        enabled: false,
        color: 'white',        // AI plays as 'black' or 'white'
        skillLevel: '5k',      // Skill level key (e.g., '30k', '5k', '1d', 'max')
        isThinking: false      // True when AI is generating a move
      }
    };
  }

  /**
   * Get a node by ID
   */
  getNode(nodeId) {
    return this.state.moveTree.nodeMap.get(nodeId);
  }

  /**
   * Get the current node
   */
  getCurrentNode() {
    return this.getNode(this.state.moveTree.currentNodeId);
  }

  /**
   * Place a stone on the board
   * @param playerId Player making the move (for logging)
   * @param x X coordinate (0-18)
   * @param y Y coordinate (0-18)
   * @returns {success: boolean, message: string}
   */
  placeStone(playerId, x, y) {
    const currentNode = this.getCurrentNode();
    const color = this.state.currentTurn === 'black' ? BLACK : WHITE;

    // Validate move
    const validation = goRules.isValidMove(
      this.state.board,
      x, y,
      color,
      this.state.koPoint
    );

    if (!validation.valid) {
      return { success: false, message: validation.reason };
    }

    // Execute move
    const result = goRules.executeMove(this.state.board, x, y, color);

    // Update captures
    if (result.captures.length > 0) {
      if (this.state.currentTurn === 'black') {
        this.state.captures.black += result.captures.length;
      } else {
        this.state.captures.white += result.captures.length;
      }
    }

    // Check if this move already exists as a child (reuse existing variation)
    const existingChild = currentNode.children.find(child =>
      child.move && child.move.x === x && child.move.y === y && child.color === this.state.currentTurn
    );

    let newNode;
    if (existingChild) {
      // Navigate to existing variation
      newNode = existingChild;
    } else {
      // Create new node
      newNode = {
        id: generateNodeId(),
        move: { x, y },
        isPass: false,
        color: this.state.currentTurn,
        boardState: goRules.cloneBoard(result.board),
        comment: '',
        annotations: [],
        children: [],
        parent: currentNode.id,
        moveNumber: currentNode.moveNumber + 1
      };

      // Add to tree
      currentNode.children.push(newNode);
      this.state.moveTree.nodeMap.set(newNode.id, newNode);
      this.state.moveTree.nodeCount++;
    }

    // Update state
    this.state.board = result.board;
    this.state.koPoint = result.koPoint;
    this.state.moveTree.currentNodeId = newNode.id;
    this.state.currentTurn = this.state.currentTurn === 'black' ? 'white' : 'black';
    this.state.consecutivePasses = 0; // Reset on stone placement

    this.notifyStateChange();
    return { success: true, message: '' };
  }

  /**
   * Pass turn
   */
  pass(playerId) {
    // Can't pass during scoring phase
    if (this.state.phase === 'scoring') {
      return { success: false, message: 'Cannot pass during scoring phase. Accept score or resume game.' };
    }
    const currentNode = this.getCurrentNode();

    // Check if last move was also a pass (game end)
    const previousWasPass = currentNode.isPass;

    // Create pass node
    const newNode = {
      id: generateNodeId(),
      move: null,
      isPass: true,
      color: this.state.currentTurn,
      boardState: goRules.cloneBoard(this.state.board),
      comment: previousWasPass ? 'Game ended - both players passed' : '',
      annotations: [],
      children: [],
      parent: currentNode.id,
      moveNumber: currentNode.moveNumber + 1
    };

    // Add to tree
    currentNode.children.push(newNode);
    this.state.moveTree.nodeMap.set(newNode.id, newNode);
    this.state.moveTree.nodeCount++;

    // Update state
    this.state.moveTree.currentNodeId = newNode.id;
    this.state.koPoint = null;
    this.state.currentTurn = this.state.currentTurn === 'black' ? 'white' : 'black';
    this.state.consecutivePasses++;

    // If both players passed, enter scoring phase
    if (this.state.consecutivePasses >= 2) {
      this.state.phase = 'scoring';
      this.state.deadStones = [];
      newNode.comment = 'Both players passed - marking dead stones';
    }

    this.notifyStateChange();
    return { success: true, message: this.state.phase === 'scoring' ? 'Entering scoring phase' : 'Passed' };
  }

  /**
   * Toggle a stone as dead during scoring phase
   */
  toggleDeadStone(playerId, x, y) {
    if (this.state.phase !== 'scoring') {
      return { success: false, message: 'Can only mark dead stones during scoring phase' };
    }

    const stone = this.state.board[y][x];
    if (stone === EMPTY) {
      return { success: false, message: 'No stone at that position' };
    }

    const key = `${x},${y}`;
    const index = this.state.deadStones.indexOf(key);

    if (index === -1) {
      this.state.deadStones.push(key);
    } else {
      this.state.deadStones.splice(index, 1);
    }

    this.notifyStateChange();
    return { success: true, message: index === -1 ? 'Stone marked as dead' : 'Stone unmarked' };
  }

  /**
   * Accept the current score and end the game
   */
  acceptScore(playerId) {
    if (this.state.phase !== 'scoring') {
      return { success: false, message: 'Not in scoring phase' };
    }

    // Calculate final score with dead stones
    const deadStonesSet = new Set(this.state.deadStones);
    const score = goRules.calculateScore(
      this.state.board,
      this.state.metadata.komi,
      this.state.captures,
      deadStonesSet
    );

    this.state.metadata.result = score.winner === 'tie'
      ? 'Tie'
      : `${score.winner === 'black' ? 'B' : 'W'}+${score.margin.toFixed(1)}`;

    this.state.phase = 'finished';

    // Update the current node's comment with final result
    const currentNode = this.getCurrentNode();
    currentNode.comment = `Game ended: ${this.state.metadata.result}`;

    this.notifyStateChange();
    return { success: true, message: `Game finished: ${this.state.metadata.result}` };
  }

  /**
   * Resume the game from scoring phase (disagreement on dead stones)
   */
  resumeGame(playerId) {
    if (this.state.phase !== 'scoring') {
      return { success: false, message: 'Not in scoring phase' };
    }

    this.state.phase = 'analyzing';
    this.state.deadStones = [];
    this.state.consecutivePasses = 0;

    this.notifyStateChange();
    return { success: true, message: 'Game resumed' };
  }

  /**
   * Configure AI opponent settings
   * @param settings { enabled, color, skillLevel }
   */
  configureAI(settings) {
    if (settings.enabled !== undefined) {
      this.state.aiOpponent.enabled = settings.enabled;
    }
    if (settings.color && ['black', 'white'].includes(settings.color)) {
      this.state.aiOpponent.color = settings.color;
    }
    if (settings.skillLevel) {
      this.state.aiOpponent.skillLevel = settings.skillLevel;
    }

    this.notifyStateChange();
    return { success: true, message: 'AI settings updated' };
  }

  /**
   * Check if it's AI's turn to play
   */
  isAITurn() {
    return this.state.aiOpponent.enabled &&
           this.state.currentTurn === this.state.aiOpponent.color &&
           this.state.phase === 'analyzing';
  }

  /**
   * Set AI thinking state
   */
  setAIThinking(thinking) {
    this.state.aiOpponent.isThinking = thinking;
    this.notifyStateChange();
  }

  /**
   * Navigate the move tree
   * @param direction 'forward', 'back', 'to-node', 'to-start', 'to-end'
   * @param nodeId Required if direction is 'to-node'
   */
  navigate(direction, nodeId = null) {
    const currentNode = this.getCurrentNode();

    let targetNode = null;

    switch (direction) {
      case 'back':
        if (currentNode.parent) {
          targetNode = this.getNode(currentNode.parent);
        }
        break;

      case 'forward':
        if (currentNode.children.length > 0) {
          // Go to first child (main line)
          targetNode = currentNode.children[0];
        }
        break;

      case 'to-node':
        if (nodeId) {
          targetNode = this.getNode(nodeId);
        }
        break;

      case 'to-start':
        targetNode = this.state.moveTree.root;
        break;

      case 'to-end':
        // Follow main line to the end
        let node = currentNode;
        while (node.children.length > 0) {
          node = node.children[0];
        }
        targetNode = node;
        break;
    }

    if (targetNode) {
      this.state.moveTree.currentNodeId = targetNode.id;
      this.state.board = goRules.cloneBoard(targetNode.boardState);

      // Determine whose turn it is at this position
      if (targetNode.id === 'root') {
        this.state.currentTurn = this.state.metadata.handicap > 0 ? 'white' : 'black';
      } else {
        this.state.currentTurn = targetNode.color === 'black' ? 'white' : 'black';
      }

      // Ko point is only relevant at the current position after a capture
      this.state.koPoint = null;

      // Recalculate captures by walking the tree from root
      this.recalculateCaptures();

      this.notifyStateChange();
      return { success: true, message: '' };
    }

    return { success: false, message: 'Cannot navigate in that direction' };
  }

  /**
   * Recalculate captures by walking from root to current node
   */
  recalculateCaptures() {
    this.state.captures = { black: 0, white: 0 };

    let node = this.state.moveTree.root;
    const path = this.getPathToNode(this.state.moveTree.currentNodeId);

    for (let i = 1; i < path.length; i++) {
      const prevNode = path[i - 1];
      const currNode = path[i];

      if (currNode.move && !currNode.isPass) {
        // Calculate captures for this move
        const color = currNode.color === 'black' ? BLACK : WHITE;
        const captures = goRules.findCaptures(prevNode.boardState, currNode.move.x, currNode.move.y, color);

        // Add a temporary stone to check captures properly
        const tempBoard = goRules.cloneBoard(prevNode.boardState);
        tempBoard[currNode.move.y][currNode.move.x] = color;
        const actualCaptures = goRules.findCaptures(tempBoard, currNode.move.x, currNode.move.y, color);

        if (currNode.color === 'black') {
          this.state.captures.black += actualCaptures.length;
        } else {
          this.state.captures.white += actualCaptures.length;
        }
      }
    }
  }

  /**
   * Get path from root to a node
   */
  getPathToNode(targetNodeId) {
    const path = [];
    let node = this.getNode(targetNodeId);

    while (node) {
      path.unshift(node);
      node = node.parent ? this.getNode(node.parent) : null;
    }

    return path;
  }

  /**
   * Add or update comment on current node
   */
  setComment(comment) {
    const currentNode = this.getCurrentNode();
    currentNode.comment = comment;
    this.notifyStateChange();
    return { success: true, message: '' };
  }

  /**
   * Add annotation to current node
   */
  addAnnotation(type, x, y, label = '') {
    const currentNode = this.getCurrentNode();

    // Remove existing annotation at same point
    currentNode.annotations = currentNode.annotations.filter(
      a => !(a.point.x === x && a.point.y === y)
    );

    currentNode.annotations.push({
      type,
      point: { x, y },
      label
    });

    this.notifyStateChange();
    return { success: true, message: '' };
  }

  /**
   * Remove annotation from current node
   */
  removeAnnotation(x, y) {
    const currentNode = this.getCurrentNode();
    currentNode.annotations = currentNode.annotations.filter(
      a => !(a.point.x === x && a.point.y === y)
    );
    this.notifyStateChange();
    return { success: true, message: '' };
  }

  /**
   * Load game from SGF data
   * @param sgfData Parsed SGF structure
   */
  loadFromSGF(sgfData) {
    // Reset state
    const handicap = sgfData.handicap || 0;
    let initialBoard = goRules.createEmptyBoard();

    // Place setup stones (AB, AW properties)
    if (sgfData.setupBlack) {
      for (const pos of sgfData.setupBlack) {
        initialBoard[pos.y][pos.x] = BLACK;
      }
    }
    if (sgfData.setupWhite) {
      for (const pos of sgfData.setupWhite) {
        initialBoard[pos.y][pos.x] = WHITE;
      }
    }

    // Handle handicap if no setup stones
    if (handicap > 0 && !sgfData.setupBlack) {
      initialBoard = goRules.setupHandicap(initialBoard, handicap);
    }

    // Create root node
    const rootNode = {
      id: 'root',
      move: null,
      isPass: false,
      color: null,
      boardState: goRules.cloneBoard(initialBoard),
      comment: sgfData.rootComment || '',
      annotations: [],
      children: [],
      parent: null,
      moveNumber: 0
    };

    // Reset move tree
    this.state.moveTree = {
      root: rootNode,
      currentNodeId: 'root',
      nodeMap: new Map([['root', rootNode]]),
      nodeCount: 1
    };

    this.state.board = goRules.cloneBoard(initialBoard);
    this.state.captures = { black: 0, white: 0 };
    this.state.koPoint = null;
    this.state.currentTurn = handicap > 0 ? 'white' : 'black';

    // Update metadata
    if (sgfData.blackPlayer) this.state.metadata.blackPlayer = sgfData.blackPlayer;
    if (sgfData.whitePlayer) this.state.metadata.whitePlayer = sgfData.whitePlayer;
    if (sgfData.komi !== undefined) this.state.metadata.komi = sgfData.komi;
    if (sgfData.handicap !== undefined) this.state.metadata.handicap = sgfData.handicap;
    if (sgfData.date) this.state.metadata.date = sgfData.date;
    if (sgfData.result) this.state.metadata.result = sgfData.result;
    if (sgfData.event) this.state.metadata.event = sgfData.event;

    // Build move tree from SGF moves
    if (sgfData.moves && sgfData.moves.length > 0) {
      this.buildTreeFromMoves(rootNode, sgfData.moves);
    }

    this.notifyStateChange();
    return { success: true, message: 'SGF loaded successfully' };
  }

  /**
   * Recursively build move tree from parsed SGF moves
   */
  buildTreeFromMoves(parentNode, moves) {
    let currentParent = parentNode;
    let currentBoard = goRules.cloneBoard(parentNode.boardState);
    let currentColor = this.state.currentTurn;

    for (const move of moves) {
      if (move.variations) {
        // Handle variations (branches)
        for (const variation of move.variations) {
          this.buildTreeFromMoves(currentParent, variation);
        }
      } else {
        // Regular move
        const color = move.color === 'B' ? BLACK : WHITE;
        let newBoard;
        let isPass = false;

        if (move.pass) {
          isPass = true;
          newBoard = goRules.cloneBoard(currentBoard);
        } else {
          const result = goRules.executeMove(currentBoard, move.x, move.y, color);
          newBoard = result.board;

          // Track captures
          if (result.captures.length > 0) {
            if (move.color === 'B') {
              this.state.captures.black += result.captures.length;
            } else {
              this.state.captures.white += result.captures.length;
            }
          }
        }

        const newNode = {
          id: generateNodeId(),
          move: isPass ? null : { x: move.x, y: move.y },
          isPass,
          color: move.color === 'B' ? 'black' : 'white',
          boardState: newBoard,
          comment: move.comment || '',
          annotations: move.annotations || [],
          children: [],
          parent: currentParent.id,
          moveNumber: currentParent.moveNumber + 1
        };

        currentParent.children.push(newNode);
        this.state.moveTree.nodeMap.set(newNode.id, newNode);
        this.state.moveTree.nodeCount++;

        currentParent = newNode;
        currentBoard = newBoard;
        currentColor = currentColor === 'black' ? 'white' : 'black';
      }
    }
  }

  /**
   * Delete a variation (node and all descendants)
   */
  deleteVariation(nodeId) {
    if (nodeId === 'root') {
      return { success: false, message: 'Cannot delete root node' };
    }

    const node = this.getNode(nodeId);
    if (!node) {
      return { success: false, message: 'Node not found' };
    }

    const parent = this.getNode(node.parent);
    if (!parent) {
      return { success: false, message: 'Parent not found' };
    }

    // If current node is in this branch, navigate to parent first
    const currentPath = this.getPathToNode(this.state.moveTree.currentNodeId);
    const deletingCurrentBranch = currentPath.some(n => n.id === nodeId);

    if (deletingCurrentBranch) {
      this.navigate('to-node', parent.id);
    }

    // Remove from parent's children
    parent.children = parent.children.filter(c => c.id !== nodeId);

    // Delete all descendant nodes from map
    this.deleteNodeAndDescendants(node);

    this.notifyStateChange();
    return { success: true, message: 'Variation deleted' };
  }

  /**
   * Recursively delete node and descendants from map
   */
  deleteNodeAndDescendants(node) {
    for (const child of node.children) {
      this.deleteNodeAndDescendants(child);
    }
    this.state.moveTree.nodeMap.delete(node.id);
    this.state.moveTree.nodeCount--;
  }

  /**
   * Get player view of game state
   * For analysis tool, all players see the same state
   */
  getPlayerView(playerId) {
    const currentNode = this.getCurrentNode();

    // Serialize move tree for client (convert Map to plain object)
    const serializeNode = (node) => ({
      id: node.id,
      move: node.move,
      isPass: node.isPass,
      color: node.color,
      comment: node.comment,
      annotations: node.annotations,
      moveNumber: node.moveNumber,
      parentId: node.parent,
      childrenIds: node.children.map(c => c.id),
      hasVariations: node.children.length > 1
    });

    // Get all nodes for the tree view
    const allNodes = {};
    for (const [id, node] of this.state.moveTree.nodeMap) {
      allNodes[id] = serializeNode(node);
    }

    // Get path to current node for highlighting
    const pathToCurrentNode = this.getPathToNode(this.state.moveTree.currentNodeId).map(n => n.id);

    return {
      type: this.state.gameType,
      started: this.state.started,
      phase: this.state.phase,

      // Board state
      board: this.state.board,

      // Move tree
      moveTree: {
        rootId: 'root',
        currentNodeId: this.state.moveTree.currentNodeId,
        nodes: allNodes,
        nodeCount: this.state.moveTree.nodeCount,
        pathToCurrentNode
      },

      // Current node details
      currentNode: {
        id: currentNode.id,
        move: currentNode.move,
        isPass: currentNode.isPass,
        color: currentNode.color,
        comment: currentNode.comment,
        annotations: currentNode.annotations,
        moveNumber: currentNode.moveNumber,
        hasChildren: currentNode.children.length > 0,
        hasVariations: currentNode.children.length > 1,
        childrenIds: currentNode.children.map(c => c.id),
        parentId: currentNode.parent
      },

      // Game metadata
      metadata: this.state.metadata,

      // Current turn
      currentTurn: this.state.currentTurn,

      // Captures
      captures: this.state.captures,

      // Ko point
      koPoint: this.state.koPoint,

      // Players
      players: this.state.players,

      // Dead stones (for scoring phase)
      deadStones: this.state.deadStones,

      // AI opponent settings
      aiOpponent: this.state.aiOpponent,

      // Config for client
      config: {
        boardSize: config.board.size,
        starPoints: config.board.starPoints
      }
    };
  }

  /**
   * Get a player by ID
   */
  getPlayer(playerId) {
    return this.state.players.find(p => p.playerId === playerId);
  }

  /**
   * Update player connection status
   */
  setPlayerConnected(playerId, connected) {
    const player = this.getPlayer(playerId);
    if (player) {
      player.isConnected = connected;
    }
  }
}

module.exports = BadukAnalysis;
