import React, { useState, useContext } from 'react';
import { Form, useNavigate } from '@remix-run/react';
import { GlobalContext } from '~/context/globalcontext';
import SignInButtons from './SignInButtons';
const DOMAIN_URL = import.meta.env.VITE_SUPABASE_DOMAIN_URL!;
const TOKEN_HASH = import.meta.env.VITE_SUPABASE_TOKEN_HASH!;

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const UserContext = useContext(GlobalContext);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email');
    const password = formData.get('password');
    const username = formData.get('username');

    // Mock API call for login/signup
    const mockApiCall = new Promise((resolve) => {
      setTimeout(() => {
        if (isSignUp) {
          // Simulate successful signup
          //resolve({ success: true, user: { id: '123', username, email, avatarUrl: 'https://via.placeholder.com/128', isPlaying: false, stats: { rating: 1200, wins: 0, losses: 0, draws: 0 } } });
          fetch(`${DOMAIN_URL}/auth/confirm?token_hash=${TOKEN_HASH}&type=email&next=${DOMAIN_URL}/myhome`);

        } else {
          // Simulate successful login
          if (email === 'test@example.com' && password === 'password') {
            resolve({ success: true, user: { id: '123', username: 'ChessMaster123', email, avatarUrl: 'https://via.placeholder.com/128', isPlaying: false, stats: { rating: 1500, wins: 42, losses: 18, draws: 5 } } });
          } else {
            resolve({ success: false, error: 'Invalid credentials' });
          }
        }
      }, 1000);
    });

    const response: any = await mockApiCall;

    if (response.success) {
      UserContext?.setUser(response.user);
      navigate(`/MyHome`);
    } else {
      alert(response.error || 'An error occurred');
    }
  };

  return (
    <div>
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          {isSignUp ? 'Sign Up' : 'Login'}
        </h2>
        <SignInButtons/>
        <div className="my-6 flex items-center">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="mx-4 flex-shrink text-sm text-gray-500">OR</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>
        <Form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {isSignUp ? 'Sign Up' : 'Login'}
          </button>
        </Form>
        <div className="mt-6 text-center">
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-blue-600 hover:text-blue-500">
            {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}