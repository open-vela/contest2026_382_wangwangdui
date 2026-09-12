---
name: openvela-wearable-engineering
description: Build, review, debug, and optimize Xiaomi Vela JS / Quick App wearable applications with shape-native Circle/Pill/Rect design, official API constraints, canonical state and persistence, lifecycle ownership, memory/performance discipline, build/runtime diagnosis, and evidence-based validation. Use for wearable UI/UX, native capability integration, state machines, storage, health/workout flows, multi-screen adaptation, Layout Studio-style tooling, performance work, build failures, simulator/device regressions, or Vela code audits.
---

# openvela Wearable Engineering

Treat a wearable application as a constrained product system, not a small web page. Preserve four kinds of truth:

1. **Platform truth** — current official Vela documentation, runtime behavior, manifest declarations, API level, and device support.
2. **Business truth** — canonical domain state, state machines, repositories/stores, and persistence schemas.
3. **Design truth** — explicit design specifications and shape-specific layout intent.
4. **Verification truth** — the strongest evidence actually collected: static contracts, build output, simulator behavior, or device behavior.

Do not let page-local state, preview tools, mock data, or generic web assumptions silently replace any of these truths.

## Workflow

### 1. Discover before changing

Inspect the project before proposing architecture or code:

- `src/manifest.json`, package metadata, build scripts, and target device profiles;
- existing capabilities/adapters for native APIs;
- domain state machines, repositories, stores, persistence schemas, and migrations;
- feature controllers and lifecycle owners;
- design specs, layout recipes, shape overrides, views, and shared primitives;
- tests, lint rules, bundle budgets, simulator scripts, and CI gates;
- current Git diff and recent relevant history when debugging a regression.

Prefer `discover → reuse → extend → create`. Do not create a parallel state machine, storage layer, adapter, renderer, or layout system when an existing one owns the same concern.

### 2. Classify the change

Identify the primary layer before editing:

`Capability → Domain → Feature → Design → Page`

Keep pages thin. Put native API boundaries in Capability, device-independent business facts in Domain, runtime ownership in Feature, composition/geometry/display semantics in Design, and lifecycle/event binding in Page.

For visual work, classify design freedom:

- **L1 Auto** — conventional controls/lists/settings; reuse adaptive primitives.
- **L2 Assisted** — shared semantics with shape-native composition, such as health, trends, workout, or summaries.
- **L3 Free** — highly visual or interaction-specific surfaces such as watchfaces or honeycomb launchers.

Read `references/wearable-design.md` before non-trivial visual changes.

### 3. Verify platform legality before using an API or syntax

For unfamiliar native modules, APIs, permissions, CSS selectors, lifecycle hooks, or manifest fields, verify them against current official Xiaomi Vela JS documentation. Never infer support from browsers, Node.js, React, Vue, standard CSS, or another Quick App implementation.

Every imported `@system.*`, `@service.*`, or other native feature must have the required manifest declaration and permissions. Treat device support tables and API levels as runtime constraints, not documentation trivia.

Read `references/sources-and-api-boundary.md`. Run `node skills/openvela-wearable-engineering/scripts/audit-quickapp.mjs <project-root>` when applicable.

### 4. Preserve canonical state and data ownership

Before adding a field, ask which category it belongs to:

- **persistent truth** — survives restart and belongs to a repository/store;
- **runtime truth** — current connection/subscription/session/lifecycle state and usually must not be persisted;
- **derived view state** — reproducible projection for rendering and should not become a second source of truth.

Extend existing state machines instead of adding parallel booleans. Read and write a business fact through its canonical repository/store. Serialize read-modify-write operations when races are possible. Version or invalidate asynchronous callbacks so stale results cannot update hidden/destroyed/replaced flows.

Read `references/architecture-state-data.md`.

### 5. Design for the physical shape

Share semantics, not necessarily composition. Circle, Pill, and Rect may require different hierarchy, density, geometry, and gestures.

Start from the product purpose and information priority, then choose a deliberate visual direction. Borrow platform-independent aesthetic principles—clear hierarchy, intentional typography, restrained palette, coherent spacing, meaningful feedback—from mature frontend design practice, but translate them to wearable constraints.

