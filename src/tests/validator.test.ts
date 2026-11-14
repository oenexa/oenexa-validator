import { describe, it, expect } from 'vitest';
import { ValidatorService } from '../service/ValidatorService.js';

describe('OENEXA Proof-of-Stake Validator Service', () => {
  it('registers genesis validator with bonded stake and healthy status', () => {
    const service = new ValidatorService();
    const all = service.getAllValidators();

    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(all[0].moniker).toBe('oenexa-genesis-validator-01');
    expect(all[0].status).toBe('ACTIVE');
    expect(all[0].bondedStake).toBe(50_000_000n * 10n ** 18n);
  });

  it('records heartbeats and tracks missed blocks jailing', () => {
    const service = new ValidatorService();
    const val = service.registerValidator({
      moniker: 'community-validator-02',
      consensusAddress: '0xcomm2',
      bondedStake: 100_000n * 10n ** 18n,
      commissionRate: 0.1,
    });

    service.recordHeartbeat(val.id, 514550);
    expect(service.getValidator(val.id)?.lastBlockHeight).toBe(514550);

    // Simulate missing 100 blocks
    for (let i = 0; i < 100; i++) {
      service.recordMissedBlock(val.id);
    }

    expect(service.getValidator(val.id)?.status).toBe('JAILED');
  });

  it('slashes 5% of stake on double-signing and emits CloudEvent', () => {
    const service = new ValidatorService();
    const val = service.registerValidator({
      moniker: 'byzantine-node-03',
      consensusAddress: '0xbyz3',
      bondedStake: 1_000_000n * 10n ** 18n,
      commissionRate: 0.05,
    });

    const record = service.slash({
      validatorId: val.id,
      reason: 'DOUBLE_SIGN',
      height: 514560,
    });

    const expectedSlashed = (1_000_000n * 10n ** 18n * 50n) / 1000n; // 5%
    expect(record.slashedAmount).toBe(expectedSlashed);
    expect(service.getValidator(val.id)?.bondedStake).toBe(1_000_000n * 10n ** 18n - expectedSlashed);
    expect(service.getValidator(val.id)?.status).toBe('SLASHED');
    expect(service.getOutbox()).toHaveLength(1);
  });
});
