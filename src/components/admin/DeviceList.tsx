"use client";

import { Fragment, useEffect, useState } from "react";
import type { DeviceSummary, Film, TrustedDeviceProfile } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DeviceFilmBreakdown } from "./DeviceFilmBreakdown";

function shortFingerprint(fp: string): string {
  return fp.slice(0, 12);
}

export function DeviceList() {
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [profiles, setProfiles] = useState<TrustedDeviceProfile[]>([]);
  const [films, setFilms] = useState<Film[]>([]);
  const [hasTrusted, setHasTrusted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Modal state for "Mark as example"
  const [trustTarget, setTrustTarget] = useState<DeviceSummary | null>(null);
  const [trustLabel, setTrustLabel] = useState("");
  const [trusting, setTrusting] = useState(false);

  // Modal state for "Remove trusted profile"
  const [removeTarget, setRemoveTarget] = useState<TrustedDeviceProfile | null>(null);
  const [removing, setRemoving] = useState(false);

  const load = async () => {
    try {
      const [d, p, f] = await Promise.all([
        fetch("/api/admin/devices").then((r) => r.json()),
        fetch("/api/admin/trusted-devices").then((r) => r.json()),
        fetch("/api/films").then((r) => r.json()),
      ]);
      setDevices(d.devices);
      setHasTrusted(d.hasTrustedProfiles);
      setProfiles(p.profiles);
      setFilms(f.films);
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

  const openTrustModal = (device: DeviceSummary) => {
    setTrustTarget(device);
    setTrustLabel(`iPad ${profiles.length + 1}`);
  };

  const submitTrust = async () => {
    if (!trustTarget) return;
    setTrusting(true);
    try {
      const res = await fetch("/api/admin/trusted-devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint: trustTarget.fingerprint, label: trustLabel.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to mark device as trusted");
        return;
      }
      setTrustTarget(null);
      await load();
    } finally {
      setTrusting(false);
    }
  };

  const submitRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/admin/trusted-devices/${removeTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRemoveTarget(null);
        await load();
      }
    } finally {
      setRemoving(false);
    }
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
                <Button size="sm" variant="ghost" onClick={() => setRemoveTarget(p)}>
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
                      onClick={() => setExpanded(expanded === d.fingerprint ? null : d.fingerprint)}
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
                      <td className="p-3 text-white/70">
                        {new Date(d.firstSeen).toLocaleString()}
                      </td>
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
                              openTrustModal(d);
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
                              <p className="font-semibold text-white/80">
                                Vote distribution by film
                              </p>
                              <div className="mt-2">
                                <DeviceFilmBreakdown films={films} filmCounts={d.votesByFilm} />
                              </div>
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

      <Modal
        isOpen={!!trustTarget}
        onClose={() => setTrustTarget(null)}
        title="Mark device as example"
      >
        <div className="space-y-4">
          <p className="text-sm text-white/70">
            Give this trusted device a label so you can recognise it later (e.g. &quot;Lobby
            iPad&quot; or &quot;Exit B iPad&quot;).
          </p>
          <input
            value={trustLabel}
            onChange={(e) => setTrustLabel(e.target.value)}
            autoFocus
            className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-white outline-none ring-1 ring-zinc-700 focus:ring-blue-500"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setTrustTarget(null)}>
              Cancel
            </Button>
            <Button onClick={submitTrust} disabled={trusting || !trustLabel.trim()}>
              {trusting ? "Saving…" : "Mark as example"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Remove trusted device profile"
      >
        <div className="space-y-4">
          <p className="text-sm text-white/70">
            Remove the profile{" "}
            <span className="font-semibold text-white">{removeTarget?.label}</span>? Devices
            matching it will go back to being flagged as &quot;Weird&quot; until you trust another
            one.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={submitRemove} disabled={removing}>
              {removing ? "Removing…" : "Remove"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
