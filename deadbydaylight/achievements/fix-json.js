const fs = require('fs');
const path = require('path');

const BASE_PATH = path.join(__dirname, 'achievements.base.json');
const OUTPUT_PATH = path.join(__dirname, 'achievements.json');

function normalizeText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function lower(text) {
  return normalizeText(text).toLowerCase();
}

function makeAchievementId(title) {
  return lower(title)
    .normalize('NFKD')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function decodeHtml(text) {
  return String(text || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function tryFindNightLightHtml() {
  const files = fs.readdirSync(__dirname);
  const html = files.find(name =>
    name.toLowerCase().endsWith('.html') &&
    name.toLowerCase().includes('nightlight')
  );
  return html ? path.join(__dirname, html) : null;
}

function extractEntriesFromHtml(html) {
  const entries = [];
  const blocks = html.split('<div class="_achievement_179il_5">').slice(1);

  for (const block of blocks) {
    const titleMatch = block.match(/<p class="mb-0 fw-bold">([\s\S]*?)<\/p>/i);
    const descMatch = block.match(/<small>([\s\S]*?)<\/small>/i);

    if (!titleMatch || !descMatch) continue;

    const title = normalizeText(decodeHtml(titleMatch[1]));
    const description = normalizeText(decodeHtml(descMatch[1]));
    const unlocked = /_unlocked_info_179il_15/.test(block);

    entries.push({ title, description, unlocked });
  }

  return entries;
}

function buildUnlockedMap(entries) {
  const map = new Map();
  for (const item of entries) {
    map.set(lower(item.title), !!item.unlocked);
  }
  return map;
}

function ensureGroup(target, a, b) {
  if (!target[a]) target[a] = {};
  if (!target[a][b]) target[a][b] = {};
  return target[a][b];
}

function sortRank(item) {
  const categoryRank = {
    killer: 0,
    survivor: 1,
    general: 2
  };

  const sectionRankByCategory = {
    killer: { adept: 0, general: 1, extra: 2 },
    survivor: { adept: 0, map: 1, general: 2 },
    general: { general: 0 }
  };

  const cat = item.category || 'general';
  const sec = item.section || 'general';

  return [
    categoryRank[cat] ?? 99,
    sectionRankByCategory[cat]?.[sec] ?? 99,
    lower(item.title)
  ];
}

function compareItems(a, b) {
  const ar = sortRank(a);
  const br = sortRank(b);

  for (let i = 0; i < ar.length; i++) {
    if (ar[i] < br[i]) return -1;
    if (ar[i] > br[i]) return 1;
  }
  return 0;
}

function classifyFallback(item) {
  const t = lower(item.title);
  const d = lower(item.description);

  if (d.includes('merciless victory')) {
    return { category: 'killer', section: 'adept' };
  }

  if (
    t.startsWith('adept ') &&
    (d.includes('3 unique perks') || d.includes('repair the equivalent of 1 generator'))
  ) {
    return { category: 'survivor', section: 'adept' };
  }

  if (d.includes(' and escape') && !d.includes('hand or eye of vecna')) {
    return { category: 'survivor', section: 'map' };
  }

  if (
    d.includes('as a killer') ||
    d.includes('as the killer') ||
    d.includes('damage a survivor') ||
    d.includes('injure a survivor') ||
    d.includes('down a survivor') ||
    d.includes('hook a survivor') ||
    d.includes('kill a survivor') ||
    d.includes('survivors scream')
  ) {
    return { category: 'killer', section: 'general' };
  }

  if (
    d.includes('escape') ||
    d.includes('repair') ||
    d.includes('heal') ||
    d.includes('unhook') ||
    d.includes('bless') ||
    d.includes('cleanse')
  ) {
    return { category: 'survivor', section: 'general' };
  }

  return { category: 'general', section: 'general' };
}

function stateBucketFor(baseItem) {
  if (baseItem.category === 'killer') {
    return ['killers', baseItem.section || 'general'];
  }
  if (baseItem.category === 'survivor') {
    return ['survivors', baseItem.section || 'general'];
  }
  return ['general', 'general'];
}

function createEmptyGroupedState() {
  return {
    killers: {
      adept: {},
      general: {},
      extra: {}
    },
    survivors: {
      adept: {},
      map: {},
      general: {}
    },
    general: {
      general: {}
    }
  };
}

function normalizeExistingState(existingState, base) {
  const output = createEmptyGroupedState();

  if (!existingState || typeof existingState !== 'object') {
    for (const item of base) {
      const [group, section] = stateBucketFor(item);
      ensureGroup(output, group, section)[item.achievement_id] = false;
    }
    return output;
  }

  for (const item of base) {
    const [group, section] = stateBucketFor(item);
    const unlocked = !!existingState?.[group]?.[section]?.[item.achievement_id];
    ensureGroup(output, group, section)[item.achievement_id] = unlocked;
  }

  return output;
}

function main() {
  const base = JSON.parse(fs.readFileSync(BASE_PATH, 'utf8'));
  const htmlPath = tryFindNightLightHtml();

  const existingState = fs.existsSync(OUTPUT_PATH)
    ? JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'))
    : createEmptyGroupedState();

  let unlockedMap = null;
  let htmlEntries = [];

  if (htmlPath) {
    const html = fs.readFileSync(htmlPath, 'utf8');
    htmlEntries = extractEntriesFromHtml(html);
    unlockedMap = buildUnlockedMap(htmlEntries);

    const existingById = new Map(base.map(item => [item.achievement_id, item]));
    const existingByTitle = new Map(base.map(item => [lower(item.title), item]));

    for (const htmlItem of htmlEntries) {
      const achievement_id = makeAchievementId(htmlItem.title);

      if (existingById.has(achievement_id) || existingByTitle.has(lower(htmlItem.title))) {
        continue;
      }

      const fallback = classifyFallback(htmlItem);

      base.push({
        achievement_id,
        title: htmlItem.title,
        description: htmlItem.description,
        category: fallback.category,
        section: fallback.section,
        id: null
      });
    }
  }

  base.sort(compareItems);

  let output;

  if (unlockedMap) {
    output = createEmptyGroupedState();

    for (const item of base) {
      const [group, section] = stateBucketFor(item);
      const unlocked = unlockedMap.has(lower(item.title))
        ? unlockedMap.get(lower(item.title))
        : !!existingState?.[group]?.[section]?.[item.achievement_id];

      ensureGroup(output, group, section)[item.achievement_id] = !!unlocked;
    }
  } else {
    output = normalizeExistingState(existingState, base);
  }

  fs.writeFileSync(BASE_PATH, JSON.stringify(base, null, 2) + '\n');
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n');

  console.log(`Sorted and updated ${BASE_PATH}`);
  console.log(`Wrote ${OUTPUT_PATH}`);

  if (htmlPath) {
    console.log(`Used NightLight HTML: ${path.basename(htmlPath)}`);
    console.log(`Parsed HTML achievements: ${htmlEntries.length}`);
  } else {
    console.log('No NightLight HTML found. Kept existing achievement unlock states and assumed no new achievements.');
  }

  console.log(`Base count: ${base.length}`);
}

main();