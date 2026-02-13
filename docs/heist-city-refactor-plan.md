# Heist City Refactoring Plan

This document breaks the Heist City refactor into independent phases that can be completed one at a time across multiple sessions. Each phase has a clear scope, deliverables, and verification steps.

**Ground rules:**
- Each phase should leave the app fully functional — no half-finished states between sessions
- Phases are ordered by dependency and impact, but some can be done in parallel
- Each phase lists the files it will touch so you can review diffs easily

---

## Phase 1: Extract Socket Logic into `useHeistCitySocket` Hook

**Why first:** Fixes the critical stale-closure bug where all socket listeners re-register on every state change. This is the biggest stability issue.

**Current problem:**
- `HeistCityGame.tsx` lines 127-356: one giant `useEffect` with 10+ socket listeners
- Dependencies include `gameState`, `lastKnownVersion`, `isSyncing` — causing constant teardown/re-register
- `checkVersionAndSync` captures stale `lastKnownVersion` from the closure
- eslint exhaustive-deps warning is suppressed rather than fixed

**What to do:**
1. Create `src/components/games/heist-city/hooks/useHeistCitySocket.ts`
2. Move all socket `.on()` / `.off()` registration into the hook
3. Use `useRef` for values that listeners read but shouldn't trigger re-registration (`lastKnownVersion`, `isSyncing`, `gameState`)
4. Socket listeners register once on mount (dependency: `[socket, lobbyId]`), read current values via refs
5. The hook returns the state values and setter functions that HeistCityGame needs
6. Move `checkVersionAndSync` inside the hook, reading version from ref instead of closure

**Hook signature (approximate):**
```ts
function useHeistCitySocket(socket: Socket, lobbyId: string, playerId: string) {
  // Returns:
  return {
    gameState, mapState, gridType, turnNumber,
    playerSelections, lastDiceRoll, logEntries,
    rulerState, isSyncing,
    // Emitters:
    emitMapStateChange, emitDiceRoll, emitGameInfoUpdate,
    emitSelectionChange, emitMapLoad, emitRulerUpdate,
    emitNameChange, requestGameState,
    // Setters for local-only state:
    setMapState, setGridType, setTurnNumber, setPlayerSelections,
  };
}
```

**Files touched:**
- NEW: `src/components/games/heist-city/hooks/useHeistCitySocket.ts`
- EDIT: `src/components/games/heist-city/HeistCityGame.tsx` (remove ~230 lines of socket code, import hook)

**Verification:**
- Two browser tabs in same lobby: move a token in one, verify it appears in the other
- Refresh one tab: verify state syncs on reconnect
- Roll dice in one tab: verify it appears in both tabs' game logs
- Load a new map: verify both tabs update

---

## Phase 2: Replace `useState` Sprawl with `useReducer`

**Why:** 15+ independent `useState` calls that are often updated together (e.g., loading a game sets 5 values in sequence). A reducer makes state transitions explicit and testable.

**Current problem:**
- `HeistCityGame.tsx` lines 43-77: 15 state variables
- Loading a saved game calls `setMapState`, `setGridType`, `setTurnNumber`, `setAlertModifier`, `setPlayerSelections` in sequence — 5 separate renders
- No single place to see "what happens when a game is loaded"

**What to do:**
1. Create `src/components/games/heist-city/hooks/useHeistCityState.ts`
2. Define a `HeistCityState` type and action types:
   - `LOAD_MAP` — sets mapState, gridType, turnNumber, clears selections
   - `LOAD_GAME` — sets mapState, gridType, turnNumber, alertModifier, clears selections
   - `UPDATE_MAP_STATE` — sets mapState only
   - `PASS_TURN` — increments turn, unexhausts characters, clears actions
   - `SYNC_FULL_STATE` — applies full sync from server
   - `UPDATE_TURN` — sets turnNumber
   - `UPDATE_ALERT` — sets alertModifier
   - `UPDATE_SELECTIONS` — sets playerSelections
   - `UPDATE_GAME_STATE` — sets gameState (players, etc.)
   - `UPDATE_PLAYER_NAME` — updates a player name in gameState
   - `SET_DICE_ROLL` / `ADD_LOG_ENTRY` — dice and log state
   - `SET_RULER` — ruler state
3. Replace the 15 `useState` calls in HeistCityGame with a single `useReducer`
4. The socket hook from Phase 1 dispatches actions instead of calling individual setters

**Files touched:**
- NEW: `src/components/games/heist-city/hooks/useHeistCityState.ts`
- EDIT: `src/components/games/heist-city/hooks/useHeistCitySocket.ts` (dispatch instead of set)
- EDIT: `src/components/games/heist-city/HeistCityGame.tsx` (use reducer, simplify handlers)

