"use client";

import type { Film } from "@/types";
import { Button } from "@/components/ui/Button";

interface Props {
  film: Film;
  onConfirm: () => void;
  onCancel: () => void;
  submitting?: boolean;
}

export function ExpandedFilmCard({ film, onConfirm, onCancel, submitting }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="relative flex max-h-[95vh] w-full max-w-md flex-col items-center gap-4 p-4 sm:max-w-lg sm:gap-6 sm:p-6 md:max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          aria-label="Confirm vote by tapping poster"
          onClick={onConfirm}
          disabled={submitting}
          className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl ring-4 ring-blue-500 shadow-2xl transition-transform active:scale-[0.99] disabled:opacity-50"
          style={{ maxHeight: "65vh" }}
        >
          <img
            src={film.posterUrl}
            alt={film.name}
            className="max-h-[65vh] w-auto max-w-full object-contain"
            draggable={false}
          />
        </button>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl md:text-4xl">{film.name}</h2>
          <p className="mt-1 text-base text-white/80 sm:text-lg md:text-xl">{film.school}</p>
        </div>

        <div className="flex w-full justify-center gap-3 sm:gap-4">
          <Button variant="ghost" size="xl" onClick={onCancel} disabled={submitting}>
            Exit
          </Button>
          <Button variant="primary" size="xl" onClick={onConfirm} disabled={submitting}>
            {submitting ? "Voting…" : "Vote"}
          </Button>
        </div>

        <p className="text-center text-xs text-white/50 sm:text-sm">
          Tap the poster to vote, or tap outside to cancel
        </p>
      </div>
    </div>
  );
}
