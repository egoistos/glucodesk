import { t } from '../../shared/i18n'

interface Props {
  isStale: boolean
  lastTimestamp: Date | null
}

export function StaleIndicator({ isStale, lastTimestamp }: Props): JSX.Element | null {
  if (!isStale) return null

  const minutesAgo = lastTimestamp
    ? Math.floor((Date.now() - lastTimestamp.getTime()) / 60_000)
    : null

  return (
    <div className="flex items-center gap-1">
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-blink-stale inline-block" />
      <span className="text-xs text-gray-400">
        {minutesAgo !== null ? `${minutesAgo} ${t('widget.mOld')}` : t('widget.stale')}
      </span>
    </div>
  )
}
