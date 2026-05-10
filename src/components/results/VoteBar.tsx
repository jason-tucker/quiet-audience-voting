"use client";

import { useEffect, useRef, useState } from "react";
import type { VoteResult } from "@/types";
import { colorForFilm, colorWithAlpha } from "@/lib/colors";

interface Props {
  result: VoteResult;
  rank: number;
  onClick?: () => void;
}

export function VoteBar({ result, rank, onClick }: Props) {
  const [pulse, setPulse] = useState(false);
  const prevCount = useRef(result.count);
  const color = colorForFilm(result.filmId);

  useEffect(() => {
    if (result.count !== prevCount.current) {
      prevCount.current = result.count;
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 900);
      return () => clearTimeout(t);
    }
  }, [result.count]);

  return (
    <button
      onClick={onClick}
      className={`block w-full text-left rounded-lg p-4 ring-1 transition-all ${
        pulse ? "scale-[1.01]" : ""
      } ${onClick ? "cursor-pointer hover:brightness-125" : ""}`}
      style={{
        backgroundColor: colorWithAlpha(color, 0.16),
        borderColor: pulse ? color : colorWithAlpha(color, 0.4),
        // borderColor doesn't work with ring-1 — use boxShadow for the border instead
        boxShadow: `inset 0 0 0 1px ${pulse ? color : colorWithAlpha(color, 0.45)}`,
      }}
    >
      <div className="flex items-center gap-4">
        <span className="text-2xl font-bold text-white/40 w-8 text-center">{rank}</span>
        <img
          src={result.posterUrl}
          alt={result.filmName}
          className="h-20 w-14 rounded object-contain bg-zinc-900"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-white">{result.filmName}</h3>
          <p className="truncate text-sm text-white/70">{result.school}</p>
        </div>
        <div className="text-right">
          <div
            className="text-2xl font-bold transition-colors"
            style={{ color: pulse ? color : "#fff" }}
          >
            {result.count}
          </div>
          <div className="text-xs text-white/70">{result.percentage.toFixed(1)}%</div>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/30">
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{ width: `${result.percentage}%`, backgroundColor: color }}
        />
      </div>
    </button>
  );
}
