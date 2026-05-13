const DATA_URL = "/data/home.json";

const fallbackData = {
  heroText: "Gamer, server admin, bot dev, and self-hosting chaos enjoyer. This is the hub for my public projects, tools, communities, and old pages I still want to keep around.",
  aboutText: "Hey, I’m Sic4rioDragon. I build small websites, Discord bots, game tools, server utilities, and whatever else I end up needing for my communities or games.",
  heroButtons: [
    { label: "View projects", url: "#projects", style: "primary" },
    { label: "Links hub", url: "/links/" },
    { label: "Archive", url: "/archive/" }
  ],
  stats: [
    { value: "DBD", label: "tools + mini sites" },
    { value: "DayZ", label: "servers + guesser" },
    { value: "Bots", label: "Discord automation" },
    { value: "Web", label: "subdomain projects" }
  ],
  projects: [],
  siteLinks: [],
  communities: [],
  archive: [],
  contact: []
};

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setTextFields(data) {
  document.querySelectorAll("[data-home-field]").forEach((el) => {
    const key = el.dataset.homeField;
    if (data[key]) el.textContent = data[key];
  });
}

function renderHeroButtons(items = []) {
  const wrap = document.querySelector('[data-home-list="heroButtons"]');
  if (!wrap) return;

  wrap.innerHTML = items.map((item) => `
    <a class="button-link ${item.style === "primary" ? "primary" : ""}" href="${escapeHTML(item.url)}">
      ${escapeHTML(item.label)}
    </a>
  `).join("");
}

function renderStats(items = []) {
  const wrap = document.querySelector('[data-home-list="stats"]');
  if (!wrap) return;

  wrap.innerHTML = items.map((item) => `
    <div class="stat-card">
      <strong>${escapeHTML(item.value)}</strong>
      <span>${escapeHTML(item.label)}</span>
    </div>
  `).join("");
}

function renderProjects(items = []) {
  const wrap = document.querySelector('[data-home-list="projects"]');
  if (!wrap) return;

  if (!items.length) {
    wrap.innerHTML = `<div class="loading-note">No projects added yet.</div>`;
    return;
  }

  wrap.innerHTML = items.map((project) => {
    const tags = (project.tags || []).map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join("");
    const statusClass = String(project.status || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const content = `
      <div class="project-top">
        <div>
          <div class="project-icon">${escapeHTML(project.icon || "◆")}</div>
          <h3>${escapeHTML(project.title)}</h3>
        </div>
        ${project.status ? `<span class="status-pill ${statusClass}">${escapeHTML(project.status)}</span>` : ""}
      </div>
      <p>${escapeHTML(project.description)}</p>
      ${tags ? `<div class="tag-row">${tags}</div>` : ""}
    `;

    if (project.url) {
      return `<a class="project-card" href="${escapeHTML(project.url)}">${content}</a>`;
    }

    return `<article class="project-card">${content}</article>`;
  }).join("");
}

function renderLinkGrid(key, className = "link-card") {
  return (items = []) => {
    const wrap = document.querySelector(`[data-home-list="${key}"]`);
    if (!wrap) return;

    if (!items.length) {
      wrap.innerHTML = `<div class="loading-note">Nothing added yet.</div>`;
      return;
    }

    wrap.innerHTML = items.map((item) => `
      <a class="${className}" href="${escapeHTML(item.url)}" ${item.external ? 'target="_blank" rel="noopener"' : ""}>
        <strong>${escapeHTML(item.label)}</strong>
        <span>${escapeHTML(item.description || item.url)}</span>
      </a>
    `).join("");
  };
}

function render(data) {
  setTextFields(data);
  renderHeroButtons(data.heroButtons);
  renderStats(data.stats);
  renderProjects(data.projects);
  renderLinkGrid("siteLinks")(data.siteLinks);
  renderLinkGrid("communities", "stack-item")(data.communities);
  renderLinkGrid("archive", "stack-item")(data.archive);
  renderLinkGrid("contact")(data.contact);
}

async function loadHomeData() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    render({ ...fallbackData, ...data });
  } catch (err) {
    console.warn("Failed to load /data/home.json", err);
    render(fallbackData);

    const projects = document.querySelector('[data-home-list="projects"]');
    if (projects) {
      projects.insertAdjacentHTML("afterbegin", `<div class="error-note">Could not load /data/home.json. Showing fallback content.</div>`);
    }
  }
}

function setupNav() {
  const button = document.querySelector(".nav-toggle");
  const links = document.querySelector("[data-nav-links]");
  if (!button || !links) return;

  button.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    button.setAttribute("aria-expanded", String(open));
  });

  links.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      links.classList.remove("open");
      button.setAttribute("aria-expanded", "false");
    });
  });
}

document.querySelectorAll("[data-year]").forEach((el) => {
  el.textContent = String(new Date().getFullYear());
});

setupNav();
loadHomeData();