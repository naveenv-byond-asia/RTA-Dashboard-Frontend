export default function MetricCard({ label, value, delta, deltaClass }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <h3>{value}</h3>
      <em className={deltaClass || undefined}>{delta}</em>
    </div>
  );
}
