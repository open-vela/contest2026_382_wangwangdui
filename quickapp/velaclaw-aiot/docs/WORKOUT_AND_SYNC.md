# Workout and Sync

This document defines the product boundary for workout recording and synchronization. It distinguishes system-backed data, deterministic estimation, persistence, and the simulated transport layer.

## Workout lifecycle

The workout domain maintains one active session with running and paused states. Supported user actions include start, pause, resume, finish, cancel, and recovery of an unfinished persisted session.

A completed workout is persisted as history. Cancelling removes the active session without creating a completed record.

## Metrics

### Steps, calories, and estimated distance

The workout state machine advances deterministic activity metrics while a session is running. These values are suitable for application behavior and simulator demonstration; they are not a claim of device-grade sports algorithms.

When valid location samples are available, the location path can contribute GPS distance. When a trustworthy location path is unavailable, the UI can use the session’s estimation path and should keep the distance source understandable.

### Heart rate

Workout heart rate follows a stricter rule:

- a new session starts without a heart-rate sample;
- the Feature subscribes through `src/capabilities/heart_rate.js`;
- only accepted live system samples update workout heart rate;
- compatibility fallback samples are rejected for workout presentation;
- pause, finish, cancel, hide, and teardown release the heart-rate consumer through the workout owner;
- a session with no accepted sample stores no fabricated average heart rate.

This rule prevents an attractive but synthetic heart-rate curve from being confused with system telemetry.

## Location

The location capability wraps `system.geolocation`. The workout path is responsible for starting and stopping location use with the active session.

Distance calculation should reject obviously invalid jumps and release the subscription when the workout no longer needs it. Location availability depends on the Vela image and emulator/device plumbing; interface presence alone does not prove valid GNSS samples are flowing.

## Persistence

Workout state and completed records are stored through domain persistence rather than page-local storage. Read-modify-write operations must be serialized when concurrent updates could overwrite each other.

Recovered sessions must preserve data provenance. A restored heart-rate value is not treated as official unless its stored source proves that status.

## Sync payload

The synchronization domain assembles application data into a versioned payload and packet sequence. The protocol layer owns:

- payload structure;
- transfer identity;
- packet sequence and total count;
- progress semantics;
- acknowledgement ordering;
- marking records after a completed transfer.

These semantics are intentionally separate from the physical transport so that the transport can be replaced without rewriting the application’s business payload.

## Transport boundary

The repository transport used by the demonstration path is simulated. It provides connect, send, progress, acknowledgement, and disconnect behavior for validating the application flow, but it does not claim BLE scanning, pairing, GATT connection, or characteristic writes.

If a supported device transport is introduced, it must address at least:

- peer discovery and connection lifecycle;
- service and characteristic identifiers;
- byte encoding and negotiated MTU;
- timeout and retry behavior;
- acknowledgement semantics;
- disconnect and page teardown cleanup;
- protocol-version compatibility.

The existing payload and packet semantics may be reused only if the transport preserves their ordering and acknowledgement contract.

## Verification

Useful repository checks include:

```bash
npm run workout:experience
npm run capabilities:check
npm run check
```

Runtime acceptance should also cover pause/resume, session recovery, no-heart-rate state, live heart-rate arrival, location loss, leaving the page during an active resource subscription, and interruption during synchronization.
