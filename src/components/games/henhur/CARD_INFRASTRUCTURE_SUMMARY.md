# HenHur Card Infrastructure - Complete

## What We Built

We've created a comprehensive card management and experimentation system for HenHur. This infrastructure supports rapid card creation, validation, and testing - perfect for managing 50-100+ cards and iterating quickly.

## Files Created

### Core System Files

1. **[data/cardDatabase.ts](./data/cardDatabase.ts)**
   - Central repository for all card definitions
   - Organized by deck type (base, lap1, lap2, lap3)
   - Helper functions for searching, filtering, and statistics
   - **This is where you add new cards**

2. **[utils/effectRegistry.ts](./utils/effectRegistry.ts)**
   - Flexible effect system with plugin architecture
   - Pre-built handlers for all core effects
   - Easy to add custom effects
   - Supports async operations and complex effect chains

3. **[utils/cardValidator.ts](./utils/cardValidator.ts)**
   - Automatic validation of all cards
   - Checks required fields, effect params, and card balance
   - Provides detailed error and warning messages
   - Catches issues before they reach the game

4. **[utils/cardImportExport.ts](./utils/cardImportExport.ts)**
   - Import/export cards as JSON or CSV
   - Bulk card management
   - Edit cards in Excel/Google Sheets if preferred
   - Simplified format for quick manual entry

5. **[utils/cardDevTools.ts](./utils/cardDevTools.ts)**
   - Card Builder for rapid prototyping
   - Comparison and analysis tools
   - Database statistics and reporting
   - Test scenario creation
   - Available in browser console for live testing

6. **[types/card.types.ts](./types/card.types.ts)** (Updated)
   - Enhanced with conditional effects
   - Support for custom effect types
   - More flexible for experimentation

### Documentation & Templates

7. **[data/CARD_MANAGEMENT.md](./data/CARD_MANAGEMENT.md)**
   - Complete guide to adding and editing cards
   - Effect type reference
   - Examples and best practices
   - Troubleshooting guide

8. **[data/cardTemplates.ts](./data/cardTemplates.ts)**
   - Ready-to-use card templates
   - Batch creation helpers
   - Design tips and guidelines
   - Example code for generating card series

9. **[init.ts](./init.ts)**
   - Initialization system
   - Auto-validation on load
   - Dev tools setup
   - Database statistics logging

10. **[data/cards.ts](./data/cards.ts)** (Updated)
    - Now redirects to cardDatabase.ts
    - Maintains backward compatibility

## Key Features

### 1. Easy Card Creation
```typescript
// Add a card directly to cardDatabase.ts
{
  id: 'lap1_my_card',
  title: 'My Card',
  deckType: 'lap1',
  trickNumber: 2,
  raceNumber: 1,
  priority: 7,
  description: 'Move 3 and draw 1',
  effect: [
    { type: 'move_player_position', params: { distance: 3 } },
    { type: 'draw_cards', params: { count: 1 } }
  ],
  burnEffect: [
    { type: 'draw_cards', params: { count: 2 } }
  ],
  copies: 3
}
```

### 2. Card Builder (For Code)
```typescript
import { quickCard } from './utils/cardDevTools';

const card = quickCard('lap2_speed', 'Speed Boost')
  .deckType('lap2')
  .priority(9)
  .trickNumber(3)
  .raceNumber(1)
  .description('Move 5 and gain P+')
  .move(5)
  .gainToken('P+', 1)
  .burnDraw(2)
  .copies(2)
  .build();
```

### 3. Automatic Validation
- Validates on game load
- Checks all required fields
- Validates effect parameters
- Warns about balance issues
- Shows clear error messages

### 4. Flexible Effect System
```typescript
// Easy to add new custom effects
registerEffect('my_custom_effect', (effect, context) => {
  // Your effect logic here
  return {
    success: true,
    message: 'Effect executed!',
    stateChanges: { /* game state changes */ }
  };
});

// Then use in cards
{
  type: 'my_custom_effect',
  params: { customParam: 'value' }
}
```

### 5. Import/Export
```typescript
// Export all cards as JSON
const json = exportCardsToJSON(ALL_CARDS);

// Export as CSV for Excel
const csv = exportCardsToCSV(ALL_CARDS);

// Import from JSON
const { cards, errors } = importCardsFromJSON(jsonString);
```

### 6. Dev Tools in Console
```javascript
// Browser console tools (in development mode)
window.henHurDevTools.printDatabaseStats()
window.henHurDevTools.validateAllCards()
window.henHurDevTools.findCardsByEffect('move_player_position')
window.henHurDevTools.compareCards(card1, card2)
```

