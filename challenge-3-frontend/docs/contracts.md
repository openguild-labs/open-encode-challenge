# Contracts

## Deployer

| Type              | Address                                          |
| ----------------- | ------------------------------------------------ |
| H160              | 0xF0B610dffb23BE5baAd58B07C02C8DfdeaFa332F       |
| Westend Asset Hub | 5HWKS9TKLZCdhQygmV1B2L4Z898UKUDCpqGEWc2qSHUca4gU |

Some deployed contracts on Asset Hub for testing purposes.

## Mock ERC20 - 0xHarryRiddle - HARRY

| Name     | Value                                                                 |
| -------- | --------------------------------------------------------------------- |
| Address  | 0x3DD77387Be1efa133337567FF0Fad8734950a239                            |
| Name     | 0xHarryRiddle                                                         |
| Symbol   | `HARRY`                                                               |
| Decimals | 18                                                                    |
| Tx       | [Extrinsic](https://assethub-westend.subscan.io/extrinsic/11277385-2) |
| ABI      | [mockERC20Abi.ts](/lib/mockERC20Abi.ts)                               |

## Mock ERC20 - Hogwarts School - HOGWARTS

| Name     | Value                                                                 |
| -------- | --------------------------------------------------------------------- |
| Address  | 0xC4E959C499DC0c0D33742CC8099A2347D58Bd93f                            |
| Name     | Hogwarts School                                                       |
| Symbol   | `HOGWARTS`                                                            |
| Decimals | 18                                                                    |
| Tx       | [Extrinsic](https://assethub-westend.subscan.io/extrinsic/11277424-2) |
| ABI      | [mockERC20Abi.ts](/lib/mockERC20Abi.ts)                               |

## Token Vesting

| Name    | Value                                                                 |
| ------- | --------------------------------------------------------------------- |
| Address | 0x54CbB524D8783e20A9f94A4cC8b82Dd9A10c3326                            |
| Tx      | [Extrinsic](https://assethub-westend.subscan.io/extrinsic/11278166-2) |
| ABI     | [tokenVesting.ts](/lib/tokenVesting.ts)                               |

## Yield Farming

| Name    | Value                                                                 |
| ------- | --------------------------------------------------------------------- |
| Address | 0x0eb09a1b25EC457f442E5F4F84591F94B9d6B846                            |
| Tx      | [Extrinsic](https://assethub-westend.subscan.io/extrinsic/11278201-2) |
| ABI     | [yieldFarming.ts](/lib/yieldFarming.ts)                               |

## Faucet

| Name    | Value                                                       |
| ------- | ----------------------------------------------------------- |
| Address |                                                             |
| Tx      | [Extrinsic](https://assethub-westend.subscan.io/extrinsic/) |
| ABI     | [.ts](/lib/.ts)                                             |

Note

- Had to remove various functions for deployment. But contract should work as expected but frequently runs into out of gas error. So for the `useReadContracts` hook, we have to split big call into smaller calls (3 contract max).
