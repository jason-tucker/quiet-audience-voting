"use client";

import type { Film } from "@/types";

export function FilmCard({
  film,
  onClick,
  highlighted,
}: {
  film: Film;
  onClick: () => void;
  highlighted?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative h-full w-full overflow-hidden rounded-lg bg-zinc-800 transition-all active:scale-[0.98] ${
        highlighted
          ? "ring-4 ring-white/80 scale-[1.02]"
          : "ring-0 ring-blue-500 active:ring-4"
      }`}
    >
      <img
        src={film.posterUrl}
        alt={film.name}
        className="absolute inset-0 h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
        draggable={false}
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 sm:p-4">
        <h3 className="line-clamp-2 text-base font-bold text-white sm:text-lg md:text-xl">
          {film.name}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-white/75 sm:text-sm md:text-base">
          {film.school}
        </p>
      </div>
    </button>
  );
}
