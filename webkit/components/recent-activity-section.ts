import {
  createRecentAchievementsCard,
  type RecentAchievementsCard,
  type RecentAchievementsCardState,
} from "./recent-achievements-card";
import {
  createRecentlyPlayedCard,
  type RecentlyPlayedCard,
  type RecentlyPlayedCardState,
} from "./recently-played-card";

export interface RecentActivitySectionState {
  readonly recentAchievements: RecentAchievementsCardState;
  readonly recentlyPlayed: RecentlyPlayedCardState;
}

export interface RecentActivitySection {
  readonly element: HTMLElement;
  readonly recentAchievements: RecentAchievementsCard;
  readonly recentlyPlayed: RecentlyPlayedCard;
  update(state: RecentActivitySectionState): void;
  destroy(): void;
}

/**
 * A paired selected-period detail section. Both cards receive their data from
 * the dashboard's existing period state, but each stays independently
 * presentational and recoverable when one provider is unavailable.
 */
export function createRecentActivitySection(
  initialState: RecentActivitySectionState = createLoadingRecentActivitySectionState(),
): RecentActivitySection {
  const element = document.createElement("section");
  element.className = "steam-wrapped-recent-activity";
  element.setAttribute("aria-label", "Recent activity");

  const grid = document.createElement("div");
  grid.className = "steam-wrapped-recent-activity__grid";
  const recentAchievements = createRecentAchievementsCard();
  const recentlyPlayed = createRecentlyPlayedCard();
  grid.append(recentAchievements.element, recentlyPlayed.element);
  element.append(grid);

  const update = (state: RecentActivitySectionState): void => {
    recentAchievements.update(state.recentAchievements);
    recentlyPlayed.update(state.recentlyPlayed);
  };

  update(initialState);
  return {
    element,
    recentAchievements,
    recentlyPlayed,
    update,
    destroy: () => {
      recentAchievements.destroy();
      recentlyPlayed.destroy();
    },
  };
}

export function createLoadingRecentActivitySectionState(): RecentActivitySectionState {
  return {
    recentAchievements: { status: "loading" },
    recentlyPlayed: { status: "loading" },
  };
}
