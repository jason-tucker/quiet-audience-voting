"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { AuditVote, AppStatus, Film } from "@/types";

const BUCKET_SECONDS = 30;

// Distinct, readable colors for stacking up to ~15 films.
const PALETTE = [
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#eab308",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
  "#f59e0b",
  "#8b5cf6",
  "#10b981",
  "#d946ef",
  "#0ea5e9",
];

interface Bucket {
  label: string;
  ts: number;
  total: number;
  [filmKey: string]: number | string;
}

function bucketize(
  votes: AuditVote[],
  films: Film[],
  startMs: number,
  endMs: number,
): Bucket[] {
  const bucketMs = BUCKET_SECONDS * 1000;
  const buckets: Bucket[] = [];
  for (let t = startMs; t <= endMs + bucketMs; t += bucketMs) {
    const bucketEnd = t + bucketMs;
    const inWindow = votes.filter((v) => {
      const time = new Date(v.timestamp).getTime();
      return time >= t && time < bucketEnd;
    });
    const date = new Date(t);
    const bucket: Bucket = {
      label: date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      ts: t,
      total: inWindow.length,
    };
    for (const f of films) {
      bucket[f.id] = inWindow.filter((v) => v.filmId === f.id).length;
    }
    buckets.push(bucket);
  }
  return buckets;
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function VoteTimeline() {
  const [votes, setVotes] = useState<AuditVote[]>([]);
  const [films, setFilms] = useState<Film[]>([]);
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState<string>(""); // local datetime-local string
  const [to, setTo] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [v, f, s] = await Promise.all([
          fetch("/api/admin/votes?limit=500").then((r) => r.json()),
          fetch("/api/films").then((r) => r.json()),
          fetch("/api/status").then((r) => r.json()),
        ]);
        if (mounted) {
          setVotes(v.votes);
          setFilms(f.films);
          setStatus(s);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const { data, startMs, endMs } = useMemo(() => {
    // Default start: when voting was opened. If voting hasn't opened yet,
    // there's nothing to show.
    const openedAt = status?.votingOpenedAt ? new Date(status.votingOpenedAt).getTime() : null;
    if (openedAt === null) {
      return { data: [] as Bucket[], startMs: 0, endMs: 0 };
    }

    const fromMs = from ? new Date(from).getTime() : openedAt;
    const toMs = to ? new Date(to).getTime() : Date.now();
    const filtered = votes.filter((v) => {
      const t = new Date(v.timestamp).getTime();
      return t >= fromMs && t <= toMs;
    });
    return {
      data: bucketize(filtered, films, fromMs, toMs),
      startMs: fromMs,
      endMs: toMs,
    };
  }, [votes, films, from, to, status?.votingOpenedAt]);

  if (loading) {
    return (
      <div className="rounded-xl bg-zinc-900 p-6 ring-1 ring-zinc-800">
        <h3 className="text-lg font-semibold text-white">Vote Timeline</h3>
        <p className="mt-4 text-center text-white/40">Loading…</p>
      </div>
    );
  }

  if (!status?.votingOpenedAt) {
    return (
      <div className="rounded-xl bg-zinc-900 p-6 ring-1 ring-zinc-800">
        <h3 className="text-lg font-semibold text-white">Vote Timeline</h3>
        <p className="mt-4 text-center text-white/50">
          The timeline starts when you open voting on the dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-zinc-900 p-6 ring-1 ring-zinc-800">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Vote Timeline (30-second buckets)
          </h3>
          <p className="text-xs text-white/50">
            Stacked by film. Started at {new Date(status.votingOpenedAt).toLocaleString()}.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs text-white/50">From</label>
            <input
              type="datetime-local"
              value={from || toLocalInput(new Date(startMs))}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg bg-zinc-800 px-2 py-1 text-sm text-white outline-none ring-1 ring-zinc-700 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50">To</label>
            <input
              type="datetime-local"
              value={to || toLocalInput(new Date(endMs))}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg bg-zinc-800 px-2 py-1 text-sm text-white outline-none ring-1 ring-zinc-700 focus:ring-blue-500"
            />
          </div>
          {(from || to) && (
            <button
              onClick={() => {
                setFrom("");
                setTo("");
              }}
              className="rounded-lg px-2 py-1 text-xs text-white/60 hover:bg-zinc-800 hover:text-white"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {data.every((b) => b.total === 0) ? (
        <p className="py-12 text-center text-white/40">No votes in this window yet.</p>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="label" stroke="#a1a1aa" fontSize={11} interval="preserveStartEnd" />
              <YAxis stroke="#a1a1aa" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: 8,
                }}
                labelStyle={{ color: "#a1a1aa" }}
                itemStyle={{ color: "#fff" }}
                formatter={(value: number, name: string) => {
                  const film = films.find((f) => f.id === name);
                  return [value, film?.name ?? name];
                }}
              />
              <Legend
                formatter={(value) => {
                  const film = films.find((f) => f.id === value);
                  return film?.name ?? value;
                }}
                wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }}
              />
              {films.map((f, i) => (
                <Area
                  key={f.id}
                  type="monotone"
                  dataKey={f.id}
                  stackId="1"
                  stroke={PALETTE[i % PALETTE.length]}
                  fill={PALETTE[i % PALETTE.length]}
                  fillOpacity={0.7}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
