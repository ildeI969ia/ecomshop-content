type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  requestId?: string;
  stage?: string;
  sku?: string;
  model?: string;
  [key: string]: unknown;
}

function write(level: LogLevel, message: string, context: LogContext = {}): void {
  const entry = {
    severity: level.toUpperCase(),
    timestamp: new Date().toISOString(),
    service: "ecomshop-content",
    environment: process.env.NODE_ENV || "development",
    message,
    ...context
  };

  const serialized = JSON.stringify(entry);
  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.log(serialized);
}

export const logger = {
  debug: (message: string, context?: LogContext) => write("debug", message, context),
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context)
};
