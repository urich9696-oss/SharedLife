import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'

export interface TransactionFormValues {
  description: string
  amount: string
  category: string
  transactionDate: string
  isIncome: boolean
}

interface TransactionFormFieldsProps {
  values: TransactionFormValues
  onChange: (values: TransactionFormValues) => void
}

export function TransactionFormFields({ values, onChange }: TransactionFormFieldsProps) {
  return (
    <>
      <Input
        label="Beschreibung"
        value={values.description}
        onChange={(e) => onChange({ ...values, description: e.target.value })}
      />
      <Input
        label="Betrag"
        type="text"
        inputMode="decimal"
        value={values.amount}
        onChange={(e) => onChange({ ...values, amount: e.target.value })}
        placeholder="z. B. 24.90"
      />
      <Input
        label="Kategorie"
        value={values.category}
        onChange={(e) => onChange({ ...values, category: e.target.value })}
        placeholder="Optional"
      />
      <Input
        label="Datum"
        type="date"
        value={values.transactionDate}
        onChange={(e) => onChange({ ...values, transactionDate: e.target.value })}
      />
      <Switch
        label="Einnahme"
        checked={values.isIncome}
        onChange={(e) => onChange({ ...values, isIncome: e.target.checked })}
      />
    </>
  )
}

export const defaultTransactionForm: TransactionFormValues = {
  description: '',
  amount: '',
  category: '',
  transactionDate: new Date().toISOString().slice(0, 10),
  isIncome: false,
}
