# CLAUDE.md — 1001 Game Nights

Guidance for AI assistants working in this codebase.

## Project Overview

**1001 Game Nights** is a full-stack multiplayer board/card game platform. Players create lobbies, invite friends (or add AI bots), and play real-time games together via Socket.io. The architecture is a React + TypeScript frontend served by an Express + Socket.io backend.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, React Router v6 |
| Styling | Tailwind CSS 3 |
| Drag & Drop | @dnd-kit/core, @dnd-kit/sortable |
| Realtime | Socket.io Client 4.7 |
| Backend | Node.js (>=18), Express 4, Socket.io 4.7 |
| Security | Helmet, express-rate-limit, CORS |
| Testing | React Testing Library, Jest, ts-jest |
| Dev tooling | Concurrently, Nodemon, PostCSS, Autoprefixer |
| Deployment | Docker, Fly.io, GitHub Actions |

---

## Repository Structure

```
/
├── src/                        # React frontend
│   ├── App.tsx                 # Root router (SocketProvider wraps all routes)
│   ├── index.tsx               # React entry point
│   ├── App.css                 # Global styles
│   ├── components/
│   │   ├── LandingPage.tsx     # Home page
│   │   ├── LobbyPage.tsx       # Lobby orchestration
│   │   ├── ExplorePage.tsx     # Game catalog
│   │   ├── GamePage.tsx        # Game router (dispatches by game type)
│   │   ├── ConnectionStatus.tsx
│   │   ├── shared/             # Reusable UI (GameHeader, etc.)
│   │   ├── lobby/              # Lobby UI components
│   │   │   ├── LobbyHeader.tsx
│   │   │   ├── PlayerList.tsx
│   │   │   ├── LeaderSelectModal.tsx
│   │   │   ├── options/        # Per-game lobby settings panels
│   │   │   └── rules/          # Per-game rules displays
│   │   └── games/              # One directory per game
│   │       ├── war/
│   │       ├── dice-factory/
│   │       ├── dice-factory-v0.2.1/
│   │       ├── henhur/
│   │       ├── heist-city/
│   │       ├── kill-team-draft/
│   │       └── baduk-analysis/
│   ├── constants/
│   │   └── socketEvents.ts     # All socket event name constants (source of truth)
│   ├── contexts/
│   │   └── SocketContext.tsx   # Socket.io connection + React context
│   └── utils/
│       └── lobbyUtils.ts
│
├── server/                     # Node.js backend (JavaScript, not TypeScript)
│   ├── index.js                # Express + Socket.io entry point
│   ├── routes/
│   │   └── api.js              # REST endpoints
│   ├── socket/                 # Socket event handlers
│   │   ├── socketHandler.js    # Central orchestrator + heartbeat
│   │   ├── lobbyEvents.js
│   │   ├── warEvents.js
│   │   ├── diceFactoryEvents.js
│   │   ├── henHurEvents.js
│   │   ├── heistCityEvents.js
│   │   ├── killTeamDraftEvents.js
│   │   ├── badukAnalysisEvents.js
│   │   └── helpers/
│   │       ├── gameInitHelpers.js
│   │       ├── lobbyHelpers.js
│   │       └── stateVersioning.js
│   ├── games/                  # Game logic / engines
│   │   ├── bots/               # Bot AI system (BotSystem.js)
│   │   ├── war/
│   │   ├── dice-factory/
│   │   ├── dice-factory-v0.1.5/
│   │   ├── dice-factory-v0.2.1/
│   │   ├── henhur/
│   │   ├── heist-city/
│   │   └── kill-team-draft/
│   └── utils/
│       └── persistence.js      # File-based JSON state persistence
│
├── public/                     # Static assets (index.html, images, card art)
│   ├── assets/                 # Game icons/images
│   └── Cards/                  # Card images
│
├── docs/                       # Design docs (mostly Heist City AI phases)
│
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── jest.config.engine.js       # Jest config for game engine + AI tests
├── nodemon.json
├── Dockerfile
└── fly.toml
```

---

## Development Workflow

### Setup

```bash
npm install
npm run dev        # Starts backend (:3001) and frontend (:3000) concurrently
```

The frontend dev server proxies all non-asset requests to `http://localhost:3001` (configured via `"proxy"` in `package.json`).

### Available Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Run backend + frontend in parallel (development) |
| `npm run server` | Backend only (`nodemon server/index.js`) |
| `npm run client` | Frontend only (`react-scripts start`) |
| `npm run build` | Production React build → `build/` |
| `npm start` | Production server (serves built React app) |
| `npm test` | React Testing Library tests |

### Running Game Engine Tests

The game engine tests (Heist City) use a separate Jest config:

```bash
npx jest --config jest.config.engine.js
```

Test files live in `__tests__/` directories under:
- `src/components/games/heist-city/engine/`
- `src/components/games/heist-city/ai/`
- `src/components/games/heist-city/hooks/`

---

## Architecture Patterns

### Real-time Communication

**Socket.io is the primary communication layer.** All game state changes flow as socket events, not REST calls. REST (`/api`) is used only for lobby/game discovery queries.

All socket event names are defined as `const` objects in `src/constants/socketEvents.ts`. **Always import event names from there — never use raw strings.**

```ts
import { SOCKET_EVENTS, HEIST_CITY_EVENTS } from '../constants/socketEvents';
socket.emit(SOCKET_EVENTS.START_GAME, payload);
```

### Socket Event Namespacing

