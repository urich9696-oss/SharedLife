import { useAuth } from '@/features/auth/AuthProvider'
import { useMediaUrl } from '@/features/media/media-url'
import { cn } from '@/lib/utilities/cn'

function initialOf(name: string, fallback: string): string {
  return (name.trim() || fallback).charAt(0).toUpperCase()
}

export function PartnerAvatar({
  name,
  storagePath,
  fallbackInitial,
  sizeClassName = 'size-9',
  className,
  borderClassName = 'border-2 border-surface',
}: {
  name: string
  storagePath?: string | null
  fallbackInitial: string
  sizeClassName?: string
  className?: string
  borderClassName?: string
}) {
  const { spaceId } = useAuth()
  const { url } = useMediaUrl(storagePath, spaceId ?? undefined)
  const initial = initialOf(name, fallbackInitial)

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full bg-surface-soft',
        sizeClassName,
        borderClassName,
        className,
      )}
      aria-hidden="true"
    >
      {url ? (
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center font-semibold text-text">
          {initial}
        </div>
      )}
    </div>
  )
}

/** Überlappende Avatare für Header, Sidebar und Mehr-Sheet */
export function CoupleAvatars({
  partnerAName,
  partnerBName,
  partnerAAvatarPath,
  partnerBAvatarPath,
  size = 'md',
  className,
}: {
  partnerAName: string
  partnerBName: string
  partnerAAvatarPath?: string | null
  partnerBAvatarPath?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizeClass =
    size === 'sm' ? 'size-8' : size === 'lg' ? 'size-14' : 'size-9'
  const textClass =
    size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-sm' : 'text-xs'

  return (
    <div className={cn('flex -space-x-2', className)} aria-hidden="true">
      <PartnerAvatar
        name={partnerAName}
        storagePath={partnerAAvatarPath}
        fallbackInitial="D"
        sizeClassName={sizeClass}
        className={textClass}
      />
      <PartnerAvatar
        name={partnerBName}
        storagePath={partnerBAvatarPath}
        fallbackInitial="L"
        sizeClassName={sizeClass}
        className={cn(textClass, 'bg-primary/15')}
      />
    </div>
  )
}
