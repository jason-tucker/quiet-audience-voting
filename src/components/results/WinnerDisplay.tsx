import type { VoteResult } from "@/types";

export function WinnerDisplay({ result }: { result: VoteResult }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-yellow-500 via-amber-600 to-orange-600 p-1 shadow-2xl">
      <div className="flex items-center gap-6 rounded-xl bg-zinc-900 p-6">
        <img
          src={result.posterUrl}
          alt={result.filmName}
          className="h-40 w-28 rounded-lg object-cover shadow-lg sm:h-48 sm:w-32"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-wider text-yellow-400">
            Leading
          </p>
          <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{result.filmName}</h2>
          <p className="mt-1 text-base text-white/70 sm:text-lg">{result.school}</p>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-white sm:text-5xl">{result.count}</span>
            <span className="text-lg text-white/70">votes • {result.percentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
