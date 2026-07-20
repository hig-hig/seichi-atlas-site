import { sendRouteEvent } from "./routeAnalytics.js";

const layerStateValue = (layers) => Object.entries(layers)
  .map(([layer, visible]) => `${layer}:${visible ? "visible" : "hidden"}`)
  .join(",");

const setPressed = (buttons, selected) => {
  buttons.forEach((button) => {
    const pressed = button === selected;
    button.setAttribute("aria-pressed", String(pressed));
    button.querySelector(".selection-check").textContent = pressed ? "✓" : "";
    button.querySelector("[data-selection-status]").textContent = pressed ? "選択中" : "選択する";
  });
};

const applyLayers = (layers) => {
  window.routeSituationLayerState = layers;
  window.dispatchEvent(new CustomEvent("route:apply-layers", { detail: { layers } }));
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
    const resultReason = root.querySelector("[data-result-reason]");
    const resultConstraint = root.querySelector("[data-result-constraint]");
    const primaryLink = root.querySelector("[data-situation-cta]");
    const secondaryLink = root.querySelector("[data-situation-secondary]");
    let selectedSituation = config.situations[0];
    let selectedCondition = "";
    let currentResult = config.recommendations[selectedSituation.recommendation];

    const renderResult = (result) => {
      currentResult = result;
      resultTitle.textContent = result.label;
      resultTiming.textContent = result.timing;
      resultReason.textContent = result.reason;
      resultConstraint.textContent = result.constraint;
      primaryLink.href = result.href;
      primaryLink.textContent = result.cta;
      if (result.secondary) {
        secondaryLink.hidden = false;
        secondaryLink.href = result.secondary.href;
        secondaryLink.textContent = result.secondary.label;
      } else {
        secondaryLink.hidden = true;
        secondaryLink.removeAttribute("href");
        secondaryLink.textContent = "";
      }
      applyLayers(result.layers);
    };

    const showPendingResult = () => {
      currentResult = null;
      resultTitle.textContent = "追加条件を選択してください";
      resultTiming.textContent = "選択後に時間の目安または注意を表示します。";
      resultReason.textContent = "現在の状況に必要な条件だけを確認します。";
      resultConstraint.textContent = "病名・具体的な健康情報・正確な位置情報は入力・取得しません。選択履歴は端末やアカウントに保存せず、選択項目と提示結果はアクセス解析イベントとして記録される場合があります。";
      primaryLink.removeAttribute("href");
      primaryLink.textContent = "追加条件を選択してください";
      primaryLink.setAttribute("aria-disabled", "true");
      secondaryLink.hidden = true;
    };

    situationButtons.forEach((button) => {
      button.addEventListener("click", () => {
        selectedSituation = config.situations.find((item) => item.value === button.dataset.situation);
        selectedCondition = "";
        setPressed(situationButtons, button);
        conditionGroups.forEach((group) => {
          const visible = group.dataset.conditionGroup === selectedSituation.conditionGroup;
          group.hidden = !visible;
          setPressed([...group.querySelectorAll("[data-condition]")], null);
        });
        sendRouteEvent("select_route_situation", { situation: selectedSituation.value }, null);
        if (selectedSituation.recommendation) {
          primaryLink.removeAttribute("aria-disabled");
          renderResult(config.recommendations[selectedSituation.recommendation]);
        } else {
          showPendingResult();
        }
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
          primaryLink.removeAttribute("aria-disabled");
          renderResult(config.recommendations[condition.recommendation]);
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
      applyLayers(currentResult.layers);
      const target = document.querySelector(currentResult.href);
      target?.scrollIntoView();
      target?.focus({ preventScroll: true });
      if (currentResult.spot) {
        window.dispatchEvent(new CustomEvent("route:show-spot", { detail: { spot: currentResult.spot } }));
      }
      sendRouteEvent("open_situation_recommendation", {
        situation: selectedSituation.value,
        condition: selectedCondition || undefined,
        recommendation: Object.entries(config.recommendations).find(([, value]) => value === currentResult)?.[0],
        target: currentResult.href,
        layer_state: layerStateValue(currentResult.layers),
      }, null);
    });

    renderResult(currentResult);
  });
}
