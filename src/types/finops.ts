export interface UserFinOpsUsage {
  email: string;
  displayName: string;
  costEur: number;
  operationsCount: number;
}

export interface ModelFinOpsUsage {
  costEur: number;
  calls: number;
}

export interface GlobalFinOpsSummary {
  month: string; // YYYY-MM
  totalCostEur: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalImageGenerations: number;
  byUser: Record<string, UserFinOpsUsage>;
  byModel: Record<string, ModelFinOpsUsage>;
  budgetLimitEur?: number;
  monthEndProjectionEur?: number;
  avgCostPerCampaignEur?: number;
  lastUpdated?: string;
}
