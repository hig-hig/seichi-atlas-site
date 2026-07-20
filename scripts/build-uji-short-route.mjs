import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const standardPath = resolve(projectRoot, "src/data/routeGeometries/sound-euphonium-uji-half-day.geojson");
const connectionPath = resolve(projectRoot, "src/data/route-geometries/uji-ujigami-to-uji-bridge-foot.geojson");
const outputPath = resolve(projectRoot, "src/data/route-geometries/uji-sound-euphonium-short.geojson");
const startIndex = 127;
const endIndex = 237;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const sameCoordinate = (left, right) => left[0] === right[0] && left[1] === right[1];

const standard = JSON.parse(await readFile(standardPath, "utf8"));
const connection = JSON.parse(await readFile(connectionPath, "utf8"));
const standardCoordinates = standard.features?.[0]?.geometry?.coordinates;
const connectionCoordinates = connection.features?.[0]?.geometry?.coordinates;

assert(standard.features?.[0]?.geometry?.type === "LineString", "Standard route must be a LineString.");
assert(connection.features?.[0]?.geometry?.type === "LineString", "Connection must be a LineString.");
assert(standardCoordinates.length === 253, "Standard route coordinate count changed; recheck split indices.");
assert(connectionCoordinates.length === 38, "Connection coordinate count changed; recheck the source file.");
assert(sameCoordinate(standardCoordinates[startIndex], connectionCoordinates[0]), "Connection start does not match standard index 127.");
assert(sameCoordinate(standardCoordinates[endIndex], connectionCoordinates.at(-1)), "Connection end does not match standard index 237.");

const coordinates = [
  ...standardCoordinates.slice(0, startIndex + 1),
  ...connectionCoordinates.slice(1, -1),
  ...standardCoordinates.slice(endIndex),
];
assert(coordinates.every((coordinate, index) => index === 0 || !sameCoordinate(coordinate, coordinates[index - 1])), "Output contains consecutive duplicate coordinates.");

const output = {
  type: "FeatureCollection",
  features: [{
    type: "Feature",
    properties: {
      id: "uji-sound-euphonium-short",
      variant: "short-without-daikichiyama",
      sourceRoute: "sound-euphonium-uji-half-day.geojson",
      connectionSource: "uji-ujigami-to-uji-bridge-foot.geojson",
      generatedAt: "2026-07-20",
      fieldVerified: false,
      routingProfile: "foot",
      connectionDistanceMeters: 651.5,
      connectionDurationSeconds: 521,
    },
    geometry: { type: "LineString", coordinates },
  }],
};

await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Saved ${outputPath} with ${coordinates.length} coordinates.`);
