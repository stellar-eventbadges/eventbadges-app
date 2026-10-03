#!/usr/bin/env bash
#
# Deploys the eventbadges contract to Stellar testnet and prints its id, which
# is the value that goes into this app's `.env` as VITE_CONTRACT_ID.
#
# WRITTEN BUT NEVER RUN BY AN AGENT. The human runs it. Three gates apply:
#   1. The contract repo has a built wasm (this script builds it if not).
#   2. A real organizer or community has agreed to try the flow. Set
#      PILOT_CONFIRMED=yes only when that is actually true.
#   3. The signing identity is read from STELLAR_ACCOUNT. This script never
#      reads, prints or stores a secret key itself.
#
# Usage (from the eventbadges-app repo, with the contracts repo beside it):
#   PILOT_CONFIRMED=yes STELLAR_ACCOUNT=dev ./scripts/deploy-testnet.sh
#
set -euo pipefail

: "${STELLAR_ACCOUNT:?set STELLAR_ACCOUNT to a stellar keys identity name, for example: STELLAR_ACCOUNT=dev}"

if [ "${PILOT_CONFIRMED:-no}" != "yes" ]; then
  cat >&2 <<'EOF'
refusing to deploy: the pilot gate is not cleared.

No eventbadges contract is deployed until a real organizer or community has
agreed to try the flow. When that has actually happened, re-run with:

  PILOT_CONFIRMED=yes STELLAR_ACCOUNT=<identity> ./scripts/deploy-testnet.sh
EOF
  exit 1
fi

CONTRACTS_DIR="${CONTRACTS_DIR:-../eventbadges-contracts}"
WASM="$CONTRACTS_DIR/target/wasm32v1-none/release/eventbadges.wasm"

if [ ! -d "$CONTRACTS_DIR" ]; then
  echo "contracts repo not found at $CONTRACTS_DIR (set CONTRACTS_DIR to override)" >&2
  exit 1
fi

if [ ! -f "$WASM" ]; then
  echo "no wasm at $WASM yet; building it in $CONTRACTS_DIR" >&2
  (cd "$CONTRACTS_DIR" && stellar contract build)
fi

echo "deploying $WASM to testnet as '$STELLAR_ACCOUNT'" >&2

CONTRACT_ID="$(
  stellar contract deploy \
    --wasm "$WASM" \
    --source-account "$STELLAR_ACCOUNT" \
    --network testnet \
    --alias eventbadges
)"

cat <<EOF

Contract deployed to testnet.

  contract id: $CONTRACT_ID

Next steps, all manual:
  1. Put it in this repo's .env as:  VITE_CONTRACT_ID=$CONTRACT_ID
     (.env is git-ignored; never commit it.)
  2. Record the id and the explorer link in the docs repo — real values only.
  3. Remember the flow's operational rule: the organizer generates the claim
     code, shares it out-of-band, and keeps no copy (see
     eventbadges-contracts/docs/claim-codes.md and
     docs/decisions/0002-claim-codes-in-the-browser.md).
EOF
