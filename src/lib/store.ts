import { Poll } from "@/types/poll";
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
  showScores: boolean
): Promise<Poll> {
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
    return typeof data === "string" ? JSON.parse(data) : (data as unknown as Poll);
  } else {
    return memPolls.get(id) || null;
  }
}

async function savePoll(poll: Poll): Promise<void> {
  if (redis) {
    await redis.set(pollKey(poll.id), JSON.stringify(poll), { ex: 604800 });
  }
  // In-memory polls are mutated in place, no need to save
}

export async function addVote(
  id: string,
  sliderValues: number[]
): Promise<boolean> {
  const poll = await getPoll(id);
  if (!poll || poll.ended) return false;
  if (sliderValues.length !== poll.options.length) return false;
  poll.votes.push(sliderValues);

  if (redis) {
    await savePoll(poll);
  } else {
    memPolls.set(id, poll);
  }

  return true;
}

export function getScores(poll: Poll): number[] {
  if (poll.votes.length === 0) return poll.options.map(() => 0);
  return poll.options.map((_, optIdx) => {
    const sum = poll.votes.reduce((acc, vote) => acc + vote[optIdx], 0);
    return Math.round((sum / poll.votes.length) * 10) / 10;
  });
}

export async function endPoll(id: string): Promise<Poll | null> {
  const poll = await getPoll(id);
  if (!poll || poll.ended) return null;

  poll.ended = true;

  if (poll.votes.length === 0) {
    poll.winner = poll.options[0];
  } else {
    const sums = getScores(poll);
    const maxSum = Math.max(...sums);
    const winners = poll.options.filter((_, i) => sums[i] === maxSum);
    poll.winner = winners[Math.floor(Math.random() * winners.length)];
  }

  if (redis) {
    await savePoll(poll);
  } else {
    memPolls.set(id, poll);
  }

  return poll;
}
