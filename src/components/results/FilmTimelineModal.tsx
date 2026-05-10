"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { VoteResult, VoteEvent } from "@/types";
import { Modal } from "@/components/ui/Modal";

interface Props {
  film: VoteResult;
  onClose: () => void;
  votingOpenedAt: string | null;
}

const BUCKET_SECONDS = 30;

interface Bucket {
  label: string;
  count: number;
}

function bucketize(events: VoteEvent[], startIso: string | null): Bucket[] {
  if (events.length === 0 && !startIso) return [];

  const sorted = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const start = startIso
    ? new Date(startIso).getTime()
    : new Date(sorted[0].timestamp).getTime();
  const end = sorted.length > 0 ? new Date(sorted[sorted.length - 1].timestamp).getTime() : start;
  const bucketMs = BUCKET_SECONDS * 1000;
  const buckets: Bucket[] = [];

  for (let t = start; t <= end + bucketMs; t += bucketMs) {
    const bucketEnd = t + bucketMs;
    const count = sorted.filter((v) => {
      const time = new Date(v.timestamp).getTime();
      return time >= t && time < bucketEnd;
    }).length;
    const date = new Date(t);
    buckets.push({
      label: date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      count,
    });
  }
  return buckets;
}

export function FilmTimelineModal({ film, onClose, votingOpenedAt }: Props) {
  const [events, setEvents] = useState<VoteEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/results/votes?filmId=${film.filmId}`);
        const data = await res.json();
        if (mounted) setEvents(data.events);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 2000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [film.filmId]);

  const data = bucketize(events, votingOpenedAt);

  return (
    <Modal isOpen={true} onClose={onClose} title={film.filmName} maxWidth="max-w-3xl">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <img
            src={film.posterUrl}
            alt={film.filmName}
            className="h-24 w-16 rounded object-contain bg-zinc-800"
          />
          <div>
            <p className="text-sm text-white/60">{film.school}</p>
            <p className="mt-1 text-3xl font-bold text-white">{film.count}</p>
            <p className="text-sm text-white/60">{film.percentage.toFixed(1)}% of total</p>
          </div>
        </div>

        <div className="rounded-lg bg-zinc-950 p-4 ring-1 ring-zinc-800">
          <h3 className="mb-3 text-sm font-semibold text-white/80">
            Vote timeline (30-second buckets)
          </h3>
          {loading ? (
            <p className="py-8 text-center text-white/50">Loading…</p>
          ) : data.length === 0 ? (
            <p className="py-8 text-center text-white/50">No votes yet.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="filmFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="label" stroke="#a1a1aa" fontSize={11} />
                  <YAxis stroke="#a1a1aa" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: 8,
                    }}
                    labelStyle={{ color: "#a1a1aa" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    fill="url(#filmFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