**Verification:**
- Same verification as Phase 1 (all multiplayer features still work)
- Verify "Pass Turn" unexhausts all characters and increments turn
- Verify loading a saved game restores all state correctly

---

## Phase 3: Consolidate Character Update Handlers

**Why:** Six nearly identical functions can become one, removing ~60 lines of boilerplate.

**Current problem:**
- `HeistCityGame.tsx` lines 371-472: `handleStatsUpdate`, `handleStateUpdate`, `handleEquipmentUpdate`, `handleActionUpdate`, `handleVictoryPointsUpdate`, `handleExperienceUpdate`
- All follow the pattern: find character → update one field → create new mapState → emit

**What to do:**
1. Create a single `updateCharacter` function:
   ```ts
   const updateCharacter = (characterId: string, updates: Partial<CharacterToken>) => {
     if (!mapState) return;
     const updatedCharacters = mapState.characters.map(char =>
       char.id === characterId ? { ...char, ...updates } : char
     );
     // dispatch or call handleMapStateChange with new characters
   };
   ```
2. Special case for `handleStateUpdate` (Unconscious → exhausted) can be handled inline or as a helper
3. Update all call sites in HeistCityGame and GameMap to use the consolidated function
4. If using the reducer from Phase 2, this could be a `UPDATE_CHARACTER` action

**Files touched:**
- EDIT: `src/components/games/heist-city/HeistCityGame.tsx` (replace 6 handlers with 1)

**Verification:**
- Edit character stats via CharacterCard → verify changes sync
- Change character state to Unconscious → verify exhausted flag sets
- Equip/remove items → verify sync
- Change XP → verify level updates

---

## Phase 4: Extract Modals from HeistCityGame

**Why:** ~290 lines of modal UI (loadout + game save) make HeistCityGame hard to read. These are self-contained UI concerns.

**Current problem:**
- `HeistCityGame.tsx` lines 994-1145: Loadout modal (save/load/export)
- `HeistCityGame.tsx` lines 1148-1283: Game save modal (save/load)
- Associated state: `showLoadoutModal`, `loadoutName`, `importJson`, `fileInputRef`, `showGameSaveModal`, `gameSaveName`, `gameImportJson`, `gameFileInputRef`
- Associated handlers: lines 611-788 (~180 lines of loadout/save handler functions)

**What to do:**
1. Create `src/components/games/heist-city/components/LoadoutModal.tsx`
   - Props: `isOpen`, `mode` (save/load/export), `playerNumber`, `playerName`, `characters`, `onApplyLoadout`, `onClose`
   - Move all loadout state and handlers inside the modal
   - Import loadoutManager functions directly
2. Create `src/components/games/heist-city/components/GameSaveModal.tsx`
   - Props: `isOpen`, `mode` (save/load), `mapState`, `gridType`, `turnNumber`, `alertModifier`, `onLoadGame`, `onClose`
   - Move all game save state and handlers inside the modal
   - Import gameStateManager functions directly
3. HeistCityGame just renders `<LoadoutModal>` and `<GameSaveModal>` with minimal props

**Files touched:**
- NEW: `src/components/games/heist-city/components/LoadoutModal.tsx`
- NEW: `src/components/games/heist-city/components/GameSaveModal.tsx`
- EDIT: `src/components/games/heist-city/HeistCityGame.tsx` (remove ~470 lines of modal code + handlers)
- EDIT: `src/components/games/heist-city/components/index.ts` (add exports)

**Verification:**
- Save a loadout → load it on the other team → verify equipment applies
- Export loadout to clipboard → import via JSON → verify it works
- Save game → load game → verify all state restores
- Download game file → import file → verify it works

---

## Phase 5: Break Up GameMap — Extract Side Panels

**Why:** GameMap is 1,846 lines. The three IIFE-rendered panels on the right side (~380 lines) are self-contained and easy to extract.

**Current problem:**
- Lines 1447-1655: Character selection info panel (inline IIFE)
- Lines 1657-1717: Enemy unit info panel (inline IIFE)
- Lines 1719-1829: Gear item panel (inline IIFE)
- These panels have their own state and handlers mixed into GameMap

**What to do:**
1. Create `src/components/games/heist-city/components/CharacterSelectionPanel.tsx`
   - Props: selected character, available actions, expanded slots, onActionChange, onExhaustToggle
   - Move `getAvailableActions()` to data layer (see Phase 7)
   - Move action slot continuation logic here
2. Create `src/components/games/heist-city/components/EnemyInfoPanel.tsx`
   - Props: selected item, enemyStats
   - Pure display component
