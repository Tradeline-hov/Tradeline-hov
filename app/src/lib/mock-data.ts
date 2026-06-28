/**
 * Demo data used for UI preview before contracts are deployed.
 * Replace calls to these with real contract client calls once
 * deploy.ps1 has been run and .env.local is populated.
 */

import type { Job, RepSummary, ArbiterInfo } from '@/types';

export const DEMO_CLIENT_ADDRESS     = 'GCLIENTXYZ3K7DEMO1ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890A';
export const DEMO_FREELANCER_ADDRESS = 'GFREELANCERDEMO1ABCDEFGHIJKLMNOPQRSTUVWXYZ12345678901B';
export const DEMO_ARBITER_ADDRESS    = 'GARBITERDEMO1ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789012345C';
export const DEMO_USDC_ADDRESS       = 'CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU';

export const DEMO_JOB: Job = {
  id:      1n,
  client:  DEMO_CLIENT_ADDRESS,
  arbiter: DEMO_ARBITER_ADDRESS,
  token:   DEMO_USDC_ADDRESS,
  milestones: [
    {
      amount:     1_000_000_000n, // 100 USDC (stroops)
      status:     'Approved',
      freelancer: DEMO_FREELANCER_ADDRESS,
    },
    {
      amount:     2_000_000_000n, // 200 USDC (stroops)
      status:     'Disputed',
      freelancer: DEMO_FREELANCER_ADDRESS,
    },
  ],
};

export const DEMO_REP: RepSummary = {
  total_ratings: 4,
  total_stars:   18n,
  average_x100:  450n, // 4.50 ★
};

export const DEMO_ARBITER_INFO: ArbiterInfo = {
  address:           DEMO_ARBITER_ADDRESS,
  stake_amount:      100_000_000n, // 10 USDC
  approved:          true,
  disputes_resolved: 3,
};
