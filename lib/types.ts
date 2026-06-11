export type GameStatus = 'scheduled' | 'blocked' | 'finished';

export interface Game {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  homeFlagUrl?: string;
  awayFlagUrl?: string;
  phase: string;
  /** Timestamp em milissegundos */
  matchDate: number;
  status: GameStatus;
  homeScoreOfficial?: number;
  awayScoreOfficial?: number;
  pointsCalculated?: boolean;
}

export interface Guess {
  id: string;
  userId: string;
  gameId: string;
  homeScoreGuess: number;
  awayScoreGuess: number;
  points: number;
  exactScoreHit: boolean;
  resultHit: boolean;
  goalHits: number;
  calculated: boolean;
}

export interface UserProfile {
  uid: string;
  name: string;
  photoURL: string;
  role: string;
  status: string;
  totalPoints: number;
  exactScoreHits: number;
  resultHits: number;
  goalHits: number;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  inviteCode: string;
  visibility: 'private' | 'public';
  maxMembers: number;
  status: string;
  createdAt: string;
}

export type GroupRole = 'owner' | 'member';

export interface GroupSummary extends Group {
  myRole: GroupRole;
}

export interface GroupMemberProfile extends UserProfile {
  memberDocId: string;
  userId: string;
  groupRole: GroupRole;
  joinedAt: string;
}
