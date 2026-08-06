import { definePlugin, Millennium, Navigation, Router } from "@steambrew/client";

const TRACKER_KEY = "__steamWrappedPlaytimeTracker__";
const ACHIEVEMENT_PROVIDER_KEY = "__steamWrappedAchievementProvider__";
const GAME_METADATA_PROVIDER_KEY = "__steamWrappedGameMetadataProvider__";
const STORAGE_KEY = "play-session-history";
const ACHIEVEMENT_STORAGE_KEY = "steam-wrapped-achievement-history";
const GAME_METADATA_STORAGE_KEY = "steam-wrapped-game-metadata";
const STEAM_RUNNING_STATUS = 4;
const RECONCILE_INTERVAL_MS = 5_000;
const LIVE_ACHIEVEMENT_REFRESH_MS = 30_000;
const GAME_METADATA_CACHE_MS = 7 * 24 * 60 * 60 * 1_000;
const FAILED_METADATA_RETRY_MS = 5 * 60 * 1_000;

function parseRange(payload) {
  const value = JSON.parse(payload);
  const startAt = value?.startAt;
  const endAt = value?.endAt;
  if (
    !Number.isFinite(startAt) ||
    !Number.isFinite(endAt) ||
    typeof startAt !== "number" ||
    typeof endAt !== "number" ||
    endAt <= startAt
  ) {
    throw new Error("Invalid Steam Wrapped period.");
  }
  return { startAt, endAt };
}

function parseAchievementRequest(payload) {
  const range = parseRange(payload);
  const value = JSON.parse(payload);
  const appIds = Array.isArray(value?.appIds)
    ? [...new Set(value.appIds.map(normalizeAppId).filter(Boolean))]
    : [];
  return { ...range, appIds };
}

function parseAppIds(payload) {
  const value = JSON.parse(payload);
  if (!Array.isArray(value?.appIds)) {
    throw new Error("Invalid Steam Wrapped app list.");
  }
  return [...new Set(value.appIds.map(normalizeAppId).filter(Boolean))];
}

function normalizeAppId(value) {
  const appId = String(value ?? "").trim();
  return /^\d+$/.test(appId) && appId !== "0" ? appId : undefined;
}

function getFocusedSteamWindow() {
  try {
    const focused = globalThis.SteamUIStore?.GetFocusedWindowInstance?.();
    if (focused) {
      return focused;
    }
  } catch {
    // Router's window store remains the compatibility fallback.
  }

  return (
    Router.WindowStore?.SteamUIWindows?.find(
      (window) => window?.BrowserWindow?.name === "SP Desktop_uid0",
    ) ?? Router.WindowStore?.GamepadUIMainWindowInstance
  );
}

function openNativeAchievements(appId) {
  const steamWindow = getFocusedSteamWindow();
  const navigator = steamWindow?.Navigator;
  if (typeof navigator?.MyAchievements !== "function") {
    return false;
  }

  try {
    navigator.MyAchievements(Number(appId));
    return true;
  } catch {
    return false;
  }
}

function getSteamClient() {
  return globalThis.SteamClient;
}

/** Stores only sessions observed by Steam Wrapped on this device. */
class SessionStore {
  sessions = [];
  initialized;
  writes = Promise.resolve();

  async initialize() {
    if (!this.initialized) {
      this.initialized = this.load();
    }
    await this.initialized;
  }

  getSessions() {
    return this.sessions;
  }

  getActiveSessions() {
    return this.sessions.filter((session) => session.endedAt === undefined);
  }

  async startSession(appId, gameName, startedAt) {
    await this.update((sessions) => {
      if (sessions.some((session) => session.appId === appId && session.endedAt === undefined)) {
        return;
      }
      sessions.push({
        id: `${appId}:${startedAt}:${Math.random().toString(36).slice(2, 8)}`,
        appId,
        gameName,
        startedAt,
      });
    });
  }

