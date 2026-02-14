// ================== CONFIG ==================
const DBD_BASE = "/deadbydaylight/";
// ================== PRESTIGE CRESTS (Layered Assets) ==================
const DBD_PRESTIGE = {
  crestsDir: DBD_BASE + "assets/dbd/Prestige/Crests/",
  bordersDir: DBD_BASE + "assets/dbd/Prestige/Crest%20Borders/",
};

// Map a prestige number to the “base” crest asset we should use.
// Ranges exist for 1–25; after that, use milestone bases (30,35,...,99) and reuse between milestones.
function DBD_prestigeBaseKey(p) {
  if (!p || p <= 0) return null;

  // 1–25 uses grouped ranges
  if (p <= 5)  return "1 to 5";
  if (p <= 10) return "6 to 10";
  if (p <= 15) return "11 to 15";
  if (p <= 20) return "16 to 20";
  if (p <= 25) return "21 to 25";

  // 26–29 still look like the 21–25 tier in-game, just higher number
  if (p < 30) return "21 to 25";

  // Milestone bases after 30
  const milestones = [30,35,40,45,50,55,60,65,70,75,80,85,90,95,99,100];

  if (p >= 100) return "100";

  for (let i = 0; i < milestones.length; i++) {
    if (p < milestones[i]) return String(milestones[i - 1]);
  }
  return "99";
}

function DBD_prestigeAssets(p) {
  const base = DBD_prestigeBaseKey(p);
  if (!base) return null;

  const isRange = base.includes("to");
  const is100 = base === "100";

  const fill = DBD_PRESTIGE.crestsDir + encodeURIComponent(base) + ".png";

  // 100 usually doesn't need a border; everything else does (including 99)
  const border = is100
    ? null
    : (DBD_PRESTIGE.bordersDir + encodeURIComponent(base) + "%20Border.png");

  return { fill, border };
}

function DBD_renderPrestigeBadge(p) {
  if (!p || p <= 0) return "";
  const assets = DBD_prestigeAssets(p);
  if (!assets) return "";

  const digits = String(p).length;

  return `
    <div class="prestige-crest" data-d="${digits}" title="Prestige ${p}">
      <img class="prestige-fill" src="${assets.fill}" alt="">
      ${assets.border ? `<img class="prestige-border" src="${assets.border}" alt="">` : ""}
      <span class="prestige-num">${p}</span>
    </div>
  `;
}
const DBD_IMG = {
  placeholder: DBD_BASE + "assets/img/placeholder.webp",
  missingLogKey: "dbd_missing_images_v1",
};

const PERK_ICON_BASE =
  "https://raw.githubusercontent.com/snoggles/dbd-perk-emoji/main/images/input/";

// ================== MISSING IMAGE LOG ==================
function loadMissingLog() {
  try { return JSON.parse(localStorage.getItem(DBD_IMG.missingLogKey) || "[]"); }
  catch { return []; }
}
// ================== OFFICIAL IN-GAME ORDER (ids) ==================
// Keep mains first via "main": true, but everyone else follows this order.
// If a character isn't listed here (new chapter), they fall to the bottom.

window.DBD_SURVIVOR_ORDER_IDS = [
  "dwightfairfield",
  "megthomas",
  "claudettemorel",
  "jakepark",
  "neakarlsson",
  "williambilloverbeck",
  "lauriestrode",
  "acevisconti",
  "fengmin",
  "davidking",
  "quentinsmith",
  "detectivedavidtapp",
  "kate",
  "adamfrancis",
  "jeffjohansen",
  "janeromero",
  "ashleyjwilliams",
  "nancy",
  "steveharrington",
  "yui",
  "zarinalkassir",
  "cherylmason",
  "felixrichter",
  "elodierakoto",
  "yunjinlee",
  "jillvalentine",
  "leonkennedy",
  "mikela",
  "jonahvasquez",
  "yoichiasakawa",
  "haddiekaur",
  "ada",
  "rebeccachambers",
  "vittoriotoscano",
  "thalitalyra",
  "renatolyra",
  "gabrielsoma",
  "nicolascage",
  "ellenripley",
  "alanwake",
  "sableward",
  "thetroupe",        // Aestri (The Troupe)
  "laracroft",
  "trevor",
  "tauriecain",
  "orela",
  "rickgrimes",
  "michonnegrimes",
  "VeeBoonyasak",
  "dustin",
  "eleven"
];

