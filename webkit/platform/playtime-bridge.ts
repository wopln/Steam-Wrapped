import { callable } from "@steambrew/webkit";

export interface PlaytimeSummary {
  readonly totalMilliseconds: number;
  readonly uniqueGameCount: number;
  readonly runningSessionCount: number;
  readonly capturedAt: number;
  readonly games: readonly TrackedGamePlaytime[];
}

export interface TrackedGamePlaytime {
  readonly appId: string;
  readonly gameName: string;
  readonly totalMilliseconds: number;
  readonly runningSessionCount: number;
}

export interface PeriodSessionInsight {
  readonly id: string;
  readonly appId: string;
  readonly gameName: string;
  /** The actual tracked game-launch timestamp, not a period-clipped value. */
  readonly startedAt: number;
  readonly endedAt?: number;
  readonly overlapStartAt: number;
  readonly overlapEndAt: number;
  readonly overlapMilliseconds: number;
  readonly isRunning: boolean;
}

export interface PeriodSessionInsights extends PlaytimeSummary {
  readonly sessions: readonly PeriodSessionInsight[];
}

export type DataAvailability = "normal" | "empty" | "unavailable";

/** One genuine unlock returned by Steam's achievement API. */
export interface AchievementUnlockRecord {
  readonly appId: string;
  readonly achievementId: string;
  readonly unlockedAt: number;
  /** Steam's localized achievement title, when the runtime supplies it. */
  readonly name?: string;
  /** Steam's own achievement icon URL, when the runtime supplies it. */
  readonly imageUrl?: string;
}

export interface AchievementSummary {
  readonly status: DataAvailability;
  readonly count?: number;
  /** Selected-period records returned alongside the existing count source. */
  readonly records: readonly AchievementUnlockRecord[];
  readonly capturedAt: number;
}

export interface GameGenreMetadata {
  readonly appId: string;
  readonly status: "normal" | "unavailable";
  readonly genre?: string;
}

export interface GameGenreSummary {
  readonly entries: readonly GameGenreMetadata[];
  readonly capturedAt: number;
}

export interface GameVisualMetadata {
  readonly appId: string;
  readonly status: "normal" | "unavailable";
  readonly wideImageUrl?: string;
  readonly iconUrl?: string;
}

export interface GameVisualMetadataSummary {
  readonly entries: readonly GameVisualMetadata[];
  readonly capturedAt: number;
}

const getPlaytimeSummary = callable<[string], string>("frontend:steamWrapped.getPlaytimeSummary");
const getPeriodSessionInsights = callable<[string], string>(
  "frontend:steamWrapped.getPeriodSessionInsights",
);
const getAchievementSummary = callable<[string], string>("frontend:steamWrapped.getAchievementSummary");
const getGameGenres = callable<[string], string>("frontend:steamWrapped.getGameGenres");
const getGameVisuals = callable<[string], string>("frontend:steamWrapped.getGameVisuals");

export async function loadPlaytimeSummary(
  startAt: number,
  endAt: number,
): Promise<PlaytimeSummary> {
  const rawPayload = await getPlaytimeSummary(JSON.stringify({ startAt, endAt }));
  const summary = parseBridgePayload(rawPayload);
  if (!isPlaytimeSummary(summary)) {
    throw new Error("Steam Wrapped received an invalid playtime summary.");
  }
  return summary;
}

export async function loadPeriodSessionInsights(
  startAt: number,
  endAt: number,
): Promise<PeriodSessionInsights> {
  const rawPayload = await getPeriodSessionInsights(JSON.stringify({ startAt, endAt }));
  const insights = parseBridgePayload(rawPayload);
  if (!isPeriodSessionInsights(insights)) {
    throw new Error("Steam Wrapped received invalid session insight data.");
  }
  return insights;
}

export async function loadAchievementSummary(
  appIds: readonly string[],
  startAt: number,
  endAt: number,
): Promise<AchievementSummary> {
  const rawPayload = await getAchievementSummary(JSON.stringify({ appIds, startAt, endAt }));
  const summary = parseBridgePayload(rawPayload);
  if (!isAchievementSummary(summary)) {
    throw new Error("Steam Wrapped received invalid achievement data.");
  }
  return summary;
}

export async function loadGameGenreMetadata(
  appIds: readonly string[],
): Promise<GameGenreSummary> {
  const rawPayload = await getGameGenres(JSON.stringify({ appIds }));
  const summary = parseBridgePayload(rawPayload);
  if (!isGameGenreSummary(summary)) {
    throw new Error("Steam Wrapped received invalid game metadata.");
  }
  return summary;
}

export async function loadGameVisualMetadata(
  appIds: readonly string[],
): Promise<GameVisualMetadataSummary> {
  const rawPayload = await getGameVisuals(JSON.stringify({ appIds }));
  const summary = parseBridgePayload(rawPayload);
  if (!isGameVisualMetadataSummary(summary)) {
    throw new Error("Steam Wrapped received invalid game visual metadata.");
  }
  return summary;
}