  async endSession(appId, endedAt) {
    await this.update((sessions) => {
      const activeIndex = sessions.findIndex(
        (session) => session.appId === appId && session.endedAt === undefined,
      );
      if (activeIndex < 0) {
        return;
      }
      const session = sessions[activeIndex];
      sessions[activeIndex] = { ...session, endedAt: Math.max(session.startedAt, endedAt) };
    });
  }

  async endActiveSessions(endedAt) {
    await this.update((sessions) => {
      sessions.forEach((session, index) => {
        if (session.endedAt === undefined) {
          sessions[index] = { ...session, endedAt: Math.max(session.startedAt, endedAt) };
        }
      });
    });
  }

  async load() {
    try {
      const payload = window.localStorage.getItem(STORAGE_KEY);
      const raw = payload ? JSON.parse(payload) : undefined;
      if (!raw || typeof raw !== "object" || !Array.isArray(raw.sessions)) {
        return;
      }
      this.sessions = raw.sessions.flatMap((session) => {
        if (
          !session ||
          typeof session !== "object" ||
          typeof session.id !== "string" ||
          typeof session.appId !== "string" ||
          typeof session.gameName !== "string" ||
          !Number.isFinite(session.startedAt) ||
          (session.endedAt !== undefined && !Number.isFinite(session.endedAt))
        ) {
          return [];
        }
        return [
          {
            id: session.id,
            appId: session.appId,
            gameName: session.gameName,
            startedAt: session.startedAt,
            ...(typeof session.endedAt === "number" ? { endedAt: session.endedAt } : {}),
          },
        ];
      });
    } catch {
      this.sessions = [];
    }
  }

  async update(mutator) {
    await this.initialize();
    const write = this.writes.then(async () => {
      mutator(this.sessions);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, sessions: this.sessions }));
    });
    this.writes = write.catch(() => undefined);
    await write;
  }
}

/** Detects Steam game launch/close transitions and calculates stored-session totals. */
class PlaytimeTracker {
  store = new SessionStore();
  started;
  reconciliation;
  intervalId;
  lifetimeSubscription;
  stopped = false;

  start() {
    if (!this.started) {
      this.started = this.startInternal();
    }
    return this.started;
  }

