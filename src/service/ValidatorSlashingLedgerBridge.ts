import crypto from 'node:crypto';

export interface ValidatorLedgerPosting {
  accountCode: string; // 2103 (Validator Staked Liability), 3101 (PoR Capital Buffer), 4101 (Network Slashing Revenue)
  validatorId: string;
  asset: string;
  direction: 'DEBIT' | 'CREDIT';
  amount: string;
}

export interface SlashingEventJournal {
  journalId: string;
  validatorId: string;
  infraction: 'DOUBLE_SIGN' | 'DOWNTIME_LIVENESS' | 'EQUIVOCATION';
  slashedAmount: string;
  rewardPoolAmount: string;
  burnAmount: string;
  postings: ValidatorLedgerPosting[];
  timestamp: string;
}

export class ValidatorSlashingLedgerBridge {
  private readonly DOUBLE_SIGN_PENALTY_BPS = 500; // 5.00%
  private readonly DOWNTIME_PENALTY_BPS = 50; // 0.50%

  public constructSlashingJournal(params: {
    validatorId: string;
    infraction: 'DOUBLE_SIGN' | 'DOWNTIME_LIVENESS' | 'EQUIVOCATION';
    stakedAmount: number; // in ONXC
  }): SlashingEventJournal {
    const penaltyBps =
      params.infraction === 'DOUBLE_SIGN' || params.infraction === 'EQUIVOCATION'
        ? this.DOUBLE_SIGN_PENALTY_BPS
        : this.DOWNTIME_PENALTY_BPS;

    const slashedTotal = (params.stakedAmount * penaltyBps) / 10000;
    // 50% allocated to insurance capital reserve (3101), 50% network slashing revenue (4101)
    const reserveAlloc = slashedTotal * 0.5;
    const revenueAlloc = slashedTotal * 0.5;

    const postings: ValidatorLedgerPosting[] = [
      {
        accountCode: '2103', // Validator Staking Liability decreases
        validatorId: params.validatorId,
        asset: 'ONXC',
        direction: 'DEBIT',
        amount: slashedTotal.toFixed(8),
      },
      {
        accountCode: '3101', // PoR Capital Insurance Reserve increases
        validatorId: params.validatorId,
        asset: 'ONXC',
        direction: 'CREDIT',
        amount: reserveAlloc.toFixed(8),
      },
      {
        accountCode: '4101', // Slashing Network Revenue increases
        validatorId: params.validatorId,
        asset: 'ONXC',
        direction: 'CREDIT',
        amount: revenueAlloc.toFixed(8),
      },
    ];

    // Invariant Verification: Sum(Debits) == Sum(Credits)
    const debits = postings
      .filter((p) => p.direction === 'DEBIT')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const credits = postings
      .filter((p) => p.direction === 'CREDIT')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    if (Math.abs(debits - credits) > 0.0000001) {
      throw new Error(`Slashing Double-Entry Invariant Failed: Debits (${debits}) != Credits (${credits})`);
    }

    return {
      journalId: `jrnl_slash_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      validatorId: params.validatorId,
      infraction: params.infraction,
      slashedAmount: slashedTotal.toFixed(8),
      rewardPoolAmount: reserveAlloc.toFixed(8),
      burnAmount: revenueAlloc.toFixed(8),
      postings,
      timestamp: new Date().toISOString(),
    };
  }
}
