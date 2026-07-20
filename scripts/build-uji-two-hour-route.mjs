import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const standardPath = resolve(projectRoot, "src/data/routeGeometries/sound-euphonium-uji-half-day.geojson");
const firstConnectionPath = resolve(projectRoot, "src/data/route-geometries/uji-jr-station-to-uji-shrine-foot.geojson");
const secondConnectionPath = resolve(projectRoot, "src/data/route-geometries/uji-ujigami-to-uji-bridge-foot.geojson");
const outputPath = resolve(projectRoot, "src/data/route-geometries/uji-sound-euphonium-two-hour.geojson");
const ujiShrineIndex = 116;
const ujigamiIndex = 127;
const ujiBridgeIndex = 237;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const sameCoordinate = (left, right) => left[0] === right[0] && left[1] === right[1];
const coordinatesFrom = (document) => document.features?.[0]?.geometry?.coordinates;

const standard = JSON.parse(await readFile(standardPath, "utf8"));
const firstConnection = JSON.parse(await readFile(firstConnectionPath, "utf8"));
const secondConnection = JSON.parse(await readFile(secondConnectionPath, "utf8"));
const standardCoordinates = coordinatesFrom(standard);
const firstConnectionCoordinates = coordinatesFrom(firstConnection);
const secondConnectionCoordinates = coordinatesFrom(secondConnection);

assert(standard.features?.[0]?.geometry?.type === "LineString", "Standard route must be a LineString.");
assert(firstConnection.features?.[0]?.geometry?.type === "LineString", "JR-to-Uji Shrine connection must be a LineString.");
assert(secondConnection.features?.[0]?.geometry?.type === "LineString", "Ujigami-to-Uji Bridge connection must be a LineString.");
assert(standardCoordinates.length === 253, "Standard coordinate count changed; recheck split indices.");
assert(firstConnectionCoordinates.length === 79, "JR-to-Uji Shrine coordinate count changed.");
assert(sameCoordinate(firstConnectionCoordinates.at(-1), standardCoordinates[ujiShrineIndex]), "First connection does not match standard index 116.");
assert(sameCoordinate(standardCoordinates[ujigamiIndex], secondConnectionCoordinates[0]), "Second connection does not match standard index 127.");
assert(sameCoordinate(secondConnectionCoordinates.at(-1), standardCoordinates[ujiBridgeIndex]), "Second connection does not match standard index 237.");

const coordinates = [
  ...firstConnectionCoordinates,
  ...standardCoordinates.slice(ujiShrineIndex + 1, ujigamiIndex + 1),
  ...secondConnectionCoordinates.slice(1),
  ...standardCoordinates.slice(ujiBridgeIndex + 1),
];
assert(coordinates.every((coordinate, index) => index === 0 || !sameCoordinate(coordinate, coordinates[index - 1])), "Output contains consecutive duplicate coordinates.");

const output = {
  type: "FeatureCollection",
  features: [{
    type: "Feature",
    properties: {
      id: "uji-sound-euphonium-two-hour",
      variant: "two-hour-core",
      sourceRoute: "sound-euphonium-uji-half-day.geojson",
      connectionSources: [
        "uji-jr-station-to-uji-shrine-foot.geojson",
        "uji-ujigami-to-uji-bridge-foot.geojson",
      ],
      generatedAt: "2026-07-20",
      fieldVerified: false,
      routingProfile: "foot",
      estimatedWalkingMinutes: 29,
      estimatedStayMinutes: 65,
      estimatedTotalMinutes: 94,
      estimateNote: "徒歩29分は保存済み徒歩ルーティングと既存案内の合計、滞在65分は対象5地点の既存設定の合計。現地実測値ではありません。",
    },
    geometry: { type: "LineString", coordinates },
  }],
};

await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Saved ${outputPath} with ${coordinates.length} coordinates.`);
