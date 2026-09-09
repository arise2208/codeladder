export default function Tabs({ tabs, activeTab, onTabChange, onChange }) {
  const handleChange = onTabChange || onChange;
  return (
    <div className="flex gap-1 border-b border-[#E5E7EB]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleChange && handleChange(tab.id)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === tab.id
              ? 'border-[#6C5CE7] text-[#6C5CE7]'
              : 'border-transparent text-[#6B7280] hover:text-[#1E1F25] hover:border-[#D1D5DB]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
