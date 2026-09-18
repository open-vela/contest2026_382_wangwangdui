---
name: openvela-wearable-engineering
description: Build, review, debug, and optimize Xiaomi Vela JS / Quick App wearable applications with mandatory L1/L2/L3 design classification, unique app identity/icon registration, shape-native Circle/Pill/Rect geometry contracts, official API constraints, canonical state and persistence, lifecycle ownership, memory/performance discipline, build/runtime diagnosis, and evidence-based validation.
---

# openvela Wearable Engineering

Treat a wearable application as a constrained product system. Preserve platform truth, business truth, design truth, and verification truth.

## Mandatory UI gates

These are hard preconditions, not optional reasoning suggestions. A weaker model must not skip them.

### Gate 0 — classify L1/L2/L3 before UI code

Before creating or materially changing UI, write `<project-root>/docs/design-intent.json` with `level` exactly `L1`, `L2`, or `L3`, a concrete rationale, shared semantics, and explicit Circle/Pill/Rect strategies.

- **L1 Auto** — conventional controls/lists/settings using adaptive primitives.
- **L2 Assisted** — shared semantics with shape-native composition.
- **L3 Free** — highly visual or interaction-specific surfaces.

Never silently default an unclassified UI to L1. Run `node skills/openvela-wearable-engineering/scripts/audit-ui-work.mjs <project-root>` before implementation; if it fails, stop UI work.

### Gate 1 — every new app gets its own icon and identity

Every new app must have a unique package/name/entry and an authored `design-assets/app-icon.svg`. SVG is the design source; rasterize it to a **192×192 PNG** for Vela runtime and point `manifest.icon` to that PNG. Do not use SVG directly as the runtime manifest icon.

The UI-work audit fails if identity, SVG source, PNG file, 192×192 dimensions, or manifest registration is missing.

### Gate 2 — geometry for every route × every morphology

Every written screen must be audited, not only the home screen. Provide `<project-root>/test/ui_geometry_contract.js` listing supported profiles and geometry for every manifest route × profile. Circle, Pill, and Rect must each be represented when supported.

Audit leaf controls as well as parent containers: labels, values, buttons, hit targets, fixed footers and scroll viewports. On Circle, fixed visible rectangles must fit the chord across their own vertical band.

Run `node skills/openvela-wearable-engineering/scripts/audit-ui-work.mjs <project-root>`. A missing route/profile or out-of-bounds/chord-crossing rectangle fails the gate. Then verify rendered geometry in simulator/device; static geometry is necessary but not equivalent to runtime evidence.

## Engineering workflow

1. **Discover first** — inspect manifest/build metadata, capability wrappers, state machines, repositories/stores, lifecycle owners, design/layout sources, tests and relevant Git history. Prefer `discover → reuse → extend → create`.
2. **Classify ownership** — use `Capability → Domain → Feature → Design → Page`. Pages bind lifecycle/events; they do not become a second business/state owner.
3. **Verify platform legality** — unfamiliar APIs, permissions, CSS, lifecycle hooks and manifest fields must be checked against current Vela evidence. Run `audit-quickapp.mjs` when applicable.
4. **Preserve canonical state/data** — distinguish persistent truth, runtime truth and derived view state. Extend existing state machines; centralize persistence; reject stale async callbacks.
5. **Design for physical shape** — share semantics, not necessarily composition. Circle/Pill/Rect may differ materially. Do not force specialized screens through uniform scaling.
6. **Change the smallest correct layer** — use `intent → design-level gate → small edit → geometry gate → contracts → Git diff → runtime evidence`.
7. **Budget resources** — review per-tick allocations, static geometry recreation, timers/subscriptions, persistence frequency, images/fonts/bundle size, startup work and work continuing after hide/pause/DIM/SLEEP.
8. **Diagnose the full chain** — `source → parser/runtime subset → bundler → JSC → RPK → install → launcher/package → route → native capability`.
9. **Validate with matching evidence** — static tests prove contracts; simulator proves rendered geometry/gestures; device proves hardware/native behavior.
10. **Review the diff** — confirm correct ownership, no second truth source, no invented API, one resource owner, provenance boundaries, and route/profile geometry coverage.

## Hard invariants

- Never skip L1/L2/L3 classification for UI work.
- Never ship a new app without an authored SVG icon source and valid 192×192 runtime PNG icon.
- Never treat one screen or one shape as proof that all screens/shapes fit.
- Never accept parent-container geometry as proof that descendant controls fit.
- Never present simulated/compatibility/estimated device data as real.
- Never invent a Vela API, CSS feature, lifecycle hook, manifest field or device capability.
- Never create a second persistence/state owner for page convenience.
- Never leave native resources without explicit lifecycle ownership/release.
- Never treat static, preview, simulator and device evidence as interchangeable.

## References

- `references/sources-and-api-boundary.md`
- `references/vela-api-catalog.json`
- `references/wearable-design.md`
- `references/architecture-state-data.md`
- `references/performance-memory.md`
- `references/build-runtime.md`
- `references/failure-playbook.md`
- `references/verification.md`
- `references/project-patterns.md`

## Required checks

```bash
node skills/openvela-wearable-engineering/scripts/audit-ui-work.mjs <project-root>
node skills/openvela-wearable-engineering/scripts/audit-quickapp.mjs <project-root>
node skills/openvela-wearable-engineering/scripts/test-ui-work.mjs
node skills/openvela-wearable-engineering/scripts/test-audit.mjs
node skills/validate-skill-suite.mjs
```
