import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OtpInput } from '@/components/ui/OtpInput'

describe('OtpInput', () => {
  it('renders 6 digit inputs', () => {
    render(<OtpInput label="Code" />)
    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(6)
  })

  it('calls onChange with sanitized digits', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<OtpInput onChange={onChange} />)
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0]!, '1')
    expect(onChange).toHaveBeenCalledWith('1')
  })

  it('calls onComplete when 6 digits entered', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<OtpInput onComplete={onComplete} />)
    const first = screen.getAllByRole('textbox')[0]!
    await user.click(first)
    await user.paste('123456')
    expect(onComplete).toHaveBeenCalledWith('123456')
  })

  it('shows error message', () => {
    render(<OtpInput error="Ungültiger Code" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Ungültiger Code')
  })
})
