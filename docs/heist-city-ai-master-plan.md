# Heist City AI Controller — Master Plan

## Overview

This project adds three capabilities to Heist City:

1. **Rules Engine** — Formalizes game rules as pure functions so a computer can reason about legality, combat, and state transitions
2. **AI Controller** — A client-side AI player that controls one team using utility-based decision making
3. **Rules Advisor** — Soft validation that flags potential rule violations for human players without blocking them

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Existing Codebase                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ types/   │  │ data/    │  │ hooks/   │  │ comps/ │ │
│  │ index.ts │  │ chars,   │  │ socket,  │  │ UI     │ │
│  │          │  │ equip,   │  │ state,   │  │        │ │
│  │          │  │ grid,    │  │ drag,    │  │        │ │
│  │          │  │ maps     │  │ viewport │  │        │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┘ │
│       │              │              │                    │
└───────┼──────────────┼──────────────┼────────────────────┘
        │              │              │
   ┌────▼──────────────▼──┐     ┌────▼──────────────────┐
   │   engine/ (Phases 1-3,5)│     │   ai/ (Phase 4)       │
   │                       │     │                       │
   │  Phase 1: Rules  ✅   │     │  - types.ts           │
   │  - actions.ts         │     │  - utilityScoring.ts  │
   │  - combat.ts          │     │  - threatAssessment   │
   │  - stateTransitions   │     │  - characterEval      │
   │  - turnStructure      │     │  - teamCoordination   │
   │  - victoryPoints      │     │  - strategicPlanning  │
   │  - alertLevel         │     │  - aiController.ts    │
   │  - dice               │     │                       │
   │                       │     └───────┬───────────────┘
   │  Phase 2: Spatial ✅  │             │
   │  - pathfinding.ts     │     ┌───────▼───────────────┐
   │  - lineOfSight.ts     │     │  Phase 6: Integration  │
   │  - rangeQueries       │     │  (React/sockets/UI)    │
   │  - coverDetection     │     │                       │
   │  - movementValidation │     │  - ai/aiAdapter.ts    │
   │  - wallMap             │     │  - hooks/useAI...     │
   │                       │     │  - AI Controls Panel  │
   │  Phase 3: NPCs   ✅   │     │  - Advisor wiring     │
   │  - npcTargeting       │     │  - AdvisorPanel       │
   │  - npcMovement        │     │  - GameLog extensions │
   │  - npcActions          │     │  - State reducer      │
   │  - npcPhase           │     └───────────────────────┘
   │  - eliteSpawner       │
   │                       │
   │  Phase 5: Advisor     │
   │  - rulesAdvisor       │
   │  - advisorConfig      │
   │  - advisorLog         │
   └───────────────────────┘
