"use client";
import { useEffect, useMemo, useState } from "react";

const AUDIENCES = [
  { id: "solo", label: "Solo date", hint: "One person, no assumed partner", cta: "Plan My Date" },
  { id: "couple", label: "Date night", hint: "Two, paced for a real evening", cta: "Plan Our Date" },
  { id: "friends", label: "Friends", hint: "Social, sized to the group", cta: "Plan Our Outing" },
  { id: "family", label: "Family", hint: "Age-aware, not a date with a new label", cta: "Plan Family Time" }
];
const VIBES = ["easy", "playful", "romantic", "food-first", "outdoors", "culture", "active", "low-key"];

function money(currency, n) {
  const sym = currency?.symbol || "€";
  return `${sym}${Math.round(n)}`;
}

function loadStore() {
  try { return JSON.parse(localStorage.getItem("dne") || "{}"); } catch { return {}; }
}

export default function Home() {
  const [audience, setAudience] = useState("couple");
  const [q, setQ] = useState("Frankfurt");
  const [hits, setHits] = useState([]);
  const [place, setPlace] = useState(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("18:30");
  const [durationMin, setDurationMin] = useState(180);
  const [budget, setBudget] = useState(90);
  const [vibes, setVibes] = useState(["easy", "food-first"]);
  const [setting, setSetting] = useState("mixed");
  const [partySize, setPartySize] = useState(4);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(2);
  const [childAges, setChildAges] = useState("6, 11");
  const [occasion, setOccasion] = useState("");
  const [diet, setDiet] = useState("");
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("plans");
  const [discover, setDiscover] = useState(null);
  const [saved, setSaved] = useState([]);
  const [exclude, setExclude] = useState([]);
  const [openPlan, setOpenPlan] = useState(null);

  useEffect(() => { setSaved(loadStore().saved || []); }, []);
  const cta = AUDIENCES.find((a) => a.id === audience).cta;

  async function searchLoc(value) {
    setQ(value);
    if (value.trim().length < 3) return;
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`);
    const data = await res.json();
    setHits(data.results || []);
  }

  async function useHere() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude, lon = pos.coords.longitude;
      setPlace({ label: "Current location", lat, lon, city: "", country: "" });
      setQ("Current location");
      setHits([]);
    });
  }

  function tonight() {
    const now = new Date();
    setDate(now.toISOString().slice(0, 10));
    const mins = now.getHours() * 60 + now.getMinutes() + 30;
    setTime(`${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`);
    setDurationMin(150);
  }

  function surprise() {
    setVibes(VIBES.sort(() => Math.random() - 0.5).slice(0, 3));
    setSetting(["mixed", "indoor", "outdoor"][Math.floor(Math.random() * 3)]);
  }

  async function plan(extra = {}) {
    if (!place) { setError("Choose a city or starting point."); return; }
    setError("");
    setBusy("Checking places, hours and weather…");
    setTab("plans");
    const ages = childAges.split(/[^0-9]+/).filter(Boolean).map(Number);
    const body = {
      audience, lat: place.lat, lon: place.lon, city: place.city, country: place.country,
      date, time, durationMin, budget, vibes, setting, partySize, adults, children, childAges: ages,
      excludeIds: exclude, ...extra
    };
    const res = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    setBusy("");
    if (!res.ok) { setError(data.error || "Planning failed"); return; }
    setResult(data);
    setOpenPlan(data.plans?.[0] || null);
    if (!data.plans?.length) setError(data.note || "No valid plan survived checks. Relax filters or widen the area.");
  }

  async function loadDiscover(page = 1, category = "", query = "") {
    if (!place) return;
    setBusy("Loading real venues…");
    const res = await fetch(`/api/discover?lat=${place.lat}&lon=${place.lon}&page=${page}&category=${category}&q=${encodeURIComponent(query)}&audience=${audience}`);
    const data = await res.json();
    setBusy("");
    setDiscover({ ...data, category, query, page });
    setTab("explore");
  }

  function savePlan(p) {
    const store = loadStore();
    const next = [{ ...p, savedAt: Date.now(), city: place?.city }, ...(store.saved || [])].slice(0, 20);
    localStorage.setItem("dne", JSON.stringify({ ...store, saved: next, likes: store.likes || [] }));
    setSaved(next);
  }

  function share(p) {
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify(p)))).slice(0, 1800);
    const url = `${location.origin}/?share=1`;
    navigator.clipboard?.writeText(`${p.title}\n${p.stops.map((s) => s.name).join(" → ")}\n${url}`);
    alert("Itinerary copied. Full plans stay on this device; the copied text is the share card.");
  }

  const mapSrc = useMemo(() => {
    if (!openPlan) return "";
    const markers = openPlan.stops.map((s) => `${s.lat},${s.lon}`).join("~");
    const first = openPlan.stops[0];
    return `https://www.openstreetmap.org/export/embed.html?bbox=${first.lon-0.05}%2C${first.lat-0.04}%2C${first.lon+0.05}%2C${first.lat+0.04}&layer=mapnik&marker=${first.lat}%2C${first.lon}`;
  }, [openPlan]);

  return (
    <main className="app">
      <header className="top">
        <div>
          <p className="mark">Date Night <span>Escape</span></p>
          <p className="sub">A real outing in about a minute. Solo, couples, friends and families each get their own plan, not a relabelled date.</p>
        </div>
      </header>
      <section className="audiences" aria-label="Who is going">
        {AUDIENCES.map((a) => (
          <button key={a.id} className={`aud ${audience === a.id ? "on" : ""}`} onClick={() => setAudience(a.id)}>
            <strong>{a.label}</strong><small>{a.hint}</small>
          </button>
        ))}
      </section>
      <section className="panel">
        <label>City or starting point</label>
        <input value={q} onChange={(e) => searchLoc(e.target.value)} placeholder="Gelnhausen, Berlin, a neighbourhood" />
        <div className="chips" style={{ marginTop: 8 }}>
          <button className="ghost" onClick={useHere}>Use my location</button>
          {["Gelnhausen", "Frankfurt", "Berlin", "Paris", "London"].map((c) => <button key={c} className="chip" onClick={() => searchLoc(c)}>{c}</button>)}
        </div>
        {hits.slice(0, 4).map((h) => (
          <button key={h.sourceId} className="suggest" onClick={() => { setPlace(h); setQ(h.city || h.label); setHits([]); }}>{h.label}</button>
        ))}
        {place && <p className="meta">Starting at {place.city || place.label}. Plans stay near this point.</p>}
        <div className="row">
          <div><label>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><label>Start time</label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
        </div>
        <div className="row">
          <div><label>Duration (minutes)</label><input type="number" min="60" max="480" value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} /></div>
          <div><label>Budget for the whole party</label><input type="number" min="0" value={budget} onChange={(e) => setBudget(Number(e.target.value))} /></div>
        </div>
        {audience === "friends" && <><label>Group size</label><input type="number" min="2" max="12" value={partySize} onChange={(e) => setPartySize(Number(e.target.value))} /></>}
        {audience === "family" && <div className="row">
          <div><label>Adults</label><input type="number" min="1" value={adults} onChange={(e) => setAdults(Number(e.target.value))} /></div>
          <div><label>Children</label><input type="number" min="0" value={children} onChange={(e) => setChildren(Number(e.target.value))} /></div>
          <div><label>Children's ages</label><input value={childAges} onChange={(e) => setChildAges(e.target.value)} placeholder="4, 13" /></div>
        </div>}
        {audience === "couple" && <><label>Occasion, optional</label><input value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder="anniversary, first date, nothing special" /></>}
        <label>Food notes, optional</label>
        <input value={diet} onChange={(e) => setDiet(e.target.value)} placeholder="vegetarian, no nuts — we will not invent menus" />
        <label>Vibes</label>
        <div className="chips">{VIBES.map((v) => <button key={v} className={`chip ${vibes.includes(v) ? "on" : ""}`} onClick={() => setVibes(vibes.includes(v) ? vibes.filter((x) => x !== v) : [...vibes, v])}>{v}</button>)}</div>
        <label>Setting</label>
        <select value={setting} onChange={(e) => setSetting(e.target.value)}><option value="mixed">Mixed</option><option value="indoor">Indoor</option><option value="outdoor">Outdoor</option></select>
        <div className="chips" style={{ marginTop: 10 }}>
          <button className="ghost" onClick={tonight}>Tonight</button>
          <button className="ghost" onClick={surprise}>Surprise {audience === "solo" ? "me" : "us"}</button>
        </div>
        <button className="primary" onClick={() => plan()}>{cta}</button>
        {diet && <p className="meta">Dietary note saved on the plan only as a reminder. Menus are not verified.</p>}
        {occasion && <p className="meta">Occasion: {occasion}. It changes tone, not invented reservations.</p>}
      </section>
      {busy && <div className="progress" aria-live="polite"><i /></div>}
      {busy && <p>{busy}</p>}
      {error && <p className="warn">{error}</p>}
      <div className="tabs">
        <button className="ghost" onClick={() => setTab("plans")}>Plans</button>
        <button className="ghost" onClick={() => loadDiscover(1)}>Explore venues</button>
        <button className="ghost" onClick={() => setTab("saved")}>Saved</button>
      </div>
      {tab === "plans" && result && <>
        <p className="meta">{result.note} Inventory considered: {result.inventory}. Weather: {result.weather?.summary || "unavailable"} {result.weather?.tempC != null ? `${result.weather.tempC}°C` : ""}.</p>
        <div className="plans">
          {result.plans.map((p) => (
            <article key={p.id} className="plan">
              <img src={p.stops[0]?.image?.url} alt={p.stops[0]?.image?.label || ""} />
              <div className="body">
                <div className="kicker">{p.kind}</div>
                <h2>{p.title}</h2>
                <p>{p.vibe}</p>
                <p className="meta">{p.totalMin} min · travel {p.travelMin} min · {p.indoorSplit} · {money(p.cost.currency, p.cost.low)}–{money(p.cost.currency, p.cost.high)} total · {money(p.cost.currency, p.cost.perLow)}–{money(p.cost.currency, p.cost.perHigh)} / person</p>
                {p.stops.map((s) => <div key={s.placeId} className="stop"><strong>{s.name}</strong> · {s.categoryLabel}<br /><span className="meta">{new Date(s.arrive).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {s.stayMin} min · {s.travelMin} min travel ({s.travelSource}) · hours: {s.hours.status}</span><br />{s.address || "Address incomplete"} · <a href={s.sourceUrl} target="_blank">source</a> {s.website && <a href={s.website} target="_blank">official</a>}<p className="meta">{s.image.label}. {s.booking.note}</p>{s.restrictions.map((r) => <p key={r} className="warn">{r}</p>)}</div>)}
                {p.warnings.map((w) => <p key={w} className="warn">{w}</p>)}
                <div className="chips">
                  <button className="ghost" onClick={() => setOpenPlan(p)}>Map</button>
                  <button className="ghost" onClick={() => savePlan(p)}>Save</button>
                  <button className="ghost" onClick={() => share(p)}>Share text</button>
                  <button className="ghost" onClick={() => { setExclude([...exclude, ...p.stops.map((s) => s.placeId)]); plan({ excludeIds: [...exclude, ...p.stops.map((s) => s.placeId)] }); }}>Another set</button>
                  <button className="ghost" onClick={() => plan({ durationMin: Math.max(60, durationMin - 40), excludeIds: p.stops.slice(1).map((s) => s.placeId) })}>Rescue this plan</button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {openPlan && <iframe className="map" title="Route map" src={mapSrc} />}
      </>}
      {tab === "explore" && discover && <section>
        <input placeholder="Search name, activity, neighbourhood" defaultValue={discover.query} onKeyDown={(e) => { if (e.key === "Enter") loadDiscover(1, discover.category, e.currentTarget.value); }} />
        <div className="chips" style={{ margin: "8px 0" }}>{(discover.categories || []).map((c) => <button key={c.id} className={`chip ${discover.category === c.id ? "on" : ""}`} onClick={() => loadDiscover(1, c.id, discover.query)}>{c.label}</button>)}</div>
        <p className="meta">{discover.total || 0} sourced venues in this radius. {discover.error || ""}</p>
        <div className="cards">{(discover.places || []).map((v) => <article key={v.id} className="venue"><img src={v.image.url} alt={v.image.label} /><div><strong>{v.name}</strong><p className="meta">{v.categoryLabel} · {(v.distanceM/1000).toFixed(1)} km · {v.openingHours || "hours unknown"}</p><button className="ghost" onClick={() => plan({ anchorId: v.id })}>Build a plan around this</button> <a href={v.sourceUrl}>OSM</a></div></article>)}</div>
        <button className="ghost" onClick={() => loadDiscover((discover.page || 1) + 1, discover.category, discover.query)}>Load more</button>
      </section>}
      {tab === "saved" && <section>{saved.length === 0 && <p>No saved plans on this device yet.</p>}{saved.map((p) => <article key={p.id + p.savedAt} className="plan"><div className="body"><h3>{p.title}</h3><p className="meta">{p.stops.map((s) => s.name).join(" → ")}</p></div></article>)}</section>}
    </main>
  );
}
