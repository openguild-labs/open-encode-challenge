import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const VestingModule = buildModule("VestingModule", (m) => {
  const token = m.contract("MockERC20", ["Test Token", "TST"], {
    id: "mock_token",
  });

  const vesting = m.contract("TokenVesting", [], {
    id: "token_vesting",
  });

  return { token, vesting };
});

export default VestingModule;
