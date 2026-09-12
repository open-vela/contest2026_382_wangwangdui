# Project Refactor Patterns from vela_band

Use these as reference patterns, not as mandatory file names. The value is the invariant each pattern protects.

## 1. Existing state machine over page booleans

Reference:
- `quickapp/velaclaw-aiot/src/domain/workout/state_machine.js`
- `quickapp/velaclaw-aiot/src/domain/power/state_machine.js`

Pattern:
- transitions live in one domain owner;
- pages/controllers consume snapshots and transition functions;
- state names carry product meaning;
- pause/resume/finish behavior is explicit.

Refactor use:
When legacy pages independently maintain `isRunning`, `isPaused`, `isSleeping`, or similar flags, migrate callers toward the canonical state machine instead of adding a new global boolean layer.

## 2. Runtime owner + stale callback guard

Reference:
- `quickapp/velaclaw-aiot/src/v2/features/workout/controller.js`

Pattern:
- one controller owns location, heart rate and tick timers for the active workout;
- stop paths release resources;
- `lifecycleGeneration` prevents obsolete async completions from reactivating stale work;
- persistence is periodic and lifecycle-aware.

Refactor use:
Use this when a legacy flow starts the same native resource from multiple pages or when async hydration/callbacks can outlive the visible flow.

Do not copy its exact timers or workout behavior into unrelated features.

## 3. Canonical repository/store over direct page storage

Reference families:
- `quickapp/velaclaw-aiot/src/domain/workout/repository.js`
- `quickapp/velaclaw-aiot/src/domain/history/repository.js`
- `quickapp/velaclaw-aiot/src/domain/activity/store.js`
- `quickapp/velaclaw-aiot/src/capabilities/storage.js`

Pattern:
- pages/features do not each invent persistence semantics;
- serialization, normalization and write behavior are centralized;
- runtime-only truth is not persisted merely for convenience.

Refactor use:
Inventory existing storage keys first, then migrate readers/writers toward one owner while retaining compatibility reads where required.

## 4. Capability boundary around native APIs

Reference:
- `quickapp/velaclaw-aiot/src/capabilities/location.js`
- `quickapp/velaclaw-aiot/src/capabilities/system_event.js`
- `quickapp/velaclaw-aiot/src/capabilities/interconnect.js`

Pattern:
- official native module import stays near the boundary;
- capability availability is explicit;
- consumer fan-out is centralized when useful;
- last consumer release stops the native subscription;
- product code sees a narrower interface.

Refactor use:
Use when legacy pages directly import native modules in many places. Do not wrap a simple one-off API purely for architectural symmetry.

## 5. Shape-native design without runtime auto-redesign

Reference:
- `quickapp/velaclaw-aiot/src/v2/design/adapter.js`
- `quickapp/velaclaw-aiot/src/v2/design/apps/*/layout.js`

Pattern:
- base + explicit shape overrides;
- adapter clamps/resolves geometry but does not search for a “prettier” layout;
- round-screen chord logic is explicit;
- design intent remains reviewable in the recipe.

Refactor use:
When reorganizing existing UI, preserve current Circle/Pill/Rect composition first. Move coordinates/tokens into explicit recipes only when that improves ownership without changing the approved visual mode.

## 6. Shape-local tooling edits

Reference:
- `quickapp/velaclaw-aiot/tools/layout-studio/lib/recipe_file.js`

Pattern:
- an edit to one shape rewrites only that shape block;
- tooling uses the same design source rather than maintaining a second layout truth.

Refactor use:
When introducing editor/preview tooling into an existing app, write back to the canonical design source and constrain edits to the requested scope.

## 7. Explicit mock capability provenance

Reference:
- `quickapp/velaclaw-aiot/src/v2/features/sync/mock_transport.js`

Pattern:
- transport reports `mode: 'mock'` and `realBleAvailable: false`;
- simulation is useful without pretending to be hardware.

Refactor use:
Keep existing demo/fallback behavior if needed, but make provenance explicit before architecture cleanup makes the data path look more authoritative than it really is.

## 8. Refactor-generated tests as architecture contracts

The project history includes contracts for:
- lifecycle ownership;
- persistence single source;
- design view ownership;
- real-data-only health/history behavior;
- shape geometry and text fit;
- supported Vela selectors;
- runtime allocations and storage dedupe;
- page bundle budgets.

Pattern:
A mature refactor converts discovered regressions into narrow executable contracts rather than relying on documentation alone.

Refactor use:
Every time a legacy defect has a stable signature, add the smallest test or audit rule that would prevent reintroduction.
