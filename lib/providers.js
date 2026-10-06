const UA = "DateNightEscape/1.0 (standalone outing planner; contact via app)";

export async function fetchJson(url, { timeout = 12000, headers = {} } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json", ...headers }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url.split("?")[0]}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function geocode(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`;
  const rows = await fetchJson(url, { timeout: 10000 });
  return (rows || []).map((r) => ({
    label: r.display_name,
    lat: Number(r.lat),
    lon: Number(r.lon),
    city: r.address?.city || r.address?.town || r.address?.village || r.address?.municipality || r.name,
    country: r.address?.country_code || "",
    type: r.type,
    importance: r.importance || 0,
    source: "nominatim",
    sourceId: `${r.osm_type}:${r.osm_id}`
  }));
}

export async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
  const r = await fetchJson(url, { timeout: 10000 });
  return {
    label: r.display_name,
    lat: Number(r.lat),
    lon: Number(r.lon),
    city: r.address?.city || r.address?.town || r.address?.village || "",
    country: r.address?.country_code || "",
    source: "nominatim",
    sourceId: `${r.osm_type}:${r.osm_id}`
  };
}

const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];

export async function overpass(query) {
  let last;
  for (const base of OVERPASS) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 22000);
      const res = await fetch(base, {
        method: "POST",
        headers: { "User-Agent": UA, "Content-Type": "text/plain" },
        body: query,
        signal: ctrl.signal
      });
      clearTimeout(t);
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      return await res.json();
    } catch (err) {
      last = err;
    }
  }
  throw last || new Error("Overpass unavailable");
}

export async function weatherAt(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,weather_code,wind_speed_10m&hourly=precipitation_probability,weather_code&forecast_days=2&timezone=auto`;
  const data = await fetchJson(url, { timeout: 10000 });
  const code = data.current?.weather_code;
  const rainCodes = new Set([51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99]);
  return {
    timezone: data.timezone || "UTC",
    tempC: data.current?.temperature_2m,
    precipitation: data.current?.precipitation,
    code,
    rainy: rainCodes.has(code) || (data.current?.precipitation || 0) > 0.2,
    summary: weatherLabel(code),
    source: "open-meteo"
  };
}

export function weatherLabel(code) {
  if (code === 0) return "Clear";
  if (code <= 3) return "Mostly fair";
  if (code <= 48) return "Cloudy or fog";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  return "Storm risk";
}

export async function route(points) {
  if (!points || points.length < 2) return { legs: [], source: "none" };
  const path = points.map((p) => `${p.lon},${p.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/foot/${path}?overview=false&steps=false`;
  try {
    const data = await fetchJson(url, { timeout: 9000 });
    const legs = data.routes?.[0]?.legs || [];
    return {
      source: "osrm-foot",
      legs: legs.map((l) => ({ meters: l.distance, seconds: l.duration }))
    };
  } catch {
    return {
      source: "haversine-fallback",
      legs: points.slice(1).map((p, i) => {
        const meters = haversine(points[i], p);
        return { meters, seconds: (meters / 4500) * 3600 };
      })
    };
  }
}

export function haversine(a, b) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
