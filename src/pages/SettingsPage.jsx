import React, { useState } from 'react';
import PageHeader from '../components/layout/PageHeader';
import { Input, Button, LoadingSpinner, Badge } from '../components/ui';
import usePlatformAccounts from '../hooks/usePlatformAccounts';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { accounts, loading, saveAccount, removeAccount, PLATFORMS } = usePlatformAccounts();
  const [editState, setEditState] = useState({});

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

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />
      
      <div>
        <h2 className="text-xl font-semibold mb-4 text-[#1E1F25]">Platform Accounts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PLATFORMS.map(platform => {
            const account = accounts.find(a => a.platform === platform);
            const isConnected = !!account;

            return (
              <div key={platform} className="card-padded bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-[#1E1F25]">{platform}</h3>
                  {isConnected && <Badge className="bg-[#00B894] text-white">Verified</Badge>}
                </div>
                {isConnected ? (
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280]">Handle: <span className="font-medium text-[#1E1F25]">{account.handle}</span></span>
                    <Button variant="outline" size="sm" onClick={() => handleRemove(platform)}>Disconnect</Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Enter handle..." 
                      value={editState[platform] || ''} 
                      onChange={e => setEditState(prev => ({ ...prev, [platform]: e.target.value }))}
                    />
                    <Button onClick={() => handleSave(platform)} className="bg-[#6C5CE7] text-white">Connect</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
