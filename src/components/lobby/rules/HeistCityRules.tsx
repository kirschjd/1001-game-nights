import React from 'react';

interface HeistCityRulesProps {
  gameColorClasses: string;
}

const HeistCityRules: React.FC<HeistCityRulesProps> = ({ gameColorClasses }) => {
  return (
    <div className={`p-6 rounded-lg border ${gameColorClasses}`}>
      <h2 className="text-2xl font-bold mb-4 text-purple-500">Heist City</h2>

      <div className="space-y-4 text-gray-300">
        <p className="text-lg">
          Squad-based heist skirmish. Control 5 unique crew members, steal objectives, avoid detection, and escape before the SWAT arrives!
        </p>

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Game Info</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Players:</strong> 2+ players</div>
            <div><strong>Duration:</strong> 5 turns (~45 min)</div>
            <div><strong>Difficulty:</strong> Medium-High</div>
            <div><strong>Strategy:</strong> Tactical Skirmish</div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Turn Structure</h3>
          <ol className="space-y-2 text-sm">
            <li><strong>1.</strong> Players alternate activating crew members (3 actions each: Move, Shoot, Hack, Con, Special)</li>
            <li><strong>2.</strong> Each crew has unique stats and abilities (Face, Muscle, Ninja, Brain, Spook)</li>
            <li><strong>3.</strong> After all activations, NPCs act simultaneously (Mob Phase)</li>
            <li><strong>4.</strong> End of turn: Resolve effects, check alert level</li>
          </ol>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Core Mechanics</h3>
          <ul className="space-y-1 text-sm">
            <li>• <strong>Stealth States:</strong> Hidden and Disguised units avoid detection, Overt units raise alerts</li>
            <li>• <strong>Alert System:</strong> Escalates from passive guards → active turrets → SWAT reinforcements</li>
            <li>• <strong>Dice Rolls:</strong> 2d6 for attacks (MS/BS), defense (D), hacking (H), and conning (C)</li>
            <li>• <strong>Combat:</strong> Attack → Defense roll → Apply damage. 0 Wounds = Stunned, then Unconscious</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Victory Points</h3>
          <ul className="space-y-1 text-sm">
            <li>• First KO on enemy unit: <strong>+1 VP</strong></li>
            <li>• Reveal hidden/disguised enemy: <strong>+1 VP</strong></li>
            <li>• Upload intel (hack computers): <strong>+1 VP</strong></li>
            <li>• Extract intel to deployment zone: <strong>+3 VP</strong></li>
            <li>• Crew member in deployment zone at end: <strong>+2 VP</strong></li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Tips</h3>
          <ul className="space-y-1 text-sm">
            <li>• Use Hidden/Disguised states to avoid triggering alerts</li>
            <li>• Watch the alert level - SWAT spawns at level 3!</li>
            <li>• Each character class has unique strengths (Face cons, Ninja stealth, etc.)</li>
            <li>• Wounded units become Stunned before Unconscious - extract them!</li>
            <li>• Balance VP objectives: KOs vs intel upload vs safe extraction</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HeistCityRules;
