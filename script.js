// --- DBD image fallback + missing tracker ---
// Keep this at the TOP so it exists before we render anything.
const DBD_IMG = {
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
 * Replaces broken images with placeholder, logs them, and shows a badge.
 * @param {HTMLImageElement} imgEl
 * @param {{type:"survivor"|"killer", name:string, intendedSrc:string}} meta
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


// -------------------- Page logic --------------------
fetch("killers.json")
  .then(r => r.json())
  .then(data => {
    const grid = document.getElementById("killer-grid");
    const updated = document.getElementById("updated");

    updated.textContent = "Last updated: " + data.updated;

    data.killers.forEach(k => {
      const div = document.createElement("div");
      div.className = "killer" + (k.owned ? "" : " locked");

      // ✅ IMPORTANT CHANGE:
      // If killers.json provides k.img (CharPortraits path), use that.
      // Otherwise fall back to the old convention.
      const src = (k.img && String(k.img).trim().length)
        ? k.img
        : `assets/dbd/killers/${k.id}.jpg`;

      div.innerHTML = `
        <img src="${src}" alt="${k.name}">
        <div class="killer-name">${k.name}</div>
        ${!k.owned ? `<div class="locked-label">Not owned</div>` : ""}
        ${k.owned && k.prestige > 0
          ? `<div class="prestige">P${k.prestige}</div>`
          : ""}
      `;

      // hook fallback + missing logging
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
