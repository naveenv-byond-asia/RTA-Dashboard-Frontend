import "chart.js/auto";
import { Line } from "react-chartjs-2";

export default function PeakHourLine({ labels, data, className }) {
  const panelClass = ["panel", className].filter(Boolean).join(" ");
  const chartData = {
    labels,
    datasets: [
      {
        label: "Trips per hour",
        data,
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.14)",
        pointBackgroundColor: "#1d4ed8",
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
      <strong>Hourly Demand</strong>
      <div className="chart-wrap">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
