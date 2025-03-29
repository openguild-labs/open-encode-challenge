"use client";
import React from 'react'
import SigpassKit from './sigpasskit'
import Image from 'next/image'
import Link from 'next/link'

const Header = () => {
    return (
        <header className="flex flex-row items-center justify-between w-full h-16 p-4 bg-white border-b border-gray-200 shadow-md sm:rounded-lg sm:shadow-sm sm:border sm:bg-transparent sm:backdrop-blur-sm sm:backdrop-saturate-150 sm:bg-opacity-30">
            <div className="flex flex-row md:gap-20 max-h-11 items-center md:justify-center sm:items-start sm:flex-wrap">
                <Link className="text-sm underline underline-offset-4 ease-linear duration-200 hover:scale-90" href="/">
                    <Image
                        src="/og-logo.png"
                        alt="OpenGuild logo"
                        width={90}
                        height={38}
                        priority
                    />
                </Link>
                {/* TODO: handle the mobiel navbar */}
                <Link className="text-sm underline underline-offset-4 self-center ease-linear duration-200 hover:scale-90" href="/token-vesting">Token Vesting</Link>
                <Link className="text-sm underline underline-offset-4 self-center ease-linear duration-200 hover:scale-90" href="/yield-farming">Yield Farming</Link>
            </div>

            <div className="flex flex-row items-center ">
                <SigpassKit />
            </div>
        </header>
    )
}

export default Header