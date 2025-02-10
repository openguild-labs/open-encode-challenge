# Write contract component

## Usage

Import the component into your project as is.

```tsx
import { WriteContract } from '@/components/write-contract';

// ...

<WriteContract />
```

## Edit

Follow the code comments in the component to edit it. Check out [Wagmi docs](https://wagmi.sh/react/getting-started) for more information.

Fundamentally, the component leverages the following Wagmi hooks:

```tsx
import {
  type BaseError, // for error handling
  useWaitForTransactionReceipt, // for waiting for transaction receipts
  useConfig, // for configuring the component
  useWriteContract, // for writing to a contract
  useReadContracts, // for reading from multiple contracts
  useAccount // for getting the account
} from "wagmi";
```

There is a zod schema for the form validation on the client side.

```tsx
// form schema for sending transaction
const formSchema = z.object({
  // address is a required field
  address: z
    .string()
    .min(2)
    .max(50)
    .refine((val) => val === "" || isAddress(val), {
      message: "Invalid address format",
    }) as z.ZodType<Address | "">,
  // amount is a required field
  amount: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number",
    })
    .refine((val) => /^\d*\.?\d{0,18}$/.test(val), {
      message: "Amount cannot have more than 18 decimal places",
    })
    .superRefine((val, ctx) => {
      if (!maxBalance || !decimals) return;
      
      const inputAmount = parseUnits(val, decimals as number);

      if (inputAmount > (maxBalance as bigint)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Amount exceeds available balance",
        });
      }
    }),
});
```

2 main form functions:

```tsx
// 1. Define your form.
const form = useForm<z.infer<typeof formSchema>>({
  // resolver is zodResolver
  resolver: zodResolver(formSchema),
  // default values for address and amount
  defaultValues: {
    address: "",
    amount: "",
  },
});


// 2. Define a submit handler.
async function onSubmit(values: z.infer<typeof formSchema>) {
  if (address) {
    writeContractAsync({
      account: await getSigpassWallet(),
      address: USDC_CONTRACT_ADDRESS,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [values.address as Address, parseUnits(values.amount, decimals as number)],
      chainId: westendAssetHub.id,
    });
  } else {
    // Fallback to connected wallet
    writeContractAsync({
      address: USDC_CONTRACT_ADDRESS,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [values.address as Address, parseUnits(values.amount, decimals as number)],
      chainId: westendAssetHub.id,
    });
  }
}
```

Then we wait for the transaction receipt.

```tsx
// useWaitForTransactionReceipt hook to wait for transaction receipt
const { isLoading: isConfirming, isSuccess: isConfirmed } =
  useWaitForTransactionReceipt({
    hash,
    config: address ? localConfig : config,
  });
```

When the transaction is confirmed, we refetch the balance of the address.

```tsx
// when isConfirmed, refetch the balance of the address
useEffect(() => {
  if (isConfirmed) {
    refetch();
  }
}, [isConfirmed, refetch]);
```