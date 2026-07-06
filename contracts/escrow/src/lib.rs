//! Tradeline Escrow Contract
//!
//! Manages milestone-based escrow for freelance jobs.
//! Implements checks-effects-interactions pattern and a reentrancy guard.
//!
//! Flow:
//!   1. client calls `create_job`  → stores job metadata, assigns arbiter
//!   2. client calls `fund_milestone` → transfers USDC from client to contract
//!   3. freelancer calls `submit_milestone` → marks milestone as submitted
//!   4a. client calls `approve_milestone` → releases USDC to freelancer, records rating
//!   4b. either party calls `dispute_milestone` → escalates to arbiter
//!   5. arbiter calls `resolve_dispute` → splits USDC per basis points, records rating

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, Vec,
};

// ─── Data types ──────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MilestoneStatus {
    Funded,
    Submitted,
    Approved,
    Disputed,
    Resolved,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Milestone {
    pub amount:      i128,
    pub status:      MilestoneStatus,
    pub freelancer:  Address,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Job {
    pub client:    Address,
    pub arbiter:   Address,
    pub token:     Address,
    pub milestones: Vec<Milestone>,
    pub next_id:   u32,
}

// Storage keys
#[contracttype]
pub enum DataKey {
    Job(u64),          // job_id → Job
    JobCounter,        // global monotonic counter
    ReentrancyGuard,   // bool lock
    RepContract,       // Address of reputation contract
}

// ─── Error codes ─────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowError {
    JobNotFound         = 1,
    MilestoneNotFound   = 2,
    Unauthorized        = 3,
    InvalidStatus       = 4,
    InvalidSplit        = 5,
    Reentrancy          = 6,
    InvalidAmount       = 7,
}

impl From<EscrowError> for soroban_sdk::Error {
    fn from(e: EscrowError) -> Self {
        soroban_sdk::Error::from_contract_error(e as u32)
    }
}

