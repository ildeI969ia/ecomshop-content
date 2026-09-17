import { z } from "zod";

export const EditorialControlsSchema = z.object({
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
  customInstructions: z.string().optional()
});

export type EditorialControls = z.infer<typeof EditorialControlsSchema>;
