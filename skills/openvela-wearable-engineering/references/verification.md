# Verification and Evidence

A wearable engineering claim is only as strong as the evidence class that supports it.

## Evidence classes

### E1 — Source / static contract

Can prove:

- dependency direction;
- known source patterns;
- pure calculations;
- state-machine transitions;
- manifest declarations;
- unsupported import/selector guards;
- serialization invariants;
- bundle-size thresholds when measured from generated bundles.

Cannot prove:

- actual rendered geometry;
- touch/gesture behavior;
- target-device API availability;
- physical sensor behavior;
- real power consumption.

### E2 — Build / packaging

Can prove:

- Vela parser/toolchain accepts source;
- bundling/JSC succeeds for selected build path;
- RPK/package artifact can be produced;
- artifact size/budget facts.

Cannot prove the target installed or launched the intended artifact.

### E3 — Shared-semantics preview/tool

Can prove:

- design recipe resolves under the same project Scene/Adapter semantics;
- constrained design fields produce expected plan/boxes;
- source rewrite/diff isolation when the tool itself is tested.

Cannot prove Vela Runtime layout, gesture engine, native APIs, or device behavior.

### E4 — Simulator / Vela Runtime

Can prove for the tested image/profile:

- page launches;
- geometry and clipping;
- navigation/gestures;
- many lifecycle behaviors;
- runtime selector/layout compatibility;
- some native capability behavior exposed by that image.

Cannot automatically prove a physical product supports the same hardware API or performance.

### E5 — Physical device

Can prove for the tested device/firmware:

- real hardware capability;
- sensor/geolocation/health behavior;
- physical interaction quality;
- hardware-specific lifecycle/performance/power observations.

Do not generalize one device result to every supported model without evidence.

## Change-to-evidence matrix

| Change | Minimum early evidence | Before strong product claim |
| --- | --- | --- |
| pure domain calculation | E1 tests | E1 sufficient if runtime-independent |
| state-machine transition | E1 tests | E1 + affected feature integration; E4 if lifecycle/timing matters |
| storage/repository | E1 serialization/race tests | E4 restart/recovery for important flows |
| native capability wrapper | E1 source/failure tests | E4/E5 based on claimed target support |
| Circle/Pill/Rect layout | E1 geometry/text contracts | E4 on affected profiles |
| gesture/navigation | E1 interaction contracts | E4 runtime smoke |
| Layout Studio/tooling | E1 tool tests | E3; E4 for final runtime claim |
| memory/allocation optimization | E1 regression guard when possible | measurement/runtime evidence appropriate to claim |
| bundle optimization | E2 measured bundle sizes | E2; E4 if behavior/performance claim extends beyond size |
| build/packaging fix | E2 build artifact | E4 install/launch if claiming runnable |
| health/workout real-data path | E1 provenance/lifecycle tests | E4/E5 depending simulator/device capability |

## Shape matrix

For multi-screen work, explicitly record affected profiles. A representative matrix may include:

- Circle 466×466 / 480×480;
- Pill 192×490 / 212×520;
- Rect 336×480 / 432×514;

Use the profiles actually required by the current product and official toolchain. Do not claim “all screens” after testing one representative shape.

## Capability matrix

Native capability support can differ by product/image. Record:

```text
feature/API:
manifest declared:
permission declared:
API level:
simulator image/profile:
simulator result:
physical device/firmware:
device result:
fallback behavior:
```

An `unsupported` result is a valid product fact. Handle it explicitly instead of hiding it.

## Runtime smoke template

For each affected shape/flow:

```text
commit/artifact:
image/profile/device:
launch: pass/fail
primary layout: pass/fail
text fit: pass/fail
scroll/paging: pass/fail
primary tap: pass/fail
gesture path: pass/fail
back/exit: pass/fail
hide/show: pass/fail
resource release observable: pass/fail/unknown
native capability: pass/fail/unsupported/not tested
notes:
```

## Truthful completion language

Prefer precise claims:

- `Architecture contracts pass.`
- `JSC debug RPK built successfully.`
- `Circle 466×466 simulator smoke passed for launch, swipe, and text fit.`
- `Geolocation fallback is implemented; physical-device support was not tested.`

Avoid:

- `Fully verified` when only static tests ran.
- `Works on device` when only the simulator ran.
- `Real BLE` when transport is mocked.
- `Health data works` when the tested path only exercises missing-sample UI.

## Regression test rule

When a bug is fixed, add the cheapest reliable guard that catches the same class again:

- architecture bug → dependency/source contract;
- geometry bug → layout/text/box contract plus runtime smoke;
- lifecycle bug → owner/subscription/timer contract;
- stale async bug → generation/token test;
- data provenance bug → source-status contract;
- unsupported CSS/API → compatibility scan;
- bundle regression → page budget check;
- tooling isolation bug → no-op/shape-local round-trip test.

Runtime-only bugs still deserve static guards where possible, but the guard must not be presented as proof that runtime behavior itself was observed.
