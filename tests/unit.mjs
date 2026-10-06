import { hoursStatus, parseHours } from "../lib/hours.js";
import { haversine } from "../lib/providers.js";

const parsed = parseHours("Mo-Su 11:00-22:00");
const open = hoursStatus(parsed, new Date("2026-10-06T18:30:00"), 60);
if (open.status !== "open") throw new Error("expected open");
const closed = hoursStatus(parsed, new Date("2026-10-06T23:30:00"), 60);
if (closed.status !== "closed") throw new Error("expected closed");
const unknown = hoursStatus(parseHours(null), new Date(), 30);
if (unknown.status !== "unknown") throw new Error("unknown must not be open");
const d = haversine({ lat: 50.11, lon: 8.68 }, { lat: 50.12, lon: 8.69 });
if (d < 500 || d > 3000) throw new Error("distance off " + d);
console.log("unit ok", open.status, closed.status, Math.round(d));
