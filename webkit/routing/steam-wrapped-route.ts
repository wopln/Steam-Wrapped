export const STEAM_WRAPPED_PATH = "/steamwrapped/";

/** Steam's Store pages all run in the same WebKit context. */
export function isSteamStorePage(location: Location): boolean {
  return location.hostname === "store.steampowered.com";
}

/** A local history route lets the plugin render a page without opening a browser. */
export function isSteamWrappedRoute(location: Location): boolean {
  return isSteamStorePage(location) && location.pathname.toLowerCase() === STEAM_WRAPPED_PATH;
}
