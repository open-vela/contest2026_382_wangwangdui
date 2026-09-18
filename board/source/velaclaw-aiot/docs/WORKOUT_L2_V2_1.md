# Workout L2 v2.1

This document defines the V2.1 product contract for the active Workout surface.

## Scope

This iteration keeps the existing workout transaction, persistence and GPS behavior, but makes the active-session UI stateful and removes fabricated heart-rate values.

## Heart-rate provenance

Workout heart rate follows the same data-honesty rule as Health:

- the Feature consumes `src/capabilities/heart_rate.js`;
- only snapshots with `live === true` and `source === 'live'` may update the workout session;
- compatibility fallback values must never be shown as workout heart rate;
- a new session begins with no heart-rate sample and renders `-- / 等待心率` until an official sample arrives;
- pause, hide, finish and cancel release the heart-rate subscription together with timer/location resources;
- saved average heart rate is `null` when the session never received an official sample.

The workout Domain state machine owns only semantic accumulation through `updateHeartRate(value)`. It must not synthesize heart rate from workout type, elapsed time or step count.

## Running and paused states

The two active states must be visually distinguishable without changing the underlying page hierarchy.

### Running

- green status chip `运动中`;
- neutral dark timer hero;
- full-strength metric cards;
- secondary `暂停` action;
- GPS may show locating, located, GPS distance or step-length fallback status.

### Paused

- amber status chip `已暂停`;
- warm dark timer hero;
- duration caption becomes `已记录时长`;
- frozen metric cards are visually de-emphasized;
- primary green `继续` action;
- GPS displays `GPS 已暂停`;
- timer, location and heart-rate consumers are all released.

This makes pause a real product state rather than only replacing one button label.

## Form-factor policy

Circle, Pill and Rect keep independent L2 compositions from `src/v2/design/specs/workout.js`.

- Circle uses chord-aware fixed bands rather than reusing one rectangular safe width from top to bottom.
- Pill remains the long-axis session composition.
- Rect remains the wider dashboard composition.

### Circle geometry

The verified Circle composition is:

- header: `32,24,128,18`;
- timer hero: `24,45,144,48`;
- metrics: `30,97,132,54`;
- actions: `42,153,108,21`.

The timer owns an explicit `31px` line box so large digits are not clipped by Vela text metrics.

The 2×2 metrics grid has two `64px` cards per row with one `4px` horizontal gap. Only the left card in each row owns `margin-right`; giving both cards a right margin makes the row wider than 132px and forces the cards into a single vertical column.

Workout History uses a separate round-screen title chord: `32,24,128,20`. Both `运动记录` and `返回` own the complete 20px line box, preventing the upper arc and text metrics from clipping the title.

## Validation

Run:

```bash
npm run workout:experience
npm run v2:runtime
npm run check
```

Smoke test all three form factors with this sequence:

1. start Walk and Run;
2. verify heart rate stays `--` until the official health service supplies a sample;
3. pause and confirm duration/metrics stop updating and the UI changes to the paused visual state;
4. resume and confirm runtime resources and live values continue;
5. finish and verify history receives the real average heart rate when available, otherwise `--`;
6. on Circle, verify the mode/status header, full timer digits, four metric cards and bottom actions are all visible;
7. on Circle Workout History, verify `运动记录 / 返回` is not clipped by the upper arc.
