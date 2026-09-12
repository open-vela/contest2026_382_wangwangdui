# Preservation Contract

Use this contract before refactoring an existing app when visual or behavioral preservation matters.

## Visual mode

Record exactly one value:

- Preserve UI
- Light Refresh
- Redesign

If the user already selected a mode, do not ask again. If the user has not decided and work must proceed, use Preserve UI.

## Capture the baseline

Record or inspect, per route and shape:

- route and entry point;
- page title/copy/labels;
- icons, images, fonts and assets;
- background and major color roles;
- content order and hierarchy;
- fixed vs scrollable regions;
- control position, sizing, alignment and spacing;
- gestures, tap targets and navigation result;
- loading/empty/error/disabled states;
- Circle/Pill/Rect-specific differences;
- visible live/persisted/estimated/mock provenance labels;
- known clipping, black bands or runtime defects that are not product intent.

For Preserve UI or Light Refresh, save the static baseline before edits:

```bash
node skills/openvela-existing-app-refactor/scripts/capture-preservation-baseline.mjs \
  <project-root> --out <temporary-baseline.json>
```

The baseline records route identity plus static UI signals such as visible literal text, assets, event bindings, tag structure and style/template fingerprints. It deliberately ignores ordinary script-body changes so internal refactors do not look like visual changes.

Keep the baseline temporary unless the project intentionally wants a versioned regression fixture.

## Evidence hierarchy

Use evidence according to what it can prove:

1. Static baseline comparison can detect likely drift in routes, literal text, assets, handlers, template structure and style source.
2. Shared-semantics preview can check design resolution, not Vela runtime equivalence.
3. Simulator screenshots/recordings can verify layout, clipping, gestures and navigation on the simulated profile.
4. Physical-device evidence is strongest for hardware capability, power behavior, sensors and product-specific rendering.

Do not claim pixel equivalence from hashes. Do not claim hardware equivalence from simulator output.

## Preserve UI acceptance rules

A refactor passes Preserve UI only when the user-visible product remains materially equivalent except for explicitly declared correctness fixes.

Check:

1. Same primary task flow.
2. Same route outcome for taps/swipes/back behavior.
3. Same content hierarchy and control order.
4. Same visible copy unless correctness requires a change.
5. Same major geometry and shape-specific composition.
6. Same asset identity where assets still exist and are legal.
7. Same scroll/paging behavior.
8. No newly introduced clipping, overflow, black bands or dead hitboxes.
9. No fake/compatibility data newly presented as real data.
10. Every intentional visible delta is listed in the refactor report with a reason.

After changes, run:

```bash
node skills/openvela-existing-app-refactor/scripts/compare-preservation-baseline.mjs \
  <temporary-baseline.json> <project-root> --mode preserve
```

Use `--mode light` for Light Refresh.

Interpret results carefully:

- removed route, literal copy, asset or interaction binding: strong drift signal;
- template structure change: requires rendered-equivalence review;
- style/template fingerprint change: warning that simulator/device comparison is required;
- no static drift: useful evidence, but not proof that Vela renders identically.

## What may change without redesign permission

These are internal changes unless they alter visible behavior:

- move native calls behind capability wrappers;
- centralize repositories/stores;
- replace page-local booleans with an existing state machine;
- serialize persistence;
- guard stale async callbacks;
- consolidate sensor/timer/listener ownership;
- reduce allocations and duplicate writes;
- split semantic projection from page rendering;
- fix unsupported API/CSS usage while matching old rendering as closely as possible;
- align build scripts, API level and manifest declarations.

## What requires explicit redesign permission

- a new visual language;
- a new information hierarchy;
- major typography, color, spacing or radius changes;
- replacing specialized layouts with a different composition;
- changing the primary gesture/navigation model;
- moving content between pages for aesthetic reasons;
- a new Circle/Pill/Rect composition that materially changes product appearance.

## Defect vs intent

Do not preserve a defect merely because it exists in the baseline. Classify each visible oddity:

- **intent** — deliberate product behavior to preserve;
- **constraint** — platform limitation to accommodate;
- **defect** — clipping, dead hitbox, stale data, unsupported selector, black band, race, fake-data presentation, or other correctness issue to fix;
- **unknown** — ask or report before changing when material.

When fixing a defect in Preserve UI, make the smallest visible correction that restores correctness and record it explicitly.
