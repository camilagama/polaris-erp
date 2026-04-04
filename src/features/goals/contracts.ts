export const MAX_ACTIVE_GOALS = 3;

export type GoalMetric = "revenue" | "profit" | "sales_count";

export type GoalStatus = "active" | "completed" | "expired" | "archived";

export type GoalDisplayMode = "percentage" | "absolute";

export interface GoalPeriodRange {
  from: string;
  to: string;
}

export interface DashboardGoalCard {
  /** Current progress from live dashboard metrics (active goals only). */
  actualValue: number;
  /** Value used for the horizontal bar (0–100). */
  barPercent: number;
  displayMode: GoalDisplayMode;
  id: string;
  metric: GoalMetric;
  name: string;
  period: GoalPeriodRange;
  /** Uncapped percent: (actual / target) * 100 */
  progressPercent: number;
  status: GoalStatus;
  targetValue: number;
}

export interface DashboardGoalHistoryItem {
  id: string;
  metric: GoalMetric;
  name: string;
  period: GoalPeriodRange;
  resolvedAt: string | null;
  resolvedValue: number | null;
  status: Exclude<GoalStatus, "active">;
  targetValue: number;
}

export interface GoalsDashboardPayload {
  active: DashboardGoalCard[];
  history: DashboardGoalHistoryItem[];
}
