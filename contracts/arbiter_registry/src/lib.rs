//! Tradeline Arbiter Registry Contract
//!
//! Maintains a list of approved arbiters who have staked tokens.
//! Admin approves/revokes arbiters. Arbiters self-register by staking.
//! Escrow contract queries `is_approved` before dispute assignment.

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, token, Address, Env, Vec};

// ─── Data types ──────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug)]
pub struct ArbiterInfo {
    pub address:      Address,
    pub stake_amount: i128,
    pub approved:     bool,
    pub disputes_resolved: u32,
}

#[contracttype]
pub enum DataKey {
    Admin,
    StakeToken,
    MinStake,
    Arbiter(Address),
    ArbiterList,
}

// ─── Contract ────────────────────────────────────────────────────────────────

#[contract]
pub struct ArbiterRegistryContract;

#[contractimpl]
impl ArbiterRegistryContract {
    /// Initialise with admin, staking token, and minimum stake.
    pub fn init(env: Env, admin: Address, stake_token: Address, min_stake: i128) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin,      &admin);
        env.storage().instance().set(&DataKey::StakeToken, &stake_token);
        env.storage().instance().set(&DataKey::MinStake,   &min_stake);
    }

    /// Arbiter registers by staking tokens.
    /// Admin must separately call `approve_arbiter` before they can be assigned.
    pub fn register(env: Env, arbiter: Address, stake_amount: i128) {
        arbiter.require_auth();

        let min_stake: i128 = env.storage().instance().get(&DataKey::MinStake).unwrap();
        let stake_token: Address = env.storage().instance().get(&DataKey::StakeToken).unwrap();

        if stake_amount < min_stake {
            panic!("stake below minimum");
        }

        // Transfer stake from arbiter to contract
        let token_client = token::Client::new(&env, &stake_token);
        token_client.transfer(&arbiter, &env.current_contract_address(), &stake_amount);

        let info = ArbiterInfo {
            address:          arbiter.clone(),
            stake_amount,
            approved:         false, // pending admin approval
            disputes_resolved: 0,
        };

        env.storage().persistent().set(&DataKey::Arbiter(arbiter.clone()), &info);

        // Add to list if not present
        let mut list: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::ArbiterList)
            .unwrap_or_else(|| Vec::new(&env));
        if !list.contains(&arbiter) {
            list.push_back(arbiter.clone());
            env.storage().persistent().set(&DataKey::ArbiterList, &list);
        }

        env.events().publish((symbol_short!("arb_reg"),), (arbiter, stake_amount));
    }

    /// Admin approves a registered arbiter.
    pub fn approve_arbiter(env: Env, arbiter: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let mut info: ArbiterInfo = env
            .storage()
            .persistent()
            .get(&DataKey::Arbiter(arbiter.clone()))
            .expect("arbiter not registered");

        info.approved = true;
        env.storage().persistent().set(&DataKey::Arbiter(arbiter.clone()), &info);

        env.events().publish((symbol_short!("arb_appr"),), arbiter);
    }

    /// Admin revokes an arbiter (e.g., misbehaviour).
    pub fn revoke_arbiter(env: Env, arbiter: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let mut info: ArbiterInfo = env
            .storage()
            .persistent()
            .get(&DataKey::Arbiter(arbiter.clone()))
            .expect("arbiter not registered");

        info.approved = false;
        env.storage().persistent().set(&DataKey::Arbiter(arbiter.clone()), &info);

        env.events().publish((symbol_short!("arb_rev"),), arbiter);
    }

    /// Increment dispute counter after resolution (called by escrow).
    pub fn increment_resolved(env: Env, arbiter: Address) {
        let mut info: ArbiterInfo = env
            .storage()
            .persistent()
            .get(&DataKey::Arbiter(arbiter.clone()))
            .expect("arbiter not registered");
        info.disputes_resolved += 1;
        env.storage().persistent().set(&DataKey::Arbiter(arbiter.clone()), &info);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    pub fn is_approved(env: Env, arbiter: Address) -> bool {
        env.storage()
            .persistent()
            .get::<DataKey, ArbiterInfo>(&DataKey::Arbiter(arbiter))
            .map(|i| i.approved)
            .unwrap_or(false)
    }

    pub fn get_arbiter(env: Env, arbiter: Address) -> Option<ArbiterInfo> {
        env.storage()
            .persistent()
            .get(&DataKey::Arbiter(arbiter))
    }

    pub fn list_arbiters(env: Env) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::ArbiterList)
            .unwrap_or_else(|| Vec::new(&env))
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::Address as _,
        token::StellarAssetClient,
        Address, Env,
    };

    #[test]
    fn test_register_and_approve() {
        let env = Env::default();
        env.mock_all_auths();

        let admin   = Address::generate(&env);
        let arbiter = Address::generate(&env);

        let token_admin = Address::generate(&env);
        let token_addr  = env.register_stellar_asset_contract_v2(token_admin.clone()).address();

        // Mint tokens to arbiter
        let sac = StellarAssetClient::new(&env, &token_addr);
        sac.mint(&arbiter, &1_000_000i128);

        let contract_id = env.register(ArbiterRegistryContract, ());
        let registry    = ArbiterRegistryContractClient::new(&env, &contract_id);
        registry.init(&admin, &token_addr, &100_000i128);

        registry.register(&arbiter, &200_000i128);
        assert!(!registry.is_approved(&arbiter));

        registry.approve_arbiter(&arbiter);
        assert!(registry.is_approved(&arbiter));

        registry.revoke_arbiter(&arbiter);
        assert!(!registry.is_approved(&arbiter));
    }
}
