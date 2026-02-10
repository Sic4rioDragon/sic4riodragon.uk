// ================== CONFIG ==================
const DBD_BASE = "/deadbydaylight/"; // IMPORTANT: absolute base so pages in subfolders still work

const DBD_IMG = {
  placeholder: DBD_BASE + "assets/img/placeholder.webp",
  // keep this if you want the debug page to show missing files:
  // (this is NOT "caching the site", only logging missing images)
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
 * @param {HTMLImageElement} imgEl
 * @param {{type:"survivor"|"killer", name:string, intendedSrc:string}} meta
 */
function attachImageFallback(imgEl, meta) {
  if (!imgEl) return;

  imgEl.addEventListener("error", () => {
    addMissing({ type: meta.type, name: meta.name, path: meta.intendedSrc });

    // replace with placeholder
    const placeholderAbs = location.origin + DBD_IMG.placeholder;
    if (imgEl.src !== placeholderAbs) imgEl.src = DBD_IMG.placeholder;

    // badge
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
  // If json already has absolute "/deadbydaylight/..." or "http..." keep it.
  if (!p) return p;
  if (p.startsWith("http://") || p.startsWith("https://") || p.startsWith(DBD_BASE)) return p;
  if (p.startsWith("/")) return p; // absolute from site root
  // otherwise treat as relative to /deadbydaylight/
  return DBD_BASE + p;
}

function cacheBust(url, version) {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${encodeURIComponent(version || Date.now())}`;
}

// ================== PAGE LOGIC ==================
fetch(cacheBust(DBD_BASE + "killers.json", Date.now()))
  .then(r => r.json())
  .then(data => {
    const grid = document.getElementById("killer-grid");
    const updated = document.getElementById("updated");

    updated.textContent = "Last updated: " + data.updated;

    // Clear grid in case script runs twice / hot reload
    grid.innerHTML = "";

    data.killers.forEach(k => {
      const div = document.createElement("div");
      div.className = "killer" + (k.owned ? "" : " locked");

      // Prefer k.img (CharPortraits), otherwise old fallback
      const rawSrc = (k.img && String(k.img).trim().length)
        ? k.img
        : `assets/dbd/killers/${k.id}.jpg`;

      // ✅ convert to absolute /deadbydaylight/... and add cache bust to avoid cached 404s
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

      grid.appendChild(div);
    });
  })
  .catch(err => {
    console.error("Failed to load killers.json", err);
  });
