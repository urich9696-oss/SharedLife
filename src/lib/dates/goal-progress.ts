import type { GoalProgressInput } from '@/lib/validation/goal-progress'

export function computeGoalProgressPercent(input: GoalProgressInput): number {
  switch (input.kind) {
    case 'percent':
      return Math.min(100, Math.max(0, round((input.current / input.target) * 100)))
    case 'amount':
      return Math.min(100, Math.max(0, round((input.current / input.target) * 100)))
    case 'count':
      return Math.min(100, Math.max(0, round((input.current / input.target) * 100)))
    case 'manual':
      return Math.min(100, Math.max(0, round(input.percent)))
    default: {
      const _exhaustive: never = input
      return _exhaustive
    }
  }
}

function round(n: number): number {
  return Math.round(n * 10) / 10
}
