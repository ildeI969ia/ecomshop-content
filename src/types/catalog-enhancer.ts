export interface ProductSheetDiffItem<T> {
  original: T;
  proposed: T;
  accepted: boolean;
}

export type EnhancerSection = "title" | "advantages" | "specs" | "faq" | "comparison";

export interface GroundedClaim {
  text: string;
  sourceId: string;
  verified?: boolean;
}

export interface GroundedClaimItem {
  text: string;
  sourceId: string;
  verified: boolean;
}

export interface GroundingValidationResult {
  isValid: boolean;
  claims: GroundedClaimItem[];
  ungroundedClaims: Array<{
    text: string;
    number: string;
    reason: string;
  }>;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ProductComparison {
  closestModel: string;
  diffText: string;
  comparisonTable?: Array<{
    feature: string;
    currentModel: string;
    closestModel: string;
  }>;
}

export interface EnhancedProductSheet {
  sku: string;
  brand: string;
  name: ProductSheetDiffItem<string>;
  metaTitle: ProductSheetDiffItem<string>;
  metaDescription: ProductSheetDiffItem<string>;
  advantages: ProductSheetDiffItem<string[]>; // 4-6 ventajas con fuente/claim validado
  specs: ProductSheetDiffItem<Record<string, string>>;
  faq: ProductSheetDiffItem<FaqItem[]>;
  faqJsonLd?: string; // FAQ en formato JSON-LD FAQPage
  comparison: ProductSheetDiffItem<ProductComparison>;
  claims: GroundedClaim[];
  groundingValidation?: GroundingValidationResult;
}

export interface EnhanceProductRequest {
  sku: string;
  apiKey?: string;
  customPrompt?: string;
}

export interface EnhanceProductResponse {
  success: boolean;
  enhanced?: EnhancedProductSheet;
  exportedHtml?: string;
  error?: string;
  details?: string;
}