// ─── Contract ────────────────────────────────────────────────────────────────

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    // ── Initialise ────────────────────────────────────────────────────────────

    /// Set the reputation contract address (called once by deployer).
    pub fn init(env: Env, rep_contract: Address) {
        env.storage()
            .instance()
            .set(&DataKey::RepContract, &rep_contract);
        env.storage()
            .instance()
            .set(&DataKey::JobCounter, &0u64);
        env.storage()
            .instance()
            .set(&DataKey::ReentrancyGuard, &false);
    }

    // ── Job creation ──────────────────────────────────────────────────────────

    /// Client creates a new job record (no funds yet).
    pub fn create_job(
        env:     Env,
        client:  Address,
        token:   Address,
        arbiter: Address,
    ) -> u64 {
        client.require_auth();

        let job_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::JobCounter)
            .unwrap_or(0);

        let job = Job {
            client:     client.clone(),
            arbiter:    arbiter.clone(),
            token:      token.clone(),
            milestones: Vec::new(&env),
            next_id:    0,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Job(job_id), &job);

        env.storage()
            .instance()
            .set(&DataKey::JobCounter, &(job_id + 1));

        env.events()
            .publish((b"job_created",), (job_id, client, arbiter, token));

        job_id
    }

    // ── Milestone funding ─────────────────────────────────────────────────────

    /// Client locks `amount` USDC into escrow for a new milestone.
    pub fn fund_milestone(
        env:        Env,
        job_id:     u64,
        freelancer: Address,
        amount:     i128,
    ) -> Result<u32, soroban_sdk::Error> {
        Self::reentrancy_check(&env)?;
        Self::set_guard(&env, true);

        if amount <= 0 {
            Self::set_guard(&env, false);
            return Err(EscrowError::InvalidAmount.into());
        }

        let mut job: Job = Self::load_job(&env, job_id)?;
        job.client.require_auth();

        // CHECKS: pass
        // EFFECTS: update state before any external call
        let milestone_id = job.next_id;
        let milestone = Milestone {
            amount,
            status:     MilestoneStatus::Funded,
            freelancer: freelancer.clone(),
        };
        job.milestones.push_back(milestone);
        job.next_id += 1;

        env.storage()
            .persistent()
            .set(&DataKey::Job(job_id), &job);

        // INTERACTIONS: token transfer after state update
        let token_client = token::Client::new(&env, &job.token);
        token_client.transfer(&job.client, &env.current_contract_address(), &amount);

        env.events().publish(
            (b"milestone_funded",),
            (job_id, milestone_id, freelancer, amount),
        );

        Self::set_guard(&env, false);
        Ok(milestone_id)
    }

    // ── Submission ────────────────────────────────────────────────────────────

    /// Freelancer marks a milestone as submitted / delivered.
    pub fn submit_milestone(env: Env, job_id: u64, milestone_id: u32) -> Result<(), soroban_sdk::Error> {
        let mut job: Job = Self::load_job(&env, job_id)?;
        let mut ms   = Self::get_milestone(&job, milestone_id)?;

        ms.freelancer.require_auth();

        if ms.status != MilestoneStatus::Funded {
            return Err(EscrowError::InvalidStatus.into());
        }

        ms.status = MilestoneStatus::Submitted;
        Self::set_milestone(&mut job, milestone_id, ms.clone());
        env.storage().persistent().set(&DataKey::Job(job_id), &job);

        env.events()
            .publish((b"milestone_submitted",), (job_id, milestone_id));

        Ok(())
    }

    // ── Approval ──────────────────────────────────────────────────────────────

    /// Client approves → full amount released to freelancer instantly.
    pub fn approve_milestone(env: Env, job_id: u64, milestone_id: u32) -> Result<(), soroban_sdk::Error> {
        Self::reentrancy_check(&env)?;
        Self::set_guard(&env, true);

        let mut job: Job = Self::load_job(&env, job_id)?;
        let mut ms   = Self::get_milestone(&job, milestone_id)?;

        job.client.require_auth();

        if ms.status != MilestoneStatus::Submitted {
            Self::set_guard(&env, false);
            return Err(EscrowError::InvalidStatus.into());
        }

        // EFFECTS first
        let amount     = ms.amount;
        let freelancer = ms.freelancer.clone();
        ms.status      = MilestoneStatus::Approved;
        Self::set_milestone(&mut job, milestone_id, ms);
        env.storage().persistent().set(&DataKey::Job(job_id), &job);

        // INTERACTIONS
        let token_client = token::Client::new(&env, &job.token);
        token_client.transfer(&env.current_contract_address(), &freelancer, &amount);

        // Record reputation (cross-contract call last, after funds released)
        let rep: Address = env
            .storage()
            .instance()
            .get(&DataKey::RepContract)
            .unwrap();
        let rep_client = reputation::Client::new(&env, &rep);
        rep_client.record_rating(&job.client, &freelancer, &5i32, &job_id, &milestone_id);

        env.events().publish(
            (b"milestone_approved",),
            (job_id, milestone_id, freelancer, amount),
        );

        Self::set_guard(&env, false);
        Ok(())
    }

    // ── Dispute ───────────────────────────────────────────────────────────────

    /// Client or freelancer raises a dispute.
    /// Pass `caller` as the address of the party raising the dispute so auth can be verified.
    pub fn dispute_milestone(
        env:          Env,
        job_id:       u64,
        milestone_id: u32,
        caller:       Address,
    ) -> Result<(), soroban_sdk::Error> {
        let mut job: Job = Self::load_job(&env, job_id)?;
        let mut ms   = Self::get_milestone(&job, milestone_id)?;

        // Verify caller is client or freelancer
        let is_client     = caller == job.client;
        let is_freelancer = caller == ms.freelancer;

        if !is_client && !is_freelancer {
            return Err(EscrowError::Unauthorized.into());
        }

        // Require auth from the verified caller
        caller.require_auth();

        if ms.status != MilestoneStatus::Submitted && ms.status != MilestoneStatus::Funded {
            return Err(EscrowError::InvalidStatus.into());
        }

        ms.status = MilestoneStatus::Disputed;
        Self::set_milestone(&mut job, milestone_id, ms);
        env.storage().persistent().set(&DataKey::Job(job_id), &job);

        env.events()
            .publish((b"milestone_disputed",), (job_id, milestone_id));

        Ok(())
    }

    // ── Resolve ───────────────────────────────────────────────────────────────

    /// Arbiter resolves a dispute by splitting the escrowed amount.
    /// `freelancer_bps` is basis points going to freelancer (0–10 000).
    /// Remainder goes to client.
    pub fn resolve_dispute(
        env:             Env,
        job_id:          u64,
        milestone_id:    u32,
        freelancer_bps:  u32,
    ) -> Result<(), soroban_sdk::Error> {
        Self::reentrancy_check(&env)?;
        Self::set_guard(&env, true);

        if freelancer_bps > 10_000 {
            Self::set_guard(&env, false);
            return Err(EscrowError::InvalidSplit.into());
        }

        let mut job: Job = Self::load_job(&env, job_id)?;
        let mut ms   = Self::get_milestone(&job, milestone_id)?;

        job.arbiter.require_auth();

        if ms.status != MilestoneStatus::Disputed {
            Self::set_guard(&env, false);
            return Err(EscrowError::InvalidStatus.into());
        }

        // EFFECTS
        let amount         = ms.amount;
        let freelancer     = ms.freelancer.clone();
        let client         = job.client.clone();
        ms.status          = MilestoneStatus::Resolved;
        Self::set_milestone(&mut job, milestone_id, ms);
        env.storage().persistent().set(&DataKey::Job(job_id), &job);

        // Compute splits (integer arithmetic, no floats)
        let freelancer_amt = (amount * freelancer_bps as i128) / 10_000;
        let client_amt     = amount - freelancer_amt;

        // INTERACTIONS
        let token_client = token::Client::new(&env, &job.token);
        if freelancer_amt > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &freelancer,
                &freelancer_amt,
            );
        }
        if client_amt > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &client,
                &client_amt,
            );
        }

        // Reputation: freelancer_bps as proxy for quality (0–100 mapped to 1–5 stars)
        let freelancer_rating = ((freelancer_bps as i32 * 5) / 10_000).max(1);
        let client_rating     = 3i32; // neutral for client in disputes
        let rep: Address = env
            .storage()
            .instance()
            .get(&DataKey::RepContract)
            .unwrap();
        let rep_client = reputation::Client::new(&env, &rep);
        rep_client.record_rating(&client, &freelancer, &freelancer_rating, &job_id, &milestone_id);
        rep_client.record_rating(&freelancer, &client, &client_rating, &job_id, &milestone_id);

        env.events().publish(
            (b"dispute_resolved",),
            (job_id, milestone_id, freelancer_bps, freelancer_amt, client_amt),
        );

        Self::set_guard(&env, false);
        Ok(())
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    pub fn get_job(env: Env, job_id: u64) -> Result<Job, soroban_sdk::Error> {
        Self::load_job(&env, job_id)
    }

    pub fn get_milestone_info(
        env:          Env,
        job_id:       u64,
        milestone_id: u32,
    ) -> Result<Milestone, soroban_sdk::Error> {
        let job = Self::load_job(&env, job_id)?;
        Self::get_milestone(&job, milestone_id)
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    fn load_job(env: &Env, job_id: u64) -> Result<Job, soroban_sdk::Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Job(job_id))
            .ok_or_else(|| EscrowError::JobNotFound.into())
    }

    fn get_milestone(job: &Job, milestone_id: u32) -> Result<Milestone, soroban_sdk::Error> {
        job.milestones
            .get(milestone_id)
            .ok_or_else(|| EscrowError::MilestoneNotFound.into())
    }

    fn set_milestone(job: &mut Job, milestone_id: u32, ms: Milestone) {
        job.milestones.set(milestone_id, ms);
    }

    /// Reentrancy guard – returns Err if already entered.
    fn reentrancy_check(env: &Env) -> Result<(), soroban_sdk::Error> {
        let locked: bool = env
            .storage()
            .instance()
            .get(&DataKey::ReentrancyGuard)
            .unwrap_or(false);
        if locked {
            Err(EscrowError::Reentrancy.into())
        } else {
            Ok(())
        }
    }

    fn set_guard(env: &Env, value: bool) {
        env.storage()
            .instance()
            .set(&DataKey::ReentrancyGuard, &value);
    }
}

