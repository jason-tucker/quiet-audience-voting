"use client";

import { Fragment, useEffect, useState } from "react";
import type { DeviceSummary, TrustedDeviceProfile } from "@/types";
import { Button } from "@/components/ui/Button";

function shortFingerprint(fp: string): string {
  return fp.slice(0, 12);
}

export function DeviceList() {
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [profiles, setProfiles] = useState<TrustedDeviceProfile[]>([]);
  const [hasTrusted, setHasTrusted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    try {
      const [d, p] = await Promise.all([
        fetch("/api/admin/devices").then((r) => r.json()),
        fetch("/api/admin/trusted-devices").then((r) => r.json()),
      ]);
      setDevices(d.devices);
      setHasTrusted(d.hasTrustedProfiles);
      setProfiles(p.profiles);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (mounted) await load();
    };
    run();
    const id = setInterval(load, 15000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const onTrust = async (device: DeviceSummary) => {
    const label = prompt(
      "Label for this trusted device (e.g. 'Lobby iPad'):",
      `iPad ${profiles.length + 1}`,
    );
    if (label === null) return;
    const res = await fetch("/api/admin/trusted-devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fingerprint: device.fingerprint, label }),
    });
    if (res.ok) load();
    else alert("Failed to mark device as trusted");
  };

  const onRemoveTrust = async (profileId: string) => {
    if (!confirm("Remove this trusted device profile?")) return;
    const res = await fetch(`/api/admin/trusted-devices/${profileId}`, { method: "DELETE" });
    if (res.ok) load();
  };

  if (loading) return <p className="text-white/60">Loading devices…</p>;

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">Trusted device profiles</h3>
            <p className="text-xs text-white/50">
              Devices that don&apos;t look like one of these get flagged below.
            </p>
          </div>
        </div>
        {profiles.length === 0 ? (
          <p className="text-sm text-white/60">
            None yet. Mark one of the iPads below as trusted to start flagging anything that looks
            different.
          </p>
        ) : (
          <ul className="space-y-2">
            {profiles.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg bg-zinc-950 p-3 ring-1 ring-zinc-800"
              >
                <div>
                  <p className="font-medium text-white">{p.label}</p>
                  <p className="text-xs text-white/50">
                    {p.platform ?? "—"} · {p.screenWidth}×{p.screenHeight}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => onRemoveTrust(p.id)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {devices.length === 0 ? (
        <div className="rounded-xl bg-zinc-900 p-12 text-center ring-1 ring-zinc-800">
          <p className="text-white/60">No devices have voted yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-left text-white/60">
              <tr>
                <th className="p-3">Status</th>
                <th className="p-3">Fingerprint</th>
                <th className="p-3">Votes</th>
                <th className="p-3">First seen</th>
                <th className="p-3">Last seen</th>
                <th className="p-3">Platform</th>
                <th className="p-3">IP</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-950 text-white">
              {devices.map((d) => {
                const isTrusted = d.trusted;
                const isFlagged = hasTrusted && !d.trusted;
                return (
                  <Fragment key={d.fingerprint}>
                    <tr
                      onClick={() =>
                        setExpanded(expanded === d.fingerprint ? null : d.fingerprint)
                      }
                      className="cursor-pointer hover:bg-zinc-900"
                    >
                      <td className="p-3">
                        {isTrusted ? (
                          <span className="rounded-full bg-green-900/60 px-2 py-0.5 text-xs font-medium text-green-300 ring-1 ring-green-700">
                            Trusted
                          </span>
                        ) : isFlagged ? (
                          <span className="rounded-full bg-amber-900/60 px-2 py-0.5 text-xs font-medium text-amber-300 ring-1 ring-amber-700">
                            Weird
                          </span>
                        ) : (
                          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-white/60">
                            Unknown
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-xs">{shortFingerprint(d.fingerprint)}…</td>
                      <td className="p-3 font-semibold">{d.voteCount}</td>
                      <td className="p-3 text-white/70">{new Date(d.firstSeen).toLocaleString()}</td>
                      <td className="p-3 text-white/70">{new Date(d.lastSeen).toLocaleString()}</td>
                      <td className="p-3 text-white/70">{d.platform ?? "—"}</td>
                      <td className="p-3 font-mono text-xs text-white/70">{d.ipAddress}</td>
                      <td className="p-3 text-right">
                        {!isTrusted && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTrust(d);
                            }}
                          >
                            Mark as example
                          </Button>
                        )}
                      </td>
                    </tr>
                    {expanded === d.fingerprint && (
                      <tr className="bg-zinc-900">
                        <td colSpan={8} className="p-4">
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
