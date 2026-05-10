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

const clients = new Set<Controller>();
const encoder = new TextEncoder();

export function addClient(controller: Controller): void {
  clients.add(controller);
}

export function removeClient(controller: Controller): void {
  clients.delete(controller);
}

export function broadcastUpdate(payload: SsePayload): void {
  const message = encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
  for (const controller of clients) {
    try {
      controller.enqueue(message);
    } catch {
      clients.delete(controller);
    }
  }
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
