---
name: openvela-existing-app-refactor
description: Refactor an existing Xiaomi Vela JS / Quick App wearable application to the openvela wearable engineering standard while preserving behavior and, unless explicitly authorized, preserving the existing frontend appearance and interaction as closely as possible. Use when modernizing legacy Vela apps, consolidating state/storage, fixing lifecycle ownership, replacing unsupported APIs, reducing memory/build risk, migrating to Capability → Domain → Feature → Design → Page, or preparing an existing app for long-term maintenance. If visual redesign intent is not explicit, ask whether the user wants Preserve UI, Light Refresh, or Redesign; in non-interactive work default to Preserve UI.
---

# openvela Existing App Refactor

Refactor an existing product without confusing architectural cleanup with product redesign. Target:

`same product behavior + authorized visual scope + safer internal architecture + stronger evidence`

Use sibling `../openvela-wearable-engineering/SKILL.md` as the engineering standard. Reuse its API catalog, verification model, performance rules and project patterns instead of creating competing rules.

## 0. Decide visual scope before editing

Select exactly one mode before non-trivial edits:

- **Preserve UI** — keep current appearance and interaction as close as runtime correctness allows.
- **Light Refresh** — allow small polish without changing information architecture, primary interaction or task flow.
- **Redesign** — allow shape-native recomposition and a new visual direction.

If the user explicitly chose a mode, do not ask again. If intent is unclear and interaction is possible, ask once. If work must proceed without an answer, default to Preserve UI. Never infer redesign permission from “refactor”, “modernize”, “clean up”, “optimize”, or “restructure”.

Record the selected mode in the refactor plan and final evidence report.

## 1. Capture the existing product

Treat the existing app as evidence, not disposable legacy code. Inspect:

- manifest, routes, package/build metadata, API level and target profiles;
- pages, components, styles, assets, copy, navigation, gestures and shape-specific behavior;
- state machines, page-local business state, repositories, stores, caches and persistence keys;
- native modules, permissions, wrappers and lifecycle owners;
- timers, sensors, health/location/event subscriptions and haptics;
- tests, build/JSC/RPK scripts, bundle budgets and simulator/device procedures;
- recent Git history when behavior is regression-sensitive.

Run:

```bash
node skills/openvela-existing-app-refactor/scripts/inventory-existing-app.mjs <project-root>
node skills/openvela-wearable-engineering/scripts/audit-quickapp.mjs <project-root>
```

For Preserve UI or Light Refresh, capture a static preservation baseline before editing:

```bash
node skills/openvela-existing-app-refactor/scripts/capture-preservation-baseline.mjs \
  <project-root> --out <temporary-baseline.json>
```

Keep the baseline outside production source unless the project intentionally versions regression fixtures. Read `references/preservation-contract.md`.

## 2. Discover before inventing

Use:

`discover → map ownership → reuse → consolidate → extend → create`

Do not add a store, state machine, repository, adapter, renderer, layout engine or native wrapper until existing ownership is mapped. When two owners already exist, select one canonical destination and migrate callers incrementally; do not create a third abstraction just to bridge duplication.

## 3. Classify target ownership

Migrate toward:

`Capability → Domain → Feature → Design → Page`

- **Capability** — official native API boundary, availability, normalization and failure isolation.
- **Domain** — canonical business facts, state machines, deterministic rules and persistence schema.
- **Feature** — runtime orchestration and resource/lifecycle ownership.
- **Design** — semantic projection, shape-native composition, recipes and display metadata.
- **Page** — thin lifecycle/event binding and rendering.

Move code only when responsibility becomes clearer. Directory symmetry alone is not a refactor goal.

## 4. Refactor in evidence-preserving stages

Prefer reviewable migrations over rewrite:

1. **Baseline** — behavior, routes, UI contract, storage compatibility, build result and known defects.
2. **Platform legality** — APIs, selectors, permissions, manifest declarations and API level.
3. **Canonical state** — remove parallel booleans/business truth.
4. **Canonical persistence** — centralize reads/writes and preserve schema compatibility.
5. **Lifecycle ownership** — one owner for each timer/subscription/native resource.
6. **Presentation ownership** — move calculations out of pages without unauthorized visual change.
7. **Shape/design ownership** — make Circle/Pill/Rect intent explicit without flattening valid differences.
8. **Memory/build cleanup** — optimize proven waste and build-chain hazards.
9. **Optional visual work** — only within the authorized mode.

Read `references/migration-playbook.md` before large migrations.

## 5. Preserve UI is a hard constraint

In Preserve UI mode, preserve unless correctness requires otherwise:

- route/task flow and navigation result;
- visible copy, icons, images and assets;
- information hierarchy and control order;
- color roles, typography hierarchy, geometry, spacing and alignment;
- scroll/paging behavior, gestures and hit targets;
- loading/empty/error/disabled states;
- existing Circle/Pill/Rect distinctions.

