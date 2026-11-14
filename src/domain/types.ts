export type ValidatorStatus = 'ACTIVE' | 'JAILED' | 'SLASHED' | 'INACTIVE';

export type SlashingReason = 'DOUBLE_SIGN' | 'DOWNTIME' | 'EQUIVOCATION';

export interface Validator {
  id: string;
  moniker: string;
  consensusAddress: string;
  bondedStake: bigint;
  commissionRate: number; // e.g. 0.05 = 5%
  uptimePercent: number;
  missedBlocks: number;
  status: ValidatorStatus;
  lastBlockHeight: number;
  registeredAt: string;
}

export interface SlashingRecord {
  id: string;
  validatorId: string;
  reason: SlashingReason;
  slashedAmount: bigint;
  height: number;
  timestamp: string;
}
