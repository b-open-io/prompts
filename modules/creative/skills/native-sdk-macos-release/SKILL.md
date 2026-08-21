---
name: native-sdk-macos-release
version: 0.0.1
description: >-
  Use when scaffolding or shipping a Vercel Native SDK macOS app — native check/build, Developer ID sign, DMG, notary, staple.
---

# Native SDK macOS Release

Ship a Vercel Native SDK macOS app. Happy path is native package with identity signing and --archive, then Apple notary submit and staple. Leave Apple IDs, Team IDs, keychain profiles, bundle IDs, and identity strings as inputs. Do not copy CLI versions from an exemplar. If a flag is not here, look it up from the installed CLI help at run time.


## Inputs

- App directory
- Signing identity, Team ID, Apple ID, keychain profile as inputs
- Entitlements path, version / git tag

## Constants

- Binary: zig-out/bin/
- Package: zig-out/package/
- Default web_engine: system
- DMG from --archive
- Notary is manual after native package (not inside it)

## Gates (do not skip)

1. Run native version / check the installed CLI before scaffold or migrate.
2. Run macos-design before consequential chrome (windows, traffic lights, menus, keyboard, light/dark).
3. Boot-smoke the binary under zig-out/bin/ before signing or notarization.
4. Align app.zon / app.json version with the git tag and the artifact pathname.
5. Immutable versioned artifact paths; fail on overwrite.
6. Diagnose SDK / Zig / Xcode / WebKit / signing failures at the source. Do not bypass. Signing diagnose: `codesign --verify --deep --strict` and `codesign --display --entitlements :-`.
7. System WebView default. CEF/Chromium only with a documented engine requirement.
8. Wails / Electron / ElectroBun = migration inventory only, never a starting stack.
9. visual-review + confess before done. TokenPass desktop is abandoned; do not run this skill against it.

## Command sequence (new work)

Use the CLI the target already pins. Do not copy versions from an exemplar.

    native version
    native init {path} --template zig-core --frontend native
    # --frontend next|vite|react only for a WebView wrap
    # --full writes build.zig / build.zig.zon; native eject does the same later
    # Zero-config apps do not need eject to package

    native doctor --manifest app.json --strict
    # app.zon still valid fallback
    native validate app.json
    native test
    # refreshes zig-out/model-contract.zon for typed native check
    native check
    # --strict means fail on warnings. It is not "structural only".
    # Missing zig-out/model-contract.zon (run native test first) makes check structural only.
    native dev
    native build

Boot-smoke zig-out/bin/ here. Do not sign a binary that will not launch.

    native package --target macos --signing identity --identity "Developer ID Application: {Name}" --entitlements assets/native-sdk.entitlements --team-id {TEAMID} --archive

Signing modes: none (default), adhoc (local), identity (requires --identity). Notary is not inside native package. zig build notarize is framework-repo only and does not call notarytool. Generated apps submit and staple by hand.

Default DMG: zig-out/package/{app}-{version}-macos-ReleaseFast.dmg
Keychain item and profile names are inputs. AC_PASSWORD is a doc example, not a house constant.

    xcrun notarytool submit {dmg} --apple-id {email} --team-id {TEAMID} --password "@keychain:{ITEM}" --wait
    xcrun stapler staple {dmg}
    xcrun stapler validate {dmg}
    # fail: xcrun notarytool log {submission-id}
    # alt auth: notarytool store-credentials / --keychain-profile {profile}

Diagnose signing at the source. Do not bypass.

    codesign --verify --deep --strict
    codesign --display --entitlements :-


House Agent Master (private b-open-io/agent-master-native, checkout ~/code/agent-master-native) is not the generic happy path: native package signed .app, then hdiutil create -format ULFO, then codesign --timestamp + notarytool. Bundle id ai.bopen.agent-master is that repo only — not a skill constant. Do not copy scripts or version pins from it.
TokenPass desktop is abandoned; do not run this skill against it.

## Manifest

app.json preferred (new); app.zon still supported. Fields that drive the package: id, name, display_name, version, icons, platforms, web_engine, dmg{}, permissions, file_associations, url_schemes. Default web_engine is system. icons is one square source (assets/icon.png 1024 or svg); SDK builds icns/ico. dmg{} is optional; defaults already make a 660 by 400 drag-to-Applications DMG.

