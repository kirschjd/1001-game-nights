// ============ CORE/SHARED ============
export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  RECONNECT: 'reconnect',
  RECONNECT_ATTEMPT: 'reconnect_attempt',
  RECONNECT_FAILED: 'reconnect_failed',
  CONNECT_ERROR: 'connect_error',
  HEARTBEAT_PING: 'heartbeat-ping',
  HEARTBEAT_PONG: 'heartbeat-pong',
  ERROR: 'error',

  // Lobby Management
  JOIN_LOBBY: 'join-lobby',
  LOBBY_UPDATED: 'lobby-updated',
  UPDATE_LOBBY_TITLE: 'update-lobby-title',
  UPDATE_GAME_TYPE: 'update-game-type',
  UPDATE_PLAYER_NAME: 'update-player-name',
  CHANGE_LEADER: 'change-leader',

  // Bot Management
  ADD_BOT: 'add-bot',
  REMOVE_BOT: 'remove-bot',
  CHANGE_BOT_STYLE: 'change-bot-style',
  GET_BOT_STYLES: 'get-bot-styles',
  BOT_STYLES: 'bot-styles',

  // Game Lifecycle
  START_GAME: 'start-game',
  GAME_STARTED: 'game-started',
  GAME_STATE_UPDATED: 'game-state-updated',
  REQUEST_GAME_STATE: 'request-game-state',
  NO_GAME_RUNNING: 'no-game-running',

  // Sync
  REQUEST_FULL_SYNC: 'request-full-sync',
  FULL_SYNC_RESPONSE: 'full-sync-response',
} as const;

// ============ WAR ============
export const WAR_EVENTS = {
  START_ENHANCED_WAR: 'start-enhanced-war',
  ENHANCED_WAR_ACTION: 'enhanced-war-action',
  ENHANCED_WAR_NEXT_ROUND: 'enhanced-war-next-round',
  WAR_ERROR: 'war-error',
  WAR_VARIANTS: 'war-variants',
  GET_WAR_VARIANTS: 'get-war-variants',
} as const;

// ============ DICE FACTORY ============
export const DICE_FACTORY_EVENTS = {
  // Actions
  PROMOTE: 'dice-factory-promote',
  RECRUIT: 'dice-factory-recruit',
  SCORE_STRAIGHT: 'dice-factory-score-straight',
  SCORE_SET: 'dice-factory-score-set',
  PROCESS: 'dice-factory-process',
  ACTION: 'dice-factory-action',
  END_TURN: 'dice-factory-end-turn',
  UNDO: 'dice-factory-undo',
  FLEE: 'dice-factory-flee',
  REROLL_ALL: 'dice-factory-reroll-all',
  INCREASE_DICE_POOL: 'dice-factory-increase-dice-pool',

  // Market/Factory
  RESERVE_MODIFICATION: 'dice-factory-reserve-modification',
  BUY_RANDOM_MODIFICATION: 'dice-factory-buy-random-modification',
  DISCARD_MODIFICATION: 'dice-factory-discard-modification',
  BID_MODIFICATION: 'dice-factory-bid-modification',
  AUCTION_BID: 'dice-factory-auction-bid',
  PLAY_EFFECT: 'dice-factory-play-effect',
  GET_TURN_MODIFICATIONS: 'dice-factory-get-turn-modifications',
  GET_PLAYER_FACTORY_ITEMS: 'dice-factory-get-player-factory-items',
  GET_MODIFIED_COSTS: 'dice-factory-get-modified-costs',
  CALCULATE_SCORE_PREVIEW: 'dice-factory-calculate-score-preview',

  // Responses
  ERROR: 'dice-factory-error',
  SCORED: 'dice-factory-scored',
  TURN_MODIFICATIONS_UPDATE: 'turn-modifications-update',
  MODIFICATION_BID_PLACED: 'modification-bid-placed',
  AUCTION_PHASE_START: 'auction-phase-start',
  MODIFICATION_PURCHASED: 'modification-purchased',
  MODIFICATION_RESERVED: 'modification-reserved',
  MODIFICATION_AUCTION_WON: 'modification-auction-won',
  AUCTION_RESULTS: 'auction-results',
  PLAYER_FACTORY_ITEMS_UPDATE: 'player-factory-items-update',
  MODIFIED_COSTS_UPDATE: 'modified-costs-update',
  SCORE_PREVIEW_CALCULATED: 'score-preview-calculated',

  // Lobby config
  UPDATE_VARIANT: 'update-df-variant',
  UPDATE_ABILITIES: 'update-df-abilities',
} as const;

