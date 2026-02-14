import { Poll } from "@/types/poll";
import { nanoid } from "nanoid";

const globalForPolls = globalThis as unknown as { polls: Map<string, Poll> };
globalForPolls.polls = globalForPolls.polls || new Map<string, Poll>();
const polls = globalForPolls.polls;

export function createPoll(options: string[], showScores: boolean): Poll {
  const id = nanoid(10);
  const poll: Poll = {
    id,
    options,
    votes: [],
    ended: false,
    winner: null,
    showScores,
    createdAt: Date.now(),
  };
  polls.set(id, poll);
  return poll;
}

export function getPoll(id: string): Poll | undefined {
  return polls.get(id);
}

export function addVote(id: string, sliderValues: number[]): boolean {
  const poll = polls.get(id);
  if (!poll || poll.ended) return false;
  if (sliderValues.length !== poll.options.length) return false;
  poll.votes.push(sliderValues);
  return true;
}

export function getScores(poll: Poll): number[] {
  if (poll.votes.length === 0) return poll.options.map(() => 0);
  return poll.options.map((_, optIdx) => {
    const sum = poll.votes.reduce((acc, vote) => acc + vote[optIdx], 0);
    return Math.round((sum / poll.votes.length) * 10) / 10;
  });
}

export function endPoll(id: string): Poll | null {
  const poll = polls.get(id);
  if (!poll || poll.ended) return null;

  poll.ended = true;

  if (poll.votes.length === 0) {
    poll.winner = poll.options[0];
    return poll;
  }

  const sums = getScores(poll);
  const maxSum = Math.max(...sums);
  const winners = poll.options.filter((_, i) => sums[i] === maxSum);

  // Random tiebreak
  poll.winner = winners[Math.floor(Math.random() * winners.length)];
  return poll;
}
