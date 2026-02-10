// ================== CONFIG ==================
const DBD_BASE = "/deadbydaylight/"; // absolute base so pages in subfolders still work

const DBD_IMG = {
  placeholder: DBD_BASE + "assets/img/placeholder.webp",
  missingLogKey: "dbd_missing_images_v1",
};

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

// safe HTML helpers (ONE COPY ONLY)
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}
function escapeAttr(s){
  return escapeHtml(s).replace(/"/g, "&quot;");
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

  bodyEl.innerHTML = `
    <div class="modal-section">
      <h3>Favorite Loadout</h3>

      <p><b>Perks</b></p>
      ${perks.length
        ? `<ul>${perks.map(p => `<li>${escapeHtml(p)}</li>`).join("")}</ul>`
        : `<p class="muted">(no perks set)</p>`}

      <p><b>Add-ons</b></p>
      ${addons.length
        ? `<ul>${addons.map(a => `<li>${escapeHtml(a)}</li>`).join("")}</ul>`
        : `<p class="muted">(no add-ons set)</p>`}

      ${offering ? `<p><b>Offering:</b> ${escapeHtml(offering)}</p>` : ""}
      ${notes ? `<p><b>Notes:</b> ${escapeHtml(notes)}</p>` : ""}
    </div>

    <div class="modal-section">
      <h3>Clips</h3>
      ${clips.length
        ? `<ul>${clips.map(c =>
            `<li><a href="${escapeAttr(c.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(c.title || c.url)}</a></li>`
          ).join("")}</ul>`
        : `<p class="muted">(no clips yet)</p>`}
    </div>
  `;

  modal.classList.remove("hidden");
}

function wireModalClose() {
  const modal = document.getElementById("killerModal");
  const closeBtn = document.getElementById("modalClose");

  if (closeBtn) closeBtn.onclick = () => modal.classList.add("hidden");
  if (modal) {
    modal.onclick = (e) => {
      if (e.target.id === "killerModal") modal.classList.add("hidden");
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
    grid.innerHTML = "";

    const owned = data.killers.filter(k => k.owned);
    const notOwned = data.killers.filter(k => !k.owned);
    const ordered = [...owned, ...notOwned];

    let notOwnedHeaderAdded = false;

    ordered.forEach(k => {
      if (!k.owned && !notOwnedHeaderAdded) {
        const h = document.createElement("h2");
        h.className = "section-title";
        h.textContent = "Not owned";
        grid.appendChild(h);
        notOwnedHeaderAdded = true;
      }

      const div = document.createElement("div");
      div.className = "killer" + (k.owned ? "" : " locked");

      const rawSrc = (k.img && String(k.img).trim().length)
        ? k.img
        : `assets/dbd/killers/${k.id}.jpg`;

      const src = cacheBust(toBasePath(rawSrc), data.updated);

      div.innerHTML = `
        <img src="${src}" alt="${k.name}">
        <div class="killer-name">${k.name}</div>
        ${!k.owned ? `<div class="locked-label">Not owned</div>` : ""}
        ${k.owned && k.prestige > 0 ? `<div class="prestige">P${k.prestige}</div>` : ""}
      `;

      const img = div.querySelector("img");
      if (img) {
        const intendedSrc = img.getAttribute("src") || img.src;
        window.DBD_attachImageFallback(img, {
          type: "killer",
          name: k.name,
          intendedSrc
        });
      }

      // ✅ click opens modal (ctrl/cmd click reserved for future “open in new tab”)
      div.addEventListener("click", (e) => {
        if (e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        openModalForKiller(k);
      });

      grid.appendChild(div);
    });
  })
  .catch(err => {
    console.error("Failed to load killers.json", err);
  });
