import { sendRouteEvent } from "./routeAnalytics.js";

export function setRouteSpotSelection(slug, source) {
  const selectedSlug = slug || null;
  if ((window.routeSelectedSpotSlug || null) === selectedSlug) return;

  window.routeSelectedSpotSlug = selectedSlug;
  window.dispatchEvent(new CustomEvent("route:spot-select", {
    detail: { slug: selectedSlug, source },
  }));

  if (!selectedSlug || !["timeline", "map"].includes(source)) return;
  sendRouteEvent("route_spot_select", {
    spot_slug: selectedSlug,
    source,
    route_variant: window.routeSituationState?.routeVariant,
    interaction_location: source,
  }, null);
}
