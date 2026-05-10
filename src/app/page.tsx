"use client";

import { useEffect, useRef, useState } from "react";
import type { Film, DeviceInfo, AppStatus } from "@/types";
import { collectDeviceInfo } from "@/lib/device";
import { VotingGrid } from "@/components/voting/VotingGrid";
import { ExpandedFilmCard } from "@/components/voting/ExpandedFilmCard";
import { ThankYouOverlay } from "@/components/voting/ThankYouOverlay";
import { VotingClosedScreen } from "@/components/voting/VotingClosedScreen";
import { Spinner } from "@/components/ui/Spinner";

type Phase = "loading" | "grid" | "expanded" | "thankyou" | "closed" | "empty";

// Fisher-Yates shuffle. We re-shuffle every time the grid is shown to a new
// voter so position bias (top-left, center, etc.) cannot influence outcomes.
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sameFilmSet(a: Film[], b: Film[]): boolean {
  if (a.length !== b.length) return false;
  const ids = new Set(a.map((f) => f.id));
  return b.every((f) => ids.has(f.id));
}

const HIGHLIGHT_MS = 6000;

export default function VotingPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [films, setFilms] = useState<Film[]>([]);
  const [selected, setSelected] = useState<Film | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [eventName, setEventName] = useState("Film Festival");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const deviceInfoRef = useRef<DeviceInfo | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHighlight = () => {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
    setHighlightedId(null);
  };

  // Initial load: status + films + device fingerprint
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [statusRes, filmsRes, info] = await Promise.all([
          fetch("/api/status").then((r) => r.json() as Promise<AppStatus>),
          fetch("/api/films").then((r) => r.json() as Promise<{ films: Film[] }>),
          collectDeviceInfo(),
        ]);
        if (!mounted) return;
        deviceInfoRef.current = info;
        setEventName(statusRes.eventName);
        setFilms(shuffle(filmsRes.films));
        if (!statusRes.votingOpen) setPhase("closed");
        else if (filmsRes.films.length === 0) setPhase("empty");
        else setPhase("grid");
      } catch (err) {
        console.error("Failed to load voting screen", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Poll status every 10s for open/close changes and new films.
  // Important: don't reshuffle the grid out from under a voter. We only
  // replace the films list if the underlying set actually changed.
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const [status, filmsRes] = await Promise.all([
          fetch("/api/status").then((r) => r.json() as Promise<AppStatus>),
          fetch("/api/films").then((r) => r.json() as Promise<{ films: Film[] }>),
        ]);
        setEventName(status.eventName);
        setFilms((prev) => (sameFilmSet(prev, filmsRes.films) ? prev : shuffle(filmsRes.films)));
        setPhase((prev) => {
          if (prev === "expanded" || prev === "thankyou") return prev;
          if (!status.votingOpen) return "closed";
          if (filmsRes.films.length === 0) return "empty";
          return "grid";
        });
      } catch {
        // ignore transient errors
      }
    }, 10000);
    return () => clearInterval(id);
  }, []);

  const handleSelect = (film: Film) => {
    clearHighlight();
    setSelected(film);
    setPhase("expanded");
  };

  const handleCancel = () => {
    // Don't reshuffle — keep the grid in place so the voter doesn't lose
    // their bearings. Highlight the just-cancelled film with a white
    // border so they can see what they tapped, in case they want to
    // re-select it.
    const cancelled = selected?.id ?? null;
    setSelected(null);
    setPhase("grid");
    if (cancelled) {
      setHighlightedId(cancelled);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => setHighlightedId(null), HIGHLIGHT_MS);
    }
  };

  const handleConfirm = async () => {
    if (!selected || !deviceInfoRef.current || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filmId: selected.id, deviceInfo: deviceInfoRef.current }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 403) {
          setPhase("closed");
          setSelected(null);
        } else {
          alert(data.error ?? "Failed to record vote");
          setPhase("grid");
          setSelected(null);
        }
        return;
      }
      setPhase("thankyou");
    } catch {
      alert("Network error — please try again");
      setPhase("grid");
      setSelected(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleThankYouDone = () => {
    clearHighlight();
    setSelected(null);
    setFilms((prev) => shuffle(prev));
    setPhase("grid");
  };

  if (phase === "loading") {
    return (
      <div className="flex h-screen items-center justify-center text-white">
        <Spinner size={48} />
      </div>
    );
  }

  if (phase === "closed") return <VotingClosedScreen eventName={eventName} />;

  if (phase === "empty") {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center">
        <h1 className="text-4xl font-bold text-white">{eventName}</h1>
        <p className="mt-6 text-xl text-white/70">No films to vote on yet.</p>
      </div>
    );
  }

  return (
    <>
      <VotingGrid films={films} onSelect={handleSelect} highlightedId={highlightedId} />
      {phase === "expanded" && selected && (
        <ExpandedFilmCard
          film={selected}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          submitting={submitting}
        />
      )}
      {phase === "thankyou" && selected && (
        <ThankYouOverlay film={selected} onDone={handleThankYouDone} />
      )}
    </>
  );
}
