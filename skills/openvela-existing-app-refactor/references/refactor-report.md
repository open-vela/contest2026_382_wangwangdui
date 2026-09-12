# Refactor Evidence Report

Use this report at the end of a non-trivial existing-app migration. Keep claims tied to evidence.

## 1. Scope

Record:

- selected visual mode: Preserve UI / Light Refresh / Redesign;
- target project and branch/commit;
- routes/shapes/devices covered;
- architectural axes changed;
- explicitly excluded work.

## 2. Baseline

Summarize the pre-refactor system:

- native modules and manifest/API-level assumptions;
- state machines, repositories, stores and direct page state;
- persistence keys/schemas that must remain readable;
- runtime owners for sensors, health, location, events, timers and haptics;
- current visual/interaction contract;
- known defects that are not product intent;
- build, simulator and device evidence already available.

Attach or reference the inventory and preservation baseline when used.

## 3. Ownership changes

For each material concern, record before and after:

| Concern | Before | After | Invariant improved |
| --- | --- | --- | --- |
| Business state | | | |
| Persistence | | | |
| Native capability | | | |
| Runtime lifecycle | | | |
| Presentation | | | |
| Shape/layout | | | |

Do not claim simplification merely because files moved. Explain which duplicate owner or ambiguous responsibility was removed.

## 4. Persistence compatibility

Record:

- old keys/schema still read;
- migrations introduced;
- defaulting/normalization behavior;
- whether writes remain backward compatible;
- any intentionally retired data;
- proof that user data is not silently lost.

## 5. UI and interaction delta

For Preserve UI, divide changes into:

### Preserved

- route/task flow;
- visible copy/assets;
- hierarchy/control order;
- geometry/spacing/color/typography where verified;
- scroll/paging/gesture/navigation semantics;
- Circle/Pill/Rect distinctions.

### Intentional visible corrections

List every visible change required for correctness, for example unsupported selector replacement, clipping fix, black-band fix, dead hitbox repair, or provenance correction.

### Unverified visual areas

List shapes/routes that lack simulator/device comparison. Never convert a static hash comparison into a claim of pixel equivalence.

For Light Refresh or Redesign, list the user-authorized visual scope separately from architectural changes.

## 6. Resource and performance delta

Record only measured or structurally proven changes:

- duplicate timers/listeners/subscriptions removed;
- static geometry/caches reused;
- redundant object copies reduced;
- persisted writes deduplicated;
- startup work deferred/removed;
- bundle-size change;
- background work stopped in hide/pause/DIM/SLEEP paths.

Do not invent performance percentages without measurements.

## 7. Platform/build legality

Record:

- API catalog/audit result;
- manifest feature and permission changes;
- minAPILevel changes and why;
- unsupported syntax/selectors removed;
- Node/browser assumptions removed;
- build, JSC, RPK and install results.

## 8. Verification matrix

| Claim | Static contract | Build/JSC | Preview | Simulator | Device | Status |
| --- | --- | --- | --- | --- | --- | --- |
| State transitions | | | | | | |
| Persistence compatibility | | | | | | |
| Lifecycle release | | | | | | |
| UI preservation | | | | | | |
| Gesture/navigation | | | | | | |
| Native capability | | | | | | |
| Bundle/resource budget | | | | | | |

Use `not tested` rather than leaving ambiguity.

## 9. Remaining risks

List unresolved items such as:

- device-specific API support not verified;
- physical sensor behavior not tested;
- visual routes without runtime comparison;
- compatibility reads that still need later removal;
- temporary migration adapters;
- assumptions that depend on firmware/image version.

## 10. Diff review

Before declaring the refactor complete, verify:

- no unrelated redesign entered Preserve UI work;
- no second source of truth remains accidentally active;
- no old/new lifecycle owner overlap remains;
- no persistence key was silently replaced;
- no mock/fallback value is presented as real data;
- no shape-specific intent was flattened without authorization;
- source changes match the stated migration scope.
