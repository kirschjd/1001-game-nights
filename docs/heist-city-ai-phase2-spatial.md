# Phase 2: Spatial Reasoning

**Goal:** Add pathfinding, line-of-sight, range queries, cover detection, and movement validation. These are the "eyes and legs" for both NPC automation and the AI controller.

**Dependencies:** Phase 1 (engine types). Can be developed in parallel with Phase 1 if types are agreed on first.

**New directory:** `src/components/games/heist-city/engine/spatial/`

**Builds on:** Existing `GridUtils` interface (`data/gridUtils.ts`), hex math (`data/hexGridUtils.ts`)

---

## Module Overview

| Module | Complexity | Purpose |
|--------|-----------|---------|
| `spatial/wallMap.ts` | Medium | Precomputed obstacle lookup for fast pathfinding/LOS |
| `spatial/pathfinding.ts` | Large | A* pathfinding on hex grid with wall awareness |
| `spatial/lineOfSight.ts` | Large | Bresenham-adapted LOS for hex grid |
| `spatial/rangeQueries.ts` | Medium | Find characters/items within range |
| `spatial/coverDetection.ts` | Medium | Determine if target has cover from attacker |
| `spatial/movementValidation.ts` | Medium | Validate moves against movement stat and obstacles |
| `spatial/index.ts` | Small | Barrel export |

---

## 2.1 spatial/wallMap.ts — Precomputed Obstacle Map

Builds a fast lookup from `MapState.items` so pathfinding and LOS don't scan all items every query. Should be rebuilt whenever the map state changes (wall destroyed, item moved).

### Functions

**`buildWallMap(mapState, gridType): Set<string>`**
Creates a Set of position keys (e.g., `"3,-5"` for hex axial coords) for all wall and blocking items. Used by pathfinding and LOS.

