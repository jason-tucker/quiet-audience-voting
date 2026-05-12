"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { VoteEvent, VoteResult } from "@/types";
import { colorForFilm } from "@/lib/colors";

const BUCKET_SECONDS = 30;

interface Bucket {
  label: string;
  ts: number;
  total: number;
  [k: string]: number | string;
}

function bucketize(events: VoteEvent[], films: VoteResult[], startMs: number, endMs: number): Bucket[] {
  const bucketMs = BUCKET_SECONDS * 1000;
  const buckets: Bucket[] = [];
  const running: Record<string, number> = {};
  for (const f of films) running[f.filmId] = 0;

  for (let t = startMs; t <= endMs + bucketMs; t += bucketMs) {
    const bucketEnd = t + bucketMs;
    const inWindow = events.filter((v) => {
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
      const c = inWindow.filter((v) => v.filmId === f.filmId).length;
      bucket[f.filmId] = c;
      running[f.filmId] += c;
      bucket[`${f.filmId}__total`] = running[f.filmId];
    }
    buckets.push(bucket);
  }
  return buckets;
}

type Mode = "per-bucket" | "cumulative";

export function ResultsTimeline({
  films,
  votingOpenedAt,
  events,
}: {
  films: VoteResult[];
  votingOpenedAt: string | null;
  events: VoteEvent[];
}) {
  const [mode, setMode] = useState<Mode>("per-bucket");

  const data = useMemo(() => {
    if (!votingOpenedAt && events.length === 0) return [];
    const startMs = votingOpenedAt
      ? new Date(votingOpenedAt).getTime()
      : new Date(events[0].timestamp).getTime();
    const endMs =
      events.length > 0 ? new Date(events[events.length - 1].timestamp).getTime() : Date.now();
    return bucketize(events, films, startMs, endMs);
  }, [events, films, votingOpenedAt]);

  if (!votingOpenedAt) {
    return null;
  }

  const noVotes = events.length === 0;

  return (
    <div className="rounded-xl bg-zinc-900 p-4 ring-1 ring-zinc-800 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50">
          Vote timeline
        </h3>
        <div className="inline-flex rounded-lg bg-zinc-800 p-0.5 ring-1 ring-zinc-700">
          <button
            onClick={() => setMode("per-bucket")}
            className={`rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors ${
              mode === "per-bucket" ? "bg-blue-600 text-white" : "text-white/60 hover:text-white"
            }`}
          >
            Per bucket
          </button>
          <button
            onClick={() => setMode("cumulative")}
            className={`rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors ${
              mode === "cumulative" ? "bg-blue-600 text-white" : "text-white/60 hover:text-white"
            }`}
          >
            Cumulative
          </button>
        </div>
      </div>
      {noVotes ? (
        <p className="py-8 text-center text-white/40">Waiting for votes…</p>
      ) : (
        <div className="h-48 sm:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="label"
                stroke="#a1a1aa"
                fontSize={10}
                interval="preserveStartEnd"
                minTickGap={32}
              />
              <YAxis stroke="#a1a1aa" fontSize={10} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: 8,
                }}
                labelStyle={{ color: "#a1a1aa" }}
                itemSorter={(item) => -(Number(item.value) || 0)}
                formatter={(
                  value: number,
                  name: string,
                  props: { payload?: Record<string, number> },
                ) => {
                  const filmId = name.replace(/__total$/, "");
                  const film = films.find((f) => f.filmId === filmId);
                  if (mode === "cumulative") {
                    return [`${value} total`, film?.filmName ?? filmId];
                  }
                  const total = props?.payload?.[`${filmId}__total`] ?? 0;
                  return [`${value} (total ${total})`, film?.filmName ?? filmId];
                }}
              />
              {(() => {
                // In cumulative mode, render highest-vote films last so
                // they sit on top of the stack.
                const ordered =
                  mode === "cumulative" && data.length > 0
                    ? [...films].sort((a, b) => {
                        const last = data[data.length - 1] as Record<string, number>;
                        return (
                          (last[`${a.filmId}__total`] ?? 0) -
                          (last[`${b.filmId}__total`] ?? 0)
                        );
                      })
                    : films;
                return ordered.map((f) => {
                  const color = colorForFilm(f.filmId);
                  const dataKey = mode === "cumulative" ? `${f.filmId}__total` : f.filmId;
                  return (
                    <Area
                      key={f.filmId}
                      type="monotone"
                      dataKey={dataKey}
                      stackId="1"
                      stroke={color}
                      fill={color}
                      fillOpacity={0.65}
                      isAnimationActive={false}
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
