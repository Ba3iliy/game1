export enum GamePhase {
  SETUP = 'SETUP',
  TURN_START = 'TURN_START',
  ROLL = 'ROLL',
  ACTION = 'ACTION',
  END_TURN = 'END_TURN',
  GAME_OVER = 'GAME_OVER',
  AUCTION = 'AUCTION',
  TRADE = 'TRADE'
}

export enum CellType {
  START = 'START',
  CHANNEL = 'CHANNEL',
  BRIEF = 'BRIEF',
  MARKET = 'MARKET',
  TAX = 'TAX',
  CRISIS = 'CRISIS',
  GOTO_CRISIS = 'GOTO_CRISIS',
  FREE_PARKING = 'FREE_PARKING' // Using as "Research Bonus"
}

export type ChannelGroup = 'Search' | 'Social' | 'Video' | 'Influencers' | 'OOH' | 'Audio' | 'TV' | 'PR';

export interface ChannelData {
  groupId: ChannelGroup;
  color: string;
  price: number;
  baseRent: number;
  buildCost: number;
  rentMultipliers: number[]; // [x1, x2, x3, x4, x6]
}

export interface Cell {
  id: number;
  type: CellType;
  name: string;
  data?: ChannelData;
  taxAmount?: number;
}

export interface Player {
  id: number;
  name: string;
  color: string;
  balance: number;
  position: number;
  efficiency: number; // E: 0-5
  isJailed: boolean;
  jailTurns: number; // 0-3
  ownedProperties: number[]; // Cell IDs
  propertyLevels: Record<number, number>; // Cell ID -> Level (0-5)
  isMortgaged: Record<number, boolean>; // Cell ID -> boolean
  isBankrupt: boolean;
  hasSynergy: boolean; // One-time bonus used
  hasAntiCrisis: boolean;
}

export interface Card {
  id: number;
  type: 'BRIEF' | 'MARKET';
  title: string;
  text: string;
  effect: (player: Player, players: Player[], setLog: (s: string) => void) => Partial<Player>;
  globalEffect?: boolean; // If true, affects game state globally (simplified for this ver)
}

export interface GameLog {
  turn: number;
  message: string;
  timestamp: number;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  turnCount: number;
  phase: GamePhase;
  dice: [number, number];
  logs: GameLog[];
  lastActionMessage: string | null;
  winnerId: number | null;
  settings: {
    maxTimeMinutes: number;
    auctionEnabled: boolean;
    uniformBuild: boolean;
  };
  startTime: number;
}