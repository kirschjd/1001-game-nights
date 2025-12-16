import React from 'react';

interface KillTeamDraftRulesProps {
  gameColorClasses: string;
}

const KillTeamDraftRules: React.FC<KillTeamDraftRulesProps> = ({ gameColorClasses }) => {
  return (
    <div className={`p-6 rounded-lg border ${gameColorClasses}`}>
      <h2 className="text-2xl font-bold mb-4 text-uranian-blue">Kill Team Draft</h2>

      <div className="space-y-4 text-gray-300">
        <p className="text-lg">
          A classic card drafting game where players build their deck by selecting cards from rotating packs.
          Perfect for strategic deck building!
        </p>

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">How to Play</h3>
          <ol className="space-y-2 text-sm">
            <li><strong>1.</strong> Each player receives a pack of cards</li>
            <li><strong>2.</strong> Select one card from your current pack to add to your deck</li>
            <li><strong>3.</strong> Pass the remaining cards to the next player</li>
            <li><strong>4.</strong> Repeat until all packs are empty</li>
            <li><strong>5.</strong> New packs are distributed and the direction alternates (right → left → right)</li>
            <li><strong>6.</strong> Continue until all rounds are complete</li>
          </ol>
        </div>

        <div className="p-3 bg-blue-900/20 border border-blue-600/40 rounded">
          <h4 className="font-semibold text-blue-400 mb-1">Pipeline Drafting</h4>
          <p className="text-sm">
            Packs move independently! You don't wait for everyone - as soon as you pick a card,
            the pack passes to the next player. If you're slow, packs will queue up for you.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Game Info</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Players:</strong> 2-8 players</div>
            <div><strong>Duration:</strong> 10-20 minutes</div>
            <div><strong>Difficulty:</strong> Easy</div>
            <div><strong>Strategy:</strong> Deck Building</div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Features</h3>
          <ul className="space-y-1 text-sm">
            <li>• <strong>Configurable:</strong> Adjust pack size (3-30 cards) and number of packs (1-10)</li>
            <li>• <strong>Organize:</strong> Drag and drop to reorder your drafted cards</li>
            <li>• <strong>Export:</strong> Copy your deck as plain text when finished</li>
            <li>• <strong>Draft Again:</strong> Start a fresh draft with the same players</li>
            <li>• <strong>Bot Support:</strong> Add bots that draft randomly</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Tips</h3>
          <ul className="space-y-1 text-sm">
            <li>• Draft quickly to keep packs flowing smoothly</li>
            <li>• Watch what cards get passed to you - it reveals what others are picking</li>
            <li>• Later picks in a pack are more informed but have fewer choices</li>
            <li>• Use the minimize and stack features to organize your deck by type</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default KillTeamDraftRules;
