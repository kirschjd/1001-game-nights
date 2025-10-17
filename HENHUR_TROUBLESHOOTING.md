# HenHur Troubleshooting Guide

## Fixed Issues

### ✅ TypeScript Error: slug undefined
**Fixed**: Added check `slug &&` before rendering HenHurGame in GamePage.tsx

### ✅ ESLint Warning: Missing dependency
**Fixed**: Added `eslint-disable-next-line` comment for useEffect that intentionally only runs on mount

### ✅ Unused variable: isMyTurn
**Fixed**: Removed unused variable

## Common Issues & Solutions

### Game Not Loading

**Symptom**: Stuck on "Loading HenHur..." screen

**Possible Causes**:
1. Server not running
2. Socket not connected
3. Game not started from lobby

**Solutions**:
- Check server is running: `npm run server`
- Check browser console for socket connection errors
- Make sure game was started from lobby (not accessing game page directly)
- Try refreshing the page

### State Not Updating

**Symptom**: UI doesn't update when other players take actions

**Possible Causes**:
1. Socket events not wired correctly
2. Server not broadcasting state changes

**Solutions**:
- Check browser console for `henhur:game-state` events
- Check server console for "Broadcasted HenHur state" messages
- Verify socket.io connection in browser dev tools (Network tab)

### Cards Not Showing

**Symptom**: Hand is empty or shows wrong cards

**Possible Causes**:
1. Server didn't deal initial cards
2. Game state not synced

**Solutions**:
- Check server logs for "Dealt N cards to PlayerName"
- Verify `myState.deck.hand` in React DevTools
- Try clicking refresh state button (if in debug mode)

### Token/Burn System Not Working

**Symptom**: Can't select tokens or burn cards

**Possible Causes**:
1. No tokens in pool
2. No burn slots available
3. Wrong turn phase

**Solutions**:
- Check `myState.tokens` - should have counts > 0
- Check `myState.burnSlots` - should have empty slots
- Verify you're in correct phase (race_selection or auction_selection)

### Auction Pool Empty

**Symptom**: No cards show up for drafting in auction turn

**Known Issue**: Auction pool generation not yet implemented

**Workaround**: Will be fixed when lap-based card pool is implemented

## Debug Mode

To enable debug mode:
1. In lobby, set HenHur variant to "debug"
2. Start game
3. Debug controls will appear in LeftInfoDrawer

Debug actions available:
- Give tokens
- Set position
- Draw cards
- View full game state

## Checking Game State

### In Browser Console:
```javascript
// Get current game state (if you have access to the component)
// This will show in React DevTools under HenHurGameEnhanced component props

// Check socket connection
socket.connected // Should be true

// Listen for state updates
socket.on('henhur:game-state', (state) => {
  console.log('Game state:', state);
});
```

### What to Look For:
- `phase`: Should match current turn phase
- `turnNumber`: Should increment (1-8)
- `roundNumber`: Should increment after turn 8
- `turnType`: Should alternate 'race' and 'auction'
- `myState.deck.hand`: Should have 3 cards
- `myState.tokens`: Should have token counts
- `myState.burnSlots`: Should show empty or filled slots

## Testing Checklist

Before reporting a bug, verify:

- [ ] Server is running (`npm run server`)
- [ ] Client is running (`npm start`)
- [ ] Socket connected (check browser console)
- [ ] Game started from lobby (not direct URL)
- [ ] At least 2 players in game
- [ ] Browser console has no red errors
- [ ] React DevTools shows HenHurGameEnhanced component

## Known Limitations

1. **RaceMat Not Synced**: Shows static track, doesn't display actual player positions (TODO)
2. **Auction Pool Empty**: Cards not generated for auction yet (TODO)
3. **Effects Not Executing**: Card effects defined but not fully wired (TODO)
4. **No Animations**: Card reveals and movement are instant (polish TODO)

## Reporting Issues

When reporting a bug, include:

1. **What you were doing**: (e.g., "Selected a card for race turn")
2. **What happened**: (e.g., "Game froze, no response")
3. **Expected behavior**: (e.g., "Should show ready status")
4. **Browser console errors**: (copy/paste any red errors)
5. **Server console logs**: (copy recent logs if possible)
6. **Game state**: (from React DevTools if possible)

## Quick Fixes

### Game Frozen
1. Refresh page
2. Rejoin from lobby
3. Restart server if needed

### Wrong Phase
- Usually resolves when all players mark ready
- If stuck, check server logs for errors

### Cards Not Playing
- Verify you clicked "Ready" button
- Check other players' ready status
- Ensure you selected a card first

### Can't Join Game
- Make sure you're accessing via lobby first
- Check that game is actually started (not just lobby)
- Verify slug in URL matches lobby slug

## Development Tips

### Hot Reload
- Client changes: Auto-reloads
- Server changes: Restart `npm run server`
- Type changes: May need to restart TypeScript compiler

### Debugging Server
Add console.logs in:
- `HenHurGameEnhanced.js` - Game logic
- `henHurEvents.js` - Socket handlers
- Check logs for game state changes

### Debugging Client
Use React DevTools:
- Inspect HenHurGameEnhanced component
- Check gameState prop
- Verify socket in useHenHurGame hook

## Getting Help

If you're stuck:
1. Check this guide
2. Check browser console
3. Check server console
4. Check IMPLEMENTATION_PROGRESS.md for known issues
5. Ask for help with specific error messages
