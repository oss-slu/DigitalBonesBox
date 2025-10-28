// js/sidebar.js
const SIDEBAR_URL = "/templates/sidebar.html";
const HELP_URL    = "/templates/helpButton.html";

export async function initializeSidebar() {
  const toggleButton = document.getElementById("toggle-sidebar");
  const sidebarContainer = document.getElementById("sidebar-container");

  async function loadSidebar() {
    if (!sidebarContainer.innerHTML) {
      const res = await fetch(SIDEBAR_URL);
      if (!res.ok) { console.error("Sidebar fetch failed:", res.status, SIDEBAR_URL); return; }
      sidebarContainer.innerHTML = await res.text();
    }
  }

  if (toggleButton) {
    toggleButton.addEventListener("click", async () => {
      await loadSidebar();
      const el = document.getElementById("sidebar");
      if (el) el.style.left = (getComputedStyle(el).left === "0px") ? "-250px" : "0px";
    });
  }
}

export async function loadHelpButton() {
  const target = document.getElementById("help-button-container");
  if (!target) return;

  const res = await fetch(HELP_URL);
  if (!res.ok) { console.error("Help button fetch failed:", res.status, HELP_URL); return; }
  target.innerHTML = await res.text();

  const btn = document.getElementById("text-button-Help");
  const modal = document.getElementById("help-modal");
  const close = document.getElementById("close-help-modal");
  if (btn && modal && close) {
    btn.addEventListener("click", () => modal.classList.add("is-visible"));
    close.addEventListener("click", () => modal.classList.remove("is-visible"));
    document.addEventListener("keydown", (e) => e.key === "Escape" && modal.classList.remove("is-visible"));
  }
}
