// src/pages/login.tsx
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useUserStore } from '@/components/AppHeader/store';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const { login } = useUserStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      // Simulated login (replace with actual authentication)
      if (email === 'demo@example.com' && password === 'password') {
        const user = {
          id: '123',
          name: 'Demo User',
          email,
        };
        await login(user);
        router.push('/canvas');
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      console.error('Error logging in:', err);
      setError('An error occurred during login. Please try again.');
    }
  };

  return (
    <main className="flex-grow flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md">
        <form onSubmit={handleLogin} className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
          <h2 className="text-2xl font-bold text-center mb-6">Login</h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
            >
              Sign In
            </button>
          </div>

          <p className="text-center text-gray-500 text-xs mt-4">
            Demo login: demo@example.com / password
          </p>
        </form>
      </div>
    </main>
  );
};

export default LoginPage;