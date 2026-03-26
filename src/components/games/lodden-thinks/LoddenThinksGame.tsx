import React, { useState, useEffect, useMemo } from 'react';
import { Socket } from 'socket.io-client';
import { LoddenThinksGameState, LoddenPlayer, Bid, QuestionDeck, QueueItem } from './types/LoddenThinksTypes';

interface LoddenThinksGameProps {
  socket: Socket;
  gameState: LoddenThinksGameState;
  isLeader: boolean;
  slug: string;
}

const ACCENT = 'amber';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPlayerName(players: LoddenPlayer[], id: string | null): string {
  if (!id) return 'Unknown';
  return players.find(p => p.id === id)?.name || 'Unknown';
}

function getCurrentBid(bids: Bid[]): number | null {
  const bidActions = bids.filter(b => b.action === 'bid');
  return bidActions.length > 0 ? bidActions[bidActions.length - 1].value! : null;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function RoleTag({ role }: { role: 'Lodden' | 'Bettor A' | 'Bettor B' | 'Spectator' }) {
  const colors: Record<string, string> = {
    'Lodden': 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    'Bettor A': 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
    'Bettor B': 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
    'Spectator': 'bg-gray-500/20 text-gray-400 border border-gray-500/40',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[role]}`}>
      {role}
    </span>
  );
}

function ScoreTable({ players }: { players: LoddenPlayer[] }) {
  return (
    <div className="bg-payne-grey/60 rounded-lg border border-payne-grey-light overflow-hidden">
      <div className="grid grid-cols-3 text-xs text-gray-400 px-3 py-2 border-b border-payne-grey-light">
        <span>Player</span>
        <span className="text-center">Bettor Wins</span>
        <span className="text-center">Spectator Correct</span>
      </div>
      {players.map(p => (
        <div key={p.id} className="grid grid-cols-3 px-3 py-2 text-sm border-b border-payne-grey/40 last:border-0">
          <span className="text-white font-medium truncate">{p.name}</span>
          <span className="text-center text-amber-300 font-bold">{p.bettorWins}</span>
          <span className="text-center text-blue-300">{p.spectatorCorrect}</span>
        </div>
      ))}
    </div>
  );
}

function BidHistory({ bids, players }: { bids: Bid[], players: LoddenPlayer[] }) {
  if (bids.length === 0) return null;
  return (
    <div className="space-y-1">
      {bids.map((bid, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="text-gray-400 w-5 text-right">{i + 1}.</span>
          <span className="text-white font-medium">{getPlayerName(players, bid.bettorId)}</span>
          {bid.action === 'bid' ? (
            <span className="text-amber-300">bid <strong>{bid.value}</strong></span>
          ) : (
            <span className="text-red-400 font-semibold">took the under</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Phase Views ─────────────────────────────────────────────────────────────

function SetupPhase({
  gameState, isLeader, socket, slug
}: { gameState: LoddenThinksGameState, isLeader: boolean, socket: Socket, slug: string }) {
  const { currentRound, players, roundNumber } = gameState;
  const loddenName = getPlayerName(players, currentRound.loddenId);
  const bettorAName = getPlayerName(players, currentRound.bettorAId);
  const bettorBName = getPlayerName(players, currentRound.bettorBId);
  const spectators = players.filter(
    p => ![currentRound.loddenId, currentRound.bettorAId, currentRound.bettorBId].includes(p.id)
  );

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <div className="text-gray-400 text-sm uppercase tracking-widest mb-1">Round {roundNumber}</div>
        <h2 className="text-3xl font-bold text-amber-300">Role Assignment</h2>
      </div>

      <div className="bg-payne-grey/60 rounded-xl border border-payne-grey-light p-5 space-y-4">
        <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
          <div>
            <div className="text-xs text-gray-400 mb-1">Lodden</div>
            <div className="text-white font-bold text-lg">{loddenName}</div>
          </div>
          <div className="text-3xl">🎯</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
            <div className="text-xs text-gray-400 mb-1">Bettor A</div>
            <div className="text-white font-semibold">{bettorAName}</div>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
            <div className="text-xs text-gray-400 mb-1">Bettor B</div>
            <div className="text-white font-semibold">{bettorBName}</div>
          </div>
        </div>

        {spectators.length > 0 && (
          <div className="p-3 bg-gray-500/10 rounded-lg border border-gray-500/30">
            <div className="text-xs text-gray-400 mb-2">Spectators</div>
            <div className="flex flex-wrap gap-2">
              {spectators.map(s => (
                <span key={s.id} className="text-sm text-gray-300">{s.name}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="text-sm text-gray-400 space-y-1 bg-payne-grey/40 rounded-lg p-4 border border-payne-grey-light">
        <p><strong className="text-amber-300">Lodden</strong> secretly picks a number. Don't reveal it!</p>
        <p><strong className="text-blue-300">Bettors</strong> take turns bidding on what that number is.</p>
        <p>Someone takes the under. If the number is below the bid, under wins. Otherwise over wins.</p>
      </div>

      {isLeader ? (
        <button
          onClick={() => socket.emit('lodden:confirm-setup', { slug })}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-lg transition-colors"
        >
          Start Round →
        </button>
      ) : (
        <p className="text-center text-gray-400 text-sm">Waiting for the leader to start the round...</p>
      )}
    </div>
  );
}

type DeckView = 'queue' | 'browse';

function QuestionPhase({
  gameState, myId, socket, slug
}: { gameState: LoddenThinksGameState, myId: string, socket: Socket, slug: string }) {
  const { players, currentRound } = gameState;
  const loddenName = getPlayerName(players, currentRound.loddenId);
  const queue = currentRound.questionQueue || [];

  const [view, setView] = useState<DeckView>('queue');
  const [inputText, setInputText] = useState('');
  const [deck, setDeck] = useState<QuestionDeck | null>(null);
  const [deckLoading, setDeckLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [deckSearch, setDeckSearch] = useState('');

  // Load deck when browse tab is opened
  useEffect(() => {
    if (view !== 'browse' || deck) return;
    setDeckLoading(true);
    socket.emit('lodden:get-deck', { slug });
  }, [view, deck, socket, slug]);

  useEffect(() => {
    const handleDeck = ({ deck: d }: { deck: QuestionDeck }) => {
      setDeck(d);
      setDeckLoading(false);
      if (d.categories.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(d.categories[0].id);
      }
    };
    socket.on('lodden:deck', handleDeck);
    return () => { socket.off('lodden:deck', handleDeck); };
  }, [socket, selectedCategoryId]);

  const handleSuggestText = () => {
    if (!inputText.trim()) return;
    socket.emit('lodden:submit-question', { slug, text: inputText.trim() });
    setInputText('');
  };

  const handleSuggestFromDeck = (questionId: string, displayText: string) => {
    socket.emit('lodden:submit-question', { slug, text: displayText, deckQuestionId: questionId });
  };

  const handleSelect = (queueItemId: string) => {
    socket.emit('lodden:select-question', { slug, queueItemId });
  };

  const filteredDeckQuestions = useMemo(() => {
    if (!deck || !selectedCategoryId) return [];
    const cat = deck.categories.find(c => c.id === selectedCategoryId);
    if (!cat) return [];
    const searchLower = deckSearch.toLowerCase();
    if (!searchLower) return cat.questions;
    return cat.questions.filter(q => q.displayText.toLowerCase().includes(searchLower));
  }, [deck, selectedCategoryId, deckSearch]);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="text-center">
        <div className="text-gray-400 text-sm mb-1">
          Lodden this round: <strong className="text-amber-300">{loddenName}</strong>
        </div>
        <h2 className="text-2xl font-bold text-white">Choose a Question</h2>
        <p className="text-gray-400 text-sm mt-1">
          Any player can suggest questions. Anyone can select one to lock it in.
        </p>
      </div>

      {/* Suggest input — always visible */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSuggestText(); }}
          placeholder={`Type a question about ${loddenName}...`}
          className="flex-1 px-4 py-2.5 bg-payne-grey border border-payne-grey-light rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
        />
        <button
          onClick={handleSuggestText}
          disabled={!inputText.trim()}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-colors text-sm whitespace-nowrap"
        >
          + Suggest
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-payne-grey/40 rounded-xl p-1 border border-payne-grey-light">
        <button
          onClick={() => setView('queue')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'queue' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'
          }`}
        >
          Queue {queue.length > 0 && `(${queue.length})`}
        </button>
        <button
          onClick={() => setView('browse')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'browse' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'
          }`}
        >
          Browse Deck
        </button>
      </div>

      {/* Queue view */}
      {view === 'queue' && (
        <div className="space-y-2">
          {queue.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No questions suggested yet.</p>
              <p className="text-xs mt-1">Type one above or browse the deck →</p>
            </div>
          ) : (
            queue.map((item: QueueItem) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 bg-payne-grey/50 rounded-xl border border-payne-grey-light"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm leading-snug">{item.text}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    suggested by {item.submittedByName}
                    {item.deckQuestionId && <span className="ml-1 text-amber-500/70">· from deck</span>}
                  </p>
                </div>
                <button
                  onClick={() => handleSelect(item.id)}
                  className="shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-colors"
                >
                  Use This →
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Deck browse view */}
      {view === 'browse' && (
        <div className="space-y-3">
          {deckLoading ? (
            <div className="text-center py-8 text-gray-400">Loading deck...</div>
          ) : deck ? (
            <>
              {/* Category tabs */}
              <div className="flex gap-1.5 flex-wrap">
                {deck.categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategoryId(cat.id); setDeckSearch(''); }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedCategoryId === cat.id
                        ? 'bg-amber-500 text-black'
                        : 'bg-payne-grey border border-payne-grey-light text-gray-300 hover:text-white'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Category description + search */}
              {selectedCategoryId && deck.categories.find(c => c.id === selectedCategoryId) && (
                <p className="text-xs text-gray-500">
                  {deck.categories.find(c => c.id === selectedCategoryId)!.description}
                </p>
              )}

              <input
                type="text"
                value={deckSearch}
                onChange={e => setDeckSearch(e.target.value)}
                placeholder="Search questions..."
                className="w-full px-3 py-2 bg-payne-grey border border-payne-grey-light rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />

              {/* Question list */}
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {filteredDeckQuestions.length === 0 ? (
                  <p className="text-center py-4 text-gray-500 text-sm">No matching questions.</p>
                ) : (
                  filteredDeckQuestions.map(q => (
                    <div
                      key={q.id}
                      className="flex items-center gap-2 px-3 py-2 bg-payne-grey/50 rounded-lg border border-payne-grey/60 hover:border-amber-500/40 transition-colors group"
                    >
                      <p className="flex-1 text-gray-300 text-sm group-hover:text-white transition-colors">
                        {q.displayText}
                      </p>
                      <button
                        onClick={() => handleSuggestFromDeck(q.id, q.displayText)}
                        className="shrink-0 px-2.5 py-1 bg-payne-grey hover:bg-amber-500 hover:text-black border border-payne-grey-light text-gray-400 hover:text-black text-xs font-medium rounded-lg transition-colors"
                      >
                        + Suggest
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function LockInPhase({
  gameState, myId, socket, slug
}: { gameState: LoddenThinksGameState, myId: string, socket: Socket, slug: string }) {
  const { players, currentRound } = gameState;
  const isLodden = currentRound.loddenId === myId;
  const loddenName = getPlayerName(players, currentRound.loddenId);
  const [numberInput, setNumberInput] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const handleLockIn = () => {
    const val = parseInt(numberInput, 10);
    if (!isNaN(val)) {
      socket.emit('lodden:lock-in', { slug, number: val });
      setConfirmed(true);
    }
  };

  if (!isLodden) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6">
        <div className="text-6xl">🤫</div>
        <h2 className="text-2xl font-bold text-white">Lock-In Phase</h2>
        <p className="text-gray-300">
          <strong className="text-amber-300">{loddenName}</strong> is secretly entering their number...
        </p>
        <div className="text-sm text-gray-500 italic bg-payne-grey/40 rounded-lg p-4 border border-payne-grey-light">
          Question: <span className="text-gray-300 not-italic">"{currentRound.question}"</span>
        </div>
        <div className="flex gap-2 justify-center">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <div className="text-5xl mb-3">🔒</div>
        <h2 className="text-2xl font-bold text-amber-300">Lock In Your Number</h2>
        <p className="text-gray-400 text-sm mt-1">Only you can see this. Don't reveal it!</p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 text-center">
        <p className="text-gray-300 italic text-sm mb-1">The question:</p>
        <p className="text-white font-semibold text-lg">"{currentRound.question}"</p>
      </div>

      {!confirmed ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Your answer (integer):</label>
            <input
              type="number"
              value={numberInput}
              onChange={e => setNumberInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleLockIn(); }}
              placeholder="Enter your number..."
              className="w-full px-4 py-3 bg-payne-grey border border-payne-grey-light rounded-xl text-white text-xl text-center font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              autoFocus
            />
          </div>
          <button
            onClick={handleLockIn}
            disabled={numberInput.trim() === '' || isNaN(parseInt(numberInput, 10))}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold rounded-xl text-lg transition-colors"
          >
            Lock In 🔒
          </button>
        </div>
      ) : (
        <div className="text-center p-6 bg-green-500/10 border border-green-500/30 rounded-xl">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-green-400 font-semibold">Number locked in!</p>
          <p className="text-gray-400 text-sm mt-1">Waiting for bidding to begin...</p>
        </div>
      )}
    </div>
  );
}

function BiddingPhase({
  gameState, myId, socket, slug
}: { gameState: LoddenThinksGameState, myId: string, socket: Socket, slug: string }) {
  const { players, currentRound } = gameState;
  const { bids, activeBettorId, bettorAId, bettorBId, loddenId, spectatorPredictions } = currentRound;

  const isActiveBettor = activeBettorId === myId;
  const isBettor = myId === bettorAId || myId === bettorBId;
  const isLodden = myId === loddenId;
  const isSpectator = !isBettor && !isLodden;

  const currentBid = getCurrentBid(bids);
  const hasFirstBid = currentBid !== null;
  const myPrediction = spectatorPredictions.find(p => p.playerId === myId)?.predictedSide;

  const [bidInput, setBidInput] = useState('');
  const minBid = currentBid !== null ? currentBid + 1 : undefined;

  const handleBid = () => {
    const val = parseInt(bidInput, 10);
    if (!isNaN(val)) {
      socket.emit('lodden:bid', { slug, value: val });
      setBidInput('');
    }
  };

  const handleTakeUnder = () => {
    socket.emit('lodden:take-under', { slug });
  };

  const handlePredict = (side: 'over' | 'under') => {
    socket.emit('lodden:spectator-predict', { slug, predictedSide: side });
  };

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Question */}
      <div className="bg-payne-grey/50 rounded-xl border border-payne-grey-light p-4 text-center">
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">The Question</p>
        <p className="text-white font-semibold text-lg">"{currentRound.question}"</p>
      </div>

      {/* Current bid */}
      <div className="text-center">
        <p className="text-gray-400 text-sm mb-1">Current Bid</p>
        {hasFirstBid ? (
          <div className="text-5xl font-bold text-amber-300">{currentBid}</div>
        ) : (
          <div className="text-3xl font-bold text-gray-500">—</div>
        )}
      </div>

      {/* Active bettor controls */}
      {isActiveBettor && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-5 space-y-4">
          <p className="text-amber-300 font-semibold text-center text-sm">Your turn to act</p>

          <div className="flex gap-3">
            <input
              type="number"
              value={bidInput}
              onChange={e => setBidInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleBid(); }}
              placeholder={minBid !== undefined ? `Min: ${minBid}` : 'Any number'}
              min={minBid}
              className="flex-1 px-4 py-3 bg-payne-grey border border-payne-grey-light rounded-xl text-white text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              autoFocus
            />
            <button
              onClick={handleBid}
              disabled={bidInput === '' || isNaN(parseInt(bidInput, 10)) || (minBid !== undefined && parseInt(bidInput, 10) < minBid)}
              className="px-5 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-colors whitespace-nowrap"
            >
              Bid Higher ↑
            </button>
          </div>

          {hasFirstBid && (
            <button
              onClick={handleTakeUnder}
              className="w-full py-3 bg-red-600/80 hover:bg-red-500 text-white font-bold rounded-xl transition-colors"
            >
              Take the Under (&lt; {currentBid})
            </button>
          )}
        </div>
      )}

      {/* Waiting for the other bettor */}
      {isBettor && !isActiveBettor && (
        <div className="text-center text-gray-400 py-4">
          <p>Waiting for <strong className="text-white">{getPlayerName(players, activeBettorId)}</strong> to act...</p>
        </div>
      )}

      {/* Lodden view */}
      {isLodden && (
        <div className="text-center text-gray-400 py-4 bg-payne-grey/40 rounded-xl border border-payne-grey-light">
          <div className="text-2xl mb-2">🎯</div>
          <p>You're the Lodden — sit tight and watch the bids.</p>
        </div>
      )}

      {/* Spectator predictions */}
      {isSpectator && (
        <div className="bg-payne-grey/50 rounded-xl border border-payne-grey-light p-4 space-y-3">
          <p className="text-gray-400 text-sm text-center">Make your prediction</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handlePredict('over')}
              className={`py-3 rounded-xl font-bold transition-colors ${
                myPrediction === 'over'
                  ? 'bg-green-500 text-black'
                  : 'bg-payne-grey hover:bg-payne-grey-light border border-green-500/40 text-green-400'
              }`}
            >
              Over ↑{hasFirstBid && ` (≥ ${currentBid})`}
            </button>
            <button
              onClick={() => handlePredict('under')}
              className={`py-3 rounded-xl font-bold transition-colors ${
                myPrediction === 'under'
                  ? 'bg-red-500 text-white'
                  : 'bg-payne-grey hover:bg-payne-grey-light border border-red-500/40 text-red-400'
              }`}
            >
              Under ↓{hasFirstBid && ` (< ${currentBid})`}
            </button>
          </div>
          {myPrediction && (
            <p className="text-center text-xs text-gray-500">
              You predicted <strong className={myPrediction === 'over' ? 'text-green-400' : 'text-red-400'}>{myPrediction}</strong> — you can change it until bidding ends.
            </p>
          )}
        </div>
      )}

      {/* Bid history */}
      {bids.length > 0 && (
        <div className="bg-payne-grey/40 rounded-xl border border-payne-grey-light p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Bid History</p>
          <BidHistory bids={bids} players={players} />
        </div>
      )}

      {/* All spectator predictions (visible to all) */}
      {spectatorPredictions.length > 0 && (
        <div className="bg-payne-grey/40 rounded-xl border border-payne-grey-light p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Spectator Predictions</p>
          <div className="space-y-1">
            {spectatorPredictions.map(pred => (
              <div key={pred.playerId} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{getPlayerName(players, pred.playerId)}</span>
                <span className={pred.predictedSide === 'over' ? 'text-green-400' : 'text-red-400'}>
                  {pred.predictedSide === 'over' ? 'Over ↑' : 'Under ↓'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RevealPhase({
  gameState, isLeader, socket, slug
}: { gameState: LoddenThinksGameState, isLeader: boolean, socket: Socket, slug: string }) {
  const { players, currentRound } = gameState;
  const { loddenNumber, finalBid, winnerId, underBettorId, overBettorId, bids, spectatorPredictions, question } = currentRound;

  const winnerName = getPlayerName(players, winnerId);
  const loddenName = getPlayerName(players, currentRound.loddenId);
  const underBettorName = getPlayerName(players, underBettorId);
  const overBettorName = getPlayerName(players, overBettorId);

  const actualSide = loddenNumber !== null && finalBid !== null
    ? (loddenNumber < finalBid ? 'under' : 'over')
    : null;

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Reveal */}
      <div className="text-center space-y-2">
        <p className="text-gray-400 text-sm italic">"{question}"</p>
        <p className="text-gray-400 text-sm">{loddenName}'s number was...</p>
        <div className="text-7xl font-bold text-amber-300 py-4">{loddenNumber}</div>
        <p className="text-gray-400 text-sm">Final bid: <strong className="text-white text-lg">{finalBid}</strong></p>
      </div>

      {/* Winner */}
      <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-5 text-center">
        <div className="text-3xl mb-2">🏆</div>
        <p className="text-2xl font-bold text-amber-300">{winnerName} wins!</p>
        <p className="text-gray-400 text-sm mt-1">
          {loddenNumber !== null && finalBid !== null && loddenNumber < finalBid
            ? `${loddenNumber} < ${finalBid} → Under wins`
            : `${loddenNumber} ≥ ${finalBid} → Over wins`
          }
        </p>
      </div>

      {/* Side breakdown */}
      <div className="grid grid-cols-2 gap-3 text-center text-sm">
        <div className={`p-3 rounded-xl border ${winnerId === overBettorId ? 'bg-green-500/20 border-green-500/50' : 'bg-payne-grey/40 border-payne-grey-light'}`}>
          <p className="text-gray-400">Over (≥ {finalBid})</p>
          <p className="font-bold text-white">{overBettorName}</p>
          {winnerId === overBettorId && <p className="text-green-400 text-xs mt-1">✓ Won</p>}
        </div>
        <div className={`p-3 rounded-xl border ${winnerId === underBettorId ? 'bg-green-500/20 border-green-500/50' : 'bg-payne-grey/40 border-payne-grey-light'}`}>
          <p className="text-gray-400">Under (&lt; {finalBid})</p>
          <p className="font-bold text-white">{underBettorName}</p>
          {winnerId === underBettorId && <p className="text-green-400 text-xs mt-1">✓ Won</p>}
        </div>
      </div>

      {/* Spectator predictions */}
      {spectatorPredictions.length > 0 && (
        <div className="bg-payne-grey/40 rounded-xl border border-payne-grey-light p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Spectator Predictions</p>
          <div className="space-y-1">
            {spectatorPredictions.map(pred => {
              const correct = pred.predictedSide === actualSide;
              return (
                <div key={pred.playerId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{getPlayerName(players, pred.playerId)}</span>
                  <div className="flex items-center gap-2">
                    <span className={pred.predictedSide === 'over' ? 'text-green-400' : 'text-red-400'}>
                      {pred.predictedSide}
                    </span>
                    <span className={correct ? 'text-green-400' : 'text-red-400'}>
                      {correct ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isLeader ? (
        <button
          onClick={() => socket.emit('lodden:acknowledge-reveal', { slug })}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors"
        >
          View Scores →
        </button>
      ) : (
        <p className="text-center text-gray-400 text-sm">Waiting for the leader to continue...</p>
      )}
    </div>
  );
}

function RoundOverPhase({
  gameState, isLeader, socket, slug
}: { gameState: LoddenThinksGameState, isLeader: boolean, socket: Socket, slug: string }) {
  const { players, roundNumber, currentRound } = gameState;

  const sorted = [...players].sort((a, b) =>
    (b.bettorWins * 2 + b.spectatorCorrect) - (a.bettorWins * 2 + a.spectatorCorrect)
  );

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <div className="text-gray-400 text-sm uppercase tracking-widest mb-1">After Round {roundNumber}</div>
        <h2 className="text-3xl font-bold text-white">Scoreboard</h2>
      </div>

      <ScoreTable players={sorted} />

      <div className="text-xs text-gray-500 text-center space-y-0.5">
        <p><strong className="text-amber-300">Bettor Wins</strong> — won a round as a bettor</p>
        <p><strong className="text-blue-300">Spectator Correct</strong> — correctly predicted the outcome</p>
      </div>

      {isLeader ? (
        <button
          onClick={() => socket.emit('lodden:next-round', { slug })}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-lg transition-colors"
        >
          Next Round →
        </button>
      ) : (
        <p className="text-center text-gray-400 text-sm">Waiting for the leader to start the next round...</p>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

const LoddenThinksGame: React.FC<LoddenThinksGameProps> = ({ socket, gameState, isLeader, slug }) => {
  const myId = socket.id || '';
  const { phase } = gameState;

  return (
    <div className="min-h-screen pt-6 pb-12 px-4">
      {/* Phase indicator */}
      <div className="max-w-xl mx-auto mb-8">
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {(['SETUP', 'QUESTION', 'LOCK_IN', 'BIDDING', 'REVEAL', 'ROUND_OVER'] as const).map((p, i) => (
            <React.Fragment key={p}>
              {i > 0 && <span className="text-gray-600 text-xs">›</span>}
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                phase === p
                  ? 'bg-amber-500 text-black font-bold'
                  : 'text-gray-500'
              }`}>
                {p.replace('_', ' ')}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Phase content */}
      {phase === 'SETUP' && (
        <SetupPhase gameState={gameState} isLeader={isLeader} socket={socket} slug={slug} />
      )}
      {phase === 'QUESTION' && (
        <QuestionPhase gameState={gameState} myId={myId} socket={socket} slug={slug} />
      )}
      {phase === 'LOCK_IN' && (
        <LockInPhase gameState={gameState} myId={myId} socket={socket} slug={slug} />
      )}
      {phase === 'BIDDING' && (
        <BiddingPhase gameState={gameState} myId={myId} socket={socket} slug={slug} />
      )}
      {phase === 'REVEAL' && (
        <RevealPhase gameState={gameState} isLeader={isLeader} socket={socket} slug={slug} />
      )}
      {phase === 'ROUND_OVER' && (
        <RoundOverPhase gameState={gameState} isLeader={isLeader} socket={socket} slug={slug} />
      )}
    </div>
  );
};

export default LoddenThinksGame;
