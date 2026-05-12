"use client";

import { useEffect, useRef, useState } from "react";
import type { Film } from "@/types";
import { Button } from "@/components/ui/Button";

interface Props {
  film: Film;
  onConfirm: () => void;
  onCancel: () => void;
  submitting?: boolean;
}

const AUTO_VOTE_MS = 10000;
const TICK_MS = 50;

export function ExpandedFilmCard({ film, onConfirm, onCancel, submitting }: Props) {
  const [progress, setProgress] = useState(0);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (submitting) return;
    startedAt.current = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt.current;
      setProgress(Math.min(100, (elapsed / AUTO_VOTE_MS) * 100));
    }, TICK_MS);

    const timeout = setTimeout(() => {
      onConfirm();
    }, AUTO_VOTE_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [submitting, onConfirm]);

  const secondsLeft = Math.max(
    0,
    Math.ceil((AUTO_VOTE_MS - (progress / 100) * AUTO_VOTE_MS) / 1000),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="flex max-h-full w-full max-w-2xl flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Poster card — matches the FilmCard treatment exactly: dark bg,
            object-contain so the whole poster shows, bottom gradient with
            the film name + school overlaid. Just bigger. */}
        <button
          aria-label={`Confirm vote for ${film.name}`}
          onClick={onConfirm}
          disabled={submitting}
          className="relative overflow-hidden rounded-2xl bg-zinc-800 ring-4 ring-blue-500 shadow-2xl transition-transform active:scale-[0.99] disabled:opacity-50"
          style={{ aspectRatio: "2 / 3", maxHeight: "70vh", maxWidth: "90vw" }}
        >
          <img
            src={film.posterUrl}
            alt={film.name}
            className="absolute inset-0 h-full w-full object-contain"
            draggable={false}
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-4 sm:p-6">
            <h2 className="text-2xl font-bold text-white sm:text-3xl md:text-4xl">{film.name}</h2>
            <p className="mt-1 text-base text-white/80 sm:text-lg md:text-xl">{film.school}</p>
          </div>
          {/* Auto-vote progress bar across the bottom of the poster card */}
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/40">
            <div
              className="h-full bg-blue-400"
              style={{ width: `${progress}%`, transition: `width ${TICK_MS}ms linear` }}
            />
          </div>
        </button>

        <div className="flex w-full items-center justify-center gap-3 sm:gap-4">
          <Button variant="ghost" size="xl" onClick={onCancel} disabled={submitting}>
            Exit
          </Button>
          <Button variant="primary" size="xl" onClick={onConfirm} disabled={submitting}>
            {submitting ? "Voting…" : `Vote (${secondsLeft}s)`}
          </Button>
        </div>

        <p className="text-center text-xs text-white/50 sm:text-sm">
          Voting automatically in {secondsLeft}s — tap the poster to vote now or tap outside to
          cancel.
        </p>
      </div>
    </div>
  );
}
