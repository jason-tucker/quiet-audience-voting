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
import { colorForFilm } from "@/lib/colors";

const BUCKET_SECONDS = 30;

interface Bucket {
  label: string;
  ts: number;
  total: number;
  cumulative: number;
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
  // Running total per film, accumulated across buckets so the tooltip can
  // surface "this bucket (cumulative)" without an extra pass at render time.
  const running: Record<string, number> = {};
  for (const f of films) running[f.id] = 0;
  let runningTotal = 0;

  for (let t = startMs; t <= endMs + bucketMs; t += bucketMs) {
    const bucketEnd = t + bucketMs;
    const inWindow = votes.filter((v) => {
      const time = new Date(v.timestamp).getTime();
      return time >= t && time < bucketEnd;
    });
    runningTotal += inWindow.length;
    const date = new Date(t);
    const bucket: Bucket = {
      label: date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      ts: t,
      total: inWindow.length,
      cumulative: runningTotal,
    };
    for (const f of films) {
      const c = inWindow.filter((v) => v.filmId === f.id).length;
      bucket[f.id] = c;
      running[f.id] += c;
      bucket[`${f.id}__total`] = running[f.id];
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

type Mode = "per-bucket" | "cumulative";

export function VoteTimeline() {
  const [votes, setVotes] = useState<AuditVote[]>([]);
  const [films, setFilms] = useState<Film[]>([]);
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState<string>(""); // local datetime-local string
  const [to, setTo] = useState<string>("");
  const [mode, setMode] = useState<Mode>("per-bucket");

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
            <label className="block text-xs text-white/50">View</label>
            <div className="inline-flex rounded-lg bg-zinc-800 p-0.5 ring-1 ring-zinc-700">
              <button
                onClick={() => setMode("per-bucket")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  mode === "per-bucket"
                    ? "bg-blue-600 text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Per bucket
              </button>
              <button
                onClick={() => setMode("cumulative")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  mode === "cumulative"
                    ? "bg-blue-600 text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Cumulative
              </button>
            </div>
          </div>
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

      {data.length === 0 || data[data.length - 1]?.cumulative === 0 ? (
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
                formatter={(
                  value: number,
                  name: string,
                  props: { payload?: Record<string, number> },
                ) => {
                  // Strip __total suffix when looking up the film
                  const filmId = name.replace(/__total$/, "");
                  const film = films.find((f) => f.id === filmId);
                  if (mode === "cumulative") {
                    return [`${value} total`, film?.name ?? filmId];
                  }
                  const total = props?.payload?.[`${filmId}__total`] ?? 0;
                  return [`${value} (total ${total})`, film?.name ?? filmId];
                }}
              />
              {films.length <= 12 && (
                <Legend
                  formatter={(value) => {
                    const filmId = String(value).replace(/__total$/, "");
                    const film = films.find((f) => f.id === filmId);
                    return film?.name ?? filmId;
                  }}
                  wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }}
                />
              )}
              {(() => {
                // In cumulative mode, sort films by final running total
                // ascending so the highest-vote film is rendered LAST,
                // landing on top of the stack visually.
                const ordered =
                  mode === "cumulative" && data.length > 0
                    ? [...films].sort((a, b) => {
                        const last = data[data.length - 1] as Record<string, number>;
                        return (last[`${a.id}__total`] ?? 0) - (last[`${b.id}__total`] ?? 0);
                      })
                    : films;
                return ordered.map((f) => {
                  const color = colorForFilm(f.id);
                  const dataKey = mode === "cumulative" ? `${f.id}__total` : f.id;
                  return (
                    <Area
                      key={f.id}
                      type="monotone"
                      dataKey={dataKey}
                      stackId="1"
                      stroke={color}
                      fill={color}
                      fillOpacity={0.7}
                    />
                  );
                });
              })()}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
