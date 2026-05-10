import { addClient, removeClient, getCurrentResults, TooManySseClients } from "@/lib/sse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        addClient(controller);
      } catch (err) {
        if (err instanceof TooManySseClients) {
          controller.error(err);
          return;
        }
        throw err;
      }
      try {
        const initial = await getCurrentResults();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(initial)}\n\n`));
      } catch {
        // The shared heartbeat will retry; no point failing the stream.
      }
    },
    cancel(controller) {
      removeClient(controller);
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