Items that block movement:
- `wall` type items
- `table` type items (block movement but provide cover, don't block LOS)

**`buildItemPositionMap(mapState): Map<string, MapItem>`**
Maps position keys to their items for quick property lookups (cover, destructible, etc.).

**`isBlocked(position, wallMap): boolean`**
Fast O(1) check if a position is impassable.

**`isOccupiedByCharacter(position, mapState, excludeCharacterId?): boolean`**
Check if another character is standing on a position.

**`getCoverAt(position, itemMap): MapItem[]`**
Get all cover-providing items at or adjacent to a position.

### Performance Note
Wall maps should be cached and only rebuilt when map items change (rare during normal play). A simple version counter can invalidate the cache.

---

## 2.2 spatial/pathfinding.ts — A* Pathfinding

Hex-grid pathfinding using A* with `hexDistance` as the heuristic.

### Functions

**`findPath(start, goal, wallMap, mapState, gridType, maxDistance, excludeCharacterId?): Position[] | null`**
A* pathfinding from start to goal.
- Uses `getNeighbors()` from `GridUtils` for expansion
- Uses `hexDistance()` for heuristic (admissible for hex grids)
- Respects walls (blocked positions), character positions (can't walk through others)
- Returns the path as an array of positions, or null if unreachable within maxDistance
- `excludeCharacterId` prevents the moving character from blocking itself

**`getReachablePositions(start, maxDistance, wallMap, mapState, gridType, excludeCharacterId?): Map<string, ReachableCell>`**
Dijkstra/BFS flood-fill from start position. Returns all positions reachable within movement budget.

```typescript
ReachableCell {
  position: Position
  distance: number        // movement cost to reach
  path: Position[]        // shortest path from start
}
```

This is used by:
- The AI to evaluate all possible move destinations
- Movement validation to check if a destination is reachable
- The Rules Advisor to flag "moved too far" violations

**`getMoveCost(from, to, gridType): number`**
Movement cost between adjacent cells. Currently always 1, but designed to support difficult terrain in the future (per rules: "Difficult terrain takes 1 extra movement to enter or leave").

### Algorithm Details
- **Heuristic:** `hexDistance(current, goal)` — admissible and consistent for hex grids
- **Neighbor expansion:** 6 hex neighbors via `getNeighbors()`
- **Blocked check:** `isBlocked(neighbor, wallMap) || isOccupiedByCharacter(neighbor, mapState)`
- **Termination:** Goal reached, or all nodes within maxDistance exhausted

### Existing code to leverage
- `hexGridUtils.ts` already provides `getNeighbors()` returning 6 axial neighbors (the HEX_DIRECTIONS constant)
- `hexDistance()` for heuristic
- `isWithinHexBounds()` for pruning out-of-bounds neighbors

---

## 2.3 spatial/lineOfSight.ts — Line of Sight

Determines if two positions can "see" each other on a hex grid.

### Rules
- **Walls** block LOS completely
- **Tables** do NOT block LOS but provide cover (defense bonus)
- **Characters** do NOT block LOS
- **Smoke grenades** block LOS for 1 turn (future: read from map item properties)

### Functions

**`hasLineOfSight(from, to, wallMap, itemMap, gridType): LOSResult`**

```typescript
LOSResult {
  clear: boolean           // true if no wall blocks the line
  blockedBy?: Position     // first wall position that blocks
  coverPositions: Position[]  // tables/obstacles along the line (provide cover)
}
```

**`hexLineDraw(from, to): Position[]`**
Draws a hex line between two points using the Red Blob Games algorithm:
1. Convert axial coords to cube coords
2. Linearly interpolate N steps (N = hex distance)
3. Round each interpolated point to the nearest hex
4. Return the sequence of hexes

This is the standard hex line-draw algorithm. The existing `hexGridUtils.ts` already references Red Blob Games as the source for hex math.

**`getVisiblePositions(from, maxRange, wallMap, itemMap, gridType): Set<string>`**
Casts LOS rays from `from` to every hex within `maxRange`. Returns the set of all visible positions. Useful for:
- Determining what a character can see
- Finding all valid ranged attack targets
- Mob targeting (can the turret see any overt character?)

### Algorithm: Hex Line Draw
For hex grids, the standard approach is:
1. Compute `N = hexDistance(from, to)`
2. For `i = 0 to N`: lerp in cube coordinates, round to nearest hex
3. Check each hex along the line against the wall map

Edge case: When the line passes exactly between two hexes (ambiguous), check both. If either is blocked, LOS is blocked. (Conservative approach — benefits defenders.)

---

## 2.4 spatial/rangeQueries.ts — Range Queries

Find things within range of a position. Used constantly by the AI and NPC systems.

### Functions

**`getCharactersInRange(position, range, mapState, gridType, filterFn?): CharacterToken[]`**
Find all characters within `range` hex distance. Optional filter (e.g., only Overt, only enemy team).

**`getItemsInRange(position, range, mapState, gridType, filterFn?): MapItem[]`**
Find all map items within range. Used for finding hackable computers, pickupable items, etc.

**`getEnemiesInRange(position, range, mapState, gridType): MapItem[]`**
Shorthand: get all NPC enemy items (security-guard, elite, camera) within range.

**`canTarget(attacker, targetPosition, weaponRange, wallMap, itemMap, gridType): TargetResult`**

```typescript
TargetResult {
  inRange: boolean          // within weapon range
  hasLOS: boolean           // clear line of sight
  hasCover: boolean         // target has cover from attacker
  distance: number          // hex distance
}
```

Combines range check + LOS check + cover check into one call. The most-used function in combat evaluation.

**`getAdjacentCharacters(position, mapState, gridType): CharacterToken[]`**
Characters in the 6 neighboring hexes. Used for melee range checks and "into melee" penalty detection.

---

## 2.5 spatial/coverDetection.ts — Cover Detection

### Rules
- Difficult terrain adjacent to a character, blocking direct LOS to enemy, provides partial cover
- Doesn't apply if the character is ON the difficult terrain
- Tables provide cover (defense bonus) but don't block LOS

### Functions

**`hasCover(attackerPos, targetPos, wallMap, itemMap, gridType): CoverResult`**

```typescript
CoverResult {
  covered: boolean
  coverType: 'none' | 'partial'
  defenseBonus: number       // +1 for partial cover
}
```

Checks if any cover-providing item lies along the LOS line between attacker and target.

**`findBestCoverPosition(character, threatsFrom, reachablePositions, wallMap, itemMap, gridType): Position | null`**
AI helper: given a set of threat positions and reachable destinations, find the position that provides the most cover. Scores positions by counting how many threats they're covered from.

---

## 2.6 spatial/movementValidation.ts — Movement Validation

### Movement Rules (from ruleset)
- Movement stat = number of squares/hexes a character can move
- Diagonal movement costs 1 (same as cardinal)
- Can't move through walls
- Difficult terrain costs extra to enter/leave
- Equipment bonuses add to movement
- Special movement types:
  - **Hustle** (2-slot action, Overt only): move up to M + some bonus
  - **Sprint** (3-slot action, Overt only): move up to M + larger bonus
  - **Ninja Vanish** (2-slot): set Hidden + move 3
  - **CQC Technique** (Spook, 1-slot): move 3 then melee attack
  - **All According to Plan** (Brain, 3-slot): move every allied unit 1
  - **Go Over There** (Brain, 2-slot): move an allied unit or mob 1

### Functions

**`validateMove(character, destination, mapState, gridType): MoveValidation`**

```typescript
MoveValidation {
  valid: boolean
  reason?: string            // "Destination is 6 hexes away but movement is 4"
  path?: Position[]          // shortest valid path
  distance?: number          // path length
}
```

Uses `getReachablePositions()` to check if the destination is within movement range via a valid path.

**`getEffectiveMovement(character, actionType): number`**
Computes effective movement for an action type:
- `'move'`: base M + equipment bonuses
- `'hustle'`: needs clarification from rules (currently 2-slot Overt action)
- `'sprint'`: needs clarification (currently 3-slot Overt action)
- `'ninja-vanish'`: fixed 3 hexes
- `'cqc-technique'`: fixed 3 hexes

**`validateMoveAndAttack(character, moveDest, targetPos, moveDistance, mapState, gridType): MoveValidation`**
For combo actions like CQC Technique: validate the move portion, then check if the target is adjacent to the destination.

---

## Testing

### New test directory
`src/components/games/heist-city/engine/spatial/__tests__/`

### Test approach
Build small, hand-crafted hex maps (5-10 hexes) with known wall placements.

### Example test scenarios

**Pathfinding:**
```
Map: 5 hexes in a line, wall at position 3
Start: position 1, Goal: position 5
Expected: path goes around the wall (7 hexes total)
```

**Line of Sight:**
```
Map: Attacker at (0,0), Target at (3,0), Wall at (1,0)
Expected: LOS blocked by wall at (1,0)

Map: Attacker at (0,0), Target at (3,0), Table at (2,0)
Expected: LOS clear, but cover detected at (2,0)
```

**Movement Validation:**
```
Character: Ninja (M=5), at position (0,0)
Destination: (3,2) — hex distance 3
Expected: valid, path returned

Destination: (6,0) — hex distance 6
Expected: invalid, "movement is 5 but destination is 6 hexes away"
```

**Range Queries:**
```
Attacker with Long Gun (range 20) at (0,0)
Target at (15,0) — hex distance 15
Expected: in range, check LOS
```

---

## Integration Notes

### Extends Phase 1
- `engine/actions.ts`'s `getLegalActions()` now populates `validDestinations` (for move actions) and `validTargets` (for attack/hack/charm actions) using spatial queries
- `engine/combat.ts`'s attack resolution can incorporate cover bonuses from `hasCover()`

### Used by Phases 3-5
- Phase 3 (NPCs): pathfinding for mob movement, LOS for ranged mob attacks
- Phase 4 (AI): reachable positions for move evaluation, target finding for combat scoring
- Phase 5 (Advisor): movement validation to flag "moved too far" or "moved through wall"

### Existing code leveraged
- `createGridUtils(gridType)` from `data/gridUtils.ts` — unified interface
- `hexDistance()`, `getNeighbors()`, `isWithinHexBounds()` from `data/hexGridUtils.ts`
- `getDistance()`, `getCellDistance()` from grid utils

## Suggested Implementation Order Within Phase 2

1. `wallMap.ts` (foundation for everything else)
2. `pathfinding.ts` (core capability)
3. `lineOfSight.ts` (needed for rangeQueries and cover)
4. `rangeQueries.ts` (combines distance + LOS)
5. `coverDetection.ts` (extends LOS)
6. `movementValidation.ts` (wraps pathfinding)
7. `index.ts` (barrel export)
