# Functional Test Checklist

## Legend
- [ ] Not yet tested
- [x] Pass
- [!] Fail / issue found

## 1. Environment & Readiness
- [ ] 1.1 App loads with backend healthy (green pulse, "All Systems Operational" / "Tous les systèmes opérationnels").
- [ ] 1.2 Stop Redis -> refresh: readiness becomes degraded banner in FR/EN; OTP flows still function (in‑memory fallback). Restore Redis -> returns to healthy.
- [ ] 1.3 Health endpoint transient 503s do not spam console (retry/backoff in effect).

## 2. Internationalization (i18n)
- [ ] 2.1 Default language FR (strings appear in French on first load).
- [ ] 2.2 Toggle language button switches FR <-> EN; all visible labels in dashboard, generator, validators, service manager update instantly.
- [ ] 2.3 No hard‑coded English remains in service-manager stats/history/settings after toggle.

## 3. Email OTP Generation
- [ ] 3.1 Generate numeric OTP (default length 6) – toast success; console has no errors.
- [ ] 3.2 OTP appears stored (localStorage if applicable) – validator pre-fills contextual info text.
- [ ] 3.3 Invalid email entry blocked with translated validation message.
- [ ] 3.4 Alphanumeric format selection (if exposed) generates expected charset.
- [ ] 3.5 Expiry honored: after TTL passes, verification fails with translated error.

## 4. Email OTP Verification
- [ ] 4.1 Enter correct OTP before expiry -> success toast (FR & EN variants) and success styling.
- [ ] 4.2 Enter wrong OTP -> failure toast (translated) no state corruption.
- [ ] 4.3 Reuse same OTP after successful verify -> should fail (one-time property).

## 5. TOTP Setup & Verification
- [ ] 5.1 Setup TOTP -> QR + secret displayed, success toast translated.
- [ ] 5.2 Scan with authenticator (Google/Authy) -> generated codes verify within same 30s window.
- [ ] 5.3 Adjustable window: set window = 0 -> only exact time slice accepted; window = 1 -> previous/next slice accepted; confirm earlier/later code behavior.
- [ ] 5.4 Wrong / outdated code outside window -> translated failure.
- [ ] 5.5 Secret edit (if manually changed) produces new code set; old codes invalid.

## 6. Service Enable / Disable
- [ ] 6.1 Disable Email service in Service Manager -> generator + validator UI visually disabled (grayed / no pointer) while TOTP validator unaffected.
- [ ] 6.2 Re-enable Email -> UI reactivates without reload.
- [ ] 6.3 Disable TOTP -> TOTP validator form disabled; email OTP unaffected.

## 7. Metrics & Refresh
- [ ] 7.1 Stats cards show numeric values (Total OTPs, Success Rate, Emails Sent, Failed Emails) with formatting and correct translations.
- [ ] 7.2 Clicking refresh button updates metrics and timestamp without full page reload.
- [ ] 7.3 During refresh, button shows loading indicator (… or disabled state) then returns.
- [ ] 7.4 If metrics endpoint fails, graceful degradation: toast (one time) or silent with console warning; previous metrics retained.

## 8. Degraded Mode Behavior
- [ ] 8.1 When degraded, banner text translated and visible.
- [ ] 8.2 OTP generation & verification still work (in-memory) while Redis down.
- [ ] 8.3 After Redis restore, banner disappears on next refresh/auto-refresh.

## 9. Retry / Backoff Logic
- [ ] 9.1 Simulate temporary health 503: first 1–2 failures recovered on retry; UI not flooded with multiple identical toasts.
- [ ] 9.2 Persistent failure (all retries fail) -> single error toast (translated) and no infinite loop.

## 10. Accessibility & UX
- [ ] 10.1 Focus states visible on buttons & inputs in both light/dark themes.
- [ ] 10.2 Color contrast sufficient (run quick audit if available).
- [ ] 10.3 Language switch is reachable via keyboard (tab order maintained).

## 11. Persistence
- [ ] 11.1 After refresh, language preference persists (if implemented) OR defaults intentionally to FR (documented behavior).
- [ ] 11.2 TOTP secret persists across page reload (unless intentionally cleared); verifying still works without re-setup.

## 12. Error Handling
- [ ] 12.1 Network error during OTP generation -> user sees translated error toast, UI recovers (can retry).
- [ ] 12.2 Network error during OTP verify -> translated error; input remains for correction.
- [ ] 12.3 Metrics fetch failure does not break whole dashboard.

## 13. Security / Edge Cases
- [ ] 13.1 Reject OTP shorter/longer than configured length.
- [ ] 13.2 TOTP window negative or excessively large is guarded (UI constraints enforce valid range).
- [ ] 13.3 Large number of rapid refresh clicks throttled by disabled state.

## 14. Localization Specifics
- [ ] 14.1 Accented French characters render correctly (é, è, ç) in UI.
- [ ] 14.2 No truncated text or layout break with longer French labels.

## 15. Cleanup & Logs
- [ ] 15.1 Console free of uncaught exceptions after complete UX tour.
- [ ] 15.2 No repeated 503 spam lines—only limited retries visible.

---
Generated: 2025-09-27
