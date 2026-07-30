import {
  defaultDateDetail,
  type DateDetailValues,
} from '@/features/dates/DateForm'
import {
  defaultGoalDetail,
  type GoalDetailValues,
} from '@/features/goals/GoalForm'
import {
  defaultMomentDetail,
  type MomentDetailValues,
} from '@/features/moments/MomentForm'
import {
  defaultProjectDetail,
  type ProjectDetailValues,
} from '@/features/projects/ProjectForm'
import {
  defaultTaskDetail,
  type TaskDetailValues,
} from '@/features/tasks/TaskForm'
import {
  defaultTripDetail,
  type TripDetailValues,
} from '@/features/trips/TripForm'
import {
  defaultWishDetail,
  type WishDetailValues,
} from '@/features/wishes/WishForm'
import type { DetailType, EntityType } from '@/lib/indexed-db/schema'

export type DetailValues =
  | TripDetailValues
  | DateDetailValues
  | GoalDetailValues
  | TaskDetailValues
  | WishDetailValues
  | MomentDetailValues
  | ProjectDetailValues
  | Record<string, unknown>

export function defaultDetailForType(type: EntityType): DetailValues {
  switch (type) {
    case 'trip':
      return { ...defaultTripDetail }
    case 'date':
      return { ...defaultDateDetail }
    case 'goal':
      return { ...defaultGoalDetail }
    case 'task':
      return { ...defaultTaskDetail }
    case 'wish':
      return { ...defaultWishDetail }
    case 'moment':
      return { ...defaultMomentDetail }
    case 'project':
      return { ...defaultProjectDetail }
    default:
      return {}
  }
}

export function parseDetailPayload(
  type: EntityType,
  payload: Record<string, unknown> | null,
): DetailValues {
  const base = defaultDetailForType(type)
  if (!payload) return base
  return { ...base, ...payload }
}

export function detailTypeForEntity(type: EntityType): DetailType | null {
  const map: Partial<Record<EntityType, DetailType>> = {
    trip: 'trip',
    date: 'date',
    goal: 'goal',
    task: 'task',
    wish: 'wish',
    moment: 'moment',
    project: 'project',
    event: 'event',
    list: 'list',
  }
  return map[type] ?? null
}
