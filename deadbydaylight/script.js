// --- DBD image fallback + missing tracker ---
// Uses localStorage so your /deadbydaylight/debug page can list missing files.
const DBD_IMG = {
  // You are using placeholder.webp (recommended)
  placeholder: "/deadbydaylight/assets/img/placeholder.webp",
  missingLogKey: "dbd_missing_images_v1",
};

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
 * Call this AFTER you set <img src="..."> for a character.
 * It will replace broken images with placeholder + show a notice badge.
 *
 * @param {HTMLImageElement} imgEl
 * @param {{type:"survivor"|"killer", name:string, intendedSrc:string}} meta
 */
function attachImageFallback(imgEl, meta) {
  if (!imgEl) return;

  imgEl.addEventListener("error", () => {
    // log
    addMissing({ type: meta.type, name: meta.name, path: meta.intendedSrc });

    // replace with placeholder
    const placeholderAbs = location.origin + DBD_IMG.placeholder;
    if (imgEl.src !== placeholderAbs) {
      imgEl.src = DBD_IMG.placeholder;
    }

    // visual notice (adds a small "MISSING" tag near the image)
    const wrap =
      imgEl.closest(".dbd-char") ||
      imgEl.closest(".killer") ||
      imgEl.parentElement;

    if (wrap && !wrap.querySelector(".missing-img-badge")) {
      const badge = document.createElement("div");
      badge.className = "missing-img-badge";
      badge.textContent = "MISSING IMG";
      wrap.style.position = wrap.style.position || "relative";
      wrap.appendChild(badge);
    }
  }, { once: true });
}

// Expose for debug page or future expansions
window.DBD_attachImageFallback = attachImageFallback;
window.DBD_loadMissingLog = loadMissingLog;
window.DBD_clearMissingLog = () => localStorage.removeItem(DBD_IMG.missingLogKey);


// -------------------- Existing page logic --------------------
fetch("killers.json")
  .then(r => r.json())
  .then(data => {
    const grid = document.getElementById("killer-grid");
    const updated = document.getElementById("updated");

    updated.textContent = "Last updated: " + data.updated;

    data.killers.forEach(k => {
      const div = document.createElement("div");
      div.className = "killer" + (k.owned ? "" : " locked");

      // Keep your existing markup style (no unnecessary rewrites)
      div.innerHTML = `
        <img src="assets/dbd/killers/${k.id}.jpg" alt="${k.name}">
        <div class="killer-name">${k.name}</div>
        ${!k.owned ? `<div class="locked-label">Not owned</div>` : ""}
        ${k.owned && k.prestige > 0
          ? `<div class="prestige">P${k.prestige}</div>`
          : ""}
      `;

      // ✅ Hook the fallback + missing log
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
  });
