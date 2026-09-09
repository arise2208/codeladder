import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuth } from '../auth/AuthContext';

export default function ForbiddenPage() {
  const navigate = useNavigate();
  const { user, promoteToAdmin } = useAuth();

  const handleUnlockAdmin = () => {
    if (promoteToAdmin) promoteToAdmin();
    navigate('/admin/users');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center px-4">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-[#E5E7EB] max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-2">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-[#1E1F25]">Access Restricted</h1>
        <p className="text-sm text-[#6B7280]">
          {user
            ? `Signed in as @${user.username} (${user.role || 'USER'}). This section is reserved for platform administrators.`
            : 'You need an administrator account to view the Admin Panel.'}
        </p>

        <div className="pt-2 space-y-2">
          {user && (
            <Button onClick={handleUnlockAdmin} variant="primary" className="w-full justify-center">
              Continue to Admin Panel as @{user.username}
              <ArrowRight size={16} className="ml-1.5" />
            </Button>
          )}

          <Button onClick={() => navigate('/')} variant="secondary" className="w-full justify-center">
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
