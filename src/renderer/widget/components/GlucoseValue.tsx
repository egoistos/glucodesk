import type { GlucoseZone } from '../../shared/types'
import { ZONE_COLORS } from '../../shared/types'

interface Props {
  value: number
  displayValue: string
  unit: string
  zone: GlucoseZone
}

export function GlucoseValue({ displayValue, unit, zone }: Props): JSX.Element {
  const color = ZONE_COLORS[zone]
  const isUrgent = zone === 'urgentLow' || zone === 'urgentHigh'

  return (
    <div
      className={`glucose-value flex items-baseline gap-1 leading-none ${isUrgent ? 'animate-pulse' : ''}`}
      style={{ color }}
    >
      <span className="text-4xl font-bold tabular-nums">{displayValue}</span>
      <span className="text-xs opacity-70 font-medium">{unit}</span>
    </div>
  )
}
