# Google Play Store Submission Kit — Lyric Humanizer

App: **Lyric Humanizer** · appId `com.potentiallyhuman.lyrichumanizer` · versionCode 1 / versionName 1.0
Type: Capacitor (Android) wrapper around a 100% on-device, offline PWA. No network, no accounts, no ads, no data collection.
_Researched against current Google Play docs on 2026-06-04. Google changes these often — re-verify the linked pages before you submit._

---

## ⚠️ READ THIS FIRST — BLOCKERS & "CAN IT PUBLISH TOMORROW?" VERDICT

### VERDICT: ❌ NO — it cannot go live in Production tomorrow (if you use a NEW PERSONAL account).

There are **two hard blockers**, one human-process and one technical:

### 🚧 BLOCKER 1 (the big one): the 12-tester / 14-day closed-test rule
Any **personal** Google Play developer account **created after 2023-11-13** must run a **closed test with at least 12 opted-in testers, kept opted-in continuously for 14 days**, and *then* apply for production access (Google reviews that application, typically up to ~7 days). The original number was 20; Google **reduced it to 12 on 2024-12-11**, but the rule itself is fully in force in 2026.

**Consequence:** earliest possible Production go-live ≈ **15–22 days** after you create the account and start the closed test (14 days continuous + production-access review + standard app review). It physically cannot be tomorrow on a fresh personal account.

**Workarounds (pick one):**
1. **Start the closed test ASAP** (today). Upload the AAB to the **Closed testing → "Closed testing" track**, create a tester email list of **≥12 people** (use 15–20 for a safety margin against opt-outs), get them all to accept the opt-in link and install. The 14-day clock starts when they're opted in. This is the legitimate path — do it now so the clock is already running.
2. **Use / register an ORGANIZATION account** instead of personal. Org accounts are **exempt** from the 12-tester rule and can publish straight to Production. BUT org enrolment requires a **D-U-N-S number** (free from Dun & Bradstreet, but issuance can take a few business days) plus business documents — so this is also not a same-day path unless you already have a D-U-N-S.
3. **Use an existing older account.** Personal accounts created **on or before 2023-11-13**, and all organization accounts, are exempt.

> Bottom line: if the goal is "live tomorrow," that is not achievable through the front door. The fastest *legitimate* action is to **kick off the 12-tester closed test today** so go-live lands in ~2–3 weeks.

### 🚧 BLOCKER 2 (technical, fixable today): target API level is too low
New app submissions in 2026 **must target Android 15 (API level 35) or higher**. This project is currently at **targetSdk 34 / compileSdk 34** (`mobile/android/variables.gradle`). Google Play will **reject the upload** at versionCode 1 as-is.
**Fix:** bump `compileSdkVersion` and `targetSdkVersion` to **35** in `mobile/android/variables.gradle`, install the Android 15 (API 35) SDK platform, rebuild the AAB. (See "Pre-build fix" in the build section.) This is a 1-line edit + rebuild and can be done today.

### Minor blockers / gaps (all fixable today)
- **Screenshots are the wrong shape.** `store/screenshot_1_ai.png` and `screenshot_2_human.png` are **1280×800 landscape (16:10)** — these were Chrome Web Store assets. Google Play phone screenshots must be **16:9 or 9:16**; 16:10 is not accepted. You need **portrait 9:16 phone screenshots** (recommended **1080×1920**). See Asset Checklist.
- **Feature graphic (1024×500) does not exist.** Required to publish. `promo_tile_440x280.png` is the wrong size and can't be reused directly.
- **Privacy policy must be hosted at a public URL.** The repo has `PRIVACY.md` but it is (a) not yet hosted and (b) still titled/worded for the *browser extension* ("Suno Slop Detector", `activeTab`, "runs only on suno.com/song/"). It must be updated to describe the **app** and hosted (GitHub Pages). See Privacy Policy section.

---

## 1. Developer account

- **Fee:** one-time **$25 USD** (no annual renewal), paid with a non-prepaid credit/debit card under your legal name.
- **Account type:** you're a solo individual → **Personal**. (Personal needs only a government ID, no D-U-N-S.) ⚠️ Personal triggers the 12-tester rule above. Organization avoids that rule but needs a **D-U-N-S number** (free, ~few business days) + business docs. **Account type cannot be changed later** — choose deliberately.
- **Identity verification:** Google requires identity verification for all new accounts — upload a government photo ID matching your legal name; you may be asked to confirm legal name, address, and contact details. Verification can take a few days; do it immediately after paying.
- Sign up at the Play Console: <https://play.google.com/console/signup>.

## 2. Build format & signing

