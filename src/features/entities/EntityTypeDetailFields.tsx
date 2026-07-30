import type { EntityType } from '@/lib/indexed-db/schema'
import { DateFormFields, type DateDetailValues } from '@/features/dates/DateForm'
import { GoalFormFields, type GoalDetailValues } from '@/features/goals/GoalForm'
import { MomentFormFields, type MomentDetailValues } from '@/features/moments/MomentForm'
import { ProjectFormFields, type ProjectDetailValues } from '@/features/projects/ProjectForm'
import { TaskFormFields, type TaskDetailValues } from '@/features/tasks/TaskForm'
import { TripFormFields, type TripDetailValues } from '@/features/trips/TripForm'
import { WishFormFields, type WishDetailValues } from '@/features/wishes/WishForm'
import type { DetailValues } from '@/features/entities/detail-payload-utils'

interface EntityTypeDetailFieldsProps {
  entityType: EntityType
  values: DetailValues
  onChange: (values: DetailValues) => void
  budgetOptions?: Array<{ value: string; label: string }>
}

export function EntityTypeDetailFields({
  entityType,
  values,
  onChange,
  budgetOptions,
}: EntityTypeDetailFieldsProps) {
  switch (entityType) {
    case 'trip':
      return (
        <TripFormFields
          values={values as TripDetailValues}
          onChange={onChange}
          budgetOptions={budgetOptions}
        />
      )
    case 'date':
      return <DateFormFields values={values as DateDetailValues} onChange={onChange} />
    case 'goal':
      return <GoalFormFields values={values as GoalDetailValues} onChange={onChange} />
    case 'task':
      return <TaskFormFields values={values as TaskDetailValues} onChange={onChange} />
    case 'wish':
      return <WishFormFields values={values as WishDetailValues} onChange={onChange} />
    case 'moment':
      return <MomentFormFields values={values as MomentDetailValues} onChange={onChange} />
    case 'project':
      return <ProjectFormFields values={values as ProjectDetailValues} onChange={onChange} />
    default:
      return null
  }
}
