import { useEffect, useMemo, useState } from "react";
import { buildDashboardData, loadDashboardData } from "../api/dashboard.js";
import BusRoutesTable from "../components/BusRoutesTable.jsx";
import AudienceIntelligenceLayer from "../components/AudienceIntelligenceLayer.jsx";
import CategoryHourlyArea from "../components/CategoryHourlyArea.jsx";
import DailyTrafficLine from "../components/DailyTrafficLine.jsx";
import FrequentRoutesTable from "../components/FrequentRoutesTable.jsx";
import HubSpokeDiagram from "../components/HubSpokeDiagram.jsx";
import LocationHeatMap from "../components/LocationHeatMap.jsx";
import MetricCard from "../components/MetricCard.jsx";
import PeakHourLine from "../components/PeakHourLine.jsx";
import PlaceTypeRadar from "../components/PlaceTypeRadar.jsx";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    let isMounted = true;
    loadDashboardData()
      .then((payload) => {
        if (isMounted) {
          setData(payload);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const rows = data?.rows ?? [];
  const filteredRows = useMemo(() => {
    if (!fromDate && !toDate) {
      return rows;
    }
    return rows.filter((row) => {
      const date = row.date;
      if (!date) {
        return false;
      }
      if (fromDate && date < fromDate) {
        return false;
      }
      if (toDate && date > toDate) {
        return false;
      }
      return true;
    });
  }, [rows, fromDate, toDate]);

  const dashboard = useMemo(
    () => buildDashboardData(filteredRows),
    [filteredRows]
  );

  if (error) {
    return (
      <main className="app">
        <header className="header">
          <div>
            <h1>RTA Dashboard</h1>
            <p className="subhead">Unable to load conversation data.</p>
          </div>
        </header>
        <section className="panel-grid">
          <div className="panel loading">{error}</div>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="app">
        <header className="header">
          <div>
            <h1>RTA Dashboard</h1>
            <p className="subhead">Loading conversation analytics…</p>
          </div>
        </header>
        <section className="panel-grid">
          <div className="panel loading">Preparing charts…</div>
        </section>
      </main>
    );
  }

  return (
    <main className="app">
      <div className="header-sticky">
        <header className="header header-box">
          <div>
          <h1>RTA Dashboard</h1>
          <p className="subhead">
            Conversations across key locations, summarizing demand, response
            performance
          </p>
          </div>
          <div className="header-tools">
            <div className="date-filter">
              <label>
                <span>Start Date</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                />
              </label>
              <label>
                <span>End Date</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                />
              </label>
            </div>
            <p className="subhead">
              Last update: {dashboard.lastUpdated} · {dashboard.totalConversations} total
            </p>
          </div>
        </header>
      </div>

      <section className="metrics">
        {dashboard.metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="panel-grid panel-stack">
        <DailyTrafficLine
          className="wide"
          labels={dashboard.dailyTraffic.labels}
          data={dashboard.dailyTraffic.data}
        />
        <PeakHourLine
          className="wide"
          key={`peak-${fromDate || "all"}-${toDate || "all"}`}
          labels={dashboard.peakHours.labels}
          data={dashboard.peakHours.data}
        />
      </section>

      <section className="panel-grid">
        <PlaceTypeRadar
          labels={dashboard.placeTypeBreakdown.labels}
          data={dashboard.placeTypeBreakdown.data}
        />
        <LocationHeatMap data={dashboard.heatmapPoints} />
      </section>

      <AudienceIntelligenceLayer
        intentStatement={dashboard.audienceIntelligence.intentStatement}
        intentSegments={dashboard.audienceIntelligence.intentSegments}
        timeOfDayPersona={dashboard.audienceIntelligence.timeOfDayPersona}
        conversionPotential={dashboard.audienceIntelligence.conversionPotential}
      />

      <section className="panel-grid">
        <FrequentRoutesTable rows={dashboard.busRouteRows} />
        <BusRoutesTable rows={dashboard.locationRows} />
      </section>

      <section className="panel-grid">
        <HubSpokeDiagram
          className="wide"
          hub={dashboard.hubSpoke.hub}
          spokes={dashboard.hubSpoke.spokes}
        />
      </section>

      <section className="panel-grid">
        <CategoryHourlyArea
          labels={dashboard.categoryHourly.labels}
          serviceData={dashboard.categoryHourly.serviceUtilities}
          restaurantData={dashboard.categoryHourly.restaurants}
        />
      </section>
    </main>
  );
}
