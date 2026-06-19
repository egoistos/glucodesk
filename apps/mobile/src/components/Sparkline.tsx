import Svg, { Line, Polyline } from 'react-native-svg'
import type { ReactElement } from 'react'
import { type GlucoseReading } from '@glucodesk/shared-core'

interface Props {
  readings: GlucoseReading[]
  width: number
  height: number
}

export function Sparkline({ readings, width, height }: Props): ReactElement {
  const values = readings.map((reading) => reading.value)
  const min = Math.min(...values, 70)
  const max = Math.max(...values, 180)
  const range = Math.max(max - min, 1)
  const points = readings
    .map((reading, index) => {
      const x = readings.length <= 1 ? width : (index / (readings.length - 1)) * width
      const y = height - ((reading.value - min) / range) * height
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const thresholdY = (value: number): number => height - ((value - min) / range) * height

  return (
    <Svg width={width} height={height}>
      <Line x1={0} x2={width} y1={thresholdY(180)} y2={thresholdY(180)} stroke="#e8b923" strokeWidth={1} />
      <Line x1={0} x2={width} y1={thresholdY(70)} y2={thresholdY(70)} stroke="#f97316" strokeWidth={1} />
      <Polyline
        points={points}
        fill="none"
        stroke="#0f766e"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3}
      />
    </Svg>
  )
}
