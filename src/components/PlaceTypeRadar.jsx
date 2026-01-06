import "chart.js/auto";
import { Radar } from "react-chartjs-2";

export default function PlaceTypeRadar({ labels, data }) {
  const chartData = {
    labels,
    datasets: [
      {
        label: "Share of trips",
        data,
        backgroundColor: "rgba(37, 99, 235, 0.2)",
        borderColor: "#1d4ed8",
        pointBackgroundColor: "#0f172a",
        borderWidth: 2,
      },
    ],
  };

  const options = {
    plugins: { legend: { display: false } },
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: 8 },
    scales: {
      r: {
        ticks: { beginAtZero: true, color: "#3b4a6b" },
        pointLabels: { color: "#3b4a6b", font: { size: 12 }, padding: 10 },
        grid: { color: "#d7e2f1" },
        angleLines: { color: "#d7e2f1" },
      },
    },
  };

  return (
    <div className="panel">
      <strong>Category Mix</strong>
      <div className="chart-wrap chart-wrap--radar">
        <Radar data={chartData} options={options} />
      </div>
    </div>
  );
}
