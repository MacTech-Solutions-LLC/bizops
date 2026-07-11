/**
 * Minimal structured logger. Emits single-line JSON to stdout/stderr so Railway
 * log drains and the MacTech ecosystem-health tooling can parse events. Never
 * log secrets or full request bodies.
 */

type Level = "debug" | "info" | "warn" | "error";

interface LogFields {
  [key: string]: unknown;
}

function emit(level: Level, message: string, fields: LogFields = {}) {
  const record = {
    level,
    app: "bizops",
    message,
    // Timestamp intentionally added by the runtime/log drain; omitted here to
    // keep the logger deterministic and side-effect free for tests.
    ...fields,
  };
  const line = safeStringify(record);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

function safeStringify(record: unknown): string {
  try {
    return JSON.stringify(record);
  } catch {
    return JSON.stringify({ level: "error", app: "bizops", message: "log_serialize_failed" });
  }
}

export const logger = {
  debug: (message: string, fields?: LogFields) => emit("debug", message, fields),
  info: (message: string, fields?: LogFields) => emit("info", message, fields),
  warn: (message: string, fields?: LogFields) => emit("warn", message, fields),
  error: (message: string, fields?: LogFields) => emit("error", message, fields),
  /** Log an error object without leaking it to the client. */
  exception: (message: string, err: unknown, fields?: LogFields) =>
    emit("error", message, {
      ...fields,
      errorName: err instanceof Error ? err.name : typeof err,
      errorMessage: err instanceof Error ? err.message : String(err),
    }),
};
