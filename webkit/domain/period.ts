export type PeriodKind =
  | "this-month"
  | "last-month"
  | "last-3-months"
  | "this-year"
  | "custom";

export interface PeriodSelection {
  readonly kind: PeriodKind;
  readonly startDate?: string;
  readonly endDate?: string;
}

export interface ResolvedPeriod {
  readonly startAt: number;
  readonly endAt: number;
  readonly headerLabel: string;
  readonly selectorLabel: string;
  readonly summarySuffix: string;
}

export interface ComparisonPeriod {
  readonly startAt: number;
  readonly endAt: number;
  readonly label: string;
}

const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});

const SHORT_MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  year: "numeric",
});

const CUSTOM_DAY_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

const CUSTOM_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export const DEFAULT_PERIOD: PeriodSelection = { kind: "this-month" };

export function getPeriodOptionLabel(kind: PeriodKind): string {
  switch (kind) {
    case "this-month":
      return "This Month";
    case "last-month":
      return "Last Month";
    case "last-3-months":
      return "Last 3 Months";
    case "this-year":
      return "This Year";
    case "custom":
      return "Custom Range";
  }
}

export function resolvePeriod(selection: PeriodSelection, now = new Date()): ResolvedPeriod {
  switch (selection.kind) {
    case "this-month": {
      const start = startOfMonth(now);
      return {
        startAt: start.getTime(),
        endAt: now.getTime(),
        headerLabel: `${MONTH_FORMATTER.format(now)} • This Month`,
        selectorLabel: "This Month",
        summarySuffix: "this month",
      };
    }
    case "last-month": {
      const end = startOfMonth(now);
      const start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
      return {
        startAt: start.getTime(),
        endAt: end.getTime(),
        headerLabel: MONTH_FORMATTER.format(start),
        selectorLabel: "Last Month",
        summarySuffix: "last month",
      };
    }
    case "last-3-months": {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return {
        startAt: start.getTime(),
        endAt: now.getTime(),
        headerLabel: formatMonthSpan(start, now),
        selectorLabel: "Last 3 Months",
        summarySuffix: "in the last 3 months",
      };
    }
    case "this-year": {
      const start = new Date(now.getFullYear(), 0, 1);
      return {
        startAt: start.getTime(),
        endAt: now.getTime(),
        headerLabel: `${now.getFullYear()} • This Year`,
        selectorLabel: "This Year",
        summarySuffix: "this year",
      };
    }
    case "custom":
      return resolveCustomPeriod(selection, now);
  }
}

/**
 * Uses the immediately preceding calendar month for month selections. Other
 * ranges compare against the directly preceding range of the same duration.
 */
export function resolveComparisonPeriod(
  selection: PeriodSelection,
  now = new Date(),
): ComparisonPeriod {
  const selected = resolvePeriod(selection, now);
  if (selection.kind === "this-month" || selection.kind === "last-month") {
    const end = new Date(selected.startAt);
    const start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
    return {
      startAt: start.getTime(),
      endAt: end.getTime(),
      label: "vs last month",
    };
  }

  const duration = Math.max(1, selected.endAt - selected.startAt);
  return {
    startAt: Math.max(0, selected.startAt - duration),
    endAt: selected.startAt,
    label: "vs previous period",
  };
}

/** Returns whether a period includes the present moment and can advance live. */
export function isPeriodLive(selection: PeriodSelection, now = new Date()): boolean {
  switch (selection.kind) {
    case "this-month":
    case "last-3-months":
    case "this-year":
      return true;
    case "last-month":
      return false;
    case "custom": {
      const end = parseDateInput(selection.endDate);
      if (!end) {
        return true;
      }
      return end.getTime() >= startOfDay(now).getTime();
    }
  }
}

export function formatDateInput(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveCustomPeriod(selection: PeriodSelection, now: Date): ResolvedPeriod {
  const fallbackStart = startOfMonth(now);
  const start = parseDateInput(selection.startDate) ?? fallbackStart;
  const selectedEnd = parseDateInput(selection.endDate) ?? now;
  const end = new Date(
    selectedEnd.getFullYear(),
    selectedEnd.getMonth(),
    selectedEnd.getDate(),
    23,
    59,
    59,
    999,
  );
  const cappedEnd = Math.min(end.getTime(), now.getTime());
  const safeEnd = Math.max(cappedEnd, start.getTime() + 1);

  return {
    startAt: start.getTime(),
    endAt: safeEnd,
    headerLabel: formatCustomRangeLabel(start, new Date(Math.max(start.getTime(), safeEnd - 1))),
    selectorLabel: "Custom Range",
    summarySuffix: "in this period",
  };
}

function parseDateInput(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : undefined;
}

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function formatMonthSpan(start: Date, end: Date): string {
  if (start.getFullYear() === end.getFullYear()) {
    const startMonth = new Intl.DateTimeFormat(undefined, { month: "long" }).format(start);
    const endMonth = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(end);
    return `${startMonth} – ${endMonth}`;
  }
  return `${SHORT_MONTH_FORMATTER.format(start)} – ${SHORT_MONTH_FORMATTER.format(end)}`;
}

function formatCustomRangeLabel(start: Date, end: Date): string {
  if (start.getFullYear() === end.getFullYear()) {
    return `${CUSTOM_DAY_FORMATTER.format(start)} – ${CUSTOM_DAY_FORMATTER.format(end)}, ${start.getFullYear()}`;
  }
  return `${CUSTOM_DATE_FORMATTER.format(start)} – ${CUSTOM_DATE_FORMATTER.format(end)}`;
}
