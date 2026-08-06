import { createGameArtwork, type GameArtwork } from "./game-artwork";
import { createInsightCardIcon } from "./insight-card-icon";
import type { InsightCardMessageState } from "./insight-card-state";
import { openGameInLibrary } from "../navigation/library-navigation";

export interface LongestSessionNormalState {
  readonly status: "normal";
  readonly appId: string;
  readonly durationLabel: string;
  /** Local date and actual game launch time, formatted by the aggregation layer. */
  readonly startedAtLabel: string;
  /** Optional boundary note for a session that began before the selected period. */
  readonly startContextLabel?: string;
  readonly gameName: string;
  readonly imageUrl?: string;
}

export type LongestSessionCardState = LongestSessionNormalState | InsightCardMessageState;

export interface LongestSessionCard {
  readonly element: HTMLElement;
  update(state: LongestSessionCardState): void;
}

/** Presentational card for a single, uninterrupted tracked game session. */
export function createLongestSessionCard(
  initialState: LongestSessionCardState = { status: "loading" },
): LongestSessionCard {
  const element = document.createElement("section");
  element.className = "steam-wrapped-insight-card steam-wrapped-insight-card--longest-session";
  element.setAttribute("aria-label", "Longest session");

  const heading = createHeading("Longest Session", "stopwatch");
  const content = document.createElement("div");
  content.className = "steam-wrapped-longest-session-card__content";
  const duration = document.createElement("p");
  duration.className = "steam-wrapped-longest-session-card__duration";
  const startedAt = document.createElement("p");
  startedAt.className = "steam-wrapped-longest-session-card__started-at";
  const startContext = document.createElement("p");
  startContext.className = "steam-wrapped-longest-session-card__start-context";

  const game = document.createElement("button");
  game.type = "button";
  game.className = "steam-wrapped-longest-session-card__game";
  game.setAttribute("aria-label", "Open longest-session game in Library");
  const artwork: GameArtwork = createGameArtwork("compact");
  const gameName = document.createElement("p");
  gameName.className = "steam-wrapped-longest-session-card__game-name";
  game.append(artwork.element, gameName);

  content.append(duration, startedAt, startContext, game);
  element.append(heading, content);
  element.addEventListener("click", () => {
    openGameInLibrary(element.dataset.appId ?? "");
  });

  const update = (state: LongestSessionCardState): void => {
    element.dataset.state = state.status;
    element.setAttribute("aria-busy", String(state.status === "loading"));

    if (state.status === "normal") {
      element.dataset.appId = state.appId;
      game.dataset.appId = state.appId;
      game.disabled = !/^\d+$/.test(state.appId) || state.appId === "0";
      game.setAttribute("aria-label", `Open ${state.gameName} in Steam Library`);
      duration.textContent = state.durationLabel;
      startedAt.textContent = state.startedAtLabel;
      startedAt.hidden = false;
      startContext.textContent = state.startContextLabel ?? "";
      startContext.hidden = !state.startContextLabel;
      gameName.textContent = state.gameName;
      game.hidden = false;
      artwork.update({ imageUrl: state.imageUrl, gameName: state.gameName });
      return;
    }

    duration.textContent = getStatusMessage(state);
    startedAt.textContent = "";
    startedAt.hidden = true;
    startContext.textContent = "";
    startContext.hidden = true;
    gameName.textContent = "";
    game.hidden = true;
    delete game.dataset.appId;
    delete element.dataset.appId;
    game.disabled = true;
    artwork.update({ fallbackLabel: "Game artwork unavailable" });
  };

  update(initialState);
  return { element, update };
}

function createHeading(titleText: string, iconKind: "stopwatch"): HTMLElement {
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

function getStatusMessage(state: InsightCardMessageState): string {
  switch (state.status) {
    case "loading":
      return state.message?.trim() || "Loading session data";
    case "empty":
      return state.message?.trim() || "No session data";
    case "unavailable":
      return state.message?.trim() || "Session data unavailable";
    case "error":
      return state.message?.trim() || "Session data could not be loaded";
  }
}
