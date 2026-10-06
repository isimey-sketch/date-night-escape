const DAY = { su: 0, mo: 1, tu: 2, we: 3, th: 4, fr: 5, sa: 6 };

export function parseHours(raw) {
  if (!raw) return { known: false, raw: null };
  const text = String(raw).trim();
  if (/24\s*\/\s*7|24\/7/i.test(text)) return { known: true, always: true, raw: text, ranges: [] };
  const ranges = [];
  const parts = text.split(";").map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    const m = part.match(/^([A-Za-z]{2}(?:\s*-\s*[A-Za-z]{2})?(?:\s*,\s*[A-Za-z]{2}(?:\s*-\s*[A-Za-z]{2})?)*)\s+(.+)$/);
    if (!m) continue;
    const days = expandDays(m[1]);
    const times = m[2].split(",").map((s) => s.trim());
    for (const slot of times) {
      const tm = slot.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
      if (!tm) continue;
      const open = Number(tm[1]) * 60 + Number(tm[2]);
      let close = Number(tm[3]) * 60 + Number(tm[4]);
      if (close <= open) close += 24 * 60;
      for (const d of days) ranges.push({ day: d, open, close });
    }
  }
  return { known: ranges.length > 0, always: false, raw: text, ranges };
}

function expandDays(spec) {
  const out = new Set();
  for (const chunk of spec.split(",")) {
    const bit = chunk.trim().toLowerCase();
    const span = bit.match(/^([a-z]{2})\s*-\s*([a-z]{2})$/);
    if (span && DAY[span[1]] != null && DAY[span[2]] != null) {
      let d = DAY[span[1]];
      const end = DAY[span[2]];
      for (let i = 0; i < 7; i++) {
        out.add(d);
        if (d === end) break;
        d = (d + 1) % 7;
      }
    } else if (DAY[bit.slice(0, 2)] != null) out.add(DAY[bit.slice(0, 2)]);
  }
  return [...out];
}

export function hoursStatus(parsed, date, durationMin) {
  if (!parsed?.known) return { status: "unknown", note: "Opening hours are not in the source data. Confirm before you go." };
  if (parsed.always) return { status: "open", note: "Listed as 24/7." };
  const start = date.getHours() * 60 + date.getMinutes();
  const end = start + durationMin;
  const day = date.getDay();
  const hit = parsed.ranges.find((r) => r.day === day && start >= r.open && end <= r.close);
  if (hit) return { status: "open", note: `Listed open across this stop (${parsed.raw}).` };
  const sameDay = parsed.ranges.some((r) => r.day === day);
  if (!sameDay) return { status: "closed", note: `Source hours do not list this weekday (${parsed.raw}).` };
  return { status: "closed", note: `Source hours do not cover this stay (${parsed.raw}).` };
}