  async stop(closeActiveSessions) {
    this.stopped = true;
    if (this.intervalId !== undefined) {
      window.clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.lifetimeSubscription?.unregister?.();
    this.lifetimeSubscription = undefined;
    if (closeActiveSessions) {
      await this.store.initialize();
      await this.store.endActiveSessions(Date.now());
    }
  }

  async getSummary(range) {
    return (await this.getPeriodSnapshot(range)).summary;
  }

  async getPeriodSessionInsights(range) {
    const snapshot = await this.getPeriodSnapshot(range);
    return { ...snapshot.summary, sessions: snapshot.sessions };
  }

  async getPeriodSnapshot(range) {
    await this.start();
    await this.reconcile();
    const now = Date.now();
    const capturedAt = Math.min(now, range.endAt);
    const games = new Map();
    const sessions = [];
    let totalMilliseconds = 0;
    let runningSessionCount = 0;

    for (const session of this.store.getSessions()) {
      const sessionEnd = session.endedAt ?? now;
      const overlapStart = Math.max(range.startAt, session.startedAt);
      const overlapEnd = Math.min(range.endAt, sessionEnd);
      if (overlapEnd <= overlapStart) {
        continue;
      }
      const overlapMilliseconds = overlapEnd - overlapStart;
      const isRunning = session.endedAt === undefined;
      sessions.push({
        id: session.id,
        appId: session.appId,
        gameName: session.gameName,
        startedAt: session.startedAt,
        ...(typeof session.endedAt === "number" ? { endedAt: session.endedAt } : {}),
        overlapStartAt: overlapStart,
        overlapEndAt: overlapEnd,
        overlapMilliseconds,
        isRunning,
      });
      totalMilliseconds += overlapMilliseconds;
      const game = games.get(session.appId) ?? {
        appId: session.appId,
        gameName: session.gameName,
        totalMilliseconds: 0,
        runningSessionCount: 0,
      };
      game.totalMilliseconds += overlapMilliseconds;
      if (isRunning) {
        runningSessionCount += 1;
        game.runningSessionCount += 1;
      }
      games.set(session.appId, game);
    }

    return {
      summary: {
        totalMilliseconds,
        uniqueGameCount: games.size,
        runningSessionCount,
        capturedAt,
        games: [...games.values()].sort((left, right) => right.totalMilliseconds - left.totalMilliseconds),
      },
      sessions,
    };
  }

  async startInternal() {
    await this.store.initialize();
    this.subscribeToGameLifetimes();
    await this.reconcile();
    if (!this.stopped) {
      this.intervalId = window.setInterval(() => void this.reconcile(), RECONCILE_INTERVAL_MS);
    }
  }

  subscribeToGameLifetimes() {
    const gameSessions = getSteamClient()?.GameSessions;
    if (typeof gameSessions?.RegisterForAppLifetimeNotifications !== "function") {
      return;
    }

    try {
      this.lifetimeSubscription = gameSessions.RegisterForAppLifetimeNotifications((notification) => {
        void this.onAppLifetimeNotification(notification);
      });
    } catch {
      // Polling remains as the compatibility fallback for Steam builds without this notification.
    }
  }

  async onAppLifetimeNotification(notification) {
    const appId = normalizeAppId(notification?.unAppID);
    if (!appId) {
      return;
    }

    const now = Date.now();
    if (notification?.bRunning) {
      const game = this.findTrackableGame(appId);
      if (game) {
        await this.store.startSession(game.appId, game.gameName, now);
      }
      return;
    }

    // An end notification is valid even after Steam removes the overview from its map.
    await this.store.endSession(appId, now);
  }

  reconcile() {
    if (!this.reconciliation) {
      this.reconciliation = this.reconcileInternal().finally(() => {
        this.reconciliation = undefined;
      });
    }
    return this.reconciliation;
  }

  async reconcileInternal() {
    await this.store.initialize();
    const now = Date.now();
    const runningGames = new Map(this.readRunningGames().map((game) => [game.appId, game]));
    for (const session of this.store.getActiveSessions()) {
      if (!runningGames.has(session.appId)) {
        await this.store.endSession(session.appId, now);
      }
    }

    const activeIds = new Set(this.store.getActiveSessions().map((session) => session.appId));
    for (const game of runningGames.values()) {
      if (!activeIds.has(game.appId)) {
        await this.store.startSession(game.appId, game.gameName, now);
      }
    }
  }

  readRunningGames() {
    const appMap = window.appStore?.m_mapApps;
    if (!appMap) {
      return [];
    }

    try {
      return [...appMap.values()].flatMap((overview) => {
        const status =
          overview.display_status ??
          overview.local_per_client_data?.display_status ??
          overview.selected_per_client_data?.display_status;
        const game = this.toTrackableGame(overview);
        return status === STEAM_RUNNING_STATUS && game ? [game] : [];
      });
    } catch {
      return [];
    }
  }

  findTrackableGame(appId) {
    const appMap = window.appStore?.m_mapApps;
    if (!appMap) {
      return undefined;
    }

    try {
      return this.toTrackableGame(appMap.get?.(Number(appId)) ?? appMap.get?.(appId));
    } catch {
      return undefined;
    }
  }

  toTrackableGame(overview) {
    const appId = normalizeAppId(overview?.appid);
    if (!appId) {
      return undefined;
    }

    const appType = overview?.app_type;
    if (Number.isFinite(appType) && (appType & 1) !== 1) {
      return undefined;
    }

    return {
      appId,
      gameName: String(overview?.display_name || `Steam game ${appId}`),
    };
  }
}

/** Caches Steam achievement records without ever deriving unlock times locally. */
class AchievementDataProvider {
  records = new Map();
  requestCache = new Map();
  initialized;
  changeSubscription;
  stopped = false;

