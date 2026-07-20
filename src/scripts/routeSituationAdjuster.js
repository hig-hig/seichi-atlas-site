import { sendRouteEvent } from "./routeAnalytics.js";

const layerStateValue = (layers) => Object.entries(layers)
  .map(([layer, visible]) => `${layer}:${visible ? "visible" : "hidden"}`)
  .join(",");

const mapTargetValue = (action) => action.spotSlug
  || action.exitOption
  || action.facilityCategories?.join(",")
  || "route-map";

const setPressed = (buttons, selected) => {
  buttons.forEach((button) => {
    const pressed = button === selected;
    button.setAttribute("aria-pressed", String(pressed));
    button.querySelector(".selection-check").textContent = pressed ? "✓" : "";
    const status = button.querySelector("[data-selection-status]");
    status.hidden = !pressed;
  });
};

const announceSummary = (summary) => {
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

export function setupRouteSituationAdjusters() {
  document.querySelectorAll("[data-situation-adjuster]").forEach((root) => {
    if (root.dataset.ready === "true") return;
    root.dataset.ready = "true";

    const config = JSON.parse(root.querySelector("[data-situation-config]")?.textContent || "null");
    if (!config) return;

    const situationButtons = [...root.querySelectorAll("[data-situation]")];
    const conditionGroups = [...root.querySelectorAll("[data-condition-group]")];
    const resultTitle = root.querySelector("[data-result-title]");
    const resultTiming = root.querySelector("[data-result-timing]");
    const resultNote = root.querySelector("[data-result-note]");
    const primaryLink = root.querySelector("[data-situation-cta]");
    const secondaryLink = root.querySelector("[data-situation-secondary]");
    let selectedSituation = config.situations[0];
    let selectedCondition = "";
    let currentRecommendation = selectedSituation.recommendation;
    let currentResult = config.recommendations[currentRecommendation];

    const renderResult = (recommendation) => {
      currentRecommendation = recommendation;
      currentResult = config.recommendations[recommendation];
      resultTitle.textContent = currentResult.label;
      resultTiming.textContent = currentResult.timing;
      resultNote.textContent = currentResult.note;
      primaryLink.href = currentResult.href;
      primaryLink.textContent = currentResult.cta;
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
      const routeVariant = config.routeVariants[currentResult.routeVariant];
      const spotCount = routeVariant.visibleSpotCount;
      announceSummary(`${currentResult.mapAction.summary}${Number.isInteger(spotCount) ? `｜${spotCount}地点` : ""}`);
      applyMapAction(currentResult);
    };

    const showPendingResult = () => {
      currentResult = null;
      currentRecommendation = "";
      resultTitle.textContent = "追加条件を選択してください";
      resultTiming.textContent = "選択後に時間の目安または注意を表示します。";
      resultNote.textContent = "現在の状況に必要な条件だけを確認します。";
      primaryLink.removeAttribute("href");
      primaryLink.textContent = "追加条件を選択してください";
      primaryLink.setAttribute("aria-disabled", "true");
      secondaryLink.hidden = true;
      announceSummary("条件を選択すると地図表示が更新されます");
    };

    situationButtons.forEach((button) => {
      button.addEventListener("click", () => {
        selectedSituation = config.situations.find((item) => item.value === button.dataset.situation);
        selectedCondition = "";
        setPressed(situationButtons, button);
        conditionGroups.forEach((group) => {
          group.hidden = group.dataset.conditionGroup !== selectedSituation.conditionGroup;
          setPressed([...group.querySelectorAll("[data-condition]")], null);
        });
        sendRouteEvent("select_route_situation", { situation: selectedSituation.value }, null);
        if (selectedSituation.recommendation) renderResult(selectedSituation.recommendation);
        else showPendingResult();
      });
    });

    conditionGroups.forEach((group) => {
      const buttons = [...group.querySelectorAll("[data-condition]")];
      buttons.forEach((button) => {
        button.addEventListener("click", () => {
          const groupConfig = config.conditionGroups[group.dataset.conditionGroup];
          const condition = groupConfig.options.find((item) => item.value === button.dataset.condition);
          selectedCondition = condition.value;
          setPressed(buttons, button);
          renderResult(condition.recommendation);
          sendRouteEvent("select_route_condition", {
            situation: selectedSituation.value,
            condition: selectedCondition,
            recommendation: condition.recommendation,
            layer_state: layerStateValue(currentResult.layers),
          }, null);
        });
      });
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
      }, null);
    });

    renderResult(currentRecommendation);
  });
}
