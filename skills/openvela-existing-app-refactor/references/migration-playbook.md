# Migration Playbook

Refactor existing Vela software incrementally. Preserve working product behavior while moving ownership toward the engineering standard.

## Phase A — Baseline and inventory

Before moving files, identify:

- current routes and page entry points;
- all native imports and manifest declarations;
- all storage keys and persistence helpers;
- state machines, stores, repositories and page-local mutable state;
- timers and subscriptions;
- design/layout sources and shape-specific branches;
- tests, build scripts and known runtime defects.

Do not edit architecture until the current ownership map is understandable.

## Phase B — Platform boundary

Goal: one legal boundary for each native capability.

Move scattered `@system.*` / `@service.*` calls behind capability wrappers when useful. Keep wrappers narrow:

- normalize input/output;
- expose availability;
- isolate documented failure behavior;
- centralize subscription fan-out only when multiple consumers exist;
- do not invent platform methods.

Preserve current page behavior while changing the call path.

## Phase C — Canonical state

Goal: each business fact has one owner.

Typical legacy smell:

- page has `isRunning`;
- controller has another `running` flag;
- persisted object has `status`;
- resume path reconstructs a fourth interpretation.

Migration:

1. choose the canonical state machine/domain model;
2. make old readers consume it;
3. route writes through it;
4. remove redundant flags only after callers migrate;
5. add regression contracts for transitions.

Do not migrate by introducing a new global store unless it genuinely replaces existing owners.

## Phase D — Canonical persistence

Goal: one repository/store per persistent business fact.

Inventory all keys first. Preserve old data when feasible.

Migrate in this order:

1. centralize read normalization;
2. centralize write serialization;
3. keep compatibility reads for old schema when required;
4. migrate callers;
5. remove direct page storage access;
6. remove old keys only with an explicit data policy.

Do not persist runtime-only truth such as live connection state, listener presence or page visibility.

## Phase E — Lifecycle/resource ownership

Goal: one runtime owner per sensor/timer/subscription flow.

For each resource, produce a table:

| Resource | Acquire | Owner | Pause/Hide | Finish/Destroy | Late callback guard |
| --- | --- | --- | --- | --- | --- |

Then consolidate duplicated owners. Use generation/token guards when asynchronous completion can arrive after the flow has been superseded.

## Phase F — Presentation separation without redesign

When Preserve UI is active:

- first move calculations/formatting/metadata out of pages;
- keep the rendered structure and dimensions stable;
- introduce Design View/Spec only where it clarifies ownership;
- preserve shape-specific intent;
- do not force old specialized pages into a generic component merely to reduce file count.

A successful presentation refactor may leave the `.ux` visually almost unchanged while changing where its data comes from.

## Phase G — Shape architecture

Consolidate only semantics that are truly common.

Prefer:

- shared semantic view model;
- shared base tokens for genuinely common values;
- explicit Circle/Pill/Rect deltas;
- shape-native composition for material differences.

Avoid converting three intentional layouts into one scale transform.

## Phase H — Memory and IO

After ownership is stable, optimize proven waste:

- reuse static geometry;
- avoid redundant snapshot copies;
- deduplicate unchanged persisted payloads;
- reduce listener/timer duplication;
- stop work when page/session/power state no longer requires it;
- keep bundle auditing separate from JSC build when that makes the chain more deterministic.

Measure or write a contract before making an optimization that changes behavior.

## Phase I — Build and runtime chain

Validate in layers:

`source → contract tests → bundler → JSC → RPK → install → launcher → route → simulator/device`

A failure late in the chain is not evidence that earlier architecture needs rewriting.

## Commit strategy

Prefer commits that each answer one question:

- `refactor: centralize workout state transitions`
- `fix: release health subscription on hidden lifecycle`
- `refactor: route activity persistence through repository`
- `perf: reuse static analog geometry`
- `fix: align manifest API level with system event usage`

Avoid a single commit that simultaneously moves all files, renames every layer, redesigns UI and rewrites persistence.

## Stop conditions

Pause the migration when:

- baseline behavior cannot be established;
- user data migration is uncertain;
- a required API is not verified;
- simulator/device behavior contradicts static assumptions;
- preserving UI requires a runtime-specific decision that cannot be inferred safely.

Report the blocker instead of filling the gap with a guess.
