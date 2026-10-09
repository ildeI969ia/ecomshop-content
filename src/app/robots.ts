import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/blog", "/blog/*", "/llms.txt", "/llms-full.txt"],
        disallow: ["/admin", "/admin/*", "/api/*"]
      },
      // Reglas específicas para crawlers de IA (Google Gemini, OpenAI ChatGPT/Search, Anthropic Claude, Perplexity)
      {
        userAgent: [
          "Google-Extended",
          "Googlebot",
          "GPTBot",
          "ChatGPT-User",
          "ClaudeBot",
          "Claude-Web",
          "anthropic-ai",
          "PerplexityBot"
        ],
        allow: ["/", "/blog", "/blog/*", "/llms.txt", "/llms-full.txt"],
        disallow: ["/admin", "/admin/*", "/api/*"]
      }
    ],
    sitemap: "https://ecomshop.es/sitemap.xml"
  };
}
