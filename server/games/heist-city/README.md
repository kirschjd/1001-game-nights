# Heist City Game

## Server-Side Structure

This directory contains the server-side logic for the Heist City game.

### Files Created

- **HeistCityGame.js** - Main game class with core logic
- **index.js** - Entry point exporting the game class
- **events/** - Directory for game event handlers
- **utils/** - Directory for utility functions

### Next Steps

1. Implement game initialization in `HeistCityGame.initializeGame()`
2. Define game state structure and properties
3. Implement player action handling in `handleAction()`
4. Add event handlers in the `events/` directory
5. Create utility functions in the `utils/` directory

### Integration

The game is exported via `index.js` and can be imported in your lobby/socket handlers:

```javascript
const { HeistCityGame } = require('./games/heist-city');
```
