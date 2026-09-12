# Wearable Design Engine

The V2 Design Engine is not a universal responsive-layout converter. Its job is to decide **how much automation a wearable surface should accept** and to preserve meaningful product differences between circle, pill and rectangular screens.

> Automation removes repetition. Art direction owns meaningful differences.

The current runtime/Scene contract is described in [REWRITE_V2_ARCHITECTURE.md](REWRITE_V2_ARCHITECTURE.md).

## 1. Design Freedom levels

### L1 — Auto

Use L1 when the page is structurally ordinary and the product meaning does not depend on a unique visual composition.

Typical examples:

- settings menus;
- simple detail pages;
- ordinary paged lists;
- straightforward forms and controls.

The Engine may resolve:

- safe geometry;
- page capacity;
- spacing and card dimensions;
- typography scale;
- fixed pager placement.

L1 does **not** mean that every shape receives identical coordinates. A circle may need a fixed chord-aware frame while a tall pill may use spare vertical space. The rule is that these differences are resolved by the Design Spec rather than scattered as ad-hoc device checks throughout page logic.

Current reference: `src/pages/settings/settings` with `src/v2/design/specs/settings_menu.js`.

### L2 — Assisted

Use L2 when product semantics are shared but the best visual expression changes meaningfully by form factor.

Typical examples:

- health and history dashboards;
- activity and workout views;
- dense status pages;
- media or summary surfaces.

L2 shares Domain/Feature state and semantic values, then deliberately chooses a form-factor-specific composition.

Current `History` reference:

- **Circle** → compact tracked vertical bars, short weekday labels, small centered insight cards;
- **Pill** → `vertical-comparative-trend`: weekday/today label on the left, short thick horizontal comparison bar in the middle, complete step value on the right;
- **Rect** → dashboard composition using wider horizontal space.

The previous daily-record presentation was intentionally removed because it duplicated the same information and produced unstable layouts. L2 should prefer a clear summary hierarchy instead of preserving every old visual element.

`Health` follows the same principle: a circular screen may use the full 192×192 scroll canvas with chord-aware sections rather than being reduced to an inscribed rectangle.

`Activity` now follows a data-honesty rule as well. The Activity Feature only owns current values and goals, so the page must not invent an hourly histogram from the total. The L2 Activity surface therefore uses **real goal progress**: current value, exact target, percentage, remaining/over-target text and a bounded progress bar. The seven-day entry remains the route to the real historical trend surface.

`Today` uses the same product-minded approach on Circle. When a 2×2 summary grid has enough room for full labels, use `步数 / 热量 / 心率 / 站立` with metric-specific tonal surfaces instead of cryptic one-character abbreviations. Compactness should not come at the cost of legibility or visual identity.

#### L2 Design System v2.1

L2 v2.1 adds one shared assisted-design foundation in `src/v2/design/assisted.js`. It does **not** replace shape-specific composition. Instead it removes repeated infrastructure decisions that were previously copied into every L2 Spec.

The shared layer owns:

- normalized `circle` / `pill` / `rect` shape resolution;
- default content widths (`148 / 168 / 164` logical px);
- baseline density, rhythm, card-gap and radius tokens per form factor;
- a versioned plan identity: `designSystem: 'l2-v2.1'`;
- the common L2 freedom/strategy metadata;
- safe-content frame creation and simple fixed-height overflow guards.

A resolved L2 plan now starts with a stable contract:

```js
{
  designSystem: 'l2-v2.1',
  designSystemVersion: '2.1',
  freedomLevel: 2,
  strategy: 'assisted',
  shape: 'circle' | 'pill' | 'rect',
  surface: '...',
  density: 'compact' | 'vertical' | 'balanced',
  tokens: { ... },
  content: { left, top, width, height }
}
```

The Design Spec still owns product-specific art direction. For example, `History` keeps its pill comparison bars, `Workout` keeps distinct session geometry, and `Today` may override the shared circle content width to 136px for calendar legibility. Shared tokens are a baseline, not a reason to make all shapes look alike.

The first v2.1 migration covers `Activity`, `Health`, `History`, `Today` and `Workout`. Run `npm run v2:design-system` to validate the shared contract and stable key geometry across the four reference profiles used by the visual test suite.

### L3 — Free

Use L3 when the interaction or visual model itself is a major part of the product.

Typical examples:

- watchfaces;
- honeycomb launchers;
- games;
- strongly branded/experimental surfaces.

The Engine supplies the Scene, safe geometry, shared semantics and optional helpers, but it does not force one composition onto all shapes.