  async start() {
    if (!this.initialized) {
      this.initialized = this.load();
    }
    await this.initialized;
    this.subscribeToChanges();
  }

  stop() {
    this.stopped = true;
    this.changeSubscription?.unregister?.();
    this.changeSubscription = undefined;
  }

  async getSummary(request) {
    await this.start();
    const storedSummary = this.getStoredSummary(request);
    if (!this.canLoadAchievements()) {
      return storedSummary.status === "normal"
        ? storedSummary
        : { status: "unavailable", records: [], capturedAt: Date.now() };
    }
    if (!request.appIds.length) {
      return storedSummary;
    }

    const results = await Promise.all(
      request.appIds.map(async (appId) => {
        try {
          return { ok: true, records: await this.loadAppAchievements(appId, request) };
        } catch {
          return { ok: false, records: [] };
        }
      }),
    );
    if (results.some((result) => !result.ok)) {
      return { status: "unavailable", records: [], capturedAt: Date.now() };
    }

    // Preserve the full timestamped history while refreshing the requested
    // games. This keeps historical ranges available even when no game from a
    // prior period is currently being played.
    const uniqueRecords = new Map(
      [...this.records.values(), ...results.flatMap((result) => result.records)].map((record) => [
        record.key,
        record,
      ]),
    );
    await this.saveRecords([...uniqueRecords.values()]);
    const records = [...uniqueRecords.values()].filter(
      (record) => record.unlockedAt >= request.startAt && record.unlockedAt < request.endAt,
    );
    return {
      status: records.length ? "normal" : "empty",
      count: records.length,
      records,
      capturedAt: Date.now(),
    };
  }

  getStoredSummary(range) {
    const records = [...this.records.values()].filter(
      (record) => record.unlockedAt >= range.startAt && record.unlockedAt < range.endAt,
    );
    return {
      status: records.length ? "normal" : "empty",
      count: records.length,
      records,
      capturedAt: Date.now(),
    };
  }

  subscribeToChanges() {
    if (this.stopped || this.changeSubscription) {
      return;
    }

    const apps = getSteamClient()?.Apps;
    if (typeof apps?.RegisterForAchievementChanges !== "function") {
      return;
    }

    try {
      this.changeSubscription = apps.RegisterForAchievementChanges(() => {
        // Steam's notification only identifies an app. The next read rechecks real unlock timestamps.
        this.requestCache.clear();
      });
    } catch {
      // The summary will still refresh through direct Steam achievement reads.
    }
  }

  canLoadAchievements() {
    return typeof getSteamClient()?.Apps?.GetMyAchievementsForApp === "function";
  }

  async loadAppAchievements(appId, range) {
    const cacheKey = this.getCacheKey(appId, range);
    const cached = this.requestCache.get(cacheKey);
    if (cached && Date.now() - cached.loadedAt < LIVE_ACHIEVEMENT_REFRESH_MS) {
      return cached.records;
    }

    const response = await getSteamClient().Apps.GetMyAchievementsForApp(appId);
    const achievements = response?.data?.rgAchievements;
    if (!Array.isArray(achievements)) {
      throw new Error("Steam did not return achievement records.");
    }

    const records = achievements.flatMap((achievement) => {
      const record = toAchievementRecord(appId, achievement);
      return record && record.unlockedAt >= range.startAt && record.unlockedAt < range.endAt
        ? [record]
        : [];
    });
    this.requestCache.set(cacheKey, { loadedAt: Date.now(), records });
    return records;
  }

  getCacheKey(appId, range) {
    const isLiveRange = range.endAt >= Date.now() - RECONCILE_INTERVAL_MS;
    return isLiveRange
      ? `${appId}:${range.startAt}:live`
      : `${appId}:${range.startAt}:${range.endAt}`;
  }

