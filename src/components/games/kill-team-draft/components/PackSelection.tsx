import React from 'react';

interface Card {
  id: string;
  name: string;
  letter: string;
  number: number;
}

interface Props {
  cards: Card[];
  onSelectCard: (cardId: string) => void;
}

const PackSelection: React.FC<Props> = ({ cards, onSelectCard }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {cards.map(card => (
        <button
          key={card.id}
          onClick={() => onSelectCard(card.id)}
          className="bg-gradient-to-br from-blue-700 to-blue-900 p-6 rounded-lg border-2 border-blue-500 hover:border-blue-300 hover:scale-105 transition-all cursor-pointer"
        >
          <div className="text-2xl font-bold mb-2">{card.name}</div>
          <div className="text-sm text-blue-200">
            {card.letter} • {card.number}
          </div>
        </button>
      ))}
    </div>
  );
};

export default PackSelection;
