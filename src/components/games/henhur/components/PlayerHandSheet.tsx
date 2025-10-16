import React, { useState } from 'react';

interface Card {
  id: string;
  title: string;
  description: string;
  priority: number;
  trickNumber: number;
  raceNumber: number;
  deckType: string;
  effect?: any[];
  burnEffect?: any[];
}

interface PlayerHandSheetProps {
  hand: Card[];
}

const PlayerHandSheet: React.FC<PlayerHandSheetProps> = ({ hand: initialHand = [] }) => {
  const [open, setOpen] = useState(true);
  const [hand, setHand] = useState<Card[]>(initialHand);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoverTimeoutId, setHoverTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Update hand when prop changes
  React.useEffect(() => {
    setHand(initialHand);
  }, [initialHand]);

  // Cleanup hover timeout on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutId) {
        clearTimeout(hoverTimeoutId);
      }
    };
  }, [hoverTimeoutId]);

  const handleCardClick = (cardId: string) => {
    setSelectedCardId(selectedCardId === cardId ? null : cardId);
  };

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    setDraggedCardId(cardId);
    e.dataTransfer.effectAllowed = 'move';
    // Clear any pending hover preview when dragging starts
    if (hoverTimeoutId) {
      clearTimeout(hoverTimeoutId);
      setHoverTimeoutId(null);
    }
    setHoveredCardId(null);
    setHoverPosition(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetCardId: string) => {
    e.preventDefault();

    if (!draggedCardId || draggedCardId === targetCardId) {
      setDraggedCardId(null);
      return;
    }

    const newHand = [...hand];
    const draggedIndex = newHand.findIndex(c => c.id === draggedCardId);
    const targetIndex = newHand.findIndex(c => c.id === targetCardId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const [draggedCard] = newHand.splice(draggedIndex, 1);
      newHand.splice(targetIndex, 0, draggedCard);
      setHand(newHand);
    }

    setDraggedCardId(null);
  };

  const handleMouseEnter = (e: React.MouseEvent, cardId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();

    // Clear any existing timeout
    if (hoverTimeoutId) {
      clearTimeout(hoverTimeoutId);
    }

    // Set a delay of 500ms before showing the preview
    const timeoutId = setTimeout(() => {
      setHoveredCardId(cardId);
      setHoverPosition({
        x: rect.left + rect.width / 2,
        y: rect.top
      });
    }, 500);

    setHoverTimeoutId(timeoutId);
  };

  const handleMouseLeave = () => {
    // Clear timeout if user moves mouse away before delay completes
    if (hoverTimeoutId) {
      clearTimeout(hoverTimeoutId);
      setHoverTimeoutId(null);
    }
    setHoveredCardId(null);
    setHoverPosition(null);
  };

  const hoveredCard = hand.find(c => c.id === hoveredCardId);

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

      {/* Hover Preview Card */}
      {hoveredCard && hoverPosition && (
        <div
          className="fixed pointer-events-none z-[9999]"
          style={{
            left: `${hoverPosition.x}px`,
            top: `${hoverPosition.y - 320}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="w-64 h-96 border-4 border-amber-500 rounded-xl bg-gradient-to-br from-amber-50 to-white shadow-2xl p-4 flex flex-col">
            <div className="font-bold text-amber-900 text-2xl mb-2">{hoveredCard.title}</div>

            <div className="flex gap-2 mb-3">
              <span className="px-2 py-1 bg-amber-300 text-amber-900 rounded font-semibold text-sm">
                P{hoveredCard.priority}
              </span>
              <span className="px-2 py-1 bg-amber-300 text-amber-900 rounded font-semibold text-sm">
                T{hoveredCard.trickNumber}
              </span>
              <span className="px-2 py-1 bg-amber-300 text-amber-900 rounded font-semibold text-sm">
                R{hoveredCard.raceNumber}
              </span>
            </div>

            <div className="text-sm text-gray-700 mb-3 flex-1">
              <p className="leading-relaxed">{hoveredCard.description}</p>
            </div>

            {hoveredCard.effect && hoveredCard.effect.length > 0 && (
              <div className="mb-2">
                <div className="text-xs font-semibold text-amber-800 mb-1">Effects:</div>
                <div className="text-xs text-gray-600 bg-amber-100/50 rounded p-2">
                  {hoveredCard.effect.length} effect{hoveredCard.effect.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}

            {hoveredCard.burnEffect && hoveredCard.burnEffect.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-red-700 mb-1">🔥 Burn Effect:</div>
                <div className="text-xs text-gray-600 bg-red-100/50 rounded p-2">
                  {hoveredCard.burnEffect.length} effect{hoveredCard.burnEffect.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}

            <div className="mt-auto pt-2 border-t border-amber-300">
              <span className="text-xs font-semibold text-amber-700 uppercase">
                {hoveredCard.deckType === 'base' ? 'Base' :
                 hoveredCard.deckType === 'lap1' ? 'Lap 1' :
                 hoveredCard.deckType === 'lap2' ? 'Lap 2' : 'Lap 3'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div
        className={`fixed left-0 right-0 bottom-0 bg-white border-t-4 border-amber-400 shadow-lg z-50 p-4 flex flex-row items-center justify-center gap-4 transition-transform duration-300 overflow-x-auto ${open ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ transform: open ? 'translateY(0)' : 'translateY(100%)' }}
      >
        {hand.length === 0 ? (
          <div className="text-gray-500 text-sm py-4">No cards in hand</div>
        ) : (
          hand.map((card, index) => {
            const isSelected = selectedCardId === card.id;
            const isDragging = draggedCardId === card.id;

            return (
              <div
                key={card.id}
                draggable
                onDragStart={(e) => handleDragStart(e, card.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, card.id)}
                onClick={() => handleCardClick(card.id)}
                onMouseEnter={(e) => handleMouseEnter(e, card.id)}
                onMouseLeave={handleMouseLeave}
                className={`w-32 h-44 border-2 rounded-lg bg-amber-50 shadow-md p-2 flex flex-col flex-shrink-0 transition-all cursor-grab active:cursor-grabbing
                  ${isSelected ? 'border-amber-600 ring-2 ring-amber-400 shadow-xl' : 'border-amber-400'}
                  ${isDragging ? 'opacity-50' : 'opacity-100'}
                  hover:border-amber-600 hover:shadow-lg hover:-translate-y-2`}
              >
                <div className="font-bold text-amber-800 text-sm mb-1 truncate">{card.title}</div>
                <div className="text-xs text-gray-600 flex-1 overflow-hidden line-clamp-4">
                  {card.description}
                </div>
                <div className="flex gap-1 mt-2 text-xs">
                  <span className="px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded">
                    P{card.priority}
                  </span>
                  <span className="px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded">
                    T{card.trickNumber}
                  </span>
                  <span className="px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded">
                    R{card.raceNumber}
                  </span>
                </div>
                {isSelected && (
                  <div className="mt-1 text-center">
                    <div className="w-full h-1 bg-amber-500 rounded"></div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
};

export default PlayerHandSheet;
