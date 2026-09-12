# Wearable Design

## Design objective

Create a product-specific wearable interface that is visually intentional, physically appropriate to the target display, readable at a glance, and economical in attention and resources.

Borrow only platform-independent aesthetic principles from mature frontend design systems. Do not import web-specific implementation assumptions.

Useful external inspirations:

- Anthropic `frontend-design`: commit to a clear visual direction instead of generic AI-default styling.
- Vercel Web Interface Guidelines: make hierarchy, labels, feedback, error recovery, and interaction details explicit and reviewable.
- Xiaomi Vela multi-screen and design guides: design for actual wearable shapes and resolutions before implementing adaptation.

## Start with product intent

Before layout code, state:

- the surface's single primary job;
- the most important information/action;
- the glance duration expected from the user;
- whether the screen is informational, transactional, ambient, or highly interactive;
- what should be memorable about the visual treatment;
- which data is real, estimated, unavailable, or simulated.

Choose a coherent visual direction. Avoid automatically defaulting to white cards, generic purple gradients, excessive rounded rectangles, or dense dashboard grids.

## Shape-native composition

### Circle

Treat the physical circle as geometry, not a square viewport with rounded clipping.

- Use central bands for critical text and values.
- Respect narrow top/bottom chords for labels and controls.
- Allow backgrounds and decorative surfaces to bleed to the physical edge while keeping text/controls in safe chords.
- Avoid putting wide text or tap targets near the lower/upper circumference without chord checks.
- For highly visual surfaces, use explicit round composition instead of uniformly shrinking a rectangular design.

### Pill / capsule

Treat vertical space as the primary axis.

- Use a strong vertical rhythm and progressive disclosure.
- Keep important controls away from cramped rounded ends.
- Use long-body scrolling/paging intentionally rather than compressing all information into one viewport.
- Check long numeric values and localized labels; narrow width makes text fit a first-class constraint.

### Rect

Use the additional horizontal area rather than merely enlarging a Pill layout.

- Increase information density only when hierarchy remains clear.
- Consider multi-column or horizontal comparison when it improves comprehension.
- Preserve touch clarity and glanceability; available area is not a requirement to fill every gap.

## L1 / L2 / L3 design freedom

### L1 Auto

Use for ordinary settings, simple lists, basic controls, confirmation pages, and low-distinctiveness surfaces.

Prefer shared primitives, flexible layout, standard spacing, and minimal shape overrides.

### L2 Assisted

Use for health metrics, workout summaries, trends, Today/dashboard surfaces, and other screens where semantics are shared but composition benefits from shape-aware design.

Share data and display semantics. Allow each shape to define grouping, ordering, density, chart orientation, or control placement.

### L3 Free

Use for watchfaces, launchers, highly branded visualizations, and gesture-specific surfaces.

Allow a shape to have its own surface and interaction structure. Reuse domain truth and common primitives where helpful, but do not force a generic renderer to own the design.

## Visual hierarchy

Prioritize approximately three levels at most in a glanceable viewport:

1. Primary value/action.
2. Context or supporting status.
3. Secondary metadata/navigation.

If everything is visually emphasized, nothing is prioritized.

Use size, weight, spacing, contrast, and position before adding decoration.

## Typography

- Optimize for short glance distance and constrained width.
- Prefer stable line boxes and explicit text-fit tests for important metrics.
- Avoid making typography smaller solely to rescue an unsuitable composition.
- Use fewer font sizes with stronger hierarchy rather than many nearby sizes.
- Treat long values (`10000+`, times, distances, percentages) and localization as design inputs.

## Color and surfaces

- Use a small role-based palette: background, primary text, secondary text, accent/action, success/warning/error, and optional data-series roles.
- Avoid relying on color alone to encode critical state.
- Reserve strong accent color for priority and interaction.
- Do not stack many nested cards simply because web dashboards often do.
- On OLED-like wearable displays, dark backgrounds can be appropriate, but visual choice must remain compatible with product requirements and actual hardware behavior.

## Motion and haptics

Use feedback to explain state or confirm action, not as decoration.

- Keep transitions short and directional.
- Make gesture completion unambiguous before route changes.
- Avoid continuous animation that consumes resources without adding information.
- Treat haptics as a native resource with explicit ownership and availability checks.

## Interaction copy

Use short, specific labels. Error and unavailable states should tell the user what happened and what action is possible. Do not hide capability absence behind fake data.

Examples:

- Prefer `等待心率样本` over a fabricated `72 bpm`.
- Prefer `定位不可用` or a clear fallback status over silently presenting estimated GPS as measured GPS.
- Prefer action-specific labels over ambiguous `继续` when space allows.

## Adaptation strategy

Official Vela guidance recommends flexible sizing and shape media rules for multi-screen support. Use that for ordinary responsive surfaces. For specialized wearable compositions, explicit geometry can be safer than percentage layout when the design depends on physical chords, touch hitboxes, or stable absolute regions.

Do not make either percentage layout or fixed geometry a religion. Choose based on the surface:

- flow/list → flexible dimensions and shared primitives;
- fixed visual composition → explicit design recipe with per-shape deltas;
- round-safe content → chord/safe-region calculation;
- watchface/launcher → shape-native surface.

## Review questions

- Is the visual direction specific to the product, or generic AI UI?
- Does the primary action/value win immediately?
- Does each shape use its geometry rather than merely tolerate it?
- Are text and controls inside physically comfortable areas?
- Are shape differences explicit in the design layer?
- Can the layout survive long numbers and localization?
- Are animation/haptics justified by interaction meaning?
- Is any visual completeness dependent on misleading mock data?
