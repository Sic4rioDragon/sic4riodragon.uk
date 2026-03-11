const fs = require('fs');

const survivorsPath = './survivors.json';
const killersPath = './killers.json';

const survivors = JSON.parse(fs.readFileSync(survivorsPath, 'utf8'));
const killers = JSON.parse(fs.readFileSync(killersPath, 'utf8'));

const moveToKillers = [
  'Adept Hillbilly',
  'Adept Ghost Face',
  'Adept Trickster',
  'Perfect Killing',
  'Deadly Plunge',
  'The Grind',
  'Prized Possession',
  'Totally Vulnerable'
];

const moveToSurvivors = [
  'Escaping the Nightmare'
];

function removeItemsByTitles(data, titles) {
  const removed = [];

  for (const section of data.sections) {
    const keep = [];

    for (const item of section.items) {
      if (titles.includes(item.title)) {
        removed.push(item);
      } else {
        keep.push(item);
      }
    }

    section.items = keep;
  }

  return removed;
}

function getSection(data, title) {
  let section = data.sections.find(s => s.title === title);
  if (!section) {
    section = { title, items: [] };
    data.sections.push(section);
  }
  return section;
}

const removedFromSurvivors = removeItemsByTitles(survivors, moveToKillers);
const removedFromKillers = removeItemsByTitles(killers, moveToSurvivors);

for (const item of removedFromSurvivors) {
  getSection(killers, item.section || 'General').items.push(item);
}

for (const item of removedFromKillers) {
  getSection(survivors, item.section || 'General').items.push(item);
}

for (const file of [survivors, killers]) {
  for (const section of file.sections) {
    section.items.sort((a, b) => a.title.localeCompare(b.title));
  }

  file.sections.sort((a, b) => {
    if (a.title === 'Adept') return -1;
    if (b.title === 'Adept') return 1;
    return a.title.localeCompare(b.title);
  });
}

fs.writeFileSync(survivorsPath, JSON.stringify(survivors, null, 2) + '\n');
fs.writeFileSync(killersPath, JSON.stringify(killers, null, 2) + '\n');

console.log('Done. JSON files fixed.');