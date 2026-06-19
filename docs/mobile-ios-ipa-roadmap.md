# GlucoDesk iOS IPA Roadmap

Дата фиксации: 2026-06-19.

Цель: развить текущий GlucoDesk из Windows Electron-приложения в архитектуру
`desktop + mobile + shared-core` и довести мобильную ветку до готового iOS `.ipa`,
собираемого с Windows через Expo EAS Build.

## Текущий прогресс на 2026-06-19

Выполнено:

- `packages/shared-core` создан и подключен к desktop/mobile.
- Desktop Electron app продолжает собираться и тестироваться.
- `apps/mobile` создан на Expo SDK 54 и React Native.
- Mobile MVP работает в Expo Go: LibreLinkUp login, secure session, current glucose, trend, delta, stale state, history, chart, settings, foreground polling, local alarms.
- EAS profiles добавлены в `apps/mobile/eas.json`, но build/submit шаги после setup пока не выполняются.
- Apple Health write-sync wiring добавлен через `@kingstinct/react-native-healthkit`.
- Dynamic Island / Lock Screen Live Activity wiring добавлен через `expo-live-activity`.

Ограничения текущего состояния:

- Apple Health и Live Activity не работают в Expo Go, потому что требуют custom iOS development/internal build.
- HealthKit/ActivityKit поверхности пока проверены статически: `mobile:typecheck`, `expo-doctor`, `expo export --platform ios`.
- Без backend/APNs Lock Screen freshness ограничен foreground/app-active refresh на iOS.
- Widgets, watchOS и backend realtime-poller пока не начаты.

## Ключевое решение

Не портируем Electron в iOS. Делаем новый iPhone-клиент на Expo/React Native и
переиспользуем только платформенно-нейтральную доменную логику через
`packages/shared-core`.

Целевая структура:

```text
glucodesk/
  apps/
    desktop/
    mobile/
  packages/
    shared-core/
    shared-ui/          # опционально позже
  services/
    realtime-poller/    # позже, если нужны надежные live updates
  docs/
```

Первый практический шаг: не переносить сразу весь desktop в `apps/desktop`.
Сначала безопасно создать `packages/shared-core` и подключить его к текущему
desktop-коду. Переезд desktop в `apps/desktop` делать отдельным инкрементом после
стабилизации shared-core.

## Проверка доступов и возможностей Git/GitHub

Проверено локально в `H:\Dev\glucodesk`.

### Локальный Git

- Репозиторий инициализирован.
- Текущая ветка: `main`.
- Состояние: `main` отслеживает `origin/main`, рабочее дерево чистое.
- Последний commit: `67decf8`.
- Замечание: сообщение первого commit сейчас отображается как
  `nitial lucoesk desktop`. Это косметика. Исправлять можно только rewrite-ом
  истории (`git commit --amend` + force push), поэтому без отдельного решения не
  трогаем.

### Remote

```text
origin  https://github.com/egoistos/glucodesk.git
```

Проверено:

- `git ls-remote --heads origin` успешно видит `refs/heads/main`.
- `git fetch --dry-run origin` проходит без ошибок.
- `git push --dry-run origin HEAD:refs/heads/codex-access-check` проходит без
  ошибок и показывает, что локальные credentials имеют право на push. Ветка при
  этом не создана, потому что это dry-run.

### Git Credential Manager

Git Credential Manager установлен и подключен через системный Git config:

```text
credential.helper = manager
credential.helper = C:/Program Files/Git Credential Manager/git-credential-manager.exe
```

Это означает:

- локальный `git push` / `git pull` может использовать сохраненную авторизацию;
- токены не хранятся в репозитории и не должны передаваться в чат;
- при истечении/сбросе авторизации Git сам снова откроет browser-login через GCM.

### Git identity

Глобально настроено:

```text
user.name  = egoistos
user.email = keni120@yandex.ru
```

Если понадобится скрывать реальный email в публичной истории GitHub, заменить
`user.email` на GitHub noreply email до новых коммитов.

### Codex GitHub API / connector

Проверка через доступный GitHub-инструмент Codex по `egoistos/glucodesk` успешна.

Репозиторий:

- owner: `egoistos`;
- name: `glucodesk`;
- visibility: `public`;
- default branch: `main`;
- archived: `false`.

Права, которые вернул GitHub connector:

- `admin: true`;
- `maintain: true`;
- `pull: true`;
- `push: true`;
- `triage: true`.

Практически это значит, что в этом окружении Codex может:

