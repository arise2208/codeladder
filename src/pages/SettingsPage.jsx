import React, { useState } from 'react';
import PageHeader from '../components/layout/PageHeader';
import { Input, Button, LoadingSpinner, Badge } from '../components/ui';
import usePlatformAccounts from '../hooks/usePlatformAccounts';
import { useAuth } from '../auth/AuthContext';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { accounts, loading, saveAccount, removeAccount, PLATFORMS } = usePlatformAccounts();
  const { logoutAll } = useAuth();
  const [editState, setEditState] = useState({});
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  if (loading) return <LoadingSpinner />;

  const handleSave = async (platform) => {
    const handle = editState[platform];
    if (!handle) return;
    try {
      await saveAccount(platform, handle);
      setEditState(prev => ({ ...prev, [platform]: '' }));
      toast.success(`Connected to ${platform}`);
    } catch (err) {
      toast.error(`Failed to connect to ${platform}`);
    }
  };

  const handleRemove = async (platform) => {
    try {
      await removeAccount(platform);
      toast.success(`Disconnected from ${platform}`);
    } catch (err) {
      toast.error(`Failed to disconnect from ${platform}`);
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('Are you sure you want to log out of all active sessions across all devices?')) {
      return;
    }
    setLoggingOutAll(true);
    try {
      await logoutAll();
      toast.success('Successfully logged out of all devices.');
    } catch (err) {
      toast.error('Failed to log out all devices');
    } finally {
      setLoggingOutAll(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <PageHeader title="Settings" />
      
      <div>
        <h2 className="text-xl font-semibold mb-4 text-white">
          Platform Accounts
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PLATFORMS.map(platform => {
            const account = accounts.find(a => a.platform === platform);
            const isConnected = !!account;

            return (
              <div
                key={platform}
                className="card-padded bg-[#282828] rounded-xl border border-[#3E3E3E] shadow-sm p-6"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-white">
                    {platform}
                  </h3>

                  {isConnected && (
                    <Badge className={account.verified ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold" : "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold"}>
                      {account.verified ? 'Verified' : 'Unverified'}
                    </Badge>
                  )}
                </div>

                {isConnected ? (
                  <div className="flex items-center justify-between">
                    <span className="text-[#B3B3B3]">
                      Handle:{' '}
                      <span className="font-medium text-white">
                        {account.handle}
                      </span>
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemove(platform)}
                    >
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Enter handle..." 
                      value={editState[platform] || ''} 
                      onChange={e =>
                        setEditState(prev => ({
                          ...prev,
                          [platform]: e.target.value
                        }))
                      }
                    />

                    <Button
                      onClick={() => handleSave(platform)}
                      className="bg-[#3E3E3E] text-white"
                    >
                      Connect
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Security & Sessions */}
      <div className="pt-6 border-t border-[#3E3E3E]">
        <h2 className="text-xl font-semibold mb-2 text-white">
          Security & Active Sessions
        </h2>
        <p className="text-sm text-[#8b949e] mb-4">
          Revoke all active JWT tokens across all browsers and devices. This forces re-login everywhere.
        </p>
        <div className="bg-[#282828] rounded-xl border border-[#3E3E3E] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-white">Revoke All Sessions</div>
            <div className="text-xs text-[#8b949e] mt-0.5">Increment token version on backend and log out of all active devices.</div>
          </div>
          <Button
            variant="destructive"
            onClick={handleLogoutAll}
            disabled={loggingOutAll}
            className="bg-red-900/40 hover:bg-red-800/60 text-red-300 border border-red-700/50 shrink-0"
          >
            {loggingOutAll ? 'Logging Out...' : 'Log Out of All Devices'}
          </Button>
        </div>
      </div>
    </div>
  );
}