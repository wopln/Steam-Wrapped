import { createInsightCardIcon } from "./insight-card-icon";
import type { InsightCardMessageState } from "./insight-card-state";
import {
  createPlaytimeHistogram,
  type PlaytimeHistogram,
  type PlaytimeHistogramNormalState,
  type PlaytimeHistogramState,
} from "./playtime-histogram";

export interface PeakPlayTimeNormalState {
  readonly status: "normal";
  /** Localized peak-hour display, such as "9 PM" or "21:00". */
  readonly hourLabel: string;
  readonly histogram: PlaytimeHistogramNormalState;
  readonly description?: string;
}

export type PeakPlayTimeCardState = PeakPlayTimeNormalState | InsightCardMessageState;

export interface PeakPlayTimeCard {
  readonly element: HTMLElement;
  update(state: PeakPlayTimeCardState): void;
}

/** Presentational card for the real session-start-hour histogram. */
export function createPeakPlayTimeCard(
  initialState: PeakPlayTimeCardState = { status: "loading" },
): PeakPlayTimeCard {
  const element = document.createElement("section");
  element.className = "steam-wrapped-insight-card steam-wrapped-insight-card--peak-play-time";
  element.setAttribute("aria-label", "Peak play time");

  const heading = createHeading("Peak Play Time", "moon");
  const content = document.createElement("div");
  content.className = "steam-wrapped-peak-play-time-card__content";
  const hour = document.createElement("p");
  hour.className = "steam-wrapped-peak-play-time-card__hour";
  const description = document.createElement("p");
  description.className = "steam-wrapped-peak-play-time-card__description";
  const histogram: PlaytimeHistogram = createPlaytimeHistogram();
  content.append(hour, description, histogram.element);
  element.append(heading, content);

  const update = (state: PeakPlayTimeCardState): void => {
    element.dataset.state = state.status;
    element.setAttribute("aria-busy", String(state.status === "loading"));

    if (state.status === "normal") {
      hour.textContent = state.hourLabel;
      description.textContent = state.description ?? "Most of your playtime starts around this hour";
      description.hidden = false;
      histogram.update(state.histogram);
      return;
    }

    hour.textContent = getStatusMessage(state);
    description.textContent = "";
    description.hidden = true;
    histogram.update(toHistogramState(state));
  };

  update(initialState);
  return { element, update };
}

function createHeading(titleText: string, iconKind: "moon"): HTMLElement {
  const heading = document.createElement("div");
  heading.className = "steam-wrapped-insight-card__heading";
  const icon = document.createElement("span");
  icon.className = "steam-wrapped-insight-card__title-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.append(createInsightCardIcon(iconKind));
  const title = document.createElement("h2");
  title.className = "steam-wrapped-insight-card__title";
  title.textContent = titleText;
  heading.append(icon, title);
  return heading;
}

function toHistogramState(state: InsightCardMessageState): PlaytimeHistogramState {
  return { status: state.status, message: state.message };
}

function getStatusMessage(state: InsightCardMessageState): string {
  switch (state.status) {
    case "loading":
      return state.message?.trim() || "Loading activity data";
    case "empty":
      return state.message?.trim() || "No activity data";
    case "unavailable":
      return state.message?.trim() || "Activity data unavailable";
    case "error":
      return state.message?.trim() || "Activity data could not be loaded";
  }
}
