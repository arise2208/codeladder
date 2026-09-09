import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Layers } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

import { getErrorMessage } from '../lib/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      const success = await login(username, password);
      if (success) {
        navigate(from, { replace: true });
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid username or password.'));
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <div className="w-12 h-12 bg-[#6C5CE7] rounded-xl flex items-center justify-center mb-4">
          <Layers className="text-white" size={24} />
        </div>
        <h2 className="mt-2 text-center text-3xl font-bold text-[#1E1F25]">
          Sign in to CodeLadder
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-[#E5E7EB] sm:rounded-xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <Input
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" className="w-full" variant="primary">
              Sign in
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-[#6B7280]">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#6C5CE7] hover:underline font-medium">
              Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
