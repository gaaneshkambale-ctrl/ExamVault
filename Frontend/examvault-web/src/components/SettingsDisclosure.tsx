// Same disclosure-banner treatment as SubscriptionPlans' static pricing
// cards - tells the reader up front that a page's controls are a visual
// reference, not real backend-tracked settings.
export default function SettingsDisclosure({ text }: { text: string }) {
  return <div className="border rounded-3 bg-white p-3 mb-3 text-muted small">{text}</div>;
}
