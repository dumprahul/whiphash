
'use client'
import React from 'react'
import { useLogin, usePrivy, useLogout, useWallets } from '@privy-io/react-auth';


export default function Page() {

  const { ready, authenticated } = usePrivy();
  const { login } = useLogin();
  const { logout} = useLogout();
  const disableLogin = !ready || (ready && authenticated);
  const { wallets } = useWallets();


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">WhipHash</h1>
        <div className="space-y-4">
          <button 
            onClick={() =>
              login({
                loginMethods: ['wallet', 'twitter', 'email'],
                walletChainType: 'ethereum-and-solana',
                disableSignup: false,
              })
            }
            disabled={disableLogin}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Login
          </button>
          <button 
            onClick={() => logout()}
            disabled={!authenticated}
            className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Logout
          </button>
          {authenticated && (
            <div className="mt-4 p-4 bg-green-100 rounded">
              <p className="text-green-800">✅ Authenticated</p>
              {wallets.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  Connected wallets: {wallets.length}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
