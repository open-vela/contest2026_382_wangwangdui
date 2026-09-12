# Compatibility

`vela_band` targets Xiaomi Vela Quick App wearable environments. Capability availability depends on the system image, device services, emulator plumbing, and the application manifest. This document separates code support from runtime availability.

## Application requirements

The project requires Node.js 18 or newer for the repository toolchain. `src/manifest.json` uses a logical `designWidth` of 192 and targets the `watch` device type.

Declared Vela features:

- `system.router`
- `system.device`
- `system.battery`
- `system.brightness`
- `system.sensor`
- `system.geolocation`
- `system.vibrator`
- `system.event`
- `system.interconnect`
- `system.storage`
- `service.health`

Declared permissions include location and health access.

A manifest declaration expresses application intent. It does not guarantee that every emulator image exports the native module or returns meaningful samples.

## Form-factor profiles

The V2.5 device profile recognizes representative wearable dimensions in source code:

| Profile | Physical size | Form factor |
| --- | ---: | --- |
| Xiaomi Band | 192×490 | Pill |
| Xiaomi Band 10 | 212×520 | Pill |
| Xiaomi Band Pro class | 336×480 | Rect |
| Redmi Watch class | 432×514 | Rect |
| Xiaomi round class | 466×466 | Circle |
| Xiaomi round class | 480×480 | Circle |

Additional device identities may resolve through generic shape handling. Screen classification should prefer actual viewport and shape information over assumptions based only on a model name.

## Layout behavior

- the application uses a 192 logical design width;
- pages should occupy the available Scene instead of hard-coding a physical root size;
- full-bleed layers may reach the display edge;
- semantic content uses shape-aware safe geometry;
- Circle and Pill edge constraints must not be solved by shrinking the whole page;
- shape-specific absolute geometry must still give its parent explicit Scene bounds.

Known host or image quirks should be handled in the viewport/profile layer, not copied into individual business pages.

## Capability behavior

### Health

The application integrates `service.health` through capability adapters. Health UI promotes accepted system samples and keeps waiting or unavailable states when samples are missing. Feature availability can differ between Vela images.

### Location

`system.geolocation` can support workout distance when valid samples are delivered. Emulator location controls prove only host-side injection unless the complete path to the Quick App API is working.

### Motion

`system.sensor` is used for motion diagnostics and power-related gesture logic. Sensor listeners must be lifecycle-scoped.

### Battery and brightness

Some images may omit `system.battery` or `system.brightness` even when the application declares them. The application must remain usable through explicit fallback behavior rather than treating a missing native module as a fatal page error.

### Vibration

`system.vibrator` availability and supported patterns can vary. Haptic failures should be contained by the capability boundary.

### Interconnect and sync

`system.interconnect` availability is image-dependent. The repository synchronization demonstration uses a simulated transport boundary and must not be described as completed BLE communication.

## Runtime acceptance

After platform-sensitive changes, test the affected target with the competition-designated or project-designated Vela image. Record the image name and relevant tool versions with the test evidence.

At minimum verify:

- application install and cold launch;
- Clock navigation and watchface interaction;
- launcher tap and direct manipulation;
- Health waiting and live-data states where supported;
- workout start, pause, resume, finish and recovery;
- settings navigation and persistence;
- resource cleanup after leaving sensor, health, location, or timer-heavy pages;
- text fit, safe content and touch targets on every affected form factor.

## Interpreting evidence

Keep these evidence classes separate:

- **source support**: code path exists;
- **contract support**: repository tests verify logic or ownership;
- **simulator support**: a named Vela image has been exercised;
- **device support**: physical hardware has been exercised;
- **peer support**: an external phone or transport endpoint has been exercised.

Do not promote source support into a hardware claim without runtime evidence.