function parseBridgePayload(rawPayload: unknown): unknown {
  return JSON.parse(unwrapMillenniumString(rawPayload));
}

function unwrapMillenniumString(payload: unknown): string {
  if (typeof payload !== "string") {
    throw new Error("Steam Wrapped could not read playtime data.");
  }

  try {
    const envelope: unknown = JSON.parse(payload);
    if (
      envelope !== null &&
      typeof envelope === "object" &&
      "type" in envelope &&
      "value" in envelope &&
      envelope.type === "string" &&
      typeof envelope.value === "string"
    ) {
      return envelope.value;
    }
  } catch {
    // Older Millennium builds return the bridge value directly.
  }

  return payload;
}

function isPlaytimeSummary(value: unknown): value is PlaytimeSummary {
  return (
    isRecord(value) &&
    "totalMilliseconds" in value &&
    "uniqueGameCount" in value &&
    "runningSessionCount" in value &&
    "capturedAt" in value &&
    "games" in value &&
    Number.isFinite(value.totalMilliseconds) &&
    Number.isFinite(value.uniqueGameCount) &&
    Number.isFinite(value.runningSessionCount) &&
    Number.isFinite(value.capturedAt) &&
    Array.isArray(value.games) &&
    value.games.every(isTrackedGamePlaytime)
  );
}

function isTrackedGamePlaytime(value: unknown): value is TrackedGamePlaytime {
  return (
    isRecord(value) &&
    typeof value.appId === "string" &&
    typeof value.gameName === "string" &&
    Number.isFinite(value.totalMilliseconds) &&
    Number.isFinite(value.runningSessionCount)
  );
}

function isPeriodSessionInsights(value: unknown): value is PeriodSessionInsights {
  return isPlaytimeSummary(value) && "sessions" in value && Array.isArray(value.sessions) && value.sessions.every(isPeriodSessionInsight);
}

function isPeriodSessionInsight(value: unknown): value is PeriodSessionInsight {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.appId === "string" &&
    typeof value.gameName === "string" &&
    Number.isFinite(value.startedAt) &&
    (value.endedAt === undefined || Number.isFinite(value.endedAt)) &&
    Number.isFinite(value.overlapStartAt) &&
    Number.isFinite(value.overlapEndAt) &&
    typeof value.overlapMilliseconds === "number" &&
    Number.isFinite(value.overlapMilliseconds) &&
    value.overlapMilliseconds > 0 &&
    typeof value.isRunning === "boolean"
  );
}

function isAchievementSummary(value: unknown): value is AchievementSummary {
  if (!isRecord(value) || !isDataAvailability(value.status) || !Number.isFinite(value.capturedAt)) {
    return false;
  }
  return (
    Array.isArray(value.records) &&
    value.records.every(isAchievementUnlockRecord) &&
    (value.status === "unavailable" || Number.isFinite(value.count))
  );
}

function isAchievementUnlockRecord(value: unknown): value is AchievementUnlockRecord {
  return (
    isRecord(value) &&
    typeof value.appId === "string" &&
    typeof value.achievementId === "string" &&
    typeof value.unlockedAt === "number" &&
    Number.isFinite(value.unlockedAt) &&
    value.unlockedAt > 0 &&
    (value.name === undefined || typeof value.name === "string") &&
    (value.imageUrl === undefined || typeof value.imageUrl === "string")
  );
}

function isGameGenreSummary(value: unknown): value is GameGenreSummary {
  return (
    isRecord(value) &&
    Number.isFinite(value.capturedAt) &&
    Array.isArray(value.entries) &&
    value.entries.every(isGameGenreMetadata)
  );
}

function isGameGenreMetadata(value: unknown): value is GameGenreMetadata {
  return (
    isRecord(value) &&
    typeof value.appId === "string" &&
    (value.status === "normal" || value.status === "unavailable") &&
    (value.status !== "normal" || typeof value.genre === "string") &&
    (value.genre === undefined || typeof value.genre === "string")
  );
}

function isGameVisualMetadataSummary(value: unknown): value is GameVisualMetadataSummary {
  return (
    isRecord(value) &&
    Number.isFinite(value.capturedAt) &&
    Array.isArray(value.entries) &&
    value.entries.every(isGameVisualMetadata)
  );
}

function isGameVisualMetadata(value: unknown): value is GameVisualMetadata {
  return (
    isRecord(value) &&
    typeof value.appId === "string" &&
    (value.status === "normal" || value.status === "unavailable") &&
    (value.wideImageUrl === undefined || typeof value.wideImageUrl === "string") &&
    (value.iconUrl === undefined || typeof value.iconUrl === "string") &&
    (value.status !== "normal" || typeof value.wideImageUrl === "string" || typeof value.iconUrl === "string")
  );
}

function isDataAvailability(value: unknown): value is DataAvailability {
  return value === "normal" || value === "empty" || value === "unavailable";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}
