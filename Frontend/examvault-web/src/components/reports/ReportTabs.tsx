// Plain underline tab strip for switching between chart views within a
// report page (Performance Analysis, Comparison, Question Analysis) - no
// tab pattern existed yet in Reports, react-bootstrap's Nav/Tabs weren't
// used anywhere in this section.
interface ReportTabsProps {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}

export default function ReportTabs({ tabs, active, onChange }: ReportTabsProps) {
  return (
    <div className="d-flex gap-1 border-bottom mb-3 flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className="btn btn-link text-decoration-none px-3 py-2"
          style={{
            borderRadius: 0,
            borderBottom: tab === active ? '2px solid #4f46e5' : '2px solid transparent',
            color: tab === active ? '#4f46e5' : '#6b7280',
            fontWeight: tab === active ? 600 : 500,
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
