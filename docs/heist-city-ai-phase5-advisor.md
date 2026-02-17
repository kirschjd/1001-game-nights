# Phase 5: Rules Advisor

**Goal:** Provide soft validation for human players. After a human takes an action, the rules engine checks it and logs any potential violations. This is advisory only — it never blocks actions.

**Dependencies:** Phase 1 (rules engine), Phase 2 (spatial reasoning for movement/range validation)

**Independent of:** Phases 3 and 4 (NPC automation and AI controller). Can be developed in parallel.

**New directory:** `src/components/games/heist-city/engine/advisor/`

---

## Design Philosophy

The Rules Advisor is a **referee taking notes**, not a **bouncer at the door**.

- Human actions always go through immediately
- After each action, the advisor evaluates what happened against the rules
- If something looks off, it logs an advisory entry
- Advisories are visible in the game log but don't interrupt play
- Categories can be muted (useful when experimenting with rule changes)

This serves two purposes:
1. **For players:** Gentle reminders about rules they might have forgotten
2. **For the game designer:** Data about which rules are confusing or frequently violated — signals for rules that may need simplifying

---

## Module Overview

| Module | Complexity | Purpose |
|--------|-----------|---------|
| `advisor/advisorConfig.ts` | Small | Configurable severity levels and muting |
| `advisor/advisorLog.ts` | Small | Advisory entry types and creation |
| `advisor/rulesAdvisor.ts` | Large | All validation logic |
| `advisor/index.ts` | Small | Barrel export |

---

## 5.1 advisor/advisorConfig.ts — Configuration

### Types

```typescript
/** Severity levels */
AdvisorSeverity = 'info' | 'warning' | 'error'

/** Rule categories that can be individually muted */
RuleCategory =
  | 'movement'        // moved too far, moved through walls
  | 'action-slots'    // used too many actions, invalid slot assignment
  | 'targeting'       // attacked out of range, no LOS, attacked wrong type
  | 'state'           // invalid state transition
  | 'turn-order'      // acted out of turn, activated twice
  | 'combat'          // incorrect damage, missed defense save application
  | 'equipment'       // used equipment incorrectly, over budget
  | 'vp'              // VP awarded incorrectly
  | 'alert'           // alert level doesn't match overt count

/** Configuration */
AdvisorConfig {
  enabled: boolean
  mutedCategories: Set<RuleCategory>
  minSeverity: AdvisorSeverity   // 'info' = show all, 'warning' = skip info, 'error' = only errors
}
```

### Default Config
```typescript
DEFAULT_ADVISOR_CONFIG = {
  enabled: true,
  mutedCategories: new Set(),
  minSeverity: 'info'
}
```

### Functions

**`shouldShow(entry, config): boolean`**
Check if an advisory entry passes the current filter (not muted, meets severity threshold).

**`muteCategory(config, category): AdvisorConfig`**
Return new config with category muted.

**`unmuteCategory(config, category): AdvisorConfig`**
Return new config with category unmuted.

---

## 5.2 advisor/advisorLog.ts — Advisory Entries

### Types

```typescript
AdvisorEntry {
  id: string                    // unique ID
  timestamp: number             // Date.now()
  category: RuleCategory
  severity: AdvisorSeverity
  message: string               // human-readable description
  characterId?: string          // which character was involved
  characterName?: string        // display name
  actionId?: string             // which action triggered it
  details?: Record<string, unknown>  // extra context for debugging
}
```

### Functions

**`createAdvisorEntry(category, severity, message, details?): AdvisorEntry`**
Factory function with auto-generated ID and timestamp.

---

## 5.3 advisor/rulesAdvisor.ts — Validation Logic

The main advisor. Contains validators for each category of game action.

### Trigger Points

The advisor runs at specific moments:

| Trigger | What's Validated | When Called |
|---------|-----------------|------------|
| Character moves | Movement distance, path legality | After `emitCharacterUpdate` with new position |
| Actions assigned | Slot costs, action availability, state restrictions | After action slots are filled |
| State changes | Transition legality (e.g., can they go Hidden right now?) | After `emitCharacterUpdate` with new state |
| Dice roll | Correct skill used, modifiers applied | After `emitDiceRoll` with combat context |
| VP awarded | VP type eligibility, correct amount | After `emitCharacterUpdate` with VP change |
| Turn passed | All activations complete, alert level correct | After `handlePassTurn` |
| Damage applied | Wound tracking, state transitions on 0 wounds | After `emitCharacterUpdate` with wound change |

### Functions

**`validateMovement(character, fromPos, toPos, mapState, gridType, config): AdvisorEntry[]`**
Checks after a character token is moved:
- Distance: Is the hex distance within the character's effective movement?
- Path: Is there a valid path (no walls in the way)?
- Bounds: Is the destination within the map?

Example advisories:
- `warning` / `movement`: "Ninja moved 7 hexes but movement is 5"
- `info` / `movement`: "Brain moved through a wall at (3,5)"
- `warning` / `movement`: "Muscle moved but is Stunned (can only Wake Up)"

**`validateActionSlots(character, assignedActions, config): AdvisorEntry[]`**
Checks after actions are assigned to slots:
- Total slot cost doesn't exceed 3
- Actions are available to this character (role + state + equipment)
- State restrictions respected (Stunned = only Wake Up)
- Continuation slots are properly filled
- Limit-1-per-game abilities not used twice

Example advisories:
- `error` / `action-slots`: "Face assigned 4 actions but only has 3 slots"
- `warning` / `action-slots`: "Ninja used Ninja Vanish but is already Hidden"
- `error` / `action-slots`: "Brain used 'All According to Plan' but it was already used this game"