### 7. Batch Card Creation
```typescript
// Generate multiple similar cards at once
const movementCards = generateMovementSeries('lap1', [2, 3, 4, 5], 7, 2, 3);
const tokenCards = generateTokenCards('lap2', ['P+', 'R+', 'A+'], 3, 8, 2);
```

## Effect Types Available

### Movement
- `move_player_position` - Move self
- `move_opponent_position` - Move opponent (with targeting)

### Tokens
- `affect_token_pool` - Gain/spend/set tokens (P+, R+, A+, W+, P+3, D)

### Cards
- `draw_cards` - Draw from deck
- `discard_cards` - Discard from hand

### Priority
- `modify_priority` - Adjust turn order

### Other
- `affect_player_mat` - Generic mat modification
- `block_action` - Block specific actions
- `gain_resource` - Gain generic resources

### Custom
- Easy to add new effect types via `registerEffect()`

## Workflow for Adding 50-100 Cards

### Option 1: Direct Edit (Recommended)
1. Open [data/cardDatabase.ts](./data/cardDatabase.ts)
2. Add cards to appropriate section (LAP1_CARDS, LAP2_CARDS, etc.)
3. Save file
4. Check console for validation
5. Test in-game

### Option 2: Use Templates
1. Open [data/cardTemplates.ts](./data/cardTemplates.ts)
2. Copy a template
3. Modify values
4. Paste into cardDatabase.ts
5. Repeat for all cards

### Option 3: Batch Generation
1. Use `generateMovementSeries()` or `generateTokenCards()`
2. Create multiple cards programmatically
3. Export and add to database

### Option 4: CSV Import
1. Create cards in Google Sheets/Excel
2. Export as CSV
3. Use `importCardsFromCSV()` to load
4. Add to database

## Testing Your Cards

### In-Game Testing
1. Add cards to database
2. Refresh game
3. Use debug tools in LeftInfoDrawer
4. Give yourself specific cards
5. Test effects

### Console Testing
```javascript
// Check if card exists
window.henHurDevTools.findCardsByEffect('your_effect_type')

// Validate specific card
const card = ALL_CARDS.find(c => c.id === 'your_card_id');
validateCard(card);

// Compare to similar cards
const similar = window.henHurDevTools.findSimilarCards(card);
```

## Next Steps

Now that the infrastructure is ready, you can:

1. **Add Your 50-100 Cards**
   - Use cardDatabase.ts or templates
   - Follow the card design tips in cardTemplates.ts
   - Validate as you go

2. **Test and Iterate**
   - Use dev tools for rapid testing
   - Adjust values based on playtesting
   - Track card usage with analytics (coming soon)

3. **Create Custom Effects** (if needed)
   - Add to effectRegistry.ts
   - Use immediately in cards
   - No core game code changes needed

4. **Continue Implementation**
   - Next: Core game state and turn system
   - Effect execution will plug right in
   - Card system is ready to go!

## Benefits for Experimentation

✅ **Fast Iteration**: Add/edit cards in seconds, see changes immediately
✅ **Safe Changes**: Validation catches errors before runtime
✅ **Flexible Effects**: Add new mechanics without touching game code
✅ **Easy Testing**: Dev tools let you test any card/scenario
✅ **Version Control**: Cards are plain text, easy to track changes
✅ **Team Friendly**: Non-coders can edit CSV, coders can use code
✅ **Scalable**: Handles 100+ cards easily
✅ **Maintainable**: Clear structure, good documentation

## Quick Reference

| Task | File | Function |
|------|------|----------|
| Add new card | cardDatabase.ts | Add to appropriate array |
| Create custom effect | effectRegistry.ts | `registerEffect()` |
| Validate cards | Console | `validateAllCards()` |
| Export cards | Console | `exportDatabase()` |
| Test card | Console | `validateCard(card)` |
| View stats | Console | `printDatabaseStats()` |
| Templates | cardTemplates.ts | Copy and modify |
| Documentation | CARD_MANAGEMENT.md | Complete guide |

## Files to Edit for Your Cards

**You mainly edit:**
- [data/cardDatabase.ts](./data/cardDatabase.ts) - Add all your cards here

**You might edit:**
- [data/cardTemplates.ts](./data/cardTemplates.ts) - Create custom templates
- [utils/effectRegistry.ts](./utils/effectRegistry.ts) - Add custom effects

**You don't need to edit:**
- Everything else is infrastructure that just works!

---

**Status**: ✅ Card Infrastructure Complete
**Ready for**: Adding 50-100 cards and continuing with game implementation
**Next Phase**: Core game state and turn system