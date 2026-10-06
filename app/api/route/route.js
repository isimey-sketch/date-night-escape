import { route } from "../../../lib/providers";

export async function POST(req) {
  const body = await req.json();
  try {
    const result = await route(body.points || []);
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 502 });
  }
}
