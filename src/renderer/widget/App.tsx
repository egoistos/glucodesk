import { useState, useEffect } from 'react'
import { useGlucoseData } from './hooks/useGlucoseData'
import { TimeAgo } from './components/TrendArrow'
import { Sparkline } from './components/Sparkline'
import { StaleIndicator } from './components/StaleIndicator'
import {
  classifyZone,
  DEFAULT_ALARM_THRESHOLDS,
  ZONE_COLORS,
  toDisplayValue,
  type AlarmThresholds,
  type GlucoseUnit,
} from '@glucodesk/shared-core'
import { setLang, t } from '../shared/i18n'


type WidgetSize = 'compact' | 'normal' | 'large'

interface SizeConfig {
  valueFontSize: string
  unitFontSize: string
  trendFontSize: string
  deltaFontSize: string
  timeFontSize: string
  sparkW: number
  sparkH: number
  gap: string
  showSparkline: boolean
  showCalRaw: boolean
}

const SIZE_CONFIG: Record<WidgetSize, SizeConfig> = {
  compact: {
    valueFontSize: '22px', unitFontSize: '8px', trendFontSize: '16px',
    deltaFontSize: '9px', timeFontSize: '9px',
    sparkW: 110, sparkH: 18, gap: '0px',
    showSparkline: true, showCalRaw: false,
  },
  normal: {
    valueFontSize: '32px', unitFontSize: '10px', trendFontSize: '22px',
    deltaFontSize: '12px', timeFontSize: '11px',
    sparkW: 150, sparkH: 28, gap: '2px',
    showSparkline: true, showCalRaw: true,
  },
  large: {
    valueFontSize: '42px', unitFontSize: '12px', trendFontSize: '28px',
    deltaFontSize: '14px', timeFontSize: '12px',
    sparkW: 210, sparkH: 36, gap: '3px',
    showSparkline: true, showCalRaw: true,
  },
}

export default function WidgetApp(): JSX.Element {
  const { current, history, isStale, delta, error } = useGlucoseData()
  const [unit, setUnit] = useState<GlucoseUnit>('mg/dL')
  const [thresholds, setThresholds] = useState<AlarmThresholds>(DEFAULT_ALARM_THRESHOLDS)
  const [calOffset, setCalOffset] = useState(0)
  const [widgetSize, setWidgetSize] = useState<WidgetSize>('normal')

  useEffect(() => {
    void window.glucodesk.getSettings().then((s) => {
      setUnit(s.glucoseUnit)
      setThresholds(s.alarmThresholds)
      setLang(s.language)
      setCalOffset(s.calibrationOffset ?? 0)
      setWidgetSize(s.widgetSize)
    })
    const unsub = window.glucodesk.onSettingsChanged((s) => {
      setUnit(s.glucoseUnit)
      setThresholds(s.alarmThresholds)
      setLang(s.language)
      setCalOffset(s.calibrationOffset ?? 0)
      setWidgetSize(s.widgetSize)
    })
    return (): void => unsub()
  }, [])

  const openSettings = (): void => { window.glucodesk.showSettings() }
  const cfg = SIZE_CONFIG[widgetSize]

  if (!current && !error) {
    return (
      <div className="drag-region w-full h-full flex flex-col items-center justify-center rounded-xl"
        style={{ background: 'rgba(0,0,0,0.78)' }}>
        <span className="text-gray-400 animate-pulse" style={{ fontSize: cfg.timeFontSize }}>{t('widget.connecting')}</span>
        <button onClick={openSettings}
          className="no-drag mt-1 text-blue-400 hover:text-blue-300 underline cursor-pointer" style={{ fontSize: cfg.timeFontSize }}>
          {t('widget.openSettings')}</button>
      </div>
    )
  }

  if (!current && error) {
    return (
      <div className="drag-region w-full h-full flex flex-col items-center justify-center rounded-xl gap-1 px-2"
        style={{ background: 'rgba(0,0,0,0.80)' }}>
        <span className="text-gray-500 font-bold" style={{ fontSize: cfg.valueFontSize }}>--</span>
        <button onClick={openSettings}
          className="no-drag text-blue-400 hover:text-blue-300 underline cursor-pointer" style={{ fontSize: cfg.timeFontSize }}>
          {t('widget.openSettings')}</button>
      </div>
    )
  }

  const zone = isStale ? 'stale' : classifyZone(current!.value, thresholds)
  const color = ZONE_COLORS[zone]
  const displayValue = current ? toDisplayValue(current.value, unit) : '--'
  const hasCalibration = calOffset !== 0
  const rawSensorValue = current ? current.value - calOffset : null
  const rawDisplay = rawSensorValue !== null ? toDisplayValue(rawSensorValue, unit) : null

  return (
    <div
      className="drag-region w-full h-full rounded-xl flex flex-col items-center justify-center"
      style={{
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(8px)',
        border: `1px solid ${color}33`,
        boxShadow: `0 0 12px ${color}22`,
        gap: cfg.gap,
        padding: '2px 6px',
      }}
    >
      {/* Value + trend + delta */}
      <div className="flex items-center" style={{ gap: '6px' }}>
        <div className="flex items-baseline gap-1 leading-none" style={{ color }}>
          <span className="font-bold tabular-nums" style={{ fontSize: cfg.valueFontSize }}>
            {isStale ? `(${displayValue})` : displayValue}
          </span>
          <span className="font-medium" style={{ fontSize: cfg.unitFontSize, opacity: 0.7 }}>{unit}</span>
        </div>
        {current && (
          <>
            <span className="leading-none font-light" style={{ color, fontSize: cfg.trendFontSize }}>
              {['?', '↓', '↘', '→', '↗', '↑'][current.trend] ?? '?'}
            </span>
            {delta !== null && (
              <span className="font-medium tabular-nums" style={{ color, fontSize: cfg.deltaFontSize, opacity: 0.85 }}>
                {delta > 0 ? '+' : ''}{toDisplayValue(delta, unit)}
              </span>
            )}
          </>
        )}
      </div>

      {/* Raw sensor when calibrated */}
      {cfg.showCalRaw && hasCalibration && rawDisplay && (
        <span className="text-gray-500 tabular-nums" style={{ fontSize: '9px' }} title={t('widget.calActive')}>
          ⚖ {rawDisplay}
        </span>
      )}

      {/* Sparkline */}
      {cfg.showSparkline && history.length > 1 && (
        <Sparkline readings={history} thresholds={thresholds} width={cfg.sparkW} height={cfg.sparkH} />
      )}

      {/* Time + settings */}
      <div className="flex items-center" style={{ gap: '4px' }}>
        <span className="text-gray-400 tabular-nums" style={{ fontSize: cfg.timeFontSize }}>
          {isStale ? (
            <StaleIndicator isStale={isStale} lastTimestamp={current?.timestamp ?? null} />
          ) : (
            <TimeAgo timestamp={current?.timestamp ?? null} />
          )}
        </span>
        <button onClick={openSettings}
          className="no-drag text-gray-600 hover:text-gray-400 cursor-pointer transition-colors"
          style={{ fontSize: cfg.timeFontSize }}
          title={t('widget.openSettings')}>
          ⚙
        </button>
      </div>
    </div>
  )
}
