import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'No data', description = '', action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-xl bg-[#282828] border border-[#383838] flex items-center justify-center mb-4">
        <Icon size={24} className="text-[#ffa116]" />
      </div>
      <h3 className="text-sm font-semibold text-[#eff2f6] mb-1">{title}</h3>
      {description && <p className="text-sm text-[#8b949e] max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
