export interface GeoArticleRequest {
  sku: string;
  topicTitle?: string;
  targetAudience?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  customPrompt?: string;
}

export interface GeoArticleOutput {
  sku: string;
  title: string;
  slug: string;
  quickAnswer: string;
  comparativeTableMarkdown: string;
  networkArchitectureSection: string;
  bottleneckMitigation: string;
  fullMarkdownContent: string;
  metaTitle: string;
  metaDescription: string;
  estimatedReadTimeMinutes: number;
}

export interface SchemaJsonLdOutput {
  sku: string;
  jsonLdScriptTag: string;
  jsonLdObject: Record<string, any>;
  schemaTypesIncluded: Array<"TechArticle" | "Product" | "FAQPage">;
  faqCount: number;
}

export type ChannelType = "linkedin" | "whatsapp" | "product-sheet";

export interface ChannelContentRequest {
  sku: string;
  channel: ChannelType;
  topicTitle?: string;
  targetAudience?: string;
  customPrompt?: string;
}

export interface LinkedinContentOutput {
  channel: "linkedin";
  hook: string; // Primeros 210 caracteres
  licensingCostComparison: string;
  technicalSolution: string;
  callToAction: string;
  fullPostText: string;
  hashtags: string[];
}

export interface WhatsappContentOutput {
  channel: "whatsapp";
  condensedMessage: string;
  keySpecsBold: string[];
  utmLink: string;
}

export interface ProductSheetContentOutput {
  channel: "product-sheet";
  commercialBullets: string[];
  crossSellAccessories: Array<{
    sku: string;
    name: string;
    reason: string;
    url: string;
  }>;
  technicalSummaryHtml: string;
}

export type ChannelContentOutput =
  | LinkedinContentOutput
  | WhatsappContentOutput
  | ProductSheetContentOutput;
