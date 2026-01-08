import "chart.js/auto";
import { Pie } from "react-chartjs-2";

export default function AudienceIntelligenceLayer({
  intentStatement,
  intentSegments,
  timeOfDayPersona,
  conversionPotential,
}) {
  const intentLabels = [
    "Food seekers",
    "Worshippers",
    "Shoppers",
    "Tourists",
    "Late-night users",
  ];
  const intentValues = [
    intentSegments.foodSeekers,
    intentSegments.worshippers,
    intentSegments.shoppers,
    intentSegments.tourists,
    intentSegments.lateNightUsers,
  ];
  const intentData = {
    labels: intentLabels,
    datasets: [
      {
        data: intentValues,
        backgroundColor: [
          "#2563eb",
          "#f97316",
          "#10b981",
          "#facc15",
          "#ef4444",
        ],
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };
  const intentOptions = {
    plugins: {
      legend: { position: "bottom", labels: { color: "#3b4a6b" } },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <>
      <section className="panel-grid">
        <div className="panel">
          <strong>Intent-Based Segments</strong>
          <p>{intentStatement}</p>
          <div className="chart-wrap">
            <Pie data={intentData} options={intentOptions} />
          </div>
        </div>
        <div className="panel">
          <strong>Time-of-Day Persona Mapping</strong>
          <p>{timeOfDayPersona.morning}</p>
          <p>{timeOfDayPersona.afternoon}</p>
          <p>{timeOfDayPersona.evening}</p>
        </div>
        <div className="panel">
          <strong>Location-to-Conversion Potential</strong>
          {conversionPotential.map((item) => (
            <p key={item.location}>{item.statement}</p>
          ))}
        </div>
      </section>
    </>
  );
}
