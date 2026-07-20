const sentEvents = new Set();

/**
 * Pushes a route event only when an existing analytics dataLayer is available.
 * Each event key is sent at most once per page view. Pass null for repeatable events.
 */
export function sendRouteEvent(event, parameters = {}, uniqueKey = event) {
  const shouldDeduplicate = uniqueKey !== null;
  if (shouldDeduplicate && sentEvents.has(uniqueKey)) return;

  const dataLayer = window.dataLayer;
  if (!Array.isArray(dataLayer)) return;

  if (shouldDeduplicate) sentEvents.add(uniqueKey);
  dataLayer.push({
    event,
    page_path: window.location.pathname,
    ...parameters,
  });
}

export function setupRouteAnalytics() {
  const routePage = document.querySelector(".route-page");
  if (!routePage || routePage.dataset.analyticsReady === "true") return;
  routePage.dataset.analyticsReady = "true";

  const startedAt = Date.now();
  let reachedBottom = false;
  let scrollFrame = 0;

  const sendCompletion = () => {
    if (!reachedBottom || Date.now() - startedAt < 30_000) return;
    sendRouteEvent("route_read_complete", {}, "route-read-complete");
  };

  const measureScroll = () => {
    scrollFrame = 0;
    const documentHeight = document.documentElement.scrollHeight;
    const viewportBottom = window.scrollY + window.innerHeight;
    const progress = documentHeight > 0 ? viewportBottom / documentHeight : 0;

    if (progress >= 0.75) {
      sendRouteEvent("route_scroll_75", { percent_scrolled: 75 }, "route-scroll-75");
    }

    if (viewportBottom >= documentHeight - 2) {
      reachedBottom = true;
      sendRouteEvent("route_reach_bottom", {}, "route-reach-bottom");
      sendCompletion();
    }
  };

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const actionLink = event.target.closest("[data-route-action]");
    if (!actionLink) return;

    const action = actionLink.dataset.routeAction;
    const target = actionLink.dataset.routeTarget || actionLink.getAttribute("href");
    if (!action || !target) return;

    const parameters = { route_action: action, route_target: target };
    if (actionLink.dataset.routeLayer) {
      parameters.route_layer = actionLink.dataset.routeLayer;
      parameters.route_visible = actionLink.dataset.routeVisible === "true";
    }
    if (actionLink.dataset.routeExitOption) {
      parameters.exit_option = actionLink.dataset.routeExitOption;
    }

    sendRouteEvent(
      "route_action",
      parameters,
      action === "toggle-map-layer" ? null : `route-action:${action}:${target}`,
    );
  });

  const requestScrollMeasurement = () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(measureScroll);
  };

  window.addEventListener("scroll", requestScrollMeasurement, { passive: true });
  window.addEventListener("resize", requestScrollMeasurement, { passive: true });
  window.setTimeout(sendCompletion, 30_000);
  measureScroll();
}
