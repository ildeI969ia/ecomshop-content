import { z } from "zod";

export type Channel = "BLOG" | "LINKEDIN" | "WHATSAPP" | "MAILCHIMP" | "GEO";

export interface ChannelStrategy {
  channel: Channel;
  objective: string;
  audienceIntent: string;
  jobToBeDone: string;
  narrativeMode: string;
  primaryArgument: string;
  supportingArguments: string[];
  productEvidence: string[];
  forbiddenClaims?: string[];
  forbiddenOverlap: string[];
  desiredEmotion?: string;
  ctaObjective: string;
  targetLength: number;
  structure?: string[];
}

export const ChannelStrategySchema = z.object({
  channel: z.enum(["BLOG", "LINKEDIN", "WHATSAPP", "MAILCHIMP", "GEO"]),
  objective: z.string(),
  audienceIntent: z.string(),
  jobToBeDone: z.string(),
  narrativeMode: z.string(),
  primaryArgument: z.string(),
  supportingArguments: z.array(z.string()),
  productEvidence: z.array(z.string()),
  forbiddenClaims: z.array(z.string()).optional(),
  forbiddenOverlap: z.array(z.string()),
  desiredEmotion: z.string().optional(),
  ctaObjective: z.string(),
  targetLength: z.number(),
  structure: z.array(z.string()).optional()
});

export type MultichannelStrategyMap = Record<Channel, ChannelStrategy>;

export interface ChannelWriterInput {
  context: import("@/server/services/generation-context").GenerationContext;
  decision: import("@/lib/types/editorial-orchestrator").EditorialDecision;
  strategies: MultichannelStrategyMap;
}
