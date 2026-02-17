# Phase 1: Rules Engine

**Goal:** Formalize all Heist City game rules as pure, stateless functions. These take game state as input and return results without side effects. This is the foundation everything else builds on.

**Dependencies:** None — only imports from existing `data/` and `types/` files.

**New directory:** `src/components/games/heist-city/engine/`

---

## Module Overview

| Module | Complexity | Purpose |
|--------|-----------|---------|
| `engine/types.ts` | Small | Engine-specific types (RollResult, CombatResult, LegalAction, etc.) |
| `engine/dice.ts` | Small | Dice rolling abstraction + probability math for AI |
| `engine/actions.ts` | Large | Action legality — what can a character legally do right now? |
| `engine/combat.ts` | Large | Attack rolls, defense saves, damage application |
| `engine/stateTransitions.ts` | Medium | Character state change rules and triggers |
| `engine/turnStructure.ts` | Medium | Turn phases, alternating activations, NPC phase timing |
| `engine/victoryPoints.ts` | Medium | VP calculation, scoring events, end-of-game tally |
| `engine/alertLevel.ts` | Small | Alert level computation (formalized from AlertLevelIndicator) |
| `engine/index.ts` | Small | Barrel export |

---

## 1.1 engine/types.ts — Engine-Specific Types

Types that the rules engine needs but are not UI concerns. Extends the existing types in `types/index.ts`.

### Key Types

```typescript
/** Result of rolling 2d6 */
DiceRollResult { dice1: number; dice2: number; total: number }

/** Outcome of a single attack */
AttackResult {
  hit: boolean
  roll: DiceRollResult
  targetNumber: number        // the DC that was needed
  damage: number              // weapon damage (0 if miss)
  weaponId: string
  attackerState: CharacterState
}

/** Outcome of a defense save */
DefenseResult {
  saved: boolean
  roll: DiceRollResult
  targetNumber: number
  damageReduced: number
  finalDamage: number         // damage after defense
}

/** Full combat exchange */
CombatResult {
  attack: AttackResult
  defense: DefenseResult | null   // null if attack missed
  targetWoundsAfter: number
  targetStateAfter: CharacterState
  targetDowned: boolean
}

/** A legal action a character can take right now */
LegalAction {
  actionId: string
  name: string
  slotCost: number
  requiresTarget: boolean
  validTargets?: string[]       // character/item IDs
  validDestinations?: Position[] // for move actions (populated by Phase 2)
  metadata?: Record<string, unknown>
}

/** Turn phase tracking */
TurnPhase = 'player-activation' | 'npc-phase' | 'end-of-turn' | 'game-over'

TurnState {
  turnNumber: number            // 1-5
  phase: TurnPhase
  activePlayerNumber: 1 | 2
  activationsRemaining: Map<string, boolean>  // characterId -> activated?
  npcPhaseComplete: boolean
}

/** VP event tracking */
VPEventType = 'hack-computer' | 'hack-info-drop' | 'info-drop-extract'
            | 'down-enemy' | 'reveal-hidden' | 'reveal-disguised'
            | 'mob-intel' | 'escape'

VPEvent {
  type: VPEventType
  characterId: string
  points: number
  turnNumber: number
  description: string
}

/** Alert level state */
AlertLevelState {
  level: 0 | 1 | 2 | 3
  unitsRevealed: number
  modifier: number
  total: number
  npcActionsPerActivation: number
}
```

---

## 1.2 engine/dice.ts — Dice Abstraction

Wraps 2d6 rolling so the AI can compute expected values with the same interface used for real resolution.

### Functions

**`roll2d6(): DiceRollResult`**
Roll 2d6 using Math.random().

**`rollVsTarget(targetNumber): { result: DiceRollResult; success: boolean; margin: number }`**
Roll 2d6 and check against a DC. `margin` = roll - target (positive = exceeded by that much).

**`probability2d6(target): number`**
Returns exact probability of rolling >= target on 2d6. Used by AI for expected-value calculations.
- target 2 → 1.0 (always succeeds)
- target 7 → 0.583 (21/36)
- target 12 → 0.028 (1/36)
- target 13+ → 0.0 (impossible)

**`expectedSuccessMargin(target): number`**
Average margin of success (how much you beat the DC by) when the roll succeeds. Used for defense save calculations.

**`all2d6Outcomes(): DiceRollResult[]`**
All 36 possible outcomes for exhaustive expected-value computation.

---

