import {
  isPeriodLive,
  resolveComparisonPeriod,
  type ComparisonPeriod,
  type PeriodSelection,
  type ResolvedPeriod,
} from "../domain/period";
import {
  loadAchievementSummary,
  loadGameGenreMetadata,
  loadPlaytimeSummary,
  type AchievementSummary,
  type AchievementUnlockRecord,
  type DataAvailability,
  type GameGenreMetadata,
  type PlaytimeSummary,
  type TrackedGamePlaytime,
} from "../platform/playtime-bridge";

export type ComparisonDirection = "up" | "down" | "neutral";

export interface PercentageComparison {
  readonly status: "change" | "same" | "new";
  readonly direction: ComparisonDirection;
  readonly percentage?: number;
}

export interface AbsoluteComparison {
  readonly status: "change" | "same";
  readonly direction: ComparisonDirection;
  readonly difference: number;
}

export interface AchievementStatistics {
  readonly status: DataAvailability;
  readonly count?: number;
  /** The same real selected-period unlock records used for the count above. */
  readonly records: readonly AchievementUnlockRecord[];
  readonly comparison?: AbsoluteComparison;
}

export interface FavoriteGenreStatistics {
  readonly status: DataAvailability;
  readonly genre?: string;
  readonly percentage: number;
  readonly genreByAppId: Readonly<Record<string, string>>;
}

export interface PeriodStatistics {
  readonly selected: PlaytimeSummary;
  readonly comparison: PlaytimeSummary;
  readonly comparisonPeriod: ComparisonPeriod;
  readonly totalPlaytimeComparison: PercentageComparison;
  readonly gamesPlayedComparison: AbsoluteComparison;
  readonly achievements: AchievementStatistics;
  readonly favoriteGenre: FavoriteGenreStatistics;
}

export interface LivePlaytimeStatistics {
  readonly totalMilliseconds: number;
  readonly games: readonly TrackedGamePlaytime[];
}

/**
 * Computes all Step 3 values from the frontend tracker bridge. It never reads
 * session storage itself, so the hero and cards share one playtime source.
 */
export class PeriodStatisticsService {
  public async load(
    selection: PeriodSelection,
    period: ResolvedPeriod,
    selected: PlaytimeSummary,
  ): Promise<PeriodStatistics> {
    const comparisonPeriod = resolveComparisonPeriod(selection);
    const comparisonPromise = loadPlaytimeSummary(comparisonPeriod.startAt, comparisonPeriod.endAt);
    const selectedAchievementPromise = this.loadAchievements(selected.games, period);
    const genrePromise = this.loadFavoriteGenre(selected);

    const comparison = await comparisonPromise;
    const comparisonAchievementPromise = this.loadAchievements(comparison.games, comparisonPeriod);
    const [selectedAchievements, comparisonAchievements, favoriteGenre] = await Promise.all([
      selectedAchievementPromise,
      comparisonAchievementPromise,
      genrePromise,
    ]);

    return {
      selected,
      comparison,
      comparisonPeriod,
      totalPlaytimeComparison: calculatePercentageComparison(
        selected.totalMilliseconds,
        comparison.totalMilliseconds,
      ),
      gamesPlayedComparison: calculateAbsoluteComparison(
        selected.uniqueGameCount,
        comparison.uniqueGameCount,
      ),
      achievements: calculateAchievementStatistics(selectedAchievements, comparisonAchievements),
      favoriteGenre,
    };
  }

  public getLivePlaytime(
    selection: PeriodSelection,
    summary: PlaytimeSummary,
    now = Date.now(),
  ): LivePlaytimeStatistics {
    const elapsed = isPeriodLive(selection) ? Math.max(0, now - summary.capturedAt) : 0;
    if (!elapsed || !summary.runningSessionCount) {
      return { totalMilliseconds: summary.totalMilliseconds, games: summary.games };
    }

    const games = summary.games.map((game) => ({
      ...game,
      totalMilliseconds: game.totalMilliseconds + elapsed * game.runningSessionCount,
    }));
    return {
      totalMilliseconds: summary.totalMilliseconds + elapsed * summary.runningSessionCount,
      games,
    };
  }

