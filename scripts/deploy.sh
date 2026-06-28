#!/usr/bin/env bash
# =============================================================================
# Tradeline — deploy all three contracts to Stellar Testnet
# =============================================================================
# Prerequisites:
#   rustup target add wasm32-unknown-unknown
#   cargo install --locked stellar-cli --features opt
#   stellar keys generate --global deployer --network testnet --fund
# =============================================================================
set -euo pipefail

NETWORK="testnet"
DEPLOYER="deployer"         # stellar keys alias
OUT="./target/wasm32-unknown-unknown/release"
CONTRACTS_DIR="./contracts"

echo "═══════════════════════════════════════"
echo "  Building Tradeline contracts (release)"
echo "═══════════════════════════════════════"
cargo build --target wasm32-unknown-unknown --release

echo ""
echo "═══════════════════════════════════════"
echo "  Deploying: arbiter_registry"
echo "═══════════════════════════════════════"
ARBITER_REGISTRY_ID=$(stellar contract deploy \
  --wasm "$OUT/tradeline_arbiter_registry.wasm" \
  --source "$DEPLOYER" \
  --network "$NETWORK")
echo "ARBITER_REGISTRY_ID=$ARBITER_REGISTRY_ID"

echo ""
echo "═══════════════════════════════════════"
echo "  Deploying: reputation"
echo "═══════════════════════════════════════"
REPUTATION_ID=$(stellar contract deploy \
  --wasm "$OUT/tradeline_reputation.wasm" \
  --source "$DEPLOYER" \
  --network "$NETWORK")
echo "REPUTATION_ID=$REPUTATION_ID"

echo ""
echo "═══════════════════════════════════════"
echo "  Deploying: escrow"
echo "═══════════════════════════════════════"
ESCROW_ID=$(stellar contract deploy \
  --wasm "$OUT/tradeline_escrow.wasm" \
  --source "$DEPLOYER" \
  --network "$NETWORK")
echo "ESCROW_ID=$ESCROW_ID"

DEPLOYER_PUB=$(stellar keys address "$DEPLOYER")

echo ""
echo "═══════════════════════════════════════"
echo "  Initialising contracts"
echo "═══════════════════════════════════════"

# The testnet USDC (Circle) SAC — replace with actual address if different
USDC="CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU"

# Init reputation with escrow as the only authorised writer
stellar contract invoke \
  --id "$REPUTATION_ID" \
  --source "$DEPLOYER" \
  --network "$NETWORK" \
  -- init \
  --escrow "$ESCROW_ID"

# Init escrow with reputation contract
stellar contract invoke \
  --id "$ESCROW_ID" \
  --source "$DEPLOYER" \
  --network "$NETWORK" \
  -- init \
  --rep_contract "$REPUTATION_ID"

# Init arbiter registry (admin = deployer, stake token = USDC, min stake = 10 USDC = 100_000_000 stroops)
stellar contract invoke \
  --id "$ARBITER_REGISTRY_ID" \
  --source "$DEPLOYER" \
  --network "$NETWORK" \
  -- init \
  --admin "$DEPLOYER_PUB" \
  --stake_token "$USDC" \
  --min_stake 100000000

echo ""
echo "═══════════════════════════════════════"
echo "  Writing .env files"
echo "═══════════════════════════════════════"

# App .env.local
cat > ./app/.env.local <<EOF
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_ESCROW_CONTRACT_ID=$ESCROW_ID
NEXT_PUBLIC_REPUTATION_CONTRACT_ID=$REPUTATION_ID
NEXT_PUBLIC_ARBITER_REGISTRY_ID=$ARBITER_REGISTRY_ID
NEXT_PUBLIC_USDC_CONTRACT=$USDC
EOF

# Indexer .env
cat > ./indexer/.env <<EOF
RPC_URL=https://soroban-testnet.stellar.org
ESCROW_CONTRACT_ID=$ESCROW_ID
REPUTATION_CONTRACT_ID=$REPUTATION_ID
ARBITER_REGISTRY_ID=$ARBITER_REGISTRY_ID
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tradeline
POLL_INTERVAL_MS=5000
EOF

echo ""
echo "✓ Deploy complete!"
echo ""
echo "  Escrow:          $ESCROW_ID"
echo "  Reputation:      $REPUTATION_ID"
echo "  ArbiterRegistry: $ARBITER_REGISTRY_ID"
echo ""
echo "  Next: run   npm run dev   in ./app"
echo "        run   npm run dev   in ./indexer   (after starting Postgres)"
