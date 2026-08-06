/**
 * Shared display statuses for the Step 4 insight cards. The cards intentionally
 * receive already-calculated values so they can stay independent from session
 * storage, Steam APIs, and selected-period state.
 */
export type InsightCardStatus = "loading" | "normal" | "empty" | "unavailable" | "error";

export type NonNormalInsightCardStatus = Exclude<InsightCardStatus, "normal">;

export interface InsightCardMessageState {
  readonly status: NonNormalInsightCardStatus;
  readonly message?: string;
}

export function getInsightStatusMessage(
  state: InsightCardMessageState,
  fallbacks: Readonly<Record<NonNormalInsightCardStatus, string>>,
): string {
  return state.message?.trim() || fallbacks[state.status];
}
