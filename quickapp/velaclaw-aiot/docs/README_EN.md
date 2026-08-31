# vela_band

**English** | [简体中文](../README.md)

`vela_band` is a Xiaomi Vela Quick App demo for smart bands and watches. It demonstrates watch faces, health trends, workout records, notification overlays, a synchronization protocol, and low-power state management. The same RPK is validated on the `mi-band10` pill-shaped viewport and the circular `Vela_Watchs4` emulator.

> This repository is intended for simulator demonstrations and architecture validation. It is not medical software or production device firmware. Health metrics fall back to clearly labelled demo values when the system service is unavailable.

## Feature Status

| Area | Current implementation | Source or limitation |
| --- | --- | --- |
| Watch faces | Three faces, swipe, long-press selection, persistence | Quick App components and `system.storage` |
| Multi-screen UI | Pill, rectangular, and circular faces across seven wearable skins | `$device`, `system.device`, aspect ratios, shape-specific components |
| Circular launcher | Two-dimensional honeycomb, inertia, rebound, center scaling | `stack`, touch events, 2D transforms |
| Health | Heart rate, SpO2, and stress cards plus activity trends | Foreground `service.health`, per-metric demo fallback |
| Workouts | Walk/run, pause/resume, records | Time-based simulation; GPS distance when available |
| Notifications | Call, SMS, and app overlays | Local demo or `system.event`; not real telephony |
| Synchronization | Payload, chunks, ACK, progress | Mock transport; no real BLE |
| Power states | ACTIVE, DIM, SLEEP, raise-to-wake | State machine, accelerometer, visual fallback |
| Settings | Vibration, brightness, raise-to-wake, low power | System APIs when available, UI fallback otherwise |

## Requirements

