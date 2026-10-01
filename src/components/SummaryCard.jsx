import "./SummaryCard.css";

export default function SummaryCard({ label, value, hint, icon }) {
  return (
    <div className="summary-card card">
      <div className="summary-icon">{icon}</div>

      <div>
        <div className="summary-label">{label}</div>
        <div className="summary-value">{value}</div>
        <div className="summary-hint">{hint}</div>
      </div>
    </div>
  );
}
