// Daily refresh for data/model-comparison.json.
//
// 1. Refreshes price + context for every tracked model from the public
//    OpenRouter API (no key needed), matched via each entry's "or" id.
// 2. Detects newly released frontier models from major vendors and appends
//    them with swe: null ("score pending" — shown in the table, excluded
//    from the scatter until a score is curated manually).
//
// Run by .github/workflows/models.yml daily at 00:00 UTC (09:00 KST).
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DATA_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
  "model-comparison.json"
);

const FRONTIER_VENDORS = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  "x-ai": "xAI",
  deepseek: "DeepSeek",
  moonshotai: "Moonshot",
  "z-ai": "Z.ai",
  qwen: "Qwen",
  mistralai: "Mistral",
  "meta-llama": "Meta",
  minimax: "MiniMax",
};

// Variants that are never the flagship coding model.
// Note: one-off duplicates (e.g. OpenAI's "-pro" effort variants of the same
// tier) go into data JSON's "ignoredIds" instead of this pattern, so genuine
// future flagships like "gemini-4-pro" are still picked up.
const EXCLUDE = /(image|audio|video|lite|flash|mini|nano|fast|distill|exp$|preview.*customtools|chat-latest|build|-\d{8}$|:free)/i;

// A "frontier" release: expensive enough to be a flagship tier.
const MIN_OUT_PRICE = 3; // $/1M output tokens
const RECENT_DAYS = 60;

/** Known open-weight vendors/id patterns for auto-added rows. */
const OPEN_WEIGHT = /^(deepseek|moonshotai|z-ai|qwen|meta-llama|minimax|mistralai)\//;

function fmtContext(len) {
  if (len >= 900_000) return "1M";
  if (len >= 1_000) return `${Math.round(len / 1_000)}K`;
  return String(len);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

const res = await fetch("https://openrouter.ai/api/v1/models");
if (!res.ok) {
  console.error(`OpenRouter fetch failed: ${res.status}`);
  process.exit(1);
}
const { data: orModels } = await res.json();
const byId = new Map(orModels.map((m) => [m.id, m]));

const doc = JSON.parse(readFileSync(DATA_PATH, "utf8"));
let changed = false;

// ---- 1. refresh tracked models ----
for (const model of doc.models) {
  if (!model.or) continue;
  const or = byId.get(model.or);
  if (!or) {
    console.warn(`Tracked model missing on OpenRouter: ${model.or}`);
    continue;
  }
  const priceIn = round2(Number(or.pricing?.prompt ?? 0) * 1e6);
  const priceOut = round2(Number(or.pricing?.completion ?? 0) * 1e6);
  const context = fmtContext(or.context_length ?? 0);
  if (priceIn > 0 && priceIn !== model.priceIn) {
    model.priceIn = priceIn;
    changed = true;
  }
  if (priceOut > 0 && priceOut !== model.priceOut) {
    model.priceOut = priceOut;
    changed = true;
  }
  if (context !== model.context) {
    model.context = context;
    changed = true;
  }
}

// ---- 2. detect new frontier releases ----
const tracked = new Set(doc.models.map((m) => m.or).filter(Boolean));
const ignored = new Set(doc.ignoredIds ?? []);
const cutoff = Date.now() / 1000 - RECENT_DAYS * 86400;

for (const or of orModels) {
  const vendorKey = or.id.split("/")[0];
  const vendor = FRONTIER_VENDORS[vendorKey];
  if (!vendor) continue;
  if (tracked.has(or.id) || ignored.has(or.id)) continue;
  if ((or.created ?? 0) < cutoff) continue;
  if (EXCLUDE.test(or.id)) continue;
  const priceOut = Number(or.pricing?.completion ?? 0) * 1e6;
  if (priceOut < MIN_OUT_PRICE) continue;

  const name = or.name?.replace(/^.*?:\s*/, "") ?? or.id.split("/")[1];
  doc.models.push({
    id: or.id.split("/")[1].replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
    or: or.id,
    vendor,
    name,
    priceIn: round2(Number(or.pricing?.prompt ?? 0) * 1e6),
    priceOut: round2(priceOut),
    context: fmtContext(or.context_length ?? 0),
    swe: null,
    sweApprox: false,
    openWeight: OPEN_WEIGHT.test(or.id),
    noteKo: "신규 출시 — 점수 집계 전",
    noteEn: "New release — score pending",
    auto: true,
  });
  tracked.add(or.id);
  changed = true;
  console.log(`Added new frontier model: ${or.id}`);
}

if (changed) {
  doc.lastUpdated = new Date().toISOString().slice(0, 10);
  writeFileSync(DATA_PATH, JSON.stringify(doc, null, 2) + "\n");
  console.log("model-comparison.json updated.");
} else {
  console.log("No changes.");
}