// ── Generated client stub for reputation contract ─────────────────────────────
mod reputation {
    use soroban_sdk::{contractclient, Address, Env};

    #[contractclient(name = "Client")]
    pub trait ReputationTrait {
        fn record_rating(
            env:          Env,
            rater:        Address,
            ratee:        Address,
            stars:        i32,
            job_id:       u64,
            milestone_id: u32,
        );
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::Address as _,
        token::{Client as TokenClient, StellarAssetClient},
        Address, Env,
    };

    struct TestEnv {
        env:         Env,
        escrow:      EscrowContractClient<'static>,
        token:       Address,
        client_addr: Address,
        freelancer:  Address,
        arbiter:     Address,
    }

    fn setup() -> TestEnv {
        let env = Env::default();
        env.mock_all_auths();

        let token_admin = Address::generate(&env);
        // Use register_stellar_asset_contract which works in soroban-sdk 21
        let token_addr  = env.register_stellar_asset_contract_v2(token_admin.clone()).address();

        let client_addr = Address::generate(&env);
        let freelancer  = Address::generate(&env);
        let arbiter     = Address::generate(&env);

        // Mint 1 000 USDC (10^9 stroops) to client
        let sac = StellarAssetClient::new(&env, &token_addr);
        sac.mint(&client_addr, &1_000_000_000i128);

        // Deploy no-op reputation stub
        let rep_addr = env.register(reputation_stub::ReputationStub, ());

        // Deploy escrow and initialise
        let escrow_id = env.register(EscrowContract, ());
        let escrow    = EscrowContractClient::new(&env, &escrow_id);
        escrow.init(&rep_addr);

        TestEnv { env, escrow, token: token_addr, client_addr, freelancer, arbiter }
    }