window.DBD_KILLER_ORDER_IDS = [
  "trapper",
  "wraith",
  "hillbilly",
  "nurse",
  "shape",
  "hag",
  "doctor",
  "cannibal",
  "huntress",
  "nightmare",
  "pig",
  "clown",
  "spirit",
  "legion",
  "plague",
  "ghostface",
  "demogorgon",
  "oni",
  "deathslinger",
  "executioner",
  "blight",
  "twins",
  "trickster",
  "nemesis",
  "artist",
  "onryo",
  "dredge",
  "mastermind",
  "knight",
  "skullmerchant",
  "singularity",
  "xenomorph",
  "goodguy",
  "unknown",
  "lich",
  "dracula",           // Dark Lord
  "houndmaster",
  "ghoul",
  "animatronic",
  "krasue",
  "first", 
  "cenobite"           //I dont have cenobite so will keep him here
];

// Shared sorter: mains first, then in-game order, then alphabetical fallback
window.DBD_sortByMainThenOrder = function(list, orderIds) {
  const idx = new Map(orderIds.map((id, i) => [String(id), i]));
  return [...(list || [])].sort((a, b) => {
    const am = a && a.main ? 1 : 0;
    const bm = b && b.main ? 1 : 0;
    if (am !== bm) return bm - am;

    const ai = idx.has(a?.id) ? idx.get(a.id) : 999999;
    const bi = idx.has(b?.id) ? idx.get(b.id) : 999999;
    if (ai !== bi) return ai - bi;

    // stable fallback for unknown/new ids
    return String(a?.name || a?.id || "").localeCompare(String(b?.name || b?.id || ""));
  });
};
function saveMissingLog(list) {
  localStorage.setItem(DBD_IMG.missingLogKey, JSON.stringify(list.slice(0, 500)));
}
function addMissing(entry) {
  const list = loadMissingLog();
  const id = `${entry.type}:${entry.name}:${entry.path}`;
  if (!list.some(x => x.id === id)) {
    list.unshift({ id, ...entry, ts: Date.now() });
    saveMissingLog(list);
  }
}
function attachImageFallback(imgEl, meta) {
  if (!imgEl) return;
  imgEl.addEventListener("error", () => {
    addMissing({ type: meta.type, name: meta.name, path: meta.intendedSrc });

    const placeholderAbs = location.origin + DBD_IMG.placeholder;
    if (imgEl.src !== placeholderAbs) imgEl.src = DBD_IMG.placeholder;

    const wrap = imgEl.closest(".killer") || imgEl.parentElement;
    if (wrap && !wrap.querySelector(".missing-img-badge")) {
      const badge = document.createElement("div");
      badge.className = "missing-img-badge";
      badge.textContent = "MISSING IMG";
      wrap.style.position = wrap.style.position || "relative";
      wrap.appendChild(badge);
    }
  }, { once: true });
}

window.DBD_attachImageFallback = attachImageFallback;
window.DBD_loadMissingLog = loadMissingLog;
window.DBD_clearMissingLog = () => localStorage.removeItem(DBD_IMG.missingLogKey);

