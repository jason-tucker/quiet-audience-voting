"use client";

import { colorForFilm } from "@/lib/colors";

interface Props {
  films: { id: string; name: string }[];
  filmCounts: Record<string, number>;
}

// Compact horizontal bar showing how a single device split its votes among
// films. Each segment is sized proportionally and colored to match the
// film's color in the timeline graphs.
export function DeviceFilmBreakdown({ films, filmCounts }: Props) {
  const total = Object.values(filmCounts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        {films.map((f) => {
          const c = filmCounts[f.id] ?? 0;
          if (c === 0) return null;
          const pct = (c / total) * 100;
          return (
            <div
              key={f.id}
              style={{ width: `${pct}%`, backgroundColor: colorForFilm(f.id) }}
              title={`${f.name}: ${c} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/60">
        {films
          .filter((f) => (filmCounts[f.id] ?? 0) > 0)
          .map((f) => (
            <span key={f.id} className="inline-flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: colorForFilm(f.id) }}
              />
              {f.name} · {filmCounts[f.id]}
            </span>
          ))}
      </div>
    </div>
  );
}
