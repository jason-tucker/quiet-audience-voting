"use client";

import { useEffect } from "react";
import type { Film } from "@/types";

export function ThankYouOverlay({ film, onDone }: { film: Film; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-blue-600 text-white">
      <svg
        className="mb-6 h-24 w-24 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <h1 className="px-6 text-center text-4xl font-bold sm:text-5xl md:text-6xl">
        Thank you for voting!
      </h1>
      <p className="mt-4 px-6 text-center text-xl opacity-90 sm:text-2xl md:text-3xl">
        Your vote for <span className="font-semibold">{film.name}</span> has been recorded.
      </p>
    </div>
  );
}
