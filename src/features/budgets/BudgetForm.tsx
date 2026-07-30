import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'

export interface BudgetFormValues {
  name: string
  description: string
  currency: string
  amountLimit: string
  periodStart: string
  periodEnd: string
}

interface BudgetFormProps {
  values: BudgetFormValues
  onChange: (values: BudgetFormValues) => void
}

export function BudgetFormFields({ values, onChange }: BudgetFormProps) {
  return (
    <>
      <Input
        label="Name"
        value={values.name}
        onChange={(e) => onChange({ ...values, name: e.target.value })}
      />
      <Textarea
        label="Beschreibung"
        value={values.description}
        onChange={(e) => onChange({ ...values, description: e.target.value })}
        rows={2}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Währung"
          options={[
            { value: 'CHF', label: 'CHF' },
            { value: 'EUR', label: 'EUR' },
          ]}
          value={values.currency}
          onChange={(e) => onChange({ ...values, currency: e.target.value })}
        />
        <Input
          label="Limit"
          type="number"
          step="0.01"
          value={values.amountLimit}
          onChange={(e) => onChange({ ...values, amountLimit: e.target.value })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Zeitraum von"
          type="date"
          value={values.periodStart}
          onChange={(e) => onChange({ ...values, periodStart: e.target.value })}
        />
        <Input
          label="Zeitraum bis"
          type="date"
          value={values.periodEnd}
          onChange={(e) => onChange({ ...values, periodEnd: e.target.value })}
        />
      </div>
    </>
  )
}

export const defaultBudgetForm: BudgetFormValues = {
  name: '',
  description: '',
  currency: 'CHF',
  amountLimit: '',
  periodStart: '',
  periodEnd: '',
}
