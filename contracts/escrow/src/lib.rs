//! Tradeline Escrow Contract
//!
//! Manages milestone-based escrow for freelance jobs.
//! Implements checks-effects-interactions pattern and a reentrancy guard.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, Address, Env, Symbol, Vec,
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
    pub amount:     i128,
    pub status:     MilestoneStatus,
    pub freelancer: Address,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Job {
    pub client:     Address,
    pub arbiter:    Address,
    pub token:      Address,
    pub milestones: Vec<Milestone>,
    pub next_id:    u32,
}

#[contracttype]
pub enum DataKey {
    Job(u64),
    JobCounter,
    ReentrancyGuard,
    RepContract,
}

// ─── Errors ───────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowError {
    JobNotFound       = 1,
    MilestoneNotFound = 2,
    Unauthorized      = 3,
    InvalidStatus     = 4,
    InvalidSplit      = 5,
    Reentrancy        = 6,
    InvalidAmount     = 7,
}

impl From<EscrowError> for soroban_sdk::Error {
    fn from(e: EscrowError) -> Self {
        soroban_sdk::Error::from_contract_error(e as u32)
    }
}

// ─── Event topic symbols (max 9 chars for symbol_short) ──────────────────────
// symbol_short! requires ≤ 9 ASCII alphanumeric/underscore chars.
// We use abbreviated names that fit.

