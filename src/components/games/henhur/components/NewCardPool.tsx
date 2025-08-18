import React from 'react';

const cardSlotStyle =
  'w-20 h-32 border-2 border-gray-400 rounded-lg flex flex-col items-center justify-center mx-2 bg-white shadow-md relative';

const NewCardPool: React.FC = () => {
  return (
    <div className="flex flex-row items-end justify-center mb-6">
      {/* Discard slot */}
      <div className={cardSlotStyle}>
        <span className="absolute top-1 left-1 text-xs text-gray-500 font-bold">discard</span>
      </div>
      {/* Deck slot */}
      <div className={cardSlotStyle}>
        <span className="absolute top-1 left-1 text-xs text-gray-500 font-bold">deck</span>
      </div>
      {/* 3 empty slots */}
      {[0, 1, 2].map((i) => (
        <div key={i} className={cardSlotStyle}></div>
      ))}
    </div>
  );
};

export default NewCardPool;
