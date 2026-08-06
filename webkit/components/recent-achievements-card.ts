import type { InsightCardMessageState } from "./insight-card-state";
import {
  createRecentAchievementsViewModel,
  type AchievementPeriod,
  type AchievementUnlockRecord,
  type RecentAchievementsViewModel,
} from "../services/recent-achievements-view-model";
import { openGameAchievementsInLibrary } from "../navigation/library-navigation";

export interface RecentAchievementsNormalState {
  readonly status: "normal";
  /** Raw real unlock records. The view-model filters them to `period`. */
  readonly records: readonly AchievementUnlockRecord[];
  readonly period: AchievementPeriod;
}

export type RecentAchievementsCardState =
  | RecentAchievementsNormalState
  | InsightCardMessageState;

export interface RecentAchievementsCard {
  readonly element: HTMLElement;
  update(state: RecentAchievementsCardState): void;
  destroy(): void;
}

/**
 * Presentational selected-period achievement list. It owns no Steam calls or
 * persistence; its caller passes genuine unlock records from the achievement
 * provider, which keeps the UI independent of a particular Millennium API.
 */
export function createRecentAchievementsCard(
  initialState: RecentAchievementsCardState = { status: "loading" },
): RecentAchievementsCard {
  const element = document.createElement("section");
  element.className = "steam-wrapped-period-list-card steam-wrapped-recent-achievements-card";
  element.setAttribute("aria-label", "Recent achievements");

  const header = document.createElement("div");
  header.className = "steam-wrapped-period-list-card__header";
  const heading = document.createElement("div");
  heading.className = "steam-wrapped-period-list-card__heading";
  const titleIcon = document.createElement("span");
  titleIcon.className = "steam-wrapped-period-list-card__title-icon steam-wrapped-period-list-card__title-icon--trophy";
  titleIcon.setAttribute("aria-hidden", "true");
  titleIcon.append(createTrophyIcon());
  const title = document.createElement("h2");
  title.className = "steam-wrapped-period-list-card__title";
  title.textContent = "Recent Achievements";
  heading.append(titleIcon, title);

  const viewAllButton = document.createElement("button");
  viewAllButton.className = "steam-wrapped-period-list-card__view-all";
  viewAllButton.type = "button";
  viewAllButton.textContent = "View All";
  viewAllButton.setAttribute("aria-haspopup", "dialog");
  header.append(heading, viewAllButton);

  const status = document.createElement("p");
  status.className = "steam-wrapped-period-list-card__status";
  status.setAttribute("role", "status");

  const list = document.createElement("ol");
  list.className = "steam-wrapped-period-list-card__list steam-wrapped-recent-achievements-card__list";

  const dialog = createAllAchievementsDialog();
  element.append(header, status, list, dialog.element);

  let allAchievements: readonly AchievementUnlockRecord[] = [];
  let renderedModelKey: string | undefined;

  const closeDialog = (): void => {
    if (typeof dialog.element.close === "function" && dialog.element.open) {
      dialog.element.close();
    } else {
      dialog.element.removeAttribute("open");
    }
    dialog.element.hidden = true;
    dialog.element.classList.remove("steam-wrapped-dialog--fallback");
  };

  const openDialog = (): void => {
    if (!allAchievements.length) {
      return;
    }

    dialog.element.hidden = false;
    dialog.element.classList.remove("steam-wrapped-dialog--fallback");
    if (typeof dialog.element.showModal === "function") {
      try {
        dialog.element.showModal();
        return;
      } catch {
        // A reduced Millennium runtime may not support the native top layer.
        // The same in-page dialog is still usable as a regular DOM overlay.
      }
    }
    dialog.element.setAttribute("open", "");
    dialog.element.classList.add("steam-wrapped-dialog--fallback");
  };

  const closeOnBackdrop = (event: MouseEvent): void => {
    if (event.target === dialog.element) {
      closeDialog();
    }
  };

  viewAllButton.addEventListener("click", openDialog);
  dialog.closeButton.addEventListener("click", closeDialog);
  dialog.element.addEventListener("click", closeOnBackdrop);
  dialog.element.addEventListener("close", () => {
    dialog.element.hidden = true;
    dialog.element.classList.remove("steam-wrapped-dialog--fallback");
  });

  const update = (state: RecentAchievementsCardState): void => {
    element.dataset.state = state.status;
    element.setAttribute("aria-busy", String(state.status === "loading"));

    if (state.status === "normal") {
      const model = createRecentAchievementsViewModel(state.records, state.period);
      allAchievements = model.all;
      const hasAchievements = model.all.length > 0;
      element.dataset.state = hasAchievements ? "normal" : "empty";
      const modelKey = createModelKey(model, state.period);
      if (renderedModelKey !== modelKey) {
        renderedModelKey = modelKey;
        renderCompactList(list, model);
        renderDialogList(dialog.list, model);
      }
      status.hidden = hasAchievements;
      status.textContent = hasAchievements ? "" : "No achievements unlocked in this period";
      viewAllButton.hidden = !hasAchievements;
      viewAllButton.disabled = !hasAchievements;
      if (!hasAchievements) {
        closeDialog();
      }
      return;
    }

    allAchievements = [];
    renderedModelKey = undefined;
    closeDialog();
    list.replaceChildren();
    dialog.list.replaceChildren();
    status.textContent = getStatusMessage(state);
    status.hidden = false;
    viewAllButton.hidden = true;
    viewAllButton.disabled = true;
  };

  const destroy = (): void => {
    closeDialog();
    viewAllButton.removeEventListener("click", openDialog);
    dialog.closeButton.removeEventListener("click", closeDialog);
    dialog.element.removeEventListener("click", closeOnBackdrop);
  };

  update(initialState);
  return { element, update, destroy };
}

