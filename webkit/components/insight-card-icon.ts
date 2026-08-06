const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export type InsightCardIcon = "gamepad" | "stopwatch" | "moon";

/** Creates the small, self-contained title icons used by the insight cards. */
export function createInsightCardIcon(kind: InsightCardIcon): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("class", "steam-wrapped-insight-card__title-icon-svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.9");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("focusable", "false");

  switch (kind) {
    case "gamepad":
      appendPath(svg, "M6.6 8.2h10.8c1.4 0 2.6 1 2.9 2.4l1 4.4a2.2 2.2 0 0 1-4.1 1.5l-1.1-2H7.9l-1.1 2a2.2 2.2 0 0 1-4.1-1.5l1-4.4a3 3 0 0 1 2.9-2.4Z");
      appendPath(svg, "M7.4 11.2v3.2M5.8 12.8H9M16.8 11.9h.01M18.8 13.9h.01");
      break;
    case "stopwatch":
      appendPath(svg, "M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z");
      appendPath(svg, "M12 9v4l2.8 1.7M9.5 2.8h5M12 5V2.8M19 7l1.4-1.4");
      break;
    case "moon":
      appendPath(svg, "M20.6 15.3A8.6 8.6 0 0 1 8.7 3.4 8.6 8.6 0 1 0 20.6 15.3Z");
      break;
  }

  return svg;
}

function appendPath(svg: SVGSVGElement, pathData: string): void {
  const path = document.createElementNS(SVG_NAMESPACE, "path");
  path.setAttribute("d", pathData);
  svg.append(path);
}