- Node.js 18 or newer
- npm
- [AIoT-IDE](https://iot.mi.com/vela/quickapp/zh/guide/start/use-ide.html)
- A Vela Quick App emulator or compatible device

The last interactive acceptance run used `aiot-toolkit 2.0.5`, `@aiot-toolkit/jsc 1.0.8`, and both the `mi-band10` and `Vela_Watchs4` AVDs. Screen profiles cover `redmi_watch`, `xiaomi_band`, `xiaomi_band_10`, `xiaomi_band_pro`, `xiaomi_s4`, `xiaomi_s4_41`, and `xiaomi_watch`. Quick App features vary by image; see [Compatibility](COMPATIBILITY.md).

## Quick Start

Install locked dependencies and run project checks:

```bash
npm ci
npm run check
```

Build the JSC-enabled debug RPK:

```bash
npm run build
```

Output:

```text
dist/com.application.watch.demo.debug.1.0.0.rpk
```

One-command scripts run checks and build the same artifact:

```bash
# Windows
build.bat

# macOS / Linux
sh build.sh
```

### Development Mode

```bash
npm run start
```

This starts AIoT Toolkit in watch mode. Application deployment, debugging, and emulator selection are still handled by AIoT-IDE or compatible tooling.

### Run in the Simulator

1. Import the repository into AIoT-IDE.
2. Select the `mi-band10` or `Vela_Watchs4` Vela emulator.
3. Build and install the generated RPK.
4. Start package `com.application.watch.demo`. Its entry page is `pages/clock`.

After a Mi Band 10 cold start, run the following command only when AIoT-IDE has this project open, its project broker is active, and the JSC RPK is already installed:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-emulator.ps1 -Avd mi-band10
```

The script restores the emulator debug configuration and starts the application; it does not build or install the RPK. See [Compatibility](COMPATIBILITY.md) for prerequisites and troubleshooting.

Some older Vela runtimes are unstable after hot reinstall. Prefer stopping the application and cold-starting the emulator when replacing the RPK.

## Navigation

| Entry | Gesture or action | Result |
| --- | --- | --- |
| Clock | Swipe left/right | Switch watch face |
| Clock | Long press | Open face selection |
| Clock | Swipe up | Open application list |
| Watch S4 honeycomb | Drag in two dimensions | Move icons with inertia and center scaling |
| Watch S4 honeycomb | Tap an icon | Open a page; tap `CL` to return to the clock |
| Mi Band 10 list | Select a health item | Open heart rate, daily health, or trend |
| Application list | Select workout | Start a workout or inspect history |
| Application list | Select settings | Open sync, vibration, or brightness |
| Child page | Swipe right or press Back | Return to the previous page |

The clock enters DIM after roughly 8 seconds and SLEEP after roughly 15 seconds. Tapping the sleep overlay simulates wake-up.

## Notification Event

The Mi Band 10 layout subscribes to `band.demo.notification` and accepts `call`, `sms`, and `app` payloads. The Watch S4 layout does not initialize the in-app overlay and defers notifications to the system UI:

```json
{
  "eventName": "band.demo.notification",
  "options": {
    "params": {
      "type": "sms",
      "appName": "Messages",
      "content": "Hello from the simulator"
    }
  }
}
```

The notification demo page can trigger all three types without external tooling. The Android Emulator Extended Controls Phone/SMS pane is not currently bridged to this event and must not be presented as real telephony integration.

## Architecture

```text
vela_band/
├── docs/                       # Architecture, compatibility, maintenance
├── scripts/                    # Checks, builds, and emulator launch helpers
├── src/
│   ├── app.ux                  # Application lifecycle
│   ├── manifest.json           # Features, permissions, routes
│   ├── common/                 # Data, storage, power, workout, sync
│   ├── components/watchfaces/  # Watch-face components
│   └── pages/                  # User-facing pages
├── build.bat
├── build.sh
├── package.json
├── LICENSE
└── NOTICE
```

Design rules:

- Pages own interaction and rendering; common modules own state and system access.
- `screen_profile.js` prefers the page's actual `$device` viewport and resolves pill, rectangular, and circular profiles while retaining one RPK.
- Both launchers use the application catalog in `launcher_apps.js` and the same JPEG icons under `src/common/icons`; editable SVG sources live in `assets/icons`.
- The circular launcher uses a bounded 2D coordinate system, distance scaling, inertia, and rebound without relying on an undocumented crown API.
- Watch-face components consume properties and do not create business timers.
- Navigation goes through `page_motion.js`.
- Timers, sensors, and event subscriptions are released when pages hide or are destroyed.
- `storage_adapter.js` serializes updates and provides an in-memory fallback.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run start` | Start watch development mode |
| `npm run lint` | Check Vela template, style, and JavaScript compatibility |
| `npm run multiscreen:check` | Validate the multi-screen manifest, page roots, components, and shared assets |
| `npm run health:check` | Validate health permissions, three metrics, subscription cleanup, and viewport integration |
| `npm run health:visual -- xiaomi_band=path.png` | Parse an emulator PNG and check health-card centering and clipping |
| `npm run docs:check` | Validate local Markdown links |
| `npm run check` | Run source and documentation checks |
| `npm run build` | Build a JSC debug RPK |
| `npm run release` | Build a JSC release RPK |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-emulator.ps1 -Avd mi-band10` | Restore Mi Band 10 cold-start debugging and launch the app |

## Known Limitations

- Heart rate, SpO2, and stress prefer the system health service and fall back per metric when unavailable; neither source is suitable for health decisions.
- The `vela-watch-5.0` image used by `mi-band10` lacks `system.battery`, `system.brightness`, and `system.interconnect`. The application falls back, but the runtime can still log missing-feature errors.
- The Bluetooth page demonstrates protocol and UI flow only; it does not scan, connect, or transfer GATT data.
- Auto-brightness stores a preference but has no ambient-light algorithm.
- Notification hang-up changes demo UI only.
- Multi-screen rendering follows the official approach: a pill layout plus one compact layout shared by rectangular and circular screens. Standard hosts use `100%` roots; only the platform-1200 beta pill host receives a top-left viewport correction without asymmetric padding.
- All three 466×466 round skins share the same safe-area layout; their external cases do not change application design coordinates.
- Public Quick App documentation exposes no Watch S4 crown event, so the honeycomb is touch-driven.

## Documentation

| Document | Description |
| --- | --- |
| [Technical Architecture](TECHNICAL.md) | Layers, data flow, lifecycle, interfaces |
| [Compatibility](COMPATIBILITY.md) | Validated environment and Extended Controls boundaries |
| [Workout and Sync](B_F_IMPLEMENTATION.md) | Workout state, GPS, mock sync protocol |
| [Maintainer Guide](PROJECT_OWNER_GUIDE.md) | Safe changes, release process, troubleshooting |
| [Contributing](../CONTRIBUTING.md) | Development and review requirements |

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](../CONTRIBUTING.md), then ensure `npm run check` and `npm run build` pass before submitting a change.

## License

Repository source code is licensed under the [MIT License](../LICENSE). Direct development dependencies and external platform notes are listed in [NOTICE](../NOTICE).

## References

- [Xiaomi Vela Quick App documentation](https://iot.mi.com/vela/quickapp/zh/guide/)
- [Xiaomi Vela multi-screen guide](https://iot.mi.com/vela/quickapp/zh/guide/multi-screens/)
- [Using AIoT-IDE](https://iot.mi.com/vela/quickapp/zh/guide/start/use-ide.html)