function renderCompactList(list: HTMLOListElement, model: RecentAchievementsViewModel): void {
  list.replaceChildren(...model.featured.map((record) => createAchievementRow(record, "compact")));
}

function renderDialogList(list: HTMLOListElement, model: RecentAchievementsViewModel): void {
  list.replaceChildren(...model.all.map((record) => createAchievementRow(record, "full")));
}

function createModelKey(model: RecentAchievementsViewModel, period: AchievementPeriod): string {
  return [
    period.startAt,
    period.endAt,
    ...model.all.map(
      (record) =>
        `${record.appId}:${record.achievementId}:${record.unlockedAt}:${record.achievementName}:${record.gameName}:${record.imageUrl ?? ""}`,
    ),
  ].join("\u001f");
}

function createAchievementRow(
  record: AchievementUnlockRecord,
  variant: "compact" | "full",
): HTMLLIElement {
  const row = document.createElement("li");
  row.className = `steam-wrapped-interactive-row steam-wrapped-achievement-row steam-wrapped-achievement-row--${variant}`;
  row.tabIndex = 0;
  row.setAttribute("role", "button");
  row.setAttribute("aria-label", `Open ${record.gameName} achievements in Steam Library`);
  row.dataset.appId = record.appId;
  row.dataset.achievementId = record.achievementId;
  row.addEventListener("click", () => {
    openGameAchievementsInLibrary(record.appId);
  });
  row.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    openGameAchievementsInLibrary(record.appId);
  });

  const artwork = document.createElement("div");
  artwork.className = "steam-wrapped-achievement-row__artwork";
  const image = document.createElement("img");
  image.className = "steam-wrapped-achievement-row__image";
  image.alt = `${record.achievementName} achievement`;
  image.loading = "lazy";
  image.decoding = "async";
  image.draggable = false;
  const fallback = document.createElement("span");
  fallback.className = "steam-wrapped-achievement-row__artwork-fallback";
  fallback.setAttribute("aria-hidden", "true");
  fallback.append(createTrophyIcon());
  artwork.append(image, fallback);
  setAchievementArtwork(image, fallback, record.imageUrl);

  const details = document.createElement("div");
  details.className = "steam-wrapped-achievement-row__details";
  const achievementName = document.createElement("p");
  achievementName.className = "steam-wrapped-achievement-row__name";
  achievementName.textContent = record.achievementName;
  const gameName = document.createElement("p");
  gameName.className = "steam-wrapped-achievement-row__game-name";
  gameName.textContent = record.gameName;
  details.append(achievementName, gameName);

  const unlocked = document.createElement("time");
  unlocked.className = "steam-wrapped-achievement-row__unlocked-at";
  unlocked.dateTime = new Date(record.unlockedAt).toISOString();
  const timestamp = formatUnlockTimestamp(record.unlockedAt);
  const date = document.createElement("span");
  date.className = "steam-wrapped-achievement-row__date";
  date.textContent = timestamp.dateLabel;
  const time = document.createElement("span");
  time.className = "steam-wrapped-achievement-row__time";
  time.textContent = timestamp.timeLabel;
  unlocked.append(date, time);

  row.append(artwork, details, unlocked);
  return row;
}

