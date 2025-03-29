export interface VestingSchedule {
  startTime?: bigint;
  cliffDuration?: bigint;
  vestingDuration?: bigint;
  totalAmount?: bigint;
  claimed?: bigint;
  revokedTime?: bigint;
  revokedAmount?: bigint;
  token?: string | `0x${string}`;
}
