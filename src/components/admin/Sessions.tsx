"use client";

import { useEffect, useState } from "react";
import type { VoteSnapshotSummary } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function Sessions() {
  const [snapshots, setSnapshots] = useState<VoteSnapshotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetLabel, setResetLabel] = useState("");
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

  const openReset = () => {
    setResetLabel(`Session ${new Date().toLocaleString()}`);
    setResetOpen(true);
  };

  const submitReset = async () => {
    setResetting(true);
    try {
      const res = await fetch("/api/admin/sessions/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: resetLabel.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to reset");
        return;
      }
      setResetOpen(false);
      await load();
    } finally {
      setResetting(false);
    }
  };

  const totalVotes = stats?.totalVotes ?? 0;

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-zinc-900 p-6 ring-1 ring-zinc-800">
        <h2 className="text-lg font-semibold text-white">Current session</h2>
        <p className="mt-1 text-sm text-white/60">
          {stats ? `${totalVotes} ${totalVotes === 1 ? "vote" : "votes"} cast so far.` : "Loading…"}
        </p>
        <p className="mt-3 text-sm text-white/50">
          Ending the session takes a snapshot (preserved in the table below) and clears the live
          vote table so the next audience starts at zero. Only the last 5 snapshots are kept.
        </p>
        <div className="mt-4">
          <Button variant="danger" onClick={openReset} disabled={resetting || totalVotes === 0}>
            End session and reset votes
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

      <Modal isOpen={resetOpen} onClose={() => setResetOpen(false)} title="End session and reset votes">
        <div className="space-y-4">
          <p className="text-sm text-white/70">
            This will save a snapshot of the current{" "}
            <span className="font-semibold text-white">{totalVotes}</span>{" "}
            {totalVotes === 1 ? "vote" : "votes"} and DELETE them from the live table. The last 5
            snapshots are kept; older ones are pruned automatically.
          </p>
          <div>
            <label className="mb-1 block text-sm text-white/80">Snapshot label</label>
            <input
              value={resetLabel}
              onChange={(e) => setResetLabel(e.target.value)}
              autoFocus
              className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-white outline-none ring-1 ring-zinc-700 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setResetOpen(false)} disabled={resetting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={submitReset} disabled={resetting || !resetLabel.trim()}>
              {resetting ? "Saving snapshot…" : "End session"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
