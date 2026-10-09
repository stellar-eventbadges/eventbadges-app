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

The contract now has a verified synthetic testnet deployment, and a hosted
browser demo exists. Real wallet connection/signing and organizer pilot outcomes
remain unverified. The historical local checks above do not establish those
outcomes. Real pilots retain the documented organizer and human review gates.

## Editorial landing and workspace review (2026-10-09)

The redesign changes presentation and task entry only: a local sculptural SVG,
magenta controls, editorial type, direct attendee/organizer/verify entry buttons,
organizer in-page task links and an optional-proof disclosure. Contract calls,
wallet/network gates, validation, canonical errors, claim-code generation,
ticket lifetime and privacy acknowledgement logic remain unchanged.

Before/after screenshots, computed typography, batch diffs and browser results
are recorded in the workspace's `submission/design/eventbadges/` with the
numbered audit at `submission/eventbadges-design-audit.md`. Screenshots of
connected forms use synthetic offline page fixtures; they are not wallet or
contract operation evidence.

Validation: lint and strict typecheck passed; the production build passed with
the pre-existing large-chunk warning. Full suite:36 files,314 tests passed in
212.26 seconds. After the final proof-disclosure refinement, the two affected
page suites passed26 tests in44.13 seconds; lint/typecheck/build were rerun.
Browser axe found no violations and no horizontal overflow at320,390,768 and
1440px on the landing, Verify, and offline synthetic organizer/attendee forms.
A720px layout checks the equivalent of200% zoom on1440px. Keyboard focus,
reduced-motion transitions, local assets and the expanded prototype disclosure
were checked. Measured solid text pairs have contrast of at least5.17:1; the
caption over the sculptural SVG was visually reviewed.
