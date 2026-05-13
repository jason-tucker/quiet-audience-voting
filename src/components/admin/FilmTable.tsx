"use client";

import { useEffect, useState } from "react";
import type { Film } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FilmForm } from "./FilmForm";

export function FilmTable() {
  const [films, setFilms] = useState<Film[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Film | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Film | null>(null);
  const [deletingInFlight, setDeletingInFlight] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/films");
      const data = await res.json();
      setFilms(data.films);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onConfirmDelete = async () => {
    if (!deleting) return;
    setDeletingInFlight(true);
    try {
      const res = await fetch(`/api/admin/films/${deleting.id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleting(null);
        await load();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to delete");
      }
    } finally {
      setDeletingInFlight(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Films</h2>
        <Button onClick={() => setCreating(true)}>+ Add film</Button>
      </div>

      {loading ? (
        <p className="text-white/60">Loading…</p>
      ) : films.length === 0 ? (
        <div className="rounded-xl bg-zinc-900 p-12 text-center ring-1 ring-zinc-800">
          <p className="text-white/60">No films yet. Add the first one to get started.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-zinc-800">
          <table className="w-full">
            <thead className="bg-zinc-900 text-left text-sm text-white/60">
              <tr>
                <th className="p-3">Poster</th>
                <th className="p-3">Name</th>
                <th className="p-3">School</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-950 text-white">
              {films.map((film) => (
                <tr key={film.id}>
                  <td className="p-3">
                    <img
                      src={film.posterUrl}
                      alt={film.name}
                      className="h-14 w-10 rounded object-contain bg-zinc-800"
                    />
                  </td>
                  <td className="p-3 font-medium">{film.name}</td>
                  <td className="p-3 text-white/70">{film.school}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setEditing(film)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleting(film)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && <FilmForm isOpen={creating} onClose={() => setCreating(false)} onSaved={load} />}
      {editing && (
        <FilmForm
          key={editing.id}
          isOpen={!!editing}
          onClose={() => setEditing(null)}
          onSaved={load}
          film={editing}
        />
      )}

      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="Delete film">
        <div className="space-y-4">
          <p className="text-sm text-white/70">
            Permanently delete <span className="font-semibold text-white">{deleting?.name}</span>?
            All votes for this film will also be deleted.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setDeleting(null)} disabled={deletingInFlight}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onConfirmDelete} disabled={deletingInFlight}>
              {deletingInFlight ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
