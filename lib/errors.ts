/**
 * Structured application errors.
 *
 * Replaces the legacy `catch → []/null` pattern. Operational failures (DB down,
 * Hub unreachable) must surface as errors — never as silent empty data. A
 * genuine "not found" is distinct from an operational failure and is modelled
 * separately (`NotFoundError`) so callers can render the correct safe state.
 */

export type AppErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "validation"
  | "conflict"
  | "operational"
  | "internal";

export interface AppErrorOptions {
  /** Machine-readable code driving the HTTP status and UI state. */
  code?: AppErrorCode;
  /** HTTP status to return when surfaced by a route handler. */
  status?: number;
  /** Safe, user-facing message. Never leak raw DB/driver text here. */
  userMessage?: string;
  /** Underlying cause, retained for logs only (never sent to the client). */
  cause?: unknown;
  /** Structured context for logs (ids, entity type). No secrets. */
  context?: Record<string, unknown>;
}

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  validation: 422,
  conflict: 409,
  operational: 503,
  internal: 500,
};

const DEFAULT_USER_MESSAGE_BY_CODE: Record<AppErrorCode, string> = {
  unauthenticated: "Please sign in to continue.",
  forbidden: "You do not have permission to perform this action.",
  not_found: "The requested item could not be found.",
  validation: "Please correct the highlighted fields.",
  conflict: "This change conflicts with the current state. Reload and retry.",
  operational: "A service is temporarily unavailable. Please try again shortly.",
  internal: "Something went wrong. Please try again.",
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly userMessage: string;
  readonly context?: Record<string, unknown>;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.code = options.code ?? "internal";
    this.status = options.status ?? STATUS_BY_CODE[this.code];
    this.userMessage =
      options.userMessage ?? DEFAULT_USER_MESSAGE_BY_CODE[this.code];
    this.context = options.context;
  }

  /** Shape returned to API clients — safe, no internal details. */
  toResponseBody(): { error: string; message: string } {
    return { error: this.code, message: this.userMessage };
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = "Sign-in required", options: AppErrorOptions = {}) {
    super(message, {
      code: "unauthenticated",
      userMessage: "Please sign in to continue.",
      ...options,
    });
    this.name = "UnauthenticatedError";
  }
}

export class AuthzError extends AppError {
  constructor(message = "Permission denied", options: AppErrorOptions = {}) {
    super(message, {
      code: "forbidden",
      userMessage: "You do not have permission to perform this action.",
      ...options,
    });
    this.name = "AuthzError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found", options: AppErrorOptions = {}) {
    super(message, {
      code: "not_found",
      userMessage: "The requested item could not be found.",
      ...options,
    });
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  /** Field-level issues, keyed by dotted path. */
  readonly issues?: Record<string, string[]>;
  constructor(
    message = "Validation failed",
    options: AppErrorOptions & { issues?: Record<string, string[]> } = {},
  ) {
    super(message, {
      code: "validation",
      userMessage: "Please correct the highlighted fields.",
      ...options,
    });
    this.name = "ValidationError";
    this.issues = options.issues;
  }

  toResponseBody() {
    return { ...super.toResponseBody(), issues: this.issues ?? {} };
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", options: AppErrorOptions = {}) {
    super(message, {
      code: "conflict",
      userMessage: "This change conflicts with the current state. Reload and retry.",
      ...options,
    });
    this.name = "ConflictError";
  }
}

/**
 * Operational failure (DB/network/driver). Distinct from `NotFoundError` so
 * callers never mistake an outage for "no data".
 */
export class OperationalError extends AppError {
  constructor(message = "Service temporarily unavailable", options: AppErrorOptions = {}) {
    super(message, {
      code: "operational",
      userMessage: "A service is temporarily unavailable. Please try again shortly.",
      ...options,
    });
    this.name = "OperationalError";
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

/** Normalise any thrown value into an `AppError` for uniform handling. */
export function toAppError(err: unknown): AppError {
  if (isAppError(err)) return err;
  const message = err instanceof Error ? err.message : String(err);
  return new AppError(message, { code: "internal", cause: err });
}