## 1.3 engine/actions.ts — Action Legality

The core question: given the full game state and a character, what are all legal actions?

### Functions

**`getLegalActions(character, mapState, turnState, gridType): LegalAction[]`**
Returns the strict set of legal actions. This is what the AI uses. It builds on the existing `getAvailableActions()` from `data/characters/actionUtils.ts` but adds:
- Slot availability check (enough remaining slots?)
- State restrictions (Stunned = only Wake Up, Unconscious = nothing)
- Target validation (is there something in range to attack/hack/charm?)
- Cooldown tracking ("Limit: 1 per game" abilities that have already been used)
- Repeat penalty tracking (how many times has this attack been used this turn?)

Note: In Phase 1, target validation uses simple distance checks (`hexDistance`). Phase 2 upgrades this with proper pathfinding and LOS.

**`isActionLegal(character, actionId, target, mapState, turnState, gridType): { legal: boolean; reason?: string }`**
Validates a specific action. Returns a reason string if illegal (used by the Rules Advisor in Phase 5).

**`getRemainingSlots(character): number`**
Counts empty action slots, accounting for continuation markers.

**`canActivate(character, turnState): boolean`**
Can this character still be activated this turn? Checks exhausted flag and whether they've already activated.

**`getRepeatPenalty(character, actionId): number`**
Per rules: "Repeated attacks on the same turn increase the required MS/BS number by 1." Returns the cumulative penalty.

### Dependencies
- `getAvailableActions()` from `data/characters/actionUtils.ts`
- `getActionCost()` from `data/characters/actionCosts.ts`
- `STATE_DATA` from `data/characters/stateAbilities.ts`
- `getEquipmentById()` from `data/equipmentLoader.ts`
- `hexDistance()` from `data/hexGridUtils.ts` (basic range check)

---

## 1.4 engine/combat.ts — Combat Resolution

Resolves attacks, defense saves, and skill checks.

### Attack Resolution Rules (from ruleset)
- **Melee:** Roll 2d6 vs Melee Skill (MS). If total > MS, it's a hit. Damage = weapon damage.
- **Ranged:** Roll 2d6 vs Ballistic Skill (BS). If total > BS, it's a hit. Range must be within weapon range.
- **Repeat penalty:** +1 to DC per repeat of the same attack type this turn.
- **Into melee:** Ranged attacks into melee increase hit roll by 1 (harder).
- **Hidden bonus:** -1 to hit, +1 damage against undamaged enemies.
- **Disguised melee bonus:** -1 to hit, +1 damage with melee weapons.

### Defense Resolution Rules
- Roll 2d6 vs Defense (D). If total >= D, prevent 1 damage. Each point exceeding D prevents 1 more.
- Overt characters get +1 to defense rolls.

### Wound Rules
- Wounds reaching 0: character becomes Stunned for a turn.
- After being Stunned and waking up: wounds reset to 4.
- Reaching 0 wounds again: character becomes Unconscious (out of fight).

### Functions

**`resolveRangedAttack(attacker, target, weaponId, roll, mapState): AttackResult`**
Resolves a ranged attack with the given dice roll. Applies BS modifiers, repeat penalties, into-melee penalty, state bonuses.

**`resolveMeleeAttack(attacker, target, weaponId, roll, mapState): AttackResult`**
Resolves a melee attack. Applies MS modifiers, repeat penalties, state bonuses (Hidden/Disguised).

**`resolveDefenseSave(defender, incomingDamage, roll): DefenseResult`**
Rolls defense. If roll >= Defense stat, reduces damage by 1 + (roll - Defense).

**`applyDamage(target, finalDamage): { updatedTarget: CharacterToken; stateChanged: boolean; vpAwarded: boolean }`**
Applies damage to wounds. Handles Stunned/Unconscious transitions. Flags if first time reaching 0 wounds (1 VP).

**`resolveHackCheck(character, roll, difficulty): { success: boolean; margin: number }`**
Roll 2d6 vs Hack stat + difficulty modifier. Per rules: computers use "opposed hack" (end of round), info drops use "Hack +1".
- Hidden characters get +1 to hack rolls.

**`resolveCharmCheck(character, roll, difficulty): { success: boolean; margin: number }`**
Roll 2d6 vs Charm stat + difficulty modifier.
- Disguised characters get +1 to charm rolls.

**`resolveOpposedRoll(char1, char2, stat): { winner: string; char1Margin: number; char2Margin: number }`**
Both characters roll 2d6 vs their respective stat. The one with more successes (margin over DC) wins.

