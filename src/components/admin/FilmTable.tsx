"use client";

import { useEffect, useState } from "react";
import type { Film } from "@/types";
import { Button } from "@/components/ui/Button";
import { FilmForm } from "./FilmForm";

export function FilmTable() {
  const [films, setFilms] = useState<Film[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Film | null>(null);
  const [creating, setCreating] = useState(false);

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

  const onDelete = async (film: Film) => {
    if (!confirm(`Delete "${film.name}"? This will also delete all votes for this film.`)) return;
    const res = await fetch(`/api/admin/films/${film.id}`, { method: "DELETE" });
    if (res.ok) load();
    else alert("Failed to delete");
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
                <th className="p-3">Order</th>
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
                      className="h-14 w-10 rounded object-cover"
                    />
                  </td>
                  <td className="p-3 font-medium">{film.name}</td>
                  <td className="p-3 text-white/70">{film.school}</td>
                  <td className="p-3 text-white/70">{film.displayOrder}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setEditing(film)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => onDelete(film)}>
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

      {creating && (
        <FilmForm
          isOpen={creating}
          onClose={() => setCreating(false)}
          onSaved={load}
        />
      )}
      {editing && (
        <FilmForm
          key={editing.id}
          isOpen={!!editing}
          onClose={() => setEditing(null)}
          onSaved={load}
          film={editing}
        />
      )}
    </div>
  );
}
