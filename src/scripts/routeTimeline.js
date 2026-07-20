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

    const render = (detail) => {
      const variant = variants[detail.routeVariant];
      if (!variant) return;
      const visibleSlugs = variant.visibleSpotSlugs || [];
      const visibleSet = new Set(visibleSlugs);
      const visibleItems = items.filter((item) => visibleSet.has(item.dataset.timelineSpot));

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

    window.addEventListener("route:recommendation-change", (event) => render(event.detail));
    render(window.routeSituationState || {
      routeVariant: root.dataset.initialRouteVariant,
      timing: root.dataset.initialTiming,
    });
  });
}
