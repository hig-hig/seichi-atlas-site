import { sendRouteEvent } from "./routeAnalytics.js";

export function setupRouteMobileNav() {
  const root = document.querySelector("[data-route-mobile-nav]");
  if (!root || root.dataset.ready === "true") return;
  root.dataset.ready = "true";

  const variants = JSON.parse(root.querySelector("[data-mobile-route-variants]")?.textContent || "{}");
  const status = root.querySelector("[data-mobile-route-status]");
  const links = [...root.querySelectorAll("[data-mobile-nav-destination]")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const targets = new Map(links.map((link) => [link.dataset.mobileNavDestination, document.querySelector(link.hash)]));
  const observedTargets = new Map(targets);
  observedTargets.set("timeline", targets.get("timeline")?.closest("[data-route-timeline]"));

  const updateRoute = (detail) => {
    const variant = variants[detail?.routeVariant];
    if (!variant) return;
    status.replaceChildren(
      document.createTextNode(variant.compactLabel),
      Object.assign(document.createElement("span"), { textContent: "｜" }),
      document.createTextNode(`${detail.spotCount ?? variant.spotCount}地点`),
    );
    status.querySelector("span").setAttribute("aria-hidden", "true");
  };

  const setActive = (destination) => {
    links.forEach((link) => {
      if (link.dataset.mobileNavDestination === destination) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const destination = link.dataset.mobileNavDestination;
      const target = targets.get(destination);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
      setActive(destination);
      sendRouteEvent("route_mobile_nav_click", {
        destination,
        route_variant: window.routeSituationState?.routeVariant,
        interaction_location: "mobile_bottom_nav",
      }, null);
    });
  });

  window.addEventListener("route:recommendation-change", (event) => updateRoute(event.detail));
  if (window.routeSituationState) updateRoute(window.routeSituationState);

  if (!("IntersectionObserver" in window)) return;
  const visibleSections = new Map();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const destination = [...observedTargets].find(([, target]) => target === entry.target)?.[0];
      if (!destination) return;
      if (entry.isIntersecting) visibleSections.set(destination, entry.intersectionRatio);
      else visibleSections.delete(destination);
    });
    const active = [...visibleSections].sort((a, b) => b[1] - a[1])[0]?.[0];
    setActive(active);
  }, { rootMargin: "-112px 0px -96px 0px", threshold: [0, .15, .35, .6] });
  observedTargets.forEach((target) => { if (target) observer.observe(target); });
}
