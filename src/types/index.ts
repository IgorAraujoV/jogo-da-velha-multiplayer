export interface User {
  id: string;
  email: string;
  name?: string;
  wins: number;
  draws: number;
  losses: number;
}

export interface Match {
  id: string;
  player1_id: string;
  player2_id: string | null;
  current_turn: 'player1' | 'player2' | null;
  status: 'waiting' | 'in_progress' | 'finished';
  board_state: (string | null)[];
  winner_id: string | null;
  is_private: boolean;
  code: string | null;
  created_at: string;
  updated_at: string;
}

export interface Move {
  id: string;
  match_id: string;
  player_id: string;
  position: number;
  move_number: number;
  created_at: string;
}

export type GameResult = 'win' | 'loss' | 'draw' | null;

