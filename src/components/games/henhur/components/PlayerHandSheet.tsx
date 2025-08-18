import React, { useState } from 'react';

// Placeholder hand data for demo
const demoHand = [
  { id: 1, label: 'Card A' },
  { id: 2, label: 'Card B' },
  { id: 3, label: 'Card C' }
];

const PlayerHandSheet: React.FC = () => {
  const [open, setOpen] = useState(true);

  return (
    <>
      <button
        className="fixed bg-amber-400 text-white px-2 py-1 rounded-full shadow-lg focus:outline-none"
        style={{ right: '20px', bottom: open ? '120px' : '12px', zIndex: 9999 }}
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Hide hand sheet' : 'Show hand sheet'}
      >
        {open ? '▼' : '▲'}
      </button>
      <div
        className={`fixed left-0 right-0 bottom-0 bg-white border-t-4 border-amber-400 shadow-lg z-50 p-4 flex flex-row items-center justify-center gap-4 transition-transform duration-300 ${open ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ transform: open ? 'translateY(0)' : 'translateY(100%)' }}
      >
        {demoHand.map(card => (
          <div key={card.id} className="w-20 h-32 border-2 border-gray-400 rounded-lg flex items-center justify-center bg-amber-50 shadow-md">
            <span className="text-lg font-bold text-amber-700">{card.label}</span>
          </div>
        ))}
      </div>
    </>
  );
};

export default PlayerHandSheet;
