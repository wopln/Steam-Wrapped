import { createHeroSummaryCard, type HeroSummaryCard } from "../components/hero-summary-card";
import {
  createGamingInsightsSection,
  createLoadingGamingInsightsSectionState,
  type GamingInsightsSection,
  type GamingInsightsSectionState,
} from "../components/gaming-insights-section";
import {
  createLoadingRecentActivitySectionState,
  createRecentActivitySection,
  type RecentActivitySection,
} from "../components/recent-activity-section";
import {
  createShareSummarySection,
  type ShareSummarySection,
} from "../components/share-summary-section";
import {
  createLoadingStatisticsCardsRowState,
  createStatisticsCardsRow,
  type StatisticsCardsRow,
  type StatisticsCardsRowState,
} from "../components/statistics-cards-row";
import type { StatisticsCardComparison } from "../components/statistics-card";
import { createSteamWrappedHeader, type SteamWrappedHeader } from "../components/steam-wrapped-header";
import { DEFAULT_PERIOD, isPeriodLive, resolvePeriod, type PeriodSelection } from "../domain/period";
import {
  loadPeriodSessionInsights,
  type PeriodSessionInsights,
  type PlaytimeSummary,
} from "../platform/playtime-bridge";
import {
  GamingInsightsService,
  type GamingInsightsSnapshot,
} from "../services/gaming-insights-service";
import type { PlayedGameInsight } from "../services/period-session-aggregator";
import { DashboardPngExporter } from "../services/dashboard-png-exporter";
import { formatDecimalHours } from "../services/playtime-format";
import {
  type AbsoluteComparison,
  type PercentageComparison,
  PeriodStatisticsService,
  type PeriodStatistics,
} from "../services/period-statistics-service";

const SUMMARY_REFRESH_MS = 1_000;
const STATISTICS_REFRESH_MS = 5_000;
const LIVE_TICK_MS = 1_000;

/** Coordinates one selected period across the header, summary, and source-backed insights. */
export class SteamWrappedDashboard {
  private selection: PeriodSelection = DEFAULT_PERIOD;
  private header: SteamWrappedHeader | undefined;
  private hero: HeroSummaryCard | undefined;
  private statisticsRow: StatisticsCardsRow | undefined;
  private gamingInsightsSection: GamingInsightsSection | undefined;
  private recentActivitySection: RecentActivitySection | undefined;
  private shareSummarySection: ShareSummarySection | undefined;
  private captureContainer: HTMLElement | undefined;
  private readonly statisticsService = new PeriodStatisticsService();
  private readonly gamingInsightsService = new GamingInsightsService();
  private readonly pngExporter = new DashboardPngExporter();
  private summary: PlaytimeSummary | undefined;
  private statistics: PeriodStatistics | undefined;
  private gamingInsights: GamingInsightsSnapshot | undefined;
  private statisticsUnavailable = false;
  private requestVersion = 0;
  private statisticsRequestVersion = 0;
  private summaryRefreshing = false;
  private summaryExporting = false;
  private lastStatisticsRefreshAt = 0;
  private refreshTimer: number | undefined;
  private liveTimer: number | undefined;

  public mount(root: HTMLElement): void {
    const content = document.createElement("div");
    content.className = "steam-wrapped-dashboard";
    this.header = createSteamWrappedHeader(this.selection, (selection) => this.setPeriod(selection));
    this.hero = createHeroSummaryCard();
    this.statisticsRow = createStatisticsCardsRow();
    this.gamingInsightsSection = createGamingInsightsSection();
    this.recentActivitySection = createRecentActivitySection();
    this.shareSummarySection = createShareSummarySection({
      onShare: () => void this.exportSummary(),
    });

    const captureContainer = document.createElement("div");
    captureContainer.className = "steam-wrapped-dashboard__capture";
    captureContainer.setAttribute("data-steam-wrapped-capture", "true");
    captureContainer.append(
      this.header.element,
      this.hero.element,
      this.statisticsRow.element,
      this.gamingInsightsSection.element,
      this.recentActivitySection.element,
    );
    this.captureContainer = captureContainer;
    content.append(
      captureContainer,
      this.shareSummarySection.element,
    );
    root.append(content);
    this.renderSelection();
    void this.refreshSummary();
    this.refreshTimer = window.setInterval(() => void this.refreshSummary(), SUMMARY_REFRESH_MS);
    this.liveTimer = window.setInterval(() => this.renderHero(), LIVE_TICK_MS);
  }