fn evt_job_created()       -> Symbol { symbol_short!("job_crtd") }
fn evt_ms_funded()         -> Symbol { symbol_short!("ms_fund") }
fn evt_ms_submitted()      -> Symbol { symbol_short!("ms_sub") }
fn evt_ms_approved()       -> Symbol { symbol_short!("ms_appr") }
fn evt_ms_disputed()       -> Symbol { symbol_short!("ms_disp") }
fn evt_disp_resolved()     -> Symbol { symbol_short!("disp_res") }

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {

    pub fn init(env: Env, rep_contract: Address) {
        env.storage().instance().set(&DataKey::RepContract,     &rep_contract);
        env.storage().instance().set(&DataKey::JobCounter,      &0u64);
        env.storage().instance().set(&DataKey::ReentrancyGuard, &false);
    }

    pub fn create_job(
        env:     Env,
        client:  Address,
        token:   Address,
        arbiter: Address,
    ) -> u64 {
        client.require_auth();

        let job_id: u64 = env.storage().instance()
            .get(&DataKey::JobCounter).unwrap_or(0);

        let job = Job {
            client:     client.clone(),
            arbiter:    arbiter.clone(),
            token:      token.clone(),
            milestones: Vec::new(&env),
            next_id:    0,
        };

        env.storage().persistent().set(&DataKey::Job(job_id), &job);
        env.storage().instance().set(&DataKey::JobCounter, &(job_id + 1));

        env.events().publish(
            (evt_job_created(),),
            (job_id, client, arbiter, token),
        );
        job_id
    }

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

        let milestone_id = job.next_id;
        job.milestones.push_back(Milestone {
            amount,
            status:     MilestoneStatus::Funded,
            freelancer: freelancer.clone(),
        });
        job.next_id += 1;
        env.storage().persistent().set(&DataKey::Job(job_id), &job);

        let token_client = token::Client::new(&env, &job.token);
        token_client.transfer(&job.client, &env.current_contract_address(), &amount);

        env.events().publish(
            (evt_ms_funded(),),
            (job_id, milestone_id, freelancer, amount),
        );
        Self::set_guard(&env, false);
        Ok(milestone_id)
    }

    pub fn submit_milestone(
        env:          Env,
        job_id:       u64,
        milestone_id: u32,
    ) -> Result<(), soroban_sdk::Error> {
        let mut job = Self::load_job(&env, job_id)?;
        let mut ms  = Self::get_milestone(&job, milestone_id)?;
        ms.freelancer.require_auth();

        if ms.status != MilestoneStatus::Funded {
            return Err(EscrowError::InvalidStatus.into());
        }
        ms.status = MilestoneStatus::Submitted;
        Self::set_milestone(&mut job, milestone_id, ms);
        env.storage().persistent().set(&DataKey::Job(job_id), &job);

        env.events().publish((evt_ms_submitted(),), (job_id, milestone_id));
        Ok(())
    }

    pub fn approve_milestone(
        env:          Env,
        job_id:       u64,
        milestone_id: u32,
    ) -> Result<(), soroban_sdk::Error> {
        Self::reentrancy_check(&env)?;
        Self::set_guard(&env, true);

        let mut job = Self::load_job(&env, job_id)?;
        let mut ms  = Self::get_milestone(&job, milestone_id)?;
        job.client.require_auth();

        if ms.status != MilestoneStatus::Submitted {
            Self::set_guard(&env, false);
            return Err(EscrowError::InvalidStatus.into());
        }

        let amount     = ms.amount;
        let freelancer = ms.freelancer.clone();
        ms.status      = MilestoneStatus::Approved;
        Self::set_milestone(&mut job, milestone_id, ms);
        env.storage().persistent().set(&DataKey::Job(job_id), &job);

        let token_client = token::Client::new(&env, &job.token);
        token_client.transfer(&env.current_contract_address(), &freelancer, &amount);

        let rep: Address = env.storage().instance().get(&DataKey::RepContract).unwrap();
        let rep_client   = reputation::Client::new(&env, &rep);
        rep_client.record_rating(&job.client, &freelancer, &5i32, &job_id, &milestone_id);

        env.events().publish(
            (evt_ms_approved(),),
            (job_id, milestone_id, freelancer, amount),
        );
        Self::set_guard(&env, false);
        Ok(())
    }

    pub fn dispute_milestone(
        env:          Env,
        job_id:       u64,
        milestone_id: u32,
        caller:       Address,
    ) -> Result<(), soroban_sdk::Error> {
        let mut job = Self::load_job(&env, job_id)?;
        let mut ms  = Self::get_milestone(&job, milestone_id)?;

        let is_client     = caller == job.client;
        let is_freelancer = caller == ms.freelancer;
        if !is_client && !is_freelancer {
            return Err(EscrowError::Unauthorized.into());
        }
        caller.require_auth();

        if ms.status != MilestoneStatus::Submitted && ms.status != MilestoneStatus::Funded {
            return Err(EscrowError::InvalidStatus.into());
        }
        ms.status = MilestoneStatus::Disputed;
        Self::set_milestone(&mut job, milestone_id, ms);
        env.storage().persistent().set(&DataKey::Job(job_id), &job);

        env.events().publish((evt_ms_disputed(),), (job_id, milestone_id));
        Ok(())
    }

    pub fn resolve_dispute(
        env:            Env,
        job_id:         u64,
        milestone_id:   u32,
        freelancer_bps: u32,
    ) -> Result<(), soroban_sdk::Error> {
        Self::reentrancy_check(&env)?;
        Self::set_guard(&env, true);

        if freelancer_bps > 10_000 {
            Self::set_guard(&env, false);
            return Err(EscrowError::InvalidSplit.into());
        }

        let mut job = Self::load_job(&env, job_id)?;
        let mut ms  = Self::get_milestone(&job, milestone_id)?;
        job.arbiter.require_auth();

        if ms.status != MilestoneStatus::Disputed {
            Self::set_guard(&env, false);
            return Err(EscrowError::InvalidStatus.into());
        }

        let amount         = ms.amount;
        let freelancer     = ms.freelancer.clone();
        let client         = job.client.clone();
        ms.status          = MilestoneStatus::Resolved;
        Self::set_milestone(&mut job, milestone_id, ms);
        env.storage().persistent().set(&DataKey::Job(job_id), &job);

        let freelancer_amt = (amount * freelancer_bps as i128) / 10_000;
        let client_amt     = amount - freelancer_amt;

        let token_client = token::Client::new(&env, &job.token);
        if freelancer_amt > 0 {
            token_client.transfer(&env.current_contract_address(), &freelancer, &freelancer_amt);
        }
        if client_amt > 0 {
            token_client.transfer(&env.current_contract_address(), &client, &client_amt);
        }

        let freelancer_rating = ((freelancer_bps as i32 * 5) / 10_000).max(1);
        let rep: Address = env.storage().instance().get(&DataKey::RepContract).unwrap();
        let rep_client   = reputation::Client::new(&env, &rep);
        rep_client.record_rating(&client, &freelancer, &freelancer_rating, &job_id, &milestone_id);
        rep_client.record_rating(&freelancer, &client, &3i32, &job_id, &milestone_id);

        env.events().publish(
            (evt_disp_resolved(),),
            (job_id, milestone_id, freelancer_bps, freelancer_amt, client_amt),
        );
        Self::set_guard(&env, false);
        Ok(())
    }

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

    // ── Internal ──────────────────────────────────────────────────────────────

    fn load_job(env: &Env, job_id: u64) -> Result<Job, soroban_sdk::Error> {
        env.storage().persistent()
            .get(&DataKey::Job(job_id))
            .ok_or_else(|| EscrowError::JobNotFound.into())
    }

    fn get_milestone(job: &Job, milestone_id: u32) -> Result<Milestone, soroban_sdk::Error> {
        job.milestones.get(milestone_id)
            .ok_or_else(|| EscrowError::MilestoneNotFound.into())
    }

    fn set_milestone(job: &mut Job, milestone_id: u32, ms: Milestone) {
        job.milestones.set(milestone_id, ms);
    }

    fn reentrancy_check(env: &Env) -> Result<(), soroban_sdk::Error> {
        let locked: bool = env.storage().instance()
            .get(&DataKey::ReentrancyGuard).unwrap_or(false);
        if locked { Err(EscrowError::Reentrancy.into()) } else { Ok(()) }
    }

    fn set_guard(env: &Env, value: bool) {
        env.storage().instance().set(&DataKey::ReentrancyGuard, &value);
    }
}