  public getLiveFavoriteGenre(
    favorite: FavoriteGenreStatistics,
    games: readonly TrackedGamePlaytime[],
  ): FavoriteGenreStatistics {
    if (favorite.status !== "normal") {
      return favorite;
    }
    return calculateFavoriteGenreFromGames(games, favorite.genreByAppId);
  }

  private async loadAchievements(
    games: readonly TrackedGamePlaytime[],
    period: Pick<ResolvedPeriod | ComparisonPeriod, "startAt" | "endAt">,
  ): Promise<AchievementSummary> {
    try {
      return await loadAchievementSummary(
        games.map((game) => game.appId),
        period.startAt,
        period.endAt,
      );
    } catch {
      return { status: "unavailable", records: [], capturedAt: Date.now() };
    }
  }

  private async loadFavoriteGenre(selected: PlaytimeSummary): Promise<FavoriteGenreStatistics> {
    if (!selected.games.length) {
      return emptyFavoriteGenre();
    }

    try {
      const metadata = await loadGameGenreMetadata(selected.games.map((game) => game.appId));
      const genres = toGenreMap(selected.games, metadata.entries);
      return calculateFavoriteGenreFromGames(selected.games, genres);
    } catch {
      return unavailableFavoriteGenre();
    }
  }
}

function calculatePercentageComparison(selected: number, comparison: number): PercentageComparison {
  if (selected <= 0 && comparison <= 0) {
    return { status: "same", direction: "neutral" };
  }
  if (comparison <= 0) {
    return { status: "new", direction: "up" };
  }

  const percentage = ((selected - comparison) / comparison) * 100;
  if (percentage === 0) {
    return { status: "same", direction: "neutral" };
  }
  return {
    status: "change",
    direction: percentage > 0 ? "up" : "down",
    percentage: Math.abs(percentage),
  };
}

function calculateAbsoluteComparison(selected: number, comparison: number): AbsoluteComparison {
  const difference = selected - comparison;
  if (!difference) {
    return { status: "same", direction: "neutral", difference: 0 };
  }
  return {
    status: "change",
    direction: difference > 0 ? "up" : "down",
    difference,
  };
}

function calculateAchievementStatistics(
  selected: AchievementSummary,
  comparison: AchievementSummary,
): AchievementStatistics {
  if (selected.status === "unavailable") {
    return { status: "unavailable", records: [] };
  }

  const count = selected.count ?? 0;
  return {
    status: selected.status,
    count,
    records: selected.records,
    ...(comparison.status === "unavailable"
      ? {}
      : { comparison: calculateAbsoluteComparison(count, comparison.count ?? 0) }),
  };
}

function toGenreMap(
  games: readonly TrackedGamePlaytime[],
  metadata: readonly GameGenreMetadata[],
): Readonly<Record<string, string>> {
  const entries = new Map(metadata.map((entry) => [entry.appId, entry]));
  const genres: Record<string, string> = {};
  for (const game of games) {
    const entry = entries.get(game.appId);
    if (entry?.status === "normal" && entry.genre) {
      genres[game.appId] = entry.genre;
    }
  }
  return genres;
}

function calculateFavoriteGenreFromGames(
  games: readonly TrackedGamePlaytime[],
  genreByAppId: Readonly<Record<string, string>>,
): FavoriteGenreStatistics {
  if (!games.length) {
    return emptyFavoriteGenre();
  }

  const genreCounts = new Map<string, number>();
  let gamesWithGenre = 0;
  for (const game of games) {
    const genre = genreByAppId[game.appId];
    if (!genre) {
      continue;
    }
    gamesWithGenre += 1;
    genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
  }

  if (!gamesWithGenre) {
    return unavailableFavoriteGenre();
  }

  const favorite = [...genreCounts.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  )[0];
  if (!favorite) {
    return emptyFavoriteGenre();
  }
  return {
    status: "normal",
    genre: favorite[0],
    percentage: (favorite[1] / gamesWithGenre) * 100,
    genreByAppId,
  };
}

function emptyFavoriteGenre(): FavoriteGenreStatistics {
  return { status: "empty", percentage: 0, genreByAppId: {} };
}

function unavailableFavoriteGenre(): FavoriteGenreStatistics {
  return { status: "unavailable", percentage: 0, genreByAppId: {} };
}
