---
name: apple-xcode-build-loop
version: 0.0.1
description: >-
  Use when running or scaffolding an Apple Xcode/SPM agent build loop — Makefile targets, xcodebuild through xcbeautify, warnings-as-errors, simulator destinations, or swift test. Mac-only.
---

# Apple Xcode Build Loop

Give agents a CLI-buildable Xcode/SPM loop before they touch an Xcode project. Encode Makefile targets, readable `xcodebuild` output, warnings-as-errors, and destination policy. Do not invent device names. Do not paste closed-kit or paywalled skill text.

## When

- Scaffolding or hardening an agent-facing build/test loop for an Xcode app or SPM package
- Wiring Ada (pure Swift/AppKit/SwiftUI/SPM) or Kira (native Swift / Frenly-class, not Expo) to a Mac CLI loop
- Adding `build` / `test` / `run` / `lint|format` / `clean` Makefile targets agents can invoke

Not for: Expo/EAS (use `vercel-react-native-skills`); Vercel Native SDK release (`native check|build|package` + `native-sdk-macos-release`).

## Machine

Mac only. Run via ExternalShell / the user's Mac (Mac Studio local is fine). The Linux Grok Bot box cannot run Xcode, simulators, or `xcodebuild`. Same constraint as fleet `ios-app-qa`. Capture the exact failing command when the Mac/toolchain is missing.

## Makefile contract

Prefer a project-root `Makefile` with:

| Target | Role |
|--------|------|
| `build` | `xcodebuild` (or `swift build` for SPM-only) through `xcbeautify` |
| `test` | `xcodebuild test` / `swift test` through `xcbeautify` |
| `run` | Boot sim or launch macOS binary; boot-smoke before "done" |
| `lint` or `format` | House formatter / SwiftLint as the repo already uses |
| `clean` | Clean derived data / build products the project owns |

Do not invent a parallel script tree when a Makefile already exists — extend it. Prefer **buildable folder / file-system synchronized** Xcode groups when scaffolding **new** projects. Do not force-migrate mature repos without product-owner approval.

## xcodebuild + xcbeautify

Pipe agent-facing builds through `xcbeautify` (or `xcbeautify --quieter`) so failures are readable:

```bash
xcodebuild … | xcbeautify
```

If `xcbeautify` is missing, install it on the Mac or fail with the exact command — do not hide raw infinite `xcodebuild` logs as success. Prefer scheme/configuration already in the repo; do not invent scheme names.

SPM packages: `swift build` and `swift test` are valid; still report the exact failing command.

## Warnings-as-errors

For agent loops, enable warnings-as-errors unless the product repo documents an exception:

```bash
SWIFT_TREAT_WARNINGS_AS_ERRORS=YES
```

Pass via `xcodebuild` settings or the project's xcconfig. Do not disable to "get green" without an explicit repo exception.

## Destinations

Never invent simulator or device names.

- Frenly / 1sat-wallet-mobile: follow fleet `ios-app-qa` destination strings (e.g. documented `iPhone 17 Pro` fleet names).
- Other apps: read destinations from the project, shared schemes, or CI config.
- macOS: use the project's macOS destination / `swift build` host; do not invent UDIDs.

If no destination is documented, stop and ask — do not guess.

## Native SDK vs Xcode fork

| Path | Loop |
|------|------|
| Vercel Native SDK (Zig shell) | `native check` → `native build` → `native package`; release via `Skill(native-sdk-macos-release)` |
| Generic Xcode / SwiftUI / AppKit / SPM | This skill: Makefile + `xcodebuild`/`swift` + xcbeautify |

Do not replace `native-sdk-macos-release` with OpenAI `packaging-notarization` for Native SDK apps. OpenAI packaging skills are supplemental for **generic Xcode** only.

## Expo out of scope

Expo / React Native stays on EAS and `Skill(vercel-react-native-skills)`. Do not force an Xcode Makefile loop onto Expo-managed apps. Native modules or pure Swift siblings may use this skill; the Expo app itself does not.

## Done gates

1. `make build` (or documented equivalent) succeeds on the Mac.
2. `make test` / `swift test` / scheme tests pass, or the repo documents why tests are skipped.
3. Boot-smoke (`make run` or launch) before claiming done.
4. Warnings-as-errors on unless a documented exception exists.
5. Destinations came from project or `ios-app-qa` — none invented.
6. On failure: report the **exact** failing command and non-zero exit; do not bypass.

## Third-party Swift pointers

Point, don't vendor. Install/invoke via front-desk Notable third-party skills:

- **Primary:** twostraws `swiftui-pro`, `swift-concurrency-pro`, `swift-testing-pro` (+ `swiftdata-pro` when native persistence)
- **Alts:** AvdLee SwiftUI / concurrency / testing / Core Data / xcode-project-analyzer
- **Plugins:** `openai/plugins` → `build-ios-apps` / `build-macos-apps` (enable plugin; invoke by skill name)
- **Product-repo pattern:** Zabłocki AGENTS.md + rule-loading — pointer only; do not paste rule bodies into prompts

Do not rewrite Hudson/AvdLee skill bodies into this file.

## Explicit bans

- Do **not** paste AppCreator / Super Easy Apps private skill text or paywalled course rules.
- Do **not** vendor `openai/plugins` trees into prompts.
- Do **not** claim the Linux Grok Bot box can run Xcode.