| Constant | Prefix | Purpose |
|---|---|---|
| `SOCKET_EVENTS` | none / `heartbeat-` | Core connection & lobby lifecycle |
| `WAR_EVENTS` | `enhanced-war-` | War card game |
| `DICE_FACTORY_EVENTS` | `dice-factory-` | Dice Factory (original) |
| `DICE_FACTORY_V2_EVENTS` | `dice-factory:` | Dice Factory v0.2.1 (colon-separated) |
| `HENHUR_EVENTS` | `henhur:` | HenHur |
| `HEIST_CITY_EVENTS` | `heist-city-` | Heist City |
| `KTD_EVENTS` | `ktd-` | Kill Team Draft |
| `BADUK_EVENTS` | `baduk:` | Baduk/Go analysis |

### Frontend State Management

- **SocketContext** (`src/contexts/SocketContext.tsx`) manages the global socket connection and exposes it via React context.
- **No Redux / Zustand / MobX.** Game state is kept in component state and updated via socket events.
- Game components typically have a `useGameState` hook that subscribes to the relevant `GAME_STATE_UPDATED` event.

### Backend State Management

- **In-memory Maps**: `lobbies` and `games` are JavaScript `Map` objects stored in `app.locals`.
- **File persistence** (`server/utils/persistence.js`): State is written to JSON files in `server/data/games/` and `server/data/lobbies/` so it survives server restarts. A cleanup job runs hourly.
- Lobby data is loaded from disk on startup and cleaned up via `persistence.startCleanupJob(1)`.

### Adding a New Game

Follow the pattern established by existing games:

**Backend** (`server/`):
1. Create `server/games/<game-name>/` with the game engine class(es).
2. Add a bot implementation in `server/games/bots/` if needed.
3. Create `server/socket/<game-name>Events.js` with socket event handlers.
4. Register the handlers in `server/socket/socketHandler.js`.

**Frontend** (`src/`):
1. Create `src/components/games/<game-name>/` with the structure:
   ```
   <game-name>/
   ├── <GameName>.tsx       # Main game component
   ├── components/          # UI sub-components
   ├── hooks/               # useGameState, etc.
   ├── types/               # TypeScript interfaces
   └── utils/               # Helper functions
   ```
2. Add lobby options panel in `src/components/lobby/options/`.
3. Add rules display in `src/components/lobby/rules/`.
4. Register the game in `src/components/GamePage.tsx`.
5. Add new events to `src/constants/socketEvents.ts`.

---

## Code Conventions

### Language Split

- **Frontend (`src/`)**: TypeScript (`.ts` / `.tsx`)
- **Backend (`server/`)**: Plain JavaScript (`.js`, CommonJS `require`/`module.exports`)

Do not introduce TypeScript into the server directory; keep the split clean.

### Frontend Conventions

- Functional components with hooks only. No class components.
- Tailwind utility classes for all styling. Avoid inline `style={}` props except for truly dynamic values.
- Import React explicitly only when JSX is used in the file.
- Use the `socketEvents.ts` constants — never raw event name strings.
- TypeScript interfaces go in the game's `types/` subdirectory.

### Backend Conventions

- CommonJS modules (`require` / `module.exports`).
- Game logic lives in `server/games/`, socket wiring lives in `server/socket/`.
- Emit `SOCKET_EVENTS.GAME_STATE_UPDATED` (or a game-specific state event) after every state mutation so all clients re-render.

### Tailwind Custom Theme

Custom tokens defined in `tailwind.config.js`:

| Token | Value |
|---|---|
| `lion` | `#C19875` (brand warm gold) |
| `payne-grey` | `#5D5F71` (brand slate) |
| `uranian-blue` | light blue accent |
| `tea-rose` | pink accent |
| Dice: `d4`–`d12` | Red, teal, blue, green, yellow |

Custom animations: `spin-slow` (3 s), `pulse-slow` (3 s).

---

## Games Reference

| Game | Directory key | Status | Notes |
|---|---|---|---|
| War | `war` | Complete | Strategic card game with variants |
| Dice Factory v0.1.5 | `dice-factory` | Complete | Factory effects, modifications, auctions |
| Dice Factory v0.2.1 | `dice-factory-v0.2.1` | Complete | Slot-based ability variant |
| HenHur | `henhur` | In progress | Racing/auction card game |
| Heist City | `heist-city` | In progress | Squad tactical heist; AI-NPC system, hex grid, LOS/pathfinding; 20+ engine tests |
| Kill Team Draft | `kill-team-draft` | Complete | Card-drafting deck builder |
| Baduk Analysis | `baduk-analysis` | In progress | Go game analysis tool with AI opponent |

---

## Deployment

**Platform:** Fly.io (`1001-game-nights`, region `ord`)

**CI/CD:** `.github/workflows/deploy.yml` — deploys on push to `main`. Requires `FLY_API_TOKEN` secret.

**Docker:** Multi-stage build. Dev dependencies stripped in production image.

**Production server:** `npm start` (`node server/index.js`). React app is built to `build/` and served as static files by Express.

---

## Security Notes

- `helmet` is enabled with `contentSecurityPolicy: false` (required for Create React App's inline scripts).
- CORS origin is restricted to `http://localhost:3000` in development and disabled (`false`) in production (same-origin).
- Rate limiting: 100 requests per 15 minutes per IP on all `/api/` routes.
- Never expose internal game/lobby state maps directly via REST without sanitization.

---

## Key Files Quick Reference

| File | Purpose |
|---|---|
| `src/constants/socketEvents.ts` | Authoritative list of all socket event names |
| `src/contexts/SocketContext.tsx` | Global socket connection provider |
| `src/App.tsx` | Route definitions |
| `server/index.js` | Server entry point, wires everything together |
| `server/socket/socketHandler.js` | Socket.io central orchestrator + heartbeat |
| `server/utils/persistence.js` | Read/write game & lobby state to disk |
| `tailwind.config.js` | Custom color tokens and animations |
| `jest.config.engine.js` | Jest config for game engine / AI unit tests |
