import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { LoadingState } from '@/components/ui/LoadingState'
import { daysTogether, usePairProfile, useUpdatePairProfile } from '@/features/space/pair-profile'

export function PairProfilePage() {
  const { data: pair, isLoading } = usePairProfile()
  const update = useUpdatePairProfile()
  const [partnerAName, setPartnerAName] = useState('')
  const [partnerBName, setPartnerBName] = useState('')
  const [togetherSince, setTogetherSince] = useState('')
  const [coupleBlurb, setCoupleBlurb] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!pair) return
    setPartnerAName(pair.partnerAName)
    setPartnerBName(pair.partnerBName)
    setTogetherSince(pair.togetherSince ?? '')
    setCoupleBlurb(pair.coupleBlurb ?? '')
    setName(pair.name)
  }, [pair])

  if (isLoading || !pair) return <LoadingState />

  const together = daysTogether(togetherSince || null)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    try {
      await update.mutateAsync({
        name: name.trim() || 'SharedLife',
        partnerAName: partnerAName.trim() || 'Dennis',
        partnerBName: partnerBName.trim() || 'Lea',
        togetherSince: togetherSince || null,
        coupleBlurb: coupleBlurb.trim() || null,
      })
      setMessage('Paarprofil gespeichert.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link to="/settings" className="text-sm text-primary">
        ← Einstellungen
      </Link>
      <header className="mt-4 mb-6">
        <h1 className="font-serif text-3xl text-text">Paarprofil</h1>
        <p className="mt-2 text-sm text-text-muted">
          Visuelles Profil für euer gemeinsames Zuhause. Lea erhält dadurch noch keinen Login.
          {together !== null ? ` Aktuell ${together} gemeinsame Tage.` : ''}
        </p>
      </header>

      <form className="space-y-4" onSubmit={(e) => void handleSave(e)}>
        <Input label="Space-Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          label="Name Partner A"
          value={partnerAName}
          onChange={(e) => setPartnerAName(e.target.value)}
        />
        <Input
          label="Name Partner B"
          value={partnerBName}
          onChange={(e) => setPartnerBName(e.target.value)}
        />
        <Input
          label="Gemeinsam seit"
          type="date"
          value={togetherSince}
          onChange={(e) => setTogetherSince(e.target.value)}
        />
        <Textarea
          label="Kurzer gemeinsamer Text"
          value={coupleBlurb}
          onChange={(e) => setCoupleBlurb(e.target.value)}
          rows={3}
        />
        {message ? <p className="text-sm text-text-muted">{message}</p> : null}
        <Button type="submit" disabled={update.isPending}>
          Speichern
        </Button>
      </form>
    </div>
  )
}
