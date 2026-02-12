'use client';

import { signIn } from 'next-auth/react';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-white">
      <div className="text-center max-w-md px-6">
        <h1 className="text-3xl font-bold text-brand-700 mb-2">MONAD</h1>
        <p className="text-sm text-gray-500 mb-8">Sign in to access the workload platform</p>
        <button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="inline-flex items-center gap-3 bg-white border border-gray-300 rounded-lg px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
