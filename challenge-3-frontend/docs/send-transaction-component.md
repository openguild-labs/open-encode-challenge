# Send transaction component

## Usage

Import the component into your project as is.

```tsx
import { SendTransaction } from '@/components/send-transaction';

// ...

<SendTransaction />
```

## Understanding the component

Follow the code comments in the component to edit it. Check out [Wagmi docs](https://wagmi.sh/react/getting-started) for more information.

Fundamentally, the component leverages the following Wagmi hooks:

```tsx
import {
  type BaseError, // for error handling
  useSendTransaction, // for sending transactions
  useWaitForTransactionReceipt, // for waiting for transaction receipts
  useConfig // for configuring the component
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
      message: "Invalid Ethereum address format",
    }) as z.ZodType<Address | "">,
  // amount is a required field
  amount: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number",
    })
    .refine((val) => /^\d*\.?\d{0,18}$/.test(val), {
      message: "Amount cannot have more than 18 decimal places",
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
    address: "", // empty string is the default value
    amount: "", // empty string is the default value
  },
});


// 2. Define a submit handler.
async function onSubmit(values: z.infer<typeof formSchema>) {

  // if address is provided, use sigpass wallet (passkey) to send the transaction
  if (address) {
    sendTransactionAsync({
      account: await getSigpassWallet(),
      to: values.address as Address,
      value: parseEther(values.amount),
      chainId: westendAssetHub.id,
    });
  } else {
    // if no address is provided, use the connected wallet (browser extension or via WalletConnect)
    sendTransactionAsync({
      to: values.address as Address,
      value: parseEther(values.amount),
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
