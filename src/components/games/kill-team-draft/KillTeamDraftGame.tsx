import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { DndContext, closestCenter, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import DraftCard from './components/DraftCard';
import PackSelection from './components/PackSelection';
import ExportDeckModal from './components/ExportDeckModal';

interface Card {
  id: string;
  name: string;
  letter: string;
  number: number;
}

interface Player {
  id: string;
  name: string;
  isBot: boolean;
  tablePosition: number;
}

interface OtherPlayer {
  id: string;
  name: string;
  isBot: boolean;
  deckSize: number;
  packsInQueue: number;
}

interface GameState {
  type: 'kill-team-draft';
  started: boolean;
  phase: 'drafting' | 'finished';
  currentPackNumber: number;
  totalPacks: number;
  passingDirection: 'right' | 'left';
  myDeck: Card[];
  myPack: Card[];
  packsWaiting: number;
  players: Player[];
  otherPlayers: OtherPlayer[];
}

interface Props {
  socket: Socket;
  slug: string;
  isLeader: boolean;
}

const KillTeamDraftGame: React.FC<Props> = ({ socket, slug, isLeader }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [cardStates, setCardStates] = useState<Record<string, { minimized: boolean; stacked: boolean }>>({});

  useEffect(() => {
    socket.on('game-state-updated', (state: GameState) => {
      setGameState(state);
    });

    socket.on('game-started', (state: GameState) => {
      setGameState(state);
    });

    return () => {
      socket.off('game-state-updated');
      socket.off('game-started');
    };
  }, [socket]);

  const handleSelectCard = (cardId: string) => {
    socket.emit('ktd-select-card', { slug, cardId });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !gameState) {
      return;
    }

    if (active.id !== over.id) {
      const oldIndex = gameState.myDeck.findIndex(c => c.id === active.id);
      const newIndex = gameState.myDeck.findIndex(c => c.id === over.id);

      const newOrder = arrayMove(gameState.myDeck, oldIndex, newIndex);
      const cardIds = newOrder.map(c => c.id);

      // Optimistically update local state
      setGameState({
        ...gameState,
        myDeck: newOrder
      });

      // Sync with server
      socket.emit('ktd-reorder-deck', { slug, newOrder: cardIds });
    }

    setActiveCardId(null);
  };

  const handleDraftAgain = () => {
    socket.emit('ktd-draft-again', { slug });
  };

  const toggleMinimize = (cardId: string) => {
    setCardStates(prev => ({
      ...prev,
      [cardId]: {
        ...prev[cardId],
        minimized: !prev[cardId]?.minimized
      }
    }));
  };

  const toggleStack = (cardId: string) => {
    setCardStates(prev => ({
      ...prev,
      [cardId]: {
        ...prev[cardId],
        stacked: !prev[cardId]?.stacked
      }
    }));
  };

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-xl">Loading Kill Team Draft...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Kill Team Draft</h1>
        <div className="flex items-center gap-4 text-sm">
          <div>
            Pack {gameState.currentPackNumber} of {gameState.totalPacks}
          </div>
          <div>
            Passing: <span className="font-semibold">{gameState.passingDirection}</span>
          </div>
          <div>
            Phase: <span className="font-semibold capitalize">{gameState.phase}</span>
          </div>
        </div>
      </div>

      {/* Players Info */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {gameState.otherPlayers.map(player => (
          <div key={player.id} className="bg-gray-800 p-3 rounded-lg">
            <div className="font-semibold">{player.name} {player.isBot && '🤖'}</div>
            <div className="text-sm text-gray-400">
              Deck: {player.deckSize} | Queue: {player.packsInQueue}
            </div>
          </div>
        ))}
      </div>

      {/* Pack Queue Status */}
      {gameState.phase === 'drafting' && gameState.packsWaiting > 0 && (
        <div className="mb-4 bg-yellow-900/30 border border-yellow-600/50 p-3 rounded-lg">
          <div className="text-yellow-400 font-semibold">
            ⚠️ {gameState.packsWaiting} pack{gameState.packsWaiting > 1 ? 's' : ''} waiting in queue
          </div>
          <div className="text-xs text-yellow-200 mt-1">
            Select a card from your current pack to continue
          </div>
        </div>
      )}

      {/* Current Pack */}
      {gameState.phase === 'drafting' && gameState.myPack.length > 0 ? (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">
            Current Pack ({gameState.myPack.length} cards)
            {gameState.packsWaiting > 0 && (
              <span className="text-lg text-yellow-400 ml-2">
                +{gameState.packsWaiting} waiting
              </span>
            )}
          </h2>
          <PackSelection
            cards={gameState.myPack}
            onSelectCard={handleSelectCard}
          />
        </div>
      ) : gameState.phase === 'drafting' && (
        <div className="mb-8 bg-blue-900/30 border border-blue-600/50 p-6 rounded-lg text-center">
          <div className="text-xl text-blue-400 font-semibold">
            ⏳ Waiting for a pack...
          </div>
          <div className="text-sm text-blue-200 mt-2">
            Someone is still picking from the pack that will come to you
          </div>
        </div>
      )}

      {/* My Drafted Deck */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">
            My Deck ({gameState.myDeck.length} cards)
          </h2>
          <button
            onClick={() => setShowExportModal(true)}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition"
          >
            Export Deck
          </button>
        </div>

        {gameState.myDeck.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            No cards drafted yet
          </div>
        ) : (
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            onDragStart={(event) => setActiveCardId(event.active.id as string)}
          >
            <SortableContext
              items={gameState.myDeck.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {gameState.myDeck.map(card => (
                  <DraftCard
                    key={card.id}
                    card={card}
                    minimized={cardStates[card.id]?.minimized || false}
                    stacked={cardStates[card.id]?.stacked || false}
                    onToggleMinimize={() => toggleMinimize(card.id)}
                    onToggleStack={() => toggleStack(card.id)}
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeCardId ? (
                <div className="bg-blue-600 p-4 rounded-lg shadow-xl">
                  {gameState.myDeck.find(c => c.id === activeCardId)?.name}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Draft Again Button (Leader only, when finished) */}
      {gameState.phase === 'finished' && isLeader && (
        <div className="text-center">
          <button
            onClick={handleDraftAgain}
            className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg text-lg font-semibold transition"
          >
            Draft Again
          </button>
        </div>
      )}

      {/* Finished Message */}
      {gameState.phase === 'finished' && (
        <div className="bg-green-900/50 border border-green-600 p-4 rounded-lg text-center mb-8">
          <div className="text-xl font-bold">Draft Complete!</div>
          <div className="text-sm text-gray-300">
            You can still organize your deck and export it.
            {isLeader && ' As leader, you can start a new draft.'}
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <ExportDeckModal
          cards={gameState.myDeck}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
};

export default KillTeamDraftGame;
