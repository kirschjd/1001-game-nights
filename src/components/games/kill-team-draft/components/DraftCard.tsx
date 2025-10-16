import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Card {
  id: string;
  name: string;
  letter: string;
  number: number;
}

interface Props {
  card: Card;
  minimized: boolean;
  stacked: boolean;
  onToggleMinimize: () => void;
  onToggleStack: () => void;
}

const DraftCard: React.FC<Props> = ({ card, minimized, stacked, onToggleMinimize, onToggleStack }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  if (minimized) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-gray-700 p-2 rounded cursor-pointer hover:bg-gray-600 transition"
        onClick={onToggleMinimize}
      >
        <div className="text-xs font-mono">{card.name}</div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-gradient-to-br from-gray-700 to-gray-800 p-4 rounded-lg border-2 border-gray-600 cursor-move hover:border-blue-500 transition ${
        stacked ? 'shadow-xl ring-2 ring-yellow-500' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="text-2xl font-bold">{card.name}</div>
        <div className="flex gap-1" style={{ touchAction: 'none' }}>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleMinimize();
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            className="text-xs bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded cursor-pointer"
            title="Minimize"
          >
            −
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleStack();
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            className={`text-xs px-2 py-1 rounded cursor-pointer ${
              stacked ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-gray-600 hover:bg-gray-500'
            }`}
            title="Stack/Highlight"
          >
            ★
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-400">
        Letter: {card.letter} | Number: {card.number}
      </div>
    </div>
  );
};

export default DraftCard;
