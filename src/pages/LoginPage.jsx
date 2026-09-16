import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Layers, AlertCircle, ArrowLeft } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { getErrorMessage } from '../lib/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      setSubmitting(true);
      const success = await login(username, password);
      if (success) {
        navigate(from, { replace: true });
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid username or password.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 text-[#eff2f6]">
      {/* Back link & LeetCode theme badge */}
      <div className="w-full max-w-md mb-4 flex justify-between items-center">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#8b949e] hover:text-[#ffa116] transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </Link>
        <span className="text-[11px] font-medium text-[#ffa116] bg-[#ffa116]/10 px-2 py-0.5 rounded-full border border-[#ffa116]/20">
          LeetCode Dark
        </span>
      </div>

      <div className="w-full max-w-md bg-[#282828] border border-[#383838] rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-[#ffa116] flex items-center justify-center shadow-lg shadow-[#ffa116]/15 mb-3">
            <Layers className="text-[#1a1a1a]" size={24} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#eff2f6]">
            Sign in to CodeLadder
          </h2>
          <p className="text-xs text-[#8b949e] mt-1">
            Master CP & track upsolved problems across platforms
          </p>
        </div>

        {/* Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Username"
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            autoFocus
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <Button
            type="submit"
            className="w-full py-2.5 bg-[#ffa116] hover:bg-[#ffb84d] text-[#1a1a1a] font-bold shadow-md hover:shadow-lg transition-all text-sm rounded-lg cursor-pointer"
            loading={submitting}
          >
            Sign in
          </Button>
        </form>

        {/* Footer */}
        <div className="pt-2 border-t border-[#383838] text-center text-xs text-[#8b949e]">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#ffa116] hover:underline font-semibold ml-1">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
