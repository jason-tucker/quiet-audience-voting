import { addClient, removeClient, getCurrentResults } from "@/lib/sse";

export const dynamic = "force-dynamic";

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
      // Heartbeat every 25s so proxies don't close the connection.
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(interval);
        }
      }, 25000);
      // Stash interval so we can clear it on cancel
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
