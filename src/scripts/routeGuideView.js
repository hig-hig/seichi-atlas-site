import { sendRouteEvent } from "./routeAnalytics.js";

export function setupRouteGuideView() {
  const root = document.querySelector("[data-route-page]");
  if (!root || root.dataset.guideViewReady === "true") return;
  root.dataset.guideViewReady = "true";

  const selection = root.querySelector("[data-situation-adjuster]");
  const result = root.querySelector("[data-guide-result-view]");
  const resultSummary = root.querySelector("[data-guide-result-summary]");
  const mobileNav = root.querySelector("[data-route-mobile-nav]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const setVisibility = (element, visible) => {
    if (!element) return;
    element.hidden = !visible;
    element.inert = !visible;
  };

  const moveTo = (target) => {
    if (!target) return;
    window.requestAnimationFrame(() => {
      target.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
    });
  };

  const setView = (view, source, moveFocus = true) => {
    if (!['selection', 'result'].includes(view)) return;
    if (window.routeGuideViewState === view && root.dataset.guideView === view) return;

    window.routeGuideViewState = view;
    root.dataset.guideView = view;
    setVisibility(selection, view === "selection");
    setVisibility(result, view === "result");
    setVisibility(resultSummary, view === "result");
    setVisibility(mobileNav, view === "result");

    window.dispatchEvent(new CustomEvent("route:guide-view-change", { detail: { view, source } }));
    if (moveFocus) moveTo(view === "result" ? document.querySelector("#route-map") : selection);
  };

  window.addEventListener("route:guide-view-request", (event) => {
    const { view, source } = event.detail;
    if (view === "selection" && window.routeGuideViewState === "result") {
      sendRouteEvent("route_conditions_reopen", {
        route_variant: window.routeSituationState?.routeVariant,
        interaction_location: "result",
      }, null);
    }
    setView(view, source);
  });

  root.querySelectorAll("[data-conditions-reopen]").forEach((button) => {
    button.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("route:guide-view-request", {
        detail: { view: "selection", source: "result" },
      }));
    });
  });

  setView("selection", "guide_entry", false);
  sendRouteEvent("route_selection_start", { interaction_location: "guide_entry" }, "route-selection-start");
}
