import { setRouteSpotSelection } from "./routeSpotSelection.js";

const setEndpoint = (item, label) => {
  const badge = item.querySelector("[data-timeline-endpoint]");
  badge.textContent = label;
  badge.hidden = !label;
  item.classList.toggle("is-goal", label === "GOAL");
};

export function setupRouteTimelines() {
  document.querySelectorAll("[data-route-timeline]").forEach((root) => {
    if (root.dataset.ready === "true") return;
    root.dataset.ready = "true";

    const variants = JSON.parse(root.querySelector("[data-timeline-variants]")?.textContent || "{}");
    const items = [...root.querySelectorAll("[data-timeline-spot]")];
    const timing = root.querySelector("[data-timeline-timing]");
    const count = root.querySelector("[data-timeline-count]");
    const start = root.querySelector("[data-timeline-start]");
    const goal = root.querySelector("[data-timeline-goal]");
    const omitted = root.querySelector("[data-timeline-omitted]");
    const scroller = root.querySelector(".route-timeline");
    const desktopTimeline = window.matchMedia("(min-width: 721px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const renderSelection = (slug, source) => {
      items.forEach((item) => {
        const selected = Boolean(slug) && item.dataset.timelineSpot === slug && !item.hidden;
        item.classList.toggle("is-selected", selected);
        const button = item.querySelector("[data-timeline-map-button]");
        const label = item.querySelector("[data-timeline-selected-label]");
        button.setAttribute("aria-pressed", String(selected));
        if (label) label.hidden = !selected;
      });

      if (!slug || source !== "map" || !desktopTimeline.matches) return;
      const selectedItem = items.find((item) => item.dataset.timelineSpot === slug && !item.hidden);
      if (!selectedItem) return;
      const scrollerRect = scroller.getBoundingClientRect();
      const itemRect = selectedItem.getBoundingClientRect();
      let left = 0;
      if (itemRect.left < scrollerRect.left) left = itemRect.left - scrollerRect.left - 12;
      else if (itemRect.right > scrollerRect.right) left = itemRect.right - scrollerRect.right + 12;
      if (left) scroller.scrollBy({ left, behavior: reducedMotion.matches ? "auto" : "smooth" });
    };

    const render = (detail) => {
      const variant = variants[detail.routeVariant];
      if (!variant) return;
      const visibleSlugs = variant.visibleSpotSlugs || [];
      const visibleSet = new Set(visibleSlugs);
      const visibleItems = items.filter((item) => visibleSet.has(item.dataset.timelineSpot));

      if (window.routeSelectedSpotSlug) setRouteSpotSelection(null, "route");

      items.forEach((item) => {
        item.hidden = !visibleSet.has(item.dataset.timelineSpot);
        item.classList.remove("is-last", "is-goal");
      });

      visibleItems.forEach((item, index) => {
        const nextItem = visibleItems[index + 1];
        const order = item.querySelector("[data-timeline-order]");
        const arrival = item.querySelector("[data-timeline-arrival]");
        const transfer = item.querySelector("[data-timeline-transfer]");
        order.textContent = String(index + 1).padStart(2, "0");
        arrival.textContent = variant.hasArrivalSchedule || index === 0
          ? item.dataset.standardArrival
          : "時刻未設定";
        setEndpoint(item, index === 0 ? "START" : (index === visibleItems.length - 1 ? "GOAL" : ""));

        if (!nextItem) {
          item.classList.add("is-last");
          transfer.hidden = true;
          return;
        }
        transfer.hidden = false;
        transfer.querySelector("span:last-child").textContent = variant.timelineTransfers?.[item.dataset.timelineSpot]
          || item.dataset.standardNextWalk;
      });

      if (timing) timing.textContent = detail.timing;
      if (count) count.textContent = `${visibleItems.length}地点`;
      if (start) start.textContent = visibleItems[0]?.querySelector("h3")?.textContent || "—";
      if (goal) goal.textContent = visibleItems.at(-1)?.querySelector("h3")?.textContent || "—";
      if (omitted) {
        const omittedCount = items.length - visibleItems.length;
        omitted.textContent = omittedCount ? `${omittedCount}地点を省略` : "";
        omitted.hidden = omittedCount === 0;
      }
    };

    root.querySelectorAll("[data-timeline-map-button]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = button.closest("[data-timeline-spot]");
        if (!item || item.hidden) return;
        setRouteSpotSelection(item.dataset.timelineSpot, "timeline");
      });
    });

    window.addEventListener("route:spot-select", (event) => {
      renderSelection(event.detail.slug, event.detail.source);
    });

    window.addEventListener("route:recommendation-change", (event) => render(event.detail));
    render(window.routeSituationState || {
      routeVariant: root.dataset.initialRouteVariant,
      timing: root.dataset.initialTiming,
    });
    renderSelection(window.routeSelectedSpotSlug || null, "initial");
  });
}
