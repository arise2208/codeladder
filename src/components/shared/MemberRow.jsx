import React from 'react';
import { User, Trash2 } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function MemberRow({ member, isOwner, onRoleChange, onRemove }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[#383838] last:border-0 hover:bg-[#333333] transition-colors h-16 min-h-[4rem] text-[#eff2f6]">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#1e1e1e] border border-[#383838] flex items-center justify-center shrink-0">
          <User size={16} className="text-[#8b949e]" />
        </div>
        <span className="font-medium text-[#eff2f6] text-sm">{member.username}</span>
      </div>

      <div className="flex items-center gap-4">
        {isOwner && member.role !== 'OWNER' ? (
          <select
            value={member.role}
            onChange={(e) => onRoleChange(member.username, e.target.value)}
            className="rounded-md border border-[#383838] bg-[#1e1e1e] text-[#eff2f6] px-2 py-1 text-xs focus:border-[#ffa116] focus:outline-hidden focus:ring-1 focus:ring-[#ffa116] cursor-pointer"
          >
            <option value="READ">READ</option>
            <option value="WRITE">WRITE</option>
          </select>
        ) : (
          <StatusBadge type="role" role={member.role} />
        )}

        {isOwner && member.role !== 'OWNER' && onRemove && (
          <button
            onClick={() => onRemove(member.username)}
            className="text-[#8b949e] hover:text-red-400 transition-colors cursor-pointer p-1 rounded"
            title="Remove Member"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
