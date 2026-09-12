# Innovations

V2.5 focuses on practical innovation for constrained wearable applications. The project does not depend on a single large framework rewrite; its value comes from combining design, data, lifecycle, and tooling decisions into one maintainable Quick App.

## Shape-native application architecture

Most responsive systems try to preserve one layout and continuously scale or wrap it. `vela_band` instead shares business semantics while allowing Circle, Pill, and Rect to use different compositions.

Evidence in the repository:

- device profiles in `src/v2/system/device_profile.js`;
- shape-aware layouts under `src/v2/design/apps`;
- Design Specs and views under `src/v2/design`;
- visual and multi-screen contract tests under `test/` and `scripts/`.

The result is a single product core without forcing a circular watch, tall band, and rectangular watch to look like resized copies of one another.

## Explicit design freedom

The L1/L2/L3 model turns a subjective design question into an engineering contract:

- L1 automates ordinary geometry;
- L2 shares semantics while allowing assisted shape-specific composition;
- L3 gives interaction-heavy surfaces independent art direction.

This prevents the common failure mode where a generic adapter accumulates exceptions until neither designers nor maintainers know which layer owns the layout.

## Geometry and semantics are separate

Design Specs own surface strategy and geometry. Design Views own display-ready semantics. Pages bind the two.

This allows a metric such as steps or heart rate to retain one business meaning while its chart, label density, or card arrangement changes by device shape. It also reduces presentation calculations embedded in `.ux` pages.

## Runtime-aware visual tooling

Layout Studio reuses project Scene and Adapter semantics instead of creating a disconnected browser-only layout model. Shape overrides are stored as small deltas, which keeps source reviewable and limits accidental cross-device edits.

This is particularly useful for wearable development because small geometry changes can have large effects near circular arcs or pill end caps.

## Truthful health data

Health presentation is source-aware:

- visible metrics are promoted only from accepted system samples;
- fabricated trend seeds are not used for the official health surface;
- missing samples render waiting states;
- workout heart rate starts empty and accepts official heart-rate samples rather than synthesizing values from workout type or elapsed time;
- persisted provenance prevents older compatibility values from silently becoming live data after restore.

This makes the application more credible as a system-capability demonstration and avoids visually polished but misleading telemetry.

## Lifecycle as a first-class feature

Wearable software is constrained by power and background resources. The project therefore treats cleanup as architecture rather than page hygiene.

Feature controllers own temporary resources, and tests guard key release paths for health, workout, location, motion, timers, and haptics. The design goal is simple: if a feature is no longer visible or active, its expensive resources should not continue by accident.

## Interaction designed for physical shape

The launcher is not a single list with cosmetic CSS changes. Circle and Rect can use honeycomb direct manipulation, while Pill uses a vertically efficient paged list. Watchfaces also use deterministic shape-specific geometry where visual precision matters.

Gesture ownership rules preserve tap behavior, drag thresholds, swipe navigation, and fallback handling without allowing nested components to compete for the same route action.

## Quality gates that encode product lessons

The repository turns prior failures into repeatable checks. `npm run check` covers architecture, scene bounds, runtime contracts, interaction, design views, declarative adaptation, text fit, health data, persistence, power, motion, haptics, calendar and launcher logic. Page bundle size has a separate audit path.

The important innovation is not the number of tests. It is that wearable-specific lessons such as full-scene bounds, shape geometry, data provenance and lifecycle ownership are represented as repository contracts rather than remaining tribal knowledge.
