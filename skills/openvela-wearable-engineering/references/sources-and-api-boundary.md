# Sources and API Boundary

## Authority order

When sources disagree, prefer the most current and most runtime-specific source:

1. Current Xiaomi Vela JS / Quick App official documentation and API/device support tables.
2. Current openvela source, official examples, official `.claude` skills, and contest branch requirements.
3. Runtime evidence from the target simulator/image/device.
4. Project-local verified tests and documented invariants.
5. Generic frontend knowledge.

Generic browser, Node.js, React, Vue, CSS, or another Quick App ecosystem must never override a Vela-specific restriction.

## Official anchors

Use the current pages, not remembered syntax:

- Framework and project structure: `https://iot.mi.com/vela/quickapp/zh/guide/framework/`
- Manifest / permissions / features: `https://iot.mi.com/vela/quickapp/zh/guide/framework/manifest.html`
- Script/runtime syntax: `https://iot.mi.com/vela/quickapp/zh/guide/framework/script/`
- Native interfaces: `https://iot.mi.com/vela/quickapp/zh/features/`
- Multi-screen adaptation: `https://iot.mi.com/vela/quickapp/zh/guide/multi-screens/`
- Design guidance: `https://iot.mi.com/vela/quickapp/zh/guide/design/`
- Memory optimization: `https://iot.mi.com/vela/quickapp/zh/guide/best-practice/memory.html`
- Startup optimization: `https://iot.mi.com/vela/quickapp/zh/guide/best-practice/start.html`
- Acceptance criteria: `https://iot.mi.com/vela/quickapp/zh/guide/publish/acceptance-criteria.html`
- openvela AI skills: `https://github.com/open-vela/.claude`
- openvela docs: `https://github.com/open-vela/docs`

If network access is available and an API or rule is material to the implementation, re-check the current official page instead of relying on this reference file.

## Native API legality checklist

Before calling a native module:

1. Verify the module exists in the current official interface documentation.
2. Verify every method name and parameter used.
3. Verify required `features` declaration in `src/manifest.json`.
4. Verify required `permissions` declaration.
5. Verify minimum API level or platform requirements.
6. Verify target-device support where a support table exists.
7. Implement the documented failure path.
8. Decide who owns subscription/start and unsubscribe/stop.
9. Distinguish unavailable capability from missing sample/data.

Do not synthesize a method because a similarly named API exists on Android, the web, Node.js, or another wearable platform.

## Manifest rules

Treat `src/manifest.json` as part of runtime correctness:

- package identity controls what gets installed/launched;
- version metadata affects artifact identity and update behavior;
- `features` authorize native interfaces;
- `permissions` authorize protected operations;
- `router` defines valid pages;
- `deviceTypeList` and `designWidth` influence target assumptions;
- `minAPILevel` must cover APIs used by the app.

When debugging a runtime mismatch, inspect the manifest before changing business logic.

## JavaScript boundary

Vela JS is not Node.js. Do not import Node built-ins such as `fs`, `path`, `os`, `child_process`, `net`, or `crypto` into application runtime code unless the official runtime explicitly documents an equivalent module.

Do not assume browser globals such as `window`, `document`, `localStorage`, `sessionStorage`, or DOM APIs exist.

Use official module imports such as `@system.*` / documented service modules and project-local JavaScript modules.

## CSS / template boundary

Do not assume full browser CSS support. Verify selectors and properties against current Vela documentation. Project experience has shown that browser-valid descendant selectors can fail Vela compatibility checks.

Prefer supported primitives, explicit class-based styling, Flex layouts, and shape-specific rules that are documented by Vela.

## Data provenance boundary

Classify values before displaying them:

- **live/system** — returned by an official capability and currently valid;
- **persisted real** — previously captured real samples/records;
- **deterministic estimate** — derived from real inputs using an explicit algorithm;
- **compatibility value** — a fallback used to keep a flow operable;
- **mock/demo** — simulation for development or demonstration.

UI copy and product claims must preserve this distinction. A visually complete screen is not justification for promoting fallback/mock data to real health/device data.
