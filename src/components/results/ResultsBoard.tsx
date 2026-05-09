"use client";

import type { VoteResult } from "@/types";
import { VoteBar } from "./VoteBar";
import { WinnerDisplay } from "./WinnerDisplay";

interface Props {
  films: VoteResult[];
  total: number;
  eventName: string;
  connected: boolean;
}

export function ResultsBoard({ films, total, eventName, connected }: Props) {
  const winner = films.find((f) => f.count > 0);
  const rest = winner ? films.filter((f) => f.filmId !== winner.filmId) : films;

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">{eventName}</h1>
          <p className="mt-1 text-sm text-white/60 sm:text-base">
            {total} {total === 1 ? "vote" : "votes"} cast
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
            aria-label={connected ? "Live" : "Disconnected"}
          />
          <span className="text-sm text-white/60">{connected ? "Live" : "Reconnecting…"}</span>
        </div>
      </header>

      {winner && (
        <section className="mb-8">
          <WinnerDisplay result={winner} />
        </section>
      )}

      <section className="space-y-3">
        {rest.map((result, idx) => (
          <VoteBar key={result.filmId} result={result} rank={idx + (winner ? 2 : 1)} />
        ))}
      </section>

      {films.length === 0 && (
        <p className="py-12 text-center text-white/50">No films yet.</p>
      )}
    </div>
  );
}
