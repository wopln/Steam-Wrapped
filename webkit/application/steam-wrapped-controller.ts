import { StoreNavigation } from "../navigation/store-navigation";
import { SteamWrappedPage } from "../page/steam-wrapped-page";
import { isSteamStorePage, isSteamWrappedRoute } from "../routing/steam-wrapped-route";
import { installSteamWrappedStyles } from "../styles/steam-wrapped-styles";

/** Keeps the Store button and custom page in sync with Steam's dynamic DOM. */
export class SteamWrappedController {
  private readonly navigation = new StoreNavigation();
  private readonly page = new SteamWrappedPage();
  private observer: MutationObserver | undefined;
  private restoreNavigationListeners: (() => void) | undefined;
  private injectionQueued = false;
  private removeStyles: (() => void) | undefined;

  public start(): void {
    this.removeStyles = installSteamWrappedStyles();
    this.observeStoreChanges();
    this.scheduleReconcile();
  }

  public stop(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    this.restoreNavigationListeners?.();
    this.restoreNavigationListeners = undefined;
    this.navigation.remove();
    this.page.remove();
    this.removeStyles?.();
    this.removeStyles = undefined;
  }

  private observeStoreChanges(): void {
    const schedule = (): void => this.scheduleReconcile();
    window.addEventListener("popstate", schedule);
    window.addEventListener("hashchange", schedule);
    this.restoreNavigationListeners = this.patchHistory(schedule, () => {
      window.removeEventListener("popstate", schedule);
      window.removeEventListener("hashchange", schedule);
    });

    this.observer = new MutationObserver(schedule);
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  private patchHistory(schedule: () => void, restoreListeners: () => void): () => void {
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function pushState(
      ...args: Parameters<History["pushState"]>
    ): void {
      originalPushState.apply(this, args);
      schedule();
    };
    window.history.replaceState = function replaceState(
      ...args: Parameters<History["replaceState"]>
    ): void {
      originalReplaceState.apply(this, args);
      schedule();
    };

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      restoreListeners();
    };
  }

  private scheduleReconcile(): void {
    if (this.injectionQueued) {
      return;
    }

    this.injectionQueued = true;
    window.requestAnimationFrame(() => {
      this.injectionQueued = false;
      this.reconcile();
    });
  }

  private reconcile(): void {
    if (!isSteamStorePage(window.location)) {
      this.navigation.remove();
      this.page.remove();
      return;
    }

    this.navigation.ensure(() => this.openSteamWrappedPage());

    if (isSteamWrappedRoute(window.location)) {
      this.page.ensure();
    } else {
      this.page.remove();
    }
  }

  private openSteamWrappedPage(): void {
    if (!isSteamWrappedRoute(window.location)) {
      window.history.pushState({ steamWrapped: true }, "", "/steamwrapped/");
    }
    this.scheduleReconcile();
  }
}
