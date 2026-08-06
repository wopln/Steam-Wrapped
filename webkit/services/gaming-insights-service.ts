import type { PeriodSelection, ResolvedPeriod } from "../domain/period";
import {
  loadGameVisualMetadata,
  type GameVisualMetadata,
  type PeriodSessionInsights,
} from "../platform/playtime-bridge";
import {
  PeriodSessionAggregator,
  type PeriodSessionAggregate,
} from "./period-session-aggregator";

export interface GamingInsightsSnapshot {
  readonly sessions: PeriodSessionInsights;
  /** A period's end can advance live; a changed start means the snapshot is incompatible. */
  readonly periodStartAt: number;
}

interface CachedVisual {
  readonly value: GameVisualMetadata;
  readonly checkedAt: number;
}

const VISUAL_METADATA_REFRESH_MS = 10 * 60 * 1_000;
const UNAVAILABLE_VISUAL_RETRY_MS = 60 * 1_000;
const VISUAL_METADATA_TIMEOUT_MS = 12_000;

/**
 * Hydrates the Steam artwork required by the game insight and recent-activity
 * cards while keeping session aggregation completely local and reusable.
 * Metadata failure intentionally leaves the insight data visible with the
 * components' Steam-style fallback.
 */
export class GamingInsightsService {
  private readonly aggregator = new PeriodSessionAggregator();
  private readonly visuals = new Map<string, CachedVisual>();
  private readonly visualRequests = new Map<string, Promise<void>>();

  public createSnapshot(
    period: ResolvedPeriod,
    sessions: PeriodSessionInsights,
  ): GamingInsightsSnapshot {
    return { sessions, periodStartAt: period.startAt };
  }

  /**
   * Artwork is intentionally hydrated after the source-backed metrics render.
   * A slow Store request can therefore never stall session totals or live bars.
   */
  public async hydrateArtwork(
    selection: PeriodSelection,
    period: ResolvedPeriod,
    snapshot: GamingInsightsSnapshot,
  ): Promise<void> {
    const aggregate = this.getAggregate(selection, period, snapshot);
    await this.ensureArtwork(this.getRelevantAppIds(aggregate));
  }

  public getAggregate(
    selection: PeriodSelection,
    period: ResolvedPeriod,
    snapshot: GamingInsightsSnapshot,
    now = Date.now(),
  ): PeriodSessionAggregate {
    return this.aggregator.aggregate(selection, period, snapshot.sessions, now);
  }

  public getWideArtwork(appId: string): string | undefined {
    return this.visuals.get(appId)?.value.wideImageUrl;
  }

  public getCompactArtwork(appId: string): string | undefined {
    const visual = this.visuals.get(appId)?.value;
    return visual?.iconUrl ?? visual?.wideImageUrl;
  }

  private async ensureArtwork(appIds: readonly string[]): Promise<void> {
    await Promise.all([...new Set(appIds)].map((appId) => this.ensureArtworkForApp(appId)));
  }

  private ensureArtworkForApp(appId: string): Promise<void> {
    const now = Date.now();
    if (!this.shouldRefreshVisual(appId, now)) {
      return Promise.resolve();
    }

    const inFlight = this.visualRequests.get(appId);
    if (inFlight) {
      return inFlight;
    }

    const request = this.fetchArtwork(appId, now).finally(() => {
      this.visualRequests.delete(appId);
    });
    this.visualRequests.set(appId, request);
    return request;
  }

  private async fetchArtwork(appId: string, checkedAt: number): Promise<void> {
    try {
      const response = await withTimeout(
        loadGameVisualMetadata([appId]),
        VISUAL_METADATA_TIMEOUT_MS,
      );
      const value = response.entries.find((entry) => entry.appId === appId) ?? {
        appId,
        status: "unavailable" as const,
      };
      this.visuals.set(appId, { value, checkedAt });
    } catch {
      this.visuals.set(appId, {
        value: { appId, status: "unavailable" },
        checkedAt,
      });
    }
  }

  private shouldRefreshVisual(appId: string, now: number): boolean {
    const cached = this.visuals.get(appId);
    if (!cached) {
      return true;
    }
    const refreshAfter =
      cached.value.status === "normal"
        ? VISUAL_METADATA_REFRESH_MS
        : UNAVAILABLE_VISUAL_RETRY_MS;
    return now - cached.checkedAt >= refreshAfter;
  }

  private getRelevantAppIds(aggregate: PeriodSessionAggregate): readonly string[] {
    return aggregate.games.map((game) => game.appId);
  }
}

function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("Steam artwork metadata timed out."));
    }, timeoutMs);

    void operation.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}
