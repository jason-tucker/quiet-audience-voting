import type { VoteResult } from "@/types";

export function VoteBar({ result, rank }: { result: VoteResult; rank: number }) {
  return (
    <div className="rounded-lg bg-zinc-900 p-4 ring-1 ring-zinc-800">
      <div className="flex items-center gap-4">
        <span className="text-2xl font-bold text-white/40 w-8 text-center">{rank}</span>
        <img
          src={result.posterUrl}
          alt={result.filmName}
          className="h-20 w-14 rounded object-cover"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-white">{result.filmName}</h3>
          <p className="truncate text-sm text-white/60">{result.school}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{result.count}</div>
          <div className="text-xs text-white/60">{result.percentage.toFixed(1)}%</div>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full bg-blue-500 transition-all duration-500 ease-out"
          style={{ width: `${result.percentage}%` }}
        />
      </div>
    </div>
  );
}
