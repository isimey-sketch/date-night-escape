import { discoverPlaces } from "../../../lib/places";
import { CATEGORIES } from "../../../lib/categories";

export async function GET(req) {
  const sp = new URL(req.url).searchParams;
  const lat = Number(sp.get("lat"));
  const lon = Number(sp.get("lon"));
  if (!lat || !lon) return Response.json({ error: "lat and lon required" }, { status: 400 });
  const page = Math.max(1, Number(sp.get("page") || 1));
  const category = sp.get("category") || "";
  const q = sp.get("q") || "";
  const audience = sp.get("audience") || "couple";
  const radius = Math.min(12000, 3500 + page * 1500);
  const categories = category ? [category] : CATEGORIES.filter((c) => c.audiences.includes(audience)).map((c) => c.id);
  try {
    const places = await discoverPlaces({ lat, lon, radius, categories, query: q, limit: 40 + page * 20 });
    const start = (page - 1) * 24;
    return Response.json({
      places: places.slice(start, start + 24),
      total: places.length,
      page,
      radius,
      categories: CATEGORIES.filter((c) => categories.includes(c.id)).map((c) => ({ id: c.id, label: c.label })),
      source: "openstreetmap"
    });
  } catch (err) {
    return Response.json({ places: [], error: err.message, empty: "Places provider timed out. Try again or narrow the search." }, { status: 502 });
  }
}
