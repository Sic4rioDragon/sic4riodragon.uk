// ================== CONFIG ==================
const DBD_BASE = "/deadbydaylight/"; // absolute base so pages in subfolders still work

const DBD_IMG = {
  placeholder: DBD_BASE + "assets/img/placeholder.webp",
  missingLogKey: "dbd_missing_images_v1",
};

// Perk icons (optional): put raw GitHub base here if you want.
const PERK_ICON_BASE =
  "https://raw.githubusercontent.com/snoggles/dbd-perk-emoji/main/images/input/";

// Favorites storage
const FAV_KEY = "dbd_favs_v1";

// ================== MISSING IMAGE LOG ==================
function loadMissingLog() {
  try { return JSON.parse(localStorage.getItem(DBD_IMG.missingLogKey) || "[]"); }
  catch { return []; }
}
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

/**
 * Replaces broken images with placeholder, logs them, and shows a badge.
 */
function attachImageFallback(imgEl, meta) {
  if (!imgEl) return;

  imgEl.addEventListener("error", () => {
    addMissing({ type: meta.type, name: meta.name, path: meta.intendedSrc });

    const placeholderAbs = location.origin + DBD_IMG.placeholder;
    if (imgEl.src !== placeholderAbs) imgEl.src = DBD_IMG.placeholder;

    const wrap = imgEl.closest(".killer") || imgEl.closest(".dbd-char") || imgEl.parentElement;
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

// safe HTML helpers
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}
function escapeAttr(s){
  return escapeHtml(s).replace(/"/g, "&quot;");
}

// Favorites
function loadFavs() {
  try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]")); }
  catch { return new Set(); }
}
function saveFavs(favsSet) {
  localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(favsSet)));
}

// “In-game-ish” order using K## in filename
function getKNumberFromImgPath(p) {
  const m = String(p || "").match(/\/K(\d+)_/i);
  return m ? parseInt(m[1], 10) : 9999;
}

// Deep-link modal as a “page” using ?k=huntress
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
  // supports: https://medal.tv/games/.../clips/<id>
  // embed uses: https://medal.tv/clip/<id>
  const s = String(url || "");
  const m = s.match(/\/clips\/([A-Za-z0-9_-]+)/);
  if (m) return `https://medal.tv/clip/${m[1]}`;
  return s;
}

function renderClipEmbed(url) {
  const s = String(url || "");

  // Medal
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

  // YouTube (basic)
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

  // fallback link
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

  // alias first
  if (PERK_ALIASES[name]) return PERK_ALIASES[name];

  // normalize curly apostrophes
  name = name.replace(/’/g, "'");

  // match pack rules
  name = name
    .replace(/:/g, "")      // remove colons
    .replace(/'/g, "_");    // apostrophe -> underscore (We'll -> We_ll)

  // common swap: "&" -> "and" (only if needed)
  // (we don't force it because many perks don't use &)
  const andVersion = name.replace(/&/g, "and").replace(/\s+/g, " ").trim();

  // return both candidates (primary first)
  return [name + ".png", andVersion + ".png"];
}

function renderPerkItem(perk) {
  // perk can be:
  //  - "Lethal Pursuer"
  //  - { name: "Lethal Pursuer" }  (optional)
  //  - { name: "...", icon: "Exact File.png" } (overrides)
  let name = "";
  let iconFile = "";

  if (typeof perk === "string") {
    name = perk;
  } else if (perk && typeof perk === "object") {
    name = perk.name || "";
    iconFile = perk.icon || "";
  }

  name = String(name || "").trim();
  if (!name) return `<li>(invalid perk)</li>`;

  // If user provided an exact filename, use it.
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

  // Otherwise, auto-resolve filename(s)
  const candidates = perkNameToFilename(name);
  const list = Array.isArray(candidates) ? candidates : [candidates];

  // Use the first candidate; if it fails, swap to second; if that fails, hide icon
  const first = PERK_ICON_BASE + list[0];
  const second = list[1] ? (PERK_ICON_BASE + list[1]) : "";

  const onErr = second
    ? `if(!this.dataset.tried){this.dataset.tried=1;this.src='${second.replace(/'/g, "\\'")}';}else{this.style.display='none';}`
    : `this.style.display='none'`;

  return `
    <li class="perk-item">
      <img class="perk-icon" src="${escapeAttr(first)}" alt="${escapeAttr(name)}"
           onerror="${onErr}">
      <span>${escapeHtml(name)}</span>
    </li>
  `;
}