- читать метаданные репозитория;
- читать файлы, commits, branches, issues, PR;
- создавать branches;
- создавать/обновлять файлы через GitHub API;
- открывать PR;
- комментировать PR/issues;
- запрашивать/снимать reviewers, labels, assignees;
- смотреть CI/checks и workflow runs, если они появятся.

Что пока не проверялось действием:

- реальное создание тестовой ветки на GitHub API;
- реальное создание PR;
- GitHub Actions write/rerun permissions на workflow, потому что workflow пока нет.

### Локальные инструменты

Проверено:

- `git`: установлен;
- `node`: `v22.22.1`;
- `npm`: `10.9.4`;
- `eas`: глобально не найден.

Следствие: EAS CLI нужно добавить отдельным setup-инкрементом:

```powershell
npm install --global eas-cli
eas login
```

Либо использовать `npx eas ...`, если не хотим глобальную установку.

## Важные ограничения iOS

- iOS-приложение для физического iPhone требует подписанный `.ipa`.
- Для device builds нужен Apple Developer Program account и права на создание
  signing credentials: bundle identifier, certificate, provisioning profile.
- EAS Build может выполнять iOS-сборку на серверах Expo, поэтому рабочий Windows
  setup подходит для создания `.ipa`.
- Точный polling каждые 60 секунд в фоне на iOS планировать нельзя. Для надежных
  lock screen/watch/live updates нужен backend-poller + APNs.
- HealthKit, ActivityKit, WidgetKit и watchOS можно начинать проектировать с
  Windows, но финальная отладка часто требует macOS/Xcode.

## Definition of Done для готового IPA

Минимально готовый `.ipa` для MVP:

- собран командой EAS Build для iOS physical device;
- имеет валидный bundle identifier;
- подписан Apple credentials;
- устанавливается на iPhone через EAS internal distribution или TestFlight;
- открывается без dev server для internal/preview build;
- выполняет LLU login;
- показывает current glucose, trend, delta, stale state;
- хранит credentials в secure storage;
- ведет локальную историю;
- показывает базовый график;
- выдает local notifications/alarms в foreground/background-возможных рамках iOS;
- не ломает текущую Windows desktop-сборку.

## Инкременты

### I0. Repo Hygiene и базовая защита

Статус: `Windows-safe`.

Результат:

- добавить этот roadmap;
- добавить `AGENTS.md` с правилами проекта для Codex;
- проверить `.gitignore`;
- зафиксировать команды проверки;
- поправить устаревшее описание LLU region flow в `README.md`.

Проверка:

```powershell
npm run build
npm test
npm run lint
git status --short --branch
```

Примечание: если `lint` падает из-за уже существующих предупреждений/ошибок,
зафиксировать baseline и не смешивать широкую чистку с mobile-работой.

### I1. Shared-core skeleton

Статус: `Windows-safe`.

Результат:

- создать `packages/shared-core`;
- добавить package name `@glucodesk/shared-core`;
- настроить TypeScript build/test;
- добавить exports entrypoint;
- подключить workspace/package resolution без переезда desktop.

Проверка:

```powershell
npm install
npm run build
npm test
```

### I2. Domain types и unit/zone logic

Статус: `Windows-safe`.

Перенести в shared-core:

- `TrendDirection`;
- `GlucoseUnit`;
- `GlucoseReading`;
- `AlarmThresholds`;
- `StaleDataConfig`;
- `GlucoseZone`;
- unit conversion;
- zone classification;
- constants для defaults.

Источник сейчас:

- `src/renderer/shared/types.ts`.

Проверка:

- unit tests на `toDisplayValue`;
- unit tests на `classifyZone`;
- desktop imports переключены на shared-core;
- desktop build проходит.

### I3. LibreLinkUp types/errors/region logic

Статус: `Windows-safe`.

Перенести в shared-core:

- LLU request/response types;
- `LluError`;
- `LluErrorCode`;
- `REGION_BASE_URL`;
- normalization для known regions;
- account-id hash contract как platform-neutral interface/helper.

Не переносить напрямую:

- `electron-log`;
- Node `crypto` как единственную реализацию;
- `Buffer`;
- desktop settings.

Текущий источник:

- `src/core/data-sources/libre-link-up/types.ts`;
- `src/core/data-sources/libre-link-up/client.ts`.

Проверка:

- tests: `ru -> https://api.libreview.ru`;
- tests: known LibreView regions -> `https://api-{region}.libreview.io`;
- tests: unknown/no region -> `https://api.libreview.io`;
- desktop LLU login still compiles.

