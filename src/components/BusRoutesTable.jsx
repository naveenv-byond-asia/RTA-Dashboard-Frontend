export default function BusRoutesTable({ rows }) {
  return (
    <div className="panel">
      <strong>Top Locations</strong>
      <table className="routes-table">
        <thead>
          <tr>
            <th>Location</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.location}>
              <td>{row.location}</td>
              <td>{row.category}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
