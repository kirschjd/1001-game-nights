import React from 'react';
import WarRules from './WarRules';
import HenHurRules from './HenHurRules';
import HeistCityRules from './HeistCityRules';
import KillTeamDraftRules from './KillTeamDraftRules';
import DiceFactoryRules from './DiceFactoryRules';

interface GameRulesPanelProps {
  gameType: string;
  gameColorClasses: string;
  // War-specific
  selectedVariant?: string;
  // Dice Factory-specific
  dfVariant?: string;
}

const GameRulesPanel: React.FC<GameRulesPanelProps> = ({
  gameType,
  gameColorClasses,
  selectedVariant = 'regular',
  dfVariant = 'v0.1.5',
}) => {
  switch (gameType) {
    case 'war':
      return <WarRules selectedVariant={selectedVariant} gameColorClasses={gameColorClasses} />;
    case 'henhur':
      return <HenHurRules gameColorClasses={gameColorClasses} />;
    case 'heist-city':
      return <HeistCityRules gameColorClasses={gameColorClasses} />;
    case 'kill-team-draft':
      return <KillTeamDraftRules gameColorClasses={gameColorClasses} />;
    case 'dice-factory':
    default:
      return <DiceFactoryRules variant={dfVariant} gameColorClasses={gameColorClasses} />;
  }
};

export default GameRulesPanel;
