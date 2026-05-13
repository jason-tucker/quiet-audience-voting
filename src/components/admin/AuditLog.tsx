"use client";

import { Fragment, useEffect, useState } from "react";
import type { AuditVote } from "@/types";
import { Button } from "@/components/ui/Button";

export function AuditLog() {
  const [votes, setVotes] = useState<AuditVote[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const limit = 50;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/votes?page=${page}&limit=${limit}`);
        const data = await res.json();
        if (mounted) {
          setVotes(data.votes);
          setTotal(data.total);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-white/60">
          {total} total {total === 1 ? "vote" : "votes"} • page {page} of {totalPages}
        </p>
        <div className="flex flex-wrap gap-2">
          <a href="/api/admin/votes/export?format=csv" download>
            <Button size="sm" variant="secondary">
              Export CSV
            </Button>
          </a>
          <a href="/api/admin/votes/export?format=json" download>
            <Button size="sm" variant="secondary">
              Export JSON
            </Button>
          </a>
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

      <div className="overflow-hidden rounded-xl ring-1 ring-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-left text-white/60">
            <tr>
              <th className="p-3">Time</th>
              <th className="p-3">Film</th>
              <th className="p-3">Device</th>
              <th className="p-3">IP</th>
              <th className="p-3">Platform</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950 text-white">
            {votes.map((v) => (
              <Fragment key={v.id}>
                <tr
                  className="cursor-pointer hover:bg-zinc-900"
                  onClick={() => setExpanded(expanded === v.id ? null : v.id)}
                >
                  <td className="p-3 whitespace-nowrap text-white/70">
                    {new Date(v.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3 font-medium">{v.filmName}</td>
                  <td className="p-3 font-mono text-xs text-white/70">
                    {v.deviceFingerprint.slice(0, 12)}…
                  </td>
                  <td className="p-3 font-mono text-xs text-white/70">{v.ipAddress}</td>
                  <td className="p-3 text-white/70">{v.platform ?? "—"}</td>
                </tr>
                {expanded === v.id && (
                  <tr className="bg-zinc-900">
                    <td colSpan={5} className="p-4 text-xs">
                      <pre className="max-h-64 overflow-auto rounded bg-black/40 p-3 text-white/70">
                        {JSON.stringify(JSON.parse(v.rawDeviceJson), null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