  async load() {
    try {
      const payload = window.localStorage.getItem(ACHIEVEMENT_STORAGE_KEY);
      const raw = payload ? JSON.parse(payload) : undefined;
      if (!Array.isArray(raw?.records)) {
        return;
      }
      for (const item of raw.records) {
        const appId = normalizeAppId(item?.appId);
        const achievementId = typeof item?.achievementId === "string" ? item.achievementId.trim() : "";
        if (!appId || !achievementId || !Number.isFinite(item?.unlockedAt)) {
          continue;
        }
        const name = typeof item?.name === "string" && item.name.trim() ? item.name.trim() : undefined;
        const imageUrl = isSteamImageUrl(item?.imageUrl) ? item.imageUrl : undefined;
        const record = {
          key: `${appId}:${achievementId}`,
          appId,
          achievementId,
          unlockedAt: item.unlockedAt,
          ...(name ? { name } : {}),
          ...(imageUrl ? { imageUrl } : {}),
        };
        this.records.set(record.key, record);
      }
    } catch {
      this.records.clear();
    }
  }

  async saveRecords(records) {
    let changed = false;
    for (const record of records) {
      const previous = this.records.get(record.key);
      const next = {
        key: record.key,
        appId: record.appId,
        achievementId: record.achievementId,
        unlockedAt: record.unlockedAt,
        ...(record.name || previous?.name ? { name: record.name ?? previous?.name } : {}),
        ...(record.imageUrl || previous?.imageUrl
          ? { imageUrl: record.imageUrl ?? previous?.imageUrl }
          : {}),
      };
      if (
        !previous ||
        previous.unlockedAt !== next.unlockedAt ||
        previous.name !== next.name ||
        previous.imageUrl !== next.imageUrl
      ) {
        this.records.set(record.key, next);
        changed = true;
      }
    }
    if (!changed) {
      return;
    }

    try {
      window.localStorage.setItem(
        ACHIEVEMENT_STORAGE_KEY,
        JSON.stringify({
          version: 1,
          records: [...this.records.values()].map(
            ({ appId, achievementId, unlockedAt, name, imageUrl }) => ({
              appId,
              achievementId,
              unlockedAt,
              ...(name ? { name } : {}),
              ...(imageUrl ? { imageUrl } : {}),
            }),
          ),
        }),
      );
    } catch {
      // A storage failure must not prevent the live Steam response from reaching the dashboard.
    }
  }
}

/** Reads real Steam Store genre and artwork metadata with a bounded local cache. */
class GameMetadataProvider {
  cache = new Map();
  initialized;

  async getGenres(appIds) {
    await this.initialize();
    const entries = await Promise.all(
      appIds.map(async (appId) => {
        const metadata = await this.loadMetadata(appId);
        return metadata.genre
          ? { appId, status: "normal", genre: metadata.genre }
          : { appId, status: "unavailable" };
      }),
    );
    return { entries, capturedAt: Date.now() };
  }

  async getVisuals(appIds) {
    await this.initialize();
    const entries = await Promise.all(
      appIds.map(async (appId) => {
        // A legacy genre-only cache is useful for Step 3, but not sufficient
        // for Step 4's wide artwork. Ask the shared provider to fill that
        // missing field rather than treating a cached genre as an image.
        const metadata = await this.loadMetadata(appId, true);
        return metadata.wideImageUrl || metadata.iconUrl
          ? {
              appId,
              status: "normal",
              ...(metadata.wideImageUrl ? { wideImageUrl: metadata.wideImageUrl } : {}),
              ...(metadata.iconUrl ? { iconUrl: metadata.iconUrl } : {}),
            }
          : { appId, status: "unavailable" };
      }),
    );
    return { entries, capturedAt: Date.now() };
  }

  async initialize() {
    if (!this.initialized) {
      this.initialized = this.load();
    }
    await this.initialized;
  }