    // ── Happy path ────────────────────────────────────────────────────────────

    #[test]
    fn test_happy_path_approve() {
        let t = setup();

        let job_id = t.escrow.create_job(&t.client_addr, &t.token, &t.arbiter);
        let ms_id  = t.escrow.fund_milestone(&job_id, &t.freelancer, &500_000_000i128);

        t.escrow.submit_milestone(&job_id, &ms_id);

        let token_client = TokenClient::new(&t.env, &t.token);
        let before = token_client.balance(&t.freelancer);

        t.escrow.approve_milestone(&job_id, &ms_id);

        let after = token_client.balance(&t.freelancer);
        assert_eq!(after - before, 500_000_000i128);

        let ms = t.escrow.get_milestone_info(&job_id, &ms_id);
        assert_eq!(ms.status, MilestoneStatus::Approved);
    }

    // ── Dispute → resolve split ───────────────────────────────────────────────

    #[test]
    fn test_dispute_resolve_70_30() {
        let t = setup();

        let job_id = t.escrow.create_job(&t.client_addr, &t.token, &t.arbiter);
        let ms_id  = t.escrow.fund_milestone(&job_id, &t.freelancer, &1_000_000_000i128);
        t.escrow.submit_milestone(&job_id, &ms_id);
        t.escrow.dispute_milestone(&job_id, &ms_id, &t.client_addr);

        let token_client   = TokenClient::new(&t.env, &t.token);
        let fl_before      = token_client.balance(&t.freelancer);
        let client_before  = token_client.balance(&t.client_addr);

        // Arbiter splits 70 % freelancer, 30 % client
        t.escrow.resolve_dispute(&job_id, &ms_id, &7_000u32);

        let fl_after     = token_client.balance(&t.freelancer);
        let client_after = token_client.balance(&t.client_addr);

        assert_eq!(fl_after - fl_before,       700_000_000i128);
        assert_eq!(client_after - client_before, 300_000_000i128);

        let ms = t.escrow.get_milestone_info(&job_id, &ms_id);
        assert_eq!(ms.status, MilestoneStatus::Resolved);
    }

    // ── Reentrancy guard ──────────────────────────────────────────────────────

    #[test]
    #[should_panic]
    fn test_reentrancy_blocked() {
        let t = setup();
        // Manually lock the guard and attempt another guarded call
        t.env.storage().instance().set(&DataKey::ReentrancyGuard, &true);
        let job_id = t.escrow.create_job(&t.client_addr, &t.token, &t.arbiter);
        // This should panic because the guard is set
        t.escrow.fund_milestone(&job_id, &t.freelancer, &100i128);
    }

    // ── Invalid split ─────────────────────────────────────────────────────────

    #[test]
    #[should_panic]
    fn test_invalid_split_above_10000() {
        let t = setup();
        let job_id = t.escrow.create_job(&t.client_addr, &t.token, &t.arbiter);
        let ms_id  = t.escrow.fund_milestone(&job_id, &t.freelancer, &500i128);
        t.escrow.submit_milestone(&job_id, &ms_id);
        t.escrow.dispute_milestone(&job_id, &ms_id, &t.client_addr);
        t.escrow.resolve_dispute(&job_id, &ms_id, &10_001u32); // should panic
    }

    // ── Only submitted milestones can be approved ─────────────────────────────

    #[test]
    #[should_panic]
    fn test_approve_before_submit_fails() {
        let t = setup();
        let job_id = t.escrow.create_job(&t.client_addr, &t.token, &t.arbiter);
        let ms_id  = t.escrow.fund_milestone(&job_id, &t.freelancer, &500i128);
        // Skip submit_milestone → should fail
        t.escrow.approve_milestone(&job_id, &ms_id);
    }
}

// Minimal no-op reputation stub for tests
#[cfg(test)]
mod reputation_stub {
    use soroban_sdk::{contract, contractimpl, Address, Env};

    #[contract]
    pub struct ReputationStub;

    #[contractimpl]
    impl ReputationStub {
        pub fn record_rating(
            _env:          Env,
            _rater:        Address,
            _ratee:        Address,
            _stars:        i32,
            _job_id:       u64,
            _milestone_id: u32,
        ) {
            // no-op for testing
        }
    }
}
