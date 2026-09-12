# Failure Playbook

Use this file as a diagnostic index. A known symptom is not permission to apply a memorized patch; confirm the layer and evidence first.

## Architecture contract suddenly fails after a refactor

**Typical symptom**: static test reports a V2 page depends on legacy common code.

**Likely causes**:

- a new import crossed an ownership boundary;
- an architecture test classified a resource path as a code dependency;
- a refactor restored duplicated logic to a page.

**Do not**:

- delete/relax the architecture test immediately;
- move files only to satisfy directory naming;
- duplicate the needed function locally without understanding ownership.

**Diagnose**:

1. inspect the exact import/dependency captured by the failing assertion;
2. classify it as executable dependency vs asset/resource path;
3. locate the canonical owner of the behavior;
4. move/reuse only the real dependency or fix the contract if it is provably misclassifying resources;
5. add a regression fixture for the distinction.

## Circle page shows black bands or excessive inset

**Likely layer**: Scene/safe-area/full-bleed composition.

**Common cause**: treating the safe content rectangle as the whole physical scene or applying round safety to the background itself.

**Do not**: shrink the entire page until the black band disappears.

**Diagnose**:

- confirm root/scene covers physical viewport;
- separate full-bleed background from safe foreground content;
- check round chord constraints only where text/control safety needs them;
- verify on the actual round simulator/profile.

## Circle text/control clips near top or bottom chord

**Likely layer**: shape-specific design geometry.

**Diagnose**:

- compute/check available chord width at the band's vertical position;
- inspect line box and text width, not only element center;
- keep title/pager/action bands inside stable chords;
- add text-fit/geometry contract and runtime screenshot/smoke evidence.

## Pill value or long label overflows

**Likely causes**: width copied from Circle/Rect, font size not tested with realistic values, padding amplifies outer box.

**Do not**: globally reduce typography for every shape.

**Diagnose**:

- test long values and localization;
- separate outer geometry from content box/padding;
- use a Pill-specific delta when semantics are shared but available width differs.

## Padded cards drift or gaps amplify

**Likely cause**: confusing content-box dimensions with rendered outer dimensions.

**Diagnose**:

- determine whether Vela component padding grows the rendered box for the target component;
- specify desired outer geometry first;
- derive assigned content width/height from padding;
- use explicit gap rather than assuming browser box-model behavior.

## Launcher swipe/tap behaves inconsistently

**Likely layer**: hitbox / gesture ownership / navigation timing.

**Common causes**:

- visual children exist but root surface has no full-screen hitbox;
- drag handling consumes taps;
- multiple callbacks trigger navigation;
- route begins before gesture completion.

**Diagnose**:

- make interaction surface geometry explicit;
- preserve tap path until drag threshold is crossed;
- dedupe navigation;
- complete gesture state before route transition;
- release drag timers/listeners on hide/destroy.

## Health/Workout UI displays plausible values without real samples

**Severity**: product/data integrity failure.

**Do not**: seed random/history/demo values to make the screen look finished.

**Diagnose**:

- trace provenance to official capability callback/repository;
- preserve `live/system/persisted/estimate/mock/unavailable` status;
- display waiting/unavailable when no credible sample exists;
- regression-test the no-sample state.

## Workout receives heart rate after pause/exit

**Likely layer**: lifecycle owner / stale callback.

**Diagnose**:

- confirm one controller owns subscription;
- stop/unsubscribe on pause/finish/cancel/hide as product semantics require;
- reject callbacks when runtime owner inactive;
- use lifecycle generation/token to ignore callbacks from replaced async work.

## Async hydration overwrites newer state

**Likely cause**: callback from older load applies after new lifecycle/request begins.

**Fix pattern**: generation/token guard plus serialized persistence where needed.

**Do not**: solve only with arbitrary `setTimeout` ordering.

## Same setting/activity/history diverges between screens

**Likely cause**: multiple storage readers/writers or page-local persistent copies.

**Diagnose**:

- identify canonical repository/store;
- route reads/writes through it;
- make page/design state derived;
- serialize read-modify-write;
- test concurrent or sequential hydration/persistence behavior.

## Mock sync looks like real BLE

**Severity**: product-truth failure.

**Rule**: transport capability must explicitly report mock/simulated status; UI/docs must not call it real BLE unless real hardware transport has been implemented and verified.

## Browser-valid CSS fails Vela checks

**Likely cause**: unsupported selector/property, often descendant/advanced selector assumptions.

**Diagnose**:

- check current Vela style documentation;
- replace unsupported selector with explicit supported class structure;
- add source compatibility regression test.

## Bundle budget jumps after small change

**Likely causes**:

- accidental import from broad common/legacy module;
- duplicated static data;
- debug/source-map payload;
- renderer/feature dependency pulled into many pages.

**Diagnose**:

- compare per-page bundle sizes before/after;
- inspect dependency diff;
- preserve architecture boundaries while reducing imported surface.

## Build succeeds but target shows default/old interface

**Likely layer**: artifact/install/launcher, not UI source.

**Diagnostic order**:

`source changed → bundle rebuilt → RPK rebuilt → correct package id/version → install succeeded → launcher selected package → correct route`

Only inspect page logic after these facts are proven.

## Install reports maximum application/package limit

**Do not**: switch away from a competition-mandated image merely to make installation easy.

**Diagnose**:

- confirm target simulator/image;
- inspect installed app/package count if tooling supports it;
- remove obsolete development packages only when allowed;
- preserve the mandated environment and verify package identity/update semantics.

## Layout Studio preview differs from runtime intent

**Likely causes**:

- Studio has a second layout algorithm;
- preview reads different config than runtime;
- tool rewrites more than the selected shape;
- runtime adapter silently repositions content.

**Guardrail**:

- reuse the same Scene/Adapter/layout semantics;
- preview real design source;
- save local shape deltas only;
- keep runtime adapter constraining, not redesigning;
- still validate final geometry in Vela Runtime.

## Shape-specific edit changes unrelated shapes

**Diagnose**:

- check `base` vs shape override ownership;
- ensure editing tool mutates only selected shape block;
- add source-level test proving Pill edit leaves Circle/Rect unchanged;
- move value to `base` only if all shapes genuinely share it.

## Large rewrite proposed for a small regression

**Stop condition**: if the regression can be fixed by restoring an invariant, lifecycle owner, canonical data path, or shape-specific recipe, do that first.

A rewrite is justified only when the existing abstraction cannot express the correct behavior without repeated violations.