  async loadMetadata(appId, needsWideArtwork = false) {
    const cached = this.cache.get(appId);
    const now = Date.now();
    const runtimeArtwork = getRuntimeArtwork(appId);
    const current = { ...cached, ...runtimeArtwork };
    const hasRequestedMetadata = needsWideArtwork
      ? Boolean(current.wideImageUrl)
      : hasCachedMetadata(current);
    if (hasRequestedMetadata && now - current.fetchedAt < GAME_METADATA_CACHE_MS) {
      if (hasNewArtwork(cached, runtimeArtwork)) {
        await this.saveEntry(appId, runtimeArtwork);
      }
      return current;
    }
    if (current?.failedAt && now - current.failedAt < FAILED_METADATA_RETRY_MS) {
      if (hasNewArtwork(cached, runtimeArtwork)) {
        await this.saveEntry(appId, runtimeArtwork);
      }
      return current;
    }

    try {
      const response = await fetch(
        `https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(appId)}&l=english`,
        { credentials: "include" },
      );
      if (!response.ok) {
        throw new Error("Steam Store metadata request failed.");
      }
      const payload = await response.json();
      const data = payload?.[appId]?.success ? payload[appId].data : undefined;
      const genre = extractPrimaryGenre(data);
      const wideImageUrl = runtimeArtwork.wideImageUrl ?? extractWideGameImage(data);
      if (!genre && !wideImageUrl) {
        await this.saveEntry(appId, {
          ...(runtimeArtwork.iconUrl ? { iconUrl: runtimeArtwork.iconUrl } : {}),
          failedAt: now,
        });
        return this.cache.get(appId) ?? { failedAt: now };
      }

      await this.saveEntry(appId, {
        ...(genre ? { genre } : {}),
        ...(wideImageUrl ? { wideImageUrl } : {}),
        ...(runtimeArtwork.iconUrl ? { iconUrl: runtimeArtwork.iconUrl } : {}),
        fetchedAt: now,
        ...(wideImageUrl ? { failedAt: undefined } : { failedAt: now }),
      });
      return this.cache.get(appId);
    } catch {
      await this.saveEntry(appId, { ...runtimeArtwork, failedAt: now });
      return this.cache.get(appId) ?? { failedAt: now };
    }
  }

  async load() {
    try {
      const payload = window.localStorage.getItem(GAME_METADATA_STORAGE_KEY);
      const raw = payload ? JSON.parse(payload) : undefined;
      if (!raw || typeof raw !== "object" || !raw.entries || typeof raw.entries !== "object") {
        return;
      }
      for (const [rawAppId, entry] of Object.entries(raw.entries)) {
        const appId = normalizeAppId(rawAppId);
        if (!appId || !entry || typeof entry !== "object") {
          continue;
        }
        const genre = typeof entry.genre === "string" ? entry.genre.trim() : undefined;
        const wideImageUrl = isSteamImageUrl(entry.wideImageUrl) ? entry.wideImageUrl : undefined;
        const iconUrl = isSteamImageUrl(entry.iconUrl) ? entry.iconUrl : undefined;
        const fetchedAt = Number.isFinite(entry.fetchedAt) ? entry.fetchedAt : undefined;
        const failedAt = Number.isFinite(entry.failedAt) ? entry.failedAt : undefined;
        if (genre || wideImageUrl || iconUrl || failedAt) {
          this.cache.set(appId, {
            ...(genre ? { genre } : {}),
            ...(wideImageUrl ? { wideImageUrl } : {}),
            ...(iconUrl ? { iconUrl } : {}),
            ...(fetchedAt ? { fetchedAt } : {}),
            ...(failedAt ? { failedAt } : {}),
          });
        }
      }
    } catch {
      this.cache.clear();
    }
  }

