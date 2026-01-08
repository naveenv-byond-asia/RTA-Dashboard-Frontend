import "chart.js/auto";
import { Line } from "react-chartjs-2";

export default function CategoryHourlyArea({ labels, serviceData, restaurantData }) {
  const chartData = {
    labels,
    datasets: [
      {
        label: "Services & Utilities",
        data: serviceData,
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.2)",
        pointBackgroundColor: "#1d4ed8",
        borderWidth: 2,
        fill: true,
        lineTension: 0.35,
      },
      {
        label: "Food & Beverages",
        data: restaurantData,
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.18)",
        pointBackgroundColor: "#7f1d1d",
        borderWidth: 2,
        fill: true,
        lineTension: 0.35,
      },
    ],
  };

  const options = {
    plugins: { legend: { position: "top", labels: { color: "#3b4a6b" } } },
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
    <div className="panel">
      <strong>Query Volume by Hour</strong>
      <div className="chart-wrap">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
