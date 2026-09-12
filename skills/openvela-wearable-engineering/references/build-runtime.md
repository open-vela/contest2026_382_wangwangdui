# Build and Runtime Diagnosis

Treat build/runtime failures as a pipeline. Identify the failing layer before changing application logic.

## Pipeline

```text
source
  ↓
Vela parser / supported JS-CSS subset
  ↓
bundler
  ↓
JSC or selected runtime compilation
  ↓
RPK packaging
  ↓
install / update
  ↓
launcher package resolution
  ↓
router / page lifecycle
  ↓
native capability availability
```

A success at one layer proves only that layer.

## Environment inventory

Record before debugging:

- Node.js version;
- npm/package lock state;
- AIoT Toolkit / IDE version;
- build command and mode;
- target image/version;
- target profile/skin/resolution;
- package ID, `versionName`, `versionCode`;
- debug vs release artifact;
- installed package/version on target when observable.

Do not change several environment variables and application code at once when trying to isolate a failure.

## Source / parser failures

Symptoms:

- syntax errors only during Vela build;
- unsupported selector/property;
- runtime module resolution failure despite Node tests passing.

Check:

1. Is runtime code using Node built-ins or browser globals?
2. Is the JavaScript syntax supported by the target Vela environment/toolchain?
3. Are `.ux` selectors/properties documented by Vela?
4. Did a refactor accidentally import tooling/server code into runtime source?
5. Are resource paths being mistaken for JavaScript module dependencies by static checks?

Do not “fix” a platform subset error by transpiling unsupported behavior into an unverified runtime trick unless the official toolchain documents it.

## Bundler / JSC failures

Check:

- exact page/module reported;
- circular or legacy dependencies;
- bundle-size regressions;
- source-map/debug payload accidentally embedded;
- whether build scripts are doing duplicate JSC passes;
- whether package metadata and lockfile assumptions are consistent;
- whether a page imported a large common module after an architecture change.

A successful non-JSC JavaScript bundle does not automatically prove JSC compilation.

## RPK packaging failures

Check:

- manifest validity;
- required icons/resources exist at packaged paths;
- package/version metadata;
- signing/release configuration if applicable;
- output artifact timestamp/hash after source changes;
- whether the command produced debug or release RPK.

Do not assume the newest-looking filename contains the newest source. Confirm the artifact was rebuilt after the intended commit.

## Install failures

When install fails or reports capacity/package limits:

- inspect existing installed apps/packages where tooling allows;
- confirm update vs fresh-install semantics;
- verify package identity is the expected one;
- remove obsolete development packages if competition/device rules allow;
- do not switch to a different system image when the required image is mandated by the task/competition merely to bypass a limit.

Keep the required test environment fixed while diagnosing.

## “Simulator runs, but not our code” diagnostic tree

This failure is usually downstream of source logic. Check in order:

1. Did the intended source file actually change in the branch/worktree being built?
2. Did the bundle rebuild after that change?
3. Did the RPK rebuild after the bundle?
4. Is the RPK package ID the application package ID expected by the launcher?
5. Did installation succeed, update the existing package, and target the intended simulator?
6. Is the launcher opening that package rather than a built-in/default app?
7. Is the manifest router entry correct?
8. Does the route reach the intended page?
9. Only then inspect page/business logic.

Do not rewrite UI code to fix a stale/wrong installed artifact.

## Router / lifecycle failures

Check:

- route exists in manifest;
- URI/path exactly matches runtime expectations;
- params are explicitly passed where required;
- navigation is not duplicated by multiple gesture callbacks;
- asynchronous navigation has not outlived the page;
- page root owns a real hitbox for gestures/taps;
- onShow/onHide/onDestroy resource transitions remain paired.

## Native capability failures

Distinguish:

- API not declared;
- permission not declared/denied;
- method unsupported on target device/image;
- capability available but no sample yet;
- callback arrived after feature stopped;
- project adapter deliberately fell back.

Do not convert “unsupported/unavailable” into a fake success value.

## Metadata consistency

Version metadata can exist in several places: package manifest, package manager metadata, lockfile root metadata, generated artifact names, or release scripts.

When changing product version:

1. inventory all version sources;
2. decide which are authoritative;
3. update them intentionally;
4. build and verify artifact naming/content;
5. avoid opportunistic version bumps during unrelated architecture/document work.

## Reproducible failure report

Capture:

```text
branch / commit:
Node:
AIoT Toolkit / IDE:
image:
profile / skin:
build command:
artifact:
package id/version:
install result:
launch path:
observed logs:
expected behavior:
strongest evidence collected:
```

Separate assumptions from observed facts.
