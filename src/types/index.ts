// Tournament Types
export type TournamentFormat = "SINGLE_KNOCKOUT" | "DOUBLE_KNOCKOUT" | "ROUND_ROBIN" | "GROUP_AND_KNOCKOUT";
export type TournamentStatus = "DRAFT" | "REGISTRATION" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type MatchRound = "FINAL" | "SEMI_FINAL" | "QUARTER_FINAL" | "ROUND_OF_16" | "ROUND_OF_32" | "GROUP_STAGE" | "PLAYOFF";

export interface TournamentMatch {
  _id: string;
  round: MatchRound;
  position: number;
  homeTeam?: string | { _id: string; name: string; logo?: string };
  awayTeam?: string | { _id: string; name: string; logo?: string };
  homeScore?: number;
  awayScore?: number;
  matchDate?: string;
  venue?: string;
  status: "PENDING" | "SCHEDULED" | "LIVE" | "COMPLETED" | "BYE";
  winner?: "HOME" | "AWAY" | "DRAW";
  nextMatchId?: string;
  nextMatchPosition?: number;
}

export interface Tournament {
  _id: string;
  club: string | { _id: string; name: string };
  name: string;
  slug?: string;
  format: TournamentFormat;
  teamCount: number;
  startDate?: string;
  endDate?: string;
  venue?: string;
  description?: string;
  logo?: string;
  status: TournamentStatus;
  teams: (string | { _id: string; name: string; logo?: string })[];
  matches: TournamentMatch[];
  currentRound?: MatchRound;
  champion?: string | { _id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

// User Types
export type UserRole = "SUPER_ADMIN" | "CLUB_ADMIN" | "TEAM_MANAGER" | "COACH" | "SCORER" | "PLAYER" | "MEMBER";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  photo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Club Types
export interface Club {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  founded?: number;
  stadium?: { name?: string; capacity?: number; address?: string };
  logo?: string;
  cover?: string;
  contact?: { email?: string; phone?: string; website?: string };
  location?: { country?: string; city?: string; address?: string };
  createdAt: string;
  updatedAt: string;
}

// Player Types
export type PlayerPosition = "GOALKEEPER" | "DEFENDER" | "MIDFIELDER" | "FORWARD";
export type PlayerStatus = "ACTIVE" | "INJURED" | "SUSPENDED" | "LOANED" | "INACTIVE";

export interface Player {
  _id: string;
  club: string | Club;
  firstName: string;
  lastName: string;
  number?: number;
  position: PlayerPosition;
  subPosition?: string;
  status: PlayerStatus;
  dateOfBirth?: string;
  nationality?: string;
  photo?: string;
  height?: number;
  weight?: number;
  preferredFoot?: string;
  bio?: string;
  pac?: number;
  sho?: number;
  pas?: number;
  dri?: number;
  def?: number;
  phy?: number;
  ovr?: number; // computed overall rating
  isActive?: boolean;
  user?: string | User;
  createdAt: string;
  updatedAt: string;
}

// Team Types
export type TeamCategory = "SENIOR" | "JUNIOR" | "WOMEN" | "ACADEMY" | "RESERVE";

export interface Team {
  _id: string;
  club: string | Club;
  name: string;
  category: TeamCategory;
  division?: string;
  manager?: string | User;
  coach?: string | User;
  captain?: string | Player;
  players?: Player[];
  formation?: string;
  bench?: (string | Player)[];
  logo?: string;
  createdAt: string;
  updatedAt: string;
}

// Match Types
export type MatchStatus = "SCHEDULED" | "LIVE" | "HT" | "FT" | "POSTPONED" | "CANCELLED";

export interface Match {
  _id: string;
  club: string | Club;
  homeTeam: string | Team;
  awayTeam: string | Team;
  matchDate: string;
  kickoff?: string;
  venue?: { name?: string; address?: string };
  status: MatchStatus;
  score: { home: number; away: number };
  events: any[];
  attendance?: number;
  competition?: string | { _id: string; name: string };
  season?: string | { _id: string; name: string };
  referee?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Competition Types
export type CompetitionType = "LEAGUE" | "CUP" | "TOURNAMENT" | "FRIENDLY";

export interface Competition {
  _id: string;
  club: string | Club;
  name: string;
  type: CompetitionType;
  logo?: string;
  country?: string;
  description?: string;
  season?: string;
  format?: string;
  teams?: (string | Team)[];
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Season Types
export interface Season {
  _id: string;
  club: string | Club;
  name: string;
  year: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// News Types
export interface News {
  _id: string;
  club: string | Club;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  cover?: string;
  category?: string;
  tags?: string[];
  isPublished: boolean;
  viewCount: number;
  author?: User;
  createdAt: string;
  updatedAt: string;
}

// Gallery Types
export interface Gallery {
  _id: string;
  club: string | Club;
  title: string;
  description?: string;
  category?: string;
  coverImage?: string;
  media: { _id: string; url: string; type: string; caption?: string }[];
  isPublished?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Academy Types
export interface Academy {
  _id: string;
  club: string | Club;
  name: string;
  description?: string;
  ageGroup: string;
  headCoach?: string | User;
  photo?: string;
  schedule?: { trainingDays?: string[]; trainingTime?: string };
  players?: Player[];
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Training Types
export interface TrainingSession {
  _id: string;
  club: string | Club;
  team: string | Team;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  type: string;
  description?: string;
  coach?: string | User;
  status: string;
  attendance?: { player: string | Player; status: string; notes?: string }[];
  createdAt: string;
  updatedAt: string;
}

// Member Types
export interface Member {
  _id: string;
  user: string | User;
  club: string | Club;
  membershipType: string;
  expiryDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Statistics Types
export interface Statistic {
  _id: string;
  club: string | Club;
  player: string | Player;
  team?: string | Team;
  type: string;
  value: number;
  season?: string;
  competition?: string;
  createdAt: string;
  updatedAt: string;
}

// Match Formation Types
export interface MatchFormation {
  _id: string;
  club: string | Club;
  match: string | Match;
  team: string | Team;
  formation: string;
  playerCount: number; // 5, 7, 9, or 11
  startingXI: { player: string | Player; position: string; slotIndex: number }[];
  captain?: string | Player;
  bench?: (string | Player)[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