### I4. LLU mapper и timestamp parsing

Статус: `Windows-safe`.

Перенести в shared-core:

- `mapMeasurement`;
- `mapGraphData`;
- `mapLatestFromConnection`;
- `calculateDelta`;
- timestamp parsing.

Текущий источник:

- `src/core/data-sources/libre-link-up/mapper.ts`.

Особый риск:

- mapper сейчас импортирует renderer-типы. Это нужно убрать.

Проверка:

- tests на ISO timestamp;
- tests на LLU US timestamp `M/D/YYYY H:MM:SS AM/PM`;
- tests на trend arrows `1..5` и fallback `UNKNOWN`;
- tests на сортировку graph data.

### I5. Calibration и platform-neutral alarm evaluation

Статус: `Windows-safe`.

Перенести в shared-core:

- pure `applyCalibration(value, offset)`;
- `calculateCalibrationOffset(meter, sensor)`;
- pure alarm evaluator: reading + thresholds + stale config + snooze state -> event/action.

Оставить в desktop adapters:

- sound;
- Windows notification;
- Electron broadcast;
- settings persistence.

Текущий источник:

- `src/core/calibration/index.ts`;
- `src/core/alarms/engine.ts`.

Проверка:

- tests на calibration offset;
- tests на stale alarm;
- tests на urgent/low/high zones;
- tests на snooze behavior without Electron.

### I6. Desktop adapter cleanup

Статус: `Windows-safe`.

Результат:

- desktop продолжает использовать Electron-specific adapters:
  - `electron-store`;
  - `safeStorage`;
  - `better-sqlite3`;
  - `electron-log`;
  - Windows notifications;
  - tray/window/preload IPC.
- reusable domain imports идут из `@glucodesk/shared-core`.

Проверка:

```powershell
npm run build
npm test
npm run lint
npm run dev
```

Acceptance:

- desktop виджет запускается;
- settings открываются;
- LLU test/login не сломан;
- history store не сломан;
- alarms не сломаны.

### I7. Expo mobile app skeleton

Статус: `iPhone-testable-on-Windows`.

Результат:

- создать `apps/mobile`;
- Expo + React Native + TypeScript;
- подключить `@glucodesk/shared-core`;
- добавить базовую навигацию;
- добавить экраны:
  - current reading;
  - history;
  - settings;
  - connection/login.

Проверка:

```powershell
cd apps/mobile
npm install
npx expo start
```

Для реального iPhone с native modules понадобится development build, не только
Expo Go.

### I8. Mobile LLU auth/session

Статус: `iPhone-testable-on-Windows`.

Результат:

- LLU login screen;
- token/session lifecycle;
- region redirect support;
- account-id hash support;
- friendly handling for TOU/privacy/email verification;
- network error/rate-limit states.

Mobile-specific adapters:

- logging через mobile logger;
- secure storage через keychain-backed Expo/React Native storage;
- no Electron imports.

Проверка:

- login на реальном LLU account;
- reconnect после app restart;
- invalid password не запускает retry loop;
- lockout/rate-limit показывается без повторных aggressive retries.

### I9. Mobile storage и history

Статус: `iPhone-testable-on-Windows`.

Результат:

- локальная SQLite/history store для readings;
- dedupe по timestamp/source;
- history query за период;
- cleanup старых readings;
- миграции схемы.

Важно:

- не переносить `better-sqlite3`;
- выбрать mobile-compatible SQLite package.

Проверка:

- save latest reading;
- restart app -> history сохраняется;
- chart получает отсортированный ряд.

### I10. Current reading UX

Статус: `iPhone-testable-on-Windows`.

Результат:

- current glucose screen;
- trend arrow;
- delta;
- stale indicator;
- units mg/dL / mmol/L;
- patient selection, если LLU возвращает несколько connections;
- basic chart.

Проверка:

- UI на маленьком и большом iPhone viewport;
- stale state при старых данных;
- empty/error/loading states.

### I11. Mobile polling и local alarms

Статус: `iPhone-testable-on-Windows`.

Результат:

- foreground polling;
- pause/resume по app lifecycle;
- conservative backoff;
- local notifications;
- alarm settings;
- snooze.

Ограничение:

- background polling не считать надежным live-механизмом.

Проверка:

- foreground update loop;
- notification permissions;
- urgent/low/high/stale alarms;
- app restart не теряет настройки.

### I12. EAS setup

Статус: `Windows-safe`.

Результат:

