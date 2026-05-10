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

export function ResultsTimeline({
  films,
  votingOpenedAt,
}: {
  films: VoteResult[];
  votingOpenedAt: string | null;
}) {
  const [events, setEvents] = useState<VoteEvent[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/results/votes");
        const data = await res.json();
        if (mounted) setEvents(data.events);
      } catch {
        // ignore
      }
    };
    load();
    const id = setInterval(load, 2000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

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

  const noVotes = data.every((b) => b.total === 0);

  return (
    <div className="rounded-xl bg-zinc-900 p-4 ring-1 ring-zinc-800 sm:p-6">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">
        Vote timeline
      </h3>
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
                itemStyle={{ color: "#fff" }}
                formatter={(
                  value: number,
                  name: string,
                  props: { payload?: Record<string, number> },
                ) => {
                  const film = films.find((f) => f.filmId === name);
                  const total = props?.payload?.[`${name}__total`] ?? 0;
                  return [`${value} (total ${total})`, film?.filmName ?? name];
                }}
              />
              {films.map((f) => {
                const color = colorForFilm(f.filmId);
                return (
                  <Area
                    key={f.filmId}
                    type="monotone"
                    dataKey={f.filmId}
                    stackId="1"
                    stroke={color}
                    fill={color}
                    fillOpacity={0.65}
                    isAnimationActive={false}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
