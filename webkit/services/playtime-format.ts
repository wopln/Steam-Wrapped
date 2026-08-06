/** Formats a tracked duration without changing the stored value. */
export function formatDecimalHours(
  milliseconds: number,
  unitStyle: "short" | "long" = "short",
): string {
  const safeMilliseconds = Math.max(0, Number.isFinite(milliseconds) ? milliseconds : 0);
  if (safeMilliseconds < 3_600_000) {
    const minutes = Math.floor(safeMilliseconds / 60_000);
    return unitStyle === "long"
      ? `${minutes} ${minutes === 1 ? "Minute" : "Minutes"}`
      : `${minutes}m`;
  }
  const value = (safeMilliseconds / 3_600_000).toFixed(1);
  return unitStyle === "long"
    ? `${value} ${Number(value) === 1 ? "Hour" : "Hours"}`
    : `${value}h`;
}
