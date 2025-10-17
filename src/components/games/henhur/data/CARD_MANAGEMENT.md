# HenHur Card Management Guide

This guide explains how to add, edit, and manage cards for the HenHur game.

## Quick Start

### Adding a New Card

1. **Open** [`cardDatabase.ts`](./cardDatabase.ts)
2. **Find** the appropriate section (BASE_CARDS, LAP1_CARDS, LAP2_CARDS, or LAP3_CARDS)
3. **Add** your card:

```typescript
{
  id: 'lap1_my_new_card',
  title: 'My New Card',
  deckType: 'lap1',
  trickNumber: 2,
  raceNumber: 1,
  priority: 7,
  description: 'Does something cool',
  effect: [
    {
      type: 'move_player_position',
      params: { distance: 3 }
    }
  ],
  burnEffect: [
    {
      type: 'draw_cards',
      params: { count: 1 }
    }
  ],
  copies: 4
}
```

4. **Save** the file - the card is now in the game!

## Card Structure

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | Unique identifier (convention: `deckType_cardname`) | `'lap1_dash'` |
| `title` | string | Display name | `'Dash'` |
| `deckType` | string | Which deck: `'base'`, `'lap1'`, `'lap2'`, `'lap3'` | `'lap1'` |
| `trickNumber` | number | Auction value (higher = wins auctions) | `2` |
| `raceNumber` | number | Base movement during race turns | `1` |
| `priority` | number | Turn order (higher = goes first) | `7` |
| `description` | string | What the card does | `'Move forward 3 spaces'` |
| `effect` | array | Effects when played | See Effects section |
| `burnEffect` | array | Effects when burned | See Effects section |

### Optional Fields

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `copies` | number | How many copies exist in the pool | `1` |

## Effect Types

### Movement Effects

**Move Self**
```typescript
{
  type: 'move_player_position',
  params: { distance: 3 }  // Positive = forward, negative = backward
}
```

**Move Opponent**
```typescript
{
  type: 'move_opponent_position',
  params: {
    distance: -2,  // Negative = send them back
    targetSelection: 'choose'  // Player chooses target
  }
}
```

### Token Effects

**Gain Tokens**
```typescript
{
  type: 'affect_token_pool',
  params: {
    action: 'gain',
    tokenType: 'P+',  // P+, R+, A+, W+, P+3, D
    count: 2
  }
}
```

**Spend Tokens**
```typescript
{
  type: 'affect_token_pool',
  params: {
    action: 'spend',
    tokenType: 'R+',
    count: 1
  }
}
```

### Card Draw/Discard

**Draw Cards**
```typescript
{
  type: 'draw_cards',
  params: { count: 2 }
}
```

**Discard Cards**
```typescript
{
  type: 'discard_cards',
  params: { count: 1 }
}
```

### Priority Modification

**Adjust Priority**
```typescript
{
  type: 'modify_priority',
  params: { adjustment: 3 }  // Positive = increase, negative = decrease
}
```

### Multiple Effects

Cards can have multiple effects that execute in order:

```typescript
effect: [
  {
    type: 'move_player_position',
    params: { distance: 4 }
  },
  {
    type: 'draw_cards',
    params: { count: 1 }
  },
  {
    type: 'affect_token_pool',
    params: { action: 'gain', tokenType: 'P+', count: 1 }
  }
]
```

## Advanced Features

### Using the Card Builder (In Code)

For rapid prototyping, use the CardBuilder:

```typescript
import { quickCard } from '../utils/cardDevTools';

const newCard = quickCard('lap2_power_move', 'Power Move')
  .deckType('lap2')
  .priority(9)
  .trickNumber(3)
  .raceNumber(1)
  .description('Move 5 spaces and gain priority')
  .move(5)  // Shorthand for move_player_position
  .addEffect('modify_priority', { adjustment: 2 })
  .burnDraw(2)  // Shorthand for burn effect that draws cards
  .copies(2)
  .build();
```

### Custom Effects

You can create custom effect types by registering new handlers in `effectRegistry.ts`:

```typescript
import { registerEffect } from '../utils/effectRegistry';

registerEffect('my_custom_effect', (effect, context) => {
  // Your custom logic here
  return {
    success: true,
    message: 'Custom effect executed!',
    stateChanges: {
      // Changes to game state
    }
  };
});
```

Then use it in cards:
```typescript
{
  type: 'my_custom_effect',
  params: { customParam: 'value' }
}
```

## Validation

Cards are automatically validated when the game loads. Check the browser console for:
- ✅ Validation success
- ⚠️  Warnings (non-critical issues)
- ❌ Errors (must fix)

### Common Validation Errors

1. **Missing required field**: Add the missing field
2. **Invalid effect type**: Check spelling, or register custom effect
3. **Duplicate card ID**: Make sure each card has a unique ID
4. **Invalid params**: Check effect type requirements

## Bulk Import/Export

