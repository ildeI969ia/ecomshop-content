import { z } from "zod";
import { ProductType } from "@/lib/types/editorial-intelligence";

export const EditorialAudienceProfileSchema = z.object({
  id: z.string(),
  role: z.string(),
  label: z.string(),
  whyThisAudience: z.string(),
  painPoints: z.array(z.string()),
  buyingCriteria: z.array(z.string()),
  technicalQuestions: z.array(z.string()),
  objections: z.array(z.string())
});
export type EditorialAudienceProfile = z.infer<typeof EditorialAudienceProfileSchema>;

export const EditorialHypothesisSchema = z.object({
  id: z.string(),
  editorialQuestion: z.string(),
  problem: z.string(),
  tension: z.string(),
  readerPromise: z.string(),
  targetAudience: z.string(),
  buyerStage: z.string(),
  technicalDepth: z.string(),
  productRole: z.string(),
  noveltyReason: z.string()
});
export type EditorialHypothesis = z.infer<typeof EditorialHypothesisSchema>;

export const EditorialDecisionSchema = z.object({
  sku: z.string(),
  productType: z.string(),
  primaryAudience: z.string(),
  secondaryAudience: z.string(),
  recommendedAudiences: z.array(EditorialAudienceProfileSchema),
  editorialQuestions: z.array(z.string()),
  hypotheses: z.array(EditorialHypothesisSchema).min(1),
  angles: z.array(z.object({
    id: z.string(),
    title: z.string(),
    editorialQuestion: z.string(),
    tension: z.string(),
    readerPromise: z.string(),
    rationale: z.string(),
    relevanceScore: z.number(),
    targetAudience: z.string()
  })).min(1),
  selectedAngle: z.object({
    id: z.string(),
    title: z.string(),
    editorialQuestion: z.string(),
    tension: z.string(),
    readerPromise: z.string(),
    rationale: z.string(),
    relevanceScore: z.number(),
    targetAudience: z.string()
  }),
  thesis: z.object({
    problem: z.string(),
    targetProfessional: z.string(),
    businessContext: z.string(),
    technicalQuestion: z.string(),
    whyItMatters: z.string(),
    centralArgument: z.string(),
    solutionApproach: z.string(),
    productRole: z.string()
  }),
  readerLearnings: z.array(z.string()).min(3).max(7),
  outline: z.array(z.object({
    section: z.string(),
    purpose: z.string(),
    argument: z.string()
  })).min(4),
  diversityReport: z.object({
    comparedCount: z.number(),
    collisionDetected: z.boolean(),
    collisionReasons: z.array(z.string()),
    rejectedAngleIds: z.array(z.string())
  }),
  productTruthLock: z.object({
    sku: z.string(),
    model: z.string(),
    brand: z.string()
  })
});
export type EditorialDecision = z.infer<typeof EditorialDecisionSchema>;

export interface EditorialOrchestratorInput {
  sku: string;
  category: string;
  topicTitle?: string;
  userIntent?: string;
  requestedChannel?: string;
  preferredAudience?: string;
  requestedAngle?: { id?: string; title?: string; editorialQuestion?: string; tension?: string; readerPromise?: string; targetAudience?: string };
  workspaceId?: string;
  intel: import("@/lib/services/notebook-intelligence").StructuredProductIntelligence;
  evidenceMap: import("@/lib/types/editorial-intelligence").ProductEvidenceMap;
  productType: ProductType;
}
