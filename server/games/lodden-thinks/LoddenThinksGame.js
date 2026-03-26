// Lodden Thinks - Server Game Class

const questionDeck = require('./questionDeck.json');

// Flatten deck into a lookup map for fast access
const DECK_MAP = {};
for (const cat of questionDeck.categories) {
  for (const q of cat.questions) {
    DECK_MAP[q.id] = { ...q, categoryId: cat.id, categoryName: cat.name };
  }
}

class LoddenThinksGame {
  constructor(players) {
    if (players.length < 3) {
      throw new Error('Lodden Thinks requires at least 3 players');
    }

    const playerIds = players.map(p => p.id);

    this.state = {
      type: 'lodden-thinks',
      phase: 'SETUP',
      roundNumber: 1,
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        isConnected: p.isConnected !== false,
        bettorWins: 0,
        spectatorCorrect: 0,
      })),
      currentRound: this._initRound(playerIds, 1),
      roundHistory: [],
    };
  }

  // ─── Round Init ────────────────────────────────────────────────────────────

  _initRound(playerIds, roundNumber) {
    const n = playerIds.length;
    const loddenIdx = (roundNumber - 1) % n;
    const bettorAIdx = (loddenIdx + 1) % n;
    const bettorBIdx = (loddenIdx + 2) % n;

    return {
      question: null,
      questionQueue: [],          // { id, text, submittedById, submittedByName, deckQuestionId }
      loddenId: playerIds[loddenIdx],
      bettorAId: playerIds[bettorAIdx],
      bettorBId: playerIds[bettorBIdx],
      activeBettorId: playerIds[bettorAIdx],
      loddenNumber: null,
      bids: [],
      spectatorPredictions: [],
      winnerId: null,
      finalBid: null,
      underBettorId: null,
      overBettorId: null,
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  _getCurrentBid() {
    const bidActions = this.state.currentRound.bids.filter(b => b.action === 'bid');
    return bidActions.length > 0 ? bidActions[bidActions.length - 1].value : null;
  }

  _getPlayerName(id) {
    return (this.state.players.find(p => p.id === id) || {}).name || 'Unknown';
  }

  // ─── Reconnection ──────────────────────────────────────────────────────────

  /**
   * Called by lobbyHelpers.updateGamePlayerSocketId when a player reconnects
   * with a new socket ID. Updates all ID references in the game state.
   */
  updatePlayerSocketId(oldId, newId) {
    // Update players array
    const player = this.state.players.find(p => p.id === oldId);
    if (player) player.id = newId;

    // Update round role references
    const r = this.state.currentRound;
    if (r.loddenId === oldId)      r.loddenId = newId;
    if (r.bettorAId === oldId)     r.bettorAId = newId;
    if (r.bettorBId === oldId)     r.bettorBId = newId;
    if (r.activeBettorId === oldId) r.activeBettorId = newId;
    if (r.underBettorId === oldId)  r.underBettorId = newId;
    if (r.overBettorId === oldId)   r.overBettorId = newId;
    if (r.winnerId === oldId)       r.winnerId = newId;

    // Update bid history
    for (const bid of r.bids) {
      if (bid.bettorId === oldId) bid.bettorId = newId;
    }

    // Update spectator predictions
    for (const pred of r.spectatorPredictions) {
      if (pred.playerId === oldId) pred.playerId = newId;
    }

    // Update question queue submitters
    for (const item of r.questionQueue) {
      if (item.submittedById === oldId) item.submittedById = newId;
    }

    console.log(`🎯 LoddenThinks: updated player ID ${oldId} → ${newId}`);
  }

  // ─── Phase Transitions ─────────────────────────────────────────────────────

  confirmSetup(playerId) {
    if (this.state.phase !== 'SETUP') {
      return { success: false, error: 'Not in setup phase' };
    }
    this.state.phase = 'QUESTION';
    return { success: true };
  }

  // ─── Question Queue ────────────────────────────────────────────────────────

  /**
   * Submit a question to the round's queue.
   * Any player can call this. deckQuestionId is optional (when drawn from deck).
   */
  submitQuestion(playerId, text, deckQuestionId = null) {
    if (this.state.phase !== 'QUESTION') {
      return { success: false, error: 'Not in question phase' };
    }
    const trimmed = (text || '').trim();
    if (!trimmed) {
      return { success: false, error: 'Question text cannot be empty' };
    }
    const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.state.currentRound.questionQueue.push({
      id,
      text: trimmed,
      submittedById: playerId,
      submittedByName: this._getPlayerName(playerId),
      deckQuestionId,
    });
    return { success: true };
  }

  /**
   * Select a question from the queue — sets it as the round question and
   * advances to LOCK_IN.
   */
  selectQuestion(playerId, queueItemId) {
    if (this.state.phase !== 'QUESTION') {
      return { success: false, error: 'Not in question phase' };
    }
    const item = this.state.currentRound.questionQueue.find(q => q.id === queueItemId);
    if (!item) {
      return { success: false, error: 'Question not found in queue' };
    }
    this.state.currentRound.question = item.text;
    this.state.phase = 'LOCK_IN';
    return { success: true };
  }

  // ─── Lock-In ───────────────────────────────────────────────────────────────

  lockIn(playerId, number) {
    if (this.state.phase !== 'LOCK_IN') {
      return { success: false, error: 'Not in lock-in phase' };
    }
    if (playerId !== this.state.currentRound.loddenId) {
      return { success: false, error: 'Only the Lodden can lock in a number' };
    }
    const parsed = parseInt(number, 10);
    if (isNaN(parsed)) {
      return { success: false, error: 'Number must be an integer' };
    }
    this.state.currentRound.loddenNumber = parsed;
    this.state.phase = 'BIDDING';
    return { success: true };
  }

  // ─── Bidding ───────────────────────────────────────────────────────────────

  bid(playerId, value) {
    if (this.state.phase !== 'BIDDING') {
      return { success: false, error: 'Not in bidding phase' };
    }
    if (playerId !== this.state.currentRound.activeBettorId) {
      return { success: false, error: 'Not your turn to bid' };
    }
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      return { success: false, error: 'Bid must be an integer' };
    }
    const currentBid = this._getCurrentBid();
    if (currentBid !== null && parsed <= currentBid) {
      return { success: false, error: `Bid must be at least ${currentBid + 1}` };
    }

    const { bettorAId, bettorBId } = this.state.currentRound;
    const otherBettor = playerId === bettorAId ? bettorBId : bettorAId;

    this.state.currentRound.bids.push({ bettorId: playerId, value: parsed, action: 'bid' });
    this.state.currentRound.activeBettorId = otherBettor;

    return { success: true };
  }

  takeUnder(playerId) {
    if (this.state.phase !== 'BIDDING') {
      return { success: false, error: 'Not in bidding phase' };
    }
    if (playerId !== this.state.currentRound.activeBettorId) {
      return { success: false, error: 'Not your turn' };
    }
    if (this._getCurrentBid() === null) {
      return { success: false, error: 'There is no bid to take the under on yet' };
    }

    const { bettorAId, bettorBId, loddenNumber } = this.state.currentRound;
    const underBettorId = playerId;
    const overBettorId = playerId === bettorAId ? bettorBId : bettorAId;
    const finalBid = this._getCurrentBid();

    this.state.currentRound.bids.push({ bettorId: playerId, value: null, action: 'take_under' });
    this.state.currentRound.underBettorId = underBettorId;
    this.state.currentRound.overBettorId = overBettorId;
    this.state.currentRound.finalBid = finalBid;

    // loddenNumber < finalBid → under wins; loddenNumber >= finalBid → over wins
    const winnerId = loddenNumber < finalBid ? underBettorId : overBettorId;
    this.state.currentRound.winnerId = winnerId;

    const winner = this.state.players.find(p => p.id === winnerId);
    if (winner) winner.bettorWins++;

    const actualSide = loddenNumber < finalBid ? 'under' : 'over';
    this.state.currentRound.spectatorPredictions.forEach(pred => {
      if (pred.predictedSide === actualSide) {
        const spectator = this.state.players.find(p => p.id === pred.playerId);
        if (spectator) spectator.spectatorCorrect++;
      }
    });

    this.state.phase = 'REVEAL';
    return { success: true };
  }

  spectatorPredict(playerId, predictedSide) {
    if (this.state.phase !== 'BIDDING') {
      return { success: false, error: 'Predictions can only be made during bidding' };
    }
    const { loddenId, bettorAId, bettorBId } = this.state.currentRound;
    if ([loddenId, bettorAId, bettorBId].includes(playerId)) {
      return { success: false, error: 'Only spectators can make predictions' };
    }
    if (!['over', 'under'].includes(predictedSide)) {
      return { success: false, error: 'Prediction must be "over" or "under"' };
    }

    const existing = this.state.currentRound.spectatorPredictions.findIndex(p => p.playerId === playerId);
    if (existing >= 0) {
      this.state.currentRound.spectatorPredictions[existing].predictedSide = predictedSide;
    } else {
      this.state.currentRound.spectatorPredictions.push({ playerId, predictedSide });
    }
    return { success: true };
  }

  // ─── Reveal / Round Over ───────────────────────────────────────────────────

  acknowledgeReveal() {
    if (this.state.phase !== 'REVEAL') {
      return { success: false, error: 'Not in reveal phase' };
    }
    this.state.phase = 'ROUND_OVER';
    return { success: true };
  }

  nextRound() {
    if (this.state.phase !== 'ROUND_OVER') {
      return { success: false, error: 'Not in round over phase' };
    }
    this.state.roundHistory.push({ ...this.state.currentRound });
    this.state.roundNumber++;
    const playerIds = this.state.players.map(p => p.id);
    this.state.currentRound = this._initRound(playerIds, this.state.roundNumber);
    this.state.phase = 'SETUP';
    return { success: true };
  }

  // ─── Deck Access ───────────────────────────────────────────────────────────

  getDeck() {
    return questionDeck;
  }

  getRandomDeckQuestion(loddenName) {
    const all = Object.values(DECK_MAP);
    const q = all[Math.floor(Math.random() * all.length)];
    return {
      id: q.id,
      text: q.text.replace(/\[Lodden\]/g, loddenName),
      rawText: q.text,
      categoryId: q.categoryId,
      categoryName: q.categoryName,
    };
  }

  // ─── Views ─────────────────────────────────────────────────────────────────

  getPlayerView(playerId) {
    const state = JSON.parse(JSON.stringify(this.state));
    // Hide lodden's number until REVEAL or ROUND_OVER
    if (state.phase !== 'REVEAL' && state.phase !== 'ROUND_OVER') {
      state.currentRound.loddenNumber = null;
    }
    return state;
  }

  getGameState() {
    return this.state;
  }
}

module.exports = { LoddenThinksGame, questionDeck, DECK_MAP };
