import { sendRouteEvent } from "./routeAnalytics.js";

export function getRouteRecommendation({ selectedTime, availableTime, stamina }, config) {
  const isLate = selectedTime >= config.lateTime;
  const reasonCodes = [];

  if (availableTime === "2h") reasonCodes.push("available_time_2h");
  if (availableTime === "3h") reasonCodes.push("available_time_3h");
  if (stamina === "low") reasonCodes.push("low_stamina");
  if (isLate) reasonCodes.push("late_start");

  const useShortRoute = reasonCodes.length > 0;
  const route = useShortRoute ? config.routes.short : config.routes.standard;
  let summary;
  const details = [];

  if (availableTime === "2h") {
    summary = `使える時間が2時間以内のため、${route.label}を提案します`;
    details.push(`短縮ルートも${config.routes.short.duration}が目安のため、全行程を回るのは難しい条件です`);
  } else if (stamina === "low") {
    summary = `体力を控えめに設定しているため、大吉山を省く${route.label}を提案します`;
    details.push("無理に予定を詰めず、現地の状況に合わせて調整してください");
  } else if (availableTime === "3h") {
    summary = `使える時間が3時間程度のため、${route.label}を提案します`;
    details.push(`短縮ルートも${config.routes.short.duration}が目安です`);
  } else if (isLate) {
    summary = `選択した時刻が${config.lateTime}以降のため、${route.label}を提案します`;
    details.push("日没時刻と現地の通行状況を確認してください");
  } else {
    summary = `4時間以上使え、体力も普通以上のため、${route.label}を提案します`;
    details.push("所要時間は目安として、現地の状況に合わせて調整してください");
  }

  const lateIsPrimary = isLate && availableTime === "4h" && stamina !== "low";
  if (isLate && !lateIsPrimary) {
    details.push(`${config.lateTime}以降は日没と現地の状況に注意してください`);
  }

  return {
    recommendation: route.key,
    label: route.label,
    href: route.href,
    reason: `${summary}。${details.join(" また、")}。`,
    reasonCode: reasonCodes.length ? reasonCodes.join("|") : "standard_time_and_stamina",
  };
}

export function setupRouteRecommendations() {
  document.querySelectorAll("[data-route-recommendation]").forEach((root) => {
    if (root.dataset.ready === "true") return;
    root.dataset.ready = "true";

    const configElement = root.querySelector("[data-route-recommendation-config]");
    const config = JSON.parse(configElement?.textContent || "null");
    if (!config) return;

    const timeInput = root.querySelector("[data-recommendation-time]");
    const availableTimeInput = root.querySelector("[data-recommendation-available]");
    const staminaInput = root.querySelector("[data-recommendation-stamina]");
    const resultTitle = root.querySelector("[data-recommendation-title]");
    const resultReason = root.querySelector("[data-recommendation-reason]");
    const resultLink = root.querySelector("[data-recommendation-link]");
    let lastShownSignature = "";
    let currentParameters;

    const now = new Date();
    timeInput.value = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const update = () => {
      const conditions = {
        selectedTime: timeInput.value,
        availableTime: availableTimeInput.value,
        stamina: staminaInput.value,
      };
      const result = getRouteRecommendation(conditions, config);
      resultTitle.textContent = `おすすめ: ${result.label}`;
      resultReason.textContent = result.reason;
      resultLink.href = result.href;
      resultLink.textContent = `おすすめの${result.label}を見る`;

      currentParameters = {
        recommendation: result.recommendation,
        available_time: conditions.availableTime,
        stamina: conditions.stamina,
        selected_time: conditions.selectedTime,
        reason_code: result.reasonCode,
      };
      const signature = JSON.stringify(currentParameters);
      if (signature === lastShownSignature) return;
      lastShownSignature = signature;
      sendRouteEvent("route_recommendation_shown", currentParameters, null);
    };

    [timeInput, availableTimeInput, staminaInput].forEach((input) => {
      input.addEventListener("input", update);
    });
    resultLink.addEventListener("click", () => {
      sendRouteEvent("open_recommended_route", currentParameters, null);
    });

    update();
  });
}