**`validateStateChange(character, oldState, newState, actionId, config): AdvisorEntry[]`**
Checks after a character's state changes:
- Is this transition valid given the action taken?
- Did the correct trigger cause this transition?
- Are auto-transitions missing? (e.g., attacked with non-silent weapon but still Hidden)

Example advisories:
- `warning` / `state`: "Ninja changed to Hidden without using Ninja Vanish"
- `warning` / `state`: "Face attacked with Plink Gun (not Disguised-compatible) but is still Disguised"
- `info` / `state`: "Muscle went from Overt to Hidden — check if valid ability was used"

**`validateCombatAction(attacker, target, weaponId, reportedHit, reportedDamage, diceRoll, mapState, gridType, config): AdvisorEntry[]`**
Checks after a combat action:
- Was the target in weapon range?
- Did the attacker have LOS to the target?
- Was the correct skill used (MS for melee, BS for ranged)?
- Was the repeat penalty applied (+1 per repeat)?
- Does the reported damage match the weapon damage?
- Into-melee penalty applied if shooting into melee?

Example advisories:
- `warning` / `targeting`: "Long Gun has range 20 but target is 22 hexes away"
- `warning` / `targeting`: "LOS to target blocked by wall at (5,3)"
- `info` / `combat`: "This is the 2nd ranged attack this turn — DC should be BS+1"
- `warning` / `combat`: "Reported 4 damage but Plink Gun only does 2"

**`validateVPAward(character, vpChange, mapState, turnState, config): AdvisorEntry[]`**
Checks when VP changes on a character:
- What action justified this VP?
- Was the VP amount correct?
- Were conditions met? (e.g., Get Mob Intel requires Disguised state)

Example advisories:
- `warning` / `vp`: "VP awarded to Face but no hack check was rolled this turn"
- `info` / `vp`: "VP for Get Mob Intel — verify Face was Disguised and adjacent to mob"

**`validateAlertLevel(mapState, alertModifier, displayedLevel, config): AdvisorEntry[]`**
Checks that the displayed alert level matches the actual count:
- Count all Overt + Stunned + Unconscious characters + modifier
- Compare to displayed level

Example advisories:
- `warning` / `alert`: "Alert level shows 1 but 6 units are overt (should be level 2)"

**`validateTurnEnd(mapState, turnState, config): AdvisorEntry[]`**
Checks at end of turn:
- Were all characters activated? (or were some skipped without being exhausted?)
- Is the alert level up to date?
- Were end-of-turn effects applied? (actions cleared, exhausted reset)

Example advisories:
- `info` / `turn-order`: "Brain was not activated this turn"
- `warning` / `alert`: "Turn ended but alert level wasn't recalculated"

---

## Integration with Existing Code (Deferred to Phase 6)

> **Note:** All UI integration — wiring validation into `HeistCityGame.tsx`,
> extending `GameLog.tsx`, adding advisor state to `useHeistCityState.ts`,
> and the `AdvisorPanel` component — is deferred to
> [Phase 6: Integration](heist-city-ai-phase6-integration.md), which
> consolidates all React/socket wiring for both the AI Controller and
> the Rules Advisor. See Phase 6 for full specifications.

---

## Testing

### New test directory
`src/components/games/heist-city/engine/advisor/__tests__/`

### Test scenarios

**Movement validation:**
```
Setup: Ninja (M=5) moves from (0,0) to (3,0) — 3 hexes
Expected: No advisories (valid move)

Setup: Ninja (M=5) moves from (0,0) to (7,0) — 7 hexes
Expected: warning/movement "Ninja moved 7 hexes but movement is 5"

Setup: Brain moves from (0,0) to (3,0), wall at (2,0)
Expected: info/movement "Path blocked by wall at (2,0)"
```

**State change validation:**
```
Setup: Ninja is Hidden, fires Machine Gun (no Notice.H flag)
Ninja state remains Hidden (player forgot to change)
Expected: warning/state "Ninja attacked with Machine Gun (not Hidden-compatible) but state is still Hidden"

Setup: Face uses Face Off ability, state changes to Disguised
Expected: No advisories (valid transition)
```

**Combat validation:**
```
Setup: Plink Gun range is 7. Target is 10 hexes away.
Expected: warning/targeting "Target is 10 hexes away but Plink Gun range is 7"
```

**Muting:**
```
Setup: Config has 'movement' muted. Ninja moves 7 hexes.
Expected: Entry is created but shouldShow() returns false
```

**Alert level:**
```
Setup: 6 overt characters, alert modifier 0. UI shows level 1.
Expected: warning/alert "6 overt units → should be alert level 2 (shown as 1)"
```

---

## Suggested Implementation Order Within Phase 5

1. `advisorConfig.ts` + `advisorLog.ts` (types and utilities) ✅
2. `rulesAdvisor.ts` — implement validators one at a time: ✅
   a. `validateMovement` ✅
   b. `validateAlertLevel` ✅
   c. `validateActionSlots` ✅
   d. `validateStateChange` + `validateStealthAfterAttack` ✅
   e. `validateCombatAction` ✅
   f. `validateVPAward` ✅
   g. `validateTurnEnd` ✅
3. `index.ts` (barrel export) ✅
4. ~~Integration: wire into HeistCityGame.tsx~~ → Deferred to Phase 6
5. ~~UI: add advisor entries to GameLog~~ → Deferred to Phase 6

---

## Future Extensions

- **Post-game summary:** Aggregate all advisories from a game session into a report. Useful for the game designer to spot patterns (e.g., "movement violations happened 12 times — maybe movement rules are unclear").
- **Rule change tracking:** When rules change, update the advisor and run it against saved game replays to see how the new rules would have affected past games.
- **Severity auto-escalation:** If the same violation happens multiple times in a game, escalate from `info` to `warning`.
