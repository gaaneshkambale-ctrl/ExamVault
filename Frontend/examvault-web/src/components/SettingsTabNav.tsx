export interface SettingsTab {
  key: string;
  label: string;
}

interface SettingsTabNavProps {
  tabs: SettingsTab[];
  active: string;
  onSelect: (key: string) => void;
}

// Shared left-hand in-page tab list for the Settings pages (setting.png).
// Only the tab shown active in the mockup for each page has real designed
// content behind it - the rest are still clickable (matching the mockup's
// full tab list) but land on a shared "not connected yet" panel, since no
// mockup exists for what they'd contain.
export default function SettingsTabNav({ tabs, active, onSelect }: SettingsTabNavProps) {
  return (
    <div className="d-flex flex-column gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onSelect(tab.key)}
          className={`btn btn-sm text-start ${active === tab.key ? 'btn-primary' : 'text-body'}`}
          style={active === tab.key ? undefined : { background: 'transparent', border: 'none' }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
