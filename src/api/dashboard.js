import { csvParse } from "d3";
import conversationsCsvUrl from "../../dummy_data/data/conversations.csv?url";
import knowledgeBase from "../../dummy_data/knowledge_base.json";

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
  const categoryLabels = [
    "Mobility & Access",
    "Food & Beverages",
    "Retail & Lifestyle",
    "Health, Fitness & Education",
    "Services & Utilities",
    "Entertainment, Leisure & Stay",
  ];
  const personaByCategory = {
    "Mobility & Access": "commuters, parking, work routes",
    "Food & Beverages": "food seekers, quick bites",
    "Retail & Lifestyle": "shoppers, retail stops",
    "Health, Fitness & Education": "students, clinics, gyms",
    "Services & Utilities": "ATMs, exchanges, daily services",
    "Entertainment, Leisure & Stay": "tourists, hotels, leisure",
  };
  const total = rows.length;
  const withAnswers = rows.filter((row) => row.assistant_answer?.trim()).length;
  const uniqueLocations = new Set(rows.map((row) => row.location)).size;
  const happyCount = rows.filter(
    (row) => (row.csat || "").toLowerCase() === "happy"
  ).length;
  const happyPercent = Math.round((happyCount / Math.max(total, 1)) * 100);
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
      label: "Customer Satisfaction",
      value: `${happyPercent}%`,
      delta: "Happy Users",
      deltaClass: "info",
    },
  ];

  const byDate = new Map();
  const byHour = new Array(24).fill(0);
  const byServiceHour = new Array(24).fill(0);
  const byRestaurantHour = new Array(24).fill(0);
  const byCategory = new Map();
  const byLocation = new Map();
  const byRoute = new Map();
  const locationCategories = new Map();
  const rowsByHour = new Map();

  rows.forEach((row) => {
    const dateKey = row.date;
    byDate.set(dateKey, (byDate.get(dateKey) || 0) + 1);

    const hour = Number((row.time || "0:0").split(":")[0]);
    if (!Number.isNaN(hour) && hour >= 0 && hour <= 23) {
      byHour[hour] += 1;
      if (!rowsByHour.has(hour)) {
        rowsByHour.set(hour, []);
      }
      rowsByHour.get(hour).push(row);
      if (row.category === "Services & Utilities") {
        byServiceHour[hour] += 1;
      }
      if (row.category === "Food & Beverages") {
        byRestaurantHour[hour] += 1;
      }
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

  const categoryHourly = {
    labels: peakHours.labels,
    serviceUtilities: byServiceHour,
    restaurants: byRestaurantHour,
  };

  const percentOfTotal = (value) =>
    Math.round((value / Math.max(total, 1)) * 100);

  const lateNightHours = new Set([22, 23, 0, 1, 2]);
  const lateNightCount = [...lateNightHours].reduce(
    (sum, hour) => sum + (rowsByHour.get(hour)?.length || 0),
    0
  );

  const foodCount = byCategory.get("Food & Beverages") || 0;
  const worshipCount = rows.filter(
    (row) =>
      (row.sub_category || "").toLowerCase() === "religious services" ||
      row.category === "Services & Utilities"
  ).length;
  const shopperCount = byCategory.get("Retail & Lifestyle") || 0;
  const touristCount = byCategory.get("Entertainment, Leisure & Stay") || 0;

  const dinnerWindowHours = [19, 20, 21];
  const dinnerRows = dinnerWindowHours.flatMap(
    (hour) => rowsByHour.get(hour) || []
  );
  const dinnerFoodCount = dinnerRows.filter(
    (row) => row.category === "Food & Beverages"
  ).length;
  const dinnerFoodPercent = Math.round(
    (dinnerFoodCount / Math.max(dinnerRows.length, 1)) * 100
  );

  const categoryCountsForHours = (hours) => {
    const counts = new Map(categoryLabels.map((label) => [label, 0]));
    hours.forEach((hour) => {
      (rowsByHour.get(hour) || []).forEach((row) => {
        const label = row.category;
        if (counts.has(label)) {
          counts.set(label, counts.get(label) + 1);
        }
      });
    });
    return counts;
  };

  const topCategoryForHours = (hours) => {
    const counts = categoryCountsForHours(hours);
    let topLabel = categoryLabels[0];
    let topValue = -1;
    counts.forEach((value, label) => {
      if (value > topValue) {
        topValue = value;
        topLabel = label;
      }
    });
    return topLabel;
  };

  const morningTop = topCategoryForHours([6, 7, 8, 9, 10, 11]);
  const afternoonTop = topCategoryForHours([12, 13, 14, 15, 16, 17]);
  const eveningTop = topCategoryForHours([18, 19, 20, 21, 22, 23]);

  const placeTypeBreakdown = {
    labels: categoryLabels,
    data: categoryLabels.map((label) => byCategory.get(label) || 0),
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

  const adTypeForCategory = (category) => {
    switch (category) {
      case "Food & Beverages":
        return "cafe sponsorship opportunity";
      case "Retail & Lifestyle":
        return "retail sponsorship opportunity";
      case "Services & Utilities":
        return "banking or exchange sponsorship opportunity";
      case "Entertainment, Leisure & Stay":
        return "hotel or leisure sponsorship opportunity";
      case "Mobility & Access":
        return "mobility services sponsorship opportunity";
      case "Health, Fitness & Education":
        return "clinic or education sponsorship opportunity";
      default:
        return "local sponsorship opportunity";
    }
  };

  const audienceIntelligence = {
    intentStatement: `${dinnerFoodPercent}% of users between 7-9pm are looking for food nearby.`,
    intentSegments: {
      foodSeekers: percentOfTotal(foodCount),
      worshippers: percentOfTotal(worshipCount),
      shoppers: percentOfTotal(shopperCount),
      tourists: percentOfTotal(touristCount),
      lateNightUsers: percentOfTotal(lateNightCount),
    },
    timeOfDayPersona: {
      morning: `Morning: ${personaByCategory[morningTop]}.`,
      afternoon: `Afternoon: ${personaByCategory[afternoonTop]}.`,
      evening: `Evening: ${personaByCategory[eveningTop]}.`,
    },
    conversionPotential: locationRows.slice(0, 3).map((row) => ({
      location: row.location,
      statement: `${row.location} appears in top queries -> ${adTypeForCategory(
        row.category
      )}.`,
    })),
  };

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
    categoryHourly,
    dailyTraffic,
    placeTypeBreakdown,
    locationRows,
    busRouteRows: topRoutes,
    audienceIntelligence,
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
