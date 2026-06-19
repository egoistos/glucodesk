import { useEffect, useRef } from 'react'
import { createChart, LineStyle, type IChartApi, type ISeriesApi, type LineData } from 'lightweight-charts'
import type { GlucoseReading } from '../../shared/types'
import { ZONE_COLORS } from '../../shared/types'
import type { AlarmThresholds } from '../../shared/types'
import { classifyZone } from '../../shared/types'

interface Props {
  readings: GlucoseReading[]
  thresholds: AlarmThresholds
  width?: number
  height?: number
}

export function Sparkline({ readings, thresholds, width = 160, height = 40 }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      width,
      height,
      layout: {
        background: { color: 'transparent' },
        textColor: 'transparent',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      crosshair: { mode: 0 },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      timeScale: {
        visible: false,
        borderVisible: false,
      },
      handleScroll: false,
      handleScale: false,
      watermark: { visible: false },
    })

    const series = chart.addLineSeries({
      color: ZONE_COLORS.inRange,
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
      lineStyle: LineStyle.Solid,
    })

    chartRef.current = chart
    seriesRef.current = series

    // Remove TradingView branding link from DOM
    const container = containerRef.current
    if (container) {
      const links = container.querySelectorAll('a')
      links.forEach((a) => a.remove())
      // Also observe for dynamically added links
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          m.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              node.querySelectorAll('a').forEach((a) => a.remove())
              if (node.tagName === 'A') node.remove()
            }
          })
        }
      })
      observer.observe(container, { childList: true, subtree: true })
    }

    return () => {
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [width, height])

  useEffect(() => {
    if (!seriesRef.current || readings.length === 0) return

    // Build data for Lightweight Charts (needs Unix time in seconds)
    const data: LineData[] = readings.map((r) => ({
      time: Math.floor(r.timestamp.getTime() / 1000) as LineData['time'],
      value: r.value,
    }))

    seriesRef.current.setData(data)
    chartRef.current?.timeScale().fitContent()

    // Color series based on latest zone
    const latest = readings[readings.length - 1]
    if (latest) {
      const zone = classifyZone(latest.value, thresholds)
      seriesRef.current.applyOptions({ color: ZONE_COLORS[zone] })
    }
  }, [readings, thresholds])

  return (
    <div
      ref={containerRef}
      style={{ width, height, overflow: 'hidden', pointerEvents: 'none' }}
      className="opacity-80"
    />
  )
}
