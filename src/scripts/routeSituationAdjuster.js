import { sendRouteEvent } from "./routeAnalytics.js";

const layerStateValue = (layers) => Object.entries(layers)
  .map(([layer, visible]) => `${layer}:${visible ? "visible" : "hidden"}`)
  .join(",");

const mapTargetValue = (action) => action.spotSlug
  || action.exitOption
  || action.facilityCategories?.join(",")
  || "route-map";

const setChecked = (inputs, selected) => {
  inputs.forEach((input) => {
    const checked = input === selected;
    input.checked = checked;
    const card = input.closest(".choice-card");
    card?.setAttribute("aria-checked", String(checked));
    const check = card?.querySelector(".selection-check");
    if (check) check.hidden = !checked;
  });
};

const announceMapSummary = (summary) => {
  window.routeSituationMapSummary = summary;
  window.dispatchEvent(new CustomEvent("route:update-summary", { detail: { summary } }));
};

const applyMapAction = (result) => {
  const detail = {
    action: result.mapAction,
    layers: result.layers,
    routeVariantId: result.routeVariant,
  };
  window.routeSituationPendingMapAction = detail;
  window.dispatchEvent(new CustomEvent("route:apply-map-action", { detail }));
};

const updatePageOverview = (detail) => {
  document.querySelectorAll("[data-overview-route]").forEach((element) => { element.textContent = detail.label; });
  document.querySelectorAll("[data-overview-timing]").forEach((element) => { element.textContent = detail.timing; });
  document.querySelectorAll("[data-overview-spots]").forEach((element) => { element.textContent = `${detail.spotCount}地点`; });
  document.querySelectorAll("[data-overview-status]").forEach((element) => {
    element.textContent = detail.fieldVerified ? "確認済み" : (detail.routeVariant === "standard" ? "現地未確認" : "推定・現地未確認");
  });
};

