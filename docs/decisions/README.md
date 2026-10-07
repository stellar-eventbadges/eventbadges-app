# Design decisions

One file per decision that would otherwise be re-litigated later. Format:
context, what was checked, the decision, the consequences, and when to
re-evaluate.

| # | Decision | Status |
|---|---|---|
| [0001](0001-contract-binding.md) | Hand-built contract client, no generated code | accepted |
| [0002](0002-claim-codes-in-the-browser.md) | Claim codes are generated and hashed in the browser | accepted — extended by contracts ADR 0003; one code per attendee since 2026-10-05 |
| [0003](0003-import-wallet-modules-by-entry-point.md) | Wallet modules are imported by entry point, not taken from the kit's default list | accepted 2026-10-05 |
| [0004](0004-hand-rolled-qr-encoder.md) | The QR encoder is hand-rolled, with no dependency | accepted 2026-10-06 |
| [0005](0005-local-qr-scanning.md) | The attendee-side QR scanner is local, camera-first, and hand-rolled | accepted 2026-10-07 |
