# vela_band

**English** | [简体中文](../README.md)

`vela_band` is a Xiaomi Vela Quick App reference for wearable products. V2.5 evolves the V2.4 engineering base with a stronger multi-form-factor design model, clearer native capability boundaries, stricter lifecycle ownership, truthful health-data presentation, and a design toolchain that shares runtime layout semantics.

The application targets pill, circular, and rectangular wearable displays in one codebase. It is intended for contest demonstration, wearable UI research, and engineering practice. It is not medical software. Health values are shown as system-backed data only when trustworthy samples are available; missing samples remain visibly unavailable or pending.

## Development philosophy

`vela_band` is developed for the constraints of the Vela wearable runtime rather than for the appearance of architectural novelty. An abstraction is valuable only when it solves a concrete problem, protects an invariant, or makes ownership clearer. When a defect can be resolved by tightening a resource owner, correcting a data boundary, or changing one shape-specific Design Spec, the project avoids rewriting unrelated layers.

The project follows these principles:

- **Start from the real failure**: identify whether a problem belongs to layout, runtime behavior, a native capability, lifecycle ownership, persistence, or data provenance before choosing the fix.
- **Use the minimum sufficient abstraction**: long-lived layers must remove duplication, protect a contract, or clarify responsibility. Directory symmetry and version naming are not reasons for source migration.
- **Share semantics, design natively for shape**: business facts remain shared where possible, while Circle, Pill, and Rect may use different composition and interaction instead of being scaled copies.
- **Keep data provenance explicit**: system samples, deterministic estimates, compatibility values, and simulated transports are different kinds of evidence and must stay distinguishable in code and UI.
- **Treat lifecycle as product behavior**: health, location, sensor, timer, event, and haptic resources require a single owner and must start and stop with the corresponding product state.
- **Prefer runtime facts to static assumptions**: Node.js tests protect logic and architecture contracts; simulator and device evidence validate geometry, gestures, native features, and lifecycle behavior. Neither class of evidence replaces the other.
- **Evolve incrementally**: V2.5 improves the working V2.4 foundation by tightening boundaries and preserving lessons from real failures instead of making a broad rewrite the objective.
- **Document the current system**: maintained documentation describes behavior that can be supported by source, tests, or runtime evidence and avoids temporary phase narratives.

Together these principles aim for a codebase in which each change can be explained, verified, and extended safely despite constrained resources, materially different screen shapes, and uneven platform capability support.

## Developer-friendly workflow

Developer friendliness is treated as an architectural requirement rather than an extra layer of tooling. The source should make design intent understandable, editable, reviewable, and reversible without requiring every contributor to understand the whole runtime.

- **Readable sources of design intent**: layout decisions are concentrated under `src/v2/design` and `src/v2/design/apps/<app>/layout.js` instead of being duplicated across page code. A contributor should be able to see why a form factor is arranged the way it is.
- **Small changes produce small diffs**: shared values stay in the base configuration while Circle, Pill, and Rect keep only the deltas they need. Adjusting one form factor should not duplicate the full design or disturb unrelated targets.
- **Tooling shares runtime semantics**: Layout Studio reuses the project Scene and Adapter model instead of maintaining a browser-only layout system. Preview shortens the feedback loop without becoming a second source of truth.
- **Reuse before runtime expansion**: when existing primitives, Design Specs, and Design Views can express a new screen or watchface adjustment, contributors should not need to modify the generic runtime first. Lower layers are extended only when the current vocabulary is genuinely insufficient.
- **Fail early during development**: linting, design contracts, Studio checks, text-fit checks, and bundle audits are intended to expose mistakes before runtime rather than relying on silent correction or accidental discovery on device.
- **No hidden redesign at runtime**: safe-area logic, device profiles, and adapters may constrain valid geometry, but they should not silently turn an unsuitable design into a different composition. Material shape differences remain explicit in reviewable design sources.
- **Visual work stays separated from business semantics**: changing hierarchy, density, geometry, or one form factor should not require editing health, workout, or persistence logic; changing business semantics should not implicitly redesign the surface.
- **Reviewable and reversible by default**: a normal design adjustment should leave a clear source diff that can be reviewed and reverted with Git. Tool output must not introduce a second irreversible project format.

The goal is not to make the framework automatically decide more. The goal is to make the set of things a developer must understand and edit smaller, clearer, and closer to the intended product result. Automation removes repetition and catches errors; authors retain explicit ownership of design decisions.

## Vibe-coding-friendly workflow

The same V2.5 structure also lowers the cost of AI-assisted coding. Here, vibe coding does not mean allowing a model to bypass architecture or improvise directly in the runtime. It means making a controlled loop cheap: **describe intent → change a small, explicit design surface → preview with the same runtime semantics → run contract checks → review the Git diff → revert when needed**.

- **Low-context change surface**: many visual changes can stay inside `src/v2/design/apps/<app>/layout.js`, a Design Spec, or a Design View, so an AI assistant does not need to understand page lifecycle, health data, persistence, and native capability code at the same time.
- **Explicit, machine-readable structure**: named fields plus `base` and `circle` / `pill` / `rect` overrides expose the real control points. An AI assistant can make a local field change instead of guessing through a large page template or style block.
- **Bounded edits**: Layout Studio accepts only registered editable paths and supported scalar values. Unknown fields, unsupported value types, and non-finite numbers are rejected before write-back, reducing the space for arbitrary AI edits.
- **Preview and runtime share semantics**: Studio imports the project Scene and Adapter and previews the real `layout.js`. AI-assisted tuning therefore receives feedback from the same design-resolution path used by the application rather than from a separate mock layout engine.
- **Shape changes are naturally localized**: the Adapter resolves `base + current-shape override`, and Studio saves by rewriting only the active shape block. A Pill adjustment does not require copying the complete Circle or Rect design.
- **Contracts act as AI guardrails**: `npm run check`, design and interaction contracts, text-fit checks, and bundle audits provide executable counterexamples for AI-generated changes. Passing static checks is not device validation, but it catches deterministic failures before Vela Runtime testing.
- **Git diff is the review interface**: vibe-coding output remains ordinary source code and localized diffs. There is no hidden AI state or irreversible project format, so a human can review, select, edit, and revert every change.
- **Product truth cannot be bypassed**: vibe coding cannot promote simulated health values into real samples or skip lifecycle ownership, native capability boundaries, and device evidence. AI speeds implementation and exploration without changing the project's correctness invariants.

