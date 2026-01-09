# Henhur Refactor Plan

## Vision

Transform Henhur into a **playable, prototype-friendly game** with clean architecture that allows rapid iteration during playtesting.

---

## Guiding Principles

1. **Server is the source of truth** - All game logic, state, and card definitions live on the server
2. **Client is a thin view layer** - Renders what the server sends, emits user actions
3. **Single point of change** - Tweaking a rule or card should require changing ONE file
4. **Playable first, polished later** - Get the game working before making it pretty

---

## Architecture Overview

```
SERVER (owns everything important)
├── Game State: hands, decks, positions, tokens, turn/phase
├── Game Logic: rules enforcement, effect execution, win conditions
├── Card Definitions: single authoritative source
└── Game Config: constants (30 spaces, 3 laps, etc.)
         │
         │  Socket.io (player-specific views)
         ▼
CLIENT (thin view layer)
├── Renders game state from server
├── Sends user actions (select card, use tokens, draft)
├── UI components only
└── NO game logic, NO card definitions
```

---

## Current State Summary

### What's Working
- Server has game state management (`HenHurGameEnhanced.js`)
- Server has socket handlers (`henHurEvents.js`)
- Server has centralized config (`gameConfig.js`)
- Server has effect execution system (`gameUtils.js`)
- Auction pool generation works
- Priority dice rolling works
- Client fetches cards from server
- Lobby card selection works
- RaceTrack shows actual player positions
- AuctionTurnControls shows auction pool and drafting

### What's Resolved
- ✅ Card effects execute via `gameUtils.js`
- ✅ Auction pool generates from `generateAuctionPool()`
- ✅ RaceTrack.tsx replaced RaceMat.tsx with working positions
- ✅ All duplicate client code removed
- ✅ Card definitions only on server
- ✅ Effect system only on server

---

## Phase 1: Clean Architecture

**Goal:** Remove duplication, establish clean client/server separation

### 1A. Remove Dead Client Code ✅ COMPLETE
Files deleted from `src/components/games/henhur/`:
- [x] `HENHUR_TROUBLESHOOTING.md` - stale docs
- [x] `utils/effectExecutor.ts` - duplicate, never used
- [x] `components/CardPool.tsx` - placeholder
- [x] `components/NewCardPool.tsx` - empty
- [x] `components/PlayerMat.tsx` - superseded
- [x] `components/DeckManager.tsx` - not used
- [x] `utils/effectRegistry.ts` - 474 lines, never called (server handles effects)
- [x] `data/cards.ts` - just re-exports cardDatabase
- [x] `data/cardDatabase.ts` - moved to server
- [x] `data/cardTemplates.ts` - server should own card definitions
- [x] `data/CARD_MANAGEMENT.md` - refers to client-side cards
- [x] `data/EXAMPLE_ADDING_CARDS.md` - refers to client-side cards
- [x] `utils/cardDevTools.ts` - debugging for client cards we're removing
- [x] `utils/cardImportExport.ts` - for client cards we're removing
- [x] `utils/cardValidator.ts` - validation now on server
- [x] `utils/cardUtils.ts` - card operations now on server
- [x] `init.ts` - initialization for deleted card system
- [x] `data/` folder - empty, removed
- [x] `utils/` folder - empty, removed

### 1B. Server Card Endpoint ✅ COMPLETE
- [x] Added `henhur:get-cards` socket event on server
- [x] Updated `CardSelectionModal` to receive `allCards` as prop
- [x] Updated `LobbyPage` to fetch cards from server on mount
- [x] Lobby card selection now works with server-provided cards

### 1C. Simplify Client Structure
Target structure after cleanup:
```
henhur/
├── index.ts
├── HenHurGame.tsx           # Main component (simplified)
├── hooks/
│   └── useHenHurGame.ts     # Socket communication
├── types/
│   ├── game.types.ts        # Keep - defines what server sends
│   └── card.types.ts        # Keep - defines card structure
├── components/
│   ├── RaceTurnControls.tsx
│   ├── AuctionTurnControls.tsx
│   ├── CardHand.tsx
│   ├── EnhancedPlayerMat.tsx
│   ├── RaceTrack.tsx        # Simplified from RaceMat
│   ├── GamePhaseIndicator.tsx
│   ├── TokenSelector.tsx
│   └── CardSelectionModal.tsx  # Lobby use only
├── utils/
│   ├── cardUtils.ts         # Keep IF needed for display
│   └── cardValidator.ts     # Keep IF needed for display
└── HENHUR_RULES.md          # Reference
```

---

## Phase 2: Server Completeness ✅ COMPLETE

**Goal:** Server can run a complete game

