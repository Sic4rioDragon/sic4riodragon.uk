const fs = require('fs');
const path = require('path');

const BASE_PATH = path.join(__dirname, 'achievements.base.json');
const STATE_PATH = path.join(__dirname, 'achievements.json');
const ICONS_PATH = path.join(__dirname, 'achievements.icons.json');

const MANUAL_KILLER_GENERAL = new Set([
  'awakened anger',
  'beyond broken',
  'blood in your mouth',
  'broken bodies',
  'chorus of chaos',
  'collision course',
  'complete the evolution',
  'death flight',
  'death of ignorance',
  'disarm and dismember',
  'dream demon',
  'first to the punch',
  'from the deep',
  'heavy burden',
  'holiday get-together',
  'i see you',
  'lost all hope',
  'mad house',
  'master manipulator',
  'multi-tasker',
  'neither seen nor heard',
  'none the wiser',
  'one thousand cuts',
  'outrage',
  'outta nowhere',
  'preemptive strike',
  'quick draw',
  'silent approach',
  'taste the darkness',
  'torn asunder',
  'viral video',
  'what lurks beneath'
]);

const MANUAL_MAP = new Set([
  "ancestor's rite",
  "campbell's chapel legacy",
  'cherish your life',
  'cottage owner',
  'hemophobia',
  'shrine apparatus',
  'unforgettable getaway'
]);

const MANUAL_SURVIVOR_GENERAL = new Set([
  'near-death experience',
  'power moves',
  'with scars to show',
  'outrun evil',
  'agonizing escape',
  'dismantle'
]);

const MANUAL_GENERAL = new Set([
  'tanuki in the fog',
  'zealous',
  'bloody millionaire',
  'getting the hang of it',
  'gifts for the fog',
  'happy holidays',
  'i',
  'ii',
  'iii',
  'iii-50',
  'it wakes',
  'not half bad',
  'skillful'
]);

function normalizeText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function lower(text) {
  return normalizeText(text).toLowerCase();
}

function makeAchievementId(title) {
  return lower(title)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
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
  const html = files.find(
    name =>
      name.toLowerCase().endsWith('.html') &&
      name.toLowerCase().includes('nightlight')
  );
  return html ? path.join(__dirname, html) : null;
}

function steamIconFromSrc(src) {
  const raw = decodeHtml(src || '').trim();
  if (!raw) return '';

  if (/^https?:\/\/steamcdn-a\.akamaihd\.net\/steamcommunity\/public\/images\/apps\/381210\//i.test(raw)) {
    return raw;
  }

  const filename = raw.split('/').pop() || '';
  const hashMatch = filename.match(/([a-f0-9]{40})/i);
  if (!hashMatch) return '';

  const extMatch = filename.match(/\.(jpg|jpeg|png|webp)/i);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';

  return `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/381210/${hashMatch[1].toLowerCase()}.${ext}`;
}

