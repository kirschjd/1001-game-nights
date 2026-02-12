/**
 * KataGo Manager
 * Manages communication with KataGo engine via subprocess
 * Uses KataGo's JSON analysis protocol
 *
 * Supports:
 * - Deep analysis (best possible moves)
 * - Human-like play at various skill levels
 */

const { spawn } = require('child_process');
const { EventEmitter } = require('events');

// Stone constants
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

/**
 * Human skill levels mapped to KataGo's humanSL parameter
 * humanSL ranges from approximately -12 (very weak) to 15 (professional)
 *
 * Reference:
 * - humanSL -12 to -8: DDK (double digit kyu, 20-10 kyu)
 * - humanSL -8 to -4: SDK (single digit kyu, 9-1 kyu)
 * - humanSL -4 to 0: Low dan (1-3 dan)
 * - humanSL 0 to 4: Mid dan (4-6 dan)
 * - humanSL 4 to 8: High amateur dan (6-7 dan)
 * - humanSL 8+: Professional level
 */
const SKILL_LEVELS = {
  // Beginner levels
  '30k': { humanSL: -15, name: '30 Kyu (Complete Beginner)', description: 'Just learning the rules' },
  '25k': { humanSL: -13, name: '25 Kyu (Beginner)', description: 'Knows basic rules' },
  '20k': { humanSL: -11, name: '20 Kyu (DDK)', description: 'Double digit kyu' },
  '15k': { humanSL: -9, name: '15 Kyu', description: 'Improving beginner' },
  '10k': { humanSL: -7, name: '10 Kyu', description: 'Strong DDK' },

  // Intermediate levels
  '8k': { humanSL: -6, name: '8 Kyu (SDK)', description: 'Single digit kyu' },
  '5k': { humanSL: -4, name: '5 Kyu', description: 'Mid SDK' },
  '3k': { humanSL: -2, name: '3 Kyu', description: 'Strong SDK' },
  '1k': { humanSL: -1, name: '1 Kyu', description: 'Almost dan level' },

  // Dan levels
  '1d': { humanSL: 0, name: '1 Dan', description: 'Amateur dan' },
  '3d': { humanSL: 2, name: '3 Dan', description: 'Strong amateur' },
  '5d': { humanSL: 4, name: '5 Dan', description: 'Very strong amateur' },
  '7d': { humanSL: 6, name: '7 Dan', description: 'Expert amateur' },

  // Professional levels
  '1p': { humanSL: 8, name: '1 Pro', description: 'Professional level' },
  '5p': { humanSL: 10, name: '5 Pro', description: 'Strong professional' },
  '9p': { humanSL: 12, name: '9 Pro', description: 'Top professional' },

  // Maximum strength (no human simulation)
  'max': { humanSL: null, name: 'Maximum Strength', description: 'Full KataGo strength' }
};

class KataGoManager extends EventEmitter {
  constructor(options = {}) {
    super();

    // Configuration
    this.kataGoPath = options.kataGoPath || process.env.KATAGO_PATH || 'katago';
    this.modelPath = options.modelPath || process.env.KATAGO_MODEL || '';
    this.configPath = options.configPath || process.env.KATAGO_CONFIG || '';
    this.humanModelPath = options.humanModelPath || process.env.KATAGO_HUMAN_MODEL || '';

    // Process state
    this.process = null;
    this.isReady = false;
    this.pendingRequests = new Map(); // queryId -> { resolve, reject, timeout }
    this.queryCounter = 0;

    // Buffer for incomplete JSON lines
    this.buffer = '';
  }

