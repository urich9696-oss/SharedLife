export type AppErrorCategory =
  | 'network'
  | 'auth'
  | 'storage'
  | 'realtime'
  | 'sync'
  | 'validation'
  | 'push'

export interface AppError {
  category: AppErrorCategory
  code: string
  message: string
  cause?: unknown
  retryable?: boolean
}

export class SharedLifeError extends Error {
  readonly category: AppErrorCategory
  readonly code: string
  readonly retryable: boolean
  override readonly cause?: unknown

  constructor(error: AppError) {
    super(error.message)
    this.name = 'SharedLifeError'
    this.category = error.category
    this.code = error.code
    this.retryable = error.retryable ?? false
    this.cause = error.cause
  }

  toJSON(): AppError {
    return {
      category: this.category,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      cause: this.cause,
    }
  }
}

export function isAppError(value: unknown): value is SharedLifeError {
  return value instanceof SharedLifeError
}

export function toAppError(
  category: AppErrorCategory,
  code: string,
  message: string,
  options?: { cause?: unknown; retryable?: boolean },
): SharedLifeError {
  return new SharedLifeError({
    category,
    code,
    message,
    cause: options?.cause,
    retryable: options?.retryable,
  })
}
