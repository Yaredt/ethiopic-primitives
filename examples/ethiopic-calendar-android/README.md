# Zemen Calendar for Android

The Android app is a **Trusted Web Activity (TWA)**: a thin Android shell that opens
https://zemencalendars.com full screen. It has no code of its own, so every merge to
`main` (which deploys the site) updates the app too; a new Play release is only needed to
change the shell itself (name, icon, colours).

| File | What it is |
|---|---|
| `twa-manifest.json` | Bubblewrap's project settings (package `com.zemencalendars.app`, colours, icons) |
| `assetlinks.template.json` | The Digital Asset Links file that proves the app and the site belong together |
| `store-listing.md` | Play listing text (English and Amharic) and the Play Console form answers |
| `graphics/` | Icon, feature graphic and phone screenshots for the listing |

## Steps

### 1. Play developer account (owner)

Create one at https://play.google.com/console ($25 once, with identity verification).
New **personal** accounts must run a **closed test with at least 12 testers for 14 days**
before they can publish; an **organisation** account (e.g. in the church's name) skips
this but needs a D-U-N-S number.

### 2. Build the app bundle (`.aab`)

Either:

- **PWABuilder (easiest, no install):** go to https://www.pwabuilder.com, enter
  `https://zemencalendars.com`, choose *Package for stores → Android*, set the package ID
  to `com.zemencalendars.app`, and download. The zip has the `.aab`, a signing key and an
  `assetlinks.json`. **Keep the signing key and its passwords safe.**
- **Bubblewrap (command line):** needs Node and a JDK; it downloads the Android SDK.
  ```sh
  npm i -g @bubblewrap/cli
  cd examples/ethiopic-calendar-android
  bubblewrap init --manifest https://zemencalendars.com/manifest.webmanifest   # accept the values from twa-manifest.json
  bubblewrap build                                                               # → app-release-bundle.aab
  ```

### 3. Upload and let Google sign it

In the Play Console: create the app, then *Testing → Closed testing* (or *Internal testing*
first), and upload the `.aab`. Keep **Play App Signing** on (the default): Google then
holds the final signing key, and your key is only the upload key, which Google can reset
if you lose it.

### 4. Link the app and the site (assetlinks.json)

In the Play Console, *Setup → App signing*: copy the **SHA-256 certificate fingerprint**
of the *App signing key*. Put it in `assetlinks.template.json` in place of
`REPLACE_WITH_…`, and save it as `examples/ethiopic-calendar/.well-known/assetlinks.json`
(served at https://zemencalendars.com/.well-known/assetlinks.json). Without it the app
still works but shows a browser address bar. Check it with
https://developers.google.com/digital-asset-links/tools/generator.

### 5. Store listing

Fill in the listing from `store-listing.md` and upload the files in `graphics/`. The
privacy policy is at https://zemencalendars.com/privacy.html.

### 6. Test, then publish

Invite the testers (an email list or a Google Group), wait out the 14 days if the account
needs it, then *Promote release → Production*. Google's review usually takes a few days.

## Licence note

Keep the app **free and ad-free**: the Amharic Bible text is used under the Bible Society
of Ethiopia's permission for **non-commercial** use.