// ============ DICE FACTORY V0.2.1 (New Format) ============
export const DICE_FACTORY_V2_EVENTS = {
  ERROR: 'dice-factory:error',
  ATTACK_REQUEST: 'dice-factory:attack-request',
  ASSIGN_SLOT: 'dice-factory:assign-slot',
} as const;

// ============ HENHUR ============
export const HENHUR_EVENTS = {
  REQUEST_STATE: 'henhur:request-state',
  GAME_STATE: 'henhur:game-state',
  SELECT_RACE_CARD: 'henhur:select-race-card',
  SELECT_AUCTION_CARD: 'henhur:select-auction-card',
  DRAFT_CARD: 'henhur:draft-card',
  DEBUG_ACTION: 'henhur-debug-action',
  DEBUG_GIVE_TOKENS: 'henhur:debug-give-tokens',
  DEBUG_SET_POSITION: 'henhur:debug-set-position',
  DEBUG_DRAW_CARDS: 'henhur:debug-draw-cards',
  UPDATE_VARIANT: 'update-henhur-variant',
} as const;

// ============ HEIST CITY ============
export const HEIST_CITY_EVENTS = {
  MAP_STATE_CHANGE: 'heist-city-map-state-change',
  MAP_STATE_UPDATE: 'heist-city-map-state-update',
  DICE_ROLL: 'heist-city-dice-roll',
  GAME_INFO_UPDATE: 'heist-city-game-info-update',
  SELECTION_CHANGE: 'heist-city-selection-change',
  SELECTION_UPDATE: 'heist-city-selection-update',
  MAP_LOAD: 'heist-city-map-load',
  MAP_LOADED: 'heist-city-map-loaded',
  RULER_UPDATE: 'heist-city-ruler-update',
  NAME_UPDATE: 'heist-city-name-update',
  GAME_STATE_UPDATE: 'gameStateUpdate',
  UPDATE_MAP: 'update-heist-city-map',
} as const;

// ============ KILL TEAM DRAFT ============
export const KTD_EVENTS = {
  SELECT_CARD: 'ktd-select-card',
  REORDER_DECK: 'ktd-reorder-deck',
  DRAFT_AGAIN: 'ktd-draft-again',
} as const;

// ============ BADUK ANALYSIS ============
export const BADUK_EVENTS = {
  PLACE_STONE: 'baduk:place-stone',
  PASS: 'baduk:pass',
  NAVIGATE: 'baduk:navigate',
  UPLOAD_SGF: 'baduk:upload-sgf',
  ADD_COMMENT: 'baduk:add-comment',
  ADD_ANNOTATION: 'baduk:add-annotation',
  REMOVE_ANNOTATION: 'baduk:remove-annotation',
  DELETE_VARIATION: 'baduk:delete-variation',
  RESET: 'baduk:reset',
  REQUEST_STATE: 'baduk:request-state',
  GAME_STATE: 'baduk:game-state',
  REQUEST_ANALYSIS: 'baduk:request-analysis',
  ANALYSIS_RESULT: 'baduk:analysis-result',
  ANALYSIS_STATUS: 'baduk:analysis-status',
  // Scoring phase events
  TOGGLE_DEAD_STONE: 'baduk:toggle-dead-stone',
  ACCEPT_SCORE: 'baduk:accept-score',
  RESUME_GAME: 'baduk:resume-game',
  // AI opponent events
  CONFIGURE_AI: 'baduk:configure-ai',
  GET_SKILL_LEVELS: 'baduk:get-skill-levels',
  SKILL_LEVELS: 'baduk:skill-levels',
  REQUEST_AI_MOVE: 'baduk:request-ai-move',
  AI_MOVE: 'baduk:ai-move',
} as const;
