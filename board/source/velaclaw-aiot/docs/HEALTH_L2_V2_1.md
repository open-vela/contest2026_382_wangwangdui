# Health L2 v2.1

Health is an L2 assisted surface: the semantic metrics are shared, while Circle, Pill and Rect use different compositions.

## Data contract

Heart rate, blood oxygen and stress are sourced from the platform health capability. The product surface must not promote compatibility fallback values as real health measurements.

- `source === 'live'` + `live === true` is treated as official system health data.
- Capability fallback values may still exist internally for compatibility/runtime continuity, but Health UI does not present them as measurements or trends.
- Until an official sample arrives, the UI renders `--`, `等待`, and an empty trend rather than fabricated values.
- Trend windows are built only from official samples observed during the active Health lifecycle.

This rule is intentionally stricter than older demo-oriented behavior.

## Trend visualization

Health trends use local relative scaling instead of `value / absoluteMax` scaling. Each metric has a minimum visual spread so small but meaningful changes remain visible without exaggerating a single sample into a fake history.

- heart-rate minimum visual spread: 20 bpm
- blood-oxygen minimum visual spread: 4 percentage points
- stress minimum visual spread: 20 points
- bars are bounded by the L2 `chartHeight` and `trendMinHeight` tokens

The latest sample uses the active metric color; previous samples use the corresponding muted tonal color.

## Shape strategy

- Circle: compact status summary, heart-rate hero, two tonal metric cards, then scrollable blood-oxygen/stress trend details.
- Pill: vertical three-card health stream with exact value, state, source, local trend and range.
- Rect: dashboard with a dominant heart-rate panel plus paired blood-oxygen/stress cards.

All shapes keep the existing full-bleed Scene contract and do not crop the physical display to manufacture safety.

## Verification

Run:

```bash
npm run health:official
npm run check
```

Smoke-test with official health service enabled, then temporarily unavailable. Official samples should render immediately; unavailable/fallback state should show waiting placeholders rather than plausible-looking synthetic health data.