Do not force a visually specialized surface through uniform scaling. Do not let a runtime adapter secretly redesign an unsuitable layout. Material shape differences must remain explicit and reviewable.

Read `references/wearable-design.md` and `references/project-patterns.md`.

### 6. Make the smallest correct-layer change

Prefer a local design/config/spec change when existing vocabulary is sufficient. Modify generic renderers, native capability layers, or architecture only when the current abstraction cannot express the requirement safely.

For AI-assisted or vibe-coding workflows, optimize for:

`intent → small explicit edit → same-semantics preview → contract checks → Git diff review → runtime evidence`

A design change should produce a design-layer diff; a storage change should not casually restyle pages; a Pill adjustment should not rewrite Circle and Rect unless the shared base is genuinely wrong.

### 7. Budget memory, CPU, IO, and subscriptions

Wearable performance is a design constraint. Review:

- view-model/observer data that does not need binding;
- repeated array/object copies and per-tick allocations;
- static geometry recreated on every render/tick;
- timers, sensor subscriptions, geolocation, health listeners, and event listeners;
- persistence frequency and duplicate writes;
- image/font/bundle size and page startup work;
- work that continues after `onHide`, pause, finish, DIM, or SLEEP.

Read `references/performance-memory.md` before performance-sensitive work.

### 8. Diagnose the complete build/runtime chain

A passing Node test does not prove a Vela runtime path. A generated RPK does not prove the simulator launched that RPK. Diagnose failures by layer:

`source → Vela parser/runtime subset → bundler → JSC → RPK → install → launcher/package → route/page → native capability`

Read `references/build-runtime.md` for the diagnostic tree.

### 9. Validate with the right evidence

Use the weakest sufficient test early, then the strongest necessary evidence before making a claim:

- static tests/contracts: pure logic, architecture, source constraints;
- build/JSC/bundle checks: packaging and size constraints;
- shared-semantics preview tools: design resolution only;
- simulator: geometry, gestures, navigation, many runtime behaviors;
- physical device: hardware capability, power, sensors, product-specific behavior.

Do not claim device behavior from static tests or a browser preview. Read `references/verification.md`.

### 10. Review the diff and invariants

Before finishing, inspect the Git diff and ask:

- Did the change stay in the correct ownership layer?
- Did it introduce a second source of truth?
- Did it add an unverified API, selector, permission, or runtime assumption?
- Are native resources acquired and released by one owner?
- Are mock/estimate/compatibility values clearly distinct from real device data?
- Did a shape-specific change remain shape-specific?
- Did memory, bundle, or startup cost regress without reason?
- Which conclusions are proven only statically, and which were proven in simulator/device runtime?

Use `references/failure-playbook.md` when a symptom resembles a known regression class.

## Hard invariants

- Never present simulated, compatibility, or estimated health/device data as a real system sample.
- Never describe a mock transport as real BLE or hardware connectivity.
- Never invent a Vela API, CSS feature, lifecycle hook, manifest field, or device capability.
- Never create a second persistence/state owner for an already-owned business fact merely for page convenience.
- Never leave sensors, location, health subscriptions, timers, listeners, or haptics without an explicit lifecycle owner and release path.
- Never treat static checks, preview tools, simulator evidence, and physical-device evidence as interchangeable.
- Never perform a broad rewrite solely for directory symmetry, version naming, or aesthetic uniformity.

## Reference map

Read only what the task needs:

- Official-source hierarchy and API legality: `references/sources-and-api-boundary.md`
- Shape-native visual design and aesthetics: `references/wearable-design.md`
- State machines, canonical storage, hydration, lifecycle ownership: `references/architecture-state-data.md`
- Memory, CPU, IO, bundle, and startup discipline: `references/performance-memory.md`
- Build/JSC/RPK/install/runtime diagnosis: `references/build-runtime.md`
- Known failure signatures and safe diagnosis: `references/failure-playbook.md`
- Evidence classes and verification matrix: `references/verification.md`
- Proven patterns from `vela_band`: `references/project-patterns.md`

## Deterministic audit

Run:

```bash
node skills/openvela-wearable-engineering/scripts/audit-quickapp.mjs <project-root>
```

Use its findings as guardrails, not as a substitute for build, simulator, or device validation.
