// Converts @mentions to clickable Twitch links
function linkMentions(text) {
  return text.replace(/@([a-zA-Z0-9_]+)/g, (m, user) => {
    const u = user.toLowerCase();
    return `<a href="https://www.twitch.tv/${u}" target="_blank" rel="noopener">@${user}</a>`;
  });
}

function setTwitchEmbed() {
  const iframe = document.getElementById("twitchPlayer");
  if (!iframe) return;

  const parent = window.location.hostname; // sic4riodragon.uk
  const channel = "Sic4rioDragon";

  iframe.src = `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(parent)}&autoplay=false`;
}

async function loadPanels() {
  const res = await fetch("./panels.json", { cache: "no-store" });
  const data = await res.json();

  const aboutEl = document.getElementById("aboutText");
  const gridEl = document.getElementById("panelsGrid");

  if (aboutEl) aboutEl.innerHTML = linkMentions(data.about || "");

  if (gridEl) {
    gridEl.innerHTML = (data.panels || []).map(p => `
      <article class="panelCard">
        ${p.img ? `<img class="panelImg" src="${p.img}" alt="${p.title || ""}">` : ""}
        <div class="panelBody">${linkMentions(p.text || "")}</div>
      </article>
    `).join("");
  }
}

setTwitchEmbed();
loadPanels().catch(err => console.error("Panels load failed:", err));