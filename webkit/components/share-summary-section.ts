const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export type ShareSummaryStatusTone = "success" | "error";

export interface ShareSummarySectionState {
  /** True while the dashboard capture and PNG download are in progress. */
  readonly isExporting: boolean;
  /** Optional outcome shown beneath the permanent explanatory caption. */
  readonly statusMessage?: string;
  /** Visual meaning for a completed export outcome. */
  readonly statusTone?: ShareSummaryStatusTone;
}

export interface ShareSummarySectionOptions {
  /** Invoked by the centered Share Summary button. */
  readonly onShare: () => void;
}

export interface ShareSummarySection {
  readonly element: HTMLElement;
  update(state: ShareSummarySectionState): void;
  destroy(): void;
}

/**
 * Presentational footer for exporting the currently displayed dashboard.
 * Capture implementation, image readiness, and download behavior stay with
 * the dashboard controller; this component solely renders and gates the UI.
 */
export function createShareSummarySection(
  options: ShareSummarySectionOptions,
  initialState: ShareSummarySectionState = { isExporting: false },
): ShareSummarySection {
  const element = document.createElement("section");
  element.className = "steam-wrapped-share-summary";
  element.setAttribute("aria-label", "Share Steam Wrapped summary");
  element.setAttribute("data-html2canvas-ignore", "true");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "steam-wrapped-share-summary__button";

  const icon = document.createElement("span");
  icon.className = "steam-wrapped-share-summary__icon";
  icon.setAttribute("aria-hidden", "true");
  icon.append(createShareExportIcon());

  const label = document.createElement("span");
  label.className = "steam-wrapped-share-summary__label";
  button.append(icon, label);

  const caption = document.createElement("p");
  caption.className = "steam-wrapped-share-summary__caption";
  caption.textContent = "Save your wrapped summary as an image";

  const status = document.createElement("p");
  status.className = "steam-wrapped-share-summary__status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.hidden = true;

  const onClick = (): void => {
    if (!button.disabled) {
      options.onShare();
    }
  };
  button.addEventListener("click", onClick);
  element.append(button, caption, status);

  const update = (state: ShareSummarySectionState): void => {
    const isExporting = state.isExporting;
    element.dataset.exporting = String(isExporting);
    element.setAttribute("aria-busy", String(isExporting));
    button.disabled = isExporting;
    button.setAttribute("aria-busy", String(isExporting));
    label.textContent = isExporting ? "Exporting..." : "Share Summary";
    button.setAttribute(
      "aria-label",
      isExporting ? "Exporting Steam Wrapped summary" : "Share Steam Wrapped summary",
    );

    const message = state.statusMessage?.trim();
    status.textContent = message ?? "";
    status.hidden = !message;
    if (message && state.statusTone) {
      status.dataset.tone = state.statusTone;
    } else {
      delete status.dataset.tone;
    }
  };

  update(initialState);
  return {
    element,
    update,
    destroy: () => button.removeEventListener("click", onClick),
  };
}

/** A reusable CEF-safe inline share/export glyph for Steam Wrapped controls. */
export function createShareExportIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.classList.add("steam-wrapped-share-summary__icon-svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.8");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("aria-hidden", "true");

  appendPath(svg, "M12 15V3");
  appendPath(svg, "m7.5 7.5 4.5-4.5 4.5 4.5");
  appendPath(svg, "M5 13v5.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V13");
  return svg;
}

function appendPath(svg: SVGSVGElement, pathData: string): void {
  const path = document.createElementNS(SVG_NAMESPACE, "path");
  path.setAttribute("d", pathData);
  svg.append(path);
}
