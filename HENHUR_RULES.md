# HenHur - Game Rules and Overview

## Table of Contents
- [Game Overview](#game-overview)
- [Game Components](#game-components)
- [Setup](#setup)
- [Game Flow](#game-flow)
- [Turn Types](#turn-types)
- [Card System](#card-system)
- [Token Economy](#token-economy)
- [Burn System](#burn-system)
- [Win Condition](#win-condition)
- [Strategic Tips](#strategic-tips)

---

## Game Overview

**HenHur** is a competitive multiplayer racing card game where players move around a circular race track by playing cards and managing resources. The game combines elements of racing, card drafting auctions, and strategic resource management with a token economy system.

### Objective
Be the first player to complete **3 laps** around a 30-space race track.

### Players
2 or more players

### Duration
Multiple rounds of 8 turns each (alternating between Race and Auction turns) until a player completes 3 laps.

---

## Game Components

### The Race Track
- **30 spaces** per lap
- **3 laps** required to win
- **3 lanes** (inner, middle, outer) for visual positioning
- Players track their position by lap number and space on that lap

### Player Resources
Each player has:
- **Hand**: 3 cards maximum
- **Deck**: Personal deck of cards (shuffled discard when empty)
- **Discard Pile**: Played cards go here
- **Burn Slots**: 3 permanent slots for powerful burned cards
- **Token Pool**: Up to 10 tokens of various types
- **Position**: Current lap (1-3) and space (0-29)

---

## Setup

1. Each player starts at **Lap 1, Space 0**
2. Each player receives their **Base Deck**:
   - Pit Stop (1 move, Trick:2, Priority:1d6)
   - High Bid (1 move, Trick:7, Priority:1d4)
   - Low Bid ×2 (1 move, Trick:5, Priority:2d8)
   - Rush (5 move, Trick:1, Priority:2d8)
   - Stride (7 move, Trick:1, Priority:2d8)
   - Punch (4 move, Trick:3, Priority:2d8)
3. Shuffle your deck and draw **3 cards**
4. Game begins at **Round 1, Turn 1** (a Race Turn)

---

## Game Flow

### Round Structure
Each round consists of **8 turns**:
- **Odd turns (1, 3, 5, 7)**: Race Turns
- **Even turns (2, 4, 6, 8)**: Auction Turns

The game continues through multiple rounds until a player wins.

### Turn Phases
Each turn progresses through specific phases depending on turn type (see [Turn Types](#turn-types)).

---

## Turn Types

### Race Turns (Turns 1, 3, 5, 7)

Race turns are when players move around the track.

#### Phase 1: Race Selection
- **All players simultaneously** select:
  - 1 card from their hand to play
  - Whether to **burn** the card (if burn slots available)
  - Which **tokens** to use (Priority tokens: P+, P+3, W+)
- Click "Ready" when done selecting

#### Phase 2: Cards Revealed
- 2-second dramatic reveal
- All selected cards become visible to all players

#### Phase 3: Race Resolution
- Cards execute in **priority order** (highest priority first)
- **Priority Calculation**: Base Priority + Priority Tokens + Modifiers
- For each card in order:
  1. **Calculate Movement**: Race Number + Race Tokens (R+, W+)
  2. **Move player** forward that many spaces
  3. **Trigger card effect** (if any)
  4. **Burn or Discard**: Card goes to burn slot or discard pile
  5. **Draw cards** back to hand size of 3
- Check for winner after each player moves

### Auction Turns (Turns 2, 4, 6, 8)

Auction turns are when players draft new cards into their decks.

#### Phase 1: Auction Selection
- **All players simultaneously** select:
  - 1 card from their hand to use as a **bid**
  - Whether to **burn** the card (if it has a burn effect marked with @)
  - Which **Auction tokens** to use (A+, W+)
- **Trick Value** = Card's Trick Number + Auction Tokens
- Higher trick value = better draft position
- Click "Ready" when done selecting

#### Phase 2: Bid Reveal
- 2-second reveal
- All bids and trick values become visible

#### Phase 3: Auction Drafting
- An **auction pool** of cards is revealed (number of players + 1 cards)
- Cards come from lap-appropriate deck (see [Card System](#card-system))
- Players draft in **trick value order** (highest first)
- Ties are broken by card priority
- Each player picks **1 card** from the pool
- Picked cards go to the **top of your deck**

#### Phase 4: End Auction
- All bid cards are discarded or burned
- Turn advances

---

## Card System

### Card Anatomy
Each card shows:
- **Title**: Name of the card
- **Priority**: Turn order value (format: "1d6" means roll 1 die, or fixed number like "5")
- **Race Number**: Movement value when played in Race turns (bottom-left)
- **Trick Number**: Bid value when played in Auction turns (bottom-right)
- **Description**: Card effect text
- **@ Symbol**: Indicates card has a burn effect

### Card Values Explained
- **Priority**: Determines execution order in races (higher goes first)
  - Can be fixed (e.g., "5") or dice-based (e.g., "2d8" = 2 dice rolled)
  - Add Priority tokens to increase
- **Race Number**: Base movement in spaces (1-7)
  - Add Race tokens to increase movement
- **Trick Number**: Bidding power in auctions (1-7)
  - Add Auction tokens to increase bid

### Card Decks

#### Base Deck (Starting Cards)
Available from the beginning:
- **Pit Stop** (1 move, T:2, P:1d6) - Deck maintenance
- **High Bid** (1 move, T:7, P:1d4) - Economic card, gains Priority tokens
- **Low Bid** ×2 (1 move, T:5, P:2d8) - Economic card, gains Auction tokens
- **Rush** (5 move, T:1, P:2d8) - Sprint card, move 4 spaces
- **Stride** (7 move, T:1, P:2d8) - High movement
- **Punch** (4 move, T:3, P:2d8) - Fight card, affects opponents

#### Lap 1 Cards
Unlocked when **any player reaches Lap 2**:
- **Dash** - Move 3 spaces, draw card on burn
- **Trip** - Move opponent back 1 space

#### Lap 2 Cards
Unlocked when **any player reaches Lap 3**:
- **Surge** - Move 4 spaces, gain movement tokens on burn

#### Lap 3 Cards
Also unlocked when **any player reaches Lap 3**:
- **Turbo Boost** - Move 5 spaces, gain priority on use, draw 2 cards on burn

### How to Get New Cards
- New cards are only acquired through **Auction turns**
- Win auctions by bidding high trick values
- Draft the best cards from the auction pool
- Cards go directly to the top of your deck

---

## Token Economy

### Token Types
Players can hold up to **10 tokens total**. Token types:

| Token | Name | Effect |
|-------|------|--------|
| **P+** | Priority +1 | Add +1 to card priority in races |
| **P+3** | Priority +3 | Add +3 to card priority in races |
| **R+** | Race +1 | Add +1 space to movement in races |
| **A+** | Auction +1 | Add +1 to trick value in auctions |
| **W+** | Wild +1 | Can substitute for any token type (+1 value) |
| **D** | Damage | Negative token; cannot be used, must be carried |

### How to Get Tokens
- **Card Effects**: Some cards grant tokens when played
- **Burn Effects**: Most tokens come from burning cards (@ symbol)
  - Example: Burning "Low Bid" grants an A+ token
  - Example: Burning "Rush" grants an R+ token

### How to Use Tokens
- During card selection, choose which tokens to use
- Tokens are **consumed** when used (removed from your pool)
- Strategic timing is key - use them when they matter most!

---

## Burn System

### Burn Slots
- Each player has **3 permanent burn slots**
- Once a slot is filled, it stays filled for the entire game
- Cards in burn slots display their stats but are no longer playable

### How Burning Works
1. When playing a card, you can choose to **burn** instead of discard
2. Card must have a burn effect (marked with **@** symbol)
3. The card goes into an empty burn slot permanently
4. **Burn effect triggers immediately**
5. Card remains visible in the burn slot for the rest of the game

### Why Burn Cards?
- Burn effects are powerful (gain tokens, draw cards, etc.)
- But you only get 3 slots total
- Choose wisely - you can't undo burns!

### Example Burn Effects
- **Low Bid** @ → Gain 1 Auction token (A+)
- **Rush** @ → Gain 1 Race token (R+)
- **Turbo Boost** @ → Draw 2 cards immediately
- **Dash** @ → Draw 1 card

---

## Win Condition

**First player to complete 3 full laps wins!**

- Laps are 30 spaces each (90 spaces total)
- Win is checked after each card resolves in race turns
- If multiple players finish on the same turn, the furthest ahead wins
- Game immediately ends and winner is declared

---

## Strategic Tips

### Early Game Strategy
- **Focus on tokens**: Burn cards strategically to build your token economy
- **Balance your burn slots**: Don't fill all 3 too quickly
- **Low movement is okay**: Early laps are about building resources

### Mid Game Strategy
- **Fight for auctions**: Use Auction tokens to get first pick of better cards
- **Build your deck**: Draft high-movement cards (Dash, Surge, Turbo Boost)
- **Watch opponents**: Track who's ahead and who has tokens

### Late Game Strategy
- **Priority matters**: Use P+ tokens to ensure your high-movement cards go first
- **Calculate distances**: Know exactly how many spaces you need to win
- **Race token timing**: Save R+ tokens for your final winning move

### Token Management
- **Wild tokens** are the most flexible - save them for critical moments
- **Priority tokens** help you move first (important when racing for position)
- **Race tokens** are your direct path to victory
- **Auction tokens** help you get better cards earlier

### Auction Tips
- Bid high when **good cards** are available (check the pool preview)
- Bid low when the pool is weak - save tokens for better auctions
- Remember: You must spend a card to bid, so every auction costs you

### Burn Slot Strategy
- Burn early-game economic cards first (Low Bid, Rush)
- Save slots for late-game power cards if possible
- Consider: Is the burn effect worth losing a slot permanently?

### Card Priority Guide
- High priority (7-10): Goes first - great for offensive moves
- Medium priority (4-6): Middle of the pack - reliable
- Low priority (1-3): Goes last - vulnerable to opponents' actions
- Dice-based priority: Variable - risky but can roll high

---

## Quick Reference

### Turn Order
1. Race → 2. Auction → 3. Race → 4. Auction → 5. Race → 6. Auction → 7. Race → 8. Auction → (Repeat)

### Hand Size
Always **3 cards** (draw back to 3 after playing each card)

### Token Limit
Maximum **10 tokens** total

### Burn Slots
Exactly **3 slots**, permanent once filled

### Track Size
**30 spaces** per lap × **3 laps** = 90 total spaces to win

---

## Game Progression

### What Happens Each Lap?

**Lap 1** (Spaces 0-29)
- Only Base Deck cards available in auctions
- Focus on building token economy
- Establish your strategy

**Lap 2** (Spaces 30-59)
- Lap 1 cards now available in auctions
- More strategic card options
- Competition heats up

**Lap 3** (Spaces 60-89)
- Lap 2 and Lap 3 cards now available
- Powerful late-game cards
- Sprint to the finish!

---

## Notes on Implementation

This game is implemented as a real-time multiplayer web game with:
- **Server-side game logic** for fair play and validation
- **Simultaneous card selection** (no turn order waiting)
- **Synchronized reveals** for dramatic effect
- **Automatic win detection** and game state management
- **Full game state persistence** across reconnects

The game uses Socket.io for real-time communication between players and the server.

---

**Have fun racing in HenHur!**