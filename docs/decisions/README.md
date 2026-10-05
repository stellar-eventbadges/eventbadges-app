# Design decisions

One file per decision that would otherwise be re-litigated later. Format:
context, what was checked, the decision, the consequences, and when to
re-evaluate.

| # | Decision | Status |
|---|---|---|
| [0001](0001-contract-binding.md) | Hand-built contract client, no generated code | accepted |
| [0002](0002-claim-codes-in-the-browser.md) | Claim codes are generated and hashed in the browser | accepted — extended by contracts ADR 0003; one code per attendee since 2026-10-05 |
