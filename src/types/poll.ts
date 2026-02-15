export type VotingMethod = "slider" | "ranked" | "single" | "veto";

export interface Poll {
  id: string;
  title: string;
  options: string[];
  votes: number[][]; // each vote is array of values (encoding depends on votingMethod)
  ended: boolean;
  winner: string | null;
  hideScores: boolean;
  votingMethod: VotingMethod;
  createdAt: number;
}