  public destroy(): void {
    if (this.refreshTimer !== undefined) {
      window.clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
    if (this.liveTimer !== undefined) {
      window.clearInterval(this.liveTimer);
      this.liveTimer = undefined;
    }
    this.header?.destroy();
    this.header = undefined;
    this.hero = undefined;
    this.statisticsRow = undefined;
    this.gamingInsightsSection = undefined;
    this.recentActivitySection?.destroy();
    this.recentActivitySection = undefined;
    this.shareSummarySection?.destroy();
    this.shareSummarySection = undefined;
    this.captureContainer = undefined;
    this.summary = undefined;
    this.statistics = undefined;
    this.gamingInsights = undefined;
    this.statisticsUnavailable = false;
    this.summaryExporting = false;
  }

  private setPeriod(selection: PeriodSelection): void {
    this.selection = selection;
    this.requestVersion += 1;
    this.summary = undefined;
    this.statistics = undefined;
    this.gamingInsights = undefined;
    this.statisticsUnavailable = false;
    this.lastStatisticsRefreshAt = 0;
    this.renderSelection();
    this.statisticsRow?.update(createLoadingStatisticsCardsRowState());
    this.gamingInsightsSection?.update(createLoadingGamingInsightsSectionState());
    this.recentActivitySection?.update(createLoadingRecentActivitySectionState());
    void this.refreshSummary();
  }

  private renderSelection(): void {
    this.header?.update(this.selection);
  }

  private async refreshSummary(): Promise<void> {
    if (this.summaryRefreshing) {
      return;
    }

    const period = resolvePeriod(this.selection);
    const version = this.requestVersion;
    this.summaryRefreshing = true;
    try {
      // One bridge snapshot feeds the hero, Step 3 cards, and Step 4's
      // session aggregation. This avoids a second independent source of
      // session overlap truth inside the UI.
      const sessions = await loadPeriodSessionInsights(period.startAt, period.endAt);
      const summary = sessions;
      if (version !== this.requestVersion) {
        return;
      }
      this.summary = summary;
      this.renderHero(period);
      this.updateGamingInsights(period, sessions, version);
      if (!this.statistics) {
        this.renderPartialStatistics();
      }
      if (Date.now() - this.lastStatisticsRefreshAt >= STATISTICS_REFRESH_MS) {
        this.lastStatisticsRefreshAt = Date.now();
        void this.refreshStatistics(period, summary, version);
      }
    } catch {
      if (version === this.requestVersion) {
        this.summary = undefined;
        this.hero?.showUnavailable();
        this.statisticsRow?.update(createUnavailableStatisticsCardsRowState());
        this.gamingInsightsSection?.update(createUnavailableGamingInsightsSectionState());
        this.recentActivitySection?.update(createUnavailableRecentActivitySectionState());
      }
    } finally {
      this.summaryRefreshing = false;
      if (version !== this.requestVersion) {
        void this.refreshSummary();
      }
    }
  }

  private async refreshStatistics(
    period: ReturnType<typeof resolvePeriod>,
    summary: PlaytimeSummary,
    summaryRequestVersion: number,
  ): Promise<void> {
    const statisticsRequestVersion = ++this.statisticsRequestVersion;
    try {
      const statistics = await this.statisticsService.load(this.selection, period, summary);
      if (
        summaryRequestVersion !== this.requestVersion ||
        statisticsRequestVersion !== this.statisticsRequestVersion
      ) {
        return;
      }
      this.statistics = statistics;
      this.statisticsUnavailable = false;
      this.renderStatistics();
      this.renderRecentActivity(period);
    } catch {
      if (
        summaryRequestVersion === this.requestVersion &&
        statisticsRequestVersion === this.statisticsRequestVersion
      ) {
        this.statistics = undefined;
        this.statisticsUnavailable = true;
        this.statisticsRow?.update(createUnavailableStatisticsCardsRowState());
        this.renderRecentActivity(period);
      }
    }
  }

  private renderHero(period = resolvePeriod(this.selection)): void {
    if (!this.summary) {
      return;
    }

    const canAdvanceLive = isPeriodLive(this.selection);
    const elapsedSinceSummary = canAdvanceLive
      ? Math.max(0, Date.now() - this.summary.capturedAt) * this.summary.runningSessionCount
      : 0;
    const playtime = formatDecimalHours(
      this.summary.totalMilliseconds + elapsedSinceSummary,
      "long",
    );
    this.hero?.update(playtime, this.summary.uniqueGameCount, period.summarySuffix);
    this.renderStatistics();
    this.renderGamingInsights(period);
  }

  private updateGamingInsights(
    period: ReturnType<typeof resolvePeriod>,
    sessions: PeriodSessionInsights,
    requestVersion: number,
  ): void {
    // A live range's end moves every refresh, but its start identifies the
    // calendar period whose sessions were clipped by the frontend tracker.
    if (
      requestVersion !== this.requestVersion ||
      period.startAt !== resolvePeriod(this.selection).startAt
    ) {
      return;
    }

    const snapshot = this.gamingInsightsService.createSnapshot(period, sessions);
    this.gamingInsights = snapshot;
    this.renderGamingInsights(period);
    void this.hydrateGamingArtwork(this.selection, period, snapshot, requestVersion);
  }

  private async hydrateGamingArtwork(
    selection: PeriodSelection,
    period: ReturnType<typeof resolvePeriod>,
    snapshot: GamingInsightsSnapshot,
    requestVersion: number,
  ): Promise<void> {
    try {
      await this.gamingInsightsService.hydrateArtwork(selection, period, snapshot);
      if (
        requestVersion === this.requestVersion &&
        this.gamingInsights === snapshot &&
        period.startAt === resolvePeriod(this.selection).startAt
      ) {
        this.renderGamingInsights(period);
      }
    } catch {
      // Image metadata is optional. The already-rendered session metrics keep
      // their truthful values and the artwork component shows its fallback.
    }
  }

  private renderGamingInsights(period = resolvePeriod(this.selection)): void {
    if (!this.gamingInsights) {
      return;
    }

    const currentPeriod = resolvePeriod(this.selection);
    if (
      period.startAt !== currentPeriod.startAt ||
      this.gamingInsights.periodStartAt !== currentPeriod.startAt
    ) {
      this.gamingInsightsSection?.update(createLoadingGamingInsightsSectionState());
      void this.refreshSummary();
      return;
    }

    const insights = this.gamingInsightsService.getAggregate(
      this.selection,
      currentPeriod,
      this.gamingInsights,
    );
    const mostPlayed = insights.mostPlayedGame;
    const longestSession = insights.longestSession;
    const peakPlayTime = insights.peakPlayTime;

    this.gamingInsightsSection?.update({
      mostPlayedGame: mostPlayed
          ? {
            status: "normal",
            appId: mostPlayed.appId,
            gameName: mostPlayed.gameName,
            playtimeLabel: `${formatDecimalHours(mostPlayed.totalMilliseconds)} Played`,
            imageUrl: this.gamingInsightsService.getWideArtwork(mostPlayed.appId),
          }
        : { status: "empty", message: "No games played" },
      longestSession: longestSession
          ? {
            status: "normal",
            appId: longestSession.appId,
            durationLabel: formatDecimalHours(longestSession.durationMilliseconds),
            startedAtLabel: formatSessionStart(longestSession.startedAt),
            ...(longestSession.startedBeforeSelectedPeriod
              ? { startContextLabel: "Started before selected period" }
              : {}),
            gameName: longestSession.gameName,
            imageUrl: this.gamingInsightsService.getCompactArtwork(longestSession.appId),
          }
        : { status: "empty", message: "No session data" },
      peakPlayTime:
        peakPlayTime.peakHour === undefined
          ? { status: "empty", message: "No activity data" }
          : {
              status: "normal",
              hourLabel: formatLocalHour(peakPlayTime.peakHour),
              histogram: {
                status: "normal",
                buckets: peakPlayTime.buckets,
                peakHour: peakPlayTime.peakHour,
              },
      },
    });
    this.renderRecentActivity(currentPeriod, insights.games);
  }

  private renderRecentActivity(
    period = resolvePeriod(this.selection),
    games?: readonly PlayedGameInsight[],
  ): void {
    if (!this.gamingInsights) {
      return;
    }

    const currentPeriod = resolvePeriod(this.selection);
    if (
      period.startAt !== currentPeriod.startAt ||
      this.gamingInsights.periodStartAt !== currentPeriod.startAt
    ) {
      this.recentActivitySection?.update(createLoadingRecentActivitySectionState());
      return;
    }

    const selectedGames =
      games ??
      this.gamingInsightsService.getAggregate(this.selection, currentPeriod, this.gamingInsights).games;
    const recentlyPlayed = selectedGames.map((game) => ({
      appId: game.appId,
      gameName: game.gameName,
      totalMilliseconds: game.totalMilliseconds,
      playtimeLabel: formatDecimalHours(game.totalMilliseconds),
      mostRecentActivityAt: game.mostRecentActivityAt,
      imageUrl:
        this.gamingInsightsService.getWideArtwork(game.appId) ??
        this.gamingInsightsService.getCompactArtwork(game.appId),
    }));

    const achievementState = this.getRecentAchievementState(currentPeriod);
    this.recentActivitySection?.update({
      recentAchievements: achievementState,
      recentlyPlayed: recentlyPlayed.length
        ? { status: "normal", games: recentlyPlayed }
        : { status: "empty", message: "No games played in this period" },
    });
  }

  private getRecentAchievementState(period: ReturnType<typeof resolvePeriod>) {
    const statistics = this.statistics;
    const achievements = statistics?.achievements;
    if (!achievements) {
      return this.statisticsUnavailable
        ? { status: "unavailable" as const, message: "Achievement details unavailable" }
        : { status: "loading" as const, message: "Loading achievement data" };
    }
    if (achievements.status === "unavailable") {
      return { status: "unavailable" as const, message: "Achievement details unavailable" };
    }

    const gameNames = new Map(statistics.selected.games.map((game) => [game.appId, game.gameName] as const));
    return {
      status: "normal" as const,
      period: { startAt: period.startAt, endAt: period.endAt },
      records: achievements.records.map((record) => ({
        appId: record.appId,
        achievementId: record.achievementId,
        achievementName: record.name?.trim() || "Achievement name unavailable",
        gameName: gameNames.get(record.appId)?.trim() || "Game name unavailable",
        ...(record.imageUrl ? { imageUrl: record.imageUrl } : {}),
        unlockedAt: record.unlockedAt,
      })),
    };
  }

  private async exportSummary(): Promise<void> {
    const captureContainer = this.captureContainer;
    if (this.summaryExporting || !captureContainer) {
      return;
    }

    this.summaryExporting = true;
    this.shareSummarySection?.update({
      isExporting: true,
    });

    // Start with a safe failure outcome so a future synchronous change inside
    // the try block cannot leave the footer without meaningful feedback.
    let statusMessage = "PNG export could not be completed. Please try again.";
    let statusTone: "success" | "error" = "error";
    try {
      const period = resolvePeriod(this.selection);
      await this.pngExporter.export(captureContainer, {
        filename: `steam-wrapped-${period.headerLabel}`,
      });
      // Steam's native browser downloader has no completion callback. Be
      // precise: the PNG download was started, rather than claiming it has
      // already been written to disk.
      statusMessage = "PNG download started.";
      statusTone = "success";
    } catch (cause) {
      console.error("[Steam Wrapped] PNG export failed.", cause);
      statusMessage = "PNG export could not be completed. Please try again.";
      statusTone = "error";
    } finally {
      this.summaryExporting = false;
      this.shareSummarySection?.update({ isExporting: false, statusMessage, statusTone });
    }
  }

  private renderStatistics(): void {
    if (!this.statistics) {
      return;
    }

    const summary = this.summary ?? this.statistics.selected;
    const live = this.statisticsService.getLivePlaytime(this.selection, summary);
    const favoriteGenre = this.statisticsService.getLiveFavoriteGenre(
      this.statistics.favoriteGenre,
      live.games,
    );
    this.statisticsRow?.update({
      totalPlaytime: {
        status: live.totalMilliseconds > 0 ? "normal" : "empty",
        value: formatDecimalHours(live.totalMilliseconds),
        comparison: formatPercentageComparison(
          this.statistics.totalPlaytimeComparison,
          this.statistics.comparisonPeriod.label,
        ),
      },
      gamesPlayed: {
        status: summary.uniqueGameCount > 0 ? "normal" : "empty",
        value: summary.uniqueGameCount.toLocaleString(),
        comparison: formatAbsoluteComparison(
          this.statistics.gamesPlayedComparison,
          this.statistics.comparisonPeriod.label,
        ),
      },
      achievements: this.renderAchievementCard(),
      favoriteGenre: renderFavoriteGenreCard(favoriteGenre),
    });
  }

  private renderPartialStatistics(): void {
    if (!this.summary) {
      return;
    }
    const live = this.statisticsService.getLivePlaytime(this.selection, this.summary);
    this.statisticsRow?.update({
      totalPlaytime: {
        status: live.totalMilliseconds > 0 ? "normal" : "empty",
        value: formatDecimalHours(live.totalMilliseconds),
      },
      gamesPlayed: {
        status: this.summary.uniqueGameCount > 0 ? "normal" : "empty",
        value: this.summary.uniqueGameCount.toLocaleString(),
      },
      achievements: { status: "loading", message: "Loading achievement data" },
      favoriteGenre: { status: "loading", message: "Loading genre data" },
    });
  }

  private renderAchievementCard(): StatisticsCardsRowState["achievements"] {
    const achievement = this.statistics?.achievements;
    if (!achievement || achievement.status === "unavailable") {
      return { status: "unavailable", message: "Achievement data unavailable" };
    }
    return {
      status: achievement.status === "normal" ? "normal" : "empty",
      value: (achievement.count ?? 0).toLocaleString(),
      comparison: achievement.comparison
        ? formatAbsoluteComparison(achievement.comparison, this.statistics?.comparisonPeriod.label ?? "")
        : undefined,
    };
  }
}

function formatPercentageComparison(
  comparison: PercentageComparison,
  label: string,
): StatisticsCardComparison {
  if (comparison.status === "new") {
    return {
      direction: "up",
      text: label === "vs last month" ? "New this month" : "New this period",
    };
  }
  if (comparison.status === "same") {
    return { direction: "neutral", text: "No change" };
  }
  return {
    direction: comparison.direction,
    text: `${formatComparisonNumber(comparison.percentage ?? 0)}% ${label}`,
  };
}

function formatAbsoluteComparison(
  comparison: AbsoluteComparison,
  label: string,
): StatisticsCardComparison {
  if (comparison.status === "same") {
    return {
      direction: "neutral",
      text: label === "vs last month" ? "Same as last month" : "Same as previous period",
    };
  }
  const difference = comparison.difference;
  return {
    direction: comparison.direction,
    text: `${difference > 0 ? "+" : "-"}${Math.abs(difference).toLocaleString()} ${label}`,
  };
}

function renderFavoriteGenreCard(
  favoriteGenre: PeriodStatistics["favoriteGenre"],
): StatisticsCardsRowState["favoriteGenre"] {
  if (favoriteGenre.status === "unavailable") {
    return { status: "unavailable", message: "Genre metadata unavailable" };
  }
  if (favoriteGenre.status === "empty") {
    return { status: "empty", value: "No data", detail: "0% of games" };
  }
  return {
    status: "normal",
    value: favoriteGenre.genre ?? "No data",
    detail: `${formatComparisonNumber(favoriteGenre.percentage)}% of games`,
  };
}

function createUnavailableStatisticsCardsRowState(): StatisticsCardsRowState {
  return {
    totalPlaytime: { status: "unavailable", message: "Playtime data unavailable" },
    gamesPlayed: { status: "unavailable", message: "Playtime data unavailable" },
    achievements: { status: "unavailable", message: "Achievement data unavailable" },
    favoriteGenre: { status: "unavailable", message: "Genre metadata unavailable" },
  };
}

function createUnavailableGamingInsightsSectionState(): GamingInsightsSectionState {
  return {
    mostPlayedGame: { status: "unavailable", message: "Playtime data unavailable" },
    longestSession: { status: "unavailable", message: "Session data unavailable" },
    peakPlayTime: { status: "unavailable", message: "Activity data unavailable" },
  };
}

function createUnavailableRecentActivitySectionState() {
  return {
    recentAchievements: {
      status: "unavailable" as const,
      message: "Achievement data unavailable",
    },
    recentlyPlayed: {
      status: "unavailable" as const,
      message: "Recently played data unavailable",
    },
  };
}

function formatSessionStart(timestamp: number): string {
  const date = new Date(timestamp);
  try {
    const day = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric" }).format(date);
    const time = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
    return `${day} • ${time}`;
  } catch {
    return date.toLocaleString();
  }
}

function formatLocalHour(hour: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(
      new Date(2020, 0, 1, hour, 0, 0),
    );
  } catch {
    const suffix = hour < 12 ? "AM" : "PM";
    return `${hour % 12 || 12} ${suffix}`;
  }
}

function formatComparisonNumber(value: number): string {
  const rounded = Math.abs(value) < 10 ? Number(value.toFixed(1)) : Math.round(value);
  return rounded.toLocaleString(undefined, { maximumFractionDigits: 1 });
}