// ─── Reputation cross-contract client stub ───────────────────────────────────

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

// ─── Tests ────────────────────────────────────────────────────────────────────

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
        let token_addr  = env.register_stellar_asset_contract_v2(token_admin.clone()).address();

        let client_addr = Address::generate(&env);
        let freelancer  = Address::generate(&env);
        let arbiter     = Address::generate(&env);

        let sac = StellarAssetClient::new(&env, &token_addr);
        sac.mint(&client_addr, &1_000_000_000i128);

        let rep_addr  = env.register(reputation_stub::ReputationStub, ());
        let escrow_id = env.register(EscrowContract, ());
        let escrow    = EscrowContractClient::new(&env, &escrow_id);
        escrow.init(&rep_addr);

        TestEnv { env, escrow, token: token_addr, client_addr, freelancer, arbiter }
    }

    #[test]
    fn test_happy_path_approve() {
        let t = setup();
        let job_id = t.escrow.create_job(&t.client_addr, &t.token, &t.arbiter);
        let ms_id  = t.escrow.fund_milestone(&job_id, &t.freelancer, &500_000_000i128);
        t.escrow.submit_milestone(&job_id, &ms_id);

        let tc     = TokenClient::new(&t.env, &t.token);
        let before = tc.balance(&t.freelancer);
        t.escrow.approve_milestone(&job_id, &ms_id);
        assert_eq!(tc.balance(&t.freelancer) - before, 500_000_000i128);
        assert_eq!(t.escrow.get_milestone_info(&job_id, &ms_id).status, MilestoneStatus::Approved);
    }

    #[test]
    fn test_dispute_resolve_70_30() {
        let t = setup();
        let job_id = t.escrow.create_job(&t.client_addr, &t.token, &t.arbiter);
        let ms_id  = t.escrow.fund_milestone(&job_id, &t.freelancer, &1_000_000_000i128);
        t.escrow.submit_milestone(&job_id, &ms_id);
        t.escrow.dispute_milestone(&job_id, &ms_id, &t.client_addr);

        let tc          = TokenClient::new(&t.env, &t.token);
        let fl_before   = tc.balance(&t.freelancer);
        let cl_before   = tc.balance(&t.client_addr);
        t.escrow.resolve_dispute(&job_id, &ms_id, &7_000u32);
        assert_eq!(tc.balance(&t.freelancer)  - fl_before, 700_000_000i128);
        assert_eq!(tc.balance(&t.client_addr) - cl_before, 300_000_000i128);
        assert_eq!(t.escrow.get_milestone_info(&job_id, &ms_id).status, MilestoneStatus::Resolved);
    }

    #[test]
    #[should_panic]
    fn test_reentrancy_blocked() {
        let t = setup();
        t.env.storage().instance().set(&DataKey::ReentrancyGuard, &true);
        let job_id = t.escrow.create_job(&t.client_addr, &t.token, &t.arbiter);
        t.escrow.fund_milestone(&job_id, &t.freelancer, &100i128);
    }

    #[test]
    #[should_panic]
    fn test_invalid_split_above_10000() {
        let t = setup();
        let job_id = t.escrow.create_job(&t.client_addr, &t.token, &t.arbiter);
        let ms_id  = t.escrow.fund_milestone(&job_id, &t.freelancer, &500i128);
        t.escrow.submit_milestone(&job_id, &ms_id);
        t.escrow.dispute_milestone(&job_id, &ms_id, &t.client_addr);
        t.escrow.resolve_dispute(&job_id, &ms_id, &10_001u32);
    }

    #[test]
    #[should_panic]
    fn test_approve_before_submit_fails() {
        let t = setup();
        let job_id = t.escrow.create_job(&t.client_addr, &t.token, &t.arbiter);
        let ms_id  = t.escrow.fund_milestone(&job_id, &t.freelancer, &500i128);
        t.escrow.approve_milestone(&job_id, &ms_id);
    }
}

#[cfg(test)]
mod reputation_stub {
    use soroban_sdk::{contract, contractimpl, Address, Env};

    #[contract]
    pub struct ReputationStub;

    #[contractimpl]
    impl ReputationStub {
        pub fn record_rating(
            _env: Env, _rater: Address, _ratee: Address,
            _stars: i32, _job_id: u64, _milestone_id: u32,
        ) {}
    }
}
