/**
 * KataGo Manager
 * Manages communication with KataGo engine via subprocess
 * Uses KataGo's JSON analysis protocol
 */

const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const path = require('path');

// Stone constants
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

class KataGoManager extends EventEmitter {
  constructor(options = {}) {
    super();

    // Configuration
    this.kataGoPath = options.kataGoPath || process.env.KATAGO_PATH || 'katago';
    this.modelPath = options.modelPath || process.env.KATAGO_MODEL || '';
    this.configPath = options.configPath || process.env.KATAGO_CONFIG || '';

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
      console.log('KataGo stderr:', message);
      // KataGo logs to stderr, this is normal
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
   * Request analysis for a board position
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

    // Convert board to KataGo format
    const kataBoard = this.boardToKataGo(board);

    const query = {
      id: queryId,
      moves: [], // We send current position via initialStones
      initialStones: kataBoard,
      rules: options.rules || 'chinese',
      komi: options.komi || 7.5,
      boardXSize: board[0].length,
      boardYSize: board.length,
      initialPlayer: currentTurn === 'black' ? 'B' : 'W',
      maxVisits: options.maxVisits || 100,
      analyzeTurns: [0] // Analyze current position
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
   * Convert board array to KataGo's initialStones format
   * Returns array of [color, x, y] where color is 'B' or 'W'
   */
  boardToKataGo(board) {
    const stones = [];

    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[y].length; x++) {
        const stone = board[y][x];
        if (stone === BLACK) {
          stones.push(['B', this.toGTPCoord(x), this.toGTPCoord(y)]);
        } else if (stone === WHITE) {
          stones.push(['W', this.toGTPCoord(x), this.toGTPCoord(y)]);
        }
      }
    }

    return stones;
  }

  /**
   * Convert x,y to GTP coordinate format
   * KataGo uses GTP coordinates: columns A-T (no I), rows 1-19
   */
  toGTPCoord(n) {
    // For a 19x19 board, coords are 0-18
    // In KataGo analysis JSON, we just use numeric x,y
    return n;
  }

  /**
   * Parse KataGo analysis response into our format
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
   * Convenience method: analyze and return parsed result
   */
  async getAnalysis(board, currentTurn, options = {}) {
    const response = await this.analyze(board, currentTurn, options);

    // KataGo returns analysis for each turn in analyzeTurns
    const turnAnalysis = response.turnInfos?.[0] || response;

    return this.parseAnalysisResult(turnAnalysis);
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

module.exports = {
  KataGoManager,
  getKataGoManager,
  isKataGoAvailable
};
