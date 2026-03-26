// 1001 Game Nights - Dice Factory Game Component
// Version: 3.0.0 - Fresh rewrite

import React from 'react';
import { Socket } from 'socket.io-client';
import { DiceFactoryGameState } from './types/DiceFactoryTypes';

interface DiceFactoryGameProps {
  socket: Socket;
  gameState: DiceFactoryGameState;
  currentPlayerId: string;
}

const DiceFactoryGame: React.FC<DiceFactoryGameProps> = ({
  socket: _socket,
  gameState,
  currentPlayerId: _currentPlayerId,
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-white">
      <h1 className="text-3xl font-bold mb-4">Dice Factory</h1>
      <p className="text-gray-400">v{gameState?.version ?? '3.0.0'} — Under construction</p>
    </div>
  );
};

export default DiceFactoryGame;
