import { z } from "zod";

export const BusinessGoalSchema = z.enum([
  "ALL_OPPORTUNITIES",
  "WIFI7_MULTIGIG_EXPANSION",
  "HOSPITALITY_SOLUTIONS",
  "SWITCHING_POE_BACKBONE",
  "STOCK_CLEARANCE_PROMO"
]).default("ALL_OPPORTUNITIES");

export type BusinessGoal = z.infer<typeof BusinessGoalSchema>;

export const EditorialControlsSchema = z.object({
  businessGoal: BusinessGoalSchema.optional().default("ALL_OPPORTUNITIES"),
  targetSector: z.enum([
    "HOSPITALITY", 
    "ENTERPRISE_OFFICE", 
    "LOGISTICS_INDUSTRY", 
    "EDUCATION_CAMPUS"
  ]).default("ENTERPRISE_OFFICE"),
  includePricing: z.boolean().default(false),
  emphasizeUplinkSwitching: z.boolean().default(true),
  technicalDeepDiveLevel: z.enum([
    "HIGH_TECHNICAL", 
    "CONSULTATIVE_ROI"
  ]).default("HIGH_TECHNICAL"),
  editorialTone: z.enum([
    "ENGINEERING_PREVENTA",
    "C_LEVEL_TCO",
    "CHANNEL_INSTALLER",
    "CASE_STUDY"
  ]).default("ENGINEERING_PREVENTA"),
  competitorFocus: z.enum([
    "MERAKI",
    "UNIFI",
    "LEGACY_1G",
    "NONE"
  ]).default("MERAKI"),
  strategicCta: z.enum([
    "FREE_SURVEY",
    "WHOLESALE_PRICE",
    "DEMO_POC",
    "TCO_WHITEPAPER"
  ]).default("FREE_SURVEY"),
  customInstructions: z.string().optional()
});

export type EditorialControls = z.infer<typeof EditorialControlsSchema>;
