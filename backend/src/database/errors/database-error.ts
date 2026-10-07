export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class MapperError extends DatabaseError {
  constructor(mapperName: string, payload: unknown, cause?: unknown) {
    super(`Mapping failed in ${mapperName}. Invalid payload structure.`, cause);
    this.name = 'MapperError';
    // Optionally log payload securely if needed in real env
  }
}
