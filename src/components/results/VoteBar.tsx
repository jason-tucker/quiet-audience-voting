"use client";

import { useEffect, useRef, useState } from "react";
import type { VoteResult } from "@/types";

interface Props {
  result: VoteResult;
  rank: number;
  onClick?: () => void;
}

export function VoteBar({ result, rank, onClick }: Props) {
  const [pulse, setPulse] = useState(false);
  const prevCount = useRef(result.count);

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
      className={`block w-full text-left rounded-lg bg-zinc-900 p-4 ring-1 transition-all ${
        pulse ? "ring-2 ring-blue-400 scale-[1.01]" : "ring-zinc-800"
      } ${onClick ? "hover:bg-zinc-900/70 cursor-pointer" : ""}`}
    >
      <div className="flex items-center gap-4">
        <span className="text-2xl font-bold text-white/40 w-8 text-center">{rank}</span>
        <img
          src={result.posterUrl}
          alt={result.filmName}
          className="h-20 w-14 rounded object-contain bg-zinc-800"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-white">{result.filmName}</h3>
          <p className="truncate text-sm text-white/60">{result.school}</p>
        </div>
        <div className="text-right">
          <div
            className={`text-2xl font-bold transition-colors ${
              pulse ? "text-blue-300" : "text-white"
            }`}
          >
            {result.count}
          </div>
          <div className="text-xs text-white/60">{result.percentage.toFixed(1)}%</div>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full transition-all duration-500 ease-out ${
            pulse ? "bg-blue-400" : "bg-blue-500"
          }`}
          style={{ width: `${result.percentage}%` }}
        />
      </div>
    </button>
  );
}