// ================== HELPERS ==================
function toBasePath(p) {
  if (!p) return p;
  if (p.startsWith("http://") || p.startsWith("https://") || p.startsWith(DBD_BASE)) return p;
  if (p.startsWith("/")) return p;
  return DBD_BASE + p;
}
function cacheBust(url, version) {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${encodeURIComponent(version || Date.now())}`;
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}
function escapeAttr(s){
  return escapeHtml(s).replace(/"/g, "&quot;");
}
function getKNumberFromImgPath(p) {
  const m = String(p || "").match(/\/K(\d+)_/i);
  return m ? parseInt(m[1], 10) : 9999;
}
function getQueryK() {
  const u = new URL(location.href);
  return (u.searchParams.get("k") || "").trim();
}
function setQueryK(idOrEmpty) {
  const u = new URL(location.href);
  if (idOrEmpty) u.searchParams.set("k", idOrEmpty);
  else u.searchParams.delete("k");
  history.pushState({}, "", u.toString());
}

// ================== CLIP EMBEDS ==================
function normalizeMedalEmbedUrl(url) {
  const s = String(url || "");
  const m = s.match(/\/clips\/([A-Za-z0-9_-]+)/);
  if (m) return `https://medal.tv/clip/${m[1]}`;
  return s;
}
function renderClipEmbed(url) {
  const s = String(url || "");
  if (s.includes("medal.tv/")) {
    const embed = normalizeMedalEmbedUrl(s);
    return `
      <div class="clip-embed">
        <div style="left:0;width:100%;height:0;position:relative;padding-bottom:56.25%;">
          <iframe
            src="${escapeAttr(embed)}"
            style="top:0;left:0;width:100%;height:100%;position:absolute;border:0;"
            allowfullscreen
            scrolling="no"
            allow="autoplay; encrypted-media *; fullscreen *;">
          </iframe>
        </div>
      </div>
    `;
  }
  const yt = s.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([A-Za-z0-9_-]{6,})/);
  if (yt) {
    const id = yt[1];
    return `
      <div class="clip-embed">
        <div style="left:0;width:100%;height:0;position:relative;padding-bottom:56.25%;">
          <iframe
            src="https://www.youtube-nocookie.com/embed/${escapeAttr(id)}"
            style="top:0;left:0;width:100%;height:100%;position:absolute;border:0;"
            allowfullscreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture;">
          </iframe>
        </div>
      </div>
    `;
  }
  return `<p><a href="${escapeAttr(s)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s)}</a></p>`;
}

// ================== PERK ICON RENDERER ==================
const PERK_ALIASES = {
  "Barbecue & Chilli": "BBQ and Chili.png",
  "BBQ & Chilli": "BBQ and Chili.png",
  "BBQ & Chili": "BBQ and Chili.png",
  "Barbecue & Chili": "BBQ and Chili.png",
  "We're Gonna Live Forever": "We_re Gonna Live Forever.png"
};

