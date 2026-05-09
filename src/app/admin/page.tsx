"use client";

import { useEffect, useState } from "react";
import { VotingToggle } from "@/components/admin/VotingToggle";
import { StatCard } from "@/components/admin/StatCard";
import { VoteTimeline } from "@/components/admin/VoteTimeline";

interface Stats {
  totalFilms: number;
  totalVotes: number;
  uniqueDevices: number;
}

interface SettingsResponse {
  settings: { votingOpen?: string; eventName?: string };
  hasPassword: boolean;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [suspiciousCount, setSuspiciousCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [s, settingsRes, suspicious] = await Promise.all([
          fetch("/api/admin/stats").then((r) => r.json()),
          fetch("/api/admin/settings").then((r) => r.json()),
          fetch("/api/admin/suspicious").then((r) => r.json()),
        ]);
        if (!mounted) return;
        setStats(s);
        setSettings(settingsRes);
        setSuspiciousCount(suspicious.clusters?.length ?? 0);
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

  const votingOpen = settings?.settings.votingOpen === "true";
  const eventName = settings?.settings.eventName ?? "Film Festival";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">{eventName}</h1>
        <p className="text-sm text-white/60">Admin dashboard</p>
      </header>

      {settings && <VotingToggle initialOpen={votingOpen} />}

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <StatCard label="Total films" value={stats?.totalFilms ?? "—"} />
        <StatCard label="Total votes" value={stats?.totalVotes ?? "—"} />
        <StatCard label="Unique devices" value={stats?.uniqueDevices ?? "—"} />
        <StatCard label="Suspicious clusters" value={suspiciousCount} />
      </div>

      <VoteTimeline />
    </div>
  );
}
