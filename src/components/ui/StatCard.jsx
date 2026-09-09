import React from 'react';

export default function StatCard({ icon, label, title, value, color = '#6C5CE7', loading = false }) {
  const displayLabel = label || title;

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return icon;
    }
    const IconComponent = icon;
    return <IconComponent size={20} style={{ color }} />;
  };

  return (
    <div className="card-padded flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
        {renderIcon()}
      </div>
      <div>
        <p className="text-2xl font-bold text-[#1E1F25]">
          {loading ? '...' : (value ?? 0)}
        </p>
        <p className="text-xs text-[#6B7280] font-medium">{displayLabel}</p>
      </div>
    </div>
  );
}
