# Contracts

Some deployed contracts on Asset Hub for testing purposes.

## Mock USDC

| Name | Value |
|---|---|
| Address | 0xc8576Fb6De558b313afe0302B3fedc6F6447BbEE |
| Name | USDC |
| Symbol | `USDC` |
| Decimals | 18 |
| ABI | [USDC.json](/lib/usdcAbi.ts) |

## Multicall3 fork

| Name | Value |
|---|---|
| Address | `0x5545dec97cb957e83d3e6a1e82fabfacf9764cf1` (temporary)  |
| Source code | [Multicall3.sol](https://github.com/mds1/multicall/blob/main/src/Multicall3.sol) |

Note
- Had to remove various functions for deployment. But contract should work as expected but frequently runs into out of gas error. So for the `useReadContracts` hook, we have to split big call into smaller calls (3 contract max).
