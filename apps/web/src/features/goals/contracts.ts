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
  createdAt: string;
  id: string;
  metric: GoalMetric;
  name: string;
  period: GoalPeriodRange;
  /** Human-readable elapsed time from period start to resolution (completed goals). */
  resolutionElapsedLabel: string | null;
  resolvedAt: string | null;
  resolvedValue: number | null;
  status: Exclude<GoalStatus, "active">;
  targetValue: number;
}

/** Active goals only — used on the dashboard beside the contribution graph. */
export interface GoalsDashboardPayload {
  active: DashboardGoalCard[];
}

export interface GoalsSettingsPayload {
  active: DashboardGoalCard[];
  history: DashboardGoalHistoryItem[];
  maxActiveGoals: number;
}
