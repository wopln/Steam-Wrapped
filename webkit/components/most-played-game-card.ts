import { createGameArtwork, type GameArtwork } from "./game-artwork";
import { createInsightCardIcon } from "./insight-card-icon";
import type { InsightCardMessageState } from "./insight-card-state";
import { openGameInLibrary } from "../navigation/library-navigation";

export interface MostPlayedGameNormalState {
  readonly status: "normal";
  readonly appId: string;
  readonly gameName: string;
  readonly playtimeLabel: string;
  readonly imageUrl?: string;
}

export type MostPlayedGameCardState = MostPlayedGameNormalState | InsightCardMessageState;

export interface MostPlayedGameCard {
  readonly element: HTMLElement;
  update(state: MostPlayedGameCardState): void;
}

/** Presentational card for the selected period's highest-playtime App ID. */
export function createMostPlayedGameCard(
  initialState: MostPlayedGameCardState = { status: "loading" },
): MostPlayedGameCard {
  const element = document.createElement("section");
  element.className = "steam-wrapped-insight-card steam-wrapped-insight-card--most-played";
  element.setAttribute("aria-label", "Most played game");

  const heading = createHeading("Most Played Game", "gamepad");
  const artwork: GameArtwork = createGameArtwork("wide");

  const content = document.createElement("div");
  content.className = "steam-wrapped-most-played-game-card__content";
  const gameName = document.createElement("p");
  gameName.className = "steam-wrapped-most-played-game-card__name";
  const playtime = document.createElement("p");
  playtime.className = "steam-wrapped-most-played-game-card__playtime";
  const playtimeValue = document.createElement("span");
  playtimeValue.className = "steam-wrapped-most-played-game-card__playtime-value";
  const playtimeDetail = document.createElement("span");
  playtimeDetail.className = "steam-wrapped-most-played-game-card__playtime-detail";
  playtime.append(playtimeValue, playtimeDetail);
  content.append(gameName, playtime);

  const gameTarget = document.createElement("button");
  gameTarget.type = "button";
  gameTarget.className = "steam-wrapped-most-played-game-card__target";
  gameTarget.setAttribute("aria-label", "Open most played game in Library");
  gameTarget.append(artwork.element, content);

  element.append(heading, gameTarget);
  element.addEventListener("click", () => {
    openGameInLibrary(element.dataset.appId ?? "");
  });

  const update = (state: MostPlayedGameCardState): void => {
    element.dataset.state = state.status;
    element.setAttribute("aria-busy", String(state.status === "loading"));

    if (state.status === "normal") {
      element.dataset.appId = state.appId;
      gameTarget.dataset.appId = state.appId;
      gameTarget.disabled = !/^\d+$/.test(state.appId) || state.appId === "0";
      gameTarget.setAttribute("aria-label", `Open ${state.gameName} in Steam Library`);
      gameName.textContent = state.gameName;
      const [value, detail] = splitPlaytimeLabel(state.playtimeLabel);
      playtimeValue.textContent = value;
      playtimeDetail.textContent = detail;
      playtime.hidden = false;
      artwork.update({ imageUrl: state.imageUrl, gameName: state.gameName });
      return;
    }

    delete gameTarget.dataset.appId;
    delete element.dataset.appId;
    gameTarget.disabled = true;
    gameName.textContent = getStatusMessage(state);
    playtimeValue.textContent = "";
    playtimeDetail.textContent = "";
    playtime.hidden = true;
    artwork.update({ fallbackLabel: getArtworkFallbackLabel(state) });
  };

  update(initialState);
  return { element, update };
}

function splitPlaytimeLabel(label: string): readonly [string, string] {
  const unitMatch = /^(.*?)\s+(Hours?|Minutes?) Played$/i.exec(label);
  if (unitMatch) {
    return [unitMatch[1], `${unitMatch[2]} Played`];
  }

  const playedSuffix = " Played";
  return label.endsWith(playedSuffix)
    ? [label.slice(0, -playedSuffix.length), "Played"]
    : [label, ""];
}

function createHeading(titleText: string, iconKind: "gamepad"): HTMLElement {
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
      return state.message?.trim() || "Loading game data";
    case "empty":
      return state.message?.trim() || "No games played";
    case "unavailable":
      return state.message?.trim() || "Game metadata unavailable";
    case "error":
      return state.message?.trim() || "Game data could not be loaded";
  }
}

function getArtworkFallbackLabel(state: InsightCardMessageState): string {
  return state.status === "empty" ? "No games played" : "Game artwork unavailable";
}
