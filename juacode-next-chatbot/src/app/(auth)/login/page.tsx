// app/(auth)/login/page.tsx
'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await signIn('credentials', { email, password, redirect: true, callbackUrl: '/' });
    console.log(result);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm p-4 bg-white rounded-md shadow-md">
        <h1 className="mb-4 text-xl font-bold">Login</h1>
        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 mb-4 border border-gray-300 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 mb-4 border border-gray-300 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="w-full p-2 font-bold text-white bg-blue-500 rounded">
          Login
        </button>
      </form>
    </div>
  );
}
