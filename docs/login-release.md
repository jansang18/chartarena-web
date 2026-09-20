# Login screen, 2026-09-20

`login.html` provides email sign-in, registration, password reset, guest entry, and an authenticated account/logout state. Home exposes the page through its navigation. The presentation uses the current Club Edition palette and shipped Seon motion asset with reduced-motion and data-saving still-image fallbacks.

## Service configuration still required

The production Firebase project is `chartarena-3051a`. A single sign-in readiness probe using a synthetic, reserved `.invalid` address returned `PASSWORD_LOGIN_DISABLED` on 2026-09-20. No account was created and no email was sent. The currently available Firebase Console session could not open the project's apps/settings. Email/password activation therefore remains an owner-controlled step:

1. Open this project's Firebase Console with an account that has access.
2. In Authentication → Sign-in method, enable Email/Password (not email-link authentication).
3. Use an owner-controlled test email on the deployed `login.html` to verify sign-up, sign-out, sign-in, and reset delivery. No code change is required after activation.

Reference: https://firebase.google.com/docs/auth/web/password-auth

Provider-disabled responses are shown as an unavailable-email notice, never a successful login. The guest entrance remains available. Localhost, loopback and file previews never initialize production Firebase or create real accounts. Local form submissions explain the preview restriction.

## Identity and saves

- `arena-auth.js` waits for Firebase's initial auth observer before starting a guest session. Existing members keep their UID when navigating home, battle, and the legacy daily page.
- New registration upgrades an existing anonymous account with `linkWithCredential`, preserving its UID. Signing into an existing account is not an automatic merge of two identities.
- Passwords are handed to Firebase Authentication and are not written to game localStorage. The form is disabled until its event handlers are installed; a failed JavaScript load cannot submit credentials in a GET query string.
- Gold, gems, character selection and progression still belong to the existing device-local saves. Login does not add server-authoritative balances, cross-device saves, or isolated per-account game inventories. The page explicitly explains this limitation. Do not advertise cloud saves or launch paid currency on this implementation.
- The existing full privacy policy still needs a separate launch review and real operator contact details before a public account-service launch. The login page provides a factual disclosure instead of linking to that outdated offline-only policy as if it were current.

## Verification

- `node --test tests/*.test.cjs`
- `node tests/verify-build.cjs`
- `git diff --check`
- UI: sign-in/registration/reset modes, required fields, password mismatch, preview errors, guest navigation; phone portrait/landscape, unfolded-Fold-sized viewport, tablet and desktop.

Actual production account creation, successful email sign-in, and delivery of reset emails cannot be claimed until the owner enables the provider and verifies with their own test address.
