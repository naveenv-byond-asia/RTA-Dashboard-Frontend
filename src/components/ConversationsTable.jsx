export default function ConversationsTable({ rows }) {
  return (
    <div className="panel wide">
      <strong>Top 50 Conversations</strong>
      <div className="table-scroll">
        <table className="routes-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Category</th>
              <th>Location</th>
              <th>Question</th>
              <th>Answered</th>
              <th>Latency</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.date}</td>
                <td>{row.time}</td>
                <td>{row.category}</td>
                <td>{row.location}</td>
                <td className="wrap">{row.user_question}</td>
                <td>{row.assistant_answer?.trim() ? "Yes" : "No"}</td>
                <td>{row.latency_ms} ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
