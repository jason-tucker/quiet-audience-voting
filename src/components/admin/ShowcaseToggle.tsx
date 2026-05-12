"use client";

import { useState } from "react";

export function ShowcaseToggle({ initialOn }: { initialOn: boolean }) {
  const [on, setOn] = useState(initialOn);
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    setSaving(true);
    const next = !on;
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showcaseMode: next }),
      });
      if (res.ok) setOn(next);
      else alert("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-xl bg-zinc-900 p-6 ring-1 ring-zinc-800">
      <div>
        <h2 className="text-lg font-semibold text-white">
          Showcase mode{" "}
          <span className="ml-2 rounded-full bg-purple-900/60 px-2 py-0.5 text-xs font-medium text-purple-300 ring-1 ring-purple-700">
            DEMO
          </span>
        </h2>
        <p className="mt-1 text-sm text-white/60">
          {on
            ? "Simulating votes from 6 fake iPads. Cast a real vote any time — they mix in transparently."
            : "Simulates votes from 6 fake iPads while voting is open. Useful for showing how live results look."}
        </p>
        <p className="mt-1 text-xs text-white/40">
          Cadence: roughly one vote every 3–8 seconds across all devices, with occasional 8–30
          second gaps. Stops when voting is closed.
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={saving}
        aria-pressed={on}
        className={`relative inline-flex h-12 w-24 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
          on ? "bg-purple-600" : "bg-zinc-700"
        }`}
      >
        <span
          className={`inline-block h-10 w-10 transform rounded-full bg-white shadow transition-transform ${
            on ? "translate-x-12" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