// ================== MODAL ==================
function openModalForKiller(k) {
  const modal = document.getElementById("killerModal");
  const nameEl = document.getElementById("modalName");
  const bodyEl = document.getElementById("modalBody");

  nameEl.textContent = k.name;

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
    ? clips.map(c => {
        const title = c.title ? `<p><b>${escapeHtml(c.title)}</b></p>` : "";
        return `${title}${renderClipEmbed(c.url)}`;
      }).join("")
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
}

function wireModalClose() {
  const modal = document.getElementById("killerModal");
  const closeBtn = document.getElementById("modalClose");

  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.classList.add("hidden");
      setQueryK("");
    };
  }
  if (modal) {
    modal.onclick = (e) => {
      if (e.target.id === "killerModal") {
        modal.classList.add("hidden");
        setQueryK("");
      }
    };
  }
}

// ================== PAGE LOGIC ==================
wireModalClose();

fetch(cacheBust(DBD_BASE + "killers.json", Date.now()))
  .then(r => r.json())
  .then(data => {
    const grid = document.getElementById("killer-grid");
    const updated = document.getElementById("updated");

    updated.textContent = "Last updated: " + data.updated;

    const favs = loadFavs();

    // Owned first, then not-owned. Within each group, sort by K##
    const owned = data.killers.filter(k => k.owned);
    const notOwned = data.killers.filter(k => !k.owned);

    owned.sort((a,b) => getKNumberFromImgPath(a.img) - getKNumberFromImgPath(b.img));
    notOwned.sort((a,b) => getKNumberFromImgPath(a.img) - getKNumberFromImgPath(b.img));

    const currentList = [...owned, ...notOwned];

    const searchInput = document.getElementById("searchInput");
    const favOnlyToggle = document.getElementById("favOnlyToggle");

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

        const isFav = favs.has(k.id);

        const div = document.createElement("div");
        div.className =
        "killer" +
        (k.owned ? "" : " locked") +
        (isFav ? " fav" : "") +
        (k.main ? " main" : "");

        const rawSrc = (k.img && String(k.img).trim().length)
          ? k.img
          : `assets/dbd/killers/${k.id}.jpg`;

        const src = cacheBust(toBasePath(rawSrc), data.updated);

        div.innerHTML = `
          <button class="fav-btn ${isFav ? "on" : ""}" title="Favorite">★</button>
          <img src="${src}" alt="${k.name}">
          <div class="killer-name">${k.name}</div>
          ${!k.owned ? `<div class="locked-label">Not owned</div>` : ""}
          ${k.owned && k.prestige > 0 ? `<div class="prestige">P${k.prestige}</div>` : ""}
        `;

        // image fallback
        const img = div.querySelector("img");
        if (img) {
          const intendedSrc = img.getAttribute("src") || img.src;
          window.DBD_attachImageFallback(img, { type:"killer", name:k.name, intendedSrc });
        }

        // favorite toggle
        const favBtn = div.querySelector(".fav-btn");
        favBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (favs.has(k.id)) favs.delete(k.id);
          else favs.add(k.id);
          saveFavs(favs);
          applyFiltersAndRender();
        });

        // click:
        // normal click => modal
        // ctrl/cmd click => open in new tab with deep link
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
      const favOnly = !!favOnlyToggle?.checked;

      const filtered = currentList.filter(k => {
        if (favOnly && !favs.has(k.id)) return false;
        if (!q) return true;
        return (k.name || "").toLowerCase().includes(q) || (k.id || "").toLowerCase().includes(q);
      });

      renderGrid(filtered);
    }

    searchInput?.addEventListener("input", applyFiltersAndRender);
    favOnlyToggle?.addEventListener("change", applyFiltersAndRender);

    // First render
    applyFiltersAndRender();

    // Open deep-linked killer if present
    const qk = getQueryK();
    if (qk) {
      const found = currentList.find(x => x.id === qk);
      if (found) openModalForKiller(found);
    }
  })
  .catch(err => {
    console.error("Failed to load killers.json", err);
  });
