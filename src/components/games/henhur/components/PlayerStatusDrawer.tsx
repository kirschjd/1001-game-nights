import React, { useState } from 'react';

// Placeholder data for other players
const otherPlayers = [
  { id: 'p2', name: 'Alice', status: 'Ready', handSize: 3 },
  { id: 'p3', name: 'Bob', status: 'Waiting', handSize: 2 },
  { id: 'p4', name: 'Carol', status: 'Playing', handSize: 4 }
];

const PlayerStatusDrawer: React.FC = () => {
  const [open, setOpen] = useState(true);

  return (
    <>
      <div
        className={`fixed right-0 w-64 bg-white border-l-4 border-amber-400 shadow-lg z-0 flex flex-col p-4 transition-transform duration-300`}
        style={{ top: '72px', height: 'calc(100vh - 72px)', transform: open ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <button
          className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-full z-0 bg-amber-400 text-white px-2 py-2 rounded-l-lg shadow-lg focus:outline-none"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Hide player drawer' : 'Show player drawer'}
        >
          {open ? '→' : '←'}
        </button>
        <h3 className="text-xl font-bold text-amber-700 mb-4">Players</h3>
        <div className="flex-1 flex flex-col gap-4">
          {otherPlayers.map(player => (
            <div key={player.id} className="border-b pb-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-800">{player.name}</span>
                <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 border border-amber-300">{player.status}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">Hand: {player.handSize} cards</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default PlayerStatusDrawer;
