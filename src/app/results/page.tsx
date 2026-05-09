"use client";

import { useEffect, useState } from "react";
import type { VoteResult, AppStatus } from "@/types";
import { ResultsBoard } from "@/components/results/ResultsBoard";

export default function ResultsPage() {
  const [films, setFilms] = useState<VoteResult[]>([]);
  const [total, setTotal] = useState(0);
  const [eventName, setEventName] = useState("Film Festival");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json() as Promise<AppStatus>)
      .then((s) => setEventName(s.eventName))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/results/stream");
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { films: VoteResult[]; total: number };
        setFilms(data.films);
        setTotal(data.total);
        setConnected(true);
      } catch {
        // ignore malformed messages
      }
    };
    return () => {
      es.close();
    };
  }, []);

  return <ResultsBoard films={films} total={total} eventName={eventName} connected={connected} />;
}