- **AAB required.** New apps must be uploaded as an **Android App Bundle (.aab)**, not an APK. (APK is only for sideloading / testing locally.)
- **Play App Signing** is mandatory for new apps. On first upload Google offers to manage your app signing key. You keep an **upload key** (your `release.keystore`); Google holds the real app signing key. Accept the default Play App Signing enrolment. **Keep `mobile/keystore/release.keystore` + its passwords backed up** — losing the upload key means you must request an upload-key reset from Google.
- **Target API level:** **35 (Android 15) minimum** for 2026. Project is at 34 — must bump (see Blocker 2).
- **minSdk** is currently 22 (Android 5.1) — fine, no Play minimum forces a change.

## 3. Store listing (DRAFTED — copy/paste ready)

| Field | Limit | Draft |
|---|---|---|
| **App name** | ≤30 chars | `Lyric Humanizer` (15 chars) |
| **Short description** | ≤80 chars | `Score how AI your lyrics sound and make them human. 100% offline. No data.` (74 chars) |
| **Full description** | ≤4000 chars | see below |
| **App category** | — | **Tools** (alt: Music & Audio) |
| **Tags** | up to 5 | lyrics, songwriting, writing, music, text analysis |
| **Contact email** | required, public | augustosjclaw@outlook.com |
| **Website** | optional | https://github.com/PotentiallyHuman/suno-slop-detector |
| **Privacy policy URL** | required | (GitHub Pages URL — see section 7) |

**Full description (draft, ~900 chars — well under 4000):**
```
Lyric Humanizer tells you how "AI-written" your song lyrics read — and helps you make them sound human.

Paste any lyrics and the app scores them against patterns that distinguish machine-generated, cliché-heavy writing from real human songwriting. Then it suggests concrete edits: cut the generic imagery, vary your rhymes, address the listener, use specific and named details — the things human lyricists actually do.

• 100% ON-DEVICE. Everything runs locally on your phone.
• Works fully OFFLINE. No internet connection needed, ever.
• NO accounts, NO sign-up, NO ads, NO trackers.
• Collects NOTHING. Your lyrics never leave your device and are never stored.
• Free.

The score is a heuristic for fun and self-editing, not a judgement of any songwriter. Whether you write by hand or start from an AI draft, Lyric Humanizer helps you find and fix the slop.

Open source: github.com/PotentiallyHuman/suno-slop-detector
```

## 4. Data safety form (DRAFTED answers)

Path in Console: **App content → Data safety**. Because the app transmits nothing off the device, the honest and correct answers are "no collection, no sharing."

