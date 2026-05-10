"use client";

import { useEffect, useMemo, useState } from "react";
import type { Film } from "@/types";
import { FilmCard } from "./FilmCard";

const POSTER_ASPECT = 2 / 3; // width / height of a typical movie poster
// Below this width, fall back to a scrollable grid instead of cramming
// posters tinier and tinier. 70px is comfortable on iPad and small enough
// that 50+ films still fit on a typical screen without scrolling.
const MIN_POSTER_WIDTH_PX = 70;
const SCROLL_FALLBACK_TARGET_WIDTH_PX = 180;

interface Layout {
  cols: number;
  rows: number;
  scroll: boolean; // whether to allow vertical scrolling because posters would be too small
}

/**
 * Pick (cols, rows) so that:
 *   1. all N posters fit in a (cols × rows) grid (cols * rows >= N)
 *   2. each cell's aspect ratio is as close to a poster's as possible
 *      (so the contained poster fills the cell with no letterbox)
 *   3. empty cells in the last row are minimised
 *   4. the resulting poster width isn't smaller than MIN_POSTER_WIDTH_PX
 *      — if every layout would be smaller, allow vertical scrolling.
 */
function computeOptimalLayout(N: number, W: number, H: number): Layout {
  if (N <= 0) return { cols: 1, rows: 1, scroll: false };

  let best: { cols: number; rows: number; posterWidth: number; score: number } | null = null;

  for (let cols = 1; cols <= N; cols++) {
    const rows = Math.ceil(N / cols);
    const cellWidth = W / cols;
    const cellHeight = H / rows;
    const cellAspect = cellWidth / cellHeight;

    // Effective poster size inside the cell (object-contain, 2:3)
    let posterWidth: number;
    let posterHeight: number;
    if (cellAspect < POSTER_ASPECT) {
      posterWidth = cellWidth;
      posterHeight = cellWidth / POSTER_ASPECT;
    } else {
      posterHeight = cellHeight;
      posterWidth = cellHeight * POSTER_ASPECT;
    }

    const posterArea = posterWidth * posterHeight;
    const emptyCells = cols * rows - N;
    // Empty cells are visible dark space — penalise meaningfully but don't
    // forbid (sometimes a layout with one empty cell still gives much
    // bigger posters than the perfect-rectangle alternative).
    const emptyPenalty = emptyCells * cellWidth * cellHeight * 0.6;
    const score = posterArea - emptyPenalty;

    if (!best || score > best.score) {
      best = { cols, rows, posterWidth, score };
    }
  }

  if (!best) return { cols: 1, rows: 1, scroll: false };

  if (best.posterWidth < MIN_POSTER_WIDTH_PX) {
    // Posters are too small at the chosen layout — switch to a fixed
    // poster width and stack vertically with scrolling enabled.
    const cols = Math.max(1, Math.floor(W / SCROLL_FALLBACK_TARGET_WIDTH_PX));
    const rows = Math.ceil(N / cols);
    return { cols, rows, scroll: true };
  }

  return { cols: best.cols, rows: best.rows, scroll: false };
}

export function VotingGrid({
  films,
  onSelect,
  highlightedId,
}: {
  films: Film[];
  onSelect: (film: Film) => void;
  highlightedId?: string | null;
}) {
  const [viewport, setViewport] = useState({ width: 1024, height: 768 });

  useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  const { cols, rows, scroll } = useMemo(
    () => computeOptimalLayout(films.length, viewport.width, viewport.height),
    [films.length, viewport.width, viewport.height],
  );

  // Render as rows of flex-1 cards — full rows have `cols` items at equal
  // width, the last row stretches its (possibly fewer) items to fill the
  // row width so there are no visible empty cells.
  const rowsArr: Film[][] = [];
  for (let r = 0; r < rows; r++) {
    rowsArr.push(films.slice(r * cols, r * cols + cols));
  }

  return (
    <div
      className={`no-select flex w-screen flex-col gap-2 p-2 ${
        scroll ? "min-h-screen overflow-y-auto" : "h-screen"
      }`}
    >
      {rowsArr.map((rowFilms, r) => (
        <div
          key={r}
          className={`flex w-full gap-2 ${scroll ? "" : "min-h-0 flex-1"}`}
          style={scroll ? { aspectRatio: `${cols * POSTER_ASPECT} / 1` } : undefined}
        >
          {rowFilms.map((film) => (
            <div key={film.id} className="min-w-0 min-h-0 flex-1">
              <FilmCard
                film={film}
                onClick={() => onSelect(film)}
                highlighted={highlightedId === film.id}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
