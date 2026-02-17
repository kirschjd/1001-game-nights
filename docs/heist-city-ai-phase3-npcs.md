# Phase 3: NPC Automation

**Goal:** Automate the NPC (mob) phase. After all player characters have activated each turn, NPCs act based on the alert level. Currently this phase has no implementation — NPCs sit on the map but never move or attack.

**Dependencies:** Phase 1 (combat resolution, alert level), Phase 2 (pathfinding, LOS, range queries)

**New directory:** `src/components/games/heist-city/engine/npc/`

---

## NPC Rules (from ruleset)

### Alert Levels and NPC Behavior
| Level | Overt Count | NPC Behavior |
|-------|-------------|-------------|
| 0 | 0-2 | All guards passive (0 actions) |
| 1 | 3-5 | Attack overt units, 1 action per NPC |
| 2 | 6-7 | Attack overt units, 2 actions per NPC |
| 3 | 8+ | All previous + elite spawns on security portals |

### NPC Types
| Type | M | MS | BS | W | D | Range | Damage | Notes |
|------|---|----|----|---|---|-------|--------|-------|
| Security Guard | 4 | 7 | N/A | 1 | 10 | N/A | 2 | Melee only |
| Turret | N/A | N/A | 7 | 1 | 8 | 12 | 2 | Ranged only, stationary |
| Elite | 4 | 7 | 9 | 1 | 7 | 7 | 3 | Both melee and ranged |

