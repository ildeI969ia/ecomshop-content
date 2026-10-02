export class RepositoryError extends Error {
  readonly code: string;
  readonly cause?: unknown;

  constructor(code: string, message: string, cause?: unknown) {
    super(message);
    this.name = "RepositoryError";
    this.code = code;
    this.cause = cause;
  }
}

export class RepositoryUnavailableError extends RepositoryError {
  constructor(repository: string, cause?: unknown) {
    super(
      "REPOSITORY_UNAVAILABLE",
      `El repositorio ${repository} no está disponible temporalmente.`,
      cause
    );
    this.name = "RepositoryUnavailableError";
  }
}

export class RepositoryValidationError extends RepositoryError {
  constructor(repository: string, message: string, cause?: unknown) {
    super("REPOSITORY_DATA_INVALID", `Datos inválidos en ${repository}: ${message}`, cause);
    this.name = "RepositoryValidationError";
  }
}
