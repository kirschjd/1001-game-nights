# Phase 4: AI Controller

**Goal:** Build a full AI player that controls one team. The AI uses utility-based scoring to evaluate actions and executes them through the existing socket emitters so they sync to all players.

**Dependencies:** Phases 1 (rules engine), 2 (spatial reasoning), 3 (NPC automation — AI needs to predict NPC behavior)

**New directory:** `src/components/games/heist-city/ai/`

---

## Design Overview

The AI has three layers:

1. **Strategic Layer** — "What are our objectives this game?" (evaluated per turn)
2. **Tactical Layer** — "Which character should activate next and what should they do?" (evaluated per activation)
3. **Execution Layer** — "Perform the action through the game UI" (adapter to socket emitters)

### Decision Flow

```
Turn Start
  │
  ▼
Strategic Planning
  - Evaluate board position (VP differential, threats, objectives)
  - Determine posture (aggressive / balanced / defensive / escape)
  - Prioritize objectives (computers, info drops, combat, escape)
  - Assign characters to objectives
  │
  ▼
For each activation:
  │
  Tactical Scoring
  - Get legal actions for character (from rules engine)
  - Score each action against weighted criteria
  - Apply difficulty filter (randomness for easy mode)
  - Select best action
  │
  ▼
  Execution
  - Select character in UI
  - Assign actions to slots
  - Execute (move token, roll dice, apply results)
  - Wait for animation delay
  │
  ▼
  Re-evaluate
  - Update plan based on actual outcomes
  - Adjust priorities if situation changed
  │
  ▼
Next activation (or pass turn)
```

---

## Module Overview

| Module | Complexity | Purpose |
|--------|-----------|---------|
| `ai/types.ts` | Small | AI-specific types (ScoredAction, BoardEvaluation, etc.) |
| `ai/utilityScoring.ts` | Large | Score possible actions for a character |
| `ai/characterEvaluation.ts` | Medium | Evaluate a character's board position |
| `ai/threatAssessment.ts` | Medium | Evaluate threats from enemies and NPCs |
| `ai/teamCoordination.ts` | Medium | Determine activation order |
| `ai/strategicPlanning.ts` | Large | Objective prioritization and strategy selection |
| `ai/aiController.ts` | Large | Main controller class — ties everything together |
| `ai/aiAdapter.ts` | Medium | Bridge between AI decisions and game UI |
| `hooks/useAIController.ts` | Medium | React hook for integrating AI into game component |
| `ai/index.ts` | Small | Barrel export |

---

## 4.1 ai/types.ts — AI-Specific Types

### Key Types

```typescript
/** A scored action candidate */
ScoredAction {
  action: LegalAction         // from engine
  characterId: string
  targetPosition?: Position
  targetId?: string
  score: number               // overall utility (higher = better)
  breakdown: ScoreBreakdown   // how score was computed
}

/** Score breakdown for debugging and tuning */
ScoreBreakdown {
  vpValue: number             // expected VP gain
  damageValue: number         // expected damage dealt (weighted)
  safetyValue: number         // how safe character is after action
  positionValue: number       // strategic positioning quality
  objectiveProgress: number   // progress toward objectives
  alertPenalty: number        // cost of raising alert level
  synergy: number             // team coordination bonus
}

/** AI difficulty presets */
AIDifficulty {
  name: 'easy' | 'normal' | 'hard'
  lookAheadDepth: number      // 0=greedy, 1=considers NPC response
  randomness: number          // 0.0=always best, 1.0=random
  objectiveWeight: number     // VP vs combat emphasis
  safetyWeight: number        // risk aversion
}

/** Board evaluation snapshot */
BoardEvaluation {
  playerVP: number
  opponentVP: number
  vpDifferential: number
  alertLevel: number
  turnsRemaining: number
  objectivesAvailable: ObjectiveInfo[]
  characterHealth: Map<string, { current: number; max: number; state: CharacterState }>
  threats: ThreatAssessment[]
  strategicPosture: 'aggressive' | 'balanced' | 'defensive' | 'escape'
}

/** Info about a map objective */
ObjectiveInfo {
  type: 'computer' | 'info-drop' | 'escape-zone' | 'enemy-character'
  position: Position
  targetId: string
  vpValue: number
  assignedTo?: string         // character ID
  turnsToReach?: number       // estimated turns to complete
}

/** Threat to an AI character */
ThreatAssessment {
  characterId: string         // which AI character is threatened
  threatSourceId: string      // enemy character or NPC ID
  threatType: 'melee' | 'ranged' | 'npc'
  expectedDamagePerTurn: number
  distanceInMoves: number
  urgency: 'low' | 'medium' | 'high' | 'critical'
}

/** Full turn plan */
AITurnPlan {
  activationOrder: string[]
  characterPlans: Map<string, ScoredAction[]>
  strategicGoal: string       // human-readable
  boardEval: BoardEvaluation
}
```

