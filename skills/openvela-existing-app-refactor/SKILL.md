---
name: openvela-existing-app-refactor
description: Refactor an existing Xiaomi Vela JS / Quick App wearable application to the openvela wearable engineering standard while preserving behavior and, unless explicitly authorized, preserving the existing frontend appearance and interaction as closely as possible. Use when modernizing legacy Vela apps, consolidating state/storage, fixing lifecycle ownership, replacing unsupported APIs, reducing memory/build risk, migrating to Capability → Domain → Feature → Design → Page, or preparing an existing app for long-term maintenance. If visual redesign intent is not explicit, ask whether the user wants Preserve UI, Light Refresh, or Redesign; in non-interactive work default to Preserve UI.
---

# openvela Existing App Refactor

Refactor an existing product without confusing architectural cleanup with product redesign. The default objective is:

`same product behavior + same visible UI + safer internal architecture + better evidence`

Use the sibling `../openvela-wearable-engineering/SKILL.md` as the engineering standard. Reuse its API catalog, verification model, performance rules, and project patterns instead of creating competing rules.

## 0. Decide visual scope before editing

Determine whether visual redesign is authorized.

- If the user explicitly requests a redesign, enter **Redesign Mode**.
- If the user explicitly requests no redesign, enter **Preserve UI Mode**.
- If intent is unclear and interaction is possible, ask once:
  - **Preserve UI** — keep current appearance and interaction as close as possible;
  - **Light Refresh** — allow small polish that does not change information architecture or interaction model;
  - **Redesign** — allow shape-native recomposition and visual direction changes.
- If work must proceed without an answer, default to **Preserve UI Mode**.

Record the selected mode in the refactor plan. Never infer redesign permission from words such as “modernize”, “clean up”, “restructure”, or “refactor”.

## 1. Capture the existing product before changing it

Treat the existing application as evidence, not as disposable legacy code.

Inspect:

- `src/manifest.json`, package/build metadata, routes, device profiles, API level;
- pages, components, styles, assets, icons, copy, navigation and gestures;
- current state machines, stores, repositories, caches and persistence keys;
- native modules, permissions, capability wrappers and lifecycle ownership;
- timers, sensors, health/location/event subscriptions and haptics;
- tests, build scripts, bundle budgets, simulator/device procedures;
- recent Git history for regression-sensitive behavior.

Run when available:

```bash
node skills/openvela-existing-app-refactor/scripts/inventory-existing-app.mjs <project-root>
node skills/openvela-wearable-engineering/scripts/audit-quickapp.mjs <project-root>
```

Before a non-trivial refactor, create a preservation contract from `references/preservation-contract.md`.

## 2. Discover before inventing

Use:

`discover → map ownership → reuse → consolidate → extend → create`

Do not introduce a new store, state machine, repository, adapter, renderer, layout engine, or service wrapper until existing ownership has been identified.

When multiple implementations own the same fact, choose one canonical owner and migrate callers incrementally. Do not create a third abstraction merely to bridge two duplicates.

## 3. Classify each concern into the target architecture

Migrate toward:

`Capability → Domain → Feature → Design → Page`

- **Capability** — official native API boundary, normalization, availability and failure isolation.
- **Domain** — canonical business state, state machine, persistence schema and deterministic rules.
- **Feature** — runtime orchestration and lifecycle/resource ownership.
- **Design** — semantic projection, shape-native composition, layout recipes and display metadata.
- **Page** — thin lifecycle/event binding and rendering surface.

Move code only when ownership becomes clearer. Directory symmetry alone is not a refactor goal.

## 4. Refactor in evidence-preserving stages

Prefer several reviewable migrations over a rewrite.

1. **Baseline** — record current routes, behaviors, UI contract, build result and known failures.
2. **Platform legality** — replace or isolate unsupported APIs/selectors and align manifest/API level.
3. **Canonical state/data** — merge duplicate stores, page-local business truth and redundant persistence paths.
4. **Lifecycle ownership** — give every timer/subscription/native resource one owner and explicit release path.
5. **Presentation ownership** — move business calculations out of pages without changing the rendered contract.
6. **Shape/design ownership** — make Circle/Pill/Rect intent explicit while preserving the chosen visual scope.
7. **Memory/build cleanup** — remove proven redundant allocations, writes, listeners, startup work and build hazards.
8. **Optional redesign** — only after the internal baseline is stable and only within the authorized visual mode.

Read `references/migration-playbook.md` before large migrations.

