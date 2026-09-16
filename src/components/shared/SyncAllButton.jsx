import React from 'react';
import { RefreshCw } from 'lucide-react';
import useSyncAll from '../../hooks/useSyncAll';

export default function SyncAllButton({ onSyncComplete, className = '', size = 'sm' }) {
  const { isSyncing, cooldown, canSync, syncAll } = useSyncAll(onSyncComplete);

  const paddingClass = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';

  return (
    <button
      type="button"
      onClick={syncAll}
      disabled={!canSync}
      title={
        isSyncing
          ? 'Syncing solved problems from connected platforms...'
          : cooldown > 0
          ? `Please wait ${cooldown}s before resyncing.`
          : 'Sync solved submissions across Codeforces, LeetCode, and CodeChef'
      }
      className={`inline-flex items-center gap-1.5 font-semibold rounded-lg border transition-all select-none ${paddingClass} ${
        !canSync
          ? 'bg-[#1e1e1e]/60 border-[#383838] text-[#8b949e] cursor-not-allowed opacity-75'
          : 'bg-[#1e1e1e] hover:bg-[#333333] text-[#eff2f6] border-[#383838] hover:border-[#ffa116]/50 shadow-xs cursor-pointer active:scale-95'
      } ${className}`}
    >
      <RefreshCw
        size={size === 'sm' ? 13 : 15}
        className={
          isSyncing
            ? 'animate-spin text-[#ffa116]'
            : cooldown > 0
            ? 'text-[#8b949e]'
            : 'text-[#ffa116]'
        }
      />
      <span>
        {isSyncing
          ? 'Syncing...'
          : cooldown > 0
          ? `Resync in ${cooldown}s`
          : 'Sync All'}
      </span>
    </button>
  );
}