function perkNameToFilename(perkName) {
  let name = String(perkName || "").trim();
  if (PERK_ALIASES[name]) return PERK_ALIASES[name];

  name = name.replace(/’/g, "'");
  name = name.replace(/:/g, "").replace(/'/g, "_");

  const andVersion = name.replace(/&/g, "and").replace(/\s+/g, " ").trim();
  return [name + ".png", andVersion + ".png"];
}

function renderPerkItem(perk) {
  let name = "";
  let iconFile = "";

  if (typeof perk === "string") name = perk;
  else if (perk && typeof perk === "object") { name = perk.name || ""; iconFile = perk.icon || ""; }

  name = String(name || "").trim();
  if (!name) return `<li>(invalid perk)</li>`;

  if (iconFile) {
    const url = PERK_ICON_BASE + iconFile;
    return `
      <li class="perk-item">
        <img class="perk-icon" src="${escapeAttr(url)}" alt="${escapeAttr(name)}"
             onerror="this.style.display='none'">
        <span>${escapeHtml(name)}</span>
      </li>
    `;
  }

  const candidates = perkNameToFilename(name);
  const list = Array.isArray(candidates) ? candidates : [candidates];
  const first = PERK_ICON_BASE + list[0];
  const second = list[1] ? (PERK_ICON_BASE + list[1]) : "";

  const onErr = second
    ? `if(!this.dataset.tried){this.dataset.tried=1;this.src='${second.replace(/'/g, "\\'")}';}else{this.style.display='none';}`
    : `this.style.display='none'`;

  return `
    <li class="perk-item">
      <img class="perk-icon" src="${escapeAttr(first)}" alt="${escapeAttr(name)}" onerror="${onErr}">
      <span>${escapeHtml(name)}</span>
    </li>
  `;
}

// ================== MODAL + KEYBOARD NAV ==================
let CURRENT_LIST = [];
let CURRENT_FILTERED = [];
let CURRENT_OPEN_ID = "";

function closeModal() {
  const modal = document.getElementById("killerModal");
  modal.classList.add("hidden");
  setQueryK("");
  CURRENT_OPEN_ID = "";
}

function openModalForKiller(k) {
  const modal = document.getElementById("killerModal");
  const nameEl = document.getElementById("modalName");
  const bodyEl = document.getElementById("modalBody");

  nameEl.textContent = `${k.name} — Prestige ${k.prestige || 0}`;

  const fav = k.favLoadout || { perks: [], addons: [] };
  const perks = fav.perks || [];
  const addons = fav.addons || [];
  const offering = fav.offering || "";
  const notes = fav.notes || "";
  const clips = k.clips || [];

  const perksHtml = perks.length
    ? `<ul class="perk-list">${perks.map(renderPerkItem).join("")}</ul>`
    : `<p class="muted">(no perks set)</p>`;

  const addonsHtml = addons.length
    ? `<ul>${addons.map(a => `<li>${escapeHtml(a)}</li>`).join("")}</ul>`
    : `<p class="muted">(no add-ons set)</p>`;

  const clipsHtml = clips.length
    ? clips.map(c => `${c.title ? `<p><b>${escapeHtml(c.title)}</b></p>` : ""}${renderClipEmbed(c.url)}`).join("")
    : `<p class="muted">(no clips yet)</p>`;

  bodyEl.innerHTML = `
    <div class="modal-section">
      <h3>Favorite Loadout</h3>
      <p><b>Perks</b></p>
      ${perksHtml}

      <p><b>Add-ons</b></p>
      ${addonsHtml}

      ${offering ? `<p><b>Offering:</b> ${escapeHtml(offering)}</p>` : ""}
      ${notes ? `<p><b>Notes:</b> ${escapeHtml(notes)}</p>` : ""}
    </div>

    <div class="modal-section">
      <h3>Clips</h3>
      ${clipsHtml}
    </div>
  `;

  modal.classList.remove("hidden");
  setQueryK(k.id);
  CURRENT_OPEN_ID = k.id;
}

function wireModalClose() {
  const modal = document.getElementById("killerModal");
  const closeBtn = document.getElementById("modalClose");
  if (closeBtn) closeBtn.onclick = closeModal;
  if (modal) modal.onclick = (e) => { if (e.target.id === "killerModal") closeModal(); };
}

function isModalOpen() {
  const modal = document.getElementById("killerModal");
  return modal && !modal.classList.contains("hidden");
}

function openByIndex(idx) {
  if (!CURRENT_FILTERED.length) return;
  const clamped = (idx + CURRENT_FILTERED.length) % CURRENT_FILTERED.length;
  const k = CURRENT_FILTERED[clamped];
  if (k) openModalForKiller(k);
}

function getOpenIndex() {
  if (!CURRENT_OPEN_ID) return -1;
  return CURRENT_FILTERED.findIndex(x => x.id === CURRENT_OPEN_ID);
}

function wireKeyboardNav() {
  document.addEventListener("keydown", (e) => {
    if (!isModalOpen()) return;

    // ESC closes
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
      return;
    }

    // avoid interfering while typing in inputs
    const tag = (document.activeElement && document.activeElement.tagName) ? document.activeElement.tagName.toLowerCase() : "";
    if (tag === "input" || tag === "textarea") return;

    // left/right arrows
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const idx = getOpenIndex();
      if (idx < 0) return;
      if (e.key === "ArrowLeft") openByIndex(idx - 1);
      else openByIndex(idx + 1);
    }
  });
}

