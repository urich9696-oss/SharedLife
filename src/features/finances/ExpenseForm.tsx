import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ASSIGNEE_OPTIONS, EntityDateFields } from '@/features/entities/SharedFormFields'

export type FinanceKind = 'income' | 'expense'
export type FinanceRecurrence = 'monthly' | 'once'

export interface ExpenseDetailValues {
  amount: string
  category: string
  paidBy: string
  kind: FinanceKind
  recurrence: FinanceRecurrence
}

const categoryOptions = [
  { value: '', label: 'Ohne Kategorie' },
  { value: 'wohnen', label: 'Wohnen' },
  { value: 'lebensmittel', label: 'Lebensmittel' },
  { value: 'mobility', label: 'Mobilität' },
  { value: 'freizeit', label: 'Freizeit' },
  { value: 'gesundheit', label: 'Gesundheit' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

const kindOptions = [
  { value: 'expense', label: 'Ausgabe' },
  { value: 'income', label: 'Einnahme' },
]

const recurrenceOptions = [
  { value: 'once', label: 'Einmalig' },
  { value: 'monthly', label: 'Monatlich' },
]

interface ExpenseFormFieldsProps {
  values: ExpenseDetailValues
  onChange: (values: ExpenseDetailValues) => void
}

export function ExpenseFormFields({ values, onChange }: ExpenseFormFieldsProps) {
  return (
    <>
      <Input
        label="Betrag"
        type="number"
        step="0.01"
        value={values.amount}
        onChange={(e) => onChange({ ...values, amount: e.target.value })}
        required
      />
      <Select
        label="Art"
        options={kindOptions}
        value={values.kind}
        onChange={(e) => onChange({ ...values, kind: e.target.value as FinanceKind })}
      />
      <Select
        label="Wiederholung"
        options={recurrenceOptions}
        value={values.recurrence}
        onChange={(e) =>
          onChange({ ...values, recurrence: e.target.value as FinanceRecurrence })
        }
      />
      {values.kind === 'expense' ? (
        <Select
          label="Kategorie"
          options={categoryOptions}
          value={values.category}
          onChange={(e) => onChange({ ...values, category: e.target.value })}
        />
      ) : null}
      <EntityDateFields showEnd={false} showAllDay={false} showTime={false} startLabel="Datum" />
      <Select
        label="Bezahlt von"
        options={[...ASSIGNEE_OPTIONS.filter((o) => o.value)]}
        value={values.paidBy || 'gemeinsam'}
        onChange={(e) => onChange({ ...values, paidBy: e.target.value })}
      />
    </>
  )
}

export const defaultExpenseDetail: ExpenseDetailValues = {
  amount: '',
  category: '',
  paidBy: 'gemeinsam',
  kind: 'expense',
  recurrence: 'once',
}
