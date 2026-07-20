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
  document.querySelectorAll("[data-overview-note]").forEach((element) => { element.textContent = detail.note; });
  document.querySelectorAll("[data-overview-cta]").forEach((element) => { element.textContent = detail.cta; });
};

export function setupRouteSituationAdjusters() {
  document.querySelectorAll("[data-situation-adjuster]").forEach((root) => {
    if (root.dataset.ready === "true") return;
    root.dataset.ready = "true";

    const config = JSON.parse(root.querySelector("[data-situation-config]")?.textContent || "null");
    if (!config) return;

    const situationInputs = [...root.querySelectorAll("[data-situation]")];
    const conditionGroups = [...root.querySelectorAll("[data-condition-group]")];
    const resultTitle = root.querySelector("[data-result-title]");
    const resultTiming = root.querySelector("[data-result-timing]");
    const resultSpots = root.querySelector("[data-result-spots]");
    const resultNote = root.querySelector("[data-result-note]");
    const primaryLink = root.querySelector("[data-situation-cta]");
    const secondaryLink = root.querySelector("[data-situation-secondary]");
    let selectedSituation = config.situations[0];
    let selectedCondition = "";
    let currentRecommendation = selectedSituation.recommendation;
    let currentResult = config.recommendations[currentRecommendation];

    const recommendationDetail = () => {
      const routeVariant = config.routeVariants[currentResult.routeVariant];
      return {
        recommendation: currentRecommendation,
        routeVariant: currentResult.routeVariant,
        label: currentResult.label,
        timing: currentResult.timing,
        note: currentResult.note,
        spotCount: routeVariant.visibleSpotCount,
        cta: currentResult.cta,
      };
    };

    const renderResult = (recommendation) => {
      currentRecommendation = recommendation;
      currentResult = config.recommendations[recommendation];
      const detail = recommendationDetail();
      resultTitle.textContent = detail.label;
      resultTiming.textContent = detail.timing;
      resultSpots.textContent = `${detail.spotCount}地点`;
      resultNote.textContent = detail.note;
      primaryLink.href = currentResult.href;
      primaryLink.textContent = detail.cta;
      primaryLink.removeAttribute("aria-disabled");
      if (currentResult.secondary) {
        secondaryLink.hidden = false;
        secondaryLink.href = currentResult.secondary.href;
        secondaryLink.textContent = currentResult.secondary.label;
      } else {
        secondaryLink.hidden = true;
        secondaryLink.removeAttribute("href");
        secondaryLink.textContent = "";
      }
      const mapSummary = `${currentResult.mapAction.summary}｜${detail.spotCount}地点｜${detail.timing}`;
      announceMapSummary(mapSummary);
      applyMapAction(currentResult);
      updatePageOverview(detail);
      window.routeSituationState = detail;
      window.dispatchEvent(new CustomEvent("route:recommendation-change", { detail }));
    };

    const showPendingResult = () => {
      currentResult = null;
      currentRecommendation = "";
      resultTitle.textContent = "追加条件を選択してください";
      resultTiming.textContent = "選択後に時間の目安を表示します。";
      resultSpots.textContent = "—";
      resultNote.textContent = "現在の状況に必要な条件だけを確認します。";
      primaryLink.removeAttribute("href");
      primaryLink.textContent = "追加条件を選択してください";
      primaryLink.setAttribute("aria-disabled", "true");
      secondaryLink.hidden = true;
      announceMapSummary("条件を選択すると地図表示が更新されます");
    };

    const showConditionGroup = (conditionGroup) => {
      conditionGroups.forEach((group) => {
        group.hidden = group.dataset.conditionGroup !== conditionGroup;
        setChecked([...group.querySelectorAll("[data-condition]")], null);
      });
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

    const selectSituation = (situation, location) => {
      selectedSituation = situation;
      selectedCondition = "";
      const input = situationInputs.find((item) => item.dataset.situation === situation.value);
      setChecked(situationInputs, input);
      showConditionGroup(situation.conditionGroup);
      sendSituationSelection(location);
      if (situation.recommendation) renderResult(situation.recommendation);
      else showPendingResult();
    };

    const selectCondition = (group, condition, location) => {
      selectedCondition = condition.value;
      const inputs = [...group.querySelectorAll("[data-condition]")];
      const input = inputs.find((item) => item.dataset.condition === condition.value);
      setChecked(inputs, input);
      renderResult(condition.recommendation);
      sendConditionSelection(location);
    };

    situationInputs.forEach((input) => {
      input.addEventListener("change", () => {
        const situation = config.situations.find((item) => item.value === input.dataset.situation);
        selectSituation(situation, "adjuster");
      });
    });

    conditionGroups.forEach((group) => {
      const inputs = [...group.querySelectorAll("[data-condition]")];
      inputs.forEach((input) => {
        input.addEventListener("change", () => {
          const groupConfig = config.conditionGroups[group.dataset.conditionGroup];
          const condition = groupConfig.options.find((item) => item.value === input.dataset.condition);
          selectCondition(group, condition, "adjuster");
        });
      });
    });

    window.addEventListener("route:request-recommendation", (event) => {
      const recommendation = event.detail.recommendation;
      const location = event.detail.interactionLocation || "map";
      const directSituation = config.situations.find((item) => item.recommendation === recommendation);
      if (directSituation) {
        selectSituation(directSituation, location);
        return;
      }
      for (const situation of config.situations) {
        if (!situation.conditionGroup) continue;
        const groupConfig = config.conditionGroups[situation.conditionGroup];
        const condition = groupConfig.options.find((item) => item.recommendation === recommendation);
        if (!condition) continue;
        selectedSituation = situation;
        const situationInput = situationInputs.find((item) => item.dataset.situation === situation.value);
        setChecked(situationInputs, situationInput);
        showConditionGroup(situation.conditionGroup);
        sendSituationSelection(location);
        const group = conditionGroups.find((item) => item.dataset.conditionGroup === situation.conditionGroup);
        selectCondition(group, condition, location);
        return;
      }
    });

    primaryLink.addEventListener("click", (event) => {
      if (!currentResult) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      applyMapAction(currentResult);
      document.querySelector("#route-map")?.scrollIntoView();
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
        interaction_location: "adjuster",
      }, null);
    });

    renderResult(currentRecommendation);
  });
}