In this project, vibe-coding friendliness therefore means **making it easier for AI to make small, correct-layer, verifiable changes while humans retain ownership of product intent, truth boundaries, and final validation**. It is not a natural-language application generator, and it does not claim that AI can replace Vela Runtime or device testing.

## Capabilities

| Area | Implementation |
| --- | --- |
| Watchfaces | Multiple persisted faces with form-factor-specific compositions |
| Launcher | Honeycomb on Circle and Rect, vertical paged list on Pill |
| Health | Heart rate, SpO2, stress, source state, and real persisted history |
| Activity | Daily metrics, goals, and seven-day trends |
| Workout | Walk/run sessions, pause/resume, recovery, location distance, official heart rate, and history |
| Today | Date, calendar, and health summaries with shape-aware density |
| Notifications | Local call, message, and application-notification presentation paths |
| Sync | Business payloads, packet sequencing, ACK progress, and a replaceable transport boundary |
| Settings | Brightness, vibration, motion diagnostics, sync, and device information |
| Power | ACTIVE, DIM, SLEEP state handling and resource release |

`src/manifest.json` registers 20 application routes and declares the system capabilities used by the project.

## Architecture

```text
Vela Native APIs
      ↓
Capability Adapters
      ↓
Domain State and Persistence
      ↓
Feature Controllers
      ↓
Design Specs and Design Views
      ↓
Shape-aware Scene and Adapter
      ↓
Vela Pages
```

V2.5 keeps the existing `src/v2` namespace to avoid a cosmetic source migration. Native APIs live behind `src/capabilities`, domain facts and state machines live in `src/domain`, and the `src/v2` tree owns application runtime, features, design, and device profiles.

Business semantics are shared; shape-specific composition stays in the Design layer. Pages remain responsible for Vela lifecycle and event binding rather than duplicating business calculations.

See [Architecture](ARCHITECTURE.md).

## Shape-native design

V2.5 uses three design-freedom levels:

- **L1 Auto** for ordinary settings, lists, and straightforward controls.
- **L2 Assisted** for shared semantics that need different compositions on Circle, Pill, and Rect.
- **L3 Free** for watchfaces, honeycomb launchers, and other interaction-heavy surfaces.

A full Scene and safe semantic content are treated separately. Decorative layers may use the complete display while text, metrics, and controls remain chord-aware or gesture-aware.

See [Design System](DESIGN_SYSTEM.md).

## Engineering highlights

The project combines several ideas that are implemented in the repository rather than described only as concepts:

- one semantic application core with shape-native visual composition;
- explicit L1/L2/L3 design freedom instead of unlimited responsive exceptions;
- Design Specs for geometry and Design Views for display-ready semantics;
- a developer-friendly design workflow with centralized design sources, shape deltas, local diffs, and runtime-aligned visual tooling;
- a vibe-coding-friendly constrained iteration surface where AI-assisted design edits stay local, previewable, reviewable, and covered by repository contracts;
- a local Layout Studio that reuses project Scene and Adapter logic;
- provenance-aware health and workout heart-rate presentation;
- explicit ownership and release of health, sensor, location, timer, and event resources;
- quality gates for architecture, interaction, visual contracts, data truthfulness, persistence, power behavior, text fit, and page bundle size.

See [Innovations](INNOVATIONS.md).

## Getting started

Requirements:

- Node.js 18 or newer;
- npm;
- a compatible Xiaomi Vela Quick App development environment.

```bash
npm ci
npm run check
npm run build
```

Development mode:

```bash
npm run start
```

Release build:

```bash
npm run release
```

Layout tooling:

```bash
npm run studio
```

`npm run check` is a repository contract suite, not a replacement for simulator or device smoke testing. Gesture behavior, absolute geometry, native feature availability, and lifecycle-sensitive changes still require runtime validation.

## Repository structure

```text
src/
├── capabilities/       # Vela native capability adapters
├── domain/             # state, persistence, and domain state machines
├── v2/
│   ├── app/            # application runtime and navigation
│   ├── features/       # feature controllers
│   ├── design/         # Scene, Adapter, specs, views, and layouts
│   └── system/         # device profiles and system facade
├── pages/              # Vela pages and lifecycle binding
└── components/         # reusable components

tools/layout-studio/    # local visual layout tool
scripts/                # build and verification utilities
test/                   # contract and pure-logic tests
docs/                   # maintained project documentation
```

`src/common` and `src/presentation` still contain compatibility code or resources. New work should prefer the Capability → Domain → Feature → Design → Page dependency direction.

## Documentation

- [Architecture](ARCHITECTURE.md)
- [Design System](DESIGN_SYSTEM.md)
- [Innovations](INNOVATIONS.md)
- [Layout Studio](LAYOUT_STUDIO.md)
- [Workout and Sync](WORKOUT_AND_SYNC.md)
- [Compatibility](COMPATIBILITY.md)
- [Contributing](../CONTRIBUTING.md)

## License

Source code is distributed under the Apache License 2.0. See [LICENSE](../LICENSE) and [NOTICE](../NOTICE).
