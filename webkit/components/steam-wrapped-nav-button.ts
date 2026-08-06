import { createChartIcon } from "./chart-icon";

/**
 * Reuses Browse's host and link classes so Steam retains its spacing, colour,
 * typography, and hover treatment across client themes.
 */
export function createSteamWrappedNavButton(
  id: string,
  browseTab: HTMLElement,
  onActivate: () => void,
): HTMLElement {
  if (browseTab.tagName === "BUTTON") {
    return createModernSteamWrappedNavButton(id, browseTab, onActivate);
  }

  return createLegacySteamWrappedNavButton(id, browseTab, onActivate);
}

/** Steam's current Store navbar is React-rendered with native button elements. */
function createModernSteamWrappedNavButton(
  id: string,
  browseButton: HTMLElement,
  onActivate: () => void,
): HTMLElement {
  const button = browseButton.cloneNode(false) as HTMLButtonElement;
  button.id = id;
  button.type = "button";
  button.classList.add("steam-wrapped-store-nav-button");
  button.removeAttribute("aria-expanded");
  button.setAttribute("aria-label", "Open Steam Wrapped");
  button.setAttribute("title", "Steam Wrapped");

  // Keep Browse's host classes for native height/hover treatment, but use a
  // fresh label so Browse's internal layout rules cannot overlap our content.
  const content = document.createElement("span");
  content.classList.add("steam-wrapped-nav-label");
  content.append(createChartIcon("steam-wrapped-nav-icon"));
  button.append(content);

  button.addEventListener("click", (event) => {
    event.preventDefault();
    onActivate();
  });
  return button;
}

/** Keeps compatibility with Steam's older Store navigation markup. */
function createLegacySteamWrappedNavButton(
  id: string,
  browseTab: HTMLElement,
  onActivate: () => void,
): HTMLElement {
  const button = document.createElement(browseTab.tagName);
  button.id = id;
  button.className = `${browseTab.className} steam-wrapped-store-nav-button`;
  button.removeAttribute("href");

  const browseLink = browseTab.querySelector<HTMLElement>("a, button, [role='button']");
  const interactive = document.createElement(browseLink?.tagName ?? "a");
  interactive.className = browseLink?.className ?? "";
  interactive.removeAttribute("id");
  interactive.removeAttribute("href");
  interactive.removeAttribute("onclick");
  interactive.setAttribute("href", "/steamwrapped/");
  interactive.setAttribute("role", "link");
  interactive.setAttribute("aria-label", "Open Steam Wrapped");
  interactive.setAttribute("title", "Steam Wrapped");

  const label = document.createElement("span");
  label.className = "steam-wrapped-nav-label";
  label.append(createChartIcon("steam-wrapped-nav-icon"));
  interactive.append(label);

  const activate = (event: Event): void => {
    event.preventDefault();
    onActivate();
  };
  interactive.addEventListener("click", activate);
  interactive.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      activate(event);
    }
  });

  button.append(interactive);
  return button;
}
