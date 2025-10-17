# Example: Adding Cards to HenHur

## Step-by-Step Tutorial

Let's add 5 new cards to demonstrate the process.

### Step 1: Open cardDatabase.ts

Open [cardDatabase.ts](./cardDatabase.ts) and find the section for the lap you want to add cards to.

### Step 2: Add Cards to the Array

Let's add 5 new Lap 1 cards. Find the `LAP1_CARDS` array and add these cards:

```typescript
export const LAP1_CARDS: Card[] = [
  // ... existing cards (dash, trip) ...

  // NEW CARD 1: Simple speed boost
  {
    id: 'lap1_speed_burst',
    title: 'Speed Burst',
    deckType: 'lap1',
    trickNumber: 2,
    raceNumber: 1,
    priority: 8,
    description: 'Move forward 4 spaces',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 4 }
      }
    ],
    burnEffect: [
      {
        type: 'draw_cards',
        params: { count: 1 }
      }
    ],
    copies: 3
  },

  // NEW CARD 2: Draw card effect
  {
    id: 'lap1_study',
    title: 'Study',
    deckType: 'lap1',
    trickNumber: 2,
    raceNumber: 0,
    priority: 4,
    description: 'Draw 2 cards',
    effect: [
      {
        type: 'draw_cards',
        params: { count: 2 }
      }
    ],
    burnEffect: [
      {
        type: 'draw_cards',
        params: { count: 3 }
      }
    ],
    copies: 4
  },

  // NEW CARD 3: Token generation
  {
    id: 'lap1_prepare',
    title: 'Prepare',
    deckType: 'lap1',
    trickNumber: 2,
    raceNumber: 1,
    priority: 5,
    description: 'Move 2 spaces and gain a P+ token',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 2 }
      },
      {
        type: 'affect_token_pool',
        params: {
          action: 'gain',
          tokenType: 'P+',
          count: 1
        }
      }
    ],
    burnEffect: [],
    copies: 3
  },

  // NEW CARD 4: Opponent disruption
  {
    id: 'lap1_obstacle',
    title: 'Obstacle',
    deckType: 'lap1',
    trickNumber: 3,
    raceNumber: 1,
    priority: 7,
    description: 'Move 1 space and push an opponent back 2 spaces',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 1 }
      },
      {
        type: 'move_opponent_position',
        params: {
          distance: -2,
          targetSelection: 'choose'
        }
      }
    ],
    burnEffect: [],
    copies: 2
  },

  // NEW CARD 5: High priority positioning
  {
    id: 'lap1_first_move',
    title: 'First Move',
    deckType: 'lap1',
    trickNumber: 1,
    raceNumber: 1,
    priority: 10,
    description: 'Move 2 spaces, goes first',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 2 }
      }
    ],
    burnEffect: [
      {
        type: 'affect_token_pool',
        params: {
          action: 'gain',
          tokenType: 'P+3',
          count: 1
        }
      }
    ],
    copies: 2
  }
];
```

### Step 3: Save the File

Save `cardDatabase.ts`. The cards are now in the database!

### Step 4: Verify (Optional but Recommended)

Open your browser console and run:

```javascript
window.henHurDevTools.validateAllCards()
window.henHurDevTools.printDatabaseStats()
```

You should see:
```
✅ Validation complete: 0 error(s), 0 warning(s)
📊 Card Database Statistics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Unique Cards: 12  (was 7, now 12!)
...
```

### Step 5: Test In-Game

The cards will now appear in the game! You can:
1. Start a game
2. Use debug tools to give yourself specific cards
3. Test the effects
4. Iterate on values if needed

## Card Breakdown

Let's analyze what each card does:

### Card 1: Speed Burst
- **Priority 8**: Goes early in turn order
- **Trick 2**: Medium auction value
- **Race 1**: Base movement
- **Effect**: Move 4 spaces (good for catching up or extending lead)
- **Burn**: Draw 1 card (minor benefit for permanent loss)
- **Copies**: 3 (moderately common)
- **Strategy**: Fast movement, good for racing

### Card 2: Study
- **Priority 4**: Goes late
- **Trick 2**: Medium auction value
- **Race 0**: No base movement!
- **Effect**: Draw 2 cards (deck building)
- **Burn**: Draw 3 cards (strong draw, worth burning early)
- **Copies**: 4 (common)
- **Strategy**: Sacrifices position for card advantage

