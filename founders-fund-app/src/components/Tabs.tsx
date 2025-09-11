'use client';

interface TabsProps {
  active: string;
  onChange: (tab: string) => void;
}

const TAB_LABELS = [
  { key: 'calc', label: 'Calculator' },
  { key: 'history', label: 'History' },
  { key: 'charts', label: 'Charts' },
  { key: 'audit', label: 'Founders Audit' },
  { key: 'assistant', label: 'AI Assistant' },
];

export default function Tabs({ active, onChange }: TabsProps) {
  return (
    <div className="tabs">
      {TAB_LABELS.map(t => (
        <div
          key={t.key}
          className={`tab ${active === t.key ? 'active' : ''}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </div>
      ))}
    </div>
  );
}