  /**
   * Start the KataGo process
   */
  async start() {
    if (this.process) {
      console.log('KataGo already running');
      return;
    }

    return new Promise((resolve, reject) => {
      const args = ['analysis', '-model', this.modelPath];

      if (this.configPath) {
        args.push('-config', this.configPath);
      }

      // Add human model if available (for human-like play)
      if (this.humanModelPath) {
        args.push('-human-model', this.humanModelPath);
      }

      console.log(`Starting KataGo: ${this.kataGoPath} ${args.join(' ')}`);

      try {
        this.process = spawn(this.kataGoPath, args, {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        this.process.stdout.on('data', (data) => this.handleStdout(data));
        this.process.stderr.on('data', (data) => this.handleStderr(data));

        this.process.on('error', (err) => {
          console.error('KataGo process error:', err);
          this.emit('error', err);
          reject(err);
        });

        this.process.on('close', (code) => {
          console.log(`KataGo process exited with code ${code}`);
          this.isReady = false;
          this.process = null;
          this.emit('close', code);
        });

        // Wait a bit for KataGo to initialize
        setTimeout(() => {
          this.isReady = true;
          console.log('KataGo ready');
          this.emit('ready');
          resolve();
        }, 2000);

      } catch (err) {
        console.error('Failed to start KataGo:', err);
        reject(err);
      }
    });
  }

  /**
   * Stop the KataGo process
   */
  stop() {
    if (this.process) {
      // Send terminate command
      this.sendCommand({ action: 'terminate' });

      setTimeout(() => {
        if (this.process) {
          this.process.kill();
          this.process = null;
        }
      }, 1000);
    }

    // Reject all pending requests
    for (const [queryId, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('KataGo stopped'));
    }
    this.pendingRequests.clear();
  }

  /**
   * Handle stdout data from KataGo
   */
  handleStdout(data) {
    this.buffer += data.toString();

    // Process complete lines
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop(); // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.trim()) {
        this.handleResponse(line.trim());
      }
    }
  }

  /**
   * Handle stderr data from KataGo
   */
  handleStderr(data) {
    const message = data.toString().trim();
    if (message) {
      // Only log important messages, not every stderr line
      if (message.includes('error') || message.includes('Error') ||
          message.includes('GTP ready') || message.includes('Loaded')) {
        console.log('KataGo:', message);
      }
      if (message.includes('GTP ready')) {
        this.isReady = true;
        this.emit('ready');
      }
    }
  }

  /**
   * Parse and handle a response from KataGo
   */
  handleResponse(line) {
    try {
      const response = JSON.parse(line);

      if (response.id !== undefined) {
        const request = this.pendingRequests.get(response.id);

        if (request) {
          clearTimeout(request.timeout);
          this.pendingRequests.delete(response.id);

          if (response.error) {
            request.reject(new Error(response.error));
          } else {
            request.resolve(response);
          }
        }
      }

      // Emit for any listeners
      this.emit('response', response);

    } catch (err) {
      console.error('Failed to parse KataGo response:', line, err);
    }
  }

  /**
   * Send a command to KataGo
   */
  sendCommand(command) {
    if (!this.process) {
      throw new Error('KataGo not running');
    }

    const json = JSON.stringify(command);
    this.process.stdin.write(json + '\n');
  }

