# Phase 6: Integration

**Goal:** Wire the AI Controller (Phase 4) and Rules Advisor (Phase 5) into the existing React/socket infrastructure. This phase consolidates all UI, hook, and socket changes so shared files (`HeistCityGame.tsx`, `useHeistCityState.ts`, `useHeistCitySocket.ts`, `GameLog.tsx`) are only touched once.

**Dependencies:** Phase 4 (AI Controller), Phase 5 (Rules Advisor)

**Touches existing files:**
- `HeistCityGame.tsx` — add AI controls, advisor panel, AI turn lifecycle
- `hooks/useHeistCityState.ts` — extend state shape and reducer
- `hooks/useHeistCitySocket.ts` — add AI-specific emitters
- `components/GameLog.tsx` — extend LogEntry type and rendering

**New files:**
- `ai/aiAdapter.ts` — bridge between AI decisions and socket emitters
- `hooks/useAIController.ts` — React hook managing AI lifecycle
- `hooks/useRulesAdvisor.ts` — React hook managing advisor validation
- `components/AIControlsPanel.tsx` — AI toggle, difficulty selector, status
- `components/AdvisorPanel.tsx` — advisor entries with muting controls

---

## Design Philosophy

### Separation of Concerns

Phases 1–5 are pure logic — no DOM, no React, no sockets. Phase 6 is the thin glue layer that connects pure logic to the UI. Every Phase 6 module is a React component, hook, or adapter. None contain game rules or AI decision logic.

### AI Actions Use Existing Emitters

The AI adapter calls the same `emitCharacterUpdate`, `emitDiceRoll`, and `emitMapStateChange` functions that human players use. This means:
- AI actions automatically sync to all connected clients
- No new socket events are needed for game actions
- The server doesn't know (or care) whether a human or AI is acting

### Advisor Is Read-Only

The advisor observes state changes and produces log entries. It never modifies game state, never blocks actions, and never emits socket events. It runs in a `useEffect` that watches for relevant state changes.

---

## Module Overview

| Module | Location | Complexity | Purpose |
|--------|----------|-----------|---------|
| `ai/aiAdapter.ts` | New file | Medium | Translates AI decisions into emitter calls |
| `hooks/useAIController.ts` | New file | Medium | React hook for AI turn lifecycle |
| `hooks/useRulesAdvisor.ts` | New file | Small | React hook for advisor validation |
| `components/AIControlsPanel.tsx` | New file | Small | AI on/off, difficulty, status display |
| `components/AdvisorPanel.tsx` | New file | Small | Advisor entries with category muting |
| `hooks/useHeistCityState.ts` | Extend | Small | Add AI/advisor state to reducer |
| `hooks/useHeistCitySocket.ts` | Extend | Small | Add AI log emitter |
| `components/GameLog.tsx` | Extend | Small | Render AI/advisor/NPC log entries |
| `HeistCityGame.tsx` | Extend | Medium | Wire AI controls, advisor panel, AI turn flow |

---

## 6.1 ai/aiAdapter.ts — AI-to-Game Bridge

Translates `AIActivation` decisions from the AI controller into calls to the existing socket emitters. Handles the mechanical details: moving tokens, assigning actions to slots, rolling dice, applying results.

### Types

```typescript
/** Emitter functions the adapter needs (subset of useHeistCitySocket return) */
AIEmitters {
  emitCharacterUpdate: (characterId: string, updates: Partial<CharacterToken>) => void;
  emitDiceRoll: (dice1: number, dice2: number, total: number) => void;
  emitMapStateChange: (newMapState: MapState) => void;
  emitGameInfoUpdate: (turnNumber: number, blueVP: number, redVP: number) => void;
}

/** Result of executing a single AI action */
AIActionResult {
  actionId: string;
  characterId: string;
  success: boolean;
  diceRoll?: { dice1: number; dice2: number; total: number };
  damage?: number;
  stateChange?: CharacterState;
  vpAwarded?: number;
  logEntry: LogEntry;
}

/** Callback for step-by-step execution progress */
AIStepCallback = (result: AIActionResult) => void;
```

### Functions

**`executeActivation(activation, mapState, gridType, emitters, onStep): Promise<AIActionResult[]>`**

Execute one character's full activation (all action slots). Steps:

1. For each action in the activation:
   a. If **Move** — call `emitCharacterUpdate(charId, { position: target })`. Produce a log entry.
   b. If **Attack** — roll 2d6 with `Math.random()`, call `emitDiceRoll`. Resolve via `resolveCombat()` from engine. Apply wound/state changes via `emitCharacterUpdate`. Produce a log entry with result.
   c. If **Hack** — roll 2d6, call `emitDiceRoll`. Resolve via `resolveHackCheck()`. Award VP if successful via `emitCharacterUpdate(charId, { victoryPoints: current + 1 })`. Produce a log entry.
   d. If **Charm/Con** — roll 2d6, call `emitDiceRoll`. Resolve via `resolveCharmCheck()`. Award VP if successful. Produce a log entry.
   e. If **Special ability** — apply effect via `emitCharacterUpdate`. Some abilities (Ninja Vanish, Face Off) change state. Produce a log entry.
2. After each step, call `onStep(result)` so the hook can update state and add delays.
3. Return all results for the AI controller to call `onActionResolved()`.

**`rollDice(): { dice1: number; dice2: number; total: number }`**

Generate a 2d6 roll using `Math.random()`. Separated so it can be seeded in tests.

**`buildAILogEntry(action, character, result): LogEntry`**

Create a log entry for an AI action. Uses the extended `LogEntry` type (see 6.7).

### Execution Timing

Each action within an activation has a configurable delay between steps (default: 800ms). This gives human players time to see what the AI is doing. The delay is applied by the hook, not the adapter.

---

## 6.2 hooks/useAIController.ts — AI Lifecycle Hook

Manages the AI controller's lifecycle within React. Handles turn detection, activation sequencing, animation delays, and state updates.

### Hook Signature

```typescript
function useAIController(options: {
  enabled: boolean;
  difficulty: 'easy' | 'normal' | 'hard';
  playerNumber: 1 | 2;
  mapState: MapState | null;
  turnNumber: number;
  gridType: GridType;
  alertModifier: number;
  emitters: AIEmitters;
  dispatch: Dispatch<HeistCityAction>;
}): AIControllerHookReturn;
```

### Return Type

```typescript
AIControllerHookReturn {
  isThinking: boolean;          // AI is computing decisions
  isExecuting: boolean;         // AI is executing actions (with delays)
  currentPlan: AITurnPlan | null;
  currentActivation: AIActivation | null;
  lastReasoning: string;        // human-readable explanation of last decision
  error: string | null;
  startTurn: () => void;        // manually trigger AI turn (if not auto)
  pause: () => void;            // pause execution after current activation
  resume: () => void;           // resume paused execution
  isPaused: boolean;
}
```

### Behavior

**Auto-trigger:** When `enabled` is true and it becomes the AI's turn (detected via `turnNumber` change), the hook automatically calls `startTurn()`. The AI plans, then executes activations one at a time.

**Execution loop:**
1. `isThinking = true` — AI controller calls `planTurn()`
2. `isThinking = false`, `isExecuting = true`
3. Loop: call `getNextActivation()` → execute via adapter → wait delay → repeat
4. After all activations: call `handlePassTurn` equivalent (reset exhausted, clear actions, advance turn)
5. `isExecuting = false`

**Delays between activations:** 1200ms default (longer than intra-activation delays) so the human can see the boundary between character activations.

**Error handling:** If any step throws, set `error` with message and stop execution. The human can retry or take over.

**Pause/Resume:** The human can pause the AI mid-turn to inspect the board. Resume continues from the next planned activation.

### State Management

The hook dispatches to the reducer:
- `ADD_LOG_ENTRY` for each AI action
- `UPDATE_CHARACTER` via emitters (which dispatch internally)
- `SET_AI_STATUS` for thinking/executing/paused/error states

### Refs

Uses refs to hold the `AIController` instance and current map state so the execution loop always reads fresh state after each activation resolves.

---

## 6.3 hooks/useRulesAdvisor.ts — Advisor Lifecycle Hook

Watches for game state changes and runs the appropriate validator from the Rules Advisor (Phase 5). Produces advisory entries that appear in the advisor panel.

### Hook Signature

```typescript
function useRulesAdvisor(options: {
  enabled: boolean;
  config: AdvisorConfig;
  mapState: MapState | null;
  turnNumber: number;
  gridType: GridType;
  alertModifier: number;
  dispatch: Dispatch<HeistCityAction>;
}): AdvisorHookReturn;
```

### Return Type

```typescript
AdvisorHookReturn {
  entries: AdvisorEntry[];
  clearEntries: () => void;
  updateConfig: (config: Partial<AdvisorConfig>) => void;
}
```

### Behavior

**Change detection:** The hook keeps a ref of the previous `mapState`. On each render where `mapState` changes, it diffs to find:
- Characters that moved (position changed) → `validateMovement`
- Characters whose state changed → `validateStateChange`
- Characters whose wounds changed → validate damage
- Characters whose VP changed → `validateVPAward`