Current launcher strategy:

- Circle → Honeycomb;
- Pill → paged list;
- Rect → designed grid.

Current watchface strategy includes form-factor-specific components such as the circular mechanical face and the pill Alpine face. These surfaces may use deterministic absolute geometry because visual precision is more important than generic layout reuse.

## 2. Shape language

The stable product language is:

### Circle

Use the circular canvas as a circle, not as a small central rectangle.

- place titles and footers in narrow chord-safe zones;
- place wide cards near the center where the chord is widest;
- keep bottom summaries away from the lower arc;
- prefer compact radial/tracked visualizations;
- scroll through the full round canvas when the content naturally exceeds one screen.

### Pill

Use the long vertical axis as an advantage.

- prefer vertical information flow;
- use tall, readable cards;
- use horizontal comparison bars when seven vertical columns would become cramped;
- keep full-bleed backgrounds independent from top/bottom interaction comfort;
- reserve right-side numeric columns when exact values matter.

### Rect

Use the additional horizontal room.

- dashboards and two-column grids are appropriate;
- pair visualizations with insight columns where useful;
- avoid inheriting tall-pill spacing when the rectangle can present information side-by-side.

## 3. Full-bleed Scene vs safe content

Every Design decision starts from the full Design Scene, then applies safe geometry to content.

```text
Full Design Scene
  ├─ decorative/background layers: may reach the edge
  └─ semantic content
       ├─ title / controls / values: safe/chord-aware
       └─ scrolling sections: shape-aware viewport + readable internal geometry
```

Do not crop the Scene to manufacture safety. A rounded end, circular arc or gesture zone should influence foreground placement, not create artificial black bands in the background.

## 4. Wearable layout reliability rules

The following implementation rules are part of the Design Engine because they have direct visual consequences on Vela:

- A surface whose children are all `position:absolute` must still have an explicit width and height. Otherwise the parent may collapse and render as a black page.
- Avoid relying on percentage widths for compact text controls when Vela measurement can collapse them. Resolve explicit shape-aware pixel geometry when the dimensions are product-critical.
- Use `overflow:hidden` only when clipping is genuinely part of the visual design. Do not use it to hide mistakes in Scene geometry.
- Do not assume first-mount flex measurement is identical to a later remount for precision watchfaces. Prefer deterministic geometry where available.
- Static safe geometry and scrolling flow are different concepts. A long list does not need every row to fit inside the safe rectangle at the same time.

## 5. Design View boundary

Pages should receive display-ready values from Design Views where presentation semantics are involved.

Examples:

- formatted step values;
- `今天` / weekday labels;
- comparative bar widths;
- selected state colors;
- capability/status text.

The page should not duplicate Domain calculations or invent a second presentation model.

A typical V2 flow is:

```text
Domain model
   ↓
Feature Controller
   ↓
Design Spec (geometry / freedom / surface)
   +
Design View (display-ready semantics)
   ↓
Page
```

## 6. Interaction is part of the design

Visual freedom does not mean arbitrary gesture behavior.

The product should preserve stable navigation semantics:

- page-level navigation gestures have one owner;
- nested visual components must not compete for the same navigation gesture;
- a native swipe and a raw-touch compatibility fallback may coexist only when they belong to the same owner and produce the same semantic action;
- paged surfaces should provide a visible alternative (for example arrows) when appropriate.

## 7. Choosing a level for new work

Before implementing a new page or major redesign:

1. identify shared functional semantics;
2. estimate information density, shape sensitivity and interaction specificity;
3. recommend L1, L2 or L3;
4. define the shape strategy before writing page markup;
5. keep Domain/Feature behavior shared unless the product behavior itself differs;
6. validate pill, circle and rectangular targets;
7. if an L1 result becomes cramped or unreadable, promote the surface to L2 instead of repeatedly shrinking fonts and cards.

The Design Freedom level is a product decision, not merely a technical optimization.

## 8. Current reference surfaces

| Surface | Freedom | Stable shape strategy |
| --- | --- | --- |
| Settings menu | L1 | auto/paged; circle uses fixed chord-aware frame |
| History | L2 | circle tracked bars / pill vertical comparison / rect dashboard |
| Health | L2 | shared metrics with full round composition on circle |
| Workout | L2 | shared session semantics with shape-specific dashboard composition |
| Launcher | L3 | circle honeycomb / pill list / rect grid |
| Watchfaces | L3 | art-directed components per supported form factor |

These references are examples, not a requirement that future pages copy their exact styling.