- установить EAS CLI или закрепить использование `npx eas`;
- `eas login`;
- `eas init`;
- добавить `eas.json`;
- настроить bundle identifier, например `com.egoistos.glucodesk`;
- выбрать app name/icon/splash;
- подготовить env/secrets strategy.

Команды:

```powershell
npm install --global eas-cli
eas login
cd apps/mobile
eas init
eas build:configure
```

Проверка:

```powershell
eas whoami
eas project:info
```

### I13. iOS development build `.ipa`

Статус: `iPhone-testable-on-Windows`.

Назначение: development client для тестирования native modules на реальном iPhone.

Зависимости:

- Expo account;
- Apple Developer Program account;
- device registered/provisioned через EAS flow;
- signing credentials.

Команда:

```powershell
cd apps/mobile
eas build --platform ios --profile development
```

Результат:

- `.ipa` development build;
- install link/QR в Expo dashboard;
- запуск на физическом iPhone;
- подключение к Metro/dev server для итераций.

Проверка:

```powershell
npx expo start --dev-client
```

### I14. iOS internal distribution `.ipa`

Статус: `iPhone-testable-on-Windows`.

Назначение: standalone `.ipa` для установки без dev server на зарегистрированные
устройства / внутреннее тестирование.

`eas.json` profile должен иметь `distribution: internal`.

Команда:

```powershell
cd apps/mobile
eas build --platform ios --profile preview
```

Результат:

- готовый installable `.ipa`;
- install URL/QR;
- приложение открывается без `expo start`;
- подходит как первый "готовый IPA" для ручного теста.

Проверка на iPhone:

- install;
- launch без dev server;
- LLU login;
- current reading;
- history;
- notifications permissions;
- restart app.

### I15. Production/TestFlight `.ipa`

Статус: `iPhone-testable-on-Windows`, финальные Apple-нюансы могут быть
`Mac-likely-required`.

Назначение: production build для TestFlight/App Store Connect.

Зависимости:

- Apple Developer Program;
- App Store Connect app record;
- bundle identifier совпадает;
- production signing credentials;
- privacy nutrition labels и permissions descriptions;
- версия/build number.

Команда:

```powershell
cd apps/mobile
eas build --platform ios --profile production
```

Отправка:

```powershell
eas submit --platform ios
```

Результат:

- production `.ipa`;
- upload в App Store Connect/TestFlight;
- build доступен для тестеров после обработки Apple.

### I16. CI/CD для builds

Статус: `Windows-safe`.

Результат:

- GitHub Actions workflow для checks;
- отдельный workflow/manual dispatch для EAS builds;
- Expo token в GitHub Secrets;
- Apple credentials не коммитятся.

Важно:

- если сборку делает EAS Cloud, GitHub runner не обязан быть macOS;
- macOS runner нужен только для локальной iOS-сборки без EAS Cloud или задач,
  требующих Xcode.

### I17. HealthKit

Статус: начато, `iPhone-testable-on-Windows`; финальная отладка может быть `Mac-likely-required`.

Результат:

- добавлен native-gated adapter `apps/mobile/src/lib/appleHealth.ts`;
- добавлены Settings consent/toggle/status;
- добавлена запись LibreLinkUp glucose sample в Apple Health как blood glucose quantity;
- добавлены HealthKit usage descriptions и config plugin;
- Expo Go fallback показывает custom-build-required status вместо падения.

Проверка:

- `npm run mobile:typecheck`;
- `npx expo-doctor`;
- `npx expo export --platform ios`;
- затем, после явного разрешения пользователя на EAS build: permissions on physical iPhone, write sample, no silent writes without explicit consent.

### I18. Live Activity

Статус: начато, `iPhone-testable-on-Windows`; финальная отладка может быть `Mac-likely-required`.

Результат:

- добавлен native-gated adapter `apps/mobile/src/lib/liveActivity.ts`;
- добавлены Settings toggle/status и Stop Live Activity action;
- display model содержит value, unit, trend, delta, freshness;
- добавлен deep link `glucodesk://current`;
- добавлен `NSSupportsLiveActivities` и config plugin;
- push updates выключены до появления backend/APNs.

Без backend этот surface будет ограничен надежностью iOS background execution.

### I19. Backend realtime-poller

Статус: `Windows-safe`.

Результат:

- service `services/realtime-poller`;
- LLU polling outside iPhone;
- APNs device token registry;
- push notifications;
- Live Activity push update pipeline;
- event audit/logging;
- rate-limit/backoff policy.

Это становится обязательным, если продуктовая цель: near-real-time lock screen,
Dynamic Island, watch surfaces.

