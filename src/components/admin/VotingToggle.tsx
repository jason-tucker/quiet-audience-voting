"use client";

import { useState } from "react";

export function VotingToggle({
  initialOpen,
  onChange,
}: {
  initialOpen: boolean;
  onChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    setSaving(true);
    const next = !open;
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ votingOpen: next }),
      });
      if (res.ok) {
        setOpen(next);
        onChange?.(next);
      } else {
        alert("Failed to update");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-xl bg-zinc-900 p-6 ring-1 ring-zinc-800">
      <div>
        <h2 className="text-lg font-semibold text-white">Voting</h2>
        <p className="mt-1 text-sm text-white/60">
          {open
            ? "Voting is OPEN — iPads can cast votes."
            : "Voting is CLOSED — iPads will show the closed screen."}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={saving}
        aria-pressed={open}
        className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors disabled:opacity-50 ${
          open ? "bg-green-600" : "bg-zinc-700"
        }`}
      >
        <span
          className={`inline-block h-10 w-10 transform rounded-full bg-white shadow transition-transform ${
            open ? "translate-x-12" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
