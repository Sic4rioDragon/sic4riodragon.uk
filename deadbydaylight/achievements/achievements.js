const baseUrl = './achievements.base.json';
const stateUrl = './achievements.json';

const els = {
  countUnlocked: document.getElementById('countUnlocked'),
  countLocked: document.getElementById('countLocked'),
  countShown: document.getElementById('countShown'),

  survivorSummary: document.getElementById('survivorSummary'),
  killerSummary: document.getElementById('killerSummary'),
  generalSummary: document.getElementById('generalSummary'),

  survivorSummaryCounts: document.getElementById('survivorSummaryCounts'),
  killerSummaryCounts: document.getElementById('killerSummaryCounts'),
  generalSummaryCounts: document.getElementById('generalSummaryCounts'),

  survivorSections: document.getElementById('survivorSections'),
  killerSections: document.getElementById('killerSections'),
  generalSections: document.getElementById('generalSections'),

  searchInput: document.getElementById('searchInput'),
  toggleUnlocked: document.getElementById('toggleUnlocked')
};

const SECTION_ORDER = {
  killer: ['adept', 'general', 'extra'],
  survivor: ['adept', 'map', 'general'],
  general: ['general']
};

let state = {
  search: '',
  showUnlocked: false,
  items: []
};

function normalize(value) {
  return String(value || '').toLowerCase();
}

function flattenState(grouped) {
  const out = new Map();

  for (const [topKey, topValue] of Object.entries(grouped || {})) {
    if (!topValue || typeof topValue !== 'object') continue;

    for (const [sectionKey, sectionValue] of Object.entries(topValue)) {
      if (!sectionValue || typeof sectionValue !== 'object') continue;

      for (const [achievementId, unlocked] of Object.entries(sectionValue)) {
        out.set(achievementId, {
          unlocked: !!unlocked,
          category:
            topKey === 'survivors' ? 'survivor' :
            topKey === 'killers' ? 'killer' :
            'general',
          section: sectionKey
        });
      }
    }
  }

  return out;
}

function matchesSearch(item, search) {
  if (!search) return true;

  const haystack = [
    item.title,
    item.description,
    item.category,
    item.section,
    item.id || '',
    item.achievement_id
  ].join(' ').toLowerCase();

  return haystack.includes(search);
}

function getVisibleItems(items) {
  return items.filter(item => {
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

function prettySectionName(section) {
  if (section === 'adept') return 'Adept';
  if (section === 'map') return 'Map';
  if (section === 'extra') return 'Extra';
  return 'General';
}

function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function renderSummary(container, items, category) {
  if (!container) return;

  const order = SECTION_ORDER[category] || ['general'];

  const groups = order
    .map(section => ({
      section,
      items: items.filter(item => item.section === section)
    }))
    .filter(group => group.items.length > 0);

  if (!groups.length) {
    container.innerHTML = `<div class="summary-row"><strong>No achievements</strong><span>0</span></div>`;
    return;
  }

  container.innerHTML = groups.map(group => `
    <div class="summary-row">
      <strong>${prettySectionName(group.section)}</strong>
      <span>${countLocked(group.items)} locked / ${group.items.length} total</span>
    </div>
  `).join('');
}

function renderSections(container, items, category) {
  if (!container) return;

  const order = SECTION_ORDER[category] || ['general'];

  const groups = order
    .map(section => ({
      section,
      items: items.filter(item => item.section === section)
    }))
    .filter(group => group.items.length > 0);

  if (!groups.length) {
    container.innerHTML = `<div class="empty">No achievements match the current filters.</div>`;
    return;
  }

  container.innerHTML = groups.map(group => `
    <section class="subsection">
      <div class="subsection-head">
        <h3>${prettySectionName(group.section)}</h3>
        <span>${countLocked(group.items)} locked / ${group.items.length} total</span>
      </div>
      <div class="achievement-list">
        ${group.items.map(renderAchievementCard).join('')}
      </div>
    </section>
  `).join('');
}

function renderAchievementCard(item) {
  const progressLabel = item.unlocked ? '1 / 1' : '0 / 1';
  const ownerLabel = item.id ? `<span class="achievement-owner">${escapeHtml(item.id)}</span>` : '';

  return `
    <article class="achievement ${item.unlocked ? 'is-unlocked' : 'is-locked'}">
      <div class="achievement-copy">
        <div class="achievement-topline">
          <h4>${escapeHtml(item.title)}</h4>
          ${ownerLabel}
        </div>
        <p>${escapeHtml(item.description)}</p>
      </div>
      <div class="achievement-meta">
        <span class="achievement-state">${item.unlocked ? 'Unlocked' : 'Locked'}</span>
        <strong>${progressLabel}</strong>
      </div>
    </article>
  `;
}

function updateCounters(allItems, visibleItems) {
  els.countUnlocked.textContent = String(countUnlocked(allItems));
  els.countLocked.textContent = String(countLocked(allItems));
  els.countShown.textContent = String(visibleItems.length);
}

function render() {
  const allItems = state.items.slice();
  const visibleItems = getVisibleItems(allItems);

  const survivorItems = visibleItems.filter(item => item.category === 'survivor');
  const killerItems = visibleItems.filter(item => item.category === 'killer');
  const generalItems = visibleItems.filter(item => item.category === 'general');

  updateCounters(allItems, visibleItems);

  if (els.survivorSummaryCounts) {
    els.survivorSummaryCounts.textContent = `${countLocked(allItems.filter(i => i.category === 'survivor'))} locked`;
  }
  if (els.killerSummaryCounts) {
    els.killerSummaryCounts.textContent = `${countLocked(allItems.filter(i => i.category === 'killer'))} locked`;
  }
  if (els.generalSummaryCounts) {
    els.generalSummaryCounts.textContent = `${countLocked(allItems.filter(i => i.category === 'general'))} locked`;
  }

  renderSummary(els.survivorSummary, survivorItems, 'survivor');
  renderSummary(els.killerSummary, killerItems, 'killer');
  renderSummary(els.generalSummary, generalItems, 'general');

  renderSections(els.survivorSections, survivorItems, 'survivor');
  renderSections(els.killerSections, killerItems, 'killer');
  renderSections(els.generalSections, generalItems, 'general');
}

async function init() {
  const [base, groupedState] = await Promise.all([
    fetch(baseUrl).then(r => r.json()),
    fetch(stateUrl).then(r => r.json())
  ]);

  const stateMap = flattenState(groupedState);

  state.items = base.map(item => {
    const entry = stateMap.get(item.achievement_id) || {
      unlocked: false,
      category: item.category,
      section: item.section
    };

    return {
      ...item,
      unlocked: !!entry.unlocked
    };
  });

  els.searchInput?.addEventListener('input', () => {
    state.search = normalize(els.searchInput.value);
    render();
  });

  els.toggleUnlocked?.addEventListener('change', () => {
    state.showUnlocked = !!els.toggleUnlocked.checked;
    render();
  });

  render();
}

init().catch(error => {
  console.error(error);

  const msg = '<div class="empty">Failed to load achievements data.</div>';
  if (els.survivorSections) els.survivorSections.innerHTML = msg;
  if (els.killerSections) els.killerSections.innerHTML = msg;
  if (els.generalSections) els.generalSections.innerHTML = msg;
});