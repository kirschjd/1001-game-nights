# Heist City Game Component

## Client-Side Structure

This directory contains the React components and frontend logic for the Heist City game.

### Files Created

- **HeistCityGame.tsx** - Main game component
- **index.ts** - Entry point exporting the game component
- **components/** - Sub-components for UI elements
- **hooks/** - Custom React hooks for game logic
- **types/** - TypeScript type definitions
- **utils/** - Utility functions
- **data/** - Game data and constants

### Type Definitions

Basic types are defined in [types/index.ts](types/index.ts):
- `Player` - Player properties
- `GameState` - Complete game state
- `HeistCityAction` - Action types

### Next Steps

1. Build UI components in the `components/` directory
2. Create custom hooks for game logic in `hooks/`
3. Define complete type definitions in `types/`
4. Add utility functions in `utils/`
5. Store game constants and data in `data/`

### Integration

The game component is exported via `index.ts` and can be imported in GamePage:

```typescript
import HeistCityGame from './games/heist-city';
```
