"use client";

import { useEffect, useState } from "react";
import type { SuspiciousCluster } from "@/types";

export function SuspiciousVotes() {
  const [clusters, setClusters] = useState<SuspiciousCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [windowMinutes, setWindowMinutes] = useState(10);
  const [threshold, setThreshold] = useState(5);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch(
          `/api/admin/suspicious?windowMinutes=${windowMinutes}&threshold=${threshold}`,
        );
        const data = await res.json();
        if (mounted) setClusters(data.clusters);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
  }, [windowMinutes, threshold]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4 rounded-xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
        <div>
          <label className="mb-1 block text-xs text-white/60">Window (min)</label>
          <input
            type="number"
            min={1}
            value={windowMinutes}
            onChange={(e) => setWindowMinutes(Number(e.target.value))}
            className="w-24 rounded-lg bg-zinc-800 px-3 py-1.5 text-white outline-none ring-1 ring-zinc-700"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/60">Threshold</label>
          <input
            type="number"
            min={2}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-24 rounded-lg bg-zinc-800 px-3 py-1.5 text-white outline-none ring-1 ring-zinc-700"
          />
        </div>
        <p className="text-xs text-white/50">
          Flags devices that cast {threshold}+ votes within {windowMinutes} minutes.
        </p>
      </div>

      {loading ? (
        <p className="text-white/60">Scanning…</p>
      ) : clusters.length === 0 ? (
        <div className="rounded-xl bg-zinc-900 p-6 ring-1 ring-zinc-800">
          <p className="text-white/60">✓ No suspicious clusters detected.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clusters.map((c) => (
            <div
              key={c.deviceFingerprint}
              className="rounded-xl bg-amber-950/40 p-4 ring-1 ring-amber-700/50"
            >
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="font-mono text-xs text-amber-300">
                    {c.deviceFingerprint.slice(0, 16)}…
                  </p>
                  <p className="mt-1 text-lg font-bold text-amber-100">
                    {c.voteCount} votes in window
                  </p>
                </div>
                <div className="text-right text-xs text-amber-200/80">
                  <p>{new Date(c.firstVote).toLocaleString()}</p>
                  <p>→ {new Date(c.lastVote).toLocaleString()}</p>
                </div>
              </div>
              <p className="mt-2 text-sm text-amber-100/80">Films: {c.films.join(", ")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
