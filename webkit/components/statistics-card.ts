const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export type StatisticsCardIcon = "clock" | "gamepad" | "trophy" | "star";
export type StatisticsCardTone = "blue" | "purple" | "gold" | "green";
export type StatisticsCardValueKind = "number" | "text";
export type StatisticsComparisonDirection = "up" | "down" | "neutral";

export interface StatisticsCardComparison {
  readonly direction: StatisticsComparisonDirection;
  /** The comparison text without a directional glyph, for example "18% vs last month". */
  readonly text: string;
}

interface StatisticsCardDisplayState {
  readonly value?: string;
  readonly unit?: string;
  readonly detail?: string;
  readonly comparison?: StatisticsCardComparison;
}

export type StatisticsCardState =
  | (StatisticsCardDisplayState & {
      readonly status: "normal";
      readonly value: string;
    })
  | (StatisticsCardDisplayState & {
      readonly status: "empty";
    })
  | {
      readonly status: "loading";
      readonly message?: string;
    }
  | {
      readonly status: "unavailable";
      readonly message?: string;
    };

export interface StatisticsCardOptions {
  readonly title: string;
  readonly icon: StatisticsCardIcon;
  readonly tone: StatisticsCardTone;
  readonly valueKind: StatisticsCardValueKind;
}

export interface StatisticsCard {
  readonly element: HTMLElement;
  update(state: StatisticsCardState): void;
}

/**
 * A presentational Steam Wrapped statistic card. It deliberately knows nothing
 * about session, achievement, or metadata calculations; callers only provide
 * an explicit visual state and formatted strings.
 */
export function createStatisticsCard(
  options: StatisticsCardOptions,
  initialState: StatisticsCardState = { status: "loading" },
): StatisticsCard {
  const element = document.createElement("section");
  element.className = "steam-wrapped-stat-card";
  element.dataset.tone = options.tone;
  element.dataset.valueKind = options.valueKind;

  const heading = document.createElement("div");
  heading.className = "steam-wrapped-stat-card__heading";
  const icon = document.createElement("span");
  icon.className = "steam-wrapped-stat-card__icon";
  icon.setAttribute("aria-hidden", "true");
  icon.append(createCardIcon(options.icon));
  const title = document.createElement("h2");
  title.className = "steam-wrapped-stat-card__title";
  title.textContent = options.title;
  heading.append(icon, title);

  const value = document.createElement("p");
  value.className = "steam-wrapped-stat-card__value";
  const unit = document.createElement("p");
  unit.className = "steam-wrapped-stat-card__unit";
  const detail = document.createElement("p");
  detail.className = "steam-wrapped-stat-card__detail";

  const comparison = document.createElement("p");
  comparison.className = "steam-wrapped-stat-card__comparison";
  const comparisonIcon = document.createElement("span");
  comparisonIcon.className = "steam-wrapped-stat-card__comparison-icon";
  comparisonIcon.setAttribute("aria-hidden", "true");
  const comparisonText = document.createElement("span");
  comparison.append(comparisonIcon, comparisonText);

  element.append(heading, value, unit, detail, comparison);

  const update = (state: StatisticsCardState): void => {
    element.dataset.state = state.status;
    element.setAttribute("aria-busy", String(state.status === "loading"));

    const display = toDisplayState(state);
    setText(value, display.value, true);
    setText(unit, display.unit);
    setText(detail, display.detail);
    renderComparison(comparison, comparisonIcon, comparisonText, display.comparison);
  };

  update(initialState);
  return { element, update };
}

function toDisplayState(state: StatisticsCardState): Required<Pick<StatisticsCardDisplayState, "value">> & StatisticsCardDisplayState {
  switch (state.status) {
    case "normal":
      return state;
    case "empty":
      return {
        value: state.value ?? "No data",
        unit: state.unit,
        detail: state.detail,
        comparison: state.comparison,
      };
    case "loading":
      return {
        value: "—",
        detail: state.message ?? "Loading data",
      };
    case "unavailable":
      return {
        value: "—",
        detail: state.message ?? "Data unavailable",
      };
  }
}

function setText(element: HTMLElement, text: string | undefined, alwaysVisible = false): void {
  element.textContent = text ?? "";
  element.hidden = !alwaysVisible && !text;
}

function renderComparison(
  element: HTMLElement,
  icon: HTMLElement,
  text: HTMLElement,
  comparison: StatisticsCardComparison | undefined,
): void {
  element.hidden = !comparison;
  if (!comparison) {
    element.removeAttribute("data-direction");
    icon.replaceChildren();
    text.textContent = "";
    return;
  }

  element.dataset.direction = comparison.direction;
  text.textContent = comparison.text;
  icon.replaceChildren();
  if (comparison.direction !== "neutral") {
    icon.append(createComparisonIcon(comparison.direction));
  }
}

function createCardIcon(kind: StatisticsCardIcon): SVGSVGElement {
  const svg = createSvg("steam-wrapped-stat-card__icon-svg");
  switch (kind) {
    case "clock":
      appendPath(svg, "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z");
      appendPath(svg, "M12 7v5l3.4 2.1");
      break;
    case "gamepad":
      appendPath(svg, "M6.6 8.2h10.8c1.4 0 2.6 1 2.9 2.4l1 4.4a2.2 2.2 0 0 1-4.1 1.5l-1.1-2H7.9l-1.1 2a2.2 2.2 0 0 1-4.1-1.5l1-4.4a3 3 0 0 1 2.9-2.4Z");
      appendPath(svg, "M7.4 11.2v3.2M5.8 12.8H9M16.8 11.9h.01M18.8 13.9h.01");
      break;
    case "trophy":
      appendPath(svg, "M8 4h8v5.1A4 4 0 0 1 12 13a4 4 0 0 1-4-3.9V4Z");
      appendPath(svg, "M8 6H4.5v1.2A3.8 3.8 0 0 0 8 11M16 6h3.5v1.2A3.8 3.8 0 0 1 16 11M12 13v4M8.5 20h7M9.5 17h5");
      break;
    case "star":
      appendPath(svg, "m12 3 2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 17.02 6.5 19.92l1.05-6.12L3.1 9.47l6.15-.9L12 3Z", true);
      break;
  }
  return svg;
}

function createComparisonIcon(direction: Exclude<StatisticsComparisonDirection, "neutral">): SVGSVGElement {
  const svg = createSvg("steam-wrapped-stat-card__comparison-svg");
  if (direction === "up") {
    appendPath(svg, "M12 19V5M6.5 10.5 12 5l5.5 5.5");
  } else {
    appendPath(svg, "M12 5v14m5.5-5.5L12 19l-5.5-5.5");
  }
  return svg;
}

function createSvg(className: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("class", className);
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.8");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("focusable", "false");
  return svg;
}

function appendPath(svg: SVGSVGElement, pathData: string, filled = false): void {
  const path = document.createElementNS(SVG_NAMESPACE, "path");
  path.setAttribute("d", pathData);
  if (filled) {
    path.setAttribute("fill", "currentColor");
    path.setAttribute("stroke", "none");
  }
  svg.append(path);
}
