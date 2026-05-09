"use client";

import { Fragment, useEffect, useState } from "react";
import type { DeviceSummary } from "@/types";

function shortFingerprint(fp: string): string {
  return fp.slice(0, 12);
}

export function DeviceList() {
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/admin/devices");
        const data = await res.json();
        if (mounted) setDevices(data.devices);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 15000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  if (loading) return <p className="text-white/60">Loading devices…</p>;
  if (devices.length === 0) {
    return (
      <div className="rounded-xl bg-zinc-900 p-12 text-center ring-1 ring-zinc-800">
        <p className="text-white/60">No devices have voted yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900 text-left text-white/60">
          <tr>
            <th className="p-3">Fingerprint</th>
            <th className="p-3">Votes</th>
            <th className="p-3">First seen</th>
            <th className="p-3">Last seen</th>
            <th className="p-3">Platform</th>
            <th className="p-3">IP</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800 bg-zinc-950 text-white">
          {devices.map((d) => (
            <Fragment key={d.fingerprint}>
              <tr
                onClick={() => setExpanded(expanded === d.fingerprint ? null : d.fingerprint)}
                className="cursor-pointer hover:bg-zinc-900"
              >
                <td className="p-3 font-mono text-xs">{shortFingerprint(d.fingerprint)}…</td>
                <td className="p-3 font-semibold">{d.voteCount}</td>
                <td className="p-3 text-white/70">{new Date(d.firstSeen).toLocaleString()}</td>
                <td className="p-3 text-white/70">{new Date(d.lastSeen).toLocaleString()}</td>
                <td className="p-3 text-white/70">{d.platform ?? "—"}</td>
                <td className="p-3 font-mono text-xs text-white/70">{d.ipAddress}</td>
              </tr>
              {expanded === d.fingerprint && (
                <tr className="bg-zinc-900">
                  <td colSpan={6} className="p-4">
                    <div className="space-y-3 text-xs">
                      <div>
                        <p className="font-semibold text-white/80">Full fingerprint</p>
                        <p className="font-mono text-white/60">{d.fingerprint}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-white/80">Films voted for</p>
                        <p className="text-white/60">{d.films.join(", ")}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-white/80">User agent</p>
                        <p className="break-all text-white/60">{d.userAgent}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-white/80">Raw device data</p>
                        <pre className="mt-1 max-h-64 overflow-auto rounded bg-black/40 p-3 text-white/70">
                          {JSON.stringify(JSON.parse(d.rawDeviceJson), null, 2)}
                        </pre>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
