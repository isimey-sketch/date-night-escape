import { CATEGORIES } from "./categories";
import { discoverPlaces, currencyFor } from "./places";
import { hoursStatus } from "./hours";
import { route, weatherAt, haversine } from "./providers";

const VIBES = ["easy", "playful", "romantic", "food-first", "outdoors", "culture", "active", "low-key"];

function partySize(input) {
  if (input.audience === "solo") return 1;
  if (input.audience === "couple") return 2;
  if (input.audience === "friends") return Math.max(2, Number(input.partySize) || 4);
  return Math.max(1, Number(input.adults) || 2) + Math.max(0, Number(input.children) || 0);
}

function allowed(place, input) {
  const cat = CATEGORIES.find((c) => c.id === place.category);
  if (!cat?.audiences.includes(input.audience)) return false;
  if (input.audience === "family" && place.adult) return false;
  if (input.audience === "solo" && place.team) return false;
  if (input.audience === "family") {
    const ages = input.childAges || [];
    const youngest = ages.length ? Math.min(...ages) : 6;
    if (youngest < 8 && place.category === "escape") return false;
    if (youngest < 6 && place.category === "climbing") return false;
  }
  if (input.setting === "indoor" && place.indoor === "outdoor") return false;
  if (input.setting === "outdoor" && place.indoor === "indoor") return false;
  return true;
}

function scorePlace(place, input, weather) {
  let score = 40;
  const reasons = [];
  const vibes = input.vibes || [];
  if (vibes.includes("food-first") && place.group === "food") { score += 16; reasons.push("matches a food-first vibe"); }
  if (vibes.includes("culture") && place.group === "culture") { score += 16; reasons.push("matches a culture vibe"); }
  if (vibes.includes("active") && ["bowling", "climbing", "minigolf", "arcade"].includes(place.category)) { score += 14; reasons.push("active and social"); }
  if (vibes.includes("outdoors") && place.indoor !== "indoor") { score += 12; reasons.push("outdoor leaning"); }
  if (vibes.includes("romantic") && input.audience === "couple" && ["viewpoint", "restaurant", "theatre", "park"].includes(place.category)) { score += 10; reasons.push("works for a slower date"); }
  if (vibes.includes("low-key") && ["cafe", "park", "museum"].includes(place.category)) { score += 10; reasons.push("low logistics"); }
  if (input.audience === "family" && ["playground", "zoo", "aquarium", "indoor_play", "park", "dessert"].includes(place.category)) { score += 14; reasons.push("age-aware family fit"); }
  if (input.audience === "friends" && ["bowling", "arcade", "escape", "minigolf"].includes(place.category)) { score += 14; reasons.push("interactive for a group"); }
  if (input.audience === "solo" && ["cafe", "museum", "cinema", "park", "exhibition"].includes(place.category)) { score += 12; reasons.push("usable alone"); }
  const km = (place.distanceM || 0) / 1000;
  score += Math.max(0, 22 - km * 4);
  if (km < 1.5) reasons.push("nearby");
  if (place.hours?.known) { score += 8; reasons.push("hours published"); }
  else score -= 4;
  if (weather?.rainy && place.indoor === "outdoor") { score -= 18; reasons.push("weather risk"); }
  if (weather?.rainy && place.indoor === "indoor") { score += 8; reasons.push("rain cover"); }
  if (place.website) score += 3;
  const mid = ((place.est[0] + place.est[1]) / 2) * partySize(input);
  if (input.budget && mid > input.budget * 1.2) score -= 12;
  if (input.budget && mid <= input.budget) score += 6;
  return { score, reasons };
}

function estimateCost(place, n) {
  const low = place.est[0] * n;
  const high = place.est[1] * n;
  return { low, high, mid: Math.round((low + high) / 2), perLow: place.est[0], perHigh: place.est[1], note: place.est[1] === 0 ? "No entry fee listed in category estimates." : "Category estimate, not a confirmed menu or ticket price. No child discount applied." };
}

function pick(pool, predicate, used) {
  return pool.find((p) => !used.has(p.id) && predicate(p));
}

