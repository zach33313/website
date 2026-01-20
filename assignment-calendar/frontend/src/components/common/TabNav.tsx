import { clsx } from 'clsx';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabNavProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export function TabNav({ tabs, activeTab, onChange }: TabNavProps) {
  return (
    <div className="flex gap-1 bg-[#1a1a1a] rounded-lg p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === tab.id
              ? 'bg-[#2a2a2a] text-white'
              : 'text-[#6a6a6a] hover:text-[#a0a0a0]'
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
