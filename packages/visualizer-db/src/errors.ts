/**
 * Database Error Types
 * Typed errors for better error handling in consuming applications
 */

export class DatabaseError extends Error {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class NotFoundError extends DatabaseError {
  constructor(
    public entity: string,
    public id: string
  ) {
    super(`${entity} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
}

export class OptimisticLockError extends DatabaseError {
  constructor(
    public entity: string,
    public id: string,
    public expectedVersion: number,
    public actualVersion: number
  ) {
    super(
      `Conflict: ${entity} ${id} was modified (expected v${expectedVersion}, got v${actualVersion})`
    );
    this.name = 'OptimisticLockError';
  }
}

export class UniqueConstraintError extends DatabaseError {
  constructor(
    public entity: string,
    public field: string,
    public value: string
  ) {
    super(`${entity} with ${field}=${value} already exists`);
    this.name = 'UniqueConstraintError';
  }
}

export class ForeignKeyError extends DatabaseError {
  constructor(
    public entity: string,
    public reference: string
  ) {
    super(`Cannot delete ${entity}: referenced by ${reference}`);
    this.name = 'ForeignKeyError';
  }
}

export class ValidationError extends DatabaseError {
  constructor(
    public entity: string,
    public field: string,
    public reason: string
  ) {
    super(`Validation failed for ${entity}.${field}: ${reason}`);
    this.name = 'ValidationError';
  }
}
