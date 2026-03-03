const GRID = document.getElementById("grid");
const SEARCH = document.getElementById("searchInput");
const CHALLENGE_LIST = document.getElementById("challengeList");
const NIGHTLIGHT_LINK = document.getElementById("nightlightLink");

async function loadChallenges() {
  const res = await fetch("./challenges.json", { cache: "no-store" });
  return await res.json();
}

function renderChallenges(data) {
  if (!CHALLENGE_LIST) return;

  const external = (data.external || []).find(x => x.id === "nightlight-buildchallenge");
  if (external && NIGHTLIGHT_LINK) NIGHTLIGHT_LINK.href = external.url;

  const list = [...(data.challenges || [])]
    .sort((a, b) => (a.enabled === false) - (b.enabled === false)); // enabled first

  CHALLENGE_LIST.innerHTML = list.map(c => {
    const disabled = c.enabled === false;
    const metaBits = [];

    if (c.notes) metaBits.push(c.notes);
    if (disabled && c.why) metaBits.push(`Disabled: ${c.why}`);

    const wl = (c.killerWhitelist || []).length;
    const bl = (c.killerBlacklist || []).length;
    if (wl || bl) metaBits.push(`Works with some killers (rules apply)`);

    return `
      <div class="challengeItem ${disabled ? "disabled" : ""}">
        <div class="name">${c.name}</div>
        ${metaBits.length ? `<div class="meta">${metaBits.join("<br>")}</div>` : ""}
      </div>
    `;
  }).join("");
}
async function loadKillersMerged() {
  // absolute paths = no relative path headaches on GitHub Pages
  const [baseRes, overlayRes] = await Promise.all([
    fetch("/deadbydaylight/killers.json", { cache: "no-store" }),
    fetch("/twitch/deadbydaylight/killers.json", { cache: "no-store" })
  ]);

  if (!baseRes.ok) throw new Error(`Base killers.json failed: ${baseRes.status}`);
  if (!overlayRes.ok) throw new Error(`Overlay killers.json failed: ${overlayRes.status}`);

  const base = await baseRes.json();       // { killers: [...] }
  const overlay = await overlayRes.json(); // { killers: [...] }

  const overlayMap = new Map((overlay.killers || []).map(k => [k.id, k]));

  return (base.killers || []).map(k => ({
    ...k,
    ...(overlayMap.get(k.id) || {})
  }));
}
function isSupported(k) {
  // supported unless explicitly false
  return k.support !== false;
}

function isEnabled(k) {
  // enabled only if owned + supported
  return k.owned === true && isSupported(k);
}

function render(killers, query = "") {
  const q = query.trim().toLowerCase();

  let list = killers.slice();

  if (q) {
    list = list.filter(k =>
      (k.name || "").toLowerCase().includes(q) ||
      (k.id || "").toLowerCase().includes(q)
    );
  }

  // push disabled to bottom
  list.sort((a, b) => {
    const ae = isEnabled(a) ? 0 : 1;
    const be = isEnabled(b) ? 0 : 1;
    return ae - be;
  });

  GRID.innerHTML = list.map(k => {
    const disabled = !isEnabled(k);
    const why = (k.owned !== true) ? "Unowned" : (k.why || (k.support === false ? "Not supported right now" : ""));
    return `
      <article class="charCard ${disabled ? "disabled" : ""}" aria-label="${k.name}">
        <div class="charImgWrap">
          <img class="charImg" src="/deadbydaylight/${k.img}" alt="${k.name}" loading="lazy">
        </div>
        <div class="charName">${k.name}</div>
        ${why ? `<div class="why">${why}</div>` : ""}
      </article>
    `;
  }).join("");
}
async function main() {
  try {
    const challenges = await loadChallenges();
    renderChallenges(challenges);

    const killers = await loadKillersMerged();
    render(killers, "");

    SEARCH?.addEventListener("input", () => render(killers, SEARCH.value));
  } catch (err) {
    console.error("Failed to load data", err);
    GRID.innerHTML = `<div style="opacity:.8;padding:12px;">Failed to load killers list.</div>`;
  }
}

main();
