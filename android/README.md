# Special Gadi Ghar – Android APK

A small native Android app that opens the shop app (`docs/`, served by GitHub Pages) full screen, with its own icon.
It adds what a plain web view can't do:

- **Share** bill / receipt / order pictures and PDF / Excel reports through the Android share sheet (WhatsApp etc.)
- **Download** buttons save into the phone's *Downloads* folder; **Open** opens the PDF / Excel in another app
- WhatsApp (`wa.me`), phone (`tel:`) and Google Drive links open in their own apps
- `confirm()` pop-ups, the **back button** (closes a window → goes Home → leaves the app) and a "No internet" page

The screens themselves still come from GitHub Pages, so changes to `Index.html` / `docs/` reach the APK without a new
APK. A new APK is needed only when something in this `android/` folder changes, or the Pages link changes
(`app/src/main/res/values/strings.xml` → `app_url`).

The ready APK is published at `docs/SpecialGadiGhar.apk`, i.e.
`https://mrktechnicallevels-prog.github.io/ShopINvesntory_BahiKhataApp/SpecialGadiGhar.apk`.

## Install on a phone
1. Open the APK link above in Chrome on the phone → download.
2. Open the downloaded file → allow **Install unknown apps** for Chrome when asked → **Install**.
3. Open **Special Gadi Ghar** → tap your name → PIN.

## Build it again
Needs JDK 17+ and the Android SDK (platform 35, build-tools 35).

```bash
cd android
echo "sdk.dir=/path/to/android-sdk" > local.properties
./gradlew assembleRelease
cp app/build/outputs/apk/release/app-release.apk ../docs/SpecialGadiGhar.apk
```

Raise `versionCode` / `versionName` in `app/build.gradle` for each new APK.

### Signing key (keep it safe, never commit it)
Updates install over the old app only if they are signed with the **same key**. Put the key file
`special-gadi-ghar-release.jks` and `keystore.properties` (store file, passwords, alias) in this `android/` folder before
building. Both are listed in `.gitignore`. Without them the build is signed with a debug key, and phones must uninstall
the old app first (they then need to log in again; no shop data is lost, it is all in the Google Sheet).

For the Play Store, build an app bundle instead: `./gradlew bundleRelease` → `app/build/outputs/bundle/release/app-release.aab`.
