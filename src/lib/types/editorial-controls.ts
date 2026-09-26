import { z } from "zod";

export const BusinessGoalSchema = z.string().default("ALL_OPPORTUNITIES");

export type BusinessGoal = z.infer<typeof BusinessGoalSchema>;

export const EditorialControlsSchema = z.object({
  businessGoal: z.string().optional().default("ALL_OPPORTUNITIES"),
  targetSector: z.string().optional().default("ENTERPRISE_OFFICE"),
  includePricing: z.boolean().optional().default(false),
  emphasizeUplinkSwitching: z.boolean().optional().default(true),
  technicalDeepDiveLevel: z.string().optional().default("HIGH_TECHNICAL"),
  editorialTone: z.string().optional().default("ENGINEERING_PREVENTA"),
  competitorFocus: z.string().optional().default("MERAKI"),
  strategicCta: z.string().optional().default("FREE_SURVEY"),
  customInstructions: z.string().optional().default("")
}).passthrough();

export type EditorialControls = z.infer<typeof EditorialControlsSchema>;
