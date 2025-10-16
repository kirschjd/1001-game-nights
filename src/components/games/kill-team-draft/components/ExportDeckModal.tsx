import React, { useState } from 'react';

interface Card {
  id: string;
  name: string;
  letter: string;
  number: number;
}

interface Props {
  cards: Card[];
  onClose: () => void;
}

const ExportDeckModal: React.FC<Props> = ({ cards, onClose }) => {
  const [copied, setCopied] = useState(false);

  const deckText = cards.map(card => card.name).join('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(deckText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Export Deck</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <div className="text-sm text-gray-400 mb-2">
            {cards.length} cards total
          </div>
          <textarea
            readOnly
            value={deckText}
            className="w-full h-64 bg-gray-900 text-white p-4 rounded font-mono text-sm"
            onClick={(e) => e.currentTarget.select()}
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleCopy}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
              copied
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {copied ? '✓ Copied!' : 'Copy to Clipboard'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDeckModal;
