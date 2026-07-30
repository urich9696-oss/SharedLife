import { Input } from '@/components/ui/Input'

export interface ProjectDetailValues {
  phase: string
}

interface ProjectFormFieldsProps {
  values: ProjectDetailValues
  onChange: (values: ProjectDetailValues) => void
}

export function ProjectFormFields({ values, onChange }: ProjectFormFieldsProps) {
  return (
    <Input
      label="Phase"
      value={values.phase}
      onChange={(e) => onChange({ ...values, phase: e.target.value })}
      placeholder="z. B. Planung, Umsetzung"
    />
  )
}

export const defaultProjectDetail: ProjectDetailValues = { phase: '' }
