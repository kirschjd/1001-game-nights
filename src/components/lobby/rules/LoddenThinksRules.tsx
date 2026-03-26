import React from 'react';

interface LoddenThinksRulesProps {
  gameColorClasses: string;
}

const LoddenThinksRules: React.FC<LoddenThinksRulesProps> = ({ gameColorClasses }) => {
  return (
    <div className={`p-6 rounded-lg border ${gameColorClasses}`}>
      <h2 className="text-2xl font-bold mb-4 text-amber-400">Lodden Thinks</h2>

      <div className="space-y-4 text-gray-300">
        <p className="text-lg">
          A social guessing game where the <strong className="text-amber-300">Lodden</strong> secretly picks a number
          and two <strong className="text-blue-300">Bettors</strong> bid on whether it's above or below.
          The skill is reading the Lodden, not knowing the "right" answer.
        </p>

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Game Info</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Players:</strong> 3+ players</div>
            <div><strong>Type:</strong> Social / Bluffing</div>
            <div><strong>Roles:</strong> Lodden, Bettor A, Bettor B</div>
            <div><strong>Rounds:</strong> As many as you like</div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Round Flow</h3>
          <ol className="space-y-2 text-sm">
            <li><strong>1. Setup</strong> — Roles are assigned: one Lodden, two Bettors. Extra players are Spectators.</li>
            <li><strong>2. Question</strong> — A numerical question is posed (e.g. "How many countries has [Lodden] visited?").</li>
            <li><strong>3. Lock-In</strong> — The Lodden secretly enters their answer. Nobody else sees it.</li>
            <li><strong>4. Bidding</strong> — Bettor A opens with any number. Bettors alternate: bid higher or take the under.</li>
            <li><strong>5. Reveal</strong> — The Lodden's number is revealed. The winner is determined.</li>
          </ol>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Bidding Rules</h3>
          <ul className="space-y-1 text-sm">
            <li>• Bettor A opens by naming any number (no "take under" option on the first turn).</li>
            <li>• Each subsequent bid must be strictly higher than the previous (+1 minimum).</li>
            <li>• <strong>Take the Under</strong> means you believe the Lodden's number is <em>below</em> the current bid.</li>
            <li>• Bidding ends when someone takes the under.</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Winning</h3>
          <ul className="space-y-1 text-sm">
            <li>• Lodden's number <strong>&lt; final bid</strong> → Under Bettor wins</li>
            <li>• Lodden's number <strong>≥ final bid</strong> → Over Bettor wins (exact match = over wins)</li>
            <li>• The Lodden does not score — they're the subject, not a competitor.</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Spectators</h3>
          <ul className="space-y-1 text-sm">
            <li>• During bidding, spectators can predict which side (over or under) will win.</li>
            <li>• Correct predictions earn a Spectator Correct point.</li>
            <li>• You can change your prediction until bidding ends.</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Scoring</h3>
          <ul className="space-y-1 text-sm">
            <li>• <strong className="text-amber-300">Bettor Wins</strong> — won as a bettor (core skill: reading the Lodden)</li>
            <li>• <strong className="text-blue-300">Spectator Correct</strong> — correctly predicted the outcome as a spectator</li>
            <li>• Roles rotate each round so everyone takes a turn as Lodden and Bettor.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LoddenThinksRules;
