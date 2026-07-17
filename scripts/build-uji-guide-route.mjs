import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { soundEuphoniumUjiHalfDay } from "../src/data/routes.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDataPath = resolve(projectRoot, "src/data/publicData.json");
const outputPath = resolve(
  projectRoot,
  "src/data/routeGeometries/sound-euphonium-uji-half-day.geojson",
);
const endpoint = "https://routing.openstreetmap.de/routed-foot/route/v1/driving/";
const userAgent = "SeichiAtlasRouteBuilder/1.0 (https://seichi-atlas-site.vercel.app; static one-off route generation)";
const expectedOptionSlug = "uji-river-riverside";
const requiredMountainSlug = "daikichiyama-observation-deck";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function haversineMeters([lngA, latA], [lngB, latB]) {
  const radius = 6371000;
  const toRadians = (value) => value * Math.PI / 180;
  const lat1 = toRadians(latA);
  const lat2 = toRadians(latB);
  const latDelta = lat2 - lat1;
  const lngDelta = toRadians(lngB - lngA);
  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDelta / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointToSegmentMeters(point, start, end) {
  const referenceLat = point[1] * Math.PI / 180;
  const metersPerLng = 111320 * Math.cos(referenceLat);
  const metersPerLat = 110540;
  const toLocal = ([lng, lat]) => [
    (lng - point[0]) * metersPerLng,
    (lat - point[1]) * metersPerLat,
  ];
  const [startX, startY] = toLocal(start);
  const [endX, endY] = toLocal(end);
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const lengthSquared = deltaX ** 2 + deltaY ** 2;
  if (lengthSquared === 0) return Math.hypot(startX, startY);
  const projection = Math.max(0, Math.min(1, -(startX * deltaX + startY * deltaY) / lengthSquared));
  return Math.hypot(startX + projection * deltaX, startY + projection * deltaY);
}

function distanceToLineMeters(point, lineCoordinates) {
  let minimum = Number.POSITIVE_INFINITY;
  for (let index = 1; index < lineCoordinates.length; index += 1) {
    minimum = Math.min(
      minimum,
      pointToSegmentMeters(point, lineCoordinates[index - 1], lineCoordinates[index]),
    );
  }
  return minimum;
}

function validateGeometry({ feature, waypoints }) {
  assert(feature.type === "Feature", "Output must be a GeoJSON Feature.");
  assert(feature.geometry?.type === "LineString", "Route geometry must be a LineString.");
  const coordinates = feature.geometry.coordinates;
  assert(Array.isArray(coordinates) && coordinates.length >= 45, "Route LineString has too few coordinates.");
  assert(
    coordinates.every((coordinate) => Array.isArray(coordinate)
      && coordinate.length >= 2
      && Number.isFinite(coordinate[0])
      && Number.isFinite(coordinate[1])),
    "Route contains a non-finite coordinate.",
  );
  assert(
    feature.properties.distanceMeters >= 3500 && feature.properties.distanceMeters <= 8000,
    `Route distance is outside the expected range: ${feature.properties.distanceMeters}m`,
  );
  assert(haversineMeters(coordinates[0], waypoints[0].coordinate) <= 100, "Route start is too far from the first spot.");
  assert(haversineMeters(coordinates.at(-1), waypoints.at(-1).coordinate) <= 100, "Route end is too far from the final spot.");

  let longestDuplicateRun = 1;
  let currentDuplicateRun = 1;
  for (let index = 1; index < coordinates.length; index += 1) {
    if (coordinates[index][0] === coordinates[index - 1][0]
      && coordinates[index][1] === coordinates[index - 1][1]) {
      currentDuplicateRun += 1;
      longestDuplicateRun = Math.max(longestDuplicateRun, currentDuplicateRun);
    } else {
      currentDuplicateRun = 1;
    }
  }
  assert(longestDuplicateRun <= 3, `Route has an abnormal duplicate coordinate run: ${longestDuplicateRun}`);
  assert(feature.properties.waypointSlugs.includes(requiredMountainSlug), "Daikichiyama waypoint is missing.");
  assert(!feature.properties.waypointSlugs.includes(expectedOptionSlug), "The riverside option must not be included.");

  const waypointDistances = waypoints.map((waypoint) => ({
    slug: waypoint.slug,
    distanceMeters: distanceToLineMeters(waypoint.coordinate, coordinates),
  }));
  waypointDistances.forEach(({ slug, distanceMeters }) => {
    assert(distanceMeters <= 120, `${slug} is too far from the route line: ${distanceMeters.toFixed(1)}m`);
  });
  const mountainDistance = waypointDistances.find(({ slug }) => slug === requiredMountainSlug)?.distanceMeters;
  assert(Number.isFinite(mountainDistance) && mountainDistance <= 120, "Route does not pass sufficiently close to Daikichiyama.");
  return { coordinateCount: coordinates.length, longestDuplicateRun, waypointDistances };
}

const publicData = JSON.parse(await readFile(publicDataPath, "utf8"));
const spotBySlug = new Map((publicData.spots ?? []).map((spot) => [spot.slug, spot]));
const waypointSlugs = soundEuphoniumUjiHalfDay.steps.map((step) => step.slug);
assert(waypointSlugs.length === 9, `Expected 9 route waypoints, received ${waypointSlugs.length}.`);
assert(new Set(waypointSlugs).size === waypointSlugs.length, "Route waypoint slugs must be unique.");
assert(!waypointSlugs.includes(expectedOptionSlug), "The riverside option must not be requested.");

const waypoints = waypointSlugs.map((slug) => {
  const spot = spotBySlug.get(slug);
  assert(spot, `Spot not found: ${slug}`);
  const lat = Number(spot.lat);
  const lng = Number(spot.lng);
  assert(Number.isFinite(lat) && Number.isFinite(lng), `Invalid coordinate for ${slug}`);
  return { slug, coordinate: [lng, lat] };
});

const coordinatePath = waypoints.map(({ coordinate }) => coordinate.join(",")).join(";");
const requestUrl = new URL(`${endpoint}${coordinatePath}`);
requestUrl.searchParams.set("overview", "full");
requestUrl.searchParams.set("geometries", "geojson");
requestUrl.searchParams.set("steps", "true");

console.log(`Requesting one walking route with ${waypoints.length} ordered waypoints...`);
const response = await fetch(requestUrl, {
  headers: {
    Accept: "application/json",
    "User-Agent": userAgent,
  },
});
assert(response.ok, `Routing request failed: ${response.status} ${response.statusText}`);
const result = await response.json();
assert(result.code === "Ok", `Routing service returned: ${result.code ?? "unknown code"}`);
assert(Array.isArray(result.routes) && result.routes.length > 0, "Routing response contains no route.");
const selectedRoute = result.routes[0];
assert(selectedRoute.geometry?.type === "LineString", "Routing response does not contain GeoJSON LineString geometry.");

const feature = {
  type: "Feature",
  properties: {
    profile: "walking",
    distanceMeters: Math.round(selectedRoute.distance),
    durationSeconds: Math.round(selectedRoute.duration),
    waypointSlugs,
    sourceName: "FOSSGIS OSRM foot routing / OpenStreetMap contributors",
  },
  geometry: selectedRoute.geometry,
};

const validation = validateGeometry({ feature, waypoints });
const output = { type: "FeatureCollection", features: [feature] };
JSON.parse(JSON.stringify(output));
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

console.log(`Saved: ${outputPath}`);
console.log(`Distance: ${feature.properties.distanceMeters} m`);
console.log(`Estimated duration: ${feature.properties.durationSeconds} s (${(feature.properties.durationSeconds / 60).toFixed(1)} min)`);
console.log(`LineString coordinates: ${validation.coordinateCount}`);
console.log(`Longest consecutive duplicate run: ${validation.longestDuplicateRun}`);
console.log("Waypoint distance to route line:");
validation.waypointDistances.forEach(({ slug, distanceMeters }) => {
  console.log(`  ${slug}: ${distanceMeters.toFixed(1)} m`);
});