**Turn end detection:** When `turnNumber` increments → `validateTurnEnd` + `validateAlertLevel`

**Entry management:**
- New entries are dispatched via `ADD_ADVISOR_ENTRY`
- Entries accumulate until cleared (by the user or on new turn)
- Entries respect `shouldShow(entry, config)` filtering

### Performance

Diffs are computed via a Map keyed by character ID. Only changed characters are validated — no full-list iteration on every render.

---

## 6.4 components/AIControlsPanel.tsx — AI Controls UI

A panel in the game UI for enabling/configuring the AI opponent.

### Props

```typescript
AIControlsPanelProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  difficulty: 'easy' | 'normal' | 'hard';
  onDifficultyChange: (d: 'easy' | 'normal' | 'hard') => void;
  playerNumber: 1 | 2;
  onPlayerNumberChange: (p: 1 | 2) => void;
  isThinking: boolean;
  isExecuting: boolean;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  lastReasoning: string;
  error: string | null;
}
```

### Layout

```
┌─ AI Opponent ──────────────────────────────┐
│  [Toggle: Off/On]                           │
│                                             │
│  Team: [Blue ▼]    Difficulty: [Normal ▼]   │
│                                             │
│  Status: Thinking... / Executing... / Idle  │
│  ┌─ Last Decision ─────────────────────┐    │
│  │ "Ninja moves to (3,2) to hack the   │    │
│  │  computer — 1 VP opportunity"        │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [Pause] [Resume]                           │
│                                             │
│  ⚠ Error: ... (if any)                      │
└─────────────────────────────────────────────┘
```

### Behavior

- Toggle enables/disables AI. When disabled, AI controller is reset.
- Team selector chooses which team the AI controls (default: Player 2 / Red).
- Difficulty selector: Easy / Normal / Hard with tooltip descriptions.
- Status shows current AI state with a spinner during thinking/executing.
- Last Decision shows the AI's reasoning for its most recent activation.
- Pause/Resume buttons appear during AI execution.
- Error section shows if the AI encountered an issue, with a "Retry" button.

---

## 6.5 components/AdvisorPanel.tsx — Advisor UI

Displays advisor entries with filtering and muting controls.

### Props

```typescript
AdvisorPanelProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  entries: AdvisorEntry[];
  config: AdvisorConfig;
  onConfigChange: (config: AdvisorConfig) => void;
  onClear: () => void;
}
```

### Layout

```
┌─ Rules Advisor ────────────────────────────┐
│  [Toggle: Off/On]    Severity: [Info ▼]     │
│                                             │
│  Muted: [movement] [×] [combat] [×]        │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ ⚠ Ninja moved 7 hexes (max 5)       │   │
│  │   category: movement | warning       │   │
│  ├──────────────────────────────────────┤   │
│  │ ℹ Brain not activated this turn      │   │
│  │   category: turn-order | info        │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  [Clear All]           3 entries            │
└─────────────────────────────────────────────┘
```

### Behavior

- Toggle enables/disables the advisor entirely.
- Severity dropdown: Info (show all) / Warning (skip info) / Error (errors only).
- Muted categories shown as chips with remove buttons. Click a category name in an entry to mute it.
- Entries list scrolls, newest at bottom (same pattern as GameLog).
- Each entry shows severity icon, message, category, and character name if applicable.
- Clear All removes displayed entries.
- Entry count badge shows total (including filtered).

### Severity Icons

- `info` → ℹ (blue)
- `warning` → ⚠ (yellow)
- `error` → ✕ (red)

---

## 6.6 hooks/useHeistCityState.ts — State Extensions

### New State Fields

Add to `HeistCityState`:

```typescript
// AI Controller state
aiEnabled: boolean;                    // is AI active
aiDifficulty: 'easy' | 'normal' | 'hard';
aiPlayerNumber: 1 | 2;
aiStatus: 'idle' | 'thinking' | 'executing' | 'paused' | 'error';
aiError: string | null;

// Rules Advisor state
advisorEnabled: boolean;
advisorConfig: AdvisorConfig;
advisorEntries: AdvisorEntry[];
```

### New Initial State Values

```typescript
aiEnabled: false,
aiDifficulty: 'normal',
aiPlayerNumber: 2,
aiStatus: 'idle',
aiError: null,
advisorEnabled: false,
advisorConfig: DEFAULT_ADVISOR_CONFIG,
advisorEntries: [],
```

### New Reducer Actions

