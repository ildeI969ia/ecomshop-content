import { z } from "zod";

export const AspectRatioSchema = z.enum(["16:9", "1:1", "4:3"]);

export const ImageQuestionOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  detail: z.string().min(1),
});

export const ImageInterviewQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  options: z.array(ImageQuestionOptionSchema).min(2).max(5),
});

export const ImageVisionAnalysisSchema = z.object({
  detectedSubject: z.string(),
  detectedProduct: z.string(),
  confidence: z.number().min(0).max(1),
  visibleAttributes: z.array(z.string()),
  scene: z.string(),
  installation: z.string(),
  peopleOrAction: z.string(),
  productFidelityConstraints: z.array(z.string()),
});

export const ImageCreativeRecommendationSchema = z.object({
  objective: z.string(),
  concept: z.string(),
  audience: z.string(),
  message: z.string(),
  scene: z.string(),
  action: z.string(),
  composition: z.string(),
  lighting: z.string(),
  camera: z.string(),
  aspectRatio: AspectRatioSchema,
  productTreatment: z.string(),
  negativeConstraints: z.array(z.string()),
  rationale: z.string(),
});

export const ImageQualificationSchema = z.object({
  readyForGeneration: z.boolean(),
  missingInformation: z.array(z.string()),
  questions: z.array(ImageInterviewQuestionSchema).max(3),
});

export const ImageIntentAnalysisSchema = z.object({
  intent: z.string(),
  objective: z.string(),
  detectedSubject: z.string(),
  detectedProduct: z.string(),
  confidence: z.number().min(0).max(1),
  context: z.string(),
  audience: z.string(),
  message: z.string(),
  vision: ImageVisionAnalysisSchema,
  qualification: ImageQualificationSchema,
  recommendation: ImageCreativeRecommendationSchema,
});

export const ImagePromptResultSchema = z.object({
  suggestedPrompt: z.string().min(1),
  recommendedAspectRatio: AspectRatioSchema,
  technicalNotes: z.string(),
});

export const ImageIntentInputSchema = z.object({
  userIdea: z.string().min(1).max(4000),
  baseImage: z.string().optional(),
  selectedSku: z.string().optional(),
  productContext: z.string().optional(),
  channel: z.string().optional(),
  audience: z.string().optional(),
  requestedAspectRatio: AspectRatioSchema.optional(),
});

export type ImageQuestionOption = z.infer<typeof ImageQuestionOptionSchema>;
export type ImageInterviewQuestion = z.infer<typeof ImageInterviewQuestionSchema>;
export type ImageVisionAnalysis = z.infer<typeof ImageVisionAnalysisSchema>;
export type ImageCreativeRecommendation = z.infer<typeof ImageCreativeRecommendationSchema>;
export type ImageQualification = z.infer<typeof ImageQualificationSchema>;
export type ImageIntentAnalysis = z.infer<typeof ImageIntentAnalysisSchema>;
export type ImagePromptResult = z.infer<typeof ImagePromptResultSchema>;
export type ImageIntentInput = z.infer<typeof ImageIntentInputSchema>;

export const ImageCriticResultSchema = z.object({
  productFidelity: z.enum(["pass", "warning", "fail"]),
  intentMatch: z.enum(["pass", "warning", "fail"]),
  realism: z.enum(["pass", "warning", "fail"]),
  composition: z.enum(["pass", "warning", "fail"]),
  detectedProblems: z.array(z.string()),
  optimizedPromptInstructions: z.string(),
  shouldRegenerate: z.boolean(),
});

export type ImageCriticResult = z.infer<typeof ImageCriticResultSchema>;
