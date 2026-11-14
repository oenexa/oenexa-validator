import crypto from 'node:crypto';
import { createCloudEvent, type CloudEvent } from '@oenexa/event-schemas';
import type { Validator, SlashingRecord, SlashingReason, ValidatorStatus } from '../domain/types.js';

export class ValidatorService {
  private validators = new Map<string, Validator>();
  private slashingRecords: SlashingRecord[] = [];
  private outbox: CloudEvent<any>[] = [];

  constructor() {
    // Seed Genesis Validator Node
    this.registerValidator({
      moniker: 'oenexa-genesis-validator-01',
      consensusAddress: '0xgenesis_validator_ed25519_node_01',
      bondedStake: 50_000_000n * 10n ** 18n, // 50M ONXC
      commissionRate: 0.05,
    });
  }

  public registerValidator(params: {
    moniker: string;
    consensusAddress: string;
    bondedStake: bigint;
    commissionRate: number;
  }): Validator {
    const id = `val_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const validator: Validator = {
      id,
      moniker: params.moniker,
      consensusAddress: params.consensusAddress,
      bondedStake: params.bondedStake,
      commissionRate: params.commissionRate,
      uptimePercent: 100.0,
      missedBlocks: 0,
      status: 'ACTIVE',
      lastBlockHeight: 514544,
      registeredAt: new Date().toISOString(),
    };

    this.validators.set(id, validator);
    return validator;
  }

  public recordHeartbeat(validatorId: string, currentHeight: number): void {
    const val = this.validators.get(validatorId);
    if (!val) throw new Error(`Validator '${validatorId}' not found.`);

    val.lastBlockHeight = currentHeight;
    val.uptimePercent = Math.min(100.0, val.uptimePercent + 0.01);
  }

  public recordMissedBlock(validatorId: string): void {
    const val = this.validators.get(validatorId);
    if (!val) throw new Error(`Validator '${validatorId}' not found.`);

    val.missedBlocks += 1;
    val.uptimePercent = Math.max(0.0, val.uptimePercent - 0.1);

    if (val.missedBlocks >= 100 && val.status === 'ACTIVE') {
      val.status = 'JAILED';
    }
  }

  /**
   * Slashes validator stake for Byzantine equivocation or double-signing
   */
  public slash(params: {
    validatorId: string;
    reason: SlashingReason;
    height: number;
  }): SlashingRecord {
    const val = this.validators.get(params.validatorId);
    if (!val) throw new Error(`Validator '${params.validatorId}' not found.`);

    // Slashing rate: 5% for double signing / equivocation; 1% for downtime
    const rate = params.reason === 'DOWNTIME' ? 0.01 : 0.05;
    const slashFrac = BigInt(Math.floor(rate * 1000));
    const slashedAmount = (val.bondedStake * slashFrac) / 1000n;

    val.bondedStake -= slashedAmount;
    val.status = 'SLASHED';

    const record: SlashingRecord = {
      id: `slash_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      validatorId: val.id,
      reason: params.reason,
      slashedAmount,
      height: params.height,
      timestamp: new Date().toISOString(),
    };

    this.slashingRecords.push(record);

    const event = createCloudEvent({
      type: 'com.oenexa.chain.validator.slashed.v1',
      source: 'https://rpc.oenexa.com/validator',
      data: {
        validatorId: val.id,
        moniker: val.moniker,
        reason: params.reason,
        slashedAmount: slashedAmount.toString(),
        height: params.height,
      },
      subject: val.id,
    });

    this.outbox.push(event);
    return record;
  }

  public getValidator(validatorId: string): Validator | undefined {
    return this.validators.get(validatorId);
  }

  public getAllValidators(): Validator[] {
    return Array.from(this.validators.values());
  }

  public getOutbox(): CloudEvent<any>[] {
    return [...this.outbox];
  }
}
