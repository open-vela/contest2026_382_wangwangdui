# Vela Design Engine V2 — Stable Architecture

This document describes the **current V2 runtime contract**. It supersedes the early rewrite notes that treated the beta host viewport as the design canvas.

The stable baseline is recorded in [STABLE_BASELINE_V2.md](STABLE_BASELINE_V2.md). Design-freedom rules are documented in [DESIGN_ENGINE.md](DESIGN_ENGINE.md).

## 1. Architecture goals

V2 separates device capability access, business state, product features, design projection and page rendering:

```text
Vela native APIs
  -> Capability Runtime
  -> Domain / State Machines
  -> Feature Controllers
  -> Design Specs + Design Views
  -> Full-bleed Design Scene
  -> Vela Page
```

The important ownership rules are:

- Capability gateways own raw Vela API access and fallback detection.
- Domain modules own business meaning, persistence and state transitions.
- Feature controllers own application-level orchestration and resource lifetime.
- Design specs/views own shape-aware presentation decisions and display-ready values.
- Pages own lifecycle binding, user events and rendering.
- Application navigation is centralized in `src/v2/app`.

V2 pages must not regain dependencies on legacy `src/common` code modules. Legacy/reference files may remain in the repository while migration history and assets are retained, but they are not the extension point for V2 work.

## 2. Device profile, Design Scene and Safe Space

Three coordinate concepts must remain separate.

### Device profile

`src/v2/system/device_profile.js` records physical/runtime facts such as:

- screen width and height;
- form factor (`circle`, `pill`, `rect`);
- logical height;
- device family;
- beta runtime viewport metadata when observed.

Some beta pill runtimes report an inset host viewport. That metadata is diagnostic input; it is **not** the height of the product design canvas.

### Full-bleed Design Scene

`src/v2/design/scene.js` resolves the page Design Scene.

The stable contract is:

- scene width is the 192-unit design width;
- scene origin is always `(0, 0)`;
- scene height covers the complete logical/physical display projection;
- percentage strings such as `100%` are never interpreted as pixel heights;
- background/watchface layers may render to the full scene edge.

For physical coverage, V2 uses the larger of the logical height and the rounded-up physical projection:

```text
ceil(screenHeight * 192 / screenWidth)
```

This prevents one-pixel gaps and avoids the earlier failure where `100%` was parsed as `100px`, which cropped a circular 192×192 page to roughly half height.

### Design Safe Space

Safe geometry is for **content placement**, not for cropping the page.

`scene.safeForWidth(...)` projects the content-safe area inside the full scene. Text, controls and interaction targets should respect that geometry where appropriate, while decorative/full-bleed backgrounds may extend beyond it.

For circles, do not reduce the whole UI to a small inscribed rectangle. Use chord-aware placement: narrow title/footer zones near the arcs and wider content zones near the center.

For pills, keep top/bottom interaction comfort separate from background coverage. A gesture bar or rounded end must not create a black strip in the visual background.

## 3. Shape strategy

V2 does not promise one responsive composition for every device.

- **Circle** — chord-aware compositions, radial/honeycomb surfaces and compact centered metrics.
- **Pill** — vertical information flow, tall cards and horizontal comparative trends.
- **Rect** — dashboard/grid compositions where horizontal room is useful.

The Design Freedom level determines how much the shapes may diverge; see [DESIGN_ENGINE.md](DESIGN_ENGINE.md).

## 4. Layout stability rules

The following rules are part of the stable baseline because violating them caused real Vela regressions:

1. **Give rendered surfaces concrete dimensions.** A wrapper containing only absolutely positioned children may collapse to zero height in Vela. Full-page surfaces such as launcher and watchface selector must explicitly use the Scene width and height.
2. **Do not use clipping as a substitute for safe layout.** `overflow: hidden` must not crop full-bleed watchface/background layers merely to make foreground content fit.
3. **Prefer resolved wearable geometry over fragile percentages.** Controls with text should use shape-aware pixel sizes from a Design Spec when percentage sizing can collapse or distort on the runtime.
4. **Keep first mount deterministic.** Art-directed watchfaces should not rely on an unstable first flex measurement when absolute geometry is known.
5. **Separate scrolling content from static safe geometry.** A scroll viewport may use the full shape-aware canvas; individual sections still need readable positions and dimensions.

## 5. Interaction contract

A page has one interaction owner for a gesture domain.

Clock is the reference case:

- the page owns navigation gestures;
- native `swipe` may be used;
- the **same owner** may also run a raw-touch fallback when a beta runtime otherwise turns vertical swipes into scrolling;
- the fallback consumes the gesture with `preventDefault` / `stopPropagation` when required;
- nested components must not create competing navigation owners.

Paged surfaces such as Settings may expose both left/right swipe and explicit arrow controls. The two input methods must project to the same page state.

## 6. Lifecycle and resource contract

Runtime resources belong to the feature/page lifetime that needs them.

Examples:

- health subscriptions are active only while the relevant foreground surface needs them;
- workout pause releases the 1 Hz tick and location resources;
- hidden/destroyed pages stop transient listeners/timers;
- low-power state changes may suspend expensive live data and restore it on wake.

A visual redesign must not silently change these lifecycle guarantees.

## 7. Validation gates

`npm run check` is the stable pre-merge gate. It covers:

- lint;
- V2 scene projection;
- architecture boundaries;
- runtime contracts;
- visual/layout contracts;
- interaction ownership;
- Design View contracts;
- capability runtime;
- power, health, activity, settings, motion, haptics, calendar, analog and honeycomb logic;
- local Markdown links.

Static contracts do not replace simulator/device validation. Any change to Scene, gesture ownership, absolute layout, watchfaces or shape-specific composition must still be smoke-tested on representative pill, circle and rectangular profiles.

## 8. Document status

Normative/current documents:

- [STABLE_BASELINE_V2.md](STABLE_BASELINE_V2.md)
- [REWRITE_V2_ARCHITECTURE.md](REWRITE_V2_ARCHITECTURE.md)
- [DESIGN_ENGINE.md](DESIGN_ENGINE.md)
- [COMPATIBILITY.md](COMPATIBILITY.md)

Files such as `REFACTOR_PHASE1.md`, `ADAPTIVE_LAYOUT_ARCHITECTURE.md` and earlier technical notes preserve project history and design exploration. When they conflict with this document or the current V2 tests, the stable V2 contract takes precedence.