### NPC Targeting Rules
- NPCs move toward and attack the **nearest Overt character**
- NPCs **ignore Hidden characters** (they don't draw aggro)
- NPCs **ignore Disguised characters** (they don't draw aggro)
- When a mob can target more than 1 unit equally, use opposed Charm rolls to determine who gets attacked
- Characters with "Security Uniform" or "In Plain Sight" (Face ability) are immune to mobs

### NPC Action Rules
- Each NPC gets N actions based on alert level
- Actions are: move OR attack (same as player actions but simplified)
- Guards: move toward nearest Overt, melee attack if adjacent
- Turrets: ranged attack if target in range and LOS, otherwise idle
- Elites: ranged attack if target in range, or move toward nearest and melee

---

## Module Overview  

| Module | Complexity | Purpose |
|--------|-----------|---------|
| `npc/npcTargeting.ts` | Medium | Select which character each NPC targets |
| `npc/npcMovement.ts` | Medium | Pathfind NPCs toward their targets |
| `npc/npcActions.ts` | Medium | Resolve NPC attacks |
| `npc/npcPhase.ts` | Large | Orchestrate the full NPC phase |
| `npc/eliteSpawner.ts` | Small | Spawn elites at alert level 3 |
| `npc/index.ts` | Small | Barrel export |

---

## 3.1 npc/npcTargeting.ts — Target Selection

### Functions

**`selectMobTarget(npc, mapState, gridType): CharacterToken | null`**
Find the best target for a mob. Rules:
1. Filter to Overt characters only
2. Exclude characters with mob immunity (Security Uniform, "In Plain Sight" active)
3. Sort by distance (nearest first)
4. If tied on distance: prefer lower defense (easier to hit)
5. Return null if no valid targets (all Hidden/Disguised/immune)

**`isVisibleToMob(character): boolean`**
Returns false for Hidden, Disguised, characters with Security Uniform, characters under "In Plain Sight" effect.

**`resolveMobTargetTiebreak(candidates, npc, mapState): CharacterToken`**
When multiple characters are equally close, the rules say to use opposed Charm rolls. This function resolves that tiebreak.

---

## 3.2 npc/npcMovement.ts — NPC Pathfinding

### Functions

**`calculateNPCMove(npc, npcStats, target, mapState, gridType): NPCMoveResult | null`**

```typescript
NPCMoveResult {
  newPosition: Position
  path: Position[]
  distanceMoved: number
}
```

Uses A* pathfinding from `spatial/pathfinding.ts` to find a path to the target. The NPC moves along the path up to its movement stat (M=4 for guards and elites).

Returns null for:
- Turrets (they don't move)
- NPCs that are already adjacent to their target
- NPCs with no path to target (completely walled off)

**`isAdjacentToTarget(npcPosition, targetPosition, gridType): boolean`**
Check if the NPC is in melee range (adjacent hex).

---

## 3.3 npc/npcActions.ts — NPC Attack Resolution

### Functions

**`selectNPCAction(npc, npcStats, target, mapState, gridType): 'move' | 'melee-attack' | 'ranged-attack' | 'idle'`**
Determine what this NPC does with one action:
- **Guard:** melee-attack if adjacent, else move
- **Turret:** ranged-attack if target in range (12) with LOS, else idle
- **Elite:** ranged-attack if in range (7) with LOS, else melee-attack if adjacent, else move

**`resolveNPCAttack(npc, npcStats, target, attackType, roll, mapState, gridType): CombatResult`**
Resolve an NPC attack using the combat engine from Phase 1.
- Guards: roll 2d6 vs MS 7, damage 2
- Turrets: roll 2d6 vs BS 7, range 12, damage 2
- Elites: roll 2d6 vs MS 7 (melee) or BS 9 (ranged), damage 3

Target gets a defense save as normal.

**`getNPCAttackInfo(npc, npcStats, attackType): { skill: number; range: number; damage: number }`**
Extract the relevant attack stats for an NPC based on attack type.

---

## 3.4 npc/npcPhase.ts — Full NPC Phase Orchestration

This is the main entry point. Called after all player activations are complete.

### Functions

**`executeNPCPhase(mapState, alertLevel, gridType, rollProvider): NPCPhaseResult`**

```typescript
NPCPhaseResult {
  updatedMapState: MapState
  combatLog: NPCCombatLogEntry[]
  stateChanges: StateChangeEntry[]
  elitesSpawned: MapItem[]
}

NPCCombatLogEntry {
  npcId: string
  npcType: string
  action: 'move' | 'melee-attack' | 'ranged-attack' | 'idle'
  targetId?: string
  result?: CombatResult
  newPosition?: Position
}

StateChangeEntry {
  characterId: string
  oldState: CharacterState
  newState: CharacterState
  cause: string
}
```

Execution order:
1. Check alert level — if level 0, NPCs are passive (return empty result)
2. If alert level 3, spawn elites first
3. For each NPC on the map:
   a. Select target (nearest Overt character)
   b. Execute N actions (based on alert level) in sequence:
      - Each action: select action type → if move, pathfind → if attack, resolve combat
   c. Record all results
4. Return updated map state and combat log

The `rollProvider` parameter allows:
- Real games: pass `() => roll2d6()` for random outcomes
- Testing: pass predetermined rolls for deterministic tests
- AI preview: pass expected-value calculations

**`previewNPCPhase(mapState, alertLevel, gridType): NPCPhasePreview[]`**

```typescript
NPCPhasePreview {
  npcId: string
  targetId: string | null
  expectedDamage: number
  wouldReachTarget: boolean
}
```

AI helper: predicts NPC phase outcomes using expected values. The AI uses this to evaluate "if I go Overt, how much damage will NPCs do to me?"

---

## 3.5 npc/eliteSpawner.ts — Elite Spawning

### Functions

**`spawnElites(mapState, gridType): MapItem[]`**
At alert level 3: create new Elite map items at security portal locations.

**`findSecurityPortals(mapState): Position[]`**
Find all teleporter items on the map that serve as security spawn points. These are identified by map item type (`teleporter`) or a custom property.

**`hasElitesAlreadySpawned(mapState): boolean`**
Prevent double-spawning. Check if elites have already been spawned this game.

---

## Integration with Existing Code

### Changes to existing files

**`hooks/useHeistCityState.ts`** — New reducer action types:
- `EXECUTE_NPC_PHASE` — applies NPC phase results to map state (character damage, NPC positions, new elites)
- Extend `LogEntry` type handling for NPC action entries

**`components/GameLog.tsx`** — Extend `LogEntry` type:
```typescript
type LogEntryType = 'dice-roll' | 'npc-action' | 'npc-move' | 'npc-spawn'
```
New NPC log entries should be visually distinct (different color/icon).

**`HeistCityGame.tsx`** — Wire NPC phase into turn flow:
The `handlePassTurn` function currently just increments the turn counter. It needs to:
1. Check if we're transitioning from player phase to NPC phase
2. Call `executeNPCPhase()` with the current state
3. Apply results via reducer
4. Log NPC actions to game log
5. Then advance to next turn

### New UI considerations
- NPC actions should animate (show movement, show dice rolls) so the human player can follow what happened
- A "NPC Phase" indicator could appear during execution
- NPC combat log entries show up in the game log with timestamps

---

## Testing

### New test directory
`src/components/games/heist-city/engine/npc/__tests__/`

### Test scenarios

**Targeting:**
```
Setup: Guard at (5,0). Player chars: Hidden at (2,0), Overt at (8,0), Overt at (3,0)
Expected: Guard targets Overt at (3,0) (nearest Overt, ignores Hidden)
```

**Movement:**
```
Setup: Guard at (0,0), target at (6,0), wall at (3,0)
Expected: Guard moves 4 hexes along path around wall
```

**Combat:**
```
Setup: Guard adjacent to Overt Muscle (D=7, W=9). Roll = 8 (hits, MS=7). Muscle defense roll = 6.
Expected: Hit, 2 damage. Muscle defense fails (6 < 7). Muscle takes 2 damage, wounds = 7.
```

**Full NPC Phase:**
```
Setup: Alert level 1 (1 action each). 2 guards, 1 turret. 1 Overt character.
Expected: Both guards move toward character. Turret attacks if in range 12.
```

**Alert level 0:**
```
Setup: Alert level 0. Guards on map.
Expected: No NPC actions. Empty result.
```

---

## Suggested Implementation Order Within Phase 3

1. `npcTargeting.ts` (independent, just needs mapState)
2. `npcMovement.ts` (needs pathfinding from Phase 2)
3. `npcActions.ts` (needs combat from Phase 1)
4. `eliteSpawner.ts` (small, standalone)
5. `npcPhase.ts` (orchestrator, depends on all above)
6. Integration with `HeistCityGame.tsx` and reducer
7. `index.ts` (barrel export)
