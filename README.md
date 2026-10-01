# Examen civique — Android app

Offline civic-exam trainer (naturalisation track). The web app in `web/` is the single
source of truth; the Android shell in `app/` runs it with no internet permission.

- **Package:** `com.magdi.examencivique` (permanent once on Google Play)
- **Min Android:** 8.0 (API 26) · **Target:** API 36
- **Permissions:** none
- **Every build** first validates the content and runs 93 behavioural tests; if one fails, no APK is produced.

---

## One-time setup (≈15 minutes)

### 1. Create the repository
GitHub → **New repository** → name `examen-civique-android` → **Private** → *no* README → Create.

### 2. Upload the project
On the empty repo page: **uploading an existing file** → drag the *contents* of this folder
(including the hidden `.github` folder — on Mac press `Cmd+Shift+.` to show it; on Windows
enable "Hidden items") → **Commit changes**.

> Never upload `upload-keystore.jks` or `SIGNING-SECRETS.txt`. They are in a separate folder on purpose.

### 3. Add the 4 signing secrets
Repo → **Settings → Secrets and variables → Actions → New repository secret**.
Copy the 4 name/value pairs from `SIGNING-SECRETS.txt`:
`KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`.

### 4. Build
Repo → **Actions** → **Build APK** → **Run workflow**. Takes ~5 minutes.
A green check = success. Open the run → **Artifacts** → download `examen-civique-apk`.

### 5. Install on your phone
1. Unzip; send `examen-civique.apk` to your phone (Drive, email, cable).
2. Open it → allow "Install unknown apps" for that app (one time) → Install.
3. Optional check: the SHA-256 of the APK must match `SHA256.txt` in the same download.

### Updating the app later
Edit files in `web/` (content is in `web/data.js`), increase `versionCode` (+1) and
`versionName` in `app/build.gradle`, commit — a new APK is built automatically and installs
over the old one **keeping your progress**, as long as it is signed with the same key.

---

## Doing steps 1–4 with Claude in Chrome

Open github.com (logged in), open Claude in Chrome, and paste:

> Create a new private GitHub repository named "examen-civique-android" with no README.
> Then guide me to upload the project folder I have on my computer (I will select the files
> myself in the upload dialog, including the hidden .github folder). After the commit, open
> Settings → Secrets and variables → Actions and help me create 4 repository secrets:
> KEYSTORE_BASE64, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD — I will paste the values
> myself. Finally, open Actions, run the "Build APK" workflow and tell me when it is done.

Paste the secret values yourself — do not put them in the chat prompt.

---

## If the build fails
Open the failed step in Actions and copy the last ~30 lines of the log back into the
Claude chat. The most likely first-run issue is a version mismatch in `build.gradle`
(Android Gradle Plugin), which is a one-line fix.

## Google Play (later)
- Upload `app-release.aab` (artifact `examen-civique-playstore-aab`), not the APK.
- Enrol in **Play App Signing**; this key then serves as your *upload key*.
- Privacy policy: `docs/privacy-policy.md` (publish it, e.g. with GitHub Pages, and add your email).
- Store icon: `docs/store-icon-512.png`.
- New personal developer accounts need a closed test with ≥12 testers for 14 consecutive days.

## Licences
- Official question wording: DGEF, Etalab Open Licence 2.0 (attribution in the app's "À propos").
- Fonts: Atkinson Hyperlegible and Newsreader, SIL Open Font License (`app/src/main/assets/fonts/OFL.txt`).
