import { addClient, removeClient, getCurrentResults } from "@/lib/sse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEARTBEAT_MS = 3000;

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      addClient(controller);
      try {
        const initial = await getCurrentResults();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(initial)}\n\n`));
      } catch {
        // ignore
      }

      // Heartbeat as a real `data:` event so the client's onmessage handler
      // fires and the watchdog stays armed. Plain SSE comments don't trigger
      // onmessage, which made the client think the connection was stale.
      const interval = setInterval(async () => {
        try {
          const snapshot = await getCurrentResults();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(snapshot)}\n\n`));
        } catch {
          clearInterval(interval);
        }
      }, HEARTBEAT_MS);

      (controller as unknown as { _interval?: NodeJS.Timeout })._interval = interval;
    },
    cancel(controller) {
      removeClient(controller);
      const interval = (controller as unknown as { _interval?: NodeJS.Timeout })._interval;
      if (interval) clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
