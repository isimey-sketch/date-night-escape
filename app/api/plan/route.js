import { buildPlans } from "../../../lib/planner";
import { discoverPlaces } from "../../../lib/places";

export async function POST(req) {
  const body = await req.json();
  if (!body.lat || !body.lon || !body.date || !body.time) {
    return Response.json({ error: "Location, date and time are required." }, { status: 400 });
  }
  const input = {
    audience: body.audience || "couple",
    lat: Number(body.lat),
    lon: Number(body.lon),
    city: body.city || "",
    country: body.country || "",
    date: body.date,
    time: body.time,
    durationMin: Number(body.durationMin) || 180,
    budget: Number(body.budget) || 80,
    vibes: body.vibes || [],
    setting: body.setting || "mixed",
    partySize: Number(body.partySize) || 4,
    adults: Number(body.adults) || 2,
    children: Number(body.children) || 0,
    childAges: body.childAges || [],
    excludeIds: body.excludeIds || []
  };
  try {
    if (body.anchorId) {
      const places = await discoverPlaces({ lat: input.lat, lon: input.lon, radius: 10000, limit: 200 });
      input.anchor = places.find((p) => p.id === body.anchorId) || null;
    }
    const result = await buildPlans(input);
    return Response.json(result);
  } catch (err) {
    return Response.json({ plans: [], error: err.message }, { status: 502 });
  }
}
