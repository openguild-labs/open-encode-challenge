import { atom } from "jotai";

/**
 * Global open-state for the "Create Wallet” modal.
 * Any component can toggle this to show / hide the dialog.
 */
export const createWalletDialogOpenAtom = atom(false);