### Difficulty Presets

```typescript
EASY:    { lookAheadDepth: 0, randomness: 0.4, objectiveWeight: 0.5, safetyWeight: 0.8 }
NORMAL:  { lookAheadDepth: 1, randomness: 0.1, objectiveWeight: 0.7, safetyWeight: 0.5 }
HARD:    { lookAheadDepth: 1, randomness: 0.0, objectiveWeight: 0.8, safetyWeight: 0.3 }
```

- **Easy:** Picks from top 3 options randomly, plays safe, doesn't optimize VP hard
- **Normal:** Usually picks best option, considers NPC response, balanced approach
- **Hard:** Always optimal, aggressive VP pursuit, accepts risk

---

## 4.2 ai/utilityScoring.ts — Action Scoring

The core brain. Each legal action gets a weighted score across multiple dimensions.

### Functions

**`scoreActions(character, legalActions, mapState, turnState, gridType, difficulty, boardEval): ScoredAction[]`**
Score all legal actions for a character. Returns sorted by score (highest first).

**`scoreAction(character, action, mapState, turnState, gridType, difficulty, boardEval): ScoredAction`**
Score a single action. Combines all sub-scores with weights.

### Sub-scoring Functions

**`scoreVPValue(action, character, mapState, turnState): number`**
Expected VP gain from this action:
- Hack computer: P(success) * 1 VP
- Upload info drop: P(success) * 1 VP
- Attack enemy at low health: P(kill) * 1 VP (first down)
- Reveal hidden/disguised: P(successful hit) * 1 VP
- Get mob intel (disguised): P(charm success) * 1 VP
- Move toward deployment zone on turn 5: fractional VP based on proximity

**`scoreCombatValue(action, character, mapState, gridType): number`**
Expected damage dealt minus expected retaliation:
- Use `expectedDamage()` from engine/combat.ts for attack value
- Estimate retaliation damage based on enemy weapons and range after move
- Value downing an enemy higher than just dealing damage (removes a threat)

**`scoreSafetyValue(action, character, mapState, gridType, boardEval): number`**
How safe is the character after this action:
- Is the destination in cover?
- How many enemies can target us at the new position?
- Expected NPC damage at new position (via `previewNPCPhase()` from Phase 3)
- Character's remaining wounds relative to incoming threats

