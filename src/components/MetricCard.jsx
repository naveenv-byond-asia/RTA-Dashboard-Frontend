export default function MetricCard({ label, value, delta }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <h3>{value}</h3>
      <em>{delta}</em>
    </div>
  );
}
