export type GameArtworkVariant = "wide" | "compact";

export interface GameArtworkData {
  /** A real Steam-supplied image URL. Omit it to intentionally show the fallback. */
  readonly imageUrl?: string;
  readonly gameName?: string;
  readonly fallbackLabel?: string;
}

export interface GameArtwork {
  readonly element: HTMLElement;
  update(data: GameArtworkData): void;
}

/**
 * Shared game-artwork renderer. It does not fetch metadata itself; callers
 * provide an already-cached Steam image URL and get a graceful fallback if it
 * is unavailable or fails to load.
 */
export function createGameArtwork(variant: GameArtworkVariant): GameArtwork {
  const element = document.createElement("div");
  element.className = `steam-wrapped-game-artwork steam-wrapped-game-artwork--${variant}`;
  element.dataset.imageState = "fallback";

  const image = document.createElement("img");
  image.className = "steam-wrapped-game-artwork__image";
  image.decoding = "async";
  image.loading = "lazy";
  image.draggable = false;
  image.hidden = true;

  const fallback = document.createElement("div");
  fallback.className = "steam-wrapped-game-artwork__fallback";
  const fallbackLabel = document.createElement("span");
  fallbackLabel.className = "steam-wrapped-game-artwork__fallback-label";
  fallback.append(fallbackLabel);

  element.append(image, fallback);

  let failedSource: string | undefined;

  const showFallback = (): void => {
    image.hidden = true;
    fallback.hidden = false;
    element.dataset.imageState = "fallback";
  };

  const update = (data: GameArtworkData): void => {
    const source = data.imageUrl?.trim() ?? "";
    fallbackLabel.textContent = data.fallbackLabel ?? "Game artwork unavailable";
    image.alt = data.gameName ? `${data.gameName} artwork` : "";

    if (!source) {
      failedSource = undefined;
      image.removeAttribute("src");
      image.removeAttribute("data-source");
      showFallback();
      return;
    }

    // Dashboard live ticks can call update repeatedly. Keep a failed URL in
    // its honest fallback state instead of briefly showing a broken image on
    // every tick.
    if (failedSource === source) {
      showFallback();
      return;
    }

    // The dashboard re-renders live session values every second. Do not reset
    // an image that has already loaded just because its App ID is still the
    // same; the visible artwork should remain in its available state.
    if (image.dataset.source === source) {
      image.hidden = false;
      fallback.hidden = true;
      element.dataset.imageState = image.complete && image.naturalWidth > 0 ? "available" : "loading";
      return;
    }

    image.onload = (): void => {
      if (image.dataset.source !== source) {
        return;
      }
      failedSource = undefined;
      image.hidden = false;
      fallback.hidden = true;
      element.dataset.imageState = "available";
    };
    image.onerror = (): void => {
      if (image.dataset.source === source) {
        failedSource = source;
        showFallback();
      }
    };

    image.hidden = false;
    fallback.hidden = true;
    element.dataset.imageState = "loading";
    image.dataset.source = source;
    image.src = source;
  };

  return { element, update };
}
