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
import type { AuditVote } from "@/types";

interface Bucket {
  label: string;
  count: number;
}

const BUCKET_SECONDS = 30;

function bucketize(votes: AuditVote[]): Bucket[] {
  if (votes.length === 0) return [];
  const sorted = [...votes].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const first = new Date(sorted[0].timestamp).getTime();
  const last = new Date(sorted[sorted.length - 1].timestamp).getTime();
  const bucketMs = BUCKET_SECONDS * 1000;
  const buckets: Bucket[] = [];
  for (let t = first; t <= last + bucketMs; t += bucketMs) {
    const end = t + bucketMs;
    const count = sorted.filter((v) => {
      const time = new Date(v.timestamp).getTime();
      return time >= t && time < end;
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

export function VoteTimeline() {
  const [data, setData] = useState<Bucket[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/admin/votes?limit=500");
        if (!res.ok) return;
        const json = (await res.json()) as { votes: AuditVote[] };
        if (mounted) setData(bucketize(json.votes));
      } catch {
        // ignore
      }
    };
    load();
    const id = setInterval(load, 15000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  if (data.length === 0) {
    return (
      <div className="rounded-xl bg-zinc-900 p-6 ring-1 ring-zinc-800">
        <h3 className="text-lg font-semibold text-white">Vote Timeline</h3>
        <p className="mt-4 text-center text-white/40">No votes yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-zinc-900 p-6 ring-1 ring-zinc-800">
      <h3 className="mb-4 text-lg font-semibold text-white">Vote Timeline (30-second buckets)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="voteFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="label" stroke="#a1a1aa" fontSize={12} />
            <YAxis stroke="#a1a1aa" fontSize={12} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
              labelStyle={{ color: "#a1a1aa" }}
            />
            <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#voteFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
