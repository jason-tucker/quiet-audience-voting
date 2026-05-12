import type { VoteResult } from "@/types";
import { colorForFilm, colorWithAlpha, contrastingTextColor } from "@/lib/colors";

export function WinnerDisplay({ result }: { result: VoteResult }) {
  const color = colorForFilm(result.filmId);
  // The "Leading" badge sits inside a chip filled with the film's full
  // color, so the chip color and text color need to contrast.
  const badgeText = contrastingTextColor(color);
  return (
    <div
      className="rounded-2xl p-1 shadow-2xl"
      style={{ background: `linear-gradient(135deg, ${color}, #f59e0b)` }}
    >
      <div
        className="flex items-center gap-6 rounded-xl p-6"
        style={{ backgroundColor: colorWithAlpha(color, 0.18) }}
      >
        <img
          src={result.posterUrl}
          alt={result.filmName}
          className="h-40 w-28 rounded-lg object-contain bg-zinc-900 shadow-lg sm:h-48 sm:w-32"
        />
        <div className="min-w-0 flex-1">
          <span
            className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider"
            style={{ backgroundColor: color, color: badgeText }}
          >
            Leading
          </span>
          <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{result.filmName}</h2>
          <p className="mt-1 text-base text-white/80 sm:text-lg">{result.school}</p>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-white sm:text-5xl">{result.count}</span>
            <span className="text-lg text-white/80">votes • {result.percentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
