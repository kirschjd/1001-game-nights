import React, { useState, useMemo } from 'react';
import { Socket } from 'socket.io-client';
import { GameMap } from './components';
import CharacterCard from './components/CharacterCard';
import LoadoutModal from './components/LoadoutModal';
import GameSaveModal from './components/GameSaveModal';
import TeamInfoPanel from './components/TeamInfoPanel';
import { CharacterToken, CharacterState, PlayerSelection, SavedGameState } from './types';
import { loadMap } from './data/mapLoader';
import { useHeistCityState } from './hooks/useHeistCityState';
import { useHeistCitySocket } from './hooks/useHeistCitySocket';

interface HeistCityGameProps {
  socket: Socket;
  lobbyId: string;
  playerId: string;
}

const HeistCityGame: React.FC<HeistCityGameProps> = ({ socket, lobbyId, playerId }) => {
  // --- Game state (reducer) ---
  const [state, dispatch] = useHeistCityState();
  const { gameState, mapState, gridType, playerSelections, lastDiceRoll,
          logEntries, turnNumber, rulerState, alertModifier } = state;

  // --- Socket (emitters only — state updates go through dispatch) ---
  const {
    emitMapStateChange,
    emitCharacterUpdate,
    emitDiceRoll,
    emitGameInfoUpdate,
    emitSelectionChange,
    emitMapLoad,
    emitRulerUpdate,
  } = useHeistCitySocket(socket, lobbyId, playerId, state, dispatch);

  // --- Local-only UI state ---
  const [showLoadoutModal, setShowLoadoutModal] = useState<{ type: 'save' | 'load' | 'export'; playerNumber: 1 | 2 } | null>(null);
  const [showGameSaveModal, setShowGameSaveModal] = useState<'save' | 'load' | null>(null);

  // --- Computed values ---

  const currentPlayerNumber = useMemo((): 1 | 2 | 'observer' => {
    if (!gameState?.players) return 'observer';
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    if (playerIndex === 0) return 1;
    if (playerIndex === 1) return 2;
    return 'observer';
  }, [gameState?.players, playerId]);

  const blueVictoryPoints = useMemo(() => {
    if (!mapState) return 0;
    return mapState.characters
      .filter(char => char.playerNumber === 1)
      .reduce((total, char) => total + (char.victoryPoints || 0), 0);
  }, [mapState]);

  const redVictoryPoints = useMemo(() => {
    if (!mapState) return 0;
    return mapState.characters
      .filter(char => char.playerNumber === 2)
      .reduce((total, char) => total + (char.victoryPoints || 0), 0);
  }, [mapState]);

  const player1Name = useMemo(() => {
    return gameState?.players?.[0]?.name || 'Player 1';
  }, [gameState?.players]);

  const player2Name = useMemo(() => {
    return gameState?.players?.[1]?.name || 'Player 2';
  }, [gameState?.players]);

  // --- Character update handler (granular — sends only the changed fields) ---

  const updateCharacter = (characterId: string, updates: Partial<CharacterToken>) => {
    if (!mapState) return;
    emitCharacterUpdate(characterId, updates);
  };

  // Special case: Unconscious → exhausted
  const handleStateUpdate = (characterId: string, newState: CharacterState) => {
    updateCharacter(characterId, newState === 'Unconscious'
      ? { state: newState, exhausted: true }
      : { state: newState }
    );
  };

  // Special case: toggle requires reading current value
  const handleExhaustToggle = (characterId: string) => {
    if (!mapState) return;
    const char = mapState.characters.find(c => c.id === characterId);
    if (char) updateCharacter(characterId, { exhausted: !char.exhausted });
  };

  // --- Game action handlers ---

  const handleSelectionChange = (characterId: string | null) => {
    const updatedSelections: PlayerSelection[] = characterId
      ? [
          ...playerSelections.filter(sel => sel.playerId !== playerId),
          { playerId, characterId, playerNumber: currentPlayerNumber },
        ]
      : playerSelections.filter(sel => sel.playerId !== playerId);

    emitSelectionChange(updatedSelections);
  };

  const handleLoadMap = (mapId: string) => {
    if (!gameState) return;

    const player1Id = gameState.players?.[0]?.id || 'player-1';
    const player2Id = gameState.players?.[1]?.id || 'player-2';

    const loadedMap = loadMap(mapId, player1Id, player2Id);

    // Preserve equipment on characters but reset VP
    if (mapState) {
      loadedMap.characters = loadedMap.characters.map(newChar => {
        const oldChar = mapState.characters.find(c =>
          c.playerId === newChar.playerId && c.role === newChar.role
        );
        return {
          ...newChar,
          equipment: oldChar?.equipment || [],
          actions: oldChar?.actions || [],
          victoryPoints: 0,
        };
      });
    } else {
      loadedMap.characters = loadedMap.characters.map(char => ({
        ...char,
        victoryPoints: 0,
      }));
    }

    // Update local state atomically via reducer
    dispatch({
      type: 'LOAD_MAP',
      mapState: loadedMap,
      gridType: loadedMap.gridType,
      turnNumber: 1,
    });

    // Emit to server (broadcasts to all players including sender)
    emitMapLoad({
      mapId,
      mapState: loadedMap,
      gridType: loadedMap.gridType,
      turnNumber: 1,
      blueVictoryPoints: 0,
      redVictoryPoints: 0,
    });
  };

  const handlePassTurn = () => {
    if (!mapState) return;

    const updatedCharacters = mapState.characters.map(char => ({
      ...char,
      exhausted: char.state === 'Unconscious' ? true : false,
      actions: [],
    }));

    const newMapState = { ...mapState, characters: updatedCharacters };
    const newTurn = turnNumber + 1;

    // Update map state (dispatches + emits)
    emitMapStateChange(newMapState);
    // Update turn number locally
    dispatch({ type: 'UPDATE_TURN', turnNumber: newTurn });
    // Emit turn info to other players
    emitGameInfoUpdate(newTurn, blueVictoryPoints, redVictoryPoints);
  };

  // --- Loadout apply callback ---

  const handleApplyLoadout = (updatedTeamCharacters: CharacterToken[]) => {
    if (!mapState || !showLoadoutModal) return;
    const playerNumber = showLoadoutModal.playerNumber;
    const updatedCharacters = mapState.characters.map(char => {
      if (char.playerNumber === playerNumber) {
        const updated = updatedTeamCharacters.find(tc => tc.role === char.role);
        return updated || char;
      }
      return char;
    });
    emitMapStateChange({ ...mapState, characters: updatedCharacters });
  };

  // --- Game load callback ---

  const handleLoadGame = (savedGame: SavedGameState) => {
    dispatch({
      type: 'LOAD_GAME',
      mapState: savedGame.mapState,
      gridType: savedGame.gridType,
      turnNumber: savedGame.turnNumber,
      alertModifier: savedGame.alertModifier,
    });

    emitMapStateChange(savedGame.mapState);
    emitGameInfoUpdate(savedGame.turnNumber, blueVictoryPoints, redVictoryPoints);
  };

  // --- Render ---

  if (!mapState) {
    return <div className="text-white">Loading Heist City...</div>;
  }

  return (
    <div className="heist-city-game p-6 bg-gray-950 min-h-screen">
      <div className="max-w-[1550px] mx-auto">
        {/* Header */}
        <h1 className="text-3xl font-bold text-white mb-4">Heist City</h1>

        {/* Game Map */}
        <GameMap
          mapState={mapState}
          onMapStateChange={emitMapStateChange}
          onSelectionChange={handleSelectionChange}
          readOnly={false}
          gridType={gridType}
          onDiceRoll={emitDiceRoll}
          lastDiceRoll={lastDiceRoll}
          logEntries={logEntries}
          playerSelections={playerSelections}
          currentPlayerId={playerId}
          currentPlayerNumber={currentPlayerNumber}
          onExhaustToggle={handleExhaustToggle}
          onActionUpdate={(id, actions) => updateCharacter(id, { actions })}
          onLoadMap={handleLoadMap}
          sharedRulerState={rulerState}
          onRulerUpdate={emitRulerUpdate}
          gameInfo={{ turnNumber, blueVictoryPoints, redVictoryPoints }}
          onGameInfoChange={(info) => {
            dispatch({ type: 'UPDATE_TURN', turnNumber: info.turnNumber });
          }}
          alertModifier={alertModifier}
          onAlertModifierChange={(value) => dispatch({ type: 'UPDATE_ALERT', alertModifier: value })}
          onSaveGame={() => setShowGameSaveModal('save')}
          onLoadGame={() => setShowGameSaveModal('load')}
        />

        {/* Game Info */}
        <div className="mt-6 bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold text-white mb-4">Game Info</h2>
          <div className="space-y-4">
            {/* Turn Number */}
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm font-semibold">Turn Number: {turnNumber}</span>
              <button
                onClick={handlePassTurn}
                className="px-4 py-2 rounded-lg font-semibold text-white text-sm transition-all bg-green-600 hover:bg-green-700 active:scale-95"
              >
                Pass Turn
              </button>
            </div>

            {/* Blue Team Info */}
            <TeamInfoPanel
              playerNumber={1}
              playerName={player1Name}
              characters={mapState.characters.filter(c => c.playerNumber === 1)}
              onVPUpdate={(id, vp) => updateCharacter(id, { victoryPoints: vp })}
              onShowLoadoutModal={(type) => setShowLoadoutModal({ type, playerNumber: 1 })}
            />

            {/* Divider */}
            <div className="border-t border-gray-700 my-2"></div>

            {/* Red Team Info */}
            <TeamInfoPanel
              playerNumber={2}
              playerName={player2Name}
              characters={mapState.characters.filter(c => c.playerNumber === 2)}
              onVPUpdate={(id, vp) => updateCharacter(id, { victoryPoints: vp })}
              onShowLoadoutModal={(type) => setShowLoadoutModal({ type, playerNumber: 2 })}
            />
          </div>
        </div>

        {/* Loadout Modal */}
        <LoadoutModal
          isOpen={showLoadoutModal}
          playerName={showLoadoutModal?.playerNumber === 1 ? player1Name : player2Name}
          characters={showLoadoutModal ? mapState.characters.filter(c => c.playerNumber === showLoadoutModal.playerNumber) : []}
          onApplyLoadout={handleApplyLoadout}
          onClose={() => setShowLoadoutModal(null)}
        />

        {/* Game Save Modal */}
        <GameSaveModal
          isOpen={showGameSaveModal}
          mapState={mapState}
          gridType={gridType}
          turnNumber={turnNumber}
          alertModifier={alertModifier}
          onLoadGame={handleLoadGame}
          onClose={() => setShowGameSaveModal(null)}
        />

        {/* Character Cards */}
        <div className="mt-6">
          <h2 className="text-2xl font-bold text-white mb-4">Character Cards</h2>

          {/* Player 1 Characters */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-blue-400 mb-3">{player1Name} (Blue)</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
              {mapState.characters
                .filter((char) => char.playerNumber === 1)
                .map((character) => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    isOwnedByPlayer={character.playerId === playerId}
                    onStatsUpdate={(id, stats) => updateCharacter(id, { stats })}
                    onStateUpdate={handleStateUpdate}
                    onEquipmentUpdate={(id, equipment) => updateCharacter(id, { equipment })}
                    onExperienceUpdate={(id, experience) => updateCharacter(id, { experience })}
                  />
                ))}
            </div>
          </div>

          {/* Player 2 Characters */}
          <div>
            <h3 className="text-lg font-bold text-red-400 mb-3">{player2Name} (Red)</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
              {mapState.characters
                .filter((char) => char.playerNumber === 2)
                .map((character) => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    isOwnedByPlayer={character.playerId === playerId}
                    onStatsUpdate={(id, stats) => updateCharacter(id, { stats })}
                    onStateUpdate={handleStateUpdate}
                    onEquipmentUpdate={(id, equipment) => updateCharacter(id, { equipment })}
                    onExperienceUpdate={(id, experience) => updateCharacter(id, { experience })}
                  />
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeistCityGame;
