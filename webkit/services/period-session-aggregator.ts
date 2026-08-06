import { isPeriodLive, type PeriodSelection, type ResolvedPeriod } from "../domain/period";
import type { PeriodSessionInsight, PeriodSessionInsights } from "../platform/playtime-bridge";

/** One App ID's real play activity within the selected period. */
export interface PlayedGameInsight {
  readonly appId: string;
  readonly gameName: string;
  /** Sum of only the portions of this App ID's sessions that overlap the period. */
  readonly totalMilliseconds: number;
  /** The actual start time of the latest selected-period session for tie handling. */
  readonly mostRecentSessionStartedAt: number;
  /** The most recent selected-period activity boundary, including a live session's current time. */
  readonly mostRecentActivityAt: number;
}

export type MostPlayedGameInsight = PlayedGameInsight;

export interface LongestSessionInsight {
  readonly appId: string;
  readonly gameName: string;
  /** The selected-period portion of this one uninterrupted game session. */
  readonly durationMilliseconds: number;
  /** The real launch timestamp, deliberately not clipped to the selected period. */
  readonly startedAt: number;
  readonly startedBeforeSelectedPeriod: boolean;
  readonly isRunning: boolean;
}

export interface PeakPlayTimeInsight {
  /** One session-start count for each local hour, beginning with midnight. */
  readonly buckets: readonly number[];
  readonly peakHour?: number;
}

export interface PeriodSessionAggregate {
  /** Every unique game with valid tracked playtime in the selected period, newest activity first. */
  readonly games: readonly PlayedGameInsight[];
  readonly mostPlayedGame?: MostPlayedGameInsight;
  readonly longestSession?: LongestSessionInsight;
  readonly peakPlayTime: PeakPlayTimeInsight;
}

interface EffectiveSession extends PeriodSessionInsight {
  readonly effectiveOverlapMilliseconds: number;
}

const HOURS_PER_DAY = 24;

/**
 * The single aggregation layer for Step 4. The frontend tracker has already
 * clipped every session to the selected period; this class only derives the
 * every game-level and session-level metric from that shared snapshot.
 */
export class PeriodSessionAggregator {
  public aggregate(
    selection: PeriodSelection,
    period: ResolvedPeriod,
    snapshot: PeriodSessionInsights,
    now = Date.now(),
  ): PeriodSessionAggregate {
    const sessions = snapshot.sessions
      .map((session) => this.toEffectiveSession(selection, period, snapshot.capturedAt, session, now))
      .filter((session): session is EffectiveSession => session !== undefined);

    const games = this.aggregateGames(sessions);
    return {
      games,
      mostPlayedGame: this.findMostPlayedGame(games),
      longestSession: this.findLongestSession(sessions, period),
      peakPlayTime: this.findPeakPlayTime(sessions),
    };
  }

  private toEffectiveSession(
    selection: PeriodSelection,
    period: ResolvedPeriod,
    capturedAt: number,
    session: PeriodSessionInsight,
    now: number,
  ): EffectiveSession | undefined {
    let overlapEndAt = session.overlapEndAt;

    // The tracker persists only lifecycle boundaries. During a live session,
    // advance the in-memory overlap between bridge snapshots without writing
    // each render to local storage.
    if (session.isRunning && isPeriodLive(selection)) {
      const latestPossibleEnd = Math.min(period.endAt, now);
      if (latestPossibleEnd > capturedAt) {
        overlapEndAt = Math.max(overlapEndAt, latestPossibleEnd);
      }
    }

    const effectiveOverlapMilliseconds = Math.max(0, overlapEndAt - session.overlapStartAt);
    if (!effectiveOverlapMilliseconds) {
      return undefined;
    }

    return { ...session, overlapEndAt, effectiveOverlapMilliseconds };
  }

