import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'No data', description = '', action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-xl bg-[#F3F4F6] flex items-center justify-center mb-4">
        <Icon size={24} className="text-[#9CA3AF]" />
      </div>
      <h3 className="text-sm font-semibold text-[#1E1F25] mb-1">{title}</h3>
      {description && <p className="text-sm text-[#6B7280] max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
