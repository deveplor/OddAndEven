# OddAndEven v2.5

A static hand-cricket game with desktop and mobile arenas, Firebase player accounts, and PeerJS multiplayer. The v2.5 release adds the Midnight Arena theme, a shared history-only Grandmaster strategy, and login/session repairs. Release history is in `updates.html`.

Serve locally with `python -m http.server 8765`, then open `http://localhost:8765`. Opening HTML through `file://` does not support Firebase sign-in. No build or package installation is needed.

Run `npm test` for deterministic bot, gameplay, and login regression tests. Run `npm run check` to parse every inline/external game script and verify local script/style dependencies. Both commands use Node's built-in modules.

## What changed

- Shared midnight theme, larger number controls, visible keyboard focus, reduced-motion support, clearer score panels, and responsive headers.
- One Grandmaster implementation across desktop, mobile, and the standalone bot arena. It learns recency, repeated sequences, and modular number patterns; batting weighs runs against dismissal risk. It cannot inspect the current player pick. Independent random choices remain unpredictable.
- Mobile records a player's choice only after the bot commits its choice. Batting and bowling histories reset for a new match and remain separate.
- Google login bypasses synthetic PIN registration. Firebase identities restore before anonymous fallback, and background sync no longer signs in as every cached player.
- Slower account lookups distinguish unavailable service from a missing username. PIN signup checks the shared username namespace and waits for cloud persistence. Failed profile creation can be retried with the same credentials.
- Removed destructive release-time storage clearing, duplicate desktop engine embedding, duplicate Enter submission handlers, exposed PIN previews, and the hardcoded administrator login shortcut.
- Fixed mobile toss/break phase labels and made the closed navigation drawer inaccessible to keyboard focus.

## Firebase deployment requirements

The existing Firebase project configuration is preserved. Enable the Google and Email/Password providers and authorize the production hostname in Firebase Authentication. Google uses popup sign-in with an actionable retry when popups are blocked; this avoids relying on cross-site redirect storage. See [Firebase's redirect guidance](https://firebase.google.com/docs/auth/web/redirect-best-practices) and [auth-state readiness](https://firebase.google.com/docs/reference/js/auth.auth#authstateready).

The administrator page now requires a Firebase ID token with `admin: true`. Assign that claim using a trusted Admin SDK environment. Client-side checks are not authorization: deployed Firestore rules must independently enforce admin-only destructive operations and ownership of account/stat writes. No Firebase rules or privileged deployment credentials are included in this repository, so those backend settings were not changed or verified as part of v2.5.

The inherited five-digit PIN and OAE1 local storage format remain for account compatibility. OAE1 is obfuscation, not a secure credential vault. A full server-enforced account/leaderboard security migration is separate work; never treat local records, public verifiers, or client-calculated scores as trusted authorization.

## Verification scope

Automated tests cover learned patterns, random-opponent fairness, chase decisions, cross-view turn ordering, cached-account lookup, wrong PIN, offline lookup, and Google/PIN separation. Browser checks covered the desktop arena, a complete mobile Grandmaster match, popup-blocked recovery, release notes, and 390px mobile layout using isolated local Firebase stubs with cloud writes disabled. Real Google account consent, production Firebase rules, and two-device multiplayer require live integration verification.
