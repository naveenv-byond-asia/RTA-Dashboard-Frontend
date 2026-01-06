import "chart.js/auto";
import { Line } from "react-chartjs-2";

export default function DailyTrafficLine({ labels, data, className }) {
  const panelClass = ["panel", className].filter(Boolean).join(" ");
  const chartData = {
    labels,
    datasets: [
      {
        label: "Thousands of riders",
        data,
        borderColor: "#1d4ed8",
        backgroundColor: "rgba(59, 130, 246, 0.18)",
        pointBackgroundColor: "#0f172a",
        borderWidth: 2,
        fill: true,
        lineTension: 0.35,
      },
    ],
  };

  const options = {
    plugins: { legend: { display: false } },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#3b4a6b" },
      },
      y: {
        grid: { color: "#d7e2f1" },
        ticks: { beginAtZero: true, color: "#3b4a6b" },
      },
    },
  };

  return (
    <div className={panelClass}>
      <strong>Daily Conversations</strong>
      <div className="chart-wrap">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
