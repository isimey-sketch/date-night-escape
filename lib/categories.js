export const CATEGORIES = [
  { id: "restaurant", label: "Restaurants", group: "food", indoor: "indoor", est: [24, 46], osm: [["amenity", "restaurant"]], audiences: ["solo", "couple", "friends", "family"] },
  { id: "cafe", label: "Cafés", group: "food", indoor: "indoor", est: [8, 18], osm: [["amenity", "cafe"]], audiences: ["solo", "couple", "friends", "family"] },
  { id: "dessert", label: "Dessert", group: "food", indoor: "mixed", est: [5, 12], osm: [["amenity", "ice_cream"], ["shop", "pastry"], ["shop", "ice_cream"]], audiences: ["solo", "couple", "friends", "family"] },
  { id: "fast_food", label: "Quick bites", group: "food", indoor: "indoor", est: [8, 16], osm: [["amenity", "fast_food"]], audiences: ["solo", "friends", "family"] },
  { id: "bar", label: "Bars", group: "food", indoor: "indoor", est: [12, 28], adult: true, osm: [["amenity", "bar"], ["amenity", "pub"]], audiences: ["couple", "friends"] },
  { id: "bowling", label: "Bowling", group: "activity", indoor: "indoor", est: [12, 26], osm: [["leisure", "bowling_alley"]], audiences: ["couple", "friends", "family", "solo"] },
  { id: "minigolf", label: "Mini golf", group: "activity", indoor: "mixed", est: [8, 16], osm: [["leisure", "miniature_golf"]], audiences: ["couple", "friends", "family"] },
  { id: "arcade", label: "Arcades", group: "activity", indoor: "indoor", est: [10, 22], osm: [["leisure", "amusement_arcade"]], audiences: ["friends", "family", "couple"] },
  { id: "escape", label: "Escape rooms", group: "activity", indoor: "indoor", est: [25, 38], team: true, osm: [["leisure", "escape_game"]], audiences: ["friends", "couple", "family"] },
  { id: "museum", label: "Museums", group: "culture", indoor: "indoor", est: [8, 18], osm: [["tourism", "museum"]], audiences: ["solo", "couple", "friends", "family"] },
  { id: "exhibition", label: "Exhibitions", group: "culture", indoor: "indoor", est: [8, 16], osm: [["tourism", "gallery"]], audiences: ["solo", "couple", "friends"] },
  { id: "workshop", label: "Creative spaces", group: "culture", indoor: "indoor", est: [12, 30], osm: [["amenity", "arts_centre"]], audiences: ["solo", "couple", "friends", "family"] },
  { id: "climbing", label: "Climbing", group: "activity", indoor: "indoor", est: [14, 28], osm: [["sport", "climbing"]], audiences: ["solo", "couple", "friends", "family"] },
  { id: "park", label: "Parks", group: "outdoor", indoor: "outdoor", est: [0, 0], osm: [["leisure", "park"]], audiences: ["solo", "couple", "friends", "family"] },
  { id: "playground", label: "Playgrounds", group: "outdoor", indoor: "outdoor", est: [0, 0], family: true, osm: [["leisure", "playground"]], audiences: ["family"] },
  { id: "viewpoint", label: "Viewpoints", group: "outdoor", indoor: "outdoor", est: [0, 8], osm: [["tourism", "viewpoint"]], audiences: ["solo", "couple", "friends", "family"] },
  { id: "zoo", label: "Zoos", group: "culture", indoor: "mixed", est: [12, 24], osm: [["tourism", "zoo"]], audiences: ["family", "couple", "friends"] },
  { id: "aquarium", label: "Aquariums", group: "culture", indoor: "indoor", est: [14, 26], osm: [["tourism", "aquarium"]], audiences: ["family", "couple", "friends"] },
  { id: "indoor_play", label: "Indoor play", group: "activity", indoor: "indoor", est: [8, 18], family: true, osm: [["leisure", "indoor_play"]], audiences: ["family"] },
  { id: "cinema", label: "Cinemas", group: "culture", indoor: "indoor", est: [11, 18], showingUnknown: true, osm: [["amenity", "cinema"]], audiences: ["solo", "couple", "friends", "family"] },
  { id: "theatre", label: "Theatres", group: "culture", indoor: "indoor", est: [18, 48], showingUnknown: true, osm: [["amenity", "theatre"]], audiences: ["solo", "couple", "friends"] }
];

export function categoryById(id) {
  return CATEGORIES.find((c) => c.id === id);
}

export const AUDIENCES = {
  solo: { label: "Solo date", cta: "Plan My Date", partyDefault: 1 },
  couple: { label: "Date night", cta: "Plan Our Date", partyDefault: 2 },
  friends: { label: "Friends", cta: "Plan Our Outing", partyDefault: 4 },
  family: { label: "Family", cta: "Plan Family Time", partyDefault: 4 }
};
