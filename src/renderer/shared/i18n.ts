// ============================================================
// i18n — simple localization for Settings UI and Widget
// ============================================================

const translations = {
  ru: {
    // Tabs
    'tab.connection': '🔗 Подключение',
    'tab.alarms': '🔔 Алармы',
    'tab.calibration': '📐 Калибровка',
    'tab.display': '🖥 Дисплей',
    'tab.general': '⚙️ Общие',

    // Connection
    'conn.title': 'Подключение LibreLinkUp',
    'conn.notice': 'Используются учётные данные LibreLinkUp (librelinkup.ru или librelinkup.com). Убедитесь, что вы приняли условия использования в официальном приложении.',
    'conn.email': 'Email',
    'conn.password': 'Пароль',
    'conn.passwordSaved': 'Пароль сохранён. Оставьте пустым, чтобы не менять.',
    'conn.region': 'Регион',
    'conn.clientVersion': 'Версия API',
    'conn.test': 'Проверить',
    'conn.testing': 'Проверка...',
    'conn.save': 'Сохранить и подключить',
    'conn.saving': 'Сохранение...',
    'conn.success': '✓ Подключено к региону',
    'conn.patients': 'пациент(ов)',
    'conn.actionRequired': '⚠️ Требуется действие:',
    'conn.actionHint': '— Откройте LibreLinkUp на телефоне и примите условия.',
    'conn.enterPassword': 'Введите пароль',

    // Alarms
    'alarm.thresholds': 'Пороги алармов',
    'alarm.urgentHigh': 'Критически высокий',
    'alarm.high': 'Высокий',
    'alarm.low': 'Низкий',
    'alarm.urgentLow': 'Критически низкий',
    'alarm.stale': 'Устаревшие данные',
    'alarm.staleWarning': 'Предупреждение через',
    'alarm.staleUrgent': 'Критично через',
    'alarm.min': 'мин',
    'alarm.notifications': 'Уведомления',
    'alarm.sound': 'Звуковые алармы',
    'alarm.windowsNotif': 'Уведомления Windows',
    'alarm.save': 'Сохранить',
    'alarm.saving': 'Сохранение...',

    // Calibration
    'cal.title': 'Калибровка (single-point)',
    'cal.description': 'Введите показание глюкометра для коррекции значений сенсора. Смещение применяется ко всем показаниям.',
    'cal.meterValue': 'Показание глюкометра',
    'cal.currentSensor': 'Текущее значение сенсора',
    'cal.currentOffset': 'Текущее смещение',
    'cal.calibrate': 'Калибровать',
    'cal.reset': 'Сбросить калибровку',
    'cal.noData': 'Нет данных сенсора для калибровки',
    'cal.done': 'Калибровка применена',

    // Display
    'display.title': 'Отображение',
    'display.units': 'Единицы глюкозы',
    'display.widgetSize': 'Размер виджета',
    'display.compact': 'Компакт',
    'display.normal': 'Обычный',
    'display.large': 'Большой',
    'display.clickThrough': 'Прозрачность для кликов',
    'display.clickThroughHint': 'Виджет не будет перехватывать клики мыши',
    'display.save': 'Сохранить',
    'display.saving': 'Сохранение...',

    // General
    'general.title': 'Общие настройки',
    'general.autostart': 'Запуск с Windows',
    'general.autostartHint': 'Запускать GlucoDesk автоматически при входе',
    'general.language': 'Язык',
    'general.polling': 'Интервал опроса',
    'general.pollingHint': 'Минимум 60с для избежания блокировки',
    'general.save': 'Сохранить',
    'general.saving': 'Сохранение...',
    'general.exportLogs': 'Сохранить логи на рабочий стол',
    'general.logsExported': 'Логи сохранены',
    'general.logsError': 'Ошибка экспорта',

    // Widget
    'widget.justNow': 'только что',
    'widget.minAgo': 'мин назад',
    'widget.stale': 'нет данных',
    'widget.mOld': 'мин',
    'widget.connecting': 'Подключение...',
    'widget.openSettings': 'Настройки',
    'widget.calActive': 'Калибровка активна, в скобках — сенсор',

    // Common
    'saved': 'Сохранено ✓',
  },
  en: {
    'tab.connection': '🔗 Connection',
    'tab.alarms': '🔔 Alarms',
    'tab.calibration': '📐 Calibration',
    'tab.display': '🖥 Display',
    'tab.general': '⚙️ General',

    'conn.title': 'LibreLinkUp Connection',
    'conn.notice': 'Uses your LibreLinkUp account credentials (librelinkup.ru or librelinkup.com). Make sure you accepted Terms of Use in the official app.',
    'conn.email': 'Email',
    'conn.password': 'Password',
    'conn.passwordSaved': 'Password saved. Leave blank to keep existing.',
    'conn.region': 'Region',
    'conn.clientVersion': 'API Version',
    'conn.test': 'Test',
    'conn.testing': 'Testing...',
    'conn.save': 'Save & Connect',
    'conn.saving': 'Saving...',
    'conn.success': '✓ Connected to region',
    'conn.patients': 'patient(s)',
    'conn.actionRequired': '⚠️ Action required:',
    'conn.actionHint': '— Open LibreLinkUp app and accept the Terms.',
    'conn.enterPassword': 'Enter password',

    'alarm.thresholds': 'Alarm Thresholds',
    'alarm.urgentHigh': 'Urgent High',
    'alarm.high': 'High',
    'alarm.low': 'Low',
    'alarm.urgentLow': 'Urgent Low',
    'alarm.stale': 'Stale Data',
    'alarm.staleWarning': 'Warning after',
    'alarm.staleUrgent': 'Urgent after',
    'alarm.min': 'min',
    'alarm.notifications': 'Notifications',
    'alarm.sound': 'Sound alarms',
    'alarm.windowsNotif': 'Windows notifications',
    'alarm.save': 'Save',
    'alarm.saving': 'Saving...',

    'cal.title': 'Calibration (single-point)',
    'cal.description': 'Enter a blood glucose meter reading to correct sensor values. The offset applies to all readings.',
    'cal.meterValue': 'Meter reading',
    'cal.currentSensor': 'Current sensor value',
    'cal.currentOffset': 'Current offset',
    'cal.calibrate': 'Calibrate',
    'cal.reset': 'Reset calibration',
    'cal.noData': 'No sensor data for calibration',
    'cal.done': 'Calibration applied',

    'display.title': 'Display',
    'display.units': 'Glucose Units',
    'display.widgetSize': 'Widget Size',
    'display.compact': 'Compact',
    'display.normal': 'Normal',
    'display.large': 'Large',
    'display.clickThrough': 'Click-through mode',
    'display.clickThroughHint': 'Widget won\'t capture mouse clicks',
    'display.save': 'Save',
    'display.saving': 'Saving...',

    'general.title': 'General',
    'general.autostart': 'Start with Windows',
    'general.autostartHint': 'Launch GlucoDesk automatically on login',
    'general.language': 'Language',
    'general.polling': 'Polling Interval',
    'general.pollingHint': 'Minimum 60s to avoid rate limits',
    'general.save': 'Save',
    'general.saving': 'Saving...',
    'general.exportLogs': 'Export logs to Desktop',
    'general.logsExported': 'Logs exported',
    'general.logsError': 'Export failed',

    'widget.justNow': 'just now',
    'widget.minAgo': 'min ago',
    'widget.stale': 'stale',
    'widget.mOld': 'min',
    'widget.connecting': 'Connecting...',
    'widget.openSettings': 'Settings',
    'widget.calActive': 'Calibration active, raw sensor in brackets',

    'saved': 'Saved ✓',
  },
} as const

type Lang = keyof typeof translations
type Key = keyof typeof translations['ru']

let currentLang: Lang = 'ru'

export function setLang(lang: Lang): void {
  currentLang = lang
}

export function t(key: Key): string {
  return translations[currentLang]?.[key] ?? translations['en']?.[key] ?? key
}

export function getLang(): Lang {
  return currentLang
}
