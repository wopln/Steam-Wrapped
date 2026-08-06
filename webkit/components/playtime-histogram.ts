import type { InsightCardMessageState } from "./insight-card-state";

export interface PlaytimeHistogramNormalState {
  readonly status: "normal";
  /** Session-start counts indexed from local hour 0 through 23. */
  readonly buckets: readonly number[];
  /** The service-selected peak hour, after its duration and deterministic tie-breakers. */
  readonly peakHour?: number;
}

export type PlaytimeHistogramState = PlaytimeHistogramNormalState | InsightCardMessageState;

export interface PlaytimeHistogram {
  readonly element: HTMLElement;
  update(state: PlaytimeHistogramState): void;
}

const HOURS_PER_DAY = 24;
const AXIS_HOURS = [0, 6, 12, 18, 24] as const;

/**
 * A dependency-free 24-hour histogram. Rendering consumes session-start
 * buckets only; bucketing and peak selection remain in the aggregation layer.
 */
export function createPlaytimeHistogram(
  initialState: PlaytimeHistogramState = { status: "loading" },
): PlaytimeHistogram {
  const element = document.createElement("div");
  element.className = "steam-wrapped-playtime-histogram";

  const bars = document.createElement("div");
  bars.className = "steam-wrapped-playtime-histogram__bars";
  bars.setAttribute("role", "img");

  const barElements: HTMLElement[] = [];
  for (let hour = 0; hour < HOURS_PER_DAY; hour += 1) {
    const bar = document.createElement("div");
    bar.className = "steam-wrapped-playtime-histogram__bar";
    bar.dataset.hour = String(hour);
    const fill = document.createElement("span");
    fill.className = "steam-wrapped-playtime-histogram__bar-fill";
    bar.append(fill);
    bars.append(bar);
    barElements.push(bar);
  }

  const axis = document.createElement("div");
  axis.className = "steam-wrapped-playtime-histogram__axis";
  for (const hour of AXIS_HOURS) {
    const label = document.createElement("span");
    label.className = "steam-wrapped-playtime-histogram__axis-label";
    label.textContent = formatLocalHour(hour % HOURS_PER_DAY);
    axis.append(label);
  }

  const message = document.createElement("p");
  message.className = "steam-wrapped-playtime-histogram__message";
  message.setAttribute("aria-live", "polite");

  element.append(bars, axis, message);

  const update = (state: PlaytimeHistogramState): void => {
    element.dataset.state = state.status;
    element.setAttribute("aria-busy", String(state.status === "loading"));

    const values = state.status === "normal" ? normaliseBuckets(state.buckets) : emptyBuckets();
    const highest = Math.max(0, ...values);
    const peakHour = state.status === "normal" ? resolvePeakHour(values, state.peakHour) : -1;

    bars.setAttribute("aria-label", describeHistogram(state, values, peakHour));
    for (let hour = 0; hour < HOURS_PER_DAY; hour += 1) {
      const value = values[hour];
      const bar = barElements[hour];
      bar.dataset.peak = String(hour === peakHour);
      bar.dataset.value = String(value);
      bar.style.setProperty(
        "--steam-wrapped-playtime-histogram-height",
        `${highest > 0 ? (value / highest) * 100 : 0}%`,
      );
      bar.setAttribute("aria-label", `${formatLocalHour(hour)}: ${formatSessionCount(value)}`);
    }

    if (state.status === "normal") {
      message.hidden = true;
      message.textContent = "";
    } else {
      message.hidden = false;
      message.textContent = getHistogramMessage(state);
    }
  };

  update(initialState);
  return { element, update };
}

function normaliseBuckets(input: readonly number[]): readonly number[] {
  return Array.from({ length: HOURS_PER_DAY }, (_, hour) => {
    const candidate = input[hour];
    return Number.isFinite(candidate) ? Math.max(0, candidate) : 0;
  });
}

function emptyBuckets(): readonly number[] {
  return Array(HOURS_PER_DAY).fill(0);
}

function resolvePeakHour(values: readonly number[], requestedPeakHour: number | undefined): number {
  if (Number.isInteger(requestedPeakHour) && requestedPeakHour !== undefined) {
    const hour = requestedPeakHour;
    if (hour >= 0 && hour < HOURS_PER_DAY && values[hour] > 0) {
      return hour;
    }
  }

  const highest = Math.max(0, ...values);
  return highest > 0 ? values.indexOf(highest) : -1;
}

function getHistogramMessage(state: InsightCardMessageState): string {
  switch (state.status) {
    case "loading":
      return state.message?.trim() || "Loading activity data";
    case "empty":
      return state.message?.trim() || "No activity data";
    case "unavailable":
      return state.message?.trim() || "Activity data unavailable";
    case "error":
      return state.message?.trim() || "Activity data could not be loaded";
  }
}

function describeHistogram(
  state: PlaytimeHistogramState,
  values: readonly number[],
  peakHour: number,
): string {
  if (state.status !== "normal") {
    return getHistogramMessage(state);
  }
  const totalStarts = values.reduce((total, value) => total + value, 0);
  if (!totalStarts || peakHour < 0) {
    return "No activity data";
  }
  return `${totalStarts} ${totalStarts === 1 ? "session start" : "session starts"}; peak at ${formatLocalHour(peakHour)}.`;
}

function formatSessionCount(value: number): string {
  return `${value.toLocaleString()} ${value === 1 ? "session start" : "session starts"}`;
}

function formatLocalHour(hour: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(
      new Date(2020, 0, 1, hour, 0, 0),
    );
  } catch {
    const normalized = hour % 24;
    const suffix = normalized < 12 ? "AM" : "PM";
    const twelveHour = normalized % 12 || 12;
    return `${twelveHour} ${suffix}`;
  }
}
