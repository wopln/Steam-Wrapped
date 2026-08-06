import {
  createLongestSessionCard,
  type LongestSessionCard,
  type LongestSessionCardState,
} from "./longest-session-card";
import {
  createMostPlayedGameCard,
  type MostPlayedGameCard,
  type MostPlayedGameCardState,
} from "./most-played-game-card";
import {
  createPeakPlayTimeCard,
  type PeakPlayTimeCard,
  type PeakPlayTimeCardState,
} from "./peak-play-time-card";

export interface GamingInsightsSectionState {
  readonly mostPlayedGame: MostPlayedGameCardState;
  readonly longestSession: LongestSessionCardState;
  readonly peakPlayTime: PeakPlayTimeCardState;
}

export interface GamingInsightsSection {
  readonly element: HTMLElement;
  readonly mostPlayedGame: MostPlayedGameCard;
  readonly longestSession: LongestSessionCard;
  readonly peakPlayTime: PeakPlayTimeCard;
  update(state: GamingInsightsSectionState): void;
}

/**
 * Step 4's responsive structural section: the large most-played card sits
 * first, followed by a stacked right-hand column on desktop. CSS owns the
 * breakpoint; this DOM order also remains natural when it stacks on mobile.
 */
export function createGamingInsightsSection(
  initialState: GamingInsightsSectionState = createLoadingGamingInsightsSectionState(),
): GamingInsightsSection {
  const element = document.createElement("section");
  element.className = "steam-wrapped-gaming-insights";
  element.setAttribute("aria-label", "Gaming insights");

  const grid = document.createElement("div");
  grid.className = "steam-wrapped-gaming-insights__grid";

  const mostPlayedGame = createMostPlayedGameCard();
  const longestSession = createLongestSessionCard();
  const peakPlayTime = createPeakPlayTimeCard();

  const aside = document.createElement("div");
  aside.className = "steam-wrapped-gaming-insights__aside";
  aside.append(longestSession.element, peakPlayTime.element);
  grid.append(mostPlayedGame.element, aside);
  element.append(grid);

  const update = (state: GamingInsightsSectionState): void => {
    mostPlayedGame.update(state.mostPlayedGame);
    longestSession.update(state.longestSession);
    peakPlayTime.update(state.peakPlayTime);
  };

  update(initialState);
  return {
    element,
    mostPlayedGame,
    longestSession,
    peakPlayTime,
    update,
  };
}

export function createLoadingGamingInsightsSectionState(): GamingInsightsSectionState {
  return {
    mostPlayedGame: { status: "loading" },
    longestSession: { status: "loading" },
    peakPlayTime: { status: "loading" },
  };
}
