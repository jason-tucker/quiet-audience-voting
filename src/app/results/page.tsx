"use client";

import { useEffect, useRef, useState } from "react";
import type { VoteResult, AppStatus } from "@/types";
import { ResultsBoard } from "@/components/results/ResultsBoard";

interface SsePayload {
  films: VoteResult[];
  total: number;
  votingOpenedAt: string | null;
  serverTime: string;
}

const STALE_AFTER_MS = 5000;

export default function ResultsPage() {
  const [films, setFilms] = useState<VoteResult[]>([]);
  const [total, setTotal] = useState(0);
  const [eventName, setEventName] = useState("Film Festival");
  const [votingOpenedAt, setVotingOpenedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<"live" | "stale" | "disconnected">("disconnected");
  const [lastUpdateMs, setLastUpdateMs] = useState<number | null>(null);

  const lastUpdateAt = useRef<number | null>(null);
  const reconnectAttempt = useRef(0);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json() as Promise<AppStatus>)
      .then((s) => setEventName(s.eventName))
      .catch(() => {});
  }, []);

  // Watchdog: if we haven't received an update in STALE_AFTER_MS, mark stale
  // and force a reconnect. EventSource auto-reconnects but doesn't tell us
  // when the upstream is silent — this catches that case.
  useEffect(() => {
    const id = setInterval(() => {
      const last = lastUpdateAt.current;
      if (last === null) return;
      const age = Date.now() - last;
      setLastUpdateMs(age);
      if (age > STALE_AFTER_MS && status === "live") {
        setStatus("stale");
        forceReconnect();
      }
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const connect = () => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    const url = `/api/results/stream?cb=${Date.now()}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      reconnectAttempt.current = 0;
    };
    es.onerror = () => {
      setStatus("disconnected");
      // Backoff and retry
      const delay = Math.min(5000, 500 * 2 ** reconnectAttempt.current);
      reconnectAttempt.current++;
      setTimeout(() => {
        if (esRef.current === es) connect();
      }, delay);
    };
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SsePayload;
        setFilms(data.films);
        setTotal(data.total);
        setVotingOpenedAt(data.votingOpenedAt);
        lastUpdateAt.current = Date.now();
        setLastUpdateMs(0);
        setStatus("live");
      } catch {
        // ignore malformed messages
      }
    };
  };

  const forceReconnect = () => {
    connect();
  };

  useEffect(() => {
    connect();
    return () => {
      if (esRef.current) esRef.current.close();
    };
  }, []);

  return (
    <ResultsBoard
      films={films}
      total={total}
      eventName={eventName}
      votingOpenedAt={votingOpenedAt}
      status={status}
      lastUpdateMs={lastUpdateMs}
    />
  );
}