native package writes Contents/MacOS/{bin}, Contents/Resources/AppIcon.icns, Contents/Info.plist, Contents/Resources/assets/ (or dist/ if a web frontend). LSMinimumSystemVersion 11.0.

## Failure modes (gates)

- Missing or wrong CLI: capture native version plus the exact failing command. Do not copy exemplar pins.
- native check without native test first: model contract not yet built — structural only.
- Unsigned or adhoc plus quarantine: Gatekeeper cannot check for malicious software. Expected. Right-click Open. Not a package bug.
- Gatekeeper says damaged: bundle mutated after sign (broken resource seal). Rebuild and resign. Real defect.
- identity without Developer ID, entitlements, or team-id: signing or notarize will fail. Keep those as skill inputs.
- Hardened runtime off: Apple notary rejects (executable does not have the hardened runtime enabled). Diagnose with `codesign --verify --deep --strict` and `codesign --display --entitlements :-`.
- notarytool status Invalid, stapler Error 65, or Record not found: submission invalid. On fail: xcrun notarytool log {submission-id}. Do not staple a failed ticket.
- CEF/Chromium: sign after native cef install --version {pinned} plus bundle. Gatekeeper reject: check Contents/Frameworks, nested helpers signed, package rebuilt after CEF bump.
- Manifest, icon, or dmg canvas mismatch: native validate / package reject. Do not hand-edit Info.plist to paper over it.
- Version drift: app.zon/app.json version != tag != artifact path. Fail the release.
- Overwrite of a versioned artifact path: fail.
- Legacy Scribe.app is ElectroBun plus bun:sqlite. Do not treat that packaging path as Native SDK. Ada owns a future Native SDK port; Jason owns scribe-update-qa.

## Out of scope

- Invented hdiutil or codesign one-liners as the happy path. Happy path is native package --signing identity --archive, then notarytool plus stapler.
- CEF as default.
- ios-app-qa, Electron/Wails starters, convert-web-app (Orbit).
- TokenPass desktop is abandoned; do not run this skill against it.
- CloudAgent/PR ship (Kayle). Ada implements desktop; Kayle ships the PR.

## Sourced notes (do not invent)

Identity sign (vercel-labs/native codesign.zig): codesign --sign {identity} --force --deep --options runtime, plus entitlements file when given. Hardened runtime is on for identity sign. Apple also wants a secure timestamp. That timestamp flag is not in the codesign.zig Ada can see. Confirm on the installed CLI and codesign -dvv. Do not claim native package adds the timestamp flag.
Official generated-app notary is the DMG after --archive. The toolkit also has an internal zip-the-.app helper (ditto keepParent, then notary on the zip, staple the .app). Do not teach that as the happy path.
zig build notarize is framework-repo only and does not call Apple notary. Generated apps submit and staple by hand.
Do not invent disk-image create one-liners. Official DMG is --archive. Apple image verify is an integrity check only.
Alternate Apple auth (same tool): store-credentials {profile} with apple-id, team-id, and password, then submit the file with --keychain-profile {profile} --wait, then log {submission-id} with that profile. Profile names are inputs. AC_PASSWORD and notarytool-password are doc examples, not house constants.
Starter entitlements in the toolkit: com.apple.security.cs.allow-unsigned-executable-memory and com.apple.security.network.client (assets/native-sdk.entitlements). Do not copy unsigned-memory or CEF entitlements unless the app needs them.
Private repo b-open-io/agent-master-native is real (~/code/agent-master-native). House path is not the generic happy path. Bundle id ai.bopen.agent-master is that repo only, not a skill constant. Do not copy scripts or version pins.
Zig 0.16.0 is what current native-sdk.dev/quick-start states. Still do not pin it by habit. Installed CLI plus target lockfiles win.


House Agent Master (b-open-io/agent-master-native) uses native package signed .app, then hdiutil create -format ULFO, then codesign --timestamp + notarytool. Do not treat that as invented, and do not make it the default.
--timestamp is real on that house resign; unconfirmed inside native package. Confirm with codesign -dvv.
TokenPass desktop is abandoned; do not run this skill against it.
