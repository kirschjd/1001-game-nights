import React from 'react';

interface WarRulesProps {
  selectedVariant: string;
  gameColorClasses: string;
}

const WarRules: React.FC<WarRulesProps> = ({ selectedVariant, gameColorClasses }) => {
  return (
    <div className={`p-6 rounded-lg border ${gameColorClasses}`}>
      <h2 className="text-2xl font-bold mb-4 text-tea-rose">
        {selectedVariant === 'aces-high' ? 'Aces High War' : 'Regular War'}
      </h2>

      <div className="space-y-4 text-gray-300">
        <p className="text-lg">
          A strategic card game where timing and nerve determine victory.
          Choose your battles wisely!
        </p>

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">How to Play</h3>
          <ol className="space-y-2 text-sm">
            <li><strong>1.</strong> Each round, every player receives one random card (Ace to King)</li>
            <li><strong>2.</strong> Players simultaneously choose to either <span className="text-green-400">Play</span> or <span className="text-red-400">Fold</span></li>
            <li><strong>3.</strong> If you <span className="text-red-400">Fold</span>: You automatically lose 1 point (safe option)</li>
            <li><strong>4.</strong> If you <span className="text-green-400">Play</span>: Your card competes with other players who played</li>
            <li><strong>5.</strong> <strong>Winner:</strong> Highest card gets +1 point, all others who played get -1 point</li>
            <li><strong>6.</strong> <strong>Victory:</strong> First player to reach 5 points wins the game!</li>
          </ol>
        </div>

        {selectedVariant === 'aces-high' && (
          <div className="p-3 bg-tea-rose/20 border border-tea-rose/40 rounded">
            <h4 className="font-semibold text-tea-rose mb-1">Aces High Special Rule</h4>
            <p className="text-sm">
              In this variant, <strong>Aces always win</strong> regardless of other cards played.
              If multiple players play Aces, it's a tie with no points awarded.
            </p>
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Game Info</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Players:</strong> 2-8 players</div>
            <div><strong>Duration:</strong> 5-10 minutes</div>
            <div><strong>Difficulty:</strong> Easy</div>
            <div><strong>Strategy:</strong> Risk vs Reward</div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Bot Opponents</h3>
          <div className="space-y-1 text-sm">
            <div><strong>Random:</strong> Makes unpredictable decisions (70% play rate)</div>
            <div><strong>Always Play:</strong> Never folds, always commits to the round</div>
            <div><strong>Conservative:</strong> Only plays with strong cards (9+, Aces)</div>
            <div><strong>Aggressive:</strong> Takes risks, plays most hands regardless</div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Strategy Tips</h3>
          <ul className="space-y-1 text-sm">
            <li>• <strong>Fold</strong> with low cards (2-6) to minimize losses</li>
            <li>• <strong>Play</strong> confidently with high cards (10-King)</li>
            <li>• Consider the risk: losing 1 point vs potentially losing more</li>
            <li>• Watch opponent patterns - some players are more aggressive</li>
            <li>• In Aces High: Always play Aces, they can't lose!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WarRules;
