import { TrendDirection, TREND_ARROWS, toDisplayValue, type GlucoseUnit } from '@glucodesk/shared-core'
import { t } from '../../shared/i18n'

// ---- TrendArrow ----

interface TrendArrowProps {
  trend: TrendDirection
  color: string
}

export function TrendArrow({ trend, color }: TrendArrowProps): JSX.Element {
  return (
    <span
      className="text-2xl leading-none font-light"
      style={{ color }}
      title={TrendDirection[trend]}
    >
      {TREND_ARROWS[trend]}
    </span>
  )
}

// ---- Delta ----

interface DeltaProps {
  delta: number | null
  color: string
  unit?: GlucoseUnit
}

export function Delta({ delta, color, unit = 'mg/dL' }: DeltaProps): JSX.Element {
  if (delta === null) return <span />

  const displayDelta = toDisplayValue(delta, unit)
  const sign = delta > 0 ? '+' : ''
  return (
    <span className="text-sm font-medium tabular-nums" style={{ color, opacity: 0.85 }}>
      {sign}{displayDelta}
    </span>
  )
}

// ---- TimeAgo ----

interface TimeAgoProps {
  timestamp: Date | null
}

export function TimeAgo({ timestamp }: TimeAgoProps): JSX.Element {
  if (!timestamp) return <span className="text-xs text-gray-400">--</span>

  const diffMs = Date.now() - timestamp.getTime()
  const diffMin = Math.floor(diffMs / 60_000)

  let label: string
  if (diffMin < 1) label = t('widget.justNow')
  else label = `${diffMin} ${t('widget.minAgo')}`

  return (
    <span className="text-xs text-gray-400 tabular-nums">{label}</span>
  )
}
