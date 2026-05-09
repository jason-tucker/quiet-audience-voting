"use client";

import { useEffect, useState } from "react";
import type { VoteSnapshotSummary } from "@/types";
import { Button } from "@/components/ui/Button";

export function Sessions() {
  const [snapshots, setSnapshots] = useState<VoteSnapshotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [stats, setStats] = useState<{ totalVotes: number } | null>(null);

  const load = async () => {
    try {
      const [s, stats] = await Promise.all([
        fetch("/api/admin/sessions").then((r) => r.json()),
        fetch("/api/admin/stats").then((r) => r.json()),
      ]);
      setSnapshots(s.snapshots);
      setStats(stats);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onReset = async () => {
    const totalVotes = stats?.totalVotes ?? 0;
    if (totalVotes === 0) {
      alert("There are no current votes to snapshot.");
      return;
    }
    const label = prompt(
      `End the current session and snapshot ${totalVotes} ${totalVotes === 1 ? "vote" : "votes"}.\n\nLabel for this snapshot:`,
      `Session ${new Date().toLocaleString()}`,
    );
    if (label === null) return;
    if (
      !confirm(
        `This will save a snapshot and DELETE all ${totalVotes} current votes. The last 5 snapshots are kept; older ones are pruned.\n\nContinue?`,
      )
    )
      return;

    setResetting(true);
    try {
      const res = await fetch("/api/admin/sessions/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to reset");
        return;
      }
      await load();
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-zinc-900 p-6 ring-1 ring-zinc-800">
        <h2 className="text-lg font-semibold text-white">Current session</h2>
        <p className="mt-1 text-sm text-white/60">
          {stats ? `${stats.totalVotes} ${stats.totalVotes === 1 ? "vote" : "votes"} cast so far.` : "Loading…"}
        </p>
        <p className="mt-3 text-sm text-white/50">
          Ending the session takes a snapshot (preserved in the table below) and clears the live
          vote table so the next audience starts at zero. Only the last 5 snapshots are kept.
        </p>
        <div className="mt-4">
          <Button variant="danger" onClick={onReset} disabled={resetting}>
            {resetting ? "Saving snapshot…" : "End session and reset votes"}
          </Button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Past sessions</h2>
        {loading ? (
          <p className="text-white/60">Loading…</p>
        ) : snapshots.length === 0 ? (
          <div className="rounded-xl bg-zinc-900 p-12 text-center ring-1 ring-zinc-800">
            <p className="text-white/60">No sessions have been ended yet.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {snapshots.map((s) => {
              const winner = s.filmResults[0];
              const isOpen = expanded === s.id;
              return (
                <li key={s.id} className="rounded-xl bg-zinc-900 ring-1 ring-zinc-800">
                  <button
                    onClick={() => setExpanded(isOpen ? null : s.id)}
                    className="flex w-full items-center justify-between p-4 text-left"
                  >
                    <div>
                      <p className="font-semibold text-white">{s.label}</p>
                      <p className="mt-1 text-xs text-white/50">
                        {new Date(s.createdAt).toLocaleString()} · {s.totalVotes}{" "}
                        {s.totalVotes === 1 ? "vote" : "votes"} · {s.uniqueDevices} unique
                        {s.uniqueDevices === 1 ? " device" : " devices"}
                      </p>
                      {winner && winner.count > 0 && (
                        <p className="mt-2 text-sm text-white/70">
                          Winner: <span className="font-medium text-white">{winner.filmName}</span>{" "}
                          ({winner.count} • {winner.percentage.toFixed(1)}%)
                        </p>
                      )}
                    </div>
                    <span className="text-white/40">{isOpen ? "▲" : "▼"}</span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-zinc-800 p-4">
                      <ol className="space-y-2">
                        {s.filmResults.map((r, idx) => (
                          <li
                            key={r.filmId}
                            className="flex items-center justify-between rounded-lg bg-zinc-950 p-3"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-white/40 w-6 text-center">
                                {idx + 1}
                              </span>
                              <div>
                                <p className="text-sm font-medium text-white">{r.filmName}</p>
                                <p className="text-xs text-white/50">{r.school}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-white">{r.count}</p>
                              <p className="text-xs text-white/50">{r.percentage.toFixed(1)}%</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
