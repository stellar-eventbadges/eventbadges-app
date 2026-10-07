# Local validation and limits

Run from `eventbadges-app` with Node.js 24:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm audit
```

The submission reliability pass covers abandoned action success/failure,
duplicate creates and claims while browser hashing is pending, ticket retention
after a refused creation, late wallet restore/connect/network completion after
disconnect, connection during pending disconnect, initialization rejection,
and verification edits/retries/keyboard submission. Tests use synthetic data,
mock wallet signing and contract clients, and do not contact a deployed contract.
Page accessibility checks use axe; they do not replace manual assistive
technology testing or phone camera testing.

`npm audit` on 2026-10-07 reported 19 advisories: 12 low, 7 moderate, none high
or critical. No forced downgrade was applied. The existing eight-module wallet
allow-list avoids bundling the unused multi-chain modules; dependencies remain
installed. Recheck the production output whenever wallet imports change (see
[the dependency review](issue-drafts/06-wallet-kit-dependency-advisories.md)).

Local checks executed on 2026-10-07:

| Check | Result |
| --- | --- |
| `npm run lint` | Passed, no warnings |
| `npm run typecheck` | Passed |
| `npm test -- --maxWorkers=1` | Passed: 36 files, 314 tests, 261.22 seconds |
| `npm run build` | Passed; Vite's large-chunk advisory remains |
| `npm audit` | 19 advisories described above |

The first parallel full run passed 313 tests and timed out on the existing
10,000-leaf Merkle tree test at its unchanged 15-second deadline while the
machine was handling other work. The complete single-worker rerun passed,
including that test; no timeout was raised. Use one worker on this machine
when other checks contend for resources. This does not change CI's configured
default test command.

The largest production JavaScript chunk is 831.66 kB (200.81 kB gzip). A
production-output scan found no reviewed unused-wallet markers (`metamask`,
`relay.walletconnect.com`, `@ledgerhq`, `trezor`, `@solana`, `jayson`,
`stream-json`). This scan supports the module allow-list review; it is not
an audit or proof that every dependency is safe.

Remote CI,
real wallet connection/signing, deployed-contract reads/writes and organizer
pilot outcomes remain unverified. Deployment requires the documented real
organizer pilot gate and a human-run deployment.
