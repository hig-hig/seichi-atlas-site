import { sendRouteEvent } from "./routeAnalytics.js";

export function setupRouteExitOptions() {
  document.querySelectorAll("[data-exit-option]").forEach((root) => {
    if (root.dataset.ready === "true") return;
    root.dataset.ready = "true";

    const exitOption = root.dataset.exitOption;
    const toggle = root.querySelector("[data-exit-toggle]");
    const panel = root.querySelector("[data-exit-panel]");
    const mapLink = root.querySelector("[data-show-exit-map]");

    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(expanded));
      panel.hidden = !expanded;
      sendRouteEvent("open_exit_option", {
        exit_option: exitOption,
        exit_expanded: expanded,
      }, null);
    });

    mapLink.addEventListener("click", (event) => {
      event.preventDefault();
      document.querySelector(mapLink.getAttribute("href"))?.scrollIntoView();
      sendRouteEvent("show_exit_on_map", { exit_option: exitOption }, null);
      window.dispatchEvent(new CustomEvent("route:show-exit", {
        detail: { exitOption },
      }));
    });
  });
}