```

## Design Principles

### 1. Pure Functions First
Every engine function takes game state as input and returns output without side effects. No DOM, no React, no sockets. This makes them trivially testable and composable.

### 2. Advisory for Humans, Strict for AI
The same rules engine serves two consumers:
- **AI Controller** asks "what can I legally do?" → gets a filtered list of valid actions
- **Rules Advisor** asks "was what the human just did legal?" → produces advisory log entries

Humans are never blocked. The advisor flags potential violations in the game log so the game designer can spot rule confusion or necessary rule changes.

### 3. Hex First, Grid-Agnostic Interface
All spatial functions take a `gridType` parameter and delegate to the appropriate implementation. Hex is the primary target (most maps use it). The existing `GridUtils` abstraction in `data/gridUtils.ts` already provides a unified interface for both grid types.

### 4. Expected Values for Decisions, Real Dice for Resolution
The AI evaluates moves using probability math (`probability2d6(target)` returns the exact chance of rolling >= target on 2d6). But when it's time to resolve an action, real `Math.random()` dice are rolled through the existing `DiceRoller` component, so outcomes feel natural.

### 5. Easy to Update
Game rules are already data-driven (`CHARACTER_DATA`, `STATE_DATA`, `ENEMY_STATS`, `equipment.json`). The engine reads from these, so updating a stat or adding equipment doesn't require engine changes. Rule logic changes (e.g., "disguised characters now get +2 to melee instead of -1 to hit") are localized to the relevant engine function.

### 6. Client-Side AI
The AI runs in the human player's browser and controls the opposing team. It executes actions through the same socket emitters that human players use (`emitCharacterUpdate`, `emitMapStateChange`, `emitDiceRoll`), so actions automatically sync to all connected clients.

## What Exists vs. What's Needed

### Already Codified
- Character stats for all 5 roles (Face, Muscle, Ninja, Brain, Spook)
- Action cost/slot system with multi-slot support
- Available actions per character (role + state + equipment)
- State definitions and state-based action lists
- Equipment loading, stat bonuses, effective stat calculation
- Experience/level progression
- Hex and square grid math (distance, neighbors, bounds, snapping)
- Multiplayer socket sync with version tracking
- Game state persistence (save/load/export)

### Not Yet Codified (This Project Adds)
- Combat resolution (attack rolls, defense saves, damage)
- Movement validation (pathfinding, wall collision)
- Line-of-sight and cover
- State transition triggers (Hidden→Overt on non-silenced attack, etc.)
- Turn structure enforcement (alternating activations, NPC phase)
- NPC/mob behavior (targeting, movement, attacks)
- VP automation (earning, tracking, end-of-game calculation)
- Alert level mechanics (beyond the display component)
- AI decision making

## Phase Overview

| Phase | Name | Depends On | New Files | Scope | Status |
|-------|------|------------|-----------|-------|--------|
| 1 | [Rules Engine](heist-city-ai-phase1-rules-engine.md) | — | ~8 + tests | Formalize all game rules as pure functions | ✅ Done |
| 2 | [Spatial Reasoning](heist-city-ai-phase2-spatial.md) | Phase 1 | ~6 + tests | Pathfinding, LOS, cover, movement validation | ✅ Done |
| 3 | [NPC Automation](heist-city-ai-phase3-npcs.md) | Phases 1, 2 | ~5 + tests | Automate mob behavior during NPC phase | ✅ Done |
| 4 | [AI Controller](heist-city-ai-phase4-controller.md) | Phases 1, 2, 3 | ~8 + tests | AI decision engine (pure logic, no UI) | ✅ Done |
| 5 | [Rules Advisor](heist-city-ai-phase5-advisor.md) | Phases 1, 2 | ~3 + tests | Soft validation for human players | ✅ Done |
| 6 | [Integration](heist-city-ai-phase6-integration.md) | Phases 4, 5 | ~6 + comps | React/socket/UI wiring for AI + Advisor | ✅ Done |

### Dependency Graph

```
Phase 1: Rules Engine ✅
  │
  ├── Phase 2: Spatial Reasoning ✅
  │     │
  │     ├── Phase 3: NPC Automation ✅
  │     │     │
  │     │     └── Phase 4: AI Controller ✅
  │     │           │
  │     │           └── Phase 6: Integration ✅ (also needs Phase 5)
  │     │
  │     └── Phase 5: Rules Advisor ✅
  │           │
  │           └── Phase 6: Integration (also needs Phase 4)
  │
  └── Phase 5: Rules Advisor ✅ (also needs Phase 2)
```

Phases 3 and 5 are independent of each other and can be developed in parallel.
Phase 4 requires Phase 3 (AI needs to predict NPC behavior).
Phase 6 requires both Phases 4 and 5 (consolidates all React/socket/UI wiring).

## Key Existing Files Referenced

| File | What It Provides |
|------|-----------------|
| `types/index.ts` | `CharacterToken`, `MapState`, `Position`, `CharacterState`, `EquipmentItem`, `MapItem`, `GridType` |
| `data/characters/characterStats.ts` | `CHARACTER_DATA` — all role stats and abilities |
| `data/characters/stateAbilities.ts` | `STATE_DATA` — state definitions, state-based actions |
| `data/characters/actionUtils.ts` | `getAvailableActions()` — base action list per character |
| `data/characters/actionCosts.ts` | `getActionCost()`, `canSelectAction()` |
| `data/characters/actionSlots.ts` | `assignAction()`, `isContinuationSlot()` |
| `data/characters/enemyStats.ts` | `ENEMY_STATS` — security guard, elite, turret |
| `data/equipmentLoader.ts` | `getEffectiveStats()`, `getEquipmentById()` |
| `data/equipment.json` | All equipment items with stats, costs, specials |
| `data/gridUtils.ts` | `createGridUtils()` — unified grid interface |
| `data/hexGridUtils.ts` | `hexDistance`, `getNeighbors`, `getHexesInRadius` |
| `hooks/useHeistCitySocket.ts` | Socket emitters the AI adapter calls |
| `hooks/useHeistCityState.ts` | Reducer that manages game state |
| `components/AlertLevelIndicator.tsx` | Alert level thresholds (to formalize) |
| `components/GameLog.tsx` | `LogEntry` type (to extend for advisor/NPC/AI entries) |
| `HeistCityGame.tsx` | Main orchestrator (AI hooks get wired here) |
