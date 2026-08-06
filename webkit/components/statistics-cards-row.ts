import {
  createStatisticsCard,
  type StatisticsCard,
  type StatisticsCardState,
} from "./statistics-card";

export interface StatisticsCardsRowState {
  readonly totalPlaytime: StatisticsCardState;
  readonly gamesPlayed: StatisticsCardState;
  readonly achievements: StatisticsCardState;
  readonly favoriteGenre: StatisticsCardState;
}

export interface StatisticsCardsRow {
  readonly element: HTMLElement;
  readonly totalPlaytime: StatisticsCard;
  readonly gamesPlayed: StatisticsCard;
  readonly achievements: StatisticsCard;
  readonly favoriteGenre: StatisticsCard;
  update(state: StatisticsCardsRowState): void;
}

/**
 * The fixed four-card presentation row for Step 3. It exposes each card as
 * well as one atomic update method, so dashboard code can keep its period
 * calculations separate from visual rendering.
 */
export function createStatisticsCardsRow(
  initialState: StatisticsCardsRowState = createLoadingStatisticsCardsRowState(),
): StatisticsCardsRow {
  const element = document.createElement("section");
  element.className = "steam-wrapped-statistics-row";
  element.setAttribute("aria-label", "Steam Wrapped statistics");

  const totalPlaytime = createStatisticsCard({
    title: "Total Playtime",
    icon: "clock",
    tone: "blue",
    valueKind: "number",
  });
  const gamesPlayed = createStatisticsCard({
    title: "Games Played",
    icon: "gamepad",
    tone: "purple",
    valueKind: "number",
  });
  const achievements = createStatisticsCard({
    title: "Achievements",
    icon: "trophy",
    tone: "gold",
    valueKind: "number",
  });
  const favoriteGenre = createStatisticsCard({
    title: "Favorite Genre",
    icon: "star",
    tone: "green",
    valueKind: "text",
  });

  element.append(totalPlaytime.element, gamesPlayed.element, achievements.element, favoriteGenre.element);

  const update = (state: StatisticsCardsRowState): void => {
    totalPlaytime.update(state.totalPlaytime);
    gamesPlayed.update(state.gamesPlayed);
    achievements.update(state.achievements);
    favoriteGenre.update(state.favoriteGenre);
  };

  update(initialState);
  return {
    element,
    totalPlaytime,
    gamesPlayed,
    achievements,
    favoriteGenre,
    update,
  };
}

export function createLoadingStatisticsCardsRowState(): StatisticsCardsRowState {
  return {
    totalPlaytime: { status: "loading" },
    gamesPlayed: { status: "loading" },
    achievements: { status: "loading" },
    favoriteGenre: { status: "loading" },
  };
}
