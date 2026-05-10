"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

const POLL_MS = 3000;
const STATUS_TIMEOUT_MS = 2000;
const TARGET_TIMEOUT_MS = 4000;

type Status = "checking" | "service-down" | "page-missing";

async function fetchWithTimeout(url: string, ms: number): Promise<Response | null> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { cache: "no-store", signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

export default function NotFound() {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [secondsWaiting, setSecondsWaiting] = useState(0);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (cancelled) return;
      setSecondsWaiting(Math.floor((Date.now() - startedAt.current) / 1000));

      // 1. Is the API reachable at all?
      const statusRes = await fetchWithTimeout("/api/status", STATUS_TIMEOUT_MS);
      if (cancelled) return;
      if (!statusRes || !statusRes.ok) {
        setStatus("service-down");
        timer = setTimeout(tick, POLL_MS);
        return;
      }

      // 2. Service is up — try the originally-requested URL.
      const targetRes = await fetchWithTimeout(pathname, TARGET_TIMEOUT_MS);
      if (cancelled) return;
      if (targetRes && targetRes.ok) {
        // Real route now — bring the user back where they wanted to be.
        router.replace(pathname);
        router.refresh();
        return;
      }

      // 3. Service is up but the route really doesn't exist.
      setStatus("page-missing");
      timer = setTimeout(tick, POLL_MS);
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pathname, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-white/40">404</p>
      <h1 className="mt-2 text-4xl font-bold text-white sm:text-5xl">Page not found</h1>

      <p className="mt-4 max-w-md text-base text-white/70">
        We couldn&apos;t reach{" "}
        <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-sm text-white/90">
          {pathname}
        </code>
        .
      </p>

      <div className="mt-6 flex items-center gap-2 text-sm text-white/60">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            status === "checking"
              ? "bg-blue-500 animate-pulse"
              : status === "service-down"
                ? "bg-red-500 animate-pulse"
                : "bg-amber-500"
          }`}
          aria-hidden
        />
        {status === "checking" && "Checking…"}
        {status === "service-down" && `Service unreachable. Retrying every 3s (${secondsWaiting}s)…`}
        {status === "page-missing" &&
          `Service is up but this page doesn't exist. Still watching (${secondsWaiting}s)…`}
      </div>

      <p className="mt-6 max-w-md text-sm text-white/50">
        We&apos;ll bring you back to this page automatically the moment it comes online.
      </p>

      <div className="mt-8 flex gap-2">
        <Link href="/">
          <Button variant="secondary">Go to voting screen</Button>
        </Link>
        <Link href="/admin">
          <Button variant="ghost">Admin dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
