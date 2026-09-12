# Preservation Contract

Use this contract before refactoring an existing app when visual or behavioral preservation matters.

## Visual mode

Record one value:

- Preserve UI
- Light Refresh
- Redesign

If the user has not decided and work must proceed, use Preserve UI.

## Capture the baseline

Record or inspect, per route and shape:

- route and entry point;
- page title/copy/labels;
- icons, images, fonts and assets;
- background, major color roles and contrast;
- content order and hierarchy;
- fixed vs scrollable regions;
- control position, sizing, alignment and spacing;
- gestures, tap targets and navigation result;
- loading/empty/error/disabled states;
- Circle/Pill/Rect-specific differences;
- visible live/persisted/estimated/mock provenance labels;
- known clipping, black bands or runtime defects that should not be preserved as product intent.

Screenshots or simulator/device recordings are stronger visual evidence than source-code similarity.

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
10. Any visible delta is listed in the refactor report with a reason.

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
- fix unsupported API/CSS usage while matching the old rendering as closely as possible;
- align build scripts, API level and manifest declarations.

## What requires explicit redesign permission

- new visual language;
- new information hierarchy;
- major typography, color, spacing or radius changes;
- replacing specialized layouts with a different composition;
- changing primary gesture/navigation model;
- moving content between pages for aesthetic reasons;
- new Circle/Pill/Rect composition that materially changes the product appearance.

## Defect vs intent

Do not preserve a defect merely because it exists in the baseline. Classify each visible oddity:

- **intent** — deliberate product behavior to preserve;
- **constraint** — platform limitation to accommodate;
- **defect** — clipping, dead hitbox, stale data, unsupported selector, black band, race, fake-data presentation, or other correctness issue to fix;
- **unknown** — ask or report before changing when material.

When fixing a defect in Preserve UI Mode, keep the correction as local as possible.