// ================== PAGE LOGIC ==================
wireModalClose();
wireKeyboardNav();
if (!document.getElementById("killer-grid")) {
  // Not on the killers page; don't run killers logic here.
} else {
fetch(cacheBust(DBD_BASE + "killers.json", Date.now()))
  .then(r => r.json())
  .then(data => {
    const grid = document.getElementById("killer-grid");
    const updated = document.getElementById("updated");
    const searchInput = document.getElementById("searchInput");

    updated.textContent = "Last updated: " + data.updated;

    let owned = (data.killers || []).filter(k => k.owned);
    let notOwned = (data.killers || []).filter(k => !k.owned);

    owned = window.DBD_sortByMainThenOrder(owned, window.DBD_KILLER_ORDER_IDS);
    notOwned = window.DBD_sortByMainThenOrder(notOwned, window.DBD_KILLER_ORDER_IDS);
    CURRENT_LIST = [...owned, ...notOwned];

    function renderGrid(list) {
      grid.innerHTML = "";
      let notOwnedHeaderAdded = false;

      list.forEach(k => {
        if (!k.owned && !notOwnedHeaderAdded) {
          const h = document.createElement("h2");
          h.className = "section-title";
          h.textContent = "Not owned";
          grid.appendChild(h);
          notOwnedHeaderAdded = true;
        }

        const div = document.createElement("div");
        div.className = "killer" + (k.owned ? "" : " locked") + (k.main ? " main" : "");

        const rawSrc = (k.img && String(k.img).trim().length)
          ? k.img
          : `assets/dbd/killers/${k.id}.jpg`;

        const src = cacheBust(toBasePath(rawSrc), data.updated);

        div.innerHTML = `
          <img src="${src}" alt="${k.name}">
          <div class="killer-name ${k.nameshown === false ? "is-hidden" : ""}">${k.name}</div>
          ${!k.owned ? `<div class="locked-label">Not owned</div>` : ""}
          ${k.owned && k.prestige > 0 ? DBD_renderPrestigeBadge(k.prestige) : ""}
        `;

        const img = div.querySelector("img");
        if (img) {
          const intendedSrc = img.getAttribute("src") || img.src;
          window.DBD_attachImageFallback(img, { type:"killer", name:k.name, intendedSrc });
        }

        div.addEventListener("click", (e) => {
          const url = `${location.origin}${DBD_BASE}?k=${encodeURIComponent(k.id)}`;
          if (e.ctrlKey || e.metaKey) {
            window.open(url, "_blank");
            return;
          }
          openModalForKiller(k);
        });

        grid.appendChild(div);
      });
    }

    function applyFiltersAndRender() {
      const q = (searchInput?.value || "").toLowerCase().trim();
      CURRENT_FILTERED = CURRENT_LIST.filter(k => {
        if (!q) return true;
        return (k.name || "").toLowerCase().includes(q) || (k.id || "").toLowerCase().includes(q);
      });

      renderGrid(CURRENT_FILTERED);
    }

    searchInput?.addEventListener("input", applyFiltersAndRender);

    applyFiltersAndRender();

    const qk = getQueryK();
    if (qk) {
      const found = CURRENT_LIST.find(x => x.id === qk);
      if (found) openModalForKiller(found);
    }
  })
  .catch(err => console.error("Failed to load killers.json", err));
}
(function initNameToggle(){
  const KEY = "dbd_show_names";
  const btn = document.getElementById("toggleNamesBtn");
  if (!btn) return;

  function apply(show){
    document.body.classList.toggle("names-off", !show);
    btn.textContent = show ? "Turn names off" : "Turn names on";
  }

  const saved = localStorage.getItem(KEY);
  const show = saved === null ? true : saved === "1";
  apply(show);

  btn.addEventListener("click", () => {
    const nowShow = document.body.classList.contains("names-off"); // if currently off, turn on
    localStorage.setItem(KEY, nowShow ? "1" : "0");
    apply(nowShow);
  });
})();