"use client";

import { useEffect, useState, useMemo } from "react";
import type { Film } from "@/types";
import { FilmCard } from "./FilmCard";

function computeColumns(filmCount: number, viewportWidth: number, viewportHeight: number): number {
  if (filmCount <= 0) return 1;
  const isLandscape = viewportWidth >= viewportHeight;
  // Posters are roughly 2:3 portrait. We want each cell roughly that aspect ratio
  // while still filling the entire viewport.
  for (let cols = 1; cols <= filmCount; cols++) {
    const rows = Math.ceil(filmCount / cols);
    const cellWidth = viewportWidth / cols;
    const cellHeight = viewportHeight / rows;
    const aspect = cellWidth / cellHeight;
    // Target aspect 0.65–0.9 (a bit narrower than square)
    if (aspect >= 0.55 && aspect <= 0.95) {
      return cols;
    }
  }
  // Fallbacks based on common counts
  if (filmCount <= 3) return filmCount;
  if (filmCount <= 6) return isLandscape ? 3 : 2;
  if (filmCount <= 9) return 3;
  if (filmCount <= 12) return 4;
  return 5;
}

export function VotingGrid({ films, onSelect }: { films: Film[]; onSelect: (film: Film) => void }) {
  const [viewport, setViewport] = useState({ width: 1024, height: 768 });

  useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const cols = useMemo(
    () => computeColumns(films.length, viewport.width, viewport.height),
    [films.length, viewport.width, viewport.height],
  );

  const rows = Math.ceil(films.length / cols);

  return (
    <div
      className="no-select grid h-screen w-screen gap-2 p-2"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
    >
      {films.map((film) => (
        <FilmCard key={film.id} film={film} onClick={() => onSelect(film)} />
      ))}
    </div>
  );
}
