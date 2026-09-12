# Architecture, State, and Data

## Layer ownership

Use this dependency direction unless a project has a documented equivalent:

`Capability → Domain → Feature → Design → Page`

### Capability

Own native platform access and explicit fallback semantics.

- Wrap documented Vela modules.
- Normalize success/failure shapes.
- Report availability honestly.
- Do not own product/business state.

### Domain

Own device-shape-independent business truth.

- state machines;
- repositories and stores;
- calculations and invariants;
- persistence schema and normalization;
- deterministic transformations.

### Feature

Own runtime orchestration for one user-facing capability.

- acquire/release native resources;
- connect page lifecycle to domain state;
- coordinate timers/subscriptions;
- reject stale async callbacks;
- persist at defined checkpoints.

### Design

Own composition, geometry, display metadata, and shape-specific design intent. It may project domain/feature semantics but must not become a second business database.

### Page

Own Vela page lifecycle and event binding. Keep it thin. A page should not reimplement persistence, native capability logic, business transitions, or a second layout engine.

## State-machine-first rule

If a flow has mutually exclusive modes or meaningful transitions, model it as a state machine before scattering booleans through pages.

Examples:

- workout: idle → running → paused → running → finished/cancelled;
- power: ACTIVE → DIM → SLEEP;
- sync: disconnected → connecting → sending → completed/failed;
- permission/capability: unknown → available/unavailable → active/stopped.

When an existing state machine owns the flow, extend it. Do not add page fields such as `isRunning`, `isPaused`, `isSleeping`, or `isConnected` that can contradict the canonical state.

## Three classes of state

### Persistent truth

Persist only facts that must survive restart or later sessions, such as user settings, completed workout history, active-session recovery data, or selected watchface.

Requirements:

- one canonical repository/store;
- explicit default/normalization path;
- serializable schema;
- migration/version strategy when schema changes;
- serialized read-modify-write if concurrent callers can race;
- write dedupe when payload is unchanged and IO cost matters.

### Runtime truth

Do not persist ephemeral runtime ownership merely for convenience:

- current listener handle;
- whether a callback is presently subscribed;
- timer object/ID;
- transient connection operation;
- current page visibility;
- stale-request generation/token.

Reconstruct runtime truth from canonical state on activation.

### Derived view state

Derived data must be reproducible from canonical truth:

- formatted text;
- chart rows;
- display labels/icons;
- layout plan;
- status descriptions.

Do not persist a derived projection solely because the page already computed it.

## Canonical-data rule

For every business fact, answer: **where is the authoritative read and write path?**

Prefer:

`repository/store → domain state → feature controller → design projection → page`

Avoid:

`storage → page copy A`

`storage → controller copy B`

`global object copy C`

`history cache copy D`

Multiple caches are acceptable only when they are explicitly derived, invalidatable, and never become independent writers.

## Hydration and stale callback safety

Wearable pages and native callbacks are highly asynchronous. A result can return after a page has hidden, a session has changed, or a new request has replaced the old one.

Use a generation/token pattern:

1. Increment generation when beginning an async ownership period.
2. Capture the generation in callbacks.
3. Before applying a result, confirm the generation is still current.
4. Increment/invalidate generation on stop/hide/destroy/replacement.
5. Release the native resource as part of the same ownership transition.

Do not rely only on garbage collection or page destruction to prevent stale writes.

## Resource ownership

Every resource must have one owner and paired acquisition/release paths:

| Resource | Acquire examples | Release examples |
| --- | --- | --- |
| timer | start/ensure interval | pause, finish, hide, destroy, sleep |
| geolocation | subscribe | pause, finish, hide, destroy |
| health / HR | subscribe | pause, finish, hide, destroy |
| sensor | subscribe/start | hide, destroy, mode change |
| event listener | on/add | off/remove |
| haptic sequence | start | stop/cancel |
| transport | connect/send | cancel/disconnect |

If two pages or controllers can release the same underlying resource independently, ownership is probably unclear.

## Persistence checkpoints

Persist intentionally instead of on every reactive update.

Common checkpoints:

- important transition (`start`, `pause`, `resume`);
- periodic bounded checkpoint during a long session;
- page/background transition if recovery requires it;
- final record commit;
- settings change after normalization.

Do not write storage every second merely because a timer ticks every second.

## Recovery model

A resumable session should separate:

- persisted semantic state (type, timestamps, accumulated values, status);
- runtime resources (timers, sensors, subscriptions);
- recovery logic that rebuilds runtime resources only if the restored semantic state requires them.

Restoring data must not duplicate subscriptions or start multiple timers.

## Data-source honesty

Keep source metadata when source matters. For health/workout/device information, a numeric value without provenance can be dangerous.

A feature should be able to distinguish:

- current official live sample;
- persisted official sample;
- estimate;
- compatibility fallback;
- mock/demo value;
- unavailable/waiting.

Design projections may simplify wording but must not erase the distinction when it affects user interpretation.

## Architecture review questions

- What state machine already exists for this flow?
- What repository/store is canonical?
- Is the new field persistent, runtime, or derived?
- Who owns each native resource?
- Can an old callback write into a new lifecycle generation?
- Can two paths write the same persistent fact?
- Does a page now know more business logic than its feature/domain layer?
- Can restart/recovery reconstruct runtime state without duplicating resources?
