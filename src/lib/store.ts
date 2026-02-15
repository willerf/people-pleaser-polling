import { Poll, VotingMethod } from "@/types/poll";
import { nanoid } from "nanoid";
import { Redis } from "@upstash/redis";

// Use Upstash Redis when env vars are set (production), fallback to in-memory for local dev
const redisUrl =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.KV_URL;
const redisToken =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_TOKEN;

const redis =
  redisUrl && redisToken
    ? new Redis({ url: redisUrl, token: redisToken })
    : null;

// In-memory fallback for local development
const globalForPolls = globalThis as unknown as { polls: Map<string, Poll> };
globalForPolls.polls = globalForPolls.polls || new Map<string, Poll>();
const memPolls = globalForPolls.polls;

function pollKey(id: string) {
  return `poll:${id}`;
}

export async function createPoll(
  options: string[],
  hideScores: boolean,
  votingMethod: VotingMethod = "slider"
): Promise<Poll> {
  const id = nanoid(10);
  const poll: Poll = {
    id,
    options,
    votes: [],
    ended: false,
    winner: null,
    hideScores,
    votingMethod,
    createdAt: Date.now(),
  };

  if (redis) {
    // Store with 7-day TTL
    await redis.set(pollKey(id), JSON.stringify(poll), { ex: 604800 });
  } else {
    memPolls.set(id, poll);
  }

  return poll;
}

export async function getPoll(id: string): Promise<Poll | null> {
  if (redis) {
    const data = await redis.get<string>(pollKey(id));
    if (!data) return null;
    const poll: Poll = typeof data === "string" ? JSON.parse(data) : (data as unknown as Poll);
    // Backward compat: default votingMethod for old polls
    if (!poll.votingMethod) poll.votingMethod = "slider";
    return poll;
  } else {
    const poll = memPolls.get(id) || null;
    if (poll && !poll.votingMethod) poll.votingMethod = "slider";
    return poll;
  }
}

async function savePoll(poll: Poll): Promise<void> {
  if (redis) {
    await redis.set(pollKey(poll.id), JSON.stringify(poll), { ex: 604800 });
  }
  // In-memory polls are mutated in place, no need to save
}

function validateVote(poll: Poll, values: number[]): boolean {
  const n = poll.options.length;
  if (values.length !== n) return false;

  switch (poll.votingMethod) {
    case "slider":
      return values.every((v) => v >= -1 && v <= 1);
    case "ranked": {
      const sorted = [...values].sort((a, b) => a - b);
      return sorted.every((v, i) => v === i + 1);
    }
    case "single":
    case "veto": {
      const ones = values.filter((v) => v === 1).length;
      const zeros = values.filter((v) => v === 0).length;
      return ones === 1 && zeros === n - 1;
    }
    default:
      return false;
  }
}

export async function addVote(
  id: string,
  values: number[]
): Promise<boolean> {
  const poll = await getPoll(id);
  if (!poll || poll.ended) return false;
  if (!validateVote(poll, values)) return false;
  poll.votes.push(values);

  if (redis) {
    await savePoll(poll);
  } else {
    memPolls.set(id, poll);
  }

  return true;
}

export function getScores(poll: Poll): number[] {
  if (poll.votes.length === 0) return poll.options.map(() => 0);

  switch (poll.votingMethod) {
    case "slider":
      return poll.options.map((_, optIdx) => {
        const sum = poll.votes.reduce((acc, vote) => acc + vote[optIdx], 0);
        return Math.round((sum / poll.votes.length) * 10) / 10;
      });
    case "ranked": {
      const n = poll.options.length;
      return poll.options.map((_, optIdx) => {
        const sum = poll.votes.reduce((acc, vote) => acc + (n - vote[optIdx]), 0);
        return Math.round((sum / poll.votes.length) * 10) / 10;
      });
    }
    case "single":
      return poll.options.map((_, optIdx) => {
        return poll.votes.reduce((acc, vote) => acc + vote[optIdx], 0);
      });
    case "veto":
      return poll.options.map((_, optIdx) => {
        return poll.votes.reduce((acc, vote) => acc + vote[optIdx], 0);
      });
    default:
      return poll.options.map(() => 0);
  }
}

function findWinnerSlider(poll: Poll): string {
  const scores = getScores(poll);
  const maxScore = Math.max(...scores);
  const winners = poll.options.filter((_, i) => scores[i] === maxScore);
  return winners[Math.floor(Math.random() * winners.length)];
}

function findWinnerRanked(poll: Poll): string {
  // Instant-runoff voting (IRV)
  const n = poll.options.length;
  const eliminated = new Set<number>();

  // Each vote is ranks: vote[optIdx] = rank (1 = best)
  // We need to simulate rounds
  for (let round = 0; round < n - 1; round++) {
    // Count first-choice votes among non-eliminated options
    const firstChoiceCounts = new Array(n).fill(0);
    for (const vote of poll.votes) {
      // Find the non-eliminated option with the best (lowest) rank
      let bestRank = Infinity;
      let bestIdx = -1;
      for (let i = 0; i < n; i++) {
        if (!eliminated.has(i) && vote[i] < bestRank) {
          bestRank = vote[i];
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) firstChoiceCounts[bestIdx]++;
    }

    // Check for majority
    const totalVotes = poll.votes.length;
    for (let i = 0; i < n; i++) {
      if (!eliminated.has(i) && firstChoiceCounts[i] > totalVotes / 2) {
        return poll.options[i];
      }
    }

    // Eliminate the candidate with fewest first-choice votes (among non-eliminated)
    let minCount = Infinity;
    for (let i = 0; i < n; i++) {
      if (!eliminated.has(i) && firstChoiceCounts[i] < minCount) {
        minCount = firstChoiceCounts[i];
      }
    }
    // Find all candidates tied for last
    const lastPlace = [];
    for (let i = 0; i < n; i++) {
      if (!eliminated.has(i) && firstChoiceCounts[i] === minCount) {
        lastPlace.push(i);
      }
    }
    // Eliminate one (random among ties)
    eliminated.add(lastPlace[Math.floor(Math.random() * lastPlace.length)]);
  }

  // Last one standing
  for (let i = 0; i < n; i++) {
    if (!eliminated.has(i)) return poll.options[i];
  }
  return poll.options[0];
}

function findWinnerSingle(poll: Poll): string {
  const scores = getScores(poll);
  const maxScore = Math.max(...scores);
  const winners = poll.options.filter((_, i) => scores[i] === maxScore);
  return winners[Math.floor(Math.random() * winners.length)];
}

function findWinnerVeto(poll: Poll): string {
  const scores = getScores(poll);
  const minScore = Math.min(...scores);
  const winners = poll.options.filter((_, i) => scores[i] === minScore);
  return winners[Math.floor(Math.random() * winners.length)];
}

export async function endPoll(id: string): Promise<Poll | null> {
  const poll = await getPoll(id);
  if (!poll || poll.ended) return null;

  poll.ended = true;

  if (poll.votes.length === 0) {
    poll.winner = poll.options[0];
  } else {
    switch (poll.votingMethod) {
      case "slider":
        poll.winner = findWinnerSlider(poll);
        break;
      case "ranked":
        poll.winner = findWinnerRanked(poll);
        break;
      case "single":
        poll.winner = findWinnerSingle(poll);
        break;
      case "veto":
        poll.winner = findWinnerVeto(poll);
        break;
    }
  }

  if (redis) {
    await savePoll(poll);
  } else {
    memPolls.set(id, poll);
  }

  return poll;
}
