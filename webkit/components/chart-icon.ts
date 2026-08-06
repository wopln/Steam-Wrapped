/** A small, Steam-compatible bar-chart glyph used across Steam Wrapped. */
export function createChartIcon(className: string): SVGSVGElement {
  const svgNamespace = "http://www.w3.org/2000/svg";
  const icon = document.createElementNS(svgNamespace, "svg");
  icon.setAttribute("class", className);
  icon.setAttribute("viewBox", "0 0 16 16");
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("focusable", "false");

  const bars = [
    [1, 9, 3, 6],
    [6.5, 5, 3, 10],
    [12, 2, 3, 13],
  ];
  for (const [x, y, width, height] of bars) {
    const bar = document.createElementNS(svgNamespace, "rect");
    bar.setAttribute("x", String(x));
    bar.setAttribute("y", String(y));
    bar.setAttribute("width", String(width));
    bar.setAttribute("height", String(height));
    bar.setAttribute("rx", "0.7");
    bar.setAttribute("fill", "currentColor");
    icon.append(bar);
  }
  return icon;
}
