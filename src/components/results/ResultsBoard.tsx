"use client";

import { useEffect, useState } from "react";
import type { VoteResult, VoteEvent } from "@/types";
import { VoteBar } from "./VoteBar";
import { WinnerDisplay } from "./WinnerDisplay";
import { FilmTimelineModal } from "./FilmTimelineModal";
import { ResultsTimeline } from "./ResultsTimeline";

interface Props {
  films: VoteResult[];
  total: number;
  eventName: string;
  votingOpenedAt: string | null;
  status: "live" | "stale" | "disconnected";
  lastUpdateMs: number | null;
  votingOpen: boolean | null;
  voteEvents: VoteEvent[];
}

function formatAge(ms: number | null): string {
  if (ms === null) return "never";
  const sec = Math.floor(ms / 1000);
  if (sec < 1) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  return `${min}m ${sec % 60}s ago`;
}

export function ResultsBoard({
  films,
  total,
  eventName,
  votingOpenedAt,
  status,
  lastUpdateMs,
  votingOpen,
  voteEvents,
}: Props) {
  const winner = films.find((f) => f.count > 0);
  const rest = winner ? films.filter((f) => f.filmId !== winner.filmId) : films;
  const [selected, setSelected] = useState<VoteResult | null>(null);
  // Re-render every second so the "last update" age stays current.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const dot =
    status === "live" ? "bg-green-500" : status === "stale" ? "bg-amber-500" : "bg-red-500";
  const label =
    status === "live" ? "Live" : status === "stale" ? "Reconnecting…" : "Disconnected";

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-white sm:text-4xl">{eventName}</h1>
            {votingOpen === true && (
              <span className="rounded-full bg-green-900/60 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-green-300 ring-1 ring-green-700">
                Voting open
              </span>
            )}
            {votingOpen === false && (
              <span className="rounded-full bg-red-900/60 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-red-300 ring-1 ring-red-700">
                Voting closed
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-white/60 sm:text-base">
            {total} {total === 1 ? "vote" : "votes"} cast
          </p>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div>
            <div className="flex items-center gap-2 justify-end">
              <span
                className={`h-2.5 w-2.5 rounded-full ${dot} ${
                  status === "live" ? "animate-pulse" : ""
                }`}
                aria-label={label}
              />
              <span className="text-sm text-white/70">{label}</span>
            </div>
            <p className="mt-0.5 text-xs text-white/40">
              Last update: {formatAge(lastUpdateMs)}
            </p>
          </div>
        </div>
      </header>

      {votingOpenedAt && films.length > 0 && (
        <section className="mb-6">
          <ResultsTimeline
            films={films}
            votingOpenedAt={votingOpenedAt}
            events={voteEvents}
          />
        </section>
      )}

      {winner && (
        <section className="mb-8" onClick={() => setSelected(winner)}>
          <WinnerDisplay result={winner} />
        </section>
      )}

      <section className="space-y-3">
        {rest.map((result, idx) => (
          <VoteBar
            key={result.filmId}
            result={result}
            rank={idx + (winner ? 2 : 1)}
            onClick={() => setSelected(result)}
          />
        ))}
      </section>

      {films.length === 0 && (
        <p className="py-12 text-center text-white/50">No films yet.</p>
      )}

      {selected && (
        <FilmTimelineModal
          film={selected}
          onClose={() => setSelected(null)}
          votingOpenedAt={votingOpenedAt}
          events={voteEvents}
        />
      )}
    </div>
  );
}
