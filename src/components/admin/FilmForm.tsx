"use client";

import { useState } from "react";
import type { Film } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  film?: Film | null;
}

export function FilmForm({ isOpen, onClose, onSaved, film }: Props) {
  const [name, setName] = useState(film?.name ?? "");
  const [school, setSchool] = useState(film?.school ?? "");
  const [posterUrl, setPosterUrl] = useState(film?.posterUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      // Send the file as the raw request body. The server handles multipart-free
      // uploads at /api/admin/upload — see route.ts for the rationale.
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "X-File-Name": encodeURIComponent(file.name),
        },
        body: file,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setPosterUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const url = film ? `/api/admin/films/${film.id}` : "/api/admin/films";
      const method = film ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, school, posterUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={film ? "Edit film" : "Add film"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-white/80">Film name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-white outline-none ring-1 ring-zinc-700 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-white/80">School</label>
          <input
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            required
            className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-white outline-none ring-1 ring-zinc-700 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-white/80">Poster image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
            }}
            className="w-full text-sm text-white/80 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-white hover:file:bg-blue-500"
          />
          {uploading && <p className="mt-2 text-sm text-white/60">Uploading…</p>}
          {posterUrl && (
            <div className="mt-3">
              <img src={posterUrl} alt="" className="h-32 rounded ring-1 ring-zinc-700" />
            </div>
          )}
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !posterUrl}>
            {saving ? "Saving…" : film ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
