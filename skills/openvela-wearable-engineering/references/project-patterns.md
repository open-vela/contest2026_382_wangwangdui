# Project Patterns from `vela_band`

These are project-local examples of reusable engineering patterns. Treat them as **examples of ownership and invariants**, not as APIs that every project must copy.

Repository paths are relative to `quickapp/velaclaw-aiot/`.

## 1. Shape-aware adapter that constrains instead of redesigning

**File**: `src/v2/design/adapter.js`

Useful pattern:

- shape selection is explicit;
- recipe selection is `base + current shape override`;
- adapter can clamp/safe-constrain geometry;
- adapter comments explicitly reject scanning for a “prettier” position or changing design proportions.

Why this matters:

A runtime adapter should protect physical constraints without becoming an invisible second designer. Important Circle/Pill/Rect differences remain reviewable in design source.

Generalize when:

- multiple shapes share semantic fields;
- a small set of safe geometric constraints can be centralized;
- designers/authors need predictable source-to-runtime mapping.

Do not generalize into a universal auto-layout engine for highly visual L3 surfaces.

## 2. Shape-local authoring and source rewrite

**File**: `tools/layout-studio/lib/recipe_file.js`

Useful pattern:

- `applyChanges(layout, shape, changes)` mutates only the selected shape object;
- source rewrite locates and replaces only the target shape block;
- output remains ordinary reviewable source code.

Why this matters:

AI-assisted or GUI-assisted design changes should produce local Git diffs. A Pill tweak should not rewrite Circle and Rect merely because a tool serialized the whole design tree.

Regression ideas:

- no-op import/export keeps semantic identity;
- editing Pill leaves Circle/Rect source blocks unchanged;
- unknown/non-scalar edits are rejected before write;
- preview resolution uses the same runtime design semantics.

## 3. Feature controller owns runtime resources; domain owns workout truth

**File**: `src/v2/features/workout/controller.js`

Useful pattern:

- imports a canonical workout state machine and repositories;
- controller owns timer, geolocation, heart-rate subscription, and runtime-active state;
- pause/finish/cancel/stop explicitly release resources;
- persistence is checkpointed instead of written every second;
- live heart rate is accepted only when sample provenance is live/valid;
- `lifecycleGeneration` rejects stale async persistence/hydration callbacks.

Why this matters:

The page does not become the workout engine. Semantic session state, persistence, and runtime native ownership remain separate but coordinated.

Generalize to:

- navigation-bound sensors;
- location tracking;
- audio sessions;
- sync flows;
- any feature with resumable semantic state plus disposable runtime resources.

## 4. Explicit power state machine

**File**: `src/domain/power/state_machine.js`

Useful pattern:

- `ACTIVE`, `DIM`, and `SLEEP` are mutually exclusive named states;
- transitions centralize idle-time policy;
- callers consume snapshots instead of maintaining several booleans.

Why this matters:

Power behavior can drive animation/subscription policy without every page inventing `isDim`, `isSleeping`, and timestamp rules independently.

Generalize when runtime policy depends on meaningful modes and transitions.

## 5. Mock transport declares itself as mock

**File**: `src/v2/features/sync/mock_transport.js`

Useful pattern:

```js
capability: function () { return { mode: 'mock', realBleAvailable: false } }
```

Why this matters:

Simulation is a legitimate engineering tool, but product truth must survive the abstraction. The transport interface can be replaceable without allowing UI/docs to misrepresent mock behavior as BLE hardware support.

Generalize to demo sensors, compatibility values, simulated network transports, and fixture playback.

## 6. Domain and repository separation

**Directories**:

- `src/domain/workout/`
- `src/domain/activity/`
- `src/domain/history/`
- `src/domain/settings/`
- `src/domain/power/`

Useful pattern:

Business facts and persistence live outside pages and outside shape-specific design. This allows multiple screens to read the same canonical data and lets UI changes evolve without rewriting storage semantics.

Generalize by ownership, not directory names. Another project may use `model/`, `store/`, or `repository/`; the important rule is one authoritative read/write path per business fact.

## 7. Design source separated from page implementation

**Examples**:

- `src/v2/design/apps/clock/layout.js`
- `src/v2/design/scene.js`
- `src/v2/design/adapter.js`
- design specs/views under `src/v2/design/`

Useful pattern:

High-frequency visual intent can change in design-layer source without moving health/workout/storage/native capability logic.

This is the preferred Vibe Coding change surface when existing design vocabulary already expresses the request.

## 8. Layout Studio shares project semantics

**Files**:

- `tools/layout-studio/server.js`
- `tools/layout-studio/lib/recipe_file.js`

Useful pattern:

A design tool should consume the same design source and Scene/Adapter semantics instead of inventing browser-only layout truth.

Important boundary:

Studio preview is still not the Vela Runtime. It shortens the loop and proves design-resolution/tooling behavior, while final geometry/gesture/native behavior still needs Vela runtime evidence.

## 9. Architecture and regression tests as executable ownership rules

**Examples under**: `test/`

Useful project-level checks include architecture dependencies, health/workout provenance, lifecycle ownership, text fit, geometry, bundle budgets, selector compatibility, persistence behavior, and tool semantics.

Pattern:

When a failure mode is deterministic from source or pure logic, encode it as a contract so future human/AI edits get immediate feedback.

Do not make a brittle test that freezes irrelevant implementation details merely to preserve the current code shape.

## 10. Incremental evolution rather than version-shaped rewrites

The project deliberately retains `src/v2/` while evolving V2.4 behavior into V2.5 documentation/engineering principles. Version naming alone is not a reason to migrate directories or create parallel architecture.

General rule:

Refactor when ownership, duplication, invariants, performance, or maintainability improve measurably—not to make source tree names match a marketing/version label.

## How to use these examples

When implementing a similar task:

1. identify the invariant demonstrated by the example;
2. inspect the current project for an existing equivalent owner;
3. reuse the pattern only if it solves the same ownership problem;
4. adapt naming and structure to the current project;
5. add a regression test for the invariant, not a snapshot of irrelevant implementation details.

Do not copy entire modules blindly.
