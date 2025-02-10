import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const VestingModule = buildModule("VestingModule", (m) => {
  // Deploy Token first
  const token = m.contract("SimpleToken", [], {
    id: "simple_token",
  });

  // Deploy Vesting Contract with Token address
  const vesting = m.contract("SimpleVesting", [token], {
    id: "simple_vesting",
  });

  return { token, vesting };
});

export default VestingModule;
