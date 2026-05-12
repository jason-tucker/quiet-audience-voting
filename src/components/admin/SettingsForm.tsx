"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

interface SettingsResponse {
  settings: { eventName?: string; votingOpen?: string };
  hasPassword: boolean;
}

export function SettingsForm() {
  const [eventName, setEventName] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json() as Promise<SettingsResponse>)
      .then((d) => {
        setEventName(d.settings.eventName ?? "");
        setHasPassword(d.hasPassword);
      });
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const body: Record<string, string> = { eventName };
      if (password) {
        body.adminPassword = password;
        body.adminPasswordConfirm = passwordConfirm;
      }
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setMessage({ kind: "ok", text: "Saved." });
      setPassword("");
      setPasswordConfirm("");
      if (password) setHasPassword(true);
    } catch (err) {
      setMessage({ kind: "err", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-6">
      <section className="space-y-3 rounded-xl bg-zinc-900 p-6 ring-1 ring-zinc-800">
        <h2 className="text-lg font-semibold text-white">General</h2>
        <div>
          <label className="mb-1 block text-sm text-white/80">Event name</label>
          <input
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-white outline-none ring-1 ring-zinc-700 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-white/50">
            Shown on the closed-voting screen and the results page.
          </p>
        </div>
      </section>

      <section className="space-y-3 rounded-xl bg-zinc-900 p-6 ring-1 ring-zinc-800">
        <h2 className="text-lg font-semibold text-white">Admin password</h2>
        <p className="text-xs text-white/50">
          {hasPassword
            ? "Leave blank to keep the current password."
            : "No password set. Using INITIAL_ADMIN_PASSWORD env var until you set one."}
        </p>
        <div>
          <label className="mb-1 block text-sm text-white/80">New password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-white outline-none ring-1 ring-zinc-700 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-white/80">Confirm new password</label>
          <input
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-white outline-none ring-1 ring-zinc-700 focus:ring-blue-500"
          />
        </div>
      </section>

      {message && (
        <p className={`text-sm ${message.kind === "ok" ? "text-green-400" : "text-red-400"}`}>
          {message.text}
        </p>
      )}

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