  async saveEntry(appId, entry) {
    this.cache.set(appId, { ...this.cache.get(appId), ...entry });
    try {
      window.localStorage.setItem(
        GAME_METADATA_STORAGE_KEY,
        JSON.stringify({ version: 1, entries: Object.fromEntries(this.cache.entries()) }),
      );
    } catch {
      // Metadata may still be used for this render if storage is unavailable.
    }
  }
}

function toAchievementRecord(appId, achievement) {
  const achievementId = typeof achievement?.strID === "string" ? achievement.strID.trim() : "";
  const unlockedAt = toEpochMilliseconds(achievement?.rtUnlocked);
  if (!achievement?.bAchieved || !achievementId || !unlockedAt) {
    return undefined;
  }
  const name =
    typeof achievement?.strName === "string" && achievement.strName.trim()
      ? achievement.strName.trim()
      : undefined;
  const imageUrl = isSteamImageUrl(achievement?.strImage) ? achievement.strImage : undefined;
  return {
    key: `${appId}:${achievementId}`,
    appId,
    achievementId,
    unlockedAt,
    ...(name ? { name } : {}),
    ...(imageUrl ? { imageUrl } : {}),
  };
}

function toEpochMilliseconds(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return value < 100_000_000_000 ? value * 1_000 : value;
}

function extractPrimaryGenre(data) {
  const explicitPrimary = data?.primary_genre;
  if (typeof explicitPrimary?.description === "string" && explicitPrimary.description.trim()) {
    return explicitPrimary.description.trim();
  }
  if (typeof explicitPrimary === "string" && explicitPrimary.trim()) {
    return explicitPrimary.trim();
  }

  const genres = Array.isArray(data?.genres) ? data.genres : [];
  const markedPrimary = genres.find((genre) => genre?.primary && typeof genre.description === "string");
  if (markedPrimary?.description?.trim()) {
    return markedPrimary.description.trim();
  }

  // Steam's app-details response has no primary flag today; its first valid genre is the documented fallback.
  const firstGenre = genres.find((genre) => typeof genre?.description === "string" && genre.description.trim());
  return firstGenre?.description?.trim();
}

function extractWideGameImage(data) {
  const candidates = [
    data?.library_assets?.library_hero,
    data?.library_hero,
    data?.header_image,
    data?.capsule_image,
  ];
  return candidates.find(isSteamImageUrl);
}

function getRuntimeArtwork(appId) {
  const overview = getAppOverview(appId);
  const appDetailsStore = window.appDetailsStore;
  let wideImageUrl;
  let iconUrl;

  if (!overview) {
    return {};
  }

  try {
    const heroImages = overview ? appDetailsStore?.GetHeroImages?.(overview) : undefined;
    wideImageUrl = firstSteamImageUrl(heroImages?.rgHeroImages ?? heroImages);
  } catch {
    // Header images remain an independent runtime fallback.
  }
  if (!wideImageUrl) {
    try {
      wideImageUrl = firstSteamImageUrl(appDetailsStore?.GetHeaderImages?.(overview));
    } catch {
      // The Store app-details endpoint remains the portable fallback.
    }
  }
  try {
    iconUrl = firstSteamImageUrl(window.appStore?.GetIconURLForApp?.(overview));
  } catch {
    // A missing icon should not suppress a valid wide image.
  }

  return {
    ...(wideImageUrl ? { wideImageUrl } : {}),
    ...(iconUrl ? { iconUrl } : {}),
  };
}

function getAppOverview(appId) {
  const numericAppId = Number(appId);
  try {
    return (
      window.appStore?.GetAppOverviewByAppID?.(numericAppId) ??
      window.appStore?.m_mapApps?.get?.(numericAppId) ??
      window.appStore?.m_mapApps?.get?.(appId)
    );
  } catch {
    return undefined;
  }
}

function firstSteamImageUrl(value, visited = new Set()) {
  if (isSteamImageUrl(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    if (visited.has(value)) {
      return undefined;
    }
    visited.add(value);
    for (const item of value) {
      const imageUrl = firstSteamImageUrl(item, visited);
      if (imageUrl) {
        return imageUrl;
      }
    }
    return undefined;
  }
  if (!value || typeof value !== "object") {
    return undefined;
  }
  if (visited.has(value)) {
    return undefined;
  }
  visited.add(value);
  for (const candidate of [value.url, value.image_url, value.imageUrl, value.path]) {
    if (isSteamImageUrl(candidate)) {
      return candidate;
    }
  }
  for (const candidate of [
    value.rgHeroImages,
    value.rgHeaderImages,
    value.heroImages,
    value.headerImages,
    value.images,
  ]) {
    const imageUrl = firstSteamImageUrl(candidate, visited);
    if (imageUrl) {
      return imageUrl;
    }
  }
  return undefined;
}

function isSteamImageUrl(value) {
  return typeof value === "string" && /^https:\/\//i.test(value);
}

function hasCachedMetadata(entry) {
  return Boolean(entry?.genre || entry?.wideImageUrl);
}

function hasNewArtwork(previous, artwork) {
  return (
    (artwork.wideImageUrl && artwork.wideImageUrl !== previous?.wideImageUrl) ||
    (artwork.iconUrl && artwork.iconUrl !== previous?.iconUrl)
  );
}

const previousTracker = window[TRACKER_KEY];
void previousTracker?.stop(false);
const previousAchievementProvider = window[ACHIEVEMENT_PROVIDER_KEY];
previousAchievementProvider?.stop();

const tracker = new PlaytimeTracker();
const achievementProvider = new AchievementDataProvider();
const existingGameMetadataProvider = window[GAME_METADATA_PROVIDER_KEY];
const gameMetadataProvider =
  typeof existingGameMetadataProvider?.getVisuals === "function"
    ? existingGameMetadataProvider
    : new GameMetadataProvider();
window[TRACKER_KEY] = tracker;
window[ACHIEVEMENT_PROVIDER_KEY] = achievementProvider;
window[GAME_METADATA_PROVIDER_KEY] = gameMetadataProvider;

Millennium.exposeObj({
  steamWrapped: {
    openGameInLibrary(appId) {
      const normalizedAppId = normalizeAppId(appId);
      if (!normalizedAppId) {
        return false;
      }

      try {
        Navigation.Navigate(`/library/app/${normalizedAppId}`);
        return true;
      } catch {
        return false;
      }
    },
    openGameAchievementsInLibrary(appId) {
      const normalizedAppId = normalizeAppId(appId);
      if (!normalizedAppId) {
        return false;
      }

      if (openNativeAchievements(normalizedAppId)) {
        return true;
      }

      // The Library window can be between route transitions. Load its app
      // details first, then invoke the same native action once the window is
      // ready instead of opening an empty achievements dialog.
      try {
        Navigation.Navigate(`/library/app/${normalizedAppId}`);
        [250, 750, 1500, 2500].forEach((delay) => {
          window.setTimeout(() => {
            openNativeAchievements(normalizedAppId);
          }, delay);
        });
        return true;
      } catch {
        return false;
      }
    },
    async getPlaytimeSummary(rangePayload) {
      return JSON.stringify(await tracker.getSummary(parseRange(rangePayload)));
    },
    async getPeriodSessionInsights(rangePayload) {
      return JSON.stringify(await tracker.getPeriodSessionInsights(parseRange(rangePayload)));
    },
    async getAchievementSummary(requestPayload) {
      return JSON.stringify(await achievementProvider.getSummary(parseAchievementRequest(requestPayload)));
    },
    async getGameGenres(appIdsPayload) {
      return JSON.stringify(await gameMetadataProvider.getGenres(parseAppIds(appIdsPayload)));
    },
    async getGameVisuals(appIdsPayload) {
      return JSON.stringify(await gameMetadataProvider.getVisuals(parseAppIds(appIdsPayload)));
    },
  },
});

/** The frontend owns persistent tracking; WebKit owns the Store page UI. */
export default definePlugin(() => {
  void tracker.start();
  void achievementProvider.start();
  window.addEventListener("beforeunload", () => {
    void tracker.stop(true);
    achievementProvider.stop();
  });
  return {
    icon: null,
    onDismount: () => {
      void tracker.stop(true);
      achievementProvider.stop();
    },
  };
});