3. Create `src/components/games/heist-city/components/GearItemPanel.tsx`
   - Props: selected item, gearEquipment state, onEquipmentChange
   - Move `gearEquipment` state and `updateGearEquipment` here
4. GameMap renders these three components in the right-side column

**Files touched:**
- NEW: `src/components/games/heist-city/components/CharacterSelectionPanel.tsx`
- NEW: `src/components/games/heist-city/components/EnemyInfoPanel.tsx`
- NEW: `src/components/games/heist-city/components/GearItemPanel.tsx`
- EDIT: `src/components/games/heist-city/components/GameMap.tsx` (remove ~380 lines)
- EDIT: `src/components/games/heist-city/components/index.ts` (add exports)

**Verification:**
- Select a character token → verify info panel shows stats, state, and actions
- Select actions in slots → verify multi-action continuation works
- Click an enemy unit → verify stats display
- Click a gear item → verify equipment dropdown and stats display
- Exhaust/unexhaust a character from the panel

---

## Phase 6: Break Up GameMap — Extract Drag & Viewport Hooks

**Why:** GameMap has 25+ state variables. Drag logic and viewport/zoom logic are independent concerns that each use 8+ state variables.

**Current problem:**
- 8 drag-related state vars (lines 188-199): `draggedToken`, `draggedItem`, `draggedZone`, `dragOffset`, `tempDragPosition`, `dragStartPosition`, `isDraggingConfirmed`, plus ref
- 5 viewport state vars (lines 184-186, 209-211): `zoom`, `viewBox`, `isPanning`, `panStart`, `panOffset`
- `handleMouseMove` (200 lines) and `handleMouseUp` (100 lines) handle all of these interleaved

**What to do:**
1. Create `src/components/games/heist-city/hooks/useDrag.ts`
   - Encapsulates all drag state and logic
   - Handles drag threshold detection
   - Returns: `dragState`, `handleDragStart`, `handleDragMove`, `handleDragEnd`, `getDragPosition`
   - Supports token, item, and zone drag types
2. Create `src/components/games/heist-city/hooks/useViewport.ts`
   - Encapsulates zoom, pan, and viewBox state
   - Handles Ctrl+wheel zoom, right-click pan, fit-to-window
   - Returns: `viewBox`, `zoom`, `handleZoomIn/Out/Reset`, `handleFitToWindow`, `screenToSVG`, `isPanning`
3. Simplify GameMap's mouse handlers to delegate to these hooks
4. Combine zone resize state into `useDrag` or create `useZoneResize`

**Files touched:**
- NEW: `src/components/games/heist-city/hooks/useDrag.ts`
- NEW: `src/components/games/heist-city/hooks/useViewport.ts`
- EDIT: `src/components/games/heist-city/components/GameMap.tsx` (remove ~300 lines of state + handlers)

**Verification:**
- Drag a character token → verify snap-to-grid and position sync
- Drag an enemy unit → verify it moves correctly
- Ctrl+scroll to zoom → verify zoom centers on cursor
- Right-click drag to pan → verify smooth panning
- Fit to window button → verify it works
- WASD movement of selected token → verify it still works

---

## Phase 7: Move Game Logic Out of Components

**Why:** Game rules are scattered across UI components. Centralizing them makes them testable and reusable.

**Current problem:**
- `calculateLevel()` and `getLevelThresholds()` in CharacterCard.tsx (lines 22-41)
- `getAvailableActions()` in GameMap.tsx (lines 75-134)
- Action slot continuation logic inline in GameMap JSX (lines 1451-1483)
- Unconscious → exhausted rule in HeistCityGame.tsx handleStateUpdate (line 394)

**What to do:**
1. Move `calculateLevel` and `getLevelThresholds` to `src/components/games/heist-city/data/characters/characterStats.ts`
2. Move `getAvailableActions` to `src/components/games/heist-city/data/characters/actionCosts.ts` (or a new `actionUtils.ts`)
3. Create `src/components/games/heist-city/data/characters/actionSlots.ts` for action slot logic:
   - `assignAction(currentActions, slotIndex, actionName) → string[]`
   - `clearAction(currentActions, slotIndex) → string[]`
   - `isContinuationSlot(actions, slotIndex) → boolean`
4. Update component imports to use the centralized functions
5. Export from the characters barrel file

**Files touched:**
- EDIT: `src/components/games/heist-city/data/characters/characterStats.ts`
- EDIT: `src/components/games/heist-city/data/characters/actionCosts.ts` (or NEW `actionUtils.ts`)
- NEW: `src/components/games/heist-city/data/characters/actionSlots.ts`
- EDIT: `src/components/games/heist-city/data/characters/index.ts` (add exports)
- EDIT: `src/components/games/heist-city/components/CharacterCard.tsx` (import instead of define)
- EDIT: `src/components/games/heist-city/components/GameMap.tsx` or `CharacterSelectionPanel.tsx` (import instead of define)

