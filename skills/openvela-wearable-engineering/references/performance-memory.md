# Performance and Memory

Wearable resource cost is part of product correctness. Optimize by ownership and lifetime before micro-optimizing syntax.

## Official Vela baseline

Current Xiaomi Vela guidance emphasizes that wearable applications operate under tight memory constraints. Re-check the current official best-practice pages when doing performance work:

- memory optimization: `https://iot.mi.com/vela/quickapp/zh/guide/best-practice/memory.html`
- startup optimization: `https://iot.mi.com/vela/quickapp/zh/guide/best-practice/start.html`
- acceptance criteria: `https://iot.mi.com/vela/quickapp/zh/guide/publish/acceptance-criteria.html`

The official memory guide specifically recommends keeping non-UI data out of reactive/view-model state when binding is unnecessary and avoiding unnecessary replacement allocations when in-place updates are suitable.

## Resource-economics model

For every long-lived feature, estimate four costs:

- **memory lifetime** — what objects/arrays/resources stay alive and for how long;
- **CPU frequency** — what executes per frame, per second, per sample, or per gesture;
- **IO frequency** — storage, logging, network/transport, file or native calls;
- **subscription lifetime** — timers, sensors, geolocation, health, events, haptics.

A small allocation in a 1 Hz loop may matter more than a larger one-time allocation at page entry.

## Reactive state discipline

Put only render-relevant data into page/view-model binding.

Prefer module/controller/domain-local data for:

- static lookup tables;
- immutable geometry;
- native handles;
- timers;
- caches not directly rendered;
- internal counters;
- persistence helpers.

Do not bind a large object just because the page needs one of its fields.

## Allocation discipline

Watch for repeated work in hot paths:

- recreating static geometry on every tick;
- repeated `map` / `filter` / `slice` / spread copies for unchanged data;
- deep-cloning entire state trees to update one scalar;
- formatting unchanged labels repeatedly;
- allocating callback closures in high-frequency sample handlers;
- projecting the same heart-rate/history sample through multiple copies.

Prefer reusable static geometry, targeted updates, and bounded projections where semantics remain clear.

Do not blindly mutate shared state to avoid allocation. Canonical ownership and correctness come first.

## Timer discipline

Inventory every interval/timeout.

- Avoid duplicate intervals for the same semantic clock.
- Stop intervals when the session/page no longer needs them.
- Avoid timer-based polling when a documented subscription/event already provides the data.
- Do not add arbitrary `setTimeout` delays to hide ordering bugs or wait for async persistence.
- Keep fallback timers bounded and cancel them when a real signal arrives.

## Sensor and native callback discipline

High-frequency callbacks should do minimum work:

1. reject if owner inactive;
2. validate sample/source;
3. perform minimal deterministic calculation;
4. update canonical state;
5. throttle/batch persistence or expensive projections.

Do not write storage or rebuild a large UI tree on every sensor sample unless the product explicitly requires it and measurement proves the cost acceptable.

## Persistence discipline

Flash/storage IO is not free.

- Persist meaningful checkpoints rather than every reactive tick.
- Deduplicate writes when serialized payload is unchanged.
- Serialize read-modify-write flows to avoid both races and redundant retries.
- Keep runtime-only state out of storage.
- Compact or cap histories to product requirements.

## Static geometry and assets

Precompute geometry that depends only on a known profile/configuration, especially watchface ticks, shape masks, and fixed layout plans.

For assets:

- use the smallest appropriate dimensions/format;
- remove accidental duplicate resources;
- avoid embedding large debug payloads or inline source maps in production bundles;
- audit fonts and icon sets for unused glyph/content where the toolchain allows it.

## Bundle budgets

Treat per-page JavaScript size as a regression signal even when the build succeeds.

A project should define a budget appropriate to its toolchain and target devices. When a page grows unexpectedly:

1. inspect newly imported modules;
2. detect accidental dependency on legacy/shared mega-modules;
3. remove duplicated static data;
4. split unrelated feature logic when the framework permits;
5. confirm debug/source-map content is not embedded into runtime bundles.

Do not optimize size by merging architectural ownership layers back into one giant module.

## Startup performance

Keep the first meaningful render path short:

- avoid artificial delay before route/render;
- defer non-critical work;
- avoid loading histories/assets before the first screen needs them;
- do not initialize sensors or connections merely because the application started;
- hydrate only the data required for the initial surface, then progressively load secondary content when product behavior allows.

Current Vela acceptance documentation includes an FMP requirement; re-check the current value before making a release claim.

## Power-mode integration

ACTIVE / DIM / SLEEP or equivalent product modes should influence resource policy.

Examples:

- reduce or stop non-essential animation in DIM;
- suspend unnecessary polling/subscriptions in SLEEP;
- preserve only capabilities explicitly allowed/required in background mode;
- rebuild runtime resources on wake from semantic state rather than leaving them permanently active.

## Measurement rules

Never claim a memory/performance improvement solely from reading code. Prefer:

- bundle-size before/after;
- allocation/object count if tooling exposes it;
- startup timing;
- callback/timer count;
- storage write count;
- simulator/device observation;
- repeatable test or profiling script.

## Review questions

- What runs once, per render, per second, per sample, and per gesture?
- Which objects stay alive after the page hides?
- How many timers and subscriptions are active simultaneously?
- Does every storage write carry new information?
- Is static geometry recreated unnecessarily?
- Did a convenience abstraction pull a large dependency into many page bundles?
- Is startup doing work the first screen does not need?
- Does DIM/SLEEP actually reduce work?