## 5. Preserve UI Mode is a hard constraint

When Preserve UI Mode is selected:

- preserve route structure unless a route is objectively dead or broken;
- preserve visible copy, icons, assets, color roles, typography hierarchy and control order;
- preserve component geometry, spacing, alignment, scroll behavior, gestures and navigation semantics as closely as runtime correctness allows;
- preserve Circle/Pill/Rect differences already visible to the user;
- do not “improve” density, spacing, colors, radius, typography or composition merely because a new design system exists;
- do not replace a distinctive screen with a generic card/list layout;
- do not normalize working shape-specific layout into one scaled layout;
- treat CSS/template rewrites as risky because equivalent-looking source can render differently on Vela.

Internal refactoring may change DOM/template structure only when necessary. When it does, compare the resulting rendered contract against the baseline.

If exact preservation conflicts with an unsupported Vela API, broken geometry, inaccessible control, data-truth violation, or lifecycle correctness, fix correctness first and explicitly report the visible delta.

## 6. Light Refresh and Redesign Mode

**Light Refresh** may adjust polish without changing information architecture, feature hierarchy, primary gestures, navigation model, or user task flow.

**Redesign** may recompose surfaces using the sibling engineering skill’s L1/L2/L3 shape-native model. Even in Redesign Mode, preserve business behavior and data truth unless the user separately authorizes product behavior changes.

Do not mix a broad redesign into an architecture migration commit when the changes can be separated.

## 7. State and persistence migration rules

For every mutable fact, classify it as:

- persistent truth;
- runtime truth;
- derived view state.

Prefer existing state machines over parallel booleans. Prefer one canonical repository/store over page-local storage access. Migrate keys/schema deliberately; preserve user data when feasible. Serialize overlapping writes and guard stale async hydration callbacks.

Never persist transient connection/subscription state merely to make pages easier to render.

## 8. Runtime resource migration rules

For sensors, health, location, system events, timers and haptics:

- identify the current owner;
- identify every acquire/start/subscribe path;
- identify every pause/hide/finish/destroy/replacement path;
- consolidate duplicate owners;
- prevent late callbacks from reviving stale flows;
- verify pause/resume and recovery behavior.

A resource-ownership refactor is incomplete until release behavior is proven.

## 9. Keep the refactor reversible

Change one architectural axis at a time when possible. Review the Git diff after every stage.

Avoid:

- mass rename + state rewrite + redesign in one step;
- mechanical file moves with hidden semantic changes;
- “clean architecture” layers that only forward calls;
- deleting compatibility behavior before the replacement is proven;
- replacing known working code with fashionable patterns without a concrete invariant benefit.

Prefer temporary adapters only when they enable a safe staged migration and have a clear removal point.

## 10. Validate equivalence and improvement separately

A refactor needs two kinds of evidence:

**Equivalence evidence**
- existing user flows still work;
- UI preservation contract still holds for the selected mode;
- persisted data remains readable or is intentionally migrated;
- navigation, gestures and shape-specific behavior remain correct.

**Engineering improvement evidence**
- fewer owners/sources of truth;
- legal API and manifest usage;
- deterministic lifecycle release;
- reduced duplicate allocations/writes/subscriptions;
- clearer architecture contracts;
- build/JSC/RPK and relevant bundle checks pass.

Static tests do not prove visual equivalence. Preview tools do not prove device behavior.

## Hard invariants

- Do not redesign without explicit authorization; default to preservation when uncertain.
- Do not rewrite a working frontend merely to match a preferred component vocabulary.
- Do not create a second source of truth during migration without a bounded transition plan.
- Do not promote mock, fallback, compatibility or estimated values to real device data.
- Do not leave old and new lifecycle owners active simultaneously.
- Do not delete user data or change persistence schema silently.
- Do not claim a refactor is behavior-preserving without evidence appropriate to the changed layer.
- Do not turn a refactor into a full rewrite unless incremental migration is demonstrably unsafe or impossible.

## References

- UI/interaction baseline: `references/preservation-contract.md`
- Staged architecture migration: `references/migration-playbook.md`
- Patterns grounded in `vela_band`: `references/project-refactor-patterns.md`
- General engineering standard: `../openvela-wearable-engineering/SKILL.md`

## Deterministic inventory

Run:

```bash
node skills/openvela-existing-app-refactor/scripts/inventory-existing-app.mjs <project-root>
```

Use the inventory to discover the current system. It is not permission to refactor every reported file.
