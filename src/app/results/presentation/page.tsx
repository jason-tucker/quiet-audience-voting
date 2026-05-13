"use client";

// Fullscreen, projector-friendly results page. Two modes:
//
// - LIVE (default): SSE-driven, leaderboard reorders in real time, big
//   numbers for the audience. Same SSE stream the existing /results page
//   uses — no schema change.
//
// - REVEAL: pauses live updates and progressively unveils results from
//   bottom rank up. Use `Reveal next` to step through, `Reveal all` to
//   show everything, `Resume live` to drop back into live updates.
//
// Keyboard:  Space / -> = reveal next ;  R = resume live ;  F = fullscreen
//
// See roadmap U1 (#29).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VoteResult } from "@/types";

type Mode = "live" | "reveal";

type SsePayload = {
  films: VoteResult[];
  total: number;
  votingOpenedAt: string | null;
  serverTime: string;
};

export default function PresentationPage() {
  const [films, setFilms] = useState<VoteResult[]>([]);
  const [total, setTotal] = useState(0);
  const [mode, setMode] = useState<Mode>("live");
  // Number of bottom-ranked films currently revealed in reveal mode. Starts
  // at 0 (everything hidden); incremented by the Reveal Next button.
  const [revealedFromBottom, setRevealedFromBottom] = useState(0);
  // Snapshot of `films` taken at the moment we entered reveal mode, so a
  // late-arriving vote doesn't reshuffle the leaderboard mid-reveal.
  const [revealSnapshot, setRevealSnapshot] = useState<VoteResult[]>([]);
  const [eventName, setEventName] = useState("Film Festival");

  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => mounted && setEventName(d.eventName ?? "Film Festival"))
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const es = new EventSource(`/api/results/stream?cb=${Date.now()}`);
    esRef.current = es;
    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data) as SsePayload;
        setFilms(payload.films);
        setTotal(payload.total);
      } catch {
        // ignore malformed events
      }
    };
    es.onerror = () => {
      es.close();
    };
    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  // Sorted leaderboard. In reveal mode, use the frozen snapshot so position
  // ordering is stable while we step through.
  const board = useMemo(() => {
    const src = mode === "reveal" ? revealSnapshot : films;
    return [...src].sort((a, b) => b.count - a.count || a.filmName.localeCompare(b.filmName));
  }, [films, mode, revealSnapshot]);

  const enterReveal = useCallback(() => {
    setRevealSnapshot(films);
    setRevealedFromBottom(0);
    setMode("reveal");
  }, [films]);

  const revealNext = useCallback(() => {
    setRevealedFromBottom((n) => Math.min(n + 1, board.length));
  }, [board.length]);

  const revealAll = useCallback(() => {
    setRevealedFromBottom(board.length);
  }, [board.length]);

  const resumeLive = useCallback(() => {
    setMode("live");
    setRevealedFromBottom(0);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === "undefined") return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === " " || e.key === "ArrowRight") {
        e.preventDefault();
        if (mode === "live") enterReveal();
        else revealNext();
      } else if (e.key.toLowerCase() === "r") {
        resumeLive();
      } else if (e.key.toLowerCase() === "f") {
        toggleFullscreen();
      } else if (e.key.toLowerCase() === "a") {
        if (mode === "reveal") revealAll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, enterReveal, revealNext, resumeLive, toggleFullscreen, revealAll]);

  // In reveal mode, position N counts from the bottom — i.e. the WORST film
  // is revealed first, then second-worst, climbing toward the winner. Each
  // row is visible iff (board.length - 1 - i) < revealedFromBottom, where i
  // is its index in the sorted board (0 = winner).
  const isRowVisible = (index: number) =>
    mode === "live" || board.length - 1 - index < revealedFromBottom;

  const maxCount = board.length > 0 ? Math.max(1, board[0].count) : 1;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">{eventName}</h1>
            <p className="mt-1 text-sm uppercase tracking-widest text-white/40">
              {mode === "live" ? "Live" : "Reveal"} • {total} {total === 1 ? "vote" : "votes"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            {mode === "live" ? (
              <button
                onClick={enterReveal}
                className="rounded-full bg-white px-5 py-2 font-semibold text-black hover:bg-white/90"
              >
                Start reveal
              </button>
            ) : (
              <>
                <button
                  onClick={revealNext}
                  disabled={revealedFromBottom >= board.length}
                  className="rounded-full bg-white px-5 py-2 font-semibold text-black hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/30"
                >
                  Reveal next ({revealedFromBottom}/{board.length})
                </button>
                <button
                  onClick={revealAll}
                  className="rounded-full bg-white/10 px-5 py-2 font-semibold text-white hover:bg-white/20"
                >
                  Reveal all
                </button>
                <button
                  onClick={resumeLive}
                  className="rounded-full bg-white/10 px-5 py-2 font-semibold text-white hover:bg-white/20"
                >
                  Resume live
                </button>
              </>
            )}
            <button
              onClick={toggleFullscreen}
              className="rounded-full bg-white/10 px-5 py-2 font-semibold text-white hover:bg-white/20"
              title="Toggle fullscreen (F)"
            >
              ⛶
            </button>
          </div>
        </header>

        <ol className="flex flex-col gap-3">
          {board.map((film, index) => {
            const visible = isRowVisible(index);
            const isWinner = visible && index === 0 && (revealedFromBottom === board.length || mode === "live");
            const pct = total > 0 ? (film.count / total) * 100 : 0;
            const barPct = (film.count / maxCount) * 100;
            return (
              <li
                key={film.filmId}
                className="relative grid grid-cols-[3rem_1fr_auto] items-center gap-4 rounded-xl bg-zinc-900 px-5 py-4 ring-1 ring-white/5 transition-all duration-500"
                style={{
                  opacity: visible ? 1 : 0.08,
                  filter: visible ? "blur(0)" : "blur(10px)",
                }}
                aria-hidden={!visible}
              >
                <div
                  className={
                    "text-3xl font-bold tabular-nums " +
                    (isWinner ? "text-yellow-300" : "text-white/40")
                  }
                >
                  {index + 1}
                </div>

                <div className="flex items-center gap-4 overflow-hidden">
                  {film.posterUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={film.posterUrl}
                      alt=""
                      className="h-16 w-12 shrink-0 rounded object-contain ring-1 ring-white/10"
                    />
                  )}
                  <div className="min-w-0">
                    <div
                      className={
                        "truncate font-semibold " +
                        (isWinner ? "text-3xl text-yellow-200 md:text-5xl" : "text-xl md:text-2xl")
                      }
                    >
                      {film.filmName}
                    </div>
                    <div className="truncate text-sm text-white/50">{film.school}</div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div
                    className={
                      "font-bold tabular-nums " +
                      (isWinner ? "text-5xl text-yellow-200 md:text-7xl" : "text-3xl md:text-4xl")
                    }
                  >
                    {film.count}
                  </div>
                  <div className="text-xs uppercase tracking-widest text-white/40">
                    {pct.toFixed(0)}%
                  </div>
                </div>

                <div className="col-span-3 mt-1 h-1 overflow-hidden rounded bg-white/5">
                  <div
                    className={
                      "h-full rounded transition-all duration-700 ease-out " +
                      (isWinner ? "bg-yellow-300" : "bg-white/40")
                    }
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>

        {board.length === 0 && (
          <p className="rounded-xl bg-zinc-900 p-8 text-center text-white/50 ring-1 ring-white/5">
            Waiting for votes…
          </p>
        )}

        <footer className="mt-4 text-center text-xs text-white/30">
          Space / → reveal next • R resume live • A reveal all • F fullscreen
        </footer>
      </div>
    </main>
  );
}