**`scorePositionValue(position, character, mapState, gridType, boardEval): number`**
Strategic quality of a position:
- Distance to assigned objective (closer = better)
- Distance to deployment zone (matters more on later turns)
- Number of hexes from nearest threat
- Cover availability
- Proximity to teammates (for Brain's support abilities)

**`scoreAlertPenalty(action, character, mapState, currentAlertLevel): number`**
Penalty for actions that raise alert level:
- Going from Hidden/Disguised to Overt increases revealed count
- Crossing alert thresholds is especially costly (level 1→2 means NPCs get 2 actions)
- Higher penalty on early turns (alert level matters less on turn 5)

**`scoreSynergy(action, character, teamPlan, mapState, gridType): number`**
Bonus for team coordination:
- Brain moving to help a teammate (Go Over There, All According to Plan)
- Face using "Not the Mook You're Looking For" on a threatened ally
- Muscle drawing aggro with "All Eyes On Me" when allies are vulnerable
- Characters converging on the same objective area

### Weight Balancing
The overall score is: `Σ(weight_i * subscore_i)` where weights come from the difficulty preset and strategic posture:

| Posture | VP | Combat | Safety | Position | Alert | Synergy |
|---------|-----|--------|--------|----------|-------|---------|
| Aggressive | 1.0 | 0.8 | 0.3 | 0.5 | 0.2 | 0.4 |
| Balanced | 0.7 | 0.5 | 0.5 | 0.6 | 0.5 | 0.5 |
| Defensive | 0.4 | 0.3 | 0.9 | 0.7 | 0.8 | 0.6 |
| Escape | 0.3 | 0.1 | 0.7 | 1.0 | 0.3 | 0.3 |

These weights are tunable. Initial values will need playtesting to refine.

---

## 4.3 ai/characterEvaluation.ts — Board Position Evaluation

### Functions

**`evaluateCharacterPosition(character, mapState, gridType): CharacterPositionScore`**
How good is this character's current position?
- Health percentage
- Cover status
- Threats in range
- Distance to nearest objective
- Distance to deployment zone
- Character state (Hidden > Disguised > Overt in terms of safety)

**`evaluateTeamPosition(mapState, playerNumber, gridType): number`**
Aggregate score for the entire team's position. Used to compare "how is the game going?"

---

## 4.4 ai/threatAssessment.ts — Threat Evaluation

### Functions

**`assessThreats(mapState, gridType, playerNumber): ThreatAssessment[]`**
Enumerate all threats to the AI's characters:
- Enemy player characters that can attack us
- NPCs (based on alert level and targeting rules)
- Turrets with LOS to our characters

**`assessCharacterThreat(character, mapState, gridType): ThreatAssessment[]`**
Threats to one specific character.

**`predictNPCThreat(character, mapState, gridType, alertLevel): number`**
Expected damage from NPCs next turn if character stays at current position. Uses NPC targeting logic from Phase 3 to predict which NPCs would attack this character.

---

## 4.5 ai/teamCoordination.ts — Activation Order

### Functions

**`planActivationOrder(mapState, turnState, gridType, difficulty, playerNumber): string[]`**
Decide the order to activate characters. Considerations:
- Characters in immediate danger activate first (can escape or fight back)
- Characters near objectives activate early (capitalize on positioning)
- Brain may activate first or last depending on "All According to Plan" (moves all allies 1)
- Face may activate early to set up disguise/immunity effects for others
- On turn 5, characters far from deployment zone activate first (need more time to escape)

**`selectNextCharacter(activationOrder, turnState, mapState): string | null`**
Pick the next character to activate right now, respecting the alternating activation constraint. Returns null if all characters have activated (AI should pass).

---

## 4.6 ai/strategicPlanning.ts — Strategy Selection

### Functions

**`evaluateBoard(mapState, turnState, gridType, playerNumber): BoardEvaluation`**
Full board evaluation. Computes VP differential, available objectives, threats, and recommends strategic posture.

**`getStrategicPosture(boardEval, difficulty): 'aggressive' | 'balanced' | 'defensive' | 'escape'`**
Choose strategy based on situation:
- **Aggressive:** We're behind on VP or it's early game — prioritize scoring
- **Balanced:** Game is close — mix of objectives and survival
- **Defensive:** We're ahead on VP — protect the lead, avoid risks
- **Escape:** Turn 4-5 and need to get to deployment zone

**`prioritizeObjectives(mapState, gridType, playerNumber, boardEval): ObjectiveInfo[]`**
Rank all available objectives by priority:
- Uncontested computers nearby = high priority
- Info drops that can be extracted = high VP (3 points)
- Low-health enemies = opportunistic
- Deployment zone proximity on late turns = critical

**`assignCharactersToObjectives(objectives, characters, mapState, gridType): Map<string, ObjectiveInfo>`**
Match characters to objectives based on capability and proximity:
- Brain → computers (best Hack stat)
- Face → charm-based VP (disguised, Get Mob Intel)
- Ninja → infiltration objectives (Hidden, fast movement)
- Muscle → combat/tanking (draw aggro, protect allies)
- Spook → flexible (good movement, CQC Technique for melee picks)

Uses a simple assignment algorithm: sort objectives by priority, greedily assign the closest capable character.

---

## 4.7 ai/aiController.ts — Main Controller

Stateful class that manages one team's decisions across a full turn.

### Class: AIController

**Constructor:** `new AIController(playerNumber, difficulty, gridType)`

**`planTurn(mapState, turnState): AITurnPlan`**
Called at the start of the AI's turn. Runs the full strategic evaluation and pre-plans all activations.

**`getNextActivation(mapState, turnState): AIActivation | null`**

```typescript
AIActivation {
  characterId: string
  actions: Array<{
    slotIndex: number
    actionId: string
    target?: Position | string
  }>
  reasoning: string        // human-readable explanation
}
```

Returns the next character to activate and their planned actions. Returns null when all characters have been activated.

**`onActionResolved(characterId, actionId, result, updatedMapState): void`**
Called after each action resolves with the actual dice results. The AI updates its internal plan:
- If an attack missed, the AI might change subsequent actions
- If a character was downed, threats are recalculated
- If VP was scored, strategic priorities may shift

**`applyDifficultyFilter(scoredActions): ScoredAction`** (private)
Applies randomness based on difficulty:
- Easy: randomly pick from top 3 options (weighted toward higher scores)
- Normal: 90% best option, 10% second-best
- Hard: always best option

---

## 4.8 ai/aiAdapter.ts — Game Integration (Deferred to Phase 6)

> **Note:** This module and all UI integration items below are deferred to
> [Phase 6: Integration](heist-city-ai-phase6-integration.md), which
> consolidates all React/socket wiring for both the AI Controller and
> the Rules Advisor. See Phase 6 for full specifications of:
> - `ai/aiAdapter.ts` — bridge between AI decisions and socket emitters
> - `hooks/useAIController.ts` — React hook for AI lifecycle management
> - UI changes to `HeistCityGame.tsx`, `useHeistCityState.ts`, `GameLog.tsx`
> - AI Controls Panel component

---

## Testing

### New test directory
`src/components/games/heist-city/ai/__tests__/`

### Test scenarios

**Utility Scoring:**
```
Setup: Ninja at (0,0), computer at (2,0), enemy at (5,0), movement = 5
Expected: Moving toward computer scores higher than moving toward enemy
         (VP value of hack > expected damage from attack)
```

**Strategic Planning:**
```
Setup: Turn 5, team behind by 2 VP, 3 characters near deployment zone
Expected: Posture = "escape", characters prioritize getting to deployment zone
```

**Activation Order:**
```
Setup: Brain at (0,0) with "All According to Plan" unused. All allies in good position.
Expected: Brain activates first to move all allies 1 closer to objectives
```

**Difficulty Filter:**
```
Setup: 3 actions scored [10, 8, 6]
Easy mode (randomness 0.4): picks randomly from all 3 (weighted)
Hard mode (randomness 0.0): always picks score 10
Run 100 times, verify distribution matches expected randomness.
```

**End-to-end:**
```
Setup: Full game state with both teams deployed
Action: Run one complete AI turn
Verify: All actions were legal (validated by rules engine)
        State changes are consistent (no impossible states)
        VP was correctly awarded
        Turn advanced properly
```

---

## Suggested Implementation Order Within Phase 4

1. `types.ts` (type definitions) ✅
2. `threatAssessment.ts` (needed by scoring) ✅
3. `characterEvaluation.ts` (needed by scoring) ✅
4. `utilityScoring.ts` (core brain) ✅
5. `teamCoordination.ts` (activation order) ✅
6. `strategicPlanning.ts` (objective assignment) ✅
7. `aiController.ts` (orchestrator) ✅
8. `index.ts` (barrel export) ✅
9. ~~`aiAdapter.ts`~~ → Deferred to Phase 6
10. ~~`useAIController.ts`~~ → Deferred to Phase 6
11. ~~UI integration~~ → Deferred to Phase 6
