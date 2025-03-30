export interface VestingSchedule {
  startTime?: bigint;
  cliffDuration?: bigint;
  vestingDuration?: bigint;
  totalAmount?: bigint;
  claimed?: bigint;
  revokedTime?: bigint;
  token?: string | `0x${string}`;
}