```typescript
| { type: 'SET_AI_ENABLED'; enabled: boolean }
| { type: 'SET_AI_DIFFICULTY'; difficulty: 'easy' | 'normal' | 'hard' }
| { type: 'SET_AI_PLAYER'; playerNumber: 1 | 2 }
| { type: 'SET_AI_STATUS'; status: 'idle' | 'thinking' | 'executing' | 'paused' | 'error'; error?: string }
| { type: 'SET_ADVISOR_ENABLED'; enabled: boolean }
| { type: 'SET_ADVISOR_CONFIG'; config: AdvisorConfig }
| { type: 'ADD_ADVISOR_ENTRY'; entry: AdvisorEntry }
| { type: 'CLEAR_ADVISOR_ENTRIES' }
```

### Reducer Cases

All cases are simple field updates. `ADD_ADVISOR_ENTRY` appends to the array (same pattern as `ADD_LOG_ENTRY`). `CLEAR_ADVISOR_ENTRIES` resets to `[]`.

---

## 6.7 components/GameLog.tsx — Extended Log Entries

### Extended LogEntry Type

```typescript
interface LogEntry {
  id: string;
  timestamp: number;
  type: 'dice-roll' | 'ai-action' | 'ai-plan' | 'npc-action';
  playerName: string;

  // dice-roll fields (existing)
  dice1?: number;
  dice2?: number;
  total?: number;

  // ai-action fields (new)
  characterName?: string;
  actionName?: string;
  targetName?: string;
  result?: string;           // "Hit for 3 damage" / "Missed" / "Hacked successfully"

  // ai-plan fields (new)
  reasoning?: string;        // "Aggressive posture — prioritizing VP"

  // npc-action fields (new)
  npcType?: string;           // "Guard" / "Elite" / "Turret"
  npcActionDesc?: string;     // "Guard moves to (3,2) and attacks Ninja"
}
```

### Extended Rendering

Add a switch on `entry.type` in the render function:

- **`dice-roll`** — existing rendering (no change)
- **`ai-action`** — `[AI] [HH:MM:SS] CharName: ActionName → Result`
  - Styled with a subtle AI indicator (e.g., robot icon or "AI" badge)
  - Result colored: green for success, red for miss/fail
- **`ai-plan`** — `[AI] [HH:MM:SS] Planning: Reasoning`
  - Italicized, lighter text to distinguish from actions
- **`npc-action`** — `[NPC] [HH:MM:SS] NpcType: ActionDesc`
  - Styled differently from player/AI entries (e.g., orange accent)

### Backward Compatibility

Existing `dice-roll` entries work unchanged. New fields are optional so old log entries still render.

---

## 6.8 hooks/useHeistCitySocket.ts — Socket Extensions

### New Emitter

**`emitAILogBroadcast(entries: LogEntry[])`**

When the AI completes an activation, broadcast the generated log entries to other players so their game logs stay in sync. This uses a new socket event:

```typescript
emitAILogBroadcast: (entries: LogEntry[]) => {
  socket.emit('heist-city-ai-log', { lobbyId, entries });
}
```

### New Listener

**`heist-city-ai-log`** — When received, dispatch `ADD_LOG_ENTRY` for each entry. This ensures other players see AI actions in their game log even though the AI only runs in one browser.

### No New Game-Action Events

AI game actions (move, attack, hack) use the existing emitters (`emitCharacterUpdate`, `emitDiceRoll`). No new game-action socket events are needed.

---

## 6.9 HeistCityGame.tsx — Orchestration Changes

### New State/Hooks

Add to the component body:

```typescript
// AI Controller hook
const ai = useAIController({
  enabled: state.aiEnabled,
  difficulty: state.aiDifficulty,
  playerNumber: state.aiPlayerNumber,
  mapState: state.mapState,
  turnNumber: state.turnNumber,
  gridType: state.gridType,
  alertModifier: state.alertModifier,
  emitters: { emitCharacterUpdate, emitDiceRoll, emitMapStateChange, emitGameInfoUpdate },
  dispatch,
});

// Rules Advisor hook
const advisor = useRulesAdvisor({
  enabled: state.advisorEnabled,
  config: state.advisorConfig,
  mapState: state.mapState,
  turnNumber: state.turnNumber,
  gridType: state.gridType,
  alertModifier: state.alertModifier,
  dispatch,
});
```

### Turn Passing

Modify `handlePassTurn` to check AI status:

```typescript
const handlePassTurn = () => {
  // ... existing reset logic ...

  // If AI is enabled and it's now the AI's turn, the hook auto-triggers
  // No explicit call needed — useAIController watches turnNumber changes
};
```

### Disable Human Input During AI Turn

When `ai.isThinking || ai.isExecuting`, disable:
- Character dragging
- Action slot assignment
- Pass Turn button
- Add a visual overlay or "AI is playing..." indicator

