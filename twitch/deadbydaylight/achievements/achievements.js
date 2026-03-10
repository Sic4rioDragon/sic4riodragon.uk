const survivorUrl = "./survivors.json";
const killerUrl = "./killers.json";

const searchEl = document.getElementById("search");
const showProgressEl = document.getElementById("showProgress");
const survivorGroupsEl = document.getElementById("survivorGroups");
const killerGroupsEl = document.getElementById("killerGroups");
const survivorCountEl = document.getElementById("survivorCount");
const killerCountEl = document.getElementById("killerCount");
const groupTemplate = document.getElementById("groupTemplate");
const cardTemplate = document.getElementById("cardTemplate");

let state = { survivors: null, killers: null };

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function makeThumb(achievement) {
  const image = achievement.image;
  if (image) {
    const img = document.createElement("img");
    img.className = "thumb";
    img.src = image;
    img.alt = achievement.name;
    img.onerror = () => img.replaceWith(makeFallbackThumb(achievement.name));
    return img;
  }
  return makeFallbackThumb(achievement.name);
}

function makeFallbackThumb(name) {
  const div = document.createElement("div");
  div.className = "thumb fallback";
  div.textContent = (name || "?").trim().charAt(0).toUpperCase();
  return div;
}

function makeEmptyState(text) {
  const div = document.createElement("div");
  div.className = "empty-state";
  div.textContent = text;
  return div;
}

function renderSide(data, mountEl, countEl) {
  mountEl.innerHTML = "";
  const query = searchEl.value.trim().toLowerCase();
  const showProgress = showProgressEl.checked;

  let visibleCount = 0;
  let visibleGroups = 0;

  data.groups.forEach(group => {
    const visibleAchievements = group.achievements.filter(a => {
      if (a.unlocked) return false;
      const haystack = [
        group.character,
        a.character,
        a.name,
        a.description,
        a.progress?.current,
        a.progress?.target
      ].join(" ").toLowerCase();
      return !query || haystack.includes(query);
    });

    if (!visibleAchievements.length) return;
    visibleGroups += 1;
    visibleCount += visibleAchievements.length;

    const groupNode = groupTemplate.content.firstElementChild.cloneNode(true);
    const titleBtn = groupNode.querySelector(".group-title");
    const cardsEl = groupNode.querySelector(".cards");
    titleBtn.textContent = `${group.character} (${visibleAchievements.length})`;

    visibleAchievements.forEach(a => {
      const card = cardTemplate.content.firstElementChild.cloneNode(true);
      card.querySelector(".thumb")?.remove();
      card.querySelector(".card-top").prepend(makeThumb(a));
      card.querySelector(".character").textContent = a.character || group.character || "Unknown";
      card.querySelector("h3").textContent = a.name;
      card.querySelector(".desc").textContent = a.description;

      const progressText = a.progress
        ? `${a.progress.percent}% — ${a.progress.current} / ${a.progress.target}`
        : "No progress data";
      card.querySelector(".progress-text").textContent = progressText;
      card.querySelector(".progress-fill").style.width = `${Math.min(a.progress?.percent || 0, 100)}%`;

      if (!showProgress) {
        card.querySelector(".progress-row").classList.add("hidden");
      }

      cardsEl.appendChild(card);
    });

    titleBtn.addEventListener("click", () => {
      cardsEl.classList.toggle("hidden");
    });

    mountEl.appendChild(groupNode);
  });

  if (!visibleCount) {
    mountEl.appendChild(makeEmptyState("No locked achievements match the current filters."));
  }

  countEl.textContent = `${visibleCount} shown in ${visibleGroups} groups`;
}

function render() {
  if (!state.survivors || !state.killers) return;
  renderSide(state.survivors, survivorGroupsEl, survivorCountEl);
  renderSide(state.killers, killerGroupsEl, killerCountEl);
}

async function init() {
  const [survivors, killers] = await Promise.all([
    fetch(survivorUrl).then(r => {
      if (!r.ok) throw new Error(`Failed to load survivors.json (${r.status})`);
      return r.json();
    }),
    fetch(killerUrl).then(r => {
      if (!r.ok) throw new Error(`Failed to load killers.json (${r.status})`);
      return r.json();
    })
  ]);

  state.survivors = survivors;
  state.killers = killers;
  render();
}

searchEl.addEventListener("input", render);
showProgressEl.addEventListener("change", render);
init().catch(err => {
  survivorGroupsEl.innerHTML = `<p class="empty-state">Failed to load achievements JSON.</p>`;
  killerGroupsEl.innerHTML = `<p class="empty-state">${escapeHtml(err.message || String(err))}</p>`;
});