**`expectedDamage(attacker, target, weaponId, mapState): number`**
Expected value calculation for AI. Computes: P(hit) * weaponDamage - P(hit) * P(defend) * expectedReduction.

### Dependencies
- `getEffectiveStats()` from `data/equipmentLoader.ts`
- `getEquipmentById()` from `data/equipmentLoader.ts`
- `ENEMY_STATS` from `data/characters/enemyStats.ts`
- `probability2d6()` from `engine/dice.ts`

---

## 1.5 engine/stateTransitions.ts — Character State Changes

Rules for when character states change.

### State Transition Rules (from ruleset)

| Trigger | From | To |
|---------|------|----|
| Attack with non-Hidden weapon | Hidden | Overt |
| Attack with non-Disguised weapon | Disguised | Overt |
| Move in melee range of a mob | Hidden | Overt |
| Take any stun effect | Any | Stunned |
| Wounds reach 0 (first time) | Any | Stunned |
| Wounds reach 0 (second time) | Stunned/Overt | Unconscious |
| Use "Wake Up" (3-slot action) | Stunned | Overt |
| Use "Face Off" (Face ability) | Any | Disguised |
| Use "Ninja Vanish" (Ninja ability) | Any | Hidden |
| Use "Go Loud" | Hidden/Disguised | Overt |
| Successful melee hit on Hidden target | Hidden (target) | Overt |

### Functions

**`getStateTransition(character, actionId, weaponId, actionResult): CharacterState | null`**
Given an action and its result, returns the new state (or null if no change).

**`preservesHiddenState(weaponId): boolean`**
Checks equipment's Notice.H flag. Silenced weapons and certain tools preserve Hidden.

**`preservesDisguisedState(weaponId): boolean`**
Checks equipment's Notice.D flag.

**`applyStateTransitions(character, actionId, weaponId, combatResult): CharacterToken`**
Applies all state transitions and returns the updated character.

**`getStateModifiers(state): { hitModifier: number; damageModifier: number; defenseModifier: number; hackModifier: number; charmModifier: number }`**
Returns all combat modifiers for a given state:
- Overt: +1 defense
- Hidden: -1 to hit, +1 damage vs undamaged, +1 hack
- Disguised: -1 to hit melee, +1 damage melee, +1 charm

### Dependencies
- `STATE_DATA` from `data/characters/stateAbilities.ts`
- `getEquipmentById()` from `data/equipmentLoader.ts` (for Notice flags)

---

## 1.6 engine/turnStructure.ts — Turn & Activation Management

### Turn Structure Rules (from ruleset)
- Game is 5 turns
- Turn 1 initiative goes to deploying player; initiative alternates each turn
- Players alternate activating one character at a time
- If Player A has more unactivated characters than Player B, A continues solo after B finishes
- After all player activations: NPC phase
- After NPC phase: end-of-turn effects (clear actions, reset exhausted, recalculate alert)

### Functions

**`createInitialTurnState(mapState): TurnState`**
Initialize turn 1 with all characters unactivated.

**`getNextActivatingPlayer(turnState, mapState): 1 | 2`**
Which player activates next? Alternates, but if one side is fully activated, the other continues.

**`markActivated(turnState, characterId): TurnState`**
Mark a character as having activated this turn.

**`allPlayersActivated(turnState, mapState): boolean`**
Check if all non-Unconscious characters have been activated.

**`advanceToNPCPhase(turnState): TurnState`**
Transition to NPC phase.

**`advanceToEndOfTurn(turnState): TurnState`**
Transition to end-of-turn cleanup.

**`advanceToNextTurn(turnState, mapState): TurnState`**
Increment turn number, reset all activations. If turn > 5, set phase to 'game-over'.

**`getEndOfTurnEffects(mapState): Partial<MapState>`**
Returns updates to apply: clear action arrays, reset exhausted flags (except Unconscious).

---

## 1.7 engine/victoryPoints.ts — VP Calculation

### VP Rules (from ruleset)

| Action | VP | Condition |
|--------|----|-----------|
| Hack computer (opposed) | 1 | Successful opposed hack check at end of turn |
| Upload info (from info drop) | 1 | Hack +1 check while holding info drop, 1/turn/drop |
| Extract info drop | 3 | Carry info drop to deployment zone by end of combat |
| Down enemy (first time) | 1 | Reduce enemy to 0 wounds for the first time |
| Reveal hidden/disguised | 1 | Force enemy from Hidden/Disguised to Overt |
| Get mob intel | 1 | Disguised character, Charm +2 check on mob, 1/turn |
| Escape | 1 | Each character in deployment zone at end of turn 5 |

