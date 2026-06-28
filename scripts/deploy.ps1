# =============================================================================
# Tradeline — deploy all three contracts to Stellar Testnet (Windows)
# =============================================================================
# Prerequisites:
#   rustup target add wasm32-unknown-unknown
#   cargo install --locked stellar-cli --features opt
#   stellar keys generate --global deployer --network testnet --fund
# =============================================================================
$ErrorActionPreference = "Stop"

$NETWORK     = "testnet"
$DEPLOYER    = "deployer"
$OUT         = ".\target\wasm32-unknown-unknown\release"

# Testnet Circle USDC SAC
$USDC = "CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU"

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  Building Tradeline contracts (release)" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
cargo build --target wasm32-unknown-unknown --release

Write-Host ""
Write-Host "  Deploying: arbiter_registry" -ForegroundColor Yellow
$ARBITER_REGISTRY_ID = stellar contract deploy `
  --wasm "$OUT\tradeline_arbiter_registry.wasm" `
  --source $DEPLOYER `
  --network $NETWORK
Write-Host "  ARBITER_REGISTRY_ID=$ARBITER_REGISTRY_ID"

Write-Host ""
Write-Host "  Deploying: reputation" -ForegroundColor Yellow
$REPUTATION_ID = stellar contract deploy `
  --wasm "$OUT\tradeline_reputation.wasm" `
  --source $DEPLOYER `
  --network $NETWORK
Write-Host "  REPUTATION_ID=$REPUTATION_ID"

Write-Host ""
Write-Host "  Deploying: escrow" -ForegroundColor Yellow
$ESCROW_ID = stellar contract deploy `
  --wasm "$OUT\tradeline_escrow.wasm" `
  --source $DEPLOYER `
  --network $NETWORK
Write-Host "  ESCROW_ID=$ESCROW_ID"

$DEPLOYER_PUB = stellar keys address $DEPLOYER

Write-Host ""
Write-Host "  Initialising reputation contract…" -ForegroundColor Yellow
stellar contract invoke `
  --id $REPUTATION_ID `
  --source $DEPLOYER `
  --network $NETWORK `
  -- init `
  --escrow $ESCROW_ID

Write-Host "  Initialising escrow contract…" -ForegroundColor Yellow
stellar contract invoke `
  --id $ESCROW_ID `
  --source $DEPLOYER `
  --network $NETWORK `
  -- init `
  --rep_contract $REPUTATION_ID

Write-Host "  Initialising arbiter_registry…" -ForegroundColor Yellow
stellar contract invoke `
  --id $ARBITER_REGISTRY_ID `
  --source $DEPLOYER `
  --network $NETWORK `
  -- init `
  --admin $DEPLOYER_PUB `
  --stake_token $USDC `
  --min_stake 100000000

Write-Host ""
Write-Host "  Writing .env files…" -ForegroundColor Yellow

$appEnv = @"
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_ESCROW_CONTRACT_ID=$ESCROW_ID
NEXT_PUBLIC_REPUTATION_CONTRACT_ID=$REPUTATION_ID
NEXT_PUBLIC_ARBITER_REGISTRY_ID=$ARBITER_REGISTRY_ID
NEXT_PUBLIC_USDC_CONTRACT=$USDC
"@
Set-Content -Path ".\app\.env.local" -Value $appEnv

$indexerEnv = @"
RPC_URL=https://soroban-testnet.stellar.org
ESCROW_CONTRACT_ID=$ESCROW_ID
REPUTATION_CONTRACT_ID=$REPUTATION_ID
ARBITER_REGISTRY_ID=$ARBITER_REGISTRY_ID
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tradeline
POLL_INTERVAL_MS=5000
"@
Set-Content -Path ".\indexer\.env" -Value $indexerEnv

Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "  Deploy complete!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Escrow:          $ESCROW_ID"
Write-Host "  Reputation:      $REPUTATION_ID"
Write-Host "  ArbiterRegistry: $ARBITER_REGISTRY_ID"
Write-Host ""
Write-Host "  Next steps:"
Write-Host "    cd app  &&  npm run dev"
Write-Host "    cd indexer  &&  npm run dev   (after starting Postgres)"
Write-Host "    npm run seed   (from repo root, to run the demo)"
Write-Host ""
