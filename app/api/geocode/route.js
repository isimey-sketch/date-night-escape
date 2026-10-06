import { geocode } from "../../../lib/providers";

export async function GET(req) {
  const q = new URL(req.url).searchParams.get("q") || "";
  if (q.trim().length < 2) return Response.json({ results: [] });
  try {
    const results = await geocode(q);
    return Response.json({ results, source: "nominatim" });
  } catch (err) {
    return Response.json({ results: [], error: err.message }, { status: 502 });
  }
}