### Card 3: Prepare
- **Priority 5**: Medium turn order
- **Trick 2**: Medium auction value
- **Race 1**: Base movement
- **Effect**: Move 2 + gain P+ token
- **Burn**: None
- **Copies**: 3 (moderately common)
- **Strategy**: Builds resources for later, consistent value

### Card 4: Obstacle
- **Priority 7**: Goes early
- **Trick 3**: High auction value (harder to draft)
- **Race 1**: Base movement
- **Effect**: Move 1 + push opponent back 2
- **Burn**: None
- **Copies**: 2 (uncommon)
- **Strategy**: Defensive/disruptive, net 3-space swing!

### Card 5: First Move
- **Priority 10**: Goes first! (highest priority)
- **Trick 1**: Low auction value (easy to draft)
- **Race 1**: Base movement
- **Effect**: Move 2 (simple but reliable)
- **Burn**: Gain P+3 token (very strong positioning tool)
- **Copies**: 2 (uncommon)
- **Strategy**: Guarantees going first, great for tactical plays

## Design Considerations

### Balance Principles Applied

1. **Priority vs Power**: Higher priority cards have simpler effects
   - First Move (priority 10): Just moves 2
   - Study (priority 4): Draws 2 cards, more complex effect

2. **Trick Number Trade-offs**:
   - Obstacle has trick 3 (harder to win in auction)
   - But strong effect justifies it

3. **Copies vs Rarity**:
   - Common cards (3-4 copies): Simple, reliable
   - Uncommon cards (2 copies): More complex, situational

4. **Effect Synergies**:
   - Prepare gains tokens → use tokens on later turns
   - Study draws cards → get better options
   - First Move's burn gives P+3 → control turn order

### Card Roles

- **Speed Burst**: Pure speed
- **Study**: Deck builder
- **Prepare**: Resource generator
- **Obstacle**: Disruptor
- **First Move**: Tactical control

This gives players different strategies to pursue!

## Scaling to 50-100 Cards

To add many more cards:

### By Theme
Create cards in themed groups:
- Movement set (5-10 cards): varying speeds
- Token set (5-10 cards): different token types
- Draw set (3-5 cards): different draw amounts
- Disruption set (5-8 cards): opponent interaction
- Hybrid set (10-15 cards): combinations

### By Lap
Distribute across laps:
- **Lap 1** (20-30 cards): Priority 4-8, distance 2-4
- **Lap 2** (15-25 cards): Priority 6-10, distance 3-5
- **Lap 3** (10-20 cards): Priority 8-12, distance 4-6

### Using Templates
Use batch generation functions:

```typescript
// Generate 5 movement cards at once
const movementCards = generateMovementSeries('lap1', [2, 3, 4, 5, 6], 6, 2, 3);

// Generate token cards for all token types
const tokenCards = generateTokenCards('lap2', ['P+', 'R+', 'A+', 'W+'], 3, 8, 2);

// Add them all to LAP1_CARDS
export const LAP1_CARDS: Card[] = [
  ...movementCards,
  ...tokenCards,
  // ... custom cards
];
```

## Common Patterns

### The "Catch-Up" Card
```typescript
{
  id: 'lap2_comeback',
  title: 'Comeback',
  priority: 4, // Goes late
  effect: [
    { type: 'move_player_position', params: { distance: 6 } } // Big move
  ],
  copies: 2
}
```

### The "Tempo" Card
```typescript
{
  id: 'lap1_momentum',
  title: 'Momentum',
  priority: 7, // Goes early
  effect: [
    { type: 'move_player_position', params: { distance: 3 } },
    { type: 'modify_priority', params: { adjustment: 2 } } // Stay fast next turn
  ]
}
```

### The "Sacrifice" Card
```typescript
{
  id: 'lap1_investment',
  title: 'Investment',
  priority: 3,
  raceNumber: 0, // No movement!
  effect: [
    { type: 'draw_cards', params: { count: 3 } },
    { type: 'affect_token_pool', params: { action: 'gain', tokenType: 'W+', count: 2 } }
  ],
  copies: 2
}
```

## Next Steps

Now that you know how to add cards:

1. **Plan your card pool**
   - Decide on themes
   - Distribute across laps
   - Plan rarities

2. **Create in batches**
   - 5-10 cards at a time
   - Test each batch
   - Adjust values

3. **Use validation**
   - Check console after each save
   - Fix any errors immediately

4. **Playtest**
   - Test different card combinations
   - Adjust balance as needed
   - Track which cards are too strong/weak

5. **Iterate**
   - Card design is iterative
   - Start simple, add complexity
   - Balance based on gameplay data

Happy card designing!