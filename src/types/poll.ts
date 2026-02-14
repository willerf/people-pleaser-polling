export interface Poll {
  id: string;
  options: string[];
  votes: number[][]; // each vote is array of slider values (-1 to 1)
  ended: boolean;
  winner: string | null;
  hideScores: boolean;
  createdAt: number;
}
