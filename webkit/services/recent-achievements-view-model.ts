/**
 * A source-neutral representation of one genuinely unlocked Steam
 * achievement. `achievementId` is the Steam API name and, together with
 * `appId`, is the stable identity used to de-duplicate records.
 */
export interface AchievementUnlockRecord {
  readonly appId: string;
  readonly achievementId: string;
  readonly achievementName: string;
  readonly gameName: string;
  /** A real Steam-supplied achievement icon URL, when the runtime exposes one. */
  readonly imageUrl?: string;
  /** Steam's actual achievement unlock timestamp, in epoch milliseconds. */
  readonly unlockedAt: number;
}

/** The currently selected dashboard period. */
export interface AchievementPeriod {
  readonly startAt: number;
  readonly endAt: number;
}

export interface RecentAchievementsViewModel {
  /** Every valid unlock in the selected period, newest first. */
  readonly all: readonly AchievementUnlockRecord[];
  /** The newest entries for the compact card. */
  readonly featured: readonly AchievementUnlockRecord[];
}

const DEFAULT_FEATURED_LIMIT = 4;

/**
 * Creates the single ordered source of truth for the compact list and its
 * in-plugin "View All" dialog. The bridge may provide a broader cached
 * history: this layer deliberately clips it to the active period again so a
 * stale or over-broad response cannot leak achievements from another month.
 */
export function createRecentAchievementsViewModel(
  records: readonly AchievementUnlockRecord[],
  period: AchievementPeriod,
  featuredLimit = DEFAULT_FEATURED_LIMIT,
): RecentAchievementsViewModel {
  if (!isValidPeriod(period)) {
    return { all: [], featured: [] };
  }

  const uniqueRecords = new Map<string, AchievementUnlockRecord>();
  for (const record of records) {
    if (!isValidRecord(record) || !isWithinPeriod(record.unlockedAt, period)) {
      continue;
    }

    const key = `${record.appId}:${record.achievementId}`;
    const previous = uniqueRecords.get(key);
    if (!previous || record.unlockedAt > previous.unlockedAt) {
      uniqueRecords.set(key, record);
    }
  }

  const all = [...uniqueRecords.values()].sort(compareAchievements);
  const safeLimit = Number.isFinite(featuredLimit)
    ? Math.max(0, Math.floor(featuredLimit))
    : DEFAULT_FEATURED_LIMIT;
  return { all, featured: all.slice(0, safeLimit) };
}

function isValidPeriod(period: AchievementPeriod): boolean {
  return (
    Number.isFinite(period.startAt) &&
    Number.isFinite(period.endAt) &&
    period.endAt > period.startAt
  );
}

function isWithinPeriod(timestamp: number, period: AchievementPeriod): boolean {
  return timestamp >= period.startAt && timestamp < period.endAt;
}

function isValidRecord(record: AchievementUnlockRecord): boolean {
  return (
    typeof record.appId === "string" &&
    record.appId.trim().length > 0 &&
    typeof record.achievementId === "string" &&
    record.achievementId.trim().length > 0 &&
    typeof record.achievementName === "string" &&
    record.achievementName.trim().length > 0 &&
    typeof record.gameName === "string" &&
    record.gameName.trim().length > 0 &&
    Number.isFinite(record.unlockedAt) &&
    record.unlockedAt > 0
  );
}

function compareAchievements(
  left: AchievementUnlockRecord,
  right: AchievementUnlockRecord,
): number {
  if (right.unlockedAt !== left.unlockedAt) {
    return right.unlockedAt - left.unlockedAt;
  }
  if (left.appId !== right.appId) {
    return left.appId < right.appId ? -1 : 1;
  }
  if (left.achievementId !== right.achievementId) {
    return left.achievementId < right.achievementId ? -1 : 1;
  }
  return 0;
}
