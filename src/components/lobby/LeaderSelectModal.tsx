import React from 'react';

interface Player {
  id: string;
  name: string;
  isConnected: boolean;
}

interface LeaderSelectModalProps {
  isOpen: boolean;
  players: Player[];
  onSelectLeader: (playerId: string) => void;
  onClose: () => void;
}

const LeaderSelectModal: React.FC<LeaderSelectModalProps> = ({
  isOpen,
  players,
  onSelectLeader,
  onClose,
}) => {
  if (!isOpen) return null;

  const connectedPlayers = players.filter(p => p.isConnected);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-payne-grey p-6 rounded-xl max-w-md w-full mx-4 border border-payne-grey-light">
        <h2 className="text-xl font-bold mb-4 text-lion-light">Select New Leader</h2>
        <div className="space-y-2 mb-4">
          {connectedPlayers.map((player) => (
            <button
              key={player.id}
              onClick={() => onSelectLeader(player.id)}
              className="w-full text-left p-3 bg-payne-grey-light hover:bg-lion/20 rounded-lg transition-colors text-white border border-payne-grey-light"
            >
              {player.name}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full bg-payne-grey-dark hover:bg-payne-grey text-white py-2 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default LeaderSelectModal;
