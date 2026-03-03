// /twitch/deadbydaylight/dbd.js

const GRID = document.getElementById("killer-grid");
const SEARCH = document.getElementById("searchInput");
const CHALLENGE_LIST = document.getElementById("challengeList");

// ---------- Challenges ----------
async function loadChallenges() {
  const res = await fetch("./challenges.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`challenges.json failed: ${res.status}`);
  return await res.json();
}

function renderChallenges(data) {
  if (!CHALLENGE_LIST) return;

  const list = (data.challenges || [])
    .slice()
    .sort((a, b) => (a.enabled === false) - (b.enabled === false)); // enabled first

  CHALLENGE_LIST.innerHTML = list
    .map((c) => {
      const disabled = c.enabled === false;
      const metaBits = [];

      if (c.notes) metaBits.push(c.notes);
      if (disabled && c.why) metaBits.push(`Disabled: ${c.why}`);

      const wl = (c.killerWhitelist || []).length;
      const bl = (c.killerBlacklist || []).length;
      if (wl || bl) metaBits.push(`Works with some killers (rules apply)`);

      return `
        <div class="challengeItem ${disabled ? "disabled" : ""}">
          <div class="name">${escapeHtml(c.name || "")}</div>
          ${metaBits.length ? `<div class="meta">${metaBits.map(escapeHtml).join("<br>")}</div>` : ""}
        </div>
      `;
    })
    .join("");
}

// ---------- Killers merge ----------
async function loadKillersMerged() {
  const [baseRes, overlayRes] = await Promise.all([
    fetch("/deadbydaylight/killers.json", { cache: "no-store" }),
    fetch("./killers.json", { cache: "no-store" }),
  ]);

  if (!baseRes.ok) throw new Error(`Base killers.json failed: ${baseRes.status}`);
  if (!overlayRes.ok) throw new Error(`Overlay killers.json failed: ${overlayRes.status}`);

  const base = await baseRes.json(); // { killers: [...] }
  const overlay = await overlayRes.json(); // { killers: [...] }

  const overlayMap = new Map((overlay.killers || []).map((k) => [k.id, k]));

  return (base.killers || []).map((k) => ({
    ...k,
    ...(overlayMap.get(k.id) || {}),
  }));
}

function isSupported(k) {
  return k.support !== false; // default supported
}
function isEnabled(k) {
  return k.owned === true && isSupported(k);
}

// ---------- Render ----------
function renderKillers(killers, query = "") {
  const q = query.trim().toLowerCase();

  let list = (killers || []).slice();

  if (q) {
    list = list.filter(
      (k) =>
        (k.name || "").toLowerCase().includes(q) ||
        (k.id || "").toLowerCase().includes(q)
    );
  }

  const enabled = list.filter(isEnabled);
  const disabled = list.filter((k) => !isEnabled(k));

  const renderGroup = (arr) =>
    arr
      .map((k) => {
        const off = !isEnabled(k);
        const why =
          k.owned !== true
            ? "Unowned"
            : (k.why || (k.support === false ? "Not supported right now" : ""));

        // IMPORTANT:
        // base killers.json has img like "assets/dbd/CharPortraits/..."
        // we want that to resolve from site root:
        const imgSrc = "/" + String(k.img || "").replace(/^\/+/, "");

        return `
          <article class="charCard ${off ? "disabled" : ""}" aria-label="${escapeHtml(k.name || "")}">
            <div class="charImgWrap">
              <img class="charImg" src="${imgSrc}" alt="${escapeHtml(k.name || "")}" loading="lazy">
            </div>
            <div class="charName">${escapeHtml(k.name || "")}</div>
            ${why ? `<div class="why">${escapeHtml(why)}</div>` : ""}
          </article>
        `;
      })
      .join("");

  GRID.innerHTML =
    renderGroup(enabled) +
    (disabled.length
      ? `<div class="grid-divider">Disabled / Unowned</div>${renderGroup(disabled)}`
      : "");
}

// ---------- helpers ----------
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ---------- main ----------
async function main() {
  try {
    const challenges = await loadChallenges();
    renderChallenges(challenges);

    const killers = await loadKillersMerged();
    renderKillers(killers, "");

    SEARCH?.addEventListener("input", () => renderKillers(killers, SEARCH.value));
  } catch (err) {
    console.error("Failed to load data", err);
    GRID.innerHTML = `<div style="opacity:.8;padding:12px;">Failed to load killers list.</div>`;
  }
}

main();