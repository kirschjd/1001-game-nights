// Enhanced HenHur Game Component
// Complete UI with turn controls, tokens, burn slots, and game phases

import React, { useEffect } from 'react';
import { useHenHurGame } from './hooks/useHenHurGame';
import GamePhaseIndicator from './components/GamePhaseIndicator';
import RaceTurnControls from './components/RaceTurnControls';
import AuctionTurnControls from './components/AuctionTurnControls';
import EnhancedPlayerMat from './components/EnhancedPlayerMat';
import RaceTrack from './components/RaceTrack';
import PlayerStatusDrawer from './components/PlayerStatusDrawer';
import LeftInfoDrawer from './components/LeftInfoDrawer';
import CardHand from './components/CardHand';

interface HenHurGameEnhancedProps {
  variant?: 'standard' | 'debug';
  socket: any;
  slug: string;
  playerName: string;
  isLeader?: boolean;
  gameState?: any;
}

const HenHurGameEnhanced: React.FC<HenHurGameEnhancedProps> = ({
  variant = 'standard',
  socket,
  slug,
  playerName,
  isLeader,
  gameState: initialGameState
}) => {
  const { gameState, error, actions } = useHenHurGame({
    socket,
    slug,
    initialState: initialGameState
  });

  // Request state on mount
  useEffect(() => {
    actions.requestState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!gameState || !gameState.myState) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-screen bg-gray-900">
        <div className="text-white text-2xl font-bold mb-4">Loading HenHur...</div>
        <div className="text-gray-400">Waiting for game state...</div>
      </div>
    );
  }

  const {
    phase,
    turnNumber,
    roundNumber,
    turnType,
    track,
    myState,
    otherPlayers,
    auctionPool,
    currentDrafter,
    readyPlayers,
    winner
  } = gameState;

  const isRaceTurn = turnType === 'race';
  const isAuctionTurn = turnType === 'auction';

  const burnSlotsAvailable = myState.burnSlots.filter(s => s.card === null).length;

  // Game Over
  if (phase === 'game_over' && winner) {
    const winnerPlayer = winner === myState.playerId
      ? myState
      : otherPlayers.find(p => p.playerId === winner);

    return (
      <div className="flex flex-col items-center justify-center w-full h-screen bg-gray-900">
        <div className="text-center space-y-6">
          <div className="text-6xl">🏆</div>
          <div className="text-4xl text-yellow-400 font-bold">
            {winner === myState.playerId ? 'You Win!' : `${winnerPlayer?.playerName} Wins!`}
          </div>
          <div className="text-gray-400 text-xl">
            Completed {track.lapsToWin} laps!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen bg-gray-900 py-8 pb-40 relative">
      {/* Error Banner */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg">
          ❌ {error}
        </div>
      )}

      {/* Main Content */}
      <div className="w-full max-w-6xl mx-auto px-4 space-y-6">
        {/* Game Phase Indicator */}
        <GamePhaseIndicator
          roundNumber={roundNumber}
          turnNumber={turnNumber}
          turnType={turnType}
          phase={phase}
          readyCount={readyPlayers.length}
          totalPlayers={otherPlayers.length + 1}
        />

        {/* Race Track */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <RaceTrack
            myPosition={myState.position}
            myName={myState.playerName}
            otherPlayers={otherPlayers}
            trackConfig={track}
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Turn Controls */}
          <div>
            {isRaceTurn && (phase === 'race_selection' || myState.isReady) && (
              <RaceTurnControls
                hand={myState.deck.hand}
                tokens={myState.tokens}
                burnSlotsAvailable={burnSlotsAvailable}
                onSelectCard={actions.selectRaceCard}
                isReady={myState.isReady}
              />
            )}

            {isAuctionTurn && (
              <AuctionTurnControls
                phase={
                  phase === 'auction_selection' ? 'selection' :
                  phase === 'auction_reveal' ? 'reveal' :
                  phase === 'auction_drafting' ? 'drafting' :
                  'selection'
                }
                hand={myState.deck.hand}
                tokens={myState.tokens}
                auctionPool={auctionPool || []}
                currentDrafter={currentDrafter}
                myPlayerId={myState.playerId}
                onSelectBidCard={actions.selectAuctionCard}
                onDraftCard={actions.draftCard}
                isReady={myState.isReady}
              />
            )}

            {phase === 'race_reveal' && (
              <div className="bg-gray-800 rounded-lg p-4 border border-yellow-600">
                <div className="text-center">
                  <div className="text-yellow-400 font-bold text-lg mb-2">👁️ Cards Revealed!</div>
                  <div className="text-gray-400 text-sm">Resolving in priority order...</div>
                  <div className="mt-4 animate-pulse text-4xl">⚡</div>
                </div>
              </div>
            )}

            {phase === 'race_resolution' && (
              <div className="bg-gray-800 rounded-lg p-4 border border-green-600">
                <div className="text-center">
                  <div className="text-green-400 font-bold text-lg mb-2">⚡ Executing!</div>
                  <div className="text-gray-400 text-sm">Cards are being played...</div>
                  <div className="mt-4 animate-spin text-4xl">🎲</div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Player Mat */}
          <div>
            <EnhancedPlayerMat
              deckCount={myState.deck.deck.length}
              handCount={myState.deck.hand.length}
              discardCount={myState.deck.discard.length}
              burnSlots={myState.burnSlots}
              tokens={myState.tokens}
              maxTokens={myState.maxTokens}
              currentLap={myState.position.lap}
            />

            {/* Other Players Status */}
            <div className="mt-4 bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h4 className="text-white font-semibold mb-3">Other Players</h4>
              <div className="space-y-2">
                {otherPlayers.map(player => (
                  <div
                    key={player.playerId}
                    className={`
                      bg-gray-900 rounded-lg p-3 border
                      ${readyPlayers.includes(player.playerId)
                        ? 'border-green-600'
                        : 'border-gray-700'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-semibold">
                          {player.playerName}
                          {readyPlayers.includes(player.playerId) && (
                            <span className="ml-2 text-green-400">✓</span>
                          )}
                        </div>
                        <div className="text-gray-400 text-xs">
                          Lap {player.position.lap} • Space {player.position.space}
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-400">
                        <div>Hand: {player.handCount}</div>
                        <div>Deck: {player.deckCount}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Footer */}
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="text-gray-400">Cards Played</div>
              <div className="text-white font-bold">{myState.cardsPlayed}</div>
            </div>
            <div>
              <div className="text-gray-400">Cards Burned</div>
              <div className="text-orange-400 font-bold">{myState.cardsBurned}</div>
            </div>
            <div>
              <div className="text-gray-400">Distance Moved</div>
              <div className="text-blue-400 font-bold">{myState.distanceMoved}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Drawers */}
      <PlayerStatusDrawer players={otherPlayers} readyPlayers={readyPlayers} />
      <LeftInfoDrawer
        variant={variant}
        socket={socket}
        slug={slug}
        playerName={playerName}
        isLeader={isLeader}
      />

      {/* Persistent Hand at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 border-t-2 border-gray-700 backdrop-blur-sm z-40 overflow-x-auto">
        <div className="max-w-7xl mx-auto">
          <CardHand
            cards={myState.deck.hand}
            selectedCardId={null}
            disabled={false}
          />
        </div>
      </div>
    </div>
  );
};

export default HenHurGameEnhanced;