Do not “improve” spacing, colors, radius, typography, density or composition merely because a newer design system exists. Do not replace distinctive screens with generic cards/lists. Do not normalize working shape-native layouts into one scaled layout.

Classify suspicious existing behavior as `intent`, `constraint`, `defect`, or `unknown`. Do not preserve obvious defects such as black bands, clipping, dead hitboxes, unsupported selectors, stale state, fake health data or leaked resources merely because they are visible today. Fix the smallest correctness issue and report the visible delta.

Template/style source similarity is only static evidence. Equivalent source may render differently on Vela; changed source may still render equivalently. Use simulator/device comparison for visual claims.

## 6. Light Refresh and Redesign

Light Refresh may polish within the existing product hierarchy and interaction model. Redesign may use the sibling engineering skill’s L1/L2/L3 shape-native model.

Even in Redesign mode, preserve business behavior, persistence compatibility and data truth unless the user separately authorizes product-behavior changes. Separate broad visual changes from architecture migration when reasonably possible.

## 7. State and persistence migration

Classify every mutable fact as:

- persistent truth;
- runtime truth;
- derived view state.

Prefer existing canonical state machines over page booleans. Prefer one repository/store over direct page storage. Inventory keys before migration. Preserve old data when feasible. Serialize overlapping writes and invalidate stale async hydration callbacks.

Never persist live connection state, listener presence, current page visibility or other runtime-only truth merely for rendering convenience.

## 8. Runtime ownership migration

For each sensor, health/location/event subscription, timer and haptic flow, identify:

- acquire/start/subscribe paths;
- canonical runtime owner;
- pause/hide behavior;
- finish/destroy/replacement behavior;
- late callback guard;
- recovery/resume behavior.

Do not leave old and new owners active simultaneously. A lifecycle refactor is incomplete until release behavior is proven.

## 9. Keep migration reversible

Change one architectural axis at a time when practical. Review Git diff after each stage. Avoid mass rename + persistence rewrite + lifecycle rewrite + redesign in one change.

Use temporary adapters only when they enable a bounded migration and have a removal condition. Do not add “clean architecture” layers that only forward calls without protecting an invariant.

## 10. Compare preservation after changes

For Preserve UI or Light Refresh, compare against the captured baseline:

```bash
node skills/openvela-existing-app-refactor/scripts/compare-preservation-baseline.mjs \
  <temporary-baseline.json> <project-root> --mode preserve
```

Use `--mode light` for Light Refresh. The comparison treats removed routes, static copy/assets and interaction bindings as stronger drift signals. Template/style hash changes are warnings requiring visual verification, not proof of failure.

The tool is a guardrail. It cannot prove pixel equivalence, dynamic copy equivalence, runtime layout, gestures or device behavior.

## 11. Validate improvement and equivalence separately

Collect **equivalence evidence** for user flows, UI mode, persisted data, navigation, gestures and shape-specific behavior.

Collect **engineering evidence** for ownership reduction, API legality, lifecycle release, allocation/IO reduction, architecture contracts, build/JSC/RPK and bundle/resource budgets.

Static tests do not prove visual equivalence. Preview does not prove device behavior. Simulator does not prove every hardware capability.

## 12. Produce an evidence report

Use `references/refactor-report.md`. Explicitly list:

- selected visual mode;
- baseline and ownership map;
- before/after ownership changes;
- persistence compatibility;
- preserved UI and intentional visible corrections;
- resource/performance changes backed by evidence;
- platform/build legality;
- verification matrix;
- unresolved runtime/device risks.

Never turn untested areas into successful claims.

## Hard invariants

- Do not redesign without authorization; default to Preserve UI when uncertain.
- Do not rewrite a working frontend merely to match a preferred vocabulary.
- Do not create a second source of business truth without a bounded transition plan.
- Do not silently change or delete persistence schema/user data.
- Do not promote mock, fallback, compatibility or estimated values to real device data.
- Do not leave old and new lifecycle owners active simultaneously.
- Do not flatten intentional shape-specific UI without authorization.
- Do not claim behavior/UI preservation without evidence appropriate to that layer.
- Do not turn a refactor into a rewrite unless incremental migration is demonstrably unsafe or impossible.

## References

- UI/interaction preservation: `references/preservation-contract.md`
- Staged migration: `references/migration-playbook.md`
- Project-grounded migration patterns: `references/project-refactor-patterns.md`
- Refactor delivery/evidence contract: `references/refactor-report.md`
- General engineering standard: `../openvela-wearable-engineering/SKILL.md`

## Skill self-checks

After modifying either skill or its scripts, run:

```bash
node skills/openvela-wearable-engineering/scripts/test-audit.mjs
node skills/openvela-existing-app-refactor/scripts/test-inventory.mjs
node skills/openvela-existing-app-refactor/scripts/test-preservation.mjs
node skills/validate-skill-suite.mjs
```

Use these self-checks to protect the Skill package itself. They do not replace target-project build, simulator or device validation.