function setAchievementArtwork(
  image: HTMLImageElement,
  fallback: HTMLElement,
  imageUrl: string | undefined,
): void {
  const source = imageUrl?.trim();
  if (!source) {
    image.hidden = true;
    fallback.hidden = false;
    return;
  }

  image.onload = (): void => {
    image.hidden = false;
    fallback.hidden = true;
  };
  image.onerror = (): void => {
    image.hidden = true;
    fallback.hidden = false;
  };
  image.hidden = false;
  fallback.hidden = true;
  image.src = source;
}

function createAllAchievementsDialog(): {
  readonly element: HTMLDialogElement;
  readonly list: HTMLOListElement;
  readonly closeButton: HTMLButtonElement;
} {
  const element = document.createElement("dialog");
  element.className = "steam-wrapped-achievements-dialog";
  element.hidden = true;
  element.setAttribute("aria-label", "All achievements unlocked in the selected period");

  const panel = document.createElement("div");
  panel.className = "steam-wrapped-achievements-dialog__panel";
  const header = document.createElement("div");
  header.className = "steam-wrapped-achievements-dialog__header";
  const title = document.createElement("h2");
  title.className = "steam-wrapped-achievements-dialog__title";
  title.textContent = "Achievements";
  const closeButton = document.createElement("button");
  closeButton.className = "steam-wrapped-achievements-dialog__close";
  closeButton.type = "button";
  closeButton.textContent = "Close";
  closeButton.setAttribute("aria-label", "Close achievements list");
  header.append(title, closeButton);

  const list = document.createElement("ol");
  list.className = "steam-wrapped-achievements-dialog__list";
  panel.append(header, list);
  element.append(panel);
  return { element, list, closeButton };
}

function formatUnlockTimestamp(timestamp: number): {
  readonly dateLabel: string;
  readonly timeLabel: string;
} {
  const value = new Date(timestamp);
  try {
    return {
      dateLabel: new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(value),
      timeLabel: new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(value),
    };
  } catch {
    return { dateLabel: value.toLocaleDateString(), timeLabel: value.toLocaleTimeString() };
  }
}

function getStatusMessage(state: InsightCardMessageState): string {
  switch (state.status) {
    case "loading":
      return state.message?.trim() || "Loading achievement data";
    case "empty":
      return state.message?.trim() || "No achievements unlocked in this period";
    case "unavailable":
      return state.message?.trim() || "Achievement details unavailable";
    case "error":
      return state.message?.trim() || "Achievement data could not be loaded";
  }
}

function createTrophyIcon(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.9");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("aria-hidden", "true");
  appendPath(svg, "M8 4h8v4a4 4 0 0 1-8 0V4Z");
  appendPath(svg, "M8 6H5v1a4 4 0 0 0 4 4M16 6h3v1a4 4 0 0 1-4 4M12 12v4M8.5 20h7M9 16h6");
  return svg;
}

function appendPath(svg: SVGSVGElement, data: string): void {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", data);
  svg.append(path);
}
