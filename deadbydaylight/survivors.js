(() => {
const DBD_BASE = "/deadbydaylight/";

const PERK_ICON_BASE =
  "https://raw.githubusercontent.com/snoggles/dbd-perk-emoji/main/images/input/";

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

// Deep link via ?s=
function getQueryS() {
  const u = new URL(location.href);
  return (u.searchParams.get("s") || "").trim();
}
function setQueryS(idOrEmpty) {
  const u = new URL(location.href);
  if (idOrEmpty) u.searchParams.set("s", idOrEmpty);
  else u.searchParams.delete("s");
  history.pushState({}, "", u.toString());
}

// Medal/YT embeds
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

// Perks: strings work; optional {name, icon} works too
function renderPerkItem(perk) {
  if (typeof perk === "string") return `<li>${escapeHtml(perk)}</li>`;
  if (perk && typeof perk === "object") {
    const name = perk.name || "";
    const icon = perk.icon || "";
    if (icon) {
      const url = PERK_ICON_BASE + icon;
      return `
        <li class="perk-item">
          <img class="perk-icon" src="${escapeAttr(url)}" alt="${escapeAttr(name)}"
               onerror="this.style.display='none'">
          <span>${escapeHtml(name)}</span>
        </li>
      `;
    }
    return `<li>${escapeHtml(name)}</li>`;
  }
  return `<li>(invalid perk)</li>`;
}

function openModalForSurvivor(s) {
  const modal = document.getElementById("killerModal");
  const nameEl = document.getElementById("modalName");
  const bodyEl = document.getElementById("modalBody");

  nameEl.textContent = `${s.name} — Prestige ${s.prestige || 0}`;

  const fav = s.favLoadout || { perks: [], addons: [] };
  const perks = fav.perks || [];
  const items = fav.addons || [];
  const notes = fav.notes || "";
  const clips = s.clips || [];

  bodyEl.innerHTML = `
    <div class="modal-section">
      <h3>Favorite Loadout</h3>
      <p><b>Perks</b></p>
      ${perks.length ? `<ul class="perk-list">${perks.map(renderPerkItem).join("")}</ul>` : `<p class="muted">(no perks set)</p>`}

      <p><b>Items / Add-ons</b></p>
      ${items.length ? `<ul>${items.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : `<p class="muted">(none set)</p>`}

      ${notes ? `<p><b>Notes:</b> ${escapeHtml(notes)}</p>` : ""}
    </div>

    <div class="modal-section">
      <h3>Clips</h3>
      ${clips.length ? clips.map(c => `${c.title ? `<p><b>${escapeHtml(c.title)}</b></p>` : ""}${renderClipEmbed(c.url)}`).join("") : `<p class="muted">(no clips yet)</p>`}
    </div>
  `;

  modal.classList.remove("hidden");
  setQueryS(s.id);
}

function wireModalClose() {
  const modal = document.getElementById("killerModal");
  const closeBtn = document.getElementById("modalClose");
  if (closeBtn) closeBtn.onclick = () => { modal.classList.add("hidden"); setQueryS(""); };
  if (modal) modal.onclick = (e) => {
    if (e.target.id === "killerModal") { modal.classList.add("hidden"); setQueryS(""); }
  };
}

wireModalClose();

fetch(cacheBust(DBD_BASE + "survivors.json", Date.now()))
  .then(r => r.json())
  .then(data => {
    const grid = document.getElementById("survivor-grid");
    const updated = document.getElementById("updated");
    updated.textContent = "Last updated: " + data.updated;

    const list = data.survivors || [];
    const ordered = window.DBD_sortByMainThenOrder(list, window.DBD_SURVIVOR_ORDER_IDS);
    const searchInput = document.getElementById("searchInput");

    function renderGrid(arr) {
      grid.innerHTML = "";

      arr.forEach(s => {
        const div = document.createElement("div");
        div.className = "killer" + (s.main ? " main" : "");

        const src = cacheBust(toBasePath(s.img), data.updated);

        div.innerHTML = `
        <img src="${src}" alt="${s.name}">
        <div class="killer-name ${s.nameshown === false ? "is-hidden" : ""}">${s.name}</div>
        ${s.prestige > 0 ? DBD_renderPrestigeBadge(s.prestige) : ""}
        `;
        
        const imgEl = div.querySelector("img");
        if (imgEl && window.DBD_attachImageFallback) {
          const intendedSrc = imgEl.getAttribute("src") || imgEl.src;
          window.DBD_attachImageFallback(imgEl, {
            type: "survivor",
            name: s.name,
            intendedSrc
          });
        }

        div.addEventListener("click", (e) => {
          const url = `${location.origin}${DBD_BASE}survivors.html?s=${encodeURIComponent(s.id)}`;
          if (e.ctrlKey || e.metaKey) {
            window.open(url, "_blank");
            return;
          }
          openModalForSurvivor(s);
        });

        grid.appendChild(div);
      });
    }

    function applyFiltersAndRender() {
      const q = (searchInput?.value || "").toLowerCase().trim();
      const filtered = ordered.filter(s => {
        if (!q) return true;
        return (s.name || "").toLowerCase().includes(q) || (s.id || "").toLowerCase().includes(q);
      });
      renderGrid(filtered);
    }

    searchInput?.addEventListener("input", applyFiltersAndRender);

    applyFiltersAndRender();

    const qs = getQueryS();
    if (qs) {
      const found = ordered.find(x => x.id === qs);
      if (found) openModalForSurvivor(found);
    }
  })
  .catch(err => console.error("Failed to load survivors.json", err));
})();