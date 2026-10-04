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
  forbiddenOverlap: string[];
  ctaObjective: string;
  targetLength: number;
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
  forbiddenOverlap: z.array(z.string()),
  ctaObjective: z.string(),
  targetLength: z.number()
});

export type MultichannelStrategyMap = Record<Channel, ChannelStrategy>;
