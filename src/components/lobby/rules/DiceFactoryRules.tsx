import React from 'react';

interface DiceFactoryRulesProps {
  variant: string;
  gameColorClasses: string;
}

const DiceFactoryRules: React.FC<DiceFactoryRulesProps> = ({ variant, gameColorClasses }) => {
  const isV021 = variant === 'v0.2.1';
  const isExperimental = variant === 'experimental';

  return (
    <div className={`p-6 rounded-lg border ${gameColorClasses}`}>
      <h2 className="text-2xl font-bold mb-4 text-uranian-blue">Dice Factory</h2>
      <p className="text-lg font-semibold text-uranian-blue mb-4">
        {isExperimental
          ? 'Experimental Mode: Compete for points in a fixed number of turns. No collapse mechanics.'
          : 'Standard Mode: A Game of Odds and Industriousness'}
      </p>

      <div className="space-y-4 text-gray-300">
        <p className="text-lg">
          {isV021
            ? 'Use slot-based abilities to manipulate dice and score victory points. First player to reach 10 VP wins!'
            : "The game's purpose is to score points. This is done by scoring tricks."}
        </p>

        {isV021 ? (
          <>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Dice Pool & Slots</h3>
              <p className="text-sm mb-2">
                Each player starts with 4d4. At the start of your turn, all dice are rolled. You have 12 ability
                slots (numbered 1-12) where you can assign abilities. To use an ability, you must pay its cost with
                dice matching the slot number. For example: using an ability in slot 3 requires dice showing 3.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Turn Structure</h3>
              <p className="text-sm mb-2">
                On your turn, take <strong>2 actions</strong>, then play passes to the next player. Actions include:
              </p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Use an ability from a slot (costs dice matching slot number)</li>
                <li>• Buy a card from one of 3 available decks (costs dice matching card requirements)</li>
              </ul>
              <p className="text-sm mt-2">
                When done for the round, pass your turn. The round continues until all players pass.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Ability System</h3>
              <p className="text-sm mb-2">
                <strong>Slots 1-4 (Tier 0):</strong> Basic abilities like Recruit, Promote, Reroll, Bump<br />
                <strong>Slots 5-6 (Tier 1+):</strong> Advanced abilities from tier 1+ decks<br />
                <strong>Slots 7-8 (Tier 2+):</strong> Score VP, special recruits, attacks<br />
                <strong>Slots 9-10 (Tier 3+):</strong> Mass actions, card effects<br />
                <strong>Slots 11-12 (Tier 4+):</strong> Powerful abilities like Score++ (3 VP)
              </p>
              <p className="text-sm">
                Drag abilities from the right panel to slots. Click a slot to activate, then add dice/cards
                as cost and targets. Abilities can be reused each round!
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Cards</h3>
              <p className="text-sm mb-2">
                Cards can be bought from 3 available decks. Each card has a cost (specific dice values needed)
                and provides VP or special dice values that can be used as cost for abilities.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Winning</h3>
              <p className="text-sm">
                First player to reach <strong>10 Victory Points</strong> wins immediately!
              </p>
            </div>
          </>
        ) : (
          <>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Dice Pool</h3>
              <p className="text-sm mb-2">
                Tricks are made from each players' dice pool. Each player starts with a minimum dice pool of 4d4.
                A player's dice minimum dice pool determines the number of die they cannot go below. The dice pool
                is what a player rolls at the beginning of their turn. If a players dice pool falls below their
                minimum dice pool, they will automatically recruit up to the minimum dice pool.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Standard Actions</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="font-semibold text-uranian-blue">Promotion</h4>
                  <p>A die can be promoted to a die of one larger size. This can only be done on a die with max pips. This exhausts the die.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-uranian-blue">Recruitment</h4>
                  <p>Dice can be recruited into the dice pool by rolling a number corresponding to the recruitment table:</p>
                  <div className="bg-payne-grey/30 p-3 rounded mt-2 text-xs">
                    <div><strong>D4:</strong> Roll 1 → D4</div>
                    <div><strong>D6:</strong> Roll 1,2 → D6, D4</div>
                    <div><strong>D8:</strong> Roll 1,2,3 → D8, D6, D4</div>
                    <div><strong>D10:</strong> Roll 1,2,3,4 → D10, D8, D6, D4</div>
                    <div><strong>D12:</strong> Roll 1,2,3,4,5 → D12, D10, D8, D6, D4</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-uranian-blue">Processing</h4>
                  <p>Dice can be processed for free pips. Doing so removes the die from the dice pool. The player immediately gets free pips equal to 2x the rolled value.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-uranian-blue">Scoring</h4>
                  <p>Tricks can be straights or sets.</p>
                  <ul className="mt-1 space-y-1">
                    <li>• <strong>Straights:</strong> 3+ dice in increasing order = (highest #) x (# of dice)</li>
                    <li>• <strong>Sets:</strong> 3+ dice of the same value = (number on dice) x (# of dice + 1)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Standard Pip Actions</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Increase 1 die by 1: <strong>4 pips</strong></div>
                <div>Decrease 1 die by 1: <strong>3 pips</strong></div>
                <div>Reroll a die: <strong>2 pips</strong></div>
                <div>Factory Effects: <strong>7 pips</strong></div>
                <div>Factory Modification: <strong>9 pips</strong></div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Factory System</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <h4 className="font-semibold text-uranian-blue">Factory Effects</h4>
                  <p>Powerful one-time effects that go to your hand when bought and can be played on later turns.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-uranian-blue">Factory Modifications</h4>
                  <p>Permanently change rules for the player that bought them. Effects persist immediately.</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Ending the Game</h3>
              {isExperimental ? (
                <p className="text-sm">
                  The game ends after a set number of turns. Players compete to score the most points within
                  the time limit, with no factory collapse mechanics.
                </p>
              ) : (
                <p className="text-sm">
                  The factory begins to collapse when the turn indicator exceeds the collapse dice (1d6, 1d8, 1d10).
                  Each turn 1 is added to the turn counter and the collapse dice are rolled and added. If the sum is
                  less than the turn counter, the collapse begins. Players can choose to stay or flee. When a player
                  flees, their point total is locked and a collapse die is removed. If the turn counter &lt;= 0, any
                  remaining players are crushed and their score goes to 0.
                </p>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Turn Structure</h3>
              <ol className="space-y-1 text-sm">
                <li><strong>1.</strong> Roll collapse dice</li>
                <li><strong>2.</strong> Play Factory Effects</li>
                <li><strong>3.</strong> Dice are rolled</li>
                <li><strong>4.</strong> Perform Dice actions</li>
                <li><strong>5.</strong> Check for collapse</li>
              </ol>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DiceFactoryRules;
