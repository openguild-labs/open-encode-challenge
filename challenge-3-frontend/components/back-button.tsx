'use client';
import React from 'react'
import { Button } from './ui/button'
import { ChevronLeftIcon } from 'lucide-react'
import { useRouter } from 'next/navigation';

export default function BackButton() {
    const router = useRouter();

    function handleOnClick() {
        router.back();
    }

    return (
        <Button className='' onClick={handleOnClick}>
            <ChevronLeftIcon className="mr-2 h-4 w-4" />
            <p>Back</p>
        </Button>
    )
}
