// 1001 Game Nights - Dice Factory Game Component
// Version: 0.2.1 - Slot-based abilities with drag-and-drop
// Updated: October 2025

import React, { useState, useEffect } from 'react';
import { GameState, Die, Card } from './types';

interface DiceFactoryGameProps {
  gameState: GameState;
  socket: any;
  isLeader: boolean;
}

type AbilityName = 'recruit' | 'promote' | 'reroll' | 'bump' | 'bumpUp' | 'bumpDown' | 'setValue';

interface AbilityDef {
  name: AbilityName;
  displayName: string;
  description: string;
  costCount: number;
  needsTarget: boolean;
  needsValue: boolean;
  needsDirection?: boolean; // For bump ability
  needsAmount?: boolean; // For bumpUp/bumpDown amount selection
}

const ABILITY_DEFINITIONS: AbilityDef[] = [
  { name: 'recruit', displayName: 'Recruit', description: 'Add a new d4 to your pool', costCount: 1, needsTarget: false, needsValue: false },
  { name: 'promote', displayName: 'Promote', description: 'Upgrade die size (d4→d6→d8→d10→d12)', costCount: 1, needsTarget: true, needsValue: false },
  { name: 'reroll', displayName: 'Reroll', description: 'Reroll a die', costCount: 1, needsTarget: true, needsValue: false },
  { name: 'bump', displayName: 'Bump', description: 'Increase or decrease die value by 1', costCount: 1, needsTarget: true, needsValue: false, needsDirection: true },
  { name: 'bumpUp', displayName: 'Bump Up', description: 'Increase die value by 1-3', costCount: 2, needsTarget: true, needsValue: false, needsAmount: true },
  { name: 'bumpDown', displayName: 'Bump Down', description: 'Decrease die value by 1-3', costCount: 1, needsTarget: true, needsValue: false, needsAmount: true },
  { name: 'setValue', displayName: 'Set Value', description: 'Set die to specific value', costCount: 1, needsTarget: true, needsValue: true },
];

