---
name: 1sat-collections
version: 1.0.0
description: Routing and implementation boundary for the shipped 1Sat collection overlay.
---

# 1Sat collections

The canonical operational guidance lives in `Skill(1sat:collections)`, shipped
from `b-open-io/1sat-sdk`. Load that skill for collection roots, collection
items, collection discovery, collection API routes, SIGMA admission, or BSV21
outputs carrying collection metadata.

This reference exists to keep core agents routed correctly, not to duplicate a
fast-moving protocol implementation. When behavior is in doubt, inspect the
current `b-open-io/1sat-stack` default branch under `pkg/collection`.

## Stable boundaries

- Collection indexing belongs to `pkg/collection`, not `pkg/bsv21`.
- Roots use `tm_1sat_collection`; items use `tm_col_{collectionId}`.
- Both roles require a one-sat inscription, the expected MAP subtype, and valid
  SIGMA. AIP is not accepted by the shipped overlay.
- The verified item signer is stored but is not matched to the root signer or
  current owner at ingest.
- The overlay is mint-only and does not track transfers.
- ORDFS references affect item content delivery, not collection admission.
- BSV21 can carry collection MAP and SIGMA without making collection behavior a
  BSV21 concern.
- The collection module defaults to disabled. Its default `/collection` routes
  are library configuration, not proof that a hosted deployment exposes them.

## Release-state rule

Separate merged stack behavior from SDK proposals. Do not recommend collection
SIGMA helpers, reference-item inputs, generic BSV21 MAP/signing inputs, or a
BSV21 collection helper until those APIs exist in the installed SDK version.
The legacy `mintCollection` and `mintCollectionItem` actions currently emit the
MAP shapes but do not meet the overlay's SIGMA requirement.

Historical design material under `plans/ordfs-collections/` is archived. It
records rejected AIP, root-signer matching, owner-authority, and BSV21 coupling
ideas and must not be used as current implementation guidance.
