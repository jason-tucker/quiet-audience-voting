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
import type { AppStatus } from "@/types";

interface DetailedVote {
  id: string;
  filmId: string;
  timestamp: string;
  deviceFingerprint: string;
}

const BUCKET_SECONDS = 30;

// HSL color per device fingerprint (different palette than per-film so the
// two timelines on the dashboard don't collide visually).
function colorForDevice(fp: string): string {
  let h = 5381;
  for (let i = 0; i < fp.length; i++) h = ((h << 5) + h + fp.charCodeAt(i)) >>> 0;
  const hue = (h * 78.5) % 360; // different angle than films
  return `hsl(${hue.toFixed(2)}, 60%, 60%)`;
}

function shortFp(fp: string): string {
  return fp.startsWith("sim-") ? fp : fp.slice(0, 10);
}

interface Bucket {
  label: string;
  ts: number;
  total: number;
  [k: string]: number | string;
}

function bucketize(votes: DetailedVote[], devices: string[], startMs: number, endMs: number): Bucket[] {
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
    for (const d of devices) {
      bucket[d] = inWindow.filter((v) => v.deviceFingerprint === d).length;
    }
    buckets.push(bucket);
  }
  return buckets;
}

export function PerDeviceTimeline() {
  const [votes, setVotes] = useState<DetailedVote[]>([]);
  const [status, setStatus] = useState<AppStatus | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [v, s] = await Promise.all([
          fetch("/api/admin/votes-detailed").then((r) => r.json()),
          fetch("/api/status").then((r) => r.json()),
        ]);
        if (mounted) {
          setVotes(v.votes);
          setStatus(s);
        }
      } catch {
        // ignore
      }
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const { data, devices } = useMemo(() => {
    const openedAt = status?.votingOpenedAt ? new Date(status.votingOpenedAt).getTime() : null;
    if (openedAt === null) return { data: [] as Bucket[], devices: [] as string[] };
    const startMs = openedAt;
    const endMs = Date.now();
    const seen = Array.from(new Set(votes.map((v) => v.deviceFingerprint)));
    return { data: bucketize(votes, seen, startMs, endMs), devices: seen };
  }, [votes, status?.votingOpenedAt]);

  if (!status?.votingOpenedAt) {
    return (
      <div className="rounded-xl bg-zinc-900 p-6 ring-1 ring-zinc-800">
        <h3 className="text-lg font-semibold text-white">Per-device timeline</h3>
        <p className="mt-4 text-center text-white/50">
          Starts when you open voting on the dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-zinc-900 p-6 ring-1 ring-zinc-800">
      <h3 className="text-lg font-semibold text-white">Per-device timeline (30-second buckets)</h3>
      <p className="text-xs text-white/50">
        Stacked by device — each color is a different iPad / browser.
      </p>
      {devices.length === 0 || data.every((b) => b.total === 0) ? (
        <p className="py-12 text-center text-white/40">No votes yet.</p>
      ) : (
        <div className="mt-3 h-64">
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
                formatter={(value: number, name: string) => [value, shortFp(name)]}
              />
              {devices.length <= 8 && (
                <Legend
                  formatter={(v) => shortFp(v)}
                  wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }}
                />
              )}
              {devices.map((d) => {
                const color = colorForDevice(d);
                return (
                  <Area
                    key={d}
                    type="monotone"
                    dataKey={d}
                    stackId="1"
                    stroke={color}
                    fill={color}
                    fillOpacity={0.65}
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

export { colorForDevice, shortFp };