const DiceFactoryGame: React.FC<DiceFactoryGameProps> = ({
  gameState,
  socket,
  isLeader
}) => {
  const [message, setMessage] = useState<string>('');
  const [draggedAbility, setDraggedAbility] = useState<AbilityName | null>(null);
  const [draggedDieId, setDraggedDieId] = useState<string | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

  // Action panel state
  const [activeAbility, setActiveAbility] = useState<AbilityName | null>(null);
  const [costDice, setCostDice] = useState<string[]>([]);
  const [costCards, setCostCards] = useState<string[]>([]); // Cards used as virtual dice
  const [targetDieId, setTargetDieId] = useState<string | null>(null);
  const [targetValue, setTargetValue] = useState<string>('');
  const [bumpDirection, setBumpDirection] = useState<'up' | 'down'>('up');
  const [bumpAmount, setBumpAmount] = useState<number>(1);

  // Card buying state
  const [buyingCard, setBuyingCard] = useState<Card | null>(null);
  const [cardCostDice, setCardCostDice] = useState<string[]>([]);

  const {
    round,
    dicePool,
    gameLog,
    playerName,
    exhaustedDice,
    slots,
    availableAbilities,
    availableCards,
    playerCards,
    exhaustedCards,
    victoryPoints,
    phase
  } = gameState;

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleError = (data: { error: string }) => {
      showMessage(`Error: ${data.error}`);
    };

    socket.on('dice-factory:error', handleError);

    return () => {
      socket.off('dice-factory:error', handleError);
    };
  }, [socket]);

  // Helper to get ability definition
  const getAbilityDef = (abilityName: AbilityName): AbilityDef | undefined => {
    return ABILITY_DEFINITIONS.find(a => a.name === abilityName);
  };

  // Check if die is exhausted
  const isDieExhausted = (dieId: string): boolean => {
    return exhaustedDice.includes(dieId);
  };

  // Check if card is exhausted
  const isCardExhausted = (cardId: string): boolean => {
    return exhaustedCards.includes(cardId);
  };

  // === CARD HANDLERS ===

  const handleCardClick = (card: Card) => {
    if (buyingCard && buyingCard.id === card.id) {
      // Cancel buying
      setBuyingCard(null);
      setCardCostDice([]);
    } else {
      // Start buying this card
      setBuyingCard(card);
      setCardCostDice([]);
    }
  };

  const handleCardCostDieAdd = (dieId: string) => {
    if (buyingCard && !cardCostDice.includes(dieId)) {
      setCardCostDice([...cardCostDice, dieId]);
    }
  };

  const handleCardCostDieRemove = (dieId: string) => {
    setCardCostDice(cardCostDice.filter(id => id !== dieId));
  };

  const handleBuyCard = () => {
    if (!buyingCard) return;

    socket?.emit('dice-factory:buy-card', {
      cardId: buyingCard.id,
      costDiceIds: cardCostDice
    });

    setBuyingCard(null);
    setCardCostDice([]);
    showMessage(`Buying ${buyingCard.title}...`);
  };

  const handleCancelBuy = () => {
    setBuyingCard(null);
    setCardCostDice([]);
  };

  const handleUseCardDice = (cardId: string) => {
    socket?.emit('dice-factory:use-card-dice', { cardId });
    showMessage('Card exhausted! Use the corresponding slot now.');
  };

  // === DRAG AND DROP HANDLERS ===

  // Ability drag handlers
  const handleAbilityDragStart = (abilityName: AbilityName) => {
    setDraggedAbility(abilityName);
  };

  const handleAbilityDragEnd = () => {
    setDraggedAbility(null);
  };

  // Slot drop handlers
  const handleSlotDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSlotDrop = (e: React.DragEvent, slotNumber: number) => {
    e.preventDefault();
    if (draggedAbility) {
      socket?.emit('dice-factory:assign-slot', { slotNumber, abilityName: draggedAbility });
      setDraggedAbility(null);
      showMessage(`Assigned ${draggedAbility} to slot ${slotNumber}`);
    }
  };

  // Die drag handlers
  const handleDieDragStart = (dieId: string) => {
    setDraggedDieId(dieId);
  };

  const handleDieDragEnd = () => {
    setDraggedDieId(null);
  };

  // Card drag handlers (for using as cost)
  const handleCardDragStart = (cardId: string) => {
    setDraggedCardId(cardId);
  };

  const handleCardDragEnd = () => {
    setDraggedCardId(null);
  };

  // Cost section drop handlers
  const handleCostDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCostDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedDieId && !costDice.includes(draggedDieId)) {
      setCostDice([...costDice, draggedDieId]);
      setDraggedDieId(null);
    } else if (draggedCardId && !costCards.includes(draggedCardId)) {
      setCostCards([...costCards, draggedCardId]);
      setDraggedCardId(null);
    }
  };

  // Target section drop handlers
  const handleTargetDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleTargetDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedDieId) {
      setTargetDieId(draggedDieId);
      setDraggedDieId(null);
    }
  };

  // === ACTION HANDLERS ===

  const handleSlotClick = (slotNumber: number) => {
    const abilityName = slots[slotNumber];
    if (abilityName) {
      setActiveAbility(abilityName as AbilityName);
      setCostDice([]);
      setCostCards([]);
      setTargetDieId(null);
      setTargetValue('');
      setBumpDirection('up');
      setBumpAmount(1);
    }
  };

  const handleClearSlot = (e: React.MouseEvent, slotNumber: number) => {
    e.stopPropagation();
    socket?.emit('dice-factory:assign-slot', { slotNumber, abilityName: null });
    showMessage(`Cleared slot ${slotNumber}`);
  };

  const handleRemoveCostDie = (dieId: string) => {
    setCostDice(costDice.filter(id => id !== dieId));
  };

  const handleRemoveCostCard = (cardId: string) => {
    setCostCards(costCards.filter(id => id !== cardId));
  };

  const handleClearTarget = () => {
    setTargetDieId(null);
  };

  const handleExecuteAbility = () => {
    if (!activeAbility) return;

    const def = getAbilityDef(activeAbility);
    if (!def) return;

    // Validate total cost items (dice + cards)
    const totalCost = costDice.length + costCards.length;
    if (totalCost !== def.costCount) {
      showMessage(`${def.displayName} requires ${def.costCount} cost dice/cards`);
      return;
    }

    if (def.needsTarget && !targetDieId) {
      showMessage(`${def.displayName} requires a target die`);
      return;
    }

    if (def.needsValue && !targetValue) {
      showMessage(`${def.displayName} requires a target value`);
      return;
    }

    // Execute
    socket?.emit('dice-factory:execute-ability', {
      abilityName: activeAbility,
      costDiceIds: costDice,
      costCardIds: costCards,
      targetDieId: targetDieId,
      targetValue: targetValue ? parseInt(targetValue) : null,
      bumpDirection: bumpDirection,
      bumpAmount: bumpAmount
    });

    // Reset action panel
    setActiveAbility(null);
    setCostDice([]);
    setCostCards([]);
    setTargetDieId(null);
    setTargetValue('');
    setBumpDirection('up');
    setBumpAmount(1);
    showMessage(`Executing ${def.displayName}...`);
  };

  const handleCancelAction = () => {
    setActiveAbility(null);
    setCostDice([]);
    setCostCards([]);
    setTargetDieId(null);
    setTargetValue('');
    setBumpDirection('up');
    setBumpAmount(1);
  };

  const handleEndTurn = () => {
    socket?.emit('dice-factory:end-turn', {});
    showMessage('Ending turn...');
  };

  // Get die by ID
  const getDie = (dieId: string): Die | undefined => {
    return dicePool.find(d => d.id === dieId);
  };

  // Get card by ID
  const getCard = (cardId: string): Card | undefined => {
    return playerCards.find(c => c.id === cardId);
  };

  return (
    <div className="flex h-full bg-gray-900 text-white overflow-hidden">
      {/* Victory Overlay */}
      {phase === 'ended' && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-lg border-4 border-yellow-500 text-center">
            <h1 className="text-5xl font-bold text-yellow-500 mb-4">🎉 VICTORY! 🎉</h1>
            <p className="text-2xl mb-2">You reached {victoryPoints} Victory Points!</p>
            <p className="text-lg text-gray-400">Game completed in {round} rounds</p>
          </div>
        </div>
      )}

      {/* Left Sidebar - Player Cards */}
      <div className="w-64 bg-gray-800 border-r-2 border-gray-700 p-4 flex flex-col overflow-hidden">
        <h2 className="text-xl font-bold mb-3">Your Cards ({playerCards.length})</h2>
        <div className="text-sm text-yellow-500 font-bold mb-3">
          VP: {victoryPoints}/10
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {playerCards.map((card: Card) => {
            const exhausted = isCardExhausted(card.id);
            const hasDiceNumbers = card.effects.diceNumbers.length > 0;
            const canDrag = activeAbility && hasDiceNumbers && !exhausted;
            return (
              <div
                key={card.id}
                draggable={canDrag}
                onDragStart={() => canDrag && handleCardDragStart(card.id)}
                onDragEnd={handleCardDragEnd}
                className={`p-3 rounded border-2 transition-all ${
                  exhausted
                    ? 'bg-gray-700 border-gray-600 transform rotate-90 origin-center my-8'
                    : 'bg-blue-900 border-blue-700'
                } ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
              >
                <div className="text-sm font-bold">{card.title}</div>
                <div className="text-xs text-gray-300 mt-1">
                  {card.effects.vp > 0 && <div>+{card.effects.vp} VP</div>}
                  {hasDiceNumbers && (
                    <div className="flex items-center justify-between mt-1">
                      <span>Dice: {card.effects.diceNumbers.join(' or ')}</span>
                      {!exhausted && !activeAbility && (
                        <button
                          onClick={() => handleUseCardDice(card.id)}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                        >
                          Use
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {canDrag && (
                  <div className="text-xs text-yellow-400 mt-1">
                    Drag to cost section →
                  </div>
                )}
              </div>
            );
          })}
          {playerCards.length === 0 && (
            <div className="text-gray-500 text-sm text-center mt-4">
              No cards yet. Buy from center!
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold">Dice Factory v0.2.1 - Factory Decks</h1>
          <div className="text-lg text-gray-400 mt-1">
            Round {round} | {playerName} | <span className="text-yellow-500 font-bold">VP: {victoryPoints}/10</span>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Buy cards, assign abilities to slots, reach 10 VP to win!
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className="mb-3 p-2 bg-blue-600 rounded text-sm">
            {message}
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Dice Pool */}
          <div className="p-4 bg-gray-800 rounded-lg">
            <h2 className="text-xl font-bold mb-3">Dice Pool ({dicePool.length} dice)</h2>
            <div className="flex flex-wrap gap-3">
              {dicePool.map((die: Die) => {
                const isExhausted = isDieExhausted(die.id);
                return (
                  <div
                    key={die.id}
                    draggable={!isExhausted}
                    onDragStart={() => handleDieDragStart(die.id)}
                    onDragEnd={handleDieDragEnd}
                    className={`px-6 py-3 rounded-lg font-mono text-xl border-2 transition-all ${
                      isExhausted
                        ? 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-700 hover:bg-gray-600 border-gray-600 cursor-grab active:cursor-grabbing'
                    }`}
                    title={isExhausted ? 'Exhausted (used this turn)' : 'Drag to use'}
                  >
                    d{die.size}: {die.value}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Available Cards from Decks */}
          <div className="p-4 bg-gray-800 rounded-lg">
            <h2 className="text-xl font-bold mb-3">Factory Cards ({availableCards.length} available)</h2>
            {/* Sort cards by deck and display in 3 rows */}
            <div className="space-y-3">
              {[1, 2, 3].map(deckNum => {
                const deckCards = availableCards.filter((c: Card) => c.deckSource === deckNum);
                return (
                  <div key={deckNum}>
                    <div className="text-xs text-gray-400 mb-1">Deck {deckNum}</div>
                    <div className="grid grid-cols-4 gap-3">
                      {deckCards.map((card: Card) => {
                        const isBuying = buyingCard && buyingCard.id === card.id;
                        return (
                          <div
                            key={card.id}
                            onClick={() => handleCardClick(card)}
                            className={`p-3 rounded border-2 cursor-pointer transition-all ${
                              isBuying
                                ? 'bg-green-800 border-green-500 shadow-lg'
                                : 'bg-gray-700 border-gray-600 hover:border-gray-500'
                            }`}
                          >
                            <div className="text-sm font-bold mb-2">{card.title}</div>
                            <div className="text-xs text-yellow-500 mb-2">
                              Cost: {card.cost.join(', ')}
                            </div>
                            <div className="text-xs text-gray-300">
                              {card.effects.vp > 0 && <div className="text-yellow-500">+{card.effects.vp} VP</div>}
                              {card.effects.diceNumbers.length > 0 && (
                                <div className="text-blue-400">Dice: {card.effects.diceNumbers.join(' or ')}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card Buying Panel */}
          {buyingCard && (
            <div className="p-4 bg-green-900 rounded-lg border-2 border-green-500">
              <h2 className="text-xl font-bold mb-3">Buying: {buyingCard.title}</h2>
              <div className="text-sm text-gray-300 mb-4">
                Required cost: {buyingCard.cost.join(', ')}
              </div>
              <div className="mb-4">
                <div className="text-sm font-bold mb-2">
                  Select Dice to Pay ({cardCostDice.length}/{buyingCard.cost.length})
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {dicePool.filter(die => !isDieExhausted(die.id)).map(die => {
                    const selected = cardCostDice.includes(die.id);
                    return (
                      <button
                        key={die.id}
                        onClick={() =>
                          selected
                            ? handleCardCostDieRemove(die.id)
                            : handleCardCostDieAdd(die.id)
                        }
                        className={`px-4 py-2 rounded font-mono ${
                          selected
                            ? 'bg-yellow-600 border-2 border-yellow-400'
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        d{die.size}: {die.value}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleBuyCard}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded font-bold"
                >
                  Buy Card
                </button>
                <button
                  onClick={handleCancelBuy}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Action Panel (appears when ability clicked) */}
          {activeAbility && (() => {
            const def = getAbilityDef(activeAbility);
            if (!def) return null;

            return (
              <div className="p-4 bg-purple-900 rounded-lg border-2 border-purple-500">
                <h2 className="text-xl font-bold mb-3">
                  Executing: {def.displayName}
                </h2>
                <div className="text-sm text-gray-300 mb-4">{def.description}</div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Cost Section */}
                  <div
                    onDragOver={handleCostDragOver}
                    onDrop={handleCostDrop}
                    className="p-4 bg-gray-800 rounded border-2 border-dashed border-yellow-500 min-h-[120px]"
                  >
                    <div className="text-sm font-bold mb-2">
                      Cost ({costDice.length + costCards.length}/{def.costCount} items)
                    </div>
                    <div className="text-xs text-gray-400 mb-2">Drag dice or cards here</div>
                    <div className="flex flex-wrap gap-2">
                      {costDice.map(dieId => {
                        const die = getDie(dieId);
                        if (!die) return null;
                        return (
                          <div
                            key={dieId}
                            className="px-3 py-2 bg-yellow-700 rounded text-sm font-mono relative"
                          >
                            d{die.size}: {die.value}
                            <button
                              onClick={() => handleRemoveCostDie(dieId)}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                      {costCards.map(cardId => {
                        const card = getCard(cardId);
                        if (!card) return null;
                        return (
                          <div
                            key={cardId}
                            className="px-3 py-2 bg-blue-700 rounded text-sm relative"
                          >
                            <div className="font-bold text-xs">{card.title}</div>
                            <div className="text-xs">Dice: {card.effects.diceNumbers.join('/')}</div>
                            <button
                              onClick={() => handleRemoveCostCard(cardId)}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Target Section */}
                  {def.needsTarget && (
                    <div
                      onDragOver={handleTargetDragOver}
                      onDrop={handleTargetDrop}
                      className="p-4 bg-gray-800 rounded border-2 border-dashed border-green-500 min-h-[120px]"
                    >
                      <div className="text-sm font-bold mb-2">Target Die</div>
                      <div className="text-xs text-gray-400 mb-2">Drag die here</div>
                      {targetDieId ? (() => {
                        const die = getDie(targetDieId);
                        if (!die) return null;
                        return (
                          <div className="px-3 py-2 bg-green-700 rounded text-sm font-mono inline-block relative">
                            d{die.size}: {die.value}
                            <button
                              onClick={handleClearTarget}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })() : (
                        <div className="text-gray-500 text-sm">No target</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Target Value Input (for setValue) */}
                {def.needsValue && (
                  <div className="mb-4">
                    <label className="text-sm font-bold mb-1 block">Target Value</label>
                    <input
                      type="number"
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      placeholder="Enter value"
                      className="w-32 px-3 py-2 bg-gray-700 rounded text-white"
                    />
                  </div>
                )}

                {/* Direction Selector (for bump) */}
                {def.needsDirection && (
                  <div className="mb-4">
                    <label className="text-sm font-bold mb-2 block">Direction</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBumpDirection('up')}
                        className={`px-4 py-2 rounded font-semibold ${
                          bumpDirection === 'up'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        ↑ Up
                      </button>
                      <button
                        onClick={() => setBumpDirection('down')}
                        className={`px-4 py-2 rounded font-semibold ${
                          bumpDirection === 'down'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        ↓ Down
                      </button>
                    </div>
                  </div>
                )}

                {/* Amount Selector (for bumpUp/bumpDown) */}
                {def.needsAmount && (
                  <div className="mb-4">
                    <label className="text-sm font-bold mb-2 block">Amount to Shift</label>
                    <div className="flex gap-2">
                      {[1, 2, 3].map(amount => (
                        <button
                          key={amount}
                          onClick={() => setBumpAmount(amount)}
                          className={`px-4 py-2 rounded font-semibold ${
                            bumpAmount === amount
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          {amount}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleExecuteAbility}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded font-bold"
                  >
                    Done (Execute)
                  </button>
                  <button
                    onClick={handleCancelAction}
                    className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            );
          })()}

          {/* End Turn Button */}
          <div className="p-4 bg-gray-800 rounded-lg">
            <button
              onClick={handleEndTurn}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded font-bold text-lg w-full"
            >
              End Turn (Reroll All &amp; Refresh)
            </button>
          </div>

          {/* Game Log */}
          <div className="p-4 bg-gray-800 rounded-lg">
            <h3 className="text-lg font-bold mb-2">Game Log</h3>
            <div className="max-h-48 overflow-y-auto text-sm space-y-1">
              {gameLog.slice(-20).reverse().map((log, idx) => (
                <div key={idx} className="text-gray-300">
                  <span className="text-gray-500">R{log.round}:</span> {log.message}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Slots & Abilities */}
      <div className="w-80 bg-gray-800 border-l-2 border-gray-700 p-4 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Slots Section */}
          <div>
            <h2 className="text-xl font-bold mb-3">Slots</h2>
            <div className="text-xs text-gray-400 mb-3">
              Drag abilities here, then click to use
            </div>
            <div className="space-y-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(slotNum => {
                const assignedAbility = slots[slotNum];
                const def = assignedAbility ? getAbilityDef(assignedAbility as AbilityName) : null;
                return (
                  <div
                    key={slotNum}
                    onDragOver={handleSlotDragOver}
                    onDrop={(e) => handleSlotDrop(e, slotNum)}
                    onClick={() => assignedAbility && handleSlotClick(slotNum)}
                    className={`p-2 rounded border-2 border-dashed min-h-[50px] flex items-center justify-between ${
                      assignedAbility
                        ? 'bg-blue-700 border-blue-500 cursor-pointer hover:bg-blue-600'
                        : 'bg-gray-700 border-gray-600'
                    }`}
                  >
                    <div className="text-sm text-gray-400 font-bold w-12">Slot {slotNum}</div>
                    {assignedAbility && def ? (
                      <div className="flex-1 flex items-center justify-center relative">
                        <div className="text-sm font-semibold">{def.displayName}</div>
                        <button
                          onClick={(e) => handleClearSlot(e, slotNum)}
                          className="absolute right-0 text-xs text-red-400 hover:text-red-300"
                          title="Clear slot"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 text-xs text-gray-500 text-center">Empty</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Available Abilities Section */}
          <div>
            <h2 className="text-xl font-bold mb-3">Available Abilities</h2>
            <div className="text-xs text-gray-400 mb-3">
              Drag to slots to assign
            </div>
            <div className="space-y-2">
              {ABILITY_DEFINITIONS.map(def => (
                <div
                  key={def.name}
                  draggable
                  onDragStart={() => handleAbilityDragStart(def.name)}
                  onDragEnd={handleAbilityDragEnd}
                  className="p-3 bg-blue-600 hover:bg-blue-700 rounded cursor-grab active:cursor-grabbing"
                >
                  <div className="font-bold">{def.displayName}</div>
                  <div className="text-xs text-gray-300">{def.description}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Cost: {def.costCount} dice{def.needsTarget && ' | Needs target'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiceFactoryGame;
