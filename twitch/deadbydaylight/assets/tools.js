(async function () {
  const page = document.body.dataset.page;
  const ROOT = window.location.origin;
  const SITE_BASE = '/twitch/deadbydaylight';
  const DATA_BASE = '/deadbydaylight';

  const params = new URLSearchParams(window.location.search);
  const originKey = (params.get('origin') || '').toLowerCase();

  const ORIGIN_CONFIG = {
    mercuryfallen: {
      profileUrl: `${ROOT}${DATA_BASE}/unlocks.mercuryfallen.json`,
      backUrl: 'https://mercuryfallen.org/challenges/',
      backLabel: 'Back to Mercuryfallen Challenges'
    },
    default: {
      profileUrl: `${ROOT}${DATA_BASE}/unlocks.json`,
      backUrl: `${ROOT}${SITE_BASE}/`,
      backLabel: 'Back'
    }
  };

  const originConfig = ORIGIN_CONFIG[originKey] || ORIGIN_CONFIG.default;
  const CATALOG_URL = `${ROOT}${DATA_BASE}/catalog.json`;

  function withOrigin(path) {
    const url = new URL(`${ROOT}${path}`);
    if (originKey) url.searchParams.set('origin', originKey);
    return url.toString();
  }

  function localHref(path) {
    return withOrigin(path);
  }

  function createBackButton() {
    const target =
      document.querySelector('.topnav') ||
      document.querySelector('.page-intro') ||
      document.querySelector('.page-shell');

    if (!target) return;

    const a = document.createElement('a');
    a.className = 'navpill backpill';
    a.href = originConfig.backUrl;
    a.textContent = originConfig.backLabel;

    if (target.classList.contains('topnav')) {
      target.appendChild(a);
    } else {
      target.prepend(a);
    }
  }

  const [catalog, unlocks] = await Promise.all([
    fetch(CATALOG_URL).then(r => r.json()),
    fetch(originConfig.profileUrl, { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load ${originConfig.profileUrl}`);
        return r.json();
      })
      .catch(() => ({
        profile: 'missing',
        displayName: 'Missing profile',
        characters: {},
        generalPerks: { survivor: {}, killer: {} }
      }))
  ]);

  const perkById = new Map(catalog.perks.map(p => [p.id, p]));

  function characterState(characterOrSlug) {
    const slug = typeof characterOrSlug === 'string' ? characterOrSlug : characterOrSlug?.slug;
    return (unlocks.characters || {})[slug] || { owned: false, prestige: 0 };
  }

  function characterOwned(characterOrSlug) {
    const state = characterState(characterOrSlug);
    return !!state.owned || Number(state.prestige || 0) > 0;
  }

  function generalTier(role, perkKey) {
    return Number((((unlocks.generalPerks || {})[role] || {})[perkKey]) || 0);
  }

  function tierOf(perk) {
    if (perk.general) return generalTier(perk.role, perk.key);
    const state = characterState(perk.characterSlug);
    const explicit = Number(state[perk.key] || 0);
    const prestigeTier = Math.max(0, Math.min(3, Number(state.prestige || 0)));
    return Math.max(explicit, prestigeTier);
  }

  function resolvePerkImage(perk, tier) {
    if (tier >= 3 && perk.snogglesOutputUrl) return perk.snogglesOutputUrl;
    if (perk.snogglesInputUrl) return perk.snogglesInputUrl;
    return perk.nightlight85Url || '';
  }

  function perkTierBadge(tier) {
    return `<span class="perk-tier-badge badge-t${tier}">T${tier}</span>`;
  }

  function perkOwnerLabel(perk) {
    if (perk.general) return perk.role === 'survivor' ? 'General Survivor Perks' : 'General Killer Perks';
    return perk.characterName;
  }

  function makePerkRow(perk) {
    const tier = tierOf(perk);
    const imgSrc = resolvePerkImage(perk, tier);
    return `
      <div class="perk-row">
        <img class="perk-art t${tier}" src="${imgSrc}" alt="${escapeHtml(perk.name)}" onerror="this.onerror=null;this.src='${perk.nightlight85Url || ''}'">
        <div class="perk-meta">
          <span class="perk-name">${escapeHtml(perk.name)}</span>
          <span class="perk-owner">${escapeHtml(perkOwnerLabel(perk))}</span>
        </div>
        ${perkTierBadge(tier)}
      </div>`;
  }

  function perkTile(perk) {
    const tier = tierOf(perk);
    const imgSrc = resolvePerkImage(perk, tier);
    return `
      <div class="teachable_container">
        <div class="teachable">
          <img class="perk-art t${tier}" src="${imgSrc}" alt="${escapeHtml(perk.name)}" onerror="this.onerror=null;this.src='${perk.nightlight85Url || ''}'">
        </div>
        <span class="teachable_label">${escapeHtml(perk.name)}<br><span class="small-note">T${tier}</span></span>
      </div>`;
  }

  function generalCard(title, perks) {
    const items = perks.map(p => perkTile(p)).join('');
    return `
      <div class="_card_1ohwe_288 h-100">
        <div class="_header_1ohwe_302 d-flex justify-content-between">
          <h5 class="mb-0">${escapeHtml(title)}</h5>
          <span class="prestige-pill">${perks.length} perks</span>
        </div>
        <div class="_cardBody_1ohwe_316">
          <div class="teachable_wrap">${items}</div>
        </div>
      </div>`;
  }

  function characterCard(character) {
    const state = characterState(character);
    const owned = characterOwned(character);
    const perkNames = character.perkIds.map(id => (perkById.get(id) || {}).name || '').filter(Boolean);
    const items = character.perkIds.map(id => perkById.get(id)).filter(Boolean).map(perkTile).join('');
    return `
      <div class="_card_1ohwe_288 h-100 char-card"
           data-char-name="${escapeAttr(character.name)}"
           data-search="${escapeAttr([character.name, ...perkNames].join(' '))}"
           data-owned="${owned ? '1' : '0'}"
           data-prestige="${Number(state.prestige || 0)}">
        <div class="_header_1ohwe_302">
          <div class="char-header">
            <span class="h5 mb-0 me-2">${escapeHtml(character.name)}</span>
            <span class="${owned ? 'owned-pill is-on' : 'owned-pill'}">${owned ? 'Owned' : 'Locked'}</span>
            <span class="prestige-pill">Prestige: ${Number(state.prestige || 0)}</span>
          </div>
        </div>
        <div class="_cardBody_1ohwe_316">
          <div class="teachable_wrap">${items}</div>
        </div>
      </div>`;
  }

  function escapeHtml(text) {
    return String(text ?? '').replace(/[&<>"']/g, c => (
      { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
    ));
  }

  function escapeAttr(text) {
    return escapeHtml(text);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function perkAllowed(perk) {
    return tierOf(perk) > 0;
  }

  function renderBuild(role, containerId) {
    const pool = catalog.perks.filter(p => p.role === role && perkAllowed(p));
    const chosen = shuffle(pool).slice(0, 4);
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = chosen.map(makePerkRow).join('');
  }

  function updateCounts() {
    const pool = catalog.perks.filter(perkAllowed);
    const survivor = pool.filter(p => p.role === 'survivor').length;
    const killer = pool.filter(p => p.role === 'killer').length;
    const ownedChars = catalog.characters.filter(characterOwned).length;

    setText('pool-total', String(pool.length));
    setText('count-survivor', String(survivor));
    setText('count-killer', String(killer));
    setText('count-owned-chars', String(ownedChars));
    setText('count-general-survivor', String(catalog.generalSurvivorPerks.length));
    setText('count-general-killer', String(catalog.generalKillerPerks.length));
    setText('count-total-perks', String(catalog.perks.length));
    setText('survivor-subline', `${catalog.survivors.length} survivors in the catalog`);
    setText('killer-subline', `${catalog.killers.length} killers in the catalog`);
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function renderUnlocksPage() {
    const gs = document.getElementById('general-survivor-grid');
    const gk = document.getElementById('general-killer-grid');
    const sg = document.getElementById('survivor-grid');
    const kg = document.getElementById('killer-grid');
    if (!gs || !gk || !sg || !kg) return;

    gs.innerHTML = generalCard('General Survivor Perks', catalog.generalSurvivorPerks);
    gk.innerHTML = generalCard('General Killer Perks', catalog.generalKillerPerks);
    sg.innerHTML = catalog.survivors.map(characterCard).join('');
    kg.innerHTML = catalog.killers.map(characterCard).join('');

    const applyFilters = () => {
      const query = (document.getElementById('search-box')?.value || '').toLowerCase().trim();
      const pmin = Number(document.getElementById('prestige-min')?.value || 0);
      const pmaxValue = document.getElementById('prestige-max')?.value;
      const pmax = pmaxValue === '' ? Infinity : Number(pmaxValue);

      document.querySelectorAll('.char-card').forEach(card => {
        const search = (card.dataset.search || '').toLowerCase();
        const prestige = Number(card.dataset.prestige || 0);
        const hide = (query && !search.includes(query)) || prestige < pmin || prestige > pmax;
        card.classList.toggle('hide', hide);
      });
    };

    ['search-box', 'prestige-min', 'prestige-max'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', applyFilters);
      if (el) el.addEventListener('change', applyFilters);
    });

    applyFilters();
  }

  document.querySelectorAll('a.brand').forEach(el => el.href = localHref(`${SITE_BASE}/`));
  document.querySelectorAll('a.navpill[href$="/tools/"]').forEach(el => el.href = localHref(`${SITE_BASE}/tools/`));
  document.querySelectorAll('a.navpill[href$="/unlocks/"]').forEach(el => el.href = localHref(`${SITE_BASE}/unlocks/`));
  document.querySelectorAll('a[href="/twitch/deadbydaylight/unlocks/"]').forEach(el => el.href = localHref(`${SITE_BASE}/unlocks/`));

  createBackButton();
  updateCounts();

  if (page === 'tools') {
    renderBuild('survivor', 'survivor-build');
    renderBuild('killer', 'killer-build');
    document.getElementById('refresh-survivor')?.addEventListener('click', () => renderBuild('survivor', 'survivor-build'));
    document.getElementById('refresh-killer')?.addEventListener('click', () => renderBuild('killer', 'killer-build'));
  }

  if (page === 'unlocks') {
    renderUnlocksPage();
  }
})();