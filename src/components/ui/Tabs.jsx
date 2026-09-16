export default function Tabs({ tabs, activeTab, onTabChange, onChange }) {
  const handleChange = onTabChange || onChange;
  return (
    <div className="flex gap-1 border-b border-[#383838]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleChange && handleChange(tab.id)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === tab.id
              ? 'border-[#ffa116] text-[#ffa116]'
              : 'border-transparent text-[#8b949e] hover:text-[#eff2f6] hover:border-[#484848]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
