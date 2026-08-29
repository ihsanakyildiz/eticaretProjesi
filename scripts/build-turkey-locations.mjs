import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://raw.githubusercontent.com/ubeydeozdmr/turkiye-api/main/datasets";

async function loadJson(file) {
  const response = await fetch(`${BASE}/${file}`);
  if (!response.ok) {
    throw new Error(`${file} indirilemedi: ${response.status}`);
  }
  return response.json();
}

function sortTr(left, right) {
  return left.localeCompare(right, "tr");
}

const [provinces, districts, neighborhoods] = await Promise.all([
  loadJson("provinces.json"),
  loadJson("districts.json"),
  loadJson("neighborhoods.json"),
]);

const provinceById = new Map(provinces.map((item) => [item.id, item.name]));
const districtById = new Map(districts.map((item) => [item.id, item]));

/** @type {Record<string, Record<string, string[]>>} */
const tree = {};

for (const province of provinces) {
  tree[province.name] = {};
}

for (const district of districts) {
  const provinceName = provinceById.get(district.provinceId);
  if (!provinceName) continue;
  tree[provinceName] ??= {};
  tree[provinceName][district.name] ??= [];
}

for (const neighborhood of neighborhoods) {
  const district = districtById.get(neighborhood.districtId);
  if (!district) continue;
  const provinceName = provinceById.get(district.provinceId);
  if (!provinceName) continue;
  tree[provinceName] ??= {};
  tree[provinceName][district.name] ??= [];
  tree[provinceName][district.name].push(neighborhood.name);
}

for (const provinceName of Object.keys(tree)) {
  for (const districtName of Object.keys(tree[provinceName])) {
    tree[provinceName][districtName] = Array.from(new Set(tree[provinceName][districtName])).sort(sortTr);
  }
}

const ordered = {};
for (const provinceName of Object.keys(tree).sort(sortTr)) {
  ordered[provinceName] = {};
  for (const districtName of Object.keys(tree[provinceName]).sort(sortTr)) {
    ordered[provinceName][districtName] = tree[provinceName][districtName];
  }
}

const outPath = join(ROOT, "src", "data", "turkey-locations.json");
writeFileSync(outPath, `${JSON.stringify(ordered)}\n`);

const provinceCount = Object.keys(ordered).length;
const districtCount = Object.values(ordered).reduce((sum, districtsByName) => sum + Object.keys(districtsByName).length, 0);
const neighborhoodCount = Object.values(ordered).reduce(
  (sum, districtsByName) =>
    sum + Object.values(districtsByName).reduce((inner, names) => inner + names.length, 0),
  0,
);

console.log(`wrote ${outPath}`);
console.log(`${provinceCount} il, ${districtCount} ilçe, ${neighborhoodCount} mahalle`);
