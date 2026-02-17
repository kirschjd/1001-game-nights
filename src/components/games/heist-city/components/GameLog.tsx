import React, { useRef, useEffect } from 'react';

export interface LogEntry {
  id: string;
  timestamp: number;
  type: 'dice-roll' | 'ai-action' | 'ai-plan' | 'npc-action';
  playerName: string;
  // dice-roll fields (existing)
  dice1?: number;
  dice2?: number;
  total?: number;
  // ai-action fields
  characterName?: string;
  actionName?: string;
  targetName?: string;
  result?: string;
  // ai-plan fields
  reasoning?: string;
  // npc-action fields
  npcType?: string;
  npcActionDesc?: string;
}

interface GameLogProps {
  entries: LogEntry[];
}

const GameLog: React.FC<GameLogProps> = ({ entries }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [entries]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <h3 className="text-sm font-bold text-white mb-3">Game Log</h3>

      <div ref={scrollContainerRef} className="space-y-2 max-h-40 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="text-xs text-gray-500 italic">No activity yet</div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="text-xs text-gray-300 pb-2 border-b border-gray-700 last:border-b-0">
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-white">{entry.playerName}</span>
                <span className="text-gray-500 text-[10px]">{formatTime(entry.timestamp)}</span>
              </div>
              {entry.type === 'dice-roll' && (
                <div className="text-gray-400">
                  Rolled 2d6: <span className="text-white font-mono">{entry.dice1}</span> + <span className="text-white font-mono">{entry.dice2}</span> = <span className="text-purple-400 font-semibold">{entry.total}</span>
                </div>
              )}
              {entry.type === 'ai-action' && (
                <div className="text-gray-400">
                  <span className="text-cyan-400 text-[10px] font-semibold mr-1">AI</span>
                  <span className="text-white">{entry.characterName}</span>: {entry.actionName}
                  {entry.targetName && <span> → {entry.targetName}</span>}
                  {entry.result && (
                    <span className={entry.result.toLowerCase().includes('miss') || entry.result.toLowerCase().includes('fail') ? 'text-red-400 ml-1' : 'text-green-400 ml-1'}>
                      {entry.result}
                    </span>
                  )}
                </div>
              )}
              {entry.type === 'ai-plan' && (
                <div className="text-gray-500 italic text-[10px]">
                  <span className="text-cyan-400 font-semibold not-italic mr-1">AI</span>
                  {entry.reasoning}
                </div>
              )}
              {entry.type === 'npc-action' && (
                <div className="text-gray-400">
                  <span className="text-orange-400 text-[10px] font-semibold mr-1">NPC</span>
                  <span className="text-white">{entry.npcType}</span>: {entry.npcActionDesc}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GameLog;
