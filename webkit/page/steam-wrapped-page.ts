import { SteamWrappedDashboard } from "../application/steam-wrapped-dashboard";

const PAGE_ROOT_ID = "steam-wrapped-page-root";
const ACTIVE_BODY_CLASS = "steam-wrapped-page-active";

/** Owns the intentionally minimal, full-page Steam Wrapped route. */
export class SteamWrappedPage {
  private dashboard: SteamWrappedDashboard | undefined;

  public ensure(): void {
    if (document.getElementById(PAGE_ROOT_ID)) {
      return;
    }

    const page = document.createElement("main");
    page.id = PAGE_ROOT_ID;
    page.className = "steam-wrapped-page";
    document.body.append(page);
    document.body.classList.add(ACTIVE_BODY_CLASS);
    this.dashboard = new SteamWrappedDashboard();
    this.dashboard.mount(page);
  }

  public remove(): void {
    this.dashboard?.destroy();
    this.dashboard = undefined;
    document.body.classList.remove(ACTIVE_BODY_CLASS);
    document.getElementById(PAGE_ROOT_ID)?.remove();
  }
}
