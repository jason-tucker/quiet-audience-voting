import { afterEach, describe, expect, it, vi } from "vitest";
import { addClient, broadcastUpdate, removeClient, TooManySseClients } from "../sse";
import type { SsePayload } from "../sse";

type Controller = ReadableStreamDefaultController<Uint8Array>;

// Build a minimal stand-in for a stream controller. We only need enqueue/close
// for the fanout/removeClient paths in sse.ts to exercise them.
function makeController(): Controller & { enqueued: Uint8Array[] } {
  const enqueued: Uint8Array[] = [];
  const c = {
    enqueued,
    enqueue(chunk: Uint8Array) {
      enqueued.push(chunk);
    },
    close() {},
    error() {},
    desiredSize: 1,
  };
  return c as unknown as Controller & { enqueued: Uint8Array[] };
}

// Drain the shared client set between tests so HMR-style state on globalThis
// doesn't bleed across cases.
function resetClients() {
  const g = globalThis as unknown as { __qavSseClients?: Set<Controller> };
  g.__qavSseClients?.clear();
}

const payload: SsePayload = {
  films: [],
  total: 0,
  votingOpenedAt: null,
  serverTime: new Date().toISOString(),
};

describe("sse client tracking", () => {
  afterEach(() => {
    resetClients();
    vi.useRealTimers();
  });

  it("addClient → broadcast → removeClient leaves the controller out of fanout", () => {
    const a = makeController();
    const b = makeController();

    addClient(a);
    addClient(b);
    broadcastUpdate(payload);

    expect(a.enqueued.length).toBe(1);
    expect(b.enqueued.length).toBe(1);

    removeClient(a);
    broadcastUpdate(payload);

    // a was removed cleanly and should NOT receive the second broadcast.
    expect(a.enqueued.length).toBe(1);
    expect(b.enqueued.length).toBe(2);
  });

  it("addClient throws TooManySseClients past the cap", () => {
    // Cap is 200 in sse.ts. Fill the set, then assert the next add rejects.
    const controllers: Controller[] = [];
    for (let i = 0; i < 200; i++) {
      const c = makeController();
      controllers.push(c);
      addClient(c);
    }
    expect(() => addClient(makeController())).toThrow(TooManySseClients);
  });

  it("fanout removes a controller whose enqueue throws", () => {
    const good = makeController();
    const broken = makeController();
    broken.enqueue = () => {
      throw new Error("stream closed");
    };

    addClient(good);
    addClient(broken);
    broadcastUpdate(payload);

    // Next broadcast should only reach the surviving controller.
    broadcastUpdate(payload);
    expect(good.enqueued.length).toBe(2);
  });
});