### New UI Elements

Add to the render tree:

1. **AI Controls Panel** — in the sidebar or below the game info panel
2. **Advisor Panel** — in the sidebar, below AI controls (or as a collapsible section)
3. **AI Status Indicator** — inline with the turn display ("Turn 3 — AI thinking...")

### Layout Sketch

```
┌─ Header ────────────────────────────────────────┐
├─ GameMap ────────────────────────────────────────┤
│                                                  │
├─ Game Info ──────────┬─ AI Controls ─────────────┤
│ Turn: 3              │ AI: On  Difficulty: Normal │
│ [Pass Turn]          │ Status: Executing...       │
├──────────────────────┴───────────────────────────┤
├─ Blue Team ──────────┬─ Red Team (AI) ───────────┤
│ TeamInfoPanel        │ TeamInfoPanel              │
├──────────────────────┴───────────────────────────┤
├─ Game Log ────────────────────────────────────────┤
├─ Advisor Panel (collapsible) ─────────────────────┤
├─ Character Cards ─────────────────────────────────┤
└───────────────────────────────────────────────────┘
```

---

## Testing

### Test Strategy

Phase 6 modules are thin glue — most logic is tested in Phases 1–5. Phase 6 tests focus on:
- Correct wiring (does the adapter call the right emitter?)
- State transitions (does the hook update status correctly?)
- Edge cases (what happens if AI is disabled mid-turn?)

### Test Files

| File | Tests | Focus |
|------|-------|-------|
| `ai/__tests__/aiAdapter.test.ts` | ~10 | Adapter calls correct emitters, builds log entries |
| `hooks/__tests__/useAIController.test.ts` | ~8 | Hook lifecycle, auto-trigger, pause/resume |
| `hooks/__tests__/useRulesAdvisor.test.ts` | ~6 | Change detection, entry creation, filtering |

### Key Test Scenarios

**AI Adapter:**
```
Setup: AI activation with Move to (3,0) + Attack at (4,0)
Action: executeActivation(activation, mapState, ...)
Verify: emitCharacterUpdate called with { position: {x:3, y:0} }
        emitDiceRoll called with valid 2d6 values
        Results array has 2 entries
        Log entries have correct type and details
```

**AI Controller Hook:**
```
Setup: AI enabled, turn changes from 1 to 2, AI controls player 2
Action: Hook detects turnNumber change
Verify: isThinking becomes true
        planTurn called on AIController
        isExecuting becomes true after planning
        After all activations: isExecuting false, status idle
```

**Rules Advisor Hook:**
```
Setup: Advisor enabled, character moves from (0,0) to (7,0), movement = 5
Action: mapState changes with new position
Verify: validateMovement called with old/new position
        AdvisorEntry created with category 'movement', severity 'warning'
        Entry dispatched via ADD_ADVISOR_ENTRY
```

**Disable mid-turn:**
```
Setup: AI is executing, user toggles AI off
Action: ai.enabled becomes false
Verify: Current activation completes (don't abandon mid-action)
        No further activations are started
        Status becomes 'idle'
```

---

## Suggested Implementation Order

1. ✅ Extend `useHeistCityState.ts` — add new state fields and reducer actions
2. ✅ Extend `GameLog.tsx` — extend LogEntry type and rendering
3. ✅ `ai/aiAdapter.ts` — build and test the adapter
4. ✅ `hooks/useAIController.ts` — build the AI lifecycle hook
5. ✅ `hooks/useRulesAdvisor.ts` — build the advisor hook
6. ✅ `components/AIControlsPanel.tsx` — build the AI controls UI
7. ✅ `components/AdvisorPanel.tsx` — build the advisor panel UI
8. ✅ Extend `hooks/useHeistCitySocket.ts` — add AI log broadcasting
9. ✅ Wire into `HeistCityGame.tsx` — connect everything

Steps 3 and 5 are independent and can be developed in parallel.
Steps 6 and 7 are independent and can be developed in parallel.
Step 9 depends on all previous steps.

---

## Future Extensions

- **AI action replay:** Record all AI decisions for post-game analysis. Show which options were considered and why the chosen action scored highest.
- **AI commentary mode:** AI explains its reasoning in real-time chat bubbles ("I'm moving Ninja to the computer because it's unguarded and worth 1 VP").
- **Remote AI:** Move AI computation to the server for faster execution and to prevent client-side cheating in competitive modes.
- **Advisor auto-correct suggestions:** When the advisor flags a violation, offer a "Fix" button that reverts to the correct state (opt-in, not enforced).
