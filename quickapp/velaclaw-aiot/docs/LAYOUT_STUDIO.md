# Layout Studio

Layout Studio is a local visual tool for adjusting wearable layout configuration without creating a second runtime design system. It lives in `tools/layout-studio` and works with the project’s existing Scene, Adapter and app layout semantics.

## Start

From `quickapp/velaclaw-aiot`:

```bash
npm run studio
```

The server listens on the local machine. It can also be started without automatically opening a browser:

```bash
node tools/layout-studio/server.js --no-open
```

`LAYOUT_STUDIO_PORT` can be used to change the local port.

## Purpose

The tool shortens the feedback loop for shape-specific layout work:

- choose a supported application surface;
- preview Circle, Pill, or Rect geometry;
- inspect safe areas and resolved layout boxes;
- adjust fields exposed by the tool;
- compare inherited base values and shape overrides;
- save a controlled shape delta back to source.

It is an authoring aid, not a Vela Runtime emulator. Native components, system capabilities, gesture edge cases, text rendering differences and device lifecycle behavior still require simulator or device validation.

## Source of truth

Layout Studio does not own a parallel Adapter. Preview planning uses project runtime modules so that the editor and application share layout semantics.

Layout configuration follows a base-plus-delta model:

```text
base    = shared design intent
circle  = Circle delta
pill    = Pill delta
rect    = Rect delta
```

A shape override should contain only values that differ from `base`. Restoring inheritance removes the shape-specific field rather than copying the base value into every profile.

## Editing model

The Studio interface exposes only configured fields. Typical operations include:

- selecting a component or geometry box;
- moving editable boxes;
- resizing supported dimensions;
- changing numeric values with input or slider controls;
- restoring inheritance;
- saving the draft to source.

Saving writes only to the configured app layout file under:

```text
src/v2/design/apps/<app>/layout.js
```

The server does not perform Git commit, push, or merge operations.

## Security boundary

The local server intentionally keeps a narrow write surface:

- loopback-only listening;
- application and source paths come from configured entries;
- only declared layout fields may be modified;
- request bodies are bounded;
- runtime Adapter safety checks remain authoritative.

## Verification

```bash
npm run studio:check
npm run check
```

After editing, inspect the source diff and run the affected shape in Vela. Visual preview is useful for geometry iteration but is not evidence of native runtime behavior.