- **Does your app collect or share any of the required user data types?** → **No.**
  (Google's definition of "collect" = data transmitted off the device. This app does none — all analysis is in-memory on-device, so even the pasted lyrics are NOT "collected.")
- **Does your app collect required user data?** → **No.**
- **Is all of the user data collected by your app encrypted in transit?** → **N/A / not shown** (only asked if you collect data). If forced to answer because you ever toggle "yes" → choose the closest truthful option, but you should be answering No.
- **Do you provide a way for users to request that their data be deleted?** → **N/A** (no data collected). If shown, "No data is collected."
- **Privacy policy URL** → required here too; paste the hosted URL from section 7.
- Result your listing will display: **"No data shared with third parties"** and **"No data collected."**

⚠️ The data-safety answers must be consistent with your hosted privacy policy. The policy must say "collects nothing, sends nothing, stores nothing" (it does — once re-worded for the app).

## 5. Content rating (IARC questionnaire) — DRAFTED answers

Path: **App content → Content ratings → Start questionnaire**.

- **Email address:** augustosjclaw@outlook.com (IARC correspondence).
- **Category:** choose **"Reference, News, or Educational"** / **Utility / Productivity / Other** (NOT "Game"). This is a utility/tools app.
- Then answer **No** to essentially every content question:
  - Violence (cartoon/fantasy/realistic/blood/gore): **No**
  - Sexual content / nudity: **No**
  - Profanity / crude humor: **No** (the app analyzes user-pasted text but ships no profane content of its own)
  - Controlled substances (drugs/alcohol/tobacco): **No**
  - Gambling / simulated gambling: **No**
  - Hate / extremism / discrimination references: **No**
  - User-generated content shared with other users / social features: **No** (lyrics stay on-device, nothing is shared or transmitted)
  - In-app purchases: **No**
  - Shares user location / personal info: **No**
  - Ads: **No**
- **Expected outcome:** **Everyone** (ESRB) / **PEGI 3** / equivalents across regions.
- Review the calculated ratings → **Submit**.

## 6. Privacy policy — host it (REQUIRED, even for a no-data app)

A publicly reachable HTTPS privacy-policy URL is **mandatory** to publish AND to complete the Data safety form.

⚠️ The current `PRIVACY.md` describes the **browser extension** ("Suno Slop Detector", `activeTab` permission, "runs only on suno.com/song/"). Before hosting, **rewrite it for the app**: title "Lyric Humanizer — Privacy Policy", state it's an Android app, "you paste lyrics, analyzed entirely on-device, in memory, never stored, never transmitted; no network, no accounts, no ads, no analytics, no data collection or sharing." (Do this edit in the repo — not in this kit.)

**Host via GitHub Pages (steps):**
1. In the public repo `PotentiallyHuman/suno-slop-detector`, go to **Settings → Pages**.
2. Source: **Deploy from a branch** → branch `main`, folder `/ (root)` (or `/docs`). Save.
3. If using root, ensure `PRIVACY.md` renders — GitHub Pages serves Markdown via Jekyll, so the resulting URL will be like:
   `https://potentiallyhuman.github.io/suno-slop-detector/PRIVACY` (Jekyll strips `.md`), or
   `https://potentiallyhuman.github.io/suno-slop-detector/PRIVACY.html` if you convert to HTML.
4. Verify the URL loads in a browser before pasting it into the Console.
   - Simpler alternative (no Jekyll surprises): rename to `docs/privacy.html` (plain HTML) and serve `/docs` → `https://potentiallyhuman.github.io/suno-slop-detector/privacy.html`.
5. Paste this URL into **both** the Store listing → Privacy policy field **and** the Data safety form.

## 7. Graphic assets — checklist (HAVE vs MISSING, exact dimensions)

| Asset | Spec (exact) | Status |
|---|---|---|
| **App icon** | **512×512 px, 32-bit PNG (alpha OK), ≤1024 KB** | ✅ HAVE — `app/icons/icon-512.png` (512×512). Reuse it. |
| **Feature graphic** | **1024×500 px, JPEG or 24-bit PNG (NO alpha)** | ❌ MISSING — must create. `store/promo_tile_440x280.png` is wrong size; not usable as-is. |
| **Phone screenshots** | **2–8 required; 9:16 portrait recommended 1080×1920 (or 16:9 landscape 1920×1080); each side 320–3840 px; max side ≤ 2× min side; JPEG or 24-bit PNG no alpha; ≤8 MB each** | ⚠️ WRONG SHAPE — `store/screenshot_1_ai.png` & `screenshot_2_human.png` are **1280×800 (16:10)**, which is NOT an accepted ratio. Recreate as **portrait 1080×1920** (run the app on a phone/emulator and screenshot, or re-render). Need **≥2**, ideally **4+** for promo eligibility. |
| **7" tablet screenshots** | optional, same format | ❌ none (skip; not required) |
| **10" tablet screenshots** | optional, same format | ❌ none (skip; not required) |
| **Preview video** | optional (YouTube URL) | skip |

**To create the missing/fixed assets:**
- **Feature graphic 1024×500:** make a simple banner (app name + tagline on the brand color). No alpha channel — export as 24-bit PNG or JPEG.
- **Phone screenshots 1080×1920:** install the signed APK/AAB on a phone or Android 15 emulator and capture two screens — (1) the "AI" / high-score result, (2) the "human" / low-score + suggested-edits view — mirroring the two existing landscape shots. Save as PNG (no alpha).

---

## 8. Exact local build commands (produce the signed AAB)

Working dir: `/home/potentiallyhumanspark/projects/28_suno_slop_detector/mobile`
Signing is already wired: `mobile/android/app/build.gradle` loads `mobile/keystore/signing.properties` and applies `signingConfigs.release` to the release build automatically.

### Pre-build fix (REQUIRED — Blocker 2): bump to API 35
Edit `mobile/android/variables.gradle`:
```
compileSdkVersion = 35
targetSdkVersion  = 35
```
Then ensure the Android 15 platform is installed:
```
source /home/potentiallyhumanspark/projects/28_suno_slop_detector/mobile/android_env.sh
sdkmanager "platforms;android-35" "build-tools;35.0.0"
```

### Build steps
```bash
# 0) env (Android SDK + JDK 17)
source /home/potentiallyhumanspark/projects/28_suno_slop_detector/mobile/android_env.sh

# 1) rebuild the single inlined www/index.html from ../app
#    ⚠️ MEMORY NOTE: build_www.py's JS_ORDER is hardcoded. If app JS files were
#    added since this list, add them here or the AAB ships STALE code silently.
python3 /home/potentiallyhumanspark/projects/28_suno_slop_detector/mobile/build_www.py

# 2) sync the web assets into the native Android project
npx --prefix /home/potentiallyhumanspark/projects/28_suno_slop_detector/mobile cap sync android
#   (equivalently: cd mobile && npm run sync)

# 3) build the signed release AAB
/home/potentiallyhumanspark/projects/28_suno_slop_detector/mobile/android/gradlew \
  -p /home/potentiallyhumanspark/projects/28_suno_slop_detector/mobile/android \
  bundleRelease

# 4) the AAB lands here:
#   mobile/android/app/build/outputs/bundle/release/app-release.aab
```
Verify it's signed with your upload key:
```bash
jarsigner -verify -verbose -certs \
  /home/potentiallyhumanspark/projects/28_suno_slop_detector/mobile/android/app/build/outputs/bundle/release/app-release.aab
```
(For a quick on-phone smoke test you can also `./gradlew assembleRelease` to get an installable signed APK, but **upload the .aab** to Play.)

---

## 9. TOMORROW runbook (every click; 🟢 = doable now, 🔴 = blocked by the 12-tester rule)

**Phase A — account & one-time setup (do today)**
1. 🟢 Go to <https://play.google.com/console/signup>, sign in with the Google account you want to own the app.
2. 🟢 Choose account type: **Personal** (or **Organization** if you already have a D-U-N-S and want to skip the tester rule). ⚠️ irreversible.
3. 🟢 **Pay the one-time $25** with a non-prepaid card under your legal name.
4. 🟢 Complete **identity verification** (upload government ID). May take a few days to clear — start immediately.

**Phase B — prepare artifacts (do today, in parallel)**
5. 🟢 Apply the **API-35 bump** + rebuild the **signed AAB** (section 8).
6. 🟢 **Rewrite `PRIVACY.md` for the app** and **host it on GitHub Pages**; copy the public URL (section 6).
7. 🟢 Create the **feature graphic (1024×500)** and **2–4 portrait phone screenshots (1080×1920)** (section 7).

**Phase C — create the app & fill the listing in Play Console**
8. 🟢 Console → **Create app**: name `Lyric Humanizer`, default language, type **App** (not game), **Free**, accept declarations.
9. 🟢 **Store listing** (Grow → Store presence → Main store listing): paste name / short / full description (section 3), app icon (`icon-512.png`), feature graphic, screenshots, category **Tools**, tags, contact email, website, **privacy policy URL**.
10. 🟢 **App content** → **Privacy policy**: paste the hosted URL.
11. 🟢 **App content** → **Data safety**: answer per section 4 (No collection / No sharing) + paste privacy URL.
12. 🟢 **App content** → **Content rating**: complete IARC questionnaire per section 5 → expect **Everyone** → submit.
13. 🟢 **App content** → fill remaining declarations: **Ads** = "No, my app does not contain ads"; **Target audience & content** (no kids-targeting; choose 13+ or general); **News app** = No; **Government app** = No; **Financial features** = None; **Health** = No.
14. 🟢 First time you upload, **accept Play App Signing** enrolment.

**Phase D — testing & release (here the personal-account rule bites)**
15. 🔴 **Closed testing** (Test and release → Testing → Closed testing): create a track, **upload the AAB**, write release notes. Create an **email list of ≥12 testers** (use 15–20). Save & **publish to the closed track**.
16. 🔴 Send each tester the **opt-in URL**; each must accept and (ideally) install. **The 14-day continuous clock starts once ≥12 are opted in.**
17. 🔴 **Wait 14 consecutive days** with ≥12 testers opted in. (Don't let the count drop below 12 — it can reset eligibility.)
18. 🔴 After 14 days: **Apply for production access** (Console prompts you) and answer the questions about your testing. Google reviews (~up to 7 days).
19. 🔴 Once production access is granted: **Production** track → upload the AAB (or promote the tested one) → set rollout (start 100% or staged) → **Submit for review**.
20. 🔴 Google reviews the app (typically a few days for a first release) → **app goes live**.

> Steps 1–14 can all be finished tomorrow. Steps 15–20 are gated by the **12-tester / 14-day** rule, pushing live release to **~2–3 weeks out** on a new personal account. To go live sooner, the only legitimate lever is an **organization account** (D-U-N-S) or an **exempt older account**.

---

## Sources (verify before submitting — Google updates these)
- Testing requirements for new personal accounts (12 testers / 14 days): <https://support.google.com/googleplay/android-developer/answer/14151465>
- Target API level requirement (API 35 for 2026): <https://support.google.com/googleplay/android-developer/answer/11926878> · <https://developer.android.com/google/play/requirements/target-sdk>
- Get started / $25 fee / account types: <https://support.google.com/googleplay/android-developer/answer/6112435> · <https://support.google.com/android-developer-console/answer/16604405>
- Preview asset specs (icon/feature graphic/screenshots): <https://support.google.com/googleplay/android-developer/answer/9866151>
- Data safety section: <https://support.google.com/googleplay/android-developer/answer/10787469>
- Content ratings (IARC): <https://support.google.com/googleplay/android-developer/answer/9898843>
