# OddAndEven v2.5

A static hand-cricket game with desktop and mobile arenas, Firebase player accounts, and PeerJS multiplayer. The v2.5 release adds the Midnight Arena theme, a shared history-only Grandmaster strategy, and login/session repairs. Release history is in `updates.html`.

Serve locally with `python -m http.server 8765`, then open `http://localhost:8765`. Opening HTML through `file://` does not support Firebase sign-in. No build or package installation is needed.

Run `npm test` for deterministic bot, gameplay, and login regression tests. Run `npm run check` to parse every inline/external game script and verify local script/style dependencies. Both commands use Node's built-in modules.

## What changed

- Shared midnight theme, larger number controls, visible keyboard focus, reduced-motion support, clearer score panels, and responsive headers.
- One Grandmaster implementation across desktop, mobile, and the standalone bot arena. It learns recency, repeated sequences, and modular number patterns; batting weighs runs against dismissal risk. It cannot inspect the current player pick. Independent random choices remain unpredictable.
- Mobile records a player's choice only after the bot commits its choice. Batting and bowling histories reset for a new match and remain separate.
- Google login bypasses synthetic PIN registration. The login page restores Firebase identities without starting a competing anonymous sign-in, and background sync no longer signs in as every cached player.
- Slower account lookups distinguish unavailable service from a missing username. PIN signup checks the shared username namespace and waits for cloud persistence. Failed profile creation can be retried with the same credentials.
- Removed destructive release-time storage clearing, duplicate desktop engine embedding, duplicate Enter submission handlers, exposed PIN previews, and the hardcoded administrator login shortcut.
- Fixed mobile toss/break phase labels and made the closed navigation drawer inaccessible to keyboard focus.

## Firebase deployment requirements

The existing Firebase project configuration is preserved. Enable the Google and Email/Password providers and authorize the production hostname in Firebase Authentication. Google uses popup sign-in with an actionable retry when popups are blocked; this avoids relying on cross-site redirect storage. See [Firebase's redirect guidance](https://firebase.google.com/docs/auth/web/redirect-best-practices) and [auth-state readiness](https://firebase.google.com/docs/reference/js/auth.auth#authstateready).

The administrator page now requires a Firebase ID token with `admin: true`. Assign that claim using a trusted Admin SDK environment. Client-side checks are not authorization: deployed Firestore rules must independently enforce admin-only destructive operations and ownership of account/stat writes. No Firebase rules or privileged deployment credentials are included in this repository, so those backend settings were not changed or verified as part of v2.5.

The inherited five-digit PIN and OAE1 local storage format remain for account compatibility. OAE1 is obfuscation, not a secure credential vault. A full server-enforced account/leaderboard security migration is separate work; never treat local records, public verifiers, or client-calculated scores as trusted authorization.

## Verification scope

Automated tests cover learned patterns, random-opponent fairness, chase decisions, cross-view turn ordering, cached-account lookup, wrong PIN, offline lookup, and Google/PIN separation. Browser checks covered the desktop arena, a complete mobile Grandmaster match, popup-blocked recovery, release notes, and 390px mobile layout using isolated local Firebase stubs with cloud writes disabled. Real Google account consent, production Firebase rules, and two-device multiplayer require live integration verification.


## Authentication hotfix — 26 November 2026

Login now completes Firebase authentication before writing a session or navigating. Google signup commits the public account and private UID profile in one transaction, refuses username ownership conflicts, and permits safe retries. Desktop and mobile login/signup entry points share `index.html`. Legacy root collection permission failures no longer block a successful canonical signup lookup. Profile save failures keep the signup form open.

A read-only production diagnostic with the site's referrer returned HTTP 403 `API_KEY_SERVICE_BLOCKED` from Identity Toolkit. The older key in the project notes returned `API_KEY_INVALID` / expired, so neither swapping keys nor frontend code can resolve this deployment setting. No API keys were changed by this hotfix.

To restore production authentication:

1. Open [Google Cloud credentials for this project](https://console.cloud.google.com/apis/credentials?project=oddeven-1c742) and edit the current website key.
2. Keep website restrictions, including `https://oddeven-two.vercel.app/*` and any other actual production origin. Under API restrictions allow **Identity Toolkit API** (`identitytoolkit.googleapis.com`), **Token Service API** (`securetoken.googleapis.com`), and the Firebase APIs the app uses, including Cloud Firestore. Ensure those APIs are enabled in the same project.
3. In Firebase Authentication, enable Google and Email/Password sign-in and authorize `oddeven-two.vercel.app` (plus any other actual production hostname).
4. After propagation, test new Google signup, returning Google login, new PIN signup, and returning PIN login in a fresh browser session. Confirm the account and private UID profile persist after reload. Client regression tests use mocked Firebase responses and do not substitute for this live check.

See [Firebase's API restrictions troubleshooting](https://firebase.google.com/docs/projects/api-keys#api-key-service-blocked). The client distinguishes backend configuration/permission errors from network failures and never falls back to anonymous authentication to report a successful login.


## Provider configuration follow-up — 27 November 2026

The Identity Toolkit API restriction was corrected: the production project configuration now returns HTTP 200. Two independent deployment issues were then confirmed:

- PIN login returns `PASSWORD_LOGIN_DISABLED`. Enable **Email/Password** (the password option, not just email-link sign-in) in [Firebase Authentication > Sign-in method](https://console.firebase.google.com/project/oddeven-1c742/authentication/providers). Username/PIN accounts use this Firebase provider internally; enabling the Cloud APIs does not enable the sign-in provider.
- Google authorization succeeds when requested from the Vercel origin, but fails with `API_KEY_HTTP_REFERRER_BLOCKED` from the Firebase popup origin. In the current key's website restrictions, keep `https://oddeven-two.vercel.app/*` and add **`https://oddeven-1c742.firebaseapp.com/*`**. This is the configured `authDomain`; the popup makes its own Authentication requests from that origin. Keep API restrictions and the exact website allowlist rather than making the key unrestricted.

Run `npm run check:auth` after saving. It checks the production domain, password provider, and Google authorization from both origins without creating accounts or printing API keys, tokens, or OAuth URLs. A successful check confirms those configuration paths only; complete real signup/login and refresh checks afterward. This command is intentionally separate from offline `npm test` and `npm run check`.

The Google OAuth authorization endpoint reached the account sign-in page with the configured Firebase callback during this diagnostic; no client ID or callback was changed. If Google still reports `redirect_uri_mismatch` after fixing the allowlist, verify that its web OAuth client permits `https://oddeven-1c742.firebaseapp.com/__/auth/handler`. See [Firebase password setup](https://firebase.google.com/docs/auth/web/password-auth) and [Google sign-in troubleshooting](https://firebase.google.com/docs/auth/faq-and-troubleshooting).
