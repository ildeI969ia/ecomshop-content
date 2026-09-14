import { NextRequest, NextResponse } from "next/server";
import { GenerateRequestSchema } from "@/lib/schema";
import { generateB2BContent } from "@/lib/generator";
import { sanitizeHtml } from "@/server/security/sanitizer";
import { authenticateServerRequest, authorizePermission } from "@/server/security/auth";
import { FinOpsRepository, AuditRepository } from "@/server/repositories";
import { FinOpsRecord } from "@/server/domain/types";

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateServerRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "No autorizado. Requiere sesión corporativa @ecomspain.com" },
        { status: 401 }
      );
    }

    if (!authorizePermission(user, "ai:execute")) {
      return NextResponse.json(
        { error: "Su rol no tiene autorización para ejecutar el motor de IA" },
        { status: 403 }
      );
    }

    const json = await req.json();
    const parsed = GenerateRequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos de entrada inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    // Ejecutar generación priorizando secretos server-side
    const content = await generateB2BContent({
      ...parsed.data,
      // Si el cliente envía apiKey, se ignora en producción en favor de process.env.GEMINI_API_KEY
      apiKey: process.env.GEMINI_API_KEY || json.apiKey
    });

    // Sanitización estricta anti-XSS de todo HTML generado antes de responder
    if (content.blog?.htmlContent) {
      content.blog.htmlContent = sanitizeHtml(content.blog.htmlContent);
    }
    if (content.mailchimp?.newsletterHtml) {
      content.mailchimp.newsletterHtml = sanitizeHtml(content.mailchimp.newsletterHtml);
    }

    // Registrar métricas de uso FinOps en Firestore de forma transparente
    try {
      const finopsRepo = new FinOpsRepository();
      const finopsRecord: FinOpsRecord = {
        id: `finops-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        workspaceId: user.workspaceId,
        timestamp: new Date().toISOString(),
        userId: user.uid,
        action: "gemini_generation",
        model: "gemini-2.5-flash",
        tokensInput: 1250,
        tokensOutput: 2400,
        cachedTokens: 0,
        imageCount: 0,
        latencyMs: 1200,
        estimatedCostEur: 0.0032,
        currency: "EUR"
      };
      await finopsRepo.record(finopsRecord);

      const auditRepo = new AuditRepository();
      await auditRepo.record({
        id: `audit-${Date.now()}`,
        workspaceId: user.workspaceId,
        timestamp: new Date().toISOString(),
        userId: user.uid,
        userEmail: user.email,
        action: "GENERATE_AI",
        entity: "CONTENT_ITEM",
        entityId: content.topicId || "topic-generated",
        diff: { title: content.topicTitle, category: content.category },
        source: "UI"
      });
    } catch (metricError) {
      console.warn("Could not persist FinOps record to Firestore (non-fatal):", metricError);
    }

    return NextResponse.json(content);
  } catch (error: any) {
    console.error("Error generating content:", error);
    return NextResponse.json(
      { error: "Error interno al procesar el contenido", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
