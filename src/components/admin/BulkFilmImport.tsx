"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

type Row = {
  name: string;
  school: string;
  posterUrl: string;
  ok: boolean;
  reason?: string;
};

const HEADER_HINT = "name,school,posterUrl";

const SAMPLE_CSV = `name,school,posterUrl
The Long Way Home,Lincoln High,/uploads/sample-a.webp
Tin Roof Summer,Riverside Academy,https://example.com/poster.jpg
Echoes,Westview HS,/uploads/sample-c.webp`;

// Minimal RFC-4180-ish CSV parser. Handles quoted fields, embedded commas,
// and doubled-quote escapes (`"foo ""bar"" baz"`). Not perfect — multi-line
// quoted fields are flattened — but good enough for the festival use case
// (name/school/posterUrl rarely contain newlines).
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 2;
        continue;
      }
      if (c === '"') {
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      row.push(cell);
      cell = "";
      i += 1;
      continue;
    }
    if (c === "\n" || c === "\r") {
      row.push(cell);
      // Skip \r\n pair as one separator.
      if (c === "\r" && text[i + 1] === "\n") i += 1;
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      cell = "";
      i += 1;
      continue;
    }
    cell += c;
    i += 1;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.length > 1 || row[0] !== "") rows.push(row);
  }
  return rows;
}

function parseRows(text: string): Row[] {
  const raw = parseCsv(text);
  if (raw.length === 0) return [];

  // First row may be a header. Detect by checking for "name" / "school" /
  // "posterUrl" tokens in any order; if found, skip it.
  const first = raw[0].map((c) => c.trim().toLowerCase());
  const looksLikeHeader = first.includes("name") && first.includes("school");
  const dataRows = looksLikeHeader ? raw.slice(1) : raw;

  return dataRows.map((cols) => {
    const name = (cols[0] ?? "").trim();
    const school = (cols[1] ?? "").trim();
    const posterUrl = (cols[2] ?? "").trim();
    let ok = true;
    let reason: string | undefined;
    if (!name || !school || !posterUrl) {
      ok = false;
      reason = "missing required field";
    } else if (name.length > 200) {
      ok = false;
      reason = "name > 200 chars";
    } else if (school.length > 200) {
      ok = false;
      reason = "school > 200 chars";
    } else if (posterUrl.length > 2000) {
      ok = false;
      reason = "posterUrl > 2000 chars";
    }
    return { name, school, posterUrl, ok, reason };
  });
}

export function BulkFilmImport({ isOpen, onClose, onImported }: Props) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number } | null>(null);

  const rows = useMemo(() => parseRows(text), [text]);
  const validRows = rows.filter((r) => r.ok);
  const invalidRows = rows.filter((r) => !r.ok);

  const onFile = async (file: File) => {
    const t = await file.text();
    setText(t);
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/films/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          films: validRows.map(({ name, school, posterUrl }) => ({ name, school, posterUrl })),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Server returned ${res.status}`);
      }
      const body = (await res.json()) as { created: number };
      setResult({ created: body.created });
      setText("");
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk import films">
      <div className="space-y-3">
        <p className="text-sm text-white/60">
          Paste a CSV or upload a file. Columns: <code>{HEADER_HINT}</code> (header optional).
        </p>

        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
            <span className="inline-flex items-center rounded-md bg-zinc-800 px-3 py-1.5 text-sm text-white/80 ring-1 ring-zinc-700 hover:bg-zinc-700">
              Choose CSV file…
            </span>
          </label>
          <Button size="sm" variant="secondary" onClick={() => setText(SAMPLE_CSV)}>
            Paste sample
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setText("")}>
            Clear
          </Button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          spellCheck={false}
          placeholder={`name,school,posterUrl\n…`}
          className="w-full rounded-md bg-zinc-900 px-3 py-2 font-mono text-xs text-white/90 ring-1 ring-zinc-700 focus:outline-none focus:ring-zinc-500"
        />

        {rows.length > 0 && (
          <div className="rounded-md bg-zinc-900 p-3 text-sm ring-1 ring-zinc-800">
            <p className="text-white/70">
              <span className="font-semibold text-emerald-300">{validRows.length}</span> ready,{" "}
              <span className={invalidRows.length > 0 ? "font-semibold text-rose-300" : "text-white/40"}>
                {invalidRows.length} invalid
              </span>{" "}
              of {rows.length} total.
            </p>
            {invalidRows.length > 0 && (
              <ul className="mt-2 max-h-24 list-disc space-y-0.5 overflow-y-auto pl-4 text-xs text-rose-300/80">
                {invalidRows.slice(0, 10).map((r, i) => (
                  <li key={i}>
                    row {rows.indexOf(r) + 1}: {r.reason} — “{r.name || "(empty)"}”
                  </li>
                ))}
                {invalidRows.length > 10 && (
                  <li className="text-white/40">…and {invalidRows.length - 10} more</li>
                )}
              </ul>
            )}
          </div>
        )}

        {error && (
          <p className="rounded-md bg-rose-500/10 p-2 text-sm text-rose-300">{error}</p>
        )}
        {result && (
          <p className="rounded-md bg-emerald-500/10 p-2 text-sm text-emerald-300">
            Imported {result.created} film{result.created === 1 ? "" : "s"}.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            disabled={submitting || validRows.length === 0}
            onClick={submit}
          >
            {submitting ? "Importing…" : `Import ${validRows.length} film${validRows.length === 1 ? "" : "s"}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
