# Design System

The wearable design system treats screen shape as a product input rather than a final scaling step. Circle, Pill, and Rect share business meaning but may use different composition, density, and interaction.

## Design freedom

### L1 Auto

Use L1 when the page structure is ordinary and the product meaning does not depend on a unique composition.

Typical surfaces:

- settings menus;
- simple detail pages;
- straightforward controls;
- regular paged lists.

L1 may resolve safe geometry, content width, typography, spacing, page capacity, and pager placement. Shape differences belong in the Design Spec rather than page-local device branches.

### L2 Assisted

Use L2 when semantics are shared but the best presentation changes by shape.

Typical surfaces:

- health summaries;
- activity progress;
- history trends;
- workout dashboards;
- dense Today views.

The Domain and Feature layers stay shared. Design Specs select shape-aware composition and Design Views prepare display-ready values.

Examples already represented in the repository include:

- History using compact tracked bars on Circle, horizontal comparative rows on Pill, and dashboard-oriented composition on Rect;
- Activity presenting truthful goal progress instead of inventing hourly samples from a daily total;
- Health preserving one semantic metric stream while adapting safe geometry and scrolling behavior;
- Workout sharing session state while adjusting metric placement to the display.

### L3 Free

Use L3 when interaction or visual identity is itself a major part of the product.

Typical surfaces:

- watchfaces;
- honeycomb launchers;
- strongly branded visual experiences.

Circle and Rect launcher layouts use honeycomb surfaces. Pill uses a paged vertical list. These surfaces share the application catalog but do not pretend to be the same visual structure.

## Shape language

### Circle

- use the round canvas as a round canvas;
- keep wide content near the widest chord;
- protect top and bottom arcs for text and controls;
- allow a full-scene background;
- prefer compact radial, tracked, or centered visualizations;
- use scrolling when content naturally exceeds one screen.

### Pill

- exploit the long vertical axis;
- keep repeated information in a readable vertical rhythm;
- use full-width comparison rows where narrow vertical charts would lose clarity;
- keep critical controls away from rounded end caps and system gesture areas;
- separate full-bleed backgrounds from foreground comfort zones.

### Rect

- use horizontal room for dashboards and multi-column content;
- avoid inheriting excessive Pill spacing;
- allow larger direct-manipulation surfaces when touch geometry supports them;
- keep the same semantic priorities as other shapes even when composition differs.

## Scene model

A page starts from a full Scene. Safe content is then placed inside shape-aware geometry.

```text
Full Scene
  ├─ background / decorative content
  └─ semantic content
       ├─ text and values
       ├─ charts and cards
       └─ controls and touch targets
```

Do not crop the entire Scene to manufacture safety. On a circular display this creates a small inscribed rectangle; on a pill display it often produces visible bands and wastes the long axis.

## Geometry rules

- Absolute-positioned full-page wrappers must have explicit Scene dimensions so that Vela cannot collapse the parent.
- Product-critical widths and heights should resolve to explicit shape-aware geometry rather than fragile percentage measurement.
- Text needs enough width and line height for the longest supported values.
- `overflow: hidden` is a visual choice, not a general fix for layout mistakes.
- A scrolling flow is different from a static safe rectangle; not every row must be visible at the same time.
- Precision watchfaces may use deterministic geometry when first-mount measurement would otherwise introduce instability.

## Design View contract

Formatting and display semantics should be centralized when they affect more than one node or depend on product state.

Examples:

- exact step value strings;
- weekday and Today labels;
- source text for health values;
- chart bar geometry;
- selected and disabled states;
- progress width and remaining-goal copy.

The page should bind these values instead of recomputing them in template expressions or lifecycle callbacks.

## Interaction contract

Visual freedom does not change navigation semantics.

- one page-level navigation action has one owner;
- tap must remain tap until a drag threshold is crossed;
- native gesture and raw-touch fallback may coexist only for the same semantic owner;
- direct-manipulation surfaces release temporary gesture state on lifecycle exit;
- paged experiences should expose a discoverable control when swipe is not sufficient by itself.

## Choosing a level

Before adding a surface:

1. identify the shared business semantics;
2. determine how sensitive the information hierarchy is to shape;
3. choose L1, L2, or L3;
4. define Circle, Pill, and Rect strategies in the Design layer;
5. keep Domain behavior shared unless the product behavior truly differs;
6. verify text, touch targets, overflow, and lifecycle on affected targets.

If an L1 surface repeatedly needs exceptions to stay readable, promote the design problem to L2 instead of continuing to shrink or patch the page.
