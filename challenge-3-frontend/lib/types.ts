import { Address } from "viem";

export interface VestingSchedule {
  totalAmount: bigint;
  startTime: bigint;
  cliffDuration: bigint;
  vestDuration: bigint;
  amountClaimed: bigint;
  revoked: boolean;
}

export interface BeneficiaryInfo {
  address: Address;
  isWhitelisted: boolean;
  vestingSchedule?: VestingSchedule;
  vestedAmount?: bigint;
  claimableAmount?: bigint;
}

export interface VestingFormData {
  beneficiary: string;
  amount: string;
  cliffDuration: string;
  vestDuration: string;
  startTimestamp: string;
}

export interface WhitelistFormData {
  beneficiary: string;
}
