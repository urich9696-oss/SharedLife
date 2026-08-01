import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import {
  clearChunkReloadFlag,
  isChunkLoadError,
  recoverFromStaleChunk,
} from '@/lib/utilities/chunk-recovery'

export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const mod = await factory()
      clearChunkReloadFlag()
      return mod
    } catch (error) {
      if (isChunkLoadError(error)) {
        void recoverFromStaleChunk()
      }
      throw error
    }
  })
}
