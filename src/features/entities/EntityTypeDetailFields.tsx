import type { EntityType } from '@/lib/indexed-db/schema'
import { DateFormFields, type DateDetailValues } from '@/features/dates/DateForm'
import { EventFormFields, type EventDetailValues } from '@/features/calendar/EventForm'
import { ExpenseFormFields, type ExpenseDetailValues } from '@/features/finances/ExpenseForm'
import { GoalFormFields, type GoalDetailValues } from '@/features/goals/GoalForm'
import { LeisureFormFields, type LeisureDetailValues } from '@/features/ideas/LeisureForm'
import { MomentFormFields, type MomentDetailValues } from '@/features/moments/MomentForm'
import { ProjectFormFields, type ProjectDetailValues } from '@/features/projects/ProjectForm'
import { RecipeFormFields, type RecipeDetailValues } from '@/features/recipes/RecipeForm'
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
    case 'event':
      return <EventFormFields values={values as EventDetailValues} onChange={onChange} />
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
    case 'gift':
      return <WishFormFields values={values as WishDetailValues} onChange={onChange} />
    case 'moment':
      return <MomentFormFields values={values as MomentDetailValues} onChange={onChange} />
    case 'project':
      return <ProjectFormFields values={values as ProjectDetailValues} onChange={onChange} />
    case 'leisure':
      return <LeisureFormFields values={values as LeisureDetailValues} onChange={onChange} />
    case 'recipe':
      return <RecipeFormFields values={values as RecipeDetailValues} onChange={onChange} />
    case 'expense':
      return <ExpenseFormFields values={values as ExpenseDetailValues} onChange={onChange} />
    default:
      return null
  }
}
