import React from 'react';
import { User, Trash2 } from 'lucide-react';
import Badge from '../ui/Badge';

export default function MemberRow({ member, isOwner, onRoleChange, onRemove }) {
  const getRoleBadgeColor = (role) => {
    switch(role) {
      case 'OWNER': return 'primary';
      case 'WRITE': return 'info';
      case 'READ': return 'neutral';
      default: return 'neutral';
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-[#E5E7EB] last:border-0 hover:bg-[#F8F9FB] transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <User size={16} className="text-gray-500" />
        </div>
        <span className="font-medium text-[#1E1F25]">{member.username}</span>
      </div>

      <div className="flex items-center gap-4">
        {isOwner && member.role !== 'OWNER' ? (
          <select
            value={member.role}
            onChange={(e) => onRoleChange(member.username, e.target.value)}
            className="rounded-md border border-[#E5E7EB] px-2 py-1 text-sm focus:border-[#6C5CE7] focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
          >
            <option value="READ">READ</option>
            <option value="WRITE">WRITE</option>
          </select>
        ) : (
          <Badge variant={getRoleBadgeColor(member.role)}>
            {member.role}
          </Badge>
        )}

        {isOwner && member.role !== 'OWNER' && onRemove && (
          <button
            onClick={() => onRemove(member.username)}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Remove Member"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