function extractEntriesFromHtml(html) {
  const entries = [];
  const blocks = html.split('<div class="_achievement_179il_5">').slice(1);

  for (const block of blocks) {
    const titleMatch = block.match(/<p class="mb-0 fw-bold">([\s\S]*?)<\/p>/i);
    const descMatch = block.match(/<small>([\s\S]*?)<\/small>/i);
    const imgMatch = block.match(/<img[^>]+src="([^"]+)"[^>]*>/i);

    if (!titleMatch || !descMatch) continue;

    const title = normalizeText(decodeHtml(titleMatch[1]));
    const description = normalizeText(decodeHtml(descMatch[1]));
    const unlocked = /_unlocked_info_179il_15/.test(block);
    const icon = imgMatch ? steamIconFromSrc(imgMatch[1]) : '';

    entries.push({ title, description, unlocked, icon });
  }

  return entries;
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

  if (t === 'tools of the trade') {
    return { category: 'killer', section: 'adept' };
  }

  if (t === 'battle caster') {
    return { category: 'killer', section: 'extra' };
  }

  if (MANUAL_KILLER_GENERAL.has(t)) {
    return { category: 'killer', section: 'general' };
  }

  if (MANUAL_MAP.has(t)) {
    return { category: 'survivor', section: 'map' };
  }

  if (MANUAL_SURVIVOR_GENERAL.has(t)) {
    return { category: 'survivor', section: 'general' };
  }

  if (MANUAL_GENERAL.has(t)) {
    return { category: 'general', section: 'general' };
  }

  if (d.includes('merciless victory')) {
    return { category: 'killer', section: 'adept' };
  }

  if (
    t.startsWith('adept ') &&
    (
      d.includes('3 unique perks') ||
      d.includes('repair the equivalent of 1 generator') ||
      d.includes('escape with')
    )
  ) {
    if (d.includes('merciless victory')) {
      return { category: 'killer', section: 'adept' };
    }
    return { category: 'survivor', section: 'adept' };
  }

  if (d.includes(' and escape') && !d.includes('hand or eye of vecna')) {
    return { category: 'survivor', section: 'map' };
  }

  if (
    d.includes('as a killer') ||
    d.includes('as the killer') ||
    d.includes('with the ') ||
    d.includes('sacrifice') ||
    d.includes('kill a survivor') ||
    d.includes('kill survivors') ||
    d.includes('hook a survivor') ||
    d.includes('hook survivors') ||
    d.includes('down survivors') ||
    d.includes('damage a survivor') ||
    d.includes('injure a survivor') ||
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

function loadJsonIfExists(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;

  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Invalid JSON in ${path.basename(filePath)}. Using fallback instead.`);
    return fallback;
  }
}

function main() {
  const base = loadJsonIfExists(BASE_PATH, []);
  const existingState = loadJsonIfExists(STATE_PATH, createEmptyGroupedState());
  const existingIcons = loadJsonIfExists(ICONS_PATH, {});
  const htmlPath = tryFindNightLightHtml();

  let htmlEntries = [];
  let unlockedMap = null;
  let iconMap = null;

  if (htmlPath) {
    const html = fs.readFileSync(htmlPath, 'utf8');
    htmlEntries = extractEntriesFromHtml(html);

    unlockedMap = new Map();
    iconMap = new Map();

    for (const item of htmlEntries) {
      unlockedMap.set(lower(item.title), !!item.unlocked);
      if (item.icon) iconMap.set(lower(item.title), item.icon);
    }

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

  let outputState;
  if (unlockedMap) {
    outputState = createEmptyGroupedState();

    for (const item of base) {
      const [group, section] = stateBucketFor(item);
      const unlocked = unlockedMap.has(lower(item.title))
        ? unlockedMap.get(lower(item.title))
        : !!existingState?.[group]?.[section]?.[item.achievement_id];

      ensureGroup(outputState, group, section)[item.achievement_id] = !!unlocked;
    }
  } else {
    outputState = normalizeExistingState(existingState, base);
  }

  const outputIcons = { ...existingIcons };

  if (iconMap) {
    for (const item of base) {
      const key = lower(item.title);
      if (iconMap.has(key)) {
        outputIcons[item.achievement_id] = iconMap.get(key);
      } else if (!(item.achievement_id in outputIcons)) {
        outputIcons[item.achievement_id] = '';
      }
    }
  } else {
    for (const item of base) {
      if (!(item.achievement_id in outputIcons)) {
        outputIcons[item.achievement_id] = '';
      }
    }
  }

  fs.writeFileSync(BASE_PATH, JSON.stringify(base, null, 2) + '\n');
  fs.writeFileSync(STATE_PATH, JSON.stringify(outputState, null, 2) + '\n');
  fs.writeFileSync(ICONS_PATH, JSON.stringify(outputIcons, null, 2) + '\n');

  console.log(`Sorted and updated ${BASE_PATH}`);
  console.log(`Wrote ${STATE_PATH}`);
  console.log(`Wrote ${ICONS_PATH}`);

  if (htmlPath) {
    console.log(`Used NightLight HTML: ${path.basename(htmlPath)}`);
    console.log(`Parsed HTML achievements: ${htmlEntries.length}`);
    console.log('Updated unlocks and Steam CDN icons from NightLight HTML.');
  } else {
    console.log('No NightLight HTML found. Kept existing unlock states and icons.');
  }

  console.log(`Base count: ${base.length}`);
}

main();