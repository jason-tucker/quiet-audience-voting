"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

type AuthEvent = {
  id: string;
  timestamp: string;
  outcome: "success" | "fail" | string;
  ipAddress: string | null;
  userAgent: string | null;
  reason: string | null;
};

type Filter = "all" | "success" | "fail";

export function AuthEventsLog() {
  const [events, setEvents] = useState<AuthEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const limit = 50;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (filter !== "all") params.set("outcome", filter);
        const res = await fetch(`/api/admin/auth-events?${params.toString()}`);
        const data = await res.json();
        if (mounted) {
          setEvents(data.events);
          setTotal(data.total);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [page, filter]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-white/60">
          {total} total {total === 1 ? "event" : "events"} • page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          {(["all", "success", "fail"] as Filter[]).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "primary" : "secondary"}
              onClick={() => {
                setFilter(f);
                setPage(1);
              }}
            >
              {f === "all" ? "All" : f === "success" ? "Successes" : "Failures"}
            </Button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-white/10">
        <table className="w-full text-sm text-white/80">
          <thead className="bg-white/5 text-xs uppercase text-white/50">
            <tr>
              <th className="px-3 py-2 text-left">Timestamp</th>
              <th className="px-3 py-2 text-left">Outcome</th>
              <th className="px-3 py-2 text-left">Reason</th>
              <th className="px-3 py-2 text-left">IP</th>
              <th className="px-3 py-2 text-left">User-Agent</th>
            </tr>
          </thead>
          <tbody>
            {loading && events.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-white/40">
                  Loading…
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-white/40">
                  No events recorded yet.
                </td>
              </tr>
            ) : (
              events.map((e) => (
                <tr key={e.id} className="border-t border-white/5">
                  <td className="px-3 py-2 font-mono text-xs">
                    {new Date(e.timestamp).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        e.outcome === "success"
                          ? "rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-300"
                          : "rounded bg-rose-500/15 px-2 py-0.5 text-rose-300"
                      }
                    >
                      {e.outcome}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-white/60">{e.reason ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{e.ipAddress ?? "—"}</td>
                  <td className="max-w-md truncate px-3 py-2 text-xs text-white/50">
                    {e.userAgent ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Prev
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={page >= totalPages || loading}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
