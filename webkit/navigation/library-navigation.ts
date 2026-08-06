import { callable } from "@steambrew/webkit";

interface SteamWindowRouter {
  Navigate?: (path: string) => void;
}

interface SteamUiStore {
  GetFocusedWindowInstance?: () => SteamWindowRouter | undefined;
  GetMainWindowInstance?: () => SteamWindowRouter | undefined;
}

interface SteamRouter {
  Navigate?: (path: string) => void;
}

interface SteamRuntimeWindow extends Window {
  SteamUIStore?: SteamUiStore;
  Router?: SteamRouter;
}

const openGameInLibraryBridge = callable<[string], boolean>(
  "frontend:steamWrapped.openGameInLibrary",
);
const openGameAchievementsBridge = callable<[string], boolean>(
  "frontend:steamWrapped.openGameAchievementsInLibrary",
);

/** Navigates to Steam's native Library app-details route without launching the game. */
export function openGameInLibrary(appId: string): boolean {
  return openLibraryPath(appId, "/library/app/{appId}", openGameInLibraryBridge);
}

/** Navigates to Steam's native Library achievements route without launching the game. */
export function openGameAchievementsInLibrary(appId: string): boolean {
  const normalizedAppId = String(appId ?? "").trim();
  if (!/^\d+$/.test(normalizedAppId) || normalizedAppId === "0") {
    console.error("[Steam Wrapped] Cannot open achievements: invalid AppID.");
    return false;
  }

  return openLibraryPath(
    normalizedAppId,
    "/library/app/{appId}/achievements",
    openGameAchievementsBridge,
    "/library/app/{appId}",
  );
}

function openLibraryPath(
  appId: string,
  pathTemplate: string,
  bridge: (appId: string) => Promise<boolean>,
  fallbackPathTemplate = pathTemplate,
): boolean {
  const normalizedAppId = String(appId ?? "").trim();
  if (!/^\d+$/.test(normalizedAppId) || normalizedAppId === "0") {
    return false;
  }

  // Store WebKit does not consistently expose SteamUIStore. Route through
  // the plugin frontend first, where Millennium's Navigation API is loaded.
  try {
    void bridge(normalizedAppId).then((opened) => {
      if (!opened) {
        navigateWithStoreRuntime(fallbackPathTemplate.replace("{appId}", normalizedAppId));
      }
    }).catch(() => {
      navigateWithStoreRuntime(fallbackPathTemplate.replace("{appId}", normalizedAppId));
    });
    return true;
  } catch {
    return navigateWithStoreRuntime(fallbackPathTemplate.replace("{appId}", normalizedAppId));
  }
}

function navigateWithStoreRuntime(path: string): boolean {
  const runtimeWindow = window as SteamRuntimeWindow;
  const routers: SteamWindowRouter[] = [];

  try {
    const focused = runtimeWindow.SteamUIStore?.GetFocusedWindowInstance?.();
    if (focused) {
      routers.push(focused);
    }
  } catch {
    // Fall through to the main-window and Router compatibility paths.
  }

  try {
    const main = runtimeWindow.SteamUIStore?.GetMainWindowInstance?.();
    if (main && !routers.includes(main)) {
      routers.push(main);
    }
  } catch {
    // Fall through to the Router compatibility path.
  }

  for (const router of routers) {
    if (typeof router.Navigate !== "function") {
      continue;
    }
    try {
      router.Navigate(path);
      return true;
    } catch {
      // Try the next available Steam window router.
    }
  }

  if (typeof runtimeWindow.Router?.Navigate === "function") {
    try {
      runtimeWindow.Router.Navigate(path);
      return true;
    } catch {
      // A missing Steam router should leave the dashboard usable.
    }
  }

  return false;
}