async function assemble(kind, pool, input, origin, weather, usedGlobal) {
  const used = new Set(usedGlobal);
  const n = partySize(input);
  const rainy = weather?.rainy || input.setting === "indoor";
  const foodPred = (p) => p.group === "food" && (input.audience === "family" ? !p.adult : true);
  const activityPred = (p) => p.group === "activity" || (kind === "wow" && p.group === "culture");
  let stops = [];
  if (kind === "easy") {
    const a = pick(pool, (p) => foodPred(p) && p.category !== "bar", used) || pick(pool, (p) => p.category === "park" || p.category === "playground", used);
    if (a) { used.add(a.id); stops.push(a); }
    const b = pick(pool, (p) => !foodPred(p) && (rainy ? p.indoor !== "outdoor" : true) && p.distanceM < 2500, used);
    if (b) { used.add(b.id); stops.push(b); }
  } else if (kind === "fun") {
    const a = pick(pool, (p) => p.group === "activity" && (rainy ? p.indoor !== "outdoor" : true), used) || pick(pool, (p) => p.group === "culture", used);
    if (a) { used.add(a.id); stops.push(a); }
    const b = pick(pool, foodPred, used);
    if (b) { used.add(b.id); stops.push(b); }
  } else {
    const a = pick(pool, (p) => ["zoo", "aquarium", "theatre", "viewpoint", "museum", "exhibition"].includes(p.category) && (rainy ? p.indoor !== "outdoor" : true), used) || pick(pool, (p) => p.group !== "food", used);
    if (a) { used.add(a.id); stops.push(a); }
    const b = pick(pool, (p) => p.category === "restaurant" || p.category === "cafe", used);
    if (b) { used.add(b.id); stops.push(b); }
  }
  if (input.anchor) {
    stops = [input.anchor, ...stops.filter((s) => s.id !== input.anchor.id)].slice(0, 3);
  }
  if (!stops.length) return null;
  const points = [{ lat: origin.lat, lon: origin.lon }, ...stops.map((s) => ({ lat: s.lat, lon: s.lon }))];
  const routed = await route(points);
  const start = new Date(`${input.date}T${input.time}:00`);
  let cursor = new Date(start.getTime());
  const timeline = [];
  let travelMin = 0;
  stops.forEach((stop, i) => {
    const leg = routed.legs[i];
    const mins = Math.max(5, Math.round((leg?.seconds || 600) / 60));
    travelMin += mins;
    cursor = new Date(cursor.getTime() + mins * 60000);
    const stay = stop.group === "food" ? Math.min(75, Math.max(40, Math.round(input.durationMin * 0.35))) : Math.min(120, Math.max(45, Math.round(input.durationMin * 0.45)));
    const status = hoursStatus(stop.hours, cursor, stay);
    timeline.push({
      placeId: stop.id,
      name: stop.name,
      category: stop.category,
      categoryLabel: stop.categoryLabel,
      address: stop.address,
      lat: stop.lat,
      lon: stop.lon,
      website: stop.website,
      sourceUrl: stop.sourceUrl,
      image: stop.image,
      arrive: cursor.toISOString(),
      stayMin: stay,
      travelMin: mins,
      travelSource: routed.source,
      hours: status,
      indoor: stop.indoor,
      restrictions: restrictions(stop, input),
      cost: estimateCost(stop, n),
      booking: bookingNote(stop)
    });
    cursor = new Date(cursor.getTime() + stay * 60000);
  });
  const totalCost = timeline.reduce((acc, s) => ({ low: acc.low + s.cost.low, high: acc.high + s.cost.high }), { low: 0, high: 0 });
  const indoorCount = timeline.filter((s) => s.indoor !== "outdoor").length;
  const plan = {
    id: `${kind}-${stops.map((s) => s.id).join("-")}`,
    kind,
    title: titleFor(kind, stops, input),
    vibe: vibeFor(kind, input),
    stops: timeline,
    totalMin: travelMin + timeline.reduce((a, s) => a + s.stayMin, 0),
    travelMin,
    cost: { ...totalCost, perLow: Math.round(totalCost.low / n), perHigh: Math.round(totalCost.high / n), party: n, currency: currencyFor(origin.country) },
    indoorSplit: `${indoorCount} indoor-leaning / ${timeline.length - indoorCount} outdoor`,
    weather: weather?.summary || "Unknown",
    reasons: reasonsFor(kind, timeline, input),
    warnings: warningsFor(timeline, input, weather)
  };
  const valid = validate(plan, input);
  if (!valid.ok) return null;
  plan.validation = valid;
  usedGlobal.push(...stops.map((s) => s.id));
  return plan;
}

function restrictions(stop, input) {
  const notes = [];
  if (stop.category === "cinema" || stop.category === "theatre") notes.push("Building only. Showtimes and tickets are not confirmed.");
  if (stop.team) notes.push("Often booked as a team. Confirm a solo or small-party slot before relying on it.");
  if (input.audience === "family") notes.push("Check age, height and supervision rules on the venue page. None were confirmed here.");
  if (stop.wheelchair) notes.push(`Wheelchair tag: ${stop.wheelchair}. Confirm access.`);
  if (!stop.address) notes.push("Street address incomplete in source data. Use the map pin.");
  return notes;
}

