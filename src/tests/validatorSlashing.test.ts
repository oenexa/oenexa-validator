import { describe, it, expect, beforeEach } from 'vitest';
import { ValidatorSlashingLedgerBridge } from '../service/ValidatorSlashingLedgerBridge.js';

describe('ValidatorSlashingLedgerBridge Double-Entry Staking Slashing', () => {
  let bridge: ValidatorSlashingLedgerBridge;

  beforeEach(() => {
    bridge = new ValidatorSlashingLedgerBridge();
  });

  it('generates balanced double-entry postings for 5% double-sign slashing penalty', () => {
    const journal = bridge.constructSlashingJournal({
      validatorId: 'val_node_eu_central_1',
      infraction: 'DOUBLE_SIGN',
      stakedAmount: 10000.0, // 10,000 ONXC
    });

    // 5% of 10,000 = 500 ONXC slashed
    expect(parseFloat(journal.slashedAmount)).toBeCloseTo(500.0, 4);
    expect(parseFloat(journal.rewardPoolAmount)).toBeCloseTo(250.0, 4);
    expect(parseFloat(journal.burnAmount)).toBeCloseTo(250.0, 4);

    // Verify Debits == Credits invariant
    const debits = journal.postings
      .filter((p) => p.direction === 'DEBIT')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const credits = journal.postings
      .filter((p) => p.direction === 'CREDIT')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    expect(debits).toBeCloseTo(500.0, 6);
    expect(credits).toBeCloseTo(500.0, 6);
  });

  it('generates balanced double-entry postings for 0.5% downtime liveness penalty', () => {
    const journal = bridge.constructSlashingJournal({
      validatorId: 'val_node_offline',
      infraction: 'DOWNTIME_LIVENESS',
      stakedAmount: 20000.0, // 20,000 ONXC
    });

    // 0.5% of 20,000 = 100 ONXC slashed
    expect(parseFloat(journal.slashedAmount)).toBeCloseTo(100.0, 4);
    expect(parseFloat(journal.rewardPoolAmount)).toBeCloseTo(50.0, 4);
    expect(parseFloat(journal.burnAmount)).toBeCloseTo(50.0, 4);

    const debits = journal.postings
      .filter((p) => p.direction === 'DEBIT')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const credits = journal.postings
      .filter((p) => p.direction === 'CREDIT')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    expect(debits).toBeCloseTo(100.0, 6);
    expect(credits).toBeCloseTo(100.0, 6);
  });
});