### I20. Widgets и Apple Watch surfaces

Статус: `Mac-likely-required`.

Результат:

- iPhone widgets;
- watch complications / Smart Stack;
- shared display contracts;
- optional full watchOS app.

Не начинать до стабильного iPhone MVP и решения по backend.

## Рекомендуемые первые спринты

### Sprint 0

- добавить `AGENTS.md`;
- поправить `README.md` LLU region flow;
- добавить baseline checks;
- убедиться, что desktop build/test/lint статус понятен;
- создать issue/PR labels, если будем работать через GitHub.

### Sprint 1

- создать `packages/shared-core`;
- вынести domain types, units, zones;
- вынести LLU types/errors/region logic;
- вынести mapper/timestamp parsing;
- покрыть тестами;
- подключить desktop обратно.

### Sprint 2

- вынести calibration/pure alarm evaluation;
- очистить desktop adapters;
- подготовить workspace scripts;
- убедиться, что Windows desktop не сломан.

### Sprint 3

- создать `apps/mobile`;
- Expo skeleton;
- подключить shared-core;
- экраны login/current/settings/history placeholders;
- EAS setup draft.

### Sprint 4

- LLU login/session на mobile;
- secure storage;
- current reading;
- foreground polling;
- basic history store.

### Sprint 5

- chart;
- local alarms;
- stale state;
- development `.ipa`;
- тест на физическом iPhone.

### Sprint 6

- preview/internal `.ipa`;
- standalone install without dev server;
- hardening;
- подготовка TestFlight production profile.

## Готовый промпт для следующего чата

```text
Продолжаем GlucoDesk в H:\Dev\glucodesk.

Контекст:
- desktop Electron app должен оставаться рабочим;
- shared-core уже подключен;
- Expo mobile MVP уже работает в Expo Go;
- EAS setup есть, но шаги build/submit/credentials пока не выполнять без явного разрешения;
- Apple Health и Dynamic Island / Lock Screen Live Activity wiring уже добавлены, но в Expo Go они только показывают native-build-required fallback.

Цель следующего инкремента:
Захарднить native-only Apple surfaces до первого development/internal EAS build, не запуская сам EAS build.

Сделай:
1. Проверь `git status --short --branch` и последние коммиты.
2. Проверь документацию `README.md`, `docs/mobile-ipa-build.md`, `docs/mobile-ios-ipa-roadmap.md`, `docs/next-chat-handoff.md`.
3. Проверь Expo native config без сборки: `npx expo config --type introspect` из `apps/mobile`.
4. Убедись, что `@kingstinct/react-native-healthkit` entitlements/usage descriptions попадают в iOS config.
5. Убедись, что Live Activity config содержит `NSSupportsLiveActivities` и не требует push updates.
6. Добавь тестируемый JS-level fallback для native adapters, если это можно сделать без нативной сборки.
7. Проверь, не создает ли `expo-live-activity` долгосрочный риск из-за deprecated package; предложи вариант: оставить на первый dev build или заменить на custom Expo module/maintained alternative.
8. Запусти проверки: `npm run mobile:typecheck`, `npx expo-doctor`, `npx expo export --platform ios --output-dir dist-ci`, затем удалить `dist-ci`; после этого `npm run build`, `npm test -- --run`, `npm run lint`.
9. Закоммить изменения и подготовь короткий отчет: что готово для dev build, какие риски остались, какой следующий шаг.

Ограничения:
- Не запускать EAS build/submit/credentials.
- Не добавлять widgets, watchOS и backend/APNs без отдельного решения.
- Не коммитить secrets, tokens, `.env`, `.p8`, `.p12`, `.mobileprovision`.
- Не переписывать историю, не force push.
```

## Источники для текущих внешних допущений

- Expo EAS Build introduction: https://docs.expo.dev/build/introduction/
- Expo first build setup: https://docs.expo.dev/build/setup/
- Expo iOS development build for devices: https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/
- Expo internal distribution builds: https://docs.expo.dev/build/internal-distribution/
- Expo Apple Developer Program roles: https://docs.expo.dev/app-signing/apple-developer-program-roles-and-permissions/
- Expo EAS Submit: https://docs.expo.dev/submit/introduction/
- Codex web/GitHub setup: https://developers.openai.com/codex/cloud
- Codex GitHub code review: https://developers.openai.com/codex/integrations/github
- Codex admin setup / GitHub Connector: https://developers.openai.com/codex/enterprise/admin-setup
