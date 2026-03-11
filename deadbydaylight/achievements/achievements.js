const survivorsUrl = './survivors.json';
const killersUrl = './killers.json';

const els = {
  countUnlocked: document.getElementById('countUnlocked'),
  countLocked: document.getElementById('countLocked'),
  countShown: document.getElementById('countShown'),
  survivorSummary: document.getElementById('survivorSummary'),
  killerSummary: document.getElementById('killerSummary'),
  survivorSummaryCounts: document.getElementById('survivorSummaryCounts'),
  killerSummaryCounts: document.getElementById('killerSummaryCounts'),
  survivorSections: document.getElementById('survivorSections'),
  killerSections: document.getElementById('killerSections'),
  searchInput: document.getElementById('searchInput'),
  toggleUnlocked: document.getElementById('toggleUnlocked')
};

let state = {
  search: '',
  showUnlocked: false,
  survivors: null,
  killers: null
};

function normalize(value) {
  return String(value || '').toLowerCase();
}

function matchesSearch(item, search) {
  if (!search) return true;

  const haystack = [
    item.title,
    item.description,
    item.chapter,
    item.section,
    item.progress?.label
  ].join(' ').toLowerCase();

  return haystack.includes(search);
}

function getAllItems(data) {
  return data.sections.flatMap(section => section.items);
}

function getVisibleItems(data) {
  return getAllItems(data).filter(item => {
    const passesUnlocked = state.showUnlocked ? true : !item.unlocked;
    return passesUnlocked && matchesSearch(item, state.search);
  });
}

function countLocked(items) {
  return items.filter(item => !item.unlocked).length;
}

function countUnlocked(items) {
  return items.filter(item => item.unlocked).length;
}

function normalizeIconPath(icon) {
  if (!icon) {
    return '/deadbydaylight/assets/img/placeholder.png';
  }

  if (/^https?:\/\//i.test(icon)) {
    return icon;
  }

  const match = String(icon).match(/([a-f0-9]{40})(?:\(\d+\))?\.jpg/i);
  if (match) {
    return `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/381210/${match[1]}.jpg`;
  }

  return '/deadbydaylight/assets/img/placeholder.png';
}

function renderSummary(target, data, labelTarget) {
  const items = getAllItems(data);
  const locked = countLocked(items);

  labelTarget.textContent = `${locked} locked`;

  const rows = data.sections
    .map(section => {
      const lockedInSection = section.items.filter(item => !item.unlocked).length;
      return { title: section.title, locked: lockedInSection };
    })
    .filter(row => row.locked > 0)
    .sort((a, b) => {
      if (a.title === 'Adept') return -1;
      if (b.title === 'Adept') return 1;
      return b.locked - a.locked;
    });

  target.innerHTML = rows.length
    ? rows.map(row => `
        <div class="summary-row">
          <strong>${escapeHtml(row.title)}</strong>
          <span>${row.locked} locked</span>
        </div>
      `).join('')
    : '<div class="empty">No locked achievements.</div>';
}

function renderSections(target, data) {
  const html = data.sections.map(section => {
    const items = section.items.filter(item => {
      const passesUnlocked = state.showUnlocked ? true : !item.unlocked;
      return passesUnlocked && matchesSearch(item, state.search);
    });

    if (!items.length) return '';

    const sortedItems = [...items].sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked - b.unlocked;
      return a.title.localeCompare(b.title);
    });

    return `
      <section class="subsection">
        <div class="subsection-head">
          <h3>${escapeHtml(section.title)}</h3>
          <span>${items.length} shown</span>
        </div>

        <div class="achievement-list">
          ${sortedItems.map(renderAchievement).join('')}
        </div>
      </section>
    `;
  }).filter(Boolean).join('');

  target.innerHTML = html || '<div class="empty">No achievements match the current filters.</div>';
}

function renderAchievement(item) {
  const stateText = item.unlocked ? 'Unlocked' : 'Locked';
  const progressText = item.progress?.label || (item.unlocked ? '1 / 1' : '0 / 1');
  const icon = normalizeIconPath(item.icon);

  return `
    <article class="achievement">
      <img
        src="${escapeAttribute(icon)}"
        alt="${escapeAttribute(item.title)}"
        loading="lazy"
        onerror="this.onerror=null;this.src='/deadbydaylight/assets/img/placeholder.png';"
      >
      <div>
        <h4 class="achievement-title">${escapeHtml(item.title)}</h4>
        <p>${escapeHtml(item.description)}</p>
        <div class="achievement-meta">
          ${item.section ? `<span class="badge">${escapeHtml(item.section)}</span>` : ''}
          ${item.chapter ? `<span class="badge">${escapeHtml(item.chapter)}</span>` : ''}
        </div>
      </div>
      <div class="achievement-side">
        <div class="progress">${escapeHtml(progressText)}</div>
        <div class="state">${stateText}</div>
      </div>
    </article>
  `;
}

function updateTotals() {
  const allItems = [
    ...getAllItems(state.survivors),
    ...getAllItems(state.killers)
  ];

  const visibleItems = [
    ...getVisibleItems(state.survivors),
    ...getVisibleItems(state.killers)
  ];

  els.countUnlocked.textContent = countUnlocked(allItems);
  els.countLocked.textContent = countLocked(allItems);
  els.countShown.textContent = visibleItems.length;
}

function render() {
  renderSummary(els.survivorSummary, state.survivors, els.survivorSummaryCounts);
  renderSummary(els.killerSummary, state.killers, els.killerSummaryCounts);
  renderSections(els.survivorSections, state.survivors);
  renderSections(els.killerSections, state.killers);
  updateTotals();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

async function init() {
  const [survivors, killers] = await Promise.all([
    fetch(survivorsUrl).then(r => r.json()),
    fetch(killersUrl).then(r => r.json())
  ]);

  state.survivors = survivors;
  state.killers = killers;

  els.searchInput.addEventListener('input', (event) => {
    state.search = normalize(event.target.value.trim());
    render();
  });

  els.toggleUnlocked.addEventListener('change', (event) => {
    state.showUnlocked = event.target.checked;
    render();
  });

  render();
}

init().catch(error => {
  console.error(error);
  els.survivorSections.innerHTML = '<div class="empty">Failed to load survivors.json.</div>';
  els.killerSections.innerHTML = '<div class="empty">Failed to load killers.json.</div>';
});