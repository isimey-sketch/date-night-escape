# Date Night Escape

Standalone outing planner. Not part of Indoor Escape.

## Architecture
- Next.js app router UI, no login.
- Providers behind `lib/providers.js`: Nominatim geocoding, Overpass places, Open-Meteo weather, OSRM walking routes. Haversine fallback if routing fails.
- `lib/places.js` normalizes OSM elements to a stable `osm:type:id`, coordinates, source link, provenance, and either a Wikimedia file linked on that element or a labelled category image.
- `lib/planner.js` scores and composes EASY / FUN / WOW, then rejects closed, duplicate, or over-long plans.
- Audience rules live in category allow-lists. Family never receives bars. Solo never receives escape rooms. Costs are category estimates times party size. Child discounts are not applied.

## Ranking
Fit to vibe and audience, distance, published hours, weather, budget headroom. OSM has no popularity score, so popularity cannot dominate.

## Fallback
Second Overpass mirror, haversine if OSRM fails, explicit empty state if supply is thin.

## Limits
No live reservations, cinema showtimes, or ticket stock. Hours only when OSM publishes them. Prices are estimates.
