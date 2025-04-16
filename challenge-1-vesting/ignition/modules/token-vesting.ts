import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const VestingModule = buildModule("VestingModule", (m) => {
  // Deploy Token first
  const token = m.contract("MockERC20", ["LST", "LSToken"], {
    id: "simple_token",
  });

  // Deploy Vesting Contract with Token address
  const vesting = m.contract("TokenVesting", [token], {
    id: "simple_vesting",
  });

  return { token, vesting };
});

export default VestingModule;