### Export to JSON
```typescript
import { exportCardsToJSON } from '../utils/cardImportExport';
import { ALL_CARDS } from './cardDatabase';

const json = exportCardsToJSON(ALL_CARDS);
console.log(json);
```

### Export to CSV (for Excel/Sheets)
```typescript
import { exportCardsToCSV } from '../utils/cardImportExport';
import { ALL_CARDS } from './cardDatabase';

const csv = exportCardsToCSV(ALL_CARDS);
console.log(csv);
```

### Import from JSON
```typescript
import { importCardsFromJSON } from '../utils/cardImportExport';

const jsonString = '[{"id": "lap1_test", ...}]';
const { cards, errors } = importCardsFromJSON(jsonString);

if (errors.length === 0) {
  // Use the cards
} else {
  console.error('Import errors:', errors);
}
```

## Dev Tools

Open browser console and use dev tools:

```javascript
// List all cards
window.henHurDevTools.printDatabaseStats()

// Validate all cards
window.henHurDevTools.validateAllCards()

// Find cards by effect type
window.henHurDevTools.findCardsByEffect('move_player_position')

// Compare two cards
const card1 = ALL_CARDS[0];
const card2 = ALL_CARDS[1];
window.henHurDevTools.compareCards(card1, card2)

// Export everything
window.henHurDevTools.exportDatabase()
```

## Card Balance Guidelines

### Priority Values
- **1-3**: Low priority (goes late)
- **4-6**: Medium priority
- **7-9**: High priority (goes early)
- **10+**: Very high priority (rare, powerful)

### Race Number Values
- **0**: No movement
- **1-2**: Slow (common)
- **3-4**: Medium (uncommon)
- **5+**: Fast (rare, powerful)

### Trick Number Values
- **1**: Low bid (usually base cards)
- **2**: Medium bid (lap 1)
- **3**: High bid (lap 2)
- **4+**: Very high bid (lap 3)

### Copies Guidelines
- **Base cards**: 3-5 copies (everyone gets them)
- **Common cards**: 4-6 copies
- **Uncommon cards**: 2-3 copies
- **Rare cards**: 1 copy

## Examples

### Simple Movement Card
```typescript
{
  id: 'lap1_quick_step',
  title: 'Quick Step',
  deckType: 'lap1',
  trickNumber: 2,
  raceNumber: 1,
  priority: 6,
  description: 'Move forward 3 spaces',
  effect: [
    { type: 'move_player_position', params: { distance: 3 } }
  ],
  burnEffect: [],
  copies: 4
}
```

### Complex Multi-Effect Card
```typescript
{
  id: 'lap2_tactical_advance',
  title: 'Tactical Advance',
  deckType: 'lap2',
  trickNumber: 3,
  raceNumber: 1,
  priority: 8,
  description: 'Move 4 spaces, gain P+ token, and draw a card',
  effect: [
    { type: 'move_player_position', params: { distance: 4 } },
    { type: 'affect_token_pool', params: { action: 'gain', tokenType: 'P+', count: 1 } },
    { type: 'draw_cards', params: { count: 1 } }
  ],
  burnEffect: [
    { type: 'draw_cards', params: { count: 2 } }
  ],
  copies: 2
}
```

### Opponent Interaction Card
```typescript
{
  id: 'lap1_trip_wire',
  title: 'Trip Wire',
  deckType: 'lap1',
  trickNumber: 2,
  raceNumber: 0,
  priority: 7,
  description: 'Move opponent back 2 spaces',
  effect: [
    {
      type: 'move_opponent_position',
      params: { distance: -2, targetSelection: 'choose' }
    }
  ],
  burnEffect: [],
  copies: 3
}
```

## Tips for Card Creation

1. **Start Simple**: Create basic movement cards first
2. **Test Frequently**: Add a few cards, test in-game, iterate
3. **Use Dev Tools**: Validate and inspect cards with console tools
4. **Balance as You Go**: Compare new cards to existing ones
5. **Document Effects**: Clear descriptions help players understand cards
6. **Version Control**: Commit card changes regularly so you can revert if needed

## Troubleshooting

### Card not appearing in game
- Check that it's added to the correct array (BASE_CARDS, LAP1_CARDS, etc.)
- Verify the file saved properly
- Check browser console for validation errors
- Refresh the page

### Effect not working
- Verify effect type is spelled correctly
- Check that effect is registered in effectRegistry.ts
- Look for errors in browser console
- Ensure params match the effect's requirements

### Validation errors
- Read the error message carefully
- Check the field mentioned in the error
- Compare to working card examples
- Use dev tools: `window.henHurDevTools.validateAllCards()`

## Next Steps

Once you're comfortable with the basics:
1. Create your 50-100 cards in `cardDatabase.ts`
2. Use validation to catch errors
3. Export to CSV for bulk editing if needed
4. Test cards in-game with debug tools
5. Iterate on balance based on playtesting

For questions or issues, check the main HenHur implementation plan or consult the effect registry documentation.