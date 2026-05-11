import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Application-wide structured logger. Use in server code (API routes,
 * services, middleware) instead of `console.*`.
 *
 * - Level defaults to `debug` in dev and `info` in production; override with
 *   `LOG_LEVEL`.
 * - Dev builds pretty-print through `pino-pretty` for readability; production
 *   emits one JSON object per line for log aggregators.
 * - Pass a context object as the first argument:
 *   `logger.error({ err, filmId }, "vote insert failed")`.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  transport: isDev
    ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss.l" } }
    : undefined,
  base: undefined,
});
