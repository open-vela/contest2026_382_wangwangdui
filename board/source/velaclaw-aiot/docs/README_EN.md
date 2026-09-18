# vela_band

**English** | [简体中文](../README.md)

`vela_band` is a Xiaomi Vela Quick App reference project for smart bands and watches. The current implementation is built around the **V2 Design Engine + Capability Runtime** and supports pill, circular, and rectangular wearable form factors in one RPK.

> This project is intended for contest demos, architecture validation, and wearable UI exploration. It is not medical software or production firmware. When a health capability is unavailable, the app may fall back to clearly labelled demo data.

The frozen checkpoint before the next feature/UX phase is documented in [V2 Stable Baseline](STABLE_BASELINE_V2.md).

## Current capabilities

| Area | Current implementation |
| --- | --- |
| Watchfaces | Multiple faces, persistence, circular mechanical face, pill Alpine face, selector |
| Launcher | Circle honeycomb, pill paged list, rectangular grid |
| Health | Heart rate, SpO2, stress, window trends and capability fallback |
| History | Seven-day trends with shape-specific L2 compositions |
| Workout | Walk/run, pause/resume, workout history, location when available |
| Today | Date, lunar calendar, health summary and circular month calendar |
| Notifications | Local/event-based call, SMS and app notification demos |
| Sync | Protocol, chunking, ACK, progress and mock transport |
| Power | ACTIVE / DIM / SLEEP and raise-to-wake demo |
| Settings | Sync, vibration, brightness, motion diagnostics, device diagnostics and paging |

## Requirements

- Node.js 18+
- npm
- AIoT-IDE or compatible Vela Quick App tooling
- A compatible Vela emulator/device

## Quick start

```bash
npm ci
npm run check
npm run build
```

The default debug artifact is:

```text
dist/com.application.watch.demo.debug.1.0.0.rpk
```

Development watch mode:

```bash
npm run start
```

See [Compatibility](COMPATIBILITY.md) for emulator and capability differences.

## V2 architecture

```text
Vela Native APIs
      ↓
Capability Runtime
      ↓
Domain / State Machines
      ↓
V2 Feature Controllers
      ↓
V2 Design Specs + Design Views
      ↓
Full-bleed Design Scene
      ↓
Pages
```

Key source directories:

```text
src/
├── capabilities/          # Native Vela capability gateways
├── domain/                # Business state, persistence and state machines
├── v2/
│   ├── app/               # Page runtime, navigation and routes
│   ├── features/          # Application-level controllers
│   ├── design/            # Scene, geometry, specs, views and engines
│   └── system/            # Device profile and system facade
├── components/watchfaces/
└── pages/
```

Legacy/reference directories such as `src/common` and the earlier `src/presentation` tree may remain for project history, compatibility references, or assets. New V2 pages must not reintroduce legacy common code-module dependencies.

Normative documents:

- [V2 Stable Architecture](REWRITE_V2_ARCHITECTURE.md)
- [Wearable Design Engine](DESIGN_ENGINE.md)
- [V2 Stable Baseline](STABLE_BASELINE_V2.md)
- [Compatibility](COMPATIBILITY.md)

## Design Freedom

V2 uses three design freedom levels:

- **L1 Auto** — ordinary settings, details and paged lists;
- **L2 Assisted** — health, history and workout surfaces that share semantics but benefit from shape-specific composition;
- **L3 Free** — watchfaces, honeycomb launchers and strongly art-directed surfaces.

The stable shape language is:

- **Circle** — use the circular canvas and chord-aware placement rather than shrinking the entire page into a small inscribed rectangle;
- **Pill** — use the long vertical axis and horizontal comparisons where narrow seven-column charts become cramped;
- **Rect** — use wider dashboard/grid compositions.

History is the reference L2 example: Circle uses compact tracked bars, Pill uses a vertical comparative trend with full numeric values, and Rect uses a dashboard.

## Full-bleed Scene and safe content

The stable V2 contract separates scene coverage from foreground safety:

1. The Design Scene starts at `(0, 0)` and covers the complete logical/physical projection.
2. Background/watchface layers may render full-bleed.
3. Safe geometry controls semantic content placement; it does not crop the whole page.
4. Circular pages use chord-aware geometry.
5. Full-page wrappers with absolutely positioned children must still have explicit scene dimensions to avoid zero-height black screens on Vela.

## Interaction contract

Clock is the single owner of watchface navigation gestures. Native swipe and a raw-touch compatibility fallback may coexist only under that same owner when required by beta runtimes. Nested components must not create competing navigation owners.

Settings supports both left/right swipe and visible paging arrows; both inputs update the same page state.

## Lifecycle contract

Resource lifetime is part of the stable product behavior:

- health subscriptions stay active only while needed;
- pausing a workout releases its 1 Hz tick and location resources;
- hidden/destroyed pages stop transient listeners and timers;
- sleep may suspend expensive live capabilities and restore them after wake.

Visual redesigns must preserve these guarantees.

## Quality gate

`npm run check` currently runs lint plus V2 scene, architecture, runtime, visual, interaction and Design View contracts, followed by capability, power, health, activity, settings, motion, haptics, calendar, analog, honeycomb and documentation checks.

Changes to Scene geometry, gesture ownership, absolute layout, watchfaces or form-factor-specific compositions still require simulator/device smoke testing even after static checks pass.

## Stable checkpoint and next phase

The baseline recorded on 2026-09-04 passed the complete local project check and the key pill/circle/rect interaction smoke tests according to the project maintainer. It is intended to be merged to the default branch as the recovery point before the next feature/UX phase.

The next planned phase is **L2 Design System v2.1**: consolidate proven Circle/Pill/Rect patterns into reusable design primitives without reopening a broad Host Scene/Runtime rewrite.
