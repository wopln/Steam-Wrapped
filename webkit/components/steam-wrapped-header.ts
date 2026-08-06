import { createChartIcon } from "./chart-icon";
import { createPeriodSelector, type PeriodSelector } from "./period-selector";
import { resolvePeriod, type PeriodSelection } from "../domain/period";

export interface SteamWrappedHeader {
  readonly element: HTMLElement;
  update(selection: PeriodSelection): void;
  destroy(): void;
}

export function createSteamWrappedHeader(
  selection: PeriodSelection,
  onPeriodChange: (selection: PeriodSelection) => void,
): SteamWrappedHeader {
  const element = document.createElement("header");
  element.className = "steam-wrapped-header";

  const identity = document.createElement("div");
  identity.className = "steam-wrapped-header__identity";
  const icon = document.createElement("div");
  icon.className = "steam-wrapped-header__icon";
  icon.append(createChartIcon("steam-wrapped-header-icon"));

  const labels = document.createElement("div");
  const title = document.createElement("h1");
  title.textContent = "Steam Wrapped";
  const periodLabel = document.createElement("p");
  periodLabel.className = "steam-wrapped-header__period";
  labels.append(title, periodLabel);
  identity.append(icon, labels);

  const selector: PeriodSelector = createPeriodSelector(selection, onPeriodChange);
  element.append(identity, selector.element);

  return {
    element,
    update: (nextSelection) => {
      periodLabel.textContent = resolvePeriod(nextSelection).headerLabel;
      selector.update(nextSelection);
    },
    destroy: () => selector.destroy(),
  };
}
