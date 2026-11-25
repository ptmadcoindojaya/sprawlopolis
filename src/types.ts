/**
 * Sprawlopolis Game Types
 */

export type ZoneType = 'R' | 'C' | 'I' | 'P'; // R: Residential, C: Commercial, I: Industrial, P: Park

export interface RoadEdges {
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
  left?: boolean;
  // Internal connection between edges within the block
  internalConnect?: boolean; 
}

export interface BlockData {
  zone: ZoneType;
  // Road segments inside this block
  roads: RoadEdges;
}

// 2x2 grid representation for a card face
// index 0: top-left (0,0), 1: top-right (1,0), 2: bottom-left (0,1), 3: bottom-right (1,1)
export type CardBlocks = [BlockData, BlockData, BlockData, BlockData];

export interface GoalCard {
  id: number; // 1 to 18
  title: string;
  targetPoints: number; // Same as card id
  description: string;
  descriptionId: string; // Indonesian description
  category: 'zone' | 'road' | 'adjacency' | 'pattern';
}

export interface SprawlopolisCard {
  id: number; // 1-18
  goal: GoalCard;
  blocks: CardBlocks; // Default orientation (0 deg)
}

export interface PlacedBlock {
  cardId: number;
  zone: ZoneType;
  roads: RoadEdges;
  layer: number; // For overlapping height tracking
  blockIndex: number; // 0, 1, 2, 3 in the original card
  rotation: 0 | 180;
}

export interface GridPos {
  x: number; // Grid X coordinate
  y: number; // Grid Y coordinate
}

export interface GridState {
  [key: string]: PlacedBlock; // Key: "x,y"
}

export interface CardInHand {
  card: SprawlopolisCard;
  rotation: 0 | 180;
}

export interface GoalScoreBreakdown {
  goalId: number;
  title: string;
  score: number;
  explanation: string;
}

export interface TotalScoreBreakdown {
  targetScore: number;
  residentialGroupScore: number;
  commercialGroupScore: number;
  industrialGroupScore: number;
  parkGroupScore: number;
  roadNetworkCount: number;
  roadPenalty: number;
  goalScores: GoalScoreBreakdown[];
  totalScore: number;
  isVictory: boolean;
}

export interface MoveHistoryItem {
  grid: GridState;
  hand: CardInHand[];
  deck: SprawlopolisCard[];
  placedCardId: number;
  placedPos: GridPos;
  turnIndex: number;
}

export interface PlayerConfig {
  id: number; // 1, 2, 3, 4
  name: string;
  isMainPlayer: boolean; // True for Player 1 (Main Player)
  color: string;
  isReady: boolean;
  avatar: string;
  occupantClientId?: string | null; // ID of connected client occupying this slot
  occupantName?: string; // Display name of client occupying this slot
  lastSeen?: number; // Timestamp for heartbeat timeout check
}

export interface ConnectedClient {
  clientId: string;
  name: string;
  slotId: number | null;
  lastSeen: number;
}

export interface MultiplayerState {
  roomCode: string;
  totalPlayers: number; // 1, 2, 3, or 4
  myPlayerId: number; // 1..4 (which slot current user joined as)
  myClientId: string; // Unique client ID for current browser tab
  players: PlayerConfig[];
  currentTurnIndex: number; // 0..totalPlayers - 1
  gameCode: string;
  connectedClients: ConnectedClient[];
  isGameActive: boolean;
}

export interface CustomRulesXlsRow {
  CardID: number;
  GoalTitle: string;
  DescriptionID: string;
  TargetPoints: number;
  Block0_Zone: ZoneType;
  Block1_Zone: ZoneType;
  Block2_Zone: ZoneType;
  Block3_Zone: ZoneType;
}
