# CLAUDE.md

This file guides Claude Code (claude.ai/code) when it works in this repository.

## What this is

**CDQ** (`hardware-test-page`) is a Vue 3 + Vite single-page app that technicians use to diagnose and test laptops. It runs inside a **WebView2 host** (a C# desktop app, "HardwareTestApp"). It can also run in a plain browser, but then the native features are missing. The UI, code comments and commit messages are in **Portuguese (pt-BR)**. Write new comments in Portuguese to match.

## Commands

```sh
npm install
npm run dev              # Vite dev server
npm run dev -- --host    # expose on LAN (test from a phone or another PC)
npm run build            # outputs dist/, which the WebView2 host loads
npm run preview
```

The project has no test suite, linter or TypeScript. "Verify" means `npm run build` succeeds. Requires Node `^20.19.0 || >=22.12.0`.

Build notes (`vite.config.js`):
- `base: './'` keeps asset paths relative so the WebView2 host can load `dist/` from disk. Don't change it.
- All of `node_modules` goes into one `vendor` chunk. Output names have no hashes (`assets/[name].js`).
- `dist/` and `dist.rar` are committed to git. A rebuild changes them.

## Architecture

### Three backends

1. **Local C# agent** at `http://localhost:5000/api`. It reads the hardware (WMI, LibreHardwareMonitor) and serves `/pc-info`, `/performance`, `/cpu-info`, `/battery`, `/network`, `/usb/*`, `/teclado/*` (native keyboard hook), `/auto-diagnostics/*`, `/eventlog/*` and `/progress`. Each component that calls it declares its own `const API_BASE_URL = 'http://localhost:5000/api'`. There is no shared client. The agent's source code is outside this repo, at `C:\Users\HP\Desktop\cdq back web\webview back funcional`. The endpoints are in `BackendAgent.cs`. Build it with `dotnet build HardwareTestApp.csproj`.
2. **Remote Node server** at `https://api.cdqweb.com.br/api`: login, theme and reports in `src/store.js` (`/auth/login`, `/usuario/tema`, `/relatorios`, `/relatorios/check`) and production data in `src/Dashboard.vue` (`/dashboard/producao`). The server source is outside this repo, at `C:\Users\HP\Desktop\servNode\ServidorNodehttps2-main\app.js`, and is not in git.
3. **WebView2 bridge**: `window.chrome.webview.postMessage({...})`, for example `GpuTests.vue` launching FurMark. Always guard it with `if (window.chrome?.webview)`.

### State: `src/store.js`

The app has no Vuex, Pinia or router. A single `reactive` object, `globalState`, holds all shared state and actions:
- Auth (`login`, `logout`, `restoreSession`). The session is saved in `localStorage['cdqweb-user']`.
- Navigation. `activeWindow` is `'diagnostico' | 'dashboard'` and is switched in `App.vue`. `activeMenu` is the sidebar section inside `Diagnostico.vue`: `informacoes`, `testes`, `relatorios`, `Diags`, `monitor`, `configurar`, `LogoView`, `keyboardTest`.
- i18n. `globalState.t('path.to.key')` reads `src/locales/i18n.js`, which has `pt`/`en`/`es`. The language comes from the user's `local` (`UY` → `es`, otherwise `pt`).
- Test results. `testResults` holds `{ key: { label, result: '' | 'PASS' | 'FAIL' } }`. Record results through `saveResult(key, status)`. It also logs to `testReports`, sets `reportSaved = false` and calls `persistProgress()`.
- Report. `saveFinalReport(os, comments)` checks whether the O.S. already exists, asks before overwriting, then POSTs the test fields (mapped via `TEST_FIELD_MAP` to DB column names) plus `buildHardwarePayload()` (built from `pcInfo`).
- Crash recovery. Progress is saved to the local agent's `/progress` and restored by `tryRestoreProgress()` (called from `Diagnostico.vue` after `pcInfo` loads), but only if the motherboard serial matches and isn't a BIOS placeholder (`PLACEHOLDER_SERIALS`).

Cross-component data is put on `globalState` by its producer: `pcInfo` (from `Diagnostico.vue`), `autoTestSmartInfo` (from `AutoTest.vue`) and `batteryTestInfo` (from `BatteryTest.vue`). `Relatorios.vue` and the report payload read these values.

### Component layout

- `src/App.vue`: the shell. It shows the login screen, the top nav (Diagnóstico/Dashboard) and the `beforeunload` warning when results are unsaved.
- `src/Diagnostico.vue`: the main window. It has the sidebars, system-info cards and performance polling, and renders the menu sections.
- `src/Dashboard.vue`: daily production as cards grouped by day (period presets or custom range, "my production" or all, filtered by status).
- `src/components/TestesView.vue`: the peripheral test grid. It mounts one test from `components/tests/` at a time.
- `src/components/tests/*Test.vue`: the individual tests. **Contract:** emit `test-completed` with `'PASS' | 'FAIL'` or `test-cancelled`, and `TestesView` then calls `saveResult`. Exceptions: `MicTest.vue` (it wraps `MicTestGrava`/`MicTestLoop`/`MicTestNotes` and can save both `microfone` and `speaker`) and `AutoTest.vue` call `globalState.saveResult` directly and only emit `test-cancelled`.
- `src/components/diags/`: diagnostics hub (`DiagsView`) with GPU tests, the Three.js `LogoView`, the `SmartTest` disk test and `EventLogAnalyzer`. `EventLogAnalyzer` shows blue screens, unexpected shutdowns and video driver resets (TDR, Display event 4101) as cards. The period can be 30, 60, 90 or 120 days (`/eventlog?dias=`). It draws on four data sources:
  - `src/data/bsodCauses.js`: the team's causes. They take priority. Entries prefixed with `IA:` are AI suggestions.
  - `src/data/bsodGuide.json`: 426 codes, translated from the BSOD-Guide by Ahmed Arafa. It is MIT-licensed, so keep the credit.
  - `bsodEvents.json`: Microsoft's names for the stop codes.
  - `src/data/driverComponents.js`: maps each driver file to the hardware component it controls.
  - `src/data/wheaErrors.js`: hardware errors (WHEA). It describes each WHEA event ID and decodes the MCA error code from `MciStat`. Events come from the agent's `/api/whea`. Cards group them by event, APIC and error type. A processor error offers "test this core in CPU Stress".
- `src/components/diags/CpuStress.vue`: CPU stress test that looks for calculation errors and new WHEA events. It also scores the machine and monitors temperature, voltage (VID) and clock. The load runs in the agent (`CpuStressService.cs`): each thread is pinned to one logical processor, so the test can target specific APIC IDs. Endpoints: `/cpu/topologia` and `/stress/start|status|stop`. `/whea/salvar` writes the evidence file to `Redist\logs` next to the agent.
- `src/components/progress/ProgressBar*.vue`: alternative progress-bar styles, chosen in Configurações (`data-progress-style`).
- `src/components/common/Icons.vue`: an inline SVG icon set, used as `<Icons name="..." size="48" />`.
- `src/components/backs/`, `src/backupapp.txt`, `App-copia.vue`, `src/files.zip`: **old backups that nothing imports.** Don't edit them. Ignore them when searching.

### Adding a new peripheral test

1. Create `components/tests/XTest.vue` that follows the emit contract.
2. Add a key to `globalState.testResults`. If it has a DB column, also add it to `TEST_FIELD_MAP`.
3. Add a button to `testButtons` and a `v-else-if` branch in `TestesView.vue`.
4. Add `hardware.<key>` translations to all three locales in `i18n.js`.

### Styling and theming

- Global tokens live in `src/assets/styles/theme.css` (`--bg-app`, `--bg-panel`, `--accent`, `--text-main`, `--text-dim`, `--border`, `--status-pass`, `--status-fail`, …). Theme variants use `[data-theme="..."]` on `<html>`, which `ConfiguraView.vue` sets and saves to the server via `globalState.updateTheme`. Use these variables, not hard-coded colors.
- Components use `<script setup>` with scoped styles. Path alias: `@` → `src/`.
- 3D: `three` (GLTF models and HDR in `public/`), `gsap`, `cannon-es`. Charts: `chart.js` + `vue-chartjs` with `chartjs-adapter-date-fns` (`Monitor.vue`, `BatteryTest.vue`).
- Static assets in `public/` (fonts, `.glb` models, `mp3/`, `texture/`) are fetched by absolute path, for example `/mp3/Kakarapo.wav`.

## Gotchas

- `main.js` silences all Vue warnings (`app.config.warnHandler = () => null`). Turn it off temporarily when you debug reactivity or prop issues.
- Most hardware data is empty unless the C# agent is running on port 5000. A component should fail gracefully (catch the error and log a warning) when the agent is down.
- `joystick` and `touchscreen` results aren't included in the saved report because they have no DB column.
