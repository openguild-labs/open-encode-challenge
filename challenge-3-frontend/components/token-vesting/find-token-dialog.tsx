'use client';
import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

interface FindTokenDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    token?: string;
    onSetToken: (token: string) => void;
}

export default function FindTokenDialog({
    isOpen,
    onOpenChange,
    token,
    onSetToken
}: FindTokenDialogProps) {
    return (
        <Dialog>
            <DialogTrigger>Select token to vesting</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Are you absolutely sure?</DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. This will permanently delete your account
                        and remove your data from our servers.
                    </DialogDescription>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    )
}
