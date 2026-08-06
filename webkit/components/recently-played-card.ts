import { createGameArtwork, type GameArtwork } from "./game-artwork";
import type { InsightCardMessageState } from "./insight-card-state";
import { openGameInLibrary } from "../navigation/library-navigation";

/**
 * A fully prepared, selected-period game entry. Aggregation, selected-period
 * clipping, ordering, and Steam metadata hydration deliberately happen before
 * this presentational component receives the entry.
 */
export interface RecentlyPlayedGameDisplay {
  readonly appId: string;
  readonly gameName: string;
  readonly totalMilliseconds: number;
  /** Most recent selected-period activity, used by the modal's Recent sort. */
  readonly mostRecentActivityAt: number;
  /** Already formatted from the App ID's selected-period overlap total. */
  readonly playtimeLabel: string;
  /** Optional real Steam icon or capsule URL supplied by the metadata cache. */
  readonly imageUrl?: string;
}

export interface RecentlyPlayedNormalState {
  readonly status: "normal";
  /** Descending by the game's most recent selected-period activity. */
  readonly games: readonly RecentlyPlayedGameDisplay[];
}

export type RecentlyPlayedCardState = RecentlyPlayedNormalState | InsightCardMessageState;

export interface RecentlyPlayedCard {
  readonly element: HTMLElement;
  update(state: RecentlyPlayedCardState): void;
  destroy(): void;
}

interface RenderedGameRow {
  readonly element: HTMLElement;
  update(game: RecentlyPlayedGameDisplay): void;
}

const PREVIEW_GAME_LIMIT = 4;
let recentlyPlayedDialogId = 0;

/**
 * The preview shows at most four source-backed games. "View All" opens the
 * complete selected-period list in a native in-plugin dialog, never a browser
 * or external Steam page.
 */
export function createRecentlyPlayedCard(
  initialState: RecentlyPlayedCardState = { status: "loading" },
): RecentlyPlayedCard {
  const element = document.createElement("section");
  element.className = "steam-wrapped-activity-card steam-wrapped-recently-played-card";
  element.setAttribute("aria-label", "Recently played");

  const heading = document.createElement("div");
  heading.className = "steam-wrapped-activity-card__heading";
  const title = document.createElement("h2");
  title.className = "steam-wrapped-activity-card__title";
  title.textContent = "Recently Played";

  const dialogId = `steam-wrapped-recently-played-dialog-${++recentlyPlayedDialogId}`;
  const viewAll = document.createElement("button");
  viewAll.type = "button";
  viewAll.className = "steam-wrapped-activity-card__view-all";
  viewAll.textContent = "View All";
  viewAll.setAttribute("aria-haspopup", "dialog");
  viewAll.setAttribute("aria-controls", dialogId);
  heading.append(title, viewAll);

  const previewList = document.createElement("div");
  previewList.className = "steam-wrapped-recently-played-card__list";
  previewList.setAttribute("role", "list");

  const message = document.createElement("p");
  message.className = "steam-wrapped-activity-card__message";

  const dialog = document.createElement("dialog");
  dialog.id = dialogId;
  dialog.className = "steam-wrapped-activity-dialog steam-wrapped-recently-played-card__dialog";
  dialog.setAttribute("aria-labelledby", `${dialogId}-title`);

  const dialogContent = document.createElement("div");
  dialogContent.className = "steam-wrapped-activity-dialog__content";
  const dialogHeading = document.createElement("div");
  dialogHeading.className = "steam-wrapped-activity-dialog__heading";
  const dialogTitle = document.createElement("h2");
  dialogTitle.id = `${dialogId}-title`;
  dialogTitle.className = "steam-wrapped-activity-dialog__title";
  dialogTitle.textContent = "Recently Played";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "steam-wrapped-activity-dialog__close";
  close.textContent = "Close";
  close.setAttribute("aria-label", "Close recently played games");
  dialogHeading.append(dialogTitle, close);

  const sortSelect = document.createElement("select");
  sortSelect.className = "steam-wrapped-activity-dialog__sort";
  sortSelect.setAttribute("aria-label", "Sort recently played games");
  const mostRecentOption = document.createElement("option");
  mostRecentOption.value = "recent";
  mostRecentOption.textContent = "Most Recent";
  const mostPlayedOption = document.createElement("option");
  mostPlayedOption.value = "played";
  mostPlayedOption.textContent = "Most Played";
  sortSelect.append(mostRecentOption, mostPlayedOption);

  const fullList = document.createElement("div");
  fullList.className = "steam-wrapped-recently-played-card__full-list";
  fullList.setAttribute("role", "list");
  dialogContent.append(dialogHeading, sortSelect, fullList);
  dialog.append(dialogContent);
  element.append(heading, previewList, message, dialog);

  let canOpenFullList = false;
  const previewRows = new Map<string, RenderedGameRow>();
  const fullRows = new Map<string, RenderedGameRow>();
  let allGames: readonly RecentlyPlayedGameDisplay[] = [];
  let sortMode: "recent" | "played" = "recent";

  const renderFullList = (): void => {
    updateRows(fullList, sortGames(allGames, sortMode), "full", fullRows);
  };

  sortSelect.addEventListener("change", () => {
    sortMode = sortSelect.value === "played" ? "played" : "recent";
    renderFullList();
  });

  const closeDialog = (): void => {
    if (dialog.open) {
      dialog.close();
    }
    // The hidden fallback is used only on older embedded Chromium versions
    // that do not expose HTMLDialogElement.showModal().
    dialog.hidden = true;
    dialog.classList.remove("steam-wrapped-dialog--fallback");
  };

  close.addEventListener("click", closeDialog);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      closeDialog();
    }
  });
  dialog.addEventListener("cancel", () => {
    dialog.hidden = true;
  });
  viewAll.addEventListener("click", () => {
    if (!canOpenFullList) {
      return;
    }

    dialog.hidden = false;
    dialog.classList.remove("steam-wrapped-dialog--fallback");
    let openedAsModal = false;
    if (typeof dialog.showModal === "function") {
      try {
        dialog.showModal();
        openedAsModal = true;
      } catch {
        // A style-based in-page dialog remains a useful, contained fallback
        // when the Steam Chromium runtime rejects a native modal call.
      }
    }
    if (!openedAsModal) {
      dialog.setAttribute("open", "");
      dialog.classList.add("steam-wrapped-dialog--fallback");
    }
    close.focus();
  });

  const update = (state: RecentlyPlayedCardState): void => {
    const games = state.status === "normal" ? state.games : [];
    const hasGames = games.length > 0;
    const displayStatus = state.status === "normal" && !hasGames ? "empty" : state.status;

    element.dataset.state = displayStatus;
    element.setAttribute("aria-busy", String(displayStatus === "loading"));
    canOpenFullList = state.status === "normal" && hasGames;
    viewAll.hidden = !canOpenFullList;
    viewAll.disabled = !canOpenFullList;
    sortSelect.hidden = !canOpenFullList;
    allGames = games;

    if (state.status === "normal" && hasGames) {
      updateRows(previewList, games.slice(0, PREVIEW_GAME_LIMIT), "preview", previewRows);
      renderFullList();
      previewList.hidden = false;
      message.hidden = true;
      message.textContent = "";
      return;
    }

    previewList.replaceChildren();
    fullList.replaceChildren();
    allGames = [];
    previewRows.clear();
    fullRows.clear();
    previewList.hidden = true;
    message.hidden = false;
    message.textContent =
      state.status === "normal" ? "No games played in this period" : getStatusMessage(state);
    closeDialog();
  };

  update(initialState);
  return { element, update, destroy: closeDialog };
}

