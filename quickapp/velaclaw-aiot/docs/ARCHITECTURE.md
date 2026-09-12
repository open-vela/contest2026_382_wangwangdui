# Architecture

V2.5 is a continuous engineering iteration of the V2.4 codebase. It keeps the established `src/v2` namespace and focuses on stronger ownership boundaries rather than renaming directories.

## Goals

The architecture is designed around five constraints of wearable Quick Apps:

1. native capabilities vary by Vela image and device;
2. UI geometry changes materially between Circle, Pill, and Rect;
3. background resources must be tightly scoped;
4. persistent state must survive page recreation without duplicate owners;
5. pages should remain small enough to reason about and test.

The preferred dependency direction is:

```text
Vela APIs
   ↓
src/capabilities
   ↓
src/domain
   ↓
src/v2/features
   ↓
src/v2/design
   ↓
src/pages
```

A lower layer must not depend on page markup or form-factor presentation.

## Capability layer

`src/capabilities` wraps Vela APIs such as device, battery, display power, heart rate, blood oxygen, stress, location, motion, vibrator, storage-related integration and interconnect behavior.

Responsibilities:

- isolate import and runtime differences;
- normalize success and failure results;
- expose source or availability information where the caller needs provenance;
- keep platform fallbacks out of Domain logic;
- release subscriptions through explicit APIs.

A capability adapter may provide compatibility behavior, but presentation must not label compatibility values as live system data.

## Domain layer

`src/domain` owns business facts and state transitions that do not depend on screen shape.

Examples include:

- workout session state and persistence;
- activity and health state;
- history storage;
- settings values;
- sync payload semantics;
- power-state transitions.

Domain code should be deterministic enough to exercise in Node.js tests. It must not contain Circle, Pill, or Rect layout decisions.

## Feature layer

`src/v2/features` connects Domain state to a product feature. A Feature Controller may own:

- hydration and persistence sequencing;
- page-visible state;
- subscription start and stop;
- timers;
- location and health consumers;
- semantic user actions.

A resource must have one owner. For example, a workout session controls its running tick and location/heart-rate subscriptions; hiding or pausing the relevant experience releases resources through the same ownership path.

## Design layer

`src/v2/design` contains the product-facing adaptation system:

- Scene and geometry helpers;
- device and shape-aware Adapter logic;
- L1/L2/L3 freedom metadata;
- app layout configurations;
- Design Specs;
- Design Views;
- reusable engines such as honeycomb and analog geometry.

### Design Spec

A Design Spec answers questions such as:

- which surface is used for this shape;
- where semantic content may live;
- how wide a card or chart should be;
- which density and spacing apply;
- whether the feature is L1, L2, or L3.

### Design View

A Design View converts business state into display-ready semantics such as formatted metric text, weekday labels, progress widths, selected states, source labels, and chart values.

This separation keeps page markup from becoming a second business or presentation engine.

## Page layer

`src/pages` binds Vela lifecycle and events to the Feature and Design layers.

Pages should:

- bind resolved geometry and display values;
- forward taps, swipes, drags, and lifecycle events;
- avoid direct storage manipulation when a Domain store exists;
- avoid reimplementing formatting already owned by a Design View;
- avoid creating duplicate timer or sensor owners.

## Device profile and viewport

`src/v2/system/device_profile.js` classifies known wearable dimensions and shape information. The application recognizes representative targets including 192×490 and 212×520 pill displays, 336×480 and 432×514 rectangular displays, and 466×466 or 480×480 circular displays.

The runtime uses a 192 logical design width from `src/manifest.json`. Shape classification and Scene projection are responsible for translating device information into design geometry without hard-coding physical pixels into business pages.

## Full Scene and safe content

The Scene represents the application canvas. Safe geometry constrains semantic content, not the entire visual surface.

```text
Scene
├── background and decorative layers
└── semantic content
    ├── titles and labels
    ├── metrics and charts
    └── interactive controls
```

This distinction is important on round and pill displays. Shrinking the whole Scene into a conservative rectangle produces wasted space and black bands; allowing all foreground content to reach the physical edge causes clipping and unreliable touch targets.

## Persistence

Persistent state is routed through dedicated stores and adapters rather than page-local storage calls. Read-modify-write flows that can overlap should be serialized. Repeated writes may be deduplicated only when equivalence is proven and `undefined` or incomplete payloads cannot suppress a necessary write.

State restored from storage must preserve provenance. Legacy health or workout values that cannot prove an official source must not be promoted to live data.

## Navigation and interaction ownership

Page-level navigation gestures have one semantic owner. Compatibility handling may combine native swipe and raw-touch fallback only when both paths resolve to the same action and the same owner.

Nested visual components must not create competing navigation gestures. Drag-heavy surfaces such as honeycomb launchers own their direct-manipulation gesture inside the surface and must preserve tap semantics when a drag threshold is not crossed.

## Resource lifecycle

The architecture treats resource cleanup as a product contract:

- health subscriptions exist only while required;
- workout location and official heart-rate consumers stop on pause, finish, cancel, or relevant page teardown;
- timers are cleared on lifecycle exit;
- temporary sensor and event listeners are removed by their owner;
- power-state changes can reduce expensive work.

These rules are verified by repository tests where possible and still require runtime smoke testing after platform-sensitive changes.

## Legacy directories

`src/common` and `src/presentation` contain resources and earlier implementation pieces that remain referenced by parts of the application. They are compatibility areas, not the preferred location for new product logic.

Do not perform broad source moves only to make directory names match V2.5. Refactor a legacy dependency when there is a concrete ownership, correctness, maintenance, or performance reason.

## Verification

Run:

```bash
npm run check
npm run build
```

For page-size review:

```bash
npm run bundle:audit
```

The contract suite protects architecture and logic. Vela Runtime validation remains necessary for geometry, gesture, native feature and lifecycle behavior.
