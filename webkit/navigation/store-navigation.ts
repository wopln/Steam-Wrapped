import { createSteamWrappedNavButton } from "../components/steam-wrapped-nav-button";

const NAV_BUTTON_ID = "steam-wrapped-store-nav-button";
const BROWSE_TAB_SELECTORS = [
  "#store_nav_area .tab",
  ".store_nav .tab",
  "#store_nav_area a",
  ".store_nav a",
  "button",
];

/** Inserts one native-looking tab directly before Steam's Browse menu. */
export class StoreNavigation {
  public ensure(onActivate: () => void): void {
    const existingButton = document.getElementById(NAV_BUTTON_ID);
    if (existingButton) {
      existingButton.parentElement?.classList.add("steam-wrapped-nav-host");
      return;
    }

    const browseTab = this.findBrowseTab();
    if (!browseTab?.parentElement) {
      return;
    }

    const button = createSteamWrappedNavButton(NAV_BUTTON_ID, browseTab, onActivate);
    browseTab.before(button);
    button.parentElement?.classList.add("steam-wrapped-nav-host");
  }

  public remove(): void {
    const button = document.getElementById(NAV_BUTTON_ID);
    const host = button?.parentElement;
    button?.remove();
    host?.classList.remove("steam-wrapped-nav-host");
  }

  private findBrowseTab(): HTMLElement | undefined {
    for (const selector of BROWSE_TAB_SELECTORS) {
      const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector));
      const browseElement = candidates.find(
        (element) => element.textContent?.replace(/\s+/g, " ").trim() === "Browse",
      );
      if (!browseElement) {
        continue;
      }

      const button = browseElement.closest("button");
      if (button instanceof HTMLElement) {
        return button;
      }

      const tab = browseElement.closest(".tab");
      return tab instanceof HTMLElement ? tab : browseElement;
    }

    return undefined;
  }
}
