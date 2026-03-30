export interface VanLifePlayer {
  id: string;
  name: string;
  isConnected: boolean;
  score: number;
  color: string;
}

export interface VanLifeGameState {
  type: 'van-life';
  phase: 'LOBBY' | 'PLAYING' | 'GAME_OVER';
  players: VanLifePlayer[];
  currentTurn: string | null;
  claimedRoutes: ClaimedRoute[];
  visitedParks: VisitedPark[];
  version?: number;
}

export interface ClaimedRoute {
  routeId: string;
  playerId: string;
  playerColor: string;
}

export interface VisitedPark {
  parkId: string;
  playerId: string;
}

export interface Park {
  id: string;
  name: string;
  abbr: string;
  x: number;
  y: number;
}

export interface Route {
  id: string;
  from: string;
  to: string;
  color: string;
  segments: number;
  claimedBy?: string;
  claimedColor?: string;
}

export interface VanLifeGameProps {
  socket: any;
  gameState: VanLifeGameState;
  isLeader: boolean;
  slug: string;
}
