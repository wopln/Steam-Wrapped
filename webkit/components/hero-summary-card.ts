export interface HeroSummaryCard {
  readonly element: HTMLElement;
  update(hours: string, gameCount: number, periodSuffix: string): void;
  showUnavailable(): void;
}

export function createHeroSummaryCard(): HeroSummaryCard {
  const element = document.createElement("section");
  element.className = "steam-wrapped-hero";

  const content = document.createElement("div");
  content.className = "steam-wrapped-hero__content";
  const label = document.createElement("p");
  label.className = "steam-wrapped-hero__eyebrow";
  label.textContent = "You played";
  const hours = document.createElement("p");
  hours.className = "steam-wrapped-hero__hours";
  const context = document.createElement("p");
  context.className = "steam-wrapped-hero__context";
  content.append(label, hours, context);
  element.append(content);

  return {
    element,
    update: (value, gameCount, periodSuffix) => {
      hours.textContent = value;
      context.textContent = `Across ${gameCount} ${gameCount === 1 ? "game" : "games"} ${periodSuffix}`;
    },
    showUnavailable: () => {
      hours.textContent = "—";
      context.textContent = "Playtime data is temporarily unavailable";
    },
  };
}
