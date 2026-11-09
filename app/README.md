# Special Gadi Ghar – Android app

This folder is the installable app (a PWA: a web app Android installs like a normal app, with its own icon,
full screen, no Google bar). It shows the same screens as the Google Apps Script version and uses the **same
Google Sheet**. Instead of a Google login, each person logs in with their **own PIN**.

```
Phone app (this folder, on GitHub Pages)  ──PIN login──▶  Apps Script (Code.gs)  ──▶  Google Sheet (all data)
```

## Is it safe to keep this repository public?

Yes. These files contain **no data and no PIN**: only the screens, the shop name/address/phone (already on every
bill) and the address of the Apps Script. All data stays in the Google Sheet.

- The PIN is checked **inside Apps Script**, not on the phone, so nobody can skip it by reading this code.
- PINs are stored **scrambled (SHA-256 with salt)** in Apps Script's private settings, never in this repository.
- **5 wrong PINs** lock that person for 15 minutes; 30 wrong PINs in an hour pause all logins for an hour.
- A login lasts **30 days** on a phone. **Changing a person's PIN logs them out everywhere** (use this if a phone is lost).
- Only the app's own actions can be called; setup and admin functions cannot be reached from outside.
- Use a PIN that is not easy to guess: 6–8 digits, not 111111 / 123456 / a birth year. Don't post the PIN in groups.

## One-time setup (about 15 minutes)

### 1. Update the Apps Script code
Paste the latest `Code.gs` and `Index.html` into Apps Script as usual, Save (⌘+S), choose **setup** and **Run**.

### 2. Set the PINs (in the Google Sheet)
1. Reload the Google Sheet. Open the menu **Shop / दुकान → Set app PIN for a person**.
2. Name: `Imran` → PIN: (6–8 digits) → OK.
3. Again for the father, e.g. name `Abbu` → his own PIN.

`Shop → Show app users` lists who can log in; `Shop → Remove a person from the app` removes someone.

### 3. Make a second deployment for the app
Keep the existing deployment as it is. Make a new one:
1. Apps Script → **Deploy → New deployment → ⚙️ → Web app**.
2. Description: `Android app` · **Execute as: Me** · **Who has access: Anyone** → **Deploy** → allow permissions.
3. Copy the **Web app URL** (ends in `/exec`).

("Anyone" is needed so the phone app can reach the script; the PIN check protects the data. Opening that URL
in a browser shows "Access denied", which is correct.)

### 4. Put the app on GitHub Pages
1. Put these files at the top level of the public repository: `index.html`, `config.js`, `manifest.webmanifest`,
   `sw.js`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`.
2. Open `config.js` on GitHub (✏️ edit) and paste the Web app URL from step 3 in place of `PASTE_APPS_SCRIPT_URL_HERE`. Commit.
3. Repository **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main, / (root) → Save**.
4. After about a minute the app is live at `https://<github-username>.github.io/<repository-name>/`.

### 5. Install on each Android phone
1. Open the link from step 4 in **Chrome**.
2. Tap **Install app** when Chrome offers it (or **⋮ → Install app / Add to Home screen**).
3. Open **Special Gadi Ghar** from the home screen → tap your name → enter your PIN.

### 6. (Optional) A real APK or Play Store app
1. Go to **pwabuilder.com**, enter the app link from step 4, click **Package for stores → Android**.
2. Download the package. The `.apk` inside can be installed directly on phones (allow "Install unknown apps").
3. For the Play Store you need a Google Play developer account (one-time fee) and to upload the `.aab` file.

## Updating later
- **Code.gs changed:** paste it, Save, then **Deploy → Manage deployments → ✏️ on "Android app" → Version: New version → Deploy**.
  The URL stays the same, so `config.js` doesn't change. (Do the same for the old Google-login deployment if you still use it.)
- **Screens changed (Index.html):** run `python3 tools/build_app.py` and copy the new `index.html` into this repository.
  Phones pick up the new version the next time the app is opened with internet.

## If something goes wrong
| Problem | Fix |
|---|---|
| "Could not reach the shop server, or no PIN has been set yet" | Check `config.js` has the right `/exec` URL, the deployment is **Execute as Me / Anyone**, and at least one PIN is set (step 2). |
| "Wrong name or PIN" | Check the PIN. After 5 wrong tries wait 15 minutes, or the owner sets a new PIN (step 2). |
| "Please log in again" | The 30-day login ended or the PIN was changed. Log in with the current PIN. |
| No "Install app" in Chrome | The link must be the `https://…github.io/…` address (not a file). Reload once; then use ⋮ → Add to Home screen. |
| Changes to Code.gs don't show | You must deploy a **New version** of the "Android app" deployment (see Updating). |
