export default function FrequentRoutesTable({ rows }) {
  return (
    <div className="panel">
      <strong>Most Frequent Bus Routes</strong>
      <table className="routes-table">
        <thead>
          <tr>
            <th>Route</th>
            <th>Queries</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.route}>
              <td>{row.route}</td>
              <td>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