  private aggregateGames(sessions: readonly EffectiveSession[]): readonly PlayedGameInsight[] {
    const totals = new Map<string, PlayedGameInsight>();
    for (const session of sessions) {
      const previous = totals.get(session.appId);
      if (!previous) {
        totals.set(session.appId, {
          appId: session.appId,
          gameName: session.gameName,
          totalMilliseconds: session.effectiveOverlapMilliseconds,
          mostRecentSessionStartedAt: session.startedAt,
          mostRecentActivityAt: session.overlapEndAt,
        });
        continue;
      }

      const isMostRecentActivity =
        session.overlapEndAt > previous.mostRecentActivityAt ||
        (session.overlapEndAt === previous.mostRecentActivityAt &&
          session.startedAt >= previous.mostRecentSessionStartedAt);
      totals.set(session.appId, {
        appId: session.appId,
        gameName: isMostRecentActivity ? session.gameName : previous.gameName,
        totalMilliseconds: previous.totalMilliseconds + session.effectiveOverlapMilliseconds,
        mostRecentSessionStartedAt: Math.max(previous.mostRecentSessionStartedAt, session.startedAt),
        mostRecentActivityAt: Math.max(previous.mostRecentActivityAt, session.overlapEndAt),
      });
    }

    return [...totals.values()].sort(compareRecentlyPlayedGames);
  }

  private findMostPlayedGame(
    games: readonly PlayedGameInsight[],
  ): MostPlayedGameInsight | undefined {
    return [...games].sort(compareMostPlayedGames)[0];
  }

  private findLongestSession(
    sessions: readonly EffectiveSession[],
    period: ResolvedPeriod,
  ): LongestSessionInsight | undefined {
    const longest = [...sessions].sort(compareSessionsForLongest)[0];
    if (!longest) {
      return undefined;
    }

    return {
      appId: longest.appId,
      gameName: longest.gameName,
      durationMilliseconds: longest.effectiveOverlapMilliseconds,
      startedAt: longest.startedAt,
      startedBeforeSelectedPeriod: longest.startedAt < period.startAt,
      isRunning: longest.isRunning,
    };
  }

  private findPeakPlayTime(sessions: readonly EffectiveSession[]): PeakPlayTimeInsight {
    const counts = Array<number>(HOURS_PER_DAY).fill(0);
    const durationTotals = Array<number>(HOURS_PER_DAY).fill(0);

    for (const session of sessions) {
      const localHour = new Date(session.startedAt).getHours();
      if (!Number.isInteger(localHour) || localHour < 0 || localHour >= HOURS_PER_DAY) {
        continue;
      }
      counts[localHour] += 1;
      durationTotals[localHour] += session.effectiveOverlapMilliseconds;
    }

    const peakHour = [...counts.keys()]
      .filter((hour) => counts[hour] > 0)
      .sort((left, right) => {
        const countDifference = counts[right] - counts[left];
        if (countDifference) {
          return countDifference;
        }
        const durationDifference = durationTotals[right] - durationTotals[left];
        return durationDifference || left - right;
      })[0];

    return {
      buckets: counts,
      ...(peakHour === undefined ? {} : { peakHour }),
    };
  }
}

function compareMostPlayedGames(left: PlayedGameInsight, right: PlayedGameInsight): number {
  const durationDifference = right.totalMilliseconds - left.totalMilliseconds;
  if (durationDifference) {
    return durationDifference;
  }
  const recencyDifference = right.mostRecentSessionStartedAt - left.mostRecentSessionStartedAt;
  return recencyDifference || compareAppIds(left.appId, right.appId);
}

function compareRecentlyPlayedGames(left: PlayedGameInsight, right: PlayedGameInsight): number {
  const activityDifference = right.mostRecentActivityAt - left.mostRecentActivityAt;
  if (activityDifference) {
    return activityDifference;
  }
  const startDifference = right.mostRecentSessionStartedAt - left.mostRecentSessionStartedAt;
  return startDifference || compareAppIds(left.appId, right.appId);
}

function compareSessionsForLongest(left: EffectiveSession, right: EffectiveSession): number {
  const durationDifference = right.effectiveOverlapMilliseconds - left.effectiveOverlapMilliseconds;
  if (durationDifference) {
    return durationDifference;
  }
  const recencyDifference = right.startedAt - left.startedAt;
  return recencyDifference || compareAppIds(left.appId, right.appId) || left.id.localeCompare(right.id);
}

function compareAppIds(left: string, right: string): number {
  const leftNumeric = Number(left);
  const rightNumeric = Number(right);
  if (Number.isSafeInteger(leftNumeric) && Number.isSafeInteger(rightNumeric)) {
    return leftNumeric - rightNumeric;
  }
  return left.localeCompare(right, undefined, { numeric: true });
}