export function setupRouteSituationAdjusters() {
  document.querySelectorAll("[data-situation-adjuster]").forEach((root) => {
    if (root.dataset.ready === "true") return;
    root.dataset.ready = "true";

    const config = JSON.parse(root.querySelector("[data-situation-config]")?.textContent || "null");
    if (!config) return;

    const choiceInputs = [...root.querySelectorAll("[data-recommendation-choice]")];
    const submitButton = root.querySelector("[data-recommendation-submit]");
    const standardLink = root.querySelector("[data-standard-direct]");
    const selectionStatus = root.querySelector("[data-selection-status]");
    let selectedSituation = config.situations[0];
    let selectedCondition = "";
    let currentRecommendation = selectedSituation.recommendation || "standard";
    let currentResult = config.recommendations[currentRecommendation];
    let pendingRecommendation = "";

    const recommendationDetail = (recommendation = currentRecommendation) => {
      const result = config.recommendations[recommendation];
      const routeVariant = config.routeVariants[result.routeVariant];
      return {
        recommendation,
        routeVariant: result.routeVariant,
        label: result.label,
        timing: result.timing,
        note: result.note,
        spotCount: routeVariant.visibleSpotCount,
        fieldVerified: routeVariant.fieldVerified ?? routeVariant.verified ?? false,
        cta: result.cta,
      };
    };

    const renderResult = (recommendation) => {
      currentRecommendation = recommendation;
      currentResult = config.recommendations[recommendation];
      const detail = recommendationDetail();
      const mapSummary = `${currentResult.mapAction.summary}｜${detail.spotCount}地点｜${detail.timing}`;
      announceMapSummary(mapSummary);
      applyMapAction(currentResult);
      updatePageOverview(detail);
      window.routeSituationState = detail;
      window.dispatchEvent(new CustomEvent("route:recommendation-change", { detail }));
    };

    const sendSituationSelection = (location) => {
      sendRouteEvent("select_route_situation", {
        situation: selectedSituation.value,
        interaction_location: location,
      }, null);
    };

    const sendConditionSelection = (location) => {
      sendRouteEvent("select_route_condition", {
        situation: selectedSituation.value,
        condition: selectedCondition,
        recommendation: currentRecommendation,
        layer_state: layerStateValue(currentResult.layers),
        interaction_location: location,
      }, null);
    };

    const selectRecommendationSource = (recommendation, location) => {
      const directSituation = config.situations.find((item) => item.recommendation === recommendation);
      if (directSituation) {
        selectedSituation = directSituation;
        selectedCondition = "";
        sendSituationSelection(location);
        return;
      }
      for (const situation of config.situations) {
        if (!situation.conditionGroup) continue;
        const condition = config.conditionGroups[situation.conditionGroup].options
          .find((item) => item.recommendation === recommendation);
        if (!condition) continue;
        selectedSituation = situation;
        selectedCondition = condition.value;
        sendSituationSelection(location);
        renderResult(recommendation);
        sendConditionSelection(location);
        return;
      }
      renderResult(recommendation);
    };

    const syncChoice = (recommendation) => {
      pendingRecommendation = recommendation;
      const selected = choiceInputs.find((input) => input.dataset.recommendationChoice === recommendation);
      setChecked(choiceInputs, selected);
      if (selectionStatus) selectionStatus.textContent = config.recommendations[recommendation]?.label || "条件を1つ選択";
      if (submitButton) submitButton.disabled = !selected;
    };

    const sendOpenEvent = (location) => {
      sendRouteEvent("open_situation_recommendation", {
        situation: selectedSituation.value,
        condition: selectedCondition || undefined,
        recommendation: currentRecommendation,
        target: currentResult.href,
        layer_state: layerStateValue(currentResult.layers),
        map_action: currentResult.mapAction.type,
        map_target: mapTargetValue(currentResult.mapAction),
        route_variant: currentResult.routeVariant,
        visible_spot_count: config.routeVariants[currentResult.routeVariant].visibleSpotCount,
        interaction_location: location,
      }, null);
    };

    const handleRecommendationRequest = (detail, action = "external") => {
      window.routeSituationPendingRecommendation = null;
      const recommendation = detail.recommendation;
      const location = detail.interactionLocation || "map";
      syncChoice(recommendation);
      selectRecommendationSource(recommendation, location);
      if (config.situations.some((item) => item.recommendation === recommendation)) renderResult(recommendation);

      if (action === "submit") {
        sendOpenEvent("guide_entry");
        sendRouteEvent("route_recommendation_submit", {
          route_variant: currentResult.routeVariant,
          interaction_location: "guide_entry",
        }, null);
      } else if (action === "standard") {
        sendOpenEvent("guide_entry");
        sendRouteEvent("route_standard_direct", {
          route_variant: "standard",
          interaction_location: "guide_entry",
        }, null);
      }

      if (action === "submit" || action === "standard") {
        window.dispatchEvent(new CustomEvent("route:guide-view-request", {
          detail: { view: "result", source: action },
        }));
      }
    };

    choiceInputs.forEach((input) => {
      input.addEventListener("change", () => syncChoice(input.dataset.recommendationChoice));
    });

    window.addEventListener("route:request-recommendation", (event) => {
      handleRecommendationRequest(event.detail);
    });

    submitButton?.addEventListener("click", () => {
      if (!pendingRecommendation || submitButton.disabled) return;
      submitButton.disabled = true;
      handleRecommendationRequest({ recommendation: pendingRecommendation, interactionLocation: "guide_entry" }, "submit");
    });

    standardLink?.addEventListener("click", (event) => {
      event.preventDefault();
      handleRecommendationRequest({ recommendation: "standard", interactionLocation: "guide_entry" }, "standard");
    });

    window.addEventListener("route:guide-view-change", (event) => {
      if (event.detail.view === "selection" && submitButton) submitButton.disabled = !pendingRecommendation;
    });

    const queuedRecommendation = window.routeSituationPendingRecommendation;
    if (queuedRecommendation) handleRecommendationRequest(queuedRecommendation);
    else renderResult("standard");
  });
}
