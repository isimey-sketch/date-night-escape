import { CATEGORIES, categoryById } from "./categories";
import { overpass, haversine } from "./providers";
import { parseHours } from "./hours";

const cache = new Map();

function imgFor(cat, name) {
  const palettes = {
    food: ["#3d2a22", "#e7b15a"],
    activity: ["#1d2a33", "#7dcec4"],
    culture: ["#2a2433", "#d7c4a3"],
    outdoor: ["#1c2b22", "#8fbf7a"]
  };
  const [a, b] = palettes[cat.group] || palettes.culture;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='480'><rect width='800' height='480' fill='${a}'/><circle cx='640' cy='120' r='90' fill='${b}' opacity='0.85'/><text x='48' y='250' fill='#f6f4ef' font-family='Georgia,serif' font-size='42'>${escapeXml(cat.label)}</text><text x='48' y='300' fill='#d9d4c8' font-family='sans-serif' font-size='20'>Category image · not a photo of this venue</text></svg>`;
  return { url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`, kind: "category", label: `Category image for ${cat.label}, not a photo of ${name}` };
}

function escapeXml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ "&": "&", "<": "<", ">": ">" }[c]));
}

function venueImage(tags, cat, name) {
  const commons = tags.wikimedia_commons || tags.image;
  if (commons && /File:|https?:/i.test(commons)) {
    if (/^https?:/i.test(commons)) return { url: commons, kind: "source", label: "Image referenced by the venue record" };
    const file = commons.replace(/^File:/i, "");
    return {
      url: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=800`,
      kind: "commons",
      label: "Wikimedia file linked from this venue's OpenStreetMap record"
    };
  }
  return imgFor(cat, name);
}

function addressOf(tags) {
  const bits = [tags["addr:housenumber"], tags["addr:street"], tags["addr:postcode"], tags["addr:city"]].filter(Boolean);
  return bits.join(" ");
}

export function normalizeElement(el, cat) {
  const tags = el.tags || {};
  const lat = el.lat || el.center?.lat;
  const lon = el.lon || el.center?.lon;
  if (!lat || !lon || !tags.name) return null;
  const id = `osm:${el.type}:${el.id}`;
  return {
    id,
    name: tags.name,
    category: cat.id,
    categoryLabel: cat.label,
    group: cat.group,
    indoor: cat.indoor,
    lat,
    lon,
    address: addressOf(tags) || null,
    website: tags.website || tags["contact:website"] || null,
    phone: tags.phone || tags["contact:phone"] || null,
    openingHours: tags.opening_hours || null,
    hours: parseHours(tags.opening_hours),
    cuisine: tags.cuisine || null,
    fee: tags.fee || null,
    wheelchair: tags.wheelchair || null,
    adult: !!cat.adult || tags.amenity === "bar" || tags.amenity === "pub",
    team: !!cat.team,
    showingUnknown: !!cat.showingUnknown,
    family: !!cat.family,
    est: cat.est,
    image: venueImage(tags, cat, tags.name),
    source: "openstreetmap",
    sourceUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    provenance: "OpenStreetMap via Overpass"
  };
}

export async function discoverPlaces({ lat, lon, radius = 4000, categories, query = "", limit = 60 }) {
  const cats = (categories?.length ? categories : CATEGORIES.map((c) => c.id))
    .map(categoryById)
    .filter(Boolean);
  const key = `${lat.toFixed(3)}:${lon.toFixed(3)}:${radius}:${cats.map((c) => c.id).join(",")}`;
  let elements = cache.get(key);
  if (!elements) {
    const blocks = cats.flatMap((cat) =>
      cat.osm.flatMap(([k, v]) => [`node["${k}"="${v}"]["name"](around:${radius},${lat},${lon});`, `way["${k}"="${v}"]["name"](around:${radius},${lat},${lon});`])
    );
    const q = `[out:json][timeout:25];(${blocks.join("")});out center 80;`;
    const data = await overpass(q);
    elements = data.elements || [];
    cache.set(key, elements);
    if (cache.size > 24) cache.delete(cache.keys().next().value);
  }
  const seen = new Set();
  const places = [];
  for (const el of elements) {
    const tags = el.tags || {};
    const cat = cats.find((c) => c.osm.some(([k, v]) => tags[k] === v));
    if (!cat) continue;
    const place = normalizeElement(el, cat);
    if (!place || seen.has(place.id)) continue;
    if (query && !`${place.name} ${place.categoryLabel} ${place.address || ""} ${place.cuisine || ""}`.toLowerCase().includes(query.toLowerCase())) continue;
    seen.add(place.id);
    place.distanceM = Math.round(haversine({ lat, lon }, place));
    places.push(place);
  }
  places.sort((a, b) => a.distanceM - b.distanceM);
  return places.slice(0, limit);
}

export function currencyFor(country) {
  if (country === "gb") return { code: "GBP", symbol: "£" };
  if (country === "us") return { code: "USD", symbol: "$" };
  if (country === "ch") return { code: "CHF", symbol: "CHF " };
  return { code: "EUR", symbol: "€" };
}
