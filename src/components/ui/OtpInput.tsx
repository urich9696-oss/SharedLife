import {
  useCallback,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react'
import { cn } from '@/lib/utilities/cn'

const OTP_LENGTH = 6

export interface OtpInputProps {
  value?: string
  onChange?: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  error?: string
  autoFocus?: boolean
  label?: string
  className?: string
}

export function OtpInput({
  value: controlledValue,
  onChange,
  onComplete,
  disabled = false,
  error,
  autoFocus = false,
  label = 'Bestätigungscode',
  className,
}: OtpInputProps) {
  const id = useId()
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [internalValue, setInternalValue] = useState('')
  const value = controlledValue ?? internalValue
  const digits = value.padEnd(OTP_LENGTH, ' ').slice(0, OTP_LENGTH).split('')

  const updateValue = useCallback(
    (next: string) => {
      const sanitized = next.replace(/\D/g, '').slice(0, OTP_LENGTH)
      if (controlledValue === undefined) setInternalValue(sanitized)
      onChange?.(sanitized)
      if (sanitized.length === OTP_LENGTH) onComplete?.(sanitized)
      return sanitized
    },
    [controlledValue, onChange, onComplete],
  )

  const focusIndex = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(OTP_LENGTH - 1, index))
    inputRefs.current[clamped]?.focus()
    inputRefs.current[clamped]?.select()
  }, [])

  const handleChange = (index: number, digit: string) => {
    const char = digit.replace(/\D/g, '').slice(-1)
    const chars = [...digits.map((d) => (d === ' ' ? '' : d))]
    chars[index] = char
    const next = updateValue(chars.join(''))
    if (char && index < OTP_LENGTH - 1) focusIndex(index + 1)
    if (!char) focusIndex(index)
    void next
  }

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      const current = digits[index]?.trim() ?? ''
      if (!current && index > 0) {
        event.preventDefault()
        const chars = [...digits.map((d) => (d === ' ' ? '' : d))]
        chars[index - 1] = ''
        updateValue(chars.join(''))
        focusIndex(index - 1)
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusIndex(index - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusIndex(index + 1)
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text')
    const sanitized = updateValue(pasted)
    focusIndex(Math.min(sanitized.length, OTP_LENGTH - 1))
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label id={`${id}-label`} className="text-sm font-medium text-text">
        {label}
      </label>
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        aria-describedby={error ? `${id}-error` : undefined}
        className="flex gap-2 sm:gap-3"
      >
        {Array.from({ length: OTP_LENGTH }, (_, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el
            }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            autoFocus={autoFocus && index === 0}
            disabled={disabled}
            aria-label={`Ziffer ${index + 1} von ${OTP_LENGTH}`}
            maxLength={1}
            value={digits[index]?.trim() ?? ''}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className={cn(
              'size-11 sm:size-12 rounded-lg border border-border bg-surface text-center text-lg font-semibold tabular-nums',
              'transition-[border-color,box-shadow] duration-200',
              'focus-visible:border-focus focus-visible:shadow-focus',
              'disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled',
              error && 'border-error',
            )}
          />
        ))}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
