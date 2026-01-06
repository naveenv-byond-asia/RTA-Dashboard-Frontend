import { csvParse } from "d3";
import conversationsCsvUrl from "../../dummy_data/data/conversations.csv?url";
import knowledgeBase from "../../dummy_data/knowledgge_base.json";

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function normalizeRows(rows) {
  return rows.filter((row) => row.id || row.category || row.location);
}

function extractBusRoutes(text) {
  if (!text) {
    return [];
  }
  const routes = new Set();
  const patterns = [
    /\b(?:bus|route)\s*(?:number|no\.?|#)?\s*([0-9]{1,3}[a-zA-Z]?)(?:\s*(?:and|or|,)\s*([0-9]{1,3}[a-zA-Z]?))?/gi,
    /\bnumber\s*([0-9]{1,3}[a-zA-Z]?)\s*bus\b/gi,
    /\b([0-9]{1,3}[a-zA-Z]?)\s*bus\b/gi,
  ];

  patterns.forEach((pattern) => {
    let match = pattern.exec(text);
    while (match) {
      for (let index = 1; index < match.length; index += 1) {
        const value = match[index];
        if (value) {
          routes.add(value.toUpperCase());
        }
      }
      match = pattern.exec(text);
    }
  });

  if (routes.size > 0) {
    return [...routes];
  }

  const segments = text.split(/[\n.!?]+/);
  segments.forEach((segment) => {
    const lower = segment.toLowerCase();
    if (!lower.includes("bus")) {
      return;
    }
    const matches = [...segment.matchAll(/\b\d{1,3}[a-zA-Z]?\b/g)];
    matches.forEach((match) => {
      const value = match[0];
      const before = segment.slice(0, match.index).trim();
      const after = segment.slice(match.index + value.length).trim();
      const prevWord = before.split(/\s+/).at(-1)?.toLowerCase() || "";
      const nextWord = after.split(/\s+/)[0]?.toLowerCase() || "";
      if (["stop", "station"].includes(prevWord)) {
        return;
      }
      if (
        [
          "minute",
          "minutes",
          "min",
          "mins",
          "meter",
          "meters",
          "m",
          "km",
          "kilometer",
          "kilometers",
          "kilometre",
          "kilometres",
          "hour",
          "hours",
        ].includes(nextWord)
      ) {
        return;
      }
      routes.add(value.toUpperCase());
    });
  });

  return [...routes];
}

export function buildDashboardData(rows) {
  const total = rows.length;
  const withAnswers = rows.filter((row) => row.assistant_answer?.trim()).length;
  const uniqueLocations = new Set(rows.map((row) => row.location)).size;
  const avgLatency =
    rows.reduce((sum, row) => sum + Number(row.latency_ms || 0), 0) /
    Math.max(total, 1);

  const metrics = [
    { label: "Total Conversations", value: formatNumber(total), delta: "Last 30d" },
    {
      label: "Answer Rate",
      value: `${Math.round((withAnswers / Math.max(total, 1)) * 100)}%`,
      delta: `${formatNumber(withAnswers)} answered`,
    },
    {
      label: "Unique Locations",
      value: formatNumber(uniqueLocations),
      delta: "Active destinations",
    },
    {
      label: "Avg Response Latency",
      value: `${Math.round(avgLatency)} ms`,
      delta: "Median target 1500 ms",
    },
  ];

  const byDate = new Map();
  const byHour = new Array(24).fill(0);
  const byCategory = new Map();
  const byLocation = new Map();
  const byRoute = new Map();
  const locationCategories = new Map();

  rows.forEach((row) => {
    const dateKey = row.date;
    byDate.set(dateKey, (byDate.get(dateKey) || 0) + 1);

    const hour = Number((row.time || "0:0").split(":")[0]);
    if (!Number.isNaN(hour)) {
      byHour[hour] += 1;
    }

    byCategory.set(row.category, (byCategory.get(row.category) || 0) + 1);
    byLocation.set(row.location, (byLocation.get(row.location) || 0) + 1);

    if (!locationCategories.has(row.location)) {
      locationCategories.set(row.location, new Map());
    }
    const categoryMap = locationCategories.get(row.location);
    categoryMap.set(row.category, (categoryMap.get(row.category) || 0) + 1);

    extractBusRoutes(row.assistant_answer).forEach((route) => {
      byRoute.set(route, (byRoute.get(route) || 0) + 1);
    });
  });

  const dailyTraffic = {
    labels: [...byDate.keys()].sort(),
    data: [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, count]) => count),
  };

  const peakHours = {
    labels: byHour.map((_, hour) => `${hour.toString().padStart(2, "0")}:00`),
    data: byHour,
  };

  const topCategories = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const placeTypeBreakdown = {
    labels: topCategories.map(([label]) => label),
    data: topCategories.map(([, count]) => count),
  };

  const topLocations = [...byLocation.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const locationRows = topLocations.map(([location, count]) => {
    const categoryMap = locationCategories.get(location);
    const topCategory = [...categoryMap.entries()].sort((a, b) => b[1] - a[1])[0];
    const totalLatency = rows
      .filter((row) => row.location === location)
      .reduce((sum, row) => sum + Number(row.latency_ms || 0), 0);
    const avgLatencyMs = Math.round(totalLatency / Math.max(count, 1));

    return {
      location,
      category: topCategory?.[0] || "-",
      volume: formatNumber(count),
      latency: `${avgLatencyMs} ms`,
    };
  });

  const jafiliyaRows = rows.filter((row) =>
    row.user_question?.toLowerCase().includes("al jafiliya")
  );
  const jafiliyaCounts = new Map();
  jafiliyaRows.forEach((row) => {
    if (row.location) {
      jafiliyaCounts.set(row.location, (jafiliyaCounts.get(row.location) || 0) + 1);
    }
  });
  const jafiliyaTopLocations = [...jafiliyaCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const hubSpokeLocations = jafiliyaTopLocations.length
    ? jafiliyaTopLocations
    : topLocations.map(([label, count]) => [label, count]);

  const locationCoordinates = new Map();
  Object.values(knowledgeBase).forEach((entries) => {
    if (!Array.isArray(entries)) {
      return;
    }
    entries.forEach((entry) => {
      if (
        entry?.name &&
        typeof entry.latitude === "number" &&
        typeof entry.longitude === "number"
      ) {
        if (!locationCoordinates.has(entry.name)) {
          locationCoordinates.set(entry.name, {
            latitude: entry.latitude,
            longitude: entry.longitude,
          });
        }
      }
    });
  });
  const heatmapPoints = [...byLocation.entries()]
    .map(([location, count]) => {
      const coords = locationCoordinates.get(location);
      if (!coords) {
        return null;
      }
      return {
        latitude: coords.latitude,
        longitude: coords.longitude,
        weight: count,
      };
    })
    .filter(Boolean);

  const topRoutes = [...byRoute.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([route, count]) => ({
      route,
      count: formatNumber(count),
    }));

  const lastUpdated = rows
    .map((row) => `${row.date || ""}T${row.time || "00:00:00"}`)
    .filter((value) => value !== "T00:00:00")
    .sort()
    .at(-1);

  const topConversations = [...rows]
    .sort((a, b) => {
      const aKey = `${a.date || ""}T${a.time || "00:00:00"}`;
      const bKey = `${b.date || ""}T${b.time || "00:00:00"}`;
      return bKey.localeCompare(aKey);
    })
    .slice(0, 50);

  return {
    metrics,
    peakHours,
    dailyTraffic,
    placeTypeBreakdown,
    locationRows,
    busRouteRows: topRoutes,
    heatmapPoints,
    hubSpoke: {
      hub: "Al Jafiliya",
      spokes: hubSpokeLocations.map(([label, count]) => ({
        label,
        value: count,
      })),
    },
    lastUpdated: lastUpdated ? lastUpdated.replace("T", " ") : "Unknown",
    totalConversations: total,
    conversations: topConversations,
  };
}

export async function loadDashboardData() {
  const response = await fetch(conversationsCsvUrl);
  if (!response.ok) {
    throw new Error(`Failed to load CSV (${response.status})`);
  }
  const csvText = await response.text();
  const rows = csvParse(csvText);

  if (!rows.columns?.includes("id")) {
    throw new Error("CSV columns are missing expected headers.");
  }

  const normalized = normalizeRows(rows);
  return {
    rows: normalized,
    dashboard: buildDashboardData(normalized),
  };
}
