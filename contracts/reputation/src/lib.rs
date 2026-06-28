//! Tradeline Reputation Contract
//!
//! Stores per-address reputation scores.
//! Only the authorised escrow contract may record ratings.
//!
//! Reputation is an immutable append log + aggregated summary:
//!   - total_ratings: count of ratings received
//!   - total_stars:   sum of stars (1–5) received
//!   - average_stars: total_stars * 100 / total_ratings  (fixed-point ×100)

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Vec};

// ─── Data types ──────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug)]
pub struct Rating {
    pub rater:        Address,
    pub stars:        i32,   // 1–5
    pub job_id:       u64,
    pub milestone_id: u32,
    pub timestamp:    u64,
}

#[contracttype]
#[derive(Clone, Debug, Default)]
pub struct RepSummary {
    pub total_ratings: u32,
    pub total_stars:   i64,
    /// Fixed-point ×100: e.g. 467 → 4.67 stars
    pub average_x100:  i64,
}

#[contracttype]
pub enum DataKey {
    /// Authorised caller (escrow contract)
    EscrowContract,
    /// RepSummary for an address
    Summary(Address),
    /// Full log of ratings for an address
    Ratings(Address),
}

// ─── Contract ────────────────────────────────────────────────────────────────

#[contract]
pub struct ReputationContract;

#[contractimpl]
impl ReputationContract {
    /// Called once by deployer; `escrow` is the only address allowed to write.
    pub fn init(env: Env, escrow: Address) {
        env.storage()
            .instance()
            .set(&DataKey::EscrowContract, &escrow);
    }

    /// Record a rating. Only callable by the escrow contract.
    pub fn record_rating(
        env:          Env,
        rater:        Address,
        ratee:        Address,
        stars:        i32,
        job_id:       u64,
        milestone_id: u32,
    ) {
        // Auth: only the registered escrow contract may call this
        let escrow: Address = env
            .storage()
            .instance()
            .get(&DataKey::EscrowContract)
            .unwrap();
        escrow.require_auth();

        let stars_clamped = stars.clamp(1, 5);

        let rating = Rating {
            rater,
            stars: stars_clamped,
            job_id,
            milestone_id,
            timestamp: env.ledger().timestamp(),
        };

        // Append to the ratings log
        let mut log: Vec<Rating> = env
            .storage()
            .persistent()
            .get(&DataKey::Ratings(ratee.clone()))
            .unwrap_or_else(|| Vec::new(&env));
        log.push_back(rating);
        env.storage()
            .persistent()
            .set(&DataKey::Ratings(ratee.clone()), &log);

        // Update summary
        let mut summary: RepSummary = env
            .storage()
            .persistent()
            .get(&DataKey::Summary(ratee.clone()))
            .unwrap_or_default();

        summary.total_ratings += 1;
        summary.total_stars   += stars_clamped as i64;
        summary.average_x100  = (summary.total_stars * 100) / summary.total_ratings as i64;

        env.storage()
            .persistent()
            .set(&DataKey::Summary(ratee.clone()), &summary);

        env.events()
            .publish((b"rating_recorded",), (ratee, stars_clamped, job_id, milestone_id));
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    pub fn get_summary(env: Env, addr: Address) -> RepSummary {
        env.storage()
            .persistent()
            .get(&DataKey::Summary(addr))
            .unwrap_or_default()
    }

    pub fn get_ratings(env: Env, addr: Address) -> Vec<Rating> {
        env.storage()
            .persistent()
            .get(&DataKey::Ratings(addr))
            .unwrap_or_else(|| Vec::new(&env))
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    #[test]
    fn test_record_and_average() {
        let env    = Env::default();
        env.mock_all_auths();

        let escrow   = Address::generate(&env);
        let freelancer = Address::generate(&env);
        let client     = Address::generate(&env);

        let contract_id = env.register(ReputationContract, ());
        let rep = ReputationContractClient::new(&env, &contract_id);
        rep.init(&escrow);

        rep.record_rating(&client, &freelancer, &5i32, &0u64, &0u32);
        rep.record_rating(&client, &freelancer, &4i32, &0u64, &1u32);

        let summary = rep.get_summary(&freelancer);
        assert_eq!(summary.total_ratings, 2);
        assert_eq!(summary.total_stars,   9);
        assert_eq!(summary.average_x100,  450); // 4.50 stars

        let ratings = rep.get_ratings(&freelancer);
        assert_eq!(ratings.len(), 2);
    }

    #[test]
    fn test_stars_clamped() {
        let env = Env::default();
        env.mock_all_auths();

        let escrow     = Address::generate(&env);
        let freelancer = Address::generate(&env);
        let client     = Address::generate(&env);

        let contract_id = env.register(ReputationContract, ());
        let rep = ReputationContractClient::new(&env, &contract_id);
        rep.init(&escrow);

        // Try to submit 10-star rating; should clamp to 5
        rep.record_rating(&client, &freelancer, &10i32, &0u64, &0u32);
        let summary = rep.get_summary(&freelancer);
        assert_eq!(summary.total_stars, 5);
    }
}