function updateRows(
  container: HTMLElement,
  games: readonly RecentlyPlayedGameDisplay[],
  variant: "preview" | "full",
  rowsByAppId: Map<string, RenderedGameRow>,
): void {
  const activeAppIds = new Set(games.map((game) => game.appId));
  for (const appId of rowsByAppId.keys()) {
    if (!activeAppIds.has(appId)) {
      rowsByAppId.delete(appId);
    }
  }

  const rows = games.map((game) => {
    let row = rowsByAppId.get(game.appId);
    if (!row) {
      row = createGameRow(variant);
      rowsByAppId.set(game.appId, row);
    }
    row.update(game);
    return row.element;
  });
  container.replaceChildren(...rows);
}

function createGameRow(
  variant: "preview" | "full",
): RenderedGameRow {
  const row = document.createElement("button");
  row.type = "button";
  row.className = `steam-wrapped-interactive-row steam-wrapped-recently-played-card__row steam-wrapped-recently-played-card__row--${variant}`;
  row.setAttribute("aria-label", "Open game in Steam Library");

  const artwork: GameArtwork = createGameArtwork("compact");
  artwork.element.classList.add("steam-wrapped-recently-played-card__artwork");

  const name = document.createElement("p");
  name.className = "steam-wrapped-recently-played-card__game-name";

  const playtime = document.createElement("p");
  playtime.className = "steam-wrapped-recently-played-card__playtime";

  row.append(artwork.element, name, playtime);
  row.addEventListener("click", () => {
    openGameInLibrary(row.dataset.appId ?? "");
  });
  return {
    element: row,
    update: (game) => {
      row.dataset.appId = game.appId;
      row.disabled = !/^\d+$/.test(game.appId) || game.appId === "0";
      row.setAttribute("aria-label", `Open ${game.gameName} in Steam Library`);
      name.textContent = game.gameName;
      name.title = game.gameName;
      playtime.textContent = game.playtimeLabel;
      artwork.update({ imageUrl: game.imageUrl, gameName: game.gameName });
    },
  };
}

function getStatusMessage(state: InsightCardMessageState): string {
  switch (state.status) {
    case "loading":
      return state.message?.trim() || "Loading recent games";
    case "empty":
      return state.message?.trim() || "No games played in this period";
    case "unavailable":
      return state.message?.trim() || "Recently played data unavailable";
    case "error":
      return state.message?.trim() || "Recent games could not be loaded";
  }
}

function sortGames(
  games: readonly RecentlyPlayedGameDisplay[],
  mode: "recent" | "played",
): readonly RecentlyPlayedGameDisplay[] {
  return [...games].sort((left, right) => {
    if (mode === "played") {
      const playtimeDifference = right.totalMilliseconds - left.totalMilliseconds;
      if (playtimeDifference) {
        return playtimeDifference;
      }
    }
    const recentDifference = right.mostRecentActivityAt - left.mostRecentActivityAt;
    if (recentDifference) {
      return recentDifference;
    }
    return left.appId.localeCompare(right.appId, undefined, { numeric: true });
  });
}