### 2A. Game Config Consolidation ✅
Created `server/games/henhur/gameConfig.js`:
- [x] Track config (spacesPerLap, lapsToWin)
- [x] Turn structure (perRound, getType function)
- [x] Hand management (size, drawToFull)
- [x] Token system (types with values and categories)
- [x] Burn system (slotsPerPlayer)
- [x] Auction config (extraCards, getAvailableDecks)
- [x] Starting resources

### 2B. Effect Execution ✅
Created `server/games/henhur/gameUtils.js` with effect system:
- [x] `executeEffects()` - Execute array of effects
- [x] `executeEffect()` - Execute single effect with switch on type
- [x] Implemented effect types:
  - `move_player_position` - Move player forward/backward
  - `move_opponent_position` - Move opponent (with target selection)
  - `affect_token_pool` - Gain/spend/set tokens
  - `draw_cards` - Draw cards from deck
  - `modify_priority` - Temporary priority modifier
  - `affect_player_mat` - Generic mat properties

### 2C. Auction Pool Generation ✅
- [x] `generateAuctionPool()` in gameUtils.js
- [x] Respects lobby card selection
- [x] Pulls from correct lap decks based on highest player lap
- [x] Expands cards by copies and shuffles
- [x] Updated `startAuctionDrafting()` to use it

### 2D. Priority Dice Rolling ✅
- [x] `rollPriority()` - Handles both fixed and dice-based priorities
- [x] `rollDice()` - Parses notation like 'd6', '2d8'
- [x] Updated `resolveRaceTurn()` to roll dice for each player
- [x] Updated `resolveAuctionBids()` to use rolled priority for tie-breaking
- [x] Removed old inline calculation methods from HenHurGameEnhanced.js

---

## Phase 3: Client Playability

**Goal:** Client properly displays the game and accepts input

### 3A. Race Track Display ✅ COMPLETE
Created simple `RaceTrack.tsx` (165 lines) replacing complex `RaceMat.tsx` (280 lines of SVG):
- [x] Shows player positions from `gameState.myState.position` and `gameState.otherPlayers[].position`
- [x] Progress bars for each player
- [x] Lap markers and position indicators
- [x] Sorted by race position (leader first)
- [x] Deleted old RaceMat.tsx

### 3B. Auction Pool Display ✅ COMPLETE
`AuctionTurnControls.tsx` already handles auction display:
- [x] Displays `gameState.auctionPool` cards
- [x] Shows who's currently drafting (`gameState.currentDrafter`)
- [x] Allows clicking to draft when it's your turn
- [x] Shows bid selection during auction_selection phase

### 3C. Card Effect Feedback
Show players what happened:
- "You moved 5 spaces"
- "You gained 1 A+ token"
- Could be simple text log or toast notifications
- (Can be added during playtesting as needed)

### 3D. Verify All Phases Work
Test each phase:
- [ ] Race Selection: Can select card, tokens, burn choice
- [ ] Race Reveal: See all cards
- [ ] Race Resolution: See movement happen
- [ ] Auction Selection: Can select bid card
- [ ] Auction Reveal: See bid order
- [ ] Auction Drafting: Can draft cards
- [ ] Game Over: Winner displayed

---

## Phase 4: Prototype Polish (Optional)

**Goal:** Quality of life for playtesting

- Better error messages
- Debug controls that work
- Game reset capability
- Simple animations
- Sound effects (maybe)

---

## Implementation Order

```
Week 1: Phase 1 (Clean Architecture)
  └─> Remove dead code
  └─> Establish clean separation
  └─> Verify nothing breaks

Week 2: Phase 2 (Server Completeness)
  └─> Config consolidation
  └─> Effect execution
  └─> Auction pool generation

Week 3: Phase 3 (Client Playability)
  └─> Working race track
  └─> Working auction UI
  └─> End-to-end playtest

Ongoing: Iterate based on playtesting
```

---

## Success Criteria

The refactor is complete when:
1. [ ] A game can be played from start to finish
2. [x] Changing a card stat requires editing ONE file (server `cardData.js`)
3. [x] Changing a game rule requires editing ONE file (server `gameConfig.js`)
4. [x] Client has no game logic, only UI
5. [x] No duplicate code between client and server

---

## Questions to Resolve

1. ~~**CardSelectionModal**: Does lobby need client-side card definitions, or can it fetch from server?~~ **RESOLVED**: Fetches from server via `henhur:get-cards` socket event
2. **Card Images/Display**: How much card rendering info does client need?
3. **Reconnection**: What happens if a player disconnects mid-game?
4. **Spectators**: Should non-players be able to watch?

---

## Notes

- This document should be updated as we progress
- Check off items as completed
- Add new issues discovered during implementation