### Functions

**`awardVP(character, eventType, turnNumber): VPEvent`**
Create a VP event record.

**`calculateTeamVP(mapState, playerNumber): number`**
Sum all VP for a team from character `victoryPoints` fields.

**`calculateEscapeVP(mapState, zones, turnNumber, playerNumber): VPEvent[]`**
At turn 5: check which characters are in their deployment zone.

**`getVPOpportunities(character, mapState, turnState, gridType): Array<{ type, targetId, estimatedVP }>`**
List all VP-scoring opportunities available to a character right now. Used by the AI to evaluate action value. Considers:
- Nearby computers (can hack at end of turn)
- Held info drops (can upload)
- Nearby enemies (can attack/reveal)
- Nearby mobs (can get intel if disguised)
- Distance to deployment zone (escape on turn 5)

### Dependencies
- Spatial queries from Phase 2 for proximity checks (Phase 1 uses simple distance)

---

## 1.8 engine/alertLevel.ts — Alert Level Computation

Formalizes the logic currently in `components/AlertLevelIndicator.tsx`.

### Alert Level Rules (from ruleset)
- Count all Overt + Stunned + Unconscious characters (both teams) + alert modifier
- Level 0 (total 0-2): Guards passive, 0 actions
- Level 1 (total 3-5): Guards attack overt, 1 action
- Level 2 (total 6-7): Guards attack overt, 2 actions
- Level 3 (total 8+): All previous + elite spawns on security portals

### Functions

**`computeAlertLevel(mapState, alertModifier): AlertLevelState`**
Returns the current alert level with all derived values.

**`getNPCActionCount(alertLevel): number`**
How many actions do NPCs get this turn?

**`shouldSpawnElites(alertLevel): boolean`**
Does alert level 3 trigger elite spawns?

**`predictAlertLevel(mapState, alertModifier, hypotheticalOvertCount): AlertLevelState`**
"What would the alert level be if N more characters went Overt?" Used by AI to evaluate the cost of losing stealth.

---

## Testing

### New test directory
`src/components/games/heist-city/engine/__tests__/`

### Test files
- `dice.test.ts` — Verify probability calculations match 2d6 distribution
- `actions.test.ts` — Given character states and equipment, verify legal action sets
- `combat.test.ts` — With predetermined rolls, verify hit/miss/damage/defense outcomes
- `stateTransitions.test.ts` — Verify all state transition triggers
- `turnStructure.test.ts` — Verify alternating activation, turn advancement, end-of-turn cleanup
- `victoryPoints.test.ts` — Verify VP awards for each event type
- `alertLevel.test.ts` — Verify threshold boundaries match ruleset

### Test approach
All engine functions are pure, so tests are simple: construct a game state, call the function, assert the output. No React rendering, no DOM, no mocks needed.

### Example test case
```
Given: Ninja is Hidden, equipped with Silenced Plink Gun (Notice: H)
When: Ninja fires Silenced Plink Gun
Then: Ninja remains Hidden (weapon preserves Hidden state)

Given: Ninja is Hidden, equipped with Machine Gun (no Notice flag)
When: Ninja fires Machine Gun
Then: Ninja transitions to Overt
```

---

## Integration Notes

Phase 1 does **not** modify any existing files. It adds a new `engine/` directory alongside `data/`, `components/`, and `hooks/`. The engine imports from existing data files but existing code does not yet import from the engine.

Subsequent phases wire the engine into the game:
- Phase 2 extends `actions.ts` with spatial validation
- Phase 3 uses `combat.ts` and `alertLevel.ts` for NPC behavior
- Phase 4 uses all of the above for AI decisions
- Phase 5 uses `actions.ts` and `combat.ts` for validation

## Suggested Implementation Order Within Phase 1

1. `types.ts` + `dice.ts` (foundations, quick wins)
2. `alertLevel.ts` (small, can verify against existing `AlertLevelIndicator`)
3. `stateTransitions.ts` (medium, needed by combat)
4. `combat.ts` (large, core mechanic)
5. `actions.ts` (large, depends on combat and state transitions)
6. `turnStructure.ts` (medium, standalone)
7. `victoryPoints.ts` (medium, standalone)
8. `index.ts` (barrel export)