function bookingNote(stop) {
  if (stop.website) return { required: "unknown", note: "No live reservation check. Official site linked if you want to book.", url: stop.website };
  return { required: "unknown", note: "No booking provider connected. Walk-up is not confirmed.", url: stop.sourceUrl };
}

function titleFor(kind, stops, input) {
  const names = stops.map((s) => s.name);
  if (kind === "easy") return input.audience === "family" ? `Easy family loop: ${names[0]}` : `Easy: ${names.join(" & ")}`;
  if (kind === "fun") return `Fun: ${names.join(" then ")}`;
  return `Wow: ${names.join(" & ")}`;
}

function vibeFor(kind, input) {
  if (input.audience === "family" && kind === "easy") return "Short hops, food, and a reset stop";
  if (kind === "easy") return "Low logistics, nearby, easy to leave";
  if (kind === "fun") return "One shared activity, then food";
  return "A more deliberate outing";
}

function reasonsFor(kind, timeline, input) {
  return [
    `${kind.toUpperCase()} is a starting point, not the only inventory.`,
    timeline.map((s) => s.name).join(" → "),
    input.audience === "solo" ? "Priced and sequenced for one person." : `Sequenced for ${timeline[0] ? "" : ""}${input.audience}.`
  ];
}

function warningsFor(timeline, input, weather) {
  const w = [];
  if (timeline.some((s) => s.hours.status === "unknown")) w.push("At least one stop has unknown hours. Unknown is not open.");
  if (timeline.some((s) => s.hours.status === "closed")) w.push("A stop looks closed for this window.");
  if (weather?.rainy) w.push(`Weather: ${weather.summary}. Outdoor stops are backups, not the lead.`);
  if (input.audience === "family") w.push("Finish time prefers an earlier evening when children are included. No alcohol-first venues.");
  w.push("Costs are estimates. Child discounts were not invented.");
  return w;
}

function validate(plan, input) {
  const issues = [];
  const ids = plan.stops.map((s) => s.placeId);
  if (new Set(ids).size !== ids.length) issues.push("duplicate");
  if (plan.stops.some((s) => !s.lat || !s.lon)) issues.push("coordinates");
  if (plan.totalMin > input.durationMin + 30) issues.push("duration");
  if (plan.stops.some((s) => s.hours.status === "closed")) issues.push("closed");
  const far = plan.stops.some((s) => haversine({ lat: input.lat, lon: input.lon }, s) > 18000);
  if (far && input.audience === "family") issues.push("too far for family");
  return { ok: !issues.length, issues };
}

export async function buildPlans(input) {
  const weather = await weatherAt(input.lat, input.lon).catch(() => null);
  const radius = input.radius || (input.city && /berlin|london|paris/i.test(input.city) ? 7000 : 4500);
  const categories = CATEGORIES.filter((c) => c.audiences.includes(input.audience)).map((c) => c.id);
  let places = await discoverPlaces({ lat: input.lat, lon: input.lon, radius, categories, limit: 160 });
  places = places.filter((p) => allowed(p, input));
  const exclude = new Set(input.excludeIds || []);
  places = places.filter((p) => !exclude.has(p.id));
  places.forEach((p) => { p.rank = scorePlace(p, input, weather); });
  places.sort((a, b) => b.rank.score - a.rank.score || a.distanceM - b.distanceM);
  const origin = { lat: input.lat, lon: input.lon, country: input.country };
  const used = [];
  const easy = await assemble("easy", places, input, origin, weather, used);
  const fun = await assemble("fun", places, input, origin, weather, used);
  const wow = await assemble("wow", places, input, origin, weather, used);
  const plans = [easy, fun, wow].filter(Boolean);
  return {
    plans,
    inventory: places.length,
    categoriesPresent: [...new Set(places.map((p) => p.category))],
    weather,
    currency: currencyFor(input.country),
    note: places.length < 8 ? "Supply is thin for these filters. Widen the radius, relax indoor/outdoor, or try a larger town." : "Ranked on fit, distance, hours confidence, weather and budget. Popularity is not a source field."
  };
}

export async function anchorPlan(input, place) {
  input.anchor = place;
  const result = await buildPlans(input);
  return result.plans[0] || null;
}

export { VIBES };
