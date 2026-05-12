import { prisma } from "./prisma";
import { getVotingOpenedAt } from "./settings";
import type { VoteResult, VoteEvent } from "@/types";

type Controller = ReadableStreamDefaultController<Uint8Array>;

export interface SsePayload {
  films: VoteResult[];
  total: number;
  votingOpenedAt: string | null;
  lastVote?: VoteEvent;
  serverTime: string;
}

const HEARTBEAT_MS = 3000;
// Cap concurrent SSE connections so one client can't pin unbounded memory
// or amplify the heartbeat fan-out. The /results page is unauthenticated
// and a single user can open many tabs.
const MAX_CLIENTS = 200;

// Stash live state on globalThis so HMR-driven re-imports of this module
// during dev don't orphan the heartbeat or duplicate the client set.
const g = globalThis as unknown as {
  __qavSseClients?: Set<Controller>;
  __qavSseHeartbeat?: NodeJS.Timeout | null;
};
if (!g.__qavSseClients) g.__qavSseClients = new Set();
const clients = g.__qavSseClients;

const encoder = new TextEncoder();

function fanout(message: Uint8Array): void {
  for (const controller of clients) {
    try {
      controller.enqueue(message);
    } catch {
      clients.delete(controller);
    }
  }
}

async function heartbeatTick(): Promise<void> {
  if (clients.size === 0) {
    stopHeartbeat();
    return;
  }
  try {
    const payload = await getCurrentResults();
    fanout(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
  } catch {
    // Try again on the next tick.
  }
}

function startHeartbeat(): void {
  if (g.__qavSseHeartbeat) return;
  g.__qavSseHeartbeat = setInterval(() => {
    heartbeatTick();
  }, HEARTBEAT_MS);
}

function stopHeartbeat(): void {
  if (g.__qavSseHeartbeat) {
    clearInterval(g.__qavSseHeartbeat);
    g.__qavSseHeartbeat = null;
  }
}

export class TooManySseClients extends Error {
  constructor() {
    super("Too many SSE clients");
  }
}

export function addClient(controller: Controller): void {
  if (clients.size >= MAX_CLIENTS) {
    throw new TooManySseClients();
  }
  clients.add(controller);
  startHeartbeat();
}

export function removeClient(controller: Controller): void {
  clients.delete(controller);
  if (clients.size === 0) stopHeartbeat();
}

export function broadcastUpdate(payload: SsePayload): void {
  fanout(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
}

export async function getCurrentResults(lastVote?: VoteEvent): Promise<SsePayload> {
  const [films, votingOpenedAt] = await Promise.all([
    prisma.film.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { votes: true } } },
    }),
    getVotingOpenedAt(),
  ]);

  const total = films.reduce((sum, f) => sum + f._count.votes, 0);

  const results: VoteResult[] = films.map((f) => ({
    filmId: f.id,
    filmName: f.name,
    school: f.school,
    posterUrl: f.posterUrl,
    count: f._count.votes,
    percentage: total > 0 ? (f._count.votes / total) * 100 : 0,
  }));

  results.sort((a, b) => b.count - a.count);
  return {
    films: results,
    total,
    votingOpenedAt,
    lastVote,
    serverTime: new Date().toISOString(),
  };
}