**Verification:**
- XP counter and level badge still display correctly
- Action dropdowns still show correct available actions
- Multi-action slot filling still works (e.g., 2-action ability fills 2 slots)

---

## Phase 8: Extract Duplicated UI Patterns in HeistCityGame

**Why:** Remaining cleanup to make HeistCityGame lean and readable.

**Current problem:**
- Blue VP section and Red VP section are nearly identical JSX (lines 877-920)
- Blue gear points and Red gear points are duplicated (lines 925-935)
- Blue/Red loadout buttons are duplicated (lines 944-988)
- Gear point calculation is duplicated (`blueGearPoints` / `redGearPoints`)

**What to do:**
1. Create `src/components/games/heist-city/components/TeamInfoPanel.tsx`
   - Props: `playerNumber`, `playerName`, `characters`, `victoryPoints`, `gearPoints`, `onVPUpdate`, `onShowLoadoutModal`
   - Renders VP per character, gear points total, and loadout buttons
   - Used twice in HeistCityGame (once per team)
2. Create a `useGearPoints` hook or simple utility function to avoid the duplicated useMemo

**Files touched:**
- NEW: `src/components/games/heist-city/components/TeamInfoPanel.tsx`
- EDIT: `src/components/games/heist-city/HeistCityGame.tsx` (replace ~110 lines of duplicated JSX)

**Verification:**
- Both teams' VP displays work (per-character editing, totals)
- Gear point totals update when equipment changes
- Loadout save/load/export buttons still open the correct modals

---

## Phase 9 (Optional): Performance — Granular Socket Events

**Why:** Currently every character field change emits the entire mapState. This is wasteful and can cause sync conflicts.

**Current problem:**
- Changing one character's XP sends ALL characters, items, and zones to the server
- Two players editing different characters simultaneously can overwrite each other's changes

**What to do:**
1. Add a new socket event `heist-city-character-update` that sends only `{ characterId, updates }` instead of the full mapState
2. Server applies the partial update to its stored mapState and broadcasts
3. Client applies partial update on receive
4. Keep the full `heist-city-map-state-change` for actual map changes (token positions, items, zones)
5. Update server-side `heistCityEvents.js` with the new event handler

**Files touched:**
- EDIT: `server/socket/heistCityEvents.js`
- EDIT: `src/constants/socketEvents.ts`
- EDIT: `src/components/games/heist-city/hooks/useHeistCitySocket.ts`
- EDIT: `src/components/games/heist-city/HeistCityGame.tsx`

**Verification:**
- Two players editing different characters simultaneously → no overwrites
- Token movement still syncs correctly
- Full sync recovery still works after disconnect

---

## Summary: Expected Line Count Impact

| Phase | Lines Removed | Lines Added | Net Change | HeistCityGame.tsx After |
|-------|--------------|-------------|------------|------------------------|
| Start | — | — | — | 1,334 lines |
| Phase 1 | ~230 | ~200 | -30 | ~1,100 |
| Phase 2 | ~80 | ~150 | +70 (new file) | ~1,020 |
| Phase 3 | ~60 | ~15 | -45 | ~975 |
| Phase 4 | ~470 | ~400 (new files) | -70 in main | ~505 |
| Phase 5 | ~380 from GameMap | ~350 (new files) | -30 | 505 (GameMap: ~1,466) |
| Phase 6 | ~300 from GameMap | ~250 (new files) | -50 | 505 (GameMap: ~1,166) |
| Phase 7 | ~60 from components | ~80 (data layer) | +20 | 505 (GameMap: ~1,106) |
| Phase 8 | ~110 | ~80 (new file) | -30 | ~475 |

**Final target:** HeistCityGame.tsx drops from 1,334 to ~475 lines. GameMap.tsx drops from 1,846 to ~1,100 lines.

---

## Hooks Index (after all phases)

```
src/components/games/heist-city/hooks/
  useHeistCitySocket.ts    — Phase 1: socket event management
  useHeistCityState.ts     — Phase 2: useReducer for game state
  useDrag.ts               — Phase 6: drag-and-drop logic
  useViewport.ts           — Phase 6: zoom/pan/viewBox
```

## New Components Index (after all phases)

```
src/components/games/heist-city/components/
  LoadoutModal.tsx              — Phase 4
  GameSaveModal.tsx             — Phase 4
  CharacterSelectionPanel.tsx   — Phase 5
  EnemyInfoPanel.tsx            — Phase 5
  GearItemPanel.tsx             — Phase 5
  TeamInfoPanel.tsx             — Phase 8
```