  /**
   * Convert board array to KataGo's initialStones format
   * Returns array of [color, x, y] where color is 'B' or 'W'
   */
  boardToKataGo(board) {
    const stones = [];

    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[y].length; x++) {
        const stone = board[y][x];
        if (stone === BLACK) {
          stones.push(['B', x, y]);
        } else if (stone === WHITE) {
          stones.push(['W', x, y]);
        }
      }
    }

    return stones;
  }

  /**
   * Request analysis for a board position (full strength)
   * @param board 2D array of stone values (0=empty, 1=black, 2=white)
   * @param currentTurn 'black' or 'white'
   * @param options Analysis options
   * @returns Promise<AnalysisResult>
   */
  async analyze(board, currentTurn, options = {}) {
    if (!this.isReady) {
      throw new Error('KataGo not ready');
    }

    const queryId = `q${++this.queryCounter}`;
    const kataBoard = this.boardToKataGo(board);

    const query = {
      id: queryId,
      moves: [],
      initialStones: kataBoard,
      rules: options.rules || 'chinese',
      komi: options.komi || 7.5,
      boardXSize: board[0].length,
      boardYSize: board.length,
      initialPlayer: currentTurn === 'black' ? 'B' : 'W',
      maxVisits: options.maxVisits || 100,
      analyzeTurns: [0]
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(queryId);
        reject(new Error('Analysis timeout'));
      }, options.timeout || 30000);

      this.pendingRequests.set(queryId, { resolve, reject, timeout });
      this.sendCommand(query);
    });
  }

  /**
   * Get a move at a specific human skill level
   * @param board 2D array of stone values
   * @param currentTurn 'black' or 'white'
   * @param skillLevel Skill level key (e.g., '10k', '1d', 'max')
   * @param options Additional options
   * @returns Promise with best move at that level
   */
  async getHumanMove(board, currentTurn, skillLevel = '5k', options = {}) {
    if (!this.isReady) {
      throw new Error('KataGo not ready');
    }

    const queryId = `q${++this.queryCounter}`;
    const kataBoard = this.boardToKataGo(board);
    const level = SKILL_LEVELS[skillLevel] || SKILL_LEVELS['5k'];

    const query = {
      id: queryId,
      moves: [],
      initialStones: kataBoard,
      rules: options.rules || 'chinese',
      komi: options.komi || 7.5,
      boardXSize: board[0].length,
      boardYSize: board.length,
      initialPlayer: currentTurn === 'black' ? 'B' : 'W',
      maxVisits: options.maxVisits || 50,
      analyzeTurns: [0]
    };

    // Add human-like parameters if not max strength
    if (level.humanSL !== null) {
      query.overrideSettings = {
        humanSLProfile: 'preaz_quality',
        humanSLChosenMoveProp: 1.0,
        humanSL: level.humanSL,
        // Add some randomness for more natural play
        chosenMoveTemperature: 0.5 + (Math.max(0, -level.humanSL) * 0.05),
        chosenMoveSubtract: 0,
        chosenMovePrune: 1
      };
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(queryId);
        reject(new Error('Move generation timeout'));
      }, options.timeout || 15000);

      this.pendingRequests.set(queryId, { resolve, reject, timeout });
      this.sendCommand(query);
    });
  }

  /**
   * Parse analysis response into our format
   */
  parseAnalysisResult(response) {
    if (!response.moveInfos || !response.moveInfos.length) {
      return {
        timestamp: Date.now(),
        moves: [],
        overallWinrate: { black: 0.5, white: 0.5 },
        scoreLead: 0,
        message: 'No moves analyzed'
      };
    }

    const rootInfo = response.rootInfo || {};

    // Convert move infos to our format
    const moves = response.moveInfos.slice(0, 10).map(move => ({
      point: move.move === 'pass' ? null : {
        x: move.move[0],
        y: move.move[1]
      },
      winrate: move.winrate,
      visits: move.visits,
      scoreLead: move.scoreLead || 0,
      pv: (move.pv || []).slice(0, 10).map(coord =>
        coord === 'pass' ? null : { x: coord[0], y: coord[1] }
      ).filter(p => p !== null)
    }));

    // Calculate overall winrate from root
    const blackWinrate = rootInfo.winrate || 0.5;

    return {
      timestamp: Date.now(),
      moves,
      overallWinrate: {
        black: blackWinrate,
        white: 1 - blackWinrate
      },
      scoreLead: rootInfo.scoreLead || 0,
      message: null
    };
  }

  /**
   * Parse move response to get the best move
   */
  parseMoveResult(response, skillLevel) {
    if (!response.moveInfos || !response.moveInfos.length) {
      return {
        move: null,
        isPass: true,
        winrate: 0.5,
        scoreLead: 0,
        skillLevel
      };
    }

    // Get the top move (KataGo already applies human-like selection with humanSL)
    const topMove = response.moveInfos[0];
    const rootInfo = response.rootInfo || {};

    return {
      move: topMove.move === 'pass' ? null : {
        x: topMove.move[0],
        y: topMove.move[1]
      },
      isPass: topMove.move === 'pass',
      winrate: rootInfo.winrate || topMove.winrate,
      scoreLead: rootInfo.scoreLead || topMove.scoreLead || 0,
      skillLevel,
      visits: topMove.visits
    };
  }

  /**
   * Convenience method: analyze and return parsed result
   */
  async getAnalysis(board, currentTurn, options = {}) {
    const response = await this.analyze(board, currentTurn, options);
    const turnAnalysis = response.turnInfos?.[0] || response;
    return this.parseAnalysisResult(turnAnalysis);
  }

  /**
   * Convenience method: get AI move at specified skill level
   */
  async getAIMove(board, currentTurn, skillLevel = '5k', options = {}) {
    const response = await this.getHumanMove(board, currentTurn, skillLevel, options);
    const turnAnalysis = response.turnInfos?.[0] || response;
    return this.parseMoveResult(turnAnalysis, skillLevel);
  }
}

// Singleton instance
let instance = null;

/**
 * Get or create the KataGo manager instance
 */
function getKataGoManager() {
  if (!instance) {
    instance = new KataGoManager();
  }
  return instance;
}

/**
 * Check if KataGo is configured and available
 */
function isKataGoAvailable() {
  return !!(process.env.KATAGO_PATH && process.env.KATAGO_MODEL);
}

/**
 * Get available skill levels for UI
 */
function getSkillLevels() {
  return Object.entries(SKILL_LEVELS).map(([key, value]) => ({
    id: key,
    name: value.name,
    description: value.description
  }));
}

module.exports = {
  KataGoManager,
  getKataGoManager,
  isKataGoAvailable,
  getSkillLevels,
  SKILL_LEVELS
};
